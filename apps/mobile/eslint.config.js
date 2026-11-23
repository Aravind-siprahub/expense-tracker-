// ESLint for the Expo app: Expo's recommended rules (React, React Hooks, TypeScript, import checks).
const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expo,
  {
    ignores: ['node_modules/*', 'android/*', 'ios/*', '.expo/*', 'dist/*'],
  },
  {
    rules: {
      // Reported as a warning, not an error: the app uses this pattern on purpose in a few places (filling form
      // fields once the saved values arrive, going back to page 1 when a filter changes, re-arming a dismissed
      // alert). Each could be refactored later; none is a bug. Any NEW occurrence still shows up as a warning.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
]);
