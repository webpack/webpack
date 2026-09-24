"use strict";

// Holds webpack's JavaScript printer to terser's own test corpus: every case
// in `test/compress` is minified by terser as published and by the printer,
// and the two outputs must be byte-for-byte the same.

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const acorn = require("acorn");
const { PHASES } = require("../../lib/javascript/syntax").printer;

/** @typedef {import("terser").MinifyOptions} MinifyOptions */
/** @typedef {{ code?: string, error?: string }} Outcome */
/** @typedef {{ name: string, input: string, options: EXPECTED_OBJECT, mangle: EXPECTED_ANY, format: EXPECTED_OBJECT, parse: EXPECTED_OBJECT }} CorpusCase */

const terserDir = path.resolve(__dirname, "../external/terser");
const corpusDir = path.join(terserDir, "test/compress");
const hasCorpus =
	fs.existsSync(corpusDir) && fs.readdirSync(corpusDir).length > 0;

// Each file's cases are minified twice per option set, by both minifiers.
const FILE_TIMEOUT = 120000;

/**
 * A value an option literal holds, copied so neither minifier sees what the
 * other wrote into it; functions and regular expressions are kept as they are.
 * @template T
 * @param {T} value an option value
 * @returns {T} a copy of it
 */
const copy = (value) => {
	if (Array.isArray(value)) {
		return /** @type {T} */ (/** @type {unknown} */ (value.map(copy)));
	}
	if (value && typeof value === "object" && !(value instanceof RegExp)) {
		/** @type {Record<string, unknown>} */
		const result = {};
		for (const [key, inner] of Object.entries(value)) result[key] = copy(inner);
		return /** @type {T} */ (result);
	}
	return value;
};

/**
 * The option sets every case is minified under: the case's own, which is what
 * terser's runner exercises, and the ones webpack's default minimizer passes.
 * @type {[string, (test: CorpusCase) => MinifyOptions][]}
 */
const OPTION_SETS = [
	[
		"its own options",
		(test) => ({
			compress:
				test.options && test.options.defaults !== undefined
					? copy(test.options)
					: { defaults: false, ...copy(test.options) },
			mangle: copy(test.mangle) || false,
			format: copy(test.format),
			parse: copy(test.parse)
		})
	],
	[
		"webpack's default options",
		(test) => ({
			compress: { passes: 2 },
			mangle: true,
			parse: copy(test.parse)
		})
	]
];

/**
 * terser's own modules from the submodule, which the printer never patches.
 * @returns {Promise<{ AST: EXPECTED_ANY, parse: EXPECTED_ANY }>} the modules
 */
const loadCorpusReader = async () => {
	// eslint-disable-next-line no-new-func
	const importModule = new Function("specifier", "return import(specifier)");
	/**
	 * @param {string} file a file in terser's `lib`
	 * @returns {Promise<EXPECTED_ANY>} the module
	 */
	const at = (file) =>
		importModule(pathToFileURL(path.join(terserDir, "lib", file)).href);
	const AST = await at("ast.js");
	const { parse } = await at("parse.js");
	return { AST, parse };
};

/**
 * Every case in one corpus file, as terser's runner reads it: a labeled block
 * holding `input`, and assignments naming the options it runs under.
 * @param {{ AST: EXPECTED_ANY, parse: EXPECTED_ANY }} reader terser's modules
 * @param {string} file the file's name
 * @returns {CorpusCase[]} its cases
 */
const readCases = ({ AST, parse }, file) => {
	const text = fs.readFileSync(path.join(corpusDir, file), "utf8");
	/**
	 * @param {number} position where an option literal starts
	 * @returns {EXPECTED_ANY} its value
	 */
	const readValue = (position) => {
		const expression = acorn.parseExpressionAt(text, position, {
			ecmaVersion: "latest"
		});
		// eslint-disable-next-line no-new-func
		return new Function(
			`return (${text.slice(expression.start, expression.end)});`
		)();
	};
	/**
	 * @param {number} position where a block's `{` is
	 * @returns {string} the source between its braces
	 */
	const blockBody = (position) => {
		let depth = 0;
		for (const token of acorn.tokenizer(text.slice(position), {
			ecmaVersion: "latest"
		})) {
			const label = token.type.label;
			if (label === "{" || label === "${") {
				depth++;
			} else if (label === "}" && --depth === 0) {
				return text.slice(position + 1, position + token.start);
			}
		}
		throw new Error(`Unbalanced block in ${file} at ${position}`);
	};
	/** @type {CorpusCase[]} */
	const cases = [];
	for (const statement of parse(text, { filename: file }).body) {
		if (!(statement instanceof AST.AST_LabeledStatement)) continue;
		/** @type {Record<string, EXPECTED_ANY>} */
		const test = { name: statement.label.name };
		for (const node of statement.body.body) {
			if (node instanceof AST.AST_LabeledStatement) {
				const { body } = node;
				if (body instanceof AST.AST_BlockStatement) {
					test[node.label.name] = blockBody(body.start.pos);
				} else if (
					body instanceof AST.AST_SimpleStatement &&
					body.body instanceof AST.AST_TemplateString
				) {
					test[node.label.name] = body.body.segments[0].value;
				}
			} else if (
				node instanceof AST.AST_SimpleStatement &&
				node.body instanceof AST.AST_Assign
			) {
				test[node.body.left.name] = readValue(node.body.right.start.pos);
			}
		}
		if (typeof test.input !== "string") continue;
		cases.push({
			name: test.name,
			input: test.input,
			options: test.options,
			mangle: test.mangle,
			format: test.beautify || test.format,
			parse: test.parse
		});
	}
	return cases;
};

/**
 * @param {(code: string, options: MinifyOptions) => Promise<{ code?: string }>} minify a minifier
 * @param {string} code the source
 * @param {MinifyOptions} options the options
 * @returns {Promise<Outcome>} what it wrote, or the error it threw
 */
const outcome = async (minify, code, options) => {
	try {
		return { code: (await minify(code, options)).code };
	} catch (err) {
		return { error: String(/** @type {Error} */ (err).message) };
	}
};

describe("terser corpus", () => {
	/** @type {{ reader?: { AST: EXPECTED_ANY, parse: EXPECTED_ANY }, printer?: { minify: (code: string, options: MinifyOptions) => Promise<{ code?: string }>, phases: string[] } }} */
	const loaded = {};

	beforeAll(async () => {
		if (!hasCorpus) return;
		loaded.reader = await loadCorpusReader();
		loaded.printer = await require("../../lib/javascript/syntax").printer.load();
	});

	if (!hasCorpus) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/external/terser`)", () => {
			// No-op: terser's corpus is an optional git submodule.
		});

		return;
	}

	const files = fs
		.readdirSync(corpusDir)
		.filter((file) => file.endsWith(".js"))
		.sort();

	it("should pin the corpus to the terser webpack depends on", () => {
		const pinned = JSON.parse(
			fs.readFileSync(path.join(terserDir, "package.json"), "utf8")
		).version;
		expect(pinned).toBe(require("terser/package.json").version);
	});

	it("should install every phase, so the corpus reaches all of them", () => {
		const { phases } = /** @type {NonNullable<typeof loaded.printer>} */ (
			loaded.printer
		);
		expect(phases).toEqual(PHASES.map((phase) => phase.name));
	});

	it("should read every case the corpus holds", () => {
		const reader = /** @type {NonNullable<typeof loaded.reader>} */ (
			loaded.reader
		);
		let count = 0;
		for (const file of files) count += readCases(reader, file).length;
		// 2602 at the pinned 5.51.2; a reader that stopped matching reads none.
		expect(count).toBeGreaterThan(2500);
	});

	for (const file of files) {
		it(
			`should minify exactly as terser does: ${file}`,
			async () => {
				const reference = require("terser");

				const reader = /** @type {NonNullable<typeof loaded.reader>} */ (
					loaded.reader
				);
				const printer = /** @type {NonNullable<typeof loaded.printer>} */ (
					loaded.printer
				);
				/** @type {string[]} */
				const differences = [];
				for (const test of readCases(reader, file)) {
					for (const [setName, optionsFor] of OPTION_SETS) {
						const theirs = await outcome(
							reference.minify,
							test.input,
							optionsFor(test)
						);
						const ours = await outcome(
							printer.minify,
							test.input,
							optionsFor(test)
						);
						if (theirs.code !== ours.code || theirs.error !== ours.error) {
							differences.push(
								`${test.name} (${setName})\n\tterser:  ${JSON.stringify(theirs)}\n\twebpack: ${JSON.stringify(ours)}`
							);
						}
					}
				}

				expect(differences).toEqual([]);
			},
			FILE_TIMEOUT
		);
	}
});
