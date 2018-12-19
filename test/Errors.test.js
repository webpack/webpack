"use strict";

/*globals describe it */
const path = require("path");

const webpack = require("..");

const base = path.join(__dirname, "fixtures", "errors");

describe("Errors", () => {
	jest.setTimeout(20000);

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
				expect(errors).toHaveLength(2);
				expect(warnings).toHaveLength(0);
				expect(errors[0].moduleName).toMatch(/missingFile.js/);
				expect(errors[0].loc).toMatch(/4:0/);
				expect(errors[0].message).toMatch(/^Module not found/);
				expect(errors[0].message).toMatch(/\.\/missing/);
				expect(errors[1].moduleName).toMatch(/missingFile.js/);
				expect(errors[1].loc).toMatch(/12:9/);
				expect(errors[1].message).toMatch(/^Module not found/);
				expect(errors[1].message).toMatch(/\.\/dir\/missing2/);
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
				expect(warnings[0].moduleName).toMatch(/require.extensions\.js/);
				expect(warnings[0].message).toMatch(
					/require.extensions is not supported by webpack/
				);
				done();
			}
		);
	});
	it("should report require.main.require as unsupported", done => {
		getErrors(
			{
				mode: "development",
				entry: "./require.main.require"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(0);
				expect(warnings).toHaveLength(1);
				expect(warnings[0].moduleName).toMatch(/require.main.require\.js/);
				expect(warnings[0].message).toMatch(
					/require.main.require is not supported by webpack/
				);
				done();
			}
		);
	});
	it("should report module.parent.require as unsupported", done => {
		getErrors(
			{
				mode: "development",
				entry: "./module.parent.require"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(0);
				expect(warnings).toHaveLength(1);
				expect(warnings[0].moduleName).toMatch(/module.parent.require\.js/);
				expect(warnings[0].message).toMatch(
					/module.parent.require is not supported by webpack/
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
					const lines = warnings[0].message.split("\n");
					expect(lines[3]).toMatch(/FILE\.js/);
					expect(lines[4]).toMatch(/Used by/);
					expect(lines[5]).toMatch(/case-sensitive/);
					expect(lines[6]).toMatch(/file\.js/);
					expect(lines[7]).toMatch(/Used by/);
					expect(lines[8]).toMatch(/case-sensitive/);
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
				expect(warnings[0].message).toMatch(/configuration/);
				expect(warnings[0].message).toMatch(/mode/);
				expect(warnings[0].message).toMatch(/development/);
				expect(warnings[0].message).toMatch(/production/);
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
				expect(errors[0].moduleName).toMatch(/missingFile.js/);
				expect(errors[0].loc).toMatch(/4:0/);
				expect(errors[0].message).toMatch(/^Module not found/);
				expect(errors[0].message).toMatch(/\.\/missing/);
				expect(errors[1].moduleName).toMatch(/missingFile.js/);
				expect(errors[1].loc).toMatch(/12:9/);
				expect(errors[1].message).toMatch(/^Module not found/);
				expect(errors[1].message).toMatch(/\.\/dir\/missing2/);
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
					expect(warnings).toHaveLength(1);
					expect(warnings[0].message).toMatch(
						/^Module Warning \(from .\/emit-error-loader.js\):/
					);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toMatch(
						/^Module Error \(from .\/emit-error-loader.js\):/
					);
				}
			),
			getErrorsPromise(
				{
					mode: "development",
					entry: path.resolve(base, "./emit-error-loader") + "!./entry-point.js"
				},
				(errors, warnings) => {
					expect(warnings).toHaveLength(1);
					expect(warnings[0].message).toMatch(
						/^Module Warning \(from .\/emit-error-loader.js\):/
					);
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toMatch(
						/^Module Error \(from .\/emit-error-loader.js\):/
					);
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
					expect(warnings).toHaveLength(1);
					expect(warnings[0].message).toMatch(
						/^Module Warning \(from .\/emit-error-loader.js\):/
					);
					expect(errors).toHaveLength(2);
					expect(errors[0].message).toMatch(
						/^Module Error \(from .\/emit-error-loader.js\):/
					);
					expect(errors[1].message).toMatch(
						/^Module build failed \(from \(webpack\)\/node_modules\/json-loader\/index.js\):/
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
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toMatch(
						/^Module build failed \(from .\/async-error-loader.js\):/
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
					expect(errors).toHaveLength(1);
					expect(errors[0].message).toMatch(
						/^Module build failed \(from .\/throw-error-loader.js\):/
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
					expect(warnings).toHaveLength(2);
					expect(warnings[0].message).toMatch(
						/^Module Warning \(from .\/irregular-error-loader.js\):/
					);
					expect(warnings[1].message).toMatch(
						/^Module Warning \(from .\/irregular-error-loader.js\):/
					);

					expect(errors).toHaveLength(3);
					expect(errors[0].message).toMatch(
						/^Module Error \(from .\/irregular-error-loader.js\):/
					);
					expect(errors[1].message).toMatch(
						/^Module Error \(from .\/irregular-error-loader.js\):/
					);
					expect(errors[2].message).toMatch(
						/^Module build failed \(from .\/irregular-error-loader.js\):/
					);
				}
			)
		]);
	});
	it("should throw a build error if no source be returned after run loaders", done => {
		getErrors(
			{
				mode: "development",
				entry: path.resolve(base, "./no-return-loader") + "!./entry-point.js"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(1);
				expect(errors[0].message).toMatch(
					/^Module build failed: Error: Final loader \(.+\) didn't return a Buffer or String/
				);
				done();
			}
		);
	});
});
