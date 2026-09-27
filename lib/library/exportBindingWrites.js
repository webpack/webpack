/*
	MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { ReplaceSource } = require("webpack-sources");
const JavascriptParser = require("../javascript/JavascriptParser");
const analyzeScope = require("../javascript/ScopeAnalyzer");
const RuntimeGlobals = require("../runtime/RuntimeGlobals");

/** @import { Identifier, Node, Pattern } from "estree" */
/** @import { Source } from "webpack-sources" */
/** @import { ModuleId } from "../graph/ChunkGraph" */
/** @import { Range } from "../javascript/JavascriptParser" */

/**
 * Instruments writes rather than their containing expression, preserving postfix
 * results and updates observed between destructuring assignments.
 * @param {Source} source generated module body
 * @param {Set<string>} names exported local bindings
 * @param {ModuleId | null} moduleId runtime module identifier
 * @returns {{ source: Source, bindings: Set<string> }} source and bindings with writes
 */
module.exports = (source, names, moduleId) => {
	const { ast } = JavascriptParser._parse(String(source.source()), {
		sourceType: "module",
		ranges: true,
		importPhases: true
	});
	const analysis = analyzeScope(ast, true);
	/** @type {Map<Identifier, string>} */
	const references = new Map();
	const remaining = new Set(names);
	const scopes = [analysis.moduleScope];
	for (const scope of scopes) {
		for (const name of remaining) {
			const variable = scope.getBinding(name);
			if (!variable) continue;
			remaining.delete(name);
			for (const reference of variable.references) {
				references.set(reference.identifier, name);
			}
		}
		if (remaining.size === 0) break;
		scopes.push(...scope.childScopes);
	}
	const result = new ReplaceSource(source);
	/** @type {Map<number, string[]>} */
	const endings = new Map();
	/**
	 * @param {number} position expression end
	 * @param {string} content closing source
	 * @returns {void}
	 */
	const insertEnd = (position, content) => {
		const existing = endings.get(position);
		// Nested expressions can end at the same byte; close the inner one first.
		if (existing) existing.unshift(content);
		else endings.set(position, [content]);
	};
	/** @type {Set<string>} */
	const bindings = new Set();
	/** @type {Set<Identifier>} */
	const written = new Set();
	/** @type {Set<Node>} */
	const named = new Set();
	/**
	 * @param {Pattern | import("estree").Expression} target assigned binding
	 * @param {import("estree").Expression} value assigned expression
	 * @returns {void}
	 */
	const preserveName = (target, value) => {
		if (
			target.type !== "Identifier" ||
			!references.has(target) ||
			named.has(value)
		) {
			return;
		}
		if (
			value.type !== "ArrowFunctionExpression" &&
			!(
				(value.type === "FunctionExpression" ||
					value.type === "ClassExpression") &&
				!value.id
			)
		) {
			return;
		}
		named.add(value);
		const range = /** @type {Range} */ (value.range);
		const key = JSON.stringify(target.name);
		result.insert(
			range[0],
			`({${target.name === "__proto__" ? `[${key}]` : key}: `
		);
		insertEnd(range[1], `})[${key}]`);
	};

	/**
	 * @param {import("estree").AssignmentExpression | import("estree").UpdateExpression} expression write expression
	 * @param {Pattern | import("estree").Expression} target written reference
	 * @param {boolean} postfix whether the result precedes the written value
	 * @returns {boolean} whether the write was handled
	 */
	const rewriteExpression = (expression, target, postfix) => {
		if (target.type !== "Identifier") return false;
		const name = references.get(target);
		if (name === undefined) return false;
		bindings.add(name);
		const range = /** @type {Range} */ (expression.range);
		// Simple writes need no accessor allocation. A postfix update publishes
		// its new value separately while returning the original expression result.
		result.insert(
			range[0],
			`${RuntimeGlobals.exportBinding}(${JSON.stringify(moduleId)}, ${JSON.stringify(name)}, `
		);
		insertEnd(range[1], postfix ? `, false, ${name})` : ")");
		return true;
	};

	/**
	 * @param {Pattern | import("estree").Expression} target assignment target
	 * @returns {void}
	 */
	const rewrite = (target) => {
		switch (target.type) {
			case "Identifier": {
				const name = references.get(target);
				if (name === undefined || written.has(target)) return;
				written.add(target);
				bindings.add(name);
				const value =
					name === "__webpack_value__"
						? "__webpack_value_1__"
						: "__webpack_value__";
				const range = /** @type {Range} */ (target.range);
				const shorthand = analysis.shorthandIdentifierStarts.has(range[0]);
				// A setter keeps the original lexical binding, including its TDZ and
				// const-assignment error, and notifies only after a successful write.
				result.replace(
					range[0],
					range[1] - 1,
					`${
						shorthand ? `${name}: ` : ""
					}({ get value() { return ${name}; }, set value(${value}) { ${name} = ${value}; ${
						RuntimeGlobals.exportBinding
					}(${JSON.stringify(moduleId)}, ${JSON.stringify(
						name
					)}, ${value}); } }).value`
				);
				return;
			}
			case "ArrayPattern":
				for (const element of target.elements) if (element) rewrite(element);
				return;
			case "ObjectPattern":
				for (const property of target.properties) {
					rewrite(
						property.type === "RestElement" ? property.argument : property.value
					);
				}
				return;
			case "AssignmentPattern":
				preserveName(target.left, target.right);
				rewrite(target.left);
				return;
			case "RestElement":
				rewrite(target.argument);
		}
	};

	/** @type {Node[]} */
	const nodes = [ast];
	for (const node of nodes) {
		if (node.type === "AssignmentExpression") {
			if (!rewriteExpression(node, node.left, false)) rewrite(node.left);
		} else if (node.type === "UpdateExpression") {
			rewriteExpression(node, node.argument, !node.prefix);
		} else if (
			(node.type === "ForOfStatement" || node.type === "ForInStatement") &&
			node.left.type !== "VariableDeclaration"
		) {
			rewrite(node.left);
		}
		for (const key of Object.keys(node)) {
			const child = /** @type {Record<string, unknown>} */ (
				/** @type {unknown} */ (node)
			)[key];
			if (Array.isArray(child)) {
				for (const item of child) {
					if (item && typeof item.type === "string") nodes.push(item);
				}
			} else if (child && typeof child === "object" && "type" in child) {
				nodes.push(/** @type {Node} */ (child));
			}
		}
	}
	for (const [position, content] of endings) {
		result.insert(position, content.join(""));
	}
	return { source: bindings.size ? result : source, bindings };
};
