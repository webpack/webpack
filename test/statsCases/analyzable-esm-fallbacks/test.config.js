"use strict";

const fs = require("fs");
const path = require("path");

const HELPER = "__webpack_require__.ei";

// Per case: which emitted entry to inspect and what to assert.
// - "analyzable": the baseline — emits the `.ei` helper.
// - "fallback": the whole build has no analyzable import, so no `.ei` is emitted at all.
const CASES = {
	analyzable: { file: "main.mjs", expect: "analyzable" },
	"public-path-override": { file: "main.mjs", expect: "fallback" },
	// `fetchPriority` is unsupported for ESM output, so it must not degrade the
	// output — the analyzable form is still emitted (documented limitation).
	"fetch-priority": { file: "main.mjs", expect: "analyzable" },
	"content-hash": { file: "main.mjs", expect: "fallback" },
	"templated-public-path": { file: "main.mjs", expect: "fallback" },
	"bare-public-path": { file: "main.mjs", expect: "fallback" },
	"shared-chunk": { file: "a.mjs", expect: "analyzable" },
	prefetch: { file: "main.mjs", expect: "analyzable" },
	hmr: { file: "main.mjs", expect: "fallback" }
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
			} else {
				// A limitation must not emit extra runtime — the `.ei` helper stays out.
				expect(output).not.toContain(HELPER);
			}
		}
	}
};
