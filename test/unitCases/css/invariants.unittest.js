"use strict";

const { SourceProcessor, parser } = require("../../../lib/css/syntax");
const { parseAStylesheet } = require("../../../lib/css/syntax-parser");
const {
	fixtures,
	snapshotText,
	unexplained
} = require("../../helpers/fixture");
const { serializeStylesheet } = require("../../helpers/serializeCssTree");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const { purityRelation } = require("../../helpers/syntaxInvariants/relations");
const syntax = require("../../helpers/syntaxInvariants/css");

/** @typedef {import("../../../lib/css/syntax-parser").MutableToken} MutableToken */

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

// Every input the CSS tests read is a fixture, and each one is read, printed and
// held to the parser's and printer's own relations; a new fixture needs no code.
describe("CSS syntax — invariants", () => {
	const all = fixtures("css");
	for (const { name, source, options, expected } of all) {
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
