import { createRequire } from "module";
import { generateJavaScriptSource } from "../../helpers/sources.mjs";
import { defineSuite } from "../../lib/index.mjs";

const require = createRequire(import.meta.url);

const JavascriptParser =
	/** @type {typeof import("../../../../lib/javascript/JavascriptParser")} */
	(require("../../../../lib/javascript/JavascriptParser.js"));

/** @type {string} */
let moduleSource = "";
/** @type {string} */
let scriptSource = "";
// webpack reuses parser instances across modules (cached per parser options),
// so hook setup cost is excluded like in real builds.
const parser = new JavascriptParser("auto");

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

export default defineSuite({
	name: "unit/javascript/JavascriptParser",
	setup() {
		// ~100 KiB of varied syntax (classes, destructuring, async, template
		// literals) — the per-module parse cost webpack pays on every build.
		moduleSource = generateJavaScriptSource(80, true);
		scriptSource = generateJavaScriptSource(80, false);
	},
	benches: [
		{
			name: "parse 100 KiB module",
			fn() {
				acornParse(moduleSource, "module");
			}
		},
		{
			name: "parse 100 KiB script",
			fn() {
				acornParse(scriptSource, "script");
			}
		},
		{
			name: "full parse and walk 100 KiB module",
			fn() {
				// Full pipeline: acorn parse + scope analysis + hook-driven walk.
				parser.parse(
					moduleSource,
					/** @type {import("../../../../lib/Parser").ParserState} */ (
						/** @type {unknown} */ ({ source: moduleSource })
					)
				);
			}
		}
	]
});
