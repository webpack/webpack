const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should keep the whole file name when it holds a '#'", () => {
	expect(read("out/photo_1.png")).toBe("first");
	expect(read("out/plain.png")).toBe("plain");
	expect(read("out/logo!dark.png")).toBe("bang");
	expect(fs.existsSync(path.resolve(__dirname, "out/photo"))).toBe(false);
});

it("should keep the whole file name in a hashed filename", () => {
	const names = fs.readdirSync(path.resolve(__dirname, "hashed")).sort();
	expect(names).toHaveLength(3);
	expect(names[0]).toMatch(/^logo!dark-[0-9a-f]{8}\.png$/);
	expect(names[1]).toMatch(/^photo_1-[0-9a-f]{8}\.png$/);
	expect(names[2]).toMatch(/^plain-[0-9a-f]{8}\.png$/);
});

it("should hand a filename function the path as written", () => {
	expect(read("callback/logo!dark.png")).toBe("bang");
});

it("should hand a filename function the chunk name as written", () => {
	expect(read("named/original.png")).toBe("first");
});
