"use strict";

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");

const CONTEXT = path.resolve(
	__dirname,
	"configCases/performance/missing-side-effects-tie"
);

/**
 * Builds the fixture once and reports what identifies the build.
 * @param {import("../declarations/WebpackOptions").PerformanceOptions | false} performance the performance options
 * @returns {Promise<{ hash: string, warnings: string[] }>} the build's hash and warnings
 */
const build = (performance) =>
	new Promise((resolve, reject) => {
		const compiler = webpack({
			mode: "production",
			context: CONTEXT,
			entry: "./index.js",
			optimization: { minimize: false },
			output: { path: "/out" },
			performance
		});

		compiler.outputFileSystem = /** @type {import("../").OutputFileSystem} */ (
			/** @type {unknown} */ (createFsFromVolume(new Volume()))
		);
		compiler.run((err, stats) => {
			if (err) return reject(err);
			const json = /** @type {import("../").Stats} */ (stats).toJson({
				all: false,
				hash: true,
				warnings: true
			});
			compiler.close((closeErr) => {
				if (closeErr) return reject(closeErr);
				resolve({
					hash: /** @type {string} */ (json.hash),
					warnings: (json.warnings || []).map((warning) => warning.message)
				});
			});
		});
	});

describe("PerformanceHintsHash", () => {
	it("should not change the hash when a hint reports", async () => {
		const off = await build({ hints: false });
		const on = await build({ hints: "warning", missingSideEffects: true });

		// The hint has to actually fire, or the comparison proves nothing.
		expect(on.warnings).toHaveLength(1);
		expect(on.warnings[0]).toMatch(/missing sideEffects:/);
		expect(off.warnings).toHaveLength(0);

		// `Compilation.createHash` folds every warning message into the hash, so a
		// hint reported before it would rename every `[fullhash]` asset.
		expect(on.hash).toBe(off.hash);
	});

	it("should not change the hash when a hint is escalated to an error", async () => {
		const off = await build({ hints: false });
		const asError = await build({
			hints: "error",
			missingSideEffects: true
		});

		expect(asError.hash).toBe(off.hash);
	});
});
