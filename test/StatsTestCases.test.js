/*globals describe it */
"use strict";

require("should");
const path = require("path");
const fs = require("fs");

const webpack = require("../lib/webpack");

const base = path.join(__dirname, "statsCases");
const outputBase = path.join(__dirname, "js", "stats");
const tests = fs.readdirSync(base).filter(testName =>
	fs.existsSync(path.join(base, testName, "index.js")) ||
	fs.existsSync(path.join(base, testName, "webpack.config.js"))
);

describe("StatsTestCases", () => {
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
					stats.hasErrors().should.be.equal(true);
				} else if(stats.hasErrors()) {
					return done(new Error(stats.toJson().errors.join("\n\n")));
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
				const expected = fs.readFileSync(path.join(base, testName, "expected.txt"), "utf-8").replace(/\r/g, "");
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
});
