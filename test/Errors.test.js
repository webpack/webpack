"use strict";

const path = require("path");

const webpack = require("../lib/webpack");

const base = path.join(__dirname, "fixtures", "errors");

describe("Errors", () => {
	function customOutputFilesystem(c) {
		const files = {};
		c.outputFileSystem = {
			join: path.join.bind(path),
			mkdirp: function(path, callback) {
				callback();
			},
			writeFile: function(name, content, callback) {
				files[name] = content.toString("utf-8");
				callback();
			}
		};
		return files;
	}

	function getErrors(options, callback) {
		options.context = base;
		const c = webpack(options);
		customOutputFilesystem(c);
		c.run((err, stats) => {
			if(err) throw err;
			expect(typeof stats).toBe("object");
			stats = stats.toJson({
				errorDetails: false
			});
			expect(typeof stats).toBe("object");
			expect(stats).toHaveProperty("errors");
			expect(stats).toHaveProperty("warnings");
			expect(Array.isArray(stats.errors)).toBeTruthy(); // eslint-disable-line no-unused-expressions
			expect(Array.isArray(stats.warnings)).toBeTruthy(); // eslint-disable-line no-unused-expressions
			callback(stats.errors, stats.warnings);
		});
	}
	it("should throw an error if file doesn't exist", (done) => {
		getErrors({
			entry: "./missingFile"
		}, (errors, warnings) => {
			expect(errors.length).toEqual(2);
			expect(warnings.length).toEqual(0);
			errors.sort();
			let lines = errors[0].split("\n");
			expect(lines[0]).toMatch(/missingFile.js/);
			expect(lines[1]).toMatch(/^Module not found/);
			expect(lines[1]).toMatch(/\.\/dir\/missing2/);
			expect(lines[2]).toMatch(/missingFile.js 12:9/);
			lines = errors[1].split("\n");
			expect(lines[0]).toMatch(/missingFile.js/);
			expect(lines[1]).toMatch(/^Module not found/);
			expect(lines[1]).toMatch(/\.\/missing/);
			expect(lines[2]).toMatch(/missingFile.js 4:0/);
			done();
		});
	});
	it("should report require.extensions as unsupported", (done) => {
		getErrors({
			entry: "./require.extensions"
		}, (errors, warnings) => {
			expect(errors.length).toEqual(0);
			expect(warnings.length).toEqual(1);
			const lines = warnings[0].split("\n");
			expect(lines[0]).toMatch(/require.extensions\.js/);
			expect(lines[1]).toMatch(/require.extensions is not supported by webpack/);
			done();
		});
	});
	it("should warn about case-sensitive module names", (done) => {
		getErrors({
			entry: "./case-sensitive"
		}, (errors, warnings) => {
			if(errors.length === 0) {
				expect(warnings.length).toEqual(1);
				const lines = warnings[0].split("\n");
				expect(lines[4]).toMatch(/FILE\.js/);
				expect(lines[5]).toMatch(/Used by/);
				expect(lines[6]).toMatch(/case-sensitive/);
				expect(lines[7]).toMatch(/file\.js/);
				expect(lines[8]).toMatch(/Used by/);
				expect(lines[9]).toMatch(/case-sensitive/);
			} else {
				expect(errors.length).toEqual(1);
				expect(warnings.length).toEqual(0);
			}
			done();
		});
	});
	it("should warn about NoErrorsPlugin being deprecated in favor of NoEmitOnErrorsPlugin", (done) => {
		getErrors({
			entry: "./no-errors-deprecate",
			plugins: [
				new webpack.NoErrorsPlugin()
			]
		}, (errors, warnings) => {
			expect(warnings.length).toEqual(1);
			const lines = warnings[0].split("\n");
			expect(lines[0]).toMatch(/webpack/);
			expect(lines[0]).toMatch(/NoErrorsPlugin/);
			expect(lines[0]).toMatch(/deprecated/);
			expect(lines[1]).toMatch(/NoEmitOnErrorsPlugin/);
			expect(lines[1]).toMatch(/instead/);
			done();
		});
	});
	it("should not warn if the NoEmitOnErrorsPlugin is used over the NoErrorsPlugin", (done) => {
		getErrors({
			entry: "./no-errors-deprecate",
			plugins: [
				new webpack.NoEmitOnErrorsPlugin()
			]
		}, (errors, warnings) => {
			expect(errors.length).toEqual(0);
			expect(warnings.length).toEqual(0);
			done();
		});
	});
	it("should not not emit if NoEmitOnErrorsPlugin is used and there is an error", (done) => {
		getErrors({
			entry: "./missingFile",
			plugins: [
				new webpack.NoEmitOnErrorsPlugin()
			]
		}, (errors, warnings) => {
			expect(errors.length).toEqual(2);
			expect(warnings.length).toEqual(0);
			errors.sort();
			let lines = errors[0].split("\n");
			expect(lines[0]).toMatch(/missingFile.js/);
			expect(lines[1]).toMatch(/^Module not found/);
			expect(lines[1]).toMatch(/\.\/dir\/missing2/);
			expect(lines[2]).toMatch(/missingFile.js 12:9/);
			lines = errors[1].split("\n");
			expect(lines[0]).toMatch(/missingFile.js/);
			expect(lines[1]).toMatch(/^Module not found/);
			expect(lines[1]).toMatch(/\.\/missing/);
			expect(lines[2]).toMatch(/missingFile.js 4:0/);
			done();
		});
	});
	it("should throw an error when using incorrect CommonsChunkPlugin configuration", (done) => {
		getErrors({
			entry: {
				a: "./entry-point",
				b: "./entry-point",
				c: "./entry-point"
			},
			output: {
				filename: "[name].js"
			},
			plugins: [
				new webpack.optimize.CommonsChunkPlugin({
					name: "a",
					filename: "a.js",
					minChunks: Infinity
				}),
				new webpack.optimize.CommonsChunkPlugin({
					name: "b",
					filename: "b.js",
					minChunks: Infinity
				})
			]
		}, (errors, warnings) => {
			expect(errors.length).toEqual(1);
			expect(warnings.length).toEqual(0);
			const lines = errors[0].split("\n");
			expect(lines[0]).toMatch(/CommonsChunkPlugin/);
			expect(lines[0]).toMatch(/non-entry/);
			done();
		});
	});
	it("should throw an error when trying to use [chunkhash] when it's invalid", (done) => {
		getErrors({
			entry: {
				a: "./entry-point",
				b: "./entry-point",
				c: "./entry-point"
			},
			output: {
				filename: "[chunkhash].js"
			},
			plugins: [
				new webpack.HotModuleReplacementPlugin()
			]
		}, (errors, warnings) => {
			expect(errors.length).toEqual(3);
			expect(warnings.length).toEqual(0);
			errors.forEach((error) => {
				const lines = error.split("\n");
				expect(lines[0]).toMatch(/chunk (a|b|c)/);
				expect(lines[2]).toMatch(/\[chunkhash\].js/);
				expect(lines[2]).toMatch(/use \[hash\] instead/);
			});
			done();
		});
	});
});
