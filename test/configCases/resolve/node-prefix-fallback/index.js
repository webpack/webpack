// node: prefixed imports should respect resolve.fallback and resolve.alias.
// Previously webpack threw "Reading from 'node:...' is not handled by plugins
// (Unhandled scheme)" for these imports on non-node targets.

const withFallback = require("node:crypto");
const withAlias = require("node:fs");

it("should apply resolve.fallback to node: prefixed imports", () => {
	expect(withFallback.polyfilled).toBe(true);
});

it("should apply resolve.alias to node: prefixed imports", () => {
	expect(withAlias.polyfilled).toBe(true);
});
