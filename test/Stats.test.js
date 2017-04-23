"use strict";

const path = require("path");
const fs = require("fs");

const webpack = require("../lib/webpack");

const base = path.join(__dirname, "statsCases");
const outputBase = path.join(__dirname, "js", "stats");
const tests = fs.readdirSync(base).filter(testName =>
	fs.existsSync(path.join(base, testName, "index.js")) ||
	fs.existsSync(path.join(base, testName, "webpack.config.js"))
);
const Stats = require("../lib/Stats");

describe("Stats", () => {
	tests.forEach(testName => {
		it("should print correct stats for " + testName, (done) => {
			let options = {
				entry: "./index",
				output: {
					filename: "bundle.js"
				}
			};
			if(fs.existsSync(path.join(base, testName, "webpack.config.js"))) {
				options = require(path.join(base, testName, "webpack.config.js"));
			}
			(Array.isArray(options) ? options : [options]).forEach((options) => {
				if(!options.context) options.context = path.join(base, testName);
				if(!options.output) options.output = options.output || {};
				if(!options.output.path) options.output.path = path.join(outputBase, testName);
			});
			const c = webpack(options);
			const compilers = c.compilers ? c.compilers : [c];
			compilers.forEach((c) => {
				const ifs = c.inputFileSystem;
				c.inputFileSystem = Object.create(ifs);
				c.inputFileSystem.readFile = function() {
					const args = Array.prototype.slice.call(arguments);
					const callback = args.pop();
					ifs.readFile.apply(ifs, args.concat([(err, result) => {
						if(err) return callback(err);
						callback(null, result.toString("utf-8").replace(/\r/g, ""));
					}]));
				};
				c.apply(new webpack.optimize.OccurrenceOrderPlugin());
			});
			c.run((err, stats) => {
				if(err) return done(err);

				if(/error$/.test(testName)) {
					expect(stats.hasErrors()).toEqual(true);
				} else if(stats.hasErrors()) {
					done(new Error(stats.toJson().errors.join("\n\n")));
				}

				let toStringOptions = {
					colors: false
				};
				let hasColorSetting = false;
				if(typeof options.stats !== "undefined") {
					toStringOptions = options.stats;

					hasColorSetting = typeof options.stats.colors !== "undefined";
				}
				if(Array.isArray(options) && !toStringOptions.children) {
					toStringOptions.children = options.map(o => o.stats);
				}

				let actual = stats.toString(toStringOptions);
				expect((typeof actual)).toEqual("string");
				if(!hasColorSetting) {
					actual = actual
						.replace(/\u001b\[[0-9;]*m/g, "")
						.replace(/[0-9]+(\s?ms)/g, "X$1");
				} else {
					actual = actual
						.replace(/\u001b\[1m\u001b\[([0-9;]*)m/g, "<CLR=$1,BOLD>")
						.replace(/\u001b\[1m/g, "<CLR=BOLD>")
						.replace(/\u001b\[39m\u001b\[22m/g, "</CLR>")
						.replace(/\u001b\[([0-9;]*)m/g, "<CLR=$1>")
						.replace(/[0-9]+(<\/CLR>)?(\s?ms)/g, "X$1$2");
				}

				actual = actual
					.replace(/\r\n?/g, "\n")
					.replace(/[\t ]*Version:.+\n/g, "")
					.replace(path.join(base, testName), "Xdir/" + testName)
					.replace(/ dependencies:Xms/g, "");
				const expected = fs.readFileSync(path.join(base, testName, "expected.txt"), "utf-8").replace(/\r/g, "");
				if(actual !== expected) {
					fs.writeFileSync(path.join(base, testName, "actual.txt"), actual, "utf-8");
				} else if(fs.existsSync(path.join(base, testName, "actual.txt"))) {
					fs.unlinkSync(path.join(base, testName, "actual.txt"));
				}
				expect(actual).toEqual(expected);
				done();
			});
		});
	});

	describe("Error Handling", () => {
		describe("does have", () => {
			it("hasErrors", () => {
				const mockStats = new Stats({
					errors: ["firstError"],
					hash: "1234"
				});
				expect(mockStats.hasErrors()).toBeTruthy();
			});

			it("hasWarnings", () => {
				const mockStats = new Stats({
					warnings: ["firstError"],
					hash: "1234"
				});
				expect(mockStats.hasWarnings()).toBeTruthy();
			});
		});

		describe("does not have", () => {
			it("hasErrors", () => {
				const mockStats = new Stats({
					errors: [],
					hash: "1234"
				});
				expect(mockStats.hasErrors()).not.toBeTruthy();
			});

			it("hasWarnings", () => {
				const mockStats = new Stats({
					warnings: [],
					hash: "1234"
				});
				expect(mockStats.hasWarnings()).not.toBeTruthy();
			});
		});

		it("formatError handles string errors", () => {
			const mockStats = new Stats({
				errors: ["firstError"],
				warnings: [],
				assets: [],
				entrypoints: {},
				chunks: [],
				modules: [],
				children: [],
				hash: "1234",
				mainTemplate: {
					getPublicPath: () => "path"
				}
			});
			const obj = mockStats.toJson();
			expect(obj.errors[0]).toEqual("firstError");
		});
	});
	describe("Presets", () => {
		describe("presetToOptions", () => {
			it("returns correct object with 'Normal'", () => {
				expect(Stats.presetToOptions("Normal")).toEqual({
					assets: false,
					version: false,
					timings: true,
					hash: true,
					entrypoints: false,
					chunks: true,
					chunkModules: false,
					errorDetails: true,
					reasons: false,
					depth: false,
					usedExports: false,
					providedExports: false,
					colors: true,
					performance: true
				});
			});

			it("truthy values behave as 'normal'", () => {
				const normalOpts = Stats.presetToOptions("normal");
				expect(Stats.presetToOptions("pizza")).toEqual(normalOpts);
				expect(Stats.presetToOptions(true)).toEqual(normalOpts);
				expect(Stats.presetToOptions(1)).toEqual(normalOpts);

				expect(Stats.presetToOptions("verbose")).not.toEqual(normalOpts);
				expect(Stats.presetToOptions(false)).not.toEqual(normalOpts);
			});

			it("returns correct object with 'none'", () => {
				expect(Stats.presetToOptions("none")).toEqual({
					hash: false,
					version: false,
					timings: false,
					assets: false,
					entrypoints: false,
					chunks: false,
					chunkModules: false,
					modules: false,
					reasons: false,
					depth: false,
					usedExports: false,
					providedExports: false,
					children: false,
					source: false,
					errors: false,
					errorDetails: false,
					warnings: false,
					publicPath: false,
					performance: false
				});
			});

			it("falsy values behave as 'none'", () => {
				const noneOpts = Stats.presetToOptions("none");
				expect(Stats.presetToOptions("")).toEqual(noneOpts);
				expect(Stats.presetToOptions(null)).toEqual(noneOpts);
				expect(Stats.presetToOptions()).toEqual(noneOpts);
				expect(Stats.presetToOptions(0)).toEqual(noneOpts);
				expect(Stats.presetToOptions(false)).toEqual(noneOpts);
			});
		});
	});
});
