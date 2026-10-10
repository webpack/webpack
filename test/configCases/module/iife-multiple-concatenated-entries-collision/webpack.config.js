"use strict";

const JavascriptParser = require("../../../../lib/javascript/JavascriptParser");

/**
 * @param {number} expectedParses number of entries requiring scope analysis
 * @returns {import("../../../../").WebpackPluginInstance} counting plugin
 */
const createCountEntryParsesPlugin = (expectedParses) => ({
	apply(compiler) {
		compiler.hooks.compilation.tap("CountEntryParsesPlugin", (compilation) => {
			compilation.hooks.renderManifest.tap(
				{ name: "CountEntryParsesPlugin", stage: Infinity },
				(entries) => {
					for (const entry of entries) {
						const render = entry.render;
						entry.render = () => {
							const parse = JavascriptParser._parse;
							/** @type {string[]} */
							const parsedSources = [];
							JavascriptParser._parse = (source, ...args) => {
								parsedSources.push(source);
								return parse(source, ...args);
							};
							try {
								const source = render();
								expect({
									compiler: compiler.name,
									parses: parsedSources.length
								}).toEqual({
									compiler: compiler.name,
									parses: expectedParses
								});
								expect(
									parsedSources.some((code) =>
										code.includes("const shorthand = { value }")
									)
								).toBe(true);
								return source;
							} finally {
								JavascriptParser._parse = parse;
							}
						};
					}
					return entries;
				}
			);
		});
	}
});

/** @type {import("../../../../").Configuration} */
const base = {
	entry: ["./first.js", "./second.js"],
	output: {
		module: true
	},
	optimization: {
		concatenateModules: true
	},
	target: "es2020"
};

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		...base,
		name: "collide-true",
		output: { ...base.output, filename: "collide-true.mjs", pathinfo: false },
		optimization: { ...base.optimization, avoidEntryIife: true },
		plugins: [createCountEntryParsesPlugin(1)]
	},
	{
		...base,
		name: "collide-false",
		output: { ...base.output, filename: "collide-false.mjs" },
		optimization: { ...base.optimization, avoidEntryIife: false }
	},
	{
		...base,
		name: "collide-custom-parser",
		output: {
			...base.output,
			filename: "collide-custom-parser.mjs",
			pathinfo: false
		},
		optimization: { ...base.optimization, avoidEntryIife: true },
		module: {
			parser: { javascript: { parse: JavascriptParser._parse } }
		},
		plugins: [createCountEntryParsesPlugin(2)]
	},
	{
		...base,
		name: "collide-render-hook",
		output: {
			...base.output,
			filename: "collide-render-hook.mjs",
			pathinfo: false
		},
		optimization: { ...base.optimization, avoidEntryIife: true },
		plugins: [
			createCountEntryParsesPlugin(2),
			{
				apply(compiler) {
					compiler.hooks.compilation.tap(
						"InjectFreeNamePlugin",
						(compilation) => {
							const { JavascriptModulesPlugin } = compiler.webpack.javascript;
							JavascriptModulesPlugin.getCompilationHooks(
								compilation
							).renderModuleContent.tap(
								"InjectFreeNamePlugin",
								(source, module) =>
									module.identifier().includes("first.js")
										? new compiler.webpack.sources.ConcatSource(
												source,
												'\nit("preserves free names added by a render hook", () => { expect(typeof getSecond).toBe("undefined"); });\n'
											)
										: source
							);
						}
					);
				}
			}
		]
	},
	{
		...base,
		name: "collide-renamed-declaration",
		entry: ["./second.js", "./third.js"],
		output: {
			...base.output,
			filename: "collide-renamed-declaration.mjs",
			pathinfo: false
		},
		devtool: "source-map",
		optimization: { ...base.optimization, avoidEntryIife: true },
		plugins: [createCountEntryParsesPlugin(2)]
	},
	{
		name: "test-output",
		entry: "./test.js",
		output: {
			filename: "test.js"
		}
	}
];
