"use strict";

// cspell:ignore destructurings fnames napi reminify reminifies ufuzz

// Holds webpack's JavaScript minifier to every test terser, swc and oxc write
// for theirs. Each source of each corpus below is minified by webpack and by the
// minifier it replaces under the same options, and:
// 1. both must write the same bytes, or refuse the source with the same error;
// 2. where the test states what its input prints, webpack's output, run in
//    terser's own sandbox, must print it too, whatever the bytes;
// 3. where swc records its own output, webpack's must be no bigger (gzip, then
//    raw), unless SWC_SMALLER lists why, nor than oxc's unless OXC_SMALLER does;
//    JS_MINIFY_REPORT names a file to tally where it is worse, the same and better.

const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const vm = require("vm");
const zlib = require("zlib");
const acorn = require("acorn");
const { IGNORED_FORMAT_OPTIONS, load } =
	require("../../lib/javascript/syntax").printer;
const OXC_SMALLER = require("../helpers/oxcSmaller");
const SWC_SMALLER = require("../helpers/swcSmaller");

/** @typedef {import("terser").MinifyOptions} MinifyOptions */
/** @typedef {(code: string, options: MinifyOptions) => Promise<{ code?: string }>} Minify */
/** @typedef {{ code?: string, error?: string }} Outcome */
/** @typedef {{ expected: string | Error | true, input: string, prepend: string, microtasks?: boolean, strict?: boolean }} Stdout */
/** @typedef {{ name: string, input: string, module?: boolean, invalid?: boolean, own?: { compress: EXPECTED_ANY, mangle: EXPECTED_ANY, format: EXPECTED_OBJECT, parse: EXPECTED_OBJECT }, stdout?: Stdout, reminify?: boolean, rival?: { name: string, code: string } }} Source */
/** @typedef {{ AST: EXPECTED_ANY, parse: EXPECTED_ANY, knows: (group: "compress" | "mangle", key: string) => boolean }} CaseReader */
/** @typedef {{ name: string, files: string[] }} Group */
/** @typedef {{ name: string, submodule: string, directory: string, groups: () => Group[], read: (file: string, reader: CaseReader) => Source[], optionSets: string[], minimum: number, minimumOwn?: number, minimumRun?: number, minimumRival?: number, ownOptionsKnown?: boolean, ownDefaultsNamed?: boolean, withoutOxc?: boolean }} Corpus */
/** @typedef {{ source: string, rival: string, ours: number, theirs: number, oursGzip: number, theirsGzip: number }} Lead */
/** @typedef {"worse" | "same" | "better"} Standing */

const externalDir = path.resolve(__dirname, "../external");
const referenceDir = path.join(externalDir, "terser");
const swcTestsDir = path.join(
	externalDir,
	"swc/crates/swc_ecma_minifier/tests"
);
const oxcTestsDir = path.join(externalDir, "oxc/crates/oxc_minifier/tests");

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
 * A case keeping function or class names prints them, so a set it is run under
 * keeps them too.
 * @param {Source["own"]} own the case's own options
 * @returns {{ keep_fnames?: boolean, keep_classnames?: boolean }} those it names
 */
const keptNames = (own) => {
	const compress = own && own.compress;
	if (!compress || typeof compress !== "object") return {};
	/** @type {{ keep_fnames?: boolean, keep_classnames?: boolean }} */
	const names = {};
	if (compress.keep_fnames !== undefined) names.keep_fnames = compress.keep_fnames;
	if (compress.keep_classnames !== undefined) {
		names.keep_classnames = compress.keep_classnames;
	}
	return names;
};

/**
 * The options as webpack's printer reads them: it writes minified output only,
 * so the reference is asked for that too, with every layout option at its default.
 * @param {MinifyOptions} options options for either minifier
 * @returns {MinifyOptions} the same, less the layout options
 */
const withoutLayout = (options) => {
	/** @type {Record<string, unknown>} */
	const result = { ...options };
	// `output` is terser's older name for `format`.
	for (const key of ["format", "output"]) {
		const given = /** @type {Record<string, unknown> | undefined} */ (
			result[key]
		);
		if (!given || typeof given !== "object") continue;
		const format = { ...given };
		for (const name of IGNORED_FORMAT_OPTIONS) delete format[name];
		result[key] = format;
	}
	return /** @type {MinifyOptions} */ (result);
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
		...keptNames(own),
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
		...keptNames(own),
		...(own && { parse: copy(own.parse) })
	})
};

const reminifyFile = path.join(referenceDir, "test/ufuzz.json");

// The sets terser's runner reminifies a case stating its stdout with, keeping
// the case's own `keep_fnames` and `keep_classnames`, unless it opts out.
if (fs.existsSync(reminifyFile)) {
	for (const [index, set] of JSON.parse(
		fs.readFileSync(reminifyFile, "utf8")
	).entries()) {
		OPTION_SETS[`reminify ${index} ${JSON.stringify(set)}`] = ({
			own,
			stdout,
			reminify
		}) =>
			stdout && reminify
				? { ...copy(set), ...keptNames(own) }
				: undefined;
	}
}

// terser's sandbox runs code with no time limit, so an output that never ends
// would hang the suite rather than fail it.
const RUN_TIMEOUT = 5000;

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
 * @param {string} range a case's `node_version`
 * @returns {boolean} whether this Node is in it
 */
const nodeSatisfies = (range) => {
	const match = /^>=\s*(\d+)(?:\.0\.0)?$/.exec(range);
	if (!match) throw new Error(`Unsupported node_version "${range}"`);
	return Number(process.versions.node.split(".")[0]) >= Number(match[1]);
};

/**
 * @param {EXPECTED_ANY} node a string or an array of strings in a terser case
 * @param {EXPECTED_ANY} AST terser's node classes
 * @param {string} name the file, for the error
 * @returns {string} the text, array elements joined by lines
 */
const readStringList = (node, AST, name) => {
	if (node instanceof AST.AST_String) return node.value;
	if (node instanceof AST.AST_Array) {
		return node.elements
			.map((/** @type {EXPECTED_ANY} */ element) =>
				readStringList(element, AST, name)
			)
			.join("\n");
	}
	throw new Error(`Expected a string or an array of strings in ${name}`);
};

/**
 * A case's `expect_stdout`: `true` for whatever its input prints, an error it
 * throws, or the lines it prints.
 * @param {EXPECTED_ANY} node the value
 * @param {EXPECTED_ANY} AST terser's node classes
 * @param {string} name the file, for the error
 * @returns {string | Error | true} what the case expects
 */
const readExpectedStdout = (node, AST, name) => {
	if (node instanceof AST.AST_Boolean) return node.value;
	if (node instanceof AST.AST_Call) {
		return new /** @type {ErrorConstructor} */ (
			/** @type {EXPECTED_ANY} */ (globalThis)[node.expression.name]
		)(...node.args.map((/** @type {EXPECTED_ANY} */ arg) => arg.value));
	}
	return `${readStringList(node, AST, name)}\n`;
};

/** @type {Set<string> | undefined} */
let swcPortPassing;

/**
 * What swc recorded for its port of one of terser's cases, where its harness
 * holds the port to that output: listed as passing, and not left empty.
 * @param {string} file the case's file, as terser names it
 * @param {string} label the case's label
 * @returns {{ name: string, code: string } | undefined} swc's output
 */
const readSwcPortOutput = (file, label) => {
	if (!isPresent(swcTestsDir)) return undefined;
	if (swcPortPassing === undefined) {
		swcPortPassing = new Set(
			fs
				.readFileSync(path.join(swcTestsDir, "passing.txt"), "utf8")
				.split("\n")
				.map((line) => line.trim())
		);
	}
	// swc ported the files before terser renamed `drop_unused.js` and others
	// to `drop-unused.js`, and keeps the older spelling.
	for (const name of new Set([file.replace(/-/g, "_"), file])) {
		const output = path.join(swcTestsDir, "terser/compress", name, label, "output.js");
		if (
			swcPortPassing.has(`${name}/${label}/input.js`) &&
			fs.existsSync(output)
		) {
			const code = fs.readFileSync(output, "utf8");
			return code.trim() === "" ? undefined : { name: "swc", code };
		}
	}
	return undefined;
};

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
		const test = { reminify: true };
		for (const node of statement.body.body) {
			if (node instanceof AST.AST_LabeledStatement) {
				const label = node.label.name;
				const { body } = node;
				if (body instanceof AST.AST_BlockStatement) {
					test[label] = blockBody(body.start.pos);
				} else if (!(body instanceof AST.AST_SimpleStatement)) {
					continue;
				} else if (label === "expect_stdout") {
					test.expect_stdout = readExpectedStdout(body.body, AST, name);
				} else if (label === "reminify") {
					test.reminify = body.body.value;
				} else if (label === "node_version" || label === "prepend_code") {
					test[label] = readStringList(body.body, AST, name);
				} else if (body.body instanceof AST.AST_TemplateString) {
					test[label] = body.body.segments[0].value;
				}
			} else if (
				node instanceof AST.AST_SimpleStatement &&
				node.body instanceof AST.AST_Assign
			) {
				test[node.body.left.name] = readValue(node.body.right.start.pos);
			}
		}
		if (typeof test.input !== "string") continue;
		const format = test.beautify || test.format;
		cases.push({
			name: `${path.basename(file, ".js")}/${statement.label.name}`,
			input: test.input,
			own: {
				compress: test.options,
				mangle: test.mangle,
				format,
				parse: test.parse
			},
			reminify: test.reminify,
			// Run as terser's runner runs it: parsed and printed by the reference.
			stdout:
				test.expect_stdout !== undefined &&
				test.expect_stdout !== false &&
				(!test.node_version || nodeSatisfies(test.node_version))
					? {
							expected: test.expect_stdout,
							input: parse(test.input, { ...test.parse }).print_to_string({
								...format
							}),
							prepend: test.prepend_code || "",
							strict: true
						}
					: undefined,
			rival: readSwcPortOutput(path.basename(file, ".js"), statement.label.name)
		});
	}
	return cases;
};

/**
 * @param {string} file a file
 * @returns {Source[]} the file as one source
 */
const readWholeFile = (file) => [
	{
		// Named by its path: many directories hold a file of the same name.
		name: path
			.relative(path.join(referenceDir, "test/input"), file)
			.split(path.sep)
			.join("/"),
		input: fs.readFileSync(file, "utf8")
	}
];

/**
 * @param {string} file a test262 test
 * @returns {Source[]} the test as one source, a module where its flags say so,
 * and invalid where it expects a parse or early error
 */
const readTest262File = (file) => {
	const input = fs.readFileSync(file, "utf8");
	return [
		{
			name: path.basename(file),
			input,
			module: /flags:.*\bmodule\b/.test(input),
			invalid: /negative:\s*\n\s*phase:\s*parse\b/.test(input)
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
 * @param {string} input a source
 * @returns {boolean} whether it parses only as a module
 */
const readsAsModule = (input) => {
	try {
		acorn.parse(input, { ecmaVersion: "latest", sourceType: "script" });
		return false;
	} catch (_err) {
		try {
			acorn.parse(input, { ecmaVersion: "latest", sourceType: "module" });
			return true;
		} catch (_err2) {
			// Neither: both minifiers are held to refusing it alike.
			return false;
		}
	}
};

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
	const [area] = path.relative(swcTestsDir, file).split(path.sep);
	const mangle = readJson(path.join(path.dirname(file), "mangle.json"));
	// swc also reads its Rust field's camelCase spelling, which terser does not.
	if (mangle && mangle.topLevel !== undefined) {
		mangle.toplevel = mangle.topLevel;
		delete mangle.topLevel;
	}
	const module = readsAsModule(input);
	const expectedStdout = path.join(path.dirname(file), "expected.stdout");
	// swc records what it wrote for each test beside its input, and for each
	// project under `output`, the way its harness compares them.
	const rival =
		area === "projects"
			? path.join(swcTestsDir, "projects/output", path.basename(file))
			: path.join(path.dirname(file), "output.js");
	return [
		{
			// Written with `/` on every platform, as the tables keyed by it are.
			name: path.relative(swcTestsDir, file).split(path.sep).join("/"),
			input,
			module,
			own: compress && {
				compress: knownTo(compress, "compress", knows),
				// swc's harness mangles its `full` tests at the top level.
				mangle: knownTo(
					mangle || (area === "full" ? { toplevel: true } : undefined),
					"mangle",
					knows
				),
				format: undefined,
				parse: undefined
			},
			// Run as swc's harness runs it, after its own helpers; the sandbox
			// runs a script, so a module is left to the bytes alone.
			stdout:
				!module && fs.existsSync(expectedStdout)
					? {
							expected: fs.readFileSync(expectedStdout, "utf8"),
							input,
							prepend: fs.readFileSync(
								path.join(swcTestsDir, "terser_exec_base.js"),
								"utf8"
							)
						}
					: undefined,
			rival: fs.existsSync(rival)
				? { name: "swc", code: fs.readFileSync(rival, "utf8") }
				: undefined
		}
	];
};

/**
 * A Rust string literal starting at `at`, read as Rust reads it: `r#"…"#` raw,
 * or `"…"` with its escapes.
 * @param {string} text the source
 * @param {number} at where a literal may start
 * @returns {{ value: string, end: number } | undefined} the string, and where it ends
 */
const readRustString = (text, at) => {
	const raw = /^r(#*)"/.exec(text.slice(at, at + 16));
	if (raw) {
		const close = `"${raw[1]}`;
		const start = at + raw[0].length;
		const end = text.indexOf(close, start);
		return { value: text.slice(start, end), end: end + close.length };
	}
	if (text[at] !== '"') return undefined;
	/** @type {Record<string, string>} */
	const escaped = { n: "\n", r: "\r", t: "\t", 0: "\0", "\\": "\\", '"': '"', "'": "'" };
	let value = "";
	let i = at + 1;
	for (; text[i] !== '"'; i++) {
		if (text[i] !== "\\") {
			value += text[i];
			continue;
		}
		const next = text[++i];
		if (next === "u") {
			const close = text.indexOf("}", i);
			value += String.fromCodePoint(Number.parseInt(text.slice(i + 2, close), 16));
			i = close;
		} else if (next === "x") {
			value += String.fromCharCode(Number.parseInt(text.slice(i + 1, i + 3), 16));
			i += 2;
		} else if (next === "\n") {
			// A line continuation, which drops the break and the indent after it.
			while (/\s/.test(text[i + 1])) i++;
		} else {
			value += escaped[next];
		}
	}
	return { value, end: i + 1 };
};

// The mangle options swc's exec tests run with, by the helper each calls.
const SWC_EXEC_MANGLE = { keep_fnames: true, toplevel: true };

/**
 * The tests swc writes inline in `exec.rs`, as the helper each calls runs them:
 * its source, and a config read with `defaults` on where it leaves it unnamed.
 * @param {string} file `exec.rs`
 * @param {CaseReader} reader terser's own modules, unpatched
 * @returns {Source[]} one source per test
 */
const readSwcExecTests = (file, { knows }) => {
	const text = fs.readFileSync(file, "utf8");
	/** @type {Source[]} */
	const sources = [];
	for (const test of text.split("#[test]").slice(1)) {
		const name = /** @type {RegExpExecArray} */ (/fn\s+(\w+)/.exec(test))[1];
		const call =
			/\b(run_exec_test|run_default_exec_test|run_mangle_props_exec_test)\(/.exec(
				test
			);
		// A test with a harness of its own, which reads no one source.
		if (!call) continue;
		/** @type {Map<string, string>} */
		const bound = new Map();
		for (const binding of test.matchAll(/let\s+(\w+)\s*=\s*/g)) {
			const literal = readRustString(
				test,
				/** @type {number} */ (binding.index) + binding[0].length
			);
			if (literal) bound.set(binding[1], literal.value);
		}
		/** @type {(string | boolean | undefined)[]} */
		const args = [];
		let i = call.index + call[0].length;
		for (;;) {
			while (/[\s,]/.test(test[i])) i++;
			if (test[i] === ")") break;
			const literal = readRustString(test, i);
			if (literal) {
				args.push(literal.value);
				i = literal.end;
				continue;
			}
			const word = /^\w+/.exec(test.slice(i));
			if (!word) throw new Error(`Unread argument to ${call[1]} in ${name}`);
			args.push(
				word[0] === "true" ? true : word[0] === "false" ? false : bound.get(word[0])
			);
			i += word[0].length;
		}
		const [input, config, skipMangle] = args;
		if (typeof input !== "string") {
			throw new Error(`Unread source for ${call[1]} in ${name}`);
		}
		/** @type {EXPECTED_ANY} */
		let compress = { defaults: true, toplevel: true };
		/** @type {EXPECTED_ANY} */
		let mangle = SWC_EXEC_MANGLE;
		if (call[1] === "run_exec_test") {
			compress = { defaults: true, ...JSON.parse(/** @type {string} */ (config)) };
			mangle = skipMangle ? false : SWC_EXEC_MANGLE;
		} else if (call[1] === "run_mangle_props_exec_test") {
			compress = false;
			mangle = { toplevel: true, properties: {} };
		}
		const module = readsAsModule(input);
		sources.push({
			name,
			input,
			module,
			own: {
				compress: knownTo(compress, "compress", knows),
				mangle: knownTo(mangle, "mangle", knows),
				format: undefined,
				parse: undefined
			},
			// swc's harness requires the output to print what the input prints,
			// promise callbacks included.
			stdout: module
				? undefined
				: { expected: true, input, prepend: "", microtasks: true }
		});
	}
	return sources;
};

/**
 * The tests swc writes inline in `mangle.rs`: each source, and the options its
 * `MangleOptions` literal names. Rust spells three of terser's options its own
 * way, `top_level`, `props` and `atom!` names, so those are read by name; a
 * field terser does not read is cut as any other test's is.
 * @param {string} file `mangle.rs`
 * @param {CaseReader} reader terser's own modules, unpatched
 * @returns {Source[]} one source per test
 */
const readSwcMangleTests = (file, { knows }) => {
	const text = fs.readFileSync(file, "utf8");
	/**
	 * @param {string} list a `vec![atom!("…"), …]`
	 * @returns {string[]} the names in it
	 */
	const atoms = (list) => [...list.matchAll(/atom!\("([^"]*)"\)/g)].map((m) => m[1]);
	/** @type {Source[]} */
	const sources = [];
	for (const test of text.split("#[test]").slice(1)) {
		const name = /** @type {RegExpExecArray} */ (/fn\s+(\w+)/.exec(test))[1];
		const binding = /let\s+src\s*=\s*/.exec(test);
		const at = test.indexOf("MangleOptions {");
		if (!binding || at === -1) continue;
		const literal = readRustString(
			test,
			/** @type {number} */ (binding.index) + binding[0].length
		);
		if (!literal) throw new Error(`Unread source in ${name}`);
		const struct = test.slice(at);
		const props = /props:\s*Some\(ManglePropertiesOptions\s*\{([\s\S]*?)\}\)/.exec(
			struct
		);
		const outside = props ? struct.replace(props[0], "") : struct;
		/** @type {Record<string, EXPECTED_ANY>} */
		const mangle = {};
		const topLevel = /top_level:\s*Some\((true|false)\)/.exec(outside);
		if (topLevel) mangle.toplevel = topLevel[1] === "true";
		const reserved = /reserved:\s*(vec!\[[^\]]*\])/.exec(outside);
		if (reserved) mangle.reserved = atoms(reserved[1]);
		for (const field of outside.matchAll(/(\w+):\s*(true|false)\b/g)) {
			mangle[field[1]] = field[2] === "true";
		}
		if (props) {
			const kept = /reserved:\s*(vec!\[[^\]]*\])/.exec(props[1]);
			mangle.properties = kept ? { reserved: atoms(kept[1]) } : {};
		}
		// A field read by none of the above is an option this would drop unseen.
		const read = new Set(["top_level", "reserved", ...Object.keys(mangle)]);
		for (const [scope, fields] of [
			["MangleOptions", outside.slice(0, outside.indexOf("..Default::default()"))],
			["ManglePropertiesOptions", props ? props[1] : ""]
		]) {
			for (const field of fields
				.replace(/\.\.Default::default\(\)/g, "")
				.matchAll(/(\w+):/g)) {
				if (!read.has(field[1])) {
					throw new Error(`Unread ${scope} field ${field[1]} in ${name}`);
				}
			}
		}
		sources.push({
			name,
			input: literal.value,
			module: readsAsModule(literal.value),
			own: {
				compress: false,
				mangle: knownTo(mangle, "mangle", knows),
				format: undefined,
				parse: undefined
			}
		});
	}
	return sources;
};

/**
 * Where a Rust call's argument list ends, its string literals skipped whole.
 * @param {string} text the Rust source
 * @param {number} at a position inside the argument list
 * @returns {number} the position of its closing parenthesis
 */
const callEnd = (text, at) => {
	let depth = 1;
	for (let i = at; i < text.length; i++) {
		const literal = /["r]/.test(text[i]) ? readRustString(text, i) : undefined;
		if (literal) {
			i = literal.end - 1;
		} else if (text[i] === "(") {
			depth++;
		} else if (text[i] === ")" && --depth === 0) {
			return i;
		}
	}
	return text.length;
};

/**
 * The tests oxc writes inline in its minifier's Rust tests: the source each
 * `test…(` helper call passes first, once per distinct source in a file.
 * @param {string} file one of the test files
 * @returns {Source[]} one source per distinct source
 */
const readOxcTests = (file) => {
	const text = fs.readFileSync(file, "utf8");
	/** @type {Set<string>} */
	const seen = new Set();
	/** @type {Source[]} */
	const sources = [];
	for (const call of text.matchAll(/\b(test\w*)\(/g)) {
		const index = /** @type {number} */ (call.index);
		// A helper's own definition, not a call to it.
		if (/\bfn\s+$/.test(text.slice(Math.max(0, index - 8), index))) continue;
		let at = index + call[0].length;
		while (/\s/.test(text[at])) at++;
		const literal = readRustString(text, at);
		if (!literal || seen.has(literal.value)) continue;
		// TypeScript, which neither minifier reads, and terser 5.51 loops on a
		// `type` or `interface` declaration it is not told to read as TypeScript.
		const rest = text.slice(literal.end, callEnd(text, literal.end));
		if (/SourceType::(ts|tsx|d_ts)\(/.test(rest)) continue;
		seen.add(literal.value);
		const line = text.slice(0, index).split("\n").length;
		sources.push({
			name: `${path.relative(oxcTestsDir, file).split(path.sep).join("/")}:${line}`,
			input: literal.value,
			module: readsAsModule(literal.value)
		});
	}
	return sources;
};

/**
 * @param {string} directory a directory
 * @returns {string[]} every Rust file under it, sorted
 */
const listRustFiles = (directory) =>
	fs
		.readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) =>
			entry.isDirectory()
				? listRustFiles(path.join(directory, entry.name))
				: entry.name.endsWith(".rs")
					? [path.join(directory, entry.name)]
					: []
		)
		.sort();

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
		minimum: 2500,
		// 1587 at swc's pinned commit carry the output swc's port records.
		minimumRival: 1500
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
		minimum: 50000,
		// Conformance tests of syntax, not of size, and fifty thousand of them.
		withoutOxc: true
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
	},
	{
		name: "swc exec",
		submodule: "test/external/swc",
		directory: swcTestsDir,
		groups: () => [{ name: "exec.rs", files: [path.join(swcTestsDir, "exec.rs")] }],
		read: readSwcExecTests,
		optionSets: [
			"its own options",
			"the default minimizer's options",
			"printing alone"
		],
		// 502 at the pinned commit: every test but two with harnesses of their own.
		minimum: 500,
		minimumOwn: 500,
		ownOptionsKnown: true,
		ownDefaultsNamed: true
	},
	{
		name: "swc mangle",
		submodule: "test/external/swc",
		directory: swcTestsDir,
		groups: () => [
			{ name: "mangle.rs", files: [path.join(swcTestsDir, "mangle.rs")] }
		],
		read: readSwcMangleTests,
		optionSets: ["its own options", "the default minimizer's options"],
		// 10 at the pinned commit.
		minimum: 9,
		minimumOwn: 9,
		ownOptionsKnown: true
	},
	{
		name: "oxc minifier",
		submodule: "test/external/oxc",
		directory: oxcTestsDir,
		groups: () =>
			listRustFiles(oxcTestsDir).map((file) => ({
				name: path.relative(oxcTestsDir, file).split(path.sep).join("/"),
				files: [file]
			})),
		read: readOxcTests,
		optionSets: ["the default minimizer's options", "printing alone"],
		// 7553 at the pinned commit, its TypeScript left out.
		minimum: 7000
	}
];

/**
 * Sources whose output misprints under a set as terser's does, each with why
 * that is not a defect; an entry that starts printing right fails until retired.
 * @type {Record<string, string>}
 */
const INHERITED = {
	"swc exec: terser_pure_funcs_issue_3065_3 (its own options)":
		"`pure_funcs` names these calls free of effects, so dropping them is what it asks",
	"swc exec: terser_pure_funcs_issue_3065_4 (its own options)":
		"`pure_funcs` names these calls free of effects, so dropping them is what it asks",
	"swc exec: terser_pure_getters_impure_getter_2 (its own options)":
		"`pure_getters` says property reads have no effects, so dropping the getter is what it asks"
};

/**
 * Sources terser misprints under a set and webpack's `correct` phase prints
 * right, each with the defect: without the phase each must misprint as terser's.
 * @type {Record<string, string>}
 */
const CORRECTED = {
	"swc exec: object_spread_proto_key_is_not_flattened (its own options)":
		"terser flattens a spread object carrying a `__proto__` key into a literal, where it sets the prototype",
	"swc exec: object_spread_proto_key_is_not_flattened (the default minimizer's options)":
		"terser flattens a spread object carrying a `__proto__` key into a literal, where it sets the prototype",
	"swc exec: terser_reduce_vars_shorthand_proto_null (its own options)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc exec: terser_reduce_vars_shorthand_proto_null (printing alone)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc exec: terser_reduce_vars_shorthand_proto_null (the default minimizer's options)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc exec: terser_reduce_vars_shorthand_proto_object (its own options)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc exec: terser_reduce_vars_shorthand_proto_object (printing alone)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc exec: terser_reduce_vars_shorthand_proto_object (the default minimizer's options)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc minifier: fixture/issues/12182/callee-contexts/input.js (its own options)":
		"terser drops the `(0, \u2026)` detaching a callee from its receiver, so `this` becomes the object",
	"swc minifier: fixture/issues/12182/callee-contexts/input.js (the default minimizer's options)":
		"terser drops the `(0, \u2026)` detaching a callee from its receiver, so `this` becomes the object",
	"swc minifier: fixture/issues/12182/callee-safety/direct-eval/input.js (its own options)":
		"terser calls a function reading `this` through direct `eval` out of the array holding it, so `this` is lost",
	"swc minifier: fixture/issues/12182/callee-safety/direct-eval/input.js (the default minimizer's options)":
		"terser calls a function reading `this` through direct `eval` out of the array holding it, so `this` is lost",
	"swc minifier: fixture/issues/12209/input.js (its own options)":
		"terser reads `arguments[0]` as a parameter reassigned in the body, though no argument was passed to alias it",
	"swc minifier: fixture/issues/12214/input.js (its own options)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc minifier: fixture/issues/12214/input.js (printing alone)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc minifier: fixture/issues/12214/input.js (the default minimizer's options)":
		"terser prints a `{ __proto__ }` shorthand as `__proto__: \u2026`, which sets the prototype instead of an own property",
	"swc minifier: fixture/issues/12222/input.js (its own options)":
		"terser drops calls whose parameter defaults or destructuring have effects or throw",
	"swc minifier: fixture/issues/12222/input.js (the default minimizer's options)":
		"terser drops calls whose parameter defaults or destructuring have effects or throw",
	"swc minifier: fixture/issues/12296/input.js (its own options)":
		"terser moves a class declaration into a block the closure reading it cannot see, so it throws",
	"swc minifier: fixture/issues/12307/input.js (its own options)":
		"terser folds `f().a == f().a` to true, though each call returns a different object",
	"swc minifier: fixture/issues/12307/input.js (the default minimizer's options)":
		"terser folds `f().a == f().a` to true, though each call returns a different object",
	"swc minifier: fixture/issues/9460/side-effects/input.js (its own options)":
		"terser drops destructuring defaults and patterns whose evaluation has effects or throws",
	"swc minifier: fixture/issues/9460/side-effects/input.js (the default minimizer's options)":
		"terser drops destructuring defaults and patterns whose evaluation has effects or throws"
};

/* cspell:disable */
// What the reference gets wrong, or how its output and webpack's agree, where
// several sources differ for the same reason.
const DEFAULT_FUNCTION_ENDS =
	"an exported default function declaration ends at its `}`, so `(foo)` is a statement of its own, which terser's own FIXME says";
const ASI_LET =
	"terser reads a `let` before a line break as a declaration, where the semicolon inserted after it leaves a name";
const ASI_ASYNC =
	"terser reads an `async` before a line break as the modifier, where the semicolon inserted after it leaves a name";
const CONTINUATION =
	"terser writes a line continuation's own break into the string, which holds nothing";
const NUMERIC_KEY =
	"terser quotes a binary, octal or hex key as it is written, naming the property `0b1` where it is `1`";
const RAW_BREAK =
	"a tagged template's raw text reads either break as one line feed, and webpack writes the feed itself";
const ESCAPED_DIRECTIVE =
	"webpack keeps the escape that stops the string being a directive, where terser unescapes it and detaches it with `;`";
const EMPTY_IMPORT =
	"webpack writes an import of nothing without the empty list, which imports the same";
const EMPTY_ATTRIBUTES =
	"webpack writes an import without the empty attributes, which asks for the same";
const AWAIT_IDENTIFIER =
	"terser reads `await` in a class field as the operator, where a script may hold it as a name";

/**
 * Parse errors the reference answers with where the spec allows the source,
 * each with what makes it legal: webpack reads these and prints, and the output
 * is still run against what the test says it prints. A message the reference
 * stops answering with fails until retired.
 * @type {Record<string, string>}
 */
const REFUSED_BY_REFERENCE = {
	"Escaped characters are not allowed in keywords":
		"an escape is allowed anywhere in an identifier name; only a keyword read as one may not hold it",
	"Unexpected token: punc ())":
		"an argument list may end in a comma, `import()`'s included",
	"Unexpected token: operator (/)":
		"a regular expression may follow any of the spec's white space, which the reference reads as division",
	"Unexpected character '\u1680'":
		"the ogham space mark is white space, which the reference does not read as any",
	"Name expected":
		"`let` is an identifier outside strict mode, so it names a binding and a property",
	"Yield cannot be used as identifier inside generators":
		"a function expression or declaration inside a generator may be named `yield`",
	"Name or string expected": "`export * as default from` names the namespace",
	"Unexpected token: keyword (if)":
		"a class or function exported as the default ends at the semicolon inserted after it",
	"Unexpected token: name (a)":
		"a field named `get` or `set` ends at the semicolon inserted before a generator",
	"Unicode reference out of bounds":
		"a tagged template may hold an escape no cooked value can read, which only its raw text keeps",
	"Unexpected token: keyword (let)":
		"a rest parameter may be named `yield` outside strict mode",
	"Unexpected token: operator (>)":
		"Annex B reads this as the identifier it is, not an operator",
	"Strict mode may not include a with statement":
		"the corpus reads this module as a script, where `with` is allowed"
};

/**
 * Sources the reference reads or prints differently, each with what it gets
 * wrong or how the two agree; webpack's output stands, and is still run against
 * what the test says it prints. An entry that stops differing fails until
 * retired.
 * @type {Record<string, string>}
 */
const REFERENCE_MISPRINTS = {
	"test262: import-attributes.js (the default minimizer's options)": EMPTY_ATTRIBUTES,
	"test262: import-attributes.js (printing alone)": EMPTY_ATTRIBUTES,
	"swc minifier: fixture/issues/6192/2/input.js (its own options)": EMPTY_IMPORT,
	"swc minifier: fixture/issues/6192/2/input.js (the default minimizer's options)": EMPTY_IMPORT,
	"swc minifier: fixture/issues/6192/2/input.js (printing alone)": EMPTY_IMPORT,
	"terser compress: export/export_default_anonymous_function_not_call (its own options)":
		DEFAULT_FUNCTION_ENDS,
	"terser compress: export/export_default_anonymous_function_not_call (the default minimizer's options)":
		DEFAULT_FUNCTION_ENDS,
	"terser compress: export/export_default_anonymous_function_not_call (printing alone)":
		DEFAULT_FUNCTION_ENDS,
	"terser compress: export/export_default_anonymous_function_not_call (a module mangled at its top level)":
		DEFAULT_FUNCTION_ENDS,
	"terser compress: harmony/import_no_mappings (its own options)": EMPTY_IMPORT,
	"terser compress: harmony/import_no_mappings (the default minimizer's options)": EMPTY_IMPORT,
	"terser compress: harmony/import_no_mappings (printing alone)": EMPTY_IMPORT,
	"terser compress: harmony/import_no_mappings (a module mangled at its top level)": EMPTY_IMPORT,
	"test262: let-identifier-with-newline.js (printing alone)": ASI_LET,
	"test262: let-identifier-with-newline.js (the default minimizer's options)":
		ASI_LET,
	"test262: let-block-with-newline.js (printing alone)": ASI_LET,
	"test262: let-block-with-newline.js (the default minimizer's options)":
		ASI_LET,
	"test262: syntax-declaration-no-line-terminator.js (printing alone)": ASI_ASYNC,
	"test262: syntax-declaration-no-line-terminator.js (the default minimizer's options)":
		ASI_ASYNC,
	"test262: escaped-async-line-terminator.js (printing alone)": ASI_ASYNC,
	"test262: escaped-async-line-terminator.js (the default minimizer's options)":
		ASI_ASYNC,
	"test262: async-lineterminator-identifier-throws.js (printing alone)":
		ASI_ASYNC,
	"test262: async-lineterminator-identifier-throws.js (the default minimizer's options)":
		ASI_ASYNC,
	"test262: line-continuation-double.js (printing alone)": CONTINUATION,
	"test262: line-continuation-double.js (the default minimizer's options)":
		CONTINUATION,
	"test262: line-continuation-single.js (printing alone)": CONTINUATION,
	"test262: line-continuation-single.js (the default minimizer's options)":
		CONTINUATION,
	"test262: property-name.js (printing alone)": NUMERIC_KEY,
	"test262: property-name.js (the default minimizer's options)": NUMERIC_KEY,
	"test262: special-characters.js (printing alone)": RAW_BREAK,
	"test262: special-characters.js (the default minimizer's options)": RAW_BREAK,
	"test262: tv-line-continuation.js (printing alone)": RAW_BREAK,
	"test262: tv-line-continuation.js (the default minimizer's options)": RAW_BREAK,
	"test262: 14.1-4-s.js (printing alone)": ESCAPED_DIRECTIVE,
	"test262: 14.1-5-s.js (printing alone)": ESCAPED_DIRECTIVE,
	"test262: eval-rqstd-order.js (printing alone)": EMPTY_IMPORT,
	"test262: eval-rqstd-order.js (the default minimizer's options)": EMPTY_IMPORT,
	"test262: eval-self-once.js (printing alone)": EMPTY_IMPORT,
	"test262: eval-self-once.js (the default minimizer's options)": EMPTY_IMPORT,
	"test262: instn-once.js (printing alone)": EMPTY_IMPORT,
	"test262: instn-once.js (the default minimizer's options)": EMPTY_IMPORT,
	"test262: instn-resolve-empty-import.js (printing alone)": EMPTY_IMPORT,
	"test262: instn-resolve-empty-import.js (the default minimizer's options)":
		EMPTY_IMPORT,
	"oxc minifier: peephole/remove_unused_declaration.rs:1051 (printing alone)":
		EMPTY_IMPORT,
	"oxc minifier: peephole/remove_unused_declaration.rs:1051 (the default minimizer's options)":
		EMPTY_IMPORT,
	"oxc minifier: peephole/remove_unused_declaration.rs:1058 (printing alone)":
		EMPTY_IMPORT,
	"oxc minifier: peephole/remove_unused_declaration.rs:1058 (the default minimizer's options)":
		EMPTY_IMPORT,
	"test262: import-attribute-empty.js (printing alone)": EMPTY_ATTRIBUTES,
	"test262: import-attribute-empty.js (the default minimizer's options)":
		EMPTY_ATTRIBUTES,
	"test262: await-identifier-script.js (printing alone)": AWAIT_IDENTIFIER,
	"test262: await-identifier-script.js (the default minimizer's options)":
		AWAIT_IDENTIFIER,
	"test262: await-identifier-module-2.js (printing alone)": AWAIT_IDENTIFIER,
	"test262: await-identifier-module-2.js (the default minimizer's options)":
		AWAIT_IDENTIFIER
};
/* cspell:enable */

// terser's parse options for what is not a program in the spec's sense: an
// expression alone, TypeScript, and a stricter reading than the spec's.
const DROPPED_PARSE_OPTIONS = ["expression", "experimental_typescript", "strict"];

/* cspell:disable */
const PRIVATE_UNDECLARED =
	"a private name must be declared by a class enclosing it (AllPrivateIdentifiersValid)";
const SETTER_ARITY = "a setter has exactly one parameter";
const EXPORT_RESERVED =
	"an export with no `from` names a binding, which a reserved word cannot be";
const DUPLICATE_EXPORT = "a module exports each name once";
const NEW_TARGET = "`new.target` is only allowed inside a function or static block";
const PARAMETER_CLASH =
	"a parameter list with a pattern may not bind a name twice, sloppy or not";
const REDECLARED =
	"a lexical binding, an import's included, may not share a name in its scope";
const SUPER_OUTSIDE = "`super` is only allowed inside a method";
const AWAIT_IN_SCRIPT = "top-level `await` is only allowed in a module";
const USING_IN_SCRIPT = "`using` may not be declared at the top level of a script";
const AUTO_ACCESSOR =
	"`accessor` fields are a proposal; the spec reads `accessor` as a field name, which a name may not follow";
const INVALID_PATTERN = "a regular expression literal must hold a valid pattern";
const FOR_OF_SEQUENCE =
	"the right of `for…of` is an AssignmentExpression, never a comma sequence";

/**
 * Sources webpack refuses where the reference reads them, each with the rule
 * the source breaks: webpack reads with its own parser alone, as the spec has
 * it. A source no longer refused fails until retired.
 * @type {Record<string, string>}
 */
const REFUSED_BY_WEBPACK = {
	"oxc minifier: ecmascript/may_have_side_effects.rs:465": SUPER_OUTSIDE,
	"oxc minifier: ecmascript/may_have_side_effects.rs:818": AUTO_ACCESSOR,
	"oxc minifier: ecmascript/may_have_side_effects.rs:819": AUTO_ACCESSOR,
	"oxc minifier: ecmascript/may_have_side_effects.rs:821": AUTO_ACCESSOR,
	"oxc minifier: ecmascript/may_have_side_effects.rs:822": AUTO_ACCESSOR,
	"oxc minifier: ecmascript/may_have_side_effects.rs:823": AUTO_ACCESSOR,
	"oxc minifier: ecmascript/may_have_side_effects.rs:824": AUTO_ACCESSOR,
	"oxc minifier: mangler/property_mangler.rs:311": AUTO_ACCESSOR,
	"oxc minifier: peephole/remove_unused_declaration.rs:356": AUTO_ACCESSOR,
	"oxc minifier: peephole/remove_unused_declaration.rs:357": AUTO_ACCESSOR,
	"oxc minifier: peephole/remove_unused_expression.rs:752": AUTO_ACCESSOR,
	"oxc minifier: peephole/remove_unused_expression.rs:753": AUTO_ACCESSOR,
	"oxc minifier: peephole/remove_unused_expression.rs:859": AUTO_ACCESSOR,
	"oxc minifier: peephole/remove_unused_private_members.rs:49": AUTO_ACCESSOR,
	"oxc minifier: peephole/remove_unused_private_members.rs:53": AUTO_ACCESSOR,
	"oxc minifier: peephole/replace_known_methods.rs:1260": INVALID_PATTERN,
	"oxc minifier: peephole/replace_known_methods.rs:1262": INVALID_PATTERN,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:705": AUTO_ACCESSOR,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:718": AUTO_ACCESSOR,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:720": AUTO_ACCESSOR,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:737": AUTO_ACCESSOR,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:742": AUTO_ACCESSOR,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:744": AUTO_ACCESSOR,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:746": AUTO_ACCESSOR,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:757": AUTO_ACCESSOR,
	"oxc minifier: peephole/substitute_alternate_syntax.rs:760": AUTO_ACCESSOR,
	"swc minifier: fixture/issues/11133/input.js": REDECLARED,
	"terser compress: class-properties/parens_in": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_10": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_11": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_2": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_3": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_4": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_5": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_6": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_7": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_8": PRIVATE_UNDECLARED,
	"terser compress: class-properties/parens_in_9": PRIVATE_UNDECLARED,
	"terser compress: class-properties/privatein_precedence": PRIVATE_UNDECLARED,
	"terser compress: class-properties/privatein_precedence_2": PRIVATE_UNDECLARED,
	"terser compress: class-properties/privatein_precedence_3": PRIVATE_UNDECLARED,
	"terser compress: evaluate/unsafe_object_accessor": SETTER_ARITY,
	"terser compress: export/export_default_string": EXPORT_RESERVED,
	"terser compress: export/export_multiple_named_default_string": EXPORT_RESERVED,
	"terser compress: export/export_named_string": DUPLICATE_EXPORT,
	"terser compress: export/keyword_invalid_1": EXPORT_RESERVED,
	"terser compress: export/keyword_invalid_2": EXPORT_RESERVED,
	"terser compress: export/keyword_invalid_3": EXPORT_RESERVED,
	"terser compress: harmony/class_statics": SETTER_ARITY,
	"terser compress: harmony/export_from_statement": DUPLICATE_EXPORT,
	"terser compress: harmony/import_statement": REDECLARED,
	"terser compress: harmony/issue_2794_6": FOR_OF_SEQUENCE,
	"terser compress: harmony/new_target": NEW_TARGET,
	"terser compress: issue-12/keep_name_of_setter": SETTER_ARITY,
	"terser compress: parameters/accept_duplicated_parameters_in_non_strict_without_spread_or_default_assignment": PARAMETER_CLASH,
	"terser compress: pure_getters/issue_2265_3": SETTER_ARITY,
	"terser compress: reduce_vars/defun_catch_4": REDECLARED,
	"terser compress: reduce_vars/defun_catch_5": REDECLARED,
	"terser compress: super/super_can_be_parsed": SUPER_OUTSIDE,
	"terser compress: toplevel-await/toplevel_await": AWAIT_IN_SCRIPT,
	"terser compress: toplevel-await/toplevel_await_for": AWAIT_IN_SCRIPT,
	"terser compress: using/multiple_using_can_be_joined_with_join_vars": USING_IN_SCRIPT,
	"terser compress: using/unused_using_should_be_kept": USING_IN_SCRIPT,
	"terser compress: using/using_basic": USING_IN_SCRIPT,
	"terser compress: using/using_definition_transformer": USING_IN_SCRIPT,
	"terser compress: using/using_multiple": USING_IN_SCRIPT,
	"terser compress: using/using_should_be_kept_with_defaults_unsafe": USING_IN_SCRIPT,
	"terser compress: using/using_with_comments": USING_IN_SCRIPT,
	"terser compress: yield/yield_as_identifier_outside_strict_mode": REDECLARED,
	"test262: grammar-field-accessor.js": AUTO_ACCESSOR,
	"test262: private-auto-accessor.js": AUTO_ACCESSOR,
	"test262: public-auto-accessor.js": AUTO_ACCESSOR,
};
/* cspell:enable */

/**
 * Whether two outcomes agree: the same code, or both a refusal, whatever
 * either says, since the two parsers word their errors each their own way.
 * @param {Outcome} a an outcome
 * @param {Outcome} b another
 * @returns {boolean} whether they agree
 */
const sameOutcome = (a, b) =>
	a.code === b.code && (a.error === undefined) === (b.error === undefined);

// What this run met of the tables above, so an entry it no longer meets fails
// instead of lingering.
/** @type {Set<string>} */
const refusalsSeen = new Set();
/** @type {Set<string>} */
const webpackRefusalsSeen = new Set();
/** @type {Set<string>} */
const misprintsSeen = new Set();
/** @type {Set<string>} */
const improvedYetBiggerSeen = new Set();

/**
 * Outputs the `improve` phase writes shorter yet gzip compresses worse, each
 * with why; an entry that stops compressing worse fails until retired.
 * @type {Record<string, string>}
 */
const IMPROVED_YET_BIGGER = {
	"projects/files/jquery.mobile-1.4.2.js (its own options)":
		"40 bytes fewer, 3 more gzipped: `this.p=c?x:y` breaks the `c?this.p=x:this.p=y` runs gzip reused",
	"projects/files/jquery.mobile-1.4.2.js (the default minimizer's options)":
		"30 bytes fewer, 2 more gzipped: `this.p=c?x:y` breaks the `c?this.p=x:this.p=y` runs gzip reused",
	"fixture/next/regression-1/framework-798bab57daac3897/input.js (its own options)":
		"195 bytes fewer, 23 more gzipped: `!!x` in place of `null!==x` breaks the runs of `null!==` gzip reused",
	"fixture/next/regression-1/framework-798bab57daac3897/input.js (the default minimizer's options)":
		"214 bytes fewer, 6 more gzipped: `!!x` in place of `null!==x` breaks the runs of `null!==` gzip reused",
	"projects/files/react-17.0.1.js (its own options)":
		"33 bytes fewer, 3 more gzipped: `!!x` in place of `null!==x` breaks the runs of `null!==` gzip reused",
	"benches-full/vue.js (the default minimizer's options)":
		"9 bytes fewer, 6 more gzipped: the shorter `typeof x<\"u\"` and constructor calls break runs gzip reused",
	"fixture/projects/next/.archive-4/framework-054ead69ea8124b4cb27/input.js (its own options)":
		"83 bytes fewer, 8 more gzipped: the shorter `typeof x<\"u\"` breaks the `\"…\"!=typeof` runs gzip reused",
	"fixture/projects/next/.archive-4/framework-054ead69ea8124b4cb27/input.js (the default minimizer's options)":
		"83 bytes fewer, 3 more gzipped: the shorter `typeof x<\"u\"` breaks the `\"…\"!=typeof` runs gzip reused",
	"evaluate/string_case (the default minimizer's options)":
		"57 bytes fewer, 5 more gzipped: `\"I\".toLowerCase().charCodeAt(0)` matched the calls around it",
	"evaluate/string_case (a module mangled at its top level)":
		"57 bytes fewer, 5 more gzipped: `\"I\".toLowerCase().charCodeAt(0)` matched the calls around it",
	"evaluate/string_case (reminify 2 {\"mangle\":false})":
		"57 bytes fewer, 5 more gzipped: `\"I\".toLowerCase().charCodeAt(0)` matched the calls around it",
	"evaluate/string_case (reminify 3 {})":
		"57 bytes fewer, 5 more gzipped: `\"I\".toLowerCase().charCodeAt(0)` matched the calls around it",
	"evaluate/string_case (reminify 4 {\"toplevel\":true})":
		"57 bytes fewer, 5 more gzipped: `\"I\".toLowerCase().charCodeAt(0)` matched the calls around it",
	"evaluate/string_case (reminify 7 {\"safari10\":true})":
		"57 bytes fewer, 5 more gzipped: `\"I\".toLowerCase().charCodeAt(0)` matched the calls around it",
	"evaluate/string_case (reminify 8 {\"compress\":{\"reduce_funcs\":false}})":
		"57 bytes fewer, 5 more gzipped: `\"I\".toLowerCase().charCodeAt(0)` matched the calls around it",
	"harmony/issue_2345 (the default minimizer's options)":
		"10 bytes fewer, 7 more gzipped: the folded `[3,2,1].join(\"-\")` matched the one left after it",
	"harmony/issue_2345 (reminify 2 {\"mangle\":false})":
		"10 bytes fewer, 7 more gzipped: the folded `[3,2,1].join(\"-\")` matched the one left after it",
	"harmony/issue_2345 (reminify 3 {})":
		"10 bytes fewer, 7 more gzipped: the folded `[3,2,1].join(\"-\")` matched the one left after it",
	"harmony/issue_2345 (reminify 7 {\"safari10\":true})":
		"10 bytes fewer, 7 more gzipped: the folded `[3,2,1].join(\"-\")` matched the one left after it",
	"harmony/issue_2345 (reminify 8 {\"compress\":{\"reduce_funcs\":false}})":
		"10 bytes fewer, 7 more gzipped: the folded `[3,2,1].join(\"-\")` matched the one left after it",
	"fixture/issues/12215/input.js (its own options)":
		"20 bytes fewer, 5 more gzipped: the folded global call matched a shadowed one beside it",
	"issue_8864_1 (its own options)":
		"19 bytes fewer, 1 more gzipped: the folded `toUpperCase()` matched the one left in the template",
	"S15.1.3.3_A4_T2.js (the default minimizer's options)":
		"51 bytes fewer, 19 more gzipped: each folded lower-cased URL no longer repeats the upper-cased one",
	"S15.1.3.4_A4_T2.js (the default minimizer's options)":
		"51 bytes fewer, 19 more gzipped: each folded lower-cased URL no longer repeats the upper-cased one",
	"S15.1.2.3_A1_T6.js (the default minimizer's options)":
		"52 bytes fewer, 2 more gzipped: each folded `parseFloat` call matched the one in its message",
	"S15.1.2.2_A7.2_T3.js (the default minimizer's options)":
		"323 bytes fewer, 2 more gzipped: each folded `parseInt` call matched the one in its message",
	"parseInt-default-to-decimal.js (the default minimizer's options)":
		"60 bytes fewer, 1 more gzipped: each folded `parseInt` call matched the one in the strict function",
	"issue-597/beautify_off_1 (its own options)":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_off_1 (the default minimizer's options)":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_off_1 (a module mangled at its top level)":
		"17 bytes fewer, 5 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_off_1 (reminify 2 {\"mangle\":false})":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_off_1 (reminify 3 {})":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_off_1 (reminify 4 {\"toplevel\":true})":
		"17 bytes fewer, 5 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_off_1 (reminify 7 {\"safari10\":true})":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_off_1 (reminify 8 {\"compress\":{\"reduce_funcs\":false}})":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_on_1 (its own options)":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_on_1 (the default minimizer's options)":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_on_1 (a module mangled at its top level)":
		"17 bytes fewer, 5 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_on_1 (reminify 2 {\"mangle\":false})":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_on_1 (reminify 3 {})":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_on_1 (reminify 4 {\"toplevel\":true})":
		"17 bytes fewer, 5 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_on_1 (reminify 7 {\"safari10\":true})":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"issue-597/beautify_on_1 (reminify 8 {\"compress\":{\"reduce_funcs\":false}})":
		"17 bytes fewer, 6 more gzipped: `\"Infinity\"` and `\"NaN\"` broke the run of `.toString()` calls gzip reused",
	"does-not-use-prototype-properties.js (the default minimizer's options)":
		"8 bytes fewer, 2 more gzipped: the folded `Array.of` matched the `Array.of.call` left after it",
	"return-a-new-array-object.js (the default minimizer's options)":
		"8 bytes fewer, 1 more gzipped: the folded `Array.of` matched the `Array.of.call` left after it",
	"coerced-indexes.js (the default minimizer's options)":
		"40 bytes fewer, 2 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"positive-infinity.js (the default minimizer's options)":
		"21 bytes fewer, 2 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.5_A2_T2.js (the default minimizer's options)":
		"61 bytes fewer, 4 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.10_A2.1_T3.js (the default minimizer's options)":
		"21 bytes fewer, 2 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.10_A2.1_T4.js (the default minimizer's options)":
		"20 bytes fewer, 5 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.10_A2.2_T3.js (the default minimizer's options)":
		"21 bytes fewer, 3 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.10_A2.2_T4.js (the default minimizer's options)":
		"20 bytes fewer, 4 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.12_A2.1_T3.js (the default minimizer's options)":
		"21 bytes fewer, 4 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.12_A2.1_T4.js (the default minimizer's options)":
		"20 bytes fewer, 4 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.12_A2.2_T3.js (the default minimizer's options)":
		"21 bytes fewer, 3 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.12_A2.2_T4.js (the default minimizer's options)":
		"20 bytes fewer, 5 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.13_A1_T2.js (the default minimizer's options)":
		"42 bytes fewer, 1 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.4.4.13_A2_T2.js (the default minimizer's options)":
		"20 bytes fewer, 1 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"not-an-object-throws.js (the default minimizer's options)":
		"20 bytes fewer, 2 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.7.4.5_A1.4_T01.js (the default minimizer's options)":
		"28 bytes fewer, 2 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.5.4.19_A1_T6.js (the default minimizer's options)":
		"36 bytes fewer, 1 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"S15.5.4.18_A1_T6.js (the default minimizer's options)":
		"36 bytes fewer, 1 more gzipped: the folded `Number` constant stays quoted in the messages, which gzip had matched",
	"fixture/issues/number-radix-conversion/input.js (its own options)":
		"6 bytes fewer, 9 more gzipped: the folded base-36 digits are a string gzip finds no run in",
	"fixture/issues/number-radix-conversion/input.js (the default minimizer's options)":
		"6 bytes fewer, 9 more gzipped: the folded base-36 digits are a string gzip finds no run in",
	"RGI_Emoji_Flag_Sequence.js (the default minimizer's options)":
		"507 bytes fewer, 8 more gzipped: each emoji sequence split out of the array loses the quotes gzip matched around the same code points",
	"RGI_Emoji_Modifier_Sequence.js (the default minimizer's options)":
		"1319 bytes fewer, 22 more gzipped: each emoji sequence split out of the array loses the quotes gzip matched around the same code points",
	"rgi-emoji-14.0.js (the default minimizer's options)":
		"213 bytes fewer, 6 more gzipped: each emoji sequence split out of the array loses the quotes gzip matched around the same code points",
	"rgi-emoji-15.1.js (the default minimizer's options)":
		"225 bytes fewer, 9 more gzipped: each emoji sequence split out of the array loses the quotes gzip matched around the same code points",
	"rgi-emoji-17.0.js (the default minimizer's options)":
		"315 bytes fewer, 3 more gzipped: each emoji sequence split out of the array loses the quotes gzip matched around the same code points",
	"exponential.js (the default minimizer's options)":
		"421 bytes fewer, 15 more gzipped: each folded call repeats the string the test asserts it equals",
	"fixture/issues/6957/exponential/input.js (its own options)":
		"421 bytes fewer, 14 more gzipped: each folded call repeats the string the test asserts it equals",
	"fixture/issues/6957/exponential/input.js (the default minimizer's options)":
		"421 bytes fewer, 15 more gzipped: each folded call repeats the string the test asserts it equals",
	"range.js (the default minimizer's options)":
		"11 to 14 bytes fewer, 2 to 3 more gzipped: each folded call repeats the string the test asserts it equals",
	"return-values.js (the default minimizer's options)":
		"392 bytes fewer, 18 more gzipped: each folded call repeats the string the test asserts it equals",
};

// Sources whose shorter spelling no longer repeats text gzip matched, by the
// spelling written; an entry that stops compressing worse fails until retired.
for (const [reason, keys] of /** @type {[string, string[]][]} */ ([
	[
		"`new` arguments its constructor no longer reads dropped, where a twin `new` beside it keeps them",
		[
			"new/new_statements_3 (a module mangled at its top level)",
			"new/new_statements_3 (the default minimizer's options)"
		]
	],
	[
		"`c ? x : c` written as `c && x` where the source repeats the conditional gzip matched",
		[
			"bound-to-collator-instance.js (the default minimizer's options)",
			"returns-same-results-as-NumberFormat.js (the default minimizer's options)",
			"short-circuit-compound-assignment.js (the default minimizer's options)"
		]
	],
	[
		"`Array` written as a literal where the source writes the call again",
		[
			"S15.4.1_A1.1_T1.js (the default minimizer's options)",
			"S15.4.1_A1.1_T3.js (the default minimizer's options)",
			"S15.4.1_A3.1_T1.js (the default minimizer's options)",
			"array-constructor/array_constructor_unsafe (its own options)",
			"fixture/issues/12201/input.js (its own options)",
			"fixture/issues/12201/input.js (the default minimizer's options)",
			"terser_array_constructor_unsafe (its own options)"
		]
	],
	[
		"`new` dropped before a constructor the source quotes or writes again beside it",
		[
			"15.2.3.5-4-12.js (the default minimizer's options)",
			"15.2.3.5-4-174.js (the default minimizer's options)",
			"15.4.3.2-0-6.js (the default minimizer's options)",
			"15.4.3.2-1-10.js (the default minimizer's options)",
			"15.4.3.2-1-12.js (the default minimizer's options)",
			"15.4.4.20-6-7.js (the default minimizer's options)",
			"15.4.4.20-9-c-iii-23.js (the default minimizer's options)",
			"S11.1.2_A1_T1.js (the default minimizer's options)",
			"S11.10.1_A2.1_T1.js (the default minimizer's options)",
			"S11.10.2_A2.1_T1.js (the default minimizer's options)",
			"S11.11.1_A2.1_T1.js (the default minimizer's options)",
			"S11.11.2_A2.1_T1.js (the default minimizer's options)",
			"S11.13.1_A2.1_T1.js (the default minimizer's options)",
			"S11.14_A2.1_T1.js (the default minimizer's options)",
			"S11.3.1_A2.1_T1.js (the default minimizer's options)",
			"S11.3.2_A2.1_T1.js (the default minimizer's options)",
			"S11.4.1_A4.js (the default minimizer's options)",
			"S11.4.4_A2.1_T1.js (the default minimizer's options)",
			"S11.4.5_A2.1_T1.js (the default minimizer's options)",
			"S11.5.1_A2.1_T1.js (the default minimizer's options)",
			"S11.5.2_A2.1_T1.js (the default minimizer's options)",
			"S11.5.3_A2.1_T1.js (the default minimizer's options)",
			"S11.6.1_A2.1_T1.js (the default minimizer's options)",
			"S11.6.1_A2.2_T2.js (the default minimizer's options)",
			"S11.6.2_A2.1_T1.js (the default minimizer's options)",
			"S11.7.1_A2.1_T1.js (the default minimizer's options)",
			"S11.8.3_A2.1_T1.js (the default minimizer's options)",
			"S11.8.6_A7_T3.js (the default minimizer's options)",
			"S11.9.2_A7.1.js (the default minimizer's options)",
			"S11.9.4_A2.1_T1.js (the default minimizer's options)",
			"S11.9.4_A7.js (the default minimizer's options)",
			"S11.9.5_A2.1_T1.js (the default minimizer's options)",
			"S11.9.5_A7.js (the default minimizer's options)",
			"S15.10.1_A1_T14.js (the default minimizer's options)",
			"S15.10.1_A1_T16.js (the default minimizer's options)",
			"S15.10.2.11_A1_T1.js (the default minimizer's options)",
			"S15.10.3.1_A2_T1.js (the default minimizer's options)",
			"S15.10.4.1_A1_T4.js (the default minimizer's options)",
			"S15.10.4.1_A8_T12.js (the default minimizer's options)",
			"S15.10.7_A2_T2.js (the default minimizer's options)",
			"S15.3.5.3_A2_T2.js (the default minimizer's options)",
			"S15.3.5_A1_T1.js (the default minimizer's options)",
			"S15.4.2.1_A1.1_T3.js (the default minimizer's options)",
			"S15.4.2.2_A1.1_T3.js (the default minimizer's options)",
			"S15.4.2.2_A2.2_T3.js (the default minimizer's options)",
			"S15.4.4.11_A1.1_T1.js (the default minimizer's options)",
			"S15.4.4.11_A1.5_T1.js (the default minimizer's options)",
			"S15.4.4.2_A1_T3.js (the default minimizer's options)",
			"S15.4.4.5_A1.2_T1.js (the default minimizer's options)",
			"S15.4.4.5_A1.2_T2.js (the default minimizer's options)",
			"S15.4.4.5_A3.1_T1.js (the default minimizer's options)",
			"S15.4.4.5_A3.2_T1.js (the default minimizer's options)",
			"S15.4.4.5_A3.2_T2.js (the default minimizer's options)",
			"S15.4.4.6_A1.1_T1.js (the default minimizer's options)",
			"S15.4.4.6_A1.2_T1.js (the default minimizer's options)",
			"S15.4.4.9_A1.1_T1.js (the default minimizer's options)",
			"S15.4.4.9_A1.2_T1.js (the default minimizer's options)",
			"S15.5.1.1_A1_T19.js (the default minimizer's options)",
			"S15.5.1.1_A1_T8.js (the default minimizer's options)",
			"S15.5.2.1_A1_T19.js (the default minimizer's options)",
			"S15.5.4.13_A3_T1.js (the default minimizer's options)",
			"S15.5.4.15_A3_T1.js (the default minimizer's options)",
			"S15.5.4.15_A3_T11.js (the default minimizer's options)",
			"S15.5.4.15_A3_T2.js (the default minimizer's options)",
			"S15.5.4.15_A3_T3.js (the default minimizer's options)",
			"S15.5.4.15_A3_T4.js (the default minimizer's options)",
			"S15.5.4.15_A3_T5.js (the default minimizer's options)",
			"S15.5.4.15_A3_T6.js (the default minimizer's options)",
			"S15.5.4.17_A1_T14.js (the default minimizer's options)",
			"S15.5.4.19_A1_T14.js (the default minimizer's options)",
			"S15.5.4.7_A1_T12.js (the default minimizer's options)",
			"S15.5.4.8_A1_T12.js (the default minimizer's options)",
			"S15.6.4.2_A1_T1.js (the default minimizer's options)",
			"S15.6.4.2_A1_T2.js (the default minimizer's options)",
			"S15.6.4.3_A1_T1.js (the default minimizer's options)",
			"S8.12.8_A1.js (the default minimizer's options)",
			"S8.12.8_A2.js (the default minimizer's options)",
			"S8.6.2_A6.js (the default minimizer's options)",
			"S8.7_A5_T1.js (the default minimizer's options)",
			"argument-is-new-reg-exp-and-instance-is-string-hello.js (the default minimizer's options)",
			"arguments-are-new-reg-exp-and-4-and-instance-is-string-hello.js (the default minimizer's options)",
			"arguments-are-new-reg-exp-and-hi-and-instance-is-string-hello.js (the default minimizer's options)",
			"arguments-are-new-reg-exp-and-undefined-and-instance-is-string-hello.js (the default minimizer's options)",
			"arguments-are-new-reg-exp-and-void-0-and-instance-is-string-hello.js (the default minimizer's options)",
			"built-in-exotic-objects-no-call.js (the default minimizer's options)",
			"constructor-ArrayBuffer-species-wrap.js (the default minimizer's options)",
			"get-next-method-throws.js (the default minimizer's options)",
			"next-method-returns-throwing-done.js (the default minimizer's options)",
			"next-method-returns-throwing-value-done.js (the default minimizer's options)",
			"next-method-returns-throwing-value.js (the default minimizer's options)",
			"next-method-throws.js (the default minimizer's options)",
			"next-throws.js (the default minimizer's options)",
			"non-callable-join-string-tag.js (the default minimizer's options)",
			"optional-catch-binding-throws.js (the default minimizer's options)",
			"predicate-throws-then-closing-iterator-also-throws.js (the default minimizer's options)",
			"quantifier-integer-limit.js (the default minimizer's options)",
			"sorting_buffer_access.js (the default minimizer's options)",
			"symbol-tag-override-instances.js (the default minimizer's options)",
			"this-val-regexp.js (the default minimizer's options)",
			"try-finally-nested-try-catch-within-catch.js (the default minimizer's options)",
			"try-finally-nested-try-catch-within-outer-try-after-nested.js (the default minimizer's options)",
			"yield-promise-reject-next-for-await-of-sync-iterator.js (the default minimizer's options)",
			"yield-promise-reject-next-yield-star-async-iterator.js (the default minimizer's options)"
		]
	],
	[
		"a `+` dropped beside a number literal where the source quotes it",
		[
			"exp-operator-precedence-unary-expression-semantics.js (the default minimizer's options)"
		]
	],
	[
		"`typeof x<\"u\"` where the source repeats the `\"undefined\"` comparison gzip matched",
		[
			"S11.1.6_A3_T7.js (the default minimizer's options)",
			"S12.6.2_A2.js (the default minimizer's options)",
			"S13.2.2_A15_T1.js (the default minimizer's options)",
			"S13.2.2_A15_T3.js (the default minimizer's options)",
			"S13.2.2_A16_T2.js (the default minimizer's options)",
			"S13.2.2_A16_T3.js (the default minimizer's options)",
			"S13_A1.js (the default minimizer's options)",
			"S14_A3.js (the default minimizer's options)",
			"S8.7_A5_T2.js (the default minimizer's options)"
		]
	],
	[
		"a conversion or a `!!` written shorter where the source's own messages quote it, which gzip matched",
		[
			"S15.2.4.3_A9.js (the default minimizer's options)",
			"S15.5.1.1_A1_T10.js (the default minimizer's options)",
			"S15.5.1.1_A1_T16.js (the default minimizer's options)",
			"S15.5.1.1_A1_T17.js (the default minimizer's options)",
			"S15.5.1.1_A1_T2.js (the default minimizer's options)",
			"S15.5.1.1_A1_T3.js (the default minimizer's options)",
			"S15.5.1.1_A2_T1.js (the default minimizer's options)",
			"S15.5.4.10_A1_T7.js (the default minimizer's options)",
			"S15.5.4.12_A1_T7.js (the default minimizer's options)",
			"S15.6.1.1_A1_T5.js (the default minimizer's options)",
			"S15.6.1.1_A2.js (the default minimizer's options)",
			"symbol-coercion.js (the default minimizer's options)",
			"symbol-tag-non-str-bigint.js (the default minimizer's options)"
		]
	],
	[
		"an empty constructor dropped where the source repeats it gzip matched",
		[
			"classConstructorNoCall.js (the default minimizer's options)",
			"className.js (the default minimizer's options)",
			"harmony/classes (the default minimizer's options)",
			"staticConstructor.js (the default minimizer's options)",
			"superElemDelete.js (the default minimizer's options)",
			"superPropChains.js (the default minimizer's options)",
			"superPropStatics.js (the default minimizer's options)"
		]
	],
	[
		"a literal folded into the string it makes where the source repeats the literal gzip matched",
		[
			"evaluate/unsafe_array (a module mangled at its top level)",
			"evaluate/unsafe_array (reminify 2 {\"mangle\":false})",
			"evaluate/unsafe_array (reminify 3 {})",
			"evaluate/unsafe_array (reminify 4 {\"toplevel\":true})",
			"evaluate/unsafe_array (reminify 7 {\"safari10\":true})",
			"evaluate/unsafe_array (reminify 8 {\"compress\":{\"reduce_funcs\":false}})",
			"evaluate/unsafe_array (the default minimizer's options)",
			"fixture/issues/string-index-utf16/input.js (its own options)",
			"fixture/issues/string-index-utf16/input.js (the default minimizer's options)"
		]
	],
	[
		"a pattern's unused names dropped where the source repeats the pattern gzip matched",
		[
			"array-elements-without-initializer.js (the default minimizer's options)",
			"parameters/default_values_in_destructurings (a module mangled at its top level)"
		]
	]
])) {
	for (const key of keys) IMPROVED_YET_BIGGER[key] = reason;
}

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
 * Runs `run` with each enabled switch turned off, as though the printer had
 * no such phase, and turns them back on after.
 * @template T
 * @param {({ enabled: boolean } | undefined)[]} switches the phases' switches
 * @param {() => Promise<T>} run what to run
 * @returns {Promise<T>} what it returned
 */
const outcomeWithout = async (switches, run) => {
	const off = /** @type {{ enabled: boolean }[]} */ (
		switches.filter((phase) => phase && phase.enabled)
	);
	for (const phase of off) phase.enabled = false;
	try {
		return await run();
	} finally {
		for (const phase of off) phase.enabled = true;
	}
};

/**
 * Whether only writing `const` as `let` makes a program gzip bigger: shorter,
 * it is bigger gzipped than without, as `const` matched `console` nearby, and
 * with that alone switched off the improvements gzip no bigger.
 * @param {{ raw: number, gzip: number }} withSize the size with the improvements
 * @param {{ raw: number, gzip: number }} withoutSize the size without them
 * @param {() => Promise<{ code?: string, error?: string }>} run minifies the program
 * @param {{ lets: { enabled: boolean } } | undefined} improvements the improvements' switches
 * @returns {Promise<boolean>} true when it does
 */
const onlyLetsGzipWorse = async (withSize, withoutSize, run, improvements) => {
	if (!improvements || withSize.raw >= withoutSize.raw) return false;
	const withoutLets = await outcomeWithout([improvements.lets], run);
	if (withoutLets.code === undefined) return false;
	const size = sizeOf(withoutLets.code);
	return size.raw > withSize.raw && size.gzip <= withoutSize.gzip;
};

/** @typedef {{ filename: string, input: string, options: EXPECTED_OBJECT }} OxcJob */

/**
 * The options webpack's printer is given, as oxc spells them.
 * @param {MinifyOptions & { keep_fnames?: boolean, keep_classnames?: boolean }} options the options
 * @returns {{ filename: string, options: EXPECTED_OBJECT }} oxc's file name and options
 */
const oxcOptionsOf = (options) => {
	const keepNames = {
		function: Boolean(options.keep_fnames),
		class: Boolean(options.keep_classnames)
	};
	const module = Boolean(options.module);
	return {
		filename: module ? "input.mjs" : "input.js",
		options: {
			module,
			compress: { keepNames },
			mangle: { toplevel: module, keepNames },
			codegen: { removeWhitespace: true }
		}
	};
};

const oxcBatch = path.resolve(__dirname, "../helpers/oxcMinifyBatch.js");

/**
 * oxc's output for each job, in a process of its own, since a panic in oxc
 * aborts the process it runs in; a batch that aborts is run again job by job.
 * @param {OxcJob[]} jobs the sources and their options
 * @returns {(string | null | Error)[]} each output, null where oxc refused it,
 * or the error where oxc aborted
 */
const minifyAllWithOxc = (jobs) => {
	if (jobs.length === 0) return [];
	const child = spawnSync(process.execPath, [oxcBatch], {
		input: JSON.stringify(jobs),
		maxBuffer: 1024 * 1024 * 1024
	});
	if (child.status === 0) return JSON.parse(child.stdout.toString("utf8"));
	if (jobs.length === 1) {
		return [new Error(child.stderr.toString("utf8").split("\n")[1] || "aborted")];
	}
	return jobs.flatMap((job) => minifyAllWithOxc([job]));
};

/**
 * @param {string} directory a corpus directory
 * @returns {boolean} whether its submodule is checked out
 */
const isPresent = (directory) =>
	fs.existsSync(directory) && fs.readdirSync(directory).length > 0;

/**
 * @param {string} code a program
 * @returns {{ raw: number, gzip: number }} its size, and gzipped at level 9
 */
const sizeOf = (code) => ({
	raw: Buffer.byteLength(code),
	gzip: zlib.gzipSync(code, { level: 9 }).length
});

/**
 * Where webpack's output stands beside another minifier's: gzip decides, and
 * raw breaks a tie, as `docs/performance.md` weighs a size change.
 * @param {Lead} lead both sizes
 * @returns {Standing} webpack's standing
 */
const standingOf = ({ ours, theirs, oursGzip, theirsGzip }) => {
	const delta = oursGzip !== theirsGzip ? oursGzip - theirsGzip : ours - theirs;
	return delta > 0 ? "worse" : delta < 0 ? "better" : "same";
};

/**
 * @param {Lead[]} leads every comparison with another minifier's output
 * @returns {string} a tally, and a Markdown table each of where webpack's is worse and better
 */
const formatLeads = (leads) => {
	/**
	 * @param {Standing} standing which rows
	 * @returns {string[]} those rows, the most gzip bytes apart first
	 */
	const table = (standing) => [
		"| Source | Rival | Ours | Theirs | Raw more | Gzip more |",
		"| --- | --- | --: | --: | --: | --: |",
		...leads
			.filter((lead) => standingOf(lead) === standing)
			.sort(
				(a, b) =>
					Math.abs(b.oursGzip - b.theirsGzip) -
						Math.abs(a.oursGzip - a.theirsGzip) ||
					Math.abs(b.ours - b.theirs) - Math.abs(a.ours - a.theirs)
			)
			.map(
				(lead) =>
					`| ${lead.source} | ${lead.rival} | ${lead.ours} | ${lead.theirs} | ${lead.ours - lead.theirs} | ${lead.oursGzip - lead.theirsGzip} |`
			)
	];
	/**
	 * @param {Standing} standing which rows
	 * @returns {number} how many
	 */
	const count = (standing) =>
		leads.filter((lead) => standingOf(lead) === standing).length;
	return [
		"# webpack's output beside another minifier's recorded output",
		"",
		"Both printed alone by webpack's printer; gzip decides, raw breaks a tie.",
		"",
		`Worse: ${count("worse")}, the same: ${count("same")}, better: ${count("better")}.`,
		"",
		"## Worse",
		"",
		...table("worse"),
		"",
		"## Better",
		"",
		...table("better"),
		""
	].join("\n");
};

describe("JavaScript minifier", () => {
	/** @type {{ reader?: CaseReader, printer?: { minify: Minify, phases: string[], corrections: { enabled: boolean } | undefined, improvements?: { enabled: boolean, lets: { enabled: boolean } } | undefined }, sandbox?: { run_code: (code: string, prepend: string) => string | Error, same_stdout: (expected: string | Error, actual: string | Error) => boolean } }} */
	const loaded = {};
	/** @type {Lead[]} */
	const leads = [];
	const { runInNewContext } = vm;
	// Whether the sandbox also drains promise callbacks: swc's harness runs a
	// whole process, terser's runner captures only what runs synchronously.
	let microtasks = false;

	beforeAll(async () => {
		loaded.printer = await load();
		if (!isPresent(referenceDir)) return;
		// eslint-disable-next-line no-new-func
		const importModule = new Function("specifier", "return import(specifier)");
		/**
		 * @param {string} file a file in the reference checkout
		 * @returns {Promise<EXPECTED_ANY>} the module
		 */
		const at = (file) =>
			importModule(pathToFileURL(path.join(referenceDir, file)).href);
		// Read for their effect: `minify` reaches `transform` on every node
		// class, and a case's input is printed as terser's runner prints it.
		await at("lib/transform.js");
		await at("lib/scope.js");
		await at("lib/output.js");
		const { minify_sync: minifySync } = await at("lib/minify.js");
		/** @type {Map<string, boolean>} */
		const known = new Map();
		loaded.reader = {
			AST: await at("lib/ast.js"),
			parse: (await at("lib/parse.js")).parse,
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
		loaded.sandbox = await at("test/sandbox.js");
		vm.runInNewContext = (code, context, options) =>
			runInNewContext(code, context, {
				...options,
				timeout: RUN_TIMEOUT,
				...(microtasks && { microtaskMode: "afterEvaluate" })
			});
	});

	afterAll(() => {
		vm.runInNewContext = runInNewContext;
		const report = process.env.JS_MINIFY_REPORT;
		if (report) fs.writeFileSync(report, formatLeads(leads));
	});

	it("should run only the node_version ranges it can read", () => {
		const major = Number(process.versions.node.split(".")[0]);
		expect(nodeSatisfies(`>=${major}`)).toBe(true);
		expect(nodeSatisfies(`>= ${major}`)).toBe(true);
		expect(nodeSatisfies(`>=${major}.0.0`)).toBe(true);
		expect(nodeSatisfies(`>=${major + 1}`)).toBe(false);
		expect(() => nodeSatisfies(`^${major}`)).toThrow(/Unsupported/);
	});

	if (isPresent(referenceDir)) {
		it("should pin the reference's corpus to the version it is compared with", () => {
			const pinned = JSON.parse(
				fs.readFileSync(path.join(referenceDir, "package.json"), "utf8")
			).version;
			expect(pinned).toBe(require("terser/package.json").version);
		});
	}

	if (isPresent(oxcTestsDir)) {
		it("should pin oxc's corpus to the oxc-minify it is compared with", () => {
			const pinned = JSON.parse(
				fs.readFileSync(
					path.join(externalDir, "oxc/napi/minify/package.json"),
					"utf8"
				)
			).version;
			expect(pinned).toBe(require("oxc-minify/package.json").version);
		});
	}

	/**
	 * @param {Stdout} stdout what a source prints
	 * @param {string} code a program
	 * @returns {string | Error} what it prints, or the error it throws
	 */
	const run = (stdout, code) => {
		const { run_code: runCode } = /** @type {NonNullable<typeof loaded.sandbox>} */ (
			loaded.sandbox
		);
		microtasks = Boolean(stdout.microtasks);
		try {
			return runCode(code, stdout.prepend);
		} finally {
			microtasks = false;
		}
	};

	/**
	 * What a source's input prints, where the sandbox can tell: an input that
	 * prints nothing or throws where it should print says nothing to hold to.
	 * @param {Stdout} stdout what a source prints
	 * @returns {{ expected?: string | Error, disagrees?: string }} the answer
	 */
	const expectedOf = (stdout) => {
		const { same_stdout: sameStdout } =
			/** @type {NonNullable<typeof loaded.sandbox>} */ (loaded.sandbox);
		const printed = run(stdout, stdout.input);
		// terser's runner holds an output to whatever its input does, a throw or
		// silence included; swc's harness needs the input to print.
		if (stdout.expected === true) {
			return stdout.strict || (typeof printed === "string" && printed !== "")
				? { expected: printed }
				: {};
		}
		if (sameStdout(stdout.expected, printed)) return { expected: stdout.expected };
		// swc's harness runs a whole Node process, with `process` and timers,
		// where terser's sandbox has neither: only terser's own cases must agree.
		return stdout.strict
			? {
					disagrees: `the input prints ${String(printed)}, not ${String(stdout.expected)}`
				}
			: {};
	};

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
				let runnable = 0;
				let rivals = 0;
				for (const { files } of groups) {
					for (const file of files) {
						for (const source of corpus.read(file, reader)) {
							count++;
							if (source.own) own++;
							if (source.stdout) runnable++;
							if (source.rival) rivals++;
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
				if (corpus.minimumRun !== undefined) {
					expect(runnable).toBeGreaterThan(corpus.minimumRun);
				}
				// Rivals are read from swc's checkout, which another corpus may run without.
				if (corpus.minimumRival !== undefined && isPresent(swcTestsDir)) {
					expect(rivals).toBeGreaterThan(corpus.minimumRival);
				}
				if (corpus.ownDefaultsNamed) expect(defaultsUnnamed).toBe(0);
			});

			for (const group of groups) {
				it(
					`should minify as the reference does, printing what the input prints: ${group.name || "."}`,
					async () => {
						const reference = require("terser");

						const reader = /** @type {CaseReader} */ (loaded.reader);
						const printer = /** @type {NonNullable<typeof loaded.printer>} */ (
							loaded.printer
						);
						/** @type {string[]} */
						const differences = [];
						/**
						 * Holds webpack's output to another minifier's, both printed alone
						 * by webpack's printer: no bigger, unless the table lists why.
						 * @param {Source} source the source both minified
						 * @param {{ name: string, code: string }} rival its output
						 * @param {string} code webpack's output
						 * @param {Record<string, string>} table sources listed as bigger
						 * @param {string} tableName the table's name
						 * @returns {Promise<void>} once compared
						 */
						const compareWithRival = async (
							source,
							rival,
							code,
							table,
							tableName
						) => {
							const printing = {
								compress: false,
								mangle: false,
								module: source.module
							};
							const theirs = await outcome(printer.minify, rival.code, printing);
							const mine = await outcome(printer.minify, code, printing);
							if (theirs.code === undefined || mine.code === undefined) return;
							const oursSize = sizeOf(mine.code);
							const theirsSize = sizeOf(theirs.code);
							/** @type {Lead} */
							const lead = {
								source: `${corpus.name}: ${source.name}`,
								rival: rival.name,
								ours: oursSize.raw,
								theirs: theirsSize.raw,
								oursGzip: oursSize.gzip,
								theirsGzip: theirsSize.gzip
							};
							leads.push(lead);
							const worse = standingOf(lead) === "worse";
							const listed = Object.prototype.hasOwnProperty.call(
								table,
								lead.source
							);
							if (worse && !listed) {
								differences.push(
									`${lead.source} is bigger than ${lead.rival}'s output: ${lead.ours} raw, ${lead.oursGzip} gzip, against ${lead.theirs} raw, ${lead.theirsGzip} gzip`
								);
							} else if (!worse && listed) {
								differences.push(
									`${lead.source} is no bigger than ${lead.rival}'s output now: retire it from ${tableName}`
								);
							}
						};
						const sources = group.files.flatMap((file) =>
							corpus.read(file, reader)
						);
						const oxcSet = "the default minimizer's options";
						/** @type {Map<Source, string | null | Error>} */
						const oxcOutputs = new Map();
						if (!corpus.withoutOxc && corpus.optionSets.includes(oxcSet)) {
							const jobs = sources.map((source) => ({
								input: source.input,
								...oxcOptionsOf(
									/** @type {MinifyOptions} */ (OPTION_SETS[oxcSet](source))
								)
							}));
							const outputs = minifyAllWithOxc(jobs);
							for (const [i, source] of sources.entries()) {
								oxcOutputs.set(source, outputs[i]);
							}
						}
						for (const source of sources) {
							const expectation = source.stdout
								? expectedOf(source.stdout)
								: {};
							if (expectation.disagrees) {
								differences.push(`${source.name}: ${expectation.disagrees}`);
							}
							/** @type {Map<string, string | undefined>} */
							const verdicts = new Map();
							for (const setName of corpus.optionSets) {
								const optionsFor = OPTION_SETS[setName];
								const options = optionsFor(source);
								if (!options) continue;
								const theirs = await outcome(
									reference.minify,
									source.input,
									withoutLayout(options)
								);
								const ours = await outcome(
									printer.minify,
									source.input,
									optionsFor(source)
								);
								// A case reading its source with a parser option webpack's
								// parser has no counterpart for holds nothing of webpack's.
								if (
									ours.error !== undefined &&
									DROPPED_PARSE_OPTIONS.some(
										(name) =>
											ours.error === `\`${name}\` is not a supported option`
									)
								) {
									continue;
								}
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
								const { expected } = expectation;
								// Run where the case says what it prints: under its own options
								// always, under another set unless it opts out, and never as a
								// module where it is a script, since a module is strict.
								const runs =
									expected !== undefined &&
									(setName === "its own options" ||
										(source.reminify !== false &&
											!(options.module && !source.module)));
								/**
								 * @param {string} code an output
								 * @returns {string | undefined} how it misprints, if it does
								 */
								const misprint = (code) => {
									const { same_stdout: sameStdout } =
										/** @type {NonNullable<typeof loaded.sandbox>} */ (
											loaded.sandbox
										);
									const stdout = /** @type {Stdout} */ (source.stdout);
									const wanted = /** @type {string | Error} */ (expected);
									let actual = run(stdout, code);
									// As terser's runner reminifies: a throw of the expected kind
									// passes whatever its message says.
									if (
										setName !== "its own options" &&
										typeof wanted !== "string" &&
										typeof actual !== "string" &&
										wanted.name === actual.name
									) {
										actual = wanted;
									}
									return sameStdout(wanted, actual)
										? undefined
										: `\n\toutput:   ${code}\n\texpected: ${String(wanted)}\n\tprinted:  ${String(actual)}`;
								};
								const key = `${corpus.name}: ${source.name} (${setName})`;
								if (!sameOutcome(theirs, ours)) {
									// A difference only the `correct` and `improve` phases make is
									// theirs, which the run check below holds to; any other is a
									// difference, and an improvement must not write more.
									const { corrections, improvements } = printer;
									const unimproved = await outcomeWithout([improvements], () =>
										outcome(printer.minify, source.input, optionsFor(source))
									);
									// Without the improvements terser's bytes back, nothing else differs.
									const uncorrected = sameOutcome(theirs, unimproved)
										? unimproved
											: await outcomeWithout([corrections, improvements], () =>
													outcome(printer.minify, source.input, optionsFor(source))
												);
									if (!sameOutcome(theirs, uncorrected)) {
										const webpackRefusal =
											theirs.code !== undefined &&
											uncorrected.error !== undefined
												? `${corpus.name}: ${source.name}`
												: undefined;
										const refused =
											uncorrected.code !== undefined &&
											typeof theirs.error === "string" &&
											Object.prototype.hasOwnProperty.call(
												REFUSED_BY_REFERENCE,
												theirs.error
											);
										if (
											webpackRefusal !== undefined &&
											Object.prototype.hasOwnProperty.call(
												REFUSED_BY_WEBPACK,
												webpackRefusal
											)
										) {
											webpackRefusalsSeen.add(webpackRefusal);
										} else if (
											webpackRefusal !== undefined &&
											source.invalid
										) {
											// The corpus says the source is not JavaScript.
										} else if (refused) {
											refusalsSeen.add(
												/** @type {string} */ (theirs.error)
											);
										} else if (
											// A misprint is the reference's: webpack must still print.
											uncorrected.code !== undefined &&
											Object.prototype.hasOwnProperty.call(
												REFERENCE_MISPRINTS,
												key
											)
										) {
											misprintsSeen.add(key);
										} else {
											differences.push(
												`${source.name} (${setName})\n\treference: ${JSON.stringify(theirs)}\n\twebpack:   ${JSON.stringify(uncorrected)}`
											);
										}
									}
									if (unimproved.error !== ours.error) {
										differences.push(
											`${source.name} (${setName}) refused differently with the improvements\n\twithout: ${JSON.stringify(unimproved)}\n\twith:    ${JSON.stringify(ours)}`
										);
									} else if (
										ours.code !== undefined &&
										unimproved.code !== undefined &&
										ours.code !== unimproved.code
									) {
										const withSize = sizeOf(ours.code);
										const withoutSize = sizeOf(unimproved.code);
										/** @type {Lead} */
										const lead = {
											source: source.name,
											rival: "unimproved",
											ours: withSize.raw,
											theirs: withoutSize.raw,
											oursGzip: withSize.gzip,
											theirsGzip: withoutSize.gzip
										};
										const key = `${source.name} (${setName})`;
										// Sources sharing a name share an entry, standing while one is bigger;
										// an entry none of them meets fails at the end.
										if (standingOf(lead) === "worse") {
											if (
												Object.prototype.hasOwnProperty.call(IMPROVED_YET_BIGGER, key)
											) {
												improvedYetBiggerSeen.add(key);
											} else if (
												await onlyLetsGzipWorse(
													withSize,
													withoutSize,
													() =>
														outcome(
															printer.minify,
															source.input,
															optionsFor(source)
														),
													improvements
												)
											) {
												// `let` gzips worse than the `const` it replaced in a small program.
											} else {
												differences.push(
												`${key} is bigger with the improvements: ${withSize.raw} raw, ${withSize.gzip} gzip, against ${withoutSize.raw} raw, ${withoutSize.gzip} gzip\n\twith:    ${ours.code}\n\twithout: ${unimproved.code}`
											);
											}
										}
									}
								}
								if (runs && ours.code !== undefined) {
									let wrong = verdicts.get(ours.code);
									if (!verdicts.has(ours.code)) {
										wrong = misprint(ours.code);
										verdicts.set(ours.code, wrong);
									}
									const corrected = Boolean(
										printer.corrections && printer.corrections.enabled
									);
									const table = Object.prototype.hasOwnProperty.call(
										INHERITED,
										key
									)
										? "INHERITED"
										: !corrected &&
											  Object.prototype.hasOwnProperty.call(CORRECTED, key)
											? "CORRECTED"
											: undefined;
									if (wrong !== undefined && table === undefined) {
										differences.push(`${key} prints differently${wrong}`);
									} else if (wrong === undefined && table !== undefined) {
										differences.push(
											`${key} prints what it should now: retire it from ${table}`
										);
									}
								}
								if (
									source.rival &&
									setName === "its own options" &&
									ours.code !== undefined
								) {
									await compareWithRival(
										source,
										source.rival,
										ours.code,
										SWC_SMALLER,
										"SWC_SMALLER"
									);
								}
								const oxc = oxcOutputs.get(source);
								const oxcKey = `${corpus.name}: ${source.name}`;
								if (oxc instanceof Error && setName === oxcSet) {
									if (!Object.prototype.hasOwnProperty.call(OXC_SMALLER, oxcKey)) {
										differences.push(`${oxcKey} aborts oxc: ${oxc.message}`);
									}
								} else if (
									typeof oxc === "string" &&
									setName === oxcSet &&
									ours.code !== undefined &&
									// A smaller output that prints wrong is no lead to follow.
									!(expected !== undefined && runs && misprint(oxc))
								) {
									await compareWithRival(
										source,
										{ name: "oxc", code: oxc },
										ours.code,
										OXC_SMALLER,
										"OXC_SMALLER"
									);
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

	it("should list no difference the reference no longer makes", () => {
		expect([
			...Object.keys(REFUSED_BY_REFERENCE)
				.filter((message) => !refusalsSeen.has(message))
				.map((message) => `REFUSED_BY_REFERENCE: ${message}`),
			...Object.keys(REFUSED_BY_WEBPACK)
				.filter((message) => !webpackRefusalsSeen.has(message))
				.map((message) => `REFUSED_BY_WEBPACK: ${message}`),
			...Object.keys(REFERENCE_MISPRINTS)
				.filter((key) => !misprintsSeen.has(key))
				.map((key) => `REFERENCE_MISPRINTS: ${key}`),
			...Object.keys(IMPROVED_YET_BIGGER)
				.filter((key) => !improvedYetBiggerSeen.has(key))
				.map((key) => `IMPROVED_YET_BIGGER: ${key}`)
		]).toEqual([]);
	});
});
