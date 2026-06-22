const fs = require("fs");
const path = require("path");
const Module = require("module");

it("avoids the IIFE and preserves exports when a multi-entry library renames a collision", () => {
	const libPath = path.join(__dirname, "lib.js");
	const source = fs.readFileSync(libPath, "utf-8");
	// the per-entry IIFE is dropped
	expect(source).not.toContain("isolated against other entry modules");
	// the exported `result` collides with first.js's `result`; it is renamed
	// internally but still exported with the correct value
	const mod = new Module(libPath);
	mod.filename = libPath;
	mod._compile(source, libPath);
	expect(mod.exports.result).toBe("exported");
});
