"use strict";

// cspell:ignore fnames reminify reminifies ufuzz

// Holds webpack's JavaScript minifier to every test terser and swc write for
// theirs. Each source of each corpus below is minified by webpack and by the
// minifier it replaces under the same options, and:
// 1. both must write the same bytes, or refuse the source with the same error;
// 2. where the test states what its input prints, webpack's output, run in
//    terser's own sandbox, must print it too, whatever the bytes;
// 3. where swc records its own output, a smaller one is a lead for printing
//    less, written to the file JS_MINIFY_REPORT names (never a failure).
// PHASES chooses the printer phases installed: `PHASES=mangle,output` for
// those two only, `PHASES=-parse` for all but one.

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const vm = require("vm");
const zlib = require("zlib");
const acorn = require("acorn");
const { IGNORED_FORMAT_OPTIONS } =
	require("../../lib/javascript/syntax").printer;
const { loadPhases, selectPhases } = require("../helpers/printerPhases");

/** @typedef {import("terser").MinifyOptions} MinifyOptions */
/** @typedef {(code: string, options: MinifyOptions) => Promise<{ code?: string }>} Minify */
/** @typedef {{ code?: string, error?: string }} Outcome */
/** @typedef {{ expected: string | Error | true, input: string, prepend: string, microtasks?: boolean, strict?: boolean }} Stdout */
/** @typedef {{ name: string, input: string, module?: boolean, own?: { compress: EXPECTED_ANY, mangle: EXPECTED_ANY, format: EXPECTED_OBJECT, parse: EXPECTED_OBJECT }, stdout?: Stdout, reminify?: boolean, rival?: { name: string, code: string } }} Source */
/** @typedef {{ AST: EXPECTED_ANY, parse: EXPECTED_ANY, knows: (group: "compress" | "mangle", key: string) => boolean }} CaseReader */
/** @typedef {{ name: string, files: string[] }} Group */
/** @typedef {{ name: string, submodule: string, directory: string, groups: () => Group[], read: (file: string, reader: CaseReader) => Source[], optionSets: string[], minimum: number, minimumOwn?: number, minimumRun?: number, minimumRival?: number, ownOptionsKnown?: boolean, ownDefaultsNamed?: boolean }} Corpus */
/** @typedef {{ source: string, rival: string, ours: number, theirs: number, oursGzip: number, theirsGzip: number }} Lead */

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
			name: statement.label.name,
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
					: undefined
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
			name: path.relative(swcTestsDir, file),
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

/**
 * @param {string} code a program
 * @returns {{ raw: number, gzip: number }} its size, and gzipped at level 9
 */
const sizeOf = (code) => ({
	raw: Buffer.byteLength(code),
	gzip: zlib.gzipSync(code, { level: 9 }).length
});

/**
 * @param {Lead[]} leads where another minifier wrote less
 * @returns {string} them as a Markdown table, the most bytes first
 */
const formatLeads = (leads) => {
	const rows = [...leads]
		.sort((a, b) => b.ours - b.theirs - (a.ours - a.theirs))
		.map(
			(lead) =>
				`| ${lead.source} | ${lead.rival} | ${lead.ours} | ${lead.theirs} | ${lead.ours - lead.theirs} | ${lead.oursGzip - lead.theirsGzip} |`
		);
	return [
		"# Where another minifier's recorded output is smaller",
		"",
		"Both outputs printed alone by webpack's printer; bytes more than theirs.",
		"",
		"| Source | Rival | Ours | Theirs | Raw more | Gzip more |",
		"| --- | --- | --: | --: | --: | --: |",
		...rows,
		""
	].join("\n");
};

describe("JavaScript minifier", () => {
	/** @type {{ reader?: CaseReader, printer?: { minify: Minify, phases: string[], corrections: { enabled: boolean } | undefined }, sandbox?: { run_code: (code: string, prepend: string) => string | Error, same_stdout: (expected: string | Error, actual: string | Error) => boolean } }} */
	const loaded = {};
	const selected = selectPhases(process.env.PHASES);
	/** @type {Lead[]} */
	const leads = [];
	const { runInNewContext } = vm;
	// Whether the sandbox also drains promise callbacks: swc's harness runs a
	// whole process, terser's runner captures only what runs synchronously.
	let microtasks = false;

	beforeAll(async () => {
		loaded.printer = await loadPhases(selected);
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

	it("should install every phase PHASES selects, so each corpus reaches them", () => {
		const { phases } = /** @type {NonNullable<typeof loaded.printer>} */ (
			loaded.printer
		);
		expect(phases).toEqual(selected);
	});

	it("should read PHASES as a list to keep or, prefixed with -, to drop", () => {
		const names = require("../../lib/javascript/syntax").printer.PHASES.map(
			(/** @type {{ name: string }} */ phase) => phase.name
		);

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

	if (isPresent(referenceDir)) {
		it("should pin the reference's corpus to the version it is compared with", () => {
			const pinned = JSON.parse(
				fs.readFileSync(path.join(referenceDir, "package.json"), "utf8")
			).version;
			expect(pinned).toBe(require("terser/package.json").version);
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
				if (corpus.minimumRival !== undefined) {
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
						for (const file of group.files) {
							for (const source of corpus.read(file, reader)) {
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
									if (theirs.code !== ours.code || theirs.error !== ours.error) {
										// A difference only the `correct` phase makes is its fix, which
										// the run check below holds to; any other is a difference.
										const { corrections } = printer;
										let uncorrected = ours;
										if (corrections && corrections.enabled) {
											corrections.enabled = false;
											try {
												uncorrected = await outcome(
													printer.minify,
													source.input,
													optionsFor(source)
												);
											} finally {
												corrections.enabled = true;
											}
										}
										if (
											theirs.code !== uncorrected.code ||
											theirs.error !== uncorrected.error
										) {
											differences.push(
												`${source.name} (${setName})\n\treference: ${JSON.stringify(theirs)}\n\twebpack:   ${JSON.stringify(uncorrected)}`
											);
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
										const printing = {
											compress: false,
											mangle: false,
											module: source.module
										};
										const rival = await outcome(
											printer.minify,
											source.rival.code,
											printing
										);
										const mine = await outcome(printer.minify, ours.code, printing);
										if (rival.code !== undefined && mine.code !== undefined) {
											const oursSize = sizeOf(mine.code);
											const theirsSize = sizeOf(rival.code);
											if (theirsSize.raw < oursSize.raw) {
												leads.push({
													source: `${corpus.name}: ${source.name}`,
													rival: source.rival.name,
													ours: oursSize.raw,
													theirs: theirsSize.raw,
													oursGzip: oursSize.gzip,
													theirsGzip: theirsSize.gzip
												});
											}
										}
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
