"use strict";

// cspell:ignore reminify reminifies ufuzz fnames

// Runs what webpack's JavaScript minifier writes: every terser and swc test that
// says what its input prints is minified, run in terser's own sandbox, and has
// to print the same. Set PHASES to choose the phases webpack installs, e.g.
// `PHASES=mangle,output` for those two only or `PHASES=-parse` for all but one.

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const vm = require("vm");
const acorn = require("acorn");
const { PHASES } = require("../../lib/javascript/syntax").printer;
const { loadPhases, selectPhases } = require("../helpers/printerPhases");
const {
	createKnows,
	readSwcExecTests,
	readSwcTest,
	swcTestsDir
} = require("../helpers/swcMinifierTests");

/** @typedef {import("terser").MinifyOptions} MinifyOptions */
/** @typedef {(code: string, options: MinifyOptions) => Promise<{ code?: string }>} Minify */
/** @typedef {{ runCode: (code: string, prepend?: string) => string | Error, sameStdout: (expected: string | Error, actual: string | Error) => boolean }} Sandbox */
/** @typedef {{ name: string, input: string, prepend: string, expected: string | Error }} RunnableCase */
/** @typedef {{ name: string, input: string, expected: string | Error | true, prepend: string, nodeVersion?: string, reminify: boolean, options: EXPECTED_ANY, mangle: EXPECTED_ANY, format: EXPECTED_OBJECT, parse: EXPECTED_OBJECT }} StdoutCase */

const referenceDir = path.resolve(__dirname, "../external/terser");

const GROUP_TIMEOUT = 300000;

// terser's sandbox runs code with no time limit, so an output that never ends
// would hang the suite rather than fail it.
const RUN_TIMEOUT = 5000;

/**
 * @template T
 * @param {T} value an option value
 * @returns {T} a copy of it, so a minify cannot change what the next one reads
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
 * @param {string} range a case's `node_version`
 * @returns {boolean} whether this Node is in it
 */
const nodeSatisfies = (range) => {
	const match = /^>=\s*(\d+)(?:\.0\.0)?$/.exec(range);
	if (!match) throw new Error(`Unsupported node_version "${range}"`);
	return Number(process.versions.node.split(".")[0]) >= Number(match[1]);
};

/**
 * Every case in one of terser's `test/compress` files that has an
 * `expect_stdout`, read the way terser's runner reads it.
 * @param {string} file the file
 * @param {{ AST: EXPECTED_ANY, parse: EXPECTED_ANY }} reader terser's own modules
 * @returns {StdoutCase[]} its cases
 */
const readStdoutCases = (file, { AST, parse }) => {
	const text = fs.readFileSync(file, "utf8");
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
	/**
	 * @param {EXPECTED_ANY} node a string or an array of strings
	 * @returns {string} the text, array elements joined by lines
	 */
	const readString = (node) => {
		if (node instanceof AST.AST_String) return node.value;
		if (node instanceof AST.AST_Array) {
			return node.elements.map(readString).join("\n");
		}
		throw new Error(`Expected a string or an array of strings in ${file}`);
	};
	/** @type {StdoutCase[]} */
	const cases = [];
	for (const statement of parse(text, { filename: file }).body) {
		if (!(statement instanceof AST.AST_LabeledStatement)) continue;
		/** @type {Record<string, EXPECTED_ANY>} */
		const test = { reminify: true };
		for (const node of statement.body.body) {
			if (node instanceof AST.AST_LabeledStatement) {
				const name = node.label.name;
				const { body } = node;
				if (body instanceof AST.AST_BlockStatement) {
					test[name] = blockBody(body.start.pos);
				} else if (!(body instanceof AST.AST_SimpleStatement)) {
					continue;
				} else if (name === "expect_stdout") {
					const value = body.body;
					if (value instanceof AST.AST_Boolean) {
						test.expect_stdout = value.value;
					} else if (value instanceof AST.AST_Call) {
						test.expect_stdout = new /** @type {ErrorConstructor} */ (
							/** @type {EXPECTED_ANY} */ (globalThis)[value.expression.name]
						)(...value.args.map((/** @type {EXPECTED_ANY} */ arg) => arg.value));
					} else {
						test.expect_stdout = `${readString(value)}\n`;
					}
				} else if (name === "reminify") {
					test.reminify = body.body.value;
				} else if (name === "node_version" || name === "prepend_code") {
					test[name] = readString(body.body);
				} else if (body.body instanceof AST.AST_TemplateString) {
					test[name] = body.body.segments[0].value;
				}
			} else if (
				node instanceof AST.AST_SimpleStatement &&
				node.body instanceof AST.AST_Assign
			) {
				test[node.body.left.name] = readValue(node.body.right.start.pos);
			}
		}
		if (typeof test.input !== "string" || test.expect_stdout === undefined) {
			continue;
		}
		cases.push({
			name: statement.label.name,
			input: test.input,
			expected: test.expect_stdout,
			prepend: test.prepend_code || "",
			nodeVersion: test.node_version,
			reminify: test.reminify,
			options: test.options || {},
			mangle: test.mangle,
			format: test.beautify || test.format,
			parse: test.parse
		});
	}
	return cases;
};

/**
 * The options a case is minified under: its own, then, unless it opts out,
 * each set terser's runner reminifies it with and the set webpack minifies with.
 * @param {StdoutCase} test a case
 * @param {EXPECTED_OBJECT[]} reminifySets terser's `test/ufuzz.json`
 * @returns {[string, MinifyOptions][]} the option sets, by name
 */
const optionSetsFor = (test, reminifySets) => {
	const { options } = test;
	/** @type {[string, MinifyOptions][]} */
	const sets = [
		[
			"its own options",
			{
				compress:
					options.defaults !== undefined
						? copy(options)
						: { defaults: false, ...copy(options) },
				mangle: copy(test.mangle) || false,
				format: copy(test.format),
				parse: copy(test.parse)
			}
		]
	];
	if (!test.reminify) return sets;
	for (const [name, set] of [
		...reminifySets.map((set, index) => [
			`reminify ${index} ${JSON.stringify(set)}`,
			set
		]),
		["the default minimizer's options", { compress: { passes: 2 }, mangle: true }]
	]) {
		sets.push([
			name,
			{
				...copy(set),
				keep_fnames: options.keep_fnames,
				keep_classnames: options.keep_classnames
			}
		]);
	}
	return sets;
};

/**
 * The options one of swc's tests is minified under: its own, and the set
 * webpack minifies with.
 * @param {import("../helpers/swcMinifierTests").Source} source the test
 * @returns {[string, MinifyOptions][]} the option sets, by name
 */
const swcOptionSets = ({ own }) => [
	[
		"its own options",
		{
			compress:
				own && own.compress && own.compress.defaults !== undefined
					? copy(own.compress)
					: { defaults: false, ...copy(own && own.compress) },
			mangle: copy(own && own.mangle) || false
		}
	],
	["the default minimizer's options", { compress: { passes: 2 }, mangle: true }]
];

/**
 * @param {Minify} minify a minifier
 * @param {RunnableCase} test a case
 * @param {MinifyOptions} options the options
 * @param {Sandbox} sandbox terser's sandbox
 * @returns {Promise<{ code?: string, printed: string | Error }>} what it wrote and what that printed, or the error it threw
 */
const runMinified = async (minify, test, options, { runCode }) => {
	let code;
	try {
		code = (await minify(test.input, copy(options))).code;
	} catch (err) {
		return { printed: /** @type {Error} */ (err) };
	}
	return { code, printed: runCode(/** @type {string} */ (code), test.prepend) };
};

/**
 * Minifies a case under each option set and runs what that writes. An output
 * the case already ran is not run again, as terser's runner skips it, and one
 * that the reference's output fails the same way is terser's to fix.
 * @param {Minify} minify webpack's minifier
 * @param {RunnableCase} test a case whose input prints what it expects
 * @param {[string, MinifyOptions][]} sets the option sets
 * @param {Sandbox} sandbox terser's sandbox
 * @returns {Promise<string[]>} a line per option set whose output printed otherwise
 */
const checkOutputs = async (minify, test, sets, sandbox) => {
	const { sameStdout } = sandbox;
	const { expected } = test;
	/** @type {string[]} */
	const failures = [];
	/** @type {Set<string>} */
	const seen = new Set();
	for (const [setName, options] of sets) {
		const ours = await runMinified(minify, test, options, sandbox);
		if (ours.code !== undefined) {
			if (seen.has(ours.code)) continue;
			seen.add(ours.code);
			let actual = ours.printed;
			// As terser's runner reminifies: a throw of the expected kind passes
			// whatever its message says.
			if (
				setName !== "its own options" &&
				typeof expected !== "string" &&
				typeof actual !== "string" &&
				expected.name === actual.name
			) {
				actual = expected;
			}
			if (sameStdout(expected, actual)) continue;
		}
		const theirs = await runMinified(
			require("terser").minify,
			test,
			options,
			sandbox
		);
		if (
			ours.code === undefined
				? theirs.code === undefined &&
					String(theirs.printed) === String(ours.printed)
				: theirs.code !== undefined && sameStdout(theirs.printed, ours.printed)
		) {
			continue;
		}
		failures.push(
			`${test.name} (${setName})\n\toutput:   ${ours.code}\n\texpected: ${String(expected)}\n\tprinted:  ${String(ours.printed)}\n\tterser:   ${String(theirs.printed)}`
		);
	}
	return failures;
};

/**
 * @param {string} directory a directory
 * @returns {boolean} whether it holds anything
 */
const isPresent = (directory) =>
	fs.existsSync(directory) && fs.readdirSync(directory).length > 0;

describe("JavaScript minifier output settings", () => {
	it("should read PHASES as a list to keep or, prefixed with -, to drop", () => {
		const names = PHASES.map((phase) => phase.name);
		expect(selectPhases(undefined)).toEqual(names);
		expect(selectPhases("")).toEqual(names);
		expect(selectPhases("print, mangle")).toEqual(["mangle", "print"]);
		expect(selectPhases("-parse")).toEqual(
			names.filter((name) => name !== "parse")
		);
		expect(selectPhases("mangle,output,-output")).toEqual(["mangle"]);
		expect(() => selectPhases("mangel")).toThrow(/Unknown phase "mangel"/);
		expect(() => selectPhases("-mangel")).toThrow(/Unknown phase "-mangel"/);
	});

	it("should run only the node_version ranges it can read", () => {
		const major = Number(process.versions.node.split(".")[0]);
		expect(nodeSatisfies(`>=${major}`)).toBe(true);
		expect(nodeSatisfies(`>= ${major}`)).toBe(true);
		expect(nodeSatisfies(`>=${major}.0.0`)).toBe(true);
		expect(nodeSatisfies(`>=${major + 1}`)).toBe(false);
		expect(() => nodeSatisfies(`^${major}`)).toThrow(/Unsupported/);
	});
});

describe("JavaScript minifier output", () => {
	if (!isPresent(referenceDir)) {
		it("submodule not initialized (run `git submodule update --init --depth 1 test/external/terser`)", () => {
			// No-op: the corpus is an optional git submodule.
		});

		return;
	}

	describe("in terser's sandbox", () => {
		const selected = selectPhases(process.env.PHASES);

		const { runInNewContext } = vm;
		/** @type {{ minify?: Minify, installed?: string[], reader?: { AST: EXPECTED_ANY, parse: EXPECTED_ANY, knows: import("../helpers/swcMinifierTests").Knows }, sandbox?: Sandbox }} */
		const loaded = {};

		beforeAll(async () => {
			const { minify, phases } = await loadPhases(selected);
			loaded.installed = phases;
			loaded.minify = minify;
			// eslint-disable-next-line no-new-func
			const importModule = new Function("specifier", "return import(specifier)");
			/**
			 * @param {string} file a file in the reference checkout
			 * @returns {Promise<EXPECTED_ANY>} the module
			 */
			const at = (file) =>
				importModule(pathToFileURL(path.join(referenceDir, file)).href);
			// Read for its effect: `minify` reaches `transform` on every node class.
			await at("lib/transform.js");
			loaded.reader = {
				AST: await at("lib/ast.js"),
				parse: (await at("lib/parse.js")).parse,
				knows: createKnows((await at("lib/minify.js")).minify_sync)
			};
			// Read for their effect: the reader prints an input as terser's runner does.
			await at("lib/scope.js");
			await at("lib/output.js");
			const sandbox = await at("test/sandbox.js");
			loaded.sandbox = {
				runCode: sandbox.run_code,
				sameStdout: sandbox.same_stdout
			};
			vm.runInNewContext = (code, context, options) =>
				runInNewContext(code, context, { ...options, timeout: RUN_TIMEOUT });
		});

		afterAll(() => {
			vm.runInNewContext = runInNewContext;
		});

		it("should install every phase PHASES selects", () => {
			expect(loaded.installed).toEqual(selected);
		});

		describe("terser compress", () => {
			const reminifySets = JSON.parse(
				fs.readFileSync(path.join(referenceDir, "test/ufuzz.json"), "utf8")
			);
			const files = fs
				.readdirSync(path.join(referenceDir, "test/compress"))
				.filter((file) => file.endsWith(".js"))
				.sort()
				.map((file) => path.join(referenceDir, "test/compress", file));

			it("should read every case that states what it prints", () => {
				const reader = /** @type {NonNullable<typeof loaded.reader>} */ (
					loaded.reader
				);
				let count = 0;
				for (const file of files) count += readStdoutCases(file, reader).length;
				// 1307 at the pinned 5.51.2; a reader that stopped matching reads none.
				expect(count).toBeGreaterThan(1250);
			});

			for (const file of files) {
				it(
					`should print what the input prints: ${path.basename(file)}`,
					async () => {
						const minify = /** @type {Minify} */ (loaded.minify);
						const sandbox = /** @type {Sandbox} */ (loaded.sandbox);
						const reader = /** @type {NonNullable<typeof loaded.reader>} */ (
							loaded.reader
						);
						/** @type {string[]} */
						const failures = [];
						for (const test of readStdoutCases(file, reader)) {
							if (test.nodeVersion && !nodeSatisfies(test.nodeVersion)) continue;
							// Run as terser's runner runs it: parsed and printed by the reference.
							const input = reader
								.parse(test.input, { ...test.parse })
								.print_to_string({ ...test.format });
							const printed = sandbox.runCode(input, test.prepend);
							const expected = test.expected === true ? printed : test.expected;
							if (!sandbox.sameStdout(expected, printed)) {
								failures.push(
									`${test.name}: the input prints ${String(printed)}, not ${String(expected)}`
								);
								continue;
							}
							failures.push(
								...(await checkOutputs(
									minify,
									{ ...test, expected },
									optionSetsFor(test, reminifySets),
									sandbox
								))
							);
						}

						expect(failures).toEqual([]);
					},
					GROUP_TIMEOUT
				);
			}
		});

		describe("swc", () => {
			if (!isPresent(swcTestsDir)) {
				it("submodule not initialized (run `git submodule update --init --depth 1 test/external/swc`)", () => {
					// No-op: the corpus is an optional git submodule.
				});

				return;
			}

			// swc's harness runs the input with node and requires the output to print
			// the same; an input terser's sandbox cannot run, one that throws or prints
			// nothing, holds nothing to compare.
			it(
				"should print what the input prints: exec.rs",
				async () => {
					const minify = /** @type {Minify} */ (loaded.minify);
					const sandbox = /** @type {Sandbox} */ (loaded.sandbox);
					const reader = /** @type {NonNullable<typeof loaded.reader>} */ (
						loaded.reader
					);
					/** @type {string[]} */
					const failures = [];
					let ran = 0;
					for (const source of readSwcExecTests(
						path.join(swcTestsDir, "exec.rs"),
						reader
					)) {
						const expected = sandbox.runCode(source.input);
						if (typeof expected !== "string" || expected === "") continue;
						ran++;
						failures.push(
							...(await checkOutputs(
								minify,
								{ name: source.name, input: source.input, prepend: "", expected },
								swcOptionSets(source),
								sandbox
							))
						);
					}

					expect(failures).toEqual([]);
					// 497 of 502 at the pinned commit.
					expect(ran).toBeGreaterThan(490);
				},
				GROUP_TIMEOUT
			);

			// The fixtures with an `expected.stdout`, but for the port of terser's
			// own tests; one that prints otherwise in terser's sandbox reads what
			// only node gives it, as `process` or a timer.
			it(
				"should print each fixture's expected.stdout",
				async () => {
					const minify = /** @type {Minify} */ (loaded.minify);
					const sandbox = /** @type {Sandbox} */ (loaded.sandbox);
					const reader = /** @type {NonNullable<typeof loaded.reader>} */ (
						loaded.reader
					);
					/** @type {string[]} */
					const inputs = [];
					/**
					 * @param {string} directory a directory
					 * @returns {void}
					 */
					const find = (directory) => {
						for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
							const at = path.join(directory, entry.name);
							if (entry.isDirectory()) {find(at);}
							else if (
								entry.name === "expected.stdout" &&
								fs.existsSync(path.join(directory, "input.js"))
							) {
								inputs.push(path.join(directory, "input.js"));
							}
						}
					};
					find(path.join(swcTestsDir, "fixture"));
					/** @type {string[]} */
					const failures = [];
					let ran = 0;
					for (const file of inputs.sort()) {
						const expected = fs.readFileSync(
							path.join(path.dirname(file), "expected.stdout"),
							"utf8"
						);
						for (const source of readSwcTest(file, reader)) {
							if (source.module) continue;
							if (!sandbox.sameStdout(expected, sandbox.runCode(source.input))) {
								continue;
							}
							ran++;
							failures.push(
								...(await checkOutputs(
									minify,
									{ name: source.name, input: source.input, prepend: "", expected },
									swcOptionSets(source),
									sandbox
								))
							);
						}
					}

					expect(failures).toEqual([]);
					// 135 of 150 at the pinned commit.
					expect(ran).toBeGreaterThan(130);
				},
				GROUP_TIMEOUT
			);
		});
	});
});
