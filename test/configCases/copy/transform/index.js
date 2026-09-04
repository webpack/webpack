const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should transform the copied content", () => {
	expect(read("out/keep.txt")).toBe("KEEP:keep.txt");
});

it("should not copy a file the glob does not name", () => {
	expect(fs.existsSync(path.resolve(__dirname, "out/skip.txt"))).toBe(false);
});

it("should transform without caching the result", () => {
	expect(read("uncached/keep.txt")).toBe("keep!");
});

it("should cache the result under the keys the transform names", () => {
	expect(read("keyed/keep.txt")).toBe("keep?");
	expect(read("keyed-fn/keep.txt")).toBe("peek");
});
