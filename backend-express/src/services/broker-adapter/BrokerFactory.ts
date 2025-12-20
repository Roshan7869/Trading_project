import { KotakNeoAdapter } from './KotakNeoAdapter';
import { AngelOneAdapter } from './AngelOneAdapter';
import { ZerodhaKiteAdapter } from './ZerodhaKiteAdapter';
import { IBrokerAdapter } from './IBrokerAdapter';

export class BrokerFactory {
    static createAdapter(brokerName: string, credentials: any): IBrokerAdapter {
        switch (brokerName.toUpperCase()) {
            case 'KOTAK_NEO':
                return new KotakNeoAdapter({
                    BASE_URL: credentials.baseURL || 'https://napi.kotaksecurities.com',
                    CONSUMER_KEY: credentials.consumerKey,
                    CONSUMER_SECRET: credentials.consumerSecret,
                    CLIENT_ID: credentials.clientId,
                    MPIN: credentials.mpin,
                    MOBILE: credentials.mobile,
                    TOTP_SECRET: credentials.totpSecret
                });

            case 'ANGEL_ONE':
                return new AngelOneAdapter({
                    CLIENT_CODE: credentials.clientCode,
                    API_PASSWORD: credentials.apiPassword,
                    BROKER_API_KEY: credentials.brokerApiKey,
                    TOTP_SECRET: credentials.totpSecret
                });

            case 'ZERODHA_KITE':
                return new ZerodhaKiteAdapter({
                    API_KEY: credentials.apiKey,
                    API_SECRET: credentials.apiSecret,
                    CLIENT_ID: credentials.clientId,
                    PASSWORD: credentials.password,
                    TOTP_SECRET: credentials.totpSecret
                });

            default:
                throw new Error(`Unsupported broker: ${brokerName}`);
        }
    }

    static getSupportedBrokers() {
        return [
            {
                name: 'KOTAK_NEO',
                displayName: 'Kotak Neo',
                logo: '/logos/kotak-neo.png',
                features: ['Zero Brokerage', 'Ultra-Low Latency', 'NSE/BSE/NFO'],
                requiredFields: ['consumerKey', 'consumerSecret', 'clientId', 'mpin', 'mobile', 'totpSecret']
            },
            {
                name: 'ANGEL_ONE',
                displayName: 'Angel One',
                logo: '/logos/angel-one.png',
                features: ['Fast Execution', 'Bracket Orders', 'Easy Integration'],
                requiredFields: ['clientCode', 'apiPassword', 'brokerApiKey', 'totpSecret']
            },
            {
                name: 'ZERODHA_KITE',
                displayName: 'Zerodha Kite',
                logo: '/logos/zerodha.png',
                features: ['Largest Broker', 'Rich Ecosystem', 'WebSocket Support'],
                requiredFields: ['apiKey', 'apiSecret', 'clientId', 'password', 'totpSecret']
            }
        ];
    }
}
