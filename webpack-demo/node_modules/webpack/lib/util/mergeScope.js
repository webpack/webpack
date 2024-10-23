/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("eslint-scope").Reference} Reference */
/** @typedef {import("eslint-scope").Variable} Variable */
/** @typedef {import("../javascript/JavascriptParser").AnyNode} AnyNode */
/** @typedef {import("../javascript/JavascriptParser").Program} Program */

/**
 * @param {Variable} variable variable
 * @returns {Reference[]} references
 */
const getAllReferences = variable => {
	let set = variable.references;
	// Look for inner scope variables too (like in class Foo { t() { Foo } })
	const identifiers = new Set(variable.identifiers);
	for (const scope of variable.scope.childScopes) {
		for (const innerVar of scope.variables) {
			if (innerVar.identifiers.some(id => identifiers.has(id))) {
				set = set.concat(innerVar.references);
				break;
			}
		}
	}
	return set;
};

/**
 * @param {Program | Program[]} ast ast
 * @param {AnyNode} node node
 * @returns {undefined | AnyNode[]} result
 */
const getPathInAst = (ast, node) => {
	if (ast === node) {
		return [];
	}

	const nr = node.range;

	const enterNode = n => {
		if (!n) return;
		const r = n.range;
		if (r && r[0] <= nr[0] && r[1] >= nr[1]) {
			const path = getPathInAst(n, node);
			if (path) {
				path.push(n);
				return path;
			}
		}
	};

	if (Array.isArray(ast)) {
		for (let i = 0; i < ast.length; i++) {
			const enterResult = enterNode(ast[i]);
			if (enterResult !== undefined) return enterResult;
		}
	} else if (ast && typeof ast === "object") {
		const keys = Object.keys(ast);
		for (let i = 0; i < keys.length; i++) {
			const value = ast[keys[i]];
			if (Array.isArray(value)) {
				const pathResult = getPathInAst(value, node);
				if (pathResult !== undefined) return pathResult;
			} else if (value && typeof value === "object") {
				const enterResult = enterNode(value);
				if (enterResult !== undefined) return enterResult;
			}
		}
	}
};

module.exports = { getAllReferences, getPathInAst };
