"use strict";

// Holds webpack's JavaScript minifier to the minifier it replaces: every source
// of every corpus below is minified by both under the same options, and the two
// must write the same bytes, or refuse the source with the same error.

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const acorn = require("acorn");
const { PHASES } = require("../../lib/javascript/syntax").printer;

/** @typedef {import("terser").MinifyOptions} MinifyOptions */
/** @typedef {(code: string, options: MinifyOptions) => Promise<{ code?: string }>} Minify */
/** @typedef {{ code?: string, error?: string }} Outcome */
/** @typedef {{ name: string, input: string, module?: boolean, own?: { compress: EXPECTED_ANY, mangle: EXPECTED_ANY, format: EXPECTED_OBJECT, parse: EXPECTED_OBJECT } }} Source */
/** @typedef {{ AST: EXPECTED_ANY, parse: EXPECTED_ANY, knows: (group: "compress" | "mangle", key: string) => boolean }} CaseReader */
/** @typedef {{ name: string, files: string[] }} Group */
/** @typedef {{ name: string, submodule: string, directory: string, groups: () => Group[], read: (file: string, reader: CaseReader) => Source[], optionSets: string[], minimum: number, minimumOwn?: number, ownOptionsKnown?: boolean, ownDefaultsNamed?: boolean }} Corpus */

const externalDir = path.resolve(__dirname, "../external");
const referenceDir = path.join(externalDir, "terser");
const swcTestsDir = path.join(
	externalDir,
	"swc/crates/swc_ecma_minifier/tests"
);

// A group minifies each of its sources once per option set, with both minifiers.
const GROUP_TIMEOUT = 300000;

/**
 * An option value, copied so neither minifier sees what the other wrote into
 * it; functions and regular expressions are kept as they are.
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
 * The option sets a source can be minified under, by name. A set returning
 * undefined does not apply to that source.
 * @type {Record<string, (source: Source) => MinifyOptions | undefined>}
 */
const OPTION_SETS = {
	"its own options": ({ own }) =>
		own && {
			compress:
				own.compress && own.compress.defaults !== undefined
					? copy(own.compress)
					: { defaults: false, ...copy(own.compress) },
			mangle: copy(own.mangle) || false,
			format: copy(own.format),
			parse: copy(own.parse)
		},
	"the default minimizer's options": ({ own, module }) => ({
		compress: { passes: 2 },
		mangle: true,
		module,
		...(own && { parse: copy(own.parse) })
	}),
	"printing alone": ({ own, module }) => ({
		compress: false,
		mangle: false,
		module,
		...(own && { parse: copy(own.parse) })
	}),
	"a module mangled at its top level": ({ own }) => ({
		compress: { passes: 2 },
		mangle: { toplevel: true },
		module: true,
		...(own && { parse: copy(own.parse) })
	})
};

/**
 * @param {string} directory a directory
 * @returns {string[]} every `.js` file under it, sorted
 */
const listFiles = (directory) =>
	fs
		.readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) =>
			entry.isDirectory()
				? listFiles(path.join(directory, entry.name))
				: entry.name.endsWith(".js")
					? [path.join(directory, entry.name)]
					: []
		)
		.sort();

/**
 * Every case in one of terser's `test/compress` files, as its runner reads it:
 * a labeled block holding `input`, and assignments naming the options.
 * @param {string} file the file
 * @param {CaseReader} reader terser's own modules, unpatched
 * @returns {Source[]} its cases
 */
const readCompressCases = (file, { AST, parse }) => {
	const text = fs.readFileSync(file, "utf8");
	const name = path.basename(file);
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
		throw new Error(`Unbalanced block in ${name} at ${position}`);
	};
	/** @type {Source[]} */
	const cases = [];
	for (const statement of parse(text, { filename: name }).body) {
		if (!(statement instanceof AST.AST_LabeledStatement)) continue;
		/** @type {Record<string, EXPECTED_ANY>} */
		const test = {};
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
			name: statement.label.name,
			input: test.input,
			own: {
				compress: test.options,
				mangle: test.mangle,
				format: test.beautify || test.format,
				parse: test.parse
			}
		});
	}
	return cases;
};

/**
 * @param {string} file a file
 * @returns {Source[]} the file as one source
 */
const readWholeFile = (file) => [
	{ name: path.basename(file), input: fs.readFileSync(file, "utf8") }
];

/**
 * @param {string} file a test262 test
 * @returns {Source[]} the test as one source, a module where its flags say so
 */
const readTest262File = (file) => {
	const input = fs.readFileSync(file, "utf8");
	return [
		{
			name: path.basename(file),
			input,
			module: /flags:.*\bmodule\b/.test(input)
		}
	];
};

/**
 * An options object with only the keys terser reads: swc's tests name a few of
 * their own, and terser refuses a whole object over one it does not know, which
 * would leave none of the test's other options run.
 * @param {EXPECTED_ANY} options as the test names them
 * @param {"compress" | "mangle"} group which of terser's options they are
 * @param {CaseReader["knows"]} knows whether terser reads a key
 * @returns {EXPECTED_ANY} those it reads
 */
const knownTo = (options, group, knows) =>
	options && typeof options === "object"
		? Object.fromEntries(
				Object.entries(options).filter(([key]) => knows(group, key))
			)
		: options;

/**
 * One of swc's minifier tests, as swc's own harness reads it: the compress
 * options of the nearest `config.json` up the tree, and a `mangle.json` beside
 * the input. A source that parses only as a module is read as one.
 * @param {string} file the input
 * @param {CaseReader} reader terser's own modules, unpatched
 * @returns {Source[]} the test as one source
 */
const readSwcTest = (file, { knows }) => {
	if (!knows) {
		throw new Error(
			"swc's tests are read with terser's own options, from test/external/terser, which is not checked out"
		);
	}
	const input = fs.readFileSync(file, "utf8");
	/**
	 * @param {string} at a file
	 * @returns {EXPECTED_ANY} its JSON, or undefined where there is none
	 */
	const readJson = (at) =>
		fs.existsSync(at) ? JSON.parse(fs.readFileSync(at, "utf8")) : undefined;
	let dir = path.dirname(file);
	while (dir.startsWith(swcTestsDir) && !fs.existsSync(path.join(dir, "config.json"))) {
		dir = path.dirname(dir);
	}
	// swc reads a config that leaves `defaults` unnamed as naming it true, where
	// terser's own tests leave it off; read as terser's, most passes never run.
	const compress = dir.startsWith(swcTestsDir)
		? { defaults: true, ...readJson(path.join(dir, "config.json")) }
		: undefined;
	let module = false;
	try {
		acorn.parse(input, { ecmaVersion: "latest", sourceType: "script" });
	} catch (_err) {
		try {
			acorn.parse(input, { ecmaVersion: "latest", sourceType: "module" });
			module = true;
		} catch (_err2) {
			// Neither: both minifiers are held to refusing it alike.
		}
	}
	return [
		{
			name: path.relative(swcTestsDir, file),
			input,
			module,
			own: compress && {
				compress: knownTo(compress, "compress", knows),
				mangle: knownTo(
					readJson(path.join(path.dirname(file), "mangle.json")),
					"mangle",
					knows
				),
				format: undefined,
				parse: undefined
			}
		}
	];
};

/**
 * @param {string} directory a corpus directory
 * @param {number} depth how many directory levels name a group
 * @param {(file: string) => boolean} include which files the corpus holds
 * @returns {() => Group[]} the files grouped by their leading directories
 */
const groupByDirectory = (directory, depth, include) => () => {
	/** @type {Map<string, string[]>} */
	const groups = new Map();
	for (const file of listFiles(directory)) {
		if (!include(file)) continue;
		const parts = path.relative(directory, file).split(path.sep);
		const name = parts.slice(0, Math.min(depth, parts.length - 1)).join("/");
		const files = groups.get(name);
		if (files) files.push(file);
		else groups.set(name, [file]);
	}
	return [...groups].map(([name, files]) => ({ name, files }));
};

/** @type {Corpus[]} */
const CORPORA = [
	{
		name: "terser compress",
		submodule: "test/external/terser",
		directory: path.join(referenceDir, "test/compress"),
		groups: () =>
			listFiles(path.join(referenceDir, "test/compress")).map((file) => ({
				name: path.basename(file),
				files: [file]
			})),
		read: readCompressCases,
		optionSets: Object.keys(OPTION_SETS),
		// 2602 at the pinned 5.51.2; a reader that stopped matching reads none.
		minimum: 2500
	},
	{
		name: "terser input",
		submodule: "test/external/terser",
		directory: path.join(referenceDir, "test/input"),
		groups: groupByDirectory(path.join(referenceDir, "test/input"), 0, () => true),
		read: readWholeFile,
		optionSets: Object.keys(OPTION_SETS),
		minimum: 30
	},
	{
		name: "test262",
		submodule: "test/external/test262-cases",
		directory: path.join(externalDir, "test262-cases/test"),
		groups: groupByDirectory(
			path.join(externalDir, "test262-cases/test"),
			2,
			(file) =>
				!file.includes("_FIXTURE") &&
				!file.includes(`${path.sep}harness${path.sep}`)
		),
		read: readTest262File,
		optionSets: ["the default minimizer's options", "printing alone"],
		minimum: 50000
	},
	{
		name: "swc minifier",
		submodule: "test/external/swc",
		directory: swcTestsDir,
		// Each test's input, the real libraries and projects swc measures itself
		// on, and not the port of terser's own tests the first corpus reads.
		groups: groupByDirectory(swcTestsDir, 2, (file) => {
			const [area, next] = path.relative(swcTestsDir, file).split(path.sep);
			if (area === "terser") return false;
			if (area === "benches-full") return true;
			if (area === "projects") return next === "files";
			return path.basename(file) === "input.js";
		}),
		read: readSwcTest,
		optionSets: [
			"its own options",
			"the default minimizer's options",
			"printing alone"
		],
		// 940 at the pinned commit, 908 of them under a config of their own; a
		// reader that stopped finding configs up the tree reads 219.
		minimum: 900,
		minimumOwn: 900,
		// Its own options are cut to what terser reads, so terser refusing one
		// is the reader letting a key through.
		ownOptionsKnown: true,
		// Each names `defaults`, as swc reads a config that leaves it unnamed.
		ownDefaultsNamed: true
	}
];

/**
 * @param {Minify} minify a minifier
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

/**
 * @param {string} directory a corpus directory
 * @returns {boolean} whether its submodule is checked out
 */
const isPresent = (directory) =>
	fs.existsSync(directory) && fs.readdirSync(directory).length > 0;

describe("JavaScript minifier", () => {
	/** @type {{ reader?: CaseReader, printer?: { minify: Minify, phases: string[] } }} */
	const loaded = {};

	beforeAll(async () => {
		loaded.printer = await require("../../lib/javascript/syntax").printer.load();
		if (!isPresent(referenceDir)) return;
		// eslint-disable-next-line no-new-func
		const importModule = new Function("specifier", "return import(specifier)");
		/**
		 * @param {string} file a file in the reference's `lib`
		 * @returns {Promise<EXPECTED_ANY>} the module
		 */
		const at = (file) =>
			importModule(pathToFileURL(path.join(referenceDir, "lib", file)).href);
		// Read for its effect: `minify` reaches `transform` on every node class.
		await at("transform.js");
		const { minify_sync: minifySync } = await at("minify.js");
		/** @type {Map<string, boolean>} */
		const known = new Map();
		loaded.reader = {
			AST: await at("ast.js"),
			parse: (await at("parse.js")).parse,
			// Whether terser reads a key, as its own `minify` answers: it refuses an
			// options object naming one it does not, and nothing else says so whole.
			knows: (group, key) => {
				const id = `${group}.${key}`;
				let answer = known.get(id);
				if (answer === undefined) {
					try {
						minifySync("0", { [group]: { [key]: undefined } });
						answer = true;
					} catch (err) {
						answer = !/is not a supported option/.test(
							String(/** @type {Error} */ (err).message)
						);
					}
					known.set(id, answer);
				}
				return answer;
			}
		};
	});

	it("should install every phase, so each corpus reaches all of them", () => {
		const { phases } = /** @type {NonNullable<typeof loaded.printer>} */ (
			loaded.printer
		);
		expect(phases).toEqual(PHASES.map((phase) => phase.name));
	});

	if (isPresent(referenceDir)) {
		it("should pin the reference's corpus to the version it is compared with", () => {
			const pinned = JSON.parse(
				fs.readFileSync(path.join(referenceDir, "package.json"), "utf8")
			).version;
			expect(pinned).toBe(require("terser/package.json").version);
		});
	}

	for (const corpus of CORPORA) {
		describe(corpus.name, () => {
			if (!isPresent(corpus.directory)) {
				it(`submodule not initialized (run \`git submodule update --init --depth 1 ${corpus.submodule}\`)`, () => {
					// No-op: each corpus is an optional git submodule.
				});

				return;
			}
			const groups = corpus.groups();

			it("should read every source the corpus holds", () => {
				const reader = /** @type {CaseReader} */ (loaded.reader);
				let count = 0;
				let own = 0;
				let defaultsUnnamed = 0;
				for (const { files } of groups) {
					for (const file of files) {
						for (const source of corpus.read(file, reader)) {
							count++;
							if (source.own) own++;
							if (
								source.own &&
								source.own.compress &&
								source.own.compress.defaults === undefined
							) {
								defaultsUnnamed++;
							}
						}
					}
				}
				expect(count).toBeGreaterThan(corpus.minimum);
				if (corpus.minimumOwn !== undefined) {
					expect(own).toBeGreaterThan(corpus.minimumOwn);
				}
				if (corpus.ownDefaultsNamed) expect(defaultsUnnamed).toBe(0);
			});

			for (const group of groups) {
				it(
					`should minify exactly as the reference does: ${group.name || "."}`,
					async () => {
						const reference = require("terser");

						const reader = /** @type {CaseReader} */ (loaded.reader);
						const printer = /** @type {NonNullable<typeof loaded.printer>} */ (
							loaded.printer
						);
						/** @type {string[]} */
						const differences = [];
						for (const file of group.files) {
							for (const source of corpus.read(file, reader)) {
								for (const setName of corpus.optionSets) {
									const optionsFor = OPTION_SETS[setName];
									const options = optionsFor(source);
									if (!options) continue;
									const theirs = await outcome(
										reference.minify,
										source.input,
										options
									);
									const ours = await outcome(
										printer.minify,
										source.input,
										optionsFor(source)
									);
									if (
										corpus.ownOptionsKnown &&
										setName === "its own options" &&
										theirs.error !== undefined &&
										/is not a supported option/.test(theirs.error)
									) {
										differences.push(
											`${source.name} (${setName})\n\tterser refused an option: ${theirs.error}`
										);
									}
									if (theirs.code !== ours.code || theirs.error !== ours.error) {
										differences.push(
											`${source.name} (${setName})\n\treference: ${JSON.stringify(theirs)}\n\twebpack:   ${JSON.stringify(ours)}`
										);
									}
								}
							}
						}

						expect(differences).toEqual([]);
					},
					GROUP_TIMEOUT
				);
			}
		});
	}
});
