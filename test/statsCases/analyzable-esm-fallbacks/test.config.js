"use strict";

const fs = require("fs");
const path = require("path");

const HELPER = "__webpack_require__.ei";
const BAILOUT = "Analyzable ESM bailout:";

// Per case: which emitted file to inspect, and whether it emits the `.ei` helper
// ("analyzable") or keeps the runtime form and names its reason ("fallback").
const CASES = {
	analyzable: { file: "main.mjs", expect: "analyzable" },
	"public-path-override": {
		file: "main.mjs",
		expect: "fallback",
		bailout: "__webpack_public_path__ is reassigned"
	},
	// `fetchPriority` is unsupported for ESM output, so it must not degrade the
	// output — the analyzable form is still emitted (documented limitation).
	"fetch-priority": { file: "main.mjs", expect: "analyzable" },
	"content-hash": {
		file: "main.mjs",
		expect: "fallback",
		bailout: "optimization.realContentHash"
	},
	// The public path's hash is filled in by the deferred pass, and no name here is
	// built from content, so there is none for the rewrite to invalidate.
	"templated-public-path": { file: "main.mjs", expect: "analyzable" },
	"bare-public-path": { file: "main.mjs", expect: "analyzable" },
	"shared-chunk": { file: "a.mjs", expect: "analyzable" },
	prefetch: { file: "main.mjs", expect: "analyzable" },
	// The hot require wraps `.ei` like `.e`, so an update still blocks on a chunk
	// load in flight and HMR does not force the runtime form.
	hmr: { file: "main.mjs", expect: "analyzable" },
	// The entry reaches both copies from one depth, so only the chunk they share
	// falls back — read that one rather than the entry.
	"shared-depths": {
		file: "flat.mjs",
		expect: "fallback",
		bailout: "chunks at different output depths"
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
			// A bailout is recorded exactly when the runtime form is kept, so a limitation
			// that is later lifted fails here until its reason is dropped too.
			const bailouts = [];
			for (const module of child.toJson({
				all: false,
				modules: true,
				optimizationBailout: true
			}).modules || []) {
				for (const bailout of module.optimizationBailout || []) {
					if (bailout.startsWith(BAILOUT)) bailouts.push(bailout);
				}
			}
			if (testCase.expect === "analyzable") {
				expect(output).toContain(HELPER);
				expect(bailouts).toEqual([]);
			} else {
				// A limitation must not emit extra runtime — the `.ei` helper stays out.
				expect(output).not.toContain(HELPER);
				expect(bailouts.join("\n")).toContain(testCase.bailout);
			}
		}
	}
};
