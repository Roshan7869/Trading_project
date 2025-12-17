import type { Config } from 'tailwindcss'

const config: Config = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './app/**/*.{js,ts,jsx,tsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                primary: '#10B981',      // Emerald Green
                danger: '#F43F5E',        // Rose Red
                background: '#FFFFFF',    // White
                secondary: '#F3F4F6',     // Light Gray
                text: {
                    primary: '#111827',     // Gray 900
                    secondary: '#6B7280',   // Gray 500
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
            },
        },
    },
    plugins: [],
}
export default config