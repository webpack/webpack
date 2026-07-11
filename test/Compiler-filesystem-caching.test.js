"use strict";

require("./helpers/warmup-webpack");

const path = require("node:path");
const fs = require("graceful-fs");
const rimraf = /** @type {{ sync: (path: string) => void }} */ (
	require("rimraf")
);
const expectNoDeprecations = require("./helpers/expectNoDeprecations");

let fixtureCount = 0;

describe("Compiler (filesystem caching)", () => {
	expectNoDeprecations();

	const tempFixturePath = path.join(
		__dirname,
		"fixtures",
		"temp-filesystem-cache-fixture"
	);

	function compile(
		/** @type {string} */ entry,
		/** @type {(stats: import("../types").StatsCompilation) => void} */ onSuccess,
		/** @type {(err: Error) => void} */ onError
	) {
		const webpack = require("..");

		const options = webpack.config.getNormalizedWebpackOptions({});
		options.cache = {
			type: "filesystem",
			cacheDirectory: path.join(tempFixturePath, "cache")
		};
		options.entry = /** @type {import("../types").EntryNormalized} */ (
			/** @type {unknown} */ (entry)
		);
		options.context = path.join(__dirname, "fixtures");
		options.output.path = path.join(tempFixturePath, "dist");
		options.output.filename = "bundle.js";
		options.output.pathinfo = true;
		options.module =
			/** @type {import("../types").WebpackOptionsNormalized["module"]} */ (
				/** @type {unknown} */ ({
					rules: [
						{
							test: /\.svg$/,
							type: "asset/resource",
							use: {
								loader: require.resolve("./fixtures/empty-svg-loader")
							}
						}
					]
				})
			);

		const isBigIntSupported = typeof BigInt !== "undefined";
		const isErrorCaseSupported =
			typeof new Error("test", { cause: new Error("cause") }).cause !==
			"undefined";
		const isAggregateErrorSupported = typeof AggregateError !== "undefined";

		options.plugins = [
			{
				apply(compiler) {
					const name = "TestCachePlugin";

					compiler.hooks.thisCompilation.tap(name, (compilation) => {
						compilation.hooks.processAssets.tapPromise(
							{
								name,
								stage:
									compiler.webpack.Compilation
										.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE
							},
							async () => {
								const cache = compilation.getCache(name);
								const ident = "test.ext";
								const cacheItem_ = cache.getItemCache(ident, null);
								const cacheItem =
									/** @type {{ getPromise(id: string): Promise<unknown>, storePromise(v: unknown): Promise<void> }} */ (
										/** @type {unknown} */ (cacheItem_)
									);

								const result_ = await cacheItem.getPromise(ident);
								const result =
									/** @type {Record<string, Record<string, Record<string, unknown>> & Iterable<unknown>>} */ (
										result_
									);

								if (result) {
									expect(result.number).toBe(42);
									expect(result.number1).toBe(3.14);
									expect(result.number2).toBe(6.2);
									expect(result.string).toBe("string");

									if (isErrorCaseSupported) {
										expect(result.error.cause.message).toBe("cause");
										expect(result.error1.cause.string).toBe("string");
										expect(result.error1.cause.number).toBe(42);
									}

									if (isAggregateErrorSupported) {
										expect(result.aggregateError.errors).toEqual([
											new Error("first", { cause: "nested cause" }),
											"second"
										]);
										expect(result.aggregateError.message).toBe(
											"aggregate error"
										);
										expect(result.aggregateError.cause.message).toBe("cause");
									}

									if (isBigIntSupported) {
										expect(result.bigint).toBe(5n);
										expect(result.bigint1).toBe(124n);
										expect(result.bigint2).toBe(125n);
										expect(result.bigint3).toBe(12345678901234567890n);
										expect(result.bigint4).toBe(5n);
										expect(result.bigint5).toBe(1000000n);
										expect(result.bigint6).toBe(128n);
										expect(result.bigint7).toBe(2147483647n);
										expect(result.obj.foo).toBe(-10n);
										expect([...result.set]).toEqual([1n, 2n]);
										expect(result.arr).toEqual([256n, 257n, 258n]);
									}

									return;
								}

								const storeValue = {};

								storeValue.number = 42;
								storeValue.number1 = 3.14;
								storeValue.number2 = 6.2;
								storeValue.string = "string";

								if (isErrorCaseSupported) {
									storeValue.error = new Error("error", {
										cause: new Error("cause")
									});
									storeValue.error1 = new Error("error", {
										cause: { string: "string", number: 42 }
									});
								}

								if (isAggregateErrorSupported) {
									storeValue.aggregateError = new AggregateError(
										[new Error("first", { cause: "nested cause" }), "second"],
										"aggregate error",
										{ cause: new Error("cause") }
									);
								}

								if (isBigIntSupported) {
									storeValue.bigint = 5n;
									storeValue.bigint1 = 124n;
									storeValue.bigint2 = 125n;
									storeValue.bigint3 = 12345678901234567890n;
									storeValue.bigint4 = 5n;
									storeValue.bigint5 = 1000000n;
									storeValue.bigint6 = 128n;
									storeValue.bigint7 = 2147483647n;
									storeValue.obj = { foo: -10n };
									storeValue.set = new Set([1n, 2n]);
									storeValue.arr = [256n, 257n, 258n];
								}

								await cacheItem.storePromise(storeValue);
							}
						);
					});
				}
			}
		];

		function runCompiler(
			/** @type {(stats: import("../types").StatsCompilation) => void} */ onSuccess,
			/** @type {(err: Error) => void} */ onError
		) {
			const c = webpack(
				/** @type {import("../types").Configuration} */ (
					/** @type {unknown} */ (options)
				)
			);
			c.hooks.compilation.tap(
				"CompilerCachingTest",
				(compilation) => (compilation.bail = true)
			);
			c.run((err, stats_) => {
				if (err) throw err;
				expect(typeof stats_).toBe("object");
				const stats = /** @type {import("../types").Stats} */ (stats_).toJson({
					modules: true,
					reasons: true
				});
				expect(typeof stats).toBe("object");
				expect(stats).toHaveProperty("errors");
				expect(Array.isArray(stats.errors)).toBe(true);
				if (/** @type {unknown[]} */ (stats.errors).length > 0) {
					onError(new Error(JSON.stringify(stats.errors, null, 4)));
				}
				c.close(() => {
					onSuccess(stats);
				});
			});
		}

		runCompiler(onSuccess, onError);

		return {
			runAgain: runCompiler
		};
	}

	/**
	 * @returns {void}
	 */
	function cleanup() {
		rimraf.sync(`${tempFixturePath}*`);
	}

	beforeAll(cleanup);

	afterAll(cleanup);

	/**
	 * @returns {{ rootPath: string, usesAssetFilepath: string, svgFilepath: string }} temp fixture paths
	 */
	function createTempFixture() {
		const fixturePath = `${tempFixturePath}-${fixtureCount}`;
		const usesAssetFilepath = path.join(fixturePath, "uses-asset.js");
		const svgFilepath = path.join(fixturePath, "file.svg");

		// Remove previous copy if present
		rimraf.sync(fixturePath);

		// Copy over file since we"ll be modifying some of them
		fs.mkdirSync(fixturePath);
		fs.copyFileSync(
			path.join(__dirname, "fixtures", "uses-asset.js"),
			usesAssetFilepath
		);
		fs.copyFileSync(path.join(__dirname, "fixtures", "file.svg"), svgFilepath);

		fixtureCount++;
		return {
			rootPath: fixturePath,
			usesAssetFilepath,
			svgFilepath
		};
	}

	it("should compile again when cached asset has changed but loader output remains the same", (done) => {
		const tempFixture = createTempFixture();

		const onError = (/** @type {Error} */ error) => done(error);

		const helper = compile(
			tempFixture.usesAssetFilepath,
			(stats) => {
				const assets = /** @type {import("../types").StatsAsset[]} */ (
					stats.assets
				);
				// Not cached the first time
				expect(assets[0].name).toBe("bundle.js");
				expect(assets[0].emitted).toBe(true);

				expect(assets[1].name).toMatch(/\w+\.svg$/);
				expect(assets[0].emitted).toBe(true);

				helper.runAgain((stats) => {
					const assets = /** @type {import("../types").StatsAsset[]} */ (
						stats.assets
					);
					// Cached the second run
					expect(assets[0].name).toBe("bundle.js");
					expect(assets[0].emitted).toBe(false);

					expect(assets[1].name).toMatch(/\w+\.svg$/);
					expect(assets[0].emitted).toBe(false);

					const svgContent = fs
						.readFileSync(tempFixture.svgFilepath)
						.toString()
						.replace("icon-square-small", "icon-square-smaller");

					fs.writeFileSync(tempFixture.svgFilepath, svgContent);

					helper.runAgain((stats) => {
						const assets = /** @type {import("../types").StatsAsset[]} */ (
							stats.assets
						);
						// Still cached after file modification because loader always returns empty
						expect(assets[0].name).toBe("bundle.js");
						expect(assets[0].emitted).toBe(false);

						expect(assets[1].name).toMatch(/\w+\.svg$/);
						expect(assets[0].emitted).toBe(false);

						done();
					}, onError);
				}, onError);
			},
			onError
		);
	});
});
