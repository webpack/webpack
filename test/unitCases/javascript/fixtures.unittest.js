"use strict";

const { SourceProcessor } = require("../../../lib/javascript/syntax");
const {
	fixtures,
	snapshotText,
	unexplained
} = require("../../helpers/fixture");
const { parse, plain } = require("../../helpers/javascriptParse");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const syntax = require("../../helpers/syntaxInvariants/javascript");

/**
 * A tree as one line: each node's type and range, then its scalar fields and
 * its children by key, so a snapshot shows the shape without ESTree's bulk.
 * @param {unknown} value a plain node, a list of them or a scalar
 * @returns {string} its text
 */
const treeText = (value) => {
	if (Array.isArray(value)) return `[${value.map(treeText).join(",")}]`;
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	const node = /** @type {Record<string, unknown>} */ (value);
	if (typeof node.type !== "string") return JSON.stringify(node);
	/** @type {string[]} */
	const fields = [];
	for (const key of Object.keys(node)) {
		if (["type", "start", "end", "loc", "range"].includes(key)) continue;
		// A regexp's value is null where this Node.js can't build it; `regex` says it.
		if (key === "value" && node.regex !== undefined) continue;
		fields.push(`${key}=${treeText(node[key])}`);
	}
	return `${node.type}[${node.start},${node.end}](${fields.join(" ")})`;
};

/**
 * @param {() => string} read what to run
 * @returns {string} its answer, or the error it throws
 */
const answerOf = (read) => {
	try {
		return read();
	} catch (err) {
		return `throws: ${/** @type {Error} */ (err).message}`;
	}
};

// Every input the JavaScript tests read is a fixture, and each one is read,
// printed and held to the parser's and printer's own relations; a new fixture
// needs no code.
describe("JavaScript syntax — fixtures", () => {
	for (const { name, source, options, expected } of fixtures("javascript")) {
		describe(name, () => {
			it("parses", () => {
				const goal = syntax.goalFor(source);
				expect(
					answerOf(() =>
						treeText(
							plain(
								parse(source, {
									sourceType: goal === null ? "module" : goal.sourceType
								}).ast
							)
						)
					)
				).toMatchSnapshot();
			});

			it.each(options.map((one) => [JSON.stringify(one), one]))(
				"prints %s",
				(_title, one) => {
					expect(
						snapshotText(
							answerOf(
								() =>
									/** @type {{ code: string }} */ (
										new SourceProcessor().process(source, one)
									).code
							)
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
});
