import { createRequire } from "module";
import { generateCssSource } from "../../helpers/sources.mjs";
import { defineSuite } from "../../lib/index.mjs";

const require = createRequire(import.meta.url);

const cssSyntax =
	/** @type {import("../../../../lib/css/syntax")} */
	(require("../../../../lib/css/syntax.js"));

/** @type {string} */
let cssSource = "";
let sink = 0;

export default defineSuite({
	name: "unit/css/syntax",
	setup() {
		// ~100 KiB of rules, media queries, urls and calc() expressions.
		cssSource = generateCssSource(1100);
	},
	teardown() {
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "tokenize 100 KiB stylesheet",
			fn() {
				const out =
					/** @type {import("../../../../lib/css/syntax").MutableToken} */ (
						/** @type {unknown} */ ({})
					);
				let pos = 0;
				let count = 0;
				for (;;) {
					const token = cssSyntax.readToken(cssSource, pos, out);
					if (!token || token.type === cssSyntax.TT_EOF) break;
					pos = token.end;
					count++;
				}
				sink = count;
			}
		},
		{
			name: "parse 100 KiB stylesheet",
			fn() {
				sink = cssSyntax.parseAStylesheet(cssSource).rules.length;
			}
		}
	]
});
