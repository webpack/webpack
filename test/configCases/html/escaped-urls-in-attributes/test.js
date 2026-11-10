const fs = require("fs");
const path = require("path");
const { SourceProcessor, parser } = require("webpack").html.syntax;

/**
 * @param {string} name emitted file
 * @returns {string} its content
 */
const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

/**
 * @param {string} html a document
 * @returns {{ name: string, attributes: Record<string, string> }[]} its elements, attribute values decoded
 */
const elements = (html) => {
	/** @type {{ name: string, attributes: Record<string, string> }[]} */
	const out = [];
	new SourceProcessor()
		.use({
			[parser.NodeType.Element]: (nodePath) => {
				/** @type {Record<string, string>} */
				const attributes = {};
				const count = nodePath.fieldCount(parser.Field.attributes);
				for (let i = 0; i < count; i++) {
					const attribute = nodePath.field(i, parser.Field.attributes);
					attributes[nodePath.name(attribute)] = nodePath.value(attribute);
				}
				out.push({ name: nodePath.name(), attributes });
			}
		})
		.process(html, {});
	return out;
};

const page = elements(read("page.html"));

/**
 * @param {string} name element name
 * @returns {Record<string, string>[]} the attributes of each such element
 */
const attributesOf = (name) =>
	page.filter((element) => element.name === name).map((e) => e.attributes);

it("should add no attribute from a url", () => {
	for (const { attributes } of page) {
		expect(Object.keys(attributes)).not.toContain("data-x");
	}
});

it("should percent-encode a chunk name in a script url", () => {
	const sources = attributesOf("script").map((attributes) => attributes.src);
	expect(sources).toContain("named%27%20data-x=%271.mjs");
	expect(fs.existsSync(path.resolve(__dirname, "named' data-x='1.mjs"))).toBe(
		true
	);
});

it("should percent-encode a chunk name in a linked page url", () => {
	expect(attributesOf("a")[0].href).toBe("linked%27%20data-x=%273.html");
	expect(fs.existsSync(path.resolve(__dirname, "linked' data-x='3.html"))).toBe(
		true
	);
});

it("should keep the query of an unquoted asset url in its attribute", () => {
	const sources = attributesOf("img").map((attributes) => attributes.src);
	expect(sources).toEqual([
		"image.png?a data-x=2",
		"image.png?b=%5F_WEBPACK_CSS_PUBLIC_PATH_AUTO__"
	]);
});

it("should percent-encode the query of an asset url in a resource hint", () => {
	const [hint] = attributesOf("link");
	expect(Object.keys(hint).sort()).toEqual(["as", "href", "rel"]);
	expect(hint.href).toBe("image.png?c=%22%20data-x=%225");
});

it("should percent-encode a chunk name in a url of html exported to js", () => {
	const app = read("app.mjs");
	expect(app).toContain("src='fragment%27%20data-x=%274.mjs'");
	expect(app).not.toContain("data-x='4");
});
