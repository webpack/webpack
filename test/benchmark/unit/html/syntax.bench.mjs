import { createRequire } from "module";
import { generateHtmlSource } from "../../helpers/sources.mjs";
import { defineSuite } from "../../lib/index.mjs";

const require = createRequire(import.meta.url);

const htmlSyntax =
	/** @type {import("../../../../lib/html/syntax")} */
	(require("../../../../lib/html/syntax.js"));

/** @type {string} */
let htmlSource = "";
/** @type {unknown} */
let sink;

export default defineSuite({
	name: "unit/html/syntax",
	setup() {
		// ~150 KiB document: nested sections, tables, templates, entities.
		htmlSource = generateHtmlSource(400);
	},
	teardown() {
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "build AST full document",
			fn() {
				sink = htmlSyntax.buildHtmlAst(htmlSource);
			}
		},
		{
			name: "build AST skipping text and comments",
			fn() {
				// The reduced tree HtmlParser-style consumers build.
				sink = htmlSyntax.buildHtmlAst(htmlSource, undefined, {
					text: true,
					comments: true
				});
			}
		}
	]
});
