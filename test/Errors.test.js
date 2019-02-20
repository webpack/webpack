"use strict";

/*globals describe it */
const path = require("path");
const fs = require("fs");
const webpack = require("..");
const prettyFormat = require("pretty-format");

const CWD_PATTERN = new RegExp(process.cwd().replace(/\\/g, "/"), "gm");
const ERROR_STACK_PATTERN = /(?:\n\s+at\s.*)+/gm;

function cleanError(err) {
	const result = Object.getOwnPropertyNames(err).reduce((result, key) => {
		result[key] = err[key];
		return result;
	}, {});

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
		join: path.join.bind(path),
		mkdirp(dir, callback) {
			callback();
		},
		writeFile(file, content, callback) {
			callback();
		}
	}
};

async function compile(options) {
	const stats = await new Promise((resolve, reject) => {
		const compiler = webpack(Object.assign({}, defaults.options, options));
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
    },
    Object {
      "loc": "12:9-34",
      "message": "Module not found: Error: Can't resolve './dir/missing2' in '<cwd>/test/fixtures/errors'",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/missingFile.js",
      "moduleName": "./missingFile.js",
      "moduleTrace": Array [],
    },
  ],
  "warnings": Array [],
}
`);
});

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
      "loc": "1:0-20",
      "message": "require.main.require is not supported by webpack.",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/require.main.require.js",
      "moduleName": "./require.main.require.js",
      "moduleTrace": Array [],
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
      "loc": "1:0-21",
      "message": "module.parent.require is not supported by webpack.",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/module.parent.require.js",
      "moduleName": "./module.parent.require.js",
      "moduleTrace": Array [],
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
      "message": "configuration\\nThe 'mode' option has not been set, webpack will fallback to 'production' for this value. Set 'mode' option to 'development' or 'production' to enable defaults for each environment.\\nYou can also set it to 'none' to disable any default behavior. Learn more: https://webpack.js.org/concepts/mode/",
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
    },
    Object {
      "loc": "12:9-34",
      "message": "Module not found: Error: Can't resolve './dir/missing2' in '<cwd>/test/fixtures/errors'",
      "moduleId": 814,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/missingFile.js",
      "moduleName": "./missingFile.js",
      "moduleTrace": Array [],
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
      "message": "Module parse failed: Unexpected token (2:12)\\nYou may need an appropriate loader to handle this file type.\\n| window.foo = {\\n>   bar: true,;\\n| };\\n| ",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/has-syntax-error.js",
      "moduleName": "./has-syntax-error.js",
      "moduleTrace": Array [],
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
    },
  ],
  "warnings": Array [
    Object {
      "message": "Module Warning (from ./emit-error-loader.js):\\nthis is a warning",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/emit-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
      "moduleName": "./emit-error-loader.js!./entry-point.js",
      "moduleTrace": Array [],
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
      "message": "Module build failed (from (webpack)/node_modules/json-loader/index.js):\\nSyntaxError: Unexpected end of JSON input",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/node_modules/json-loader/index.js!<cwd>/test/fixtures/errors/not-a-json.js",
      "moduleName": "(webpack)/node_modules/json-loader!./not-a-json.js",
      "moduleTrace": Array [],
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
    },
    Object {
      "message": "Module Error (from ./irregular-error-loader.js):\\nError",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
      "moduleName": "./irregular-error-loader.js!./entry-point.js",
      "moduleTrace": Array [],
    },
    Object {
      "message": "Module build failed (from ./irregular-error-loader.js):\\nNonErrorEmittedError: (Emitted value instead of an instance of Error) a string error",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
      "moduleName": "./irregular-error-loader.js!./entry-point.js",
      "moduleTrace": Array [],
    },
  ],
  "warnings": Array [
    Object {
      "message": "Module Warning (from ./irregular-error-loader.js):\\n(Emitted value instead of an instance of Error) null",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
      "moduleName": "./irregular-error-loader.js!./entry-point.js",
      "moduleTrace": Array [],
    },
    Object {
      "message": "Module Warning (from ./irregular-error-loader.js):\\nError",
      "moduleId": 0,
      "moduleIdentifier": "<cwd>/test/fixtures/errors/irregular-error-loader.js!<cwd>/test/fixtures/errors/entry-point.js",
      "moduleName": "./irregular-error-loader.js!./entry-point.js",
      "moduleTrace": Array [],
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
    },
  ],
  "warnings": Array [],
}
`);
	});
});
