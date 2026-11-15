const fs = require("fs");
const path = require("path");
const parse5 = require("parse5");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

// The elements a browser with scripting on builds, where a `<noscript>` holds text.
const elements = (html) => {
	const found = [];
	const walk = (node) => {
		if (node.tagName) found.push(node);
		for (const child of node.childNodes || []) walk(child);
	};
	walk(parse5.parse(html, { scriptingEnabled: true }));
	return found;
};

const isStylesheet = (node) =>
	node.tagName === "style" ||
	(node.tagName === "link" &&
		node.attrs.some((a) => a.name === "rel" && a.value === "stylesheet"));

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
