"use strict";

require("./helpers/warmup-webpack");
const path = require("path");
const fs = require("graceful-fs");
const rimraf = require("rimraf");
const captureStdio = require("./helpers/captureStdio");
const webpack = require("..");

const toMiB = bytes => `${Math.round(bytes / 1024 / 1024)}MiB`;
const base = path.join(__dirname, "memoryLimitCases");
const outputBase = path.join(__dirname, "js", "memoryLimit");
const tests = fs
	.readdirSync(base)
	.filter(
		testName =>
			fs.existsSync(path.join(base, testName, "index.js")) ||
			fs.existsSync(path.join(base, testName, "webpack.config.js"))
	)
	.filter(testName => {
		const testDirectory = path.join(base, testName);
		const filterPath = path.join(testDirectory, "test.filter.js");
		if (fs.existsSync(filterPath) && !require(filterPath)()) {
			describe.skip(testName, () => it("filtered"));
			return false;
		}
		return true;
	});

describe("MemoryLimitTestCases", () => {
	jest.setTimeout(40000);
	let stderr;
	beforeEach(() => {
		stderr = captureStdio(process.stderr, true);
		if (global.gc) {
			global.gc();
			global.gc();
		}
	});
	afterEach(() => {
		stderr.restore();
	});
	tests.forEach(testName => {
		let testConfig = {
			heapSizeLimitBytes: 250 * 1024 * 1024
		};
		try {
			// try to load a test file
			testConfig = Object.assign(
				testConfig,
				require(path.join(base, testName, "test.config.js"))
			);
		} catch (e) {
			// ignored
		}
		it(`should build ${JSON.stringify(testName)} with heap limit of ${toMiB(
			testConfig.heapSizeLimitBytes
		)}`, done => {
			const outputDirectory = path.join(outputBase, testName);
			rimraf.sync(outputDirectory);
			fs.mkdirSync(outputDirectory, { recursive: true });
			let options = {
				mode: "development",
				entry: "./index",
				output: {
					filename: "bundle.js"
				}
			};
			if (fs.existsSync(path.join(base, testName, "webpack.config.js"))) {
				options = require(path.join(base, testName, "webpack.config.js"));
			}

			(Array.isArray(options) ? options : [options]).forEach(options => {
				if (!options.context) options.context = path.join(base, testName);
				if (!options.output) options.output = options.output || {};
				if (!options.output.path) options.output.path = outputDirectory;
				if (!options.plugins) options.plugins = [];
				if (!options.optimization) options.optimization = {};
				if (options.optimization.minimize === undefined)
					options.optimization.minimize = false;
			});
			const heapSizeStart = process.memoryUsage().heapUsed;
			const c = webpack(options);
			const compilers = c.compilers ? c.compilers : [c];
			compilers.forEach(c => {
				const ifs = c.inputFileSystem;
				c.inputFileSystem = Object.create(ifs);
				c.inputFileSystem.readFile = function () {
					const args = Array.prototype.slice.call(arguments);
					const callback = args.pop();
					ifs.readFile.apply(
						ifs,
						args.concat([
							(err, result) => {
								if (err) return callback(err);
								if (!/\.(js|json|txt)$/.test(args[0]))
									return callback(null, result);
								callback(null, result.toString("utf-8").replace(/\r/g, ""));
							}
						])
					);
				};
			});
			c.run((err, stats) => {
				if (err) return done(err);
				if (/error$/.test(testName)) {
					expect(stats.hasErrors()).toBe(true);
				} else if (stats.hasErrors()) {
					return done(
						new Error(
							stats.toString({
								all: false,
								errors: true,
								errorStack: true,
								errorDetails: true
							})
						)
					);
				}
				const heapUsed = process.memoryUsage().heapUsed - heapSizeStart;
				if (heapUsed > testConfig.heapSizeLimitBytes) {
					return done(
						new Error(`Out of memory limit with ${toMiB(heapUsed)} heap used`)
					);
				}
				if (testConfig.validate) testConfig.validate(stats, stderr.toString());
				done();
			});
		});
	});
});
