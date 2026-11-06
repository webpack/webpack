const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should keep the whole file name when it holds a '#'", () => {
	expect(read("out/photo_1.png")).toBe("first");
	expect(read("out/plain.png")).toBe("plain");
	expect(fs.existsSync(path.resolve(__dirname, "out/photo"))).toBe(false);
});
