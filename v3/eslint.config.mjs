import nextPlugin from 'eslint-config-next';

const config = [
  ...nextPlugin,
  {
    ignores: ['node_modules/', '.next/', 'out/', 'build/', 'dist/', '*.pdf'],
  },
];

export default config;