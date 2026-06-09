const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.join(__dirname, file), "utf-8");
const MARKER = "isolated against other entry modules";

it("resolves the colliding declaration by renaming instead of an IIFE", () => {
	// `value` collides (index1 reads it as a global, index2 declares it); with
	// avoidEntryIife the collision is renamed away and no IIFE is emitted...
	expect(read("avoid.mjs")).not.toContain(MARKER);
	// ...while disabling the optimization keeps the per-entry IIFE.
	expect(read("keep.mjs")).toContain(MARKER);
});
