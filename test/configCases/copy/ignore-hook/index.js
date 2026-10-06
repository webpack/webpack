const fs = require("fs");
const path = require("path");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const exists = (name) => fs.existsSync(path.resolve(__dirname, name));

it("should not copy a path the ignore hook claims", () => {
	expect(exists("secret.txt")).toBe(false);
});

it("should copy what the hook leaves to webpack", () => {
	expect(read("a.txt")).toBe("a");
	expect(read("nested/deep.txt")).toBe("deep");
});

it("should copy what 'globOptions.ignore' names when the hook says false", () => {
	expect(read("filtered/overruled.txt")).toBe("overruled");
});

it("should leave the rest to 'globOptions.ignore' when the hook has no answer", () => {
	expect(exists("filtered/dropped.txt")).toBe(false);
	expect(read("filtered/a.txt")).toBe("a");
	expect(exists("filtered/secret.txt")).toBe(false);
});
