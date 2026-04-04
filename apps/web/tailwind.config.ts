import type { Config } from 'tailwindcss';
const sharedConfig = require('@repo/tailwind-config');

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      ...sharedConfig.theme.extend,
    },
  },
  plugins: [],
};

export default config;
