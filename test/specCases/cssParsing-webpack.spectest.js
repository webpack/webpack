"use strict";

// Compiles every css-parsing-tests input as a webpack CSS entry to confirm the
// full pipeline (parse, AST, handle, generate) handles the corpus without
// crashing, in both development and production mode. One test per input per mode
// reports the result; the builds run once in beforeAll, batched into shared
// in-memory compilations. @import/url() extraction is off so nothing needs to
// resolve — the point is that webpack handles malformed input without crashing
// or throwing an internal exception. (Mirrors html5lib.spectest.js;
// only fixture loading and the entry type differ.)

const fs = require("fs");
const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("../..");
const { COLOR_NAME_TO_RGB } = require("../../lib/css/data");
const { SourceProcessor } = require("../../lib/css/syntax");
const {
	parseABlocksContents,
	parseAComponentValue,
	parseADeclaration,
	parseAListOfComponentValues,
	parseARule,
	parseAStylesheet,
	parseAStylesheetsContents
} = require("../../lib/css/syntax-parser");
const expectNoDeprecations = require("../helpers/expectNoDeprecations");
const {
	serializeComponentValue,
	serializeComponentValues,
	serializeDeclaration,
	serializeRule
} = require("../helpers/serializeCssTree");

const casesDir = path.resolve(__dirname, "../external/css-parsing-tests");
const MODES = ["development", "production"];
// A graceful webpack error/warning on malformed input is fine; an internal
// exception leaking through (parser/generator bug) is not.
const INTERNAL =
	/TypeError|RangeError|Cannot read|is not a function|Maximum call stack|of undefined|of null/;
const BATCH = 400;

/**
 * @returns {{ id: string, input: string }[]} every input (handles the `stylesheet_bytes` shape)
 */
const loadCases = () => {
	const cases = [];
	for (const file of fs.readdirSync(casesDir)) {
		if (!file.endsWith(".json")) continue;
		const data = JSON.parse(fs.readFileSync(path.join(casesDir, file), "utf8"));
		let index = 0;
		// The suite is a flat [input, expected, …] array; inputs are even-indexed.
		for (const [i, value] of data.entries()) {
			if (i % 2 !== 0) continue;
			let input;
			if (typeof value === "string") {
				input = value;
			} else if (value && typeof value.css_bytes === "string") {
				input = value.css_bytes;
			} else {
				continue;
			}
			cases.push({ id: `${file} #${index}`, input });
			index++;
		}
	}
	return cases;
};

/**
 * Compile a batch of inputs as separate CSS entries in one compilation.
 * @param {string[]} inputs CSS sources
 * @param {string} mode webpack mode
 * @returns {Promise<Map<number, string[]>>} internal-error messages keyed by entry index
 */
const buildBatch = (inputs, mode) =>
	new Promise((resolve) => {
		const mfs = createFsFromVolume(new Volume());
		mfs.mkdirSync("/src", { recursive: true });
		/** @type {Record<string, string>} */
		const entry = {};
		for (const [i, input] of inputs.entries()) {
			mfs.writeFileSync(`/src/c${i}.css`, input);
			entry[`c${i}`] = `./c${i}.css`;
		}
		const compiler = webpack({
			context: "/src",
			mode,
			entry,
			output: {
				path: "/out",
				filename: "[name].js",
				cssFilename: "[name].css"
			},
			target: "web",
			experiments: { css: true },
			module: { parser: { css: { import: false, url: false } } }
		});
		compiler.inputFileSystem = mfs;
		compiler.outputFileSystem = mfs;
		compiler.run((err, stats) => {
			/** @type {Map<number, string[]>} */
			const internalByEntry = new Map();
			/**
			 * @param {number} i entry index
			 * @param {string} line message
			 */
			const add = (i, line) => {
				if (!internalByEntry.has(i)) internalByEntry.set(i, []);
				internalByEntry.get(i).push(line);
			};
			if (err) {
				// Compiler-level throw can't be attributed to one entry; mark all.
				const line = String(err.message).split("\n")[0].slice(0, 160);
				for (const i of inputs.keys()) add(i, line);
				resolve(internalByEntry);
				return;
			}
			const json = stats.toJson({ errors: true, warnings: true });
			for (const item of [...json.errors, ...json.warnings]) {
				if (!INTERNAL.test(item.message)) continue;
				const line = item.message.split("\n")[0].slice(0, 160);
				const match = /c(\d+)\.css/.exec(item.moduleName || "");
				if (match) add(Number(match[1]), line);
				else for (const i of inputs.keys()) add(i, line);
			}
			compiler.close(() => resolve(internalByEntry));
		});
	});

const cases =
	fs.existsSync(casesDir) && fs.readdirSync(casesDir).length > 0
		? loadCases()
		: [];

expectNoDeprecations();

describe("css-parsing-tests webpack build", () => {
	/** @type {Map<string, Map<string, string[]>>} */
	const internalByMode = new Map();

	beforeAll(async () => {
		for (const mode of MODES) {
			/** @type {Map<string, string[]>} */
			const byId = new Map();
			let pending = [];
			const flush = async () => {
				const inputs = [];
				for (const c of pending) inputs.push(c.input);
				const internalByEntry = await buildBatch(inputs, mode);
				for (const [k, c] of pending.entries()) {
					byId.set(c.id, internalByEntry.get(k) || []);
				}
				pending = [];
			};
			for (const c of cases) {
				pending.push(c);
				if (pending.length === BATCH) await flush();
			}
			if (pending.length > 0) await flush();
			internalByMode.set(mode, byId);
		}
	}, 600000);

	if (cases.length === 0) {
		it("submodule not initialized (run `git submodule update --init test/external/css-parsing-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	for (const mode of MODES) {
		for (const { id } of cases) {
			it(`${id} (${mode})`, () => {
				expect(internalByMode.get(mode).get(id)).toEqual([]);
			});
		}
	}
});

// The suite above says the pipeline survives the corpus; this one says the parser
// reads it the way the corpus says to. `blocks_contents.json` settles the one
// decision with no other oracle: `<ident>:<value>` as declaration or rule.
describe("css-parsing-tests block contents", () => {
	const file = path.join(casesDir, "blocks_contents.json");
	if (!fs.existsSync(file)) {
		it("submodule not initialized (run `git submodule update --init test/external/css-parsing-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}
	const data = JSON.parse(fs.readFileSync(file, "utf8"));

	/**
	 * What the corpus says each top-level item is, minus the `error` entries —
	 * an invalid declaration is dropped rather than materialized.
	 * @param {EXPECTED_ANY[]} items the corpus's expected list
	 * @returns {string[]} one entry per item the parser has to produce
	 */
	const expected = (items) =>
		items
			.filter((item) => item[0] !== "error")
			.map((item) => {
				if (item[0] === "declaration") return `declaration ${item[1]}`;
				return item[0] === "at-rule" ? `at-rule ${item[1]}` : "qualified rule";
			});

	/**
	 * The same, as the parser reads it. The two lists come back split, so they
	 * are merged on source position to compare as one sequence.
	 * @param {string} source a block's contents
	 * @returns {string[]} one entry per top-level item
	 */
	const actual = (source) => {
		const { decls, rules } = parseABlocksContents(source);
		const items = [
			...decls.map((d) => ({ at: d.start, text: `declaration ${d.name}` })),
			...rules.map((r) => ({
				at: r.start,
				text: r.name ? `at-rule ${r.name}` : "qualified rule"
			}))
		];
		items.sort((one, other) => one.at - other.at);
		return items.map((item) => item.text);
	};

	for (let i = 0; i < data.length; i += 2) {
		const source = data[i];
		if (typeof source !== "string") continue;
		const want = expected(data[i + 1]);

		it(`reads ${JSON.stringify(source)} as ${want.join(" + ") || "nothing"}`, () => {
			expect(actual(source)).toEqual(want);
		});
	}
});

// The corpus states each color as CSSOM serializes it, which is not what a
// minifier writes — so this compares webpack's reading of the input against its
// reading of that serialization, and only where both resolved to sRGB.
describe("css-parsing-tests colors", () => {
	const files = fs.existsSync(casesDir)
		? fs.readdirSync(casesDir).filter((f) => f.startsWith("color"))
		: [];
	if (files.length === 0) {
		it("submodule not initialized (run `git submodule update --init test/external/css-parsing-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	const fold = (color) =>
		new SourceProcessor()
			.process(`a{color:${color}}`, { mode: "minify" })
			.code.slice(8, -1);

	/**
	 * @param {string} folded what the minifier wrote
	 * @returns {string | null} the same color as `#rrggbb`, or null if it is not sRGB
	 */
	const canonical = (folded) => {
		const named = COLOR_NAME_TO_RGB.get(folded);
		if (named !== undefined) return `#${named.toString(16).padStart(6, "0")}`;
		const short = /^#([0-9a-f]{3})$/.exec(folded);
		if (short) return `#${[...short[1]].map((c) => c + c).join("")}`;
		return /^#[0-9a-f]{6}$/.test(folded) ? folded : null;
	};

	for (const file of files) {
		const data = JSON.parse(fs.readFileSync(path.join(casesDir, file), "utf8"));
		for (let i = 0; i < data.length; i += 2) {
			const source = data[i];
			const serialized = data[i + 1];
			if (typeof source !== "string" || serialized === null) continue;
			const want = canonical(fold(serialized));
			if (want === null) continue;
			const got = canonical(fold(source));
			if (got === null) continue;

			it(`${file} reads ${JSON.stringify(source)} as ${want}`, () => {
				expect(got).toBe(want);
			});
		}
	}
});

// The corpus states a parse as a tree, and webpack's parser entry points are
// the spec's own algorithms, so the two compare directly once the nodes are
// written in upstream's JSON form. What is not compared says why below.
describe("css-parsing-tests trees", () => {
	const ENTRY_POINTS = [
		[
			"component_value_list",
			(source) =>
				serializeComponentValues(parseAListOfComponentValues(source))
		],
		[
			"one_component_value",
			(source) => serializeComponentValue(parseAComponentValue(source))
		],
		["one_declaration", (source) => serializeDeclaration(parseADeclaration(source))],
		["one_rule", (source) => serializeRule(parseARule(source), source)],
		[
			"rule_list",
			(source) =>
				parseAStylesheetsContents(source).map((rule) =>
					serializeRule(rule, source)
				)
		],
		[
			"stylesheet",
			(source) =>
				parseAStylesheet(source).rules.map((rule) => serializeRule(rule, source))
		]
	];

	// Each case webpack reads differently, with the reason. A listed one is
	// asserted to *still* diverge, so fixing it fails here rather than leaving
	// the list to rot.
	const KNOWN_DIVERGENCES = new Map([
		// CSS Syntax 3 dropped `<unicode-range-token>` and the `~=`-style match
		// tokens; this corpus predates that, so it still states them.
		["component_value_list #38", "unicode-range token"],
		["component_value_list #39", "unicode-range token"],
		["component_value_list #40", "unicode-range token"],
		["component_value_list #41", "unicode-range token"],
		["component_value_list #42", "unicode-range token"],
		["component_value_list #43", "unicode-range token"],
		["component_value_list #44", "unicode-range token"],
		["component_value_list #45", "unicode-range token"],
		["component_value_list #46", "unicode-range token"],
		["component_value_list #47", "match token"],
		["component_value_list #48", "match token"],
		// A `\` with nothing after it is a parse error the spec resolves to
		// U+FFFD; webpack keeps the character it was written as.
		["component_value_list #7", "backslash at end of input"],
		["component_value_list #10", "backslash at end of input"],
		["component_value_list #11", "backslash at end of input"],
		// A `\` before a newline inside a string is a line continuation the spec
		// removes, and webpack keeps.
		["component_value_list #12", "escaped newline in a string"],
		// CDO and CDC are preserved tokens in a prelude the spec reads at the top
		// level; webpack drops them.
		["rule_list #10", "CDO/CDC in a prelude"],
		// A declaration's value is the run webpack will print, so the trailing
		// whitespace and `;` the spec keeps as component values are not in it.
		["one_declaration #11", "trailing token in a value"],
		["one_declaration #12", "trailing token in a value"],
		["one_declaration #14", "trailing token in a value"],
		["one_declaration #15", "trailing token in a value"],
		["one_declaration #16", "trailing token in a value"],
		["one_declaration #17", "trailing token in a value"],
		["one_declaration #18", "trailing token in a value"],
		["one_declaration #19", "trailing token in a value"]
	]);

	// Upstream writes two unrelated things as `["error", …]`: an entry point's
	// failure return, which webpack answers with the nodes it read instead, and a
	// token the tokenizer produced, which the serializer states like any other.
	const PARSE_FAILURES = new Set([
		"empty",
		"eof-in-string",
		"eof-in-url",
		"extra-input",
		"invalid"
	]);

	/**
	 * Whether upstream states a failure return for a case, at any depth — a rule
	 * list holds its invalid rule inside the list. A stray closer, a bad string
	 * and a bad url are tokens rather than failures, so they stay comparable.
	 * @param {EXPECTED_ANY} value an expected value
	 * @returns {boolean} true when nothing webpack produces answers it
	 */
	const statesAFailure = (value) =>
		Array.isArray(value) &&
		(value[0] === "error"
			? PARSE_FAILURES.has(value[1])
			: value.some(statesAFailure));

	for (const [file, parse] of ENTRY_POINTS) {
		const path_ = path.join(casesDir, `${file}.json`);
		if (!fs.existsSync(path_)) {
			it(`submodule not initialized (${file})`, () => {
				// No-op: the conformance data is an optional git submodule.
			});

			continue;
		}
		const data = JSON.parse(fs.readFileSync(path_, "utf8"));
		for (let i = 0; i < data.length; i += 2) {
			const source = data[i];
			const expected = data[i + 1];
			if (typeof source !== "string") continue;
			if (statesAFailure(expected)) continue;
			// A NUL is preprocessed to U+FFFD by the spec and not by webpack, and
			// the character has no place in a test name either.
			if (source.includes("\u0000")) continue;

			const name = `${file} #${i / 2}`;
			const divergence = KNOWN_DIVERGENCES.get(name);
			const label = divergence
				? `${name} still diverges: ${divergence}`
				: `${name} reads ${JSON.stringify(source).slice(0, 60)}`;

			it(label, () => {
				let actual;
				try {
					actual = parse(source);
				} catch (err) {
					actual = `threw: ${/** @type {Error} */ (err).message}`;
				}
				if (divergence) {
					expect(actual).not.toEqual(expected);
				} else {
					expect(actual).toEqual(expected);
				}
			});
		}
	}
});
