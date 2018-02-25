"use strict";

/*globals describe it */
const path = require("path");

const webpack = require("../lib/webpack");

const base = path.join(__dirname, "fixtures", "errors");

describe("Errors", () => {
	function customOutputFilesystem(c) {
		const files = {};
		c.outputFileSystem = {
			join: path.join.bind(path),
			mkdirp(path, callback) {
				callback();
			},
			writeFile(name, content, callback) {
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
			if (err) throw err;
			expect(typeof stats).toBe("object");
			stats = stats.toJson({
				errorDetails: false
			});
			expect(typeof stats).toBe("object");
			expect(stats).toHaveProperty("errors");
			expect(stats).toHaveProperty("warnings");
			expect(Array.isArray(stats.errors)).toBe(true);
			expect(Array.isArray(stats.warnings)).toBe(true);
			callback(stats.errors, stats.warnings);
		});
	}
	it("should throw an error if file doesn't exist", done => {
		getErrors(
			{
				mode: "development",
				entry: "./missingFile"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(2);
				expect(warnings).toHaveLength(0);
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
			}
		);
	});
	it("should report require.extensions as unsupported", done => {
		getErrors(
			{
				mode: "development",
				entry: "./require.extensions"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(0);
				expect(warnings).toHaveLength(1);
				const lines = warnings[0].split("\n");
				expect(lines[0]).toMatch(/require.extensions\.js/);
				expect(lines[1]).toMatch(
					/require.extensions is not supported by webpack/
				);
				done();
			}
		);
	});
	it("should warn about case-sensitive module names", done => {
		getErrors(
			{
				mode: "development",
				entry: "./case-sensitive"
			},
			(errors, warnings) => {
				if (errors.length === 0) {
					expect(warnings).toHaveLength(1);
					const lines = warnings[0].split("\n");
					expect(lines[4]).toMatch(/FILE\.js/);
					expect(lines[5]).toMatch(/Used by/);
					expect(lines[6]).toMatch(/case-sensitive/);
					expect(lines[7]).toMatch(/file\.js/);
					expect(lines[8]).toMatch(/Used by/);
					expect(lines[9]).toMatch(/case-sensitive/);
				} else {
					expect(errors).toHaveLength(1);
					expect(warnings).toHaveLength(0);
				}
				done();
			}
		);
	});
	it("should warn when not using mode", done => {
		getErrors(
			{
				entry: "./entry-point"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(0);
				expect(warnings).toHaveLength(1);
				let lines = warnings[0].split("\n");
				expect(lines[0]).toMatch(/configuration/);
				expect(lines[1]).toMatch(/mode/);
				expect(lines[1]).toMatch(/development/);
				expect(lines[1]).toMatch(/production/);
				done();
			}
		);
	});
	it("should not warn if the NoEmitOnErrorsPlugin is used over the NoErrorsPlugin", done => {
		getErrors(
			{
				mode: "production",
				entry: "./no-errors-deprecate"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(0);
				expect(warnings).toHaveLength(0);
				done();
			}
		);
	});
	it("should not not emit if NoEmitOnErrorsPlugin is used and there is an error", done => {
		getErrors(
			{
				mode: "production",
				entry: "./missingFile"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(2);
				expect(warnings).toHaveLength(0);
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
			}
		);
	});
	it("should throw an error when trying to use [chunkhash] when it's invalid", done => {
		getErrors(
			{
				mode: "development",
				entry: {
					a: "./entry-point",
					b: "./entry-point",
					c: "./entry-point"
				},
				output: {
					filename: "[chunkhash].js"
				},
				plugins: [new webpack.HotModuleReplacementPlugin()]
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(3);
				expect(warnings).toHaveLength(0);
				errors.forEach(error => {
					const lines = error.split("\n");
					expect(lines[0]).toMatch(/chunk (a|b|c)/);
					expect(lines[2]).toMatch(/\[chunkhash\].js/);
					expect(lines[2]).toMatch(/use \[hash\] instead/);
				});
				done();
			}
		);
	});
});
