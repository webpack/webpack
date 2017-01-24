/*globals describe it */
var should = require("should");
var path = require("path");
var fs = require("fs");
var mkdirp = require("mkdirp");

var webpack = require("../lib/webpack");

var base = path.join(__dirname, "statsCases");
var outputBase = path.join(__dirname, "js", "stats");
var tests = fs.readdirSync(base).filter(function(testName) {
	return fs.existsSync(path.join(base, testName, "index.js")) ||
		fs.existsSync(path.join(base, testName, "webpack.config.js"))
});
var Stats = require("../lib/Stats");

describe("Stats", function() {
	tests.forEach(function(testName) {
		it("should print correct stats for " + testName, function(done) {
			var options = {
				entry: "./index",
				output: {
					filename: "bundle.js"
				}
			};
			if(fs.existsSync(path.join(base, testName, "webpack.config.js"))) {
				options = require(path.join(base, testName, "webpack.config.js"));
			}
			(Array.isArray(options) ? options : [options]).forEach(function(options) {
				if(!options.context) options.context = path.join(base, testName);
				if(!options.output) options.output = options.output || {};
				if(!options.output.path) options.output.path = path.join(outputBase, testName);
			});
			var c = webpack(options);
			var compilers = c.compilers ? c.compilers : [c];
			compilers.forEach(function(c) {
				var ifs = c.inputFileSystem;
				c.inputFileSystem = Object.create(ifs);
				c.inputFileSystem.readFile = function() {
					var args = Array.prototype.slice.call(arguments);
					var callback = args.pop();
					ifs.readFile.apply(ifs, args.concat([function(err, result) {
						if(err) return callback(err);
						callback(null, result.toString("utf-8").replace(/\r/g, ""));
					}]));
				};
				c.apply(new webpack.optimize.OccurrenceOrderPlugin());
			});
			c.run(function(err, stats) {
				if(err) return done(err);

				if(/error$/.test(testName)) {
					stats.hasErrors().should.be.equal(true);
				} else if(stats.hasErrors()) {
					done(new Error(stats.toJson().errors.join("\n\n")));
				}

				var toStringOptions = {
					colors: false
				};
				var hasColorSetting = false;
				if(typeof options.stats !== "undefined") {
					toStringOptions = options.stats;

					hasColorSetting = typeof options.stats.colors !== "undefined";
				}
				if(Array.isArray(options) && !toStringOptions.children) {
					toStringOptions.children = options.map(o => o.stats);
				}

				var actual = stats.toString(toStringOptions);
				(typeof actual).should.be.eql("string");
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
				var expected = fs.readFileSync(path.join(base, testName, "expected.txt"), "utf-8").replace(/\r/g, "");
				if(actual !== expected) {
					fs.writeFileSync(path.join(base, testName, "actual.txt"), actual, "utf-8");
				} else if(fs.existsSync(path.join(base, testName, "actual.txt"))) {
					fs.unlinkSync(path.join(base, testName, "actual.txt"));
				}
				actual.should.be.eql(expected);
				done();
			});
		});
	});
	describe("Error Handling", function() {
		describe("does have", function() {
			it("hasErrors", function() {
				var mockStats = new Stats({
					errors: ['firstError'],
					hash: '1234'
				});
				mockStats.hasErrors().should.be.ok();
			});
			it("hasWarnings", function() {
				var mockStats = new Stats({
					warnings: ['firstError'],
					hash: '1234'
				});
				mockStats.hasWarnings().should.be.ok();
			});
		});
		describe("does not have", function() {
			it("hasErrors", function() {
				var mockStats = new Stats({
					errors: [],
					hash: '1234'
				});
				mockStats.hasErrors().should.not.be.ok();
			});
			it("hasWarnings", function() {
				var mockStats = new Stats({
					warnings: [],
					hash: '1234'
				});
				mockStats.hasWarnings().should.not.be.ok();
			});
		});
		it("formatError handles string errors", function() {
			var mockStats = new Stats({
				errors: ['firstError'],
				warnings: [],
				assets: [],
				entrypoints: {},
				chunks: [],
				modules: [],
				children: [],
				hash: '1234',
				mainTemplate: {
					getPublicPath: function() {
						return 'path';
					}
				}
			});
			var obj = mockStats.toJson();
			obj.errors[0].should.be.equal('firstError');
		});
	});
	describe("Presets", function() {
		describe("presetToOptions", function() {
			it("returns correct object with 'Normal'", function() {
				Stats.presetToOptions("Normal").should.eql({
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
			it("truthy values behave as 'normal'", function() {
				var normalOpts = Stats.presetToOptions('normal');
				Stats.presetToOptions("pizza").should.eql(normalOpts);
				Stats.presetToOptions(true).should.eql(normalOpts);
				Stats.presetToOptions(1).should.eql(normalOpts);

				Stats.presetToOptions("verbose").should.not.eql(normalOpts);
				Stats.presetToOptions(false).should.not.eql(normalOpts);
			});
			it("returns correct object with 'none'", function() {
				Stats.presetToOptions("none").should.eql({
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
			it("falsy values behave as 'none'", function() {
				var noneOpts = Stats.presetToOptions('none');
				Stats.presetToOptions("").should.eql(noneOpts);
				Stats.presetToOptions(null).should.eql(noneOpts);
				Stats.presetToOptions().should.eql(noneOpts);
				Stats.presetToOptions(0).should.eql(noneOpts);
				Stats.presetToOptions(false).should.eql(noneOpts);
			});
		});
	});
});
