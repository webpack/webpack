/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Jack Works @Jack-Works
*/

"use strict";

const CommonJsRequireDependency = require("./CommonJsRequireDependency");

/** @typedef {import("estree").Program} ProgramNode */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */

/**
 * @param {ProgramNode} program Program node
 * @returns {string | null} result
 */
function getTopLevelDynamicRequireName(program) {
	let localBinding = "";
	outer: for (const node of program.body) {
		if (node.type === "ImportDeclaration" && node.source.value === "module") {
			for (const imported of node.specifiers) {
				if (
					imported.type === "ImportSpecifier" &&
					imported.imported.name === "createRequire"
				) {
					localBinding = imported.local.name;
					break outer;
				}
			}
		}
	}
	if (!localBinding) return null;
	for (const node of program.body) {
		if (node.type === "VariableDeclaration" && node.declarations.length === 1) {
			const decl = node.declarations[0];
			if (
				// var $matchThis = $localBinding$(import.meta.url)
				decl.id.type === "Identifier" &&
				decl.init &&
				decl.init.type === "CallExpression" &&
				decl.init.callee.type === "Identifier" &&
				decl.init.callee.name === localBinding &&
				decl.init.arguments.length === 1 &&
				decl.init.arguments[0].type === "MemberExpression" &&
				decl.init.arguments[0].object.type === "MetaProperty" &&
				decl.init.arguments[0].object.meta.name === "import" &&
				decl.init.arguments[0].object.property.name === "meta" &&
				decl.init.arguments[0].property.type === "Identifier" &&
				decl.init.arguments[0].property.name === "url"
			) {
				return decl.id.name;
			}
		}
	}
	return null;
}

module.exports = class HarmonyNode12CreateRequireDependencyParserPlugin {
	constructor(options) {}

	/**
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		/** @type {null | string} */
		let lexicalScopedRequireName = null;
		parser.hooks.program.tap("test", program => {
			lexicalScopedRequireName = getTopLevelDynamicRequireName(program);
		});

		parser.hooks.evaluate.for("CallExpression").tap("test", call => {
			if (!lexicalScopedRequireName) return;
			if (call.type !== "CallExpression") return;
			if (call.callee.type !== "Identifier") return;
			if (call.callee.name !== lexicalScopedRequireName) return;
			const item = parser.scope.definitions.get(lexicalScopedRequireName);
			if (!item || !item.topLevelScope) return;

			const arg0 = call.arguments[0];
			const dep = new CommonJsRequireDependency("./cjs.cjs", arg0.range);
			dep.loc = arg0.loc;
			dep.optional = !!parser.scope.inTry;
			parser.state.current.addDependency(dep);
		});
	}
};
