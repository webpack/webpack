import { createRequire } from "module";
import { generateJavaScriptSource } from "../../helpers/sources.mjs";

const require = createRequire(import.meta.url);

const JavascriptParser =
	/** @type {typeof import("../../../../lib/javascript/JavascriptParser")} */
	(require("../../../../lib/javascript/JavascriptParser.js"));

/** @type {string} */
let moduleSource = "";
/** @type {string} */
let scriptSource = "";
/** @type {string} */
let autoFallbackSource = "";
let sink = 0;
// webpack reuses parser instances across modules (cached per parser options),
// so hook setup cost is excluded like in real builds.
const parser = new JavascriptParser("auto");
const scriptParser = new JavascriptParser("script");

/**
 * @param {string} source source code
 * @param {"module" | "script"} sourceType source type
 * @returns {import("../../../../lib/javascript/JavascriptParser").ParseResult} parse result
 */
const acornParse = (source, sourceType) =>
	JavascriptParser._parse(
		source,
		/** @type {import("../../../../lib/javascript/JavascriptParser").InternalParseOptions} */ ({
			sourceType,
			ecmaVersion: "latest",
			comments: true,
			ranges: true,
			semicolons: true,
			allowHashBang: true
		})
	);

export default {
	name: "unit/javascript/JavascriptParser",
	setup() {
		// ~100 KiB of varied syntax (classes, destructuring, async, template
		// literals) — the per-module parse cost webpack pays on every build.
		moduleSource = generateJavaScriptSource(80, true);
		scriptSource = generateJavaScriptSource(80, false);
		autoFallbackSource = `return 1;\n${scriptSource}`;
	},
	teardown() {
		moduleSource = "";
		scriptSource = "";
		autoFallbackSource = "";
		if (sink === -1) console.log(sink);
	},
	benches: [
		{
			name: "parse 100 KiB module",
			fn() {
				sink = acornParse(moduleSource, "module").comments.length;
			}
		},
		{
			name: "parse 100 KiB script",
			fn() {
				sink = acornParse(scriptSource, "script").comments.length;
			}
		},
		{
			name: "parse module without comments or ranges",
			fn() {
				sink = JavascriptParser._parse(moduleSource, {
					sourceType: "module",
					ecmaVersion: "latest",
					comments: false,
					ranges: false,
					semicolons: false,
					allowHashBang: true
				}).comments.length;
			}
		},
		{
			name: "parse auto script fallback",
			fn() {
				sink = JavascriptParser._parse(autoFallbackSource, {
					sourceType: "auto",
					ecmaVersion: "latest",
					comments: true,
					ranges: true,
					semicolons: true,
					allowHashBang: true
				}).comments.length;
			}
		},
		{
			name: "full parse and walk 100 KiB module",
			fn() {
				// Full pipeline: acorn parse + scope analysis + hook-driven walk.
				const state = parser.parse(
					moduleSource,
					/** @type {import("../../../../lib/Parser").ParserState} */ (
						/** @type {unknown} */ ({ source: moduleSource })
					)
				);
				sink = /** @type {string} */ (state.source).length;
			}
		},
		{
			name: "full parse and walk 100 KiB script",
			fn() {
				const state = scriptParser.parse(
					scriptSource,
					/** @type {import("../../../../lib/Parser").ParserState} */ (
						/** @type {unknown} */ ({ source: scriptSource })
					)
				);
				sink = /** @type {string} */ (state.source).length;
			}
		}
	]
};
