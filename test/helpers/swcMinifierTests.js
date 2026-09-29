"use strict";

// Reads swc's minifier tests as terser would be handed them: the options each
// names, cut to the keys terser reads.

// cspell:ignore fnames

const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

/** @typedef {{ name: string, input: string, module?: boolean, own?: { compress: EXPECTED_ANY, mangle: EXPECTED_ANY, format?: EXPECTED_OBJECT, parse?: EXPECTED_OBJECT } }} Source */
/** @typedef {(group: "compress" | "mangle", key: string) => boolean} Knows */

const swcTestsDir = path.resolve(
	__dirname,
	"../external/swc/crates/swc_ecma_minifier/tests"
);

/**
 * Whether terser reads a key, as its own `minify` answers: it refuses an
 * options object naming one it does not, and nothing else says so whole.
 * @param {(code: string, options: EXPECTED_OBJECT) => unknown} minifySync terser's own, unpatched
 * @returns {Knows} the answer, asked once per key
 */
const createKnows = (minifySync) => {
	/** @type {Map<string, boolean>} */
	const known = new Map();
	return (group, key) => {
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
	};
};

/**
 * An options object with only the keys terser reads: swc's tests name a few of
 * their own, and terser refuses a whole object over one it does not know, which
 * would leave none of the test's other options run.
 * @param {EXPECTED_ANY} options as the test names them
 * @param {"compress" | "mangle"} group which of terser's options they are
 * @param {Knows} knows whether terser reads a key
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
 * @param {{ knows: Knows }} reader what terser reads
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
	while (
		dir.startsWith(swcTestsDir) &&
		!fs.existsSync(path.join(dir, "config.json"))
	) {
		dir = path.dirname(dir);
	}
	// swc reads a config that leaves `defaults` unnamed as naming it true, where
	// terser's own tests leave it off; read as terser's, most passes never run.
	const compress = dir.startsWith(swcTestsDir)
		? { defaults: true, ...readJson(path.join(dir, "config.json")) }
		: undefined;
	return [
		{
			name: path.relative(swcTestsDir, file),
			input,
			module: readsAsModule(input),
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
	const escaped = {
		n: "\n",
		r: "\r",
		t: "\t",
		0: "\0",
		"\\": "\\",
		'"': '"',
		"'": "'"
	};
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
			value += String.fromCodePoint(
				Number.parseInt(text.slice(i + 2, close), 16)
			);
			i = close;
		} else if (next === "x") {
			value += String.fromCharCode(
				Number.parseInt(text.slice(i + 1, i + 3), 16)
			);
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
// eslint-disable-next-line camelcase
const SWC_EXEC_MANGLE = { keep_fnames: true, toplevel: true };

/**
 * The tests swc writes inline in `exec.rs`, as the helper each calls runs them:
 * its source, and a config read with `defaults` on where it leaves it unnamed.
 * @param {string} file `exec.rs`
 * @param {{ knows: Knows }} reader what terser reads
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
				word[0] === "true"
					? true
					: word[0] === "false"
						? false
						: bound.get(word[0])
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
			compress = {
				defaults: true,
				...JSON.parse(/** @type {string} */ (config))
			};
			mangle = skipMangle ? false : SWC_EXEC_MANGLE;
		} else if (call[1] === "run_mangle_props_exec_test") {
			compress = false;
			mangle = { toplevel: true, properties: {} };
		}
		sources.push({
			name,
			input,
			module: readsAsModule(input),
			own: {
				compress: knownTo(compress, "compress", knows),
				mangle: knownTo(mangle, "mangle", knows),
				format: undefined,
				parse: undefined
			}
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
 * @param {{ knows: Knows }} reader what terser reads
 * @returns {Source[]} one source per test
 */
const readSwcMangleTests = (file, { knows }) => {
	const text = fs.readFileSync(file, "utf8");
	/**
	 * @param {string} list a `vec![atom!("…"), …]`
	 * @returns {string[]} the names in it
	 */
	const atoms = (list) =>
		[...list.matchAll(/atom!\("([^"]*)"\)/g)].map((m) => m[1]);
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
		const props =
			/props:\s*Some\(ManglePropertiesOptions\s*\{([\s\S]*?)\}\)/.exec(struct);
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
			[
				"MangleOptions",
				outside.slice(0, outside.indexOf("..Default::default()"))
			],
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

module.exports = {
	createKnows,
	readSwcExecTests,
	readSwcMangleTests,
	readSwcTest,
	swcTestsDir
};
