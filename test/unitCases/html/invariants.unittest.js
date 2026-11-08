"use strict";

const { SourceProcessor, parser } = require("../../../lib/html/syntax");
const { parseHtml } = require("../../../lib/html/syntax-parser");
const {
	fixtures,
	snapshotText,
	unexplained
} = require("../../helpers/fixture");
const serializeHtmlTree = require("../../helpers/serializeHtmlTree");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const { purityRelation } = require("../../helpers/syntaxInvariants/relations");
const syntax = require("../../helpers/syntaxInvariants/html");

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
 * Every callback the public HTML tokenizer makes, in call order, as one line:
 * each token's kind and offset ranges, then the offset it returns. Each
 * callback returns the offset the tokenizer would advance to without it.
 * @param {string} source a document
 * @returns {string} the token line
 */
const tokenLine = (source) => {
	/** @type {string[]} */
	const out = [];
	const end = parser.tokenize(source, 0, {
		text: (input, start, end) => {
			out.push(tokenText("text", [start, end]));
			return end;
		},
		comment: (input, start, end, dataStart, dataEnd) => {
			out.push(tokenText("comment", [start, end, dataStart, dataEnd]));
			return end;
		},
		openTag: (input, start, end, nameStart, nameEnd, selfClosing) => {
			out.push(
				tokenText("open", [start, end, nameStart, nameEnd], selfClosing ? "/" : "")
			);
			return end;
		},
		closeTag: (input, start, end, nameStart, nameEnd) => {
			out.push(tokenText("close", [start, end, nameStart, nameEnd]));
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
			if (valueStart === -1) return nameEnd;
			return quote === parser.Quote.None ? valueEnd : valueEnd + 1;
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
			forceQuirks
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
						systemEnd
					],
					forceQuirks ? "!" : ""
				)
			);
			return end;
		},
		parseError: (input, code, start, end, severity) => {
			out.push(tokenText(severity, [start, end], `:${code}`));
		}
	});
	out.push(`end=${end}`);
	return out.join(" ");
};

// Every input the HTML tests read is a fixture, and each one is read, printed
// and held to the parser's and printer's own relations; a new fixture needs no
// code.
describe("HTML syntax — invariants", () => {
	const all = fixtures("html");
	for (const { name, source, options, expected } of all) {
		describe(name, () => {
			it("tokenizes", () => {
				expect(tokenLine(source)).toMatchSnapshot();
			});

			it("parses", () => {
				/** @type {string[]} */
				const errors = [];
				const document = parseHtml(source, 0, {
					parseError: (input, code, start, end, severity) => {
						errors.push(tokenText(severity, [start, end], `:${code}`));
					}
				});
				expect(snapshotText(serializeHtmlTree(document))).toMatchSnapshot();
				// The second entry, so the tree's stays as it was.
				expect(errors.join(" ")).toMatchSnapshot();
			});

			it.each(options.map((one) => [JSON.stringify(one), one]))(
				"prints %s",
				(_title, one) => {
					expect(
						snapshotText(
							/** @type {{ code: string }} */ (
								new SourceProcessor().process(source, one)
							).code
						)
					).toMatchSnapshot();
				}
			);

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
