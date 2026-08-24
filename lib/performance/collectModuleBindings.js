/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

/** @import { Node, Program } from "estree" */

/**
 * @typedef {object} ModuleBindings
 * @property {Map<string, string[]>} declared every binding by name, each with the kind that made it
 * @property {Set<string>} assigned names written to by an assignment or an update
 * @property {Set<string>} namespaces names bound by `import * as`
 * @property {Set<string>} called names used as the callee of a call
 */

/**
 * Reads what a module binds and what it does with those names, in one pass.
 * Callers pair it with `isSoleBinding`: a name declared once cannot be
 * shadowed, so every mention of it is that binding and no scope analysis is
 * needed to say so.
 * @param {Program} ast the program
 * @returns {ModuleBindings} what it binds and does
 */
const collectModuleBindings = (ast) => {
	/** @type {Map<string, string[]>} */
	const declared = new Map();
	/** @type {Set<string>} */
	const assigned = new Set();
	/** @type {Set<string>} */
	const namespaces = new Set();
	/** @type {Set<string>} */
	const called = new Set();

	/**
	 * @param {EXPECTED_ANY} node an identifier, or nothing
	 * @param {string} kind what bound it
	 * @returns {void}
	 */
	const declare = (node, kind) => {
		if (!node || node.type !== "Identifier") return;

		const kinds = declared.get(node.name);

		if (kinds) {
			kinds.push(kind);
		} else {
			declared.set(node.name, [kind]);
		}
	};

	/**
	 * @param {EXPECTED_ANY} node a binding pattern, or nothing
	 * @param {string} kind what bound it
	 * @returns {void}
	 */
	const declarePattern = (node, kind) => {
		if (!node || typeof node !== "object") return;

		switch (node.type) {
			case "Identifier":
				declare(node, kind);
				break;
			case "ObjectPattern":
				for (const property of node.properties) {
					declarePattern(
						property.type === "RestElement"
							? property.argument
							: property.value,
						kind
					);
				}
				break;
			case "ArrayPattern":
				for (const element of node.elements) declarePattern(element, kind);
				break;
			case "AssignmentPattern":
				declarePattern(node.left, kind);
				break;
			case "RestElement":
				declarePattern(node.argument, kind);
				break;
			default:
		}
	};

	/** @type {EXPECTED_ANY[]} */
	const queue = [ast];

	while (queue.length > 0) {
		const node = queue.pop();

		if (!node || typeof node !== "object") continue;

		if (Array.isArray(node)) {
			for (const item of node) queue.push(item);
			continue;
		}

		switch (node.type) {
			case "VariableDeclaration":
				for (const declarator of node.declarations) {
					declarePattern(declarator.id, node.kind);
				}
				break;
			case "FunctionDeclaration":
			case "ClassDeclaration":
				declare(node.id, "declaration");
				break;
			case "ImportNamespaceSpecifier":
				declare(node.local, "import");
				namespaces.add(node.local.name);
				break;
			case "ImportDefaultSpecifier":
			case "ImportSpecifier":
				declare(node.local, "import");
				break;
			case "CatchClause":
				declarePattern(node.param, "catch");
				break;
			case "AssignmentExpression":
				if (node.left.type === "Identifier") assigned.add(node.left.name);
				break;
			case "UpdateExpression":
				if (node.argument.type === "Identifier") {
					assigned.add(node.argument.name);
				}
				break;
			case "CallExpression":
				if (node.callee.type === "Identifier") called.add(node.callee.name);
				break;
			default:
		}

		if (node.params) {
			for (const param of node.params) declarePattern(param, "param");
		}

		for (const key of Object.keys(node)) {
			if (key !== "range" && key !== "loc") queue.push(node[key]);
		}
	}

	return { declared, assigned, namespaces, called };
};

/**
 * Whether the name has exactly one binding in the module, so every mention of
 * it is that one.
 * @param {ModuleBindings} bindings what the module binds
 * @param {string} name the name in question
 * @returns {boolean} true when nothing can shadow it
 */
const isSoleBinding = (bindings, name) => {
	const kinds = bindings.declared.get(name);

	return kinds !== undefined && kinds.length === 1;
};

module.exports.collectModuleBindings = collectModuleBindings;
module.exports.isSoleBinding = isSoleBinding;
