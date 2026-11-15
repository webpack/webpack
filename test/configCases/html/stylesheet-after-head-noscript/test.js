const fs = require("fs");
const path = require("path");
const { SourceProcessor, parser } = require("webpack").html.syntax;

const { Field, NodeType, Part } = parser;

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

// The elements a browser with scripting on builds, where a `<noscript>` holds text.
const elements = (html) => {
	const found = [];
	new SourceProcessor()
		.use({
			[NodeType.Element]: (node) => {
				const rel = node.fieldNamed(Field.attributes, "rel");
				const start = rel === 0 ? -1 : node.startOf(Part.value, rel);
				found.push({
					tagName: node.name(),
					rel: start === -1 ? undefined : node.source(start, node.endOf(Part.value, rel))
				});
			}
		})
		.process(html, { scripting: true });
	return found;
};

const isStylesheet = (node) =>
	node.tagName === "style" ||
	(node.tagName === "link" &&
		node.rel === "stylesheet");

for (const name of ["linked", "inlined"]) {
	for (const page of ["closed", "implied"]) {
		it(`places the ${name} stylesheet of the ${page} page after the head's noscript`, () => {
			const html = readHtml(`${name}-${page}.html`);
			const sheets = elements(html).filter(isStylesheet);
			expect(sheets).toHaveLength(1);
			expect(sheets[0].tagName).toBe(name === "inlined" ? "style" : "link");
		});
	}
}
