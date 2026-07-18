// cspell:ignore tailwind minmax rgba calc
import fs from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/css/syntax")} */
const cssSyntax = require("../../../lib/css/syntax.js");

const {
	SourceProcessor,
	NodeType,
	readToken,
	parseAStylesheet,
	parseAStylesheetsContents,
	parseABlocksContents,
	parseARule,
	parseADeclaration,
	parseAComponentValue,
	parseAListOfComponentValues,
	parseACommaSeparatedListOfComponentValues,
	TT_LEFT_CURLY_BRACKET,
	TT_RIGHT_CURLY_BRACKET,
	TT_SEMICOLON
} = cssSyntax;

// Real-world ~1.9 MiB minified stylesheet (Tailwind), shared with the
// `css/large` configCase.
const cssMin = fs.readFileSync(
	fileURLToPath(
		new URL("../../configCases/css/large/tailwind.min.css", import.meta.url)
	),
	"utf8"
);

// Whitespace-expanded form of the same stylesheet: re-emit every token with a
// separating space (newline after `{` `}` `;`). Tokenizer-driven so strings and
// url()s stay intact. Same rules, far more whitespace — isolates the cost of
// tokenizing whitespace vs. the minified input.
/**
 * @param {string} css minified css
 * @returns {string} expanded css
 */
function expand(css) {
	const t = {
		type: 0,
		start: 0,
		end: 0,
		isId: false,
		contentStart: 0,
		contentEnd: 0,
		unitStart: 0
	};
	let out = "";
	let pos = 0;
	for (;;) {
		if (readToken(css, pos, t) === undefined) break;
		pos = t.end;
		out += css.slice(t.start, t.end);
		out +=
			t.type === TT_LEFT_CURLY_BRACKET ||
			t.type === TT_RIGHT_CURLY_BRACKET ||
			t.type === TT_SEMICOLON
				? "\n"
				: " ";
	}
	return out;
}
const cssExpanded = expand(cssMin);

// Big single-construct fixtures for the granular grammar entry points — large
// enough (tens of KiB) that a real regression is visible above timer noise.
const BIG_RULE = `.sel > .y:hover {${"a-b: rgba(0, 0, 0, .5) 1px 2em;".repeat(
	3000
)}}`;
const BIG_DECLARATION = `grid-template-columns: ${"minmax(10px, 1fr) ".repeat(
	3000
)}`;
const BIG_COMPONENT_VALUE = `calc(${"1px + ".repeat(8000)}1px)`;
const BIG_VALUE_LIST = "1px solid rgba(0, 0, 0, 0.15) ".repeat(3000);
const BIG_COMMA_LIST = Array.from({ length: 8000 }, (_, i) => `item-${i}`).join(
	", "
);
const BIG_BLOCK_CONTENTS = `${"prop-x: rgba(0, 0, 0, .5) 1px;".repeat(
	3000
)}${".nested { y: 1 }".repeat(200)}`;

const NOOP = () => {};

// Tokenize via the readToken pull primitive — CSS's real tokenizer (one reused
// token, zero per-token allocation).
const TOK = {
	type: 0,
	start: 0,
	end: 0,
	isId: false,
	contentStart: 0,
	contentEnd: 0,
	unitStart: 0
};
/**
 * @param {string} css css source
 * @returns {number} token count (kept so the loop isn't elided)
 */
const tokenizeCss = (css) => {
	let n = 0;
	let pos = 0;
	for (;;) {
		if (readToken(css, pos, TOK) === undefined) return n;
		pos = TOK.end;
		n++;
	}
};

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	// Whole-stylesheet parse — the main entry (CSS analog of JavascriptParser.parse).
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseAStylesheet (min)',
		() => {
			parseAStylesheet(cssMin);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseAStylesheet (expanded)',
		() => {
			parseAStylesheet(cssExpanded);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseAStylesheetsContents (min)',
		() => {
			parseAStylesheetsContents(cssMin);
		}
	);

	// Grammar: streaming parse + visitor walk (SourceProcessor).
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", process (min, no visitors)',
		() => {
			new SourceProcessor().use({}).process(cssMin);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", process (expanded, no visitors)',
		() => {
			new SourceProcessor().use({}).process(cssExpanded);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", process (min, Decl+Url visitors)',
		() => {
			new SourceProcessor()
				.use({ [NodeType.Declaration]: NOOP, [NodeType.Url]: NOOP })
				.process(cssMin);
		}
	);

	// Tokenizer throughput (readToken) — min vs expanded shows the
	// whitespace-tokenizing cost.
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", readToken (min)',
		() => {
			tokenizeCss(cssMin);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", readToken (expanded)',
		() => {
			tokenizeCss(cssExpanded);
		}
	);

	// Granular grammar entry points on big single-construct inputs.
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseARule (big)',
		() => {
			parseARule(BIG_RULE);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseADeclaration (big)',
		() => {
			parseADeclaration(BIG_DECLARATION);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseAComponentValue (big)',
		() => {
			parseAComponentValue(BIG_COMPONENT_VALUE);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseAListOfComponentValues (big)',
		() => {
			parseAListOfComponentValues(BIG_VALUE_LIST);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseACommaSeparatedListOfComponentValues (big)',
		() => {
			parseACommaSeparatedListOfComponentValues(BIG_COMMA_LIST);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseABlocksContents (big)',
		() => {
			parseABlocksContents(BIG_BLOCK_CONTENTS, 0);
		}
	);
};
