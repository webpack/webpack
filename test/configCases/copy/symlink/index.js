const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("should follow a symlink to a directory", () => {
	expect(read("real/a.txt")).toBe("a");
	expect(read("link/a.txt")).toBe("a");
});

it("should stop where a symlink points back at a directory it walked", () => {
	expect(exists("real/loop/real/a.txt")).toBe(false);
	expect(exists("link/loop/real/a.txt")).toBe(false);
});
