"use strict";

/*globals describe it */
const should = require("should");
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
				files[name] = content.toString("utf8");
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
			should.strictEqual(typeof stats, "object");
			stats = stats.toJson({
				errorDetails: false
			});
			should.strictEqual(typeof stats, "object");
			stats.should.have.property("errors");
			stats.should.have.property("warnings");
			Array.isArray(stats.errors).should.be.ok(); // eslint-disable-line no-unused-expressions
			Array.isArray(stats.warnings).should.be.ok(); // eslint-disable-line no-unused-expressions
			callback(stats.errors, stats.warnings);
		});
	}

	function getErrorsPromise(options, callback) {
		return new Promise((resolve, reject) => {
			getErrors(options, (errors, warnings) => {
				callback(errors, warnings);
				resolve();
			});
		});
	}
	it("should throw an error if file doesn't exist", done => {
		getErrors(
			{
				mode: "development",
				entry: "./missingFile"
			},
			(errors, warnings) => {
				errors.length.should.be.eql(2);
				warnings.length.should.be.eql(0);
				errors.sort();
				let lines = errors[0].split("\n");
				lines[0].should.match(/missingFile.js/);
				lines[1].should.match(/^Module not found/);
				lines[1].should.match(/\.\/dir\/missing2/);
				lines[2].should.match(/missingFile.js 12:9/);
				lines = errors[1].split("\n");
				lines[0].should.match(/missingFile.js/);
				lines[1].should.match(/^Module not found/);
				lines[1].should.match(/\.\/missing/);
				lines[2].should.match(/missingFile.js 4:0/);
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
				errors.length.should.be.eql(0);
				warnings.length.should.be.eql(1);
				const lines = warnings[0].split("\n");
				lines[0].should.match(/require.extensions\.js/);
				lines[1].should.match(/require.extensions is not supported by webpack/);
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
					warnings.length.should.be.eql(1);
					const lines = warnings[0].split("\n");
					lines[4].should.match(/FILE\.js/);
					lines[5].should.match(/Used by/);
					lines[6].should.match(/case-sensitive/);
					lines[7].should.match(/file\.js/);
					lines[8].should.match(/Used by/);
					lines[9].should.match(/case-sensitive/);
				} else {
					errors.length.should.be.eql(1);
					warnings.length.should.be.eql(0);
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
				errors.length.should.be.eql(0);
				warnings.length.should.be.eql(1);
				let lines = warnings[0].split("\n");
				lines[0].should.match(/configuration/);
				lines[1].should.match(/mode/);
				lines[1].should.match(/development/);
				lines[1].should.match(/production/);
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
				errors.length.should.be.eql(0);
				warnings.length.should.be.eql(0);
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
				errors.length.should.be.eql(2);
				warnings.length.should.be.eql(0);
				errors.sort();
				let lines = errors[0].split("\n");
				lines[0].should.match(/missingFile.js/);
				lines[1].should.match(/^Module not found/);
				lines[1].should.match(/\.\/dir\/missing2/);
				lines[2].should.match(/missingFile.js 12:9/);
				lines = errors[1].split("\n");
				lines[0].should.match(/missingFile.js/);
				lines[1].should.match(/^Module not found/);
				lines[1].should.match(/\.\/missing/);
				lines[2].should.match(/missingFile.js 4:0/);
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
				errors.length.should.be.eql(3);
				warnings.length.should.be.eql(0);
				errors.forEach(error => {
					const lines = error.split("\n");
					lines[0].should.match(/chunk (a|b|c)/);
					lines[2].should.match(/\[chunkhash\].js/);
					lines[2].should.match(/use \[hash\] instead/);
				});
				done();
			}
		);
	});
	it("should show loader name when emit/throw errors or warnings from loaders", () => {
		return Promise.all([
			getErrorsPromise(
				{
					mode: "development",
					entry: "./entry-point-error-loader-required.js"
				},
				(errors, warnings) => {
					warnings.length.should.be.eql(1);
					warnings[0]
						.split("\n")[1]
						.should.match(
							/^Module Warning \(@.\/emit-error-loader.js\): [^\s]+/
						);
					errors.length.should.be.eql(1);
					errors[0]
						.split("\n")[1]
						.should.match(/^Module Error \(@.\/emit-error-loader.js\): [^\s]+/);
				}
			),
			getErrorsPromise(
				{
					mode: "development",
					entry: path.resolve(base, "./emit-error-loader") + "!./entry-point.js"
				},
				(errors, warnings) => {
					warnings.length.should.be.eql(1);
					warnings[0]
						.split("\n")[1]
						.should.match(
							/^Module Warning \(@.\/emit-error-loader.js\): [^\s]+/
						);
					errors.length.should.be.eql(1);
					errors[0]
						.split("\n")[1]
						.should.match(/^Module Error \(@.\/emit-error-loader.js\): [^\s]+/);
				}
			),
			getErrorsPromise(
				{
					mode: "development",
					entry: "./not-a-json.js",
					module: {
						rules: [
							{
								test: /not-a-json\.js$/,
								use: [
									"json-loader",
									{
										loader: path.resolve(base, "./emit-error-loader")
									}
								]
							}
						]
					}
				},
				(errors, warnings) => {
					warnings.length.should.be.eql(1);
					warnings[0]
						.split("\n")[1]
						.should.match(
							/^Module Warning \(@.\/emit-error-loader.js\): [^\s]+/
						);
					errors.length.should.be.eql(2);
					errors[0]
						.split("\n")[1]
						.should.match(/^Module Error \(@.\/emit-error-loader.js\): [^\s]+/);
					errors[1]
						.split("\n")[1]
						.should.match(
							/^Module build failed \(@\(webpack\)\/node_modules\/json-loader\/index.js\): [^\s]+/
						);
				}
			),
			getErrorsPromise(
				{
					mode: "development",
					entry: "./entry-point.js",
					module: {
						rules: [
							{
								test: /entry-point\.js$/,
								use: path.resolve(base, "./async-error-loader")
							}
						]
					}
				},
				(errors, warnings) => {
					errors.length.should.be.eql(1);
					errors[0]
						.split("\n")[1]
						.should.match(
							/^Module build failed \(@.\/async-error-loader.js\): [^\s]+/
						);
				}
			),
			getErrorsPromise(
				{
					mode: "development",
					entry: "./entry-point.js",
					module: {
						rules: [
							{
								test: /entry-point\.js$/,
								use: path.resolve(base, "./throw-error-loader")
							}
						]
					}
				},
				(errors, warnings) => {
					errors.length.should.be.eql(1);
					errors[0]
						.split("\n")[1]
						.should.match(
							/^Module build failed \(@.\/throw-error-loader.js\): [^\s]+/
						);
				}
			),
			getErrorsPromise(
				{
					mode: "development",
					entry: "./entry-point.js",
					module: {
						rules: [
							{
								test: /entry-point\.js$/,
								use: path.resolve(base, "./irregular-error-loader")
							}
						]
					}
				},
				(errors, warnings) => {
					warnings.length.should.be.eql(2);
					warnings[0]
						.split("\n")[1]
						.should.match(
							/^Module Warning \(@.\/irregular-error-loader.js\): [^\s]+/
						);
					warnings[1]
						.split("\n")[1]
						.should.match(
							/^Module Warning \(@.\/irregular-error-loader.js\): [^\s]+/
						);

					errors.length.should.be.eql(3);
					errors[0]
						.split("\n")[1]
						.should.match(
							/^Module Error \(@.\/irregular-error-loader.js\): [^\s]+/
						);
					errors[1]
						.split("\n")[1]
						.should.match(
							/^Module Error \(@.\/irregular-error-loader.js\): [^\s]+/
						);
					errors[2]
						.split("\n")[1]
						.should.match(
							/^Module build failed \(@.\/irregular-error-loader.js\): [^\s]+/
						);
				}
			)
		]);
	});
});
