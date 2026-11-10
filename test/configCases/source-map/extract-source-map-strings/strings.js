/**
 * @param {string} url source map URL
 * @returns {string} stylesheet with an embedded source map directive
 */
export const angularStyle = url => `body {}\n/*# sourceMappingURL=${url} */`;
export const multiline = `
//# sourceMappingURL=missing.map
`;
export const nested = `${`//# sourceMappingURL=missing.map`}`;
export const quoted = "/*# sourceMappingURL=missing.map */";
export const escaped = `\`
//# sourceMappingURL=missing.map
`;
export const regex = /[//# sourceMappingURL=missing.map]/;
