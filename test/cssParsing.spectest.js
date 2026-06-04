"use strict";

// cspell:ignore urange

// Official css-parsing-tests suite (git submodule, like test262-cases) run
// against `lib/css/walkCssTokens`. The suite targets an older CSS Syntax
// draft, so instead of AST equality this asserts the two properties the parser
// must hold for every input: token roundtrip (slices reproduce the input) and
// termination without throwing (a hang fails via Jest's timeout).

const fs = require("fs");
const path = require("path");
const {
	TT_EOF,
	TokenStream,
	parseAListOfComponentValues,
	parseAStylesheet
} = require("../lib/css/walkCssTokens");

const casesDir = path.resolve(__dirname, "./css-parsing-tests");

/**
 * @param {EXPECTED_ANY[]} data the suite's flat [input, expected, …] array
 * @returns {string[]} the input strings (handles the `stylesheet_bytes` shape)
 */
const inputsOf = (data) => {
	const inputs = [];
	for (let i = 0; i < data.length; i += 2) {
		const value = data[i];
		if (typeof value === "string") {
			inputs.push(value);
		} else if (value && typeof value.css_bytes === "string") {
			inputs.push(value.css_bytes);
		}
	}
	return inputs;
};

/**
 * @param {string} input CSS source
 * @returns {string} the input reconstructed from token source slices
 */
const tokenRoundtrip = (input) => {
	let out = "";
	for (const t of new TokenStream(input).tokenize()) {
		if (t.type === TT_EOF) break;
		out += input.slice(t.start, t.end);
	}
	return out;
};

const testFiles = fs.existsSync(casesDir)
	? fs
			.readdirSync(casesDir)
			.filter((f) => f.endsWith(".json"))
			.sort()
	: [];

describe("css-parsing-tests", () => {
	if (testFiles.length === 0) {
		it("submodule not initialized (run `git submodule update --init test/css-parsing-tests`)", () => {
			// No-op: the conformance data is an optional git submodule.
		});

		return;
	}

	for (const file of testFiles) {
		const inputs = inputsOf(
			JSON.parse(fs.readFileSync(path.join(casesDir, file), "utf8"))
		);

		it(`${file} (${inputs.length} cases)`, () => {
			/** @type {string[]} */
			const failures = [];
			for (const input of inputs) {
				const safe = JSON.stringify(input).slice(0, 80);
				// Robustness: every entry point must terminate without throwing.
				try {
					parseAStylesheet(input);
					parseAListOfComponentValues(input, 0, {});
				} catch (err) {
					failures.push(
						`[throw] ${safe}: ${/** @type {Error} */ (err).message}`
					);
					continue;
				}
				// Token roundtrip: the tokenizer must cover all input bytes.
				const rt = tokenRoundtrip(input);
				if (rt !== input) {
					failures.push(`[roundtrip] ${safe}`);
				}
			}
			if (failures.length > 0) {
				throw new Error(
					`${
						failures.length
					} css-parsing-tests case(s) failed in ${file}:\n${failures.join(
						"\n"
					)}`
				);
			}
		});
	}
});
