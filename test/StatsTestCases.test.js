/*globals describe it */
"use strict";

const path = require("path");
const fs = require("fs");

const Stats = require("../lib/Stats");
const captureStdio = require("./helpers/captureStdio");

let webpack;

/**
 * Escapes regular expression metacharacters
 * @param {string} str String to quote
 * @returns {string} Escaped string
 */
const quotemeta = str => {
	return str.replace(/[-[\]\\/{}()*+?.^$|]/g, "\\$&");
};

const base = path.join(__dirname, "statsCases");
const outputBase = path.join(__dirname, "js", "stats");
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

describe("StatsTestCases", () => {
	let stderr;
	beforeEach(() => {
		stderr = captureStdio(process.stderr, true);
		webpack = require("../lib/webpack");
	});
	afterEach(() => {
		stderr.restore();
	});
	tests.forEach(testName => {
		it("should print correct stats for " + testName, done => {
			jest.setTimeout(10000);
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
				if (!options.output.path)
					options.output.path = path.join(outputBase, testName);
				if (!options.plugins) options.plugins = [];
				if (!options.optimization) options.optimization = {};
				if (options.optimization.minimize === undefined)
					options.optimization.minimize = false;
				// To support deprecated loaders
				// TODO remove in webpack 5
				options.plugins.push(
					new webpack.LoaderOptionsPlugin({
						options: {}
					})
				);
			});
			const c = webpack(options);
			const compilers = c.compilers ? c.compilers : [c];
			compilers.forEach(c => {
				const ifs = c.inputFileSystem;
				c.inputFileSystem = Object.create(ifs);
				c.inputFileSystem.readFile = function() {
					const args = Array.prototype.slice.call(arguments);
					const callback = args.pop();
					ifs.readFile.apply(
						ifs,
						args.concat([
							(err, result) => {
								if (err) return callback(err);
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
					return done(new Error(stats.toJson().errors.join("\n\n")));
				}
				let toStringOptions = {
					context: path.join(base, testName),
					colors: false
				};
				let hasColorSetting = false;
				if (typeof options.stats !== "undefined") {
					toStringOptions = options.stats;
					if (toStringOptions === null || typeof toStringOptions !== "object")
						toStringOptions = Stats.presetToOptions(toStringOptions);
					hasColorSetting = typeof options.stats.colors !== "undefined";
					if (!toStringOptions.context)
						toStringOptions.context = path.join(base, testName);
				}
				if (Array.isArray(options) && !toStringOptions.children) {
					toStringOptions.children = options.map(o => o.stats);
				}
				let actual = stats.toString(toStringOptions);
				expect(typeof actual).toBe("string");
				if (!hasColorSetting) {
					actual = stderr.toString() + actual;
					actual = actual
						.replace(/\u001b\[[0-9;]*m/g, "")
						.replace(/[.0-9]+(\s?ms)/g, "X$1")
						.replace(
							/^(\s*Built at:) (.*)$/gm,
							"$1 Thu Jan 01 1970 00:00:00 GMT"
						);
				} else {
					actual = stderr.toStringRaw() + actual;
					actual = actual
						.replace(/\u001b\[1m\u001b\[([0-9;]*)m/g, "<CLR=$1,BOLD>")
						.replace(/\u001b\[1m/g, "<CLR=BOLD>")
						.replace(/\u001b\[39m\u001b\[22m/g, "</CLR>")
						.replace(/\u001b\[([0-9;]*)m/g, "<CLR=$1>")
						.replace(/[.0-9]+(<\/CLR>)?(\s?ms)/g, "X$1$2")
						.replace(
							/^(\s*Built at:) (.*)$/gm,
							"$1 Thu Jan 01 1970 <CLR=BOLD>00:00:00</CLR> GMT"
						);
				}
				actual = actual
					.replace(/\r\n?/g, "\n")
					.replace(/[\t ]*Version:.+\n/g, "")
					.replace(
						new RegExp(quotemeta(path.join(base, testName)), "g"),
						"Xdir/" + testName
					)
					.replace(/(\w)\\(\w)/g, "$1/$2")
					.replace(/ dependencies:Xms/g, "");
				expect(actual).toMatchSnapshot();
				done();
			});
		});
	});
});
