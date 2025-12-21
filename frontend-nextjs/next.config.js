/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React Strict Mode for better development experience
    reactStrictMode: true,

    // Optimize for development
    experimental: {
        // Enable optimized package imports for faster loading
        optimizePackageImports: [
            'lucide-react',
            'recharts',
            '@radix-ui/react-dialog',
            '@radix-ui/react-slot',
            'chart.js'
        ],
    },

    // Faster refresh configuration
    onDemandEntries: {
        // Keep pages in memory for longer
        maxInactiveAge: 60 * 60 * 1000, // 1 hour
        pagesBufferLength: 5,
    },

    // Webpack configuration for faster builds
    webpack: (config, { dev, isServer }) => {
        if (dev) {
            // Faster source maps for development
            config.devtool = 'eval-source-map';

            // Enable polling for Docker file watching
            config.watchOptions = {
                poll: 1000,
                aggregateTimeout: 300,
                ignored: /node_modules/,
            };
        }

        return config;
    },

    // Disable telemetry
    env: {
        NEXT_TELEMETRY_DISABLED: '1',
    },

    // Image optimization with remotePatterns (updated from deprecated domains)
    images: {
        remotePatterns: [
            {
                protocol: 'http',
                hostname: 'localhost',
            },
        ],
        unoptimized: process.env.NODE_ENV === 'development',
    },

    // TypeScript configuration
    typescript: {
        // Ignore type errors during development for faster builds
        ignoreBuildErrors: process.env.NODE_ENV === 'development',
    },

    // Output configuration
    output: 'standalone',

    // Logging configuration
    logging: {
        fetches: {
            fullUrl: true,
        },
    },
};

module.exports = nextConfig;
