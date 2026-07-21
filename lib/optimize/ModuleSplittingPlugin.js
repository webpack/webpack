/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC,
	JAVASCRIPT_MODULE_TYPE_ESM
} = require("../ModuleTypeConstants");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");
const ImportDependency = require("../dependencies/ImportDependency");
const NamespaceFacadeModule = require("./NamespaceFacadeModule");
const SplitExportModule = require("./SplitExportModule");

const { FacadeDependency } = NamespaceFacadeModule;

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependenciesBlock")} DependenciesBlock */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {import("../ResolverFactory").ResolverWithOptions} ResolverWithOptions */
/** @typedef {import("../javascript/JavascriptParser")} JavascriptParser */
/** @typedef {import("../util/fs").InputFileSystem} InputFileSystem */
/** @typedef {import("estree").Declaration} Declaration */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").ModuleDeclaration} ModuleDeclaration */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Statement} Statement */
/** @typedef {Program["body"]} ProgramBody */
/** @typedef {[number, number]} Range */
/** @typedef {import("./NamespaceFacadeModule").FacadeEntry} FacadeEntry */
/** @typedef {{ name: string, localName: string, prefix: string, start: number, end: number, referenced: string[] }} RawCandidate */
/** @typedef {{ scope: string[], sideEffectFree: boolean, candidates: RawCandidate[] }} ModuleSplittingInfo */
/** @typedef {{ name: string, localName: string, declaration: string }} Candidate */
/** @typedef {{ candidates: Map<string, Candidate>, hint: boolean | undefined, sideEffectFree: boolean }} AnalysisResult */
/** @typedef {RegExp | string | (RegExp | string)[]} ModuleSplittingFilter */
/** @typedef {{ specifiers: Map<string, Dependency[]>, namespaceConsumers: Dependency[], reexported: boolean }} IncomingInfo */

const PLUGIN_NAME = "ModuleSplittingPlugin";

const JS_TYPES = [
	JAVASCRIPT_MODULE_TYPE_AUTO,
	JAVASCRIPT_MODULE_TYPE_ESM,
	JAVASCRIPT_MODULE_TYPE_DYNAMIC
];

/**
 * Visits the child nodes of an AST node (generic structural walk).
 * @param {Node} node ast node
 * @param {(child: Node) => void} fn visitor
 * @returns {void}
 */
const walkChildren = (node, fn) => {
	const record = /** @type {Record<string, unknown>} */ (
		/** @type {unknown} */ (node)
	);
	for (const key of Object.keys(record)) {
		if (key === "type" || key === "start" || key === "end") continue;
		const value = record[key];
		if (Array.isArray(value)) {
			for (const item of value) {
				if (item && typeof item === "object") fn(/** @type {Node} */ (item));
			}
		} else if (value && typeof value === "object") {
			fn(/** @type {Node} */ (value));
		}
	}
};

/**
 * Collects identifier names referenced as values within a node, skipping
 * non-computed property keys and member property names.
 * @param {Node} node ast node
 * @param {Set<string>} out collected names
 * @returns {void}
 */
const collectReferenced = (node, out) => {
	switch (node.type) {
		case "Identifier":
			out.add(node.name);
			return;
		case "MemberExpression":
			collectReferenced(node.object, out);
			if (node.computed) collectReferenced(node.property, out);
			return;
		case "Property":
			if (node.computed) collectReferenced(node.key, out);
			collectReferenced(node.value, out);
			return;
		case "MethodDefinition":
		case "PropertyDefinition":
			if (node.computed) collectReferenced(node.key, out);
			if (node.value) collectReferenced(node.value, out);
			return;
		default:
			walkChildren(node, (child) => collectReferenced(child, out));
	}
};

/**
 * Collects names bound (declared) within a node: function params, local
 * function/class ids, and variable declarators.
 * @param {Node} node ast node
 * @param {Set<string>} out collected names
 * @returns {void}
 */
const collectBoundNames = (node, out) => {
	switch (node.type) {
		case "Identifier":
			out.add(node.name);
			return;
		case "ObjectPattern":
			for (const p of node.properties) collectBoundNames(p, out);
			return;
		case "ArrayPattern":
			for (const e of node.elements) if (e) collectBoundNames(e, out);
			return;
		case "AssignmentPattern":
			collectBoundNames(node.left, out);
			return;
		case "RestElement":
			collectBoundNames(node.argument, out);
			return;
		case "Property":
			collectBoundNames(node.value, out);
			break;
		default:
	}
};

/**
 * Walks a node collecting names bound anywhere inside it (params, local ids,
 * variable declarators); used to subtract from referenced names to get the
 * free variables of an initializer.
 * @param {Node} node ast node
 * @param {Set<string>} out collected names
 * @returns {void}
 */
const collectInnerBindings = (node, out) => {
	if (
		node.type === "FunctionExpression" ||
		node.type === "FunctionDeclaration"
	) {
		if (node.id) out.add(node.id.name);
		for (const p of node.params) collectBoundNames(p, out);
	} else if (node.type === "ArrowFunctionExpression") {
		for (const p of node.params) collectBoundNames(p, out);
	} else if (
		node.type === "ClassExpression" ||
		node.type === "ClassDeclaration"
	) {
		if (node.id) out.add(node.id.name);
	} else if (node.type === "VariableDeclarator") {
		collectBoundNames(node.id, out);
	} else if (node.type === "CatchClause" && node.param) {
		collectBoundNames(node.param, out);
	}
	walkChildren(node, (child) => collectInnerBindings(child, out));
};

/**
 * Experimental (`experiments.moduleSplitting`): a module is the atomic unit of
 * chunk placement and export usage is tracked per-runtime, so an export used only
 * through an async boundary still lands in the initial chunk. This plugin moves
 * such self-contained, side-effect-free exports into synthetic part-modules (and,
 * for namespace consumers, behind a facade) so the chunk graph can place them
 * independently. Conservative — bails on anything not provably safe.
 */
class ModuleSplittingPlugin {
	/**
	 * @param {boolean | { include?: ModuleSplittingFilter, exclude?: ModuleSplittingFilter }=} options experiment options
	 */
	constructor(options) {
		const opts = options && typeof options === "object" ? options : {};
		/** @type {ModuleSplittingFilter | undefined} */
		this.include = opts.include;
		/** @type {ModuleSplittingFilter | undefined} */
		this.exclude = opts.exclude;
	}

	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			PLUGIN_NAME,
			(compilation, { normalModuleFactory }) => {
				// Per-module `module.rules` flag: { test: ..., moduleSplitting: bool }.
				normalModuleFactory.hooks.module.tap(PLUGIN_NAME, (module, data) => {
					const flag = data.settings && data.settings.moduleSplitting;
					if (typeof flag === "boolean") {
						if (module.factoryMeta === undefined) module.factoryMeta = {};
						module.factoryMeta.moduleSplitting = flag;
					}
					return module;
				});
				// Record split candidates during parse, reusing the parser's own
				// `isPure` (handles /*#__PURE__*/, pure hooks, classes, …).
				const onParser = (/** @type {JavascriptParser} */ parser) =>
					this.tapParser(parser);
				for (const type of JS_TYPES) {
					normalModuleFactory.hooks.parser.for(type).tap(PLUGIN_NAME, onParser);
				}
				compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
					this.splitModules(compilation, [...modules]);
				});
			}
		);
	}

	/**
	 * Records each module's split candidates and side-effect status at parse
	 * time into `buildInfo`, using the parser's authoritative `isPure`.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	tapParser(parser) {
		// One pass over the top level in `program`: the per-export hooks can't be
		// used because HarmonyExportDependencyParserPlugin bails them.
		parser.hooks.program.tap(PLUGIN_NAME, (ast) => {
			const module = parser.state.module;
			if (!module || !module.buildInfo) return;
			const body = /** @type {Program} */ (ast).body;
			/** @type {ModuleSplittingInfo} */
			const info = {
				scope: [...this.collectModuleScope(body)],
				sideEffectFree: this.isBodySideEffectFree(parser, body),
				candidates: []
			};
			for (const node of body) {
				if (
					node.type === "ExportNamedDeclaration" &&
					node.declaration &&
					node.declaration.type === "VariableDeclaration" &&
					node.declaration.kind === "const" &&
					node.declaration.declarations.length === 1
				) {
					const d = node.declaration.declarations[0];
					if (
						d.id.type === "Identifier" &&
						d.init &&
						parser.isPure(d.init, /** @type {Range} */ (d.init.range)[0])
					) {
						info.candidates.push(
							this.rawCandidate(
								d.id.name,
								d.id.name,
								"const ",
								/** @type {Range} */ (d.range),
								d.init
							)
						);
					}
				} else if (node.type === "ExportDefaultDeclaration") {
					const decl = node.declaration;
					if (
						decl.type !== "FunctionDeclaration" &&
						decl.type !== "ClassDeclaration" &&
						parser.isPure(decl, /** @type {Range} */ (decl.range)[0])
					) {
						info.candidates.push(
							this.rawCandidate(
								"default",
								"__WEBPACK_SPLIT_DEFAULT__",
								"const __WEBPACK_SPLIT_DEFAULT__ = ",
								/** @type {Range} */ (decl.range),
								decl
							)
						);
					}
				}
			}
			module.buildInfo.moduleSplitting = info;
		});
	}

	/**
	 * @param {string} name export name
	 * @param {string} localName local binding name
	 * @param {string} prefix declaration prefix (e.g. `const `)
	 * @param {Range} range declaration value range
	 * @param {Expression} init initializer node (for self-containment)
	 * @returns {RawCandidate} raw candidate
	 */
	rawCandidate(name, localName, prefix, range, init) {
		const referenced = new Set();
		collectReferenced(init, referenced);
		const inner = new Set();
		collectInnerBindings(init, inner);
		const free = [];
		for (const ref of referenced) if (!inner.has(ref)) free.push(ref);
		return {
			name,
			localName,
			prefix,
			start: range[0],
			end: range[1],
			referenced: free
		};
	}

	/**
	 * Collects module-scope binding names (incl. hoisted `var`).
	 * @param {ProgramBody} body program body
	 * @returns {Set<string>} names
	 */
	collectModuleScope(body) {
		const names = new Set();
		for (const node of body) {
			switch (node.type) {
				case "ImportDeclaration":
					for (const s of node.specifiers) names.add(s.local.name);
					break;
				case "FunctionDeclaration":
				case "ClassDeclaration":
					if (node.id) names.add(node.id.name);
					break;
				case "VariableDeclaration":
					for (const d of node.declarations) collectBoundNames(d.id, names);
					break;
				case "ExportNamedDeclaration":
					if (node.declaration) {
						if (node.declaration.type === "VariableDeclaration") {
							for (const d of node.declaration.declarations) {
								collectBoundNames(d.id, names);
							}
						} else if (node.declaration.id) {
							names.add(node.declaration.id.name);
						}
					}
					break;
				case "ExportDefaultDeclaration": {
					const decl = node.declaration;
					if (
						(decl.type === "FunctionDeclaration" ||
							decl.type === "ClassDeclaration") &&
						decl.id
					) {
						names.add(decl.id.name);
					}
					break;
				}
				default:
			}
			this.collectHoistedVars(node, names);
		}
		return names;
	}

	/**
	 * Whether every top-level statement is side-effect-free (imports/exports/pure
	 * declarations), reusing the parser's `isPure`.
	 * @param {JavascriptParser} parser the parser
	 * @param {ProgramBody} body program body
	 * @returns {boolean} true if side-effect-free
	 */
	isBodySideEffectFree(parser, body) {
		for (const node of body) {
			switch (node.type) {
				case "ImportDeclaration":
				case "FunctionDeclaration":
				case "ClassDeclaration":
				case "ExportAllDeclaration":
					break;
				case "VariableDeclaration":
					if (!parser.isPure(node, /** @type {Range} */ (node.range)[0])) {
						return false;
					}
					break;
				case "ExportNamedDeclaration":
					if (
						node.declaration &&
						!parser.isPure(
							node.declaration,
							/** @type {Range} */ (node.declaration.range)[0]
						)
					) {
						return false;
					}
					break;
				case "ExportDefaultDeclaration":
					if (
						node.declaration.type !== "FunctionDeclaration" &&
						node.declaration.type !== "ClassDeclaration" &&
						!parser.isPure(
							node.declaration,
							/** @type {Range} */ (node.declaration.range)[0]
						)
					) {
						return false;
					}
					break;
				default:
					return false;
			}
		}
		return true;
	}

	/**
	 * Whether `module`'s exports may be split, by precedence: in-source
	 * `webpackSplit` hint > `module.rules` flag > experiments include/exclude >
	 * automatic default. The automatic default follows Turbopack: only modules
	 * proven side-effect-free (by `sideEffects` declaration or source analysis)
	 * are split; an `include` allowlist opts a module in regardless.
	 * @param {Module} module module that would be split
	 * @param {Map<Module, AnalysisResult>} cache analysis cache
	 * @returns {boolean} true when eligible
	 */
	isEligible(module, cache) {
		const hint = this.analyze(module, cache).hint;
		if (hint !== undefined) return hint;
		const factoryMeta = module.factoryMeta;
		if (factoryMeta && typeof factoryMeta.moduleSplitting === "boolean") {
			return factoryMeta.moduleSplitting;
		}
		const resource = /** @type {{ resource?: string }} */ (module).resource;
		if (this.exclude && this.matchesFilter(this.exclude, resource)) {
			return false;
		}
		// An explicit allowlist opts a module in regardless of side effects.
		if (this.include) return this.matchesFilter(this.include, resource);
		// Turbopack default: only split modules proven side-effect-free.
		return this.isSideEffectFree(module, cache);
	}

	/**
	 * @param {ModuleSplittingFilter} filter filter
	 * @param {string | undefined} value module resource path
	 * @returns {boolean} true when the value matches
	 */
	matchesFilter(filter, value) {
		if (!value) return false;
		const conditions = Array.isArray(filter) ? filter : [filter];
		return conditions.some((condition) =>
			condition instanceof RegExp
				? condition.test(value)
				: value.includes(condition)
		);
	}

	/**
	 * @param {Compilation} compilation compilation
	 * @param {Module[]} modules snapshot of modules
	 * @returns {void}
	 */
	splitModules(compilation, modules) {
		const syncReachable = this.computeSyncReachable(compilation);
		const incoming = this.buildIncomingIndex(compilation);
		/** @type {Map<Module, AnalysisResult>} */
		const cache = new Map();
		for (const host of modules) {
			if (host instanceof SplitExportModule) continue;
			if (host instanceof NamespaceFacadeModule) continue;
			if (!this.isStrictEsm(host)) continue;
			// No benefit unless the host itself lives in an initial (sync) chunk.
			if (!syncReachable.has(host)) continue;
			const info = incoming.get(host);
			if (info === undefined) continue;
			// A host that is itself `export *`-ed elsewhere can't be split safely.
			if (info.reexported) continue;
			if (info.namespaceConsumers.length === 0) {
				if (!this.isEligible(host, cache)) continue;
				const candidates = this.analyze(host, cache).candidates;
				if (candidates.size === 0) continue;
				this.splitSpecifierExports(
					compilation,
					host,
					info,
					candidates,
					syncReachable
				);
			} else {
				this.facadeSplit(compilation, host, info, syncReachable, cache);
			}
		}
	}

	/**
	 * @param {Module} module module
	 * @returns {boolean} true for a strict ESM JavaScript module
	 */
	isStrictEsm(module) {
		return Boolean(
			module.type &&
			module.type.startsWith("javascript/") &&
			module.buildInfo &&
			module.buildInfo.strict === true &&
			module.buildMeta &&
			module.buildMeta.exportsType === "namespace"
		);
	}

	/**
	 * Builds the per-module analysis (cached) from the candidates recorded at
	 * parse time: resolves self-containment against module scope and slices each
	 * declaration's source. No re-parsing — purity already came from the parser.
	 * @param {Module} module module
	 * @param {Map<Module, AnalysisResult>} cache per-compilation cache
	 * @returns {AnalysisResult} analysis
	 */
	analyze(module, cache) {
		let result = cache.get(module);
		if (result !== undefined) return result;
		result = { candidates: new Map(), hint: undefined, sideEffectFree: false };
		const info =
			module.buildInfo &&
			/** @type {ModuleSplittingInfo | undefined} */ (
				module.buildInfo.moduleSplitting
			);
		if (this.isStrictEsm(module) && info) {
			const original = module.originalSource && module.originalSource();
			if (original) {
				const source = String(original.source());
				result.hint = this.readHint(source);
				result.sideEffectFree = info.sideEffectFree;
				const scope = new Set(info.scope);
				for (const candidate of info.candidates) {
					if (candidate.referenced.some((ref) => scope.has(ref))) continue;
					result.candidates.set(candidate.name, {
						name: candidate.name,
						localName: candidate.localName,
						declaration:
							candidate.prefix + source.slice(candidate.start, candidate.end)
					});
				}
			}
		}
		cache.set(module, result);
		return result;
	}

	/**
	 * Whether the module is side-effect-free, by declaration (`sideEffects`) when
	 * known, otherwise by source analysis — the Turbopack-style split gate.
	 * @param {Module} module module
	 * @param {Map<Module, AnalysisResult>} cache analysis cache
	 * @returns {boolean} true if side-effect-free
	 */
	isSideEffectFree(module, cache) {
		const factoryMeta = module.factoryMeta;
		if (factoryMeta && typeof factoryMeta.sideEffectFree === "boolean") {
			return factoryMeta.sideEffectFree;
		}
		return this.analyze(module, cache).sideEffectFree;
	}

	/**
	 * Reads an in-source override: a `webpackSplit` block comment force-enables,
	 * a `webpackSplit: false` block comment force-disables.
	 * @param {string} source module source
	 * @returns {boolean | undefined} the hint, or undefined when absent
	 */
	readHint(source) {
		if (/\/\*\s*webpackSplit\s*:\s*false\s*\*\//.test(source)) return false;
		if (/\/\*\s*webpackSplit\s*(?::\s*true\s*)?\*\//.test(source)) return true;
		return undefined;
	}

	/**
	 * Resolves an export to its terminal origin module/name, following harmony
	 * re-exports (`export { x } from` / `export *`); falls back to the host.
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {Module} host host module
	 * @param {import("../ExportsInfo").ExportInfo} exportInfo export info
	 * @param {string} name export name
	 * @returns {{ module: Module, name: string }} origin
	 */
	resolveOrigin(moduleGraph, host, exportInfo, name) {
		const target = exportInfo.getTarget(moduleGraph);
		if (
			target &&
			target.module &&
			Array.isArray(target.export) &&
			target.export.length === 1
		) {
			return { module: target.module, name: target.export[0] };
		}
		return { module: host, name };
	}

	/**
	 * Phase 1: split each async-only, splittable named/default export into its
	 * own part and redirect the importing specifier dependencies.
	 * @param {Compilation} compilation compilation
	 * @param {Module} host host module
	 * @param {IncomingInfo} info incoming info
	 * @param {Map<string, Candidate>} candidates splittable export candidates by name
	 * @param {Set<Module>} syncReachable sync-reachable modules
	 * @returns {void}
	 */
	splitSpecifierExports(compilation, host, info, candidates, syncReachable) {
		const moduleGraph = compilation.moduleGraph;
		for (const candidate of candidates.values()) {
			const specifierDeps = info.specifiers.get(candidate.name);
			if (specifierDeps === undefined || specifierDeps.length === 0) continue;
			// Only worth splitting when every importer is async-only, so the
			// part follows the async chunk instead of staying initial.
			const beneficial = specifierDeps.every((dep) =>
				this.isAsyncOnlyDep(moduleGraph, dep, syncReachable)
			);
			if (!beneficial) continue;
			const part = this.createPart(compilation, host, candidate);
			for (const dep of specifierDeps) moduleGraph.updateModule(dep, part);
		}
	}

	/**
	 * Phase 2/3: when the host's whole namespace is consumed (dynamic `import()`
	 * / `import *`), build a facade that re-exposes every export — splittable
	 * async-only ones from their parts, the rest from their origin module — and
	 * redirect the namespace consumers to it, so heavy split exports follow the
	 * async chunk. Re-exported (barrel) exports are resolved to their origin via
	 * `getTarget`, so split happens at the module that actually owns the export.
	 * @param {Compilation} compilation compilation
	 * @param {Module} host host module
	 * @param {IncomingInfo} info incoming info
	 * @param {Set<Module>} syncReachable sync-reachable modules
	 * @param {Map<Module, AnalysisResult>} cache analysis cache
	 * @returns {void}
	 */
	facadeSplit(compilation, host, info, syncReachable, cache) {
		const moduleGraph = compilation.moduleGraph;
		// The facade only lands async (and thus only helps) when every namespace
		// consumer is async-only.
		for (const dep of info.namespaceConsumers) {
			if (!this.isAsyncOnlyConsumer(moduleGraph, dep, syncReachable)) return;
		}
		const exportsInfo = moduleGraph.getExportsInfo(host);
		// Need a fully-known export set to faithfully reproduce the namespace.
		if (exportsInfo.otherExportsInfo.provided !== false) return;

		/** @type {FacadeEntry[]} */
		const entries = [];
		let willSplit = false;
		for (const exportInfo of exportsInfo.orderedExports) {
			const name = exportInfo.name;
			if (exportInfo.provided !== true || !name) continue;
			const origin = this.resolveOrigin(moduleGraph, host, exportInfo, name);
			const candidate = this.analyze(origin.module, cache).candidates.get(
				origin.name
			);
			const specifierDeps = info.specifiers.get(name) || [];
			const allAsync = specifierDeps.every((dep) =>
				this.isAsyncOnlyDep(moduleGraph, dep, syncReachable)
			);
			// For a re-exported origin, only split when nothing imports the name by
			// specifier (avoids rename/identity hazards); a local export can also
			// redirect its async specifier importers to the part.
			const local = origin.module === host;
			if (
				candidate !== undefined &&
				allAsync &&
				this.isEligible(origin.module, cache) &&
				(local || specifierDeps.length === 0)
			) {
				const part = this.createPart(compilation, origin.module, candidate);
				if (local) {
					for (const dep of specifierDeps) moduleGraph.updateModule(dep, part);
				}
				entries.push({
					exportName: name,
					sourceModule: part,
					sourceName: origin.name
				});
				willSplit = true;
			} else {
				entries.push({
					exportName: name,
					sourceModule: origin.module,
					sourceName: origin.name
				});
			}
		}
		// No point building a facade if nothing moved into a part.
		if (!willSplit) return;

		const facade = new NamespaceFacadeModule(host.identifier(), entries);
		facade.build(
			compilation.options,
			compilation,
			/** @type {ResolverWithOptions} */ (/** @type {unknown} */ (null)),
			/** @type {InputFileSystem} */ (/** @type {unknown} */ (null)),
			() => {}
		);
		compilation.modules.add(facade);
		const facadeExports = moduleGraph.getExportsInfo(facade);
		facadeExports.setHasProvideInfo();
		for (const entry of entries) {
			const exportInfo = facadeExports.getExportInfo(entry.exportName);
			exportInfo.provided = true;
			// Dynamically-accessed namespace — names must not be mangled away.
			exportInfo.canMangleProvide = false;
		}
		for (const entry of entries) {
			const dep = new FacadeDependency(entry.sourceName);
			facade.addDependency(dep);
			moduleGraph.setParents(dep, facade, facade);
			moduleGraph.setResolvedModule(facade, dep, entry.sourceModule);
		}
		for (const dep of info.namespaceConsumers) {
			moduleGraph.updateModule(dep, facade);
		}
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {Dependency} dep specifier dependency
	 * @param {Set<Module>} syncReachable sync-reachable modules
	 * @returns {boolean} true when the importer is async-only
	 */
	isAsyncOnlyDep(moduleGraph, dep, syncReachable) {
		const parent = moduleGraph.getParentModule(dep);
		return (
			parent !== undefined && parent !== null && !syncReachable.has(parent)
		);
	}

	/**
	 * @param {ModuleGraph} moduleGraph module graph
	 * @param {Dependency} dep namespace-consuming dependency
	 * @param {Set<Module>} syncReachable sync-reachable modules
	 * @returns {boolean} true when the facade would land in an async chunk
	 */
	isAsyncOnlyConsumer(moduleGraph, dep, syncReachable) {
		// A dynamic import always introduces an async chunk boundary.
		if (dep instanceof ImportDependency) return true;
		return this.isAsyncOnlyDep(moduleGraph, dep, syncReachable);
	}

	/**
	 * Builds a reverse index of incoming dependencies per module: specifier
	 * references by export, whole-namespace consumers, and whether the module is
	 * re-exported via `export *`.
	 * @param {Compilation} compilation compilation
	 * @returns {Map<Module, IncomingInfo>} index
	 */
	buildIncomingIndex(compilation) {
		const moduleGraph = compilation.moduleGraph;
		/** @type {Map<Module, IncomingInfo>} */
		const index = new Map();
		/**
		 * @param {Module} module module
		 * @returns {IncomingInfo} entry
		 */
		const entryOf = (module) => {
			let entry = index.get(module);
			if (entry === undefined) {
				entry = {
					specifiers: new Map(),
					namespaceConsumers: [],
					reexported: false
				};
				index.set(module, entry);
			}
			return entry;
		};
		for (const module of compilation.modules) {
			this.forEachDependency(module, (dep) => {
				const connection = moduleGraph.getConnection(dep);
				const target = connection && connection.module;
				if (!target) return;
				if (dep instanceof HarmonyImportSpecifierDependency) {
					const ids = dep.ids;
					if (!Array.isArray(ids) || ids.length === 0) {
						entryOf(target).namespaceConsumers.push(dep);
						return;
					}
					const specifiers = entryOf(target).specifiers;
					const list = specifiers.get(ids[0]);
					if (list === undefined) specifiers.set(ids[0], [dep]);
					else list.push(dep);
				} else if (dep instanceof ImportDependency) {
					entryOf(target).namespaceConsumers.push(dep);
				} else if (dep instanceof HarmonyExportImportedSpecifierDependency) {
					entryOf(target).reexported = true;
				}
			});
		}
		return index;
	}

	/**
	 * Invokes `fn` for every dependency of a block, recursing into nested
	 * (async) blocks.
	 * @param {DependenciesBlock} block block
	 * @param {(dep: Dependency) => void} fn callback
	 * @returns {void}
	 */
	forEachDependency(block, fn) {
		for (const dep of block.dependencies) fn(dep);
		for (const child of block.blocks) this.forEachDependency(child, fn);
	}

	/**
	 * Computes the set of modules reachable from entries through synchronous
	 * dependencies only (i.e. modules that land in an initial chunk).
	 * @param {Compilation} compilation compilation
	 * @returns {Set<Module>} sync-reachable modules
	 */
	computeSyncReachable(compilation) {
		const moduleGraph = compilation.moduleGraph;
		/** @type {Set<Module>} */
		const reachable = new Set();
		/** @type {Module[]} */
		const stack = [];
		/**
		 * @param {Iterable<import("../Dependency")>} deps dependencies
		 * @returns {void}
		 */
		const addEntry = (deps) => {
			for (const dep of deps) {
				const module = moduleGraph.getModule(dep);
				if (module && !reachable.has(module)) {
					reachable.add(module);
					stack.push(module);
				}
			}
		};
		addEntry(compilation.globalEntry.dependencies);
		for (const {
			dependencies,
			includeDependencies
		} of compilation.entries.values()) {
			addEntry(dependencies);
			addEntry(includeDependencies);
		}
		while (stack.length > 0) {
			const module = /** @type {Module} */ (stack.pop());
			// Only top-level deps are synchronous; async blocks are skipped.
			for (const dep of module.dependencies) {
				const target = moduleGraph.getModule(dep);
				if (target && !reachable.has(target)) {
					reachable.add(target);
					stack.push(target);
				}
			}
		}
		return reachable;
	}

	/**
	 * @param {Node} node ast node
	 * @param {Set<string>} out collected names
	 * @returns {void}
	 */
	collectHoistedVars(node, out) {
		// Don't descend into functions — their `var`s are not module-scoped.
		if (
			node.type === "FunctionDeclaration" ||
			node.type === "FunctionExpression" ||
			node.type === "ArrowFunctionExpression"
		) {
			return;
		}
		if (node.type === "VariableDeclaration" && node.kind === "var") {
			for (const d of node.declarations) collectBoundNames(d.id, out);
		}
		walkChildren(node, (child) => this.collectHoistedVars(child, out));
	}

	/**
	 * Creates and registers a part module owning a single split-off export.
	 * @param {Compilation} compilation compilation
	 * @param {Module} host host module
	 * @param {Candidate} candidate candidate
	 * @returns {SplitExportModule} the part module
	 */
	createPart(compilation, host, candidate) {
		const moduleGraph = compilation.moduleGraph;
		const part = new SplitExportModule(
			host.identifier(),
			candidate.name,
			candidate.localName,
			candidate.declaration
		);
		part.build(
			compilation.options,
			compilation,
			/** @type {ResolverWithOptions} */ (/** @type {unknown} */ (null)),
			/** @type {InputFileSystem} */ (/** @type {unknown} */ (null)),
			() => {}
		);
		compilation.modules.add(part);

		const exportsInfo = moduleGraph.getExportsInfo(part);
		exportsInfo.setHasProvideInfo();
		const exportInfo = exportsInfo.getExportInfo(candidate.name);
		exportInfo.provided = true;
		exportInfo.canMangleProvide = false;
		return part;
	}
}

module.exports = ModuleSplittingPlugin;
