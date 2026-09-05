"use strict";

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const webpack = require("../lib/index");

/** @typedef {{ distinct: boolean, stable: boolean, ownUrl: string, depUrl: string }} MetaReport */

const OUTPUT_PATH = path.resolve(__dirname, "js/ImportMetaRoundTrip");

/**
 * @param {string} context entry context
 * @param {string} entry entry request
 * @param {string} outputPath where to emit
 * @returns {Promise<void>} resolves once the build is clean
 */
const compile = (context, entry, outputPath) =>
	new Promise((resolve, reject) => {
		const compiler = webpack({
			mode: "development",
			devtool: false,
			target: "node",
			context,
			entry,
			experiments: { outputModule: true },
			output: {
				module: true,
				chunkFormat: "module",
				path: outputPath,
				filename: "out.mjs"
			}
		});
		compiler.run((err, stats) => {
			if (err) return reject(err);
			const { errors } = /** @type {import("../lib/Stats")} */ (stats).toJson({
				all: false,
				errors: true
			});
			compiler.close(() => {
				if (errors && errors.length > 0) {
					reject(new Error(errors.map((e) => e.message).join("\n")));
					return;
				}
				resolve();
			});
		});
	});

/**
 * @param {string} directory directory holding the emitted bundle
 * @returns {MetaReport} what the bundle reports about its `import.meta`
 */
const run = (directory) =>
	JSON.parse(
		execFileSync(process.execPath, [path.join(directory, "out.mjs")], {
			encoding: "utf8"
		})
	);

// No harness executes re-bundled output — RoundTripConfigCases only compares
// asset names — so the emitted `import.meta` binding is driven here instead.
describe("import.meta through a second bundling pass", () => {
	it("should keep each module's own object when webpack re-bundles its output", async () => {
		fs.rmSync(OUTPUT_PATH, { recursive: true, force: true });
		const first = path.join(OUTPUT_PATH, "1");
		const second = path.join(OUTPUT_PATH, "2");

		await compile(
			path.resolve(__dirname, "fixtures/import-meta-round-trip"),
			"./index.js",
			first
		);
		await compile(first, "./out.mjs", second);

		/** @type {MetaReport} */
		const expected = {
			distinct: true,
			stable: true,
			ownUrl: "index.js",
			depUrl: "dep.js"
		};
		expect(run(first)).toEqual(expected);
		expect(run(second)).toEqual(expected);
	}, 60000);
});
