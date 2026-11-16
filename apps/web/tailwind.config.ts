import type { Config } from 'tailwindcss';
import sharedConfig from '@repo/tailwind-config';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      ...sharedConfig.theme.extend,
    },
  },
  plugins: [],
};

export default config;
