"""
Indicator Calculation Service with Selective Calculation
Users explicitly choose which indicators to calculate - no auto-loading.
"""
import pandas as pd
import numpy as np
from logzero import logger


class IndicatorService:
    """
    Service to calculate professional technical indicators.
    Only calculates indicators that users explicitly request.
    """

    # Indicator Registry - defines available indicators and their metadata
    INDICATOR_REGISTRY = {
        # TREND INDICATORS (Overlay on main chart)
        'sma': {'name': 'Simple Moving Average', 'category': 'trend', 'displayMode': 'overlay', 'defaultParams': {'period': 20}},
        'ema': {'name': 'Exponential Moving Average', 'category': 'trend', 'displayMode': 'overlay', 'defaultParams': {'period': 9}},
        'wma': {'name': 'Weighted Moving Average', 'category': 'trend', 'displayMode': 'overlay', 'defaultParams': {'period': 20}},
        'bollinger': {'name': 'Bollinger Bands', 'category': 'volatility', 'displayMode': 'overlay', 'defaultParams': {'period': 20, 'std_dev': 2.0}},
        'keltner': {'name': 'Keltner Channels', 'category': 'volatility', 'displayMode': 'overlay', 'defaultParams': {'ema_period': 20, 'atr_period': 14, 'multiplier': 2.0}},
        'vwap': {'name': 'VWAP', 'category': 'volume', 'displayMode': 'overlay', 'defaultParams': {}},
        
        # MOMENTUM INDICATORS (Separate Pane)
        'rsi': {'name': 'Relative Strength Index', 'category': 'momentum', 'displayMode': 'pane', 'defaultParams': {'period': 14}},
        'macd': {'name': 'MACD', 'category': 'momentum', 'displayMode': 'pane', 'defaultParams': {'fast': 12, 'slow': 26, 'signal': 9}},
        'stochastic': {'name': 'Stochastic Oscillator', 'category': 'momentum', 'displayMode': 'pane', 'defaultParams': {'period': 14, 'k_smooth': 3, 'd_smooth': 3}},
        'adx': {'name': 'Average Directional Index', 'category': 'trend', 'displayMode': 'pane', 'defaultParams': {'period': 14}},
        
        # VOLUME INDICATORS (Separate Pane)
        'obv': {'name': 'On-Balance Volume', 'category': 'volume', 'displayMode': 'pane', 'defaultParams': {}},
        'mfi': {'name': 'Money Flow Index', 'category': 'volume', 'displayMode': 'pane', 'defaultParams': {'period': 14}},
        
        # VOLATILITY INDICATORS (Separate Pane)
        'atr': {'name': 'Average True Range', 'category': 'volatility', 'displayMode': 'pane', 'defaultParams': {'period': 14}},
    }

    @staticmethod
    def get_available_indicators():
        """Return the list of all available indicators with their metadata."""
        return IndicatorService.INDICATOR_REGISTRY

    @staticmethod
    def calculate_sma(prices: list, period: int = 20) -> list:
        """Simple Moving Average"""
        sma = []
        for i in range(len(prices)):
            if i < period - 1:
                sma.append(None)
            else:
                window = prices[i - period + 1:i + 1]
                sma.append(round(sum(window) / period, 4))
        return sma

    @staticmethod
    def calculate_ema(prices: list, period: int = 12) -> list:
        """Exponential Moving Average"""
        if len(prices) < period:
            return [None] * len(prices)
        sma = sum(prices[:period]) / period
        ema = [None] * (period - 1) + [sma]
        multiplier = 2 / (period + 1)
        for i in range(period, len(prices)):
            ema_value = (prices[i] * multiplier) + (ema[i-1] * (1 - multiplier))
            ema.append(round(ema_value, 4))
        return ema

    @staticmethod
    def calculate_wma(prices: list, period: int = 20) -> list:
        """Weighted Moving Average"""
        wma = []
        weights = list(range(1, period + 1))
        weight_sum = sum(weights)
        for i in range(len(prices)):
            if i < period - 1:
                wma.append(None)
            else:
                window = prices[i - period + 1:i + 1]
                weighted_sum = sum(p * w for p, w in zip(window, weights))
                wma.append(round(weighted_sum / weight_sum, 4))
        return wma

    @staticmethod
    def calculate_rsi(prices: list, period: int = 14) -> list:
        """Relative Strength Index"""
        if len(prices) < period + 1:
            return [None] * len(prices)
        deltas = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        gains = [d if d > 0 else 0 for d in deltas]
        losses = [abs(d) if d < 0 else 0 for d in deltas]
        avg_gain = sum(gains[:period]) / period
        avg_loss = sum(losses[:period]) / period
        rsi_values = [None] * period
        for i in range(period, len(prices)):
            avg_gain = (avg_gain * (period - 1) + gains[i-1]) / period
            avg_loss = (avg_loss * (period - 1) + losses[i-1]) / period
            if avg_loss == 0:
                rsi = 100 if avg_gain > 0 else 50
            else:
                rs = avg_gain / avg_loss
                rsi = 100 - (100 / (1 + rs))
            rsi_values.append(round(rsi, 2))
        return rsi_values

    @staticmethod
    def calculate_macd(prices: list, fast: int = 12, slow: int = 26, signal: int = 9) -> dict:
        """MACD with adjustable periods"""
        ema_fast = IndicatorService.calculate_ema(prices, fast)
        ema_slow = IndicatorService.calculate_ema(prices, slow)
        macd_line = []
        for i in range(len(prices)):
            if ema_fast[i] is not None and ema_slow[i] is not None:
                macd_line.append(round(ema_fast[i] - ema_slow[i], 4))
            else:
                macd_line.append(None)
        valid_macd = [m for m in macd_line if m is not None]
        signal_line_raw = IndicatorService.calculate_ema(valid_macd, signal) if len(valid_macd) >= signal else []
        signal_line = [None] * (len(macd_line) - len(signal_line_raw)) + signal_line_raw
        histogram = []
        for i in range(len(macd_line)):
            if macd_line[i] is not None and signal_line[i] is not None:
                histogram.append(round(macd_line[i] - signal_line[i], 4))
            else:
                histogram.append(None)
        return {'macd': macd_line, 'signal': signal_line, 'histogram': histogram}

    @staticmethod
    def calculate_bollinger_bands(prices: list, period: int = 20, std_dev: float = 2.0) -> dict:
        """Bollinger Bands"""
        import statistics
        sma = IndicatorService.calculate_sma(prices, period)
        upper, lower, bandwidth = [], [], []
        for i in range(len(prices)):
            if i < period - 1 or sma[i] is None:
                upper.append(None)
                lower.append(None)
                bandwidth.append(None)
            else:
                window = prices[i - period + 1:i + 1]
                std = statistics.stdev(window) if len(window) > 1 else 0
                upper.append(round(sma[i] + (std * std_dev), 4))
                lower.append(round(sma[i] - (std * std_dev), 4))
                bandwidth.append(round(upper[-1] - lower[-1], 4))
        return {'upper': upper, 'middle': sma, 'lower': lower, 'bandwidth': bandwidth}

    @staticmethod
    def calculate_atr(highs: list, lows: list, closes: list, period: int = 14) -> list:
        """Average True Range"""
        tr_values = []
        for i in range(len(closes)):
            if i == 0:
                tr = highs[i] - lows[i]
            else:
                tr = max(highs[i] - lows[i], abs(highs[i] - closes[i-1]), abs(lows[i] - closes[i-1]))
            tr_values.append(tr)
        atr_values = [None] * (period - 1)
        if len(tr_values) >= period:
            initial_atr = sum(tr_values[:period]) / period
            atr_values.append(round(initial_atr, 4))
            for i in range(period, len(tr_values)):
                atr = (atr_values[-1] * (period - 1) + tr_values[i]) / period
                atr_values.append(round(atr, 4))
        return atr_values

    @staticmethod
    def calculate_stochastic(highs: list, lows: list, closes: list, period: int = 14, k_smooth: int = 3, d_smooth: int = 3) -> dict:
        """Stochastic Oscillator"""
        raw_k = []
        for i in range(len(closes)):
            if i < period - 1:
                raw_k.append(None)
            else:
                h_max = max(highs[i - period + 1:i + 1])
                l_min = min(lows[i - period + 1:i + 1])
                if h_max == l_min:
                    raw_k.append(50)
                else:
                    raw_k.append(100 * (closes[i] - l_min) / (h_max - l_min))
        k_line = IndicatorService.calculate_sma([v if v else 0 for v in raw_k], k_smooth)
        d_line = IndicatorService.calculate_sma([v if v else 0 for v in k_line], d_smooth)
        return {'k': [round(v, 2) if v else None for v in k_line], 'd': [round(v, 2) if v else None for v in d_line]}

    @staticmethod
    def calculate_obv(closes: list, volumes: list) -> list:
        """On-Balance Volume"""
        obv = []
        cumulative = 0
        for i in range(len(closes)):
            if i == 0:
                cumulative = volumes[i]
            elif closes[i] > closes[i-1]:
                cumulative += volumes[i]
            elif closes[i] < closes[i-1]:
                cumulative -= volumes[i]
            obv.append(cumulative)
        return obv

    @staticmethod
    def calculate_vwap(highs: list, lows: list, closes: list, volumes: list) -> list:
        """Volume Weighted Average Price"""
        vwap = []
        cum_tp_vol, cum_vol = 0, 0
        for i in range(len(closes)):
            tp = (highs[i] + lows[i] + closes[i]) / 3
            cum_tp_vol += tp * volumes[i]
            cum_vol += volumes[i]
            vwap.append(round(cum_tp_vol / cum_vol, 4) if cum_vol > 0 else None)
        return vwap

    @staticmethod
    def calculate_mfi(highs: list, lows: list, closes: list, volumes: list, period: int = 14) -> list:
        """Money Flow Index"""
        tp = [(highs[i] + lows[i] + closes[i]) / 3 for i in range(len(closes))]
        mf = [tp[i] * volumes[i] for i in range(len(tp))]
        pos_mf, neg_mf = [], []
        for i in range(len(mf)):
            if i == 0:
                pos_mf.append(mf[i])
                neg_mf.append(0)
            elif tp[i] > tp[i-1]:
                pos_mf.append(mf[i])
                neg_mf.append(0)
            else:
                pos_mf.append(0)
                neg_mf.append(mf[i])
        mfi_values = [None] * (period - 1)
        for i in range(period - 1, len(mf)):
            pos_sum = sum(pos_mf[i - period + 1:i + 1])
            neg_sum = sum(neg_mf[i - period + 1:i + 1])
            mfr = pos_sum / neg_sum if neg_sum > 0 else 100
            mfi_values.append(round(100 - (100 / (1 + mfr)), 2))
        return mfi_values

    @staticmethod
    def calculate_adx(highs: list, lows: list, closes: list, period: int = 14) -> dict:
        """Average Directional Index"""
        plus_dm, minus_dm = [], []
        for i in range(1, len(highs)):
            up = highs[i] - highs[i-1]
            down = lows[i-1] - lows[i]
            if up > down and up > 0:
                plus_dm.append(up)
                minus_dm.append(0)
            elif down > up and down > 0:
                plus_dm.append(0)
                minus_dm.append(down)
            else:
                plus_dm.append(0)
                minus_dm.append(0)
        atr = IndicatorService.calculate_atr(highs, lows, closes, period)
        plus_di, minus_di, adx_values = [None] * period, [None] * period, [None] * period
        if len(plus_dm) >= period:
            plus_dm_smooth = sum(plus_dm[:period]) / period
            minus_dm_smooth = sum(minus_dm[:period]) / period
            for i in range(period, len(closes)):
                plus_dm_smooth = (plus_dm_smooth * (period - 1) + plus_dm[i-1]) / period
                minus_dm_smooth = (minus_dm_smooth * (period - 1) + minus_dm[i-1]) / period
                if atr[i] and atr[i] > 0:
                    plus_di.append(round(100 * plus_dm_smooth / atr[i], 2))
                    minus_di.append(round(100 * minus_dm_smooth / atr[i], 2))
                else:
                    plus_di.append(0)
                    minus_di.append(0)
        for i in range(len(plus_di)):
            if plus_di[i] is not None and minus_di[i] is not None:
                di_sum = plus_di[i] + minus_di[i]
                dx = 100 * abs(plus_di[i] - minus_di[i]) / di_sum if di_sum > 0 else 0
                adx_values.append(round(dx, 2))
        return {'plus_di': plus_di, 'minus_di': minus_di, 'adx': adx_values}

    @staticmethod
    def calculate_selected(df, selected_indicators: list):
        """
        Calculate ONLY the indicators that the user has selected.
        
        Args:
            df: DataFrame with OHLCV columns
            selected_indicators: List of indicator configs, e.g.:
                [
                    {'id': 'sma', 'params': {'period': 20}},
                    {'id': 'rsi', 'params': {'period': 14}},
                    {'id': 'macd', 'params': {'fast': 12, 'slow': 26, 'signal': 9}}
                ]
        
        Returns:
            dict with calculated indicator data organized by display mode
        """
        if df is None or df.empty:
            return {'overlays': {}, 'panes': {}}

        try:
            df.columns = [col.lower() for col in df.columns]
            closes = df['close'].tolist()
            highs = df['high'].tolist()
            lows = df['low'].tolist()
            volumes = df['volume'].tolist() if 'volume' in df.columns else [0] * len(closes)

            result = {'overlays': {}, 'panes': {}}

            for indicator in selected_indicators:
                ind_id = indicator.get('id', '').lower()
                params = indicator.get('params', {})
                registry = IndicatorService.INDICATOR_REGISTRY.get(ind_id)
                
                if not registry:
                    continue

                display_mode = registry['displayMode']
                target = 'overlays' if display_mode == 'overlay' else 'panes'

                try:
                    if ind_id == 'sma':
                        period = params.get('period', 20)
                        result[target][f'sma_{period}'] = IndicatorService.calculate_sma(closes, period)
                    
                    elif ind_id == 'ema':
                        period = params.get('period', 9)
                        result[target][f'ema_{period}'] = IndicatorService.calculate_ema(closes, period)
                    
                    elif ind_id == 'wma':
                        period = params.get('period', 20)
                        result[target][f'wma_{period}'] = IndicatorService.calculate_wma(closes, period)
                    
                    elif ind_id == 'rsi':
                        period = params.get('period', 14)
                        result[target]['rsi'] = IndicatorService.calculate_rsi(closes, period)
                    
                    elif ind_id == 'macd':
                        fast = params.get('fast', 12)
                        slow = params.get('slow', 26)
                        signal = params.get('signal', 9)
                        macd_data = IndicatorService.calculate_macd(closes, fast, slow, signal)
                        result[target]['macd'] = macd_data['macd']
                        result[target]['macd_signal'] = macd_data['signal']
                        result[target]['macd_histogram'] = macd_data['histogram']
                    
                    elif ind_id == 'bollinger':
                        period = params.get('period', 20)
                        std_dev = params.get('std_dev', 2.0)
                        bb_data = IndicatorService.calculate_bollinger_bands(closes, period, std_dev)
                        result[target]['bb_upper'] = bb_data['upper']
                        result[target]['bb_middle'] = bb_data['middle']
                        result[target]['bb_lower'] = bb_data['lower']
                    
                    elif ind_id == 'atr':
                        period = params.get('period', 14)
                        result[target]['atr'] = IndicatorService.calculate_atr(highs, lows, closes, period)
                    
                    elif ind_id == 'stochastic':
                        period = params.get('period', 14)
                        k = params.get('k_smooth', 3)
                        d = params.get('d_smooth', 3)
                        stoch_data = IndicatorService.calculate_stochastic(highs, lows, closes, period, k, d)
                        result[target]['stoch_k'] = stoch_data['k']
                        result[target]['stoch_d'] = stoch_data['d']
                    
                    elif ind_id == 'obv':
                        result[target]['obv'] = IndicatorService.calculate_obv(closes, volumes)
                    
                    elif ind_id == 'vwap':
                        result[target]['vwap'] = IndicatorService.calculate_vwap(highs, lows, closes, volumes)
                    
                    elif ind_id == 'mfi':
                        period = params.get('period', 14)
                        result[target]['mfi'] = IndicatorService.calculate_mfi(highs, lows, closes, volumes, period)
                    
                    elif ind_id == 'adx':
                        period = params.get('period', 14)
                        adx_data = IndicatorService.calculate_adx(highs, lows, closes, period)
                        result[target]['adx'] = adx_data['adx']
                        result[target]['di_plus'] = adx_data['plus_di']
                        result[target]['di_minus'] = adx_data['minus_di']

                except Exception as e:
                    logger.warning(f"Failed to calculate {ind_id}: {e}")

            return result

        except Exception as e:
            logger.error(f"Error in calculate_selected: {e}")
            return {'overlays': {}, 'panes': {}}
