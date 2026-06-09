const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.join(__dirname, file), "utf-8");
const MARKER = "isolated against other entry modules";

it("avoids the per-entry IIFE for multiple inlined entries without collisions", () => {
	// disjoint top-level names: the per-entry IIFE is dropped when enabled
	expect(read("nocollide-true.mjs")).not.toContain(MARKER);
	// ...and kept when the optimization is disabled
	expect(read("nocollide-false.mjs")).toContain(MARKER);
});
