/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

/*
	Ported from terser (https://github.com/terser/terser), under its license:

	Copyright 2012-2018 (c) Mihai Bazon <mihai.bazon@gmail.com>

	Redistribution and use in source and binary forms, with or without
	modification, are permitted provided that the following conditions
	are met:

	    * Redistributions of source code must retain the above
	      copyright notice, this list of conditions and the following
	      disclaimer.

	    * Redistributions in binary form must reproduce the above
	      copyright notice, this list of conditions and the following
	      disclaimer in the documentation and/or other materials
	      provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDER “AS IS” AND ANY
	EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
	IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
	PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE
	LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY,
	OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
	PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
	PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
	THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
	TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF
	THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
	SUCH DAMAGE.
*/

"use strict";

const {
	DECLARES_CATCH,
	DECLARES_CLASS,
	DECLARES_CONST,
	DECLARES_DEFUN,
	DECLARES_DEF_CLASS,
	DECLARES_FUNARG,
	DECLARES_IMPORT,
	DECLARES_LAMBDA,
	DECLARES_LET,
	DECLARES_USING,
	DECLARES_VAR,
	EXPORT_KEEP_NAME,
	analyzeMinifierTree,
	isMinifierVariable
} = require("./ScopeAnalyzer");

/* eslint-disable camelcase, new-cap -- terser's own API, which this speaks */

// cspell:ignore Mihai, Bazon, DEFNODE, endpos, endcol, sequencesize, lvalues, binop, loopcontrol, symbolref, funs, jridgewell, DEFMETHOD, Defun, defun, defuns, fnames, funarg, classnames, mangleable, unmangleable, NOINLINE, privatename, argnames, thedef, argname, bcatch, bfinally, MANGLEPROP, nlb, punc, Funarg, propmangle, preferrably, nondeferred, fargs, domprops, noin, Noin, DEFPRINT, defprint, dgimsuyv, nokeyword, etnriaoslucdfmhpgvybkwjxqz, ETNRIAOSLUCDFMHPGVYBKWJXQZ

/**
 * The modules the one-pass minify reads: what `createModules` builds, and
 * what each phase installs, read only by the phases after it.
 * @internal
 * @typedef {object} TerserModules
 * @property {ReturnType<typeof createParseTables> & { parseTree: <T>(text: string, givenOptions: ParseOptions, readTokens: (tree: SyntaxTree, program: number, tokenAt: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable) => T, placesLater?: boolean) => { tree: SyntaxTree, program: number, tables: TokenTables, read: T, module: boolean } }} parse the parser and its tables, and the parse a tree printed directly is read with
 * @property {{ base54: ReturnType<typeof createFrequency> }} scope the mangler's source of names
 * @property {{ OutputStream: (given?: Partial<FormatSettings>) => OutputStream }} output terser's `OutputStream`, the format options as given
 * @property {{ domprops: string[] }} domprops the DOM's property names
 * @property {(new (options: FormatSettings, readonly: boolean, nodeAccess: NodeAccess) => OutputStream) & { prototype: OutputStream }} MinifiedOutput webpack's stream for minified output
 * @property {Improvements} improvements the switch the improvements read, once the improve phase installs it
 * @property {boolean} quotesKept whether the run keeps a quoted key apart from the same key bare: a property mangler keeping quoted names strictly, or the output keeping quotes
 * @property {LineBreakTemplates} lineBreakTemplates what decides and writes a string's line breaks raw in a template, once per source
 * @property {(tree: SyntaxTree, program: number, at: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable) => TreeTokens} readTreeTokens the tokens of a parsed tree
 * @property {(text: string, options: MinifyOptions) => PreparedNodePrint} prepareNodePrint reads and mangles the one source the JavaScript `SourceProcessor` minifies
 * @property {(parsed: ParsedTree, stream: OutputStream, text: string, options: MangleOptions, mayNamePrivate: boolean, renames?: boolean) => TreeNames} mangleTree mangles a parsed tree, or only reads its scopes
 * @property {(parsed: ParsedTree, definitions: TreeDefinition[], quotedReserved: string[] | null, namesOf: (annotated: Set<string>) => PropertyNames) => { properties: PropertyNames, strings: Set<number> }} mangleTreeProperties chooses the names a parsed tree's properties are printed with
 * @property {(analysis: MinifierScopeAnalysis, options: MangleOptions, unprinted?: Set<MinifierVariable> | null, readsGone?: Map<TreeDefinition, number> | null) => void} mangleManglingScopes names the scopes' definitions
 * @property {(analysis: MinifierScopeAnalysis, declaredBy: (node: PrintNode) => string[]) => Set<string> | null} privateNamesReadByEval the private names `eval` may read
 */
/**
 * What the improve phase writes a string holding line breaks as a template
 * with, for a printer deciding once per source rather than per program.
 * @internal
 * @typedef {object} LineBreakTemplates
 * @property {(stream: OutputStream<PrintNode | number>, text: string) => boolean} writesLineBreaksRawIn whether the strings of a source write their line breaks raw
 * @property {(str: string) => boolean} writesTabsRaw whether a string writes its tabs raw
 * @property {(stream: OutputStream<PrintNode | number>, str: string, tabs: boolean) => string} lineBreakTemplate a string's value as a template literal, its line breaks raw
 */
/**
 * A value constant evaluation computes: a primitive, a regular expression,
 * an array or object of such values, or a function standing in for one.
 * @internal
 * @typedef {string | number | bigint | boolean | symbol | null | undefined | RegExp | EvaluatedArray | { [key: string]: EvaluatedValue } | ((...args: EvaluatedValue[]) => EvaluatedValue)} EvaluatedValue
 */
/**
 * An array of evaluated values, apart so that the JSDoc alias can recurse.
 * @internal
 * @typedef {EvaluatedValue[]} EvaluatedArray
 */
/** @typedef {import("./syntax-parser").NodeLike} NodeLike a node as webpack's parser builds one */
/** @typedef {import("./syntax-parser").SyntaxTree} SyntaxTree a tree as webpack's parser writes one */
/** @typedef {import("./syntax-parser").AnyNode} AnyNode any node webpack's parser builds */
/** @typedef {import("./syntax-parser").JavascriptSourceType} JavascriptSourceType which production of JavaScript a source is */
/** @typedef {import("./syntax-parser").ExportedNames} ExportedNames the names a module exported so far */
/** @typedef {import("./syntax-parser").ExpressionField} ExpressionField what an `expression` field holds, in whichever node has one */
/** @typedef {import("./syntax-parser").UnfinishedNode} UnfinishedNode a node webpack's parser has started but not finished */
/** @typedef {import("./syntax-parser").Statement} Statement a statement node */
/** @typedef {import("./syntax-parser").ModuleDeclaration} ModuleDeclaration an import or export declaration node */
/**
 * @template {import("./syntax-parser").AnyNodeType} T
 * @typedef {import("./syntax-parser").NodeOf<T>} NodeOf the node whose `type` is `T`
 */
/** @typedef {import("./ScopeAnalyzer").MinifierScope} MinifierScope a scope as the mangler reads it */
/** @typedef {import("./ScopeAnalyzer").MinifierVariable} MinifierVariable a definition as the mangler reads it */
/** @typedef {import("./ScopeAnalyzer").MinifierLabel} MinifierLabel a label as the mangler reads it */
/** @typedef {import("./ScopeAnalyzer").MinifierScopeAnalysis} MinifierScopeAnalysis the scopes the mangler names */
/** @typedef {import("./ScopeAnalyzer").TreeDefinition} TreeDefinition what a name in a `SyntaxTree` names, as the mangler reads it */
/** @typedef {import("./side-effects").SideEffectsContext} SideEffectsContext what a side-effects query asks of the printer */

/**
 * What a source is minified with. The keys the minifier reads are named; the
 * rest are open, so an option a caller passes through is not refused here.
 * @typedef {object} MinifyOptions
 * @property {boolean | GivenCompressOptions=} compress what the compressor does, or false to leave the tree as read
 * @property {boolean | GivenMangleOptions=} mangle which names are renamed, or false to keep them
 * @property {GivenFormatOptions=} format how the output is written
 * @property {GivenFormatOptions=} output the older spelling of `format`, which may not be named beside it
 * @property {DriverOptions["parse"]=} parse how the source is read
 * @property {boolean | GivenSourceMapOptions=} sourceMap whether a source map is written, and how
 * @property {boolean=} module whether the source is a module
 * @property {JavascriptSourceType=} sourceType which production the source is, `module` read from it where given
 * @property {number=} ecma which edition the output may use
 * @property {boolean=} toplevel whether top-level names may be renamed or dropped
 * @property {DriverOptions["nameCache"]=} nameCache names held across assets, which this writes into
 * @property {boolean | RegExp=} keep_classnames which class names survive
 * @property {boolean | RegExp=} keep_fnames which function names survive
 * @property {boolean=} ie8 whether the output works around that engine
 * @property {boolean=} safari10 whether the output works around that engine
 * @property {string | false=} wrap the global a CommonJS module is wrapped to write its exports to
 * @property {boolean | string=} enclose the function the source is enclosed in, as `parameters:arguments`
 */

/**
 * terser's `compress` options as a caller gives them: `global_defs` any object
 * of names, as terser declares it, and `pure_funcs` reading a call as terser's
 * tree holds it.
 * @typedef {Omit<Partial<CompressOptions>, "global_defs" | "pure_funcs"> & { global_defs?: false | EXPECTED_OBJECT, pure_funcs?: string[] | ((node: PureCallView) => boolean) | null }} GivenCompressOptions
 */
/** @typedef {NodeShape & { print_to_string(given?: Partial<FormatSettings>): string }} PureCallView a call as a `pure_funcs` function reads it: terser's fields and `print_to_string` */
/**
 * terser's `mangle` options as a caller gives them, `properties` true for the
 * defaults.
 * @typedef {Omit<Partial<DriverMangleOptions>, "properties"> & { properties?: boolean | GivenPropertyMangleOptions }} GivenMangleOptions
 */
/**
 * terser's `format` options as a caller gives them; `source_map` is left out,
 * as the minify writes it from `sourceMap`.
 * @typedef {Omit<DriverFormatOptions, "source_map">} GivenFormatOptions
 */
/**
 * terser's `sourceMap` options as a caller gives them, `content` a map object
 * of any source map library, its JSON or `"inline"`.
 * @typedef {Omit<Partial<DriverSourceMapOptions>, "content"> & { content?: DriverSourceMapOptions["content"] | EXPECTED_OBJECT }} GivenSourceMapOptions
 */

/** @typedef {Record<PropertyKey, EXPECTED_ANY>} SymbolDefinition one of terser's `SymbolDef`s */

// The helpers of terser's `utils/index.js` the phases call, ours, so a phase
// reads only terser's tree and the methods it replaces.

/**
 * terser's `DefaultsError`, what `defaults` throws for an option it does not know.
 */
class DefaultsError extends Error {
	/**
	 * @param {string} message what went wrong
	 * @param {object} defs the options known
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
 * @template {object} T
 * @param {object | boolean | null | undefined} given the options given: an object of them, true for all defaults, or something falsy for none
 * @param {T} defs the defaults
 * @param {boolean=} croak whether an option the defaults lack throws
 * @returns {T} the options
 */
const defaults = (given, defs, croak) => {
	/** @type {Record<string, T[keyof T] | number> | boolean | null | undefined} */
	let args =
		/** @type {Record<string, T[keyof T]> | boolean | null | undefined} */ (
			given
		);
	if (args === true) {
		args = {};
	} else if (args !== null && args !== undefined && typeof args === "object") {
		args = { ...args };
	}
	const options = /** @type {Record<string, T[keyof T] | number>} */ (
		args || {}
	);
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
			let ecma = /** @type {number} */ (args[key]) | 0;
			if (ecma > 5 && ecma < 2015) ecma += 2009;
			options[key] = ecma;
		} else {
			options[key] = args[key];
		}
	}
	return /** @type {T} */ (options);
};

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
 * terser's stable `mergeSort`, splitting and merging exactly as it does so an
 * inconsistent comparison still orders alike, but into one buffer.
 * @template T
 * @param {T[]} array a list
 * @param {(a: T, b: T) => number} compare the order
 * @returns {T[]} a sorted copy
 */
const mergeSort = (array, compare) => {
	const sorted = [...array];
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
 * @template V
 * @param {Record<string, V>} object what `mapToObject` wrote
 * @returns {Map<string, V>} the map it came from
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
 * @template V
 * @param {Map<string, V>} map a map
 * @returns {Record<string, V>} it as an object, each key after a `$`
 */
const mapToObject = (map) => {
	/** @type {Record<string, V>} */
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
 * Where mangled names come from: the name for each number, and, for a source
 * ordering its names by the characters printed, what counts them.
 * @typedef {object} IdentifierSource
 * @property {(n: number) => string} get the name for a number
 * @property {(() => void)=} reset forgets what was counted
 * @property {((chars: string, delta: number) => void)=} consider counts the characters of printed text
 * @property {(() => void)=} sort orders the names by what was counted
 */
/**
 * terser's mangle options, as `formatMangleOptions` defaults them; a key it
 * does not default is read as given.
 * @internal
 * @typedef {object} MangleOptions
 * @property {boolean} eval whether names a scope reading `eval` sees are mangled
 * @property {IdentifierSource} nth_identifier where mangled names come from
 * @property {boolean} ie8 whether the output works around that engine
 * @property {boolean | RegExp} keep_classnames which class names survive
 * @property {boolean | RegExp} keep_fnames which function names survive
 * @property {boolean} module whether the source is a module
 * @property {Set<string>} reserved the names never given
 * @property {boolean} toplevel whether top-level names are mangled
 * @property {boolean=} safari10 whether the output works around that engine
 * @property {{ props: Map<string, string> }=} cache the property names given so far, where names are cached
 * @property {(boolean | Partial<PropertyMangleOptions>)=} properties whether property names are mangled, and how
 */
/**
 * terser's `mangle.properties` options, as `propertyNames` defaults them.
 * @internal
 * @typedef {object} PropertyMangleOptions
 * @property {boolean} builtins whether names builtins have are mangled too
 * @property {{ props: Map<string, string> } | null} cache the names given so far, where names are cached
 * @property {boolean | string} debug false, or the suffix a debug name ends in
 * @property {boolean | "strict"} keep_quoted whether quoted names are kept
 * @property {IdentifierSource} nth_identifier where mangled names come from
 * @property {boolean} only_cache whether only cached names are mangled
 * @property {RegExp | string | null} regex which names are mangled
 * @property {string[]} reserved the names never mangled
 * @property {boolean} undeclared whether names read off undeclared globals are mangled
 * @property {boolean} only_annotated whether only names marked for mangling are mangled
 */
/** @typedef {{ source: string, flags: string }} RegExpValue a regular expression literal's value: its source and flags */

/**
 * terser's `format_mangler_options`: the mangle options, defaulted, their
 * reserved names a set that always holds `arguments`.
 * @param {MinifyOptions["mangle"] | Partial<MangleOptions> | DriverMangleOptions} given the mangle options given
 * @param {IdentifierSource} base54 the default source of mangled names
 * @returns {MangleOptions} the options
 */
const formatMangleOptions = (given, base54) => {
	const options = /** @type {MangleOptions} */ (
		/** @type {Omit<MangleOptions, "reserved"> & { reserved: string[] | Set<string> }} */ (
			defaults(given, {
				eval: false,
				nth_identifier: base54,
				ie8: false,
				keep_classnames: false,
				keep_fnames: false,
				module: false,
				reserved: [],
				toplevel: false
			})
		)
	);
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
 * One of terser's AST nodes: the fields and methods the phases share typed, the
 * rest open.
 * @typedef {{
 * TYPE: string,
 * type: string,
 * mapName: string | null | undefined,
 * shorthand: boolean,
 * _annotations: number,
 * name: string,
 * kind: string,
 * role: string,
 * computed: boolean,
 * label: NodeShape,
 * property: NodeShape,
 * flags: number,
 * startToken: Token,
 * endToken: Token,
 * expression: NodeShape,
 * callee: NodeShape,
 * object: NodeShape,
 * argument: NodeShape,
 * discriminant: NodeShape,
 * left: NodeShape,
 * right: NodeShape,
 * operator: string,
 * test: NodeShape,
 * alternate: NodeShape,
 * arguments: NodeShape[],
 * elements: (NodeShape | null)[],
 * properties: NodeShape[],
 * declarations: NodeShape[],
 * expressions: NodeShape[],
 * segments: NodeShape[],
 * params: NodeShape[],
 * quote: string | undefined,
 * raw: string | undefined,
 * optional: boolean,
 * tag: NodeShape,
 * superClass: NodeShape,
 * scope: NodeShape,
 * definition: SymbolDefinition,
 * fixed_value(): NodeShape | false | null | undefined,
 * tail_node(): NodeShape,
 * clone(deep?: boolean): NodeShape,
 * transform(walker: CompressorShape, inList?: boolean): NodeShape,
 * optimize(compressor: CompressorShape): NodeShape,
 * has_side_effects(compressor: CompressorShape): boolean,
 * may_throw(compressor: CompressorShape): boolean,
 * drop_side_effect_free(compressor: CompressorShape, firstInStatement?: boolean): NodeShape | null,
 * is_constant_expression(scope?: NodeShape): boolean | "f",
 * evaluate(compressor: CompressorShape): EvaluatedValue | NodeShape,
 * negate(compressor: CompressorShape, firstInStatement?: boolean): NodeShape,
 * size(compressor?: CompressorShape, stack?: NodeShape[]): number,
 * [key: string]: EXPECTED_ANY,
 * [key: symbol]: number,
 * }} NodeShape
 */
/**
 * The fields of one of terser's AST nodes: every field any kind has, a field
 * holding no node typed as the node the kinds having it hold.
 * @internal
 * @typedef {object} NodeFields
 * @property {string} type its ESTree type
 * @property {number} flags terser's bits on it: `_PURE`, `_INLINE`, `_NOINLINE`, `_KEY`, `_MANGLEPROP` and the compressor's
 * @property {NodeToken | number} startToken the token it starts at, or its number
 * @property {NodeToken | number} endToken the token it ends at, or its number
 * @property {number} _annotations a call's or a member's annotations
 * @property {string | null | undefined} mapName the name a member's source mapping carries where renaming set it
 * @property {string} name a symbol's or a literal's name
 * @property {string} kind a declaration's, property's or method's kind
 * @property {string} role what a node of a shared ESTree type is to terser
 * @property {string} operator a unary, update, binary, logical or assignment operator
 * @property {string | undefined} quote the quote a key or a string had
 * @property {string | undefined} raw a literal's or a template element's source
 * @property {string} directive a directive's text
 * @property {string | null | undefined} phase an import's phase
 * @property {boolean} atom whether a name is printed as a constant
 * @property {boolean} computed whether a key or a property is computed
 * @property {boolean} shorthand whether a property is written as its name alone
 * @property {boolean} optional whether a call or a property read is optional
 * @property {boolean} async whether a function is async
 * @property {boolean} generator whether a function is a generator
 * @property {boolean} static whether a class member is static
 * @property {boolean} method whether a property is a method
 * @property {boolean} prefix whether a unary or an update operator comes first
 * @property {boolean} delegate whether a `yield` is a `yield*`
 * @property {boolean} await whether a loop or a declaration awaits
 * @property {boolean} is_array whether a destructuring is an array pattern
 * @property {boolean} is_default whether an export is the default one
 * @property {boolean} logical whether an assignment is a logical one
 * @property {Node} label a labeled statement's label, or the label a `break` or `continue` names
 * @property {Node} property a property read's property
 * @property {Node} expression a statement's or a chain's expression
 * @property {Node} callee a call's callee
 * @property {Node} object a property read's object, or a `with`'s
 * @property {Node} argument an operand, or a `return`'s, `throw`'s, `await`'s, `yield`'s, spread's or rest's value
 * @property {Node} discriminant a `switch`'s value
 * @property {Node} left a binary's or an assignment's left side, or a `for`-`in` or `for`-`of`'s binding
 * @property {Node} right a binary's or an assignment's right side, or what a `for`-`in` or `for`-`of` iterates
 * @property {Node} test a condition
 * @property {Node} alternate an `if`'s or a conditional's alternate
 * @property {Node | Node[]} consequent an `if`'s or a conditional's consequent, or a `case`'s statements
 * @property {Node | Node[]} body a block's statements, or a loop's, label's or function's body
 * @property {Node} tag a tagged template's tag
 * @property {Node} quasi a tagged template's template
 * @property {Node} superClass the class a class extends
 * @property {Node} id a function's, class's or declarator's name
 * @property {Node} init a declarator's or a `for`'s initializer, or the value a name is declared with
 * @property {Node} update a `for`'s update
 * @property {Node} block a `try`'s block
 * @property {Node} handler a `try`'s `catch`
 * @property {Node} finalizer a `try`'s `finally`
 * @property {Node} param a `catch`'s binding
 * @property {Node} key a member's key
 * @property {Node | string | number | boolean | RegExpValue | null} value a member's value, a literal's or a constant name's value, or a template element's cooked text
 * @property {Node} source an import's or an export's source
 * @property {Node} attributes an import's or an export's attributes
 * @property {Node} imported_name an import's default binding
 * @property {Node} local a name mapping's local name
 * @property {Node} imported a name mapping's imported name
 * @property {Node} exported a name mapping's exported name
 * @property {Node} exported_value what a default export exports
 * @property {Node} exported_definition the declaration an export exports
 * @property {Node[]} arguments a call's arguments
 * @property {(Node | null)[]} elements an array's elements, null for a hole
 * @property {Node[]} properties an object's properties
 * @property {Node[]} declarations a declaration's declarators
 * @property {Node[]} expressions a sequence's expressions
 * @property {Node[]} segments a template's texts and expressions in order
 * @property {Node[]} params a function's parameters
 * @property {Node[]} cases a `switch`'s cases
 * @property {Node[]} args a dynamic import's source and options
 * @property {Node[]} imported_names an import's named bindings
 * @property {Node[]} exported_names an export's names
 * @property {Node[]} references a symbol's or a label's reads
 * @property {Node | (() => Node) | false | null | undefined} fixed the value a symbol reads, as `reduce_vars` worked it out, false where unknown
 * @property {TokenTables | null} tokenTables the program's tables its token numbers are read through
 */
/**
 * One of terser's AST nodes, as the phases read and write it: its fields, and
 * the kind bits its kind's prototype holds under keys of their own. A key
 * holding another value, a walk or a method a phase dispatches on the kind, is
 * read through a cast.
 * @internal
 * @typedef {NodeFields & { [key: symbol]: number }} Node
 */
/** @typedef {import("./side-effects").PrimitiveKind} PrimitiveKind the primitive an expression yields, undefined where unknown */

/** @typedef {(value: unknown) => boolean} NodeTest whether a value is a node of one kind, or of a kind one of it */

/** @typedef {NodeToken} Token one of terser's tokens */
/**
 * One of terser's tokens, a `ParsedToken` or a `SourceToken`, as the phases
 * and the stream read it.
 * @internal
 * @typedef {object} NodeToken
 * @property {string} type terser's name for its kind
 * @property {string} value what it holds
 * @property {number} line its line, from 1
 * @property {number} col its column, from 0
 * @property {number} pos its offset
 * @property {string | null | undefined} file its file
 * @property {boolean} nlb whether a line break comes before it
 * @property {Comment[]} comments_before the comments before it
 * @property {Comment[]} comments_after the comments after it
 * @property {number | null=} endpos the offset it ends at, where terser's own parser read it
 * @property {number | null=} endline the line it ends on, where terser's own parser read it
 * @property {number | null=} endcol the column it ends at, where terser's own parser read it
 */
/** @typedef {{ type: string, value: string, nlb?: boolean }} Comment a comment terser's tokenizer read */
/** @typedef {FormatSettings} FormatOptions terser's `format` options, defaulted */
/**
 * The node a `comments` callback reads a comment off, published as terser
 * types it, as any node.
 * @internal
 * @typedef {PrintNode} CommentedNode
 */
/** @typedef {{ type: "comment1" | "comment2" | "comment3" | "comment4", value: string, pos: number, line: number, col: number, file?: string }} KeptComment a comment as a `comments` callback is handed it: terser's comment token, its offset, line from 1 and column from 0, and the file it was read from */
/** @typedef {(this: PrintNode, comment: Comment) => boolean} CommentFilter which comments are printed, `this` the node they are read off */
/**
 * What `prepend_comments` prints before a node, taken as printed already.
 * @typedef {object} PrependComments
 * @property {Comment[]} comments the comments, in order
 * @property {boolean} lineBroken whether a line break precedes the node's first token
 * @property {string | undefined} shebang the `#!` line's text, printed first
 * @property {boolean} preamble whether the `preamble` prints, before the comments
 */
/**
 * What `append_comments` prints after a node, taken as printed already.
 * @typedef {object} AppendComments
 * @property {Comment[]} comments the comments, in order
 * @property {number[]} places each one's place among the kept comments of its list, which a comment printed already holds too
 * @property {boolean} tail whether they are inside an empty body
 */
/**
 * What the output stream reads off a node for comments, an ESTree node or a
 * parsed tree's node by its index: the tokens it starts and ends at, a value
 * no line break may precede, the child the comment walk continues into below a
 * node on such a value's leftmost edge, and whether it is a statement.
 * @template [N=PrintNode]
 * @typedef {{ startToken(node: N): NodeToken | number | null | undefined, endToken(node: N): NodeToken | number | null | undefined, keywordValue(node: N): N | null | undefined, leftEdgeChild(node: N): N | null | undefined, isStatement(node: N): boolean }} NodeAccess
 */

// The `format` options terser's stream reads, each with its default. A terser
// naming any other set keeps its own stream, since an option this does not
// know would be silently ignored.
/** @type {FormatOptions} */
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
	_destroy_ast: false,
	_function_body: false
};

// Where terser's stream moves what it wrote into one string, so reading back
// from the end never flattens more than this many characters.
const COMMIT_AFTER = 8000;

// The bytes giving the busiest names the shortest must save before the
// mangler does: below it, renaming costs gzip more than it saves.
const SHORTER_NAMES_MIN_SAVING = 200;

// The delimiters oxc picks among, frequent enough in code to gzip small.
const SPLIT_DELIMITERS = [".", ",", "(", ")", " "];
// Below this a split gzips worse often enough to lose: oxc's 26 left 28 of
// 69 test262 sources bigger, 60 react-dom and yui; 100 none of 21 bundles.
const SPLIT_MIN_ELEMENTS = 100;

const ANNOTATION = /[@#]__(PURE|INLINE|NOINLINE)__/;
const ONLY_ANNOTATION = /^\s*[@#]__(PURE|INLINE|NOINLINE)__\s*$/;
// The comments `comments: "some"` keeps: a license, a copyright, `@preserve`.
const IMPORTANT_COMMENT = /@preserve|@copyright|@lic|@cc_on|^\**!/i;

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
 * @param {FormatSettings} options defaulted format options
 * @returns {FormatSettings} the same, each layout option at its default
 */
const minifiedOptions = (options) => {
	for (const name of IGNORED_FORMAT_OPTIONS) {
		/** @type {Record<string, FormatSettingValue>} */ (options)[name] =
			/** @type {Record<string, FormatSettingValue>} */ (FORMAT_DEFAULTS)[name];
	}
	return options;
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
 * @returns {{ getFullChar: (str: string, pos: number) => string, getFullCharCode: (str: string, pos: number) => number, isBasicIdentifier: (str: string) => boolean, isIdentifierStart: (character: string) => boolean, isIdentifierChar: (character: string) => boolean, isIdentifierStartBroad: (character: string) => boolean, isIdentifierCharBroad: (character: string) => boolean, isIdentifierCharacter: (character: string) => boolean, isIdentifierString: (str: string, allowSurrogates?: boolean) => boolean }} the helpers
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
		isIdentifierCharacter: (character) => {
			if (character.length === 1) {
				const code = character.charCodeAt(0);
				if (code < 128) return ASCII_IDENTIFIER[code] === 1;
			}
			return broadPart.test(character);
		},
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

// The ESTree types of terser's statement classes, its functions, classes,
// switch cases and catch clauses among them.
const ESTREE_STATEMENT_TYPES = new Set([
	"Program",
	"ExpressionStatement",
	"BlockStatement",
	"EmptyStatement",
	"DebuggerStatement",
	"LabeledStatement",
	"DoWhileStatement",
	"WhileStatement",
	"ForStatement",
	"ForInStatement",
	"ForOfStatement",
	"WithStatement",
	"ReturnStatement",
	"ThrowStatement",
	"BreakStatement",
	"ContinueStatement",
	"IfStatement",
	"SwitchStatement",
	"SwitchCase",
	"TryStatement",
	"CatchClause",
	"VariableDeclaration",
	"ExportNamedDeclaration",
	"ExportAllDeclaration",
	"ExportDefaultDeclaration",
	"FunctionDeclaration",
	"FunctionExpression",
	"ArrowFunctionExpression",
	"ClassDeclaration",
	"ClassExpression",
	"StaticBlock"
]);

/**
 * What the output stream reads off the compressed tree, by ESTree type, each
 * answer the one terser's accessors gave.
 * @type {NodeAccess}
 */
const ESTREE_NODE_ACCESS = {
	startToken: (node) => node.startToken,
	endToken: (node) => node.endToken,
	keywordValue: (node) => {
		switch (node.type) {
			case "ReturnStatement":
			case "ThrowStatement":
			case "AwaitExpression":
			case "YieldExpression":
				return node.argument || undefined;
			default:
				return undefined;
		}
	},
	leftEdgeChild: (parent) => {
		switch (parent.type) {
			case "AwaitExpression":
			case "YieldExpression":
				return parent.argument;
			case "UpdateExpression":
				return parent.prefix ? undefined : parent.argument;
			case "BinaryExpression":
				// terser's `#x in y` is no Binary.
				return parent.left.type === "PrivateIdentifier"
					? undefined
					: parent.left;
			case "LogicalExpression":
			case "AssignmentExpression":
				return parent.left;
			case "CallExpression":
				return parent.callee;
			case "ConditionalExpression":
				return parent.test;
			case "MemberExpression":
				return parent.property.type === "PrivateIdentifier"
					? undefined
					: parent.object;
			case "SequenceExpression":
				return parent.expressions[0];
			default:
				return undefined;
		}
	},
	isStatement: (node) => ESTREE_STATEMENT_TYPES.has(node.type)
};

/**
 * webpack's stream for minified output, answering terser's code generators
 * through the same members terser's own `OutputStream` does and writing the
 * same bytes. It writes no layout, so it never breaks a line behind itself.
 * @returns {new (options: FormatSettings, readonly: boolean, nodeAccess: NodeAccess) => OutputStream} the stream class
 */
const createMinifiedOutput = () => {
	const {
		getFullChar,
		getFullCharCode,
		isBasicIdentifier,
		isIdentifierChar,
		isIdentifierCharBroad,
		isIdentifierCharacter,
		isIdentifierStart,
		isIdentifierStartBroad
	} = createUnicode();

	/**
	 * @param {PrintNode | null | undefined} value a returned, awaited or yielded value
	 * @param {Set<Comment | Comment[]>} printed the comments and comment lists printed so far
	 * @param {NodeAccess} nodeAccess what is read off the value's nodes
	 * @param {TokenTables} tables what their tokens' numbers are read through
	 * @returns {boolean} whether its leftmost edge holds comments not yet printed
	 */
	const leftEdgeComments = (value, printed, nodeAccess, tables) => {
		for (let inner = value; inner; inner = nodeAccess.leftEdgeChild(inner)) {
			const text = tables.commentsOf(nodeAccess.startToken(inner), false);
			if (text && text.length !== 0 && !printed.has(text)) return true;
		}
		return false;
	};

	// An identifier terser may have to escape. It also requires a character
	// past U+00FF, which the caller checks before asking.
	const HIGH_IDENTIFIER = /^\p{ID_Start}\p{ID_Continue}*$/u;

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
	 * @param {FormatSettings} options defaulted format options
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
					return (
						comment.type !== "comment5" &&
						callback(this, /** @type {KeptComment} */ (comment))
					);
				};
			} else if (comments === "some") {
				filter = (comment) =>
					(comment.type === "comment2" || comment.type === "comment1") &&
					IMPORTANT_COMMENT.test(comment.value);
			} else {
				filter = () => true;
			}
		}
		if (options.preserve_annotations) {
			const previous = filter;
			filter = function filter(comment) {
				// An annotation alone: terser keeps any comment naming one, prose included.
				return (
					ONLY_ANNOTATION.test(comment.value) || previous.call(this, comment)
				);
			};
		}
		return filter;
	};

	// What `prepend_comments` keeps of a list where nothing in it prints.
	/** @type {Comment[]} */
	const NO_KEPT_COMMENTS = [];

	class MinifiedOutput {
		/**
		 * @param {FormatSettings} options defaulted format options
		 * @param {boolean} readonly true when printed for its text alone, which drops every comment
		 * @param {NodeAccess} nodeAccess what comments are read off the printed nodes with
		 */
		constructor(options, readonly, nodeAccess) {
			this.options = options;
			this.readonly = readonly;
			this.nodeAccess = nodeAccess;
			this.commentFilter = commentFilterFor(options);
			this.appendsComments =
				!readonly && Boolean(options.comments || options.preserve_annotations);
			this.sourceMap = options.source_map;

			/** @type {string[]} */
			this.parts = [];
			this.partsLength = 0;
			this.current = "";
			/**
			 * Where set, takes the parts before the last two in batches, which
			 * then no longer read back, so text read once is never held whole.
			 * @type {((part: string) => void) | undefined}
			 */
			this.consumePart = undefined;
			// Whether a comment, shebang or preamble was written: text terser's
			// `print_to_string` leaves out.
			this.wroteComments = false;

			this.currentColumn = 0;
			this.currentLine = 1;
			this.currentPosition = 0;
			this.hasParentheses = false;
			this.mightNeedSpace = false;
			this.mightNeedSemicolon = false;
			this.needNewlineIndented = false;
			this.needSpace = false;
			this.lastPrinted = "";
			/** @type {NodeToken | number | false | null | undefined} */
			this.mappingToken = false;
			// What the printed tree's token numbers are read through.
			/** @type {TokenTables} */
			this.tokenTables = NO_TOKEN_TABLES;
			/** @type {string | false | undefined} */
			this.mappingName = undefined;
			/** @type {PrintNode[]} */
			this.stack = [];

			this.in_directive = false;
			/** @type {PrintNode | null} */
			this.use_asm = null;
			/** @type {PrintNode | null} */
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
							/**
							 * Escapes a lone surrogate.
							 * @param {string} match a surrogate pair, or a lone surrogate
							 * @param {string | undefined} lone the lone surrogate
							 * @returns {string} the pair, or the lone surrogate escaped
							 */
							(match, lone) =>
								lone ? `\\u${lone.charCodeAt(0).toString(16)}` : match
						);
					};
			this.identifierToUtf8 = asciiOnly
				? this.to_utf8
				: /** @type {(str: string) => string} */ (str) => {
						// A lone surrogate is no identifier character, so none is left here.
						if (isPlain(str, 0x100) || !HIGH_IDENTIFIER.test(str)) {
							return str;
						}
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
					/**
					 * Escapes one character.
					 * @param {string} character the character
					 * @param {number} i its offset in the string
					 * @returns {string} its escape
					 */
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
				// Joined in batches, as reading a flat string is far quicker than
				// reading the concatenations a part is.
				if (this.consumePart !== undefined && this.parts.length > 34) {
					this.consumePart(this.parts.splice(0, 32).join(""));
				}
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
		 * Ends a program with the semicolon its last statement owes, which a
		 * function's body leaves to the brace closing it, as `print` does before
		 * a `}` other than one closing a label.
		 * @returns {void}
		 */
		endProgram() {
			if (this.options._function_body && !this.lastPrinted.endsWith(":")) {
				this.mightNeedSemicolon = false;
			}
			this.print("");
		}

		/**
		 * @param {string | number} value what to print, read as a string
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
		 * @param {NodeToken | number} token the token the next text maps back to, or its number
		 * @param {string | false | undefined} name the name it carries, or false for none
		 * @returns {void}
		 */
		addMapping(token, name) {
			try {
				token = /** @type {NodeToken} */ (this.tokenTables.of(token));
				if (
					name !== false &&
					(token.type === "name" || token.type === "privatename")
				) {
					name = token.value;
				}
				/** @type {SourceMapBuilder} */ (this.sourceMap).add(
					/** @type {string} */ (token.file),
					this.currentLine,
					this.currentColumn,
					token.line,
					token.col,
					isBasicIdentifier(/** @type {string} */ (name))
						? /** @type {string} */ (name)
						: undefined
				);
			} catch (_err) {
				// terser ignores a mapping it cannot add
			}
		}

		/**
		 * @param {NodeToken | number | null | undefined} token the token the next text maps back to, or its number, none for a node the compressor made
		 * @param {(string | false)=} name the name it carries
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
		 * @returns {number | boolean} truthy once the line reaches `width`
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
		 * @param {string} name an identifier
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
		 * @param {number} column ignored, as minified output does not indent
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
		 * @template {keyof FormatSettings} K
		 * @param {K} name a format option
		 * @returns {FormatSettings[K]} its value
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
			/** @type {Node[]} */ (/** @type {Node} */ (scope.body).body).length = 0;
			scope.params.length = 0;
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
		 * @param {PrintNode} node the node about to be printed
		 * @returns {void}
		 */
		prepend_comments(node) {
			const comments = this.claimPrependComments(node);
			if (comments !== undefined) this.printPrependComments(comments);
		}

		/**
		 * @returns {boolean} whether nothing is printed yet
		 */
		atStart() {
			return this.currentPosition === 0;
		}

		/**
		 * The first half of `prepend_comments`: takes the comments before a node
		 * as printed, and answers what prints of them, which the second half
		 * prints where the node starts.
		 * @param {PrintNode} node the node about to be printed
		 * @param {boolean=} valueOnly whether the node holding a keyword takes the comments before it, leaving it those of its value
		 * @returns {PrependComments | undefined} what prints, undefined for nothing
		 */
		claimPrependComments(node, valueOnly) {
			if (this.readonly) return;
			const { nodeAccess } = this;
			const start = nodeAccess.startToken(node);
			if (!start) return;
			// There cannot be a newline between return/yield and its value.
			const keywordWithValue = nodeAccess.keywordValue(node);
			const tables = this.tokenTables;
			const before = valueOnly ? undefined : tables.commentsOf(start, false);
			const atStart = this.atStart();
			// WHY: terser records every token's comment list as printed, one Set
			// entry per token. An empty list prints nothing and no reader tells it
			// apart from an unrecorded one; only the start of output reads more.
			if (
				!keywordWithValue &&
				!atStart &&
				before !== undefined &&
				before.length === 0
			) {
				return;
			}
			const printed = this.printed_comments;
			// The same holds for a keyword's value: where neither the keyword nor
			// the value's leftmost edge has comments left to print, none is made.
			if (
				keywordWithValue &&
				!atStart &&
				(before === undefined || before.length === 0 || printed.has(before)) &&
				!leftEdgeComments(keywordWithValue, printed, nodeAccess, tables)
			) {
				return;
			}
			const startToken = tables.of(start);
			if (!startToken) return;
			// Nothing is printed at the start, but a list empty everywhere may be
			// one shared list, which a print in pieces takes before the start.
			if (before && printed.has(before) && !(atStart && before.length === 0)) {
				if (!keywordWithValue) return;
				startToken.comments_before = [];
			}
			/** @type {Comment[]} */
			let comments = valueOnly ? [] : startToken.comments_before;
			if (!comments) comments = startToken.comments_before = [];
			printed.add(comments);

			// terser walks the value's leftmost edge for comments a line break
			// there would move after the keyword; one child per node is on it.
			for (
				let inner = keywordWithValue;
				inner;
				inner = nodeAccess.leftEdgeChild(inner)
			) {
				const text = tables.commentsOf(nodeAccess.startToken(inner), false);
				if (text && !printed.has(text)) {
					printed.add(text);
					comments = [...comments, ...text];
				}
			}

			/** @type {string | undefined} */
			let shebang;
			if (
				atStart &&
				comments.length > 0 &&
				this.options.shebang &&
				comments[0].type === "comment5" &&
				!printed.has(comments[0])
			) {
				shebang = /** @type {Comment} */ (comments.shift()).value;
			}

			// Most lists print nothing, so a list is made only for what prints.
			/** @type {Comment[]} */
			let kept = NO_KEPT_COMMENTS;
			for (let i = 0; i < comments.length; i++) {
				const comment = comments[i];
				if (this.commentFilter.call(node, comment) && !printed.has(comment)) {
					if (kept === NO_KEPT_COMMENTS) kept = [];
					kept.push(comment);
				}
			}
			for (let i = 0; i < kept.length; i++) printed.add(kept[i]);
			if (!atStart && kept === NO_KEPT_COMMENTS) return;
			return {
				comments: kept,
				lineBroken: Boolean(startToken.nlb),
				shebang,
				preamble: atStart
			};
		}

		/**
		 * The second half of `prepend_comments`: prints what the first took.
		 * @param {PrependComments} taken what prints
		 * @returns {void}
		 */
		printPrependComments(taken) {
			if (taken.shebang !== undefined) {
				this.wroteComments = true;
				this.print(`#!${taken.shebang}\n`);
			}
			if (taken.preamble) {
				const { preamble } = this.options;
				if (preamble) {
					this.wroteComments = true;
					this.print(preamble.replace(/\r\n?|[\n\u2028\u2029]|\s*$/g, "\n"));
				}
			}
			const { comments } = taken;
			if (comments.length === 0) return;
			this.wroteComments = true;
			let lastNlb = this.hasNLB();
			let brokeLine = false;
			for (let i = 0; i < comments.length; i++) {
				const comment = comments[i];
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
					brokeLine = value.includes("\n");
				}
			}
			if (!lastNlb) {
				// A comment holding a break is read back as breaking the line after it.
				if (taken.lineBroken || brokeLine) {
					this.print("\n");
				} else {
					this.mightNeedSpace = true;
				}
			}
		}

		/**
		 * @param {PrintNode} node the node just printed
		 * @param {boolean=} tail true for the comments inside an empty body
		 * @returns {void}
		 */
		append_comments(node, tail) {
			const comments = this.claimAppendComments(node, tail);
			if (comments !== undefined) this.printAppendComments(comments);
		}

		/**
		 * The first half of `append_comments`: takes the comments after a node
		 * as printed, and answers what prints of them.
		 * @param {PrintNode} node the node just printed
		 * @param {boolean=} tail true for the comments inside an empty body
		 * @returns {AppendComments | undefined} what prints, undefined for nothing
		 */
		claimAppendComments(node, tail) {
			if (!this.appendsComments) return;
			const token = this.nodeAccess.endToken(node);
			if (!token) return;
			const printed = this.printed_comments;
			/** @type {Comment[] | undefined} */
			const comments = this.tokenTables.commentsOf(token, !tail);
			if (!comments || comments.length === 0 || printed.has(comments)) return;
			if (!this.nodeAccess.isStatement(node)) {
				for (let i = 0; i < comments.length; i++) {
					if (/comment[134]/.test(comments[i].type)) return;
				}
			}
			printed.add(comments);
			/** @type {AppendComments | undefined} */
			let taken;
			// Each kept comment's place among those kept, which says how it is spaced.
			let place = 0;
			for (let i = 0; i < comments.length; i++) {
				const comment = comments[i];
				if (!this.commentFilter.call(node, comment)) continue;
				if (!printed.has(comment)) {
					printed.add(comment);
					if (taken === undefined) {
						taken = { comments: [], places: [], tail: Boolean(tail) };
					}
					taken.comments.push(comment);
					taken.places.push(place);
				}
				place++;
			}
			return taken;
		}

		/**
		 * The second half of `append_comments`: prints what the first took.
		 * @param {AppendComments} taken what prints
		 * @returns {void}
		 */
		printAppendComments(taken) {
			const { comments, places, tail } = taken;
			this.wroteComments = true;
			for (let i = 0; i < comments.length; i++) {
				const comment = comments[i];
				const place = places[i];
				this.needSpace = false;
				if (this.needNewlineIndented) {
					this.print("\n");
					this.needNewlineIndented = false;
				} else if (comment.nlb && (place > 0 || !this.hasNLB())) {
					this.print("\n");
				} else if (place > 0 || !tail) {
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
		 * @param {PrintNode} node the node being printed
		 * @returns {void}
		 */
		push_node(node) {
			this.stack.push(node);
		}

		/**
		 * @returns {PrintNode} the node done printing
		 */
		pop_node() {
			return /** @type {PrintNode} */ (this.stack.pop());
		}

		/**
		 * @param {number=} n how many levels further out
		 * @returns {PrintNode | undefined} the node holding the one being printed
		 */
		parent(n) {
			return this.stack[this.stack.length - 2 - (n || 0)];
		}
	}

	return MinifiedOutput;
};

/**
 * Installs webpack's stream for minified output, which the node printer's
 * stream extends.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installOutput = (modules) => {
	// Shared with the phases after this one, which print into it.
	modules.MinifiedOutput = createMinifiedOutput();
};

/**
 * @typedef {object} SourceMapBuilder
 * @property {(source: string, generatedLine: number, generatedColumn: number, originalLine: number, originalColumn: number, name: string | undefined) => void} add records one mapping
 * @property {(generatedLine: number, columns: number[], deltas: number[]) => void} shiftColumns moves a line's mappings past each column, in order, by its delta, as text there changed length; a column of `n - 0.5` moves the mapping at `n` too
 * @property {() => BuiltSourceMap} getDecoded the map, decoded
 * @property {() => EncodedSourceMap} getEncoded the map, encoded
 * @property {() => void} destroy frees the input's map
 */

/** @typedef {import("../util/createMappings").DecodedSegment} DecodedSegment */
/** @typedef {import("webpack-sources").RawSourceMap} RawSourceMap */
/** @typedef {Omit<RawSourceMap, "mappings"> & { mappings: DecodedSegment[][] }} DecodedSourceMap */
/** @typedef {{ version: number, file?: string, sections: { offset: { line: number, column: number }, map: string | RawSourceMap | DecodedSourceMap | IndexSourceMap }[] }} IndexSourceMap a map made of sections, each a map of its own, or its JSON */
/**
 * The map a minify writes, its mappings decoded, less the keys that say nothing.
 * @typedef {{ version: number, file?: string, names: string[], sourceRoot?: string, sources: string[], sourcesContent?: (string | null | undefined)[], mappings: DecodedSegment[][], ignoreList: number[] }} BuiltSourceMap
 */
/** @typedef {Omit<BuiltSourceMap, "mappings"> & { mappings: string }} EncodedSourceMap the map a minify writes, its mappings encoded */

/**
 * What property mangling asks of its options, as both of its walks read it.
 * @typedef {object} PropertyNames
 * @property {(name: string) => void} add records a name a walk finds, before any is renamed
 * @property {(name: string) => string} mangle the name a property is renamed to, itself where kept
 * @property {boolean} keepQuoted whether a name written quoted is kept
 * @property {boolean} undeclared whether a name read off an undeclared global is found too
 * @property {{ get: (index: number) => string }} identifiers the identifier source it names from
 */

/**
 * terser's `mangle_properties` options, read into what the property mangler
 * asks. It builds the builtin names a property keeps once.
 * @param {TerserModules} modules terser's modules, with `domprops` among them
 * @returns {(given: GivenPropertyMangleOptions, annotatedNames: Set<string>) => PropertyNames} what reads the options
 */
const createPropertyMangler = (modules) => {
	const { domprops } = modules;
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
		// A global some engines lack adds no names: terser's empty function adds
		// only `length`, `name`, `prototype` and `constructor`, which `Object` has.
		const optional = (/** @type {string} */ name) =>
			/** @type {Record<string, { prototype?: EXPECTED_OBJECT } | undefined>} */ (
				/** @type {typeof globalThis | Record<string, { prototype?: EXPECTED_OBJECT } | undefined>} */ (
					global
				)
			)[name] || {};
		for (const ctor of /** @type {{ prototype?: EXPECTED_OBJECT }[]} */ ([
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
		])) {
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
	 * terser's `mangle_properties` options read into what both of its walks
	 * ask: which names a walk finds, and what each is renamed to.
	 * @param {GivenPropertyMangleOptions} given the `mangle.properties` options
	 * @param {Set<string>} annotatedNames the names marked for mangling
	 * @returns {PropertyNames} the names
	 */
	const propertyNames = (given, annotatedNames) => {
		const options = /** @type {PropertyMangleOptions} */ (
			/** @type {Omit<PropertyMangleOptions, "reserved"> & { reserved: string[] | string | null }} */ (
				defaults(
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
				)
			)
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
		const handedOut = new Set(cache.values());
		for (const mangled of handedOut) unmangleable.add(mangled);
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
			if (canMangle(name)) {
				toMangle.add(name);
			} else if (
				handedOut.has(name) &&
				!reserved.has(name) &&
				!options.only_cache
			) {
				// A name the cache hands another property is renamed too, or the two collide.
				toMangle.add(name);
			}
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
					} while (!canMangle(mangled));
				}
				cache.set(name, mangled);
			}
			return mangled;
		};
		return {
			add,
			mangle,
			keepQuoted,
			undeclared: Boolean(options.undeclared),
			identifiers
		};
	};

	return propertyNames;
};

/**
 * Names held across minifies, which a minify reads as a map and writes back
 * as an object.
 * @internal
 * @typedef {{ props?: Map<string, string> | Record<string, string> }} NameCacheEntry
 */
/**
 * terser's `mangle.properties` options, as given.
 * @internal
 * @typedef {Omit<Partial<PropertyMangleOptions>, "cache"> & { cache?: NameCacheEntry | null }} GivenPropertyMangleOptions
 */
/**
 * terser's `mangle` options, as terser's `minify` defaults them.
 * @internal
 * @typedef {object} DriverMangleOptions
 * @property {NameCacheEntry | null} cache the names given so far, where names are cached
 * @property {boolean} eval whether names a scope reading `eval` sees are mangled
 * @property {boolean} ie8 whether the output works around that engine
 * @property {boolean | RegExp} keep_classnames which class names survive
 * @property {boolean | RegExp} keep_fnames which function names survive
 * @property {boolean} module whether the source is a module
 * @property {IdentifierSource} nth_identifier where mangled names come from
 * @property {false | GivenPropertyMangleOptions} properties how property names are mangled, false where they are kept
 * @property {string[]} reserved the names never given
 * @property {boolean} safari10 whether the output works around that engine
 * @property {boolean} toplevel whether top-level names are mangled
 */
/**
 * terser's `sourceMap` options, as terser's `minify` defaults them.
 * @internal
 * @typedef {object} DriverSourceMapOptions
 * @property {boolean} asObject whether `map` is answered as an object rather than as JSON
 * @property {string | RawSourceMap | DecodedSourceMap | IndexSourceMap | null} content the input's map or its JSON, `"inline"` for the one the source ends in
 * @property {string | null} filename the minified file's name
 * @property {boolean} includeSources whether the map holds the sources' content
 * @property {string | null} root the sources' root
 * @property {string | null} url where the code says its map is, `"inline"` for the map itself
 */
/**
 * terser's `format` options as given, and the keys asking for a tree back.
 * @internal
 * @typedef {Partial<FormatSettings> & { ast?: boolean, code?: boolean, spidermonkey?: boolean }} DriverFormatOptions
 */
/**
 * terser's `minify` options, as terser's `minify` defaults them before it
 * reads them.
 * @internal
 * @typedef {object} DriverOptions
 * @property {boolean | Partial<CompressOptions>} compress what the compressor does, or false to leave the tree as read
 * @property {number | undefined} ecma which edition the output may use
 * @property {boolean | string} enclose the parameters and arguments of a function the code is wrapped in, false for none
 * @property {boolean} ie8 whether the output works around that engine
 * @property {boolean | RegExp | undefined} keep_classnames which class names survive
 * @property {boolean | RegExp} keep_fnames which function names survive
 * @property {false | DriverMangleOptions} mangle which names are renamed, false to keep them
 * @property {boolean} module whether the source is a module
 * @property {{ vars?: NameCacheEntry, props?: NameCacheEntry } | null} nameCache names held across minifies, which this writes into
 * @property {DriverFormatOptions | null} output the older spelling of `format`
 * @property {DriverFormatOptions} format how the output is written, `output` where only it was given
 * @property {ParseOptions & { spidermonkey?: boolean }} parse how the source is read, the tree read written into it
 * @property {boolean | DriverMangleOptions | undefined} rename whether names are renamed
 * @property {boolean} safari10 whether the output works around that engine
 * @property {false | DriverSourceMapOptions} sourceMap how a source map is written, false for none
 * @property {JavascriptSourceType | undefined} sourceType which production the source is: a module, a script, or a function's body, a CommonJS module's or an event handler's
 * @property {boolean} spidermonkey whether the sources are ESTree trees
 * @property {boolean} timings whether how long each step took is answered
 * @property {boolean} toplevel whether top-level names may be renamed or dropped
 * @property {boolean | "verbose"} warnings whether warnings are reported
 * @property {string | false} wrap the name the code is wrapped as a CommonJS module under, false for none
 */
/**
 * @internal
 * @typedef {Record<string, DriverOptions[keyof DriverOptions]>} DriverOptionGroup the options, or one group of them, read by name
 */

/**
 * The one source a minify read for the JavaScript `SourceProcessor` to print,
 * compressing as it prints.
 * @typedef {object} PreparedNodePrint
 * @property {ParsedTree} parsed the source, parsed
 * @property {string} text the source
 * @property {DriverFormatOptions} format the format options, defaulted
 * @property {number} leadingToken where only the comments before its first token are kept, that token, else 0
 * @property {TreeNames | null} names the scopes read and the names mangling gave, null where it is neither compressed nor mangled
 * @property {Partial<CompressOptions> | null} compress the compress options, null where it is not compressed
 * @property {(() => void)=} finish what writes back what the print found, run once it is printed
 */

/**
 * Installs what reads, and where asked mangles, the one source the JavaScript
 * `SourceProcessor` minifies, as terser's driver reads its options.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installMinify = (modules) => {
	const { parse: parseModule, output } = modules;
	const propertyNames = createPropertyMangler(modules);
	const { base54 } = modules.scope;

	/**
	 * @param {keyof DriverOptions} name a top-level option
	 * @param {DriverOptionGroup} options the options
	 * @param {("compress" | "mangle" | "parse" | "format")[]} keys the option groups it also sets
	 * @returns {void}
	 */
	const setShorthand = (name, options, keys) => {
		if (options[name]) {
			for (const key of keys) {
				if (options[key]) {
					if (typeof options[key] !== "object") options[key] = {};
					if (!(name in /** @type {DriverOptionGroup} */ (options[key]))) {
						/** @type {DriverOptionGroup} */ (options[key])[name] =
							options[name];
					}
				}
			}
		}
	};

	/**
	 * @param {NameCacheEntry | null | undefined} cache a name cache
	 * @returns {void}
	 */
	const initCache = (cache) => {
		if (!cache) return;
		if (!("props" in cache)) {
			cache.props = new Map();
		} else if (!(cache.props instanceof Map)) {
			cache.props = mapFromObject(
				/** @type {Record<string, string>} */ (cache.props)
			);
		}
	};

	modules.prepareNodePrint = (text, given) => {
		const options = /** @type {DriverOptions} */ (
			/** @type {Omit<DriverOptions, "format"> & { format: DriverFormatOptions | null }} */ (
				defaults(
					given,
					{
						compress: {},
						ecma: undefined,
						ie8: false,
						keep_classnames: undefined,
						keep_fnames: false,
						mangle: {},
						module: false,
						nameCache: null,
						format: null,
						parse: {},
						safari10: false,
						sourceType: undefined,
						toplevel: false
					},
					true
				)
			)
		);
		// Parsing writes its tree into `parse`: a copy keeps the caller's options free of it.
		options.parse = { ...options.parse };
		if (options.keep_classnames === undefined) {
			options.keep_classnames = options.keep_fnames;
		}
		options.format = options.format || {};
		const { sourceType } = options;
		const functionBody =
			sourceType === "event-handler" || sourceType === "commonjs";
		if (sourceType !== undefined) {
			options.module = sourceType === "module";
			options.parse.module = options.module;
		}
		if (functionBody) options.parse[PARSE_FUNCTION_BODY] = sourceType;
		setShorthand("ecma", options, ["parse", "compress", "format"]);
		setShorthand("ie8", options, ["compress", "mangle", "format"]);
		setShorthand("keep_classnames", options, ["compress", "mangle"]);
		setShorthand("keep_fnames", options, ["compress", "mangle"]);
		setShorthand("module", options, ["parse", "compress", "mangle"]);
		setShorthand("safari10", options, ["mangle", "format"]);
		setShorthand("toplevel", options, ["compress", "mangle"]);
		if (sourceType !== undefined && options.compress) {
			options.compress = {
				.../** @type {Partial<CompressOptions>} */ (options.compress),
				module: options.module,
				...(functionBody ? { toplevel: false } : undefined)
			};
		}
		/** @type {string[] | undefined} */
		let quotedProperties;
		if (options.mangle) {
			options.mangle = /** @type {DriverMangleOptions} */ (
				defaults(
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
				)
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
			if (sourceType !== undefined) options.mangle.module = options.module;
			// The names a function body declares are its own to rename.
			if (functionBody) options.mangle.toplevel = true;
			initCache(options.mangle.cache);
			initCache(
				/** @type {GivenPropertyMangleOptions} */ (options.mangle.properties)
					.cache
			);
		}
		const { format: givenFormat } = options;
		if (
			options.parse.spidermonkey ||
			givenFormat.ast ||
			givenFormat.spidermonkey ||
			(hasOwn(givenFormat, "code") && !givenFormat.code)
		) {
			throw new Error(
				"javascript syntax: the one-pass minify reads one source text and prints code: `parse.spidermonkey`, `format.ast`, `format.spidermonkey` and `format.code: false` are not supported"
			);
		}
		options.parse.toplevel = null;
		delete options.parse.spidermonkey;
		options.parse.filename = "0";
		// Every token's type is read for the scopes, mangled or not.
		const parsed = parseModule.parseTree(
			text,
			options.parse,
			modules.readTreeTokens,
			false
		);
		const compressOptions = /** @type {Partial<CompressOptions> | false} */ (
			options.compress
		);
		if (compressOptions && compressOptions.join_vars !== false) {
			joinAssignedDeclarations(parsed.tree, parsed.program, text);
		}
		if (parsed.module) {
			// Only a module imports or exports, its top-level names private to it.
			if (options.compress) {
				options.compress = {
					.../** @type {Partial<CompressOptions>} */ (options.compress),
					module: true
				};
			}
			if (options.mangle) {
				options.mangle = { ...options.mangle, module: true, toplevel: true };
			}
		}
		// Without `"strict"`, a quoted key is reserved everywhere above.
		modules.quotesKept =
			Boolean(options.format.keep_quoted_props) ||
			Boolean(
				options.mangle &&
				options.mangle.properties &&
				options.mangle.properties.keep_quoted === "strict"
			);
		/** @type {DriverFormatOptions} */
		const format = { ...options.format, _destroy_ast: true };
		// A handler is never joined to other code, so its last `;` goes.
		if (sourceType === "event-handler") format._function_body = true;
		delete format.ast;
		delete format.code;
		delete format.spidermonkey;
		const stream = output.OutputStream(format);
		const { mangle, nameCache } = options;
		/** @type {TreeNames | null} */
		let names = null;
		if (mangle) {
			names = modules.mangleTree(
				parsed,
				stream,
				text,
				formatMangleOptions(mangle, base54),
				text.includes("#")
			);
			const { properties } = mangle;
			if (properties) {
				const mangled = modules.mangleTreeProperties(
					parsed,
					names.definitions,
					quotedProperties && properties.keep_quoted !== "strict"
						? quotedProperties
						: null,
					(annotated) => propertyNames(properties, annotated)
				);
				names.properties = mangled.properties;
				names.propertyStrings = mangled.strings;
				// Every property name is chosen once the tree is read, before it prints.
				if (nameCache && properties.cache) {
					nameCache.props = {
						props: mapToObject(
							/** @type {Map<string, string>} */ (properties.cache.props)
						)
					};
				}
			}
		} else if (options.compress) {
			// Unmangled, the scopes are still read for what it compresses by.
			names = modules.mangleTree(
				parsed,
				stream,
				text,
				formatMangleOptions(
					{
						ie8: options.ie8,
						safari10: options.safari10,
						module: options.module,
						keep_fnames: options.keep_fnames,
						keep_classnames: options.keep_classnames
					},
					base54
				),
				false,
				false
			);
		}
		return {
			parsed,
			text,
			format,
			leadingToken: 0,
			names,
			compress: options.compress
				? /** @type {Partial<CompressOptions>} */ (options.compress)
				: null,
			// The names a print hands out are cached once it has named them.
			finish:
				nameCache && mangle && mangle.cache
					? () => {
							nameCache.vars = {
								props: mapToObject(
									/** @type {Map<string, string>} */ (
										/** @type {NameCacheEntry} */ (mangle.cache).props
									)
								)
							};
						}
					: undefined
		};
	};
};

const KEY = 0b00001000;
const MANGLE_PROP = 0b00010000;

// A token's flags, as terser's `ast.js` numbers them.
const TOKEN_NEWLINE_BEFORE = 0b0001;
const TOKEN_QUOTE_SINGLE = 0b0010;
const TOKEN_QUOTE_EXISTS = 0b0100;
const TOKEN_TEMPLATE_END = 0b1000;

/**
 * terser's `ParsedToken`: a token, sealed, its booleans packed into `flags`.
 */
class ParsedToken {
	/**
	 * @param {string} type the token's type
	 * @param {string} value its value
	 * @param {number} line its line, from 1
	 * @param {number} col its column, from 0
	 * @param {number} pos its offset
	 * @param {boolean} nlb whether a line break comes before it
	 * @param {Comment[]} commentsBefore the comments before it
	 * @param {Comment[]} commentsAfter the comments after it
	 * @param {(string | null)=} file its file
	 */
	constructor(
		type,
		value,
		line,
		col,
		pos,
		nlb,
		commentsBefore,
		commentsAfter,
		file
	) {
		this.flags = nlb ? 1 : 0;
		this.type = type;
		this.value = value;
		this.line = line;
		this.col = col;
		this.pos = pos;
		this.comments_before = commentsBefore;
		this.comments_after = commentsAfter;
		this.file = file;
		Object.seal(this);
	}

	/**
	 * @param {number} _depth how deep Node's inspector is
	 * @param {import("util").InspectContext} options its options
	 * @returns {string} the token, as Node's console shows it
	 */
	[Symbol.for("nodejs.util.inspect.custom")](_depth, options) {
		/**
		 * @param {string} text text
		 * @returns {string} it, styled as special
		 */
		const special = (text) => options.stylize(text, "special");
		const quote =
			typeof this.value === "string" && this.value.includes("`") ? "'" : "`";
		return `${special("[ParsedToken")} ${quote}${this.value}${quote} at ${this.line}:${this.col}${special("]")}`;
	}

	/**
	 * @returns {boolean} whether a line break comes before it
	 */
	get nlb() {
		return Boolean(this.flags & TOKEN_NEWLINE_BEFORE);
	}

	/**
	 * @param {boolean} value whether a line break comes before it
	 */
	set nlb(value) {
		this.flags = value
			? this.flags | TOKEN_NEWLINE_BEFORE
			: this.flags & ~TOKEN_NEWLINE_BEFORE;
	}

	/**
	 * @returns {string} the quote a string had, or ""
	 */
	get quote() {
		if (!(this.flags & TOKEN_QUOTE_EXISTS)) return "";
		return this.flags & TOKEN_QUOTE_SINGLE ? "'" : '"';
	}

	/**
	 * @param {string} quote the quote a string had, or ""
	 */
	set quote(quote) {
		this.flags =
			quote === "'"
				? this.flags | TOKEN_QUOTE_SINGLE
				: this.flags & ~TOKEN_QUOTE_SINGLE;
		this.flags = quote
			? this.flags | TOKEN_QUOTE_EXISTS
			: this.flags & ~TOKEN_QUOTE_EXISTS;
	}

	/**
	 * @returns {boolean} whether it ends a template literal
	 */
	get template_end() {
		return Boolean(this.flags & TOKEN_TEMPLATE_END);
	}

	/**
	 * @param {boolean} value whether it ends a template literal
	 */
	set template_end(value) {
		this.flags = value
			? this.flags | TOKEN_TEMPLATE_END
			: this.flags & ~TOKEN_TEMPLATE_END;
	}
}

/**
 * terser's `JS_Parse_Error`, what its parser throws for a source it refuses.
 */
class JSParseError extends Error {
	/**
	 * @param {string} message what is wrong
	 * @param {string | null | undefined} filename the file
	 * @param {number} line the line, from 1
	 * @param {number} col the column, from 0
	 * @param {number} pos the offset
	 */
	constructor(message, filename, line, col, pos) {
		super();
		this.name = "SyntaxError";
		this.message = message;
		this.filename = filename;
		this.line = line;
		this.col = col;
		this.pos = pos;
	}
}

/**
 * terser's `js_error`.
 * @param {string} message what is wrong
 * @param {string | null | undefined} filename the file
 * @param {number} line the line, from 1
 * @param {number} col the column, from 0
 * @param {number} pos the offset
 * @returns {never} it always throws
 */
const throwParseError = (message, filename, line, col, pos) => {
	throw new JSParseError(message, filename, line, col, pos);
};

/** @typedef {{ bare_returns?: boolean, ecma?: number | null, filename?: string | null, html5_comments?: boolean, module?: boolean, shebang?: boolean, toplevel?: Node | null, [PARSE_FUNCTION_BODY]?: "commonjs" | "event-handler" }} ParseOptions terser's parse options, the tables a parse joining a tree numbers its tokens after, and whether the source is a function's body */

/**
 * What the parse phase shares with the rest: the operator precedences and
 * reserved words from terser's tables, and the error a refused source throws.
 * The parse phase installs `parse` itself.
 * @returns {{ parse: (text: string, options?: ParseOptions) => Node, JS_Parse_Error: typeof JSParseError, js_error: typeof throwParseError, PRECEDENCE: Record<string, number>, ALL_RESERVED_WORDS: Set<string> }} the parser's tables
 */
const createParseTables = () => {
	const { parserTables } = require("./syntax-printer-data");

	const tables = parserTables();
	/** @type {Record<string, number>} */
	const PRECEDENCE = {};
	for (const [index, level] of /** @type {string[][]} */ (
		tables.PRECEDENCE
	).entries()) {
		for (const operator of level) PRECEDENCE[operator] = index + 1;
	}
	return {
		parse: () => {
			throw new Error("the parse phase is not installed");
		},
		JS_Parse_Error: JSParseError,
		js_error: throwParseError,
		PRECEDENCE,
		ALL_RESERVED_WORDS: new Set(
			/** @type {string[]} */ (tables.ALL_RESERVED_WORDS)
		)
	};
};

/**
 * A regexp's source as terser's tokenizer reads it: a backslash before a
 * character beyond ASCII adds no syntax, so terser drops it.
 * @param {string} pattern the pattern as written
 * @returns {string} it with those backslashes gone
 */
const regexpSourceAsRead = (pattern) => {
	let backslash = pattern.indexOf("\\");
	if (backslash === -1) return pattern;
	let source = "";
	let from = 0;
	while (backslash !== -1 && backslash + 1 < pattern.length) {
		const code = /** @type {number} */ (pattern.codePointAt(backslash + 1));
		const escaped = String.fromCodePoint(code);
		source +=
			pattern.slice(from, backslash) + (code < 128 ? `\\${escaped}` : escaped);
		from = backslash + 1 + escaped.length;
		backslash = pattern.indexOf("\\", from);
	}
	return source + pattern.slice(from);
};

/**
 * Hands an expression's comments to the parentheses around it, as terser's
 * parser leaves them: the comments outside come first, and both tokens on
 * each side share the list they are in.
 * @param {NodeToken} openToken the opening parenthesis
 * @param {NodeToken} closeToken the closing parenthesis
 * @param {NodeToken | null | undefined} inner the expression's first token, if it has one
 * @param {NodeToken | null | undefined} last the expression's last token, if it has one
 * @returns {number} how many comments came before the opening parenthesis, -1 where the expression has no first token
 */
const bindParenthesisComments = (openToken, closeToken, inner, last) => {
	let outerCount = -1;
	if (inner) {
		const outer = openToken.comments_before;
		outerCount = outer.length;
		// Built rather than moved: the list is shared where it is empty.
		const before =
			outer.length === 0
				? inner.comments_before
				: [...outer, ...inner.comments_before];
		inner.comments_before = before;
		openToken.comments_before = before;
		// Only a parenthesis holding no comment of its own hands its line break
		// to the first comment inside it, as terser's parser has it.
		if (outer.length === 0 && before.length > 0) {
			const [comment] = before;
			if (!comment.nlb) {
				comment.nlb = openToken.nlb;
				openToken.nlb = false;
			}
		}
		openToken.comments_after = inner.comments_after;
	}
	if (last) {
		closeToken.comments_before = last.comments_before;
		const after =
			closeToken.comments_after.length === 0
				? last.comments_after
				: [...last.comments_after, ...closeToken.comments_after];
		last.comments_after = after;
		closeToken.comments_after = after;
	}
	return outerCount;
};

/** @typedef {import("./syntax-parser").NodeOffsets} NodeOffsets where a node webpack's parser builds sits in the source */
/** @typedef {import("./syntax-parser").AnyNodeType} AnyNodeType the `type` of a node webpack's parser builds */

/**
 * What every node the printer reads holds: the tokens it was read between,
 * none on a node the compressor made.
 * @typedef {object} PrintBase
 * @property {NodeToken | null | undefined} startToken the token it starts at
 * @property {NodeToken | null | undefined} endToken the token it ends at
 */

/** @typedef {PrintBase & { type: "Program", body: PrintNode[], tokenTables?: TokenTables | null }} PrintProgram the program, with the tables its token numbers are read through */
/** @typedef {PrintBase & { type: "ExpressionStatement", expression: PrintNode, directive: string | undefined }} PrintExpressionStatement a statement of one expression, a directive where `directive` is set */
/** @typedef {PrintBase & { type: "BlockStatement", body: PrintNode[] }} PrintBlockStatement a block */
/** @typedef {PrintBase & { type: "EmptyStatement" | "DebuggerStatement" | "ThisExpression" | "Super" }} PrintLeaf a node holding nothing but its type */
/** @typedef {PrintBase & { type: "LabeledStatement", label: PrintNode, body: PrintNode }} PrintLabeledStatement a labeled statement */
/** @typedef {PrintBase & { type: "DoWhileStatement" | "WhileStatement", test: PrintNode, body: PrintNode }} PrintWhileStatement a `while` or `do`-`while` loop */
/** @typedef {PrintBase & { type: "ForStatement", init: PrintNode | null, test: PrintNode | null, update: PrintNode | null, body: PrintNode }} PrintForStatement a `for` loop */
/** @typedef {PrintBase & { type: "ForInStatement", left: PrintNode, right: PrintNode, body: PrintNode }} PrintForInStatement a `for`-`in` loop */
/** @typedef {PrintBase & { type: "ForOfStatement", left: PrintNode, right: PrintNode, body: PrintNode, await: boolean }} PrintForOfStatement a `for`-`of` loop */
/** @typedef {PrintBase & { type: "WithStatement", object: PrintNode, body: PrintNode }} PrintWithStatement a `with` statement */
/** @typedef {PrintBase & { type: "ReturnStatement" | "ThrowStatement", argument: PrintNode | null }} PrintExitStatement a `return` or `throw` */
/** @typedef {PrintBase & { type: "BreakStatement" | "ContinueStatement", label: PrintNode | null }} PrintLoopControl a `break` or `continue` */
/** @typedef {PrintBase & { type: "IfStatement", test: PrintNode, consequent: PrintNode, alternate: PrintNode | null }} PrintIfStatement an `if` */
/** @typedef {PrintBase & { type: "SwitchStatement", discriminant: PrintNode, cases: PrintSwitchCase[] }} PrintSwitchStatement a `switch` */
/** @typedef {PrintBase & { type: "SwitchCase", test: PrintNode | null, consequent: PrintNode[] }} PrintSwitchCase a `case`, or the `default` where `test` is null */
/** @typedef {PrintBase & { type: "TryStatement", block: PrintNode, handler: PrintNode | null, finalizer: PrintNode | null }} PrintTryStatement a `try` */
/** @typedef {PrintBase & { type: "CatchClause", param: PrintNode | null, body: PrintBlockStatement }} PrintCatchClause a `catch` */
/** @typedef {PrintBase & { type: "VariableDeclaration", declarations: PrintNode[], kind: string, await?: boolean }} PrintVariableDeclaration a `var`, `let`, `const` or `using` declaration, `await` for an `await using` */
/** @typedef {PrintBase & { type: "VariableDeclarator", id: PrintNode, init: PrintNode | null }} PrintVariableDeclarator one name a declaration declares */
/** @typedef {PrintBase & { type: "FunctionDeclaration" | "FunctionExpression" | "ArrowFunctionExpression", id: PrintIdentifier | null, params: PrintNode[], body: PrintBlockStatement, generator: boolean, async: boolean }} PrintFunction a function, its body always a block, its name's `role` saying how the name is declared */
/** @typedef {PrintBase & { type: "ClassDeclaration" | "ClassExpression", id: PrintIdentifier | null, superClass: PrintNode | null, body: PrintClassBody }} PrintClass a class, its name's `role` as a function's */
/** @typedef {PrintBase & { type: "ClassBody" | "StaticBlock", body: PrintNode[] }} PrintClassBody a class's body, or a static block */
/** @typedef {string | null | undefined} PrintMapName the name a member's source mapping carries where renaming set it, else undefined */
/** @typedef {PrintBase & { type: "PropertyDefinition", key: PrintNode, value: PrintNode | null, computed: boolean, static: boolean, quote: string | undefined, mapName: PrintMapName }} PrintPropertyDefinition a class field */
/** @typedef {PrintBase & { type: "Property", key: PrintNode, value: PrintNode, kind: string, method: boolean, shorthand: boolean, computed: boolean, quote: string | undefined, mapName: PrintMapName }} PrintProperty an object literal's or pattern's property */
/** @typedef {PrintBase & { type: "MethodDefinition", key: PrintNode, value: PrintNode, kind: string, computed: boolean, static: boolean, quote: string | undefined }} PrintMethodDefinition a class's method, getter or setter */
/** @typedef {PrintBase & { type: "ObjectExpression" | "ObjectPattern", properties: PrintNode[] }} PrintObject an object literal or pattern */
/** @typedef {PrintBase & { type: "ArrayExpression" | "ArrayPattern", elements: (PrintNode | null)[] }} PrintArray an array literal or pattern, null for a hole */
/** @typedef {PrintBase & { type: "SpreadElement" | "RestElement", argument: PrintNode }} PrintSpread a spread or rest element */
/** @typedef {PrintBase & { type: "AssignmentPattern", left: PrintNode, right: PrintNode }} PrintAssignmentPattern a default value */
/** @typedef {PrintBase & { type: "TemplateLiteral", segments: PrintNode[] }} PrintTemplateLiteral a template literal, its texts and expressions in order, two texts side by side where the compressor joined them */
/** @typedef {PrintBase & { type: "TemplateElement", value: string, raw: string }} PrintTemplateElement a template literal's text, `value` cooked */
/** @typedef {PrintBase & { type: "TaggedTemplateExpression", tag: PrintNode, quasi: PrintNode }} PrintTaggedTemplateExpression a tagged template */
/** @typedef {PrintBase & { type: "AwaitExpression", argument: PrintNode }} PrintAwaitExpression an `await` */
/** @typedef {PrintBase & { type: "YieldExpression", argument: PrintNode | null, delegate: boolean }} PrintYieldExpression a `yield` */
/** @typedef {PrintBase & { type: "CallExpression", callee: PrintNode, arguments: PrintNode[], optional: boolean }} PrintCallExpression a call */
/** @typedef {PrintBase & { type: "NewExpression", callee: PrintNode, arguments: PrintNode[] }} PrintNewExpression a `new` */
/** @typedef {PrintBase & { type: "ImportExpression", args: PrintNode[], phase: string | null | undefined }} PrintImportExpression a dynamic `import()`, its source then its options */
/** @typedef {PrintBase & { type: "MetaProperty", role: string }} PrintMetaProperty `import.meta` where `role` is "importMeta", else `new.target` */
/** @typedef {PrintBase & { type: "SequenceExpression", expressions: PrintNode[] }} PrintSequenceExpression a comma sequence */
/** @typedef {PrintBase & { type: "MemberExpression", object: PrintNode, property: PrintNode, computed: boolean, optional: boolean, quote: string | undefined }} PrintMemberExpression a property access, `quote` the quote a name read as `.name` had when written as a string */
/** @typedef {PrintBase & { type: "ChainExpression", expression: PrintNode }} PrintChainExpression an optional chain */
/** @typedef {PrintBase & { type: "UnaryExpression" | "UpdateExpression", operator: string, prefix: boolean, argument: PrintNode }} PrintUnary a unary operator or an increment or decrement */
/** @typedef {PrintBase & { type: "BinaryExpression" | "LogicalExpression" | "AssignmentExpression", operator: string, left: PrintNode, right: PrintNode }} PrintBinary a binary operator or an assignment */
/** @typedef {PrintBase & { type: "ConditionalExpression", test: PrintNode, consequent: PrintNode, alternate: PrintNode }} PrintConditionalExpression a conditional */
/** @typedef {PrintBase & { type: "ImportDeclaration", imported_name: PrintIdentifier | null, imported_names: PrintNameMapping[] | null, source: PrintNode, attributes: PrintObject | null, phase: string | null | undefined }} PrintImportDeclaration an `import`, its default name held alone */
/** @typedef {PrintBase & { type: "ImportSpecifier" | "ImportNamespaceSpecifier" | "ExportSpecifier", local: PrintNode, imported: PrintNode | null, exported: PrintNode | null }} PrintNameMapping a name an import takes, `imported` the other module's, or one an export gives, `exported` the other module's */
/** @typedef {PrintBase & { type: "ExportAllDeclaration" | "ExportDefaultDeclaration" | "ExportNamedDeclaration", exported_definition: PrintNode | null, exported_value: PrintNode | null, exported_names: PrintNameMapping[] | null, source: PrintNode | null, attributes: PrintObject | null }} PrintExport an export: of a declaration held as a definition or a value, of names, or of a module's, `export *` as one name mapping */
/** @typedef {PrintBase & { type: "PrivateIdentifier", name: string }} PrintPrivateIdentifier a private name */
/** @typedef {{ name: string, mangled_name?: string | null }} NamedDefinition what every definition of a name holds: the name it declares, and the one mangling gave it */
/**
 * What a print recorded for mangling to rewrite in its text: each name it
 * printed as written, and each import or export `as` clause.
 * @typedef {object} MangleRecording
 * @property {Int32Array} starts where each piece starts in the text, `count` of them
 * @property {Int32Array} lengths how long each piece is, negated where the frequency count leaves its name out
 * @property {number} count how many pieces there are
 * @property {NamedDefinition[]} targets the definition whose name replaces each piece
 * @property {MangleSpecifier[]} specifiers the pieces that are an import's or export's `as` clause, in order
 * @property {string[]} counted text a string print would have written but this one did not
 * @property {string[]} uncounted text this print wrote that a string print would not
 */

/**
 * A recorded `as` clause: whether the local's final name matches the foreign
 * one decides if it is written.
 * @typedef {object} MangleSpecifier
 * @property {number} index which piece it is
 * @property {string} foreign the other module's name
 * @property {string} text that name as printed
 * @property {boolean} isImport whether the clause precedes the local name
 */
/** @typedef {PrintBase & { type: "Identifier", name: string, definition: MinifierVariable | MinifierLabel | NamedDefinition | null | undefined, atom?: boolean, role?: string }} PrintIdentifier a name as written, `atom` where terser prints it as a constant, `definition` what the compressor's or the mangler's scope analysis found it names */
/** @typedef {PrintBase & { type: "Literal", value: string | number | boolean | RegExp | null, raw: string | undefined, quote: string | undefined, role: string | undefined, name: string, _annotations: number | undefined }} PrintLiteral a literal, `quote` the quote a string had, `role` "bigint" where `value` is a bigint's digits and "regexp" for a regular expression, `name` a quoted module name's, `_annotations` holding `KEY` where a `@__KEY__` annotation marks a string a property name */

/**
 * A node of the compressed tree as the printer and the mangler read it, by its
 * ESTree type; an absent child reads null or undefined, which the types leave
 * out of a child's type, as `NO_NODE` does terser's.
 * @typedef {PrintProgram | PrintExpressionStatement | PrintBlockStatement | PrintLeaf | PrintLabeledStatement | PrintWhileStatement | PrintForStatement | PrintForInStatement | PrintForOfStatement | PrintWithStatement | PrintExitStatement | PrintLoopControl | PrintIfStatement | PrintSwitchStatement | PrintSwitchCase | PrintTryStatement | PrintCatchClause | PrintVariableDeclaration | PrintVariableDeclarator | PrintFunction | PrintClass | PrintClassBody | PrintPropertyDefinition | PrintProperty | PrintMethodDefinition | PrintObject | PrintArray | PrintSpread | PrintAssignmentPattern | PrintTemplateLiteral | PrintTemplateElement | PrintTaggedTemplateExpression | PrintAwaitExpression | PrintYieldExpression | PrintCallExpression | PrintNewExpression | PrintImportExpression | PrintMetaProperty | PrintSequenceExpression | PrintMemberExpression | PrintChainExpression | PrintUnary | PrintBinary | PrintConditionalExpression | PrintImportDeclaration | PrintNameMapping | PrintExport | PrintPrivateIdentifier | PrintIdentifier | PrintLiteral} PrintNode
 */

/** @typedef {{ reset: () => void, consider: (chars: string, delta: number) => void, sort: () => void }} CharacterCounter an identifier source that counts the characters printed, as terser's `base54` does */

/** @typedef {(Comment[] | undefined)[]} CommentGaps the comments of each gap between a parse's tokens, by the token after it, while the parse reads them */

/**
 * What a `SourceToken` reads off the parse that read it, by the token's index.
 * @internal
 * @typedef {object} TokenReader
 * @property {string | undefined} fileName the file its tokens name
 * @property {(index: number) => number} positionOf where a token starts
 * @property {(index: number) => string} kindOf terser's name for a token's kind
 * @property {(index: number) => string} valueOf what a token holds
 * @property {(index: number) => number} lineOf a token's line, from 1
 * @property {(index: number) => number} columnOf a token's column, from 0
 * @property {(index: number) => boolean} brokeLineAt whether a line break comes before a token
 * @property {(index: number, broke: boolean) => void} setBrokeLineAt records whether one does
 * @property {(index: number, after: boolean) => Comment[]} commentsOf the comments before or after a token
 * @property {(index: number, after: boolean, comments: Comment[]) => void} bindComments binds a list of comments onto a token
 */

/**
 * A token of webpack's parse: where it sits in the source, and the parse that
 * read it. terser's `ParsedToken` keeps what this reads off that parse — its
 * line, its kind, the comments beside it — in nine fields of its own, which a
 * tree of a million nodes cannot afford.
 */
class SourceToken {
	/**
	 * @param {TokenReader} tokens the parse that read it
	 * @param {number} index which of its tokens this is
	 */
	constructor(tokens, index) {
		this.tokens = tokens;
		this.index = index;
	}

	/** @returns {number} where it starts */
	get pos() {
		return this.tokens.positionOf(this.index);
	}

	/** @returns {string} terser's name for its kind */
	get type() {
		return this.tokens.kindOf(this.index);
	}

	/** @returns {string} what it holds */
	get value() {
		return this.tokens.valueOf(this.index);
	}

	/** @returns {number} its line, from 1 */
	get line() {
		return this.tokens.lineOf(this.index);
	}

	/** @returns {number} its column, from 0 */
	get col() {
		return this.tokens.columnOf(this.index);
	}

	/** @returns {string | undefined} its file */
	get file() {
		return this.tokens.fileName;
	}

	/** @returns {boolean} whether a line break comes before it */
	get nlb() {
		return this.tokens.brokeLineAt(this.index);
	}

	/**
	 * @param {boolean} broke whether a line break comes before it
	 */
	set nlb(broke) {
		this.tokens.setBrokeLineAt(this.index, broke);
	}

	/** @returns {Comment[]} the comments read before it */
	get comments_before() {
		return this.tokens.commentsOf(this.index, false);
	}

	/**
	 * @param {Comment[]} comments the comments read before it
	 */
	set comments_before(comments) {
		this.tokens.bindComments(this.index, false, comments);
	}

	/** @returns {Comment[]} the comments read after it */
	get comments_after() {
		return this.tokens.commentsOf(this.index, true);
	}

	/**
	 * @param {Comment[]} comments the comments read after it
	 */
	set comments_after(comments) {
		this.tokens.bindComments(this.index, true, comments);
	}

	/**
	 * @param {number} _depth how deep Node's inspector is
	 * @param {import("util").InspectContext} options its options
	 * @returns {string} the token, as Node's console shows it
	 */
	[Symbol.for("nodejs.util.inspect.custom")](_depth, options) {
		return `ParsedToken { type: ${options.stylize(JSON.stringify(this.type), "string")}, value: ${options.stylize(JSON.stringify(this.value), "string")}, line: ${options.stylize(String(this.line), "number")}, col: ${options.stylize(String(this.col), "number")} }`;
	}
}

/** @typedef {{ base: number, size: () => number, token: (index: number) => SourceToken, commentsOf: (index: number, after: boolean) => Comment[], forEachCommentGap: (callback: (index: number, comments: Comment[]) => void) => void, keptComments: (test: (comment: Comment) => boolean) => number, placeComments: () => void, commentFlags: () => Uint8Array, outerCounts: Map<number, number> }} TokenTable the tokens of one parse, read by their index past `base` */

/**
 * The tokens of every parse a tree was read from. Its nodes hold their tokens'
 * numbers, which this answers for; a token handed in whole answers for itself.
 */
class TokenTables {
	constructor() {
		/** @type {TokenTable[]} */
		this.tables = [];
		// The last parse's table, which a tree of one file reads every token in.
		/** @type {TokenTable | undefined} */
		this.last = undefined;
		this.lastBase = Infinity;
	}

	/**
	 * @param {TokenTable} table the table of a parse read onto the tree
	 * @returns {void}
	 */
	add(table) {
		this.tables.push(table);
		this.last = table;
		this.lastBase = table.base;
	}

	/**
	 * @returns {number} the number the next parse's first token takes, never 0
	 */
	nextBase() {
		const { tables } = this;
		if (tables.length === 0) return 1;
		const last = tables[tables.length - 1];
		return last.base + last.size();
	}

	/**
	 * @param {number} number a token's number
	 * @returns {TokenTable | undefined} the table of the parse that read it
	 */
	tableOf(number) {
		if (number >= this.lastBase) return this.last;
		const { tables } = this;
		for (let i = tables.length - 1; i >= 0; i--) {
			if (number >= tables[i].base) return tables[i];
		}
		return undefined;
	}

	/**
	 * @param {NodeToken | number | null | undefined} token a node's token, or its number
	 * @returns {NodeToken | null | undefined} the token itself
	 */
	of(token) {
		if (typeof token !== "number") return token;
		const table = this.tableOf(token);
		return table === undefined ? undefined : table.token(token - table.base);
	}

	/**
	 * @param {(token: number, comments: Comment[]) => void} callback handed each gap holding comments, by the number of the token after it
	 * @returns {void}
	 */
	forEachCommentGap(callback) {
		for (const table of this.tables) {
			table.forEachCommentGap((index, comments) =>
				callback(table.base + index, comments)
			);
		}
	}

	/**
	 * @param {NodeToken | number | null | undefined} token a node's token, or its number
	 * @param {boolean} after true for the comments after it
	 * @returns {Comment[] | undefined} the comments before or after it, the token unbuilt
	 */
	commentsOf(token, after) {
		if (typeof token !== "number") {
			if (!token) return undefined;
			return after ? token.comments_after : token.comments_before;
		}
		const table = this.tableOf(token);
		return table === undefined
			? undefined
			: table.commentsOf(token - table.base, after);
	}
}

// What a tree read without webpack's parse answers its tokens with.
const NO_TOKEN_TABLES = new TokenTables();

// The parse option reading a source as a function's body, the `sourceType`
// naming whose: `return` and `new.target` at its top, and a `#!` line opening
// only a CommonJS module's.
const PARSE_FUNCTION_BODY = Symbol("a source read as a function body");

/**
 * Installs webpack's parse: the printer's tree built by webpack's own parser as
 * it finishes each statement, with that parser's tokens and comments. terser's
 * parser stays behind it, for the sources it reads more leniently.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installFusedParse = (modules) => {
	const { parse } = modules;

	const {
		Field,
		NodeType,
		SyntaxTree,
		WebpackParser,
		buildLineStarts,
		positionAt,
		tokTypes
	} = require("./syntax-parser");

	// What terser's tokenizer calls each of webpack's token kinds. The printer
	// reads a node's own tokens for where they sit, the comments they carry and
	// the name a source map maps from, which it takes off the kind.
	const PUNCTUATION_LABELS = new Set([
		"[",
		"]",
		"{",
		"}",
		"(",
		")",
		",",
		";",
		":",
		".",
		"?.",
		"`",
		"${"
	]);

	const tables = /** @type {Record<string, string[]>} */ (
		require("./syntax-printer-data").parserTables()
	);

	const KEYWORDS = new Set(tables.KEYWORDS);
	const KEYWORDS_ATOM = new Set(tables.KEYWORDS_ATOM);
	const WORD_OPERATORS = new Set(
		tables.OPERATORS.filter((operator) => KEYWORDS.has(operator))
	);

	/**
	 * terser's name for a word's kind, as its `read_word` gives one: a word it
	 * does not keyword names something, and `new` and `typeof` are operators.
	 * @param {string} word the word read
	 * @param {boolean} afterDot whether a `.` comes before it
	 * @returns {string} terser's name for its kind
	 */
	const wordKindOf = (word, afterDot) => {
		if (afterDot) return "name";
		if (KEYWORDS_ATOM.has(word)) return "atom";
		if (!KEYWORDS.has(word)) return "name";
		return WORD_OPERATORS.has(word) ? "operator" : "keyword";
	};

	/**
	 * @param {import("./syntax-parser").ParserInstance["type"]} type one of webpack's token kinds
	 * @returns {string | null} terser's name for it, null where the word decides
	 */
	const tokenKindOf = (type) => {
		if (type === tokTypes.name || type.keyword) return null;
		if (type === tokTypes.privateId) return "privatename";
		if (type === tokTypes.num) return "num";
		if (type === tokTypes.string) return "string";
		if (type === tokTypes.regexp) return "regexp";
		if (type === tokTypes.arrow) return "arrow";
		if (type === tokTypes.ellipsis) return "expand";
		if (type === tokTypes.eof) return "eof";
		return PUNCTUATION_LABELS.has(type.label) ? "punc" : "operator";
	};
	// Every kind a token can have, which one holds as an index into this.
	const KINDS = [
		"",
		"name",
		"privatename",
		"num",
		"string",
		"regexp",
		"arrow",
		"expand",
		"eof",
		"punc",
		"operator",
		"atom",
		"keyword"
	];
	/** @type {Map<string, number>} */
	const KIND_CODES = new Map(KINDS.map((kind, code) => [kind, code]));
	// What `ends` holds for the token past the source, which no node ends at.
	const NO_END = 0x7fffffff;

	// The list every token with no comments on either side shares. Nothing writes
	// into it: a gap gaining a comment takes a list of its own first.
	/** @type {Comment[]} */
	const NO_COMMENTS = [];
	// A token type's kind as a code, so reporting one costs a single lookup; null
	// where the kind follows from the word the token spells.
	/** @type {Map<import("./syntax-parser").ParserInstance["type"], number | null>} */
	const TOKEN_TYPES = new Map(
		Object.values(tokTypes).map((type) => {
			const named = tokenKindOf(type);
			return [
				type,
				named === null ? null : /** @type {number} */ (KIND_CODES.get(named))
			];
		})
	);

	const STRING_CODE = /** @type {number} */ (KIND_CODES.get("string"));
	const PRIVATENAME_CODE = /** @type {number} */ (
		KIND_CODES.get("privatename")
	);
	const EOF_CODE = /** @type {number} */ (KIND_CODES.get("eof"));

	/**
	 * The tokens of a parse, as terser's tokenizer leaves them: each one holding
	 * the comments read since the token before it, in a list it shares with that
	 * token's `comments_after`. A node holds its tokens' numbers, `base` past its
	 * own index, and a token is built only where a reader needs one.
	 * @param {string} source the source being parsed
	 * @param {string | null} filename what its tokens name as their file
	 * @param {number} base the number of this parse's first token
	 * @param {boolean=} placesLater whether a comment's line and column wait for `placeComments`
	 * @returns {{ onComment: import("./syntax-parser").OnComment, onToken: NonNullable<import("./syntax-parser").Options["onTokenRead"]>, shebang: (text: string) => void, finish: () => void, at: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable }} where to report comments and tokens, the token at an offset, what narrows the tables once the parse is over, and the table its numbers are read through
	 */
	const collectTokens = (source, filename, base, placesLater) => {
		// Where each token sits, its kind as an index into `KINDS`, and whether a
		// line break came before it: sized for the tokens a source this long holds,
		// doubled where it holds more, and trimmed by `finish` to what it read.
		let capacity = 64 + (source.length >> 2);
		let count = 0;
		let starts = new Int32Array(capacity);
		let ends = new Int32Array(capacity);
		let kinds = new Uint8Array(capacity);
		let breaks = new Uint8Array(capacity);

		/**
		 * @returns {void}
		 */
		const grow = () => {
			capacity *= 2;
			const widerStarts = new Int32Array(capacity);
			widerStarts.set(starts);
			starts = widerStarts;
			const widerEnds = new Int32Array(capacity);
			widerEnds.set(ends);
			ends = widerEnds;
			const widerKinds = new Uint8Array(capacity);
			widerKinds.set(kinds);
			kinds = widerKinds;
			const widerBreaks = new Uint8Array(capacity);
			widerBreaks.set(breaks);
			breaks = widerBreaks;
		};
		// The value of a token the source does not spell out: a string holds what
		// its escapes mean, and a private name is read without its `#`.
		/** @type {Map<number, string> | null} */
		let cooked = new Map();
		/** @type {SourceToken[]} */
		let built = [];
		// Once the parse is over, a token asked for before the parse read it, and
		// never read, is the one past the source.
		let finished = false;
		/** @type {CommentGaps | Map<number, Comment[]>} */
		let lists = [];
		// The gaps given a list while the parse reads them, as `lists` is sparse.
		/** @type {number[]} */
		let listed = [];
		// Once the parse is over, which gaps hold comments, so the rest are
		// answered without a lookup: most nodes are asked, and few gaps hold any.
		/** @type {Uint8Array | null} */
		let commentedGaps = null;
		/** @type {number[] | null} */
		let lineStarts = null;
		let previousEnd = 0;
		// Whether a line break has been read since the last token, which reading
		// one clears, as terser's tokenizer has it.
		let brokenLine = false;
		// Where `at` last found its token: nodes are asked for in the order they
		// sit, so the next is mostly a few tokens away.
		let lastFound = 0;
		// Whether the token before was a `.` or `?.`, after which terser reads a
		// word as a name whatever else it is.
		let afterDot = false;

		/**
		 * @param {number} index the token the comments were read before
		 * @returns {Comment[]} them, as terser's tokens
		 */
		const listAt = (index) => {
			if (lists instanceof Map) {
				const kept = lists.get(index);
				return kept === undefined ? NO_COMMENTS : kept;
			}
			const known = lists[index];
			if (known !== undefined) return known;
			// A gap already read past holds none: it shares the empty list, which is
			// not kept, as most gaps are asked for once. One not read past gains its
			// comments after this, so it is given a list of its own to gain them in.
			if (index < count) return NO_COMMENTS;
			/** @type {Comment[]} */
			const list = [];
			lists[index] = list;
			listed.push(index);
			return list;
		};

		/**
		 * Keeps a comment in the list of the gap it was read in, which the tokens on
		 * either side of that gap both read.
		 * @param {number} index the token it was read before
		 * @param {string} type terser's name for its kind
		 * @param {string} text what it holds
		 * @param {number} start where it starts
		 * @param {boolean} nlb whether a line break comes before it
		 * @returns {void}
		 */
		const read = (index, type, text, start, nlb) => {
			let list = /** @type {CommentGaps} */ (lists)[index];
			if (list === undefined || list === NO_COMMENTS) {
				list = [];
				/** @type {CommentGaps} */ (lists)[index] = list;
				listed.push(index);
			}
			let line = 0;
			let column = 0;
			if (placesLater !== true) {
				if (lineStarts === null) lineStarts = buildLineStarts(source);
				({ line, column } = /** @type {{ line: number, column: number }} */ (
					positionAt(lineStarts, start)
				));
			}
			list.push(
				new ParsedToken(
					type,
					text,
					line,
					column,
					start,
					nlb,
					NO_COMMENTS,
					NO_COMMENTS,
					filename === null ? undefined : filename
				)
			);
		};

		/**
		 * @param {number} index which token
		 * @returns {SourceToken} it, built once
		 */
		const build = (index) => {
			if (finished && index >= count) index = count - 1;
			const known = built[index];
			if (known !== undefined) return known;
			const token = new SourceToken(reader, index);
			built[index] = token;
			return token;
		};

		/**
		 * @param {number} index which token
		 * @returns {{ line: number, column: number }} where it sits
		 */
		const placeOf = (index) => {
			if (lineStarts === null) lineStarts = buildLineStarts(source);
			return /** @type {{ line: number, column: number }} */ (
				positionAt(lineStarts, starts[index])
			);
		};

		// A list bound onto one token by a parenthesis, which the gap it was read
		// in keeps out of: one token to an index, so the index names it.
		/** @type {Map<number, Comment[]> | null} */
		let boundBefore = null;
		/** @type {Map<number, Comment[]> | null} */
		let boundAfter = null;
		// A bit per token with a list bound, so the many with none skip the maps,
		// whose lookup costs more than the rest of the read.
		let boundTokens = new Uint8Array(0);

		// What a `SourceToken` of this parse reads off it. The arrays it reads are
		// the ones `finish` narrows; the rest go when the parse is over.
		/** @type {TokenReader} */
		const reader = {
			fileName: filename === null ? undefined : filename,
			positionOf: (/** @type {number} */ index) => starts[index],
			kindOf: (/** @type {number} */ index) => KINDS[kinds[index]],
			valueOf: (/** @type {number} */ index) =>
				cooked !== null && cooked.has(index)
					? /** @type {string} */ (cooked.get(index))
					: source.slice(starts[index], ends[index]),
			lineOf: (/** @type {number} */ index) => placeOf(index).line,
			columnOf: (/** @type {number} */ index) => placeOf(index).column,
			brokeLineAt: (/** @type {number} */ index) => breaks[index] === 1,
			setBrokeLineAt: (
				/** @type {number} */ index,
				/** @type {boolean} */ broke
			) => {
				breaks[index] = broke ? 1 : 0;
			},
			commentsOf: (
				/** @type {number} */ index,
				/** @type {boolean} */ after
			) => {
				const byte = index >> 3;
				if (
					byte < boundTokens.length &&
					(boundTokens[byte] & (1 << (index & 7))) !== 0
				) {
					const bound = after ? boundAfter : boundBefore;
					if (bound !== null) {
						const own = bound.get(index);
						if (own !== undefined) return own;
					}
				}
				const gap = after ? index + 1 : index;
				if (commentedGaps !== null && commentedGaps[gap] === 0) {
					return NO_COMMENTS;
				}
				return listAt(gap);
			},
			bindComments: (
				/** @type {number} */ index,
				/** @type {boolean} */ after,
				/** @type {Comment[]} */ comments
			) => {
				const byte = index >> 3;
				if (byte >= boundTokens.length) {
					const wider = new Uint8Array(
						Math.max(byte + 1, boundTokens.length * 2)
					);
					wider.set(boundTokens);
					boundTokens = wider;
				}
				boundTokens[byte] |= 1 << (index & 7);
				if (after) {
					if (boundAfter === null) boundAfter = new Map();
					boundAfter.set(index, comments);
				} else {
					if (boundBefore === null) boundBefore = new Map();
					boundBefore.set(index, comments);
				}
			}
		};

		return {
			onComment: (
				/** @type {boolean} */ isBlock,
				/** @type {string} */ text,
				/** @type {number} */ start,
				/** @type {number} */ end
			) => {
				// The parser reports the hashbang line too, which `shebang` reads.
				if (start === 0 && source.startsWith("#!")) return;
				let nlb = brokenLine;
				for (let i = previousEnd; !nlb && i < start; i++) {
					const code = source.charCodeAt(i);
					nlb =
						code === 10 || code === 13 || code === 0x2028 || code === 0x2029;
				}
				// A block comment is read with every line break in it spelled `\n`,
				// which is what terser's tokenizer leaves for the printer to write.
				const value = isBlock
					? text.replace(/\r\n|[\r\u2028\u2029]/g, "\n")
					: text;
				// WHY: terser's tokenizer steps over a comment's own characters before
				// it makes the token, so one holding a line break reads as having a
				// break before it as well as breaking the line for what follows.
				brokenLine = isBlock && value.includes("\n");
				read(
					count,
					isBlock ? "comment2" : "comment1",
					value,
					start,
					nlb || brokenLine
				);
				previousEnd = end;
			},
			onToken: (
				/** @type {import("./syntax-parser").ParserInstance} */ token
			) => {
				let nlb = brokenLine;
				const from = token.start;
				for (let i = previousEnd; !nlb && i < from; i++) {
					const code = source.charCodeAt(i);
					nlb =
						code === 10 || code === 13 || code === 0x2028 || code === 0x2029;
				}
				brokenLine = false;
				const type = token.type;
				const named = TOKEN_TYPES.get(type);
				const value = token.value === undefined ? "" : token.value;
				const kind =
					named === undefined || named === null
						? /** @type {number} */ (
								KIND_CODES.get(wordKindOf(String(value), afterDot))
							)
						: named;
				afterDot = type === tokTypes.dot || type === tokTypes.questionDot;
				if (kind === STRING_CODE || kind === PRIVATENAME_CODE) {
					/** @type {Map<number, string>} */ (cooked).set(
						count,
						/** @type {string} */ (value)
					);
				}
				if (count === capacity) grow();
				starts[count] = from;
				// A node ends at the last token it holds, which is never the one past
				// the source: terser leaves the comments after it on the token before.
				ends[count] = kind === EOF_CODE ? NO_END : token.end;
				kinds[count] = kind;
				breaks[count] = nlb ? 1 : 0;
				count++;
				previousEnd = token.end;
			},
			shebang: (/** @type {string} */ text) => {
				read(0, "comment5", text, 0, false);
			},
			finish: () => {
				// The parse is over: the room it was given beyond what it read goes,
				// and so does everything only the parse needed.
				const narrowStarts = starts.slice(0, count);
				const narrowEnds = ends.slice(0, count);
				const narrowKinds = kinds.slice(0, count);
				const narrowBreaks = breaks.slice(0, count);
				/** @type {Map<number, Comment[]>} */
				const kept = new Map();
				let gaps = count + 2;
				// In order, as the gaps are read, but for one given a list ahead.
				listed.sort((a, b) => a - b);
				for (const i of listed) {
					const list = /** @type {Comment[]} */ (
						/** @type {CommentGaps} */ (lists)[i]
					);
					if (list.length !== 0) {
						kept.set(i, list);
						if (i >= gaps) gaps = i + 1;
					}
				}
				listed = [];
				const flags = new Uint8Array(gaps);
				for (const index of kept.keys()) flags[index] = 1;
				commentedGaps = flags;
				finished = true;
				starts = narrowStarts;
				ends = narrowEnds;
				kinds = narrowKinds;
				breaks = narrowBreaks;
				lists = kept;
				built = [];
				if (/** @type {Map<number, string>} */ (cooked).size === 0) {
					cooked = null;
				}
			},
			at: (
				/** @type {number} */ pos,
				/** @type {boolean} */ ending,
				/** @type {number=} */ forward
			) => {
				const offsets = ending ? ends : starts;
				// Mostly the token just found, a node's end after its start: offsets
				// rise, so one there is the token asked for.
				if (
					forward === undefined &&
					lastFound < count &&
					offsets[lastFound] === pos
				) {
					return base + lastFound;
				}
				let low = 0;
				// What the parse has read, which is short of the room it was given.
				let high = count - 1;
				// Every token before `low` is before `pos`, and none after `high` is.
				if (lastFound <= high) {
					if (ending ? offsets[lastFound] <= pos : offsets[lastFound] < pos) {
						low = lastFound + 1;
						const far = lastFound + 32;
						if (
							far <= high &&
							!(ending ? offsets[far] <= pos : offsets[far] < pos)
						) {
							high = far - 1;
						}
					} else {
						high = lastFound - 1;
						const far = lastFound - 32;
						if (
							far >= 0 &&
							(ending ? offsets[far] <= pos : offsets[far] < pos)
						) {
							low = far + 1;
						}
					}
				}
				// The last token ending by `pos`, or the first one starting from it.
				while (low <= high) {
					const middle = (low + high) >> 1;
					if (ending ? offsets[middle] <= pos : offsets[middle] < pos) {
						low = middle + 1;
					} else {
						high = middle - 1;
					}
				}
				lastFound = low;
				let index = ending ? high : low;
				if (forward !== undefined && index >= 0) {
					// What terser's `peek()` holds: a token the parse may not have read
					// when a node is given it, and the one past the source where the
					// parse ends before reaching that far.
					index += forward;
					if (index >= count) return base + index;
				}
				return index < 0 || index >= count ? undefined : base + index;
			},
			table: {
				base,
				// The tokens past what the parse read, a forward look's at most.
				size: () => count + 3,
				token: build,
				commentsOf: (
					/** @type {number} */ index,
					/** @type {boolean} */ after
				) =>
					reader.commentsOf(
						finished && index >= count ? count - 1 : index,
						after
					),
				// Read once the parse is over, when only gaps holding comments are kept.
				forEachCommentGap: (
					/** @type {(index: number, comments: Comment[]) => void} */ callback
				) => {
					for (const [gap, list] of /** @type {Map<number, Comment[]>} */ (
						lists
					)) {
						callback(gap, list);
					}
				},
				// Read once the parse is over: by token, whether a comment is read
				// before it (1) or after it (2), which the rest are never asked for.
				commentFlags: () => {
					const size = count + 3;
					const flags = new Uint8Array(size);
					const gaps = /** @type {Uint8Array} */ (commentedGaps);
					for (let gap = 0; gap < gaps.length && gap <= size; gap++) {
						if (gaps[gap] === 0) continue;
						if (gap < size) flags[gap] |= 1;
						if (gap > 0) flags[gap - 1] |= 2;
					}
					if (boundBefore !== null) {
						for (const [index, list] of boundBefore) {
							flags[index] =
								list.length === 0 ? flags[index] & ~1 : flags[index] | 1;
						}
					}
					if (boundAfter !== null) {
						for (const [index, list] of boundAfter) {
							flags[index] =
								list.length === 0 ? flags[index] & ~2 : flags[index] | 2;
						}
					}
					// What the parse never read reads the last token's, as `commentsOf` has it.
					for (let i = count; i < size; i++) flags[i] = flags[count - 1];
					return flags;
				},
				// Read as the parse ends, before only gaps holding comments are kept.
				keptComments: (/** @type {(comment: Comment) => boolean} */ test) => {
					const gaps = /** @type {CommentGaps} */ (lists);
					let kept = 0;
					for (const gap of listed) {
						const list = /** @type {Comment[]} */ (gaps[gap]);
						for (let i = 0; i < list.length; i++) {
							if (!test(list[i])) continue;
							if (gap !== 0) return 2;
							kept = 1;
							break;
						}
					}
					return kept;
				},
				// Read as the parse ends too: what only a source map or a reader of
				// the tokens asks of a comment.
				placeComments: () => {
					const starts =
						lineStarts === null ? buildLineStarts(source) : lineStarts;
					lineStarts = starts;
					const gaps = /** @type {CommentGaps} */ (lists);
					for (const gap of listed) {
						// `read` made each one a token.
						const list = /** @type {ParsedToken[]} */ (
							/** @type {unknown} */ (gaps[gap])
						);
						for (const comment of list) {
							const { line, column } =
								/** @type {{ line: number, column: number }} */ (
									positionAt(starts, comment.pos)
								);
							comment.line = line;
							comment.col = column;
						}
					}
				},
				outerCounts: new Map()
			}
		};
	};

	// The parse options read, each at its default; any other is refused.
	/** @type {{ bare_returns: boolean, ecma: number | null, filename: string | null, html5_comments: boolean, module: boolean, shebang: boolean, toplevel: Node | null }} */
	const PARSE_DEFAULTS = {
		bare_returns: false,
		ecma: null,
		filename: null,
		html5_comments: true,
		module: false,
		shebang: true,
		toplevel: null
	};

	/**
	 * @param {string} source the source
	 * @param {typeof PARSE_DEFAULTS & { [PARSE_FUNCTION_BODY]?: "commonjs" | "event-handler" }} options terser's parse options
	 * @returns {import("./syntax-parser").Options & { importPhases: boolean, lazyNodes: boolean }} what to ask webpack's parser for
	 */
	const parserOptions = (source, options) => {
		const body = options[PARSE_FUNCTION_BODY];
		const functionBody = body !== undefined;
		return {
			ecmaVersion: "latest",
			// acorn's `commonjs` reads the program as a function's body.
			sourceType: functionBody
				? "commonjs"
				: options.module
					? "module"
					: "script",
			sourceFile: options.filename === null ? undefined : options.filename,
			// terser's parser keeps a parenthesis in the tokens of the expression it
			// holds, which the printer and the source map both read.
			preserveParens: true,
			// WHY: `await` outside a module is an ordinary name a script may call, so
			// reading it as the operator turns `await(x)` into `await x`, which no
			// longer parses. The other two cannot change what a name means, and a
			// bundled asset holds `super` outside a method.
			allowReturnOutsideFunction: Boolean(options.bare_returns),
			allowAwaitOutsideFunction: Boolean(options.module),
			allowSuperOutsideMethod: true,
			allowHashBang:
				body !== "event-handler" &&
				Boolean(options.shebang) &&
				source.startsWith("#!"),
			// terser reads module syntax in a script too, and `import defer`.
			allowImportExportEverywhere: !functionBody && !options.module,
			importPhases: true,
			lazyNodes: true
		};
	};

	/**
	 * Parses a source with webpack's parser, its tokens and comments kept as
	 * terser's tokenizer leaves them, and converts what it read.
	 * @template T
	 * @param {string} text the source
	 * @param {typeof PARSE_DEFAULTS} options terser's parse options, defaulted
	 * @param {string | null} filename what its tokens name as their file
	 * @param {number} base the number of its first token
	 * @param {(options: import("./syntax-parser").Options & { importPhases: boolean, lazyNodes: boolean }, tokenAt: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable) => { parse(): import("./syntax-parser").Program }} createParser makes the parser to read it with, given its options
	 * @param {(program: import("./syntax-parser").Program, tokenAt: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable) => T} convert what to make of the parsed program, before the tokens are narrowed
	 * @param {boolean=} placesLater whether a comment's line and column wait for the table's `placeComments`
	 * @returns {{ result: T, table: TokenTable }} what `convert` made, and the table the tokens' numbers are read through
	 */
	const readSource = (
		text,
		options,
		filename,
		base,
		createParser,
		convert,
		placesLater
	) => {
		/** @type {T | undefined} */
		let result;
		/** @type {TokenTable | undefined} */
		let table;
		try {
			const tokens = collectTokens(text, filename, base, placesLater);
			table = tokens.table;
			if (options.shebang !== false && text.startsWith("#!")) {
				// The hashbang ends at the first line terminator, whichever it is.
				const line = text.search(/[\n\r\u2028\u2029]/);
				tokens.shebang(text.slice(2, line === -1 ? text.length : line));
			}
			const parser = createParser(
				{
					...parserOptions(text, options),
					onComment: tokens.onComment,
					// The parser itself at each token, which keeps its token fast path
					// and spares a token object a reader would only copy from.
					onTokenRead: tokens.onToken
				},
				tokens.at,
				table
			);
			result = convert(parser.parse(), tokens.at, table);
			tokens.finish();
		} catch (error) {
			const { loc, pos } =
				/** @type {{ loc?: { line: number, column: number }, pos: number }} */ (
					error
				);
			if (!(error instanceof SyntaxError) || !loc) throw error;
			// The message without the position webpack's parser appends to it.
			const { message } = error;
			throwParseError(
				message.slice(0, message.lastIndexOf(` (${loc.line}:${loc.column})`)),
				filename,
				loc.line,
				loc.column,
				pos
			);
		}
		return {
			result,
			table
		};
	};

	/**
	 * terser's `parse` of one source into a `SyntaxTree` rather than terser's
	 * nodes, with the tokens and comments `parse` reads.
	 * @template T
	 * @param {string} text the source
	 * @param {ParseOptions} givenOptions terser's parse options
	 * @param {(tree: SyntaxTree, program: number, tokenAt: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable) => T} readTokens what to read off the tree's tokens, before they are narrowed
	 * @param {boolean=} placesLater whether a comment's line and column wait for the table's `placeComments`
	 * @returns {{ tree: SyntaxTree, program: number, tables: TokenTables, read: T, module: boolean }} the tree, its program, the tables its tokens' numbers are read through, what `readTokens` read, and whether it imports or exports
	 */
	parse.parseTree = (text, givenOptions, readTokens, placesLater) => {
		const options = defaults(givenOptions, PARSE_DEFAULTS, true);
		const filename =
			typeof options.filename === "string" ? options.filename : null;
		const tables = new TokenTables();
		const tree = new SyntaxTree();
		let program = 0;
		let module = false;
		/** @type {{ result: T, table: TokenTable }} */
		let source;
		try {
			source = readSource(
				text,
				options,
				filename,
				tables.nextBase(),
				(parserOptions) =>
					new WebpackParser({ ...parserOptions, syntaxTree: tree }, text),
				(written, tokenAt, ownTable) => {
					program = /** @type {number} */ (/** @type {unknown} */ (written));
					const count = tree.fieldCount(Field.body, program);
					for (let i = 0; i < count && !module; i++) {
						const type = tree.type(tree.field(i, Field.body, program));
						module =
							type === NodeType.ImportDeclaration ||
							type === NodeType.ExportNamedDeclaration ||
							type === NodeType.ExportDefaultDeclaration ||
							type === NodeType.ExportAllDeclaration;
					}
					return readTokens(tree, program, tokenAt, ownTable);
				},
				placesLater
			);
		} catch (error) {
			tree.release();
			throw error;
		}
		const { result: read, table } = source;
		tables.add(table);
		return { tree, program, tables, read, module };
	};
};

// The alphabet terser names mangled identifiers from: a name opens with one of
// the first, and continues with those or a digit.
const IDENTIFIER_LEADING =
	"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$_";
const IDENTIFIER_DIGITS = "0123456789";

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
 * terser's compressor: the methods the phases call typed, the rest open.
 * @typedef {{
 * options: Partial<CompressOptions>,
 * stack: NodeShape[],
 * option<K extends keyof CompressOptions>(name: K): CompressOptions[K],
 * has_directive(directive: string): NodeShape | true | undefined,
 * parent(level?: number): NodeShape,
 * self(): NodeShape,
 * find_parent(test: NodeTest): NodeShape | undefined,
 * in_boolean_context(): boolean | undefined,
 * [key: string]: EXPECTED_ANY,
 * }} CompressorShape
 */
/**
 * terser's compress options, defaulted, as the compressor reads them.
 * @internal
 * @typedef {object} CompressOptions
 * @property {boolean} arguments whether `arguments[i]` is read as the parameter
 * @property {boolean} arrows whether functions become arrows
 * @property {boolean} booleans whether booleans are simplified
 * @property {boolean} booleans_as_integers whether booleans are written as 0 and 1
 * @property {boolean} collapse_vars whether single-use variables are collapsed
 * @property {boolean} comparisons whether comparisons are simplified
 * @property {boolean} computed_props whether constant computed keys become plain
 * @property {boolean} conditionals whether conditionals are simplified
 * @property {boolean} dead_code whether unreachable code is dropped
 * @property {boolean} defaults whether the options default to on
 * @property {boolean} directives whether redundant directives are dropped
 * @property {boolean | string[]} drop_console whether `console` calls are dropped, or which of its methods
 * @property {boolean} drop_debugger whether `debugger` statements are dropped
 * @property {number} ecma which edition the output may use
 * @property {number} builtins_ecma which edition's builtins may be assumed
 * @property {boolean} builtins_pure whether builtins are assumed unmodified
 * @property {boolean} evaluate whether constant expressions are evaluated
 * @property {boolean} expression whether the tree is one expression, its value kept
 * @property {false | { [key: string]: EvaluatedValue | Node }} global_defs the globals replaced, by name, each any value a node is built from
 * @property {boolean} hoist_funs whether function declarations are hoisted
 * @property {boolean} hoist_props whether object properties are hoisted into variables
 * @property {boolean} hoist_vars whether `var` declarations are hoisted
 * @property {boolean} ie8 whether the output works around that engine
 * @property {boolean} if_return whether `if`s returning are simplified
 * @property {boolean | number} inline how far calls are inlined, `true` read as 3
 * @property {boolean} join_vars whether neighboring declarations are joined
 * @property {boolean | RegExp} keep_classnames which class names survive
 * @property {boolean | "strict"} keep_fargs whether unused parameters are kept
 * @property {boolean | RegExp} keep_fnames which function names survive
 * @property {boolean} keep_infinity whether `Infinity` is kept as written
 * @property {boolean} lhs_constants whether constants move to the left of comparisons
 * @property {boolean} loops whether loops are simplified
 * @property {boolean} module whether the source is a module
 * @property {boolean} negate_iife whether an immediately called function is negated
 * @property {number} passes how many times the compressor runs
 * @property {boolean} properties whether property reads are rewritten as dots
 * @property {boolean | "strict"} pure_getters whether reading a property has no side effect
 * @property {string[] | ((node: Node) => boolean) | null} pure_funcs the calls assumed pure, or what answers whether one is not
 * @property {boolean} pure_conversions whether conversions are assumed to have no side effect
 * @property {boolean} pure_heritage whether a class's heritage is assumed a constructor
 * @property {boolean} pure_new whether `new` of a pure constructor is pure
 * @property {boolean} reduce_funcs whether single-use functions are inlined
 * @property {boolean} reduce_vars whether variables assigned constants are replaced
 * @property {boolean | number} sequences whether statements are joined into sequences, or how many
 * @property {boolean} side_effects whether side-effect-free statements are dropped
 * @property {boolean} switches whether `switch`es are simplified
 * @property {string | string[] | RegExp | ((definition: NamedDefinition) => boolean) | null} top_retain the top-level names kept
 * @property {boolean | string} toplevel whether top-level names may be dropped, or which kinds
 * @property {boolean} typeofs whether `typeof` comparisons are simplified
 * @property {boolean} unsafe whether unsafe transforms run
 * @property {boolean} unsafe_arrows whether functions become arrows where `this` is unread
 * @property {boolean} unsafe_comps whether comparisons are reversed unsafely
 * @property {boolean} unsafe_Function whether `Function` calls are compressed
 * @property {boolean} unsafe_math whether arithmetic is folded unsafely
 * @property {boolean} unsafe_symbols whether symbol descriptions are dropped
 * @property {boolean | RegExp} unsafe_methods whether methods become arrows, or which
 * @property {boolean} unsafe_proto whether prototype reads are shortened
 * @property {boolean} unsafe_regexp whether regular expressions in variables are inlined
 * @property {boolean} unsafe_undefined whether `undefined` is replaced by a variable
 * @property {boolean | "keep_assign"} unused whether unused names are dropped
 * @property {boolean | "verbose"} warnings whether warnings are reported
 */

/**
 * terser's output stream, as webpack's `MinifiedOutput` implements it: what it
 * has written, where it is, and the members terser's code generators call. It
 * prints ESTree nodes, or a parsed tree's nodes by their index.
 * @internal
 * @template [N=PrintNode]
 * @typedef {OutputStreamText & OutputStreamNodes<N>} OutputStream
 */
/**
 * The members of an output stream that read the printed nodes, as methods so
 * a helper taking either kind of node prints into either kind of stream.
 * @internal
 * @template N
 * @typedef {{ nodeAccess: NodeAccess<N>, stack: N[], use_asm: N | null, active_scope: N | null, prepend_comments(node: N): void, claimPrependComments(node: N, valueOnly?: boolean): PrependComments | undefined, append_comments(node: N, tail?: boolean): void, claimAppendComments(node: N, tail?: boolean): AppendComments | undefined, push_node(node: N): void, pop_node(): N, parent(n?: number): N | undefined }} OutputStreamNodes
 */
/**
 * The members of an output stream that read no printed node.
 * @internal
 * @typedef {object} OutputStreamText
 * @property {FormatSettings} options the format options, defaulted
 * @property {boolean} readonly whether it is printed for its text alone, which drops every comment
 * @property {CommentFilter} commentFilter which comments are printed
 * @property {boolean} appendsComments whether comments after a node are printed
 * @property {SourceMapBuilder | null} sourceMap where mappings are recorded, null for none
 * @property {string[]} parts the text written, in parts not yet joined
 * @property {number} partsLength the length of the parts
 * @property {string} current the text written since the parts
 * @property {((part: string) => void) | undefined} consumePart takes the parts before the last two in batches, where set
 * @property {boolean} wroteComments whether a comment, shebang or preamble was written
 * @property {number} currentColumn the column written to, from 0
 * @property {number} currentLine the line written to, from 1
 * @property {number} currentPosition the offset written to
 * @property {boolean} hasParentheses whether the last thing printed opened a parenthesis
 * @property {boolean} mightNeedSpace whether a space may be needed before what is printed next
 * @property {boolean} mightNeedSemicolon whether a semicolon may be needed before what is printed next
 * @property {boolean} needNewlineIndented whether a line break is needed before what is printed next
 * @property {boolean} needSpace whether a space is needed before what is printed next
 * @property {string} lastPrinted the last text printed
 * @property {NodeToken | number | false | null | undefined} mappingToken the token the next text maps back to, or its number, false or nothing for none
 * @property {TokenTables} tokenTables what the printed tree's token numbers are read through
 * @property {string | false | undefined} mappingName the name the next mapping carries, false for none
 * @property {boolean} in_directive whether a directive is printed
 * @property {Set<Comment | Comment[]>} printed_comments the comments and comment lists printed so far
 * @property {(str: string, identifier?: boolean, regexp?: boolean) => string} to_utf8 a string as the options let it print
 * @property {(str: string, identifier?: boolean, regexp?: boolean) => string} identifierToUtf8 a name as the options let it print
 * @property {(str: string, quote?: string) => string} encode_string a string's value written as a literal
 * @property {(str: string, quote?: string) => string} makeString a string's value written as a literal
 * @property {(str: string) => void} append writes text as it is
 * @property {(index: number) => number} codeAt the code of a character written, by its offset
 * @property {() => number} writtenLength how much was written
 * @property {() => boolean} expectDirective whether what is printed next may read as a directive
 * @property {() => boolean} hasNLB whether a line break comes last
 * @property {() => boolean} atStart whether nothing is printed yet
 * @property {(taken: PrependComments) => void} printPrependComments prints the comments `claimPrependComments` took
 * @property {(taken: AppendComments) => void} printAppendComments prints the comments `claimAppendComments` took
 * @property {(value: string | number) => void} print prints text, keeping the tokens apart
 * @property {() => void} endProgram ends a program with the semicolon its last statement owes, unless a function's body leaves it to the brace closing it
 * @property {(token: NodeToken | number, name: string | false | undefined) => void} addMapping records a mapping
 * @property {(token: NodeToken | number | null | undefined, name?: string | false) => void} add_mapping the token the next text maps back to, none for a node the compressor made
 * @property {() => string} get what was written
 * @property {() => string} toString what was written
 * @property {() => void} indent writes nothing, as minified output does not indent
 * @property {() => void} newline writes nothing, as minified output breaks no line
 * @property {() => number} indentation 0, as minified output does not indent
 * @property {() => number} current_width the column written to
 * @property {() => number | boolean} should_break truthy once the line reaches `width`
 * @property {() => boolean} has_parens whether the last thing printed opened a parenthesis
 * @property {() => void} star prints `*`
 * @property {() => void} space prints a space where one is needed
 * @property {() => void} comma prints `,`
 * @property {() => void} colon prints `:`
 * @property {() => string} last the last text printed
 * @property {() => void} semicolon prints `;` where one is needed
 * @property {() => void} force_semicolon prints `;`
 * @property {(name: string) => void} print_name prints an identifier
 * @property {(str: string, quote?: string, escapeDirective?: boolean) => void} print_string prints a string's value as a literal
 * @property {(str: string) => void} print_template_string_chars prints a template's text
 * @property {() => number} next_indent 0, as minified output does not indent
 * @property {<T>(column: number, content: () => T) => T} with_indent runs `content`, as minified output does not indent
 * @property {<T>(content: () => T) => T} with_block prints braces around what `content` prints
 * @property {<T>(content: () => T) => T} with_parens prints parentheses around what `content` prints
 * @property {<T>(content: () => T) => T} with_square prints brackets around what `content` prints
 * @property {<K extends keyof FormatSettings>(name: K) => FormatSettings[K]} option a format option's value
 * @property {(scope: Node) => void} gc_scope frees a function just printed, where `_destroy_ast` asks
 * @property {(comment: string) => string} filterComment what is printed of a comment's text
 * @property {() => number} line the line written to
 * @property {() => number} col the column written to
 * @property {() => number} pos the offset written to
 */
/**
 * terser's `format` options, defaulted, as the stream reads them.
 * @internal
 * @typedef {object} FormatSettings
 * @property {boolean} ascii_only whether only ASCII is written
 * @property {boolean} beautify whether the output is laid out to read, always false here
 * @property {boolean} braces whether every body is braced, always false here
 * @property {boolean | string | RegExp | ((node: CommentedNode, comment: KeptComment) => boolean)} comments which comments are kept
 * @property {number} ecma which edition the output may use
 * @property {boolean} ie8 whether the output works around that engine
 * @property {number} indent_level how far a level indents, unread here
 * @property {number} indent_start how far the output indents, unread here
 * @property {boolean} inline_script whether `</script` is escaped
 * @property {boolean} keep_numbers whether numbers are written as read
 * @property {boolean} keep_quoted_props whether quoted keys stay quoted
 * @property {number | false} max_line_len how long a line may be, unread here
 * @property {string | null} preamble text written first
 * @property {boolean} preserve_annotations whether annotation comments are kept
 * @property {boolean} quote_keys whether every key is quoted
 * @property {number} quote_style which quote strings are written with
 * @property {boolean} safari10 whether the output works around that engine
 * @property {boolean} semicolons whether statements end in semicolons rather than line breaks
 * @property {boolean} shebang whether a shebang is kept
 * @property {boolean | undefined} shorthand whether properties are written in shorthand, undefined until read from `ecma`
 * @property {SourceMapBuilder | null} source_map where mappings are recorded
 * @property {boolean} webkit whether the output works around that engine
 * @property {number} width how wide a line may be, unread here
 * @property {boolean} wrap_iife whether an immediately called function is parenthesized
 * @property {boolean} wrap_func_args whether a function passed as an argument is parenthesized
 * @property {boolean} _destroy_ast whether a function printed is freed
 * @property {boolean} _function_body whether the program printed is a function's body, its last semicolon left to the brace closing it
 */
/** @typedef {FormatSettings[keyof FormatSettings]} FormatSettingValue any one format option's value */

/**
 * A literal with its `\t` or `\n` escapes, as asked, written as the character
 * each stands for: one byte where the escape is two. A tab is legal in any
 * quoted string, a line break in a template alone.
 * @param {string} literal a quoted string or template literal
 * @param {boolean} tabs whether its `\t` escapes are written raw
 * @param {boolean} lineBreaks whether its `\n` escapes are written raw
 * @returns {string} the same literal, those escapes unescaped
 */
const unescapeWhitespace = (literal, tabs, lineBreaks) => {
	let result = "";
	let start = 0;
	// Each backslash takes the character after it, so `\\t` stays as it is.
	for (
		let i = literal.indexOf("\\");
		i !== -1;
		i = literal.indexOf("\\", i + 2)
	) {
		const code = literal.charCodeAt(i + 1);
		if ((tabs && code === 116) || (lineBreaks && code === 110)) {
			result += `${literal.slice(start, i)}${code === 116 ? "\t" : "\n"}`;
			start = i + 2;
		}
	}
	return result + literal.slice(start);
};

// A program writes its strings' line breaks raw once its source spells `\n`
// this many times, and at least once in this many characters.
const LINE_BREAK_ESCAPES = 1000;
const LINE_BREAK_SPACING = 500;

/** @typedef {{ enabled: boolean, lets: { enabled: boolean }, literalsLast: { enabled: boolean }, backticks: { enabled: boolean } }} Improvements the switch the improvements read, one for writing `const` as `let` alone, one for writing a literal after what an equality compares it with, and one for writing a program's strings as templates */

/**
 * Installs the improvements the node printer reads: their switches, a string's
 * tabs written raw, and what writes a string's line breaks raw in a template.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installImprove = (modules) => {
	/** @type {Improvements} */
	const improvements = {
		enabled: true,
		lets: { enabled: true },
		literalsLast: { enabled: true },
		backticks: { enabled: true }
	};
	modules.improvements = improvements;

	const { prototype: output } = modules.MinifiedOutput;
	const { makeString: makeTerserString } = output;
	/**
	 * Whether a string writes its tabs raw: a long one holding several, as a
	 * short one's `\t` gzips better kept, matching the escapes near it.
	 * @param {string} str a string's value
	 * @returns {boolean} true when it does
	 */
	const writesTabsRaw = (str) =>
		str.length >= 100 && str.indexOf("\t") !== str.lastIndexOf("\t");
	/**
	 * terser's string literal, its tabs written raw where `writesTabsRaw` says.
	 * @param {string} str a string's value
	 * @param {string=} quote the quote it was written with
	 * @returns {string} the string literal
	 */
	output.makeString = function makeString(str, quote) {
		const literal = makeTerserString.call(this, str, quote);
		return improvements.enabled && quote !== "`" && writesTabsRaw(str)
			? unescapeWhitespace(literal, true, false)
			: literal;
	};

	/**
	 * @param {string} text a source
	 * @returns {number} how many `\n` escapes it spells
	 */
	const countLineBreakEscapes = (text) => {
		let escapes = 0;
		for (
			let i = text.indexOf("\\n");
			i !== -1;
			i = text.indexOf("\\n", i + 2)
		) {
			escapes++;
		}
		return escapes;
	};
	/**
	 * Whether strings write their line breaks raw, as templates: only where
	 * their source spells `\n` often and densely, since gzip codes a raw line
	 * break short only once it is frequent, and a mix breaks repeats.
	 * @param {number} escapes how many `\n` escapes the source spells
	 * @param {number} length how long the source is
	 * @returns {boolean} true when they do
	 */
	const spellsLineBreaksDensely = (escapes, length) =>
		escapes >= LINE_BREAK_ESCAPES && escapes * LINE_BREAK_SPACING >= length;
	/**
	 * A string's value as a template literal, its line breaks written raw.
	 * @param {OutputStream<PrintNode | number>} stream the stream printed into
	 * @param {string} str the value
	 * @param {boolean} tabs whether its tabs are written raw too
	 * @returns {string} the template literal
	 */
	const templateOf = (stream, str, tabs) => {
		let literal = stream.encode_string(str, "`");
		if (literal.includes("${")) literal = literal.replace(/\${/g, "\\${");
		return unescapeWhitespace(literal, tabs, true);
	};
	/**
	 * @param {OutputStream<PrintNode | number>} stream the stream printed into
	 * @param {string} text a program's source
	 * @returns {boolean} whether its strings write their line breaks raw
	 */
	const writesLineBreaksRawIn = (stream, text) =>
		improvements.enabled &&
		stream.option("ecma") >= 2015 &&
		spellsLineBreaksDensely(countLineBreakEscapes(text), text.length);
	modules.lineBreakTemplates = {
		writesLineBreaksRawIn,
		writesTabsRaw,
		lineBreakTemplate: templateOf
	};
};

/** @typedef {"sloppy" | number} NativeCondition `unsafe`, or `builtins_ecma >= N` */
/** @typedef {string | { name: string, when: NativeCondition[] }} NativeName a name and what it is gated on */
/** @typedef {{ when?: NativeCondition[], names: NativeName[] }} NativeGroup a global's names and what they are gated on */

// What terser's `regexp_source_fix` writes in place of each line terminator.
const LINE_TERMINATOR_ESCAPES = {
	"\0": "0",
	"\n": "n",
	"\r": "r",
	"\u2028": "u2028",
	"\u2029": "u2029"
};

/**
 * terser's `regexp_source_fix`: escapes each line terminator, and `\0`, a
 * regular expression's source holds, where no backslash escapes it already.
 * @param {string} source a regular expression's source
 * @returns {string} the source escaped
 */
const regexpSourceFix = (source) =>
	source.replace(
		/[\0\n\r\u2028\u2029]/g,
		/**
		 * Escapes one line terminator, where no backslash escapes it.
		 * @param {string} match the line terminator
		 * @param {number} offset its offset in the source
		 * @returns {string} the line terminator, escaped where it needs to be
		 */
		(match, offset) => {
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
		}
	);

// terser's order for a regular expression's flags; any it does not know follow.
const REGEXP_FLAG_ORDER = "dgimsuyv";

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
	// Every other spelling of an integer below 1000 is as long or longer.
	if (num >= 0 && num < 1000 && Math.floor(num) === num) return `${num}`;
	const str = num.toString(10).replace(/^0\./, ".").replace("e+", "e");
	const candidates = [str];
	if (Math.floor(num) === num) {
		candidates.push(
			num < 0
				? `-0x${(-num).toString(16).toLowerCase()}`
				: `0x${num.toString(16).toLowerCase()}`
		);
	}
	/** @type {RegExpExecArray | null} */
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
 * terser's `print_property_name`, over the reserved words its parser reads.
 * @param {TerserModules} modules terser's modules
 * @returns {PrintPropertyName} the printer of a property's name
 */
const createPrintPropertyName = (modules) => {
	const { ALL_RESERVED_WORDS } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string> }} */ (modules.parse);
	const unicode = createUnicode();
	/**
	 * @param {string} key the property name
	 * @param {string | undefined} quote the quote it was written with
	 * @param {OutputStream<PrintNode | number>} output the stream printed into
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
				makeNum(/** @type {number} */ (/** @type {number | string} */ (key)))
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
	return printPropertyName;
};

/** @typedef {(key: string, quote: string | undefined, output: OutputStream<PrintNode | number>) => boolean} PrintPropertyName prints a property's name, answering whether it printed as a bare name */

/**
 * A string's spelling made safe in an inline `<script>`, as `encode_string`
 * makes a value: each escape added reads as what it replaces.
 * @param {string} spelling the text between a string's quotes
 * @returns {string} the same string, spelled so no `</script` or `<!--` shows
 */
const inlineScriptSpelling = (spelling) =>
	spelling
		.replace(/<\u002F(script)([>/\t\n\f\r ])/gi, "<\\/$1$2")
		// An escaped `\<` gives its backslash up to the `\x3c` taking its place.
		.replace(
			/(\\*)\u003C!--/g,
			/**
			 * Escapes one `<!--`, giving an escaping backslash up to the escape.
			 * @param {string} _match the `<!--` and the backslashes before it
			 * @param {string} slashes the backslashes
			 * @returns {string} the `<!--` escaped
			 */
			(_match, slashes) =>
				`${slashes.length % 2 === 1 ? slashes.slice(1) : slashes}\\x3c!--`
		)
		.replace(/--\u003E/g, "--\\x3e");

/**
 * @param {IdentifierSource} identifiers an identifier source
 * @returns {identifiers is Required<IdentifierSource>} whether it orders its names by the characters counted
 */
const countsFrequency = (identifiers) =>
	Boolean(identifiers.reset && identifiers.consider && identifiers.sort);

// What the tree printer marks a node with beyond its type: a property of a
// binding pattern, whose key terser quotes its own way, and a number too large
// for a double, which terser reads as the name `Infinity`.
const MARK_BINDING_PROPERTY = 1;
const MARK_INFINITY = 2;

/**
 * Where each node of a `SyntaxTree` starts and ends among its parse's tokens,
 * and what terser's conversion makes of it, by node.
 * @typedef {object} TreeTokens
 * @property {Int32Array} starts each node's first token's number, 0 for none
 * @property {Int32Array} ends each node's last token's number, 0 for none
 * @property {Uint8Array} types each node's `NodeType`, as terser's conversion types it
 * @property {Uint8Array} marks each node's `MARK_` bits
 * @property {number} first the number of the source's first token
 */

/**
 * What mangling gave a source `parse.parseTree` read, for the tree printer.
 * @typedef {object} TreeNames
 * @property {TreeDefinition[]} definitions each name's definition, by its node
 * @property {Map<string, string> | null} privateNames each private name's new name, null for none renamed
 * @property {MangleRecording | null} recorded where the result was printed while mangling, what `patchRecording` rewrites
 * @property {string} text what that print wrote
 * @property {number[] | null} aliases for the one pass, the declarators whose name no read reads any more
 * @property {number[] | null} movedFunctions for the one pass, each declarator of a function read once and that read, in pairs
 * @property {((unprinted: Set<MinifierVariable> | null, readsGone: Map<TreeDefinition, number> | null) => void) | null} nameDefinitions for the one pass, names the definitions but those it finds no name of prints, once it found what prints and how many reads of each go
 * @property {PropertyNames | null} properties for the one pass, the names property mangling gives, null where properties keep theirs
 * @property {Set<number> | null} propertyStrings for the one pass, the string literals renamed as property names
 */

/**
 * A source `parse.parseTree` read for the tree printer.
 * @typedef {object} ParsedTree
 * @property {SyntaxTree} tree the tree
 * @property {number} program its program
 * @property {TokenTables} tables what its tokens' numbers are read through
 * @property {TreeTokens | null} read its nodes' tokens, null where nothing printing it reads them
 * @property {boolean} module whether it imports or exports
 */

/**
 * Installs what reads a source `parse.parseTree` read into a `SyntaxTree` for
 * the one pass: its nodes' tokens, the names mangling gives and the properties.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installTreePrint = (modules) => {
	const { Field, Flag, NodeType, Part } = require("./syntax-parser");
	const { NODE_FIELDS } = require("./data");

	const fieldsByName = /** @type {Record<string, number>} */ (Field);
	const typesByName = /** @type {Record<string, number>} */ (NodeType);

	// Each node type's fields holding nodes, in the tree's order.
	/** @type {number[][]} */
	const CHILD_FIELDS = [];
	for (const name of Object.keys(NODE_FIELDS)) {
		/** @type {number[]} */
		const fields = [];
		const spec = NODE_FIELDS[name];
		for (const part of spec === "" ? [] : spec.split(" ")) {
			const [fieldName, kind] = part.split(":");
			if (kind === "node" || kind === "list") {
				fields.push(fieldsByName[fieldName]);
			}
		}
		CHILD_FIELDS[typesByName[name]] = fields;
	}
	// The types after which the stream lets a line comment follow.
	const STATEMENT_TYPES = new Uint8Array(CHILD_FIELDS.length);
	for (const name of ESTREE_STATEMENT_TYPES) {
		STATEMENT_TYPES[typesByName[name]] = 1;
	}

	/**
	 * @param {number} type a node's type
	 * @param {number} field one of its fields
	 * @param {boolean} binding whether the node is part of a binding pattern
	 * @returns {boolean} whether what the field holds is
	 */
	const bindsIn = (type, field, binding) => {
		switch (type) {
			case NodeType.FunctionDeclaration:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
				return field === Field.params;
			case NodeType.VariableDeclarator:
				return field === Field.id;
			case NodeType.CatchClause:
				return field === Field.param;
			case NodeType.ObjectPattern:
			case NodeType.ArrayPattern:
			case NodeType.RestElement:
				return binding;
			case NodeType.AssignmentPattern:
				return binding && field === Field.left;
			case NodeType.Property:
				return binding && field === Field.value;
			default:
				return false;
		}
	};

	/**
	 * Reads the tokens each node starts and ends at as terser's conversion gives
	 * them, binding a parenthesis's comments as it does: the parenthesized
	 * expression takes the parentheses' tokens.
	 * @param {SyntaxTree} tree the tree
	 * @param {number} program its program
	 * @param {(pos: number, ending: boolean, forward?: number) => number | undefined} at the token at an offset
	 * @param {TokenTable} table the table the tokens' numbers are read through
	 * @returns {TreeTokens} what was read
	 */
	const readTreeTokens = (tree, program, at, table) => {
		// The program is the last node the parser makes.
		const capacity = program + 1;
		const starts = new Int32Array(capacity);
		const ends = new Int32Array(capacity);
		const types = new Uint8Array(capacity);
		const marks = new Uint8Array(capacity);

		/**
		 * @param {number} pos an offset
		 * @param {boolean} ending true for the last token ending by it, else the first starting from it
		 * @param {number=} forward how many tokens further on
		 * @returns {number} the token's number, 0 for none
		 */
		const tokenAt = (pos, ending, forward) => {
			const token = at(pos, ending, forward);
			return token === undefined ? 0 : token;
		};

		/**
		 * @param {number} number a token's number, 0 for none
		 * @returns {SourceToken | undefined} the token, undefined for none
		 */
		const tokenOf = (number) =>
			number === 0 ? undefined : table.token(number - table.base);

		/**
		 * @param {number} node a node, a parenthesis among them
		 * @param {boolean} binding whether it is part of a binding pattern
		 * @returns {void}
		 */
		const readChild = (node, binding) => {
			if (tree.type(node) === NodeType.ParenthesizedExpression) {
				readParenthesized(node);
			} else {
				read(node, binding);
			}
		};

		/**
		 * @param {number} node a node not a parenthesis
		 * @param {boolean} binding whether it is part of a binding pattern
		 * @returns {void}
		 */
		const read = (node, binding) => {
			const type = tree.type(node);
			let printedType = type;
			starts[node] = tokenAt(tree.start(node), false);
			ends[node] = tokenAt(tree.end(node), true);
			switch (type) {
				case NodeType.SequenceExpression:
					// terser reads a sequence's end off `peek()`, past the token after it.
					ends[node] = tokenAt(tree.end(node), true, 2);
					break;
				case NodeType.ArrowFunctionExpression:
					ends[node] = 0;
					break;
				case NodeType.Property: {
					// terser's parser opens a computed property at its `[`, but a
					// binding pattern's at its key, as its conversion does.
					const key = tree.field(0, Field.key, node);
					const opensAt =
						!binding && tree.flag(Flag.computed, node) ? node : key;
					starts[node] = tokenAt(tree.start(opensAt), false);
					ends[node] = tokenAt(
						tree.end(tree.field(0, Field.value, node)),
						true
					);
					if (binding) marks[node] = MARK_BINDING_PROPERTY;
					break;
				}
				case NodeType.FunctionDeclaration:
					if (tree.field(0, Field.id, node) === 0) {
						printedType = NodeType.FunctionExpression;
					}
					break;
				case NodeType.ClassDeclaration:
					if (tree.field(0, Field.id, node) === 0) {
						printedType = NodeType.ClassExpression;
					}
					break;
				case NodeType.Literal:
					if (tree.value(node) === Infinity) {
						printedType = NodeType.Identifier;
						marks[node] = MARK_INFINITY;
					}
					break;
				case NodeType.ImportAttribute:
					printedType = NodeType.Property;
					break;
				default:
			}
			types[node] = printedType;
			const fields = CHILD_FIELDS[type];
			for (let f = 0; f < fields.length; f++) {
				const field = fields[f];
				const childBinding = bindsIn(type, field, binding);
				const count = tree.fieldCount(field, node);
				for (let i = 0; i < count; i++) {
					const child = tree.field(i, field, node);
					if (child !== 0) readChild(child, childBinding);
				}
			}
		};

		/**
		 * @param {number} paren a parenthesized expression
		 * @returns {number} the expression it holds, past any other parentheses
		 */
		const readParenthesized = (paren) => {
			const inner = tree.field(0, Field.expression, paren);
			let expression = inner;
			if (tree.type(inner) === NodeType.ParenthesizedExpression) {
				expression = readParenthesized(inner);
			} else {
				read(inner, false);
				// terser reads a sequence's end off `peek()` once the parenthesis
				// holding it is read, so it ends two tokens past the close.
				if (tree.type(inner) === NodeType.SequenceExpression) {
					ends[inner] = tokenAt(tree.end(paren), true, 2);
				}
			}
			const open = tokenAt(tree.start(paren), false);
			const close = tokenAt(tree.end(paren), true);
			if (open !== 0 && close !== 0) {
				bindParenthesisComments(
					/** @type {SourceToken} */ (tokenOf(open)),
					/** @type {SourceToken} */ (tokenOf(close)),
					tokenOf(starts[expression]),
					tokenOf(ends[expression])
				);
			}
			starts[expression] = open;
			ends[expression] = close;
			return expression;
		};

		read(program, false);
		return { starts, ends, types, marks, first: table.base };
	};
	modules.readTreeTokens = readTreeTokens;

	// The tree being mangled, which the walks naming its private names read.
	let tree = /** @type {SyntaxTree} */ (
		/** @type {SyntaxTree | null} */ (null)
	);

	/**
	 * The private names a class declares, read off the tree being mangled.
	 * @param {number} node a class
	 * @returns {string[]} the names
	 */
	const privateNamesDeclaredIn = (node) => {
		/** @type {string[]} */
		const names = [];
		const body = tree.field(0, Field.body, node);
		const count = tree.fieldCount(Field.body, body);
		for (let i = 0; i < count; i++) {
			const member = tree.field(i, Field.body, body);
			const type = tree.type(member);
			const key = tree.field(0, Field.key, member);
			if (
				(type === NodeType.PropertyDefinition ||
					type === NodeType.MethodDefinition) &&
				tree.type(key) === NodeType.PrivateIdentifier
			) {
				names.push(tree.name(key));
			}
		}
		return names;
	};

	/**
	 * terser's `manglePrivateProperties` over the tree: a name for each private
	 * name, handed out in the order terser's walk meets them.
	 * @param {number} node a node
	 * @param {PrivateNames} state the names handed out
	 * @returns {void}
	 */
	const renamePrivateNames = (node, state) => {
		const type = tree.type(node);
		/** @type {number} */
		let renamed = 0;
		if (
			type === NodeType.MethodDefinition ||
			type === NodeType.PropertyDefinition
		) {
			renamed = tree.field(0, Field.key, node);
		} else if (type === NodeType.MemberExpression) {
			renamed = tree.field(0, Field.property, node);
		} else if (
			type === NodeType.BinaryExpression &&
			tree.textOf(Part.operator, node) === "in"
		) {
			renamed = tree.field(0, Field.left, node);
		}
		if (renamed !== 0 && tree.type(renamed) === NodeType.PrivateIdentifier) {
			const name = tree.name(renamed);
			const { kept, names } = state;
			if ((kept === null || !kept.has(name)) && !names.has(name)) {
				let mangled = state.identifiers.get(++state.counter);
				if (kept !== null) {
					while (kept.has(mangled)) {
						mangled = state.identifiers.get(++state.counter);
					}
				}
				names.set(name, mangled);
			}
		}
		const fields =
			type === NodeType.SwitchCase ? SWITCH_CASE_WALK : CHILD_FIELDS[type];
		for (let f = 0; f < fields.length; f++) {
			const count = tree.fieldCount(fields[f], node);
			for (let i = 0; i < count; i++) {
				const child = tree.field(i, fields[f], node);
				if (child !== 0) renamePrivateNames(child, state);
			}
		}
	};
	// A case's test, walked before its statements as terser's walk does.
	const SWITCH_CASE_WALK = [Field.test, Field.consequent];

	/**
	 * Takes a source's comments from its characters, counted for the names
	 * chosen before the one pass: it prints few of them, as terser counts.
	 * @param {ParsedTree} parsed the parsed source
	 * @param {CharacterCounter} identifiers the counter
	 * @returns {void}
	 */
	const discountComments = (parsed, identifiers) => {
		const table = /** @type {TokenTable} */ (parsed.tables.last);
		table.forEachCommentGap((gap, comments) => {
			for (const comment of comments) identifiers.consider(comment.value, -1);
		});
	};

	/**
	 * Mangles a source `parse.parseTree` read as `minify` mangles terser's tree
	 * of it, the names chosen by the source's characters before the one print.
	 * @param {ParsedTree} parsed the parsed source
	 * @param {OutputStream} stream the stream the result is printed into
	 * @param {string} text the source
	 * @param {MangleOptions} options the formatted mangle options
	 * @param {boolean} mayNamePrivate whether the source may name a private member
	 * @param {boolean=} renames false to read the scopes only, every name printing as written
	 * @returns {TreeNames} the names
	 */
	modules.mangleTree = (
		parsed,
		stream,
		text,
		options,
		mayNamePrivate,
		renames = true
	) => {
		const { tables } = parsed;
		// Read for every source a mangle names.
		const read = /** @type {TreeTokens} */ (parsed.read);
		const analysis = analyzeMinifierTree(
			parsed.tree,
			parsed.program,
			read.types,
			{
				...options,
				parameterScopes: true,
				substitutesAliases: true,
				classDeclarators: true,
				spelledNames: spelledNamesCollected(
					modules,
					/** @type {boolean} */ (stream.options.shorthand)
				),
				withNames: improvesWithScopes(modules)
			},
			(node, message) => {
				const start = /** @type {NodeToken} */ (tables.of(read.starts[node]));
				return modules.parse.js_error(
					message,
					start.file,
					start.line,
					start.col,
					start.pos
				);
			}
		);
		/** @type {TreeNames} */
		const names = {
			definitions: analysis.definitions,
			privateNames: null,
			recorded: null,
			text: "",
			aliases: analysis.aliases || null,
			movedFunctions: analysis.movedFunctions || null,
			nameDefinitions: null,
			properties: null,
			propertyStrings: null
		};
		if (!renames) return names;
		/** @type {IdentifierSource} */
		const identifiers = options.nth_identifier;
		if (countsFrequency(identifiers)) {
			identifiers.reset();
			identifiers.consider(text, 1);
			discountComments(parsed, /** @type {CharacterCounter} */ (identifiers));
			identifiers.sort();
		}
		// The one pass names them once it has found what prints.
		names.nameDefinitions = (unprinted, readsGone) =>
			modules.mangleManglingScopes(analysis, options, unprinted, readsGone);
		if (!mayNamePrivate) return names;
		tree = parsed.tree;
		try {
			const kept = modules.privateNamesReadByEval(
				analysis,
				/** @type {(node: PrintNode) => string[]} */ (
					/** @type {((node: PrintNode) => string[]) | ((node: number) => string[])} */ (
						privateNamesDeclaredIn
					)
				)
			);
			// A private method's `name` is its private name, which `keep_fnames`
			// keeps as it keeps the other functions' names.
			if (analysis.namesPrivate && options.keep_fnames !== true) {
				/** @type {PrivateNames} */
				const state = {
					identifiers: options.nth_identifier,
					counter: -1,
					names: new Map(),
					kept
				};
				renamePrivateNames(parsed.program, state);
				names.privateNames = state.names;
			}
		} finally {
			tree = /** @type {SyntaxTree} */ (
				/** @type {SyntaxTree | null} */ (null)
			);
		}
		return names;
	};

	// The annotations terser's parser reads, in the order it tests a comment.
	/** @type {[RegExp, number][]} */
	const TREE_ANNOTATIONS = [
		[/[@#]__PURE__/, 0],
		[/[@#]__INLINE__/, 0],
		[/[@#]__NOINLINE__/, 0],
		[/[@#]__KEY__/, KEY],
		[/[@#]__MANGLE_PROP__/, MANGLE_PROP]
	];

	/**
	 * terser's `mangle_properties` over a parsed tree, for the node printer:
	 * the quoted keys `keep_quoted` reserves and the names marked for mangling
	 * are read first, then each name a property is found by, then each is
	 * renamed in the order terser's second walk meets it.
	 * @param {ParsedTree} parsed the parsed source, its tokens read
	 * @param {TreeDefinition[]} definitions each name's definition, by its node
	 * @param {string[] | null} quotedReserved the reserved names a quoted key joins, null where `keep_quoted` is off or `"strict"`
	 * @param {(annotated: Set<string>) => PropertyNames} namesOf property mangling's names, given the names marked for it
	 * @returns {{ properties: PropertyNames, strings: Set<number> }} the names, and the string literals renamed as property names
	 */
	modules.mangleTreeProperties = (
		parsed,
		definitions,
		quotedReserved,
		namesOf
	) => {
		const walked = parsed.tree;
		const { tables } = parsed;
		const read = /** @type {TreeTokens} */ (parsed.read);

		/**
		 * @param {number} node a node, 0 for none
		 * @returns {number} the node parentheses around it hold
		 */
		const inner = (node) => {
			while (
				node !== 0 &&
				walked.type(node) === NodeType.ParenthesizedExpression
			) {
				node = walked.field(0, Field.expression, node);
			}
			return node;
		};

		/**
		 * @param {number} node a node
		 * @returns {boolean} whether it is a string literal
		 */
		const isString = (node) =>
			walked.type(node) === NodeType.Literal &&
			typeof walked.value(node) === "string";

		/**
		 * @param {number} member a property, method or class field
		 * @returns {number} its key: a name, a literal or a computed string, 0 for a private name or another computed key
		 */
		const keyOf = (member) => {
			const key = inner(walked.field(0, Field.key, member));
			if (walked.type(key) === NodeType.PrivateIdentifier) return 0;
			if (walked.flag(Flag.computed, member) && !isString(key)) return 0;
			return key;
		};

		/**
		 * @param {number} key a key `keyOf` found
		 * @returns {string} the name it is
		 */
		const keyNameOf = (key) =>
			walked.type(key) === NodeType.Literal
				? String(walked.value(key))
				: walked.name(key);

		/**
		 * A computed string key counts as quoted: terser's `computed_props`
		 * writes it as a quoted key, which the node printer keeps in brackets.
		 * @param {number} member a property, method or class field
		 * @param {number} key its key, as `keyOf` found it
		 * @returns {boolean} whether the key is written quoted
		 */
		const isQuoted = (member, key) =>
			walked.flag(Flag.computed, member) || isString(key);

		/**
		 * terser's `addStrings` and `mangleStrings`: each string a key may be
		 * read from, a sequence's last and a conditional's branches.
		 * @param {number} node where the key is computed
		 * @param {(literal: number) => void} each receives each string
		 * @returns {void}
		 */
		const stringsOf = (node, each) => {
			node = inner(node);
			if (node === 0) return;
			switch (walked.type(node)) {
				case NodeType.SequenceExpression: {
					const count = walked.fieldCount(Field.expressions, node);
					stringsOf(walked.field(count - 1, Field.expressions, node), each);
					return;
				}
				case NodeType.ConditionalExpression:
					stringsOf(walked.field(0, Field.consequent, node), each);
					stringsOf(walked.field(0, Field.alternate, node), each);
					return;
				default:
					if (isString(node)) each(node);
			}
		};

		/**
		 * @param {number} node a node terser's parser annotates
		 * @returns {number} the annotation the nearest marking comment before it gives, 0 for none
		 */
		const annotationOf = (node) => {
			// A token this parse numbered always has its table.
			const comments = /** @type {Comment[]} */ (
				tables.commentsOf(read.starts[node], false)
			);
			for (let i = comments.length - 1; i >= 0; i--) {
				const { value } = comments[i];
				if (!/[@#]__/.test(value)) continue;
				for (const [pattern, annotation] of TREE_ANNOTATIONS) {
					if (pattern.test(value)) return annotation;
				}
			}
			return 0;
		};

		/**
		 * Whether a call defines a property, as terser finds it once compressed,
		 * `["defineProperty"]` read as `.defineProperty`; read optionally, which
		 * terser leaves out, it defines one too.
		 * @param {number} node a call or `new`
		 * @returns {boolean} whether it calls `Object.defineProperty`, whose second argument names a property
		 */
		const definesProperty = (node) => {
			const callee = inner(walked.field(0, Field.callee, node));
			if (walked.type(callee) !== NodeType.MemberExpression) return false;
			const property = inner(walked.field(0, Field.property, callee));
			const object = inner(walked.field(0, Field.object, callee));
			if (
				(walked.flag(Flag.computed, callee)
					? !isString(property) || walked.value(property) !== "defineProperty"
					: walked.name(property) !== "defineProperty") ||
				walked.type(object) !== NodeType.Identifier ||
				walked.name(object) !== "Object"
			) {
				return false;
			}
			const definition = definitions[object];
			return (
				!definition || /** @type {MinifierVariable} */ (definition).undeclared
			);
		};

		/**
		 * Whether the expression a member is read off, followed as terser
		 * follows each node's `expression`, ends in an undeclared global.
		 * @param {number} node a member
		 * @returns {boolean} whether its root is undeclared
		 */
		const readsUndeclared = (node) => {
			let root = walked.field(0, Field.object, node);
			for (;;) {
				switch (walked.type(root)) {
					case NodeType.MemberExpression:
						root = walked.field(0, Field.object, root);
						continue;
					case NodeType.CallExpression:
					case NodeType.NewExpression:
						root = walked.field(0, Field.callee, root);
						continue;
					case NodeType.ChainExpression:
					case NodeType.ParenthesizedExpression:
						root = walked.field(0, Field.expression, root);
						continue;
					case NodeType.AwaitExpression:
					case NodeType.UnaryExpression:
					case NodeType.UpdateExpression:
					case NodeType.YieldExpression:
						root = walked.field(0, Field.argument, root);
						if (root === 0) return false;
						continue;
					case NodeType.Identifier: {
						const definition = definitions[root];
						return Boolean(
							definition &&
							/** @type {MinifierVariable} */ (definition).undeclared
						);
					}
					default:
						return false;
				}
			}
		};

		/**
		 * @param {number} node a node
		 * @returns {number} the child a chain of it continues, which starting at its token loses the annotation to it, else 0
		 */
		const chainedOf = (node) => {
			switch (walked.type(node)) {
				case NodeType.MemberExpression:
					return walked.field(0, Field.object, node);
				case NodeType.CallExpression:
				case NodeType.NewExpression:
					return walked.field(0, Field.callee, node);
				case NodeType.TaggedTemplateExpression:
					return walked.field(0, Field.tag, node);
				default:
					return 0;
			}
		};

		/**
		 * Walks a tree in terser's order, visiting each node before its children.
		 * @param {number} node a node
		 * @param {(node: number, cleared: boolean) => void} visit called with each node, and whether the node holding it took its annotation over
		 * @param {boolean} cleared whether the node holding it took its annotation over
		 * @returns {void}
		 */
		const walk = (node, visit, cleared) => {
			visit(node, cleared);
			const type = walked.type(node);
			const chained =
				type === NodeType.ParenthesizedExpression ? 0 : chainedOf(node);
			const fields =
				type === NodeType.SwitchCase ? SWITCH_CASE_WALK : CHILD_FIELDS[type];
			for (let f = 0; f < fields.length; f++) {
				const count = walked.fieldCount(fields[f], node);
				for (let i = 0; i < count; i++) {
					const child = walked.field(i, fields[f], node);
					if (child === 0) continue;
					walk(
						child,
						visit,
						type === NodeType.ParenthesizedExpression
							? cleared
							: child === chained &&
									read.starts[inner(child)] === read.starts[node]
					);
				}
			}
		};

		/** @type {Set<string>} */
		const annotated = new Set();
		walk(
			parsed.program,
			(node, cleared) => {
				switch (walked.type(node)) {
					case NodeType.Property:
					case NodeType.MethodDefinition:
					case NodeType.PropertyDefinition: {
						const key = keyOf(node);
						if (key === 0) return;
						if (quotedReserved !== null && isQuoted(node, key)) {
							pushUnique(quotedReserved, keyNameOf(key));
						}
						if (
							!walked.flag(Flag.computed, node) &&
							annotationOf(node) === MANGLE_PROP
						) {
							annotated.add(keyNameOf(key));
						}
						return;
					}
					case NodeType.MemberExpression: {
						const property = inner(walked.field(0, Field.property, node));
						if (walked.flag(Flag.computed, node)) {
							if (quotedReserved !== null) {
								stringsOf(property, (literal) =>
									pushUnique(
										quotedReserved,
										/** @type {string} */ (walked.value(literal))
									)
								);
							}
							if (
								isString(property) &&
								!cleared &&
								annotationOf(node) === MANGLE_PROP
							) {
								annotated.add(/** @type {string} */ (walked.value(property)));
							}
						} else if (
							walked.type(property) === NodeType.Identifier &&
							!cleared &&
							annotationOf(node) === MANGLE_PROP
						) {
							annotated.add(walked.name(property));
						}
						break;
					}
					default:
				}
			},
			false
		);

		const names = namesOf(annotated);
		const { keepQuoted } = names;
		/**
		 * @param {number} literal a string literal
		 * @returns {void}
		 */
		const add = (literal) =>
			names.add(/** @type {string} */ (walked.value(literal)));
		walk(
			parsed.program,
			(node) => {
				switch (walked.type(node)) {
					case NodeType.Literal:
						if (isString(node) && annotationOf(node) === KEY) add(node);
						return;
					case NodeType.Property:
					case NodeType.MethodDefinition:
					case NodeType.PropertyDefinition: {
						const key = keyOf(node);
						if (key !== 0 && !(keepQuoted && isQuoted(node, key))) {
							names.add(keyNameOf(key));
						}
						return;
					}
					case NodeType.MemberExpression: {
						const property = walked.field(0, Field.property, node);
						if (walked.flag(Flag.computed, node)) {
							if (!keepQuoted) stringsOf(property, add);
						} else if (
							walked.type(property) === NodeType.Identifier &&
							(names.undeclared || !readsUndeclared(node))
						) {
							names.add(walked.name(property));
						}
						return;
					}
					case NodeType.CallExpression:
					case NodeType.NewExpression:
						if (definesProperty(node)) {
							stringsOf(walked.field(1, Field.arguments, node), add);
						}
						return;
					case NodeType.BinaryExpression:
						if (walked.textOf(Part.operator, node) === "in") {
							stringsOf(walked.field(0, Field.left, node), add);
						}
						break;
					default:
				}
			},
			false
		);

		// Named now, in the order terser's rename meets them: the print only
		// reads them back, and the cache holds them all once this returns.
		/** @type {Set<number>} */
		const strings = new Set();
		/**
		 * @param {number} literal a string literal naming a property
		 * @returns {void}
		 */
		const rename = (literal) => {
			strings.add(literal);
			names.mangle(/** @type {string} */ (walked.value(literal)));
		};
		walk(
			parsed.program,
			(node) => {
				switch (walked.type(node)) {
					case NodeType.Literal:
						if (isString(node) && annotationOf(node) === KEY) rename(node);
						return;
					case NodeType.Property:
					case NodeType.MethodDefinition:
					case NodeType.PropertyDefinition: {
						const key = keyOf(node);
						if (key === 0 || (keepQuoted && isQuoted(node, key))) return;
						if (walked.flag(Flag.computed, node)) rename(key);
						else names.mangle(keyNameOf(key));
						return;
					}
					case NodeType.MemberExpression: {
						const property = walked.field(0, Field.property, node);
						if (walked.flag(Flag.computed, node)) {
							if (!keepQuoted) stringsOf(property, rename);
						} else if (walked.type(property) === NodeType.Identifier) {
							names.mangle(walked.name(property));
						}
						return;
					}
					case NodeType.CallExpression:
					case NodeType.NewExpression:
						if (definesProperty(node)) {
							stringsOf(walked.field(1, Field.arguments, node), rename);
						}
						return;
					case NodeType.BinaryExpression:
						if (walked.textOf(Part.operator, node) === "in") {
							stringsOf(walked.field(0, Field.left, node), rename);
						}
						break;
					default:
				}
			},
			false
		);
		return { properties: names, strings };
	};
};

/**
 * Which names spelled beside a name the mangler's analysis collects, under the
 * improvements: an import's or export's, and a key's where shorthand prints.
 * @param {TerserModules} modules terser's modules
 * @param {boolean} shorthand whether a property whose value is named as its key prints alone
 * @returns {number} the analysis's `spelledNames`: 0 for none, 1 for a module's, 2 for a key's too
 */
const spelledNamesCollected = (modules, shorthand) => {
	const { improvements } = modules;
	if (improvements === undefined || !improvements.enabled) return 0;
	return shorthand ? 2 : 1;
};

/**
 * Whether a scope a `with` reaches mangles the names no `with` body spells, under the improvements.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} whether it does
 */
const improvesWithScopes = (modules) =>
	modules.improvements !== undefined && modules.improvements.enabled;

/**
 * Whether a name a `with` body spells keeps it, in a scope whose other names
 * are mangled.
 * @param {MinifierVariable} definition the definition
 * @param {MangleOptions} options the formatted mangle options
 * @returns {boolean} whether it is kept
 */
const keptByWith = (definition, options) => {
	const scope = /** @type {MinifierScope} */ (definition.scope);
	return (
		!options.eval &&
		scope.usesWith &&
		scope.withNames !== null &&
		scope.withNames.has(definition.name)
	);
};

/**
 * terser's `SymbolDef#unmangleable`: whether mangling keeps a name as written.
 * @param {MinifierVariable} definition the definition
 * @param {MangleOptions} options the formatted mangle options
 * @param {Set<MinifierVariable> | null} keptDefinitions the declarators `keep_fnames` keeps, while mangling
 * @param {Set<MinifierVariable> | null=} keptClasses the declarators naming an anonymous class `keep_classnames` keeps
 * @returns {boolean} whether its name is kept
 */
const isUnmangleable = (definition, options, keptDefinitions, keptClasses) => {
	const { name } = definition;
	const scope = /** @type {MinifierScope} */ (definition.scope);
	const first = definition.kind;
	if (
		keptDefinitions !== null &&
		keptDefinitions.has(definition) &&
		keepName(options.keep_fnames, name)
	) {
		return true;
	}
	if (keptClasses && keptClasses.has(definition)) return true;
	return (
		(definition.global && !options.toplevel) ||
		(definition.export & EXPORT_KEEP_NAME) !== 0 ||
		definition.undeclared ||
		(!options.eval &&
			(scope.usesEval ||
				(scope.usesWith && scope.withNames === null) ||
				keptByWith(definition, options))) ||
		((first === DECLARES_LAMBDA || first === DECLARES_DEFUN) &&
			keepName(options.keep_fnames, name)) ||
		((first === DECLARES_CLASS || first === DECLARES_DEF_CLASS) &&
			keepName(options.keep_classnames, name))
	);
};

/** @typedef {Map<MinifierVariable, Map<string, { saving: number, sites: number }>>} SpelledByDefinition each definition a key or an import or export spells a name beside, what each such name saves it and at how many of its uses */

/**
 * terser's `manglePrivateProperties`: one name for each private name, in
 * the order its transform first meets them.
 * @typedef {object} PrivateNames
 * @property {{ get: (index: number) => string }} identifiers the identifier source
 * @property {number} counter the names handed out, less one
 * @property {Map<string, string>} names each private name's mangled one
 * @property {Set<string> | null} kept the names a direct `eval` reads, which stay
 */

/**
 * Installs the mangler, which names the scopes `analyzeMinifierTree` reads off
 * a parsed tree with its names as written.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installEstreeMangle = (modules) => {
	const { ALL_RESERVED_WORDS } = modules.parse;
	const { base54 } = modules.scope;

	/**
	 * The definition a catch parameter redefines in the enclosing function
	 * scope, which owns the name the two share.
	 * @param {MinifierVariable} definition the catch parameter's definition
	 * @returns {MinifierVariable | undefined} the definition it redefines
	 */
	const redefinedCatchDefinition = (definition) => {
		const { scope } = definition;
		return definition.kind === DECLARES_CATCH && scope.variableScope !== scope
			? /** @type {MinifierVariable | undefined} */ (
					scope.variableScope.getBinding(definition.name)
				)
			: undefined;
	};

	/**
	 * The scope whose count of names hands a definition its name: a block's
	 * function counts in its function, where terser's `next_mangled` does.
	 * @param {MinifierVariable} definition the definition
	 * @param {Set<MinifierScope>} blockDefunScopes the function scopes holding a block's function
	 * @returns {MinifierScope} the scope
	 */
	const countingScopeOf = (definition, blockDefunScopes) => {
		const owner = /** @type {MinifierScope} */ (definition.scope);
		return blockDefunScopes.size !== 0 &&
			blockDefunScopes.has(/** @type {MinifierScope} */ (owner.variableScope))
			? /** @type {MinifierScope} */ (owner.variableScope)
			: owner;
	};

	/**
	 * Each definition a key or an import or export spells a name beside, with
	 * the characters each name spelled saves it.
	 * @param {MinifierScopeAnalysis} analysis the scopes
	 * @returns {SpelledByDefinition | null} the definitions, none where nothing spells one
	 */
	const spelledNamesOf = (analysis) => {
		const names = analysis.spelledNames;
		if (names === null || names.identifiers.length === 0) return null;
		const { identifiers, spellings, savings } = names;
		/** @type {SpelledByDefinition} */
		const byDefinition = new Map();
		for (let i = 0; i < identifiers.length; i++) {
			const definition = identifiers[i].definition;
			if (!isMinifierVariable(definition)) continue;
			let saved = byDefinition.get(definition);
			if (saved === undefined) {
				saved = new Map();
				byDefinition.set(definition, saved);
			}
			const known = saved.get(spellings[i]);
			if (known === undefined) {
				saved.set(spellings[i], { saving: savings[i], sites: 1 });
			} else {
				known.saving += savings[i];
				known.sites++;
			}
		}
		return byDefinition.size === 0 ? null : byDefinition;
	};

	/**
	 * The name spelled beside a definition that saves it the most, where a
	 * longer name costs its every use more than the spelling saves.
	 * @param {MinifierVariable} definition the definition
	 * @param {Map<string, { saving: number, sites: number }> | undefined} saved what each name spelled beside it saves, and at how many uses
	 * @returns {string | undefined} the name, none where none saves anything
	 */
	const spelledNameFor = (definition, saved) => {
		if (saved === undefined) return;
		const uses = definition.referenceCount + 1;
		const { improvements } = modules;
		const atSites = improvements !== undefined && improvements.enabled;
		/** @type {string | undefined} */
		let best;
		// One byte saved gzips worse than the names counted out after it shift.
		let bestSaving = atSites ? 1 : 0;
		for (const [name, { saving, sites }] of saved) {
			// Its every use costs the bytes it writes past a name one long, but
			// where it is spelled, which the saving already counts.
			const net =
				saving -
				(Buffer.byteLength(name) - 1) *
					(atSites ? Math.max(uses - sites, 0) : uses);
			if (net > bestSaving) {
				best = name;
				bestSaving = net;
			}
		}
		return best;
	};

	/**
	 * terser's `mangle_names` over an analysis: names each label, then each
	 * definition it may rename, setting their `mangled_name`.
	 * @param {MinifierScopeAnalysis} analysis the scopes, as `analyzeMinifierScope` read them
	 * @param {MangleOptions} options the formatted mangle options
	 * @param {Set<MinifierVariable> | null=} unprinted definitions no name of which prints, which take no name
	 * @param {Map<TreeDefinition, number> | null=} readsGone how many reads of each definition print no name, which ranking names by reads leaves out
	 * @returns {void}
	 */
	const mangleManglingScopes = (
		analysis,
		options,
		unprinted = null,
		readsGone = null
	) => {
		const identifiers = options.nth_identifier;
		const { reserved, cache } = options;
		const { labels, blockDefunScopes, catchParameters } = analysis;
		/** @type {Set<MinifierVariable> | null} */
		let keptDefinitions = null;
		const { functionDeclarators, classDeclarators } = analysis;
		if (functionDeclarators !== null) {
			keptDefinitions = new Set();
			for (let i = 0; i < functionDeclarators.length; i++) {
				const identifier = functionDeclarators[i];
				if (keepName(options.keep_fnames, identifier.name)) {
					keptDefinitions.add(
						/** @type {MinifierVariable} */ (identifier.definition)
					);
				}
			}
		}
		/** @type {Set<MinifierVariable> | null} */
		let keptClasses = null;
		if (classDeclarators !== null) {
			keptClasses = new Set();
			for (let i = 0; i < classDeclarators.length; i++) {
				const identifier = classDeclarators[i];
				if (keepName(options.keep_classnames, identifier.name)) {
					keptClasses.add(
						/** @type {MinifierVariable} */ (identifier.definition)
					);
				}
			}
		}
		for (let i = 0; i < labels.length; i++) {
			const label = labels[i];
			let counter = label.parent === null ? -1 : label.parent.counter;
			/** @type {string} */
			let name;
			do {
				name = identifiers.get(++counter);
			} while (ALL_RESERVED_WORDS.has(name));
			label.counter = counter;
			label.mangled_name = name;
		}

		/** @type {MinifierVariable[]} */
		const toMangle = [];
		// An export's own name, which no scope hands out even where it is unseen.
		/** @type {Set<string>} */
		const unmangleableNames = new Set();
		/**
		 * @param {MinifierVariable} definition a definition in some scope
		 * @returns {void}
		 */
		const collect = (definition) => {
			if (unprinted !== null && unprinted.has(definition)) return;
			if (definition.export & EXPORT_KEEP_NAME) {
				unmangleableNames.add(definition.name);
			} else if (!reserved.has(definition.name)) {
				toMangle.push(definition);
				// Kept beside names mangled in its own scope, which no other may take.
				if (keptByWith(definition, options)) {
					unmangleableNames.add(definition.name);
				}
			}
		};
		if (cache) {
			for (const definition of analysis.globals.values()) collect(definition);
		}
		const legacyCatch = options.ie8 || options.safari10;
		// WHY: a switch's block scope opens before the function scopes of its
		// discriminant, so the order catch parameters were met in is not this
		// walk's, which would name one before the function around it.
		/** @type {Map<MinifierScope, MinifierVariable[]>} */
		const catchParametersByScope = new Map();
		if (!legacyCatch) {
			for (let i = 0; i < catchParameters.length; i++) {
				const definition = /** @type {MinifierVariable} */ (
					catchParameters[i].definition
				);
				const scope = /** @type {MinifierScope} */ (definition.scope);
				const list = catchParametersByScope.get(scope);
				if (list === undefined) catchParametersByScope.set(scope, [definition]);
				else list.push(definition);
			}
		}
		// The scopes in the order opened: a scope's children, the first on top.
		/** @type {MinifierScope[]} */
		const pending = [analysis.toplevel];
		while (pending.length !== 0) {
			const scope = /** @type {MinifierScope} */ (pending.pop());
			const { variables, childScopes } = scope;
			for (let j = childScopes.length; --j >= 0;) {
				pending.push(/** @type {MinifierScope} */ (childScopes[j]));
			}
			for (let j = 0; j < variables.length; j++) {
				collect(/** @type {MinifierVariable} */ (variables[j]));
			}
			// A catch parameter is named where the walk meets it, reserved or not.
			const parameters = catchParametersByScope.get(scope);
			if (parameters !== undefined) {
				for (let j = 0; j < parameters.length; j++) {
					toMangle.push(parameters[j]);
				}
			}
		}

		if (
			cache ||
			legacyCatch ||
			options.keep_fnames ||
			options.keep_classnames ||
			identifiers !== base54
		) {
			mangleEveryOption(
				toMangle,
				options,
				keptDefinitions,
				unmangleableNames,
				blockDefunScopes,
				keptClasses,
				unprinted
			);
			return;
		}

		/** @type {Map<MinifierScope, Set<string>>} */
		const takenByScope = new Map();
		// WHY: the names a scope may not reuse are the ones its enclosed
		// definitions carry, and terser rereads that list for every candidate it
		// tries — quadratic in a bundle's one big scope. Reading it once is safe
		// because an enclosed definition belongs to an outer scope, and outer
		// scopes are mangled before inner ones, so the answer no longer moves
		// by the time a scope first asks.
		/**
		 * @param {MinifierScope} owner the scope handing out a name
		 * @returns {Set<string>} the names it may not hand out
		 */
		const takenIn = (owner) => {
			const known = takenByScope.get(owner);
			if (known !== undefined) return known;
			/** @type {Set<string>} */
			const taken = new Set();
			const { enclosed } = owner;
			for (let i = 0; i < enclosed.length; i++) {
				const definition = enclosed[i];
				const name =
					definition.mangled_name ||
					(isUnmangleable(definition, options, null) && definition.name);
				if (name) taken.add(name);
			}
			takenByScope.set(owner, taken);
			return taken;
		};

		/** @type {MinifierVariable[]} */
		const renamed = [];
		// Where each name handed out stands in the order `identifiers` gives them.
		/** @type {Map<string, number>} */
		const nameIndexes = new Map();
		const { improvements } = modules;
		const improving = improvements !== undefined && improvements.enabled;
		const spellings = improving ? spelledNamesOf(analysis) : null;
		// Each definition a name spelled beside it saves more than it costs.
		/** @type {Map<MinifierVariable, string>} */
		const wanted = new Map();
		if (spellings !== null) {
			for (const [definition, saved] of spellings) {
				const spelling = spelledNameFor(definition, saved);
				if (spelling !== undefined) wanted.set(definition, spelling);
			}
		}
		// Each scope that counts out names a definition may take spelled, and
		// the names given in it, by counting or spelled, which neither repeats.
		/** @type {Map<MinifierScope, Set<string>> | null} */
		let givenIn = null;
		/** @type {Set<string>} */
		const spelled = new Set();
		// The names a scope's definitions want spelled, which counting skips there.
		/** @type {Map<MinifierScope, Set<string>> | null} */
		let wantedIn = null;
		if (wanted.size !== 0) {
			givenIn = new Map();
			wantedIn = new Map();
			for (const [definition, spelling] of wanted) {
				const counting = countingScopeOf(definition, blockDefunScopes);
				givenIn.set(counting, new Set());
				const names = wantedIn.get(counting);
				if (names === undefined) wantedIn.set(counting, new Set([spelling]));
				else names.add(spelling);
			}
		}
		for (let i = 0; i < toMangle.length; i++) {
			const definition = toMangle[i];
			if (
				definition.mangled_name ||
				isUnmangleable(definition, options, null)
			) {
				continue;
			}
			const redefinition = redefinedCatchDefinition(definition);
			// A dropped definition gave its name up, which another may now carry.
			if (
				redefinition &&
				(unprinted === null || !unprinted.has(redefinition))
			) {
				definition.mangled_name =
					redefinition.mangled_name || redefinition.name;
				renamed.push(definition);
				continue;
			}
			const owner = /** @type {MinifierScope} */ (definition.scope);
			// Safari reads `(function x(x) {})` in strict mode as a syntax error.
			/** @type {string | null} */
			let shadowed = null;
			const named = owner.functionName;
			if (named !== null && definition.kind === DECLARES_FUNARG) {
				shadowed = named.mangled_name || named.name;
			}
			const counting = countingScopeOf(definition, blockDefunScopes);
			const taken = takenIn(counting);
			const given = givenIn === null ? undefined : givenIn.get(counting);
			const wantedHere = wantedIn === null ? undefined : wantedIn.get(counting);
			if (given !== undefined) {
				const spelling = wanted.get(definition);
				if (
					spelling !== undefined &&
					!ALL_RESERVED_WORDS.has(spelling) &&
					!reserved.has(spelling) &&
					!unmangleableNames.has(spelling) &&
					!taken.has(spelling) &&
					!given.has(spelling) &&
					shadowed !== spelling
				) {
					definition.mangled_name = spelling;
					given.add(spelling);
					spelled.add(spelling);
					continue;
				}
			}
			/** @type {string} */
			let name;
			for (;;) {
				name = identifiers.get(++counting.cname);
				if (ALL_RESERVED_WORDS.has(name)) continue;
				if (reserved.has(name)) continue;
				if (unmangleableNames.has(name)) continue;
				if (taken.has(name)) continue;
				if (shadowed !== null && shadowed === name) continue;
				if (given !== undefined && given.has(name)) continue;
				if (wantedHere !== undefined && wantedHere.has(name)) continue;
				break;
			}
			if (given !== undefined) given.add(name);
			definition.mangled_name = name;
			renamed.push(definition);
			nameIndexes.set(name, counting.cname);
		}
		if (improving) {
			shortenBusiestNames(
				toMangle,
				renamed,
				nameIndexes,
				analysis,
				[unmangleableNames, reserved, spelled],
				readsGone
			);
		}
	};

	/**
	 * Hands the names of the shortest length to the names referenced most,
	 * keeping each length's names in the order they were handed out.
	 * Done only where it saves enough bytes to outweigh what reordering costs gzip.
	 * @param {MinifierVariable[]} toMangle the definitions the mangler considered
	 * @param {MinifierVariable[]} named the definitions it named, each once
	 * @param {Map<string, number>} nameIndexes each name handed out, by its place in the order names are handed out
	 * @param {MinifierScopeAnalysis} analysis the scopes
	 * @param {Set<string>[]} keptNames names written as they are, which no name may become
	 * @param {Map<TreeDefinition, number> | null} readsGone how many reads of each definition print no name
	 * @returns {void}
	 */
	const shortenBusiestNames = (
		toMangle,
		named,
		nameIndexes,
		analysis,
		keptNames,
		readsGone
	) => {
		let longer = false;
		for (const name of nameIndexes.keys()) {
			if (name.length > 1) {
				longer = true;
				break;
			}
		}
		// Every name one character long: there is no shorter name to hand out.
		if (!longer) return;
		/** @type {Map<string, number>} */
		const references = new Map();
		for (let i = 0; i < named.length; i++) {
			const definition = named[i];
			const name = /** @type {string} */ (definition.mangled_name);
			references.set(
				name,
				(references.get(name) || 0) +
					definition.referenceCount -
					((readsGone !== null && readsGone.get(definition)) || 0)
			);
		}
		/** @type {Set<string>} */
		const kept = new Set();
		for (let i = 0; i < toMangle.length; i++) {
			if (toMangle[i].mangled_name === null) kept.add(toMangle[i].name);
		}
		for (const name of analysis.globals.keys()) kept.add(name);
		/** @type {string[]} */
		const names = [];
		for (const name of nameIndexes.keys()) {
			if (!kept.has(name) && !keptNames.some((set) => set.has(name))) {
				names.push(name);
			}
		}
		/**
		 * @param {string} a a name
		 * @param {string} b another
		 * @returns {number} which is handed out first
		 */
		const byIndex = (a, b) =>
			/** @type {number} */ (nameIndexes.get(a)) -
			/** @type {number} */ (nameIndexes.get(b));
		names.sort(byIndex);
		const busiest = [...names].sort(
			(a, b) =>
				/** @type {number} */ (references.get(b)) -
					/** @type {number} */ (references.get(a)) || byIndex(a, b)
		);
		/** @type {Map<string, string>} */
		const renames = new Map();
		let saved = 0;
		for (let start = 0; start < names.length;) {
			const { length } = names[start];
			let end = start;
			while (end < names.length && names[end].length === length) end++;
			const chosen = busiest.slice(start, end).sort(byIndex);
			for (let i = 0; i < chosen.length; i++) {
				const name = chosen[i];
				renames.set(name, names[start + i]);
				saved +=
					(name.length - length) * /** @type {number} */ (references.get(name));
			}
			start = end;
		}
		if (saved < SHORTER_NAMES_MIN_SAVING) return;
		for (let i = 0; i < named.length; i++) {
			const definition = named[i];
			const shorter = renames.get(
				/** @type {string} */ (definition.mangled_name)
			);
			if (shorter !== undefined) definition.mangled_name = shorter;
		}
	};

	/**
	 * terser's `mangle_names` as written, for the options the fast path leaves
	 * out: each definition asks its scope for a name, whose enclosed definitions
	 * it rescans.
	 * @param {MinifierVariable[]} toMangle the definitions, in the order named
	 * @param {MangleOptions} options the formatted mangle options
	 * @param {Set<MinifierVariable> | null} keptDefinitions the declarators `keep_fnames` keeps
	 * @param {Set<string>} unmangleableNames names no definition may take
	 * @param {Set<MinifierScope>} blockDefunScopes the function scopes holding a block's function
	 * @param {Set<MinifierVariable> | null} keptClasses the declarators naming an anonymous class `keep_classnames` keeps
	 * @param {Set<MinifierVariable> | null} unprinted definitions no name of which prints, which take no name
	 * @returns {void}
	 */
	const mangleEveryOption = (
		toMangle,
		options,
		keptDefinitions,
		unmangleableNames,
		blockDefunScopes,
		keptClasses,
		unprinted
	) => {
		const identifiers = options.nth_identifier;
		const { reserved } = options;
		const cache = options.cache && options.cache.props;
		// The toplevel skips the names the cache hands out too.
		/** @type {Set<string>} */
		const mangledNames = new Set();
		if (cache) {
			for (const mangled of cache.values()) mangledNames.add(mangled);
		}
		// A short name kept as written may collide with one handed out.
		if (options.keep_fnames || options.keep_classnames) {
			for (let i = 0; i < toMangle.length; i++) {
				const definition = toMangle[i];
				if (
					definition.name.length < 6 &&
					isUnmangleable(definition, options, keptDefinitions, keptClasses)
				) {
					unmangleableNames.add(definition.name);
				}
			}
		}

		/**
		 * terser's `next_mangled`: the next name a scope hands out that shadows
		 * nothing it or a scope inside it reads.
		 * @param {MinifierScope} from the scope handing out a name
		 * @returns {string} the name
		 */
		const nextMangled = (from) => {
			let scope = from;
			if (
				blockDefunScopes.size !== 0 &&
				blockDefunScopes.has(/** @type {MinifierScope} */ (scope.variableScope))
			) {
				scope = /** @type {MinifierScope} */ (scope.variableScope);
			}
			const { enclosed } = scope;
			outer: for (;;) {
				const name = identifiers.get(++scope.cname);
				if (ALL_RESERVED_WORDS.has(name)) continue;
				if (reserved.has(name)) continue;
				if (unmangleableNames.has(name)) continue;
				for (let i = enclosed.length; --i >= 0;) {
					const definition = enclosed[i];
					if (
						name ===
						(definition.mangled_name ||
							(isUnmangleable(
								definition,
								options,
								keptDefinitions,
								keptClasses
							) &&
								definition.name))
					) {
						continue outer;
					}
				}
				return name;
			}
		};

		for (let i = 0; i < toMangle.length; i++) {
			const definition = toMangle[i];
			// A module's globals cannot refer to another module's local bindings.
			if (
				definition.global &&
				!(definition.undeclared && options.module) &&
				cache &&
				cache.has(definition.name)
			) {
				definition.mangled_name = /** @type {string} */ (
					cache.get(definition.name)
				);
				continue;
			}
			if (
				definition.mangled_name ||
				isUnmangleable(definition, options, keptDefinitions, keptClasses)
			) {
				continue;
			}
			let owner = /** @type {MinifierScope} */ (definition.scope);
			if (options.ie8 && definition.kind === DECLARES_LAMBDA) {
				owner = /** @type {MinifierScope} */ (owner.upper);
			}
			const redefinition = redefinedCatchDefinition(definition);
			/** @type {string} */
			let name;
			if (
				redefinition &&
				(unprinted === null || !unprinted.has(redefinition))
			) {
				name = redefinition.mangled_name || redefinition.name;
			} else if (owner.upper === null) {
				do {
					name = nextMangled(owner);
				} while (mangledNames.has(name));
			} else {
				const named = owner.functionName;
				const shadowed =
					named !== null && definition.kind === DECLARES_FUNARG
						? named.mangled_name || named.name
						: null;
				for (;;) {
					name = nextMangled(owner);
					if (!shadowed || shadowed !== name) break;
				}
			}
			definition.mangled_name = name;
			if (definition.global && cache) cache.set(definition.name, name);
		}
	};
	modules.mangleManglingScopes = mangleManglingScopes;

	/**
	 * The private names a class declares where a direct `eval` in it can read
	 * them: from a string, which renaming cannot reach.
	 * @param {MinifierScopeAnalysis} analysis the scopes
	 * @param {(node: PrintNode) => string[]} declaredBy the private names a class scope's node declares
	 * @returns {Set<string> | null} the names, or null where no `eval` can read one
	 */
	const privateNamesReadByEval = (analysis, declaredBy) => {
		/** @type {Set<string> | null} */
		let names = null;
		// `usesEval` marks every scope around an `eval`, so a scope without it
		// holds none.
		const pending = [analysis.toplevel];
		while (pending.length > 0) {
			const scope = /** @type {MinifierScope} */ (pending.pop());
			if (!scope.usesEval) continue;
			for (const child of scope.childScopes) {
				pending.push(/** @type {MinifierScope} */ (child));
			}
			if (scope.type !== "class") continue;
			const declared = declaredBy(scope.node);
			for (let i = 0; i < declared.length; i++) {
				if (names === null) names = new Set();
				names.add(declared[i]);
			}
		}
		return names;
	};
	modules.privateNamesReadByEval = privateNamesReadByEval;
};

/** @type {TerserModules | undefined} */
let loaded;

/**
 * terser's `OutputStream(options)`: the format options defaulted and checked as
 * terser's stream does, written into webpack's stream, which writes no layout.
 * @param {TerserModules} modules the modules, `MinifiedOutput` among them
 * @param {Partial<FormatSettings>=} given the format options, as a caller passes them
 * @returns {OutputStream} the stream
 */
const createOutputStream = (modules, given) => {
	const options = /** @type {FormatSettings} */ (
		defaults(given, FORMAT_DEFAULTS, true)
	);
	if (options.shorthand === undefined) options.shorthand = options.ecma > 5;
	// terser compiles a comments option written as a regexp, so a bad one throws.
	const { comments } = options;
	if (typeof comments === "string" && /^\/.*\/[a-zA-Z]*$/.test(comments)) {
		const regexpEnd = comments.lastIndexOf("/");
		options.comments = new RegExp(
			comments.slice(1, regexpEnd),
			comments.slice(regexpEnd + 1)
		);
	}
	return new modules.MinifiedOutput(
		minifiedOptions(options),
		!given,
		ESTREE_NODE_ACCESS
	);
};

/** @typedef {import("./syntax-parser").JavascriptPath} JavascriptPath */
/** @typedef {import("./syntax-parser").JavascriptPrintContext} JavascriptPrintContext */
/** @typedef {import("./syntax-parser").JavascriptProcessOptions} JavascriptProcessOptions */
/** @typedef {Omit<JavascriptProcessOptions, "compress"> & { parsed?: ParsedTree, leading?: { tables: TokenTables, token: number }, inlinesNames?: boolean, names?: TreeNames | null, compress?: Partial<CompressOptions> | null, mapsFrom?: { offset: number, length: number } }} NodePrintOptions the options a print runs with, where in the text read the source mapped stands, a `minify` parse whose comments print among them, or the first token of one where only those before it print, and whether the walk leaves names for their parents to print */
/** @typedef {{ at: number, taken: PrependComments }} PendingComments comments before a node a text opens with, and where in that text they go */

/**
 * Builds the JavaScript node printer: what a `SourceProcessor` run fires for
 * each node once its children are printed, writing the text `minify` writes
 * for a source it neither compresses nor mangles, comments aside.
 * @param {TerserModules} modules the minifier's modules, every phase installed
 * @returns {(path: JavascriptPath, writer: JavascriptPrintContext) => string} the printer
 */
const createNodePrinter = (modules) => {
	const { Field, Flag, NodeType, Part } = require("./syntax-parser");
	const {
		PURE_ANNOTATION,
		globalsReadWithoutEffect,
		hasSideEffects
	} = require("./side-effects");
	const { NODE_FIELDS } = require("./data");

	const { ALL_RESERVED_WORDS, PRECEDENCE } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string>, PRECEDENCE: Record<string, number> }} */ (
			modules.parse
		);
	const { isIdentifierString, isIdentifierCharacter } = createUnicode();
	const printPropertyName = createPrintPropertyName(modules);
	const { lineBreakTemplate, writesLineBreaksRawIn, writesTabsRaw } =
		modules.lineBreakTemplates;
	const MinifiedOutput =
		/** @type {ReturnType<typeof createMinifiedOutput>} */ (
			modules.MinifiedOutput
		);

	/**
	 * @param {number} code a UTF-16 code unit, -1 for none
	 * @returns {boolean} whether `\s` matches it
	 */
	const isSpaceCode = (code) =>
		code === 32 ||
		(code >= 9 && code <= 13) ||
		(code >= 0xa0 &&
			(code === 0xa0 ||
				code === 0x1680 ||
				(code >= 0x2000 && code <= 0x200a) ||
				code === 0x2028 ||
				code === 0x2029 ||
				code === 0x202f ||
				code === 0x205f ||
				code === 0x3000 ||
				code === 0xfeff));

	/**
	 * @param {number} code a UTF-16 code unit, -1 for none
	 * @returns {boolean} whether a piece opening with it needs the `;` before it
	 */
	const requiresSemicolon = (code) =>
		code >= 0 && code < 128 && REQUIRE_SEMICOLON.has(String.fromCharCode(code));

	/**
	 * terser's `is_identifier_char` of a character read as codes.
	 * @param {number} code its first UTF-16 code unit, -1 for none
	 * @param {number} next the unit after it, -1 for none
	 * @returns {boolean} whether it can stand in an identifier
	 */
	const isIdentifierCode = (code, next) => {
		if (code < 0) return false;
		if (code < 128) return ASCII_IDENTIFIER[code] === 1;
		return isIdentifierCharacter(
			code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff
				? String.fromCharCode(code, next)
				: String.fromCharCode(code)
		);
	};

	/**
	 * terser's minified stream over one node's text: `print` as the stream's,
	 * less the line, column and mapping it keeps for the whole output, which
	 * a node's text has none of.
	 */
	class NodeOutput extends MinifiedOutput {
		/**
		 * @param {FormatSettings} options defaulted format options
		 */
		constructor(options) {
			super(options, false, ESTREE_NODE_ACCESS);
			this.text = "";
			// The codes of the text's first two characters and of its last two,
			// the first of each in the low half: a text is mostly a rope of its
			// children's, which reading a character of makes flat.
			this.head = 0;
			this.tail = 0;
			// The code of the last piece's last character, -1 after an empty one.
			this.lastCode = -1;
			// The length of the longest child's text printed.
			this.longestChild = 0;
			// Where the last piece written starts in the text.
			this.placedAt = 0;
			// Whether a space asked for is printed, as `mode: "beautify"` asks.
			this.beautifies = false;
			// Whether a number or regular expression was the last thing printed,
			// which an `in` or `instanceof` after it is spaced from.
			this.literalLast = false;
			// Whether the program's own comments are taken, the only ones printed
			// where nothing is yet.
			this.atProgramStart = false;
			// The stream's type holds these as fields, so they are set as ones.
			this.print = this.printText;
			this.space = this.printSpace;
			this.comma = this.printComma;
			this.colon = this.printColon;
			this.hasNLB = this.textBreaksLine;
			this.atStart = () => this.atProgramStart;
		}

		/**
		 * terser's `hasNLB`, which skips the spaces after the line break: none is
		 * printed last where a comment is asked about.
		 * @returns {boolean} whether the text ends in a line break, or is empty
		 */
		textBreaksLine() {
			return this.text.length === 0 || (this.tail & 0xffff) === 10;
		}

		/**
		 * A space where one reads better, printed only where it beautifies.
		 * @returns {void}
		 */
		printSpace() {
			if (this.beautifies) this.printText(" ");
			else this.mightNeedSpace = true;
		}

		/**
		 * @returns {void}
		 */
		printComma() {
			this.printText(",");
			this.printSpace();
		}

		/**
		 * @returns {void}
		 */
		printColon() {
			this.printText(":");
			this.printSpace();
		}

		/**
		 * Starts the next node's text.
		 * @returns {void}
		 */
		reset() {
			this.text = "";
			this.head = 0;
			this.tail = 0;
			this.lastCode = -1;
			this.longestChild = 0;
			this.lastPrinted = "";
			this.mightNeedSpace = false;
			this.mightNeedSemicolon = false;
			this.needNewlineIndented = false;
			this.needSpace = false;
			this.hasParentheses = false;
			this.literalLast = false;
		}

		/**
		 * @param {string | number} value what to print, read as a string
		 * @returns {void}
		 */
		printText(value) {
			const str = String(value);
			const { length } = str;
			if (length === 0) {
				this.write(str, 0, 0);
				return;
			}
			const first = str.charCodeAt(0);
			const last = str.charCodeAt(length - 1);
			this.write(
				str,
				length === 1 ? first : first | (str.charCodeAt(1) << 16),
				length === 1 ? last : last | (str.charCodeAt(length - 2) << 16)
			);
		}

		/**
		 * Prints a child's text, read off the codes its edges were printed with.
		 * @param {string} text the text, not empty
		 * @param {number} head the codes of its first two characters, the first in the low half
		 * @param {number} tail the codes of its last two characters, the last in the low half
		 * @returns {void}
		 */
		printChild(text, head, tail) {
			if (text.length > this.longestChild) this.longestChild = text.length;
			this.write(text, head, tail);
		}

		/**
		 * terser's `print` of a piece, read off the codes of its edges.
		 * @param {string} str the piece
		 * @param {number} head the codes of its first two characters, the first in the low half
		 * @param {number} tail the codes of its last two characters, the last in the low half
		 * @returns {void}
		 */
		write(str, head, tail) {
			const { length } = str;
			const first = length === 0 ? -1 : head & 0xffff;
			if (this.needNewlineIndented && length !== 0) {
				this.needNewlineIndented = false;
				if (first !== 10) this.printText("\n");
			}
			if (this.needSpace && length !== 0) {
				this.needSpace = false;
				if (
					!isSpaceCode(first) &&
					first !== 59 &&
					first !== 125 &&
					first !== 41
				) {
					this.mightNeedSpace = true;
				}
			}
			const previous = this.lastCode;
			if (this.mightNeedSemicolon) {
				this.mightNeedSemicolon = false;
				if (
					(previous === 58 && first === 125) ||
					((length === 0 || (first !== 59 && first !== 125)) && previous !== 59)
				) {
					if (this.options.semicolons || requiresSemicolon(first)) {
						this.insert(";", 59);
					} else {
						if (this.text.length > 0 && (this.tail & 0xffff) !== 10) {
							this.insert("\n", 10);
						}
						// Nothing was written, so a later token still owes one.
						if (isSpaceCode(first) && /^\s+$/.test(str)) {
							this.mightNeedSemicolon = true;
						}
					}
					this.mightNeedSpace = false;
				}
			}
			if (this.mightNeedSpace) {
				if (
					(isIdentifierCode(previous, -1) &&
						(isIdentifierCode(first, length === 1 ? -1 : head >>> 16) ||
							first === 92)) ||
					(first === 47 && previous === 47) ||
					((first === 43 || first === 45) &&
						this.lastPrinted.length === 1 &&
						this.lastPrinted.charCodeAt(0) === first)
				) {
					this.insert(" ", 32);
				}
				this.mightNeedSpace = false;
			}
			if (length !== 0) {
				const before = this.text.length;
				if (before === 0) {
					this.head = head;
				} else if (before === 1) {
					this.head = (this.head & 0xffff) | ((head & 0xffff) << 16);
				}
				this.tail =
					length === 1 ? (tail & 0xffff) | ((this.tail & 0xffff) << 16) : tail;
				this.placedAt = before;
				this.text += str;
			}
			this.hasParentheses = length !== 0 && (tail & 0xffff) === 40;
			this.lastPrinted = str;
			this.lastCode = length === 0 ? -1 : tail & 0xffff;
			this.literalLast = false;
		}

		/**
		 * Adds a character between the pieces printed.
		 * @param {string} character the character
		 * @param {number} code its code
		 * @returns {void}
		 */
		insert(character, code) {
			// Never the first: something printed asked for it.
			if (this.text.length === 1) {
				this.head = (this.head & 0xffff) | (code << 16);
			}
			this.tail = code | ((this.tail & 0xffff) << 16);
			this.text += character;
		}
	}

	// Every `Flag` bit, which nodes written alike share.
	const FLAG_BITS = Object.values(Flag);
	// Each node type's fields holding nodes, in the tree's order.
	/** @type {number[][]} */
	const CHILD_FIELDS = [];
	for (const name of Object.keys(NODE_FIELDS)) {
		/** @type {number[]} */
		const fields = [];
		const spec = NODE_FIELDS[name];
		for (const part of spec === "" ? [] : spec.split(" ")) {
			const [fieldName, kind] = part.split(":");
			if (kind === "node" || kind === "list") {
				fields.push(/** @type {Record<string, number>} */ (Field)[fieldName]);
			}
		}
		CHILD_FIELDS[/** @type {Record<string, number>} */ (NodeType)[name]] =
			fields;
	}
	// The types whose place may parenthesize them: any other prints bare.
	// The types `!` reads without parentheses around them.
	const NEGATES_BARE = new Uint8Array(CHILD_FIELDS.length);
	for (const type of [
		NodeType.Identifier,
		NodeType.Literal,
		NodeType.ThisExpression,
		NodeType.MemberExpression,
		NodeType.CallExpression,
		NodeType.UnaryExpression,
		NodeType.ArrayExpression,
		NodeType.ObjectExpression,
		NodeType.TemplateLiteral
	]) {
		NEGATES_BARE[type] = 1;
	}
	// The types `isPassedOver` can answer true for, which no other is asked.
	const MAY_PASS_OVER = new Uint8Array(CHILD_FIELDS.length);
	for (const type of [
		NodeType.ParenthesizedExpression,
		NodeType.ImportDefaultSpecifier,
		NodeType.ClassBody,
		NodeType.BlockStatement,
		NodeType.ReturnStatement,
		NodeType.FunctionExpression,
		NodeType.AssignmentPattern
	]) {
		MAY_PASS_OVER[type] = 1;
	}
	const MAY_PARENTHESIZE = new Uint8Array(CHILD_FIELDS.length);
	for (const type of [
		NodeType.FunctionExpression,
		NodeType.FunctionDeclaration,
		NodeType.ArrowFunctionExpression,
		NodeType.ObjectExpression,
		NodeType.ClassExpression,
		NodeType.ClassDeclaration,
		NodeType.UnaryExpression,
		NodeType.UpdateExpression,
		NodeType.AwaitExpression,
		NodeType.SequenceExpression,
		NodeType.BinaryExpression,
		NodeType.LogicalExpression,
		NodeType.AssignmentPattern,
		NodeType.AssignmentExpression,
		NodeType.ConditionalExpression,
		NodeType.YieldExpression,
		NodeType.ChainExpression,
		NodeType.MemberExpression,
		NodeType.TaggedTemplateExpression,
		NodeType.ImportExpression,
		NodeType.CallExpression,
		NodeType.NewExpression,
		NodeType.Literal,
		NodeType.Identifier
	]) {
		MAY_PARENTHESIZE[type] = 1;
	}
	// A text this long is made flat as it is printed, which lets go of the
	// pieces it was put together from rather than keep them to the end; one
	// mostly a child's text, flat already, is left for a longer one to copy.
	const FLATTEN_AT = 2048;

	// The print in progress: the context, its stream, the tree, and the path
	// the nodes holding the one printed are read off.
	/** @type {JavascriptPrintContext | null} */
	let writer = null;
	let output = /** @type {NodeOutput} */ (
		/** @type {NodeOutput | null} */ (null)
	);
	// The same stream, as one printing the tree's nodes by their index.
	let commentStream = /** @type {OutputStream<number>} */ (
		/** @type {OutputStream<number> | null} */ (null)
	);
	let tree = /** @type {SyntaxTree} */ (
		/** @type {SyntaxTree | null} */ (null)
	);
	let path = /** @type {JavascriptPath} */ (
		/** @type {JavascriptPath | null} */ (null)
	);
	// Read off a long text's first character, which is what makes it flat.
	let _flattened = 0;
	let rawLineBreaks = false;
	let mayUseAsm = false;
	// What a program prints before its statements: its `#!` line and `preamble`.
	let programPrefix = "";
	// By node, what its text leaves the text after it: the `;` it owes, a
	// number or regular expression printed last, the space or line break a
	// comment asks for, and, where comments are kept, the `)` it holds back.
	let endState = new Uint8Array(1024);
	// By node, the codes its text opens and ends with, as `NodeOutput` packs them.
	let heads = new Int32Array(1024);
	let tails = new Int32Array(1024);
	const OWES_SEMICOLON = 1;
	const ENDS_IN_LITERAL = 2;
	const NEEDS_SPACE = 4;
	const NEEDS_LINE_BREAK = 8;
	const OWES_PARENTHESIS = 16;
	const OPENS_PARENTHESIZED = 32;
	// Where comments are kept: the tokens each node starts and ends at, and by
	// node, the comments before nodes its text opens with, which wait for text
	// printed before them, each with where it goes in that text.
	/** @type {TreeTokens | null} */
	let commentTokens = null;
	// Where only the comments before the first token print, that token.
	let leadingToken = 0;
	// Whether the walk leaves names unprinted, for their parent to print.
	let inlinesNames = false;
	// Where a map is asked for: each child printed, the node its text is printed
	// in and where in that node's text it starts, three numbers a child.
	/** @type {number[] | null} */
	let placements = null;
	// The source those mappings point into, and where it starts in the text read.
	let mappedSource = "";
	let mappedOffset = 0;
	// The child whose text the next piece printed is, 0 for none.
	let placingChild = 0;
	// Whether statements, members and cases print on lines of their own.
	let beautifies = false;
	// Each name's definition, by the name's node, where mangling renamed them.
	/** @type {import("./ScopeAnalyzer").TreeDefinition[] | null} */
	let mangledNames = null;
	/** @type {PrivateNames["names"] | null} */
	let privateNames = null;
	// The names property mangling gives, and the strings it renames.
	/** @type {PropertyNames | null} */
	let renamedProperties = null;
	/** @type {Set<number> | null} */
	let renamedStrings = null;
	// Whether the print compresses as it prints, the one-pass minify, whether
	// it drops what the top level declares and nothing reads, and whether it
	// writes a `const` nothing writes as `let`.
	let compresses = false;
	// Whether an `if` of expressions prints as one, terser's `conditionals`,
	// and whether one whose test is known false goes, terser's `dead_code`.
	let printsConditionals = false;
	let dropsDeadCode = false;
	// Whether a global `undefined` or `Infinity` prints as written, as terser's
	// compressor leaves them under `ie8`.
	let keepsGlobalNames = false;
	// Whether converting what may be an object runs code, terser's
	// `pure_conversions` turned off.
	let comparesConvert = false;
	// Whether a computed key of a constant prints as the name it converts to,
	// terser's `computed_props`.
	let liftsKeys = false;
	// Whether a statement calling a function expression prints it after `!`,
	// terser's `negate_iife`.
	let negatesCalls = false;
	// By parameter a call passes a constant inlined at every read, the
	// argument it passes, and by that argument the parameter, all printing
	// nothing; by the one read of a function moved there, the function.
	/** @type {Map<number, number>} */
	const constantArguments = new Map();
	/** @type {Map<number, number>} */
	const passedConstants = new Map();
	/** @type {Map<number, number>} */
	const movedCallees = new Map();
	// Functions called where nothing reads the call, printing as what their
	// statements run, and those statements.
	/** @type {Set<number>} */
	const unreadBodies = new Set();
	/** @type {Set<number>} */
	const unreadStatements = new Set();
	// The function a program only calls, which prints as its statements, and
	// whether the program is a `wrap` or `enclose` wrapper, which stays.
	let unwrappedFunction = 0;
	let keepsWrapper = false;
	// Whether the program's strings print as templates, every one it prints
	// spelled so: deflate codes a backtick, beside lowercase letters, shorter.
	let writesBackticks = false;
	// Whether a statement that runs nothing goes, terser's `side_effects`.
	let dropsSideEffectFree = false;
	// By `if`, its form plus 1 once found, 0 before: see `ifForm`.
	/** @type {Uint8Array} */
	let ifForms = new Uint8Array(0);
	// By name, 1 once its read is discounted, which a dropped branch and the
	// dropped function holding it would otherwise both do.
	/** @type {Uint8Array} */
	let discounted = new Uint8Array(0);
	// Whether a `#__PURE__` annotation marks a call pure, as `side_effects` has it.
	let readsPureAnnotations = false;
	// The globals nothing declares whose read runs nothing, as the compressor
	// takes them; the reads a `try` block probes with; whether a `with` is in.
	/** @type {Set<PropertyKey> | null} */
	let readGlobals = null;
	/** @type {Set<number>} */
	const probedReads = new Set();
	// The expression statements of bodies, whose purity the walk finds last.
	/** @type {number[]} */
	const expressionStatements = [];
	// By `if` with no `else`, the `return` or such `if` after it, and by
	// that statement, the `if`: a chain `if_return` may print as one `return`.
	/** @type {Map<number, number>} */
	const returnPairs = new Map();
	/** @type {Map<number, number>} */
	const returnedBy = new Map();
	// By constant's definition, what its value converts as.
	/** @type {Map<TreeDefinition, PrimitiveKind>} */
	const constantKinds = new Map();
	// By `let`, `const` or class name a statement of a list declares, where
	// that statement ends: what starts after it in the function reads it set.
	/** @type {Map<TreeDefinition, number>} */
	const setNames = new Map();
	// Where the statement a collapse moves starts, the value it moves, and
	// whether that is a declarator's value running nothing.
	let collapsingFrom = 0;
	let collapsingValue = 0;
	let collapsingPure = false;
	let answersWith = false;
	// The members of the global `Object` the program writes, true where it
	// may write any: their calls never print as the array they make.
	/** @type {Set<string> | true} */
	let objectWrites = new Set();
	// How many `try` blocks short of a function the walk is in.
	let probingTry = 0;
	// Whether the walk is in a class with a heritage, and whether its `this`
	// is a derived constructor's, which throws before `super()` returns.
	let inDerivedClass = false;
	let thisThrows = false;
	// The `this` expressions that may throw so.
	/** @type {Set<number>} */
	const throwingThis = new Set();
	// What an async generator's `return` returns, which it awaits: a bare
	// `return` takes fewer ticks.
	/** @type {Set<number>} */
	const awaitedReturns = new Set();
	let dropsToplevel = false;
	// Whether a function's or class's name nothing reads stays, `keep_fnames`
	// and `keep_classnames`.
	let keepsFunctionNames = false;
	let keepsClassNames = false;
	// By node, 1 for a declarator or function declaration that prints nothing,
	// 2 for one that stays whatever reads it.
	/** @type {Uint8Array} */
	let dropped = new Uint8Array(0);
	// How many nodes the tree printed now has: the arrays by node, kept from
	// one print to the next, are longer where an earlier tree was bigger.
	let foundSize = 0;
	// By definition, how many of its references what prints nothing holds.
	/** @type {Map<TreeDefinition, number>} */
	const droppedReads = new Map();
	// By definition, the declarator of a constant each read prints the value
	// of, terser's `reduce_vars` and `evaluate`.
	/** @type {Map<MinifierVariable, number>} */
	const inlined = new Map();
	// By definition, the value of each constant noted, which a later one's
	// value may fold.
	/** @type {Map<MinifierVariable, string | number | boolean | null>} */
	const constantValues = new Map();
	/** @type {Map<MinifierVariable, number>} */
	const constantDeclarators = new Map();
	// The constants a read prints the name of, the value no shorter.
	/** @type {Set<MinifierVariable>} */
	const keptForSize = new Set();
	// Whether a constant folds where it is printed: only what is inlined.
	let foldsAtPrint = false;
	let writesLets = false;
	// Whether an array of many strings prints as one string split.
	let splitsArrays = false;
	// By token, past the first one's number, whether comments are read before
	// it (1) or after it (2): most are asked for and few have any.
	/** @type {Uint8Array} */
	let commentFlags = new Uint8Array(0);
	let firstToken = 0;
	/** @type {Map<number, PendingComments[]>} */
	const pendingComments = new Map();
	// Whether the node printed opened with its own parenthesis.
	let currentParens = false;
	// The nodes holding the one printed, as terser's stack holds them: the
	// nodes its printer reaches past left out, innermost first. Only the first
	// `parentsFound` are, a count being quicker to reset than a length.
	/** @type {number[]} */
	const printedParents = [];
	let parentsFound = 0;
	let parentsRead = 0;
	let current = 0;

	/**
	 * @param {number} level how many levels further out than the parent
	 * @returns {number} a node holding the one printed, 0 past the program
	 */
	const ancestorOf = (level) => path.ancestor(level);

	/**
	 * @param {number} node a node, or an import's attributes as the negated import
	 * @returns {number} its type as terser's conversion types it
	 */
	const typeOf = (node) => {
		if (node < 0) return NodeType.ObjectExpression;
		const type = tree.type(node);
		switch (type) {
			case NodeType.FunctionDeclaration:
				return tree.field(0, Field.id, node) === 0
					? NodeType.FunctionExpression
					: type;
			case NodeType.ClassDeclaration:
				return tree.field(0, Field.id, node) === 0
					? NodeType.ClassExpression
					: type;
			case NodeType.Literal:
				return tree.value(node) === Infinity ? NodeType.Identifier : type;
			case NodeType.ImportAttribute:
				return NodeType.Property;
			default:
				return type;
		}
	};

	/**
	 * @param {number} node a node, 0 for none
	 * @returns {number} the node parentheses around it hold, which terser's tree has instead
	 */
	const unwrap = (node) => {
		while (node !== 0 && tree.type(node) === NodeType.ParenthesizedExpression) {
			node = tree.field(0, Field.expression, node);
		}
		return node;
	};

	/**
	 * @param {number} field the `Field`
	 * @param {number} node a node
	 * @returns {number} the node the field holds, past parentheses, 0 for none
	 */
	const childOf = (field, node) => unwrap(tree.field(0, field, node));

	/**
	 * @param {number} i the item's index
	 * @param {number} field the `Field`, a list
	 * @param {number} node a node
	 * @returns {number} the list's `i`-th node, past parentheses, 0 for a hole
	 */
	const itemOf = (i, field, node) => unwrap(tree.field(i, field, node));

	/**
	 * @param {number} node a node
	 * @returns {string} an identifier's name, a literal `Infinity`'s too
	 */
	const nameOf = (node) => {
		if (tree.type(node) === NodeType.Literal) return "Infinity";
		const definition = mangledNames === null ? null : mangledNames[node];
		if (substituted.size !== 0 && definition) {
			const passed = substituted.get(definition);
			if (passed !== undefined) return nameOf(passed);
		}
		return definition
			? definition.mangled_name || definition.name
			: tree.name(node);
	};

	/**
	 * @param {number} node a private name
	 * @returns {string} the name it prints, as mangling renamed it
	 */
	const privateNameOf = (node) => {
		const name = tree.name(node);
		const renamed = privateNames === null ? undefined : privateNames.get(name);
		return renamed === undefined ? name : renamed;
	};

	/**
	 * @param {number} key a key not computed: a name or a literal
	 * @returns {string} the name terser holds for it
	 */
	const keyName = (key) =>
		tree.type(key) === NodeType.Literal
			? String(tree.value(key))
			: tree.name(key);

	/**
	 * @param {number} member a property, method or class field, its key neither computed nor private
	 * @param {number} key its key
	 * @returns {string} the name the key prints, as property mangling renamed it
	 */
	const printedKeyOf = (member, key) => {
		const name = keyName(key);
		if (
			renamedProperties === null ||
			tree.type(member) === NodeType.ImportAttribute ||
			(renamedProperties.keepQuoted &&
				tree.type(key) === NodeType.Literal &&
				typeof tree.value(key) === "string")
		) {
			return name;
		}
		return renamedProperties.mangle(name);
	};

	/**
	 * @param {number} node a string literal
	 * @returns {string} the quote it was written with
	 */
	const quoteOf = (node) =>
		/** @type {string} */ (tree.textOf(Part.raw, node))[0];

	/**
	 * @param {number} node an import's or export's name, a literal where quoted
	 * @returns {string} the name
	 */
	const moduleName = (node) =>
		tree.type(node) === NodeType.Literal
			? String(tree.value(node))
			: tree.name(node);

	/**
	 * @param {number} node a binary-like node, as `isBinary` finds one
	 * @returns {string} its operator, which an assignment pattern leaves implicit
	 */
	const operatorOf = (node) =>
		typeOf(node) === NodeType.AssignmentPattern
			? "="
			: /** @type {string} */ (tree.textOf(Part.operator, node));

	/**
	 * @param {number} type a node's type
	 * @returns {boolean} whether it is a function
	 */
	const isLambdaType = (type) =>
		type === NodeType.FunctionExpression ||
		type === NodeType.ArrowFunctionExpression ||
		type === NodeType.FunctionDeclaration;

	/**
	 * @param {number} type a node's type
	 * @returns {boolean} whether it is a call or a `new`
	 */
	const isCallType = (type) =>
		type === NodeType.CallExpression || type === NodeType.NewExpression;

	/**
	 * @param {number} type a node's type
	 * @returns {boolean} whether it is a class
	 */
	const isClassType = (type) =>
		type === NodeType.ClassDeclaration || type === NodeType.ClassExpression;

	/**
	 * @param {number} type a node's type
	 * @returns {boolean} whether it is terser's `Unary`
	 */
	const isUnaryType = (type) =>
		type === NodeType.UnaryExpression || type === NodeType.UpdateExpression;

	/**
	 * @param {number} type a node's type
	 * @returns {boolean} whether it is terser's `ForIn`, `for … of` among them
	 */
	const isForInType = (type) =>
		type === NodeType.ForInStatement || type === NodeType.ForOfStatement;

	/**
	 * @param {number} type a node's type
	 * @returns {boolean} whether it is terser's `ObjectProperty`
	 */
	const isObjectPropertyType = (type) =>
		type === NodeType.Property ||
		type === NodeType.MethodDefinition ||
		type === NodeType.PropertyDefinition;

	/**
	 * @param {number} type a node's type
	 * @returns {boolean} whether it is terser's `Scope`
	 */
	const isScopeType = (type) =>
		type === NodeType.Program ||
		isLambdaType(type) ||
		isClassType(type) ||
		type === NodeType.StaticBlock;

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is `#x in y`
	 */
	const isPrivateIn = (node) =>
		typeOf(node) === NodeType.BinaryExpression &&
		tree.type(tree.field(0, Field.left, node)) === NodeType.PrivateIdentifier;

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is terser's `Binary`
	 */
	const isBinary = (node) => {
		const type = typeOf(node);
		return (
			(type === NodeType.BinaryExpression && !isPrivateIn(node)) ||
			type === NodeType.LogicalExpression ||
			type === NodeType.AssignmentExpression ||
			type === NodeType.AssignmentPattern
		);
	};

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is terser's `UnaryPrefix`
	 */
	const isUnaryPrefix = (node) => {
		const type = typeOf(node);
		return (
			type === NodeType.UnaryExpression ||
			(type === NodeType.UpdateExpression && tree.flag(Flag.prefix, node))
		);
	};

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is terser's `UnaryPostfix`
	 */
	const isUnaryPostfix = (node) =>
		typeOf(node) === NodeType.UpdateExpression && !tree.flag(Flag.prefix, node);

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is terser's `Dot` or `Sub`
	 */
	const isDotOrSub = (node) =>
		typeOf(node) === NodeType.MemberExpression &&
		tree.type(tree.field(0, Field.property, node)) !==
			NodeType.PrivateIdentifier;

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is a number literal
	 */
	const isNumber = (node) =>
		typeOf(node) === NodeType.Literal && typeof tree.value(node) === "number";

	/**
	 * @param {number} node a statement
	 * @returns {boolean} whether it is a directive
	 */
	const isDirective = (node) =>
		typeOf(node) === NodeType.ExpressionStatement &&
		tree.textOf(Part.directive, node) !== null;

	/**
	 * @param {number} node a statement
	 * @returns {boolean} whether it is a string standing alone, not a directive
	 */
	const isStringStatement = (node) => {
		if (
			typeOf(node) !== NodeType.ExpressionStatement ||
			tree.textOf(Part.directive, node) !== null
		) {
			return false;
		}
		const expression = childOf(Field.expression, node);
		return (
			typeOf(expression) === NodeType.Literal &&
			typeof tree.value(expression) === "string"
		);
	};

	/**
	 * @param {number} node an `export default`
	 * @returns {boolean} whether it exports a value, not a named declaration
	 */
	const exportsValue = (node) => {
		const declaration = tree.field(0, Field.declaration, node);
		const type = tree.type(declaration);
		return (
			(type !== NodeType.FunctionDeclaration &&
				type !== NodeType.ClassDeclaration) ||
			tree.field(0, Field.id, declaration) === 0
		);
	};

	/**
	 * @param {number} node a call or `new`
	 * @param {number} argument a node
	 * @returns {number} where the node is among the arguments, -1 for nowhere
	 */
	const argumentIndex = (node, argument) => {
		const count = tree.fieldCount(Field.arguments, node);
		for (let i = 0; i < count; i++) {
			if (itemOf(i, Field.arguments, node) === argument) return i;
		}
		return -1;
	};

	/**
	 * @param {number} node a property or import attribute
	 * @returns {boolean} whether it is a key and its value, not a method or accessor
	 */
	const isKeyValue = (node) =>
		tree.type(node) === NodeType.ImportAttribute ||
		(tree.textOf(Part.kind, node) === "init" && !tree.flag(Flag.method, node));

	/**
	 * @param {number} node a property
	 * @returns {boolean} whether it is in a binding pattern a declaration, parameter or `catch` binds
	 */
	const bindsDeclared = (node) => {
		let child = node;
		for (let level = 0; ; level++) {
			const parent = ancestorOf(level);
			switch (tree.type(parent)) {
				// A property is never a default's value, which is an expression.
				case NodeType.ObjectPattern:
				case NodeType.ArrayPattern:
				case NodeType.RestElement:
				case NodeType.Property:
				case NodeType.AssignmentPattern:
					break;
				case NodeType.FunctionDeclaration:
				case NodeType.FunctionExpression:
				case NodeType.ArrowFunctionExpression:
					return tree.field(0, Field.body, parent) !== child;
				case NodeType.VariableDeclarator:
					return tree.field(0, Field.id, parent) === child;
				case NodeType.CatchClause:
					return tree.field(0, Field.param, parent) === child;
				default:
					return false;
			}
			child = parent;
		}
	};

	/**
	 * The quote a member's key keeps, as terser's conversion reads it.
	 * @param {number} member a property, method or class field
	 * @returns {string | undefined} the quote, "" for none
	 */
	const keyQuoteOf = (member) => {
		if (tree.type(member) === NodeType.ImportAttribute) return undefined;
		if (tree.flag(Flag.computed, member)) return "";
		const key = tree.field(0, Field.key, member);
		if (
			tree.type(key) !== NodeType.Literal ||
			typeof tree.value(key) !== "string"
		) {
			return "";
		}
		return tree.type(member) === NodeType.Property && bindsDeclared(member)
			? '"'
			: quoteOf(key);
	};

	/**
	 * Whether terser's printer reaches past a node to its children, so that
	 * it never stands among the nodes holding the one printed.
	 * @param {number} node a node
	 * @param {number} parent the node holding it
	 * @param {number} grandparent the node holding that
	 * @returns {boolean} true when it is passed over
	 */
	const isPassedOver = (node, parent, grandparent) => {
		switch (tree.type(node)) {
			case NodeType.ParenthesizedExpression:
			case NodeType.ImportDefaultSpecifier:
			case NodeType.ClassBody:
				return true;
			case NodeType.BlockStatement: {
				const type = tree.type(parent);
				return (
					type === NodeType.FunctionDeclaration ||
					type === NodeType.FunctionExpression ||
					type === NodeType.ArrowFunctionExpression ||
					type === NodeType.CatchClause
				);
			}
			case NodeType.ReturnStatement:
				return tree.type(grandparent) === NodeType.ArrowFunctionExpression
					? soleStatement(parent) === node
					: reducing.size !== 0 &&
							reducing.has(grandparent) &&
							tree.fieldCount(Field.body, parent) === 1;
			case NodeType.FunctionExpression: {
				const type = tree.type(parent);
				return (
					(type === NodeType.MethodDefinition ||
						(type === NodeType.Property && !isKeyValue(parent))) &&
					tree.field(0, Field.value, parent) === node
				);
			}
			case NodeType.AssignmentPattern:
				return (
					tree.type(parent) === NodeType.Property &&
					printsShorthandDefault(parent)
				);
			default:
				return false;
		}
	};

	/**
	 * @param {number} node a property whose value is a default
	 * @returns {boolean} whether it prints as `{ a = b }`
	 */
	const printsShorthandDefault = (node) => {
		if (tree.flag(Flag.computed, node) || !output.option("shorthand")) {
			return false;
		}
		const left = childOf(Field.left, childOf(Field.value, node));
		return (
			typeOf(left) === NodeType.Identifier &&
			nameOf(left) === printedKeyOf(node, childOf(Field.key, node))
		);
	};

	/**
	 * terser's `parent(level)` for the node printed.
	 * @param {number} level how many levels further out than the parent
	 * @returns {number} the node holding it, 0 past the root
	 */
	const parentAt = (level) => {
		// A name printed inside its parent's text is asked about from there.
		if (level < 0) return current;
		while (parentsFound <= level) {
			const node = ancestorOf(parentsRead);
			// No caller reads past the program, which holds every statement.
			if (node === 0) return 0;
			const parent = ancestorOf(parentsRead + 1);
			const child =
				parentsFound === 0 ? current : printedParents[parentsFound - 1];
			parentsRead++;
			if (
				MAY_PASS_OVER[tree.type(node)] === 1 &&
				isPassedOver(node, parent, ancestorOf(parentsRead + 1))
			) {
				continue;
			}
			// An import's attributes print as the object terser holds them in.
			if (child > 0 && tree.type(child) === NodeType.ImportAttribute) {
				printedParents[parentsFound++] = -node;
			}
			printedParents[parentsFound++] = node;
		}
		return printedParents[level];
	};

	/**
	 * @param {number} parent a node
	 * @param {number} child one of its children
	 * @returns {boolean} whether the child's first token is the parent's
	 */
	const startsParent = (parent, child) => {
		switch (typeOf(parent)) {
			case NodeType.SequenceExpression:
				return itemOf(0, Field.expressions, parent) === child;
			case NodeType.CallExpression:
				return childOf(Field.callee, parent) === child;
			case NodeType.TaggedTemplateExpression:
				return childOf(Field.tag, parent) === child;
			case NodeType.MemberExpression:
				return isDotOrSub(parent) && childOf(Field.object, parent) === child;
			case NodeType.ChainExpression:
				return childOf(Field.expression, parent) === child;
			case NodeType.ConditionalExpression:
				return childOf(Field.test, parent) === child;
			case NodeType.UpdateExpression:
				return (
					isUnaryPostfix(parent) && childOf(Field.argument, parent) === child
				);
			default:
				return isBinary(parent) && childOf(Field.left, parent) === child;
		}
	};

	/**
	 * Whether a statement prints its call of a function expression, or the
	 * sequence opening with one, after `!`: one character fewer than the
	 * parentheses around the function.
	 * @param {number} statement an expression statement
	 * @returns {boolean} true where it does
	 */
	const negatesCall = (statement) => {
		if (
			!negatesCalls ||
			output.option("wrap_iife") ||
			tree.textOf(Part.directive, statement) !== null ||
			// What prints in the statement after it is not this one's start.
			(statement < foundSize && dropped[statement] === 1)
		) {
			return false;
		}
		let call = childOf(Field.expression, statement);
		if (typeOf(call) === NodeType.SequenceExpression) {
			if (hasEdgeComments(call)) return false;
			call = itemOf(0, Field.expressions, call);
		}
		if (
			typeOf(call) !== NodeType.CallExpression ||
			tree.flag(Flag.optional, call) ||
			hasEdgeComments(call)
		) {
			return false;
		}
		const callee = childOf(Field.callee, call);
		return (
			typeOf(callee) === NodeType.FunctionExpression &&
			!hasEdgeComments(callee) &&
			reducedCalls.get(call) === undefined &&
			!callsEmptyFunction(call) &&
			callee !== unwrappedFunction &&
			!(unreadBodies.size !== 0 && unreadBodies.has(callee))
		);
	};

	/**
	 * terser's `first_in_statement` of a node the printed one is, or starts.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @param {boolean=} exportDefault whether an `export default` value it starts, but is not, counts
	 * @returns {boolean} whether it starts its statement
	 */
	const firstInStatement = (node, level, exportDefault) => {
		// Every expression is in a statement, which ends the walk up.
		for (let i = 0; ; i++) {
			const parent = parentAt(level + i);
			const type = typeOf(parent);
			if (
				type === NodeType.ExpressionStatement &&
				childOf(Field.expression, parent) === node
			) {
				return !negatesCall(parent);
			}
			// A declarator that goes but runs its value prints it as a statement.
			if (
				type === NodeType.VariableDeclarator &&
				parent < foundSize &&
				dropped[parent] === 1 &&
				keepsEffect[parent] === 1 &&
				childOf(Field.init, parent) === node
			) {
				return true;
			}
			if (
				exportDefault &&
				i > 0 &&
				type === NodeType.ExportDefaultDeclaration &&
				exportsValue(parent) &&
				childOf(Field.declaration, parent) === node
			) {
				return true;
			}
			if (!startsParent(parent, node)) return false;
			node = parent;
		}
	};

	/**
	 * Whether the text before a node that starts its statement ends in `(`:
	 * the stream's `has_parens` there, which a node's text cannot read.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} true where it does
	 */
	const opensAfterParenthesis = (node, level) => {
		// Only a function, class or object asks, which can only be a tag.
		for (let i = level; ; i++) {
			const parent = parentAt(i);
			const type = typeOf(parent);
			if (type === NodeType.ExportDefaultDeclaration) {
				return exportDefaultWraps(parent) && !commentsOpen(level, i - 1);
			}
			if (type === NodeType.TaggedTemplateExpression) {
				if (forcesTagParentheses(node) || parenthesizesTag(node)) {
					return !commentsOpen(level, i - 1);
				}
			} else if (!startsParent(parent, node)) {
				return false;
			}
			if (parenthesized(parent, i + 1)) return !commentsOpen(level, i);
			node = parent;
		}
	};

	/**
	 * Whether a comment prints after a `(` the nodes holding the one printed
	 * open with, which the stream's `has_parens` then reads past: each of
	 * them prints the comments before it it takes after the `(`.
	 * @param {number} from where the innermost of them is among the printed one's parents
	 * @param {number} to where the one printed just after the `(` is
	 * @returns {boolean} true where one does
	 */
	const commentsOpen = (from, to) => {
		if (commentTokens === null) return false;
		const { starts } = commentTokens;
		const tables = output.tokenTables;
		const printed = output.printed_comments;
		for (let i = from; i <= to; i++) {
			const node = parentAt(i);
			if (!hasComments(starts[node], 1)) continue;
			const comments = tables.commentsOf(starts[node], false);
			if (comments === undefined || printed.has(comments)) continue;
			for (const comment of comments) {
				if (
					!printed.has(comment) &&
					output.commentFilter.call(
						/** @type {PrintNode} */ (/** @type {PrintNode | number} */ (node)),
						comment
					) &&
					output.filterComment(comment.value) !== "" &&
					!takenOutside(comment, to, starts[node])
				) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * Whether a node outside one the printed one opens is, opening at the same
	 * parentheses, takes a comment first, printing it before the `(` there.
	 * @param {Comment} comment the comment
	 * @param {number} level where the node inside is among the printed one's parents
	 * @param {number} start the token the comment's node starts at
	 * @returns {boolean} true where one does
	 */
	const takenOutside = (comment, level, start) => {
		const { starts } = /** @type {TreeTokens} */ (commentTokens);
		const tables = output.tokenTables;
		for (let i = level + 1; ; i++) {
			const holder = parentAt(i);
			if (holder === 0) return false;
			for (let token = starts[holder]; token < start; token++) {
				const opened = /** @type {SourceToken} */ (tables.of(token));
				if (opened.type !== "punc" || opened.value !== "(") return false;
			}
			const held = tables.commentsOf(starts[holder], false);
			if (held !== undefined && held.includes(comment)) return true;
		}
	};

	/**
	 * @param {number} node an `export default`
	 * @returns {boolean} whether it prints its value in parentheses
	 */
	const exportDefaultWraps = (node) => {
		const declaration = childOf(Field.declaration, node);
		const type = typeOf(declaration);
		return (
			exportsValue(node) &&
			(type === NodeType.FunctionExpression ||
				type === NodeType.ClassExpression) &&
			tree.field(0, Field.id, declaration) !== 0
		);
	};

	/**
	 * @param {number} tag a tagged template's tag
	 * @returns {boolean} whether the template parenthesizes it whatever its own test says
	 */
	const forcesTagParentheses = (tag) => {
		const type = typeOf(tag);
		return (
			type === NodeType.YieldExpression ||
			type === NodeType.AwaitExpression ||
			type === NodeType.ChainExpression ||
			isPrivateIn(tag)
		);
	};

	/**
	 * @param {number} tag a tagged template's tag
	 * @returns {boolean} whether the template wraps it in parentheses of its own
	 */
	const parenthesizesTag = (tag) => {
		const type = typeOf(tag);
		if (forcesTagParentheses(tag)) return false;
		return (
			isLambdaType(type) ||
			isBinary(tag) ||
			type === NodeType.ConditionalExpression ||
			type === NodeType.SequenceExpression ||
			isUnaryType(type) ||
			(type === NodeType.MemberExpression &&
				!tree.flag(Flag.computed, tag) &&
				tree.type(tree.field(0, Field.property, tag)) === NodeType.Identifier &&
				typeOf(childOf(Field.object, tag)) === NodeType.ObjectExpression)
		);
	};

	/**
	 * @param {number} node a node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it is the right side of `#x in`
	 */
	const isPrivateInRight = (node, level) => {
		const parent = parentAt(level);
		return isPrivateIn(parent) && childOf(Field.right, parent) === node;
	};

	/**
	 * @param {number} node a node
	 * @param {number} parent its parent
	 * @returns {boolean} whether it is called or has a member read off it
	 */
	const isCalledOrAccessed = (node, parent) => {
		const type = typeOf(parent);
		return (
			(type === NodeType.MemberExpression &&
				childOf(Field.object, parent) === node) ||
			(isCallType(type) && childOf(Field.callee, parent) === node)
		);
	};

	/**
	 * terser's `walk` stopped by `walk_abort`, over the tree.
	 * @param {number} node the node walked from
	 * @param {(node: number) => boolean | undefined} test true where found, false to skip a node's children
	 * @returns {boolean} whether `test` found a node
	 */
	const findNode = (node, test) => {
		const found = test(node);
		if (found !== undefined) return found;
		const fields = CHILD_FIELDS[tree.type(node)];
		for (let f = 0; f < fields.length; f++) {
			const count = tree.fieldCount(fields[f], node);
			for (let i = 0; i < count; i++) {
				const child = tree.field(i, fields[f], node);
				if (child !== 0 && findNode(child, test)) return true;
			}
		}
		return false;
	};

	/**
	 * @param {number} node a node walked
	 * @returns {boolean | undefined} true for a call, false for a scope
	 */
	const findCall = (node) => {
		const type = typeOf(node);
		if (isScopeType(type)) return false;
		if (isCallType(type)) return true;
	};

	/**
	 * @param {number} node a node walked
	 * @returns {boolean | undefined} true for an `in`, false for a scope
	 */
	const findIn = (node) => {
		const type = typeOf(node);
		if (isScopeType(type) && type !== NodeType.ArrowFunctionExpression) {
			return false;
		}
		if (
			type === NodeType.BinaryExpression &&
			tree.textOf(Part.operator, node) === "in"
		) {
			return true;
		}
	};

	/**
	 * terser's `left_is_object`.
	 * @param {number} node an expression
	 * @returns {boolean} whether its leftmost part is an object literal
	 */
	const leftIsObject = (node) => {
		switch (typeOf(node)) {
			case NodeType.ObjectExpression:
				return true;
			case NodeType.SequenceExpression:
				return leftIsObject(itemOf(0, Field.expressions, node));
			case NodeType.CallExpression:
				return leftIsObject(childOf(Field.callee, node));
			case NodeType.TaggedTemplateExpression:
				return leftIsObject(childOf(Field.tag, node));
			case NodeType.MemberExpression:
				return isDotOrSub(node) && leftIsObject(childOf(Field.object, node));
			case NodeType.ChainExpression:
				return leftIsObject(childOf(Field.expression, node));
			case NodeType.ConditionalExpression:
				return leftIsObject(childOf(Field.test, node));
			case NodeType.UpdateExpression:
				return (
					!tree.flag(Flag.prefix, node) &&
					leftIsObject(childOf(Field.argument, node))
				);
		}
		return isBinary(node) && leftIsObject(childOf(Field.left, node));
	};

	/**
	 * terser's `needs_parens` of a binary or logical expression or an
	 * assignment pattern.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it is parenthesized
	 */
	const binaryNeedsParens = (node, level) => {
		const parent = parentAt(level);
		const parentType = typeOf(parent);
		if (isUnaryType(parentType) || isCalledOrAccessed(node, parent)) {
			return true;
		}
		const operator = operatorOf(node);
		if (isBinary(parent)) {
			const parentOperator = operatorOf(parent);
			if (
				(operator === "??" &&
					(parentOperator === "||" || parentOperator === "&&")) ||
				(parentOperator === "??" && (operator === "||" || operator === "&&"))
			) {
				return true;
			}
			const parentPrecedence = PRECEDENCE[parentOperator];
			const precedence = PRECEDENCE[operator];
			if (
				parentPrecedence > precedence ||
				(parentPrecedence === precedence &&
					(node === childOf(Field.right, parent) || parentOperator === "**"))
			) {
				return true;
			}
		}
		if (isPrivateIn(parent)) {
			const parentPrecedence = PRECEDENCE.in;
			const precedence = PRECEDENCE[operator];
			if (
				parentPrecedence > precedence ||
				(parentPrecedence === precedence &&
					node === childOf(Field.right, parent))
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * terser's `needs_parens` of a private `in`.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it is parenthesized
	 */
	const privateInNeedsParens = (node, level) => {
		const parent = parentAt(level);
		if (isUnaryType(typeOf(parent)) || isCalledOrAccessed(node, parent)) {
			return true;
		}
		if (isBinary(parent)) {
			const parentOperator = operatorOf(parent);
			const parentPrecedence = PRECEDENCE[parentOperator];
			const precedence = PRECEDENCE.in;
			if (
				parentPrecedence > precedence ||
				(parentPrecedence === precedence &&
					(node === childOf(Field.right, parent) || parentOperator === "**"))
			) {
				return true;
			}
		}
		return isPrivateIn(parent) && node === childOf(Field.right, parent);
	};

	/**
	 * terser's `needs_parens` of an assignment or a conditional, and the right
	 * side of a private `in`.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it is parenthesized
	 */
	const assignNeedsParens = (node, level) => {
		if (isPrivateInRight(node, level)) return true;
		const parent = parentAt(level);
		const parentType = typeOf(parent);
		if (
			isUnaryType(parentType) ||
			(isBinary(parent) && parentType !== NodeType.AssignmentExpression) ||
			isCalledOrAccessed(node, parent) ||
			(parentType === NodeType.ConditionalExpression &&
				childOf(Field.test, parent) === node)
		) {
			return true;
		}
		if (typeOf(node) !== NodeType.AssignmentExpression) return false;
		const leftType = typeOf(tree.field(0, Field.left, node));
		if (leftType === NodeType.ObjectPattern) return true;
		return (
			leftType === NodeType.ArrayPattern &&
			isCallType(parentType) &&
			argumentIndex(parent, node) > 0
		);
	};

	/**
	 * terser's `needs_parens` of a unary or update expression.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it is parenthesized
	 */
	const unaryNeedsParens = (node, level) => {
		const parent = parentAt(level);
		if (isCalledOrAccessed(node, parent)) return true;
		if (!isBinary(parent) || operatorOf(parent) !== "**") return false;
		const operator = tree.textOf(Part.operator, node);
		return (
			isUnaryPrefix(node) &&
			childOf(Field.left, parent) === node &&
			operator !== "++" &&
			operator !== "--"
		);
	};

	/**
	 * terser's `needs_parens` of a function expression where a node is.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether a function printed there needs parentheses
	 */
	const functionNeedsParens = (node, level) => {
		if (
			!opensAfterParenthesis(node, level) &&
			firstInStatement(node, level, true)
		) {
			return true;
		}
		const parent = parentAt(level);
		const parentType = typeOf(parent);
		if (
			output.option("webkit") &&
			parentType === NodeType.MemberExpression &&
			childOf(Field.object, parent) === node
		) {
			return true;
		}
		if (
			output.option("wrap_iife") &&
			isCallType(parentType) &&
			childOf(Field.callee, parent) === node
		) {
			return true;
		}
		return Boolean(
			output.option("wrap_func_args") &&
			isCallType(parentType) &&
			argumentIndex(parent, node) !== -1
		);
	};

	/**
	 * terser's `needs_parens`, over the tree.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether its place asks for parentheses around it
	 */
	const needsParens = (node, level) => {
		const nodeType = typeOf(node);
		if (MAY_PARENTHESIZE[nodeType] === 0) return false;
		if (nodeType === NodeType.Identifier) {
			if (tree.type(node) !== NodeType.Identifier) return false;
			// Only `let` and `async` are asked, spelled in 3 or 5 characters or escaped.
			const length = tree.end(node) - tree.start(node);
			if (length !== 3 && length !== 5 && length < 8) return false;
			const name = tree.name(node);
			if (name !== "let" && name !== "async") return false;
		}
		const parent = parentAt(level);
		switch (nodeType) {
			case NodeType.FunctionExpression:
				return functionNeedsParens(node, level);
			case NodeType.ArrowFunctionExpression: {
				const parentType = typeOf(parent);
				if (
					output.option("wrap_func_args") &&
					isCallType(parentType) &&
					argumentIndex(parent, node) !== -1
				) {
					return true;
				}
				return (
					(parentType === NodeType.MemberExpression &&
						childOf(Field.object, parent) === node) ||
					(parentType === NodeType.ConditionalExpression &&
						childOf(Field.test, parent) === node)
				);
			}
			case NodeType.ObjectExpression:
				return (
					!opensAfterParenthesis(node, level) &&
					firstInStatement(node, level) === true
				);
			case NodeType.ClassExpression:
				return firstInStatement(node, level, true) === true;
			case NodeType.UnaryExpression:
			case NodeType.UpdateExpression:
				return unaryNeedsParens(node, level);
			case NodeType.AwaitExpression:
				return (
					isCalledOrAccessed(node, parent) ||
					(isBinary(parent) &&
						tree.textOf(Part.operator, parent) === "**" &&
						childOf(Field.left, parent) === node) ||
					Boolean(output.option("safari10") && isUnaryPrefix(parent))
				);
			case NodeType.SequenceExpression: {
				if (isPrivateInRight(node, level)) return true;
				if (level === 0 && constructsPastSequence(node)) return false;
				const type = typeOf(parent);
				return (
					isCallType(type) ||
					isUnaryType(type) ||
					isBinary(parent) ||
					type === NodeType.VariableDeclarator ||
					(type === NodeType.MemberExpression &&
						node !== childOf(Field.property, parent)) ||
					type === NodeType.ArrayExpression ||
					isObjectPropertyType(type) ||
					type === NodeType.ConditionalExpression ||
					type === NodeType.ArrowFunctionExpression ||
					type === NodeType.SpreadElement ||
					type === NodeType.RestElement ||
					(type === NodeType.ForOfStatement &&
						node === childOf(Field.right, parent)) ||
					type === NodeType.YieldExpression ||
					type === NodeType.ImportExpression ||
					type === NodeType.ExportNamedDeclaration ||
					type === NodeType.ExportDefaultDeclaration ||
					type === NodeType.ExportAllDeclaration
				);
			}
			case NodeType.BinaryExpression:
				if (isPrivateIn(node)) return privateInNeedsParens(node, level);
				// One folding to a value right of an operator prints it bare.
				if (
					compresses &&
					level === 0 &&
					isBinary(parent) &&
					childOf(Field.right, parent) === node &&
					binaryFolded(node) !== undefined
				) {
					return false;
				}
				return binaryNeedsParens(node, level);
			case NodeType.LogicalExpression:
				if (level === 0 && foldsToBareValue(node)) return false;
				return binaryNeedsParens(node, level);
			case NodeType.AssignmentPattern:
				return binaryNeedsParens(node, level);
			case NodeType.ConditionalExpression:
				if (level === 0 && foldsToBareValue(node)) return false;
				return assignNeedsParens(node, level);
			case NodeType.AssignmentExpression:
				return assignNeedsParens(node, level);
			case NodeType.YieldExpression:
				if (isPrivateInRight(node, level)) return true;
				return (
					(isBinary(parent) && operatorOf(parent) !== "=") ||
					isCalledOrAccessed(node, parent) ||
					(typeOf(parent) === NodeType.ConditionalExpression &&
						childOf(Field.test, parent) === node) ||
					isUnaryType(typeOf(parent))
				);
			case NodeType.ChainExpression:
				return isCalledOrAccessed(node, parent);
			case NodeType.MemberExpression:
				return (
					typeOf(parent) === NodeType.NewExpression &&
					childOf(Field.callee, parent) === node &&
					findNode(node, findCall)
				);
			case NodeType.TaggedTemplateExpression:
			case NodeType.ImportExpression:
				return (
					typeOf(parent) === NodeType.NewExpression &&
					childOf(Field.callee, parent) === node
				);
			case NodeType.CallExpression: {
				const parentType = typeOf(parent);
				const calleeIsFunction =
					typeOf(childOf(Field.callee, node)) === NodeType.FunctionExpression;
				if (
					(parentType === NodeType.NewExpression &&
						childOf(Field.callee, parent) === node) ||
					(parentType === NodeType.ExportDefaultDeclaration && calleeIsFunction)
				) {
					return true;
				}
				if (
					!calleeIsFunction ||
					parentType !== NodeType.MemberExpression ||
					childOf(Field.object, parent) !== node
				) {
					return false;
				}
				const grandparent = parentAt(level + 1);
				return (
					typeOf(grandparent) === NodeType.AssignmentExpression &&
					childOf(Field.left, grandparent) === parent
				);
			}
			case NodeType.NewExpression: {
				const type = typeOf(parent);
				return (
					tree.fieldCount(Field.arguments, node) === 0 &&
					(type === NodeType.MemberExpression ||
						(isCallType(type) && childOf(Field.callee, parent) === node) ||
						(type === NodeType.TaggedTemplateExpression &&
							childOf(Field.tag, parent) === node))
				);
			}
			case NodeType.Literal: {
				if (
					typeOf(parent) !== NodeType.MemberExpression ||
					childOf(Field.object, parent) !== node ||
					!isNumber(node)
				) {
					return false;
				}
				const value = /** @type {number} */ (tree.value(node));
				return value < 0 || makeNum(value).startsWith("0");
			}
			case NodeType.Identifier: {
				// Only `let` and `async` reach here, as the test above leaves them.
				const name = tree.name(node);
				let child = node;
				let head = 0;
				for (let i = level; ; i++) {
					head = parentAt(i);
					const starts =
						typeOf(head) === NodeType.MemberExpression
							? childOf(Field.object, head) === child
							: startsParent(head, child);
					if (!starts) break;
					child = head;
				}
				const headType = typeOf(head);
				if (
					headType === NodeType.ForOfStatement &&
					childOf(Field.left, head) === child
				) {
					return (
						name === "let" || (child === node && !tree.flag(Flag.await, head))
					);
				}
				return (
					name === "let" &&
					((headType === NodeType.ExpressionStatement &&
						childOf(Field.expression, head) === child) ||
						(headType === NodeType.ForStatement &&
							childOf(Field.init, head) === child) ||
						(headType === NodeType.ForInStatement &&
							childOf(Field.left, head) === child)) &&
					typeOf(parent) === NodeType.MemberExpression &&
					tree.flag(Flag.computed, parent) &&
					!tree.flag(Flag.optional, parent)
				);
			}
			default:
				return false;
		}
	};

	/**
	 * Whether a node prints in parentheses where it is: those its place asks
	 * for, and those the node holding it puts around it whatever that is.
	 * @param {number} node the node
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it does
	 */
	const parenthesized = (node, level) => {
		if (needsParens(node, level)) return true;
		// Only these put parentheses around what they hold whatever it is.
		const holder = level === 0 ? ancestorOf(0) : 0;
		const held =
			holder !== 0 && tree.type(holder) !== NodeType.ParenthesizedExpression
				? tree.type(holder)
				: typeOf(parentAt(level));
		if (
			held !== NodeType.TaggedTemplateExpression &&
			held !== NodeType.ForStatement &&
			held !== NodeType.VariableDeclarator
		) {
			return false;
		}
		const parent = parentAt(level);
		const type = typeOf(parent);
		if (type === NodeType.TaggedTemplateExpression) {
			return childOf(Field.tag, parent) === node && forcesTagParentheses(node);
		}
		if (type === NodeType.ForStatement) {
			return (
				childOf(Field.init, parent) === node &&
				typeOf(node) !== NodeType.VariableDeclaration &&
				findNode(node, findIn)
			);
		}
		const holderType = typeOf(parentAt(level + 2));
		return (
			childOf(Field.init, parent) === node &&
			(holderType === NodeType.ForStatement || isForInType(holderType)) &&
			findNode(node, findIn)
		);
	};

	/**
	 * Appends a child's printed text where the text being printed is.
	 * @param {number} child the child, printed already
	 * @param {boolean=} wrap whether to put parentheses around it, beyond its own
	 * @returns {void}
	 */
	const printNode = (child, wrap) => {
		// A name is never wrapped: only a named function or class is.
		if (inlinesNames && tree.type(child) === NodeType.Identifier) {
			const parens = needsParens(child, -1);
			if (parens) output.print("(");
			output.print_name(nameOf(child));
			if (placements !== null) {
				placements.push(current, child, output.placedAt);
			}
			if (parens) output.print(")");
			return;
		}
		const text = /** @type {JavascriptPrintContext} */ (writer).consume(child);
		const state = endState[child];
		if (placements !== null) placingChild = child;
		if (commentTokens !== null) {
			printWithComments(child, text, state, wrap === true);
			placingChild = 0;
			return;
		}
		if (wrap === true) output.print("(");
		printPiece(text, heads[child], tails[child]);
		if (wrap === true) output.print(")");
		if ((state & OWES_SEMICOLON) !== 0) output.mightNeedSemicolon = true;
		if ((state & ENDS_IN_LITERAL) !== 0 && wrap !== true) {
			output.literalLast = true;
		}
	};

	/**
	 * Appends a child's text, or a piece of it, where the text being printed is.
	 * @param {string} text the text, never empty
	 * @param {number} head the codes of its first two characters, as `NodeOutput` packs them
	 * @param {number} tail the codes of its last two characters
	 * @returns {void}
	 */
	const printPiece = (text, head, tail) => {
		// What terser's printers read off the text before them, which a
		// child's own text cannot: `!--` would open `<!--`, and `</script`
		// closes an inline script.
		if (head === (45 | (45 << 16))) {
			if (output.lastCode === 33) output.print(" ");
		} else if (
			(head & 0xffff) === 47 &&
			output.lastCode === 60 &&
			REGEXP_STARTS_WITH_SCRIPT.test(text.slice(1))
		) {
			output.print(" ");
		}
		output.printChild(text, head, tail);
		if (placingChild !== 0) {
			/** @type {number[]} */ (placements).push(
				current,
				placingChild,
				output.placedAt
			);
			placingChild = 0;
		}
	};

	/**
	 * `printPiece` of a piece of a child's text.
	 * @param {string} text the piece, never empty
	 * @returns {void}
	 */
	const printSlice = (text) => {
		const { length } = text;
		printPiece(
			text,
			length === 1
				? text.charCodeAt(0)
				: text.charCodeAt(0) | (text.charCodeAt(1) << 16),
			length === 1
				? text.charCodeAt(0)
				: text.charCodeAt(length - 1) | (text.charCodeAt(length - 2) << 16)
		);
	};

	/**
	 * `printNode` where comments are kept: the child's own comments are taken
	 * now, terser's printer reaching them as it reaches the child.
	 * @param {number} child the child, printed already
	 * @param {string} text its text
	 * @param {number} state what its text leaves the text after it
	 * @param {boolean} wrap whether to put parentheses around it, beyond its own
	 * @returns {void}
	 */
	const printWithComments = (child, text, state, wrap) => {
		const before = commentsBefore(child);
		if (wrap) output.print("(");
		if (before === undefined) {
			printPiece(text, heads[child], tails[child]);
		} else if (
			!wrap &&
			tree.type(current) !== NodeType.Program &&
			output.text.length === (currentParens ? 1 : 0)
		) {
			// Nothing is printed before them yet, which decides how they print.
			const offset = output.text.length;
			let pending = pendingComments.get(current);
			if (pending === undefined) {
				pending = [];
				pendingComments.set(current, pending);
			}
			for (const comments of before) {
				pending.push({ at: comments.at + offset, taken: comments.taken });
			}
			printPiece(text, heads[child], tails[child]);
		} else {
			let from = 0;
			for (const { at, taken } of before) {
				if (at > from) {
					printSlice(text.slice(from, at));
					from = at;
				}
				output.printPrependComments(taken);
			}
			if (from === 0) printPiece(text, heads[child], tails[child]);
			else printSlice(text.slice(from));
		}
		if ((state & OWES_SEMICOLON) !== 0) output.mightNeedSemicolon = true;
		if ((state & NEEDS_SPACE) !== 0) output.needSpace = true;
		if ((state & NEEDS_LINE_BREAK) !== 0) output.needNewlineIndented = true;
		const after = takesLaterComments(child) && printCommentsAfter(child);
		if ((state & OWES_PARENTHESIS) !== 0) output.print(")");
		if (wrap) output.print(")");
		if (
			(state & (ENDS_IN_LITERAL | OWES_PARENTHESIS)) === ENDS_IN_LITERAL &&
			!wrap &&
			!after
		) {
			output.literalLast = true;
		}
	};

	/**
	 * @param {number} token a token's number, 0 for none
	 * @param {number} side 1 for the comments before it, 2 for those after
	 * @returns {boolean} whether it has any there
	 */
	const hasComments = (token, side) =>
		token !== 0 && (commentFlags[token - firstToken] & side) !== 0;

	/**
	 * @param {Comment[] | undefined} comments the comments at a token
	 * @returns {boolean} whether any of them prints
	 */
	const printsAnyComment = (comments) => {
		if (comments !== undefined) {
			for (const comment of comments) {
				if (
					output.commentFilter.call(
						/** @type {PrintNode} */ (/** @type {PrintNode | number} */ (0)),
						comment
					) &&
					output.filterComment(comment.value) !== ""
				) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * Clears the flags of the tokens no printed comment is at, so that only a
	 * comment that prints keeps the one pass from joining or dropping there.
	 * @param {TokenTables} tables the tables of the source's tokens
	 * @returns {void}
	 */
	const keepPrintedCommentFlags = (tables) => {
		for (let i = 0; i < commentFlags.length; i++) {
			const flags = commentFlags[i];
			if (flags === 0) continue;
			const token = i + firstToken;
			if (
				(flags & 1) !== 0 &&
				!printsAnyComment(tables.commentsOf(token, false))
			) {
				commentFlags[i] &= ~1;
			}
			if (
				(flags & 2) !== 0 &&
				!printsAnyComment(tables.commentsOf(token, true))
			) {
				commentFlags[i] &= ~2;
			}
		}
	};

	/**
	 * Takes the comments after a node, printed where its text is now.
	 * @param {number} node the node
	 * @returns {boolean} whether any printed
	 */
	const printCommentsAfter = (node) => {
		if (!hasComments(/** @type {TreeTokens} */ (commentTokens).ends[node], 2)) {
			return false;
		}
		const after = commentStream.claimAppendComments(node);
		if (after === undefined) return false;
		output.printAppendComments(after);
		return true;
	};

	/**
	 * Whether the node holding a node may print it as something else, as it
	 * prints a key or an empty loop body: its comments after it are taken only
	 * as it is printed. Any other node takes them as its own text ends.
	 * @param {number} node a node
	 * @returns {boolean} true for a name, a literal or an empty statement
	 */
	const takesLaterComments = (node) => {
		const type = tree.type(node);
		return (
			type === NodeType.Identifier ||
			type === NodeType.Literal ||
			type === NodeType.PrivateIdentifier ||
			type === NodeType.EmptyStatement
		);
	};

	/**
	 * Takes the comments a child's text opens with: its own, unless terser's
	 * printer reaches them first with a node holding it, and those its own
	 * children's texts opened with.
	 * @param {number} child the child, printed already
	 * @returns {PendingComments[] | undefined} the comments, where each goes in its text
	 */
	const commentsBefore = (child) => {
		// Most nodes have no comments before them, which nothing takes then;
		// a keyword takes those on its value's leftmost edge.
		const type = tree.type(child);
		const takes =
			hasComments(/** @type {TreeTokens} */ (commentTokens).starts[child], 1) ||
			type === NodeType.ReturnStatement ||
			type === NodeType.ThrowStatement ||
			type === NodeType.AwaitExpression ||
			type === NodeType.YieldExpression
				? takesComments(child)
				: TAKES_NONE;
		const taken =
			takes === TAKES_NONE
				? undefined
				: commentStream.claimPrependComments(child, takes === TAKES_VALUE);
		const pending =
			pendingComments.size === 0 ? undefined : pendingComments.get(child);
		if (pending !== undefined) pendingComments.delete(child);
		if (taken === undefined) return pending;
		const own = {
			at: (endState[child] & OPENS_PARENTHESIZED) !== 0 ? 1 : 0,
			taken
		};
		if (pending === undefined) return [own];
		pending.unshift(own);
		return pending;
	};

	// Which comments a child takes as it is printed: none, those before it and
	// on a keyword's value, or only its value's, those before it the parent's.
	const TAKES_NONE = 0;
	const TAKES_ALL = 1;
	const TAKES_VALUE = 2;

	/**
	 * Which comments terser's printer takes before a child as it prints it:
	 * not those the node holding it starts with too, taken first, nor those a
	 * keyword above takes on its value's leftmost edge.
	 * @param {number} child the child
	 * @returns {number} `TAKES_NONE`, `TAKES_ALL` or `TAKES_VALUE`
	 */
	const takesComments = (child) => {
		const tables = output.tokenTables;
		const { starts } = /** @type {TreeTokens} */ (commentTokens);
		const start = starts[child];
		const parentStart = starts[current];
		const before = tables.commentsOf(start, false);
		// A list empty everywhere may be one shared list.
		const sharesStart =
			before !== undefined && before.length !== 0
				? before === tables.commentsOf(parentStart, false)
				: start === parentStart;
		if (sharesStart && keywordValueOf(child) === undefined) return TAKES_NONE;
		let node = child;
		for (let level = -1; ; level++) {
			const parent = level < 0 ? current : parentAt(level);
			if (parent === 0) break;
			if (keywordValueOf(parent) === node) return TAKES_NONE;
			if (leftEdgeChildOf(parent) !== node) break;
			node = parent;
		}
		if (sharesStart) return TAKES_VALUE;
		// A parenthesis's comments are the first token's inside it too, which a
		// node opening at the parenthesis takes first.
		if (before === undefined || before.length === 0) return TAKES_ALL;
		for (let level = -1; ; level++) {
			const holder = level < 0 ? current : parentAt(level);
			if (holder === 0) return TAKES_ALL;
			const holderStart = starts[holder];
			for (let token = holderStart; token < start; token++) {
				const opened = /** @type {SourceToken} */ (tables.of(token));
				if (opened.type !== "punc" || opened.value !== "(") return TAKES_ALL;
			}
			const held = tables.commentsOf(holderStart, false);
			if (held !== undefined && held.includes(before[0])) return TAKES_NONE;
		}
	};

	/**
	 * @param {number} node a node
	 * @returns {number | undefined} the value of a `return`, `throw`, `await` or `yield`, which no line break may precede
	 */
	const keywordValueOf = (node) => {
		switch (typeOf(node)) {
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
			case NodeType.AwaitExpression:
			case NodeType.YieldExpression:
				return childOf(Field.argument, node) || undefined;
			default:
				return undefined;
		}
	};

	/**
	 * @param {number} parent a node
	 * @returns {number | undefined} the child its text opens with, where terser's printer reads one
	 */
	const leftEdgeChildOf = (parent) => {
		switch (typeOf(parent)) {
			case NodeType.AwaitExpression:
			case NodeType.YieldExpression:
				return childOf(Field.argument, parent);
			case NodeType.UpdateExpression:
				return tree.flag(Flag.prefix, parent)
					? undefined
					: childOf(Field.argument, parent);
			case NodeType.BinaryExpression:
				return isPrivateIn(parent) ? undefined : childOf(Field.left, parent);
			case NodeType.LogicalExpression:
			case NodeType.AssignmentExpression:
				return childOf(Field.left, parent);
			case NodeType.CallExpression:
				return childOf(Field.callee, parent);
			case NodeType.ConditionalExpression:
				return childOf(Field.test, parent);
			case NodeType.MemberExpression:
				return isDotOrSub(parent) ? childOf(Field.object, parent) : undefined;
			case NodeType.SequenceExpression:
				return itemOf(0, Field.expressions, parent);
			default:
				return undefined;
		}
	};

	// What the stream reads comments off the printed nodes with.
	/** @type {NodeAccess<number>} */
	const commentAccess = /** @type {NodeAccess<number>} */ ({
		startToken: (/** @type {number} */ node) =>
			commentTokens === null
				? leadingToken
				: node < 0
					? 0
					: commentTokens.starts[node],
		endToken: (/** @type {number} */ node) =>
			node < 0 ? 0 : /** @type {TreeTokens} */ (commentTokens).ends[node],
		keywordValue: keywordValueOf,
		leftEdgeChild: leftEdgeChildOf,
		isStatement: (/** @type {number} */ node) =>
			STATEMENT_TYPES[typeOf(node)] === 1
	});
	// The types after which the stream lets a line comment follow.
	const STATEMENT_TYPES = new Uint8Array(CHILD_FIELDS.length);
	for (const name of ESTREE_STATEMENT_TYPES) {
		STATEMENT_TYPES[/** @type {Record<string, number>} */ (NodeType)[name]] = 1;
	}

	/**
	 * @param {number} statement the last statement of a body
	 * @param {number} owner the body
	 * @returns {boolean} whether it is a `return` of nothing ending a function's body, where the function returns anyway
	 */
	const endsFunction = (statement, owner) => {
		if (
			typeOf(statement) !== NodeType.ReturnStatement ||
			current === owner ||
			FUNCTION_TYPES[typeOf(current)] !== 1 ||
			hasEdgeComments(statement)
		) {
			return false;
		}
		const argument = childOf(Field.argument, statement);
		return argument === 0 || returnsNothing(argument);
	};

	/**
	 * @param {number} node an `if` printed now
	 * @param {number} alternate its `else`, printing after it
	 * @returns {boolean} whether the `else` is a `return` of nothing and the `if` its function's last statement
	 */
	const endsFunctionLast = (node, alternate) => {
		const fn = parentAt(0);
		if (
			FUNCTION_TYPES[typeOf(fn)] !== 1 ||
			typeOf(alternate) !== NodeType.ReturnStatement ||
			hasEdgeComments(alternate)
		) {
			return false;
		}
		const body = tree.field(0, Field.body, fn);
		const count = tree.fieldCount(Field.body, body);
		const argument = childOf(Field.argument, alternate);
		return (
			count !== 0 &&
			tree.field(count - 1, Field.body, body) === node &&
			(argument === 0 || returnsNothing(argument))
		);
	};

	/**
	 * terser's `display_body` of the statements a node's `body` lists.
	 * @param {number} owner the program, block or static block
	 * @returns {void}
	 */
	const displayBody = (owner) => {
		const count = tree.fieldCount(Field.body, owner);
		// The kind of the declaration printed last, which the next of its kind
		// continues, terser's `join_vars`.
		/** @type {string | null} */
		let joinable = null;
		// Beautified, a program's first statement opens no line of its own.
		let opensLine = typeOf(owner) !== NodeType.Program;
		for (let i = 0; i < count; i++) {
			const statement = tree.field(i, Field.body, owner);
			if (
				printsNothing(statement) ||
				(i === count - 1 && compresses && endsFunction(statement, owner))
			) {
				/** @type {JavascriptPrintContext} */ (writer).consume(statement);
				continue;
			}
			const kind = compresses ? joinableKind(statement) : null;
			if (kind !== null && kind === joinable) {
				printJoined(statement, kind);
			} else if (typeOf(statement) !== NodeType.EmptyStatement) {
				if (beautifies) {
					if (opensLine) output.print("\n");
					opensLine = true;
				}
				printNode(statement);
			} else if (
				commentTokens !== null &&
				hasComments(commentTokens.starts[statement], 1)
			) {
				// terser prints an empty statement's comments, not the statement.
				const taken = commentStream.claimPrependComments(statement);
				if (taken !== undefined) output.printPrependComments(taken);
			}
			joinable = kind;
		}
	};

	/**
	 * Whether an expression starting a statement would read as a declaration,
	 * a block or a `let`: its leftmost node a function, class or object.
	 * @param {number} expression the expression
	 * @returns {boolean} true where it would
	 */
	const opensAmbiguously = (expression) => {
		for (let node = expression; ;) {
			switch (typeOf(node)) {
				case NodeType.FunctionExpression:
				case NodeType.ClassExpression:
				case NodeType.ObjectExpression:
					return true;
				case NodeType.Identifier:
					// A read prints the value folded into it, or the function moved there.
					if (collapsed.size !== 0 && collapsed.has(node)) {
						node = /** @type {number} */ (collapsed.get(node));
						break;
					}
					return tree.name(node) === "let" || isMovedRead(node);
				case NodeType.BinaryExpression:
				case NodeType.LogicalExpression:
				case NodeType.AssignmentExpression:
					node = childOf(Field.left, node);
					break;
				case NodeType.CallExpression:
				case NodeType.NewExpression:
					if (typeOf(node) === NodeType.NewExpression) return false;
					node = childOf(Field.callee, node);
					break;
				case NodeType.MemberExpression:
					node = childOf(Field.object, node);
					break;
				case NodeType.ConditionalExpression:
					node = childOf(Field.test, node);
					break;
				case NodeType.SequenceExpression:
					node = itemOf(0, Field.expressions, node);
					break;
				case NodeType.TaggedTemplateExpression:
					node = childOf(Field.tag, node);
					break;
				case NodeType.UpdateExpression:
					if (tree.flag(Flag.prefix, node)) return false;
					node = childOf(Field.argument, node);
					break;
				default:
					return false;
			}
		}
	};

	/**
	 * @param {number} node a declared name or pattern
	 * @returns {boolean} whether nothing writes any name it declares, and no code but what is minified sees one
	 */
	const bindsUnwritten = (node) => {
		switch (typeOf(node)) {
			case NodeType.ObjectPattern:
			case NodeType.ArrayPattern: {
				const field =
					typeOf(node) === NodeType.ObjectPattern
						? Field.properties
						: Field.elements;
				const count = tree.fieldCount(field, node);
				for (let i = 0; i < count; i++) {
					const element = itemOf(i, field, node);
					if (
						element !== 0 &&
						!bindsUnwritten(
							typeOf(element) === NodeType.Property
								? childOf(Field.value, element)
								: element
						)
					) {
						return false;
					}
				}
				return true;
			}
			case NodeType.AssignmentPattern:
				return bindsUnwritten(childOf(Field.left, node));
			case NodeType.RestElement:
				return bindsUnwritten(childOf(Field.argument, node));
			default: {
				// A name: a declaration binds nothing else.
				const definition = mangledNames === null ? null : mangledNames[node];
				return (
					isMinifierVariable(definition) &&
					!definition.written &&
					definition.export === 0 &&
					(!definition.global || dropsToplevel) &&
					!(/** @type {MinifierScope} */ (definition.scope).isPinned())
				);
			}
		}
	};

	/**
	 * The keyword a declaration prints with: `let` for a `const` of names
	 * nothing writes, two bytes shorter, as webpack's `improvements.lets`.
	 * @param {number} node the declaration
	 * @param {boolean} exported whether an `export` holds it
	 * @returns {string} its keyword
	 */
	const kindOf = (node, exported) => {
		const kind = /** @type {string} */ (tree.textOf(Part.kind, node));
		if (kind !== "const" || !writesLets || exported) return kind;
		const count = tree.fieldCount(Field.declarations, node);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, node);
			if (!bindsUnwritten(tree.field(0, Field.id, declarator))) return kind;
		}
		return "let";
	};

	/**
	 * @param {number} statement a declaration
	 * @returns {boolean} whether a declarator going but keeping its value prints it as a statement of its own
	 */
	const printsApart = (statement) => {
		const count = tree.fieldCount(Field.declarations, statement);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, statement);
			if (dropped[declarator] === 1 && keepsEffect[declarator] === 1) {
				return true;
			}
		}
		return false;
	};

	/**
	 * @param {number} statement a statement of a list
	 * @returns {string | null} its kind where it is a declaration another of its kind may join, null for any other
	 */
	const joinableKind = (statement) => {
		if (typeOf(statement) !== NodeType.VariableDeclaration) return null;
		// A comment before it would be left between two declarators.
		if (
			commentTokens !== null &&
			hasComments(commentTokens.starts[statement], 1)
		) {
			return null;
		}
		if (printsApart(statement)) return null;
		const kind = kindOf(statement, false);
		return kind === "var" || kind === "let" || kind === "const" ? kind : null;
	};

	/**
	 * Prints a declaration as the declarators of the one printed just before:
	 * its keyword left out, a comma for the semicolon the other owed.
	 * @param {number} statement the declaration
	 * @param {string} kind its keyword
	 * @returns {void}
	 */
	const printJoined = (statement, kind) => {
		const text = /** @type {JavascriptPrintContext} */ (writer).consume(
			statement
		);
		output.mightNeedSemicolon = false;
		output.print(",");
		const from =
			text.charCodeAt(kind.length) === 32 ? kind.length + 1 : kind.length;
		printSlice(text.slice(from));
		if ((endState[statement] & OWES_SEMICOLON) !== 0) {
			output.mightNeedSemicolon = true;
		}
	};

	/**
	 * terser's `print_braced`.
	 * @param {number} owner the node the braces belong to
	 * @param {number} body the node whose `body` lists the statements
	 * @returns {void}
	 */
	const printBraced = (owner, body) => {
		if (tree.fieldCount(Field.body, body) === 0) {
			printBracedEmpty(owner);
			return;
		}
		output.print("{");
		displayBody(body);
		if (beautifies) output.print("\n");
		output.print("}");
	};

	/**
	 * terser's `print_braced_empty`: the comments inside print too.
	 * @param {number} owner the node the braces belong to
	 * @returns {void}
	 */
	const printBracedEmpty = (owner) => {
		if (commentTokens === null) {
			output.print("{}");
			return;
		}
		output.print("{");
		if (owner > 0 && hasComments(commentTokens.ends[owner], 1)) {
			const taken = commentStream.claimAppendComments(owner, true);
			if (taken !== undefined) output.printAppendComments(taken);
		}
		output.print("}");
	};

	/**
	 * terser's `make_block`: a statement in braces.
	 * @param {number} statement the statement
	 * @returns {void}
	 */
	const makeBlock = (statement) => {
		const type = typeOf(statement);
		if (type === NodeType.EmptyStatement) {
			output.print("{}");
		} else if (type === NodeType.BlockStatement) {
			printNode(statement);
		} else {
			output.print("{");
			printNode(statement);
			output.print("}");
		}
	};

	/**
	 * terser's `force_statement`: a statement's body, which a parse never
	 * leaves a declaration needing braces.
	 * @param {number} statement the body
	 * @returns {void}
	 */
	const printMaybeBracedBody = (statement) => {
		if (typeOf(statement) === NodeType.EmptyStatement) {
			output.force_semicolon();
		} else {
			printNode(statement);
		}
	};

	// The statements whose body a block standing alone may be printed without
	// its braces, by `NodeType`.
	const HOLDS_BODY = new Uint8Array(256);
	for (const type of [
		NodeType.IfStatement,
		NodeType.ForStatement,
		NodeType.ForInStatement,
		NodeType.ForOfStatement,
		NodeType.WhileStatement,
		NodeType.DoWhileStatement,
		NodeType.WithStatement,
		NodeType.LabeledStatement
	]) {
		HOLDS_BODY[type] = 1;
	}

	/**
	 * Whether a unary operator printed for a node needs no parentheses where it
	 * is: not what a member is read off, called, constructed or tagged, nor
	 * the left side of `**`.
	 * @param {number} node the node
	 * @param {number=} level where its parent is among the printed one's
	 * @returns {boolean} true where `!0` may stand for it
	 */
	const takesUnary = (node, level = 0) => {
		const parent = parentAt(level);
		// A logical or conditional folding to it prints it where that one is.
		if (
			dropsDeadCode &&
			((typeOf(parent) === NodeType.LogicalExpression &&
				foldedOperand(parent) === node) ||
				(typeOf(parent) === NodeType.ConditionalExpression &&
					foldedBranch(parent) === node))
		) {
			return takesUnary(parent, level + 1);
		}
		switch (typeOf(parent)) {
			case NodeType.MemberExpression:
				return childOf(Field.object, parent) !== node;
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				return childOf(Field.callee, parent) !== node;
			case NodeType.TaggedTemplateExpression:
				return false;
			case NodeType.BinaryExpression:
				return !(
					tree.textOf(Part.operator, parent) === "**" &&
					childOf(Field.left, parent) === node
				);
			default:
				return true;
		}
	};

	// What a name is to its parent where the parent writes, binds or keys it,
	// by the parent's `NodeType`.
	const BINDS_NAME = new Uint8Array(256);
	for (const type of [
		NodeType.Property,
		NodeType.UpdateExpression,
		NodeType.VariableDeclarator,
		NodeType.AssignmentPattern,
		NodeType.ArrayPattern,
		NodeType.ObjectPattern,
		NodeType.RestElement,
		NodeType.CatchClause,
		NodeType.FunctionDeclaration,
		NodeType.FunctionExpression,
		NodeType.ArrowFunctionExpression,
		NodeType.ClassDeclaration,
		NodeType.ClassExpression,
		NodeType.LabeledStatement,
		NodeType.BreakStatement,
		NodeType.ContinueStatement,
		NodeType.ImportSpecifier,
		NodeType.ImportDefaultSpecifier,
		NodeType.ImportNamespaceSpecifier,
		NodeType.ExportSpecifier,
		NodeType.MethodDefinition,
		NodeType.PropertyDefinition
	]) {
		BINDS_NAME[type] = 1;
	}

	/**
	 * @param {number} node a name
	 * @param {string=} name the global it may be, `undefined` by default
	 * @returns {boolean} whether it is that global: one no scope declares and no `with` or `eval` may
	 */
	const isGlobalUndefined = (node, name = "undefined") => {
		if (tree.name(node) !== name || mangledNames === null) return false;
		const definition = mangledNames[node];
		return (
			isMinifierVariable(definition) &&
			definition.undeclared &&
			!definition.written &&
			!(/** @type {MinifierScope} */ (definition.scope).isPinned())
		);
	};

	/**
	 * @param {number} node a name
	 * @param {number} parent its parent
	 * @returns {boolean} whether the name is a value the parent reads, not one it binds or keys
	 */
	const readsAsValue = (node, parent) => {
		switch (typeOf(parent)) {
			case NodeType.VariableDeclarator:
				return childOf(Field.init, parent) === node;
			case NodeType.AssignmentPattern:
				return childOf(Field.right, parent) === node;
			case NodeType.Property:
				return (
					// Without shorthands its value prints after the key, as any other.
					(!tree.flag(Flag.shorthand, parent) || !output.option("shorthand")) &&
					typeOf(parentAt(1)) === NodeType.ObjectExpression &&
					childOf(Field.value, parent) === node
				);
			default:
				return BINDS_NAME[typeOf(parent)] !== 1;
		}
	};

	/** @type {Set<string> | undefined} */
	let constructedWhenCalled;

	/**
	 * Whether a `new` of a built-in nothing assigns constructs as a call of it
	 * does, as webpack's improvements have it; a `RegExp` call hands back an
	 * expression it is given, so only one of a primitive or nothing does.
	 * @param {number} node the `new`
	 * @returns {boolean} true where it prints as the call
	 */
	const constructsWhenCalled = (node) => {
		const callee = childOf(Field.callee, node);
		if (typeOf(callee) !== NodeType.Identifier || mangledNames === null) {
			return false;
		}
		const name = tree.name(callee);
		if (constructedWhenCalled === undefined) {
			constructedWhenCalled = new Set(
				require("./syntax-printer-data").foldedBuiltIns().constructedWhenCalled
			);
			constructedWhenCalled.delete("RegExp");
		}
		const definition = mangledNames[callee];
		return (
			(constructedWhenCalled.has(name) ||
				(name === "RegExp" && patternIsPrimitive(node))) &&
			isMinifierVariable(definition) &&
			definition.undeclared &&
			!definition.written &&
			!(/** @type {MinifierScope} */ (definition.scope).isPinned())
		);
	};

	/**
	 * Whether a name reads the global `undefined`, read where a unary operator
	 * may stand for it.
	 * @param {number} node the name
	 * @returns {boolean} true where `void 0` prints for it
	 */
	const readsUndefined = (node) => {
		// One written is no global `undefined`, so never what is assigned.
		if (keepsGlobalNames || !isGlobalUndefined(node)) return false;
		return readsAsValue(node, parentAt(0)) && takesUnary(node);
	};

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether a comment sits on its first or last token
	 */
	const hasEdgeComments = (node) =>
		commentTokens !== null &&
		(hasComments(commentTokens.starts[node], 3) ||
			hasComments(commentTokens.ends[node], 3));

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether a comment printing sits at any of its tokens, which would go with it
	 */
	const holdsComments = (node) => {
		if (commentTokens === null) return false;
		const end = commentTokens.ends[node];
		for (let token = commentTokens.starts[node]; token <= end; token++) {
			if (hasComments(token, 3)) return true;
		}
		return false;
	};

	// The functions a block may be the body of, by `NodeType`.
	// How a name is declared where a read of it never throws, before its
	// declaration runs as after: no `let`, `const` or class.
	const READ_ANY_TIME =
		(1 << DECLARES_VAR) |
		(1 << DECLARES_FUNARG) |
		(1 << DECLARES_DEFUN) |
		(1 << DECLARES_LAMBDA);
	const FUNCTION_TYPES = new Uint8Array(256);
	FUNCTION_TYPES[NodeType.FunctionDeclaration] = 1;
	FUNCTION_TYPES[NodeType.FunctionExpression] = 1;
	FUNCTION_TYPES[NodeType.ArrowFunctionExpression] = 1;

	/**
	 * Whether a name declares a binding nothing reads or writes, terser's
	 * `unused`: not exported, in no scope `eval` or `with` reaches, and at the
	 * top level only where that is private.
	 * @param {number} id the declared name
	 * @returns {boolean} true where its declaration may go
	 */
	const isUnusedBinding = (id) => {
		if (mangledNames === null || typeOf(id) !== NodeType.Identifier) {
			return false;
		}
		const definition = mangledNames[id];
		return (
			isMinifierVariable(definition) &&
			definition.referenceCount <= (droppedReads.get(definition) || 0) &&
			// Declared once, as nothing else: a parameter `arguments` reads stays.
			definition.declarations === 1 << definition.kind &&
			definition.identifiers.length <= 1 &&
			definition.export === 0 &&
			!definition.undeclared &&
			(!definition.global || dropsToplevel) &&
			!(/** @type {MinifierScope} */ (definition.scope).isPinned())
		);
	};

	/** @type {SideEffectsContext | undefined} */
	let sideEffectsContext;

	/**
	 * Whether evaluating an expression can do nothing but make a value, as the
	 * compressor's `has_side_effects` decides, read off this tree.
	 * @param {number} node the expression
	 * @returns {boolean} true where dropping it changes nothing
	 */
	const isPureValue = (node) => {
		if (sideEffectsContext === undefined) {
			sideEffectsContext = {
				readHasSideEffects,
				readsGlobalMember,
				nameKind,
				isPureCall,
				readValue: collapsedValue,
				comparesConvert
			};
		}
		sideEffectsContext.decides =
			throwingThis.size === 0 ? undefined : thisMayThrow;
		// What folds to a value only converts primitives, which runs nothing.
		if (evaluateConstant(node) !== undefined) return true;
		return !hasSideEffects(tree, node, sideEffectsContext);
	};

	/**
	 * @param {number} node a node
	 * @returns {true | undefined} true for a `this` a derived constructor may read before `super()`
	 */
	const thisMayThrow = (node) => (throwingThis.has(node) ? true : undefined);

	/**
	 * @param {number} node a name
	 * @returns {number} the value a statement before it set, which it prints as, 0 for none
	 */
	const collapsedValue = (node) =>
		(collapsed.size !== 0 && collapsed.get(node)) || 0;

	/**
	 * @param {number} node a name
	 * @param {boolean} typeofRead whether `typeof` reads it
	 * @returns {boolean} whether reading it may throw: a name nothing declares, or one in its dead zone
	 */
	const readHasSideEffects = (node, typeofRead) => {
		// A read printing what a statement before it set is that value.
		const value = collapsed.size === 0 ? undefined : collapsed.get(node);
		if (value !== undefined) return !isPureValue(value);
		// A `with` object may answer any name, by a getter.
		if (answersWith) return true;
		if (isGlobalUndefined(node) || isInlinedRead(node)) return false;
		const definition = mangledNames === null ? null : mangledNames[node];
		if (!isMinifierVariable(definition)) return true;
		if (definition.undeclared) return !typeofRead && !readsPlainGlobal(node);
		return (definition.declarations & ~READ_ANY_TIME) !== 0;
	};

	/**
	 * @param {number} node a name
	 * @returns {PrimitiveKind | undefined} what its value converts as, where it holds a constant known here
	 */
	const nameKind = (node) => {
		if (isGlobalUndefined(node)) return "number";
		const definition = mangledNames === null ? null : mangledNames[node];
		return isMinifierVariable(definition)
			? constantKinds.get(definition)
			: undefined;
	};

	/**
	 * @param {number} node a name nothing declares
	 * @returns {boolean} whether it reads a known global no `with` object answers and no `try` probes for
	 */
	const readsPlainGlobal = (node) =>
		!answersWith &&
		!probedReads.has(node) &&
		/** @type {Set<PropertyKey>} */ (readGlobals).has(tree.name(node));

	/**
	 * @param {number} node a name
	 * @returns {boolean} whether a property of it reads without running anything: a known global's, as webpack's improvements take it
	 */
	const readsGlobalMember = (node) => {
		const definition = mangledNames === null ? null : mangledNames[node];
		return (
			isMinifierVariable(definition) &&
			definition.undeclared &&
			readsPlainGlobal(node)
		);
	};

	/**
	 * @param {number} node a call or `new`
	 * @returns {boolean} whether it passes no pattern, or one a literal or an operator makes, which is no object
	 */
	const patternIsPrimitive = (node) => {
		if (tree.fieldCount(Field.arguments, node) === 0) return true;
		const pattern = tree.field(0, Field.arguments, node);
		switch (typeOf(pattern)) {
			case NodeType.Literal: {
				// A regular expression literal is an object, whatever it reads as.
				const value = tree.value(pattern);
				if (typeof value === "object" && value !== null) return false;
				const raw = tree.textOf(Part.raw, pattern);
				return raw === null || raw.charCodeAt(0) !== 47;
			}
			case NodeType.TemplateLiteral:
				return true;
			case NodeType.UnaryExpression:
				return tree.textOf(Part.operator, pattern) !== "delete";
			default:
				return false;
		}
	};

	/**
	 * @param {number} node an argument
	 * @returns {string | number | boolean | null | undefined} its value where the walk knows it, or where the constants it reads print as theirs
	 */
	const argumentValue = (node) => {
		const value = evaluateConstant(node);
		return value === undefined ? valueAtPrint(node) : value;
	};

	/**
	 * Whether a call or `new` of the global `RegExp` on constant strings
	 * only builds an expression: one the target edition parses, so none throws.
	 * @param {number} node a call or `new`
	 * @returns {boolean} true where dropping it changes nothing
	 */
	const constructsRegExp = (node) => {
		const callee = childOf(Field.callee, node);
		if (
			typeOf(callee) !== NodeType.Identifier ||
			tree.name(callee) !== "RegExp" ||
			mangledNames === null ||
			tree.flag(Flag.optional, node)
		) {
			return false;
		}
		const definition = mangledNames[callee];
		const count = tree.fieldCount(Field.arguments, node);
		if (
			!isMinifierVariable(definition) ||
			!definition.undeclared ||
			definition.written ||
			/** @type {MinifierScope} */ (definition.scope).isPinned() ||
			count === 0 ||
			count > 2
		) {
			return false;
		}
		const pattern = argumentValue(tree.field(0, Field.arguments, node));
		const flags =
			count === 2 ? argumentValue(tree.field(1, Field.arguments, node)) : "";
		if (typeof pattern !== "string" || typeof flags !== "string") return false;
		try {
			const { source } = new RegExp(pattern, flags);
			require("./syntax-parser").Parser.parse(`/${source}/${flags}`, {
				ecmaVersion: /** @type {import("./syntax-parser").EcmaVersion} */ (
					output.option("ecma")
				)
			});
		} catch (_err) {
			return false;
		}
		return true;
	};

	/**
	 * @param {number} node a call or `new`
	 * @returns {boolean} whether a `#__PURE__` comment before it marks it pure, where `side_effects` reads them
	 */
	const isPureCall = (node) => {
		// A call printing as a value its function returns runs only that.
		const fn = reducedCalls.size === 0 ? undefined : reducedCalls.get(node);
		if (
			fn !== undefined &&
			isPureValue(/** @type {number} */ (reducing.get(fn)))
		) {
			return true;
		}
		if (constructsRegExp(node)) return true;
		if (!readsPureAnnotations || commentTokens === null) return false;
		// A token this parse numbered always has its table.
		const comments = /** @type {Comment[]} */ (
			output.tokenTables.commentsOf(commentTokens.starts[node], false)
		);
		const start = tree.start(node);
		for (const comment of comments) {
			// One inside a parenthesis the call opens with marks what it holds.
			if (
				PURE_ANNOTATION.test(comment.value) &&
				/** @type {Comment & { pos: number }} */ (comment).pos < start
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * @param {number} declarator a declarator
	 * @returns {boolean} whether it prints nothing, as `findDropped` found
	 */
	const dropsDeclarator = (declarator) => dropped[declarator] === 1;

	/**
	 * @param {number} statement a statement of a body
	 * @returns {boolean} whether it prints nothing: an empty statement compressing drops, each declarator it declares goes, or the function it declares
	 */
	const printsNothing = (statement) => {
		const type = typeOf(statement);
		if (type === NodeType.EmptyStatement) {
			return compresses && !hasEdgeComments(statement);
		}
		if (type !== NodeType.VariableDeclaration) {
			return dropped[statement] === 1;
		}
		const count = tree.fieldCount(Field.declarations, statement);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, statement);
			if (dropped[declarator] !== 1 || keepsOwnEffect(declarator)) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} declarator a declarator that goes
	 * @returns {boolean} whether its value prints as a statement of its own, not where its read folds it
	 */
	const keepsOwnEffect = (declarator) =>
		keepsEffect[declarator] === 1 && aliasesRead[declarator] !== 3;

	/**
	 * @param {number} candidate a declarator, or a function declaration
	 * @returns {boolean} whether it declares a name nothing printed reads, from a value making nothing happen
	 */
	const dropsNow = (candidate) => {
		if (typeOf(candidate) === NodeType.FunctionDeclaration) {
			return isUnusedBinding(tree.field(0, Field.id, candidate));
		}
		if (!isUnusedBinding(childOf(Field.id, candidate))) return false;
		const init = childOf(Field.init, candidate);
		if (
			init === 0 ||
			(!keepsValue.has(candidate) &&
				(isPureValue(init) ||
					aliasesRead[candidate] === 1 ||
					aliasesRead[candidate] === 3))
		) {
			return true;
		}
		// What sets nothing read still runs, as a statement of its own.
		if (keepsEffect[candidate] !== 2) return false;
		keepsEffect[candidate] = 1;
		return true;
	};

	// The function, static block or program the collecting walk is in, and
	// those it is in, outermost first.
	let readingFunction = 0;
	/** @type {number[]} */
	const functionStack = [];
	// The definitions a read before their declaration takes a member of.
	/** @type {Set<TreeDefinition>} */
	const readsAsObject = new Set();
	// The `var`s a function other than their own reads.
	/** @type {Set<TreeDefinition>} */
	const readsNested = new Set();
	// By declarator of its function's body, 1 where no call runs before it,
	// 2 where one may.
	/** @type {Uint8Array} */
	let setFirst = new Uint8Array(0);
	// By declarator, 1 where it goes but its value still runs, as a statement,
	// 2 where that may be so: one of a `var`, `let` or `const` of a body.
	/** @type {Uint8Array} */
	let keepsEffect = new Uint8Array(0);
	// Each statement of a body only setting a name with `=`, and its assignment.
	/** @type {number[]} */
	const writeStatements = [];
	// The names those statements set, counted as reads that go already.
	/** @type {Set<number>} */
	const countedWrites = new Set();
	// By assignment, 1 where nothing reads the name it sets: its value prints.
	/** @type {Uint8Array} */
	let dropsWrite = new Uint8Array(0);
	// The functions called once with nothing passed that print as the value
	// they return, and those calls, terser's `inline` of simple functions.
	/** @type {Map<number, number>} */
	const reducing = new Map();
	/** @type {Map<number, number>} */
	const reducedCalls = new Map();
	// By `if` printing as `?:` or conditional, the assignment of one name
	// with one operator all its branches end in, or null, found once.
	/** @type {Map<number, [string, MinifierVariable] | null>} */
	const hoists = new Map();
	// Each `if` the `if` after it may merge with, both leaving the same way;
	// by `if`, 1 where the next continues its test, 2 where it continues the
	// test before it, 3 for both, terser's `if_return` of equal exits.
	/** @type {number[]} */
	const exitPairs = [];
	/** @type {Uint8Array} */
	let mergedExits = new Uint8Array(0);
	// By parameter of such a function, the name passed for it, read instead.
	/** @type {Map<TreeDefinition, number>} */
	const substituted = new Map();
	// By read of a function moved there, the call with nothing passed it is.
	/** @type {Map<number, number>} */
	const callReads = new Map();
	// By such a call, the function it is read in.
	/** @type {Map<number, number>} */
	const callReaders = new Map();
	/** @type {Set<number>} */
	const moveReads = new Set();
	// Each function or class expression with a name of its own.
	/** @type {number[]} */
	const namedExpressions = [];
	// By function declaration read once, that read, and by such a read, the
	// function, static block or program it is in.
	/** @type {Map<number, number>} */
	const defunMoveReads = new Map();
	/** @type {Map<number, number>} */
	const moveReaders = new Map();
	// Each `var` read in such a function, and the function.
	/** @type {(MinifierVariable | number)[]} */
	const laterNested = [];
	// Each `if` whose test may read constants not yet known, and its list.
	/** @type {number[]} */
	const laterTests = [];
	// Each call passing a name, noted again once the walk is done.
	/** @type {Set<number>} */
	const laterCalls = new Set();
	// Each last of a sequence, and what `void` or `!` takes, whose value a
	// statement leaves unread.
	/** @type {Set<number>} */
	const unreadValues = new Set();
	// By `if` whose test is known, the branch it prints as.
	/** @type {Map<number, number>} */
	const keptBranches = new Map();
	// By declarator, 1 for an alias whose reads read the name it is set to,
	// 2 for a function its one read prints.
	/** @type {Uint8Array} */
	let aliasesRead = new Uint8Array(0);
	/** @type {number[] | null} */
	let treeAliases = null;
	/** @type {number[] | null} */
	let treeMoves = null;
	// For the one pass, what names the definitions once `findDropped` ran.
	/** @type {((unprinted: Set<MinifierVariable> | null, readsGone: Map<TreeDefinition, number> | null) => void) | null} */
	let nameDefinitions = null;
	// The definitions no name of which prints, which take no name.
	/** @type {Set<MinifierVariable>} */
	const unprinted = new Set();
	// By read, the assignment or value of what a statement before it set,
	// which it prints instead.
	/** @type {Map<number, number>} */
	const collapsed = new Map();
	// The declarators whose value holds such a read.
	/** @type {Set<number>} */
	const keepsValue = new Set();
	// By function a single read prints, that read; by read, the function's
	// text and the codes it opens and ends with.
	/** @type {Map<number, number>} */
	const movedReads = new Map();
	/** @type {Map<number, [string, number, number, number]>} */
	const movedTexts = new Map();
	// By read, the function declaration it prints, printed before it.
	/** @type {Map<number, number>} */
	const defunReads = new Map();
	// By read before it, a moved function declaration the walk prints first.
	/** @type {Map<number, number>} */
	const earlyDefuns = new Map();
	// The node the print started at, which `findDropped` runs at.
	let firstPrinted = 0;
	/** @type {Set<number>} */
	const movedDefuns = new Set();
	// The definitions a read keeps from being inlined: one before a `var`
	// is set, or where a value would not print as the name does.
	/** @type {Set<TreeDefinition>} */
	const keptNames = new Set();
	// The reads of a `let` or `const` before its declaration, which throw and
	// so print the name, and their definitions, whose other reads still fold.
	/** @type {Set<number>} */
	const deadZoneReads = new Set();
	/** @type {Set<TreeDefinition>} */
	const readInDeadZone = new Set();

	/**
	 * terser's `evaluate` of what folds to a primitive without running code:
	 * literals, operators and the constants noted before it.
	 * @param {number} node an expression
	 * @returns {string | number | boolean | null | undefined} its value, undefined where it has none known
	 */
	const evaluateConstant = (node) => {
		switch (typeOf(node)) {
			case NodeType.Literal: {
				const value = tree.value(node);
				return typeof value === "string" ||
					typeof value === "number" ||
					typeof value === "boolean" ||
					value === null
					? value
					: undefined;
			}
			case NodeType.Identifier: {
				// Without the mangler's analysis nothing is known constant.
				if (mangledNames === null) return undefined;
				const definition = mangledNames[node];
				if (
					!isMinifierVariable(definition) ||
					(deadZoneReads.size !== 0 && deadZoneReads.has(node))
				) {
					return undefined;
				}
				return (
					foldsAtPrint
						? inlined.has(definition) || keptForSize.has(definition)
						: isSetBefore(definition, node)
				)
					? constantValues.get(definition)
					: undefined;
			}
			case NodeType.TemplateLiteral: {
				// A tagged template is not walked into: its tag reads the parts.
				const count = tree.fieldCount(Field.quasis, node);
				let text = "";
				for (let i = 0; i < count; i++) {
					// Untagged, every part has its cooked text.
					text += /** @type {{ raw: string, cooked: string }} */ (
						tree.value(tree.field(i, Field.quasis, node))
					).cooked;
					if (i < count - 1) {
						const value = evaluateConstant(itemOf(i, Field.expressions, node));
						if (value === undefined) return undefined;
						text += String(value);
					}
				}
				return text;
			}
			case NodeType.UnaryExpression: {
				const value = evaluateConstant(childOf(Field.argument, node));
				if (value === undefined) return undefined;
				switch (tree.textOf(Part.operator, node)) {
					case "!":
						return !value;
					case "-":
						return -(/** @type {number} */ (value));
					case "+":
						return Number(value);
					case "~":
						return ~(/** @type {number} */ (value));
					case "typeof":
						return value === null ? "object" : typeof value;
					default:
						return undefined;
				}
			}
			case NodeType.BinaryExpression: {
				const left = evaluateConstant(childOf(Field.left, node));
				if (left === undefined) return undefined;
				const right = evaluateConstant(childOf(Field.right, node));
				if (right === undefined) return undefined;
				return foldBinary(
					/** @type {string} */ (tree.textOf(Part.operator, node)),
					left,
					right
				);
			}
			case NodeType.LogicalExpression: {
				const left = evaluateConstant(childOf(Field.left, node));
				if (left === undefined) return undefined;
				const operator = tree.textOf(Part.operator, node);
				if (
					operator === "&&" ? !left : operator === "||" ? left : left !== null
				) {
					return left;
				}
				return evaluateConstant(childOf(Field.right, node));
			}
			case NodeType.ConditionalExpression: {
				const test = evaluateConstant(childOf(Field.test, node));
				if (test === undefined) return undefined;
				return evaluateConstant(
					childOf(test ? Field.consequent : Field.alternate, node)
				);
			}
			case NodeType.ParenthesizedExpression:
				return evaluateConstant(childOf(Field.expression, node));
			case NodeType.MemberExpression: {
				// terser's `evaluate` of `[a, b][1]`, where the others run nothing.
				const array = childOf(Field.object, node);
				if (
					!tree.flag(Flag.computed, node) ||
					tree.flag(Flag.optional, node) ||
					typeOf(array) !== NodeType.ArrayExpression
				) {
					return undefined;
				}
				const index = evaluateConstant(childOf(Field.property, node));
				const count = tree.fieldCount(Field.elements, array);
				if (typeof index !== "number" || !(index >= 0 && index < count)) {
					return undefined;
				}
				for (let i = 0; i < count; i++) {
					const other = itemOf(i, Field.elements, array);
					if (
						i !== index &&
						other !== 0 &&
						(typeOf(other) === NodeType.SpreadElement || !isPureValue(other))
					) {
						return undefined;
					}
				}
				const element = itemOf(index, Field.elements, array);
				return Number.isInteger(index) && element !== 0
					? evaluateConstant(element)
					: undefined;
			}
			default:
				return undefined;
		}
	};

	/**
	 * Whether a constant noted before has its value wherever the walk is now:
	 * a `let` or `const`, which throws before, or a `var` of the same function
	 * set before anything there runs, or read there after its declaration.
	 * @param {MinifierVariable} definition the constant's definition
	 * @param {number} read the read
	 * @returns {boolean} true where its value may fold
	 */
	const isSetBefore = (definition, read) => {
		if (definition.kind !== DECLARES_VAR) return true;
		if (functionOf(definition) !== readingFunction) return false;
		const declarator = /** @type {number} */ (
			constantDeclarators.get(definition)
		);
		// A declaration of the function's body runs before what follows it there.
		return (
			setFirst[declarator] === 1 ||
			(setFirst[declarator] === 2 && tree.start(read) >= tree.end(declarator))
		);
	};

	/**
	 * @param {number} node an expression printed now
	 * @returns {string | number | boolean | null | undefined} its value from the constants whose reads print their value, undefined where unknown
	 */
	const valueAtPrint = (node) => {
		foldsAtPrint = true;
		const value = evaluateConstant(node);
		foldsAtPrint = false;
		return value;
	};

	/**
	 * @param {number} node an expression printed now
	 * @returns {string | number | boolean | null | undefined} the value it folds to from what it reads, undefined where none prints as well
	 */
	const foldedOf = (node) => {
		const value = valueAtPrint(node);
		return printsLikeName(value) ||
			(typeof value === "number" &&
				Number.isFinite(value) &&
				!Object.is(value, -0))
			? value
			: undefined;
	};

	/**
	 * terser's `evaluate` of a binary expression, where the value prints shorter.
	 * @param {number} node a binary expression not of `in` or `instanceof`, printed now
	 * @returns {string | number | boolean | null | undefined} the value it prints as, undefined where it prints as written
	 */
	const binaryFolded = (node) => {
		const folded = foldedOf(node);
		if (folded === undefined) return undefined;
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		const context = /** @type {JavascriptPrintContext} */ (writer);
		// Its operands printed already, mangled names their length; a left in
		// a string's run printed only its own left, the run joining the rest.
		const unfolded =
			addedLiteral(node) !== undefined && addsToString(left)
				? context.get(left).length + 1 + printedLength(joinedLiterals(node))
				: context.get(left).length +
					/** @type {string} */ (tree.textOf(Part.operator, node)).length +
					context.get(right).length;
		return !hasEdgeComments(left) &&
			!hasEdgeComments(right) &&
			printedLength(folded) < unfolded
			? folded
			: undefined;
	};

	/**
	 * @param {number} node a node printed now, which its place parenthesizes
	 * @returns {boolean} whether it folds to a value an operator around takes bare
	 */
	const foldsBare = (node) => {
		if (typeOf(node) !== NodeType.BinaryExpression || isPrivateIn(node)) {
			return false;
		}
		const operator = tree.textOf(Part.operator, node);
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		if (
			operator === "in" ||
			operator === "instanceof" ||
			(parentType !== NodeType.BinaryExpression &&
				parentType !== NodeType.LogicalExpression) ||
			tree.textOf(Part.operator, parent) === "**" ||
			// The run of a string's `+` prints its left alone.
			(addedLiteral(parent) !== undefined &&
				childOf(Field.left, parent) === node &&
				addsToString(node))
		) {
			return false;
		}
		const folded = binaryFolded(node);
		return (
			typeof folded === "string" || (typeof folded === "number" && folded >= 0)
		);
	};

	/**
	 * Prints a constant's value.
	 * @param {string | number | boolean | null} value the value
	 * @param {boolean} unary whether a unary operator may stand there
	 * @returns {void}
	 */
	const printValue = (value, unary) => {
		if (typeof value === "string") {
			printStringValue(value);
		} else if (typeof value === "number") {
			output.print(value < 0 ? `-${makeNum(-value)}` : makeNum(value));
			output.literalLast = true;
		} else if (typeof value === "boolean") {
			output.print(unary ? (value ? "!0" : "!1") : String(value));
		} else {
			output.print("null");
		}
	};

	/**
	 * @param {string} operator a binary operator
	 * @param {string | number | boolean | null} left its left value
	 * @param {string | number | boolean | null} right its right value
	 * @returns {string | number | boolean | undefined} the value, undefined for an operator it does not fold
	 */
	const foldBinary = (operator, left, right) => {
		/* eslint-disable eqeqeq -- the operators fold as written */
		const l = /** @type {number} */ (left);
		const r = /** @type {number} */ (right);
		switch (operator) {
			case "+":
				return l + r;
			case "-":
				return l - r;
			case "*":
				return l * r;
			case "/":
				return l / r;
			case "%":
				return l % r;
			case "**":
				return l ** r;
			case "<<":
				return l << r;
			case ">>":
				return l >> r;
			case ">>>":
				return l >>> r;
			case "&":
				return l & r;
			case "|":
				return l | r;
			case "^":
				return l ^ r;
			case "==":
				return l == r;
			case "!=":
				return l != r;
			case "===":
				return l === r;
			case "!==":
				return l !== r;
			case "<":
				return l < r;
			case ">":
				return l > r;
			case "<=":
				return l <= r;
			case ">=":
				return l >= r;
			default:
				return undefined;
		}
		/* eslint-enable eqeqeq */
	};

	/**
	 * @param {string | number | boolean | null | undefined} value a constant's value
	 * @returns {boolean} whether a read prints it as a name would print: a string, `null`, a boolean or a number no sign or exponent of which can change how what is around it reads
	 */
	const printsLikeName = (value) =>
		typeof value === "string" ||
		typeof value === "boolean" ||
		value === null ||
		(typeof value === "number" &&
			Number.isFinite(value) &&
			value >= 0 &&
			!Object.is(value, -0));

	/**
	 * @param {string | number | boolean | null} value a constant's value
	 * @returns {number} the length of its print
	 */
	const printedLength = (value) =>
		typeof value === "string"
			? JSON.stringify(value).length
			: typeof value === "number"
				? makeNum(value).length
				: typeof value === "boolean"
					? 2
					: 4;

	/**
	 * Notes a function written where it is called, where nothing reads the
	 * call, whose statements may print in its place, terser's `inline`:
	 * an `if` returning what runs nothing at most, then expression statements,
	 * as `t || (a, b)` or `a, b`, each parameter printing the name passed.
	 * @param {number} call a call
	 * @param {number} parent its parent
	 * @returns {void}
	 */
	const noteUnreadCall = (call, parent) => {
		const fn = childOf(Field.callee, call);
		const type = typeOf(fn);
		if (
			(type !== NodeType.FunctionExpression &&
				type !== NodeType.ArrowFunctionExpression) ||
			!dropsSideEffectFree ||
			!passesNothing(call) ||
			reducedCalls.has(call) ||
			!valueUnread(call, parent) ||
			!passesFixedNames(fn, call)
		) {
			return;
		}
		const body = childOf(Field.body, fn);
		if (typeOf(body) !== NodeType.BlockStatement) return;
		const count = tree.fieldCount(Field.body, body);
		if (count === 0) return;
		for (let i = 0; i < count; i++) {
			const statement = tree.field(i, Field.body, body);
			if (readsCalledFunction(fn, statement)) return;
			if (typeOf(statement) === NodeType.ExpressionStatement) {
				// Printed where the call is, it may open a statement.
				if (
					tree.textOf(Part.directive, statement) !== null ||
					opensAmbiguously(childOf(Field.expression, statement))
				) {
					return;
				}
				continue;
			}
			if (i !== 0 || typeOf(statement) !== NodeType.IfStatement) return;
			// Only the first leaves early, for what its test reads truthy.
			const test = childOf(Field.test, statement);
			let exit = tree.field(0, Field.consequent, statement);
			if (
				typeOf(exit) === NodeType.BlockStatement &&
				tree.fieldCount(Field.body, exit) === 1
			) {
				exit = tree.field(0, Field.body, exit);
			}
			const value =
				typeOf(exit) === NodeType.ReturnStatement
					? childOf(Field.argument, exit)
					: -1;
			if (
				tree.field(0, Field.alternate, statement) !== 0 ||
				value === -1 ||
				(value !== 0 && !isPureValue(value)) ||
				opensAmbiguously(test)
			) {
				return;
			}
		}
		unreadBodies.add(fn);
		for (let i = 0; i < count; i++) {
			unreadStatements.add(tree.field(i, Field.body, body));
		}
		const params = tree.fieldCount(Field.params, fn);
		for (let i = 0; i < params; i++) {
			substituted.set(
				/** @type {TreeDefinition[]} */ (mangledNames)[
					tree.field(i, Field.params, fn)
				],
				itemOf(i, Field.arguments, call)
			);
		}
	};

	/**
	 * Notes the parameters a function called once is passed a constant for,
	 * which its reads may print as a `const` set to it would: the function
	 * called where it is made, or one read once moved to its call, each
	 * parameter a name, no spread passed, nor `arguments` or its own name read.
	 * @param {number} call a call
	 * @returns {void}
	 */
	const noteConstantArguments = (call) => {
		const callee = childOf(Field.callee, call);
		const moved =
			typeOf(callee) === NodeType.Identifier
				? movedCallees.get(callee)
				: undefined;
		const fn = moved === undefined ? callee : moved;
		const type = typeOf(fn);
		if (
			(type !== NodeType.FunctionExpression &&
				type !== NodeType.FunctionDeclaration &&
				type !== NodeType.ArrowFunctionExpression) ||
			tree.flag(Flag.optional, call) ||
			(type !== NodeType.ArrowFunctionExpression &&
				((moved === undefined && tree.field(0, Field.id, fn) !== 0) ||
					readsArguments(fn)))
		) {
			return;
		}
		const params = tree.fieldCount(Field.params, fn);
		const args = tree.fieldCount(Field.arguments, call);
		for (let i = 0; i < params; i++) {
			if (typeOf(itemOf(i, Field.params, fn)) !== NodeType.Identifier) return;
		}
		for (let i = 0; i < args; i++) {
			if (typeOf(itemOf(i, Field.arguments, call)) === NodeType.SpreadElement) {
				return;
			}
		}
		for (let i = 0; i < params && i < args; i++) {
			const param = itemOf(i, Field.params, fn);
			const argument = itemOf(i, Field.arguments, call);
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[param];
			if (
				!isMinifierVariable(definition) ||
				definition.written ||
				definition.declarations !== 1 << definition.kind ||
				/** @type {MinifierScope} */ (definition.scope).isPinned() ||
				keptNames.has(definition) ||
				hasEdgeComments(param) ||
				hasEdgeComments(argument)
			) {
				continue;
			}
			const value = evaluateConstant(argument);
			if (value === undefined) {
				// A name passed may be a parameter passed a constant by a later call.
				if (typeOf(argument) === NodeType.Identifier) laterCalls.add(call);
				continue;
			}
			if (!printsLikeName(value)) continue;
			constantKinds.set(
				definition,
				typeof value === "string" ? "string" : "number"
			);
			constantValues.set(definition, value);
			inlined.set(definition, param);
			constantArguments.set(param, argument);
			passedConstants.set(argument, param);
		}
	};

	/**
	 * Notes a declarator setting a name, declared once and written nowhere,
	 * to what folds to a value a read may print instead of the name.
	 * @param {number} declarator the declarator
	 * @returns {void}
	 */
	const noteConstant = (declarator) => {
		const id = tree.field(0, Field.id, declarator);
		const init = childOf(Field.init, declarator);
		if (typeOf(id) !== NodeType.Identifier || init === 0) return;
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[id];
		if (
			!isMinifierVariable(definition) ||
			definition.written ||
			definition.export !== 0 ||
			definition.undeclared ||
			(definition.global && !dropsToplevel) ||
			definition.declarations !== 1 << definition.kind ||
			definition.identifiers.length > 1 ||
			/** @type {MinifierScope} */ (definition.scope).isPinned() ||
			keptNames.has(definition) ||
			(definition.kind === DECLARES_VAR
				? setFirst[declarator] === 0
				: definition.kind !== DECLARES_LET &&
					definition.kind !== DECLARES_CONST)
		) {
			return;
		}
		const value = evaluateConstant(init);
		constantDeclarators.set(definition, declarator);
		// Read before it is set, it is `undefined`, which converts as freely.
		if (value !== undefined) {
			constantKinds.set(
				definition,
				typeof value === "string" ? "string" : "number"
			);
		}
		if (
			!printsLikeName(value) ||
			(typeof value === "number" && readsAsObject.has(definition))
		) {
			return;
		}
		constantValues.set(
			definition,
			/** @type {string | number | boolean | null} */ (value)
		);
		// A read in its dead zone prints the name, so the declaration stays.
		if (readInDeadZone.has(definition)) keptForSize.add(definition);
		else inlined.set(definition, declarator);
	};

	/**
	 * Notes a name read, keeping its definition from being inlined where the
	 * read comes before a `var` is set or a value would print otherwise.
	 * @param {number} node the name
	 * @param {number} parent its parent
	 * @returns {void}
	 */
	const noteRead = (node, parent) => {
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[node];
		if (!isMinifierVariable(definition) || keptNames.has(definition)) return;
		const parentType = typeOf(parent);
		if (
			parentType === NodeType.VariableDeclarator &&
			tree.field(0, Field.id, parent) === node
		) {
			return;
		}
		// What prints otherwise than the name, whatever the value.
		const printsOtherwise =
			parentType === NodeType.ParenthesizedExpression ||
			parentType === NodeType.ExpressionStatement ||
			parentType === NodeType.ExportSpecifier ||
			(parentType === NodeType.UnaryExpression &&
				tree.textOf(Part.operator, parent) === "delete");
		const asObject =
			parentType === NodeType.MemberExpression &&
			tree.field(0, Field.object, parent) === node;
		const declarator = inlined.get(definition);
		if (
			definition.kind === DECLARES_VAR &&
			functionOf(definition) !== readingFunction &&
			(declarator === undefined || mayRunEarly(functionOf(definition)))
		) {
			const declared = nestedIn(functionOf(definition));
			// A function declared and read once runs only after that read.
			if (declared !== 0 && defunMoveReads.has(declared)) {
				laterNested.push(definition, declared);
			} else {
				readsNested.add(definition);
			}
		}
		if (declarator === undefined) {
			// Read before its declaration, a `let` or `const` throws, from any
			// function; a `var` reads `undefined` in its own function, run first.
			const beforeDeclaration =
				definition.kind !== DECLARES_VAR &&
				!constantDeclarators.has(definition);
			if (
				printsOtherwise ||
				(definition.kind === DECLARES_VAR
					? functionOf(definition) === readingFunction
					: !beforeDeclaration)
			) {
				keptNames.add(definition);
				return;
			}
			// A parameter has no dead zone: its value is noted at a later call.
			if (beforeDeclaration && definition.kind !== DECLARES_FUNARG) {
				deadZoneReads.add(node);
				readInDeadZone.add(definition);
			}
			if (asObject) readsAsObject.add(definition);
			return;
		}
		if (
			printsOtherwise ||
			(asObject && typeof constantValues.get(definition) === "number")
		) {
			keptNames.add(definition);
			inlined.delete(definition);
		}
	};

	/**
	 * @param {MinifierVariable} definition a name's definition
	 * @returns {number} the function, static block or program whose scope holds it, as a `SyntaxTree`'s analysis numbers it
	 */
	const functionOf = (definition) =>
		/** @type {number} */ (
			/** @type {PrintNode | number} */ (
				/** @type {MinifierScope} */ (
					/** @type {MinifierScope} */ (definition.scope).variableScope
				).node
			)
		);

	/**
	 * Keeps the constants whose reads print shorter as their value, terser's
	 * test: the value no longer than the name and its declaration shared out.
	 * @returns {void}
	 */
	const chooseInlined = () => {
		for (const [definition, declarator] of inlined) {
			// A `var` set after a call is read only where it runs after it.
			if (setFirst[declarator] === 2 && readsNested.has(definition)) {
				inlined.delete(definition);
				continue;
			}
			const id =
				typeOf(declarator) === NodeType.Identifier
					? declarator
					: tree.field(0, Field.id, declarator);
			const name = tree.name(id).length;
			const value = printedLength(
				/** @type {string | number | boolean | null} */ (
					constantValues.get(definition)
				)
			);
			const reads = definition.referenceCount;
			if (reads > 0 && value <= name + (name + 2 + value) / reads) {
				droppedReads.set(definition, reads);
				// A parameter goes with what is passed for it.
				if (declarator === id) dropped[declarator] = 1;
			} else {
				// Its value still folds where that prints shorter.
				keptForSize.add(definition);
				inlined.delete(definition);
			}
		}
	};

	/**
	 * @param {number} node a name
	 * @returns {boolean} whether a read of it prints its constant's value
	 */
	const isInlinedRead = (node) =>
		inlined.size !== 0 &&
		inlined.has(
			/** @type {MinifierVariable} */ (
				/** @type {TreeDefinition[]} */ (mangledNames)[node]
			)
		);

	/**
	 * @param {number} node a name
	 * @param {number} parent its parent
	 * @returns {boolean} whether a function printed there needs no parentheses
	 */
	const takesFunction = (node, parent) => {
		switch (typeOf(parent)) {
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				return childOf(Field.callee, parent) !== node;
			case NodeType.ConditionalExpression:
				return childOf(Field.test, parent) !== node;
			case NodeType.AssignmentExpression:
			case NodeType.AssignmentPattern:
				return childOf(Field.right, parent) === node;
			case NodeType.Property:
				return childOf(Field.value, parent) === node;
			case NodeType.ArrayExpression:
			case NodeType.VariableDeclarator:
			case NodeType.ReturnStatement:
			case NodeType.ArrowFunctionExpression:
			case NodeType.SequenceExpression:
			case NodeType.TemplateLiteral:
			case NodeType.SpreadElement:
				return true;
			default:
				return false;
		}
	};

	/**
	 * terser's `needs_parens` of a binary or logical expression printed where
	 * a read is, there or as the operand of the operator around it.
	 * @param {number} read the read
	 * @param {number} value the expression
	 * @returns {boolean} whether it prints in parentheses there
	 */
	const operationNeedsParens = (read, value) => {
		if (opensAmbiguously(value) && firstInStatement(read, 0, true)) return true;
		const parent = parentAt(0);
		switch (typeOf(parent)) {
			case NodeType.VariableDeclarator:
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
			case NodeType.IfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement:
			case NodeType.SwitchStatement:
			case NodeType.SwitchCase:
			case NodeType.ArrayExpression:
			case NodeType.SpreadElement:
			case NodeType.TemplateLiteral:
			case NodeType.ConditionalExpression:
				return false;
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				return childOf(Field.callee, parent) === read;
			case NodeType.Property:
				return childOf(Field.value, parent) !== read;
			case NodeType.AssignmentExpression:
				return childOf(Field.right, parent) !== read;
			case NodeType.BinaryExpression:
			case NodeType.LogicalExpression: {
				const operator = tree.textOf(Part.operator, value);
				const parentOperator = tree.textOf(Part.operator, parent);
				// `??` mixed with `||` or `&&` is a syntax error without parentheses.
				if (
					(operator === "??" &&
						(parentOperator === "||" || parentOperator === "&&")) ||
					(parentOperator === "??" && (operator === "||" || operator === "&&"))
				) {
					return true;
				}
				const parentPrecedence =
					PRECEDENCE[/** @type {string} */ (parentOperator)];
				const precedence = PRECEDENCE[/** @type {string} */ (operator)];
				return (
					parentPrecedence > precedence ||
					(parentPrecedence === precedence &&
						(childOf(Field.right, parent) === read || parentOperator === "**"))
				);
			}
			case NodeType.MemberExpression:
				return !(
					tree.flag(Flag.computed, parent) &&
					childOf(Field.property, parent) === read
				);
			default:
				return true;
		}
	};

	/**
	 * Whether an assignment or conditional printed where a read is needs
	 * parentheses: anywhere but where any expression but a sequence stands.
	 * @param {number} read the read
	 * @returns {boolean} whether it prints in parentheses there
	 */
	const lowNeedsParens = (read) => {
		const parent = parentAt(0);
		switch (typeOf(parent)) {
			case NodeType.VariableDeclarator:
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
			case NodeType.IfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement:
			case NodeType.SwitchStatement:
			case NodeType.SwitchCase:
			case NodeType.ArrayExpression:
			case NodeType.SpreadElement:
			case NodeType.TemplateLiteral:
			case NodeType.SequenceExpression:
			case NodeType.ParenthesizedExpression:
			case NodeType.ExpressionStatement:
				return false;
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				return childOf(Field.callee, parent) === read;
			case NodeType.Property:
				return (
					childOf(Field.value, parent) !== read &&
					!(
						tree.flag(Flag.computed, parent) &&
						childOf(Field.key, parent) === read
					)
				);
			case NodeType.AssignmentExpression:
				return childOf(Field.right, parent) !== read;
			case NodeType.ConditionalExpression:
				return childOf(Field.test, parent) === read;
			case NodeType.MemberExpression:
				return !(
					tree.flag(Flag.computed, parent) &&
					childOf(Field.property, parent) === read
				);
			default:
				return true;
		}
	};

	/**
	 * Whether a unary expression printed where a read is needs parentheses:
	 * only where a member, callee, tag or `**` takes a simpler one.
	 * @param {number} read the read
	 * @returns {boolean} whether it prints in parentheses there
	 */
	const unaryNeedsParensAt = (read) => {
		const parent = parentAt(0);
		switch (typeOf(parent)) {
			case NodeType.MemberExpression:
				return childOf(Field.object, parent) === read;
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				return childOf(Field.callee, parent) === read;
			case NodeType.TaggedTemplateExpression:
				return true;
			case NodeType.BinaryExpression:
				return (
					tree.textOf(Part.operator, parent) === "**" &&
					childOf(Field.left, parent) === read
				);
			default:
				return false;
		}
	};

	/**
	 * terser's `needs_parens` of an object, class or function printed where a
	 * read is: first in its statement, or an object an arrow returns.
	 * @param {number} read the read
	 * @param {number} type the value's type
	 * @returns {boolean} whether it prints in parentheses there
	 */
	const literalNeedsParensAt = (read, type) => {
		if (type === NodeType.FunctionExpression) {
			return functionNeedsParens(read, 0);
		}
		const parent = parentAt(0);
		return (
			(type === NodeType.ObjectExpression &&
				typeOf(parent) === NodeType.ArrowFunctionExpression &&
				childOf(Field.body, parent) === read) ||
			(!opensAfterParenthesis(read, 0) && firstInStatement(read, 0, true))
		);
	};

	/**
	 * Prints, where a read is, what the statement before it set: in
	 * parentheses but for an expression no operator around can split.
	 * @param {number} node the read
	 * @returns {void}
	 */
	const printCollapsed = (node) => {
		const value = /** @type {number} */ (collapsed.get(node));
		// An assignment setting nothing prints as its value.
		const shown = dropsWrite[value] === 1 ? childOf(Field.right, value) : value;
		const type = typeOf(shown);
		if (type === NodeType.SequenceExpression) {
			// The declarator or assignment it was set by printed it in parentheses,
			// which a `return`, `throw` or sequence around the read does without.
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				value
			);
			const parentType = typeOf(parentAt(0));
			if (
				parentType === NodeType.ReturnStatement ||
				parentType === NodeType.ThrowStatement ||
				parentType === NodeType.SequenceExpression
			) {
				printSlice(text.slice(1, -1));
			} else {
				printPiece(text, heads[value], tails[value]);
			}
			return;
		}
		const wrap = !(
			((type === NodeType.BinaryExpression ||
				type === NodeType.LogicalExpression) &&
				!operationNeedsParens(node, shown)) ||
			((type === NodeType.AssignmentExpression ||
				type === NodeType.ConditionalExpression) &&
				!lowNeedsParens(node) &&
				!(opensAmbiguously(shown) && firstInStatement(node, 0, true))) ||
			((type === NodeType.UnaryExpression ||
				type === NodeType.UpdateExpression) &&
				!unaryNeedsParensAt(node)) ||
			((type === NodeType.ObjectExpression ||
				type === NodeType.ClassExpression ||
				type === NodeType.FunctionExpression) &&
				!literalNeedsParensAt(node, type)) ||
			// The global `undefined` may print as `void 0`.
			(type === NodeType.Identifier &&
				!(isGlobalUndefined(shown) && unaryNeedsParensAt(node))) ||
			type === NodeType.Literal ||
			type === NodeType.ThisExpression ||
			type === NodeType.ArrayExpression ||
			type === NodeType.TemplateLiteral ||
			((type === NodeType.CallExpression ||
				type === NodeType.MemberExpression ||
				// With arguments, a `new` is no callee's `new` without them.
				(type === NodeType.NewExpression &&
					tree.fieldCount(Field.arguments, shown) > 0)) &&
				!(opensAmbiguously(shown) && firstInStatement(node, 0, true)))
		);
		if (wrap) output.print("(");
		printPiece(
			/** @type {JavascriptPrintContext} */ (writer).consume(value),
			heads[value],
			tails[value]
		);
		if (wrap) output.print(")");
		if ((endState[value] & ENDS_IN_LITERAL) !== 0 && !wrap) {
			output.literalLast = true;
		}
	};

	/**
	 * @param {number} node a name
	 * @returns {boolean} whether it is the one read of a function printed where it is
	 */
	const isMovedRead = (node) =>
		(movedTexts.size !== 0 && movedTexts.has(node)) ||
		(defunReads.size !== 0 && defunReads.has(node));

	/**
	 * Prints the function a name's one read reads where the name is.
	 * @param {number} node the name
	 * @param {number} parent its parent
	 * @returns {void}
	 */
	const printMoved = (node, parent) => {
		const defun = defunReads.get(node);
		const [text, head, tail, value] =
			defun === undefined
				? /** @type {[string, number, number, number]} */ (movedTexts.get(node))
				: [
						/** @type {JavascriptPrintContext} */ (writer).consume(defun),
						heads[defun],
						tails[defun],
						defun
					];
		const type = typeOf(value);
		// One printing as its value is parenthesized as that, by its call.
		const wrap =
			reducing.size !== 0 && reducing.has(value)
				? false
				: type === NodeType.FunctionExpression ||
					  type === NodeType.FunctionDeclaration
					? functionNeedsParens(node, 0)
					: !takesFunction(node, parent);
		if (wrap) output.print("(");
		printPiece(text, head, tail);
		if (wrap) output.print(")");
	};

	/**
	 * Prints the value of the constant a name reads, where the name is.
	 * @param {number} node the name
	 * @param {boolean} unary whether a unary operator may stand there
	 * @returns {void}
	 */
	const printConstant = (node, unary) => {
		printValue(
			/** @type {string | number | boolean | null} */ (
				constantValues.get(
					/** @type {MinifierVariable} */ (
						/** @type {TreeDefinition[]} */ (mangledNames)[node]
					)
				)
			),
			unary
		);
	};

	// By function, whether it reads its own `arguments`, found once.
	/** @type {Map<number, boolean>} */
	const argumentsReaders = new Map();

	/**
	 * @param {number} fn a function
	 * @returns {boolean} whether it reads its own `arguments`, as an arrow inside it would
	 */
	const readsArguments = (fn) => {
		let found = argumentsReaders.get(fn);
		if (found === undefined) {
			found = findNode(tree.field(0, Field.body, fn), (node) => {
				switch (tree.type(node)) {
					case NodeType.Identifier:
						return tree.name(node) === "arguments" ? true : undefined;
					case NodeType.FunctionExpression:
					case NodeType.FunctionDeclaration:
						return false;
					default:
						return undefined;
				}
			});
			argumentsReaders.set(fn, found);
		}
		return found;
	};

	/**
	 * @param {number} fn a function
	 * @param {number} call a call of it
	 * @returns {number} the one expression it returns, which the call may print as, 0 where none: it waits, yields, holds comments, reads its own `this`, `arguments` or name, or is passed other than a name never written for each parameter, which a function or class it holds could not read
	 */
	const reducedValue = (fn, call) => {
		if (!passesFixedNames(fn, call)) return 0;
		let value = childOf(Field.body, fn);
		if (typeOf(value) === NodeType.BlockStatement) {
			if (tree.fieldCount(Field.body, value) !== 1) return 0;
			const statement = tree.field(0, Field.body, value);
			if (typeOf(statement) !== NodeType.ReturnStatement) return 0;
			value = childOf(Field.argument, statement);
			if (value === 0) return 0;
		}
		return readsCalledFunction(fn, value) ? 0 : value;
	};

	/**
	 * @param {number} fn a function written where it is called
	 * @param {number} call the call
	 * @returns {boolean} whether it runs at once, neither async nor a generator nor holding comments, each parameter a name never written passed one set before the call
	 */
	const passesFixedNames = (fn, call) => {
		const count = tree.fieldCount(Field.params, fn);
		if (
			count !== tree.fieldCount(Field.arguments, call) ||
			tree.flag(Flag.async, fn) ||
			tree.flag(Flag.generator, fn) ||
			holdsComments(fn)
		) {
			return false;
		}
		for (let i = 0; i < count; i++) {
			const param = tree.field(i, Field.params, fn);
			const argument = itemOf(i, Field.arguments, call);
			if (
				typeOf(param) !== NodeType.Identifier ||
				typeOf(argument) !== NodeType.Identifier ||
				!isFixedName(param) ||
				!isFixedName(argument) ||
				!readsSet(
					/** @type {MinifierVariable} */ (
						/** @type {TreeDefinition[]} */ (mangledNames)[argument]
					),
					tree.start(call)
				)
			) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} fn a function written where it is called
	 * @param {number} value what of it would print in the call's place
	 * @returns {boolean} whether that reads the function itself: its `this`, `arguments`, `new.target`, `super` or name, or, where it takes parameters, any function or class, whose names could hide what a parameter is passed
	 */
	const readsCalledFunction = (fn, value) => {
		const count = tree.fieldCount(Field.params, fn);
		const id = tree.field(0, Field.id, fn);
		const name = id === 0 ? "" : tree.name(id);
		/**
		 * @param {number} node a node of the value
		 * @returns {boolean | undefined} true where it reads the function itself, undefined to look inside
		 */
		const readsFunction = (node) => {
			switch (tree.type(node)) {
				case NodeType.ThisExpression:
				case NodeType.Super:
				case NodeType.MetaProperty:
					return true;
				case NodeType.Identifier:
					// A direct `eval` reads the function's own `arguments` and names.
					return (
						tree.name(node) === "arguments" ||
						tree.name(node) === "eval" ||
						tree.name(node) === name
					);
				case NodeType.ArrowFunctionExpression:
					// An arrow reads the function's `this` and `arguments`.
					return count !== 0 || undefined;
				case NodeType.ClassExpression:
				case NodeType.ClassDeclaration:
					// Its heritage and computed keys run in the function.
					if (count === 0 && classRunsIn(node, readsFunction)) return true;
				// falls through
				case NodeType.FunctionExpression:
				case NodeType.FunctionDeclaration:
					// What it reads there is its own, but for a name, which a
					// direct `eval` in it reads too.
					return Boolean(
						count !== 0 ||
						(name !== "" &&
							findNode(node, (inner) =>
								tree.type(inner) === NodeType.Identifier &&
								(tree.name(inner) === name || tree.name(inner) === "eval")
									? true
									: undefined
							))
					);
				default:
					return undefined;
			}
		};
		return findNode(value, readsFunction);
	};

	/**
	 * Whether what a class runs where it is defined, its heritage and computed
	 * keys, holds a node a test finds.
	 * @param {number} node the class
	 * @param {(node: number) => boolean | undefined} test the test, as `findNode` runs it
	 * @returns {boolean} true where one does
	 */
	const classRunsIn = (node, test) => {
		const heritage = childOf(Field.superClass, node);
		if (heritage !== 0 && findNode(heritage, test)) return true;
		const body = childOf(Field.body, node);
		const count = tree.fieldCount(Field.body, body);
		for (let i = 0; i < count; i++) {
			const member = tree.field(i, Field.body, body);
			if (
				tree.flag(Flag.computed, member) &&
				findNode(childOf(Field.key, member), test)
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * @param {number} name a name
	 * @returns {boolean} whether it is a variable of this source nothing ever writes but its declaration
	 */
	const isFixedName = (name) => {
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[name];
		return (
			isMinifierVariable(definition) &&
			!definition.undeclared &&
			!definition.written
		);
	};

	/**
	 * Notes a function a call prints as the value of, each parameter read
	 * printing as the name passed for it.
	 * @param {number} fn the function
	 * @param {number} call the call
	 * @param {number} value what it returns
	 * @returns {void}
	 */
	const noteReduced = (fn, call, value) => {
		reducing.set(fn, value);
		reducedCalls.set(call, fn);
		const count = tree.fieldCount(Field.params, fn);
		for (let i = 0; i < count; i++) {
			substituted.set(
				/** @type {TreeDefinition[]} */ (mangledNames)[
					tree.field(i, Field.params, fn)
				],
				itemOf(i, Field.arguments, call)
			);
		}
	};

	/**
	 * @param {number} call a node
	 * @returns {boolean} whether it is a call that may print as what it calls returns: no `?.`, no comment printing in it
	 */
	const passesNothing = (call) =>
		typeOf(call) === NodeType.CallExpression &&
		!tree.flag(Flag.optional, call) &&
		!holdsComments(call);

	/**
	 * Notes a call of a function written in place that prints as its value.
	 * @param {number} call a call
	 * @returns {void}
	 */
	const noteReducedCall = (call) => {
		const callee = childOf(Field.callee, call);
		const type = typeOf(callee);
		if (
			type !== NodeType.FunctionExpression &&
			type !== NodeType.ArrowFunctionExpression
		) {
			return;
		}
		const value = reducedValue(callee, call);
		if (value !== 0 && passesNothing(call)) noteReduced(callee, call, value);
	};

	/**
	 * @param {number} statement a statement
	 * @returns {number} the `break`, `continue` or `return` of nothing it is, alone or in a block, as an `if` without `else` its body, 0 for none
	 */
	const bareExitOf = (statement) => {
		if (
			typeOf(statement) !== NodeType.IfStatement ||
			tree.field(0, Field.alternate, statement) !== 0 ||
			hasEdgeComments(statement)
		) {
			return 0;
		}
		let body = tree.field(0, Field.consequent, statement);
		if (
			typeOf(body) === NodeType.BlockStatement &&
			tree.fieldCount(Field.body, body) === 1 &&
			!holdsComments(body)
		) {
			body = tree.field(0, Field.body, body);
		}
		switch (typeOf(body)) {
			case NodeType.BreakStatement:
			case NodeType.ContinueStatement:
				return tree.field(0, Field.label, body) === 0 && !hasEdgeComments(body)
					? body
					: 0;
			case NodeType.ReturnStatement:
				return tree.field(0, Field.argument, body) === 0 &&
					!hasEdgeComments(body)
					? body
					: 0;
			default:
				return 0;
		}
	};

	/**
	 * @param {number} statement a statement
	 * @param {number} next the statement after it
	 * @returns {boolean} whether both are `if`s leaving alike, which print as one testing either
	 */
	const sameExit = (statement, next) => {
		const exit = bareExitOf(statement);
		if (exit !== 0) return typeOf(bareExitOf(next)) === typeOf(exit);
		const value = returnedValueOf(statement);
		return value !== 0 && sameValue(value, returnedValueOf(next));
	};

	/**
	 * @param {number} statement a statement
	 * @returns {number} the value an `if` without `else` returns as its body, alone or in a block, 0 for none
	 */
	const returnedValueOf = (statement) => {
		if (
			typeOf(statement) !== NodeType.IfStatement ||
			tree.field(0, Field.alternate, statement) !== 0 ||
			hasEdgeComments(statement)
		) {
			return 0;
		}
		let body = tree.field(0, Field.consequent, statement);
		if (
			typeOf(body) === NodeType.BlockStatement &&
			tree.fieldCount(Field.body, body) === 1 &&
			!holdsComments(body)
		) {
			body = tree.field(0, Field.body, body);
		}
		return typeOf(body) === NodeType.ReturnStatement && !holdsComments(body)
			? tree.field(0, Field.argument, body)
			: 0;
	};

	/**
	 * @param {number} node an expression
	 * @param {number} other another, 0 for none
	 * @returns {boolean} whether both are written alike, every name read of the same binding
	 */
	const sameValue = (node, other) => {
		const type = typeOf(node);
		if (other === 0 || typeOf(other) !== type) return false;
		for (const flag of FLAG_BITS) {
			if (tree.flag(flag, node) !== tree.flag(flag, other)) return false;
		}
		if (
			tree.textOf(Part.operator, node) !== tree.textOf(Part.operator, other) ||
			tree.textOf(Part.kind, node) !== tree.textOf(Part.kind, other)
		) {
			return false;
		}
		if (type === NodeType.Property && !tree.flag(Flag.computed, node)) {
			// A key quoted or not prints alike, where quotes go.
			const key = tree.field(0, Field.key, node);
			const otherKey = tree.field(0, Field.key, other);
			const value = tree.field(0, Field.value, node);
			const otherValue = tree.field(0, Field.value, other);
			return (
				!hasEdgeComments(key) &&
				!hasEdgeComments(otherKey) &&
				!hasEdgeComments(value) &&
				!hasEdgeComments(otherValue) &&
				printedKeyOf(node, key) === printedKeyOf(other, otherKey) &&
				(!output.option("keep_quoted_props") ||
					keyQuoteOf(node) === keyQuoteOf(other)) &&
				sameValue(value, otherValue)
			);
		}
		switch (type) {
			case NodeType.Identifier:
				return (
					tree.name(node) === tree.name(other) &&
					(mangledNames === null || mangledNames[node] === mangledNames[other])
				);
			case NodeType.PrivateIdentifier:
				return tree.name(node) === tree.name(other);
			case NodeType.Literal:
				return (
					tree.textOf(Part.raw, node) === tree.textOf(Part.raw, other) ||
					(typeof tree.value(node) !== "object" &&
						tree.value(node) === tree.value(other))
				);
			case NodeType.TemplateElement:
				return (
					/** @type {{ raw: string }} */ (tree.value(node)).raw ===
					/** @type {{ raw: string }} */ (tree.value(other)).raw
				);
			default: {
				const fields = CHILD_FIELDS[tree.type(node)];
				for (let f = 0; f < fields.length; f++) {
					const count = tree.fieldCount(fields[f], node);
					if (tree.fieldCount(fields[f], other) !== count) return false;
					for (let i = 0; i < count; i++) {
						const child = tree.field(i, fields[f], node);
						const otherChild = tree.field(i, fields[f], other);
						if (
							child === 0
								? otherChild !== 0
								: !sameValue(child, otherChild) ||
									hasEdgeComments(child) ||
									hasEdgeComments(otherChild)
						) {
							return false;
						}
					}
				}
				return true;
			}
		}
	};

	/**
	 * Notes a statement only setting a name with `=`, terser's `unused` of an
	 * assignment: the name it sets counts as unread there, so a name only set
	 * may go, and with it what sets it.
	 * @param {number} statement an expression statement of a body
	 * @returns {void}
	 */
	const noteWrite = (statement) => {
		const assignment = childOf(Field.expression, statement);
		if (
			typeOf(assignment) !== NodeType.AssignmentExpression ||
			tree.textOf(Part.operator, assignment) !== "=" ||
			hasEdgeComments(statement)
		) {
			return;
		}
		const name = childOf(Field.left, assignment);
		if (typeOf(name) !== NodeType.Identifier || hasEdgeComments(name)) return;
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[name];
		if (
			!isMinifierVariable(definition) ||
			// Setting a `const`, `using`, import or class name throws, as does
			// a function expression's own name in strict code or a name in its
			// dead zone, which dropping it would not.
			definition.kind === DECLARES_CONST ||
			definition.kind === DECLARES_USING ||
			definition.kind === DECLARES_IMPORT ||
			definition.kind === DECLARES_CLASS ||
			definition.kind === DECLARES_DEF_CLASS ||
			definition.kind === DECLARES_LAMBDA ||
			!writesSet(definition, tree.start(statement)) ||
			// `arguments` reads what a parameter is set to, in sloppy code.
			(definition.kind === DECLARES_FUNARG &&
				readsArguments(functionOf(definition)))
		) {
			return;
		}
		droppedReads.set(definition, (droppedReads.get(definition) || 0) + 1);
		countedWrites.add(name);
		writeStatements.push(statement, assignment);
	};

	/**
	 * Notes what a statement's value is made of that it leaves unread: the
	 * last of a sequence, and what a `void` or `!` takes.
	 * @param {number} node a statement's expression
	 * @returns {void}
	 */
	const noteUnreadValue = (node) => {
		for (;;) {
			const type = typeOf(node);
			if (type === NodeType.SequenceExpression) {
				node = itemOf(
					tree.fieldCount(Field.expressions, node) - 1,
					Field.expressions,
					node
				);
			} else if (
				type === NodeType.UnaryExpression &&
				(tree.textOf(Part.operator, node) === "void" ||
					tree.textOf(Part.operator, node) === "!") &&
				!hasEdgeComments(node)
			) {
				node = childOf(Field.argument, node);
			} else {
				return;
			}
			unreadValues.add(node);
		}
	};

	/**
	 * Lists what may print nothing, each declarator and function declaration
	 * of a body, and notes the constants a read may print the value of.
	 * @param {number} node the node walked
	 * @param {number} parent its parent, 0 for the program
	 * @param {number[]} candidates the list
	 * @returns {void}
	 */
	const collectDroppable = (node, parent, candidates) => {
		const type = typeOf(node);
		if (type === NodeType.ExpressionStatement && dropsSideEffectFree) {
			noteUnreadValue(childOf(Field.expression, node));
		}
		if (
			type === NodeType.Program ||
			type === NodeType.BlockStatement ||
			type === NodeType.StaticBlock
		) {
			const scopesVars =
				type === NodeType.Program || FUNCTION_TYPES[typeOf(parent)] === 1;
			// Whether no statement so far calls anything: a `var` after them is
			// set before any function reading it can run.
			let quiet = scopesVars;
			// Whether a statement before always leaves the list, terser's `dead_code`.
			let exited = false;
			const count = tree.fieldCount(Field.body, node);
			for (let i = 0; i < count; i++) {
				const statement = tree.field(i, Field.body, node);
				if (exited && neverReached(statement)) {
					dropped[statement] = 1;
					findNode(statement, discountRead);
					continue;
				}
				if (dropsDeadCode && exitsAlways(statement)) exited = true;
				// Each declarator is set before the next, where those fold.
				noteInitialized(statement);
				if (i + 1 < count) {
					const next = tree.field(i + 1, Field.body, node);
					collapseInto(statement, next);
					if (sameExit(statement, next)) exitPairs.push(statement, next);
					if (
						typeOf(statement) === NodeType.IfStatement &&
						tree.field(0, Field.alternate, statement) === 0 &&
						(typeOf(next) === NodeType.ReturnStatement ||
							typeOf(next) === NodeType.IfStatement)
					) {
						returnPairs.set(statement, next);
						returnedBy.set(next, statement);
					}
				}
				const statementType = typeOf(statement);
				if (statementType === NodeType.VariableDeclaration) {
					const declarations = tree.fieldCount(Field.declarations, statement);
					for (let j = 0; j < declarations; j++) {
						const declarator = tree.field(j, Field.declarations, statement);
						if (scopesVars) setFirst[declarator] = quiet ? 1 : 2;
						// A `using` binding is disposed of when its block ends, read or not.
						if (
							!disposes(statement) &&
							!hasEdgeComments(statement) &&
							!hasEdgeComments(declarator)
						) {
							candidates.push(declarator);
							keepsEffect[declarator] = 2;
						}
						const init = childOf(Field.init, declarator);
						if (quiet && init !== 0 && findNode(init, findRun)) quiet = false;
					}
				} else if (statementType === NodeType.FunctionDeclaration) {
					if (!hasEdgeComments(statement)) candidates.push(statement);
				} else if (statementType === NodeType.IfStatement) {
					if (neverRuns(statement)) {
						dropped[statement] = 1;
						findNode(statement, discountRead);
					} else {
						laterTests.push(statement, node);
					}
				} else if (quiet && findNode(statement, findRun)) {
					quiet = false;
				}
				// What runs nothing is known once the walk has seen every read.
				if (statementType === NodeType.ExpressionStatement) {
					expressionStatements.push(statement);
					noteWrite(statement);
				}
			}
		} else if (type === NodeType.VariableDeclarator) {
			noteConstant(node);
		} else if (type === NodeType.Identifier) {
			noteRead(node, parent);
			if (tree.name(node) === "Object") noteObjectUse(node, parent);
			if (probingTry !== 0) probedReads.add(node);
			if (moveReads.has(node)) moveReaders.set(node, readingFunction);
			if (
				moveReads.has(node) &&
				passesNothing(parent) &&
				childOf(Field.callee, parent) === node
			) {
				callReads.set(node, parent);
				callReaders.set(parent, readingFunction);
			}
		} else if (type === NodeType.CallExpression) {
			noteReducedCall(node);
			noteConstantArguments(node);
			noteUnreadCall(node, parent);
		} else if (type === NodeType.NewExpression) {
			noteConstantArguments(node);
		} else if (type === NodeType.MemberExpression) {
			noteObjectWrite(node, parent);
		} else if (type === NodeType.WithStatement) {
			answersWith = true;
		} else if (type === NodeType.ThisExpression) {
			if (thisThrows) throwingThis.add(node);
		} else if (type === NodeType.ReturnStatement) {
			const argument = childOf(Field.argument, node);
			if (
				argument !== 0 &&
				tree.flag(Flag.async, readingFunction) &&
				tree.flag(Flag.generator, readingFunction)
			) {
				awaitedReturns.add(argument);
			}
		} else if (
			(type === NodeType.FunctionExpression ||
				type === NodeType.ClassExpression) &&
			tree.field(0, Field.id, node) !== 0
		) {
			namedExpressions.push(node);
		}
		const outerFunction = readingFunction;
		const outerProbing = probingTry;
		const outerDerived = inDerivedClass;
		const outerThrows = thisThrows;
		if (
			type === NodeType.ClassDeclaration ||
			type === NodeType.ClassExpression
		) {
			inDerivedClass = tree.field(0, Field.superClass, node) !== 0;
		} else if (
			type === NodeType.StaticBlock ||
			type === NodeType.PropertyDefinition ||
			type === NodeType.FunctionDeclaration
		) {
			thisThrows = false;
		} else if (type === NodeType.FunctionExpression) {
			thisThrows =
				inDerivedClass &&
				typeOf(parent) === NodeType.MethodDefinition &&
				tree.textOf(Part.kind, parent) === "constructor";
		}
		if (FUNCTION_TYPES[type] === 1 || type === NodeType.StaticBlock) {
			readingFunction = node;
			functionStack.push(node);
			if (FUNCTION_TYPES[type] === 1) probingTry = 0;
		}
		const fields = CHILD_FIELDS[tree.type(node)];
		for (let f = 0; f < fields.length; f++) {
			const probes =
				type === NodeType.TryStatement && fields[f] === Field.block;
			if (probes) probingTry++;
			const count = tree.fieldCount(fields[f], node);
			for (let i = 0; i < count; i++) {
				const child = tree.field(i, fields[f], node);
				if (child !== 0) collectDroppable(child, node, candidates);
			}
			if (probes) probingTry--;
		}
		if (readingFunction !== outerFunction) functionStack.pop();
		readingFunction = outerFunction;
		probingTry = outerProbing;
		inDerivedClass = outerDerived;
		thisThrows = outerThrows;
	};

	/**
	 * Notes every member of the global `Object` as written where the object
	 * goes anywhere but a member access, a call, `typeof` or `instanceof`.
	 * @param {number} node a name `Object`
	 * @param {number} parent its parent
	 * @returns {void}
	 */
	const noteObjectUse = (node, parent) => {
		if (objectWrites === true) return;
		switch (typeOf(parent)) {
			case NodeType.MemberExpression:
				if (childOf(Field.object, parent) === node) return;
				break;
			case NodeType.CallExpression:
				if (childOf(Field.callee, parent) === node) return;
				break;
			case NodeType.UnaryExpression:
				if (tree.textOf(Part.operator, parent) === "typeof") return;
				break;
			case NodeType.BinaryExpression:
				if (tree.textOf(Part.operator, parent) === "instanceof") return;
				break;
		}
		if (isGlobalUndefined(node, "Object")) objectWrites = true;
	};

	/**
	 * Notes the member of the global `Object` an assignment, update, pattern
	 * or `delete` sets, every member where its key is not a constant.
	 * @param {number} member a member access
	 * @param {number} parent its parent
	 * @returns {void}
	 */
	const noteObjectWrite = (member, parent) => {
		const object = childOf(Field.object, member);
		if (
			objectWrites === true ||
			typeOf(object) !== NodeType.Identifier ||
			tree.name(object) !== "Object"
		) {
			return;
		}
		switch (typeOf(parent)) {
			case NodeType.UpdateExpression:
			case NodeType.ArrayPattern:
			case NodeType.RestElement:
				break;
			case NodeType.AssignmentExpression:
			case NodeType.AssignmentPattern:
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
				if (childOf(Field.left, parent) !== member) return;
				break;
			// A value of an object literal, read only, is taken as written too.
			case NodeType.Property:
				if (childOf(Field.value, parent) !== member) return;
				break;
			case NodeType.UnaryExpression:
				if (tree.textOf(Part.operator, parent) !== "delete") return;
				break;
			default:
				return;
		}
		if (!isGlobalUndefined(object, "Object")) return;
		const property = childOf(Field.property, member);
		const key = !tree.flag(Flag.computed, member)
			? tree.name(property)
			: typeOf(property) === NodeType.Literal
				? tree.value(property)
				: undefined;
		if (typeof key === "string") {
			objectWrites.add(key);
		} else {
			objectWrites = true;
		}
	};

	/**
	 * Notes the `let`, `const` and class names a statement of a list declares,
	 * and where it ends: a statement in the function after it reads them set.
	 * @param {number} statement a statement of a list, walked in order
	 * @returns {void}
	 */
	const noteInitialized = (statement) => {
		const type = typeOf(statement);
		if (type === NodeType.ClassDeclaration) {
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[
				tree.field(0, Field.id, statement)
			];
			if (isMinifierVariable(definition)) {
				setNames.set(definition, tree.end(statement));
			}
			return;
		}
		if (
			type !== NodeType.VariableDeclaration ||
			tree.textOf(Part.kind, statement) === "var"
		) {
			return;
		}
		const count = tree.fieldCount(Field.declarations, statement);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, statement);
			const id = tree.field(0, Field.id, declarator);
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[id];
			if (
				typeOf(id) === NodeType.Identifier &&
				isMinifierVariable(definition)
			) {
				// Set once its declarator ran, the declarators after it read it set.
				setNames.set(definition, tree.end(declarator));
			}
		}
	};

	/**
	 * @param {MinifierVariable} definition a name's definition
	 * @param {number} from where it is read
	 * @returns {boolean} whether its read cannot throw there: no dead zone, or a statement of this function ending before it set it
	 */
	const readsSet = (definition, from) => {
		if ((definition.declarations & ~READ_ANY_TIME) === 0) return true;
		const end = setNames.get(definition);
		return (
			end !== undefined &&
			end <= from &&
			functionOf(definition) === readingFunction
		);
	};

	/**
	 * @param {MinifierVariable} definition a name's definition
	 * @param {number} from where it is set
	 * @returns {boolean} whether setting it cannot throw there: as `readsSet`, or in a function expression its function makes once it set it
	 */
	const writesSet = (definition, from) => {
		if (readsSet(definition, from)) return true;
		const end = setNames.get(definition);
		if (end === undefined) return false;
		const nested = nestedIn(functionOf(definition));
		return (
			nested !== 0 &&
			typeOf(nested) !== NodeType.FunctionDeclaration &&
			tree.start(nested) >= end
		);
	};

	/**
	 * @param {number} statement a variable declaration
	 * @returns {boolean} whether it is `using` or `await using`, which disposes of its values
	 */
	const disposes = (statement) => {
		const kind = tree.textOf(Part.kind, statement);
		return kind === "using" || kind === "await using";
	};

	/**
	 * Whether the function the walk is in may run before what comes before it
	 * in the given one: it is in a function the given one declares, which is
	 * made, and so may be called, before anything there runs.
	 * @param {number} owner a function, static block or the program the walk is in
	 * @returns {boolean} true where a function declaration holds it there
	 */
	const mayRunEarly = (owner) => {
		let i = functionStack.length - 1;
		while (i > 0 && functionStack[i - 1] !== owner) i--;
		return i === 0 || typeOf(functionStack[i]) === NodeType.FunctionDeclaration;
	};

	/**
	 * @param {number} owner a function, static block or the program the walk is in
	 * @returns {number} the function the walk is in that it holds directly, 0 for none
	 */
	const nestedIn = (owner) => {
		let i = functionStack.length - 1;
		while (i > 0 && functionStack[i - 1] !== owner) i--;
		return i === 0 ? 0 : functionStack[i];
	};

	/**
	 * Folds a statement setting a name into the next, terser's `collapse_vars`,
	 * where what the next evaluates first is that name: an assignment prints
	 * there in parentheses, a declarator's one read prints its value.
	 * @param {number} statement a statement of a list
	 * @param {number} next the statement after it
	 * @returns {void}
	 */
	const collapseInto = (statement, next) => {
		if (hasEdgeComments(statement) || hasEdgeComments(next)) return;
		collapsingFrom = tree.start(statement);
		const type = typeOf(statement);
		if (type === NodeType.ExpressionStatement) {
			if (tree.textOf(Part.directive, statement) !== null) return;
			const assignment = childOf(Field.expression, statement);
			if (
				typeOf(assignment) !== NodeType.AssignmentExpression ||
				tree.textOf(Part.operator, assignment) !== "="
			) {
				return;
			}
			const target = childOf(Field.left, assignment);
			const definition =
				typeOf(target) === NodeType.Identifier
					? /** @type {TreeDefinition[]} */ (mangledNames)[target]
					: null;
			// Sloppy code ignores setting a function expression's own name, so
			// the read sees the function, never the value the assignment gives.
			if (
				!isMinifierVariable(definition) ||
				definition.kind === DECLARES_LAMBDA
			) {
				return;
			}
			collapsingValue = assignment;
			const read = firstReadIn(firstRead(next), definition);
			if (read === 0) return;
			collapsed.set(read, assignment);
			dropped[statement] = 1;
			holdsCollapsed(next);
			// Its one read taking the value, the name is unread: it sets nothing.
			// The write and that read go uncounted.
			const reads = droppedReads.get(definition) || 0;
			droppedReads.set(definition, reads + 2);
			// One opening as a statement would be parenthesized twice.
			const value = childOf(Field.right, assignment);
			// Setting a `const`, a class name or a `let` in its dead zone throws;
			// a parameter `arguments` reads is set through it too; and a member or
			// name printed bare may be called as a method, as `eval`, or by `typeof`.
			if (
				(definition.kind === DECLARES_VAR ||
					definition.kind === DECLARES_LET ||
					definition.kind === DECLARES_FUNARG) &&
				writesSet(definition, tree.start(statement)) &&
				isUnusedBinding(target) &&
				!opensAmbiguously(value) &&
				typeOf(value) !== NodeType.Identifier &&
				typeOf(value) !== NodeType.MemberExpression &&
				typeOf(value) !== NodeType.ChainExpression &&
				!(
					definition.kind === DECLARES_FUNARG &&
					readsArguments(functionOf(definition))
				)
			) {
				dropsWrite[assignment] = 1;
			} else {
				droppedReads.set(definition, reads);
			}
			return;
		}
		if (type !== NodeType.VariableDeclaration || disposes(statement)) {
			return;
		}
		// Each declarator folds into the next value after it, of a declarator
		// or of `next`: one without a value evaluates nothing. Where every
		// value after it folded, it may fold into `next` past their reads.
		const count = tree.fieldCount(Field.declarations, statement);
		let holder = next;
		let evaluated = firstRead(next);
		let intoNext = true;
		for (let i = count - 1; i >= 0; i--) {
			const declarator = tree.field(i, Field.declarations, statement);
			const folded =
				collapseDeclarator(declarator, holder, evaluated) ||
				(intoNext &&
					holder !== next &&
					collapseDeclarator(declarator, next, firstRead(next)));
			const init = childOf(Field.init, declarator);
			if (init !== 0) {
				if (!folded) intoNext = false;
				holder = declarator;
				evaluated = init;
			}
		}
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is an object or array literal of constants, made new where it runs and reading nothing
	 */
	const isFreshConstant = (node) => {
		switch (typeOf(node)) {
			case NodeType.ArrayExpression: {
				const count = tree.fieldCount(Field.elements, node);
				for (let i = 0; i < count; i++) {
					const element = tree.field(i, Field.elements, node);
					if (element !== 0 && !isConstantPart(element)) return false;
				}
				return true;
			}
			case NodeType.ObjectExpression: {
				const count = tree.fieldCount(Field.properties, node);
				for (let i = 0; i < count; i++) {
					const property = tree.field(i, Field.properties, node);
					if (
						typeOf(property) !== NodeType.Property ||
						tree.textOf(Part.kind, property) !== "init" ||
						tree.flag(Flag.method, property) ||
						tree.flag(Flag.computed, property) ||
						!isConstantPart(childOf(Field.value, property))
					) {
						return false;
					}
				}
				return true;
			}
			default:
				return false;
		}
	};

	/**
	 * @param {number} node a part of a literal
	 * @returns {boolean} whether it is a constant, a function made where it runs, reading nothing, or a literal of those
	 */
	const isConstantPart = (node) =>
		evaluateConstant(node) !== undefined ||
		typeOf(node) === NodeType.FunctionExpression ||
		typeOf(node) === NodeType.ArrowFunctionExpression ||
		isFreshConstant(node);

	/**
	 * The one read of a name in an expression where it runs at most once: in no
	 * function or class there, nor read by `delete`.
	 * @param {number} node the expression
	 * @param {MinifierVariable} definition the name's definition
	 * @returns {number} the read, 0 for none
	 */
	const onceReadIn = (node, definition) => {
		const names = /** @type {TreeDefinition[]} */ (mangledNames);
		let found = 0;
		findNode(node, (inner) => {
			switch (typeOf(inner)) {
				case NodeType.Identifier:
					if (names[inner] !== definition) return undefined;
					found = hasEdgeComments(inner) ? 0 : inner;
					return true;
				case NodeType.UnaryExpression:
					return tree.textOf(Part.operator, inner) === "delete" &&
						typeOf(childOf(Field.argument, inner)) === NodeType.Identifier
						? false
						: undefined;
				default:
					return FUNCTION_TYPES[typeOf(inner)] === 1 ||
						typeOf(inner) === NodeType.ClassExpression
						? false
						: undefined;
			}
		});
		return found;
	};

	/**
	 * `collapseInto` of a declarator: its one read, evaluated first where it is,
	 * prints its value.
	 * @param {number} declarator a declarator
	 * @param {number} holder the statement or declarator after it
	 * @param {number} evaluated what the holder evaluates first, 0 for nothing
	 * @returns {boolean} whether it folds
	 */
	const collapseDeclarator = (declarator, holder, evaluated) => {
		const id = tree.field(0, Field.id, declarator);
		const init = childOf(Field.init, declarator);
		if (
			evaluated === 0 ||
			init === 0 ||
			typeOf(id) !== NodeType.Identifier ||
			hasEdgeComments(declarator)
		) {
			return false;
		}
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[id];
		if (
			!isMinifierVariable(definition) ||
			definition.referenceCount !== 1 ||
			definition.written ||
			definition.export !== 0 ||
			(definition.global && !dropsToplevel) ||
			definition.declarations !== 1 << definition.kind ||
			/** @type {MinifierScope} */ (definition.scope).isPinned()
		) {
			return false;
		}
		// The declarators before it are set by then.
		collapsingFrom = tree.start(declarator);
		collapsingValue = init;
		collapsingPure = isPureValue(init);
		let read = firstReadIn(evaluated, definition);
		collapsingPure = false;
		// A value of constants is new and reads nothing: made where it is read
		// instead, nothing before tells, where that read runs once.
		if (read === 0 && isFreshConstant(init)) {
			read = onceReadIn(evaluated, definition);
		}
		if (read === 0) return false;
		collapsed.set(read, init);
		aliasesRead[declarator] = 3;
		droppedReads.set(definition, 1);
		if (isPureValue(init)) return true;
		if (typeOf(holder) === NodeType.VariableDeclarator) keepsValue.add(holder);
		else holdsCollapsed(holder);
		return true;
	};

	/**
	 * Marks the declarator whose value a statement's first read sits in, as
	 * `firstRead` finds it: going, it keeps what runs, which prints there.
	 * @param {number} next the statement the read is in
	 * @returns {void}
	 */
	const holdsCollapsed = (next) => {
		if (typeOf(next) !== NodeType.VariableDeclaration) return;
		keepsValue.add(tree.field(0, Field.declarations, next));
	};

	/**
	 * @param {number} callee what a call or `new` reads first
	 * @param {MinifierVariable} definition the name being folded in
	 * @returns {boolean} whether it reads the same after the folded value runs: a name nothing writes, set before, or, for a local, a global the value does not assign where no `with` or `eval` answers it
	 */
	const readsSame = (callee, definition) => {
		if (typeOf(callee) !== NodeType.Identifier) return false;
		const called = /** @type {TreeDefinition[]} */ (mangledNames)[callee];
		if (called === definition || !isMinifierVariable(called)) return false;
		// A read of a global may throw, before a global it sets could be set.
		if (called.undeclared) {
			return (
				!definition.undeclared &&
				!definition.global &&
				!(/** @type {MinifierScope} */ (definition.scope).isPinned()) &&
				!findNode(collapsingValue, (node) => assignsName(node, called.name))
			);
		}
		// A `let`, `const` or class may throw before the value runs.
		return !called.written && readsSet(called, collapsingFrom);
	};

	/**
	 * @param {number} node a node walked
	 * @param {string} name a name
	 * @returns {boolean | undefined} true for an assignment or update of the name
	 */
	const assignsName = (node, name) => {
		const type = typeOf(node);
		const target =
			type === NodeType.AssignmentExpression
				? childOf(Field.left, node)
				: type === NodeType.UpdateExpression
					? childOf(Field.argument, node)
					: 0;
		return target !== 0 &&
			typeOf(target) === NodeType.Identifier &&
			tree.name(target) === name
			? true
			: undefined;
	};

	/**
	 * @param {number} node an expression evaluated before what `firstReadIn` goes on to
	 * @param {MinifierVariable} definition the name being folded in
	 * @returns {boolean} whether it runs nothing and reads the same after the folded value runs: a literal, `this`, or a name nothing writes, set before
	 */
	const isStable = (node, definition) => {
		switch (typeOf(node)) {
			case NodeType.Literal:
			case NodeType.ThisExpression:
				return true;
			case NodeType.Identifier: {
				const read = /** @type {TreeDefinition[]} */ (mangledNames)[node];
				// A read folded already prints the value set, which runs there.
				return (
					(collapsed.size === 0 || !collapsed.has(node)) &&
					read !== definition &&
					isMinifierVariable(read) &&
					!read.undeclared &&
					!read.written &&
					readsSet(read, collapsingFrom)
				);
			}
			default:
				return false;
		}
	};

	/**
	 * @param {number} node what an assignment sets, not a name
	 * @param {MinifierVariable} definition the name being folded in
	 * @returns {boolean} whether it is a member whose object and key are stable
	 */
	const isStableTarget = (node, definition) =>
		typeOf(node) === NodeType.MemberExpression &&
		isStable(childOf(Field.object, node), definition) &&
		(!tree.flag(Flag.computed, node) ||
			isStable(childOf(Field.property, node), definition));

	/**
	 * @param {number} node an expression
	 * @param {MinifierVariable} definition a name's definition
	 * @returns {boolean} whether a name in it reads that definition
	 */
	const readsDefinition = (node, definition) =>
		findNode(node, (child) =>
			/** @type {TreeDefinition[]} */ (mangledNames)[child] === definition
				? true
				: undefined
		);

	/**
	 * @param {number} field the list's field
	 * @param {number} node what holds the list
	 * @param {MinifierVariable} definition the name being folded in
	 * @returns {number} its first item that is not stable, 0 where a spread comes first or none is
	 */
	const firstUnstable = (field, node, definition) => {
		const count = tree.fieldCount(field, node);
		for (let i = 0; i < count; i++) {
			const item = itemOf(i, field, node);
			// A hole evaluates nothing.
			if (item === 0 || isStable(item, definition)) continue;
			// What runs nothing runs before or after a value running nothing alike.
			if (
				collapsingPure &&
				typeOf(item) !== NodeType.SpreadElement &&
				isPureValue(item) &&
				!readsDefinition(item, definition)
			) {
				continue;
			}
			return typeOf(item) === NodeType.SpreadElement ? 0 : item;
		}
		return 0;
	};

	/**
	 * @param {number} node an object literal
	 * @param {MinifierVariable} definition the name being folded in
	 * @returns {number} the first property value that is not stable, 0 where a computed key, spread, method or shorthand comes first, or none is
	 */
	const firstUnstableValue = (node, definition) => {
		const count = tree.fieldCount(Field.properties, node);
		for (let i = 0; i < count; i++) {
			const property = itemOf(i, Field.properties, node);
			if (
				typeOf(property) !== NodeType.Property ||
				tree.flag(Flag.computed, property) ||
				tree.textOf(Part.kind, property) !== "init"
			) {
				return 0;
			}
			const value = childOf(Field.value, property);
			if (isStable(value, definition)) continue;
			// A shorthand's value prints as its key.
			return tree.flag(Flag.shorthand, property) ? 0 : value;
		}
		return 0;
	};

	/**
	 * @param {number} statement a statement evaluated once
	 * @returns {number} the expression it evaluates first, where `firstReadIn` looks, 0 for none
	 */
	const firstRead = (statement) => {
		switch (typeOf(statement)) {
			case NodeType.ExpressionStatement:
				// What follows a statement is no directive.
				return childOf(Field.expression, statement);
			case NodeType.IfStatement:
				return childOf(Field.test, statement);
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
				return childOf(Field.argument, statement);
			case NodeType.SwitchStatement:
				return childOf(Field.discriminant, statement);
			case NodeType.VariableDeclaration:
				if (disposes(statement)) return 0;
				return childOf(
					Field.init,
					tree.field(0, Field.declarations, statement)
				);
			default:
				return 0;
		}
	};

	/**
	 * The read of a name an expression evaluates before anything that may run
	 * code: down the left of what it evaluates first, past a call's callee.
	 * @param {number} node the expression, 0 for none
	 * @param {MinifierVariable} definition the name's definition
	 * @returns {number} the read, 0 for none
	 */
	const firstReadIn = (node, definition) => {
		const names = /** @type {TreeDefinition[]} */ (mangledNames);
		while (node !== 0) {
			switch (typeOf(node)) {
				case NodeType.Identifier:
					return names[node] === definition && !hasEdgeComments(node)
						? node
						: 0;
				case NodeType.BinaryExpression: {
					// Both sides are evaluated before either converts.
					const left = childOf(Field.left, node);
					node = isStable(left, definition) ? childOf(Field.right, node) : left;
					break;
				}
				case NodeType.LogicalExpression:
					node = childOf(Field.left, node);
					break;
				case NodeType.AssignmentExpression: {
					// A compound assignment reads its target before its value, and
					// a member's object and key are evaluated before it.
					const left = childOf(Field.left, node);
					if (
						tree.textOf(Part.operator, node) !== "=" ||
						(typeOf(left) === NodeType.Identifier
							? names[left] === definition
							: !isStableTarget(left, definition))
					) {
						return 0;
					}
					node = childOf(Field.right, node);
					break;
				}
				case NodeType.ConditionalExpression:
					node = childOf(Field.test, node);
					break;
				case NodeType.CallExpression: {
					const callee = childOf(Field.callee, node);
					if (
						tree.flag(Flag.optional, node) ||
						!readsSame(callee, definition)
					) {
						node = callee;
						break;
					}
					node = firstUnstable(Field.arguments, node, definition);
					break;
				}
				case NodeType.MemberExpression: {
					const object = childOf(Field.object, node);
					node =
						tree.flag(Flag.computed, node) &&
						!tree.flag(Flag.optional, node) &&
						isStable(object, definition)
							? childOf(Field.property, node)
							: object;
					break;
				}
				case NodeType.UnaryExpression:
					if (tree.textOf(Part.operator, node) === "delete") return 0;
					node = childOf(Field.argument, node);
					break;
				case NodeType.AwaitExpression:
				case NodeType.YieldExpression:
					// Each evaluates its value before it suspends.
					node = childOf(Field.argument, node);
					break;
				case NodeType.ImportExpression:
					node = childOf(Field.source, node);
					break;
				case NodeType.SequenceExpression:
					node = firstUnstable(Field.expressions, node, definition);
					break;
				case NodeType.TemplateLiteral:
					// Each part converts before the next is evaluated.
					node = itemOf(0, Field.expressions, node);
					break;
				case NodeType.ArrayExpression:
					node = firstUnstable(Field.elements, node, definition);
					break;
				case NodeType.ObjectExpression:
					node = firstUnstableValue(node, definition);
					break;
				case NodeType.NewExpression:
					if (!readsSame(childOf(Field.callee, node), definition)) return 0;
					node = firstUnstable(Field.arguments, node, definition);
					break;
				default:
					return 0;
			}
		}
		return 0;
	};

	/**
	 * @param {number} statement a statement of a list
	 * @returns {boolean} whether it always leaves the list: a `return`, `throw`, `break` or `continue`, or an `if` or block every way through which does
	 */
	const exitsAlways = (statement) => {
		switch (typeOf(statement)) {
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
			case NodeType.BreakStatement:
			case NodeType.ContinueStatement:
				return true;
			case NodeType.BlockStatement: {
				const count = tree.fieldCount(Field.body, statement);
				for (let i = 0; i < count; i++) {
					if (exitsAlways(tree.field(i, Field.body, statement))) return true;
				}
				return false;
			}
			case NodeType.IfStatement: {
				const consequent = tree.field(0, Field.consequent, statement);
				const alternate = tree.field(0, Field.alternate, statement);
				const test = childOf(Field.test, statement);
				const value = evaluateConstant(test);
				if (value !== undefined && isPureTest(test)) {
					const kept = value ? consequent : alternate;
					return kept !== 0 && exitsAlways(kept);
				}
				return (
					alternate !== 0 && exitsAlways(consequent) && exitsAlways(alternate)
				);
			}
			default:
				return false;
		}
	};

	/**
	 * @param {number} statement a statement after one that always leaves its list
	 * @returns {boolean} whether it goes: it declares nothing a scope sees, holding no comment
	 */
	const neverReached = (statement) => {
		const type = typeOf(statement);
		return (
			type !== NodeType.VariableDeclaration &&
			type !== NodeType.ClassDeclaration &&
			type !== NodeType.FunctionDeclaration &&
			!holdsComments(statement) &&
			!findNode(statement, findHoisted)
		);
	};

	/**
	 * terser's `dead_code` of an `if`: no `else`, a test known false that runs
	 * nothing, and nothing its body declares seen outside it.
	 * @param {number} statement an `if` of a body
	 * @returns {boolean} whether it goes
	 */
	const neverRuns = (statement) => {
		if (
			!dropsDeadCode ||
			tree.field(0, Field.alternate, statement) !== 0 ||
			holdsComments(statement)
		) {
			return false;
		}
		const test = childOf(Field.test, statement);
		const value = evaluateConstant(test);
		return (
			value !== undefined &&
			!value &&
			isPureTest(test) &&
			!findNode(tree.field(0, Field.consequent, statement), findHoisted)
		);
	};

	/**
	 * terser's `dead_code` of an `if` whose test is known: the branch it picks
	 * prints as the statement, the other goes where it declares nothing.
	 * @param {number} statement the `if`
	 * @returns {void}
	 */
	const noteKeptBranch = (statement) => {
		if (!dropsDeadCode || hasEdgeComments(statement)) return;
		const test = childOf(Field.test, statement);
		const value = evaluateConstant(test);
		if (value === undefined || !isPureTest(test)) return;
		const consequent = tree.field(0, Field.consequent, statement);
		const alternate = tree.field(0, Field.alternate, statement);
		const gone = value ? alternate : consequent;
		if (gone !== 0 && (holdsComments(gone) || findNode(gone, findHoisted))) {
			return;
		}
		const kept = value ? consequent : alternate;
		// Sloppy code declares a function an `if` holds only once that runs.
		if (typeOf(kept) === NodeType.FunctionDeclaration) return;
		keptBranches.set(statement, kept);
		if (gone !== 0) findNode(gone, discountRead);
		findNode(test, discountRead);
	};

	/**
	 * Whether a test whose value is known runs nothing else: what a `&&`,
	 * `||` or `??` it is skips by its known side never runs.
	 * @param {number} node the test
	 * @returns {boolean} true where dropping it changes nothing
	 */
	const isPureTest = (node) => {
		const type = typeOf(node);
		if (type === NodeType.ParenthesizedExpression) {
			return isPureTest(childOf(Field.expression, node));
		}
		if (type === NodeType.LogicalExpression) {
			const left = childOf(Field.left, node);
			const value = evaluateConstant(left);
			const operator = tree.textOf(Part.operator, node);
			if (
				value !== undefined &&
				(operator === "&&"
					? !value
					: operator === "||"
						? value
						: value !== null)
			) {
				return isPureTest(left);
			}
		}
		return isPureValue(node);
	};

	/**
	 * @param {number} node a logical or conditional expression
	 * @returns {boolean} whether it prints as one of its operands that no place parenthesizes: a literal other than a number, a template or an array
	 */
	const foldsToBareValue = (node) => {
		if (!dropsDeadCode) return false;
		const kept =
			typeOf(node) === NodeType.LogicalExpression
				? foldedOperand(node)
				: foldedBranch(node);
		const type = typeOf(kept);
		return (
			(type === NodeType.Literal && typeof tree.value(kept) !== "number") ||
			type === NodeType.TemplateLiteral ||
			type === NodeType.ArrayExpression
		);
	};

	/**
	 * terser's `dead_code` of a conditional: a test known that runs nothing
	 * leaves the branch it picks, which prints where the conditional was.
	 * @param {number} node a conditional
	 * @returns {number} the branch it prints as, 0 where it stays
	 */
	const foldedBranch = (node) => {
		const test = childOf(Field.test, node);
		foldsAtPrint = true;
		const value = evaluateConstant(test);
		const pure = value !== undefined && isPureTest(test);
		foldsAtPrint = false;
		if (!pure) return 0;
		const consequent = childOf(Field.consequent, node);
		const alternate = childOf(Field.alternate, node);
		const [kept, gone] = value
			? [consequent, alternate]
			: [alternate, consequent];
		// A function, class or object first in a statement would read as one.
		if (holdsComments(gone) || opensAmbiguously(kept)) return 0;
		return readsReference(kept, node) ? 0 : kept;
	};

	/**
	 * terser's `dead_code` of `&&`, `||` and `??`: a left side known that runs
	 * nothing leaves the side the operator picks.
	 * @param {number} node a logical expression
	 * @returns {number} the side it prints as, 0 where it stays
	 */
	const foldedOperand = (node) => {
		const left = childOf(Field.left, node);
		foldsAtPrint = true;
		const value = evaluateConstant(left);
		const pure = value !== undefined && isPureTest(left);
		foldsAtPrint = false;
		if (!pure) return 0;
		const right = childOf(Field.right, node);
		const operator = tree.textOf(Part.operator, node);
		const picksLeft =
			operator === "&&" ? !value : operator === "||" ? value : value !== null;
		const [kept, gone] = picksLeft ? [left, right] : [right, left];
		if (holdsComments(gone) || opensAmbiguously(kept)) return 0;
		return readsReference(kept, node) ? 0 : kept;
	};

	/**
	 * Prints what a conditional or logical expression folds to, its other
	 * parts printing nothing.
	 * @param {number} node the expression
	 * @param {number} kept the part it prints as, 0 for none
	 * @returns {boolean} whether it printed folded
	 */
	const printsFolded = (node, kept) => {
		if (kept === 0) return false;
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const fields = CHILD_FIELDS[tree.type(node)];
		for (let f = 0; f < fields.length; f++) {
			const child = tree.field(0, fields[f], node);
			if (child !== kept) context.consume(child);
		}
		printNode(kept);
		return true;
	};

	/**
	 * terser's `maintain_this_binding`: a name or member read in place of an
	 * expression would be what `delete` deletes, `typeof` probes or a call
	 * binds `this` to.
	 * @param {number} kept what prints in place of the node
	 * @param {number} node the node, being printed
	 * @returns {boolean} true where its parent would read it so
	 */
	const readsReference = (kept, node) => {
		const keptType = typeOf(kept);
		if (
			keptType !== NodeType.Identifier &&
			keptType !== NodeType.MemberExpression &&
			keptType !== NodeType.ChainExpression
		) {
			return false;
		}
		const parent = parentAt(0);
		switch (typeOf(parent)) {
			case NodeType.UnaryExpression: {
				const operator = tree.textOf(Part.operator, parent);
				return operator === "delete" || operator === "typeof";
			}
			case NodeType.CallExpression:
				return childOf(Field.callee, parent) === node;
			case NodeType.TaggedTemplateExpression:
				return childOf(Field.tag, parent) === node;
			default:
				return false;
		}
	};

	/**
	 * terser's `side_effects` of a statement: an expression that runs nothing.
	 * @param {number} statement an expression statement of a body
	 * @returns {boolean} whether it goes
	 */
	const runsNothing = (statement) =>
		dropsSideEffectFree &&
		dropped[statement] === 0 &&
		tree.textOf(Part.directive, statement) === null &&
		!holdsComments(statement) &&
		isPureValue(childOf(Field.expression, statement));

	/**
	 * @param {number} node a node walked
	 * @returns {boolean | undefined} true for a `var` or function declaration, which a scope outside sees, false for a function, which holds its own
	 */
	const findHoisted = (node) => {
		switch (typeOf(node)) {
			case NodeType.FunctionDeclaration:
				return true;
			case NodeType.VariableDeclaration:
				if (tree.textOf(Part.kind, node) === "var") return true;
				return undefined;
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.ClassExpression:
			case NodeType.ClassDeclaration:
				return false;
			default:
				return undefined;
		}
	};

	/**
	 * @param {number} node a node walked
	 * @returns {boolean | undefined} true for what may run a function, false for a function, which runs nothing where it is
	 */
	const findRun = (node) => {
		switch (typeOf(node)) {
			case NodeType.CallExpression:
			case NodeType.NewExpression:
			case NodeType.TaggedTemplateExpression:
			case NodeType.ImportExpression:
			case NodeType.AwaitExpression:
			case NodeType.YieldExpression:
			case NodeType.ForOfStatement:
			case NodeType.SpreadElement:
				return true;
			case NodeType.FunctionDeclaration:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
				return false;
			default:
				return undefined;
		}
	};

	/**
	 * @param {number} node a node of what prints nothing
	 * @returns {undefined} nothing, so every node is walked
	 */
	const discountRead = (node) => {
		if (
			tree.type(node) !== NodeType.Identifier ||
			countedWrites.has(node) ||
			discounted[node] === 1
		) {
			return;
		}
		discounted[node] = 1;
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[node];
		if (definition) {
			droppedReads.set(definition, (droppedReads.get(definition) || 0) + 1);
		}
	};

	/**
	 * Forgets what the last print found of its tree, whose node numbers a
	 * print of another tree reads as its own.
	 * @param {number} size how many nodes the tree printed now has, 0 where nothing is found of it
	 * @returns {void}
	 */
	const resetFound = (size) => {
		if (dropped.length < size) {
			dropped = new Uint8Array(size);
			setFirst = new Uint8Array(size);
			aliasesRead = new Uint8Array(size);
			keepsEffect = new Uint8Array(size);
			dropsWrite = new Uint8Array(size);
			mergedExits = new Uint8Array(size);
			ifForms = new Uint8Array(size);
			discounted = new Uint8Array(size);
		} else {
			dropped.fill(0, 0, foundSize);
			setFirst.fill(0, 0, foundSize);
			aliasesRead.fill(0, 0, foundSize);
			keepsEffect.fill(0, 0, foundSize);
			dropsWrite.fill(0, 0, foundSize);
			mergedExits.fill(0, 0, foundSize);
			ifForms.fill(0, 0, foundSize);
			discounted.fill(0, 0, foundSize);
		}
		foundSize = size;
		unwrappedFunction = 0;
		writesBackticks = false;
		constantArguments.clear();
		passedConstants.clear();
		movedCallees.clear();
		unreadBodies.clear();
		unreadValues.clear();
		unreadStatements.clear();
		droppedReads.clear();
		countedWrites.clear();
		argumentsReaders.clear();
		inlined.clear();
		constantValues.clear();
		constantDeclarators.clear();
		keptForSize.clear();
		keptNames.clear();
		deadZoneReads.clear();
		readInDeadZone.clear();
		readsAsObject.clear();
		readsNested.clear();
		probedReads.clear();
		throwingThis.clear();
		awaitedReturns.clear();
		returnPairs.clear();
		returnedBy.clear();
		constantKinds.clear();
		setNames.clear();
		answersWith = false;
		objectWrites = new Set();
		probingTry = 0;
		functionStack.length = 0;
		reducing.clear();
		reducedCalls.clear();
		keptBranches.clear();
		substituted.clear();
		hoists.clear();
		callReads.clear();
		callReaders.clear();
		moveReads.clear();
	};

	/**
	 * @param {number} declaration a variable, function or class declaration
	 * @returns {boolean} whether it goes, binding no name: each declarator does, or the function moves to its read
	 */
	const bindsNothing = (declaration) => {
		if (typeOf(declaration) === NodeType.FunctionDeclaration) {
			return dropped[declaration] === 1 || defunMoved(declaration);
		}
		if (typeOf(declaration) !== NodeType.VariableDeclaration) {
			return dropped[declaration] === 1;
		}
		const count = tree.fieldCount(Field.declarations, declaration);
		for (let i = 0; i < count; i++) {
			if (dropped[tree.field(i, Field.declarations, declaration)] !== 1) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} program the program
	 * @returns {boolean} whether every string it prints as a value may print as a template, and it holds one and no directive
	 */
	const stringsTakeBackticks = (program) => {
		if (
			mayUseAsm ||
			output.option("ecma") < 2015 ||
			output.option("quote_style") !== 0 ||
			// Without semicolons a statement opening with a template would be
			// read as a tag of the line before.
			!output.option("semicolons")
		) {
			return false;
		}
		let strings = 0;
		/**
		 * @param {number} node a node
		 * @param {number} parent its parent
		 * @returns {boolean} false where a string or directive in it keeps the quotes
		 */
		const takeIn = (node, parent) => {
			const type = typeOf(node);
			if (type === NodeType.Literal) {
				const value = tree.value(node);
				if (typeof value !== "string" || !takesBacktick(node, parent)) {
					return true;
				}
				strings++;
				return spellsAsTemplate(value);
			}
			if (
				type === NodeType.ExpressionStatement &&
				tree.textOf(Part.directive, node) !== null
			) {
				return false;
			}
			const fields = CHILD_FIELDS[tree.type(node)];
			for (let f = 0; f < fields.length; f++) {
				const count = tree.fieldCount(fields[f], node);
				for (let i = 0; i < count; i++) {
					const child = tree.field(i, fields[f], node);
					if (child !== 0 && !takeIn(child, node)) return false;
				}
			}
			return true;
		};
		return takeIn(program, 0) && strings !== 0;
	};

	/**
	 * Whether a string printed as a value may be a template there: not a
	 * module's source, attribute or name, a key, a tag, after `await` or
	 * `yield`, or what `require` or `Object.defineProperty` is passed.
	 * @param {number} node a string literal
	 * @param {number} parent its parent
	 * @returns {boolean} true where it may
	 */
	const takesBacktick = (node, parent) => {
		// An attribute reads as terser's `Property`, but its value is a string.
		if (parent > 0 && tree.type(parent) === NodeType.ImportAttribute) {
			return false;
		}
		switch (typeOf(parent)) {
			case NodeType.ImportDeclaration:
			case NodeType.ExportNamedDeclaration:
			case NodeType.ExportAllDeclaration:
			case NodeType.ImportExpression:
			case NodeType.ImportSpecifier:
			case NodeType.ExportSpecifier:
			case NodeType.TaggedTemplateExpression:
			case NodeType.AwaitExpression:
			case NodeType.YieldExpression:
				return false;
			case NodeType.Property:
			case NodeType.MethodDefinition:
			case NodeType.PropertyDefinition:
				return (
					childOf(Field.key, parent) !== node ||
					tree.flag(Flag.computed, parent)
				);
			case NodeType.CallExpression:
			case NodeType.NewExpression: {
				// Node's `cjs-module-lexer` reads these in quoted strings alone.
				const callee = childOf(Field.callee, parent);
				return !(
					childOf(Field.callee, parent) !== node &&
					((typeOf(callee) === NodeType.Identifier &&
						tree.name(callee) === "require") ||
						(typeOf(callee) === NodeType.MemberExpression &&
							!tree.flag(Flag.computed, callee) &&
							typeOf(childOf(Field.object, callee)) === NodeType.Identifier &&
							tree.name(childOf(Field.object, callee)) === "Object" &&
							tree.name(childOf(Field.property, callee)) === "defineProperty"))
				);
			}
			default:
				return true;
		}
	};

	/**
	 * Prints a string a program's analysis made, as a template where its
	 * strings are.
	 * @param {string} value the string
	 * @returns {void}
	 */
	const printStringValue = (value) => {
		if (writesBackticks && spellsAsTemplate(value)) {
			const encoded = output.encode_string(
				value,
				value.includes('"') ? "'" : '"'
			);
			output.print(`\`${encoded.slice(1, -1)}\``);
		} else {
			output.print_string(value);
		}
	};

	/**
	 * @param {string} value a string
	 * @returns {boolean} whether it reads the same as a template: no backtick, `${`, NUL or both kinds of quote
	 */
	const spellsAsTemplate = (value) =>
		!value.includes("`") &&
		!value.includes("${") &&
		!value.includes("\u0000") &&
		!(value.includes('"') && value.includes("'"));

	/**
	 * @param {number} program the program
	 * @returns {number} what its one statement calls, 0 where it holds another statement
	 */
	const programCallee = (program) => {
		if (tree.fieldCount(Field.body, program) !== 1) return 0;
		const statement = tree.field(0, Field.body, program);
		if (typeOf(statement) !== NodeType.ExpressionStatement) return 0;
		const call = childOf(Field.expression, statement);
		return typeOf(call) === NodeType.CallExpression
			? childOf(Field.callee, call)
			: 0;
	};

	/**
	 * The function a program's one statement calls with nothing, where its
	 * statements may stand for the call: it declares nothing, returns nothing
	 * and reads nothing its call gives it, nor may a direct `eval`.
	 * @param {number} program the program
	 * @returns {number} the function, 0 for none
	 */
	const functionOnlyCalled = (program) => {
		if (keepsWrapper || tree.fieldCount(Field.body, program) !== 1) return 0;
		const statement = tree.field(0, Field.body, program);
		if (
			typeOf(statement) !== NodeType.ExpressionStatement ||
			hasEdgeComments(statement)
		) {
			return 0;
		}
		const call = childOf(Field.expression, statement);
		if (
			typeOf(call) !== NodeType.CallExpression ||
			tree.flag(Flag.optional, call) ||
			tree.fieldCount(Field.arguments, call) !== 0 ||
			hasEdgeComments(call)
		) {
			return 0;
		}
		const fn = childOf(Field.callee, call);
		const type = typeOf(fn);
		if (
			(type !== NodeType.FunctionExpression &&
				type !== NodeType.ArrowFunctionExpression) ||
			tree.field(0, Field.id, fn) !== 0 ||
			tree.flag(Flag.async, fn) ||
			tree.flag(Flag.generator, fn) ||
			tree.fieldCount(Field.params, fn) !== 0 ||
			hasEdgeComments(fn)
		) {
			return 0;
		}
		const body = tree.field(0, Field.body, fn);
		if (typeOf(body) !== NodeType.BlockStatement || hasEdgeComments(body)) {
			return 0;
		}
		const count = tree.fieldCount(Field.body, body);
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, body);
			switch (typeOf(item)) {
				case NodeType.ExpressionStatement:
					if (tree.textOf(Part.directive, item) !== null) return 0;
					break;
				case NodeType.VariableDeclaration:
				case NodeType.ClassDeclaration:
					if (!bindsNothing(item)) return 0;
					break;
			}
		}
		const arrow = type === NodeType.ArrowFunctionExpression;
		const binds = findNode(body, (node) => {
			switch (tree.type(node)) {
				case NodeType.FunctionExpression:
				case NodeType.ArrowFunctionExpression:
				case NodeType.ClassExpression:
				case NodeType.ClassDeclaration:
					// What a function or class holds is its own.
					return false;
				case NodeType.FunctionDeclaration:
					return !bindsNothing(node);
				case NodeType.ReturnStatement:
					return true;
				case NodeType.VariableDeclaration:
					return tree.textOf(Part.kind, node) === "var" && !bindsNothing(node)
						? true
						: undefined;
				case NodeType.Identifier:
					return tree.name(node) === "eval" ||
						(!arrow && tree.name(node) === "arguments")
						? true
						: undefined;
				case NodeType.ThisExpression:
				case NodeType.MetaProperty:
					return arrow ? undefined : true;
			}
		});
		return binds ? 0 : fn;
	};

	/**
	 * Finds what prints nothing, terser's `unused`: a declaration of a name
	 * only what prints nothing reads, found again until no more go.
	 * @param {number} program the program
	 * @returns {void}
	 */
	const findDropped = (program) => {
		resetFound(/** @type {TreeDefinition[]} */ (mangledNames).length);
		if (treeAliases !== null) {
			for (const declarator of treeAliases) aliasesRead[declarator] = 1;
		}
		readingFunction = program;
		functionStack.length = 0;
		functionStack.push(program);
		if (treeMoves !== null) {
			for (let i = 0; i < treeMoves.length; i += 2) {
				moveReads.add(treeMoves[i + 1]);
				movedCallees.set(
					treeMoves[i + 1],
					typeOf(treeMoves[i]) === NodeType.FunctionDeclaration
						? treeMoves[i]
						: childOf(Field.init, treeMoves[i])
				);
				if (typeOf(treeMoves[i]) === NodeType.FunctionDeclaration) {
					defunMoveReads.set(treeMoves[i], treeMoves[i + 1]);
				}
			}
		}
		/** @type {number[]} */
		const candidates = [];
		collectDroppable(program, 0, candidates);
		for (const statement of expressionStatements) {
			if (runsNothing(statement)) {
				dropped[statement] = 1;
				findNode(statement, discountRead);
			}
		}
		expressionStatements.length = 0;
		// A `var` read in such a function is set by then where its one read is
		// after it, in the function declaring both.
		for (let i = 0; i < laterNested.length; i += 2) {
			const definition = /** @type {MinifierVariable} */ (laterNested[i]);
			const declarator = constantDeclarators.get(definition);
			const read = /** @type {number} */ (
				defunMoveReads.get(/** @type {number} */ (laterNested[i + 1]))
			);
			if (
				declarator === undefined ||
				moveReaders.get(read) !== functionOf(definition) ||
				tree.start(read) < tree.end(declarator)
			) {
				readsNested.add(definition);
			}
		}
		laterNested.length = 0;
		defunMoveReads.clear();
		moveReaders.clear();
		for (let known = -1; known !== constantValues.size;) {
			known = constantValues.size;
			for (const call of laterCalls) noteConstantArguments(call);
		}
		laterCalls.clear();
		chooseInlined();
		// A test reading constants known once they are chosen.
		foldsAtPrint = true;
		for (let i = 0; i < laterTests.length; i += 2) {
			const statement = laterTests[i];
			if (neverRuns(statement)) {
				dropped[statement] = 1;
				findNode(statement, discountRead);
				continue;
			}
			noteKeptBranch(statement);
			if (!keptBranches.has(statement) || !exitsAlways(statement)) continue;
			// What follows a branch always leaving the list never runs.
			const list = laterTests[i + 1];
			const count = tree.fieldCount(Field.body, list);
			let j = 0;
			while (tree.field(j, Field.body, list) !== statement) j++;
			for (j++; j < count; j++) {
				const next = tree.field(j, Field.body, list);
				if (dropped[next] !== 1 && neverReached(next)) {
					dropped[next] = 1;
					findNode(next, discountRead);
				}
			}
		}
		foldsAtPrint = false;
		laterTests.length = 0;
		// A function moved to its read prints there, reads and all.
		const moves = treeMoves === null ? [] : treeMoves;
		for (let i = 0; i < moves.length; i += 2) {
			const moved = moves[i];
			// A comment on the function would not print at the read: it stays.
			if (
				typeOf(moved) === NodeType.VariableDeclarator &&
				hasEdgeComments(childOf(Field.init, moved))
			) {
				dropped[moved] = 2;
			} else {
				aliasesRead[moved] = 2;
			}
		}
		for (let changed = true; changed;) {
			changed = false;
			for (let i = 0; i < candidates.length; i++) {
				const candidate = candidates[i];
				if (dropped[candidate] !== 0 || !dropsNow(candidate)) continue;
				dropped[candidate] = 1;
				changed = true;
				if (aliasesRead[candidate] < 2 && keepsEffect[candidate] !== 1) {
					findNode(candidate, discountRead);
				} else if (keepsEffect[candidate] === 1) {
					// A value kept only for what it runs reads nothing kept.
					const init = childOf(Field.init, candidate);
					if (collapsed.size !== 0 && collapsed.has(init)) discountRead(init);
				}
			}
			for (let i = 0; i < writeStatements.length; i += 2) {
				const assignment = writeStatements[i + 1];
				if (
					dropsWrite[assignment] !== 0 ||
					!isUnusedBinding(childOf(Field.left, assignment))
				) {
					continue;
				}
				dropsWrite[assignment] = 1;
				changed = true;
				const value = childOf(Field.right, assignment);
				if (isPureValue(value)) {
					dropped[writeStatements[i]] = 1;
					findNode(value, discountRead);
				}
			}
		}
		writeStatements.length = 0;
		for (let i = 0; i < exitPairs.length; i += 2) {
			const statement = exitPairs[i];
			const next = exitPairs[i + 1];
			if (dropped[statement] !== 1 && dropped[next] !== 1) {
				mergedExits[statement] |= 1;
				mergedExits[next] |= 2;
			}
		}
		exitPairs.length = 0;
		// A constant whose declaration stays prints its name where it is read,
		// and a function moved to its read stays where it is.
		for (const [definition, declarator] of inlined) {
			if (dropped[declarator] !== 1) inlined.delete(definition);
		}
		for (let i = 0; i < moves.length; i += 2) {
			if (dropped[moves[i]] !== 1) continue;
			const fn =
				typeOf(moves[i]) === NodeType.FunctionDeclaration
					? moves[i]
					: childOf(Field.init, moves[i]);
			if (fn === moves[i]) {
				if (tree.start(moves[i + 1]) < tree.start(fn)) {
					// The walk is past the first node printed, too late to print it first.
					if (moves[i + 1] === firstPrinted) {
						dropped[fn] = 0;
						continue;
					}
					earlyDefuns.set(moves[i + 1], fn);
				}
				defunReads.set(moves[i + 1], moves[i]);
				movedDefuns.add(moves[i]);
			} else {
				movedReads.set(fn, moves[i + 1]);
			}
			const call = callReads.get(moves[i + 1]);
			if (call === undefined) continue;
			// What its arguments read is set where the call is read, not here.
			const outerFunction = readingFunction;
			readingFunction = /** @type {number} */ (callReaders.get(call));
			const value = reducedValue(fn, call);
			readingFunction = outerFunction;
			if (value !== 0) noteReduced(fn, call, value);
		}
		// A function printed ahead of its place prints what it reads moved
		// there too, so each must be printed by then; else it stays in place.
		for (const [read, defun] of earlyDefuns) {
			for (let i = 0; i < moves.length; i += 2) {
				const inner = moves[i + 1];
				if (
					dropped[moves[i]] === 1 &&
					tree.start(inner) > tree.start(defun) &&
					tree.end(inner) <= tree.end(defun) &&
					tree.end(moves[i]) > tree.start(read) &&
					!earlyDefuns.has(inner)
				) {
					dropped[defun] = 0;
					defunReads.delete(read);
					movedDefuns.delete(defun);
					earlyDefuns.delete(read);
					break;
				}
			}
		}
		// A parameter prints as the name passed, so a call prints as its value
		// only where each name passed prints as itself, not what it is read as.
		for (const [call, fn] of reducedCalls) {
			const count = tree.fieldCount(Field.arguments, call);
			for (let i = 0; i < count; i++) {
				const argument = itemOf(i, Field.arguments, call);
				if (
					moveReads.has(argument) ||
					collapsed.has(argument) ||
					isInlinedRead(argument)
				) {
					reducing.delete(fn);
					reducedCalls.delete(call);
					const params = tree.fieldCount(Field.params, fn);
					for (let j = 0; j < params; j++) {
						substituted.delete(
							/** @type {TreeDefinition[]} */ (mangledNames)[
								tree.field(j, Field.params, fn)
							]
						);
					}
					break;
				}
			}
		}
		// Declared once and never set, a definition whose declaration prints
		// nothing prints no name at all: its reads are dropped or print values.
		unprinted.clear();
		for (let i = 0; i < candidates.length; i++) {
			const candidate = candidates[i];
			if (dropped[candidate] !== 1 && aliasesRead[candidate] !== 3) continue;
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[
				tree.field(0, Field.id, candidate)
			];
			if (
				isMinifierVariable(definition) &&
				!definition.written &&
				definition.export === 0
			) {
				unprinted.add(definition);
			}
		}
		for (let i = 0; i < namedExpressions.length; i++) {
			const node = namedExpressions[i];
			const id = tree.field(0, Field.id, node);
			if (
				dropsName(
					id,
					typeOf(node) === NodeType.FunctionExpression
						? keepsFunctionNames
						: keepsClassNames
				)
			) {
				unprinted.add(
					/** @type {MinifierVariable} */ (
						/** @type {TreeDefinition[]} */ (mangledNames)[id]
					)
				);
			}
		}
		namedExpressions.length = 0;
		// What goes is known: a declaration printing nothing binds nothing.
		unwrappedFunction = functionOnlyCalled(program);
		writesBackticks = stringsTakeBackticks(program);
		// A function the program only calls prints its statements as they are,
		// or, as a `wrap` or `enclose` wrapper, stays.
		const only = keepsWrapper ? programCallee(program) : unwrappedFunction;
		if (only !== 0 && unreadBodies.delete(only)) {
			const body = tree.field(0, Field.body, only);
			const count = tree.fieldCount(Field.body, body);
			for (let i = 0; i < count; i++) {
				unreadStatements.delete(tree.field(i, Field.body, body));
			}
		}
	};

	/**
	 * @param {number | undefined} node a statement
	 * @returns {boolean} whether it is a block more than one statement of which prints
	 */
	const printsSeveral = (node) => {
		if (node === undefined || typeOf(node) !== NodeType.BlockStatement) {
			return false;
		}
		let printed = 0;
		const count = tree.fieldCount(Field.body, node);
		for (let i = 0; i < count && printed < 2; i++) {
			if (!printsNothing(tree.field(i, Field.body, node))) printed++;
		}
		return printed > 1;
	};

	/**
	 * The one statement of a block that is a statement's body, which it prints
	 * as: the one printing, declaring nothing, leaving no `else` to an `if`.
	 * @param {number} block the block
	 * @param {number} parent the statement it is the body of, if it is one
	 * @returns {number} the statement, 0 where the braces stay
	 */
	const unwrappedStatement = (block, parent) => {
		if (
			HOLDS_BODY[typeOf(parent)] !== 1 ||
			// A comment on a brace would have nothing to sit by.
			(commentTokens !== null &&
				(hasComments(commentTokens.starts[block], 3) ||
					hasComments(commentTokens.ends[block], 3)))
		) {
			return 0;
		}
		let statement = 0;
		let empty = 0;
		const count = tree.fieldCount(Field.body, block);
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, block);
			if (printsNothing(item)) {
				// `;` is shorter than the `{}` of a block printing nothing.
				if (empty === 0 && typeOf(item) === NodeType.EmptyStatement) {
					empty = item;
				}
				continue;
			}
			if (statement !== 0) return 0;
			statement = item;
		}
		if (statement === 0) return empty;
		const type = typeOf(statement);
		// An `if` whose `else` prints after it is two statements, as is the
		// block a known test keeps, which prints in the list holding the `if`.
		if (
			type === NodeType.IfStatement &&
			(liftsElse(statement, block, -1) ||
				(keptBranches.size !== 0 &&
					printsSeveral(/** @type {number} */ (keptBranches.get(statement)))))
		) {
			return 0;
		}
		if (
			type === NodeType.VariableDeclaration
				? tree.textOf(Part.kind, statement) !== "var" || printsApart(statement)
				: type === NodeType.FunctionDeclaration ||
					type === NodeType.ClassDeclaration
		) {
			return 0;
		}
		return typeOf(parent) === NodeType.IfStatement &&
			tree.field(0, Field.consequent, parent) === block &&
			tree.field(0, Field.alternate, parent) !== 0 &&
			endsInOpenIf(statement)
			? 0
			: statement;
	};

	/**
	 * @param {number} statement a statement
	 * @returns {boolean} whether an `else` printed after it would bind to an `if` inside it
	 */
	const endsInOpenIf = (statement) => {
		for (let node = statement, parent = 0; ;) {
			const type = typeOf(node);
			if (type === NodeType.IfStatement) {
				const alternate = tree.field(0, Field.alternate, node);
				if (ifForm(node) !== 0) return false;
				if (alternate === 0) return true;
				parent = node;
				node = alternate;
			} else if (HOLDS_BODY[type] === 1) {
				parent = node;
				node = tree.field(0, Field.body, node);
			} else if (type === NodeType.BlockStatement && parent !== 0) {
				// A block printing as its one statement ends where that does.
				const inner = compresses ? unwrappedStatement(node, parent) : 0;
				if (inner === 0) return false;
				parent = node;
				node = inner;
			} else {
				return false;
			}
		}
	};

	// The forms `ifForm` finds, terser's `conditionals` and `if_return`:
	// `t?a:b` for `if(t)a;else b` and `return t?x:y` for `if(t)return x;return y`.
	// `t&&e` for an `if` without `else` measured larger once gzipped.
	const CONDITIONAL_FORM = 1;
	const RETURN_FORM = 2;

	/**
	 * @param {number} node an `if`
	 * @returns {number} its form, as `ifForm` answers it
	 */
	const findIfForm = (node) => {
		if (!printsConditionals || dropped[node] === 1 || hasEdgeComments(node)) {
			return 0;
		}
		const consequent = tree.field(0, Field.consequent, node);
		const alternate = tree.field(0, Field.alternate, node);
		if (alternate !== 0) {
			if (
				printsAsExpression(consequent, node) &&
				printsAsExpression(alternate, node)
			) {
				return CONDITIONAL_FORM;
			}
			// `if(t)return x;else return y` as `return t?x:y`, the `else` going on.
			const branch = unwrappedBranch(alternate, node);
			if (
				branch === 0 ||
				hasEdgeComments(branch) ||
				!returnsBranch(consequent, node) ||
				!(
					returnsValue(branch) ||
					(typeOf(branch) === NodeType.IfStatement &&
						ifForm(branch) === RETURN_FORM)
				)
			) {
				return 0;
			}
			returnedBy.set(branch, node);
			return RETURN_FORM;
		}
		const next = returnPairs.get(node);
		return next !== undefined &&
			(returnsValue(next) ||
				(typeOf(next) === NodeType.IfStatement &&
					ifForm(next) === RETURN_FORM)) &&
			!hasEdgeComments(next) &&
			returnsBranch(consequent, node)
			? RETURN_FORM
			: 0;
	};

	/**
	 * How an `if` prints as an expression, found once `findDropped` has
	 * found what prints.
	 * @param {number} node the `if`
	 * @returns {number} `CONDITIONAL_FORM` or `RETURN_FORM` where it prints as one, else 0
	 */
	const ifForm = (node) => {
		if (node >= foundSize || keptBranches.has(node)) return 0;
		let form = ifForms[node];
		if (form === 0) {
			form = findIfForm(node) + 1;
			ifForms[node] = form;
		}
		return form - 1;
	};

	/**
	 * @param {number} branch the body of an `if`
	 * @param {number} node the `if`
	 * @returns {boolean} whether it prints as a value returned: a `return` of one, alone or in a block, or a block printing as a chain of them
	 */
	const returnsBranch = (branch, node) =>
		returnsValue(unwrappedBranch(branch, node)) ||
		(typeOf(branch) === NodeType.BlockStatement && returnsChain(branch));

	/**
	 * @param {number} statement a statement, 0 for none
	 * @returns {boolean} whether it is a `return` of a value
	 */
	const returnsValue = (statement) => {
		if (typeOf(statement) !== NodeType.ReturnStatement) return false;
		const argument = childOf(Field.argument, statement);
		return argument !== 0 && !returnsNothing(argument);
	};

	/**
	 * @param {number} statement the body or `else` of an `if`
	 * @param {number} parent the `if`
	 * @returns {number} the statement it prints as: itself, or the one statement a block unwraps to, 0 for none
	 */
	const unwrappedBranch = (statement, parent) =>
		typeOf(statement) === NodeType.BlockStatement
			? unwrappedStatement(statement, parent)
			: statement;

	/**
	 * @param {number} statement the body or `else` of an `if`
	 * @param {number} parent the `if`
	 * @returns {boolean} whether it prints as an expression: a kept expression statement or an `if` printing as `?:`, alone or in a block
	 */
	const printsAsExpression = (statement, parent) => {
		const branch = unwrappedBranch(statement, parent);
		if (branch === 0 || hasEdgeComments(branch)) return false;
		switch (typeOf(branch)) {
			case NodeType.ExpressionStatement:
				return dropped[branch] !== 1;
			case NodeType.IfStatement:
				return ifForm(branch) === CONDITIONAL_FORM;
			default:
				return false;
		}
	};

	/**
	 * @returns {number} the form of the `if` the statement being printed is a branch of, alone or in a block, 0 where it prints as a statement
	 */
	const branchForm = () => {
		const parent = parentAt(0);
		const holder =
			typeOf(parent) === NodeType.BlockStatement ? parentAt(1) : parent;
		return typeOf(holder) === NodeType.IfStatement ? ifForm(holder) : 0;
	};

	/**
	 * @param {number} node the test of a `?:`
	 * @returns {boolean} whether it binds looser than a test and is parenthesized
	 */
	const bindsLooser = (node) => {
		switch (typeOf(node)) {
			case NodeType.SequenceExpression:
			case NodeType.AssignmentExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.YieldExpression:
			case NodeType.ConditionalExpression:
				return true;
			default:
				return false;
		}
	};

	/**
	 * terser's `c ? a = x : a = y` as `a = c ? x : y`: the one assignment every
	 * branch of an `if` printing as `?:`, or of a conditional, ends in.
	 * @param {number} node the `if` or conditional
	 * @returns {[string, MinifierVariable] | null} its operator and the name it sets, null where branches differ or a test may change the name
	 */
	const hoistOf = (node) => {
		let found = hoists.get(node);
		if (found !== undefined) return found;
		found = null;
		const isIf = typeOf(node) === NodeType.IfStatement;
		const test = childOf(Field.test, node);
		if (
			isIf
				? ifForm(node) === CONDITIONAL_FORM
				: // A conditional `dead_code` folds prints one branch, its assignment whole.
					!dropsDeadCode || foldedBranch(node) === 0
		) {
			const consequent = assignedBy(
				isIf
					? unwrappedBranch(tree.field(0, Field.consequent, node), node)
					: childOf(Field.consequent, node)
			);
			const alternate = assignedBy(
				isIf
					? unwrappedBranch(tree.field(0, Field.alternate, node), node)
					: childOf(Field.alternate, node)
			);
			if (
				consequent !== null &&
				alternate !== null &&
				consequent[0] === alternate[0] &&
				consequent[1] === alternate[1] &&
				// A compound assignment reads the name after the test ran.
				(consequent[0] === "=" || isPureValue(test))
			) {
				found = consequent;
			}
		}
		hoists.set(node, found);
		return found;
	};

	/**
	 * @param {number} branch a branch: a statement, an expression, 0 for none
	 * @returns {[string, MinifierVariable] | null} the operator and the local name it ends in assigning, null for none
	 */
	const assignedBy = (branch) => {
		let node = branch;
		const type = typeOf(node);
		if (type === NodeType.ExpressionStatement) {
			node = childOf(Field.expression, node);
		} else if (
			type === NodeType.IfStatement ||
			type === NodeType.ConditionalExpression
		) {
			const kept =
				type === NodeType.ConditionalExpression && dropsDeadCode
					? foldedBranch(node)
					: 0;
			return kept === 0 ? hoistOf(node) : assignedBy(kept);
		}
		if (
			typeOf(node) !== NodeType.AssignmentExpression ||
			dropsWrite[node] === 1 ||
			hasEdgeComments(node)
		) {
			return null;
		}
		const operator = /** @type {string} */ (tree.textOf(Part.operator, node));
		const target = childOf(Field.left, node);
		if (
			operator === "||=" ||
			operator === "&&=" ||
			operator === "??=" ||
			typeOf(target) !== NodeType.Identifier
		) {
			return null;
		}
		const definition = mangledNames === null ? null : mangledNames[target];
		return isMinifierVariable(definition) && !definition.undeclared
			? [operator, definition]
			: null;
	};

	/**
	 * @param {number} level where the `if` or conditional printed is among the printed one's parents, -1 for itself
	 * @returns {number} the `if` or conditional printing as `?:` whose branch it is and which hoists the same assignment, 0 for none
	 */
	const hoistingHolder = (level) => {
		let holder = parentAt(level + 1);
		let node = parentAt(level);
		// A conditional folding to the branch prints as it.
		if (dropsDeadCode) {
			while (
				typeOf(holder) === NodeType.ConditionalExpression &&
				foldedBranch(holder) === node
			) {
				level++;
				node = holder;
				holder = parentAt(level + 1);
			}
		}
		let branch = node;
		if (typeOf(holder) === NodeType.BlockStatement) {
			branch = holder;
			holder = parentAt(level + 2);
		}
		const type = typeOf(holder);
		if (type === NodeType.IfStatement) {
			if (
				childOf(Field.test, holder) === branch ||
				ifForm(holder) !== CONDITIONAL_FORM
			) {
				return 0;
			}
		} else if (
			type !== NodeType.ConditionalExpression ||
			childOf(Field.test, holder) === node
		) {
			return 0;
		}
		return hoistOf(holder) === null ? 0 : holder;
	};

	/**
	 * Prints the name and operator a chain hoists, where the node printed
	 * opens it.
	 * @param {number} node the `if` or conditional printed
	 * @returns {void}
	 */
	const printHoistedHead = (node) => {
		const hoisted = hoistOf(node);
		if (hoisted === null || hoistingHolder(-1) !== 0) return;
		output.print_name(hoisted[1].mangled_name || hoisted[1].name);
		output.space();
		output.print(hoisted[0]);
		output.space();
	};

	/**
	 * terser's `booleans` of a `return` form: `if(t)return!0;return!1` as
	 * `return!!t`, the values opposite booleans.
	 * @param {number} node an `if` printing as `return t?x:`
	 * @returns {number} the `return` ending it, which then prints no value; 0 where it does not fold
	 */
	const foldedReturn = (node) => {
		const alternate = tree.field(0, Field.alternate, node);
		const end =
			alternate === 0
				? returnPairs.get(node)
				: unwrappedBranch(alternate, node);
		if (
			end === undefined ||
			typeOf(end) !== NodeType.ReturnStatement ||
			hasEdgeComments(end)
		) {
			return 0;
		}
		const value = booleanOf(
			childOf(
				Field.argument,
				unwrappedBranch(tree.field(0, Field.consequent, node), node)
			)
		);
		return value !== undefined &&
			booleanOf(childOf(Field.argument, end)) === !value
			? end
			: 0;
	};

	/**
	 * Prints an `if` as `t?a:b`, or as `return t?x:` the `return` after it ends.
	 * @param {number} node the `if`
	 * @param {number} form its form
	 * @returns {void}
	 */
	const printIfExpression = (node, form) => {
		const test = childOf(Field.test, node);
		const branch = form === CONDITIONAL_FORM && branchForm() !== 0;
		if (form === CONDITIONAL_FORM) printHoistedHead(node);
		if (form === RETURN_FORM) {
			// One continuing the `?:` an `if` before it, or holding it as its
			// `else`, opens prints none.
			const continues = branchForm() === RETURN_FORM;
			const previous = returnedBy.get(node);
			if (
				!continues &&
				(previous === undefined || ifForm(previous) !== RETURN_FORM) &&
				!inReturnsChain(-1)
			) {
				output.print("return");
				output.space();
			}
		}
		const folded = form === RETURN_FORM ? foldedReturn(node) : 0;
		if (folded !== 0) {
			const consequent = tree.field(0, Field.consequent, node);
			const negates = booleanOf(
				childOf(Field.argument, unwrappedBranch(consequent, node))
			)
				? "!!"
				: "!";
			skipNode(consequent);
			output.print(negates);
			printNode(test, !NEGATES_BARE[typeOf(test)]);
			const alternate = tree.field(0, Field.alternate, node);
			if (alternate !== 0) {
				skipNode(alternate);
				output.semicolon();
			}
			return;
		}
		printNode(
			test,
			bindsLooser(test) ||
				(form !== RETURN_FORM && !branch && opensAmbiguously(test))
		);
		output.space();
		output.print("?");
		output.space();
		printNode(tree.field(0, Field.consequent, node));
		output.space();
		output.colon();
		if (form === RETURN_FORM) {
			const alternate = tree.field(0, Field.alternate, node);
			if (alternate !== 0) printNode(alternate);
			return;
		}
		printNode(tree.field(0, Field.alternate, node));
		if (!branch) output.semicolon();
	};

	// What holds a list of statements, by `NodeType`; a function's body
	// statements are walked with the function as their parent.
	const LISTS_STATEMENTS = new Uint8Array(256);
	for (const type of [
		NodeType.Program,
		NodeType.BlockStatement,
		NodeType.StaticBlock,
		NodeType.SwitchCase
	]) {
		LISTS_STATEMENTS[type] = 1;
	}

	/**
	 * terser's `if_return` of an `else`: after a body that always leaves, what
	 * the `else` holds prints after the `if`, in the list the `if` is in.
	 * @param {number} node an `if` with an `else`
	 * @param {number} parent what holds it
	 * @param {number} level where the parent is among the printed one's parents, -1 where it is not one
	 * @returns {boolean} whether its `else` prints so
	 */
	const liftsElse = (node, parent, level) => {
		const parentType = typeOf(parent);
		if (
			(LISTS_STATEMENTS[parentType] !== 1 &&
				FUNCTION_TYPES[parentType] !== 1 &&
				// The `else` of an `if` whose `else` prints in a list is in it.
				!(
					level !== -1 &&
					parentType === NodeType.IfStatement &&
					tree.field(0, Field.alternate, parent) === node &&
					liftsElse(parent, parentAt(level + 1), level + 1)
				)) ||
			ifForm(node) !== 0
		) {
			return false;
		}
		const alternate = tree.field(0, Field.alternate, node);
		return (
			alternate !== 0 &&
			!hasEdgeComments(alternate) &&
			alwaysLeaves(tree.field(0, Field.consequent, node)) &&
			(typeOf(alternate) === NodeType.BlockStatement
				? !scopesLexically(alternate)
				: !declaresLexically(alternate))
		);
	};

	/**
	 * @param {number} statement a statement
	 * @returns {boolean} whether control never runs past it: a `return`, `throw`, `break` or `continue`, last of a block
	 */
	const alwaysLeaves = (statement) => {
		let last = statement;
		if (typeOf(statement) === NodeType.BlockStatement) {
			last = 0;
			for (let i = tree.fieldCount(Field.body, statement) - 1; i >= 0; i--) {
				const item = tree.field(i, Field.body, statement);
				if (!printsNothing(item)) {
					last = item;
					break;
				}
			}
		}
		switch (typeOf(last)) {
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
			case NodeType.BreakStatement:
			case NodeType.ContinueStatement:
				return true;
			default:
				return false;
		}
	};

	/**
	 * @param {number} statement a statement
	 * @returns {boolean} whether it declares a name only its block sees: `let`, `const`, `using`, a class or a function
	 */
	const declaresLexically = (statement) => {
		switch (typeOf(statement)) {
			case NodeType.VariableDeclaration:
				return tree.textOf(Part.kind, statement) !== "var";
			case NodeType.ClassDeclaration:
			case NodeType.FunctionDeclaration:
				return true;
			default:
				return false;
		}
	};

	/**
	 * @param {number} block a block
	 * @returns {boolean} whether its braces scope a name
	 */
	const scopesLexically = (block) => {
		const count = tree.fieldCount(Field.body, block);
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, block);
			// A declaration printing nothing leaves no name to scope.
			if (declaresLexically(item) && !printsNothing(item)) return true;
		}
		return false;
	};

	/**
	 * @param {number} statement a statement
	 * @returns {boolean} whether it is a `break` of no label, with no comment kept
	 */
	const isPlainBreak = (statement) =>
		typeOf(statement) === NodeType.BreakStatement &&
		tree.field(0, Field.label, statement) === 0 &&
		!hasEdgeComments(statement);

	/**
	 * terser's `dead_code` of a `switch`: a `default` last, doing nothing.
	 * @param {number} item a case
	 * @returns {boolean} whether it goes
	 */
	const doesNothing = (item) => {
		if (childOf(Field.test, item) !== 0 || hasEdgeComments(item)) return false;
		const count = tree.fieldCount(Field.consequent, item);
		return (
			count === 0 ||
			(count === 1 && isPlainBreak(tree.field(0, Field.consequent, item)))
		);
	};

	/**
	 * @param {number} item a case being printed
	 * @returns {boolean} whether it is the last its `switch` prints, where a `break` ending it does nothing
	 */
	const endsSwitch = (item) => {
		const parent = parentAt(0);
		const count = tree.fieldCount(Field.cases, parent);
		const last = tree.field(count - 1, Field.cases, parent);
		return (
			last === item ||
			(count > 1 &&
				tree.field(count - 2, Field.cases, parent) === item &&
				doesNothing(last))
		);
	};

	/**
	 * terser's `make_then`: a parse binds each `else` to the nearest `if`, so
	 * no consequent needs braces to keep it, but `ie8`'s `do … while`.
	 * @param {number} node the `if`
	 * @returns {void}
	 */
	const makeThen = (node) => {
		const consequent = tree.field(0, Field.consequent, node);
		if (
			output.option("ie8") &&
			typeOf(consequent) === NodeType.DoWhileStatement
		) {
			makeBlock(consequent);
			return;
		}
		printMaybeBracedBody(consequent);
	};

	/**
	 * Takes a child's text where it prints nothing.
	 * @param {number} child the child, printed already
	 * @returns {void}
	 */
	const skipNode = (child) => {
		if (!inlinesNames || tree.type(child) !== NodeType.Identifier) {
			/** @type {JavascriptPrintContext} */ (writer).consume(child);
		}
	};

	/**
	 * @param {number} argument what a `return` returns
	 * @returns {boolean} whether it is `undefined` from nothing happening, which a bare `return` returns too
	 */
	const returnsNothing = (argument) => {
		if (hasEdgeComments(argument) || awaitedReturns.has(argument)) return false;
		const type = typeOf(argument);
		if (type === NodeType.Identifier) return isGlobalUndefined(argument);
		return (
			type === NodeType.UnaryExpression &&
			tree.textOf(Part.operator, argument) === "void" &&
			isPureValue(childOf(Field.argument, argument))
		);
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is `undefined`: `void` of what does nothing, or the global
	 */
	const isUndefinedValue = (node) =>
		typeOf(node) === NodeType.Identifier
			? isGlobalUndefined(node)
			: typeOf(node) === NodeType.UnaryExpression &&
				tree.textOf(Part.operator, node) === "void" &&
				isPureValue(childOf(Field.argument, node));

	/**
	 * @param {number} comparison an expression
	 * @param {string} operator `===` or `!==`
	 * @returns {number} the name it compares strictly with `null` or `undefined`, 0 for none
	 */
	const nullCheckedName = (comparison, operator) => {
		if (
			typeOf(comparison) !== NodeType.BinaryExpression ||
			tree.textOf(Part.operator, comparison) !== operator ||
			hasEdgeComments(comparison)
		) {
			return 0;
		}
		const name = childOf(Field.left, comparison);
		const value = childOf(Field.right, comparison);
		return typeOf(name) === NodeType.Identifier &&
			!isInlinedRead(name) &&
			!hasEdgeComments(name) &&
			!hasEdgeComments(value) &&
			(isNull(value) || isUndefinedValue(value))
			? name
			: 0;
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is `null`
	 */
	const isNull = (node) =>
		typeOf(node) === NodeType.Literal && tree.value(node) === null;

	/**
	 * Whether a logical expression tests one name strictly against both
	 * `null` and `undefined`, which `==` against `null` tests at once.
	 * @param {number} node a logical expression
	 * @returns {number} the name, 0 where it does not
	 */
	const comparedWithNull = (node) => {
		const operator = tree.textOf(Part.operator, node);
		const strict = operator === "||" ? "===" : operator === "&&" ? "!==" : "";
		if (strict === "" || mangledNames === null) return 0;
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		const name = nullCheckedName(left, strict);
		const other = nullCheckedName(right, strict);
		return name !== 0 &&
			other !== 0 &&
			mangledNames[name] !== null &&
			mangledNames[name] === mangledNames[other] &&
			isNull(childOf(Field.right, left)) !== isNull(childOf(Field.right, right))
			? name
			: 0;
	};

	/**
	 * Whether a declarator sets `undefined` where its name holds that anyway:
	 * a `let`, which a loop declares afresh, or a `var` nothing else writes.
	 * @param {number} declarator the declarator
	 * @param {number} init its value
	 * @returns {boolean} true where the value goes
	 */
	const setsUndefinedAnew = (declarator, init) => {
		const id = tree.field(0, Field.id, declarator);
		if (
			typeOf(id) !== NodeType.Identifier ||
			hasEdgeComments(init) ||
			!isUndefinedValue(init) ||
			mangledNames === null
		) {
			return false;
		}
		const definition = mangledNames[id];
		if (!isMinifierVariable(definition)) return false;
		if (definition.kind === DECLARES_CONST) {
			// A `const` printing as `let` may go without its value too.
			const declaration = parentAt(0);
			return (
				kindOf(
					declaration,
					typeOf(parentAt(1)) === NodeType.ExportNamedDeclaration
				) === "let"
			);
		}
		return (
			definition.kind === DECLARES_LET ||
			(definition.kind === DECLARES_VAR && !definition.written)
		);
	};

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is a string literal or a `typeof`, so its value is a string
	 */
	const isStringValue = (node) => {
		const type = typeOf(node);
		return type === NodeType.Literal
			? typeof tree.value(node) === "string"
			: type === NodeType.UnaryExpression &&
					tree.textOf(Part.operator, node) === "typeof";
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is a `typeof`
	 */
	const isTypeof = (node) =>
		typeOf(node) === NodeType.UnaryExpression &&
		tree.textOf(Part.operator, node) === "typeof";

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is the string "undefined"
	 */
	const isUndefinedString = (node) =>
		typeOf(node) === NodeType.Literal && tree.value(node) === "undefined";

	/**
	 * @param {string} operator an equality
	 * @param {number} left its left operand
	 * @param {number} right its right operand
	 * @returns {number} the `typeof` one side is where the other is "undefined", else 0
	 */
	const typeofUndefined = (operator, left, right) => {
		if (
			(operator !== "==" && operator !== "!=") ||
			hasEdgeComments(left) ||
			hasEdgeComments(right)
		) {
			return 0;
		}
		if (isTypeof(left) && isUndefinedString(right)) return left;
		if (isTypeof(right) && isUndefinedString(left)) return right;
		return 0;
	};

	/**
	 * Whether a string compared with a `typeof` prints first, as terser's
	 * `lhs_constants` puts it; measured, no other constant gzips better so.
	 * @param {string} operator the operator printed
	 * @param {number} left the left operand
	 * @param {number} right the right operand
	 * @returns {boolean} true where the operands swap
	 */
	const constantGoesFirst = (operator, left, right) =>
		(operator === "==" || operator === "!=") &&
		typeOf(left) === NodeType.UnaryExpression &&
		tree.textOf(Part.operator, left) === "typeof" &&
		typeOf(right) === NodeType.Literal &&
		typeof tree.value(right) === "string" &&
		!hasEdgeComments(left) &&
		!hasEdgeComments(right);

	/**
	 * @param {string} name a property's name
	 * @returns {boolean} whether it prints in brackets, not after a `.`
	 */
	const printsComputed = (name) =>
		/** @type {boolean} */ (
			ALL_RESERVED_WORDS.has(name)
				? output.option("ie8")
				: !isIdentifierString(
						name,
						output.option("ecma") >= 2015 && !output.option("safari10")
					)
		);

	/**
	 * @param {number} node a function declaration
	 * @returns {boolean} whether its one read prints it, as a function no name of which is read
	 */
	const defunMoved = (node) => movedDefuns.size !== 0 && movedDefuns.has(node);

	/**
	 * Whether a function or class expression's own name goes: nothing reads
	 * it, nor can `eval` or `with`, terser's `unused`.
	 * @param {number} id the name
	 * @param {boolean} keeps whether `keep_fnames` or `keep_classnames` keeps it
	 * @returns {boolean} true where it goes
	 */
	const dropsName = (id, keeps) => {
		if (!compresses || keeps || mangledNames === null || hasEdgeComments(id)) {
			return false;
		}
		const definition = mangledNames[id];
		return (
			isMinifierVariable(definition) &&
			definition.referenceCount <= (droppedReads.get(definition) || 0) &&
			!(/** @type {MinifierScope} */ (definition.scope).isPinned())
		);
	};

	/**
	 * Whether nothing reads what the function a `return` printed is in
	 * returns: a function expression called where its call's value is unread.
	 * @returns {boolean} true where nothing does
	 */
	const returnsUnread = () => {
		for (let level = 0; ; level++) {
			const fn = parentAt(level);
			if (fn === 0) return false;
			const type = typeOf(fn);
			// A method's function prints as the member, which no call reads.
			if (
				type === NodeType.MethodDefinition ||
				type === NodeType.Property ||
				type === NodeType.PropertyDefinition ||
				type === NodeType.StaticBlock
			) {
				return false;
			}
			if (FUNCTION_TYPES[type] !== 1) continue;
			// A named one may call itself, as `arguments.callee` may, reading it.
			if (
				(type !== NodeType.FunctionExpression &&
					type !== NodeType.ArrowFunctionExpression) ||
				tree.flag(Flag.async, fn) ||
				tree.flag(Flag.generator, fn) ||
				(type === NodeType.FunctionExpression &&
					(tree.field(0, Field.id, fn) !== 0 || readsArguments(fn)))
			) {
				return false;
			}
			const call = parentAt(level + 1);
			return (
				typeOf(call) === NodeType.CallExpression &&
				childOf(Field.callee, call) === fn &&
				(reducedCalls.size === 0 || !reducedCalls.has(call)) &&
				valueUnread(call, parentAt(level + 2))
			);
		}
	};

	/**
	 * terser's `Exit._do_print`.
	 * @param {number} node the statement
	 * @param {string} keyword its keyword
	 * @returns {void}
	 */
	const printExit = (node, keyword) => {
		output.print(keyword);
		const argument = childOf(Field.argument, node);
		if (
			compresses &&
			argument !== 0 &&
			keyword === "return" &&
			(returnsNothing(argument) ||
				(dropsSideEffectFree && returnsUnread() && isPureValue(argument)))
		) {
			skipNode(argument);
		} else if (argument !== 0) {
			// terser parenthesizes a value only for comments before it it has
			// not printed, and the keyword's own comments take those first.
			output.space();
			printNode(argument);
		}
		output.semicolon();
	};

	/**
	 * terser's `LoopControl._do_print`.
	 * @param {number} node the statement
	 * @param {string} keyword its keyword
	 * @returns {void}
	 */
	const printLoopControl = (node, keyword) => {
		output.print(keyword);
		const label = tree.field(0, Field.label, node);
		if (label !== 0) {
			output.space();
			printNode(label);
		}
		output.semicolon();
	};

	/**
	 * @param {number} node an expression in parentheses of its holder's syntax
	 * @returns {void}
	 */
	const printParenthesized = (node) => {
		output.print("(");
		printNode(node);
		output.print(")");
	};

	/**
	 * terser's `print_mapped_name`.
	 * @param {number} node the name
	 * @returns {void}
	 */
	const printMappedName = (node) => {
		if (tree.type(node) === NodeType.Literal) {
			output.print_string(moduleName(node), quoteOf(node));
		} else {
			printNode(node);
		}
	};

	/**
	 * terser's `print_foreign_name`.
	 * @param {number} node the name
	 * @returns {void}
	 */
	const printForeignName = (node) => {
		if (tree.type(node) === NodeType.Literal) {
			output.print_string(moduleName(node), quoteOf(node));
		} else {
			output.print(tree.name(node));
		}
	};

	/**
	 * terser's `NameMapping` printer.
	 * @param {number} local the local name
	 * @param {number} foreign the other module's name
	 * @param {boolean} isImport whether it is an import's
	 * @returns {void}
	 */
	const printNameMapping = (local, foreign, isImport) => {
		// A local name mangling renamed no longer spells the other module's.
		const printed =
			tree.type(local) === NodeType.Literal ? moduleName(local) : nameOf(local);
		if (printed === moduleName(foreign)) {
			printMappedName(local);
			return;
		}
		if (isImport) printForeignName(foreign);
		else printMappedName(local);
		output.space();
		output.print("as");
		output.space();
		if (isImport) printNode(local);
		else printForeignName(foreign);
	};

	/**
	 * Named imports or exports in braces.
	 * @param {number} node the import or export
	 * @param {number} from the first specifier printed
	 * @returns {void}
	 */
	const printSpecifiers = (node, from) => {
		const count = tree.fieldCount(Field.specifiers, node);
		output.print("{");
		for (let i = from; i < count; i++) {
			output.space();
			printNode(tree.field(i, Field.specifiers, node));
			if (i < count - 1) output.print(",");
		}
		output.space();
		output.print("}");
	};

	/**
	 * Import attributes, printed as the object terser holds them in.
	 * @param {number} node the import or export
	 * @returns {void}
	 */
	const printAttributes = (node) => {
		const count = tree.fieldCount(Field.attributes, node);
		if (count === 0) return;
		output.print("with");
		output.print("{");
		for (let i = 0; i < count; i++) {
			if (i) output.print(",");
			printNode(tree.field(i, Field.attributes, node));
		}
		output.print("}");
	};

	/**
	 * An import's or export's source and attributes.
	 * @param {number} node the declaration
	 * @returns {void}
	 */
	const printSource = (node) => {
		const from = tree.field(0, Field.source, node);
		if (from !== 0) {
			output.space();
			output.print("from");
			output.space();
			printNode(from);
		}
		printAttributes(node);
		output.semicolon();
	};

	/**
	 * terser's `Class` printer.
	 * @param {number} node a class declaration or expression
	 * @returns {void}
	 */
	const printClass = (node) => {
		output.print("class");
		output.space();
		const id = tree.field(0, Field.id, node);
		if (
			id !== 0 &&
			typeOf(node) === NodeType.ClassExpression &&
			dropsName(id, keepsClassNames)
		) {
			skipNode(id);
		} else if (id !== 0) {
			printNode(id);
			output.space();
		}
		const superClass = childOf(Field.superClass, node);
		if (superClass !== 0) {
			const type = typeOf(superClass);
			const parens =
				type !== NodeType.Identifier &&
				type !== NodeType.MemberExpression &&
				type !== NodeType.ClassExpression &&
				type !== NodeType.FunctionExpression;
			output.print("extends");
			if (parens) output.print("(");
			else output.space();
			printNode(superClass);
			if (parens) output.print(")");
			else output.space();
		}
		const body = tree.field(0, Field.body, node);
		const count = tree.fieldCount(Field.body, body);
		// A base constructor returning an object installs a derived class's
		// private members on it again, which throws: those stay.
		const read = compresses && superClass === 0 ? privateNamesRead(body) : null;
		let printed = 0;
		for (let i = 0; i < count; i++) {
			const member = tree.field(i, Field.body, body);
			if (read !== null && dropsPrivateMember(member, read)) {
				skipNode(member);
				continue;
			}
			if (printed++ === 0) output.print("{");
			if (beautifies) output.print("\n");
			printNode(member);
		}
		if (printed === 0) {
			output.print("{}");
			return;
		}
		if (beautifies) output.print("\n");
		output.print("}");
	};

	/**
	 * The private names a class body reads, terser's `unused` of its members.
	 * @param {number} body the class body
	 * @returns {Set<string> | null} the names, null where a direct `eval` may read any or it declares none
	 */
	const privateNamesRead = (body) => {
		const count = tree.fieldCount(Field.body, body);
		/** @type {Set<number> | undefined} */
		let keys;
		for (let i = 0; i < count; i++) {
			const key = childOf(Field.key, tree.field(i, Field.body, body));
			if (key !== 0 && tree.type(key) === NodeType.PrivateIdentifier) {
				(keys || (keys = new Set())).add(key);
			}
		}
		if (keys === undefined) return null;
		const declared = keys;
		/** @type {Set<string>} */
		const read = new Set();
		const evaluates = findNode(body, (node) => {
			switch (tree.type(node)) {
				case NodeType.PrivateIdentifier:
					if (!declared.has(node)) read.add(tree.name(node));
					return;
				case NodeType.Identifier:
					return tree.name(node) === "eval" ? true : undefined;
			}
		});
		return evaluates ? null : read;
	};

	/**
	 * @param {number} member a class member
	 * @param {Set<string>} read the private names its class reads
	 * @returns {boolean} whether it is a private method, accessor or field no name reads, whose value runs nothing
	 */
	const dropsPrivateMember = (member, read) => {
		const type = typeOf(member);
		if (
			(type !== NodeType.MethodDefinition &&
				type !== NodeType.PropertyDefinition) ||
			hasEdgeComments(member)
		) {
			return false;
		}
		const key = childOf(Field.key, member);
		if (
			tree.type(key) !== NodeType.PrivateIdentifier ||
			read.has(tree.name(key))
		) {
			return false;
		}
		if (type === NodeType.MethodDefinition) return true;
		const value = childOf(Field.value, member);
		return value === 0 || isPureValue(value);
	};

	/**
	 * terser's `Lambda._do_print`.
	 * @param {number} node the function
	 * @param {boolean} isMethod whether it is a method's value, printed without `function`
	 * @returns {void}
	 */
	const printLambda = (node, isMethod) => {
		let id = tree.field(0, Field.id, node);
		if (!isMethod) {
			if (tree.flag(Flag.async, node)) {
				output.print("async");
				output.space();
			}
			output.print("function");
			if (tree.flag(Flag.generator, node)) output.star();
			if (
				id !== 0 &&
				(typeOf(node) === NodeType.FunctionExpression
					? dropsName(id, keepsFunctionNames)
					: // Moved, it keeps the name `keep_fnames` keeps.
						!keepsFunctionNames && defunMoved(node))
			) {
				skipNode(id);
				id = 0;
			} else if (id !== 0) {
				output.space();
			}
		}
		if (id !== 0) printNode(id);
		printArguments(node, Field.params);
		output.space();
		printBraced(node, tree.field(0, Field.body, node));
	};

	/**
	 * @param {number} node a call, `new` or function
	 * @param {number} field its arguments or parameters
	 * @returns {void}
	 */
	const printArguments = (node, field) => {
		const count = tree.fieldCount(field, node);
		output.print("(");
		let printed = 0;
		for (let i = 0; i < count; i++) {
			const item = itemOf(i, field, node);
			if (constantArguments.size !== 0 && passesInlined(item, field)) {
				skipNode(item);
				continue;
			}
			if (printed++ !== 0) output.comma();
			printNode(item);
		}
		output.print(")");
	};

	/**
	 * @param {number} item a parameter or argument
	 * @param {number} field the field listing it
	 * @returns {boolean} whether it is a parameter each read of which prints the constant passed, or that constant
	 */
	const passesInlined = (item, field) => {
		const param =
			field === Field.params
				? constantArguments.has(item)
					? item
					: undefined
				: field === Field.arguments
					? passedConstants.get(item)
					: undefined;
		return param !== undefined && dropped[param] === 1;
	};

	/**
	 * The name a computed key of a constant converts to, where it may print
	 * as that name: a class's `constructor` and static `prototype`, and an
	 * object's `__proto__` value, mean something else written so.
	 * @param {number} member the property, method or field
	 * @param {number} key its key
	 * @returns {string | undefined} the name, undefined to print it computed
	 */
	const liftedKeyOf = (member, key) => {
		if (!liftsKeys || renamedProperties !== null || hasEdgeComments(key)) {
			return;
		}
		/** @type {string | undefined} */
		let name;
		const type = tree.type(key);
		if (type === NodeType.Literal) {
			const value = tree.value(key);
			if (typeof value === "string" || value === null) {
				name = `${value}`;
			} else if (typeof value === "number" && Number.isFinite(value)) {
				name = `${value}`;
			}
		} else if (
			type === NodeType.Identifier &&
			(isGlobalUndefined(key) ||
				isGlobalUndefined(key, "NaN") ||
				isGlobalUndefined(key, "Infinity"))
		) {
			name = tree.name(key);
		} else if (type === NodeType.MemberExpression) {
			const value = valueAtPrint(key);
			if (typeof value === "string") name = value;
		}
		if (name === undefined) return;
		const memberType = typeOf(member);
		if (memberType === NodeType.Property) {
			return name === "__proto__" &&
				isKeyValue(member) &&
				typeOf(parentAt(0)) === NodeType.ObjectExpression
				? undefined
				: name;
		}
		// V8 reads a class member's `"#constructor"` as the constructor's name.
		return name === "constructor" ||
			name.charCodeAt(0) === 35 ||
			(name === "prototype" && tree.flag(Flag.static, member))
			? undefined
			: name;
	};

	/**
	 * A computed key; one folding to a string where properties are renamed
	 * prints it renamed by its name, as terser's `computed_props` lifts it.
	 * @param {number} member the property, method or field
	 * @param {number} key the key
	 * @returns {void}
	 */
	const printComputedKey = (member, key) => {
		const lifted = liftedKeyOf(member, key);
		if (lifted !== undefined) {
			skipNode(key);
			// Lifted, it keeps no quote, as terser's own lifting gives it none.
			printPropertyName(lifted, undefined, output);
			return;
		}
		const folded =
			renamedProperties === null ||
			!compresses ||
			typeOf(key) === NodeType.Literal ||
			hasEdgeComments(key)
				? undefined
				: foldedOf(key);
		output.print("[");
		if (typeof folded === "string") {
			skipNode(key);
			printStringValue(
				/** @type {PropertyNames} */ (renamedProperties).mangle(folded)
			);
		} else {
			printNode(key);
		}
		output.print("]");
	};

	/**
	 * terser's `_print_getter_setter`: a getter, setter or method.
	 * @param {number} node the property or method definition
	 * @param {string | undefined} keyword what precedes its name
	 * @returns {void}
	 */
	const printMethod = (node, keyword) => {
		if (tree.flag(Flag.static, node)) {
			output.print("static");
			output.space();
		}
		if (keyword) {
			output.print(keyword);
			output.space();
		}
		const key = childOf(Field.key, node);
		const isPrivate = tree.type(key) === NodeType.PrivateIdentifier;
		if (tree.flag(Flag.computed, node) && !isPrivate) {
			printComputedKey(node, key);
		} else if (isPrivate) {
			output.print("#");
			output.print_name(privateNameOf(key));
		} else {
			printPropertyName(printedKeyOf(node, key), keyQuoteOf(node), output);
		}
		printLambda(tree.field(0, Field.value, node), true);
	};

	/**
	 * @param {number} node a method's or property's
	 * @returns {string | undefined} the keyword its kind prints before its name
	 */
	const methodKeyword = (node) => {
		const kind = tree.textOf(Part.kind, node);
		if (kind === "get" || kind === "set") return kind;
		const value = tree.field(0, Field.value, node);
		const generator = tree.flag(Flag.generator, value);
		const async = tree.flag(Flag.async, value);
		if (generator && async) return "async*";
		if (generator) return "*";
		if (async) return "async";
	};

	/**
	 * Whether a shorthand's value prints as its key: renamed, or printing a
	 * value or function in its place, it prints after the key.
	 * @param {number} value the name read
	 * @param {string} name the key
	 * @returns {boolean} true where the key alone reads it
	 */
	const printsAs = (value, name) =>
		nameOf(value) === name &&
		!isMovedRead(value) &&
		!isInlinedRead(value) &&
		!(collapsed.size !== 0 && collapsed.has(value));

	/**
	 * terser's `ObjectKeyVal` printer.
	 * @param {number} node the property
	 * @returns {void}
	 */
	const printKeyValue = (node) => {
		const key = childOf(Field.key, node);
		const value = childOf(Field.value, node);
		const quote = keyQuoteOf(node);
		const name = tree.flag(Flag.computed, node) ? undefined : keyName(key);
		// A key property mangling renames prints alone only where its value
		// prints as the new name.
		const printed = name === undefined ? undefined : printedKeyOf(node, key);
		const tryShorthand = Boolean(
			output.option("shorthand") && name !== undefined
		);
		const valueType = typeOf(value);
		// A value mangling names as its key prints alone too, as terser's does.
		if (
			tryShorthand &&
			valueType === NodeType.Identifier &&
			tree.type(value) === NodeType.Identifier &&
			nameOf(value) === printed &&
			!ALL_RESERVED_WORDS.has(printed)
		) {
			const shorthand = printed;
			if (
				!printPropertyName(shorthand, quote, output) ||
				!printsAs(value, shorthand)
			) {
				output.colon();
				printNode(value);
			}
		} else if (
			tryShorthand &&
			valueType === NodeType.AssignmentPattern &&
			typeOf(childOf(Field.left, value)) === NodeType.Identifier &&
			nameOf(childOf(Field.left, value)) === printed
		) {
			if (!printPropertyName(printed, quote, output)) {
				output.colon();
				printNode(childOf(Field.left, value));
			}
			output.space();
			output.print("=");
			output.space();
			printNode(childOf(Field.right, value));
		} else {
			if (printed !== undefined) {
				printPropertyName(printed, quote, output);
			} else {
				printComputedKey(node, key);
			}
			output.colon();
			printNode(value);
		}
	};

	/**
	 * A pattern's or array's elements.
	 * @param {number} node the array or pattern
	 * @param {number} field its elements or properties
	 * @returns {void}
	 */
	const printElements = (node, field) => {
		const count = tree.fieldCount(field, node);
		for (let i = 0; i < count; i++) {
			const element = itemOf(i, field, node);
			if (i) output.comma();
			if (element !== 0) printNode(element);
			else if (i === count - 1) output.comma();
		}
	};

	/**
	 * @param {number} node a node, 0 for none
	 * @returns {string | number | boolean | undefined} the literal a `+` adds, undefined where it adds none
	 */
	const addedLiteral = (node) => {
		if (
			typeOf(node) !== NodeType.BinaryExpression ||
			tree.textOf(Part.operator, node) !== "+"
		) {
			return undefined;
		}
		const right = childOf(Field.right, node);
		if (typeOf(right) !== NodeType.Literal || hasEdgeComments(right)) {
			return undefined;
		}
		const value = tree.value(right);
		return typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean"
			? value
			: undefined;
	};

	/**
	 * terser's `evaluate` of `x + "a" + 1` as `x + "a1"`: from a `+` of a string
	 * literal up, each `+` of a literal adds to a string, so they join.
	 * @param {number} node a node
	 * @returns {boolean} whether it is a `+` of a literal with one of a string at or below it, down its run
	 */
	const addsToString = (node) => {
		for (
			let below = node;
			addedLiteral(below) !== undefined;
			below = childOf(Field.left, below)
		) {
			if (typeof addedLiteral(below) === "string") return true;
		}
		return false;
	};

	/**
	 * @param {number} node the last `+` of a run `addsToString` finds
	 * @returns {string} the literals the run adds from its first string on, joined
	 */
	const joinedLiterals = (node) => {
		let joined = "";
		let fromString = "";
		for (
			let below = node;
			addedLiteral(below) !== undefined;
			below = childOf(Field.left, below)
		) {
			const value = addedLiteral(below);
			joined = String(value) + joined;
			if (typeof value === "string") fromString = joined;
		}
		return fromString;
	};

	/**
	 * terser's `Binary` printer.
	 * @param {number} node a binary, logical or assignment expression, or an assignment pattern
	 * @param {string=} operator the operator it prints with, where not its own
	 * @returns {void}
	 */
	const printBinary = (node, operator = operatorOf(node)) => {
		printNode(childOf(Field.left, node));
		if (operator[0] === ">" && output.tail === (45 | (45 << 16))) {
			output.print(" ");
		} else {
			output.space();
		}
		output.print(operator);
		output.space();
		printNode(childOf(Field.right, node));
	};

	/**
	 * Prints a function called with nothing passed as the value it returns.
	 * @param {number} node the function
	 * @returns {void}
	 */
	const printReduced = (node) => {
		const id = tree.field(0, Field.id, node);
		if (id !== 0) skipNode(id);
		const count = tree.fieldCount(Field.params, node);
		for (let i = 0; i < count; i++) {
			skipNode(tree.field(i, Field.params, node));
		}
		printNode(/** @type {number} */ (reducing.get(node)));
	};

	/**
	 * @param {number} call a call printing as the value its function returns
	 * @param {number} fn that function
	 * @param {number} value that value
	 * @returns {boolean} whether the value needs parentheses where the call is
	 */
	const reducedParens = (call, fn, value) => {
		const type = typeOf(value);
		if (
			type === NodeType.Identifier ||
			type === NodeType.ThisExpression ||
			type === NodeType.MemberExpression ||
			type === NodeType.CallExpression ||
			type === NodeType.ArrayExpression ||
			type === NodeType.TemplateLiteral ||
			(type === NodeType.Literal && typeof tree.value(value) === "string")
		) {
			return false;
		}
		// An arrow's body prints a sequence in parentheses already.
		if (type === NodeType.SequenceExpression) {
			return !(
				typeOf(fn) === NodeType.ArrowFunctionExpression &&
				childOf(Field.body, fn) === value
			);
		}
		const parent = parentAt(0);
		if (typeOf(parent) === NodeType.ExpressionStatement) {
			return opensAmbiguously(value);
		}
		if (!lowNeedsParens(call)) {
			return opensAmbiguously(value) && firstInStatement(call, 0, true);
		}
		if (
			type === NodeType.BinaryExpression ||
			type === NodeType.LogicalExpression
		) {
			return operationNeedsParens(call, value);
		}
		if (type === NodeType.UnaryExpression) return unaryNeedsParensAt(call);
		if (
			type === NodeType.ObjectExpression ||
			type === NodeType.ClassExpression ||
			type === NodeType.FunctionExpression
		) {
			return literalNeedsParensAt(call, type);
		}
		// Where an assignment needs them, what is left needs them too.
		return true;
	};

	/**
	 * terser's `Call` printer.
	 * @param {number} node a call or `new`
	 * @returns {void}
	 */
	const printCall = (node) => {
		const callee = childOf(Field.callee, node);
		const joined =
			compresses && typeOf(node) === NodeType.CallExpression
				? joinedOf(node)
				: undefined;
		if (joined !== undefined) {
			// It prints as the string it makes.
			skipNode(callee);
			const count = tree.fieldCount(Field.arguments, node);
			for (let i = 0; i < count; i++) {
				skipNode(itemOf(i, Field.arguments, node));
			}
			printStringValue(joined);
			return;
		}
		if (
			callee !== 0 &&
			(callee === unwrappedFunction ||
				(unreadBodies.size !== 0 && unreadBodies.has(callee)))
		) {
			// Printing as what it runs, the call passes nothing.
			printNode(callee);
			const count = tree.fieldCount(Field.arguments, node);
			for (let i = 0; i < count; i++) {
				skipNode(itemOf(i, Field.arguments, node));
			}
			return;
		}
		const fn = reducedCalls.size === 0 ? undefined : reducedCalls.get(node);
		if (fn !== undefined) {
			// The function called prints as the value it returns.
			const value = /** @type {number} */ (reducing.get(fn));
			// A name or member read where `typeof`, `delete` or a call reads a
			// reference stays a value, as the call's result was.
			const reference = readsReference(value, node);
			const parens = reference || reducedParens(node, fn, value);
			if (parens) output.print("(");
			if (reference) output.print("0,");
			printNode(childOf(Field.callee, node));
			if (parens) output.print(")");
			const count = tree.fieldCount(Field.arguments, node);
			for (let i = 0; i < count; i++) {
				skipNode(itemOf(i, Field.arguments, node));
			}
			return;
		}
		if (callsEmptyFunction(node) && valueUnread(node, parentAt(0))) {
			// It runs only its arguments, which an array literal runs in turn.
			skipNode(childOf(Field.callee, node));
			const count = tree.fieldCount(Field.arguments, node);
			output.print("[");
			for (let i = 0; i < count; i++) {
				if (i) output.comma();
				printNode(itemOf(i, Field.arguments, node));
			}
			output.print("]");
			return;
		}
		const enumeration =
			typeOf(node) === NodeType.CallExpression
				? enumerationOf(node)
				: undefined;
		if (enumeration !== undefined) {
			// It prints as the array it makes: an array argument prints so itself.
			skipNode(childOf(Field.callee, node));
			const argument = itemOf(0, Field.arguments, node);
			if (typeOf(argument) === NodeType.Literal) {
				skipNode(argument);
				printEnumeratedString(
					/** @type {string} */ (tree.value(argument)),
					enumeration
				);
			} else if (typeOf(argument) === NodeType.ObjectExpression) {
				skipNode(argument);
				output.print("[");
				const keys = /** @type {string[]} */ (objectKeysOf(argument));
				for (let i = 0; i < keys.length; i++) {
					if (i > 0) output.comma();
					printStringValue(keys[i]);
				}
				output.print("]");
			} else {
				printNode(argument);
			}
			return;
		}
		printNode(childOf(Field.callee, node));
		if (
			typeOf(node) === NodeType.NewExpression &&
			tree.fieldCount(Field.arguments, node) === 0
		) {
			return;
		}
		if (tree.flag(Flag.optional, node)) output.print("?.");
		printArguments(node, Field.arguments);
	};

	/**
	 * Whether a call's callee is a function expression of plain parameters
	 * and an empty body, which runs nothing but evaluating its arguments.
	 * @param {number} node a call or `new`
	 * @returns {boolean} true where it is
	 */
	const callsEmptyFunction = (node) => {
		if (
			!compresses ||
			typeOf(node) !== NodeType.CallExpression ||
			tree.flag(Flag.optional, node) ||
			hasEdgeComments(node)
		) {
			return false;
		}
		const callee = childOf(Field.callee, node);
		const type = typeOf(callee);
		if (
			(type !== NodeType.FunctionExpression &&
				type !== NodeType.ArrowFunctionExpression) ||
			tree.flag(Flag.async, callee) ||
			tree.flag(Flag.generator, callee) ||
			hasEdgeComments(callee)
		) {
			return false;
		}
		const body = tree.field(0, Field.body, callee);
		if (
			typeOf(body) !== NodeType.BlockStatement ||
			tree.fieldCount(Field.body, body) !== 0 ||
			hasEdgeComments(body)
		) {
			return false;
		}
		const count = tree.fieldCount(Field.params, callee);
		for (let i = 0; i < count; i++) {
			if (typeOf(itemOf(i, Field.params, callee)) !== NodeType.Identifier) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} node an expression
	 * @param {number} parent its parent
	 * @returns {boolean} whether nothing reads its value: a statement's, a sequence's but the last, or what `noteUnreadValue` noted
	 */
	const valueUnread = (node, parent) => {
		if (unreadValues.size !== 0 && unreadValues.has(node)) return true;
		switch (typeOf(parent)) {
			case NodeType.ExpressionStatement:
				return childOf(Field.expression, parent) === node;
			case NodeType.SequenceExpression: {
				const count = tree.fieldCount(Field.expressions, parent);
				return itemOf(count - 1, Field.expressions, parent) !== node;
			}
			default:
				return false;
		}
	};

	/**
	 * Which of `Object.keys`, `Object.values` or `Object.entries` a call is,
	 * where it enumerates a string or an array literal of what runs nothing,
	 * and so prints as the array it makes.
	 * @param {number} node a call
	 * @returns {"keys" | "values" | "entries" | undefined} the method, undefined where it prints as a call
	 */
	const enumerationOf = (node) => {
		if (
			!compresses ||
			tree.flag(Flag.optional, node) ||
			tree.fieldCount(Field.arguments, node) !== 1 ||
			hasEdgeComments(node)
		) {
			return;
		}
		const callee = childOf(Field.callee, node);
		if (
			typeOf(callee) !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, callee) ||
			tree.flag(Flag.optional, callee) ||
			hasEdgeComments(callee) ||
			!isGlobalUndefined(childOf(Field.object, callee), "Object")
		) {
			return;
		}
		const method = tree.name(childOf(Field.property, callee));
		if (
			(method !== "keys" && method !== "values" && method !== "entries") ||
			objectWrites === true ||
			objectWrites.has(method)
		) {
			return;
		}
		const argument = itemOf(0, Field.arguments, node);
		if (hasEdgeComments(argument)) return;
		const type = typeOf(argument);
		if (type === NodeType.Literal) {
			return typeof tree.value(argument) === "string" ? method : undefined;
		}
		if (type === NodeType.ObjectExpression) {
			return method === "keys" && objectKeysOf(argument) !== undefined
				? method
				: undefined;
		}
		if (type !== NodeType.ArrayExpression) return;
		const count = tree.fieldCount(Field.elements, argument);
		for (let i = 0; i < count; i++) {
			const element = itemOf(i, Field.elements, argument);
			if (
				element !== 0 &&
				(typeOf(element) === NodeType.SpreadElement ||
					hasEdgeComments(element) ||
					!isPureValue(element))
			) {
				return;
			}
		}
		return method;
	};

	/**
	 * The keys `Object.keys` gives of an object literal: array indices first,
	 * ascending, then the rest as first written.
	 * @param {number} node an object literal
	 * @returns {string[] | undefined} its keys, undefined where one is unknown, a spread or `__proto__` sets the prototype, or a value or key runs anything
	 */
	const objectKeysOf = (node) => {
		/** @type {string[]} */
		const indices = [];
		/** @type {string[]} */
		const names = [];
		const count = tree.fieldCount(Field.properties, node);
		for (let i = 0; i < count; i++) {
			const property = itemOf(i, Field.properties, node);
			if (typeOf(property) !== NodeType.Property || hasEdgeComments(property)) {
				return;
			}
			const key = childOf(Field.key, property);
			/** @type {string} */
			let name;
			if (tree.flag(Flag.computed, property)) {
				const value =
					typeOf(key) === NodeType.Identifier &&
					(isGlobalUndefined(key) ||
						isGlobalUndefined(key, "NaN") ||
						isGlobalUndefined(key, "Infinity"))
						? tree.name(key)
						: evaluateConstant(key);
				if (value === undefined || !isPureValue(key)) return;
				name = String(value);
			} else {
				name = keyName(key);
				if (
					name === "__proto__" &&
					!tree.flag(Flag.shorthand, property) &&
					!tree.flag(Flag.method, property) &&
					tree.textOf(Part.kind, property) === "init"
				) {
					return;
				}
			}
			if (
				tree.textOf(Part.kind, property) === "init" &&
				!tree.flag(Flag.method, property) &&
				!isPureValue(childOf(Field.value, property))
			) {
				return;
			}
			const index = Number(name);
			// An array index is an integer below 2 ** 32 - 1.
			const list =
				String(index) === name &&
				Number.isInteger(index) &&
				index >= 0 &&
				index < 4294967295
					? indices
					: names;
			if (!list.includes(name)) list.push(name);
		}
		indices.sort((a, b) => Number(a) - Number(b));
		return [...indices, ...names];
	};

	/**
	 * terser's `evaluate` of `.join` of an array of constants, or of the keys
	 * `Object.keys` gives, by a constant separator.
	 * @param {number} node a call
	 * @returns {string | undefined} the string it makes, undefined where unknown
	 */
	const joinedOf = (node) => {
		const callee = childOf(Field.callee, node);
		const args = tree.fieldCount(Field.arguments, node);
		if (
			typeOf(callee) !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, callee) ||
			tree.flag(Flag.optional, callee) ||
			tree.flag(Flag.optional, node) ||
			args > 1 ||
			hasEdgeComments(callee) ||
			tree.name(childOf(Field.property, callee)) !== "join"
		) {
			return;
		}
		/** @type {string} */
		let separator = ",";
		if (args === 1) {
			const argument = itemOf(0, Field.arguments, node);
			const value = evaluateConstant(argument);
			if (
				(typeof value !== "string" && !isUndefinedValue(argument)) ||
				!isPureValue(argument)
			) {
				return;
			}
			if (typeof value === "string") separator = value;
		}
		const object = childOf(Field.object, callee);
		/** @type {(string | number | boolean | null | undefined)[]} */
		let values;
		if (typeOf(object) === NodeType.ArrayExpression) {
			values = [];
			const count = tree.fieldCount(Field.elements, object);
			for (let i = 0; i < count; i++) {
				const element = itemOf(i, Field.elements, object);
				if (element === 0) {
					values.push(undefined);
					continue;
				}
				const value = evaluateConstant(element);
				if (
					(value === undefined && !isUndefinedValue(element)) ||
					!isPureValue(element)
				) {
					return;
				}
				values.push(value);
			}
		} else if (
			typeOf(object) === NodeType.CallExpression &&
			enumerationOf(object) === "keys"
		) {
			const argument = itemOf(0, Field.arguments, object);
			switch (typeOf(argument)) {
				case NodeType.ObjectExpression:
					values = /** @type {string[]} */ (objectKeysOf(argument));
					break;
				case NodeType.Literal:
					values = Object.keys(/** @type {string} */ (tree.value(argument)));
					break;
				default: {
					values = [];
					const count = tree.fieldCount(Field.elements, argument);
					for (let i = 0; i < count; i++) {
						if (itemOf(i, Field.elements, argument) !== 0) values.push(`${i}`);
					}
				}
			}
		} else {
			return;
		}
		return values
			.map((value) => (value === null || value === undefined ? "" : value))
			.join(separator);
	};

	/**
	 * Prints what `Object.keys`, `values` or `entries` makes of a string: its
	 * UTF-16 code units, by index.
	 * @param {string} value the string
	 * @param {"keys" | "values" | "entries"} method the method
	 * @returns {void}
	 */
	const printEnumeratedString = (value, method) => {
		output.print("[");
		for (let i = 0; i < value.length; i++) {
			if (i > 0) output.comma();
			if (method === "entries") output.print("[");
			if (method !== "values") printStringValue(`${i}`);
			if (method === "entries") output.comma();
			if (method !== "keys") printStringValue(value[i]);
			if (method === "entries") output.print("]");
		}
		output.print("]");
	};

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is a `!`, whose own `!!` fold leaves it no `!` to drop
	 */
	const isNegation = (node) =>
		typeOf(node) === NodeType.UnaryExpression &&
		tree.textOf(Part.operator, node) === "!";

	/**
	 * @param {number} node the node being printed
	 * @returns {boolean} whether its parent reads only its truth: as a test, or what `!` negates
	 */
	const readsTruth = (node) => {
		const parent = parentAt(0);
		switch (typeOf(parent)) {
			case NodeType.IfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement:
			case NodeType.ForStatement:
			case NodeType.ConditionalExpression:
				return childOf(Field.test, parent) === node;
			case NodeType.UnaryExpression:
				return tree.textOf(Part.operator, parent) === "!";
			default:
				return false;
		}
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean | undefined} the boolean it is, as `true` or `!0`, undefined where it is none or holds a comment
	 */
	const booleanOf = (node) => {
		if (hasEdgeComments(node)) return undefined;
		const value = evaluateConstant(node);
		return typeof value === "boolean" && isPureValue(node) ? value : undefined;
	};

	/**
	 * terser's `evaluate` of an infinity: `Infinity`, `Number.POSITIVE_INFINITY`
	 * and `Number.NEGATIVE_INFINITY` read as values print as `1/0` and `-1/0`.
	 * @param {number} node a name or member expression, being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsInfinity = (node) => {
		let negative = false;
		if (typeOf(node) === NodeType.Identifier) {
			if (keepsGlobalNames || !isGlobalUndefined(node, "Infinity")) {
				return false;
			}
		} else {
			const name = numberConstantOf(node);
			if (name !== "POSITIVE_INFINITY" && name !== "NEGATIVE_INFINITY") {
				return false;
			}
			negative = name === "NEGATIVE_INFINITY";
			/** @type {JavascriptPrintContext} */ (writer).consume(
				childOf(Field.object, node)
			);
		}
		const parent = parentAt(0);
		let bare;
		switch (typeOf(parent)) {
			case NodeType.BinaryExpression: {
				const operator = tree.textOf(Part.operator, parent);
				bare =
					operator !== "*" &&
					operator !== "/" &&
					operator !== "%" &&
					operator !== "**";
				break;
			}
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				bare = childOf(Field.callee, parent) !== node;
				break;
			case NodeType.MemberExpression:
			case NodeType.UnaryExpression:
			case NodeType.UpdateExpression:
			case NodeType.AwaitExpression:
			case NodeType.TaggedTemplateExpression:
			case NodeType.ClassExpression:
			case NodeType.ClassDeclaration:
				bare = false;
				break;
			default:
				bare = true;
		}
		output.print(
			bare ? (negative ? "-1/0" : "1/0") : negative ? "(-1/0)" : "(1/0)"
		);
		return true;
	};

	/**
	 * @param {number} node a member expression
	 * @returns {string | undefined} the property of the global `Number` it reads as a value, undefined for any other
	 */
	const numberConstantOf = (node) => {
		const object = childOf(Field.object, node);
		const property = tree.field(0, Field.property, node);
		if (
			tree.flag(Flag.computed, node) ||
			tree.flag(Flag.optional, node) ||
			typeOf(object) !== NodeType.Identifier ||
			typeOf(property) !== NodeType.Identifier ||
			hasEdgeComments(object) ||
			!isGlobalUndefined(object, "Number")
		) {
			return undefined;
		}
		const parent = parentAt(0);
		switch (typeOf(parent)) {
			case NodeType.AssignmentExpression:
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
				if (childOf(Field.left, parent) === node) return undefined;
				break;
			case NodeType.UpdateExpression:
				return undefined;
			case NodeType.UnaryExpression:
				if (tree.textOf(Part.operator, parent) === "delete") return undefined;
				break;
			case NodeType.CallExpression:
				// A call of a member binds `this` to its object.
				if (childOf(Field.callee, parent) === node) return undefined;
				break;
		}
		return tree.name(property);
	};

	/**
	 * terser's `UnaryPrefix` and `UnaryPostfix` printers.
	 * @param {number} node a unary or update expression
	 * @returns {void}
	 */
	const printUnary = (node) => {
		const argument = childOf(Field.argument, node);
		const operator = /** @type {string} */ (tree.textOf(Part.operator, node));
		if (!tree.flag(Flag.prefix, node)) {
			printNode(argument);
			output.print(operator);
			return;
		}
		if (
			unreadValues.size !== 0 &&
			unreadValues.has(argument) &&
			typeOf(argument) === NodeType.CallExpression &&
			unreadBodies.has(childOf(Field.callee, argument))
		) {
			// A `void` or `!` of a call printing as what it runs, unread, goes.
			printNode(argument);
			return;
		}
		if (
			compresses &&
			(operator === "+" || operator === "typeof") &&
			!holdsComments(node)
		) {
			// terser's `evaluate`: `+"1"` is `1`, `typeof 1` is `"number"`, where
			// no longer than the operation.
			const value = valueAtPrint(node);
			const text = /** @type {JavascriptPrintContext} */ (writer).get(argument);
			// `typeof` is spaced from a name or number.
			const length =
				operator.length +
				text.length +
				(operator === "typeof" && /^[\w$\\\u0080-\uFFFF]/.test(text) ? 1 : 0);
			if (
				typeof value === "string"
					? value.length + 2 <= length
					: typeof value === "number" &&
						Number.isFinite(value) &&
						!Object.is(value, -0) &&
						makeNum(value).length <= length
			) {
				skipNode(argument);
				printValue(/** @type {string | number} */ (value), takesUnary(node));
				return;
			}
		}
		if (
			compresses &&
			operator === "!" &&
			typeOf(argument) === NodeType.UnaryExpression &&
			tree.textOf(Part.operator, argument) === "!" &&
			!isNegation(childOf(Field.argument, argument)) &&
			!holdsComments(argument) &&
			readsTruth(node)
		) {
			// terser's `booleans`: `!!x` read only for its truth is `x`.
			printSlice(
				/** @type {JavascriptPrintContext} */ (writer)
					.consume(argument)
					.slice(1)
			);
			return;
		}
		if (
			compresses &&
			operator === "!" &&
			isNegation(argument) &&
			!holdsComments(argument) &&
			readsTruth(node)
		) {
			// What the `!` negates folded its own `!!`, leaving at most one `!`.
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				argument
			);
			if (text.charCodeAt(0) === 33) {
				printSlice(text.slice(1));
			} else {
				output.print("!");
				printSlice(text);
			}
			return;
		}
		output.print(operator);
		if (
			/^[a-z]/i.test(operator) ||
			(/[+-]$/.test(operator) &&
				isUnaryPrefix(argument) &&
				/^[+-]/.test(
					/** @type {string} */ (tree.textOf(Part.operator, argument))
				))
		) {
			output.space();
		}
		printNode(argument);
	};

	/**
	 * Whether a string printed here may be a template.
	 * @param {number} node the string
	 * @returns {boolean} true when it may
	 */
	const takesTemplate = (node) => {
		if (inDirective(node) || usesAsm(node)) return false;
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		const holderType =
			parentType === NodeType.Property ? typeOf(parentAt(2)) : parentType;
		return !(
			holderType === NodeType.ImportDeclaration ||
			holderType === NodeType.ExportNamedDeclaration ||
			holderType === NodeType.ExportAllDeclaration ||
			parentType === NodeType.ImportExpression ||
			parentType === NodeType.TaggedTemplateExpression ||
			parentType === NodeType.AwaitExpression ||
			parentType === NodeType.YieldExpression ||
			parentType === NodeType.MemberExpression
		);
	};

	/**
	 * Whether a string stands as a statement where directives may still be,
	 * which the stream's `in_directive` says for the string printed.
	 * @param {number} node a string literal
	 * @returns {boolean} true when it does
	 */
	const inDirective = (node) => {
		const statement = parentAt(0);
		if (
			typeOf(statement) !== NodeType.ExpressionStatement ||
			!isStringStatement(statement)
		) {
			return false;
		}
		const owner = parentAt(1);
		if (!holdsDirectives(owner)) return false;
		const body = bodyOf(owner);
		for (let i = 0; ; i++) {
			const other = tree.field(i, Field.body, body);
			if (other === statement) return true;
			if (!isDirective(other) && typeOf(other) !== NodeType.EmptyStatement) {
				return false;
			}
		}
	};

	/**
	 * @param {number} owner the node a body's statements are printed in
	 * @returns {boolean} whether its body may open with directives
	 */
	const holdsDirectives = (owner) => {
		const type = tree.type(owner);
		return (
			type === NodeType.Program ||
			type === NodeType.FunctionDeclaration ||
			type === NodeType.FunctionExpression ||
			type === NodeType.MethodDefinition ||
			type === NodeType.Property
		);
	};

	/**
	 * @param {number} owner a program, function, method or property
	 * @returns {number} the node listing its statements
	 */
	const bodyOf = (owner) => {
		switch (tree.type(owner)) {
			case NodeType.Program:
				return owner;
			case NodeType.MethodDefinition:
			case NodeType.Property:
				return tree.field(0, Field.body, tree.field(0, Field.value, owner));
			default:
				return tree.field(0, Field.body, owner);
		}
	};

	/**
	 * Whether the scope a node is in says `use asm` before it, as the stream's
	 * `use_asm` holds while the rest of that scope prints.
	 * @param {number} node the node
	 * @returns {boolean} true when it does
	 */
	const usesAsm = (node) => {
		if (!mayUseAsm) return false;
		const start = tree.start(node);
		for (let level = 0; ; level++) {
			const holder = ancestorOf(level);
			if (holder === 0) return false;
			if (!isScopeType(tree.type(holder))) continue;
			const holderType = tree.type(holder);
			// A class, or an arrow returning an expression, says nothing.
			const body =
				holderType === NodeType.Program || holderType === NodeType.StaticBlock
					? holder
					: tree.field(0, Field.body, holder);
			if (body !== holder && tree.type(body) !== NodeType.BlockStatement) {
				continue;
			}
			const count = tree.fieldCount(Field.body, body);
			for (let i = 0; i < count; i++) {
				const statement = tree.field(i, Field.body, body);
				if (!isDirective(statement)) break;
				if (
					tree.textOf(Part.directive, statement) === "use asm" &&
					tree.start(statement) < start
				) {
					return true;
				}
			}
		}
	};

	/**
	 * terser's `RegExp` printer.
	 * @param {number} node a regular expression literal
	 * @returns {void}
	 */
	const printRegExp = (node) => {
		const raw = /** @type {string} */ (tree.textOf(Part.raw, node));
		const end = raw.lastIndexOf("/");
		const flags = raw.slice(end + 1);
		let pattern = regexpSourceFix(regexpSourceAsRead(raw.slice(1, end)));
		pattern = pattern.replace(REGEXP_SLASH_SCRIPT, escapeSlashScript);
		output.print(
			output.to_utf8(
				`/${pattern}/${flags ? sortRegexpFlags(flags) : ""}`,
				false,
				true
			)
		);
		const parent = parentAt(0);
		if (
			isBinary(parent) &&
			/^\w/.test(operatorOf(parent)) &&
			childOf(Field.left, parent) === node
		) {
			output.print(" ");
		}
	};

	/**
	 * Whether an arrow's block body prints as one `return` of a `?:`: its
	 * `if`s, each pairing with the next, then a `return` they end in.
	 * @param {number} body an arrow's block body
	 * @returns {boolean} whether its body prints as the value returned
	 */
	const returnsChain = (body) => {
		if (!compresses || holdsComments(body)) return false;
		let previous = 0;
		const count = tree.fieldCount(Field.body, body);
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, body);
			if (printsNothing(item)) continue;
			if (previous !== 0 && returnPairs.get(previous) !== item) return false;
			if (typeOf(item) === NodeType.ReturnStatement) {
				return previous !== 0 && i === count - 1;
			}
			if (
				typeOf(item) !== NodeType.IfStatement ||
				tree.field(0, Field.alternate, item) !== 0 ||
				ifForm(item) !== RETURN_FORM
			) {
				return false;
			}
			previous = item;
		}
		return false;
	};

	/**
	 * @param {number} level where the statement printed is among the printed one's parents, -1 for itself
	 * @returns {boolean} whether it is in an arrow's body printing as one value
	 */
	const inReturnsChain = (level) => {
		const holder = parentAt(level + 1);
		const type = typeOf(holder);
		// An arrow's block body is passed over: its statements are the arrow's.
		if (type === NodeType.ArrowFunctionExpression) {
			const block = tree.field(0, Field.body, holder);
			return typeOf(block) === NodeType.BlockStatement && returnsChain(block);
		}
		return (
			type === NodeType.BlockStatement &&
			chainsBranch(holder, parentAt(level + 2))
		);
	};

	/**
	 * @param {number} block a block
	 * @param {number} parent what holds it
	 * @returns {boolean} whether it is the body of an `if` printing as `return t?x:`, itself a chain printing as `x`
	 */
	const chainsBranch = (block, parent) =>
		typeOf(parent) === NodeType.IfStatement &&
		tree.field(0, Field.consequent, parent) === block &&
		returnsChain(block) &&
		ifForm(parent) === RETURN_FORM;

	/**
	 * @param {number} body an arrow's block body
	 * @returns {number} its one statement, alone but for those printing nothing, 0 for none
	 */
	const soleStatement = (body) => {
		const count = tree.fieldCount(Field.body, body);
		if (count === 1) return tree.field(0, Field.body, body);
		if (!compresses || holdsComments(body)) return 0;
		let statement = 0;
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, body);
			if (printsNothing(item)) continue;
			if (statement !== 0) return 0;
			statement = item;
		}
		return statement;
	};

	/**
	 * @param {number} node an arrow
	 * @returns {void}
	 */
	const printArrow = (node) => {
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		const parenthesized =
			(parentType === NodeType.BinaryExpression && !isPrivateIn(parent)) ||
			parentType === NodeType.LogicalExpression ||
			isUnaryType(parentType) ||
			(isCallType(parentType) && childOf(Field.callee, parent) === node);
		if (parenthesized) output.print("(");
		if (tree.flag(Flag.async, node)) {
			output.print("async");
			output.space();
		}
		const first = itemOf(0, Field.params, node);
		if (
			tree.fieldCount(Field.params, node) === 1 &&
			typeOf(first) === NodeType.Identifier &&
			!(constantArguments.size !== 0 && passesInlined(first, Field.params))
		) {
			printNode(first);
		} else {
			printArguments(node, Field.params);
		}
		output.space();
		output.print("=>");
		output.space();
		const body = childOf(Field.body, node);
		let returned = body;
		let returns = typeOf(body) !== NodeType.BlockStatement;
		if (!returns) {
			const statement = soleStatement(body);
			if (typeOf(statement) === NodeType.ReturnStatement) {
				returns = true;
				returned = childOf(Field.argument, statement);
				// What prints nothing goes with the braces.
				const count = tree.fieldCount(Field.body, body);
				for (let i = 0; i < count; i++) {
					const item = tree.field(i, Field.body, body);
					if (item !== statement) {
						/** @type {JavascriptPrintContext} */ (writer).consume(item);
					}
				}
			}
		}
		if (!returns && returnsChain(body)) {
			const count = tree.fieldCount(Field.body, body);
			// The chain opens with the first statement printing.
			let first = 0;
			for (let i = 0; first === 0 && i < count; i++) {
				const item = tree.field(i, Field.body, body);
				if (!printsNothing(item)) first = item;
			}
			const wraps = leftIsObject(childOf(Field.test, first));
			if (wraps) output.print("(");
			for (let i = 0; i < count; i++) {
				const item = tree.field(i, Field.body, body);
				if (printsNothing(item)) {
					/** @type {JavascriptPrintContext} */ (writer).consume(item);
				} else {
					printNode(item);
				}
			}
			if (wraps) output.print(")");
		} else if (!returns) {
			printBraced(node, body);
		} else if (returned === 0) {
			output.print("{}");
		} else if (leftIsObject(returned)) {
			output.print("(");
			printNode(returned);
			output.print(")");
		} else {
			printNode(returned);
		}
		if (parenthesized) output.print(")");
	};

	/** @type {((node: number) => void)[]} */
	const generators = [];
	generators[NodeType.Program] = () => {
		if (commentTokens === null && leadingToken === 0) {
			if (programPrefix !== "") output.print(programPrefix);
		} else {
			// Nothing is printed before the program's comments, which its `#!`
			// line and `preamble` print with.
			output.atProgramStart = true;
			const taken = commentStream.claimPrependComments(current);
			output.atProgramStart = false;
			if (taken !== undefined) output.printPrependComments(taken);
		}
		displayBody(current);
		output.endProgram();
		if (commentTokens !== null) printCommentsAfter(current);
	};
	generators[NodeType.ExpressionStatement] = (node) => {
		// Its assignment prints in the statement after it.
		if (dropped[node] === 1) return;
		if (unreadStatements.size !== 0 && unreadStatements.has(node)) {
			printNode(childOf(Field.expression, node));
			return;
		}
		const directive = tree.textOf(Part.directive, node);
		const expression = childOf(Field.expression, node);
		if (compresses && branchForm() === CONDITIONAL_FORM) {
			// A branch of `?:` takes all but a sequence.
			printNode(expression, typeOf(expression) === NodeType.SequenceExpression);
			return;
		}
		if (directive !== null) {
			const value = /** @type {string} */ (tree.value(expression));
			if (directive !== value) {
				const quote = quoteOf(expression);
				const spelled = output.option("inline_script")
					? inlineScriptSpelling(directive)
					: directive;
				output.print(`${quote}${spelled}${quote}`);
			} else {
				output.print_string(value, quoteOf(expression));
			}
		} else {
			if (negatesCall(node)) output.print("!");
			printNode(expression);
		}
		output.semicolon();
	};
	generators[NodeType.BlockStatement] = (node) => {
		const parent = parentAt(0);
		if (
			compresses &&
			typeOf(parent) === NodeType.IfStatement &&
			tree.field(0, Field.alternate, parent) === node &&
			liftsElse(parent, parentAt(1), 1)
		) {
			displayBody(node);
			return;
		}
		// The branch a known test picks prints in the list holding its `if`.
		if (
			keptBranches.size !== 0 &&
			keptBranches.get(parent) === node &&
			(LISTS_STATEMENTS[typeOf(parentAt(1))] === 1 ||
				FUNCTION_TYPES[typeOf(parentAt(1))] === 1) &&
			!scopesLexically(node)
		) {
			displayBody(node);
			return;
		}
		// A body printing as the value its `if` returns prints as that value.
		if (compresses && chainsBranch(node, parent)) {
			const count = tree.fieldCount(Field.body, node);
			for (let i = 0; i < count; i++) {
				const item = tree.field(i, Field.body, node);
				if (printsNothing(item)) {
					/** @type {JavascriptPrintContext} */ (writer).consume(item);
				} else {
					printNode(item);
				}
			}
			return;
		}
		const statement = compresses ? unwrappedStatement(node, parent) : 0;
		if (statement !== 0) {
			const context = /** @type {JavascriptPrintContext} */ (writer);
			const count = tree.fieldCount(Field.body, node);
			for (let i = 0; i < count; i++) {
				const item = tree.field(i, Field.body, node);
				// One printing nothing, as a folded `if` may, is an empty statement.
				if (item === statement && context.get(item).length !== 0) {
					printNode(item);
				} else {
					context.consume(item);
					if (item === statement) output.print(";");
				}
			}
			return;
		}
		if (
			typeOf(parent) === NodeType.TryStatement &&
			tree.field(0, Field.finalizer, parent) === node
		) {
			output.print("finally");
			output.space();
		}
		printBraced(node, node);
	};
	generators[NodeType.StaticBlock] = (node) => {
		output.print("static");
		output.space();
		printBraced(node, node);
	};
	generators[NodeType.EmptyStatement] = () => {
		output.semicolon();
	};
	generators[NodeType.DebuggerStatement] = () => {
		output.print("debugger");
		output.semicolon();
	};
	generators[NodeType.LabeledStatement] = (node) => {
		printNode(tree.field(0, Field.label, node));
		output.colon();
		const body = tree.field(0, Field.body, node);
		if (typeOf(body) === NodeType.EmptyStatement) output.force_semicolon();
		else printNode(body);
	};
	generators[NodeType.DoWhileStatement] = (node) => {
		output.print("do");
		output.space();
		const loopBody = tree.field(0, Field.body, node);
		// Compressed, a body that is no block stays one statement, as read: an
		// empty one a `;` no line break may stand in for.
		if (compresses && typeOf(loopBody) === NodeType.EmptyStatement) {
			output.force_semicolon();
		} else if (compresses && typeOf(loopBody) !== NodeType.BlockStatement) {
			printNode(loopBody);
		} else {
			makeBlock(loopBody);
		}
		output.space();
		output.print("while");
		output.space();
		printParenthesized(childOf(Field.test, node));
		output.semicolon();
	};
	generators[NodeType.WhileStatement] = (node) => {
		const test = childOf(Field.test, node);
		if (
			compresses &&
			typeOf(test) === NodeType.Literal &&
			tree.value(test) === true &&
			!hasEdgeComments(test)
		) {
			// terser's `loops`: a loop forever is `for(;;)`.
			skipNode(test);
			output.print("for(;;)");
			printMaybeBracedBody(tree.field(0, Field.body, node));
			return;
		}
		output.print("while");
		output.space();
		printParenthesized(childOf(Field.test, node));
		output.space();
		printMaybeBracedBody(tree.field(0, Field.body, node));
	};
	generators[NodeType.ForStatement] = (node) => {
		const init = childOf(Field.init, node);
		const test = childOf(Field.test, node);
		const update = childOf(Field.update, node);
		output.print("for");
		output.space();
		output.print("(");
		if (init !== 0) {
			printNode(init);
			output.print(";");
			output.space();
		} else {
			output.print(";");
		}
		if (test !== 0) {
			printNode(test);
			output.print(";");
			output.space();
		} else {
			output.print(";");
		}
		if (update !== 0) printNode(update);
		output.print(")");
		output.space();
		printMaybeBracedBody(tree.field(0, Field.body, node));
	};
	generators[NodeType.ForInStatement] = generators[NodeType.ForOfStatement] = (
		node
	) => {
		output.print("for");
		if (tree.flag(Flag.await, node)) {
			output.space();
			output.print("await");
		}
		output.space();
		output.print("(");
		printNode(childOf(Field.left, node));
		output.space();
		output.print(typeOf(node) === NodeType.ForOfStatement ? "of" : "in");
		output.space();
		printNode(childOf(Field.right, node));
		output.print(")");
		output.space();
		printMaybeBracedBody(tree.field(0, Field.body, node));
	};
	generators[NodeType.WithStatement] = (node) => {
		output.print("with");
		output.space();
		printParenthesized(childOf(Field.object, node));
		output.space();
		printMaybeBracedBody(tree.field(0, Field.body, node));
	};
	generators[NodeType.ReturnStatement] = (node) => {
		if (compresses) {
			// Read after the form of the `if` holding it, which pairs an `else`.
			const branch = branchForm();
			const pair = returnedBy.size === 0 ? undefined : returnedBy.get(node);
			if (
				(pair !== undefined && ifForm(pair) === RETURN_FORM) ||
				branch === RETURN_FORM
			) {
				const argument = childOf(Field.argument, node);
				// An `if` folding its booleans printed the value.
				if (pair !== undefined && foldedReturn(pair) === node) {
					skipNode(argument);
				} else {
					printNode(argument, typeOf(argument) === NodeType.SequenceExpression);
				}
				// The `return` after the `if` ends the statement.
				if (pair !== undefined && !inReturnsChain(-1)) output.semicolon();
				return;
			}
		}
		printExit(node, "return");
	};
	generators[NodeType.ThrowStatement] = (node) => {
		printExit(node, "throw");
	};
	generators[NodeType.BreakStatement] = (node) => {
		printLoopControl(node, "break");
	};
	generators[NodeType.ContinueStatement] = (node) => {
		printLoopControl(node, "continue");
	};
	generators[NodeType.IfStatement] = (node) => {
		if (unreadStatements.size !== 0 && unreadStatements.has(node)) {
			// What it returns goes unread: its test runs, then the call ends.
			printNode(childOf(Field.test, node));
			skipNode(tree.field(0, Field.consequent, node));
			return;
		}
		const kept = keptBranches.size === 0 ? undefined : keptBranches.get(node);
		if (kept !== undefined) {
			const context = /** @type {JavascriptPrintContext} */ (writer);
			context.consume(childOf(Field.test, node));
			const consequent = tree.field(0, Field.consequent, node);
			const alternate = tree.field(0, Field.alternate, node);
			if (consequent !== kept) context.consume(consequent);
			if (alternate !== 0 && alternate !== kept) context.consume(alternate);
			printMaybeBracedBody(kept);
			return;
		}
		const form = compresses ? ifForm(node) : 0;
		if (form !== 0) {
			printIfExpression(node, form);
			return;
		}
		const merged = compresses && node < foundSize ? mergedExits[node] : 0;
		if (merged !== 0) {
			// The `if`s next to it leaving alike print as one, testing each.
			const test = childOf(Field.test, node);
			if ((merged & 2) === 0) output.print("if(");
			printNode(
				test,
				bindsLooser(test) ||
					(typeOf(test) === NodeType.LogicalExpression &&
						tree.textOf(Part.operator, test) === "??")
			);
			if ((merged & 1) !== 0) {
				output.print("||");
				/** @type {JavascriptPrintContext} */ (writer).consume(
					tree.field(0, Field.consequent, node)
				);
			} else {
				output.print(")");
				printMaybeBracedBody(tree.field(0, Field.consequent, node));
			}
			return;
		}
		const alternate = tree.field(0, Field.alternate, node);
		output.print("if");
		output.space();
		printParenthesized(childOf(Field.test, node));
		output.space();
		if (alternate === 0) {
			printMaybeBracedBody(tree.field(0, Field.consequent, node));
			return;
		}
		if (compresses && liftsElse(node, parentAt(0), 0)) {
			printMaybeBracedBody(tree.field(0, Field.consequent, node));
			// A bare `return` ending its function goes, as the function ends there.
			if (endsFunctionLast(node, alternate)) skipNode(alternate);
			else printNode(alternate);
			return;
		}
		makeThen(node);
		output.space();
		output.print("else");
		output.space();
		if (typeOf(alternate) === NodeType.IfStatement) printNode(alternate);
		else printMaybeBracedBody(alternate);
	};
	generators[NodeType.SwitchStatement] = (node) => {
		const count = tree.fieldCount(Field.cases, node);
		output.print("switch");
		output.space();
		printParenthesized(childOf(Field.discriminant, node));
		output.space();
		if (count === 0) {
			printBracedEmpty(node);
			return;
		}
		output.print("{");
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.cases, node);
			if (i === count - 1 && i > 0 && compresses && doesNothing(item)) {
				/** @type {JavascriptPrintContext} */ (writer).consume(item);
			} else {
				if (beautifies) output.print("\n");
				printNode(item);
			}
		}
		if (beautifies) output.print("\n");
		output.print("}");
	};
	generators[NodeType.SwitchCase] = (node) => {
		const test = childOf(Field.test, node);
		if (test !== 0) {
			output.print("case");
			output.space();
			printNode(test);
			output.print(":");
		} else {
			output.print("default:");
		}
		const count = tree.fieldCount(Field.consequent, node);
		const last = count > 0 && compresses && endsSwitch(node) ? count - 1 : -1;
		for (let i = 0; i < count; i++) {
			const statement = tree.field(i, Field.consequent, node);
			if (i === last && isPlainBreak(statement)) {
				/** @type {JavascriptPrintContext} */ (writer).consume(statement);
			} else {
				if (beautifies) output.print("\n");
				printNode(statement);
			}
		}
	};
	generators[NodeType.TryStatement] = (node) => {
		output.print("try");
		output.space();
		printNode(tree.field(0, Field.block, node));
		const handler = tree.field(0, Field.handler, node);
		if (handler !== 0) {
			output.space();
			printNode(handler);
		}
		const finalizer = tree.field(0, Field.finalizer, node);
		if (finalizer !== 0) {
			output.space();
			printNode(finalizer);
		}
	};
	generators[NodeType.CatchClause] = (node) => {
		output.print("catch");
		const param = tree.field(0, Field.param, node);
		if (param !== 0) {
			output.space();
			printParenthesized(param);
		}
		output.space();
		printBraced(node, tree.field(0, Field.body, node));
	};
	generators[NodeType.VariableDeclaration] = (node) => {
		const count = tree.fieldCount(Field.declarations, node);
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		const isLoopHead =
			parentType === NodeType.ForStatement
				? childOf(Field.init, parent) === node
				: isForInType(parentType) && childOf(Field.left, parent) === node;
		const kind = kindOf(node, parentType === NodeType.ExportNamedDeclaration);
		// Declarators printed since the keyword, -1 while none is open.
		let listed = -1;
		let printed = 0;
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, node);
			// One declarator is kept where all go but the statement stays.
			if (
				!isLoopHead &&
				dropsDeclarator(declarator) &&
				(keepsEffect[declarator] === 1 || printed > 0 || i < count - 1)
			) {
				if (keepsOwnEffect(declarator)) {
					if (listed !== -1) output.semicolon();
					listed = -1;
					printed++;
					printNode(declarator);
					output.semicolon();
				} else {
					/** @type {JavascriptPrintContext} */ (writer).consume(declarator);
				}
				continue;
			}
			if (listed === -1) {
				output.print(kind);
				output.space();
				listed = 0;
			}
			if (listed++) output.comma();
			printed++;
			printNode(declarator);
		}
		if (!isLoopHead && listed !== -1) output.semicolon();
	};
	generators[NodeType.VariableDeclarator] = (node) => {
		// Its value prints where its one read is.
		if (aliasesRead[node] === 3) return;
		const init = childOf(Field.init, node);
		if (dropped[node] === 1 && keepsEffect[node] === 1) {
			// Its value alone, a statement of its own.
			printNode(init);
			return;
		}
		printNode(tree.field(0, Field.id, node));
		if (init === 0) return;
		const read = movedReads.size === 0 ? undefined : movedReads.get(init);
		if (read !== undefined) {
			movedTexts.set(read, [
				/** @type {JavascriptPrintContext} */ (writer).consume(init),
				heads[init],
				tails[init],
				init
			]);
			return;
		}
		if (compresses && setsUndefinedAnew(node, init)) {
			skipNode(init);
			return;
		}
		output.space();
		output.print("=");
		output.space();
		printNode(init);
	};
	generators[NodeType.ImportDeclaration] = (node) => {
		const count = tree.fieldCount(Field.specifiers, node);
		const first = tree.field(0, Field.specifiers, node);
		const hasDefault =
			first !== 0 && typeOf(first) === NodeType.ImportDefaultSpecifier;
		const named = hasDefault ? count - 1 : count;
		output.print("import");
		output.space();
		const phase = tree.textOf(Part.phase, node);
		if (phase) {
			output.print(phase);
			output.space();
		}
		if (hasDefault) printNode(tree.field(0, Field.local, first));
		if (named > 0) {
			if (hasDefault) {
				output.print(",");
				output.space();
			}
			const firstNamed = tree.field(hasDefault ? 1 : 0, Field.specifiers, node);
			if (typeOf(firstNamed) === NodeType.ImportNamespaceSpecifier) {
				printNode(firstNamed);
			} else {
				printSpecifiers(node, hasDefault ? 1 : 0);
			}
		}
		if (hasDefault || named > 0) {
			output.space();
			output.print("from");
			output.space();
		}
		printNode(tree.field(0, Field.source, node));
		printAttributes(node);
		output.semicolon();
	};
	generators[NodeType.ImportSpecifier] = (node) => {
		printNameMapping(
			tree.field(0, Field.local, node),
			tree.field(0, Field.imported, node),
			true
		);
	};
	generators[NodeType.ImportNamespaceSpecifier] = (node) => {
		output.print("*");
		output.space();
		output.print("as");
		output.space();
		printNode(tree.field(0, Field.local, node));
	};
	generators[NodeType.ExportSpecifier] = (node) => {
		printNameMapping(
			tree.field(0, Field.local, node),
			tree.field(0, Field.exported, node),
			false
		);
	};
	generators[NodeType.ExportNamedDeclaration] = (node) => {
		output.print("export");
		output.space();
		const declaration = tree.field(0, Field.declaration, node);
		if (declaration !== 0) {
			printNode(declaration);
			return;
		}
		printSpecifiers(node, 0);
		printSource(node);
	};
	generators[NodeType.ExportAllDeclaration] = (node) => {
		output.print("export");
		output.space();
		output.print("*");
		const exported = tree.field(0, Field.exported, node);
		if (exported !== 0) {
			output.space();
			output.print("as");
			output.space();
			printForeignName(exported);
		}
		printSource(node);
	};
	generators[NodeType.ExportDefaultDeclaration] = (node) => {
		const declaration = childOf(Field.declaration, node);
		const type = typeOf(declaration);
		output.print("export");
		output.space();
		output.print("default");
		output.space();
		if (exportDefaultWraps(node)) {
			printNode(declaration, true);
			output.semicolon();
			return;
		}
		printNode(declaration);
		if (
			!isClassType(type) &&
			type !== NodeType.FunctionExpression &&
			type !== NodeType.FunctionDeclaration
		) {
			output.semicolon();
		}
	};
	generators[NodeType.Identifier] = (node) => {
		if (collapsed.size !== 0 && collapsed.has(node)) {
			printCollapsed(node);
			return;
		}
		if (isMovedRead(node)) {
			printMoved(node, parentAt(0));
			return;
		}
		if (isInlinedRead(node)) {
			printConstant(node, takesUnary(node));
			return;
		}
		// `delete` of a global's name is false, of any other value true.
		const deleted =
			typeOf(parentAt(0)) === NodeType.UnaryExpression &&
			tree.textOf(Part.operator, parentAt(0)) === "delete";
		if (compresses && !deleted && readsUndefined(node)) {
			// `void 0` is shorter, and no scope can rebind it.
			output.print("void 0");
			return;
		}
		if (
			compresses &&
			!deleted &&
			readsAsValue(node, parentAt(0)) &&
			printsInfinity(node)
		) {
			return;
		}
		output.print_name(nameOf(node));
	};
	generators[NodeType.PrivateIdentifier] = (node) => {
		output.print(`#${privateNameOf(node)}`);
	};
	generators[NodeType.Literal] = (node) => {
		let value = tree.value(node);
		if (renamedStrings !== null && renamedStrings.has(node)) {
			value = /** @type {PropertyNames} */ (renamedProperties).mangle(
				/** @type {string} */ (value)
			);
		}
		if (typeof value === "boolean" && compresses && takesUnary(node)) {
			// terser's `booleans`: `!0` and `!1` are shorter and gzip alike.
			output.print(value ? "!0" : "!1");
			return;
		}
		if (typeof value === "string") {
			const template =
				rawLineBreaks && value.includes("\n") && takesTemplate(node)
					? lineBreakTemplate(output, value, writesTabsRaw(value))
					: undefined;
			if (template !== undefined) {
				output.print(template);
			} else if (inDirective(node)) {
				const encoded = output.encode_string(value, quoteOf(node));
				if (!encoded.includes("\\")) {
					// Semicolons break the directive prologue: one after the text
					// before, which is a statement unless the body opens here.
					if (!opensBody(parentAt(0))) output.print(";");
					output.print(";");
				}
				output.print(encoded);
			} else if (writesBackticks && takesBacktick(node, parentAt(0))) {
				printStringValue(value);
			} else {
				output.print_string(value, quoteOf(node));
			}
			return;
		}
		const raw = tree.textOf(Part.raw, node);
		if (typeof value === "number") {
			output.print(
				(output.option("keep_numbers") || usesAsm(node)) && raw
					? raw
					: makeNum(value)
			);
			output.literalLast = true;
		} else if (typeof value === "bigint") {
			const digits = /** @type {string} */ (raw).slice(0, -1).replace(/_/g, "");
			output.print(output.option("keep_numbers") && raw ? raw : `${digits}n`);
		} else if (raw !== null && raw.charCodeAt(0) === 47) {
			printRegExp(node);
			output.literalLast = true;
		} else {
			output.print(String(value));
		}
	};
	/**
	 * terser's `expect_directive` before a statement: whether what is printed
	 * before it in its body ends in `;` or `{`, or nothing is.
	 * @param {number} statement a statement
	 * @returns {boolean} true where a directive may open there
	 */
	const opensBody = (statement) => {
		const owner = parentAt(1);
		const body = bodyOf(owner);
		for (let i = 0; ; i++) {
			const other = tree.field(i, Field.body, body);
			if (other === statement) break;
			if (typeOf(other) !== NodeType.EmptyStatement) return false;
		}
		const comment = lastCommentBefore(owner, body, statement);
		if (comment !== undefined) {
			return /[;{]$/.test(comment.replace(/[ \n]+$/, ""));
		}
		if (tree.type(owner) !== NodeType.Program) return true;
		const before = programPrefix.replace(/[ \n]+$/, "");
		return before === "" || /[;{]$/.test(before);
	};

	/**
	 * The last comment printed in a body before a statement, which comes
	 * before it in the source: the body holds nothing printed but empty ones.
	 * @param {number} owner the program, or what a function body is the body of
	 * @param {number} body the node listing the statements
	 * @param {number} statement the statement
	 * @returns {string | undefined} the comment as printed, undefined for none
	 */
	const lastCommentBefore = (owner, body, statement) => {
		const isProgram = tree.type(owner) === NodeType.Program;
		let from = 0;
		let to = 0;
		if (commentTokens !== null) {
			from = isProgram
				? commentTokens.starts[owner]
				: commentTokens.starts[body] + 1;
			to = commentTokens.starts[statement];
		} else if (isProgram && leadingToken !== 0) {
			from = leadingToken;
			to = leadingToken;
		}
		/** @type {string | undefined} */
		let printed;
		for (let token = from; token !== 0 && token <= to; token++) {
			const comments = output.tokenTables.commentsOf(token, false);
			if (comments === undefined) continue;
			for (const comment of comments) {
				const node = /** @type {PrintNode | number} */ (statement);
				if (
					!output.commentFilter.call(/** @type {PrintNode} */ (node), comment)
				) {
					continue;
				}
				const value = output.filterComment(comment.value);
				if (value === "") continue;
				if (/comment[134]/.test(comment.type)) printed = `//${value}`;
				else if (comment.type === "comment2") printed = `/*${value}*/`;
			}
		}
		return printed;
	};
	generators[NodeType.ThisExpression] = () => {
		output.print("this");
	};
	generators[NodeType.Super] = () => {
		output.print("super");
	};
	generators[NodeType.MetaProperty] = (node) => {
		output.print(
			tree.name(tree.field(0, Field.meta, node)) === "import"
				? "import.meta"
				: "new.target"
		);
	};
	generators[NodeType.ArrayExpression] = (node) => {
		const count = tree.fieldCount(Field.elements, node);
		const parent = parentAt(0);
		const enumeration =
			typeOf(parent) === NodeType.CallExpression &&
			itemOf(0, Field.arguments, parent) === node
				? enumerationOf(parent)
				: undefined;
		if (
			typeOf(parent) === NodeType.MemberExpression &&
			childOf(Field.object, parent) === node
		) {
			const element = pickedElement(parent, 1);
			if (element !== 0) {
				for (let i = 0; i < count; i++) {
					const other = itemOf(i, Field.elements, node);
					if (other === element) printNode(other);
					else if (other !== 0) skipNode(other);
				}
				return;
			}
		}
		if (enumeration !== undefined) {
			// What `Object.keys`, `values` or `entries` makes of it, holes left out.
			output.print("[");
			let first = true;
			for (let i = 0; i < count; i++) {
				const element = itemOf(i, Field.elements, node);
				if (element === 0) continue;
				if (!first) output.comma();
				first = false;
				if (enumeration === "entries") output.print("[");
				if (enumeration !== "values") printStringValue(`${i}`);
				if (enumeration === "entries") output.comma();
				if (enumeration === "keys") skipNode(element);
				else printNode(element);
				if (enumeration === "entries") output.print("]");
			}
			output.print("]");
			return;
		}
		if (
			splitsArrays &&
			count >= SPLIT_MIN_ELEMENTS &&
			printsSplit(node, count)
		) {
			return;
		}
		output.print("[");
		if (count > 0) output.space();
		printElements(node, Field.elements);
		if (count > 0) output.space();
		output.print("]");
	};
	/**
	 * Prints an array of strings as one string split, as the default
	 * minifier's `splitStringArray` does, where a delimiter none holds is free.
	 * @param {number} node the array
	 * @param {number} count its elements
	 * @returns {boolean} whether it printed so
	 */
	const printsSplit = (node, count) => {
		/** @type {string[]} */
		const values = [];
		let single = true;
		for (let i = 0; i < count; i++) {
			const element = itemOf(i, Field.elements, node);
			if (typeOf(element) !== NodeType.Literal || hasEdgeComments(element)) {
				return false;
			}
			const value = tree.value(element);
			if (typeof value !== "string") return false;
			if (value.length !== 1) single = false;
			values.push(value);
		}
		const delimiter = single
			? ""
			: SPLIT_DELIMITERS.find((candidate) =>
					values.every((value) => !value.includes(candidate))
				);
		if (delimiter === undefined) return false;
		for (let i = 0; i < count; i++) skipNode(itemOf(i, Field.elements, node));
		printValue(values.join(delimiter), false);
		output.print(".split(");
		printValue(delimiter, false);
		output.print(")");
		return true;
	};
	generators[NodeType.ArrayPattern] = (node) => {
		output.print("[");
		printElements(node, Field.elements);
		output.print("]");
	};
	generators[NodeType.ObjectPattern] = (node) => {
		output.print("{");
		printElements(node, Field.properties);
		output.print("}");
	};
	generators[NodeType.ObjectExpression] = (node) => {
		const count = tree.fieldCount(Field.properties, node);
		if (count === 0) {
			printBracedEmpty(node);
			return;
		}
		output.print("{");
		for (let i = 0; i < count; i++) {
			if (i) output.comma();
			printNode(tree.field(i, Field.properties, node));
		}
		output.print("}");
	};
	generators[NodeType.Property] = (node) => {
		const keyValue = isKeyValue(node);
		const key = childOf(Field.key, node);
		const parent = parentAt(0);
		if (
			!keyValue ||
			tree.flag(Flag.computed, node) ||
			printedKeyOf(node, key) !== "__proto__" ||
			typeOf(parent) !== NodeType.ObjectExpression
		) {
			if (keyValue) printKeyValue(node);
			else printMethod(node, methodKeyword(node));
			return;
		}
		const value = childOf(Field.value, node);
		const asShorthand =
			tree.type(value) === NodeType.Identifier &&
			tree.name(value) === "__proto__" &&
			output.option("shorthand");
		if (tree.flag(Flag.shorthand, node)) {
			if (asShorthand && printsAs(value, "__proto__")) {
				output.print_name("__proto__");
			} else {
				output.with_square(() => output.print_string("__proto__"));
				output.colon();
				printNode(value);
			}
			return;
		}
		if (!asShorthand) {
			printKeyValue(node);
			return;
		}
		output.print_name("__proto__");
		output.colon();
		printNode(value);
	};
	generators[NodeType.MethodDefinition] = (node) => {
		printMethod(node, methodKeyword(node));
	};
	generators[NodeType.PropertyDefinition] = (node) => {
		if (tree.flag(Flag.static, node)) {
			output.print("static");
			output.space();
		}
		const key = childOf(Field.key, node);
		if (tree.type(key) === NodeType.PrivateIdentifier) {
			output.print("#");
			output.print_name(privateNameOf(key));
		} else if (tree.flag(Flag.computed, node)) {
			printComputedKey(node, key);
		} else {
			printPropertyName(printedKeyOf(node, key), keyQuoteOf(node), output);
		}
		const value = childOf(Field.value, node);
		if (value !== 0) {
			output.print("=");
			printNode(value);
		}
		output.semicolon();
	};
	generators[NodeType.SpreadElement] = generators[NodeType.RestElement] = (
		node
	) => {
		output.print("...");
		printNode(childOf(Field.argument, node));
	};
	generators[NodeType.AssignmentPattern] = printBinary;
	generators[NodeType.AssignmentExpression] = (node) => {
		if (
			compresses &&
			hoistingHolder(
				typeOf(parentAt(0)) === NodeType.ExpressionStatement ? 0 : -1
			) !== 0
		) {
			// The chain it ends a branch of assigns, once, before its test.
			skipNode(childOf(Field.left, node));
			printNode(childOf(Field.right, node));
			return;
		}
		if (dropsWrite[node] !== 1) {
			printBinary(node);
			return;
		}
		// Nothing reads the name it sets: only its value runs.
		const value = childOf(Field.right, node);
		skipNode(childOf(Field.left, node));
		printNode(value, opensAmbiguously(value));
	};
	generators[NodeType.LogicalExpression] = (node) => {
		if (dropsDeadCode && printsFolded(node, foldedOperand(node))) return;
		const name = compresses ? comparedWithNull(node) : 0;
		if (name === 0) {
			printBinary(node);
			return;
		}
		// terser's `comparisons`: `==` takes null and undefined alike.
		const context = /** @type {JavascriptPrintContext} */ (writer);
		context.consume(childOf(Field.left, node));
		context.consume(childOf(Field.right, node));
		output.print_name(nameOf(name));
		output.print(
			tree.textOf(Part.operator, node) === "||" ? "==null" : "!=null"
		);
	};
	generators[NodeType.BinaryExpression] = (node) => {
		const operator = tree.textOf(Part.operator, node);
		if (isPrivateIn(node)) {
			printNode(tree.field(0, Field.left, node));
			output.space();
			output.print("in");
			output.space();
			printNode(childOf(Field.right, node));
			return;
		}
		if (compresses && operator !== "in" && operator !== "instanceof") {
			const left = childOf(Field.left, node);
			const right = childOf(Field.right, node);
			const parent = parentAt(0);
			// A `+` of a literal adding to a string below another prints only
			// what it adds to: the last of their run prints their literals joined.
			if (
				addedLiteral(parent) !== undefined &&
				childOf(Field.left, parent) === node &&
				addsToString(node)
			) {
				printNode(left);
				skipNode(right);
				return;
			}
			const folded = binaryFolded(node);
			if (folded !== undefined) {
				skipNode(left);
				skipNode(right);
				printValue(folded, takesUnary(node));
				return;
			}
			if (addsToString(node) && addsToString(left)) {
				printNode(left);
				skipNode(right);
				output.print("+");
				printValue(joinedLiterals(node), false);
				return;
			}
			// Strings compare the same loosely, terser's `comparisons`.
			const printed =
				(operator === "===" || operator === "!==") &&
				isStringValue(left) &&
				isStringValue(right)
					? operator === "==="
						? "=="
						: "!="
					: /** @type {string} */ (operator);
			const tested = typeofUndefined(printed, left, right);
			if (tested !== 0) {
				// Every other `typeof` sorts before "u", "undefined" after it.
				printNode(tested);
				skipNode(tested === left ? right : left);
				output.print(printed.charCodeAt(0) === 33 ? '<"u"' : '>"u"');
				output.literalLast = false;
			} else if (
				(printed === "==" || printed === "!=") &&
				!hasEdgeComments(right) &&
				isUndefinedValue(right)
			) {
				// `undefined` and `null` are loosely equal, and `null` is shorter.
				printNode(left);
				skipNode(right);
				output.print(printed);
				output.print("null");
			} else if (
				(printed === "==" || printed === "!=") &&
				booleanOf(right) !== undefined
			) {
				// terser's `booleans`: `==` reads a boolean as its number.
				printNode(left);
				output.print(printed);
				output.print(booleanOf(right) ? "1" : "0");
				skipNode(right);
			} else if (constantGoesFirst(printed, left, right)) {
				printNode(right);
				output.print(printed);
				printNode(left);
			} else {
				printBinary(node, printed);
			}
			return;
		}
		if (operator !== "in" && operator !== "instanceof") {
			printBinary(node);
			return;
		}
		printNode(childOf(Field.left, node));
		// A number or regular expression ending in `.` or `/` would take the
		// operator for its fraction or flags, however deep in the left side.
		if (
			output.literalLast &&
			(output.lastCode === 47 || output.lastCode === 46)
		) {
			output.print(" ");
		} else {
			output.space();
		}
		output.print(/** @type {string} */ (operator));
		output.space();
		printNode(childOf(Field.right, node));
	};
	generators[NodeType.UnaryExpression] = printUnary;
	generators[NodeType.UpdateExpression] = printUnary;
	generators[NodeType.ConditionalExpression] = (node) => {
		if (dropsDeadCode && printsFolded(node, foldedBranch(node))) return;
		const test = childOf(Field.test, node);
		if (compresses) printHoistedHead(node);
		if (compresses) {
			const consequent = childOf(Field.consequent, node);
			const alternate = childOf(Field.alternate, node);
			const value = booleanOf(consequent);
			if (value !== undefined && booleanOf(alternate) === !value) {
				// terser's `booleans`: `c ? true : false` is `!!c`, `!c` swapped.
				skipNode(consequent);
				skipNode(alternate);
				const negates = !value ? "!" : readsTruth(node) ? "" : "!!";
				output.print(negates);
				printNode(test, negates !== "" && !NEGATES_BARE[typeOf(test)]);
				return;
			}
			if (printsLogical(node, test, consequent, alternate)) return;
			if (branchesAlike(node, consequent, alternate)) {
				// terser's `x ? y : y`: the test, where it runs anything, then `y`.
				const sequence = !dropsSideEffectFree || !isPureValue(test);
				// Where its place parenthesizes a conditional, that holds the sequence.
				const wrap =
					sequence &&
					!takesSequence(node, parentAt(0)) &&
					!needsParens(node, 0);
				if (wrap) output.print("(");
				if (sequence) {
					printNode(test);
					output.comma();
				} else {
					skipNode(test);
				}
				skipNode(alternate);
				printNode(consequent);
				if (wrap) output.print(")");
				return;
			}
		}
		printNode(test);
		output.space();
		output.print("?");
		output.space();
		printNode(childOf(Field.consequent, node));
		output.space();
		output.colon();
		printNode(childOf(Field.alternate, node));
	};
	/**
	 * terser's conditional to logical: `a ? false : x` prints `!a && x`, and
	 * where only its truth is read `a ? true : x` prints `a || x`, `a ? x :
	 * false` prints `a && x` and `a ? x : true` prints `!a || x`.
	 * @param {number} node a conditional
	 * @param {number} test its test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} true where it printed so
	 */
	const printsLogical = (node, test, consequent, alternate) => {
		let value = booleanOf(consequent);
		let other = alternate;
		let first = consequent;
		if (value === undefined || (value && !readsTruth(node))) {
			if (!readsTruth(node)) return false;
			value = booleanOf(alternate);
			if (value === undefined) return false;
			// `a ? x : false` is `a && x`, `a ? x : true` is `!a || x`.
			value = !value;
			other = consequent;
			first = alternate;
		} else {
			// `a ? false : x` is `!a && x`, `a ? true : x` is `a || x`.
			value = !value;
		}
		const negates = value === (first === consequent);
		const operator = value ? "&&" : "||";
		if (
			!joinsLogical(test, operator, negates) ||
			!joinsLogical(other, operator, false)
		) {
			return false;
		}
		if (negates) output.print("!");
		printNode(test, negates && !NEGATES_BARE[typeOf(test)]);
		output.print(operator);
		skipNode(first);
		printNode(other);
		return true;
	};

	/**
	 * @param {number} node an operand
	 * @param {string} operator `&&` or `||`
	 * @param {boolean} negated whether it prints under `!`
	 * @returns {boolean} whether it prints bare as an operand of the operator
	 */
	const joinsLogical = (node, operator, negated) => {
		if (hasEdgeComments(node)) return false;
		const type = typeOf(node);
		if (NEGATES_BARE[type]) return true;
		if (negated) return type === NodeType.BinaryExpression;
		switch (type) {
			case NodeType.BinaryExpression:
			case NodeType.NewExpression:
				return true;
			case NodeType.LogicalExpression: {
				const own = operatorOf(node);
				return own === "&&" || own === operator;
			}
			default:
				return false;
		}
	};

	/**
	 * Whether a conditional's branches print alike, as a call, member, name,
	 * `this` or literal, where its own place reads no reference of it: no
	 * call takes its `this` from it, nor `delete` or `typeof` its reference.
	 * @param {number} node a conditional
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} true where it prints as one of them
	 */
	const branchesAlike = (node, consequent, alternate) => {
		switch (typeOf(consequent)) {
			case NodeType.CallExpression:
			case NodeType.MemberExpression:
			case NodeType.Identifier:
			case NodeType.ThisExpression:
			case NodeType.Literal:
				break;
			default:
				return false;
		}
		if (hasEdgeComments(consequent) || hasEdgeComments(alternate)) {
			return false;
		}
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		if (
			(isCallType(parentType) && childOf(Field.callee, parent) === node) ||
			parentType === NodeType.TaggedTemplateExpression ||
			(parentType === NodeType.UnaryExpression &&
				(tree.textOf(Part.operator, parent) === "delete" ||
					tree.textOf(Part.operator, parent) === "typeof")) ||
			(opensAmbiguously(consequent) && firstInStatement(node, 0, true))
		) {
			return false;
		}
		const text = /** @type {JavascriptPrintContext} */ (writer).get(consequent);
		return (
			text !== undefined &&
			text === /** @type {JavascriptPrintContext} */ (writer).get(alternate)
		);
	};

	/**
	 * @param {number} node an expression
	 * @param {number} parent its parent
	 * @returns {boolean} whether a sequence printed in its place needs no parentheses
	 */
	const takesSequence = (node, parent) => {
		switch (typeOf(parent)) {
			case NodeType.ExpressionStatement:
				return childOf(Field.expression, parent) === node;
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
				return true;
			case NodeType.SequenceExpression:
				return true;
			default:
				return false;
		}
	};
	generators[NodeType.SequenceExpression] = (node) => {
		const count = tree.fieldCount(Field.expressions, node);
		if (constructsPastSequence(node)) {
			for (let i = 0; i < count - 1; i++) {
				skipNode(itemOf(i, Field.expressions, node));
			}
			printNode(itemOf(count - 1, Field.expressions, node));
			return;
		}
		for (let i = 0; i < count; i++) {
			if (i > 0) output.comma();
			printNode(itemOf(i, Field.expressions, node));
		}
	};
	generators[NodeType.CallExpression] = printCall;
	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is a name, `this` or a member of one, reading no call, which `new` takes without parentheses
	 */
	const isNewTarget = (node) => {
		switch (typeOf(node)) {
			case NodeType.Identifier:
			case NodeType.ThisExpression:
				return true;
			case NodeType.MemberExpression:
				return (
					!tree.flag(Flag.optional, node) &&
					isNewTarget(childOf(Field.object, node))
				);
			default:
				return false;
		}
	};

	/**
	 * @param {number} node a sequence
	 * @returns {boolean} whether it is what a `new` constructs and prints as its last value, the others running nothing, as `new` reads no `this` from it
	 */
	const constructsPastSequence = (node) => {
		const parent = parentAt(0);
		if (
			!compresses ||
			typeOf(parent) !== NodeType.NewExpression ||
			childOf(Field.callee, parent) !== node ||
			hasEdgeComments(node) ||
			(reducedCalls.size !== 0 && reducedCalls.has(parent))
		) {
			return false;
		}
		const count = tree.fieldCount(Field.expressions, node);
		const last = itemOf(count - 1, Field.expressions, node);
		if (!isNewTarget(last) || hasEdgeComments(last)) return false;
		for (let i = 0; i < count - 1; i++) {
			if (!isPureValue(itemOf(i, Field.expressions, node))) return false;
		}
		return true;
	};

	generators[NodeType.NewExpression] = (node) => {
		if (writesLets && constructsWhenCalled(node)) {
			printNode(childOf(Field.callee, node));
			printArguments(node, Field.arguments);
			return;
		}
		output.print("new");
		output.space();
		printCall(node);
	};
	generators[NodeType.ImportExpression] = (node) => {
		const phase = tree.textOf(Part.phase, node);
		output.print(phase ? `import.${phase}(` : "import(");
		printNode(childOf(Field.source, node));
		const options = childOf(Field.options, node);
		if (options !== 0) {
			output.comma();
			printNode(options);
		}
		output.print(")");
	};
	generators[NodeType.ChainExpression] = (node) => {
		printNode(childOf(Field.expression, node));
	};
	/**
	 * @param {number} node a member being printed
	 * @param {number=} level the parent level of what holds it
	 * @returns {boolean} whether an assignment, update or pattern writes it, which no value may stand for
	 */
	const isWriteTarget = (node, level = 0) => {
		const parent = parentAt(level);
		switch (typeOf(parent)) {
			case NodeType.UpdateExpression:
			case NodeType.ArrayPattern:
			case NodeType.RestElement:
				return true;
			case NodeType.AssignmentExpression:
			case NodeType.AssignmentPattern:
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
				return childOf(Field.left, parent) === node;
			case NodeType.Property:
				return (
					typeOf(parentAt(level + 1)) === NodeType.ObjectPattern &&
					childOf(Field.value, parent) === node
				);
			default:
				return false;
		}
	};

	/**
	 * terser's `properties` of an array read at a known index: `[a, b][1]`
	 * prints `b`, where the others run nothing and `b` needs no parentheses
	 * in the member's place, nor takes its `this` from the array.
	 * @param {number} member a member expression being printed
	 * @param {number} level the parent level of what holds the member
	 * @returns {number} the element it prints as, 0 for none
	 */
	const pickedElement = (member, level) => {
		if (
			!compresses ||
			!tree.flag(Flag.computed, member) ||
			tree.flag(Flag.optional, member)
		) {
			return 0;
		}
		const array = childOf(Field.object, member);
		const property = childOf(Field.property, member);
		if (
			typeOf(array) !== NodeType.ArrayExpression ||
			holdsComments(array) ||
			hasEdgeComments(property)
		) {
			return 0;
		}
		const index =
			typeOf(property) === NodeType.Literal
				? tree.value(property)
				: valueAtPrint(property);
		const count = tree.fieldCount(Field.elements, array);
		if (
			typeof index !== "number" ||
			!Number.isInteger(index) ||
			index < 0 ||
			index >= count
		) {
			return 0;
		}
		const element = itemOf(index, Field.elements, array);
		const parent = parentAt(level);
		const parentType = typeOf(parent);
		switch (typeOf(element)) {
			case NodeType.Identifier:
				// `let[` opens a declaration.
				if (tree.name(element) === "let") return 0;
				break;
			case NodeType.Literal:
				// `1.x` reads a number's fraction.
				if (isNumber(element) && parentType === NodeType.MemberExpression) {
					return 0;
				}
				break;
			case NodeType.CallExpression:
				// `new [f()][0].g` would call `f` as what `new` makes.
				if (parentType === NodeType.MemberExpression) return 0;
				break;
			case NodeType.ThisExpression:
			case NodeType.MemberExpression:
			case NodeType.ArrayExpression:
			case NodeType.TemplateLiteral:
				break;
			default:
				return 0;
		}
		for (let i = 0; i < count; i++) {
			const other = itemOf(i, Field.elements, array);
			if (
				i !== index &&
				other !== 0 &&
				(typeOf(other) === NodeType.SpreadElement || !isPureValue(other))
			) {
				return 0;
			}
		}
		if (
			isWriteTarget(member, level) ||
			(isCallType(parentType) && childOf(Field.callee, parent) === member) ||
			parentType === NodeType.TaggedTemplateExpression ||
			(parentType === NodeType.UnaryExpression &&
				tree.textOf(Part.operator, parent) === "delete")
		) {
			return 0;
		}
		return element;
	};
	generators[NodeType.MemberExpression] = (node) => {
		const object = childOf(Field.object, node);
		const property = childOf(Field.property, node);
		const optional = tree.flag(Flag.optional, node);
		if (pickedElement(node, 0) !== 0) {
			// The array printed as the element alone.
			skipNode(property);
			printNode(object);
			return;
		}
		if (compresses && !hasEdgeComments(property) && !isWriteTarget(node)) {
			if (printsInfinity(node)) return;
			if (numberConstantOf(node) === "NaN") {
				/** @type {JavascriptPrintContext} */ (writer).consume(object);
				output.print("NaN");
				return;
			}
		}
		printNode(object);
		/** @type {string} */
		let name;
		if (tree.flag(Flag.computed, node)) {
			let key =
				!compresses || hasEdgeComments(property)
					? null
					: typeOf(property) === NodeType.Literal
						? tree.value(property)
						: foldedOf(property);
			// A folded key is renamed by its name, as terser renames the `.`
			// its compressor writes; a string as written only where found.
			if (
				typeof key === "string" &&
				renamedProperties !== null &&
				(typeOf(property) !== NodeType.Literal ||
					/** @type {Set<number>} */ (renamedStrings).has(property))
			) {
				key = renamedProperties.mangle(key);
			}
			if (typeof key !== "string" || printsComputed(key)) {
				if (optional) output.print("?.");
				output.print("[");
				printNode(property);
				output.print("]");
				return;
			}
			// A key that is a name prints after a `.`, terser's `properties`.
			skipNode(property);
			name = key;
		} else if (tree.type(property) === NodeType.PrivateIdentifier) {
			if (optional) output.print("?");
			output.print(".#");
			output.print_name(privateNameOf(property));
			return;
		} else {
			name = tree.name(property);
			if (renamedProperties !== null) name = renamedProperties.mangle(name);
		}
		if (optional) output.print("?.");
		if (printsComputed(name)) {
			output.print("[");
			printStringValue(name);
			output.print("]");
			return;
		}
		if (
			isNumber(object) &&
			/** @type {number} */ (tree.value(object)) >= 0 &&
			!/[xa-f.)]/i.test(output.last()) &&
			!/^0(?:o|[0-7]+$)/i.test(output.last())
		) {
			output.print(".");
		}
		if (!optional) output.print(".");
		output.print_name(name);
	};
	generators[NodeType.TemplateLiteral] = (node) => {
		const isTagged = typeOf(parentAt(0)) === NodeType.TaggedTemplateExpression;
		const count = tree.fieldCount(Field.quasis, node);
		const expressions = tree.fieldCount(Field.expressions, node);
		if (compresses && !isTagged && expressions > 0 && !hasEdgeComments(node)) {
			const folded = foldedOf(node);
			if (typeof folded === "string") {
				// Every part folds: a string, as terser's `evaluate` prints it.
				for (let i = 0; i < expressions; i++) {
					skipNode(itemOf(i, Field.expressions, node));
				}
				printStringValue(folded);
				return;
			}
		}
		output.print("`");
		for (let i = 0; i < count; i++) {
			const { raw, cooked } = /** @type {{ raw: string, cooked: string }} */ (
				tree.value(tree.field(i, Field.quasis, node))
			);
			if (isTagged) {
				output.print(raw);
			} else if (rawLineBreaks && cooked.includes("\n")) {
				output.print(lineBreakTemplate(output, cooked, false).slice(1, -1));
			} else {
				output.print_template_string_chars(cooked);
			}
			if (i < expressions) {
				const expression = itemOf(i, Field.expressions, node);
				const folded =
					compresses && !isTagged && !hasEdgeComments(expression)
						? foldedOf(expression)
						: undefined;
				if (folded !== undefined) {
					// A part that folds is text of the template.
					skipNode(expression);
					output.print_template_string_chars(String(folded));
					continue;
				}
				output.print("${");
				printNode(expression);
				output.print("}");
			}
		}
		output.print("`");
	};
	generators[NodeType.TaggedTemplateExpression] = (node) => {
		const tag = childOf(Field.tag, node);
		const wraps = parenthesizesTag(tag);
		if (wraps) output.print("(");
		printNode(tag);
		if (wraps) output.print(")");
		printNode(tree.field(0, Field.quasi, node));
	};
	generators[NodeType.AwaitExpression] = (node) => {
		output.print("await");
		output.space();
		const argument = childOf(Field.argument, node);
		const type = typeOf(argument);
		const parens = !(
			isCallType(type) ||
			type === NodeType.Identifier ||
			type === NodeType.MemberExpression ||
			isUnaryType(type) ||
			type === NodeType.Literal ||
			type === NodeType.AwaitExpression ||
			type === NodeType.ObjectExpression
		);
		if (parens) output.print("(");
		printNode(argument);
		if (parens) output.print(")");
	};
	generators[NodeType.YieldExpression] = (node) => {
		output.print(tree.flag(Flag.delegate, node) ? "yield*" : "yield");
		const argument = childOf(Field.argument, node);
		if (argument !== 0) {
			output.space();
			printNode(argument);
		}
	};
	generators[NodeType.FunctionExpression] = generators[
		NodeType.FunctionDeclaration
	] = (node) => {
		if (node === unwrappedFunction) {
			displayBody(tree.field(0, Field.body, node));
			return;
		}
		if (unreadBodies.size !== 0 && unreadBodies.has(node)) {
			printUnreadBody(tree.field(0, Field.body, node));
			return;
		}
		if (reducing.size !== 0 && reducing.has(node)) {
			printReduced(node);
			return;
		}
		printLambda(node, false);
	};
	generators[NodeType.ArrowFunctionExpression] = (node) => {
		if (node === unwrappedFunction) {
			displayBody(tree.field(0, Field.body, node));
			return;
		}
		if (unreadBodies.size !== 0 && unreadBodies.has(node)) {
			printUnreadBody(tree.field(0, Field.body, node));
			return;
		}
		if (reducing.size !== 0 && reducing.has(node)) {
			printReduced(node);
			return;
		}
		if (!isPrivateInRight(node, 0)) {
			printArrow(node);
			return;
		}
		output.print("(");
		printArrow(node);
		output.print(")");
	};
	generators[NodeType.ClassExpression] = printClass;
	generators[NodeType.ClassDeclaration] = printClass;

	/**
	 * Prints the statements of a function nothing reads the call of in the
	 * call's place: the first `if`'s test then `||`, and the expressions.
	 * @param {number} body the function's body
	 * @returns {void}
	 */
	const printUnreadBody = (body) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const count = tree.fieldCount(Field.body, body);
		const first = tree.field(0, Field.body, body);
		const tests = typeOf(first) === NodeType.IfStatement;
		if (tests) {
			printNode(first, bindsBelowOr(childOf(Field.test, first)));
			output.print("||");
		}
		const from = tests ? 1 : 0;
		// Only what prints something follows the test.
		/** @type {number[]} */
		const printed = [];
		for (let i = from; i < count; i++) {
			const statement = tree.field(i, Field.body, body);
			if (context.get(statement).length === 0) context.consume(statement);
			else printed.push(statement);
		}
		const wrap =
			tests &&
			(printed.length > 1 ||
				(printed.length === 1 &&
					bindsBelowOr(childOf(Field.expression, printed[0]))));
		if (wrap) output.print("(");
		if (tests && printed.length === 0) output.print("0");
		for (let i = 0; i < printed.length; i++) {
			if (i > 0) output.comma();
			printNode(printed[i]);
		}
		if (wrap) output.print(")");
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it binds less tightly than `||`, or mixes with it only in parentheses
	 */
	const bindsBelowOr = (node) => {
		switch (typeOf(node)) {
			case NodeType.AssignmentExpression:
			case NodeType.ConditionalExpression:
			case NodeType.SequenceExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.YieldExpression:
				return true;
			case NodeType.LogicalExpression:
				return tree.textOf(Part.operator, node) === "??";
			default:
				return false;
		}
	};

	/**
	 * Hands the print context the program's mappings: each node printed, where
	 * its text starts in the program's, and the original name of a name.
	 * @param {number} program the program, printed
	 * @param {string} text the program's text
	 * @param {JavascriptPrintContext} context the run's print context
	 * @returns {void}
	 */
	const mapPlacements = (program, text, context) => {
		const placed = /** @type {number[]} */ (placements);
		placements = null;
		// Each parent places its children after they print, so read backwards a
		// node's own place is known before the places of the children in it.
		const offsets = new Int32Array(program + 1).fill(-1);
		offsets[program] = 0;
		/** @type {number[]} */
		const order = [program];
		for (let i = placed.length - 3; i >= 0; i -= 3) {
			const parentOffset = offsets[placed[i]];
			const child = placed[i + 1];
			if (parentOffset === -1 || offsets[child] !== -1) continue;
			offsets[child] = parentOffset + placed[i + 2];
			order.push(child);
		}
		// Ascending in the output; at one offset the innermost node, last placed.
		const sorted = order.map((_node, index) => index);
		sorted.sort((a, b) => offsets[order[a]] - offsets[order[b]] || a - b);
		/** @type {number[]} */
		const lineStarts = [0];
		const breaks = /\r\n?|[\n\u2028\u2029]/g;
		while (breaks.exec(mappedSource) !== null) {
			lineStarts.push(breaks.lastIndex);
		}
		const mappedLength = mappedSource.length;
		mappedSource = "";
		/** @type {number[]} */
		const mappings = [];
		/** @type {string[]} */
		const names = [];
		/** @type {Map<string, number>} */
		const nameIndexes = new Map();
		for (const index of sorted) {
			const node = order[index];
			const start = tree.start(node) - mappedOffset;
			// What a wrapper around the source printed maps to nothing in it.
			if (start < 0 || start > mappedLength) continue;
			let low = 0;
			let high = lineStarts.length - 1;
			while (low < high) {
				const middle = (low + high + 1) >> 1;
				if (lineStarts[middle] <= start) low = middle;
				else high = middle - 1;
			}
			let name = -1;
			// A name printed as its value, or inside parentheses, keeps none.
			if (
				tree.type(node) === NodeType.Identifier &&
				isIdentifierCode(text.charCodeAt(offsets[node]), -1)
			) {
				const original = tree.name(node);
				const known = nameIndexes.get(original);
				if (known === undefined) {
					name = names.push(original) - 1;
					nameIndexes.set(original, name);
				} else {
					name = known;
				}
			}
			const at = mappings.length;
			// A node starting where the one before does replaces its mapping.
			const replaces = at !== 0 && mappings[at - 4] === offsets[node];
			const into = replaces ? at - 4 : at;
			mappings[into] = offsets[node];
			mappings[into + 1] = low;
			mappings[into + 2] = start - lineStarts[low];
			mappings[into + 3] = name;
		}
		context.anchorWithin(mappings, names);
	};

	/**
	 * Starts a print: its stream, from the format options the run was given,
	 * and what it reads off the whole source.
	 * @param {JavascriptPrintContext} context the run's print context
	 * @param {string} text the source
	 * @returns {void}
	 */
	const startPrint = (context, text) => {
		writer = context;
		const { parsed, leading, sourceType } = /** @type {NodePrintOptions} */ (
			/** @type {EXPECTED_OBJECT} */ (context.options)
		);
		const printOptions = /** @type {NodePrintOptions} */ (
			/** @type {EXPECTED_OBJECT} */ (context.options)
		);
		let { format } = printOptions;
		if (sourceType === "event-handler") {
			format = { ...format, _function_body: true };
		}
		inlinesNames = printOptions.inlinesNames === true;
		placements = context.mapWanted ? [] : null;
		const { mapsFrom } = printOptions;
		mappedOffset = mapsFrom === undefined ? 0 : mapsFrom.offset;
		keepsWrapper = mapsFrom !== undefined;
		mappedSource = !context.mapWanted
			? ""
			: mapsFrom === undefined
				? text
				: text.slice(mapsFrom.offset, mapsFrom.offset + mapsFrom.length);
		placingChild = 0;
		mangledNames = printOptions.names ? printOptions.names.definitions : null;
		treeAliases = printOptions.names ? printOptions.names.aliases : null;
		treeMoves = printOptions.names ? printOptions.names.movedFunctions : null;
		nameDefinitions = printOptions.names
			? printOptions.names.nameDefinitions
			: null;
		movedReads.clear();
		movedTexts.clear();
		collapsed.clear();
		keepsValue.clear();
		defunReads.clear();
		earlyDefuns.clear();
		movedDefuns.clear();
		const { compress } = printOptions;
		compresses = Boolean(compress);
		readsPureAnnotations = compress ? compress.side_effects !== false : false;
		printsConditionals = compress ? compress.conditionals !== false : false;
		dropsDeadCode = compress ? compress.dead_code !== false : false;
		keepsGlobalNames = Boolean(compress && compress.ie8);
		liftsKeys = Boolean(compress && compress.computed_props !== false);
		negatesCalls = Boolean(compress && compress.negate_iife !== false);
		if (comparesConvert !== (compress && compress.pure_conversions === false)) {
			comparesConvert = !comparesConvert;
			sideEffectsContext = undefined;
		}
		dropsSideEffectFree = readsPureAnnotations;
		if (compress) {
			// The one pass runs with webpack's improvements, which read these.
			readGlobals = globalsReadWithoutEffect(
				Boolean(compress.unsafe),
				compress.builtins_ecma === undefined ? 5 : compress.builtins_ecma
			);
		}
		dropsToplevel = Boolean(compress && (compress.toplevel || compress.module));
		keepsFunctionNames = Boolean(compress && compress.keep_fnames);
		keepsClassNames = Boolean(compress && compress.keep_classnames);
		const { improvements } = modules;
		writesLets =
			compresses &&
			improvements !== undefined &&
			improvements.enabled &&
			improvements.lets.enabled;
		splitsArrays =
			compresses && improvements !== undefined && improvements.enabled;
		privateNames = printOptions.names ? printOptions.names.privateNames : null;
		renamedProperties = printOptions.names
			? printOptions.names.properties
			: null;
		renamedStrings = printOptions.names
			? printOptions.names.propertyStrings
			: null;
		// Comments are read off the tokens a parse for `minify` keeps.
		const options = minifiedOptions(
			/** @type {FormatSettings} */ (
				defaults(
					parsed === undefined && leading === undefined
						? { ...format, comments: false }
						: format,
					FORMAT_DEFAULTS,
					true
				)
			)
		);
		if (options.shorthand === undefined) options.shorthand = options.ecma > 5;
		output = new NodeOutput(options);
		beautifies = context.options.mode === "beautify";
		output.beautifies = beautifies;
		commentStream = /** @type {OutputStream<number>} */ (
			/** @type {OutputStream<number> | NodeOutput} */ (output)
		);
		if (parsed !== undefined) {
			commentTokens = parsed.read;
			output.tokenTables = parsed.tables;
			const table = /** @type {TokenTable} */ (parsed.tables.last);
			commentFlags = table.commentFlags();
			firstToken = table.base;
			if (compresses) keepPrintedCommentFlags(parsed.tables);
		} else if (leading !== undefined) {
			leadingToken = leading.token;
			output.tokenTables = leading.tables;
		}
		output.nodeAccess = /** @type {NodeAccess} */ (
			/** @type {NodeAccess | NodeAccess<number>} */ (commentAccess)
		);
		rawLineBreaks = writesLineBreaksRawIn(output, text);
		mayUseAsm = text.includes("use asm");
		programPrefix = "";
		// A `#!` line is kept apart from comments, as `shebang` says.
		if (options.shebang && text.startsWith("#!")) {
			const end = text.search(/[\n\r\u2028\u2029]/);
			programPrefix = `${end === -1 ? text : text.slice(0, end)}\n`;
		}
		if (options.preamble) {
			programPrefix += options.preamble.replace(
				/\r\n?|[\n\u2028\u2029]|\s*$/g,
				"\n"
			);
		}
	};

	/**
	 * Widens what is kept by node to hold the given count of nodes.
	 * @param {number} capacity how many nodes
	 * @returns {void}
	 */
	const widenNodeStates = (capacity) => {
		const wider = new Uint8Array(capacity);
		wider.set(endState);
		endState = wider;
		const widerHeads = new Int32Array(capacity);
		widerHeads.set(heads);
		heads = widerHeads;
		const widerTails = new Int32Array(capacity);
		widerTails.set(tails);
		tails = widerTails;
	};

	/**
	 * The JavaScript node printer: a node's text from its children's, as
	 * `minify` prints a source it neither compresses nor mangles.
	 * @param {JavascriptPath} at the path, at the node printed
	 * @param {JavascriptPrintContext} context the print context
	 * @returns {string} the node's text
	 */
	return (at, context) => {
		path = at;
		const node = at.node;
		if (context !== writer) {
			tree = at.tree;
			let program = node;
			for (let level = 0; at.ancestor(level) !== 0; level++) {
				program = at.ancestor(level);
			}
			startPrint(context, at.source(0, at.end(program)));
			// The parser makes the program last: one widening holds every node.
			if (program >= endState.length) widenNodeStates(program + 1);
			if (compresses && mangledNames !== null) {
				firstPrinted = node;
				findDropped(program);
				if (earlyDefuns.size !== 0) {
					require("./syntax-parser").printEarlyIn(earlyDefuns);
				}
			} else if (foundSize > 0) {
				resetFound(0);
			}
			if (nameDefinitions !== null) {
				if (compresses && mangledNames !== null) {
					nameDefinitions(unprinted, droppedReads);
				} else {
					nameDefinitions(null, null);
				}
				nameDefinitions = null;
			}
		}
		if (node >= endState.length) {
			widenNodeStates(Math.max(endState.length * 2, node + 1));
		}
		current = node;
		parentsFound = 0;
		parentsRead = 0;
		const generate = generators[typeOf(node)];
		if (
			generate === undefined ||
			(MAY_PASS_OVER[tree.type(node)] === 1 &&
				isPassedOver(node, ancestorOf(0), ancestorOf(1)))
		) {
			endState[node] = 0;
			return "";
		}
		const parens =
			node !== unwrappedFunction &&
			!(unreadBodies.size !== 0 && unreadBodies.has(node)) &&
			parenthesized(node, 0) &&
			!(compresses && foldsBare(node));
		output.reset();
		if (parens) output.print("(");
		currentParens = parens;
		generate(node);
		// A name's `)` waits for the comments after it, taken as it is printed.
		let owesParenthesis = false;
		if (commentTokens !== null) {
			if (takesLaterComments(node)) {
				owesParenthesis = parens;
			} else {
				printCommentsAfter(node);
			}
		}
		if (parens && !owesParenthesis) output.print(")");
		endState[node] =
			(output.mightNeedSemicolon ? OWES_SEMICOLON : 0) |
			(output.literalLast ? ENDS_IN_LITERAL : 0) |
			(output.needSpace ? NEEDS_SPACE : 0) |
			(output.needNewlineIndented ? NEEDS_LINE_BREAK : 0) |
			(owesParenthesis ? OWES_PARENTHESIS : 0) |
			(parens ? OPENS_PARENTHESIZED : 0);
		heads[node] = output.head;
		tails[node] = output.tail;
		const text = output.text;
		if (text.length >= FLATTEN_AT && text.length >= 2 * output.longestChild) {
			_flattened = text.charCodeAt(0);
		}
		if (tree.type(node) === NodeType.Program) {
			if (placements !== null) mapPlacements(node, text, context);
			writer = null;
			tree = /** @type {SyntaxTree} */ (
				/** @type {SyntaxTree | null} */ (null)
			);
			commentTokens = null;
			leadingToken = 0;
			commentFlags = new Uint8Array(0);
			pendingComments.clear();
		}
		return text;
	};
};

/**
 * The modules the one-pass minify reads: the parser's tables, the mangler's
 * names, the output stream and what each phase it reads installs.
 * @returns {TerserModules} the modules
 */
const createModules = () => {
	/** @type {TerserModules} */
	const modules = /** @type {TerserModules} */ ({});
	modules.parse = /** @type {TerserModules["parse"]} */ (createParseTables());
	modules.scope = { base54: createFrequency(mergeSort) };
	modules.output = {
		OutputStream: (/** @type {Partial<FormatSettings>=} */ given) =>
			createOutputStream(modules, given)
	};
	modules.domprops = {
		domprops: require("./syntax-printer-data").domProperties()
	};
	modules.quotesKept = true;
	for (const install of [
		installFusedParse,
		installMinify,
		installOutput,
		installEstreeMangle,
		installImprove,
		installTreePrint
	]) {
		install(modules);
	}
	return modules;
};

/**
 * The modules, built on first use.
 * @returns {TerserModules} the modules
 */
const loadModules = () => {
	if (loaded === undefined) loaded = createModules();
	return loaded;
};

/** @type {((path: JavascriptPath, writer: JavascriptPrintContext) => string) | undefined} */
let nodePrinter;

/**
 * The JavaScript node printer `SourceProcessor` fires once a node's children
 * are printed: its text, as `minify` writes a source it neither compresses
 * nor mangles, comments left out.
 * @param {JavascriptPath} path the path, at the node printed
 * @param {JavascriptPrintContext} writer the print context, holding the children's text
 * @returns {string} the node's text
 * @experimental exposed as `webpack.javascript.syntax.printer.printer`; unstable API
 */
const printer = (path, writer) => getNodePrinter()(path, writer);

/**
 * @returns {(path: JavascriptPath, writer: JavascriptPrintContext) => string} the node printer, built on first use
 */
const getNodePrinter = () =>
	nodePrinter || (nodePrinter = createNodePrinter(loadModules()));

/** @type {Uint8Array | undefined} by `NodeType`, 1 for a name, built on first use */
let inlinedNames;

/**
 * The print options the node printer prints a source `parse.parseTree` read
 * with, and the nodes it prints inside their parents.
 * @param {ParsedTree} parsed the parsed source, its tokens read where it keeps comments
 * @param {DriverFormatOptions} format the format options
 * @param {number} leadingToken where only the comments before its first token are kept, that token, else 0
 * @param {TreeNames | null} names the names mangling gave, null where none are mangled
 * @param {Partial<CompressOptions> | null} compress the compress options where it compresses as it prints, else null
 * @returns {{ options: NodePrintOptions, inlined: Uint8Array | undefined }} the print options, and by `NodeType` 1 for a node printed inside its parent
 */
const nodePrintOptions = (parsed, format, leadingToken, names, compress) => {
	// Without a comment of their own to take, names print in their parent.
	const inlinesNames = parsed.read === null;
	if (inlinesNames && inlinedNames === undefined) {
		const { NodeType } = require("./syntax-parser");

		inlinedNames = new Uint8Array(
			Math.max(.../** @type {number[]} */ (Object.values(NodeType))) + 1
		);
		inlinedNames[NodeType.Identifier] = 1;
	}
	return {
		options: {
			format,
			parsed: inlinesNames ? undefined : parsed,
			leading:
				leadingToken === 0
					? undefined
					: { tables: parsed.tables, token: leadingToken },
			inlinesNames,
			names,
			compress
		},
		inlined: inlinesNames ? inlinedNames : undefined
	};
};

// What a JavaScript `SourceProcessor` run reads as `minify` options.
const MINIFY_OPTION_NAMES = /** @type {const} */ ([
	"compress",
	"ecma",
	"enclose",
	"format",
	"ie8",
	"keep_classnames",
	"keep_fnames",
	"mangle",
	"module",
	"nameCache",
	"parse",
	"safari10",
	"sourceType",
	"toplevel",
	"wrap"
]);

/**
 * Reads, and where asked mangles, the source a JavaScript `SourceProcessor`
 * minifies, which the node printer then compresses as it prints.
 * @param {string} text the source
 * @param {JavascriptProcessOptions} options the process options, their `minify` ones read
 * @returns {{ tree: SyntaxTree, program: number, text: string, options: NodePrintOptions, inlined: Uint8Array | undefined, finish: (() => void) | undefined }} the tree, its program, the text it was read from, the print options, the nodes printed inside their parents and what to run once it is printed
 */
const prepareMinify = (text, options) => {
	/** @type {Record<string, EXPECTED_ANY>} */
	const given = {};
	for (const name of MINIFY_OPTION_NAMES) {
		const value = /** @type {Record<string, EXPECTED_ANY>} */ (options)[name];
		if (value !== undefined) given[name] = value;
	}
	// A wrapper is read around the source, on lines of its own.
	let prefix = "";
	let suffix = "";
	if (given.wrap) {
		prefix = "(function(exports){\n";
		suffix = `\n})(typeof ${given.wrap}=='undefined'?(${given.wrap}={}):${given.wrap});`;
	}
	// `enclose` goes around `wrap`, as terser applies it after.
	if (given.enclose) {
		const enclose = typeof given.enclose === "string" ? given.enclose : "";
		const colon = enclose.includes(":") ? enclose.indexOf(":") : enclose.length;
		prefix = `(function(${enclose.slice(0, colon)}){\n${prefix}`;
		suffix = `${suffix}\n})(${enclose.slice(colon + 1)})`;
	}
	// A wrapped hashbang is no longer first, and terser drops it: blanked, it
	// leaves every offset after it where the source has it.
	if (prefix !== "" && text.startsWith("#!")) {
		const end = text.search(/[\n\r\u2028\u2029]/);
		const length = end === -1 ? text.length : end;
		text = " ".repeat(length) + text.slice(length);
	}
	delete given.wrap;
	delete given.enclose;
	keepsNamesOnce(given);
	if (given.mangle && typeof given.mangle === "object") {
		given.mangle = { ...given.mangle };
		keepsNamesOnce(given.mangle);
	}
	if (given.compress && typeof given.compress === "object") {
		given.compress = { ...given.compress };
		keepsNamesOnce(given.compress);
	}
	const source = prefix + text + suffix;
	const prepared = loadModules().prepareNodePrint(
		source,
		/** @type {MinifyOptions} */ (given)
	);
	const { options: printOptions, inlined } = nodePrintOptions(
		prepared.parsed,
		prepared.format,
		prepared.leadingToken,
		prepared.names,
		prepared.compress
	);
	if (prefix !== "") {
		printOptions.mapsFrom = { offset: prefix.length, length: text.length };
	}
	return {
		tree: prepared.parsed.tree,
		program: prepared.parsed.program,
		text: source,
		options: printOptions,
		inlined,
		finish: prepared.finish
	};
};

/** @type {number[][] | undefined} */
let statementListFields;

/**
 * terser's `join_vars` of a declaration and the statement after it setting
 * its last name: `var a; a = b;` reads as `var a = b;`, the assignment's
 * statement gone, so every rule a declarator's value folds by holds for it.
 * A declaration of the same kind after it joins it alike.
 * @param {SyntaxTree} tree the tree, read for `minify`
 * @param {number} program its program
 * @param {string} text the source it was read from
 * @returns {void}
 */
const joinAssignedDeclarations = (tree, program, text) => {
	const { Field, Flag, NodeType, Part } = require("./syntax-parser");

	if (statementListFields === undefined) {
		const { NODE_FIELDS } = require("./data");

		statementListFields = [];
		for (const name of Object.keys(NODE_FIELDS)) {
			const spec = NODE_FIELDS[name];
			/** @type {number[]} */
			const fields = [];
			for (const part of spec === "" ? [] : spec.split(" ")) {
				const [fieldName, kind] = part.split(":");
				if (kind === "node" || kind === "list") {
					fields.push(/** @type {Record<string, number>} */ (Field)[fieldName]);
				}
			}
			statementListFields[
				/** @type {Record<string, number>} */ (NodeType)[name]
			] = fields;
		}
	}
	const childFields = statementListFields;
	/**
	 * @param {number} node a node
	 * @param {string} name a name
	 * @returns {boolean} whether a name spelled so is anywhere in it
	 */
	const mentions = (node, name) => {
		if (tree.type(node) === NodeType.Identifier) {
			return tree.name(node) === name;
		}
		const fields = childFields[tree.type(node)];
		for (let f = 0; f < fields.length; f++) {
			const count = tree.fieldCount(fields[f], node);
			for (let i = 0; i < count; i++) {
				const child = tree.field(i, fields[f], node);
				if (child !== 0 && mentions(child, name)) return true;
			}
		}
		return false;
	};
	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether evaluating it runs no code: a literal, a function, or an array or object literal of those
	 */
	const runsNothing = (node) => {
		switch (tree.type(node)) {
			case NodeType.Literal:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
				return true;
			case NodeType.ArrayExpression: {
				const count = tree.fieldCount(Field.elements, node);
				for (let i = 0; i < count; i++) {
					const element = tree.field(i, Field.elements, node);
					if (element !== 0 && !runsNothing(element)) return false;
				}
				return true;
			}
			case NodeType.ObjectExpression: {
				const count = tree.fieldCount(Field.properties, node);
				for (let i = 0; i < count; i++) {
					const property = tree.field(i, Field.properties, node);
					if (
						tree.type(property) !== NodeType.Property ||
						tree.flag(Flag.computed, property) ||
						!runsNothing(tree.field(0, Field.value, property))
					) {
						return false;
					}
				}
				return true;
			}
			default:
				return false;
		}
	};
	/**
	 * @param {number} declaration a statement of a list
	 * @param {number} statement the statement after it
	 * @param {number} previous the statement before it, the declaration or one joined into it
	 * @returns {boolean} whether the statement sets the declaration's last name, which now takes the value, or declares alike, its declarators now the declaration's
	 */
	const joins = (declaration, statement, previous) => {
		if (tree.type(declaration) !== NodeType.VariableDeclaration) return false;
		const kind = tree.textOf(Part.kind, declaration);
		if (
			tree.type(statement) === NodeType.VariableDeclaration &&
			tree.textOf(Part.kind, statement) === kind &&
			(kind === "var" || kind === "let" || kind === "const") &&
			// No comment between them, which would print nowhere.
			/^[\s;]*$/.test(text.slice(tree.end(previous), tree.start(statement)))
		) {
			/** @type {number[]} */
			const declarators = [];
			for (const owner of [declaration, statement]) {
				const count = tree.fieldCount(Field.declarations, owner);
				for (let i = 0; i < count; i++) {
					declarators.push(tree.field(i, Field.declarations, owner));
				}
			}
			tree.set(declaration, "declarations", declarators);
			return true;
		}
		if (kind !== "var" && kind !== "let") return false;
		const last = tree.fieldCount(Field.declarations, declaration) - 1;
		const declarator = tree.field(last, Field.declarations, declaration);
		const id = tree.field(0, Field.id, declarator);
		if (
			tree.type(id) !== NodeType.Identifier ||
			tree.field(0, Field.init, declarator) !== 0 ||
			tree.type(statement) !== NodeType.ExpressionStatement
		) {
			return false;
		}
		const assignment = tree.field(0, Field.expression, statement);
		if (
			tree.type(assignment) !== NodeType.AssignmentExpression ||
			tree.textOf(Part.operator, assignment) !== "="
		) {
			return false;
		}
		const target = tree.field(0, Field.left, assignment);
		const value = tree.field(0, Field.right, assignment);
		const name = tree.name(id);
		if (
			tree.type(target) !== NodeType.Identifier ||
			tree.name(target) !== name ||
			mentions(value, name) ||
			// A `let` set by its declarator is in its dead zone while the value runs.
			(kind === "let" && !runsNothing(value))
		) {
			return false;
		}
		tree.set(declarator, "init", value);
		return true;
	};
	/**
	 * @param {number} owner a node listing statements in its `body`
	 * @returns {void}
	 */
	const joinIn = (owner) => {
		const count = tree.fieldCount(Field.body, owner);
		/** @type {number[] | undefined} */
		let kept;
		for (let i = 0; i < count; i++) {
			const statement = tree.field(i, Field.body, owner);
			if (kept !== undefined) kept.push(statement);
			while (
				i + 1 < count &&
				joins(
					statement,
					tree.field(i + 1, Field.body, owner),
					tree.field(i, Field.body, owner)
				)
			) {
				if (kept === undefined) {
					kept = [];
					for (let j = 0; j <= i; j++) {
						kept.push(tree.field(j, Field.body, owner));
					}
				}
				// The statement joined goes.
				i++;
			}
		}
		if (kept !== undefined) tree.set(owner, "body", kept);
	};
	/** @type {number[]} */
	const stack = [program];
	while (stack.length !== 0) {
		const node = /** @type {number} */ (stack.pop());
		const type = tree.type(node);
		if (
			type === NodeType.Program ||
			type === NodeType.BlockStatement ||
			type === NodeType.StaticBlock
		) {
			joinIn(node);
		}
		const fields = childFields[type];
		for (let f = 0; f < fields.length; f++) {
			const count = tree.fieldCount(fields[f], node);
			for (let i = 0; i < count; i++) {
				const child = tree.field(i, fields[f], node);
				if (child !== 0) stack.push(child);
			}
		}
	}
};

/**
 * Makes a `keep_fnames` or `keep_classnames` pattern a copy without `g` or
 * `y`, so the names it keeps do not hang on how often it was asked before.
 * @param {Record<string, EXPECTED_ANY>} group an option group
 * @returns {void}
 */
const keepsNamesOnce = (group) => {
	for (const name of ["keep_fnames", "keep_classnames"]) {
		/** @type {unknown} */
		const pattern = group[name];
		if (pattern instanceof RegExp && (pattern.global || pattern.sticky)) {
			group[name] = new RegExp(
				pattern.source,
				pattern.flags.replace(/[gy]/g, "")
			);
		}
	}
};

/**
 * The minifier `schema-utils` loads to minify a precompiled check, which runs
 * the one `SourceProcessor` pass as `jsMinify` does.
 * @deprecated minify with `new SourceProcessor().process(code, { mode: "minify" })`
 * @returns {Promise<{ minify: (code: string, options: MinifyOptions) => Promise<{ code: string }> }>} the minifier
 */
// TODO in the next major release: remove `load`, which `schema-utils` reads to minify a precompiled check
const load = () =>
	Promise.resolve({
		minify: (
			/** @type {string} */ code,
			/** @type {MinifyOptions} */ options
		) => {
			const compress =
				typeof options.compress === "boolean"
					? options.compress && {}
					: { ...options.compress };
			if (compress && compress.ecma === undefined) {
				compress.ecma = options.ecma;
			}

			const { SourceProcessor } = require("./syntax");

			return Promise.resolve({
				code: new SourceProcessor().process(code, {
					...options,
					compress,
					mode: "minify"
				}).code
			});
		}
	});

module.exports = {
	load,
	prepareMinify,
	printer,
	FORMAT_DEFAULTS,
	IGNORED_FORMAT_OPTIONS,
	createUnicode
};
