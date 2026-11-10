"use strict";

const { SourceProcessor, parser } = require("../../../lib/css/syntax");
const {
	buildSkipSet,
	parseABlocksContents,
	parseACommaSeparatedListOfComponentValues,
	parseAComponentValue,
	parseADeclaration,
	parseAListOfComponentValues,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents
} = require("../../../lib/css/syntax-parser");
const {
	declaresPrint,
	enumValue,
	fixtures,
	printOptions,
	readPrint,
	readRun,
	snapshotText,
	treeLines,
	unexplained,
	walkLine
} = require("../../helpers/fixture");
const {
	serializeComponentValue,
	serializeComponentValues,
	serializeDeclaration,
	serializeRules,
	serializeStylesheet
} = require("../../helpers/serializeCssTree");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const { purityRelation } = require("../../helpers/syntaxInvariants/relations");
const syntax = require("../../helpers/syntaxInvariants/css");

/** @typedef {import("../../../lib/css/syntax-parser").MutableToken} MutableToken */
/** @typedef {import("../../../lib/css/syntax-parser").CssParseOptions} CssParseOptions */
/** @typedef {import("../../helpers/fixture").ParseEntry} ParseEntry */
/** @typedef {import("../../helpers/fixture").Printers} Printers */

/**
 * @param {string} kind the token kind, or the severity of a parse error
 * @param {number[]} ranges offset pairs
 * @param {string=} suffix what follows the ranges
 * @returns {string} the token as the token line holds it
 */
const tokenText = (kind, ranges, suffix = "") => {
	/** @type {string[]} */
	const pairs = [];
	for (let i = 0; i < ranges.length; i += 2) {
		pairs.push(`${ranges[i]},${ranges[i + 1]}`);
	}
	return `${kind}[${pairs.join("|")}]${suffix}`;
};

/** @type {Map<number, string>} */
const KIND_TEXT = new Map(
	Object.entries(parser.TokenType).map(([name, type]) => [
		type,
		name.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase()
	])
);

/**
 * Every token the public CSS tokenizer (`readToken`) reads from the start, as
 * one line: each token's kind and offset ranges, then where reading stopped.
 * A url adds its content's range, a dimension its unit's and an id hash `#`.
 * @param {string} source a stylesheet
 * @returns {string} the token line
 */
const tokenLine = (source) => {
	/** @type {string[]} */
	const out = [];
	const token = /** @type {MutableToken} */ ({});
	let pos = 0;
	for (;;) {
		const read = parser.readToken(source, pos, token);
		if (read === undefined) break;
		/** @type {number[]} */
		const ranges = [read.start, read.end];
		if (read.type === parser.TokenType.Url) {
			ranges.push(read.contentStart, read.contentEnd);
		} else if (read.type === parser.TokenType.Dimension) {
			ranges.push(read.unitStart, read.end);
		}
		out.push(
			tokenText(
				/** @type {string} */ (KIND_TEXT.get(read.type)),
				ranges,
				read.type === parser.TokenType.Hash && read.isId ? "#" : ""
			)
		);
		pos = read.end;
	}
	out.push(`end=${pos}`);
	return out.join(" ");
};

/**
 * Process or parse options with `skip.types` written as `NodeType` names, as
 * the skip set `buildSkipSet` builds from them.
 * @param {Record<string, EXPECTED_ANY>} options the run's options
 * @returns {Record<string, EXPECTED_ANY>} them with the set in place
 */
const skipOptions = (options) => {
	const { skip } = options;
	if (skip === undefined || skip.types === undefined) return options;
	const types = /** @type {string[]} */ (skip.types).map((name) =>
		enumValue(parser.NodeType, name, "NodeType")
	);
	return { ...options, skip: { ...skip, types: buildSkipSet(types) } };
};

/**
 * @template T
 * @typedef {object} CssEntryParts
 * @property {(source: string, pos: number, options: CssParseOptions) => T} parse the call
 * @property {(result: T, source: string) => unknown} serialize its result in css-parsing-tests' JSON form
 * @property {(result: T) => number[]} roots the nodes it returned, which `fields` reads from
 */

/**
 * A `parseA*` entry point's read: its result in css-parsing-tests' JSON form,
 * then its parse errors; under `visit`, each comment token it reads is logged,
 * and under `fields`, each node it returned, before the JSON form reads again.
 * @template T
 * @param {CssEntryParts<T>} parts how to call it and read what it returns
 * @returns {ParseEntry} the entry
 */
const parseEntry = ({ parse, serialize, roots }) => ({
	records: true,
	positions: true,
	trees: true,
	read: (source, options, log, { pos, fields }) => {
		/** @type {string[]} */
		const errors = [];
		/** @type {CssParseOptions} */
		const given = {
			...skipOptions(options),
			parseError: (input, code, start, end, severity) => {
				errors.push(tokenText(severity, [start, end], `:${code}`));
			}
		};
		if (log !== undefined) {
			given.comment = (input, start, end) => {
				log.push(tokenText("comment", [start, end]));
				return end;
			};
		}
		const result = parse(source, pos, given);
		const tree =
			fields === undefined || result === undefined
				? undefined
				: treeLines(parser, roots(result), fields);
		const values = [
			result === undefined
				? "undefined"
				: JSON.stringify(serialize(result, source)),
			errors.join(" ")
		];
		if (fields !== undefined) values.push(tree === undefined ? "" : tree);
		return values;
	}
});

/**
 * @param {number} node a node
 * @returns {number[]} it, as the one root
 */
const asRoot = (node) => [node];
/**
 * @param {number[]} nodes nodes
 * @returns {number[]} them
 */
const asRoots = (nodes) => nodes;

/**
 * The public entry points a fixture's `parse.json` may name, the document
 * parse first; `SourceProcessor` logs the visitors its walk fires.
 * @type {Record<string, ParseEntry>}
 */
const ENTRIES = {
	parseAStylesheet: parseEntry({
		parse: (source, pos, options) => parseAStylesheet(source, pos, options),
		serialize: serializeStylesheet,
		roots: asRoot
	}),
	parseAStylesheetsContents: parseEntry({
		parse: (source, pos, options) =>
			parseAStylesheetsContents(source, pos, options),
		serialize: serializeRules,
		roots: asRoots
	}),
	parseABlocksContents: parseEntry({
		parse: (source, pos, options) =>
			parseABlocksContents(source, pos, options),
		serialize: ({ decls, rules }, source) => {
			// Declarations first: reading the rules parses their blocks again.
			const declarations = decls.map(serializeDeclaration);
			return { decls: declarations, rules: serializeRules(rules, source) };
		},
		roots: ({ decls, rules }) => [...decls, ...rules]
	}),
	parseARule: parseEntry({
		parse: (source, pos, options) => parseARule(source, pos, options),
		serialize: (rule, source) =>
			rule === undefined ? undefined : serializeRules([rule], source)[0],
		roots: (rule) => (rule === undefined ? [] : [rule])
	}),
	parseADeclaration: parseEntry({
		parse: (source, pos, options) => parseADeclaration(source, pos, options),
		serialize: (declaration) =>
			declaration === undefined ? undefined : serializeDeclaration(declaration),
		roots: (declaration) => (declaration === undefined ? [] : [declaration])
	}),
	parseAComponentValue: parseEntry({
		parse: (source, pos, options) => parseAComponentValue(source, pos, options),
		serialize: (value) =>
			value === undefined ? undefined : serializeComponentValue(value),
		roots: (value) => (value === undefined ? [] : [value])
	}),
	parseAListOfComponentValues: parseEntry({
		parse: (source, pos, options) =>
			parseAListOfComponentValues(source, pos, options),
		serialize: serializeComponentValues,
		roots: asRoots
	}),
	parseACommaSeparatedListOfComponentValues: parseEntry({
		parse: (source, pos, options) =>
			parseACommaSeparatedListOfComponentValues(source, pos, options),
		serialize: (groups) => groups.map(serializeComponentValues),
		roots: (groups) => {
			/** @type {number[]} */
			const roots = [];
			for (const group of groups) roots.push(...group);
			return roots;
		}
	}),
	SourceProcessor: {
		walks: true,
		read: (source, options, log, { visit }) => [
			walkLine(SourceProcessor, parser, source, skipOptions(options), visit)
		]
	}
};

/**
 * The printers a print set's `print` may name.
 * @type {Printers}
 */
const PRINTERS = {
	Processor: SourceProcessor,
	enums: parser,
	minimizer: "cssMinify",
	load: () => require("../../../lib/css/cssMinify"),
	asset: "index.css"
};

// Every input the CSS tests read is a fixture, and each one is read, printed and
// held to the parser's and printer's own relations; a new fixture needs no code.
describe("CSS syntax — invariants", () => {
	const all = fixtures("css");
	for (const { name, dir, source, options, parses, expected } of all) {
		describe(name, () => {
			it("tokenizes", () => {
				expect(tokenLine(source)).toMatchSnapshot();
			});

			it("parses", () => {
				/** @type {string[]} */
				const errors = [];
				const stylesheet = parseAStylesheet(source, 0, {
					parseError: (input, code, start, end, severity) => {
						errors.push(tokenText(severity, [start, end], `:${code}`));
					}
				});
				expect(
					JSON.stringify(serializeStylesheet(stylesheet, source))
				).toMatchSnapshot();
				// The second entry, so the tree's stays as it was.
				expect(errors.join(" ")).toMatchSnapshot();
			});

			it.each(options.map((one) => [JSON.stringify(one), one]))(
				"prints %s",
				async (_title, one) => {
					if (declaresPrint(one)) {
						for (const value of await readPrint(PRINTERS, dir, source, one)) {
							expect(value).toMatchSnapshot();
						}
						return;
					}
					const { options: given, log } = printOptions(one);
					expect(
						snapshotText(
							/** @type {{ code: string }} */ (
								new SourceProcessor().process(source, given)
							).code
						)
					).toMatchSnapshot();
					if (log !== undefined) expect(log.join(" ")).toMatchSnapshot();
				}
			);

			for (const run of parses) {
				it(`parses ${JSON.stringify(run)}`, () => {
					for (const value of readRun(ENTRIES, source, run)) {
						expect(value).toMatchSnapshot();
					}
				});
			}

			it("holds its invariants", () => {
				expect(
					unexplained(invariantFindings(syntax, [[name, source]]), expected)
				).toEqual([]);
			});
		});
	}

	// Every fixture is read once before any is read again, so state one parse
	// leaves behind shows as a different answer for the next.
	it("reads each fixture alike between all the others", () => {
		const { reports } = purityRelation(
			all.map(({ name, source }) => ({
				what: name,
				digest: () => syntax.digest(source)
			}))
		);
		expect(reports.map((report) => report.repro)).toEqual([]);
	});
});
