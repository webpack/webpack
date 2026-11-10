/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const AsyncDependenciesBlock = require("../../graph/AsyncDependenciesBlock");

const {
	getImportAttributes,
	isVariableInfo
} = require("../../javascript/JavascriptParser");
const { Field, NodeType } = require("../../javascript/syntax-parser");
const memoize = require("../../util/memoize");
const ContextDependencyHelpers = require("../context/ContextDependencyHelpers");
const { createGetImportPhase } = require("../core/ImportPhase");
const { getNonOptionalPart } = require("../esm/ESMImportDependency");
const ESMImportGuard = require("../esm/ESMImportGuard");
const traverseDestructuringAssignmentProperties = require("../helpers/traverseDestructuringAssignmentProperties");
const ImportContextDependency = require("./ImportContextDependency");
const ImportDependency = require("./ImportDependency");
const ImportEagerDependency = require("./ImportEagerDependency");
const ImportWeakDependency = require("./ImportWeakDependency");

const getUnsupportedFeatureWarning = memoize(() =>
	require("../../errors/UnsupportedFeatureWarning")
);

const getCommentCompilationWarning = memoize(() =>
	require("../../errors/CommentCompilationWarning")
);

/**
 * @import {
 * 	ArrowFunctionExpression,
 * 	FunctionExpression,
 * 	Identifier,
 * 	ObjectPattern,
 * 	CallExpression
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import { RawChunkGroupOptions } from "../../graph/ChunkGroup" */
/** @import { ContextMode } from "../../context/ContextModule" */
/** @import { ReferencedSpecifiers } from "../../graph/Dependency" */
/**
 * @import JavascriptParser, {
 * 	ImportExpression,
 * 	JavascriptNodeReader,
 * 	JavascriptParserState
 * } from "../../javascript/JavascriptParser"
 */

/** @typedef {{ references: ReferencedSpecifiers, expression: ImportExpression }} ImportSettings */
/** @typedef {Map<number, ReferencedSpecifiers>} State the references of each `import()`, by its node */

// A parse's nodes are ids of its reader, so the state is kept per reader too
/** @type {WeakMap<JavascriptParserState, WeakMap<JavascriptNodeReader, State>>} */
const parserStateMap = new WeakMap();
const dynamicImportTag =
	/** @type {import("../../javascript/JavascriptParser").Tag<ImportSettings>} */ (
		Symbol("import()")
	);

/**
 * Returns import parser plugin state.
 * @param {JavascriptParser} parser javascript parser
 * @param {JavascriptNodeReader} path the reader of the parse's nodes
 * @returns {State} import parser plugin state
 */
function getState(parser, path) {
	let readers = parserStateMap.get(parser.state);
	if (readers === undefined) {
		readers = new WeakMap();
		parserStateMap.set(parser.state, readers);
	}
	let state = readers.get(path);
	if (state === undefined) {
		state = new Map();
		readers.set(path, state);
	}
	return state;
}

/**
 * Tag dynamic import referenced.
 * @param {JavascriptParser} parser javascript parser
 * @param {JavascriptNodeReader} path the reader of the import expression
 * @param {number} importCall the import expression
 * @param {string} variableName variable name
 */
function tagDynamicImportReferenced(parser, path, importCall, variableName) {
	const state = getState(parser, path);
	/** @type {ReferencedSpecifiers} */
	const references = state.get(importCall) || [];
	state.set(importCall, references);
	parser.tagVariable(
		variableName,
		dynamicImportTag,
		/** @type {ImportSettings} */ ({
			references,
			expression: /** @type {ImportExpression} */ (path.object(importCall))
		})
	);
}

/**
 * Gets fulfilled callback namespace obj.
 * @param {CallExpression} importThen import().then() call
 * @returns {Identifier | ObjectPattern | undefined} the dynamic imported namespace obj
 */
function getFulfilledCallbackNamespaceObj(importThen) {
	const fulfilledCallback = importThen.arguments[0];
	if (
		fulfilledCallback &&
		(fulfilledCallback.type === "ArrowFunctionExpression" ||
			fulfilledCallback.type === "FunctionExpression") &&
		fulfilledCallback.params[0] &&
		(fulfilledCallback.params[0].type === "Identifier" ||
			fulfilledCallback.params[0].type === "ObjectPattern")
	) {
		return fulfilledCallback.params[0];
	}
}

/**
 * Walk import then fulfilled callback.
 * @param {JavascriptParser} parser javascript parser
 * @param {JavascriptNodeReader} path the reader of the import expression
 * @param {number} importCallNode the import expression
 * @param {ArrowFunctionExpression | FunctionExpression} fulfilledCallback the fulfilled callback
 * @param {Identifier | ObjectPattern} namespaceObjArg the argument of namespace object=
 */
function walkImportThenFulfilledCallback(
	parser,
	path,
	importCallNode,
	fulfilledCallback,
	namespaceObjArg
) {
	const importCall = /** @type {ImportExpression} */ (
		path.object(importCallNode)
	);
	const arrow = fulfilledCallback.type === "ArrowFunctionExpression";
	const wasTopLevel = parser.scope.topLevelScope;
	parser.scope.topLevelScope = arrow ? (wasTopLevel ? "arrow" : false) : false;
	const scopeParams = [...fulfilledCallback.params];

	// Add function name in scope for recursive calls
	if (!arrow && fulfilledCallback.id) {
		scopeParams.push(fulfilledCallback.id);
	}

	parser.inFunctionScope(!arrow, scopeParams, () => {
		if (namespaceObjArg.type === "Identifier") {
			tagDynamicImportReferenced(
				parser,
				path,
				importCallNode,
				namespaceObjArg.name
			);
		} else {
			parser.enterDestructuringAssignment(namespaceObjArg, importCall);
			const referencedPropertiesInDestructuring =
				parser.destructuringAssignmentPropertiesFor(importCall);
			if (referencedPropertiesInDestructuring) {
				const state = getState(parser, path);
				const references = /** @type {ReferencedSpecifiers} */ (
					state.get(importCallNode)
				);
				/** @type {ReferencedSpecifiers} */
				const refsInDestructuring = [];
				traverseDestructuringAssignmentProperties(
					referencedPropertiesInDestructuring,
					(stack) => refsInDestructuring.push(stack.map((p) => p.id))
				);
				for (const ids of refsInDestructuring) {
					references.push(ids);
				}
			}
		}
		for (const param of fulfilledCallback.params) {
			parser.walkPattern(param);
		}
		if (fulfilledCallback.body.type === "BlockStatement") {
			parser.detectMode(fulfilledCallback.body.body);
			const prev = parser.prevStatement;
			parser.preWalkStatement(fulfilledCallback.body);
			parser.prevStatement = prev;
			parser.walkStatement(fulfilledCallback.body);
		} else {
			parser.walkExpression(fulfilledCallback.body);
		}
	});
	parser.scope.topLevelScope = wasTopLevel;
}

/**
 * Exports from enumerable.
 * @template T
 * @param {Iterable<T>} enumerable enumerable
 * @returns {T[][]} array of array
 */
const exportsFromEnumerable = (enumerable) =>
	Array.from(enumerable, (e) => [e]);

const PLUGIN_NAME = "ImportParserPlugin";

/**
 * Whether an `import()` second argument is a fully static attributes object
 * (every `with`/`assert` value is a string literal). Only then can webpack use
 * the attributes at build time; otherwise the argument must be evaluated and
 * validated at runtime per spec.
 * @param {import("estree").Expression | null | undefined} node the second-argument AST node
 * @returns {boolean} true if statically extractable
 */
const isStaticStringAttributes = (node) => {
	if (!node || node.type !== "ObjectExpression") return false;
	for (const prop of node.properties) {
		if (prop.type !== "Property" || prop.kind !== "init" || prop.computed) {
			return false;
		}
		const key = prop.key;
		const keyName =
			key.type === "Identifier"
				? key.name
				: key.type === "Literal"
					? key.value
					: undefined;
		// Any other key is an expression webpack cannot account for, and its
		// value still evaluates, so the argument has to stay.
		if (keyName !== "with" && keyName !== "assert") return false;
		const value = prop.value;
		if (value.type !== "ObjectExpression") return false;
		for (const attr of value.properties) {
			if (attr.type !== "Property" || attr.kind !== "init" || attr.computed) {
				return false;
			}
			const attrValue = attr.value;
			if (attrValue.type !== "Literal" || typeof attrValue.value !== "string") {
				return false;
			}
		}
	}
	return true;
};

class ImportParserPlugin {
	/**
	 * Creates an instance of ImportParserPlugin.
	 * @param {JavascriptParserOptions} options options
	 */
	constructor(options) {
		/** @type {JavascriptParserOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.collectDestructuringAssignmentProperties.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, node) => {
				if (path.type(node) === NodeType.ImportExpression) return true;
				const nameInfo = parser.getNameForExpression(
					parser.nodeOfPath(path, node)
				);
				if (
					nameInfo &&
					isVariableInfo(nameInfo.rootInfo) &&
					nameInfo.rootInfo.name &&
					parser.getTagData(nameInfo.rootInfo.name, dynamicImportTag)
				) {
					return true;
				}
			}
		);
		// every declarator reaches this tap, so it reads ids: only a match needs objects
		parser.hooks.preDeclarator.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, decl) => {
				const init = path.field(0, Field.init, decl);
				if (init === 0 || path.type(init) !== NodeType.AwaitExpression) return;
				const argument = path.field(0, Field.argument, init);
				const id = path.field(0, Field.id, decl);
				if (
					path.type(argument) !== NodeType.ImportExpression ||
					path.type(id) !== NodeType.Identifier
				) {
					return;
				}
				const name = path.name(id);
				parser.defineVariable(name);
				tagDynamicImportReferenced(parser, path, argument, name);
			}
		);
		parser.hooks.expression
			.for(dynamicImportTag)
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				const settings = /** @type {ImportSettings} */ (parser.currentTagData);
				const referencedPropertiesInDestructuring =
					parser.destructuringAssignmentPropertiesFor(
						parser.nodeOfPath(path, node)
					);
				if (referencedPropertiesInDestructuring) {
					/** @type {ReferencedSpecifiers} */
					const refsInDestructuring = [];
					traverseDestructuringAssignmentProperties(
						referencedPropertiesInDestructuring,
						(stack) => refsInDestructuring.push(stack.map((p) => p.id))
					);
					for (const ids of refsInDestructuring) {
						settings.references.push(ids);
					}
				} else {
					settings.references.push([]);
				}
				return true;
			});
		parser.hooks.expressionMemberChain
			.for(dynamicImportTag)
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(_path, _expression, members, membersOptionals) => {
					const settings = /** @type {ImportSettings} */ (
						parser.currentTagData
					);
					const ids = getNonOptionalPart(members, membersOptionals);
					settings.references.push(ids);
					return true;
				}
			);
		parser.hooks.callMemberChain
			.for(dynamicImportTag)
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, expression, members, membersOptionals) => {
					const settings = /** @type {ImportSettings} */ (
						parser.currentTagData
					);
					const ids = getNonOptionalPart(members, membersOptionals);
					settings.references.push(
						ids.length === 0 || ids.length < members.length
							? ids
							: {
									names: ids,
									namespaceObjectAsContext: Boolean(
										this.options.strictThisContextOnImports
									)
								}
					);
					const count = path.fieldCount(Field.arguments, expression);
					for (let i = 0; i < count; i++) {
						parser.walkExpression(
							parser.nodeOfPath(
								path,
								path.field(i, Field.arguments, expression)
							)
						);
					}
					return true;
				}
			);
		// read by id; only a second argument or a `then` callback needs objects
		parser.hooks.importCall.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, node, importThenNode) => {
				const expr = parser.nodeOfPath(path, node);
				const range = path.range(node);
				const optionsNode = path.field(0, Field.options, node);
				const importThen =
					importThenNode === 0
						? undefined
						: /** @type {CallExpression} */ (path.object(importThenNode));
				const param = parser.evaluateExpression(
					parser.nodeOfPath(path, path.field(0, Field.source, node))
				);

				/** @type {null | string} */
				let chunkName = null;
				let mode = /** @type {ContextMode} */ (this.options.dynamicImportMode);
				/** @type {null | RegExp} */
				let include = null;
				/** @type {null | RegExp} */
				let exclude = null;
				/** @type {null | ReferencedSpecifiers} */
				let exports = null;
				/** @type {RawChunkGroupOptions} */
				const groupOptions = {};

				const {
					dynamicImportPreload,
					dynamicImportCssPreload,
					dynamicImportPrefetch,
					dynamicImportFetchPriority
				} = this.options;
				if (
					dynamicImportPreload !== undefined &&
					dynamicImportPreload !== false
				) {
					groupOptions.preloadOrder =
						dynamicImportPreload === true ? 0 : dynamicImportPreload;
				}
				if (
					dynamicImportCssPreload !== undefined &&
					dynamicImportCssPreload !== false
				) {
					groupOptions.cssPreloadOrder =
						dynamicImportCssPreload === true ? 0 : dynamicImportCssPreload;
				}
				if (
					dynamicImportPrefetch !== undefined &&
					dynamicImportPrefetch !== false
				) {
					groupOptions.prefetchOrder =
						dynamicImportPrefetch === true ? 0 : dynamicImportPrefetch;
				}
				if (
					dynamicImportFetchPriority !== undefined &&
					dynamicImportFetchPriority !== false
				) {
					groupOptions.fetchPriority = dynamicImportFetchPriority;
				}

				const { options: importOptions, errors: commentErrors } =
					parser.parseCommentOptions(range);

				if (commentErrors) {
					for (const e of commentErrors) {
						const { comment } = e;
						parser.state.module.addWarning(
							new (getCommentCompilationWarning())(
								`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
								parser.getLocation(comment)
							)
						);
					}
				}

				const phase = createGetImportPhase(
					this.options.deferImport,
					this.options.sourceImport
				)(parser, node, () => importOptions, path);

				if (importOptions) {
					if (importOptions.webpackIgnore !== undefined) {
						if (typeof importOptions.webpackIgnore !== "boolean") {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackIgnore\` expected a boolean, but received: ${importOptions.webpackIgnore}.`,
									parser.getLocation(expr)
								)
							);
						} else if (importOptions.webpackIgnore) {
							// Do not instrument `import()` if `webpackIgnore` is `true`
							return false;
						}
					}
					if (importOptions.webpackChunkName !== undefined) {
						if (typeof importOptions.webpackChunkName !== "string") {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`,
									parser.getLocation(expr)
								)
							);
						} else {
							chunkName = importOptions.webpackChunkName;
						}
					}
					if (importOptions.webpackMode !== undefined) {
						if (typeof importOptions.webpackMode !== "string") {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackMode\` expected a string, but received: ${importOptions.webpackMode}.`,
									parser.getLocation(expr)
								)
							);
						} else {
							mode = /** @type {ContextMode} */ (importOptions.webpackMode);
						}
					}
					if (importOptions.webpackPrefetch !== undefined) {
						if (importOptions.webpackPrefetch === true) {
							groupOptions.prefetchOrder = 0;
						} else if (typeof importOptions.webpackPrefetch === "number") {
							groupOptions.prefetchOrder = importOptions.webpackPrefetch;
						} else {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackPrefetch\` expected true or a number, but received: ${importOptions.webpackPrefetch}.`,
									parser.getLocation(expr)
								)
							);
						}
					}
					if (importOptions.webpackPreload !== undefined) {
						if (importOptions.webpackPreload === true) {
							groupOptions.preloadOrder = 0;
						} else if (typeof importOptions.webpackPreload === "number") {
							groupOptions.preloadOrder = importOptions.webpackPreload;
						} else {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackPreload\` expected true or a number, but received: ${importOptions.webpackPreload}.`,
									parser.getLocation(expr)
								)
							);
						}
					}
					if (importOptions.webpackFetchPriority !== undefined) {
						if (
							typeof importOptions.webpackFetchPriority === "string" &&
							["high", "low", "auto"].includes(
								importOptions.webpackFetchPriority
							)
						) {
							groupOptions.fetchPriority =
								/** @type {"low" | "high" | "auto"} */
								(importOptions.webpackFetchPriority);
						} else {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackFetchPriority\` expected true or "low", "high" or "auto", but received: ${importOptions.webpackFetchPriority}.`,
									parser.getLocation(expr)
								)
							);
						}
					}
					if (importOptions.webpackInclude !== undefined) {
						if (
							!importOptions.webpackInclude ||
							!(importOptions.webpackInclude instanceof RegExp)
						) {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackInclude\` expected a regular expression, but received: ${importOptions.webpackInclude}.`,
									parser.getLocation(expr)
								)
							);
						} else {
							include = importOptions.webpackInclude;
						}
					}
					if (importOptions.webpackExclude !== undefined) {
						if (
							!importOptions.webpackExclude ||
							!(importOptions.webpackExclude instanceof RegExp)
						) {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackExclude\` expected a regular expression, but received: ${importOptions.webpackExclude}.`,
									parser.getLocation(expr)
								)
							);
						} else {
							exclude = importOptions.webpackExclude;
						}
					}
					if (importOptions.webpackExports !== undefined) {
						if (!(
							typeof importOptions.webpackExports === "string" ||
							(Array.isArray(importOptions.webpackExports) &&
								importOptions.webpackExports.every(
									(/** @type {unknown} */ item) => typeof item === "string"
								))
						)) {
							parser.state.module.addWarning(
								new (getUnsupportedFeatureWarning())(
									`\`webpackExports\` expected a string or an array of strings, but received: ${importOptions.webpackExports}.`,
									parser.getLocation(expr)
								)
							);
						} else if (typeof importOptions.webpackExports === "string") {
							exports = [[importOptions.webpackExports]];
						} else {
							exports = exportsFromEnumerable(importOptions.webpackExports);
						}
					}
					// `worker` is an internal entry option set only for workers
					if (
						importOptions.webpackEntryOptions !== undefined &&
						typeof importOptions.webpackEntryOptions === "object" &&
						importOptions.webpackEntryOptions !== null &&
						"worker" in importOptions.webpackEntryOptions &&
						importOptions.webpackEntryOptions.worker !== undefined
					) {
						parser.state.module.addWarning(
							new (getUnsupportedFeatureWarning())(
								"`worker` entry option is not supported in `import()`, it only applies to workers (e.g. `new Worker(new URL(...))`).",
								parser.getLocation(expr)
							)
						);
					}
				}

				if (
					mode !== "lazy" &&
					mode !== "lazy-once" &&
					mode !== "eager" &&
					mode !== "weak"
				) {
					parser.state.module.addWarning(
						new (getUnsupportedFeatureWarning())(
							`\`webpackMode\` expected 'lazy', 'lazy-once', 'eager' or 'weak', but received: ${mode}.`,
							parser.getLocation(expr)
						)
					);
					mode = "lazy";
				}

				const referencedPropertiesInDestructuring =
					parser.destructuringAssignmentPropertiesFor(expr);
				const state = getState(parser, path);
				const referencedPropertiesInMember = state.get(node);
				const fulfilledNamespaceObj =
					importThen && getFulfilledCallbackNamespaceObj(importThen);
				if (
					referencedPropertiesInDestructuring ||
					referencedPropertiesInMember ||
					fulfilledNamespaceObj
				) {
					if (exports) {
						parser.state.module.addWarning(
							new (getUnsupportedFeatureWarning())(
								"You don't need `webpackExports` if the usage of dynamic import is statically analyse-able. You can safely remove the `webpackExports` magic comment.",
								parser.getLocation(expr)
							)
						);
					}

					if (referencedPropertiesInDestructuring) {
						/** @type {ReferencedSpecifiers} */
						const refsInDestructuring = [];
						traverseDestructuringAssignmentProperties(
							referencedPropertiesInDestructuring,
							(stack) => refsInDestructuring.push(stack.map((p) => p.id))
						);

						exports = refsInDestructuring;
					} else if (referencedPropertiesInMember) {
						exports = referencedPropertiesInMember;
					} else {
						/** @type {ReferencedSpecifiers} */
						const references = [];
						state.set(node, references);

						exports = references;
					}
				}

				// only a second argument holds attributes, the rest read none
				const attributes =
					optionsNode === 0
						? undefined
						: getImportAttributes(
								/** @type {ImportExpression} */ (path.object(node))
							);
				// a second argument that isn't a static attributes object stays in
				// the output: it is evaluated and validated at runtime, per spec
				const runtimeOptions =
					optionsNode !== 0 &&
					!isStaticStringAttributes(
						/** @type {ImportExpression} */ (path.object(node)).options
					);

				if (param.isString()) {
					if (mode === "eager") {
						const dep = new ImportEagerDependency(
							/** @type {string} */ (param.string),
							range,
							exports,
							phase,
							attributes
						);
						parser.state.current.addDependency(dep);
					} else if (mode === "weak") {
						const dep = new ImportWeakDependency(
							/** @type {string} */ (param.string),
							range,
							exports,
							phase,
							attributes
						);
						parser.state.current.addDependency(dep);
					} else {
						const depBlock = new AsyncDependenciesBlock(
							{
								...groupOptions,
								name: chunkName
							},
							parser.getLocation(expr),
							param.string
						);
						// the static attributes of runtime options are unreliable
						const dep = new ImportDependency(
							/** @type {string} */ (param.string),
							range,
							exports,
							phase,
							runtimeOptions ? undefined : attributes
						);
						if (runtimeOptions) {
							dep.optionsRange = path.range(optionsNode);
							// The options expression stays in the output, so walk it to
							// register its variable references and keep them from being
							// tree-shaken away.
							parser.walkExpression(parser.nodeOfPath(path, optionsNode));
						}
						dep.loc = parser.getLocation(expr);
						dep.optional = Boolean(parser.scope.inTry);
						depBlock.addDependency(dep);
						parser.state.current.addBlock(depBlock);
						ESMImportGuard.attachDependencyGuards(parser, dep);
					}
				} else {
					if (mode === "weak") {
						mode = "async-weak";
					}

					const dep = ContextDependencyHelpers.create(
						ImportContextDependency,
						range,
						param,
						expr,
						this.options,
						{
							chunkName,
							groupOptions,
							include,
							exclude,
							mode,
							namespaceObject: parser.state.module.buildMeta.strictHarmonyModule
								? "strict"
								: true,
							typePrefix: "import()",
							category: "esm",
							referencedExports: exports,
							attributes,
							phase
						},
						parser
					);
					if (!dep) return;
					// The context module ignores the options argument, but the spec
					// evaluates it, so anything but a static attributes object stays.
					if (runtimeOptions) {
						/** @type {ImportContextDependency} */ (dep).optionsRange =
							path.range(optionsNode);
						parser.walkExpression(parser.nodeOfPath(path, optionsNode));
					}
					dep.loc = parser.getLocation(expr);
					dep.optional = Boolean(parser.scope.inTry);
					parser.state.current.addDependency(dep);
				}

				if (fulfilledNamespaceObj) {
					walkImportThenFulfilledCallback(
						parser,
						path,
						node,
						/** @type {ArrowFunctionExpression | FunctionExpression} */
						(importThen.arguments[0]),
						fulfilledNamespaceObj
					);
					parser.walkExpressions(importThen.arguments.slice(1));
				} else if (importThen) {
					parser.walkExpressions(importThen.arguments);
				}

				return true;
			}
		);
	}
}

module.exports = ImportParserPlugin;
