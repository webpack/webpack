const fs = require("fs");
const path = require("path");

/**
 * @param {string} name emitted file
 * @returns {string} its content
 */
const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

const [, manifestFile] =
	/** @type {RegExpMatchArray} */
	(read("page.html").match(/<link rel="manifest" href="([^"]+)">/));
const manifest = JSON.parse(read(manifestFile));

it("should keep placeholder-like text in a manifest value and key", () => {
	expect(manifest.name).toBe("__WEBPACK_CSS_PUBLIC_PATH_AUTO__ marker");
	expect(manifest.__WEBPACK_CSS_PUBLIC_PATH_AUTO__).toBe("key");
	expect(manifest.start_url).toBe("/");
});

it("should keep placeholder-like text in an icon url query", () => {
	expect(manifest.icons[0].src).toMatch(
		/^[0-9a-f]+\.png\?v=%5F_WEBPACK_CSS_PUBLIC_PATH_AUTO__$/
	);
});
