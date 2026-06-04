"use strict";

// cspell:ignore noncharacter

// Official html5lib-tests tokenizer suite (git submodule, like test262-cases)
// run against `lib/html/walkHtmlTokens`. The scanner emits offset ranges, not
// decoded tokens, so this checks the two things it owns: parse-error codes
// match the suite's `errors[].code` (minus intentionally-omitted codes), and
// every emitted token slice concatenates back to the exact input.
// Content-mode cases are driven in with a synthetic opener (`<title>`, …)
// since `walkHtmlTokens` always starts in the data state.

const fs = require("fs");
const path = require("path");
const walkHtmlTokens = require("../lib/html/walkHtmlTokens");

const tokenizerDir = path.resolve(__dirname, "./html5lib-tests/tokenizer");

// Files whose semantics are not plain WHATWG tokenization.
const SKIP_FILES = new Set(["xmlViolation.test", "pendingSpecChanges.test"]);

// Parse errors the offset scanner intentionally omits (no per-tag/tree state,
// no raw-code-point scan); see the note in lib/html/walkHtmlTokens.js.
const IGNORED_ERROR_CODES = new Set([
	"control-character-in-input-stream",
	"noncharacter-in-input-stream",
	"surrogate-in-input-stream",
	"duplicate-attribute",
	"cdata-in-html-content"
]);

// Deliberate deviation (keyed by `${file} :: ${description}`): at EOF in an
// in-progress tag we emit the partial tag + `eof-in-tag`, not flush-as-text.
const KNOWN_DEVIATIONS = new Set([
	"contentModelFlags.test :: End tag closing RCDATA or RAWTEXT (ending with EOF)"
]);

/**
 * @param {string} s string possibly containing `\\uXXXX` escapes
 * @returns {string} unescaped string
 */
const unescape = (s) =>
	s.replace(/\\u([0-9A-Fa-f]{4})/g, (_, h) =>
		String.fromCharCode(Number.parseInt(h, 16))
	);

/**
 * @param {string[]} states initial tokenizer states
 * @param {string=} lastStartTag appropriate end-tag name
 * @returns {string | null} synthetic prefix driving the scanner into that mode, or null to skip
 */
const prefixForState = (states, lastStartTag) => {
	if (states.includes("Data state")) return "";
	if (states.includes("PLAINTEXT state")) {
		return `<${lastStartTag || "plaintext"}>`;
	}
	if (states.includes("Script data state")) {
		return `<${lastStartTag || "script"}>`;
	}
	if (states.includes("RCDATA state")) return `<${lastStartTag || "title"}>`;
	if (states.includes("RAWTEXT state")) return `<${lastStartTag || "style"}>`;
	if (states.includes("CDATA section state")) return "<![CDATA[";
	return null;
};

/**
 * @param {string} input full input string
 * @returns {{ codes: string[], roundtrip: string }} emitted error codes and reconstructed input
 */
const run = (input) => {
	/** @type {string[]} */
	const codes = [];
	/** @type {string[]} */
	const parts = [];
	const collect = (i, s, e) => {
		parts.push(i.slice(s, e));
		return e;
	};
	walkHtmlTokens(input, 0, {
		parseError: (i, code) => codes.push(code),
		openTag: collect,
		closeTag: collect,
		comment: collect,
		doctype: collect,
		text: collect
	});
	return { codes, roundtrip: parts.join("") };
};

const testFiles = fs.existsSync(tokenizerDir)
	? fs
			.readdirSync(tokenizerDir)
			.filter((f) => f.endsWith(".test") && !SKIP_FILES.has(f))
			.sort()
	: [];

describe("html5lib-tests tokenizer", () => {
	if (testFiles.length === 0) {
		it("submodule not initialized (run `git submodule update --init test/html5lib-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	for (const file of testFiles) {
		const data = JSON.parse(
			fs.readFileSync(path.join(tokenizerDir, file), "utf8")
		);
		const tests = data.tests || [];

		it(`${file} (${tests.length} cases)`, () => {
			/** @type {string[]} */
			const failures = [];

			for (const t of tests) {
				const states = t.initialStates || ["Data state"];
				const prefix = prefixForState(states, t.lastStartTag);
				if (prefix === null) continue;

				const input = t.doubleEscaped ? unescape(t.input) : t.input;
				const full = prefix + input;
				const { codes, roundtrip } = run(full);

				if (roundtrip !== full) {
					failures.push(
						`[roundtrip] ${t.description}: got ${JSON.stringify(roundtrip)}`
					);
				}

				if (KNOWN_DEVIATIONS.has(`${file} :: ${t.description}`)) continue;

				const expected = (t.errors || [])
					.map((e) => e.code)
					.filter((c) => !IGNORED_ERROR_CODES.has(c))
					.sort();
				const got = [...codes].sort();
				if (JSON.stringify(got) !== JSON.stringify(expected)) {
					failures.push(
						`[errors] ${t.description}: input=${JSON.stringify(
							input
						)} expected=${JSON.stringify(expected)} got=${JSON.stringify(got)}`
					);
				}
			}

			if (failures.length > 0) {
				throw new Error(
					`${
						failures.length
					} html5lib case(s) diverged in ${file}:\n${failures.join("\n")}`
				);
			}
		});
	}
});
