/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const WebpackError = require("../../errors/WebpackError");
const CompatibilityPlugin = require("../../javascript/CompatibilityPlugin");
const { getImportAttributes } = require("../../javascript/JavascriptParser");
const { Field, Flag, NodeType } = require("../../javascript/syntax-parser");
const { CONST_BINDING_TAG } = require("../../optimize/ConstExportsPlugin");
const { toInlinedValue } = require("../../optimize/InlineExports");
const { getInnerGraphUtils } = require("../../optimize/InnerGraph");
const ConstDependency = require("../core/ConstDependency");
const {
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

/**
 * @import {
 * 	ClassDeclaration,
 * 	ExportAllDeclaration,
 * 	ExportDefaultDeclaration,
 * 	ExportNamedDeclaration,
 * 	FunctionDeclaration
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import JavascriptParser, { Range } from "../../javascript/JavascriptParser" */
/** @import { ESMSettings } from "./ESMImportDependencyParserPlugin" */

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

		/**
		 * Erases a whole export statement, keeping the semicolon ASI inserted before it.
		 * @param {ExportNamedDeclaration | ExportAllDeclaration | ExportDefaultDeclaration} statement the statement
		 * @returns {void}
		 */
		const eraseStatement = (statement) => {
			eraseRange(/** @type {Range} */ (statement.range));
		};

		/**
		 * Erases the export statement at a range, as `eraseStatement` does.
		 * @param {Range} range the statement's range
		 * @returns {void}
		 */
		const eraseRange = (range) => {
			const dep = new ConstDependency(
				parser.isAsiPosition(range[0]) ? ";" : "",
				range
			);
			dep.setLocWithIndex(parser.getLocation({ range }), -1);
			parser.state.module.addPresentationalDependency(dep);
			parser.unsetAsiPosition(range[1]);
		};

		// every export reaches these taps, so they read ids
		parser.hooks.export.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement) => {
				const declaration = path.field(0, Field.declaration, statement);
				if (declaration === 0) {
					eraseRange(path.range(statement));
					return true;
				}
				const dep = new ESMExportHeaderDependency(
					path.range(declaration),
					path.range(statement)
				);
				dep.setLocWithIndex(
					parser.getLocation(parser.nodeOfPath(path, statement)),
					-1
				);
				parser.state.module.addPresentationalDependency(dep);
				return true;
			}
		);
		// every re-export reaches these taps, so they read ids
		parser.hooks.exportImport.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement, source) => {
				parser.state.lastESMImportOrder =
					(parser.state.lastESMImportOrder || 0) + 1;
				const range = path.range(statement);
				eraseRange(range);

				const phase = getImportPhase(parser, statement, undefined, path);
				if (phase && ImportPhaseUtils.isDefer(phase)) {
					const error = new WebpackError(
						"Deferred re-export (`export defer * as namespace from '...'`) is not a part of the Import Defer proposal.\nUse the following code instead:\n    import defer * as namespace from '...';\n    export { namespace };"
					);
					error.loc = parser.getLocation({ range }) || undefined;
					parser.state.current.addError(error);
				}
				const sideEffectDep = new ESMExportImportedSideEffectDependency(
					/** @type {string} */ (source),
					parser.state.lastESMImportOrder,
					phase,
					getImportAttributes(statement, path)
				);
				sideEffectDep.setLocWithIndex(parser.getLocation({ range }), -1);
				parser.state.current.addDependency(sideEffectDep);
				return true;
			}
		);
		// `export default <namespace binding>` is the same export as `export { ns as
		// default }`, so it becomes the same re-export, read by id as every statement
		// comes here. Stage -10 beats the inner-graph tap, whose guard would outlive it.
		parser.hooks.statement.tap(
			{ name: PLUGIN_NAME, stage: -10, path: true },
			(path, statement) => {
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

				const exported = /** @type {ExportDefaultDeclaration} */ (
					path.object(statement)
				);
				dep.setLocWithIndex(parser.getLocation(exported), -1);
				parser.state.current.addDependency(dep);

				eraseStatement(exported);
				return true;
			}
		);
		parser.hooks.exportExpression.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement, node) => {
				const type = path.type(node);
				const isFunctionDeclaration = type === NodeType.FunctionDeclaration;
				const isDeclaration =
					isFunctionDeclaration || type === NodeType.ClassDeclaration;
				const exprRange = path.range(node);
				const statementRange = path.range(statement);
				const comments = parser.getComments([statementRange[0], exprRange[0]]);
				const constValue = isDeclaration
					? undefined
					: toInlinedValue(
							parser.evaluateExpression(parser.nodeOfPath(path, node))
						);
				const nameNode = isDeclaration ? path.field(0, Field.id, node) : 0;
				/** @type {string | { range: Range, prefix: string, suffix: string } | undefined} */
				let declarationId;
				if (nameNode !== 0) {
					declarationId = path.name(nameNode);
				} else if (isFunctionDeclaration) {
					const hasParams = path.fieldCount(Field.params, node) > 0;
					declarationId = {
						range: [
							exprRange[0],
							hasParams
								? path.start(path.field(0, Field.params, node))
								: path.start(path.field(0, Field.body, node))
						],
						prefix: `${path.flag(Flag.async, node) ? "async " : ""}function${
							path.flag(Flag.generator, node) ? "*" : ""
						} `,
						suffix: `(${hasParams ? "" : ") "}`
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
					declarationId,
					constValue
				);
				const unnamed =
					(type === NodeType.ClassDeclaration ||
						type === NodeType.ClassExpression ||
						type === NodeType.FunctionDeclaration ||
						type === NodeType.FunctionExpression) &&
					path.field(0, Field.id, node) === 0;
				const isAnonymousClass =
					unnamed &&
					(type === NodeType.ClassDeclaration ||
						type === NodeType.ClassExpression);
				dep.isAnonymousDefault =
					this.options.anonymousDefaultExportName !== false &&
					(type === NodeType.ArrowFunctionExpression || unnamed);
				// A class observes its own name from a static initializer, which runs
				// before the name could be patched afterwards, so it is named in place.
				dep.isAnonymousDefaultClass =
					dep.isAnonymousDefault && isAnonymousClass;
				dep.setLocWithIndex(
					parser.getLocation(parser.nodeOfPath(path, statement)),
					-1
				);
				parser.state.current.addDependency(dep);
				getInnerGraphUtils(parser.state.compilation).addVariableUsage(
					parser,
					nameNode !== 0 ? path.name(nameNode) : "*default*",
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
				const range = path.range(statement);
				dep.setLocWithIndex(
					parser.getLocation(parser.nodeOfPath(path, statement)),
					/** @type {number} */ (idx)
				);
				const isAsiSafe = !parser.isAsiPosition(range[0]);
				if (!isAsiSafe) {
					parser.setAsiPosition(range[1]);
				}
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
				const attributes = getImportAttributes(statement, path);
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
					getImportPhase(parser, statement, undefined, path),
					attributes
				);
				if (esmStarExports) {
					esmStarExports.push(dep);
				}
				const range = path.range(statement);
				dep.setLocWithIndex(
					parser.getLocation({ range }),
					/** @type {number} */ (idx)
				);
				const isAsiSafe = !parser.isAsiPosition(range[0]);
				if (!isAsiSafe) {
					parser.setAsiPosition(range[1]);
				}
				parser.state.current.addDependency(dep);
				return true;
			}
		);
	}
};
