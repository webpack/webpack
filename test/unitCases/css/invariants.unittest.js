"use strict";

const { SourceProcessor, parser } = require("../../../lib/css/syntax");
const {
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
	fixtures,
	printOptions,
	readPrint,
	readRun,
	snapshotText,
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
/** @typedef {import("../../helpers/fixture").AsyncPrinter} AsyncPrinter */

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
 * A `parseA*` entry point's read: its result in css-parsing-tests' JSON form,
 * then its parse errors; under `visit`, each comment token it reads is logged.
 * @param {(source: string, options: CssParseOptions) => unknown} read the call, answering its result in that form
 * @returns {ParseEntry} the entry
 */
const parseEntry = (read) => ({
	records: true,
	read: (source, options, log) => {
		/** @type {string[]} */
		const errors = [];
		/** @type {CssParseOptions} */
		const given = {
			...options,
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
		const result = read(source, given);
		return [
			result === undefined ? "undefined" : JSON.stringify(result),
			errors.join(" ")
		];
	}
});

/**
 * The public entry points a fixture's `parse.json` may name, the document
 * parse first; `SourceProcessor` logs the visitors its walk fires.
 * @type {Record<string, ParseEntry>}
 */
const ENTRIES = {
	parseAStylesheet: parseEntry((source, options) =>
		serializeStylesheet(parseAStylesheet(source, 0, options), source)
	),
	parseAStylesheetsContents: parseEntry((source, options) =>
		serializeRules(parseAStylesheetsContents(source, 0, options), source)
	),
	parseABlocksContents: parseEntry((source, options) => {
		const { decls, rules } = parseABlocksContents(source, 0, options);
		// Declarations first: reading the rules parses their blocks again.
		const declarations = decls.map(serializeDeclaration);
		return { decls: declarations, rules: serializeRules(rules, source) };
	}),
	parseARule: parseEntry((source, options) => {
		const rule = parseARule(source, 0, options);
		return rule === undefined ? undefined : serializeRules([rule], source)[0];
	}),
	parseADeclaration: parseEntry((source, options) => {
		const declaration = parseADeclaration(source, 0, options);
		return declaration === undefined
			? undefined
			: serializeDeclaration(declaration);
	}),
	parseAComponentValue: parseEntry((source, options) => {
		const value = parseAComponentValue(source, 0, options);
		return value === undefined ? undefined : serializeComponentValue(value);
	}),
	parseAListOfComponentValues: parseEntry((source, options) =>
		serializeComponentValues(parseAListOfComponentValues(source, 0, options))
	),
	parseACommaSeparatedListOfComponentValues: parseEntry((source, options) =>
		parseACommaSeparatedListOfComponentValues(source, 0, options).map(
			serializeComponentValues
		)
	),
	SourceProcessor: {
		read: (source, options) => [
			walkLine(SourceProcessor, parser.NodeType, source, options)
		]
	}
};


/**
 * The asynchronous printers a print set's `"print"` may name.
 * @type {Record<string, AsyncPrinter>}
 */
const PRINTERS = {
	processAsync: (source, options) =>
		new SourceProcessor().processAsync(source, options),
	cssMinify: (source, options) =>
		require("../../../lib/css/cssMinify")({ "index.css": source }, undefined, options)
};

// Every input the CSS tests read is a fixture, and each one is read, printed and
// held to the parser's and printer's own relations; a new fixture needs no code.
describe("CSS syntax — invariants", () => {
	const all = fixtures("css");
	for (const { name, source, options, parses, expected } of all) {
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
					if (/** @type {{ print?: string }} */ (one).print !== undefined) {
						for (const value of await readPrint(PRINTERS, source, one)) {
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
