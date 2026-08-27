const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const assetsMatching = (regexp) =>
	__STATS__.assets.filter((asset) => regexp.test(asset.name));

it("should rename a single copied file", () => {
	expect(read("renamed.txt")).toBe("a");
});

it("should interpolate a content hash and mark the asset immutable", () => {
	const hashed = assetsMatching(/^hashed\/a\.[\da-f]+\.txt$/);

	expect(hashed).toHaveLength(1);
	expect(hashed[0].info.immutable).toBe(true);
	expect(read(hashed[0].name)).toBe("a");
});

it("should support a 'to' function", () => {
	expect(read("fn/a.txt")).toBe("a");
	expect(read("fn/b.txt")).toBe("b");
});

it("should let a later pattern replace what an earlier one copied", () => {
	expect(read("conflict.txt")).toBe("b");
});

it("should copy a pattern which conflicts with nothing", () => {
	expect(read("kept.txt")).toBe("a");
});
