"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");

jest.setTimeout(60000);

// eslint-disable-next-line no-new-func
const dynamicImport = new Function("specifier", "return import(specifier)");

/**
 * @param {string} projectDir a project directory
 * @returns {EXPECTED_ANY} webpack options
 */
async function loadConfiguration(projectDir) {
	const paths = [
		path.join(projectDir, "webpack.config.js"),
		path.join(projectDir, "webpack.config.mjs"),
		path.join(projectDir, "webpack.config.cjs")
	];

	let options;

	for (const path of paths) {
		if (!fs.existsSync(path)) {
			continue;
		}

		try {
			options = await dynamicImport(path);
			return options.default;
		} catch (_err) {
			try {
				options = require(path);

				if (options.default) {
					options = options.default;
				}
			} catch (_err) {
				// Nothing
			}
		}
	}

	return options;
}

describe("Examples", () => {
	const basePath = path.join(__dirname, "..", "examples");

	const examples = require("../examples/examples");

	for (const examplePath of examples) {
		const filterPath = path.join(examplePath, "test.filter.js");
		const relativePath = path.relative(basePath, examplePath);
		if (fs.existsSync(filterPath) && !require(filterPath)()) {
			// eslint-disable-next-line jest/no-disabled-tests, jest/valid-describe-callback
			describe.skip(relativePath, () =>
				it("filtered", (done) => {
					done();
				})
			);

			continue;
		}

		it(`should compile ${relativePath}`, async () => {
			let options = await loadConfiguration(examplePath);

			if (!options) {
				// Skip ECMA modules examples
				return;
			}

			if (typeof options === "function") options = options();

			if (Array.isArray(options)) {
				for (const [_, item] of options.entries()) {
					processOptions(item);
				}
			} else {
				processOptions(options);
			}

			/**
			 * @param {import("../").Configuration} options options
			 */
			function processOptions(options) {
				options.context = examplePath;
				options.output = options.output || {};
				options.output.pathinfo = true;
				options.output.path = path.join(examplePath, "dist");
				options.output.publicPath = "dist/";
				if (!options.entry) options.entry = "./example.js";
				if (!options.plugins) options.plugins = [];
			}

			const webpack = require("..");

			await new Promise((resolve, reject) => {
				webpack(options, (err, stats) => {
					if (err) {
						reject(err);
						return;
					}
					if (stats.hasErrors()) {
						reject(
							new Error(
								stats.toString({
									all: false,
									errors: true,
									errorDetails: true,
									errorStacks: true
								})
							)
						);
						return;
					}

					resolve();
				});
			});
		}, 90000);
	}
});
