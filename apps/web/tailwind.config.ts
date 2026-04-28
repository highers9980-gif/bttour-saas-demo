import type { Config } from 'tailwindcss';
import { bttourPreset } from '@bttour/ui/tailwind-preset';

const config: Config = {
  presets: [bttourPreset],
  content: [
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  plugins: [],
};

export default config;
