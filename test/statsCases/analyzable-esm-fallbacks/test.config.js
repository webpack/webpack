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
	// The entry is named by its own content with nothing to repair that name after a
	// rewrite, so what the stand-in resolves to is folded into its hash instead.
	"content-hash": { file: /^main\./, expect: "analyzable" },
	// The public path's hash is filled in by the deferred pass, and no name here is
	// built from content, so there is none for the rewrite to invalidate.
	"templated-public-path": { file: "main.mjs", expect: "analyzable" },
	"bare-public-path": { file: "main.mjs", expect: "analyzable" },
	"shared-chunk": { file: "a.mjs", expect: "analyzable" },
	prefetch: { file: "main.mjs", expect: "analyzable" },
	// The hot require wraps `.ei` like `.e`, so an update still blocks on a chunk
	// load in flight and HMR does not force the runtime form.
	hmr: { file: "main.mjs", expect: "analyzable" },
	// Two depths need a per-asset stand-in for the `../` path, and the chunks it lands in
	// are named by their content — the depth is read off the template with the hashes
	// neutralized, so it folds into those names like any other part.
	"shared-depths": { file: /^flat\./, expect: "analyzable" },
	"eval-devtool": {
		file: "main.mjs",
		expect: "fallback",
		bailout: "wraps the module in eval()"
	},
	"worker-chunk-loading": {
		file: "main.mjs",
		expect: "fallback",
		bailout: 'not "import"'
	},
	"chunk-format": {
		file: "main.mjs",
		expect: "fallback",
		bailout: "output.chunkFormat is"
	},
	"import-function-name": {
		file: "main.mjs",
		expect: "fallback",
		bailout: "output.importFunctionName is"
	},
	// ESM output writes `import.meta` whatever `environment.module` claims, so the
	// url forms bake too.
	"environment-module": { file: "main.mjs", expect: "analyzable" },
	// The pair naming each other is repaired after the fill, so both directions bake.
	circular: { file: "main.mjs", expect: "analyzable" },
	// A relative base is read against the chunk at runtime, so the literal spells it
	// there rather than resolving against it — no base of its own is needed.
	"base-uri": { file: "main.mjs", expect: "analyzable" },
	// The runtime's stylesheet map is baked under HMR where nothing an update moves
	// reaches it without re-shipping the module holding it.
	"hmr-css-urls": {
		file: "main.mjs",
		expect: "analyzable",
		contains: "cssUrls = {"
	},
	"hmr-hashed-css": {
		file: "main.mjs",
		expect: "partial",
		bailout: "a hot update can move this name",
		lacks: "cssUrls = {"
	},
	"hmr-css-depth": {
		file: "js/main.mjs",
		expect: "partial",
		bailout: "output.hotUpdateChunkFilename",
		lacks: "cssUrls = {"
	},
	// The chunk `import()` bakes, the url in the chunk served both ways does not.
	"served-both-ways": {
		file: "side.mjs",
		expect: "partial",
		bailout: 'or "auto", is read the same from both'
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
			const outputPath = /** @type {string} */ (compilation.outputOptions.path);
			// Found rather than named where the chunk carries a content hash.
			const file =
				typeof testCase.file === "string"
					? testCase.file
					: /** @type {string} */ (
							fs
								.readdirSync(outputPath)
								.find((name) => testCase.file.test(name))
						);
			const output = fs.readFileSync(path.join(outputPath, file), "utf8");
			// A bailout is recorded exactly when the runtime form is kept, so a limitation
			// that is later lifted fails here until its reason is dropped too.
			const bailouts = [];
			// A runtime module reports why its url map kept the runtime form.
			for (const module of child.toJson({
				all: false,
				modules: true,
				runtimeModules: true,
				optimizationBailout: true
			}).modules || []) {
				for (const bailout of module.optimizationBailout || []) {
					if (bailout.startsWith(BAILOUT)) bailouts.push(bailout);
				}
			}
			if (testCase.contains) expect(output).toContain(testCase.contains);
			if (testCase.lacks) expect(output).not.toContain(testCase.lacks);
			if (testCase.expect === "analyzable") {
				expect(output).toContain(HELPER);
				expect(bailouts).toEqual([]);
			} else if (testCase.expect === "partial") {
				// A limitation that stops some references and not others leaves the rest
				// baked, so the helper is still the right thing to find.
				expect(output).toContain(HELPER);
				expect(bailouts.join("\n")).toContain(testCase.bailout);
			} else {
				// A limitation must not emit extra runtime — the `.ei` helper stays out.
				expect(output).not.toContain(HELPER);
				expect(bailouts.join("\n")).toContain(testCase.bailout);
			}
		}
	}
};
