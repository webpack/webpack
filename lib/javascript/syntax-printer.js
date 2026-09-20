/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/* eslint-disable camelcase, new-cap -- terser's own API, which this speaks */

// cspell:ignore DEFMETHOD, Defun, defun, fnames, funarg, classnames, mangleable, unmangleable

/** @typedef {EXPECTED_ANY} TerserModules terser's own modules */
/** @typedef {{ minify: typeof import("terser").minify, phases: string[] }} Terser what a caller minifies with */

/**
 * A phase webpack implements in place of terser's. `supports` reads the
 * installed terser and says whether this phase still fits it.
 * @typedef {{ name: string, supports: (modules: TerserModules) => boolean, install: (modules: TerserModules) => void }} Phase
 */

/** @typedef {EXPECTED_ANY} SymbolDefinition one of terser's `SymbolDef`s */
/** @typedef {EXPECTED_ANY} Scope one of terser's scope nodes */

// The bit terser sets on a definition an `export` names, which has to keep the
// name it is exported under.
const EXPORT_KEEPS_ITS_NAME = 1;

/**
 * Whether this terser exposes what the phase reads. A version that moved any of
 * it keeps its own mangler rather than getting a wrong one.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const manglingFits = ({ ast, scope, parse }) =>
	typeof scope.format_mangler_options === "function" &&
	typeof scope.base54 === "object" &&
	typeof parse.ALL_RESERVED_WORDS === "object" &&
	typeof ast.AST_Toplevel.prototype.mangle_names === "function";

/**
 * Installs webpack's mangler in place of terser's. Same names in the same
 * order — what changes is that a scope answers "is this name taken" from a set
 * built once, rather than by rescanning its enclosed definitions per candidate.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installMangling = ({ ast, scope, parse }) => {
	const { AST_Toplevel } = ast;
	const original = AST_Toplevel.prototype.mangle_names;
	const { ALL_RESERVED_WORDS } = parse;

	/**
	 * The definition a catch parameter redefines in the enclosing function
	 * scope, which owns the name the two share.
	 * @param {SymbolDefinition} definition the catch parameter's definition
	 * @returns {SymbolDefinition | undefined} the definition it redefines
	 */
	const redefinedCatchDefinition = (definition) => {
		if (
			definition.orig[0] instanceof ast.AST_SymbolCatch &&
			definition.scope.is_block_scope()
		) {
			return definition.scope.get_defun_scope().variables.get(definition.name);
		}
		return undefined;
	};

	AST_Toplevel.DEFMETHOD(
		"mangle_names",
		/**
		 * @this {EXPECTED_ANY} the toplevel being mangled
		 * @param {EXPECTED_ANY} given the mangle options
		 * @returns {void}
		 */
		function mangleNames(given) {
			const options = scope.format_mangler_options(given);
			// This implements the option set a build uses. A name cache, the legacy
			// engine workarounds and kept names stay terser's own.
			if (
				options.cache ||
				options.ie8 ||
				options.safari10 ||
				options.keep_fnames ||
				options.keep_classnames ||
				options.nth_identifier !== scope.base54
			) {
				original.call(this, given);
				return;
			}

			const identifiers = options.nth_identifier;
			/** @type {SymbolDefinition[]} */
			const toMangle = [];
			let labelName = -1;
			/** @type {Set<Scope>} */
			const blockDefunScopes = new Set();
			this.mangled_names = new Set();

			/**
			 * @param {SymbolDefinition} definition a definition in some scope
			 * @returns {void}
			 */
			const collect = (definition) => {
				if (
					!(definition.export & EXPORT_KEEPS_ITS_NAME) &&
					!options.reserved.has(definition.name)
				) {
					toMangle.push(definition);
				}
			};

			const walker = new ast.TreeWalker(
				/**
				 * @param {EXPECTED_ANY} node the node reached
				 * @param {() => void} descend walks its children
				 * @returns {boolean | undefined} true where it walked them itself
				 */
				(node, descend) => {
					if (node instanceof ast.AST_LabeledStatement) {
						const saved = labelName;
						descend();
						labelName = saved;
						return true;
					}
					if (
						node instanceof ast.AST_Defun &&
						!(walker.parent() instanceof ast.AST_Scope)
					) {
						blockDefunScopes.add(node.parent_scope.get_defun_scope());
					}
					if (node instanceof ast.AST_Scope) {
						for (const definition of node.variables.values()) {
							collect(definition);
						}
						return undefined;
					}
					if (node.is_block_scope()) {
						for (const definition of node.block_scope.variables.values()) {
							collect(definition);
						}
						return undefined;
					}
					if (node instanceof ast.AST_Label) {
						let name;
						do {
							name = identifiers.get(++labelName);
						} while (ALL_RESERVED_WORDS.has(name));
						node.mangled_name = name;
						return true;
					}
					if (node instanceof ast.AST_SymbolCatch) {
						toMangle.push(node.definition());
					}
					return undefined;
				}
			);
			this.walk(walker);

			/** @type {Map<Scope, Set<string>>} */
			const takenByScope = new Map();
			// WHY: the names a scope may not reuse are the ones its enclosed
			// definitions carry, and terser rereads that list for every candidate it
			// tries — quadratic in a bundle's one big scope. Reading it once is safe
			// because an enclosed definition belongs to an outer scope, and outer
			// scopes are mangled before inner ones, so the answer no longer moves
			// by the time a scope first asks.
			/**
			 * @param {Scope} owner the scope handing out a name
			 * @returns {Set<string>} the names it may not hand out
			 */
			const takenIn = (owner) => {
				const known = takenByScope.get(owner);
				if (known !== undefined) return known;
				const taken = new Set();
				const { enclosed } = owner;
				for (let i = 0; i < enclosed.length; i++) {
					const definition = enclosed[i];
					const name =
						definition.mangled_name ||
						(definition.unmangleable(options) && definition.name);
					if (name) taken.add(name);
				}
				takenByScope.set(owner, taken);
				return taken;
			};

			for (let i = 0; i < toMangle.length; i++) {
				const definition = toMangle[i];
				if (definition.mangled_name || definition.unmangleable(options)) {
					continue;
				}
				const redefinition = redefinedCatchDefinition(definition);
				if (redefinition) {
					definition.mangled_name =
						redefinition.mangled_name || redefinition.name;
					continue;
				}
				const owner = definition.scope;
				// A function expression's argument may not shadow the name of the
				// function it belongs to, which Safari reads as a syntax error.
				let shadowed = null;
				if (owner instanceof ast.AST_Function && owner.name) {
					const named =
						definition.orig[0] instanceof ast.AST_SymbolFunarg &&
						owner.name.definition();
					if (named) shadowed = named.mangled_name || named.name;
				}
				// A function declared inside a block is reachable from the enclosing
				// function scope too, so that scope is the one handing out the name.
				let counting = owner;
				if (blockDefunScopes.size !== 0) {
					const defunScope = owner.get_defun_scope();
					if (defunScope && blockDefunScopes.has(defunScope)) {
						counting = defunScope;
					}
				}
				const taken = takenIn(counting);
				let name;
				for (;;) {
					name = identifiers.get(++counting.cname);
					if (ALL_RESERVED_WORDS.has(name)) continue;
					if (options.reserved.has(name)) continue;
					if (taken.has(name)) continue;
					if (shadowed !== null && shadowed === name) continue;
					break;
				}
				definition.mangled_name = name;
			}
		}
	);
};

// The phases webpack has taken over. Each one replaces a method on the
// minifier's own classes and is expected to write exactly what it wrote, only
// faster; a new phase is added here and nowhere else.
/** @type {Phase[]} */
const PHASES = [
	{ name: "mangle", supports: manglingFits, install: installMangling }
];

/** @type {Promise<Terser> | undefined} */
let loading;

/**
 * terser's sources, which the published entry point does not expose — it is a
 * bundle whose only exports are `minify` and friends, while a phase has to
 * reach the classes behind them.
 * @returns {Promise<TerserModules & { minify: typeof import("terser").minify }>} the modules
 */
const loadSources = async () => {
	const path = require("path");
	const { pathToFileURL } = require("url");

	// Built at call time so a runtime without dynamic import fails here rather
	// than when this file is first read.
	// eslint-disable-next-line no-new-func
	const importModule = new Function("specifier", "return import(specifier)");
	const directory = path.dirname(require.resolve("terser/package.json"));
	/**
	 * @param {string} file a file in terser's `lib`
	 * @returns {Promise<EXPECTED_ANY>} the module
	 */
	const at = (file) =>
		importModule(pathToFileURL(path.join(directory, "lib", file)).href);
	// One at a time: asking for several at once leaves an embedder's module
	// loader linking a module that another import is still reading.
	const ast = await at("ast.js");
	// Read for its effect: it installs `transform` on every node class.
	await at("transform.js");
	const scope = await at("scope.js");
	const parse = await at("parse.js");
	const { minify } = await at("minify.js");
	return { ast, scope, parse, minify };
};

/**
 * terser, carrying whichever phases webpack owns and this terser still fits.
 * Falls back to the published entry point — a terser that moved what a phase
 * reads, or a runtime that cannot import the sources, minifies as it always
 * did. The answer is cached, so a worker loads terser once.
 * @returns {Promise<Terser>} terser and the phases installed into it
 */
const load = () => {
	if (loading !== undefined) return loading;
	loading = loadSources()
		.then((modules) => {
			/** @type {string[]} */
			const phases = [];
			for (const phase of PHASES) {
				if (!phase.supports(modules)) continue;
				phase.install(modules);
				phases.push(phase.name);
			}
			return { minify: modules.minify, phases };
		})
		.catch(() => ({ minify: require("terser").minify, phases: [] }));
	return loading;
};

module.exports = { load, PHASES };
