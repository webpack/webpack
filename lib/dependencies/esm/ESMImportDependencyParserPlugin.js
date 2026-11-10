/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const ImportedBindingAssignmentError = require("../../errors/ImportedBindingAssignmentError");
const WebpackError = require("../../errors/WebpackError");
const getParserHooks = require("../../hmr/parserHooks");
const {
	getImportAttributes,
	isVariableInfo
} = require("../../javascript/JavascriptParser");
const { Field, NodeType, Part } = require("../../javascript/syntax-parser");
const { getInnerGraphUtils } = require("../../optimize/InnerGraph");
const ConstDependency = require("../core/ConstDependency");
const {
	ImportPhaseUtils,
	createGetImportPhase
} = require("../core/ImportPhase");
const ESMAcceptDependency = require("./ESMAcceptDependency");
const ESMAcceptImportDependency = require("./ESMAcceptImportDependency");
const ESMEvaluatedImportSpecifierDependency = require("./ESMEvaluatedImportSpecifierDependency");
const ESMExports = require("./ESMExports");
const ESMImportBareSideEffectDependency = require("./ESMImportBareSideEffectDependency");
const {
	ExportPresenceModes,
	getNonOptionalPart
} = require("./ESMImportDependency");
const {
	attachDependencyGuards,
	isPresentByGuards
} = require("./ESMImportGuard");
const ESMImportSideEffectDependency = require("./ESMImportSideEffectDependency");
const ESMImportSpecifierDependency = require("./ESMImportSpecifierDependency");

/**
 * @import {
 * 	BinaryExpression,
 * 	Expression,
 * 	PrivateIdentifier,
 * 	Identifier,
 * 	MemberExpression,
 * 	Pattern,
 * 	UpdateExpression
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import Module from "../../module/Module" */
/**
 * @import JavascriptParser, {
 * 	ImportAttributes,
 * 	JavascriptNodeReader,
 * 	Range,
 * 	Members,
 * 	WriteStatement
 * } from "../../javascript/JavascriptParser"
 */
/** @import { Ids, ExportPresenceMode } from "./ESMImportDependency" */
/** @import { ImportPhaseType } from "../core/ImportPhase" */
/** @import { GuardFrame } from "./ESMImportGuard" */

// TODO in the next major release: rename to `esmSpecifierTag`
const harmonySpecifierTag =
	/** @type {import("../../javascript/JavascriptParser").Tag<ESMSettings>} */ (
		Symbol("harmony import")
	);

// Shared placeholder: plain specifier references have no member ranges, so they
// can all reuse one (never-mutated) array instead of allocating per dependency.
/** @type {Range[]} */
const EMPTY_ID_RANGES = [];

/**
 * Defines the harmony settings type used by this module.
 * @typedef {object} ESMSettings
 * @property {Ids} ids
 * @property {string} source
 * @property {number} sourceOrder
 * @property {string} name
 * @property {boolean} await
 * @property {ImportAttributes=} attributes
 * @property {ImportPhaseType} phase
 * @property {boolean} used whether the binding is referenced anywhere
 * @property {ESMImportSideEffectDependency | undefined} dependency the statement's own dependency
 */

const PLUGIN_NAME = "ESMImportDependencyParserPlugin";

/**
 * Records that an import binding is referenced, so it is not reported as an
 * unused specifier naming a missing export.
 * @param {ESMSettings | undefined} settings settings of the referenced tag
 * @returns {boolean} true when the reference was a harmony import specifier
 */
const markUsed = (settings) => {
	if (!settings) return false;
	settings.used = true;
	return true;
};

/**
 * Gets in operator harmony import info.
 * @param {JavascriptParser} parser the parser
 * @param {PrivateIdentifier | Expression} left left expression
 * @param {Expression} right right expression
 * @returns {{ leftPart: string, members: Members, settings: ESMSettings } | undefined} info
 */
const getInOperatorHarmonyImportInfo = (parser, left, right) => {
	const leftPartEvaluated = parser.evaluateExpression(left);
	if (leftPartEvaluated.couldHaveSideEffects()) return;
	/** @type {string | undefined} */
	const leftPart = leftPartEvaluated.asString();
	if (!leftPart) return;

	const rightPart = parser.evaluateExpression(right);
	if (!rightPart.isIdentifier()) return;

	const rootInfo = rightPart.rootInfo;
	const root =
		typeof rootInfo === "string"
			? rootInfo
			: isVariableInfo(rootInfo)
				? rootInfo.name
				: undefined;
	if (!root) return;

	const settings = /** @type {ESMSettings | undefined} */ (
		parser.getTagData(root, harmonySpecifierTag)
	);
	if (!settings) {
		return;
	}
	settings.used = true;

	return {
		leftPart,
		members: /** @type {(() => Members)} */ (rightPart.getMembers)(),
		settings
	};
};

/**
 * Whether the conditional test references an imported binding (so a dependency
 * guard can possibly gate a dead branch). Cheap pre-scan over the test, by id.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path the reader of the test's nodes
 * @param {number} node test expression
 * @returns {boolean} true when the test references a harmony import specifier
 */
const findImportSpecifier = (parser, path, node) => {
	switch (path.type(node)) {
		case NodeType.Identifier:
			return markUsed(
				/** @type {ESMSettings | undefined} */
				(parser.getTagData(path.name(node), harmonySpecifierTag))
			);
		case NodeType.UnaryExpression:
			return findImportSpecifier(
				parser,
				path,
				path.field(0, Field.argument, node)
			);
		case NodeType.LogicalExpression:
			return (
				findImportSpecifier(parser, path, path.field(0, Field.left, node)) ||
				findImportSpecifier(parser, path, path.field(0, Field.right, node))
			);
		case NodeType.MemberExpression:
			return findImportSpecifier(
				parser,
				path,
				path.field(0, Field.object, node)
			);
		case NodeType.BinaryExpression:
			// `"x" in ns` presence guard
			return (
				path.textOf(Part.operator, node) === "in" &&
				findImportSpecifier(parser, path, path.field(0, Field.right, node))
			);
		default:
			return false;
	}
};

class ESMImportDependencyParserPlugin {
	/**
	 * Creates an instance of ESMImportDependencyParserPlugin.
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		/** @type {JavascriptParserOptions} */
		this.options = options;
		/** @type {ExportPresenceMode} */
		this.exportPresenceMode = ExportPresenceModes.resolveFromOptions(
			options.importExportsPresence,
			options
		);
		/** @type {boolean | undefined} */
		this.strictThisContextOnImports = options.strictThisContextOnImports;
	}

	/**
	 * Gets export presence mode.
	 * @param {JavascriptParser} parser the parser
	 * @param {ESMSettings} settings settings
	 * @param {Ids} ids ids
	 * @returns {ExportPresenceMode} exportPresenceMode
	 */
	getExportPresenceMode(parser, settings, ids) {
		// Guards only apply to namespace imports
		if (settings.ids.length) return this.exportPresenceMode;

		const harmonySettings = /** @type {ESMSettings=} */ (parser.currentTagData);
		if (!harmonySettings) return this.exportPresenceMode;

		if (this.exportPresenceMode === ExportPresenceModes.NONE) {
			return this.exportPresenceMode;
		}

		const stack = parser.state.guardStack;
		if (
			stack !== undefined &&
			isPresentByGuards(parser, stack, harmonySettings.name, ids[0])
		) {
			return ExportPresenceModes.NONE;
		}

		return this.exportPresenceMode;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const getImportPhase = createGetImportPhase(
			this.options.deferImport,
			this.options.sourceImport
		);

		// Parsers are reused across modules, so all three are reset per program.
		/** @type {ESMSettings[]} */
		const declaredSpecifiers = [];
		/** @type {ESMImportSideEffectDependency | undefined} */
		let lastSideEffectDependency;
		/** @type {Identifier | MemberExpression | undefined} */
		let assignmentTarget;

		// these read no node, so they take the path and make no object
		parser.hooks.program.tap({ name: PLUGIN_NAME, path: true }, () => {
			declaredSpecifiers.length = 0;
			lastSideEffectDependency = undefined;
			assignmentTarget = undefined;
		});
		parser.hooks.finish.tap({ name: PLUGIN_NAME, path: true }, () => {
			for (const settings of declaredSpecifiers) {
				const dependency = settings.dependency;
				if (dependency === undefined) continue;
				// A namespace import names no export, so no reference site answers for
				// it. Recorded whatever the devtool is: a module the cache restores is
				// never parsed again, and the option reading it is chosen afterwards.
				if (settings.ids.length === 0) {
					if (dependency.namespaceSpecifiers === undefined) {
						dependency.namespaceSpecifiers = [];
					}
					dependency.namespaceSpecifiers.push(settings.name);
					continue;
				}
				if (settings.used) continue;
				if (dependency.unusedSpecifiers === undefined) {
					dependency.unusedSpecifiers = {
						exportPresenceMode: this.exportPresenceMode,
						specifiers: []
					};
				}
				dependency.unusedSpecifiers.specifiers.push([
					settings.ids,
					settings.name
				]);
			}
			declaredSpecifiers.length = 0;
			lastSideEffectDependency = undefined;
			assignmentTarget = undefined;
		});

		/**
		 * Gets non optional member chain.
		 * @param {MemberExpression} node member expression
		 * @param {number} count count
		 * @returns {Expression} member expression
		 */
		function getNonOptionalMemberChain(node, count) {
			while (count--) node = /** @type {MemberExpression} */ (node.object);
			return node;
		}

		parser.hooks.isPure
			.for("Identifier")
			.tap({ name: PLUGIN_NAME, path: true }, (path, expression) => {
				const name = path.name(expression);
				if (
					parser.isVariableDefined(name) ||
					markUsed(
						/** @type {ESMSettings | undefined} */
						(parser.getTagData(name, harmonySpecifierTag))
					)
				) {
					return true;
				}
			});
		// every import reaches these taps, so they read ids
		parser.hooks.import.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement, source) => {
				parser.state.lastESMImportOrder =
					(parser.state.lastESMImportOrder || 0) + 1;
				const range = path.range(statement);
				const clearDep = new ConstDependency(
					parser.isAsiPosition(range[0]) ? ";" : "",
					range
				);
				clearDep.loc = parser.getLocation({ range });
				parser.state.module.addPresentationalDependency(clearDep);
				parser.unsetAsiPosition(range[1]);
				const attributes = getImportAttributes(statement, path);
				const phase = getImportPhase(parser, statement, undefined, path);
				const specifierCount = path.fieldCount(Field.specifiers, statement);
				if (
					ImportPhaseUtils.isDefer(phase) &&
					(specifierCount !== 1 ||
						path.type(path.field(0, Field.specifiers, statement)) !==
							NodeType.ImportNamespaceSpecifier)
				) {
					const error = new WebpackError(
						"Deferred import can only be used with `import * as namespace from '...'` syntax."
					);
					error.loc = parser.getLocation({ range }) || undefined;
					parser.state.current.addError(error);
				}

				// A declaration binding nothing was written for what importing produces,
				// which for a module emitting its own file is that file.
				const SideEffectDependency =
					specifierCount === 0
						? ESMImportBareSideEffectDependency
						: ESMImportSideEffectDependency;
				const sideEffectDep = new SideEffectDependency(
					/** @type {string} */ (source),
					parser.state.lastESMImportOrder,
					phase,
					attributes
				);
				sideEffectDep.loc = parser.getLocation({ range });
				parser.state.module.addDependency(sideEffectDep);
				lastSideEffectDependency = sideEffectDep;
				return true;
			}
		);
		parser.hooks.importSpecifier.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, statement, source, id, name) => {
				const ids = id === null ? [] : [id];
				const phase = getImportPhase(parser, statement, undefined, path);
				const settings = /** @type {ESMSettings} */ ({
					name,
					source,
					ids,
					sourceOrder: parser.state.lastESMImportOrder,
					attributes: getImportAttributes(statement, path),
					phase,
					used: false,
					dependency: lastSideEffectDependency
				});
				parser.tagVariable(name, harmonySpecifierTag, settings);
				declaredSpecifiers.push(settings);
				return true;
			}
		);
		// every binary expression reaches this tap, so it reads the operator by id
		parser.hooks.binaryExpression.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, node) => {
				if (path.textOf(Part.operator, node) !== "in") return;
				const expression = /** @type {BinaryExpression} */ (path.object(node));
				const info = getInOperatorHarmonyImportInfo(
					parser,
					expression.left,
					expression.right
				);
				if (!info) return;

				const { leftPart, members, settings } = info;
				const dep = new ESMEvaluatedImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					[...settings.ids, ...members, leftPart],
					settings.name,
					/** @type {Range} */ (expression.range),
					settings.attributes,
					"in"
				);
				dep.directImport = members.length === 0;
				dep.asiSafe = !parser.isAsiPosition(
					/** @type {Range} */ (expression.range)[0]
				);
				dep.loc = parser.getLocation(expression);
				parser.state.module.addDependency(dep);
				getInnerGraphUtils(parser.state.compilation).onUsage(
					parser.state,
					(e) => (dep.usedByExports = e)
				);
				return true;
			}
		);
		parser.hooks.collectDestructuringAssignmentProperties.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, node) => {
				const nameInfo = parser.getNameForExpression(
					parser.nodeOfPath(path, node)
				);
				if (
					nameInfo &&
					isVariableInfo(nameInfo.rootInfo) &&
					nameInfo.rootInfo.name &&
					markUsed(
						/** @type {ESMSettings | undefined} */
						(parser.getTagData(nameInfo.rootInfo.name, harmonySpecifierTag))
					)
				) {
					return true;
				}
			}
		);
		/**
		 * The reference a write lands on, which is a pattern for a
		 * destructuring write.
		 * @param {WriteStatement} node the construct performing the write
		 * @returns {Pattern | MemberExpression} the written reference
		 */
		const writeTargetOf = (node) =>
			/** @type {Pattern | MemberExpression} */ (
				node.type === "UpdateExpression" ? node.argument : node.left
			);

		/**
		 * Whether a member write lands on the namespace object itself, which is
		 * read-only. A property of an imported object is an ordinary write.
		 * @param {ESMSettings} settings the specifier's settings
		 * @param {Members} members the member chain
		 * @returns {boolean} true when the write targets a namespace member
		 */
		const isNamespaceMemberWrite = (settings, members) =>
			settings.ids.length === 0 && members.length === 1;

		/**
		 * Keeps the module whole, for a write whose reference the output has no
		 * way to flag.
		 * @returns {void}
		 */
		const bailOutOfConcatenation = () => {
			parser.state.module.buildInfo.moduleConcatenationBailout =
				"assignment to an imported binding";
		};

		/**
		 * Records the write target of an assignment or update to an imported
		 * binding, so the reference walked next renders as a throwing write.
		 * @param {WriteStatement} expr the write
		 * @param {Identifier | MemberExpression | undefined} target the written reference, if any
		 * @returns {void}
		 */
		const markImportedBindingWrite = (expr, target) => {
			const settings = /** @type {ESMSettings} */ (parser.currentTagData);
			markUsed(settings);
			// A named import is written through the namespace's getter-only
			// property, which throws on its own. A namespace one is the binding
			// itself, and nothing webpack can emit for it throws, so report it.
			if (settings.ids.length === 0) {
				const error = new ImportedBindingAssignmentError(settings.name);
				error.loc = parser.getLocation(expr);
				parser.state.module.addError(error);
			} else if (target) {
				assignmentTarget = target;
			} else {
				// A destructuring target emits no reference to flag, so the whole
				// module stays out of concatenation.
				bailOutOfConcatenation();
			}
		};

		parser.hooks.assign.for(harmonySpecifierTag).tap(PLUGIN_NAME, (expr) => {
			markImportedBindingWrite(
				expr,
				expr.left.type === "Identifier" ? expr.left : undefined
			);
		});
		parser.hooks.write.for(harmonySpecifierTag).tap(PLUGIN_NAME, (node) => {
			const written = writeTargetOf(node);
			const target = written.type === "Identifier" ? written : undefined;
			markImportedBindingWrite(node, target);
			// A loop's binding walks nothing on its own, so the reference the
			// write renders as has to be walked here to exist at all.
			if (!target || node.type === "UpdateExpression") return;
			parser.walkExpression(target);
			return true;
		});
		// A namespace member is written through the reference its member chain
		// emits, so both write forms flag that reference rather than the binding.
		parser.hooks.writeMemberChain
			.for(harmonySpecifierTag)
			.tap(PLUGIN_NAME, (node, members) => {
				const settings = /** @type {ESMSettings} */ (parser.currentTagData);
				if (!isNamespaceMemberWrite(settings, members)) return;
				const written = writeTargetOf(node);
				if (written.type === "MemberExpression") {
					assignmentTarget = written;
				} else {
					bailOutOfConcatenation();
				}
			});
		// every read of an imported binding reaches these taps, so they read ids
		parser.hooks.expression
			.for(harmonySpecifierTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				const settings = /** @type {ESMSettings} */ (parser.currentTagData);
				settings.used = true;
				const range = path.range(node);
				const expr = parser.nodeOfPath(path, node);
				const dep = new ESMImportSpecifierDependency(
					settings.source,
					settings.sourceOrder,
					settings.ids,
					settings.name,
					range,
					this.exportPresenceMode,
					settings.phase,
					settings.attributes,
					EMPTY_ID_RANGES
				);
				dep.referencedPropertiesInDestructuring =
					parser.destructuringAssignmentPropertiesFor(expr);
				dep.shorthand = parser.scope.inShorthand;
				dep.directImport = true;
				dep.asiSafe = !parser.isAsiPosition(range[0]);
				dep.loc = parser.getLocation(expr);
				dep.call = parser.scope.inTaggedTemplateTag;
				if (
					assignmentTarget !== undefined &&
					assignmentTarget === path.object(node)
				) {
					dep.assignment = true;
					assignmentTarget = undefined;
				}
				parser.state.module.addDependency(dep);
				attachDependencyGuards(parser, dep);
				getInnerGraphUtils(parser.state.compilation).onUsage(
					parser.state,
					(e) => (dep.usedByExports = e)
				);
				return true;
			});
		parser.hooks.expressionMemberChain
			.for(harmonySpecifierTag)
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, expression, members, membersOptionals, memberRanges) => {
					const settings =
						/** @type {ESMSettings} */
						(parser.currentTagData);
					settings.used = true;
					const nonOptionalMembers = getNonOptionalPart(
						members,
						membersOptionals
					);
					const rangeCount =
						memberRanges.length - (members.length - nonOptionalMembers.length);
					// Nothing left to record is the common case, so share one array.
					/** @type {Range[]} */
					const ranges =
						rangeCount > 0
							? memberRanges.slice(0, rangeCount)
							: EMPTY_ID_RANGES;
					const expr =
						nonOptionalMembers !== members
							? getNonOptionalMemberChain(
									/** @type {MemberExpression} */ (path.object(expression)),
									members.length - nonOptionalMembers.length
								)
							: parser.nodeOfPath(path, expression);
					const range =
						nonOptionalMembers !== members
							? /** @type {Range} */ (expr.range)
							: path.range(expression);
					const ids = [...settings.ids, ...nonOptionalMembers];
					const dep = new ESMImportSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						ids,
						settings.name,
						range,
						this.getExportPresenceMode(parser, settings, ids),
						settings.phase,
						settings.attributes,
						ranges
					);
					dep.referencedPropertiesInDestructuring =
						parser.destructuringAssignmentPropertiesFor(expr);
					dep.asiSafe = !parser.isAsiPosition(range[0]);
					dep.loc = parser.getLocation(expr);
					if (
						assignmentTarget !== undefined &&
						assignmentTarget === path.object(expression)
					) {
						dep.assignment = true;
						assignmentTarget = undefined;
					}
					parser.state.module.addDependency(dep);
					attachDependencyGuards(parser, dep);
					getInnerGraphUtils(parser.state.compilation).onUsage(
						parser.state,
						(e) => (dep.usedByExports = e)
					);
					return true;
				}
			);
		parser.hooks.callMemberChain
			.for(harmonySpecifierTag)
			// every call of an imported binding reaches this tap, so it reads ids
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, expression, members, membersOptionals, memberRanges) => {
					const callee = path.field(0, Field.callee, expression);
					const settings = /** @type {ESMSettings} */ (parser.currentTagData);
					settings.used = true;
					const nonOptionalMembers = getNonOptionalPart(
						members,
						membersOptionals
					);
					const rangeCount =
						memberRanges.length - (members.length - nonOptionalMembers.length);
					// Nothing left to record is the common case, so share one array.
					/** @type {Range[]} */
					const ranges =
						rangeCount > 0
							? memberRanges.slice(0, rangeCount)
							: EMPTY_ID_RANGES;
					const expr =
						nonOptionalMembers !== members
							? getNonOptionalMemberChain(
									/** @type {MemberExpression} */ (path.object(callee)),
									members.length - nonOptionalMembers.length
								)
							: parser.nodeOfPath(path, callee);
					const range =
						nonOptionalMembers !== members
							? /** @type {Range} */ (expr.range)
							: path.range(callee);
					const ids = [...settings.ids, ...nonOptionalMembers];
					const dep = new ESMImportSpecifierDependency(
						settings.source,
						settings.sourceOrder,
						ids,
						settings.name,
						range,
						this.getExportPresenceMode(parser, settings, ids),
						settings.phase,
						settings.attributes,
						ranges
					);
					dep.directImport = members.length === 0;
					dep.call = true;
					dep.asiSafe = !parser.isAsiPosition(range[0]);
					// only in case when we strictly follow the spec we need a special case here
					dep.namespaceObjectAsContext =
						members.length > 0 &&
						/** @type {boolean} */ (this.strictThisContextOnImports);
					dep.loc = parser.getLocation(expr);
					parser.state.module.addDependency(dep);
					attachDependencyGuards(parser, dep);
					const argumentCount = path.fieldCount(Field.arguments, expression);
					for (let i = 0; i < argumentCount; i++) {
						parser.walkExpression(
							parser.nodeOfPath(
								path,
								path.field(i, Field.arguments, expression)
							)
						);
					}
					getInnerGraphUtils(parser.state.compilation).onUsage(
						parser.state,
						(e) => (dep.usedByExports = e)
					);
					return true;
				}
			);
		// `[[Set]]` on a Module Namespace returns false without evaluating, yet the
		// member-chain path emits `<importVar>.a.foo`, whose getter evaluates. So
		// only the bare `ns` is walked, leaving `.foo = value` as plain code.
		parser.hooks.assignMemberChain
			.for(harmonySpecifierTag)
			// every member write of an imported binding reaches this tap, so it reads ids
			.tap({ name: PLUGIN_NAME, path: true }, (path, expression, members) => {
				const settings = /** @type {ESMSettings} */ (parser.currentTagData);
				settings.used = true;
				const left = path.field(0, Field.left, expression);
				if (isNamespaceMemberWrite(settings, members)) {
					assignmentTarget = /** @type {MemberExpression} */ (
						path.object(left)
					);
				}
				if (!ImportPhaseUtils.isDefer(settings.phase)) return;
				if (path.textOf(Part.operator, expression) !== "=") return;
				if (members.length !== 1) return;
				const object = path.field(0, Field.object, left);
				if (path.type(object) !== NodeType.Identifier) return;
				parser.walkExpression(
					parser.nodeOfPath(path, path.field(0, Field.right, expression))
				);
				parser.walkExpression(parser.nodeOfPath(path, object));
				return true;
			});
		const { hotAcceptCallback, hotAcceptWithoutCallback } =
			getParserHooks(parser);
		hotAcceptCallback.tap(PLUGIN_NAME, (expr, requests) => {
			if (!ESMExports.isEnabled(parser.state)) {
				// This is not a harmony module, skip it
				return;
			}
			const dependencies = requests.map((request) => {
				const dep = new ESMAcceptImportDependency(request);
				dep.loc = parser.getLocation(expr);
				parser.state.module.addDependency(dep);
				return dep;
			});
			if (dependencies.length > 0) {
				const dep = new ESMAcceptDependency(
					/** @type {Range} */
					(expr.range),
					dependencies,
					true
				);
				dep.loc = parser.getLocation(expr);
				parser.state.module.addDependency(dep);
			}
		});
		hotAcceptWithoutCallback.tap(PLUGIN_NAME, (expr, requests) => {
			if (!ESMExports.isEnabled(parser.state)) {
				// This is not a harmony module, skip it
				return;
			}
			const dependencies = requests.map((request) => {
				const dep = new ESMAcceptImportDependency(request);
				dep.loc = parser.getLocation(expr);
				parser.state.module.addDependency(dep);
				return dep;
			});
			if (dependencies.length > 0) {
				const dep = new ESMAcceptDependency(
					/** @type {Range} */
					(expr.range),
					dependencies,
					false
				);
				dep.loc = parser.getLocation(expr);
				parser.state.module.addDependency(dep);
			}
		});

		// every `if` and conditional reaches this tap, so it reads ids
		parser.hooks.collectGuards.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, test) => {
				if (parser.scope.isAsmJs) return;

				const hasSpecifier = findImportSpecifier(parser, path, test);
				const depStart = hasSpecifier
					? /** @type {Module} */ (parser.state.module).dependencies.length
					: undefined;

				if (depStart === undefined) return;
				const expression = /** @type {Expression} */ (path.object(test));

				/** @type {GuardFrame} */
				const consequent = {
					test: expression,
					depStart,
					condition: true
				};
				/** @type {GuardFrame | undefined} */
				const alternate =
					depStart === undefined
						? undefined
						: { test: expression, depStart, condition: false };

				return { consequent, alternate };
			}
		);
	}
}

ESMImportDependencyParserPlugin.harmonySpecifierTag = harmonySpecifierTag;

module.exports = ESMImportDependencyParserPlugin;
