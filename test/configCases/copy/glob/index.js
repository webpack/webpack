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
	expect(read("all/keep.txt")).toBe("keep");
	expect(exists("all/skip.md")).toBe(false);
});

it("should copy a dot directory the glob names, no deeper than it reaches", () => {
	expect(read("explicit-dot/inside.txt")).toBe("inside");
	expect(exists("explicit-dot/deeper/ignored.txt")).toBe(false);
});

it("should copy an absolute 'from'", () => {
	expect(read("absolute.txt")).toBe("keep");
});

it("should copy an absolute 'from' which walks back up a directory", () => {
	expect(read("dots/keep.txt")).toBe("keep");
});

it("should copy an absolute directory 'from'", () => {
	expect(read("absolute-dir/deep.txt")).toBe("deep");
});

it("should read a '\\' in an absolute pattern as a separator", () => {
	expect(read("backslash/keep.txt")).toBe("keep");
	expect(read("backslash/.dot.txt")).toBe("dot");
});

it("should match the case of a file name by default", () => {
	expect(exists("all/Upper.TXT")).toBe(false);
});

it("should ignore the case when 'caseSensitive' is false", () => {
	expect(read("insensitive/Upper.TXT")).toBe("upper");
	expect(read("insensitive/keep.txt")).toBe("keep");
});

it("should reach a dot file the glob does not name by default", () => {
	expect(read("all/.dot.txt")).toBe("dot");
});

it("should leave a dot file alone when 'dot' is false", () => {
	expect(read("no-dot/keep.txt")).toBe("keep");
	expect(exists("no-dot/.dot.txt")).toBe(false);
	expect(exists("no-dot/.hidden/inside.txt")).toBe(false);
});

it("should read no deeper than 'deep' says", () => {
	expect(read("shallow/keep.txt")).toBe("keep");
	expect(read("shallow/.dot.txt")).toBe("dot");
	expect(exists("shallow/sub/deep.txt")).toBe(false);
});

it("should leave a file 'ignore' names alone", () => {
	expect(read("no-sub/keep.txt")).toBe("keep");
	expect(exists("no-sub/sub/deep.txt")).toBe(false);
});

it("should skip a directory 'ignore' names whole", () => {
	expect(read("no-hidden/keep.txt")).toBe("keep");
	expect(exists("no-hidden/.hidden/inside.txt")).toBe(false);
	expect(exists("no-hidden/.hidden/deeper/ignored.txt")).toBe(false);
});
