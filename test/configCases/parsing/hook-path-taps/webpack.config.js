"use strict";

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @import JavascriptParser from "../../../../lib/javascript/JavascriptParser" */

const PLUGIN_NAME = "hook-path-taps";

/**
 * Taps one hook of each family with `{ path: true }` and checks the ids each
 * tap gets read as the nodes the walk passed.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const hookPathTaps = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			const { Field, NodeType } = compiler.webpack.javascript.syntax.parser;
			/** @type {Set<string>} */
			const seen = new Set();
			/** @type {JavascriptParser | undefined} */
			let lastParser;
			// a build restored from the cache parses nothing
			let parsedIndex = false;
			normalModuleFactory.hooks.parser
				.for("javascript/auto")
				.tap(PLUGIN_NAME, (moduleParser) => {
					const parser = /** @type {JavascriptParser} */ (moduleParser);
					lastParser = parser;
					// before the built-in taps, which bail on the hooks they handle
					const opts = {
						name: PLUGIN_NAME,
						path: /** @type {true} */ (true),
						stage: -100
					};
					parser.hooks.statement.tap(opts, (path, statement) => {
						expect(path.type(statement)).not.toBe(0);
						seen.add("statement");
					});
					// a tap without `path` on the same hook still gets the object
					parser.hooks.call.for("magicCall").tap(PLUGIN_NAME, (expr) => {
						expect(expr.type).toBe("CallExpression");
						seen.add("call object");
					});
					parser.hooks.call.for("magicCall").tap(opts, (path, call) => {
						expect(path.type(call)).toBe(NodeType.CallExpression);
						// a parse inside the tap has a view of its own, and this one's
						// ids read the same after it
						if (!seen.has("nested parse")) {
							seen.add("nested parse");
							parser.parse("1;", parser.state);
						}
						expect(path.type(call)).toBe(NodeType.CallExpression);
						const argument = path.field(0, Field.arguments, call);
						expect(path.value(argument)).toBe("hello");
						seen.add("call");
					});
					parser.hooks.evaluateIdentifier
						.for("magicCall")
						.tap(opts, (path, identifier) => {
							expect(path.name(identifier)).toBe("magicCall");
							seen.add("evaluateIdentifier");
						});
					parser.hooks.declarator.tap(opts, (path, declarator, statement) => {
						expect(path.type(declarator)).toBe(NodeType.VariableDeclarator);
						expect(path.type(statement)).toBe(NodeType.VariableDeclaration);
						seen.add("declarator");
					});
					parser.hooks.classBodyElement.tap(opts, (path, element, owner) => {
						expect(path.type(element)).toBe(NodeType.MethodDefinition);
						expect(path.type(owner)).toBe(NodeType.ClassDeclaration);
						seen.add("classBodyElement");
					});
					parser.hooks.importSpecifier.tap(
						opts,
						(path, statement, source, exportName, identifierName) => {
							expect(path.type(statement)).toBe(NodeType.ImportDeclaration);
							expect([source, exportName, identifierName]).toEqual([
								"./dep",
								"value",
								"value"
							]);
							seen.add("importSpecifier");
						}
					);
					// a node the walk passes none for, as an import no `.then` reads, is 0
					parser.hooks.importCall.tap(opts, (path, expr, then) => {
						expect(path.type(expr)).toBe(NodeType.ImportExpression);
						if (then === 0) {
							seen.add("importCall without then");
						} else {
							expect(path.type(then)).toBe(NodeType.CallExpression);
							seen.add("importCall");
						}
					});
					parser.hooks.finish.tap(opts, (path, program) => {
						expect(path.type(program)).toBe(NodeType.Program);
						if (/index\.js$/.test(parser.state.module.resource)) {
							parsedIndex = true;
						}
						seen.add("finish");
					});
				});
			compilation.hooks.finishModules.tap(PLUGIN_NAME, () => {
				if (!parsedIndex) return;
				expect([...seen].sort()).toEqual([
					"call",
					"call object",
					"classBodyElement",
					"declarator",
					"evaluateIdentifier",
					"finish",
					"importCall",
					"importCall without then",
					"importSpecifier",
					"nested parse",
					"statement"
				]);
				// called outside a parse, a path tap reads through a view of its own
				let name = "";
				const parser = /** @type {JavascriptParser} */ (lastParser);
				parser.hooks.evaluateIdentifier
					.for("outside")
					.tap({ name: PLUGIN_NAME, path: true }, (path, identifier) => {
						name = path.name(identifier);
					});
				parser.hooks.evaluateIdentifier.for("outside").call(
					/** @type {import("estree").Identifier} */ ({
						type: "Identifier",
						name: "outside",
						start: 0,
						end: 7
					})
				);
				expect(name).toBe("outside");
			});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [hookPathTaps]
};
