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

const html = read("page.html");
const page = elements(html);

/**
 * @param {string} name element name
 * @returns {Record<string, string>[]} the attributes of each such element
 */
const attributesOf = (name) =>
	page.filter((element) => element.name === name).map((e) => e.attributes);

/**
 * @param {string} text text from the stylesheet's comment
 * @returns {string} the same text with each marker's first `_` escaped
 */
const escaped = (text) => text.replace(/__WEBPACK_/g, "\\5F_WEBPACK_");

it("should keep marker text in a resource hint's attributes as text", () => {
	const [hint] = attributesOf("link").filter(
		(attributes) => attributes.rel === "prefetch"
	);
	expect(Object.keys(hint).sort()).toEqual([
		"as",
		"crossorigin",
		"href",
		"media",
		"rel",
		"type"
	]);
	expect(hint.type).toBe(
		escaped("marker __WEBPACK_HTML_INLINE__00__css__END__")
	);
	expect(hint.media).toBe(
		escaped(
			"marker __WEBPACK_HTML_INLINE__706167652d30__javascript__END__ __WEBPACK_HTML_INLINE__00__css__END__ x integrity=__WEBPACK_HTML_INTEGRITY__706167652d30__javascript__END__"
		)
	);
});

it("should keep a marker that names no chunk as text", () => {
	expect(html).toMatch(
		/<p id="?inline"?>__WEBPACK_HTML_INLINE__00__css__END__<\/p>/
	);
	const [paragraph] = attributesOf("p").filter(
		(attributes) => attributes.id === "integrity"
	);
	expect(paragraph.integrity).toBe(
		"__WEBPACK_HTML_INTEGRITY__00__css__END__"
	);
});

it("should still resolve the markers webpack wrote", () => {
	const [script] = attributesOf("script");
	expect(script.integrity).toMatch(/^sha384-/);
	const [stylesheet] = attributesOf("link").filter(
		(attributes) => attributes.rel === "stylesheet"
	);
	expect(stylesheet.integrity).toMatch(/^sha384-/);
});
