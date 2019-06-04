"use strict";

/*globals describe it */
const path = require("path");

const webpack = require("../lib/webpack");

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
	it("should report require.main.require as unsupported", done => {
		getErrors(
			{
				mode: "development",
				entry: "./require.main.require"
			},
			(errors, warnings) => {
				expect(errors).toHaveLength(0);
				expect(warnings).toHaveLength(1);
				const lines = warnings[0].split("\n");
				expect(lines[0]).toMatch(/require.main.require\.js/);
				expect(lines[1]).toMatch(
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
				const lines = warnings[0].split("\n");
				expect(lines[0]).toMatch(/module.parent.require\.js/);
				expect(lines[1]).toMatch(
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
	it("should show loader name when emit/throw errors or warnings from loaders", () => {
		return Promise.all([
			getErrorsPromise(
				{
					mode: "development",
					entry: "./entry-point-error-loader-required.js"
				},
				(errors, warnings) => {
					expect(warnings).toHaveLength(1);
					expect(warnings[0].split("\n")[1]).toMatch(
						/^Module Warning \(from .\/emit-error-loader.js\):$/
					);
					expect(errors).toHaveLength(1);
					expect(errors[0].split("\n")[1]).toMatch(
						/^Module Error \(from .\/emit-error-loader.js\):$/
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
					expect(warnings[0].split("\n")[1]).toMatch(
						/^Module Warning \(from .\/emit-error-loader.js\):$/
					);
					expect(errors).toHaveLength(1);
					expect(errors[0].split("\n")[1]).toMatch(
						/^Module Error \(from .\/emit-error-loader.js\):$/
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
					expect(warnings[0].split("\n")[1]).toMatch(
						/^Module Warning \(from .\/emit-error-loader.js\):$/
					);
					expect(errors).toHaveLength(2);
					expect(errors[0].split("\n")[1]).toMatch(
						/^Module Error \(from .\/emit-error-loader.js\):$/
					);
					expect(errors[1].split("\n")[1]).toMatch(
						/^Module build failed \(from \(webpack\)\/node_modules\/json-loader\/index.js\):$/
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
					expect(errors[0].split("\n")[1]).toMatch(
						/^Module build failed \(from .\/async-error-loader.js\):$/
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
					expect(errors[0].split("\n")[1]).toMatch(
						/^Module build failed \(from .\/throw-error-loader.js\):$/
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
					expect(warnings[0].split("\n")[1]).toMatch(
						/^Module Warning \(from .\/irregular-error-loader.js\):$/
					);
					expect(warnings[1].split("\n")[1]).toMatch(
						/^Module Warning \(from .\/irregular-error-loader.js\):$/
					);

					expect(errors).toHaveLength(3);
					expect(errors[0].split("\n")[1]).toMatch(
						/^Module Error \(from .\/irregular-error-loader.js\):$/
					);
					expect(errors[1].split("\n")[1]).toMatch(
						/^Module Error \(from .\/irregular-error-loader.js\):$/
					);
					expect(errors[2].split("\n")[1]).toMatch(
						/^Module build failed \(from .\/irregular-error-loader.js\):$/
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
				const messages = errors[0].split("\n");
				expect(messages[1]).toMatch(
					/^Module build failed: Error: Final loader \(.+\) didn't return a Buffer or String/
				);
				done();
			}
		);
	});

	const identityLoader = path.resolve(
		__dirname,
		"fixtures/errors/identity-loader.js"
	);
	const addCommentLoader = path.resolve(
		__dirname,
		"fixtures/errors/add-comment-loader.js"
	);

	it("should show loader used if it is present when module parsing fails", done => {
		getErrors(
			{
				mode: "development",
				entry: "./abc.html",
				module: {
					rules: [
						{
							test: /\.html$/,
							use: [{ loader: identityLoader }]
						}
					]
				}
			},
			(errors, warnings) => {
				expect(errors).toMatchInlineSnapshot(`
Array [
  "./abc.html 1:0
Module parse failed: Unexpected token (1:0)
File was processed with these loaders:
 * ./identity-loader.js
You may need an additional loader to handle the result of these loaders.
> <!DOCTYPE html>
| <html>
| 	<body>",
]
`);
				expect(errors[0]).toMatch("File was processed with these loaders");
				done();
			}
		);
	});

	it("should show all loaders used if they are in config when module parsing fails", done => {
		getErrors(
			{
				mode: "development",
				entry: "./abc.html",
				module: {
					rules: [
						{
							test: /\.html$/,
							use: [{ loader: identityLoader }, { loader: addCommentLoader }]
						}
					]
				}
			},
			(errors, warnings) => {
				expect(errors).toMatchInlineSnapshot(`
Array [
  "./abc.html 1:0
Module parse failed: Unexpected token (1:0)
File was processed with these loaders:
 * ./identity-loader.js
 * ./add-comment-loader.js
You may need an additional loader to handle the result of these loaders.
> <!DOCTYPE html>
| <html>
| 	<body>",
]
`);
				expect(errors[0]).toMatch("File was processed with these loaders");
				done();
			}
		);
	});

	it("should show all loaders used if use is a string", done => {
		getErrors(
			{
				mode: "development",
				entry: "./abc.html",
				module: {
					rules: [
						{ test: /\.html$/, use: identityLoader },
						{ test: /\.html$/, use: addCommentLoader }
					]
				}
			},
			(errors, warnings) => {
				expect(errors).toMatchInlineSnapshot(`
Array [
  "./abc.html 1:0
Module parse failed: Unexpected token (1:0)
File was processed with these loaders:
 * ./identity-loader.js
 * ./add-comment-loader.js
You may need an additional loader to handle the result of these loaders.
> <!DOCTYPE html>
| <html>
| 	<body>",
]
`);
				expect(errors[0]).toMatch("File was processed with these loaders");
				done();
			}
		);
	});

	it("should show 'no loaders are configured to process this file' if loaders are not included in config when module parsing fails", done => {
		getErrors(
			{
				mode: "development",
				entry: "./abc.html",
				module: {}
			},
			(errors, warnings) => {
				expect(errors).toMatchInlineSnapshot(`
Array [
  "./abc.html 1:0
Module parse failed: Unexpected token (1:0)
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
> <!DOCTYPE html>
| <html>
| 	<body>",
]
`);
				expect(errors[0]).toMatch(
					"no loaders are configured to process this file"
				);
				done();
			}
		);
	});

	it("should show 'source code omitted for this binary file' when module parsing fails for binary files", done => {
		const folder = path.join(__dirname, "/fixtures");
		getErrors(
			{
				mode: "development",
				entry: path.resolve(folder, "./font.ttf"),
				module: {}
			},
			(errors, warnings) => {
				expect(errors).toMatchInlineSnapshot(`
Array [
  "../font.ttf 1:0
Module parse failed: Unexpected character ' ' (1:0)
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
(Source code omitted for this binary file)",
]
`);
				done();
			}
		);
	});
});
