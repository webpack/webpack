import { createRequire } from "module";
import { generateHtmlSource } from "../../helpers/sources.mjs";

const require = createRequire(import.meta.url);

const htmlSyntax =
	/** @type {import("../../../../lib/html/syntax")} */
	(require("../../../../lib/html/syntax.js"));

/** @type {string} */
let htmlSource = "";
/** @type {string} */
let fragmentSource = "";
/** @type {unknown} */
let sink;

export default {
	name: "unit/html/syntax",
	setup() {
		// ~150 KiB document: nested sections, tables, templates, entities.
		htmlSource = generateHtmlSource(400);
		fragmentSource = '<td class="cell">one <b>two</b> &amp; three</td>'.repeat(
			2000
		);
	},
	teardown() {
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "parse full document",
			fn() {
				sink = htmlSyntax.parseHtml(htmlSource);
			}
		},
		{
			name: "parse skipping text and comments",
			fn() {
				sink = htmlSyntax.parseHtml(htmlSource, 0, {
					skip: { text: true, comments: true }
				});
			}
		},
		{
			name: "parse table fragment",
			fn() {
				sink = htmlSyntax.parseHtml(fragmentSource, 0, {
					fragmentContext: "tr"
				});
			}
		},
		{
			name: "process document without visitors",
			fn() {
				sink = new htmlSyntax.SourceProcessor().use({}).process(htmlSource);
			}
		}
	]
};
