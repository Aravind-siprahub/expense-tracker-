const sharedConfig = require('@repo/tailwind-config');

module.exports = {
  content: ['./*.{tsx,ts}', './app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      ...sharedConfig.theme.extend,
    },
  },
  plugins: [],
};
