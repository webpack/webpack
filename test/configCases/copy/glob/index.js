const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("should keep the directory structure below 'from'", () => {
	expect(read("all/keep.txt")).toBe("keep");
	expect(read("all/sub/deep.txt")).toBe("deep");
	expect(read("all/.dot.txt")).toBe("dot");
});

it("should copy only what the glob names", () => {
	expect(exists("all/skip.log")).toBe(false);
});

it("should copy a dot directory the glob names, no deeper than it reaches", () => {
	expect(read("explicit-dot/inside.txt")).toBe("inside");
	expect(exists("explicit-dot/deeper/ignored.txt")).toBe(false);
});

it("should copy an absolute 'from'", () => {
	expect(read("absolute.txt")).toBe("keep");
});
