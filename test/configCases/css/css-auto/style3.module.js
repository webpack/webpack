import { green, red } from './colors.js';

export default `
.class { color: ${green}; }
:global {
  body { background: ${red}; }
}
`;
