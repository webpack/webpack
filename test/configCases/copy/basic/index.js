const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("should copy a directory recursively, dot files included", () => {
	expect(read("a.txt")).toBe("a");
	expect(read("nested/b.txt")).toBe("b");
	expect(read(".hidden.txt")).toBe("hidden");
});

it("should copy a single file named by a bare string", () => {
	expect(read("single.txt")).toBe("single");
});

it("should copy a glob into an interpolated filename", () => {
	expect(read("globbed/a.txt")).toBe("a");
	expect(read("globbed/.hidden.txt")).toBe("hidden");
	expect(exists("globbed/b.txt")).toBe(false);
});

it("should mark copied assets in the stats", () => {
	const { info } = __STATS__.assets.find((asset) => asset.name === "a.txt");

	expect(info.copied).toBe(true);
	expect(info.sourceFilename).toBe("files/a.txt");
});
