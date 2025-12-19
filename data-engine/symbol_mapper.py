"""
Symbol mapper for Angel One SmartAPI.
Maps trading symbols to Angel One token IDs for WebSocket subscription.
"""

# Exchange Types
EXCHANGE_NSE = 1
EXCHANGE_NFO = 2
EXCHANGE_BSE = 3

# Symbol Token Mapping for NSE Equity
# Token IDs are obtained from Angel One's instrument master file
# These are the most commonly traded stocks on NSE
SYMBOL_TOKEN_MAP = {
    'RELIANCE': {
        'token': '2885',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'RELIANCE-EQ',
        'name': 'Reliance Industries Ltd'
    },
    'TCS': {
        'token': '11536',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'TCS-EQ',
        'name': 'Tata Consultancy Services Ltd'
    },
    'INFY': {
        'token': '1594',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'INFY-EQ',
        'name': 'Infosys Ltd'
    },
    'HDFCBANK': {
        'token': '1333',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'HDFCBANK-EQ',
        'name': 'HDFC Bank Ltd'
    },
    'ICICIBANK': {
        'token': '4963',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'ICICIBANK-EQ',
        'name': 'ICICI Bank Ltd'
    },
    'ITC': {
        'token': '1660',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'ITC-EQ',
        'name': 'ITC Ltd'
    },
    'SBIN': {
        'token': '3045',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'SBIN-EQ',
        'name': 'State Bank of India'
    },
    'BHARTIARTL': {
        'token': '10604',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'BHARTIARTL-EQ',
        'name': 'Bharti Airtel Ltd'
    },
    'HINDUNILVR': {
        'token': '1394',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'HINDUNILVR-EQ',
        'name': 'Hindustan Unilever Ltd'
    },
    'LT': {
        'token': '11483',
        'exchange': EXCHANGE_NSE,
        'trading_symbol': 'LT-EQ',
        'name': 'Larsen & Toubro Ltd'
    },
}

# Reverse mapping: Token ID -> Symbol
TOKEN_TO_SYMBOL = {info['token']: symbol for symbol, info in SYMBOL_TOKEN_MAP.items()}


def get_token_list_for_subscription() -> list[dict]:
    """
    Get token list formatted for WebSocket V2 subscription.
    Returns list of dicts with exchangeType and tokens.
    """
    # Group tokens by exchange
    exchange_tokens = {}
    for symbol, info in SYMBOL_TOKEN_MAP.items():
        exchange = info['exchange']
        if exchange not in exchange_tokens:
            exchange_tokens[exchange] = []
        exchange_tokens[exchange].append(info['token'])
    
    # Format for WebSocket subscription
    return [
        {'exchangeType': exchange, 'tokens': tokens}
        for exchange, tokens in exchange_tokens.items()
    ]


def get_symbol_from_token(token: str) -> str | None:
    """Get symbol name from token ID."""
    return TOKEN_TO_SYMBOL.get(token)


def get_token_info(symbol: str) -> dict | None:
    """Get full token info for a symbol."""
    return SYMBOL_TOKEN_MAP.get(symbol.upper())


def get_all_symbols() -> list[str]:
    """Get list of all tracked symbols."""
    return list(SYMBOL_TOKEN_MAP.keys())


def get_token_from_symbol(symbol: str) -> str | None:
    """Get token ID from symbol name."""
    info = SYMBOL_TOKEN_MAP.get(symbol.upper())
    return info['token'] if info else None

