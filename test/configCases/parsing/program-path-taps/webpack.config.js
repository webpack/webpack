"use strict";

const acorn = require("acorn");

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @typedef {import("../../../../lib/module/NormalModule")} NormalModule */
/** @import JavascriptParser, { ParseOptions, ParseResult } from "../../../../lib/javascript/JavascriptParser" */

const PLUGIN_NAME = "program-path-taps";

/**
 * Taps `program` with `{ path: true }` next to a tap without it, and checks
 * what the built-in taps recorded on each module.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const programPathTaps = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			const { Field, NodeType, Part } =
				compiler.webpack.javascript.syntax.parser;
			/** @type {Set<string>} */
			const walked = new Set();
			for (const type of [
				"javascript/auto",
				"javascript/esm",
				"javascript/dynamic"
			]) {
				normalModuleFactory.hooks.parser
					.for(type)
					.tap(PLUGIN_NAME, (moduleParser) => {
						const parser = /** @type {JavascriptParser} */ (moduleParser);
						// another parse, started before the path taps read the program
						parser.hooks.program.tap(
							{ name: PLUGIN_NAME, stage: -100 },
							(ast) => {
								expect(ast.type).toBe("Program");
								parser.evaluate("1 + 1");
							}
						);
						parser.hooks.program.tap(
							{ name: PLUGIN_NAME, path: true },
							(path, program, comments) => {
								expect(path.type(program)).toBe(NodeType.Program);
								expect(Array.isArray(comments)).toBe(true);
								const { resource } = /** @type {NormalModule} */ (
									parser.state.module
								);
								if (/(strict-cjs|custom)\.js$/.test(resource)) {
									// `custom.js` comes from a parse marking no directive
									const first = path.field(0, Field.body, program);
									expect(path.textOf(Part.directive, first)).toBe("use strict");
									expect(path.range(first)).toEqual([
										path.start(first),
										path.end(first)
									]);
								}
								walked.add(resource);
							}
						);
					});
			}
			compilation.hooks.succeedModule.tap(PLUGIN_NAME, (module) => {
				const { resource } = /** @type {NormalModule} */ (module);
				if (!/\.js$/.test(resource)) return;
				expect(walked.has(resource)).toBe(true);
				const buildInfo = /** @type {NonNullable<typeof module.buildInfo>} */ (
					module.buildInfo
				);
				const buildMeta = /** @type {NonNullable<typeof module.buildMeta>} */ (
					module.buildMeta
				);
				if (resource.endsWith("esm.js")) {
					expect(buildMeta.exportsType).toBe("namespace");
				}
				if (/(strict-cjs|custom)\.js$/.test(resource)) {
					expect(buildInfo.strict).toBe(true);
				}
				if (resource.endsWith("using.js")) {
					expect(buildInfo.moduleConcatenationBailout).toBe(
						"a top-level using declaration"
					);
					let usesTopLevelUsingDeclaration = false;
					for (const dependency of /** @type {NonNullable<typeof module.presentationalDependencies>} */ (
						module.presentationalDependencies
					)) {
						if (dependency.is("esm-compatibility")) {
							usesTopLevelUsingDeclaration =
								dependency.usesTopLevelUsingDeclaration;
						}
					}
					expect(usesTopLevelUsingDeclaration).toBe(true);
				}
			});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		using: "./using.js"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [programPathTaps],
	module: {
		rules: [
			{
				test: /custom\.js$/,
				parser: {
					/**
					 * A program another parser read, marking no directive, which the
					 * path taps read as `getDirective` recovers it.
					 * @param {string} code source code
					 * @param {ParseOptions} options parse options
					 * @returns {ParseResult} parse result
					 */
					parse: (code, options) => {
						const ast = acorn.parse(code, {
							sourceType: options.sourceType,
							ecmaVersion: "latest",
							ranges: true
						});
						for (const statement of ast.body) {
							if (statement.type === "ExpressionStatement") {
								statement.directive = undefined;
							}
						}
						return {
							ast: /** @type {ParseResult["ast"]} */ (ast),
							comments: []
						};
					}
				}
			}
		]
	},
	optimization: {
		minimize: false
	}
};
