import type { Config } from 'tailwindcss';
import sharedConfig from '@repo/tailwind-config';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      ...sharedConfig.theme.extend,
      boxShadow: {
        // Soft, slightly blue shadow used on every card
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px -14px rgba(37, 99, 235, 0.22)',
        nav: '0 6px 16px -6px rgba(37, 99, 235, 0.55)',
      },
    },
  },
  plugins: [],
};

export default config;
