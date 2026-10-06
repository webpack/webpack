const fs = require("fs");
const path = require("path");
const TIMESTAMPS = require("./timestamps");

it("should stamp an emitted asset with the times it carries", () => {
	const stats = fs.statSync(path.resolve(__dirname, "stamped.txt"));

	expect(Math.floor(stats.mtimeMs / 1000)).toBe(TIMESTAMPS.mtime / 1000);
	expect(Math.floor(stats.atimeMs / 1000)).toBe(TIMESTAMPS.atime / 1000);
});
