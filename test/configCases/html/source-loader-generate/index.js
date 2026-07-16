const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should rewrite the built-in <img src> to the emitted asset", () => {
	expect(page).not.toContain('src="./logo.svg"');
	expect(page).toMatch(/src="logo\.svg"/);
});

it("should let a custom loader generate the content behind a built-in attribute", () => {
	const emitted = read("logo.svg");
	// The emitted asset is the loader's generated content, not the source file.
	expect(emitted).toContain("generated-by-loader");
	expect(emitted).not.toContain("original-file");
});
