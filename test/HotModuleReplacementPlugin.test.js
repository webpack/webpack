"use strict";

const path = require("path");
const fs = require("graceful-fs");

const webpack = require("..");
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

expectNoDeprecations();

describe("HotModuleReplacementPlugin", () => {
	it("should not have circular hashes but equal if unmodified", (done) => {
		const entryFile = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"entry.js"
		);
		const statsFile1 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"HotModuleReplacementPlugin.test.stats1.txt"
		);
		const statsFile2 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"HotModuleReplacementPlugin.test.stats2.txt"
		);
		const recordsFile = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"records.json"
		);
		try {
			fs.mkdirSync(path.join(__dirname, "js", "HotModuleReplacementPlugin"), {
				recursive: true
			});
		} catch (_err) {
			// empty
		}
		try {
			fs.unlinkSync(recordsFile);
		} catch (_err) {
			// empty
		}
		const compiler = webpack({
			cache: false,
			entry: entryFile,
			recordsPath: recordsFile,
			output: {
				path: path.join(__dirname, "js", "HotModuleReplacementPlugin")
			},
			plugins: [new webpack.HotModuleReplacementPlugin()],
			optimization: {
				moduleIds: "size",
				chunkIds: "size"
			}
		});
		fs.writeFileSync(entryFile, "1", "utf8");
		compiler.run((err, _stats) => {
			if (err) throw err;
			const stats = /** @type {import("../").Stats} */ (_stats);
			const oldHash1 = stats.toJson().hash;
			fs.writeFileSync(statsFile1, stats.toString());
			compiler.run((err, _stats) => {
				if (err) throw err;
				const stats = /** @type {import("../").Stats} */ (_stats);
				const lastHash1 = stats.toJson().hash;
				fs.writeFileSync(statsFile2, stats.toString());
				expect(lastHash1).toBe(oldHash1); // hash shouldn't change when bundle stay equal
				fs.writeFileSync(entryFile, "2", "utf8");
				compiler.run((err, _stats) => {
					if (err) throw err;
					const stats = /** @type {import("../").Stats} */ (_stats);
					const lastHash2 = stats.toJson().hash;
					fs.writeFileSync(statsFile1, stats.toString());
					expect(lastHash2).not.toBe(lastHash1); // hash should change when bundle changes
					fs.writeFileSync(entryFile, "1", "utf8");
					compiler.run((err, _stats) => {
						if (err) throw err;
						const stats = /** @type {import("../").Stats} */ (_stats);
						const currentHash1 = stats.toJson().hash;
						fs.writeFileSync(statsFile2, stats.toString());
						expect(currentHash1).not.toBe(lastHash1); // hash shouldn't change to the first hash if bundle changed back to first bundle
						fs.writeFileSync(entryFile, "2", "utf8");
						compiler.run((err, _stats) => {
							if (err) throw err;
							const stats = /** @type {import("../").Stats} */ (_stats);
							const currentHash2 = stats.toJson().hash;
							fs.writeFileSync(statsFile1, stats.toString());
							compiler.run((err, _stats) => {
								if (err) throw err;
								const stats = /** @type {import("../").Stats} */ (_stats);
								expect(stats.toJson().hash).toBe(currentHash2);
								expect(currentHash2).not.toBe(lastHash2);
								expect(currentHash1).not.toBe(currentHash2);
								expect(lastHash1).not.toBe(lastHash2);
								done();
							});
						});
					});
				});
			});
		});
	}, 120000);

	it("output.clean=true should keep 1 last update", (done) => {
		const outputPath = path.join(__dirname, "js", "HotModuleReplacementPlugin");
		const entryFile = path.join(outputPath, "entry.js");
		const recordsFile = path.join(outputPath, "records.json");
		let step = 0;
		/** @type {string} */
		let firstUpdate;
		try {
			fs.mkdirSync(outputPath, { recursive: true });
		} catch (_err) {
			// empty
		}
		fs.writeFileSync(entryFile, `${++step}`, "utf8");
		const updates = new Set();
		const hasFile = (/** @type {string} */ file) => {
			try {
				fs.statSync(path.join(outputPath, file));
				return true;
			} catch (_err) {
				return false;
			}
		};
		const compiler = webpack({
			mode: "development",
			cache: false,
			entry: {
				0: entryFile
			},
			recordsPath: recordsFile,
			output: {
				path: outputPath,
				clean: true
			},
			plugins: [new webpack.HotModuleReplacementPlugin()]
		});
		const callback = (
			/** @type {Error | null} */ err,
			/** @type {import("../").Stats | undefined} */ _stats
		) => {
			if (err) return done(err);
			const stats = /** @type {import("../").Stats} */ (_stats);
			const jsonStats = stats.toJson();
			const hash = jsonStats.hash;
			const hmrUpdateMainFileName = `0.${hash}.hot-update.json`;

			switch (step) {
				case 1:
					expect(updates.size).toBe(0);
					firstUpdate = hmrUpdateMainFileName;
					break;
				case 2:
					expect(updates.size).toBe(1);
					expect(updates.has(firstUpdate)).toBe(true);
					expect(hasFile(firstUpdate)).toBe(true);
					break;
				case 3:
					expect(updates.size).toBe(2);
					for (const file of updates) {
						expect(hasFile(file)).toBe(true);
					}
					return setTimeout(() => {
						fs.writeFileSync(entryFile, `${++step}`, "utf8");
						compiler.run((err) => {
							if (err) return done(err);
							for (const file of updates) {
								expect(hasFile(file)).toBe(false);
							}
							done();
						});
					}, 10100);
			}

			updates.add(hmrUpdateMainFileName);
			fs.writeFileSync(entryFile, `${++step}`, "utf8");
			compiler.run(callback);
		};

		compiler.run(callback);
	}, 20000);

	it("should correct working when entry is Object and key is a number", (done) => {
		const outputPath = path.join(__dirname, "js", "HotModuleReplacementPlugin");
		const entryFile = path.join(outputPath, "entry.js");
		const statsFile3 = path.join(
			outputPath,
			"HotModuleReplacementPlugin.test.stats3.txt"
		);
		const statsFile4 = path.join(
			outputPath,
			"HotModuleReplacementPlugin.test.stats4.txt"
		);
		const recordsFile = path.join(outputPath, "records.json");
		try {
			fs.mkdirSync(outputPath, { recursive: true });
		} catch (_err) {
			// empty
		}
		try {
			fs.unlinkSync(recordsFile);
		} catch (_err) {
			// empty
		}
		const compiler = webpack({
			mode: "development",
			cache: false,
			entry: {
				0: entryFile
			},
			recordsPath: recordsFile,
			output: {
				path: outputPath
			},
			plugins: [new webpack.HotModuleReplacementPlugin()],
			optimization: {
				chunkIds: "named"
			}
		});
		fs.writeFileSync(entryFile, "1", "utf8");
		compiler.run((err, _stats) => {
			if (err) throw err;
			const stats = /** @type {import("../").Stats} */ (_stats);
			const jsonStats = stats.toJson();
			const hash = jsonStats.hash;
			const chunkName = Object.keys(
				/** @type {Record<string, string[]>} */ (jsonStats.assetsByChunkName)
			)[0];
			fs.writeFileSync(statsFile3, stats.toString());
			compiler.run((err, _stats) => {
				if (err) throw err;
				const stats = /** @type {import("../").Stats} */ (_stats);
				fs.writeFileSync(statsFile4, stats.toString());
				fs.writeFileSync(entryFile, "2", "utf8");
				compiler.run((err, _stats) => {
					if (err) throw err;
					const stats = /** @type {import("../").Stats} */ (_stats);
					fs.writeFileSync(statsFile3, stats.toString());
					const result = JSON.parse(
						fs.readFileSync(
							path.join(outputPath, `0.${hash}.hot-update.json`),
							"utf8"
						)
					).c;
					expect(result).toEqual([chunkName]);
					done();
				});
			});
		});
	});

	it("should handle entryFile that contains path variable", (done) => {
		const entryFile = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"[name]",
			"entry.js"
		);
		const statsFile3 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"HotModuleReplacementPlugin.test.stats3.txt"
		);
		const statsFile4 = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"HotModuleReplacementPlugin.test.stats4.txt"
		);
		const recordsFile = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"records.json"
		);
		try {
			fs.mkdirSync(
				path.join(__dirname, "js", "HotModuleReplacementPlugin", "[name]"),
				{
					recursive: true
				}
			);
		} catch (_err) {
			// empty
		}
		try {
			fs.unlinkSync(recordsFile);
		} catch (_err) {
			// empty
		}
		const compiler = webpack({
			mode: "development",
			cache: false,
			entry: {
				"[name]/entry.js": entryFile
			},
			recordsPath: recordsFile,
			output: {
				filename: "[name]",
				chunkFilename: "[name].js",
				path: path.join(__dirname, "js", "HotModuleReplacementPlugin"),
				hotUpdateChunkFilename: "static/webpack/[id].[fullhash].hot-update.js",
				hotUpdateMainFilename: "static/webpack/[fullhash].hot-update.json"
			},
			plugins: [new webpack.HotModuleReplacementPlugin()],
			optimization: {
				chunkIds: "named"
			}
		});
		fs.writeFileSync(entryFile, "1", "utf8");
		compiler.run((err, _stats) => {
			if (err) return done(err);
			const stats = /** @type {import("../").Stats} */ (_stats);
			fs.writeFileSync(statsFile3, stats.toString());
			compiler.run((err, _stats) => {
				if (err) return done(err);
				const stats = /** @type {import("../").Stats} */ (_stats);
				fs.writeFileSync(statsFile4, stats.toString());
				fs.writeFileSync(entryFile, "2", "utf8");
				compiler.run((err, _stats) => {
					if (err) return done(err);
					const stats = /** @type {import("../").Stats} */ (_stats);
					fs.writeFileSync(statsFile3, stats.toString());

					let foundUpdates = false;

					for (const key of Object.keys(stats.compilation.assets)) {
						foundUpdates =
							foundUpdates ||
							Boolean(
								/static\/webpack\/\[name\]\/entry\.js\..*?\.hot-update\.js/.test(
									key
								)
							);
					}

					expect(foundUpdates).toBe(true);
					done();
				});
			});
		});
	});

	// Two runtimes (entries `a` and `b`) initially share `shared`+`x` in one split
	// chunk. On the second build `b` switches to `import("./shared")`, so for runtime
	// `b` those modules leave the (loaded) `shared` chunk and move into a new async
	// chunk `lazyShared` that the client has not loaded. Without the force-load fix the
	// `b` update would remove the `shared` chunk (`r`) yet dispose nothing (`m` empty),
	// leaving `shared`/`x` loaded with no installed chunk owning them and cutting off
	// their future HMR updates. The fix lists the new owning chunk in `f` so the client
	// force-loads it.
	it("should force-load the new owning chunk when a module's only loaded chunk is removed from a runtime", async () => {
		const dir = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"orphan-on-chunk-migration"
		);
		const src = path.join(dir, "src");
		const out = path.join(dir, "dist");
		const recordsFile = path.join(dir, "records.json");
		fs.mkdirSync(src, { recursive: true });
		try {
			fs.unlinkSync(recordsFile);
		} catch (_err) {
			// empty
		}

		fs.writeFileSync(path.join(src, "x.js"), "export default 1;\n");
		fs.writeFileSync(
			path.join(src, "shared.js"),
			'import v from "./x";\nexport const g = () => v;\n'
		);
		fs.writeFileSync(
			path.join(src, "a.js"),
			'import { g } from "./shared";\nconsole.log("a", g());\nif (module.hot) module.hot.accept();\n'
		);
		// build 1: `b` statically imports `shared` -> shared chunk is {a, b}
		fs.writeFileSync(
			path.join(src, "b.js"),
			'import { g } from "./shared";\nconsole.log("b", g());\nif (module.hot) module.hot.accept();\n'
		);

		const compiler = webpack({
			mode: "development",
			devtool: false,
			cache: false,
			context: dir,
			entry: { a: "./src/a.js", b: "./src/b.js" },
			output: { path: out, filename: "[name].js" },
			recordsPath: recordsFile,
			optimization: {
				chunkIds: "named",
				runtimeChunk: false,
				splitChunks: {
					chunks: "initial",
					minSize: 0,
					cacheGroups: {
						shared: {
							test: /shared|x\.js/,
							name: "shared",
							enforce: true
						}
					}
				}
			},
			plugins: [new webpack.HotModuleReplacementPlugin()]
		});
		const run = () =>
			new Promise((resolve, reject) => {
				compiler.run((err, _stats) => {
					if (err) return reject(err);
					const stats = /** @type {import("../").Stats} */ (_stats);
					if (stats.hasErrors()) {
						return reject(
							new Error(stats.toString({ all: false, errors: true }))
						);
					}
					resolve(stats);
				});
			});

		await run();
		const before = new Set(fs.readdirSync(out));

		// build 2: `b` switches to a dynamic import -> shared/x migrate out of the
		// loaded `shared` chunk into a b-only async chunk `lazyShared`.
		fs.writeFileSync(
			path.join(src, "b.js"),
			'const p = import(/* webpackChunkName: "lazyShared" */ "./shared");\np.then(({ g }) => console.log("b", g()));\nif (module.hot) module.hot.accept();\n'
		);
		await run();

		const bUpdate = fs
			.readdirSync(out)
			.find((f) => !before.has(f) && /^b\..*\.hot-update\.json$/.test(f));
		expect(bUpdate).toBeDefined();
		const manifest = JSON.parse(
			fs.readFileSync(path.join(out, /** @type {string} */ (bUpdate)), "utf8")
		);

		await new Promise((resolve) => {
			compiler.close(resolve);
		});

		// The `shared` chunk is removed from runtime `b`...
		expect(manifest.r).toContain("shared");
		// ...the migrated modules are not disposed (they still live in `b`)...
		expect(manifest.m).toEqual([]);
		// ...and the new owning chunk is force-loaded so they keep an installed owner.
		expect(manifest.f).toContain("lazyShared");
	}, 120000);

	// Counterpart to the force-load case: when the module no longer lives in the
	// runtime at all, it is disposed (added to `m`), not force-loaded.
	it("should dispose a module that no longer lives in a runtime its chunk left", async () => {
		const dir = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"dispose-on-runtime-removal"
		);
		const src = path.join(dir, "src");
		const out = path.join(dir, "dist");
		const recordsFile = path.join(dir, "records.json");
		fs.mkdirSync(src, { recursive: true });
		try {
			fs.unlinkSync(recordsFile);
		} catch (_err) {
			// empty
		}

		fs.writeFileSync(
			path.join(src, "shared.js"),
			"export const g = () => 1;\n"
		);
		fs.writeFileSync(
			path.join(src, "a.js"),
			'import { g } from "./shared";\nconsole.log("a", g());\nif (module.hot) module.hot.accept();\n'
		);
		fs.writeFileSync(
			path.join(src, "b.js"),
			'import { g } from "./shared";\nconsole.log("b", g());\nif (module.hot) module.hot.accept();\n'
		);

		const compiler = webpack({
			mode: "development",
			devtool: false,
			cache: false,
			context: dir,
			entry: { a: "./src/a.js", b: "./src/b.js" },
			output: { path: out, filename: "[name].js" },
			recordsPath: recordsFile,
			optimization: {
				moduleIds: "named",
				chunkIds: "named",
				runtimeChunk: false,
				splitChunks: {
					chunks: "initial",
					minSize: 0,
					cacheGroups: {
						shared: { test: /shared/, name: "shared", enforce: true }
					}
				}
			},
			plugins: [new webpack.HotModuleReplacementPlugin()]
		});
		const run = () =>
			new Promise((resolve, reject) => {
				compiler.run((err, _stats) => {
					if (err) return reject(err);
					const stats = /** @type {import("../").Stats} */ (_stats);
					if (stats.hasErrors()) {
						return reject(
							new Error(stats.toString({ all: false, errors: true }))
						);
					}
					resolve(stats);
				});
			});

		await run();
		const before = new Set(fs.readdirSync(out));

		// build 2: `b` stops importing `shared`, so the shared chunk leaves runtime
		// `b` entirely and the module no longer lives there.
		fs.writeFileSync(
			path.join(src, "b.js"),
			'console.log("b");\nif (module.hot) module.hot.accept();\n'
		);
		await run();

		const bUpdate = fs
			.readdirSync(out)
			.find((f) => !before.has(f) && /^b\..*\.hot-update\.json$/.test(f));
		expect(bUpdate).toBeDefined();
		const manifest = JSON.parse(
			fs.readFileSync(path.join(out, /** @type {string} */ (bUpdate)), "utf8")
		);
		await new Promise((resolve) => {
			compiler.close(resolve);
		});

		expect(manifest.r).toContain("shared");
		expect(manifest.m).toContain("./src/shared.js");
		expect(manifest.f).toBeUndefined();
	}, 120000);

	// With a non-unique hotUpdateMainFilename the per-runtime updates collide and
	// are merged (with a warning); the merge must carry force-load chunks too.
	it("should merge force-load chunks across runtimes on hotUpdateMainFilename collision", async () => {
		const dir = path.join(
			__dirname,
			"js",
			"HotModuleReplacementPlugin",
			"force-load-filename-collision"
		);
		const src = path.join(dir, "src");
		const out = path.join(dir, "dist");
		const recordsFile = path.join(dir, "records.json");
		fs.mkdirSync(src, { recursive: true });
		try {
			fs.unlinkSync(recordsFile);
		} catch (_err) {
			// empty
		}

		fs.writeFileSync(path.join(src, "x.js"), "export default 1;\n");
		fs.writeFileSync(
			path.join(src, "shared.js"),
			'import v from "./x";\nexport const g = () => v;\n'
		);
		fs.writeFileSync(
			path.join(src, "a.js"),
			'import { g } from "./shared";\nconsole.log("a", g());\nif (module.hot) module.hot.accept();\n'
		);
		fs.writeFileSync(
			path.join(src, "b.js"),
			'import { g } from "./shared";\nconsole.log("b", g());\nif (module.hot) module.hot.accept();\n'
		);

		const compiler = webpack({
			mode: "development",
			devtool: false,
			cache: false,
			context: dir,
			entry: { a: "./src/a.js", b: "./src/b.js" },
			output: {
				path: out,
				filename: "[name].js",
				// no [runtime] -> both runtimes write the same update manifest filename
				hotUpdateMainFilename: "[fullhash].hot-update.json"
			},
			recordsPath: recordsFile,
			optimization: {
				chunkIds: "named",
				runtimeChunk: false,
				splitChunks: {
					chunks: "initial",
					minSize: 0,
					cacheGroups: {
						shared: { test: /shared|x\.js/, name: "shared", enforce: true }
					}
				}
			},
			plugins: [new webpack.HotModuleReplacementPlugin()]
		});
		const run = () =>
			new Promise((resolve, reject) => {
				compiler.run((err, _stats) => {
					if (err) return reject(err);
					const stats = /** @type {import("../").Stats} */ (_stats);
					if (stats.hasErrors()) {
						return reject(
							new Error(stats.toString({ all: false, errors: true }))
						);
					}
					resolve(stats);
				});
			});

		await run();
		// build 2: `b` migrates `shared` into a b-only async chunk (force-load case)
		fs.writeFileSync(
			path.join(src, "b.js"),
			'const p = import(/* webpackChunkName: "lazyShared" */ "./shared");\np.then(({ g }) => console.log("b", g()));\nif (module.hot) module.hot.accept();\n'
		);
		const stats = /** @type {import("../").Stats} */ (await run());
		const { warnings } = stats.toJson({ all: false, warnings: true });
		await new Promise((resolve) => {
			compiler.close(resolve);
		});

		expect(
			/** @type {import("../").StatsError[]} */ (warnings).some(
				(/** @type {import("../").StatsError} */ w) =>
					(w.message || String(w)).includes(
						"doesn't lead to unique filenames per runtime"
					)
			)
		).toBe(true);
	}, 120000);
});
