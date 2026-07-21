"use strict";

const fs = require("fs");
const path = require("path");

const HELPER = "__webpack_require__.ei";

// Per case: which emitted entry to inspect and what to assert.
// - "analyzable": the baseline — emits the `.ei` helper.
// - "fallback": the whole build has no analyzable import, so no `.ei` is emitted at all.
// - "callSiteFallback": the target chunk loads via runtime `.e(...)`; a nested import
//   is still analyzable, so the `.ei` helper legitimately exists — proving the fallback
//   itself adds no extra runtime.
const CASES = {
	analyzable: { file: "main.mjs", expect: "analyzable" },
	"public-path-override": { file: "main.mjs", expect: "fallback" },
	"fetch-priority": { file: "main.mjs", expect: "fallback" },
	"content-hash": { file: "main.mjs", expect: "fallback" },
	"templated-public-path": { file: "main.mjs", expect: "fallback" },
	"bare-public-path": { file: "main.mjs", expect: "fallback" },
	"shared-chunk": { file: "a.mjs", expect: "fallback" },
	hmr: { file: "main.mjs", expect: "fallback" },
	prefetch: {
		file: "main.mjs",
		expect: "callSiteFallback",
		callSite: '__webpack_require__.e(/*! import() */ "mid_js")'
	}
};

module.exports = {
	/**
	 * @param {import("../../../").Stats} stats stats
	 */
	validate(stats) {
		const children = /** @type {{ stats?: import("../../../").Stats[] }} */ (
			stats
		).stats || [stats];
		for (const child of children) {
			const { compilation } = child;
			const name = /** @type {string} */ (compilation.name);
			const testCase = CASES[name];
			const output = fs.readFileSync(
				path.join(
					/** @type {string} */ (compilation.outputOptions.path),
					testCase.file
				),
				"utf8"
			);
			if (testCase.expect === "analyzable") {
				expect(output).toContain(HELPER);
			} else if (testCase.expect === "callSiteFallback") {
				expect(output).toContain(testCase.callSite);
			} else {
				// A limitation must not emit extra runtime — the `.ei` helper stays out.
				expect(output).not.toContain(HELPER);
			}
		}
	}
};
