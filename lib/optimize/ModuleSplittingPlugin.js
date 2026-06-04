/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { parse } = require("acorn");
const HarmonyExportImportedSpecifierDependency = require("../dependencies/HarmonyExportImportedSpecifierDependency");
const HarmonyImportSpecifierDependency = require("../dependencies/HarmonyImportSpecifierDependency");
const ImportDependency = require("../dependencies/ImportDependency");
const SplitExportModule = require("./SplitExportModule");

/** @typedef {import("../Compiler")} Compiler */
/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Dependency")} Dependency */
/** @typedef {import("../DependenciesBlock")} DependenciesBlock */
/** @typedef {import("../Module")} Module */
/** @typedef {import("../ModuleGraph")} ModuleGraph */
/** @typedef {{ specifiers: Map<string, Dependency[]>, unsafe: boolean }} IncomingInfo */

const PLUGIN_NAME = "ModuleSplittingPlugin";

/**
 * Collects identifier names referenced as values within a node, skipping
 * non-computed property keys and member property names.
 * @param {EXPECTED_ANY} node ast node
 * @param {Set<string>} out collected names
 * @returns {void}
 */
const collectReferenced = (node, out) => {
	if (Array.isArray(node)) {
		for (const child of node) collectReferenced(child, out);
		return;
	}
	if (!node || typeof node.type !== "string") return;
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
			collectReferenced(node.value, out);
			return;
		default:
			for (const key of Object.keys(node)) {
				if (key === "type" || key === "start" || key === "end") continue;
				const value = node[key];
				if (value && typeof value === "object") collectReferenced(value, out);
			}
	}
};

/**
 * Collects names bound (declared) within a node: function params, local
 * function/class ids, and variable declarators.
 * @param {EXPECTED_ANY} node ast node
 * @param {Set<string>} out collected names
 * @returns {void}
 */
const collectBoundNames = (node, out) => {
	if (Array.isArray(node)) {
		for (const child of node) collectBoundNames(child, out);
		return;
	}
	if (!node || typeof node.type !== "string") return;
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
 * @param {EXPECTED_ANY} node ast node
 * @param {Set<string>} out collected names
 * @returns {void}
 */
const collectInnerBindings = (node, out) => {
	if (Array.isArray(node)) {
		for (const child of node) collectInnerBindings(child, out);
		return;
	}
	if (!node || typeof node.type !== "string") return;
	if (
		node.type === "FunctionExpression" ||
		node.type === "FunctionDeclaration" ||
		node.type === "ArrowFunctionExpression"
	) {
		if (node.id) out.add(node.id.name);
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
	for (const key of Object.keys(node)) {
		if (key === "type" || key === "start" || key === "end") continue;
		const value = node[key];
		if (value && typeof value === "object") collectInnerBindings(value, out);
	}
};

/**
 * Whether evaluating `node` at the top level (as a const initializer) is free
 * of side effects. Function/arrow bodies are not evaluated, so they are pure as
 * values regardless of their contents.
 * @param {EXPECTED_ANY} node ast node
 * @returns {boolean} true if pure
 */
const isPureInitializer = (node) => {
	if (!node || typeof node.type !== "string") return false;
	switch (node.type) {
		case "Literal":
		case "Identifier":
		case "ArrowFunctionExpression":
		case "FunctionExpression":
			return true;
		case "TemplateLiteral":
			return node.expressions.every(isPureInitializer);
		case "UnaryExpression":
			return isPureInitializer(node.argument);
		case "BinaryExpression":
		case "LogicalExpression":
			return isPureInitializer(node.left) && isPureInitializer(node.right);
		case "ConditionalExpression":
			return (
				isPureInitializer(node.test) &&
				isPureInitializer(node.consequent) &&
				isPureInitializer(node.alternate)
			);
		case "ArrayExpression":
			return node.elements.every(
				(/** @type {EXPECTED_ANY} */ e) =>
					e === null || (e.type !== "SpreadElement" && isPureInitializer(e))
			);
		case "ObjectExpression":
			return node.properties.every(
				(/** @type {EXPECTED_ANY} */ p) =>
					p.type === "Property" &&
					!p.computed &&
					p.kind === "init" &&
					isPureInitializer(p.value)
			);
		default:
			return false;
	}
};

/**
 * Splits self-contained, side-effect-free named exports of a module into their
 * own synthetic modules so the chunk graph can place them independently. Each
 * such export, once redirected, becomes unused in the host and is dropped there
 * by normal tree-shaking, while its declaration follows the importing chunk.
 *
 * Experimental (gated by `experiments.moduleSplitting`); conservative — bails on
 * anything not provably safe. See RFC-module-splitting.md.
 */
class ModuleSplittingPlugin {
	/**
	 * @param {Compiler} compiler the compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
			compilation.hooks.finishModules.tap(PLUGIN_NAME, (modules) => {
				this.splitModules(compilation, [...modules]);
			});
		});
	}

	/**
	 * @param {Compilation} compilation compilation
	 * @param {Module[]} modules snapshot of modules
	 * @returns {void}
	 */
	splitModules(compilation, modules) {
		const moduleGraph = compilation.moduleGraph;
		const syncReachable = this.computeSyncReachable(compilation);
		const incoming = this.buildIncomingIndex(compilation);
		for (const host of modules) {
			if (host instanceof SplitExportModule) continue;
			if (!host.type || !host.type.startsWith("javascript/")) continue;
			const buildInfo = host.buildInfo;
			const buildMeta = host.buildMeta;
			// Strict ESM only — preserves namespace/live-binding semantics.
			if (!buildInfo || buildInfo.strict !== true) continue;
			if (!buildMeta || buildMeta.exportsType !== "namespace") continue;
			// No benefit unless the host itself lives in an initial (sync) chunk.
			if (!syncReachable.has(host)) continue;
			const info = incoming.get(host);
			// Bail when the namespace/exports are consumed as a whole (dynamic
			// import, `export *`, or whole-namespace import) — splitting would break
			// namespace completeness or export identity.
			if (info === undefined || info.unsafe) continue;
			const original = host.originalSource && host.originalSource();
			if (!original) continue;
			const candidates = this.findSplittableExports(String(original.source()));
			if (candidates === undefined || candidates.length === 0) continue;
			for (const candidate of candidates) {
				const specifierDeps = info.specifiers.get(candidate.name);
				if (specifierDeps === undefined || specifierDeps.length === 0) continue;
				// Only worth splitting when every importer is async-only, so the
				// part follows the async chunk instead of staying initial.
				const beneficial = specifierDeps.every((dep) => {
					const parent = moduleGraph.getParentModule(dep);
					return (
						parent !== undefined &&
						parent !== null &&
						!syncReachable.has(parent)
					);
				});
				if (!beneficial) continue;
				this.splitExport(compilation, host, candidate, specifierDeps);
			}
		}
	}

	/**
	 * Builds a reverse index of incoming dependencies per module: named
	 * specifier references grouped by export, and an `unsafe` flag set when the
	 * module's whole namespace/exports are consumed (so it must not be split).
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
				entry = { specifiers: new Map(), unsafe: false };
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
						entryOf(target).unsafe = true;
						return;
					}
					const specifiers = entryOf(target).specifiers;
					const list = specifiers.get(ids[0]);
					if (list === undefined) specifiers.set(ids[0], [dep]);
					else list.push(dep);
				} else if (
					dep instanceof HarmonyExportImportedSpecifierDependency ||
					dep instanceof ImportDependency
				) {
					entryOf(target).unsafe = true;
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
	 * Parses the module source and returns the named `const` exports that are
	 * pure and self-contained, or undefined when parsing fails.
	 * @param {string} source module source
	 * @returns {{ name: string, localName: string, declaration: string }[] | undefined} candidates
	 */
	findSplittableExports(source) {
		let ast;
		try {
			ast = parse(source, {
				ecmaVersion: "latest",
				sourceType: "module",
				ranges: false
			});
		} catch (_err) {
			return undefined;
		}
		const body = /** @type {EXPECTED_ANY[]} */ (ast.body);

		// Module-scope binding names (incl. hoisted `var` anywhere) — referencing
		// any of these makes an initializer non-self-contained.
		const moduleScopeNames = new Set();
		for (const node of body) {
			switch (node.type) {
				case "ImportDeclaration":
					for (const s of node.specifiers) moduleScopeNames.add(s.local.name);
					break;
				case "FunctionDeclaration":
				case "ClassDeclaration":
					if (node.id) moduleScopeNames.add(node.id.name);
					break;
				case "VariableDeclaration":
					for (const d of node.declarations) {
						collectBoundNames(d.id, moduleScopeNames);
					}
					break;
				case "ExportNamedDeclaration":
					if (node.declaration) {
						if (node.declaration.type === "VariableDeclaration") {
							for (const d of node.declaration.declarations) {
								collectBoundNames(d.id, moduleScopeNames);
							}
						} else if (node.declaration.id) {
							moduleScopeNames.add(node.declaration.id.name);
						}
					}
					break;
				case "ExportDefaultDeclaration":
					if (node.declaration && node.declaration.id) {
						moduleScopeNames.add(node.declaration.id.name);
					}
					break;
				default:
			}
		}
		this.collectHoistedVars(ast, moduleScopeNames);

		const candidates = [];
		for (const node of body) {
			if (
				node.type !== "ExportNamedDeclaration" ||
				node.declaration === null ||
				node.declaration === undefined ||
				node.declaration.type !== "VariableDeclaration" ||
				node.declaration.kind !== "const" ||
				node.declaration.declarations.length !== 1
			) {
				continue;
			}
			const declarator = node.declaration.declarations[0];
			if (
				declarator.id.type !== "Identifier" ||
				declarator.init === null ||
				declarator.init === undefined
			) {
				continue;
			}
			const name = declarator.id.name;
			if (name === "default") continue;
			if (!isPureInitializer(declarator.init)) continue;
			if (!this.isSelfContained(declarator.init, moduleScopeNames)) continue;

			const declaration = `const ${source.slice(
				declarator.start,
				declarator.end
			)}`;
			candidates.push({ name, localName: name, declaration });
		}

		// `export default <expr>` — extracted into a synthetic local binding.
		for (const node of body) {
			if (node.type !== "ExportDefaultDeclaration") continue;
			const decl = node.declaration;
			if (!isPureInitializer(decl)) continue;
			if (!this.isSelfContained(decl, moduleScopeNames)) continue;
			const localName = "__WEBPACK_SPLIT_DEFAULT__";
			const declaration = `const ${localName} = ${source.slice(
				decl.start,
				decl.end
			)}`;
			candidates.push({ name: "default", localName, declaration });
		}
		return candidates;
	}

	/**
	 * Whether the free variables of `node` reference no module-scope binding, so
	 * the node can be moved into its own module unchanged.
	 * @param {EXPECTED_ANY} node initializer node
	 * @param {Set<string>} moduleScopeNames module-scope binding names
	 * @returns {boolean} true if self-contained
	 */
	isSelfContained(node, moduleScopeNames) {
		const referenced = new Set();
		collectReferenced(node, referenced);
		const inner = new Set();
		collectInnerBindings(node, inner);
		for (const ref of referenced) {
			if (!inner.has(ref) && moduleScopeNames.has(ref)) return false;
		}
		return true;
	}

	/**
	 * @param {EXPECTED_ANY} node ast node
	 * @param {Set<string>} out collected names
	 * @returns {void}
	 */
	collectHoistedVars(node, out) {
		if (Array.isArray(node)) {
			for (const child of node) this.collectHoistedVars(child, out);
			return;
		}
		if (!node || typeof node.type !== "string") return;
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
		for (const key of Object.keys(node)) {
			if (key === "type" || key === "start" || key === "end") continue;
			const value = node[key];
			if (value && typeof value === "object") {
				this.collectHoistedVars(value, out);
			}
		}
	}

	/**
	 * @param {Compilation} compilation compilation
	 * @param {Module} host host module
	 * @param {{ name: string, localName: string, declaration: string }} candidate candidate
	 * @param {import("../Dependency")[]} specifierDeps importer specifier deps to redirect
	 * @returns {void}
	 */
	splitExport(compilation, host, candidate, specifierDeps) {
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
			/** @type {EXPECTED_ANY} */ (null),
			/** @type {EXPECTED_ANY} */ (null),
			() => {}
		);
		compilation.modules.add(part);

		const exportsInfo = moduleGraph.getExportsInfo(part);
		exportsInfo.setHasProvideInfo();
		const exportInfo = exportsInfo.getExportInfo(candidate.name);
		exportInfo.provided = true;
		exportInfo.canMangleProvide = false;

		for (const dep of specifierDeps) moduleGraph.updateModule(dep, part);
	}
}

module.exports = ModuleSplittingPlugin;
