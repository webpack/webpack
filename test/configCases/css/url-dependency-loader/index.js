const fs = require("fs");
const path = require("path");

require("./style.css");

const read = (name) => fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should attach a loader to CSS url() assets via the `url` dependency condition", () => {
	const emitted = read("themed.svg");
	// The loader selected by `dependency: "url"` ran on the url()-referenced asset.
	expect(emitted).toContain('fill="#00ff00"');
	expect(emitted).not.toContain("__DEP_COLOR__");
});
