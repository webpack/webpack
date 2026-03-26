"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const { Volume, createFsFromVolume } = require("memfs");
const rimraf = require("rimraf");

const webpack = require("..");

describe("RealContentHashPlugin", () => {
	const watchIt = process.env.NO_WATCH_TESTS ? it.skip : it;

	const tempFixturePath = path.join(
		__dirname,
		"fixtures",
		"temp-real-content-hash-watch-fixture"
	);

	beforeEach(cleanup);

	afterEach(cleanup);

	/**
	 * @returns {void} Removes the temporary fixture directory.
	 */
	function cleanup() {
		rimraf.sync(tempFixturePath);
	}

	/**
	 * @returns {{ asyncEntryPath: string, syncEntryPath: string, largeSharedPath: string }} Paths to the generated fixture files.
	 */
	function createFixture() {
		cleanup();
		fs.mkdirSync(tempFixturePath, { recursive: true });

		const asyncEntryPath = path.join(tempFixturePath, "async-entry.js");
		const syncEntryPath = path.join(tempFixturePath, "sync-entry.js");
		const largeSharedPath = path.join(tempFixturePath, "large-shared.js");
		const largeText = "x".repeat(25000);

		fs.writeFileSync(asyncEntryPath, "import('./sync-entry.js');\n", "utf8");
		fs.writeFileSync(
			syncEntryPath,
			[
				"import './large-shared.js';",
				"export const syncValue = '__SYNC__';",
				"console.log(syncValue);",
				""
			].join("\n"),
			"utf8"
		);
		fs.writeFileSync(
			largeSharedPath,
			[
				`const bigTextBlob = "${largeText}";`,
				"export const sharedValue = '__SHARED__';",
				"console.log(sharedValue, bigTextBlob.length);",
				""
			].join("\n"),
			"utf8"
		);

		return {
			asyncEntryPath,
			syncEntryPath,
			largeSharedPath
		};
	}

	watchIt(
		"should not cache stale chunk filename hashes during watch rebuilds",
		(done) => {
			const { largeSharedPath } = createFixture();
			const compiler = webpack({
				mode: "production",
				context: tempFixturePath,
				cache: {
					type: "memory"
				},
				entry: {
					async: "./async-entry.js",
					sync: "./sync-entry.js",
					light: "./sync-entry.js"
				},
				output: {
					path: "/dist",
					filename: "[contenthash].js"
				},
				optimization: {
					runtimeChunk: "single",
					splitChunks: {
						chunks: "all",
						name: "js"
					}
				}
			});
			compiler.outputFileSystem = createFsFromVolume(new Volume());

			let watcher;
			let buildCount = 0;
			let doneCalled = false;

			/**
			 * @param {Error=} error error
			 * @returns {void}
			 */
			function finish(error) {
				if (doneCalled) return;
				doneCalled = true;
				if (!watcher) {
					done(error);
					return;
				}
				watcher.close((closeError) => {
					done(error || closeError || undefined);
				});
			}

			watcher = compiler.watch({ aggregateTimeout: 50 }, (error, stats) => {
				if (error) {
					finish(error);
					return;
				}

				try {
					expect(stats).toBeTruthy();
					buildCount += 1;

					if (stats.hasErrors()) {
						finish(
							new Error(
								stats.toString({
									all: false,
									errors: true,
									errorDetails: true
								})
							)
						);
						return;
					}

					if (buildCount === 1) {
						const updatedSource = fs
							.readFileSync(largeSharedPath, "utf8")
							.replace("__SHARED__", "__SHARED__CHANGED");
						fs.writeFileSync(largeSharedPath, updatedSource, "utf8");
						return;
					}

					expect(buildCount).toBe(2);
					finish();
				} catch (err) {
					finish(err);
				}
			});
		}
	);
});
