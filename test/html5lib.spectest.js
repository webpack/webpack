"use strict";

// Two html5lib conformance suites over the optional `test/html5lib-tests`
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
//    KNOWN_DIVERGENCES (currently empty) pins any intentional exception: a
//    listed case is asserted to *still* diverge, so accidentally fixing one
//    flags the list as stale.

const fs = require("fs");
const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");
const {
	A,
	NS_MATHML,
	NS_SVG,
	NodeType,
	parseHtml,
	decodeEntities
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

/**
 * @returns {{ id: string, input: string }[]} every Data-state tokenizer input
 */
const loadTokenizerCases = () => {
	const cases = [];
	for (const file of fs.readdirSync(tokenizerDir)) {
		if (!file.endsWith(".test") || SKIP_FILES.has(file)) continue;
		const data = JSON.parse(
			fs.readFileSync(path.join(tokenizerDir, file), "utf8")
		);
		let index = 0;
		for (const t of data.tests || []) {
			if (!(t.initialStates || ["Data state"]).includes("Data state")) continue;
			const input = t.doubleEscaped ? unescape(t.input) : t.input;
			cases.push({ id: `${file} #${index}`, input });
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
			for (const c of tokenizerCases) {
				pending.push(c);
				if (pending.length === BATCH) await flush();
			}
			if (pending.length > 0) await flush();
			internalByMode.set(mode, byId);
		}
	}, 600000);

	if (tokenizerCases.length === 0) {
		it("submodule not initialized (run `git submodule update --init test/html5lib-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	for (const mode of MODES) {
		for (const { id } of tokenizerCases) {
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
	const doc = parseHtml(c.data, c.fragment || undefined);
	// In fragment mode the result is the children of the synthesized root.
	const first = A.firstChild(doc);
	return serialize(c.fragment && first !== 0 ? first : doc);
};

const hasTreeCorpus =
	fs.existsSync(treeDir) && fs.readdirSync(treeDir).length > 0;

describe("html5lib tree-construction", () => {
	if (!hasTreeCorpus) {
		it("submodule not initialized (run `git submodule update --init test/html5lib-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
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
