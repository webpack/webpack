/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Sebastian Beltran @bjohansebas
*/

"use strict";

const CompatibilityPlugin = require("../../javascript/CompatibilityPlugin");
const ESMExportBindingDependency = require("./ESMExportBindingDependency");
const { harmonySpecifierTag } = require("./ESMImportDependencyParserPlugin");

/** @import JavascriptParser, { Range, WriteStatement } from "../../javascript/JavascriptParser" */
/** @import { Expression, Pattern, AssignmentExpression, Node } from "estree" */
/** @import { BindingWrite } from "./ESMExportBindingDependency" */

const PLUGIN_NAME = "ESMExportBindingParserPlugin";
const bindingTag = Symbol(PLUGIN_NAME);

class ESMExportBindingParserPlugin {
	/**
	 * @param {JavascriptParser} parser parser
	 * @returns {void}
	 */
	apply(parser) {
		/** @type {ESMExportBindingDependency | undefined} */
		let dependency;
		/** @type {WeakSet<Node>} */
		let seen;
		parser.hooks.program.tap(PLUGIN_NAME, () => {
			dependency = undefined;
			seen = new WeakSet();
		});
		/**
		 * @param {string} id local name
		 * @param {string} name export name
		 * @returns {void}
		 */
		const tag = (id, name) => {
			if (parser.getTagData(id, harmonySpecifierTag)) return;
			const names = /** @type {string[] | undefined} */ (
				parser.getTagData(id, bindingTag)
			);
			if (names) names.push(name);
			else parser.tagVariable(id, bindingTag, [name]);
		};
		parser.hooks.exportSpecifier.tap(
			{ name: PLUGIN_NAME, stage: -100 },
			(_statement, id, name) => {
				tag(id, name);
			}
		);
		parser.hooks.exportExpression.tap(
			{ name: PLUGIN_NAME, stage: -100 },
			(_statement, expression) => {
				if (
					(expression.type === "FunctionDeclaration" ||
						expression.type === "ClassDeclaration") &&
					expression.id
				) {
					tag(expression.id.name, "default");
				}
			}
		);
		/**
		 * @param {BindingWrite} write write
		 * @returns {void}
		 */
		const add = (write) => {
			const renamed =
				/** @type {import("../../javascript/CompatibilityPlugin").CompatibilitySettings | undefined} */ (
					parser.getTagData(
						write.id,
						CompatibilityPlugin.nestedWebpackIdentifierTag
					)
				);
			if (renamed) {
				write.originalName = write.id;
				write.id = renamed.name;
			}
			if (!dependency) {
				dependency = new ESMExportBindingDependency([]);
				parser.state.module.addDependency(dependency);
			}
			dependency.writes.push(write);
		};
		/**
		 * @param {Pattern | Expression} target target
		 * @param {boolean=} shorthand shorthand
		 * @param {Range=} defaultRange anonymous default
		 * @returns {void}
		 */
		const pattern = (target, shorthand = false, defaultRange = undefined) => {
			switch (target.type) {
				case "Identifier": {
					const names = /** @type {string[] | undefined} */ (
						parser.getTagData(target.name, bindingTag)
					);
					if (names) {
						add({
							id: target.name,
							names,
							range: /** @type {Range} */ (target.range),
							kind: "pattern",
							shorthand,
							defaultRange
						});
					}
					break;
				}
				case "ArrayPattern":
					for (const element of target.elements) if (element) pattern(element);
					break;
				case "ObjectPattern":
					for (const property of target.properties) {
						if (property.type === "RestElement") pattern(property.argument);
						else pattern(property.value, property.shorthand);
					}
					break;
				case "RestElement":
					pattern(target.argument);
					break;
				case "AssignmentPattern": {
					const value = target.right;
					const anonymous =
						value.type === "ArrowFunctionExpression" ||
						((value.type === "FunctionExpression" ||
							value.type === "ClassExpression") &&
							!value.id);
					pattern(
						target.left,
						shorthand,
						anonymous ? /** @type {Range} */ (value.range) : undefined
					);
					break;
				}
			}
		};
		/**
		 * @param {AssignmentExpression | WriteStatement} expression write
		 * @returns {void}
		 */
		const record = (expression) => {
			if (seen.has(expression)) return;
			seen.add(expression);
			const target =
				expression.type === "UpdateExpression"
					? expression.argument
					: expression.left;
			if (target.type === "VariableDeclaration") return;
			if (
				target.type === "Identifier" &&
				(expression.type === "AssignmentExpression" ||
					expression.type === "UpdateExpression")
			) {
				const names = /** @type {string[] | undefined} */ (
					parser.getTagData(target.name, bindingTag)
				);
				if (names) {
					add({
						id: target.name,
						names,
						range: /** @type {Range} */ (expression.range),
						kind:
							expression.type === "UpdateExpression" && !expression.prefix
								? "postfix"
								: "expression",
						shorthand: false
					});
				}
			} else {
				pattern(target);
			}
		};
		parser.hooks.finish.tap(PLUGIN_NAME, () => {
			if (dependency) dependency.writes.sort((a, b) => a.range[0] - b.range[0]);
		});
		parser.hooks.assignment.tap(PLUGIN_NAME, record);
		parser.hooks.assign.for(bindingTag).tap(PLUGIN_NAME, (expression) => {
			// A destructuring write must not redefine an outer binding in this scope.
			if (expression.left.type.endsWith("Pattern")) return true;
		});
		parser.hooks.write.for(bindingTag).tap(PLUGIN_NAME, (expression) => {
			record(expression);
		});
	}
}

module.exports = ESMExportBindingParserPlugin;
