"""
Prometheus metrics for monitoring data engine health.
"""

from prometheus_client import Counter, Histogram, Gauge, generate_latest
import time
import threading
from flask import Flask


class EngineMetrics:
    """Collect and expose metrics."""
    
    def __init__(self):
        # Counters
        self.ticks_received = Counter(
            'engine_ticks_received_total',
            'Total ticks received from WebSocket'
        )
        
        self.ticks_published = Counter(
            'engine_ticks_published_total',
            'Total ticks published to Redis',
            ['status']  # success, failed
        )
        
        self.reconnections = Counter(
            'engine_reconnections_total',
            'Total reconnection attempts',
            ['status']  # success, failed
        )
        
        # Histograms
        self.publish_latency = Histogram(
            'engine_publish_latency_ms',
            'Latency of publishing to Redis (ms)',
            buckets=(10, 50, 100, 250, 500, 1000)
        )
        
        self.parsing_latency = Histogram(
            'engine_parse_latency_ms',
            'Latency of parsing ticks (ms)',
            buckets=(1, 5, 10, 25, 50)
        )
        
        # Gauges
        self.queue_size = Gauge(
            'engine_queue_size',
            'Current size of tick queue'
        )
        
        self.active_subscriptions = Gauge(
            'engine_active_subscriptions',
            'Number of actively subscribed symbols'
        )
        
        self.connected = Gauge(
            'engine_connected',
            'Whether WebSocket is connected (1=yes, 0=no)'
        )
    
    def get_metrics_text(self) -> bytes:
        """Get metrics in Prometheus format."""
        return generate_latest()
    
    def record_tick_received(self):
        self.ticks_received.inc()
    
    def record_publish(self, status: str, latency_ms: float):
        self.ticks_published.labels(status=status).inc()
        if status == 'success':
            self.publish_latency.observe(latency_ms)
    
    def record_reconnection(self, status: str):
        self.reconnections.labels(status=status).inc()
    
    def update_queue_size(self, size: int):
        self.queue_size.set(size)
    
    def update_active_subscriptions(self, count: int):
        self.active_subscriptions.set(count)
    
    def set_connected(self, connected: bool):
        self.connected.set(1 if connected else 0)


# Global metrics instance for easy import
engine_metrics = EngineMetrics()


def start_metrics_server(port=8000):
    """Start Prometheus metrics endpoint in a background thread."""
    app = Flask(__name__)

    @app.route('/metrics')
    def metrics_endpoint():
        return engine_metrics.get_metrics_text(), 200, {'Content-Type': 'text/plain'}
    
    def run_server():
        print(f"📊 Starting metrics server on port {port}")
        app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)

    server_thread = threading.Thread(target=run_server, daemon=True, name="MetricsServer")
    server_thread.start()
    return server_thread
