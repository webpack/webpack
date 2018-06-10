const fs = require("fs");
const path = require("path");

it("should contain banner in bundle0 chunk", () => {
	const source = fs.readFileSync(__filename, "utf-8");
	expect(source).toMatch("A test value");
	expect(source).toMatch("banner is a string");
	expect(source).toMatch("banner is a function");
	expect(source).toMatch("/*!\n * multiline\n * banner\n * 1\n */");
});

it("should not contain banner in vendors chunk", () => {
	const source = fs.readFileSync(path.join(__dirname, "vendors.js"), "utf-8");
	expect(source).not.toMatch("A test value");
});

require.include("./test.js");
