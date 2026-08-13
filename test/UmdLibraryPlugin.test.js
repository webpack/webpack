"use strict";

const path = require("path");
const vm = require("vm");
const fs = require("graceful-fs");
const webpack = require("..");

const outputDir = path.join(__dirname, "js", "UmdLibraryPlugin");

/**
 * Compiles a UMD bundle from an inline entry and returns the output source.
 * @param {import("../").Configuration} config webpack configuration
 * @returns {Promise<string>} emitted bundle source
 */
const compile = (config) =>
	new Promise((resolve, reject) => {
		const compiler = webpack(config);
		compiler.run((err, stats) => {
			if (err) return reject(err);
			if (stats && stats.hasErrors()) {
				return reject(new Error(stats.toString()));
			}
			const outputFile = path.join(
				/** @type {string} */ (config.output && config.output.path),
				/** @type {string} */ (
					(config.output && config.output.filename) || "main.js"
				)
			);
			resolve(fs.readFileSync(outputFile, "utf8"));
		});
	});

const baseConfig = (name, extra = {}) => ({
	mode: "none",
	entry: path.join(__dirname, "fixtures", "umd-sap-entry.js"),
	output: {
		path: path.join(outputDir, name),
		filename: "bundle.js",
		library: {
			name: "MyLib",
			type: "umd"
		}
	},
	...extra
});

describe("UmdLibraryPlugin — sap.ui.define branch", () => {
	beforeAll(() => {
		fs.mkdirSync(outputDir, { recursive: true });
	});

	it("emits sap.ui.define branch in generated wrapper", async () => {
		const src = await compile(baseConfig("basic"));
		expect(src).toContain(
			"typeof sap !== 'undefined' && sap.ui && typeof sap.ui.define === 'function'"
		);
		expect(src).toContain("sap.ui.define(");
	});

	it("places sap.ui.define check after define.amd and before exports check", async () => {
		const src = await compile(baseConfig("ordering"));
		const amdPos = src.indexOf("define.amd");
		const sapPos = src.indexOf("sap.ui.define");
		const exportsPos = src.indexOf("typeof exports === 'object'", sapPos + 1);
		expect(amdPos).toBeLessThan(sapPos);
		expect(sapPos).toBeLessThan(exportsPos);
	});

	it("uses named define with sap.ui.define when namedDefine and library name set", async () => {
		const src = await compile(
			baseConfig("named-define", {
				output: {
					path: path.join(outputDir, "named-define"),
					filename: "bundle.js",
					library: {
						name: "MyLib",
						type: "umd",
						umdNamedDefine: true
					}
				}
			})
		);
		expect(src).toContain('sap.ui.define("MyLib"');
	});

	it("uses anonymous sap.ui.define when namedDefine is not set", async () => {
		const src = await compile(baseConfig("anon-define"));
		expect(src).toContain("sap.ui.define([],");
		expect(src).not.toContain('sap.ui.define("MyLib"');
	});

	it("includes auxiliaryComment for sapUiDefine section", async () => {
		const src = await compile(
			baseConfig("auxiliary-comment", {
				output: {
					path: path.join(outputDir, "auxiliary-comment"),
					filename: "bundle.js",
					library: {
						name: "MyLib",
						type: "umd",
						auxiliaryComment: {
							sapUiDefine: "sap.ui.define loader"
						}
					}
				}
			})
		);
		expect(src).toContain("//sap.ui.define loader");
	});

	it("executes via sap.ui.define at runtime and returns the correct export", async () => {
		const src = await compile(baseConfig("runtime-sap"));
		const registeredModules = /** @type {Record<string, unknown>} */ ({});
		const context = {
			module: undefined,
			exports: undefined,
			define: undefined,
			sap: {
				ui: {
					/**
					 * @param {string | string[]} _nameOrDeps module name or deps array
					 * @param {((...args: unknown[]) => unknown) | unknown[]} depsOrFactory deps array or factory
					 * @param {((...args: unknown[]) => unknown)=} maybeFactory factory when name provided
					 */
					define(_nameOrDeps, depsOrFactory, maybeFactory) {
						const factory =
							typeof maybeFactory === "function"
								? maybeFactory
								: /** @type {(...args: unknown[]) => unknown} */ (
										depsOrFactory
									);
						registeredModules.default = factory();
					}
				}
			}
		};
		vm.runInNewContext(src, context);
		expect(registeredModules.default).toEqual({ value: 42 });
		expect(context.module).toBeUndefined();
	});

	it("falls back to global when sap.ui.define is absent", async () => {
		const src = await compile(baseConfig("runtime-global"));
		const context = /** @type {Record<string, unknown>} */ ({
			module: undefined,
			exports: undefined,
			define: undefined,
			sap: undefined
		});
		vm.runInNewContext(src, context);
		expect(context.MyLib).toEqual({ value: 42 });
	});

	it("sap.ui.define branch is skipped when sap is undefined", async () => {
		const src = await compile(baseConfig("runtime-no-sap"));
		let sapDefineCalled = false;
		const context = /** @type {Record<string, unknown>} */ ({
			module: undefined,
			exports: undefined,
			define: undefined,
			sap: {
				ui: {
					/**
					 * @param {...unknown} _args unused args
					 */
					define(..._args) {
						sapDefineCalled = true;
					}
				},
				// sap.ui.define is not a function — guard should reject it
				notAFunction: true
			}
		});
		// Override so the guard `typeof sap.ui.define === 'function'` is false
		context.sap = /** @type {unknown} */ ({ ui: { define: "not-a-function" } });
		vm.runInNewContext(src, context);
		expect(sapDefineCalled).toBe(false);
		expect(context.MyLib).toEqual({ value: 42 });
	});
});
