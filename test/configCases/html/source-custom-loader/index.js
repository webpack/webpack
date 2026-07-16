const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should rewrite both the default <img src> and the custom data-themed attribute", () => {
	expect(page).not.toContain('src="./plain.svg"');
	expect(page).toMatch(/src="plain\.svg"/);
	expect(page).not.toContain('data-themed="./themed.svg"');
	expect(page).toMatch(/data-themed="themed\.svg"/);
});

it("should run a custom loader on the resource behind a specific attribute", () => {
	// The `data-themed` asset went through the custom loader.
	const themed = read("themed.svg");
	expect(themed).toContain('fill="#ff0000"');
	expect(themed).not.toContain("__THEME_COLOR__");
	// The default `<img src>` asset is untouched by the themed-only loader.
	expect(read("plain.svg")).toContain('fill="#0000ff"');
});
