"use strict";

// Three html5lib conformance suites over the optional `test/html5lib-tests`
// submodule; when it is absent each degrades to a single no-op test.
//
// 1. "html5lib-tests webpack build" — compiles every tokenizer input as a
//    webpack HTML entry (development + production) to confirm the full
//    pipeline handles the corpus without throwing an internal exception.
//    (Mirrors cssParsing-webpack.spectest.js; URL extraction is off so
//    nothing needs to resolve — the point is no crash on malformed input.)
// 2. "html5lib tree-construction" — compares parseHtml's serialized tree
//    to the expected html5lib tree for every tree-construction case (only the
//    scripting-enabled cases, which webpack does not run, are skipped).
// 3. "html5lib tokenizer" — compares the token stream `tokenize` reports to
//    the expected one, for every tokenizer case in an initial state the public
//    API can express (the rest are registered as skipped, with the reason).
//
// Both conformance suites carry a KNOWN_DIVERGENCES set (currently empty)
// pinning intentional exceptions: a listed case is asserted to *still*
// diverge, so accidentally fixing one flags the list as stale.

const fs = require("fs");
const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");
const {
	A,
	NS_MATHML,
	NS_SVG,
	NodeType,
	QUOTE_NONE,
	decodeEntities,
	parseHtml,
	tokenize
} = require("../lib/html/syntax");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

const testsDir = path.resolve(__dirname, "./html5lib-tests");

// ---------------------------------------------------------------------------
// 1. webpack build (tokenizer corpus, no-crash)
// ---------------------------------------------------------------------------

const tokenizerDir = path.join(testsDir, "tokenizer");
const SKIP_FILES = new Set(["xmlViolation.test", "pendingSpecChanges.test"]);
const MODES = ["development", "production"];
// A graceful webpack error/warning on malformed input is fine; an internal
// exception leaking through (parser/generator bug) is not.
const INTERNAL =
	/TypeError|RangeError|Cannot read|is not a function|Maximum call stack|of undefined|of null/;
const BATCH = 400;

const unescape = (s) =>
	s.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) =>
		String.fromCharCode(Number.parseInt(h, 16))
	);

/** @typedef {string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }} JsonValue */
/** @typedef {JsonValue[]} Html5libToken one token in html5lib's array form */

/**
 * Recursively un-double-escape a `doubleEscaped` case's expected output.
 * @param {JsonValue} value JSON value
 * @returns {JsonValue} the same value with every string unescaped
 */
const deepUnescape = (value) => {
	if (typeof value === "string") return unescape(value);
	if (Array.isArray(value)) return value.map(deepUnescape);
	if (value !== null && typeof value === "object") {
		/** @type {{ [key: string]: JsonValue }} */
		const out = {};
		for (const key of Object.keys(value)) {
			out[unescape(key)] = deepUnescape(value[key]);
		}
		return out;
	}
	return value;
};

/**
 * @typedef {object} TokenizerCase
 * @property {string} id `<file> #<index>`
 * @property {string} input the case's input, un-double-escaped
 * @property {Html5libToken[]} output the expected token stream
 * @property {string[]} initialStates tokenizer states the case is run in
 * @property {string | undefined} lastStartTag the appropriate end tag, if any
 */

/**
 * @returns {TokenizerCase[]} every tokenizer case in the corpus
 */
const loadTokenizerCases = () => {
	/** @type {TokenizerCase[]} */
	const cases = [];
	for (const file of fs.readdirSync(tokenizerDir).sort()) {
		if (!file.endsWith(".test") || SKIP_FILES.has(file)) continue;
		const data = JSON.parse(
			fs.readFileSync(path.join(tokenizerDir, file), "utf8")
		);
		let index = 0;
		for (const t of data.tests || []) {
			cases.push({
				id: `${file} #${index}`,
				input: t.doubleEscaped ? unescape(t.input) : t.input,
				output: t.doubleEscaped
					? /** @type {Html5libToken[]} */ (deepUnescape(t.output))
					: t.output,
				initialStates: t.initialStates || ["Data state"],
				lastStartTag: t.lastStartTag
			});
			index++;
		}
	}
	return cases;
};

/**
 * Compile a batch of inputs as separate HTML entries in one compilation.
 * @param {string[]} inputs HTML sources
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
			mfs.writeFileSync(`/src/c${i}.html`, input);
			entry[`c${i}`] = `./c${i}.html`;
		}
		const compiler = webpack({
			context: "/src",
			mode,
			entry,
			output: { path: "/out", filename: "[name].js" },
			target: "web",
			experiments: { html: true },
			module: { parser: { html: { sources: false } } }
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
				const match = /c(\d+)\.html/.exec(item.moduleName || "");
				if (match) add(Number(match[1]), line);
				else for (const i of inputs.keys()) add(i, line);
			}
			compiler.close(() => resolve(internalByEntry));
		});
	});

const tokenizerCases =
	fs.existsSync(tokenizerDir) && fs.readdirSync(tokenizerDir).length > 0
		? loadTokenizerCases()
		: [];
// The build suite drives the pipeline from a document, so only the cases that
// start in the data state describe a document webpack could be handed.
const buildCases = tokenizerCases.filter((c) =>
	c.initialStates.includes("Data state")
);

expectNoDeprecations();

describe("html5lib-tests webpack build", () => {
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
			for (const c of buildCases) {
				pending.push(c);
				if (pending.length === BATCH) await flush();
			}
			if (pending.length > 0) await flush();
			internalByMode.set(mode, byId);
		}
	}, 600000);

	if (buildCases.length === 0) {
		it("submodule not initialized (run `git submodule update --init test/html5lib-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	for (const mode of MODES) {
		for (const { id } of buildCases) {
			it(`${id} (${mode})`, () => {
				expect(internalByMode.get(mode).get(id)).toEqual([]);
			});
		}
	}
});

// ---------------------------------------------------------------------------
// 2. tree-construction (parseHtml conformance)
// ---------------------------------------------------------------------------

const treeDir = path.join(testsDir, "tree-construction");

const NS_PREFIX = {
	[NS_SVG]: "svg ",
	[NS_MATHML]: "math "
};

/** @type {Set<string>} intentional, documented exceptions (currently none) */
const KNOWN_DIVERGENCES = new Set();

/**
 * Serialize an AST in the html5lib tree-construction format, reading the SoA
 * tree through the accessor `A`.
 * @param {import("../lib/html/syntax").HtmlNodeRef} root node whose children are serialized
 * @returns {string} serialized tree
 */
const serialize = (root) => {
	const lines = [];
	/**
	 * @param {import("../lib/html/syntax").HtmlNodeRef} node node
	 * @param {number} depth depth
	 */
	const walk = (node, depth) => {
		const indent = `| ${"  ".repeat(depth)}`;
		const type = A.type(node);
		if (type === NodeType.Doctype) {
			let s = `<!DOCTYPE ${A.doctypeName(node) || ""}`;
			const publicId = A.doctypePublicId(node);
			const systemId = A.doctypeSystemId(node);
			if (publicId !== null || systemId !== null) {
				s += ` "${publicId || ""}" "${systemId || ""}"`;
			}
			lines.push(`${indent}${s}>`);
			return;
		}
		if (type === NodeType.Comment) {
			lines.push(`${indent}<!-- ${A.data(node)} -->`);
			return;
		}
		if (type === NodeType.Text) {
			lines.push(`${indent}"${A.data(node)}"`);
			return;
		}
		const prefix = NS_PREFIX[A.namespace(node)] || "";
		lines.push(`${indent}<${prefix}${A.tagName(node)}>`);
		const attrs = [...A.attributes(node)].sort((a, b) => {
			const an = a.serializedName || a.name;
			const bn = b.serializedName || b.name;
			return an < bn ? -1 : an > bn ? 1 : 0;
		});
		for (const a of attrs) {
			lines.push(
				`| ${"  ".repeat(depth + 1)}${
					a.serializedName || a.name
				}="${decodeEntities(a.value, true)}"`
			);
		}
		const tc = A.templateContent(node);
		if (tc !== 0) {
			lines.push(`| ${"  ".repeat(depth + 1)}content`);
			for (let c = A.firstChild(tc); c !== 0; c = A.nextSibling(c)) {
				walk(c, depth + 2);
			}
			return;
		}
		for (let c = A.firstChild(node); c !== 0; c = A.nextSibling(c)) {
			walk(c, depth + 1);
		}
	};
	for (let c = A.firstChild(root); c !== 0; c = A.nextSibling(c)) walk(c, 0);
	return lines.join("\n");
};

/**
 * Parse a html5lib `.dat` file into test cases.
 * @param {string} text file content
 * @returns {{ data: string, document: string | null, fragment: string | null, scriptMode: string | null }[]} cases
 */
const parseDat = (text) => {
	const cases = [];
	const lines = text.split("\n");
	let i = 0;
	const n = lines.length;
	const readSection = () => {
		i++;
		const out = [];
		while (i < n && !lines[i].startsWith("#")) {
			out.push(lines[i]);
			i++;
		}
		return out;
	};
	while (i < n) {
		if (lines[i] !== "#data") {
			i++;
			continue;
		}
		const test = {
			data: "",
			document: null,
			fragment: null,
			scriptMode: null
		};

		test.data = readSection().join("\n");

		while (i < n && lines[i].startsWith("#") && lines[i] !== "#data") {
			const tag = lines[i];
			if (tag === "#document-fragment") {
				test.fragment = readSection().join("\n").trim();
			} else if (tag === "#script-on") {
				test.scriptMode = "on";

				i++;
			} else if (tag === "#script-off") {
				test.scriptMode = "off";

				i++;
			} else if (tag === "#document") {
				i++;
				const doc = [];
				while (i < n) {
					if (lines[i] === "" && (i + 1 >= n || lines[i + 1] === "#data")) {
						i++;
						break;
					}
					doc.push(lines[i]);
					i++;
				}
				while (doc.length && doc[doc.length - 1] === "") doc.pop();

				test.document = doc.join("\n");
			} else {
				readSection();
			}
		}
		cases.push(test);
	}
	return cases;
};

/**
 * @param {{ data: string, fragment: string | null }} c case
 * @returns {string} serialized tree
 */
const runTreeCase = (c) => {
	const doc = parseHtml(c.data, 0, {
		fragmentContext: c.fragment || undefined
	});
	// In fragment mode the result is the children of the synthesized root.
	const first = A.firstChild(doc);
	return serialize(c.fragment && first !== 0 ? first : doc);
};

// The submodule as a whole is optional, so an absent checkout degrades to a
// no-op. A checkout that is *present* but carries no tree-construction corpus is
// a stale pin, not an opt-out — upstream moved these tests to WPT and deleting
// them silently turned 1783 assertions into a green no-op. Fail instead.
const hasSubmodule = fs.existsSync(path.join(testsDir, "tokenizer"));
const hasTreeCorpus =
	fs.existsSync(treeDir) && fs.readdirSync(treeDir).length > 0;

describe("html5lib tree-construction", () => {
	if (!hasTreeCorpus) {
		it("tree-construction corpus", () => {
			if (hasSubmodule) {
				throw new Error(
					`No tree-construction corpus in ${testsDir}. The submodule is checked out, so this is a stale pin rather than an opt-out — pin it to a commit that still carries tree-construction/.`
				);
			}
			// Not initialized: `git submodule update --init test/html5lib-tests`.
		});

		return;
	}

	for (const file of fs
		.readdirSync(treeDir)
		.filter((f) => f.endsWith(".dat"))) {
		describe(file, () => {
			const cases = parseDat(fs.readFileSync(path.join(treeDir, file), "utf8"));
			for (const [index, c] of cases.entries()) {
				const id = `${file} #${index}`;
				// Scripting is disabled in webpack; skip script-required cases and
				// cases without an expected tree.
				if (c.scriptMode === "on" || c.document === null) {
					continue;
				}
				if (KNOWN_DIVERGENCES.has(id)) {
					it(`${id} (known divergence)`, () => {
						expect(runTreeCase(c)).not.toBe(c.document);
					});

					continue;
				}

				it(id, () => {
					expect(runTreeCase(c)).toBe(c.document);
				});
			}
		});
	}
});

// ---------------------------------------------------------------------------
// 3. tokenizer (token-stream conformance)
// ---------------------------------------------------------------------------

// `tokenize` is an offset scanner over the original source: it reports where
// each token sits and leaves the spec's input-stream and data conversions —
// CR normalization, NULL substitution, character-reference decoding — to the
// consumer, which is what the tree builder does. This harness therefore does
// the same conversions before comparing to html5lib's expected token stream.

/** @type {Set<string>} intentional, documented exceptions (currently none) */
const KNOWN_TOKENIZER_DIVERGENCES = new Set();

// Tags whose content mode a context element seeds. Keyed by the html5lib
// initial-state name, with the element the harness uses when the case names
// none.
const STATE_TAGS = new Map([
	["RCDATA state", { tags: new Set(["title", "textarea"]), fallback: "title" }],
	[
		"RAWTEXT state",
		{
			tags: new Set(["style", "xmp", "iframe", "noembed", "noframes"]),
			fallback: "style"
		}
	],
	["Script data state", { tags: new Set(["script"]), fallback: "script" }],
	["PLAINTEXT state", { tags: new Set(["plaintext"]), fallback: "plaintext" }]
]);
// Content modes that suppress character-reference decoding, and the subset
// that also turns NULL into U+FFFD (RCDATA does both).
const RAW_TEXT_TAGS = new Set([
	"style",
	"xmp",
	"iframe",
	"noembed",
	"noframes",
	"script",
	"plaintext"
]);
const RCDATA_TAGS = new Set(["title", "textarea"]);

/**
 * @param {string} value string possibly containing NULLs
 * @returns {string} the same string with each NULL replaced by U+FFFD
 */
const replaceNull = (value) => value.replace(/\0/g, "�");

/**
 * The spec folds only ASCII upper alpha in tag, attribute and DOCTYPE names,
 * so `Ð` stays `Ð` where `String#toLowerCase` would make it `ð`.
 * @param {string} value name as authored
 * @returns {string} the name with A-Z folded
 */
const asciiLowerCase = (value) =>
	value.replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x20));

/**
 * Run one case and report its token stream in the html5lib format.
 * @param {string} input the case input, already CR-normalized
 * @param {string | undefined} context context element seeding the initial state
 * @returns {Html5libToken[]} the token stream
 */
const runTokenizerCase = (input, context) => {
	/** @type {Html5libToken[]} */
	const tokens = [];
	/** @type {Record<string, string> | null} */
	let attributes = null;
	let rawText = context !== undefined && RAW_TEXT_TAGS.has(context);
	let rcdata = context !== undefined && RCDATA_TAGS.has(context);
	let eofInTag = false;
	// About the last tag reported, all only read when EOF truncated it: its
	// source, whether the content mode it was scanned in was a raw-text one,
	// and whether EOF landed inside the tag name rather than past it.
	let lastTagSource = "";
	let lastTagWasRawText = false;
	let lastTagEndedInName = false;
	/**
	 * @param {string} data character data
	 */
	const pushCharacters = (data) => {
		if (data === "") return;
		const last = tokens[tokens.length - 1];
		// html5lib's format coalesces consecutive character tokens.
		if (last !== undefined && last[0] === "Character") last[1] += data;
		else tokens.push(["Character", data]);
	};
	tokenize(input, 0, {
		fragmentContext: context,
		parseError(_input, code) {
			if (code === "eof-in-tag") eofInTag = true;
		},
		text(source, start, end) {
			const raw = source.slice(start, end);
			pushCharacters(
				rawText
					? replaceNull(raw)
					: rcdata
						? replaceNull(decodeEntities(raw, false))
						: decodeEntities(raw, false)
			);
			return end;
		},
		attribute(source, nameStart, nameEnd, valueStart, valueEnd, quoteType) {
			if (attributes === null) attributes = {};
			const name = replaceNull(
				asciiLowerCase(source.slice(nameStart, nameEnd))
			);
			// Per spec a repeated name keeps the first occurrence.
			if (!(name in attributes)) {
				attributes[name] =
					valueStart === -1
						? ""
						: replaceNull(
								decodeEntities(source.slice(valueStart, valueEnd), true)
							);
			}
			if (valueStart === -1) return nameEnd;
			return quoteType === QUOTE_NONE ? valueEnd : valueEnd + 1;
		},
		openTag(source, start, end, nameStart, nameEnd, selfClosing) {
			const name = replaceNull(
				asciiLowerCase(source.slice(nameStart, nameEnd))
			);
			const token = ["StartTag", name, attributes || {}];
			if (selfClosing) token.push(true);
			tokens.push(token);
			attributes = null;
			lastTagSource = source.slice(start, end);
			lastTagWasRawText = rawText || rcdata;
			lastTagEndedInName = end === nameEnd;
			if (!selfClosing) {
				rawText = RAW_TEXT_TAGS.has(name);
				rcdata = RCDATA_TAGS.has(name);
			}
			return end;
		},
		closeTag(source, start, end, nameStart, nameEnd) {
			tokens.push([
				"EndTag",
				replaceNull(asciiLowerCase(source.slice(nameStart, nameEnd)))
			]);
			attributes = null;
			lastTagSource = source.slice(start, end);
			lastTagWasRawText = rawText || rcdata;
			lastTagEndedInName = end === nameEnd;
			rawText = false;
			rcdata = false;
			return end;
		},
		comment(source, start, end, dataStart, dataEnd) {
			tokens.push(["Comment", replaceNull(source.slice(dataStart, dataEnd))]);
			return end;
		},
		doctype(
			source,
			start,
			end,
			nameStart,
			nameEnd,
			publicStart,
			publicEnd,
			systemStart,
			systemEnd,
			forceQuirks
		) {
			tokens.push([
				"DOCTYPE",
				nameStart === -1
					? null
					: replaceNull(asciiLowerCase(source.slice(nameStart, nameEnd))),
				publicStart === -1
					? null
					: replaceNull(source.slice(publicStart, publicEnd)),
				systemStart === -1
					? null
					: replaceNull(source.slice(systemStart, systemEnd)),
				// html5lib reports the *correctness* flag, the inverse of force-quirks.
				!forceQuirks
			]);
			return end;
		}
	});
	// A tag interrupted by EOF is reported so a consumer can see how far the
	// source got; the spec emits no token for it. The one exception is EOF
	// inside a raw-text end tag's *name*, which hands the characters back —
	// `<xmp>foo</xmp` still renders `foo</xmp`, while `<xmp>foo</xmp ` (past
	// the name, in before-attribute-name) renders `foo`.
	const last = tokens[tokens.length - 1];
	if (
		eofInTag &&
		last !== undefined &&
		(last[0] === "StartTag" || last[0] === "EndTag")
	) {
		tokens.pop();
		if (lastTagWasRawText && lastTagEndedInName) {
			pushCharacters(replaceNull(lastTagSource));
		}
	}
	return tokens;
};

/**
 * @param {Html5libToken[]} output an html5lib expected token stream
 * @returns {Html5libToken[]} the same stream with character tokens coalesced
 */
const coalesceCharacters = (output) => {
	/** @type {Html5libToken[]} */
	const result = [];
	for (const token of output) {
		const last = result[result.length - 1];
		if (
			token[0] === "Character" &&
			last !== undefined &&
			last[0] === "Character"
		) {
			last[1] += token[1];
		} else {
			result.push(token[0] === "Character" ? ["Character", token[1]] : token);
		}
	}
	return result;
};

// Two shapes in the corpus cannot be asked for through the public API, which
// takes the initial state from a context element: a CDATA section is reached
// only from foreign content (a tree-construction decision), and an initial
// state paired with an appropriate end tag that does not itself imply that
// state arises from no real fragment parse. They are counted rather than
// silently dropped — the shape list is asserted below, so a corpus that grows
// one reads as a diff instead of as coverage that quietly shrank.

/** @type {{ id: string, state: string, context: (string | undefined), input: string, expected: Html5libToken[] }[]} */
const tokenizerRuns = [];
/** @type {Map<string, { state: string, lastStartTag: (string | null), count: number }>} */
const unreachableByShape = new Map();

for (const testCase of tokenizerCases) {
	for (const state of testCase.initialStates) {
		const lastStartTag = testCase.lastStartTag;
		const stateTags = STATE_TAGS.get(state);
		const reachable =
			state === "Data state" ||
			(stateTags !== undefined &&
				(lastStartTag === undefined || stateTags.tags.has(lastStartTag)));
		if (!reachable) {
			const key = `${state}\u0000${lastStartTag}`;
			const entry = unreachableByShape.get(key);
			if (entry === undefined) {
				unreachableByShape.set(key, {
					state,
					lastStartTag: lastStartTag === undefined ? null : lastStartTag,
					count: 1
				});
			} else {
				entry.count++;
			}
			continue;
		}
		tokenizerRuns.push({
			id: `${testCase.id} (${state})`,
			state,
			context:
				stateTags === undefined
					? undefined
					: lastStartTag === undefined
						? stateTags.fallback
						: lastStartTag,
			// The spec's input-stream preprocessing, which `tokenize` leaves to its
			// consumer because it reports offsets into the original source.
			input: testCase.input.replace(/\r\n?/g, "\n"),
			expected: coalesceCharacters(testCase.output)
		});
	}
}

describe("html5lib tokenizer", () => {
	if (tokenizerCases.length === 0) {
		it("submodule not initialized (run `git submodule update --init test/html5lib-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	it("runs every configuration the public API can express", () => {
		const shapes = [...unreachableByShape.values()].sort((a, b) =>
			`${a.state} ${a.lastStartTag}` < `${b.state} ${b.lastStartTag}` ? -1 : 1
		);
		expect(shapes).toEqual([
			{ state: "CDATA section state", lastStartTag: null, count: 56 },
			{ state: "RCDATA state", lastStartTag: "xmp", count: 20 },
			{ state: "Script data state", lastStartTag: "xmp", count: 5 }
		]);
	});

	for (const { id, context, input, expected } of tokenizerRuns) {
		if (KNOWN_TOKENIZER_DIVERGENCES.has(id)) {
			it(`${id} (known divergence)`, () => {
				expect(runTokenizerCase(input, context)).not.toEqual(expected);
			});

			continue;
		}

		it(id, () => {
			expect(runTokenizerCase(input, context)).toEqual(expected);
		});
	}
});
