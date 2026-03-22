"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const vm = require("vm");
const fs = require("graceful-fs");
const rimraf = require("rimraf");
const webpack = require("..");
const { TestRunner } = require("./runner");
const { urlToPath } = require("./runner/RunnerHelpers");

const outputDirectory = path.join(
	__dirname,
	"js",
	"LazyCompilationUmdExternals"
);
const fixtureDirectory = path.join(
	__dirname,
	"fixtures",
	"lazy-compilation-umd-externals"
);

/**
 * @param {import("../types").Compiler} compiler compiler
 * @returns {Promise<import("../types").Stats>} stats
 */
const runCompiler = (compiler) =>
	new Promise((resolve, reject) => {
		compiler.run((err, stats) => {
			if (err) return reject(err);
			resolve(stats);
		});
	});

/**
 * @param {import("../types").Compiler} compiler compiler
 * @returns {Promise<void>}
 */
const closeCompiler = (compiler) =>
	new Promise((resolve, reject) => {
		compiler.close((err) => {
			if (err) return reject(err);
			resolve();
		});
	});

/**
 * @param {TestRunner} runner runner
 * @param {string} filename filename
 * @returns {void}
 */
const loadScript = (runner, filename) => {
	const source = fs.readFileSync(filename, "utf8");
	vm.runInNewContext(source, runner._globalContext, filename);
};

describe("LazyCompilation UMD externals", () => {
	/** @type {import("../types").Compiler | undefined} */
	let compiler;

	afterEach(async () => {
		if (compiler) {
			await closeCompiler(compiler);
			compiler = undefined;
		}
		rimraf.sync(outputDirectory);
	});

	it("should resolve lazy modules that depend on UMD externals on first load", async () => {
		rimraf.sync(outputDirectory);

		const fakeUpdateLoaderOptions = {
			updateIndex: 0
		};
		const options = {
			mode: "development",
			devtool: false,
			context: fixtureDirectory,
			entry: "./entry.js",
			target: "web",
			experiments: {
				lazyCompilation: {
					entries: false
				}
			},
			output: {
				path: outputDirectory,
				filename: "bundle.js",
				chunkFilename: "[name].chunk.[fullhash].js",
				publicPath: "https://test.cases/path/",
				libraryTarget: "umd",
				pathinfo: true
			},
			optimization: {
				moduleIds: "named"
			},
			module: {
				rules: [
					{
						loader: path.join(__dirname, "hotCases", "fake-update-loader.js"),
						enforce: "pre"
					}
				]
			},
			externals: {
				"my-external": "myExternal"
			},
			plugins: [
				new webpack.HotModuleReplacementPlugin(),
				new webpack.LoaderOptionsPlugin(fakeUpdateLoaderOptions)
			],
			recordsPath: path.join(outputDirectory, "records.json")
		};

		compiler = webpack(options);
		let stats = await runCompiler(compiler);
		expect(stats.hasErrors()).toBe(false);
		expect(stats.hasWarnings()).toBe(false);

		const runner = new TestRunner({
			target: "web",
			outputDirectory,
			testMeta: {
				category: "lazy-compilation",
				name: "umd-externals-first-load"
			},
			testConfig: {},
			webpackOptions: options
		});

		runner.mergeGlobalContext({
			self: runner._globalContext,
			window: runner._globalContext,
			globalThis: runner._globalContext,
			myExternal: "external value"
		});
		runner.mergeModuleScope({
			self: runner._globalContext,
			window: runner._globalContext,
			globalThis: runner._globalContext,
			myExternal: "external value"
		});

		runner._globalContext.document.onScript = (src) => {
			loadScript(runner, urlToPath(src, outputDirectory));
		};
		runner._globalContext.importScripts = (src) => {
			loadScript(runner, urlToPath(src, outputDirectory));
		};

		loadScript(runner, path.join(outputDirectory, "bundle.js"));

		const promise = runner._globalContext.loadLazyModule();
		await new Promise((resolve) => {
			setTimeout(resolve, 1000);
		});

		fakeUpdateLoaderOptions.updateIndex++;
		stats = await runCompiler(compiler);
		expect(stats.hasErrors()).toBe(false);
		expect(stats.hasWarnings()).toBe(false);

		const updatedModules = await runner._globalContext.applyUpdate();
		expect(updatedModules).toBeTruthy();

		const result = await promise;
		expect(result).toHaveProperty("default", "external value");
	});
});
