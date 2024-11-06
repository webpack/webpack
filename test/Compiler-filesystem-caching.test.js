"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");

let fixtureCount = 0;

describe("Compiler (filesystem caching)", () => {
	jest.setTimeout(5000);

	const tempFixturePath = path.join(
		__dirname,
		"fixtures",
		"temp-filesystem-cache-fixture"
	);

	function compile(entry, onSuccess, onError) {
		const webpack = require("..");
		const options = webpack.config.getNormalizedWebpackOptions({});
		options.cache = {
			type: "filesystem",
			cacheDirectory: path.join(tempFixturePath, "cache")
		};
		options.entry = entry;
		options.context = path.join(__dirname, "fixtures");
		options.output.path = path.join(tempFixturePath, "dist");
		options.output.filename = "bundle.js";
		options.output.pathinfo = true;
		options.module = {
			rules: [
				{
					test: /\.svg$/,
					type: "asset/resource",
					use: {
						loader: require.resolve("./fixtures/empty-svg-loader")
					}
				}
			]
		};

		const isBigIntSupported = typeof BigInt !== "undefined";
		const isErrorCaseSupported =
			// eslint-disable-next-line n/no-unsupported-features/es-syntax
			typeof new Error("test", { cause: new Error("cause") }).cause !==
			"undefined";

		options.plugins = [
			{
				apply(compiler) {
					const name = "TestCachePlugin";

					compiler.hooks.thisCompilation.tap(name, compilation => {
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
								const cacheItem = cache.getItemCache(ident, null);

								const result = await cacheItem.getPromise(ident);

								if (result) {
									expect(result.number).toEqual(42);
									expect(result.number1).toEqual(3.14);
									expect(result.number2).toEqual(6.2);
									expect(result.string).toEqual("string");

									if (isErrorCaseSupported) {
										expect(result.error.cause.message).toEqual("cause");
										expect(result.error1.cause.string).toBe("string");
										expect(result.error1.cause.number).toBe(42);
									}

									if (isBigIntSupported) {
										expect(result.bigint).toEqual(5n);
										expect(result.bigint1).toEqual(124n);
										expect(result.bigint2).toEqual(125n);
										expect(result.bigint3).toEqual(12345678901234567890n);
										expect(result.bigint4).toEqual(5n);
										expect(result.bigint5).toEqual(1000000n);
										expect(result.bigint6).toEqual(128n);
										expect(result.bigint7).toEqual(2147483647n);
										expect(result.obj.foo).toBe(BigInt(-10));
										expect(Array.from(result.set)).toEqual([
											BigInt(1),
											BigInt(2)
										]);
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
									// eslint-disable-next-line n/no-unsupported-features/es-syntax
									storeValue.error = new Error("error", {
										cause: new Error("cause")
									});
									// eslint-disable-next-line n/no-unsupported-features/es-syntax
									storeValue.error1 = new Error("error", {
										cause: { string: "string", number: 42 }
									});
								}

								if (isBigIntSupported) {
									storeValue.bigint = BigInt(5);
									storeValue.bigint1 = BigInt(124);
									storeValue.bigint2 = BigInt(125);
									storeValue.bigint3 = 12345678901234567890n;
									storeValue.bigint4 = 5n;
									storeValue.bigint5 = 1000000n;
									storeValue.bigint6 = 128n;
									storeValue.bigint7 = 2147483647n;
									storeValue.obj = { foo: BigInt(-10) };
									storeValue.set = new Set([BigInt(1), BigInt(2)]);
									storeValue.arr = [256n, 257n, 258n];
								}

								await cacheItem.storePromise(storeValue);
							}
						);
					});
				}
			}
		];

		function runCompiler(onSuccess, onError) {
			const c = webpack(options);
			c.hooks.compilation.tap(
				"CompilerCachingTest",
				compilation => (compilation.bail = true)
			);
			c.run((err, stats) => {
				if (err) throw err;
				expect(typeof stats).toBe("object");
				stats = stats.toJson({
					modules: true,
					reasons: true
				});
				expect(typeof stats).toBe("object");
				expect(stats).toHaveProperty("errors");
				expect(Array.isArray(stats.errors)).toBe(true);
				if (stats.errors.length > 0) {
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

	function cleanup() {
		rimraf.sync(`${tempFixturePath}*`);
	}

	beforeAll(cleanup);
	afterAll(cleanup);

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
			usesAssetFilepath: usesAssetFilepath,
			svgFilepath: svgFilepath
		};
	}

	it("should compile again when cached asset has changed but loader output remains the same", done => {
		const tempFixture = createTempFixture();

		const onError = error => done(error);

		const helper = compile(
			tempFixture.usesAssetFilepath,
			stats => {
				// Not cached the first time
				expect(stats.assets[0].name).toBe("bundle.js");
				expect(stats.assets[0].emitted).toBe(true);

				expect(stats.assets[1].name).toMatch(/\w+\.svg$/);
				expect(stats.assets[0].emitted).toBe(true);

				helper.runAgain(stats => {
					// Cached the second run
					expect(stats.assets[0].name).toBe("bundle.js");
					expect(stats.assets[0].emitted).toBe(false);

					expect(stats.assets[1].name).toMatch(/\w+\.svg$/);
					expect(stats.assets[0].emitted).toBe(false);

					const svgContent = fs
						.readFileSync(tempFixture.svgFilepath)
						.toString()
						.replace("icon-square-small", "icon-square-smaller");

					fs.writeFileSync(tempFixture.svgFilepath, svgContent);

					helper.runAgain(stats => {
						// Still cached after file modification because loader always returns empty
						expect(stats.assets[0].name).toBe("bundle.js");
						expect(stats.assets[0].emitted).toBe(false);

						expect(stats.assets[1].name).toMatch(/\w+\.svg$/);
						expect(stats.assets[0].emitted).toBe(false);

						done();
					}, onError);
				}, onError);
			},
			onError
		);
	});
});
