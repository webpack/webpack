const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should rewrite the <img src> to the emitted asset", () => {
	expect(page).not.toContain('src="./themed.svg"');
	expect(page).toMatch(/src="themed\.svg"/);
});

it("should attach a loader to HTML references via the `url` dependency condition", () => {
	const emitted = read("themed.svg");
	// The loader selected by `dependency: "url"` ran on the referenced asset.
	expect(emitted).toContain('fill="#00ff00"');
	expect(emitted).not.toContain("__DEP_COLOR__");
});
