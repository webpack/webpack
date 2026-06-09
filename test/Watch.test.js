"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const { Volume, createFsFromVolume } = require("memfs");
const webpack = require("..");

describe("Watch", () => {
	it("should only compile a single time", (done) => {
		let counterBeforeCompile = 0;
		let counterDone = 0;
		let counterHandler = 0;
		const compiler = /** @type {import("../").Compiler} */ (
			webpack(
				{
					context: path.resolve(__dirname, "fixtures/watch"),
					watch: true,
					mode: "development",
					snapshot: {
						managedPaths: [/^(.+?[\\/]node_modules[\\/])/]
					},
					experiments: {
						futureDefaults: true
					},
					module: {
						// unsafeCache: false,
						rules: [
							{
								test: /\.js$/,
								use: "some-loader"
							}
						]
					},
					plugins: [
						(c) => {
							c.hooks.beforeCompile.tap("test", () => {
								counterBeforeCompile++;
							});
							c.hooks.done.tap("test", () => {
								counterDone++;
							});
						}
					]
				},
				(err, stats) => {
					if (err) return done(err);
					if (/** @type {import("../").Stats} */ (stats).hasErrors())
						return done(
							new Error(/** @type {import("../").Stats} */ (stats).toString())
						);
					counterHandler++;
				}
			)
		);
		compiler.outputFileSystem =
			/** @type {import("../").OutputFileSystem} */ (
				/** @type {unknown} */ (createFsFromVolume(new Volume()))
			);
		setTimeout(() => {
			expect(counterBeforeCompile).toBe(1);
			expect(counterDone).toBe(1);
			expect(counterHandler).toBe(1);
			compiler.close(done);
		}, 5000);
	});

	it("should correctly emit asset when invalidation occurs again", (done) => {
		/**
		 * @param {unknown} err
		 */
		function handleError(err) {
			if (err) done(/** @type {Error} */ (err));
		}
		let calls = 0;
		const compiler = webpack({
			mode: "development",
			context: path.resolve(__dirname, "fixtures/watch"),
			plugins: [
				(c) => {
					// Ensure the second invalidation can occur during compiler running
					let once = false;
					c.hooks.afterCompile.tapAsync("LongTask", (_, cb) => {
						if (once) return cb();
						once = true;
						setTimeout(() => {
							cb();
						}, 1000);
					});
				},
				(c) => {
					c.hooks.done.tap("Test", () => {
						// Should emit assets twice, instead of once
						expect(calls).toBe(2);
						done();
					});
				}
			]
		});

		compiler.watch({}, handleError);
		compiler.hooks.emit.tap("Test", () => {
			calls++;
		});

		// First invalidation
		/** @type {import("../").Watching} */ (compiler.watching).invalidate();
		// Second invalidation while compiler is still running
		setTimeout(() => {
			/** @type {import("../").Watching} */ (compiler.watching).invalidate();
		}, 50);
	});
});
