const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf8");

// a pattern may read what an earlier build emitted, so leaving the output
// directory out is the configuration's call, not webpack's
it("should copy from inside the output path by default", () => {
	expect(read("build/stale.txt")).toBe("stale");
	expect(read("keep.txt")).toBe("keep");
	expect(read("nested/deep.txt")).toBe("deep");
});
