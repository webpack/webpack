"use strict";

require("./helpers/warmup-webpack");

const path = require("path");
const { createFsFromVolume, Volume } = require("memfs");
const { JAVASCRIPT_MODULE_TYPE_ESM } = require("../lib/ModuleTypeConstants");
const pluginName = "CompilerParserHooksTest";

describe("Compiler Parser Plugin", () => {
	function runWebpackWithEntry(entry, setupParser) {
		return new Promise((resolve, reject) => {
			const webpack = require("..");
			const compiler = webpack({
				context: path.join(__dirname, "fixtures"),
				entry: entry,
				output: {
					path: "/directory",
					filename: "bundle.js"
				},
				plugins: [
					{
						apply(compiler) {
							compiler.hooks.thisCompilation.tap(
								pluginName,
								(_, { normalModuleFactory }) => {
									normalModuleFactory.hooks.parser
										.for(JAVASCRIPT_MODULE_TYPE_ESM)
										.tap(pluginName, parser => {
											setupParser(parser);
										});
								}
							);
						}
					}
				]
			});
			compiler.outputFileSystem = createFsFromVolume(new Volume());
			compiler.run(err => {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	describe("top level symbol", () => {
		it("should trigger new hook for classes", async () => {
			let foundExpression;
			await runWebpackWithEntry("./top-level-symbols.mjs", parser => {
				parser.hooks.new.for("TopLevelClass").tap(pluginName, expr => {
					foundExpression = expr;
				});
			});
			expect(foundExpression).toBeTruthy();
			expect(foundExpression.type).toBe("NewExpression");
			expect(foundExpression.callee.type).toBe("Identifier");
			expect(foundExpression.callee.name).toBe("TopLevelClass");
		});

		it("should trigger call hooks for functions", async () => {
			let foundExpression;
			await runWebpackWithEntry("./top-level-symbols.mjs", parser => {
				parser.hooks.call.for("topLevelFunction").tap(pluginName, expr => {
					foundExpression = expr;
				});
			});
			expect(foundExpression).toBeTruthy();
			expect(foundExpression.type).toBe("CallExpression");
			expect(foundExpression.callee.type).toBe("Identifier");
			expect(foundExpression.callee.name).toBe("topLevelFunction");
		});
	});
});
