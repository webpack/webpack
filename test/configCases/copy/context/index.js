const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("should copy every 'from' of the pattern", () => {
	expect(read("both/one.txt")).toBe("one");
	expect(read("both/two.txt")).toBe("two");
});

it("should root every 'from' at 'context'", () => {
	expect(read("rooted/a/one.txt")).toBe("one");
	expect(read("rooted/b/two.txt")).toBe("two");
});

it("should resolve a relative 'from' from 'context'", () => {
	expect(read("relative/one.txt")).toBe("one");
});

it("should take an absolute 'context'", () => {
	expect(read("absolute/b/two.txt")).toBe("two");
});

it("should copy a file two 'from' reach only once", () => {
	expect(read("twice/one.txt")).toBe("one");
	expect(exists("twice/pkg")).toBe(false);
});
