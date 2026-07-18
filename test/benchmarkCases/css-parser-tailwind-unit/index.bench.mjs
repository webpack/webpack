import fs from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);

/** @type {typeof import("../../../lib/css/syntax")} */
const cssSyntax = require("../../../lib/css/syntax.js");
const {
	SourceProcessor,
	NodeType,
	tokenize,
	parseAStylesheet,
	parseAStylesheetsContents,
	parseABlocksContents,
	parseARule,
	parseADeclaration,
	parseAComponentValue,
	parseAListOfComponentValues,
	parseACommaSeparatedListOfComponentValues
} = cssSyntax;

// Real-world ~1.9 MiB stylesheet (Tailwind, minified) — the whole-stylesheet
// fixture, shared with the `css/large` configCase.
const css = fs.readFileSync(
	fileURLToPath(
		new URL("../../configCases/css/large/tailwind.min.css", import.meta.url)
	),
	"utf8"
);

// Representative fragments for the granular grammar entry points.
const RULE =
	'.card > .title:hover, #main .item[data-x="1"] { color: rgb(10, 20, 30); margin: 1px 2em 3% 0; background: url(a/b.png) no-repeat }';
const DECLARATION =
	"background: linear-gradient(to right, rgba(0, 0, 0, .5) 0%, #fff 100%) no-repeat";
const COMPONENT_VALUE = "calc((100% - 2rem) / 3 + 1px)";
const VALUE_LIST = "1px solid rgba(0, 0, 0, 0.15)";
const COMMA_LIST = '"Helvetica Neue", Arial, system-ui, sans-serif';
const BLOCK_CONTENTS = "color: red; font: 12px/1.4 sans-serif; & .nested { x: 1 } --v: 2";

const NOOP = () => {};

/**
 * @param {import("tinybench").Bench} bench bench
 * @returns {void}
 */
export default (bench) => {
	// Whole-stylesheet parse — the main entry (CSS analog of JavascriptParser.parse).
	bench.add('unit benchmark "css-parser-tailwind-unit", parseAStylesheet', () => {
		parseAStylesheet(css);
	});
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseAStylesheetsContents',
		() => {
			parseAStylesheetsContents(css);
		}
	);

	// Grammar: streaming parse + visitor walk (SourceProcessor).
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", process (no visitors)',
		() => {
			new SourceProcessor().use({}).process(css);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", process (Decl+Url visitors)',
		() => {
			new SourceProcessor()
				.use({ [NodeType.Declaration]: NOOP, [NodeType.Url]: NOOP })
				.process(css);
		}
	);

	// Tokenizer throughput (push interface over the readToken pull primitive).
	bench.add('unit benchmark "css-parser-tailwind-unit", tokenize', () => {
		tokenize(css, 0, { token: NOOP });
	});

	// Granular grammar entry points on representative fragments.
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseABlocksContents',
		() => {
			parseABlocksContents(BLOCK_CONTENTS, 0);
		}
	);
	bench.add('unit benchmark "css-parser-tailwind-unit", parseARule', () => {
		parseARule(RULE);
	});
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseADeclaration',
		() => {
			parseADeclaration(DECLARATION);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseAComponentValue',
		() => {
			parseAComponentValue(COMPONENT_VALUE);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseAListOfComponentValues',
		() => {
			parseAListOfComponentValues(VALUE_LIST);
		}
	);
	bench.add(
		'unit benchmark "css-parser-tailwind-unit", parseACommaSeparatedListOfComponentValues',
		() => {
			parseACommaSeparatedListOfComponentValues(COMMA_LIST);
		}
	);
};
