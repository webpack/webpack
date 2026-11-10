"use strict";

const { SourceProcessor, parser } = require("../../../lib/javascript/syntax");
const {
	answerOf,
	declaresPrint,
	fixtures,
	printOptions,
	readPrint,
	readRun,
	snapshotText,
	treeLines,
	unexplained,
	walkLine
} = require("../../helpers/fixture");
const { parse, plain } = require("../../helpers/javascriptParse");
const { invariantFindings } = require("../../helpers/syntaxInvariants");
const { purityRelation } = require("../../helpers/syntaxInvariants/relations");
const syntax = require("../../helpers/syntaxInvariants/javascript");
const { behaviorDifference } = require("../../../tooling/compare-js-tools");

/** @typedef {import("../../helpers/syntaxInvariants/relations").Report} Report */
/** @typedef {import("../../helpers/fixture").ParseEntry} ParseEntry */
/** @typedef {import("../../helpers/fixture").Printers} Printers */
/** @typedef {import("../../../lib/javascript/syntax-parser").ParserOptions} ParserOptions */

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
 * @param {Partial<ParserOptions>} options what it is read as, over the latest grammar with a hashbang allowed
 * @returns {string} the token line
 */
const tokenLine = (source, options) => {
	/** @type {string[]} */
	const out = [];
	const tokenizer = parser.Parser.tokenizer(source, {
		ecmaVersion: "latest",
		allowHashBang: true,
		...options,
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

/**
 * @param {Partial<ParserOptions>} options the run's options
 * @param {string[] | undefined} log where `visit` writes each comment and token read
 * @returns {Partial<ParserOptions>} them, with recorders for both where there is a log
 */
const recording = (options, log) =>
	log === undefined
		? options
		: {
				...options,
				onComment: (block, text, start, end) => {
					log.push(`${block ? "block" : "line"}[${start},${end}]`);
				},
				onToken: (token) => {
					log.push(`${token.type.label}[${token.start},${token.end}]`);
				}
			};

/**
 * The public entry points a fixture's `parse.json` may name, the document
 * parse first; `SourceProcessor` logs the visitors its walk fires.
 * @type {Record<string, ParseEntry>}
 */
const ENTRIES = {
	// Over a build's options, as `javascriptParse.js` gives them.
	parse: {
		records: true,
		read: (source, options, log) => [
			answerOf(() =>
				treeText(
					plain(
						parse(
							source,
							recording(
								log === undefined ? options : { ...options, comments: false },
								log
							)
						).ast
					)
				)
			)
		]
	},
	// `fields` reads the program's node, from a second parse without `estree`.
	parseProgram: {
		positions: true,
		trees: true,
		read: (source, options, log, { pos, fields }) => {
			/** @type {string[]} */
			const errors = [];
			const tree = answerOf(() => {
				const program = parser.parseProgram(source, pos, {
					...options,
					estree: true,
					parseError: (input, code, start, end, severity) => {
						errors.push(`${severity}[${start},${end}]:${code}`);
					}
				});
				return program === undefined
					? "undefined"
					: treeText(plain(program));
			});
			const values = [tree, errors.join(" ")];
			if (fields !== undefined) {
				values.push(
					answerOf(() => {
						const program = parser.parseProgram(source, pos, options);
						return program === undefined
							? "undefined"
							: treeLines(parser, [/** @type {number} */ (program)], fields);
					})
				);
			}
			return values;
		}
	},
	parseExpressionAt: {
		records: true,
		positions: true,
		read: (source, options, log, { pos }) => [
			answerOf(() =>
				treeText(
					plain(
						parser.Parser.parseExpressionAt(
							source,
							pos,
							recording({ ecmaVersion: "latest", ...options }, log)
						)
					)
				)
			)
		]
	},
	tokenizer: { read: (source, options) => [tokenLine(source, options)] },
	SourceProcessor: {
		walks: true,
		read: (source, options, log, { visit }) => [
			walkLine(SourceProcessor, parser, source, options, visit)
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
	minimizer: "jsMinify",
	load: () => require("../../../lib/javascript/jsMinify"),
	asset: "index.js"
};

// Every input the JavaScript tests read is a fixture, and each one is read,
// printed and held to the parser's and printer's own relations; a new fixture
// needs no code.
describe("JavaScript syntax — invariants", () => {
	const all = fixtures("javascript");
	for (const { name, dir, source, options, behavior, parses, expected } of all) {
		describe(name, () => {
			it("tokenizes", () => {
				expect(
					tokenLine(source, { sourceType: sourceTypeOf(source) })
				).toMatchSnapshot();
			});

			it("parses", () => {
				const sourceType = sourceTypeOf(source);
				const tree = answerOf(() =>
					treeText(plain(parse(source, { sourceType }).ast))
				);
				expect(tree).toMatchSnapshot();
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
				if (sourceType === "module") {
					// Read as a script too, as most tests read one: a third entry,
					// which says so alone where only `sourceType` differs.
					const script = answerOf(() => {
						const ast = /** @type {Record<string, unknown>} */ (
							plain(parse(source, { sourceType: "script" }).ast)
						);
						return treeText({ ...ast, sourceType: "module" }) === tree
							? "as the module"
							: treeText(ast);
					});
					expect(script).toMatchSnapshot();
				}
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
							answerOf(
								() =>
									/** @type {{ code: string }} */ (
										new SourceProcessor().process(source, given)
									).code
							)
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

			// Opt-in, as running costs a fresh context per run.
			if (behavior.length > 0) {
				it.each(behavior.map((one) => [JSON.stringify(one), one]))(
				"runs as its source when printed %s",
				(title, one) => {
					const { code } = /** @type {{ code: string }} */ (
						new SourceProcessor().process(source, printOptions(one).options)
					);
					let reports = behaviorDifference(source, code);
					// A run times out under a loaded machine too, so one that did
					// runs again before it counts.
					for (
						let attempt = 0;
						attempt < 2 &&
						(reports === null ||
							reports.some((report) => report.what === "times out"));
						attempt++
					) {
						reports = behaviorDifference(source, code);
					}
					// A marked fixture that is never run would hold nothing.
					expect(reports).not.toBeNull();
					expect(
						unexplained(
							/** @type {Report[]} */ (reports).map((report) => ({
								preset: title,
								report
							})),
							expected.filter((entry) => entry.relation === "behavior")
						)
					).toEqual([]);
				}
			);

			}

			it("holds its invariants", () => {
				expect(
					unexplained(
						invariantFindings(syntax, [[name, source]]),
						expected.filter((entry) => entry.relation !== "behavior")
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
				digest: () => syntax.digest(source)
			}))
		);
		expect(reports.map((report) => report.repro)).toEqual([]);
	});
});
