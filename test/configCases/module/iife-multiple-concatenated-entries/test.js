const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.join(__dirname, file), "utf-8");
const MARKER = "isolated against other entry modules";

it("avoids the per-entry IIFE for multiple concatenated entries without collisions", () => {
	// concatenated entries report declarations/free names via codegen data, so
	// the no-collision check runs without re-parsing the entries
	expect(read("concat-true.mjs")).not.toContain(MARKER);
	// ...and the per-entry IIFE is kept when the optimization is disabled
	expect(read("concat-false.mjs")).toContain(MARKER);
});
