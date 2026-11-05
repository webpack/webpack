/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../../errors/WebpackError");
const CompatibilityPlugin = require("../../javascript/CompatibilityPlugin");
const { getImportAttributes } = require("../../javascript/JavascriptParser");
const { CONST_BINDING_TAG } = require("../../optimize/ConstExportsPlugin");
const { toInlinedValue } = require("../../optimize/InlineExports");
const { getInnerGraphUtils } = require("../../optimize/InnerGraph");
const memoize = require("../../util/memoize");
const ConstDependency = require("../core/ConstDependency");
const {
	ImportPhase,
	ImportPhaseUtils,
	createGetImportPhase
} = require("../core/ImportPhase");
const ESMExportExpressionDependency = require("./ESMExportExpressionDependency");
const ESMExportHeaderDependency = require("./ESMExportHeaderDependency");
const ESMExportImportedSideEffectDependency = require("./ESMExportImportedSideEffectDependency");
const ESMExportImportedSpecifierDependency = require("./ESMExportImportedSpecifierDependency");
const ESMExportSpecifierDependency = require("./ESMExportSpecifierDependency");
const { ExportPresenceModes } = require("./ESMImportDependency");
const { harmonySpecifierTag } = require("./ESMImportDependencyParserPlugin");

const getSyntaxParser = memoize(
	() => require("../../javascript/syntax").parser
);

/**
 * @import {
 * 	ClassDeclaration,
 * 	ExportAllDeclaration,
 * 	ExportNamedDeclaration,
 * 	FunctionDeclaration
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import JavascriptParser, { ImportAttributes, Range } from "../../javascript/JavascriptParser" */
/** @import { ESMSettings } from "./ESMImportDependencyParserPlugin" */
/** @import { JavascriptNodeReader } from "../../javascript/syntax" */
/** @import { ImportPhaseType } from "../core/ImportPhase" */

const { ESMStarExportsList } = ESMExportImportedSpecifierDependency;

const PLUGIN_NAME = "ESMExportDependencyParserPlugin";

module.exports = class ESMExportDependencyParserPlugin {
	/**
	 * Creates an instance of ESMExportDependencyParserPlugin.
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		/** @type {JavascriptParserOptions} */
		this.options = options;
		this.exportPresenceMode = ExportPresenceModes.resolveFromOptions(
			options.reexportExportsPresence,
			options
		);
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const { exportPresenceMode } = this;
		const getImportPhase = createGetImportPhase(
			this.options.deferImport,
			false
		);
		const deferImport = Boolean(this.options.deferImport);
		/**
		 * The phase of a re-export read through the path: its object is made
		 * only when a deferred phase could apply.
		 * @param {JavascriptNodeReader} path the path
		 * @param {number} statement the re-export
		 * @returns {ImportPhaseType} the phase
		 */
		const phaseOf = (path, statement) =>
			deferImport
				? getImportPhase(
						parser,
						/** @type {ExportNamedDeclaration | ExportAllDeclaration} */ (
							path.object(statement)
						)
					)
				: ImportPhase.Evaluation;
		/**
		 * The attributes of a re-export read through the path.
		 * @param {JavascriptNodeReader} path the path
		 * @param {number} statement the re-export
		 * @returns {ImportAttributes | undefined} its attributes, if it has any
		 */
		const attributesOf = (path, statement) =>
			path.fieldCount(getSyntaxParser().Field.attributes, statement) === 0
				? undefined
				: getImportAttributes(
						/** @type {ExportNamedDeclaration | ExportAllDeclaration} */ (
							path.object(statement)
						)
					);

		parser.hooks.export.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement) => {
				const declaration = path.field(
					0,
					getSyntaxParser().Field.declaration,
					statement
				);
				const start = path.start(statement);
				const end = path.end(statement);
				const dep = new ESMExportHeaderDependency(
					declaration === 0
						? undefined
						: [path.start(declaration), path.end(declaration)],
					[start, end]
				);
				dep.setLocWithIndex(parser.getLocation({ start, end }), -1);
				parser.state.module.addPresentationalDependency(dep);
				return true;
			}
		);
		parser.hooks.exportImport.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement, source) => {
				parser.state.lastESMImportOrder =
					(parser.state.lastESMImportOrder || 0) + 1;
				const start = path.start(statement);
				const end = path.end(statement);
				const loc = parser.getLocation({ start, end });
				const clearDep = new ConstDependency("", [start, end]);
				clearDep.setLocWithIndex(loc, -1);
				parser.state.module.addPresentationalDependency(clearDep);

				const phase = phaseOf(path, statement);
				if (phase && ImportPhaseUtils.isDefer(phase)) {
					const error = new WebpackError(
						"Deferred re-export (`export defer * as namespace from '...'`) is not a part of the Import Defer proposal.\nUse the following code instead:\n    import defer * as namespace from '...';\n    export { namespace };"
					);
					error.loc = loc;
					parser.state.current.addError(error);
				}
				const sideEffectDep = new ESMExportImportedSideEffectDependency(
					/** @type {string} */ (source),
					parser.state.lastESMImportOrder,
					phase,
					attributesOf(path, statement)
				);
				sideEffectDep.setLocWithIndex(loc, -1);
				parser.state.current.addDependency(sideEffectDep);
				return true;
			}
		);
		// `export default <namespace binding>` is the same export as
		// `export { ns as default }`, so it becomes the same re-export. Stage -10
		// beats the inner-graph tap, whose guard would outlive the removed statement.
		parser.hooks.statement.tap(
			{ name: PLUGIN_NAME, stage: -10, path: true },
			(path, statement) => {
				const { Field, NodeType } = getSyntaxParser();
				if (path.type(statement) !== NodeType.ExportDefaultDeclaration) return;
				const declaration = path.field(0, Field.declaration, statement);
				if (path.type(declaration) !== NodeType.Identifier) return;
				const name = path.name(declaration);
				const settings =
					/** @type {ESMSettings | undefined} */
					(parser.getTagData(name, harmonySpecifierTag));
				if (!settings || settings.ids.length !== 0) return;
				settings.used = true;
				if (ImportPhaseUtils.isDefer(settings.phase)) return;
				const esmNamedExports = (parser.state.esmNamedExports =
					parser.state.esmNamedExports || new Set());
				esmNamedExports.add("default");
				getInnerGraphUtils(parser.state.compilation).addVariableUsage(
					parser,
					name,
					"default"
				);
				const dep = new ESMExportImportedSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.ids,
					"default",
					esmNamedExports,
					null,
					exportPresenceMode,
					null,
					settings.phase,
					settings.attributes
				);

				/** @type {Range} */
				const range = [path.start(statement), path.end(statement)];
				const loc = parser.getLocation({ range });
				dep.setLocWithIndex(loc, -1);
				parser.state.current.addDependency(dep);

				// no range erases the whole statement, as for `export { ns as default }`
				const headerDep = new ESMExportHeaderDependency(undefined, range);
				headerDep.setLocWithIndex(loc, -1);
				parser.state.module.addPresentationalDependency(headerDep);
				return true;
			}
		);
		parser.hooks.exportExpression.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement, node) => {
				const { Field, Flag, NodeType } = getSyntaxParser();
				const type = path.type(node);
				const isFunctionDeclaration = type === NodeType.FunctionDeclaration;
				const isDeclaration =
					isFunctionDeclaration || type === NodeType.ClassDeclaration;
				const name =
					isDeclaration ||
					type === NodeType.FunctionExpression ||
					type === NodeType.ClassExpression
						? path.field(0, Field.id, node)
						: 0;
				/** @type {Range} */
				const exprRange = [path.start(node), path.end(node)];
				/** @type {Range} */
				const statementRange = [path.start(statement), path.end(statement)];
				const comments = parser.getComments([statementRange[0], exprRange[0]]);
				const constValue = isDeclaration
					? undefined
					: toInlinedValue(parser.evaluateExpression(node));
				/** @type {string | { range: Range, prefix: string, suffix: string } | undefined} */
				let declarationName;
				if (isDeclaration && name !== 0) {
					declarationName = path.name(name);
				} else if (isFunctionDeclaration) {
					const params = path.fieldCount(Field.params, node);
					declarationName = {
						range: [
							exprRange[0],
							params > 0
								? path.start(path.field(0, Field.params, node))
								: path.start(path.field(0, Field.body, node))
						],
						prefix: `${path.flag(Flag.async, node) ? "async " : ""}function${
							path.flag(Flag.generator, node) ? "*" : ""
						} `,
						suffix: `(${params > 0 ? "" : ") "}`
					};
				}
				const dep = new ESMExportExpressionDependency(
					exprRange,
					statementRange,
					comments
						.map((c) => {
							switch (c.type) {
								case "Block":
									return `/*${c.value}*/`;
								case "Line":
									return `//${c.value}\n`;
							}
							return "";
						})
						.join(""),
					declarationName,
					constValue
				);
				const isAnonymousClass =
					(type === NodeType.ClassDeclaration ||
						type === NodeType.ClassExpression) &&
					name === 0;
				dep.isAnonymousDefault =
					this.options.anonymousDefaultExportName !== false &&
					(type === NodeType.ArrowFunctionExpression ||
						isAnonymousClass ||
						((type === NodeType.FunctionDeclaration ||
							type === NodeType.FunctionExpression) &&
							name === 0));
				// A class observes its own name from a static initializer, which runs
				// before the name could be patched afterwards, so it is named in place.
				dep.isAnonymousDefaultClass =
					dep.isAnonymousDefault && isAnonymousClass;
				dep.setLocWithIndex(
					parser.getLocation({
						start: statementRange[0],
						end: statementRange[1]
					}),
					-1
				);
				parser.state.current.addDependency(dep);
				getInnerGraphUtils(parser.state.compilation).addVariableUsage(
					parser,
					isDeclaration && name !== 0 ? path.name(name) : "*default*",
					"default"
				);
				return true;
			}
		);
		parser.hooks.exportSpecifier.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement, id, name, idx) => {
				// CompatibilityPlugin may change exports name
				// not handle re-export or import then export situation as current CompatibilityPlugin only
				// rename symbol in declaration module, not change exported symbol
				const variable = parser.getTagData(
					id,
					CompatibilityPlugin.nestedWebpackIdentifierTag
				);
				if (variable && variable.name) {
					// CompatibilityPlugin changes exports to a new name, should updates exports name
					id = variable.name;
				}

				const settings =
					/** @type {ESMSettings} */
					(parser.getTagData(id, harmonySpecifierTag));
				if (settings) settings.used = true;
				const esmNamedExports = (parser.state.esmNamedExports =
					parser.state.esmNamedExports || new Set());
				esmNamedExports.add(name);
				getInnerGraphUtils(parser.state.compilation).addVariableUsage(
					parser,
					id,
					name
				);
				const tagData = settings
					? undefined
					: /** @type {{ value?: import("../../optimize/InlineExports").InlinedValue } | undefined} */
						(parser.getTagData(id, CONST_BINDING_TAG));
				const dep = settings
					? new ESMExportImportedSpecifierDependency(
							settings.source,
							settings.sourceOrder,
							settings.ids,
							name,
							esmNamedExports,
							null,
							exportPresenceMode,
							null,
							settings.phase,
							settings.attributes
						)
					: new ESMExportSpecifierDependency(
							id,
							name,
							tagData ? tagData.value || null : undefined
						);
				const start = path.start(statement);
				const end = path.end(statement);
				dep.setLocWithIndex(
					parser.getLocation({ start, end }),
					/** @type {number} */ (idx)
				);
				if (parser.isAsiPosition(start)) parser.setAsiPosition(end);
				parser.state.current.addDependency(dep);
				return true;
			}
		);
		parser.hooks.exportImportSpecifier.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement, source, id, name, idx) => {
				const esmNamedExports = (parser.state.esmNamedExports =
					parser.state.esmNamedExports || new Set());
				/** @type {InstanceType<ESMStarExportsList> | null} */
				let esmStarExports = null;
				if (name) {
					esmNamedExports.add(name);
				} else {
					esmStarExports = parser.state.esmStarExports =
						parser.state.esmStarExports || new ESMStarExportsList();
				}
				const attributes = attributesOf(path, statement);
				const dep = new ESMExportImportedSpecifierDependency(
					/** @type {string} */
					(source),
					/** @type {number} */
					(parser.state.lastESMImportOrder),
					id ? [id] : [],
					name,
					esmNamedExports,
					// eslint-disable-next-line unicorn/prefer-spread
					esmStarExports && esmStarExports.slice(),
					exportPresenceMode,
					esmStarExports,
					phaseOf(path, statement),
					attributes
				);
				if (esmStarExports) {
					esmStarExports.push(dep);
				}
				const start = path.start(statement);
				const end = path.end(statement);
				dep.setLocWithIndex(
					parser.getLocation({ start, end }),
					/** @type {number} */ (idx)
				);
				if (parser.isAsiPosition(start)) parser.setAsiPosition(end);
				parser.state.current.addDependency(dep);
				return true;
			}
		);
	}
};
