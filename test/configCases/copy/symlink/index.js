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

it("should copy a symlink as a symlink when 'followSymlinks' is false", () => {
	const link = path.resolve(__dirname, "no-follow/relative.txt");

	expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
	// the link is copied as it is written, so it points inside the output
	expect(fs.readlinkSync(link)).toBe(path.join("real", "a.txt"));
	expect(read("no-follow/relative.txt")).toBe("a");
});

it("should copy a symlink to a directory as a symlink", () => {
	const link = path.resolve(__dirname, "no-follow/link");

	expect(fs.lstatSync(link).isSymbolicLink()).toBe(true);
	expect(read("no-follow/real/a.txt")).toBe("a");
});

it("should copy nothing from below a symlink it copied as a link", () => {
	const copied = __STATS__.assets
		.map((asset) => asset.name)
		.filter((name) => name.startsWith("no-follow/"));

	expect(copied.sort()).toEqual([
		"no-follow/link",
		"no-follow/real/a.txt",
		"no-follow/real/loop",
		"no-follow/relative.txt"
	]);
});
