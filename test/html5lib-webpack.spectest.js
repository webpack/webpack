"use strict";

// Compiles every html5lib-tests tokenizer input as a webpack HTML entry to
// confirm the full pipeline (parse, AST, handle, generate) handles the corpus
// without crashing, in both development and production mode. One test per input
// per mode reports the result; the builds run once in beforeAll, batched into
// shared in-memory compilations. URL extraction is off so nothing needs to
// resolve — the point is that webpack handles malformed input without crashing
// or throwing an internal exception. (Mirrors cssParsing-webpack.spectest.js;
// only fixture loading and the entry type differ.)

const fs = require("fs");
const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");

const tokenizerDir = path.resolve(__dirname, "./html5lib-tests/tokenizer");
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
const loadCases = () => {
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

const cases =
	fs.existsSync(tokenizerDir) && fs.readdirSync(tokenizerDir).length > 0
		? loadCases()
		: [];

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
			for (const c of cases) {
				pending.push(c);
				if (pending.length === BATCH) await flush();
			}
			if (pending.length > 0) await flush();
			internalByMode.set(mode, byId);
		}
	}, 600000);

	if (cases.length === 0) {
		it("submodule not initialized (run `git submodule update --init test/html5lib-tests`)", () => {
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
