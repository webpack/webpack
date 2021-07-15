"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const webpack = require("..");
const prettyFormat = require("pretty-format").default;

const CWD_PATTERN = new RegExp(process.cwd().replace(/\\/g, "/"), "gm");
const ERROR_STACK_PATTERN = /(?:\n\s+at\s.*)+/gm;

function cleanError(err) {
	const result = {};
	for (const key of Object.getOwnPropertyNames(err)) {
		result[key] = err[key];
	}

	if (result.message) {
		result.message = err.message.replace(ERROR_STACK_PATTERN, "");
	}

	if (result.stack) {
		result.stack = result.stack.replace(ERROR_STACK_PATTERN, "");
	}

	return result;
}

function serialize(received) {
	return prettyFormat(received, prettyFormatOptions)
		.replace(CWD_PATTERN, "<cwd>")
		.trim();
}

const prettyFormatOptions = {
	escapeRegex: false,
	printFunctionName: false,
	plugins: [
		{
			test(val) {
				return typeof val === "string";
			},
			print(val) {
				return `"${val
					.replace(/\\/gm, "/")
					.replace(/"/gm, '\\"')
					.replace(/\r?\n/gm, "\\n")}"`;
			}
		}
	]
};

expect.addSnapshotSerializer({
	test(received) {
		return received.errors || received.warnings;
	},
	print(received) {
		return serialize({
			errors: received.errors.map(cleanError),
			warnings: received.warnings.map(cleanError)
		});
	}
});

expect.addSnapshotSerializer({
	test(received) {
		return received.message;
	},
	print(received) {
		return serialize(cleanError(received));
	}
});

const defaults = {
	options: {
		context: path.resolve(__dirname, "fixtures", "errors"),
		mode: "none",
		devtool: false,
		optimization: {
			minimize: false
		}
	},
	outputFileSystem: {
		mkdir(dir, callback) {
			callback();
		},
		writeFile(file, content, callback) {
			callback();
		},
		stat(file, callback) {
			callback(new Error("ENOENT"));
		}
	}
};

async function compile(options) {
	const stats = await new Promise((resolve, reject) => {
		const compiler = webpack({ ...defaults.options, ...options });
		if (options.mode === "production") {
			if (options.optimization) options.optimization.minimize = true;
			else options.optimization = { minimize: true };
		}
		compiler.outputFileSystem = defaults.outputFileSystem;

		try {
			compiler.run((bailedError, stats) => {
				if (bailedError) {
					return reject(bailedError);
				}
				compiler.close(closeError => {
					if (closeError) {
						return reject(closeError);
					}
					resolve(stats);
				});
			});
		} catch (err) {
			// capture sync throwm errors
			reject(err);
		}
	});

	expect(typeof stats).toEqual("object");
	const statsResult = stats.toJson({ errorDetails: false });
	expect(typeof statsResult).toBe("object");
	const { errors, warnings } = statsResult;
	expect(Array.isArray(errors)).toBe(true);
	expect(Array.isArray(warnings)).toBe(true);

	return { errors, warnings };
}

it("should emit warning for missingFile", async () => {
	await expect(
		compile({
			entry: "./missingFile"
		})
	).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "4:0-20",
					      "message": "Module not found: Error: Can't resolve './missing' in '<cwd>/test/fixtures/errors'",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/missingFile.js",
					      "moduleName": "./missingFile.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleNotFoundError: Module not found: Error: Can't resolve './missing' in '<cwd>/test/fixtures/errors'",
					    },
					    Object {
					      "loc": "12:9-34",
					      "message": "Module not found: Error: Can't resolve './dir/missing2' in '<cwd>/test/fixtures/errors'",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/missingFile.js",
					      "moduleName": "./missingFile.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleNotFoundError: Module not found: Error: Can't resolve './dir/missing2' in '<cwd>/test/fixtures/errors'",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
}, 20000);

it("should emit warning for require.extensions", async () => {
	await expect(compile({ entry: "./require.extensions" })).resolves
		.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [],
					  "warnings": Array [
					    Object {
					      "loc": "1:0-18",
					      "message": "require.extensions is not supported by webpack. Use a loader instead.",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/require.extensions.js",
					      "moduleName": "./require.extensions.js",
					      "moduleTrace": Array [],
					      "stack": "UnsupportedFeatureWarning: require.extensions is not supported by webpack. Use a loader instead.",
					    },
					  ],
					}
				`);
});

it("should emit warning for require.main.require", async () => {
	await expect(compile({ entry: "./require.main.require" })).resolves
		.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [],
					  "warnings": Array [
					    Object {
					      "loc": "1:0-30",
					      "message": "require.main.require is not supported by webpack.",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/require.main.require.js",
					      "moduleName": "./require.main.require.js",
					      "moduleTrace": Array [],
					      "stack": "UnsupportedFeatureWarning: require.main.require is not supported by webpack.",
					    },
					  ],
					}
				`);
});
it("should emit warning for module.parent.require", async () => {
	await expect(compile({ entry: "./module.parent.require" })).resolves
		.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [],
					  "warnings": Array [
					    Object {
					      "loc": "1:0-31",
					      "message": "module.parent.require is not supported by webpack.",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/module.parent.require.js",
					      "moduleName": "./module.parent.require.js",
					      "moduleTrace": Array [],
					      "stack": "UnsupportedFeatureWarning: module.parent.require is not supported by webpack.",
					    },
					  ],
					}
				`);
});

const isCaseInsensitiveFilesystem = fs.existsSync(
	path.resolve(__dirname, "fixtures", "errors", "FILE.js")
);
if (isCaseInsensitiveFilesystem) {
	it("should emit warning for case-preserved disk", async () => {
		const result = await compile({
			mode: "development",
			entry: "./case-sensitive"
		});
		expect(result).toMatchInlineSnapshot(`
		Object {
		  "errors": Array [],
		  "warnings": Array [
		    Object {
		      "message": "There are multiple modules with names that only differ in casing.\\nThis can lead to unexpected behavior when compiling on a filesystem with other case-semantic.\\nUse equal casing. Compare these module identifiers:\\n* <cwd>/test/fixtures/errors/FILE.js\\n    Used by 1 module(s), i. e.\\n    <cwd>/test/fixtures/errors/case-sensitive.js\\n* <cwd>/test/fixtures/errors/file.js\\n    Used by 1 module(s), i. e.\\n    <cwd>/test/fixtures/errors/case-sensitive.js",
		      "moduleId": "./FILE.js",
		      "moduleIdentifier": "<cwd>/test/fixtures/errors/FILE.js",
		      "moduleName": "./FILE.js",
		      "moduleTrace": Array [
		        Object {
		          "dependencies": Array [
		            Object {
		              "loc": "2:0-17",
		            },
		          ],
		          "moduleId": "./FILE.js",
		          "moduleIdentifier": "<cwd>/test/fixtures/errors/FILE.js",
		          "moduleName": "./FILE.js",
		          "originId": "./case-sensitive.js",
		          "originIdentifier": "<cwd>/test/fixtures/errors/case-sensitive.js",
		          "originName": "./case-sensitive.js",
		        },
		      ],
		      "stack": "CaseSensitiveModulesWarning: There are multiple modules with names that only differ in casing.\\nThis can lead to unexpected behavior when compiling on a filesystem with other case-semantic.\\nUse equal casing. Compare these module identifiers:\\n* <cwd>/test/fixtures/errors/FILE.js\\n    Used by 1 module(s), i. e.\\n    <cwd>/test/fixtures/errors/case-sensitive.js\\n* <cwd>/test/fixtures/errors/file.js\\n    Used by 1 module(s), i. e.\\n    <cwd>/test/fixtures/errors/case-sensitive.js",
		    },
		  ],
		}
	`);
	});
} else {
	it("should emit error for case-sensitive", async () => {
		const result = await compile({
			mode: "development",
			entry: "./case-sensitive"
		});
		expect(result).toMatchInlineSnapshot(`
		Object {
		  "errors": Array [
		    Object {
		      "loc": "2:0-17",
		      "message": "Module not found: Error: Can't resolve './FILE' in '<cwd>/test/fixtures/errors'",
		      "moduleId": "./case-sensitive.js",
		      "moduleIdentifier": "<cwd>/test/fixtures/errors/case-sensitive.js",
		      "moduleName": "./case-sensitive.js",
		      "moduleTrace": Array [],
		      "stack": "ModuleNotFoundError: Module not found: Error: Can't resolve './FILE' in '<cwd>/test/fixtures/errors'",
		    },
		  ],
		  "warnings": Array [],
		}
	`);
	});
}

it("should emit warning for undef mode", async () => {
	await expect(compile({ mode: undefined, entry: "./entry-point" })).resolves
		.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [],
					  "warnings": Array [
					    Object {
					      "message": "configuration\\nThe 'mode' option has not been set, webpack will fallback to 'production' for this value.\\nSet 'mode' option to 'development' or 'production' to enable defaults for each environment.\\nYou can also set it to 'none' to disable any default behavior. Learn more: https://webpack.js.org/configuration/mode/",
					      "stack": "NoModeWarning: configuration\\nThe 'mode' option has not been set, webpack will fallback to 'production' for this value.\\nSet 'mode' option to 'development' or 'production' to enable defaults for each environment.\\nYou can also set it to 'none' to disable any default behavior. Learn more: https://webpack.js.org/configuration/mode/",
					    },
					  ],
					}
				`);
});
it("should emit no errors or warnings for no-errors-deprecate", async () => {
	await expect(compile({ mode: "production", entry: "./no-errors-deprecate" }))
		.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [],
					  "warnings": Array [],
					}
				`);
});

it("should emit errors for missingFile for production", async () => {
	await expect(compile({ mode: "production", entry: "./missingFile" })).resolves
		.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "4:0-20",
					      "message": "Module not found: Error: Can't resolve './missing' in '<cwd>/test/fixtures/errors'",
					      "moduleId": 814,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/missingFile.js",
					      "moduleName": "./missingFile.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleNotFoundError: Module not found: Error: Can't resolve './missing' in '<cwd>/test/fixtures/errors'",
					    },
					    Object {
					      "loc": "12:9-34",
					      "message": "Module not found: Error: Can't resolve './dir/missing2' in '<cwd>/test/fixtures/errors'",
					      "moduleId": 814,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/missingFile.js",
					      "moduleName": "./missingFile.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleNotFoundError: Module not found: Error: Can't resolve './dir/missing2' in '<cwd>/test/fixtures/errors'",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
});

it("should emit module build errors", async () => {
	await expect(compile({ entry: "./has-syntax-error" })).resolves
		.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "2:12",
					      "message": "Module parse failed: Unexpected token (2:12)\\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\\n| window.foo = {\\n>   bar: true,;\\n| };\\n| ",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/has-syntax-error.js",
					      "moduleName": "./has-syntax-error.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleParseError: Module parse failed: Unexpected token (2:12)\\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\\n| window.foo = {\\n>   bar: true,;\\n| };\\n| ",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
});

it("should bao; thrown sync error from plugin", async () => {
	await expect(
		compile({
			entry: "./no-errors-deprecate",
			plugins: [require("./fixtures/errors/throw-error-plugin")]
		})
	).rejects.toMatchInlineSnapshot(`
					Object {
					  "message": "foo",
					  "stack": "Error: foo",
					}
				`);
});

describe("loaders", () => {
	it("should emit error thrown at module level", async () => {
		await expect(
			compile({
				entry: "./module-level-throw-error-loader!./no-errors-deprecate"
			})
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed (from ./module-level-throw-error-loader.js):\\nError: this is a thrown error from module level",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/module-level-throw-error-loader.js!<cwd>/test/fixtures/errors/no-errors-deprecate.js",
					      "moduleName": "./module-level-throw-error-loader.js!./no-errors-deprecate.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ./module-level-throw-error-loader.js):\\nError: this is a thrown error from module level",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});
	it("should emit errors & warnings for emit-error-loader", async () => {
		await expect(compile({ entry: "./entry-point-error-loader-required.js" }))
			.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module Error (from ./emit-error-loader.js):\\nthis is an error",
					      "moduleId": 1,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/emit-error-loader.js!<cwd>/test/fixtures/errors/file.js",
					      "moduleName": "./emit-error-loader.js!./file.js",
					      "moduleTrace": Array [
					        Object {
					          "dependencies": Array [
					            Object {
					              "loc": "1:0-40",
					            },
					          ],
					          "moduleId": 1,
					          "moduleIdentifier": "<cwd>/test/fixtures/errors/emit-error-loader.js!<cwd>/test/fixtures/errors/file.js",
					          "moduleName": "./emit-error-loader.js!./file.js",
					          "originId": 0,
					          "originIdentifier": "<cwd>/test/fixtures/errors/entry-point-error-loader-required.js",
					          "originName": "./entry-point-error-loader-required.js",
					        },
					      ],
					      "stack": "ModuleError: Module Error (from ./emit-error-loader.js):\\nthis is an error",
					    },
					  ],
					  "warnings": Array [
					    Object {
					      "message": "Module Warning (from ./emit-error-loader.js):\\nthis is a warning",
					      "moduleId": 1,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/emit-error-loader.js!<cwd>/test/fixtures/errors/file.js",
					      "moduleName": "./emit-error-loader.js!./file.js",
					      "moduleTrace": Array [
					        Object {
					          "dependencies": Array [
					            Object {
					              "loc": "1:0-40",
					            },
					          ],
					          "moduleId": 1,
					          "moduleIdentifier": "<cwd>/test/fixtures/errors/emit-error-loader.js!<cwd>/test/fixtures/errors/file.js",
					          "moduleName": "./emit-error-loader.js!./file.js",
					          "originId": 0,
					          "originIdentifier": "<cwd>/test/fixtures/errors/entry-point-error-loader-required.js",
					          "originName": "./entry-point-error-loader-required.js",
					        },
					      ],
					      "stack": "ModuleWarning: Module Warning (from ./emit-error-loader.js):\\nthis is a warning",
					    },
					  ],
					}
				`);
	});

	it("should emit error & warning for emit-error-loader", async () => {
		await expect(compile({ entry: "./emit-error-loader!./entry-point.js" }))
			.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module Error (from ./emit-error-loader.js):\\nthis is an error",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/emit-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./emit-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleError: Module Error (from ./emit-error-loader.js):\\nthis is an error",
					    },
					  ],
					  "warnings": Array [
					    Object {
					      "message": "Module Warning (from ./emit-error-loader.js):\\nthis is a warning",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/emit-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./emit-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleWarning: Module Warning (from ./emit-error-loader.js):\\nthis is a warning",
					    },
					  ],
					}
				`);
	});
	it("should emit error for json-loader when not json", async () => {
		await expect(compile({ entry: "json-loader!./not-a-json.js" })).resolves
			.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed (from ../../../node_modules/json-loader/index.js):\\nSyntaxError: Unexpected end of JSON input",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/node_modules/json-loader/index.js!<cwd>/test/fixtures/errors/not-a-json.js",
					      "moduleName": "../../../node_modules/json-loader/index.js!./not-a-json.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ../../../node_modules/json-loader/index.js):\\nSyntaxError: Unexpected end of JSON input",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should emit error for async-error-loader", async () => {
		await expect(compile({ entry: "./async-error-loader!./entry-point.js" }))
			.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed (from ./async-error-loader.js):\\nError: this is a callback error",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/async-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./async-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ./async-error-loader.js):\\nError: this is a callback error",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should emit error thrown from raw loader", async () => {
		await expect(compile({ entry: "./throw-error-loader!./entry-point.js" }))
			.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed (from ./throw-error-loader.js):\\nError: this is a thrown error",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/throw-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./throw-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ./throw-error-loader.js):\\nError: this is a thrown error",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should emit error thrown from pitch loader", async () => {
		await expect(compile({ entry: "./throw-error-loader!./entry-point.js" }))
			.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed (from ./throw-error-loader.js):\\nError: this is a thrown error",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/throw-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./throw-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ./throw-error-loader.js):\\nError: this is a thrown error",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});
	it("should emit error thrown from yaw loader", async () => {
		await expect(compile({ entry: "./throw-error-loader!./entry-point.js" }))
			.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed (from ./throw-error-loader.js):\\nError: this is a thrown error",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/throw-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./throw-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ./throw-error-loader.js):\\nError: this is a thrown error",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should emit errors & warnings for irregular-error-loader", async () => {
		await expect(
			compile({ entry: "./irregular-error-loader!./entry-point.js" })
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module Error (from ./irregular-error-loader.js):\\n(Emitted value instead of an instance of Error) null",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./irregular-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleError: Module Error (from ./irregular-error-loader.js):\\n(Emitted value instead of an instance of Error) null",
					    },
					    Object {
					      "message": "Module Error (from ./irregular-error-loader.js):\\nError",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./irregular-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleError: Module Error (from ./irregular-error-loader.js):\\nError",
					    },
					    Object {
					      "message": "Module build failed (from ./irregular-error-loader.js):\\nNonErrorEmittedError: (Emitted value instead of an instance of Error) a string error",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./irregular-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ./irregular-error-loader.js):\\nNonErrorEmittedError: (Emitted value instead of an instance of Error) a string error",
					    },
					  ],
					  "warnings": Array [
					    Object {
					      "message": "Module Warning (from ./irregular-error-loader.js):\\n(Emitted value instead of an instance of Error) null",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./irregular-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleWarning: Module Warning (from ./irregular-error-loader.js):\\n(Emitted value instead of an instance of Error) null",
					    },
					    Object {
					      "message": "Module Warning (from ./irregular-error-loader.js):\\nError",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./irregular-error-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleWarning: Module Warning (from ./irregular-error-loader.js):\\nError",
					    },
					  ],
					}
				`);
	});

	it("should emit error for no-return-loader", async () => {
		await expect(compile({ entry: "./no-return-loader!./entry-point.js" }))
			.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed: Error: Final loader (./no-return-loader.js) didn't return a Buffer or String",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/no-return-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./no-return-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed: Error: Final loader (./no-return-loader.js) didn't return a Buffer or String",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should emit error for doesnt-exist-loader", async () => {
		await expect(compile({ entry: "./doesnt-exist-loader!./entry-point.js" }))
			.resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "main",
					      "message": "Module not found: Error: Can't resolve './doesnt-exist-loader' in '<cwd>/test/fixtures/errors'",
					      "stack": "ModuleNotFoundError: Module not found: Error: Can't resolve './doesnt-exist-loader' in '<cwd>/test/fixtures/errors'",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should emit error for return-undefined-loader", async () => {
		await expect(
			compile({ entry: "./return-undefined-loader!./entry-point.js" })
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed: Error: Final loader (./return-undefined-loader.js) didn't return a Buffer or String",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/return-undefined-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./return-undefined-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed: Error: Final loader (./return-undefined-loader.js) didn't return a Buffer or String",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should emit error for module-exports-object-loader", async () => {
		await expect(
			compile({ entry: "./module-exports-object-loader!./entry-point.js" })
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed (from ./module-exports-object-loader.js):\\nLoaderRunnerError: Module '<cwd>/test/fixtures/errors/module-exports-object-loader.js' is not a loader (must have normal or pitch function)",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/module-exports-object-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./module-exports-object-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ./module-exports-object-loader.js):\\nLoaderRunnerError: Module '<cwd>/test/fixtures/errors/module-exports-object-loader.js' is not a loader (must have normal or pitch function)",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should emit error for module-exports-string-loader", async () => {
		await expect(
			compile({ entry: "./module-exports-string-loader!./entry-point.js" })
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "message": "Module build failed (from ./module-exports-string-loader.js):\\nLoaderRunnerError: Module '<cwd>/test/fixtures/errors/module-exports-string-loader.js' is not a loader (export function or es6 module)",
					      "moduleId": 0,
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/module-exports-string-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
					      "moduleName": "./module-exports-string-loader.js!./entry-point.js",
					      "moduleTrace": Array [],
					      "stack": "ModuleBuildError: Module build failed (from ./module-exports-string-loader.js):\\nLoaderRunnerError: Module '<cwd>/test/fixtures/errors/module-exports-string-loader.js' is not a loader (export function or es6 module)",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	const identityLoader = path.resolve(
		__dirname,
		"fixtures/errors/identity-loader.js"
	);
	const addCommentLoader = path.resolve(
		__dirname,
		"fixtures/errors/add-comment-loader.js"
	);

	it("should show loader used if it is present when module parsing fails", async () => {
		await expect(
			compile({
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
			})
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "1:0",
					      "message": "Module parse failed: Unexpected token (1:0)\\nFile was processed with these loaders:\\n * ./identity-loader.js\\nYou may need an additional loader to handle the result of these loaders.\\n> <!DOCTYPE html>\\n| <html>\\n| 	<body>",
					      "moduleId": "./abc.html",
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/identity-loader.js!<cwd>/test/fixtures/errors/abc.html",
					      "moduleName": "./abc.html",
					      "moduleTrace": Array [],
					      "stack": "ModuleParseError: Module parse failed: Unexpected token (1:0)\\nFile was processed with these loaders:\\n * ./identity-loader.js\\nYou may need an additional loader to handle the result of these loaders.\\n> <!DOCTYPE html>\\n| <html>\\n| 	<body>",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should show all loaders used if they are in config when module parsing fails", async () => {
		await expect(
			compile({
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
			})
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "1:0",
					      "message": "Module parse failed: Unexpected token (1:0)\\nFile was processed with these loaders:\\n * ./identity-loader.js\\n * ./add-comment-loader.js\\nYou may need an additional loader to handle the result of these loaders.\\n> <!DOCTYPE html>\\n| <html>\\n| 	<body>",
					      "moduleId": "./abc.html",
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/identity-loader.js!<cwd>/test/fixtures/errors/add-comment-loader.js!<cwd>/test/fixtures/errors/abc.html",
					      "moduleName": "./abc.html",
					      "moduleTrace": Array [],
					      "stack": "ModuleParseError: Module parse failed: Unexpected token (1:0)\\nFile was processed with these loaders:\\n * ./identity-loader.js\\n * ./add-comment-loader.js\\nYou may need an additional loader to handle the result of these loaders.\\n> <!DOCTYPE html>\\n| <html>\\n| 	<body>",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should show all loaders used if use is a string", async () => {
		await expect(
			compile({
				mode: "development",
				entry: "./abc.html",
				module: {
					rules: [
						{ test: /\.html$/, use: identityLoader },
						{ test: /\.html$/, use: addCommentLoader }
					]
				}
			})
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "1:0",
					      "message": "Module parse failed: Unexpected token (1:0)\\nFile was processed with these loaders:\\n * ./identity-loader.js\\n * ./add-comment-loader.js\\nYou may need an additional loader to handle the result of these loaders.\\n> <!DOCTYPE html>\\n| <html>\\n| 	<body>",
					      "moduleId": "./abc.html",
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/identity-loader.js!<cwd>/test/fixtures/errors/add-comment-loader.js!<cwd>/test/fixtures/errors/abc.html",
					      "moduleName": "./abc.html",
					      "moduleTrace": Array [],
					      "stack": "ModuleParseError: Module parse failed: Unexpected token (1:0)\\nFile was processed with these loaders:\\n * ./identity-loader.js\\n * ./add-comment-loader.js\\nYou may need an additional loader to handle the result of these loaders.\\n> <!DOCTYPE html>\\n| <html>\\n| 	<body>",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should show 'no loaders are configured to process this file' if loaders are not included in config when module parsing fails", async () => {
		await expect(
			compile({
				mode: "development",
				entry: "./abc.html",
				module: {}
			})
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "1:0",
					      "message": "Module parse failed: Unexpected token (1:0)\\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\\n> <!DOCTYPE html>\\n| <html>\\n| 	<body>",
					      "moduleId": "./abc.html",
					      "moduleIdentifier": "<cwd>/test/fixtures/errors/abc.html",
					      "moduleName": "./abc.html",
					      "moduleTrace": Array [],
					      "stack": "ModuleParseError: Module parse failed: Unexpected token (1:0)\\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\\n> <!DOCTYPE html>\\n| <html>\\n| 	<body>",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should show 'source code omitted for this binary file' when module parsing fails for binary files", async () => {
		const folder = path.join(__dirname, "/fixtures");
		await expect(
			compile({
				mode: "development",
				entry: path.resolve(folder, "./font.ttf"),
				module: {}
			})
		).resolves.toMatchInlineSnapshot(`
					Object {
					  "errors": Array [
					    Object {
					      "loc": "1:0",
					      "message": "Module parse failed: Unexpected character ' ' (1:0)\\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\\n(Source code omitted for this binary file)",
					      "moduleId": "../font.ttf",
					      "moduleIdentifier": "<cwd>/test/fixtures/font.ttf",
					      "moduleName": "../font.ttf",
					      "moduleTrace": Array [],
					      "stack": "ModuleParseError: Module parse failed: Unexpected character ' ' (1:0)\\nYou may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders\\n(Source code omitted for this binary file)",
					    },
					  ],
					  "warnings": Array [],
					}
				`);
	});

	it("should throw error for invalid library name", async () => {
		await expect(
			compile({
				output: {
					libraryTarget: "var"
				}
			})
		).rejects.toMatchInlineSnapshot(`
					Object {
					  "message": "Library name must be a string or string array. Common configuration options that specific library names are 'output.library[.name]', 'entry.xyz.library[.name]', 'ModuleFederationPlugin.name' and 'ModuleFederationPlugin.library[.name]'.",
					  "stack": "Error: Library name must be a string or string array. Common configuration options that specific library names are 'output.library[.name]', 'entry.xyz.library[.name]', 'ModuleFederationPlugin.name' and 'ModuleFederationPlugin.library[.name]'.",
					}
				`);
	});
});
