"use strict";

require("./helpers/warmup-webpack");

const fs = require("fs");
const path = require("path");
const rimraf = require("rimraf");
const DelegatedModule = require("../lib/dll/DelegatedModule");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

/**
 * @param {import("../").Compiler} compiler compiler
 * @returns {Promise<import("../").Stats>} stats
 */
const run = (compiler) =>
	new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err) return reject(err);
			if (!stats) return reject(new Error("No stats"));
			if (stats.hasErrors()) {
				return reject(new Error(stats.toString({ errors: true })));
			}
			resolve(stats);
		});
	});

/**
 * @param {import("../").Compiler} compiler compiler
 * @returns {Promise<void>}
 */
const close = (compiler) =>
	new Promise((resolve, reject) => {
		compiler.close((err) => (err ? reject(err) : resolve()));
	});

describe("DelegatedModule persistent cache without Dll plugins", () => {
	expectNoDeprecations();

	const tempPath = path.resolve(
		__dirname,
		"js",
		"delegated-module-fs-cache-no-dll"
	);
	const cacheDirectory = path.join(tempPath, "cache");
	const outputPath = path.join(tempPath, "dist");
	const manifestPath = path.join(tempPath, "manifest.json");

	beforeEach((done) => {
		rimraf(tempPath, (/** @type {Error | null | undefined} */ err) => {
			if (err) return done(err);
			fs.mkdirSync(tempPath, { recursive: true });
			done();
		});
	});

	it("should restore DelegatedModule from the filesystem cache without Dll plugins", async () => {
		const webpack = require("..");

		fs.writeFileSync(
			manifestPath,
			JSON.stringify({
				name: "function(id) { return { default: 'dll-default' }; }",
				content: {
					"./item.js": {
						id: "./item.js",
						buildMeta: {
							exportsType: "namespace",
							strictHarmonyModule: true
						},
						exports: ["default", "old"]
					}
				}
			})
		);
		fs.writeFileSync(
			path.join(tempPath, "index.js"),
			'import value from "dll/item"; export default value;'
		);

		/** @type {string | undefined} */
		let delegatedIdentifier;
		/** @type {import("../lib/dll/DelegatedModule").DelegatedModuleData | undefined} */
		let storedDelegateData;

		const first = webpack({
			context: tempPath,
			mode: "production",
			entry: "./index.js",
			target: "node",
			devtool: false,
			cache: {
				type: "filesystem",
				cacheDirectory,
				name: "delegated-no-dll"
			},
			output: {
				path: outputPath,
				filename: "app.js",
				library: { type: "commonjs2" }
			},
			optimization: {
				concatenateModules: false,
				minimize: false,
				providedExports: true
			},
			plugins: [
				new webpack.DllReferencePlugin({
					scope: "dll",
					name: "function(id) { return { default: 'dll-default' }; }",
					manifest: manifestPath
				}),
				{
					apply(compiler) {
						compiler.hooks.compilation.tap(
							"CaptureDelegatedModule",
							(compilation) => {
								compilation.hooks.finishModules.tap(
									"CaptureDelegatedModule",
									() => {
										const module = [...compilation.modules].find((m) =>
											m.identifier().startsWith("delegated ")
										);
										expect(module).toBeInstanceOf(DelegatedModule);
										const delegated =
											/** @type {InstanceType<typeof DelegatedModule>} */ (
												/** @type {unknown} */ (module)
											);
										delegatedIdentifier = delegated.identifier();
										storedDelegateData = delegated.delegateData;
									}
								);
							}
						);
					}
				}
			]
		});

		try {
			await run(first);
		} finally {
			await close(first);
		}

		expect(delegatedIdentifier).toBeDefined();
		expect(storedDelegateData).toEqual({
			id: "./item.js",
			buildMeta: {
				exportsType: "namespace",
				strictHarmonyModule: true
			},
			exports: ["default", "old"]
		});

		// Drop the manifest so step 2 cannot re-read DLL metadata from disk.
		fs.unlinkSync(manifestPath);

		/** @type {import("../").Module | undefined} */
		let restored;
		/** @type {Error | null | undefined} */
		let restoreError;

		const second = webpack({
			context: tempPath,
			mode: "production",
			// No import of dll/* — only probe the modules cache.
			entry: "./empty.js",
			target: "node",
			devtool: false,
			cache: {
				type: "filesystem",
				cacheDirectory,
				name: "delegated-no-dll"
			},
			output: {
				path: outputPath,
				filename: "empty.js"
			},
			plugins: [
				{
					apply(compiler) {
						compiler.hooks.compilation.tap(
							"RestoreDelegatedModule",
							(compilation) => {
								compilation.hooks.finishModules.tapAsync(
									"RestoreDelegatedModule",
									(_modules, callback) => {
										compilation
											.getCache("Compilation/modules")
											.get(
												/** @type {string} */ (delegatedIdentifier),
												null,
												(err, module) => {
													restoreError = err;
													restored = module;
													callback();
												}
											);
									}
								);
							}
						);
					}
				}
			]
		});

		fs.writeFileSync(path.join(tempPath, "empty.js"), "export default 1;");

		try {
			await run(second);
		} finally {
			await close(second);
		}

		expect(restoreError).toBeFalsy();
		expect(restored).toBeInstanceOf(DelegatedModule);
		const restoredDelegated =
			/** @type {InstanceType<typeof DelegatedModule>} */ (
				/** @type {unknown} */ (restored)
			);
		expect(restoredDelegated.identifier()).toBe(delegatedIdentifier);
		expect(restoredDelegated.delegateData).toEqual(storedDelegateData);
		expect(restoredDelegated.buildMeta).toMatchObject({
			exportsType: "namespace",
			strictHarmonyModule: true
		});
	}, 60000);

	it("should not resolve dll/* in a normal compile without DllReferencePlugin", async () => {
		const webpack = require("..");

		fs.writeFileSync(
			manifestPath,
			JSON.stringify({
				name: "function(id) { return { default: 'dll-default' }; }",
				content: {
					"./item.js": {
						id: "./item.js",
						buildMeta: { exportsType: "namespace" },
						exports: ["default"]
					}
				}
			})
		);
		fs.writeFileSync(
			path.join(tempPath, "index.js"),
			'import value from "dll/item"; export default value;'
		);

		const first = webpack({
			context: tempPath,
			mode: "production",
			entry: "./index.js",
			target: "node",
			devtool: false,
			cache: {
				type: "filesystem",
				cacheDirectory,
				name: "delegated-no-dll-resolve"
			},
			output: {
				path: outputPath,
				filename: "app.js"
			},
			plugins: [
				new webpack.DllReferencePlugin({
					scope: "dll",
					name: "function(id) { return { default: 'dll-default' }; }",
					manifest: manifestPath
				})
			]
		});
		try {
			await run(first);
		} finally {
			await close(first);
		}

		const second = webpack({
			context: tempPath,
			mode: "production",
			entry: "./index.js",
			target: "node",
			devtool: false,
			cache: {
				type: "filesystem",
				cacheDirectory,
				name: "delegated-no-dll-resolve"
			},
			output: {
				path: outputPath,
				filename: "app2.js"
			}
			// Intentionally no DllReferencePlugin / DllPlugin.
		});

		await expect(run(second).finally(() => close(second))).rejects.toThrow(
			/Can't resolve 'dll\/item'/
		);
	}, 60000);
});
