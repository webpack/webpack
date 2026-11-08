"use strict";

const { SourceProcessor, parser } = require("../../../lib/javascript/syntax");
const {
	fixtures,
	snapshotText,
	unexplained
} = require("../../helpers/fixture");
const { parse, plain } = require("../../helpers/javascriptParse");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const { purityRelation } = require("../../helpers/syntaxInvariants/relations");
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

/**
 * @param {unknown} value a token's value
 * @returns {string} it as the token line holds it
 */
const valueText = (value) => {
	if (typeof value === "bigint") return `${value}n`;
	if (value !== null && typeof value === "object") {
		const { pattern, flags } = /** @type {{ pattern: string, flags: string }} */ (
			value
		);
		return `/${pattern}/${flags}`;
	}
	return JSON.stringify(value);
};

/**
 * Every token and comment the public JavaScript tokenizer reads, in order, as
 * one line: each one's type label and range, then its value where that is not
 * the text it spans, and the error that stops it.
 * @param {string} source a script or a module
 * @param {"module" | "script"} sourceType the goal it is read under
 * @returns {string} the token line
 */
const tokenLine = (source, sourceType) => {
	/** @type {string[]} */
	const out = [];
	const tokenizer = parser.Parser.tokenizer(source, {
		ecmaVersion: "latest",
		sourceType,
		allowHashBang: true,
		onComment: (block, text, start, end) => {
			out.push(`${block ? "block" : "line"}[${start},${end}]`);
		}
	});
	try {
		for (;;) {
			const token = tokenizer.getToken();
			const { type, value, start, end } = token;
			out.push(
				`${type.label}[${start},${end}]${
					value === undefined || String(value) === source.slice(start, end)
						? ""
						: `=${valueText(value)}`
				}`
			);
			if (type === parser.tokTypes.eof) break;
		}
	} catch (err) {
		out.push(`throws: ${/** @type {Error} */ (err).message}`);
	}
	return out.join(" ");
};

/**
 * @param {string} source a script or a module
 * @returns {"module" | "script"} the goal a build reads it under, a module where neither works
 */
const sourceTypeOf = (source) => {
	const goal = syntax.goalFor(source);
	return goal === null ? "module" : goal.sourceType;
};

// Every input the JavaScript tests read is a fixture, and each one is read,
// printed and held to the parser's and printer's own relations; a new fixture
// needs no code.
describe("JavaScript syntax — invariants", () => {
	const all = fixtures("javascript");
	for (const { name, source, options, expected } of all) {
		describe(name, () => {
			it("tokenizes", () => {
				expect(tokenLine(source, sourceTypeOf(source))).toMatchSnapshot();
			});

			it("parses", () => {
				const sourceType = sourceTypeOf(source);
				expect(
					answerOf(() => treeText(plain(parse(source, { sourceType }).ast)))
				).toMatchSnapshot();
				/** @type {string[]} */
				const errors = [];
				parser.parseProgram(source, 0, {
					sourceType,
					parseError: (input, code, start, end, severity) => {
						errors.push(`${severity}[${start},${end}]:${code}`);
					}
				});
				// The second entry, so the tree's stays as it was.
				expect(errors.join(" ")).toMatchSnapshot();
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
