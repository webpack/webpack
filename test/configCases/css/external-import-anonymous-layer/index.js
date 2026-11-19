import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const readCss = (name) =>
	fs
		.readFileSync(path.join(__dirname, `${name}.css`), "utf-8")
		.replace(/\/\*[^]*?\*\//g, "");

const name = path.basename(__filename, ".js");

const layerOf = (css, url) => {
	const match = new RegExp(
		`@import url\\("${url.replace(/\./g, "\\.")}"\\) layer\\(([^)]+)\\);`
	).exec(css);
	return match && match[1];
};

it("should name an anonymous layer a kept @import nests with a named one", () => {
	const css = readCss(name);
	expect(layerOf(css, "https://test.cases/theme.css")).toMatch(
		/^outer\.webpack-anonymous-\S+$/
	);
	expect(layerOf(css, "https://test.cases/base.css")).toMatch(
		/^webpack-anonymous-\S+\.inner$/
	);
});

it("should keep a lone anonymous layer as `layer`", () => {
	expect(readCss(name)).toContain(
		'@import url("https://test.cases/lone.css") layer;'
	);
});

it("should name the layer with the output hash options", () => {
	if (name !== "bundle1") return;
	const theme = layerOf(readCss(name), "https://test.cases/theme.css");
	expect(theme).not.toBe(
		layerOf(readCss("bundle0"), "https://test.cases/theme.css")
	);
	// a base64 digest can hold `+` or `/`, escaped to stay one identifier
	expect(theme).toMatch(/^outer\.webpack-anonymous-(?:[\w-]|\\.)+$/);
});
