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
