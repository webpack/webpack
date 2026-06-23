"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const fs = require("graceful-fs");
const checkArrayExpectation = require("./checkArrayExpectation");
const {
	expectOnlyListedDeprecations
} = require("./helpers/expectNoDeprecations");

jest.setTimeout(60000);

/**
 * @param {string[]} appendErrors warn/error collector
 * @returns {EXPECTED_ANY} logger object
 */
const createLogger = (appendErrors) => ({
	log: () => {},
	debug: () => {},
	trace: () => {},
	info: () => {},
	// Every infrastructure warning/error must be declared in the example's
	// infrastructure-log.js or the build fails, so a filesystem-cache
	// store/restore failure can't slip through unnoticed.
	warn: (/** @type {string} */ l, /** @type {EXPECTED_ANY[]} */ ...args) => {
		appendErrors.push(l);
		console.warn(l, ...args);
	},
	error: (/** @type {string} */ l, /** @type {EXPECTED_ANY[]} */ ...args) => {
		appendErrors.push(l);
		console.error(l, ...args);
	},
	logTime: () => {},
	group: () => {},
	groupCollapsed: () => {},
	groupEnd: () => {},
	profile: () => {},
	profileEnd: () => {},
	clear: () => {},
	status: () => {}
});

const nodeVersion = Number.parseInt(process.version.slice(1).split(".")[0], 10);
// eslint-disable-next-line no-new-func
const dynamicImport = new Function("specifier", "return import(specifier)");

/**
 * @param {string} projectDir a project directory
 * @returns {Promise<EXPECTED_ANY | undefined>} webpack options
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

		if (nodeVersion < 18) {
			try {
				options = require(path);
				return options;
			} catch (_err) {
				// Nothing
			}

			return;
		}

		try {
			options = await dynamicImport(path);
			return options.default;
		} catch (_err) {
			try {
				options = require(path);
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

		describe(relativePath, () => {
			expectOnlyListedDeprecations(() => examplePath);

			it(`should compile ${relativePath}`, async () => {
				/** @type {string[]} */
				const infraStructureErrors = [];
				let options = await loadConfiguration(examplePath);

				if (!options) {
					// Skip ECMA modules examples
					return;
				}

				if (typeof options === "function") options = options();

				let usesFilesystemCache = false;

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
					// Only filesystem-cache examples have a persistent store that can
					// fail; capture infra logs so a store/restore failure (emitted
					// during the idle store on close) fails the build.
					if (
						options.cache &&
						typeof options.cache === "object" &&
						options.cache.type === "filesystem"
					) {
						usesFilesystemCache = true;
						options.infrastructureLogging = {
							...options.infrastructureLogging,
							debug: true,
							console: createLogger(infraStructureErrors)
						};
					}
				}

				const webpack = require("..");

				await /** @type {Promise<void>} */ (
					new Promise((resolve, reject) => {
						const compiler = webpack(options, (err, stats) => {
							if (err) {
								reject(err);
								return;
							}
							if (/** @type {import("../").Stats} */ (stats).hasErrors()) {
								reject(
									new Error(
										/** @type {import("../").Stats} */ (stats).toString(
											/** @type {import("../").StatsOptions} */ ({
												all: false,
												errors: true,
												errorDetails: true,
												errorStacks: true
											})
										)
									)
								);
								return;
							}

							// Examples without a persistent cache keep the original
							// behavior (no close — some, e.g. lazy-compilation, manage
							// their own server lifecycle).
							if (!usesFilesystemCache || !compiler) {
								resolve();
								return;
							}

							// Close to flush and await the filesystem cache store, then
							// fail if it logged a cache store/restore failure. close() is
							// best-effort here: cache store failures surface as logged
							// warnings, not as a close error (some examples, e.g.
							// lazy-compilation, error on close from their own backend).
							compiler.close(() => {
								if (infraStructureErrors.length) {
									/** @type {Error | undefined} */
									let expectationError;
									checkArrayExpectation(
										examplePath,
										{
											infrastructureLogs: infraStructureErrors.map(
												(message) => ({ message })
											)
										},
										"infrastructureLog",
										"infrastructure-log",
										"InfrastructureLog",
										options,
										(/** @type {Error=} */ err) => {
											expectationError = err;
										}
									);
									if (expectationError) {
										reject(expectationError);
										return;
									}
								}
								resolve();
							});
						});
					})
				);
			}, 90000);
		});
	}
});
