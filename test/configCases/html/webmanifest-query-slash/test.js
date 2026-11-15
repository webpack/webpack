const fs = require("fs");
const path = require("path");

/**
 * @param {string} name emitted file
 * @returns {string} its content
 */
const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("should resolve icon urls beside a manifest whose query has slashes", () => {
	const [, manifestHref] =
		/** @type {RegExpMatchArray} */
		(read("page.html").match(/<link rel="manifest" href="([^"]+)">/));
	expect(manifestHref).toMatch(/\?v=a\/b\/c$/);
	const manifest = JSON.parse(read(manifestHref.replace(/\?.*$/, "")));
	expect(manifest.icons[0].src).toMatch(/^[0-9a-f]+\.png$/);
	expect(fs.existsSync(path.resolve(__dirname, manifest.icons[0].src))).toBe(true);
});
