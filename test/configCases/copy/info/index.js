const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should copy the files the patterns name", () => {
	expect(read("static/a.txt")).toBe("a");
	expect(read("from-file/a.txt")).toBe("a");
	expect(read("from-file/b.txt")).toBe("b");
});
