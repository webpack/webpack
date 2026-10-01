/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/* eslint-disable camelcase, new-cap -- terser's own API, which this speaks */

// cspell:ignore sequencesize, lvalues, binop, loopcontrol, symbolref, funs, jridgewell, DEFMETHOD, Defun, defun, defuns, fnames, funarg, classnames, mangleable, unmangleable, NOINLINE, privatename, argnames, thedef, argname, bcatch, bfinally, MANGLEPROP, nlb, punc, Funarg, propmangle, preferrably, nondeferred, fargs, domprops, noin, Noin, DEFPRINT, defprint, dgimsuyv, nokeyword

/** @typedef {Record<string, EXPECTED_ANY>} TerserModules terser's own modules */
/** @typedef {{ minify: typeof import("terser").minify, phases: string[], corrections?: { enabled: boolean } }} Terser what a caller minifies with, and the switch of its corrections */

/**
 * A phase webpack implements in place of terser's. `supports` reads the
 * installed terser and says whether this phase still fits it.
 * @typedef {{ name: string, supports: (modules: TerserModules) => boolean, install: (modules: TerserModules) => void }} Phase
 */

/** @typedef {Record<PropertyKey, EXPECTED_ANY>} SymbolDefinition one of terser's `SymbolDef`s */
/** @typedef {Node} Scope one of terser's scope nodes */

// The helpers of terser's `utils/index.js` the phases call, ours, so a phase
// reads only terser's tree and the methods it replaces.

/**
 * terser's `DefaultsError`, what `defaults` throws for an option it does not know.
 */
class DefaultsError extends Error {
	/**
	 * @param {string} message what went wrong
	 * @param {Record<string, EXPECTED_ANY>} defs the options known
	 */
	constructor(message, defs) {
		super();
		this.name = "DefaultsError";
		this.message = message;
		this.defs = defs;
	}
}

/**
 * @param {EXPECTED_OBJECT} object an object
 * @param {PropertyKey} property a key
 * @returns {boolean} whether the object has it as its own
 */
const hasOwn = (object, property) =>
	Object.prototype.hasOwnProperty.call(object, property);

/**
 * terser's `defaults`: the options given, each one missing taken from the defaults.
 * @param {EXPECTED_ANY} given the options given
 * @param {Record<string, EXPECTED_ANY>} defs the defaults
 * @param {boolean=} croak whether an option the defaults lack throws
 * @returns {Record<string, EXPECTED_ANY>} the options
 */
const defaults = (given, defs, croak) => {
	let args = given;
	if (args === true) {
		args = {};
	} else if (args !== null && args !== undefined && typeof args === "object") {
		args = { ...args };
	}
	const options = args || {};
	if (croak) {
		for (const key in options) {
			if (hasOwn(options, key) && !hasOwn(defs, key)) {
				throw new DefaultsError(`\`${key}\` is not a supported option`, defs);
			}
		}
	}
	for (const key in defs) {
		if (!hasOwn(defs, key)) continue;
		if (!args || !hasOwn(args, key)) {
			options[key] = defs[key];
		} else if (key === "ecma" || key === "builtins_ecma") {
			let ecma = args[key] | 0;
			if (ecma > 5 && ecma < 2015) ecma += 2009;
			options[key] = ecma;
		} else {
			options[key] = args[key];
		}
	}
	return options;
};

/**
 * @returns {void}
 */
const noop = () => {};

/**
 * @template T
 * @param {T[]} array a list
 * @param {T} item an item
 * @returns {void}
 */
const pushUnique = (array, item) => {
	if (!array.includes(item)) array.push(item);
};

/**
 * @param {string} text a message with `{name}` holes
 * @param {Record<string, EXPECTED_ANY>=} props what fills them
 * @returns {string} the message filled
 */
const stringTemplate = (text, props) =>
	text.replace(/\{(.+?)\}/g, (_match, name) => props && props[name]);

/**
 * @template T
 * @param {T[]} array a list
 * @param {T} item an item, removed wherever it is
 * @returns {void}
 */
const removeAll = (array, item) => {
	for (let i = array.length; --i >= 0;) {
		if (array[i] === item) array.splice(i, 1);
	}
};

/**
 * terser's stable `mergeSort`, splitting and merging exactly as it does so an
 * inconsistent comparison still orders alike, but into one buffer.
 * @template T
 * @param {T[]} array a list
 * @param {(a: T, b: T) => number} compare the order
 * @returns {T[]} a sorted copy
 */
const mergeSort = (array, compare) => {
	const sorted = [...array];
	if (sorted.length < 2) return sorted;
	/** @type {T[]} */
	const buffer = Array.from({ length: sorted.length });
	/**
	 * @param {number} start the first index
	 * @param {number} end past the last
	 * @returns {void}
	 */
	const sortRange = (start, end) => {
		if (end - start <= 1) return;
		const middle = start + Math.floor((end - start) / 2);
		sortRange(start, middle);
		sortRange(middle, end);
		let left = start;
		let right = middle;
		let out = start;
		while (left < middle && right < end) {
			buffer[out++] =
				compare(sorted[left], sorted[right]) <= 0
					? sorted[left++]
					: sorted[right++];
		}
		while (left < middle) buffer[out++] = sorted[left++];
		while (right < end) buffer[out++] = sorted[right++];
		for (let i = start; i < end; i++) sorted[i] = buffer[i];
	};
	sortRange(0, sorted.length);
	return sorted;
};

/**
 * @template K, V
 * @param {Map<K, V[]>} map a map of lists
 * @param {K} key a key
 * @param {V} value what joins its list
 * @returns {void}
 */
const mapAdd = (map, key, value) => {
	const list = map.get(key);
	if (list !== undefined) list.push(value);
	else map.set(key, [value]);
};

/**
 * @param {Record<string, EXPECTED_ANY>} object what `mapToObject` wrote
 * @returns {Map<string, EXPECTED_ANY>} the map it came from
 */
const mapFromObject = (object) => {
	const map = new Map();
	for (const key in object) {
		if (hasOwn(object, key) && key.charAt(0) === "$") {
			map.set(key.slice(1), object[key]);
		}
	}
	return map;
};

/**
 * @param {Map<string, EXPECTED_ANY>} map a map
 * @returns {Record<string, EXPECTED_ANY>} it as an object, each key after a `$`
 */
const mapToObject = (map) => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const object = Object.create(null);
	for (const [key, value] of map) object[`$${key}`] = value;
	return object;
};

/**
 * @param {boolean | RegExp | undefined} setting a `keep_*` option
 * @param {string} name a name
 * @returns {boolean} whether the option keeps it
 */
const keepName = (setting, name) =>
	setting === true || (setting instanceof RegExp && setting.test(name));

/**
 * terser's `make_node`: a node, taking its position from another.
 * @param {NodeClass | NodeCheck} Type the node class
 * @param {Node=} orig where its position comes from
 * @param {NodeProps=} props its properties
 * @returns {Node} the node
 */
const makeNode = (Type, orig, props) => {
	const properties = props || {};
	if (orig) {
		if (!properties.start) properties.start = orig.start;
		if (!properties.end) properties.end = orig.end;
	}
	return new /** @type {NodeClass} */ (Type)(properties);
};

/**
 * @returns {false} always
 */
const alwaysFalse = () => false;

/**
 * @returns {true} always
 */
const alwaysTrue = () => true;

// Past this many definitions a scope's `enclosed` is also held as a set, so
// adding one stops scanning the list: a bundle's toplevel reaches thousands.
const ENCLOSED_INDEX_THRESHOLD = 16;
/** @type {WeakMap<EXPECTED_ANY[], Set<EXPECTED_ANY>>} */
const enclosedIndexes = new WeakMap();

/**
 * Adds a definition to a scope's `enclosed` unless it is there. The list is
 * the record, since a cloned scope copies it; the set only answers membership.
 * @param {Scope} scope a scope
 * @param {EXPECTED_ANY} definition a definition it reaches
 * @returns {void}
 */
const encloseUnique = (scope, definition) => {
	const { enclosed } = scope;
	if (enclosed.length < ENCLOSED_INDEX_THRESHOLD) {
		if (!enclosed.includes(definition)) enclosed.push(definition);
		return;
	}
	let index = enclosedIndexes.get(enclosed);
	if (index === undefined || index.size !== enclosed.length) {
		index = new Set(enclosed);
		enclosedIndexes.set(enclosed, index);
	}
	if (index.has(definition)) return;
	index.add(definition);
	enclosed.push(definition);
};

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
const installMangling = (modules) => {
	const { ast, scope, parse, webpackScope } = modules;
	const {
		AST_Conditional,
		AST_Dot,
		AST_DotHash,
		AST_Label,
		AST_LabeledStatement,
		AST_Lambda,
		AST_Node,
		AST_Scope,
		AST_Sequence,
		AST_String,
		AST_Sub,
		AST_Symbol,
		AST_SymbolCatch,
		AST_Defun,
		AST_Toplevel,
		AST_VarDef,
		TreeWalker
	} = ast;
	const original = AST_Toplevel.prototype.mangle_names;
	const { ALL_RESERVED_WORDS } = parse;

	/**
	 * terser's `format_mangler_options`: the mangle options, defaulted, their
	 * reserved names a set that always holds `arguments`.
	 * @param {EXPECTED_ANY} given the mangle options given
	 * @returns {EXPECTED_ANY} the options
	 */
	const formatManglerOptions = (given) => {
		const options = defaults(given, {
			eval: false,
			nth_identifier: scope.base54,
			ie8: false,
			keep_classnames: false,
			keep_fnames: false,
			module: false,
			reserved: [],
			toplevel: false
		});
		if (options.module) options.toplevel = true;
		options.reserved = new Set(
			Array.isArray(options.reserved) || options.reserved instanceof Set
				? options.reserved
				: []
		);
		options.reserved.add("arguments");
		return options;
	};

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

	/**
	 * terser's `mangle_names` as written, for the options the fast path below
	 * leaves out: each definition asks its scope for a name, whose enclosed
	 * definitions it rescans.
	 * @param {Scope} toplevel the tree
	 * @param {EXPECTED_ANY} options the formatted mangle options
	 * @returns {void}
	 */
	const mangleEveryOption = (toplevel, options) => {
		const { mangling } = /** @type {{ mangling: EXPECTED_ANY }} */ (
			webpackScope
		);
		const identifiers = options.nth_identifier;
		let labelName = -1;
		/** @type {SymbolDefinition[]} */
		const toMangle = [];
		/** @type {Set<string>} */
		const unmangleableNames = new Set();
		/**
		 * @param {SymbolDefinition} definition a definition in some scope
		 * @returns {void}
		 */
		const collect = (definition) => {
			if (definition.export & EXPORT_KEEPS_ITS_NAME) {
				unmangleableNames.add(definition.name);
			} else if (!options.reserved.has(definition.name)) {
				toMangle.push(definition);
			}
		};
		if (options.keep_fnames) mangling.keptFunctionIds = new Set();
		mangling.unmangleableNames = unmangleableNames;
		const mangledNames = (toplevel.mangled_names = new Set());
		try {
			if (options.cache) {
				for (const definition of toplevel.globals.values()) collect(definition);
				if (options.cache.props) {
					for (const mangled of options.cache.props.values()) {
						mangledNames.add(mangled);
					}
				}
			}
			const walker = new TreeWalker(
				/**
				 * @param {Node} node the node reached
				 * @param {() => void} descend walks its children
				 * @returns {boolean | undefined} true where it walked them itself
				 */
				(
					/** @type {Node} */ node,
					/** @type {EXPECTED_FUNCTION} */ descend
				) => {
					if (node instanceof AST_LabeledStatement) {
						const saved = labelName;
						descend();
						labelName = saved;
						return true;
					}
					if (
						node instanceof AST_Defun &&
						!(walker.parent() instanceof AST_Scope)
					) {
						if (mangling.blockDefunScopes === null) {
							mangling.blockDefunScopes = new Set();
						}
						mangling.blockDefunScopes.add(node.parent_scope.get_defun_scope());
					}
					if (node instanceof AST_Scope) {
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
					if (
						mangling.keptFunctionIds !== null &&
						node instanceof AST_VarDef &&
						node.name instanceof AST_Symbol &&
						node.value instanceof AST_Lambda &&
						!node.value.name &&
						keepName(options.keep_fnames, node.name.name)
					) {
						mangling.keptFunctionIds.add(node.name.definition().id);
						return undefined;
					}
					if (node instanceof AST_Label) {
						let name;
						do {
							name = identifiers.get(++labelName);
						} while (ALL_RESERVED_WORDS.has(name));
						node.mangled_name = name;
						return true;
					}
					if (
						!(options.ie8 || options.safari10) &&
						node instanceof AST_SymbolCatch
					) {
						toMangle.push(node.definition());
					}
					return undefined;
				}
			);
			toplevel.walk(walker);
			// A short name kept as written may collide with one handed out.
			if (options.keep_fnames || options.keep_classnames) {
				for (const definition of toMangle) {
					if (definition.name.length < 6 && definition.unmangleable(options)) {
						unmangleableNames.add(definition.name);
					}
				}
			}
			for (const definition of toMangle) definition.mangle(options);
		} finally {
			mangling.keptFunctionIds = null;
			mangling.unmangleableNames = null;
			mangling.blockDefunScopes = null;
		}
	};

	if (webpackScope) {
		/**
		 * terser's `compute_char_frequency`: counts the characters the output
		 * prints, less the names mangling replaces, to order the identifiers.
		 * @this {Scope} the toplevel
		 * @param {EXPECTED_ANY} given the mangle options
		 * @returns {void}
		 */
		AST_Toplevel.prototype.compute_char_frequency =
			function compute_char_frequency(given) {
				const options = formatManglerOptions(given);
				const identifiers = options.nth_identifier;
				// An identifier source ignoring frequency has nothing to count.
				if (!identifiers.reset || !identifiers.consider || !identifiers.sort) {
					return;
				}
				identifiers.reset();
				/**
				 * @param {Node} node a computed key
				 * @returns {void}
				 */
				const skipString = (node) => {
					if (node instanceof AST_String) {
						identifiers.consider(node.value, -1);
					} else if (node instanceof AST_Conditional) {
						skipString(node.consequent);
						skipString(node.alternative);
					} else if (node instanceof AST_Sequence) {
						skipString(node.tail_node());
					}
				};
				try {
					/**
					 * @this {Node} the node printed
					 * @param {EXPECTED_ANY} stream the stream printed into
					 * @param {boolean=} forceParens whether to wrap it in parentheses
					 * @returns {void}
					 */
					AST_Node.prototype.print = function print(stream, forceParens) {
						this._print(stream, forceParens);
						if (this instanceof AST_Symbol && !this.unmangleable(options)) {
							identifiers.consider(this.name, -1);
						} else if (options.properties) {
							if (this instanceof AST_DotHash) {
								identifiers.consider(`#${this.property}`, -1);
							} else if (this instanceof AST_Dot) {
								identifiers.consider(this.property, -1);
							} else if (this instanceof AST_Sub) {
								skipString(this.property);
							}
						}
					};
					identifiers.consider(this.print_to_string(), 1);
				} finally {
					AST_Node.prototype.print = AST_Node.prototype._print;
				}
				identifiers.sort();
			};
	}

	AST_Toplevel.DEFMETHOD(
		"mangle_names",
		/**
		 * @this {EXPECTED_ANY} the toplevel being mangled
		 * @param {EXPECTED_ANY} given the mangle options
		 * @returns {void}
		 */
		function mangleNames(given) {
			const options = formatManglerOptions(given);
			// The option set a build uses is named below; a name cache, the legacy
			// engine workarounds, kept names and another identifier source are
			// named as terser does, which needs the scope phase's definitions.
			if (
				options.cache ||
				options.ie8 ||
				options.safari10 ||
				options.keep_fnames ||
				options.keep_classnames ||
				options.nth_identifier !== scope.base54
			) {
				if (webpackScope) mangleEveryOption(this, options);
				else original.call(this, given);
				return;
			}

			const identifiers = options.nth_identifier;
			/** @type {SymbolDefinition[]} */
			const toMangle = [];
			let labelName = -1;
			/** @type {Set<Scope>} */
			const blockDefunScopes = new Set();
			// An export's own name, which no scope hands out even where it is unseen.
			/** @type {Set<string>} */
			const exportedNames = new Set();
			this.mangled_names = new Set();

			/**
			 * @param {SymbolDefinition} definition a definition in some scope
			 * @returns {void}
			 */
			const collect = (definition) => {
				if (definition.export & EXPORT_KEEPS_ITS_NAME) {
					exportedNames.add(definition.name);
				} else if (!options.reserved.has(definition.name)) {
					toMangle.push(definition);
				}
			};

			const walker = new ast.TreeWalker(
				/**
				 * @param {EXPECTED_ANY} node the node reached
				 * @param {() => void} descend walks its children
				 * @returns {boolean | undefined} true where it walked them itself
				 */
				(
					/** @type {Node} */ node,
					/** @type {EXPECTED_FUNCTION} */ descend
				) => {
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
					if (exportedNames.has(name)) continue;
					if (taken.has(name)) continue;
					if (shadowed !== null && shadowed === name) continue;
					break;
				}
				definition.mangled_name = name;
			}
		}
	);
};

/**
 * One of terser's AST nodes: the fields and methods the phases share typed, the
 * rest open.
 * @typedef {{
 * TYPE: string,
 * flags: number,
 * start: Token,
 * end: Token,
 * expression: TerserNode,
 * left: TerserNode,
 * right: TerserNode,
 * operator: string,
 * condition: TerserNode,
 * consequent: TerserNode,
 * alternative: TerserNode,
 * args: TerserNode[],
 * elements: TerserNode[],
 * properties: TerserNode[],
 * definitions: TerserNode[],
 * expressions: TerserNode[],
 * segments: TerserNode[],
 * argnames: TerserNode[],
 * quote: string | undefined,
 * raw: string | undefined,
 * optional: boolean,
 * prefix: TerserNode,
 * extends: TerserNode,
 * scope: TerserNode,
 * thedef: SymbolDefinition,
 * definition(): SymbolDefinition,
 * fixed_value(): EXPECTED_ANY,
 * tail_node(): TerserNode,
 * clone(deep?: boolean): TerserNode,
 * transform(walker: EXPECTED_ANY, inList?: boolean): TerserNode,
 * optimize(compressor: TerserCompressor): TerserNode,
 * has_side_effects(compressor: TerserCompressor): boolean,
 * may_throw(compressor: TerserCompressor): boolean,
 * drop_side_effect_free(compressor: TerserCompressor, firstInStatement?: boolean): TerserNode | null,
 * is_constant_expression(scope?: TerserNode): boolean | "f",
 * evaluate(compressor: TerserCompressor): EXPECTED_ANY,
 * negate(compressor: TerserCompressor, firstInStatement?: boolean): TerserNode,
 * size(compressor?: TerserCompressor, stack?: EXPECTED_ANY): number,
 * print_to_string(options?: Record<string, EXPECTED_ANY>): string,
 * print(output: TerserOutputStream, forceParens?: boolean): void,
 * _do_print(output: TerserOutputStream, kind?: string): void,
 * _do_print_body(output: TerserOutputStream): void,
 * _print_getter_setter(type: string | null | undefined, isPrivate: boolean, output: TerserOutputStream): void,
 * [key: string]: EXPECTED_ANY,
 * [key: symbol]: EXPECTED_ANY,
 * }} TerserNode
 */
/** @typedef {TerserNode} Node one of terser's AST nodes */

// terser's empty slot: a node field holding no node reads `null`, which the
// fields' type leaves out so that every read of a present node stays typed.
const NO_NODE = /** @type {Node} */ (/** @type {unknown} */ (null));
/** @typedef {new (props?: Record<string, EXPECTED_ANY>) => Node} NodeClass one of terser's node classes */
/** @typedef {Record<string, EXPECTED_ANY>} NodeProps the properties a node is built from */
/** @typedef {EXPECTED_FUNCTION & { prototype: EXPECTED_ANY }} NodeCheck one of terser's node classes, read only by `instanceof`, which leaves the operand's type as it is */
/** @typedef {NodeCheck & { DEFMETHOD: (name: string, method: EXPECTED_FUNCTION) => void }} NodeDefinable one of terser's node classes, given methods by name */
/** @typedef {Record<PropertyKey, EXPECTED_ANY>} Token one of terser's tokens */
/** @typedef {{ type: string, value: string, nlb?: boolean }} Comment a comment terser's tokenizer read */
/** @typedef {Record<string, EXPECTED_ANY>} TerserFormatOptions terser's `format` options, defaulted */
/** @typedef {(this: Node, comment: Comment) => boolean} CommentFilter which comments are printed */

// The `format` options terser's stream reads, each with its default. A terser
// naming any other set keeps its own stream, since an option this does not
// know would be silently ignored.
/** @type {TerserFormatOptions} */
const FORMAT_DEFAULTS = {
	ascii_only: false,
	beautify: false,
	braces: false,
	comments: "some",
	ecma: 5,
	ie8: false,
	indent_level: 4,
	indent_start: 0,
	inline_script: true,
	keep_numbers: false,
	keep_quoted_props: false,
	max_line_len: false,
	preamble: null,
	preserve_annotations: false,
	quote_keys: false,
	quote_style: 0,
	safari10: false,
	semicolons: true,
	shebang: true,
	shorthand: undefined,
	source_map: null,
	webkit: false,
	width: 80,
	wrap_iife: false,
	wrap_func_args: false,
	_destroy_ast: false
};

// Every member terser's stream hands its code generators, which is what
// webpack's stream has to answer to.
const STREAM_MEMBERS = [
	"active_scope",
	"add_mapping",
	"append_comments",
	"col",
	"colon",
	"comma",
	"current_width",
	"encode_string",
	"force_semicolon",
	"gc_scope",
	"get",
	"has_parens",
	"in_directive",
	"indent",
	"indentation",
	"last",
	"line",
	"newline",
	"next_indent",
	"option",
	"parent",
	"pop_node",
	"pos",
	"prepend_comments",
	"print",
	"print_name",
	"print_string",
	"print_template_string_chars",
	"printed_comments",
	"push_node",
	"semicolon",
	"should_break",
	"space",
	"star",
	"to_utf8",
	"toString",
	"use_asm",
	"with_block",
	"with_indent",
	"with_parens",
	"with_square"
];

// Where terser's stream moves what it wrote into one string, so reading back
// from the end never flattens more than this many characters.
const COMMIT_AFTER = 8000;

const ANNOTATION = /[@#]__(PURE|INLINE|NOINLINE)__/;

// The characters `[$0-9A-Z_a-z]`, the ASCII part of what terser reads as an
// identifier character, by code.
const ASCII_IDENTIFIER = new Uint8Array(128);
for (let code = 0; code < 128; code++) {
	ASCII_IDENTIFIER[code] =
		code === 36 ||
		code === 95 ||
		(code >= 48 && code <= 57) ||
		(code >= 65 && code <= 90) ||
		(code >= 97 && code <= 122)
			? 1
			: 0;
}

// What a token may open with and still follow a pending semicolon that
// `semicolons: false` would write as a line break.
const REQUIRE_SEMICOLON = new Set([
	"(",
	"[",
	"+",
	"*",
	"/",
	"-",
	",",
	".",
	"`"
]);

// The `format` options that only lay out readable output. The printer writes
// minified output alone, so each is read as its default whatever it is given.
const IGNORED_FORMAT_OPTIONS = [
	"beautify",
	"braces",
	"indent_level",
	"indent_start",
	"max_line_len",
	"width"
];

/**
 * @param {TerserFormatOptions} options defaulted format options
 * @returns {TerserFormatOptions} the same, each layout option at its default
 */
const minifiedOptions = (options) => {
	for (const name of IGNORED_FORMAT_OPTIONS) {
		options[name] = FORMAT_DEFAULTS[name];
	}
	return options;
};

/**
 * Whether this terser exposes what the phase reads: the stream's option set
 * and members, and the two entry points a tree is printed through.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const outputFits = ({ ast, output }) => {
	if (
		typeof output.OutputStream !== "function" ||
		typeof ast.AST_Node.prototype._print !== "function" ||
		typeof ast.AST_Node.prototype.print_to_string !== "function"
	) {
		return false;
	}
	// terser rejects an option it does not know by throwing its whole default
	// set, which is the one place that set can be read.
	let defaults;
	try {
		output.OutputStream({ "webpack probe": true });
		return false;
	} catch (err) {
		defaults = /** @type {{ defs?: TerserFormatOptions }} */ (err).defs;
	}
	if (!defaults) return false;
	const names = Object.keys(defaults);
	if (names.length !== Object.keys(FORMAT_DEFAULTS).length) return false;
	for (const name of names) {
		if (
			!Object.prototype.hasOwnProperty.call(FORMAT_DEFAULTS, name) ||
			FORMAT_DEFAULTS[name] !== defaults[name]
		) {
			return false;
		}
	}
	return (
		Object.keys(output.OutputStream()).sort().join() ===
		[...STREAM_MEMBERS].sort().join()
	);
};

/**
 * @param {number[]} encoded pairs of gap since the previous range and range length
 * @returns {Int32Array} each range's first code point and the one past its last, in turn
 */
const decodeRanges = (encoded) => {
	const bounds = new Int32Array(encoded.length);
	let code = 0;
	for (let i = 0; i < encoded.length; i += 2) {
		code += encoded[i];
		bounds[i] = code;
		code += encoded[i + 1];
		bounds[i + 1] = code;
	}
	return bounds;
};

/**
 * @param {Int32Array} bounds decoded ranges
 * @param {number} code a code point
 * @returns {boolean} whether a range holds it
 */
const inRanges = (bounds, code) => {
	let low = 0;
	let high = bounds.length / 2 - 1;
	while (low <= high) {
		const middle = (low + high) >> 1;
		if (code < bounds[middle * 2]) high = middle - 1;
		else if (code >= bounds[middle * 2 + 1]) low = middle + 1;
		else return true;
	}
	return false;
};

const BASIC_IDENTIFIER = /^[a-z_$][a-z0-9_$]*$/i;

/**
 * terser's `unicode.js`: what the stream asks of a character to decide whether
 * it prints as written. The narrow tables are Unicode 8.0, which older engines
 * read; the broad ones are the running engine's own.
 * @returns {{ getFullChar: (str: string, pos: number) => string, getFullCharCode: (str: string, pos: number) => number, isBasicIdentifier: (str: string) => boolean, isIdentifierStart: (character: string) => boolean, isIdentifierChar: (character: string) => boolean, isIdentifierStartBroad: (character: string) => boolean, isIdentifierCharBroad: (character: string) => boolean, isIdentifierString: (str: string, allowSurrogates?: boolean) => boolean }} the helpers
 */
const createUnicode = () => {
	const {
		NARROW_IDENTIFIER_PART_RANGES,
		NARROW_IDENTIFIER_START_RANGES
	} = require("./data");

	const narrowStart = decodeRanges(NARROW_IDENTIFIER_START_RANGES);
	const narrowPart = decodeRanges(NARROW_IDENTIFIER_PART_RANGES);
	const broadStart = /[_$\p{ID_Start}]/u;
	const broadPart = /[$\u200C\u200D\p{ID_Continue}]+/u;
	/**
	 * @param {number} code a UTF-16 code unit
	 * @returns {boolean} whether it opens a surrogate pair
	 */
	const isHead = (code) => code >= 0xd800 && code <= 0xdbff;
	/**
	 * @param {number} code a UTF-16 code unit
	 * @returns {boolean} whether it closes a surrogate pair
	 */
	const isTail = (code) => code >= 0xdc00 && code <= 0xdfff;
	return {
		getFullChar(str, pos) {
			if (isHead(str.charCodeAt(pos))) {
				if (isTail(str.charCodeAt(pos + 1))) {
					return str.charAt(pos) + str.charAt(pos + 1);
				}
			} else if (
				isTail(str.charCodeAt(pos)) &&
				isHead(str.charCodeAt(pos - 1))
			) {
				return str.charAt(pos - 1) + str.charAt(pos);
			}
			return str.charAt(pos);
		},
		getFullCharCode(str, pos) {
			const code = str.charCodeAt(pos);
			if (isHead(code)) {
				return (
					0x10000 + ((code - 0xd800) << 10) + str.charCodeAt(pos + 1) - 0xdc00
				);
			}
			return code;
		},
		isBasicIdentifier: (str) => BASIC_IDENTIFIER.test(str),
		isIdentifierStart: (character) =>
			inRanges(narrowStart, /** @type {number} */ (character.codePointAt(0))),
		isIdentifierChar: (character) =>
			inRanges(narrowPart, /** @type {number} */ (character.codePointAt(0))),
		isIdentifierStartBroad: (character) => broadStart.test(character),
		isIdentifierCharBroad: (character) => broadPart.test(character),
		isIdentifierString(str, allowSurrogates) {
			if (BASIC_IDENTIFIER.test(str)) return true;
			if (!allowSurrogates && /[\uD800-\uDFFF]/.test(str)) return false;
			if (str.length === 0) return false;
			let code = /** @type {number} */ (str.codePointAt(0));
			if (!inRanges(narrowStart, code)) return false;
			for (let i = code > 0xffff ? 2 : 1; i < str.length;) {
				code = /** @type {number} */ (str.codePointAt(i));
				if (!inRanges(narrowPart, code)) return false;
				i += code > 0xffff ? 2 : 1;
			}
			return true;
		}
	};
};

/**
 * webpack's stream for minified output, answering terser's code generators
 * through the same members terser's own `OutputStream` does and writing the
 * same bytes. It writes no layout, so it never breaks a line behind itself.
 * @param {TerserModules} modules terser's modules
 * @returns {new (options: TerserFormatOptions, readonly: boolean) => EXPECTED_ANY} the stream class
 */
const createMinifiedOutput = ({ ast }) => {
	const {
		AST_Await,
		AST_Binary,
		AST_Conditional,
		AST_Dot,
		AST_Exit,
		AST_Sequence,
		AST_Sub,
		AST_Symbol,
		AST_UnaryPostfix,
		AST_Yield
	} = ast;
	const {
		getFullChar,
		getFullCharCode,
		isBasicIdentifier,
		isIdentifierChar,
		isIdentifierCharBroad,
		isIdentifierStart,
		isIdentifierStartBroad
	} = createUnicode();

	/**
	 * The child terser's comment walk continues into below a node on the
	 * leftmost edge of a returned, awaited or yielded value.
	 * @param {Node} parent a node on that edge
	 * @returns {Node | null | undefined} the child on it, if any
	 */
	const leftEdgeChild = (parent) => {
		if (
			parent instanceof AST_Await ||
			parent instanceof AST_Yield ||
			parent instanceof AST_UnaryPostfix
		) {
			return parent.expression;
		}
		if (parent instanceof AST_Binary) return parent.left;
		if (parent.TYPE === "Call") return parent.expression;
		if (parent instanceof AST_Conditional) return parent.condition;
		if (parent instanceof AST_Dot || parent instanceof AST_Sub) {
			return parent.expression;
		}
		if (parent instanceof AST_Sequence) return parent.expressions[0];
		return undefined;
	};

	/**
	 * @param {Node | null | undefined} value a returned, awaited or yielded value
	 * @param {Set<Comment | Comment[]>} printed the comments and comment lists printed so far
	 * @returns {boolean} whether its leftmost edge holds comments not yet printed
	 */
	const leftEdgeComments = (value, printed) => {
		for (let inner = value; inner; inner = leftEdgeChild(inner)) {
			const text = inner.start && inner.start.comments_before;
			if (text && text.length !== 0 && !printed.has(text)) return true;
		}
		return false;
	};

	// An identifier terser may have to escape. It also requires a character
	// past U+00FF, which the caller checks before asking.
	const HIGH_IDENTIFIER = /^\p{ID_Start}\p{ID_Continue}*$/u;

	/**
	 * @param {string} character one character, or a surrogate pair
	 * @returns {boolean} whether terser reads it as an identifier character
	 */
	const isIdentifierCharacter = (character) => {
		if (character.length === 1) {
			const code = character.charCodeAt(0);
			if (code < 128) return ASCII_IDENTIFIER[code] === 1;
		}
		return isIdentifierCharBroad(character);
	};

	/**
	 * @param {string} str any string
	 * @param {number} below the first code that is not left as written
	 * @returns {boolean} whether every character is printable ASCII below `below`
	 */
	const isPlain = (str, below) => {
		for (let i = 0; i < str.length; i++) {
			const code = str.charCodeAt(i);
			if (code < 0x20 || code >= below) return false;
		}
		return true;
	};

	/**
	 * @param {string} str any string
	 * @returns {boolean} whether it holds any surrogate half
	 */
	const hasSurrogate = (str) => {
		for (let i = 0; i < str.length; i++) {
			const code = str.charCodeAt(i);
			if (code >= 0xd800 && code <= 0xdfff) return true;
		}
		return false;
	};

	/**
	 * @param {number} codePoint a code point
	 * @returns {string} its escape
	 */
	const unicodeEscape = (codePoint) =>
		codePoint <= 0xffff
			? `\\u${codePoint.toString(16).padStart(4, "0")}`
			: `\\u{${codePoint.toString(16)}}`;

	/**
	 * @param {TerserFormatOptions} options defaulted format options
	 * @returns {CommentFilter} which comments are printed
	 */
	const commentFilterFor = (options) => {
		/** @type {CommentFilter} */
		let filter = () => false;
		if (options.comments) {
			let comments = options.comments;
			if (typeof comments === "string" && /^\/.*\/[a-zA-Z]*$/.test(comments)) {
				const flagsAt = comments.lastIndexOf("/");
				comments = new RegExp(
					comments.slice(1, flagsAt),
					comments.slice(flagsAt + 1)
				);
			}
			if (comments instanceof RegExp) {
				const pattern = comments;
				filter = (comment) =>
					comment.type !== "comment5" && pattern.test(comment.value);
			} else if (typeof comments === "function") {
				const callback = comments;
				filter = function filter(comment) {
					return comment.type !== "comment5" && callback(this, comment);
				};
			} else if (comments === "some") {
				filter = (comment) =>
					(comment.type === "comment2" || comment.type === "comment1") &&
					/@preserve|@copyright|@lic|@cc_on|^\**!/i.test(comment.value);
			} else {
				filter = () => true;
			}
		}
		if (options.preserve_annotations) {
			const previous = filter;
			filter = function filter(comment) {
				return ANNOTATION.test(comment.value) || previous.call(this, comment);
			};
		}
		return filter;
	};

	class MinifiedOutput {
		/**
		 * @param {TerserFormatOptions} options defaulted format options
		 * @param {boolean} readonly true when printed for its text alone, which drops every comment
		 */
		constructor(options, readonly) {
			this.options = options;
			this.readonly = readonly;
			this.commentFilter = commentFilterFor(options);
			this.appendsComments =
				!readonly && Boolean(options.comments || options.preserve_annotations);
			this.sourceMap = options.source_map;

			/** @type {string[]} */
			this.parts = [];
			this.partsLength = 0;
			this.current = "";

			this.currentColumn = 0;
			this.currentLine = 1;
			this.currentPosition = 0;
			this.hasParentheses = false;
			this.mightNeedSpace = false;
			this.mightNeedSemicolon = false;
			this.needNewlineIndented = false;
			this.needSpace = false;
			this.lastPrinted = "";
			/** @type {Token | false} */
			this.mappingToken = false;
			/** @type {EXPECTED_ANY} */
			this.mappingName = undefined;
			/** @type {Node[]} */
			this.stack = [];

			this.in_directive = false;
			/** @type {Node | null} */
			this.use_asm = null;
			/** @type {Node | null} */
			this.active_scope = null;
			/** @type {Set<Comment | Comment[]>} */
			this.printed_comments = new Set();

			const { ascii_only: asciiOnly, ecma, safari10 } = options;
			// Picked once per stream from the options, as terser's are.
			/** @type {(str: string, identifier?: boolean, regexp?: boolean) => string} */
			this.to_utf8 = asciiOnly
				? (str, identifier = false, regexp = false) => {
						if (isPlain(str, 0x7f)) return str;
						if (ecma >= 2015 && !safari10 && !regexp) {
							str = str.replace(
								/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
								(character) =>
									`\\u{${getFullCharCode(character, 0).toString(16)}}`
							);
						}
						return str.replace(/[^ -~]/g, (character) => {
							let code = character.charCodeAt(0).toString(16);
							if (code.length <= 2 && !identifier) {
								while (code.length < 2) code = `0${code}`;
								return `\\x${code}`;
							}
							while (code.length < 4) code = `0${code}`;
							return `\\u${code}`;
						});
					}
				: (str) => {
						if (!hasSurrogate(str)) return str;
						return str.replace(
							/[\uD800-\uDBFF][\uDC00-\uDFFF]|([\uD800-\uDBFF]|[\uDC00-\uDFFF])/g,
							(match, lone) =>
								lone ? `\\u${lone.charCodeAt(0).toString(16)}` : match
						);
					};
			this.identifierToUtf8 = asciiOnly
				? this.to_utf8
				: /** @type {(str: string) => string} */ (str) => {
						if (isPlain(str, 0x100) || !HIGH_IDENTIFIER.test(str)) {
							return str;
						}
						str = str.replace(
							/[\uD800-\uDBFF][\uDC00-\uDFFF]|([\uD800-\uDBFF]|[\uDC00-\uDFFF])/g,
							(match, lone) =>
								lone
									? `\\u${lone.charCodeAt(0).toString(16).padStart(4, "0")}`
									: match
						);
						// Escape identifier characters from higher unicode versions.
						let character = getFullChar(str, 0);
						let escaped = character;
						if (
							isIdentifierStartBroad(character) &&
							!isIdentifierStart(character)
						) {
							escaped = unicodeEscape(
								/** @type {number} */ (character.codePointAt(0))
							);
						}
						for (let i = character.length; i < str.length;) {
							character = getFullChar(str, i);
							escaped +=
								isIdentifierCharBroad(character) && !isIdentifierChar(character)
									? unicodeEscape(
											/** @type {number} */ (character.codePointAt(0))
										)
									: character;
							i += character.length;
						}
						return escaped;
					};
			/** @type {(str: string, quote?: string) => string} */
			this.encode_string = (str, quote) => {
				const encoded = this.makeString(str, quote);
				if (
					!options.inline_script ||
					(!encoded.includes("<") && !encoded.includes("--"))
				) {
					return encoded;
				}
				return encoded
					.replace(/<\u002F(script)([>/\t\n\f\r ])/gi, "<\\/$1$2")
					.replace(/\u003C!--/g, "\\x3c!--")
					.replace(/--\u003E/g, "--\\x3e");
			};
		}

		/**
		 * @param {string} str a string's value
		 * @param {string=} quote the quote it was written with
		 * @returns {string} the string literal
		 */
		makeString(str, quote) {
			const { options } = this;
			let doubleQuotes = 0;
			let singleQuotes = 0;
			let needsEscaping = false;
			for (let i = 0; i < str.length; i++) {
				const code = str.charCodeAt(i);
				if (code === 34) {
					doubleQuotes++;
				} else if (code === 39) {
					singleQuotes++;
				} else if (
					code === 92 ||
					code === 0 ||
					(code >= 8 && code <= 13) ||
					code === 0x2028 ||
					code === 0x2029 ||
					code === 0xfeff
				) {
					needsEscaping = true;
				}
			}
			if (needsEscaping) {
				const original = str;
				str = str.replace(
					/[\\\b\f\n\r\v\t\u0022\u0027\u2028\u2029\0\uFEFF]/g,
					(character, i) => {
						switch (character) {
							case "\\":
								return "\\\\";
							case "\n":
								return "\\n";
							case "\r":
								return "\\r";
							case "\t":
								return "\\t";
							case "\b":
								return "\\b";
							case "\f":
								return "\\f";
							case "\u000B":
								return options.ie8 ? "\\x0B" : "\\v";
							case "\u2028":
								return "\\u2028";
							case "\u2029":
								return "\\u2029";
							case "\uFEFF":
								return "\\ufeff";
							case "\0":
								return /[0-9]/.test(getFullChar(original, i + 1))
									? "\\x00"
									: "\\0";
						}
						return character;
					}
				);
			}
			str = this.to_utf8(str);
			if (quote === "`") return `\`${str.split("`").join("\\`")}\``;
			let single;
			switch (options.quote_style) {
				case 1:
					single = true;
					break;
				case 2:
					single = false;
					break;
				case 3:
					single = quote === "'";
					break;
				default:
					single = doubleQuotes > singleQuotes;
			}
			if (single) {
				return singleQuotes === 0
					? `'${str}'`
					: `'${str.split("'").join("\\'")}'`;
			}
			return doubleQuotes === 0
				? `"${str}"`
				: `"${str.split('"').join('\\"')}"`;
		}

		/**
		 * @param {string} str what to append
		 * @returns {void}
		 */
		append(str) {
			if (this.current.length > COMMIT_AFTER) {
				const committed = this.current + str;
				this.parts.push(committed);
				this.partsLength += committed.length;
				this.current = "";
			} else {
				this.current += str;
			}
		}

		/**
		 * @param {number} index an offset into what was written
		 * @returns {number} the code there, NaN before the start
		 */
		codeAt(index) {
			if (index >= this.partsLength) {
				return this.current.charCodeAt(index - this.partsLength);
			}
			let end = this.partsLength;
			for (let i = this.parts.length - 1; i >= 0; i--) {
				const part = this.parts[i];
				const begin = end - part.length;
				if (index >= begin) return part.charCodeAt(index - begin);
				end = begin;
			}
			return Number.NaN;
		}

		/**
		 * @returns {number} how much was written
		 */
		writtenLength() {
			return this.partsLength + this.current.length;
		}

		/**
		 * @returns {boolean} whether a directive may open here: at the start, or after `;` or `{` and whitespace
		 */
		expectDirective() {
			let n = this.writtenLength();
			if (n <= 0) return true;
			let code;
			while ((code = this.codeAt(--n)) && (code === 32 || code === 10)) {
				// skipping trailing whitespace
			}
			return !code || code === 59 || code === 123;
		}

		/**
		 * @returns {boolean} whether only spaces follow the last line break written
		 */
		hasNLB() {
			let n = this.writtenLength() - 1;
			while (n >= 0) {
				const code = this.codeAt(n--);
				if (code === 10) return true;
				if (code !== 32) return false;
			}
			return true;
		}

		/**
		 * @param {EXPECTED_ANY} value what to print, read as a string
		 * @returns {void}
		 */
		print(value) {
			const str = String(value);
			const { length } = str;
			let character = "";
			let code = -1;
			if (length !== 0) {
				code = str.charCodeAt(0);
				character =
					code >= 0xd800 && code <= 0xdfff ? getFullChar(str, 0) : str[0];
			}
			if (this.needNewlineIndented && length !== 0) {
				this.needNewlineIndented = false;
				if (character !== "\n") this.print("\n");
			}
			if (this.needSpace && length !== 0) {
				this.needSpace = false;
				if (
					code < 128
						? code !== 59 &&
							code !== 125 &&
							code !== 41 &&
							code !== 32 &&
							(code < 9 || code > 13)
						: !/\s/.test(character)
				) {
					this.mightNeedSpace = true;
				}
			}
			const last = this.lastPrinted;
			const previous = last.length === 0 ? "" : last[last.length - 1];
			if (this.mightNeedSemicolon) {
				this.mightNeedSemicolon = false;
				if (
					(previous === ":" && character === "}") ||
					((length === 0 || (character !== ";" && character !== "}")) &&
						previous !== ";")
				) {
					if (this.options.semicolons || REQUIRE_SEMICOLON.has(character)) {
						this.append(";");
						this.currentColumn++;
						this.currentPosition++;
					} else {
						if (this.currentColumn > 0) {
							this.append("\n");
							this.currentPosition++;
							this.currentLine++;
							this.currentColumn = 0;
						}
						// Nothing was written, so a later token still owes one.
						if (/^\s+$/.test(str)) this.mightNeedSemicolon = true;
					}
					this.mightNeedSpace = false;
				}
			}
			if (this.mightNeedSpace) {
				if (
					(isIdentifierCharacter(previous) &&
						(isIdentifierCharacter(character) || character === "\\")) ||
					(character === "/" && character === previous) ||
					((character === "+" || character === "-") && character === last)
				) {
					this.append(" ");
					this.currentColumn++;
					this.currentPosition++;
				}
				this.mightNeedSpace = false;
			}
			if (this.mappingToken) {
				this.addMapping(this.mappingToken, this.mappingName);
				this.mappingToken = false;
			}
			this.append(str);
			this.hasParentheses = length !== 0 && str.charCodeAt(length - 1) === 40;
			this.currentPosition += length;
			const firstBreak = str.indexOf("\n");
			if (firstBreak === -1) {
				this.currentColumn += length;
			} else {
				let breaks = 1;
				let lastBreak = firstBreak;
				for (
					let at = str.indexOf("\n", firstBreak + 1);
					at !== -1;
					at = str.indexOf("\n", at + 1)
				) {
					breaks++;
					lastBreak = at;
				}
				this.currentLine += breaks;
				this.currentColumn = length - lastBreak - 1;
			}
			this.lastPrinted = str;
		}

		/**
		 * @param {Token} token the token the next text maps back to
		 * @param {EXPECTED_ANY} name the name it carries, or false for none
		 * @returns {void}
		 */
		addMapping(token, name) {
			try {
				if (name !== false) {
					if (token.type === "name" || token.type === "privatename") {
						name = token.value;
					} else if (name instanceof AST_Symbol) {
						name = token.type === "string" ? token.value : name.name;
					}
				}
				this.sourceMap.add(
					token.file,
					this.currentLine,
					this.currentColumn,
					token.line,
					token.col,
					isBasicIdentifier(name) ? name : undefined
				);
			} catch (_err) {
				// terser ignores a mapping it cannot add
			}
		}

		/**
		 * @param {Token} token the token the next text maps back to
		 * @param {EXPECTED_ANY=} name the name it carries
		 * @returns {void}
		 */
		add_mapping(token, name) {
			if (!this.sourceMap) return;
			this.mappingToken = token;
			this.mappingName = name;
		}

		/**
		 * @returns {string} what was written
		 */
		get() {
			return this.parts.length === 0
				? this.current
				: this.parts.join("") + this.current;
		}

		/**
		 * @returns {string} what was written
		 */
		toString() {
			return this.get();
		}

		/**
		 * @returns {void}
		 */
		indent() {}

		/**
		 * @returns {void}
		 */
		newline() {}

		/**
		 * @returns {number} the indentation, which minified output never changes
		 */
		indentation() {
			return 0;
		}

		/**
		 * @returns {number} the width of the current line
		 */
		current_width() {
			return this.currentColumn;
		}

		/**
		 * @returns {EXPECTED_ANY} truthy once the line reaches `width`
		 */
		should_break() {
			return this.options.width && this.current_width() >= this.options.width;
		}

		/**
		 * @returns {boolean} whether the last thing printed opened a parenthesis
		 */
		has_parens() {
			return this.hasParentheses;
		}

		/**
		 * @returns {void}
		 */
		star() {
			this.print("*");
		}

		/**
		 * @returns {void}
		 */
		space() {
			this.mightNeedSpace = true;
		}

		/**
		 * @returns {void}
		 */
		comma() {
			this.print(",");
			this.mightNeedSpace = true;
		}

		/**
		 * @returns {void}
		 */
		colon() {
			this.print(":");
			this.mightNeedSpace = true;
		}

		/**
		 * @returns {string} the last string printed
		 */
		last() {
			return this.lastPrinted;
		}

		/**
		 * @returns {void}
		 */
		semicolon() {
			this.mightNeedSemicolon = true;
		}

		/**
		 * @returns {void}
		 */
		force_semicolon() {
			this.mightNeedSemicolon = false;
			this.print(";");
		}

		/**
		 * @param {EXPECTED_ANY} name an identifier
		 * @returns {void}
		 */
		print_name(name) {
			this.print(this.identifierToUtf8(name.toString(), true));
		}

		/**
		 * @param {string} str a string's value
		 * @param {string=} quote the quote it was written with
		 * @param {boolean=} escapeDirective whether it must not read as a directive
		 * @returns {void}
		 */
		print_string(str, quote, escapeDirective) {
			const encoded = this.encode_string(str, quote);
			if (escapeDirective === true && !encoded.includes("\\")) {
				// Semicolons break the directive prologue.
				if (!this.expectDirective()) this.force_semicolon();
				this.force_semicolon();
			}
			this.print(encoded);
		}

		/**
		 * @param {string} str a template's raw characters
		 * @returns {void}
		 */
		print_template_string_chars(str) {
			let encoded = this.encode_string(str, "`");
			if (encoded.includes("${")) encoded = encoded.replace(/\${/g, "\\${");
			this.print(encoded.slice(1, -1));
		}

		/**
		 * @returns {number} the indentation one level in
		 */
		next_indent() {
			return this.options.indent_level;
		}

		/**
		 * @template T
		 * @param {EXPECTED_ANY} column ignored, as minified output does not indent
		 * @param {() => T} content prints the content
		 * @returns {T} what `content` returned
		 */
		with_indent(column, content) {
			return content();
		}

		/**
		 * @template T
		 * @param {() => T} content prints the content
		 * @returns {T} what `content` returned
		 */
		with_block(content) {
			this.print("{");
			const result = content();
			this.print("}");
			return result;
		}

		/**
		 * @template T
		 * @param {() => T} content prints the content
		 * @returns {T} what `content` returned
		 */
		with_parens(content) {
			this.print("(");
			const result = content();
			this.print(")");
			return result;
		}

		/**
		 * @template T
		 * @param {() => T} content prints the content
		 * @returns {T} what `content` returned
		 */
		with_square(content) {
			this.print("[");
			const result = content();
			this.print("]");
			return result;
		}

		/**
		 * @param {string} name a format option
		 * @returns {EXPECTED_ANY} its value
		 */
		option(name) {
			return this.options[name];
		}

		/**
		 * @param {Node} scope a function just printed
		 * @returns {void}
		 */
		gc_scope(scope) {
			if (!this.options._destroy_ast) return;
			scope.body.length = 0;
			scope.argnames.length = 0;
		}

		/**
		 * @param {string} comment a comment's text
		 * @returns {string} what is printed of it
		 */
		filterComment(comment) {
			if (!this.options.preserve_annotations) {
				comment = comment.replace(ANNOTATION, " ");
			}
			if (/^\s*$/.test(comment)) return "";
			return comment.replace(/(<\s*\/\s*)(script)/i, "<\\/$2");
		}

		/**
		 * @param {Node} node the node about to be printed
		 * @returns {void}
		 */
		prepend_comments(node) {
			if (this.readonly) return;
			const { start } = node;
			if (!start) return;
			// There cannot be a newline between return/yield and its value.
			const keywordWithValue =
				(node instanceof AST_Exit && node.value) ||
				((node instanceof AST_Await || node instanceof AST_Yield) &&
					node.expression);
			// WHY: terser records every token's comment list as printed, one Set
			// entry per token. An empty list prints nothing and no reader tells it
			// apart from an unrecorded one; only the start of output reads more.
			if (
				!keywordWithValue &&
				this.currentPosition !== 0 &&
				start.comments_before !== undefined &&
				start.comments_before.length === 0
			) {
				return;
			}
			const printed = this.printed_comments;
			// The same holds for a keyword's value: where neither the keyword nor
			// the value's leftmost edge has comments left to print, none is made.
			if (
				keywordWithValue &&
				this.currentPosition !== 0 &&
				(start.comments_before === undefined ||
					start.comments_before.length === 0 ||
					printed.has(start.comments_before)) &&
				!leftEdgeComments(keywordWithValue, printed)
			) {
				return;
			}
			if (start.comments_before && printed.has(start.comments_before)) {
				if (!keywordWithValue) return;
				start.comments_before = [];
			}
			/** @type {Comment[]} */
			let comments = start.comments_before;
			if (!comments) comments = start.comments_before = [];
			printed.add(comments);

			// terser walks the value's leftmost edge for comments a line break
			// there would move after the keyword; one child per node is on it.
			for (let inner = keywordWithValue; inner; inner = leftEdgeChild(inner)) {
				const text = inner.start && inner.start.comments_before;
				if (text && !printed.has(text)) {
					printed.add(text);
					comments = [...comments, ...text];
				}
			}

			if (this.currentPosition === 0) {
				if (
					comments.length > 0 &&
					this.options.shebang &&
					comments[0].type === "comment5" &&
					!printed.has(comments[0])
				) {
					this.print(`#!${/** @type {Comment} */ (comments.shift()).value}\n`);
				}
				const { preamble } = this.options;
				if (preamble) {
					this.print(preamble.replace(/\r\n?|[\n\u2028\u2029]|\s*$/g, "\n"));
				}
			}

			if (comments.length === 0) return;
			// Most lists print nothing, so a list is made only for what prints.
			/** @type {Comment[] | undefined} */
			let kept;
			for (let i = 0; i < comments.length; i++) {
				const comment = comments[i];
				if (this.commentFilter.call(node, comment) && !printed.has(comment)) {
					if (kept === undefined) kept = [];
					kept.push(comment);
				}
			}
			if (kept === undefined) return;
			comments = kept;
			let lastNlb = this.hasNLB();
			for (let i = 0; i < comments.length; i++) {
				const comment = comments[i];
				printed.add(comment);
				if (!lastNlb) {
					if (comment.nlb) {
						this.print("\n");
						lastNlb = true;
					} else if (i > 0) {
						this.mightNeedSpace = true;
					}
				}
				if (/comment[134]/.test(comment.type)) {
					const value = this.filterComment(comment.value);
					if (value) this.print(`//${value}\n`);
					lastNlb = true;
				} else if (comment.type === "comment2") {
					const value = this.filterComment(comment.value);
					if (value) this.print(`/*${value}*/`);
					lastNlb = false;
				}
			}
			if (!lastNlb) {
				if (start.nlb) {
					this.print("\n");
				} else {
					this.mightNeedSpace = true;
				}
			}
		}

		/**
		 * @param {Node} node the node just printed
		 * @param {boolean=} tail true for the comments inside an empty body
		 * @returns {void}
		 */
		append_comments(node, tail) {
			if (!this.appendsComments) return;
			const token = node.end;
			if (!token) return;
			const printed = this.printed_comments;
			/** @type {Comment[] | undefined} */
			const comments = token[tail ? "comments_before" : "comments_after"];
			if (!comments || printed.has(comments)) return;
			if (!(
				node instanceof ast.AST_Statement ||
				comments.every((comment) => !/comment[134]/.test(comment.type))
			)) {
				return;
			}
			printed.add(comments);
			const kept = comments.filter((comment) =>
				this.commentFilter.call(node, comment)
			);
			for (let i = 0; i < kept.length; i++) {
				const comment = kept[i];
				if (printed.has(comment)) continue;
				printed.add(comment);
				this.needSpace = false;
				if (this.needNewlineIndented) {
					this.print("\n");
					this.needNewlineIndented = false;
				} else if (comment.nlb && (i > 0 || !this.hasNLB())) {
					this.print("\n");
				} else if (i > 0 || !tail) {
					this.mightNeedSpace = true;
				}
				if (/comment[134]/.test(comment.type)) {
					const value = this.filterComment(comment.value);
					if (value) this.print(`//${value}`);
					this.needNewlineIndented = true;
				} else if (comment.type === "comment2") {
					const value = this.filterComment(comment.value);
					if (value) this.print(`/*${value}*/`);
					this.needSpace = true;
				}
			}
		}

		/**
		 * @returns {number} the current line, from 1
		 */
		line() {
			return this.currentLine;
		}

		/**
		 * @returns {number} the current column, from 0
		 */
		col() {
			return this.currentColumn;
		}

		/**
		 * @returns {number} how many characters were written
		 */
		pos() {
			return this.currentPosition;
		}

		/**
		 * @param {Node} node the node being printed
		 * @returns {void}
		 */
		push_node(node) {
			this.stack.push(node);
		}

		/**
		 * @returns {Node} the node done printing
		 */
		pop_node() {
			return /** @type {Node} */ (this.stack.pop());
		}

		/**
		 * @param {number=} n how many levels further out
		 * @returns {Node | undefined} the node holding the one being printed
		 */
		parent(n) {
			return this.stack[this.stack.length - 2 - (n || 0)];
		}
	}

	return MinifiedOutput;
};

/**
 * Installs webpack's stream for minified output. terser prints a tree twice
 * per minify — once for the mangler's character frequencies, once for the
 * result — and both go through here.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installOutput = (modules) => {
	const { ast } = modules;
	const { AST_Node, AST_Toplevel } = ast;
	const MinifiedOutput = createMinifiedOutput(modules);
	// Shared with the phases after this one, which print into it.
	modules.MinifiedOutput = MinifiedOutput;
	const names = Object.keys(FORMAT_DEFAULTS);
	// Read at call time, since a later phase replaces the per-node print.
	/**
	 * @param {Node} node the toplevel
	 * @param {EXPECTED_ANY} stream the stream printed into
	 * @param {boolean=} forceParens whether to wrap it in parentheses
	 * @returns {void}
	 */
	const driver = (node, stream, forceParens) =>
		AST_Node.prototype._print.call(node, stream, forceParens);

	AST_Node.DEFMETHOD(
		"print_to_string",
		/**
		 * @this {Node} the node printed
		 * @param {EXPECTED_ANY=} given format options
		 * @returns {string} the node's text
		 */
		function printToString(given) {
			const options = minifiedOptions(defaults(given, FORMAT_DEFAULTS, true));
			if (options.shorthand === undefined) options.shorthand = options.ecma > 5;
			const stream = new MinifiedOutput(options, !given);
			this.print(stream);
			return stream.get();
		}
	);

	// WHY: `minify` builds terser's own stream and prints the tree into it,
	// reaching no method this could replace first. So the toplevel prints into
	// webpack's stream instead and points the one `minify` reads the result
	// from, `get`, at it.
	AST_Toplevel.DEFMETHOD(
		"print",
		/**
		 * @this {Node} the toplevel printed
		 * @param {EXPECTED_ANY} stream the stream printed into
		 * @param {boolean=} forceParens whether to wrap it in parentheses
		 * @returns {void}
		 */
		function print(stream, forceParens) {
			if (stream instanceof MinifiedOutput) {
				driver(this, stream, forceParens);
				return;
			}
			/** @type {TerserFormatOptions} */
			const options = {};
			for (const name of names) options[name] = stream.option(name);
			const ours = new MinifiedOutput(minifiedOptions(options), false);
			driver(this, ours, forceParens);
			stream.get = stream.toString = () => ours.get();
		}
	);
};

// terser's per-node print, each run of whitespace read as one space: the one
// version the phase below was written against, so a changed one stays terser's.
const TERSER_NODE_PRINT = [
	"function(output, force_parens) {",
	"var self = this, generator = self._codegen;",
	"if (self instanceof AST_Scope) { output.active_scope = self; }",
	'else if (!output.use_asm && self instanceof AST_Directive && self.value == "use asm") {',
	"output.use_asm = output.active_scope; }",
	"function doit() { output.prepend_comments(self); self.add_source_map(output);",
	"generator(self, output); output.append_comments(self); }",
	"output.push_node(self);",
	"if (force_parens || self.needs_parens(output)) { output.with_parens(doit); }",
	"else { doit(); }",
	"output.pop_node();",
	"if (self === output.use_asm) { output.use_asm = null; } }"
].join(" ");

/**
 * Whether the per-node print is still the one this phase replaces, and the
 * output phase installed the stream it prints into.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const printFits = ({ ast, MinifiedOutput }) => {
	if (typeof MinifiedOutput !== "function") return false;
	const { print, _print: original } = ast.AST_Node.prototype;
	return (
		typeof original === "function" &&
		print === original &&
		original.toString().replace(/\s+/g, " ") === TERSER_NODE_PRINT
	);
};

/**
 * Installs webpack's per-node print. It is terser's, with the closure it
 * allocated per node and the stream calls around it inlined, for webpack's
 * stream; any other stream is printed by terser's own.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installPrint = ({ ast, MinifiedOutput }) => {
	const { AST_Directive, AST_Node, AST_Scope } = ast;
	const original = AST_Node.prototype._print;

	/**
	 * @this {Node} the node printed
	 * @param {EXPECTED_ANY} output the stream printed into
	 * @param {boolean=} forceParens whether to wrap it in parentheses
	 * @returns {void}
	 */
	function print(output, forceParens) {
		if (!(output instanceof MinifiedOutput)) {
			original.call(this, output, forceParens);
			return;
		}
		if (this instanceof AST_Scope) {
			output.active_scope = this;
		} else if (
			!output.use_asm &&
			this instanceof AST_Directive &&
			this.value === "use asm"
		) {
			output.use_asm = output.active_scope;
		}
		const { stack } = output;
		stack.push(this);
		const parenthesized = forceParens || this.needs_parens(output);
		if (parenthesized) output.print("(");
		output.prepend_comments(this);
		this.add_source_map(output);
		this._codegen(this, output);
		output.append_comments(this);
		if (parenthesized) output.print(")");
		stack.pop();
		if (this === output.use_asm) output.use_asm = null;
	}

	// terser's mangler swaps `print` for a counting wrapper that calls `_print`,
	// then restores `print` from `_print`, so both have to be this one.
	AST_Node.DEFMETHOD("print", print);
	AST_Node.DEFMETHOD("_print", print);
};

// terser's `TreeWalker#_visit`, each run of whitespace read as one space: the
// one version the walk phase below replaces.
const TERSER_VISIT = [
	"_visit(node, descend) { this.push(node);",
	"var ret = this.visit(node, descend ? function() { descend.call(node); } : noop);",
	"if (!ret && descend) { descend.call(node); } this.pop(); return ret; }"
].join(" ");

// The xxhash64 of terser's `ast.js`, which `nodeClasses` in `data.js` is
// generated from: the one version the table describes.
const TERSER_AST = "b183ff99b9a755a7";

// A child as `nodeClasses` lists it: `?` where it may be absent, `~` where it
// may not be a node, `*` where it is a list.
const NODE_CHILD = /^(\?)?([*~])?([a-z_]+)$/;

/**
 * A node class's own walk and backwards push, with its children's walk taking
 * the visitor as an argument rather than closing over it.
 * @typedef {object} NodeWalk
 * @property {{ _walk: (this: Node, visitor: EXPECTED_ANY) => boolean, _children_backwards: (this: Node, push: (node: Node) => void) => void }} prototype the class's prototype
 * @property {string | null} guard the property that has to be set for the class to have children to walk
 * @property {((this: Node, visitor: EXPECTED_ANY) => void) | undefined} descend walks the node's children, where it has its own walk
 * @property {((this: Node, push: (node: Node) => void) => void) | undefined} backwards pushes them last first, where it has its own
 */

/**
 * The source reaching each child `nodeClasses` lists, one statement each.
 * @param {string[]} children the children, in the order they are reached
 * @param {(value: string) => string} reach the statement reaching one node
 * @param {boolean} backwards whether a list is reached last element first
 * @returns {string} the statements
 */
const reachChildren = (children, reach, backwards) =>
	children
		.map((child, index) => {
			const [, optional, kind, field] = /** @type {RegExpExecArray} */ (
				NODE_CHILD.exec(child)
			);
			const value = `this.${field}`;
			let statement;
			// As terser writes them: a body walked by one shared helper, its
			// `walk_body`, and every other list by a `var` loop of its own.
			if (kind === "*") {
				statement = backwards
					? `{ var i${index} = ${value}.length; while (i${index}--) ${reach(`${value}[i${index}]`)} }`
					: field === "body"
						? `walkList(${value}, visitor);`
						: `{ var list${index} = ${value}; for (var i${index} = 0, len${index} = list${index}.length; i${index} < len${index}; i${index}++) ${reach(`list${index}[i${index}]`)} }`;
			} else if (kind === "~") {
				statement = `if (${value} instanceof AST_Node) ${reach(value)}`;
			} else {
				statement = reach(value);
			}
			return optional ? `if (${value}) ${statement}` : statement;
		})
		.join("\n");

/**
 * Every node class's own walk and backwards push, built from the children
 * `nodeClasses` lists for it, created once rather than per visit.
 * @param {TerserModules} modules terser's modules
 * @returns {NodeWalk[]} one per class with either of its own
 */
const buildNodeWalks = ({ ast }) => {
	const { nodeClasses } = require("./data");

	/**
	 * terser's `walk_body`: each node of a list walked in order.
	 * @param {Node[]} list the nodes
	 * @param {EXPECTED_ANY} visitor the walker
	 * @returns {void}
	 */
	const walkList = (list, visitor) => {
		for (let i = 0, len = list.length; i < len; i++) list[i]._walk(visitor);
	};

	/** @type {NodeWalk[]} */
	const walks = [];
	for (const { type, walk, guard, backwards } of nodeClasses()) {
		if (walk === null && backwards === null) continue;
		/**
		 * @param {string} body the function's body
		 * @param {string} parameter its parameter
		 * @returns {EXPECTED_ANY} the function, closing over `AST_Node`
		 */
		const compile = (body, parameter) =>
			// eslint-disable-next-line no-new-func
			new Function(
				"AST_Node",
				"walkList",
				`"use strict"; return function (${parameter}) {${body}};`
			)(ast.AST_Node, walkList);
		walks.push({
			prototype: ast[`AST_${type}`].prototype,
			guard,
			descend:
				walk === null || walk.length === 0
					? undefined
					: compile(
							reachChildren(walk, (value) => `${value}._walk(visitor);`, false),
							"visitor"
						),
			backwards:
				backwards === null
					? undefined
					: compile(
							reachChildren(backwards, (value) => `push(${value});`, true),
							"push"
						)
		});
	}
	return walks;
};

/**
 * Whether terser's node classes are still the ones `nodeClasses` describes.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when they are
 */
const nodeClassesFit = ({ ast }) => {
	if (!ast || hashTerserFile("ast.js") !== TERSER_AST) return false;

	const { nodeClasses } = require("./data");

	return nodeClasses().every(({ type, base }) => {
		const ctor = ast[`AST_${type}`];
		return (
			typeof ctor === "function" &&
			ctor.TYPE === type &&
			(base === null
				? ctor.BASE === undefined
				: ctor.BASE === ast[`AST_${base}`])
		);
	});
};

/**
 * Whether the walker is still the one the phase replaces, and the node classes
 * the ones whose walks it builds.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const walkFits = (modules) => {
	const { TreeWalker } = modules.ast;
	return (
		typeof TreeWalker === "function" &&
		TreeWalker.prototype._visit.toString().replace(/\s+/g, " ") ===
			TERSER_VISIT &&
		nodeClassesFit(modules)
	);
};

/**
 * Installs webpack's tree walk. It is terser's, less the two closures terser
 * allocated per visited node: the children's walk and the `descend` a visitor
 * is handed, which here is one function per walker descending the current node.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installWalk = (modules) => {
	const { TreeWalker } = modules.ast;
	/**
	 * @this {Node} the node walked
	 * @param {EXPECTED_ANY} visitor the walker
	 * @returns {boolean} whether the visitor stopped the walk
	 */
	function walkLeaf(visitor) {
		return visitor._visit(this);
	}
	const { AST_Node } = modules.ast;
	AST_Node.prototype._walk = walkLeaf;
	/**
	 * @this {Node} the node walked
	 * @param {EXPECTED_ANY} visitor the walker
	 * @returns {boolean} whether the visitor stopped the walk
	 */
	AST_Node.prototype.walk = function walk(visitor) {
		return this._walk(visitor);
	};
	for (const { prototype, guard, descend, backwards } of buildNodeWalks(
		modules
	)) {
		if (backwards !== undefined) prototype._children_backwards = backwards;
		if (descend === undefined) continue;
		/**
		 * @this {Node} the node walked
		 * @param {EXPECTED_ANY} visitor the walker
		 * @returns {boolean} whether the visitor stopped the walk
		 */
		function walk(visitor) {
			return visitor._visit(this, descend);
		}
		/**
		 * @this {Node} the node walked
		 * @param {EXPECTED_ANY} visitor the walker
		 * @returns {boolean} whether the visitor stopped the walk
		 */
		function walkWhereSet(visitor) {
			return visitor._visit(
				this,
				this[/** @type {string} */ (guard)] ? descend : undefined
			);
		}
		prototype._walk = guard === null ? walk : walkWhereSet;
	}

	/**
	 * Walks the children of the node the walker is visiting; the node is the top
	 * of its stack, as nothing a visitor walks before descending stays pushed.
	 * @this {EXPECTED_ANY} the walker
	 * @returns {void}
	 */
	function descendCurrent() {
		this.webpackDescend.call(this.stack[this.stack.length - 1], this);
	}

	/**
	 * @this {EXPECTED_ANY} the walker
	 * @param {Node} node the node visited
	 * @param {((this: Node, visitor: EXPECTED_ANY) => void)=} descend walks its children
	 * @returns {boolean} whether the visitor stopped the walk
	 */
	TreeWalker.prototype._visit = function _visit(node, descend) {
		this.push(node);
		let stopped;
		if (descend) {
			if (this.webpackDescendCurrent === undefined) {
				this.webpackDescendCurrent = descendCurrent.bind(this);
			}
			const outer = this.webpackDescend;
			this.webpackDescend = descend;
			stopped = this.visit(node, this.webpackDescendCurrent);
			if (!stopped) descend.call(node, this);
			this.webpackDescend = outer;
		} else {
			stopped = this.visit(node, noop);
		}
		this.pop();
		return stopped;
	};
};

/**
 * Whether terser's node classes are still the ones the nodes phase gives their
 * hand-written methods.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const nodesFits = (modules) =>
	Boolean(modules.parse) &&
	typeof modules.parse.parse === "function" &&
	Boolean(modules.utils) &&
	typeof modules.utils.MAP === "function" &&
	nodeClassesFit(modules);

/**
 * Installs webpack's own copies of the methods terser's `ast.js` writes by hand
 * on its node classes and its `TreeWalker`: cloning, computed keys, the names
 * a declaration binds, and the walker's look-ups of its stack.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installNodes = (modules) => {
	const { ast, parse, utils } = modules;
	const {
		AST_Arrow,
		AST_Block,
		AST_Break,
		AST_Call,
		AST_Class,
		AST_ClassPrivateProperty,
		AST_ClassProperty,
		AST_ClassStaticBlock,
		AST_ConciseMethod,
		AST_Constant,
		AST_DefaultAssign,
		AST_Destructuring,
		AST_Directive,
		AST_Expansion,
		AST_For,
		AST_ForIn,
		AST_ForOf,
		AST_IterationStatement,
		AST_Label,
		AST_LabeledStatement,
		AST_Lambda,
		AST_LoopControl,
		AST_Node,
		AST_ObjectGetter,
		AST_ObjectKeyVal,
		AST_ObjectSetter,
		AST_PrivateGetter,
		AST_PrivateMethod,
		AST_PrivateSetter,
		AST_Return,
		AST_Scope,
		AST_Switch,
		AST_SymbolClassProperty,
		AST_SymbolDeclaration,
		AST_SymbolFunarg,
		AST_SymbolMethod,
		AST_SymbolRef,
		AST_This,
		AST_Toplevel,
		AST_VarDefLike,
		TreeTransformer,
		TreeWalker
	} = ast;
	const Node = AST_Node.prototype;

	/**
	 * @this {Node} the node
	 * @param {boolean=} deep whether its children are cloned too
	 * @returns {Node} the copy
	 */
	Node._clone = function _clone(deep) {
		if (deep) {
			const self = this.clone();
			return self.transform(
				new TreeTransformer((/** @type {Node} */ node) =>
					node !== self ? node.clone(true) : undefined
				)
			);
		}
		return new this.CTOR(this);
	};
	/**
	 * @this {Node} the node
	 * @param {boolean=} deep whether its children are cloned too
	 * @returns {Node} the copy
	 */
	Node.clone = function clone(deep) {
		return this._clone(deep);
	};
	/**
	 * terser's `clone_block_scope`: a copy taking a copy of the block scope.
	 * @this {Node} a block
	 * @param {boolean=} deep whether its children are cloned too
	 * @returns {Node} the copy
	 */
	function cloneBlockScope(deep) {
		const copy = this._clone(deep);
		if (this.block_scope) copy.block_scope = this.block_scope.clone();
		return copy;
	}
	AST_Block.prototype.clone = cloneBlockScope;
	AST_IterationStatement.prototype.clone = cloneBlockScope;
	AST_ClassStaticBlock.prototype.clone = cloneBlockScope;
	/**
	 * A copy whose `break` and `continue` reach the copied label.
	 * @this {Node} a labeled statement
	 * @param {boolean=} deep whether its children are cloned too
	 * @returns {Node} the copy
	 */
	AST_LabeledStatement.prototype.clone = function clone(deep) {
		const copy = this._clone(deep);
		if (deep) {
			const { label } = copy;
			const definition = this.label;
			copy.walk(
				new TreeWalker((/** @type {Node} */ node) => {
					if (
						node instanceof AST_LoopControl &&
						node.label &&
						node.label.thedef === definition
					) {
						node.label.thedef = label;
						label.references.push(node);
					}
				})
			);
		}
		return copy;
	};
	/**
	 * @this {Node} a scope
	 * @param {boolean=} deep whether its children are cloned too
	 * @param {Node=} toplevel the toplevel to work its scope out against
	 * @returns {Node} the copy
	 */
	AST_Scope.prototype.clone = function clone(deep, toplevel) {
		const copy = this._clone(deep);
		if (deep && this.variables && toplevel && !this._block_scope) {
			copy.figure_out_scope({}, { toplevel, parent_scope: this.parent_scope });
		} else {
			if (this.variables) copy.variables = new Map(this.variables);
			if (this.enclosed) copy.enclosed = [...this.enclosed];
			if (this._block_scope) copy._block_scope = this._block_scope;
		}
		return copy;
	};
	/**
	 * @this {Node} a scope
	 * @returns {Node} the nearest scope enclosing it that is not a block
	 */
	AST_Scope.prototype.get_defun_scope = function get_defun_scope() {
		/** @type {Node} */
		let self = this;
		while (self.is_block_scope()) self = self.parent_scope;
		return self;
	};
	/**
	 * @this {Node} a scope
	 * @returns {boolean} whether `eval` or `with` can reach its names
	 */
	AST_Scope.prototype.pinned = function pinned() {
		return this.uses_eval || this.uses_with;
	};

	/**
	 * The toplevel parsed out of a wrapper, its `"$ORIG"` directive replaced by
	 * this toplevel's body.
	 * @param {Node} toplevel the toplevel wrapped
	 * @param {string} wrapper the source of the wrapper
	 * @returns {Node} the wrapped toplevel
	 */
	const wrapBody = (toplevel, wrapper) => {
		const { body } = toplevel;
		return parse.parse(wrapper).transform(
			new TreeTransformer((/** @type {Node} */ node) => {
				if (node instanceof AST_Directive && node.value === "$ORIG") {
					return utils.MAP.splice(body);
				}
			})
		);
	};
	/**
	 * @this {Node} the toplevel
	 * @param {string} name the global its exports are written to
	 * @returns {Node} the toplevel wrapped as a CommonJS module
	 */
	AST_Toplevel.prototype.wrap_commonjs = function wrap_commonjs(name) {
		return wrapBody(
			this,
			`(function(exports){'$ORIG';})(typeof ${name}=='undefined'?(${name}={}):${name});`
		);
	};
	/**
	 * @this {Node} the toplevel
	 * @param {unknown} argsValues `parameters:arguments` the wrapper is called with
	 * @returns {Node} the toplevel wrapped in a function called at once
	 */
	AST_Toplevel.prototype.wrap_enclose = function wrap_enclose(argsValues) {
		const given = typeof argsValues === "string" ? argsValues : "";
		let index = given.indexOf(":");
		if (index < 0) index = given.length;
		return wrapBody(
			this,
			`(function(${given.slice(0, index)}){"$ORIG"})(${given.slice(index + 1)})`
		);
	};

	/**
	 * @this {Node} a function
	 * @returns {Node[]} the names its parameters bind
	 */
	AST_Lambda.prototype.args_as_names = function args_as_names() {
		const { argnames } = this;
		if (
			argnames.every(
				(/** @type {Node} */ argument) =>
					argument instanceof AST_SymbolDeclaration
			)
		) {
			return argnames;
		}
		/** @type {Node[]} */
		const out = [];
		for (const argument of argnames) {
			if (argument instanceof AST_Destructuring) {
				out.push(...argument.all_symbols());
			} else if (argument instanceof AST_Expansion) {
				out.push(...argument.expression.all_symbols());
			} else if (argument instanceof AST_DefaultAssign) {
				out.push(...argument.left.all_symbols());
			} else {
				out.push(argument);
			}
		}
		return out;
	};
	/**
	 * @this {Node} a function
	 * @returns {Node | false | undefined} the value it returns at once, where it is all it does
	 */
	AST_Lambda.prototype.is_braceless = function is_braceless() {
		return this.body[0] instanceof AST_Return && this.body[0].value;
	};
	/**
	 * @this {Node} a function
	 * @returns {number} its `length`, the parameters before the first default or rest
	 */
	AST_Lambda.prototype.length_property = function length_property() {
		let length = 0;
		for (const argument of this.argnames) {
			if (
				argument instanceof AST_SymbolFunarg ||
				argument instanceof AST_Destructuring
			) {
				length++;
			}
		}
		return length;
	};
	/**
	 * @this {Node} a pattern
	 * @returns {Node[]} the names it binds, those of functions in its defaults aside
	 */
	AST_Destructuring.prototype.all_symbols = function all_symbols() {
		/** @type {Node[]} */
		const out = [];
		this.walk(
			new TreeWalker((/** @type {Node} */ node) => {
				if (node instanceof AST_SymbolDeclaration) out.push(node);
				if (node instanceof AST_Lambda) return true;
			})
		);
		return out;
	};
	/**
	 * @this {Node} a default
	 * @returns {Node[]} the names its target binds
	 */
	AST_DefaultAssign.prototype.all_symbols = function all_symbols() {
		return this.left.all_symbols();
	};
	/**
	 * @this {Node} a name declared
	 * @returns {Node[]} itself
	 */
	AST_SymbolDeclaration.prototype.all_symbols = function all_symbols() {
		return [this];
	};
	/**
	 * @this {Node} a declarator
	 * @returns {Node[]} the names it declares
	 */
	AST_VarDefLike.prototype.declarations_as_names =
		function declarations_as_names() {
			return this.name instanceof AST_SymbolDeclaration
				? [this.name]
				: this.name.all_symbols();
		};
	/**
	 * @this {Node} a call
	 * @returns {void}
	 */
	AST_Call.prototype.initialize = function initialize() {
		if (this._annotations === null || this._annotations === undefined) {
			this._annotations = 0;
		}
	};
	/**
	 * @this {Node} a label
	 * @returns {void}
	 */
	AST_Label.prototype.initialize = function initialize() {
		this.references = [];
		this.thedef = this;
	};
	/**
	 * @this {Node} a constant
	 * @returns {unknown} its value
	 */
	AST_Constant.prototype.getValue = function getValue() {
		return this.value;
	};

	/** @type {(this: Node) => boolean} */
	const neverComputed = () => false;
	/**
	 * @this {Node} a method or accessor
	 * @returns {boolean} whether its key is an expression
	 */
	function keyIsExpression() {
		return !(this.key instanceof AST_SymbolMethod);
	}
	/**
	 * @this {Node} a property
	 * @returns {boolean} whether its key is an expression
	 */
	AST_ObjectKeyVal.prototype.computed_key = function computed_key() {
		return this.key instanceof AST_Node;
	};
	AST_ObjectGetter.prototype.computed_key = keyIsExpression;
	AST_ObjectSetter.prototype.computed_key = keyIsExpression;
	AST_ConciseMethod.prototype.computed_key = keyIsExpression;
	AST_PrivateGetter.prototype.computed_key = neverComputed;
	AST_PrivateSetter.prototype.computed_key = neverComputed;
	AST_PrivateMethod.prototype.computed_key = neverComputed;
	AST_ClassPrivateProperty.prototype.computed_key = neverComputed;
	AST_ClassStaticBlock.prototype.computed_key = neverComputed;
	/**
	 * @this {Node} a class field
	 * @returns {boolean} whether its key is an expression
	 */
	AST_ClassProperty.prototype.computed_key = function computed_key() {
		return !(this.key instanceof AST_SymbolClassProperty);
	};

	/**
	 * Walks what a class runs as it is defined: its heritage, static blocks,
	 * computed keys and static field values.
	 * @this {Node} a class
	 * @param {EXPECTED_ANY} visitor the walker
	 * @returns {void}
	 */
	AST_Class.prototype.visit_nondeferred_class_parts =
		function visit_nondeferred_class_parts(visitor) {
			if (this.extends) this.extends._walk(visitor);
			for (const prop of this.properties) {
				if (prop instanceof AST_ClassStaticBlock) {
					prop._walk(visitor);
					continue;
				}
				if (prop.computed_key()) {
					visitor.push(prop);
					prop.key._walk(visitor);
					visitor.pop();
				}
				if (
					(prop instanceof AST_ClassPrivateProperty &&
						prop.static &&
						prop.value) ||
					(prop instanceof AST_ClassProperty && prop.static && prop.value)
				) {
					visitor.push(prop);
					prop.value._walk(visitor);
					visitor.pop();
				}
			}
		};
	/**
	 * Walks what a class runs later: its methods and instance field values.
	 * @this {Node} a class
	 * @param {EXPECTED_ANY} visitor the walker
	 * @returns {void}
	 */
	AST_Class.prototype.visit_deferred_class_parts =
		function visit_deferred_class_parts(visitor) {
			for (const prop of this.properties) {
				if (
					prop instanceof AST_ConciseMethod ||
					prop instanceof AST_PrivateMethod
				) {
					prop.walk(visitor);
				} else if (
					(prop instanceof AST_ClassProperty && !prop.static && prop.value) ||
					(prop instanceof AST_ClassPrivateProperty &&
						!prop.static &&
						prop.value)
				) {
					visitor.push(prop);
					prop.value._walk(visitor);
					visitor.pop();
				}
			}
		};
	/**
	 * @this {Node} a class
	 * @returns {boolean} whether what it runs as it is defined reads the class
	 */
	AST_Class.prototype.is_self_referential = function is_self_referential() {
		const thisId = this.name && this.name.definition().id;
		let found = false;
		let classThis = true;
		this.visit_nondeferred_class_parts(
			new TreeWalker(
				(/** @type {Node} */ node, /** @type {() => void} */ descend) => {
					if (found) return true;
					if (node instanceof AST_This) return (found = classThis);
					if (node instanceof AST_SymbolRef) {
						return (found = node.definition().id === thisId);
					}
					if (node instanceof AST_Lambda && !(node instanceof AST_Arrow)) {
						const outer = classThis;
						classThis = false;
						descend();
						classThis = outer;
						return true;
					}
				}
			)
		);
		return found;
	};

	const Walker = TreeWalker.prototype;
	/**
	 * @this {EXPECTED_ANY} the walker
	 * @param {number=} n how many parents up
	 * @returns {Node | undefined} that parent of the node visited
	 */
	Walker.parent = function parent(n) {
		return this.stack[this.stack.length - 2 - (n || 0)];
	};
	/**
	 * @this {EXPECTED_ANY} the walker
	 * @returns {Node | undefined} the node visited
	 */
	Walker.self = function self() {
		return this.stack[this.stack.length - 1];
	};
	/**
	 * @this {EXPECTED_ANY} the walker
	 * @param {EXPECTED_FUNCTION} type a node class
	 * @returns {Node | undefined} the nearest node of that class on the stack
	 */
	Walker.find_parent = function find_parent(type) {
		const { stack } = this;
		for (let i = stack.length; --i >= 0;) {
			if (stack[i] instanceof type) return stack[i];
		}
	};
	/**
	 * @this {EXPECTED_ANY} the walker
	 * @returns {boolean} whether the node visited can run more than once in its function
	 */
	Walker.is_within_loop = function is_within_loop() {
		const { stack } = this;
		let i = stack.length - 1;
		let child = stack[i];
		while (i--) {
			const node = stack[i];
			if (node instanceof AST_Lambda) return false;
			if (
				node instanceof AST_IterationStatement &&
				// The parts of a `for` loop that run only once.
				!(node instanceof AST_For && child === node.init) &&
				!(
					(node instanceof AST_ForIn || node instanceof AST_ForOf) &&
					child === node.object
				)
			) {
				return true;
			}
			child = node;
		}
		return false;
	};
	/**
	 * @this {EXPECTED_ANY} the walker
	 * @returns {Node | undefined} the scope the node visited declares into
	 */
	Walker.find_scope = function find_scope() {
		const { stack } = this;
		for (let i = stack.length; --i >= 0;) {
			const node = stack[i];
			if (node instanceof AST_Toplevel) return node;
			if (node instanceof AST_Lambda) return node;
			if (node.block_scope) return node.block_scope;
		}
	};
	/**
	 * @this {EXPECTED_ANY} the walker
	 * @param {string} type a directive, such as `use strict`
	 * @returns {Node | undefined} the directive, where it is in force
	 */
	Walker.has_directive = function has_directive(type) {
		const directive = this.directives[type];
		if (directive) return directive;
		const node = this.stack[this.stack.length - 1];
		if (node instanceof AST_Scope && node.body) {
			const { body } = node;
			for (let i = 0; i < body.length; ++i) {
				const statement = body[i];
				if (!(statement instanceof AST_Directive)) break;
				if (statement.value === type) return statement;
			}
		}
	};
	/**
	 * @this {EXPECTED_ANY} the walker
	 * @param {Node} node a `break` or `continue`
	 * @returns {Node | undefined} the statement it leaves or continues
	 */
	Walker.loopcontrol_target = function loopcontrol_target(node) {
		const { stack } = this;
		if (node.label) {
			for (let i = stack.length; --i >= 0;) {
				const parent = stack[i];
				if (
					parent instanceof AST_LabeledStatement &&
					parent.label.name === node.label.name
				) {
					return parent.body;
				}
			}
		} else {
			for (let i = stack.length; --i >= 0;) {
				const parent = stack[i];
				if (
					parent instanceof AST_IterationStatement ||
					(node instanceof AST_Break && parent instanceof AST_Switch)
				) {
					return parent;
				}
			}
		}
	};
};

// The xxhash64 of terser's `global-defs.js` and its `drop_console`, each run of
// whitespace read as one space: the one version the defines phase reproduces.
const TERSER_DEFINES = {
	file: "a7c98862d079a7cb",
	dropConsole: "d97cdc795222b519"
};

/**
 * Whether terser's `global_defs` and `drop_console` are still the ones the
 * defines phase reproduces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const definesFits = ({ ast }) => {
	const dropConsole =
		ast && ast.AST_Toplevel && ast.AST_Toplevel.prototype.drop_console;
	return (
		typeof dropConsole === "function" &&
		hashTerserSource(dropConsole.toString()) === TERSER_DEFINES.dropConsole &&
		hashTerserFile("compress/global-defs.js") === TERSER_DEFINES.file
	);
};

/**
 * Installs webpack's `global_defs` replacement, which swaps each global the
 * option names for the value it gives, and `drop_console`.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installDefines = (modules) => {
	const { ast } = modules;
	const {
		AST_Array,
		AST_Chain,
		AST_Constant,
		AST_Dot,
		AST_ImportMeta,
		AST_Node,
		AST_Object,
		AST_ObjectKeyVal,
		AST_PropAccess,
		AST_SymbolDeclaration,
		AST_SymbolRef,
		AST_Toplevel,
		TreeTransformer
	} = ast;
	const helpers = createCompressHelpers(modules);
	const { make_node: makeNode, make_void_0: makeVoid0 } = helpers.utils;
	const {
		make_empty_function: makeEmptyFunction,
		make_node_from_constant: makeNodeFromConstant
	} = helpers.common;
	const {
		is_lhs: isLhs,
		is_undeclared_ref: isUndeclaredRef,
		is_used_in_expression: isUsedInExpression
	} = helpers.inference;
	const { SQUEEZED, set_flag: setFlag } = helpers.flags;

	/**
	 * terser's `to_node`: the node a `global_defs` value stands for.
	 * @param {unknown} value the value
	 * @param {Node} orig where its position comes from
	 * @returns {Node} the node
	 */
	const toNode = (value, orig) => {
		if (value instanceof AST_Node) {
			// Anything but a constant may hold functions, so it is never shared.
			const given = /** @type {Node} */ (value);
			const node = given instanceof AST_Constant ? given : given.clone(true);
			return makeNode(node.CTOR, orig, node);
		}
		if (Array.isArray(value)) {
			return makeNode(AST_Array, orig, {
				elements: value.map((element) => toNode(element, orig))
			});
		}
		if (value && typeof value === "object") {
			/** @type {Node[]} */
			const properties = [];
			for (const key in value) {
				if (Object.prototype.hasOwnProperty.call(value, key)) {
					properties.push(
						makeNode(AST_ObjectKeyVal, orig, {
							key,
							value: toNode(
								/** @type {Record<string, unknown>} */ (value)[key],
								orig
							)
						})
					);
				}
			}
			return makeNode(AST_Object, orig, { properties });
		}
		return makeNodeFromConstant(value, orig);
	};
	/**
	 * @param {Node} node a global or `import.meta`
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} name what it reads, with the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	const defined = (node, compressor, name) => {
		const defines = compressor.option("global_defs");
		return Object.prototype.hasOwnProperty.call(defines, name)
			? toNode(defines[name], node)
			: undefined;
	};

	/** @type {(this: Node) => undefined} */
	AST_Node.prototype._find_defs = function _find_defs() {
		return undefined;
	};
	/**
	 * @this {Node} an optional chain
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} suffix the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	AST_Chain.prototype._find_defs = function _find_defs(compressor, suffix) {
		return this.expression._find_defs(compressor, suffix);
	};
	/**
	 * @this {Node} a property read
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} suffix the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	AST_Dot.prototype._find_defs = function _find_defs(compressor, suffix) {
		return this.expression._find_defs(compressor, `.${this.property}${suffix}`);
	};
	/**
	 * terser's asks whether the name is global, which throws where it has no
	 * definition, and then gives nothing either way.
	 * @this {Node} a name declared
	 * @returns {undefined} nothing
	 */
	AST_SymbolDeclaration.prototype._find_defs = function _find_defs() {
		this.global();
		return undefined;
	};
	/**
	 * @this {Node} a name read
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} suffix the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	AST_SymbolRef.prototype._find_defs = function _find_defs(compressor, suffix) {
		if (!this.global()) return undefined;
		return defined(this, compressor, this.name + suffix);
	};
	/**
	 * @this {Node} `import.meta`
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} suffix the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	AST_ImportMeta.prototype._find_defs = function _find_defs(
		compressor,
		suffix
	) {
		return defined(this, compressor, `import.meta${suffix}`);
	};
	/**
	 * @this {Node} the toplevel
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @returns {Node} the toplevel, each global `global_defs` names replaced
	 */
	AST_Toplevel.prototype.resolve_defines = function resolve_defines(
		compressor
	) {
		if (!compressor.option("global_defs")) return this;
		this.figure_out_scope({ ie8: compressor.option("ie8") });
		return this.transform(
			new TreeTransformer(
				/**
				 * @this {EXPECTED_ANY} the transformer
				 * @param {Node} node the node visited
				 * @returns {Node | undefined} what replaces it
				 */
				function replace(node) {
					const definition = node._find_defs(compressor, "");
					if (!definition) return;
					let level = 0;
					let child = node;
					let parent;
					while ((parent = this.parent(level++))) {
						if (!(parent instanceof AST_PropAccess)) break;
						if (parent.expression !== child) break;
						child = parent;
					}
					if (isLhs(child, parent)) return;
					return definition;
				}
			)
		);
	};

	/**
	 * @this {Node} the toplevel
	 * @param {boolean | string[]} options which `console` methods to drop, all where `true`
	 * @returns {Node} the toplevel without those calls
	 */
	AST_Toplevel.prototype.drop_console = function drop_console(options) {
		const isArray = Array.isArray(options);
		const tt = new TreeTransformer((/** @type {Node} */ self) => {
			if (self.TYPE !== "Call") return;
			const exp = self.expression;
			if (!(exp instanceof AST_PropAccess)) return;
			let name = exp.expression;
			let { property } = exp;
			let depth = 2;
			while (name.expression) {
				property = name.property;
				name = name.expression;
				depth++;
			}
			if (isArray && !options.includes(property)) return;
			if (isUndeclaredRef(name) && name.name === "console") {
				if (
					depth === 3 &&
					!["call", "apply"].includes(exp.property) &&
					isUsedInExpression(tt)
				) {
					// A used call to a method of `console.log`, as in
					// `console.log.bind(console)`; `call` and `apply` return undefined.
					exp.expression = makeEmptyFunction(self);
					setFlag(exp.expression, SQUEEZED);
					self.args = [];
				} else {
					return makeVoid0(self);
				}
			}
		});
		return this.transform(tt);
	};
};

// The xxhash64 of each terser source the transform phase below reproduces,
// each run of whitespace read as one space: the one version it was written against.
const TERSER_TRANSFORM = {
	transform: "aecce825f2803e2c",
	push: "51e48e652fca3c03",
	pop: "6fe78b912f41c0d4",
	before: "062379b354b02a13"
};

// Which of terser's classes a node is, as bits on each class's prototype, so
// a hot path reads one property where terser runs an `instanceof` chain.
const NODE_KIND = Symbol("webpack node kind");
const KIND_SCOPE = 1;
const KIND_LAMBDA = 1 << 1;
const KIND_CLASS = 1 << 2;
const KIND_TOPLEVEL = 1 << 3;
const KIND_DIRECTIVE = 1 << 4;
const KIND_OBJECT_PROPERTY = 1 << 5;

/**
 * Sets each class's kind bits, once: a subclass inherits its parents', so
 * a class is marked only after every class it extends.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const markNodeKinds = ({ ast }) => {
	if (Object.prototype.hasOwnProperty.call(ast.AST_Node.prototype, NODE_KIND)) {
		return;
	}
	ast.AST_Node.prototype[NODE_KIND] = 0;
	for (const [ctor, bit] of [
		[ast.AST_Scope, KIND_SCOPE],
		[ast.AST_Lambda, KIND_LAMBDA],
		[ast.AST_Class, KIND_CLASS],
		[ast.AST_Toplevel, KIND_TOPLEVEL],
		[ast.AST_Directive, KIND_DIRECTIVE],
		[ast.AST_ObjectProperty, KIND_OBJECT_PROPERTY]
	]) {
		ctor.prototype[NODE_KIND] |= bit;
	}
};

// The ESTree type of each terser class, keyed by its `TYPE`, which the phases
// below dispatch on, so moving onto ESTree nodes swaps only this table.
// A class meaning more than one ESTree type resolves it per node.
/** @type {Record<string, string | ((node: Node, parent: Node | undefined) => string | null)>} */
const ESTREE_TYPES = {
	Node: "Node",
	Debugger: "DebuggerStatement",
	Directive: "ExpressionStatement",
	SimpleStatement: "ExpressionStatement",
	BlockStatement: "BlockStatement",
	TryBlock: "BlockStatement",
	Finally: "BlockStatement",
	Toplevel: "Program",
	Accessor: "FunctionExpression",
	Function: "FunctionExpression",
	Arrow: "ArrowFunctionExpression",
	Defun: "FunctionDeclaration",
	DefClass: "ClassDeclaration",
	ClassExpression: "ClassExpression",
	ClassStaticBlock: "StaticBlock",
	Switch: "SwitchStatement",
	SwitchBranch: "SwitchCase",
	Catch: "CatchClause",
	EmptyStatement: "EmptyStatement",
	LabeledStatement: "LabeledStatement",
	Do: "DoWhileStatement",
	While: "WhileStatement",
	For: "ForStatement",
	ForIn: "ForInStatement",
	ForOf: "ForOfStatement",
	With: "WithStatement",
	If: "IfStatement",
	Return: "ReturnStatement",
	Throw: "ThrowStatement",
	Break: "BreakStatement",
	Continue: "ContinueStatement",
	Try: "TryStatement",
	DefinitionsLike: "VariableDeclaration",
	Export: (/** @type {Node} */ node) =>
		node.exported_names
			? node.exported_names[0] &&
				node.exported_names[0].name.name === "*" &&
				!node.exported_names[0].name.quote
				? "ExportAllDeclaration"
				: "ExportNamedDeclaration"
			: node.is_default
				? "ExportDefaultDeclaration"
				: "ExportNamedDeclaration",
	Expansion: (node, parent) =>
		parent &&
		(parent.TYPE === "Destructuring" || parent[NODE_KIND] & KIND_LAMBDA)
			? "RestElement"
			: "SpreadElement",
	Destructuring: (/** @type {Node} */ node) =>
		node.is_array ? "ArrayPattern" : "ObjectPattern",
	PrefixedTemplateString: "TaggedTemplateExpression",
	TemplateString: "TemplateLiteral",
	TemplateSegment: "TemplateElement",
	Await: "AwaitExpression",
	Yield: "YieldExpression",
	VarDefLike: "VariableDeclarator",
	NameMapping: (node, parent) =>
		parent && parent.TYPE === "Import"
			? node.foreign_name.name === "*" && !node.foreign_name.quote
				? "ImportNamespaceSpecifier"
				: "ImportSpecifier"
			: parent && estreeType(parent) === "ExportAllDeclaration"
				? null
				: "ExportSpecifier",
	Import: "ImportDeclaration",
	ImportMeta: "MetaProperty",
	NewTarget: "MetaProperty",
	DynamicImport: "ImportExpression",
	Call: "CallExpression",
	New: "NewExpression",
	Sequence: "SequenceExpression",
	PropAccess: "MemberExpression",
	Chain: "ChainExpression",
	Unary: (/** @type {Node} */ node) =>
		node.operator === "++" || node.operator === "--"
			? "UpdateExpression"
			: "UnaryExpression",
	Binary: (/** @type {Node} */ node) =>
		node.operator === "&&" || node.operator === "||" || node.operator === "??"
			? "LogicalExpression"
			: "BinaryExpression",
	Assign: "AssignmentExpression",
	DefaultAssign: "AssignmentPattern",
	Conditional: "ConditionalExpression",
	Array: "ArrayExpression",
	Object: "ObjectExpression",
	ObjectProperty: (node, parent) =>
		parent && parent.TYPE === "Object" ? "Property" : "MethodDefinition",
	ObjectKeyVal: "Property",
	ClassProperty: "PropertyDefinition",
	ClassPrivateProperty: "PropertyDefinition",
	PrivateIn: "BinaryExpression",
	Symbol: (node, parent) =>
		(node.quote &&
			(node.TYPE === "SymbolImportForeign" ||
				node.TYPE === "SymbolExportForeign" ||
				node.TYPE === "SymbolExport")) ||
		(node.TYPE === "SymbolMethod" && parent && parent.quote)
			? "Literal"
			: "Identifier",
	This: "ThisExpression",
	Super: "Super",
	Constant: "Literal",
	Atom: "Identifier",
	Null: "Literal",
	Boolean: "Literal",
	Hole: () => null
};

const ESTREE_TYPE = Symbol("webpack estree type");

/**
 * Sets each class's ESTree type on its prototype, once; a class absent from the
 * table reads its parent's through the prototype chain.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const markEstreeTypes = ({ ast }) => {
	if (
		Object.prototype.hasOwnProperty.call(ast.AST_Node.prototype, ESTREE_TYPE)
	) {
		return;
	}
	markNodeKinds({ ast });
	for (const type of Object.keys(ESTREE_TYPES)) {
		ast[`AST_${type}`].prototype[ESTREE_TYPE] = ESTREE_TYPES[type];
	}
};

/**
 * The ESTree type terser would convert a node to, `null` for an array hole.
 * @param {Node} node a terser node, its class marked by `markEstreeTypes`
 * @param {Node=} parent the node holding it, which a few classes need
 * @returns {string | null} the ESTree type
 */
const estreeType = (node, parent) => {
	const type = node[ESTREE_TYPE];
	return typeof type === "function" ? type(node, parent) : type;
};

/**
 * Each node class's children as terser's `transform.js` replaces them, keyed by
 * the class the descend is defined on.
 * @param {TerserModules} modules terser's modules
 * @returns {[EXPECTED_ANY, (self: Node, tw: EXPECTED_ANY) => void][]} each class and its descend
 */
const transformDescends = ({ ast, utils }) => {
	const { AST_Node, AST_Number } = ast;
	const doList = utils.MAP;
	return [
		[ast.AST_Node, () => {}],
		[
			ast.AST_LabeledStatement,
			(self, tw) => {
				self.label = self.label.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.AST_SimpleStatement,
			(self, tw) => {
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.AST_Block,
			(self, tw) => {
				self.body = doList(self.body, tw);
			}
		],
		[
			ast.AST_Do,
			(self, tw) => {
				self.body = self.body.transform(tw);
				self.condition = self.condition.transform(tw);
			}
		],
		[
			ast.AST_While,
			(self, tw) => {
				self.condition = self.condition.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.AST_For,
			(self, tw) => {
				if (self.init) self.init = self.init.transform(tw);
				if (self.condition) self.condition = self.condition.transform(tw);
				if (self.step) self.step = self.step.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.AST_ForIn,
			(self, tw) => {
				self.init = self.init.transform(tw);
				self.object = self.object.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.AST_With,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.AST_Exit,
			(self, tw) => {
				if (self.value) self.value = self.value.transform(tw);
			}
		],
		[
			ast.AST_LoopControl,
			(self, tw) => {
				if (self.label) self.label = self.label.transform(tw);
			}
		],
		[
			ast.AST_If,
			(self, tw) => {
				self.condition = self.condition.transform(tw);
				self.body = self.body.transform(tw);
				if (self.alternative) {
					self.alternative = self.alternative.transform(tw);
				}
			}
		],
		[
			ast.AST_Switch,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
				self.body = doList(self.body, tw);
			}
		],
		[
			ast.AST_Case,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
				self.body = doList(self.body, tw);
			}
		],
		[
			ast.AST_Try,
			(self, tw) => {
				self.body = self.body.transform(tw);
				if (self.bcatch) self.bcatch = self.bcatch.transform(tw);
				if (self.bfinally) self.bfinally = self.bfinally.transform(tw);
			}
		],
		[
			ast.AST_Catch,
			(self, tw) => {
				if (self.argname) self.argname = self.argname.transform(tw);
				self.body = doList(self.body, tw);
			}
		],
		[
			ast.AST_DefinitionsLike,
			(self, tw) => {
				self.definitions = doList(self.definitions, tw);
			}
		],
		[
			ast.AST_VarDefLike,
			(self, tw) => {
				self.name = self.name.transform(tw);
				if (self.value) self.value = self.value.transform(tw);
			}
		],
		[
			ast.AST_Destructuring,
			(self, tw) => {
				self.names = doList(self.names, tw);
			}
		],
		[
			ast.AST_Lambda,
			(self, tw) => {
				if (self.name) self.name = self.name.transform(tw);
				self.argnames = doList(self.argnames, tw, false);
				self.body =
					self.body instanceof AST_Node
						? self.body.transform(tw)
						: doList(self.body, tw);
			}
		],
		[
			ast.AST_Call,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
				self.args = doList(self.args, tw, false);
			}
		],
		[
			ast.AST_Sequence,
			(self, tw) => {
				const result = doList(self.expressions, tw);
				self.expressions = result.length
					? result
					: [new AST_Number({ value: 0 })];
			}
		],
		[
			ast.AST_PropAccess,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
			}
		],
		[
			ast.AST_Sub,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
				self.property = self.property.transform(tw);
			}
		],
		[
			ast.AST_Chain,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
			}
		],
		[
			ast.AST_Yield,
			(self, tw) => {
				if (self.expression) self.expression = self.expression.transform(tw);
			}
		],
		[
			ast.AST_Await,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
			}
		],
		[
			ast.AST_Unary,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
			}
		],
		[
			ast.AST_Binary,
			(self, tw) => {
				self.left = self.left.transform(tw);
				self.right = self.right.transform(tw);
			}
		],
		[
			ast.AST_PrivateIn,
			(self, tw) => {
				self.key = self.key.transform(tw);
				self.value = self.value.transform(tw);
			}
		],
		[
			ast.AST_Conditional,
			(self, tw) => {
				self.condition = self.condition.transform(tw);
				self.consequent = self.consequent.transform(tw);
				self.alternative = self.alternative.transform(tw);
			}
		],
		[
			ast.AST_Array,
			(self, tw) => {
				self.elements = doList(self.elements, tw);
			}
		],
		[
			ast.AST_Object,
			(self, tw) => {
				self.properties = doList(self.properties, tw);
			}
		],
		[
			ast.AST_ObjectProperty,
			(self, tw) => {
				if (self.key instanceof AST_Node) self.key = self.key.transform(tw);
				if (self.value) self.value = self.value.transform(tw);
			}
		],
		[
			ast.AST_Class,
			(self, tw) => {
				if (self.name) self.name = self.name.transform(tw);
				if (self.extends) self.extends = self.extends.transform(tw);
				self.properties = doList(self.properties, tw);
			}
		],
		[
			ast.AST_ClassStaticBlock,
			(self, tw) => {
				self.body = doList(self.body, tw);
			}
		],
		[
			ast.AST_Expansion,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
			}
		],
		[
			ast.AST_NameMapping,
			(self, tw) => {
				self.foreign_name = self.foreign_name.transform(tw);
				self.name = self.name.transform(tw);
			}
		],
		[
			ast.AST_Import,
			(self, tw) => {
				if (self.imported_name) {
					self.imported_name = self.imported_name.transform(tw);
				}
				if (self.imported_names) doList(self.imported_names, tw);
				self.module_name = self.module_name.transform(tw);
			}
		],
		[
			ast.AST_DynamicImport,
			(self, tw) => {
				self.args = doList(self.args, tw);
			}
		],
		[
			ast.AST_Export,
			(self, tw) => {
				if (self.exported_definition) {
					self.exported_definition = self.exported_definition.transform(tw);
				}
				if (self.exported_value) {
					self.exported_value = self.exported_value.transform(tw);
				}
				if (self.exported_names) doList(self.exported_names, tw);
				if (self.module_name) self.module_name = self.module_name.transform(tw);
			}
		],
		[
			ast.AST_TemplateString,
			(self, tw) => {
				self.segments = doList(self.segments, tw);
			}
		],
		[
			ast.AST_PrefixedTemplateString,
			(self, tw) => {
				self.prefix = self.prefix.transform(tw);
				self.template_string = self.template_string.transform(tw);
			}
		]
	];
};

/**
 * Whether terser's `transform.js`, its walker's stack and the compressor's
 * `before` are still the ones the phase reproduces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const transformFits = (modules) => {
	const { ast, compress, utils } = modules;
	const TreeWalker = ast && ast.TreeWalker;
	const Compressor = compress && compress.Compressor;
	if (
		typeof TreeWalker !== "function" ||
		typeof Compressor !== "function" ||
		!utils ||
		typeof utils.MAP !== "function" ||
		typeof modules.flags.SQUEEZED !== "number" ||
		transformDescends(modules).some(([ctor]) => typeof ctor !== "function")
	) {
		return false;
	}

	const fs = require("fs");
	const path = require("path");
	const createHash = require("../util/createHash");

	/**
	 * @param {string} source a source
	 * @returns {string} its xxhash64, each run of whitespace read as one space
	 */
	const hash = (source) =>
		createHash("xxhash64").update(source.replace(/\s+/g, " ")).digest("hex");
	return (
		hash(TreeWalker.prototype.push.toString()) === TERSER_TRANSFORM.push &&
		hash(TreeWalker.prototype.pop.toString()) === TERSER_TRANSFORM.pop &&
		hash(Compressor.prototype.before.toString()) === TERSER_TRANSFORM.before &&
		hash(
			fs.readFileSync(
				path.join(
					path.dirname(require.resolve("terser/package.json")),
					"lib/transform.js"
				),
				"utf8"
			)
		) === TERSER_TRANSFORM.transform
	);
};

/**
 * Installs webpack's tree transform. It is terser's, but each class gets a
 * `transform` of its own, the walker's stack reads a node's class from bits on
 * it, and the compressor skips a node it already squeezed without pushing it.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installTransform = (modules) => {
	const { TreeWalker } = modules.ast;
	const { Compressor } = modules.compress;
	markNodeKinds(modules);

	/**
	 * @this {EXPECTED_ANY} the walker
	 * @param {Node} node the node entered
	 * @returns {void}
	 */
	TreeWalker.prototype.push = function push(node) {
		const kind = node[NODE_KIND];
		if ((kind & KIND_LAMBDA) !== 0) {
			this.directives = Object.create(this.directives);
		} else if ((kind & KIND_DIRECTIVE) !== 0 && !this.directives[node.value]) {
			this.directives[node.value] = node;
		} else if ((kind & KIND_CLASS) !== 0) {
			this.directives = Object.create(this.directives);
			if (!this.directives["use strict"]) {
				this.directives["use strict"] = node;
			}
		}
		this.stack.push(node);
	};

	/**
	 * @this {EXPECTED_ANY} the walker
	 * @returns {void}
	 */
	TreeWalker.prototype.pop = function pop() {
		const node = this.stack.pop();
		if (
			node !== undefined &&
			(node[NODE_KIND] & (KIND_LAMBDA | KIND_CLASS)) !== 0
		) {
			this.directives = Object.getPrototypeOf(this.directives);
		}
	};

	// The compressor's `before` returns a squeezed node as it is, having pushed
	// and popped it; only a directive's push leaves anything behind.
	TreeWalker.prototype.webpackSkipsSqueezed = false;
	Compressor.prototype.webpackSkipsSqueezed = true;

	for (const [ctor, descend] of transformDescends(modules)) {
		// Built per class, so each call site below sees one `descend` only.
		// eslint-disable-next-line no-new-func
		ctor.prototype.transform = new Function(
			"descend",
			"KIND",
			"SQUEEZED",
			"DIRECTIVE",
			`"use strict";
			return function transform(tw, in_list) {
				if (
					tw.webpackSkipsSqueezed === true &&
					(this.flags & SQUEEZED) !== 0 &&
					(this[KIND] & DIRECTIVE) === 0
				) {
					return this;
				}
				let transformed;
				tw.push(this);
				if (tw.before) transformed = tw.before(this, descend, in_list);
				if (transformed === undefined) {
					transformed = this;
					descend(transformed, tw);
					if (tw.after) {
						const replaced = tw.after(transformed, in_list);
						if (replaced !== undefined) transformed = replaced;
					}
				}
				tw.pop();
				return transformed;
			};`
		)(descend, NODE_KIND, modules.flags.SQUEEZED, KIND_DIRECTIVE);
	}
};

// The xxhash64 of each compressor method the compressor phase below reproduces,
// each run of whitespace read as one space: the one version it was written against.
const TERSER_COMPRESSOR = {
	before: "062379b354b02a13",
	inComputedKey: "e871826303d9697d"
};

/**
 * @param {string} source a source
 * @returns {string} its xxhash64, each run of whitespace read as one space
 */
const hashTerserSource = (source) => {
	const createHash = require("../util/createHash");

	return createHash("xxhash64")
		.update(source.replace(/\s+/g, " "))
		.digest("hex");
};

/**
 * The hash `hashTerserSource` gives one of terser's `lib` files.
 * @param {string} file the file, relative to terser's `lib`
 * @returns {string | undefined} its hash, or undefined where it cannot be read
 */
const hashTerserFile = (file) => {
	const fs = require("fs");
	const path = require("path");

	/** @type {string} */
	let source;
	try {
		source = fs.readFileSync(
			path.join(
				path.dirname(require.resolve("terser/package.json")),
				"lib",
				file
			),
			"utf8"
		);
	} catch (_err) {
		return undefined;
	}
	return hashTerserSource(source);
};

/**
 * Whether the compressor's `before` and `in_computed_key` are still the ones the
 * phase reproduces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const compressorFits = ({ compress, flags }) => {
	const Compressor = compress && compress.Compressor;
	return (
		typeof Compressor === "function" &&
		Boolean(flags) &&
		typeof flags.SQUEEZED === "number" &&
		typeof Compressor.prototype.before === "function" &&
		typeof Compressor.prototype.in_computed_key === "function" &&
		hashTerserSource(Compressor.prototype.before.toString()) ===
			TERSER_COMPRESSOR.before &&
		hashTerserSource(Compressor.prototype.in_computed_key.toString()) ===
			TERSER_COMPRESSOR.inComputedKey
	);
};

/**
 * Installs webpack's compressor dispatch. It is terser's `before`, the hook
 * every node of a pass goes through, and `in_computed_key`, which the
 * optimizers ask of every ancestor, reading a node's class from its kind bits.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installCompressor = (modules) => {
	const { Compressor } = modules.compress;
	const { SQUEEZED } = modules.flags;
	markNodeKinds(modules);

	/**
	 * @this {EXPECTED_ANY} the compressor
	 * @param {Node} node the node visited
	 * @param {(node: Node, tw: EXPECTED_ANY) => void} descend transforms its children
	 * @returns {Node} what replaces it
	 */
	Compressor.prototype.before = function before(node, descend) {
		if ((node.flags & SQUEEZED) !== 0) return node;
		let wasScope = false;
		if ((node[NODE_KIND] & KIND_SCOPE) !== 0) {
			node = node.hoist_properties(this);
			node = node.hoist_declarations(this);
			wasScope = true;
		}
		// Twice, as terser does: the first pass can replace a child that the
		// second then optimizes in its new place.
		descend(node, this);
		descend(node, this);
		const optimized = node.optimize(this);
		if (
			wasScope &&
			optimized !== null &&
			optimized !== undefined &&
			(optimized[NODE_KIND] & KIND_SCOPE) !== 0
		) {
			optimized.drop_unused(this);
			descend(optimized, this);
		}
		if (optimized === node) optimized.flags |= SQUEEZED;
		return optimized;
	};

	/**
	 * @this {EXPECTED_ANY} the compressor
	 * @returns {boolean} whether the node visited is an object property's key
	 */
	Compressor.prototype.in_computed_key = function in_computed_key() {
		if (!this.option("evaluate")) return false;
		const { stack } = this;
		const self = stack[stack.length - 1];
		for (let i = stack.length - 2; i >= 0; i--) {
			const parent = stack[i];
			if (
				(parent[NODE_KIND] & KIND_OBJECT_PROPERTY) !== 0 &&
				parent.key === self
			) {
				return true;
			}
		}
		return false;
	};
};

// The xxhash64 of terser's `size.js`, each run of whitespace read as one space:
// the one version the size phase below was written against.
const TERSER_SIZE = "8a4a960469274d84";

/**
 * How many commas or semicolons a list of expressions or statements prints.
 * @param {unknown[]} array the list
 * @returns {number} its separators
 */
const listOverhead = (array) => array.length && array.length - 1;

/**
 * @param {Node} func a function
 * @returns {number} what `async` and `*` add to it
 */
const lambdaModifiers = (func) =>
	(func.is_generator ? 1 : 0) + (func.async ? 6 : 0);

/**
 * @param {unknown} key a property's key
 * @returns {number} its size where it is a name, else nothing
 */
const keySize = (key) => (typeof key === "string" ? key.length : 0);

/**
 * @param {boolean} isStatic whether a class member is static
 * @returns {number} what `static ` adds to it
 */
const staticSize = (isStatic) => (isStatic ? 7 : 0);

/**
 * terser's `first_in_statement`: whether the node a walk is at is the first
 * thing its statement prints, so an object or function there needs parentheses.
 * @param {TerserModules} modules terser's modules
 * @returns {(stack: { parent: (n?: number) => Node | undefined }) => boolean | undefined} the test
 */
const createFirstInStatement = ({ ast }) => {
	const {
		AST_Binary,
		AST_Chain,
		AST_Conditional,
		AST_Dot,
		AST_PrefixedTemplateString,
		AST_Sequence,
		AST_Statement,
		AST_Sub,
		AST_UnaryPostfix
	} = ast;
	return (stack) => {
		let node = stack.parent(-1);
		for (let i = 0, parent; (parent = stack.parent(i)); i++) {
			if (parent instanceof AST_Statement && parent.body === node) return true;
			if (
				(parent instanceof AST_Sequence && parent.expressions[0] === node) ||
				(parent.TYPE === "Call" && parent.expression === node) ||
				(parent instanceof AST_PrefixedTemplateString &&
					parent.prefix === node) ||
				(parent instanceof AST_Dot && parent.expression === node) ||
				(parent instanceof AST_Sub && parent.expression === node) ||
				(parent instanceof AST_Chain && parent.expression === node) ||
				(parent instanceof AST_Conditional && parent.condition === node) ||
				(parent instanceof AST_Binary && parent.left === node) ||
				(parent instanceof AST_UnaryPostfix && parent.expression === node)
			) {
				node = parent;
			} else {
				return false;
			}
		}
		return undefined;
	};
};

/**
 * Whether terser's `size.js` is still the one the size phase reproduces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const sizeFits = ({ ast }) => {
	if (
		!ast ||
		typeof ast.AST_Node !== "function" ||
		typeof ast.AST_Node.prototype.size !== "function" ||
		typeof ast.AST_Symbol !== "function"
	) {
		return false;
	}

	const fs = require("fs");
	const path = require("path");

	return (
		hashTerserSource(
			fs.readFileSync(
				path.join(
					path.dirname(require.resolve("terser/package.json")),
					"lib/size.js"
				),
				"utf8"
			)
		) === TERSER_SIZE
	);
};

/**
 * Installs webpack's `size`, how many bytes the compressor reckons a node
 * prints to. It is terser's walk, but its stacks are kept from one call to the
 * next rather than built, with the compressor's stack copied, on every call.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installSize = (modules) => {
	const { ast } = modules;
	const { AST_Arrow, AST_Node, AST_Symbol, AST_Unary } = ast;
	/** @type {EXPECTED_ANY} */
	let mangleOptions;
	const firstInStatement = createFirstInStatement(modules);

	/**
	 * @this {Node} the symbol
	 * @returns {number} its size, once mangled where it will be
	 */
	function symbolSize() {
		return mangleOptions &&
			this.thedef &&
			!this.thedef.unmangleable(mangleOptions)
			? 1
			: this.name.length;
	}
	/**
	 * @this {Node} a symbol printed as named
	 * @returns {number} its size
	 */
	function nameSize() {
		return this.name.length;
	}
	/**
	 * @this {Node} a method or accessor
	 * @returns {number} its size, less the part its kind adds
	 */
	function methodSize() {
		return staticSize(this.static) + keySize(this.key);
	}
	/**
	 * @this {Node} a class field
	 * @returns {number} its size
	 */
	function fieldSize() {
		return (
			staticSize(this.static) +
			(typeof this.key === "string" ? this.key.length + 2 : 0) +
			(this.value ? 1 : 0)
		);
	}
	/**
	 * @this {Node} a declaration list
	 * @returns {number} its size, for a keyword of four letters
	 */
	function definitionsSize() {
		return 4 + listOverhead(this.definitions);
	}
	/**
	 * @this {Node} a symbol a mangler may rename
	 * @returns {number} its size
	 */
	function referenceSize() {
		if (this.name === "arguments") return 9;
		return symbolSize.call(this);
	}

	// terser's `size.js`: the bytes each node prints to beyond its children's.
	/** @type {Record<string, (this: Node, info: EXPECTED_ANY) => number>} */
	const sizes = {
		Node: () => 0,
		Debugger: () => 8,
		Directive() {
			return 2 + this.value.length;
		},
		Block() {
			return 2 + listOverhead(this.body);
		},
		Toplevel() {
			return listOverhead(this.body);
		},
		EmptyStatement: () => 1,
		LabeledStatement: () => 2,
		Do: () => 9,
		While: () => 7,
		For: () => 8,
		ForIn: () => 8,
		With: () => 6,
		Expansion: () => 3,
		Accessor() {
			return (
				lambdaModifiers(this) +
				4 +
				listOverhead(this.argnames) +
				listOverhead(this.body)
			);
		},
		Function(info) {
			return (
				(firstInStatement(info) ? 2 : 0) +
				lambdaModifiers(this) +
				12 +
				listOverhead(this.argnames) +
				listOverhead(this.body)
			);
		},
		Defun() {
			return (
				lambdaModifiers(this) +
				13 +
				listOverhead(this.argnames) +
				listOverhead(this.body)
			);
		},
		Arrow() {
			let argumentsAndArrow = 2 + listOverhead(this.argnames);
			if (!(
				this.argnames.length === 1 && this.argnames[0] instanceof AST_Symbol
			)) {
				argumentsAndArrow += 2;
			}
			const bodyOverhead = this.is_braceless()
				? 0
				: listOverhead(this.body) + 2;
			return lambdaModifiers(this) + argumentsAndArrow + bodyOverhead;
		},
		Destructuring: () => 2,
		TemplateString() {
			return 2 + Math.floor(this.segments.length / 2) * 3;
		},
		TemplateSegment() {
			return this.value.length;
		},
		Return() {
			return this.value ? 7 : 6;
		},
		Throw: () => 6,
		Break() {
			return this.label ? 6 : 5;
		},
		Continue() {
			return this.label ? 9 : 8;
		},
		If: () => 4,
		Switch() {
			return 8 + listOverhead(this.body);
		},
		Case() {
			return 5 + listOverhead(this.body);
		},
		Default() {
			return 8 + listOverhead(this.body);
		},
		Try: () => 3,
		Catch() {
			return 7 + listOverhead(this.body) + (this.argname ? 2 : 0);
		},
		Finally() {
			return 7 + listOverhead(this.body);
		},
		Var: definitionsSize,
		Let: definitionsSize,
		Const() {
			return 6 + listOverhead(this.definitions);
		},
		Using() {
			return (this.await ? 6 : 0) + 6 + listOverhead(this.definitions);
		},
		VarDefLike() {
			return this.value ? 1 : 0;
		},
		NameMapping() {
			return this.name ? 4 : 0;
		},
		Import() {
			let size = 6;
			if (this.imported_name) size += 1;
			if (this.imported_name || this.imported_names) size += 5;
			if (this.imported_names) size += 2 + listOverhead(this.imported_names);
			return size;
		},
		ImportMeta: () => 11,
		DynamicImport() {
			return this.phase
				? 9 + this.phase.length + listOverhead(this.args)
				: 8 + listOverhead(this.args);
		},
		Export() {
			let size = 7 + (this.is_default ? 8 : 0);
			if (this.exported_value) size += this.exported_value._size();
			if (this.exported_names) size += 2 + listOverhead(this.exported_names);
			if (this.module_name) size += 5;
			return size;
		},
		Call() {
			return (this.optional ? 4 : 2) + listOverhead(this.args);
		},
		New() {
			return 6 + listOverhead(this.args);
		},
		Sequence() {
			return listOverhead(this.expressions);
		},
		Dot() {
			return this.property.length + (this.optional ? 2 : 1);
		},
		DotHash() {
			return this.property.length + (this.optional ? 3 : 2);
		},
		Sub() {
			return this.optional ? 4 : 2;
		},
		Unary() {
			if (this.operator === "typeof") return 7;
			if (this.operator === "void") return 5;
			return this.operator.length;
		},
		Binary(info) {
			if (this.operator === "in") return 4;
			let size = this.operator.length;
			// `1+ +a` keeps a space between the two operators.
			if (
				(this.operator === "+" || this.operator === "-") &&
				this.right instanceof AST_Unary &&
				this.right.operator === this.operator
			) {
				size += 1;
			}
			if (this.needs_parens(info)) size += 2;
			return size;
		},
		Conditional: () => 3,
		Array() {
			return 2 + listOverhead(this.elements);
		},
		Object(info) {
			return (firstInStatement(info) ? 4 : 2) + listOverhead(this.properties);
		},
		ObjectKeyVal() {
			return keySize(this.key) + 1;
		},
		ObjectGetter() {
			return 5 + staticSize(this.static) + keySize(this.key);
		},
		ObjectSetter() {
			return 5 + staticSize(this.static) + keySize(this.key);
		},
		ConciseMethod: methodSize,
		PrivateMethod() {
			return methodSize.call(this) + 1;
		},
		PrivateGetter() {
			return methodSize.call(this) + 4;
		},
		PrivateSetter() {
			return methodSize.call(this) + 4;
		},
		PrivateIn: () => 5,
		Class() {
			return (this.name ? 8 : 7) + (this.extends ? 8 : 0);
		},
		ClassStaticBlock() {
			return 8 + listOverhead(this.body);
		},
		ClassProperty: fieldSize,
		ClassPrivateProperty() {
			return fieldSize.call(this) + 1;
		},
		Symbol: symbolSize,
		SymbolClassProperty: nameSize,
		SymbolRef: referenceSize,
		SymbolDeclaration: referenceSize,
		NewTarget: () => 10,
		SymbolImportForeign: nameSize,
		SymbolExportForeign: nameSize,
		This: () => 4,
		Super: () => 5,
		String() {
			return this.value.length + 2;
		},
		Number() {
			const { value } = this;
			if (value === 0) return 1;
			if (value > 0 && Math.floor(value) === value) {
				return Math.floor(Math.log10(value) + 1);
			}
			return value.toString().length;
		},
		BigInt() {
			return this.value.length;
		},
		RegExp() {
			return this.value.toString().length;
		},
		Null: () => 4,
		NaN: () => 3,
		Undefined: () => 6,
		Hole: () => 0,
		Infinity: () => 8,
		True: () => 4,
		False: () => 5,
		Await: () => 6,
		Yield: () => 6
	};
	for (const type of Object.keys(sizes)) {
		ast[`AST_${type}`].prototype._size = sizes[type];
	}

	/**
	 * A byte counter over one node at a time, its stacks kept between counts.
	 * @returns {(node: Node, compressor: EXPECTED_ANY, ancestors: Node[] | undefined) => number} the counter
	 */
	const createCounter = () => {
		/** @type {Node[]} */
		const toVisit = [];
		/** @type {Node[]} */
		const stack = [];
		/** @type {number[]} */
		const popAt = [];
		/** @type {Node[] | undefined} */
		let outer;
		/** @type {Node | undefined} */
		let current;
		const push = toVisit.push.bind(toVisit);
		// What terser's `walk_parent` hands each node: its ancestors, nearest
		// first, the walk's own before the stack it started inside.
		const info = {
			/**
			 * @param {number=} n how many ancestors up, -1 for the node itself
			 * @returns {Node | undefined} that ancestor
			 */
			parent: (n = 0) => {
				if (n === -1) return current;
				if (outer !== undefined) {
					// terser's copy holds both stacks, and past its end reads the outer again.
					const held = outer.length + stack.length;
					if (n >= held) return outer[outer.length - (n - held + 1)];
					if (n >= stack.length) {
						return outer[outer.length - (n - stack.length + 1)];
					}
				}
				return stack[stack.length - (1 + n)];
			}
		};
		return (node, compressor, ancestors) => {
			mangleOptions = compressor && compressor._mangle_options;
			outer = ancestors || (compressor && compressor.stack) || undefined;
			let total = 0;
			try {
				toVisit.push(node);
				while (toVisit.length !== 0) {
					current = /** @type {Node} */ (toVisit.pop());
					while (
						popAt.length !== 0 &&
						toVisit.length === popAt[popAt.length - 1]
					) {
						stack.pop();
						popAt.pop();
					}
					total += current._size(info);
					// A braceless arrow's body is a `return` that prints nothing.
					if (current instanceof AST_Arrow && current.is_braceless()) {
						total += current.body[0].value._size(info);
						continue;
					}
					const before = toVisit.length;
					current._children_backwards(push);
					if (toVisit.length > before) {
						stack.push(current);
						popAt.push(before - 1);
					}
				}
			} finally {
				toVisit.length = 0;
				stack.length = 0;
				popAt.length = 0;
				outer = undefined;
				current = undefined;
				mangleOptions = undefined;
			}
			return total;
		};
	};
	const counter = createCounter();
	let counting = false;

	/**
	 * @this {Node} the node
	 * @param {EXPECTED_ANY=} compressor the compressor asking
	 * @param {Node[]=} ancestors the stack the node sits in
	 * @returns {number} the bytes it prints to
	 */
	AST_Node.prototype.size = function size(compressor, ancestors) {
		// A size asked from inside another counts on stacks of its own.
		if (counting) return createCounter()(this, compressor, ancestors);
		counting = true;
		try {
			return counter(this, compressor, ancestors);
		} finally {
			counting = false;
		}
	};
};

// The xxhash64 of terser's `equivalent-to.js` and the method reaching it, each
// run of whitespace read as one space: the one version the phase below reproduces.
const TERSER_EQUIVALENT = {
	file: "5e00f520179884fe",
	method: "b0287ee662bfaeae"
};

/**
 * Whether terser's `equivalent_to` is still the one the equivalent phase
 * reproduces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const equivalentFits = ({ ast }) => {
	const AST_Node = ast && ast.AST_Node;
	if (
		typeof AST_Node !== "function" ||
		typeof AST_Node.prototype.equivalent_to !== "function" ||
		hashTerserSource(AST_Node.prototype.equivalent_to.toString()) !==
			TERSER_EQUIVALENT.method
	) {
		return false;
	}

	const fs = require("fs");
	const path = require("path");

	return (
		hashTerserSource(
			fs.readFileSync(
				path.join(
					path.dirname(require.resolve("terser/package.json")),
					"lib/equivalent-to.js"
				),
				"utf8"
			)
		) === TERSER_EQUIVALENT.file
	);
};

/**
 * Installs webpack's `equivalent_to`, whether two trees print the same. It is
 * terser's walk of both side by side, its two stacks kept between calls.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installEquivalent = ({ ast }) => {
	const SHALLOW_EQUAL = Symbol("shallow equal");
	/** @type {(this: Node, other: Node) => boolean} */
	const passThrough = () => true;
	/**
	 * @param {unknown} first a value
	 * @param {unknown} second another
	 * @returns {boolean} whether both are absent or they are the one value
	 */
	const same = (first, second) =>
		first === null || first === undefined
			? second === null || second === undefined
			: first === second;
	/**
	 * @this {Node} a node
	 * @param {Node} other another of its class
	 * @returns {boolean} whether the two are `static` alike
	 */
	function sameStatic(other) {
		return this.static === other.static;
	}
	/**
	 * @this {Node} a node
	 * @param {Node} other another of its class
	 * @returns {boolean} whether the two hold the same value
	 */
	function sameValue(other) {
		return this.value === other.value;
	}
	// terser's `equivalent-to.js`: what two nodes of one class must share, their
	// children aside. A node's own children compare by identity, as terser's do.
	/** @type {Record<string, (this: Node, other: Node) => boolean>} */
	const shallow = {
		Node() {
			throw new Error(
				`did not find a shallow_cmp function for ${this.constructor.name}`
			);
		},
		Debugger: passThrough,
		Directive: sameValue,
		SimpleStatement: passThrough,
		Block: passThrough,
		EmptyStatement: passThrough,
		LabeledStatement(other) {
			return this.label.name === other.label.name;
		},
		Do: passThrough,
		While: passThrough,
		For(other) {
			return (
				same(this.init, other.init) &&
				same(this.condition, other.condition) &&
				same(this.step, other.step)
			);
		},
		ForIn: passThrough,
		ForOf: passThrough,
		With: passThrough,
		Toplevel: passThrough,
		Expansion: passThrough,
		Lambda(other) {
			return (
				this.is_generator === other.is_generator && this.async === other.async
			);
		},
		Destructuring(other) {
			return this.is_array === other.is_array;
		},
		PrefixedTemplateString: passThrough,
		TemplateString: passThrough,
		TemplateSegment: sameValue,
		Jump: passThrough,
		LoopControl: passThrough,
		Await: passThrough,
		Yield(other) {
			return this.is_star === other.is_star;
		},
		If(other) {
			return same(this.alternative, other.alternative);
		},
		Switch: passThrough,
		SwitchBranch: passThrough,
		Try(other) {
			return (
				this.body === other.body &&
				same(this.bcatch, other.bcatch) &&
				same(this.bfinally, other.bfinally)
			);
		},
		Catch(other) {
			return same(this.argname, other.argname);
		},
		Finally: passThrough,
		DefinitionsLike: passThrough,
		VarDefLike(other) {
			return same(this.value, other.value);
		},
		NameMapping: passThrough,
		Import(other) {
			return (
				(this.imported_name || null) === (other.imported_name || null) &&
				(this.imported_names || null) === (other.imported_names || null) &&
				(this.attributes || null) === (other.attributes || null) &&
				(this.phase || null) === (other.phase || null)
			);
		},
		ImportMeta: passThrough,
		DynamicImport(other) {
			return (
				(this.phase || null) === (other.phase || null) &&
				this.args.length === other.args.length
			);
		},
		Export(other) {
			return (
				same(this.exported_definition, other.exported_definition) &&
				same(this.exported_value, other.exported_value) &&
				same(this.exported_names, other.exported_names) &&
				same(this.attributes, other.attributes) &&
				this.module_name === other.module_name &&
				this.is_default === other.is_default
			);
		},
		Call: passThrough,
		Sequence: passThrough,
		PropAccess: passThrough,
		Chain: passThrough,
		Dot(other) {
			return (
				this.property === other.property &&
				Boolean(this.quote) === Boolean(other.quote)
			);
		},
		DotHash(other) {
			return this.property === other.property;
		},
		Unary(other) {
			return this.operator === other.operator;
		},
		Binary(other) {
			return this.operator === other.operator;
		},
		PrivateIn: passThrough,
		Conditional: passThrough,
		Array: passThrough,
		Object: passThrough,
		ObjectProperty: passThrough,
		ObjectKeyVal(other) {
			return this.key === other.key && this.quote === other.quote;
		},
		ObjectSetter: sameStatic,
		ObjectGetter: sameStatic,
		ConciseMethod: sameStatic,
		PrivateMethod: sameStatic,
		Class(other) {
			return same(this.name, other.name) && same(this.extends, other.extends);
		},
		ClassProperty(other) {
			return (
				this.static === other.static &&
				(typeof this.key === "string" ? this.key === other.key : true)
			);
		},
		ClassPrivateProperty: sameStatic,
		Symbol(other) {
			return this.name === other.name;
		},
		NewTarget: passThrough,
		This: passThrough,
		Super: passThrough,
		String: sameValue,
		Number: sameValue,
		BigInt: sameValue,
		RegExp(other) {
			return (
				this.value.flags === other.value.flags &&
				this.value.source === other.value.source
			);
		},
		Atom: passThrough
	};
	for (const type of Object.keys(shallow)) {
		ast[`AST_${type}`].prototype[SHALLOW_EQUAL] = shallow[type];
	}

	/**
	 * @param {Node | null} first a node
	 * @param {Node | null} second another
	 * @returns {boolean} whether they match, children aside
	 */
	const shallowEqual = (first, second) => {
		if (first === null && second === null) return true;
		const node = /** @type {Node} */ (first);
		return (
			node.TYPE === /** @type {Node} */ (second).TYPE &&
			node[SHALLOW_EQUAL](second)
		);
	};

	/**
	 * A comparison of two trees, its stacks kept between comparisons.
	 * @returns {(first: Node, second: Node) => boolean} the comparison
	 */
	const createComparison = () => {
		/** @type {Node[]} */
		const firstStack = [];
		/** @type {Node[]} */
		const secondStack = [];
		const pushFirst = firstStack.push.bind(firstStack);
		const pushSecond = secondStack.push.bind(secondStack);
		return (first, second) => {
			if (!shallowEqual(first, second)) return false;
			firstStack.push(first);
			secondStack.push(second);
			try {
				while (firstStack.length !== 0 && secondStack.length !== 0) {
					const firstNode = /** @type {Node} */ (firstStack.pop());
					const secondNode = /** @type {Node} */ (secondStack.pop());
					if (!shallowEqual(firstNode, secondNode)) return false;
					firstNode._children_backwards(pushFirst);
					secondNode._children_backwards(pushSecond);
					if (firstStack.length !== secondStack.length) return false;
				}
				return firstStack.length === 0 && secondStack.length === 0;
			} finally {
				firstStack.length = 0;
				secondStack.length = 0;
			}
		};
	};
	const compare = createComparison();
	let comparing = false;

	/**
	 * @this {Node} the node
	 * @param {Node} node another
	 * @returns {boolean} whether the two print the same
	 */
	ast.AST_Node.prototype.equivalent_to = function equivalent_to(node) {
		// A comparison asked from inside another compares on stacks of its own.
		if (comparing) return createComparison()(this, node);
		comparing = true;
		try {
			return compare(this, node);
		} finally {
			comparing = false;
		}
	};
};

// The xxhash64 of terser's `AST_Scope#hoist_properties`, each run of whitespace
// read as one space: the one version the hoist phase below was written against.
const TERSER_HOIST_PROPERTIES = "ae2321e39a1a1607";

/**
 * Whether terser's `hoist_properties` is still the one the phase guards.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const hoistFits = ({ ast }) => {
	const { AST_Scope } = ast;
	const original = AST_Scope && AST_Scope.prototype.hoist_properties;
	if (typeof original !== "function") return false;

	const createHash = require("../util/createHash");

	return (
		createHash("xxhash64")
			.update(original.toString().replace(/\s+/g, " "))
			.digest("hex") === TERSER_HOIST_PROPERTIES
	);
};

/**
 * Installs webpack's guard on terser's `hoist_properties`, which rebuilds every
 * list under a scope each time the compressor reaches it. A walk first looks for
 * a declaration it could hoist, and only then is terser's transform run.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installHoist = ({ ast }) => {
	const {
		AST_PropAccess,
		AST_Scope,
		AST_SymbolRef,
		AST_SymbolUsing,
		AST_VarDef,
		walk,
		walk_abort: walkAbort
	} = ast;
	const original = AST_Scope.prototype.hoist_properties;

	/**
	 * @this {Scope} the scope whose properties would be hoisted
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @returns {Scope} the scope, transformed where terser hoists anything
	 */
	function hoistProperties(compressor) {
		if (
			!compressor.option("hoist_props") ||
			compressor.has_directive("use asm")
		) {
			return this;
		}
		const scope = this;
		let hoistable = false;
		walk(scope, (/** @type {Node} */ node) => {
			if (node instanceof AST_VarDef) {
				const symbol = node.name;
				let definition;
				// terser's own tests, up to the first that is not a plain read.
				if (
					symbol.scope === scope &&
					!(symbol instanceof AST_SymbolUsing) &&
					(definition = symbol.definition()).escaped !== 1 &&
					!definition.assignments &&
					!definition.direct_access &&
					!definition.single_use &&
					!compressor.exposed(definition)
				) {
					hoistable = true;
					return walkAbort;
				}
			} else if (
				node instanceof AST_PropAccess &&
				node.expression instanceof AST_SymbolRef
			) {
				// Read as terser's transform reads it, so a missing definition throws.
				// eslint-disable-next-line no-unused-expressions
				node.expression.definition().id;
			}
		});
		return hoistable ? original.call(this, compressor) : this;
	}

	AST_Scope.DEFMETHOD("hoist_properties", hoistProperties);
};

// The xxhash64 of terser's `AST_Scope#figure_out_scope`, each run of whitespace
// read as one space: the one version the scope phase below reproduces.
const TERSER_FIGURE_OUT_SCOPE = "d29f83ce87efbca6";
// The xxhash64 of terser's `scope.js`, whose definitions and methods the phase
// reproduces too.
const TERSER_SCOPE = "c3e31203b6d7ae96";

// What the scope phase's analysis tests a node for, one bit a class.
const SCOPE_LAMBDA = 1;
const SCOPE_CLASS = 1 << 1;
const SCOPE_DIRECTIVE = 1 << 2;
const SCOPE_DESTRUCTURING = 1 << 3;
const SCOPE_SCOPE = 1 << 4;
const SCOPE_LABELED = 1 << 5;
const SCOPE_WITH = 1 << 6;
const SCOPE_SYMBOL = 1 << 7;
const SCOPE_LABEL = 1 << 8;
const SCOPE_DECLARES = 1 << 9;
const SCOPE_MODULE_STATEMENT = 1 << 10;
const SCOPE_LOOP_CONTROL = 1 << 11;
const SCOPE_REFERENCE = 1 << 12;
const SCOPE_CATCH = 1 << 13;

// The export bits terser's scope analysis sets on a definition.
const EXPORT_KEEP_NAME = 1;
const EXPORT_WANT_MANGLE = 2;

/**
 * Whether terser's scope analysis is still the one the phase reproduces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const scopeFits = ({ ast, parse, utils }) => {
	const { AST_Scope } = ast;
	const original = AST_Scope && AST_Scope.prototype.figure_out_scope;
	if (
		typeof original !== "function" ||
		typeof parse.js_error !== "function" ||
		!utils
	) {
		return false;
	}

	const fs = require("fs");
	const path = require("path");

	return (
		hashTerserSource(original.toString()) === TERSER_FIGURE_OUT_SCOPE &&
		hashTerserSource(
			fs.readFileSync(
				path.join(
					path.dirname(require.resolve("terser/package.json")),
					"lib/scope.js"
				),
				"utf8"
			)
		) === TERSER_SCOPE
	);
};

/**
 * Installs webpack's scope analysis. It is terser's, each pass run by a visitor
 * that tracks only the parents and `"use strict"` it reads, rather than a
 * `TreeWalker` recording every directive and handing each node a callback.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installScope = (modules) => {
	const { ast, parse } = modules;
	const {
		AST_Arrow,
		AST_Block,
		AST_Call,
		AST_Class,
		AST_DefClass,
		AST_Defun,
		AST_Destructuring,
		AST_Directive,
		AST_Export,
		AST_For,
		AST_ForIn,
		AST_ForOf,
		AST_Function,
		AST_Import,
		AST_IterationStatement,
		AST_Label,
		AST_LabelRef,
		AST_LabeledStatement,
		AST_Lambda,
		AST_LoopControl,
		AST_NameMapping,
		AST_Node,
		AST_Scope,
		AST_Sequence,
		AST_Switch,
		AST_SwitchBranch,
		AST_Symbol,
		AST_SymbolBlockDeclaration,
		AST_SymbolCatch,
		AST_SymbolClass,
		AST_SymbolConst,
		AST_SymbolDefClass,
		AST_SymbolDeclaration,
		AST_SymbolDefun,
		AST_SymbolExport,
		AST_SymbolFunarg,
		AST_SymbolImport,
		AST_SymbolLambda,
		AST_SymbolLet,
		AST_SymbolMethod,
		AST_SymbolRef,
		AST_SymbolUsing,
		AST_SymbolVar,
		AST_Toplevel,
		AST_With,
		walk,
		walk_abort: walkAbort
	} = ast;
	const { ALL_RESERVED_WORDS, js_error: jsError } = parse;
	const template = stringTemplate;

	// Which of the classes the analysis tests each node class is, read off its
	// prototype once rather than by an `instanceof` chain per visited node.
	const KIND = Symbol("scope kind");
	/** @type {[EXPECTED_ANY, number][]} */
	const KIND_BITS = [
		[AST_Lambda, SCOPE_LAMBDA],
		[AST_Class, SCOPE_CLASS],
		[AST_Directive, SCOPE_DIRECTIVE],
		[AST_Destructuring, SCOPE_DESTRUCTURING],
		[AST_Scope, SCOPE_SCOPE],
		[AST_LabeledStatement, SCOPE_LABELED],
		[AST_With, SCOPE_WITH],
		[AST_Symbol, SCOPE_SYMBOL],
		[AST_Label, SCOPE_LABEL],
		[AST_SymbolDeclaration, SCOPE_DECLARES],
		[AST_LabelRef, SCOPE_DECLARES],
		[AST_Export, SCOPE_MODULE_STATEMENT],
		[AST_Import, SCOPE_MODULE_STATEMENT],
		[AST_LoopControl, SCOPE_LOOP_CONTROL],
		[AST_SymbolRef, SCOPE_REFERENCE],
		[AST_SymbolCatch, SCOPE_CATCH]
	];
	const classes = [ast.AST_Node];
	while (classes.length !== 0) {
		const ctor = classes.pop();
		classes.push(...ctor.SUBCLASSES);
		const probe = Object.create(ctor.prototype);
		let kind = 0;
		for (const [Type, bit] of KIND_BITS) {
			if (probe instanceof Type) kind |= bit;
		}
		Object.defineProperty(ctor.prototype, KIND, { value: kind });
	}

	/**
	 * The definition a catch parameter redefines in its function's scope.
	 * @param {SymbolDefinition} definition the catch parameter's definition
	 * @returns {SymbolDefinition | undefined} the one it redefines
	 */
	const redefinedCatchDefinition = (definition) => {
		if (
			definition.orig[0] instanceof AST_SymbolCatch &&
			definition.scope.is_block_scope()
		) {
			return definition.scope.get_defun_scope().variables.get(definition.name);
		}
	};

	/**
	 * Marks a lambda whose default arguments read a name its body or its
	 * enclosing scope also declares, as terser's analysis does.
	 * @param {Scope} lambda the lambda
	 * @param {Scope} parentScope the scope enclosing it
	 * @returns {void}
	 */
	const detectScrewyArgnames = (lambda, parentScope) => {
		/** @type {Node[] | undefined} */
		let argnames;
		/**
		 * @param {string} name a name
		 * @returns {boolean} whether one of the lambda's parameters binds it
		 */
		const isArgname = (name) => {
			if (!argnames) argnames = lambda.args_as_names();
			return /** @type {Node[]} */ (argnames).some(
				(argname) => argname.name === name
			);
		};
		/**
		 * @param {SymbolDefinition | undefined} definition a definition
		 * @returns {void}
		 */
		const markScrewy = (definition) => {
			if (definition) definition.scope.screwy_argnames_scope = true;
			lambda.screwy_argnames_scope = true;
		};
		/**
		 * @param {Node} symbol a node inside a parameter
		 * @returns {void}
		 */
		const visit = (symbol) => {
			if (symbol instanceof AST_SymbolRef) {
				const inLambda = lambda.variables.get(symbol.name);
				if (!inLambda) return;
				if (inLambda.orig.length > 1 && isArgname(symbol.name)) {
					markScrewy(symbol.definition());
				}
				const outside = parentScope.find_variable(symbol.name);
				if (outside) {
					markScrewy(symbol.definition());
					markScrewy(outside);
				}
			}
		};
		for (const argument of lambda.argnames) walk(argument, visit);
	};

	/**
	 * @this {Scope} the scope analysed, usually the toplevel
	 * @param {EXPECTED_ANY} options the mangler's options
	 * @param {{ parent_scope?: Scope, toplevel?: Scope }=} context where a nested scope sits
	 * @returns {void}
	 */
	function figureOutScope(options, context = {}) {
		const { parent_scope: parentScope, toplevel = this } = context;
		options = defaults(options, {
			cache: null,
			ie8: false,
			safari10: false,
			module: false
		});
		if (!(toplevel instanceof AST_Toplevel)) {
			throw new Error("Invalid toplevel scope");
		}

		// Pass 1: chain the scopes and define each declared name.
		/** @type {Node[]} */
		const stack = [];
		/** @type {boolean[]} */
		const strictOuter = [];
		let strict = Boolean(options.module);
		// The walk starts at this scope, which sets `scope` and `defun` first.
		let scope = /** @type {Scope} */ (this.parent_scope = parentScope);
		/** @type {Map<string, Node>} */
		let labels = new Map();
		let defun = /** @type {Scope} */ (/** @type {unknown} */ (null));
		/** @type {Node | null} */
		let inDestructuring = null;
		/** @type {Scope[]} */
		const forScopes = [];

		/**
		 * @param {number=} level how many parents up
		 * @returns {Node | undefined} that parent of the node visited
		 */
		const parent = (level) => stack[stack.length - 2 - (level || 0)];

		/**
		 * @param {SymbolDefinition} definition a definition just made
		 * @param {number} level where its declaration's statement is
		 * @returns {void}
		 */
		const markExport = (definition, level) => {
			if (inDestructuring) {
				let i = 0;
				do {
					level++;
				} while (parent(i++) !== inDestructuring);
			}
			const node = /** @type {Node} */ (parent(level));
			if (
				(definition.export = node instanceof AST_Export ? EXPORT_KEEP_NAME : 0)
			) {
				const exported = node.exported_definition;
				if (
					(exported instanceof AST_Defun || exported instanceof AST_DefClass) &&
					node.is_default
				) {
					definition.export = EXPORT_WANT_MANGLE;
				}
			}
		};

		const definer = {
			/**
			 * @param {Node} node the node visited
			 * @param {((this: Node, visitor: EXPECTED_ANY) => void)=} descend walks its children
			 * @returns {void}
			 */
			_visit(node, descend) {
				stack.push(node);
				const kind = node[KIND];
				const opensLevel = (kind & (SCOPE_LAMBDA | SCOPE_CLASS)) !== 0;
				if (opensLevel) {
					strictOuter.push(strict);
					if (kind & SCOPE_CLASS) strict = true;
				} else if (kind & SCOPE_DIRECTIVE && node.value === "use strict") {
					strict = true;
				}
				if (!defineIn(node, kind, descend) && descend) {
					descend.call(node, this);
				}
				if (opensLevel) strict = /** @type {boolean} */ (strictOuter.pop());
				stack.pop();
			}
		};

		/**
		 * @param {Node} node the node visited
		 * @param {number} kind the classes it is, as `KIND` records them
		 * @param {((this: Node, visitor: EXPECTED_ANY) => void)=} descend walks its children
		 * @returns {boolean} true where the node's children are walked already
		 */
		const defineIn = (node, kind, descend) => {
			if (node.is_block_scope()) {
				const saveScope = scope;
				node.block_scope = scope = new AST_Scope(node);
				scope._block_scope = true;
				scope.init_scope_vars(saveScope);
				scope.uses_with = saveScope.uses_with;
				scope.uses_eval = saveScope.uses_eval;
				if (
					options.safari10 &&
					(node instanceof AST_For ||
						node instanceof AST_ForIn ||
						node instanceof AST_ForOf)
				) {
					forScopes.push(scope);
				}
				if (node instanceof AST_Switch) {
					// The switched expression belongs to the scope around the switch.
					const blockScope = scope;
					scope = saveScope;
					node.expression.walk(definer);
					scope = blockScope;
					for (let i = 0; i < node.body.length; i++) {
						node.body[i].walk(definer);
					}
				} else if (descend) {
					descend.call(node, definer);
				}
				scope = saveScope;
				return true;
			}
			if (kind & SCOPE_DESTRUCTURING) {
				const saveDestructuring = inDestructuring;
				inDestructuring = node;
				if (descend) descend.call(node, definer);
				inDestructuring = saveDestructuring;
				return true;
			}
			if (kind & SCOPE_SCOPE) {
				node.init_scope_vars(scope);
				const saveScope = scope;
				const saveDefun = defun;
				const saveLabels = labels;
				defun = scope = node;
				labels = new Map();
				if (descend) descend.call(node, definer);
				scope = saveScope;
				defun = saveDefun;
				labels = saveLabels;
				if (kind & SCOPE_LAMBDA) detectScrewyArgnames(node, scope);
				return true;
			}
			if (kind & SCOPE_LABELED) {
				const label = node.label;
				if (labels.has(label.name)) {
					throw new Error(template("Label {name} defined twice", label));
				}
				labels.set(label.name, label);
				if (descend) descend.call(node, definer);
				labels.delete(label.name);
				return true;
			}
			if (kind & SCOPE_WITH) {
				for (let outer = scope; outer; outer = outer.parent_scope) {
					outer.uses_with = true;
				}
				return false;
			}
			if (kind & SCOPE_SYMBOL) node.scope = scope;
			if (kind & SCOPE_LABEL) {
				node.thedef = node;
				node.references = [];
			}
			if (!(kind & SCOPE_DECLARES)) {
				// Neither declares a name nor refers to a label.
			} else if (node instanceof AST_SymbolLambda) {
				defun.def_function(node, node.name === "arguments" ? undefined : defun);
			} else if (node instanceof AST_SymbolDefun) {
				// A function declaration belongs to the scope around its own.
				const closestScope = defun.parent_scope;
				node.scope = strict ? closestScope : closestScope.get_defun_scope();
				markExport(node.scope.def_function(node, defun), 1);
			} else if (node instanceof AST_SymbolClass) {
				markExport(defun.def_variable(node, defun), 1);
			} else if (node instanceof AST_SymbolImport) {
				scope.def_variable(node);
			} else if (node instanceof AST_SymbolDefClass) {
				markExport(
					(node.scope = defun.parent_scope).def_function(node, defun),
					1
				);
			} else if (
				node instanceof AST_SymbolVar ||
				node instanceof AST_SymbolLet ||
				node instanceof AST_SymbolConst ||
				node instanceof AST_SymbolUsing ||
				node instanceof AST_SymbolCatch
			) {
				const blockDeclaration = node instanceof AST_SymbolBlockDeclaration;
				const definition = blockDeclaration
					? scope.def_variable(node, null)
					: defun.def_variable(
							node,
							node.TYPE === "SymbolVar" ? null : undefined
						);
				if (
					!definition.orig.every((/** @type {Node} */ symbol) => {
						if (symbol === node) return true;
						if (blockDeclaration) return symbol instanceof AST_SymbolLambda;
						return !(
							symbol instanceof AST_SymbolLet ||
							symbol instanceof AST_SymbolConst ||
							symbol instanceof AST_SymbolUsing
						);
					})
				) {
					jsError(
						`"${node.name}" is redeclared`,
						node.start.file,
						node.start.line,
						node.start.col,
						node.start.pos
					);
				}
				if (!(node instanceof AST_SymbolFunarg)) markExport(definition, 2);
				if (defun !== scope) {
					node.mark_enclosed();
					const found = scope.find_variable(node);
					if (node.thedef !== found) {
						node.thedef = found;
						node.reference();
					}
				}
			} else if (node instanceof AST_LabelRef) {
				const symbol = labels.get(node.name);
				if (!symbol) {
					throw new Error(
						template("Undefined label {name} [{line},{col}]", {
							name: node.name,
							line: node.start.line,
							col: node.start.col
						})
					);
				}
				node.thedef = symbol;
			}
			if (kind & SCOPE_MODULE_STATEMENT && !(scope instanceof AST_Toplevel)) {
				jsError(
					`"${node.TYPE}" statement may only appear at the top level`,
					node.start.file,
					node.start.line,
					node.start.col,
					node.start.pos
				);
			}
			return false;
		};

		this.walk(definer);

		// Pass 2: resolve each reference, and find `eval`.
		if (this instanceof AST_Toplevel) this.globals = new Map();
		const resolver = {
			/**
			 * @param {Node} node the node visited
			 * @param {((this: Node, visitor: EXPECTED_ANY) => void)=} descend walks its children
			 * @returns {void}
			 */
			_visit(node, descend) {
				stack.push(node);
				if (!resolveIn(node) && descend) descend.call(node, this);
				stack.pop();
			}
		};

		/**
		 * @param {Node} node the node visited
		 * @returns {boolean} true where the node's children are not walked
		 */
		const resolveIn = (node) => {
			const kind = node[KIND];
			if (kind & SCOPE_LOOP_CONTROL && node.label) {
				node.label.thedef.references.push(node);
				return true;
			}
			if (kind & SCOPE_REFERENCE) {
				const { name } = node;
				if (name === "eval" && parent() instanceof AST_Call) {
					for (
						let outer = node.scope;
						outer && !outer.uses_eval;
						outer = outer.parent_scope
					) {
						outer.uses_eval = true;
					}
				}
				let symbol;
				if (
					(parent() instanceof AST_NameMapping &&
						/** @type {Node} */ (parent(1)).module_name) ||
					!(symbol = node.scope.find_variable(name))
				) {
					symbol = toplevel.def_global(node);
					if (node instanceof AST_SymbolExport) {
						symbol.export = EXPORT_KEEP_NAME;
					}
				} else if (symbol.scope instanceof AST_Lambda && name === "arguments") {
					symbol.scope.get_defun_scope().uses_arguments = true;
				}
				node.thedef = symbol;
				node.reference();
				if (
					node.scope.is_block_scope() &&
					!(symbol.orig[0] instanceof AST_SymbolBlockDeclaration)
				) {
					node.scope = node.scope.get_defun_scope();
				}
				return true;
			}
			// A catch parameter reusing a name of its function's scope.
			let definition;
			if (
				kind & SCOPE_CATCH &&
				(definition = redefinedCatchDefinition(node.definition()))
			) {
				for (let outer = node.scope; outer; outer = outer.parent_scope) {
					encloseUnique(outer, definition);
					if (outer === definition.scope) break;
				}
			}
			return false;
		};

		this.walk(resolver);

		// Passes 3 and 4: work around old engines' catch and loop scopes.
		if (options.ie8 || options.safari10) {
			walk(this, (/** @type {Node} */ node) => {
				if (node instanceof AST_SymbolCatch) {
					const { name } = node;
					const references = node.thedef.references;
					const defunScope = node.scope.get_defun_scope();
					const definition =
						defunScope.find_variable(name) ||
						toplevel.globals.get(name) ||
						defunScope.def_variable(node);
					// forEach, as terser: referencing appends to the list it reads.
					// eslint-disable-next-line unicorn/no-array-for-each
					references.forEach((/** @type {Node} */ reference) => {
						reference.thedef = definition;
						reference.reference();
					});
					node.thedef = definition;
					node.reference();
					return true;
				}
			});
		}
		if (options.safari10) {
			for (const forScope of forScopes) {
				for (const definition of forScope.parent_scope.variables.values()) {
					encloseUnique(forScope, definition);
				}
			}
		}
	}

	// What the mangler sets for the length of one `mangle_names`, and a
	// definition reads: terser keeps the same three in its module.
	const mangling = {
		/** @type {Set<number> | null} definitions `keep_fnames` keeps, by id */
		keptFunctionIds: null,
		/** @type {Set<string> | null} short names no definition may take */
		unmangleableNames: null,
		/** @type {Set<Scope> | null} function scopes holding a block's function */
		blockDefunScopes: null
	};

	/** terser's `SymbolDef`: one name declared in one scope, and its uses. */
	class SymbolDef {
		/**
		 * @param {Scope | null} scope the scope declaring it
		 * @param {Node} orig its first declaring symbol
		 * @param {Node=} init what it is initialized to
		 */
		constructor(scope, orig, init) {
			this.name = orig.name;
			this.orig = [orig];
			this.init = init;
			this.eliminated = 0;
			this.assignments = 0;
			this.scope = scope;
			this.replaced = 0;
			this.global = false;
			this.export = 0;
			/** @type {string | null} */
			this.mangled_name = null;
			this.undeclared = false;
			this.id = SymbolDef.next_id++;
			this.chained = false;
			this.direct_access = false;
			this.escaped = 0;
			this.recursive_refs = 0;
			/** @type {Node[]} */
			this.references = [];
			this.should_replace = undefined;
			this.single_use = false;
			/** @type {EXPECTED_ANY} */
			this.fixed = false;
			Object.seal(this);
		}

		/**
		 * @returns {EXPECTED_ANY} the value it is known to hold, if any
		 */
		fixed_value() {
			if (!this.fixed || this.fixed instanceof AST_Node) return this.fixed;
			return this.fixed();
		}

		/**
		 * @param {EXPECTED_ANY=} options the mangle options
		 * @returns {EXPECTED_ANY} whether its name has to be kept
		 */
		unmangleable(options = {}) {
			const first = this.orig[0];
			if (
				mangling.keptFunctionIds !== null &&
				mangling.keptFunctionIds.has(this.id) &&
				keepName(options.keep_fnames, first.name)
			) {
				return true;
			}
			return (
				(this.global && !options.toplevel) ||
				this.export & EXPORT_KEEP_NAME ||
				this.undeclared ||
				(!options.eval && /** @type {Scope} */ (this.scope).pinned()) ||
				((first instanceof AST_SymbolLambda ||
					first instanceof AST_SymbolDefun) &&
					keepName(options.keep_fnames, first.name)) ||
				first instanceof AST_SymbolMethod ||
				((first instanceof AST_SymbolClass ||
					first instanceof AST_SymbolDefClass) &&
					keepName(options.keep_classnames, first.name))
			);
		}

		/**
		 * @param {EXPECTED_ANY} options the mangle options
		 * @returns {void}
		 */
		mangle(options) {
			const cache = options.cache && options.cache.props;
			if (this.global && cache && cache.has(this.name)) {
				this.mangled_name = cache.get(this.name);
			} else if (!this.mangled_name && !this.unmangleable(options)) {
				let owner = /** @type {Scope} */ (this.scope);
				if (options.ie8 && this.orig[0] instanceof AST_SymbolLambda) {
					owner = owner.parent_scope;
				}
				const redefinition = redefinedCatchDefinition(this);
				this.mangled_name = redefinition
					? redefinition.mangled_name || redefinition.name
					: owner.next_mangled(options, this);
				if (this.global && cache) cache.set(this.name, this.mangled_name);
			}
		}
	}
	SymbolDef.next_id = 1;
	// Shared with the phases after this one, which make definitions too.
	modules.webpackScope = { SymbolDef, mangling };

	/**
	 * @this {Scope} the toplevel
	 * @param {Node} node a reference to a name nothing declares
	 * @returns {SymbolDefinition} the global it reads
	 */
	AST_Toplevel.prototype.def_global = function def_global(node) {
		const { globals } = this;
		const { name } = node;
		const known = globals.get(name);
		if (known !== undefined) return known;
		const definition = new SymbolDef(this, node);
		definition.undeclared = true;
		definition.global = true;
		globals.set(name, definition);
		return definition;
	};

	/**
	 * @this {Scope} a scope
	 * @param {Scope=} parentScope the scope enclosing it
	 * @returns {void}
	 */
	function initScopeVars(parentScope) {
		this.variables = new Map();
		this.uses_with = false;
		this.uses_eval = false;
		this.screwy_argnames_scope = false;
		this.parent_scope = parentScope;
		this.enclosed = [];
		this.cname = -1;
	}
	AST_Scope.prototype.init_scope_vars = initScopeVars;
	/**
	 * @this {Scope} a function
	 * @param {Scope=} parentScope the scope enclosing it
	 * @returns {void}
	 */
	AST_Lambda.prototype.init_scope_vars = function init_scope_vars(parentScope) {
		initScopeVars.call(this, parentScope);
		this.uses_arguments = false;
		this.def_variable(
			new AST_SymbolFunarg({
				name: "arguments",
				start: this.start,
				end: this.end
			})
		);
	};
	/**
	 * @this {Scope} an arrow function, which has no `arguments` of its own
	 * @param {Scope=} parentScope the scope enclosing it
	 * @returns {void}
	 */
	AST_Arrow.prototype.init_scope_vars = function init_scope_vars(parentScope) {
		initScopeVars.call(this, parentScope);
		this.uses_arguments = false;
	};

	/**
	 * @this {Scope} a scope
	 * @param {string} name a name
	 * @returns {EXPECTED_ANY} truthy where the name is taken here or in its own definitions
	 */
	function conflictingDefShallow(name) {
		const { enclosed } = this;
		for (let i = 0; i < enclosed.length; i++) {
			if (enclosed[i].name === name) return enclosed[i];
		}
		return this.variables.has(name);
	}
	AST_Scope.prototype.conflicting_def_shallow = conflictingDefShallow;
	/**
	 * @this {Scope} a scope
	 * @param {string} name a name
	 * @returns {EXPECTED_ANY} truthy where the name is taken here or further out
	 */
	AST_Scope.prototype.conflicting_def = function conflicting_def(name) {
		return (
			conflictingDefShallow.call(this, name) ||
			(this.parent_scope && this.parent_scope.conflicting_def(name))
		);
	};

	/**
	 * Moves a scope into this one, carrying over what it reads from here.
	 * @this {Scope} the scope receiving it
	 * @param {Scope} scope the scope moved in
	 * @returns {void}
	 */
	AST_Scope.prototype.add_child_scope = function add_child_scope(scope) {
		if (scope.parent_scope === this) return;
		scope.parent_scope = this;
		// An arrow moved in reads this function's `arguments` where it read its own.
		if (
			scope instanceof AST_Arrow &&
			this instanceof AST_Lambda &&
			!this.uses_arguments
		) {
			this.uses_arguments = walk(scope, (/** @type {Node} */ node) => {
				if (
					node instanceof AST_SymbolRef &&
					node.scope instanceof AST_Lambda &&
					node.name === "arguments"
				) {
					return walkAbort;
				}
				if (node instanceof AST_Lambda && !(node instanceof AST_Arrow)) {
					return true;
				}
			});
		}
		this.uses_with = this.uses_with || scope.uses_with;
		this.uses_eval = this.uses_eval || scope.uses_eval;
		/** @type {Scope[]} */
		const ancestry = [];
		let current = this;
		do {
			ancestry.push(current);
		} while ((current = current.parent_scope));
		ancestry.reverse();
		const enclosedByScope = new Set(scope.enclosed);
		/** @type {SymbolDefinition[]} */
		const toEnclose = [];
		for (const ancestor of ancestry) {
			for (const definition of toEnclose) encloseUnique(ancestor, definition);
			for (const definition of ancestor.variables.values()) {
				if (enclosedByScope.has(definition)) {
					pushUnique(toEnclose, definition);
					encloseUnique(ancestor, definition);
				}
			}
		}
	};

	/**
	 * Declares a symbol the compressor introduces, under a name no scope that
	 * can see it uses.
	 * @this {Scope} the scope declaring it
	 * @param {NodeClass} SymbolClass the symbol's class
	 * @param {{ source?: Node, tentative_name?: string, scope?: Scope, conflict_scopes?: Scope[], init?: Node | null }=} options where it goes and what it is named after
	 * @returns {Node} the symbol
	 */
	AST_Scope.prototype.create_symbol = function create_symbol(
		SymbolClass,
		{
			source,
			tentative_name: tentativeName,
			scope,
			conflict_scopes: conflictScopes = [/** @type {Scope} */ (scope)],
			init = null
		} = {}
	) {
		/** @type {Set<Scope>} */
		const visible = new Set();
		for (const start of new Set(conflictScopes)) {
			for (
				let current = start;
				current !== null && current !== undefined && !visible.has(current);
				current = current.parent_scope
			) {
				visible.add(current);
			}
		}
		/** @type {string | undefined} */
		let symbolName;
		if (tentativeName) {
			const base = tentativeName.replace(/(?:^[^a-z_$]|[^a-z0-9_$])/gi, "_");
			symbolName = base;
			let i = 0;
			/**
			 * @returns {boolean} whether a visible scope takes the name
			 */
			const taken = () => {
				for (const visibleScope of visible) {
					if (visibleScope.conflicting_def_shallow(symbolName)) return true;
				}
				return false;
			};
			while (taken()) symbolName = `${base}$${i++}`;
		}
		if (!symbolName) {
			throw new Error("No symbol name could be generated in create_symbol()");
		}
		const symbol = makeNode(SymbolClass, source, { name: symbolName, scope });
		this.def_variable(symbol, init || null);
		symbol.mark_enclosed();
		return symbol;
	};

	for (const [ctor, isBlockScope] of [
		[AST_Node, alwaysFalse],
		[AST_Class, alwaysFalse],
		[AST_Lambda, alwaysFalse],
		[AST_Toplevel, alwaysFalse],
		[AST_SwitchBranch, alwaysFalse],
		[AST_Block, alwaysTrue],
		[
			AST_Scope,
			/**
			 * @this {Scope} a scope
			 * @returns {boolean} whether it is a block's
			 */
			function is_block_scope() {
				return this._block_scope || false;
			}
		],
		[AST_IterationStatement, alwaysTrue]
	]) {
		ctor.prototype.is_block_scope = isBlockScope;
	}

	/**
	 * Records that each scope from the symbol's own out to its definition's
	 * reads the definition.
	 * @this {Node} a symbol
	 * @returns {void}
	 */
	AST_Symbol.prototype.mark_enclosed = function mark_enclosed() {
		const definition = this.thedef;
		for (let scope = this.scope; scope; scope = scope.parent_scope) {
			encloseUnique(scope, definition);
			if (scope === definition.scope) break;
		}
	};
	/**
	 * @this {Node} a symbol reading its definition
	 * @returns {void}
	 */
	AST_Symbol.prototype.reference = function reference() {
		this.thedef.references.push(this);
		this.mark_enclosed();
	};

	/**
	 * @this {Scope} a scope
	 * @param {string | Node} name a name, or a symbol naming it
	 * @returns {SymbolDefinition | undefined} what it resolves to from here
	 */
	AST_Scope.prototype.find_variable = function find_variable(name) {
		const key =
			name instanceof AST_Symbol ? /** @type {Node} */ (name).name : name;
		for (let scope = this; scope; scope = scope.parent_scope) {
			const definition = scope.variables.get(key);
			if (definition !== undefined) return definition;
		}
		return undefined;
	};

	/**
	 * @this {Scope} a scope
	 * @param {Node} symbol a declaring symbol
	 * @param {Node=} init what it is initialized to
	 * @returns {SymbolDefinition} its definition, made or joined
	 */
	AST_Scope.prototype.def_variable = function def_variable(symbol, init) {
		let definition = this.variables.get(symbol.name);
		if (definition) {
			definition.orig.push(symbol);
			if (
				definition.init &&
				(definition.scope !== symbol.scope ||
					definition.init instanceof AST_Function)
			) {
				definition.init = init;
			}
		} else {
			definition = new SymbolDef(this, symbol, init);
			this.variables.set(symbol.name, definition);
			definition.global = !this.parent_scope;
		}
		return (symbol.thedef = definition);
	};
	/**
	 * @this {Scope} a scope
	 * @param {Node} symbol a function's name
	 * @param {Node=} init the function
	 * @returns {SymbolDefinition} its definition
	 */
	AST_Scope.prototype.def_function = function def_function(symbol, init) {
		const definition = this.def_variable(symbol, init);
		if (!definition.init || definition.init instanceof AST_Defun) {
			definition.init = init;
		}
		return definition;
	};

	/**
	 * @this {Node} a symbol
	 * @param {EXPECTED_ANY} options the mangle options
	 * @returns {boolean} whether its name has to be kept
	 */
	AST_Symbol.prototype.unmangleable = function unmangleable(options) {
		const definition = this.thedef;
		return !definition || definition.unmangleable(options);
	};
	AST_Label.prototype.unmangleable = alwaysFalse;
	/**
	 * @this {Node} a symbol
	 * @returns {boolean} whether nothing reads it
	 */
	AST_Symbol.prototype.unreferenced = function unreferenced() {
		return !this.thedef.references.length && !this.scope.pinned();
	};
	/**
	 * @this {Node} a symbol
	 * @returns {SymbolDefinition} its definition
	 */
	AST_Symbol.prototype.definition = function definition() {
		return this.thedef;
	};
	/**
	 * @this {Node} a symbol
	 * @returns {boolean} whether it names a global
	 */
	AST_Symbol.prototype.global = function global() {
		return this.thedef.global;
	};
	/**
	 * @this {Node} a node
	 * @returns {Node} the node its value is read from last
	 */
	AST_Node.prototype.tail_node = function tail_node() {
		return this;
	};
	/**
	 * @this {Node} a sequence
	 * @returns {Node} its last expression
	 */
	AST_Sequence.prototype.tail_node = function tail_node() {
		return this.expressions[this.expressions.length - 1];
	};

	/**
	 * terser's `next_mangled`: the next name a scope hands out that shadows
	 * nothing it or a scope inside it reads.
	 * @param {Scope} from the scope handing out a name
	 * @param {EXPECTED_ANY} options the mangle options
	 * @returns {string} the name
	 */
	const nextMangled = (from, options) => {
		let scope = from;
		if (mangling.blockDefunScopes !== null) {
			const defunScope = scope.get_defun_scope();
			if (defunScope && mangling.blockDefunScopes.has(defunScope)) {
				scope = defunScope;
			}
		}
		const { enclosed } = scope;
		const identifiers = options.nth_identifier;
		outer: for (;;) {
			const name = identifiers.get(++scope.cname);
			if (ALL_RESERVED_WORDS.has(name)) continue;
			if (options.reserved.has(name)) continue;
			if (
				mangling.unmangleableNames !== null &&
				mangling.unmangleableNames.has(name)
			) {
				continue;
			}
			for (let i = enclosed.length; --i >= 0;) {
				const definition = enclosed[i];
				if (
					name ===
					(definition.mangled_name ||
						(definition.unmangleable(options) && definition.name))
				) {
					continue outer;
				}
			}
			return name;
		}
	};
	/**
	 * @this {Scope} a scope
	 * @param {EXPECTED_ANY} options the mangle options
	 * @returns {string} the next name it hands out
	 */
	AST_Scope.prototype.next_mangled = function next_mangled(options) {
		return nextMangled(this, options);
	};
	/**
	 * @this {Scope} the toplevel, which also skips names the mangler reserved
	 * @param {EXPECTED_ANY} options the mangle options
	 * @returns {string} the next name it hands out
	 */
	AST_Toplevel.prototype.next_mangled = function next_mangled(options) {
		let name;
		do {
			name = nextMangled(this, options);
		} while (this.mangled_names.has(name));
		return name;
	};
	/**
	 * @this {Scope} a function expression, whose parameter may not take its name
	 * @param {EXPECTED_ANY} options the mangle options
	 * @param {SymbolDefinition} definition the definition being named
	 * @returns {string} the next name it hands out
	 */
	AST_Function.prototype.next_mangled = function next_mangled(
		options,
		definition
	) {
		// Safari reads `(function x(x) {})` in strict mode as a syntax error.
		const named =
			definition.orig[0] instanceof AST_SymbolFunarg &&
			this.name &&
			this.name.definition();
		const shadowed = named ? named.mangled_name || named.name : null;
		for (;;) {
			const name = nextMangled(this, options);
			if (!shadowed || shadowed !== name) return name;
		}
	};

	AST_Scope.DEFMETHOD("figure_out_scope", figureOutScope);
};

// The xxhash64 of terser's `AST_Scope#drop_unused`, each run of whitespace read
// as one space: the one version the unused phase below reproduces.
const TERSER_DROP_UNUSED = "ad8875bb48b7b37c";

// What the unused phase's passes test a node for, one bit a class.
const UNUSED_LAMBDA = 1;
const UNUSED_CLASS = 1 << 1;
const UNUSED_DEFUN = 1 << 2;
const UNUSED_DEF_CLASS = 1 << 3;
const UNUSED_FUNARG = 1 << 4;
const UNUSED_DEFINITIONS = 1 << 5;
const UNUSED_ASSIGN = 1 << 6;
const UNUSED_UNARY = 1 << 7;
const UNUSED_REFERENCE = 1 << 8;
const UNUSED_SCOPE = 1 << 9;
const UNUSED_STATIC_BLOCK = 1 << 10;
const UNUSED_CLASS_EXPRESSION = 1 << 11;
const UNUSED_FUNCTION = 1 << 12;
const UNUSED_ACCESSOR = 1 << 13;
const UNUSED_FOR = 1 << 14;
const UNUSED_LABELED = 1 << 15;
const UNUSED_BLOCK_STATEMENT = 1 << 16;
const UNUSED_SEQUENCE = 1 << 17;

/**
 * Whether terser's `drop_unused` is still the one the phase reproduces, and
 * the helpers it calls are where it reads them.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const unusedFits = ({ ast, common, flags, inference, scope, utils }) => {
	const { AST_Scope } = ast;
	const original = AST_Scope && AST_Scope.prototype.drop_unused;
	if (
		typeof original !== "function" ||
		!common ||
		!flags ||
		!inference ||
		typeof scope.SymbolDef !== "function" ||
		typeof utils.MAP !== "function" ||
		typeof common.make_sequence !== "function" ||
		typeof common.maintain_this_binding !== "function" ||
		typeof common.is_empty !== "function" ||
		typeof common.is_ref_of !== "function" ||
		typeof common.can_be_evicted_from_block !== "function" ||
		typeof inference.is_used_in_expression !== "function" ||
		typeof flags.WRITE_ONLY !== "number" ||
		typeof flags.UNUSED !== "number"
	) {
		return false;
	}

	const createHash = require("../util/createHash");

	return (
		createHash("xxhash64")
			.update(original.toString().replace(/\s+/g, " "))
			.digest("hex") === TERSER_DROP_UNUSED
	);
};

/**
 * Installs webpack's `drop_unused`. It is terser's, three passes over a scope,
 * reading which classes a node is from one set of bits per class rather than
 * by an `instanceof` chain per visited node.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installUnused = (modules) => {
	// What a later phase may keep of a trailing parameter this would trim.
	/** @type {{ keepsParameter: ((lambda: Node, parameter: Node, compressor: EXPECTED_ANY) => boolean) | null }} */
	const hooks = { keepsParameter: null };
	modules.webpackUnused = hooks;
	const { ast, common, inference, utils } = modules;
	const {
		AST_Accessor,
		AST_Assign,
		AST_BlockStatement,
		AST_Call,
		AST_Class,
		AST_ClassExpression,
		AST_ClassStaticBlock,
		AST_DefClass,
		AST_DefaultAssign,
		AST_Definitions,
		AST_Defun,
		AST_Destructuring,
		AST_EmptyStatement,
		AST_Expansion,
		AST_Export,
		AST_For,
		AST_ForIn,
		AST_Function,
		AST_LabeledStatement,
		AST_Lambda,
		AST_Number,
		AST_Scope,
		AST_Sequence,
		AST_SimpleStatement,
		AST_SymbolBlockDeclaration,
		AST_SymbolCatch,
		AST_SymbolDeclaration,
		AST_SymbolFunarg,
		AST_SymbolRef,
		AST_SymbolVar,
		AST_Toplevel,
		AST_Unary,
		AST_Var,
		TreeTransformer,
		TreeWalker,
		walk
	} = ast;
	// The scope phase's own class where it is installed, as it makes the rest.
	const { SymbolDef } = modules.webpackScope || modules.scope;
	const { MAP, return_false: returnFalse } = utils;
	const remove = removeAll;
	const {
		make_sequence: makeSequence,
		maintain_this_binding: maintainThisBinding,
		is_empty: isEmpty,
		is_ref_of: isRefOf,
		can_be_evicted_from_block: canBeEvictedFromBlock
	} = common;
	const { is_used_in_expression: isUsedInExpression } = inference;
	const { WRITE_ONLY, UNUSED } = modules.flags;

	const KIND = Symbol("unused kind");
	/** @type {[EXPECTED_ANY, number][]} */
	const KIND_BITS = [
		[AST_Lambda, UNUSED_LAMBDA],
		[AST_Class, UNUSED_CLASS],
		[AST_Defun, UNUSED_DEFUN],
		[AST_DefClass, UNUSED_DEF_CLASS],
		[AST_SymbolFunarg, UNUSED_FUNARG],
		[AST_Definitions, UNUSED_DEFINITIONS],
		[AST_Assign, UNUSED_ASSIGN],
		[AST_Unary, UNUSED_UNARY],
		[AST_SymbolRef, UNUSED_REFERENCE],
		[AST_Scope, UNUSED_SCOPE],
		[AST_ClassStaticBlock, UNUSED_STATIC_BLOCK],
		[AST_ClassExpression, UNUSED_CLASS_EXPRESSION],
		[AST_Function, UNUSED_FUNCTION],
		[AST_Accessor, UNUSED_ACCESSOR],
		[AST_For, UNUSED_FOR],
		[AST_LabeledStatement, UNUSED_LABELED],
		[AST_BlockStatement, UNUSED_BLOCK_STATEMENT],
		[AST_Sequence, UNUSED_SEQUENCE]
	];
	const classes = [ast.AST_Node];
	while (classes.length !== 0) {
		const ctor = classes.pop();
		classes.push(...ctor.SUBCLASSES);
		const probe = Object.create(ctor.prototype);
		let kind = 0;
		for (const [Type, bit] of KIND_BITS) {
			if (probe instanceof Type) kind |= bit;
		}
		Object.defineProperty(ctor.prototype, KIND, { value: kind });
	}

	/**
	 * @this {Scope} the scope whose unused declarations are dropped
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @returns {void}
	 */
	function dropUnused(compressor) {
		if (!compressor.option("unused")) return;
		if (compressor.has_directive("use asm")) return;
		// Not really a scope, such as a class.
		if (!this.variables) return;
		const self = this;
		if (self.pinned()) return;
		const dropFunctions =
			!(self instanceof AST_Toplevel) || compressor.toplevel.funcs;
		const dropVariables =
			!(self instanceof AST_Toplevel) || compressor.toplevel.vars;
		/**
		 * @param {Node} node a node
		 * @returns {Node | undefined} what it assigns where only written to
		 */
		const writeOnlyTarget = (node) => {
			const kind = node[KIND];
			if (
				kind & UNUSED_ASSIGN &&
				!node.logical &&
				(node.flags & WRITE_ONLY || node.operator === "=")
			) {
				return node.left;
			}
			if (kind & UNUSED_UNARY && node.flags & WRITE_ONLY) {
				return node.expression;
			}
		};
		const assignAsUnused = /keep_assign/.test(compressor.option("unused"))
			? returnFalse
			: writeOnlyTarget;
		/** @type {Map<number, SymbolDefinition>} */
		const inUseIds = new Map();
		/** @type {Map<number, Node>} */
		const fixedIds = new Map();
		if (self instanceof AST_Toplevel && compressor.top_retain) {
			for (const definition of self.variables.values()) {
				if (compressor.top_retain(definition)) {
					inUseIds.set(definition.id, definition);
				}
			}
		}
		/** @type {Map<number, Node[]>} */
		const varDefsById = new Map();
		/** @type {Map<number, Node[]>} */
		const initializations = new Map();

		// Pass 1: find which symbols this scope, not a nested one, uses directly.
		let scope = this;
		/** @type {EXPECTED_ANY} */
		let tw = new TreeWalker(
			(/** @type {Node} */ node, /** @type {() => void} */ descend) => {
				const kind = node[KIND];
				if (
					kind & UNUSED_LAMBDA &&
					node.uses_arguments &&
					!tw.has_directive("use strict")
				) {
					for (const argname of node.argnames) {
						if (!(argname instanceof AST_SymbolDeclaration)) continue;
						const definition = argname.definition();
						inUseIds.set(definition.id, definition);
					}
				}
				if (node === self) return;
				if (kind & UNUSED_CLASS && node.has_side_effects(compressor)) {
					if (node.is_self_referential()) {
						descend();
					} else {
						node.visit_nondeferred_class_parts(tw);
					}
				}
				if (kind & (UNUSED_DEFUN | UNUSED_DEF_CLASS)) {
					const nodeDefinition = node.name.definition();
					const inExport = tw.parent() instanceof AST_Export;
					if (
						(inExport || (!dropFunctions && scope === self)) &&
						nodeDefinition.global
					) {
						inUseIds.set(nodeDefinition.id, nodeDefinition);
					}
					mapAdd(initializations, nodeDefinition.id, node);
					// Nested scopes are not gone into.
					return true;
				}
				// The root scope drops; nested scopes only have their uses read.
				const inRootScope = scope === self;
				if (kind & UNUSED_FUNARG && inRootScope) {
					mapAdd(varDefsById, node.definition().id, node);
				}
				if (kind & UNUSED_DEFINITIONS && inRootScope) {
					const inExport = tw.parent() instanceof AST_Export;
					for (const definition of node.definitions) {
						if (definition.name instanceof AST_SymbolVar) {
							mapAdd(varDefsById, definition.name.definition().id, definition);
						}
						if (inExport || !dropVariables) {
							walk(definition.name, (/** @type {Node} */ inner) => {
								if (inner instanceof AST_SymbolDeclaration) {
									const declared = inner.definition();
									if (declared.global) inUseIds.set(declared.id, declared);
								}
							});
						}
						if (definition.name instanceof AST_Destructuring) {
							definition.walk(tw);
						}
						if (
							definition.name instanceof AST_SymbolDeclaration &&
							definition.value
						) {
							const nodeDefinition = definition.name.definition();
							mapAdd(initializations, nodeDefinition.id, definition.value);
							if (
								!nodeDefinition.chained &&
								definition.name.fixed_value() === definition.value
							) {
								fixedIds.set(nodeDefinition.id, definition);
							}
							if (definition.value.has_side_effects(compressor)) {
								definition.value.walk(tw);
							}
						}
					}
					return true;
				}
				return scanReferenceScoped(node, descend);
			}
		);
		self.walk(tw);

		// Pass 2: walk each used symbol's initialization, for the symbols it uses.
		tw = new TreeWalker(scanReferenceScoped);
		for (const definition of inUseIds.values()) {
			const inits = initializations.get(definition.id);
			if (inits) {
				for (const init of inits) init.walk(tw);
			}
		}

		// Pass 3: drop the declarations not in use.
		const tt = new TreeTransformer(
			/**
			 * @this {EXPECTED_ANY} the transformer
			 * @param {Node} node the node visited
			 * @param {(node: Node, tw: EXPECTED_ANY) => void} descend transforms its children
			 * @param {boolean} inList whether it sits in a list
			 * @returns {EXPECTED_ANY} what replaces it, where anything does
			 */
			function before(node, descend, inList) {
				const kind = node[KIND];
				const parent = tt.parent();
				if (dropVariables) {
					const symbol = assignAsUnused(node);
					if (symbol && symbol[KIND] & UNUSED_REFERENCE) {
						const definition = symbol.definition();
						const inUse = inUseIds.has(definition.id);
						if (kind & UNUSED_ASSIGN) {
							if (
								!inUse ||
								(fixedIds.has(definition.id) &&
									fixedIds.get(definition.id) !== node)
							) {
								const assignee = node.right.transform(tt);
								if (
									!inUse &&
									!assignee.has_side_effects(compressor) &&
									!isUsedInExpression(tt)
								) {
									return inList
										? MAP.skip
										: makeNode(AST_Number, node, { value: 0 });
								}
								return maintainThisBinding(parent, node, assignee);
							}
						} else if (!inUse) {
							return inList
								? MAP.skip
								: makeNode(AST_Number, node, { value: 0 });
						}
					}
				}
				if (scope !== self) return;
				let nameDefinition;
				if (
					node.name &&
					((kind & UNUSED_CLASS_EXPRESSION &&
						!keepName(
							compressor.option("keep_classnames"),
							(nameDefinition = node.name.definition()).name
						)) ||
						(kind & UNUSED_FUNCTION &&
							!keepName(
								compressor.option("keep_fnames"),
								(nameDefinition = node.name.definition()).name
							))) && // A declaration of the same name overshadows it, so it is never read.
					(!inUseIds.has(nameDefinition.id) || nameDefinition.orig.length > 1)
				) {
					node.name = null;
				}
				if (kind & UNUSED_LAMBDA && !(kind & UNUSED_ACCESSOR)) {
					let trim =
						!compressor.option("keep_fargs") ||
						// An IIFE that does not refer to its name.
						(parent instanceof AST_Call &&
							parent.expression === node &&
							!node.pinned() &&
							(!node.name || node.name.unreferenced()));
					const argnames = node.argnames;
					const { keepsParameter } = hooks;
					for (let i = argnames.length; --i >= 0;) {
						let symbol = argnames[i];
						if (
							trim &&
							keepsParameter !== null &&
							keepsParameter(node, symbol, compressor)
						) {
							trim = false;
						}
						if (symbol instanceof AST_Expansion) symbol = symbol.expression;
						if (symbol instanceof AST_DefaultAssign) symbol = symbol.left;
						// A destructured argument is kept: it asserts a shape.
						if (
							!(symbol instanceof AST_Destructuring) &&
							!inUseIds.has(symbol.definition().id)
						) {
							symbol.flags |= UNUSED;
							if (trim) argnames.pop();
						} else {
							trim = false;
						}
					}
				}
				if (kind & UNUSED_DEF_CLASS && node !== self) {
					const definition = node.name.definition();
					descend(node, this);
					const keepClass =
						(definition.global && !dropFunctions) ||
						inUseIds.has(definition.id);
					if (!keepClass) {
						const kept = node.drop_side_effect_free(compressor);
						if (kept === null || kept === undefined) {
							definition.eliminated++;
							return inList ? MAP.skip : makeNode(AST_EmptyStatement, node);
						}
						return kept;
					}
					return node;
				}
				if (kind & UNUSED_DEFUN && node !== self) {
					const definition = node.name.definition();
					const keep =
						(definition.global && !dropFunctions) ||
						inUseIds.has(definition.id);
					if (!keep) {
						definition.eliminated++;
						return inList ? MAP.skip : makeNode(AST_EmptyStatement, node);
					}
				}
				if (
					kind & UNUSED_DEFINITIONS &&
					!(parent instanceof AST_ForIn && parent.init === node)
				) {
					return dropDefinitions(node, parent, inList);
				}
				// `var`s moved out of a `for` head, where an unused name with a side
				// effect left them, would make an invalid tree.
				if (kind & UNUSED_FOR) {
					descend(node, this);
					let block;
					if (node.init instanceof AST_BlockStatement) {
						block = node.init;
						node.init = block.body.pop();
						block.body.push(node);
					}
					if (node.init instanceof AST_SimpleStatement) {
						node.init = node.init.body;
					} else if (isEmpty(node.init)) {
						node.init = null;
					}
					return !block ? node : inList ? MAP.splice(block.body) : block;
				}
				if (kind & UNUSED_LABELED && node.body instanceof AST_For) {
					descend(node, this);
					if (node.body instanceof AST_BlockStatement) {
						const block = node.body;
						node.body = block.body.pop();
						block.body.push(node);
						return inList ? MAP.splice(block.body) : block;
					}
					return node;
				}
				if (kind & UNUSED_BLOCK_STATEMENT) {
					descend(node, this);
					if (inList && node.body.every(canBeEvictedFromBlock)) {
						return MAP.splice(node.body);
					}
					return node;
				}
				if (kind & UNUSED_SCOPE && !(kind & UNUSED_STATIC_BLOCK)) {
					const saveScope = scope;
					scope = node;
					descend(node, this);
					scope = saveScope;
					return node;
				}
			},
			(/** @type {Node} */ node, /** @type {boolean} */ inList) => {
				if (node[KIND] & UNUSED_SEQUENCE) {
					switch (node.expressions.length) {
						case 0:
							return inList
								? MAP.skip
								: makeNode(AST_Number, node, { value: 0 });
						case 1:
							return node.expressions[0];
					}
				}
			}
		);

		/**
		 * A declaration list with its unused names dropped, their initializers'
		 * side effects kept in order.
		 * @param {Node} node the declarations
		 * @param {Node} parent the node holding them
		 * @param {boolean} inList whether they sit in a list
		 * @returns {EXPECTED_ANY} what replaces them
		 */
		const dropDefinitions = (node, parent, inList) => {
			const dropBlock =
				!(parent instanceof AST_Toplevel) && !(node instanceof AST_Var);
			// Uninitialized names go first.
			/** @type {Node[]} */
			const body = [];
			/** @type {Node[]} */
			const head = [];
			/** @type {Node[]} */
			const tail = [];
			// Side effects of unused names' initializers, cascaded into the next.
			/** @type {Node[]} */
			let sideEffects = [];
			for (const definition of node.definitions) {
				if (definition.value) definition.value = definition.value.transform(tt);
				const isDestructure = definition.name instanceof AST_Destructuring;
				const symbol = isDestructure
					? new SymbolDef(null, { name: "<destructure>" })
					: definition.name.definition();
				if (dropBlock && symbol.global) {
					tail.push(definition);
					continue;
				}
				if (
					!(dropVariables || dropBlock) ||
					(isDestructure &&
						(definition.name.names.length ||
							definition.name.is_array ||
							// Loose, as terser's: an option of `1` reads as `true`.
							// eslint-disable-next-line eqeqeq
							compressor.option("pure_getters") != true)) ||
					inUseIds.has(symbol.id)
				) {
					if (
						definition.value &&
						fixedIds.has(symbol.id) &&
						fixedIds.get(symbol.id) !== definition
					) {
						definition.value =
							definition.value.drop_side_effect_free(compressor);
					}
					if (definition.name instanceof AST_SymbolVar) {
						const varDefs = /** @type {Node[]} */ (varDefsById.get(symbol.id));
						if (
							varDefs.length > 1 &&
							(!definition.value ||
								symbol.orig.indexOf(definition.name) > symbol.eliminated)
						) {
							if (definition.value) {
								const reference = makeNode(
									AST_SymbolRef,
									definition.name,
									definition.name
								);
								symbol.references.push(reference);
								const assign = makeNode(AST_Assign, definition, {
									operator: "=",
									logical: false,
									left: reference,
									right: definition.value
								});
								if (fixedIds.get(symbol.id) === definition) {
									fixedIds.set(symbol.id, assign);
								}
								sideEffects.push(assign.transform(tt));
							}
							remove(varDefs, definition);
							symbol.eliminated++;
							continue;
						}
					}
					if (definition.value) {
						if (sideEffects.length > 0) {
							if (tail.length > 0) {
								sideEffects.push(definition.value);
								definition.value = makeSequence(definition.value, sideEffects);
							} else {
								body.push(
									makeNode(AST_SimpleStatement, node, {
										body: makeSequence(node, sideEffects)
									})
								);
							}
							sideEffects = [];
						}
						tail.push(definition);
					} else {
						head.push(definition);
					}
				} else if (symbol.orig[0] instanceof AST_SymbolCatch) {
					const value =
						definition.value &&
						definition.value.drop_side_effect_free(compressor);
					if (value) sideEffects.push(value);
					definition.value = null;
					head.push(definition);
				} else {
					const value =
						definition.value &&
						definition.value.drop_side_effect_free(compressor);
					if (value) sideEffects.push(value);
					symbol.eliminated++;
				}
			}
			if (head.length > 0 || tail.length > 0) {
				node.definitions = [...head, ...tail];
				body.push(node);
			}
			if (sideEffects.length > 0) {
				body.push(
					makeNode(AST_SimpleStatement, node, {
						body: makeSequence(node, sideEffects)
					})
				);
			}
			switch (body.length) {
				case 0:
					return inList ? MAP.skip : makeNode(AST_EmptyStatement, node);
				case 1:
					return body[0];
				default:
					return inList
						? MAP.splice(body)
						: makeNode(AST_BlockStatement, node, { body });
			}
		};

		self.transform(tt);

		/**
		 * @param {Node} node a node
		 * @param {() => void} descend walks its children
		 * @returns {boolean | undefined} true where its children are not walked
		 */
		function scanReferenceScoped(node, descend) {
			let nodeDefinition;
			const symbol = assignAsUnused(node);
			if (
				symbol &&
				symbol[KIND] & UNUSED_REFERENCE &&
				!isRefOf(node.left, AST_SymbolBlockDeclaration) &&
				self.variables.get(symbol.name) ===
					(nodeDefinition = symbol.definition())
			) {
				if (node[KIND] & UNUSED_ASSIGN) {
					node.right.walk(tw);
					if (
						!nodeDefinition.chained &&
						node.left.fixed_value() === node.right
					) {
						fixedIds.set(nodeDefinition.id, node);
					}
				}
				return true;
			}
			const kind = node[KIND];
			if (kind & UNUSED_REFERENCE) {
				nodeDefinition = node.definition();
				if (!inUseIds.has(nodeDefinition.id)) {
					inUseIds.set(nodeDefinition.id, nodeDefinition);
					if (nodeDefinition.orig[0] instanceof AST_SymbolCatch) {
						const redefined =
							nodeDefinition.scope.is_block_scope() &&
							nodeDefinition.scope
								.get_defun_scope()
								.variables.get(nodeDefinition.name);
						if (redefined) inUseIds.set(redefined.id, redefined);
					}
				}
				return true;
			}
			if (kind & UNUSED_CLASS) {
				descend();
				return true;
			}
			if (kind & UNUSED_SCOPE && !(kind & UNUSED_STATIC_BLOCK)) {
				const saveScope = scope;
				scope = node;
				descend();
				scope = saveScope;
				return true;
			}
		}
	}

	AST_Scope.DEFMETHOD("drop_unused", dropUnused);
};

// The terser release whose module-private helpers the `reduce` and `minify`
// phases reproduce: code no export reaches is pinned by release, not read.
const TERSER_VERSION = "5.51.2";

// The xxhash64 of terser's `AST_Toplevel#reset_opt_flags` and every class's own
// `reduce_vars`, each run of whitespace read as one space.
const TERSER_REDUCE_VARS = "9752630ca6731613";

// What the reduce phase's hoisting check tests a node for, one bit a class.
const REDUCE_SYMBOL = 1;
const REDUCE_STATEMENT = 1 << 1;
const REDUCE_DEFUN = 1 << 2;
const REDUCE_OPAQUE = 1 << 3;

/**
 * Whether terser's flow analysis is still the one the reduce phase reproduces,
 * and the helpers it calls are where it reads them.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const reduceFits = ({ ast, common, flags, inference, utils, version }) => {
	const { AST_Toplevel } = ast;
	const resetOptFlags = AST_Toplevel && AST_Toplevel.prototype.reset_opt_flags;
	if (
		version !== TERSER_VERSION ||
		typeof resetOptFlags !== "function" ||
		!common ||
		!flags ||
		!inference ||
		typeof ast.walk !== "function" ||
		typeof ast.walk_body !== "function" ||
		!ast.AST_Node ||
		typeof ast.AST_Node.prototype._children_backwards !== "function" ||
		typeof ast.TreeWalker !== "function" ||
		!inference.lazy_op ||
		typeof inference.is_modified !== "function" ||
		typeof inference.is_lhs !== "function" ||
		typeof common.read_property !== "function" ||
		typeof common.has_break_or_continue !== "function" ||
		typeof common.is_recursive_ref !== "function" ||
		typeof flags.clear_flag !== "function" ||
		typeof flags.set_flag !== "function" ||
		typeof flags.INLINED !== "number" ||
		typeof flags.TOP !== "number" ||
		typeof flags.CLEAR_BETWEEN_PASSES !== "number"
	) {
		return false;
	}

	const createHash = require("../util/createHash");

	/** @type {string[]} */
	const sources = [resetOptFlags.toString()];
	const classes = [ast.AST_Node];
	while (classes.length !== 0) {
		const ctor = classes.pop();
		classes.push(...ctor.SUBCLASSES);
		if (Object.prototype.hasOwnProperty.call(ctor.prototype, "reduce_vars")) {
			sources.push(ctor.prototype.reduce_vars.toString());
		}
	}
	return (
		createHash("xxhash64")
			.update(sources.join(" ").replace(/\s+/g, " "))
			.digest("hex") === TERSER_REDUCE_VARS
	);
};

/**
 * Installs webpack's `reduce_vars`, terser's flow analysis, and the walk that
 * runs it. It is terser's, except that the functions a hoisted function reads
 * are ordered by one pass over them rather than one pass per function read.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installReduce = (modules) => {
	const { ast, common, flags, inference } = modules;
	const {
		AST_Accessor,
		AST_Array,
		AST_Assign,
		AST_Await,
		AST_Binary,
		AST_Block,
		AST_Call,
		AST_Case,
		AST_Chain,
		AST_Class,
		AST_ClassStaticBlock,
		AST_ClassExpression,
		AST_Conditional,
		AST_Default,
		AST_Defun,
		AST_Destructuring,
		AST_Do,
		AST_Exit,
		AST_Expansion,
		AST_For,
		AST_ForIn,
		AST_If,
		AST_LabeledStatement,
		AST_Lambda,
		AST_New,
		AST_Node,
		AST_Number,
		AST_ObjectKeyVal,
		AST_PropAccess,
		AST_Scope,
		AST_Sequence,
		AST_SimpleStatement,
		AST_Statement,
		AST_Symbol,
		AST_SymbolCatch,
		AST_SymbolConst,
		AST_SymbolDeclaration,
		AST_SymbolDefun,
		AST_SymbolFunarg,
		AST_SymbolLambda,
		AST_SymbolRef,
		AST_This,
		AST_Toplevel,
		AST_Try,
		AST_Unary,
		AST_UnaryPrefix,
		AST_UsingDef,
		AST_VarDef,
		AST_VarDefLike,
		AST_While,
		AST_Yield,
		TreeWalker,
		walk,
		walk_body: walkBody
	} = ast;
	/**
	 * @param {Node} orig where its position comes from
	 * @returns {Node} `void 0`, which no binding named `undefined` shadows
	 */
	const makeVoid0 = (orig) =>
		makeNode(AST_UnaryPrefix, orig, {
			operator: "void",
			expression: makeNode(AST_Number, orig, { value: 0 })
		});
	const {
		lazy_op: lazyOperators,
		is_modified: isModified,
		is_lhs: isLhs
	} = inference;
	const {
		read_property: readProperty,
		has_break_or_continue: hasBreakOrContinue,
		is_recursive_ref: isRecursiveRef
	} = common;
	const {
		INLINED,
		TOP,
		CLEAR_BETWEEN_PASSES,
		clear_flag: clearFlag,
		set_flag: setFlag
	} = flags;

	/**
	 * @param {Node} node a node class
	 * @param {(this: EXPECTED_ANY, walker: EXPECTED_ANY, descend: () => void, compressor: EXPECTED_ANY) => EXPECTED_ANY} method its `reduce_vars`
	 * @returns {void}
	 */
	const defineReduceVars = (node, method) => {
		node.DEFMETHOD("reduce_vars", method);
	};

	defineReduceVars(AST_Node, noop);

	// What the hoisting check's walks test a node for, read per class rather
	// than by an `instanceof` chain per node.
	const KIND = Symbol("reduce kind");
	/** @type {[EXPECTED_ANY, number][]} */
	const KIND_BITS = [
		[AST_Symbol, REDUCE_SYMBOL],
		[AST_Statement, REDUCE_STATEMENT],
		[AST_Defun, REDUCE_DEFUN],
		[AST_Scope, REDUCE_OPAQUE],
		[AST_SimpleStatement, REDUCE_OPAQUE]
	];
	const classes = [AST_Node];
	while (classes.length !== 0) {
		const ctor = classes.pop();
		classes.push(...ctor.SUBCLASSES);
		const probe = Object.create(ctor.prototype);
		let kind = 0;
		for (const [Type, bit] of KIND_BITS) {
			if (probe instanceof Type) kind |= bit;
		}
		Object.defineProperty(ctor.prototype, KIND, { value: kind });
	}

	/**
	 * Clears what the analysis records on a definition.
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {SymbolDefinition} definition the definition
	 * @returns {void}
	 */
	const resetDefinition = (compressor, definition) => {
		definition.assignments = 0;
		definition.chained = false;
		definition.direct_access = false;
		definition.escaped = 0;
		definition.recursive_refs = 0;
		definition.references = [];
		definition.single_use = undefined;
		if (
			definition.scope.pinned() ||
			(definition.orig[0] instanceof AST_SymbolFunarg &&
				definition.scope.uses_arguments)
		) {
			definition.fixed = false;
		} else if (
			definition.orig[0] instanceof AST_SymbolConst ||
			!compressor.exposed(definition)
		) {
			definition.fixed = definition.init;
		} else {
			definition.fixed = false;
		}
	};

	/**
	 * @param {EXPECTED_ANY} walker the walker
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {Scope} node the scope whose variables are reset
	 * @returns {void}
	 */
	const resetVariables = (walker, compressor, node) => {
		for (const definition of node.variables.values()) {
			resetDefinition(compressor, definition);
			if (definition.fixed === null) {
				walker.defs_to_safe_ids.set(definition.id, walker.safe_ids);
				mark(walker, definition, true);
			} else if (definition.fixed) {
				walker.loop_ids.set(definition.id, walker.in_loop);
				mark(walker, definition, true);
			}
		}
	};

	/**
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {Node} node a node that may carry a block scope
	 * @returns {void}
	 */
	const resetBlockVariables = (compressor, node) => {
		if (node.block_scope) {
			for (const definition of node.block_scope.variables.values()) {
				resetDefinition(compressor, definition);
			}
		}
	};

	/**
	 * @param {EXPECTED_ANY} walker the walker
	 * @returns {void}
	 */
	const push = (walker) => {
		walker.safe_ids = Object.create(walker.safe_ids);
	};

	/**
	 * @param {EXPECTED_ANY} walker the walker
	 * @returns {void}
	 */
	const pop = (walker) => {
		walker.safe_ids = Object.getPrototypeOf(walker.safe_ids);
	};

	/**
	 * @param {EXPECTED_ANY} walker the walker
	 * @param {SymbolDefinition} definition the definition
	 * @param {boolean} safe whether it is safe to read
	 * @returns {void}
	 */
	const mark = (walker, definition, safe) => {
		walker.safe_ids[definition.id] = safe;
	};

	/**
	 * @param {EXPECTED_ANY} walker the walker
	 * @param {SymbolDefinition} definition the definition
	 * @returns {boolean} whether its fixed value can be read here
	 */
	const safeToRead = (walker, definition) => {
		if (definition.single_use === "m") return false;
		if (walker.safe_ids[definition.id]) {
			if (definition.fixed === null || definition.fixed === undefined) {
				const orig = definition.orig[0];
				if (orig instanceof AST_SymbolFunarg || orig.name === "arguments") {
					return false;
				}
				definition.fixed = makeVoid0(orig);
			}
			return true;
		}
		return definition.fixed instanceof AST_Defun;
	};

	/**
	 * @param {EXPECTED_ANY} walker the walker
	 * @param {SymbolDefinition} definition the definition
	 * @param {Scope} scope the scope assigning it
	 * @param {EXPECTED_ANY} value what is assigned
	 * @returns {boolean} whether the assignment can become its fixed value
	 */
	const safeToAssign = (walker, definition, scope, value) => {
		if (definition.fixed === undefined) return true;
		let definitionSafeIds;
		if (
			definition.fixed === null &&
			(definitionSafeIds = walker.defs_to_safe_ids.get(definition.id))
		) {
			definitionSafeIds[definition.id] = false;
			walker.defs_to_safe_ids.delete(definition.id);
			return true;
		}
		if (!hasOwn(walker.safe_ids, definition.id)) return false;
		if (!safeToRead(walker, definition)) return false;
		if (definition.fixed === false) return false;
		if (
			definition.fixed !== null &&
			definition.fixed !== undefined &&
			(!value || definition.references.length > definition.assignments)
		) {
			return false;
		}
		if (definition.fixed instanceof AST_Defun) {
			return (
				value instanceof AST_Node && definition.fixed.parent_scope === scope
			);
		}
		return definition.orig.every(
			(/** @type {Node} */ symbol) =>
				!(
					symbol instanceof AST_SymbolConst ||
					symbol instanceof AST_SymbolDefun ||
					symbol instanceof AST_SymbolLambda
				)
		);
	};

	/**
	 * @param {EXPECTED_ANY} walker the walker
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {SymbolDefinition} definition the definition
	 * @returns {boolean} whether it is read once, outside any loop it was set in
	 */
	const referencedOnce = (walker, compressor, definition) =>
		compressor.option("unused") &&
		!definition.scope.pinned() &&
		definition.references.length - definition.recursive_refs === 1 &&
		walker.loop_ids.get(definition.id) === walker.in_loop;

	/**
	 * @param {Node | undefined} value a value
	 * @returns {boolean} whether reading it cannot change it
	 */
	const isImmutable = (value) => {
		if (!value) return false;
		return (
			value.is_constant() ||
			value instanceof AST_Lambda ||
			value instanceof AST_This
		);
	};

	/**
	 * Records how far a definition's value leaves where it is read: `escaped` is
	 * how many properties are read off it before it does.
	 * @param {EXPECTED_ANY} walker the walker
	 * @param {SymbolDefinition} definition the definition
	 * @param {Scope} scope the scope reading it
	 * @param {Node} node the node reading it
	 * @param {Node | undefined} value its value there
	 * @param {number} level how far up the node is from the walker's current one
	 * @param {number} depth how many properties were read off it
	 * @returns {void}
	 */
	const markEscaped = (
		walker,
		definition,
		scope,
		node,
		value,
		level,
		depth
	) => {
		const parent = walker.parent(level);
		if (value) {
			if (value.is_constant()) return;
			if (value instanceof AST_ClassExpression) return;
		}

		if (
			(parent instanceof AST_Assign &&
				(parent.operator === "=" || parent.logical) &&
				node === parent.right) ||
			(parent instanceof AST_Call &&
				(node !== parent.expression || parent instanceof AST_New)) ||
			(parent instanceof AST_Exit &&
				node === parent.value &&
				node.scope !== definition.scope) ||
			(parent instanceof AST_VarDefLike && node === parent.value) ||
			(parent instanceof AST_Yield &&
				node === parent.value &&
				node.scope !== definition.scope)
		) {
			if (depth > 1 && !(value && value.is_constant_expression(scope))) {
				depth = 1;
			}
			if (!definition.escaped || definition.escaped > depth) {
				definition.escaped = depth;
			}
			return;
		} else if (
			parent instanceof AST_Array ||
			parent instanceof AST_Await ||
			(parent instanceof AST_Binary && lazyOperators.has(parent.operator)) ||
			(parent instanceof AST_Conditional && node !== parent.condition) ||
			parent instanceof AST_Expansion ||
			(parent instanceof AST_Sequence && node === parent.tail_node())
		) {
			markEscaped(walker, definition, scope, parent, parent, level + 1, depth);
		} else if (parent instanceof AST_ObjectKeyVal && node === parent.value) {
			const object = walker.parent(level + 1);
			markEscaped(walker, definition, scope, object, object, level + 2, depth);
		} else if (parent instanceof AST_PropAccess && node === parent.expression) {
			value = readProperty(value, parent.property);
			markEscaped(
				walker,
				definition,
				scope,
				parent,
				value,
				level + 1,
				depth + 1
			);
			if (value) return;
		}

		if (level > 0) return;
		if (parent instanceof AST_Sequence && node !== parent.tail_node()) return;
		if (parent instanceof AST_SimpleStatement) return;

		definition.direct_access = true;
	};

	/**
	 * Gives up on every definition a pattern or loop head names.
	 * @param {Node} node the node
	 * @returns {void}
	 */
	const suppress = (node) => {
		walk(node, (/** @type {Node} */ child) => {
			if (!(child instanceof AST_Symbol)) return;
			const definition = child.definition();
			if (!definition) return;
			if (child instanceof AST_SymbolRef) definition.references.push(child);
			definition.fixed = false;
		});
	};

	defineReduceVars(
		AST_Accessor,
		function reduceAccessor(walker, descend, compressor) {
			push(walker);
			resetVariables(walker, compressor, this);
			descend();
			pop(walker);
			return true;
		}
	);

	defineReduceVars(
		AST_Assign,
		function reduceAssign(walker, descend, compressor) {
			const node = this;
			if (node.left instanceof AST_Destructuring) {
				suppress(node.left);
				return;
			}

			/**
			 * @returns {true | undefined} whether the walk is done
			 */
			const finishWalk = () => {
				if (node.logical) {
					node.left.walk(walker);

					push(walker);
					node.right.walk(walker);
					pop(walker);

					return true;
				}
			};

			const symbol = node.left;
			if (!(symbol instanceof AST_SymbolRef)) return finishWalk();

			const definition = symbol.definition();
			const safe = safeToAssign(walker, definition, symbol.scope, node.right);
			definition.assignments++;
			if (!safe) return finishWalk();

			const fixed = definition.fixed;
			if (!fixed && node.operator !== "=" && !node.logical) return finishWalk();

			const isPlain = node.operator === "=";
			const value = isPlain ? node.right : node;
			if (isModified(compressor, walker, node, value, 0)) return finishWalk();

			definition.references.push(symbol);

			if (!node.logical) {
				if (!isPlain) definition.chained = true;

				definition.fixed = isPlain
					? () => node.right
					: () =>
							makeNode(AST_Binary, node, {
								operator: node.operator.slice(0, -1),
								left: fixed instanceof AST_Node ? fixed : fixed(),
								right: node.right
							});
			}

			if (node.logical) {
				mark(walker, definition, false);
				push(walker);
				node.right.walk(walker);
				pop(walker);
				return true;
			}

			mark(walker, definition, false);
			node.right.walk(walker);
			mark(walker, definition, true);

			markEscaped(walker, definition, symbol.scope, node, value, 0, 1);

			return true;
		}
	);

	defineReduceVars(AST_Binary, function reduceBinary(walker) {
		if (!lazyOperators.has(this.operator)) return;
		this.left.walk(walker);
		push(walker);
		this.right.walk(walker);
		pop(walker);
		return true;
	});

	defineReduceVars(
		AST_Block,
		function reduceBlock(walker, descend, compressor) {
			resetBlockVariables(compressor, this);
		}
	);

	defineReduceVars(AST_Case, function reduceCase(walker) {
		push(walker);
		this.expression.walk(walker);
		pop(walker);
		push(walker);
		walkBody(this, walker);
		pop(walker);
		return true;
	});

	defineReduceVars(AST_Class, function reduceClass(walker, descend) {
		clearFlag(this, INLINED);
		push(walker);
		descend();
		pop(walker);
		return true;
	});

	defineReduceVars(
		AST_ClassStaticBlock,
		function reduceStaticBlock(walker, descend, compressor) {
			resetBlockVariables(compressor, this);
		}
	);

	defineReduceVars(AST_Conditional, function reduceConditional(walker) {
		this.condition.walk(walker);
		push(walker);
		this.consequent.walk(walker);
		pop(walker);
		push(walker);
		this.alternative.walk(walker);
		pop(walker);
		return true;
	});

	// An optional call or property access pushes and never pops: a chain's
	// conditions hold cumulatively, so the chain restores them all at its end.
	defineReduceVars(AST_Chain, (walker, descend) => {
		const safeIds = walker.safe_ids;
		descend();
		walker.safe_ids = safeIds;
		return true;
	});

	defineReduceVars(AST_Call, function reduceCall(walker) {
		this.expression.walk(walker);
		if (this.optional) push(walker);
		for (const argument of this.args) argument.walk(walker);
		return true;
	});

	defineReduceVars(AST_PropAccess, function reducePropAccess(walker) {
		if (!this.optional) return;
		this.expression.walk(walker);
		push(walker);
		if (this.property instanceof AST_Node) this.property.walk(walker);
		return true;
	});

	defineReduceVars(AST_Default, (walker, descend) => {
		push(walker);
		descend();
		pop(walker);
		return true;
	});

	defineReduceVars(
		AST_Lambda,
		function reduceLambda(walker, descend, compressor) {
			clearFlag(this, INLINED);
			push(walker);
			resetVariables(walker, compressor, this);

			let call;
			if (
				!this.name &&
				!this.uses_arguments &&
				!this.pinned() &&
				(call = walker.parent()) instanceof AST_Call &&
				call.expression === this &&
				!call.args.some(
					(/** @type {Node} */ argument) => argument instanceof AST_Expansion
				) &&
				this.argnames.every(
					(/** @type {Node} */ name) => name instanceof AST_Symbol
				)
			) {
				// An IIFE's parameters are read as variables the call's arguments set.
				const iife = call;
				for (const [i, name] of this.argnames.entries()) {
					if (!name.definition) continue;
					const definition = name.definition();
					if (definition.orig.length > 1) continue;
					if (
						definition.fixed === undefined &&
						(!this.uses_arguments || walker.has_directive("use strict"))
					) {
						definition.fixed = () => iife.args[i] || makeVoid0(iife);
						walker.loop_ids.set(definition.id, walker.in_loop);
						mark(walker, definition, true);
					} else {
						definition.fixed = false;
					}
				}
			}

			descend();
			pop(walker);

			handleDefinedAfterHoist(this);

			return true;
		}
	);

	/**
	 * Stops inlining a variable a hoisted function reads where the function can
	 * be called before the variable is written. The functions a hoisted function
	 * calls are ordered by the earliest read of any function calling them.
	 * @param {Scope} parent the function or top level whose functions are checked
	 * @returns {void}
	 */
	const handleDefinedAfterHoist = (parent) => {
		/** @type {Node[]} */
		const defuns = [];
		// Only a statement holds a function declaration outside a nested scope,
		// so the walk does not enter an expression, as terser's did.
		walk(parent, (/** @type {Node} */ node) => {
			if (node === parent) return;
			const kind = node[KIND];
			if (kind & REDUCE_DEFUN) {
				defuns.push(node);
				return true;
			}
			return (kind & REDUCE_OPAQUE) !== 0 || (kind & REDUCE_STATEMENT) === 0;
		});

		/** @type {Map<number, number[]>} */
		const defunDependencies = new Map();
		/** @type {Map<number, SymbolDefinition[]>} */
		const dependencies = new Map();
		/** @type {Set<number>} */
		const symbolsOfInterest = new Set();
		/** @type {Set<number>} */
		const defunsOfInterest = new Set();

		for (const defun of defuns) {
			const nameDefinition = defun.name.definition();
			/** @type {SymbolDefinition[]} */
			const enclosingDefinitions = [];

			for (const definition of defun.enclosed) {
				if (
					definition.fixed === false ||
					definition === nameDefinition ||
					definition.scope.get_defun_scope() !== parent
				) {
					continue;
				}

				symbolsOfInterest.add(definition.id);

				if (
					definition.assignments === 0 &&
					definition.orig.length === 1 &&
					definition.orig[0] instanceof AST_SymbolDefun
				) {
					defunsOfInterest.add(definition.id);
					symbolsOfInterest.add(definition.id);

					defunsOfInterest.add(nameDefinition.id);
					symbolsOfInterest.add(nameDefinition.id);

					let called = defunDependencies.get(nameDefinition.id);
					if (called === undefined) {
						called = [];
						defunDependencies.set(nameDefinition.id, called);
					}
					called.push(definition.id);

					continue;
				}

				enclosingDefinitions.push(definition);
			}

			if (enclosingDefinitions.length !== 0) {
				dependencies.set(nameDefinition.id, enclosingDefinitions);
				defunsOfInterest.add(nameDefinition.id);
				symbolsOfInterest.add(nameDefinition.id);
			}
		}

		if (dependencies.size === 0) return;

		// Symbols of interest counted in walk order, so reads and writes compare.
		let symbolIndex = 1;
		/** @type {Map<number, number>} */
		const defunFirstRead = new Map();
		/** @type {Map<number, number>} */
		const symbolLastWrite = new Map();

		// WHY: terser's walk here asks `is_recursive_ref` with an id, which it
		// compares to definitions, so it never holds; only each node's parent is
		// read, which a stack beside terser's own child order gives without
		// terser's per-walk closures.
		/** @type {Node[]} */
		const pending = [parent];
		/** @type {(Node | undefined)[]} */
		const parents = [undefined];
		/** @type {Node} */
		let current;
		/**
		 * @param {Node} child a child of the current node
		 * @returns {void}
		 */
		const pushChild = (child) => {
			pending.push(child);
			parents.push(current);
		};
		while (pending.length !== 0) {
			current = /** @type {Node} */ (pending.pop());
			const holder = parents.pop();
			if (current[KIND] & REDUCE_SYMBOL && current.thedef) {
				const id = current.definition().id;

				symbolIndex++;

				if (
					symbolsOfInterest.has(id) &&
					(current instanceof AST_SymbolDeclaration || isLhs(current, holder))
				) {
					symbolLastWrite.set(id, symbolIndex);
				}

				if (defunsOfInterest.has(id) && !defunFirstRead.has(id)) {
					defunFirstRead.set(id, symbolIndex);
				}
			}
			current._children_backwards(pushChild);
		}

		const firstReadOfCaller = earliestCallerRead(
			defunFirstRead,
			defunDependencies
		);

		for (const [defun, definitions] of dependencies) {
			const firstRead = firstReadOfCaller.get(defun);
			if (firstRead === undefined) continue;

			for (const definition of definitions) {
				if (definition.fixed === false) continue;
				const lastWrite = symbolLastWrite.get(definition.id) || 0;
				if (firstRead < lastWrite) definition.fixed = false;
			}
		}
	};

	/**
	 * For each function, the earliest first read of itself or of any function
	 * calling it, directly or not: what terser's per-function propagation settles
	 * on, reached here visiting each function once, earliest reads first.
	 * @param {Map<number, number>} firstRead each function's first read
	 * @param {Map<number, number[]>} calls the functions each function calls
	 * @returns {Map<number, number>} the earliest read reaching each function
	 */
	const earliestCallerRead = (firstRead, calls) => {
		/** @type {Map<number, number>} */
		const earliest = new Map();
		const roots = [...firstRead].sort((a, b) => a[1] - b[1]);
		/** @type {number[]} */
		const pending = [];
		for (const [root, read] of roots) {
			if (earliest.has(root)) continue;
			earliest.set(root, read);
			const called = calls.get(root);
			if (called === undefined) continue;
			for (const id of called) pending.push(id);
			while (pending.length !== 0) {
				const id = /** @type {number} */ (pending.pop());
				if (earliest.has(id)) continue;
				earliest.set(id, read);
				const next = calls.get(id);
				if (next !== undefined) for (const callee of next) pending.push(callee);
			}
		}
		return earliest;
	};

	defineReduceVars(AST_Do, function reduceDo(walker, descend, compressor) {
		resetBlockVariables(compressor, this);
		const savedLoop = walker.in_loop;
		walker.in_loop = this;
		push(walker);
		this.body.walk(walker);
		if (hasBreakOrContinue(this)) {
			pop(walker);
			push(walker);
		}
		this.condition.walk(walker);
		pop(walker);
		walker.in_loop = savedLoop;
		return true;
	});

	defineReduceVars(AST_For, function reduceFor(walker, descend, compressor) {
		resetBlockVariables(compressor, this);
		if (this.init) this.init.walk(walker);
		const savedLoop = walker.in_loop;
		walker.in_loop = this;
		push(walker);
		if (this.condition) this.condition.walk(walker);
		this.body.walk(walker);
		if (this.step) {
			if (hasBreakOrContinue(this)) {
				pop(walker);
				push(walker);
			}
			this.step.walk(walker);
		}
		pop(walker);
		walker.in_loop = savedLoop;
		return true;
	});

	defineReduceVars(
		AST_ForIn,
		function reduceForIn(walker, descend, compressor) {
			resetBlockVariables(compressor, this);
			suppress(this.init);
			this.object.walk(walker);
			const savedLoop = walker.in_loop;
			walker.in_loop = this;
			push(walker);
			this.body.walk(walker);
			pop(walker);
			walker.in_loop = savedLoop;
			return true;
		}
	);

	defineReduceVars(AST_If, function reduceIf(walker) {
		this.condition.walk(walker);
		push(walker);
		this.body.walk(walker);
		pop(walker);
		if (this.alternative) {
			push(walker);
			this.alternative.walk(walker);
			pop(walker);
		}
		return true;
	});

	defineReduceVars(AST_LabeledStatement, function reduceLabeled(walker) {
		push(walker);
		this.body.walk(walker);
		pop(walker);
		return true;
	});

	defineReduceVars(AST_SymbolCatch, function reduceCatchName() {
		this.definition().fixed = false;
	});

	defineReduceVars(
		AST_SymbolRef,
		function reduceReference(walker, descend, compressor) {
			const definition = this.definition();
			definition.references.push(this);
			if (
				definition.references.length === 1 &&
				!definition.fixed &&
				definition.orig[0] instanceof AST_SymbolDefun
			) {
				walker.loop_ids.set(definition.id, walker.in_loop);
			}
			let fixedValue;
			if (definition.fixed === undefined || !safeToRead(walker, definition)) {
				definition.fixed = false;
			} else if (definition.fixed) {
				fixedValue = this.fixed_value();
				if (
					fixedValue instanceof AST_Lambda &&
					isRecursiveRef(walker, definition)
				) {
					definition.recursive_refs++;
				} else if (
					fixedValue &&
					!compressor.exposed(definition) &&
					referencedOnce(walker, compressor, definition)
				) {
					definition.single_use =
						(fixedValue instanceof AST_Lambda && !fixedValue.pinned()) ||
						fixedValue instanceof AST_Class ||
						(definition.scope === this.scope &&
							fixedValue.is_constant_expression());
				} else {
					definition.single_use = false;
				}
				if (
					isModified(
						compressor,
						walker,
						this,
						fixedValue,
						0,
						isImmutable(fixedValue)
					)
				) {
					if (definition.single_use) {
						definition.single_use = "m";
					} else {
						definition.fixed = false;
					}
				}
			}
			markEscaped(walker, definition, this.scope, this, fixedValue, 0, 1);
		}
	);

	defineReduceVars(
		AST_Toplevel,
		function reduceToplevel(walker, descend, compressor) {
			for (const definition of this.globals.values()) {
				resetDefinition(compressor, definition);
			}
			resetVariables(walker, compressor, this);
			descend();
			handleDefinedAfterHoist(this);
			return true;
		}
	);

	defineReduceVars(AST_Try, function reduceTry(walker, descend, compressor) {
		resetBlockVariables(compressor, this);
		push(walker);
		this.body.walk(walker);
		pop(walker);
		if (this.bcatch) {
			push(walker);
			this.bcatch.walk(walker);
			pop(walker);
		}
		if (this.bfinally) this.bfinally.walk(walker);
		return true;
	});

	defineReduceVars(AST_Unary, function reduceUnary(walker) {
		const node = this;
		if (node.operator !== "++" && node.operator !== "--") return;
		const expression = node.expression;
		if (!(expression instanceof AST_SymbolRef)) return;
		const definition = expression.definition();
		const safe = safeToAssign(walker, definition, expression.scope, true);
		definition.assignments++;
		if (!safe) return;
		const fixed = definition.fixed;
		if (!fixed) return;
		definition.references.push(expression);
		definition.chained = true;
		definition.fixed = () =>
			makeNode(AST_Binary, node, {
				operator: node.operator.slice(0, -1),
				left: makeNode(AST_UnaryPrefix, node, {
					operator: "+",
					expression: fixed instanceof AST_Node ? fixed : fixed()
				}),
				right: makeNode(AST_Number, node, {
					value: 1
				})
			});
		mark(walker, definition, true);
		return true;
	});

	defineReduceVars(AST_VarDef, function reduceVarDef(walker, descend) {
		const node = this;
		if (node.name instanceof AST_Destructuring) {
			suppress(node.name);
			return;
		}
		const definition = node.name.definition();
		if (node.value) {
			if (safeToAssign(walker, definition, node.name.scope, node.value)) {
				definition.fixed = () => node.value;
				walker.loop_ids.set(definition.id, walker.in_loop);
				mark(walker, definition, false);
				descend();
				mark(walker, definition, true);
				return true;
			}
			definition.fixed = false;
		}
	});

	defineReduceVars(AST_UsingDef, function reduceUsingDef() {
		suppress(this.name);
	});

	defineReduceVars(
		AST_While,
		function reduceWhile(walker, descend, compressor) {
			resetBlockVariables(compressor, this);
			const savedLoop = walker.in_loop;
			walker.in_loop = this;
			push(walker);
			descend();
			pop(walker);
			walker.in_loop = savedLoop;
			return true;
		}
	);

	AST_Toplevel.DEFMETHOD(
		"reset_opt_flags",
		/**
		 * @this {Scope} the top level
		 * @param {EXPECTED_ANY} compressor the compressor
		 * @returns {void}
		 */
		function resetOptFlags(compressor) {
			const self = this;
			const reduceVars = compressor.option("reduce_vars");

			const preparation = new TreeWalker(
				(/** @type {Node} */ node, /** @type {() => void} */ descend) => {
					clearFlag(node, CLEAR_BETWEEN_PASSES);
					if (reduceVars) {
						if (
							compressor.top_retain &&
							node instanceof AST_Defun &&
							preparation.parent() === self
						) {
							setFlag(node, TOP);
						}
						return node.reduce_vars(preparation, descend, compressor);
					}
				}
			);
			// Whether a definition is assigned before it is read, one layer a branch.
			preparation.safe_ids = Object.create(null);
			preparation.in_loop = null;
			preparation.loop_ids = new Map();
			preparation.defs_to_safe_ids = new Map();
			self.walk(preparation);
		}
	);
};

// The xxhash64 of terser's exported `minify`, each run of whitespace read as one
// space; the driver it runs is module-private, so pinned by `TERSER_VERSION`.
const TERSER_MINIFY = "2665f86bfc8aee86";

/**
 * Whether terser's `minify` is still the driver the phase reproduces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const minifyFits = (modules) => {
	const { compress, domprops, minify, utils, version } = modules;
	if (
		version !== TERSER_VERSION ||
		typeof minify !== "function" ||
		!compress ||
		typeof compress.Compressor !== "function" ||
		!domprops ||
		!Array.isArray(domprops.domprops) ||
		!utils
	) {
		return false;
	}

	const createHash = require("../util/createHash");

	return (
		createHash("xxhash64")
			.update(minify.toString().replace(/\s+/g, " "))
			.digest("hex") === TERSER_MINIFY
	);
};

/**
 * @typedef {object} SourceMapOptions
 * @property {string | undefined} file the minified file's name
 * @property {string | undefined} root the sources' root
 * @property {EXPECTED_ANY} orig the map the input already carries
 * @property {Record<string, string> | null} files each source's content, where the map includes it
 */

/**
 * @typedef {object} SourceMapBuilder
 * @property {(source: string, generatedLine: number, generatedColumn: number, originalLine: number, originalColumn: number, name: string | undefined) => void} add records one mapping
 * @property {() => EXPECTED_OBJECT | null} getDecoded the map, decoded
 * @property {() => EXPECTED_OBJECT} getEncoded the map, encoded
 * @property {() => void} destroy frees the input's map
 */

/**
 * terser's `SourceMap`, a builder over `@jridgewell/source-map` that maps back
 * through the input's own map, but setting a source's content once rather than
 * with every mapping into it.
 * @param {EXPECTED_ANY} library `@jridgewell/source-map`, as `loadSources` read it
 * @param {SourceMapOptions} options what to build the map from
 * @returns {Generator<EXPECTED_ANY, SourceMapBuilder, EXPECTED_ANY>} the builder, once the input's map is read
 */
function* createSourceMap(library, options) {
	const { SourceMapConsumer, SourceMapGenerator } = library;

	const generator = new SourceMapGenerator({
		file: options.file,
		sourceRoot: options.root
	});
	/** @type {Record<string, string | undefined>} */
	const sourcesContent = Object.create(null);
	const { files } = options;
	for (const name in files) {
		if (Object.prototype.hasOwnProperty.call(files, name)) {
			sourcesContent[name] = files[name];
		}
	}
	/** @type {EXPECTED_ANY} */
	let originalMap;
	if (options.orig) {
		originalMap = yield new SourceMapConsumer(options.orig);
		if (originalMap.sourcesContent) {
			for (const [i, source] of originalMap.sources.entries()) {
				const content = originalMap.sourcesContent[i];
				if (content) sourcesContent[source] = content;
			}
		}
	}
	/** @type {Set<string>} */
	const withContent = new Set();

	/**
	 * @param {EXPECTED_OBJECT} map a map the generator built
	 * @returns {EXPECTED_OBJECT} it, less the keys that say nothing
	 */
	const clean = (map) => {
		const built = /** @type {EXPECTED_ANY} */ (map);
		if (
			built.sourcesContent &&
			built.sourcesContent.every(
				(/** @type {string | null | undefined} */ content) =>
					content === null || content === undefined
			)
		) {
			delete built.sourcesContent;
		}
		if (built.file === undefined) delete built.file;
		if (built.sourceRoot === undefined) delete built.sourceRoot;
		return built;
	};

	return {
		add(
			source,
			generatedLine,
			generatedColumn,
			originalLine,
			originalColumn,
			name
		) {
			const generated = { line: generatedLine, column: generatedColumn };
			if (originalMap) {
				const info = originalMap.originalPositionFor({
					line: originalLine,
					column: originalColumn
				});
				if (info.source === null) {
					generator.addMapping({
						generated,
						original: null,
						source: null,
						name: null
					});
					return;
				}
				source = info.source;
				originalLine = info.line;
				originalColumn = info.column;
				name = info.name || name;
			}
			generator.addMapping({
				generated,
				original: { line: originalLine, column: originalColumn },
				source,
				name
			});
			if (!withContent.has(source)) {
				withContent.add(source);
				generator.setSourceContent(source, sourcesContent[source]);
			}
		},
		getDecoded() {
			return generator.toDecodedMap ? clean(generator.toDecodedMap()) : null;
		},
		getEncoded() {
			return clean(generator.toJSON());
		},
		destroy() {
			if (originalMap && originalMap.destroy) originalMap.destroy();
		}
	};
}

/**
 * terser's `propmangle.js`: property and `#private` name mangling. It builds
 * the builtin names a property keeps once rather than per call, and prints a
 * call to test for `Object.defineProperty` only where its property is that name.
 * @param {TerserModules} modules terser's modules, with `domprops` among them
 * @returns {{ reserveQuotedKeys: (toplevel: Node, reserved: string[]) => void, manglePrivateProperties: (toplevel: Node, options: EXPECTED_ANY) => Node, findAnnotatedProperties: (toplevel: Node) => Set<string>, mangleProperties: (toplevel: Node, options: EXPECTED_ANY, annotated?: Set<string>) => Node }} the manglers
 */
const createPropertyMangler = (modules) => {
	const { ast, domprops } = modules;
	const {
		AST_Binary,
		AST_Call,
		AST_ClassPrivateProperty,
		AST_Conditional,
		AST_Dot,
		AST_DotHash,
		AST_ObjectKeyVal,
		AST_ObjectProperty,
		AST_PrivateGetter,
		AST_PrivateIn,
		AST_PrivateMethod,
		AST_PrivateSetter,
		AST_PropAccess,
		AST_Sequence,
		AST_String,
		AST_Sub,
		TreeTransformer,
		TreeWalker,
		walk
	} = ast;
	const { base54 } = modules.scope;
	const NUMERIC = /^-?[0-9]+(\.[0-9]+)?(e[+-][0-9]+)?$/;

	/** @type {Set<string> | undefined} */
	let builtins;
	/**
	 * terser's `find_builtins`: the DOM's property names and every standard
	 * global's, which a property keeps unless `builtins` is set.
	 * @returns {Set<string>} the names
	 */
	const builtinNames = () => {
		if (builtins !== undefined) return builtins;
		builtins = new Set(domprops.domprops);
		for (const name of [
			"null",
			"true",
			"false",
			"NaN",
			"Infinity",
			"-Infinity",
			"undefined"
		]) {
			builtins.add(name);
		}
		// A global some engines lack reads as a function with no names of its own.
		const optional = (/** @type {string} */ name) =>
			/** @type {Record<string, EXPECTED_ANY>} */ (global)[name] ||
			function missing() {};
		for (const ctor of [
			Object,
			Array,
			Function,
			Number,
			String,
			Boolean,
			Error,
			Math,
			Date,
			RegExp,
			optional("Symbol"),
			ArrayBuffer,
			DataView,
			decodeURI,
			decodeURIComponent,
			encodeURI,
			encodeURIComponent,
			// eslint-disable-next-line no-eval
			eval,
			EvalError,
			Float32Array,
			Float64Array,
			Int8Array,
			Int16Array,
			Int32Array,
			// The same names as the globals: a function's own are `length` and `name`.
			Number.isFinite,
			Number.isNaN,
			JSON,
			optional("Map"),
			Number.parseFloat,
			Number.parseInt,
			optional("Promise"),
			optional("Proxy"),
			RangeError,
			ReferenceError,
			optional("Reflect"),
			optional("Set"),
			SyntaxError,
			TypeError,
			Uint8Array,
			Uint8ClampedArray,
			Uint16Array,
			Uint32Array,
			URIError,
			optional("WeakMap"),
			optional("WeakSet")
		]) {
			for (const name of Object.getOwnPropertyNames(ctor)) builtins.add(name);
			if (ctor.prototype) {
				for (const name of Object.getOwnPropertyNames(ctor.prototype)) {
					builtins.add(name);
				}
			}
		}
		return builtins;
	};

	/**
	 * @param {Node} node a node a private name belongs to
	 * @returns {boolean} whether `#private` mangling renames it instead
	 */
	const isPrivate = (node) =>
		node instanceof AST_ClassPrivateProperty ||
		node instanceof AST_PrivateMethod ||
		node instanceof AST_PrivateGetter ||
		node instanceof AST_PrivateSetter ||
		node instanceof AST_DotHash;

	/**
	 * @param {Node} node a call
	 * @returns {boolean} whether it calls `Object.defineProperty` as printed
	 */
	const definesProperty = (node) => {
		const callee = node.expression;
		if (!(callee instanceof AST_PropAccess)) return false;
		const { property } = callee;
		// Cheap to rule out, where printing the callee is not.
		if (
			property !== "defineProperty" &&
			!(property instanceof AST_String && property.value === "defineProperty")
		) {
			return false;
		}
		return callee.print_to_string() === "Object.defineProperty";
	};

	/**
	 * Every string a property key may be read from.
	 * @param {Node} node where the key is computed
	 * @param {(name: string) => void} add receives each
	 * @returns {void}
	 */
	const addStrings = (node, add) => {
		node.walk(
			new TreeWalker((/** @type {Node} */ inner) => {
				if (inner instanceof AST_Sequence) {
					addStrings(inner.tail_node(), add);
				} else if (inner instanceof AST_String) {
					add(inner.value);
				} else if (inner instanceof AST_Conditional) {
					addStrings(inner.consequent, add);
					addStrings(inner.alternative, add);
				}
				return true;
			})
		);
	};

	/**
	 * terser's `find_annotated_props`: the names marked for mangling.
	 * @param {Node} toplevel the tree
	 * @returns {Set<string>} the names
	 */
	const findAnnotated = (toplevel) => {
		/** @type {Set<string>} */
		const annotated = new Set();
		walk(toplevel, (/** @type {Node} */ node) => {
			if (isPrivate(node)) return;
			if (node instanceof AST_ObjectKeyVal) {
				if (typeof node.key === "string" && node._annotations & MANGLE_PROP) {
					annotated.add(node.key);
				}
			} else if (node instanceof AST_ObjectProperty) {
				if (node._annotations & MANGLE_PROP) annotated.add(node.key.name);
			} else if (node instanceof AST_Dot) {
				if (node._annotations & MANGLE_PROP) annotated.add(node.property);
			} else if (
				node instanceof AST_Sub &&
				node.property instanceof AST_String &&
				node._annotations & MANGLE_PROP
			) {
				annotated.add(node.property.value);
			}
		});
		return annotated;
	};

	return {
		reserveQuotedKeys(toplevel, reserved) {
			/**
			 * @param {string} name a quoted key
			 * @returns {void}
			 */
			const add = (name) => pushUnique(reserved, name);
			toplevel.walk(
				new TreeWalker((/** @type {Node} */ node) => {
					if (node instanceof AST_ObjectKeyVal && node.quote) {
						add(node.key);
					} else if (node instanceof AST_ObjectProperty && node.quote) {
						add(node.key.name);
					} else if (node instanceof AST_Sub) {
						addStrings(node.property, add);
					}
				})
			);
		},

		manglePrivateProperties(toplevel, options) {
			let counter = -1;
			/** @type {Map<string, string>} */
			const cache = new Map();
			const identifiers = options.nth_identifier || base54;
			/**
			 * @param {string} name a private name
			 * @returns {string} its mangled name, one per name
			 */
			const manglePrivate = (name) => {
				let mangled = cache.get(name);
				if (!mangled) {
					mangled = identifiers.get(++counter);
					cache.set(name, /** @type {string} */ (mangled));
				}
				return /** @type {string} */ (mangled);
			};
			return toplevel.transform(
				new TreeTransformer((/** @type {Node} */ node) => {
					if (
						node instanceof AST_ClassPrivateProperty ||
						node instanceof AST_PrivateMethod ||
						node instanceof AST_PrivateGetter ||
						node instanceof AST_PrivateSetter ||
						node instanceof AST_PrivateIn
					) {
						node.key.name = manglePrivate(node.key.name);
					} else if (node instanceof AST_DotHash) {
						node.property = manglePrivate(node.property);
					}
				})
			);
		},

		findAnnotatedProperties: (toplevel) => findAnnotated(toplevel),

		mangleProperties(toplevel, given, annotated) {
			const annotatedNames =
				annotated === undefined
					? this.findAnnotatedProperties(toplevel)
					: annotated;
			const options = defaults(
				given,
				{
					builtins: false,
					cache: null,
					debug: false,
					keep_quoted: false,
					nth_identifier: base54,
					only_cache: false,
					regex: null,
					reserved: null,
					undeclared: false,
					only_annotated: false
				},
				true
			);
			const identifiers = options.nth_identifier;
			const reservedOption = Array.isArray(options.reserved)
				? options.reserved
				: [options.reserved];
			/** @type {Set<string>} */
			const reserved = options.builtins
				? new Set(reservedOption)
				: new Set([...reservedOption, ...builtinNames()]);
			let counter = -1;
			/** @type {Map<string, string>} */
			const cache = options.cache ? options.cache.props : new Map();
			const onlyAnnotated = options.only_annotated;
			const regex = options.regex && new RegExp(options.regex);
			// `debug` is false, or the suffix a debug name ends in: `true` is none.
			const debug = options.debug !== false;
			const debugSuffix = options.debug === true ? "" : options.debug;
			/** @type {Set<string>} */
			const toMangle = new Set();
			/** @type {Set<string>} */
			const unmangleable = new Set();
			// A name already handed out is not handed out again.
			for (const mangled of cache.values()) unmangleable.add(mangled);
			const keepQuoted = Boolean(options.keep_quoted);

			/**
			 * @param {string} name a property name
			 * @returns {boolean} whether it may be renamed
			 */
			const canMangle = (name) => {
				if (unmangleable.has(name)) return false;
				if (reserved.has(name)) return false;
				if (options.only_cache) return cache.has(name);
				return !NUMERIC.test(name);
			};
			/**
			 * @param {string} name a property name
			 * @returns {boolean} whether it is renamed
			 */
			const shouldMangle = (name) => {
				if (onlyAnnotated && !annotatedNames.has(name)) return false;
				if (regex && !regex.test(name)) return annotatedNames.has(name);
				if (reserved.has(name)) return false;
				return cache.has(name) || toMangle.has(name);
			};
			/**
			 * @param {string} name a property name found
			 * @returns {void}
			 */
			const add = (name) => {
				if (canMangle(name)) toMangle.add(name);
				if (!shouldMangle(name)) unmangleable.add(name);
			};
			/**
			 * @param {string} name a property name
			 * @returns {string} what it is renamed to
			 */
			const mangle = (name) => {
				if (!shouldMangle(name)) return name;
				let mangled = cache.get(name);
				if (!mangled) {
					if (debug) {
						const debugName = `_$${name}$${debugSuffix}_`;
						if (canMangle(debugName)) mangled = debugName;
					}
					if (!mangled) {
						do {
							mangled = identifiers.get(++counter);
						} while (!canMangle(/** @type {string} */ (mangled)));
					}
					cache.set(name, /** @type {string} */ (mangled));
				}
				return /** @type {string} */ (mangled);
			};
			/**
			 * @param {Node} node where a key is computed
			 * @returns {Node} the same, each string it may read renamed
			 */
			const mangleStrings = (node) =>
				node.transform(
					new TreeTransformer((/** @type {Node} */ inner) => {
						if (inner instanceof AST_Sequence) {
							const last = inner.expressions.length - 1;
							inner.expressions[last] = mangleStrings(inner.expressions[last]);
						} else if (inner instanceof AST_String) {
							// Cleared so a key annotation is not mangled a second time.
							inner._annotations &= ~KEY;
							inner.value = mangle(inner.value);
						} else if (inner instanceof AST_Conditional) {
							inner.consequent = mangleStrings(inner.consequent);
							inner.alternative = mangleStrings(inner.alternative);
						}
						return inner;
					})
				);

			toplevel.walk(
				new TreeWalker((/** @type {Node} */ node) => {
					if (isPrivate(node)) return;
					if (node instanceof AST_ObjectKeyVal) {
						if (typeof node.key === "string" && (!keepQuoted || !node.quote)) {
							add(node.key);
						}
					} else if (node instanceof AST_ObjectProperty) {
						if (!keepQuoted || !node.quote) add(node.key.name);
					} else if (node instanceof AST_Dot) {
						let declared = Boolean(options.undeclared);
						if (!declared) {
							let root = node;
							while (root.expression) root = root.expression;
							declared = !(root.thedef && root.thedef.undeclared);
						}
						if (declared && (!keepQuoted || !node.quote)) add(node.property);
					} else if (node instanceof AST_Sub) {
						if (!keepQuoted) addStrings(node.property, add);
					} else if (node instanceof AST_Call && definesProperty(node)) {
						addStrings(node.args[1], add);
					} else if (node instanceof AST_Binary && node.operator === "in") {
						addStrings(node.left, add);
					} else if (node instanceof AST_String && node._annotations & KEY) {
						add(node.value);
					}
				})
			);

			return toplevel.transform(
				new TreeTransformer((/** @type {Node} */ node) => {
					if (isPrivate(node)) return;
					if (node instanceof AST_ObjectKeyVal) {
						if (typeof node.key === "string" && (!keepQuoted || !node.quote)) {
							node.key = mangle(node.key);
						}
					} else if (node instanceof AST_ObjectProperty) {
						if ((!keepQuoted || !node.quote) && !node.computed_key()) {
							node.key.name = mangle(node.key.name);
						}
					} else if (node instanceof AST_Dot) {
						if (!keepQuoted || !node.quote) {
							node.property = mangle(node.property);
						}
					} else if (!keepQuoted && node instanceof AST_Sub) {
						node.property = mangleStrings(node.property);
					} else if (node instanceof AST_Call && definesProperty(node)) {
						node.args[1] = mangleStrings(node.args[1]);
					} else if (node instanceof AST_Binary && node.operator === "in") {
						node.left = mangleStrings(node.left);
					} else if (node instanceof AST_String && node._annotations & KEY) {
						// Cleared so a key annotation is not mangled a second time.
						node._annotations &= ~KEY;
						node.value = mangle(node.value);
					}
				})
			);
		}
	};
};

/**
 * Installs webpack's `minify`, terser's driver phase by phase. It skips the
 * walk renaming `#private` members where the input names none.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installMinify = (modules) => {
	const { ast, parse: parseModule, output } = modules;
	const { AST_Node, AST_Scope, AST_Toplevel, walk } = ast;
	const { Compressor } = modules.compress;
	const {
		findAnnotatedProperties,
		manglePrivateProperties,
		mangleProperties,
		reserveQuotedKeys
	} = createPropertyMangler(modules);
	/**
	 * @param {SourceMapOptions} options what to build the map from
	 * @returns {Generator<EXPECTED_ANY, SourceMapBuilder, EXPECTED_ANY>} the builder
	 */
	const SourceMap = (options) => createSourceMap(modules.sourceMap, options);
	const { base54 } = modules.scope;
	const original = modules.minify;

	/**
	 * @param {string} code a source ending in an inline source map
	 * @returns {string | null} the map's JSON, or null where there is none
	 */
	const readSourceMap = (code) => {
		const match =
			/(?:^|[^.])\/\/# sourceMappingURL=data:application\/json(;[\w=-]*)?;base64,([+/0-9A-Za-z]*=*)\s*$/.exec(
				code
			);
		if (!match) {
			// eslint-disable-next-line no-console
			console.warn("inline source map not found");
			return null;
		}
		return Buffer.from(match[2], "base64").toString();
	};

	/**
	 * @param {string} name a top-level option
	 * @param {EXPECTED_ANY} options the options
	 * @param {string[]} keys the option groups it also sets
	 * @returns {void}
	 */
	const setShorthand = (name, options, keys) => {
		if (options[name]) {
			for (const key of keys) {
				if (options[key]) {
					if (typeof options[key] !== "object") options[key] = {};
					if (!(name in options[key])) options[key][name] = options[name];
				}
			}
		}
	};

	/**
	 * @param {EXPECTED_ANY} cache a name cache
	 * @returns {void}
	 */
	const initCache = (cache) => {
		if (!cache) return;
		if (!("props" in cache)) {
			cache.props = new Map();
		} else if (!(cache.props instanceof Map)) {
			cache.props = mapFromObject(cache.props);
		}
	};

	/**
	 * @param {EXPECTED_ANY} files what `minify` was given
	 * @returns {boolean} whether no source there can name a `#private` member
	 */
	const namesNoPrivateMember = (files) => {
		// Read once: a tree handed back through `format.ast` may have gained one.
		if (files instanceof AST_Toplevel) {
			return WITHOUT_PRIVATE_NAMES.delete(files);
		}
		if (typeof files === "string") return !files.includes("#");
		if (!files || typeof files !== "object" || Array.isArray(files)) {
			return false;
		}
		for (const name of Object.keys(files)) {
			if (typeof files[name] !== "string" || files[name].includes("#")) {
				return false;
			}
		}
		return true;
	};

	/**
	 * terser's `minify_sync_or_async`: it yields where a source map may be read
	 * asynchronously, and returns the result.
	 * @param {EXPECTED_ANY} files the sources, or a tree
	 * @param {EXPECTED_ANY} options the options
	 * @returns {Generator<EXPECTED_ANY, EXPECTED_ANY, EXPECTED_ANY>} the driver
	 */
	function* minifySyncOrAsync(files, options) {
		options = defaults(
			options,
			{
				compress: {},
				ecma: undefined,
				enclose: false,
				ie8: false,
				keep_classnames: undefined,
				keep_fnames: false,
				mangle: {},
				module: false,
				nameCache: null,
				output: null,
				format: null,
				parse: {},
				rename: undefined,
				safari10: false,
				sourceMap: false,
				spidermonkey: false,
				timings: false,
				toplevel: false,
				warnings: false,
				wrap: false
			},
			true
		);
		const timings = options.timings && { start: Date.now() };
		if (options.keep_classnames === undefined) {
			options.keep_classnames = options.keep_fnames;
		}
		if (options.rename === undefined) {
			options.rename = options.compress && options.mangle;
		}
		if (options.output && options.format) {
			throw new Error(
				"Please only specify either output or format option, preferrably format."
			);
		}
		options.format = options.format || options.output || {};
		setShorthand("ecma", options, ["parse", "compress", "format"]);
		setShorthand("ie8", options, ["compress", "mangle", "format"]);
		setShorthand("keep_classnames", options, ["compress", "mangle"]);
		setShorthand("keep_fnames", options, ["compress", "mangle"]);
		setShorthand("module", options, ["parse", "compress", "mangle"]);
		setShorthand("safari10", options, ["mangle", "format"]);
		setShorthand("toplevel", options, ["compress", "mangle"]);
		setShorthand("warnings", options, ["compress"]);
		let quotedProperties;
		if (options.mangle) {
			options.mangle = defaults(
				options.mangle,
				{
					cache: options.nameCache && (options.nameCache.vars || {}),
					eval: false,
					ie8: false,
					keep_classnames: false,
					keep_fnames: false,
					module: false,
					nth_identifier: base54,
					properties: false,
					reserved: [],
					safari10: false,
					toplevel: false
				},
				true
			);
			if (options.mangle.properties) {
				if (typeof options.mangle.properties !== "object") {
					options.mangle.properties = {};
				}
				if (options.mangle.properties.keep_quoted) {
					quotedProperties = options.mangle.properties.reserved;
					if (!Array.isArray(quotedProperties)) quotedProperties = [];
					options.mangle.properties.reserved = quotedProperties;
				}
				if (options.nameCache && !("cache" in options.mangle.properties)) {
					options.mangle.properties.cache = options.nameCache.props || {};
				}
			}
			initCache(options.mangle.cache);
			initCache(options.mangle.properties.cache);
		}
		if (options.sourceMap) {
			options.sourceMap = defaults(
				options.sourceMap,
				{
					asObject: false,
					content: null,
					filename: null,
					includeSources: false,
					root: null,
					url: null
				},
				true
			);
		}
		const withoutPrivateNames = namesNoPrivateMember(files);

		// Parse.
		if (timings) timings.parse = Date.now();
		let toplevel;
		if (files instanceof AST_Toplevel) {
			toplevel = files;
		} else {
			if (
				typeof files === "string" ||
				(options.parse.spidermonkey && !Array.isArray(files))
			) {
				files = [files];
			}
			options.parse = options.parse || {};
			options.parse.toplevel = null;
			if (options.parse.spidermonkey) {
				options.parse.toplevel = AST_Node.from_mozilla_ast(
					Object.keys(files).reduce(
						(/** @type {EXPECTED_ANY} */ merged, name) => {
							if (!merged) return files[name];
							merged.body = [...merged.body, ...files[name].body];
							return merged;
						},
						null
					)
				);
			} else {
				delete options.parse.spidermonkey;
				for (const name in files) {
					if (!hasOwn(files, name)) continue;
					options.parse.filename = name;
					options.parse.toplevel = parseModule.parse(
						files[name],
						options.parse
					);
					if (options.sourceMap && options.sourceMap.content === "inline") {
						if (Object.keys(files).length > 1) {
							throw new Error(
								"inline source map only works with singular input"
							);
						}
						options.sourceMap.content = readSourceMap(files[name]);
					}
				}
			}
			if (options.parse.toplevel === null) {
				throw new Error("no source file given");
			}
			toplevel = options.parse.toplevel;
		}
		if (
			quotedProperties &&
			options.mangle.properties.keep_quoted !== "strict"
		) {
			reserveQuotedKeys(toplevel, quotedProperties);
		}
		let annotatedProperties;
		if (options.mangle && options.mangle.properties) {
			annotatedProperties = findAnnotatedProperties(toplevel);
		}
		if (options.wrap) toplevel = toplevel.wrap_commonjs(options.wrap);
		if (options.enclose) toplevel = toplevel.wrap_enclose(options.enclose);
		if (timings) timings.rename = Date.now();

		// Compress.
		if (timings) timings.compress = Date.now();
		if (options.compress) {
			const compressor = new Compressor(options.compress, {
				mangle_options: options.mangle
			});
			assignNativeLookups(compressor, modules.nativeObjects);
			toplevel = compressor.compress(toplevel);
		}

		// Mangle.
		if (timings) timings.scope = Date.now();
		if (options.mangle) toplevel.figure_out_scope(options.mangle);
		if (timings) timings.mangle = Date.now();
		if (options.mangle) {
			toplevel.compute_char_frequency(options.mangle);
			toplevel.mangle_names(options.mangle);
			// Renaming visits every node to find none; a tree without any is as is.
			if (!withoutPrivateNames) {
				toplevel = manglePrivateProperties(toplevel, options.mangle);
			}
		}
		if (timings) timings.properties = Date.now();
		if (options.mangle && options.mangle.properties) {
			toplevel = mangleProperties(
				toplevel,
				options.mangle.properties,
				annotatedProperties
			);
		}

		// Format.
		if (timings) timings.format = Date.now();
		/** @type {EXPECTED_ANY} */
		const result = {};
		if (options.format.ast) result.ast = toplevel;
		if (options.format.spidermonkey) result.ast = toplevel.to_mozilla_ast();
		/** @type {EXPECTED_ANY} */
		let formatOptions;
		if (!hasOwn(options.format, "code") || options.format.code) {
			formatOptions = { ...options.format };
			if (!formatOptions.ast) {
				// Drop what only analysis read, as terser does, before printing.
				formatOptions._destroy_ast = true;
				walk(toplevel, (/** @type {Node} */ node) => {
					if (node instanceof AST_Scope) {
						node.variables = undefined;
						node.enclosed = undefined;
						node.parent_scope = undefined;
					}
					if (node.block_scope) {
						node.block_scope.variables = undefined;
						node.block_scope.enclosed = undefined;
						node.block_scope.parent_scope = undefined;
					}
				});
			}
			if (options.sourceMap) {
				if (options.sourceMap.includeSources && files instanceof AST_Toplevel) {
					throw new Error("original source content unavailable");
				}
				formatOptions.source_map = yield* SourceMap({
					file: options.sourceMap.filename,
					orig: options.sourceMap.content,
					root: options.sourceMap.root,
					files: options.sourceMap.includeSources ? files : null
				});
			}
			delete formatOptions.ast;
			delete formatOptions.code;
			delete formatOptions.spidermonkey;
			const stream = output.OutputStream(formatOptions);
			toplevel.print(stream);
			result.code = stream.get();
			if (options.sourceMap) {
				const { sourceMap } = options;
				Object.defineProperty(result, "map", {
					configurable: true,
					enumerable: true,
					get() {
						const map = formatOptions.source_map.getEncoded();
						return (result.map = sourceMap.asObject
							? map
							: JSON.stringify(map));
					},
					set(value) {
						Object.defineProperty(result, "map", { value, writable: true });
					}
				});
				result.decoded_map = formatOptions.source_map.getDecoded();
				if (sourceMap.url === "inline") {
					const map =
						typeof result.map === "object"
							? JSON.stringify(result.map)
							: result.map;
					result.code += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(
						map
					).toString("base64")}`;
				} else if (sourceMap.url) {
					result.code += `\n//# sourceMappingURL=${sourceMap.url}`;
				}
			}
		}
		if (options.nameCache && options.mangle) {
			if (options.mangle.cache) {
				options.nameCache.vars = {
					props: mapToObject(options.mangle.cache.props)
				};
			}
			if (options.mangle.properties && options.mangle.properties.cache) {
				options.nameCache.props = {
					props: mapToObject(options.mangle.properties.cache.props)
				};
			}
		}
		if (formatOptions && formatOptions.source_map) {
			formatOptions.source_map.destroy();
		}
		if (timings) {
			timings.end = Date.now();
			result.timings = {
				parse: 1e-3 * (timings.rename - timings.parse),
				rename: 1e-3 * (timings.compress - timings.rename),
				compress: 1e-3 * (timings.scope - timings.compress),
				scope: 1e-3 * (timings.mangle - timings.scope),
				mangle: 1e-3 * (timings.properties - timings.mangle),
				properties: 1e-3 * (timings.format - timings.properties),
				format: 1e-3 * (timings.end - timings.format),
				total: 1e-3 * (timings.end - timings.start)
			};
		}
		return result;
	}

	/**
	 * @param {EXPECTED_ANY} files the sources, or a tree
	 * @param {EXPECTED_ANY} options the options
	 * @param {EXPECTED_ANY=} fsModule where terser's debug log is written
	 * @returns {Promise<EXPECTED_ANY>} the result
	 */
	modules.minify = async (files, options, fsModule) => {
		// terser's debug log is left to terser, which writes it before parsing.
		if (fsModule) return original(files, options, fsModule);
		const driver = minifySyncOrAsync(files, options);
		let yielded;
		let step;
		do {
			step = driver.next(await yielded);
			yielded = step.value;
		} while (!step.done);
		return step.value;
	};
};

/** @typedef {EXPECTED_ANY} EstreeNode a node webpack's parser produced */

/**
 * What the tree is built from, as terser's own `parse` options name it.
 * @typedef {object} TreeOptions
 * @property {boolean=} module whether the source is a module
 * @property {boolean=} bare_returns whether `return` may sit at the top level
 * @property {string | null=} filename the name tokens carry
 * @property {boolean=} shebang whether a leading `#!` line is a comment
 */

// The words terser's tokenizer reads as keywords and atoms rather than names.
const KEYWORDS = new Set(
	"break case catch class const continue debugger default delete do else export extends finally for function if in instanceof let new return switch throw try typeof var void while with".split(
		" "
	)
);
const ATOMS = new Set(["false", "null", "true"]);
const WORD_OPERATORS = new Set([
	"in",
	"instanceof",
	"typeof",
	"new",
	"void",
	"delete"
]);
const PUNCTUATION = new Set(["[", "]", "{", "}", "(", ")", ",", ";", ":"]);

const PURE = 0b00000001;
const INLINE = 0b00000010;
const NOINLINE = 0b00000100;
const KEY = 0b00001000;
const MANGLE_PROP = 0b00010000;

// Kinds a lexical token is recorded as, before it becomes one of terser's.
const WORD = 1;
const PRIVATE_NAME = 2;
const STRING = 3;
const OTHER = 4;
const REGEXP = 5;

// Thrown where terser reads a source differently from the specification, so
// the source is left to terser's own parser.
const DECLINE = new Error("terser reads this source its own way");

// A line continuation terser keeps the break of: its tokenizer drops one only
// before \n, so a lone \r and the separators stay in the value.
const KEPT_LINE_CONTINUATION = /\\(?:\r(?!\n)|[\u2028\u2029])/;

// In a template terser keeps an escaped \r\n in the raw text it prints from,
// where the parser normalizes it, so no escaped carriage return is read there.
const KEPT_TEMPLATE_CONTINUATION = /\\(?:\r|[\u2028\u2029])/;

// A backslash before a character outside ASCII, which terser drops in a pattern.
const ESCAPED_NON_ASCII = /\\[^\0-\u007F]/;

/**
 * A pattern as terser's tokenizer keeps it: it drops the backslash before any
 * character outside ASCII, which escaping adds no regular expression syntax to.
 * @param {string} pattern the pattern as written
 * @returns {string} the source terser's `AST_RegExp` holds
 */
const terserRegExpSource = (pattern) => {
	if (!ESCAPED_NON_ASCII.test(pattern)) return pattern;
	let source = "";
	let escaped = false;
	for (let i = 0; i < pattern.length; i++) {
		const character = pattern[i];
		if (escaped) {
			source += character.charCodeAt(0) < 0x80 ? `\\${character}` : character;
			escaped = false;
		} else if (character === "\\") {
			escaped = true;
		} else {
			source += character;
		}
	}
	return source;
};

// What terser's tokenizer lets a regular expression follow, per token type.
const KEYWORDS_BEFORE_EXPRESSION = new Set([
	"return",
	"new",
	"delete",
	"throw",
	"else",
	"case",
	"yield",
	"await"
]);
const PUNCTUATION_BEFORE_EXPRESSION = new Set(["[", "{", "(", ",", ";", ":"]);
const NO_EXPRESSION_AFTER = new Set([
	"]",
	"}",
	")",
	".",
	"?.",
	"...",
	"`",
	"++",
	"--"
]);

/**
 * @param {number} code a character code
 * @returns {boolean} whether terser's tokenizer reads it as a line break
 */
const isLineBreak = (code) =>
	code === 10 || code === 13 || code === 0x2028 || code === 0x2029;

// The trees the conversion built from a source naming no `#private` member,
// which the `minify` phase need not walk for one to mangle.
/** @type {WeakSet<Node>} */
const WITHOUT_PRIVATE_NAMES = new WeakSet();

/**
 * Builds terser's tree from webpack's parser, the way terser's own `parse`
 * would: the same nodes, the same tokens where terser reads one, and comments
 * attached where terser attaches them.
 * @param {TerserModules} modules terser's modules
 * @returns {(source: string, options: TreeOptions) => Node | undefined} the tree, or undefined where webpack's parser refuses the source
 */
const createTerserTree = ({ ast, parse }) => {
	// Required here, so printing without the `parse` phase never loads the parser.
	const { parse: parseSource } = require("./syntax-parser");

	const A = /** @type {Record<string, EXPECTED_ANY>} */ (ast);
	const { ALL_RESERVED_WORDS } = parse;
	// The comments of every gap no parenthesis borders, which nothing mutates.
	/** @type {Token[]} */
	const EMPTY = [];
	// Oversized buffers can share empty views: growth replaces them before writes.
	const EMPTY_I32 = new Int32Array(0);
	const EMPTY_I8 = new Int8Array(0);
	// Kept across calls, as a worker minifies one asset after another: every
	// read is at an offset this source set, so what an earlier one left is inert.
	// By offset, how many tokens start at or before it.
	let tokensThroughBuffer = EMPTY_I32;
	// Each token's offsets and kind grow with the token count, not source size:
	// comments and long identifiers or strings need no extra token slots.
	let startBuffer = EMPTY_I32;
	let endBuffer = EMPTY_I32;
	let kindBuffer = EMPTY_I8;

	return (source, options) => {
		const module = Boolean(options.module);
		const file = options.filename === undefined ? null : options.filename;

		/** @type {EXPECTED_ANY[]} */
		const values = [];
		let count = 0;
		/** @type {{ block: boolean, text: string, start: number, end: number }[]} */
		const rawComments = [];

		let previousWasDot = false;
		let inTemplateText = false;
		let sawPrivateName = false;
		/** @type {boolean[]} */
		const braces = [];
		if (tokensThroughBuffer.length <= source.length) {
			tokensThroughBuffer = new Int32Array(source.length + 1);
		}
		let starts = startBuffer;
		let ends = endBuffer;
		let kinds = kindBuffer;
		const tokensThrough = tokensThroughBuffer;
		/**
		 * @param {number} offset where a token starts
		 * @returns {number} that token's index, plus one
		 */
		const byStart = (offset) => tokensThrough[offset];
		/**
		 * @param {number} offset where a token ends
		 * @returns {number} that token's index, plus one
		 */
		const byEnd = (offset) => tokensThrough[offset - 1];
		// Keep this call's indices alive through conversion, but do not cache a
		// large source's buffers, even if parsing or conversion declines it.
		if (source.length > 1 << 23) {
			tokensThroughBuffer = EMPTY_I32;
			startBuffer = EMPTY_I32;
			endBuffer = EMPTY_I32;
			kindBuffer = EMPTY_I8;
		}
		/**
		 * @returns {void} grow the token tables without retaining oversized inputs
		 */
		const growTokens = () => {
			const capacity = Math.min(
				source.length + 1,
				Math.max(4096, starts.length * 2)
			);
			const nextStarts = new Int32Array(capacity);
			const nextEnds = new Int32Array(capacity);
			const nextKinds = new Int8Array(capacity);
			nextStarts.set(starts);
			nextEnds.set(ends);
			nextKinds.set(kinds);
			starts = nextStarts;
			ends = nextEnds;
			kinds = nextKinds;
			if (source.length <= 1 << 23) {
				startBuffer = starts;
				endBuffer = ends;
				kindBuffer = kinds;
			}
		};
		// Whitespace to the spec that terser's tokenizer refuses.
		if (source.includes("\u1680")) return undefined;
		/** @type {EstreeNode} */
		let program;
		try {
			program = parseSource(source, {
				ecmaVersion: "latest",
				sourceType: module ? "module" : "script",
				allowHashBang: true,
				allowReturnOutsideFunction: Boolean(options.bare_returns),
				preserveParens: true,
				onComment: (block, text, start, end) => {
					if (
						!block &&
						(source.startsWith("<!--", start) ||
							source.startsWith("-->", start))
					) {
						throw DECLINE;
					}
					rawComments.push({ block, text, start, end });
				},
				onToken: (token) => {
					const { type } = token;
					const { label } = type;
					if (label === "eof") return;
					// terser reads a template's text from its opening backtick, or the
					// `}` closing a substitution, through the next `${` or backtick.
					if (inTemplateText) {
						ends[count - 1] = token.end;
						// terser's template token carries the text it holds.
						if (label === "template" || label === "invalidTemplate") {
							values[count - 1] = token.value;
						}
						if (label === "${") {
							braces.push(true);
							inTemplateText = false;
						} else if (label === "`") {
							inTemplateText = false;
						}
						return;
					}
					// What terser reads as an HTML comment, whatever this parser made of
					// it. Template text returned above: read as text, it holds no
					// comment, and only its token can start where one would.
					const first = source.charCodeAt(token.start);
					if (
						(first === 60 && source.startsWith("<!--", token.start)) ||
						(first === 45 && source.startsWith("-->", token.start))
					) {
						throw DECLINE;
					}
					if (label === "`") {
						inTemplateText = true;
					} else if (label === "{" || label === "${") {
						braces.push(label === "${");
					} else if (label === "}" && braces.pop() === true) {
						inTemplateText = true;
					}
					let kind = OTHER;
					let { value } = token;
					if (type.keyword !== undefined || label === "name") {
						kind = WORD;
						if (value === undefined) value = type.keyword;
						// terser refuses a keyword spelled with escapes, even as a name.
						if (
							token.end - token.start !== value.length &&
							ALL_RESERVED_WORDS.has(value)
						) {
							throw DECLINE;
						}
					} else if (label === "privateId") {
						kind = PRIVATE_NAME;
						sawPrivateName = true;
					} else if (label === "string") {
						kind = STRING;
					} else if (label === "regexp") {
						kind = REGEXP;
						// terser reads the `/` after `await` as division.
						if (
							count !== 0 &&
							kinds[count - 1] === WORD &&
							values[count - 1] === "await"
						) {
							throw DECLINE;
						}
					} else if (value === undefined) {
						value = label;
					}
					// A word after a dot is a property name to terser, even a keyword.
					if (kind === WORD && previousWasDot) kind = -WORD;
					previousWasDot = label === "." || label === "?.";
					if (count === starts.length) growTokens();
					starts[count] = token.start;
					ends[count] = token.end;
					kinds[count] = kind;
					values.push(value);
					count++;
				}
			});
		} catch (_err) {
			return undefined;
		}

		// Tokens up to and including each offset: offsets before the first token
		// read 0, and a token's own range reads its index plus one.
		tokensThrough.fill(0, 0, count === 0 ? source.length + 1 : starts[0]);
		for (let i = 0; i < count; i++) {
			tokensThrough.fill(
				i + 1,
				starts[i],
				i + 1 < count ? starts[i + 1] : source.length + 1
			);
		}

		const lineStarts = [0];
		for (let i = 0; i < source.length; i++) {
			const code = source.charCodeAt(i);
			if (code === 13) {
				if (source.charCodeAt(i + 1) === 10) i++;
				lineStarts.push(i + 1);
			} else if (code === 10 || code === 0x2028 || code === 0x2029) {
				lineStarts.push(i + 1);
			}
		}
		let lastLine = 0;
		/**
		 * @param {number} offset an offset into the source
		 * @returns {number} the line it is on, from 0
		 */
		const lineOf = (offset) => {
			let line = lastLine;
			if (lineStarts[line] <= offset) {
				for (let step = 0; step < 4; step++) {
					if (line + 1 >= lineStarts.length || lineStarts[line + 1] > offset) {
						lastLine = line;
						return line;
					}
					line++;
				}
			}
			let low = 0;
			let high = lineStarts.length - 1;
			while (low < high) {
				const middle = (low + high + 1) >> 1;
				if (lineStarts[middle] <= offset) low = middle;
				else high = middle - 1;
			}
			lastLine = low;
			return low;
		};

		// The comments in each gap, gap `i` being the one before token `i`.
		// Sized up front: filled out of order, it would otherwise go sparse.
		/** @type {(Token[] | undefined)[]} */
		// eslint-disable-next-line unicorn/no-new-array
		const gaps = new Array(count + 1);
		/** @type {Uint8Array} */
		const gapBreaks = new Uint8Array(count + 1);
		// Where the last comment of a gap ends, read before anything moves them.
		/** @type {Int32Array} */
		const gapEnds = new Int32Array(count + 1).fill(-1);
		if (rawComments.length !== 0) {
			let tokenIndex = 0;
			let previousEnd = 0;
			let breakPending = false;
			let lastGap = -1;
			for (const comment of rawComments) {
				while (tokenIndex < count && starts[tokenIndex] < comment.start) {
					previousEnd = ends[tokenIndex];
					tokenIndex++;
					breakPending = false;
				}
				if (lastGap !== tokenIndex) {
					lastGap = tokenIndex;
					gaps[tokenIndex] = [];
				}
				const list = /** @type {Token[]} */ (gaps[tokenIndex]);
				const between = list.length === 0 ? previousEnd : gapEnds[tokenIndex];
				let nlb = breakPending;
				for (let i = between; i < comment.start && !nlb; i++) {
					if (isLineBreak(source.charCodeAt(i))) nlb = true;
				}
				const line = lineOf(comment.start);
				let type;
				let value;
				if (comment.start === 0 && source.startsWith("#!")) {
					type = "comment5";
					value = comment.text;
					nlb = false;
				} else if (comment.block) {
					type = "comment2";
					value = comment.text.replace(/\r\n|\r|\u2028|\u2029/g, "\n");
					// terser steps through the comment before it records it, so a
					// break inside counts as one before it too.
					if (value.includes("\n")) nlb = true;
				} else {
					type = "comment1";
					value = comment.text;
				}
				const token = new A.AST_Token(
					type,
					value,
					line + 1,
					comment.start - lineStarts[line],
					comment.start,
					nlb,
					[],
					[],
					file
				);
				list.push(token);
				gapEnds[tokenIndex] = comment.end;
				breakPending = type === "comment2" && value.includes("\n");
				gapBreaks[tokenIndex] = breakPending ? 1 : 0;
			}
		}

		/**
		 * The comments of one gap, which the tokens on both sides of it share as
		 * terser's do: a parenthesized expression moves comments by mutating it.
		 * @param {number} index a gap index
		 * @returns {Token[]} its comments
		 */
		const gapAt = (index) => {
			const list = gaps[index];
			if (list !== undefined) return list;
			// A parenthesis moves the comments of the gap on its other side into
			// this one, which needs a list of its own to hold them and to share
			// with the token the parenthesis took them from.
			if (
				(isParenthesis(index - 1) && gaps[index - 1] !== undefined) ||
				(isParenthesis(index) && gaps[index + 1] !== undefined)
			) {
				return (gaps[index] = []);
			}
			return EMPTY;
		};
		/**
		 * @param {number} index a token index
		 * @returns {boolean} whether it is `(` or `)`
		 */
		const isParenthesis = (index) =>
			kinds[index] === OTHER &&
			(values[index] === "(" || values[index] === ")");
		/**
		 * Gives a gap its own comments where a parenthesis will add to them,
		 * and points the tokens already made on either side of it there.
		 * @param {number} index a gap index
		 * @returns {void}
		 */
		const ownGap = (index) => {
			if (gaps[index] !== undefined) return;
			/** @type {Token[]} */
			const list = [];
			gaps[index] = list;
			const before = tokens[index - 1];
			if (before !== undefined && before.comments_after === EMPTY) {
				before.comments_after = list;
			}
			const after = tokens[index];
			if (after !== undefined && after.comments_before === EMPTY) {
				after.comments_before = list;
			}
		};

		/**
		 * @param {number} index a token index
		 * @returns {boolean} whether terser's tokenizer reads a `/` after it as a pattern
		 */
		const allowsRegexp = (index) => {
			if (index < 0) return false;
			const kind = kinds[index];
			const value = values[index];
			if (kind === WORD) {
				if (ATOMS.has(value) || !KEYWORDS.has(value)) return false;
				return (
					WORD_OPERATORS.has(value) || KEYWORDS_BEFORE_EXPRESSION.has(value)
				);
			}
			if (kind !== OTHER) return false;
			if (typeof value !== "string") return false;
			if (PUNCTUATION_BEFORE_EXPRESSION.has(value)) return true;
			return !NO_EXPRESSION_AFTER.has(value) && !PUNCTUATION.has(value);
		};

		/** @type {Token[]} */
		// eslint-disable-next-line unicorn/no-new-array
		const tokens = new Array(count + 1);
		/**
		 * @param {number} index a token index
		 * @returns {Token} terser's token for it
		 */
		const tokenAt = (index) => {
			let token = tokens[index];
			if (token !== undefined) return token;
			const start = index < count ? starts[index] : source.length;
			let nlb = false;
			let from = index === 0 ? 0 : ends[index - 1];
			const commentsEnd = gapEnds[index];
			if (commentsEnd !== -1) {
				from = commentsEnd;
				nlb = gapBreaks[index] === 1;
			}
			for (let i = from; i < start && !nlb; i++) {
				if (isLineBreak(source.charCodeAt(i))) nlb = true;
			}
			const line = lineOf(start);
			let type = "eof";
			let value;
			if (index < count) {
				const kind = kinds[index];
				value = values[index];
				if (kind === WORD) {
					type = ATOMS.has(value)
						? "atom"
						: !KEYWORDS.has(value)
							? "name"
							: WORD_OPERATORS.has(value)
								? "operator"
								: "keyword";
				} else if (kind === -WORD) {
					type = "name";
				} else if (kind === PRIVATE_NAME) {
					type = "privatename";
				} else if (kind === STRING) {
					type = "string";
				} else {
					type = PUNCTUATION.has(value) ? "punc" : "operator";
				}
			}
			token = new A.AST_Token(
				type,
				value,
				line + 1,
				start - lineStarts[line],
				start,
				nlb,
				gapAt(index),
				gapAt(index + 1),
				file
			);
			if (type === "string") token.quote = source[start];
			if (kinds[index] === REGEXP && !allowsRegexp(index - 1)) {
				// terser read a `/` here, then reads the pattern again from it: the
				// new token comes after no line break and holds no comments.
				read.set(index, token);
				token = new A.AST_Token(
					type,
					value,
					token.line,
					token.col,
					start,
					false,
					[],
					gapAt(index + 1),
					file
				);
			}
			tokens[index] = token;
			return token;
		};
		// The token terser first read where it read a pattern again, which a
		// node that took its start before the second reading keeps.
		/** @type {Map<number, Token>} */
		const read = new Map();
		/**
		 * @param {number} index a token index
		 * @returns {Token} the token a node starting there before any rereading takes
		 */
		const firstReadAt = (index) => {
			const token = tokenAt(index);
			const first = read.get(index);
			return first === undefined ? token : first;
		};
		/**
		 * @param {EstreeNode} node a node
		 * @returns {Token} the token it starts with
		 */
		const startOf = (node) => tokenAt(byStart(node.start) - 1);
		/**
		 * @param {EstreeNode} node a node
		 * @returns {Token} the token it ends with
		 */
		const endOf = (node) => tokenAt(byEnd(node.end) - 1);
		/**
		 * @param {EstreeNode} node a node
		 * @returns {Token} the token after it
		 */
		const afterOf = (node) => tokenAt(byEnd(node.end));

		// Where a parenthesized start token's own comments end, as terser keeps it.
		/** @type {WeakMap<Token, number>} */
		const outerComments = new WeakMap();
		/**
		 * @param {Node} node a node terser annotates
		 * @param {Token=} before the token whose comments are read
		 * @returns {Node} the node
		 */
		const annotate = (node, before = node.start) => {
			const comments = before.comments_before;
			const outside = outerComments.get(before);
			let i = outside !== undefined ? outside : comments.length;
			while (--i >= 0) {
				const { value } = comments[i];
				if (/[@#]__/.test(value)) {
					if (/[@#]__PURE__/.test(value)) {
						node._annotations |= PURE;
						break;
					}
					if (/[@#]__INLINE__/.test(value)) {
						node._annotations |= INLINE;
						break;
					}
					if (/[@#]__NOINLINE__/.test(value)) {
						node._annotations |= NOINLINE;
						break;
					}
					if (/[@#]__KEY__/.test(value)) {
						node._annotations |= KEY;
						break;
					}
					if (/[@#]__MANGLE_PROP__/.test(value)) {
						node._annotations |= MANGLE_PROP;
						break;
					}
				}
			}
			return node;
		};

		/** @type {Node[]} */
		const labels = [];

		/**
		 * @param {EstreeNode[]} nodes expressions
		 * @returns {Node[]} each converted
		 */
		const list = (nodes) => {
			const out = Array.from({ length: nodes.length });
			for (let i = 0; i < nodes.length; i++) out[i] = from(nodes[i]);
			return out;
		};

		/**
		 * A statement where terser's `statement` wrapper reads it, which gives
		 * the node the statement's own first and last tokens.
		 * @param {EstreeNode} node a statement
		 * @returns {Node} the statement
		 */
		const statement = (node) => {
			const converted = from(node);
			converted.start = firstReadAt(byStart(node.start) - 1);
			converted.end = endOf(node);
			return converted;
		};

		/**
		 * @param {EstreeNode[]} nodes statements
		 * @returns {Node[]} each read as `statement` reads it
		 */
		const statementList = (nodes) => {
			const out = Array.from({ length: nodes.length });
			for (let i = 0; i < nodes.length; i++) out[i] = statement(nodes[i]);
			return out;
		};

		/**
		 * @param {EstreeNode[]} body a program's or function's statements
		 * @param {boolean=} release whether to drop each statement once converted, so the two trees are never both whole
		 * @returns {Node[]} them, the directive prologue read as terser reads it
		 */
		const statements = (body, release = false) => {
			const out = [];
			let prologue = true;
			let released = 0;
			for (let i = 0; i < body.length; i++) {
				// Only the statement at hand and the one after it are read again.
				if (release) {
					while (released < i) body[released++] = undefined;
				}
				const node = body[i];
				if (
					node.type === "ExportNamedDeclaration" ||
					node.type === "ExportDefaultDeclaration" ||
					node.type === "ExportAllDeclaration"
				) {
					prologue = false;
					const converted = statement(node);
					// terser's `export` takes a `;` that follows it as its own.
					const next = body[i + 1];
					if (
						next !== undefined &&
						next.type === "EmptyStatement" &&
						byStart(next.start) - 1 === byEnd(node.end)
					) {
						converted.end = endOf(next);
						i++;
					}
					out.push(converted);
					continue;
				}
				if (prologue) {
					if (
						node.type === "ExpressionStatement" &&
						node.expression.type === "Literal" &&
						typeof node.expression.value === "string"
					) {
						// A string holding an escape ends the prologue, as terser reads it.
						if (!node.expression.raw.includes("\\")) {
							const directive = new A.AST_Directive(from(node.expression));
							directive.start = startOf(node);
							directive.end = endOf(node);
							out.push(directive);
							continue;
						}
						prologue = false;
					} else {
						prologue = false;
					}
				}
				out.push(statement(node));
			}
			return out;
		};

		/**
		 * @param {EstreeNode} node a block
		 * @returns {Node[]} its statements
		 */
		const blockBody = (node) => statementList(node.body);

		/**
		 * @param {NodeClass} Type the symbol class
		 * @param {EstreeNode} node an identifier
		 * @returns {Node} the symbol, on its one token
		 */
		const symbol = (Type, node) => {
			// terser reads `let` as a keyword, and refuses `yield` inside a generator.
			if (node.name === "let" || node.name === "yield") throw DECLINE;
			const token = startOf(node);
			return new Type({ name: node.name, start: token, end: token });
		};

		/**
		 * @param {EstreeNode} node a property's key
		 * @returns {string} the key as terser's `as_property_name` reads it
		 */
		const keyName = (node) => {
			// terser keys a BigInt by its digits as written, without the `n`.
			if (node.bigint !== undefined) {
				return node.raw.slice(0, -1).replace(/_/g, "");
			}
			const { value } = startOf(node);
			return typeof value === "string" ? value : `${value}`;
		};

		/**
		 * @param {EstreeNode} node a function
		 * @param {NodeClass} Type the function class
		 * @param {Node | null} name its name
		 * @param {Token} start the token it starts with
		 * @param {boolean=} isAccessor whether it is a getter's or setter's function
		 * @returns {Node} the function
		 */
		const lambda = (node, Type, name, start, isAccessor = false) =>
			new Type({
				start,
				// terser reads a getter's or setter's function without either flag.
				is_generator: isAccessor ? undefined : node.generator,
				async: isAccessor ? undefined : node.async,
				name,
				argnames: node.params.map((/** @type {EstreeNode} */ param) =>
					parameter(param, A.AST_SymbolFunarg)
				),
				body: statements(node.body.body),
				end: endOf(node)
			});

		/**
		 * A declared name or destructuring, as terser's `binding_element` reads
		 * one: in a parameter list, a catch clause or a declaration.
		 * @param {EstreeNode} node the pattern
		 * @param {NodeClass} Type the symbol class a name in it declares
		 * @returns {Node} the pattern
		 */
		const binding = (node, Type) => {
			if (node.type === "ArrayPattern") {
				let cursor = byStart(node.start);
				const names = [];
				const { elements } = node;
				for (let i = 0; i < elements.length; i++) {
					if (i > 0) cursor++;
					const element = elements[i];
					if (element === null) {
						const comma = tokenAt(cursor);
						names.push(new A.AST_Hole({ start: comma, end: comma }));
						continue;
					}
					if (element.type === "RestElement") {
						const expand = startOf(element);
						names.push(
							new A.AST_Expansion({
								start: expand,
								expression: binding(element.argument, Type),
								end: expand
							})
						);
					} else if (element.type === "AssignmentPattern") {
						const left = binding(element.left, Type);
						names.push(
							new A.AST_DefaultAssign({
								start: left.start,
								left,
								operator: "=",
								right: from(element.right),
								end: afterOf(element)
							})
						);
					} else {
						names.push(binding(element, Type));
					}
					cursor = byEnd(element.end);
				}
				return new A.AST_Destructuring({
					start: startOf(node),
					names,
					is_array: true,
					end: endOf(node)
				});
			}
			if (node.type === "ObjectPattern") {
				const names = [];
				for (const property of node.properties) {
					if (property.type === "RestElement") {
						const value = binding(property.argument, Type);
						names.push(
							new A.AST_Expansion({
								start: startOf(property),
								expression: value,
								end: value.end
							})
						);
						continue;
					}
					const defaulted = property.value.type === "AssignmentPattern";
					const target = defaulted ? property.value.left : property.value;
					let keyValue;
					if (property.shorthand && startOf(property.key).type === "name") {
						const value = binding(target, Type);
						keyValue = new A.AST_ObjectKeyVal({
							start: tokenAt(byStart(property.key.start) - 2),
							key: value.name,
							value,
							end: value.end
						});
					} else {
						const propertyToken = startOf(property);
						keyValue = new A.AST_ObjectKeyVal({
							start: propertyToken,
							quote: propertyToken.quote,
							key: property.computed
								? from(property.key)
								: keyName(property.key),
							value: binding(target, Type),
							end: endOf(target)
						});
					}
					if (defaulted) {
						const left = keyValue.value;
						keyValue.value = new A.AST_DefaultAssign({
							start: left.start,
							left,
							operator: "=",
							right: from(property.value.right),
							end: afterOf(property.value)
						});
					}
					names.push(keyValue);
				}
				return new A.AST_Destructuring({
					start: startOf(node),
					names,
					is_array: false,
					end: endOf(node)
				});
			}
			return symbol(Type, node);
		};

		/**
		 * A parameter, as terser's `parameter` reads one.
		 * @param {EstreeNode} node the parameter
		 * @param {NodeClass} Type the symbol class a name in it declares
		 * @returns {Node} the parameter
		 */
		const parameter = (node, Type) => {
			if (node.type === "RestElement") {
				const expand = startOf(node);
				return new A.AST_Expansion({
					start: expand,
					expression: binding(node.argument, Type),
					end: expand
				});
			}
			if (node.type === "AssignmentPattern") {
				const left = binding(node.left, Type);
				return new A.AST_DefaultAssign({
					start: left.start,
					left,
					operator: "=",
					right: from(node.right),
					end: afterOf(node)
				});
			}
			return binding(node, Type);
		};

		/**
		 * A pattern as terser's expression parser first reads it — an object,
		 * an array or an assignment — before converting it to a pattern.
		 * @param {EstreeNode} node the pattern
		 * @returns {Node} its expression form
		 */
		const cover = (node) => {
			switch (node.type) {
				case "ObjectPattern":
					return new A.AST_Object({
						start: startOf(node),
						properties: node.properties.map(
							(/** @type {EstreeNode} */ property) => {
								const start = startOf(property);
								if (property.type === "RestElement") {
									return new A.AST_Expansion({
										start,
										expression: cover(property.argument),
										end: endOf(property)
									});
								}
								const key = property.computed
									? from(property.key)
									: keyName(property.key);
								let value;
								if (property.shorthand) {
									// terser reads `let` as a keyword wherever it stands.
									if (key === "let") throw DECLINE;
									const token = startOf(property.key);
									value = new A.AST_SymbolRef({
										start: token,
										name: key,
										end: token
									});
									if (property.value.type === "AssignmentPattern") {
										value = new A.AST_Assign({
											start,
											left: value,
											operator: "=",
											right: from(property.value.right),
											logical: false,
											end: endOf(property.value)
										});
									}
								} else {
									value = cover(property.value);
								}
								return annotate(
									new A.AST_ObjectKeyVal({
										start,
										quote: start.quote,
										key,
										value,
										end: endOf(property)
									})
								);
							}
						),
						end: endOf(node)
					});
				case "ArrayPattern":
					return new A.AST_Array({
						start: startOf(node),
						elements: elements(node, (element) =>
							element.type === "RestElement"
								? new A.AST_Expansion({
										start: startOf(element),
										expression: cover(element.argument),
										end: afterOf(element)
									})
								: cover(element)
						),
						end: endOf(node)
					});
				case "AssignmentPattern":
					return new A.AST_Assign({
						start: startOf(node),
						left: cover(node.left),
						operator: "=",
						right: from(node.right),
						logical: false,
						end: endOf(node)
					});
				case "RestElement":
					return new A.AST_Expansion({
						start: startOf(node),
						expression: cover(node.argument),
						end: afterOf(node)
					});
				default:
					return from(node);
			}
		};

		/**
		 * terser's `to_destructuring`: an assignment target read as an expression,
		 * made the pattern it is.
		 * @param {Node} node the expression form
		 * @returns {Node} the pattern
		 */
		const toDestructuring = (node) => {
			if (node instanceof A.AST_Object) {
				return new A.AST_Destructuring({
					start: node.start,
					names: node.properties.map(toDestructuring),
					is_array: false,
					end: node.end
				});
			}
			if (node instanceof A.AST_Array) {
				const names = [];
				for (const element of node.elements) {
					if (element instanceof A.AST_Expansion) {
						element.expression = toDestructuring(element.expression);
					}
					names.push(toDestructuring(element));
				}
				return new A.AST_Destructuring({
					start: node.start,
					names,
					is_array: true,
					end: node.end
				});
			}
			if (node instanceof A.AST_ObjectProperty) {
				node.value = toDestructuring(node.value);
			} else if (node instanceof A.AST_Assign) {
				return new A.AST_DefaultAssign({
					start: node.start,
					left: node.left,
					operator: "=",
					right: node.right,
					end: node.end
				});
			}
			return node;
		};

		/**
		 * terser's `to_fun_args`: an arrow's parameter read as an expression,
		 * made the parameter it is.
		 * @param {Node} node the expression form
		 * @param {Node=} defaultValue a default read above it
		 * @returns {Node} the parameter
		 */
		const toFunArgs = (node, defaultValue) => {
			/**
			 * @param {Node} parameter a parameter
			 * @returns {Node} it, with the default read above it
			 */
			const withDefault = (parameter) =>
				defaultValue
					? new A.AST_DefaultAssign({
							start: parameter.start,
							left: parameter,
							operator: "=",
							right: defaultValue,
							end: defaultValue.end
						})
					: parameter;
			if (node instanceof A.AST_Object) {
				return withDefault(
					new A.AST_Destructuring({
						start: node.start,
						end: node.end,
						is_array: false,
						names: node.properties.map((/** @type {Node} */ property) =>
							toFunArgs(property)
						)
					})
				);
			}
			if (node instanceof A.AST_ObjectKeyVal) {
				node.value = toFunArgs(node.value);
				return withDefault(node);
			}
			if (node instanceof A.AST_Hole) return node;
			if (node instanceof A.AST_Destructuring) {
				node.names = node.names.map((/** @type {Node} */ name) =>
					toFunArgs(name)
				);
				return withDefault(node);
			}
			if (node instanceof A.AST_SymbolRef) {
				return withDefault(
					new A.AST_SymbolFunarg({
						name: node.name,
						start: node.start,
						end: node.end
					})
				);
			}
			if (node instanceof A.AST_Expansion) {
				node.expression = toFunArgs(node.expression);
				return withDefault(node);
			}
			if (node instanceof A.AST_Array) {
				return withDefault(
					new A.AST_Destructuring({
						start: node.start,
						end: node.end,
						is_array: true,
						names: node.elements.map((/** @type {Node} */ element) =>
							toFunArgs(element)
						)
					})
				);
			}
			if (node instanceof A.AST_Assign) {
				return withDefault(toFunArgs(node.left, node.right));
			}
			if (node instanceof A.AST_DefaultAssign) {
				node.left = toFunArgs(node.left);
				return node;
			}
			throw new Error("Invalid function parameter");
		};

		/**
		 * An assignment's or loop's target, as terser reads it.
		 * @param {EstreeNode} node the target
		 * @returns {Node} the target
		 */
		const target = (node) =>
			node.type === "ObjectPattern" || node.type === "ArrayPattern"
				? toDestructuring(cover(node))
				: from(node);

		/**
		 * The elements of a list that may hold holes, each hole on the comma that
		 * makes it, as terser's `expr_list` reads one.
		 * @param {EstreeNode} list the array or array pattern
		 * @param {(node: EstreeNode) => Node} convert converts one element
		 * @returns {Node[]} the elements
		 */
		const elements = (list, convert) => {
			const nodes = list.elements;
			const out = Array.from({ length: nodes.length });
			// The token after `[`, then after each element's comma.
			let cursor = byStart(list.start);
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				if (node === null) {
					const comma = tokenAt(cursor++);
					out[i] = new A.AST_Hole({ start: comma, end: comma });
					continue;
				}
				out[i] = convert(node);
				cursor = byEnd(node.end) + 1;
			}
			return out;
		};

		/**
		 * @param {EstreeNode} node an object or class member
		 * @param {boolean} isClass whether a class holds it
		 * @returns {Node} the member, as terser's `object_or_class_property` reads it
		 */
		const member = (node, isClass) => {
			const start = startOf(node);
			const { computed } = node;
			const isPrivate = node.key.type === "PrivateIdentifier";
			// The token terser reads the key's quote from: the key, or its `]`.
			const keyToken = computed ? afterOf(node.key) : startOf(node.key);
			if (node.type === "PropertyDefinition") {
				if (
					!computed &&
					!node.value &&
					!isPrivate &&
					(keyName(node.key) === "async" ||
						((keyName(node.key) === "get" || keyName(node.key) === "set") &&
							values[byEnd(node.end)] === "*" &&
							kinds[byEnd(node.end)] === OTHER))
				) {
					// terser reads a field named `async`, or `get` or `set` before a
					// generator, with the member after it.
					throw DECLINE;
				}
				const key = computed
					? from(node.key)
					: new (isPrivate
							? A.AST_SymbolPrivateProperty
							: A.AST_SymbolClassProperty)({
							start,
							name: isPrivate ? node.key.name : keyName(node.key),
							end: keyToken
						});
				return annotate(
					new (isPrivate ? A.AST_ClassPrivateProperty : A.AST_ClassProperty)({
						start,
						static: node.static,
						quote:
							key instanceof A.AST_SymbolClassProperty
								? keyToken.quote
								: undefined,
						key,
						value: node.value ? from(node.value) : undefined,
						end: node.value ? endOf(node.value) : keyToken
					})
				);
			}
			const key = computed
				? from(node.key)
				: new A.AST_SymbolMethod({
						start,
						name: isPrivate ? node.key.name : keyName(node.key),
						end: keyToken
					});
			const { kind } = node;
			const accessor = lambda(
				node.value,
				A.AST_Accessor,
				null,
				startOf(node.value),
				kind === "get" || kind === "set"
			);
			const isStatic = isClass ? node.static : false;
			const quote =
				key instanceof A.AST_SymbolMethod ? keyToken.quote : undefined;
			if (kind === "get" || kind === "set") {
				if (isPrivate) {
					return annotate(
						new (kind === "get" ? A.AST_PrivateGetter : A.AST_PrivateSetter)({
							start,
							static: isStatic,
							key,
							value: accessor,
							end: endOf(node)
						})
					);
				}
				return annotate(
					new (kind === "get" ? A.AST_ObjectGetter : A.AST_ObjectSetter)({
						start,
						static: isStatic,
						key,
						quote,
						value: accessor,
						end: endOf(node)
					})
				);
			}
			return annotate(
				new (isPrivate ? A.AST_PrivateMethod : A.AST_ConciseMethod)({
					start,
					static: isStatic,
					key,
					quote,
					value: accessor,
					end: endOf(node)
				})
			);
		};

		/**
		 * @param {EstreeNode} node a declaration
		 * @returns {Node} the declaration, on the tokens terser gives it before `statement` does
		 */
		const declaration = (node) => {
			let Declaration = A.AST_Var;
			let Definition = A.AST_VarDef;
			let Symbol = A.AST_SymbolVar;
			let isAwait = false;
			if (node.kind === "const") {
				Declaration = A.AST_Const;
				Symbol = A.AST_SymbolConst;
			} else if (node.kind === "let") {
				Declaration = A.AST_Let;
				Symbol = A.AST_SymbolLet;
			} else if (node.kind === "using" || node.kind === "await using") {
				Declaration = A.AST_Using;
				Definition = A.AST_UsingDef;
				Symbol = A.AST_SymbolUsing;
				isAwait = node.kind === "await using";
			}
			const { declarations } = node;
			return new Declaration({
				start: startOf(node),
				definitions: declarations.map(
					(/** @type {EstreeNode} */ declarator) =>
						new Definition({
							start: startOf(declarator),
							name: binding(declarator.id, Symbol),
							value: declarator.init ? from(declarator.init) : null,
							end: endOf(declarator)
						})
				),
				await: isAwait,
				end: endOf(declarations[declarations.length - 1])
			});
		};

		/**
		 * @param {EstreeNode[]} nodes call arguments
		 * @param {boolean} spreadEndsAfter whether a spread ends past its operand, as `new` reads one
		 * @returns {Node[]} the arguments
		 */
		const callArguments = (nodes, spreadEndsAfter) => {
			const out = Array.from({ length: nodes.length });
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				out[i] =
					node.type === "SpreadElement"
						? new A.AST_Expansion({
								start: startOf(node),
								expression: from(node.argument),
								end: spreadEndsAfter ? afterOf(node) : endOf(node)
							})
						: from(node);
			}
			return out;
		};

		/**
		 * @param {EstreeNode} node a node that may continue a chain
		 * @returns {boolean} whether it is one
		 */
		const isChainLink = (node) =>
			node.type === "MemberExpression" ||
			node.type === "CallExpression" ||
			node.type === "TaggedTemplateExpression";

		/**
		 * The nodes of a subscript chain, and which of them terser annotates:
		 * every call, and the chain as a whole where it holds a member step.
		 * @param {EstreeNode} node the outermost link of a chain
		 * @returns {Node} the chain
		 */
		const chain = (node) => {
			/** @type {EstreeNode[]} */
			const links = [];
			let base = node;
			while (isChainLink(base)) {
				links.push(base);
				base =
					base.type === "TaggedTemplateExpression"
						? base.tag
						: base.type === "CallExpression"
							? base.callee
							: base.object;
			}
			let current = from(base);
			const { start } = current;
			let memberSteps = 0;
			let first = links.length - 1;
			const innermost = links[first];
			if (
				base.type === "Identifier" &&
				base.name === "async" &&
				current.start.value === "async" &&
				innermost.type === "CallExpression" &&
				!innermost.optional
			) {
				// terser reads `async(...)` as an arrow's parameters that turned out
				// not to be, which leaves the call without `optional`.
				const call = new A.AST_Call({
					expression: current,
					args: callArguments(innermost.arguments, true)
				});
				call.start = start;
				call.end = endOf(innermost);
				current = annotate(call);
				first--;
			}
			for (let i = first; i >= 0; i--) {
				const link = links[i];
				if (link.type === "MemberExpression") {
					memberSteps++;
					const { property } = link;
					if (property.type === "PrivateIdentifier") {
						current = new A.AST_DotHash({
							start,
							expression: current,
							optional: link.optional,
							property: property.name,
							end: endOf(link)
						});
					} else if (link.computed) {
						current = new A.AST_Sub({
							start,
							expression: current,
							optional: link.optional,
							property: from(property),
							end: endOf(link)
						});
					} else {
						current = new A.AST_Dot({
							start,
							expression: current,
							optional: link.optional,
							property: property.name,
							end: endOf(link)
						});
					}
				} else if (link.type === "CallExpression") {
					current = annotate(
						new A.AST_Call({
							start,
							expression: current,
							optional: link.optional,
							args: callArguments(link.arguments, false),
							end: endOf(link)
						})
					);
				} else {
					current = new A.AST_PrefixedTemplateString({
						start,
						prefix: current,
						template_string: from(link.quasi),
						end: endOf(link)
					});
				}
			}
			if (memberSteps !== 0) annotate(current);
			return current;
		};

		/**
		 * @param {EstreeNode} node a parenthesized expression
		 * @returns {Node} what it holds, with the parentheses' tokens
		 */
		const parenthesized = (node) => {
			const open = startOf(node);
			const close = endOf(node);
			const inner = node.expression;
			// A sequence is read with `)` already taken, so its `peek()` end is the
			// second token past it.
			let ex;
			if (inner.type === "SequenceExpression") {
				// Its comments are what the `)`'s join, so they must be its own.
				const endIndex = Math.min(byEnd(node.end) + 1, count);
				ownGap(endIndex + 1);
				ex = new A.AST_Sequence({
					start: open,
					expressions: list(inner.expressions),
					end: tokenAt(endIndex)
				});
			} else {
				ex = from(inner);
			}
			if (ex.start) {
				const outside = open.comments_before.length;
				outerComments.set(open, outside);
				const comments = ex.start.comments_before;
				comments.unshift(...open.comments_before);
				open.comments_before = comments;
				if (outside === 0 && comments.length > 0) {
					const comment = comments[0];
					if (!comment.nlb) {
						comment.nlb = open.nlb;
						open.nlb = false;
					}
				}
				open.comments_after = ex.start.comments_after;
			}
			ex.start = open;
			if (ex.end) {
				close.comments_before = ex.end.comments_before;
				const after = ex.end.comments_after;
				after.push(...close.comments_after);
				close.comments_after = after;
			}
			ex.end = close;
			if (ex instanceof A.AST_Call) annotate(ex);
			return ex;
		};

		/**
		 * @param {EstreeNode} node an import or export's source
		 * @returns {Node} the string terser keeps, which it does not annotate
		 */
		const moduleName = (node) => {
			const token = startOf(node);
			return new A.AST_String({
				start: token,
				value: token.value,
				quote: token.quote,
				end: token
			});
		};

		/**
		 * The `with { ... }` an import or export ends with, as the object terser
		 * reads it as.
		 * @param {EstreeNode} node the import or export
		 * @returns {Node | null} the attributes
		 */
		const importAttributes = (node) => {
			const after = byEnd(node.source.end);
			if (
				after >= count ||
				after >= byEnd(node.end) ||
				(values[after] !== "with" && values[after] !== "assert")
			) {
				return null;
			}
			// terser reads `with` after a line break as the next statement.
			for (let i = ends[after - 1]; i < starts[after]; i++) {
				if (isLineBreak(source.charCodeAt(i))) throw DECLINE;
			}
			const open = tokenAt(after + 1);
			const { attributes } = node;
			let closeIndex = byEnd(node.end) - 1;
			if (values[closeIndex] === ";") closeIndex--;
			return new A.AST_Object({
				start: open,
				properties: attributes.map((/** @type {EstreeNode} */ attribute) => {
					const start = startOf(attribute);
					return annotate(
						new A.AST_ObjectKeyVal({
							start,
							quote: start.quote,
							key: keyName(attribute.key),
							value: from(attribute.value),
							end: endOf(attribute)
						})
					);
				}),
				end: tokenAt(closeIndex)
			});
		};

		/**
		 * terser's `map_name`: one `{ ... }` entry of an import or export.
		 * @param {EstreeNode} node the specifier
		 * @param {boolean} isImport whether an import holds it
		 * @returns {Node} the mapping
		 */
		const mapName = (node, isImport) => {
			const outer = isImport ? node.imported : node.local;
			const inner = isImport ? node.local : node.exported;
			const start = startOf(outer);
			/**
			 * @param {NodeClass} Type the symbol class
			 * @param {Token} token the token it names
			 * @param {string=} quote the quote it keeps
			 * @returns {Node} the symbol
			 */
			const make = (Type, token, quote) =>
				new Type({
					name:
						typeof token.value === "string" ? token.value : `${token.value}`,
					quote: quote || undefined,
					start: token,
					end: token
				});
			const renamed = outer.start !== inner.start;
			let name;
			let foreignName;
			if (isImport) {
				foreignName = make(A.AST_SymbolImportForeign, start, start.quote);
				name = renamed
					? make(A.AST_SymbolImport, startOf(inner))
					: new A.AST_SymbolImport(foreignName);
			} else {
				name = make(A.AST_SymbolExport, start, start.quote);
				if (renamed) {
					const token = startOf(inner);
					foreignName = make(A.AST_SymbolExportForeign, token, token.quote);
				} else {
					foreignName = new A.AST_SymbolExportForeign(name);
				}
			}
			return new A.AST_NameMapping({
				start,
				foreign_name: foreignName,
				name,
				end: endOf(inner)
			});
		};

		/**
		 * terser's `map_nameAsterisk`: `* as name`, or a bare `*`.
		 * @param {boolean} isImport whether an import holds it
		 * @param {Node | undefined} named the name after `as`
		 * @param {number} lastIndex the index of the mapping's last token
		 * @returns {Node} the mapping
		 */
		const mapAsterisk = (isImport, named, lastIndex) => {
			const start = tokenAt(lastIndex + 1);
			const end = tokenAt(lastIndex);
			const name =
				(isImport && named) ||
				new (isImport ? A.AST_SymbolImport : A.AST_SymbolExport)({
					start,
					name: "*",
					end
				});
			const foreignName =
				(!isImport && named) ||
				new (isImport ? A.AST_SymbolImportForeign : A.AST_SymbolExportForeign)({
					start,
					name: "*",
					end
				});
			return new A.AST_NameMapping({
				start,
				foreign_name: foreignName,
				name,
				end
			});
		};

		/**
		 * @param {EstreeNode} node an import declaration
		 * @returns {Node} the import, on the tokens terser gives it before `statement` does
		 */
		const importDeclaration = (node) => {
			let importedName;
			/** @type {Node[] | undefined} */
			let importedNames;
			for (const specifier of node.specifiers) {
				if (specifier.type === "ImportDefaultSpecifier") {
					importedName = symbol(A.AST_SymbolImport, specifier.local);
				} else if (specifier.type === "ImportNamespaceSpecifier") {
					const local = symbol(A.AST_SymbolImport, specifier.local);
					importedNames = [mapAsterisk(true, local, byEnd(specifier.end) - 1)];
				} else {
					if (importedNames === undefined) importedNames = [];
					importedNames.push(mapName(specifier, true));
				}
			}
			// `import {} from` names a list that holds nothing.
			if (
				importedNames === undefined &&
				node.specifiers.every(
					(/** @type {EstreeNode} */ specifier) =>
						specifier.type === "ImportDefaultSpecifier"
				)
			) {
				const index = byStart(node.source.start) - 3;
				if (index >= 0 && values[index] === "}") importedNames = [];
			}
			const attributes = importAttributes(node);
			return new A.AST_Import({
				start: startOf(node),
				imported_name: importedName,
				imported_names: importedNames,
				module_name: moduleName(node.source),
				attributes,
				phase: node.phase || null,
				end: attributes ? tokenAt(byEnd(node.end) - 1) : afterOf(node.source)
			});
		};

		/**
		 * @param {EstreeNode} node an export declaration
		 * @returns {Node} the export, on the tokens terser gives it before `statement` does
		 */
		const exportDeclaration = (node) => {
			const start = tokenAt(byStart(node.start));
			if (node.type === "ExportAllDeclaration") {
				// terser takes only a name or a string after `export * as`.
				if (
					node.exported &&
					node.exported.type === "Identifier" &&
					ALL_RESERVED_WORDS.has(node.exported.name)
				) {
					throw DECLINE;
				}
				const named = node.exported
					? symbolOrString(A.AST_SymbolExportForeign, node.exported)
					: undefined;
				const lastIndex = byStart(node.source.start) - 3;
				return new A.AST_Export({
					start,
					is_default: undefined,
					exported_names: [mapAsterisk(false, named, lastIndex)],
					module_name: moduleName(node.source),
					end: endOfExport(node),
					attributes: importAttributes(node)
				});
			}
			if (node.type === "ExportNamedDeclaration" && !node.declaration) {
				const exportedNames = node.specifiers.map(
					(/** @type {EstreeNode} */ specifier) => mapName(specifier, false)
				);
				if (node.source) {
					return new A.AST_Export({
						start,
						is_default: undefined,
						exported_names: exportedNames,
						module_name: moduleName(node.source),
						end: endOfExport(node),
						attributes: importAttributes(node)
					});
				}
				return new A.AST_Export({
					start,
					is_default: undefined,
					exported_names: exportedNames,
					end: endOfExport(node)
				});
			}
			const { declaration } = node;
			const isDefault =
				node.type === "ExportDefaultDeclaration" ? true : undefined;
			let exportedValue;
			let exportedDefinition;
			if (
				declaration.type === "VariableDeclaration" ||
				((declaration.type === "FunctionDeclaration" ||
					declaration.type === "ClassDeclaration") &&
					declaration.id)
			) {
				exportedDefinition = statement(declaration);
			} else if (
				declaration.type === "FunctionDeclaration" ||
				declaration.type === "ClassDeclaration"
			) {
				if (!declaration.generator && !declaration.async) {
					anonymousDefaultEnds(declaration);
				}
				exportedValue = from({
					...declaration,
					type:
						declaration.type === "FunctionDeclaration"
							? "FunctionExpression"
							: "ClassExpression"
				});
				exportedValue.start = startOf(declaration);
				exportedValue.end = endOf(declaration);
			} else {
				exportedValue = from(declaration);
			}
			return new A.AST_Export({
				start,
				is_default: isDefault,
				exported_value: exportedValue,
				exported_definition: exportedDefinition,
				end: endOfExport(node),
				attributes: null
			});
		};

		/**
		 * Declines where terser's parser reads on past an anonymous default function
		 * or class as an expression (`export default function(){}(foo)` is a call to it).
		 * @param {EstreeNode} declaration the anonymous declaration
		 * @returns {void}
		 */
		const anonymousDefaultEnds = (declaration) => {
			const next = byEnd(declaration.end);
			if (next >= count) return;
			const value = values[next];
			if (value === ";" && kinds[next] === OTHER) return;
			if (kinds[next] === WORD && value !== "in" && value !== "instanceof") {
				// After a line break terser ends the expression there, as the spec does.
				for (let i = declaration.end; i < starts[next]; i++) {
					if (isLineBreak(source.charCodeAt(i))) return;
				}
			}
			throw DECLINE;
		};

		/**
		 * @param {EstreeNode} node an export
		 * @returns {Token} its last token before any `;`
		 */
		const endOfExport = (node) => {
			const last = byEnd(node.end) - 1;
			return tokenAt(
				values[last] === ";" && kinds[last] === OTHER ? last - 1 : last
			);
		};

		/**
		 * terser's `as_symbol_or_string`.
		 * @param {NodeClass} Type the symbol class
		 * @param {EstreeNode} node an identifier or string
		 * @returns {Node} the symbol
		 */
		const symbolOrString = (Type, node) => {
			const token = startOf(node);
			if (token.type === "string") {
				return new Type({
					start: token,
					end: token,
					name: token.value,
					quote: token.quote
				});
			}
			return new Type({ name: token.value, start: token, end: token });
		};

		/**
		 * Drops a converted node's links to its children, which nothing reads
		 * again: terser's tree is built bottom-up, and holding webpack's own whole
		 * behind the walk costs 83 MiB of peak on a 9 MiB asset.
		 * @param {EstreeNode} node a node whose conversion is done
		 * @returns {void}
		 */
		const release = (node) => {
			const fields = /** @type {Record<string, unknown>} */ (
				/** @type {unknown} */ (node)
			);
			for (const key in fields) {
				if (fields[key] !== null && typeof fields[key] === "object") {
					fields[key] = null;
				}
			}
		};

		/**
		 * @param {EstreeNode} node a node
		 * @returns {Node} terser's node for it
		 */
		const from = (node) => {
			const converted = convert(node);
			release(node);
			return converted;
		};

		/**
		 * @param {EstreeNode} node a node
		 * @returns {Node} terser's node for it
		 */
		const convert = (node) => {
			switch (node.type) {
				case "Identifier":
					// terser reads `let` as a keyword wherever it stands, and `await`
					// as the operator inside a class field of an async function.
					if (node.name === "await") throw DECLINE;
					return symbol(A.AST_SymbolRef, node);
				case "MemberExpression":
				case "CallExpression":
				case "TaggedTemplateExpression":
					return chain(node);
				case "Literal":
					return literal(node);
				case "ExpressionStatement":
					if (
						node.expression.type === "Identifier" &&
						node.expression.name === "async"
					) {
						// terser reads `async` and a function after a line break as one.
						throw DECLINE;
					}
					return new A.AST_SimpleStatement({ body: from(node.expression) });
				case "ParenthesizedExpression":
					return parenthesized(node);
				case "BinaryExpression":
					if (node.left.type === "PrivateIdentifier") {
						const token = startOf(node.left);
						return new A.AST_PrivateIn({
							start: startOf(node),
							key: new A.AST_SymbolPrivateProperty({
								start: token,
								name: node.left.name,
								end: token
							}),
							value: from(node.right),
							end: endOf(node)
						});
					}
				// falls through
				case "LogicalExpression": {
					let leftmost = node.left;
					while (
						leftmost.type === "BinaryExpression" ||
						leftmost.type === "LogicalExpression"
					) {
						// terser reads the operators after `#x in y` into its right side.
						if (leftmost.left.type === "PrivateIdentifier") throw DECLINE;
						leftmost = leftmost.left;
					}
					const left = from(node.left);
					const right = from(node.right);
					return new A.AST_Binary({
						start: left.start,
						left,
						operator: node.operator,
						right,
						end: right.end
					});
				}
				case "AssignmentExpression":
					return new A.AST_Assign({
						start: startOf(node),
						left: target(node.left),
						operator: node.operator,
						right: from(node.right),
						logical:
							node.operator === "??=" ||
							node.operator === "&&=" ||
							node.operator === "||=",
						end: endOf(node)
					});
				case "Program":
					return new A.AST_Toplevel({
						start: firstReadAt(0),
						body: statements(node.body, true),
						end: count === 0 ? null : tokenAt(count - 1)
					});
				case "VariableDeclaration":
					return declaration(node);
				case "BlockStatement":
					return new A.AST_BlockStatement({
						start: startOf(node),
						body: blockBody(node),
						end: endOf(node)
					});
				case "ReturnStatement":
					return new A.AST_Return({
						value: node.argument ? from(node.argument) : null
					});
				case "IfStatement":
					return new A.AST_If({
						condition: from(node.test),
						body: statement(node.consequent),
						alternative: node.alternate ? statement(node.alternate) : null
					});
				case "ConditionalExpression":
					return new A.AST_Conditional({
						start: startOf(node),
						condition: from(node.test),
						consequent: from(node.consequent),
						alternative: from(node.alternate),
						end: endOf(node)
					});
				case "UnaryExpression":
				case "UpdateExpression":
					return new (node.prefix ? A.AST_UnaryPrefix : A.AST_UnaryPostfix)({
						start: startOf(node),
						operator: node.operator,
						expression: from(node.argument),
						end: endOf(node)
					});
				case "ObjectExpression":
					return new A.AST_Object({
						start: startOf(node),
						properties: node.properties.map(
							(/** @type {EstreeNode} */ property) => {
								if (property.type === "SpreadElement") {
									return new A.AST_Expansion({
										start: startOf(property),
										expression: from(property.argument),
										end: endOf(property)
									});
								}
								if (property.kind !== "init" || property.method) {
									return member(property, false);
								}
								const start = startOf(property);
								const key = property.computed
									? from(property.key)
									: keyName(property.key);
								let value;
								if (property.shorthand) {
									// terser reads `let` as a keyword wherever it stands.
									if (key === "let") throw DECLINE;
									const token = startOf(property.key);
									value = new A.AST_SymbolRef({
										start: token,
										name: key,
										end: token
									});
								} else {
									value = from(property.value);
								}
								return annotate(
									new A.AST_ObjectKeyVal({
										start,
										quote: start.quote,
										key,
										value,
										end: endOf(property)
									})
								);
							}
						),
						end: endOf(node)
					});
				case "ArrayExpression":
					return new A.AST_Array({
						start: startOf(node),
						elements: elements(node, (element) =>
							element.type === "SpreadElement"
								? new A.AST_Expansion({
										start: startOf(element),
										expression: from(element.argument),
										end: afterOf(element)
									})
								: from(element)
						),
						end: endOf(node)
					});
				case "FunctionExpression":
					return lambda(
						node,
						A.AST_Function,
						node.id ? symbol(A.AST_SymbolLambda, node.id) : null,
						startOf(node)
					);
				case "FunctionDeclaration":
					return lambda(
						node,
						A.AST_Defun,
						node.id ? symbol(A.AST_SymbolDefun, node.id) : null,
						startOf(node)
					);
				case "ArrowFunctionExpression": {
					const { body, params } = node;
					const start = startOf(node);
					// terser reads a lone parameter as its own token, anything else
					// as the expressions it later turns into parameters.
					const startIndex = byStart(node.start) - 1;
					const firstIndex =
						params.length === 1 ? byStart(params[0].start) - 1 : -1;
					const lone =
						params.length === 1 &&
						params[0].type === "Identifier" &&
						(firstIndex === startIndex ||
							(node.async && firstIndex === startIndex + 1));
					const argnames = lone
						? [
								new A.AST_SymbolFunarg({
									name: params[0].name,
									start,
									end: start
								})
							]
						: params.map((/** @type {EstreeNode} */ param) =>
								toFunArgs(
									param.type === "RestElement"
										? new A.AST_Expansion({
												start: startOf(param),
												expression: cover(param.argument),
												end: afterOf(param)
											})
										: cover(param)
								)
							);
					return new A.AST_Arrow({
						start,
						end: undefined,
						async: node.async,
						argnames,
						body:
							body.type === "BlockStatement"
								? statements(body.body)
								: [
										new A.AST_Return({
											start: startOf(body),
											value: from(body),
											end: afterOf(body)
										})
									]
					});
				}
				case "ThisExpression":
					return new A.AST_This({
						start: startOf(node),
						name: "this",
						end: endOf(node)
					});
				case "NewExpression":
					return annotate(
						new A.AST_New({
							start: startOf(node),
							expression: from(node.callee),
							args: callArguments(node.arguments, true),
							end: endOf(node)
						})
					);
				case "SequenceExpression":
					// terser ends a sequence at `peek()`, a token past the one after it.
					return new A.AST_Sequence({
						start: firstReadAt(byStart(node.start) - 1),
						expressions: list(node.expressions),
						end: tokenAt(Math.min(byEnd(node.end) + 1, count))
					});
				case "SpreadElement":
					return new A.AST_Expansion({
						start: startOf(node),
						expression: from(node.argument),
						end: endOf(node)
					});
				case "ThrowStatement":
					return new A.AST_Throw({ value: from(node.argument) });
				case "ForStatement":
					return new A.AST_For({
						init: node.init ? from(node.init) : null,
						condition: node.test ? from(node.test) : null,
						step: node.update ? from(node.update) : null,
						body: statement(node.body)
					});
				case "ForInStatement":
					return new A.AST_ForIn({
						init: target(node.left),
						object: from(node.right),
						body: statement(node.body)
					});
				case "ForOfStatement": {
					const init = target(node.left);
					return new A.AST_ForOf({
						await: node.await,
						init,
						name:
							init instanceof A.AST_DefinitionsLike
								? init.definitions[0].name
								: null,
						object: from(node.right),
						body: statement(node.body)
					});
				}
				case "WhileStatement":
					// Read by `statement` itself, which calls its own unwrapped self.
					return new A.AST_While({
						condition: from(node.test),
						body: from(node.body)
					});
				case "DoWhileStatement":
					return new A.AST_Do({
						body: from(node.body),
						condition: from(node.test)
					});
				case "WithStatement":
					return new A.AST_With({
						expression: from(node.object),
						body: from(node.body)
					});
				case "EmptyStatement":
					return new A.AST_EmptyStatement();
				case "DebuggerStatement":
					return new A.AST_Debugger();
				case "BreakStatement":
				case "ContinueStatement": {
					let label = null;
					let definition;
					if (node.label) {
						label = symbol(A.AST_LabelRef, node.label);
						for (let i = labels.length - 1; i >= 0; i--) {
							if (labels[i].name === label.name) {
								definition = labels[i];
								break;
							}
						}
						label.thedef = /** @type {SymbolDefinition} */ (definition);
					}
					const jump = new (
						node.type === "BreakStatement" ? A.AST_Break : A.AST_Continue
					)({
						label
					});
					if (definition) definition.references.push(jump);
					return jump;
				}
				case "LabeledStatement": {
					const label = symbol(A.AST_Label, node.label);
					labels.push(label);
					const body = statement(node.body);
					labels.pop();
					return new A.AST_LabeledStatement({ body, label });
				}
				case "SwitchStatement":
					return new A.AST_Switch({
						expression: from(node.discriminant),
						body: node.cases.map(
							(/** @type {EstreeNode} */ branch) =>
								new (branch.test ? A.AST_Case : A.AST_Default)({
									start: startOf(branch),
									expression: branch.test ? from(branch.test) : undefined,
									body: statementList(branch.consequent),
									end: endOf(branch)
								})
						)
					});
				case "TryStatement": {
					const { block, handler, finalizer } = node;
					return new A.AST_Try({
						body: new A.AST_TryBlock({
							start: startOf(block),
							body: blockBody(block),
							end: endOf(block)
						}),
						bcatch: handler
							? new A.AST_Catch({
									start: startOf(handler),
									argname: handler.param
										? parameter(handler.param, A.AST_SymbolCatch)
										: null,
									body: blockBody(handler.body),
									end: endOf(handler)
								})
							: null,
						bfinally: finalizer
							? new A.AST_Finally({
									start: tokenAt(byStart(finalizer.start) - 2),
									body: blockBody(finalizer),
									end: endOf(finalizer)
								})
							: null
					});
				}
				case "TemplateLiteral": {
					const segments = [];
					const { quasis, expressions } = node;
					for (let i = 0; i < quasis.length; i++) {
						const quasi = quasis[i];
						if (
							quasi.value.cooked === null ||
							KEPT_TEMPLATE_CONTINUATION.test(
								source.slice(quasi.start, quasi.end)
							)
						) {
							throw DECLINE;
						}
						const token = tokenAt(byStart(quasi.start - 1) - 1);
						segments.push(
							new A.AST_TemplateSegment({
								start: token,
								raw: quasi.value.raw,
								value: quasi.value.cooked,
								end: token
							})
						);
						if (i < expressions.length) segments.push(from(expressions[i]));
					}
					// terser ends a template on the token after it.
					return new A.AST_TemplateString({
						start: startOf(node),
						segments,
						end: afterOf(node)
					});
				}
				case "ClassDeclaration":
				case "ClassExpression": {
					const isDeclaration = node.type === "ClassDeclaration";
					const { body } = node.body;
					return new (isDeclaration ? A.AST_DefClass : A.AST_ClassExpression)({
						start: startOf(node),
						name: node.id
							? symbol(
									isDeclaration ? A.AST_SymbolDefClass : A.AST_SymbolClass,
									node.id
								)
							: undefined,
						extends: node.superClass ? from(node.superClass) : undefined,
						properties: body.map((/** @type {EstreeNode} */ element) =>
							element.type === "StaticBlock"
								? new A.AST_ClassStaticBlock({
										start: tokenAt(byStart(element.start)),
										body: statementList(element.body),
										end: endOf(element)
									})
								: member(element, true)
						),
						end: endOf(node)
					});
				}
				case "AwaitExpression":
					// terser reads the end before the operand, so it is the operand's start.
					return new A.AST_Await({
						start: startOf(node),
						end: tokenAt(byStart(node.start)),
						expression: from(node.argument)
					});
				case "YieldExpression":
					// terser starts a `yield` on the token after the keyword.
					return new A.AST_Yield({
						start: firstReadAt(byStart(node.start)),
						expression: node.argument ? from(node.argument) : null,
						is_star: node.delegate,
						end: endOf(node)
					});
				case "ChainExpression":
					return new A.AST_Chain({
						start: startOf(node),
						expression: from(node.expression),
						end: endOf(node)
					});
				case "Super":
					return new A.AST_Super({
						start: startOf(node),
						name: "super",
						end: endOf(node)
					});
				case "MetaProperty":
					return new (
						node.meta.name === "new" ? A.AST_NewTarget : A.AST_ImportMeta
					)({
						start: startOf(node),
						end: endOf(node)
					});
				case "ImportExpression":
					// terser refuses a trailing comma in `import()`.
					if (
						values[byEnd(node.end) - 2] === "," &&
						kinds[byEnd(node.end) - 2] === OTHER
					) {
						throw DECLINE;
					}
					return new A.AST_DynamicImport({
						start: startOf(node),
						args: node.options
							? [from(node.source), from(node.options)]
							: [from(node.source)],
						phase: node.phase || null,
						end: endOf(node)
					});
				case "PrivateIdentifier":
					return new A.AST_SymbolPrivateProperty({
						start: startOf(node),
						name: node.name,
						end: endOf(node)
					});
				case "ImportDeclaration":
					return importDeclaration(node);
				case "ExportNamedDeclaration":
				case "ExportDefaultDeclaration":
				case "ExportAllDeclaration":
					return exportDeclaration(node);
				default:
					throw new Error(`Unsupported node ${node.type}`);
			}
		};

		/**
		 * @param {EstreeNode} node a literal
		 * @returns {Node} terser's constant for it
		 */
		const literal = (node) => {
			const start = startOf(node);
			const end = endOf(node);
			const { value } = node;
			if (node.regex) {
				return new A.AST_RegExp({
					start,
					value: {
						source: terserRegExpSource(node.regex.pattern),
						flags: node.regex.flags
					},
					end
				});
			}
			if (node.bigint !== undefined) {
				return new A.AST_BigInt({
					start,
					value: node.raw.slice(0, -1).replace(/_/g, ""),
					raw: node.raw,
					end
				});
			}
			switch (typeof value) {
				case "string":
					if (KEPT_LINE_CONTINUATION.test(node.raw)) throw DECLINE;
					return annotate(
						new A.AST_String({ start, value, quote: start.quote, end })
					);
				case "number":
					// A legacy octal or `0`-led decimal, which terser tokenizes its own way.
					if (/^0[\d_]/.test(node.raw)) throw DECLINE;
					if (value === Infinity) return new A.AST_Infinity({ start, end });
					return new A.AST_Number({ start, value, raw: node.raw, end });
				case "boolean":
					return new (value ? A.AST_True : A.AST_False)({ start, end });
				default:
					return new A.AST_Null({ start, end });
			}
		};

		try {
			const toplevel = from(program);
			if (!sawPrivateName) WITHOUT_PRIVATE_NAMES.add(toplevel);
			return toplevel;
		} catch (_err) {
			return undefined;
		}
	};
};

// A module touching every shape the tree conversion reads a token for: every
// comment position, parentheses, templates, patterns, classes and a pattern
// read again after a token that does not allow one.
const PARSE_PROBE = `/*! banner */ "use strict"; // line
import def, { a as b, "c" as d } from "./x" with { type: "json" };
export * as ns from "./y";
const { e = 1, ...rest } = obj, [f, , g = /* hole */ 2] = list;
label: for (const x of y) { if (x) continue label; else break label; }
while (e) /re/.test(f);
async function* h(p = 2, { q }, ...r) { yield /s/g; await (0, i)(); return \`t\${e}u\` + (/* in */ j, k); }
class K extends (L, M) { static #p = 1; static { N(); } get [O]() { return #p in this; } async *m() {} }
export default /* @__PURE__ */ make(/*#__PURE__*/ new P(...q), [...r], { s, "t": 1, [u]: v, w() {} });
`;

// The `parse` options this reads the way terser does. Any other leaves the
// source to terser's parser.
const PARSE_OPTIONS = new Set([
	"bare_returns",
	"ecma",
	"filename",
	"html5_comments",
	"module",
	"shebang"
]);

/**
 * @param {Node} a terser's tree
 * @param {Node} b webpack's tree
 * @returns {boolean} whether the two carry the same nodes and tokens
 */
const sameTree = (a, b) => {
	/** @type {[Token, Token][]} */
	const tokens = [];
	/**
	 * @param {EXPECTED_ANY} x one side
	 * @param {EXPECTED_ANY} y the other
	 * @param {number} depth how deep the walk is
	 * @returns {boolean} whether they agree
	 */
	const same = (x, y, depth) => {
		if (depth > 200) return true;
		if (x === y) return true;
		if (Array.isArray(x)) {
			return (
				Array.isArray(y) &&
				x.length === y.length &&
				x.every((item, i) => same(item, y[i], depth + 1))
			);
		}
		if (!x || !y || typeof x !== "object" || typeof y !== "object") {
			return Object.is(x, y);
		}
		if (x.TYPE !== y.TYPE) return false;
		const keys = new Set([...Object.keys(x), ...Object.keys(y)]);
		for (const key of keys) {
			if (key === "thedef" || key === "references") continue;
			if (key === "start" || key === "end") {
				tokens.push([x[key], y[key]]);
				continue;
			}
			if (!same(x[key], y[key], depth + 1)) return false;
		}
		return true;
	};
	if (!same(a, b, 0)) return false;
	for (const [x, y] of tokens) {
		if (!x || !y) {
			if (Boolean(x) !== Boolean(y)) return false;
			continue;
		}
		// terser reads a token's type and value only to tell names and strings
		// apart, which is what is held to it.
		const named = (/** @type {string} */ type) =>
			type === "name" || type === "privatename" || type === "string";
		if (
			(named(x.type) || named(y.type)) &&
			(x.type !== y.type || x.value !== y.value)
		) {
			return false;
		}
		for (const key of ["quote", "nlb", "line", "col", "pos", "file"]) {
			if (!Object.is(x[key], y[key])) return false;
		}
		for (const key of ["comments_before", "comments_after"]) {
			if (
				x[key].map((/** @type {Node} */ c) => c.value).join("\n") !==
				y[key].map((/** @type {Node} */ c) => c.value).join("\n")
			) {
				return false;
			}
		}
	}
	return true;
};

/**
 * Whether webpack's parser, through the tree conversion, gives this terser
 * the tree its own parser does — held to a probe rather than to the version.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const parseFits = (modules) => {
	const { ast, parse } = modules;
	if (
		typeof parse.parse !== "function" ||
		typeof ast.AST_Token !== "function" ||
		typeof ast.AST_Node.prototype.print_to_string !== "function"
	) {
		return false;
	}
	try {
		const toTree = createTerserTree(modules);

		const options = { module: true, filename: "probe" };
		const theirs = parse.parse(PARSE_PROBE, options);
		const ours = toTree(PARSE_PROBE, options);
		return (
			ours !== undefined &&
			sameTree(theirs, ours) &&
			theirs.print_to_string({ comments: "all" }) ===
				ours.print_to_string({ comments: "all" })
		);
	} catch (_err) {
		return false;
	}
};

/**
 * Parses with webpack's parser rather than terser's: `minify` is handed the
 * tree terser's parser would have built, for the input and options a build
 * uses; anything else is parsed by terser as it always was.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installParse = (modules) => {
	const toTree = createTerserTree(modules);

	const { minify } = modules;
	/**
	 * @param {EXPECTED_ANY} files what `minify` was given
	 * @param {EXPECTED_ANY} options its options
	 * @returns {Node | undefined} the tree, where this reads the input
	 */
	const parseInput = (files, options) => {
		if (!options || typeof options !== "object") return undefined;
		let name;
		let code;
		if (typeof files === "string") {
			name = "0";
			code = files;
		} else if (files && typeof files === "object" && !Array.isArray(files)) {
			const names = Object.keys(files);
			if (names.length !== 1) return undefined;
			name = names[0];
			code = files[name];
		}
		if (typeof code !== "string" || options.spidermonkey) return undefined;
		const parseOptions = options.parse || {};
		for (const key of Object.keys(parseOptions)) {
			if (!PARSE_OPTIONS.has(key)) return undefined;
		}
		if (parseOptions.shebang === false && code.startsWith("#!")) {
			return undefined;
		}
		const format = options.format || options.output;
		if (format && format.spidermonkey) return undefined;
		const { sourceMap } = options;
		if (
			sourceMap &&
			typeof sourceMap === "object" &&
			(sourceMap.content === "inline" || sourceMap.includeSources)
		) {
			return undefined;
		}
		// terser copies `module` into `parse` only where `parse` is set and truthy.
		const given = Object.prototype.hasOwnProperty.call(options, "parse")
			? options.parse
			: {};
		const module = Boolean(
			given &&
			(typeof given === "object" && "module" in given
				? given.module
				: options.module)
		);
		try {
			return toTree(code, {
				module,
				bare_returns: parseOptions.bare_returns,
				filename: name
			});
		} catch (_err) {
			return undefined;
		}
	};
	modules.minify = (
		/** @type {EXPECTED_ANY} */ files,
		/** @type {EXPECTED_ANY} */ options,
		/** @type {EXPECTED_ANY=} */ fsModule
	) => {
		// terser's debug log records the input as given, before it is parsed.
		if (fsModule) return minify(files, options, fsModule);
		const toplevel = parseInput(files, options);
		return toplevel === undefined
			? minify(files, options)
			: minify(toplevel, options);
	};
};

// The alphabet terser names mangled identifiers from: a name opens with one of
// the first, and continues with those or a digit.
const IDENTIFIER_LEADING =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_";
const IDENTIFIER_DIGITS = "0123456789";

// What the `frequency` phase's probe feeds both counters, and how many names
// it then reads back from each: every character counted, then some uncounted.
const FREQUENCY_PROBE = [
	["function a(b){return b+c}var dd=__$$$;", 1],
	["zzzzzzzzzzZZZ999é\u{1D49C}", 1],
	["b", -1],
	["$_", 3]
];
const FREQUENCY_NAMES = 4000;

/**
 * webpack's character counter for mangled names. terser's keys a `Map` by
 * every character it is shown; this counts the ones a name can hold.
 * @param {(items: string[], compare: (a: string, b: string) => number) => string[]} mergeSort terser's stable sort
 * @returns {{ reset: () => void, consider: (str: string, delta: number) => void, sort: () => void, get: (num: number) => string }} the counter
 */
const createFrequency = (mergeSort) => {
	const leading = [...IDENTIFIER_LEADING];
	const digits = [...IDENTIFIER_DIGITS];
	const counts = new Float64Array(128);
	/** @type {string[]} */
	let chars = [];
	/**
	 * @param {string} a a character
	 * @param {string} b another
	 * @returns {number} which is counted more
	 */
	const compare = (a, b) => counts[b.charCodeAt(0)] - counts[a.charCodeAt(0)];
	const frequency = {
		reset() {
			counts.fill(0);
		},
		/**
		 * @param {string} str text a name may be read against
		 * @param {number} delta how much each character counts
		 * @returns {void}
		 */
		consider(str, delta) {
			for (let i = str.length; --i >= 0;) {
				const code = str.charCodeAt(i);
				if (code < 128) counts[code] += delta;
			}
		},
		sort() {
			chars = [...mergeSort(leading, compare), ...mergeSort(digits, compare)];
		},
		/**
		 * @param {number} num which name
		 * @returns {string} the name
		 */
		get(num) {
			let name = "";
			let base = 54;
			num++;
			do {
				num--;
				name += chars[num % base];
				num = Math.floor(num / base);
				base = 64;
			} while (num > 0);
			return name;
		}
	};
	frequency.reset();
	frequency.sort();
	return frequency;
};

/**
 * @param {{ reset: () => void, consider: (str: string, delta: number) => void, sort: () => void, get: (num: number) => string }} counter a counter
 * @returns {string} the names it hands out after the probe
 */
const probeFrequency = (counter) => {
	counter.reset();
	for (const [text, delta] of FREQUENCY_PROBE) {
		counter.consider(
			/** @type {string} */ (text),
			/** @type {number} */ (delta)
		);
	}
	counter.sort();
	let names = "";
	for (let i = 0; i < FREQUENCY_NAMES; i++) names += `${counter.get(i)} `;
	return names;
};

/**
 * Whether terser's counter names identifiers the way webpack's does, held to
 * a probe rather than to the version.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const frequencyFits = ({ scope, utils }) => {
	const { base54 } = scope;
	if (
		!base54 ||
		!["reset", "consider", "sort", "get"].every(
			(name) => typeof base54[name] === "function"
		)
	) {
		return false;
	}
	const answer = probeFrequency(base54);
	// Left as terser starts out, which is what a first minify reads.
	base54.reset();
	base54.sort();
	return answer === probeFrequency(createFrequency(mergeSort));
};

/**
 * Installs webpack's character counter into terser's `base54`, the object
 * `minify` hands the mangler, so its identity — which the `mangle` phase
 * reads — is unchanged.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installFrequency = ({ scope, utils }) => {
	Object.assign(scope.base54, createFrequency(mergeSort));
};

/**
 * terser's compressor: the methods the phases call typed, the rest open.
 * @typedef {{
 * options: Record<string, EXPECTED_ANY>,
 * stack: TerserNode[],
 * option(name: string): EXPECTED_ANY,
 * has_directive(directive: string): EXPECTED_ANY,
 * parent(level?: number): TerserNode,
 * self(): TerserNode,
 * find_parent(Type: EXPECTED_ANY): TerserNode | undefined,
 * in_boolean_context(): boolean | undefined,
 * [key: string]: EXPECTED_ANY,
 * }} TerserCompressor
 */
/** @typedef {Record<PropertyKey, EXPECTED_ANY>} TerserOutputStream terser's output stream */
/** @typedef {(this: Node, compressor: TerserCompressor) => Node} Optimize a node's `optimize` */
/** @typedef {{ enabled: boolean }} Corrections the switch the corrections read */

// The xxhash64 of each terser file holding what the corrections below amend,
// each run of whitespace read as one space: the one version they were written against.
const TERSER_SOURCES = {
	"output.js": "4d3bcaa64d1d635e",
	"compress/common.js": "b81664f0b8802401",
	"compress/index.js": "6694100e9c5ecfcb",
	"compress/inference.js": "bac5bd59706dc14a",
	"compress/inline.js": "b3b79b0d1e73d807",
	"compress/tighten-body.js": "6034b2093bceae94"
};

/**
 * The xxhash64 of each of terser's files the corrections amend.
 * @returns {Record<string, string>} each file's hash, by its path in `lib`
 */
const hashTerserSources = () => {
	const fs = require("fs");
	const path = require("path");
	const createHash = require("../util/createHash");

	const directory = path.join(
		path.dirname(require.resolve("terser/package.json")),
		"lib"
	);
	/** @type {Record<string, string>} */
	const hashes = {};
	for (const file of Object.keys(TERSER_SOURCES)) {
		hashes[file] = createHash("xxhash64")
			.update(
				fs.readFileSync(path.join(directory, file), "utf8").replace(/\s+/g, " ")
			)
			.digest("hex");
	}
	return hashes;
};

/**
 * Whether the installed terser is the one the corrections were written against.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const correctFits = (modules) => {
	if (!modules.common || !modules.ast) return false;
	try {
		const hashes = hashTerserSources();
		return Object.keys(TERSER_SOURCES).every(
			(file) =>
				hashes[file] ===
				TERSER_SOURCES[/** @type {keyof typeof TERSER_SOURCES} */ (file)]
		);
	} catch (_err) {
		return false;
	}
};

/**
 * Runs `run` with some of the compressor's options off, so the transforms they
 * gate are skipped for this node alone.
 * @template T
 * @param {TerserCompressor} compressor the compressor
 * @param {string[]} names the options
 * @param {() => T} run what to run
 * @returns {T} what it returned
 */
const withOptionsOff = (compressor, names, run) => {
	const { options } = compressor;
	const saved = names.map((name) => options[name]);
	for (const name of names) options[name] = false;
	try {
		return run();
	} finally {
		for (let i = 0; i < names.length; i++) options[names[i]] = saved[i];
	}
};

/**
 * Installs webpack's corrections to terser: each wraps the terser method
 * producing a wrong output, and changes its answer only where it was wrong.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installCorrect = (modules) => {
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (modules.ast);
	const { is_empty: isEmpty } = modules.common;
	/** @type {Corrections} */
	const corrections = { enabled: true };
	modules.corrections = corrections;

	/**
	 * @param {Node} prototype a node class's prototype
	 * @param {(original: Optimize) => Optimize} wrap builds the replacement
	 * @returns {void}
	 */
	const wrapOptimize = (prototype, wrap) => {
		const original = prototype.optimize;
		const corrected = wrap(original);
		prototype.optimize = function optimize(
			/** @type {TerserCompressor} */ compressor
		) {
			return corrections.enabled
				? corrected.call(this, compressor)
				: original.call(this, compressor);
		};
	};

	/**
	 * Whether a property is `__proto__` written as a shorthand, an own property
	 * rather than the prototype: its one token is both its start and its end.
	 * @param {Node} property an object literal's property
	 * @returns {boolean} true for `{ __proto__ }`
	 */
	const isShorthandProto = (property) =>
		property.key === "__proto__" &&
		Boolean(property.start) &&
		property.start === property.end;

	/**
	 * Whether a property sets the object's prototype: `__proto__: value`.
	 * @param {Node} property an object literal's property
	 * @returns {boolean} true for a prototype setter
	 */
	const setsPrototype = (property) =>
		property instanceof A.AST_ObjectKeyVal &&
		property.key === "__proto__" &&
		!isShorthandProto(property);

	// `{ __proto__ }` is an own property and `{ __proto__: x }` the prototype, a
	// difference terser's tree keeps only in the tokens, so print by them.
	const codegen = A.AST_ObjectKeyVal.prototype._codegen;
	A.AST_ObjectKeyVal.prototype._codegen = function _codegen(
		/** @type {Node} */ self,
		/** @type {TerserOutputStream} */ output
	) {
		if (
			!corrections.enabled ||
			self.key !== "__proto__" ||
			!(output.parent() instanceof A.AST_Object)
		) {
			return codegen.call(this, self, output);
		}
		const { value } = self;
		const definition =
			value instanceof A.AST_Symbol && typeof value.definition === "function"
				? value.definition()
				: undefined;
		const printedName =
			value instanceof A.AST_Symbol
				? definition
					? definition.mangled_name || definition.name
					: value.name
				: undefined;
		const asShorthand =
			printedName === "__proto__" && output.option("shorthand");
		if (isShorthandProto(self)) {
			if (asShorthand) {
				output.print_name("__proto__");
			} else {
				output.with_square(() => output.print_string("__proto__"));
				output.colon();
				value.print(output);
			}
			return;
		}
		if (!asShorthand) return codegen.call(this, self, output);
		output.print_name("__proto__");
		output.colon();
		value.print(output);
	};

	// Spreading `{ __proto__: p }` copies none of `p`, where writing its
	// properties into the outer literal would set that literal's prototype.
	wrapOptimize(
		A.AST_Object.prototype,
		(original) =>
			function optimize(compressor) {
				/** @type {[Node, Node][]} */
				const kept = [];
				for (const property of this.properties) {
					if (
						property instanceof A.AST_Expansion &&
						property.expression instanceof A.AST_Object &&
						property.expression.properties.some(setsPrototype)
					) {
						kept.push([property, property.expression]);
						property.expression = new A.AST_Sequence({
							start: property.expression.start,
							expressions: [property.expression],
							end: property.expression.end
						});
					}
				}
				try {
					return original.call(this, compressor);
				} finally {
					for (const [property, expression] of kept) {
						property.expression = expression;
					}
				}
			}
	);

	// A direct `eval` reads `this` without naming it.
	const containsThis = A.AST_Node.prototype.contains_this;
	A.AST_Node.prototype.contains_this = function contains_this() {
		return (
			containsThis.call(this) ||
			(corrections.enabled && this instanceof A.AST_Scope && this.uses_eval)
		);
	};

	/**
	 * Whether a parameter has a default whose evaluation has effects.
	 * @param {Node} parameter the parameter
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} true for `(a = f()) => …`
	 */
	const hasDefaultWithEffects = (parameter, compressor) =>
		parameter instanceof A.AST_DefaultAssign &&
		parameter.right.has_side_effects(compressor);

	/**
	 * The options that would drop effects a call's parameters or arguments
	 * still have: inlining or dropping it loses a default or a pattern, and
	 * dropping an empty function's call loses a spread's iteration.
	 * @param {Node} call the call
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {string[]} the options to skip for this call
	 */
	const optionsLosingEffects = (call, compressor) => {
		let fn = call.expression;
		if (fn instanceof A.AST_SymbolRef && typeof fn.fixed_value === "function") {
			fn = fn.fixed_value();
		}
		if (!(fn instanceof A.AST_Lambda)) return [];
		if (
			fn.argnames.some(
				(/** @type {Node} */ parameter) =>
					parameter instanceof A.AST_Destructuring ||
					hasDefaultWithEffects(parameter, compressor) ||
					(parameter instanceof A.AST_Expansion &&
						!(parameter.expression instanceof A.AST_SymbolFunarg))
			)
		) {
			return ["inline", "side_effects"];
		}
		return fn.body.every(isEmpty) &&
			call.args.some(
				(/** @type {Node} */ arg) => arg instanceof A.AST_Expansion
			)
			? ["side_effects"]
			: [];
	};

	/**
	 * Whether a node is what a call or a tag reads its function from.
	 * @param {Node} parent the node's parent
	 * @param {Node} node the node
	 * @returns {boolean} true for `node()` and `` node`…` ``
	 */
	const isCallee = (parent, node) =>
		(parent instanceof A.AST_Call && parent.expression === node) ||
		(parent instanceof A.AST_PrefixedTemplateString && parent.prefix === node);

	/**
	 * Whether calling a node binds `this` to the object it was read from, or
	 * makes a direct `eval`.
	 * @param {Node} node the node
	 * @returns {boolean} true for `a.b`, `a?.b` and `eval`
	 */
	const bindsThis = (node) =>
		node instanceof A.AST_PropAccess ||
		node instanceof A.AST_Chain ||
		(node instanceof A.AST_SymbolRef && node.name === "eval");

	/**
	 * `(0, result)`, which calls `result` unbound.
	 * @param {Node} result what took a callee's place
	 * @returns {Node} the sequence
	 */
	const detached = (result) =>
		new A.AST_Sequence({
			start: result.start,
			expressions: [
				new A.AST_Number({ start: result.start, value: 0, end: result.start }),
				result
			],
			end: result.end
		});

	// A callee replaced by `a.b` must not bind `a`, which the callee it replaces
	// never did; terser keeps the `0,` for a call but not for a tag.
	wrapOptimize(
		A.AST_Call.prototype,
		(original) =>
			function optimize(compressor) {
				const parent = compressor.parent();
				const result = optimizeKeepingEffects(this, compressor, original);
				return result !== this && isCallee(parent, this) && bindsThis(result)
					? detached(result)
					: result;
			}
	);
	for (const Type of [A.AST_Sequence, A.AST_Conditional]) {
		wrapOptimize(
			Type.prototype,
			(original) =>
				function optimize(compressor) {
					const parent = compressor.parent();
					if (
						!(parent instanceof A.AST_PrefixedTemplateString) ||
						parent.prefix !== this
					) {
						return original.call(this, compressor);
					}
					if (
						this instanceof A.AST_Sequence &&
						this.expressions.length === 2 &&
						this.expressions[0] instanceof A.AST_Number &&
						bindsThis(this.expressions[1])
					) {
						return this;
					}
					const result = original.call(this, compressor);
					return result !== this && bindsThis(result)
						? detached(result)
						: result;
				}
		);
	}

	/**
	 * Optimizes a call, keeping the effects its parameters or arguments have.
	 * @param {Node} call the call
	 * @param {TerserCompressor} compressor the compressor
	 * @param {Optimize} original terser's `optimize`
	 * @returns {Node} the optimized call
	 */
	function optimizeKeepingEffects(call, compressor, original) {
		const names = optionsLosingEffects(call, compressor);
		return names.length === 0
			? original.call(call, compressor)
			: withOptionsOff(compressor, names, () =>
					original.call(call, compressor)
				);
	}

	// A sloppy `arguments[i]` follows its parameter only where an argument was
	// passed, so it is the parameter only while nothing reassigns that.
	wrapOptimize(
		A.AST_Sub.prototype,
		(original) =>
			function optimize(compressor) {
				const { expression, property } = this;
				if (
					compressor.option("arguments") &&
					expression instanceof A.AST_SymbolRef &&
					expression.name === "arguments" &&
					expression.scope instanceof A.AST_Lambda &&
					!(expression.scope instanceof A.AST_Arrow) &&
					property instanceof A.AST_Number &&
					!compressor.has_directive("use strict")
				) {
					const parameter = expression.scope.argnames[property.getValue()];
					if (parameter instanceof A.AST_SymbolFunarg) {
						const definition = parameter.definition();
						if (
							!compressor.option("reduce_vars") ||
							definition.assignments ||
							definition.orig.length > 1
						) {
							return withOptionsOff(compressor, ["arguments"], () =>
								original.call(this, compressor)
							);
						}
					}
				}
				return original.call(this, compressor);
			}
	);

	// `===` between two readings of one expression is `==` only where both
	// readings give one value, which a call or property read need not.
	wrapOptimize(
		A.AST_Binary.prototype,
		(original) =>
			function optimize(compressor) {
				const parent = compressor.parent();
				if (
					parent instanceof A.AST_PrefixedTemplateString &&
					parent.prefix === this
				) {
					const result = original.call(this, compressor);
					return result !== this && bindsThis(result)
						? detached(result)
						: result;
				}
				if (
					(this.operator === "===" || this.operator === "!==") &&
					compressor.option("comparisons") &&
					!(this.left instanceof A.AST_SymbolRef) &&
					!(this.left instanceof A.AST_Constant) &&
					this.left.equivalent_to(this.right)
				) {
					return withOptionsOff(compressor, ["comparisons"], () =>
						original.call(this, compressor)
					);
				}
				return original.call(this, compressor);
			}
	);

	/** @type {WeakMap<TerserCompressor, Set<Node>>} */
	const defaultsWithEffects = new WeakMap();

	// terser moves what follows an `if (…) return` into the `if`, leaving `let`
	// and `const` where they are but not `class`, which is block-scoped too.
	for (const Type of [
		A.AST_Block,
		A.AST_BlockStatement,
		A.AST_Lambda,
		A.AST_Arrow,
		A.AST_Function,
		A.AST_ClassStaticBlock
	]) {
		if (!Object.prototype.hasOwnProperty.call(Type.prototype, "optimize")) {
			continue;
		}
		wrapOptimize(
			Type.prototype,
			(original) =>
				function optimize(compressor) {
					if (
						this instanceof A.AST_Lambda &&
						this.argnames.some((/** @type {Node} */ parameter) =>
							hasDefaultWithEffects(parameter, compressor)
						)
					) {
						let lambdas = defaultsWithEffects.get(compressor);
						if (lambdas === undefined) {
							lambdas = new Set();
							defaultsWithEffects.set(compressor, lambdas);
						}
						lambdas.add(this);
					}
					return Array.isArray(this.body) &&
						this.body.some(
							(/** @type {Node} */ statement) =>
								statement instanceof A.AST_DefClass
						)
						? withOptionsOff(compressor, ["if_return"], () =>
								original.call(this, compressor)
							)
						: original.call(this, compressor);
				}
		);
	}

	// terser trims an unused trailing parameter with its default, whose effects
	// a call passing no argument still runs; keep such a parameter.
	if (modules.webpackUnused) {
		/**
		 * @param {Node} lambda a function whose trailing parameter is trimmed
		 * @param {Node} parameter that parameter, its default included
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it stays, as a call passing nothing runs its default
		 */
		modules.webpackUnused.keepsParameter = (lambda, parameter, compressor) => {
			if (!corrections.enabled) return false;
			const lambdas = defaultsWithEffects.get(compressor);
			return (
				lambdas !== undefined &&
				lambdas.has(lambda) &&
				hasDefaultWithEffects(parameter, compressor)
			);
		};
		return;
	}
	// terser's own `drop_unused` trims first, so the parameter is put back.
	const dropUnused = A.AST_Scope.prototype.drop_unused;
	A.AST_Scope.prototype.drop_unused = function drop_unused(
		/** @type {TerserCompressor} */ compressor
	) {
		const lambdas = corrections.enabled
			? defaultsWithEffects.get(compressor)
			: undefined;
		if (lambdas === undefined) return dropUnused.call(this, compressor);
		/** @type {[Node, Node[]][]} */
		const before = [];
		for (const lambda of lambdas) before.push([lambda, [...lambda.argnames]]);
		const result = dropUnused.call(this, compressor);
		for (const [lambda, argnames] of before) {
			let keep = lambda.argnames.length;
			for (let i = keep; i < argnames.length; i++) {
				if (hasDefaultWithEffects(argnames[i], compressor)) keep = i + 1;
			}
			for (let i = lambda.argnames.length; i < keep; i++) {
				lambda.argnames.push(argnames[i]);
			}
		}
		return result;
	};
};

// The xxhash64 of terser's `compress/evaluate.js`, each run of whitespace read
// as one space: the one version the evaluate phase below was written against.
const TERSER_EVALUATE = "34f1a714e6ed4299";

/**
 * Whether terser's `compress/evaluate.js` is still the one the evaluate phase
 * reproduces, and the helpers it reads are where it reads them.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const evaluateFits = ({ ast, inference, utils }) => {
	if (
		!ast ||
		!inference ||
		!utils ||
		typeof ast.AST_Node !== "function" ||
		typeof ast.AST_Node.prototype._eval !== "function" ||
		typeof inference.is_undeclared_ref !== "function" ||
		typeof utils.regexp_source_fix !== "function"
	) {
		return false;
	}

	const fs = require("fs");
	const path = require("path");

	return (
		hashTerserSource(
			fs.readFileSync(
				path.join(
					path.dirname(require.resolve("terser/package.json")),
					"lib/compress/evaluate.js"
				),
				"utf8"
			)
		) === TERSER_EVALUATE
	);
};

// What a regular expression's source may hold for terser to build it: no
// pattern that backtracks without bound.
const SAFE_REGEXP_SOURCE = /^[\\/|\0\s\w^$.[\]()]*$/;
const EVALUATED_GLOBALS = { Array, Math, Number, Object, String };
const REGEXP_FLAG_PROPERTIES = new Set([
	"dotAll",
	"global",
	"ignoreCase",
	"multiline",
	"sticky",
	"unicode"
]);
const CONSTANT_UNARY = new Set(["!", "~", "-", "+", "void"]);
const NON_CONVERTING_UNARY = new Set(["!", "typeof", "void"]);
const NON_CONVERTING_BINARY = new Set(["&&", "||", "??", "===", "!=="]);
const IDENTITY_COMPARISON = new Set(["==", "!=", "===", "!=="]);

/**
 * @param {unknown} value a value
 * @returns {boolean} whether two such values compare by identity
 */
const hasIdentity = (value) =>
	typeof value === "object" ||
	typeof value === "function" ||
	typeof value === "symbol";

/**
 * Installs webpack's `evaluate`, `is_constant` and each node's `_eval`: what
 * the compressor reckons an expression is worth, where it can tell.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installEvaluate = ({ ast, inference, utils }) => {
	const {
		AST_Array,
		AST_BigInt,
		AST_Binary,
		AST_Call,
		AST_Chain,
		AST_Class,
		AST_Conditional,
		AST_Constant,
		AST_Dot,
		AST_Expansion,
		AST_Function,
		AST_Lambda,
		AST_New,
		AST_Node,
		AST_Object,
		AST_PropAccess,
		AST_RegExp,
		AST_Statement,
		AST_Symbol,
		AST_SymbolRef,
		AST_TemplateString,
		AST_UnaryPrefix,
		AST_With
	} = ast;
	const isUndeclaredRef = inference.is_undeclared_ref;
	const regexpSourceFix = utils.regexp_source_fix;
	// What a chain evaluates to once an optional link short-circuits it.
	const NULLISH = Symbol("nullish");
	// The references being evaluated, so a cycle of them ends.
	/** @type {Set<Node>} */
	const evaluating = new Set();

	/**
	 * @this {Node} the node
	 * @returns {Node} itself, which the compressor reads as "not evaluated"
	 */
	function returnThis() {
		return this;
	}

	/**
	 * @this {Node} an expression
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {EXPECTED_ANY} its value, or itself where it has none worth writing
	 */
	AST_Node.prototype.evaluate = function evaluate(compressor) {
		if (!compressor.option("evaluate")) return this;
		const value = this._eval(compressor, 1);
		if (!value || value instanceof RegExp) return value;
		if (
			typeof value === "function" ||
			typeof value === "object" ||
			value === NULLISH
		) {
			return this;
		}
		// An evaluated string can print longer than the expression it replaces.
		if (typeof value === "string" && value.length + 2 > this.size(compressor)) {
			return this;
		}
		return value;
	};

	/**
	 * @this {Node} an expression
	 * @returns {boolean} whether it is a constant, `!0` and `-1` included
	 */
	AST_Node.prototype.is_constant = function is_constant() {
		if (this instanceof AST_Constant) return !(this instanceof AST_RegExp);
		return (
			this instanceof AST_UnaryPrefix &&
			CONSTANT_UNARY.has(this.operator) &&
			(this.expression instanceof AST_Constant || this.expression.is_constant())
		);
	};

	/**
	 * @this {Node} a statement
	 * @returns {never} never: a statement has no value
	 */
	AST_Statement.prototype._eval = function _eval() {
		throw new Error(
			stringTemplate(
				"Cannot evaluate a statement [{file}:{line},{col}]",
				this.start
			)
		);
	};
	AST_Lambda.prototype._eval = returnThis;
	AST_Class.prototype._eval = returnThis;
	AST_Node.prototype._eval = returnThis;
	AST_New.prototype._eval = returnThis;

	/**
	 * @this {Node} a constant
	 * @returns {EXPECTED_ANY} its value
	 */
	AST_Constant.prototype._eval = function _eval() {
		return this.getValue();
	};

	/**
	 * @this {Node} a BigInt literal
	 * @returns {bigint} its value
	 */
	AST_BigInt.prototype._eval = function _eval() {
		return BigInt(this.value);
	};

	/**
	 * @this {Node} a regular expression literal
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {RegExp | Node} the expression built, once per compressor
	 */
	AST_RegExp.prototype._eval = function _eval(compressor) {
		let evaluated = compressor.evaluated_regexps.get(this.value);
		if (evaluated === undefined && SAFE_REGEXP_SOURCE.test(this.value.source)) {
			try {
				const { source, flags } = this.value;
				evaluated = new RegExp(source, flags);
			} catch (_err) {
				evaluated = null;
			}
			compressor.evaluated_regexps.set(this.value, evaluated);
		}
		return evaluated || this;
	};

	/**
	 * @this {Node} a template string
	 * @returns {string | Node} its text where it holds no substitution
	 */
	AST_TemplateString.prototype._eval = function _eval() {
		if (this.segments.length !== 1) return this;
		return this.segments[0].value;
	};

	/**
	 * @this {Node} a function expression
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {EXPECTED_ANY} a stand-in function under `unsafe`, else itself
	 */
	AST_Function.prototype._eval = function _eval(compressor) {
		if (!compressor.option("unsafe")) return this;
		/** @type {EXPECTED_ANY} */
		const stand = fn;
		stand.node = this;
		stand.toString = () => this.print_to_string();
		return stand;
		/**
		 * @returns {void}
		 */
		function fn() {}
	};

	/**
	 * @this {Node} an array literal
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its elements' values under `unsafe`, else itself
	 */
	AST_Array.prototype._eval = function _eval(compressor, depth) {
		if (!compressor.option("unsafe")) return this;
		const elements = [];
		for (const element of this.elements) {
			const value = element._eval(compressor, depth);
			if (element === value) return this;
			elements.push(value);
		}
		return elements;
	};

	/**
	 * @this {Node} an object literal
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its properties' values under `unsafe`, else itself
	 */
	AST_Object.prototype._eval = function _eval(compressor, depth) {
		if (!compressor.option("unsafe")) return this;
		/** @type {Record<string, EXPECTED_ANY>} */
		const value = {};
		for (const property of this.properties) {
			if (property instanceof AST_Expansion) return this;
			let key = property.key;
			if (key instanceof AST_Symbol) {
				key = key.name;
			} else if (key instanceof AST_Node) {
				key = key._eval(compressor, depth);
				if (key === property.key) return this;
			}
			if (
				typeof (
					/** @type {Record<string, unknown>} */ (Object.prototype)[key]
				) === "function"
			) {
				return this;
			}
			if (property.value instanceof AST_Function) continue;
			value[key] = property.value._eval(compressor, depth);
			if (value[key] === property.value) return this;
		}
		return value;
	};

	/**
	 * @this {Node} a prefix operation
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its value, or itself
	 */
	AST_UnaryPrefix.prototype._eval = function _eval(compressor, depth) {
		let expression = this.expression;
		if (compressor.option("typeofs") && this.operator === "typeof") {
			// A function would evaluate to an array, whose `typeof` is "object".
			if (
				expression instanceof AST_Lambda ||
				(expression instanceof AST_SymbolRef &&
					expression.fixed_value() instanceof AST_Lambda)
			) {
				return "function";
			}
			if (
				(expression instanceof AST_Object ||
					expression instanceof AST_Array ||
					(expression instanceof AST_SymbolRef &&
						(expression.fixed_value() instanceof AST_Object ||
							expression.fixed_value() instanceof AST_Array))) &&
				!expression.has_side_effects(compressor)
			) {
				return "object";
			}
		}
		if (!NON_CONVERTING_UNARY.has(this.operator)) depth++;
		expression = expression._eval(compressor, depth);
		if (expression === this.expression) return this;
		switch (this.operator) {
			case "!":
				return !expression;
			case "typeof":
				// `typeof` a regular expression differs between engines.
				if (expression instanceof RegExp) return this;
				return typeof expression;
			case "void":
				return undefined;
			case "~":
				return ~expression;
			case "-":
				return -expression;
			case "+":
				// eslint-disable-next-line no-implicit-coercion
				return +expression;
		}
		return this;
	};

	/**
	 * @this {Node} a binary operation
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its value, or itself
	 */
	AST_Binary.prototype._eval = function _eval(compressor, depth) {
		if (!NON_CONVERTING_BINARY.has(this.operator)) depth++;
		const left = this.left._eval(compressor, depth);
		if (left === this.left) return this;
		const right = this.right._eval(compressor, depth);
		if (right === this.right) return this;
		if (
			left !== null &&
			left !== undefined &&
			right !== null &&
			right !== undefined &&
			IDENTITY_COMPARISON.has(this.operator) &&
			hasIdentity(left) &&
			hasIdentity(right) &&
			typeof left === typeof right
		) {
			return this;
		}
		// Neither mixes a BigInt with a number, nor divides one by zero, nor
		// shifts one unsigned, nor raises one to a power (slow).
		if (
			(typeof left === "bigint") !== (typeof right === "bigint") ||
			(typeof left === "bigint" &&
				((this.operator === "/" && Number(right) === 0) ||
					this.operator === ">>>" ||
					this.operator === "**"))
		) {
			return this;
		}
		let result;
		switch (this.operator) {
			case "&&":
				result = left && right;
				break;
			case "||":
				result = left || right;
				break;
			case "??":
				result = left !== null && left !== undefined ? left : right;
				break;
			case "|":
				result = left | right;
				break;
			case "&":
				result = left & right;
				break;
			case "^":
				result = left ^ right;
				break;
			case "+":
				result = left + right;
				break;
			case "*":
				result = left * right;
				break;
			case "**":
				result = left ** right;
				break;
			case "/":
				result = left / right;
				break;
			case "%":
				result = left % right;
				break;
			case "-":
				result = left - right;
				break;
			case "<<":
				result = left << right;
				break;
			case ">>":
				result = left >> right;
				break;
			case ">>>":
				result = left >>> right;
				break;
			case "==":
				// eslint-disable-next-line eqeqeq
				result = left == right;
				break;
			case "===":
				result = left === right;
				break;
			case "!=":
				// eslint-disable-next-line eqeqeq
				result = left != right;
				break;
			case "!==":
				result = left !== right;
				break;
			case "<":
				result = left < right;
				break;
			case "<=":
				result = left <= right;
				break;
			case ">":
				result = left > right;
				break;
			case ">=":
				result = left >= right;
				break;
			default:
				return this;
		}
		// Inside `with`, `NaN` may name the object's property instead.
		if (
			typeof result === "number" &&
			Number.isNaN(result) &&
			compressor.find_parent(AST_With)
		) {
			return this;
		}
		return result;
	};

	/**
	 * @this {Node} a conditional
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} the value of the branch taken, or itself
	 */
	AST_Conditional.prototype._eval = function _eval(compressor, depth) {
		const condition = this.condition._eval(compressor, depth);
		if (condition === this.condition) return this;
		const node = condition ? this.consequent : this.alternative;
		const value = node._eval(compressor, depth);
		return value === node ? this : value;
	};

	/**
	 * @this {Node} a reference
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} the value it is known to hold, or itself
	 */
	AST_SymbolRef.prototype._eval = function _eval(compressor, depth) {
		if (evaluating.has(this)) return this;
		const fixed = this.fixed_value();
		if (!fixed) return this;
		evaluating.add(this);
		const value = fixed._eval(compressor, depth);
		evaluating.delete(this);
		if (value === fixed) return this;
		if (value && typeof value === "object") {
			const { escaped } = this.definition();
			if (escaped && depth > escaped) return this;
		}
		return value;
	};

	/**
	 * @this {Node} an optional chain
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its value, `undefined` where it short-circuits
	 */
	AST_Chain.prototype._eval = function _eval(compressor, depth) {
		const evaluated = this.expression._eval(compressor, depth, true);
		if (evaluated === NULLISH) return undefined;
		return evaluated === this.expression ? this : evaluated;
	};

	/**
	 * @param {Node | false | null | undefined} node the first argument of `hasOwnProperty.call`, if any
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether it may be a global nobody declared
	 */
	const readsUndeclared = (node, compressor) => {
		let first = node && node.evaluate(compressor);
		first = first instanceof AST_Dot ? first.expression : first;
		return (
			first === null ||
			first === undefined ||
			Boolean(first.thedef && first.thedef.undeclared)
		);
	};

	/**
	 * @this {Node} a property access
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @param {boolean=} inChain whether it is a link of an optional chain
	 * @returns {EXPECTED_ANY} the property's value, or itself
	 */
	AST_PropAccess.prototype._eval = function _eval(compressor, depth, inChain) {
		let object =
			(inChain || this.property === "length" || compressor.option("unsafe")) &&
			this.expression._eval(compressor, depth + 1, inChain);
		if (
			inChain &&
			(object === NULLISH ||
				(this.optional && (object === null || object === undefined)))
		) {
			return NULLISH;
		}
		// The `.length` of a string or an array is always safe to read.
		if (this.property === "length") {
			if (typeof object === "string") return object.length;
			if (
				object instanceof AST_Array &&
				object.elements.every(
					(/** @type {Node} */ element) => !(element instanceof AST_Expansion)
				) &&
				object.elements.every(
					(/** @type {Node} */ element) => !element.has_side_effects(compressor)
				)
			) {
				return object.elements.length;
			}
		}
		if (!compressor.option("unsafe")) return this;
		let key = this.property;
		if (key instanceof AST_Node) {
			key = key._eval(compressor, depth);
			if (key === this.property) return this;
		}
		const expression = this.expression;
		if (isUndeclaredRef(expression)) {
			if (expression.name === "hasOwnProperty" && key === "call") {
				const parent = compressor.parent();
				const args = parent && parent.args;
				if (readsUndeclared(args && args[0], compressor)) return this.clone();
			} else if (readsUndeclared(false, compressor)) {
				return this.clone();
			}
			if (!compressor.is_pure_native_static_property(expression.name, key)) {
				return this;
			}
			object =
				EVALUATED_GLOBALS[
					/** @type {keyof typeof EVALUATED_GLOBALS} */ (expression.name)
				];
		} else {
			if (object instanceof RegExp) {
				if (key === "source") return regexpSourceFix(object.source);
				if (key === "flags" || REGEXP_FLAG_PROPERTIES.has(key)) {
					return /** @type {EXPECTED_ANY} */ (object)[key];
				}
			}
			if (
				!object ||
				object === expression ||
				!Object.prototype.hasOwnProperty.call(object, key)
			) {
				return this;
			}
			if (typeof object === "function") {
				switch (key) {
					case "name":
						return object.node.name ? object.node.name.name : "";
					case "length":
						return object.node.length_property();
					default:
						return this;
				}
			}
		}
		return /** @type {EXPECTED_ANY} */ (object)[key];
	};

	/**
	 * @this {Node} a call
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @param {boolean=} inChain whether it is a link of an optional chain
	 * @returns {EXPECTED_ANY} what a pure built-in returns, or itself
	 */
	AST_Call.prototype._eval = function _eval(compressor, depth, inChain) {
		const callee = this.expression;
		if (inChain) {
			const evaluated = callee._eval(compressor, depth, inChain);
			if (
				evaluated === NULLISH ||
				(this.optional && (evaluated === null || evaluated === undefined))
			) {
				return NULLISH;
			}
		}
		if (!compressor.option("unsafe") || !(callee instanceof AST_PropAccess)) {
			return this;
		}
		let key = callee.property;
		if (key instanceof AST_Node) {
			key = key._eval(compressor, depth);
			if (typeof key !== "string" && typeof key !== "number") return this;
		}
		let value;
		const object = callee.expression;
		if (isUndeclaredRef(object)) {
			if (
				readsUndeclared(
					object.name === "hasOwnProperty" && key === "call" && this.args[0],
					compressor
				)
			) {
				return this.clone();
			}
			if (!compressor.is_pure_native_static_fn(object.name, key)) return this;
			value =
				EVALUATED_GLOBALS[
					/** @type {keyof typeof EVALUATED_GLOBALS} */ (object.name)
				];
		} else {
			// The chain is not passed on: that costs exponential work.
			value = object._eval(compressor, depth + 1);
			if (value === object || !value) return this;
			if (!compressor.is_pure_native_method(value.constructor.name, key)) {
				return this;
			}
		}
		const args = [];
		for (const arg of this.args) {
			const argument = arg._eval(compressor, depth);
			if (arg === argument || arg instanceof AST_Lambda) return this;
			args.push(argument);
		}
		try {
			return /** @type {EXPECTED_ANY} */ (value)[key](...args);
		} catch (_err) {
			return this;
		}
	};
};

// The xxhash64 of terser's `compress/inference.js`, each run of whitespace read
// as one space: the one version the inference phase below was written against.
const TERSER_INFERENCE = "bac5bd59706dc14a";

/**
 * Whether terser's `compress/inference.js` is still the one the inference
 * phase reproduces, and the helpers it reads are where it reads them.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const inferenceFits = ({ ast, common, flags, nativeObjects, utils }) => {
	if (
		!ast ||
		!common ||
		!flags ||
		!nativeObjects ||
		!utils ||
		typeof ast.AST_Node !== "function" ||
		typeof ast.AST_Node.prototype.has_side_effects !== "function" ||
		typeof ast.walk !== "function" ||
		typeof common.make_sequence !== "function" ||
		typeof common.best_of_expression !== "function" ||
		typeof flags.has_flag !== "function" ||
		typeof nativeObjects.is_pure_builtin_call !== "function" ||
		!(nativeObjects.pure_prop_access_globals instanceof Set) ||
		typeof utils.make_node !== "function" ||
		typeof utils.has_annotation !== "function"
	) {
		return false;
	}

	const fs = require("fs");
	const path = require("path");

	return (
		hashTerserSource(
			fs.readFileSync(
				path.join(
					path.dirname(require.resolve("terser/package.json")),
					"lib/compress/inference.js"
				),
				"utf8"
			)
		) === TERSER_INFERENCE
	);
};

const BOOLEAN_UNARY = new Set(["!", "delete"]);
const BOOLEAN_BINARY = new Set([
	"in",
	"instanceof",
	"==",
	"!=",
	"===",
	"!==",
	"<",
	"<=",
	">=",
	">"
]);
const LAZY_OPERATORS = new Set(["&&", "||", "??"]);
const NUMERIC_UNARY = new Set(["+", "-", "~", "++", "--"]);
const NUMERIC_BINARY = new Set([
	"-",
	"*",
	"/",
	"%",
	"&",
	"|",
	"^",
	"<<",
	">>",
	">>>"
]);
// `>>>` throws on a BigInt, so it is left out of what keeps one.
const BIGINT_BINARY = new Set(["-", "*", "/", "%", "&", "|", "^", "<<", ">>"]);
const BITWISE_BINARY = new Set(["<<<", ">>", "<<", "&", "|", "^", "~"]);
const UNARY_SIDE_EFFECTS = new Set(["delete", "++", "--"]);
const GLOBAL_PURE_FUNCTIONS = new Set([
	"Boolean",
	"decodeURI",
	"decodeURIComponent",
	"Date",
	"encodeURI",
	"encodeURIComponent",
	"Error",
	"escape",
	"EvalError",
	"isFinite",
	"isNaN",
	"Number",
	"Object",
	"parseFloat",
	"parseInt",
	"RangeError",
	"ReferenceError",
	"String",
	"SyntaxError",
	"TypeError",
	"unescape",
	"URIError"
]);

/**
 * Installs webpack's inference: what the compressor knows of an expression
 * without running it — its type, whether it has effects or may throw, and its
 * negation.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installInference = ({ ast, common, flags, nativeObjects, utils }) => {
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (ast);
	const { walk, walk_abort: walkAbort, _PURE } = ast;
	const { make_sequence: makeSequence, best_of_expression: bestOfExpression } =
		common;
	const { has_flag: hasFlag, INLINED, UNDEFINED } = flags;
	const {
		is_pure_builtin_call: isPureBuiltinCall,
		pure_prop_access_globals: purePropertyAccessGlobals
	} = nativeObjects;
	const { has_annotation: hasAnnotation } = utils;

	/**
	 * @param {EXPECTED_ANY} Type a node class
	 * @param {string} name the method's name
	 * @param {EXPECTED_FUNCTION} method the method
	 * @returns {void}
	 */
	const define = (Type, name, method) => {
		Type.prototype[name] = method;
	};
	/**
	 * @returns {true} true
	 */
	const returnTrue = () => true;
	/**
	 * @returns {false} false
	 */
	const returnFalse = () => false;

	/**
	 * @param {Node} node a node
	 * @returns {boolean} whether it reads a global nobody declared
	 */
	const isUndeclaredRef = (node) =>
		node instanceof A.AST_SymbolRef && node.definition().undeclared;

	// is_boolean
	define(A.AST_Node, "is_boolean", returnFalse);
	define(
		A.AST_UnaryPrefix,
		"is_boolean",
		/**
		 * @this {Node} a prefix operation
		 * @returns {boolean} whether it yields a boolean
		 */
		function is_boolean() {
			return BOOLEAN_UNARY.has(this.operator);
		}
	);
	define(
		A.AST_Binary,
		"is_boolean",
		/**
		 * @this {Node} a binary operation
		 * @returns {boolean} whether it yields a boolean
		 */
		function is_boolean() {
			return (
				BOOLEAN_BINARY.has(this.operator) ||
				(LAZY_OPERATORS.has(this.operator) &&
					this.left.is_boolean() &&
					this.right.is_boolean())
			);
		}
	);
	define(
		A.AST_Conditional,
		"is_boolean",
		/**
		 * @this {Node} a conditional
		 * @returns {boolean} whether it yields a boolean
		 */
		function is_boolean() {
			return this.consequent.is_boolean() && this.alternative.is_boolean();
		}
	);
	define(
		A.AST_Assign,
		"is_boolean",
		/**
		 * @this {Node} an assignment
		 * @returns {boolean} whether it yields a boolean
		 */
		function is_boolean() {
			return this.operator === "=" && this.right.is_boolean();
		}
	);
	define(
		A.AST_Sequence,
		"is_boolean",
		/**
		 * @this {Node} a sequence
		 * @returns {boolean} whether it yields a boolean
		 */
		function is_boolean() {
			return this.tail_node().is_boolean();
		}
	);
	define(A.AST_True, "is_boolean", returnTrue);
	define(A.AST_False, "is_boolean", returnTrue);

	// is_number
	define(A.AST_Node, "is_number", returnFalse);
	define(A.AST_Number, "is_number", returnTrue);
	define(
		A.AST_Unary,
		"is_number",
		/**
		 * @this {Node} a unary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number
		 */
		function is_number(compressor) {
			return (
				NUMERIC_UNARY.has(this.operator) &&
				this.expression.is_number(compressor)
			);
		}
	);
	define(
		A.AST_Binary,
		"is_number",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number
		 */
		function is_number(compressor) {
			if (this.operator === "+") {
				// One side a number and the other a number or a BigInt.
				return (
					(this.left.is_number(compressor) &&
						this.right.is_number_or_bigint(compressor)) ||
					(this.right.is_number(compressor) &&
						this.left.is_number_or_bigint(compressor))
				);
			}
			if (NUMERIC_BINARY.has(this.operator)) {
				return (
					this.left.is_number(compressor) || this.right.is_number(compressor)
				);
			}
			return false;
		}
	);
	define(
		A.AST_Assign,
		"is_number",
		/**
		 * @this {Node} an assignment
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number
		 */
		function is_number(compressor) {
			return (
				(this.operator === "=" ||
					NUMERIC_BINARY.has(this.operator.slice(0, -1))) &&
				this.right.is_number(compressor)
			);
		}
	);
	define(
		A.AST_Sequence,
		"is_number",
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number
		 */
		function is_number(compressor) {
			return this.tail_node().is_number(compressor);
		}
	);
	define(
		A.AST_Conditional,
		"is_number",
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number
		 */
		function is_number(compressor) {
			return (
				this.consequent.is_number(compressor) &&
				this.alternative.is_number(compressor)
			);
		}
	);

	// is_bigint
	define(A.AST_Node, "is_bigint", returnFalse);
	define(A.AST_BigInt, "is_bigint", returnTrue);
	define(
		A.AST_Unary,
		"is_bigint",
		/**
		 * @this {Node} a unary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a BigInt
		 */
		function is_bigint(compressor) {
			return (
				NUMERIC_UNARY.has(this.operator) &&
				this.expression.is_bigint(compressor)
			);
		}
	);
	define(
		A.AST_Binary,
		"is_bigint",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a BigInt
		 */
		function is_bigint(compressor) {
			if (this.operator === "+") {
				return (
					(this.left.is_bigint(compressor) &&
						this.right.is_number_or_bigint(compressor)) ||
					(this.right.is_bigint(compressor) &&
						this.left.is_number_or_bigint(compressor))
				);
			}
			if (BIGINT_BINARY.has(this.operator)) {
				return (
					this.left.is_bigint(compressor) || this.right.is_bigint(compressor)
				);
			}
			return false;
		}
	);
	define(
		A.AST_Assign,
		"is_bigint",
		/**
		 * @this {Node} an assignment
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a BigInt
		 */
		function is_bigint(compressor) {
			return (
				(BIGINT_BINARY.has(this.operator.slice(0, -1)) ||
					this.operator === "=") &&
				this.right.is_bigint(compressor)
			);
		}
	);
	define(
		A.AST_Sequence,
		"is_bigint",
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a BigInt
		 */
		function is_bigint(compressor) {
			return this.tail_node().is_bigint(compressor);
		}
	);
	define(
		A.AST_Conditional,
		"is_bigint",
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a BigInt
		 */
		function is_bigint(compressor) {
			return (
				this.consequent.is_bigint(compressor) &&
				this.alternative.is_bigint(compressor)
			);
		}
	);

	// is_number_or_bigint
	define(A.AST_Node, "is_number_or_bigint", returnFalse);
	define(A.AST_Number, "is_number_or_bigint", returnTrue);
	define(A.AST_BigInt, "is_number_or_bigint", returnTrue);
	define(
		A.AST_Unary,
		"is_number_or_bigint",
		/**
		 * @this {Node} a unary operation
		 * @returns {boolean} whether it yields a number or a BigInt
		 */
		function is_number_or_bigint() {
			return NUMERIC_UNARY.has(this.operator);
		}
	);
	define(
		A.AST_Binary,
		"is_number_or_bigint",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number or a BigInt
		 */
		function is_number_or_bigint(compressor) {
			return this.operator === "+"
				? this.left.is_number_or_bigint(compressor) &&
						this.right.is_number_or_bigint(compressor)
				: BIGINT_BINARY.has(this.operator);
		}
	);
	define(
		A.AST_Assign,
		"is_number_or_bigint",
		/**
		 * @this {Node} an assignment
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number or a BigInt
		 */
		function is_number_or_bigint(compressor) {
			return (
				BIGINT_BINARY.has(this.operator.slice(0, -1)) ||
				(this.operator === "=" && this.right.is_number_or_bigint(compressor))
			);
		}
	);
	define(
		A.AST_Sequence,
		"is_number_or_bigint",
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number or a BigInt
		 */
		function is_number_or_bigint(compressor) {
			return this.tail_node().is_number_or_bigint(compressor);
		}
	);
	define(
		A.AST_Conditional,
		"is_number_or_bigint",
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a number or a BigInt
		 */
		function is_number_or_bigint(compressor) {
			return (
				this.consequent.is_number_or_bigint(compressor) &&
				this.alternative.is_number_or_bigint(compressor)
			);
		}
	);

	// is_32_bit_integer
	define(A.AST_Node, "is_32_bit_integer", returnFalse);
	define(
		A.AST_Number,
		"is_32_bit_integer",
		/**
		 * @this {Node} a number
		 * @returns {boolean} whether it fits in 32 bits
		 */
		function is_32_bit_integer() {
			return this.value === (this.value | 0);
		}
	);
	define(
		A.AST_UnaryPrefix,
		"is_32_bit_integer",
		/**
		 * @this {Node} a prefix operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a 32-bit integer
		 */
		function is_32_bit_integer(compressor) {
			if (this.operator === "~") return this.expression.is_number(compressor);
			if (this.operator === "+") {
				return this.expression.is_32_bit_integer(compressor);
			}
			return false;
		}
	);
	define(
		A.AST_Binary,
		"is_32_bit_integer",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a 32-bit integer
		 */
		function is_32_bit_integer(compressor) {
			return (
				BITWISE_BINARY.has(this.operator) &&
				(this.left.is_number(compressor) || this.right.is_number(compressor))
			);
		}
	);

	// is_string
	define(A.AST_Node, "is_string", returnFalse);
	define(A.AST_String, "is_string", returnTrue);
	define(A.AST_TemplateString, "is_string", returnTrue);
	define(
		A.AST_UnaryPrefix,
		"is_string",
		/**
		 * @this {Node} a prefix operation
		 * @returns {boolean} whether it yields a string
		 */
		function is_string() {
			return this.operator === "typeof";
		}
	);
	define(
		A.AST_Binary,
		"is_string",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a string
		 */
		function is_string(compressor) {
			return (
				this.operator === "+" &&
				(this.left.is_string(compressor) || this.right.is_string(compressor))
			);
		}
	);
	define(
		A.AST_Assign,
		"is_string",
		/**
		 * @this {Node} an assignment
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a string
		 */
		function is_string(compressor) {
			return (
				(this.operator === "=" || this.operator === "+=") &&
				this.right.is_string(compressor)
			);
		}
	);
	define(
		A.AST_Sequence,
		"is_string",
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a string
		 */
		function is_string(compressor) {
			return this.tail_node().is_string(compressor);
		}
	);
	define(
		A.AST_Conditional,
		"is_string",
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it yields a string
		 */
		function is_string(compressor) {
			return (
				this.consequent.is_string(compressor) &&
				this.alternative.is_string(compressor)
			);
		}
	);

	/**
	 * terser's `is_undefined`.
	 * @param {Node} node an expression
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether it is `undefined`
	 */
	const isUndefined = (node, compressor) =>
		Boolean(hasFlag(node, UNDEFINED)) ||
		node instanceof A.AST_Undefined ||
		(node instanceof A.AST_UnaryPrefix &&
			node.operator === "void" &&
			!node.expression.has_side_effects(compressor));

	/**
	 * terser's `is_nullish`: whether an expression is `null` or `undefined`, or
	 * short-circuits into it through an optional link.
	 * @param {Node} node an expression
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether it is nullish
	 */
	const isNullish = (node, compressor) =>
		isNullOrUndefined(node, compressor) ||
		isNullishShortCircuited(node, compressor);

	/**
	 * @param {Node} node an expression
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether it is explicitly `null` or `undefined`
	 */
	const isNullOrUndefined = (node, compressor) => {
		let fixed;
		return (
			node instanceof A.AST_Null ||
			isUndefined(node, compressor) ||
			(node instanceof A.AST_SymbolRef &&
				(fixed = node.definition().fixed) instanceof A.AST_Node &&
				isNullish(fixed, compressor))
		);
	};

	/**
	 * @param {Node} node an expression
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether an optional link in it short-circuits
	 */
	const isNullishShortCircuited = (node, compressor) => {
		if (node instanceof A.AST_PropAccess || node instanceof A.AST_Call) {
			return (
				(node.optional && isNullOrUndefined(node.expression, compressor)) ||
				isNullishShortCircuited(node.expression, compressor)
			);
		}
		if (node instanceof A.AST_Chain) {
			return isNullishShortCircuited(node.expression, compressor);
		}
		return false;
	};

	/**
	 * @param {Node[]} list nodes
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether any has effects
	 */
	const anyHasSideEffects = (list, compressor) => {
		for (let i = list.length; --i >= 0;) {
			if (list[i].has_side_effects(compressor)) return true;
		}
		return false;
	};

	// has_side_effects
	define(A.AST_Node, "has_side_effects", returnTrue);
	define(A.AST_EmptyStatement, "has_side_effects", returnFalse);
	define(A.AST_Constant, "has_side_effects", returnFalse);
	define(A.AST_This, "has_side_effects", returnFalse);
	/**
	 * @this {Node} a node holding a `body` list
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether any statement in it has effects
	 */
	function bodyHasSideEffects(compressor) {
		return anyHasSideEffects(this.body, compressor);
	}
	define(A.AST_Block, "has_side_effects", bodyHasSideEffects);
	define(
		A.AST_Call,
		"has_side_effects",
		/**
		 * @this {Node} a call
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			if (
				!this.is_callee_pure(compressor) &&
				(!this.expression.is_call_pure(compressor) ||
					this.expression.has_side_effects(compressor))
			) {
				return true;
			}
			return anyHasSideEffects(this.args, compressor);
		}
	);
	/**
	 * @this {Node} a switch or a case
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether it has effects
	 */
	function switchHasSideEffects(compressor) {
		return (
			this.expression.has_side_effects(compressor) ||
			anyHasSideEffects(this.body, compressor)
		);
	}
	define(A.AST_Switch, "has_side_effects", switchHasSideEffects);
	define(A.AST_Case, "has_side_effects", switchHasSideEffects);
	define(
		A.AST_Try,
		"has_side_effects",
		/**
		 * @this {Node} a try statement
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.body.has_side_effects(compressor) ||
				(this.bcatch && this.bcatch.has_side_effects(compressor)) ||
				(this.bfinally && this.bfinally.has_side_effects(compressor))
			);
		}
	);
	define(
		A.AST_If,
		"has_side_effects",
		/**
		 * @this {Node} an if statement
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.condition.has_side_effects(compressor) ||
				(this.body && this.body.has_side_effects(compressor)) ||
				(this.alternative && this.alternative.has_side_effects(compressor))
			);
		}
	);
	define(A.AST_ImportMeta, "has_side_effects", returnFalse);
	define(
		A.AST_DynamicImport,
		"has_side_effects",
		/**
		 * @this {Node} a dynamic import
		 * @returns {boolean} whether it has effects: `import.source()` compiles only
		 */
		function has_side_effects() {
			return this.phase !== "source";
		}
	);
	/**
	 * @this {Node} a statement holding one `body` node
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether its body has effects
	 */
	function innerHasSideEffects(compressor) {
		return this.body.has_side_effects(compressor);
	}
	define(A.AST_LabeledStatement, "has_side_effects", innerHasSideEffects);
	define(A.AST_SimpleStatement, "has_side_effects", innerHasSideEffects);
	define(A.AST_Lambda, "has_side_effects", returnFalse);
	define(
		A.AST_Class,
		"has_side_effects",
		/**
		 * @this {Node} a class
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether defining it has effects
		 */
		function has_side_effects(compressor) {
			if (this.extends && this.extends.has_side_effects(compressor)) {
				return true;
			}
			return anyHasSideEffects(this.properties, compressor);
		}
	);
	define(A.AST_ClassStaticBlock, "has_side_effects", bodyHasSideEffects);
	define(
		A.AST_Binary,
		"has_side_effects",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.left.has_side_effects(compressor) ||
				this.right.has_side_effects(compressor)
			);
		}
	);
	define(A.AST_Assign, "has_side_effects", returnTrue);
	define(
		A.AST_Conditional,
		"has_side_effects",
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.condition.has_side_effects(compressor) ||
				this.consequent.has_side_effects(compressor) ||
				this.alternative.has_side_effects(compressor)
			);
		}
	);
	define(
		A.AST_Unary,
		"has_side_effects",
		/**
		 * @this {Node} a unary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				UNARY_SIDE_EFFECTS.has(this.operator) ||
				this.expression.has_side_effects(compressor)
			);
		}
	);
	define(
		A.AST_SymbolRef,
		"has_side_effects",
		/**
		 * @this {Node} a reference
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether reading it may throw a ReferenceError
		 */
		function has_side_effects(compressor) {
			return (
				!this.is_declared(compressor) &&
				!purePropertyAccessGlobals.has(this.name)
			);
		}
	);
	define(A.AST_SymbolClassProperty, "has_side_effects", returnFalse);
	define(A.AST_SymbolDeclaration, "has_side_effects", returnFalse);
	define(
		A.AST_Object,
		"has_side_effects",
		/**
		 * @this {Node} an object literal
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether building it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.properties, compressor);
		}
	);
	define(
		A.AST_ObjectKeyVal,
		"has_side_effects",
		/**
		 * @this {Node} a property
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether its key or value has effects
		 */
		function has_side_effects(compressor) {
			return (
				(this.computed_key() && this.key.has_side_effects(compressor)) ||
				(this.value && this.value.has_side_effects(compressor))
			);
		}
	);
	/**
	 * @this {Node} a class field
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether its key or static value has effects
	 */
	function fieldHasSideEffects(compressor) {
		return (
			(this.computed_key() && this.key.has_side_effects(compressor)) ||
			(this.static && this.value && this.value.has_side_effects(compressor))
		);
	}
	define(A.AST_ClassProperty, "has_side_effects", fieldHasSideEffects);
	define(A.AST_ClassPrivateProperty, "has_side_effects", fieldHasSideEffects);
	/**
	 * @this {Node} a method or accessor
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether its key has effects
	 */
	function keyHasSideEffects(compressor) {
		return this.computed_key() && this.key.has_side_effects(compressor);
	}
	for (const Type of [
		A.AST_PrivateMethod,
		A.AST_PrivateGetter,
		A.AST_PrivateSetter,
		A.AST_ConciseMethod,
		A.AST_ObjectGetter,
		A.AST_ObjectSetter
	]) {
		define(Type, "has_side_effects", keyHasSideEffects);
	}
	define(
		A.AST_Array,
		"has_side_effects",
		/**
		 * @this {Node} an array literal
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether building it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.elements, compressor);
		}
	);
	define(
		A.AST_Dot,
		"has_side_effects",
		/**
		 * @this {Node} a property read
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether reading it has effects
		 */
		function has_side_effects(compressor) {
			if (isNullish(this, compressor)) {
				return this.expression.has_side_effects(compressor);
			}
			if (!this.optional && this.expression.may_throw_on_access(compressor)) {
				return true;
			}
			return this.expression.has_side_effects(compressor);
		}
	);
	define(
		A.AST_Sub,
		"has_side_effects",
		/**
		 * @this {Node} a computed property read
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether reading it has effects
		 */
		function has_side_effects(compressor) {
			if (isNullish(this, compressor)) {
				return this.expression.has_side_effects(compressor);
			}
			if (!this.optional && this.expression.may_throw_on_access(compressor)) {
				return true;
			}
			const property = this.property.has_side_effects(compressor);
			// `?.` makes the property's effects conditional.
			if (property && this.optional) return true;
			return property || this.expression.has_side_effects(compressor);
		}
	);
	define(
		A.AST_Chain,
		"has_side_effects",
		/**
		 * @this {Node} an optional chain
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return this.expression.has_side_effects(compressor);
		}
	);
	define(
		A.AST_Sequence,
		"has_side_effects",
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether any expression in it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.expressions, compressor);
		}
	);
	define(
		A.AST_Definitions,
		"has_side_effects",
		/**
		 * @this {Node} a declaration
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether any definition in it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.definitions, compressor);
		}
	);
	define(
		A.AST_VarDef,
		"has_side_effects",
		/**
		 * @this {Node} a definition
		 * @returns {boolean} whether it assigns a value
		 */
		function has_side_effects() {
			return this.value !== null && this.value !== undefined;
		}
	);
	define(A.AST_TemplateSegment, "has_side_effects", returnFalse);
	define(
		A.AST_TemplateString,
		"has_side_effects",
		/**
		 * @this {Node} a template string
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether any part of it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.segments, compressor);
		}
	);

	/**
	 * @param {Node[]} list nodes
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether any may throw
	 */
	const anyMayThrow = (list, compressor) => {
		for (let i = list.length; --i >= 0;) {
			if (list[i].may_throw(compressor)) return true;
		}
		return false;
	};

	// may_throw
	define(A.AST_Node, "may_throw", returnTrue);
	define(A.AST_Constant, "may_throw", returnFalse);
	define(A.AST_EmptyStatement, "may_throw", returnFalse);
	define(A.AST_Lambda, "may_throw", returnFalse);
	define(A.AST_SymbolDeclaration, "may_throw", returnFalse);
	define(A.AST_This, "may_throw", returnFalse);
	define(A.AST_ImportMeta, "may_throw", returnFalse);
	define(
		A.AST_Class,
		"may_throw",
		/**
		 * @this {Node} a class
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether defining it may throw
		 */
		function may_throw(compressor) {
			if (this.extends && this.extends.may_throw(compressor)) return true;
			return anyMayThrow(this.properties, compressor);
		}
	);
	/**
	 * @this {Node} a node holding a `body` list
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether any statement in it may throw
	 */
	function bodyMayThrow(compressor) {
		return anyMayThrow(this.body, compressor);
	}
	define(A.AST_ClassStaticBlock, "may_throw", bodyMayThrow);
	define(
		A.AST_Array,
		"may_throw",
		/**
		 * @this {Node} an array literal
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether building it may throw
		 */
		function may_throw(compressor) {
			return anyMayThrow(this.elements, compressor);
		}
	);
	define(
		A.AST_Assign,
		"may_throw",
		/**
		 * @this {Node} an assignment
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			if (this.right.may_throw(compressor)) return true;
			if (
				!compressor.has_directive("use strict") &&
				this.operator === "=" &&
				this.left instanceof A.AST_SymbolRef
			) {
				return false;
			}
			return this.left.may_throw(compressor);
		}
	);
	define(
		A.AST_Binary,
		"may_throw",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.left.may_throw(compressor) || this.right.may_throw(compressor)
			);
		}
	);
	define(A.AST_Block, "may_throw", bodyMayThrow);
	define(
		A.AST_Call,
		"may_throw",
		/**
		 * @this {Node} a call
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			if (isNullish(this, compressor)) return false;
			if (anyMayThrow(this.args, compressor)) return true;
			if (this.is_callee_pure(compressor)) return false;
			if (this.expression.may_throw(compressor)) return true;
			return (
				!(this.expression instanceof A.AST_Lambda) ||
				anyMayThrow(this.expression.body, compressor)
			);
		}
	);
	define(
		A.AST_Case,
		"may_throw",
		/**
		 * @this {Node} a case
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.expression.may_throw(compressor) ||
				anyMayThrow(this.body, compressor)
			);
		}
	);
	define(
		A.AST_Conditional,
		"may_throw",
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.condition.may_throw(compressor) ||
				this.consequent.may_throw(compressor) ||
				this.alternative.may_throw(compressor)
			);
		}
	);
	define(
		A.AST_Definitions,
		"may_throw",
		/**
		 * @this {Node} a declaration
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether any definition in it may throw
		 */
		function may_throw(compressor) {
			return anyMayThrow(this.definitions, compressor);
		}
	);
	define(
		A.AST_If,
		"may_throw",
		/**
		 * @this {Node} an if statement
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.condition.may_throw(compressor) ||
				(this.body && this.body.may_throw(compressor)) ||
				(this.alternative && this.alternative.may_throw(compressor))
			);
		}
	);
	/**
	 * @this {Node} a statement holding one `body` node
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether its body may throw
	 */
	function innerMayThrow(compressor) {
		return this.body.may_throw(compressor);
	}
	define(A.AST_LabeledStatement, "may_throw", innerMayThrow);
	define(
		A.AST_Object,
		"may_throw",
		/**
		 * @this {Node} an object literal
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether building it may throw
		 */
		function may_throw(compressor) {
			return anyMayThrow(this.properties, compressor);
		}
	);
	define(
		A.AST_ObjectKeyVal,
		"may_throw",
		/**
		 * terser's grouping, kept: the key's check decides only whether the value
		 * is asked.
		 * @this {Node} a property
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (this.computed_key() && this.key.may_throw(compressor)) ||
				this.value
				? this.value.may_throw(compressor)
				: false;
		}
	);
	/**
	 * @this {Node} a class field
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether its key or static value may throw
	 */
	function fieldMayThrow(compressor) {
		return (
			(this.computed_key() && this.key.may_throw(compressor)) ||
			(this.static && this.value && this.value.may_throw(compressor))
		);
	}
	define(A.AST_ClassProperty, "may_throw", fieldMayThrow);
	define(A.AST_ClassPrivateProperty, "may_throw", fieldMayThrow);
	/**
	 * @this {Node} a method or accessor
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether its key may throw
	 */
	function keyMayThrow(compressor) {
		return this.computed_key() && this.key.may_throw(compressor);
	}
	define(A.AST_ConciseMethod, "may_throw", keyMayThrow);
	define(A.AST_ObjectGetter, "may_throw", keyMayThrow);
	define(A.AST_ObjectSetter, "may_throw", keyMayThrow);
	define(A.AST_PrivateMethod, "may_throw", returnFalse);
	define(A.AST_PrivateGetter, "may_throw", returnFalse);
	define(A.AST_PrivateSetter, "may_throw", returnFalse);
	define(
		A.AST_Return,
		"may_throw",
		/**
		 * @this {Node} a return
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether its value may throw
		 */
		function may_throw(compressor) {
			return this.value && this.value.may_throw(compressor);
		}
	);
	define(
		A.AST_Sequence,
		"may_throw",
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether any expression in it may throw
		 */
		function may_throw(compressor) {
			return anyMayThrow(this.expressions, compressor);
		}
	);
	define(A.AST_SimpleStatement, "may_throw", innerMayThrow);
	define(
		A.AST_Dot,
		"may_throw",
		/**
		 * @this {Node} a property read
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether reading it may throw
		 */
		function may_throw(compressor) {
			if (isNullish(this, compressor)) return false;
			return (
				(!this.optional && this.expression.may_throw_on_access(compressor)) ||
				this.expression.may_throw(compressor)
			);
		}
	);
	define(
		A.AST_Sub,
		"may_throw",
		/**
		 * @this {Node} a computed property read
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether reading it may throw
		 */
		function may_throw(compressor) {
			if (isNullish(this, compressor)) return false;
			return (
				(!this.optional && this.expression.may_throw_on_access(compressor)) ||
				this.expression.may_throw(compressor) ||
				this.property.may_throw(compressor)
			);
		}
	);
	define(
		A.AST_Chain,
		"may_throw",
		/**
		 * @this {Node} an optional chain
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return this.expression.may_throw(compressor);
		}
	);
	define(
		A.AST_Switch,
		"may_throw",
		/**
		 * @this {Node} a switch
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.expression.may_throw(compressor) ||
				anyMayThrow(this.body, compressor)
			);
		}
	);
	define(
		A.AST_SymbolRef,
		"may_throw",
		/**
		 * @this {Node} a reference
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether reading it may throw a ReferenceError
		 */
		function may_throw(compressor) {
			return (
				!this.is_declared(compressor) &&
				!purePropertyAccessGlobals.has(this.name)
			);
		}
	);
	define(A.AST_SymbolClassProperty, "may_throw", returnFalse);
	define(
		A.AST_Try,
		"may_throw",
		/**
		 * terser's grouping, kept: a catch decides alone, else the body or finally.
		 * @this {Node} a try statement
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return this.bcatch
				? this.bcatch.may_throw(compressor)
				: this.body.may_throw(compressor) ||
						(this.bfinally && this.bfinally.may_throw(compressor));
		}
	);
	define(
		A.AST_Unary,
		"may_throw",
		/**
		 * @this {Node} a unary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			if (
				this.operator === "typeof" &&
				this.expression instanceof A.AST_SymbolRef
			) {
				return false;
			}
			return this.expression.may_throw(compressor);
		}
	);
	define(
		A.AST_VarDef,
		"may_throw",
		/**
		 * @this {Node} a definition
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether its value may throw
		 */
		function may_throw(compressor) {
			if (!this.value) return false;
			return this.value.may_throw(compressor);
		}
	);

	/**
	 * terser's `all_refs_local`: whether every name a function or class reads is
	 * its own, or, given a scope, one that scope resolves the same way.
	 * @this {Node} the function or class
	 * @param {Scope=} scope the scope it would move to
	 * @returns {boolean | "f"} true, false, or "f" where the scope resolves them
	 */
	function allRefsLocal(scope) {
		/** @type {boolean | "f"} */
		let result = true;
		walk(this, (/** @type {Node} */ node) => {
			if (node instanceof A.AST_SymbolRef) {
				if (hasFlag(this, INLINED)) {
					result = false;
					return walkAbort;
				}
				const definition = node.definition();
				if (
					this.enclosed.includes(definition) &&
					!this.variables.has(definition.name)
				) {
					if (scope) {
						const scopeDefinition = scope.find_variable(node);
						if (
							definition.undeclared
								? !scopeDefinition
								: scopeDefinition === definition
						) {
							result = "f";
							return true;
						}
					}
					result = false;
					return walkAbort;
				}
				return true;
			}
			if (node instanceof A.AST_This && this instanceof A.AST_Arrow) {
				result = false;
				return walkAbort;
			}
		});
		return result;
	}

	// is_constant_expression
	define(A.AST_Node, "is_constant_expression", returnFalse);
	define(A.AST_Constant, "is_constant_expression", returnTrue);
	define(
		A.AST_Class,
		"is_constant_expression",
		/**
		 * @this {Node} a class
		 * @param {Scope=} scope the scope it would move to
		 * @returns {boolean | "f"} whether it is constant
		 */
		function is_constant_expression(scope) {
			if (this.extends && !this.extends.is_constant_expression(scope)) {
				return false;
			}
			for (const property of this.properties) {
				if (
					property.computed_key() &&
					!property.key.is_constant_expression(scope)
				) {
					return false;
				}
				if (
					property.static &&
					property.value &&
					!property.value.is_constant_expression(scope)
				) {
					return false;
				}
				if (property instanceof A.AST_ClassStaticBlock) return false;
			}
			return allRefsLocal.call(this, scope);
		}
	);
	define(A.AST_Lambda, "is_constant_expression", allRefsLocal);
	define(
		A.AST_Unary,
		"is_constant_expression",
		/**
		 * @this {Node} a unary operation
		 * @returns {boolean | "f"} whether it is constant
		 */
		function is_constant_expression() {
			return this.expression.is_constant_expression();
		}
	);
	define(
		A.AST_Binary,
		"is_constant_expression",
		/**
		 * @this {Node} a binary operation
		 * @returns {boolean | "f"} whether it is constant
		 */
		function is_constant_expression() {
			return (
				this.left.is_constant_expression() &&
				this.right.is_constant_expression()
			);
		}
	);
	define(
		A.AST_Array,
		"is_constant_expression",
		/**
		 * @this {Node} an array literal
		 * @returns {boolean} whether it is constant
		 */
		function is_constant_expression() {
			return this.elements.every((/** @type {Node} */ element) =>
				element.is_constant_expression()
			);
		}
	);
	define(
		A.AST_Object,
		"is_constant_expression",
		/**
		 * @this {Node} an object literal
		 * @returns {boolean} whether it is constant
		 */
		function is_constant_expression() {
			return this.properties.every((/** @type {Node} */ property) =>
				property.is_constant_expression()
			);
		}
	);
	define(
		A.AST_ObjectProperty,
		"is_constant_expression",
		/**
		 * @this {Node} a property
		 * @returns {boolean} whether it is constant
		 */
		function is_constant_expression() {
			return Boolean(
				!(this.key instanceof A.AST_Node) &&
				this.value &&
				this.value.is_constant_expression()
			);
		}
	);

	/**
	 * @this {Node} an expression
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether reading a property of it may throw
	 */
	A.AST_Node.prototype.may_throw_on_access = function may_throw_on_access(
		compressor
	) {
		return !compressor.option("pure_getters") || this._dot_throw(compressor);
	};
	/**
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether `pure_getters` is "strict"
	 */
	const isStrict = (compressor) =>
		/strict/.test(compressor.option("pure_getters"));

	// _dot_throw
	define(A.AST_Node, "_dot_throw", isStrict);
	define(A.AST_Null, "_dot_throw", returnTrue);
	define(A.AST_Undefined, "_dot_throw", returnTrue);
	define(A.AST_Constant, "_dot_throw", returnFalse);
	define(A.AST_Array, "_dot_throw", returnFalse);
	define(
		A.AST_Object,
		"_dot_throw",
		/**
		 * @this {Node} an object literal
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether reading a property may run a getter
		 */
		function _dot_throw(compressor) {
			if (!isStrict(compressor)) return false;
			for (let i = this.properties.length; --i >= 0;) {
				if (this.properties[i]._dot_throw(compressor)) return true;
			}
			return false;
		}
	);
	// Classes are trusted not to put throwing static getters in the way.
	define(A.AST_Class, "_dot_throw", returnFalse);
	define(A.AST_ObjectProperty, "_dot_throw", returnFalse);
	define(A.AST_ObjectGetter, "_dot_throw", returnTrue);
	define(
		A.AST_Expansion,
		"_dot_throw",
		/**
		 * @this {Node} a spread
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether what it spreads may throw on access
		 */
		function _dot_throw(compressor) {
			return this.expression._dot_throw(compressor);
		}
	);
	define(A.AST_Function, "_dot_throw", returnFalse);
	define(A.AST_Arrow, "_dot_throw", returnFalse);
	define(A.AST_UnaryPostfix, "_dot_throw", returnFalse);
	define(
		A.AST_UnaryPrefix,
		"_dot_throw",
		/**
		 * @this {Node} a prefix operation
		 * @returns {boolean} whether it yields `undefined`
		 */
		function _dot_throw() {
			return this.operator === "void";
		}
	);
	define(
		A.AST_Binary,
		"_dot_throw",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether either side it may yield throws on access
		 */
		function _dot_throw(compressor) {
			return (
				LAZY_OPERATORS.has(this.operator) &&
				(this.left._dot_throw(compressor) || this.right._dot_throw(compressor))
			);
		}
	);
	define(
		A.AST_Assign,
		"_dot_throw",
		/**
		 * @this {Node} an assignment
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether the value it yields may throw on access
		 */
		function _dot_throw(compressor) {
			if (this.logical) return true;
			return this.operator === "=" && this.right._dot_throw(compressor);
		}
	);
	define(
		A.AST_Conditional,
		"_dot_throw",
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether either branch may throw on access
		 */
		function _dot_throw(compressor) {
			return (
				this.consequent._dot_throw(compressor) ||
				this.alternative._dot_throw(compressor)
			);
		}
	);
	define(
		A.AST_Dot,
		"_dot_throw",
		/**
		 * @this {Node} a property read
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether the value read may throw on access
		 */
		function _dot_throw(compressor) {
			if (!isStrict(compressor)) return false;
			if (this.property === "prototype") {
				return !(
					this.expression instanceof A.AST_Function ||
					this.expression instanceof A.AST_Class
				);
			}
			return true;
		}
	);
	define(
		A.AST_Chain,
		"_dot_throw",
		/**
		 * @this {Node} an optional chain
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether its value may throw on access
		 */
		function _dot_throw(compressor) {
			return this.expression._dot_throw(compressor);
		}
	);
	define(
		A.AST_Sequence,
		"_dot_throw",
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether its value may throw on access
		 */
		function _dot_throw(compressor) {
			return this.tail_node()._dot_throw(compressor);
		}
	);
	define(
		A.AST_SymbolRef,
		"_dot_throw",
		/**
		 * @this {Node} a reference
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean} whether its value may throw on access
		 */
		function _dot_throw(compressor) {
			if (this.name === "arguments" && this.scope instanceof A.AST_Lambda) {
				return false;
			}
			if (hasFlag(this, UNDEFINED)) return true;
			if (!isStrict(compressor)) return false;
			if (isUndeclaredRef(this) && this.is_declared(compressor)) return false;
			if (this.is_immutable()) return false;
			const fixed = this.fixed_value();
			return !fixed || fixed._dot_throw(compressor);
		}
	);

	/**
	 * @param {Node} expression an expression
	 * @returns {Node} `!expression`
	 */
	const basicNegation = (expression) =>
		makeNode(A.AST_UnaryPrefix, expression, {
			operator: "!",
			expression
		});
	/**
	 * @param {Node} original the expression negated
	 * @param {Node} alternative its negation rewritten
	 * @param {boolean=} firstInStatement whether it starts a statement
	 * @returns {Node} the shorter negation
	 */
	const bestNegation = (original, alternative, firstInStatement) => {
		const negated = basicNegation(original);
		if (firstInStatement) {
			const statement = makeNode(A.AST_SimpleStatement, alternative, {
				body: alternative
			});
			return bestOfExpression(negated, statement) === statement
				? alternative
				: negated;
		}
		return bestOfExpression(negated, alternative);
	};
	/**
	 * @this {Node} an expression
	 * @returns {Node} `!` it
	 */
	function negateBasic() {
		return basicNegation(this);
	}

	// negate
	define(A.AST_Node, "negate", negateBasic);
	define(
		A.AST_Statement,
		"negate",
		/**
		 * @returns {never} never: a statement has no value to negate
		 */
		() => {
			throw new Error("Cannot negate a statement");
		}
	);
	define(A.AST_Function, "negate", negateBasic);
	define(A.AST_Class, "negate", negateBasic);
	define(A.AST_Arrow, "negate", negateBasic);
	define(
		A.AST_UnaryPrefix,
		"negate",
		/**
		 * @this {Node} a prefix operation
		 * @returns {Node} its negation
		 */
		function negate() {
			if (this.operator === "!") return this.expression;
			return basicNegation(this);
		}
	);
	define(
		A.AST_Sequence,
		"negate",
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {Node} it, its last expression negated
		 */
		function negate(compressor) {
			const expressions = [...this.expressions];
			expressions.push(
				/** @type {Node} */ (expressions.pop()).negate(compressor)
			);
			return makeSequence(this, expressions);
		}
	);
	define(
		A.AST_Conditional,
		"negate",
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node} its negation
		 */
		function negate(compressor, firstInStatement) {
			const self = this.clone();
			self.consequent = self.consequent.negate(compressor);
			self.alternative = self.alternative.negate(compressor);
			return bestNegation(this, self, firstInStatement);
		}
	);
	define(
		A.AST_Binary,
		"negate",
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node} its negation
		 */
		function negate(compressor, firstInStatement) {
			const self = this.clone();
			const operator = this.operator;
			if (compressor.option("unsafe_comps")) {
				switch (operator) {
					case "<=":
						self.operator = ">";
						return self;
					case "<":
						self.operator = ">=";
						return self;
					case ">=":
						self.operator = "<";
						return self;
					case ">":
						self.operator = "<=";
						return self;
				}
			}
			switch (operator) {
				case "==":
					self.operator = "!=";
					return self;
				case "!=":
					self.operator = "==";
					return self;
				case "===":
					self.operator = "!==";
					return self;
				case "!==":
					self.operator = "===";
					return self;
				case "&&":
				case "||":
					self.operator = operator === "&&" ? "||" : "&&";
					self.left = self.left.negate(compressor, firstInStatement);
					self.right = self.right.negate(compressor);
					return bestNegation(this, self, firstInStatement);
			}
			return basicNegation(this);
		}
	);

	/**
	 * @param {Node} expression an expression
	 * @returns {Node} `~expression`
	 */
	const basicBitwiseNegation = (expression) =>
		makeNode(A.AST_UnaryPrefix, expression, {
			operator: "~",
			expression
		});

	// bitwise_negate
	define(
		A.AST_Node,
		"bitwise_negate",
		/**
		 * @this {Node} an expression
		 * @returns {Node} `~` it
		 */
		function bitwise_negate() {
			return basicBitwiseNegation(this);
		}
	);
	define(
		A.AST_Number,
		"bitwise_negate",
		/**
		 * @this {Node} a number
		 * @returns {Node} its complement, where no longer than `~` it
		 */
		function bitwise_negate() {
			const negated = ~this.value;
			if (negated.toString().length > this.value.toString().length) {
				return basicBitwiseNegation(this);
			}
			return makeNode(A.AST_Number, this, { value: negated });
		}
	);
	define(
		A.AST_UnaryPrefix,
		"bitwise_negate",
		/**
		 * @this {Node} a prefix operation
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} in32BitContext whether its value is read as 32 bits
		 * @returns {Node} its complement
		 */
		function bitwise_negate(compressor, in32BitContext) {
			if (
				this.operator === "~" &&
				(this.expression.is_32_bit_integer(compressor) ||
					(in32BitContext !== null && in32BitContext !== undefined
						? in32BitContext
						: compressor.in_32_bit_context()))
			) {
				return this.expression;
			}
			return basicBitwiseNegation(this);
		}
	);

	/**
	 * @this {Node} a call
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether the function it calls is pure
	 */
	A.AST_Call.prototype.is_callee_pure = function is_callee_pure(compressor) {
		if (compressor.option("unsafe")) {
			const expression = this.expression;
			let firstArgument;
			if (
				expression.expression &&
				expression.expression.name === "hasOwnProperty" &&
				((firstArgument =
					this.args && this.args[0] && this.args[0].evaluate(compressor)) ===
					null ||
					firstArgument === undefined ||
					(firstArgument.thedef && firstArgument.thedef.undeclared))
			) {
				return false;
			}
			if (
				isUndeclaredRef(expression) &&
				GLOBAL_PURE_FUNCTIONS.has(expression.name)
			) {
				return true;
			}
			if (isPureBuiltinCall(compressor, this)) return true;
		} else if (
			compressor.option("builtins_pure") &&
			isPureBuiltinCall(compressor, this)
		) {
			return true;
		}
		if (this instanceof A.AST_New && compressor.option("pure_new")) return true;
		if (compressor.option("side_effects") && hasAnnotation(this, _PURE)) {
			return true;
		}
		return !compressor.pure_funcs(this);
	};

	define(A.AST_Node, "is_call_pure", returnFalse);
	define(
		A.AST_Dot,
		"is_call_pure",
		/**
		 * @this {Node} a method read
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {boolean | undefined} whether calling it is pure
		 */
		function is_call_pure(compressor) {
			if (!compressor.option("unsafe")) return;
			const expression = this.expression;
			let nativeObject;
			if (expression instanceof A.AST_Array) {
				nativeObject = "Array";
			} else if (expression.is_boolean()) {
				nativeObject = "Boolean";
			} else if (expression.is_number(compressor)) {
				nativeObject = "Number";
			} else if (expression instanceof A.AST_RegExp) {
				nativeObject = "RegExp";
			} else if (expression.is_string(compressor)) {
				nativeObject = "String";
			} else if (!this.may_throw_on_access(compressor)) {
				nativeObject = "Object";
			}
			return (
				nativeObject !== undefined &&
				compressor.is_pure_native_method(nativeObject, this.property)
			);
		}
	);

	/**
	 * @param {Node | null | undefined} thing a statement
	 * @returns {Node | null | undefined} what ends it, if it always ends
	 */
	const statementAborts = (thing) => thing && thing.aborts();
	/**
	 * @this {Node} a block
	 * @returns {Node | null} the statement that ends it, if one does
	 */
	function blockAborts() {
		for (let i = 0; i < this.body.length; i++) {
			if (statementAborts(this.body[i])) return this.body[i];
		}
		return null;
	}

	// aborts
	/**
	 * @returns {null} null
	 */
	const returnNull = () => null;
	define(A.AST_Statement, "aborts", returnNull);
	define(
		A.AST_Jump,
		"aborts",
		/**
		 * @this {Node} a jump
		 * @returns {Node} itself
		 */
		function aborts() {
			return this;
		}
	);
	define(A.AST_Import, "aborts", returnNull);
	define(A.AST_BlockStatement, "aborts", blockAborts);
	define(A.AST_SwitchBranch, "aborts", blockAborts);
	define(
		A.AST_DefClass,
		"aborts",
		/**
		 * @this {Node} a class declaration
		 * @returns {Node | null} the static block that ends it, if one does
		 */
		function aborts() {
			for (const property of this.properties) {
				if (property instanceof A.AST_ClassStaticBlock && property.aborts()) {
					return property;
				}
			}
			return null;
		}
	);
	define(A.AST_ClassStaticBlock, "aborts", blockAborts);
	define(
		A.AST_If,
		"aborts",
		/**
		 * @this {Node} an if statement
		 * @returns {Node | null | false | undefined} itself, where both branches end
		 */
		function aborts() {
			return (
				this.alternative &&
				statementAborts(this.body) &&
				statementAborts(this.alternative) &&
				this
			);
		}
	);

	/**
	 * @this {Node} a node
	 * @returns {boolean} whether it reads `this` outside a nested function
	 */
	A.AST_Node.prototype.contains_this = function contains_this() {
		return walk(this, (/** @type {Node} */ node) => {
			if (node instanceof A.AST_This) return walkAbort;
			if (
				node !== this &&
				node instanceof A.AST_Scope &&
				!(node instanceof A.AST_Arrow)
			) {
				return true;
			}
		});
	};
};

// The xxhash64 of terser's `compress/drop-side-effect-free.js`, each run of
// whitespace read as one space: the one version the phase below reproduces.
const TERSER_DROP_SIDE_EFFECT_FREE = "547528cdeaf1c392";

/**
 * Whether terser's `compress/drop-side-effect-free.js` is still the one the
 * phase below reproduces, and the helpers it reads are where it reads them.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const dropSideEffectFreeFits = ({
	ast,
	common,
	flags,
	inference,
	nativeObjects,
	utils
}) => {
	if (
		!ast ||
		!common ||
		!flags ||
		!inference ||
		!nativeObjects ||
		!utils ||
		typeof inference.is_nullish_shortcircuited !== "function" ||
		!(nativeObjects.pure_prop_access_globals instanceof Set) ||
		typeof ast.AST_Node !== "function" ||
		typeof ast.AST_Node.prototype.drop_side_effect_free !== "function" ||
		typeof common.is_func_expr !== "function" ||
		typeof common.is_iife_call !== "function" ||
		typeof flags.set_flag !== "function" ||
		typeof flags.clear_flag !== "function"
	) {
		return false;
	}

	const fs = require("fs");
	const path = require("path");

	return (
		hashTerserSource(
			fs.readFileSync(
				path.join(
					path.dirname(require.resolve("terser/package.json")),
					"lib/compress/drop-side-effect-free.js"
				),
				"utf8"
			)
		) === TERSER_DROP_SIDE_EFFECT_FREE
	);
};

/**
 * Installs webpack's `drop_side_effect_free`: what is left of an expression
 * whose value nobody reads, or null when nothing is.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installDropSideEffectFree = ({
	ast,
	common,
	flags,
	inference,
	nativeObjects,
	utils
}) => {
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (ast);
	const { is_nullish_shortcircuited: isNullishShortCircuited } = inference;
	const { pure_prop_access_globals: purePropertyAccessGlobals } = nativeObjects;
	const {
		make_sequence: makeSequence,
		is_func_expr: isFunctionExpression,
		is_iife_call: isIifeCall
	} = common;
	const { WRITE_ONLY, set_flag: setFlag, clear_flag: clearFlag } = flags;

	/**
	 * @param {EXPECTED_ANY} Type a node class
	 * @param {EXPECTED_FUNCTION} method the method
	 * @returns {void}
	 */
	const define = (Type, method) => {
		Type.prototype.drop_side_effect_free = method;
	};
	/**
	 * @returns {null} null
	 */
	const returnNull = () => null;

	/**
	 * terser's `trim`: the expressions of a list that keep effects.
	 * @param {Node[]} nodes the expressions
	 * @param {TerserCompressor} compressor the compressor
	 * @param {boolean=} firstInStatement whether the first starts a statement
	 * @returns {Node[] | null} what is left, the list itself when nothing changed
	 */
	const trim = (nodes, compressor, firstInStatement) => {
		const length = nodes.length;
		if (!length) return null;
		/** @type {Node[]} */
		const kept = [];
		let changed = false;
		for (let i = 0; i < length; i++) {
			const node = nodes[i].drop_side_effect_free(compressor, firstInStatement);
			if (node !== nodes[i]) changed = true;
			if (node) {
				kept.push(node);
				firstInStatement = false;
			}
		}
		if (!changed) return nodes;
		return kept.length ? kept : null;
	};

	define(
		A.AST_Node,
		/**
		 * @this {Node} an expression
		 * @returns {Node} itself
		 */
		function drop_side_effect_free() {
			return this;
		}
	);
	define(A.AST_Constant, returnNull);
	define(A.AST_This, returnNull);
	define(
		A.AST_Call,
		/**
		 * @this {Node} a call
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (isNullishShortCircuited(this, compressor)) {
				return this.expression.drop_side_effect_free(
					compressor,
					firstInStatement
				);
			}
			if (!this.is_callee_pure(compressor)) {
				if (this.expression.is_call_pure(compressor)) {
					const kept = trim(
						[this.expression.expression, ...this.args],
						compressor,
						firstInStatement
					);
					return kept && makeSequence(this, kept);
				}
				if (
					isFunctionExpression(this.expression) &&
					(!this.expression.name ||
						!this.expression.name.definition().references.length)
				) {
					// A shallow clone: the callee itself is what drops its value.
					const node = this.clone();
					node.expression.process_expression(false, compressor);
					return node;
				}
				return this;
			}
			const args = trim(this.args, compressor, firstInStatement);
			return args && makeSequence(this, args);
		}
	);
	define(
		A.AST_DynamicImport,
		/**
		 * @this {Node} a dynamic import
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (this.phase !== "source") return this;
			const args = trim(this.args, compressor, firstInStatement);
			return args && makeSequence(this, args);
		}
	);
	define(A.AST_Accessor, returnNull);
	define(A.AST_Function, returnNull);
	define(A.AST_Arrow, returnNull);
	define(
		A.AST_Class,
		/**
		 * @this {Node} a class
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			/** @type {Node[]} */
			const withEffects = [];
			if (this.is_self_referential() && this.has_side_effects(compressor)) {
				return this;
			}
			const trimmedExtends =
				this.extends && this.extends.drop_side_effect_free(compressor);
			if (trimmedExtends) withEffects.push(trimmedExtends);
			for (const property of this.properties) {
				if (property instanceof A.AST_ClassStaticBlock) {
					if (property.has_side_effects(compressor)) return this;
				} else {
					const trimmed = property.drop_side_effect_free(compressor);
					if (trimmed) withEffects.push(trimmed);
				}
			}
			if (!withEffects.length) return null;
			const expressions = makeSequence(this, withEffects);
			if (this instanceof A.AST_DefClass) {
				return makeNode(A.AST_SimpleStatement, this, { body: expressions });
			}
			return expressions;
		}
	);
	/**
	 * @this {Node} a class field
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node | null} what is left of its key and static value
	 */
	function dropField(compressor) {
		const key =
			this.computed_key() && this.key.drop_side_effect_free(compressor);
		const value =
			this.static && this.value && this.value.drop_side_effect_free(compressor);
		if (key && value) return makeSequence(this, [key, value]);
		return key || value || null;
	}
	define(A.AST_ClassProperty, dropField);
	define(A.AST_ClassPrivateProperty, dropField);
	define(
		A.AST_Binary,
		/**
		 * @this {Node} a binary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			const right = this.right.drop_side_effect_free(compressor);
			if (!right) {
				return this.left.drop_side_effect_free(compressor, firstInStatement);
			}
			if (LAZY_OPERATORS.has(this.operator)) {
				if (right === this.right) return this;
				const node = this.clone();
				node.right = right;
				return node;
			}
			const left = this.left.drop_side_effect_free(
				compressor,
				firstInStatement
			);
			if (!left) {
				return this.right.drop_side_effect_free(compressor, firstInStatement);
			}
			return makeSequence(this, [left, right]);
		}
	);
	define(
		A.AST_Assign,
		/**
		 * @this {Node} an assignment
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			if (this.logical) return this;
			let left = this.left;
			if (
				left.has_side_effects(compressor) ||
				(compressor.has_directive("use strict") &&
					left instanceof A.AST_PropAccess &&
					left.expression.is_constant())
			) {
				return this;
			}
			setFlag(this, WRITE_ONLY);
			while (left instanceof A.AST_PropAccess) left = left.expression;
			if (left.is_constant_expression(compressor.find_parent(A.AST_Scope))) {
				return this.right.drop_side_effect_free(compressor);
			}
			return this;
		}
	);
	define(
		A.AST_Conditional,
		/**
		 * @this {Node} a conditional
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			const consequent = this.consequent.drop_side_effect_free(compressor);
			const alternative = this.alternative.drop_side_effect_free(compressor);
			if (consequent === this.consequent && alternative === this.alternative) {
				return this;
			}
			if (!consequent) {
				return alternative
					? makeNode(A.AST_Binary, this, {
							operator: "||",
							left: this.condition,
							right: alternative
						})
					: this.condition.drop_side_effect_free(compressor);
			}
			if (!alternative) {
				return makeNode(A.AST_Binary, this, {
					operator: "&&",
					left: this.condition,
					right: consequent
				});
			}
			const node = this.clone();
			node.consequent = consequent;
			node.alternative = alternative;
			return node;
		}
	);
	define(
		A.AST_Unary,
		/**
		 * @this {Node} a unary operation
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (UNARY_SIDE_EFFECTS.has(this.operator)) {
				if (this.expression.has_side_effects(compressor)) {
					clearFlag(this, WRITE_ONLY);
				} else {
					setFlag(this, WRITE_ONLY);
				}
				return this;
			}
			if (
				this.operator === "typeof" &&
				this.expression instanceof A.AST_SymbolRef
			) {
				return null;
			}
			const expression = this.expression.drop_side_effect_free(
				compressor,
				firstInStatement
			);
			if (firstInStatement && expression && isIifeCall(expression)) {
				if (expression === this.expression && this.operator === "!") {
					return this;
				}
				return expression.negate(compressor, firstInStatement);
			}
			return expression;
		}
	);
	define(
		A.AST_SymbolRef,
		/**
		 * @this {Node} a reference
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {Node | null} itself, where reading it may throw
		 */
		function drop_side_effect_free(compressor) {
			return this.is_declared(compressor) ||
				purePropertyAccessGlobals.has(this.name)
				? null
				: this;
		}
	);
	define(
		A.AST_Object,
		/**
		 * @this {Node} an object literal
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			const values = trim(this.properties, compressor, firstInStatement);
			return values && makeSequence(this, values);
		}
	);
	define(
		A.AST_ObjectKeyVal,
		/**
		 * @this {Node} a property
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left of its key and value
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			const key =
				this.key instanceof A.AST_Node &&
				this.key.drop_side_effect_free(compressor, firstInStatement);
			const value = this.value.drop_side_effect_free(
				compressor,
				firstInStatement
			);
			if (key && value) return makeSequence(this, [key, value]);
			return key || value;
		}
	);
	/**
	 * @this {Node} a method or accessor
	 * @param {TerserCompressor} compressor the compressor
	 * @param {boolean=} firstInStatement whether it starts a statement
	 * @returns {Node | null} what is left of its key
	 */
	function dropMethod(compressor, firstInStatement) {
		return this.computed_key()
			? this.key.drop_side_effect_free(compressor, firstInStatement)
			: null;
	}
	define(A.AST_ConciseMethod, dropMethod);
	define(A.AST_ObjectGetter, dropMethod);
	define(A.AST_ObjectSetter, dropMethod);
	define(A.AST_PrivateMethod, returnNull);
	define(A.AST_PrivateGetter, returnNull);
	define(A.AST_PrivateSetter, returnNull);
	define(
		A.AST_Array,
		/**
		 * @this {Node} an array literal
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			const values = trim(this.elements, compressor, firstInStatement);
			return values && makeSequence(this, values);
		}
	);
	define(
		A.AST_Dot,
		/**
		 * @this {Node} a property read
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (
				!isNullishShortCircuited(this, compressor) &&
				!this.optional &&
				this.expression.may_throw_on_access(compressor)
			) {
				return this;
			}
			return this.expression.drop_side_effect_free(
				compressor,
				firstInStatement
			);
		}
	);
	define(
		A.AST_Sub,
		/**
		 * @this {Node} a computed property read
		 * @param {TerserCompressor} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (isNullishShortCircuited(this, compressor)) {
				return this.expression.drop_side_effect_free(
					compressor,
					firstInStatement
				);
			}
			if (!this.optional && this.expression.may_throw_on_access(compressor)) {
				return this;
			}
			const property = this.property.drop_side_effect_free(compressor);
			if (property && this.optional) return this;
			const expression = this.expression.drop_side_effect_free(
				compressor,
				firstInStatement
			);
			if (expression && property) {
				return makeSequence(this, [expression, property]);
			}
			return expression || property;
		}
	);
	/**
	 * @this {Node} a chain or a spread
	 * @param {TerserCompressor} compressor the compressor
	 * @param {boolean=} firstInStatement whether it starts a statement
	 * @returns {Node | null} what is left of its expression
	 */
	function dropInner(compressor, firstInStatement) {
		return this.expression.drop_side_effect_free(compressor, firstInStatement);
	}
	define(A.AST_Chain, dropInner);
	define(
		A.AST_Sequence,
		/**
		 * @this {Node} a sequence
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			const last = this.tail_node();
			const expression = last.drop_side_effect_free(compressor);
			if (expression === last) return this;
			const expressions = this.expressions.slice(0, -1);
			if (expression) expressions.push(expression);
			if (!expressions.length) {
				return makeNode(A.AST_Number, this, { value: 0 });
			}
			return makeSequence(this, expressions);
		}
	);
	define(A.AST_Expansion, dropInner);
	define(A.AST_TemplateSegment, returnNull);
	define(
		A.AST_TemplateString,
		/**
		 * terser hands its segments a truthy `first_in_statement`, kept here.
		 * @this {Node} a template string
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			const values = trim(this.segments, compressor, true);
			return values && makeSequence(this, values);
		}
	);
};

/**
 * Creates terser's `tighten_body`, which joins, reorders and drops the
 * statements of a block and folds assignments into their first use.
 * @param {TerserModules} modules terser's modules
 * @returns {{ tightenBody: OptimizerHelpers["tightenBody"], extractFromUnreachableCode: OptimizerHelpers["extractFromUnreachableCode"] }} terser's `tighten_body` and `extract_from_unreachable_code`
 */
const createTightenBody = (modules) => {
	const { ast, common, flags, inference, nativeObjects, utils } = modules;
	const {
		AST_Array,
		AST_Arrow,
		AST_Assign,
		AST_Await,
		AST_Binary,
		AST_Block,
		AST_BlockStatement,
		AST_Break,
		AST_Call,
		AST_Case,
		AST_Chain,
		AST_Class,
		AST_Conditional,
		AST_Constant,
		AST_Continue,
		AST_Debugger,
		AST_Default,
		AST_Definitions,
		AST_DefinitionsLike,
		AST_Defun,
		AST_Destructuring,
		AST_Directive,
		AST_Dot,
		AST_DWLoop,
		AST_EmptyStatement,
		AST_Exit,
		AST_Expansion,
		AST_Export,
		AST_For,
		AST_ForIn,
		AST_If,
		AST_Import,
		AST_IterationStatement,
		AST_Lambda,
		AST_LoopControl,
		AST_Node,
		AST_Number,
		AST_Object,
		AST_ObjectKeyVal,
		AST_ObjectProperty,
		AST_PropAccess,
		AST_RegExp,
		AST_Return,
		AST_Scope,
		AST_Sequence,
		AST_SimpleStatement,
		AST_Sub,
		AST_Switch,
		AST_Symbol,
		AST_SymbolConst,
		AST_SymbolDeclaration,
		AST_SymbolDefun,
		AST_SymbolFunarg,
		AST_SymbolLambda,
		AST_SymbolLet,
		AST_SymbolRef,
		AST_SymbolUsing,
		AST_SymbolVar,
		AST_This,
		AST_Try,
		AST_TryBlock,
		AST_Unary,
		AST_UnaryPostfix,
		AST_UnaryPrefix,
		AST_Using,
		AST_Var,
		AST_VarDef,
		AST_With,
		AST_Yield,
		TreeTransformer,
		TreeWalker,
		walk,
		walk_abort: walkAbort,
		_NOINLINE
	} = ast;
	const {
		make_void_0: makeVoidZero,
		MAP,
		member,
		remove,
		has_annotation: hasAnnotation
	} = utils;
	const { pure_prop_access_globals: purePropertyAccessGlobals } = nativeObjects;
	const {
		lazy_op: lazyOperators,
		unary_side_effects: unarySideEffects,
		is_modified: isModified,
		is_lhs: isLhs,
		aborts
	} = inference;
	const { WRITE_ONLY, clear_flag: clearFlag } = flags;
	const {
		make_sequence: makeSequence,
		merge_sequence: mergeSequence,
		maintain_this_binding: maintainThisBinding,
		is_func_expr: isFunctionExpression,
		is_identifier_atom: isIdentifierAtom,
		is_ref_of: isRefOf,
		can_be_evicted_from_block: canBeEvictedFromBlock,
		as_statement_array: asStatementArray
	} = common;

	/**
	 * terser's `loop_body`.
	 * @param {Node} node a statement
	 * @returns {Node} the block a loop's `continue` ends, or the statement itself
	 */
	const loopBody = (node) => {
		if (node instanceof AST_IterationStatement) {
			return node.body instanceof AST_BlockStatement ? node.body : node;
		}
		return node;
	};

	/**
	 * terser's `is_lhs_read_only`.
	 * @param {Node} lhs an assignment's target
	 * @returns {boolean} whether assigning to it does nothing or throws
	 */
	const isLhsReadOnly = (lhs) => {
		if (lhs instanceof AST_This) return true;
		if (lhs instanceof AST_SymbolRef) {
			return lhs.definition().orig[0] instanceof AST_SymbolLambda;
		}
		if (lhs instanceof AST_PropAccess) {
			let object = lhs.expression;
			if (object instanceof AST_SymbolRef) {
				if (object.is_immutable()) return false;
				object = object.fixed_value();
			}
			if (!object) return true;
			if (object instanceof AST_RegExp) return false;
			if (object instanceof AST_Constant) return true;
			return isLhsReadOnly(object);
		}
		return false;
	};

	/**
	 * terser's `remove_initializers`: `var a = 1` becomes `var a`.
	 * @param {Node} varStatement a `var` statement
	 * @returns {Node | null} the statement without values, or null when it declares nothing
	 */
	const removeInitializers = (varStatement) => {
		/** @type {Node[]} */
		const declarations = [];
		for (const definition of varStatement.definitions) {
			if (definition.name instanceof AST_SymbolDeclaration) {
				definition.value = null;
				declarations.push(definition);
			} else {
				for (const name of definition.declarations_as_names()) {
					declarations.push(
						makeNode(AST_VarDef, definition, {
							name,
							value: null
						})
					);
				}
			}
		}
		return declarations.length
			? makeNode(AST_Var, varStatement, { definitions: declarations })
			: null;
	};

	/**
	 * terser's `extract_from_unreachable_code`: what code that never runs still
	 * declares or exports, moved into a list.
	 * @param {TerserCompressor} compressor the compressor
	 * @param {Node} statement the unreachable statement
	 * @param {Node[]} target where what it declares goes
	 * @returns {void}
	 */
	const extractFromUnreachableCode = (compressor, statement, target) => {
		walk(statement, (/** @type {Node} */ node) => {
			if (node instanceof AST_Var) {
				const noInitializers = removeInitializers(node);
				if (noInitializers) target.push(noInitializers);
				return true;
			}
			if (
				node instanceof AST_Defun &&
				(node === statement || !compressor.has_directive("use strict"))
			) {
				target.push(
					node === statement
						? node
						: makeNode(AST_Var, node, {
								definitions: [
									makeNode(AST_VarDef, node, {
										name: makeNode(AST_SymbolVar, node.name, node.name),
										value: null
									})
								]
							})
				);
				return true;
			}
			if (node instanceof AST_Export || node instanceof AST_Import) {
				target.push(node);
				return true;
			}
			// Nested scopes are not entered.
			if (node instanceof AST_Scope || node instanceof AST_Class) {
				return true;
			}
		});
	};

	/**
	 * terser's `find_loop_scope_try`.
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {{ inLoop: boolean, inTry: boolean }} whether the node visited sits in a loop or a `try` block of its scope
	 */
	const findLoopScopeTry = (compressor) => {
		let node = compressor.self();
		let level = 0;
		let inLoop = false;
		let inTry = false;
		do {
			if (node instanceof AST_IterationStatement) {
				inLoop = true;
			} else if (node instanceof AST_Scope) {
				break;
			} else if (node instanceof AST_TryBlock) {
				inTry = true;
			}
		} while ((node = compressor.parent(level++)));
		return { inLoop, inTry };
	};

	/**
	 * terser's `declarations_only`.
	 * @param {Node} node a definitions statement
	 * @returns {boolean} whether none of its definitions has a value
	 */
	const declarationsOnly = (node) =>
		node.definitions.every((/** @type {Node} */ varDef) => !varDef.value);

	/**
	 * terser's `to_simple_statement`: the one statement of a block, its `var`
	 * declarations moved out.
	 * @param {Node} block a branch of an `if`
	 * @param {Node[]} declarations where its declarations go
	 * @returns {Node | null | false} the statement, or false when there is more than one
	 */
	const toSimpleStatement = (block, declarations) => {
		if (!(block instanceof AST_BlockStatement)) return block;
		let statement = null;
		for (let i = 0, length = block.body.length; i < length; i++) {
			const line = block.body[i];
			if (line instanceof AST_Var && declarationsOnly(line)) {
				declarations.push(line);
			} else if (
				statement ||
				(line instanceof AST_DefinitionsLike && !(line instanceof AST_Var))
			) {
				return false;
			} else {
				statement = line;
			}
		}
		return statement;
	};

	/**
	 * terser's `arg_is_injectable`.
	 * @param {Node} argument an argument of a call
	 * @returns {boolean} whether it can become a parameter's value
	 */
	const argIsInjectable = (argument) => {
		if (argument instanceof AST_Expansion) return false;
		const containsAwait = walk(argument, (/** @type {Node} */ node) => {
			if (node instanceof AST_Await) return walkAbort;
		});
		if (containsAwait) return false;
		return true;
	};

	/**
	 * terser's `redefined_within_scope`.
	 * @param {SymbolDefinition} definition a variable
	 * @param {Scope} scope a scope around its own
	 * @returns {boolean} whether a scope between them declares its name again
	 */
	const redefinedWithinScope = (definition, scope) => {
		if (definition.global) return false;
		let current = definition.scope;
		while (current && current !== scope) {
			if (current.variables.has(definition.name)) {
				return true;
			}
			current = current.parent_scope;
		}
		return false;
	};

	/**
	 * terser's `get_rvalue`.
	 * @param {Node} expression an assignment or a definition
	 * @returns {Node} the value it assigns
	 */
	const getRvalue = (expression) =>
		expression instanceof AST_Assign ? expression.right : expression.value;

	/**
	 * `value != name`, which terser compares keys with: a key is a string, a node
	 * or missing, and a node reads as `"[object Object]"`.
	 * @param {EXPECTED_ANY} value a key, or a key's name
	 * @param {string} name a property name
	 * @returns {boolean} whether they differ loosely
	 */
	const differsLoosely = (value, name) => value != name; // eslint-disable-line eqeqeq

	/**
	 * terser's `tighten_body`: repeats the statement optimizations over a list
	 * until one pass changes nothing, ten passes at most.
	 * @param {Node[]} statements the statements, changed in place
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {void}
	 */
	const tightenBody = (statements, compressor) => {
		const nearestScope = compressor.find_scope();
		const defunScope = nearestScope.get_defun_scope();
		const { inLoop, inTry } = findLoopScopeTry(compressor);

		let changed = false;
		let maxIterations = 10;
		do {
			changed = false;
			eliminateSpuriousBlocks(statements);
			if (compressor.option("dead_code")) {
				eliminateDeadCode(statements, compressor);
			}
			if (compressor.option("if_return")) {
				handleIfReturn(statements, compressor);
			}
			if (compressor.sequences_limit > 0) {
				joinIntoSequences(statements, compressor);
				joinSequencesIntoStatements(statements, compressor);
			}
			if (compressor.option("join_vars")) {
				joinConsecutiveVars(statements);
			}
			if (compressor.option("collapse_vars")) {
				collapse(statements, compressor);
			}
		} while (changed && maxIterations-- > 0);

		/**
		 * terser's `collapse`: from the last statement back, folds each assignment
		 * into the first use of its target, never into or past a branch or loop.
		 * @param {Node[]} statements the statements
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {void}
		 */
		function collapse(statements, compressor) {
			if (nearestScope.pinned() || defunScope.pinned()) return;
			/** @type {Node[] | undefined} */
			let iifeArguments;
			/** @type {Node[][]} */
			const candidates = [];
			let statementIndex = statements.length;
			// The candidate scanned and what the transformers know of it: terser's
			// function-scoped `var`s, which its closures share across candidates.
			/** @type {Node[]} */
			let hitStack = [];
			let hitIndex = 0;
			/** @type {Node} */
			let candidate;
			/** @type {SymbolDefinition | null | undefined} */
			let valueDefinition = null;
			/** @type {Node | null} */
			let stopAfter = null;
			/** @type {Node | null} */
			let stopIfHit = null;
			/** @type {Node} */
			let lhs;
			/** @type {Map<string, { definition: SymbolDefinition, modified: boolean }>} */
			let leftValues = new Map();
			let lhsLocal = false;
			let sideEffects = false;
			let replaceAll = false;
			let mayThrow = false;
			let funarg = false;
			let hit = false;
			let abort = false;
			let replaced = 0;
			let canReplace = false;
			/** @type {SymbolDefinition} */
			let definition;

			const scanner = new TreeTransformer(
				/**
				 * @param {Node} node the node visited
				 * @returns {Node | undefined} the node or what replaces it, undefined to descend
				 */
				(node) => {
					if (abort) return node;
					// Skip nodes before `candidate` as quickly as possible.
					if (!hit) {
						if (node !== hitStack[hitIndex]) return node;
						hitIndex++;
						if (hitIndex < hitStack.length) {
							return handleCustomScanOrder(node);
						}
						hit = true;
						stopAfter = findStop(node, 0);
						if (stopAfter === node) abort = true;
						return node;
					}
					// Stop immediately if these node types are encountered.
					const parent = scanner.parent();
					if (
						(node instanceof AST_Assign &&
							(node.logical ||
								(node.operator !== "=" && lhs.equivalent_to(node.left)))) ||
						node instanceof AST_Await ||
						node instanceof AST_Using ||
						(node instanceof AST_Call &&
							lhs instanceof AST_PropAccess &&
							lhs.equivalent_to(node.expression)) ||
						((node instanceof AST_Call || node instanceof AST_PropAccess) &&
							node.optional) ||
						node instanceof AST_Debugger ||
						node instanceof AST_Destructuring ||
						(node instanceof AST_Expansion &&
							node.expression instanceof AST_Symbol &&
							(node.expression instanceof AST_This ||
								node.expression.definition().references.length > 1)) ||
						(node instanceof AST_IterationStatement &&
							!(node instanceof AST_For)) ||
						node instanceof AST_LoopControl ||
						node instanceof AST_Try ||
						node instanceof AST_With ||
						node instanceof AST_Yield ||
						node instanceof AST_Export ||
						node instanceof AST_Class ||
						(parent instanceof AST_For && node !== parent.init) ||
						(!replaceAll &&
							node instanceof AST_SymbolRef &&
							!node.is_declared(compressor) &&
							// Likely a terser bug: a set of names asked for a node is never true.
							!purePropertyAccessGlobals.has(node)) ||
						(node instanceof AST_SymbolRef &&
							parent instanceof AST_Call &&
							hasAnnotation(parent, _NOINLINE)) ||
						(node instanceof AST_ObjectProperty && node.key instanceof AST_Node)
					) {
						abort = true;
						return node;
					}
					// Stop only if candidate is found within conditional branches.
					if (
						!stopIfHit &&
						(!lhsLocal || !replaceAll) &&
						((parent instanceof AST_Binary &&
							lazyOperators.has(parent.operator) &&
							parent.left !== node) ||
							(parent instanceof AST_Conditional &&
								parent.condition !== node) ||
							(parent instanceof AST_If && parent.condition !== node))
					) {
						stopIfHit = parent;
					}
					// Replace variable with assignment when found.
					if (
						canReplace &&
						!(node instanceof AST_SymbolDeclaration) &&
						lhs.equivalent_to(node) &&
						!shadows(scanner.find_scope() || nearestScope, leftValues)
					) {
						if (stopIfHit) {
							abort = true;
							return node;
						}
						if (isLhs(node, parent)) {
							if (valueDefinition) replaced++;
							return node;
						}
						replaced++;
						if (valueDefinition && candidate instanceof AST_VarDef) {
							return node;
						}
						changed = true;
						abort = true;
						if (candidate instanceof AST_UnaryPostfix) {
							return makeNode(AST_UnaryPrefix, candidate, candidate);
						}
						if (candidate instanceof AST_VarDef) {
							const candidateDefinition = candidate.name.definition();
							const value = candidate.value;
							if (
								candidateDefinition.references.length -
									candidateDefinition.replaced ===
									1 &&
								!compressor.exposed(candidateDefinition)
							) {
								candidateDefinition.replaced++;
								if (funarg && isIdentifierAtom(value)) {
									return value.transform(compressor);
								}
								return maintainThisBinding(parent, node, value);
							}
							return makeNode(AST_Assign, candidate, {
								operator: "=",
								logical: false,
								left: makeNode(AST_SymbolRef, candidate.name, candidate.name),
								right: value
							});
						}
						clearFlag(candidate, WRITE_ONLY);
						return candidate;
					}
					// These node types have child nodes that execute sequentially,
					// but are otherwise not safe to scan into or beyond them.
					/** @type {Node} */
					let symbol;
					if (
						node instanceof AST_Call ||
						(node instanceof AST_Exit &&
							(sideEffects ||
								lhs instanceof AST_PropAccess ||
								mayModify(lhs))) ||
						(node instanceof AST_PropAccess &&
							(sideEffects ||
								node.expression.may_throw_on_access(compressor))) ||
						(node instanceof AST_SymbolRef &&
							((leftValues.has(node.name) &&
								/** @type {{ modified: boolean }} */ (leftValues.get(node.name))
									.modified) ||
								(sideEffects && mayModify(node)))) ||
						(node instanceof AST_VarDef &&
							node.value &&
							(leftValues.has(node.name.name) ||
								(sideEffects && mayModify(node.name)))) ||
						node instanceof AST_Using ||
						((symbol = isLhs(node.left, node)) &&
							(symbol instanceof AST_PropAccess ||
								leftValues.has(symbol.name))) ||
						(mayThrow &&
							(inTry
								? node.has_side_effects(compressor)
								: sideEffectsExternal(node)))
					) {
						stopAfter = node;
						if (node instanceof AST_Scope) abort = true;
					}
					return handleCustomScanOrder(node);
				},
				/**
				 * @param {Node} node the node left
				 * @returns {void}
				 */
				(node) => {
					if (abort) return;
					if (stopAfter === node) abort = true;
					if (stopIfHit === node) stopIfHit = null;
				}
			);

			const multiReplacer = new TreeTransformer(
				/**
				 * @param {Node} node the node visited
				 * @returns {Node | undefined} the node or what replaces it, undefined to descend
				 */
				(node) => {
					if (abort) return node;
					// Skip nodes before `candidate` as quickly as possible.
					if (!hit) {
						if (node !== hitStack[hitIndex]) return node;
						hitIndex++;
						if (hitIndex < hitStack.length) return;
						hit = true;
						return node;
					}
					// Replace variable when found.
					if (node instanceof AST_SymbolRef && node.name === definition.name) {
						if (!--replaced) abort = true;
						if (isLhs(node, multiReplacer.parent())) return node;
						definition.replaced++;
						/** @type {SymbolDefinition} */ (valueDefinition).replaced--;
						return candidate.value;
					}
					// Skip (non-executed) functions and (leading) default case in switch statements.
					if (node instanceof AST_Default || node instanceof AST_Scope) {
						return node;
					}
				}
			);

			/* eslint-disable no-unmodified-loop-condition -- the transformers set `abort` */
			while (--statementIndex >= 0) {
				// Treat parameters as collapsible in IIFE, i.e. `function(a, b){ ... }(x());`
				// would be translated into equivalent assignments `var a = x(), b = undefined;`.
				if (statementIndex === 0 && compressor.option("unused")) {
					extractArguments();
				}
				// Find collapsible assignments.
				hitStack = [];
				extractCandidates(statements[statementIndex]);
				while (candidates.length > 0) {
					hitStack = /** @type {Node[]} */ (candidates.pop());
					hitIndex = 0;
					candidate = hitStack[hitStack.length - 1];
					valueDefinition = null;
					stopAfter = null;
					stopIfHit = null;
					lhs = /** @type {Node} */ (getLhs(candidate));
					if (!lhs || isLhsReadOnly(lhs) || lhs.has_side_effects(compressor)) {
						continue;
					}
					// Locate symbols which may execute code outside of scanning range.
					leftValues = getLeftValues(candidate);
					lhsLocal = isLhsLocal(lhs);
					if (lhs instanceof AST_SymbolRef) {
						leftValues.set(lhs.name, {
							definition: lhs.definition(),
							modified: false
						});
					}
					sideEffects = valueHasSideEffects(candidate);
					replaceAll = replaceAllSymbols();
					mayThrow = candidate.may_throw(compressor);
					funarg = candidate.name instanceof AST_SymbolFunarg;
					hit = funarg;
					abort = false;
					replaced = 0;
					canReplace = !iifeArguments || !hit;
					if (!canReplace) {
						const extra = /** @type {Node[]} */ (iifeArguments);
						for (
							let j =
								compressor.self().argnames.lastIndexOf(candidate.name) + 1;
							!abort && j < extra.length;
							j++
						) {
							extra[j].transform(scanner);
						}
						canReplace = true;
					}
					for (let i = statementIndex; !abort && i < statements.length; i++) {
						statements[i].transform(scanner);
					}
					if (valueDefinition) {
						definition = candidate.name.definition();
						if (
							abort &&
							definition.references.length - definition.replaced > replaced
						) {
							// terser sets `false` here; 0 reads the same where it is read.
							replaced = 0;
						} else {
							abort = false;
							hitIndex = 0;
							hit = funarg;
							for (
								let i = statementIndex;
								!abort && i < statements.length;
								i++
							) {
								statements[i].transform(multiReplacer);
							}
							/** @type {SymbolDefinition} */ (valueDefinition).single_use =
								false;
						}
					}
					if (replaced && !removeCandidate(candidate)) {
						statements.splice(statementIndex, 1);
					}
				}
			}

			/**
			 * terser's `handle_custom_scan_order`: skips functions, and scans a
			 * switch's case expressions first.
			 * @param {Node} node the node visited
			 * @returns {Node | undefined} the node when handled here, undefined to descend
			 */
			function handleCustomScanOrder(node) {
				// Skip (non-executed) functions.
				if (node instanceof AST_Scope) return node;

				// Scan case expressions first in a switch statement.
				if (node instanceof AST_Switch) {
					node.expression = node.expression.transform(scanner);
					for (
						let i = 0, length = node.body.length;
						!abort && i < length;
						i++
					) {
						const branch = node.body[i];
						if (branch instanceof AST_Case) {
							if (!hit) {
								if (branch !== hitStack[hitIndex]) continue;
								hitIndex++;
							}
							branch.expression = branch.expression.transform(scanner);
							if (!replaceAll) break;
						}
					}
					abort = true;
					return node;
				}
			}
			/* eslint-enable no-unmodified-loop-condition */

			/**
			 * terser's `has_overlapping_symbol`.
			 * @param {Node} lambda the function called
			 * @param {Node} argument an argument of the call
			 * @param {Node | false | undefined} lambdaStrict its `"use strict"` directive
			 * @returns {boolean} whether the argument reads a name or `this` the function sees differently
			 */
			function hasOverlappingSymbol(lambda, argument, lambdaStrict) {
				let found = false;
				let scanThis = !(lambda instanceof AST_Arrow);
				argument.walk(
					new TreeWalker(
						(/** @type {Node} */ node, /** @type {() => void} */ descend) => {
							if (found) return true;
							if (
								node instanceof AST_SymbolRef &&
								(lambda.variables.has(node.name) ||
									redefinedWithinScope(node.definition(), lambda))
							) {
								let scope = node.definition().scope;
								if (scope !== defunScope) {
									while ((scope = scope.parent_scope)) {
										if (scope === defunScope) return true;
									}
								}
								found = true;
								return true;
							}
							if ((lambdaStrict || scanThis) && node instanceof AST_This) {
								found = true;
								return true;
							}
							if (node instanceof AST_Scope && !(node instanceof AST_Arrow)) {
								const previous = scanThis;
								scanThis = false;
								descend();
								scanThis = previous;
								return true;
							}
						}
					)
				);
				return found;
			}

			/**
			 * terser's `extract_args`: an IIFE's parameters as candidates, each
			 * assigned its argument.
			 * @returns {void}
			 */
			function extractArguments() {
				/** @type {Node} */
				let iife;
				const lambda = compressor.self();
				if (
					isFunctionExpression(lambda) &&
					!lambda.name &&
					!lambda.uses_arguments &&
					!lambda.pinned() &&
					(iife = compressor.parent()) instanceof AST_Call &&
					iife.expression === lambda &&
					iife.args.every(argIsInjectable)
				) {
					let lambdaStrict = compressor.has_directive("use strict");
					if (lambdaStrict && !member(lambdaStrict, lambda.body)) {
						lambdaStrict = false;
					}
					const length = lambda.argnames.length;
					iifeArguments = iife.args.slice(length);
					const extra = /** @type {Node[]} */ (iifeArguments);
					/** @type {Set<string>} */
					const names = new Set();
					for (let i = length; --i >= 0;) {
						const symbol = lambda.argnames[i];
						/** @type {Node | null} */ let argument = iife.args[i];
						// A duplicate of the fix in terser 011d3eb, which reduce_vars
						// may be doing the exact same thing for.
						const symbolDefinition = symbol.definition && symbol.definition();
						const isReassigned =
							symbolDefinition && symbolDefinition.orig.length > 1;
						if (isReassigned) continue;
						extra.unshift(
							makeNode(AST_VarDef, symbol, {
								name: symbol,
								value: argument
							})
						);
						if (names.has(symbol.name)) continue;
						names.add(symbol.name);
						if (symbol instanceof AST_Expansion) {
							const elements = iife.args.slice(i);
							if (
								elements.every(
									(/** @type {Node} */ element) =>
										!hasOverlappingSymbol(lambda, element, lambdaStrict)
								)
							) {
								candidates.unshift([
									makeNode(AST_VarDef, symbol, {
										name: symbol.expression,
										value: makeNode(AST_Array, iife, {
											elements
										})
									})
								]);
							}
						} else {
							if (!argument) {
								argument = makeVoidZero(symbol).transform(compressor);
							} else if (
								(argument instanceof AST_Lambda && argument.pinned()) ||
								hasOverlappingSymbol(lambda, argument, lambdaStrict)
							) {
								argument = null;
							}
							if (argument) {
								candidates.unshift([
									makeNode(AST_VarDef, symbol, {
										name: symbol,
										value: argument
									})
								]);
							}
						}
					}
				}
			}

			/**
			 * terser's `extract_candidates`: pushes the path to each assignment
			 * of an expression, in the order it runs.
			 * @param {Node} expression the expression or statement
			 * @returns {void}
			 */
			function extractCandidates(expression) {
				hitStack.push(expression);
				if (expression instanceof AST_Assign) {
					if (
						!expression.left.has_side_effects(compressor) &&
						!(expression.right instanceof AST_Chain)
					) {
						candidates.push([...hitStack]);
					}
					extractCandidates(expression.right);
				} else if (expression instanceof AST_Binary) {
					extractCandidates(expression.left);
					extractCandidates(expression.right);
				} else if (
					expression instanceof AST_Call &&
					!hasAnnotation(expression, _NOINLINE)
				) {
					extractCandidates(expression.expression);
					for (const argument of expression.args) {
						extractCandidates(argument);
					}
				} else if (expression instanceof AST_Case) {
					extractCandidates(expression.expression);
				} else if (expression instanceof AST_Conditional) {
					extractCandidates(expression.condition);
					extractCandidates(expression.consequent);
					extractCandidates(expression.alternative);
				} else if (expression instanceof AST_Definitions) {
					const length = expression.definitions.length;
					// Limit number of trailing variable definitions for consideration.
					let i = length - 200;
					if (i < 0) i = 0;
					for (; i < length; i++) {
						extractCandidates(expression.definitions[i]);
					}
				} else if (expression instanceof AST_DWLoop) {
					extractCandidates(expression.condition);
					if (!(expression.body instanceof AST_Block)) {
						extractCandidates(expression.body);
					}
				} else if (expression instanceof AST_Exit) {
					if (expression.value) extractCandidates(expression.value);
				} else if (expression instanceof AST_For) {
					if (expression.init) extractCandidates(expression.init);
					if (expression.condition) extractCandidates(expression.condition);
					if (expression.step) extractCandidates(expression.step);
					if (!(expression.body instanceof AST_Block)) {
						extractCandidates(expression.body);
					}
				} else if (expression instanceof AST_ForIn) {
					extractCandidates(expression.object);
					if (!(expression.body instanceof AST_Block)) {
						extractCandidates(expression.body);
					}
				} else if (expression instanceof AST_If) {
					extractCandidates(expression.condition);
					if (!(expression.body instanceof AST_Block)) {
						extractCandidates(expression.body);
					}
					if (
						expression.alternative &&
						!(expression.alternative instanceof AST_Block)
					) {
						extractCandidates(expression.alternative);
					}
				} else if (expression instanceof AST_Sequence) {
					for (const item of expression.expressions) {
						extractCandidates(item);
					}
				} else if (expression instanceof AST_SimpleStatement) {
					extractCandidates(expression.body);
				} else if (expression instanceof AST_Switch) {
					extractCandidates(expression.expression);
					for (const branch of expression.body) {
						extractCandidates(branch);
					}
				} else if (expression instanceof AST_Unary) {
					if (expression.operator === "++" || expression.operator === "--") {
						candidates.push([...hitStack]);
					}
				} else if (
					expression instanceof AST_VarDef &&
					expression.value &&
					!(expression.value instanceof AST_Chain)
				) {
					candidates.push([...hitStack]);
					extractCandidates(expression.value);
				}
				hitStack.pop();
			}

			/**
			 * terser's `find_stop`: the outermost node around the candidate whose
			 * end still ends the scan.
			 * @param {Node} node the candidate or a node around it
			 * @param {number} level how far up the scanner's stack its parent is
			 * @param {boolean=} writeOnly whether the value of `node` is unused
			 * @returns {Node | null} the node to stop after
			 */
			function findStop(node, level, writeOnly) {
				const parent = scanner.parent(level);
				if (parent instanceof AST_Assign) {
					if (
						writeOnly &&
						!parent.logical &&
						!(
							parent.left instanceof AST_PropAccess ||
							leftValues.has(parent.left.name)
						)
					) {
						return findStop(parent, level + 1, writeOnly);
					}
					return node;
				}
				if (parent instanceof AST_Binary) {
					if (
						writeOnly &&
						(!lazyOperators.has(parent.operator) || parent.left === node)
					) {
						return findStop(parent, level + 1, writeOnly);
					}
					return node;
				}
				if (parent instanceof AST_Call) return node;
				if (parent instanceof AST_Case) return node;
				if (parent instanceof AST_Conditional) {
					if (writeOnly && parent.condition === node) {
						return findStop(parent, level + 1, writeOnly);
					}
					return node;
				}
				if (parent instanceof AST_Definitions) {
					return findStop(parent, level + 1, true);
				}
				if (parent instanceof AST_Exit) {
					return writeOnly ? findStop(parent, level + 1, writeOnly) : node;
				}
				if (parent instanceof AST_If) {
					if (writeOnly && parent.condition === node) {
						return findStop(parent, level + 1, writeOnly);
					}
					return node;
				}
				if (parent instanceof AST_IterationStatement) return node;
				if (parent instanceof AST_Sequence) {
					return findStop(parent, level + 1, parent.tail_node() !== node);
				}
				if (parent instanceof AST_SimpleStatement) {
					return findStop(parent, level + 1, true);
				}
				if (parent instanceof AST_Switch) return node;
				if (parent instanceof AST_VarDef) return node;
				return null;
			}

			/**
			 * terser's `mangleable_var`: records the variable a definition copies.
			 * @param {Node} varDef a definition
			 * @returns {SymbolDefinition | undefined} the variable its value reads, where it is a declared one
			 */
			function mangleableVar(varDef) {
				const value = varDef.value;
				if (!(value instanceof AST_SymbolRef)) return;
				if (value.name === "arguments") return;
				const valueDef = value.definition();
				if (valueDef.undeclared) return;
				return (valueDefinition = valueDef);
			}

			/**
			 * terser's `get_lhs`.
			 * @param {Node} expression a candidate
			 * @returns {Node | false | undefined} what it assigns to, where it can be folded
			 */
			function getLhs(expression) {
				if (expression instanceof AST_Assign && expression.logical) {
					return false;
				}
				if (
					expression instanceof AST_VarDef &&
					expression.name instanceof AST_SymbolDeclaration
				) {
					const nameDefinition = expression.name.definition();
					if (!member(expression.name, nameDefinition.orig)) return;
					const referenced =
						nameDefinition.references.length - nameDefinition.replaced;
					if (!referenced) return;
					const declared =
						nameDefinition.orig.length - nameDefinition.eliminated;
					if (
						(declared > 1 && !(expression.name instanceof AST_SymbolFunarg)) ||
						(referenced > 1
							? mangleableVar(expression)
							: !compressor.exposed(nameDefinition))
					) {
						return makeNode(AST_SymbolRef, expression.name, expression.name);
					}
					return;
				}
				const target =
					expression instanceof AST_Assign
						? expression.left
						: expression.expression;
				return (
					!isRefOf(target, AST_SymbolConst) &&
					!isRefOf(target, AST_SymbolLet) &&
					!isRefOf(target, AST_SymbolUsing) &&
					target
				);
			}

			/**
			 * terser's `get_lvalues`.
			 * @param {Node} expression a candidate
			 * @returns {Map<string, { definition: SymbolDefinition, modified: boolean }>} the variables its value reads, and whether it modifies each
			 */
			function getLeftValues(expression) {
				/** @type {Map<string, { definition: SymbolDefinition, modified: boolean }>} */
				const values = new Map();
				if (expression instanceof AST_Unary) return values;
				const walker = new TreeWalker((/** @type {Node} */ node) => {
					let symbol = node;
					while (symbol instanceof AST_PropAccess) symbol = symbol.expression;
					if (symbol instanceof AST_SymbolRef) {
						const previous = values.get(symbol.name);
						if (!previous || !previous.modified) {
							values.set(symbol.name, {
								definition: symbol.definition(),
								modified: isModified(compressor, walker, node, node, 0)
							});
						}
					}
				});
				getRvalue(expression).walk(walker);
				return values;
			}

			/**
			 * terser's `remove_candidate`: drops a folded assignment from where it was.
			 * @param {Node} expression the candidate
			 * @returns {Node | null | true} what is left of its statement, null when nothing
			 */
			function removeCandidate(expression) {
				if (expression.name instanceof AST_SymbolFunarg) {
					const iife = compressor.parent();
					const argnames = compressor.self().argnames;
					const index = argnames.indexOf(expression.name);
					if (index < 0) {
						iife.args.length = Math.min(iife.args.length, argnames.length - 1);
					} else {
						const args = iife.args;
						if (args[index]) {
							args[index] = makeNode(AST_Number, args[index], {
								value: 0
							});
						}
					}
					return true;
				}
				let found = false;
				return statements[statementIndex].transform(
					new TreeTransformer(
						/**
						 * @param {Node} node the node visited
						 * @param {() => void} descend transforms its children
						 * @param {boolean} inList whether it sits in a list
						 * @returns {EXPECTED_ANY} what replaces it, undefined to descend
						 */
						(node, descend, inList) => {
							if (found) return node;
							if (node === expression || node.body === expression) {
								found = true;
								if (node instanceof AST_VarDef) {
									// `const` always needs a value.
									node.value =
										node.name instanceof AST_SymbolConst
											? makeVoidZero(node.value)
											: null;
									return node;
								}
								return inList ? MAP.skip : null;
							}
						},
						/**
						 * @param {Node} node the node left
						 * @returns {Node | null | undefined} what replaces an emptied sequence
						 */
						(node) => {
							if (node instanceof AST_Sequence) {
								const length = node.expressions.length;
								if (length === 0) return null;
								if (length === 1) return node.expressions[0];
							}
						}
					)
				);
			}

			/**
			 * terser's `is_lhs_local`.
			 * @param {Node} target the candidate's target
			 * @returns {boolean} whether it is a variable of this function no loop assigns again
			 */
			function isLhsLocal(target) {
				let symbol = target;
				while (symbol instanceof AST_PropAccess) symbol = symbol.expression;
				return (
					symbol instanceof AST_SymbolRef &&
					symbol.definition().scope.get_defun_scope() === defunScope &&
					!(
						inLoop &&
						(leftValues.has(symbol.name) ||
							candidate instanceof AST_Unary ||
							(candidate instanceof AST_Assign &&
								!candidate.logical &&
								candidate.operator !== "="))
					)
				);
			}

			/**
			 * terser's `value_has_side_effects`.
			 * @param {Node} expression a candidate
			 * @returns {boolean} whether its value has side effects
			 */
			function valueHasSideEffects(expression) {
				if (expression instanceof AST_Unary) {
					return unarySideEffects.has(expression.operator);
				}
				return getRvalue(expression).has_side_effects(compressor);
			}

			/**
			 * terser's `replace_all_symbols`.
			 * @returns {boolean} whether every read of the candidate's target can be replaced
			 */
			function replaceAllSymbols() {
				if (sideEffects) return false;
				if (valueDefinition) return true;
				if (lhs instanceof AST_SymbolRef) {
					const lhsDefinition = lhs.definition();
					if (
						lhsDefinition.references.length - lhsDefinition.replaced ===
						(candidate instanceof AST_VarDef ? 1 : 2)
					) {
						return true;
					}
				}
				return false;
			}

			/**
			 * terser's `may_modify`.
			 * @param {Node} symbol a symbol or a destructuring
			 * @returns {boolean} whether code outside this function may change it
			 */
			function mayModify(symbol) {
				// An `AST_Destructuring`.
				if (!symbol.definition) return true;
				const symbolDefinition = symbol.definition();
				if (
					symbolDefinition.orig.length === 1 &&
					symbolDefinition.orig[0] instanceof AST_SymbolDefun
				) {
					return false;
				}
				if (symbolDefinition.scope.get_defun_scope() !== defunScope) {
					return true;
				}
				return symbolDefinition.references.some(
					(/** @type {Node} */ reference) =>
						reference.scope.get_defun_scope() !== defunScope
				);
			}

			/**
			 * terser's `side_effects_external`.
			 * @param {Node} node a node
			 * @param {boolean=} isTarget whether it is assigned to
			 * @returns {boolean | null | undefined} whether it assigns to something outside this function
			 */
			function sideEffectsExternal(node, isTarget) {
				if (node instanceof AST_Assign) {
					return sideEffectsExternal(node.left, true);
				}
				if (node instanceof AST_Unary) {
					return sideEffectsExternal(node.expression, true);
				}
				if (node instanceof AST_VarDef) {
					return node.value && sideEffectsExternal(node.value);
				}
				if (isTarget) {
					if (node instanceof AST_Dot) {
						return sideEffectsExternal(node.expression, true);
					}
					if (node instanceof AST_Sub) {
						return sideEffectsExternal(node.expression, true);
					}
					if (node instanceof AST_SymbolRef) {
						return node.definition().scope.get_defun_scope() !== defunScope;
					}
				}
				return false;
			}

			/**
			 * terser's `shadows`: whether a variable the candidate reads would
			 * resolve to another one where it is moved to.
			 * @param {Scope} scope the scope it is moved into
			 * @param {Map<string, { definition: SymbolDefinition, modified: boolean }>} values the variables it reads
			 * @returns {boolean} whether one is shadowed there
			 */
			function shadows(scope, values) {
				for (const value of values.values()) {
					const lookedUp = scope.find_variable(value.definition.name);
					if (lookedUp) {
						if (lookedUp === value.definition) continue;
						return true;
					}
				}
				return false;
			}
		}

		/**
		 * terser's `eliminate_spurious_blocks`: inlines blocks, drops empty
		 * statements and repeated directives.
		 * @param {Node[]} statements the statements
		 * @returns {void}
		 */
		function eliminateSpuriousBlocks(statements) {
			/** @type {string[]} */
			const seenDirectives = [];
			for (let i = 0; i < statements.length;) {
				const statement = statements[i];
				if (
					statement instanceof AST_BlockStatement &&
					statement.body.every(canBeEvictedFromBlock)
				) {
					changed = true;
					eliminateSpuriousBlocks(statement.body);
					statements.splice(i, 1, ...statement.body);
					i += statement.body.length;
				} else if (statement instanceof AST_EmptyStatement) {
					changed = true;
					statements.splice(i, 1);
				} else if (statement instanceof AST_Directive) {
					if (!seenDirectives.includes(statement.value)) {
						i++;
						seenDirectives.push(statement.value);
					} else {
						changed = true;
						statements.splice(i, 1);
					}
				} else {
					i++;
				}
			}
		}

		/**
		 * terser's `handle_if_return`: turns `if`s that end in a jump into
		 * branches, and returns after them into conditionals.
		 * @param {Node[]} statements the statements
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {void}
		 */
		function handleIfReturn(statements, compressor) {
			const self = compressor.self();
			const multipleIfReturns = hasMultipleIfReturns(statements);
			const inLambda = self instanceof AST_Lambda;
			// Prevent extremely deep nesting: terser#1432, webpack#17548.
			const iterationStart = Math.min(statements.length, 500);
			// Read by `canMergeFlow` and `extractDefuns`.
			let i = iterationStart;
			while (--i >= 0) {
				let statement = statements[i];
				const j = nextIndex(i);
				const next = statements[j];

				if (inLambda && !next && statement instanceof AST_Return) {
					if (!statement.value) {
						changed = true;
						statements.splice(i, 1);
						continue;
					}
					if (
						statement.value instanceof AST_UnaryPrefix &&
						statement.value.operator === "void"
					) {
						changed = true;
						statements[i] = makeNode(AST_SimpleStatement, statement, {
							body: statement.value.expression
						});
						continue;
					}
				}

				if (statement instanceof AST_If) {
					let exit = aborts(statement.body);
					/** @type {Node[] | undefined} */
					let newElse;
					if (
						canMergeFlow(exit) &&
						(newElse = asStatementArrayWithReturn(statement.body, exit))
					) {
						if (exit.label) {
							remove(exit.label.thedef.references, exit);
						}
						changed = true;
						statement = statement.clone();
						statement.condition = statement.condition.negate(compressor);
						statement.body = makeNode(AST_BlockStatement, statement, {
							body: [
								...asStatementArray(statement.alternative),
								...extractDefuns()
							]
						});
						statement.alternative = makeNode(AST_BlockStatement, statement, {
							body: newElse
						});
						statements[i] = statement.transform(compressor);
						continue;
					}

					exit = aborts(statement.alternative);
					if (
						canMergeFlow(exit) &&
						(newElse = asStatementArrayWithReturn(statement.alternative, exit))
					) {
						if (exit.label) {
							remove(exit.label.thedef.references, exit);
						}
						changed = true;
						statement = statement.clone();
						statement.body = makeNode(AST_BlockStatement, statement.body, {
							body: [...asStatementArray(statement.body), ...extractDefuns()]
						});
						statement.alternative = makeNode(
							AST_BlockStatement,
							statement.alternative,
							{
								body: newElse
							}
						);
						statements[i] = statement.transform(compressor);
						continue;
					}
				}

				if (
					statement instanceof AST_If &&
					statement.body instanceof AST_Return
				) {
					const value = statement.body.value;
					// if (foo()) return; return; ==> foo(); return;
					if (
						!value &&
						!statement.alternative &&
						((inLambda && !next) || (next instanceof AST_Return && !next.value))
					) {
						changed = true;
						statements[i] = makeNode(AST_SimpleStatement, statement.condition, {
							body: statement.condition
						});
						continue;
					}
					// if (foo()) return x; return y; ==> return foo() ? x : y;
					if (
						value &&
						!statement.alternative &&
						next instanceof AST_Return &&
						next.value
					) {
						changed = true;
						statement = statement.clone();
						statement.alternative = next;
						statements[i] = statement.transform(compressor);
						statements.splice(j, 1);
						continue;
					}
					// if (foo()) return x; [ return ; ] ==> return foo() ? x : undefined;
					if (
						value &&
						!statement.alternative &&
						((!next && inLambda && multipleIfReturns) ||
							next instanceof AST_Return)
					) {
						changed = true;
						statement = statement.clone();
						statement.alternative =
							next ||
							makeNode(AST_Return, statement, {
								value: null
							});
						statements[i] = statement.transform(compressor);
						if (next) statements.splice(j, 1);
						continue;
					}
					// if (a) return b; if (c) return d; e; ==> return a ? b : c ? d : void e;
					// Without `sequences` this could loop endlessly (terser#866); with it,
					// it produces slightly better output.
					const previous = statements[prevIndex(i)];
					if (
						compressor.option("sequences") &&
						inLambda &&
						!statement.alternative &&
						previous instanceof AST_If &&
						previous.body instanceof AST_Return &&
						nextIndex(j) === statements.length &&
						next instanceof AST_SimpleStatement
					) {
						changed = true;
						statement = statement.clone();
						statement.alternative = makeNode(AST_BlockStatement, next, {
							body: [
								next,
								makeNode(AST_Return, next, {
									value: null
								})
							]
						});
						statements[i] = statement.transform(compressor);
						statements.splice(j, 1);
						continue;
					}
				}
			}

			/**
			 * terser's `has_multiple_if_returns`.
			 * @param {Node[]} statements the statements
			 * @returns {boolean} whether more than one is an `if` whose body returns
			 */
			function hasMultipleIfReturns(statements) {
				let n = 0;
				for (let i = statements.length; --i >= 0;) {
					const statement = statements[i];
					if (
						statement instanceof AST_If &&
						statement.body instanceof AST_Return &&
						++n > 1
					) {
						return true;
					}
				}
				return false;
			}

			/**
			 * terser's `is_return_void`.
			 * @param {Node | null | undefined} value a `return`'s value
			 * @returns {boolean} whether it returns `undefined` for sure
			 */
			function isReturnVoid(value) {
				return (
					!value ||
					(value instanceof AST_UnaryPrefix && value.operator === "void")
				);
			}

			/**
			 * terser's `can_merge_flow`.
			 * @param {Node | null | undefined} exit the jump a branch ends in
			 * @returns {boolean} whether the statements after the `if` can move into its other branch
			 */
			function canMergeFlow(exit) {
				if (!exit) return false;
				for (let j = i + 1, length = statements.length; j < length; j++) {
					const statement = statements[j];
					if (
						statement instanceof AST_DefinitionsLike &&
						!(statement instanceof AST_Var)
					) {
						return false;
					}
				}
				const target =
					exit instanceof AST_LoopControl
						? compressor.loopcontrol_target(exit)
						: null;
				return (
					(exit instanceof AST_Return &&
						inLambda &&
						isReturnVoid(exit.value)) ||
					(exit instanceof AST_Continue && self === loopBody(target)) ||
					(exit instanceof AST_Break &&
						target instanceof AST_BlockStatement &&
						self === target)
				);
			}

			/**
			 * terser's `extract_defuns`: cuts the statements after the `if`, but
			 * keeps function declarations in place.
			 * @returns {Node[]} the statements cut
			 */
			function extractDefuns() {
				const tail = statements.slice(i + 1);
				statements.length = i + 1;
				return tail.filter((/** @type {Node} */ statement) => {
					if (statement instanceof AST_Defun) {
						statements.push(statement);
						return false;
					}
					return true;
				});
			}

			/**
			 * terser's `as_statement_array_with_return`.
			 * @param {Node} node a branch
			 * @param {Node} exit the jump it ends in
			 * @returns {Node[] | undefined} its statements without the jump, where each can leave the block
			 */
			function asStatementArrayWithReturn(node, exit) {
				let body = asStatementArray(node);
				if (exit !== body[body.length - 1]) {
					return undefined;
				}
				body = body.slice(0, -1);
				if (
					!body.every((/** @type {Node} */ statement) =>
						canBeEvictedFromBlock(statement)
					)
				) {
					return undefined;
				}
				if (exit.value) {
					body.push(
						makeNode(AST_SimpleStatement, exit.value, {
							body: exit.value.expression
						})
					);
				}
				return body;
			}

			/**
			 * terser's `next_index`.
			 * @param {number} index a statement's index
			 * @returns {number} the index of the next statement that is not a bare `var`
			 */
			function nextIndex(index) {
				let j = index + 1;
				for (const length = statements.length; j < length; j++) {
					const statement = statements[j];
					if (!(statement instanceof AST_Var && declarationsOnly(statement))) {
						break;
					}
				}
				return j;
			}

			/**
			 * terser's `prev_index`.
			 * @param {number} index a statement's index
			 * @returns {number} the index of the previous statement that is not a bare `var`
			 */
			function prevIndex(index) {
				let j = index;
				while (--j >= 0) {
					const statement = statements[j];
					if (!(statement instanceof AST_Var && declarationsOnly(statement))) {
						break;
					}
				}
				return j;
			}
		}

		/**
		 * terser's `eliminate_dead_code`: drops what follows a jump, and jumps to
		 * where the code goes anyway.
		 * @param {Node[]} statements the statements
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {void}
		 */
		function eliminateDeadCode(statements, compressor) {
			/** @type {Node[] | undefined} */
			let hasQuit;
			const self = compressor.self();
			let n = 0;
			const length = statements.length;
			for (let i = 0; i < length; i++) {
				const statement = statements[i];
				if (statement instanceof AST_LoopControl) {
					const target = compressor.loopcontrol_target(statement);
					if (
						(statement instanceof AST_Break &&
							!(target instanceof AST_IterationStatement) &&
							loopBody(target) === self) ||
						(statement instanceof AST_Continue && loopBody(target) === self)
					) {
						if (statement.label) {
							remove(statement.label.thedef.references, statement);
						}
					} else {
						statements[n++] = statement;
					}
				} else {
					statements[n++] = statement;
				}
				if (aborts(statement)) {
					hasQuit = statements.slice(i + 1);
					break;
				}
			}
			statements.length = n;
			// Likely a terser bug: this also clears what earlier steps of the pass set.
			changed = n !== length;
			if (hasQuit) {
				for (const statement of hasQuit) {
					extractFromUnreachableCode(compressor, statement, statements);
				}
			}
		}

		/**
		 * terser's `sequencesize`: joins consecutive expression statements into
		 * one sequence.
		 * @param {Node[]} statements the statements
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {void}
		 */
		function joinIntoSequences(statements, compressor) {
			if (statements.length < 2) return;
			/** @type {Node[]} */
			let sequence = [];
			let n = 0;
			/**
			 * terser's `push_seq`.
			 * @returns {void}
			 */
			const pushSequence = () => {
				if (!sequence.length) return;
				const body = makeSequence(sequence[0], sequence);
				statements[n++] = makeNode(AST_SimpleStatement, body, { body });
				sequence = [];
			};
			const length = statements.length;
			for (let i = 0; i < length; i++) {
				const statement = statements[i];
				if (statement instanceof AST_SimpleStatement) {
					if (sequence.length >= compressor.sequences_limit) pushSequence();
					let body = statement.body;
					if (sequence.length > 0) {
						body = body.drop_side_effect_free(compressor);
					}
					if (body) mergeSequence(sequence, body);
				} else if (
					(statement instanceof AST_Definitions &&
						declarationsOnly(statement)) ||
					statement instanceof AST_Defun
				) {
					statements[n++] = statement;
				} else {
					pushSequence();
					statements[n++] = statement;
				}
			}
			pushSequence();
			statements.length = n;
			if (n !== length) changed = true;
		}

		/**
		 * terser's `sequencesize_2`: moves an expression statement into the
		 * head of the statement after it.
		 * @param {Node[]} statements the statements
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {void}
		 */
		function joinSequencesIntoStatements(statements, compressor) {
			let n = 0;
			/** @type {Node | null | undefined} */
			let previous;
			/**
			 * terser's `cons_seq`.
			 * @param {Node} right an expression
			 * @returns {Node} the previous statement's expression, then it
			 */
			const consSequence = (right) => {
				n--;
				changed = true;
				const left = /** @type {Node} */ (previous).body;
				return makeSequence(left, [left, right]).transform(compressor);
			};
			for (let i = 0; i < statements.length; i++) {
				const statement = statements[i];
				if (previous) {
					if (statement instanceof AST_Exit) {
						statement.value = consSequence(
							statement.value || makeVoidZero(statement).transform(compressor)
						);
					} else if (statement instanceof AST_For) {
						if (!(statement.init instanceof AST_DefinitionsLike)) {
							const aborted = walk(
								previous.body,
								(/** @type {Node} */ node) => {
									if (node instanceof AST_Scope) return true;
									if (node instanceof AST_Binary && node.operator === "in") {
										return walkAbort;
									}
								}
							);
							if (!aborted) {
								if (statement.init) {
									statement.init = consSequence(statement.init);
								} else {
									statement.init = previous.body;
									n--;
									changed = true;
								}
							}
						}
					} else if (statement instanceof AST_ForIn) {
						if (
							!(statement.init instanceof AST_DefinitionsLike) ||
							statement.init instanceof AST_Var
						) {
							statement.object = consSequence(statement.object);
						}
					} else if (statement instanceof AST_If) {
						statement.condition = consSequence(statement.condition);
					} else if (statement instanceof AST_Switch) {
						statement.expression = consSequence(statement.expression);
					} else if (statement instanceof AST_With) {
						statement.expression = consSequence(statement.expression);
					}
				}
				if (compressor.option("conditionals") && statement instanceof AST_If) {
					/** @type {Node[]} */
					const declarations = [];
					const body = toSimpleStatement(statement.body, declarations);
					const alternative = toSimpleStatement(
						statement.alternative,
						declarations
					);
					if (
						body !== false &&
						alternative !== false &&
						declarations.length > 0
					) {
						const length = declarations.length;
						declarations.push(
							makeNode(AST_If, statement, {
								condition: statement.condition,
								body: body || makeNode(AST_EmptyStatement, statement.body),
								alternative
							})
						);
						statements.splice(n, 1, ...declarations);
						i += length;
						n += length + 1;
						previous = null;
						changed = true;
						continue;
					}
				}
				statements[n++] = statement;
				previous = statement instanceof AST_SimpleStatement ? statement : null;
			}
			statements.length = n;
		}

		/**
		 * terser's `join_object_assignments`: moves assignments to properties of
		 * an object literal just declared into the literal.
		 * @param {Node | undefined} definitions the statement before
		 * @param {Node | null | undefined} body the expression that may assign
		 * @returns {Node[] | false | undefined} the expressions left, where any moved
		 */
		function joinObjectAssignments(definitions, body) {
			if (!(definitions instanceof AST_Definitions)) return;
			const list = /** @type {Node} */ (definitions).definitions;
			const last = list[list.length - 1];
			if (!(last.value instanceof AST_Object)) return;
			/** @type {Node[] | undefined} */
			let expressions;
			const head = /** @type {Node} */ (body);
			if (head instanceof AST_Assign && !head.logical) {
				expressions = [head];
			} else if (head instanceof AST_Sequence) {
				expressions = [...head.expressions];
			}
			if (!expressions) return;
			let trimmed = false;
			do {
				const node = expressions[0];
				if (!(node instanceof AST_Assign)) break;
				if (node.operator !== "=") break;
				if (!(node.left instanceof AST_PropAccess)) break;
				const symbol = node.left.expression;
				if (!(symbol instanceof AST_SymbolRef)) break;
				if (last.name.name !== symbol.name) break;
				if (!node.right.is_constant_expression(nearestScope)) break;
				let key = node.left.property;
				if (key instanceof AST_Node) {
					key = key.evaluate(compressor);
				}
				if (key instanceof AST_Node) break;
				key = String(key);
				const differs =
					compressor.option("ecma") < 2015 &&
					compressor.has_directive("use strict")
						? (/** @type {Node} */ property) =>
								differsLoosely(property.key, key) &&
								property.key &&
								differsLoosely(property.key.name, key)
						: (/** @type {Node} */ property) =>
								property.key && differsLoosely(property.key.name, key);
				if (!last.value.properties.every(differs)) break;
				const existing = last.value.properties.find(
					(/** @type {Node} */ property) => property.key === key
				);
				if (!existing) {
					last.value.properties.push(
						makeNode(AST_ObjectKeyVal, node, {
							key,
							value: node.right
						})
					);
				} else {
					existing.value = new AST_Sequence({
						start: existing.start,
						expressions: [existing.value.clone(), node.right.clone()],
						end: existing.end
					});
				}
				expressions.shift();
				trimmed = true;
			} while (expressions.length);
			return trimmed && expressions;
		}

		/**
		 * terser's `join_consecutive_vars`: joins neighboring definitions, and
		 * moves object assignments into the literal just declared.
		 * @param {Node[]} statements the statements
		 * @returns {void}
		 */
		function joinConsecutiveVars(statements) {
			// terser's function-scoped `var`s, which `extractObjectAssignments` reads.
			/** @type {Node | undefined} */
			let definitions;
			/** @type {Node} */
			let statement;
			/** @type {Node | undefined} */
			let previous;
			let j = -1;
			for (let i = 0, length = statements.length; i < length; i++) {
				statement = statements[i];
				previous = statements[j];
				if (statement instanceof AST_Definitions) {
					if (previous && previous.TYPE === statement.TYPE) {
						previous.definitions = [
							...previous.definitions,
							...statement.definitions
						];
						changed = true;
					} else if (
						definitions &&
						definitions.TYPE === statement.TYPE &&
						declarationsOnly(statement)
					) {
						definitions.definitions = [
							...definitions.definitions,
							...statement.definitions
						];
						changed = true;
					} else {
						statements[++j] = statement;
						definitions = statement;
					}
				} else if (
					statement instanceof AST_Using &&
					previous instanceof AST_Using &&
					previous.await === statement.await
				) {
					previous.definitions = [
						...previous.definitions,
						...statement.definitions
					];
				} else if (statement instanceof AST_Exit) {
					statement.value = extractObjectAssignments(statement.value);
				} else if (statement instanceof AST_For) {
					const expressions = joinObjectAssignments(previous, statement.init);
					if (expressions) {
						changed = true;
						statement.init = expressions.length
							? makeSequence(statement.init, expressions)
							: null;
						statements[++j] = statement;
					} else if (
						previous instanceof AST_Var &&
						(!statement.init || statement.init.TYPE === previous.TYPE)
					) {
						if (statement.init) {
							previous.definitions = [
								...previous.definitions,
								...statement.init.definitions
							];
						}
						statement.init = previous;
						statements[j] = statement;
						changed = true;
					} else if (
						definitions instanceof AST_Var &&
						statement.init instanceof AST_Var &&
						declarationsOnly(statement.init)
					) {
						const declared = /** @type {Node} */ (definitions);
						declared.definitions = [
							...declared.definitions,
							...statement.init.definitions
						];
						statement.init = null;
						statements[++j] = statement;
						changed = true;
					} else {
						statements[++j] = statement;
					}
				} else if (statement instanceof AST_ForIn) {
					statement.object = extractObjectAssignments(statement.object);
				} else if (statement instanceof AST_If) {
					statement.condition = extractObjectAssignments(statement.condition);
				} else if (statement instanceof AST_SimpleStatement) {
					const expressions = joinObjectAssignments(previous, statement.body);
					if (expressions) {
						changed = true;
						if (!expressions.length) continue;
						statement.body = makeSequence(statement.body, expressions);
					}
					statements[++j] = statement;
				} else if (statement instanceof AST_Switch) {
					statement.expression = extractObjectAssignments(statement.expression);
				} else if (statement instanceof AST_With) {
					statement.expression = extractObjectAssignments(statement.expression);
				} else {
					statements[++j] = statement;
				}
			}
			statements.length = j + 1;

			/**
			 * terser's `extract_object_assignments`: keeps the statement, and
			 * moves object assignments out of its head.
			 * @param {Node} value the statement's head
			 * @returns {Node} what is left of it
			 */
			function extractObjectAssignments(value) {
				statements[++j] = statement;
				const expressions = joinObjectAssignments(previous, value);
				if (expressions) {
					changed = true;
					if (expressions.length) {
						return makeSequence(value, expressions);
					} else if (value instanceof AST_Sequence) {
						return value.tail_node().left;
					}
					return value.left;
				}
				return value;
			}
		}
	};

	return { tightenBody, extractFromUnreachableCode };
};

/**
 * Builds webpack's `compress/inline.js`: a variable's value inlined into its
 * reference, and a function inlined into its call.
 * @param {TerserModules} modules terser's modules
 * @returns {{ inlineIntoSymbolRef: OptimizerHelpers["inlineIntoSymbolRef"], inlineIntoCall: OptimizerHelpers["inlineIntoCall"] }} terser's `inline_into_symbolref` and `inline_into_call`
 */
const createInline = ({ ast, common, flags, utils }) => {
	const {
		AST_Array,
		AST_Assign,
		AST_Block,
		AST_Call,
		AST_Catch,
		AST_Class,
		AST_ClassExpression,
		AST_DefaultAssign,
		AST_DefClass,
		AST_Defun,
		AST_Destructuring,
		AST_EmptyStatement,
		AST_Expansion,
		AST_Export,
		AST_Function,
		AST_IterationStatement,
		AST_Lambda,
		AST_Node,
		AST_Number,
		AST_Object,
		AST_ObjectKeyVal,
		AST_PropAccess,
		AST_Return,
		AST_Scope,
		AST_SimpleStatement,
		AST_Statement,
		AST_SymbolDefun,
		AST_SymbolFunarg,
		AST_SymbolLambda,
		AST_SymbolRef,
		AST_SymbolVar,
		AST_This,
		AST_Toplevel,
		AST_UnaryPrefix,
		AST_Var,
		AST_VarDef,
		walk,
		_INLINE,
		_NOINLINE,
		_PURE
	} = ast;
	const { make_void_0: makeVoid0, has_annotation: hasAnnotation } = utils;
	const {
		SQUEEZED,
		INLINED,
		UNUSED,
		has_flag: hasFlag,
		set_flag: setFlag
	} = flags;
	const {
		make_sequence: makeSequence,
		best_of: bestOf,
		make_node_from_constant: makeNodeFromConstant,
		identifier_atom: identifierAtom,
		is_empty: isEmpty,
		is_func_expr: isFunctionExpression,
		is_iife_call: isIifeCall,
		is_reachable: isReachable,
		is_recursive_ref: isRecursiveRef,
		retain_top_func: retainTopFunction
	} = common;

	/**
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether the node visited sits in an array or object literal of its statement
	 */
	const withinArrayOrObjectLiteral = (compressor) => {
		let node;
		let level = 0;
		while ((node = compressor.parent(level++))) {
			if (node instanceof AST_Statement) return false;
			if (
				node instanceof AST_Array ||
				node instanceof AST_ObjectKeyVal ||
				node instanceof AST_Object
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Whether a scope reads, under a name the pulled scope encloses, some other
	 * variable than the pulled scope does.
	 * @param {Scope} scope the scope pulled into
	 * @param {Scope} pulledScope the scope pulled
	 * @returns {boolean} true when pulling it in would rebind a name
	 */
	const scopeEnclosesVariablesInThisScope = (scope, pulledScope) => {
		for (const enclosed of pulledScope.enclosed) {
			if (pulledScope.variables.has(enclosed.name)) {
				continue;
			}
			const lookedUp = scope.find_variable(enclosed.name);
			if (lookedUp) {
				if (lookedUp === enclosed) continue;
				return true;
			}
		}
		return false;
	};

	/**
	 * The `top_retain` check of a constant: a retained one is still inlined when
	 * its value prints no longer than its name.
	 * @param {SymbolDefinition} definition the constant
	 * @param {Node | undefined} fixedValue its value
	 * @returns {boolean} true when it is kept
	 */
	const isConstSymbolShorterThanInitValue = (definition, fixedValue) => {
		if (definition.orig.length === 1 && fixedValue) {
			const initValueLength = fixedValue.size();
			const identifierLength = definition.name.length;
			return initValueLength > identifierLength;
		}
		return true;
	};

	/**
	 * Keeps functions and classes out of loops, for performance.
	 * @param {TerserCompressor} compressor the compressor
	 * @param {Node | undefined} maybeLambda what would be inlined
	 * @returns {boolean} true when it is not inlined
	 */
	const mustNotInlineLambdaInLoop = (compressor, maybeLambda) =>
		(maybeLambda instanceof AST_Lambda || maybeLambda instanceof AST_Class) &&
		Boolean(compressor.is_within_loop());

	/**
	 * terser's `inline_into_symbolref`.
	 * @param {Node} self a reference
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node} what replaces it
	 */
	const inlineIntoSymbolRef = (self, compressor) => {
		if (compressor.in_computed_key()) return self;

		const parent = compressor.parent();
		const definition = self.definition();
		const nearestScope = compressor.find_scope();
		let fixed = self.fixed_value();
		if (
			compressor.top_retain &&
			definition.global &&
			compressor.top_retain(definition) &&
			isConstSymbolShorterThanInitValue(definition, fixed)
		) {
			definition.fixed = false;
			definition.single_use = false;
			return self;
		}

		if (mustNotInlineLambdaInLoop(compressor, fixed)) return self;

		let singleUse =
			definition.single_use &&
			!(
				(parent instanceof AST_Call && parent.is_callee_pure(compressor)) ||
				hasAnnotation(parent, _NOINLINE)
			) &&
			!(
				parent instanceof AST_Export &&
				fixed instanceof AST_Lambda &&
				fixed.name
			);

		if (singleUse && fixed instanceof AST_Node) {
			singleUse =
				!fixed.has_side_effects(compressor) && !fixed.may_throw(compressor);
		}

		if (fixed instanceof AST_Class && definition.scope !== self.scope) {
			return self;
		}

		if (
			singleUse &&
			(fixed instanceof AST_Lambda || fixed instanceof AST_Class)
		) {
			if (retainTopFunction(fixed, compressor)) {
				singleUse = false;
			} else if (
				definition.scope !== self.scope &&
				(definition.escaped === 1 ||
					hasFlag(fixed, INLINED) ||
					withinArrayOrObjectLiteral(compressor) ||
					!compressor.option("reduce_funcs"))
			) {
				singleUse = false;
			} else if (isRecursiveRef(compressor, definition)) {
				singleUse = false;
			} else if (
				definition.scope !== self.scope ||
				definition.orig[0] instanceof AST_SymbolFunarg
			) {
				singleUse = fixed.is_constant_expression(self.scope);
				if (singleUse === "f") {
					let scope = self.scope;
					do {
						if (scope instanceof AST_Defun || isFunctionExpression(scope)) {
							setFlag(scope, INLINED);
						}
					} while ((scope = scope.parent_scope));
				}
			}
		}

		if (
			singleUse &&
			(fixed instanceof AST_Lambda || fixed instanceof AST_Class)
		) {
			singleUse =
				(definition.scope === self.scope &&
					!scopeEnclosesVariablesInThisScope(nearestScope, fixed)) ||
				(parent instanceof AST_Call &&
					parent.expression === self &&
					!scopeEnclosesVariablesInThisScope(nearestScope, fixed) &&
					!(fixed.name && fixed.name.definition().recursive_refs > 0));
		}

		if (singleUse && fixed) {
			if (fixed instanceof AST_DefClass) {
				setFlag(fixed, SQUEEZED);
				fixed = makeNode(AST_ClassExpression, fixed, fixed);
			}
			if (fixed instanceof AST_Defun) {
				setFlag(fixed, SQUEEZED);
				fixed = makeNode(AST_Function, fixed, fixed);
			}
			if (
				definition.recursive_refs > 0 &&
				fixed.name instanceof AST_SymbolDefun
			) {
				const defunDefinition = fixed.name.definition();
				let lambdaDefinition = fixed.variables.get(fixed.name.name);
				let name = lambdaDefinition && lambdaDefinition.orig[0];
				if (!(name instanceof AST_SymbolLambda)) {
					name = makeNode(AST_SymbolLambda, fixed.name, fixed.name);
					name.scope = fixed;
					fixed.name = name;
					lambdaDefinition = fixed.def_function(name);
				}
				walk(fixed, (/** @type {Node} */ node) => {
					if (
						node instanceof AST_SymbolRef &&
						node.definition() === defunDefinition
					) {
						node.thedef = lambdaDefinition;
						lambdaDefinition.references.push(node);
					}
				});
			}
			if (
				(fixed instanceof AST_Lambda || fixed instanceof AST_Class) &&
				fixed.parent_scope !== nearestScope
			) {
				fixed = fixed.clone(true, compressor.get_toplevel());

				nearestScope.add_child_scope(fixed);
			}
			return fixed.optimize(compressor);
		}

		// multiple uses
		if (fixed) {
			/** @type {Node | undefined} */
			let replace;

			if (fixed instanceof AST_This) {
				if (
					!(definition.orig[0] instanceof AST_SymbolFunarg) &&
					definition.references.every(
						(/** @type {Node} */ reference) =>
							definition.scope === reference.scope
					)
				) {
					replace = fixed;
				}
			} else {
				const evaluated = fixed.evaluate(compressor);
				if (
					evaluated !== fixed &&
					(compressor.option("unsafe_regexp") || !(evaluated instanceof RegExp))
				) {
					replace = makeNodeFromConstant(evaluated, fixed);
				}
			}

			if (replace) {
				const nameLength = self.size(compressor);
				const replaceSize = replace.size(compressor);

				let overhead = 0;
				if (compressor.option("unused") && !compressor.exposed(definition)) {
					overhead =
						(nameLength + 2 + fixed.size(compressor)) /
						(definition.references.length - definition.assignments);
				}

				if (replaceSize <= nameLength + overhead) {
					return replace;
				}
			}
		}

		return self;
	};

	/**
	 * terser's `inline_into_call`.
	 * @param {Node} self a call
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node} what replaces it
	 */
	const inlineIntoCall = (self, compressor) => {
		if (compressor.in_computed_key()) return self;

		const expression = self.expression;
		let lambda = expression;
		const simpleArgs = self.args.every(
			(/** @type {Node} */ arg) => !(arg instanceof AST_Expansion)
		);

		if (
			compressor.option("reduce_vars") &&
			lambda instanceof AST_SymbolRef &&
			!hasAnnotation(self, _NOINLINE)
		) {
			const fixed = lambda.fixed_value();

			if (
				retainTopFunction(fixed, compressor) ||
				(!compressor.toplevel.funcs && expression.definition().global)
			) {
				return self;
			}

			lambda = fixed;
		}

		if (
			mustNotInlineLambdaInLoop(compressor, lambda) &&
			!hasAnnotation(self, _INLINE)
		) {
			return self;
		}

		const isFunction = lambda instanceof AST_Lambda;

		const statement = isFunction && lambda.body[0];
		const isRegularFunction =
			isFunction && !lambda.is_generator && !lambda.async;
		const canInline =
			isRegularFunction &&
			compressor.option("inline") &&
			!self.is_callee_pure(compressor);
		if (canInline && statement instanceof AST_Return) {
			let returned = statement.value;
			if (!returned || returned.is_constant_expression()) {
				returned = returned ? returned.clone(true) : makeVoid0(self);
				const args = [...self.args, returned];
				return makeSequence(self, args).optimize(compressor);
			}

			// optimize identity function
			if (
				lambda.argnames.length === 1 &&
				lambda.argnames[0] instanceof AST_SymbolFunarg &&
				self.args.length < 2 &&
				!(self.args[0] instanceof AST_Expansion) &&
				returned instanceof AST_SymbolRef &&
				returned.name === lambda.argnames[0].name
			) {
				// terser gives this `void 0` no origin, so it carries no position.
				const replacement = (self.args[0] || makeVoid0()).optimize(compressor);

				let parent;
				if (
					replacement instanceof AST_PropAccess &&
					(parent = compressor.parent()) instanceof AST_Call &&
					parent.expression === self
				) {
					// `id(bag.method)(...)` called the method without `this`, which
					// the larger `(0, bag.method)(...)` keeps.
					return makeSequence(self, [
						makeNode(AST_Number, self, { value: 0 }),
						replacement
					]);
				}
				return replacement;
			}
		}

		if (canInline) {
			let scope = /** @type {Scope} */ (/** @type {unknown} */ (null));
			/** @type {SymbolDefinition[] | undefined} */
			let inLoop;
			let level = -1;

			/**
			 * The expression a statement of the body leaves as the call's value.
			 * @param {Node | false | null | undefined} bodyStatement the statement
			 * @returns {Node | undefined} the value, or undefined where the statement has none
			 */
			const returnValue = (bodyStatement) => {
				if (!bodyStatement) return makeVoid0(self);
				if (bodyStatement instanceof AST_Return) {
					if (!bodyStatement.value) return makeVoid0(self);
					return bodyStatement.value.clone(true);
				}
				if (bodyStatement instanceof AST_SimpleStatement) {
					return makeNode(AST_UnaryPrefix, bodyStatement, {
						operator: "void",
						expression: bodyStatement.body.clone(true)
					});
				}
				return undefined;
			};

			/**
			 * The value of the body when it is `var`s and one statement at most,
			 * or a single statement below `inline: 3`.
			 * @param {Node | false | undefined} firstStatement the body's first statement
			 * @returns {Node | false | undefined} the value, or falsy when the body does not flatten
			 */
			const canFlattenBody = (firstStatement) => {
				const body = lambda.body;
				const length = body.length;
				if (compressor.option("inline") < 3) {
					return length === 1 && returnValue(firstStatement);
				}
				/** @type {Node | null} */
				let onlyStatement = null;
				for (let i = 0; i < length; i++) {
					const line = body[i];
					if (line instanceof AST_Var) {
						if (
							onlyStatement &&
							!line.definitions.every(
								(/** @type {Node} */ varDef) => !varDef.value
							)
						) {
							return false;
						}
					} else if (onlyStatement) {
						return false;
					} else if (!(line instanceof AST_EmptyStatement)) {
						onlyStatement = line;
					}
				}
				return returnValue(onlyStatement);
			};

			/**
			 * @param {Set<string>} blockScoped the names block scopes around the call declare
			 * @param {boolean} safeToInject whether the scope takes new variables
			 * @returns {boolean} whether every parameter can become a variable of the scope
			 */
			const canInjectArgs = (blockScoped, safeToInject) => {
				const length = lambda.argnames.length;
				for (let i = 0; i < length; i++) {
					const arg = lambda.argnames[i];
					if (arg instanceof AST_DefaultAssign) {
						if (hasFlag(arg.left, UNUSED)) continue;
						return false;
					}
					if (arg instanceof AST_Destructuring) return false;
					if (arg instanceof AST_Expansion) {
						if (hasFlag(arg.expression, UNUSED)) continue;
						return false;
					}
					if (hasFlag(arg, UNUSED)) continue;
					if (
						!safeToInject ||
						blockScoped.has(arg.name) ||
						identifierAtom.has(arg.name) ||
						scope.conflicting_def(arg.name)
					) {
						return false;
					}
					if (inLoop) inLoop.push(arg.definition());
				}
				return true;
			};

			/**
			 * @param {Set<string>} blockScoped the names block scopes around the call declare
			 * @param {boolean} safeToInject whether the scope takes new variables
			 * @returns {boolean} whether every `var` of the body can become a variable of the scope
			 */
			const canInjectVars = (blockScoped, safeToInject) => {
				const length = lambda.body.length;
				for (let i = 0; i < length; i++) {
					const bodyStatement = lambda.body[i];
					if (!(bodyStatement instanceof AST_Var)) continue;
					if (!safeToInject) return false;
					for (let j = bodyStatement.definitions.length; --j >= 0;) {
						const name = bodyStatement.definitions[j].name;
						if (
							name instanceof AST_Destructuring ||
							blockScoped.has(name.name) ||
							identifierAtom.has(name.name) ||
							scope.conflicting_def(name.name)
						) {
							return false;
						}
						if (inLoop) inLoop.push(name.definition());
					}
				}
				return true;
			};

			/**
			 * Finds the scope the call sits in, and whether the parameters and `var`s
			 * of the function can move into it.
			 * @returns {boolean} true when they can
			 */
			const canInjectSymbols = () => {
				/** @type {Set<string>} */
				const blockScoped = new Set();
				do {
					scope = compressor.parent(++level);
					if (scope.is_block_scope() && scope.block_scope) {
						for (const variable of scope.block_scope.variables.values()) {
							blockScoped.add(variable.name);
						}
					}
					if (scope instanceof AST_Catch) {
						if (scope.argname) {
							blockScoped.add(scope.argname.name);
						}
					} else if (scope instanceof AST_IterationStatement) {
						inLoop = [];
					} else if (
						scope instanceof AST_SymbolRef &&
						scope.fixed_value() instanceof AST_Scope
					) {
						return false;
					}
				} while (!(scope instanceof AST_Scope));

				const safeToInject =
					!(scope instanceof AST_Toplevel) || compressor.toplevel.vars;
				const inline = compressor.option("inline");
				if (!canInjectVars(blockScoped, inline >= 3 && safeToInject)) {
					return false;
				}
				if (!canInjectArgs(blockScoped, inline >= 2 && safeToInject)) {
					return false;
				}
				return !inLoop || inLoop.length === 0 || !isReachable(lambda, inLoop);
			};

			/**
			 * Declares a name in the scope once, and assigns it the value when there is one.
			 * @param {Node[]} declarations the `var` definitions to add
			 * @param {Node[]} expressions the expressions the call becomes
			 * @param {Node} name the name
			 * @param {Node | undefined} value its value
			 * @returns {void}
			 */
			const appendVar = (declarations, expressions, name, value) => {
				const definition = name.definition();

				// Only a parameter of the same name has declared it already.
				const alreadyAppended = scope.variables.has(name.name);
				if (!alreadyAppended) {
					scope.variables.set(name.name, definition);
					scope.enclosed.push(definition);
					declarations.push(
						makeNode(AST_VarDef, name, {
							name,
							value: null
						})
					);
				}

				const symbol = makeNode(AST_SymbolRef, name, name);
				definition.references.push(symbol);
				if (value) {
					expressions.push(
						makeNode(AST_Assign, self, {
							operator: "=",
							logical: false,
							left: symbol,
							right: value.clone()
						})
					);
				}
			};

			/**
			 * The call's arguments, each assigned to its parameter or kept for its effects.
			 * @param {Node[]} declarations the `var` definitions to add
			 * @param {Node[]} expressions the expressions the call becomes
			 * @returns {void}
			 */
			const flattenArgs = (declarations, expressions) => {
				const length = lambda.argnames.length;
				for (let i = self.args.length; --i >= length;) {
					expressions.push(self.args[i]);
				}
				for (let i = length; --i >= 0;) {
					const name = lambda.argnames[i];
					let value = self.args[i];
					if (
						hasFlag(name, UNUSED) ||
						!name.name ||
						scope.conflicting_def(name.name)
					) {
						if (value) expressions.push(value);
					} else {
						const symbol = makeNode(AST_SymbolVar, name, name);
						name.definition().orig.push(symbol);
						if (!value && inLoop) value = makeVoid0(self);
						appendVar(declarations, expressions, symbol, value);
					}
				}
				declarations.reverse();
				expressions.reverse();
			};

			/**
			 * The body's `var`s, each assigned its value, and reset in a loop.
			 * @param {Node[]} declarations the `var` definitions to add
			 * @param {Node[]} expressions the expressions the call becomes
			 * @returns {void}
			 */
			const flattenVars = (declarations, expressions) => {
				let position = expressions.length;
				const lines = lambda.body.length;
				for (let i = 0; i < lines; i++) {
					const bodyStatement = lambda.body[i];
					if (!(bodyStatement instanceof AST_Var)) continue;
					const count = bodyStatement.definitions.length;
					for (let j = 0; j < count; j++) {
						const varDef = bodyStatement.definitions[j];
						const name = varDef.name;
						appendVar(declarations, expressions, name, varDef.value);
						if (
							inLoop &&
							lambda.argnames.every(
								(/** @type {Node} */ argname) => argname.name !== name.name
							)
						) {
							const variableDefinition = lambda.variables.get(name.name);
							const symbol = makeNode(AST_SymbolRef, name, name);
							variableDefinition.references.push(symbol);
							expressions.splice(
								position++,
								0,
								makeNode(AST_Assign, varDef, {
									operator: "=",
									logical: false,
									left: symbol,
									right: makeVoid0(name)
								})
							);
						}
					}
				}
			};

			/**
			 * The expressions the call becomes, its `var` added to the scope.
			 * @param {Node} returnedValue what the call evaluates to
			 * @returns {Node[]} the expressions, each a deep clone
			 */
			const flattenFunction = (returnedValue) => {
				/** @type {Node[]} */
				const declarations = [];
				/** @type {Node[]} */
				const expressions = [];
				flattenArgs(declarations, expressions);
				flattenVars(declarations, expressions);
				expressions.push(returnedValue);

				if (declarations.length) {
					const index = scope.body.indexOf(compressor.parent(level - 1)) + 1;
					scope.body.splice(
						index,
						0,
						makeNode(AST_Var, lambda, {
							definitions: declarations
						})
					);
				}

				return expressions.map((item) => item.clone(true));
			};

			/**
			 * Parameters have a scope of their own, which a `var` of the body does
			 * not reach, so nothing inlines into a default value.
			 * @returns {boolean} whether the call sits in a default value of its block
			 */
			const inDefaultAssign = () => {
				let i = 0;
				let parent;
				while ((parent = compressor.parent(i++))) {
					if (parent instanceof AST_DefaultAssign) return true;
					if (parent instanceof AST_Block) break;
				}
				return false;
			};

			let expressionDefinition;
			let returnedValue;
			let nearestScope;
			if (
				simpleArgs &&
				!lambda.uses_arguments &&
				!(compressor.parent() instanceof AST_Class) &&
				!(lambda.name && lambda instanceof AST_Function) &&
				(returnedValue = canFlattenBody(statement)) &&
				(expression === lambda ||
					hasAnnotation(self, _INLINE) ||
					(compressor.option("unused") &&
						(expressionDefinition = expression.definition()).references
							.length === 1 &&
						!isRecursiveRef(compressor, expressionDefinition) &&
						lambda.is_constant_expression(expression.scope))) &&
				!hasAnnotation(self, _PURE | _NOINLINE) &&
				!lambda.contains_this() &&
				canInjectSymbols() &&
				(nearestScope = compressor.find_scope()) &&
				!scopeEnclosesVariablesInThisScope(nearestScope, lambda) &&
				!inDefaultAssign() &&
				!(scope instanceof AST_Class)
			) {
				setFlag(lambda, SQUEEZED);
				nearestScope.add_child_scope(lambda);
				return makeSequence(self, flattenFunction(returnedValue)).optimize(
					compressor
				);
			}
		}

		if (canInline && hasAnnotation(self, _INLINE)) {
			setFlag(lambda, SQUEEZED);
			lambda = makeNode(
				lambda.CTOR === AST_Defun ? AST_Function : lambda.CTOR,
				lambda,
				lambda
			);
			lambda = lambda.clone(true);
			lambda.figure_out_scope(
				{},
				{
					parent_scope: compressor.find_scope(),
					toplevel: compressor.get_toplevel()
				}
			);

			return makeNode(AST_Call, self, {
				expression: lambda,
				args: self.args
			}).optimize(compressor);
		}

		const canDropThisCall =
			isRegularFunction &&
			compressor.option("side_effects") &&
			lambda.body.every(isEmpty);
		if (canDropThisCall) {
			const args = [...self.args, makeVoid0(self)];
			return makeSequence(self, args).optimize(compressor);
		}

		if (
			compressor.option("negate_iife") &&
			compressor.parent() instanceof AST_SimpleStatement &&
			isIifeCall(self)
		) {
			return self.negate(compressor, true);
		}

		let evaluated = self.evaluate(compressor);
		if (evaluated !== self) {
			evaluated = makeNodeFromConstant(evaluated, self).optimize(compressor);
			return bestOf(compressor, evaluated, self);
		}

		return self;
	};

	return { inlineIntoSymbolRef, inlineIntoCall };
};

/**
 * Installs terser's statement optimizers and the `Compressor` and scope methods
 * of `compress/index.js` they call, from the compressor's driver to `AST_Import`.
 * @param {TerserModules} modules terser's modules
 * @param {OptimizerHelpers} helpers what the optimizers share
 * @returns {void}
 */
const installStatementOptimizers = (modules, helpers) => {
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (modules.ast);
	const { Compressor } = modules.compress;
	const { TreeTransformer, TreeWalker, walk } = A;
	const { base54 } = modules.scope;
	const { make_void_0: makeVoid0, remove } = modules.utils;
	const {
		make_sequence: makeSequence,
		best_of_expression: bestOfExpression,
		make_node_from_constant: makeNodeFromConstant,
		has_break_or_continue: hasBreakOrContinue,
		is_empty: isEmpty,
		can_be_evicted_from_block: canBeEvictedFromBlock,
		as_statement_array: asStatementArray
	} = modules.common;
	const {
		bitwise_binop: bitwiseBinaryOperators,
		is_undefined: isUndefined,
		is_lhs: isLhs,
		aborts
	} = modules.inference;
	const {
		defineOptimizer,
		optimizeLambda,
		tightenBody,
		extractFromUnreachableCode
	} = helpers;

	/**
	 * @this {TerserCompressor} the compressor
	 * @returns {{ ie8: boolean, nth_identifier: EXPECTED_ANY, module: boolean }} the options scopes are figured out with
	 */
	Compressor.prototype.mangle_options = function mangle_options() {
		const nthIdentifier =
			(this._mangle_options && this._mangle_options.nth_identifier) || base54;
		const moduleOption =
			(this._mangle_options && this._mangle_options.module) ||
			this.option("module");
		return {
			ie8: this.option("ie8"),
			nth_identifier: nthIdentifier,
			module: moduleOption
		};
	};

	/**
	 * @this {TerserCompressor} the compressor
	 * @param {string} key an option's name
	 * @returns {EXPECTED_ANY} its value
	 */
	Compressor.prototype.option = function option(key) {
		return this.options[key];
	};

	/**
	 * @this {TerserCompressor} the compressor
	 * @param {SymbolDefinition} definition a variable
	 * @returns {boolean} whether code outside the output can read it
	 */
	Compressor.prototype.exposed = function exposed(definition) {
		if (definition.export) return true;
		if (definition.global) {
			for (let i = 0, length = definition.orig.length; i < length; i++) {
				if (
					!this.toplevel[
						definition.orig[i] instanceof A.AST_SymbolDefun ? "funcs" : "vars"
					]
				) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * @this {TerserCompressor} the compressor
	 * @returns {boolean | undefined} whether only the truthiness of the node visited is read
	 */
	Compressor.prototype.in_boolean_context = function in_boolean_context() {
		if (!this.option("booleans")) return false;
		let self = this.self();
		for (let i = 0, parent; (parent = this.parent(i)); i++) {
			if (
				parent instanceof A.AST_SimpleStatement ||
				(parent instanceof A.AST_Conditional && parent.condition === self) ||
				(parent instanceof A.AST_DWLoop && parent.condition === self) ||
				(parent instanceof A.AST_For && parent.condition === self) ||
				(parent instanceof A.AST_If && parent.condition === self) ||
				(parent instanceof A.AST_UnaryPrefix &&
					parent.operator === "!" &&
					parent.expression === self)
			) {
				return true;
			}
			if (
				(parent instanceof A.AST_Binary &&
					(parent.operator === "&&" || parent.operator === "||")) ||
				parent instanceof A.AST_Conditional ||
				parent.tail_node() === self
			) {
				self = parent;
			} else {
				return false;
			}
		}
		return undefined;
	};

	/**
	 * True where the node visited is turned into a 32-bit integer, as in `~x`
	 * or `(1, x) | 0`.
	 * @this {TerserCompressor} the compressor
	 * @param {boolean=} otherOperandMustBeNumber whether the other operand has to be a number too
	 * @returns {boolean | undefined} whether it is
	 */
	Compressor.prototype.in_32_bit_context = function in_32_bit_context(
		otherOperandMustBeNumber
	) {
		if (!this.option("evaluate")) return false;
		let self = this.self();
		for (let i = 0, parent; (parent = this.parent(i)); i++) {
			if (
				parent instanceof A.AST_Binary &&
				bitwiseBinaryOperators.has(parent.operator)
			) {
				if (otherOperandMustBeNumber) {
					return (self === parent.left ? parent.right : parent.left).is_number(
						this
					);
				}
				return true;
			}
			if (parent instanceof A.AST_UnaryPrefix) {
				return parent.operator === "~";
			}
			if (
				(parent instanceof A.AST_Binary &&
					// Not the left operand: that can change the branch taken.
					((parent.operator === "&&" && parent.right === self) ||
						(parent.operator === "||" && parent.right === self) ||
						(parent.operator === "??" && parent.right === self))) ||
				(parent instanceof A.AST_Conditional && parent.condition !== self) ||
				parent.tail_node() === self
			) {
				self = parent;
			} else {
				return false;
			}
		}
		return undefined;
	};

	/**
	 * @this {TerserCompressor} the compressor
	 * @returns {Node | undefined} the tree being compressed
	 */
	Compressor.prototype.get_toplevel = function get_toplevel() {
		return this._toplevel;
	};

	/**
	 * @this {TerserCompressor} the compressor
	 * @param {Node} toplevel the tree
	 * @returns {Node} the tree compressed
	 */
	Compressor.prototype.compress = function compress(toplevel) {
		toplevel = toplevel.resolve_defines(this);
		this._toplevel = toplevel;
		if (this.option("expression")) {
			this._toplevel.process_expression(true);
		}
		const passes = Number(this.options.passes) || 1;
		let minimumCount = Infinity;
		let stopping = false;
		const mangle = this.mangle_options();
		for (let pass = 0; pass < passes; pass++) {
			this._toplevel.figure_out_scope(mangle);
			if (pass === 0 && this.option("drop_console")) {
				// Before `reduce_vars` and the pass itself.
				this._toplevel = this._toplevel.drop_console(
					this.option("drop_console")
				);
			}
			if (pass > 0 || this.option("reduce_vars")) {
				this._toplevel.reset_opt_flags(this);
			}
			this._toplevel = this._toplevel.transform(this);
			if (passes > 1) {
				let count = 0;
				walk(this._toplevel, () => {
					count++;
				});
				if (count < minimumCount) {
					minimumCount = count;
					stopping = false;
				} else if (stopping) {
					break;
				} else {
					stopping = true;
				}
			}
		}
		if (this.option("expression")) {
			this._toplevel.process_expression(false);
		}
		toplevel = this._toplevel;
		this._toplevel = undefined;
		return toplevel;
	};

	/**
	 * `is_lhs` of the node visited, which works inside `optimize`.
	 * @this {TerserCompressor} the compressor
	 * @returns {boolean} whether the node visited is assigned to
	 */
	Compressor.prototype.is_lhs = function is_lhs() {
		const self = this.stack[this.stack.length - 1];
		const parent = this.stack[this.stack.length - 2];
		return isLhs(self, parent);
	};

	defineOptimizer(A.AST_Node, (self) => self);

	/**
	 * Turns each statement that ends the scope into a `return` of it, or back.
	 * @this {Scope} the scope
	 * @param {boolean} insert whether to insert the returns rather than remove them
	 * @param {TerserCompressor=} compressor the compressor, which drops what a removed `return` returns
	 * @returns {void}
	 */
	A.AST_Scope.prototype.process_expression = function process_expression(
		insert,
		compressor
	) {
		const self = this;
		const transformer = new TreeTransformer((/** @type {Node} */ node) => {
			if (insert && node instanceof A.AST_SimpleStatement) {
				return makeNode(A.AST_Return, node, {
					value: node.body
				});
			}
			if (!insert && node instanceof A.AST_Return) {
				if (compressor) {
					const value =
						node.value && node.value.drop_side_effect_free(compressor, true);
					return value
						? makeNode(A.AST_SimpleStatement, node, { body: value })
						: makeNode(A.AST_EmptyStatement, node);
				}
				return makeNode(A.AST_SimpleStatement, node, {
					body: node.value || makeVoid0(node)
				});
			}
			if (
				node instanceof A.AST_Class ||
				(node instanceof A.AST_Lambda && node !== self)
			) {
				return node;
			}
			if (node instanceof A.AST_Block) {
				const index = node.body.length - 1;
				if (index >= 0) {
					node.body[index] = node.body[index].transform(transformer);
				}
			} else if (node instanceof A.AST_If) {
				node.body = node.body.transform(transformer);
				if (node.alternative) {
					node.alternative = node.alternative.transform(transformer);
				}
			} else if (node instanceof A.AST_With) {
				node.body = node.body.transform(transformer);
			}
			return node;
		});
		self.transform(transformer);
	};

	/**
	 * @this {Node} a symbol
	 * @returns {EXPECTED_ANY} the value its variable is known to hold, if any
	 */
	A.AST_Symbol.prototype.fixed_value = function fixed_value() {
		const fixed = this.thedef.fixed;
		if (!fixed || fixed instanceof A.AST_Node) return fixed;
		return fixed();
	};

	/**
	 * @this {Node} a reference
	 * @returns {boolean} whether it reads a function expression's own name
	 */
	A.AST_SymbolRef.prototype.is_immutable = function is_immutable() {
		const orig = this.definition().orig;
		return orig.length === 1 && orig[0] instanceof A.AST_SymbolLambda;
	};

	/**
	 * @this {Node} a reference
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether reading it cannot throw for want of a declaration
	 */
	A.AST_SymbolRef.prototype.is_declared = function is_declared(compressor) {
		return (
			!this.definition().undeclared ||
			((compressor.option("unsafe") || compressor.option("builtins_pure")) &&
				compressor.pure_access_globals(this.name))
		);
	};

	const directives = new Set(["use asm", "use strict"]);
	defineOptimizer(A.AST_Directive, (self, compressor) => {
		if (
			compressor.option("directives") &&
			(!directives.has(self.value) ||
				compressor.has_directive(self.value) !== self)
		) {
			return makeNode(A.AST_EmptyStatement, self);
		}
		return self;
	});

	defineOptimizer(A.AST_Debugger, (self, compressor) => {
		if (compressor.option("drop_debugger")) {
			return makeNode(A.AST_EmptyStatement, self);
		}
		return self;
	});

	defineOptimizer(A.AST_LabeledStatement, (self, compressor) => {
		if (
			self.body instanceof A.AST_Break &&
			compressor.loopcontrol_target(self.body) === self.body
		) {
			return makeNode(A.AST_EmptyStatement, self);
		}
		return self.label.references.length === 0 ? self.body : self;
	});

	defineOptimizer(A.AST_Block, (self, compressor) => {
		tightenBody(self.body, compressor);
		return self;
	});

	/**
	 * @param {Node} node a statement
	 * @returns {boolean} whether it can leave the block of an `if` without changing scope
	 */
	const canBeExtractedFromIfBlock = (node) =>
		!(
			node instanceof A.AST_Const ||
			node instanceof A.AST_Let ||
			node instanceof A.AST_Using ||
			node instanceof A.AST_Class
		);

	defineOptimizer(A.AST_BlockStatement, (self, compressor) => {
		tightenBody(self.body, compressor);
		switch (self.body.length) {
			case 1:
				if (
					(!compressor.has_directive("use strict") &&
						compressor.parent() instanceof A.AST_If &&
						canBeExtractedFromIfBlock(self.body[0])) ||
					canBeEvictedFromBlock(self.body[0])
				) {
					return self.body[0];
				}
				break;
			case 0:
				return makeNode(A.AST_EmptyStatement, self);
		}
		return self;
	});

	defineOptimizer(A.AST_Lambda, optimizeLambda);

	/**
	 * Hoists functions and `var`s to the top of the scope, as `hoist_funs` and
	 * `hoist_vars` ask, with its directives first.
	 * @this {Scope} the scope
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Scope} the scope, hoisted
	 */
	A.AST_Scope.prototype.hoist_declarations = function hoist_declarations(
		compressor
	) {
		let self = this;
		if (compressor.has_directive("use asm")) return self;

		const hoistFunctions = compressor.option("hoist_funs");
		let hoistVars = compressor.option("hoist_vars");

		if (hoistFunctions || hoistVars) {
			/** @type {Node[]} */
			const directiveStatements = [];
			/** @type {Node[]} */
			const hoisted = [];
			/** @type {Map<string, Node>} */
			const vars = new Map();
			let varsFound = 0;
			let varDeclarations = 0;
			// Hoisting a single `var` costs more than it saves.
			walk(self, (/** @type {Node} */ node) => {
				if (node instanceof A.AST_Scope && node !== self) return true;
				if (node instanceof A.AST_Var) {
					++varDeclarations;
					return true;
				}
				return undefined;
			});
			hoistVars = hoistVars && varDeclarations > 1;
			const transformer = new TreeTransformer((/** @type {Node} */ node) => {
				if (node !== self) {
					if (node instanceof A.AST_Directive) {
						directiveStatements.push(node);
						return makeNode(A.AST_EmptyStatement, node);
					}
					if (
						hoistFunctions &&
						node instanceof A.AST_Defun &&
						!(transformer.parent() instanceof A.AST_Export) &&
						transformer.parent() === self
					) {
						hoisted.push(node);
						return makeNode(A.AST_EmptyStatement, node);
					}
					if (
						hoistVars &&
						node instanceof A.AST_Var &&
						!node.definitions.some(
							(/** @type {Node} */ definition) =>
								definition.name instanceof A.AST_Destructuring
						)
					) {
						for (const definition of node.definitions) {
							vars.set(definition.name.name, definition);
							++varsFound;
						}
						const sequence = node.to_assignments(compressor);
						const parent = transformer.parent();
						if (parent instanceof A.AST_ForIn && parent.init === node) {
							if (sequence === null || sequence === undefined) {
								const name = node.definitions[0].name;
								return makeNode(A.AST_SymbolRef, name, name);
							}
							return sequence;
						}
						if (parent instanceof A.AST_For && parent.init === node) {
							return sequence;
						}
						if (!sequence) return makeNode(A.AST_EmptyStatement, node);
						return makeNode(A.AST_SimpleStatement, node, {
							body: sequence
						});
					}
					// Nested scopes are left as they are.
					if (node instanceof A.AST_Scope) return node;
				}
				return undefined;
			});
			self = self.transform(transformer);
			if (varsFound > 0) {
				// Only the vars that are not also the function's parameters.
				/** @type {Node[]} */
				const definitions = [];
				const isLambda = self instanceof A.AST_Lambda;
				const argumentNames = isLambda ? self.args_as_names() : null;
				for (let [name, definition] of vars.entries()) {
					if (
						isLambda &&
						argumentNames.some(
							(/** @type {Node} */ argument) =>
								argument.name === definition.name.name
						)
					) {
						vars.delete(name);
					} else {
						definition = definition.clone();
						definition.value = null;
						definitions.push(definition);
						vars.set(name, definition);
					}
				}
				if (definitions.length > 0) {
					// Merges the assignments that follow into the declarations.
					for (let i = 0; i < self.body.length;) {
						if (self.body[i] instanceof A.AST_SimpleStatement) {
							const expression = self.body[i].body;
							let symbol;
							let assign;
							if (
								expression instanceof A.AST_Assign &&
								expression.operator === "=" &&
								(symbol = expression.left) instanceof A.AST_Symbol &&
								vars.has(symbol.name)
							) {
								const definition = /** @type {Node} */ (vars.get(symbol.name));
								if (definition.value) break;
								definition.value = expression.right;
								remove(definitions, definition);
								definitions.push(definition);
								self.body.splice(i, 1);
								continue;
							}
							if (
								expression instanceof A.AST_Sequence &&
								(assign = expression.expressions[0]) instanceof A.AST_Assign &&
								assign.operator === "=" &&
								(symbol = assign.left) instanceof A.AST_Symbol &&
								vars.has(symbol.name)
							) {
								const definition = /** @type {Node} */ (vars.get(symbol.name));
								if (definition.value) break;
								definition.value = assign.right;
								remove(definitions, definition);
								definitions.push(definition);
								self.body[i].body = makeSequence(
									expression,
									expression.expressions.slice(1)
								);
								continue;
							}
						}
						if (self.body[i] instanceof A.AST_EmptyStatement) {
							self.body.splice(i, 1);
							continue;
						}
						if (self.body[i] instanceof A.AST_BlockStatement) {
							self.body.splice(i, 1, ...self.body[i].body);
							continue;
						}
						break;
					}
					hoisted.push(
						makeNode(A.AST_Var, self, {
							definitions
						})
					);
				}
			}
			// A class has no `body`, which `concat` appends as `undefined`; terser's quirk.
			// eslint-disable-next-line unicorn/prefer-spread
			self.body = directiveStatements.concat(hoisted, self.body);
		}
		return self;
	};

	defineOptimizer(A.AST_SimpleStatement, (self, compressor) => {
		if (compressor.option("side_effects")) {
			const body = self.body;
			const node = body.drop_side_effect_free(compressor, true);
			if (!node) {
				return makeNode(A.AST_EmptyStatement, self);
			}
			if (node !== body) {
				return makeNode(A.AST_SimpleStatement, self, { body: node });
			}
		}
		return self;
	});

	defineOptimizer(A.AST_While, (self, compressor) =>
		compressor.option("loops")
			? makeNode(A.AST_For, self, self).optimize(compressor)
			: self
	);

	defineOptimizer(A.AST_Do, (self, compressor) => {
		if (!compressor.option("loops")) return self;
		const condition = self.condition.tail_node().evaluate(compressor);
		if (!(condition instanceof A.AST_Node)) {
			if (condition) {
				return makeNode(A.AST_For, self, {
					body: makeNode(A.AST_BlockStatement, self.body, {
						body: [
							self.body,
							makeNode(A.AST_SimpleStatement, self.condition, {
								body: self.condition
							})
						]
					})
				}).optimize(compressor);
			}
			if (!hasBreakOrContinue(self, compressor.parent())) {
				return makeNode(A.AST_BlockStatement, self.body, {
					body: [
						self.body,
						makeNode(A.AST_SimpleStatement, self.condition, {
							body: self.condition
						})
					]
				}).optimize(compressor);
			}
		}
		return self;
	});

	/**
	 * terser's `if_break_in_loop`: folds a leading `break`, or an `if` whose
	 * branch is one, into the loop's condition.
	 * @param {Node} self a `for` loop
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node} the loop, or the block that replaces it
	 */
	const ifBreakInLoop = (self, compressor) => {
		/**
		 * @param {Node} node a statement
		 * @returns {boolean} whether it breaks out of the loop visited
		 */
		const isBreak = (node) =>
			node instanceof A.AST_Break &&
			compressor.loopcontrol_target(node) === compressor.self();

		/**
		 * Replaces the leading `if` of the body with the branch that does not
		 * break, then folds what it starts with in turn.
		 * @param {Node | null | undefined} rest the branch that stays
		 * @returns {void}
		 */
		const dropIt = (rest) => {
			const statements = asStatementArray(rest);
			if (self.body instanceof A.AST_BlockStatement) {
				self.body = self.body.clone();
				self.body.body = [...statements, ...self.body.body.slice(1)];
				self.body = self.body.transform(compressor);
			} else {
				self.body = makeNode(A.AST_BlockStatement, self.body, {
					body: statements
				}).transform(compressor);
			}
			self = ifBreakInLoop(self, compressor);
		};

		const first =
			self.body instanceof A.AST_BlockStatement ? self.body.body[0] : self.body;
		if (compressor.option("dead_code") && isBreak(first)) {
			/** @type {Node[]} */
			const body = [];
			if (self.init instanceof A.AST_Statement) {
				body.push(self.init);
			} else if (self.init) {
				body.push(
					makeNode(A.AST_SimpleStatement, self.init, {
						body: self.init
					})
				);
			}
			if (self.condition) {
				body.push(
					makeNode(A.AST_SimpleStatement, self.condition, {
						body: self.condition
					})
				);
			}
			extractFromUnreachableCode(compressor, self.body, body);
			return makeNode(A.AST_BlockStatement, self, {
				body
			});
		}
		if (first instanceof A.AST_If) {
			if (isBreak(first.body)) {
				if (self.condition) {
					self.condition = makeNode(A.AST_Binary, self.condition, {
						left: self.condition,
						operator: "&&",
						right: first.condition.negate(compressor)
					});
				} else {
					self.condition = first.condition.negate(compressor);
				}
				dropIt(first.alternative);
			} else if (isBreak(first.alternative)) {
				if (self.condition) {
					self.condition = makeNode(A.AST_Binary, self.condition, {
						left: self.condition,
						operator: "&&",
						right: first.condition
					});
				} else {
					self.condition = first.condition;
				}
				dropIt(first.body);
			}
		}
		return self;
	};

	defineOptimizer(A.AST_For, (self, compressor) => {
		if (!compressor.option("loops")) return self;
		if (compressor.option("side_effects") && self.init) {
			self.init = self.init.drop_side_effect_free(compressor);
		}
		if (self.condition) {
			let condition = self.condition.evaluate(compressor);
			if (!(condition instanceof A.AST_Node)) {
				if (condition) {
					self.condition = NO_NODE;
				} else if (!compressor.option("dead_code")) {
					const original = self.condition;
					self.condition = makeNodeFromConstant(condition, self.condition);
					self.condition = bestOfExpression(
						self.condition.transform(compressor),
						original
					);
				}
			}
			if (compressor.option("dead_code")) {
				if (condition instanceof A.AST_Node) {
					condition = self.condition.tail_node().evaluate(compressor);
				}
				if (!condition) {
					/** @type {Node[]} */
					const body = [];
					extractFromUnreachableCode(compressor, self.body, body);
					if (self.init instanceof A.AST_Statement) {
						body.push(self.init);
					} else if (self.init) {
						body.push(
							makeNode(A.AST_SimpleStatement, self.init, {
								body: self.init
							})
						);
					}
					body.push(
						makeNode(A.AST_SimpleStatement, self.condition, {
							body: self.condition
						})
					);
					return makeNode(A.AST_BlockStatement, self, { body }).optimize(
						compressor
					);
				}
			}
		}
		return ifBreakInLoop(self, compressor);
	});

	defineOptimizer(A.AST_If, (self, compressor) => {
		if (isEmpty(self.alternative)) self.alternative = NO_NODE;

		if (!compressor.option("conditionals")) return self;
		// A condition known statically has no side effects, so one branch
		// goes; `x && true` is not known, though it could be.
		let condition = self.condition.evaluate(compressor);
		if (!compressor.option("dead_code") && !(condition instanceof A.AST_Node)) {
			const original = self.condition;
			self.condition = makeNodeFromConstant(condition, original);
			self.condition = bestOfExpression(
				self.condition.transform(compressor),
				original
			);
		}
		if (compressor.option("dead_code")) {
			if (condition instanceof A.AST_Node) {
				condition = self.condition.tail_node().evaluate(compressor);
			}
			if (!condition) {
				/** @type {Node[]} */
				const body = [];
				extractFromUnreachableCode(compressor, self.body, body);
				body.push(
					makeNode(A.AST_SimpleStatement, self.condition, {
						body: self.condition
					})
				);
				if (self.alternative) body.push(self.alternative);
				return makeNode(A.AST_BlockStatement, self, { body }).optimize(
					compressor
				);
			} else if (!(condition instanceof A.AST_Node)) {
				/** @type {Node[]} */
				const body = [];
				body.push(
					makeNode(A.AST_SimpleStatement, self.condition, {
						body: self.condition
					})
				);
				body.push(self.body);
				if (self.alternative) {
					extractFromUnreachableCode(compressor, self.alternative, body);
				}
				return makeNode(A.AST_BlockStatement, self, { body }).optimize(
					compressor
				);
			}
		}
		const negated = self.condition.negate(compressor);
		const conditionLength = self.condition.size();
		const negatedLength = negated.size();
		let negatedIsBest = negatedLength < conditionLength;
		if (self.alternative && negatedIsBest) {
			// The branches are swapped here already; the lengths are only
			// compared for equality below, so they stay as they are.
			negatedIsBest = false;
			self.condition = negated;
			const body = self.body;
			self.body = self.alternative || makeNode(A.AST_EmptyStatement, self);
			self.alternative = body;
		}
		if (isEmpty(self.body) && isEmpty(self.alternative)) {
			return makeNode(A.AST_SimpleStatement, self.condition, {
				body: self.condition.clone()
			}).optimize(compressor);
		}
		if (
			self.body instanceof A.AST_SimpleStatement &&
			self.alternative instanceof A.AST_SimpleStatement
		) {
			return makeNode(A.AST_SimpleStatement, self, {
				body: makeNode(A.AST_Conditional, self, {
					condition: self.condition,
					consequent: self.body.body,
					alternative: self.alternative.body
				})
			}).optimize(compressor);
		}
		if (
			isEmpty(self.alternative) &&
			self.body instanceof A.AST_SimpleStatement
		) {
			if (
				conditionLength === negatedLength &&
				!negatedIsBest &&
				self.condition instanceof A.AST_Binary &&
				self.condition.operator === "||"
			) {
				// As long, but the negation needs no parentheses around it
				// (https://github.com/mishoo/UglifyJS2/issues/979).
				negatedIsBest = true;
			}
			if (negatedIsBest) {
				return makeNode(A.AST_SimpleStatement, self, {
					body: makeNode(A.AST_Binary, self, {
						operator: "||",
						left: negated,
						right: self.body.body
					})
				}).optimize(compressor);
			}
			return makeNode(A.AST_SimpleStatement, self, {
				body: makeNode(A.AST_Binary, self, {
					operator: "&&",
					left: self.condition,
					right: self.body.body
				})
			}).optimize(compressor);
		}
		if (
			self.body instanceof A.AST_EmptyStatement &&
			self.alternative instanceof A.AST_SimpleStatement
		) {
			return makeNode(A.AST_SimpleStatement, self, {
				body: makeNode(A.AST_Binary, self, {
					operator: "||",
					left: self.condition,
					right: self.alternative.body
				})
			}).optimize(compressor);
		}
		if (
			self.body instanceof A.AST_Exit &&
			self.alternative instanceof A.AST_Exit &&
			self.body.TYPE === self.alternative.TYPE
		) {
			return makeNode(self.body.CTOR, self, {
				value: makeNode(A.AST_Conditional, self, {
					condition: self.condition,
					consequent: self.body.value || makeVoid0(self.body),
					alternative: self.alternative.value || makeVoid0(self.alternative)
				}).transform(compressor)
			}).optimize(compressor);
		}
		if (
			self.body instanceof A.AST_If &&
			!self.body.alternative &&
			!self.alternative
		) {
			self = makeNode(A.AST_If, self, {
				condition: makeNode(A.AST_Binary, self.condition, {
					operator: "&&",
					left: self.condition,
					right: self.body.condition
				}),
				body: self.body.body,
				alternative: null
			});
		}
		if (aborts(self.body) && self.alternative) {
			const alternative = self.alternative;
			self.alternative = NO_NODE;
			return makeNode(A.AST_BlockStatement, self, {
				body: [self, alternative]
			}).optimize(compressor);
		}
		if (aborts(self.alternative)) {
			const body = self.body;
			self.body = self.alternative;
			self.condition = negatedIsBest
				? negated
				: self.condition.negate(compressor);
			self.alternative = NO_NODE;
			return makeNode(A.AST_BlockStatement, self, {
				body: [self, body]
			}).optimize(compressor);
		}
		return self;
	});

	defineOptimizer(A.AST_Switch, (self, compressor) => {
		if (!compressor.option("switches")) return self;
		let value = self.expression.evaluate(compressor);
		if (!(value instanceof A.AST_Node)) {
			const original = self.expression;
			self.expression = makeNodeFromConstant(value, original);
			self.expression = bestOfExpression(
				self.expression.transform(compressor),
				original
			);
		}
		if (!compressor.option("dead_code")) return self;
		if (value instanceof A.AST_Node) {
			value = self.expression.tail_node().evaluate(compressor);
		}
		/** @type {Node[]} */
		const declarations = [];
		/** @type {Node[]} */
		const body = [];

		/**
		 * @param {Node | undefined} node a statement
		 * @param {EXPECTED_ANY} stack the walker that visits it
		 * @returns {boolean} whether it breaks out of this switch
		 */
		const isBreak = (node, stack) =>
			node instanceof A.AST_Break && stack.loopcontrol_target(node) === self;

		/**
		 * @param {Node} branch a case or the default
		 * @param {Node=} previous the branch before it
		 * @returns {void}
		 */
		const eliminateBranch = (branch, previous) => {
			if (previous && !aborts(previous)) {
				previous.body = [...previous.body, ...branch.body];
			} else {
				extractFromUnreachableCode(compressor, branch, declarations);
			}
		};

		/**
		 * @param {Node} branch a branch
		 * @param {Node} previous another branch
		 * @param {boolean} insertBreak whether `branch` is read with a `break` after it
		 * @returns {boolean} whether both run the same statements
		 */
		const branchesEquivalent = (branch, previous, insertBreak) => {
			let branchBody = branch.body;
			const previousBody = previous.body;
			if (insertBreak) {
				branchBody = [...branchBody, makeNode(A.AST_Break)];
			}
			if (branchBody.length !== previousBody.length) return false;
			const branchBlock = makeNode(A.AST_BlockStatement, branch, {
				body: branchBody
			});
			const previousBlock = makeNode(A.AST_BlockStatement, previous, {
				body: previousBody
			});
			return branchBlock.equivalent_to(previousBlock);
		};

		/**
		 * @param {Node} expression an expression
		 * @returns {Node} a statement of it
		 */
		const statement = (expression) =>
			makeNode(A.AST_SimpleStatement, expression, { body: expression });

		/**
		 * @param {Node} root the switch
		 * @returns {boolean} whether it breaks out other than at the end of a branch
		 */
		const hasNestedBreak = (root) => {
			let hasBreak = false;
			const walker = new TreeWalker((/** @type {Node} */ node) => {
				if (hasBreak) return true;
				if (node instanceof A.AST_Lambda) return true;
				if (node instanceof A.AST_SimpleStatement) return true;
				if (!isBreak(node, walker)) return undefined;
				const parent = walker.parent();
				if (
					parent instanceof A.AST_SwitchBranch &&
					parent.body[parent.body.length - 1] === node
				) {
					return undefined;
				}
				hasBreak = true;
				return undefined;
			});
			root.walk(walker);
			return hasBreak;
		};

		/**
		 * @param {Node} branch a branch
		 * @returns {boolean} whether running its statements does nothing
		 */
		const isInertBody = (branch) =>
			!aborts(branch) &&
			!makeNode(A.AST_BlockStatement, branch, {
				body: branch.body
			}).has_side_effects(compressor);

		/** @type {Node | null | undefined} */
		let defaultBranch;
		/** @type {Node | undefined} */
		let exactMatch;
		// Compresses the branches into `body`, keeps one default, and finds the
		// branch whose case is the value, as `case 1234` in `switch (1234)`.
		let i = 0;
		const length = self.body.length;
		for (; i < length && !exactMatch; i++) {
			const branch = self.body[i];
			if (branch instanceof A.AST_Default) {
				if (!defaultBranch) {
					defaultBranch = branch;
				} else {
					eliminateBranch(branch, body[body.length - 1]);
				}
			} else if (!(value instanceof A.AST_Node)) {
				let expression = branch.expression.evaluate(compressor);
				if (!(expression instanceof A.AST_Node) && expression !== value) {
					eliminateBranch(branch, body[body.length - 1]);
					continue;
				}
				if (
					expression instanceof A.AST_Node &&
					!expression.has_side_effects(compressor)
				) {
					expression = branch.expression.tail_node().evaluate(compressor);
				}
				if (expression === value) {
					exactMatch = branch;
					if (defaultBranch) {
						const defaultIndex = body.indexOf(defaultBranch);
						body.splice(defaultIndex, 1);
						eliminateBranch(defaultBranch, body[defaultIndex - 1]);
						defaultBranch = null;
					}
				}
			}
			body.push(branch);
		}
		// Short of the end only after an exact match: the rest never runs.
		while (i < length) eliminateBranch(self.body[i++], body[body.length - 1]);
		self.body = body;

		/** @type {Node | null | undefined} */
		let defaultOrExact = defaultBranch || exactMatch;

		// Groups equivalent branches, which the loop after merges, where every
		// branch is a constant case ending in a jump.
		if (
			body.every(
				(branch, index) =>
					(branch === defaultOrExact ||
						branch.expression instanceof A.AST_Constant) &&
					(branch.body.length === 0 ||
						aborts(branch) ||
						body.length - 1 === index)
			)
		) {
			for (let i = 0; i < body.length; i++) {
				const branch = body[i];
				for (let j = i + 1; j < body.length; j++) {
					const next = body[j];
					if (next.body.length === 0) continue;
					const lastBranch = j === body.length - 1;
					const equivalentBranch = branchesEquivalent(next, branch, false);
					if (
						equivalentBranch ||
						(lastBranch && branchesEquivalent(next, branch, true))
					) {
						if (!equivalentBranch && lastBranch) {
							next.body.push(makeNode(A.AST_Break));
						}

						// The branches before it that fall through to it inertly.
						let x = j - 1;
						let fallthroughDepth = 0;
						while (x > i) {
							if (isInertBody(body[x--])) {
								fallthroughDepth++;
							} else {
								break;
							}
						}

						const plucked = body.splice(
							j - fallthroughDepth,
							1 + fallthroughDepth
						);
						body.splice(i + 1, 0, ...plucked);
						i += plucked.length;
					}
				}
			}
		}

		// Merges runs of equivalent branches.
		for (let i = 0; i < body.length; i++) {
			let branch = body[i];
			if (branch.body.length === 0) continue;
			if (!aborts(branch)) continue;

			for (let j = i + 1; j < body.length; i++, j++) {
				const next = body[j];
				if (next.body.length === 0) continue;
				if (
					branchesEquivalent(next, branch, false) ||
					(j === body.length - 1 && branchesEquivalent(next, branch, true))
				) {
					branch.body = [];
					branch = next;
					continue;
				}
				break;
			}
		}

		// Prunes the empty branches at the end.
		{
			let i = body.length - 1;
			for (; i >= 0; i--) {
				const branchBody = body[i].body;
				while (isBreak(branchBody[branchBody.length - 1], compressor)) {
					branchBody.pop();
				}
				if (!isInertBody(body[i])) break;
			}
			// The first of the empty branches.
			i++;
			if (!defaultOrExact || body.indexOf(defaultOrExact) >= i) {
				// Doing nothing is the default, so side-effect-free cases that do
				// nothing go, back to the last one with side effects.
				for (let j = body.length - 1; j >= i; j--) {
					const branch = body[j];
					if (branch === defaultOrExact) {
						defaultOrExact = null;
						eliminateBranch(/** @type {Node} */ (body.pop()));
					} else if (!branch.expression.has_side_effects(compressor)) {
						eliminateBranch(/** @type {Node} */ (body.pop()));
					} else {
						break;
					}
				}
			}
		}

		// Prunes side-effect-free branches that fall into the default.
		DEFAULT: if (defaultOrExact) {
			const defaultIndex = body.indexOf(defaultOrExact);
			let defaultBodyIndex = defaultIndex;
			for (; defaultBodyIndex < body.length - 1; defaultBodyIndex++) {
				if (!isInertBody(body[defaultBodyIndex])) break;
			}
			if (defaultBodyIndex < body.length - 1) {
				break DEFAULT;
			}

			let sideEffectIndex = body.length - 1;
			for (; sideEffectIndex >= 0; sideEffectIndex--) {
				const branch = body[sideEffectIndex];
				if (branch === defaultOrExact) continue;
				if (branch.expression.has_side_effects(compressor)) break;
			}
			// Side-effect-free cases fold into the default only where it comes
			// after every case with side effects, which they could skip.
			if (defaultBodyIndex > sideEffectIndex) {
				let previousBodyIndex = defaultIndex - 1;
				for (; previousBodyIndex >= 0; previousBodyIndex--) {
					if (!isInertBody(body[previousBodyIndex])) break;
				}
				const before = Math.max(sideEffectIndex, previousBodyIndex) + 1;
				let after = defaultIndex;
				if (sideEffectIndex > defaultIndex) {
					// The case with side effects that the default falls into stays,
					// and only the cases after it go.
					after = sideEffectIndex;
					body[sideEffectIndex].body = body[defaultBodyIndex].body;
				} else {
					// The default is the last branch.
					defaultOrExact.body = body[defaultBodyIndex].body;
				}

				// Everything after the default, or the last case with side
				// effects, up to the next case with a body.
				body.splice(after + 1, defaultBodyIndex - after);
				// Everything before the default that falls into it.
				body.splice(before, defaultIndex - before);
			}
		}

		// Drops the switch where every case falls into the one body.
		DEFAULT: if (defaultOrExact) {
			// -1 where no branch has a body, the last where all fall into it.
			const index = body.findIndex(
				(/** @type {Node} */ branch) => !isInertBody(branch)
			);
			let caseBody;
			if (index === body.length - 1) {
				const branch = body[index];
				if (hasNestedBreak(self)) break DEFAULT;

				// The last body, its breaks pruned already, so it can be hoisted.
				caseBody = makeNode(A.AST_BlockStatement, branch, {
					body: branch.body
				});
				branch.body = [];
			} else if (index !== -1) {
				// Several bodies.
				break DEFAULT;
			}

			const sideEffect = body.find(
				(/** @type {Node} */ branch) =>
					branch !== defaultOrExact &&
					branch.expression.has_side_effects(compressor)
			);
			if (!sideEffect) {
				return makeNode(A.AST_BlockStatement, self, {
					body: [
						...declarations,
						statement(self.expression),
						...(defaultOrExact.expression
							? [statement(defaultOrExact.expression)]
							: []),
						...(caseBody ? [caseBody] : [])
					]
				}).optimize(compressor);
			}

			// With no body left in it, doing nothing is the default, so the
			// default goes; a body is hoisted to after the switch.
			const defaultIndex = body.indexOf(defaultOrExact);
			body.splice(defaultIndex, 1);
			defaultOrExact = null;

			if (caseBody) {
				// Optimized once more, with no default left to recurse on.
				return makeNode(A.AST_BlockStatement, self, {
					body: [...declarations, self, caseBody]
				}).optimize(compressor);
			}
		}

		// The `var`s of the branches dropped.
		if (body.length > 0) {
			body[0].body = [...declarations, ...body[0].body];
		}
		if (body.length === 0) {
			return makeNode(A.AST_BlockStatement, self, {
				body: [...declarations, statement(self.expression)]
			}).optimize(compressor);
		}

		if (body.length === 1 && !hasNestedBreak(self)) {
			// The last body, its breaks pruned already, so it can be hoisted.
			const branch = body[0];
			return makeNode(A.AST_If, self, {
				condition: makeNode(A.AST_Binary, self, {
					operator: "===",
					left: self.expression,
					right: branch.expression
				}),
				body: makeNode(A.AST_BlockStatement, branch, {
					body: branch.body
				}),
				alternative: null
			}).optimize(compressor);
		}
		if (body.length === 2 && defaultOrExact && !hasNestedBreak(self)) {
			const branch = body[0] === defaultOrExact ? body[1] : body[0];
			const exactStatement =
				defaultOrExact.expression && statement(defaultOrExact.expression);
			if (aborts(body[0])) {
				// Only the first branch can end in a break.
				const first = body[0];
				if (isBreak(first.body[first.body.length - 1], compressor)) {
					first.body.pop();
				}
				return makeNode(A.AST_If, self, {
					condition: makeNode(A.AST_Binary, self, {
						operator: "===",
						left: self.expression,
						right: branch.expression
					}),
					body: makeNode(A.AST_BlockStatement, branch, {
						body: branch.body
					}),
					alternative: makeNode(A.AST_BlockStatement, defaultOrExact, {
						body: [
							...(exactStatement ? [exactStatement] : []),
							...defaultOrExact.body
						]
					})
				}).optimize(compressor);
			}
			let operator = "===";
			let consequent = makeNode(A.AST_BlockStatement, branch, {
				body: branch.body
			});
			let always = makeNode(A.AST_BlockStatement, defaultOrExact, {
				body: [
					...(exactStatement ? [exactStatement] : []),
					...defaultOrExact.body
				]
			});
			if (body[0] === defaultOrExact) {
				operator = "!==";
				const swapped = always;
				always = consequent;
				consequent = swapped;
			}
			return makeNode(A.AST_BlockStatement, self, {
				body: [
					makeNode(A.AST_If, self, {
						condition: makeNode(A.AST_Binary, self, {
							operator,
							left: self.expression,
							right: branch.expression
						}),
						body: consequent,
						alternative: null
					}),
					always
				]
			}).optimize(compressor);
		}
		return self;
	});

	defineOptimizer(A.AST_Try, (self, compressor) => {
		if (self.bcatch && self.bfinally && self.bfinally.body.every(isEmpty)) {
			self.bfinally = null;
		}

		if (compressor.option("dead_code") && self.body.body.every(isEmpty)) {
			/** @type {Node[]} */
			const body = [];
			if (self.bcatch) {
				extractFromUnreachableCode(compressor, self.bcatch, body);
			}
			if (self.bfinally) body.push(...self.bfinally.body);
			return makeNode(A.AST_BlockStatement, self, {
				body
			}).optimize(compressor);
		}
		return self;
	});

	/**
	 * @this {Node} a declaration
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node | null} the assignments of its initialized names, if any
	 */
	A.AST_Definitions.prototype.to_assignments = function to_assignments(
		compressor
	) {
		const reduceVars = compressor.option("reduce_vars");
		/** @type {Node[]} */
		const assignments = [];

		for (const definition of this.definitions) {
			if (definition.value) {
				const name = makeNode(
					A.AST_SymbolRef,
					definition.name,
					definition.name
				);
				assignments.push(
					makeNode(A.AST_Assign, definition, {
						operator: "=",
						logical: false,
						left: name,
						right: definition.value
					})
				);
				if (reduceVars) name.definition().fixed = false;
			}
			const variable = definition.name.definition();
			variable.eliminated++;
			variable.replaced--;
		}

		if (assignments.length === 0) return null;
		return makeSequence(this, assignments);
	};

	defineOptimizer(A.AST_Definitions, (self) => {
		if (self.definitions.length === 0) {
			return makeNode(A.AST_EmptyStatement, self);
		}
		return self;
	});

	defineOptimizer(A.AST_VarDef, (self, compressor) => {
		if (
			self.name instanceof A.AST_SymbolLet &&
			self.value !== null &&
			self.value !== undefined &&
			isUndefined(self.value, compressor)
		) {
			self.value = null;
		}
		return self;
	});

	defineOptimizer(A.AST_Import, (self) => self);
};

/**
 * Installs terser's optimizers of calls, `new`, sequences and unary and binary
 * operations, with the `lift_sequences` and `contains_optional` they call.
 * @param {TerserModules} modules terser's modules
 * @param {OptimizerHelpers} helpers what the optimizers share
 * @returns {void}
 */
const installOperatorOptimizers = (modules, helpers) => {
	const { ast, common, flags, inference, utils } = modules;
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (ast);
	const { walk, walk_abort: walkAbort } = ast;
	const { PRECEDENCE, parse, JS_Parse_Error: JSParseError } = modules.parse;
	const { OutputStream } = modules.output;
	const { Compressor } = modules.compress;
	const {
		make_sequence: makeSequence,
		best_of: bestOf,
		make_empty_function: makeEmptyFunction,
		make_node_from_constant: makeNodeFromConstant,
		merge_sequence: mergeSequence,
		maintain_this_binding: maintainThisBinding,
		is_identifier_atom: isIdentifierAtom,
		is_func_expr: isFunctionExpression
	} = common;
	const {
		is_undeclared_ref: isUndeclaredRef,
		bitwise_binop: bitwiseOperators,
		lazy_op: lazyOperators,
		is_nullish: isNullish,
		is_undefined: isUndefined
	} = inference;
	const { has_flag: hasFlag, set_flag: setFlag, UNUSED, TRUTHY, FALSY } = flags;
	const {
		make_void_0: makeVoid0,
		makePredicate,
		regexp_source_fix: regexpSourceFix,
		regexp_is_safe: regexpIsSafe
	} = utils;
	const {
		defineOptimizer,
		inlineArrayLikeSpread,
		unsafeUndefinedRef,
		inlineIntoCall
	} = helpers;
	const firstInStatement =
		/** @type {(compressor: TerserCompressor) => boolean | undefined} */ (
			createFirstInStatement(modules)
		);
	const commutativeOperators = makePredicate("== === != !== * & | ^");
	const unsafeConstructors = ["Object", "RegExp", "Function", "Error", "Array"];

	/**
	 * terser's `is_object`.
	 * @param {Node} node a node
	 * @returns {boolean} whether it is an array, function, object or class literal
	 */
	const isObject = (node) =>
		node instanceof A.AST_Array ||
		node instanceof A.AST_Lambda ||
		node instanceof A.AST_Object ||
		node instanceof A.AST_Class;

	/**
	 * terser's `[…].join(…)` folding, from inside its `AST_Call` optimizer.
	 * @param {Node} self the call
	 * @param {Node} expression its callee, a `.join` read of an array literal
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node | null} what replaces the call, or null to go on
	 */
	const optimizeJoin = (self, expression, compressor) => {
		let separator;
		if (self.args.length > 0) {
			separator = self.args[0].evaluate(compressor);
			if (separator === self.args[0]) return null;
		}
		/** @type {Node[]} */
		const elements = [];
		/** @type {EXPECTED_ANY[]} */
		const constants = [];
		for (
			let i = 0, length = expression.expression.elements.length;
			i < length;
			i++
		) {
			const element = expression.expression.elements[i];
			if (element instanceof A.AST_Expansion) return null;
			const value = element.evaluate(compressor);
			if (value !== element) {
				constants.push(value);
			} else {
				if (constants.length > 0) {
					elements.push(
						makeNode(A.AST_String, self, { value: constants.join(separator) })
					);
					constants.length = 0;
				}
				elements.push(element);
			}
		}
		if (constants.length > 0) {
			elements.push(
				makeNode(A.AST_String, self, { value: constants.join(separator) })
			);
		}
		if (elements.length === 0) {
			return makeNode(A.AST_String, self, { value: "" });
		}
		if (elements.length === 1) {
			if (elements[0].is_string(compressor)) return elements[0];
			return makeNode(A.AST_Binary, elements[0], {
				operator: "+",
				left: makeNode(A.AST_String, self, { value: "" }),
				right: elements[0]
			});
		}
		// A separator of `0`, `false` or `[]` joins with "" here too.
		// eslint-disable-next-line eqeqeq
		if (separator == "") {
			let first;
			if (
				elements[0].is_string(compressor) ||
				elements[1].is_string(compressor)
			) {
				first = /** @type {Node} */ (elements.shift());
			} else {
				first = makeNode(A.AST_String, self, { value: "" });
			}
			return elements
				.reduce(
					(previous, element) =>
						makeNode(A.AST_Binary, element, {
							operator: "+",
							left: previous,
							right: element
						}),
					first
				)
				.optimize(compressor);
		}
		// Cloned down to the array so the original stays intact for `best_of`.
		const node = self.clone();
		node.expression = node.expression.clone();
		node.expression.expression = node.expression.expression.clone();
		node.expression.expression.elements = elements;
		return bestOf(compressor, self, node);
	};

	defineOptimizer(A.AST_Call, (self, compressor) => {
		const expression = self.expression;
		let fn = expression;
		inlineArrayLikeSpread(self.args);
		const simpleArgs = self.args.every(
			(/** @type {Node} */ argument) => !(argument instanceof A.AST_Expansion)
		);

		if (compressor.option("reduce_vars") && fn instanceof A.AST_SymbolRef) {
			fn = fn.fixed_value();
		}

		const isFunction = fn instanceof A.AST_Lambda;

		if (isFunction && fn.pinned()) return self;

		if (
			compressor.option("unused") &&
			simpleArgs &&
			isFunction &&
			!fn.uses_arguments
		) {
			let position = 0;
			let last = 0;
			for (let i = 0, length = self.args.length; i < length; i++) {
				if (fn.argnames[i] instanceof A.AST_Expansion) {
					if (hasFlag(fn.argnames[i].expression, UNUSED)) {
						while (i < length) {
							const node = self.args[i++].drop_side_effect_free(compressor);
							if (node) {
								self.args[position++] = node;
							}
						}
					} else {
						while (i < length) {
							self.args[position++] = self.args[i++];
						}
					}
					last = position;
					break;
				}
				const trim = i >= fn.argnames.length;
				if (trim || hasFlag(fn.argnames[i], UNUSED)) {
					const node = self.args[i].drop_side_effect_free(compressor);
					if (node) {
						self.args[position++] = node;
					} else if (!trim) {
						self.args[position++] = makeNode(A.AST_Number, self.args[i], {
							value: 0
						});
						continue;
					}
				} else {
					self.args[position++] = self.args[i];
				}
				last = position;
			}
			self.args.length = last;
		}

		if (
			expression instanceof A.AST_Dot &&
			expression.expression instanceof A.AST_SymbolRef &&
			expression.expression.name === "console" &&
			expression.expression.definition().undeclared &&
			expression.property === "assert"
		) {
			const condition = self.args[0];
			if (condition) {
				const value = condition.evaluate(compressor);

				if (value === 1 || value === true) {
					return makeVoid0(self).optimize(compressor);
				}
			}
		}

		if (compressor.option("unsafe") && !expression.contains_optional()) {
			if (
				expression instanceof A.AST_Dot &&
				expression.start.value === "Array" &&
				expression.property === "from" &&
				self.args.length === 1
			) {
				const [argument] = self.args;
				if (argument instanceof A.AST_Array) {
					return makeNode(A.AST_Array, argument, {
						elements: argument.elements
					}).optimize(compressor);
				}
			}
			if (isUndeclaredRef(expression)) {
				switch (expression.name) {
					case "Array":
						if (self.args.length !== 1) {
							return makeNode(A.AST_Array, self, {
								elements: self.args
							}).optimize(compressor);
						} else if (
							self.args[0] instanceof A.AST_Number &&
							self.args[0].value <= 11
						) {
							const elements = [];
							for (let i = 0; i < self.args[0].value; i++) {
								elements.push(new A.AST_Hole());
							}
							return new A.AST_Array({ elements });
						}
						break;
					case "Object":
						if (self.args.length === 0) {
							return makeNode(A.AST_Object, self, {
								properties: []
							});
						}
						break;
					case "String":
						if (self.args.length === 0) {
							return makeNode(A.AST_String, self, {
								value: ""
							});
						}
						if (self.args.length <= 1) {
							return makeNode(A.AST_Binary, self, {
								left: self.args[0],
								operator: "+",
								right: makeNode(A.AST_String, self, { value: "" })
							}).optimize(compressor);
						}
						break;
					case "Number":
						if (self.args.length === 0) {
							return makeNode(A.AST_Number, self, {
								value: 0
							});
						}
						if (self.args.length === 1 && compressor.option("unsafe_math")) {
							return makeNode(A.AST_UnaryPrefix, self, {
								expression: self.args[0],
								operator: "+"
							}).optimize(compressor);
						}
						break;
					case "Symbol":
						if (
							self.args.length === 1 &&
							self.args[0] instanceof A.AST_String &&
							compressor.option("unsafe_symbols")
						) {
							self.args.length = 0;
						}
						break;
					case "Boolean":
						if (self.args.length === 0) return makeNode(A.AST_False, self);
						if (self.args.length === 1) {
							return makeNode(A.AST_UnaryPrefix, self, {
								expression: makeNode(A.AST_UnaryPrefix, self, {
									expression: self.args[0],
									operator: "!"
								}),
								operator: "!"
							}).optimize(compressor);
						}
						break;
					case "RegExp": {
						/** @type {EXPECTED_ANY[]} */
						const params = [];
						if (
							self.args.length >= 1 &&
							self.args.length <= 2 &&
							self.args.every((/** @type {Node} */ argument) => {
								const value = argument.evaluate(compressor);
								params.push(value);
								return argument !== value;
							}) &&
							regexpIsSafe(params[0])
						) {
							let [source] = params;
							const regexpFlags = params[1];
							source = regexpSourceFix(new RegExp(source).source);
							const regexp = makeNode(A.AST_RegExp, self, {
								value: { source, flags: regexpFlags }
							});
							if (regexp._eval(compressor) !== regexp) {
								return regexp;
							}
						}
						break;
					}
				}
			} else if (expression instanceof A.AST_Dot) {
				switch (expression.property) {
					case "toString":
						if (
							self.args.length === 0 &&
							!expression.expression.may_throw_on_access(compressor)
						) {
							return makeNode(A.AST_Binary, self, {
								left: makeNode(A.AST_String, self, { value: "" }),
								operator: "+",
								right: expression.expression
							}).optimize(compressor);
						}
						break;
					case "join":
						if (expression.expression instanceof A.AST_Array) {
							const joined = optimizeJoin(self, expression, compressor);
							if (joined) return joined;
						}
						break;
					case "charAt":
						if (expression.expression.is_string(compressor)) {
							const argument = self.args[0];
							const index = argument ? argument.evaluate(compressor) : 0;
							if (index !== argument) {
								return makeNode(A.AST_Sub, expression, {
									expression: expression.expression,
									property: makeNodeFromConstant(
										index | 0,
										argument || expression
									)
								}).optimize(compressor);
							}
						}
						break;
					case "apply":
						if (self.args.length === 2 && self.args[1] instanceof A.AST_Array) {
							const args = [...self.args[1].elements];
							args.unshift(self.args[0]);
							return makeNode(A.AST_Call, self, {
								expression: makeNode(A.AST_Dot, expression, {
									expression: expression.expression,
									optional: false,
									property: "call"
								}),
								args
							}).optimize(compressor);
						}
						break;
					case "call": {
						let func = expression.expression;
						if (func instanceof A.AST_SymbolRef) {
							func = func.fixed_value();
						}
						if (func instanceof A.AST_Lambda && !func.contains_this()) {
							// terser passes its optimizer's `this`, undefined, so no position.
							return (
								self.args.length
									? makeSequence(undefined, [
											self.args[0],
											makeNode(A.AST_Call, self, {
												expression: expression.expression,
												args: self.args.slice(1)
											})
										])
									: makeNode(A.AST_Call, self, {
											expression: expression.expression,
											args: []
										})
							).optimize(compressor);
						}
						break;
					}
				}
			}
		}

		if (
			compressor.option("unsafe_Function") &&
			isUndeclaredRef(expression) &&
			expression.name === "Function"
		) {
			if (self.args.length === 0) {
				return makeEmptyFunction(self).optimize(compressor);
			}
			if (
				self.args.every(
					(/** @type {Node} */ argument) => argument instanceof A.AST_String
				)
			) {
				// A constant `new Function` body is minified as a function of its own:
				// https://github.com/mishoo/UglifyJS2/issues/203
				try {
					const code = `n(function(${self.args
						.slice(0, -1)
						.map((/** @type {Node} */ argument) => argument.value)
						.join(",")}){${self.args[self.args.length - 1].value}})`;
					let program = parse(code);
					const mangle = compressor.mangle_options();
					program.figure_out_scope(mangle);
					const innerCompressor = new Compressor(compressor.options, {
						mangle_options: compressor._mangle_options
					});
					assignNativeLookups(innerCompressor, modules.nativeObjects);
					program = program.transform(innerCompressor);
					program.figure_out_scope(mangle);
					program.compute_char_frequency(mangle);
					program.mangle_names(mangle);
					/** @type {Node | undefined} */
					let fun;
					walk(program, (/** @type {Node} */ node) => {
						if (isFunctionExpression(node)) {
							fun = node;
							return walkAbort;
						}
					});
					const functionNode = /** @type {Node} */ (fun);
					const stream = OutputStream();
					A.AST_BlockStatement.prototype._codegen.call(
						functionNode,
						functionNode,
						stream
					);
					self.args = [
						makeNode(A.AST_String, self, {
							value: functionNode.argnames
								.map((/** @type {Node} */ argument) =>
									argument.print_to_string()
								)
								.join(",")
						}),
						makeNode(A.AST_String, self.args[self.args.length - 1], {
							value: stream.get().replace(/^\{|\}$/g, "")
						})
					];
					return self;
				} catch (error) {
					// Any other error is left to throw when the code runs.
					if (!(error instanceof JSParseError)) {
						throw error;
					}
				}
			}
		}

		return inlineIntoCall(self, compressor);
	});

	/**
	 * @this {Node} a node
	 * @returns {boolean} whether it holds an optional property read or call
	 */
	A.AST_Node.prototype.contains_optional = function contains_optional() {
		if (
			this instanceof A.AST_PropAccess ||
			this instanceof A.AST_Call ||
			this instanceof A.AST_Chain
		) {
			if (this.optional) {
				return true;
			}
			return this.expression.contains_optional();
		}
		return false;
	};

	defineOptimizer(A.AST_New, (self, compressor) => {
		if (
			compressor.option("unsafe") &&
			isUndeclaredRef(self.expression) &&
			unsafeConstructors.includes(self.expression.name)
		) {
			return makeNode(A.AST_Call, self, self).transform(compressor);
		}
		return self;
	});

	defineOptimizer(A.AST_Sequence, (self, compressor) => {
		if (!compressor.option("side_effects")) return self;
		/** @type {Node[]} */
		const expressions = [];
		let first = firstInStatement(compressor);
		const last = self.expressions.length - 1;
		for (let index = 0; index <= last; index++) {
			/** @type {Node | null} */ let expression = self.expressions[index];
			if (index < last) {
				expression = expression.drop_side_effect_free(compressor, first);
			}
			if (expression) {
				mergeSequence(expressions, expression);
				first = false;
			}
		}
		let end = expressions.length - 1;
		while (end > 0 && isUndefined(expressions[end], compressor)) end--;
		if (end < expressions.length - 1) {
			expressions[end] = makeNode(A.AST_UnaryPrefix, self, {
				operator: "void",
				expression: expressions[end]
			});
			expressions.length = end + 1;
		}
		if (end === 0) {
			self = maintainThisBinding(
				compressor.parent(),
				compressor.self(),
				expressions[0]
			);
			if (!(self instanceof A.AST_Sequence)) self = self.optimize(compressor);
			return self;
		}
		self.expressions = expressions;
		return self;
	});

	/**
	 * @this {Node} a unary operation
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node} a sequence ending in the operation, where its operand was one
	 */
	A.AST_Unary.prototype.lift_sequences = function lift_sequences(compressor) {
		if (
			compressor.option("sequences") &&
			this.expression instanceof A.AST_Sequence
		) {
			const expressions = [...this.expression.expressions];
			const clone = this.clone();
			clone.expression = /** @type {Node} */ (expressions.pop());
			expressions.push(clone);
			return makeSequence(this, expressions).optimize(compressor);
		}
		return this;
	};

	defineOptimizer(A.AST_UnaryPostfix, (self, compressor) =>
		self.lift_sequences(compressor)
	);

	defineOptimizer(A.AST_UnaryPrefix, (self, compressor) => {
		/** @type {Node | null} */ let expression = self.expression;
		if (
			self.operator === "delete" &&
			!(
				expression instanceof A.AST_SymbolRef ||
				expression instanceof A.AST_PropAccess ||
				expression instanceof A.AST_Chain ||
				isIdentifierAtom(expression)
			)
		) {
			return makeSequence(self, [
				expression,
				makeNode(A.AST_True, self)
			]).optimize(compressor);
		}
		if (
			self.operator === "void" &&
			expression instanceof A.AST_Number &&
			expression.value === 0
		) {
			return unsafeUndefinedRef(self, compressor) || self;
		}
		const sequence = self.lift_sequences(compressor);
		if (sequence !== self) {
			return sequence;
		}
		if (compressor.option("side_effects") && self.operator === "void") {
			expression = expression.drop_side_effect_free(compressor);
			if (expression) {
				self.expression = expression;
				return self;
			}
			return makeVoid0(self).optimize(compressor);
		}
		if (compressor.in_boolean_context()) {
			switch (self.operator) {
				case "!":
					if (
						expression instanceof A.AST_UnaryPrefix &&
						expression.operator === "!"
					) {
						return expression.expression;
					}
					if (expression instanceof A.AST_Binary) {
						self = bestOf(
							compressor,
							self,
							expression.negate(compressor, firstInStatement(compressor))
						);
					}
					break;
				case "typeof":
					// `typeof` yields a non-empty string, even of an undeclared name.
					return (
						expression instanceof A.AST_SymbolRef
							? makeNode(A.AST_True, self)
							: makeSequence(self, [expression, makeNode(A.AST_True, self)])
					).optimize(compressor);
			}
		}
		if (self.operator === "-" && expression instanceof A.AST_Infinity) {
			expression = expression.transform(compressor);
		}
		if (
			expression instanceof A.AST_Binary &&
			(self.operator === "+" || self.operator === "-") &&
			(expression.operator === "*" ||
				expression.operator === "/" ||
				expression.operator === "%")
		) {
			return makeNode(A.AST_Binary, self, {
				operator: expression.operator,
				left: makeNode(A.AST_UnaryPrefix, expression.left, {
					operator: self.operator,
					expression: expression.left
				}),
				right: expression.right
			});
		}

		if (compressor.option("evaluate")) {
			// ~~x => x, where only 32 bits are read or x has no more
			if (
				self.operator === "~" &&
				self.expression instanceof A.AST_UnaryPrefix &&
				self.expression.operator === "~" &&
				(compressor.in_32_bit_context(false) ||
					self.expression.expression.is_32_bit_integer(compressor))
			) {
				return self.expression.expression;
			}

			// ~(x ^ y) => x ^ ~y, and ~(~x ^ y) => x ^ y
			if (
				self.operator === "~" &&
				expression instanceof A.AST_Binary &&
				expression.operator === "^"
			) {
				if (
					expression.left instanceof A.AST_UnaryPrefix &&
					expression.left.operator === "~"
				) {
					expression.left = expression.left.bitwise_negate(compressor, true);
				} else {
					expression.right = expression.right.bitwise_negate(compressor, true);
				}
				return expression;
			}
		}

		if (
			self.operator !== "-" ||
			// A negative number literal would fold into itself forever.
			!(
				expression instanceof A.AST_Number ||
				expression instanceof A.AST_Infinity ||
				expression instanceof A.AST_BigInt
			)
		) {
			let evaluated = self.evaluate(compressor);
			if (evaluated !== self) {
				evaluated = makeNodeFromConstant(evaluated, self).optimize(compressor);
				return bestOf(compressor, evaluated, self);
			}
		}
		return self;
	});

	/**
	 * @this {Node} a binary operation
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node} a sequence ending in the operation, where an operand was one
	 */
	A.AST_Binary.prototype.lift_sequences = function lift_sequences(compressor) {
		if (compressor.option("sequences")) {
			if (this.left instanceof A.AST_Sequence) {
				const expressions = [...this.left.expressions];
				const clone = this.clone();
				clone.left = /** @type {Node} */ (expressions.pop());
				expressions.push(clone);
				return makeSequence(this, expressions).optimize(compressor);
			}
			if (
				this.right instanceof A.AST_Sequence &&
				!this.left.has_side_effects(compressor)
			) {
				const assign =
					this.operator === "=" && this.left instanceof A.AST_SymbolRef;
				const expressions = this.right.expressions;
				const last = expressions.length - 1;
				let i = 0;
				for (; i < last; i++) {
					if (!assign && expressions[i].has_side_effects(compressor)) break;
				}
				if (i === last) {
					const lifted = [...expressions];
					const clone = this.clone();
					clone.right = /** @type {Node} */ (lifted.pop());
					lifted.push(clone);
					return makeSequence(this, lifted).optimize(compressor);
				} else if (i > 0) {
					const clone = this.clone();
					clone.right = makeSequence(this.right, expressions.slice(i));
					const lifted = expressions.slice(0, i);
					lifted.push(clone);
					return makeSequence(this, lifted).optimize(compressor);
				}
			}
		}
		return this;
	};

	defineOptimizer(A.AST_Binary, (self, compressor) => {
		/**
		 * @returns {boolean} whether swapping the operands keeps what runs
		 */
		const reversible = () =>
			self.left.is_constant() ||
			self.right.is_constant() ||
			(!self.left.has_side_effects(compressor) &&
				!self.right.has_side_effects(compressor));
		/**
		 * @param {string=} operator the operator after the swap
		 * @returns {void}
		 */
		const reverse = (operator) => {
			if (reversible()) {
				if (operator) self.operator = operator;
				const left = self.left;
				self.left = self.right;
				self.right = left;
			}
		};
		if (
			compressor.option("lhs_constants") &&
			commutativeOperators.has(self.operator) &&
			self.right.is_constant() &&
			!self.left.is_constant() &&
			// A constant right cannot see what the left does, so they may swap.
			!(
				self.left instanceof A.AST_Binary &&
				PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator]
			)
		) {
			reverse();
		}
		self = self.lift_sequences(compressor);
		if (compressor.option("comparisons")) {
			/** @type {boolean | undefined} */
			let isStrictComparison;
			switch (self.operator) {
				case "===":
				case "!==":
					isStrictComparison = true;
					if (
						(self.left.is_string(compressor) &&
							self.right.is_string(compressor)) ||
						(self.left.is_number(compressor) &&
							self.right.is_number(compressor)) ||
						(self.left.is_bigint(compressor) &&
							self.right.is_bigint(compressor)) ||
						(self.left.is_boolean() && self.right.is_boolean()) ||
						self.left.equivalent_to(self.right)
					) {
						self.operator = self.operator.slice(0, 2);
					}
				// falls through
				case "==":
				case "!=":
					if (!isStrictComparison && isUndefined(self.left, compressor)) {
						// void 0 == x => null == x
						self.left = makeNode(A.AST_Null, self.left);
					} else if (
						!isStrictComparison &&
						isUndefined(self.right, compressor)
					) {
						self.right = makeNode(A.AST_Null, self.right);
					} else if (
						compressor.option("typeofs") &&
						// "undefined" == typeof x => undefined === x
						self.left instanceof A.AST_String &&
						self.left.value === "undefined" &&
						self.right instanceof A.AST_UnaryPrefix &&
						self.right.operator === "typeof"
					) {
						const expression = self.right.expression;
						if (
							expression instanceof A.AST_SymbolRef
								? expression.is_declared(compressor)
								: !(
										expression instanceof A.AST_PropAccess &&
										compressor.option("ie8")
									)
						) {
							self.right = expression;
							self.left = makeVoid0(self.left).optimize(compressor);
							if (self.operator.length === 2) self.operator += "=";
						}
					} else if (
						compressor.option("typeofs") &&
						self.left instanceof A.AST_UnaryPrefix &&
						self.left.operator === "typeof" &&
						self.right instanceof A.AST_String &&
						self.right.value === "undefined"
					) {
						const expression = self.left.expression;
						if (
							expression instanceof A.AST_SymbolRef
								? expression.is_declared(compressor)
								: !(
										expression instanceof A.AST_PropAccess &&
										compressor.option("ie8")
									)
						) {
							self.left = expression;
							self.right = makeVoid0(self.right).optimize(compressor);
							if (self.operator.length === 2) self.operator += "=";
						}
					} else if (
						self.left instanceof A.AST_SymbolRef &&
						// obj !== obj => false
						self.right instanceof A.AST_SymbolRef &&
						self.left.definition() === self.right.definition() &&
						isObject(self.left.fixed_value())
					) {
						return makeNode(
							self.operator[0] === "=" ? A.AST_True : A.AST_False,
							self
						);
					} else if (
						self.left.is_32_bit_integer(compressor) &&
						self.right.is_32_bit_integer(compressor)
					) {
						/**
						 * @param {Node} node an operand
						 * @returns {Node} its negation
						 */
						const logicalNot = (node) =>
							makeNode(A.AST_UnaryPrefix, node, {
								operator: "!",
								expression: node
							});
						/**
						 * @param {Node} node an operand
						 * @param {boolean} truthy whether to test it for truthiness
						 * @returns {Node} the test, as a boolean where one is read
						 */
						const asBooleanValue = (node, truthy) => {
							if (truthy) {
								return compressor.in_boolean_context()
									? node
									: logicalNot(logicalNot(node));
							}
							return logicalNot(node);
						};

						// The only falsy 32-bit integer is 0
						if (self.left instanceof A.AST_Number && self.left.value === 0) {
							return asBooleanValue(self.right, self.operator[0] === "!");
						}
						if (self.right instanceof A.AST_Number && self.right.value === 0) {
							return asBooleanValue(self.left, self.operator[0] === "!");
						}

						// (x & 0xFF) != 0xFF => !(~x & 0xFF)
						const andOperation =
							self.left instanceof A.AST_Binary
								? self.left
								: self.right instanceof A.AST_Binary
									? self.right
									: null;
						if (andOperation) {
							const mask = andOperation === self.left ? self.right : self.left;
							if (
								mask &&
								andOperation.operator === "&" &&
								mask instanceof A.AST_Number &&
								mask.is_32_bit_integer(compressor)
							) {
								const operand = andOperation.left.equivalent_to(mask)
									? andOperation.right
									: andOperation.right.equivalent_to(mask)
										? andOperation.left
										: null;
								if (operand) {
									const optimized = asBooleanValue(
										makeNode(A.AST_Binary, self, {
											operator: "&",
											left: mask,
											right: makeNode(A.AST_UnaryPrefix, self, {
												operator: "~",
												expression: operand
											})
										}),
										self.operator[0] === "!"
									);

									return bestOf(compressor, optimized, self);
								}
							}
						}
					}
					break;
				case "&&":
				case "||": {
					let lhs = self.left;
					if (lhs.operator === self.operator) {
						lhs = lhs.right;
					}
					if (
						lhs instanceof A.AST_Binary &&
						lhs.operator === (self.operator === "&&" ? "!==" : "===") &&
						self.right instanceof A.AST_Binary &&
						lhs.operator === self.right.operator &&
						((isUndefined(lhs.left, compressor) &&
							self.right.left instanceof A.AST_Null) ||
							(lhs.left instanceof A.AST_Null &&
								isUndefined(self.right.left, compressor))) &&
						!lhs.right.has_side_effects(compressor) &&
						lhs.right.equivalent_to(self.right.right)
					) {
						let combined = makeNode(A.AST_Binary, self, {
							operator: lhs.operator.slice(0, -1),
							left: makeNode(A.AST_Null, self),
							right: lhs.right
						});
						if (lhs !== self.left) {
							combined = makeNode(A.AST_Binary, self, {
								operator: self.operator,
								left: self.left.left,
								right: combined
							});
						}
						return combined;
					}
					break;
				}
			}
		}
		if (self.operator === "+" && compressor.in_boolean_context()) {
			const leftValue = self.left.evaluate(compressor);
			const rightValue = self.right.evaluate(compressor);
			if (leftValue && typeof leftValue === "string") {
				return makeSequence(self, [
					self.right,
					makeNode(A.AST_True, self)
				]).optimize(compressor);
			}
			if (rightValue && typeof rightValue === "string") {
				return makeSequence(self, [
					self.left,
					makeNode(A.AST_True, self)
				]).optimize(compressor);
			}
		}
		if (compressor.option("comparisons") && self.is_boolean()) {
			if (
				!(compressor.parent() instanceof A.AST_Binary) ||
				compressor.parent() instanceof A.AST_Assign
			) {
				const negated = makeNode(A.AST_UnaryPrefix, self, {
					operator: "!",
					expression: self.negate(compressor, firstInStatement(compressor))
				});
				self = bestOf(compressor, self, negated);
			}
			if (compressor.option("unsafe_comps")) {
				switch (self.operator) {
					case "<":
						reverse(">");
						break;
					case "<=":
						reverse(">=");
						break;
				}
			}
		}
		if (self.operator === "+") {
			if (
				self.right instanceof A.AST_String &&
				self.right.getValue() === "" &&
				self.left.is_string(compressor)
			) {
				return self.left;
			}
			if (
				self.left instanceof A.AST_String &&
				self.left.getValue() === "" &&
				self.right.is_string(compressor)
			) {
				return self.right;
			}
			if (
				self.left instanceof A.AST_Binary &&
				self.left.operator === "+" &&
				self.left.left instanceof A.AST_String &&
				self.left.left.getValue() === "" &&
				self.right.is_string(compressor)
			) {
				self.left = self.left.right;
				return self;
			}
		}
		if (compressor.option("evaluate")) {
			switch (self.operator) {
				case "&&": {
					const leftValue = hasFlag(self.left, TRUTHY)
						? true
						: hasFlag(self.left, FALSY)
							? false
							: self.left.evaluate(compressor);
					if (!leftValue) {
						return maintainThisBinding(
							compressor.parent(),
							compressor.self(),
							self.left
						).optimize(compressor);
					} else if (!(leftValue instanceof A.AST_Node)) {
						return makeSequence(self, [self.left, self.right]).optimize(
							compressor
						);
					}
					const rightValue = self.right.evaluate(compressor);
					if (!rightValue) {
						if (compressor.in_boolean_context()) {
							return makeSequence(self, [
								self.left,
								makeNode(A.AST_False, self)
							]).optimize(compressor);
						}
						setFlag(self, FALSY);
					} else if (!(rightValue instanceof A.AST_Node)) {
						const parent = compressor.parent();
						if (
							(parent.operator === "&&" && parent.left === compressor.self()) ||
							compressor.in_boolean_context()
						) {
							return self.left.optimize(compressor);
						}
					}
					// x || false && y ---> x ? y : false
					if (self.left.operator === "||") {
						const leftRightValue = self.left.right.evaluate(compressor);
						if (!leftRightValue) {
							return makeNode(A.AST_Conditional, self, {
								condition: self.left.left,
								consequent: self.right,
								alternative: self.left.right
							}).optimize(compressor);
						}
					}
					break;
				}
				case "||": {
					const leftValue = hasFlag(self.left, TRUTHY)
						? true
						: hasFlag(self.left, FALSY)
							? false
							: self.left.evaluate(compressor);
					if (!leftValue) {
						return makeSequence(self, [self.left, self.right]).optimize(
							compressor
						);
					} else if (!(leftValue instanceof A.AST_Node)) {
						return maintainThisBinding(
							compressor.parent(),
							compressor.self(),
							self.left
						).optimize(compressor);
					}
					const rightValue = self.right.evaluate(compressor);
					if (!rightValue) {
						const parent = compressor.parent();
						if (
							(parent.operator === "||" && parent.left === compressor.self()) ||
							compressor.in_boolean_context()
						) {
							return self.left.optimize(compressor);
						}
					} else if (!(rightValue instanceof A.AST_Node)) {
						if (compressor.in_boolean_context()) {
							return makeSequence(self, [
								self.left,
								makeNode(A.AST_True, self)
							]).optimize(compressor);
						}
						setFlag(self, TRUTHY);
					}
					if (self.left.operator === "&&") {
						const leftRightValue = self.left.right.evaluate(compressor);
						if (leftRightValue && !(leftRightValue instanceof A.AST_Node)) {
							return makeNode(A.AST_Conditional, self, {
								condition: self.left.left,
								consequent: self.left.right,
								alternative: self.right
							}).optimize(compressor);
						}
					}
					break;
				}
				case "??": {
					if (isNullish(self.left, compressor)) {
						return self.right;
					}

					const leftValue = self.left.evaluate(compressor);
					if (!(leftValue instanceof A.AST_Node)) {
						return leftValue === null || leftValue === undefined
							? self.right
							: self.left;
					}

					if (compressor.in_boolean_context()) {
						const rightValue = self.right.evaluate(compressor);
						if (!(rightValue instanceof A.AST_Node) && !rightValue) {
							return self.left;
						}
					}
				}
			}
			let associative = true;
			switch (self.operator) {
				case "+":
					// (x + "foo") + "bar" => x + "foobar"
					if (
						self.right instanceof A.AST_Constant &&
						self.left instanceof A.AST_Binary &&
						self.left.operator === "+" &&
						self.left.is_string(compressor)
					) {
						const binary = makeNode(A.AST_Binary, self, {
							operator: "+",
							left: self.left.right,
							right: self.right
						});
						const optimized = binary.optimize(compressor);
						if (binary !== optimized) {
							self = makeNode(A.AST_Binary, self, {
								operator: "+",
								left: self.left.left,
								right: optimized
							});
						}
					}
					// (x + "foo") + ("bar" + y) => (x + "foobar") + y
					if (
						self.left instanceof A.AST_Binary &&
						self.left.operator === "+" &&
						self.left.is_string(compressor) &&
						self.right instanceof A.AST_Binary &&
						self.right.operator === "+" &&
						self.right.is_string(compressor)
					) {
						const binary = makeNode(A.AST_Binary, self, {
							operator: "+",
							left: self.left.right,
							right: self.right.left
						});
						const optimized = binary.optimize(compressor);
						if (binary !== optimized) {
							self = makeNode(A.AST_Binary, self, {
								operator: "+",
								left: makeNode(A.AST_Binary, self.left, {
									operator: "+",
									left: self.left.left,
									right: optimized
								}),
								right: self.right.right
							});
						}
					}
					// a + -b => a - b
					if (
						self.right instanceof A.AST_UnaryPrefix &&
						self.right.operator === "-" &&
						self.left.is_number_or_bigint(compressor)
					) {
						self = makeNode(A.AST_Binary, self, {
							operator: "-",
							left: self.left,
							right: self.right.expression
						});
						break;
					}
					// -a + b => b - a
					if (
						self.left instanceof A.AST_UnaryPrefix &&
						self.left.operator === "-" &&
						reversible() &&
						self.right.is_number_or_bigint(compressor)
					) {
						self = makeNode(A.AST_Binary, self, {
							operator: "-",
							left: self.right,
							right: self.left.expression
						});
						break;
					}
					// `foo${bar}baz` + 1 => `foo${bar}baz1`
					if (self.left instanceof A.AST_TemplateString) {
						const left = self.left;
						const right = self.right.evaluate(compressor);
						// Loose, as terser: a node reads as its string form.
						// eslint-disable-next-line eqeqeq
						if (right != self.right) {
							left.segments[left.segments.length - 1].value += String(right);
							return left;
						}
					}
					// 1 + `foo${bar}baz` => `1foo${bar}baz`
					if (self.right instanceof A.AST_TemplateString) {
						const right = self.right;
						const left = self.left.evaluate(compressor);
						// eslint-disable-next-line eqeqeq
						if (left != self.left) {
							right.segments[0].value = String(left) + right.segments[0].value;
							return right;
						}
					}
					// `1${bar}2` + `foo${bar}baz` => `1${bar}2foo${bar}baz`
					if (
						self.left instanceof A.AST_TemplateString &&
						self.right instanceof A.AST_TemplateString
					) {
						const left = self.left;
						const segments = left.segments;
						const right = self.right;
						segments[segments.length - 1].value += right.segments[0].value;
						for (let i = 1; i < right.segments.length; i++) {
							segments.push(right.segments[i]);
						}
						return left;
					}
				// falls through
				case "*":
					associative = compressor.option("unsafe_math");
				// falls through
				case "&":
				case "|":
				case "^":
					// a + +b => +b + a
					if (
						self.left.is_number_or_bigint(compressor) &&
						self.right.is_number_or_bigint(compressor) &&
						reversible() &&
						!(
							self.left instanceof A.AST_Binary &&
							self.left.operator !== self.operator &&
							PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator]
						)
					) {
						const reversed = makeNode(A.AST_Binary, self, {
							operator: self.operator,
							left: self.right,
							right: self.left
						});
						if (
							self.right instanceof A.AST_Constant &&
							!(self.left instanceof A.AST_Constant)
						) {
							self = bestOf(compressor, reversed, self);
						} else {
							self = bestOf(compressor, self, reversed);
						}
					}
					if (associative && self.is_number_or_bigint(compressor)) {
						// a + (b + c) => (a + b) + c
						if (
							self.right instanceof A.AST_Binary &&
							self.right.operator === self.operator
						) {
							self = makeNode(A.AST_Binary, self, {
								operator: self.operator,
								left: makeNode(A.AST_Binary, self.left, {
									operator: self.operator,
									left: self.left,
									right: self.right.left,
									start: self.left.start,
									end: self.right.left.end
								}),
								right: self.right.right
							});
						}
						// (n + 2) + 3 => 5 + n, and (2 * n) * 3 => 6 * n
						if (
							self.right instanceof A.AST_Constant &&
							self.left instanceof A.AST_Binary &&
							self.left.operator === self.operator
						) {
							if (self.left.left instanceof A.AST_Constant) {
								self = makeNode(A.AST_Binary, self, {
									operator: self.operator,
									left: makeNode(A.AST_Binary, self.left, {
										operator: self.operator,
										left: self.left.left,
										right: self.right,
										start: self.left.left.start,
										end: self.right.end
									}),
									right: self.left.right
								});
							} else if (self.left.right instanceof A.AST_Constant) {
								self = makeNode(A.AST_Binary, self, {
									operator: self.operator,
									left: makeNode(A.AST_Binary, self.left, {
										operator: self.operator,
										left: self.left.right,
										right: self.right,
										start: self.left.right.start,
										end: self.right.end
									}),
									right: self.left.left
								});
							}
						}
						// (a | 1) | (2 | d) => (3 | a) | d
						if (
							self.left instanceof A.AST_Binary &&
							self.left.operator === self.operator &&
							self.left.right instanceof A.AST_Constant &&
							self.right instanceof A.AST_Binary &&
							self.right.operator === self.operator &&
							self.right.left instanceof A.AST_Constant
						) {
							self = makeNode(A.AST_Binary, self, {
								operator: self.operator,
								left: makeNode(A.AST_Binary, self.left, {
									operator: self.operator,
									left: makeNode(A.AST_Binary, self.left.left, {
										operator: self.operator,
										left: self.left.right,
										right: self.right.left,
										start: self.left.right.start,
										end: self.right.left.end
									}),
									right: self.left.left
								}),
								right: self.right.right
							});
						}
					}
			}

			if (bitwiseOperators.has(self.operator)) {
				// De Morgan: z & (X | y) => z & X where y & z is 0, else z & X | (y & z)
				let yValue;
				let zValue;
				let xNode;
				let yNode;
				const zNode = self.left;
				if (
					self.operator === "&" &&
					self.right instanceof A.AST_Binary &&
					self.right.operator === "|" &&
					typeof (zValue = self.left.evaluate(compressor)) === "number"
				) {
					if (
						typeof (yValue = self.right.right.evaluate(compressor)) === "number"
					) {
						// z & (X | y)
						xNode = self.right.left;
						yNode = self.right.right;
					} else if (
						typeof (yValue = self.right.left.evaluate(compressor)) === "number"
					) {
						// z & (y | X)
						xNode = self.right.right;
						yNode = self.right.left;
					}

					if (xNode && yNode) {
						if ((yValue & zValue) === 0) {
							self = makeNode(A.AST_Binary, self, {
								operator: self.operator,
								left: zNode,
								right: xNode
							});
						} else {
							const reorderedOperations = makeNode(A.AST_Binary, self, {
								operator: "|",
								left: makeNode(A.AST_Binary, self, {
									operator: "&",
									left: xNode,
									right: zNode
								}),
								right: makeNodeFromConstant(yValue & zValue, yNode)
							});

							self = bestOf(compressor, self, reorderedOperations);
						}
					}
				}

				// x | x => 0 | x, and x & x => 0 | x
				if (
					(self.operator === "|" || self.operator === "&") &&
					self.left.equivalent_to(self.right) &&
					!self.left.has_side_effects(compressor) &&
					compressor.in_32_bit_context(true)
				) {
					self.left = makeNode(A.AST_Number, self, { value: 0 });
					self.operator = "|";
				}

				// ~x ^ ~y => x ^ y
				if (
					self.operator === "^" &&
					self.left instanceof A.AST_UnaryPrefix &&
					self.left.operator === "~" &&
					self.right instanceof A.AST_UnaryPrefix &&
					self.right.operator === "~"
				) {
					self = makeNode(A.AST_Binary, self, {
						operator: "^",
						left: self.left.expression,
						right: self.right.expression
					});
				}

				// x << 0 => x | 0, and x >> 0 => x | 0
				if (
					(self.operator === "<<" || self.operator === ">>") &&
					self.right instanceof A.AST_Number &&
					self.right.value === 0
				) {
					self.operator = "|";
				}

				// {32 bit integer} | 0 => {32 bit integer}, and ^ 0 likewise
				const zeroSide =
					self.right instanceof A.AST_Number && self.right.value === 0
						? self.right
						: self.left instanceof A.AST_Number && self.left.value === 0
							? self.left
							: null;
				const nonZeroSide = /** @type {Node} */ (
					zeroSide && (zeroSide === self.right ? self.left : self.right)
				);
				if (
					zeroSide &&
					(self.operator === "|" || self.operator === "^") &&
					(nonZeroSide.is_32_bit_integer(compressor) ||
						compressor.in_32_bit_context(true))
				) {
					return nonZeroSide;
				}

				// {anything} & 0 => 0
				if (
					zeroSide &&
					self.operator === "&" &&
					!nonZeroSide.has_side_effects(compressor) &&
					nonZeroSide.is_32_bit_integer(compressor)
				) {
					return zeroSide;
				}

				/**
				 * @param {Node} node an operand
				 * @returns {boolean} whether it is -1, all bits set like ~0
				 */
				const isFullMask = (node) =>
					(node instanceof A.AST_Number && node.value === -1) ||
					(node instanceof A.AST_UnaryPrefix &&
						node.operator === "-" &&
						node.expression instanceof A.AST_Number &&
						node.expression.value === 1);

				const fullMask = isFullMask(self.right)
					? self.right
					: isFullMask(self.left)
						? self.left
						: null;
				const otherSide = fullMask === self.right ? self.left : self.right;

				// {32 bit integer} & -1 => {32 bit integer}
				if (
					fullMask &&
					self.operator === "&" &&
					(otherSide.is_32_bit_integer(compressor) ||
						compressor.in_32_bit_context(true))
				) {
					return otherSide;
				}

				// {anything} ^ -1 => ~{anything}
				if (
					fullMask &&
					self.operator === "^" &&
					(otherSide.is_32_bit_integer(compressor) ||
						compressor.in_32_bit_context(true))
				) {
					return otherSide.bitwise_negate(compressor);
				}
			}
		}
		// x && (y && z) => x && y && z, and x + ("y" + z) => x + "y" + z
		if (
			self.right instanceof A.AST_Binary &&
			self.right.operator === self.operator &&
			(lazyOperators.has(self.operator) ||
				(self.operator === "+" &&
					(self.right.left.is_string(compressor) ||
						(self.left.is_string(compressor) &&
							self.right.right.is_string(compressor)))))
		) {
			self.left = makeNode(A.AST_Binary, self.left, {
				operator: self.operator,
				left: self.left.transform(compressor),
				right: self.right.left.transform(compressor)
			});
			self.right = self.right.right.transform(compressor);
			return self.transform(compressor);
		}
		let evaluated = self.evaluate(compressor);
		if (evaluated !== self) {
			evaluated = makeNodeFromConstant(evaluated, self).optimize(compressor);
			return bestOf(compressor, evaluated, self);
		}
		return self;
	});
};

// The ancestors, innermost first, of a destructuring an `export` declares.
const DESTRUCTURING_EXPORT_ANCESTORS = [
	/^VarDef$/,
	/^(Const|Let|Var)$/,
	/^Export$/
];

/**
 * Installs terser's optimizers of symbols, constants, assignments, conditionals,
 * property reads, literals, functions, classes and destructuring.
 * @param {TerserModules} modules terser's modules
 * @param {OptimizerHelpers} helpers what the optimizers share
 * @returns {void}
 */
const installValueOptimizers = (modules, helpers) => {
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (modules.ast);
	const { walk, walk_abort: walkAbort, _NOINLINE } = A;
	const {
		make_void_0: makeVoid0,
		makePredicate,
		has_annotation: hasAnnotation
	} = modules.utils;
	const {
		make_sequence: makeSequence,
		best_of: bestOf,
		best_of_expression: bestOfExpression,
		make_empty_function: makeEmptyFunction,
		make_node_from_constant: makeNodeFromConstant,
		maintain_this_binding: maintainThisBinding,
		is_reachable: isReachable
	} = modules.common;
	const {
		is_undeclared_ref: isUndeclaredRef,
		is_nullish: isNullish,
		is_undefined: isUndefined
	} = modules.inference;
	const { UNUSED, clear_flag: clearFlag } = modules.flags;
	const {
		defineOptimizer,
		findVariable,
		optimizeLambda,
		isAtomic,
		unsafeUndefinedRef,
		inlineArrayLikeSpread,
		tightenBody,
		inlineIntoSymbolRef
	} = helpers;
	const firstInStatement = createFirstInStatement(modules);
	const assignOperators = makePredicate("+ - / * % >> << >>> | ^ &");
	const commutativeAssignOperators = makePredicate("* | ^ &");

	defineOptimizer(A.AST_SymbolExport, (self) => self);

	defineOptimizer(A.AST_SymbolRef, (self, compressor) => {
		if (
			!compressor.option("ie8") &&
			isUndeclaredRef(self) &&
			!compressor.find_parent(A.AST_With)
		) {
			switch (self.name) {
				case "undefined":
					return makeNode(A.AST_Undefined, self).optimize(compressor);
				case "NaN":
					return makeNode(A.AST_NaN, self).optimize(compressor);
				case "Infinity":
					return makeNode(A.AST_Infinity, self).optimize(compressor);
			}
		}
		if (compressor.option("reduce_vars") && !compressor.is_lhs()) {
			return inlineIntoSymbolRef(self, compressor);
		}
		return self;
	});

	defineOptimizer(A.AST_Undefined, (self, compressor) => {
		const symbolRef = unsafeUndefinedRef(self, compressor);
		if (symbolRef) return symbolRef;
		const lhs = compressor.is_lhs();
		if (lhs && isAtomic(lhs, self)) return self;
		return makeVoid0(self);
	});

	defineOptimizer(A.AST_Infinity, (self, compressor) => {
		const lhs = compressor.is_lhs();
		if (lhs && isAtomic(lhs, self)) return self;
		if (
			compressor.option("keep_infinity") &&
			!(lhs && !isAtomic(lhs, self)) &&
			!findVariable(compressor, "Infinity")
		) {
			return self;
		}
		return makeNode(A.AST_Binary, self, {
			operator: "/",
			left: makeNode(A.AST_Number, self, { value: 1 }),
			right: makeNode(A.AST_Number, self, { value: 0 })
		});
	});

	defineOptimizer(A.AST_NaN, (self, compressor) => {
		const lhs = compressor.is_lhs();
		if ((lhs && !isAtomic(lhs, self)) || findVariable(compressor, "NaN")) {
			return makeNode(A.AST_Binary, self, {
				operator: "/",
				left: makeNode(A.AST_Number, self, { value: 0 }),
				right: makeNode(A.AST_Number, self, { value: 0 })
			});
		}
		return self;
	});

	/**
	 * terser's `in_try`: whether a `try` between an exit and the assigned
	 * variable's function could still observe the assignment.
	 * @param {Node} self the assignment
	 * @param {TerserCompressor} compressor the compressor
	 * @param {number} level how far up the exit's parent is
	 * @param {Node} exit the `return` or `throw` the assignment is in
	 * @returns {true | undefined} true where one could
	 */
	const inTry = (self, compressor, level, exit) => {
		/**
		 * @returns {boolean} whether the exit may throw with the value assigned read as `null`
		 */
		const mayAssignmentThrow = () => {
			const right = self.right;
			self.right = makeNode(A.AST_Null, right);
			const mayThrow = exit.may_throw(compressor);
			self.right = right;
			return mayThrow;
		};
		const stopAt = self.left.definition().scope.get_defun_scope();
		let parent;
		while ((parent = compressor.parent(level++)) !== stopAt) {
			if (parent instanceof A.AST_Try) {
				if (parent.bfinally) return true;
				if (parent.bcatch && mayAssignmentThrow()) return true;
			}
		}
		return undefined;
	};

	defineOptimizer(A.AST_Assign, (self, compressor) => {
		if (self.logical) {
			return self.lift_sequences(compressor);
		}
		// x = x ---> x
		if (
			self.operator === "=" &&
			self.left instanceof A.AST_SymbolRef &&
			self.left.name !== "arguments" &&
			!self.left.definition().undeclared &&
			self.right.equivalent_to(self.left)
		) {
			return self.right;
		}
		let definition;
		if (
			compressor.option("dead_code") &&
			self.left instanceof A.AST_SymbolRef &&
			(definition = self.left.definition()).scope ===
				compressor.find_parent(A.AST_Lambda)
		) {
			let level = 0;
			let node;
			let parent = self;
			do {
				node = parent;
				parent = compressor.parent(level++);
				if (parent instanceof A.AST_Exit) {
					if (inTry(self, compressor, level, parent)) break;
					if (isReachable(definition.scope, [definition])) break;
					if (self.operator === "=") return self.right;
					definition.fixed = false;
					return makeNode(A.AST_Binary, self, {
						operator: self.operator.slice(0, -1),
						left: self.left,
						right: self.right
					}).optimize(compressor);
				}
			} while (
				(parent instanceof A.AST_Binary && parent.right === node) ||
				(parent instanceof A.AST_Sequence && parent.tail_node() === node)
			);
		}
		const assign = self.lift_sequences(compressor);
		if (
			assign.operator === "=" &&
			assign.left instanceof A.AST_SymbolRef &&
			assign.right instanceof A.AST_Binary
		) {
			if (
				assign.right.left instanceof A.AST_SymbolRef &&
				assign.right.left.name === assign.left.name &&
				assignOperators.has(assign.right.operator)
			) {
				// x = x - 2  --->  x -= 2
				assign.operator = `${assign.right.operator}=`;
				assign.right = assign.right.right;
			} else if (
				assign.right.right instanceof A.AST_SymbolRef &&
				assign.right.right.name === assign.left.name &&
				commutativeAssignOperators.has(assign.right.operator) &&
				!assign.right.left.has_side_effects(compressor)
			) {
				// x = 2 & x  --->  x &= 2
				assign.operator = `${assign.right.operator}=`;
				assign.right = assign.right.left;
			}
		}
		return assign;
	});

	defineOptimizer(A.AST_DefaultAssign, (self, compressor) => {
		if (!compressor.option("evaluate")) {
			return self;
		}
		let evaluateRight = self.right.evaluate(compressor);
		if (evaluateRight === undefined) {
			// `[x = undefined] = foo` ---> `[x] = foo`, and a parameter the same
			// way unless `keep_fargs`, or where its function is called at once.
			const lambda = compressor.parent();
			if (!(lambda instanceof A.AST_Lambda)) return self.left;
			if (compressor.option("keep_fargs") === false) return self.left;
			const iife = compressor.parent(1);
			if (iife.TYPE === "Call" && iife.expression === lambda) return self.left;
		} else if (evaluateRight !== self.right) {
			evaluateRight = makeNodeFromConstant(evaluateRight, self.right);
			self.right = bestOfExpression(evaluateRight, self.right);
		}
		return self;
	});

	/**
	 * terser's `is_nullish_check`: whether a condition tests `subject == null`,
	 * or `subject === null || subject === undefined` either way round.
	 * @param {Node} check the condition
	 * @param {Node} subject what it should test
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether it does
	 */
	const isNullishCheck = (check, subject, compressor) => {
		if (subject.may_throw(compressor)) return false;
		let nullishSide;
		// foo == null
		if (
			check instanceof A.AST_Binary &&
			check.operator === "==" &&
			((nullishSide = isNullish(check.left, compressor) && check.left) ||
				(nullishSide = isNullish(check.right, compressor) && check.right)) &&
			(nullishSide === check.left ? check.right : check.left).equivalent_to(
				subject
			)
		) {
			return true;
		}
		// foo === null || foo === undefined
		if (check instanceof A.AST_Binary && check.operator === "||") {
			/** @type {Node | undefined} */
			let nullComparison;
			/** @type {Node | undefined} */
			let undefinedComparison;
			/**
			 * @param {Node} comparison one side of the `||`
			 * @returns {boolean} whether it compares the subject with one nullish value
			 */
			const findComparison = (comparison) => {
				if (!(
					comparison instanceof A.AST_Binary &&
					(comparison.operator === "===" || comparison.operator === "==")
				)) {
					return false;
				}
				let found = 0;
				let definedSide;
				if (comparison.left instanceof A.AST_Null) {
					found++;
					nullComparison = comparison;
					definedSide = comparison.right;
				}
				if (comparison.right instanceof A.AST_Null) {
					found++;
					nullComparison = comparison;
					definedSide = comparison.left;
				}
				if (isUndefined(comparison.left, compressor)) {
					found++;
					undefinedComparison = comparison;
					definedSide = comparison.right;
				}
				if (isUndefined(comparison.right, compressor)) {
					found++;
					undefinedComparison = comparison;
					definedSide = comparison.left;
				}
				if (found !== 1) {
					return false;
				}
				return Boolean(
					/** @type {Node} */ (definedSide).equivalent_to(subject)
				);
			};
			if (!findComparison(check.left)) return false;
			if (!findComparison(check.right)) return false;
			if (
				nullComparison &&
				undefinedComparison &&
				nullComparison !== undefinedComparison
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * terser's `single_arg_diff`: the one argument two calls differ in.
	 * @param {Node} consequent a call
	 * @param {Node} alternative a call to the same callee with as many arguments
	 * @returns {number | undefined} its index, or undefined unless exactly one differs
	 */
	const singleArgumentDifference = (consequent, alternative) => {
		const first = consequent.args;
		const second = alternative.args;
		for (let i = 0, length = first.length; i < length; i++) {
			if (first[i] instanceof A.AST_Expansion) return undefined;
			if (!first[i].equivalent_to(second[i])) {
				if (second[i] instanceof A.AST_Expansion) return undefined;
				for (let j = i + 1; j < length; j++) {
					if (first[j] instanceof A.AST_Expansion) return undefined;
					if (!first[j].equivalent_to(second[j])) return undefined;
				}
				return i;
			}
		}
		return undefined;
	};

	defineOptimizer(A.AST_Conditional, (self, compressor) => {
		if (!compressor.option("conditionals")) return self;
		// This looks like lift_sequences(), should probably be under "sequences"
		if (self.condition instanceof A.AST_Sequence) {
			const expressions = [...self.condition.expressions];
			self.condition = /** @type {Node} */ (expressions.pop());
			expressions.push(self);
			return makeSequence(self, expressions);
		}
		const evaluated = self.condition.evaluate(compressor);
		if (evaluated !== self.condition) {
			if (evaluated) {
				return maintainThisBinding(
					compressor.parent(),
					compressor.self(),
					self.consequent
				);
			}
			return maintainThisBinding(
				compressor.parent(),
				compressor.self(),
				self.alternative
			);
		}
		const negated = evaluated.negate(
			compressor,
			firstInStatement(
				/** @type {Parameters<typeof firstInStatement>[0]} */ (compressor)
			)
		);
		if (bestOf(compressor, evaluated, negated) === negated) {
			self = makeNode(A.AST_Conditional, self, {
				condition: negated,
				consequent: self.alternative,
				alternative: self.consequent
			});
		}
		const condition = self.condition;
		const consequent = self.consequent;
		const alternative = self.alternative;
		// x?x:y --> x||y
		if (
			condition instanceof A.AST_SymbolRef &&
			consequent instanceof A.AST_SymbolRef &&
			condition.definition() === consequent.definition()
		) {
			return makeNode(A.AST_Binary, self, {
				operator: "||",
				left: condition,
				right: alternative
			});
		}
		// if (foo) exp = something; else exp = something_else;
		// ---> exp = foo ? something : something_else;
		if (
			consequent instanceof A.AST_Assign &&
			alternative instanceof A.AST_Assign &&
			consequent.operator === alternative.operator &&
			consequent.logical === alternative.logical &&
			consequent.left.equivalent_to(alternative.left) &&
			(!self.condition.has_side_effects(compressor) ||
				(consequent.operator === "=" &&
					!consequent.left.has_side_effects(compressor)))
		) {
			return makeNode(A.AST_Assign, self, {
				operator: consequent.operator,
				left: consequent.left,
				logical: consequent.logical,
				right: makeNode(A.AST_Conditional, self, {
					condition: self.condition,
					consequent: consequent.right,
					alternative: alternative.right
				})
			});
		}
		// x ? y(a) : y(b) --> y(x ? a : b)
		let argumentIndex;
		if (
			consequent instanceof A.AST_Call &&
			alternative.TYPE === consequent.TYPE &&
			consequent.args.length > 0 &&
			consequent.args.length === alternative.args.length &&
			consequent.expression.equivalent_to(alternative.expression) &&
			!self.condition.has_side_effects(compressor) &&
			!consequent.expression.has_side_effects(compressor) &&
			typeof (argumentIndex = singleArgumentDifference(
				consequent,
				alternative
			)) === "number"
		) {
			const node = consequent.clone();
			node.args[argumentIndex] = makeNode(A.AST_Conditional, self, {
				condition: self.condition,
				consequent: consequent.args[argumentIndex],
				alternative: alternative.args[argumentIndex]
			});
			return node;
		}
		// a ? b : c ? b : d --> (a || c) ? b : d
		if (
			alternative instanceof A.AST_Conditional &&
			consequent.equivalent_to(alternative.consequent)
		) {
			return makeNode(A.AST_Conditional, self, {
				condition: makeNode(A.AST_Binary, self, {
					operator: "||",
					left: condition,
					right: alternative.condition
				}),
				consequent,
				alternative: alternative.alternative
			}).optimize(compressor);
		}
		// a == null ? b : a -> a ?? b
		if (
			compressor.option("ecma") >= 2020 &&
			isNullishCheck(condition, alternative, compressor)
		) {
			return makeNode(A.AST_Binary, self, {
				operator: "??",
				left: alternative,
				right: consequent
			}).optimize(compressor);
		}
		// a ? b : (c, b) --> (a || c), b
		if (
			alternative instanceof A.AST_Sequence &&
			consequent.equivalent_to(
				alternative.expressions[alternative.expressions.length - 1]
			)
		) {
			return makeSequence(self, [
				makeNode(A.AST_Binary, self, {
					operator: "||",
					left: condition,
					right: makeSequence(self, alternative.expressions.slice(0, -1))
				}),
				consequent
			]).optimize(compressor);
		}
		// a ? b : (c && b) --> (a || c) && b
		if (
			alternative instanceof A.AST_Binary &&
			alternative.operator === "&&" &&
			consequent.equivalent_to(alternative.right)
		) {
			return makeNode(A.AST_Binary, self, {
				operator: "&&",
				left: makeNode(A.AST_Binary, self, {
					operator: "||",
					left: condition,
					right: alternative.left
				}),
				right: consequent
			}).optimize(compressor);
		}
		// x?y?z:a:a --> x&&y?z:a
		if (
			consequent instanceof A.AST_Conditional &&
			consequent.alternative.equivalent_to(alternative)
		) {
			return makeNode(A.AST_Conditional, self, {
				condition: makeNode(A.AST_Binary, self, {
					left: self.condition,
					operator: "&&",
					right: consequent.condition
				}),
				consequent: consequent.consequent,
				alternative
			});
		}
		// x ? y : y --> x, y
		if (consequent.equivalent_to(alternative)) {
			return makeSequence(self, [self.condition, consequent]).optimize(
				compressor
			);
		}
		// x ? y || z : z --> x && y || z
		if (
			consequent instanceof A.AST_Binary &&
			consequent.operator === "||" &&
			consequent.right.equivalent_to(alternative)
		) {
			return makeNode(A.AST_Binary, self, {
				operator: "||",
				left: makeNode(A.AST_Binary, self, {
					operator: "&&",
					left: self.condition,
					right: consequent.left
				}),
				right: alternative
			}).optimize(compressor);
		}

		const inBoolean = compressor.in_boolean_context();
		/**
		 * @param {Node} node an expression
		 * @returns {Node} it, or `!!` it where it may not be a boolean
		 */
		const toBooleanValue = (node) => {
			if (node.is_boolean()) return node;
			return makeNode(A.AST_UnaryPrefix, node, {
				operator: "!",
				expression: node.negate(compressor)
			});
		};
		/**
		 * @param {Node} node an expression
		 * @returns {EXPECTED_ANY} truthy where it is `true` or `!0`, or truthy in a boolean context
		 */
		const isTrue = (node) =>
			node instanceof A.AST_True ||
			(inBoolean && node instanceof A.AST_Constant && node.getValue()) ||
			(node instanceof A.AST_UnaryPrefix &&
				node.operator === "!" &&
				node.expression instanceof A.AST_Constant &&
				!node.expression.getValue());
		/**
		 * @param {Node} node an expression
		 * @returns {EXPECTED_ANY} truthy where it is `false` or `!1`, or falsy in a boolean context
		 */
		const isFalse = (node) =>
			node instanceof A.AST_False ||
			(inBoolean && node instanceof A.AST_Constant && !node.getValue()) ||
			(node instanceof A.AST_UnaryPrefix &&
				node.operator === "!" &&
				node.expression instanceof A.AST_Constant &&
				node.expression.getValue());
		if (isTrue(self.consequent)) {
			if (isFalse(self.alternative)) {
				// c ? true : false ---> !!c
				return toBooleanValue(self.condition);
			}
			// c ? true : x ---> !!c || x
			return makeNode(A.AST_Binary, self, {
				operator: "||",
				left: toBooleanValue(self.condition),
				right: self.alternative
			});
		}
		if (isFalse(self.consequent)) {
			if (isTrue(self.alternative)) {
				// c ? false : true ---> !c
				return toBooleanValue(self.condition.negate(compressor));
			}
			// c ? false : x ---> !c && x
			return makeNode(A.AST_Binary, self, {
				operator: "&&",
				left: toBooleanValue(self.condition.negate(compressor)),
				right: self.alternative
			});
		}
		if (isTrue(self.alternative)) {
			// c ? x : true ---> !c || x
			return makeNode(A.AST_Binary, self, {
				operator: "||",
				left: toBooleanValue(self.condition.negate(compressor)),
				right: self.consequent
			});
		}
		if (isFalse(self.alternative)) {
			// c ? x : false ---> !!c && x
			return makeNode(A.AST_Binary, self, {
				operator: "&&",
				left: toBooleanValue(self.condition),
				right: self.consequent
			});
		}
		return self;
	});

	defineOptimizer(A.AST_Boolean, (self, compressor) => {
		if (compressor.in_boolean_context()) {
			return makeNode(A.AST_Number, self, { value: Number(self.value) });
		}
		const parent = compressor.parent();
		if (compressor.option("booleans_as_integers")) {
			if (
				parent instanceof A.AST_Binary &&
				(parent.operator === "===" || parent.operator === "!==")
			) {
				parent.operator = parent.operator.replace(/[=]$/, "");
			}
			return makeNode(A.AST_Number, self, { value: Number(self.value) });
		}
		if (compressor.option("booleans")) {
			if (
				parent instanceof A.AST_Binary &&
				(parent.operator === "==" || parent.operator === "!=")
			) {
				return makeNode(A.AST_Number, self, { value: Number(self.value) });
			}
			return makeNode(A.AST_UnaryPrefix, self, {
				operator: "!",
				expression: makeNode(A.AST_Number, self, { value: 1 - self.value })
			});
		}
		return self;
	});

	/**
	 * terser's `safe_to_flatten`: whether a value can be read out of the literal
	 * holding it without changing what `this` it sees.
	 * @param {Node} value the value, or a reference to it; undefined past the end
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether it can
	 */
	const safeToFlatten = (value, compressor) => {
		const fixed =
			value instanceof A.AST_SymbolRef ? value.fixed_value() : value;
		if (!fixed) return false;
		if (!(fixed instanceof A.AST_Lambda || fixed instanceof A.AST_Class)) {
			return true;
		}
		if (!(fixed instanceof A.AST_Lambda && fixed.contains_this())) return true;
		return compressor.parent() instanceof A.AST_New;
	};

	/**
	 * terser's `flatten_object`: `{a: x, b: y}.b` as `[x, y][1]`.
	 * @this {Node} a property read
	 * @param {string} key the property read
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node | undefined} the array read, where one fits
	 */
	A.AST_PropAccess.prototype.flatten_object = function flatten_object(
		key,
		compressor
	) {
		if (!compressor.option("properties")) return undefined;
		if (key === "__proto__") return undefined;
		if (this instanceof A.AST_DotHash) return undefined;
		const arrows =
			compressor.option("unsafe_arrows") && compressor.option("ecma") >= 2015;
		const expression = this.expression;
		if (expression instanceof A.AST_Object) {
			const properties = expression.properties;
			for (let i = properties.length; --i >= 0;) {
				const property = properties[i];
				if (
					String(
						property instanceof A.AST_ConciseMethod
							? property.key.name
							: property.key
					) === key
				) {
					const everyPropertyFlattens = properties.every(
						(/** @type {Node} */ item) =>
							(item instanceof A.AST_ObjectKeyVal ||
								(arrows &&
									item instanceof A.AST_ConciseMethod &&
									!item.value.is_generator)) &&
							!item.computed_key()
					);
					if (!everyPropertyFlattens) return undefined;
					if (!safeToFlatten(property.value, compressor)) return undefined;
					return makeNode(A.AST_Sub, this, {
						expression: makeNode(A.AST_Array, expression, {
							elements: properties.map((/** @type {Node} */ item) => {
								let value = item.value;
								if (value instanceof A.AST_Accessor) {
									value = makeNode(A.AST_Function, value, value);
								}
								const itemKey = item.key;
								if (
									itemKey instanceof A.AST_Node &&
									!(itemKey instanceof A.AST_SymbolMethod)
								) {
									return makeSequence(item, [itemKey, value]);
								}
								return value;
							})
						}),
						property: makeNode(A.AST_Number, this, { value: i })
					});
				}
			}
		}
		return undefined;
	};

	/**
	 * terser's `arguments[n]` rewrite: the parameter an `arguments` read names,
	 * adding parameters up to it where none bind it yet.
	 * @param {Node} self the computed property read
	 * @param {TerserCompressor} compressor the compressor
	 * @param {Node} expression what it reads from
	 * @param {Node} property the property it reads
	 * @returns {Node | undefined} a reference to the parameter, where one fits
	 */
	const argumentsParameter = (self, compressor, expression, property) => {
		let lambda;
		if (!(
			compressor.option("arguments") &&
			expression instanceof A.AST_SymbolRef &&
			expression.name === "arguments" &&
			expression.definition().orig.length === 1 &&
			(lambda = expression.scope) instanceof A.AST_Lambda &&
			lambda.uses_arguments &&
			!(lambda instanceof A.AST_Arrow) &&
			property instanceof A.AST_Number
		)) {
			return undefined;
		}
		const index = property.getValue();
		const names = new Set();
		const parameters = lambda.argnames;
		for (let i = 0; i < parameters.length; i++) {
			// A destructuring or a repeated parameter leaves `arguments` as it is.
			if (!(parameters[i] instanceof A.AST_SymbolFunarg)) return undefined;
			const name = parameters[i].name;
			if (names.has(name)) return undefined;
			names.add(name);
		}
		/** @type {Node | null} */ let parameter = lambda.argnames[index];
		if (parameter && compressor.has_directive("use strict")) {
			const definition = parameter.definition();
			if (
				!compressor.option("reduce_vars") ||
				definition.assignments ||
				definition.orig.length > 1
			) {
				parameter = null;
			}
		} else if (
			!parameter &&
			!compressor.option("keep_fargs") &&
			index < lambda.argnames.length + 5
		) {
			while (index >= lambda.argnames.length) {
				parameter = lambda.create_symbol(A.AST_SymbolFunarg, {
					source: lambda,
					scope: lambda,
					tentative_name: `argument_${lambda.argnames.length}`
				});
				lambda.argnames.push(/** @type {Node} */ (parameter));
			}
		}
		if (parameter) {
			const symbol = makeNode(A.AST_SymbolRef, self, parameter);
			symbol.reference({});
			clearFlag(parameter, UNUSED);
			return symbol;
		}
		return undefined;
	};

	/**
	 * terser's `[a, b, c][1]` rewrite: the element read, after what the others
	 * do, or a shorter array where the ones after it keep side effects.
	 * @param {Node} self the computed property read
	 * @param {TerserCompressor} compressor the compressor
	 * @param {Node} expression the array it reads from
	 * @param {Node} property the number it reads
	 * @returns {Node | undefined} the replacement, where one fits
	 */
	const flattenArrayRead = (self, compressor, expression, property) => {
		let index = property.getValue();
		const elements = expression.elements;
		let returnValue = elements[index];
		if (!safeToFlatten(returnValue, compressor)) return undefined;
		let flatten = true;
		/** @type {Node[]} */
		const values = [];
		// Shared by both loops: the second resumes where the first stops.
		let i = elements.length;
		while (--i > index) {
			const value = elements[i].drop_side_effect_free(compressor);
			if (value) {
				values.unshift(value);
				if (flatten && value.has_side_effects(compressor)) flatten = false;
			}
		}
		if (returnValue instanceof A.AST_Expansion) return undefined;
		returnValue =
			returnValue instanceof A.AST_Hole ? makeVoid0(returnValue) : returnValue;
		if (!flatten) values.unshift(returnValue);
		while (--i >= 0) {
			/** @type {Node | null} */ let value = elements[i];
			if (value instanceof A.AST_Expansion) return undefined;
			value = value.drop_side_effect_free(compressor);
			if (value) values.unshift(value);
			else index--;
		}
		if (flatten) {
			values.push(returnValue);
			return makeSequence(self, values).optimize(compressor);
		}
		return makeNode(A.AST_Sub, self, {
			expression: makeNode(A.AST_Array, expression, { elements: values }),
			property: makeNode(A.AST_Number, property, { value: index })
		});
	};

	defineOptimizer(A.AST_Sub, (self, compressor) => {
		let expression = self.expression;
		let property = self.property;
		let key;
		let name;
		if (compressor.option("properties")) {
			key = property.evaluate(compressor);
			if (key !== property) {
				if (typeof key === "string") {
					if (key === "undefined") {
						key = undefined;
					} else {
						const value = Number.parseFloat(key);
						if (value.toString() === key) {
							key = value;
						}
					}
				}
				property = self.property = bestOfExpression(
					property,
					makeNodeFromConstant(key, property).transform(compressor)
				);
				name = String(key);
				if (BASIC_IDENTIFIER.test(name) && name.length <= property.size() + 1) {
					return makeNode(A.AST_Dot, self, {
						expression,
						optional: self.optional,
						property: name,
						quote: property.quote
					}).optimize(compressor);
				}
			}
		}
		const parameter = argumentsParameter(
			self,
			compressor,
			expression,
			property
		);
		if (parameter) return parameter;
		if (compressor.is_lhs()) return self;
		// Without `properties` the key is undefined, never the property node.
		if (key !== property) {
			const sub = self.flatten_object(name, compressor);
			if (sub) {
				expression = self.expression = sub.expression;
				property = self.property = sub.property;
			}
		}
		if (
			compressor.option("properties") &&
			compressor.option("side_effects") &&
			property instanceof A.AST_Number &&
			expression instanceof A.AST_Array
		) {
			const flattened = flattenArrayRead(
				self,
				compressor,
				expression,
				property
			);
			if (flattened) return flattened;
		}
		let evaluated = self.evaluate(compressor);
		if (evaluated !== self) {
			evaluated = makeNodeFromConstant(evaluated, self).optimize(compressor);
			return bestOf(compressor, evaluated, self);
		}
		return self;
	});

	defineOptimizer(A.AST_Chain, (self, compressor) => {
		if (isNullish(self.expression, compressor)) {
			const parent = compressor.parent();
			// `delete undefined` would read as a syntax error once the delete is
			// optimized, where `delete 0` is fine.
			if (parent instanceof A.AST_UnaryPrefix && parent.operator === "delete") {
				return makeNodeFromConstant(0, self);
			}
			return makeVoid0(self).optimize(compressor);
		}
		if (
			self.expression instanceof A.AST_PropAccess ||
			self.expression instanceof A.AST_Call
		) {
			return self;
		}
		// Keep the AST valid, in case the child swapped itself.
		return self.expression;
	});

	defineOptimizer(A.AST_Dot, (self, compressor) => {
		const parent = compressor.parent();
		if (compressor.is_lhs()) return self;
		if (
			compressor.option("unsafe_proto") &&
			self.expression instanceof A.AST_Dot &&
			self.expression.property === "prototype"
		) {
			const expression = self.expression.expression;
			if (isUndeclaredRef(expression)) {
				switch (expression.name) {
					case "Array":
						self.expression = makeNode(A.AST_Array, self.expression, {
							elements: []
						});
						break;
					case "Function":
						self.expression = makeEmptyFunction(self.expression);
						break;
					case "Number":
						self.expression = makeNode(A.AST_Number, self.expression, {
							value: 0
						});
						break;
					case "Object":
						self.expression = makeNode(A.AST_Object, self.expression, {
							properties: []
						});
						break;
					case "RegExp":
						self.expression = makeNode(A.AST_RegExp, self.expression, {
							value: { source: "t", flags: "" }
						});
						break;
					case "String":
						self.expression = makeNode(A.AST_String, self.expression, {
							value: ""
						});
						break;
				}
			}
		}
		if (!(parent instanceof A.AST_Call) || !hasAnnotation(parent, _NOINLINE)) {
			const sub = self.flatten_object(self.property, compressor);
			if (sub) return sub.optimize(compressor);
		}
		if (
			self.expression instanceof A.AST_PropAccess &&
			parent instanceof A.AST_PropAccess
		) {
			return self;
		}
		let evaluated = self.evaluate(compressor);
		if (evaluated !== self) {
			evaluated = makeNodeFromConstant(evaluated, self).optimize(compressor);
			return bestOf(compressor, evaluated, self);
		}
		return self;
	});

	/**
	 * terser's `literals_in_boolean_context`: a literal that is always truthy,
	 * as the shorter of itself and its side effects followed by `true`.
	 * @param {Node} self an array, object or regular expression literal
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node} what replaces it
	 */
	const literalsInBooleanContext = (self, compressor) => {
		if (compressor.in_boolean_context()) {
			return bestOf(
				compressor,
				self,
				makeSequence(self, [self, makeNode(A.AST_True, self)]).optimize(
					compressor
				)
			);
		}
		return self;
	};

	defineOptimizer(A.AST_Array, (self, compressor) => {
		const optimized = literalsInBooleanContext(self, compressor);
		if (optimized !== self) {
			return optimized;
		}
		inlineArrayLikeSpread(self.elements);
		return self;
	});

	/**
	 * terser's `inline_object_prop_spread`: spreads in place each object literal
	 * of plain properties, and drops each spread constant but a string.
	 * @param {Node[]} properties an object literal's properties
	 * @returns {void}
	 */
	const inlineObjectPropertySpread = (properties) => {
		for (let i = 0; i < properties.length; i++) {
			const property = properties[i];
			if (property instanceof A.AST_Expansion) {
				const expression = property.expression;
				if (
					expression instanceof A.AST_Object &&
					expression.properties.every(
						(/** @type {Node} */ item) => item instanceof A.AST_ObjectKeyVal
					)
				) {
					properties.splice(i, 1, ...expression.properties);
					// The property at `i` is a new one.
					i--;
				} else if (
					// `is_constant()` is false for a regular expression, hence both.
					(expression instanceof A.AST_Constant || expression.is_constant()) &&
					!(expression instanceof A.AST_String)
				) {
					properties.splice(i, 1);
					i--;
				}
			}
		}
	};

	defineOptimizer(A.AST_Object, (self, compressor) => {
		const optimized = literalsInBooleanContext(self, compressor);
		if (optimized !== self) {
			return optimized;
		}
		inlineObjectPropertySpread(self.properties);
		return self;
	});

	defineOptimizer(A.AST_RegExp, literalsInBooleanContext);

	defineOptimizer(A.AST_Return, (self, compressor) => {
		if (self.value && isUndefined(self.value, compressor)) {
			self.value = null;
		}
		return self;
	});

	defineOptimizer(A.AST_Arrow, optimizeLambda);

	defineOptimizer(A.AST_Function, (self, compressor) => {
		const lambda = optimizeLambda(self, compressor);
		if (
			compressor.option("unsafe_arrows") &&
			compressor.option("ecma") >= 2015 &&
			!lambda.name &&
			!lambda.is_generator &&
			!lambda.uses_arguments &&
			!lambda.pinned()
		) {
			const usesThis = walk(lambda, (/** @type {Node} */ node) => {
				if (node instanceof A.AST_This) return walkAbort;
				return undefined;
			});
			if (!usesThis) {
				return makeNode(A.AST_Arrow, lambda, lambda).optimize(compressor);
			}
		}
		return lambda;
	});

	defineOptimizer(A.AST_Class, (self) => {
		for (let i = 0; i < self.properties.length; i++) {
			const property = self.properties[i];
			if (
				property instanceof A.AST_ClassStaticBlock &&
				property.body.length === 0
			) {
				self.properties.splice(i, 1);
				i--;
			}
		}
		return self;
	});

	defineOptimizer(A.AST_ClassStaticBlock, (self, compressor) => {
		tightenBody(self.body, compressor);
		return self;
	});

	defineOptimizer(A.AST_Yield, (self, compressor) => {
		if (
			self.expression &&
			!self.is_star &&
			isUndefined(self.expression, compressor)
		) {
			self.expression = NO_NODE;
		}
		return self;
	});

	defineOptimizer(A.AST_TemplateString, (self, compressor) => {
		if (
			!compressor.option("evaluate") ||
			compressor.parent() instanceof A.AST_PrefixedTemplateString
		) {
			return self;
		}
		/** @type {Node[]} */
		const segments = [];
		for (let i = 0; i < self.segments.length; i++) {
			let segment = self.segments[i];
			if (segment instanceof A.AST_Node) {
				const result = segment.evaluate(compressor);
				// A constant no longer than `${segment}`, the 3 being `${}`; a node
				// always has a segment before and after it.
				if (result !== segment && String(result).length <= segment.size() + 3) {
					segments[segments.length - 1].value =
						segments[segments.length - 1].value +
						result +
						self.segments[++i].value;
					continue;
				}
				// `before ${`inner ${any} after`} after` => `before inner ${any} after after`
				if (segment instanceof A.AST_TemplateString) {
					const inners = segment.segments;
					segments[segments.length - 1].value += inners[0].value;
					for (let j = 1; j < inners.length; j++) {
						segment = inners[j];
						segments.push(segment);
					}
					continue;
				}
			}
			segments.push(segment);
		}
		self.segments = segments;
		// `foo` => "foo"
		if (segments.length === 1) {
			return makeNode(A.AST_String, self, segments[0]);
		}
		if (
			segments.length === 3 &&
			segments[1] instanceof A.AST_Node &&
			(segments[1].is_string(compressor) ||
				segments[1].is_number_or_bigint(compressor) ||
				isNullish(segments[1], compressor) ||
				compressor.option("unsafe"))
		) {
			// `foo${bar}` => "foo" + bar
			if (segments[2].value === "") {
				return makeNode(A.AST_Binary, self, {
					operator: "+",
					left: makeNode(A.AST_String, self, { value: segments[0].value }),
					right: segments[1]
				});
			}
			// `${bar}baz` => bar + "baz"
			if (segments[0].value === "") {
				return makeNode(A.AST_Binary, self, {
					operator: "+",
					left: segments[1],
					right: makeNode(A.AST_String, self, { value: segments[2].value })
				});
			}
		}
		return self;
	});

	defineOptimizer(A.AST_PrefixedTemplateString, (self) => self);

	/**
	 * terser's `lift_key`: `["p"]: 1` as `p: 1` and `[42]: 1` as `42: 1`.
	 * @param {Node} self an object or class property
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node} the property
	 */
	const liftKey = (self, compressor) => {
		if (!compressor.option("computed_props")) return self;
		// Not every constant is a key, so this only saves the next tests.
		if (!(self.key instanceof A.AST_Constant)) return self;
		if (self.key instanceof A.AST_String || self.key instanceof A.AST_Number) {
			const key = self.key.value.toString();
			if (key === "__proto__") return self;
			if (key === "constructor" && compressor.parent() instanceof A.AST_Class) {
				return self;
			}
			if (self instanceof A.AST_ObjectKeyVal) {
				self.quote = self.key.quote;
				self.key = key;
			} else if (self instanceof A.AST_ClassProperty) {
				self.quote = self.key.quote;
				self.key = makeNode(A.AST_SymbolClassProperty, self.key, {
					name: key
				});
			} else {
				self.quote = self.key.quote;
				self.key = makeNode(A.AST_SymbolMethod, self.key, { name: key });
			}
		}
		return self;
	};

	defineOptimizer(A.AST_ObjectProperty, liftKey);

	defineOptimizer(A.AST_ConciseMethod, (self, compressor) => {
		liftKey(self, compressor);
		// p(){return x;} ---> p:()=>x
		if (
			compressor.option("arrows") &&
			compressor.parent() instanceof A.AST_Object &&
			!self.value.is_generator &&
			!self.value.uses_arguments &&
			!self.value.pinned() &&
			self.value.body.length === 1 &&
			self.value.body[0] instanceof A.AST_Return &&
			self.value.body[0].value &&
			!self.value.contains_this()
		) {
			const arrow = makeNode(A.AST_Arrow, self.value, self.value);
			arrow.async = self.value.async;
			arrow.is_generator = self.value.is_generator;
			return makeNode(A.AST_ObjectKeyVal, self, {
				key: self.key instanceof A.AST_SymbolMethod ? self.key.name : self.key,
				value: arrow,
				quote: self.quote
			});
		}
		return self;
	});

	defineOptimizer(A.AST_ObjectKeyVal, (self, compressor) => {
		liftKey(self, compressor);
		// p:function(){} ---> p(){}, and the same of a generator, an async
		// function, and an arrow with a block body.
		const unsafeMethods = compressor.option("unsafe_methods");
		if (
			unsafeMethods &&
			compressor.option("ecma") >= 2015 &&
			(!(unsafeMethods instanceof RegExp) ||
				unsafeMethods.test(String(self.key)))
		) {
			const key = self.key;
			const value = self.value;
			const isArrowWithBlock =
				value instanceof A.AST_Arrow &&
				Array.isArray(value.body) &&
				!value.contains_this();
			if (
				(isArrowWithBlock || value instanceof A.AST_Function) &&
				!value.name
			) {
				return makeNode(A.AST_ConciseMethod, self, {
					key:
						key instanceof A.AST_Node
							? key
							: makeNode(A.AST_SymbolMethod, self, { name: key }),
					value: makeNode(A.AST_Accessor, value, value),
					quote: self.quote
				});
			}
		}
		return self;
	});

	/**
	 * terser's `is_destructuring_export_decl`: whether the destructuring
	 * visited is one an `export` declares.
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {boolean} whether it is
	 */
	const isDestructuringExportDeclaration = (compressor) => {
		for (
			let a = 0, p = 0, length = DESTRUCTURING_EXPORT_ANCESTORS.length;
			a < length;
			p++
		) {
			const parent = compressor.parent(p);
			if (!parent) return false;
			if (a === 0 && parent.TYPE === "Destructuring") continue;
			if (!DESTRUCTURING_EXPORT_ANCESTORS[a].test(parent.TYPE)) {
				return false;
			}
			a++;
		}
		return true;
	};

	/**
	 * terser's `should_retain`: whether a name bound by destructuring is kept.
	 * @param {TerserCompressor} compressor the compressor
	 * @param {SymbolDefinition} definition the name's definition
	 * @returns {boolean} whether it is
	 */
	const shouldRetain = (compressor, definition) => {
		if (definition.references.length) return true;
		if (!definition.global) return false;
		if (compressor.toplevel.vars) {
			if (compressor.top_retain) {
				return compressor.top_retain(definition);
			}
			return false;
		}
		return true;
	};

	defineOptimizer(A.AST_Destructuring, (self, compressor) => {
		if (
			// `"strict"` is not `true`, where `1` is.
			// eslint-disable-next-line eqeqeq
			compressor.option("pure_getters") == true &&
			compressor.option("unused") &&
			!self.is_array &&
			Array.isArray(self.names) &&
			!isDestructuringExportDeclaration(compressor) &&
			!(self.names[self.names.length - 1] instanceof A.AST_Expansion)
		) {
			/** @type {Node[]} */
			const keep = [];
			for (let i = 0; i < self.names.length; i++) {
				const element = self.names[i];
				if (!(
					element instanceof A.AST_ObjectKeyVal &&
					typeof element.key === "string" &&
					element.value instanceof A.AST_SymbolDeclaration &&
					!shouldRetain(compressor, element.value.definition())
				)) {
					keep.push(element);
				}
			}
			if (keep.length !== self.names.length) {
				self.names = keep;
			}
		}
		return self;
	});
};

/** @typedef {"sloppy" | number} NativeCondition `unsafe`, or `builtins_ecma >= N` */
/** @typedef {string | { name: string, when: NativeCondition[] }} NativeName a name and what it is gated on */
/** @typedef {{ when?: NativeCondition[], names: NativeName[] }} NativeGroup a global's names and what they are gated on */

/**
 * @typedef {object} NativeObjects
 * @property {(compressor: TerserCompressor) => (globalName: string) => boolean} pure_access_globals which globals read without a side effect
 * @property {Set<string>} pure_prop_access_globals which globals' properties read without a side effect
 * @property {(compressor: TerserCompressor) => (globalName: string) => boolean} is_pure_native_fn which globals call without a side effect
 * @property {(compressor: TerserCompressor) => (globalName: string, name: PropertyKey) => boolean} is_pure_native_method which prototype methods call without a side effect
 * @property {(compressor: TerserCompressor) => (globalName: string, name: PropertyKey) => boolean} is_pure_native_static_fn which static methods call without a side effect
 * @property {(compressor: TerserCompressor) => (globalName: string, name: PropertyKey) => boolean} is_pure_native_static_property which static properties read without a side effect
 * @property {(compressor: TerserCompressor, call: Node) => boolean} is_pure_builtin_call whether a call of a builtin is pure
 */

/**
 * terser's `sloppy && es >= N && ...` chain: the first falsy condition's value,
 * or `true` when every condition holds.
 * @param {NativeCondition[]} conditions what the entry is gated on, in order
 * @param {EXPECTED_ANY} sloppy the compressor's `unsafe` option, as given
 * @param {EXPECTED_ANY} es the compressor's `builtins_ecma` option, as given
 * @returns {EXPECTED_ANY} `true`, or the falsy value the chain stops at
 */
const evaluateNativeConditions = (conditions, sloppy, es) => {
	for (const condition of conditions) {
		const value = condition === "sloppy" ? sloppy : es >= condition;
		if (!value) return value;
	}
	return true;
};

/**
 * The set terser's `makePredicate(remove_false([...]))` builds from a list.
 * @param {NativeName[]} names the list, with its conditions
 * @param {EXPECTED_ANY} sloppy the compressor's `unsafe` option, as given
 * @param {EXPECTED_ANY} es the compressor's `builtins_ecma` option, as given
 * @returns {Set<EXPECTED_ANY>} each name whose conditions hold
 */
const selectNativeNames = (names, sloppy, es) => {
	/** @type {Set<EXPECTED_ANY>} */
	const selected = new Set();
	for (const entry of names) {
		if (typeof entry === "string") {
			selected.add(entry);
			continue;
		}
		const value = evaluateNativeConditions(entry.when, sloppy, es);
		// A falsy `unsafe` other than `false` survives `remove_false`, as in terser.
		if (value === true) selected.add(entry.name);
		else if (value !== false) selected.add(value);
	}
	return selected;
};

/**
 * webpack's `native-objects.js`: terser's lookups, built from the tables
 * `tooling/generate-js-data.js` reads out of terser's source.
 * @param {TerserModules} modules terser's modules, the helpers already installed
 * @returns {NativeObjects} the module's exports
 */
const createNativeObjects = (modules) => {
	const {
		NATIVE_ARG1_IS_ITERABLE,
		NATIVE_ARG1_IS_RANGE_OR_ITERABLE,
		NATIVE_LONE_ARG_IS_RANGE,
		NATIVE_PURE_ACCESS_GLOBALS,
		NATIVE_PURE_FUNCTIONS,
		NATIVE_PURE_METHODS,
		NATIVE_PURE_PROP_ACCESS_GLOBALS,
		NATIVE_PURE_STATIC_FUNCTIONS,
		NATIVE_PURE_STATIC_PROPERTIES
	} = require("./data").nativeObjectTables();

	const { AST_Array, AST_Dot, AST_New, AST_Number, AST_SymbolRef } =
		/** @type {Record<string, NodeCheck>} */ (modules.ast);
	const { is_undeclared_ref: isUndeclaredRef } = modules.inference;

	const argumentIsIterable = new Set(NATIVE_ARG1_IS_ITERABLE);
	const argumentIsRangeOrIterable = new Set(NATIVE_ARG1_IS_RANGE_OR_ITERABLE);
	const loneArgumentIsRange = new Set(NATIVE_LONE_ARG_IS_RANGE);
	const upperCaseFirstLetter = /^[A-Z]/;

	/**
	 * @param {NativeName[]} names the table
	 * @returns {(compressor: TerserCompressor) => (globalName: string) => boolean} terser's `make_lookup` of it
	 */
	const makeLookup = (names) => (compressor) => {
		const predicate = selectNativeNames(
			names,
			compressor.option("unsafe"),
			compressor.option("builtins_ecma")
		);
		return (globalName) => predicate.has(globalName);
	};

	/**
	 * @param {Record<string, NativeGroup>} groups the table
	 * @returns {(compressor: TerserCompressor) => (globalName: string, name: PropertyKey) => boolean} terser's `make_nested_lookup` of it
	 */
	const makeNestedLookup = (groups) => (compressor) => {
		const sloppy = compressor.option("unsafe");
		const es = compressor.option("builtins_ecma");
		/** @type {Map<string, Set<EXPECTED_ANY>>} */
		const lookup = new Map();
		for (const globalName of Object.keys(groups)) {
			const group = groups[globalName];
			if (
				group.when === undefined ||
				evaluateNativeConditions(group.when, sloppy, es) === true
			) {
				lookup.set(globalName, selectNativeNames(group.names, sloppy, es));
			}
		}
		return (globalName, name) => {
			const names = lookup.get(globalName);
			return names !== undefined && names.has(name);
		};
	};

	/**
	 * terser's `is_builtin_pure_with_these_args`: some builtins listed pure are
	 * so only for some arguments.
	 * @param {string} builtin the builtin's name
	 * @param {Node[]} args the call's arguments
	 * @returns {boolean} whether these arguments keep it pure
	 */
	const isBuiltinPureWithTheseArgs = (builtin, args) => {
		// All the builtins dealt with here are fine with no argument.
		if (args.length === 0) return true;

		let firstArgument = args[0];
		if (firstArgument instanceof AST_SymbolRef) {
			firstArgument = firstArgument.fixed_value();
		}

		if (loneArgumentIsRange.has(builtin)) {
			// new Array(number)
			const argumentValid =
				args.length > 1 ||
				(firstArgument instanceof AST_Number &&
					firstArgument.value >= 0 &&
					firstArgument.value <= 0xffffffff);
			if (!argumentValid) return false;
		}

		if (argumentIsRangeOrIterable.has(builtin)) {
			// new Float32Array(number | Array)
			const argumentValid =
				args.length === 0 ||
				firstArgument instanceof AST_Array ||
				(firstArgument instanceof AST_Number &&
					firstArgument.value >= 0 &&
					firstArgument.value <= 0xffffffff);
			if (!argumentValid) return false;
		}

		if (argumentIsIterable.has(builtin)) {
			// new Set(iterable)
			const argumentValid =
				args.length === 0 || firstArgument instanceof AST_Array;
			if (!argumentValid) return false;
		}

		return true;
	};

	/**
	 * terser's `is_pure_builtin_call`, reading the compressor's own lookups.
	 * @param {TerserCompressor} compressor the compressor
	 * @param {Node} call a call or `new`
	 * @returns {boolean} whether it calls a builtin without a side effect
	 */
	const isPureBuiltinCall = (compressor, call) => {
		let builtin = "";
		let method = "";

		let expression = call.expression;
		if (isUndeclaredRef(expression)) {
			builtin = expression.name;
		} else if (expression instanceof AST_Dot) {
			method = expression.property;

			expression = expression.expression;
			if (isUndeclaredRef(expression)) {
				if (
					// globalThis.pureFunc()
					expression.name === "globalThis" &&
					compressor.option("builtins_ecma") >= 2020
				) {
					builtin = method;
					method = "";
				} else {
					// SomeBuiltin.pureFunc()
					builtin = expression.name;
				}
			} else if (expression instanceof AST_Dot) {
				if (
					isUndeclaredRef(expression.expression) &&
					expression.expression.name === "globalThis" &&
					compressor.option("builtins_ecma") >= 2020
				) {
					// globalThis.SomeBuiltin.pureFunc()
					builtin = expression.property;
				} else {
					return false;
				}
			} else {
				return false;
			}
		} else {
			return false;
		}

		if (!method) {
			if (compressor.is_pure_native_fn(builtin)) {
				// Some require `new`, others throw when given it.
				const isNew = call instanceof AST_New;
				// True of every `is_pure_native_fn` name.
				const shouldBeNew = upperCaseFirstLetter.test(builtin);
				if (isNew !== shouldBeNew) return false;

				if (!isBuiltinPureWithTheseArgs(builtin, call.args)) {
					return false;
				}

				return true;
			}

			return false;
		}
		return compressor.is_pure_native_static_fn(builtin, method);
	};

	return {
		pure_access_globals: makeLookup(NATIVE_PURE_ACCESS_GLOBALS),
		pure_prop_access_globals: new Set(NATIVE_PURE_PROP_ACCESS_GLOBALS),
		is_pure_native_fn: makeLookup(NATIVE_PURE_FUNCTIONS),
		is_pure_native_method: makeNestedLookup(NATIVE_PURE_METHODS),
		is_pure_native_static_fn: makeNestedLookup(NATIVE_PURE_STATIC_FUNCTIONS),
		is_pure_native_static_property: makeNestedLookup(
			NATIVE_PURE_STATIC_PROPERTIES
		),
		is_pure_builtin_call: isPureBuiltinCall
	};
};

/**
 * What terser's `Compressor` constructor sets from its own `native-objects.js`,
 * set again from webpack's: called right after each `new Compressor`.
 * @param {TerserCompressor} compressor the compressor just constructed
 * @param {NativeObjects} nativeObjects `modules.nativeObjects`
 * @returns {void}
 */
const assignNativeLookups = (compressor, nativeObjects) => {
	compressor.pure_access_globals =
		nativeObjects.pure_access_globals(compressor);
	compressor.is_pure_native_fn = nativeObjects.is_pure_native_fn(compressor);
	compressor.is_pure_native_method =
		nativeObjects.is_pure_native_method(compressor);
	compressor.is_pure_native_static_fn =
		nativeObjects.is_pure_native_static_fn(compressor);
	compressor.is_pure_native_static_property =
		nativeObjects.is_pure_native_static_property(compressor);
};

// What terser's `regexp_source_fix` writes in place of each line terminator.
const LINE_TERMINATOR_ESCAPES = {
	"\0": "0",
	"\n": "n",
	"\r": "r",
	"\u2028": "u2028",
	"\u2029": "u2029"
};

// The patterns terser's `regexp_is_safe` lets it build without risking a ReDoS.
const SAFE_REGEXP = /^[\\/|\0\s\w^$.[\]()]*$/;

/**
 * The bits of terser's `compressor-flags.js`, kept in `node.flags`, which
 * terser's own code reads too.
 */
const COMPRESSOR_FLAGS = {
	UNUSED: 0b00000001,
	TRUTHY: 0b00000010,
	FALSY: 0b00000100,
	UNDEFINED: 0b00001000,
	INLINED: 0b00010000,
	// Nodes ever written to, which `unused: "keep_assign"` reads.
	WRITE_ONLY: 0b00100000,
	// The bits below hold for one compression pass only.
	SQUEEZED: 0b0000000100000000,
	OPTIMIZED: 0b0000001000000000,
	TOP: 0b0000010000000000
};

/** @typedef {{ parent: (n?: number) => Node }} ParentStack a walker, or anything else answering which node encloses the one visited (undefined past the root) */

/**
 * The exports of terser's `compress/common.js`, `inference.js`,
 * `compressor-flags.js` and `utils/index.js` the phases read, ported.
 * @typedef {object} CompressHelpers
 * @property {Record<string, EXPECTED_ANY>} common terser's `compress/common.js`
 * @property {Record<string, EXPECTED_ANY>} inference the functions of terser's `compress/inference.js`
 * @property {Record<string, EXPECTED_ANY>} flags terser's `compress/compressor-flags.js`
 * @property {Record<string, EXPECTED_ANY>} utils terser's `utils/index.js`
 */

/**
 * webpack's port of the helpers every compress phase reads, under terser's
 * names. `MAP.splice` shares terser's `Splice`, which its own transforms return.
 * @param {TerserModules} modules terser's modules
 * @returns {CompressHelpers} the helpers
 */
const createCompressHelpers = (modules) => {
	const { ast } = modules;
	const {
		AST_Array,
		AST_Arrow,
		AST_Assign,
		AST_BigInt,
		AST_BlockStatement,
		AST_Call,
		AST_Chain,
		AST_Class,
		AST_Const,
		AST_Constant,
		AST_DefClass,
		AST_Defun,
		AST_EmptyStatement,
		AST_Export,
		AST_False,
		AST_ForIn,
		AST_Function,
		AST_Import,
		AST_Infinity,
		AST_LabeledStatement,
		AST_Lambda,
		AST_Let,
		AST_LoopControl,
		AST_NaN,
		AST_New,
		AST_Node,
		AST_Null,
		AST_Number,
		AST_Object,
		AST_ObjectKeyVal,
		AST_PropAccess,
		AST_RegExp,
		AST_Scope,
		AST_Sequence,
		AST_SimpleStatement,
		AST_Statement,
		AST_String,
		AST_SymbolRef,
		AST_True,
		AST_Unary,
		AST_UnaryPrefix,
		AST_Undefined,
		AST_Using
	} = /** @type {Record<string, NodeCheck>} */ (ast);
	const {
		TreeWalker,
		walk,
		walk_abort: walkAbort,
		walk_parent: walkParent
	} = ast;
	const { TOP, UNDEFINED } = COMPRESSOR_FLAGS;

	/**
	 * terser's `regexp_source_fix`: escapes each line terminator, and `\0`, a
	 * regular expression's source holds, where no backslash escapes it already.
	 * @param {string} source a regular expression's source
	 * @returns {string} the source escaped
	 */
	const regexpSourceFix = (source) =>
		source.replace(/[\0\n\r\u2028\u2029]/g, (match, offset) => {
			const escaped =
				source[offset - 1] === "\\" &&
				(source[offset - 2] !== "\\" ||
					/(?:^|[^\\])(?:\\{2})*$/.test(source.slice(0, offset - 1)));
			return (
				(escaped ? "" : "\\") +
				LINE_TERMINATOR_ESCAPES[
					/** @type {keyof typeof LINE_TERMINATOR_ESCAPES} */ (match)
				]
			);
		});

	/**
	 * terser's `regexp_is_safe`.
	 * @param {string} source a regular expression's source
	 * @returns {boolean} whether terser may build it without risking a ReDoS
	 */
	const regexpIsSafe = (source) => SAFE_REGEXP.test(source);

	/**
	 * terser's `makePredicate`: note that it sorts an array it is given in place.
	 * @param {string | string[]} words the words, or a string of them separated by spaces
	 * @returns {Set<string>} the words
	 */
	const makePredicate = (words) =>
		new Set((Array.isArray(words) ? words : words.split(" ")).sort());

	/**
	 * terser's `member`.
	 * @template T
	 * @param {T} name an item
	 * @param {T[]} array a list
	 * @returns {boolean} whether the list holds the item
	 */
	const member = (name, array) => array.includes(name);

	/**
	 * terser's `has_annotation`.
	 * @param {Node} node a node
	 * @param {number} annotation one of terser's annotation bits
	 * @returns {number} the bit where the node carries it, otherwise 0
	 */
	const hasAnnotation = (node, annotation) => node._annotations & annotation;

	/**
	 * terser's `has_flag`.
	 * @param {Node} node a node
	 * @param {number} flag one of terser's compressor flags
	 * @returns {number} the flag where the node carries it, otherwise 0
	 */
	const hasFlag = (node, flag) => node.flags & flag;

	/**
	 * terser's `set_flag`.
	 * @param {Node} node a node
	 * @param {number} flag one of terser's compressor flags
	 * @returns {void}
	 */
	const setFlag = (node, flag) => {
		node.flags |= flag;
	};

	/**
	 * terser's `clear_flag`.
	 * @param {Node} node a node
	 * @param {number} flag one of terser's compressor flags
	 * @returns {void}
	 */
	const clearFlag = (node, flag) => {
		node.flags &= ~flag;
	};

	const firstInStatement = createFirstInStatement(modules);

	// terser's own `wrap_commonjs` hands the transform phase terser's `Splice`,
	// and a phase terser keeps reads `MAP.splice` from ours, so both `MAP`s
	// have to take either one: ours inherits from terser's.
	const TerserSplice = modules.utils.MAP.splice(undefined).constructor;

	/**
	 * terser's `Splice`: what a transform returns to put several nodes in its place.
	 */
	class Splice {
		/**
		 * @param {Node[]} value the nodes
		 */
		constructor(value) {
			this.v = value;
		}
	}
	Object.setPrototypeOf(Splice.prototype, TerserSplice.prototype);

	/**
	 * terser's `MAP`: each node of a list transformed, dropping what a transform
	 * skips and spreading what it splices.
	 * @param {Node[]} array the nodes
	 * @param {EXPECTED_ANY} walker the transformer
	 * @param {boolean=} allowSplicing whether a transform may splice
	 * @returns {Node[]} the nodes transformed
	 */
	const MAP = (array, walker, allowSplicing = true) => {
		/** @type {Node[]} */
		const result = [];
		for (let i = 0; i < array.length; ++i) {
			const transformed = array[i].transform(walker, allowSplicing);
			if (transformed instanceof AST_Node) {
				result.push(transformed);
			} else if (transformed instanceof TerserSplice) {
				result.push(...transformed.v);
			}
		}
		return result;
	};
	/**
	 * @param {Node[]} value the nodes
	 * @returns {Splice} what puts them in place of the node transformed
	 */
	MAP.splice = (value) => new Splice(value);
	MAP.skip = {};

	/**
	 * terser's `make_void_0`, as an `AST_Undefined` may meet a variable of that name.
	 * @param {Node | undefined} orig where its position comes from
	 * @returns {Node} `void 0`
	 */
	const makeVoid0 = (orig) =>
		makeNode(AST_UnaryPrefix, orig, {
			operator: "void",
			expression: makeNode(AST_Number, orig, { value: 0 })
		});

	/**
	 * terser's `merge_sequence`.
	 * @param {Node[]} array a list of expressions
	 * @param {Node} node an expression, whose own expressions join where it is a sequence
	 * @returns {Node[]} the list
	 */
	const mergeSequence = (array, node) => {
		if (node instanceof AST_Sequence) {
			array.push(...node.expressions);
		} else {
			array.push(node);
		}
		return array;
	};

	/**
	 * terser's `make_sequence`: the one expression, or a sequence of them flattened.
	 * @param {Node} orig where its position comes from
	 * @param {Node[]} expressions at least one expression
	 * @returns {Node} the expression
	 */
	const makeSequence = (orig, expressions) => {
		if (expressions.length === 1) return expressions[0];
		if (expressions.length === 0) {
			throw new Error("trying to create a sequence with length zero!");
		}
		return makeNode(AST_Sequence, orig, {
			expressions: expressions.reduce(mergeSequence, [])
		});
	};

	/**
	 * terser's `make_empty_function`.
	 * @param {Node} self where its position comes from
	 * @returns {Node} `function(){}`
	 */
	const makeEmptyFunction = (self) =>
		makeNode(AST_Function, self, {
			uses_arguments: false,
			argnames: [],
			body: [],
			is_generator: false,
			async: false,
			variables: new Map(),
			uses_with: false,
			uses_eval: false,
			parent_scope: null,
			enclosed: [],
			cname: 0,
			block_scope: undefined
		});

	/**
	 * terser's `make_node_from_constant`.
	 * @param {EXPECTED_ANY} value a value
	 * @param {Node} orig where its position comes from
	 * @returns {Node} the node for the value
	 */
	const makeNodeFromConstant = (value, orig) => {
		switch (typeof value) {
			case "string":
				return makeNode(AST_String, orig, { value });
			case "number":
				if (Number.isNaN(value)) return makeNode(AST_NaN, orig);
				if (Number.isFinite(value)) {
					return 1 / value < 0
						? makeNode(AST_UnaryPrefix, orig, {
								operator: "-",
								expression: makeNode(AST_Number, orig, { value: -value })
							})
						: makeNode(AST_Number, orig, { value });
				}
				return value < 0
					? makeNode(AST_UnaryPrefix, orig, {
							operator: "-",
							expression: makeNode(AST_Infinity, orig)
						})
					: makeNode(AST_Infinity, orig);
			case "bigint":
				return makeNode(AST_BigInt, orig, { value: value.toString() });
			case "boolean":
				return makeNode(value ? AST_True : AST_False, orig);
			case "undefined":
				return makeVoid0(orig);
			default:
				if (value === null) {
					return makeNode(AST_Null, orig, { value: null });
				}
				if (value instanceof RegExp) {
					return makeNode(AST_RegExp, orig, {
						value: {
							source: regexpSourceFix(value.source),
							flags: value.flags
						}
					});
				}
				throw new Error(
					stringTemplate("Can't handle constant of type: {type}", {
						type: typeof value
					})
				);
		}
	};

	/**
	 * terser's `best_of_expression`: the second only where it is smaller.
	 * @param {Node} first an expression
	 * @param {Node} second an equivalent one
	 * @returns {Node} the smaller
	 */
	const bestOfExpression = (first, second) =>
		first.size() > second.size() ? second : first;

	/**
	 * terser's `best_of_statement`, which weighs each as a statement of its own.
	 * @param {Node} first an expression
	 * @param {Node} second an equivalent one
	 * @returns {Node} the smaller
	 */
	const bestOfStatement = (first, second) =>
		bestOfExpression(
			makeNode(AST_SimpleStatement, first, { body: first }),
			makeNode(AST_SimpleStatement, second, { body: second })
		).body;

	/**
	 * terser's `best_of`.
	 * @param {TerserCompressor} compressor the compressor, at the node replaced
	 * @param {Node} first an expression
	 * @param {Node} second an equivalent one
	 * @returns {Node} the smaller where it stands
	 */
	const bestOf = (compressor, first, second) =>
		firstInStatement(/** @type {ParentStack} */ (compressor))
			? bestOfStatement(first, second)
			: bestOfExpression(first, second);

	/**
	 * terser's `get_simple_key`: a property key as a value, where it is a constant.
	 * @param {EXPECTED_ANY} key a key
	 * @returns {EXPECTED_ANY} its value, or the key itself
	 */
	const getSimpleKey = (key) => {
		const node = /** @type {Node} */ (key);
		if (node instanceof AST_Constant) {
			return node.getValue();
		}
		if (
			node instanceof AST_UnaryPrefix &&
			node.operator === "void" &&
			node.expression instanceof AST_Constant
		) {
			return undefined;
		}
		return key;
	};

	/**
	 * terser's `read_property`: what a literal holds under a key, where it is known.
	 * @param {Node} object an array or object literal
	 * @param {EXPECTED_ANY} property the key read
	 * @returns {Node | undefined} the value
	 */
	const readProperty = (object, property) => {
		let key = getSimpleKey(property);
		if (key instanceof AST_Node) return;

		let value;
		if (object instanceof AST_Array) {
			const elements = object.elements;
			if (key === "length") {
				return makeNodeFromConstant(elements.length, object);
			}
			if (typeof key === "number" && key in elements) value = elements[key];
		} else if (object instanceof AST_Object) {
			key = `${key}`;
			const properties = object.properties;
			for (let i = properties.length; --i >= 0;) {
				const objectProperty = properties[i];
				if (!(objectProperty instanceof AST_ObjectKeyVal)) return;
				if (!value && objectProperty.key === key) value = objectProperty.value;
			}
		}

		return (
			(value instanceof AST_SymbolRef &&
				/** @type {Node} */ (value).fixed_value()) ||
			value
		);
	};

	/**
	 * terser's `has_break_or_continue`.
	 * @param {Node} loop a loop
	 * @param {Node=} parent the statement around it, read where it is a label
	 * @returns {boolean} whether a `break` or `continue` in its body targets it
	 */
	const hasBreakOrContinue = (loop, parent) => {
		let found = false;
		const walker = new TreeWalker(
			/**
			 * @param {Node} node a node visited
			 * @returns {boolean | undefined} whether to skip its children
			 */
			(node) => {
				if (found || node instanceof AST_Scope) return true;
				if (
					node instanceof AST_LoopControl &&
					walker.loopcontrol_target(node) === loop
				) {
					found = true;
					return true;
				}
				return undefined;
			}
		);
		if (parent instanceof AST_LabeledStatement) walker.push(parent);
		walker.push(loop);
		loop.body.walk(walker);
		return found;
	};

	/**
	 * terser's `requires_sequence_to_maintain_binding`: `(0, x.noThis)()`,
	 * `(0, eval)()` and `delete (0, x)` need their sequence.
	 * @param {Node} parent the node around the sequence, if any
	 * @param {Node} orig the sequence
	 * @param {Node} value its last expression
	 * @returns {boolean} whether dropping the sequence changes the meaning
	 */
	const requiresSequenceToMaintainBinding = (parent, orig, value) =>
		(parent instanceof AST_UnaryPrefix && parent.operator === "delete") ||
		(parent instanceof AST_Call &&
			parent.expression === orig &&
			(value instanceof AST_Chain ||
				value instanceof AST_PropAccess ||
				(value instanceof AST_SymbolRef && value.name === "eval")));

	/**
	 * terser's `maintain_this_binding`: `(1, func)()` calls `func` without its
	 * object, so it keeps the sequence.
	 * @param {Node} parent the node around the one replaced, if any
	 * @param {Node} orig the node replaced
	 * @param {Node} value what replaces it
	 * @returns {Node} the replacement
	 */
	const maintainThisBinding = (parent, orig, value) => {
		if (requiresSequenceToMaintainBinding(parent, orig, value)) {
			const zero = makeNode(AST_Number, orig, { value: 0 });
			return makeSequence(orig, [zero, value]);
		}
		return value;
	};

	/**
	 * terser's `is_func_expr`.
	 * @param {Node} node a node
	 * @returns {boolean} whether it is a function or arrow expression
	 */
	const isFuncExpr = (node) =>
		node instanceof AST_Arrow || node instanceof AST_Function;

	/**
	 * terser's `is_iife_call`: an arrow is left out, as negating it needs parentheses.
	 * @param {Node} node a node
	 * @returns {boolean} whether it calls a function expression, or such a call's result
	 */
	const isIifeCall = (node) => {
		if (node.TYPE !== "Call") return false;
		return (
			node.expression instanceof AST_Function || isIifeCall(node.expression)
		);
	};

	/**
	 * terser's `is_empty`.
	 * @param {Node | null} thing a statement
	 * @returns {boolean} whether it does nothing
	 */
	const isEmpty = (thing) => {
		if (thing === null) return true;
		if (thing instanceof AST_EmptyStatement) return true;
		if (thing instanceof AST_BlockStatement) return thing.body.length === 0;
		return false;
	};

	/**
	 * terser's `is_identifier_atom`.
	 * @param {Node} node a node
	 * @returns {boolean} whether it is `Infinity`, `NaN` or `undefined`
	 */
	const isIdentifierAtom = (node) =>
		node instanceof AST_Infinity ||
		node instanceof AST_NaN ||
		node instanceof AST_Undefined;

	/**
	 * terser's `is_ref_of`.
	 * @param {Node} reference a node
	 * @param {EXPECTED_ANY} Type a node class
	 * @returns {boolean | undefined} whether it references a name one of whose declarations is of the class
	 */
	const isRefOf = (reference, Type) => {
		if (!(reference instanceof AST_SymbolRef)) return false;
		const orig = reference.definition().orig;
		for (let i = orig.length; --i >= 0;) {
			if (orig[i] instanceof Type) return true;
		}
		return undefined;
	};

	/**
	 * terser's `can_be_evicted_from_block`.
	 * @param {Node} node a statement
	 * @returns {boolean} whether it can leave its block without changing scope
	 */
	const canBeEvictedFromBlock = (node) =>
		!(
			node instanceof AST_DefClass ||
			node instanceof AST_Defun ||
			node instanceof AST_Let ||
			node instanceof AST_Const ||
			node instanceof AST_Using ||
			node instanceof AST_Export ||
			node instanceof AST_Import
		);

	/**
	 * terser's `as_statement_array`.
	 * @param {Node | null} thing a statement
	 * @returns {Node[]} the statements it stands for
	 */
	const asStatementArray = (thing) => {
		if (thing === null) return [];
		if (thing instanceof AST_BlockStatement) return thing.body;
		if (thing instanceof AST_EmptyStatement) return [];
		if (thing instanceof AST_Statement) return [thing];
		throw new Error("Can't convert thing to statement array");
	};

	/**
	 * terser's `is_reachable`: a sync function called in place runs at once, so it is
	 * searched as part of the scope rather than as a closure.
	 * @param {Node} scopeNode a scope
	 * @param {SymbolDefinition[]} definitions definitions
	 * @returns {boolean} whether a closure in the scope references one of them
	 */
	const isReachable = (scopeNode, definitions) => {
		/**
		 * @param {Node} node a node visited
		 * @returns {symbol | undefined} `walk_abort` at a reference to one of them
		 */
		const findReference = (node) => {
			if (
				node instanceof AST_SymbolRef &&
				definitions.includes(node.definition())
			) {
				return walkAbort;
			}
			return undefined;
		};

		return walkParent(
			scopeNode,
			/**
			 * @param {Node} node a node visited
			 * @param {ParentStack} info its ancestors
			 * @returns {symbol | boolean | undefined} whether to stop, or skip its children
			 */
			(node, info) => {
				if (node instanceof AST_Scope && node !== scopeNode) {
					const parent = info.parent();
					if (
						parent instanceof AST_Call &&
						parent.expression === node &&
						!(node.async || node.is_generator)
					) {
						return undefined;
					}
					if (walk(node, findReference)) return walkAbort;
					return true;
				}
				return undefined;
			}
		);
	};

	/**
	 * terser's `is_recursive_ref`.
	 * @param {ParentStack} walker a walker at a reference
	 * @param {SymbolDefinition} definition what it references
	 * @returns {boolean} whether it names a function or class it is inside
	 */
	const isRecursiveRef = (walker, definition) => {
		let node;
		for (let i = 0; (node = walker.parent(i)); i++) {
			if (node instanceof AST_Lambda || node instanceof AST_Class) {
				const name = node.name;
				if (name && name.definition() === definition) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * terser's `retain_top_func`, which reads only a `function` declaration.
	 * @param {Node} fn a function
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {EXPECTED_ANY} truthy where `top_retain` keeps it
	 */
	const retainTopFunc = (fn, compressor) =>
		compressor.top_retain &&
		fn instanceof AST_Defun &&
		hasFlag(fn, TOP) &&
		fn.name &&
		compressor.top_retain(fn.name.definition());

	const unarySideEffects = makePredicate("delete ++ --");

	/**
	 * terser's `is_undeclared_ref`.
	 * @param {Node} node a node
	 * @returns {boolean} whether it references a global never declared
	 */
	const isUndeclaredRef = (node) =>
		node instanceof AST_SymbolRef && node.definition().undeclared;

	/**
	 * terser's `is_undefined`.
	 * @param {Node} node a node
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {number | boolean} truthy where it is `undefined`
	 */
	const isUndefined = (node, compressor) =>
		hasFlag(node, UNDEFINED) ||
		node instanceof AST_Undefined ||
		(node instanceof AST_UnaryPrefix &&
			node.operator === "void" &&
			!node.expression.has_side_effects(compressor));

	/**
	 * terser's `is_null_or_undefined`.
	 * @param {Node} node a node
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {number | boolean} truthy where it is explicitly `null` or `undefined`
	 */
	const isNullOrUndefined = (node, compressor) => {
		if (node instanceof AST_Null) return true;
		const undefinedValue = isUndefined(node, compressor);
		if (undefinedValue) return undefinedValue;
		if (!(node instanceof AST_SymbolRef)) return false;
		const fixed = node.definition().fixed;
		return (
			fixed instanceof AST_Node &&
			isNullish(/** @type {Node} */ (fixed), compressor)
		);
	};

	/**
	 * terser's `is_nullish_shortcircuited`.
	 * @param {Node} node a node
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {EXPECTED_ANY} truthy where an optional chain in it short-circuits
	 */
	const isNullishShortCircuited = (node, compressor) => {
		if (node instanceof AST_PropAccess || node instanceof AST_Call) {
			return (
				(node.optional && isNullOrUndefined(node.expression, compressor)) ||
				isNullishShortCircuited(node.expression, compressor)
			);
		}
		if (node instanceof AST_Chain) {
			return isNullishShortCircuited(node.expression, compressor);
		}
		return false;
	};

	/**
	 * terser's `is_nullish`.
	 * @param {Node} node a node
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {EXPECTED_ANY} truthy where it is `null` or `undefined`
	 */
	function isNullish(node, compressor) {
		if (isNullOrUndefined(node, compressor)) return true;
		return isNullishShortCircuited(node, compressor);
	}

	/**
	 * terser's `is_lhs`.
	 * @param {Node} node a node
	 * @param {Node} parent the node around it, if any
	 * @returns {Node | undefined} what the parent writes to, where it writes the node
	 */
	const isLhs = (node, parent) => {
		if (parent instanceof AST_Unary && unarySideEffects.has(parent.operator)) {
			return parent.expression;
		}
		if (parent instanceof AST_Assign && parent.left === node) return node;
		if (parent instanceof AST_ForIn && parent.init === node) return node;
		return undefined;
	};

	/**
	 * terser's `aborts`.
	 * @param {Node | null | undefined} thing a statement
	 * @returns {EXPECTED_ANY} the statement it ends with that aborts, or something falsy
	 */
	const aborts = (thing) => thing && thing.aborts();

	/**
	 * terser's `is_modified`.
	 * @param {TerserCompressor} compressor the compressor
	 * @param {ParentStack} walker a walker at the node
	 * @param {Node} node a node
	 * @param {Node | undefined} value what it holds
	 * @param {number} level how far up the walker's stack the node's parent is
	 * @param {boolean=} immutable whether the value cannot be modified through a call
	 * @returns {EXPECTED_ANY} truthy where the node may be written to or mutated
	 */
	const isModified = (compressor, walker, node, value, level, immutable) => {
		const parent = walker.parent(level);
		const lhs = isLhs(node, parent);
		if (lhs) return lhs;
		if (
			!immutable &&
			parent instanceof AST_Call &&
			parent.expression === node &&
			!(value instanceof AST_Arrow) &&
			!(value instanceof AST_Class) &&
			!parent.is_callee_pure(compressor) &&
			(!(value instanceof AST_Function) ||
				(!(parent instanceof AST_New) &&
					/** @type {Node} */ (value).contains_this()))
		) {
			return true;
		}
		if (parent instanceof AST_Array) {
			return isModified(compressor, walker, parent, parent, level + 1);
		}
		if (parent instanceof AST_ObjectKeyVal && node === parent.value) {
			const object = walker.parent(level + 1);
			return isModified(compressor, walker, object, object, level + 2);
		}
		if (parent instanceof AST_PropAccess && parent.expression === node) {
			const property = readProperty(
				/** @type {Node} */ (value),
				parent.property
			);
			return (
				!immutable &&
				isModified(compressor, walker, parent, property, level + 1)
			);
		}
		return undefined;
	};

	/**
	 * terser's `is_used_in_expression`: `void (0, node, 1)` does not use it,
	 * `console.log(0, node)` does.
	 * @param {ParentStack} walker a walker at the node
	 * @returns {boolean} whether the expression around the node may use its value
	 */
	const isUsedInExpression = (walker) => {
		for (let p = -1; ; p++) {
			const node = walker.parent(p);
			const parent = walker.parent(p + 1);
			if (!parent) break;
			if (parent instanceof AST_Sequence) {
				const nthExpression = parent.expressions.indexOf(node);
				if (nthExpression !== parent.expressions.length - 1) {
					const grandparent = walker.parent(p + 2);
					return !(
						parent.expressions.length > 2 ||
						parent.expressions.length === 1 ||
						!requiresSequenceToMaintainBinding(
							grandparent,
							parent,
							parent.expressions[1]
						)
					);
				}
				continue;
			}
			if (parent instanceof AST_Unary) {
				const operator = parent.operator;
				if (operator === "void") {
					return false;
				}
				if (
					operator === "typeof" ||
					operator === "+" ||
					operator === "-" ||
					operator === "!" ||
					operator === "~"
				) {
					continue;
				}
			}
			if (
				parent instanceof AST_SimpleStatement ||
				parent instanceof AST_LabeledStatement
			) {
				return false;
			}
			if (parent instanceof AST_Scope) {
				return false;
			}
			return true;
		}
		return true;
	};

	return {
		common: {
			as_statement_array: asStatementArray,
			best_of: bestOf,
			best_of_expression: bestOfExpression,
			can_be_evicted_from_block: canBeEvictedFromBlock,
			has_break_or_continue: hasBreakOrContinue,
			identifier_atom: makePredicate("Infinity NaN undefined"),
			is_empty: isEmpty,
			is_func_expr: isFuncExpr,
			is_identifier_atom: isIdentifierAtom,
			is_iife_call: isIifeCall,
			is_reachable: isReachable,
			is_recursive_ref: isRecursiveRef,
			is_ref_of: isRefOf,
			maintain_this_binding: maintainThisBinding,
			make_empty_function: makeEmptyFunction,
			make_node_from_constant: makeNodeFromConstant,
			make_sequence: makeSequence,
			merge_sequence: mergeSequence,
			read_property: readProperty,
			retain_top_func: retainTopFunc
		},
		inference: {
			aborts,
			bitwise_binop: makePredicate("<<< >> << & | ^ ~"),
			is_lhs: isLhs,
			is_modified: isModified,
			is_nullish: isNullish,
			is_nullish_shortcircuited: isNullishShortCircuited,
			is_undeclared_ref: isUndeclaredRef,
			is_undefined: isUndefined,
			is_used_in_expression: isUsedInExpression,
			lazy_op: makePredicate("&& || ??"),
			unary_side_effects: unarySideEffects
		},
		flags: {
			...COMPRESSOR_FLAGS,
			CLEAR_BETWEEN_PASSES:
				COMPRESSOR_FLAGS.SQUEEZED |
				COMPRESSOR_FLAGS.OPTIMIZED |
				COMPRESSOR_FLAGS.TOP,
			clear_flag: clearFlag,
			has_flag: hasFlag,
			set_flag: setFlag
		},
		utils: {
			MAP,
			has_annotation: hasAnnotation,
			makePredicate,
			make_node: makeNode,
			make_void_0: makeVoid0,
			member,
			regexp_is_safe: regexpIsSafe,
			regexp_source_fix: regexpSourceFix,
			remove: removeAll,
			return_false: alwaysFalse
		}
	};
};

// The xxhash64 of each of terser's files the helpers phase below reproduces, each
// run of whitespace read as one space: the one version it was written against.
const TERSER_HELPERS = {
	"compress/common.js": "b81664f0b8802401",
	"compress/compressor-flags.js": "a8d04ebd8da98644",
	"compress/inference.js": "bac5bd59706dc14a",
	"compress/native-objects.js": "62ee89eb7c542983",
	"utils/index.js": "f8283d054ce8823c"
};

/**
 * Whether terser's helper modules are still the ones the helpers phase
 * reproduces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const helpersFits = (modules) => {
	if (
		!modules.ast ||
		!modules.common ||
		!modules.inference ||
		!modules.flags ||
		!modules.nativeObjects ||
		!modules.utils
	) {
		return false;
	}

	for (const file of Object.keys(TERSER_HELPERS)) {
		if (
			hashTerserFile(file) !==
			TERSER_HELPERS[/** @type {keyof typeof TERSER_HELPERS} */ (file)]
		) {
			return false;
		}
	}
	return true;
};

/**
 * Installs webpack's own helper modules: every phase after this one reads the
 * helpers of `compress/common.js`, `inference.js`, `compressor-flags.js`,
 * `native-objects.js` and `utils` from webpack instead of terser.
 * @param {TerserModules} modules terser's modules, whose helpers it replaces
 * @returns {void}
 */
const installHelpers = (modules) => {
	const helpers = createCompressHelpers(modules);
	modules.common = helpers.common;
	modules.inference = helpers.inference;
	modules.flags = helpers.flags;
	modules.utils = helpers.utils;
	modules.nativeObjects = createNativeObjects(modules);
};

// The xxhash64 of each of terser's files the optimize phase below reproduces,
// each run of whitespace read as one space: the one version it was written against.
const TERSER_OPTIMIZE = {
	"compress/index.js": "6694100e9c5ecfcb",
	"compress/inline.js": "b3b79b0d1e73d807",
	"compress/tighten-body.js": "6034b2093bceae94"
};

// What the optimize phase reads from each of terser's modules, all still terser's.
const OPTIMIZE_IMPORTS = {
	ast: [
		"AST_Node",
		"AST_Scope",
		"TreeTransformer",
		"TreeWalker",
		"_INLINE",
		"_NOINLINE",
		"_PURE",
		"walk",
		"walk_abort"
	],
	common: [
		"as_statement_array",
		"best_of",
		"best_of_expression",
		"can_be_evicted_from_block",
		"has_break_or_continue",
		"identifier_atom",
		"is_empty",
		"is_func_expr",
		"is_identifier_atom",
		"is_iife_call",
		"is_reachable",
		"is_recursive_ref",
		"is_ref_of",
		"maintain_this_binding",
		"make_empty_function",
		"make_node_from_constant",
		"make_sequence",
		"merge_sequence",
		"retain_top_func"
	],
	compress: ["Compressor"],
	flags: [
		"FALSY",
		"INLINED",
		"OPTIMIZED",
		"SQUEEZED",
		"TRUTHY",
		"UNDEFINED",
		"UNUSED",
		"WRITE_ONLY",
		"clear_flag",
		"has_flag",
		"set_flag"
	],
	inference: [
		"aborts",
		"bitwise_binop",
		"is_lhs",
		"is_modified",
		"is_nullish",
		"is_undeclared_ref",
		"is_undefined",
		"lazy_op",
		"unary_side_effects"
	],
	nativeObjects: ["pure_prop_access_globals"],
	output: ["OutputStream"],
	parse: ["JS_Parse_Error", "PRECEDENCE", "parse"],
	scope: ["base54"],
	utils: [
		"MAP",
		"has_annotation",
		"makePredicate",
		"make_node",
		"make_void_0",
		"member",
		"regexp_is_safe",
		"regexp_source_fix",
		"remove"
	]
};

/**
 * Whether terser's optimizers are still the ones the optimize phase reproduces,
 * and the helpers they call are where it reads them.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const optimizeFits = (modules) => {
	for (const [name, exports] of Object.entries(OPTIMIZE_IMPORTS)) {
		const module = modules[name];
		if (!module) return false;
		for (const exported of exports) {
			if (module[exported] === undefined) return false;
		}
	}
	if (typeof modules.ast.AST_Node.prototype.optimize !== "function") {
		return false;
	}

	for (const file of Object.keys(TERSER_OPTIMIZE)) {
		if (
			hashTerserFile(file) !==
			TERSER_OPTIMIZE[/** @type {keyof typeof TERSER_OPTIMIZE} */ (file)]
		) {
			return false;
		}
	}
	return true;
};

/**
 * What the optimizers of `compress/index.js` share, with `tighten-body.js` and
 * `inline.js` they call.
 * @typedef {object} OptimizerHelpers
 * @property {(Type: EXPECTED_ANY, optimizer: (self: Node, compressor: TerserCompressor) => Node) => void} defineOptimizer terser's `def_optimize`
 * @property {(compressor: TerserCompressor, name: string) => SymbolDefinition | undefined} findVariable terser's `find_variable`
 * @property {(self: Node, compressor: TerserCompressor) => Node} optimizeLambda terser's `opt_AST_Lambda`
 * @property {(lhs: Node, self: Node) => boolean} isAtomic terser's `is_atomic`
 * @property {(self: Node, compressor: TerserCompressor) => Node | null} unsafeUndefinedRef terser's `unsafe_undefined_ref`
 * @property {(elements: Node[]) => void} inlineArrayLikeSpread terser's `inline_array_like_spread`
 * @property {(statements: Node[], compressor: TerserCompressor) => void} tightenBody terser's `tighten_body`
 * @property {(compressor: TerserCompressor, statement: Node, target: Node[]) => void} extractFromUnreachableCode terser's `extract_from_unreachable_code`
 * @property {(self: Node, compressor: TerserCompressor) => Node} inlineIntoSymbolRef terser's `inline_into_symbolref`
 * @property {(self: Node, compressor: TerserCompressor) => Node} inlineIntoCall terser's `inline_into_call`
 */

/**
 * Installs webpack's optimizers: terser's `optimize` of every node, the methods
 * of `compress/index.js` they call, and the statement and call inlining of
 * `tighten-body.js` and `inline.js`.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installOptimize = (modules) => {
	const { ast, flags } = modules;
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (ast);
	const { OPTIMIZED, UNDEFINED } = flags;
	const { make_node: makeTerserNode } = modules.utils;

	/**
	 * terser's `def_optimize`.
	 * @param {EXPECTED_ANY} Type a node class
	 * @param {(self: Node, compressor: TerserCompressor) => Node} optimizer its optimizer
	 * @returns {void}
	 */
	const defineOptimizer = (Type, optimizer) => {
		/**
		 * @this {Node} the node optimized
		 * @param {TerserCompressor} compressor the compressor
		 * @returns {Node} what replaces it
		 */
		Type.prototype.optimize = function optimize(compressor) {
			const self = this;
			if ((self.flags & OPTIMIZED) !== 0) return self;
			if (compressor.has_directive("use asm")) return self;
			const optimized = optimizer(self, compressor);
			optimized.flags |= OPTIMIZED;
			return optimized;
		};
	};

	/**
	 * terser's `find_variable`: a name as the scope around the node visited reads it.
	 * @param {TerserCompressor} compressor the compressor
	 * @param {string} name the name
	 * @returns {SymbolDefinition | undefined} what it reads
	 */
	const findVariable = (compressor, name) => {
		let scope;
		let i = 0;
		while ((scope = compressor.parent(i++))) {
			if (scope instanceof A.AST_Scope) break;
			if (scope instanceof A.AST_Catch && scope.argname) {
				scope = scope.argname.definition().scope;
				break;
			}
		}
		return scope.find_variable(name);
	};

	/**
	 * @param {Node} lhs an assignment's target
	 * @param {Node} self the assignment
	 * @returns {boolean} whether reading the target again costs nothing
	 */
	const isAtomic = (lhs, self) =>
		lhs instanceof A.AST_SymbolRef || lhs.TYPE === self.TYPE;

	/**
	 * terser's `unsafe_undefined_ref`: a reference to a variable named `undefined`.
	 * @param {Node} self the node that reads as `undefined`
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node | null} the reference, or null where there is none
	 */
	const unsafeUndefinedRef = (self, compressor) => {
		if (compressor.option("unsafe_undefined")) {
			const definition = findVariable(compressor, "undefined");
			if (definition) {
				const reference = makeTerserNode(A.AST_SymbolRef, self, {
					name: "undefined",
					scope: definition.scope,
					thedef: definition
				});
				reference.flags |= UNDEFINED;
				return reference;
			}
		}
		return null;
	};

	/**
	 * Spreads in place each array literal spread among array-like elements.
	 * @param {Node[]} elements the elements
	 * @returns {void}
	 */
	const inlineArrayLikeSpread = (elements) => {
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			if (element instanceof A.AST_Expansion) {
				const expression = element.expression;
				if (
					expression instanceof A.AST_Array &&
					!expression.elements.some(
						(/** @type {Node} */ item) => item instanceof A.AST_Hole
					)
				) {
					elements.splice(i, 1, ...expression.elements);
					// The element at `i` is a new one.
					i--;
				}
			}
		}
	};

	const { tightenBody, extractFromUnreachableCode } =
		createTightenBody(modules);
	const { inlineIntoSymbolRef, inlineIntoCall } = createInline(modules);

	/**
	 * terser's `opt_AST_Lambda`.
	 * @param {Node} self a function
	 * @param {TerserCompressor} compressor the compressor
	 * @returns {Node} the function
	 */
	const optimizeLambda = (self, compressor) => {
		tightenBody(self.body, compressor);
		if (
			compressor.option("side_effects") &&
			self.body.length === 1 &&
			self.body[0] === compressor.has_directive("use strict")
		) {
			self.body.length = 0;
		}
		return self;
	};

	/** @type {OptimizerHelpers} */
	const helpers = {
		defineOptimizer,
		findVariable,
		optimizeLambda,
		isAtomic,
		unsafeUndefinedRef,
		inlineArrayLikeSpread,
		tightenBody,
		extractFromUnreachableCode,
		inlineIntoSymbolRef,
		inlineIntoCall
	};
	installStatementOptimizers(modules, helpers);
	installOperatorOptimizers(modules, helpers);
	installValueOptimizers(modules, helpers);
};

// The xxhash64 of terser's `output.js`, each run of whitespace read as one space:
// the one version the codegen phase below reproduces.
const TERSER_CODEGEN = { "output.js": "4d3bcaa64d1d635e" };

/**
 * @typedef {object} CodegenHelpers
 * @property {(body: Node[], isToplevel: boolean, output: TerserOutputStream, allowDirectives?: boolean) => void} displayBody terser's `display_body`
 * @property {(self: Node, output: TerserOutputStream) => void} printBracedEmpty terser's `print_braced_empty`
 * @property {(self: Node, output: TerserOutputStream, allowDirectives?: boolean) => void} printBraced terser's `print_braced`
 * @property {(self: Node, output: TerserOutputStream) => void} makeThen terser's `make_then`
 * @property {(node: Node, output: TerserOutputStream, noin: boolean) => void} parenthesizeForNoin terser's `parenthesize_for_noin`
 * @property {(key: string, quote: string | undefined, output: TerserOutputStream) => boolean} printPropertyName terser's `print_property_name`
 * @property {(stat: Node | null | undefined, output: TerserOutputStream) => void} printMaybeBracedBody terser's `print_maybe_braced_body`
 * @property {(candidates: string[]) => string} bestOf terser's `best_of`
 * @property {(num: number) => string} makeNum terser's `make_num`
 * @property {(stmt: Node | null | undefined, output: TerserOutputStream) => void} makeBlock terser's `make_block`
 * @property {(flags: string) => string} sortRegexpFlags terser's `sort_regexp_flags`
 * @property {(stack: { parent: (n?: number) => Node | undefined }) => boolean | undefined} firstInStatement terser's `first_in_statement`
 * @property {(node: Node) => boolean} leftIsObject terser's `left_is_object`
 * @property {(str: string, allowSurrogates?: boolean) => boolean} isIdentifierString terser's `is_identifier_string`
 */

/**
 * Whether this terser's code generators are the ones the phase reproduces,
 * and the output phase installed the stream they print into.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const codegenFits = (modules) => {
	const { ast, parse, MinifiedOutput } = modules;
	if (
		typeof MinifiedOutput !== "function" ||
		!parse ||
		!parse.PRECEDENCE ||
		!parse.ALL_RESERVED_WORDS ||
		typeof modules.utils.regexp_source_fix !== "function" ||
		typeof ast.AST_Toplevel.prototype._codegen !== "function" ||
		typeof ast.AST_Node.prototype.needs_parens !== "function"
	) {
		return false;
	}

	for (const file of Object.keys(TERSER_CODEGEN)) {
		if (
			hashTerserFile(file) !==
			TERSER_CODEGEN[/** @type {keyof typeof TERSER_CODEGEN} */ (file)]
		) {
			return false;
		}
	}
	return true;
};

/**
 * Installs webpack's code generators: every node's `_codegen`, `needs_parens`
 * and `add_source_map`, as terser's `output.js` writes them.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installCodegen = (modules) => {
	const helpers = createCodegenHelpers(modules);
	installParens(modules, helpers);
	installStatementCodegen(modules, helpers);
	installExpressionCodegen(modules, helpers);
	installLiteralCodegen(modules, helpers);
	installSourceMaps(modules);
};

// terser's order for a regular expression's flags; any it does not know follow.
const REGEXP_FLAG_ORDER = "dgimsuyv";

/**
 * The helpers terser's code generators share, from its `output.js` and the
 * modules it imports them from.
 * @param {TerserModules} modules terser's modules
 * @returns {CodegenHelpers} the helpers
 */
const createCodegenHelpers = (modules) => {
	const {
		AST_Arrow,
		AST_Binary,
		AST_BlockStatement,
		AST_Chain,
		AST_Class,
		AST_Conditional,
		AST_DefinitionsLike,
		AST_Directive,
		AST_Do,
		AST_Dot,
		AST_EmptyStatement,
		AST_If,
		AST_Object,
		AST_PrefixedTemplateString,
		AST_PrivateIn,
		AST_Scope,
		AST_Sequence,
		AST_SimpleStatement,
		AST_StatementWithBody,
		AST_String,
		AST_Sub,
		AST_UnaryPostfix,
		AST_Var
	} = /** @type {Record<string, NodeCheck>} */ (modules.ast);
	const { walk, walk_abort: walkAbort } = modules.ast;
	const { ALL_RESERVED_WORDS } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string> }} */ (modules.parse);
	const unicode = createUnicode();
	const firstInStatement = createFirstInStatement(modules);

	/**
	 * @param {Node[]} body the statements
	 * @param {boolean} isToplevel whether they are the program's
	 * @param {TerserOutputStream} output the stream printed into
	 * @param {boolean=} allowDirectives whether leading strings are directives
	 * @returns {void}
	 */
	const displayBody = (body, isToplevel, output, allowDirectives) => {
		const last = body.length - 1;
		output.in_directive = allowDirectives;
		for (let i = 0; i < body.length; i++) {
			const stmt = body[i];
			if (
				output.in_directive === true &&
				!(
					stmt instanceof AST_Directive ||
					stmt instanceof AST_EmptyStatement ||
					(stmt instanceof AST_SimpleStatement &&
						stmt.body instanceof AST_String)
				)
			) {
				output.in_directive = false;
			}
			if (!(stmt instanceof AST_EmptyStatement)) {
				output.indent();
				stmt.print(output);
				if (!(i === last && isToplevel)) {
					output.newline();
					if (isToplevel) output.newline();
				}
			}
			if (
				output.in_directive === true &&
				stmt instanceof AST_SimpleStatement &&
				stmt.body instanceof AST_String
			) {
				output.in_directive = false;
			}
		}
		output.in_directive = false;
	};

	/**
	 * @param {Node} self the node printed
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printBracedEmpty = (self, output) => {
		output.print("{");
		output.with_indent(output.next_indent(), () => {
			output.append_comments(self, true);
		});
		output.add_mapping(self.end);
		output.print("}");
	};

	/**
	 * @param {Node} self the node printed
	 * @param {TerserOutputStream} output the stream printed into
	 * @param {boolean=} allowDirectives whether leading strings are directives
	 * @returns {void}
	 */
	const printBraced = (self, output, allowDirectives) => {
		if (self.body.length > 0) {
			output.with_block(() => {
				displayBody(self.body, false, output, allowDirectives);
				output.add_mapping(self.end);
			});
		} else {
			printBracedEmpty(self, output);
		}
	};

	/**
	 * @param {Node | null | undefined} stmt the statement
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	const makeBlock = (stmt, output) => {
		if (!stmt || stmt instanceof AST_EmptyStatement) {
			output.print("{}");
		} else if (stmt instanceof AST_BlockStatement) {
			stmt.print(output);
		} else {
			output.with_block(() => {
				output.indent();
				stmt.print(output);
				output.newline();
			});
		}
	};

	/**
	 * @param {Node | null | undefined} stat the body
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printMaybeBracedBody = (stat, output) => {
		if (output.option("braces")) {
			makeBlock(stat, output);
		} else if (!stat || stat instanceof AST_EmptyStatement) {
			output.force_semicolon();
		} else if (
			(stat instanceof AST_DefinitionsLike && !(stat instanceof AST_Var)) ||
			stat instanceof AST_Class
		) {
			makeBlock(stat, output);
		} else {
			stat.print(output);
		}
	};

	/**
	 * @param {Node} self an `if`
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	const makeThen = (self, output) => {
		/** @type {Node} */
		let body = self.body;
		if (
			output.option("braces") ||
			(output.option("ie8") && body instanceof AST_Do)
		) {
			makeBlock(body, output);
			return;
		}
		if (!body) {
			output.force_semicolon();
			return;
		}
		for (;;) {
			if (body instanceof AST_If) {
				if (!body.alternative) {
					makeBlock(self.body, output);
					return;
				}
				body = body.alternative;
			} else if (body instanceof AST_StatementWithBody) {
				body = body.body;
			} else {
				break;
			}
		}
		printMaybeBracedBody(self.body, output);
	};

	/**
	 * @param {Node} node the node printed
	 * @param {TerserOutputStream} output the stream printed into
	 * @param {boolean} noin whether `in` would be read as a `for` loop's
	 * @returns {void}
	 */
	const parenthesizeForNoin = (node, output, noin) => {
		let parens = false;
		if (noin) {
			parens = walk(node, (/** @type {Node} */ inner) => {
				if (inner instanceof AST_Scope && !(inner instanceof AST_Arrow)) {
					return true;
				}
				if (
					(inner instanceof AST_Binary && inner.operator === "in") ||
					inner instanceof AST_PrivateIn
				) {
					return walkAbort;
				}
			});
		}
		node.print(output, parens);
	};

	/**
	 * @param {string[]} candidates the spellings
	 * @returns {string} the first shortest
	 */
	const bestOf = (candidates) => {
		let best = candidates[0];
		let length = best.length;
		for (let i = 1; i < candidates.length; ++i) {
			if (candidates[i].length < length) {
				best = candidates[i];
				length = best.length;
			}
		}
		return best;
	};

	/**
	 * @param {number} num a number
	 * @returns {string} its shortest spelling
	 */
	const makeNum = (num) => {
		const str = num.toString(10).replace(/^0\./, ".").replace("e+", "e");
		const candidates = [str];
		if (Math.floor(num) === num) {
			candidates.push(
				num < 0
					? `-0x${(-num).toString(16).toLowerCase()}`
					: `0x${num.toString(16).toLowerCase()}`
			);
		}
		let match;
		if ((match = /^\.0+/.exec(str))) {
			const length = match[0].length;
			const digits = str.slice(length);
			candidates.push(`${digits}e-${digits.length + length - 1}`);
		} else if ((match = /0+$/.exec(str))) {
			const length = match[0].length;
			candidates.push(`${str.slice(0, -length)}e${length}`);
		} else if ((match = /^(\d)\.(\d+)e(-?\d+)$/.exec(str))) {
			candidates.push(
				`${match[1]}${match[2]}e${Number(match[3]) - match[2].length}`
			);
		}
		return bestOf(candidates);
	};

	/**
	 * @param {string} key the property name
	 * @param {string | undefined} quote the quote it was written with
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {boolean} whether it printed as a bare name
	 */
	const printPropertyName = (key, quote, output) => {
		if (output.option("quote_keys")) {
			output.print_string(key);
			return false;
		}
		// eslint-disable-next-line eqeqeq
		if (`${Number(key)}` == key && Number(key) >= 0) {
			if (output.option("keep_numbers")) {
				output.print(key);
				return false;
			}
			output.print(
				makeNum(/** @type {number} */ (/** @type {unknown} */ (key)))
			);
			return false;
		}
		const printString = ALL_RESERVED_WORDS.has(key)
			? output.option("ie8")
			: output.option("ecma") < 2015 || output.option("safari10")
				? !unicode.isBasicIdentifier(key)
				: !unicode.isIdentifierString(key, true);
		if (printString || (quote && output.option("keep_quoted_props"))) {
			output.print_string(key, quote);
			return false;
		}
		output.print_name(key);
		return true;
	};

	/**
	 * @param {string} flags a regular expression's flags
	 * @returns {string} the same, in terser's order
	 */
	const sortRegexpFlags = (flags) => {
		const existing = new Set(flags);
		let out = "";
		for (const flag of REGEXP_FLAG_ORDER) {
			if (existing.has(flag)) {
				out += flag;
				existing.delete(flag);
			}
		}
		for (const flag of existing) out += flag;
		return out;
	};

	/**
	 * @param {Node} node an expression
	 * @returns {boolean} whether its leftmost part is an object literal
	 */
	const leftIsObject = (node) => {
		if (node instanceof AST_Object) return true;
		if (node instanceof AST_Sequence) return leftIsObject(node.expressions[0]);
		if (node.TYPE === "Call") return leftIsObject(node.expression);
		if (node instanceof AST_PrefixedTemplateString) {
			return leftIsObject(node.prefix);
		}
		if (node instanceof AST_Dot || node instanceof AST_Sub) {
			return leftIsObject(node.expression);
		}
		if (node instanceof AST_Chain) return leftIsObject(node.expression);
		if (node instanceof AST_Conditional) return leftIsObject(node.condition);
		if (node instanceof AST_Binary) return leftIsObject(node.left);
		if (node instanceof AST_UnaryPostfix) return leftIsObject(node.expression);
		return false;
	};

	return {
		displayBody,
		printBracedEmpty,
		printBraced,
		makeThen,
		parenthesizeForNoin,
		printPropertyName,
		printMaybeBracedBody,
		bestOf,
		makeNum,
		makeBlock,
		sortRegexpFlags,
		firstInStatement,
		leftIsObject,
		isIdentifierString: unicode.isIdentifierString
	};
};

/**
 * terser's `needs_parens` for every node, and the code generators up to
 * `AST_Do`: the statements a body is printed through.
 * @param {TerserModules} modules terser's modules
 * @param {CodegenHelpers} helpers the shared helpers
 * @returns {void}
 */
const installParens = (modules, helpers) => {
	const ast = /** @type {Record<string, NodeDefinable>} */ (modules.ast);
	const {
		AST_Array,
		AST_Arrow,
		AST_Assign,
		AST_Binary,
		AST_Call,
		AST_Conditional,
		AST_DefaultAssign,
		AST_Destructuring,
		AST_Export,
		AST_Expansion,
		AST_ForOf,
		AST_Function,
		AST_Hole,
		AST_New,
		AST_ObjectProperty,
		AST_PrefixedTemplateString,
		AST_PrivateIn,
		AST_PropAccess,
		AST_Scope,
		AST_Unary,
		AST_UnaryPrefix,
		AST_VarDefLike,
		AST_Yield
	} = /** @type {Record<string, NodeCheck>} */ (ast);
	const { walk, walk_abort: walkAbort } = modules.ast;
	const { PRECEDENCE } = /** @type {{ PRECEDENCE: Record<string, number> }} */ (
		modules.parse
	);
	const {
		displayBody,
		firstInStatement,
		makeBlock,
		makeNum,
		printBraced,
		printMaybeBracedBody
	} = helpers;

	ast.AST_Node.DEFMETHOD("needs_parens", alwaysFalse);

	// A function expression needs parens when it is provably the first token
	// of a statement.
	ast.AST_Function.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the function expression
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean} whether it is parenthesized
		 */
		function functionNeedsParens(output) {
			if (
				!output.has_parens() &&
				firstInStatement(/** @type {ParentStack} */ (output))
			) {
				return true;
			}
			if (output.option("webkit")) {
				/** @type {Node} */
				const parent = output.parent();
				if (parent instanceof AST_PropAccess && parent.expression === this) {
					return true;
				}
			}
			if (output.option("wrap_iife")) {
				/** @type {Node} */
				const parent = output.parent();
				if (parent instanceof AST_Call && parent.expression === this) {
					return true;
				}
			}
			if (output.option("wrap_func_args")) {
				/** @type {Node} */
				const parent = output.parent();
				if (parent instanceof AST_Call && parent.args.includes(this)) {
					return true;
				}
			}
			return false;
		}
	);

	ast.AST_Arrow.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the arrow function
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean} whether it is parenthesized
		 */
		function arrowNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (
				output.option("wrap_func_args") &&
				parent instanceof AST_Call &&
				parent.args.includes(this)
			) {
				return true;
			}
			return (
				(parent instanceof AST_PropAccess && parent.expression === this) ||
				(parent instanceof AST_Conditional && parent.condition === this)
			);
		}
	);

	// Otherwise `{...}` would read as a block.
	ast.AST_Object.DEFMETHOD(
		"needs_parens",
		/**
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		(output) =>
			!output.has_parens() &&
			firstInStatement(/** @type {ParentStack} */ (output))
	);

	ast.AST_ClassExpression.DEFMETHOD("needs_parens", firstInStatement);

	ast.AST_Unary.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the unary expression
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean} whether it is parenthesized
		 */
		function unaryNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			return (
				(parent instanceof AST_PropAccess && parent.expression === this) ||
				(parent instanceof AST_Call && parent.expression === this) ||
				(parent instanceof AST_Binary &&
					parent.operator === "**" &&
					this instanceof AST_UnaryPrefix &&
					parent.left === this &&
					this.operator !== "++" &&
					this.operator !== "--")
			);
		}
	);

	ast.AST_Await.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the `await`
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean} whether it is parenthesized
		 */
		function awaitNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			return (
				(parent instanceof AST_PropAccess && parent.expression === this) ||
				(parent instanceof AST_Call && parent.expression === this) ||
				(parent instanceof AST_Binary &&
					parent.operator === "**" &&
					parent.left === this) ||
				(output.option("safari10") && parent instanceof AST_UnaryPrefix)
			);
		}
	);

	ast.AST_Sequence.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the sequence
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean} whether it is parenthesized
		 */
		function sequenceNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			return (
				parent instanceof AST_Call ||
				parent instanceof AST_Unary ||
				parent instanceof AST_Binary ||
				parent instanceof AST_VarDefLike ||
				(parent instanceof AST_PropAccess && this !== parent.property) ||
				parent instanceof AST_Array ||
				parent instanceof AST_ObjectProperty ||
				parent instanceof AST_Conditional ||
				parent instanceof AST_Arrow ||
				parent instanceof AST_DefaultAssign ||
				parent instanceof AST_Expansion ||
				(parent instanceof AST_ForOf && this === parent.object) ||
				parent instanceof AST_Yield ||
				parent instanceof AST_Export
			);
		}
	);

	ast.AST_Binary.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the binary expression
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		function binaryNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (parent instanceof AST_Call && parent.expression === this) {
				return true;
			}
			if (parent instanceof AST_Unary) return true;
			if (parent instanceof AST_PropAccess && parent.expression === this) {
				return true;
			}
			if (parent instanceof AST_Binary) {
				const parentOperator = parent.operator;
				const operator = this.operator;
				// `??` mixed with `||` or `&&` is a syntax error without parens.
				if (
					operator === "??" &&
					(parentOperator === "||" || parentOperator === "&&")
				) {
					return true;
				}
				if (
					parentOperator === "??" &&
					(operator === "||" || operator === "&&")
				) {
					return true;
				}
				const parentPrecedence = PRECEDENCE[parentOperator];
				const precedence = PRECEDENCE[operator];
				if (
					parentPrecedence > precedence ||
					(parentPrecedence === precedence &&
						(this === parent.right || parentOperator === "**"))
				) {
					return true;
				}
			}
			if (parent instanceof AST_PrivateIn) {
				const parentPrecedence = PRECEDENCE.in;
				const precedence = PRECEDENCE[this.operator];
				if (
					parentPrecedence > precedence ||
					(parentPrecedence === precedence && this === parent.value)
				) {
					return true;
				}
			}
		}
	);

	ast.AST_PrivateIn.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the `#x in y`
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		function privateInNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (parent instanceof AST_Call && parent.expression === this) {
				return true;
			}
			if (parent instanceof AST_Unary) return true;
			if (parent instanceof AST_PropAccess && parent.expression === this) {
				return true;
			}
			if (parent instanceof AST_Binary) {
				const parentOperator = parent.operator;
				const parentPrecedence = PRECEDENCE[parentOperator];
				const precedence = PRECEDENCE.in;
				if (
					parentPrecedence > precedence ||
					(parentPrecedence === precedence &&
						(this === parent.right || parentOperator === "**"))
				) {
					return true;
				}
			}
			if (parent instanceof AST_PrivateIn && this === parent.value) {
				return true;
			}
		}
	);

	ast.AST_Yield.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the `yield`
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		function yieldNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			// `a = yield 3` needs none.
			if (parent instanceof AST_Binary && parent.operator !== "=") {
				return true;
			}
			if (parent instanceof AST_Call && parent.expression === this) {
				return true;
			}
			if (parent instanceof AST_Conditional && parent.condition === this) {
				return true;
			}
			if (parent instanceof AST_Unary) return true;
			if (parent instanceof AST_PropAccess && parent.expression === this) {
				return true;
			}
		}
	);

	ast.AST_Chain.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the optional chain
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean} whether it is parenthesized
		 */
		function chainNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (!(parent instanceof AST_Call || parent instanceof AST_PropAccess)) {
				return false;
			}
			return parent.expression === this;
		}
	);

	ast.AST_PropAccess.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the property access
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		function propAccessNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (parent instanceof AST_New && parent.expression === this) {
				// A call inside `new (foo.bar().baz)` would otherwise take the
				// `new`'s arguments.
				return walk(this, (/** @type {Node} */ node) => {
					if (node instanceof AST_Scope) return true;
					if (node instanceof AST_Call) return walkAbort;
				});
			}
		}
	);

	ast.AST_PrefixedTemplateString.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the tagged template
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		function prefixedTemplateNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (parent instanceof AST_New && parent.expression === this) {
				return true;
			}
		}
	);

	ast.AST_Call.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the call
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean} whether it is parenthesized
		 */
		function callNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			/** @type {Node | undefined} */
			let grandparent;
			if (
				(parent instanceof AST_New && parent.expression === this) ||
				(parent instanceof AST_Export &&
					parent.is_default &&
					this.expression instanceof AST_Function)
			) {
				return true;
			}
			// Safari bug: https://bugs.webkit.org/show_bug.cgi?id=123506
			return (
				this.expression instanceof AST_Function &&
				parent instanceof AST_PropAccess &&
				parent.expression === this &&
				(grandparent = output.parent(1)) instanceof AST_Assign &&
				grandparent.left === parent
			);
		}
	);

	ast.AST_New.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the `new`
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		function newNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (
				this.args.length === 0 &&
				(parent instanceof AST_PropAccess ||
					(parent instanceof AST_Call && parent.expression === this) ||
					(parent instanceof AST_PrefixedTemplateString &&
						parent.prefix === this))
			) {
				return true;
			}
		}
	);

	ast.AST_Number.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the number
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		function numberNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (parent instanceof AST_PropAccess && parent.expression === this) {
				const value = this.getValue();
				if (value < 0 || makeNum(value).startsWith("0")) {
					return true;
				}
			}
		}
	);

	ast.AST_BigInt.DEFMETHOD(
		"needs_parens",
		/**
		 * @this {Node} the bigint
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {boolean | undefined} whether it is parenthesized
		 */
		function bigIntNeedsParens(output) {
			/** @type {Node} */
			const parent = output.parent();
			if (parent instanceof AST_PropAccess && parent.expression === this) {
				const value = this.getValue();
				if (value.startsWith("-")) {
					return true;
				}
			}
		}
	);

	/**
	 * @this {Node} the assignment or conditional
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {boolean | undefined} whether it is parenthesized
	 */
	function assignNeedsParens(output) {
		/** @type {Node} */
		const parent = output.parent();
		if (parent instanceof AST_Unary) return true;
		if (parent instanceof AST_Binary && !(parent instanceof AST_Assign)) {
			return true;
		}
		if (parent instanceof AST_Call && parent.expression === this) {
			return true;
		}
		if (parent instanceof AST_Conditional && parent.condition === this) {
			return true;
		}
		if (parent instanceof AST_PropAccess && parent.expression === this) {
			return true;
		}
		// `({a, b} = c)`, an object destructuring assignment.
		if (
			this instanceof AST_Assign &&
			this.left instanceof AST_Destructuring &&
			this.left.is_array === false
		) {
			return true;
		}
	}
	ast.AST_Assign.DEFMETHOD("needs_parens", assignNeedsParens);
	ast.AST_Conditional.DEFMETHOD("needs_parens", assignNeedsParens);

	ast.AST_Directive.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the directive
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			output.print_string(self.value, self.quote);
			output.semicolon();
		}
	);

	ast.AST_Expansion.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the spread or rest element
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			output.print("...");
			self.expression.print(output);
		}
	);

	ast.AST_Destructuring.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the destructuring pattern
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			output.print(self.is_array ? "[" : "{");
			const { names } = self;
			const last = names.length - 1;
			for (let i = 0; i < names.length; i++) {
				const name = names[i];
				if (i > 0) output.comma();
				name.print(output);
				// A final hole needs a trailing comma of its own, or it reads as
				// the pattern's trailing comma.
				if (i === last && name instanceof AST_Hole) output.comma();
			}
			output.print(self.is_array ? "]" : "}");
		}
	);

	ast.AST_Debugger.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the `debugger` statement
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			output.print("debugger");
			output.semicolon();
		}
	);

	ast.AST_StatementWithBody.DEFMETHOD(
		"_do_print_body",
		/**
		 * @this {Node} the statement
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		function doPrintBody(output) {
			printMaybeBracedBody(this.body, output);
		}
	);

	ast.AST_Statement.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the statement
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			self.body.print(output);
			output.semicolon();
		}
	);
	ast.AST_Toplevel.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the program
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			displayBody(self.body, true, output, true);
			output.print("");
		}
	);
	ast.AST_LabeledStatement.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the labeled statement
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			self.label.print(output);
			output.colon();
			self.body.print(output);
		}
	);
	ast.AST_SimpleStatement.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the expression statement
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			self.body.print(output);
			output.semicolon();
		}
	);
	ast.AST_BlockStatement.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the block
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			printBraced(self, output);
		}
	);
	ast.AST_EmptyStatement.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the empty statement
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			output.semicolon();
		}
	);
	ast.AST_Do.DEFMETHOD(
		"_codegen",
		/**
		 * @param {Node} self the `do … while`
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		(self, output) => {
			output.print("do");
			output.space();
			makeBlock(self.body, output);
			output.space();
			output.print("while");
			output.space();
			output.with_parens(() => {
				self.condition.print(output);
			});
			output.semicolon();
		}
	);
};

/**
 * terser's code generators from `AST_While` to `AST_Using`: loops, functions,
 * jumps, conditionals, switches, `try` and declarations.
 * @param {TerserModules} modules terser's modules
 * @param {CodegenHelpers} helpers the shared helpers
 * @returns {void}
 */
const installStatementCodegen = (modules, helpers) => {
	const ast = /** @type {Record<string, NodeDefinable>} */ (modules.ast);
	const {
		AST_Assign,
		AST_Await,
		AST_Binary,
		AST_Call,
		AST_Conditional,
		AST_Constant,
		AST_DefaultAssign,
		AST_DefinitionsLike,
		AST_Dot,
		AST_For,
		AST_ForIn,
		AST_ForOf,
		AST_If,
		AST_Lambda,
		AST_Node,
		AST_Object,
		AST_PrefixedTemplateString,
		AST_PropAccess,
		AST_Return,
		AST_Sequence,
		AST_Symbol,
		AST_SymbolRef,
		AST_TemplateSegment,
		AST_Unary
	} = /** @type {Record<string, NodeCheck>} */ (ast);
	const {
		leftIsObject,
		makeThen,
		parenthesizeForNoin,
		printBraced,
		printBracedEmpty,
		printMaybeBracedBody
	} = helpers;

	/**
	 * terser's `DEFPRINT`: installs a node class's code generator.
	 * @param {NodeDefinable} nodeClass one of terser's node classes
	 * @param {(self: Node, output: TerserOutputStream) => void} generator its `_codegen`
	 * @returns {void}
	 */
	const definePrint = (nodeClass, generator) => {
		nodeClass.DEFMETHOD("_codegen", generator);
	};

	definePrint(ast.AST_While, (self, output) => {
		output.print("while");
		output.space();
		output.with_parens(() => {
			self.condition.print(output);
		});
		output.space();
		self._do_print_body(output);
	});
	definePrint(ast.AST_For, (self, output) => {
		output.print("for");
		output.space();
		output.with_parens(() => {
			/** @type {Node | null} */
			const init = self.init;
			if (init) {
				if (init instanceof AST_DefinitionsLike) {
					init.print(output);
				} else {
					parenthesizeForNoin(init, output, true);
				}
				output.print(";");
				output.space();
			} else {
				output.print(";");
			}
			if (self.condition) {
				self.condition.print(output);
				output.print(";");
				output.space();
			} else {
				output.print(";");
			}
			if (self.step) {
				self.step.print(output);
			}
		});
		output.space();
		self._do_print_body(output);
	});
	definePrint(ast.AST_ForIn, (self, output) => {
		output.print("for");
		if (self.await) {
			output.space();
			output.print("await");
		}
		output.space();
		output.with_parens(() => {
			self.init.print(output);
			output.space();
			output.print(self instanceof AST_ForOf ? "of" : "in");
			output.space();
			self.object.print(output);
		});
		output.space();
		self._do_print_body(output);
	});
	definePrint(ast.AST_With, (self, output) => {
		output.print("with");
		output.space();
		output.with_parens(() => {
			self.expression.print(output);
		});
		output.space();
		self._do_print_body(output);
	});

	ast.AST_Lambda.DEFMETHOD(
		"_do_print",
		/**
		 * @this {Node} the function printed
		 * @param {TerserOutputStream} output the stream printed into
		 * @param {boolean=} nokeyword whether it is a method, printed without `function`
		 * @returns {void}
		 */
		function doPrintLambda(output, nokeyword) {
			const self = this;
			if (!nokeyword) {
				if (self.async) {
					output.print("async");
					output.space();
				}
				output.print("function");
				if (self.is_generator) {
					output.star();
				}
				if (self.name) {
					output.space();
				}
			}
			/** @type {Node | null} */
			const name = self.name;
			if (name instanceof AST_Symbol) {
				name.print(output);
			} else if (nokeyword && name instanceof AST_Node) {
				// A computed method name.
				output.with_square(() => {
					name.print(output);
				});
			}
			output.with_parens(() => {
				for (let i = 0; i < self.argnames.length; i++) {
					if (i) output.comma();
					self.argnames[i].print(output);
				}
			});
			output.space();
			printBraced(self, output, true);
		}
	);
	definePrint(ast.AST_Lambda, (self, output) => {
		self._do_print(output);
		output.gc_scope(self);
	});

	definePrint(ast.AST_PrefixedTemplateString, (self, output) => {
		/** @type {Node} */
		const tag = self.prefix;
		const parenthesizeTag =
			tag instanceof AST_Lambda ||
			tag instanceof AST_Binary ||
			tag instanceof AST_Conditional ||
			tag instanceof AST_Sequence ||
			tag instanceof AST_Unary ||
			(tag instanceof AST_Dot && tag.expression instanceof AST_Object);
		if (parenthesizeTag) output.print("(");
		self.prefix.print(output);
		if (parenthesizeTag) output.print(")");
		self.template_string.print(output);
	});
	definePrint(ast.AST_TemplateString, (self, output) => {
		const isTagged = output.parent() instanceof AST_PrefixedTemplateString;

		output.print("`");
		for (let i = 0; i < self.segments.length; i++) {
			if (!(self.segments[i] instanceof AST_TemplateSegment)) {
				output.print("${");
				self.segments[i].print(output);
				output.print("}");
			} else if (isTagged) {
				output.print(self.segments[i].raw);
			} else {
				output.print_template_string_chars(self.segments[i].value);
			}
		}
		output.print("`");
	});
	definePrint(ast.AST_TemplateSegment, (self, output) => {
		output.print_template_string_chars(self.value);
	});

	ast.AST_Arrow.DEFMETHOD(
		"_do_print",
		/**
		 * @this {Node} the arrow function printed
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		function doPrintArrow(output) {
			const self = this;
			/** @type {Node | undefined} */
			const parent = output.parent();
			const needsParens =
				(parent instanceof AST_Binary &&
					!(parent instanceof AST_Assign) &&
					!(parent instanceof AST_DefaultAssign)) ||
				parent instanceof AST_Unary ||
				(parent instanceof AST_Call && self === parent.expression);
			if (needsParens) {
				output.print("(");
			}
			if (self.async) {
				output.print("async");
				output.space();
			}
			if (
				self.argnames.length === 1 &&
				self.argnames[0] instanceof AST_Symbol
			) {
				self.argnames[0].print(output);
			} else {
				output.with_parens(() => {
					for (let i = 0; i < self.argnames.length; i++) {
						if (i) output.comma();
						self.argnames[i].print(output);
					}
				});
			}
			output.space();
			output.print("=>");
			output.space();
			/** @type {Node | undefined} */
			const firstStatement = self.body[0];
			if (self.body.length === 1 && firstStatement instanceof AST_Return) {
				const returned = firstStatement.value;
				if (!returned) {
					output.print("{}");
				} else if (leftIsObject(returned)) {
					output.print("(");
					returned.print(output);
					output.print(")");
				} else {
					returned.print(output);
				}
			} else {
				printBraced(self, output);
			}
			if (needsParens) {
				output.print(")");
			}
			output.gc_scope(self);
		}
	);

	ast.AST_Exit.DEFMETHOD(
		"_do_print",
		/**
		 * @this {Node} the `return` or `throw` printed
		 * @param {TerserOutputStream} output the stream printed into
		 * @param {string} kind its keyword
		 * @returns {void}
		 */
		function doPrintExit(output, kind) {
			output.print(kind);
			if (this.value) {
				output.space();
				const comments = this.value.start.comments_before;
				if (
					comments &&
					comments.length &&
					!output.printed_comments.has(comments)
				) {
					output.print("(");
					this.value.print(output);
					output.print(")");
				} else {
					this.value.print(output);
				}
			}
			output.semicolon();
		}
	);
	definePrint(ast.AST_Return, (self, output) => {
		self._do_print(output, "return");
	});
	definePrint(ast.AST_Throw, (self, output) => {
		self._do_print(output, "throw");
	});

	definePrint(ast.AST_Yield, (self, output) => {
		const star = self.is_star ? "*" : "";
		output.print(`yield${star}`);
		if (self.expression) {
			output.space();
			self.expression.print(output);
		}
	});
	definePrint(ast.AST_Await, (self, output) => {
		output.print("await");
		output.space();
		const expression = self.expression;
		const parens = !(
			expression instanceof AST_Call ||
			expression instanceof AST_SymbolRef ||
			expression instanceof AST_PropAccess ||
			expression instanceof AST_Unary ||
			expression instanceof AST_Constant ||
			expression instanceof AST_Await ||
			expression instanceof AST_Object
		);
		if (parens) output.print("(");
		self.expression.print(output);
		if (parens) output.print(")");
	});

	ast.AST_LoopControl.DEFMETHOD(
		"_do_print",
		/**
		 * @this {Node} the `break` or `continue` printed
		 * @param {TerserOutputStream} output the stream printed into
		 * @param {string} kind its keyword
		 * @returns {void}
		 */
		function doPrintLoopControl(output, kind) {
			output.print(kind);
			if (this.label) {
				output.space();
				this.label.print(output);
			}
			output.semicolon();
		}
	);
	definePrint(ast.AST_Break, (self, output) => {
		self._do_print(output, "break");
	});
	definePrint(ast.AST_Continue, (self, output) => {
		self._do_print(output, "continue");
	});

	definePrint(ast.AST_If, (self, output) => {
		output.print("if");
		output.space();
		output.with_parens(() => {
			self.condition.print(output);
		});
		output.space();
		if (self.alternative) {
			makeThen(self, output);
			output.space();
			output.print("else");
			output.space();
			if (self.alternative instanceof AST_If) {
				self.alternative.print(output);
			} else {
				printMaybeBracedBody(self.alternative, output);
			}
		} else {
			self._do_print_body(output);
		}
	});

	definePrint(ast.AST_Switch, (self, output) => {
		output.print("switch");
		output.space();
		output.with_parens(() => {
			self.expression.print(output);
		});
		output.space();
		const last = self.body.length - 1;
		if (last < 0) {
			printBracedEmpty(self, output);
		} else {
			output.with_block(() => {
				for (let i = 0; i <= last; i++) {
					const branch = self.body[i];
					output.indent(true);
					branch.print(output);
					if (i < last && branch.body.length > 0) output.newline();
				}
			});
		}
	});
	ast.AST_SwitchBranch.DEFMETHOD(
		"_do_print_body",
		/**
		 * @this {Node} the `case` or `default` printed
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		function doPrintSwitchBranchBody(output) {
			output.newline();
			for (const statement of this.body) {
				output.indent();
				statement.print(output);
				output.newline();
			}
		}
	);
	definePrint(ast.AST_Default, (self, output) => {
		output.print("default:");
		self._do_print_body(output);
	});
	definePrint(ast.AST_Case, (self, output) => {
		output.print("case");
		output.space();
		self.expression.print(output);
		output.print(":");
		self._do_print_body(output);
	});

	definePrint(ast.AST_Try, (self, output) => {
		output.print("try");
		output.space();
		self.body.print(output);
		if (self.bcatch) {
			output.space();
			self.bcatch.print(output);
		}
		if (self.bfinally) {
			output.space();
			self.bfinally.print(output);
		}
	});
	definePrint(ast.AST_TryBlock, (self, output) => {
		printBraced(self, output);
	});
	definePrint(ast.AST_Catch, (self, output) => {
		output.print("catch");
		if (self.argname) {
			output.space();
			output.with_parens(() => {
				self.argname.print(output);
			});
		}
		output.space();
		printBraced(self, output);
	});
	definePrint(ast.AST_Finally, (self, output) => {
		output.print("finally");
		output.space();
		printBraced(self, output);
	});

	ast.AST_DefinitionsLike.DEFMETHOD(
		"_do_print",
		/**
		 * @this {Node} the declaration printed
		 * @param {TerserOutputStream} output the stream printed into
		 * @param {string} kind its keyword
		 * @returns {void}
		 */
		function doPrintDefinitions(output, kind) {
			output.print(kind);
			output.space();
			for (let i = 0; i < this.definitions.length; i++) {
				if (i) output.comma();
				this.definitions[i].print(output);
			}
			/** @type {Node | undefined} */
			const parent = output.parent();
			const inFor = parent instanceof AST_For || parent instanceof AST_ForIn;
			const outputSemicolon = !inFor || (parent && parent.init !== this);
			if (outputSemicolon) output.semicolon();
		}
	);
	definePrint(ast.AST_Let, (self, output) => {
		self._do_print(output, "let");
	});
	definePrint(ast.AST_Var, (self, output) => {
		self._do_print(output, "var");
	});
	definePrint(ast.AST_Const, (self, output) => {
		self._do_print(output, "const");
	});
	definePrint(ast.AST_Using, (self, output) => {
		self._do_print(output, self.await ? "await using" : "using");
	});
};

/**
 * terser's code generators from `AST_Import` to `AST_Class`: modules,
 * definitions, calls, operators and object and class bodies.
 * @param {TerserModules} modules terser's modules
 * @param {CodegenHelpers} helpers the shared helpers
 * @returns {void}
 */
const installExpressionCodegen = (modules, helpers) => {
	const ast = /** @type {Record<string, NodeDefinable>} */ (modules.ast);
	const {
		AST_Call,
		AST_Class,
		AST_ClassExpression,
		AST_Definitions,
		AST_Defun,
		AST_For,
		AST_ForIn,
		AST_Function,
		AST_Hole,
		AST_Import,
		AST_Lambda,
		AST_New,
		AST_Number,
		AST_PropAccess,
		AST_SymbolRef,
		AST_UnaryPrefix
	} = /** @type {Record<string, NodeCheck>} */ (ast);
	const { ALL_RESERVED_WORDS } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string> }} */ (modules.parse);
	const { parenthesizeForNoin, printBracedEmpty, isIdentifierString } = helpers;

	/**
	 * terser's `DEFPRINT`: sets a node class's code generator.
	 * @param {string} name the node class's name in terser's `ast` module
	 * @param {(self: Node, output: TerserOutputStream) => void} generator its `_codegen`
	 * @returns {void}
	 */
	const definePrint = (name, generator) => {
		ast[name].DEFMETHOD("_codegen", generator);
	};

	/**
	 * Prints the local side of an import or export mapping, quoted when it was.
	 * @param {Node} name the symbol
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printMappedName = (name, output) => {
		if (!name.quote) {
			name.print(output);
		} else {
			output.print_string(name.name, name.quote);
		}
	};

	/**
	 * Prints the foreign side of an import or export mapping, quoted when it was.
	 * @param {Node} foreignName the foreign symbol
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printForeignName = (foreignName, output) => {
		if (!foreignName.quote) {
			output.print(foreignName.name);
		} else {
			output.print_string(foreignName.name, foreignName.quote);
		}
	};

	definePrint("AST_Import", (self, output) => {
		output.print("import");
		output.space();
		if (self.phase) {
			output.print(self.phase);
			output.space();
		}
		if (self.imported_name) {
			self.imported_name.print(output);
		}
		if (self.imported_name && self.imported_names) {
			output.print(",");
			output.space();
		}
		if (self.imported_names) {
			if (
				self.imported_names.length === 1 &&
				self.imported_names[0].foreign_name.name === "*" &&
				!self.imported_names[0].foreign_name.quote
			) {
				self.imported_names[0].print(output);
			} else {
				output.print("{");
				const names = self.imported_names;
				for (let i = 0; i < names.length; i++) {
					output.space();
					names[i].print(output);
					if (i < names.length - 1) {
						output.print(",");
					}
				}
				output.space();
				output.print("}");
			}
		}
		if (self.imported_name || self.imported_names) {
			output.space();
			output.print("from");
			output.space();
		}
		self.module_name.print(output);
		if (self.attributes) {
			output.print("with");
			self.attributes.print(output);
		}
		output.semicolon();
	});

	definePrint("AST_ImportMeta", (self, output) => {
		output.print("import.meta");
	});

	definePrint("AST_DynamicImport", (self, output) => {
		if (self.phase) output.print(`import.${self.phase}`);
		else output.print("import");
		output.with_parens(() => {
			const args = self.args;
			for (let i = 0; i < args.length; i++) {
				if (i) output.comma();
				args[i].print(output);
			}
		});
	});

	definePrint("AST_NameMapping", (self, output) => {
		const isImport = output.parent() instanceof AST_Import;
		const definition = self.name.definition();
		const foreignName = self.foreign_name;
		let namesAreDifferent =
			((definition && definition.mangled_name) || self.name.name) !==
			foreignName.name;
		if (
			!namesAreDifferent &&
			foreignName.name === "*" &&
			Boolean(foreignName.quote) !== Boolean(self.name.quote)
		) {
			// export * as "*"
			namesAreDifferent = true;
		}
		if (namesAreDifferent) {
			if (isImport) {
				printForeignName(foreignName, output);
			} else {
				printMappedName(self.name, output);
			}
			output.space();
			output.print("as");
			output.space();
			if (isImport) {
				self.name.print(output);
			} else {
				printForeignName(foreignName, output);
			}
		} else {
			printMappedName(self.name, output);
		}
	});

	definePrint("AST_Export", (self, output) => {
		output.print("export");
		output.space();
		if (self.is_default) {
			output.print("default");
			output.space();
		}
		if (self.exported_names) {
			if (
				self.exported_names.length === 1 &&
				self.exported_names[0].name.name === "*" &&
				!self.exported_names[0].name.quote
			) {
				self.exported_names[0].print(output);
			} else {
				output.print("{");
				const names = self.exported_names;
				for (let i = 0; i < names.length; i++) {
					output.space();
					names[i].print(output);
					if (i < names.length - 1) {
						output.print(",");
					}
				}
				output.space();
				output.print("}");
			}
		} else if (self.exported_value) {
			self.exported_value.print(output);
		} else if (self.exported_definition) {
			self.exported_definition.print(output);
			if (self.exported_definition instanceof AST_Definitions) return;
		}
		if (self.module_name) {
			output.space();
			output.print("from");
			output.space();
			self.module_name.print(output);
		}
		if (self.attributes) {
			output.print("with");
			self.attributes.print(output);
		}
		if (
			(self.exported_value &&
				!(
					self.exported_value instanceof AST_Defun ||
					self.exported_value instanceof AST_Function ||
					self.exported_value instanceof AST_Class
				)) ||
			self.module_name ||
			self.exported_names
		) {
			output.semicolon();
		}
	});

	definePrint("AST_VarDefLike", (self, output) => {
		self.name.print(output);
		if (self.value) {
			output.space();
			output.print("=");
			output.space();
			const parent = output.parent(1);
			const noin = parent instanceof AST_For || parent instanceof AST_ForIn;
			parenthesizeForNoin(self.value, output, noin);
		}
	});

	definePrint("AST_Call", (self, output) => {
		self.expression.print(output);
		if (self instanceof AST_New && self.args.length === 0) return;
		if (
			self.expression instanceof AST_Call ||
			self.expression instanceof AST_Lambda
		) {
			output.add_mapping(self.start);
		}
		if (self.optional) output.print("?.");
		output.with_parens(() => {
			const args = self.args;
			for (let i = 0; i < args.length; i++) {
				if (i) output.comma();
				args[i].print(output);
			}
		});
	});

	definePrint("AST_New", (self, output) => {
		output.print("new");
		output.space();
		ast.AST_Call.prototype._codegen(self, output);
	});

	ast.AST_Sequence.DEFMETHOD(
		"_do_print",
		/**
		 * @this {Node} the sequence
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		function doPrint(output) {
			const expressions = this.expressions;
			for (let index = 0; index < expressions.length; index++) {
				if (index > 0) {
					output.comma();
					if (output.should_break()) {
						output.newline();
						output.indent();
					}
				}
				expressions[index].print(output);
			}
		}
	);

	definePrint("AST_Sequence", (self, output) => {
		self._do_print(output);
	});

	definePrint("AST_Dot", (self, output) => {
		const expr = self.expression;
		expr.print(output);
		const prop = self.property;
		const printComputed = ALL_RESERVED_WORDS.has(prop)
			? output.option("ie8")
			: !isIdentifierString(
					prop,
					output.option("ecma") >= 2015 && !output.option("safari10")
				);
		if (self.optional) output.print("?.");
		if (printComputed) {
			output.print("[");
			output.add_mapping(self.end);
			output.print_string(prop);
			output.print("]");
		} else {
			// `1..x`: a dot straight after an integer literal is its fraction's.
			if (
				expr instanceof AST_Number &&
				expr.getValue() >= 0 &&
				!/[xa-f.)]/i.test(output.last())
			) {
				output.print(".");
			}
			if (!self.optional) output.print(".");
			output.add_mapping(self.end);
			output.print_name(prop);
		}
	});

	definePrint("AST_DotHash", (self, output) => {
		const expr = self.expression;
		expr.print(output);
		const prop = self.property;
		if (self.optional) output.print("?");
		output.print(".#");
		output.add_mapping(self.end);
		output.print_name(prop);
	});

	definePrint("AST_Sub", (self, output) => {
		self.expression.print(output);
		if (self.optional) output.print("?.");
		output.print("[");
		self.property.print(output);
		output.print("]");
	});

	definePrint("AST_Chain", (self, output) => {
		self.expression.print(output);
	});

	definePrint("AST_UnaryPrefix", (self, output) => {
		const op = self.operator;
		// avoid printing "<!--"
		if (op === "--" && output.last().endsWith("!")) {
			output.print(" ");
		}
		output.print(op);
		if (
			/^[a-z]/i.test(op) ||
			(/[+-]$/.test(op) &&
				self.expression instanceof AST_UnaryPrefix &&
				/^[+-]/.test(self.expression.operator))
		) {
			output.space();
		}
		self.expression.print(output);
	});

	definePrint("AST_UnaryPostfix", (self, output) => {
		self.expression.print(output);
		output.print(self.operator);
	});

	definePrint("AST_Binary", (self, output) => {
		const op = self.operator;
		self.left.print(output);
		// `>`, `>=`, `>>` or `>>>` straight after `--` would read as `-->`
		if (op[0] === ">" && output.last().endsWith("--")) {
			output.print(" ");
		} else {
			output.space();
		}
		output.print(op);
		output.space();
		self.right.print(output);
	});

	definePrint("AST_Conditional", (self, output) => {
		self.condition.print(output);
		output.space();
		output.print("?");
		output.space();
		self.consequent.print(output);
		output.space();
		output.colon();
		self.alternative.print(output);
	});

	definePrint("AST_Array", (self, output) => {
		output.with_square(() => {
			const elements = self.elements;
			const length = elements.length;
			if (length > 0) output.space();
			for (let i = 0; i < length; i++) {
				const element = elements[i];
				if (i) output.comma();
				element.print(output);
				// A final hole needs its own comma, or it reads as a trailing comma.
				if (i === length - 1 && element instanceof AST_Hole) output.comma();
			}
			if (length > 0) output.space();
		});
	});

	definePrint("AST_Object", (self, output) => {
		if (self.properties.length > 0) {
			output.with_block(() => {
				const properties = self.properties;
				for (let i = 0; i < properties.length; i++) {
					if (i) {
						output.print(",");
						output.newline();
					}
					output.indent();
					properties[i].print(output);
				}
				output.newline();
			});
		} else {
			printBracedEmpty(self, output);
		}
	});

	definePrint("AST_Class", (self, output) => {
		output.print("class");
		output.space();
		if (self.name) {
			self.name.print(output);
			output.space();
		}
		if (self.extends) {
			const parens =
				!(self.extends instanceof AST_SymbolRef) &&
				!(self.extends instanceof AST_PropAccess) &&
				!(self.extends instanceof AST_ClassExpression) &&
				!(self.extends instanceof AST_Function);
			output.print("extends");
			if (parens) {
				output.print("(");
			} else {
				output.space();
			}
			self.extends.print(output);
			if (parens) {
				output.print(")");
			} else {
				output.space();
			}
		}
		if (self.properties.length > 0) {
			output.with_block(() => {
				const properties = self.properties;
				for (let i = 0; i < properties.length; i++) {
					if (i) {
						output.newline();
					}
					output.indent();
					properties[i].print(output);
				}
				output.newline();
			});
		} else {
			output.print("{}");
		}
	});
};

// A regular expression's `</script`, which would end an inline script element.
const REGEXP_SLASH_SCRIPT = /(<\s*\/\s*script)/i;
const REGEXP_STARTS_WITH_SCRIPT = /^\s*script/i;

/**
 * @param {string} _match the whole match
 * @param {string} slashScript the `</script` matched
 * @returns {string} the same with its slash escaped
 */
const escapeSlashScript = (_match, slashScript) =>
	slashScript.replace("/", "\\/");

/**
 * terser's code generators from `AST_NewTarget` to `AST_RegExp`: property
 * definitions, symbols and literals.
 * @param {TerserModules} modules terser's modules
 * @param {CodegenHelpers} helpers the shared helpers
 * @returns {void}
 */
const installLiteralCodegen = (modules, helpers) => {
	const ast = /** @type {Record<string, NodeDefinable>} */ (modules.ast);
	const {
		AST_Binary,
		AST_DefaultAssign,
		AST_Node,
		AST_Symbol,
		AST_SymbolClassProperty,
		AST_SymbolMethod
	} = /** @type {Record<string, NodeCheck>} */ (ast);
	const { ALL_RESERVED_WORDS } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string> }} */ (modules.parse);
	const regexpSourceFix = modules.utils.regexp_source_fix;
	const { makeNum, printBraced, printPropertyName, sortRegexpFlags } = helpers;

	/**
	 * terser's `DEFPRINT`.
	 * @param {NodeDefinable} nodeType the node class
	 * @param {(self: Node, output: TerserOutputStream) => void} generator its code generator
	 * @returns {void}
	 */
	const defprint = (nodeType, generator) => {
		nodeType.DEFMETHOD("_codegen", generator);
	};

	/**
	 * @param {Node} symbol a symbol
	 * @returns {string} the name it prints as
	 */
	const getName = (symbol) => {
		const def = symbol.definition();
		return def ? def.mangled_name || def.name : symbol.name;
	};

	/**
	 * @param {Node} self a method
	 * @returns {string | undefined} the keyword its function's kind prints
	 */
	const methodType = (self) => {
		if (self.value.is_generator && self.value.async) return "async*";
		if (self.value.is_generator) return "*";
		if (self.value.async) return "async";
	};

	defprint(ast.AST_NewTarget, (self, output) => {
		output.print("new.target");
	});
	defprint(ast.AST_ObjectKeyVal, (self, output) => {
		/** @type {Node} */
		const value = self.value;
		const tryShorthand =
			output.option("shorthand") && !(self.key instanceof AST_Node);
		if (
			tryShorthand &&
			value instanceof AST_Symbol &&
			getName(value) === self.key &&
			!ALL_RESERVED_WORDS.has(self.key)
		) {
			const wasShorthand = printPropertyName(self.key, self.quote, output);
			if (!wasShorthand) {
				output.colon();
				value.print(output);
			}
		} else if (
			tryShorthand &&
			value instanceof AST_DefaultAssign &&
			value.left instanceof AST_Symbol &&
			getName(value.left) === self.key
		) {
			const wasShorthand = printPropertyName(self.key, self.quote, output);
			if (!wasShorthand) {
				output.colon();
				value.left.print(output);
			}
			output.space();
			output.print("=");
			output.space();
			value.right.print(output);
		} else {
			if (!(self.key instanceof AST_Node)) {
				printPropertyName(self.key, self.quote, output);
			} else {
				output.with_square(() => {
					self.key.print(output);
				});
			}
			output.colon();
			value.print(output);
		}
	});
	defprint(ast.AST_ClassPrivateProperty, (self, output) => {
		if (self.static) {
			output.print("static");
			output.space();
		}
		output.print("#");
		printPropertyName(self.key.name, undefined, output);
		if (self.value) {
			output.print("=");
			self.value.print(output);
		}
		output.semicolon();
	});
	defprint(ast.AST_ClassProperty, (self, output) => {
		if (self.static) {
			output.print("static");
			output.space();
		}
		/** @type {Node} */
		const key = self.key;
		if (key instanceof AST_SymbolClassProperty) {
			printPropertyName(key.name, self.quote, output);
		} else {
			output.print("[");
			key.print(output);
			output.print("]");
		}
		if (self.value) {
			output.print("=");
			self.value.print(output);
		}
		output.semicolon();
	});
	ast.AST_ObjectProperty.DEFMETHOD(
		"_print_getter_setter",
		/**
		 * @this {Node} the property printed
		 * @param {string | undefined} type the keyword before its name
		 * @param {boolean} isPrivate whether its name is private
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		function printGetterSetter(type, isPrivate, output) {
			const self = this;
			if (self.static) {
				output.print("static");
				output.space();
			}
			if (type) {
				output.print(type);
				output.space();
			}
			/** @type {Node} */
			const key = self.key;
			if (key instanceof AST_SymbolMethod) {
				if (isPrivate) output.print("#");
				printPropertyName(key.name, self.quote, output);
				key.add_source_map(output);
			} else {
				output.with_square(() => {
					key.print(output);
				});
			}
			self.value._do_print(output, true);
		}
	);
	defprint(ast.AST_ObjectSetter, (self, output) => {
		self._print_getter_setter("set", false, output);
	});
	defprint(ast.AST_ObjectGetter, (self, output) => {
		self._print_getter_setter("get", false, output);
	});
	defprint(ast.AST_PrivateSetter, (self, output) => {
		self._print_getter_setter("set", true, output);
	});
	defprint(ast.AST_PrivateGetter, (self, output) => {
		self._print_getter_setter("get", true, output);
	});
	defprint(ast.AST_ConciseMethod, (self, output) => {
		self._print_getter_setter(methodType(self), false, output);
	});
	defprint(ast.AST_PrivateMethod, (self, output) => {
		self._print_getter_setter(methodType(self), true, output);
	});
	defprint(ast.AST_PrivateIn, (self, output) => {
		self.key.print(output);
		output.space();
		output.print("in");
		output.space();
		self.value.print(output);
	});
	defprint(ast.AST_SymbolPrivateProperty, (self, output) => {
		output.print(`#${self.name}`);
	});
	defprint(ast.AST_ClassStaticBlock, (self, output) => {
		output.print("static");
		output.space();
		printBraced(self, output);
	});
	ast.AST_Symbol.DEFMETHOD(
		"_do_print",
		/**
		 * @this {Node} the symbol printed
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		function doPrint(output) {
			output.print_name(getName(this));
		}
	);
	defprint(ast.AST_Symbol, (self, output) => {
		self._do_print(output);
	});
	defprint(ast.AST_Hole, () => {});
	defprint(ast.AST_This, (self, output) => {
		output.print("this");
	});
	defprint(ast.AST_Super, (self, output) => {
		output.print("super");
	});
	defprint(ast.AST_Constant, (self, output) => {
		output.print(self.getValue());
	});
	defprint(ast.AST_String, (self, output) => {
		output.print_string(self.getValue(), self.quote, output.in_directive);
	});
	defprint(ast.AST_Number, (self, output) => {
		if ((output.option("keep_numbers") || output.use_asm) && self.raw) {
			output.print(self.raw);
		} else {
			output.print(makeNum(self.getValue()));
		}
	});
	defprint(ast.AST_BigInt, (self, output) => {
		if (output.option("keep_numbers") && self.raw) {
			output.print(self.raw);
		} else {
			output.print(`${self.getValue()}n`);
		}
	});
	defprint(ast.AST_RegExp, (self, output) => {
		const value = self.getValue();
		let source = regexpSourceFix(value.source);
		const flags = value.flags ? sortRegexpFlags(value.flags) : "";
		source = source.replace(REGEXP_SLASH_SCRIPT, escapeSlashScript);
		if (REGEXP_STARTS_WITH_SCRIPT.test(source) && output.last().endsWith("<")) {
			output.print(" ");
		}
		output.print(output.to_utf8(`/${source}/${flags}`, false, true));
		/** @type {Node | undefined} */
		const parent = output.parent();
		if (
			parent instanceof AST_Binary &&
			/^\w/.test(parent.operator) &&
			parent.left === self
		) {
			output.print(" ");
		}
	});
};

/**
 * terser's `add_source_map` for every node.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installSourceMaps = (modules) => {
	const ast = /** @type {Record<string, NodeDefinable>} */ (modules.ast);
	// A label is mapped by its symbol; mapping every node would be wasteful.
	for (const nodeType of [
		ast.AST_Node,
		ast.AST_LabeledStatement,
		ast.AST_Toplevel
	]) {
		nodeType.DEFMETHOD("add_source_map", noop);
	}

	/**
	 * @this {Node} the node printed
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	function mapStart(output) {
		output.add_mapping(this.start);
	}
	for (const nodeType of [
		ast.AST_Array,
		ast.AST_BlockStatement,
		ast.AST_Catch,
		ast.AST_Class,
		ast.AST_Constant,
		ast.AST_Debugger,
		ast.AST_DefinitionsLike,
		ast.AST_Directive,
		ast.AST_Finally,
		ast.AST_Jump,
		ast.AST_Lambda,
		ast.AST_New,
		ast.AST_Object,
		ast.AST_StatementWithBody,
		ast.AST_Symbol,
		ast.AST_Switch,
		ast.AST_SwitchBranch,
		ast.AST_TemplateString,
		ast.AST_TemplateSegment,
		ast.AST_Try
	]) {
		nodeType.DEFMETHOD("add_source_map", mapStart);
	}

	/**
	 * @this {Node} the method printed
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	function mapMethodStart(output) {
		// The name is mapped by the method's key.
		output.add_mapping(this.start, false);
	}
	for (const nodeType of [
		ast.AST_ObjectGetter,
		ast.AST_ObjectSetter,
		ast.AST_PrivateGetter,
		ast.AST_PrivateSetter,
		ast.AST_ConciseMethod,
		ast.AST_PrivateMethod
	]) {
		nodeType.DEFMETHOD("add_source_map", mapMethodStart);
	}

	/**
	 * @this {Node} the method's or private property's name
	 * @param {TerserOutputStream} output the stream printed into
	 * @returns {void}
	 */
	function mapNameEnd(output) {
		const tokenType = this.end && this.end.type;
		if (tokenType === "name" || tokenType === "privatename") {
			output.add_mapping(this.end, this.name);
		} else {
			output.add_mapping(this.end);
		}
	}
	for (const nodeType of [
		ast.AST_SymbolMethod,
		ast.AST_SymbolPrivateProperty
	]) {
		nodeType.DEFMETHOD("add_source_map", mapNameEnd);
	}

	ast.AST_ObjectProperty.DEFMETHOD(
		"add_source_map",
		/**
		 * @this {Node} the property printed
		 * @param {TerserOutputStream} output the stream printed into
		 * @returns {void}
		 */
		function mapProperty(output) {
			output.add_mapping(this.start, this.key);
		}
	);
};

// The phases webpack has taken over. Each one replaces a method on the
// minifier's own classes and writes exactly what it wrote, only faster, except
// `correct`, which changes only what it wrote wrong; add phases here only.
/** @type {Phase[]} */
const PHASES = [
	{ name: "helpers", supports: helpersFits, install: installHelpers },
	{ name: "walk", supports: walkFits, install: installWalk },
	{ name: "nodes", supports: nodesFits, install: installNodes },
	{ name: "defines", supports: definesFits, install: installDefines },
	{ name: "transform", supports: transformFits, install: installTransform },
	{
		name: "compressor",
		supports: compressorFits,
		install: installCompressor
	},
	{ name: "size", supports: sizeFits, install: installSize },
	{ name: "evaluate", supports: evaluateFits, install: installEvaluate },
	{ name: "inference", supports: inferenceFits, install: installInference },
	{
		name: "drop",
		supports: dropSideEffectFreeFits,
		install: installDropSideEffectFree
	},
	{ name: "optimize", supports: optimizeFits, install: installOptimize },
	{
		name: "equivalent",
		supports: equivalentFits,
		install: installEquivalent
	},
	{ name: "hoist", supports: hoistFits, install: installHoist },
	{ name: "scope", supports: scopeFits, install: installScope },
	{ name: "unused", supports: unusedFits, install: installUnused },
	{ name: "reduce", supports: reduceFits, install: installReduce },
	{ name: "minify", supports: minifyFits, install: installMinify },
	{ name: "mangle", supports: manglingFits, install: installMangling },
	{ name: "frequency", supports: frequencyFits, install: installFrequency },
	{ name: "output", supports: outputFits, install: installOutput },
	{ name: "codegen", supports: codegenFits, install: installCodegen },
	{ name: "print", supports: printFits, install: installPrint },
	{ name: "parse", supports: parseFits, install: installParse },
	{ name: "correct", supports: correctFits, install: installCorrect }
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
	// A runtime that imports terser's sources has `createRequire` too.
	// eslint-disable-next-line n/no-unsupported-features/node-builtins
	const { createRequire } = require("module");
	const { version } = require("terser/package.json");

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
	// Read for its effect too: it installs the code generators on every node.
	const output = await at("output.js");
	const utils = await at("utils/index.js");
	// Read for its effect: it installs the ESTree conversions `minify` reaches.
	await at("mozilla-ast.js");
	const { minify } = await at("minify.js");
	// Loaded already, as `minify` imports them; its driver phase reads them.
	const compress = await at("compress/index.js");
	// The DOM's property names, which a mangled property keeps.
	const domprops = await at("../tools/domprops.js");
	const common = await at("compress/common.js");
	const inference = await at("compress/inference.js");
	const flags = await at("compress/compressor-flags.js");
	const nativeObjects = await at("compress/native-objects.js");
	// terser's own dependency, required from where terser is, which a bundler
	// reading webpack leaves alone as it can't see this `require`.
	const sourceMap = createRequire(path.join(directory, "package.json"))(
		"@jridgewell/source-map"
	);
	return {
		ast,
		scope,
		parse,
		output,
		utils,
		minify,
		compress,
		domprops,
		common,
		inference,
		flags,
		nativeObjects,
		sourceMap,
		version
	};
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
			return {
				minify: modules.minify,
				phases,
				corrections: modules.corrections
			};
		})
		.catch(() => ({ minify: require("terser").minify, phases: [] }));
	return loading;
};

module.exports = {
	load,
	loadSources,
	PHASES,
	FORMAT_DEFAULTS,
	IGNORED_FORMAT_OPTIONS,
	createCompressHelpers,
	createTerserTree,
	createUnicode,
	estreeType,
	markEstreeTypes
};
