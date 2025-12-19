"""
Async Redis worker thread for non-blocking tick publishing.
Decouples WebSocket I/O from network I/O to Redis.
"""

import queue
import threading
import time
import json
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
import logging
from datetime import datetime

import redis
from redis.exceptions import ConnectionError, TimeoutError as RedisTimeoutError

logger = logging.getLogger(__name__)


@dataclass
class PublishMetrics:
    """Track publishing performance."""
    total_published: int = 0
    total_failed: int = 0
    avg_latency_ms: float = 0.0
    max_latency_ms: float = 0.0
    redis_errors: int = 0
    
    def add_success(self, latency_ms: float):
        """Record successful publish."""
        self.total_published += 1
        # Running average
        self.avg_latency_ms = (
            (self.avg_latency_ms * (self.total_published - 1) + latency_ms) 
            / self.total_published
        )
        self.max_latency_ms = max(self.max_latency_ms, latency_ms)
    
    def add_failure(self):
        """Record failed publish."""
        self.total_failed += 1
    
    def add_redis_error(self):
        """Record Redis connectivity error."""
        self.redis_errors += 1
    
    def get_report(self) -> Dict[str, Any]:
        """Get metrics report."""
        return {
            'total_published': self.total_published,
            'total_failed': self.total_failed,
            'avg_latency_ms': round(self.avg_latency_ms, 2),
            'max_latency_ms': round(self.max_latency_ms, 2),
            'redis_errors': self.redis_errors,
            'error_rate': round(
                (self.total_failed / max(self.total_published, 1)) * 100, 2
            ),
        }


class AsyncRedisPublisher:
    """
    Non-blocking Redis publisher with dedicated worker thread.
    """
    
    def __init__(
        self,
        redis_url: str = 'redis://localhost:6379',
        channel: str = 'market_ticks',
        queue_size: int = 10000,
        batch_size: int = 1,  # 1 = publish immediately, >1 = batch mode
        batch_timeout_ms: int = 50,  # Max wait before publishing batch
    ):
        self.redis_url = redis_url
        self.channel = channel
        self.queue_size = queue_size
        self.batch_size = batch_size
        self.batch_timeout_ms = batch_timeout_ms
        
        # Queue for tick data
        self.tick_queue: queue.Queue = queue.Queue(maxsize=queue_size)
        
        # Worker thread
        self.worker_thread: Optional[threading.Thread] = None
        self.running = False
        
        # Redis connection (lazy loaded)
        self.redis_client: Optional[redis.Redis] = None
        
        # Metrics
        self.metrics = PublishMetrics()
        
        # Batch buffer
        self.batch_buffer: List[Dict[str, Any]] = []
        self.last_batch_time = time.time()
    
    def connect(self) -> bool:
        """Establish Redis connection."""
        try:
            self.redis_client = redis.from_url(
                self.redis_url,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
                health_check_interval=10
            )
            # Test connection
            self.redis_client.ping()
            # logger.info(f"✅ Connected to Redis") # Avoid logging sensitive URL info if possible or handle it safely upstream
            return True
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            return False
    
    def start(self) -> bool:
        """Start the worker thread."""
        if not self.connect():
            return False
        
        self.running = True
        self.worker_thread = threading.Thread(
            target=self._worker_loop,
            daemon=False,
            name="RedisPublisherWorker"
        )
        self.worker_thread.start()
        logger.info("✅ Redis publisher worker started")
        return True
    
    def stop(self):
        """Gracefully stop the worker thread."""
        logger.info("🛑 Stopping Redis publisher...")
        self.running = False
        
        # Buffer flush managed in loop, but ensuring here too if needed
        # _flush_batch call here might race with worker loop, relying on worker loop to exit cleanly
        
        # Wait for worker to finish (max 5 seconds)
        if self.worker_thread:
            self.worker_thread.join(timeout=5)
        
        # Close connection
        if self.redis_client:
            self.redis_client.close()
        
        logger.info(f"✅ Redis publisher stopped. Metrics: {self.metrics.get_report()}")
    
    def queue_tick(self, tick_data: Dict[str, Any]) -> bool:
        """
        Queue a tick for publishing (non-blocking from WebSocket perspective).
        """
        try:
            # Add timestamp for latency tracking
            tick_data['_queued_at'] = time.time() * 1000  # milliseconds
            self.tick_queue.put_nowait(tick_data)
            return True
        except queue.Full:
            logger.warning("⚠️ Tick queue full - possible publishing lag")
            self.metrics.add_failure()
            return False
    
    def _worker_loop(self):
        """Main worker thread loop - continuously publishers ticks."""
        logger.info("🔄 Redis worker loop started")
        
        while self.running:
            try:
                # Get tick with timeout to allow graceful shutdown check
                try:
                    tick = self.tick_queue.get(timeout=0.1)
                except queue.Empty:
                    # No ticks available, flush if needed
                    if self._should_flush_batch():
                        self._flush_batch()
                    continue
                
                # Add to batch buffer
                self.batch_buffer.append(tick)
                
                # Check if should publish
                if (len(self.batch_buffer) >= self.batch_size or 
                    self._should_flush_batch()):
                    self._flush_batch()
                
            except Exception as e:
                logger.error(f"❌ Error in worker loop: {e}")
                self.metrics.add_redis_error()
                # Continue processing
                continue
            
        # One final flush
        self._flush_batch()
        logger.info("🔄 Redis worker loop ended")
    
    def _should_flush_batch(self) -> bool:
        """Check if batch should be flushed by time."""
        if not self.batch_buffer:
            return False
        elapsed_ms = (time.time() - self.last_batch_time) * 1000
        return elapsed_ms > self.batch_timeout_ms
    
    def _flush_batch(self):
        """Publish all buffered ticks."""
        if not self.batch_buffer:
            return
        
        try:
            start_time = time.time()
            
            # Prepare batch data
            if self.batch_size == 1:
                # Single publish
                for tick in self.batch_buffer:
                    self._publish_single(tick)
            else:
                # Batch publish using pipeline
                self._publish_batch(self.batch_buffer)
            
            # Record metrics
            latency_ms = (time.time() - start_time) * 1000
            for _ in self.batch_buffer:
                self.metrics.add_success(latency_ms / len(self.batch_buffer))
            
            self.batch_buffer = []
            self.last_batch_time = time.time()
            
        except Exception as e:
            logger.error(f"❌ Batch publish failed: {e}")
            self.metrics.redis_errors += len(self.batch_buffer)
            self.batch_buffer = []  # Clear on error to prevent infinite retry loops on bad data
            self.last_batch_time = time.time()
    
    def _publish_single(self, tick: Dict[str, Any]):
        """Publish single tick."""
        if not self.redis_client:
            return
        
        try:
            tick_json = json.dumps(tick)
            self.redis_client.publish(self.channel, tick_json)
        except (ConnectionError, RedisTimeoutError) as e:
            logger.error(f"❌ Redis publish error: {e}")
            self.metrics.add_redis_error()
    
    def _publish_batch(self, ticks: list):
        """Publish multiple ticks in batch using pipeline."""
        if not self.redis_client or not ticks:
            return
        
        try:
            pipe = self.redis_client.pipeline()
            for tick in ticks:
                tick_json = json.dumps(tick)
                pipe.publish(self.channel, tick_json)
            pipe.execute()
        except (ConnectionError, RedisTimeoutError) as e:
            logger.error(f"❌ Redis batch publish error: {e}")
            self.metrics.redis_errors += len(ticks)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics."""
        return {
            **self.metrics.get_report(),
            'queue_size': self.tick_queue.qsize(),
            'batch_buffer_size': len(self.batch_buffer),
        }
    
    def get_health(self) -> Dict[str, Any]:
        """Get health status."""
        queue_util = (self.tick_queue.qsize() / self.queue_size) * 100
        
        # Warn if queue utilization high
        health = "🟢 Good"
        if queue_util > 80:
            health = "🟡 Degraded (queue backing up)"
        elif queue_util > 95:
            health = "🔴 Critical (queue almost full)"
        
        return {
            'status': health,
            'queue_utilization': round(queue_util, 2),
            'metrics': self.get_metrics(),
        }
