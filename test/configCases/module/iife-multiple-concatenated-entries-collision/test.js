const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.join(__dirname, file), "utf-8");
const MARKER = "isolated against other entry modules";

it("resolves the colliding declaration by renaming instead of an IIFE", () => {
	// `value` collides (first reads it as a global, second declares it); the
	// codegen-data fast path must bail out so the collision is renamed away
	expect(read("collide-true.mjs")).not.toContain(MARKER);
	// ...while disabling the optimization keeps the per-entry IIFE
	expect(read("collide-false.mjs")).toContain(MARKER);
});
