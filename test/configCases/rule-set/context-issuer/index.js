it("should apply issuer condition to modules loaded via require.context", () => {
	const ctx = require.context("./icons", false, /\.svg$/);
	const keys = ctx.keys();
	expect(keys.length).toBe(1);
	const result = ctx(keys[0]);
	// When the issuer rule matches, the SVG is emitted as an asset/resource
	// and the module exports a string (the asset URL), not an object.
	expect(typeof result).toBe("string");
});
