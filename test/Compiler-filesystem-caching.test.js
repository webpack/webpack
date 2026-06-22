"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const rimraf = /** @type {{ sync: (path: string) => void }} */ (
	require("rimraf")
);

let fixtureCount = 0;

describe("Compiler (filesystem caching)", () => {
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
										expect(result.bigint).toBe(BigInt(5));
										expect(result.bigint1).toBe(BigInt(124));
										expect(result.bigint2).toBe(BigInt(125));
										expect(result.bigint3).toBe(BigInt("12345678901234567890"));
										expect(result.bigint4).toBe(BigInt(5));
										expect(result.bigint5).toBe(BigInt(1000000));
										expect(result.bigint6).toBe(BigInt(128));
										expect(result.bigint7).toBe(BigInt(2147483647));
										expect(result.obj.foo).toBe(BigInt(-10));
										expect([...result.set]).toEqual([BigInt(1), BigInt(2)]);
										expect(result.arr).toEqual([
											BigInt(256),
											BigInt(257),
											BigInt(258)
										]);
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
									storeValue.bigint = BigInt(5);
									storeValue.bigint1 = BigInt(124);
									storeValue.bigint2 = BigInt(125);
									storeValue.bigint3 = BigInt("12345678901234567890");
									storeValue.bigint4 = BigInt(5);
									storeValue.bigint5 = BigInt(1000000);
									storeValue.bigint6 = BigInt(128);
									storeValue.bigint7 = BigInt(2147483647);
									storeValue.obj = { foo: BigInt(-10) };
									storeValue.set = new Set([BigInt(1), BigInt(2)]);
									storeValue.arr = [BigInt(256), BigInt(257), BigInt(258)];
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
