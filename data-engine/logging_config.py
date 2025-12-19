"""
Structured logging with correlation IDs for tracing data flow.
"""

import logging
import json
import uuid
from contextvars import ContextVar
from datetime import datetime
from typing import Any

# Context variable for correlation ID
correlation_id_var: ContextVar[str] = ContextVar('correlation_id', default='')


class CorrelationIDFilter(logging.Filter):
    """Add correlation ID to all log records."""
    
    def filter(self, record: logging.LogRecord) -> bool:
        record.correlation_id = correlation_id_var.get() or str(uuid.uuid4())
        return True


class StructuredFormatter(logging.Formatter):
    """Format logs as structured JSON."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'correlation_id': getattr(record, 'correlation_id', ''),
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        
        # Add custom fields
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        return json.dumps(log_data)


def setup_logging(log_level: str = 'INFO'):
    """Configure structured logging."""
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level))
    
    # Console handler
    console_handler = logging.StreamHandler()
    console_handler.addFilter(CorrelationIDFilter())
    console_handler.setFormatter(StructuredFormatter())
    
    # Remove existing handlers to avoid duplicates
    for handler in root_logger.handlers:
        root_logger.removeHandler(handler)
        
    root_logger.addHandler(console_handler)
    
    return root_logger


def get_logger(name: str) -> logging.Logger:
    """Get logger with structured support."""
    return logging.getLogger(name)


def set_correlation_id(cid: str = None):
    """Set correlation ID for current context."""
    correlation_id_var.set(cid or str(uuid.uuid4()))


# Usage example:
if __name__ == '__main__':
    setup_logging('DEBUG')
    logger = get_logger(__name__)
    
    set_correlation_id('tick-2025-12-19-001')
    
    logger.info("Processing tick", extra={'extra_fields': {
        'symbol': 'INFY',
        'ltp': 2500.50,
    }})
