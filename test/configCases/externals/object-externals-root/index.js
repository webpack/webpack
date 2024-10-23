const fs = require("fs");
const path = require("path");

it("should correct resolve object externals root (cjs-and-esm)", function() {
	const content = fs.readFileSync(path.resolve(__dirname, "cjs-and-esm.js"), "utf-8");
	// static-import -> commonjs
	expect(content).toContain(`module.exports = require("external111")`);
	// dynamic-import -> import
	expect(content).toContain(`const external1_2 = Promise.resolve`);
	// dynamic-import -> import
	expect(content).toContain(`module.exports = import("external222")`);
	// fallback -> window
	expect(content).toContain(`module.exports = window["external333"]`);
});


it("should correct resolve object externals root 2 (amd)", function() {
	const content = fs.readFileSync(path.resolve(__dirname, "amd.js"), "utf-8");
	// amd -> commonjs
	expect(content).toContain(`module.exports = require("external444")`);
});
