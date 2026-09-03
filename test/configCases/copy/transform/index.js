const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should transform the copied content", () => {
	expect(read("out/keep.txt")).toBe("KEEP:keep.txt");
});

it("should not copy a file the glob does not name", () => {
	expect(fs.existsSync(path.resolve(__dirname, "out/skip.txt"))).toBe(false);
});
