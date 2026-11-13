"use strict";

const { SourceProcessor, parser } = require("../../../lib/html/syntax");
const { A, parseHtml } = require("../../../lib/html/syntax-parser");
const {
	declaresPrint,
	fixtures,
	printOptions,
	readPrint,
	readRun,
	snapshotOf,
	snapshotText,
	treeLines,
	unexplained,
	unlessOverflow,
	walkLine
} = require("../../helpers/fixture");
const { materialize } = require("../../helpers/materializeHtmlTree");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const { purityRelation } = require("../../helpers/syntaxInvariants/relations");
const syntax = require("../../helpers/syntaxInvariants/xml");

/** @typedef {import("../../../lib/html/syntax-parser").ParseErrorSeverity} ParseErrorSeverity */
/** @typedef {import("../../helpers/fixture").ParseEntry} ParseEntry */
/** @typedef {import("../../helpers/fixture").Printers} Printers */

/**
 * @param {string} kind the token kind, or the severity of a parse error
 * @param {number[]} ranges offset pairs, `-1` where a part is absent
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

/** @type {Record<number, string>} */
const QUOTE_TEXT = {
	[parser.Quote.None]: "",
	[parser.Quote.Double]: '"',
	[parser.Quote.Single]: "'"
};

/**
 * Every callback the public XML tokenizer makes, in call order, as one line:
 * each token's kind and offset ranges, then the offset it returns. With `log`,
 * each call also writes the text it was handed, read off its own `input`.
 * @param {string} source a document
 * @param {number=} pos where it starts reading
 * @param {string[]=} log receives each call's kind and text
 * @returns {string} the token line
 */
const tokenLine = (source, pos = 0, log = undefined) => {
	/** @type {string[]} */
	const out = [];
	/**
	 * @param {string} kind the callback
	 * @param {string} input the text it was handed
	 * @param {number} start where its token starts
	 * @param {number} end where it ends
	 * @returns {void}
	 */
	const record = (kind, input, start, end) => {
		if (log !== undefined) {
			log.push(`${kind} ${JSON.stringify(input.slice(start, end))}`);
		}
	};
	const end = parser.tokenizeXml(source, pos, {
		text: (input, start, end) => {
			out.push(tokenText("text", [start, end]));
			record("text", input, start, end);
			return end;
		},
		comment: (input, start, end, dataStart, dataEnd) => {
			out.push(tokenText("comment", [start, end, dataStart, dataEnd]));
			record("comment", input, dataStart, dataEnd);
			return end;
		},
		openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
			out.push(
				tokenText("open", [start, end, nameStart, nameEnd], selfClosing ? "/" : "")
			);
			record("open", input, nameStart, nameEnd);
			return end;
		},
		closeTag: (input, start, end, nameStart, nameEnd) => {
			out.push(tokenText("close", [start, end, nameStart, nameEnd]));
			record("close", input, nameStart, nameEnd);
			return end;
		},
		attribute: (input, nameStart, nameEnd, valueStart, valueEnd, quote) => {
			out.push(
				tokenText(
					"attr",
					[nameStart, nameEnd, valueStart, valueEnd],
					QUOTE_TEXT[quote]
				)
			);
			record("attr", input, nameStart, nameEnd);
			if (valueStart !== -1) record("value", input, valueStart, valueEnd);
			return valueEnd;
		},
		doctype: (
			input,
			start,
			end,
			nameStart,
			nameEnd,
			publicStart,
			publicEnd,
			systemStart,
			systemEnd,
			forceQuirks,
			subsetStart = -1,
			subsetEnd = -1
		) => {
			out.push(
				tokenText(
					"doctype",
					[
						start,
						end,
						nameStart,
						nameEnd,
						publicStart,
						publicEnd,
						systemStart,
						systemEnd,
						subsetStart,
						subsetEnd
					],
					forceQuirks ? "!" : ""
				)
			);
			record("doctype", input, start, end);
			return end;
		},
		parseError: (input, code, start, end, severity) => {
			out.push(tokenText(severity, [start, end], `:${code}`));
			record(code, input, start, end);
		}
	});
	out.push(`end=${end}`);
	return out.join(" ");
};

/**
 * The public entry points a fixture's `parse.json` may name, the document
 * parse first, each reading XML; `SourceProcessor` logs its walk's visitors,
 * and `tokenizeXml` under `visit` the text each of its callbacks is handed.
 * @type {Record<string, ParseEntry>}
 */
const ENTRIES = {
	parseHtml: {
		positions: true,
		trees: true,
		read: (source, options, log, { pos, fields }) => {
			/** @type {string[]} */
			const errors = [];
			const document = parseHtml(source, pos, {
				...options,
				xml: true,
				parseError: (input, code, start, end, severity) => {
					errors.push(tokenText(severity, [start, end], `:${code}`));
				}
			});
			const values = [
				JSON.stringify(A.children(document).map(materialize)),
				errors.join(" ")
			];
			if (fields !== undefined) {
				values.push(treeLines(parser, [document], fields));
			}
			return values;
		}
	},
	tokenizeXml: {
		records: true,
		positions: true,
		read: (source, options, log, { pos }) => [tokenLine(source, pos, log)]
	},
	SourceProcessor: {
		walks: true,
		read: (source, options, log, { visit }) => [
			walkLine(
				SourceProcessor,
				parser,
				source,
				{ ...options, xml: true },
				visit
			)
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
	minimizer: "xmlMinify",
	load: () => require("../../../lib/html/xmlMinify"),
	asset: "index.xml"
};

// Every input the XML tests read is a fixture, and each one is read, printed
// and held to the parser's and printer's own relations; a new fixture needs no
// code.
describe("XML syntax — invariants", () => {
	const all = fixtures("xml");
	for (const { name, dir, source, options, parses, expected } of all) {
		describe(name, () => {
			it("tokenizes", () => {
				expect(snapshotOf(source, tokenLine(source))).toMatchSnapshot();
			});

			it("parses", () => {
				/** @type {string[]} */
				const errors = [];
				const document = parseHtml(source, 0, {
					xml: true,
					parseError: (input, code, start, end, severity) => {
						errors.push(tokenText(severity, [start, end], `:${code}`));
					}
				});
				expect(
					snapshotOf(
						source,
						JSON.stringify(A.children(document).map(materialize))
					)
				).toMatchSnapshot();
				// The second entry, so the tree's stays as it was.
				expect(snapshotOf(source, errors.join(" "))).toMatchSnapshot();
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
					const { code } = /** @type {{ code: string }} */ (
						new SourceProcessor().process(source, given)
					);
					expect(snapshotOf(source, snapshotText(code))).toMatchSnapshot();
					if (log !== undefined) {
						expect(snapshotOf(source, log.join(" "))).toMatchSnapshot();
					}
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
					unexplained(
						invariantFindings(syntax, [[name, source]]),
						expected,
						source
					)
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
				digest: () => unlessOverflow(() => syntax.digest(source))
			}))
		);
		expect(reports.map((report) => report.repro)).toEqual([]);
	});
});
