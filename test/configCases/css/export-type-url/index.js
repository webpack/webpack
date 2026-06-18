import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

/**
 * @param {URL} url css entry url
 * @returns {string} css file contents
 */
const readCss = (url) =>
	fs.readFileSync(path.resolve(__dirname, path.basename(url.href)), "utf-8");

it("should export a URL to a standalone CSS file when exportType is url", () => {
	const url = new URL("./style.css", import.meta.url);
	expect(url).toBeInstanceOf(URL);
	expect(url.href).toMatch(/\.css$/);
	const css = readCss(url);
	expect(css).toContain(".hello");
	expect(css).toContain(".imported");
});

it("should support webpackEntryOptions magic comment", () => {
	const styleUrl = new URL("./style.css", import.meta.url);
	const url = new URL(
		/* webpackEntryOptions: { "name": "named-style" } */
		"./named.css",
		import.meta.url
	);
	expect(url.href).not.toBe(styleUrl.href);
	const css = readCss(url);
	expect(css).toContain(".named");
	expect(css).toMatch(/url\([^)]+\.png\)/);
	expect(css).not.toContain('url("./img.png")');
});

it("should support webpackChunkName magic comment", () => {
	const styleUrl = new URL("./style.css", import.meta.url);
	const url = new URL(
		/* webpackChunkName: "chunk-named-style" */
		"./chunk-named.css",
		import.meta.url
	);
	expect(url.href).not.toBe(styleUrl.href);
	expect(readCss(url)).toContain(".chunk-named");
});

it("should deduplicate entry blocks for the same CSS file", () => {
	const url1 = new URL("./style.css", import.meta.url);
	const url2 = new URL("./style.css", import.meta.url);
	expect(url1.href).toBe(url2.href);
	const basename = path.basename(url1.href);
	expect(fs.readdirSync(__dirname).filter((f) => f === basename)).toHaveLength(
		1
	);
});
