/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        velvet: {
          black: '#0A0908',
          surface: '#15130F',
          border: '#2A241B',
          gold: '#C9A961',
          'gold-light': '#E2C887',
          'gold-deep': '#7A5A2A',
          purple: '#7A5A2A',
          'purple-light': '#9B7340',
          cream: '#F5EFE3',
          muted: '#8B847A',
        }
      },
      keyframes: {
        'fade-in-up': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'fade-in': {
          '0%': {
            opacity: '0'
          },
          '100%': {
            opacity: '1'
          }
        },
        'slide-up': {
          '0%': {
            transform: 'translateY(100px)',
            opacity: '0'
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1'
          },
        },
        'kenburns': {
          '0%': {
            transform: 'scale(1.1)'
          },
          '100%': {
            transform: 'scale(1)'
          },
        },
        'gradient': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out',
        'kenburns': 'kenburns 20s ease-out forwards',
        'gradient': 'gradient 3s ease infinite',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')
  ],
};
