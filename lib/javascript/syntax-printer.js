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
const {
	TERSER_ALIASES,
	fromTerserNames,
	withTerserAliases
} = require("./terser-option-names");

// cspell:ignore Mihai, Bazon, DEFNODE, endpos, endcol, sequencesize, lvalues, binop, loopcontrol, symbolref, funs, jridgewell, DEFMETHOD, Defun, defun, defuns, fnames, funarg, classnames, mangleable, unmangleable, NOINLINE, privatename, argnames, thedef, argname, bcatch, bfinally, MANGLEPROP, nlb, punc, Funarg, propmangle, preferrably, nondeferred, fargs, domprops, noin, Noin, DEFPRINT, defprint, dgimsuyv, nokeyword, etnriaoslucdfmhpgvybkwjxqz, ETNRIAOSLUCDFMHPGVYBKWJXQZ

/**
 * What the one-pass minify is built from, once: the parser and what reads
 * and mangles a source.
 * @internal
 * @typedef {object} PrinterModules
 * @property {ParseModule} parse the parser and its tables, and the parse a tree printed directly is read with
 * @property {(text: string, options: MinifyOptions) => PreparedNodePrint} prepareNodePrint reads and mangles the one source the JavaScript `SourceProcessor` minifies
 */
/** @typedef {ReturnType<typeof createParseTables> & { parseTree: <T>(text: string, givenOptions: ParseOptions, readTokens: (tree: SyntaxTree, program: number, tokenAt: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable) => T) => { tree: SyntaxTree, program: number, tables: TokenTables, read: T, module: boolean } }} ParseModule the parser and its tables, and the parse a tree printed directly is read with */
/**
 * What reads a parsed tree for the one pass: its tokens, its names and its
 * properties.
 * @internal
 * @typedef {object} TreeMangler
 * @property {(tree: SyntaxTree, program: number, at: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable) => TreeTokens} readTreeTokens the tokens of a parsed tree
 * @property {(parsed: ParsedTree, shorthand: boolean, text: string, options: MangleOptions, mayNamePrivate: boolean, renames?: boolean, movesFunctions?: boolean) => TreeNames} mangleTree mangles a parsed tree, or only reads its scopes
 * @property {(parsed: ParsedTree, definitions: TreeDefinition[], quotedReserved: string[] | null, namesOf: (annotated: Set<string>) => PropertyNames) => { properties: PropertyNames, strings: Set<number> }} mangleTreeProperties chooses the names a parsed tree's properties are printed with
 */
/**
 * What names the scopes a parsed tree's analysis reads.
 * @internal
 * @typedef {object} ScopeMangler
 * @property {(analysis: MinifierScopeAnalysis, options: MangleOptions, unprinted?: Set<MinifierVariable> | null, readsGone?: Map<TreeDefinition, number> | null) => void} mangleManglingScopes names the scopes' definitions
 * @property {(analysis: MinifierScopeAnalysis, declaredBy: (node: number) => string[]) => Set<string> | null} privateNamesReadByEval the private names `eval` may read
 */
/**
 * A built-in function `foldedBuiltIns` lists, run on primitives at build time.
 * @typedef {(this: BuiltInReceiver, ...args: (string | number | boolean | null)[]) => EvaluatedValue} BuiltInFunction
 */
/**
 * What a folded built-in reads as `this`: nothing for a global function, its
 * object for a static, the string or number for a method.
 * @typedef {undefined | string | number | Record<string, BuiltInFunction>} BuiltInReceiver
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
/** @typedef {import("./syntax-parser").SyntaxTree} SyntaxTree a tree as webpack's parser writes one */
/** @typedef {import("./syntax-parser").JavascriptSourceType} JavascriptSourceType which production of JavaScript a source is */
/** @typedef {import("./ScopeAnalyzer").MinifierScope} MinifierScope a scope as the mangler reads it */
/** @typedef {import("./ScopeAnalyzer").MinifierVariable} MinifierVariable a definition as the mangler reads it */
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
 * @property {(DriverOptions["parse"] & TerserParseAliases)=} parse how the source is read
 * @property {boolean | GivenSourceMapOptions=} sourceMap whether a source map is written, and how
 * @property {boolean=} module whether the source is a module
 * @property {JavascriptSourceType=} sourceType which production the source is, `module` read from it where given
 * @property {number=} ecma which edition the output may use
 * @property {boolean=} toplevel whether top-level names may be renamed or dropped
 * @property {DriverOptions["nameCache"]=} nameCache names held across assets, which this writes into
 * @property {boolean | RegExp=} keepClassnames which class names survive
 * @property {boolean | RegExp=} keepFnames which function names survive
 * @property {boolean | RegExp=} keep_classnames terser's name for `keepClassnames`, read as it
 * @property {boolean | RegExp=} keep_fnames terser's name for `keepFnames`, read as it
 * @property {boolean=} ie8 whether the output works around that engine
 * @property {boolean=} safari10 whether the output works around that engine
 * @property {string | false=} wrap the global a CommonJS module is wrapped to write its exports to
 * @property {boolean | string=} enclose the function the source is enclosed in, as `parameters:arguments`
 */

/**
 * terser's `compress` options as a caller gives them: `globalDefs` any object
 * of names, as terser declares it.
 * @typedef {Omit<Partial<CompressOptions>, "globalDefs"> & { globalDefs?: false | EXPECTED_OBJECT } & TerserCompressAliases} GivenCompressOptions
 */
/**
 * terser's `mangle` options as a caller gives them, `properties` true for the
 * defaults.
 * @typedef {Omit<Partial<DriverMangleOptions>, "properties"> & { properties?: boolean | GivenPropertyMangleOptions } & TerserMangleAliases} GivenMangleOptions
 */
/**
 * terser's `format` options as a caller gives them; `sourceMap` is left out,
 * as the minify writes it from the top-level `sourceMap` option.
 * @typedef {Omit<DriverFormatOptions, "sourceMap">} GivenFormatOptions
 */
/**
 * terser's `sourceMap` options as a caller gives them, `content` a map object
 * of any source map library, its JSON or `"inline"`.
 * @typedef {Omit<Partial<DriverSourceMapOptions>, "content"> & { content?: DriverSourceMapOptions["content"] | EXPECTED_OBJECT }} GivenSourceMapOptions
 */

/**
 * terser's names for `compress` options webpack spells in camelCase, each read
 * as its camelCase name so that terser's options work unchanged.
 * @typedef {object} TerserCompressAliases
 * @property {number=} builtins_ecma terser's name for `builtinsEcma`
 * @property {boolean=} computed_props terser's name for `computedProps`
 * @property {boolean=} dead_code terser's name for `deadCode`
 * @property {(boolean | string[])=} drop_console terser's name for `dropConsole`
 * @property {boolean=} drop_debugger terser's name for `dropDebugger`
 * @property {GivenCompressOptions["globalDefs"]=} global_defs terser's name for `globalDefs`
 * @property {boolean=} join_vars terser's name for `joinVars`
 * @property {(boolean | RegExp)=} keep_classnames terser's name for `keepClassnames`
 * @property {(boolean | RegExp)=} keep_fnames terser's name for `keepFnames`
 * @property {boolean=} keep_infinity terser's name for `keepInfinity`
 * @property {boolean=} negate_iife terser's name for `negateIife`
 * @property {boolean=} pure_conversions terser's name for `pureConversions`
 * @property {(string[] | null)=} pure_funcs terser's name for `pureFuncs`
 * @property {boolean=} side_effects terser's name for `sideEffects`
 * @property {CompressOptions["topRetain"]=} top_retain terser's name for `topRetain`
 */
/**
 * terser's names for `mangle` options webpack spells in camelCase, each read
 * as its camelCase name so that terser's options work unchanged.
 * @typedef {object} TerserMangleAliases
 * @property {(boolean | RegExp)=} keep_classnames terser's name for `keepClassnames`
 * @property {(boolean | RegExp)=} keep_fnames terser's name for `keepFnames`
 * @property {IdentifierSource=} nth_identifier terser's name for `nthIdentifier`
 */
/**
 * terser's names for `mangle.properties` options webpack spells in camelCase,
 * each read as its camelCase name so that terser's options work unchanged.
 * @typedef {object} TerserPropertyAliases
 * @property {(boolean | "strict")=} keep_quoted terser's name for `keepQuoted`
 * @property {IdentifierSource=} nth_identifier terser's name for `nthIdentifier`
 * @property {boolean=} only_annotated terser's name for `onlyAnnotated`
 * @property {boolean=} only_cache terser's name for `onlyCache`
 */
/**
 * terser's names for `format` options webpack spells in camelCase, each read
 * as its camelCase name so that terser's options work unchanged.
 * @typedef {object} TerserFormatAliases
 * @property {boolean=} ascii_only terser's name for `asciiOnly`
 * @property {number=} indent_level terser's name for `indentLevel`
 * @property {number=} indent_start terser's name for `indentStart`
 * @property {boolean=} inline_script terser's name for `inlineScript`
 * @property {boolean=} keep_numbers terser's name for `keepNumbers`
 * @property {boolean=} keep_quoted_props terser's name for `keepQuotedProps`
 * @property {(number | false)=} max_line_len terser's name for `maxLineLen`
 * @property {boolean=} preserve_annotations terser's name for `preserveAnnotations`
 * @property {boolean=} quote_keys terser's name for `quoteKeys`
 * @property {number=} quote_style terser's name for `quoteStyle`
 * @property {boolean=} wrap_func_args terser's name for `wrapFuncArgs`
 * @property {boolean=} wrap_iife terser's name for `wrapIife`
 */
/**
 * terser's names for `parse` options webpack spells in camelCase, each read
 * as its camelCase name so that terser's options work unchanged.
 * @typedef {object} TerserParseAliases
 * @property {boolean=} bare_returns terser's name for `bareReturns`
 * @property {boolean=} html5_comments terser's name for `html5Comments`
 */

// The helpers of terser's `utils/index.js` the phases call, ours, so a phase
// reads only terser's tree and the methods it replaces.

/**
 * terser's `DefaultsError`, what `defaults` throws for an option it does not know.
 * @template {object} T
 */
class DefaultsError extends Error {
	/**
	 * @param {string} message what went wrong
	 * @param {T} defs the options known
	 */
	constructor(message, defs) {
		super();
		this.name = "DefaultsError";
		this.message = message;
		this.defs = defs;
	}
}

/**
 * @template {object} O
 * @param {O} object an object
 * @param {PropertyKey} property a key
 * @returns {boolean} whether the object has it as its own
 */
const hasOwn = (object, property) =>
	Object.prototype.hasOwnProperty.call(object, property);

/**
 * terser's `defaults`: the options given, each one missing taken from the defaults.
 * @template {object} T
 * @template {object} G
 * @param {G | boolean | null | undefined} given the options given: an object of them, true for all defaults, or something falsy for none
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
		} else if (key === "ecma" || key === "builtinsEcma") {
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
	/** @type {Map<string, V>} */
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
 * terser's `top_retain`, read into what answers whether it keeps a name: a
 * list of names, one string of them split by commas, a pattern, or a test.
 * @param {CompressOptions["topRetain"] | undefined} setting the option
 * @returns {((definition: NamedDefinition) => boolean) | null} the test, null where it keeps none
 */
const topRetainOf = (setting) => {
	if (!setting) return null;
	if (typeof setting === "function") return setting;
	if (setting instanceof RegExp) {
		return (definition) => {
			setting.lastIndex = 0;
			return setting.test(definition.name);
		};
	}
	const names = new Set(
		typeof setting === "string"
			? setting.split(/,/).map((name) => name.trim())
			: setting
	);
	return (definition) => names.has(definition.name);
};

/**
 * terser's `global_defs`, the globals it replaces with a value, kept where the
 * value is a primitive one a literal prints; a node or code, terser's `@`
 * form, is not read.
 * @param {CompressOptions["globalDefs"] | undefined} setting the option
 * @returns {Map<string, string | number | boolean | null> | null} the values by name, null where none
 */
const globalDefsOf = (setting) => {
	if (!setting) return null;
	/** @type {Map<string, string | number | boolean | null>} */
	const values = new Map();
	for (const name of Object.keys(setting)) {
		const value = setting[name];
		if (
			name[0] !== "@" &&
			(value === null ||
				typeof value === "string" ||
				typeof value === "number" ||
				typeof value === "boolean")
		) {
			values.set(name, value);
		}
	}
	return values.size === 0 ? null : values;
};

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
 * @property {IdentifierSource} nthIdentifier where mangled names come from
 * @property {boolean} ie8 whether the output works around that engine
 * @property {boolean | RegExp} keepClassnames which class names survive
 * @property {boolean | RegExp} keepFnames which function names survive
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
 * @property {boolean | "strict"} keepQuoted whether quoted names are kept
 * @property {IdentifierSource} nthIdentifier where mangled names come from
 * @property {boolean} onlyCache whether only cached names are mangled
 * @property {RegExp | string | null} regex which names are mangled
 * @property {string[]} reserved the names never mangled
 * @property {boolean} undeclared whether names read off undeclared globals are mangled
 * @property {boolean} onlyAnnotated whether only names marked for mangling are mangled
 */

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
				nthIdentifier: base54,
				ie8: false,
				keepClassnames: false,
				keepFnames: false,
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

/** @typedef {import("./side-effects").PrimitiveKind} PrimitiveKind the primitive an expression yields, undefined where unknown */

/** @typedef {FormatSettings} FormatOptions terser's `format` options, defaulted */
/**
 * The node a `comments` callback reads a comment off, published as terser
 * types it, as any node.
 * @internal
 * @typedef {number} CommentedNode
 */
/** @typedef {{ type: "comment1" | "comment2" | "comment3" | "comment4", value: string, pos: number, line: number, col: number, nlb: boolean, file?: string }} KeptComment a comment as a `comments` callback is handed it: terser's comment token, its offset, line from 1 and column from 0, whether a line break comes before it, and the file it was read from */
/** @typedef {(node: number, table: TokenTable, comment: number) => boolean} CommentFilter which comments are printed, by the node they are read off and the table they are numbered in */
/**
 * What `prepend_comments` prints before a node, taken as printed already.
 * @typedef {object} PrependComments
 * @property {number[]} comments the comments, in order
 * @property {boolean} lineBroken whether a line break precedes the node's first token
 * @property {string | undefined} shebang the `#!` line's text, printed first
 * @property {boolean} preamble whether the `preamble` prints, before the comments
 */
/**
 * What `append_comments` prints after a node, taken as printed already.
 * @typedef {object} AppendComments
 * @property {number[]} comments the comments, in order
 * @property {number[]} places each one's place among the kept comments of its list, which a comment printed already holds too
 * @property {boolean} tail whether they are inside an empty body
 */
/**
 * What the output stream reads off a parsed tree's node for comments: the
 * tokens it starts and ends at, a value no line break may precede, the child
 * the comment walk continues into below a node on such a value's leftmost
 * edge, and whether it is a statement.
 * @typedef {{ startToken(node: number): number | null | undefined, endToken(node: number): number | null | undefined, keywordValue(node: number): number | null | undefined, leftEdgeChild(node: number): number | null | undefined, isStatement(node: number): boolean }} NodeAccess
 */

// The `format` options terser's stream reads, each with its default. A terser
// naming any other set keeps its own stream, since an option this does not
// know would be silently ignored.
/** @type {FormatOptions} */
const FORMAT_DEFAULTS = {
	asciiOnly: false,
	beautify: false,
	braces: false,
	comments: "some",
	ecma: 5,
	ie8: false,
	indentLevel: 4,
	indentStart: 0,
	inlineScript: true,
	keepNumbers: false,
	keepQuotedProps: false,
	maxLineLen: false,
	preamble: null,
	preserveAnnotations: false,
	quoteKeys: false,
	quoteStyle: 0,
	safari10: false,
	semicolons: true,
	shebang: true,
	shorthand: undefined,
	sourceMap: null,
	webkit: false,
	width: 80,
	wrapIife: false,
	wrapFuncArgs: false
};

// The bytes giving the busiest names the shortest must save before the
// mangler does: below it, renaming costs gzip more than it saves.
const SHORTER_NAMES_MIN_SAVING = 200;

// The delimiters oxc picks among, frequent enough in code to gzip small.
const SPLIT_DELIMITERS = [".", ",", "(", ")", " "];
// The built-ins a call of converts its argument to a value, as `new` would
// wrap it, so either runs nothing more; `Date` called ignores its arguments.
const CONVERTING_BUILT_INS = ["Boolean", "Date", "Number", "String"];
// Those of them folding on constants: `Date()` reads the clock.
const FOLDED_CONVERSIONS = ["Boolean", "Number", "String"];
// The binary operators whose value is always a boolean.
const RELATIONS = new Set([
	"==",
	"!=",
	"===",
	"!==",
	"<",
	">",
	"<=",
	">=",
	"in",
	"instanceof"
]);
// The rest of terser's pure functions that only convert constant arguments;
// `Promise`, `Proxy`, `WeakRef` and the URI coders may run code or throw.
const QUIET_BUILT_INS = [
	"Error",
	"EvalError",
	"RangeError",
	"ReferenceError",
	"SyntaxError",
	"TypeError",
	"URIError",
	"Symbol",
	"escape",
	"unescape",
	"isFinite",
	"isNaN",
	"parseFloat",
	"parseInt"
];
// Those of `QUIET_BUILT_INS` and `CONVERTING_BUILT_INS` converting a BigInt
// quietly: to a string, its number or its truth, never by `ToNumber`.
const BIGINT_QUIET_BUILT_INS = [
	"Boolean",
	"Error",
	"EvalError",
	"Number",
	"RangeError",
	"ReferenceError",
	"String",
	"SyntaxError",
	"Symbol",
	"TypeError",
	"URIError",
	"escape",
	"unescape"
];
// The collections terser's tables leave to `unsafe`, whose argument webpack checks.
const WEAK_COLLECTIONS = ["WeakMap", "WeakSet"];
// The typed arrays of BigInts, whose elements a number in an array would throw on.
const BIGINT_ARRAYS = ["BigInt64Array", "BigUint64Array"];
// The `Object` functions that set members of their first argument.
const OBJECT_WRITERS = [
	"assign",
	"defineProperties",
	"defineProperty",
	"setPrototypeOf"
];
// The `Reflect` functions that set or delete members of their first argument.
const REFLECT_WRITERS = [
	"defineProperty",
	"deleteProperty",
	"set",
	"setPrototypeOf"
];
// The radixes `parseInt` reads exactly, 0 for the default; another may approximate.
const PARSED_RADIXES = [0, 2, 4, 8, 10, 16, 32];
// Below this a split gzips worse often enough to lose: oxc's 26 left 28 of
// 69 test262 sources bigger, 60 react-dom and yui; 100 none of 21 bundles.
const SPLIT_MIN_ELEMENTS = 100;

const ANNOTATION = /[@#]__(PURE|INLINE|NOINLINE)__/;
const ONLY_ANNOTATION = /^\s*[@#]__(PURE|INLINE|NOINLINE)__\s*$/;
// The comments `comments: "some"` keeps: a license, a copyright, `@preserve`.
const IMPORTANT_COMMENT = /@preserve|@copyright|@lic|@cc_on|^\**!/i;
// terser's name for a comment's kind, by its code: a line, a block, an HTML
// `<!--` or `-->` line, and the `#!` line.
const COMMENT_TYPES = [
	"",
	"comment1",
	"comment2",
	"comment3",
	"comment4",
	"comment5"
];

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
	"indentLevel",
	"indentStart",
	"maxLineLen",
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
 * terser's `is_identifier_char` of a character read as codes.
 * @param {(character: string) => boolean} isIdentifierCharacter `createUnicode`'s test of a character
 * @param {number} code its first UTF-16 code unit, -1 for none
 * @param {number} next the unit after it, -1 for none
 * @returns {boolean} whether it can stand in an identifier
 */
const isIdentifierCode = (isIdentifierCharacter, code, next) => {
	if (code < 0) return false;
	if (code < 128) return ASCII_IDENTIFIER[code] === 1;
	return isIdentifierCharacter(
		code >= 0xd800 && code <= 0xdbff && next >= 0xdc00 && next <= 0xdfff
			? String.fromCharCode(code, next)
			: String.fromCharCode(code)
	);
};

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

// The node types a line comment may follow as a statement: functions,
// classes, switch cases and catch clauses among them.
const STATEMENT_TYPE_NAMES = new Set([
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
			filter = (node, table, comment) =>
				table.commentKind(comment) !== 5 &&
				pattern.test(table.commentValue(comment));
		} else if (typeof comments === "function") {
			const callback = comments;
			filter = (node, table, comment) =>
				table.commentKind(comment) !== 5 &&
				callback(node, table.commentObject(comment));
		} else if (comments === "some") {
			filter = (node, table, comment) =>
				table.commentKind(comment) <= 2 &&
				IMPORTANT_COMMENT.test(table.commentValue(comment));
		} else {
			filter = () => true;
		}
	}
	if (options.preserveAnnotations) {
		const previous = filter;
		// An annotation alone: terser keeps any comment naming one, prose included.
		filter = (node, table, comment) =>
			ONLY_ANNOTATION.test(table.commentValue(comment)) ||
			previous(node, table, comment);
	}
	return filter;
};

// The unicode helpers the stream escapes names and strings with, built with the
// first stream.
/** @type {ReturnType<typeof createUnicode>} */
let unicode;

/**
 * @param {MinifiedOutput} stream the stream printing it
 * @param {number | null | undefined} value a returned, awaited or yielded value
 * @returns {boolean} whether its leftmost edge holds comments not yet printed
 */
const leftEdgeComments = (stream, value) => {
	const { nodeAccess, tokenTables } = stream;
	for (let inner = value; inner; inner = nodeAccess.leftEdgeChild(inner)) {
		const list = tokenTables.commentsOf(nodeAccess.startToken(inner), false);
		if (
			list !== undefined &&
			tokenTables.members(list).length !== 0 &&
			!stream.listPrinted(list)
		) {
			return true;
		}
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
 * A string's character as its literal writes it.
 * @param {string} str a string's value
 * @param {number} i the offset of a character it escapes
 * @param {boolean} ie8 whether the output works around that engine
 * @returns {string} the escape
 */
const escapeCharacter = (str, i, ie8) => {
	switch (str.charCodeAt(i)) {
		case 92:
			return "\\\\";
		case 10:
			return "\\n";
		case 13:
			return "\\r";
		case 9:
			return "\\t";
		case 8:
			return "\\b";
		case 12:
			return "\\f";
		case 11:
			return ie8 ? "\\x0B" : "\\v";
		case 0x2028:
			return "\\u2028";
		case 0x2029:
			return "\\u2029";
		case 0xfeff:
			return "\\ufeff";
		default: {
			// NUL: `\0` reads on as an octal escape before a digit.
			const next = str.charCodeAt(i + 1);
			return next >= 48 && next <= 57 ? "\\x00" : "\\0";
		}
	}
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

// What `prepend_comments` keeps of a list where nothing in it prints.
/** @type {number[]} */
const NO_KEPT_COMMENTS = [];

/**
 * webpack's stream for minified output, answering terser's code generators
 * through the same members terser's own `OutputStream` does and writing the
 * same bytes. It writes no layout, so it never breaks a line behind itself.
 */
class MinifiedOutput {
	/**
	 * @param {FormatSettings} options defaulted format options
	 * @param {NodeAccess} nodeAccess what comments are read off the printed nodes with
	 */
	constructor(options, nodeAccess) {
		if (unicode === undefined) unicode = createUnicode();
		this.options = options;
		this.nodeAccess = nodeAccess;
		this.commentFilter = commentFilterFor(options);
		this.appendsComments = Boolean(
			options.comments || options.preserveAnnotations
		);
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
		// Whether the program is a function's body, its last semicolon left to
		// the brace closing it.
		this.functionBody = false;
		// Whether a number or regular expression was the last thing printed,
		// which an `in` or `instanceof` after it is spaced from.
		this.literalLast = false;
		// Whether the program's own comments are taken, the only ones printed
		// where nothing is yet.
		this.atProgramStart = false;
		this.hasParentheses = false;
		this.mightNeedSpace = false;
		this.mightNeedSemicolon = false;
		this.needNewlineIndented = false;
		this.needSpace = false;
		this.lastPrinted = "";
		// What the printed tree's token numbers are read through.
		/** @type {TokenTables} */
		this.tokenTables = NO_TOKEN_TABLES;
		// By number, 1 for each list and each comment printed.
		this.printedLists = new Uint8Array(0);
		this.printedComments = new Uint8Array(0);

		const { asciiOnly, ecma, safari10 } = options;
		// Picked once per stream from the options, as terser's are.
		/** @type {(str: string, identifier?: boolean, regexp?: boolean) => string} */
		this.toUtf8 = asciiOnly
			? (str, identifier = false, regexp = false) => {
					if (isPlain(str, 0x7f)) return str;
					if (ecma >= 2015 && !safari10 && !regexp) {
						str = str.replace(
							/[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
							(character) =>
								`\\u{${unicode.getFullCharCode(character, 0).toString(16)}}`
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
			? this.toUtf8
			: /** @type {(str: string) => string} */ (str) => {
					// A lone surrogate is no identifier character, so none is left here.
					if (isPlain(str, 0x100) || !HIGH_IDENTIFIER.test(str)) {
						return str;
					}
					// Escape identifier characters from higher unicode versions.
					let character = unicode.getFullChar(str, 0);
					let escaped = character;
					if (
						unicode.isIdentifierStartBroad(character) &&
						!unicode.isIdentifierStart(character)
					) {
						escaped = unicodeEscape(
							/** @type {number} */ (character.codePointAt(0))
						);
					}
					for (let i = character.length; i < str.length;) {
						character = unicode.getFullChar(str, i);
						escaped +=
							unicode.isIdentifierCharBroad(character) &&
							!unicode.isIdentifierChar(character)
								? unicodeEscape(
										/** @type {number} */ (character.codePointAt(0))
									)
								: character;
						i += character.length;
					}
					return escaped;
				};
		/** @type {(str: string, quote?: string) => string} */
		this.encodeString = (str, quote) => {
			const encoded = this.makeString(str, quote);
			if (
				!options.inlineScript ||
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
	 * terser's string literal, its tabs written raw where `writesTabsRaw` says.
	 * @param {string} str a string's value
	 * @param {string=} quote the quote it was written with
	 * @returns {string} the string literal
	 */
	makeString(str, quote) {
		const { options } = this;
		const rawTabs = quote !== "`" && writesTabsRaw(str);
		// Where only ASCII is written a raw tab would be escaped again, so the
		// tabs are unescaped once the rest is.
		const tabsAsIs = rawTabs && !options.asciiOnly;
		let doubleQuotes = 0;
		let singleQuotes = 0;
		let escaped = "";
		let from = 0;
		for (let i = 0; i < str.length; i++) {
			const code = str.charCodeAt(i);
			if (code === 34) {
				doubleQuotes++;
			} else if (code === 39) {
				singleQuotes++;
			} else if (
				code === 92 ||
				code === 0 ||
				(code >= 8 && code <= 13 && !(code === 9 && tabsAsIs)) ||
				code === 0x2028 ||
				code === 0x2029 ||
				code === 0xfeff
			) {
				escaped += str.slice(from, i) + escapeCharacter(str, i, options.ie8);
				from = i + 1;
			}
		}
		if (from !== 0) str = escaped + str.slice(from);
		str = this.toUtf8(str);
		if (rawTabs && !tabsAsIs) str = unescapeWhitespace(str, true, false);
		if (quote === "`") return `\`${str.split("`").join("\\`")}\``;
		let single;
		switch (options.quoteStyle) {
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
		return doubleQuotes === 0 ? `"${str}"` : `"${str.split('"').join('\\"')}"`;
	}

	/**
	 * @returns {void}
	 */
	star() {
		this.print("*");
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
	forceSemicolon() {
		this.mightNeedSemicolon = false;
		this.print(";");
	}

	/**
	 * @param {string} name an identifier
	 * @returns {void}
	 */
	printName(name) {
		this.print(this.identifierToUtf8(name.toString(), true));
	}

	/**
	 * @param {string} str a string's value
	 * @param {string=} quote the quote it was written with
	 * @returns {void}
	 */
	printString(str, quote) {
		this.print(this.encodeString(str, quote));
	}

	/**
	 * Ends a program with the semicolon its last statement owes, which a
	 * function's body leaves to the brace closing it, as `print` does before
	 * a `}` other than one closing a label.
	 * @returns {void}
	 */
	endProgram() {
		if (this.functionBody && !this.lastPrinted.endsWith(":")) {
			this.mightNeedSemicolon = false;
		}
		this.print("");
	}

	/**
	 * @param {string} str a template's raw characters
	 * @returns {void}
	 */
	printTemplateStringChars(str) {
		let encoded = this.encodeString(str, "`");
		if (encoded.includes("${")) encoded = encoded.replace(/\${/g, "\\${");
		this.print(encoded.slice(1, -1));
	}

	/**
	 * @template T
	 * @param {() => T} content prints the content
	 * @returns {T} what `content` returned
	 */
	withSquare(content) {
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
	 * @param {string} comment a comment's text
	 * @returns {string} what is printed of it
	 */
	filterComment(comment) {
		if (!this.options.preserveAnnotations) {
			comment = comment.replace(ANNOTATION, " ");
		}
		if (/^\s*$/.test(comment)) return "";
		return comment.replace(/(<\s*\/\s*)(script)/i, "<\\/$2");
	}

	/**
	 * @param {number} list a list of comments
	 * @returns {boolean} whether it was taken as printed
	 */
	listPrinted(list) {
		return list < this.printedLists.length && this.printedLists[list] === 1;
	}

	/**
	 * @param {number} list a list of comments
	 * @returns {void}
	 */
	markListPrinted(list) {
		if (list >= this.printedLists.length) {
			const wider = new Uint8Array(
				Math.max(list + 1, /** @type {TokenTable} */ (this.table()).listCount())
			);
			wider.set(this.printedLists);
			this.printedLists = wider;
		}
		this.printedLists[list] = 1;
	}

	/**
	 * @param {number} comment a comment
	 * @returns {boolean} whether it was taken as printed
	 */
	commentPrinted(comment) {
		return (
			comment < this.printedComments.length &&
			this.printedComments[comment] === 1
		);
	}

	/**
	 * @param {number} comment a comment
	 * @returns {void}
	 */
	markCommentPrinted(comment) {
		if (comment >= this.printedComments.length) {
			const wider = new Uint8Array(
				/** @type {TokenTable} */ (this.table()).commentCount()
			);
			wider.set(this.printedComments);
			this.printedComments = wider;
		}
		this.printedComments[comment] = 1;
	}

	/**
	 * @returns {TokenTable | undefined} the table the printed tree's comments are numbered in
	 */
	table() {
		return this.tokenTables.last;
	}

	/**
	 * The first half of `prepend_comments`: takes the comments before a node
	 * as printed, and answers what prints of them, which the second half
	 * prints where the node starts.
	 * @param {number} node the node about to be printed
	 * @param {boolean=} valueOnly whether the node holding a keyword takes the comments before it, leaving it those of its value
	 * @returns {PrependComments | undefined} what prints, undefined for nothing
	 */
	claimPrependComments(node, valueOnly) {
		const { nodeAccess, tokenTables } = this;
		const start = nodeAccess.startToken(node);
		if (!start) return;
		// There cannot be a newline between return/yield and its value.
		const keywordWithValue = nodeAccess.keywordValue(node);
		const before = valueOnly ? undefined : tokenTables.commentsOf(start, false);
		const atStart = this.atStart();
		// WHY: terser records every token's comment list as printed, one Set
		// entry per token. An empty list prints nothing and no reader tells it
		// apart from an unrecorded one; only the start of output reads more.
		if (
			!keywordWithValue &&
			!atStart &&
			before !== undefined &&
			tokenTables.members(before).length === 0
		) {
			return;
		}
		// The same holds for a keyword's value: where neither the keyword nor
		// the value's leftmost edge has comments left to print, none is made.
		if (
			keywordWithValue &&
			!atStart &&
			(before === undefined ||
				tokenTables.members(before).length === 0 ||
				this.listPrinted(before)) &&
			!leftEdgeComments(this, keywordWithValue)
		) {
			return;
		}
		const table = tokenTables.tableOf(start);
		if (table === undefined) return;
		const index = start - table.base;
		// Nothing is printed at the start, but a list empty everywhere may be
		// one shared list, which a print in pieces takes before the start.
		if (
			before !== undefined &&
			this.listPrinted(before) &&
			!(atStart && table.members(before).length === 0)
		) {
			if (!keywordWithValue) return;
			table.bindComments(index, false, table.newList([]));
		}
		/** @type {number[]} */
		let comments = [];
		if (!valueOnly) {
			const own = table.commentsOf(index, false);
			this.markListPrinted(own);
			comments = table.members(own);
		}

		// terser walks the value's leftmost edge for comments a line break
		// there would move after the keyword; one child per node is on it.
		for (
			let inner = keywordWithValue;
			inner;
			inner = nodeAccess.leftEdgeChild(inner)
		) {
			const list = tokenTables.commentsOf(nodeAccess.startToken(inner), false);
			if (list !== undefined && !this.listPrinted(list)) {
				this.markListPrinted(list);
				comments = [...comments, ...table.members(list)];
			}
		}

		/** @type {string | undefined} */
		let shebang;
		if (
			atStart &&
			comments.length > 0 &&
			this.options.shebang &&
			table.commentKind(comments[0]) === 5 &&
			!this.commentPrinted(comments[0])
		) {
			// Taken out of the list it is in, as terser's printer shifts it.
			shebang = table.commentValue(/** @type {number} */ (comments.shift()));
		}

		// Most lists print nothing, so a list is made only for what prints.
		/** @type {number[]} */
		let kept = NO_KEPT_COMMENTS;
		for (let i = 0; i < comments.length; i++) {
			const comment = comments[i];
			if (
				this.commentFilter(node, table, comment) &&
				!this.commentPrinted(comment)
			) {
				if (kept === NO_KEPT_COMMENTS) kept = [];
				kept.push(comment);
			}
		}
		for (let i = 0; i < kept.length; i++) this.markCommentPrinted(kept[i]);
		if (!atStart && kept === NO_KEPT_COMMENTS) return;
		return {
			comments: kept,
			lineBroken: table.tokenBreaks(index),
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
			this.print(`#!${taken.shebang}\n`);
		}
		if (taken.preamble) {
			const { preamble } = this.options;
			if (preamble) {
				this.print(preamble.replace(/\r\n?|[\n\u2028\u2029]|\s*$/g, "\n"));
			}
		}
		const { comments } = taken;
		if (comments.length === 0) return;
		const table = /** @type {TokenTable} */ (this.table());
		let lastNlb = this.hasNLB();
		let brokeLine = false;
		for (let i = 0; i < comments.length; i++) {
			const comment = comments[i];
			if (!lastNlb) {
				if (table.commentBreaks(comment)) {
					this.print("\n");
					lastNlb = true;
				} else if (i > 0) {
					this.mightNeedSpace = true;
				}
			}
			const kind = table.commentKind(comment);
			if (kind === 1 || kind === 3 || kind === 4) {
				const value = this.filterComment(table.commentValue(comment));
				if (value) this.print(`//${value}\n`);
				lastNlb = true;
			} else if (kind === 2) {
				const value = this.filterComment(table.commentValue(comment));
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
	 * The first half of `append_comments`: takes the comments after a node
	 * as printed, and answers what prints of them.
	 * @param {number} node the node just printed
	 * @param {boolean=} tail true for the comments inside an empty body
	 * @returns {AppendComments | undefined} what prints, undefined for nothing
	 */
	claimAppendComments(node, tail) {
		if (!this.appendsComments) return;
		const token = this.nodeAccess.endToken(node);
		if (!token) return;
		const list = this.tokenTables.commentsOf(token, !tail);
		if (list === undefined || this.listPrinted(list)) return;
		const table = /** @type {TokenTable} */ (this.table());
		const comments = table.members(list);
		if (comments.length === 0) return;
		if (!this.nodeAccess.isStatement(node)) {
			for (let i = 0; i < comments.length; i++) {
				const kind = table.commentKind(comments[i]);
				if (kind === 1 || kind === 3 || kind === 4) return;
			}
		}
		this.markListPrinted(list);
		/** @type {AppendComments | undefined} */
		let taken;
		// Each kept comment's place among those kept, which says how it is spaced.
		let place = 0;
		for (let i = 0; i < comments.length; i++) {
			const comment = comments[i];
			if (!this.commentFilter(node, table, comment)) continue;
			if (!this.commentPrinted(comment)) {
				this.markCommentPrinted(comment);
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
		const table = /** @type {TokenTable} */ (this.table());
		for (let i = 0; i < comments.length; i++) {
			const comment = comments[i];
			const place = places[i];
			this.needSpace = false;
			if (this.needNewlineIndented) {
				this.print("\n");
				this.needNewlineIndented = false;
			} else if (
				table.commentBreaks(comment) &&
				(place > 0 || !this.hasNLB())
			) {
				this.print("\n");
			} else if (place > 0 || !tail) {
				this.mightNeedSpace = true;
			}
			const kind = table.commentKind(comment);
			if (kind === 1 || kind === 3 || kind === 4) {
				const value = this.filterComment(table.commentValue(comment));
				if (value) this.print(`//${value}`);
				this.needNewlineIndented = true;
			} else if (kind === 2) {
				const value = this.filterComment(table.commentValue(comment));
				if (value) this.print(`/*${value}*/`);
				this.needSpace = true;
			}
		}
	}

	/**
	 * terser's `hasNLB`, which skips the spaces after the line break: none is
	 * printed last where a comment is asked about.
	 * @returns {boolean} whether the text ends in a line break, or is empty
	 */
	hasNLB() {
		return this.text.length === 0 || (this.tail & 0xffff) === 10;
	}

	/**
	 * A space where one reads better, printed only where it beautifies.
	 * @returns {void}
	 */
	space() {
		if (this.beautifies) this.print(" ");
		else this.mightNeedSpace = true;
	}

	/**
	 * @returns {void}
	 */
	comma() {
		this.print(",");
		this.space();
	}

	/**
	 * @returns {void}
	 */
	colon() {
		this.print(":");
		this.space();
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
	print(value) {
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
			if (first !== 10) this.print("\n");
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
				(isIdentifierCode(unicode.isIdentifierCharacter, previous, -1) &&
					(isIdentifierCode(
						unicode.isIdentifierCharacter,
						first,
						length === 1 ? -1 : head >>> 16
					) ||
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

	/**
	 * @returns {boolean} whether nothing is printed yet: the program's own comments are taken
	 */
	atStart() {
		return this.atProgramStart;
	}
}

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
 * @param {ReturnType<typeof createFrequency>} base54 the mangler's source of names
 * @returns {(given: GivenPropertyMangleOptions, annotatedNames: Set<string>) => PropertyNames} what reads the options
 */
const createPropertyMangler = (base54) => {
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
		builtins = new Set(require("./syntax-printer-data").domProperties());
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
						keepQuoted: false,
						nthIdentifier: base54,
						onlyCache: false,
						regex: null,
						reserved: null,
						undeclared: false,
						onlyAnnotated: false
					},
					true
				)
			)
		);
		const identifiers = options.nthIdentifier;

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
		const onlyAnnotated = options.onlyAnnotated;
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
		const keepQuoted = Boolean(options.keepQuoted);

		/**
		 * @param {string} name a property name
		 * @returns {boolean} whether it may be renamed
		 */
		const canMangle = (name) => {
			if (unmangleable.has(name)) return false;
			if (reserved.has(name)) return false;
			if (options.onlyCache) return cache.has(name);
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
				!options.onlyCache
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
 * @typedef {Omit<Partial<PropertyMangleOptions>, "cache"> & { cache?: NameCacheEntry | null } & TerserPropertyAliases} GivenPropertyMangleOptions
 */
/**
 * terser's `mangle` options, as terser's `minify` defaults them.
 * @internal
 * @typedef {object} DriverMangleOptions
 * @property {NameCacheEntry | null} cache the names given so far, where names are cached
 * @property {boolean} eval whether names a scope reading `eval` sees are mangled
 * @property {boolean} ie8 whether the output works around that engine
 * @property {boolean | RegExp} keepClassnames which class names survive
 * @property {boolean | RegExp} keepFnames which function names survive
 * @property {boolean} module whether the source is a module
 * @property {IdentifierSource} nthIdentifier where mangled names come from
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
 * @typedef {Partial<FormatSettings> & TerserFormatAliases & { ast?: boolean, code?: boolean, spidermonkey?: boolean }} DriverFormatOptions
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
 * @property {boolean | RegExp | undefined} keepClassnames which class names survive
 * @property {boolean | RegExp} keepFnames which function names survive
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
 * What reads, and where asked mangles, the one source the JavaScript
 * `SourceProcessor` minifies, as terser's driver reads its options.
 * @param {ParseModule} parseModule the parser
 * @param {ReturnType<typeof createFrequency>} base54 the mangler's source of names
 * @param {TreeMangler} treeMangler what reads and mangles a parsed tree
 * @returns {PrinterModules["prepareNodePrint"]} what reads the source
 */
const createPrepareNodePrint = (parseModule, base54, treeMangler) => {
	const propertyNames = createPropertyMangler(base54);

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

	/**
	 * Which comments a print keeps, where the node printer may test them
	 * before it prints: a callback or a `lastIndex` a test moves would see it.
	 * @param {DriverFormatOptions} format the format options, as given
	 * @returns {CommentFilter | false | undefined} the test, false for none, undefined where they are only tested as they print
	 */
	const commentFilterOf = (format) => {
		const { comments } = format;
		if (comments !== undefined && !comments && !format.preserveAnnotations) {
			return false;
		}
		/** @type {FormatSettings} */
		let settings;
		try {
			settings = checkFormatOptions({ ...format });
		} catch (_err) {
			// A bad option throws once the source is read, as terser has it.
			return undefined;
		}
		const kept = settings.comments;
		if (
			typeof kept === "function" ||
			(kept instanceof RegExp && (kept.global || kept.sticky))
		) {
			return undefined;
		}
		return commentFilterFor(settings);
	};

	return (text, given) => {
		const options = /** @type {DriverOptions} */ (
			/** @type {Omit<DriverOptions, "format"> & { format: DriverFormatOptions | null }} */ (
				defaults(
					given,
					{
						compress: {},
						ecma: undefined,
						ie8: false,
						keepClassnames: undefined,
						keepFnames: false,
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
		if (options.keepClassnames === undefined) {
			options.keepClassnames = options.keepFnames;
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
		setShorthand("keepClassnames", options, ["compress", "mangle"]);
		setShorthand("keepFnames", options, ["compress", "mangle"]);
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
						keepClassnames: false,
						keepFnames: false,
						module: false,
						nthIdentifier: base54,
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
				if (options.mangle.properties.keepQuoted) {
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
		options.parse.toplevel = null;
		delete options.parse.spidermonkey;
		options.parse.filename = "0";
		// Where only comments before its first token print, that token.
		let leadingToken = 0;
		const keptBy =
			options.mangle || options.compress
				? undefined
				: commentFilterOf(givenFormat);
		// The scopes read every token's type; printing alone reads the tokens
		// only for the comments it keeps, and only the first where it keeps
		// those before it alone.
		const parsed = parseModule.parseTree(
			text,
			options.parse,
			keptBy === undefined
				? treeMangler.readTreeTokens
				: (tree, program, tokenAt, table) => {
						const kept =
							keptBy === false
								? 0
								: table.keptComments((comment) => keptBy(0, table, comment));
						if (kept === 2) {
							return treeMangler.readTreeTokens(tree, program, tokenAt, table);
						}
						if (kept === 1) {
							// Past every comment, the source's end is a token too.
							leadingToken = /** @type {number} */ (
								tokenAt(tree.start(program), false)
							);
						}
						return null;
					}
		);
		const compressOptions = /** @type {Partial<CompressOptions> | false} */ (
			options.compress
		);
		if (compressOptions && compressOptions.joinVars !== false) {
			joinAssignedDeclarations(
				parsed.tree,
				parsed.program,
				text,
				!parsed.module &&
					!compressOptions.toplevel &&
					!compressOptions.topRetain
			);
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
		/** @type {DriverFormatOptions} */
		const format = { ...options.format };
		delete format.ast;
		delete format.code;
		delete format.spidermonkey;
		const { shorthand } = checkFormatOptions(format);
		const { mangle, nameCache } = options;
		// terser's `inline` turned off prints each function where it is declared.
		const movesFunctions = !(
			compressOptions &&
			(compressOptions.inline === false || compressOptions.inline === 0)
		);
		/** @type {TreeNames | null} */
		let names = null;
		if (mangle) {
			names = treeMangler.mangleTree(
				parsed,
				Boolean(shorthand),
				text,
				formatMangleOptions(mangle, base54),
				text.includes("#"),
				true,
				movesFunctions
			);
			const { properties } = mangle;
			if (properties) {
				const mangled = treeMangler.mangleTreeProperties(
					parsed,
					names.definitions,
					quotedProperties && properties.keepQuoted !== "strict"
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
			names = treeMangler.mangleTree(
				parsed,
				Boolean(shorthand),
				text,
				formatMangleOptions(
					{
						ie8: options.ie8,
						safari10: options.safari10,
						module: options.module,
						keepFnames: options.keepFnames,
						keepClassnames: options.keepClassnames
					},
					base54
				),
				false,
				false,
				movesFunctions
			);
		}
		return {
			parsed,
			text,
			format,
			leadingToken,
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

/** @typedef {{ bareReturns?: boolean, ecma?: number | null, filename?: string | null, html5Comments?: boolean, module?: boolean, shebang?: boolean, toplevel?: null, [PARSE_FUNCTION_BODY]?: "commonjs" | "event-handler" }} ParseOptions terser's parse options, the tables a parse joining a tree numbers its tokens after, and whether the source is a function's body */

/**
 * What the parse phase shares with the rest: the operator precedences and
 * reserved words from terser's tables, and the error a refused source throws.
 * The parse phase installs `parse` itself.
 * @returns {{ PRECEDENCE: Record<string, number>, ALL_RESERVED_WORDS: Set<string> }} the parser's tables
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
 * @param {TokenTable} table the tokens' table
 * @param {number} open the opening parenthesis, by index
 * @param {number} close the closing parenthesis, by index
 * @param {number} inner the expression's first token, -1 where it has none
 * @param {number} last the expression's last token, -1 where it has none
 * @returns {void}
 */
const bindParenthesisComments = (table, open, close, inner, last) => {
	if (inner !== -1) {
		const outer = table.commentsOf(open, false);
		const outerComments = table.members(outer);
		const innerBefore = table.commentsOf(inner, false);
		// Built rather than moved: the list is shared where it is empty.
		const before =
			outerComments.length === 0
				? innerBefore
				: table.newList([...outerComments, ...table.members(innerBefore)]);
		table.bindComments(inner, false, before);
		table.bindComments(open, false, before);
		// Only a parenthesis holding no comment of its own hands its line break
		// to the first comment inside it, as terser's parser has it.
		const beforeComments = table.members(before);
		if (outerComments.length === 0 && beforeComments.length > 0) {
			const first = beforeComments[0];
			if (!table.commentBreaks(first)) {
				table.setCommentBreaks(first, table.tokenBreaks(open));
				table.setTokenBreaks(open, false);
			}
		}
		table.bindComments(open, true, table.commentsOf(inner, true));
	}
	if (last !== -1) {
		table.bindComments(close, false, table.commentsOf(last, false));
		const closeAfter = table.members(table.commentsOf(close, true));
		const lastAfter = table.commentsOf(last, true);
		const after =
			closeAfter.length === 0
				? lastAfter
				: table.newList([...table.members(lastAfter), ...closeAfter]);
		table.bindComments(last, true, after);
		table.bindComments(close, true, after);
	}
};

/** @typedef {{ name: string, mangledName?: string | null }} NamedDefinition what every definition of a name holds: the name it declares, and the one mangling gave it */
/** @typedef {{ reset: () => void, consider: (chars: string, delta: number) => void, sort: () => void }} CharacterCounter an identifier source that counts the characters printed, as terser's `base54` does */

/**
 * The tokens and comments of one parse, a token read by its index past
 * `base`, a list of comments and a comment by numbers of their own.
 * @typedef {object} TokenTable
 * @property {number} base the number of its first token
 * @property {(index: number, after: boolean) => number} commentsOf the list of the comments before or after a token, 0 for the one empty list
 * @property {(index: number, after: boolean, list: number) => void} bindComments binds a list onto a token, as a parenthesis does
 * @property {(list: number) => number[]} members a list's comments, in order
 * @property {(comments: number[]) => number} newList makes a list of its own, however empty
 * @property {() => number} listCount how many lists there are
 * @property {() => number} commentCount how many comments there are
 * @property {(comment: number) => number} commentKind its kind, as `COMMENT_TYPES` names it
 * @property {(comment: number) => string} commentValue what it holds
 * @property {(comment: number) => number} commentStart where it starts
 * @property {(comment: number) => boolean} commentBreaks whether a line break comes before it
 * @property {(comment: number, broke: boolean) => void} setCommentBreaks records whether one does
 * @property {(comment: number) => KeptComment} commentObject it as a `comments` callback is handed it
 * @property {(index: number) => boolean} tokenBreaks whether a line break comes before a token
 * @property {(index: number, broke: boolean) => void} setTokenBreaks records whether one does
 * @property {(index: number) => boolean} opensParenthesis whether a token is a `(`
 * @property {(index: number) => { file: string | undefined, line: number, col: number, pos: number }} tokenPlace where a token sits
 * @property {(callback: (gap: number, list: number) => void) => void} forEachCommentGap each gap holding comments, and its list
 * @property {() => Uint8Array} commentFlags by token, whether a comment is read before it (1) or after it (2)
 * @property {(test: (comment: number) => boolean) => number} keptComments 0 where `test` keeps none, 1 where only those before the first token, 2 where more
 */

/**
 * The tokens of the parse a tree was read from. Its nodes hold their tokens'
 * numbers, which this answers for; a token handed in whole answers for itself.
 */
class TokenTables {
	constructor() {
		// The parse's table, which the tree reads every token in.
		/** @type {TokenTable | undefined} */
		this.last = undefined;
		this.lastBase = Infinity;
	}

	/**
	 * @param {TokenTable} table the table of the parse read onto the tree
	 * @returns {void}
	 */
	add(table) {
		this.last = table;
		this.lastBase = table.base;
	}

	/**
	 * @param {number} number a token's number
	 * @returns {TokenTable | undefined} the table of the parse that read it, none for 0
	 */
	tableOf(number) {
		return number >= this.lastBase ? this.last : undefined;
	}

	/**
	 * @param {number | null | undefined} token a token's number, 0 for none
	 * @param {boolean} after true for the comments after it
	 * @returns {number | undefined} the list of the comments before or after it, undefined where no parse read it
	 */
	commentsOf(token, after) {
		if (!token) return undefined;
		const table = this.tableOf(token);
		return table === undefined
			? undefined
			: table.commentsOf(token - table.base, after);
	}

	/**
	 * @param {number | undefined} list a list of comments, undefined for none
	 * @returns {number[]} its comments, none where it is undefined
	 */
	members(list) {
		return list === undefined || this.last === undefined
			? NO_MEMBERS
			: this.last.members(list);
	}
}

// The comments of no list.
/** @type {number[]} */
const NO_MEMBERS = [];

// What a tree read without webpack's parse answers its tokens with.
const NO_TOKEN_TABLES = new TokenTables();

// The parse option reading a source as a function's body, the `sourceType`
// naming whose: `return` and `new.target` at its top, and a `#!` line opening
// only a CommonJS module's.
const PARSE_FUNCTION_BODY = Symbol("a source read as a function body");

/**
 * Installs webpack's parse: the printer's tree built by webpack's own parser as
 * it finishes each statement, with that parser's tokens and comments.
 * @param {ParseModule} parse the parser, which `parseTree` is added to
 * @returns {void}
 */
const installParseTree = (parse) => {
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

	const EOF_CODE = /** @type {number} */ (KIND_CODES.get("eof"));

	/**
	 * The tokens and comments of a parse, as terser's tokenizer leaves them:
	 * the comments read since the token before one are a list that token and
	 * the one before share. A node holds its tokens' numbers, `base` past
	 * their index; a list and a comment are numbers of their own.
	 * @param {string} source the source being parsed
	 * @param {string | null} filename what its tokens name as their file
	 * @param {number} base the number of this parse's first token
	 * @returns {{ onComment: import("./syntax-parser").OnComment, onToken: NonNullable<import("./syntax-parser").Options["onTokenRead"]>, shebang: (text: string) => void, finish: () => void, at: (pos: number, ending: boolean, forward?: number) => number | undefined, table: TokenTable }} where to report comments and tokens, the token at an offset, what narrows the tables once the parse is over, and the table its numbers are read through
	 */
	const collectTokens = (source, filename, base) => {
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
		// Each comment's kind, as `COMMENT_TYPES` names it, its text, where it
		// starts and whether a line break comes before it, by its number.
		/** @type {number[]} */
		const commentKinds = [];
		/** @type {string[]} */
		const commentValues = [];
		/** @type {number[]} */
		const commentStarts = [];
		/** @type {number[]} */
		const commentBreaks = [];
		// The comments of each list, by its number; list 0 is the one every gap
		// with none shares, which nothing writes into.
		/** @type {number[][]} */
		const lists = [[]];
		// The list of each gap between tokens, by the token after it, while the
		// parse reads them; a gap not given one holds none.
		/** @type {number[]} */
		const gapLists = [];
		// The gaps given a list while the parse reads them, as `gapLists` is sparse.
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
		// Where `at` last found its token, and its last token starting: nodes are
		// asked for in the order they sit, so the next is mostly a few tokens away.
		let lastFound = 0;
		let lastStart = 0;
		// Whether the token before was a `.` or `?.`, after which terser reads a
		// word as a name whatever else it is.
		let afterDot = false;

		/**
		 * @param {number[]} comments the comments, by number
		 * @returns {number} a list of them, of its own
		 */
		const newList = (comments) => {
			lists.push(comments);
			return lists.length - 1;
		};

		/**
		 * @param {number} gap the token the comments were read before
		 * @returns {number} their list
		 */
		const listAt = (gap) => {
			const known = gapLists[gap];
			if (known !== undefined) return known;
			// A gap already read past holds none: it shares the empty list, as most
			// gaps are asked for once. One not read past gains its comments after
			// this, so it is given a list of its own to gain them in.
			if (commentedGaps !== null || gap < count) return 0;
			const list = newList([]);
			gapLists[gap] = list;
			listed.push(gap);
			return list;
		};

		/**
		 * Keeps a comment in the list of the gap it was read in, which the tokens on
		 * either side of that gap both read.
		 * @param {number} gap the token it was read before
		 * @param {number} kind its kind, as `COMMENT_TYPES` names it
		 * @param {string} text what it holds
		 * @param {number} start where it starts
		 * @param {boolean} nlb whether a line break comes before it
		 * @returns {void}
		 */
		const read = (gap, kind, text, start, nlb) => {
			let list = gapLists[gap];
			if (list === undefined) {
				list = newList([]);
				gapLists[gap] = list;
				listed.push(gap);
			}
			lists[list].push(commentKinds.length);
			commentKinds.push(kind);
			commentValues.push(text);
			commentStarts.push(start);
			commentBreaks.push(nlb ? 1 : 0);
		};

		/**
		 * @param {number} pos an offset
		 * @returns {{ line: number, column: number }} its line, from 1, and column, from 0
		 */
		const placeAt = (pos) => {
			if (lineStarts === null) lineStarts = buildLineStarts(source);
			return /** @type {{ line: number, column: number }} */ (
				positionAt(lineStarts, pos)
			);
		};

		/**
		 * @param {number} index a token
		 * @returns {number} it, the last read for one past what the parse read
		 */
		const readIndex = (index) =>
			commentedGaps !== null && index >= count ? count - 1 : index;

		// A list bound onto one token by a parenthesis, which the gap it was read
		// in keeps out of: one token to an index, so the index names it.
		/** @type {Map<number, number> | null} */
		let boundBefore = null;
		/** @type {Map<number, number> | null} */
		let boundAfter = null;
		// A bit per token with a list bound, so the many with none skip the maps,
		// whose lookup costs more than the rest of the read.
		let boundTokens = new Uint8Array(0);

		/**
		 * @param {number} index a token
		 * @param {boolean} after true for the comments after it
		 * @returns {number} their list
		 */
		const commentsOf = (index, after) => {
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
			if (commentedGaps !== null && commentedGaps[gap] === 0) return 0;
			return listAt(gap);
		};

		/** @type {TokenTable} */
		const table = {
			base,
			commentsOf: (index, after) => commentsOf(readIndex(index), after),
			bindComments: (given, after, list) => {
				const index = readIndex(given);
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
					boundAfter.set(index, list);
				} else {
					if (boundBefore === null) boundBefore = new Map();
					boundBefore.set(index, list);
				}
			},
			members: (list) => lists[list],
			newList,
			listCount: () => lists.length,
			commentCount: () => commentKinds.length,
			commentKind: (comment) => commentKinds[comment],
			commentValue: (comment) => commentValues[comment],
			commentStart: (comment) => commentStarts[comment],
			commentBreaks: (comment) => commentBreaks[comment] === 1,
			setCommentBreaks: (comment, broke) => {
				commentBreaks[comment] = broke ? 1 : 0;
			},
			commentObject: (comment) => {
				const { line, column } = placeAt(commentStarts[comment]);
				return {
					type: /** @type {KeptComment["type"]} */ (
						COMMENT_TYPES[commentKinds[comment]]
					),
					value: commentValues[comment],
					pos: commentStarts[comment],
					line,
					col: column,
					nlb: commentBreaks[comment] === 1,
					file: filename === null ? undefined : filename
				};
			},
			tokenBreaks: (index) => breaks[readIndex(index)] === 1,
			setTokenBreaks: (index, broke) => {
				breaks[readIndex(index)] = broke ? 1 : 0;
			},
			opensParenthesis: (index) => {
				const read = readIndex(index);
				return KINDS[kinds[read]] === "punc" && source[starts[read]] === "(";
			},
			tokenPlace: (index) => {
				const pos = starts[readIndex(index)];
				const { line, column } = placeAt(pos);
				return {
					file: filename === null ? undefined : filename,
					line,
					col: column,
					pos
				};
			},
			// Read once the parse is over, when only gaps holding comments are kept.
			forEachCommentGap: (callback) => {
				for (const gap of listed) callback(gap, gapLists[gap]);
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
							lists[list].length === 0 ? flags[index] & ~1 : flags[index] | 1;
					}
				}
				if (boundAfter !== null) {
					for (const [index, list] of boundAfter) {
						flags[index] =
							lists[list].length === 0 ? flags[index] & ~2 : flags[index] | 2;
					}
				}
				// What the parse never read reads the last token's, as `commentsOf` has it.
				for (let i = count; i < size; i++) flags[i] = flags[count - 1];
				return flags;
			},
			// Read as the parse ends: 0 where it keeps none, 1 where only those
			// before the first token, 2 where it keeps more.
			keptComments: (test) => {
				let kept = 0;
				for (const gap of listed) {
					const list = lists[gapLists[gap]];
					for (let i = 0; i < list.length; i++) {
						if (!test(list[i])) continue;
						if (gap !== 0) return 2;
						kept = 1;
						break;
					}
				}
				return kept;
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
				read(count, isBlock ? 2 : 1, value, start, nlb || brokenLine);
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
				read(0, 5, text, 0, false);
			},
			finish: () => {
				// The parse is over: the room it was given beyond what it read goes,
				// and so does everything only the parse needed.
				starts = starts.slice(0, count);
				ends = ends.slice(0, count);
				kinds = kinds.slice(0, count);
				breaks = breaks.slice(0, count);
				let gaps = count + 2;
				// In order, as the gaps are read, but for one given a list ahead; a
				// gap whose list stayed empty holds none.
				listed.sort((a, b) => a - b);
				/** @type {number[]} */
				const kept = [];
				for (const gap of listed) {
					if (lists[gapLists[gap]].length === 0) {
						gapLists[gap] = 0;
						continue;
					}
					kept.push(gap);
					if (gap >= gaps) gaps = gap + 1;
				}
				listed = kept;
				const flags = new Uint8Array(gaps);
				for (const gap of kept) flags[gap] = 1;
				commentedGaps = flags;
			},
			at: (
				/** @type {number} */ pos,
				/** @type {boolean} */ ending,
				/** @type {number=} */ forward
			) => {
				const offsets = ending ? ends : starts;
				// A node's end from its start, its start from the start before.
				const hint = ending ? lastFound : lastStart;
				// Mostly the token just found: offsets rise, so one there is the
				// token asked for.
				if (forward === undefined && hint < count && offsets[hint] === pos) {
					lastFound = hint;
					return base + hint;
				}
				let low = 0;
				// What the parse has read, which is short of the room it was given.
				let high = count - 1;
				// Every token before `low` is before `pos`, and none after `high` is.
				if (hint <= high) {
					if (ending ? offsets[hint] <= pos : offsets[hint] < pos) {
						low = hint + 1;
						const far = hint + 32;
						if (
							far <= high &&
							!(ending ? offsets[far] <= pos : offsets[far] < pos)
						) {
							high = far - 1;
						}
					} else {
						high = hint - 1;
						const far = hint - 32;
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
				if (!ending) lastStart = low;
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
			table
		};
	};

	// The parse options read, each at its default; any other is refused.
	/** @type {{ bareReturns: boolean, ecma: number | null, filename: string | null, html5Comments: boolean, module: boolean, shebang: boolean, toplevel: null }} */
	const PARSE_DEFAULTS = {
		bareReturns: false,
		ecma: null,
		filename: null,
		html5Comments: true,
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
			allowReturnOutsideFunction: Boolean(options.bareReturns),
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
	 * @returns {{ result: T, table: TokenTable }} what `convert` made, and the table the tokens' numbers are read through
	 */
	const readSource = (text, options, filename, base, createParser, convert) => {
		/** @type {T | undefined} */
		let result;
		/** @type {TokenTable | undefined} */
		let table;
		try {
			const tokens = collectTokens(text, filename, base);
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
	 * @returns {{ tree: SyntaxTree, program: number, tables: TokenTables, read: T, module: boolean }} the tree, its program, the tables its tokens' numbers are read through, what `readTokens` read, and whether it imports or exports
	 */
	parse.parseTree = (text, givenOptions, readTokens) => {
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
				// Never 0, which a node without a token holds.
				1,
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
				}
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
 * terser's compress options, defaulted, as the compressor reads them.
 * @internal
 * @typedef {object} CompressOptions
 * @property {boolean} computedProps whether constant computed keys become plain
 * @property {boolean} conditionals whether conditionals are simplified
 * @property {boolean} deadCode whether unreachable code is dropped
 * @property {boolean | string[]} dropConsole whether `console` calls are dropped, or which of its methods
 * @property {boolean} dropDebugger whether `debugger` statements are dropped
 * @property {number} ecma which edition the output may use
 * @property {number} builtinsEcma which edition's builtins may be assumed, the compressor's `ecma` where not given
 * @property {false | { [key: string]: EvaluatedValue }} globalDefs the globals replaced, by name
 * @property {boolean} ie8 whether the output works around that engine
 * @property {boolean | number} inline whether functions are inlined where called, `0` read as `false`
 * @property {boolean} joinVars whether neighboring declarations are joined
 * @property {boolean | RegExp} keepClassnames which class names survive
 * @property {boolean | RegExp} keepFnames which function names survive
 * @property {boolean} keepInfinity whether `Infinity` is kept as written
 * @property {boolean} module whether the source is a module
 * @property {boolean} negateIife whether an immediately called function is negated
 * @property {string[] | null} pureFuncs the calls assumed pure
 * @property {boolean} pureConversions whether conversions are assumed to have no side effect
 * @property {boolean} sideEffects whether side-effect-free statements are dropped
 * @property {string | string[] | RegExp | ((definition: NamedDefinition) => boolean) | null} topRetain the top-level names kept
 * @property {boolean | string} toplevel whether top-level names may be dropped, or which kinds
 * @property {boolean} unsafe whether unsafe transforms run
 * @property {boolean} unused whether unused names are dropped
 */

/**
 * terser's `format` options, defaulted, as the stream reads them.
 * @internal
 * @typedef {object} FormatSettings
 * @property {boolean} asciiOnly whether only ASCII is written
 * @property {boolean} beautify whether the output is laid out to read, always false here
 * @property {boolean} braces whether every body is braced, always false here
 * @property {boolean | string | RegExp | ((node: CommentedNode, comment: KeptComment) => boolean)} comments which comments are kept
 * @property {number} ecma which edition the output may use
 * @property {boolean} ie8 whether the output works around that engine
 * @property {number} indentLevel how far a level indents, unread here
 * @property {number} indentStart how far the output indents, unread here
 * @property {boolean} inlineScript whether `</script` is escaped
 * @property {boolean} keepNumbers whether numbers are written as read
 * @property {boolean} keepQuotedProps whether quoted keys stay quoted
 * @property {number | false} maxLineLen how long a line may be, unread here
 * @property {string | null} preamble text written first
 * @property {boolean} preserveAnnotations whether annotation comments are kept
 * @property {boolean} quoteKeys whether every key is quoted
 * @property {number} quoteStyle which quote strings are written with
 * @property {boolean} safari10 whether the output works around that engine
 * @property {boolean} semicolons whether statements end in semicolons rather than line breaks
 * @property {boolean} shebang whether a shebang is kept
 * @property {boolean | undefined} shorthand whether properties are written in shorthand, undefined until read from `ecma`
 * @property {SourceMapBuilder | null} sourceMap where mappings are recorded
 * @property {boolean} webkit whether the output works around that engine
 * @property {number} width how wide a line may be, unread here
 * @property {boolean} wrapIife whether an immediately called function is parenthesized
 * @property {boolean} wrapFuncArgs whether a function passed as an argument is parenthesized
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

/**
 * Whether a string writes its tabs raw: a long one holding several, as a
 * short one's `\t` gzips better kept, matching the escapes near it.
 * @param {string} str a string's value
 * @returns {boolean} true when it does
 */
const writesTabsRaw = (str) =>
	str.length >= 100 && str.indexOf("\t") !== str.lastIndexOf("\t");

/**
 * @param {string} text a source
 * @returns {number} how many `\n` escapes it spells
 */
const countLineBreakEscapes = (text) => {
	let escapes = 0;
	for (let i = text.indexOf("\\n"); i !== -1; i = text.indexOf("\\n", i + 2)) {
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
 * @param {MinifiedOutput} stream the stream printed into
 * @param {string} str the value
 * @param {boolean} tabs whether its tabs are written raw too
 * @returns {string} the template literal
 */
const lineBreakTemplate = (stream, str, tabs) => {
	let literal = stream.encodeString(str, "`");
	if (literal.includes("${")) literal = literal.replace(/\${/g, "\\${");
	return unescapeWhitespace(literal, tabs, true);
};
/**
 * @param {MinifiedOutput} stream the stream printed into
 * @param {string} text a program's source
 * @returns {boolean} whether its strings write their line breaks raw
 */
const writesLineBreaksRawIn = (stream, text) =>
	stream.option("ecma") >= 2015 &&
	spellsLineBreaksDensely(countLineBreakEscapes(text), text.length);

/** @typedef {"sloppy" | number} NativeCondition `unsafe`, or `builtinsEcma >= N` */
/** @typedef {string | { name: string, when: NativeCondition[] }} NativeName a name and what it is gated on */

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
 * @param {ParseModule} parse the parser, its reserved words read
 * @returns {PrintPropertyName} the printer of a property's name
 */
const createPrintPropertyName = (parse) => {
	const { ALL_RESERVED_WORDS } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string> }} */ (parse);
	const unicode = createUnicode();
	/**
	 * @param {string} key the property name
	 * @param {string | undefined} quote the quote it was written with
	 * @param {MinifiedOutput} output the stream printed into
	 * @returns {boolean} whether it printed as a bare name
	 */
	const printPropertyName = (key, quote, output) => {
		if (output.option("quoteKeys")) {
			output.printString(key);
			return false;
		}
		// eslint-disable-next-line eqeqeq
		if (`${Number(key)}` == key && Number(key) >= 0) {
			if (output.option("keepNumbers")) {
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
		if (printString || (quote && output.option("keepQuotedProps"))) {
			output.printString(key, quote);
			return false;
		}
		output.printName(key);
		return true;
	};
	return printPropertyName;
};

/** @typedef {(key: string, quote: string | undefined, output: MinifiedOutput) => boolean} PrintPropertyName prints a property's name, answering whether it printed as a bare name */

/**
 * A string's spelling made safe in an inline `<script>`, as `encodeString`
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
 * What reads a source `parse.parseTree` read into a `SyntaxTree` for the one
 * pass: its nodes' tokens, the names mangling gives and the properties.
 * @param {ParseModule} parse the parser
 * @param {ScopeMangler} scopeMangler what names the scopes
 * @returns {TreeMangler} what reads the tree
 */
const createTreeMangler = (parse, scopeMangler) => {
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
	for (const name of STATEMENT_TYPE_NAMES) {
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
		 * @returns {number} its index in the table, -1 for none
		 */
		const indexOf = (number) => (number === 0 ? -1 : number - table.base);

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
					table,
					indexOf(open),
					indexOf(close),
					indexOf(starts[expression]),
					indexOf(ends[expression])
				);
			}
			starts[expression] = open;
			ends[expression] = close;
			return expression;
		};

		read(program, false);
		return { starts, ends, types, marks, first: table.base };
	};

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
		table.forEachCommentGap((gap, list) => {
			for (const comment of table.members(list)) {
				identifiers.consider(table.commentValue(comment), -1);
			}
		});
	};

	/**
	 * Mangles a source `parse.parseTree` read as `minify` mangles terser's tree
	 * of it, the names chosen by the source's characters before the one print.
	 * @param {ParsedTree} parsed the parsed source
	 * @param {boolean} shorthand whether properties print in shorthand
	 * @param {string} text the source
	 * @param {MangleOptions} options the formatted mangle options
	 * @param {boolean} mayNamePrivate whether the source may name a private member
	 * @param {boolean=} renames false to read the scopes only, every name printing as written
	 * @param {boolean=} movesFunctions false to leave each function read once where it is declared
	 * @returns {TreeNames} the names
	 */
	const mangleTree = (
		parsed,
		shorthand,
		text,
		options,
		mayNamePrivate,
		renames = true,
		movesFunctions = true
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
				movesFunctions,
				classDeclarators: true,
				// An import's or export's name, and a key's where shorthand prints.
				spelledNames: shorthand ? 2 : 1,
				withNames: true
			},
			(node, message) => {
				const table = /** @type {TokenTable} */ (tables.last);
				const start = table.tokenPlace(read.starts[node] - table.base);
				return throwParseError(
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
			aliases: analysis.aliases || null,
			movedFunctions: analysis.movedFunctions || null,
			nameDefinitions: null,
			properties: null,
			propertyStrings: null
		};
		if (!renames) return names;
		/** @type {IdentifierSource} */
		const identifiers = options.nthIdentifier;
		if (countsFrequency(identifiers)) {
			identifiers.reset();
			considerAsPrinted(/** @type {CharacterCounter} */ (identifiers), text);
			discountComments(parsed, /** @type {CharacterCounter} */ (identifiers));
			identifiers.sort();
		}
		// The one pass names them once it has found what prints.
		names.nameDefinitions = (unprinted, readsGone) =>
			scopeMangler.mangleManglingScopes(
				analysis,
				options,
				unprinted,
				readsGone
			);
		if (!mayNamePrivate) return names;
		tree = parsed.tree;
		try {
			const kept = scopeMangler.privateNamesReadByEval(
				analysis,
				/** @type {(node: number) => string[]} */ (
					/** @type {(node: number) => string[]} */ (privateNamesDeclaredIn)
				)
			);
			// A private method's `name` is its private name, which `keepFnames`
			// keeps as it keeps the other functions' names.
			if (analysis.namesPrivate && options.keepFnames !== true) {
				/** @type {PrivateNames} */
				const state = {
					identifiers: options.nthIdentifier,
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
	 * the quoted keys `keepQuoted` reserves and the names marked for mangling
	 * are read first, then each name a property is found by, then each is
	 * renamed in the order terser's second walk meets it.
	 * @param {ParsedTree} parsed the parsed source, its tokens read
	 * @param {TreeDefinition[]} definitions each name's definition, by its node
	 * @param {string[] | null} quotedReserved the reserved names a quoted key joins, null where `keepQuoted` is off or `"strict"`
	 * @param {(annotated: Set<string>) => PropertyNames} namesOf property mangling's names, given the names marked for it
	 * @returns {{ properties: PropertyNames, strings: Set<number> }} the names, and the string literals renamed as property names
	 */
	const mangleTreeProperties = (
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
			const table = /** @type {TokenTable} */ (tables.last);
			const comments = tables.members(
				tables.commentsOf(read.starts[node], false)
			);
			for (let i = comments.length - 1; i >= 0; i--) {
				const value = table.commentValue(comments[i]);
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
	return { readTreeTokens, mangleTree, mangleTreeProperties };
};

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
 * @param {Set<MinifierVariable> | null} keptDefinitions the declarators `keepFnames` keeps, while mangling
 * @param {Set<MinifierVariable> | null=} keptClasses the declarators naming an anonymous class `keepClassnames` keeps
 * @returns {boolean} whether its name is kept
 */
const isUnmangleable = (definition, options, keptDefinitions, keptClasses) => {
	const { name } = definition;
	const scope = /** @type {MinifierScope} */ (definition.scope);
	const first = definition.kind;
	if (
		keptDefinitions !== null &&
		keptDefinitions.has(definition) &&
		keepName(options.keepFnames, name)
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
			keepName(options.keepFnames, name)) ||
		((first === DECLARES_CLASS || first === DECLARES_DEF_CLASS) &&
			keepName(options.keepClassnames, name))
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
 * The mangler, which names the scopes `analyzeMinifierTree` reads off a parsed
 * tree with its names as written.
 * @param {ParseModule} parse the parser, its reserved words read
 * @param {ReturnType<typeof createFrequency>} base54 the mangler's source of names
 * @returns {ScopeMangler} the mangler
 */
const createScopeMangler = (parse, base54) => {
	const { ALL_RESERVED_WORDS } = parse;

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
		/** @type {string | undefined} */
		let best;
		// One byte saved gzips worse than the names counted out after it shift.
		let bestSaving = 1;
		for (const [name, { saving, sites }] of saved) {
			// Its every use costs the bytes it writes past a name one long, but
			// where it is spelled, which the saving already counts.
			const net =
				saving - (Buffer.byteLength(name) - 1) * Math.max(uses - sites, 0);
			if (net > bestSaving) {
				best = name;
				bestSaving = net;
			}
		}
		return best;
	};

	/**
	 * terser's `mangle_names` over an analysis: names each label, then each
	 * definition it may rename, setting their `mangledName`.
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
		const identifiers = options.nthIdentifier;
		const { reserved, cache } = options;
		const { labels, blockDefunScopes, catchParameters } = analysis;
		/** @type {Set<MinifierVariable> | null} */
		let keptDefinitions = null;
		const { functionDeclarators, classDeclarators } = analysis;
		if (functionDeclarators !== null) {
			keptDefinitions = new Set();
			for (let i = 0; i < functionDeclarators.length; i++) {
				const identifier = functionDeclarators[i];
				if (keepName(options.keepFnames, identifier.name)) {
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
				if (keepName(options.keepClassnames, identifier.name)) {
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
			label.mangledName = name;
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
			options.keepFnames ||
			options.keepClassnames ||
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
					definition.mangledName ||
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
		const spellings = spelledNamesOf(analysis);
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
			if (definition.mangledName || isUnmangleable(definition, options, null)) {
				continue;
			}
			const redefinition = redefinedCatchDefinition(definition);
			// A dropped definition gave its name up, which another may now carry.
			if (
				redefinition &&
				(unprinted === null || !unprinted.has(redefinition))
			) {
				definition.mangledName = redefinition.mangledName || redefinition.name;
				renamed.push(definition);
				continue;
			}
			const owner = /** @type {MinifierScope} */ (definition.scope);
			// Safari reads `(function x(x) {})` in strict mode as a syntax error.
			/** @type {string | null} */
			let shadowed = null;
			const named = owner.functionName;
			if (named !== null && definition.kind === DECLARES_FUNARG) {
				shadowed = named.mangledName || named.name;
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
					definition.mangledName = spelling;
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
			definition.mangledName = name;
			renamed.push(definition);
			nameIndexes.set(name, counting.cname);
		}
		shortenBusiestNames(
			toMangle,
			renamed,
			nameIndexes,
			analysis,
			[unmangleableNames, reserved, spelled],
			readsGone
		);
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
			const name = /** @type {string} */ (definition.mangledName);
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
			if (toMangle[i].mangledName === null) kept.add(toMangle[i].name);
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
				/** @type {string} */ (definition.mangledName)
			);
			if (shorter !== undefined) definition.mangledName = shorter;
		}
	};

	/**
	 * terser's `mangle_names` as written, for the options the fast path leaves
	 * out: each definition asks its scope for a name, whose enclosed definitions
	 * it rescans.
	 * @param {MinifierVariable[]} toMangle the definitions, in the order named
	 * @param {MangleOptions} options the formatted mangle options
	 * @param {Set<MinifierVariable> | null} keptDefinitions the declarators `keepFnames` keeps
	 * @param {Set<string>} unmangleableNames names no definition may take
	 * @param {Set<MinifierScope>} blockDefunScopes the function scopes holding a block's function
	 * @param {Set<MinifierVariable> | null} keptClasses the declarators naming an anonymous class `keepClassnames` keeps
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
		const identifiers = options.nthIdentifier;
		const { reserved } = options;
		const cache = options.cache && options.cache.props;
		// The toplevel skips the names the cache hands out too.
		/** @type {Set<string>} */
		const mangledNames = new Set();
		if (cache) {
			for (const mangled of cache.values()) mangledNames.add(mangled);
		}
		// A short name kept as written may collide with one handed out.
		if (options.keepFnames || options.keepClassnames) {
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
						(definition.mangledName ||
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
				definition.mangledName = /** @type {string} */ (
					cache.get(definition.name)
				);
				continue;
			}
			if (
				definition.mangledName ||
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
				name = redefinition.mangledName || redefinition.name;
			} else if (owner.upper === null) {
				do {
					name = nextMangled(owner);
				} while (mangledNames.has(name));
			} else {
				const named = owner.functionName;
				const shadowed =
					named !== null && definition.kind === DECLARES_FUNARG
						? named.mangledName || named.name
						: null;
				for (;;) {
					name = nextMangled(owner);
					if (!shadowed || shadowed !== name) break;
				}
			}
			definition.mangledName = name;
			if (definition.global && cache) cache.set(definition.name, name);
		}
	};

	/**
	 * The private names a class declares where a direct `eval` in it can read
	 * them: from a string, which renaming cannot reach.
	 * @param {MinifierScopeAnalysis} analysis the scopes
	 * @param {(node: number) => string[]} declaredBy the private names a class scope's node declares
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
	return { mangleManglingScopes, privateNamesReadByEval };
};

/** @type {PrinterModules | undefined} */
let loaded;

/**
 * The format options defaulted and checked as terser's `OutputStream(options)`
 * does: an option it does not know, or a bad comments regexp, throws.
 * @param {Partial<FormatSettings>} given the format options, as a caller passes them
 * @returns {FormatSettings} the options, defaulted
 */
const checkFormatOptions = (given) => {
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
	return options;
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
 * @param {PrinterModules} modules the minifier's modules
 * @returns {(path: JavascriptPath, writer: JavascriptPrintContext) => string} the printer
 */
const createNodePrinter = (modules) => {
	const { Field, Flag, NodeType, Part } = require("./syntax-parser");
	const {
		PURE_ANNOTATION,
		convertedKind,
		evaluateNativeConditions,
		globalsReadWithoutEffect,
		hasSideEffects,
		selectNativeNames
	} = require("./side-effects");
	const { NODE_FIELDS } = require("./data");

	// Rollup's test of a comment marking the functions after it as running
	// nothing when called.
	const NO_SIDE_EFFECTS_ANNOTATION = /[@#]__NO_SIDE_EFFECTS__/;

	const { ALL_RESERVED_WORDS, PRECEDENCE } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string>, PRECEDENCE: Record<string, number> }} */ (
			modules.parse
		);
	const { isIdentifierString, isIdentifierCharacter } = createUnicode();
	const printPropertyName = createPrintPropertyName(modules.parse);

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
		NodeType.ChainExpression,
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
	let output = /** @type {MinifiedOutput} */ (
		/** @type {MinifiedOutput | null} */ (null)
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
	// By node, the codes its text opens and ends with, as the stream packs them.
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
	// The newest edition whose built-ins are taken as native, terser's `builtins_ecma`.
	let builtinsEcma = 5;
	// terser's `unsafe`, which takes more built-ins as running nothing.
	let unsafeBuiltIns = false;
	// The built-in functions a call of runs nothing, then their statics by
	// owner, as `builtinsEcma` and `unsafe` select them, then the statics of
	// `Object` that `unsafe` would select too.
	/** @type {[Set<PropertyKey>, Map<string, Set<PropertyKey>>, Set<PropertyKey>] | undefined} */
	let pureNatives;
	/** @type {import("./syntax-printer-data").FoldedBuiltIns | undefined} */
	let foldedTables;
	/** @type {ReturnType<typeof import("./syntax-printer-data").nativeObjectTables> | undefined} */
	let nativeObjectTablesBuilt;
	// The program printed, and the built-ins it may replace by qualified name,
	// `Math.*` for every member, null until a fold first asks.
	let foldedProgram = 0;
	/** @type {Set<string> | null} */
	let builtInWrites = null;
	// Whether converting what may be an object runs code, terser's
	// `pureConversions` turned off.
	let comparesConvert = false;
	// Whether terser's `unused` drops what nothing reads, and its `inline`
	// prints a function where it is called.
	let dropsUnused = false;
	let inlinesFunctions = false;
	// Whether a `debugger` statement goes, and a global `Infinity` prints as written.
	let dropsDebugger = false;
	let keepsInfinity = false;
	// The calls `pureFuncs` names, by how their callee is written.
	/** @type {Set<string> | null} */
	let pureFunctions = null;
	// The `console` methods whose calls go, true for every one.
	/** @type {Set<string> | true | null} */
	let droppedConsole = null;
	// The globals `globalDefs` replaces, by name, each with a primitive value.
	/** @type {Map<string, string | number | boolean | null> | null} */
	let globalDefs = null;
	// What answers whether `topRetain` keeps a top-level name.
	/** @type {((definition: MinifierVariable) => boolean) | null} */
	let retainsTop = null;
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
	// Whether a `#__PURE__` annotation marks a call pure, as `sideEffects` has it.
	let readsPureAnnotations = false;
	// The functions and names a `#__NO_SIDE_EFFECTS__` comment marks, a call
	// to which runs nothing, each with 0 or, for a name a declarator sets, that
	// declarator, the name unset before it ends.
	/** @type {Map<number | MinifierVariable, number>} */
	const sideEffectFree = new Map();
	// The declarators an `export` declares, statements of the module's body.
	/** @type {Set<number>} */
	const exportedDeclarators = new Set();
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
	// By comparison of equality printed, where its operator is in its text,
	// times four, plus which of `EQUALITIES` it is: `!` before it prints as
	// the opposite one, the index with its lowest bit flipped, in place.
	/** @type {Map<number, number>} */
	const equalityAt = new Map();
	// Each `+` printing as one template, `templatePlus`'s join.
	/** @type {Set<number>} */
	const templateJoins = new Set();
	const EQUALITIES = ["==", "!=", "===", "!=="];
	// The comparisons with `0` printed as the `!x` of the integer compared.
	/** @type {Set<number>} */
	const negatedIntegers = new Set();
	// The `&&` and `||` of a `!!` printed negated, `!!(!a&&b)` as `!(a||!b)`,
	// and the inner `!` printing that bare for the outer one to wrap.
	/** @type {Set<number>} */
	const pushedNegations = new Set();
	// By `&&` or `||` a `!` negates, whether the `!` goes into its operands.
	/** @type {Map<number, boolean>} */
	const negatedOperations = new Map();
	// The equalities of those operands, printed negated.
	/** @type {Set<number>} */
	const negatedEqualities = new Set();
	// The `if`s whose test continues the `if(!t&&` of the `if` guarding them.
	/** @type {Set<number>} */
	const andedIfs = new Set();
	// The `if`s printing `if(!t){` for the statements after them, whose list
	// then closes the brace.
	/** @type {Set<number>} */
	const guardedBlocks = new Set();
	// How many statements the list `displayBody` printed last printed as,
	// and whether the last owes a `;`.
	let listedStatements = 0;
	let listOwesSemicolon = false;
	// By `return` after an `if` printing `return t?` for `return!t?x:`, the
	// branch it prints after its own value.
	/** @type {Map<number, number>} */
	const swappedReturns = new Map();
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
	// Whether the top level is a module's, whose `var`s the global object holds
	// no property for, which a write through it would set uncounted.
	let modulesToplevel = false;
	// Whether a function's or class's name nothing reads stays, `keepFnames`
	// and `keepClassnames`.
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
	// By definition set to an array of constants, the array: each read of it
	// at a known index prints that element, once every reference is one.
	/** @type {Map<MinifierVariable, number>} */
	const constantArrays = new Map();
	// By such a definition, how many of its reads are at a known index, and
	// how much longer their elements print than they do.
	/** @type {Map<MinifierVariable, [number, number]>} */
	const indexReads = new Map();
	// The definitions of `constantArrays` whose reads print their elements.
	/** @type {Set<MinifierVariable>} */
	const inlinedArrays = new Set();
	// The constants a read prints the name of, the value no shorter.
	/** @type {Set<MinifierVariable>} */
	const keptForSize = new Set();
	// Whether a constant folds where it is printed: only what is inlined.
	let foldsAtPrint = false;
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
			? definition.mangledName || definition.name
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
					? soleStatement(parent) === node || sequenceReturn(parent) === node
					: reducing.size !== 0 &&
							reducing.get(grandparent) === childOf(Field.argument, node);
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
			output.option("wrapIife") ||
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
				return !negatesCall(parent) && !inConditionalForm(level + i + 1);
			}
			// A declarator that goes but runs its value prints it as a statement.
			if (
				type === NodeType.VariableDeclarator &&
				parent < foundSize &&
				dropped[parent] === 1 &&
				// Folded into its read, the value prints there instead.
				keepsOwnEffect(parent) &&
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
	 * @param {number} level where a statement's parent is among the printed one's
	 * @returns {boolean} whether the statement is a branch of an `if` printing as a conditional, so an operand
	 */
	const inConditionalForm = (level) => {
		let parent = parentAt(level);
		if (typeOf(parent) === NodeType.BlockStatement) {
			parent = parentAt(level + 1);
		}
		return (
			compresses &&
			typeOf(parent) === NodeType.IfStatement &&
			ifForm(parent) === CONDITIONAL_FORM
		);
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
		const table = /** @type {TokenTable} */ (tables.last);
		for (let i = from; i <= to; i++) {
			const node = parentAt(i);
			if (!hasComments(starts[node], 1)) continue;
			const list = tables.commentsOf(starts[node], false);
			if (list === undefined || output.listPrinted(list)) continue;
			for (const comment of table.members(list)) {
				if (
					!output.commentPrinted(comment) &&
					output.commentFilter(node, table, comment) &&
					output.filterComment(table.commentValue(comment)) !== "" &&
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
	 * @param {number} comment the comment
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
			const table = /** @type {TokenTable} */ (tables.last);
			for (let token = starts[holder]; token < start; token++) {
				if (!table.opensParenthesis(token - table.base)) return false;
			}
			const held = tables.commentsOf(starts[holder], false);
			if (tables.members(held).includes(comment)) return true;
		}
	};

	/**
	 * @param {number} node an `export default`
	 * @returns {boolean} whether it prints its value in parentheses
	 */
	const exportDefaultWraps = (node) => {
		const declaration = childOf(Field.declaration, node);
		const type = typeOf(declaration);
		// Bare, an anonymous function would be a declaration, set before
		// the module runs: in a cycle, read earlier.
		return (
			exportsValue(node) &&
			((type === NodeType.FunctionExpression &&
				tree.type(declaration) === NodeType.FunctionExpression) ||
				(type === NodeType.ClassExpression &&
					tree.field(0, Field.id, declaration) !== 0 &&
					!dropsName(tree.field(0, Field.id, declaration), keepsClassNames)))
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
	 * @param {number} node a node, printed or being printed
	 * @returns {boolean} whether it printed as a name or names joined by `.`, compressing
	 */
	const printedBareName = (node) => {
		if (!compresses) return false;
		const text = /** @type {JavascriptPrintContext} */ (writer).get(node);
		return text !== undefined && BARE_NAMES.test(text);
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
			// A sequence or conditional printed as one name takes none.
			((type === NodeType.ConditionalExpression ||
				type === NodeType.SequenceExpression) &&
				!printedBareName(tag)) ||
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
				return (
					printsEmptyObject(node) || leftIsObject(childOf(Field.callee, node))
				);
			case NodeType.NewExpression:
				return printsEmptyObject(node);
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
			case NodeType.Identifier: {
				// A read prints the value folded into it.
				if (collapsed.size === 0 || !collapsed.has(node)) return false;
				const value = /** @type {number} */ (collapsed.get(node));
				return leftIsObject(
					dropsWrite[value] === 1 ? childOf(Field.right, value) : value
				);
			}
		}
		return isBinary(node) && leftIsObject(childOf(Field.left, node));
	};

	/**
	 * terser's `a|(b|c)` as `a|b|c`: a bitwise `|`, `&` or `^`, the right
	 * operand of the same one, groups either way.
	 * @param {number} node a binary expression
	 * @param {number} parent its parent, a binary expression
	 * @param {string | null} operator its operator
	 * @param {string | null} parentOperator its parent's operator
	 * @returns {boolean} whether it prints bare as that right operand
	 */
	const reassociates = (node, parent, operator, parentOperator) =>
		compresses &&
		operator === parentOperator &&
		(operator === "|" || operator === "&" || operator === "^") &&
		typeOf(node) === NodeType.BinaryExpression &&
		node === childOf(Field.right, parent) &&
		!hasEdgeComments(node);

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
					(node === childOf(Field.right, parent) || parentOperator === "**") &&
					!reassociates(node, parent, operator, parentOperator))
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
			output.option("wrapIife") &&
			isCallType(parentType) &&
			childOf(Field.callee, parent) === node
		) {
			return true;
		}
		return Boolean(
			output.option("wrapFuncArgs") &&
			isCallType(parentType) &&
			argumentIndex(parent, node) !== -1
		);
	};

	/**
	 * @param {number} node an object literal, or what prints as one
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it opens its statement, where it would read as a block
	 */
	const objectNeedsParens = (node, level) =>
		!opensAfterParenthesis(node, level) &&
		firstInStatement(node, level) === true;

	/**
	 * oxc's `(a(),b)+c` as `a(),b+c`: a sequence opening an operation a
	 * statement is prints bare, its last value then the operand.
	 * @param {number} node a sequence
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it does: its last value a name or a member of one, which binds tighter than any operator but `**`
	 */
	const opensStatementBare = (node, level) => {
		const parent = parentAt(level);
		const type = typeOf(parent);
		if (
			!compresses ||
			(type !== NodeType.BinaryExpression &&
				type !== NodeType.LogicalExpression) ||
			childOf(Field.left, parent) !== node ||
			operatorOf(parent) === "**" ||
			isPrivateIn(parent) ||
			hasEdgeComments(node)
		) {
			return false;
		}
		// An operation it opens prints its operands after it, as one holding that does.
		let opened = parent;
		let at = level + 1;
		for (;;) {
			const holder = parentAt(at);
			const holderType = typeOf(holder);
			if (
				(holderType !== NodeType.BinaryExpression &&
					holderType !== NodeType.LogicalExpression) ||
				childOf(Field.left, holder) !== opened ||
				isPrivateIn(holder)
			) {
				break;
			}
			opened = holder;
			at++;
		}
		const statement = parentAt(at);
		// An inlined body's statement may print as an operand, `x||…`.
		if (
			typeOf(statement) !== NodeType.ExpressionStatement ||
			childOf(Field.expression, statement) !== opened ||
			inConditionalForm(at + 1) ||
			(unreadStatements.size !== 0 && unreadStatements.has(statement))
		) {
			return false;
		}
		const last = itemOf(
			tree.fieldCount(Field.expressions, node) - 1,
			Field.expressions,
			node
		);
		const name =
			typeOf(last) === NodeType.MemberExpression &&
			!tree.flag(Flag.computed, last) &&
			!tree.flag(Flag.optional, last)
				? childOf(Field.object, last)
				: last;
		// A name a value collapsed into prints as that value.
		return (
			typeOf(name) === NodeType.Identifier &&
			tree.type(name) === NodeType.Identifier &&
			(collapsed.size === 0 || !collapsed.has(name))
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
					output.option("wrapFuncArgs") &&
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
				// One nobody reads prints what its values run, taking what that takes.
				if (level === 0 && unreadPartsOf(node, parent) !== null) return false;
				return objectNeedsParens(node, level);
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
				if (opensStatementBare(node, level)) return false;
				if (level === 0 && constructsPastSequence(node)) {
					// A function called opens the statement as its own would.
					return (
						typeOf(parent) === NodeType.CallExpression &&
						functionNeedsParens(node, level)
					);
				}
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
				// One printing as a template is a primary expression.
				if (
					compresses &&
					level === 0 &&
					(templatePlus(node) ||
						(addsToString(node) &&
							addsToString(childOf(Field.left, node)) &&
							templateRun(node) !== undefined))
				) {
					return false;
				}
				return binaryNeedsParens(node, level);
			case NodeType.LogicalExpression:
				if (level === 0 && foldsToBareValue(node)) return false;
				if (level === 0 && foldsToNegated(node, parent)) return false;
				// `a&&(b&&c)` is `a&&b&&c`, and so for `||` and `??`.
				if (
					compresses &&
					typeOf(parent) === NodeType.LogicalExpression &&
					operatorOf(parent) === operatorOf(node) &&
					!hasEdgeComments(node) &&
					// One folding to an assignment keeps what that needs.
					foldsToAssignment(node) === 0
				) {
					return false;
				}
				// Printing as its left side, that one's parentheses do.
				if (level === 0 && truthOperand(node) !== 0) {
					return (
						isUnaryType(typeOf(parent)) &&
						!NEGATES_BARE[typeOf(childOf(Field.left, node))]
					);
				}
				// Folding to an assignment, it takes what that takes.
				if (level === 0 && foldsToAssignment(node) !== 0) {
					return assignNeedsParens(node, 0);
				}
				return binaryNeedsParens(node, level);
			case NodeType.AssignmentPattern:
				return binaryNeedsParens(node, level);
			case NodeType.ConditionalExpression:
				if (level === 0 && foldsToBareValue(node)) return false;
				if (level === 0 && foldsToNegated(node, parent)) return false;
				// One printing as `!t`, `!!t` or a bare `t` takes what that takes.
				if (level === 0 && compresses && printsAsNegation(node)) {
					return !takesUnary(node);
				}
				// A default takes an operation bare, which `?:` prints as here.
				if (
					level === 0 &&
					compresses &&
					typeOf(parent) === NodeType.AssignmentPattern &&
					printsAsOperation(node)
				) {
					return false;
				}
				// Printing as `&&` or `||`, it takes what that takes as a test or operand.
				if (
					level === 0 &&
					(typeOf(parent) === NodeType.LogicalExpression ||
						(typeOf(parent) === NodeType.ConditionalExpression &&
							childOf(Field.test, parent) === node))
				) {
					const logical = truthLogicalOf(node);
					if (logical !== null) {
						return (
							logical[1] === "||" &&
							typeOf(parent) === NodeType.LogicalExpression &&
							operatorOf(parent) === "&&"
						);
					}
				}
				return assignNeedsParens(node, level);
			case NodeType.AssignmentExpression:
				if (level === 0 && foldsToAssignment(parent) === node) return false;
				if (level === 0 && printsBareValue(node, parent)) return false;
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
				// A chain an optional `?.` continues reads the same unbroken.
				return (
					isCalledOrAccessed(node, parent) &&
					!(
						compresses &&
						tree.flag(Flag.optional, parent) &&
						(typeOf(parent) === NodeType.MemberExpression ||
							typeOf(parent) === NodeType.CallExpression)
					)
				);
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
				if (printsEmptyObject(node)) return objectNeedsParens(node, level);
				const parentType = typeOf(parent);
				const calleeIsFunction =
					typeOf(childOf(Field.callee, node)) === NodeType.FunctionExpression;
				if (
					(parentType === NodeType.NewExpression &&
						childOf(Field.callee, parent) === node &&
						// One printing as its answer parenthesizes only a sign.
						!(compresses && foldedCallValue(node) !== undefined)) ||
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
				if (printsEmptyObject(node)) return objectNeedsParens(node, level);
				const type = typeOf(parent);
				// Printing as a call, it takes what a call takes.
				if (compresses && constructsWhenCalled(node)) {
					return (
						type === NodeType.NewExpression &&
						childOf(Field.callee, parent) === node
					);
				}
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
		if (
			level === 0 &&
			typeOf(node) === NodeType.SequenceExpression &&
			printsBareItem(node)
		) {
			return false;
		}
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
			output.printName(nameOf(child));
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
	 * @param {number} head the codes of its first two characters, as the stream packs them
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
	 * Moves the children the node being printed placed past a character its
	 * text no longer holds back by one.
	 * @param {number} at where the character was in that text
	 * @returns {void}
	 */
	const movePlacementsBack = (at) => {
		if (placements === null) return;
		for (
			let i = placements.length - 3;
			i >= 0 && placements[i] === current;
			i -= 3
		) {
			if (placements[i + 2] > at) placements[i + 2]--;
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
	 * @param {number | undefined} list the comments at a token
	 * @returns {boolean} whether any of them prints
	 */
	const printsAnyComment = (list) => {
		if (list !== undefined) {
			const table = /** @type {TokenTable} */ (output.tokenTables.last);
			for (const comment of table.members(list)) {
				if (
					output.commentFilter(0, table, comment) &&
					output.filterComment(table.commentValue(comment)) !== ""
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
		const after = output.claimAppendComments(node);
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
				: output.claimPrependComments(child, takes === TAKES_VALUE);
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
		const beforeComments = tables.members(before);
		// A list empty everywhere may be one shared list.
		const sharesStart =
			beforeComments.length !== 0
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
		if (beforeComments.length === 0) return TAKES_ALL;
		const table = /** @type {TokenTable} */ (tables.last);
		for (let level = -1; ; level++) {
			const holder = level < 0 ? current : parentAt(level);
			if (holder === 0) return TAKES_ALL;
			const holderStart = starts[holder];
			for (let token = holderStart; token < start; token++) {
				if (!table.opensParenthesis(token - table.base)) return TAKES_ALL;
			}
			const held = tables.commentsOf(holderStart, false);
			if (tables.members(held).includes(beforeComments[0])) return TAKES_NONE;
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
			// A `new` printing as a call opens with its callee.
			case NodeType.NewExpression:
				return compresses && constructsWhenCalled(parent)
					? childOf(Field.callee, parent)
					: undefined;
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
	/** @type {NodeAccess} */
	const commentAccess = /** @type {NodeAccess} */ ({
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
	for (const name of STATEMENT_TYPE_NAMES) {
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
		// The `return` the statements printed last continue: `return a(),b`.
		let returning = 0;
		// asm.js reads its statements as written.
		const joins = compresses && !usesAsm(owner);
		// An arrow's body joining whole into its `return` prints as what that
		// returns where `sequenceReturn` reads it so, and in braces otherwise.
		const arrowBody =
			typeOf(current) === NodeType.ArrowFunctionExpression &&
			childOf(Field.body, current) === owner;
		let printedBefore = false;
		// Where each `if(!t){` ended and the statements printed before it, its
		// brace closing with the list or going where one statement follows.
		/** @type {number[]} */
		const guards = [];
		let statements = 0;
		// Whether the last statement printed, or the first, printed as one.
		let lastSingle = true;
		let firstSingle = true;
		// Beautified, a program's first statement opens no line of its own.
		let opensLine = typeOf(owner) !== NodeType.Program;
		// terser's `join_vars`: a `var` setting nothing joins the first `var`.
		const firstVar = joins && !beautifies ? firstPrintedVar(owner) : 0;
		/** @type {number[]} */
		const bareVars = firstVar === 0 ? [] : laterBareVars(owner, firstVar);
		for (let i = 0; i < count; i++) {
			const statement = tree.field(i, Field.body, owner);
			if (
				printsNothing(statement) ||
				(i === count - 1 && compresses && endsFunction(statement, owner)) ||
				(bareVars.length !== 0 && bareVars.includes(statement)) ||
				// A call of a function running nothing may print nothing.
				(compresses &&
					typeOf(statement) === NodeType.ExpressionStatement &&
					!holdsComments(statement) &&
					/** @type {JavascriptPrintContext} */ (writer).get(statement)
						.length === 0)
			) {
				/** @type {JavascriptPrintContext} */ (writer).consume(statement);
				continue;
			}
			const kind = compresses
				? joins
					? joinableKind(statement)
					: declarationKind(statement)
				: null;
			if (statement === returning) {
				printJoined(statement, "return");
			} else if (kind !== null && kind === joinable) {
				printJoined(statement, kind);
			} else if (
				kind === "expression" &&
				(returning = joinedReturn(
					owner,
					i + 1,
					statement,
					!printedBefore && arrowBody,
					!printedBefore &&
						typeOf(owner) === NodeType.BlockStatement &&
						typeOf(parentAt(0)) === NodeType.IfStatement &&
						!holdsComments(owner)
				)) !== 0
			) {
				if (beautifies) {
					if (opensLine) output.print("\n");
					opensLine = true;
				}
				output.print("return");
				output.space();
				statements++;
				lastSingle = true;
				const item = sequenceItem(statement);
				/** @type {JavascriptPrintContext} */ (writer).consume(statement);
				printSlice(item);
			} else if (typeOf(statement) !== NodeType.EmptyStatement) {
				if (beautifies) {
					if (opensLine) output.print("\n");
					opensLine = true;
				}
				printNode(statement);
				if (
					returnedBy.size === 0 ||
					!returnedBy.has(statement) ||
					ifForm(/** @type {number} */ (returnedBy.get(statement))) !==
						RETURN_FORM
				) {
					statements++;
					lastSingle = printsAsOne(statement, owner);
					if (statements === 1) firstSingle = lastSingle;
				}
				// The `else` it ended with takes the statement after it.
				if (exitElses.size !== 0 && exitElses.has(statement)) {
					output.mightNeedSpace = true;
				}
				if (guardedBlocks.size !== 0 && guardedBlocks.has(statement)) {
					guards.push(output.text.length, statements);
				}
			} else if (
				commentTokens !== null &&
				hasComments(commentTokens.starts[statement], 1)
			) {
				// terser prints an empty statement's comments, not the statement.
				const taken = output.claimPrependComments(statement);
				if (taken !== undefined) output.printPrependComments(taken);
			}
			if (statement === firstVar) {
				for (const bare of bareVars) printJoined(bare, "var");
			}
			joinable = kind;
			printedBefore = true;
		}
		// What follows the first `if(!t){` prints inside it.
		listedStatements =
			guards.length !== 0 ? guards[1] : firstSingle ? statements : 0;
		for (let i = guards.length - 2; i >= 0; i -= 2) {
			const at = guards[i];
			const { text } = output;
			if (
				statements - guards[i + 1] === 1 &&
				lastSingle &&
				text.charCodeAt(at - 1) === 123
			) {
				// One statement takes no braces.
				output.text = text.slice(0, at - 1) + text.slice(at);
				movePlacementsBack(at - 1);
			} else {
				output.print("}");
			}
		}
		listOwesSemicolon = output.mightNeedSemicolon;
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
					return true;
				case NodeType.ObjectExpression: {
					// One nobody reads printed what its values run.
					const parts =
						unreadParts.size === 0 ? undefined : unreadParts.get(node);
					if (!parts) return true;
					node = parts[0];
					break;
				}
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
				case NodeType.NewExpression: {
					if (printsEmptyObject(node)) return true;
					if (typeOf(node) === NodeType.NewExpression) return false;
					// A call printing as its function's value opens as that.
					const fn =
						reducedCalls.size === 0 ? undefined : reducedCalls.get(node);
					node =
						fn === undefined
							? childOf(Field.callee, node)
							: /** @type {number} */ (reducing.get(fn));
					break;
				}
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
				case NodeType.ChainExpression:
					node = childOf(Field.expression, node);
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
	 * nothing writes, two bytes shorter, where it compresses.
	 * @param {number} node the declaration
	 * @param {boolean} exported whether an `export` holds it
	 * @returns {string} its keyword
	 */
	const kindOf = (node, exported) => {
		const kind = /** @type {string} */ (tree.textOf(Part.kind, node));
		if (kind !== "const" || !compresses || exported) return kind;
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
		if (typeOf(statement) === NodeType.ExpressionStatement) {
			return joinsExpression(statement) ? "expression" : null;
		}
		if (voidTails.size !== 0 && voidTails.has(statement)) return "expression";
		if (typeOf(statement) === NodeType.IfStatement) {
			// One joined to its loop's test prints as the branch it keeps.
			const rest =
				breakElses.size === 0 ? undefined : breakElses.get(statement);
			if (rest !== undefined) {
				return typeOf(rest) === NodeType.ExpressionStatement &&
					!hasEdgeComments(statement) &&
					joinsExpression(rest, statement)
					? "expression"
					: null;
			}
			const form = ifForm(statement);
			return form === CONDITIONAL_FORM &&
				!hasEdgeComments(statement) &&
				!opensParenthesized(statement, childOf(Field.test, statement)) &&
				!(unreadStatements.size !== 0 && unreadStatements.has(statement)) &&
				/** @type {JavascriptPrintContext} */ (writer).get(statement).length !==
					0
				? "expression"
				: null;
		}
		return declarationKind(statement);
	};

	/**
	 * @param {number} statement a statement of a list
	 * @returns {string | null} the kind of declaration it is, which one of its kind printed just before it continues, null where it is none or prints apart
	 */
	const declarationKind = (statement) => {
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
	 * @param {number} statement a statement of a list, printed
	 * @param {number} start the expression it opens with
	 * @returns {boolean} whether it took the parentheses opening a statement takes, which it would keep printed in a sequence
	 */
	const opensParenthesized = (statement, start) =>
		/** @type {JavascriptPrintContext} */ (writer)
			.get(statement)
			.charCodeAt(0) === 40 && opensAmbiguously(start);

	/**
	 * terser's `sequences` of expression statements: `a();b()` is `a(),b()`.
	 * @param {number} statement an expression statement of a list
	 * @param {number=} printed the statement of the list printing as it, itself by default
	 * @returns {boolean} whether it may print as one with the one before it
	 */
	const joinsExpression = (statement, printed = statement) =>
		tree.textOf(Part.directive, statement) === null &&
		// A string where directives may be prints a `;` first, ending a `return`.
		!isStringStatement(statement) &&
		/** @type {JavascriptPrintContext} */ (writer)
			.get(printed)
			.charCodeAt(0) !== 59 &&
		!opensParenthesized(printed, childOf(Field.expression, statement)) &&
		dropped[statement] === 0 &&
		!hasEdgeComments(statement) &&
		!(unreadStatements.size !== 0 && unreadStatements.has(statement)) &&
		!(
			droppedConsole !== null &&
			callsDroppedConsole(childOf(Field.expression, statement))
		) &&
		/** @type {JavascriptPrintContext} */ (writer).get(printed).length !== 0;

	/**
	 * @param {number} statement a `return` of a value
	 * @returns {boolean} whether it printed as `return` and a value, not a bare `return` or what an `if` before it continues
	 */
	const printsReturnValue = (statement) => {
		const text = /** @type {JavascriptPrintContext} */ (writer).get(statement);
		return text.length > 6 && text.startsWith("return");
	};

	/**
	 * terser's `sequences` into a `return`: the one after the expression
	 * statements from an index, which they then print in.
	 * @param {number} owner the node whose `body` lists the statements
	 * @param {number} from the index of the first after the one printing
	 * @param {number} first the one printing
	 * @param {boolean} opensArrow whether it opens an arrow's body, which joins only in part
	 * @param {boolean=} opensBody whether it opens the block an `if` holds, whose braces go where the `return` is all it prints
	 * @returns {number} the `return`, or 0 where none follows them or printing in it takes a space more and saves no braces
	 */
	const joinedReturn = (owner, from, first, opensArrow, opensBody = false) => {
		const count = tree.fieldCount(Field.body, owner);
		if (opensArrow) {
			// Joining the arrow's whole body, it would print as `=>(a,b)` reprinted.
			let end = count - 1;
			while (end >= from && printsNothing(tree.field(end, Field.body, owner))) {
				end--;
			}
			if (end >= from) {
				const joined = joinedReturn(owner, from, first, false);
				// A `return t?x:` the `return` after it ends ends the body too.
				if (
					joined === tree.field(end, Field.body, owner) ||
					typeOf(joined) === NodeType.IfStatement
				) {
					return 0;
				}
			}
		}
		for (let i = from; i < count; i++) {
			const statement = tree.field(i, Field.body, owner);
			if (printsNothing(statement)) continue;
			if (joinableKind(statement) === "expression") continue;
			if (
				typeOf(statement) === NodeType.IfStatement
					? // `if(t)return x;return y` printing as `return t?x:y`.
						ifForm(statement) !== RETURN_FORM
					: typeOf(statement) !== NodeType.ReturnStatement ||
						childOf(Field.argument, statement) === 0 ||
						(returnedBy.size !== 0 &&
							returnedBy.has(statement) &&
							ifForm(/** @type {number} */ (returnedBy.get(statement))) ===
								RETURN_FORM)
			) {
				return 0;
			}
			if (hasEdgeComments(statement) || !printsReturnValue(statement)) {
				return 0;
			}
			// `a=1;return(b)` is no shorter as `return a=1,(b)`, but for braces.
			if (
				/** @type {JavascriptPrintContext} */ (writer)
					.get(statement)
					.charCodeAt(6) !== 32 &&
				startsAfterSpace(sequenceItem(first))
			) {
				if (!opensBody) return 0;
				for (let j = i + 1; j < count; j++) {
					if (!printsNothing(tree.field(j, Field.body, owner))) return 0;
				}
			}
			return statement;
		}
		return 0;
	};

	/**
	 * @param {number} statement an expression statement joining others
	 * @returns {string} its text in a sequence, where a `!` opening a call of a function expression is no longer needed
	 */
	const sequenceItem = (statement) => {
		const text = /** @type {JavascriptPrintContext} */ (writer).get(statement);
		return typeOf(statement) === NodeType.ExpressionStatement &&
			negatesCall(statement)
			? text.slice(1)
			: text;
	};

	/**
	 * @param {string} text a text printed after a keyword
	 * @returns {boolean} whether it opens with a character of a name, so the keyword needs a space before it
	 */
	const startsAfterSpace = (text) => {
		const code = text.charCodeAt(0);
		return (
			code > 127 ||
			code === 36 ||
			code === 92 ||
			code === 95 ||
			(code >= 48 && code <= 57) ||
			(code >= 65 && code <= 90) ||
			(code >= 97 && code <= 122)
		);
	};

	/**
	 * Prints a declaration as the declarators of the one printed just before:
	 * its keyword left out, a comma for the semicolon the other owed.
	 * @param {number} statement the declaration
	 * @param {string} kind its keyword
	 * @returns {void}
	 */
	const printJoined = (statement, kind) => {
		const text =
			kind === "expression"
				? sequenceItem(statement)
				: /** @type {JavascriptPrintContext} */ (writer).get(statement);
		/** @type {JavascriptPrintContext} */ (writer).consume(statement);
		output.mightNeedSemicolon = false;
		output.print(",");
		if (beautifies) output.space();
		const from =
			kind === "expression"
				? 0
				: text.charCodeAt(kind.length) === 32
					? kind.length + 1
					: kind.length;
		printSlice(text.slice(from));
		if ((endState[statement] & OWES_SEMICOLON) !== 0) {
			output.mightNeedSemicolon = true;
		}
	};

	/**
	 * @param {number} owner the node whose `body` lists the statements
	 * @returns {number} its first statement printing as a `var`, 0 for none
	 */
	const firstPrintedVar = (owner) => {
		const count = tree.fieldCount(Field.body, owner);
		for (let i = 0; i < count; i++) {
			const statement = tree.field(i, Field.body, owner);
			if (
				typeOf(statement) === NodeType.VariableDeclaration &&
				tree.textOf(Part.kind, statement) === "var" &&
				!printsNothing(statement) &&
				!printsApart(statement) &&
				/** @type {JavascriptPrintContext} */ (writer)
					.get(statement)
					.startsWith("var")
			) {
				return statement;
			}
		}
		return 0;
	};

	/**
	 * @param {number} owner the node whose `body` lists the statements
	 * @param {number} first the first statement printing as a `var`
	 * @returns {number[]} the `var`s after it declaring names only, which may print in it
	 */
	const laterBareVars = (owner, first) => {
		/** @type {number[]} */
		const bare = [];
		const count = tree.fieldCount(Field.body, owner);
		let i = 0;
		while (tree.field(i, Field.body, owner) !== first) i++;
		for (i++; i < count; i++) {
			const statement = tree.field(i, Field.body, owner);
			if (
				typeOf(statement) !== NodeType.VariableDeclaration ||
				tree.textOf(Part.kind, statement) !== "var" ||
				holdsComments(statement) ||
				printsNothing(statement) ||
				!(
					/** @type {JavascriptPrintContext} */ (writer)
						.get(statement)
						.startsWith("var")
				)
			) {
				continue;
			}
			let names = true;
			for (
				let j = tree.fieldCount(Field.declarations, statement) - 1;
				j >= 0;
				j--
			) {
				const declarator = tree.field(j, Field.declarations, statement);
				if (
					typeOf(tree.field(0, Field.id, declarator)) !== NodeType.Identifier ||
					(childOf(Field.init, declarator) !== 0 &&
						!(deadInits.size !== 0 && deadInits.has(declarator)))
				) {
					names = false;
					break;
				}
			}
			if (names) bare.push(statement);
		}
		return bare;
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
			const taken = output.claimAppendComments(owner, true);
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
			if (beautifies) output.print("\n");
			printNode(statement);
			if (beautifies) output.print("\n");
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
			output.forceSemicolon();
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
			case NodeType.ArrowFunctionExpression:
				return childOf(Field.body, parent) === node;
			case NodeType.PropertyDefinition:
				return childOf(Field.value, parent) === node;
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
	 * @param {number} node a name
	 * @returns {boolean} whether it reads a built-in constructor nothing assigns, one constructing the same called without `new`
	 */
	const readsBuiltInConstructor = (node) => {
		if (typeOf(node) !== NodeType.Identifier || mangledNames === null) {
			return false;
		}
		if (constructedWhenCalled === undefined) {
			constructedWhenCalled = new Set(
				require("./syntax-printer-data").foldedBuiltIns().constructedWhenCalled
			);
		}
		const definition = mangledNames[node];
		return (
			constructedWhenCalled.has(tree.name(node)) &&
			isMinifierVariable(definition) &&
			definition.undeclared &&
			!definition.written &&
			!(/** @type {MinifierScope} */ (definition.scope).isPinned())
		);
	};

	/**
	 * Whether a `new` of a built-in nothing assigns constructs as a call of it
	 * does, as webpack's improvements have it; a `RegExp` call hands back an
	 * expression it is given, so only one of a primitive or nothing does.
	 * @param {number} node the `new`
	 * @returns {boolean} true where it prints as the call
	 */
	const constructsWhenCalled = (node) => {
		const callee = childOf(Field.callee, node);
		return (
			readsBuiltInConstructor(callee) &&
			(tree.name(callee) !== "RegExp" || patternIsPrimitive(node))
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
	// The binary operators an assignment of the name they read first takes.
	/** @type {Record<string, number>} */
	const COMPOUND_OPERATORS = Object.create(null);
	for (const operator of [
		"+",
		"-",
		"*",
		"/",
		"%",
		"**",
		"<<",
		">>",
		">>>",
		"&",
		"|",
		"^"
	]) {
		COMPOUND_OPERATORS[operator] = 1;
	}
	// What binds more tightly than `===`, so as to print bare on either side of it.
	const ABOVE_EQUALITY = new Uint8Array(256);
	for (const type of [
		NodeType.Identifier,
		NodeType.Literal,
		NodeType.MemberExpression,
		NodeType.CallExpression,
		NodeType.ThisExpression,
		NodeType.TemplateLiteral,
		NodeType.UnaryExpression
	]) {
		ABOVE_EQUALITY[type] = 1;
	}
	// What binds less tightly than `||`, so as its right side needs parentheses.
	const BELOW_OR = new Uint8Array(256);
	BELOW_OR[NodeType.AssignmentExpression] = 1;
	BELOW_OR[NodeType.ConditionalExpression] = 1;
	BELOW_OR[NodeType.SequenceExpression] = 1;
	BELOW_OR[NodeType.ArrowFunctionExpression] = 1;
	BELOW_OR[NodeType.YieldExpression] = 1;
	const LOOP_TYPES = new Uint8Array(256);
	LOOP_TYPES[NodeType.ForStatement] = 1;
	LOOP_TYPES[NodeType.ForInStatement] = 1;
	LOOP_TYPES[NodeType.ForOfStatement] = 1;
	LOOP_TYPES[NodeType.WhileStatement] = 1;
	LOOP_TYPES[NodeType.DoWhileStatement] = 1;

	/**
	 * @param {MinifierVariable} definition a name's definition
	 * @returns {boolean} whether the name may go: one not top-level, or one `toplevel` drops and `topRetain` does not keep
	 */
	const mayDrop = (definition) =>
		!definition.global ||
		(dropsToplevel && (retainsTop === null || !retainsTop(definition)));

	/**
	 * Whether a name declares a binding nothing reads or writes, terser's
	 * `unused`: not exported, in no scope `eval` or `with` reaches, and at the
	 * top level only where that is private.
	 * @param {number} id the declared name
	 * @returns {boolean} true where its declaration may go
	 */
	const isUnusedBinding = (id) =>
		mayGoUnread(id) &&
		/** @type {MinifierVariable} */ (
			/** @type {TreeDefinition[]} */ (mangledNames)[id]
		).referenceCount <=
			(droppedReads.get(/** @type {TreeDefinition[]} */ (mangledNames)[id]) ||
				0);

	/**
	 * Whether a name's declaration may go once nothing printed reads it.
	 * @param {number} id the declared name
	 * @returns {boolean} true where only its reads keep its declaration
	 */
	const mayGoUnread = (id) => {
		if (
			!dropsUnused ||
			mangledNames === null ||
			typeOf(id) !== NodeType.Identifier
		) {
			return false;
		}
		const definition = mangledNames[id];
		return (
			isMinifierVariable(definition) &&
			// Declared once, as nothing else: a parameter `arguments` reads stays.
			definition.declarations === 1 << definition.kind &&
			definition.identifiers.length <= 1 &&
			definition.export === 0 &&
			!definition.undeclared &&
			mayDrop(definition) &&
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
		const context = effectsContext();
		context.decides = throwingThis.size === 0 ? undefined : thisMayThrow;
		// What folds to a value only converts primitives, which runs nothing.
		if (evaluateConstant(node) !== undefined) return true;
		if (
			typeOf(node) === NodeType.ChainExpression &&
			dropsDeadCode &&
			shortCircuits(node)
		) {
			return true;
		}
		return !hasSideEffects(tree, node, context);
	};

	/**
	 * @returns {SideEffectsContext} what names and calls do, as this print reads them
	 */
	const effectsContext = () => {
		if (sideEffectsContext === undefined) {
			sideEffectsContext = {
				readHasSideEffects,
				readsGlobalMember,
				nameKind,
				isPureCall,
				readValue: collapsedValue,
				comparesConvert,
				heritageConstructs,
				spreadRuns,
				joinsNatively,
				readsPrototypeMember
			};
		}
		return sideEffectsContext;
	};

	/**
	 * @param {number} node a member read
	 * @returns {boolean} whether it reads a member of a built-in prototype `builtInOwnerOf` names, which no write the program makes replaces
	 */
	const readsPrototypeMember = (node) => {
		if (tree.flag(Flag.computed, node)) return false;
		const owner = builtInOwnerOf(childOf(Field.object, node));
		return (
			owner !== undefined &&
			owner.endsWith(".prototype") &&
			!writesBuiltIn(`${owner}.${tree.name(childOf(Field.property, node))}`)
		);
	};

	/**
	 * An array converts by `Object.prototype.valueOf`, then its `toString`
	 * calling `join`, an object by `Object.prototype`'s `valueOf` and `toString`.
	 * @param {number} node an array or object literal
	 * @returns {boolean} whether converting it to a string runs only those, each element converting natively
	 */
	const joinsNatively = (node) => {
		if (
			!convertsNatively(node) ||
			writesBuiltIn("Object.prototype.valueOf") ||
			writesBuiltIn("Object.prototype.toString")
		) {
			return false;
		}
		if (typeOf(node) === NodeType.ObjectExpression) return true;
		// A hole joins what the prototypes hold at its index.
		const count = tree.fieldCount(Field.elements, node);
		for (let i = 0; i < count; i++) {
			if (tree.field(i, Field.elements, node) === 0) return false;
		}
		return (
			!writesBuiltIn("Array.prototype.toString") &&
			!writesBuiltIn("Array.prototype.join")
		);
	};

	/**
	 * What spreading an array or string literal runs is the iterator its
	 * prototype holds; an object takes own properties, a getter running.
	 * @param {number} spread a spread
	 * @param {number} container the array, call or object listing it
	 * @returns {boolean} whether spreading it may run code or throw, its argument's own effects aside
	 */
	const spreadRuns = (spread, container) => {
		const argument = unwrap(childOf(Field.argument, spread));
		const intoObject = typeOf(container) === NodeType.ObjectExpression;
		switch (typeOf(argument)) {
			case NodeType.ArrayExpression: {
				if (intoObject) return false;
				// A hole reads what the prototypes hold at its index.
				const count = tree.fieldCount(Field.elements, argument);
				for (let i = 0; i < count; i++) {
					if (tree.field(i, Field.elements, argument) === 0) return true;
				}
				return writesBuiltIn("Array.prototype.*");
			}
			case NodeType.TemplateLiteral:
				return !intoObject && writesBuiltIn("String.prototype.*");
			case NodeType.Literal: {
				const value = tree.value(argument);
				if (typeof value === "string") {
					return !intoObject && writesBuiltIn("String.prototype.*");
				}
				// A primitive has no own property to spread, and none iterates.
				return !intoObject || (typeof value === "object" && value !== null);
			}
			case NodeType.ObjectExpression: {
				if (!intoObject) return true;
				const count = tree.fieldCount(Field.properties, argument);
				for (let i = 0; i < count; i++) {
					const property = tree.field(i, Field.properties, argument);
					if (
						typeOf(property) === NodeType.Property &&
						tree.textOf(Part.kind, property) === "get"
					) {
						return true;
					}
				}
				return false;
			}
			default:
				return true;
		}
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
		if (
			isGlobalUndefined(node) ||
			isInlinedRead(node) ||
			(madeReads.size !== 0 && madeReads.has(node))
		) {
			return false;
		}
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
		if (
			isGlobalUndefined(node) ||
			isGlobalUndefined(node, "NaN") ||
			isGlobalUndefined(node, "Infinity")
		) {
			return "number";
		}
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
			count > 2
		) {
			return false;
		}
		// Nothing passed makes `/(?:)/`.
		if (count === 0) return true;
		const pattern = argumentValue(tree.field(0, Field.arguments, node));
		const flags =
			count === 2 ? argumentValue(tree.field(1, Field.arguments, node)) : "";
		if (typeof pattern !== "string" || typeof flags !== "string") return false;
		try {
			const { source } = new RegExp(pattern, flags);
			require("./regexp").validateRegExpLiteral(
				source,
				flags,
				/** @type {import("./syntax-parser").EcmaVersion} */ (
					output.option("ecma")
				)
			);
		} catch (_err) {
			return false;
		}
		return true;
	};

	/**
	 * @param {number} node a name, or names read off one with dots
	 * @returns {string | number | boolean | null | undefined} the value `globalDefs` gives it, where it reads off a global nothing assigns
	 */
	const globalDefOf = (node) => {
		const value = /** @type {Map<string, string | number | boolean | null>} */ (
			globalDefs
		).get(dottedNameOf(node));
		if (value === undefined) return undefined;
		let root = node;
		while (typeOf(root) === NodeType.MemberExpression) {
			root = childOf(Field.object, root);
		}
		return isGlobalUndefined(root, tree.name(root)) ? value : undefined;
	};

	/**
	 * Prints what `globalDefs` gives a name, a number that would join what is
	 * around it in parentheses.
	 * @param {number} node the name, or names read off one with dots
	 * @param {string | number | boolean | null} value its value
	 * @returns {void}
	 */
	const printGlobalDef = (node, value) => {
		if (typeof value === "number" && !printsLikeName(value)) {
			output.print("(");
			printValue(value, false);
			output.print(")");
		} else {
			printValue(value, takesUnary(node));
		}
	};

	/**
	 * A callee as `pureFuncs` names it, or a global as `globalDefs` does: a
	 * name or a chain of names read off it with dots, as written.
	 * @param {number} node the expression, past parentheses
	 * @returns {string} its text, empty for any other expression
	 */
	const dottedNameOf = (node) => {
		const type = typeOf(node);
		if (type === NodeType.Identifier) return tree.name(node);
		if (
			type !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, node) ||
			tree.flag(Flag.optional, node)
		) {
			return "";
		}
		const object = dottedNameOf(childOf(Field.object, node));
		const property = childOf(Field.property, node);
		return object === "" || typeOf(property) !== NodeType.Identifier
			? ""
			: `${object}.${tree.name(property)}`;
	};

	/**
	 * @param {number} node an expression, past parentheses
	 * @returns {boolean} whether it is a call of a `console` method `dropConsole` drops, on the global `console`
	 */
	const callsDroppedConsole = (node) => {
		if (droppedConsole === null || typeOf(node) !== NodeType.CallExpression) {
			return false;
		}
		let callee = childOf(Field.callee, node);
		if (
			typeOf(callee) !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, callee)
		) {
			return false;
		}
		// `console.log.call(…)` and `.apply(…)` call the method too.
		const method = tree.name(childOf(Field.property, callee));
		if (
			(method === "call" || method === "apply") &&
			typeOf(childOf(Field.object, callee)) === NodeType.MemberExpression
		) {
			callee = childOf(Field.object, callee);
			if (tree.flag(Flag.computed, callee)) return false;
		}
		const object = childOf(Field.object, callee);
		const property = childOf(Field.property, callee);
		return (
			typeOf(object) === NodeType.Identifier &&
			isGlobalUndefined(object, "console") &&
			typeOf(property) === NodeType.Identifier &&
			(droppedConsole === true || droppedConsole.has(tree.name(property)))
		);
	};

	/**
	 * Whether converting a value to a primitive runs only built-ins and never
	 * throws: no bigint or symbol, and no object whose own methods convert it.
	 * @param {number} node an argument
	 * @returns {boolean} true where a built-in may convert it freely
	 */
	const convertsNatively = (node) => {
		node = unwrap(node);
		switch (typeOf(node)) {
			case NodeType.Literal:
				return typeof tree.value(node) !== "bigint";
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
				return true;
			case NodeType.ArrayExpression: {
				const count = tree.fieldCount(Field.elements, node);
				for (let i = 0; i < count; i++) {
					const element = itemOf(i, Field.elements, node);
					if (element !== 0 && !convertsNatively(element)) return false;
				}
				return true;
			}
			case NodeType.ObjectExpression: {
				// A key conversion reads, a new prototype or an accessor, as `Error`'s
				// `cause`, runs its code.
				const count = tree.fieldCount(Field.properties, node);
				for (let i = 0; i < count; i++) {
					const property = itemOf(i, Field.properties, node);
					if (typeOf(property) === NodeType.SpreadElement) {
						if (!spreadsIndexes(property)) return false;
						continue;
					}
					if (
						typeOf(property) !== NodeType.Property ||
						tree.flag(Flag.computed, property) ||
						tree.textOf(Part.kind, property) !== "init"
					) {
						return false;
					}
					const key = keyName(childOf(Field.key, property));
					if (key === "toString" || key === "valueOf" || key === "__proto__") {
						return false;
					}
				}
				return true;
			}
			case NodeType.CallExpression: {
				// Every `Math` static answers a number.
				const callee = childOf(Field.callee, node);
				if (
					typeOf(callee) === NodeType.MemberExpression &&
					typeOf(childOf(Field.object, callee)) === NodeType.Identifier &&
					tree.name(childOf(Field.object, callee)) === "Math" &&
					callsPureBuiltIn(node)
				) {
					return true;
				}
				break;
			}
		}
		const kind = convertedKind(tree, node, effectsContext());
		return kind === "number" || kind === "string";
	};

	/**
	 * @param {number} spread a spread passed to a call
	 * @returns {boolean} whether it spreads a literal of what converts natively: an array's elements or a string's characters
	 */
	const spreadsNatively = (spread) => {
		const argument = unwrap(childOf(Field.argument, spread));
		if (typeOf(argument) === NodeType.TemplateLiteral) return true;
		if (typeOf(argument) !== NodeType.ArrayExpression) {
			return (
				typeOf(argument) === NodeType.Literal &&
				typeof tree.value(argument) === "string"
			);
		}
		const count = tree.fieldCount(Field.elements, argument);
		for (let i = 0; i < count; i++) {
			const element = itemOf(i, Field.elements, argument);
			if (element === 0 || !convertsNatively(element)) return false;
		}
		return true;
	};

	/**
	 * @param {number} spread a spread in an object literal
	 * @returns {boolean} whether it copies no method converting the object: only indexes, of an array or string literal, or an object literal's own that convert natively
	 */
	const spreadsIndexes = (spread) => {
		const argument = unwrap(childOf(Field.argument, spread));
		switch (typeOf(argument)) {
			case NodeType.ArrayExpression:
			case NodeType.TemplateLiteral:
				return true;
			case NodeType.ObjectExpression:
				return convertsNatively(argument);
			case NodeType.Literal:
				return typeof tree.value(argument) === "string";
			default:
				return false;
		}
	};

	/**
	 * @returns {ReturnType<typeof import("./syntax-printer-data").nativeObjectTables>} terser's native object tables, built on first use
	 */
	const nativeTables = () =>
		nativeObjectTablesBuilt ||
		(nativeObjectTablesBuilt =
			require("./syntax-printer-data").nativeObjectTables());

	/**
	 * @returns {import("./syntax-printer-data").FoldedBuiltIns} the tables `foldedBuiltIns` generates, loaded on first use
	 */
	const foldedBuiltInTables = () =>
		foldedTables ||
		(foldedTables = require("./syntax-printer-data").foldedBuiltIns());

	/**
	 * terser's `is_builtin_pure_with_these_args`, where an argument out of range
	 * or no iterable throws, and the entries a map or weak collection takes.
	 * @param {string} builtin the built-in constructed or called
	 * @param {number} node the call or `new`
	 * @returns {boolean} true where the arguments make it throw nothing
	 */
	const takesArgumentsQuietly = (builtin, node) => {
		const count = tree.fieldCount(Field.arguments, node);
		if (count === 0) return true;
		const first = unwrap(itemOf(0, Field.arguments, node));
		const value = evaluateConstant(first);
		const isLength =
			typeof value === "number" &&
			Number.isInteger(value) &&
			value >= 0 &&
			value <= 0xffffffff;

		const tables = nativeTables();

		if (tables.NATIVE_LONE_ARG_IS_RANGE.includes(builtin)) {
			return count > 1 || isLength;
		}
		const bigIntArray = BIGINT_ARRAYS.includes(builtin);
		if (
			bigIntArray ||
			tables.NATIVE_ARG1_IS_RANGE_OR_ITERABLE.includes(builtin)
		) {
			if (typeOf(first) === NodeType.ArrayExpression) return !bigIntArray;
			// What is no object is read by `ToIndex`: `null`, a boolean or a string too.
			const primitive =
				value === null ||
				typeof value === "boolean" ||
				typeof value === "string" ||
				typeof value === "number"
					? Number(value)
					: isUndefinedValue(first)
						? 0
						: undefined;
			if (primitive === undefined) return false;
			const index = Number.isNaN(primitive) ? 0 : Math.trunc(primitive);
			return index >= 0 && index <= 0xffffffff;
		}
		if (!tables.NATIVE_ARG1_IS_ITERABLE.includes(builtin)) return true;
		// `null` or `undefined` makes an empty collection.
		if (
			(typeOf(first) === NodeType.Literal && tree.value(first) === null) ||
			isUndefinedValue(first)
		) {
			return true;
		}
		// A string iterates its characters, which only a `Set` takes as entries.
		if (typeof value === "string" && typeOf(first) === NodeType.Literal) {
			return builtin === "Set" || value === "";
		}
		if (
			typeOf(first) !== NodeType.ArrayExpression ||
			writesBuiltIn("Array.prototype.*")
		) {
			return false;
		}
		if (builtin === "Set") return true;
		// A map takes entries, a weak collection objects to key by.
		const elements = tree.fieldCount(Field.elements, first);
		for (let i = 0; i < elements; i++) {
			const element = itemOf(i, Field.elements, first);
			const entry = builtin === "WeakSet" ? element : 0;
			if (builtin !== "WeakSet") {
				if (element === 0 || typeOf(element) !== NodeType.ArrayExpression) {
					return false;
				}
				if (builtin === "Map") continue;
			}
			const key =
				builtin === "WeakSet"
					? entry
					: tree.fieldCount(Field.elements, element) === 0
						? 0
						: itemOf(0, Field.elements, element);
			const type = key === 0 ? 0 : typeOf(key);
			if (
				type !== NodeType.ArrayExpression &&
				type !== NodeType.ObjectExpression &&
				type !== NodeType.FunctionExpression &&
				type !== NodeType.ArrowFunctionExpression
			) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} node an argument
	 * @returns {boolean} whether it is a constant number, string or boolean, which `ToObject` takes
	 */
	const isNonNullishPrimitive = (node) => {
		const value = evaluateConstant(node);
		return (
			(typeof value === "number" ||
				typeof value === "string" ||
				typeof value === "boolean") &&
			isPureValue(node)
		);
	};

	/**
	 * @param {number} node `BigInt`'s argument
	 * @returns {boolean} whether `BigInt` converts it without throwing: an integer, a boolean, an integer's string or a BigInt
	 */
	const convertsToBigInt = (node) => {
		node = unwrap(node);
		if (
			typeOf(node) === NodeType.Literal &&
			typeof tree.value(node) === "bigint"
		) {
			return true;
		}
		const value = evaluateConstant(node);
		if (!isPureValue(node)) return false;
		if (typeof value === "number") return Number.isInteger(value);
		if (typeof value === "boolean") return true;
		if (typeof value !== "string") return false;
		try {
			BigInt(value);
			return true;
		} catch (_err) {
			return false;
		}
	};

	/**
	 * What `unsafe` adds to `Object`'s statics throws only on what is no
	 * object, and an object passed after it may be read as descriptors.
	 * @param {number} node a call
	 * @param {number} count how many arguments it passes
	 * @param {string} method the static it calls
	 * @returns {boolean} whether it passes a literal object, then only what is none
	 */
	const takesObjectFirst = (node, count, method) => {
		if (count === 0) return false;
		for (let i = 0; i < count; i++) {
			const argument = unwrap(itemOf(i, Field.arguments, node));
			if (
				typeOf(argument) === NodeType.SpreadElement ||
				(i === 0
					? !isObjectValue(argument) &&
						// Since ECMAScript 2015 each makes an object of a primitive but `create`.
						(method === "create" || !isNonNullishPrimitive(argument))
					: isObjectValue(argument)) ||
				// `create` reads any second argument but `undefined` as descriptors,
				// which `null` or a string's characters fail.
				(i === 1 && method === "create" && !isUndefinedValue(argument))
			) {
				return false;
			}
		}
		return true;
	};

	/**
	 * terser's `is_pure_builtin_call`, taking the built-ins native as webpack
	 * does by default: a function or static `builtinsEcma` and `unsafe` select,
	 * nothing replaces, called on arguments it converts natively and quietly.
	 * @param {number} node a call or `new`
	 * @returns {boolean} true where it runs nothing but making its value
	 */
	const callsPureBuiltIn = (node) => {
		if (!compresses || tree.flag(Flag.optional, node)) return false;
		const callee = childOf(Field.callee, node);
		let builtin;
		let method = "";
		if (typeOf(callee) === NodeType.Identifier) {
			builtin = tree.name(callee);
			if (!isGlobalUndefined(callee, builtin)) return false;
		} else {
			if (
				typeOf(callee) !== NodeType.MemberExpression ||
				tree.flag(Flag.computed, callee) ||
				tree.flag(Flag.optional, callee)
			) {
				return false;
			}
			const object = childOf(Field.object, callee);
			if (typeOf(object) !== NodeType.Identifier) return false;
			builtin = tree.name(object);
			method = tree.name(childOf(Field.property, callee));
			if (!isGlobalUndefined(object, builtin)) return false;
		}
		// `Object` makes an object of its first argument and `Boolean` reads its
		// truth, neither converting it by its methods.
		if (method === "" && (builtin === "Object" || builtin === "Boolean")) {
			return !writesBuiltIn(builtin);
		}
		if (pureNatives === undefined) {
			const tables = nativeTables();
			// Statics only `unsafe` adds throw on some constants, as
			// `Object.keys(null)` or `RegExp.escape(1)`, so it selects none.
			/** @type {Map<string, Set<PropertyKey>>} */
			const statics = new Map();
			for (const [owner, { when, names }] of Object.entries(
				tables.NATIVE_PURE_STATIC_FUNCTIONS
			)) {
				if (
					when === undefined ||
					evaluateNativeConditions(when, false, builtinsEcma) === true
				) {
					statics.set(owner, selectNativeNames(names, false, builtinsEcma));
				}
			}
			pureNatives = [
				selectNativeNames(
					tables.NATIVE_PURE_FUNCTIONS,
					unsafeBuiltIns,
					builtinsEcma
				),
				statics,
				selectNativeNames(
					tables.NATIVE_PURE_STATIC_FUNCTIONS.Object.names,
					true,
					builtinsEcma
				)
			];
		}
		const [functions, statics, objectStatics] = pureNatives;
		const count = tree.fieldCount(Field.arguments, node);
		if (method === "" && builtin === "BigInt") {
			return (
				functions.has(builtin) &&
				typeOf(node) === NodeType.CallExpression &&
				count === 1 &&
				convertsToBigInt(itemOf(0, Field.arguments, node)) &&
				!writesBuiltIn(builtin)
			);
		}
		for (let i = 0; i < count; i++) {
			const argument = itemOf(i, Field.arguments, node);
			if (
				method === "" &&
				BIGINT_QUIET_BUILT_INS.includes(builtin) &&
				typeOf(unwrap(argument)) === NodeType.Literal &&
				typeof tree.value(unwrap(argument)) === "bigint"
			) {
				continue;
			}
			// A static's spread passes what it iterates, each argument counted; a
			// collection converts none of what it iterates.
			if (
				typeOf(argument) === NodeType.SpreadElement
					? method === "" || !spreadsNatively(argument)
					: !convertsNatively(argument) &&
						!(
							i === 0 &&
							method === "" &&
							nativeTables().NATIVE_ARG1_IS_ITERABLE.includes(builtin)
						)
			) {
				return false;
			}
		}
		if (method !== "") {
			// A static method is no constructor: `new Math.abs(1)` throws.
			if (typeOf(node) === NodeType.NewExpression) return false;
			const names = statics.get(builtin);
			if (
				(names === undefined || !names.has(method)) &&
				!(
					builtin === "Object" &&
					objectStatics.has(method) &&
					takesObjectFirst(node, count, method)
				)
			) {
				return false;
			}
			// Before ECMAScript 2015 these throw on what is no object.
			if (
				builtin === "Object" &&
				builtinsEcma < 2015 &&
				(count === 0 ||
					typeOf(unwrap(itemOf(0, Field.arguments, node))) !==
						NodeType.ObjectExpression)
			) {
				return false;
			}
			return !writesBuiltIn(`${builtin}.${method}`);
		}
		if (
			!functions.has(builtin) &&
			!(WEAK_COLLECTIONS.includes(builtin) && builtinsEcma >= 2015)
		) {
			return false;
		}

		const tables = nativeTables();

		if (
			!CONVERTING_BUILT_INS.includes(builtin) &&
			!QUIET_BUILT_INS.includes(builtin) &&
			!tables.NATIVE_LONE_ARG_IS_RANGE.includes(builtin) &&
			!tables.NATIVE_ARG1_IS_RANGE_OR_ITERABLE.includes(builtin) &&
			!tables.NATIVE_ARG1_IS_ITERABLE.includes(builtin) &&
			!BIGINT_ARRAYS.includes(builtin)
		) {
			return false;
		}
		// Only a constructor takes `new`, `Symbol` none; a call needs one working called.
		const constructor = builtin[0] !== builtin[0].toLowerCase();
		if (
			typeOf(node) === NodeType.NewExpression
				? !constructor || builtin === "Symbol"
				: constructor &&
					builtin !== "Symbol" &&
					!CONVERTING_BUILT_INS.includes(builtin) &&
					!foldedBuiltInTables().constructedWhenCalled.includes(builtin)
		) {
			return false;
		}
		return takesArgumentsQuietly(builtin, node) && !writesBuiltIn(builtin);
	};

	/**
	 * @param {number} node a call or `new`
	 * @returns {boolean} whether a `#__PURE__` comment before it marks it pure, where `sideEffects` reads them
	 */
	const isPureCall = (node) => {
		if (callsEmptyFunction(node)) return true;
		// A call printing as a value its function returns runs only that.
		const fn = reducedCalls.size === 0 ? undefined : reducedCalls.get(node);
		if (
			fn !== undefined &&
			isPureValue(/** @type {number} */ (reducing.get(fn)))
		) {
			return true;
		}
		if (constructsRegExp(node) || callsPureBuiltIn(node)) return true;
		// One printing as the string it joins, the array it enumerates, or a
		// built-in's answer, runs nothing.
		if (
			typeOf(node) === NodeType.CallExpression &&
			(joinedOf(node) !== undefined ||
				enumerationOf(node) !== undefined ||
				foldedCallAnswer(node) !== undefined)
		) {
			return true;
		}
		if (
			pureFunctions !== null &&
			pureFunctions.has(dottedNameOf(childOf(Field.callee, node)))
		) {
			return true;
		}
		if (!readsPureAnnotations || commentTokens === null) return false;
		if (sideEffectFree.size !== 0 && callsSideEffectFree(node)) return true;
		const tables = output.tokenTables;
		const table = /** @type {TokenTable} */ (tables.last);
		const start = tree.start(node);
		for (const comment of tables.members(
			tables.commentsOf(commentTokens.starts[node], false)
		)) {
			// One inside a parenthesis the call opens with marks what it holds.
			if (
				PURE_ANNOTATION.test(table.commentValue(comment)) &&
				table.commentStart(comment) < start
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * @param {number} node a call or `new`
	 * @returns {boolean} whether it calls a function a `#__NO_SIDE_EFFECTS__` comment marks, by a name nothing writes, after the name is set
	 */
	const callsSideEffectFree = (node) => {
		if (typeOf(node) !== NodeType.CallExpression) return false;
		const callee = childOf(Field.callee, node);
		/** @type {number | MinifierVariable} */
		let marked = callee;
		if (typeOf(callee) === NodeType.Identifier) {
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[callee];
			// An `eval` may set it, a `with` read another name for it.
			if (
				!isMinifierVariable(definition) ||
				definition.written ||
				/** @type {MinifierScope} */ (definition.scope).isPinned()
			) {
				return false;
			}
			marked = definition;
		}
		const set = sideEffectFree.get(marked);
		// A declarator a block's condition or loop holds may not run first.
		return (
			set !== undefined &&
			(set === 0 ||
				((setFirst[set] !== 0 || exportedDeclarators.has(set)) &&
					tree.start(node) >= tree.end(set)))
		);
	};

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether a `#__NO_SIDE_EFFECTS__` comment is before it, outside a parenthesis it opens with
	 */
	const annotatedSideEffectFree = (node) => {
		const tables = output.tokenTables;
		const table = /** @type {TokenTable} */ (tables.last);
		const start = tree.start(node);
		for (const comment of tables.members(
			tables.commentsOf(
				/** @type {TreeTokens} */ (commentTokens).starts[node],
				false
			)
		)) {
			if (
				NO_SIDE_EFFECTS_ANNOTATION.test(table.commentValue(comment)) &&
				table.commentStart(comment) < start
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * Notes the functions a declaration declares with a function, and their
	 * names, where a `#__NO_SIDE_EFFECTS__` comment marks it or the function.
	 * @param {number} declaration a function or variable declaration
	 * @param {boolean} annotated whether a comment before what holds it marks it
	 * @returns {void}
	 */
	const noteSideEffectFreeDeclaration = (declaration, annotated) => {
		if (typeOf(declaration) === NodeType.FunctionDeclaration) {
			if (!annotated && !annotatedSideEffectFree(declaration)) return;
			sideEffectFree.set(declaration, 0);
			const id = tree.field(0, Field.id, declaration);
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[id];
			if (isMinifierVariable(definition)) sideEffectFree.set(definition, 0);
			return;
		}
		if (typeOf(declaration) !== NodeType.VariableDeclaration) return;
		const marked = annotated || annotatedSideEffectFree(declaration);
		const count = tree.fieldCount(Field.declarations, declaration);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, declaration);
			const id = tree.field(0, Field.id, declarator);
			const init = childOf(Field.init, declarator);
			if (
				typeOf(id) !== NodeType.Identifier ||
				(typeOf(init) !== NodeType.FunctionExpression &&
					typeOf(init) !== NodeType.ArrowFunctionExpression) ||
				!(marked || annotatedSideEffectFree(init))
			) {
				continue;
			}
			sideEffectFree.set(init, 0);
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[id];
			if (isMinifierVariable(definition)) {
				sideEffectFree.set(definition, declarator);
			}
		}
	};

	/**
	 * Rollup's reading of `#__NO_SIDE_EFFECTS__`: a comment before a
	 * function, a declaration of one or an export of either.
	 * @param {number} node a node walked
	 * @returns {undefined} nothing, every node walked
	 */
	const noteSideEffectFree = (node) => {
		switch (typeOf(node)) {
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
				if (annotatedSideEffectFree(node)) sideEffectFree.set(node, 0);
				break;
			case NodeType.FunctionDeclaration:
			case NodeType.VariableDeclaration:
				noteSideEffectFreeDeclaration(node, false);
				break;
			case NodeType.ExportNamedDeclaration:
			case NodeType.ExportDefaultDeclaration: {
				const declaration = tree.field(0, Field.declaration, node);
				if (typeOf(declaration) === NodeType.VariableDeclaration) {
					const count = tree.fieldCount(Field.declarations, declaration);
					for (let i = 0; i < count; i++) {
						exportedDeclarators.add(
							tree.field(i, Field.declarations, declaration)
						);
					}
				}
				if (declaration !== 0 && annotatedSideEffectFree(node)) {
					noteSideEffectFreeDeclaration(declaration, true);
				}
				break;
			}
		}
		return undefined;
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
	 * @param {number} statement a `let`, `const` or `var` declaration, not a loop's head
	 * @returns {number} how many values it prints as statements of their own where its declarators all go, as its generator prints them; -1 where it prints one
	 */
	const printedValues = (statement) => {
		const count = tree.fieldCount(Field.declarations, statement);
		let printed = 0;
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, statement);
			if (
				dropped[declarator] !== 1 ||
				!(keepsEffect[declarator] === 1 || printed > 0 || i < count - 1)
			) {
				return -1;
			}
			if (keepsOwnEffect(declarator)) printed++;
		}
		return printed;
	};

	/**
	 * Whether a class's heritage is a constructor, so defining the class does
	 * not throw: `null`, a built-in one, or a class made before it and never
	 * set since, which an arrow or a generator a name holds is not.
	 * @param {number} heritage the heritage, past parentheses
	 * @returns {boolean} true where it is known to construct
	 */
	const heritageConstructs = (heritage) => {
		if (
			(madeReads.size !== 0 && madeReads.has(heritage)) ||
			readsBuiltInConstructor(heritage)
		) {
			return true;
		}
		const left =
			typeOf(heritage) === NodeType.LogicalExpression &&
			tree.textOf(Part.operator, heritage) === "&&"
				? childOf(Field.left, heritage)
				: heritage;
		return (
			typeOf(left) === NodeType.Literal &&
			tree.textOf(Part.raw, left) === "null"
		);
	};

	/**
	 * @param {number} candidate a declarator, or a function or class declaration
	 * @returns {boolean} whether it declares a name nothing printed reads, from a value making nothing happen
	 */
	const dropsNow = (candidate) => {
		const type = typeOf(candidate);
		if (type === NodeType.FunctionDeclaration) {
			return isUnusedBinding(tree.field(0, Field.id, candidate));
		}
		if (type === NodeType.ClassDeclaration) {
			return (
				isUnusedBinding(tree.field(0, Field.id, candidate)) &&
				isPureValue(candidate)
			);
		}
		if (!isUnusedBinding(childOf(Field.id, candidate))) return false;
		const init = childOf(Field.init, candidate);
		if (
			init === 0 ||
			(deadInits.size !== 0 && deadInits.has(candidate)) ||
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
	// What each built-in call asked about answered first, `null` where it
	// stays a call: a later answer could differ once more names are known.
	/** @type {Map<number, string | number | boolean | null>} */
	const foldedCalls = new Map();
	// How long each call `foldedCalls` answers prints, from its parts' values
	// rather than its source, so the same call folds however it is spelled.
	/** @type {Map<number, number>} */
	const foldedCallSizes = new Map();
	// Each call, then the function it calls, that may print as its value once
	// what the function's other statements print is known: nothing.
	/** @type {number[]} */
	const laterReducedCalls = [];
	// Each call, then its parent, `noteUnreadCall` looks at again then.
	/** @type {number[]} */
	const laterUnreadCalls = [];
	// By `if` printing as `?:` or conditional, the assignment of one name
	// with one operator all its branches end in, or null, found once.
	/** @type {Map<number, [string, MinifierVariable] | null>} */
	const hoists = new Map();
	// Each `if` the `if` after it may merge with, both leaving the same way;
	// by `if`, 1 where the next continues its test, 2 where it continues the
	// test before it, 3 for both, terser's `if_return` of equal exits.
	/** @type {number[]} */
	const exitPairs = [];
	// Each `if` second to last in a function's or loop's body, that body and
	// the function or loop.
	/** @type {number[]} */
	const exitElseCandidates = [];
	// By `if` whose body ends leaving its function or loop pass, the one
	// statement after it, which prints as its `else`, the exit going.
	/** @type {Map<number, number>} */
	const exitElses = new Map();
	// Each `if` of a list, which goes where it ends up running only a test
	// that runs nothing.
	/** @type {number[]} */
	const listIfs = [];
	// Whether the code the walk is in is strict.
	let walkStrict = false;
	// By loop, the `if(x)break` opening its body, whose `!x` joins its test.
	/** @type {Map<number, number>} */
	const breakTests = new Map();
	// By call a `?:` branch makes that merges with the other's, where the
	// argument they differ in starts and ends in its text.
	/** @type {Map<number, [number, number]>} */
	const mergedSpans = new Map();
	// By conditional, the argument its branches' calls differ in, -1 for none.
	/** @type {Map<number, number>} */
	const mergedArguments = new Map();
	// What `delete` takes, a write in it keeping its name.
	/** @type {Set<number>} */
	const deleted = new Set();
	// By `switch`, its case `switchAsIfElse` prints as an `if`, 0 for none.
	/** @type {Map<number, number>} */
	const switchElses = new Map();
	// By conditional printed as `t?a:b`, written in that order, its test's length.
	/** @type {Map<number, number>} */
	const plainTests = new Map();
	// The `return`s ending a function of what is `undefined` anyway, which print
	// as what they run.
	/** @type {Set<number>} */
	const voidTails = new Set();
	// The `if`s of `breakTests`, which print nothing, their test left for the loop.
	/** @type {Set<number>} */
	const breakIfs = new Set();
	// By `if` of `breakTests` with an `else`, the branch other than the `break`,
	// which prints in its place.
	/** @type {Map<number, number>} */
	const breakElses = new Map();
	// By array or object nobody reads, the parts of it that print, null where
	// it prints whole.
	/** @type {Map<number, number[] | null>} */
	const unreadParts = new Map();
	// Each `try` whose block is empty, which prints as its `finally`.
	/** @type {Set<number>} */
	const emptyTries = new Set();
	// Each function, loop and labeled statement, whose body may end in an
	// exit going nowhere but where the body ends anyway.
	/** @type {number[]} */
	const tailHolders = [];
	// By loop, the labeled statement it is the body of.
	/** @type {Map<number, number>} */
	const labeledParents = new Map();
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
	// The sequences printed as their one item left, bare where they stood.
	/** @type {Set<number>} */
	const bareSequences = new Set();
	// Each `var` read in such a function, and the function.
	/** @type {(MinifierVariable | number)[]} */
	const laterNested = [];
	// Each `if` whose test may read constants not yet known, and its list.
	/** @type {number[]} */
	const laterTests = [];
	// Each `for` or `while` whose body is a `break`, and its parent.
	/** @type {number[]} */
	const laterLoops = [];
	// Each `switch` the walk meets, and its parent, and by `switch` whose
	// value and cases before the match are known, the statements it runs.
	/** @type {number[]} */
	const laterSwitches = [];
	/** @type {Map<number, Set<number>>} */
	const foldedSwitches = new Map();
	// Each labeled statement a printed `break` or `continue` names.
	/** @type {Set<number>} */
	const jumpedLabels = new Set();
	// Each folded `switch` whose value is not known, which then runs it first.
	/** @type {Set<number>} */
	const testedSwitches = new Set();
	// Each call passing a name, noted again once the walk is done.
	/** @type {Set<number>} */
	const laterCalls = new Set();
	// Each call of a name, whose unread trailing arguments may go.
	/** @type {number[]} */
	const namedCalls = [];
	// By function declaration's name, the declaration.
	/** @type {Map<MinifierVariable, number>} */
	const declaredFunctions = new Map();
	// The trailing arguments a call passes to parameters nothing reads.
	/** @type {Set<number>} */
	const trimmedArguments = new Set();
	// Each call, parameter, literal argument and the parameter's one read,
	// where the read may print the argument instead.
	/** @type {number[]} */
	const freshArguments = [];
	// By parameter read, the literal argument printed there, before it.
	/** @type {Map<number, number>} */
	const earlyArguments = new Map();
	// Each last of a sequence, and what `void` or `!` takes, whose value a
	// statement leaves unread.
	/** @type {Set<number>} */
	const unreadValues = new Set();
	// Each template a statement leaves unread, which prints what its parts
	// run and convert.
	/** @type {Set<number>} */
	const unreadTemplates = new Set();
	// By `if` whose test is known, the branch it prints as.
	/** @type {Map<number, number>} */
	const keptBranches = new Map();
	// By `if` whose known test drops a branch declaring `var`s, those names.
	/** @type {Map<number, number[]>} */
	const hoistedFromDropped = new Map();
	// The definitions of those names, which print named still.
	/** @type {Set<TreeDefinition>} */
	const hoistedDefinitions = new Set();
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
	// The reads of a class made before them, which never throw.
	/** @type {Set<number>} */
	const madeReads = new Set();
	/** @type {Set<TreeDefinition>} */
	const readInDeadZone = new Set();
	// The reads before `||` or `??` of a `var` nothing has written yet, as
	// TypeScript writes an enum, which fold as `undefined`.
	/** @type {Set<number>} */
	const unsetReads = new Set();
	// The declarators of a `var` past a statement always leaving its list,
	// which declare their names and never set them.
	/** @type {Set<number>} */
	const deadInits = new Set();
	// Each such read guarding the one write, `S || (S = {})`, and its `var`,
	// which folds once the walk finds it declared bare in the function's body.
	/** @type {(number | MinifierVariable)[]} */
	const guardReads = [];
	/** @type {Set<MinifierVariable>} */
	const bareVars = new Set();
	// The statement of the walked function's body the walk is in, which runs
	// once a call, 0 in a class or where none is.
	let onceStatement = 0;

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is a literal making an object: an array, object, function, class or regular expression
	 */
	const isObjectValue = (node) => {
		switch (typeOf(node)) {
			case NodeType.ArrayExpression:
			case NodeType.ObjectExpression:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.ClassExpression:
				return true;
			case NodeType.Literal:
				return (tree.textOf(Part.raw, node) || "").charCodeAt(0) === 47;
			default:
				return false;
		}
	};

	/**
	 * What an operand of `+` adds: its constant, an array literal of constants
	 * joined, as `toString` joins it, or a bigint literal.
	 * @param {number} node an operand of `+`
	 * @returns {string | number | boolean | bigint | null | undefined} what it adds, undefined where it is not known
	 */
	const addedValue = (node) => {
		const value = evaluateConstant(node);
		if (value !== undefined) return value;
		node = unwrap(node);
		if (typeOf(node) === NodeType.Literal) {
			const literal = tree.value(node);
			return typeof literal === "bigint" ? literal : undefined;
		}
		if (
			typeOf(node) !== NodeType.ArrayExpression ||
			holdsComments(node) ||
			// It converts by `valueOf`, which an array inherits from
			// `Object.prototype`, then `toString`, which calls `join`.
			writesBuiltIn("Array.prototype.valueOf") ||
			writesBuiltIn("Object.prototype.valueOf") ||
			writesBuiltIn("Array.prototype.toString") ||
			writesBuiltIn("Array.prototype.join")
		) {
			return undefined;
		}
		const count = tree.fieldCount(Field.elements, node);
		let text = "";
		for (let i = 0; i < count; i++) {
			if (i > 0) text += ",";
			const element = itemOf(i, Field.elements, node);
			// A hole reads what the prototypes hold at its index.
			if (element === 0) return undefined;
			// `null` and `undefined` join as nothing.
			if (
				typeOf(element) === NodeType.Identifier &&
				isGlobalUndefined(element)
			) {
				continue;
			}
			if (typeOf(element) === NodeType.SpreadElement) return undefined;
			const item = evaluateConstant(element);
			if (item === undefined) return undefined;
			if (item !== null) text += String(item);
		}
		return text;
	};

	/**
	 * Whether a value converts to a different number by edition: ECMAScript 5
	 * reads a binary or octal string as `NaN`, the build's engine as its number.
	 * @param {string | number | boolean | null} value a constant
	 * @returns {boolean} true where the conversion must stay for the engine
	 */
	const convertsByEdition = (value) =>
		builtinsEcma < 2015 &&
		typeof value === "string" &&
		/^\s*0[bo]/i.test(value);

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
				if (globalDefs !== null) {
					const value = globalDefOf(node);
					if (value !== undefined) return value;
				}
				// The global `NaN` and `Infinity` nothing shadows, which no script
				// may set, as terser's `evaluate` reads them.
				if (!keepsGlobalNames) {
					const name = tree.name(node);
					if (name === "NaN" && isGlobalUndefined(node, name)) {
						return Number.NaN;
					}
					if (name === "Infinity" && isGlobalUndefined(node, name)) {
						return Infinity;
					}
				}
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
				const argument = childOf(Field.argument, node);
				const operator = tree.textOf(Part.operator, node);
				if (operator === "delete") {
					// What is no reference deletes nothing, which is `true`.
					const type = typeOf(argument);
					if (type === NodeType.Identifier) {
						// The global object's own `undefined`, `NaN` and `Infinity`
						// are not configurable.
						const name = tree.name(argument);
						return (name === "undefined" ||
							name === "NaN" ||
							name === "Infinity") &&
							isGlobalUndefined(argument, name)
							? false
							: undefined;
					}
					return type !== NodeType.MemberExpression &&
						type !== NodeType.MemberExpression &&
						type !== NodeType.ChainExpression &&
						isPureValue(argument)
						? true
						: undefined;
				}
				if (operator === "!" && isObjectValue(argument)) {
					// An object is truthy.
					return isPureValue(argument) ? false : undefined;
				}
				// `undefined` holds no value here, but its type is known.
				if (operator === "typeof" && isUndefinedValue(argument)) {
					return "undefined";
				}
				const value = evaluateConstant(argument);
				if (value === undefined) return undefined;
				if (
					operator !== "!" &&
					operator !== "typeof" &&
					convertsByEdition(value)
				) {
					return undefined;
				}
				switch (operator) {
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
				const operator = /** @type {string} */ (
					tree.textOf(Part.operator, node)
				);
				if (operator === "+") {
					const left = addedValue(childOf(Field.left, node));
					if (left === undefined) return undefined;
					const right = addedValue(childOf(Field.right, node));
					if (right === undefined) return undefined;
					// A bigint adds only to a string, as its digits; to a number it throws.
					if (typeof left === "bigint" || typeof right === "bigint") {
						return typeof left === "string" || typeof right === "string"
							? String(left) + String(right)
							: undefined;
					}
					return foldBinary(operator, left, right);
				}
				const left = evaluateConstant(childOf(Field.left, node));
				if (left === undefined) return undefined;
				const right = evaluateConstant(childOf(Field.right, node));
				if (right === undefined) return undefined;
				// Only strict equality never converts a string to a number.
				if (
					operator !== "===" &&
					operator !== "!==" &&
					(convertsByEdition(left) || convertsByEdition(right))
				) {
					return undefined;
				}
				return foldBinary(operator, left, right);
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
				if (globalDefs !== null && mangledNames !== null) {
					const value = globalDefOf(node);
					if (value !== undefined) return value;
				}
				const read = literalPropertyOf(node, false);
				if (read !== undefined) return read;
				if (foldsAtPrint) {
					const element = inlinedElement(node);
					if (element !== undefined) return element;
				}
				// terser's `evaluate` of `[a, b][1]`, where the others run nothing.
				const array = childOf(Field.object, node);
				const value = readValue(node);
				// And of `{a: 1}.a` or `{a: {b: 1}}.a.b`.
				if (value !== 0) return evaluateConstant(value);
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
			case NodeType.SequenceExpression: {
				// terser's `evaluate` of `(a, 1)`, where the others run nothing.
				const last = tree.fieldCount(Field.expressions, node) - 1;
				for (let i = 0; i < last; i++) {
					if (!isPureValue(itemOf(i, Field.expressions, node))) {
						return undefined;
					}
				}
				return evaluateConstant(itemOf(last, Field.expressions, node));
			}
			case NodeType.CallExpression: {
				// A call printing as what its function returns, passed what runs nothing.
				const fn = reducedCalls.size === 0 ? undefined : reducedCalls.get(node);
				if (fn === undefined) return foldedCallValue(node);
				const count = tree.fieldCount(Field.arguments, node);
				for (let i = 0; i < count; i++) {
					const argument = itemOf(i, Field.arguments, node);
					if (
						typeOf(argument) === NodeType.SpreadElement ||
						!isPureValue(argument)
					) {
						return undefined;
					}
				}
				return evaluateConstant(/** @type {number} */ (reducing.get(fn)));
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
		// An evaluation it runs inside, as through an object literal's key,
		// goes on in its own mode.
		const outer = foldsAtPrint;
		foldsAtPrint = true;
		const value = evaluateConstant(node);
		foldsAtPrint = outer;
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

	// A string or a number not negative, the text of a folded value.
	const BARE_LITERAL = /^(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d[\d.e+]*)$/;

	/**
	 * @param {number} node a node printed now
	 * @returns {boolean} whether it is a binary expression folding to a string or a finite number not negative, which a prefix operator takes bare
	 */
	const foldsToBareLiteral = (node) => {
		if (typeOf(node) !== NodeType.BinaryExpression || isPrivateIn(node)) {
			return false;
		}
		const operator = tree.textOf(Part.operator, node);
		if (operator === "in" || operator === "instanceof") return false;
		const folded = binaryFolded(node);
		return (
			typeof folded === "string" ||
			(typeof folded === "number" && folded >= 0 && Number.isFinite(folded))
		);
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
		if (operator === "in" || operator === "instanceof") return false;
		if (
			parentType === NodeType.MemberExpression &&
			childOf(Field.object, parent) === node
		) {
			// A number would need `..` there: only a string reads the same.
			return typeof binaryFolded(node) === "string";
		}
		if (parentType === NodeType.UnaryExpression) {
			// `!((a&b)==0)` prints `!!(a&b)`.
			return (
				foldsToBareLiteral(node) ||
				(operatorOf(parent) === "!" &&
					(EQUALITIES.indexOf(/** @type {string} */ (operator)) & 1) === 0 &&
					comparedInteger(
						node,
						operator,
						childOf(Field.left, node),
						childOf(Field.right, node)
					) !== 0)
			);
		}
		if (
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
			output.print(
				value < 0 || Object.is(value, -0)
					? `-${makeNum(-value)}`
					: makeNum(value)
			);
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
	 * @param {boolean=} late whether the constants passed are chosen
	 * @returns {void}
	 */
	const noteUnreadCall = (call, parent, late = false) => {
		const fn = childOf(Field.callee, call);
		const type = typeOf(fn);
		if (
			(type !== NodeType.FunctionExpression &&
				type !== NodeType.ArrowFunctionExpression) ||
			!dropsSideEffectFree ||
			!passesNothing(call) ||
			reducedCalls.has(call) ||
			!valueUnread(call, parent)
		) {
			return;
		}
		if (!passesFixedNames(fn, call)) {
			// Passed constants, it may pass nothing once they are chosen.
			if (!late && constantArguments.size !== 0) {
				laterUnreadCalls.push(call, parent);
			}
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
			const param = tree.field(i, Field.params, fn);
			const argument = itemOf(i, Field.arguments, call);
			if (inlinesArgument(param, argument)) continue;
			substituted.set(
				/** @type {TreeDefinition[]} */ (mangledNames)[param],
				argument
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
		if (!dropsUnused) return;
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
				if (typeOf(argument) === NodeType.Identifier) {
					laterCalls.add(call);
				} else if (moved === undefined) {
					noteFreshArgument(call, fn, param, argument, definition);
				}
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
	 * Notes a literal of literals passed to a parameter of the function it
	 * calls, read once and where it runs at most once a call: the read may
	 * make it instead, `function(o){f(o)}({})` printing `function(){f({})}()`.
	 * @param {number} call the call
	 * @param {number} fn the function called
	 * @param {number} param the parameter
	 * @param {number} argument what it is passed
	 * @param {MinifierVariable} definition the parameter's definition
	 * @returns {void}
	 */
	const noteFreshArgument = (call, fn, param, argument, definition) => {
		if (
			definition.referenceCount !== 1 ||
			(typeOf(argument) !== NodeType.ArrayExpression &&
				typeOf(argument) !== NodeType.ObjectExpression) ||
			!isLiteralTree(argument)
		) {
			return;
		}
		for (let i = 0; i < freshArguments.length; i += 4) {
			if (freshArguments[i] === call) return;
		}
		const body = childOf(Field.body, fn);
		const read = onceReadIn(body, definition);
		if (read === 0) return;
		const start = tree.start(read);
		// A loop would make a new value each time round where one was read.
		const looped = findNode(body, (inner) =>
			FUNCTION_TYPES[typeOf(inner)] === 1
				? false
				: LOOP_TYPES[typeOf(inner)] === 1 &&
					  tree.start(inner) <= start &&
					  tree.end(inner) >= tree.end(read)
					? true
					: undefined
		);
		if (!looped) freshArguments.push(call, param, argument, read);
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is a literal, or an array or object literal of those, which reads no name and so means the same in any scope
	 */
	const isLiteralTree = (node) => {
		switch (typeOf(node)) {
			case NodeType.Literal:
				return true;
			case NodeType.UnaryExpression:
				return typeOf(childOf(Field.argument, node)) === NodeType.Literal;
			case NodeType.ArrayExpression: {
				const count = tree.fieldCount(Field.elements, node);
				for (let i = 0; i < count; i++) {
					const element = tree.field(i, Field.elements, node);
					if (element !== 0 && !isLiteralTree(element)) return false;
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
						tree.flag(Flag.shorthand, property) ||
						!isLiteralTree(childOf(Field.value, property))
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
			!mayDrop(definition) ||
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
		// Its reads print their elements only where the declaration goes.
		if (
			dropsUnused &&
			typeOf(init) === NodeType.ArrayExpression &&
			holdsConstants(init)
		) {
			constantArrays.set(definition, init);
		}
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
		// Where `unused` is off, or a read in its dead zone prints the name, the
		// declaration stays.
		if (!dropsUnused || readInDeadZone.has(definition)) {
			keptForSize.add(definition);
		} else {
			inlined.set(definition, declarator);
		}
	};

	/**
	 * @param {number} array an array literal
	 * @returns {boolean} whether each element is a literal, or one under a unary operator, of a value printing like a name
	 */
	const holdsConstants = (array) => {
		const count = tree.fieldCount(Field.elements, array);
		if (count === 0 || holdsComments(array)) return false;
		for (let i = 0; i < count; i++) {
			const element = itemOf(i, Field.elements, array);
			const type = typeOf(element);
			if (
				!(
					type === NodeType.Literal ||
					(type === NodeType.UnaryExpression &&
						typeOf(childOf(Field.argument, element)) === NodeType.Literal)
				) ||
				!printsLikeName(evaluateConstant(element))
			) {
				return false;
			}
		}
		return true;
	};

	/**
	 * Counts a read of an array of `constantArrays` at a known index in range,
	 * where nothing writes, deletes or calls the element.
	 * @param {number} member a member expression
	 * @param {number} parent its parent
	 * @returns {void}
	 */
	const noteIndexRead = (member, parent) => {
		const object = childOf(Field.object, member);
		if (typeOf(object) !== NodeType.Identifier) return;
		const definition = /** @type {MinifierVariable} */ (
			/** @type {TreeDefinition[]} */ (mangledNames)[object]
		);
		const array = constantArrays.get(definition);
		if (array === undefined) return;
		const property = childOf(Field.property, member);
		const index =
			typeOf(property) === NodeType.Literal ? tree.value(property) : null;
		if (
			!tree.flag(Flag.computed, member) ||
			tree.flag(Flag.optional, member) ||
			typeof index !== "number" ||
			!Number.isInteger(index) ||
			index < 0 ||
			index >= tree.fieldCount(Field.elements, array) ||
			!isSetBefore(definition, object)
		) {
			return;
		}
		switch (typeOf(parent)) {
			// One in parentheses may be what they write: it keeps the array.
			case NodeType.ParenthesizedExpression:
			case NodeType.UpdateExpression:
			case NodeType.ArrayPattern:
			case NodeType.RestElement:
			case NodeType.TaggedTemplateExpression:
				return;
			case NodeType.AssignmentExpression:
			case NodeType.AssignmentPattern:
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
				if (childOf(Field.left, parent) === member) return;
				break;
			case NodeType.Property:
				if (childOf(Field.value, parent) === member) return;
				break;
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				if (childOf(Field.callee, parent) === member) return;
				break;
			case NodeType.UnaryExpression:
				if (tree.textOf(Part.operator, parent) === "delete") return;
				break;
		}
		const value = /** @type {string | number | boolean | null} */ (
			evaluateConstant(itemOf(index, Field.elements, array))
		);
		const reads = indexReads.get(definition);
		const longer =
			printedLength(value) - (tree.end(member) - tree.start(member));
		if (reads === undefined) {
			indexReads.set(definition, [1, longer]);
		} else {
			reads[0]++;
			reads[1] += longer;
		}
	};

	/**
	 * @param {number} member a member expression
	 * @returns {string | number | boolean | null | undefined} the element of an inlined constant array it reads, undefined where it reads none
	 */
	const inlinedElement = (member) => {
		const object = childOf(Field.object, member);
		if (
			inlinedArrays.size === 0 ||
			typeOf(object) !== NodeType.Identifier ||
			!tree.flag(Flag.computed, member)
		) {
			return undefined;
		}
		const definition = /** @type {MinifierVariable} */ (
			/** @type {TreeDefinition[]} */ (mangledNames)[object]
		);
		if (!inlinedArrays.has(definition)) return undefined;
		const array = /** @type {number} */ (constantArrays.get(definition));
		return evaluateConstant(
			itemOf(
				/** @type {number} */ (tree.value(childOf(Field.property, member))),
				Field.elements,
				array
			)
		);
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
		if (!isMinifierVariable(definition)) return;
		const set =
			sideEffectFree.size === 0 ? undefined : sideEffectFree.get(definition);
		const constant =
			definition.kind === DECLARES_LET || definition.kind === DECLARES_CONST
				? constantDeclarators.get(definition)
				: undefined;
		// A function its scope declares may be called before the name is set,
		// where a statement before the declarator calls anything.
		const readEarly =
			((set !== undefined && set !== 0 && setFirst[set] !== 1) ||
				(constant !== undefined && setFirst[constant] !== 1)) &&
			functionOf(definition) !== readingFunction &&
			mayRunEarly(functionOf(definition));
		if (readEarly && set !== undefined) sideEffectFree.delete(definition);
		if (keptNames.has(definition)) return;
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
		if (readEarly && constant !== undefined) {
			// Run before its declaration, the read throws: it prints the name.
			deadZoneReads.add(node);
			readInDeadZone.add(definition);
			if (inlined.delete(definition)) keptForSize.add(definition);
			return;
		}
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
		/** @type {MinifierScope} */ (
			/** @type {MinifierScope} */ (definition.scope).variableScope
		).node;

	/**
	 * Keeps the constants whose reads print shorter as their value, terser's
	 * test: the value no longer than the name and its declaration shared out.
	 * @returns {void}
	 */
	const chooseInlined = () => {
		for (const [definition, array] of constantArrays) {
			const reads = indexReads.get(definition);
			const declarator = /** @type {number} */ (
				constantDeclarators.get(definition)
			);
			// The declaration goes, `a=[…],` at least, where each read prints its element.
			if (
				reads !== undefined &&
				reads[0] === definition.referenceCount &&
				!readInDeadZone.has(definition) &&
				reads[1] <=
					tree.name(tree.field(0, Field.id, declarator)).length +
						tree.end(array) -
						tree.start(array)
			) {
				inlinedArrays.add(definition);
				droppedReads.set(definition, reads[0]);
			}
		}
		// A `var` set after a call, read where it may run first, keeps its name.
		for (const definition of keptForSize) {
			if (
				readsNested.has(definition) &&
				setFirst[
					/** @type {number} */ (constantDeclarators.get(definition))
				] === 2
			) {
				keptForSize.delete(definition);
			}
		}
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
			// An arrow's body opening with `{` would read as its block.
			case NodeType.ArrowFunctionExpression:
				return arrowReturned(parent) !== read || opensAmbiguously(value);
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
			// An `if` printing as `?:` makes its test a conditional's.
			case NodeType.IfStatement:
				return compresses && ifForm(parent) !== 0;
			case NodeType.VariableDeclarator:
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
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
			// What an arrow returns; one opening with `{` the callers check.
			case NodeType.ArrowFunctionExpression:
				return arrowReturned(parent) !== read;
			default:
				return true;
		}
	};

	/**
	 * @param {number} read a read being printed
	 * @returns {boolean} whether what prints there starts a statement or an arrow's body, where `{`, `function` or `class` opens something else
	 */
	const opensStatementOrBody = (read) => {
		const parent = parentAt(0);
		return (
			(typeOf(parent) === NodeType.ArrowFunctionExpression &&
				arrowReturned(parent) === read) ||
			firstInStatement(read, 0, true)
		);
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
		// An arrow's body wraps what opens with `{` itself, `leftIsObject`.
		return !opensAfterParenthesis(read, 0) && firstInStatement(read, 0, true);
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
		// A member read where a call binds `this`, a reference `delete` or
		// `typeof` reads, or `eval` called indirectly stays the value it was set to.
		if (
			readsReference(shown, node) &&
			(type !== NodeType.Identifier ||
				isUnaryType(typeOf(parentAt(0))) ||
				tree.name(shown) === "eval")
		) {
			output.print("(0,");
			printPiece(
				/** @type {JavascriptPrintContext} */ (writer).consume(value),
				heads[value],
				tails[value]
			);
			output.print(")");
			return;
		}
		// A `new` printing as a call takes what a call takes.
		const asCall =
			type === NodeType.NewExpression &&
			compresses &&
			constructsWhenCalled(shown);
		if (type === NodeType.SequenceExpression) {
			// The declarator or assignment it was set by printed it in parentheses,
			// which a `return`, `throw` or sequence around the read does without;
			// one item left of it printed bare.
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				value
			);
			const parentType = typeOf(parentAt(0));
			const bare =
				parentType === NodeType.ReturnStatement ||
				parentType === NodeType.ThrowStatement ||
				parentType === NodeType.SequenceExpression;
			if (!bareSequences.has(value)) {
				if (bare) printSlice(text.slice(1, -1));
				else printPiece(text, heads[value], tails[value]);
			} else if (bare || holdsAssignmentBare(node, 0)) {
				printPiece(text, heads[value], tails[value]);
			} else {
				output.print("(");
				printPiece(text, heads[value], tails[value]);
				output.print(")");
			}
			return;
		}
		const wrap = !(
			((type === NodeType.BinaryExpression ||
				type === NodeType.LogicalExpression) &&
				!operationNeedsParens(node, shown)) ||
			((type === NodeType.AssignmentExpression ||
				type === NodeType.ConditionalExpression ||
				type === NodeType.ArrowFunctionExpression) &&
				!lowNeedsParens(node) &&
				!(opensAmbiguously(shown) && firstInStatement(node, 0, true))) ||
			((type === NodeType.UnaryExpression ||
				type === NodeType.UpdateExpression ||
				type === NodeType.AwaitExpression ||
				(type === NodeType.NewExpression &&
					!asCall &&
					tree.fieldCount(Field.arguments, shown) === 0)) &&
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
			// An optional chain reads otherwise only called, accessed or tagging.
			(type === NodeType.ChainExpression &&
				!isCalledOrAccessed(node, parentAt(0)) &&
				typeOf(parentAt(0)) !== NodeType.TaggedTemplateExpression) ||
			((type === NodeType.CallExpression ||
				type === NodeType.MemberExpression ||
				type === NodeType.ImportExpression ||
				type === NodeType.MetaProperty ||
				type === NodeType.TaggedTemplateExpression ||
				asCall ||
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
	 * @param {number} node a callee
	 * @returns {number} the function moved to it where it is a name reading one, else itself
	 */
	const movedFunctionOf = (node) => {
		if (typeOf(node) !== NodeType.Identifier) return node;
		const defun = defunReads.size === 0 ? undefined : defunReads.get(node);
		if (defun !== undefined) return defun;
		const moved = movedTexts.size === 0 ? undefined : movedTexts.get(node);
		return moved === undefined ? node : moved[3];
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
					? functionNeedsParens(node, 0) ||
						// terser parenthesizes a function it tags a template with.
						(typeOf(parent) === NodeType.TaggedTemplateExpression &&
							childOf(Field.tag, parent) === node)
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
	 * `reducedValue` once what prints is known: an arrow's expression body, or
	 * the value of the one `return` of a body whose other statements print nothing.
	 * @param {number} fn a function written where it is called
	 * @param {number} call the call
	 * @returns {number} the value it returns, 0 where none, or where that reads a name of the function that prints as a name
	 */
	const printedValue = (fn, call) => {
		const body = childOf(Field.body, fn);
		if (
			(unreadBodies.size !== 0 && unreadBodies.has(fn)) ||
			!passesFixedNames(fn, call)
		) {
			return 0;
		}
		// An arrow's expression body is its value.
		if (typeOf(body) !== NodeType.BlockStatement) {
			return readsCalledFunction(fn, body) ? 0 : body;
		}
		let value = 0;
		const count = tree.fieldCount(Field.body, body);
		for (let i = 0; i < count; i++) {
			const statement = tree.field(i, Field.body, body);
			if (printsNothing(statement)) continue;
			if (value !== 0 || typeOf(statement) !== NodeType.ReturnStatement) {
				return 0;
			}
			value = childOf(Field.argument, statement);
			if (value === 0) return 0;
		}
		return value === 0 ||
			readsCalledFunction(fn, value) ||
			readsOwnName(fn, value)
			? 0
			: value;
	};

	/**
	 * @param {number} fn a function
	 * @param {number} node a node inside it
	 * @returns {boolean} whether it reads a name the function declares, other than a parameter, and prints it as that name, not the value folded there
	 */
	const readsOwnName = (fn, node) => {
		const start = tree.start(fn);
		const end = tree.end(fn);
		return findNode(node, (inner) => {
			if (tree.type(inner) !== NodeType.Identifier) return undefined;
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[inner];
			if (!isMinifierVariable(definition) || definition.undeclared) {
				return undefined;
			}
			const declaredAt = tree.start(
				/** @type {MinifierScope} */ (definition.scope).node
			);
			if (declaredAt < start || declaredAt >= end) return undefined;
			if (collapsed.size !== 0 && collapsed.has(inner)) {
				const value = /** @type {number} */ (collapsed.get(inner));
				// An assignment setting nothing prints as its value.
				return readsOwnName(
					fn,
					dropsWrite[value] === 1 ? childOf(Field.right, value) : value
				);
			}
			if (isInlinedRead(inner)) return undefined;
			const params = tree.fieldCount(Field.params, fn);
			for (let i = 0; i < params; i++) {
				const param = tree.field(i, Field.params, fn);
				if (
					/** @type {TreeDefinition[]} */ (mangledNames)[param] === definition
				) {
					return undefined;
				}
			}
			return true;
		});
	};

	/**
	 * @param {number} param a parameter
	 * @param {number} argument what a call passes it
	 * @returns {boolean} whether the parameter goes, its reads printing the constant passed
	 */
	const inlinesArgument = (param, argument) =>
		constantArguments.size !== 0 &&
		dropped[param] === 1 &&
		constantArguments.get(param) === argument;

	/**
	 * @param {number} fn a function written where it is called
	 * @param {number} call the call
	 * @returns {boolean} whether it runs at once, neither async nor a generator nor holding comments, each parameter a name never written passed one set before the call, a constant its reads print, or passed nothing and read nowhere
	 */
	const passesFixedNames = (fn, call) => {
		const count = tree.fieldCount(Field.params, fn);
		const passed = tree.fieldCount(Field.arguments, call);
		if (
			count < passed ||
			tree.flag(Flag.async, fn) ||
			tree.flag(Flag.generator, fn) ||
			holdsComments(fn)
		) {
			return false;
		}
		for (let i = 0; i < count; i++) {
			const param = tree.field(i, Field.params, fn);
			if (i >= passed) {
				// A parameter passed nothing that nothing reads.
				const definition = /** @type {TreeDefinition[]} */ (mangledNames)[
					param
				];
				if (
					typeOf(param) !== NodeType.Identifier ||
					!isMinifierVariable(definition) ||
					definition.referenceCount !== 0
				) {
					return false;
				}
				continue;
			}
			const argument = itemOf(i, Field.arguments, call);
			if (inlinesArgument(param, argument)) continue;
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
			const param = tree.field(i, Field.params, fn);
			const argument = itemOf(i, Field.arguments, call);
			if (inlinesArgument(param, argument)) continue;
			substituted.set(
				/** @type {TreeDefinition[]} */ (mangledNames)[param],
				argument
			);
		}
	};

	/**
	 * Undoes `noteReduced`: the call prints as a call again.
	 * @param {number} fn the function
	 * @param {number} call the call
	 * @returns {void}
	 */
	const undoReduced = (fn, call) => {
		reducing.delete(fn);
		reducedCalls.delete(call);
		const count = tree.fieldCount(Field.params, fn);
		for (let i = 0; i < count; i++) {
			substituted.delete(
				/** @type {TreeDefinition[]} */ (mangledNames)[
					tree.field(i, Field.params, fn)
				]
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
		if (!inlinesFunctions) return;
		const callee = childOf(Field.callee, call);
		const type = typeOf(callee);
		if (
			type !== NodeType.FunctionExpression &&
			type !== NodeType.ArrowFunctionExpression
		) {
			return;
		}
		if (!passesNothing(call)) return;
		const value = reducedValue(callee, call);
		if (value !== 0) noteReduced(callee, call, value);
		else laterReducedCalls.push(call, callee);
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
				(!output.option("keepQuotedProps") ||
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
			hasEdgeComments(statement)
		) {
			return;
		}
		noteAssignment(assignment, statement);
	};

	/**
	 * Notes an assignment with `=` as `noteWrite` does, one whose value is read
	 * printing as that value where the name goes unread.
	 * @param {number} assignment an assignment
	 * @param {number} statement the expression statement it is, 0 for none
	 * @returns {void}
	 */
	const noteAssignment = (assignment, statement) => {
		const name = childOf(Field.left, assignment);
		const valueType = typeOf(childOf(Field.right, assignment));
		if (
			tree.textOf(Part.operator, assignment) !== "=" ||
			typeOf(name) !== NodeType.Identifier ||
			hasEdgeComments(name) ||
			countedWrites.has(name) ||
			// What prints nothing counted its names already.
			discounted[name] === 1 ||
			// Bare in place, a reference may be called as a method, as `eval`, or by `typeof`.
			(statement === 0 &&
				(valueType === NodeType.Identifier ||
					valueType === NodeType.MemberExpression ||
					valueType === NodeType.ChainExpression))
		) {
			return;
		}
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
			!writesSet(definition, tree.start(statement || assignment)) ||
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
	 * last of a sequence, what a `void` or `!` takes, a conditional's branches
	 * and the right side of `&&` and `||`.
	 * @param {number} node a statement's expression
	 * @returns {void}
	 */
	const noteUnreadValue = (node) => {
		for (;;) {
			const type = typeOf(node);
			if (type === NodeType.ConditionalExpression && !hasEdgeComments(node)) {
				const consequent = childOf(Field.consequent, node);
				unreadValues.add(consequent);
				noteUnreadValue(consequent);
				node = childOf(Field.alternate, node);
			} else if (
				type === NodeType.LogicalExpression &&
				tree.textOf(Part.operator, node) !== "??" &&
				!hasEdgeComments(node)
			) {
				node = childOf(Field.right, node);
			} else if (type === NodeType.SequenceExpression) {
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
	 * @param {number} statement a statement of a list
	 * @param {TreeDefinition} definition a name's definition
	 * @param {number=} count how many of a declaration's first declarators to read, all where not given
	 * @returns {boolean} whether it makes that name a class: declares the class, or a variable a class expression sets
	 */
	const makesClass = (statement, definition, count = -1) => {
		const names = /** @type {TreeDefinition[]} */ (mangledNames);
		if (typeOf(statement) === NodeType.ExportNamedDeclaration) {
			statement = tree.field(0, Field.declaration, statement);
		}
		const type = statement === 0 ? 0 : typeOf(statement);
		if (type === NodeType.ClassDeclaration) {
			return names[tree.field(0, Field.id, statement)] === definition;
		}
		if (type !== NodeType.VariableDeclaration) return false;
		if (count === -1) count = tree.fieldCount(Field.declarations, statement);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, statement);
			if (names[tree.field(0, Field.id, declarator)] === definition) {
				return (
					typeOf(childOf(Field.init, declarator)) === NodeType.ClassExpression
				);
			}
		}
		return false;
	};

	/**
	 * Notes a class extending a class made before it in the same list, and
	 * never set again, whose read there is made and so cannot throw.
	 * @param {number} node a class declaration of a list, or a class expression one of its declarators sets
	 * @param {number} list the list
	 * @param {number} index the place there of the statement holding it
	 * @param {number=} declarator where it is a declarator's value, that declarator's place in the statement, whose declarators before it are read too
	 * @returns {void}
	 */
	const noteExtendsDeclared = (node, list, index, declarator = 0) => {
		const superClass = childOf(Field.superClass, node);
		if (typeOf(superClass) !== NodeType.Identifier) return;
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[
			superClass
		];
		if (!isMinifierVariable(definition) || definition.written) return;
		for (let i = 0; i <= index; i++) {
			const statement = tree.field(i, Field.body, list);
			if (
				i < index
					? makesClass(statement, definition)
					: declarator > 0 && makesClass(statement, definition, declarator)
			) {
				madeReads.add(superClass);
				return;
			}
		}
	};

	/**
	 * Notes the `var` a declarator of a function's body declares with no value.
	 * @param {number} declarator the declarator
	 * @returns {void}
	 */
	const noteBareVar = (declarator) => {
		const id = tree.field(0, Field.id, declarator);
		if (typeOf(id) !== NodeType.Identifier || childOf(Field.init, declarator)) {
			return;
		}
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[id];
		if (isMinifierVariable(definition)) bareVars.add(definition);
	};

	/**
	 * @param {number} declaration a variable declaration
	 * @returns {boolean} whether each declarator declares a name, which may stand without a value
	 */
	const declaresNamesOnly = (declaration) => {
		for (
			let i = tree.fieldCount(Field.declarations, declaration) - 1;
			i >= 0;
			i--
		) {
			const declarator = tree.field(i, Field.declarations, declaration);
			if (typeOf(tree.field(0, Field.id, declarator)) !== NodeType.Identifier) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} read a read noted as `undefined`
	 * @returns {void}
	 */
	const foldUnsetRead = (read) => {
		unsetReads.add(read);
		findNode(read, discountRead);
	};

	/**
	 * Notes a read before `||` or `??` that runs once, before anything writes
	 * its `var`: one only its own declaration sets, the read in its value, or
	 * one only the right side the read guards sets, `S || (S = {})`.
	 * @param {number} node the name
	 * @param {number} parent the logical expression
	 * @returns {void}
	 */
	const noteGuardRead = (node, parent) => {
		const operator = tree.textOf(Part.operator, parent);
		if (
			childOf(Field.left, parent) !== node ||
			(operator !== "||" && operator !== "??")
		) {
			return;
		}
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[node];
		if (
			!isMinifierVariable(definition) ||
			// A parameter, a function or a catch name declared too sets it.
			definition.declarations !== 1 << DECLARES_VAR ||
			definition.writes > 1 ||
			definition.export !== 0 ||
			(definition.global && !modulesToplevel) ||
			/** @type {MinifierScope} */ (definition.scope).isPinned() ||
			functionOf(definition) !== readingFunction
		) {
			return;
		}
		if (definition.writes === 1) {
			const right = childOf(Field.right, parent);
			if (
				typeOf(right) === NodeType.AssignmentExpression &&
				tree.textOf(Part.operator, right) === "=" &&
				/** @type {TreeDefinition[]} */ (mangledNames)[
					tree.field(0, Field.left, right)
				] === definition
			) {
				guardReads.push(node, definition);
			}
			return;
		}
		if (typeOf(onceStatement) !== NodeType.VariableDeclaration) return;
		const count = tree.fieldCount(Field.declarations, onceStatement);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, onceStatement);
			const init = childOf(Field.init, declarator);
			if (
				init !== 0 &&
				/** @type {TreeDefinition[]} */ (mangledNames)[
					tree.field(0, Field.id, declarator)
				] === definition &&
				tree.start(node) >= tree.start(init) &&
				tree.end(node) <= tree.end(init)
			) {
				foldUnsetRead(node);
				return;
			}
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
			const expression = childOf(Field.expression, node);
			noteUnreadValue(expression);
			if (
				typeOf(expression) === NodeType.TemplateLiteral &&
				tree.fieldCount(Field.expressions, expression) !== 0 &&
				!holdsComments(expression)
			) {
				unreadTemplates.add(expression);
			}
		}
		if (type === NodeType.SwitchCase) {
			// A case's statements run in order once it is entered.
			const count = tree.fieldCount(Field.consequent, node);
			for (let i = 0; i < count; i++) {
				const statement = tree.field(i, Field.consequent, node);
				// Another case may read a `let` or `const` in its dead zone.
				if (declaresLexically(statement)) continue;
				if (i + 1 < count) {
					collapseInto(statement, tree.field(i + 1, Field.consequent, node));
				}
				if (typeOf(statement) !== NodeType.VariableDeclaration) continue;
				const declarations = tree.fieldCount(Field.declarations, statement);
				for (let j = 0; j < declarations; j++) {
					const declarator = tree.field(j, Field.declarations, statement);
					if (!hasEdgeComments(declarator)) {
						candidates.push(declarator);
						keepsEffect[declarator] = 2;
					}
				}
			}
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
			if (scopesVars && type !== NodeType.StaticBlock) noteDirectives(node);
			for (let i = 0; i < count; i++) {
				const statement = tree.field(i, Field.body, node);
				if (exited && neverReached(statement)) {
					dropped[statement] = 1;
					findNode(statement, discountRead);
					continue;
				}
				if (
					exited &&
					typeOf(statement) === NodeType.VariableDeclaration &&
					tree.textOf(Part.kind, statement) === "var" &&
					!holdsComments(statement) &&
					declaresNamesOnly(statement)
				) {
					// terser's `dead_code`: the `var` declares its names, setting none.
					const declarations = tree.fieldCount(Field.declarations, statement);
					for (let j = 0; j < declarations; j++) {
						const declarator = tree.field(j, Field.declarations, statement);
						const init = childOf(Field.init, declarator);
						if (init !== 0) {
							deadInits.add(declarator);
							findNode(init, discountRead);
						}
						candidates.push(declarator);
						keepsEffect[declarator] = 2;
					}
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
							typeOf(next) === NodeType.ThrowStatement ||
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
						if (scopesVars) {
							setFirst[declarator] = quiet ? 1 : 2;
							noteBareVar(declarator);
						}
						// A `using` binding is disposed of when its block ends, read or
						// not; a comment on a name or value would print where it folds.
						if (!disposes(statement) && !hasEdgeComments(declarator)) {
							candidates.push(declarator);
							keepsEffect[declarator] = 2;
						}
						const init = childOf(Field.init, declarator);
						if (typeOf(init) === NodeType.ClassExpression) {
							noteExtendsDeclared(init, node, i, j);
						}
						if (quiet && init !== 0 && findNode(init, findRun)) quiet = false;
					}
				} else if (
					statementType === NodeType.FunctionDeclaration ||
					statementType === NodeType.ClassDeclaration
				) {
					// Its comments go with it, as terser drops them; those after it
					// print before the statement after it.
					candidates.push(statement);
					if (statementType === NodeType.ClassDeclaration) {
						noteExtendsDeclared(statement, node, i);
					}
				} else if (
					(statementType === NodeType.DebuggerStatement && dropsDebugger) ||
					(statementType === NodeType.ExpressionStatement &&
						callsDroppedConsole(childOf(Field.expression, statement)))
				) {
					// terser's `drop_debugger` and `drop_console`: the call goes whole,
					// what its arguments read and run with it.
					dropped[statement] = 1;
					findNode(statement, discountRead);
				} else if (
					statementType === NodeType.BlockStatement &&
					dropsDeadCode &&
					tree.fieldCount(Field.body, statement) === 0 &&
					!holdsComments(statement)
				) {
					// An empty block runs nothing.
					dropped[statement] = 1;
				} else if (
					statementType === NodeType.ContinueStatement &&
					dropsDeadCode &&
					i === count - 1 &&
					LOOP_TYPES[typeOf(parent)] === 1 &&
					childOf(Field.body, parent) === node &&
					tree.field(0, Field.label, statement) === 0 &&
					!hasEdgeComments(statement)
				) {
					// A loop's body ending goes on to the next pass as its `continue` does.
					dropped[statement] = 1;
				} else if (neverLoopsLabeled(statement)) {
					dropped[statement] = 1;
					findNode(statement, discountRead);
				} else if (
					statementType === NodeType.TryStatement &&
					dropsDeadCode &&
					tree.fieldCount(Field.body, tree.field(0, Field.block, statement)) ===
						0 &&
					!holdsComments(statement) &&
					(tree.field(0, Field.handler, statement) === 0 ||
						!findNode(tree.field(0, Field.handler, statement), findHoisted))
				) {
					// An empty `try` throws nothing for its `catch` to take.
					const handler = tree.field(0, Field.handler, statement);
					const finalizer = tree.field(0, Field.finalizer, statement);
					if (finalizer === 0 || tree.fieldCount(Field.body, finalizer) === 0) {
						dropped[statement] = 1;
						findNode(statement, discountRead);
					} else {
						emptyTries.add(statement);
						if (handler !== 0) findNode(handler, discountRead);
					}
				} else if (statementType === NodeType.IfStatement) {
					if (neverRuns(statement)) {
						dropped[statement] = 1;
						findNode(statement, discountRead);
					} else {
						laterTests.push(statement, node);
						listIfs.push(statement);
						if (
							i === count - 2 &&
							(FUNCTION_TYPES[typeOf(parent)] === 1 ||
								LOOP_TYPES[typeOf(parent)] === 1) &&
							tree.field(0, Field.body, parent) === node
						) {
							exitElseCandidates.push(statement, node, parent);
						}
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
		} else if (type === NodeType.AssignmentExpression) {
			// What `delete` takes deletes nothing, where its value could.
			if (!deleted.has(node)) noteAssignment(node, 0);
		} else if (
			type === NodeType.UnaryExpression &&
			tree.textOf(Part.operator, node) === "delete"
		) {
			deleted.add(childOf(Field.argument, node));
		} else if (type === NodeType.Identifier) {
			noteRead(node, parent);
			if (
				onceStatement !== 0 &&
				typeOf(parent) === NodeType.LogicalExpression
			) {
				noteGuardRead(node, parent);
			}
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
			if (typeOf(childOf(Field.callee, node)) === NodeType.Identifier) {
				namedCalls.push(node);
			}
		} else if (type === NodeType.NewExpression) {
			noteConstantArguments(node);
		} else if (type === NodeType.MemberExpression) {
			noteObjectWrite(node, parent);
			if (constantArrays.size !== 0) noteIndexRead(node, parent);
		} else if (type === NodeType.SwitchStatement) {
			laterSwitches.push(node, parent);
		} else if (
			(type === NodeType.ForStatement || type === NodeType.WhileStatement) &&
			dropsDeadCode &&
			breaksAtOnce(node)
		) {
			laterLoops.push(node, parent);
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
		if (
			dropsDeadCode &&
			(FUNCTION_TYPES[type] === 1 ||
				LOOP_TYPES[type] === 1 ||
				type === NodeType.LabeledStatement)
		) {
			tailHolders.push(node);
			if (
				type === NodeType.LabeledStatement &&
				LOOP_TYPES[typeOf(tree.field(0, Field.body, node))] === 1
			) {
				labeledParents.set(tree.field(0, Field.body, node), node);
			}
		}
		const outerFunction = readingFunction;
		const outerProbing = probingTry;
		// An `else if` known false goes, one known true prints its branch.
		if (
			type === NodeType.IfStatement &&
			typeOf(parent) === NodeType.IfStatement &&
			tree.field(0, Field.alternate, parent) === node
		) {
			if (neverRuns(node)) {
				dropped[node] = 1;
				findNode(node, discountRead);
			} else {
				laterTests.push(node, 0);
			}
		}
		// A `debugger` dropped prints nothing as a statement's body too.
		if (
			type === NodeType.DebuggerStatement &&
			dropsDebugger &&
			HOLDS_BODY[typeOf(parent)] === 1
		) {
			dropped[node] = 1;
		}
		const outerStrict = walkStrict;
		// A class's code is strict.
		if (
			type === NodeType.ClassDeclaration ||
			type === NodeType.ClassExpression
		) {
			walkStrict = true;
		}
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
		const outerOnce = onceStatement;
		if (
			(type === NodeType.ExpressionStatement ||
				type === NodeType.VariableDeclaration) &&
			(parent === readingFunction ||
				(FUNCTION_TYPES[typeOf(readingFunction)] === 1 &&
					tree.field(0, Field.body, readingFunction) === parent))
		) {
			onceStatement = node;
		} else if (
			// A field's value runs for each instance.
			type === NodeType.ClassDeclaration ||
			type === NodeType.ClassExpression
		) {
			onceStatement = 0;
		}
		if (type === NodeType.FunctionDeclaration) {
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[
				tree.field(0, Field.id, node)
			];
			// A name not a variable is never looked up.
			declaredFunctions.set(/** @type {MinifierVariable} */ (definition), node);
		}
		if (FUNCTION_TYPES[type] === 1 || type === NodeType.StaticBlock) {
			onceStatement = 0;
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
		onceStatement = outerOnce;
		probingTry = outerProbing;
		walkStrict = outerStrict;
		inDerivedClass = outerDerived;
		thisThrows = outerThrows;
	};

	/**
	 * A `use strict` directive in strict code says nothing: it goes. One in
	 * code not yet strict makes the rest of the walk through its body strict.
	 * @param {number} body a program or a function's body
	 * @returns {void}
	 */
	const noteDirectives = (body) => {
		const count = tree.fieldCount(Field.body, body);
		for (let i = 0; i < count; i++) {
			const statement = tree.field(i, Field.body, body);
			const directive = tree.textOf(Part.directive, statement);
			if (directive === null) return;
			if (directive !== "use strict") continue;
			if (!walkStrict) {
				walkStrict = true;
			} else if (dropsUnused && !hasEdgeComments(statement)) {
				dropped[statement] = 1;
			}
		}
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
						typeOf(inner) === NodeType.ClassExpression ||
						typeOf(inner) === NodeType.ClassDeclaration
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
			!dropsUnused ||
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
			!mayDrop(definition) ||
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
	 * @returns {boolean} whether it reads the same after the folded value runs: any callee not reading the name where the value is stable, a name nothing writes, set before, or, for a local, a global the value does not assign where no `with` or `eval` answers it
	 */
	const readsSame = (callee, definition) => {
		// A stable value runs nothing and nothing changes it, so even a getter
		// or call in a member callee `o.f` sees the same before or after it.
		if (
			isStable(collapsingValue, definition) &&
			!readsDefinition(callee, definition)
		) {
			return true;
		}
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
	 * @param {number} statement a statement of a body
	 * @returns {boolean} whether it is a loop `neverLoops` drops, labeled or not
	 */
	const neverLoopsLabeled = (statement) => {
		let loop = statement;
		while (typeOf(loop) === NodeType.LabeledStatement) {
			if (hasEdgeComments(loop)) return false;
			loop = tree.field(0, Field.body, loop);
		}
		const type = typeOf(loop);
		return (
			(type === NodeType.WhileStatement ||
				(type === NodeType.ForStatement && childOf(Field.init, loop) === 0)) &&
			neverLoops(loop)
		);
	};

	/**
	 * terser's `dead_code` of a `while`, or a `for` setting nothing first: a
	 * test known false that runs nothing, and nothing its body declares seen
	 * outside it.
	 * @param {number} statement a loop of a body
	 * @returns {boolean} whether it goes
	 */
	const neverLoops = (statement) => {
		const test = childOf(Field.test, statement);
		if (!dropsDeadCode || test === 0 || holdsComments(statement)) return false;
		const value = evaluateConstant(test);
		return (
			((value !== undefined && !value) || isUndefinedValue(test)) &&
			isPureTest(test) &&
			!findNode(tree.field(0, Field.body, statement), findHoisted)
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
			((value !== undefined && !value) || isUndefinedValue(test)) &&
			isPureTest(test) &&
			!findNode(tree.field(0, Field.consequent, statement), findHoisted)
		);
	};

	/**
	 * @param {number} node a statement never running
	 * @returns {number[] | null} the names its `var`s bind, null where it declares a function
	 */
	const varNamesOf = (node) => {
		/** @type {number[]} */
		const names = [];
		/**
		 * @param {number} target a binding pattern or name
		 * @returns {void}
		 */
		const bound = (target) => {
			findNode(target, (inner) => {
				switch (tree.type(inner)) {
					case NodeType.Identifier:
						names.push(inner);
						return false;
					case NodeType.AssignmentPattern:
						bound(tree.field(0, Field.left, inner));
						return false;
					case NodeType.Property:
						bound(tree.field(0, Field.value, inner));
						return false;
					case NodeType.MemberExpression:
						return false;
					default:
						return undefined;
				}
			});
		};
		const declaresFunction = findNode(node, (inner) => {
			const result = findHoisted(inner);
			if (result !== true) return result;
			if (typeOf(inner) === NodeType.FunctionDeclaration) return true;
			const count = tree.fieldCount(Field.declarations, inner);
			for (let i = 0; i < count; i++) {
				bound(tree.field(0, Field.id, tree.field(i, Field.declarations, inner)));
			}
			return false;
		});
		return declaresFunction ? null : names;
	};

	/**
	 * Drops an `if` whose known test picks a branch printing nothing.
	 * @param {number} statement an `if`
	 * @returns {void}
	 */
	const dropKeptNothing = (statement) => {
		const kept =
			keptBranches.size === 0 ? undefined : keptBranches.get(statement);
		if (
			kept !== undefined &&
			!hoistedFromDropped.has(statement) &&
			(kept === 0 ||
				(typeOf(kept) === NodeType.BlockStatement
					? !holdsComments(kept) && bracesNothing(kept, statement)
					: printsNothing(kept)))
		) {
			dropped[statement] = 1;
		}
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
		if (gone !== 0 && holdsComments(gone)) return;
		// What it declares with `var` is declared still, without the values.
		const hoisted =
			gone !== 0 && findNode(gone, findHoisted) ? varNamesOf(gone) : undefined;
		if (hoisted === null) return;
		// A name declared or written elsewhere too keeps the branch, as what
		// counts its writes and inlines its value counted that one.
		const names = /** @type {TreeDefinition[]} */ (mangledNames);
		if (hoisted !== undefined) {
			for (const name of hoisted) {
				const definition = /** @type {MinifierVariable} */ (names[name]);
				if (definition === null || definition.writes !== 0) return;
			}
		}
		const kept = value ? consequent : alternate;
		// Sloppy code declares a function an `if` holds only once that runs.
		if (typeOf(kept) === NodeType.FunctionDeclaration) return;
		keptBranches.set(statement, kept);
		if (hoisted !== undefined) {
			// A name only the branch reads is declared for nothing.
			/** @type {Map<TreeDefinition, number>} */
			const reads = new Map();
			findNode(gone, (inner) => {
				if (tree.type(inner) === NodeType.Identifier) {
					const definition = names[inner];
					reads.set(definition, (reads.get(definition) || 0) + 1);
				}
				return undefined;
			});
			let count = 0;
			for (const name of hoisted) {
				const definition = /** @type {MinifierVariable} */ (names[name]);
				if (
					!mayGoUnread(name) ||
					definition.referenceCount >=
						/** @type {number} */ (reads.get(definition))
				) {
					hoisted[count++] = name;
				}
			}
			hoisted.length = count;
		}
		if (hoisted !== undefined && hoisted.length !== 0) {
			hoistedFromDropped.set(statement, hoisted);
			for (const name of hoisted) {
				hoistedDefinitions.add(
					/** @type {TreeDefinition[]} */ (mangledNames)[name]
				);
			}
		}
		if (gone !== 0) findNode(gone, discountRead);
		findNode(test, discountRead);
	};

	/**
	 * @param {number} node a node walked in a loop's body
	 * @returns {boolean | undefined} true for a `break` or `continue` that may leave the loop, or a `switch` holding one, false to skip what another loop or function holds
	 */
	const findLoopExit = (node) => {
		switch (typeOf(node)) {
			case NodeType.BreakStatement:
			case NodeType.ContinueStatement:
			case NodeType.SwitchStatement:
				return true;
			case NodeType.ForStatement:
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement:
			case NodeType.FunctionDeclaration:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.ClassDeclaration:
			case NodeType.ClassExpression:
				return false;
			default:
				return undefined;
		}
	};

	/**
	 * @param {number} node a node walked in what a `switch` runs
	 * @returns {boolean | undefined} true for a `break` leaving the `switch`, false to skip what another loop, `switch` or function holds
	 */
	const findSwitchBreak = (node) => {
		switch (typeOf(node)) {
			case NodeType.BreakStatement:
				return tree.field(0, Field.label, node) === 0 ? true : undefined;
			case NodeType.ForStatement:
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement:
			case NodeType.SwitchStatement:
			case NodeType.FunctionDeclaration:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.ClassDeclaration:
			case NodeType.ClassExpression:
				return false;
			default:
				return undefined;
		}
	};

	/**
	 * terser's `switches` of a known value: the statements from the case it
	 * matches, or the `default`, to the first `break` print in its place.
	 * @param {number} node the `switch`
	 * @param {number} parent its parent
	 * @returns {void}
	 */
	const noteFoldedSwitch = (node, parent) => {
		if (!dropsDeadCode || hasEdgeComments(node)) return;
		const discriminant = childOf(Field.discriminant, node);
		let value = evaluateConstant(discriminant);
		// `(w(),42)` is known by its last: what it runs before runs first.
		let tests = false;
		if (
			value === undefined &&
			typeOf(discriminant) === NodeType.SequenceExpression
		) {
			const last = itemOf(
				tree.fieldCount(Field.expressions, discriminant) - 1,
				Field.expressions,
				discriminant
			);
			value = evaluateConstant(last);
			tests = value !== undefined;
		}
		if (!tests && (value === undefined || !isPureTest(discriminant))) {
			noteConvergingSwitch(node);
			return;
		}
		const count = tree.fieldCount(Field.cases, node);
		let start = -1;
		let fallback = -1;
		for (let i = 0; i < count && start === -1; i++) {
			const test = childOf(Field.test, tree.field(i, Field.cases, node));
			if (test === 0) {
				fallback = i;
				continue;
			}
			const tested = evaluateConstant(test);
			// A case before the match runs its test.
			if (tested === undefined || !isPureTest(test)) return;
			if (tested === value) start = i;
		}
		if (start === -1) start = fallback;
		/** @type {Set<number>} */
		const kept = new Set();
		/** @type {number[]} */
		const gone = tests ? [] : [discriminant];
		let ended = start === -1;
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.cases, node);
			// A case prints nothing of its own, its comments included.
			if (hasEdgeComments(item)) return;
			const test = childOf(Field.test, item);
			if (test !== 0) gone.push(test);
			const statements = tree.fieldCount(Field.consequent, item);
			for (let j = 0; j < statements; j++) {
				const statement = tree.field(j, Field.consequent, item);
				if (i < start || ended) {
					gone.push(statement);
				} else if (
					typeOf(statement) === NodeType.BreakStatement &&
					tree.field(0, Field.label, statement) === 0
				) {
					ended = true;
					gone.push(statement);
				} else if (findNode(statement, findSwitchBreak)) {
					return;
				} else if (isStringStatement(statement)) {
					// Printed where the `switch` was, it could read as a directive.
					return;
				} else {
					kept.add(statement);
					// What follows a statement always leaving never runs.
					if (dropsDeadCode && exitsAlways(statement)) ended = true;
				}
			}
		}
		for (const part of gone) {
			const type = typeOf(part);
			// What a kept statement may read is declared where it runs too.
			if (
				holdsComments(part) ||
				type === NodeType.VariableDeclaration ||
				type === NodeType.ClassDeclaration ||
				findNode(part, findHoisted)
			) {
				return;
			}
		}
		// A label needs a statement to label; what runs first joins expressions.
		if (
			(kept.size === 0 &&
				(tests || typeOf(parent) === NodeType.LabeledStatement)) ||
			(tests && !foldedJoins(kept))
		) {
			return;
		}
		foldedSwitches.set(node, kept);
		if (tests) {
			testedSwitches.add(node);
			// What it tests prints as a statement's expression.
			unreadValues.add(discriminant);
		}
		// Running nothing, it is no statement.
		if (kept.size === 0) dropped[node] = 1;
		for (const part of gone) findNode(part, discountRead);
	};

	/**
	 * @param {Set<number>} kept the statements a folded `switch` runs
	 * @returns {boolean} whether they are expressions that print as one sequence, terser's `sequences`
	 */
	const foldedJoins = (kept) => {
		for (const statement of kept) {
			if (
				typeOf(statement) !== NodeType.ExpressionStatement ||
				tree.textOf(Part.directive, statement) !== null ||
				hasEdgeComments(statement) ||
				// A string alone prints apart, past a `;`.
				typeof evaluateConstant(childOf(Field.expression, statement)) ===
					"string" ||
				opensAmbiguously(childOf(Field.expression, statement)) ||
				(droppedConsole !== null &&
					callsDroppedConsole(childOf(Field.expression, statement)))
			) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} node a `switch`'s discriminant or case test
	 * @returns {boolean} whether it prints bare on either side of `===`
	 */
	const printsAboveEquality = (node) =>
		ABOVE_EQUALITY[typeOf(node)] === 1 &&
		(collapsed.size === 0 || !collapsed.has(node));

	/**
	 * terser's `switches` of one case: `switch(d){case t:s}` prints as
	 * `if(d===t){s}`, which compares and runs the same, in the same order.
	 * @param {number} node the `switch`
	 * @returns {number} its one case, 0 where it prints as a `switch`
	 */
	const switchAsIf = (node) => {
		if (
			!compresses ||
			!dropsDeadCode ||
			hasEdgeComments(node) ||
			(foldedSwitches.size !== 0 && foldedSwitches.has(node))
		) {
			return 0;
		}
		if (printedCases(node) !== 1) return 0;
		const item = tree.field(0, Field.cases, node);
		const test = childOf(Field.test, item);
		if (
			test === 0 ||
			hasEdgeComments(item) ||
			!printsAboveEquality(test) ||
			!printsAboveEquality(childOf(Field.discriminant, node)) ||
			// A known one `noteFoldedSwitch` kept, it keeps.
			evaluateConstant(childOf(Field.discriminant, node)) !== undefined
		) {
			return 0;
		}
		const statements = tree.fieldCount(Field.consequent, item);
		let printed = 0;
		for (let i = 0; i < statements; i++) {
			const statement = tree.field(i, Field.consequent, item);
			if (i === statements - 1 && isPlainBreak(statement)) break;
			// A `break` leaving the `switch` has no `switch` to leave in an `if`,
			// and the case test reads names its body declares, as an `if` test not.
			if (
				findNode(statement, findSwitchBreak) ||
				declaresLexically(statement)
			) {
				return 0;
			}
			if (!printsNothing(statement)) printed++;
		}
		return printed === 0 ? 0 : item;
	};

	/**
	 * @param {number} node a `switch`
	 * @param {number} parent its parent
	 * @returns {number} its one case where it prints as an `if` no `else` can follow, else 0
	 */
	const printedSwitchAsIf = (node, parent) => {
		const parentType = typeOf(parent);
		if (
			LISTS_STATEMENTS[parentType] === 1 ||
			FUNCTION_TYPES[parentType] === 1
		) {
			const item = switchAsIf(node);
			return item !== 0 ? item : switchAsIfElse(node);
		}
		return parentType === NodeType.IfStatement &&
			tree.field(0, Field.alternate, parent) === 0
			? switchAsIf(node)
			: 0;
	};

	/**
	 * terser's `switches` of one case and a `default`: the case's statements
	 * run where its test matches, the `default`'s otherwise, `else` taking them
	 * after a `break`, and where one falls into the other, the other after.
	 * Printing as two statements or an `if` the `else` ends, it stands only in
	 * a list, whose block keeps its braces.
	 * @param {number} node the `switch`
	 * @returns {number} its case with a test, 0 where it prints otherwise
	 */
	const switchAsIfElse = (node) => {
		let found = switchElses.get(node);
		if (found !== undefined) return found;
		found = 0;
		if (
			compresses &&
			dropsDeadCode &&
			!hasEdgeComments(node) &&
			!(foldedSwitches.size !== 0 && foldedSwitches.has(node)) &&
			printedCases(node) === 2 &&
			printsAboveEquality(childOf(Field.discriminant, node)) &&
			evaluateConstant(childOf(Field.discriminant, node)) === undefined
		) {
			const first = tree.field(0, Field.cases, node);
			const second = tree.field(1, Field.cases, node);
			const item = childOf(Field.test, first) === 0 ? second : first;
			const other = item === first ? second : first;
			const test = childOf(Field.test, item);
			if (
				test !== 0 &&
				childOf(Field.test, other) === 0 &&
				!hasEdgeComments(item) &&
				!hasEdgeComments(other) &&
				printsAboveEquality(test) &&
				runsAsBody(item) &&
				runsAsBody(other)
			) {
				found = item;
			}
		}
		switchElses.set(node, found);
		return found;
	};

	/**
	 * @param {number} item a case
	 * @returns {boolean} whether its statements run as an `if`'s body: no `break` of the `switch` but one ending them, and no name declared in the block
	 */
	const runsAsBody = (item) => {
		const statements = tree.fieldCount(Field.consequent, item);
		for (let i = 0; i < statements; i++) {
			const statement = tree.field(i, Field.consequent, item);
			if (i === statements - 1 && isPlainBreak(statement)) break;
			if (
				findNode(statement, findSwitchBreak) ||
				declaresLexically(statement)
			) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} item a case
	 * @returns {boolean} whether any of its statements prints, but a `break` ending them
	 */
	const runsCaseStatements = (item) => {
		const statements = tree.fieldCount(Field.consequent, item);
		for (let i = 0; i < statements; i++) {
			const statement = tree.field(i, Field.consequent, item);
			if (i === statements - 1 && isPlainBreak(statement)) break;
			if (!printedNothing(statement)) return true;
		}
		return false;
	};

	/**
	 * @param {number} item a case
	 * @returns {boolean} whether a `break` ends its statements
	 */
	const endsInBreak = (item) => {
		const statements = tree.fieldCount(Field.consequent, item);
		return (
			statements !== 0 &&
			isPlainBreak(tree.field(statements - 1, Field.consequent, item))
		);
	};

	/**
	 * Prints a `switch` of one case as the `if` `switchAsIf` finds it is.
	 * @param {number} node the `switch`
	 * @param {number} item its one case
	 * @returns {void}
	 */
	const printSwitchAsIf = (node, item) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const count = tree.fieldCount(Field.cases, node);
		const other =
			printedCases(node) < 2
				? 0
				: tree.field(
						tree.field(0, Field.cases, node) === item ? 1 : 0,
						Field.cases,
						node
					);
		// With the `default` first falling into the case, it runs where the test
		// fails, as it does after a case running nothing; one running nothing goes.
		const breaks = other !== 0 && endsInBreak(tree.field(0, Field.cases, node));
		const negates =
			other !== 0 &&
			((tree.field(0, Field.cases, node) === other && !breaks) ||
				(breaks && !runsCaseStatements(item)));
		const alone =
			other !== 0 && !negates && breaks && !runsCaseStatements(other);
		output.print("if");
		output.space();
		output.print("(");
		printNode(childOf(Field.discriminant, node));
		output.space();
		output.print(negates ? "!==" : "===");
		output.space();
		printNode(childOf(Field.test, item));
		output.print(")");
		if (other === 0 || alone) {
			printCaseBody(item, false);
		} else if (negates) {
			printCaseBody(other, false);
			printCaseStatements(item);
		} else if (breaks) {
			// The first ends in a `break`: the other runs only where it does not.
			printCaseBody(item, true);
			output.space();
			output.print("else");
			printCaseBody(other, false);
		} else {
			printCaseBody(item, false);
			printCaseStatements(other);
		}
		for (let i = count - 1; i >= 0; i--) {
			context.consume(tree.field(i, Field.cases, node));
		}
	};

	/**
	 * Prints a case's statements as an `if`'s body, but a `break` ending them.
	 * @param {number} item the case
	 * @param {boolean} beforeElse whether an `else` follows
	 * @returns {void}
	 */
	const printCaseBody = (item, beforeElse) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const statements = tree.fieldCount(Field.consequent, item);
		let only = 0;
		let printed = 0;
		for (let i = 0; i < statements; i++) {
			const statement = tree.field(i, Field.consequent, item);
			if (i === statements - 1 && isPlainBreak(statement)) break;
			if (!printedNothing(statement)) {
				only = statement;
				printed++;
			}
		}
		const type = typeOf(only);
		// One statement prints bare, but one an `else` after or a string could misread.
		const bare =
			printed === 1 &&
			(type === NodeType.ReturnStatement ||
				type === NodeType.ThrowStatement ||
				type === NodeType.ContinueStatement ||
				type === NodeType.BreakStatement ||
				type === NodeType.SwitchStatement ||
				// The `if` it prints as already counts as open to an `else` after.
				(type === NodeType.IfStatement && !beforeElse) ||
				(type === NodeType.ExpressionStatement &&
					typeof evaluateConstant(childOf(Field.expression, only)) !==
						"string")) &&
			context.get(only).length !== 0;
		if (bare) output.space();
		else output.print("{");
		printCaseStatements(item);
		if (!bare) output.print("}");
		else if (beforeElse) output.semicolon();
	};

	/**
	 * Prints a case's statements where they are, but a `break` ending them.
	 * @param {number} item the case
	 * @returns {void}
	 */
	const printCaseStatements = (item) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const statements = tree.fieldCount(Field.consequent, item);
		for (let i = 0; i < statements; i++) {
			const statement = tree.field(i, Field.consequent, item);
			if (
				printedNothing(statement) ||
				(i === statements - 1 && isPlainBreak(statement))
			) {
				context.consume(statement);
			} else {
				printNode(statement);
			}
		}
	};

	/**
	 * @param {number} node a `switch`
	 * @returns {number} how many of its cases print: those before the run of cases ending it that run nothing, a test that runs nothing and no statement but a `break`, unless a `default` before that run would catch their values
	 */
	const printedCases = (node) => {
		let count = tree.fieldCount(Field.cases, node);
		for (; count > 0; count--) {
			const item = tree.field(count - 1, Field.cases, node);
			const test = childOf(Field.test, item);
			const statements = tree.fieldCount(Field.consequent, item);
			if (
				hasEdgeComments(item) ||
				(test !== 0 && !isPureValue(test)) ||
				statements > 1 ||
				(statements === 1 &&
					!isPlainBreak(tree.field(0, Field.consequent, item)))
			) {
				break;
			}
		}
		const all = tree.fieldCount(Field.cases, node);
		if (count === all) return count;
		for (let i = 0; i < count; i++) {
			if (tree.field(0, Field.test, tree.field(i, Field.cases, node)) === 0) {
				return all;
			}
		}
		return count;
	};

	/**
	 * terser's `switches` of one whose every case falls into the last, a
	 * `default` among them: whatever it tests, it runs the last case's
	 * expressions, after what it tests.
	 * @param {number} node a `switch` whose value is not known
	 * @returns {void}
	 */
	const noteConvergingSwitch = (node) => {
		const count = tree.fieldCount(Field.cases, node);
		let fallback = false;
		// Decided before anything is built: most `switch`es stop here.
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.cases, node);
			const test = childOf(Field.test, item);
			if (
				hasEdgeComments(item) ||
				(i < count - 1 && tree.fieldCount(Field.consequent, item) !== 0) ||
				// A case before the match runs its test.
				(test !== 0 && !isPureTest(test))
			) {
				return;
			}
			if (test === 0) fallback = true;
		}
		// A comment on what it tests stays, as the known-value fold keeps it.
		if (!fallback || holdsComments(tree.field(0, Field.discriminant, node))) {
			return;
		}
		/** @type {number[]} */
		const gone = [];
		for (let i = 0; i < count; i++) {
			const test = childOf(Field.test, tree.field(i, Field.cases, node));
			if (test !== 0) gone.push(test);
		}
		const last = tree.field(count - 1, Field.cases, node);
		/** @type {Set<number>} */
		const kept = new Set();
		let ended = false;
		const statements = tree.fieldCount(Field.consequent, last);
		for (let j = 0; j < statements; j++) {
			const statement = tree.field(j, Field.consequent, last);
			if (ended) {
				gone.push(statement);
			} else if (isPlainBreak(statement)) {
				ended = true;
				gone.push(statement);
			} else {
				// An expression `foldedJoins` asks for holds no `break` of it.
				kept.add(statement);
			}
		}
		if (kept.size === 0 || !foldedJoins(kept)) return;
		for (const part of gone) {
			if (holdsComments(part) || findNode(part, findHoisted)) return;
		}
		foldedSwitches.set(node, kept);
		testedSwitches.add(node);
		for (const part of gone) findNode(part, discountRead);
	};

	/**
	 * Prints the statements a folded `switch` runs where it is, the rest of
	 * it printing nothing.
	 * @param {number} node the `switch`
	 * @param {Set<number>} kept the statements it runs
	 * @returns {void}
	 */
	const printFoldedSwitch = (node, kept) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const bare = printsBareSwitch(kept, 0);
		const discriminant = childOf(Field.discriminant, node);
		// Its statements, all expressions, join what it tests where that runs.
		const tests =
			testedSwitches.size !== 0 &&
			testedSwitches.has(node) &&
			!(dropsSideEffectFree && isPureValue(discriminant));
		const joins = (tests || kept.size > 1) && foldedJoins(kept);
		let printed = false;
		if (!bare) output.print(kept.size === 0 ? "{}" : "{");
		if (tests) {
			// What it tests runs first, its statements joining it.
			printNode(discriminant, opensAmbiguously(discriminant));
			output.mightNeedSemicolon = true;
			printed = true;
		} else {
			context.consume(discriminant);
		}
		const count = tree.fieldCount(Field.cases, node);
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.cases, node);
			const test = tree.field(0, Field.test, item);
			if (test !== 0) context.consume(test);
			const statements = tree.fieldCount(Field.consequent, item);
			for (let j = 0; j < statements; j++) {
				const statement = tree.field(j, Field.consequent, item);
				if (
					!kept.has(statement) ||
					context.get(statement).length === 0 ||
					printsNothing(statement)
				) {
					context.consume(statement);
				} else if (printed && joins) {
					printJoined(statement, "expression");
				} else {
					printNode(statement);
					printed = true;
				}
			}
			context.consume(item);
		}
		if (!bare && kept.size !== 0) output.print("}");
	};

	/**
	 * @param {Set<number>} kept the statements a folded `switch` runs
	 * @param {number} level where the `switch`'s parent is among the printed one's
	 * @returns {boolean} whether they print bare in the `switch`'s place, else in braces
	 */
	const printsBareSwitch = (kept, level) => {
		let declares = false;
		let only = 0;
		for (const statement of kept) {
			const type = typeOf(statement);
			if (
				(type === NodeType.VariableDeclaration &&
					tree.textOf(Part.kind, statement) !== "var") ||
				type === NodeType.ClassDeclaration ||
				type === NodeType.FunctionDeclaration
			) {
				declares = true;
			}
			only = statement;
		}
		if (declares) return false;
		const onlyType = typeOf(only);
		if (kept.size > 1 && foldedJoins(kept)) return true;
		if (
			kept.size === 1 &&
			(onlyType === NodeType.ExpressionStatement ||
				onlyType === NodeType.ReturnStatement ||
				onlyType === NodeType.ThrowStatement)
		) {
			return true;
		}
		// A function's body is reached past; a block printing without braces
		// holds one statement only.
		const parentType = typeOf(parentAt(level));
		return (
			parentType === NodeType.Program ||
			parentType === NodeType.StaticBlock ||
			parentType === NodeType.SwitchCase ||
			FUNCTION_TYPES[parentType] === 1
		);
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
	 * @param {number} node an expression
	 * @returns {number} the operand a logical or conditional prints as where it folds, else the node
	 */
	const foldedTo = (node) => {
		if (!dropsDeadCode) return node;
		const type = typeOf(node);
		let kept =
			type === NodeType.LogicalExpression
				? foldedOperand(node)
				: type === NodeType.ConditionalExpression
					? foldedBranch(node)
					: 0;
		if (kept === 0 && type === NodeType.ConditionalExpression) {
			kept = alikeBranch(node);
		}
		return kept === 0 ? node : kept;
	};

	/**
	 * @param {number} node a logical or conditional expression
	 * @param {number} parent its parent
	 * @returns {boolean} whether it prints as a unary operand under a `!`, which takes that bare
	 */
	const foldsToNegated = (node, parent) =>
		isNegation(parent) && typeOf(foldedTo(node)) === NodeType.UnaryExpression;

	/**
	 * @param {number} node a logical or conditional expression
	 * @returns {boolean} whether it prints as one of its operands that no place parenthesizes: a literal other than a number, a template or an array
	 */
	const foldsToBareValue = (node) => {
		if (!dropsDeadCode) return false;
		let kept =
			typeOf(node) === NodeType.LogicalExpression
				? foldedOperand(node)
				: foldedBranch(node);
		if (kept === 0 && typeOf(node) === NodeType.ConditionalExpression) {
			kept = alikeBranch(node);
		}
		const type = typeOf(kept);
		const parent = parentAt(0);
		return (
			(type === NodeType.Literal && typeof tree.value(kept) !== "number") ||
			type === NodeType.TemplateLiteral ||
			type === NodeType.ArrayExpression ||
			// An object, function or class reads otherwise only opening a statement.
			((type === NodeType.ObjectExpression ||
				type === NodeType.FunctionExpression ||
				type === NodeType.ClassExpression) &&
				!firstInStatement(node, 0, true)) ||
			// What `new` calls takes parentheses where it calls.
			((type === NodeType.Identifier ||
				type === NodeType.ThisExpression ||
				type === NodeType.MemberExpression ||
				type === NodeType.CallExpression) &&
				!(
					typeOf(parent) === NodeType.NewExpression &&
					childOf(Field.callee, parent) === node &&
					!isNewTarget(kept)
				))
		);
	};

	/**
	 * @param {number} node an assignment
	 * @param {number} parent its parent
	 * @returns {boolean} whether it sets nothing read and prints as a value no operator around parenthesizes
	 */
	const printsBareValue = (node, parent) => {
		if (!compresses || node >= dropsWrite.length || dropsWrite[node] !== 1) {
			return false;
		}
		const value = childOf(Field.right, node);
		switch (typeOf(value)) {
			case NodeType.CallExpression:
				return !(
					typeOf(parent) === NodeType.NewExpression &&
					childOf(Field.callee, parent) === node
				);
			case NodeType.Identifier:
			case NodeType.ThisExpression:
			case NodeType.ArrayExpression:
			case NodeType.TemplateLiteral:
				return true;
			case NodeType.Literal:
				return typeof tree.value(value) === "string";
			default:
				return false;
		}
	};

	/**
	 * @param {number} node a node
	 * @returns {number} the assignment to a name or member a logical expression prints as, else 0
	 */
	const foldsToAssignment = (node) => {
		if (!dropsDeadCode || typeOf(node) !== NodeType.LogicalExpression) {
			return 0;
		}
		const kept = foldedOperand(node);
		if (typeOf(kept) !== NodeType.AssignmentExpression) return 0;
		const left = typeOf(tree.field(0, Field.left, kept));
		return left === NodeType.ObjectPattern || left === NodeType.ArrayPattern
			? 0
			: kept;
	};

	/**
	 * @param {number} node a conditional
	 * @returns {number} the branch it prints as where its branches are alike and its test runs nothing, else 0
	 */
	const alikeBranch = (node) => {
		const consequent = childOf(Field.consequent, node);
		const alternate = childOf(Field.alternate, node);
		return compresses &&
			dropsSideEffectFree &&
			isPureValue(childOf(Field.test, node)) &&
			branchesAlike(node, consequent, alternate)
			? consequent
			: 0;
	};

	/**
	 * terser's `dead_code` of a conditional: a test known that runs nothing
	 * leaves the branch it picks, which prints where the conditional was.
	 * @param {number} node a conditional
	 * @returns {number} the branch it prints as, 0 where it stays
	 */
	const foldedBranch = (node) => {
		const kept = pickedBranch(node);
		return kept !== 0 && bindsReference(kept, node) ? 0 : kept;
	};

	/**
	 * @param {number} node a conditional
	 * @returns {number} the branch its known test picks, which may be a reference its parent reads; 0 where it stays
	 */
	const pickedBranch = (node) => {
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
		return kept;
	};

	/**
	 * terser's `dead_code` of `&&`, `||` and `??`: a left side known that runs
	 * nothing leaves the side the operator picks.
	 * @param {number} node a logical expression
	 * @returns {number} the side it prints as, 0 where it stays
	 */
	const foldedOperand = (node) => {
		const kept = pickedOperand(node);
		return kept !== 0 && bindsReference(kept, node) ? 0 : kept;
	};

	/**
	 * @param {number} kept what a conditional or logical expression folds to
	 * @param {number} node that expression, being printed
	 * @returns {boolean} whether its parent would read the reference it is, as a call binds `this` to one other than a bare name
	 */
	const bindsReference = (kept, node) =>
		readsReference(kept, node) &&
		!(typeOf(kept) === NodeType.Identifier && callsBareName(kept, node));

	/**
	 * @param {number} node a logical expression
	 * @param {boolean=} printing whether it is the node being printed, whose place is known
	 * @returns {number} the side its known left side picks, which may be a reference its parent reads; 0 where it stays
	 */
	const pickedOperand = (node, printing = false) => {
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		const operator = tree.textOf(Part.operator, node);
		if (operator === "??") {
			// What is never `null` or `undefined` leaves `??` nothing to run.
			if (
				neverNullish(left) &&
				!holdsComments(right) &&
				(!opensAmbiguously(left) ||
					(printing && !firstInStatement(node, 0, true)))
			) {
				return left;
			}
			// esbuild's `void 0??x` as `x`, which `evaluateConstant` leaves unknown.
			if (
				isUndefinedValue(left) &&
				!holdsComments(left) &&
				isPureValue(left) &&
				!opensAmbiguously(right)
			) {
				return right;
			}
		}
		// Read before anything writes it, its `var` holds `undefined`.
		const unset = unsetReads.size !== 0 && unsetReads.has(left);
		foldsAtPrint = true;
		const value = unset ? undefined : evaluateConstant(left);
		const pure = unset || (value !== undefined && isPureTest(left));
		foldsAtPrint = false;
		if (!pure) return 0;
		const picksLeft =
			!unset &&
			(operator === "&&" ? !value : operator === "||" ? value : value !== null);
		const [kept, gone] = picksLeft ? [left, right] : [right, left];
		// What an unset read folds to is a declarator's value or an assignment,
		// neither starting a statement where the declarator prints as one.
		if (holdsComments(gone) || (!unset && opensAmbiguously(kept))) return 0;
		return kept;
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
		// terser's `maintain_this_binding`: `(0,x.y)()` calls it with no `this`.
		if (bindsReference(kept, node)) {
			output.print("0");
			output.comma();
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
		const reader = referenceReader(node);
		return reader !== 0 && typeOf(reader) !== NodeType.NewExpression;
	};

	/**
	 * The parent that reads a node's reference, past parents printing as the
	 * node, as `1&&(0,x.y)` does.
	 * @param {number} node the node, being printed
	 * @returns {number} the call, `new`, tag, `delete` or `typeof` reading it, 0 for none
	 */
	const referenceReader = (node) => {
		let child = node;
		let level = 0;
		let parent = parentAt(0);
		for (;;) {
			switch (typeOf(parent)) {
				case NodeType.LogicalExpression:
					if (pickedOperand(parent) !== child) return 0;
					break;
				case NodeType.ConditionalExpression:
					if (pickedBranch(parent) !== child) return 0;
					break;
				case NodeType.UnaryExpression: {
					const operator = tree.textOf(Part.operator, parent);
					return operator === "delete" || operator === "typeof" ? parent : 0;
				}
				case NodeType.CallExpression:
				case NodeType.NewExpression:
					return childOf(Field.callee, parent) === child ? parent : 0;
				case NodeType.TaggedTemplateExpression:
					return childOf(Field.tag, parent) === child ? parent : 0;
				default:
					return 0;
			}
			child = parent;
			parent = parentAt(++level);
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
		// A function moved to a read that goes prints nowhere, nor what it reads,
		// unless a comment on it keeps it where it is.
		if (moveReads.size !== 0 && moveReads.has(node)) {
			const moved = /** @type {number} */ (movedCallees.get(node));
			if (!hasEdgeComments(moved)) findNode(moved, discountRead);
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
		trimmedArguments.clear();
		movedCallees.clear();
		unreadBodies.clear();
		unreadValues.clear();
		unreadTemplates.clear();
		unreadStatements.clear();
		droppedReads.clear();
		countedWrites.clear();
		argumentsReaders.clear();
		inlined.clear();
		sideEffectFree.clear();
		exportedDeclarators.clear();
		constantValues.clear();
		constantDeclarators.clear();
		constantArrays.clear();
		indexReads.clear();
		inlinedArrays.clear();
		keptForSize.clear();
		keptNames.clear();
		deadZoneReads.clear();
		madeReads.clear();
		readInDeadZone.clear();
		unsetReads.clear();
		deadInits.clear();
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
		foldedCalls.clear();
		foldedCallSizes.clear();
		laterReducedCalls.length = 0;
		laterUnreadCalls.length = 0;
		keptBranches.clear();
		hoistedFromDropped.clear();
		hoistedDefinitions.clear();
		exitElses.clear();
		emptyTries.clear();
		unreadParts.clear();
		breakTests.clear();
		breakIfs.clear();
		voidTails.clear();
		breakElses.clear();
		plainTests.clear();
		switchElses.clear();
		deleted.clear();
		mergedSpans.clear();
		mergedArguments.clear();
		foldedSwitches.clear();
		jumpedLabels.clear();
		testedSwitches.clear();
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
			output.option("quoteStyle") !== 0 ||
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
			const encoded = output.encodeString(
				value,
				value.includes('"') ? "'" : '"'
			);
			output.print(`\`${encoded.slice(1, -1)}\``);
		} else {
			output.printString(value);
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
	 * @param {number} candidate a declarator, or a function or class declaration
	 * @returns {number} its name, where only its reads keep it and its value makes nothing happen, else 0
	 */
	const heldByReads = (candidate) => {
		const type = typeOf(candidate);
		const id = tree.field(0, Field.id, candidate);
		if (!mayGoUnread(id)) return 0;
		if (type === NodeType.FunctionDeclaration) return id;
		if (type === NodeType.ClassDeclaration) {
			return isPureValue(candidate) ? id : 0;
		}
		const init = childOf(Field.init, candidate);
		return init !== 0 &&
			aliasesRead[candidate] === 0 &&
			!keepsValue.has(candidate) &&
			isPureValue(init)
			? id
			: 0;
	};

	/**
	 * Drops the declarations nothing printed reads but each other, which
	 * counting reads never frees: what code that prints reads stays, as does
	 * what that reads, and the rest go.
	 * @param {number[]} candidates the declarators and declarations that may go
	 * @returns {boolean} whether any went
	 */
	const dropUnreadCycles = (candidates) => {
		/** @type {Map<TreeDefinition, number>} */
		const held = new Map();
		for (let i = 0; i < candidates.length; i++) {
			const candidate = candidates[i];
			if (dropped[candidate] !== 0) continue;
			const id = heldByReads(candidate);
			if (id !== 0) {
				held.set(/** @type {TreeDefinition[]} */ (mangledNames)[id], candidate);
			}
		}
		if (held.size === 0) return false;
		// By candidate, the held names it reads; by name, how often those read it.
		/** @type {Map<number, TreeDefinition[]>} */
		const readsOf = new Map();
		const heldNodes = new Set(held.values());
		/** @type {Map<TreeDefinition, number>} */
		const heldReads = new Map();
		// The candidate walked, and the held names it reads.
		let candidate = 0;
		/** @type {TreeDefinition[]} */
		let reads = [];
		/**
		 * @param {number} node a node of the candidate
		 * @returns {boolean | undefined} false past a held candidate inside it
		 */
		const noteHeldRead = (node) => {
			const type = typeOf(node);
			if (node !== candidate && heldNodes.has(node)) return false;
			if (
				type !== NodeType.Identifier ||
				countedWrites.has(node) ||
				discounted[node] === 1
			) {
				return;
			}
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[node];
			const declaring = held.get(definition);
			if (
				declaring === undefined ||
				tree.field(0, Field.id, declaring) === node
			) {
				return;
			}
			reads.push(definition);
			heldReads.set(definition, (heldReads.get(definition) || 0) + 1);
		};
		for (const node of heldNodes) {
			candidate = node;
			reads = [];
			readsOf.set(candidate, reads);
			findNode(candidate, noteHeldRead);
		}
		/** @type {TreeDefinition[]} */
		const live = [];
		/** @type {Set<TreeDefinition>} */
		const kept = new Set();
		for (const definition of held.keys()) {
			const outside =
				/** @type {MinifierVariable} */ (definition).referenceCount -
				(droppedReads.get(definition) || 0) -
				(heldReads.get(definition) || 0);
			if (outside > 0) {
				kept.add(definition);
				live.push(definition);
			}
		}
		while (live.length !== 0) {
			const definition = /** @type {TreeDefinition} */ (live.pop());
			const reads = /** @type {TreeDefinition[]} */ (
				readsOf.get(/** @type {number} */ (held.get(definition)))
			);
			for (const read of reads) {
				if (kept.has(read)) continue;
				kept.add(read);
				live.push(read);
			}
		}
		if (kept.size === held.size) return false;
		for (const [definition, candidate] of held) {
			if (kept.has(definition)) continue;
			dropped[candidate] = 1;
			findNode(candidate, discountRead);
		}
		return true;
	};

	/**
	 * Where the walk prints the function a read prints first: at the read, or
	 * where a function printed first holding the read is printed.
	 * @param {number} read a read in `earlyDefuns`
	 * @returns {number} the offset the walk prints it at
	 */
	const earlyPrintStart = (read) => {
		for (const [outerRead, outer] of earlyDefuns) {
			if (
				tree.start(read) > tree.start(outer) &&
				tree.end(read) <= tree.end(outer)
			) {
				return earlyPrintStart(outerRead);
			}
		}
		return tree.start(read);
	};

	/**
	 * Drops the trailing arguments of calls to a declared function that runs
	 * nothing and goes to a parameter nothing reads, or to none, terser's
	 * `unused` on a call: `f(0,0)` with `function f(a,b){return a}` is `f(0)`.
	 * @returns {boolean} whether one went, whose reads then go uncounted
	 */
	const trimArguments = () => {
		let changed = false;
		// Kept for the next round: only those stopped by a parameter still read.
		let kept = 0;
		for (let c = 0; c < namedCalls.length; c++) {
			const call = namedCalls[c];
			const definition = /** @type {TreeDefinition[]} */ (mangledNames)[
				childOf(Field.callee, call)
			];
			if (
				!isMinifierVariable(definition) ||
				definition.written ||
				definition.declarations !== 1 << DECLARES_DEFUN ||
				/** @type {MinifierScope} */ (definition.scope).isPinned()
			) {
				continue;
			}
			const fn = declaredFunctions.get(definition);
			// `arguments` reads each argument passed, a parameter or not.
			if (fn === undefined || readsArguments(fn)) continue;
			const params = tree.fieldCount(Field.params, fn);
			// A rest reads every argument from its own on, and a default may read
			// `arguments`, which `readsArguments` looks for in the body alone.
			if (!plainParameters(fn, params)) continue;
			// A spread may pass none, moving every argument after it down.
			if (spreadsArgument(call)) continue;
			for (let i = tree.fieldCount(Field.arguments, call) - 1; i >= 0; i--) {
				const argument = itemOf(i, Field.arguments, call);
				if (trimmedArguments.has(argument)) continue;
				// A comment anywhere in it may be one that prints, as a license.
				if (holdsComments(argument) || findNode(argument, arrowHoldsComments)) {
					break;
				}
				if (i < params && !isUnreadParameter(itemOf(i, Field.params, fn))) {
					namedCalls[kept++] = call;
					break;
				}
				if (!isPureValue(argument)) break;
				trimmedArguments.add(argument);
				findNode(argument, discountRead);
				changed = true;
			}
		}
		namedCalls.length = kept;
		return changed;
	};

	/**
	 * `holdsComments` of an arrow, its parameters to its body's end: an arrow's
	 * own end token is 0, as terser reads it, so the arrow alone scans none.
	 * @param {number} node a node walked
	 * @returns {true | undefined} true for an arrow holding a comment
	 */
	const arrowHoldsComments = (node) => {
		if (
			commentTokens === null ||
			typeOf(node) !== NodeType.ArrowFunctionExpression
		) {
			return;
		}
		// A curried arrow's body is an arrow too, ending at token 0 as well.
		let body = childOf(Field.body, node);
		while (typeOf(body) === NodeType.ArrowFunctionExpression) {
			body = childOf(Field.body, body);
		}
		const end = commentTokens.ends[body];
		for (let token = commentTokens.starts[node]; token <= end; token++) {
			if (hasComments(token, 3)) return true;
		}
	};

	/**
	 * @param {number} fn a function
	 * @param {number} params how many parameters it has
	 * @returns {boolean} whether each is a plain name, with no default, pattern or rest
	 */
	const plainParameters = (fn, params) => {
		for (let i = 0; i < params; i++) {
			if (typeOf(itemOf(i, Field.params, fn)) !== NodeType.Identifier) {
				return false;
			}
		}
		return true;
	};

	/**
	 * @param {number} call a call
	 * @returns {boolean} whether it passes a spread
	 */
	const spreadsArgument = (call) => {
		const count = tree.fieldCount(Field.arguments, call);
		for (let i = 0; i < count; i++) {
			if (typeOf(itemOf(i, Field.arguments, call)) === NodeType.SpreadElement) {
				return true;
			}
		}
		return false;
	};

	/**
	 * @param {number} param a parameter
	 * @returns {boolean} whether it is a plain name nothing reads, which a default, a pattern or a rest is not
	 */
	const isUnreadParameter = (param) => {
		if (typeOf(param) !== NodeType.Identifier || hasEdgeComments(param)) {
			return false;
		}
		const definition = /** @type {TreeDefinition[]} */ (mangledNames)[param];
		return (
			isMinifierVariable(definition) &&
			definition.referenceCount <= (droppedReads.get(definition) || 0)
		);
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
		if (readsPureAnnotations && commentTokens !== null) {
			const table = /** @type {TokenTable} */ (output.tokenTables.last);
			for (let i = 0, count = table.commentCount(); i < count; i++) {
				if (NO_SIDE_EFFECTS_ANNOTATION.test(table.commentValue(i))) {
					findNode(program, noteSideEffectFree);
					break;
				}
			}
		}
		// A module's code is strict.
		walkStrict = modulesToplevel;
		collectDroppable(program, 0, candidates);
		for (const statement of expressionStatements) {
			if (runsNothing(statement)) {
				dropped[statement] = 1;
				findNode(statement, discountRead);
			}
		}
		expressionStatements.length = 0;
		for (let i = 0; i < guardReads.length; i += 2) {
			if (bareVars.has(/** @type {MinifierVariable} */ (guardReads[i + 1]))) {
				foldUnsetRead(/** @type {number} */ (guardReads[i]));
			}
		}
		guardReads.length = 0;
		bareVars.clear();
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
		bareSequences.clear();
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
			dropKeptNothing(statement);
			// What follows a branch always leaving the list never runs.
			const list = laterTests[i + 1];
			if (
				list === 0 ||
				!keptBranches.has(statement) ||
				!exitsAlways(statement)
			) {
				continue;
			}
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
		// An `else if` resolved after its `if` may leave that one keeping nothing.
		for (let i = laterTests.length - 2; i >= 0; i -= 2) {
			if (dropped[laterTests[i]] !== 1) dropKeptNothing(laterTests[i]);
		}
		for (let i = 0; i < laterSwitches.length; i += 2) {
			const statement = laterSwitches[i];
			const parent = laterSwitches[i + 1];
			noteFoldedSwitch(statement, parent);
			// One with no case left that tests what runs nothing goes from its list.
			if (
				dropsDeadCode &&
				(typeOf(parent) === NodeType.BlockStatement ||
					typeOf(parent) === NodeType.Program) &&
				!foldedSwitches.has(statement) &&
				!holdsComments(statement) &&
				printedCases(statement) === 0 &&
				isPureValue(childOf(Field.discriminant, statement))
			) {
				dropped[statement] = 1;
				findNode(statement, discountRead);
			}
		}
		laterSwitches.length = 0;
		for (let i = 0; i < laterLoops.length; i += 2) {
			const statement = laterLoops[i];
			const test = childOf(Field.test, statement);
			// Set up by nothing, testing what runs nothing, it runs nothing, and
			// goes from its list.
			if (
				LISTS_STATEMENTS[typeOf(laterLoops[i + 1])] === 1 &&
				!holdsComments(statement) &&
				(typeOf(statement) === NodeType.WhileStatement ||
					tree.field(0, Field.init, statement) === 0) &&
				(test === 0 || isPureValue(test))
			) {
				dropped[statement] = 1;
				findNode(statement, discountRead);
			}
		}
		laterLoops.length = 0;
		foldsAtPrint = false;
		laterTests.length = 0;
		// A function moved to its read prints there, reads and all.
		const moves = treeMoves === null ? [] : treeMoves;
		for (let i = 0; i < moves.length; i += 2) {
			const moved = moves[i];
			// A comment on the function would not print at the read: it stays.
			if (
				hasEdgeComments(
					typeOf(moved) === NodeType.VariableDeclarator
						? childOf(Field.init, moved)
						: moved
				)
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
				if (writeStatements[i] !== 0 && isPureValue(value)) {
					dropped[writeStatements[i]] = 1;
					findNode(value, discountRead);
				}
			}
			if (trimArguments()) changed = true;
			if (!changed) changed = dropUnreadCycles(candidates);
		}
		writeStatements.length = 0;
		namedCalls.length = 0;
		declaredFunctions.clear();
		for (let i = 0; i < exitPairs.length; i += 2) {
			const statement = exitPairs[i];
			const next = exitPairs[i + 1];
			if (dropped[statement] !== 1 && dropped[next] !== 1) {
				mergedExits[statement] |= 1;
				mergedExits[next] |= 2;
			}
		}
		exitPairs.length = 0;
		if (!mayUseAsm) {
			for (const holder of tailHolders) dropTailExits(holder);
			for (const holder of tailHolders) noteBreakTest(holder);
		}
		tailHolders.length = 0;
		labeledParents.clear();
		for (const statement of listIfs) {
			const test = childOf(Field.test, statement);
			if (
				dropped[statement] !== 1 &&
				!keptBranches.has(statement) &&
				runsOnlyTest(statement) &&
				!holdsComments(statement) &&
				isPureValue(test)
			) {
				dropped[statement] = 1;
				findNode(test, discountRead);
			}
		}
		listIfs.length = 0;
		for (let i = 0; i < exitElseCandidates.length; i += 3) {
			noteExitElse(
				exitElseCandidates[i],
				exitElseCandidates[i + 1],
				exitElseCandidates[i + 2]
			);
		}
		exitElseCandidates.length = 0;
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
			else laterReducedCalls.push(call, fn);
		}
		// A function printed ahead of its place prints what it reads moved
		// there too, so each must be printed by then; else it stays in place.
		for (const [read, defun] of earlyDefuns) {
			// One only what goes reads prints nowhere, so not first either.
			if (discounted[read] !== 1) {
				const printedFrom = earlyPrintStart(read);
				let readsLater = false;
				for (let i = 0; i < moves.length && !readsLater; i += 2) {
					const inner = moves[i + 1];
					readsLater =
						dropped[moves[i]] === 1 &&
						tree.start(inner) > tree.start(defun) &&
						tree.end(inner) <= tree.end(defun) &&
						tree.end(moves[i]) > printedFrom &&
						!earlyDefuns.has(inner);
				}
				if (!readsLater) continue;
				dropped[defun] = 0;
			}
			defunReads.delete(read);
			movedDefuns.delete(defun);
			earlyDefuns.delete(read);
			const call = callReads.get(read);
			if (call !== undefined && reducedCalls.has(call)) {
				undoReduced(defun, call);
			}
		}
		for (let i = 0; i < freshArguments.length; i += 4) {
			const param = freshArguments[i + 1];
			const argument = freshArguments[i + 2];
			const read = freshArguments[i + 3];
			// A read in what goes prints nowhere, nor would the value.
			if (discounted[read] === 1) continue;
			const definition = /** @type {MinifierVariable} */ (
				/** @type {TreeDefinition[]} */ (mangledNames)[param]
			);
			dropped[param] = 1;
			constantArguments.set(param, argument);
			passedConstants.set(argument, param);
			collapsed.set(read, argument);
			droppedReads.set(definition, (droppedReads.get(definition) || 0) + 1);
			earlyArguments.set(read, argument);
		}
		freshArguments.length = 0;
		for (let i = 0; i < laterReducedCalls.length; i += 2) {
			const call = laterReducedCalls[i];
			const fn = laterReducedCalls[i + 1];
			const read = childOf(Field.callee, call);
			// A function moved to its one read only while it still moves there.
			if (
				read !== fn &&
				!(movedDefuns.has(fn) && defunReads.get(read) === fn) &&
				movedReads.get(fn) !== read
			) {
				continue;
			}
			const outerFunction = readingFunction;
			if (read !== fn) {
				readingFunction = /** @type {number} */ (callReaders.get(call));
			}
			const value = printedValue(fn, call);
			readingFunction = outerFunction;
			if (value !== 0) noteReduced(fn, call, value);
		}
		for (let i = 0; i < laterUnreadCalls.length; i += 2) {
			noteUnreadCall(laterUnreadCalls[i], laterUnreadCalls[i + 1], true);
		}
		laterUnreadCalls.length = 0;
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
					undoReduced(fn, call);
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
				definition.export === 0 &&
				!hoistedDefinitions.has(definition)
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
			// A `do` body keeps its braces, as terser prints it.
			typeOf(parent) === NodeType.DoWhileStatement ||
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
		// One printing as two statements or an `if` with an `else` keeps them.
		if (
			typeOf(statement) === NodeType.SwitchStatement &&
			switchAsIf(statement) === 0 &&
			switchAsIfElse(statement) !== 0
		) {
			return 0;
		}
		const rest = breakElses.size === 0 ? undefined : breakElses.get(statement);
		if (rest !== undefined) {
			// An `if` joined to its loop's test prints as the branch it keeps.
			const restType = typeOf(rest);
			return restType === NodeType.BlockStatement ||
				restType === NodeType.FunctionDeclaration
				? 0
				: statement;
		}
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
				? // One printing a value alone prints as that statement.
					printedValues(statement) !== 1 &&
					(tree.textOf(Part.kind, statement) !== "var" ||
						printsApart(statement))
				: type === NodeType.FunctionDeclaration ||
					type === NodeType.ClassDeclaration
		) {
			return 0;
		}
		return typeOf(parent) === NodeType.IfStatement &&
			tree.field(0, Field.consequent, parent) === block &&
			elseOf(parent) !== 0 &&
			endsInOpenIf(statement)
			? 0
			: statement;
	};

	/**
	 * @param {number} exit a statement
	 * @param {number} holder the function or loop whose body holds the `if` it leaves by
	 * @returns {boolean} whether it leaves that body with nothing more run: a `return` of nothing from a function, a `continue` of the loop
	 */
	const leavesBody = (exit, holder) => {
		if (hasEdgeComments(exit)) return false;
		if (FUNCTION_TYPES[typeOf(holder)] === 1) {
			if (typeOf(exit) !== NodeType.ReturnStatement) return false;
			const argument = childOf(Field.argument, exit);
			return argument === 0 || returnsNothing(argument);
		}
		return (
			typeOf(exit) === NodeType.ContinueStatement &&
			tree.field(0, Field.label, exit) === 0
		);
	};

	/**
	 * @param {number} body a function's or loop's body
	 * @param {number} node an `if` of it
	 * @returns {number} the one statement printing after the `if`, 0 for none or several
	 */
	const restAfter = (body, node) => {
		let rest = 0;
		for (let i = tree.fieldCount(Field.body, body) - 1; i >= 0; i--) {
			const statement = tree.field(i, Field.body, body);
			if (statement === node) break;
			if (printsNothing(statement)) continue;
			if (rest !== 0) return 0;
			rest = statement;
		}
		return rest;
	};

	/**
	 * terser's `if_return` and `dead_code` of an exit ending its holder's body:
	 * a `return` of nothing ending a function's, a `continue` of the loop
	 * ending a loop's, a `break` of the label ending a labeled statement's.
	 * @param {number} holder a function, loop or labeled statement
	 * @returns {void}
	 */
	const dropTailExits = (holder) => {
		const type = typeOf(holder);
		const body = tree.field(0, Field.body, holder);
		if (FUNCTION_TYPES[type] === 1) {
			if (
				typeOf(body) !== NodeType.BlockStatement ||
				unreadBodies.has(holder)
			) {
				return;
			}
		} else if (type === NodeType.LabeledStatement) {
			// A loop's label is what its `continue` may name.
			if (LOOP_TYPES[typeOf(body)] === 1) return;
		} else {
			const parent = labeledParents.get(holder);
			if (parent !== undefined) holder = parent;
		}
		dropTailExit(body, holder, type);
		if (FUNCTION_TYPES[type] === 1) noteVoidTail(body, type);
		// A label whose body went labels nothing.
		if (
			type === NodeType.LabeledStatement &&
			(typeOf(body) === NodeType.BlockStatement
				? !holdsComments(body) && bracesNothing(body, holder)
				: printsNothing(body))
		) {
			dropped[holder] = 1;
		}
	};

	/**
	 * @param {number} statement a statement ending its holder's body
	 * @param {number} holder the function, loop or labeled statement, a loop's label in its place
	 * @param {number} kind the holder's type, a loop's even where its label stands for it
	 * @returns {void}
	 */
	const dropTailExit = (statement, holder, kind) => {
		switch (typeOf(statement)) {
			case NodeType.BlockStatement: {
				for (let i = tree.fieldCount(Field.body, statement) - 1; i >= 0; i--) {
					const item = tree.field(i, Field.body, statement);
					if (printsNothing(item)) continue;
					dropTailExit(item, holder, kind);
					// Gone, it leaves the statement before it last.
					if (!printsNothing(item)) return;
				}
				return;
			}
			case NodeType.IfStatement: {
				if (dropped[statement] === 1 || mergedExits[statement] !== 0) return;
				dropTailExit(tree.field(0, Field.consequent, statement), holder, kind);
				const alternate = tree.field(0, Field.alternate, statement);
				if (alternate !== 0) dropTailExit(alternate, holder, kind);
				dropKeptNothing(statement);
				return;
			}
			case NodeType.LabeledStatement:
				dropTailExit(tree.field(0, Field.body, statement), holder, kind);
				return;
			// A `finally` runs past an exit the `try` ends in, its own the last word.
			case NodeType.TryStatement: {
				const block = tree.field(0, Field.block, statement);
				dropTailExit(block, holder, kind);
				const handler = tree.field(0, Field.handler, statement);
				if (handler !== 0) {
					dropTailExit(tree.field(0, Field.body, handler), holder, kind);
				}
				const finalizer = tree.field(0, Field.finalizer, statement);
				if (
					dropsDeadCode &&
					finalizer !== 0 &&
					!emptyTries.has(statement) &&
					!holdsComments(statement) &&
					listsNothing(block) &&
					(handler === 0 || !findNode(handler, findHoisted))
				) {
					// With its exit gone the `try` runs nothing, its `finally` the tail.
					emptyTries.add(statement);
					if (handler !== 0) findNode(handler, discountRead);
				}
				if (emptyTries.has(statement)) {
					dropTailExit(finalizer, holder, kind);
					if (listsNothing(finalizer)) dropped[statement] = 1;
				}
				return;
			}
			default:
				break;
		}
		if (hasEdgeComments(statement)) return;
		const label =
			typeOf(statement) === NodeType.ReturnStatement
				? 0
				: tree.field(0, Field.label, statement);
		let leaves = false;
		switch (typeOf(statement)) {
			case NodeType.ReturnStatement: {
				const argument = childOf(Field.argument, statement);
				leaves =
					FUNCTION_TYPES[kind] === 1 &&
					(argument === 0 || returnsNothing(argument));
				break;
			}
			case NodeType.ContinueStatement:
				leaves =
					LOOP_TYPES[kind] === 1 && (label === 0 || namesLabel(label, holder));
				break;
			case NodeType.BreakStatement:
				leaves =
					kind === NodeType.LabeledStatement &&
					label !== 0 &&
					namesLabel(label, holder);
				break;
			default:
				break;
		}
		if (leaves) dropped[statement] = 1;
	};

	/**
	 * @returns {boolean} whether the block being printed ends the body of an `if` with an `else`, past the bodies of statements ending with it
	 */
	const endsBeforeElse = () => {
		for (let level = 0, child = current; ; level++) {
			const parent = parentAt(level);
			const type = typeOf(parent);
			if (type === NodeType.IfStatement) {
				if (tree.field(0, Field.consequent, parent) === child) {
					return elseOf(parent) !== 0;
				}
			} else if (
				type === NodeType.BlockStatement &&
				unwrappedStatement(parent, parentAt(level + 1)) === child
			) {
				// A block printing as its one statement ends where that does.
			} else if (
				HOLDS_BODY[type] !== 1 ||
				type === NodeType.DoWhileStatement ||
				tree.field(0, Field.body, parent) !== child
			) {
				return false;
			}
			child = parent;
		}
	};

	/**
	 * A `return` of what is `undefined` anyway ending a function's body prints
	 * as a statement of what it runs, its value unread: `return void f()` is `f()`.
	 * Nested in an `if`, it would no longer leave before what follows the `if`.
	 * @param {number} body the function's body
	 * @param {number} type the function's type
	 * @returns {void}
	 */
	const noteVoidTail = (body, type) => {
		// An arrow's body of one `return` prints as what that returns.
		if (type === NodeType.ArrowFunctionExpression) return;
		let last = 0;
		for (
			let i = tree.fieldCount(Field.body, body) - 1;
			i >= 0 && last === 0;
			i--
		) {
			const item = tree.field(i, Field.body, body);
			if (!printsNothing(item)) last = item;
		}
		if (
			typeOf(last) !== NodeType.ReturnStatement ||
			hasEdgeComments(last) ||
			returnedBy.has(last)
		) {
			return;
		}
		const argument = childOf(Field.argument, last);
		if (
			argument === 0 ||
			returnsNothing(argument) ||
			// An async generator awaits what it returns, a tick a bare end takes not.
			awaitedReturns.has(argument) ||
			!givesUndefined(argument)
		) {
			return;
		}
		voidTails.add(last);
		unreadValues.add(argument);
		noteUnreadValue(argument);
	};

	/**
	 * @param {number} argument what a `return` returns
	 * @returns {boolean} whether it is `undefined` whatever runs: a `void`, or a sequence ending in `undefined`
	 */
	const givesUndefined = (argument) => {
		if (hasEdgeComments(argument)) return false;
		switch (typeOf(argument)) {
			case NodeType.UnaryExpression:
				return tree.textOf(Part.operator, argument) === "void";
			case NodeType.SequenceExpression:
				return isUndefinedValue(
					itemOf(
						tree.fieldCount(Field.expressions, argument) - 1,
						Field.expressions,
						argument
					)
				);
			default:
				return false;
		}
	};

	/**
	 * terser's `loops`: a `for` or `while` body opening with `if(x)break`
	 * loops while `!x` too, which joins the loop's test, as does `x` of
	 * `if(x)y;else break`, `y` printing where the `if` was.
	 * @param {number} loop a function, loop or labeled statement
	 * @returns {void}
	 */
	const noteBreakTest = (loop) => {
		const type = typeOf(loop);
		if (type !== NodeType.ForStatement && type !== NodeType.WhileStatement) {
			return;
		}
		const body = tree.field(0, Field.body, loop);
		let first = body;
		if (typeOf(body) === NodeType.BlockStatement) {
			// Its test would read past a name the block scopes.
			if (scopesLexically(body)) return;
			first = 0;
			const count = tree.fieldCount(Field.body, body);
			for (let i = 0; i < count && first === 0; i++) {
				const item = tree.field(i, Field.body, body);
				if (!printsNothing(item)) first = item;
			}
		}
		if (
			typeOf(first) !== NodeType.IfStatement ||
			dropped[first] === 1 ||
			holdsComments(first) ||
			mergedExits[first] !== 0 ||
			keptBranches.has(first)
		) {
			return;
		}
		const consequent = tree.field(0, Field.consequent, first);
		const alternate = elseOf(first);
		let rest = 0;
		if (!isBareBreak(unwrappedBranch(consequent, first))) {
			if (alternate === 0 || !isBareBreak(unwrappedBranch(alternate, first))) {
				return;
			}
			rest = consequent;
		} else if (alternate !== 0) {
			rest = alternate;
		}
		if (
			rest === 0 ||
			typeOf(rest) === NodeType.EmptyStatement ||
			(typeOf(rest) === NodeType.BlockStatement &&
				!holdsComments(rest) &&
				listsNothing(rest))
		) {
			dropped[first] = 1;
		} else {
			breakElses.set(first, rest);
		}
		breakTests.set(loop, first);
		breakIfs.add(first);
	};

	/**
	 * @param {number} statement a statement, 0 for none
	 * @returns {boolean} whether it is a `break` naming no label
	 */
	const isBareBreak = (statement) =>
		typeOf(statement) === NodeType.BreakStatement &&
		tree.field(0, Field.label, statement) === 0 &&
		!hasEdgeComments(statement);

	/**
	 * Prints a loop's test joined with the `!x` of the `if(x)break` opening its
	 * body, `breakTests` has it.
	 * @param {number} test the loop's test, 0 for none or one always true
	 * @param {number} exit the `if`
	 * @returns {void}
	 */
	const printBreakTest = (test, exit) => {
		const negated = childOf(Field.test, exit);
		if (test !== 0) {
			printNode(test, !joinsLogical(shownAs(test), "&&", false));
			output.print("&&");
		}
		if (
			!isBareBreak(unwrappedBranch(tree.field(0, Field.consequent, exit), exit))
		) {
			// `if(x)y;else break` loops while `x`.
			printNode(negated, test !== 0 && !joinsLogical(negated, "&&", false));
			return;
		}
		const keepsParentheses =
			test !== 0 &&
			isNegation(negated) &&
			!joinsLogical(childOf(Field.argument, negated), "&&", false);
		if (!printsNegatedTest(negated, keepsParentheses)) {
			printNegatedAs(negated, "!");
		}
	};

	/**
	 * @param {number} label a `break`'s or `continue`'s label
	 * @param {number} holder a statement, maybe labeled
	 * @returns {boolean} whether it names the holder's label
	 */
	const namesLabel = (label, holder) =>
		typeOf(holder) === NodeType.LabeledStatement &&
		tree.name(tree.field(0, Field.label, holder)) === tree.name(label);

	/**
	 * terser's `if_return` with a body: `if(t){x();return}y` ending a function
	 * is `if(t)x();else y`, as is `if(t){x();continue}y` ending a loop's body.
	 * @param {number} node an `if` second to last in the body
	 * @param {number} body the body
	 * @param {number} holder the function or loop
	 * @returns {void}
	 */
	const noteExitElse = (node, body, holder) => {
		const block = tree.field(0, Field.consequent, node);
		if (
			!dropsDeadCode ||
			dropped[node] === 1 ||
			keptBranches.has(node) ||
			mergedExits[node] !== 0 ||
			elseOf(node) !== 0 ||
			hasEdgeComments(node) ||
			typeOf(block) !== NodeType.BlockStatement ||
			holdsComments(block)
		) {
			return;
		}
		const count = tree.fieldCount(Field.body, block);
		const exit = tree.field(count - 1, Field.body, block);
		if (count < 2 || !leavesBody(exit, holder)) return;
		// Only expressions print before the `else`, none an `if` it would take.
		let runs = false;
		for (let i = 0; i < count - 1; i++) {
			const statement = tree.field(i, Field.body, block);
			if (
				typeOf(statement) !== NodeType.ExpressionStatement ||
				!printsOneStatement(statement, 0)
			) {
				return;
			}
			if (dropped[statement] !== 1) runs = true;
		}
		const rest = restAfter(body, node);
		if (
			!runs ||
			rest === 0 ||
			hasEdgeComments(rest) ||
			!printsOneStatement(
				rest,
				FUNCTION_TYPES[typeOf(holder)] === 1 ? holder : body
			)
		) {
			return;
		}
		dropped[exit] = 1;
		exitElses.set(node, rest);
	};

	/**
	 * @param {number} node an `if` printed now
	 * @returns {number} the one statement printing after it where it is a statement of its function's body, or its loop's, leaving it with nothing, which then prints as its body; 0 for none
	 */
	const guardedRest = (node) => {
		let holder = parentAt(0);
		if (FUNCTION_TYPES[typeOf(holder)] !== 1) {
			holder = parentAt(1);
			if (
				LOOP_TYPES[typeOf(holder)] !== 1 ||
				tree.field(0, Field.body, holder) !== parentAt(0)
			) {
				return 0;
			}
		}
		if (
			elseOf(node) !== 0 ||
			hasEdgeComments(node) ||
			(node < foundSize && mergedExits[node] !== 0)
		) {
			return 0;
		}
		const exit = unwrappedBranch(tree.field(0, Field.consequent, node), node);
		if (!leavesBody(exit, holder)) return 0;
		const body = tree.field(0, Field.body, holder);
		const rest = restAfter(body, node);
		return rest !== 0 &&
			!hasEdgeComments(rest) &&
			printsOneStatement(rest, holder === parentAt(0) ? holder : body)
			? rest
			: 0;
	};

	/**
	 * @param {number} block a block
	 * @returns {boolean} whether it lists a declaration printing, which no statement's body may be bare
	 */
	const listsDeclaration = (block) => {
		for (let i = tree.fieldCount(Field.body, block) - 1; i >= 0; i--) {
			let statement = tree.field(i, Field.body, block);
			// An `if` joined to its loop's test prints as the branch it keeps.
			const rest =
				breakElses.size === 0 ? undefined : breakElses.get(statement);
			if (rest !== undefined) statement = rest;
			const type = typeOf(statement);
			if (
				(type === NodeType.FunctionDeclaration ||
					type === NodeType.ClassDeclaration ||
					(type === NodeType.VariableDeclaration &&
						tree.textOf(Part.kind, statement) !== "var")) &&
				!printsNothing(statement)
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * @param {number} node an `if` printed now, leaving its function's or loop's body as `guardedRest` asks
	 * @returns {boolean} whether several statements print after it in that body, none declaring what the block they then print in would scope
	 */
	const guardsBlock = (node) => {
		let holder = parentAt(0);
		let body = holder;
		if (FUNCTION_TYPES[typeOf(holder)] !== 1) {
			holder = parentAt(1);
			if (
				LOOP_TYPES[typeOf(holder)] !== 1 ||
				tree.field(0, Field.body, holder) !== parentAt(0)
			) {
				return false;
			}
			body = parentAt(0);
		} else {
			body = tree.field(0, Field.body, holder);
		}
		if (
			elseOf(node) !== 0 ||
			hasEdgeComments(node) ||
			(node < foundSize && mergedExits[node] !== 0) ||
			!negatesCheaply(childOf(Field.test, node)) ||
			!leavesBody(
				unwrappedBranch(tree.field(0, Field.consequent, node), node),
				holder
			)
		) {
			return false;
		}
		let printing = 0;
		let last = 0;
		for (let i = tree.fieldCount(Field.body, body) - 1; i >= 0; i--) {
			const statement = tree.field(i, Field.body, body);
			if (statement === node) break;
			if (printsNothing(statement)) continue;
			const type = typeOf(statement);
			if (
				type === NodeType.FunctionDeclaration ||
				type === NodeType.ClassDeclaration ||
				(type === NodeType.VariableDeclaration &&
					tree.textOf(Part.kind, statement) !== "var")
			) {
				return false;
			}
			printing++;
			last = statement;
		}
		// One statement printing as several takes the braces too.
		return (
			printing > 1 ||
			(printing === 1 &&
				typeOf(last) !== NodeType.VariableDeclaration &&
				!printsOneStatement(last, body))
		);
	};

	/**
	 * @param {number} test an `if`'s test
	 * @returns {boolean} whether its negation takes no parentheses: a `!` dropped, one before what it negates bare, or an equality flipped
	 */
	const negatesCheaply = (test) => {
		const shown = shownAs(test);
		const type = typeOf(shown);
		return (
			NEGATES_BARE[type] === 1 ||
			(type === NodeType.BinaryExpression &&
				EQUALITIES.includes(
					/** @type {string} */ (tree.textOf(Part.operator, shown))
				))
		);
	};

	/**
	 * @param {number} statement the statement an `if` guards
	 * @returns {boolean} whether it is an `if` printing as `if(t)x`, its test then joining the guard's with `&&`
	 */
	const andsTest = (statement) =>
		typeOf(statement) === NodeType.IfStatement &&
		elseOf(statement) === 0 &&
		!(unreadStatements.size !== 0 && unreadStatements.has(statement)) &&
		ifForm(statement) === 0 &&
		!(statement < foundSize && mergedExits[statement] !== 0) &&
		!runsOnlyTest(statement) &&
		!hasEdgeComments(childOf(Field.test, statement));

	/**
	 * terser's `if(t)if(u)x` as `if(t&&u)x`: an `if` with no `else`, the one
	 * statement of another with none, prints `&&u)x` for that one's `if(t`.
	 * @param {number} node an `if`
	 * @param {number} parent its parent: the holder, or a block the holder's body
	 * @param {number} holder the statement holding it
	 * @returns {boolean} whether it prints continuing the holder's test
	 */
	const andsIntoHolder = (node, parent, holder) => {
		if (
			typeOf(holder) !== NodeType.IfStatement ||
			elseOf(holder) !== 0 ||
			tree.field(0, Field.consequent, holder) !==
				(parent === holder ? node : parent) ||
			(parent !== holder && unwrappedStatement(parent, holder) !== node) ||
			hasEdgeComments(node) ||
			hasEdgeComments(childOf(Field.test, holder)) ||
			(keptBranches.size !== 0 &&
				(keptBranches.has(holder) || keptBranches.has(node))) ||
			ifForm(holder) !== 0 ||
			(exitElses.size !== 0 && exitElses.has(holder))
		) {
			return false;
		}
		// Parentheses `&&` needs would cost what `)if(` saves.
		return (
			andsTest(node) &&
			joinsLogical(shownAs(childOf(Field.test, holder)), "&&", false) &&
			joinsLogical(shownAs(childOf(Field.test, node)), "&&", false)
		);
	};

	/**
	 * @param {number} node an expression
	 * @returns {number} the expression it prints as: the value a name collapsed into, a call's function's value, the side or branch a logical or conditional folds to
	 */
	const shownAs = (node) => {
		for (;;) {
			let next = 0;
			switch (typeOf(node)) {
				case NodeType.Identifier:
					next = (collapsed.size !== 0 && collapsed.get(node)) || 0;
					break;
				case NodeType.CallExpression: {
					const fn =
						reducedCalls.size === 0 ? undefined : reducedCalls.get(node);
					if (fn !== undefined) next = /** @type {number} */ (reducing.get(fn));
					break;
				}
				case NodeType.LogicalExpression:
					if (dropsDeadCode) next = foldedOperand(node);
					break;
				case NodeType.ConditionalExpression:
					if (dropsDeadCode) next = foldedBranch(node);
					break;
			}
			if (next === 0) return node;
			node = next;
		}
	};

	/**
	 * @param {number} node an `if`
	 * @returns {number} the `if` its body is or unwraps to, printing `&&u)x` for its `if(t`; 0 for none
	 */
	const andedInner = (node) => {
		const consequent = tree.field(0, Field.consequent, node);
		const inner =
			typeOf(consequent) === NodeType.BlockStatement
				? unwrappedStatement(consequent, node)
				: consequent;
		return inner !== 0 &&
			andsIntoHolder(inner, inner === consequent ? node : consequent, node)
			? inner
			: 0;
	};

	/**
	 * Prints what follows the test of an `if` continuing another's: `)` and
	 * its body, or the `&&u)x` of the `if` its body continues with.
	 * @param {number} node the `if`
	 * @returns {void}
	 */
	const printAndedBody = (node) => {
		if (andedInner(node) === 0) output.print(")");
		printMaybeBracedBody(tree.field(0, Field.consequent, node));
	};

	/**
	 * @param {number} statement a statement of a function's body, after an `if`
	 * @param {number} fn the function
	 * @returns {boolean} whether it prints as one statement that may stand as the `if`'s body: no declaration, no `return` of nothing ending the function, no `if` printing its `else` or kept branch after it
	 */
	const printsOneStatement = (statement, fn) => {
		switch (typeOf(statement)) {
			case NodeType.ReturnStatement: {
				const argument = childOf(Field.argument, statement);
				return argument !== 0 && !returnsNothing(argument);
			}
			case NodeType.IfStatement:
				return (
					!(keptBranches.size !== 0 && keptBranches.has(statement)) &&
					!liftsElse(statement, fn, -1)
				);
			case NodeType.ExpressionStatement: {
				// A call of a function written in place may print as its body.
				const expression = childOf(Field.expression, statement);
				return (
					tree.textOf(Part.directive, statement) === null &&
					!(
						isCallType(typeOf(expression)) &&
						FUNCTION_TYPES[typeOf(childOf(Field.callee, expression))] === 1
					)
				);
			}
			// A folded `switch` prints what it runs, one statement or a sequence.
			case NodeType.SwitchStatement: {
				const kept =
					foldedSwitches.size === 0 ? undefined : foldedSwitches.get(statement);
				// One printing as an `if` and what falls through to may be two.
				if (kept === undefined) {
					return switchAsIf(statement) !== 0 || switchAsIfElse(statement) === 0;
				}
				if (kept.size !== 1) return kept.size > 1 && foldedJoins(kept);
				const [only] = kept;
				return printsOneStatement(only, fn);
			}
			// One printing its body where it is may print several.
			case NodeType.DoWhileStatement:
			case NodeType.TryStatement:
				return !printsBodyInPlace(statement);
			case NodeType.ThrowStatement:
			case NodeType.ForStatement:
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
			case NodeType.WhileStatement:
				return true;
			default:
				return false;
		}
	};

	/**
	 * @param {number} statement a statement of a list, printed
	 * @param {number} list the list
	 * @returns {boolean} whether its text is one statement, which may stand as a body
	 */
	const printsAsOne = (statement, list) => {
		switch (typeOf(statement)) {
			case NodeType.BreakStatement:
			case NodeType.ContinueStatement:
				return true;
			case NodeType.VariableDeclaration:
				return (
					tree.textOf(Part.kind, statement) === "var" && !printsApart(statement)
				);
			case NodeType.IfStatement: {
				// A known test, or one joined to its loop's, prints the branch it keeps.
				const rest =
					breakElses.size === 0 ? undefined : breakElses.get(statement);
				const kept =
					rest !== undefined
						? rest
						: keptBranches.size === 0
							? undefined
							: keptBranches.get(statement);
				if (kept !== undefined) {
					// A block whose braces scope a name prints as that one block.
					return typeOf(kept) === NodeType.BlockStatement
						? scopesLexically(kept)
						: printsAsOne(kept, list);
				}
				return printsOneStatement(statement, list);
			}
			default:
				return printsOneStatement(statement, list);
		}
	};

	/**
	 * @param {number} statement a `do` loop or a `try`
	 * @returns {boolean} whether it may print the statements of a block of it where it is: a `do` running once, a `try` whose other blocks run nothing
	 */
	const printsBodyInPlace = (statement) => {
		if (!compresses || !dropsDeadCode) return false;
		if (typeOf(statement) === NodeType.TryStatement) {
			if (emptyTries.size !== 0 && emptyTries.has(statement)) return true;
			const finalizer = tree.field(0, Field.finalizer, statement);
			return (
				tree.field(0, Field.handler, statement) === 0 &&
				finalizer !== 0 &&
				listsNothing(finalizer)
			);
		}
		const body = tree.field(0, Field.body, statement);
		if (typeOf(body) !== NodeType.BlockStatement) return false;
		const value = evaluateConstant(childOf(Field.test, statement));
		if (value !== undefined && !value) return true;
		for (let i = tree.fieldCount(Field.body, body) - 1; i >= 0; i--) {
			const item = tree.field(i, Field.body, body);
			if (!printsNothing(item)) return isBareBreak(item);
		}
		return false;
	};

	/**
	 * @param {number} node an `if`
	 * @returns {boolean} whether its body prints nothing, nor comments, and its `else` something
	 */
	const printsElseOnly = (node) => {
		if (elseOf(node) === 0 || hasEdgeComments(node)) return false;
		const consequent = tree.field(0, Field.consequent, node);
		return typeOf(consequent) === NodeType.BlockStatement
			? bracesNothing(consequent, node)
			: printsNothing(consequent);
	};

	/**
	 * @param {number} node an `if`
	 * @returns {number} its `else`, 0 for none or one printing nothing, nor comments
	 */
	const elseOf = (node) => {
		const alternate = tree.field(0, Field.alternate, node);
		if (alternate === 0 || !compresses || hasEdgeComments(alternate)) {
			return alternate;
		}
		return (
			typeOf(alternate) === NodeType.BlockStatement
				? bracesNothing(alternate, node)
				: printsNothing(alternate)
		)
			? 0
			: alternate;
	};

	/**
	 * @param {number} node an `if`
	 * @returns {boolean} whether it has no `else` and its body prints nothing, nor comments
	 */
	const runsOnlyTest = (node) => {
		if (elseOf(node) !== 0 || hasEdgeComments(node)) {
			return false;
		}
		const consequent = tree.field(0, Field.consequent, node);
		return typeOf(consequent) === NodeType.BlockStatement
			? bracesNothing(consequent, node)
			: printsNothing(consequent);
	};

	/**
	 * @param {number} statement a statement of a body, printed
	 * @returns {boolean} whether it printed no text, as a call nothing reads of a function doing nothing does
	 */
	const printedNothing = (statement) =>
		printsNothing(statement) ||
		/** @type {JavascriptPrintContext} */ (writer).get(statement).length === 0;

	/**
	 * @param {number} block a block
	 * @param {number} parent what holds it
	 * @returns {boolean} whether it is the body of a statement whose statements printing all are expressions, two or more, which print as one sequence
	 */
	const joinsBody = (block, parent) => {
		if (
			HOLDS_BODY[typeOf(parent)] !== 1 ||
			// asm.js reads its statements as written.
			usesAsm(block) ||
			typeOf(parent) === NodeType.DoWhileStatement ||
			(commentTokens !== null &&
				(hasComments(commentTokens.starts[block], 3) ||
					hasComments(commentTokens.ends[block], 3)))
		) {
			return false;
		}
		const count = tree.fieldCount(Field.body, block);
		let printed = 0;
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, block);
			if (printedNothing(item)) continue;
			if (
				typeOf(item) !== NodeType.ExpressionStatement ||
				hasEdgeComments(item) ||
				!printsOneStatement(item, 0) ||
				// One after the first printed its statement's parentheses.
				(printed !== 0 && opensAmbiguously(childOf(Field.expression, item)))
			) {
				return false;
			}
			printed++;
		}
		return printed > 1;
	};

	/**
	 * @param {number} block a block
	 * @returns {boolean} whether every statement in it prints nothing
	 */
	const listsNothing = (block) => {
		const count = tree.fieldCount(Field.body, block);
		for (let i = 0; i < count; i++) {
			if (!printsNothing(tree.field(i, Field.body, block))) return false;
		}
		return true;
	};

	/**
	 * @param {number} block a block
	 * @param {number} parent what holds it
	 * @returns {boolean} whether it is the body of a statement and prints nothing, nor comments
	 */
	const bracesNothing = (block, parent) => {
		if (
			HOLDS_BODY[typeOf(parent)] !== 1 ||
			typeOf(parent) === NodeType.DoWhileStatement ||
			(commentTokens !== null &&
				(hasComments(commentTokens.starts[block], 3) ||
					hasComments(commentTokens.ends[block], 3)))
		) {
			return false;
		}
		const count = tree.fieldCount(Field.body, block);
		for (let i = 0; i < count; i++) {
			if (!printsNothing(tree.field(i, Field.body, block))) return false;
		}
		return true;
	};

	/**
	 * @param {number} statement a statement
	 * @returns {boolean} whether an `else` printed after it would bind to an `if` inside it
	 */
	const endsInOpenIf = (statement) => {
		for (let node = statement, parent = 0; ;) {
			const type = typeOf(node);
			if (type === NodeType.IfStatement) {
				const rest = breakElses.size === 0 ? undefined : breakElses.get(node);
				if (rest !== undefined) {
					// It prints as that branch.
					parent = node;
					node = rest;
					continue;
				}
				const alternate = elseOf(node);
				if (ifForm(node) !== 0) return false;
				if (alternate === 0) return !(compresses && runsOnlyTest(node));
				// Printed as `if(!t)x`, it has no `else`.
				if (compresses && printsElseOnly(node)) return true;
				parent = node;
				node = alternate;
			} else if (type === NodeType.SwitchStatement) {
				// One printing as an `if` has no `else` either.
				return switchAsIf(node) !== 0;
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
	// esbuild's `throw t?x:y` for `if(t)throw x;throw y` prints as the `return` one.
	const THROW_FORM = 3;

	/**
	 * @param {number} node an `if`
	 * @returns {number} its form, as `ifForm` answers it
	 */
	const findIfForm = (node) => {
		if (!printsConditionals || dropped[node] === 1 || hasEdgeComments(node)) {
			return 0;
		}
		const consequent = tree.field(0, Field.consequent, node);
		const alternate = elseOf(node);
		if (alternate !== 0) {
			if (
				printsAsExpression(consequent, node) &&
				printsAsExpression(alternate, node)
			) {
				return CONDITIONAL_FORM;
			}
			// `if(t)return x;else return y` as `return t?x:y`, the `else` going on.
			const branch = unwrappedBranch(alternate, node);
			const form = branch === 0 ? 0 : exitForm(consequent, node);
			if (
				form === 0 ||
				hasEdgeComments(branch) ||
				!(
					exitsWith(branch, form) ||
					(typeOf(branch) === NodeType.IfStatement && ifForm(branch) === form)
				)
			) {
				return 0;
			}
			returnedBy.set(branch, node);
			return form;
		}
		const next = returnPairs.get(node);
		if (next === undefined || dropped[next] === 1 || hasEdgeComments(next)) {
			return 0;
		}
		const form = exitForm(consequent, node);
		return form !== 0 &&
			(exitsWith(next, form) ||
				(typeOf(next) === NodeType.IfStatement && ifForm(next) === form))
			? form
			: 0;
	};

	/**
	 * @param {number} branch the body of an `if`
	 * @param {number} node the `if`
	 * @returns {number} `RETURN_FORM` where it prints as a value returned, `THROW_FORM` where as one thrown, alone or in a block; else 0
	 */
	const exitForm = (branch, node) =>
		returnsBranch(branch, node)
			? RETURN_FORM
			: typeOf(unwrappedBranch(branch, node)) === NodeType.ThrowStatement
				? THROW_FORM
				: 0;

	/**
	 * @param {number} statement a statement, 0 for none
	 * @param {number} form `RETURN_FORM` or `THROW_FORM`
	 * @returns {boolean} whether it is a `return` of a value, or a `throw`, as the form ends in
	 */
	const exitsWith = (statement, form) =>
		form === RETURN_FORM
			? returnsValue(statement)
			: typeOf(statement) === NodeType.ThrowStatement;

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
				: // A conditional `deadCode` folds prints one branch, its assignment whole.
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
		// A logical one runs its value only some of the time, which a pure test allows.
		if (typeOf(target) !== NodeType.Identifier) return null;
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
		output.printName(hoisted[1].mangledName || hoisted[1].name);
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
	 * @param {number} node an `if` printing as `return t?x:` with the `return` after it
	 * @param {number} form `RETURN_FORM` or `THROW_FORM`
	 * @returns {boolean} whether that `return` may print its value first: both return one value, no comment between
	 */
	const swapsReturn = (node, form) => {
		if (tree.field(0, Field.alternate, node) !== 0) return false;
		const next = returnPairs.get(node);
		const consequent = tree.field(0, Field.consequent, node);
		return (
			next !== undefined &&
			exitsWith(next, form) &&
			!holdsComments(next) &&
			!holdsComments(consequent) &&
			exitsWith(unwrappedBranch(consequent, node), form) &&
			!(
				typeOf(consequent) === NodeType.BlockStatement &&
				returnsChain(consequent)
			)
		);
	};

	/**
	 * Prints a node under `!`, `!!` or nothing; terser's `negate` of an
	 * equality, `!(a==b)` as `a!=b`, its operator the same length.
	 * @param {number} node the node, printed
	 * @param {string} negates `!`, `!!` or `""`
	 * @returns {void}
	 */
	const printNegatedAs = (node, negates) => {
		const equality =
			negates === "!" && equalityAt.size !== 0 && !holdsComments(node)
				? equalityAt.get(node)
				: undefined;
		if (equality !== undefined) {
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(node);
			const at = equality >> 2;
			if (placements !== null) placingChild = node;
			printSlice(
				text.slice(0, at) +
					EQUALITIES[(equality & 3) ^ 1] +
					text.slice(at + EQUALITIES[equality & 3].length)
			);
			placingChild = 0;
			return;
		}
		if (negates !== "") output.print(negates);
		// A name a value collapsed into prints as that value.
		const shown =
			collapsed.size !== 0 && collapsed.has(node)
				? /** @type {number} */ (collapsed.get(node))
				: node;
		printNode(
			node,
			negates !== "" &&
				((!NEGATES_BARE[typeOf(shown)] &&
					!(negatedIntegers.size !== 0 && negatedIntegers.has(node))) ||
					// A `!` its operation's operands took in prints that operation.
					(isNegation(node) &&
						negatedOperations.get(childOf(Field.argument, node)) === true))
		);
	};

	/**
	 * Prints what a `!` test negates in its place, where the `!` printed as
	 * `!` before it and dropping it reads the same in a test.
	 * @param {number} test the test of a conditional, printed
	 * @param {boolean=} keepsParentheses whether parentheses the `!` needed around a binary stay
	 * @returns {boolean} whether it printed so, the branches then to print swapped
	 */
	const printsNegatedTest = (test, keepsParentheses = false) => {
		if (!isNegation(test) || holdsComments(test)) return false;
		const argument = childOf(Field.argument, test);
		// Its operands took the `!` in: no `!` is left to drop.
		if (negatedOperations.get(argument) === true) return false;
		// A `!` of a `!` prints otherwise, but `!!!x` as `!x`, and an operand
		// opening as a function, class or object could start a statement.
		if (
			(isNegation(argument) &&
				!isNegation(childOf(Field.argument, argument))) ||
			opensAmbiguously(argument)
		) {
			return false;
		}
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const text = context.get(test);
		// A constant `!` may have printed its value.
		if (text.charCodeAt(0) !== 33) return false;
		context.consume(test);
		// What it prints as, a call's value or a name's, is parenthesized as that.
		const shown = shownAs(
			isNegation(argument)
				? childOf(Field.argument, childOf(Field.argument, argument))
				: argument
		);
		const type = typeOf(shown);
		if (
			!keepsParentheses &&
			(type === NodeType.BinaryExpression ||
				// One printing as an operand it folds to takes that one's parentheses.
				(type === NodeType.LogicalExpression &&
					!(dropsDeadCode && foldedOperand(shown) !== 0))) &&
			text.charCodeAt(1) === 40
		) {
			// The parentheses only the `!` needed go with it.
			printSlice(text.slice(2, -1));
			return true;
		}
		// `! --a` keeps the space `!--` would open a comment without.
		printSlice(text.slice(text.charCodeAt(1) === 32 ? 2 : 1));
		if (placements !== null) {
			placements.push(current, argument, output.placedAt);
		}
		return true;
	};

	/**
	 * terser's `x ? y : y` of an `if` printing as `?:`: its branches printing
	 * alike, it prints the test where that runs anything, then one branch.
	 * @param {number} node the `if`
	 * @param {number} form its form, a `return` printed before it in `RETURN_FORM`
	 * @param {number} test its test
	 * @param {boolean} branch whether it prints as a branch of another `?:`
	 * @param {boolean} afterReturn whether it printed the `return`, else continuing one after a `:`
	 * @returns {boolean} whether it printed so
	 */
	const printsAlikeBranches = (node, form, test, branch, afterReturn) => {
		const consequent = tree.field(0, Field.consequent, node);
		const alternate = tree.field(0, Field.alternate, node);
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const text = context.get(consequent);
		if (
			text === undefined ||
			text !== context.get(alternate) ||
			holdsComments(consequent) ||
			holdsComments(alternate)
		) {
			return false;
		}
		const sequence = !dropsSideEffectFree || !isPureValue(test);
		// A dropped test drops its comments; a branch opening the statement alone
		// would read as a declaration or block.
		if (
			!sequence &&
			(holdsComments(test) ||
				(form === CONDITIONAL_FORM &&
					!branch &&
					hoistOf(node) === null &&
					OPENS_DECLARATION.test(text)))
		) {
			return false;
		}
		// After a `:` a returned sequence would close on the semicolon it owes.
		if (sequence && form !== CONDITIONAL_FORM && !afterReturn) return false;
		// Assigned or a branch, the sequence takes parentheses `?:` did not.
		const wrap =
			sequence &&
			form === CONDITIONAL_FORM &&
			(branch || hoistOf(node) !== null);
		if (wrap) output.print("(");
		if (sequence) {
			// An item of a sequence takes any expression bare.
			printNode(
				test,
				form === CONDITIONAL_FORM && !wrap && !branch && opensAmbiguously(test)
			);
			output.comma();
		} else {
			skipNode(test);
		}
		// The alternate, printing last, owes the semicolon the `return` does.
		skipNode(consequent);
		const shared = unwrappedBranch(alternate, node);
		const expression =
			typeOf(shared) === NodeType.ExpressionStatement
				? childOf(Field.expression, shared)
				: 0;
		if (
			form === CONDITIONAL_FORM &&
			typeOf(expression) === NodeType.SequenceExpression &&
			(sequence ||
				(!branch &&
					hoistOf(node) === null &&
					!OPENS_DECLARATION.test(text.slice(1))))
		) {
			// Its sequence, parenthesized as a `?:` branch, needs none after the
			// test's comma or alone.
			context.consume(alternate);
			printSlice(text.slice(1, -1));
			if (placements !== null) {
				placements.push(current, expression, output.placedAt);
			}
		} else {
			printNode(alternate);
		}
		if (wrap) output.print(")");
		if (form === CONDITIONAL_FORM && !branch) output.semicolon();
		return true;
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
		let afterReturn = false;
		if (form !== CONDITIONAL_FORM) {
			// One continuing the `?:` an `if` before it, or holding it as its
			// `else`, opens prints none.
			const continues = branchForm() === form;
			const previous = returnedBy.get(node);
			if (
				!continues &&
				(previous === undefined || ifForm(previous) !== form) &&
				!inReturnsChain(-1)
			) {
				output.print(form === RETURN_FORM ? "return" : "throw");
				output.space();
				afterReturn = true;
			}
		}
		const folded = form === RETURN_FORM ? foldedReturn(node) : 0;
		if (folded !== 0) {
			const consequent = tree.field(0, Field.consequent, node);
			const negates = !booleanOf(
				childOf(Field.argument, unwrappedBranch(consequent, node))
			)
				? "!"
				: givesBoolean(test) && !holdsComments(test)
					? ""
					: "!!";
			skipNode(consequent);
			printNegatedAs(test, negates);
			const alternate = tree.field(0, Field.alternate, node);
			if (alternate !== 0) {
				skipNode(alternate);
				output.semicolon();
			}
			return;
		}
		if (printsAlikeBranches(node, form, test, branch, afterReturn)) return;
		// terser's `!t ? a : b` as `t ? b : a`.
		const swaps =
			form === CONDITIONAL_FORM &&
			!(!branch && opensAmbiguously(test)) &&
			printsNegatedTest(test);
		if (swaps) {
			output.space();
			output.print("?");
			output.space();
			printNode(tree.field(0, Field.alternate, node));
			output.space();
			output.colon();
			printNode(tree.field(0, Field.consequent, node));
			if (!branch) output.semicolon();
			return;
		}
		if (
			form !== CONDITIONAL_FORM &&
			swapsReturn(node, form) &&
			printsNegatedTest(test)
		) {
			// The `return` after it prints its value, then this one's.
			output.space();
			output.print("?");
			output.space();
			swappedReturns.set(
				/** @type {number} */ (returnPairs.get(node)),
				tree.field(0, Field.consequent, node)
			);
			return;
		}
		printNode(
			test,
			bindsLooser(test) ||
				(form === CONDITIONAL_FORM && !branch && opensAmbiguously(test)) ||
				// A comment before the test could break the line after `return`,
				// as terser's `return` parenthesizes a value comments precede.
				(afterReturn &&
					hasComments(
						/** @type {TreeTokens} */ (commentTokens).starts[test],
						1
					))
		);
		output.space();
		output.print("?");
		output.space();
		printNode(tree.field(0, Field.consequent, node));
		output.space();
		output.colon();
		if (form !== CONDITIONAL_FORM) {
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
		const alternate = elseOf(node);
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
			case NodeType.IfStatement: {
				const alternate = elseOf(last);
				return (
					alternate !== 0 &&
					alwaysLeaves(tree.field(0, Field.consequent, last)) &&
					alwaysLeaves(alternate)
				);
			}
			case NodeType.TryStatement: {
				// What `finally` leaves by is left by; else the block and handler both leave.
				const finalizer = tree.field(0, Field.finalizer, last);
				if (finalizer !== 0 && alwaysLeaves(finalizer)) return true;
				const handler = tree.field(0, Field.handler, last);
				return (
					alwaysLeaves(tree.field(0, Field.block, last)) &&
					(handler === 0 || alwaysLeaves(tree.field(0, Field.body, handler)))
				);
			}
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
			case NodeType.LabeledStatement:
				return declaresLexically(tree.field(0, Field.body, statement));
			default:
				return false;
		}
	};

	/**
	 * @param {number} block a block
	 * @returns {boolean} whether the first statement it prints is a string, which out of its braces may read as a directive
	 */
	const opensWithString = (block) => {
		const count = tree.fieldCount(Field.body, block);
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, block);
			if (printsNothing(item)) continue;
			return (
				typeOf(item) === NodeType.ExpressionStatement &&
				typeof evaluateConstant(childOf(Field.expression, item)) === "string"
			);
		}
		return false;
	};

	/**
	 * @param {number} block a block
	 * @returns {boolean} whether its braces scope a name
	 */
	const scopesLexically = (block) => {
		const count = tree.fieldCount(Field.body, block);
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, block);
			// A declaration printing nothing, or only values, leaves no name to scope.
			if (
				declaresLexically(item) &&
				!printsNothing(item) &&
				(typeOf(item) !== NodeType.VariableDeclaration ||
					printedValues(item) === -1)
			) {
				return true;
			}
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
	 * @returns {boolean} whether only cases running nothing follow it, where a `break` ending it does nothing
	 */
	const endsSwitch = (item) => {
		const parent = parentAt(0);
		// Past it, cases running nothing: a test matched skips the rest.
		// The case is among them, which ends the walk.
		for (let i = tree.fieldCount(Field.cases, parent) - 1; ; i--) {
			const later = tree.field(i, Field.cases, parent);
			if (later === item) return true;
			const count = tree.fieldCount(Field.consequent, later);
			if (
				hasEdgeComments(later) ||
				!(
					count === 0 ||
					(count === 1 && isPlainBreak(tree.field(0, Field.consequent, later)))
				)
			) {
				return false;
			}
		}
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
		const left = childOf(Field.left, comparison);
		// esbuild's `null===x` reads as `x===null`.
		const name =
			isNull(left) || isUndefinedValue(left)
				? childOf(Field.right, comparison)
				: left;
		const value = comparedTo(name, comparison);
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
			isNull(comparedTo(name, left)) !== isNull(comparedTo(other, right))
			? name
			: 0;
	};

	/**
	 * @param {number} side a side of a binary expression
	 * @param {number} comparison the binary expression
	 * @returns {number} its other side
	 */
	const comparedTo = (side, comparison) => {
		const left = childOf(Field.left, comparison);
		return left === side ? childOf(Field.right, comparison) : left;
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
	 * @returns {boolean} whether it is a string literal, a template or a `typeof`, so its value is a string
	 */
	const isStringValue = (node) => {
		const type = typeOf(node);
		return type === NodeType.Literal
			? typeof tree.value(node) === "string"
			: type === NodeType.TemplateLiteral ||
					(type === NodeType.UnaryExpression &&
						tree.textOf(Part.operator, node) === "typeof");
	};

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether its value is always a number, never a BigInt: a number literal, a `+`, `-` of a number literal, a bitwise operation `givesNumber` finds, or an assignment of one
	 */
	const isNumberValue = (node) => {
		switch (typeOf(node)) {
			case NodeType.Literal:
				return typeof tree.value(node) === "number";
			case NodeType.UnaryExpression:
				switch (tree.textOf(Part.operator, node)) {
					case "+":
						return true;
					case "-":
						return isNumber(childOf(Field.argument, node));
					default:
						return false;
				}
			case NodeType.AssignmentExpression:
				return (
					tree.textOf(Part.operator, node) === "=" &&
					isNumberValue(childOf(Field.right, node))
				);
			default:
				return givesNumber(node);
		}
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
	 * @param {boolean} keeps whether `keepFnames` or `keepClassnames` keeps it
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
	 * @param {number=} from where the search for the function starts among the printed one's parents, -1 for itself
	 * @returns {boolean} true where nothing does
	 */
	const returnsUnread = (from = 0) => {
		for (let level = from; ; level++) {
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
			const target = jumpTarget(label, keyword === "break");
			if (target === 0) {
				// The statement it leaves or goes on with is the unlabeled one's.
				skipNode(label);
			} else {
				jumpedLabels.add(target);
				output.space();
				printNode(label);
			}
		}
		output.semicolon();
	};

	/**
	 * @param {number} label the label a `break` or `continue` being printed names
	 * @param {boolean} breaks whether it is a `break`, which a `switch` takes too
	 * @returns {number} the labeled statement it names, 0 where the nearest loop, or `switch` for a `break`, is that statement's
	 */
	const jumpTarget = (label, breaks) => {
		const name = tree.name(label);
		// Past the nearest loop, or `switch` for a `break`, only labels on it.
		let passed = false;
		let own = true;
		for (let level = 0; ; level++) {
			const ancestor = parentAt(level);
			const type = typeOf(ancestor);
			if (type === NodeType.LabeledStatement) {
				if (tree.name(tree.field(0, Field.label, ancestor)) === name) {
					return compresses && passed && own ? 0 : ancestor;
				}
			} else if (passed) {
				own = false;
			} else if (LOOP_TYPES[type] === 1) {
				passed = true;
			} else if (breaks && type === NodeType.SwitchStatement) {
				// One may print as a block or an `if`, which a `break` cannot leave.
				passed = true;
				own = false;
			}
		}
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
			output.printString(moduleName(node), quoteOf(node));
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
			output.printString(moduleName(node), quoteOf(node));
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
			const shown = foldedTo(superClass);
			// A call printing as the value its function returns is that value.
			const reduced =
				reducedCalls.size === 0 ? undefined : reducedCalls.get(shown);
			const type = typeOf(
				reduced === undefined
					? shown
					: /** @type {number} */ (reducing.get(reduced))
			);
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
			if (
				(read !== null && dropsPrivateMember(member, read)) ||
				(compresses && runsNothingStatic(member))
			) {
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
	 * @param {number} member a class member
	 * @returns {boolean} whether it is a static block every statement of which prints nothing, nor comments
	 */
	const runsNothingStatic = (member) => {
		if (typeOf(member) !== NodeType.StaticBlock || holdsComments(member)) {
			return false;
		}
		for (let i = tree.fieldCount(Field.body, member) - 1; i >= 0; i--) {
			if (!printsNothing(tree.field(i, Field.body, member))) return false;
		}
		return true;
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
					: // Moved, it keeps the name `keepFnames` keeps.
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
			if (
				(constantArguments.size !== 0 && passesInlined(item, field)) ||
				(trimmedArguments.size !== 0 && trimmedArguments.has(item))
			) {
				skipNode(item);
				continue;
			}
			if (field === Field.arguments && spreadsAs(item, node) !== 0) {
				printed = printSpread(item, printed);
				continue;
			}
			if (printed++ !== 0) output.comma();
			const start = output.text.length;
			printNode(item);
			if (
				field === Field.arguments &&
				typeOf(parentAt(0)) === NodeType.ConditionalExpression &&
				mergedArgument(parentAt(0)) === i
			) {
				mergedSpans.set(node, [start, output.text.length]);
			}
		}
		output.print(")");
	};

	/**
	 * terser's `inline` of a spread: a spread array literal's elements, or a
	 * spread object literal's properties, print in its place, as what a
	 * spread primitive copies nothing of prints nothing.
	 * @param {number} spread a node in an array, call or object literal
	 * @param {number} container what lists it
	 * @returns {number} 0 where it prints as written, 1 where it prints nothing, 2 where what it spreads prints in its place
	 */
	const spreadsAs = (spread, container) => {
		if (
			!compresses ||
			typeOf(spread) !== NodeType.SpreadElement ||
			holdsComments(spread)
		) {
			return 0;
		}
		const argument = tree.field(0, Field.argument, spread);
		const type = typeOf(argument);
		if (typeOf(container) !== NodeType.ObjectExpression) {
			// A hole spreads as `undefined`, which a hole does not read as.
			if (
				type !== NodeType.ArrayExpression ||
				writesBuiltIn("Array.prototype.*")
			) {
				return 0;
			}
			const count = tree.fieldCount(Field.elements, argument);
			for (let i = 0; i < count; i++) {
				if (tree.field(i, Field.elements, argument) === 0) return 0;
			}
			return 2;
		}
		if (type === NodeType.ObjectExpression) {
			const count = tree.fieldCount(Field.properties, argument);
			for (let i = 0; i < count; i++) {
				const property = tree.field(i, Field.properties, argument);
				if (typeOf(property) === NodeType.SpreadElement) continue;
				// A getter runs as it spreads, a method's `super` is its object,
				// and `__proto__:` sets the prototype of what holds it.
				if (
					!isKeyValue(property) ||
					tree.flag(Flag.method, property) ||
					(!tree.flag(Flag.computed, property) &&
						!tree.flag(Flag.shorthand, property) &&
						printedKeyOf(property, childOf(Field.key, property)) ===
							"__proto__")
				) {
					return 0;
				}
			}
			return 2;
		}
		// What spreads no own property: `null`, `undefined`, a boolean or a number.
		if (
			type === NodeType.UnaryExpression &&
			tree.textOf(Part.operator, argument) === "void"
				? !isPureValue(childOf(Field.argument, argument))
				: !isPureValue(argument)
		) {
			return 0;
		}
		const value =
			type === NodeType.UnaryExpression &&
			tree.textOf(Part.operator, argument) === "void"
				? undefined
				: evaluateConstant(argument);
		return value === null ||
			typeof value === "boolean" ||
			typeof value === "number" ||
			(value === undefined &&
				type === NodeType.UnaryExpression &&
				tree.textOf(Part.operator, argument) === "void")
			? 1
			: 0;
	};

	/**
	 * @param {number} node an array or object literal
	 * @param {number} parent its parent, at the printed level
	 * @returns {boolean} whether it is what a folded spread spreads, whose items what holds the spread prints
	 */
	const spreadsFolded = (node, parent) =>
		typeOf(parent) === NodeType.SpreadElement &&
		tree.field(0, Field.argument, parent) === node &&
		spreadsAs(parent, parentAt(1)) === 2;

	/**
	 * Prints in a spread's place the elements or properties it spreads.
	 * @param {number} spread a spread `spreadsAs` folds
	 * @param {number} printed how many items its list printed before it
	 * @returns {number} how many it printed with these
	 */
	const printSpread = (spread, printed) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const argument = tree.field(0, Field.argument, spread);
		const field =
			typeOf(argument) === NodeType.ArrayExpression
				? Field.elements
				: typeOf(argument) === NodeType.ObjectExpression
					? Field.properties
					: 0;
		if (field !== 0) {
			const count = tree.fieldCount(field, argument);
			for (let i = 0; i < count; i++) {
				const item = itemOf(i, field, argument);
				if (spreadsAs(item, argument) !== 0) {
					printed = printSpread(item, printed);
					continue;
				}
				if (printed++ !== 0) output.comma();
				printNode(item);
			}
		}
		context.consume(argument);
		context.consume(spread);
		return printed;
	};

	// What `countPassed` counts: the items always passed, the first of them,
	// and the spreads passing what is not known.
	let passedItems = 0;
	let passedFirst = 0;
	let passedSpreads = 0;

	/**
	 * Counts what a list passes, a spread `spreadsAs` folds read as its items.
	 * @param {number} node a call, `new` or array literal
	 * @param {number} field its arguments or elements
	 * @returns {void}
	 */
	const countPassed = (node, field) => {
		const count = tree.fieldCount(field, node);
		for (let i = 0; i < count; i++) {
			const item = itemOf(i, field, node);
			if (typeOf(item) !== NodeType.SpreadElement) {
				if (passedItems++ === 0) passedFirst = item;
			} else if (spreadsAs(item, node) === 0) {
				passedSpreads++;
			} else {
				countPassed(tree.field(0, Field.argument, item), Field.elements);
			}
		}
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether its value is never a number: a literal of another type, a template, an object, array, function or class, or what the built-in `Array` makes
	 */
	const isNeverNumber = (node) => {
		switch (typeOf(node)) {
			case NodeType.CallExpression:
			case NodeType.NewExpression: {
				const callee = childOf(Field.callee, node);
				return (
					!tree.flag(Flag.optional, node) &&
					readsBuiltInConstructor(callee) &&
					tree.name(callee) === "Array" &&
					!writesBuiltIn("Array")
				);
			}
			case NodeType.Literal:
				return typeof tree.value(node) !== "number";
			case NodeType.TemplateLiteral:
			case NodeType.ObjectExpression:
			case NodeType.ArrayExpression:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.ClassExpression:
				return true;
			default:
				return false;
		}
	};

	/**
	 * The callee `Object(f)` as the `f` it gives back, where calling another
	 * value throws the `TypeError` calling the object made of it would:
	 * `Object(a.b)(c)` as `(0,a.b)(c)`, which binds no `this` either.
	 * @param {number} node a call, being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsCalledObject = (node) => {
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		if (
			(parentType === NodeType.CallExpression
				? childOf(Field.callee, parent) !== node ||
					tree.flag(Flag.optional, parent)
				: parentType !== NodeType.TaggedTemplateExpression ||
					childOf(Field.tag, parent) !== node) ||
			tree.flag(Flag.optional, node) ||
			tree.fieldCount(Field.arguments, node) !== 1 ||
			hasEdgeComments(node)
		) {
			return false;
		}
		const callee = childOf(Field.callee, node);
		const value = itemOf(0, Field.arguments, node);
		const type = typeOf(value);
		if (
			!readsBuiltInConstructor(callee) ||
			tree.name(callee) !== "Object" ||
			holdsComments(callee) ||
			writesBuiltIn("Object") ||
			(type === NodeType.Identifier
				? tree.type(value) !== NodeType.Identifier ||
					(collapsed.size !== 0 && collapsed.has(value)) ||
					isMovedRead(value)
				: type !== NodeType.MemberExpression || tree.flag(Flag.optional, value))
		) {
			return false;
		}
		skipNode(callee);
		// A name `with` or `eval` cannot reach, and no `eval`, is called bound to nothing.
		const definition =
			type === NodeType.Identifier && mangledNames !== null
				? mangledNames[value]
				: undefined;
		const bare =
			isMinifierVariable(definition) &&
			definition.name !== "eval" &&
			!(/** @type {MinifierScope} */ (definition.scope).isPinned());
		if (!bare) output.print("(0,");
		printNode(value);
		if (!bare) output.print(")");
		return true;
	};

	/**
	 * @param {number} node a node
	 * @returns {boolean} whether it is a call or `new` of the built-in `Object` passing nothing, which prints as `{}`, the object it makes
	 */
	const printsEmptyObject = (node) => {
		const type = typeOf(node);
		if (
			!compresses ||
			(type !== NodeType.CallExpression && type !== NodeType.NewExpression) ||
			tree.fieldCount(Field.arguments, node) !== 0 ||
			tree.flag(Flag.optional, node)
		) {
			return false;
		}
		const callee = childOf(Field.callee, node);
		return (
			readsBuiltInConstructor(callee) &&
			tree.name(callee) === "Object" &&
			!hasEdgeComments(node) &&
			!holdsComments(callee) &&
			!writesBuiltIn("Object")
		);
	};

	/**
	 * Prints a call or `new` of the built-in `Array` as the array literal it
	 * makes: `Array(a,b)` as `[a,b]`, `Array("a")` as `["a"]`, `Array(2)` as `[,,]`.
	 * A lone number argument is a length, so it needs one known no number.
	 * @param {number} node the call or `new`, being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsArrayCall = (node) => {
		const callee = childOf(Field.callee, node);
		if (
			tree.flag(Flag.optional, node) ||
			!readsBuiltInConstructor(callee) ||
			tree.name(callee) !== "Array" ||
			hasEdgeComments(node) ||
			holdsComments(callee) ||
			writesBuiltIn("Array")
		) {
			return false;
		}
		const count = tree.fieldCount(Field.arguments, node);
		passedItems = 0;
		passedFirst = 0;
		passedSpreads = 0;
		countPassed(node, Field.arguments);
		let holes = -1;
		// `-0` is a length too, of no holes.
		const negatesZero =
			typeOf(passedFirst) === NodeType.UnaryExpression &&
			tree.textOf(Part.operator, passedFirst) === "-" &&
			isNumber(childOf(Field.argument, passedFirst)) &&
			tree.value(childOf(Field.argument, passedFirst)) === 0;
		if (
			passedItems === 1 &&
			passedSpreads === 0 &&
			(isNumber(passedFirst) || negatesZero)
		) {
			// Up to 5 holes print no longer than the call.
			const length = negatesZero
				? 0
				: /** @type {number} */ (tree.value(passedFirst));
			if (
				!Number.isInteger(length) ||
				length < 0 ||
				length > 5 ||
				holdsComments(passedFirst)
			) {
				return false;
			}
			holes = length;
		} else if (
			passedItems === 0
				? passedSpreads !== 0
				: passedItems === 1 && !isNeverNumber(passedFirst)
		) {
			return false;
		}
		skipNode(callee);
		output.print("[");
		if (holes !== -1) {
			// The length may come from a literal spread: `Array(...[3])`.
			for (let i = 0; i < count; i++) {
				skipNode(itemOf(i, Field.arguments, node));
			}
			for (let i = 0; i < holes; i++) output.print(",");
		} else {
			let printed = 0;
			for (let i = 0; i < count; i++) {
				const item = itemOf(i, Field.arguments, node);
				if (spreadsAs(item, node) !== 0) {
					printed = printSpread(item, printed);
					continue;
				}
				if (printed++ !== 0) output.comma();
				printNode(item);
			}
		}
		output.print("]");
		return true;
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
		// V8 reads a class member's `"#constructor"` as the constructor's name;
		// only a static method may be named `constructor` bare.
		return (name === "constructor" &&
			(memberType !== NodeType.MethodDefinition ||
				!tree.flag(Flag.static, member))) ||
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
			output.printName(privateNameOf(key));
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
		!(collapsed.size !== 0 && collapsed.has(value)) &&
		!(compresses && globalDefs !== null && globalDefOf(value) !== undefined);

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
		let printed = 0;
		// A hole printed last takes a comma of its own after it.
		let holeLast = false;
		for (let i = 0; i < count; i++) {
			const element = itemOf(i, field, node);
			if (element !== 0 && spreadsAs(element, node) !== 0) {
				const before = printed;
				printed = printSpread(element, printed);
				if (printed !== before) holeLast = false;
				continue;
			}
			if (printed++ !== 0) output.comma();
			holeLast = element === 0;
			if (!holeLast) printNode(element);
		}
		if (holeLast) output.comma();
	};

	/**
	 * @param {number} node an expression, printed
	 * @returns {string | undefined} its text where it prints as a template, which only a template, a `+` joining one or a string's `concat` printing as one does
	 */
	const templateText = (node) => {
		const type = typeOf(node);
		if (
			(type !== NodeType.TemplateLiteral &&
				!(
					(type === NodeType.BinaryExpression ||
						type === NodeType.CallExpression) &&
					templateJoins.size !== 0 &&
					templateJoins.has(node)
				)) ||
			hasEdgeComments(node)
		) {
			return undefined;
		}
		const text = /** @type {JavascriptPrintContext} */ (writer).get(node);
		return text !== undefined && text.charCodeAt(0) === 96 ? text : undefined;
	};

	/**
	 * @param {number} node an expression, printed
	 * @returns {string | undefined} the text the string, number or boolean it folds to adds to a string, undefined for another or one longer than it and its `+`, as a name kept for its size
	 */
	const literalText = (node) => {
		if (hasEdgeComments(node)) return undefined;
		const value = foldedOf(node);
		if (
			typeof value !== "string" &&
			typeof value !== "number" &&
			typeof value !== "boolean"
		) {
			return undefined;
		}
		const text = String(value);
		return text.length <=
			/** @type {JavascriptPrintContext} */ (writer).get(node).length + 1
			? text
			: undefined;
	};

	/**
	 * Whether two pieces of a template join without a `$` then `{` reading
	 * as a substitution where none was, or `\0` then a digit as an octal escape.
	 * @param {string} before the text the join ends
	 * @param {string} after the text it continues with
	 * @returns {boolean} true where they join
	 */
	const joinsTemplate = (before, after) =>
		!(before.endsWith("$") && after.startsWith("{")) &&
		// `\0`, printed or a NUL a literal holds, then a digit would read as an
		// octal escape, which no template takes.
		!(
			(before.endsWith("\\0") || before.charCodeAt(before.length - 1) === 0) &&
			after.charCodeAt(0) >= 48 &&
			after.charCodeAt(0) <= 57
		);

	/**
	 * terser's `evaluate` of a `+` adding to a template: a template is a
	 * string, so `` `a${x}` + 1 `` is `` `a${x}1` `` and two templates join.
	 * @param {number} node a `+`, its operands printed
	 * @returns {boolean} whether it prints as one template
	 */
	const templatePlus = (node) => {
		if (
			typeOf(node) !== NodeType.BinaryExpression ||
			tree.textOf(Part.operator, node) !== "+"
		) {
			return false;
		}
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		const leftText = templateText(left);
		const rightText = templateText(right);
		if (leftText === undefined) {
			const added = literalText(left);
			return (
				added !== undefined &&
				rightText !== undefined &&
				joinsTemplate(added, rightText.slice(1))
			);
		}
		const added = rightText === undefined ? literalText(right) : undefined;
		return rightText !== undefined
			? joinsTemplate(leftText.slice(0, -1), rightText.slice(1))
			: added !== undefined && joinsTemplate(leftText.slice(0, -1), added);
	};

	/**
	 * @param {number} node the last `+` of a run `addsToString` finds, its left side printed
	 * @returns {string | undefined} where the run adds to a template, every literal it adds joined, else undefined
	 */
	const templateRun = (node) => {
		let base = node;
		let added = "";
		// A `+` printing as a template already holds what it adds.
		while (
			addedLiteral(base) !== undefined &&
			!(templateJoins.size !== 0 && templateJoins.has(base))
		) {
			added = String(addedLiteral(base)) + added;
			base = childOf(Field.left, base);
		}
		const type = typeOf(base);
		if (
			!(
				type === NodeType.TemplateLiteral ||
				(type === NodeType.BinaryExpression &&
					templateJoins.size !== 0 &&
					templateJoins.has(base))
			) ||
			hasEdgeComments(base)
		) {
			return undefined;
		}
		// The run below printed only what it adds to.
		const text = /** @type {JavascriptPrintContext} */ (writer).get(
			childOf(Field.left, node)
		);
		return text !== undefined &&
			text.charCodeAt(0) === 96 &&
			joinsTemplate(text.slice(0, -1), added)
			? added
			: undefined;
	};

	/**
	 * Prints a template's text a child printed, past its first character
	 * where `from` is 1, its mappings placed where they now stand.
	 * @param {number} child the child, printed
	 * @param {string} text the piece of its text, never empty
	 * @param {number} from how many characters of its text the piece leaves out first
	 * @returns {void}
	 */
	const printTemplatePiece = (child, text, from) => {
		if (placements !== null) placingChild = child;
		printSlice(text);
		if (placements !== null && from !== 0) {
			placements[placements.length - 1] -= from;
		}
	};

	/**
	 * A string's `concat` as a template: `"a".concat(b)` is `` `a${b}` ``, its
	 * receiver a string or such a template, each argument converted as it is
	 * evaluated where nothing evaluated after one but a constant could tell.
	 * @param {number} node a call, being printed
	 * @param {number} callee its callee
	 * @returns {boolean} whether it printed so
	 */
	const printsConcatTemplate = (node, callee) => {
		if (
			!compresses ||
			typeOf(node) !== NodeType.CallExpression ||
			tree.flag(Flag.optional, node) ||
			typeOf(callee) !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, callee) ||
			tree.flag(Flag.optional, callee) ||
			tree.name(childOf(Field.property, callee)) !== "concat" ||
			hasEdgeComments(node) ||
			hasEdgeComments(callee)
		) {
			return false;
		}
		const receiver = childOf(Field.object, callee);
		const literal =
			typeOf(receiver) === NodeType.Literal &&
			typeof tree.value(receiver) === "string" &&
			!hasEdgeComments(receiver);
		// A template the source does not write takes ECMAScript 2015.
		if (literal && output.option("ecma") < 2015) return false;
		// The callee printed holds the template its receiver printed as.
		const calleeText = literal
			? undefined
			: /** @type {JavascriptPrintContext} */ (writer).get(callee);
		if (
			!literal &&
			(hasEdgeComments(receiver) ||
				(typeOf(receiver) !== NodeType.TemplateLiteral &&
					!(templateJoins.size !== 0 && templateJoins.has(receiver))) ||
				calleeText === undefined ||
				calleeText.charCodeAt(0) !== 96 ||
				!calleeText.endsWith("`.concat"))
		) {
			return false;
		}
		const count = tree.fieldCount(Field.arguments, node);
		if (count === 0) return false;
		let converting = false;
		for (let i = 0; i < count; i++) {
			const argument = itemOf(i, Field.arguments, node);
			if (
				typeOf(argument) === NodeType.SpreadElement ||
				hasEdgeComments(argument)
			) {
				return false;
			}
			if (concatConstant(argument) !== undefined) continue;
			// `concat` converts each after evaluating all, a template each in turn.
			if (converting) return false;
			converting = true;
		}
		if (writesBuiltIn("String.prototype.concat")) return false;
		if (literal) {
			skipNode(callee);
			output.print("`");
			output.printTemplateStringChars(
				/** @type {string} */ (tree.value(receiver))
			);
		} else {
			/** @type {JavascriptPrintContext} */ (writer).consume(callee);
			printTemplatePiece(
				callee,
				/** @type {string} */ (calleeText).slice(0, -".concat".length - 1),
				0
			);
		}
		for (let i = 0; i < count; i++) {
			const argument = itemOf(i, Field.arguments, node);
			const constant = concatConstant(argument);
			if (constant !== undefined) {
				skipNode(argument);
				output.printTemplateStringChars(constant);
			} else {
				output.print("${");
				printNode(argument);
				output.print("}");
			}
		}
		output.print("`");
		templateJoins.add(node);
		return true;
	};

	/**
	 * @param {number} node an argument
	 * @returns {string | undefined} the string a constant string, number, boolean or `null` running nothing converts to
	 */
	const concatConstant = (node) => {
		if (holdsComments(node)) return undefined;
		const value = evaluateConstant(node);
		return (typeof value === "string" ||
			typeof value === "number" ||
			typeof value === "boolean" ||
			value === null) &&
			isPureValue(node)
			? String(value)
			: undefined;
	};

	/**
	 * @param {number} node what `typeof` reads
	 * @returns {boolean} whether reading it throws where `typeof` of it does: anything but a name no declaration binds
	 */
	const readsWithoutThrowing = (node) => {
		if (typeOf(node) !== NodeType.Identifier) return true;
		const definition = mangledNames === null ? null : mangledNames[node];
		return isMinifierVariable(definition) && !definition.undeclared;
	};

	/**
	 * Prints `templatePlus`'s template.
	 * @param {number} node the `+`
	 * @returns {void}
	 */
	const printTemplatePlus = (node) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		// Read off their printed text before either is consumed.
		const leftText = templateText(left);
		const rightText = templateText(right);
		const added = literalText(leftText === undefined ? left : right);
		if (leftText === undefined) {
			skipNode(left);
			output.print("`");
			output.printTemplateStringChars(/** @type {string} */ (added));
		} else {
			context.consume(left);
			printTemplatePiece(left, leftText.slice(0, -1), 0);
		}
		if (rightText === undefined) {
			skipNode(right);
			output.printTemplateStringChars(/** @type {string} */ (added));
			output.print("`");
		} else {
			context.consume(right);
			printTemplatePiece(right, rightText.slice(1), 1);
		}
		templateJoins.add(node);
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
		const equality = compresses ? EQUALITIES.indexOf(operator) : -1;
		if (equality !== -1) {
			equalityAt.set(node, output.text.length * 4 + equality);
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
			(type === NodeType.Literal &&
				(typeof tree.value(value) === "string" ||
					tree.value(value) === null ||
					isObjectValue(value)))
		) {
			return false;
		}
		// An arrow's body prints a sequence in parentheses already, and a
		// `return`, `throw` or sequence takes one bare.
		if (type === NodeType.SequenceExpression) {
			const parentType = typeOf(parentAt(0));
			return !(
				(typeOf(fn) === NodeType.ArrowFunctionExpression &&
					childOf(Field.body, fn) === value) ||
				parentType === NodeType.ReturnStatement ||
				parentType === NodeType.ThrowStatement ||
				parentType === NodeType.SequenceExpression
			);
		}
		const parent = parentAt(0);
		if (typeOf(parent) === NodeType.ExpressionStatement) {
			return opensAmbiguously(value);
		}
		if (!lowNeedsParens(call)) {
			return opensAmbiguously(value) && opensStatementOrBody(call);
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
	 * terser's `side_effects` of a call marked pure nobody reads: what its
	 * arguments run prints as a sequence, the call going.
	 * @param {number} node a call or `new`
	 * @param {number} parent its parent
	 * @returns {number[] | null} the arguments that print, null where it prints whole
	 */
	const unreadArgumentsOf = (node, parent) => {
		if (
			!compresses ||
			!dropsSideEffectFree ||
			tree.flag(Flag.optional, node) ||
			!valueUnread(node, parent) ||
			!isPureCall(node)
		) {
			return null;
		}
		const callee = childOf(Field.callee, node);
		// One `pure_funcs` names stays whole, as its arguments print it.
		if (pureFunctions !== null && pureFunctions.has(dottedNameOf(callee))) {
			return null;
		}
		// The callee goes too: a name, a member or a function running nothing.
		if (
			!callsEmptyFunction(node) &&
			!BARE_NAMES.test(
				/** @type {JavascriptPrintContext} */ (writer).get(callee)
			)
		) {
			return null;
		}
		/** @type {number[]} */
		const parts = [];
		return !collectUnreadParts(node, Field.arguments, parts) ||
			parts.length === 0 ||
			(!spreadsParts(parts) && opensWithinAmbiguously(parts[0]))
			? null
			: parts;
	};

	/**
	 * @param {number} node an array or object literal
	 * @returns {number} the field listing its items
	 */
	const itemsOf = (node) =>
		typeOf(node) === NodeType.ArrayExpression
			? Field.elements
			: Field.properties;

	/**
	 * @param {number[]} parts what `collectUnreadParts` lists
	 * @returns {boolean} whether a spread is among them, which an array prints them in
	 */
	const spreadsParts = (parts) => {
		for (const part of parts) {
			if (typeOf(part) === NodeType.SpreadElement) return true;
		}
		return false;
	};

	/**
	 * Prints a call as `unreadArgumentsOf` has it.
	 * @param {number} node a call or `new`, being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsUnreadArguments = (node) => {
		const parts = unreadArgumentsOf(node, parentAt(0));
		if (parts === null) return false;
		const parentType = typeOf(parentAt(0));
		// Where no list of expressions holds it, the sequence takes parentheses.
		const wraps =
			parts.length > 1 &&
			!spreadsParts(parts) &&
			parentType !== NodeType.ExpressionStatement &&
			parentType !== NodeType.SequenceExpression;
		skipNode(childOf(Field.callee, node));
		if (wraps) output.print("(");
		printUnreadParts(node, Field.arguments, parts);
		if (wraps) output.print(")");
		return true;
	};

	/**
	 * esbuild's `Boolean(x)` as `!!x`, or as `x` where it gives a boolean.
	 * @param {number} node a call or `new`
	 * @param {number} callee its callee
	 * @returns {boolean} whether it printed so
	 */
	const printsBooleanCall = (node, callee) => {
		if (
			!compresses ||
			typeOf(node) !== NodeType.CallExpression ||
			tree.flag(Flag.optional, node) ||
			typeOf(callee) !== NodeType.Identifier ||
			!isGlobalUndefined(callee, "Boolean") ||
			tree.fieldCount(Field.arguments, node) !== 1 ||
			hasEdgeComments(callee) ||
			writesBuiltIn("Boolean")
		) {
			return false;
		}
		const argument = itemOf(0, Field.arguments, node);
		if (
			typeOf(argument) === NodeType.SpreadElement ||
			// A sequence prints parenthesized as an argument already.
			typeOf(unwrap(argument)) === NodeType.SequenceExpression ||
			holdsComments(argument)
		) {
			return false;
		}
		// Only where any expression goes bare, which the call's place no longer
		// parenthesizes for it.
		const parent = parentAt(0);
		switch (typeOf(parent)) {
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				if (childOf(Field.callee, parent) === node) return false;
				break;
			case NodeType.AssignmentExpression:
			case NodeType.VariableDeclarator:
			case NodeType.ReturnStatement:
			case NodeType.ArrayExpression:
			case NodeType.Property:
				break;
			default:
				return false;
		}
		skipNode(callee);
		printNegatedAs(argument, isBooleanValued(argument) ? "" : "!!");
		return true;
	};

	/**
	 * @param {number} node an expression not read for its truth alone
	 * @returns {boolean} whether its value is always a boolean
	 */
	const isBooleanValued = (node) => {
		switch (typeOf(node)) {
			case NodeType.Literal:
				return typeof tree.value(node) === "boolean";
			case NodeType.UnaryExpression:
				return (
					tree.textOf(Part.operator, node) === "!" ||
					tree.textOf(Part.operator, node) === "delete"
				);
			case NodeType.BinaryExpression:
				return RELATIONS.has(
					/** @type {string} */ (tree.textOf(Part.operator, node))
				);
			case NodeType.ConditionalExpression:
				return (
					isBooleanValued(childOf(Field.consequent, node)) &&
					isBooleanValued(childOf(Field.alternate, node))
				);
			default:
				return false;
		}
	};

	/**
	 * @param {number} node an array literal
	 * @returns {boolean} whether its elements join another literal as they are: no hole, which reads the prototypes, and no spread
	 */
	const joinsAsElements = (node) => {
		const count = tree.fieldCount(Field.elements, node);
		for (let i = 0; i < count; i++) {
			const element = itemOf(i, Field.elements, node);
			if (element === 0 || typeOf(element) === NodeType.SpreadElement) {
				return false;
			}
		}
		return true;
	};

	/**
	 * How many leading arguments of a `concat` of an array literal, or of such
	 * a call joining all its own, join the receiver as one literal: array
	 * literals and primitives, which nothing spreads.
	 * @param {number} node an expression
	 * @returns {number} the count, -1 where it is no such call
	 */
	const concatJoined = (node) => {
		if (
			!compresses ||
			typeOf(node) !== NodeType.CallExpression ||
			tree.flag(Flag.optional, node)
		) {
			return -1;
		}
		const callee = childOf(Field.callee, node);
		if (
			typeOf(callee) !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, callee) ||
			tree.flag(Flag.optional, callee) ||
			tree.name(childOf(Field.property, callee)) !== "concat" ||
			holdsComments(node)
		) {
			return -1;
		}
		const object = childOf(Field.object, callee);
		if (
			typeOf(object) === NodeType.ArrayExpression
				? !joinsAsElements(object)
				: concatJoined(object) !== tree.fieldCount(Field.arguments, object)
		) {
			return -1;
		}
		// The result's constructor and what each argument spreads are read off
		// the prototypes and `Array`.
		if (
			writesBuiltIn("Array.prototype.concat") ||
			writesBuiltIn("Array.prototype.constructor") ||
			writesBuiltIn("Array.prototype.@@isConcatSpreadable") ||
			writesBuiltIn("Object.prototype.@@isConcatSpreadable") ||
			writesBuiltIn("Array.@@species")
		) {
			return -1;
		}
		const count = tree.fieldCount(Field.arguments, node);
		let joined = 0;
		for (; joined < count; joined++) {
			const argument = itemOf(joined, Field.arguments, node);
			if (
				typeOf(argument) === NodeType.ArrayExpression
					? !joinsAsElements(argument)
					: !pushesConstant(argument, [])
			) {
				break;
			}
		}
		return joined;
	};

	/**
	 * @param {number} node an array literal, a joined `concat` or what it joins
	 * @returns {number} how many elements it adds to the joined literal
	 */
	const joinedLength = (node) => {
		if (typeOf(node) === NodeType.ArrayExpression) {
			return tree.fieldCount(Field.elements, node);
		}
		if (concatJoined(node) < 0) return 1;
		let length = joinedLength(
			childOf(Field.object, childOf(Field.callee, node))
		);
		const count = tree.fieldCount(Field.arguments, node);
		for (let i = 0; i < count; i++) {
			length += joinedLength(itemOf(i, Field.arguments, node));
		}
		return length;
	};

	/**
	 * @param {number} node an array literal, a `concat` call or its callee
	 * @returns {boolean} whether it prints its elements bare, for the joined `concat` holding it to bracket
	 */
	const printsAsElements = (node) => {
		const parent = parentAt(0);
		if (typeOf(parent) === NodeType.MemberExpression) {
			return (
				childOf(Field.object, parent) === node &&
				typeOf(node) !== NodeType.MemberExpression &&
				concatJoined(parentAt(1)) >= 0 &&
				childOf(Field.callee, parentAt(1)) === parent
			);
		}
		if (typeOf(parent) !== NodeType.CallExpression) return false;
		if (childOf(Field.callee, parent) === node) {
			return concatJoined(parent) >= 0;
		}
		if (typeOf(node) !== NodeType.ArrayExpression) return false;
		const joined = concatJoined(parent);
		for (let i = 0; i < joined; i++) {
			if (itemOf(i, Field.arguments, parent) === node) return true;
		}
		return false;
	};

	/**
	 * Prints a joined `concat`'s receiver and joined arguments as one list,
	 * bracketed and followed by the rest where nothing joins it in turn.
	 * @param {number} node the call
	 * @param {number} joined how many arguments join
	 * @returns {void}
	 */
	const printJoinedConcat = (node, joined) => {
		const callee = childOf(Field.callee, node);
		const bare = printsAsElements(node);
		if (!bare) output.print("[");
		let printed = 0;
		const count = tree.fieldCount(Field.arguments, node);
		for (let i = -1; i < joined; i++) {
			const piece = i < 0 ? callee : itemOf(i, Field.arguments, node);
			const length =
				i < 0
					? joinedLength(childOf(Field.object, callee))
					: joinedLength(piece);
			if (length === 0) {
				skipNode(piece);
				continue;
			}
			if (printed++ !== 0) output.comma();
			printNode(piece);
		}
		if (bare) return;
		output.print("]");
		if (joined === count) return;
		output.print(".concat(");
		// A spread of a literal prints its items in its place.
		let printedArguments = 0;
		for (let i = joined; i < count; i++) {
			const argument = itemOf(i, Field.arguments, node);
			if (spreadsAs(argument, node) !== 0) {
				printedArguments = printSpread(argument, printedArguments);
				continue;
			}
			if (printedArguments++ !== 0) output.comma();
			printNode(argument);
		}
		output.print(")");
	};

	/**
	 * terser's `Call` printer.
	 * @param {number} node a call or `new`
	 * @returns {void}
	 */
	const printCall = (node) => {
		const callee = childOf(Field.callee, node);
		if (printsUnreadArguments(node)) return;
		const concatenated = concatJoined(node);
		if (concatenated >= 0) {
			printJoinedConcat(node, concatenated);
			return;
		}
		if (compresses && droppedConsole !== null && callsDroppedConsole(node)) {
			// Where no list holds it, a dropped call prints as what it returns.
			skipNode(callee);
			const count = tree.fieldCount(Field.arguments, node);
			for (let i = 0; i < count; i++) {
				skipNode(itemOf(i, Field.arguments, node));
			}
			// A call `new` constructs is already parenthesized.
			output.print(
				takesUnary(node) || typeOf(parentAt(0)) === NodeType.NewExpression
					? "void 0"
					: "(void 0)"
			);
			return;
		}
		const folded =
			compresses && typeOf(node) === NodeType.CallExpression
				? foldedCallValue(node)
				: undefined;
		if (folded !== undefined && printsFoldedCall(node, callee, folded)) return;
		if (printsBooleanCall(node, callee)) return;
		if (printsConcatTemplate(node, callee)) return;
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
			// An argument making nothing happen goes.
			let runs = 0;
			for (let i = 0; i < count; i++) {
				const item = itemOf(i, Field.arguments, node);
				if (typeOf(item) === NodeType.SpreadElement || !isPureValue(item)) {
					runs++;
				}
			}
			// With none, a statement no `if` prints as an expression runs nothing.
			if (runs === 0 && typeOf(parentAt(0)) === NodeType.ExpressionStatement) {
				const parent = parentAt(1);
				const holder =
					typeOf(parent) === NodeType.BlockStatement ? parentAt(2) : parent;
				if (typeOf(holder) !== NodeType.IfStatement || ifForm(holder) === 0) {
					for (let i = 0; i < count; i++) {
						skipNode(itemOf(i, Field.arguments, node));
					}
					return;
				}
			}
			output.print("[");
			let printed = 0;
			for (let i = 0; i < count; i++) {
				const item = itemOf(i, Field.arguments, node);
				if (typeOf(item) !== NodeType.SpreadElement && isPureValue(item)) {
					skipNode(item);
					continue;
				}
				if (spreadsAs(item, node) !== 0) {
					printed = printSpread(item, printed);
					continue;
				}
				if (printed++ !== 0) output.comma();
				printNode(item);
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
		if (compresses && typeOf(node) === NodeType.CallExpression) {
			if (printsCalledObject(node)) return;
			if (printsArrayCall(node)) return;
			if (printsEmptyObject(node)) {
				skipNode(childOf(Field.callee, node));
				output.print("{}");
				return;
			}
		}
		printNode(childOf(Field.callee, node));
		if (
			typeOf(node) === NodeType.NewExpression &&
			tree.fieldCount(Field.arguments, node) === 0
		) {
			return;
		}
		if (
			tree.flag(Flag.optional, node) &&
			!(compresses && neverNullish(childOf(Field.callee, node)))
		) {
			output.print("?.");
		}
		printArguments(node, Field.arguments);
	};

	/**
	 * Whether a call's callee is a function expression of plain parameters
	 * whose body runs nothing, its value or what it returns last running
	 * nothing too, which runs nothing but evaluating its arguments. A
	 * generator's body runs on its first `next()`; an async one settles its
	 * promise with what it returns, so returns nothing.
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
		const callee = movedFunctionOf(childOf(Field.callee, node));
		const type = typeOf(callee);
		if (
			(type !== NodeType.FunctionExpression &&
				type !== NodeType.ArrowFunctionExpression &&
				type !== NodeType.FunctionDeclaration) ||
			hasEdgeComments(callee)
		) {
			return false;
		}
		const async = tree.flag(Flag.async, callee);
		const body = tree.field(0, Field.body, callee);
		if (hasEdgeComments(body)) return false;
		if (tree.flag(Flag.generator, callee)) {
			// Its body runs later, if at all.
		} else if (typeOf(body) !== NodeType.BlockStatement) {
			// An arrow's value running nothing.
			if (async || !isPureValue(body)) return false;
		} else {
			const statements = tree.fieldCount(Field.body, body);
			for (let i = 0; i < statements; i++) {
				const statement = tree.field(i, Field.body, body);
				const type = typeOf(statement);
				if (
					holdsComments(statement) ||
					(type === NodeType.ReturnStatement
						? i !== statements - 1 ||
							(childOf(Field.argument, statement) !== 0 &&
								(async || !isPureValue(childOf(Field.argument, statement))))
						: type !== NodeType.FunctionDeclaration &&
							(type !== NodeType.ExpressionStatement ||
								tree.textOf(Part.directive, statement) !== null ||
								!isPureValue(childOf(Field.expression, statement))))
				) {
					return false;
				}
			}
		}
		const count = tree.fieldCount(Field.params, callee);
		for (let i = 0; i < count; i++) {
			let param = itemOf(i, Field.params, callee);
			// A rest parameter collects an array.
			if (typeOf(param) === NodeType.RestElement) {
				param = childOf(Field.argument, param);
			}
			if (typeOf(param) !== NodeType.Identifier) return false;
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
			case NodeType.TemplateLiteral:
				return (
					unreadTemplates.size !== 0 &&
					unreadTemplates.has(parent) &&
					convertedKind(tree, node, effectsContext()) !== undefined
				);
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
	 * Collects the constants an array literal, or a `concat` joining all its
	 * arguments into one, holds.
	 * @param {number} node the literal or call
	 * @param {(string | number | boolean | null | undefined)[]} values where to collect them
	 * @returns {(string | number | boolean | null | undefined)[] | undefined} the values, undefined where one is unknown or runs code
	 */
	const constantElements = (node, values) => {
		if (typeOf(node) === NodeType.CallExpression) {
			const object = childOf(Field.object, childOf(Field.callee, node));
			if (constantElements(object, values) === undefined) return;
			const count = tree.fieldCount(Field.arguments, node);
			for (let i = 0; i < count; i++) {
				const argument = itemOf(i, Field.arguments, node);
				// A joined argument that is no array literal is a constant.
				if (typeOf(argument) !== NodeType.ArrayExpression) {
					values.push(evaluateConstant(argument));
				} else if (constantElements(argument, values) === undefined) {
					return;
				}
			}
			return values;
		}
		const count = tree.fieldCount(Field.elements, node);
		for (let i = 0; i < count; i++) {
			const element = itemOf(i, Field.elements, node);
			if (element === 0) values.push(undefined);
			else if (!pushesConstant(element, values)) return;
		}
		return values;
	};

	/**
	 * @param {number} node an element or argument
	 * @param {(string | number | boolean | null | undefined)[]} values where to push its value
	 * @returns {boolean} whether it is a constant that runs nothing, now pushed
	 */
	const pushesConstant = (node, values) => {
		const value = evaluateConstant(node);
		if (
			(value === undefined && !isUndefinedValue(node)) ||
			!isPureValue(node)
		) {
			return false;
		}
		values.push(value);
		return true;
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
			holdsComments(node) ||
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
		/** @type {(string | number | boolean | null | undefined)[] | undefined} */
		let values;
		if (typeOf(object) === NodeType.ArrayExpression) {
			values = constantElements(object, []);
			if (values === undefined) return;
		} else if (
			concatJoined(object) === tree.fieldCount(Field.arguments, object)
		) {
			values = constantElements(object, []);
			if (values === undefined) return;
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
	 * @param {number} node an expression
	 * @returns {boolean} whether it is a boolean however it is printed: a `!` or a comparison
	 */
	const givesBoolean = (node) => {
		// A logical or conditional folding prints as what it keeps.
		node = foldedTo(node);
		switch (typeOf(node)) {
			case NodeType.UnaryExpression:
				if (tree.textOf(Part.operator, node) === "delete") return true;
				// `!!x` read for its truth prints as `x`, no boolean.
				return (
					tree.textOf(Part.operator, node) === "!" &&
					!isNegation(childOf(Field.argument, node))
				);
			case NodeType.BinaryExpression:
				switch (tree.textOf(Part.operator, node)) {
					case "!=":
					case "!==":
						// A test of `0` read for its truth prints the integer.
						return (
							comparedInteger(
								node,
								tree.textOf(Part.operator, node),
								childOf(Field.left, node),
								childOf(Field.right, node)
							) === 0
						);
					case "==":
					case "===":
					case "<":
					case ">":
					case "<=":
					case ">=":
					case "in":
					case "instanceof":
						return true;
				}
				return false;
			default:
				return false;
		}
	};

	/**
	 * @param {number} node the node being printed, or one holding it
	 * @param {number=} level where its parent is among the printed one's
	 * @returns {boolean} whether its parent reads only its truth: as a test, what `!` negates, or an operand of `&&` or `||` or a branch whose truth alone is read
	 */
	const readsTruth = (node, level = 0) => {
		const parent = parentAt(level);
		switch (typeOf(parent)) {
			case NodeType.IfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement:
			case NodeType.ForStatement:
				return childOf(Field.test, parent) === node;
			case NodeType.ConditionalExpression:
				// A branch gives the conditional's value.
				return (
					childOf(Field.test, parent) === node || readsTruth(parent, level + 1)
				);
			case NodeType.UnaryExpression:
				return tree.textOf(Part.operator, parent) === "!";
			case NodeType.LogicalExpression:
				return (
					tree.textOf(Part.operator, parent) !== "??" &&
					(readsTruth(parent, level + 1) ||
						valueUnread(parent, parentAt(level + 1)))
				);
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
			const unshadowed = isGlobalUndefined(node, "Infinity");
			if (
				unshadowed
					? keepsGlobalNames || keepsInfinity
					: // A literal too big for a double, which the name would misread.
						tree.type(node) !== NodeType.Literal
			) {
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
		// `-Infinity` prints `-1/0` where that reads as one value: `(-1)/0`.
		const bare =
			typeOf(parent) === NodeType.UnaryExpression
				? !negative &&
					tree.textOf(Part.operator, parent) === "-" &&
					holdsDivisionBare(parent, parentAt(1))
				: holdsDivisionBare(node, parent);
		output.print(
			bare ? (negative ? "-1/0" : "1/0") : negative ? "(-1/0)" : "(1/0)"
		);
		return true;
	};

	/**
	 * @param {number} node an expression
	 * @param {number} parent what holds it
	 * @returns {boolean} whether a division printed in its place reads as one value without parentheses
	 */
	const holdsDivisionBare = (node, parent) => {
		switch (typeOf(parent)) {
			case NodeType.BinaryExpression: {
				const operator = tree.textOf(Part.operator, parent);
				return (
					operator !== "*" &&
					operator !== "/" &&
					operator !== "%" &&
					operator !== "**"
				);
			}
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				return childOf(Field.callee, parent) !== node;
			case NodeType.MemberExpression:
			case NodeType.UnaryExpression:
			case NodeType.UpdateExpression:
			case NodeType.AwaitExpression:
			case NodeType.TaggedTemplateExpression:
			case NodeType.ClassExpression:
			case NodeType.ClassDeclaration:
				return false;
			default:
				return true;
		}
	};

	/**
	 * @param {number} node an expression
	 * @returns {string | undefined} the built-ins it names: `Math`, `Number`, `String`, an owner of statics a call of runs nothing, the `prototype` of `Array`, `Number`, `Object` or `String`, `""` for the global object, undefined for another
	 */
	const builtInOwnerOf = (node) => {
		const type = typeOf(node);
		if (type === NodeType.Identifier) {
			const name = tree.name(node);
			if (
				name === "Math" ||
				name === "Number" ||
				name === "String" ||
				hasOwn(nativeTables().NATIVE_PURE_STATIC_FUNCTIONS, name)
			) {
				return isGlobalUndefined(node, name) ? name : undefined;
			}
			return (name === "globalThis" ||
				name === "window" ||
				name === "self" ||
				name === "global") &&
				isGlobalUndefined(node, name)
				? ""
				: undefined;
		}
		if (
			type !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, node) ||
			tree.name(childOf(Field.property, node)) !== "prototype"
		) {
			return undefined;
		}
		const owner = builtInOwnerOf(childOf(Field.object, node));
		return owner === "Array" ||
			owner === "Number" ||
			owner === "Object" ||
			owner === "String"
			? `${owner}.prototype`
			: undefined;
	};

	/**
	 * Notes the built-in a write sets: a member of one, every member of one
	 * named elsewhere or handed to `Object`, which may set any.
	 * @param {number} target a written or passed expression
	 * @param {boolean} member whether it is written itself, as a member
	 * @returns {void}
	 */
	const noteBuiltInWrite = (target, member) => {
		const writes = /** @type {Set<string>} */ (builtInWrites);
		if (!member) {
			const owner = builtInOwnerOf(target);
			if (owner !== undefined) writes.add(owner === "" ? "*" : `${owner}.*`);
			// A constructor that goes reaches its prototype too.
			if (
				owner === "Array" ||
				owner === "Number" ||
				owner === "Object" ||
				owner === "String"
			) {
				writes.add(`${owner}.prototype.*`);
			}
			return;
		}
		if (typeOf(target) === NodeType.RestElement) {
			target = childOf(Field.argument, target);
		}
		if (typeOf(target) !== NodeType.MemberExpression) return;
		const owner = builtInOwnerOf(childOf(Field.object, target));
		if (owner === undefined) return;
		const property = childOf(Field.property, target);
		const key = !tree.flag(Flag.computed, target)
			? tree.name(property)
			: typeOf(property) === NodeType.Literal
				? String(tree.value(property))
				: "*";
		writes.add(owner === "" ? key : `${owner}.${key}`);
	};

	/**
	 * @param {number} node a node of the program
	 * @returns {undefined} nothing, so the walk goes on
	 */
	const noteBuiltInWrites = (node) => {
		switch (typeOf(node)) {
			case NodeType.AssignmentExpression:
				noteBuiltInWrite(childOf(Field.left, node), true);
				noteBuiltInWrite(childOf(Field.right, node), false);
				break;
			case NodeType.AssignmentPattern:
				noteBuiltInWrite(childOf(Field.left, node), true);
				noteBuiltInWrite(childOf(Field.right, node), false);
				break;
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
				noteBuiltInWrite(childOf(Field.left, node), true);
				break;
			case NodeType.UpdateExpression:
				noteBuiltInWrite(childOf(Field.argument, node), true);
				break;
			case NodeType.UnaryExpression:
				if (tree.textOf(Part.operator, node) === "delete") {
					noteBuiltInWrite(childOf(Field.argument, node), true);
				}
				break;
			case NodeType.ArrayPattern:
				for (let i = 0; i < tree.fieldCount(Field.elements, node); i++) {
					noteBuiltInWrite(itemOf(i, Field.elements, node), true);
				}
				break;
			case NodeType.ObjectPattern:
				for (let i = 0; i < tree.fieldCount(Field.properties, node); i++) {
					const property = itemOf(i, Field.properties, node);
					noteBuiltInWrite(
						typeOf(property) === NodeType.Property
							? childOf(Field.value, property)
							: property,
						true
					);
				}
				break;
			// What `Object` and `Reflect` set members of; `apply(Math, …)`,
			// `[String]` or `{ type: Number }` reads the built-in only.
			case NodeType.CallExpression: {
				const callee = childOf(Field.callee, node);
				if (
					tree.fieldCount(Field.arguments, node) === 0 ||
					typeOf(callee) !== NodeType.MemberExpression ||
					typeOf(childOf(Field.object, callee)) !== NodeType.Identifier
				) {
					break;
				}
				const owner = tree.name(childOf(Field.object, callee));
				if (owner !== "Object" && owner !== "Reflect") break;
				const property = childOf(Field.property, callee);
				// `Reflect["set"]` names its writer as `Reflect.set` does.
				const name = !tree.flag(Flag.computed, callee)
					? tree.name(property)
					: typeOf(property) === NodeType.Literal
						? tree.value(property)
						: undefined;
				if (
					typeof name === "string" &&
					(owner === "Object" ? OBJECT_WRITERS : REFLECT_WRITERS).includes(name)
				) {
					noteBuiltInWrite(itemOf(0, Field.arguments, node), false);
				}
				break;
			}
			case NodeType.VariableDeclarator:
				noteBuiltInWrite(childOf(Field.init, node), false);
				break;
		}
		return undefined;
	};

	/**
	 * Whether the program may replace a built-in by a write it names, the first
	 * ask noting every one; one reached otherwise (a callee handed `Math`,
	 * `Object.getPrototypeOf("")`, `__proto__`) is taken as native, as oxc and
	 * terser's `builtins_ecma` take it.
	 * @param {string} qualified a qualified name: `Math.abs`, `parseInt`
	 * @returns {boolean} true where it may run another function
	 */
	const writesBuiltIn = (qualified) => {
		if (builtInWrites === null) {
			builtInWrites = new Set();
			if (foldedProgram !== 0) findNode(foldedProgram, noteBuiltInWrites);
		}
		if (builtInWrites.size === 0) return false;
		if (builtInWrites.has("*") || builtInWrites.has(qualified)) return true;
		// The owner set whole, or the global it hangs on: `String.prototype = p`,
		// `window.Math = m`.
		const owner = qualified.slice(0, Math.max(qualified.lastIndexOf("."), 0));
		return (
			owner !== "" &&
			(builtInWrites.has(owner) ||
				builtInWrites.has(`${owner}.*`) ||
				builtInWrites.has(owner.split(".")[0]))
		);
	};

	/**
	 * The function a call of a built-in `foldedBuiltIns` lists runs, with what
	 * it reads as `this`: a global's, a global object's static, or a method of
	 * a string or number written in place.
	 * @param {number} callee the callee
	 * @returns {[BuiltInFunction, BuiltInReceiver, string] | undefined} the function, its receiver and its qualified name; undefined for another callee
	 */
	const foldedFunctionOf = (callee) => {
		const tables = foldedBuiltInTables();
		if (typeOf(callee) === NodeType.Identifier) {
			const name = tree.name(callee);
			return (tables.globals.includes(name) ||
				FOLDED_CONVERSIONS.includes(name)) &&
				isGlobalUndefined(callee, name)
				? [
						/** @type {Record<string, BuiltInFunction>} */ (
							/** @type {typeof globalThis | Record<string, BuiltInFunction>} */ (
								global
							)
						)[name],
						undefined,
						name
					]
				: undefined;
		}
		if (
			typeOf(callee) !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, callee) ||
			tree.flag(Flag.optional, callee) ||
			hasEdgeComments(callee)
		) {
			return undefined;
		}
		const name = tree.name(childOf(Field.property, callee));
		const object = childOf(Field.object, callee);
		if (typeOf(object) === NodeType.Identifier) {
			const owner = tree.name(object);
			if (!hasOwn(tables.statics, owner)) return undefined;
			if (!tables.statics[owner].includes(name)) return undefined;
			if (!isGlobalUndefined(object, owner)) return undefined;
			const receiver =
				/** @type {Record<string, Record<string, BuiltInFunction>>} */ (
					/** @type {typeof globalThis | Record<string, Record<string, BuiltInFunction>>} */ (
						global
					)
				)[owner];
			return [receiver[name], receiver, `${owner}.${name}`];
		}
		const value = evaluateConstant(object);
		const owner =
			typeof value === "string"
				? "String"
				: typeof value === "number"
					? "Number"
					: undefined;
		if (
			owner === undefined ||
			!tables.methods[owner].includes(name) ||
			!isPureValue(object)
		) {
			return undefined;
		}
		const prototype = /** @type {Record<string, BuiltInFunction>} */ (
			/** @type {string | number | Record<string, BuiltInFunction>} */ (
				owner === "String" ? String.prototype : Number.prototype
			)
		);
		return [
			prototype[name],
			/** @type {string | number} */ (value),
			`${owner}.prototype.${name}`
		];
	};

	/**
	 * What a call of a built-in `foldedBuiltIns` lists answers, run at build time
	 * on arguments written as primitives: exactly specified, the answer is the
	 * engine's anywhere `builtinsEcma` takes the built-in as native.
	 * @param {number} node a call
	 * @returns {string | number | boolean | undefined} the answer, undefined where it may differ, throws or is no primitive
	 */
	const foldedCallAnswer = (node) => {
		const known = foldedCalls.get(node);
		if (known !== undefined) return known === null ? undefined : known;
		const value = evaluateFoldedCall(node);
		foldedCalls.set(node, value === undefined ? null : value);
		return value;
	};

	/**
	 * A built-in call's answer where it prints no longer than the call, so the
	 * value never grows a read it reaches.
	 * @param {number} node a call
	 * @returns {string | number | boolean | undefined} the answer, undefined where `foldedCallAnswer` has none or it prints longer
	 */
	const foldedCallValue = (node) => {
		const value = foldedCallAnswer(node);
		if (value === undefined) return undefined;
		return printedValueLength(value) <=
			/** @type {number} */ (foldedCallSizes.get(node))
			? value
			: undefined;
	};

	/**
	 * How long a call's part prints whatever its spelling: a literal as its
	 * value, a name as itself, a folded call as the shorter of it and its answer.
	 * @param {number} node an argument or receiver
	 * @param {string | number | boolean | null} value its value
	 * @returns {number} its length, NaN for another expression, which keeps the call
	 */
	const printedSizeOf = (node, value) => {
		switch (typeOf(node)) {
			case NodeType.Literal:
				return printedValueLength(value);
			case NodeType.UnaryExpression: {
				// The operator, then its operand: `-1`, `!0`, `-Infinity`.
				const argument = childOf(Field.argument, node);
				return (
					1 +
					printedSizeOf(
						argument,
						/** @type {string | number | boolean | null} */ (
							evaluateConstant(argument)
						)
					)
				);
			}
			case NodeType.Identifier:
				return tree.name(node).length;
			case NodeType.TemplateLiteral:
				return tree.fieldCount(Field.expressions, node) === 0
					? printedValueLength(value)
					: Number.NaN;
			case NodeType.CallExpression: {
				const size = /** @type {number} */ (foldedCallSizes.get(node));
				return Math.min(size, printedValueLength(value));
			}
			default:
				return Number.NaN;
		}
	};

	/**
	 * @param {string | number | boolean | null} value a constant's value
	 * @returns {number} the length of its print, a sign included
	 */
	const printedValueLength = (value) =>
		typeof value === "number" && (value < 0 || Object.is(value, -0))
			? printedLength(-value) + 1
			: printedLength(value);

	/**
	 * @param {number} node a call
	 * @returns {string | number | boolean | undefined} what `foldedCallValue` answers, worked out afresh
	 */
	const evaluateFoldedCall = (node) => {
		if (
			tree.flag(Flag.optional, node) ||
			holdsComments(node) ||
			keepsGlobalNames
		) {
			return undefined;
		}
		const found = foldedFunctionOf(childOf(Field.callee, node));
		if (found === undefined) return undefined;
		const [fn, receiver, qualified] = found;
		const tables =
			/** @type {import("./syntax-printer-data").FoldedBuiltIns} */ (
				foldedTables
			);
		if (
			(hasOwn(tables.editions, qualified) &&
				builtinsEcma < tables.editions[qualified]) ||
			writesBuiltIn(qualified)
		) {
			return undefined;
		}
		const count = tree.fieldCount(Field.arguments, node);
		/** @type {(string | number | boolean | null)[]} */
		const args = [];
		for (let i = 0; i < count; i++) {
			const argument = itemOf(i, Field.arguments, node);
			if (typeOf(argument) === NodeType.SpreadElement) return undefined;
			// An inner call's answer counts however long it prints.
			const value =
				typeOf(argument) === NodeType.CallExpression
					? foldedCallAnswer(argument)
					: evaluateConstant(argument);
			if (value === undefined || !isPureValue(argument)) return undefined;
			args.push(value);
		}
		const name = qualified.slice(qualified.lastIndexOf(".") + 1);
		const isMethod = qualified.includes(".prototype.");
		// U+180E stopped being white space in Unicode 6.3, so engines trim it apart.
		if (
			(typeof receiver === "string" && receiver.includes("\u180E")) ||
			args.some(
				(value) => typeof value === "string" && value.includes("\u180E")
			)
		) {
			return undefined;
		}
		if (args.some(convertsByEdition)) return undefined;
		if (typeof receiver === "number") {
			const digits = args.length === 0 ? undefined : Number(args[0]);
			// Another radix is exact only on a safe integer; ECMAScript 5 throws past 20 digits (21 significant).
			if (
				name === "toString"
					? digits !== undefined &&
						digits !== 10 &&
						!Number.isSafeInteger(receiver)
					: digits !== undefined && digits > (name === "toPrecision" ? 21 : 20)
			) {
				return undefined;
			}
		}
		// An engine of another Unicode version answers otherwise outside ASCII.
		if (
			isMethod &&
			tables.unicodeDependent.includes(name) &&
			!/^[\0-\u007F]*$/.test(/** @type {string} */ (receiver))
		) {
			return undefined;
		}
		// The callee, its parentheses, each argument and the commas between.
		const callee = childOf(Field.callee, node);
		let size =
			(isMethod
				? printedSizeOf(
						childOf(Field.object, callee),
						/** @type {string | number} */ (receiver)
					) +
					(typeof receiver === "number" ? 2 : 1) +
					name.length
				: qualified.length) +
			1 +
			count;
		for (let i = 0; i < count; i++) {
			size += printedSizeOf(itemOf(i, Field.arguments, node), args[i]);
		}
		if (Number.isNaN(size)) size = 0;
		// A count or length past the call's own size makes a longer string.
		if (isMethod && tables.sizedByArgument.includes(name)) {
			const amount = Number(args[0]);
			if (!(
				amount >= 0 &&
				(name === "repeat"
					? amount * /** @type {string} */ (receiver).length
					: amount) <= size
			)) {
				return undefined;
			}
		}
		// Past 20 digits, or in another radix, an engine may approximate a parse.
		if (
			(name === "parseFloat" &&
				String(args[0]).replace(/\D/g, "").length > 20) ||
			(name === "parseInt" &&
				args.length > 1 &&
				!PARSED_RADIXES.includes(Number(args[1])))
		) {
			return undefined;
		}
		foldedCallSizes.set(node, size);
		let value;
		try {
			value = fn.apply(receiver, args);
		} catch (_err) {
			return undefined;
		}
		if (name === "parseInt" && !Number.isSafeInteger(value)) return undefined;
		return typeof value === "string" ||
			typeof value === "boolean" ||
			(typeof value === "number" && Number.isFinite(value))
			? value
			: undefined;
	};

	/**
	 * Prints a call of a built-in as its answer where that is no longer.
	 * @param {number} node the call, being printed
	 * @param {number} callee its callee
	 * @param {string | number | boolean} value its answer
	 * @returns {boolean} whether it printed so
	 */
	const printsFoldedCall = (node, callee, value) => {
		const wrap =
			typeof value === "number" &&
			(value < 0 || Object.is(value, -0)) &&
			(!takesUnary(node) || isCalledOrAccessed(node, parentAt(0)));
		skipNode(callee);
		const count = tree.fieldCount(Field.arguments, node);
		for (let i = 0; i < count; i++) skipNode(itemOf(i, Field.arguments, node));
		if (wrap) output.print("(");
		printValue(value, takesUnary(node));
		if (wrap) output.print(")");
		return true;
	};

	/**
	 * @param {number} node a member expression
	 * @param {boolean} printed whether it is the node being printed, which a call, tag or `delete` of it reads as a reference
	 * @returns {string | number | undefined} what it reads of a literal written in place: a string's or array's `length`, a string's code unit at an index, a regular expression's `source`; undefined where read as a reference or for another
	 */
	const literalPropertyOf = (node, printed) => {
		const property = childOf(Field.property, node);
		if (tree.flag(Flag.optional, node)) return undefined;
		// `x["length"]` reads what `x.length` does.
		const computed = tree.flag(Flag.computed, node);
		const key = computed && typeOf(property) === NodeType.Literal
			? tree.value(property)
			: undefined;
		// `"ab"[1]` and `"ab"["1"]` read a code unit.
		const index =
			typeof key === "number"
				? key
				: typeof key === "string" && /^(?:0|[1-9]\d*)$/.test(key)
					? Number(key)
					: -1;
		if (
			computed
				? typeof key !== "string" && typeof key !== "number"
				: typeOf(property) !== NodeType.Identifier
		) {
			return undefined;
		}
		const name = computed ? String(key) : tree.name(property);
		if (name !== "length" && name !== "source" && index === -1) {
			return undefined;
		}
		const parent = printed ? parentAt(0) : 0;
		const parentType = typeOf(parent);
		if (
			((isCallType(parentType) || parentType === NodeType.NewExpression) &&
				childOf(Field.callee, parent) === node) ||
			parentType === NodeType.TaggedTemplateExpression ||
			(parentType === NodeType.UnaryExpression &&
				tree.textOf(Part.operator, parent) === "delete")
		) {
			return undefined;
		}
		const object = childOf(Field.object, node);
		if (holdsComments(object)) return undefined;
		const type = typeOf(object);
		if (type === NodeType.ArrayExpression) {
			if (name !== "length") return undefined;
			const count = tree.fieldCount(Field.elements, object);
			for (let i = 0; i < count; i++) {
				const element = itemOf(i, Field.elements, object);
				if (
					element !== 0 &&
					(typeOf(element) === NodeType.SpreadElement || !isPureValue(element))
				) {
					return undefined;
				}
			}
			return count;
		}
		if (type !== NodeType.Literal) return undefined;
		const value = tree.value(object);
		if (typeof value === "string") {
			if (name === "length") return value.length;
			return Number.isInteger(index) && index >= 0 && index < value.length
				? value[index]
				: undefined;
		}
		const raw = tree.textOf(Part.raw, object);
		if (name !== "source" || raw === null || raw.charCodeAt(0) !== 47) {
			return undefined;
		}
		const end = raw.lastIndexOf("/");
		try {
			// terser's `regexp_source_fix` reads the source as this engine has it.
			return new RegExp(raw.slice(1, end), raw.slice(end + 1)).source;
		} catch (_err) {
			return undefined;
		}
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
		// Its callers print no write target, which reads no value.
		const parent = parentAt(0);
		switch (typeOf(parent)) {
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
		if (pushedNegations.size !== 0 && pushedNegations.has(argument)) {
			// The operation took the inner `!` in, its parentheses the outer one's.
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				argument
			);
			if (typeOf(argument) === NodeType.UnaryExpression) {
				output.print("!");
			} else if (negatedOperations.get(argument) === true) {
				// Its operands took this `!` in; where it stands takes them bare.
				printSlice(
					(endState[argument] & OPENS_PARENTHESIZED) !== 0 &&
						!holdsComments(argument) &&
						takesNegatedOperation(node, argument)
						? text.slice(1, -1)
						: text
				);
				return;
			} else {
				pushedNegations.add(node);
			}
			printSlice(text);
			return;
		}
		if (
			compresses &&
			operator !== "void" &&
			// `delete` of what is no reference deletes nothing, and is `true`.
			(operator !== "delete" || valueAtPrint(node) !== undefined) &&
			!holdsComments(node)
		) {
			// terser's `evaluate`: `+"1"` is `1`, `typeof 1` is `"number"`, `!"a"`
			// is `!1`, where no longer than the operation.
			const value =
				operator === "typeof" &&
				(typeOf(argument) === NodeType.FunctionExpression ||
					typeOf(argument) === NodeType.ArrowFunctionExpression)
					? "function"
					: valueAtPrint(node);
			const text = /** @type {JavascriptPrintContext} */ (writer).get(argument);
			// `typeof` is spaced from a name or number.
			const length =
				operator.length +
				text.length +
				(operator === "typeof" && /^[\w$\\\u0080-\uFFFF]/.test(text) ? 1 : 0);
			const unary = takesUnary(node);
			if (
				typeof value === "string"
					? value.length + 2 <= length
					: typeof value === "boolean"
						? (unary ? 2 : value ? 4 : 5) <= length
						: typeof value === "number" &&
							Number.isFinite(value) &&
							(value < 0 ? 1 : 0) + makeNum(Math.abs(value)).length <= length
			) {
				skipNode(argument);
				// Where only its truth is read, a boolean is `1` or `0`.
				if (typeof value === "boolean" && readsTruth(node)) {
					output.print(value ? "1" : "0");
				} else {
					printValue(/** @type {string | number | boolean} */ (value), unary);
				}
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
			// terser's `booleans`: `!!x` read only for its truth is `x`, and a
			// binary `x` the `!` parenthesized needs no parentheses where that is,
			// but under another `!`, which reads it bare.
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				argument
			);
			// Under another `!`, the binary keeps them.
			const bare =
				!isNegation(parentAt(0)) &&
				typeOf(childOf(Field.argument, argument)) ===
					NodeType.BinaryExpression &&
				!isUnaryType(typeOf(parentAt(0))) &&
				text.charCodeAt(1) === 40 &&
				text.charCodeAt(text.length - 1) === 41;
			printSlice(bare ? text.slice(2, -1) : text.slice(1));
			return;
		}
		if (
			compresses &&
			operator === "!" &&
			isNegation(argument) &&
			givesBoolean(childOf(Field.argument, argument)) &&
			!holdsComments(argument) &&
			/** @type {JavascriptPrintContext} */ (writer)
				.get(argument)
				.charCodeAt(0) === 33
		) {
			// `!!b` is `b` where `b` is a boolean already.
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				argument
			);
			const inner = text.slice(1);
			printSlice(
				inner.charCodeAt(0) === 40 &&
					typeOf(foldedTo(childOf(Field.argument, argument))) ===
						NodeType.BinaryExpression &&
					!opensAmbiguously(childOf(Field.argument, argument)) &&
					takesEquality(node)
					? inner.slice(1, -1)
					: inner
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
		if (
			compresses &&
			!hasEdgeComments(node) &&
			dropsUnreadOperator(operator, argument) &&
			valueUnread(node, parentAt(0))
		) {
			// What nothing reads is the same without `void`, `!`, the `typeof` of
			// a member or the `delete` of what is no reference.
			if (opensAmbiguously(argument)) {
				printNode(argument, true);
				return;
			}
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				argument
			);
			// The parentheses only the operator needed go with it.
			printSlice(
				BINDS_BELOW_UNARY[typeOf(argument)] === 1 && text.charCodeAt(0) === 40
					? text.slice(1, -1)
					: text
			);
			return;
		}
		if (compresses && operator === "+" && convertsAnyway(node, argument)) {
			// The operation beside a number converts the value as `+` does, a
			// BigInt throwing either way.
			printNode(argument);
			return;
		}
		if (
			compresses &&
			operator === "!" &&
			equalityAt.size !== 0 &&
			equalityAt.has(argument) &&
			!holdsComments(argument) &&
			!opensAmbiguously(argument) &&
			takesEquality(node)
		) {
			// terser's `comparisons`: `!(a==b)` is `a!=b`, without the parentheses
			// the `!` took.
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				argument
			);
			const equality = /** @type {number} */ (equalityAt.get(argument));
			// Under a unary, a binary's text always opens with `(`.
			const at = (equality >> 2) - 1;
			const inner = text.slice(1, -1);
			printSlice(
				inner.slice(0, at) +
					EQUALITIES[(equality & 3) ^ 1] +
					inner.slice(at + EQUALITIES[equality & 3].length)
			);
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

	// What a unary operator takes in parentheses, which a statement or a
	// sequence's item takes bare.
	const BINDS_BELOW_UNARY = new Uint8Array(256);
	for (const type of [
		NodeType.BinaryExpression,
		NodeType.LogicalExpression,
		NodeType.ConditionalExpression,
		NodeType.AssignmentExpression,
		NodeType.SequenceExpression
	]) {
		BINDS_BELOW_UNARY[type] = 1;
	}

	/**
	 * @param {string} operator a unary operator
	 * @param {number} argument what it takes
	 * @returns {boolean} whether, its value unread, it runs only what it takes
	 */
	const dropsUnreadOperator = (operator, argument) => {
		switch (operator) {
			case "void":
				return true;
			// `!function(){}()` is the call written shorter.
			case "!":
				return !opensAmbiguously(argument);
			case "typeof":
				return typeOf(argument) !== NodeType.Identifier;
			case "delete":
				switch (typeOf(argument)) {
					case NodeType.Identifier:
					case NodeType.MemberExpression:
					case NodeType.ChainExpression:
					case NodeType.ParenthesizedExpression:
						return false;
					default:
						return true;
				}
			default:
				return false;
		}
	};

	/**
	 * @param {number} node a `+` being printed
	 * @param {number} argument what it converts
	 * @returns {boolean} whether it is an operand of arithmetic, but `+` and `**`, whose other operand is a known number
	 */
	const convertsAnyway = (node, argument) => {
		const parent = parentAt(0);
		if (
			typeOf(parent) !== NodeType.BinaryExpression ||
			hasEdgeComments(node) ||
			// `- -x` and `+ ++x` would need a space; one `+` is shorter kept.
			isUnaryPrefix(argument) ||
			// An object, function or class it opens would read as a statement's own.
			opensAmbiguously(argument)
		) {
			return false;
		}
		switch (tree.textOf(Part.operator, parent)) {
			case "-":
			case "*":
			case "/":
			case "%":
			case "|":
			case "&":
			case "^":
			case "<<":
			case ">>":
			case ">>>":
				break;
			default:
				return false;
		}
		const left = childOf(Field.left, parent);
		const other = left === node ? childOf(Field.right, parent) : left;
		return typeof valueAtPrint(other) === "number";
	};

	/**
	 * @param {number} node an expression being printed
	 * @returns {boolean} whether an equality printed in its place needs no parentheses
	 */
	const takesEquality = (node) => {
		const parent = parentAt(0);
		switch (typeOf(parent)) {
			case NodeType.ExpressionStatement:
			case NodeType.VariableDeclarator:
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
			case NodeType.IfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement:
			case NodeType.ForStatement:
			case NodeType.SequenceExpression:
			case NodeType.ArrayExpression:
			case NodeType.TemplateLiteral:
			case NodeType.SpreadElement:
				return true;
			case NodeType.LogicalExpression:
				return true;
			// A test's `!` swaps the branches instead.
			case NodeType.ConditionalExpression:
				return childOf(Field.test, parent) !== node;
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				return childOf(Field.callee, parent) !== node;
			case NodeType.AssignmentExpression:
				return childOf(Field.right, parent) === node;
			case NodeType.Property:
				return childOf(Field.value, parent) === node;
			case NodeType.ArrowFunctionExpression:
				return childOf(Field.body, parent) === node;
			default:
				return false;
		}
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
			output.toUtf8(
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
	 * @param {number} body an arrow's block body
	 * @returns {number} the `return` of a value ending it where every other statement printing is an expression, which print as one sequence with that value; 0 for none
	 */
	const sequenceReturn = (body) => {
		if (!compresses || holdsComments(body)) return 0;
		const count = tree.fieldCount(Field.body, body);
		let expressions = 0;
		let last = 0;
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.body, body);
			if (printsNothing(item)) continue;
			if (last !== 0) return 0;
			const type = typeOf(item);
			if (type === NodeType.ExpressionStatement) {
				// It printed the parentheses it takes opening a statement.
				if (
					!printsOneStatement(item, 0) ||
					opensAmbiguously(childOf(Field.expression, item))
				) {
					return 0;
				}
				expressions++;
			} else if (
				type === NodeType.IfStatement &&
				ifForm(item) === CONDITIONAL_FORM &&
				!hasEdgeComments(item) &&
				!opensAmbiguously(childOf(Field.test, item)) &&
				!(unreadStatements.size !== 0 && unreadStatements.has(item))
			) {
				expressions++;
			} else if (type === NodeType.ReturnStatement) {
				const argument = childOf(Field.argument, item);
				if (argument === 0 || returnsNothing(argument)) return 0;
				last = item;
			} else {
				return 0;
			}
		}
		return expressions === 0 ? 0 : last;
	};

	/**
	 * @param {number} node an arrow
	 * @returns {number} what it prints after `=>` as what it returns: its expression body, or what its one `return` returns, else 0
	 */
	const arrowReturned = (node) => {
		const body = childOf(Field.body, node);
		if (typeOf(body) !== NodeType.BlockStatement) return body;
		const statement = soleStatement(body);
		return typeOf(statement) === NodeType.ReturnStatement
			? childOf(Field.argument, statement)
			: 0;
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
		// The one parameter printing, a name, takes no parentheses.
		const params = tree.fieldCount(Field.params, node);
		let only = 0;
		for (let i = 0; i < params; i++) {
			const param = itemOf(i, Field.params, node);
			if (constantArguments.size !== 0 && passesInlined(param, Field.params)) {
				continue;
			}
			only = only === 0 ? param : -1;
		}
		if (only > 0 && typeOf(only) === NodeType.Identifier) {
			for (let i = 0; i < params; i++) {
				const param = itemOf(i, Field.params, node);
				if (param === only) printNode(param);
				else skipNode(param);
			}
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
			if (
				typeOf(statement) === NodeType.ReturnStatement ||
				// A statement folding to a bare `return`, such as `if (true) return`.
				(compresses &&
					statement !== 0 &&
					/** @type {JavascriptPrintContext} */ (writer).get(statement) ===
						"return")
			) {
				returns = true;
				returned =
					typeOf(statement) === NodeType.ReturnStatement
						? childOf(Field.argument, statement)
						: 0;
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
		let last = returns ? 0 : sequenceReturn(body);
		// A value nothing reads that runs nothing goes, as a `return` drops it.
		const drops =
			last !== 0 &&
			dropsSideEffectFree &&
			returnsUnread(-1) &&
			isPureValue(childOf(Field.argument, last));
		if (last !== 0 && !drops) {
			const count = tree.fieldCount(Field.body, body);
			let alone = true;
			for (let i = 0; alone && i < count; i++) {
				const item = tree.field(i, Field.body, body);
				alone = item === last || printedNothing(item);
			}
			// The rest printing nothing, the value is what the arrow returns.
			if (alone) {
				for (let i = 0; i < count; i++) {
					const item = tree.field(i, Field.body, body);
					if (item !== last) {
						/** @type {JavascriptPrintContext} */ (writer).consume(item);
					}
				}
				returns = true;
				returned = childOf(Field.argument, last);
				last = 0;
			}
		}
		if (last !== 0) {
			// terser's `sequences` of an arrow: `{a();return b}` is `(a(),b)`.
			output.print(drops ? "{" : "(");
			const count = tree.fieldCount(Field.body, body);
			let printed = false;
			for (let i = 0; i < count; i++) {
				const item = tree.field(i, Field.body, body);
				if (item !== last && printedNothing(item)) {
					/** @type {JavascriptPrintContext} */ (writer).consume(item);
					continue;
				}
				if (drops && item === last) continue;
				if (printed) {
					output.mightNeedSemicolon = false;
					output.print(",");
				}
				printNode(item === last ? childOf(Field.argument, last) : item);
				printed = true;
			}
			output.mightNeedSemicolon = false;
			output.print(drops ? "}" : ")");
		} else if (!returns && returnsChain(body)) {
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
			const taken = output.claimPrependComments(current);
			output.atProgramStart = false;
			if (taken !== undefined) output.printPrependComments(taken);
		}
		displayBody(current);
		output.endProgram();
		if (commentTokens !== null) printCommentsAfter(current);
	};
	/**
	 * @param {number} statement an expression statement, not a directive
	 * @param {number} expression its expression, printed
	 * @returns {boolean} whether it prints as a string alone, which a string literal written so does not
	 */
	const printsAsString = (statement, expression) => {
		if (
			isStringStatement(statement) ||
			typeof evaluateConstant(expression) !== "string"
		) {
			return false;
		}
		const text = /** @type {JavascriptPrintContext} */ (writer).get(expression);
		const quote = text.charCodeAt(0);
		return (
			(quote === 34 || quote === 39) &&
			text.length > 1 &&
			text.charCodeAt(text.length - 1) === quote
		);
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
			printNode(
				expression,
				typeOf(expression) === NodeType.SequenceExpression ||
					printsUnreadSequence(expression)
			);
			return;
		}
		if (droppedConsole !== null && callsDroppedConsole(expression)) {
			skipNode(expression);
			output.semicolon();
			return;
		}
		if (directive !== null) {
			const value = /** @type {string} */ (tree.value(expression));
			if (directive !== value) {
				const quote = quoteOf(expression);
				const spelled = output.option("inlineScript")
					? inlineScriptSpelling(directive)
					: directive;
				output.print(`${quote}${spelled}${quote}`);
			} else {
				output.printString(value, quoteOf(expression));
			}
		} else {
			if (negatesCall(node)) output.print("!");
			// One folding to a string where directives may be would read as one:
			// in a list an empty statement goes first, as before a string written so.
			const asString = compresses && printsAsString(node, expression);
			const parentType = typeOf(parentAt(0));
			const inList =
				LISTS_STATEMENTS[parentType] === 1 || FUNCTION_TYPES[parentType] === 1;
			if (asString && inList) output.print(";");
			printNode(expression, asString && !inList);
			// Printing nothing, it is no statement where a list holds it.
			if (output.text === "" && inList) return;
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
		// A block scoping no name prints its statements in the list holding it.
		if (
			compresses &&
			(LISTS_STATEMENTS[typeOf(parent)] === 1 ||
				(FUNCTION_TYPES[typeOf(parent)] === 1 &&
					childOf(Field.body, parent) !== node)) &&
			!scopesLexically(node) &&
			!opensWithString(node) &&
			(tree.fieldCount(Field.body, node) !== 0 || !holdsComments(node)) &&
			// A block that is its braceless parent's one statement prints as one.
			!(
				typeOf(parent) === NodeType.BlockStatement &&
				unwrappedStatement(parent, parentAt(1)) === node
			)
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
		let statement = compresses ? unwrappedStatement(node, parent) : 0;
		// An `else` after the statement ending the block would take an `if` it ends in.
		if (statement !== 0 && endsInOpenIf(statement) && endsBeforeElse()) {
			statement = 0;
		}
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
		if (compresses && joinsBody(node, parent)) {
			// terser's `sequences` of a body: `a(),b()` needs no braces.
			const count = tree.fieldCount(Field.body, node);
			let printed = false;
			for (let i = 0; i < count; i++) {
				const item = tree.field(i, Field.body, node);
				if (printedNothing(item)) {
					/** @type {JavascriptPrintContext} */ (writer).consume(item);
					continue;
				}
				if (printed) {
					output.mightNeedSemicolon = false;
					output.print(",");
				}
				printNode(item);
				printed = true;
			}
			return;
		}
		if (compresses && bracesNothing(node, parent)) {
			// terser's empty block as a body: `;` is shorter than `{}`.
			const count = tree.fieldCount(Field.body, node);
			for (let i = 0; i < count; i++) {
				/** @type {JavascriptPrintContext} */ (writer).consume(
					tree.field(i, Field.body, node)
				);
			}
			output.forceSemicolon();
			return;
		}
		if (
			typeOf(parent) === NodeType.TryStatement &&
			tree.field(0, Field.finalizer, parent) === node
		) {
			output.print("finally");
			output.space();
		}
		listedStatements = 0;
		printBraced(node, node);
		// A loop's or an `if`'s body printing as one statement, as an `if(!t){`
		// closing with it or a statement joined into a `return` may, takes no braces.
		if (
			compresses &&
			listedStatements === 1 &&
			((LOOP_TYPES[typeOf(parent)] === 1 &&
				typeOf(parent) !== NodeType.DoWhileStatement &&
				tree.field(0, Field.body, parent) === node) ||
				typeOf(parent) === NodeType.IfStatement ||
				// One a block holding only it prints as stands where that block does.
				(typeOf(parent) === NodeType.BlockStatement &&
					HOLDS_BODY[typeOf(parentAt(1))] === 1 &&
					typeOf(parentAt(1)) !== NodeType.DoWhileStatement &&
					unwrappedStatement(parent, parentAt(1)) === node)) &&
			!scopesLexically(node) &&
			!holdsComments(node) &&
			// No `else` after it would take an `if` it ends in: only an `if`, a loop,
			// `with` or a label may end in one.
			(!endsBeforeElse() ||
				!/^\{(?:(?:if|for|while|with)\b|[^\s!-/:-@[-^`{-~]+:)/.test(
					output.text
				)) &&
			!listsDeclaration(node)
		) {
			const { text } = output;
			const owesSemicolon = listOwesSemicolon;
			output.reset();
			printSlice(text.slice(1, -1));
			movePlacementsBack(0);
			output.mightNeedSemicolon = owesSemicolon;
		}
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
		// One `dropDebugger` drops where no list holds it prints as `;`.
		if (!dropsDebugger) output.print("debugger");
		output.semicolon();
	};
	generators[NodeType.LabeledStatement] = (node) => {
		const body = tree.field(0, Field.body, node);
		if (
			compresses &&
			!jumpedLabels.has(node) &&
			typeOf(body) !== NodeType.EmptyStatement &&
			typeOf(body) !== NodeType.FunctionDeclaration &&
			// A string bare where a body opens would read as a directive.
			!isStringStatement(body) &&
			// A block listing nothing would print as an empty statement bare.
			!(typeOf(body) === NodeType.BlockStatement && listsNothing(body)) &&
			!hasEdgeComments(node)
		) {
			// No `break` or `continue` names it.
			skipNode(tree.field(0, Field.label, node));
			printNode(body);
			return;
		}
		printNode(tree.field(0, Field.label, node));
		output.colon();
		if (typeOf(body) === NodeType.EmptyStatement) output.forceSemicolon();
		else printNode(body);
	};
	generators[NodeType.DoWhileStatement] = (node) => {
		const test = childOf(Field.test, node);
		const body = tree.field(0, Field.body, node);
		const value =
			compresses && dropsDeadCode && !holdsComments(node)
				? evaluateConstant(test)
				: undefined;
		if (
			compresses &&
			dropsDeadCode &&
			!beautifies &&
			!holdsComments(node) &&
			typeOf(parentAt(0)) !== NodeType.LabeledStatement &&
			endsInOnlyBreak(body)
		) {
			// terser's `dead_code`: a body leaving at its end runs once, its
			// test never.
			skipNode(test);
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(body);
			const end = text.endsWith(";break}") ? 7 : 6;
			if (printsInList(node) && !scopesLexically(body)) {
				if (text.length > end + 1) {
					printSlice(text.slice(1, -end));
					output.mightNeedSemicolon = end === 7;
				}
			} else if (text.length > end + 1) {
				printSlice(`${text.slice(0, -end)}}`);
			} else {
				output.forceSemicolon();
			}
			return;
		}
		if (value !== undefined && !value && isPureTest(test)) {
			// terser's `loops`: a body running once, nothing leaving it early,
			// runs where the loop was.
			if (
				typeOf(parentAt(0)) !== NodeType.LabeledStatement &&
				!findNode(body, findLoopExit) &&
				// Unwrapped, an `if` it ends in would take the `else` after the loop.
				!(typeOf(body) !== NodeType.BlockStatement && endsInOpenIf(body))
			) {
				skipNode(test);
				const parentType = typeOf(parentAt(0));
				if (
					(LISTS_STATEMENTS[parentType] === 1 ||
						FUNCTION_TYPES[parentType] === 1) &&
					(typeOf(body) === NodeType.EmptyStatement ||
						(typeOf(body) === NodeType.BlockStatement &&
							!holdsComments(body) &&
							listsNothing(body)))
				) {
					// Running nothing in a list, it prints nothing.
					skipNode(body);
				} else if (typeOf(body) === NodeType.BlockStatement) {
					printBlockInPlace(body);
				} else {
					printNode(body);
				}
				return;
			}
		} else if (value) {
			// A loop forever is `for(;;)`, a `continue` testing nothing.
			skipNode(test);
			output.print("for(;;)");
			printMaybeBracedBody(body);
			return;
		}
		output.print("do");
		output.space();
		makeBlock(tree.field(0, Field.body, node));
		output.space();
		output.print("while");
		output.space();
		printParenthesized(childOf(Field.test, node));
		output.semicolon();
	};
	/**
	 * @param {number} body a `do` loop's body
	 * @returns {boolean} whether it is a block ending in a bare `break`, nothing else in it leaving or continuing the loop
	 */
	const endsInOnlyBreak = (body) => {
		if (typeOf(body) !== NodeType.BlockStatement || holdsComments(body)) {
			return false;
		}
		let last = 0;
		for (let i = tree.fieldCount(Field.body, body) - 1; i >= 0; i--) {
			const statement = tree.field(i, Field.body, body);
			if (last === 0) {
				if (printsNothing(statement)) continue;
				if (!isBareBreak(statement)) return false;
				last = statement;
			} else if (findNode(statement, findLoopExit)) {
				return false;
			}
		}
		if (last === 0) return false;
		const text = /** @type {JavascriptPrintContext} */ (writer).get(body);
		return text.endsWith("break}") && text.charCodeAt(0) === 123;
	};

	/**
	 * @param {number} node a `for` or `while`
	 * @returns {boolean} whether its body is an unlabeled `break`, alone or in a block
	 */
	const breaksAtOnce = (node) => {
		let body = tree.field(0, Field.body, node);
		if (
			typeOf(body) === NodeType.BlockStatement &&
			tree.fieldCount(Field.body, body) === 1
		) {
			body = tree.field(0, Field.body, body);
		}
		return isBareBreak(body);
	};

	/**
	 * terser's `dead_code` of a loop whose body is a `break`: it runs what sets
	 * it up and its test once.
	 * @param {number} node a `for` or `while`, being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsBrokenLoop = (node) => {
		const init =
			typeOf(node) === NodeType.ForStatement ? childOf(Field.init, node) : 0;
		const test = childOf(Field.test, node);
		const body = tree.field(0, Field.body, node);
		if (
			!compresses ||
			!dropsDeadCode ||
			holdsComments(node) ||
			(init === 0 && test === 0) ||
			typeOf(init) === NodeType.VariableDeclaration ||
			!isBareBreak(unwrappedBranch(body, node)) ||
			typeOf(parentAt(0)) === NodeType.LabeledStatement
		) {
			return false;
		}
		skipNode(body);
		const update =
			typeOf(node) === NodeType.ForStatement ? childOf(Field.update, node) : 0;
		if (update !== 0) skipNode(update);
		const first = init !== 0 ? init : test;
		printNode(first, opensAmbiguously(first));
		if (init !== 0 && test !== 0) {
			output.comma();
			printNode(test);
		}
		output.semicolon();
		return true;
	};
	generators[NodeType.WhileStatement] = (node) => {
		if (printsBrokenLoop(node)) return;
		const test = childOf(Field.test, node);
		const exit = breakTests.size === 0 ? undefined : breakTests.get(node);
		if (exit !== undefined) {
			const always = !hasEdgeComments(test) && evaluateConstant(test);
			if (always) skipNode(test);
			output.print("while(");
			printBreakTest(always ? 0 : test, exit);
			output.print(")");
			printLoopBody(node, exit);
			return;
		}
		if (compresses && !hasEdgeComments(test) && evaluateConstant(test)) {
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
		if (printsBrokenLoop(node)) return;
		const init = childOf(Field.init, node);
		const test = childOf(Field.test, node);
		const update = childOf(Field.update, node);
		output.print("for");
		output.space();
		output.print("(");
		if (
			init !== 0 &&
			compresses &&
			dropsSideEffectFree &&
			typeOf(init) !== NodeType.VariableDeclaration &&
			!hasEdgeComments(init) &&
			valueRunsNothing(init)
		) {
			// A start running nothing goes.
			skipNode(init);
			output.print(";");
		} else if (init !== 0) {
			printNode(init);
			output.print(";");
			output.space();
		} else {
			output.print(";");
		}
		const always =
			test !== 0 &&
			compresses &&
			!hasEdgeComments(test) &&
			evaluateConstant(test);
		// terser's `loops`: a test always true goes.
		if (always) skipNode(test);
		const exit = breakTests.size === 0 ? undefined : breakTests.get(node);
		if (exit !== undefined) {
			printBreakTest(always ? 0 : test, exit);
			output.print(";");
			output.space();
		} else if (test !== 0 && !always) {
			printNode(test);
			output.print(";");
			output.space();
		} else {
			output.print(";");
		}
		if (update !== 0) printNode(update);
		output.print(")");
		output.space();
		printLoopBody(node, exit);
	};
	/**
	 * Prints a loop's body, where the `if` `breakTests` joined to its test opens
	 * it, without that.
	 * @param {number} node the loop
	 * @param {number | undefined} exit the `if`, undefined for none
	 * @returns {void}
	 */
	const printLoopBody = (node, exit) => {
		const body = tree.field(0, Field.body, node);
		if (body === exit && !breakElses.has(exit)) {
			skipNode(body);
			output.forceSemicolon();
		} else {
			printMaybeBracedBody(body);
		}
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
		if (voidTails.size !== 0 && voidTails.has(node)) {
			// Printed as a statement, what opens it may not read as a declaration.
			const argument = childOf(Field.argument, node);
			const text = /** @type {JavascriptPrintContext} */ (writer).get(argument);
			printNode(argument, OPENS_DECLARATION.test(text));
			output.semicolon();
			return;
		}
		if (compresses && printsChainedExit(node, RETURN_FORM)) return;
		printExit(node, "return");
	};
	generators[NodeType.ThrowStatement] = (node) => {
		if (compresses && printsChainedExit(node, THROW_FORM)) return;
		printExit(node, "throw");
	};

	/**
	 * Prints the value of a `return` or `throw` ending an `if` in the form,
	 * which printed the keyword.
	 * @param {number} node the `return` or `throw`
	 * @param {number} form `RETURN_FORM` or `THROW_FORM`
	 * @returns {boolean} whether it printed so
	 */
	const printsChainedExit = (node, form) => {
		// Read after the form of the `if` holding it, which pairs an `else`.
		const branch = branchForm();
		const pair = returnedBy.size === 0 ? undefined : returnedBy.get(node);
		if (!((pair !== undefined && ifForm(pair) === form) || branch === form)) {
			return false;
		}
		const argument = childOf(Field.argument, node);
		// An `if` folding its booleans printed the value.
		if (pair !== undefined && foldedReturn(pair) === node) {
			skipNode(argument);
		} else {
			printNode(argument, typeOf(argument) === NodeType.SequenceExpression);
		}
		const swapped =
			swappedReturns.size === 0 ? undefined : swappedReturns.get(node);
		if (swapped !== undefined) {
			output.space();
			output.colon();
			printNode(swapped);
		}
		// The `return` after the `if` ends the statement.
		if (pair !== undefined && !inReturnsChain(-1)) output.semicolon();
		return true;
	};
	generators[NodeType.BreakStatement] = (node) => {
		printLoopControl(node, "break");
	};
	generators[NodeType.ContinueStatement] = (node) => {
		printLoopControl(node, "continue");
	};
	generators[NodeType.IfStatement] = (node) => {
		if (breakIfs.size !== 0 && breakIfs.has(node)) {
			const rest = breakElses.get(node);
			if (rest === undefined) return;
			// The branch other than the `break` runs where the `if` was.
			if (typeOf(rest) === NodeType.BlockStatement) printBlockInPlace(rest);
			else printNode(rest);
			return;
		}
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
			const hoisted = hoistedFromDropped.get(node);
			if (hoisted === undefined) {
				// Every name the branch declared going unused, nothing is left.
				if (kept === 0) output.print(";");
				else printMaybeBracedBody(kept);
				return;
			}
			// Where the `if` is a body, a block holds both.
			const braces = kept !== 0 && !printsInList(node);
			if (braces) output.print("{");
			if (kept !== 0) {
				printMaybeBracedBody(kept);
				output.semicolon();
			}
			output.print("var ");
			for (let i = 0; i < hoisted.length; i++) {
				if (i > 0) output.comma();
				output.printName(nameOf(hoisted[i]));
			}
			if (braces) output.print("}");
			else output.semicolon();
			return;
		}
		if (compresses && runsOnlyTest(node)) {
			// terser's `if(t);` as `t;`.
			const test = childOf(Field.test, node);
			printNode(test, opensAmbiguously(test));
			/** @type {JavascriptPrintContext} */ (writer).consume(
				tree.field(0, Field.consequent, node)
			);
			output.semicolon();
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
		const elseRest = exitElses.size === 0 ? undefined : exitElses.get(node);
		if (elseRest !== undefined) {
			// The statement after it prints next in its list, as this `else`.
			output.print("if");
			output.space();
			printParenthesized(childOf(Field.test, node));
			output.space();
			makeThen(node);
			output.space();
			output.print("else");
			return;
		}
		const rest = compresses ? guardedRest(node) : 0;
		if (rest !== 0) {
			// terser's `if_return`: `if(t)return;x` ending a function is `if(!t)x`,
			// and `if(!t)if(u)x` is `if(!t&&u)x`.
			const test = childOf(Field.test, node);
			const ands = andsTest(rest);
			output.print("if(");
			// What `!` negates keeps the parentheses it took there where `&&` needs them.
			const keepsParentheses =
				ands &&
				isNegation(test) &&
				!joinsLogical(childOf(Field.argument, test), "&&", false);
			if (!printsNegatedTest(test, keepsParentheses)) printNegatedAs(test, "!");
			if (ands) andedIfs.add(rest);
			else output.print(")");
			skipNode(tree.field(0, Field.consequent, node));
			return;
		}
		if (compresses && !beautifies && guardsBlock(node)) {
			// terser's `if_return`: `if(t)return;x;y` ending a function is `if(!t){x;y}`.
			const test = childOf(Field.test, node);
			output.print("if(");
			if (!printsNegatedTest(test)) printNegatedAs(test, "!");
			output.print("){");
			skipNode(tree.field(0, Field.consequent, node));
			guardedBlocks.add(node);
			return;
		}
		const alternate = elseOf(node);
		if (andedIfs.size !== 0 && andedIfs.has(node)) {
			// The `if` before it printed `if(!t` for this one's test to continue.
			const test = childOf(Field.test, node);
			output.print("&&");
			printNode(test, !joinsLogical(shownAs(test), "&&", false));
			printAndedBody(node);
			return;
		}
		if (compresses && printsElseOnly(node)) {
			// `if(t);else x` is `if(!t)x`.
			const test = childOf(Field.test, node);
			output.print("if(");
			if (!printsNegatedTest(test)) printNegatedAs(test, "!");
			output.print(")");
			skipNode(tree.field(0, Field.consequent, node));
			printMaybeBracedBody(alternate);
			return;
		}
		if (compresses) {
			const parent = parentAt(0);
			const holder =
				typeOf(parent) === NodeType.BlockStatement ? parentAt(1) : parent;
			if (andsIntoHolder(node, parent, holder)) {
				// The `if` holding it printed `if(t` for this one's test to continue.
				const test = childOf(Field.test, node);
				output.print("&&");
				printNode(test, !joinsLogical(shownAs(test), "&&", false));
				printAndedBody(node);
				return;
			}
			if (alternate === 0 && andedInner(node) !== 0) {
				// terser's `if(t)if(u)x` as `if(t&&u)x`.
				const test = childOf(Field.test, node);
				output.print("if(");
				printNode(test, !joinsLogical(shownAs(test), "&&", false));
				printNode(tree.field(0, Field.consequent, node));
				return;
			}
		}
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
		const kept =
			foldedSwitches.size === 0 ? undefined : foldedSwitches.get(node);
		if (kept !== undefined) {
			printFoldedSwitch(node, kept);
			return;
		}
		const item = printedSwitchAsIf(node, parentAt(0));
		if (item !== 0) {
			printSwitchAsIf(node, item);
			return;
		}
		// terser's `switches`: cases ending it that run nothing go, and with
		// none left, the `switch` runs only what it tests.
		const printed =
			compresses && dropsDeadCode && !hasEdgeComments(node)
				? printedCases(node)
				: count;
		if (
			printed === 0 &&
			compresses &&
			dropsDeadCode &&
			!hasEdgeComments(node)
		) {
			for (let i = 0; i < count; i++) {
				/** @type {JavascriptPrintContext} */ (writer).consume(
					tree.field(i, Field.cases, node)
				);
			}
			const discriminant = childOf(Field.discriminant, node);
			printNode(discriminant, opensAmbiguously(discriminant));
			output.semicolon();
			return;
		}
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
			if (
				i >= printed ||
				(i === count - 1 && i > 0 && compresses && doesNothing(item))
			) {
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
		// A folded `switch` prints the statements its cases hold itself.
		if (foldedSwitches.size !== 0 && foldedSwitches.has(parentAt(0))) return;
		if (printedSwitchAsIf(parentAt(0), parentAt(1)) !== 0) return;
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
			if (
				(i === last && isPlainBreak(statement)) ||
				(compresses && printsNothing(statement))
			) {
				/** @type {JavascriptPrintContext} */ (writer).consume(statement);
			} else {
				if (beautifies) output.print("\n");
				printNode(statement);
			}
		}
	};
	/**
	 * @param {number} node a statement being printed
	 * @returns {boolean} whether it prints among the statements of a list, not as the one statement a block holding it unwraps to
	 */
	const printsInList = (node) => {
		const parent = parentAt(0);
		const type = typeOf(parent);
		if (FUNCTION_TYPES[type] === 1) return true;
		return (
			LISTS_STATEMENTS[type] === 1 &&
			!(
				type === NodeType.BlockStatement &&
				unwrappedStatement(parent, parentAt(1)) === node
			)
		);
	};

	/**
	 * Prints a block a `try` runs as where the `try` was, its braces dropped
	 * in a list where it scopes no name.
	 * @param {number} block the `try`'s block or `finally`
	 * @returns {void}
	 */
	const printBlockInPlace = (block) => {
		const text = /** @type {JavascriptPrintContext} */ (writer).consume(block);
		// A `finally` prints after the keyword; an `if`'s body may print unbraced.
		const start = text.startsWith("finally") ? text.indexOf("{") : 0;
		const braced = text.slice(start);
		if (!braced.startsWith("{")) {
			printSlice(braced);
			output.mightNeedSemicolon = true;
		} else if (
			!beautifies &&
			printsInList(current) &&
			!scopesLexically(block)
		) {
			printSlice(braced.slice(1, -1));
			// Its last statement ended where the brace was.
			output.mightNeedSemicolon = true;
		} else {
			printSlice(braced);
		}
	};
	generators[NodeType.TryStatement] = (node) => {
		if (emptyTries.size !== 0 && emptyTries.has(node)) {
			const context = /** @type {JavascriptPrintContext} */ (writer);
			context.consume(tree.field(0, Field.block, node));
			const handler = tree.field(0, Field.handler, node);
			if (handler !== 0) context.consume(handler);
			printBlockInPlace(tree.field(0, Field.finalizer, node));
			return;
		}
		const finalizer = tree.field(0, Field.finalizer, node);
		const handler = tree.field(0, Field.handler, node);
		const emptyFinally =
			finalizer !== 0 &&
			dropsDeadCode &&
			!holdsComments(finalizer) &&
			listsNothing(finalizer);
		if (emptyFinally && handler === 0 && !hasEdgeComments(node)) {
			// A `try` whose `finally` runs nothing runs as its block.
			skipNode(finalizer);
			printBlockInPlace(tree.field(0, Field.block, node));
			return;
		}
		output.print("try");
		output.space();
		printNode(tree.field(0, Field.block, node));
		if (handler !== 0) {
			output.space();
			printNode(handler);
		}
		if (finalizer === 0) return;
		if (emptyFinally) {
			// Beside a `catch`, it goes.
			skipNode(finalizer);
			return;
		}
		output.space();
		printNode(finalizer);
	};
	generators[NodeType.CatchClause] = (node) => {
		output.print("catch");
		const param = tree.field(0, Field.param, node);
		// ES2019's optional binding: a name nothing reads or writes goes.
		if (
			param !== 0 &&
			compresses &&
			output.option("ecma") >= 2019 &&
			!hasEdgeComments(param) &&
			isUnusedBinding(param)
		) {
			skipNode(param);
		} else if (param !== 0) {
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
		if (deadInits.size !== 0 && deadInits.has(node)) {
			skipNode(init);
			return;
		}
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
		if (compresses && !deleted && globalDefs !== null) {
			const value = globalDefOf(node);
			const parent = parentAt(0);
			if (
				value !== undefined &&
				// A shorthand's value prints after its key where it is defined.
				(readsAsValue(node, parent) ||
					(typeOf(parent) === NodeType.Property &&
						typeOf(parentAt(1)) === NodeType.ObjectExpression))
			) {
				printGlobalDef(node, value);
				return;
			}
		}
		if (compresses && !deleted && readsUndefined(node)) {
			// `void 0` is shorter, and no scope can rebind it.
			output.print("void 0");
			return;
		}
		if (
			compresses &&
			!keepsGlobalNames &&
			typeOf(parentAt(0)) === NodeType.MemberExpression &&
			childOf(Field.object, parentAt(0)) === node &&
			isGlobalUndefined(node)
		) {
			// Read off, it takes parentheses and is shorter still.
			output.print("(void 0)");
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
		output.printName(nameOf(node));
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
		if (typeof value === "boolean" && compresses) {
			if (takesUnary(node)) {
				// terser's `booleans`: `!0` and `!1` are shorter and gzip alike, and
				// where only its truth is read, `1` and `0` shorter still.
				output.print(
					readsTruth(node) ? (value ? "1" : "0") : value ? "!0" : "!1"
				);
				return;
			}
			// In parentheses, shorter than `false` read off and than `new` and a space.
			const parent = parentAt(0);
			const type = typeOf(parent);
			if (
				(type === NodeType.MemberExpression &&
					!value &&
					childOf(Field.object, parent) === node) ||
				(type === NodeType.NewExpression &&
					childOf(Field.callee, parent) === node)
			) {
				output.print(value ? "(!0)" : "(!1)");
				return;
			}
		}
		if (typeof value === "string") {
			const template =
				rawLineBreaks && value.includes("\n") && takesTemplate(node)
					? lineBreakTemplate(output, value, writesTabsRaw(value))
					: undefined;
			if (template !== undefined) {
				output.print(template);
			} else if (inDirective(node)) {
				const encoded = output.encodeString(value, quoteOf(node));
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
				output.printString(value, quoteOf(node));
			}
			return;
		}
		const raw = tree.textOf(Part.raw, node);
		if (typeof value === "number") {
			output.print(
				(output.option("keepNumbers") || usesAsm(node)) && raw
					? raw
					: makeNum(value)
			);
			output.literalLast = true;
		} else if (typeof value === "bigint") {
			const digits = /** @type {string} */ (raw).slice(0, -1).replace(/_/g, "");
			output.print(output.option("keepNumbers") && raw ? raw : `${digits}n`);
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
		const tables = output.tokenTables;
		const table = tables.last;
		for (let token = from; token !== 0 && token <= to; token++) {
			const list = tables.commentsOf(token, false);
			if (list === undefined) continue;
			for (const comment of /** @type {TokenTable} */ (table).members(list)) {
				if (
					!output.commentFilter(
						statement,
						/** @type {TokenTable} */ (table),
						comment
					)
				) {
					continue;
				}
				const value = output.filterComment(
					/** @type {TokenTable} */ (table).commentValue(comment)
				);
				if (value === "") continue;
				const kind = /** @type {TokenTable} */ (table).commentKind(comment);
				if (kind === 1 || kind === 3 || kind === 4) printed = `//${value}`;
				else if (kind === 2) printed = `/*${value}*/`;
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
		if (compresses && printsAsElements(node)) {
			printElements(node, Field.elements);
			return;
		}
		if (spreadsFolded(node, parent)) return;
		if (printsUnreadParts(node, Field.elements)) return;
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
		if (compresses && count >= SPLIT_MIN_ELEMENTS && printsSplit(node, count)) {
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
		if (spreadsFolded(node, parentAt(0))) return;
		if (printsUnreadParts(node, Field.properties)) return;
		if (printsPickedValue(node, 0)) {
			const value = pickedElement(parentAt(0), 1);
			const context = /** @type {JavascriptPrintContext} */ (writer);
			for (let i = 0; i < count; i++) {
				const item = tree.field(i, Field.properties, node);
				context.consume(tree.field(0, Field.key, item));
				// Parentheses around a value hold no text of their own.
				const own = childOf(Field.value, item);
				if (own === value) printNode(own);
				else context.consume(own);
				context.consume(item);
			}
			return;
		}
		if (count === 0) {
			printBracedEmpty(node);
			return;
		}
		output.print("{");
		let printed = 0;
		for (let i = 0; i < count; i++) {
			const property = tree.field(i, Field.properties, node);
			if (spreadsAs(property, node) !== 0) {
				printed = printSpread(property, printed);
				continue;
			}
			if (printed++ !== 0) output.comma();
			printNode(property);
		}
		output.print("}");
	};
	generators[NodeType.Property] = (node) => {
		// An object nobody reads, or one a member reads a value off, prints
		// its values itself.
		if (
			compresses &&
			typeOf(parentAt(0)) === NodeType.ObjectExpression &&
			(unreadPartsOf(parentAt(0), parentAt(1), 1) !== null ||
				printsPickedValue(parentAt(0), 1))
		) {
			return;
		}
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
				output.printName("__proto__");
			} else {
				output.withSquare(() => output.printString("__proto__"));
				output.colon();
				printNode(value);
			}
			return;
		}
		if (!asShorthand) {
			printKeyValue(node);
			return;
		}
		output.printName("__proto__");
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
			output.printName(privateNameOf(key));
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
		// What holds a folded spread prints what it spreads itself.
		if (spreadsAs(node, parentAt(0)) !== 0) return;
		output.print("...");
		printNode(childOf(Field.argument, node));
	};
	generators[NodeType.AssignmentPattern] = printBinary;
	/**
	 * @param {number} target a member an assignment sets
	 * @param {number} read the left side of its value
	 * @returns {boolean} whether the read is that member of `this` or of a declared name no `with` reaches, by a name or private name
	 */
	const readsSameMember = (target, read) => {
		if (
			typeOf(read) !== NodeType.MemberExpression ||
			tree.flag(Flag.computed, target) ||
			tree.flag(Flag.computed, read) ||
			tree.flag(Flag.optional, read) ||
			hasEdgeComments(read)
		) {
			return false;
		}
		const property = childOf(Field.property, target);
		const readProperty = childOf(Field.property, read);
		if (
			typeOf(property) !== typeOf(readProperty) ||
			tree.name(property) !== tree.name(readProperty)
		) {
			return false;
		}
		const object = childOf(Field.object, target);
		const readObject = childOf(Field.object, read);
		if (typeOf(object) === NodeType.ThisExpression) {
			return typeOf(readObject) === NodeType.ThisExpression;
		}
		// A name collapsed into the target is read first, never this one.
		if (
			typeOf(object) !== NodeType.Identifier ||
			typeOf(readObject) !== NodeType.Identifier ||
			mangledNames === null
		) {
			return false;
		}
		const definition = mangledNames[object];
		return (
			isMinifierVariable(definition) &&
			!definition.undeclared &&
			mangledNames[readObject] === definition &&
			!(/** @type {MinifierScope} */ (definition.scope).isPinned())
		);
	};

	/**
	 * terser's `assignments`: `x=x+y` prints as `x+=y`, where the value's
	 * left operand reads the name the assignment sets and prints as it.
	 * @param {number} node an assignment
	 * @returns {boolean} whether it printed so
	 */
	const printsCompound = (node) => {
		if (
			!compresses ||
			mangledNames === null ||
			tree.textOf(Part.operator, node) !== "="
		) {
			return false;
		}
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		if (
			typeOf(right) !== NodeType.BinaryExpression ||
			COMPOUND_OPERATORS[
				/** @type {string} */ (tree.textOf(Part.operator, right))
			] !== 1 ||
			hasEdgeComments(right)
		) {
			return false;
		}
		const read = childOf(Field.left, right);
		if (typeOf(left) === NodeType.MemberExpression) {
			if (!readsSameMember(left, read)) return false;
		} else if (typeOf(left) !== NodeType.Identifier) {
			return false;
		}
		const definition = mangledNames[left];
		if (typeOf(left) === NodeType.MemberExpression) {
			// The object read once where it was read twice runs nothing either way.
		} else if (
			typeOf(read) !== NodeType.Identifier ||
			hasEdgeComments(read) ||
			(collapsed.size !== 0 && collapsed.has(read)) ||
			!isMinifierVariable(definition) ||
			mangledNames[read] !== definition ||
			/** @type {MinifierScope} */ (definition.scope).isPinned() ||
			// asm.js reads `x=x|0` as a type.
			usesAsm(node)
		) {
			return false;
		}
		const context = /** @type {JavascriptPrintContext} */ (writer);
		// The value prints that name, which no fold rewrites, then the operator.
		const prefix = context.get(left) + tree.textOf(Part.operator, right);
		const text = context.get(right);
		printNode(left);
		context.consume(right);
		output.print(`${tree.textOf(Part.operator, right)}=`);
		// No token merges across the `=`, which `x- -y` spaced from.
		let value = text.slice(
			text.charCodeAt(prefix.length) === 32 ? prefix.length + 1 : prefix.length
		);
		// The parentheses only the operator needed go: `x-=a-b`.
		const operand = childOf(Field.right, right);
		if (
			(endState[operand] & OPENS_PARENTHESIZED) !== 0 &&
			value.charCodeAt(0) === 40 &&
			value.charCodeAt(value.length - 1) === 41 &&
			wrapsAsRightOperand(operand, right)
		) {
			value = value.slice(1, -1);
		}
		printSlice(value);
		return true;
	};

	/**
	 * @param {number} operand the right operand of a binary expression
	 * @param {number} binary the binary expression
	 * @returns {boolean} whether the binary parenthesizes it where an assignment's value would not: a looser or equal operation, a conditional, an assignment, an arrow or a `yield`
	 */
	const wrapsAsRightOperand = (operand, binary) => {
		if (hasEdgeComments(operand)) return false;
		switch (typeOf(operand)) {
			case NodeType.BinaryExpression:
			case NodeType.LogicalExpression:
				return (
					PRECEDENCE[operatorOf(operand)] <= PRECEDENCE[operatorOf(binary)]
				);
			case NodeType.ConditionalExpression:
			case NodeType.AssignmentExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.YieldExpression:
				return true;
			default:
				return false;
		}
	};

	generators[NodeType.AssignmentExpression] = (node) => {
		const holder = compresses
			? hoistingHolder(
					typeOf(parentAt(0)) === NodeType.ExpressionStatement ? 0 : -1
				)
			: 0;
		// Only the assignment the chain hoists: one collapsed into the branch
		// before it assigns another name.
		const hoisted = holder === 0 ? null : hoistOf(holder);
		const own = hoisted === null ? null : assignedBy(node);
		if (
			hoisted !== null &&
			own !== null &&
			own[0] === hoisted[0] &&
			own[1] === hoisted[1]
		) {
			// The chain it ends a branch of assigns, once, before its test.
			skipNode(childOf(Field.left, node));
			printNode(childOf(Field.right, node));
			return;
		}
		if (dropsWrite[node] !== 1) {
			if (!printsCompound(node)) printBinary(node);
			return;
		}
		// Nothing reads the name it sets: only its value runs.
		const value = childOf(Field.right, node);
		skipNode(childOf(Field.left, node));
		printNode(value, opensAmbiguously(value));
	};
	/**
	 * Read for its truth, `x&&!0` and `x||!1` are `x`.
	 * @param {number} node a logical expression being printed
	 * @returns {number} the left side it prints as, 0 where it prints otherwise
	 */
	const truthOperand = (node) => {
		if (!dropsDeadCode) return 0;
		const right = childOf(Field.right, node);
		const operator = tree.textOf(Part.operator, node);
		// Left of the same operator, `(x&&t)&&y` reads `x` alike: its value where
		// it decides, else past it to `y`.
		const parent = parentAt(0);
		if (
			!readsTruth(node) &&
			!(
				typeOf(parent) === NodeType.LogicalExpression &&
				childOf(Field.left, parent) === node &&
				tree.textOf(Part.operator, parent) === operator
			)
		) {
			return 0;
		}
		return operator !== "??" &&
			isPureValue(right) &&
			knownTruth(right) === (operator === "&&") &&
			!holdsComments(right)
			? childOf(Field.left, node)
			: 0;
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean | undefined} its truth where that is known whatever it runs: a constant, a fresh object, a `typeof`, `void`, or a logical expression or sequence such parts decide
	 */
	const knownTruth = (node) => {
		if (hasEdgeComments(node)) return undefined;
		switch (typeOf(node)) {
			case NodeType.ObjectExpression:
			case NodeType.ArrayExpression:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.ClassExpression:
				return true;
			case NodeType.Literal: {
				const raw = tree.textOf(Part.raw, node);
				// A regular expression is an object.
				if (raw !== null && raw.charCodeAt(0) === 47) return true;
				break;
			}
			case NodeType.UnaryExpression: {
				const operator = tree.textOf(Part.operator, node);
				// Its string names a type, never empty.
				if (operator === "typeof") return true;
				if (operator === "void") return false;
				if (operator === "!") {
					const inner = knownTruth(childOf(Field.argument, node));
					return inner === undefined ? undefined : !inner;
				}
				break;
			}
			case NodeType.LogicalExpression: {
				const operator = tree.textOf(Part.operator, node);
				if (operator === "??") break;
				const left = knownTruth(childOf(Field.left, node));
				const right = knownTruth(childOf(Field.right, node));
				// `x||t` is truthy and `x&&f` falsy, `t||x` and `f&&x` too.
				const decides = operator === "||";
				if (left === decides || right === decides) return decides;
				if (left === !decides && right === !decides) return !decides;
				return undefined;
			}
			case NodeType.SequenceExpression:
				return knownTruth(
					itemOf(
						tree.fieldCount(Field.expressions, node) - 1,
						Field.expressions,
						node
					)
				);
			case NodeType.AssignmentExpression:
				return tree.textOf(Part.operator, node) === "="
					? knownTruth(childOf(Field.right, node))
					: undefined;
		}
		if (isUndefinedValue(node)) return false;
		const value = evaluateConstant(node);
		return value === undefined ? undefined : Boolean(value);
	};

	/**
	 * terser's `dead_code` of a conditional whose test's truth is known though
	 * it runs something: `x()&&0?a:b` is `x()&&0,b`.
	 * @param {number} node the conditional, being printed
	 * @param {number} test its test
	 * @returns {boolean} whether it printed so
	 */
	const printsKnownTest = (node, test) => {
		if (!dropsDeadCode || hasEdgeComments(node) || isPureValue(test)) {
			return false;
		}
		const truth = knownTruth(test);
		if (truth === undefined) return false;
		const consequent = childOf(Field.consequent, node);
		const alternate = childOf(Field.alternate, node);
		const [kept, gone] = truth ? [consequent, alternate] : [alternate, consequent];
		if (holdsComments(gone)) return false;
		skipNode(gone);
		const wrap =
			!takesSequence(node, parentAt(0)) &&
			!needsParens(node, 0) &&
			typeOf(parentAt(0)) !== NodeType.TaggedTemplateExpression;
		if (wrap) output.print("(");
		const text = /** @type {JavascriptPrintContext} */ (writer).consume(test);
		printSlice(
			!holdsComments(test) &&
				(endState[test] & OPENS_PARENTHESIZED) !== 0 &&
				!(!wrap && opensAmbiguously(test) && firstInStatement(node, 0, true))
				? text.slice(1, -1)
				: text
		);
		output.comma();
		printNode(kept);
		if (wrap) output.print(")");
		return true;
	};

	/**
	 * terser's `&&` and `||` of a left side whose truth is known though it runs
	 * something: `x()||!0` is truthy, so `(x()||!0)&&y` is `x()||!0,y`.
	 * @param {number} node a logical expression, being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsKnownLeft = (node) => {
		const operator = tree.textOf(Part.operator, node);
		if (!dropsDeadCode || operator === "??" || hasEdgeComments(node)) {
			return false;
		}
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		const truth = knownTruth(left);
		if (truth === undefined || holdsComments(right)) return false;
		if (truth === (operator === "||")) {
			// The left side decides, its value the operation's.
			skipNode(right);
			printNode(left);
			return true;
		}
		// The right side decides; the left runs first, where it runs anything.
		if (isPureValue(left)) {
			skipNode(left);
			printNode(right);
			return true;
		}
		const wrap =
			!takesSequence(node, parentAt(0)) &&
			!needsParens(node, 0) &&
			typeOf(parentAt(0)) !== NodeType.TaggedTemplateExpression;
		if (wrap) output.print("(");
		const text = /** @type {JavascriptPrintContext} */ (writer).consume(left);
		// An item of the sequence, it needs no parentheses `&&` or `||` gave it.
		printSlice(
			!holdsComments(left) &&
				(endState[left] & OPENS_PARENTHESIZED) !== 0 &&
				!(!wrap && opensAmbiguously(left) && firstInStatement(node, 0, true))
				? text.slice(1, -1)
				: text
		);
		output.comma();
		printNode(right);
		if (wrap) output.print(")");
		return true;
	};
	/**
	 * Nobody reading it, `x==null&&y` and `x!=null||y` run `y` as `x??y` does.
	 * @param {number} node a logical expression being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsUnreadNullish = (node) => {
		const operator = tree.textOf(Part.operator, node);
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		if (
			!compresses ||
			output.option("ecma") < 2020 ||
			(operator !== "&&" && operator !== "||") ||
			typeOf(left) !== NodeType.BinaryExpression ||
			hasEdgeComments(node) ||
			holdsComments(left) ||
			!valueUnread(node, parentAt(0))
		) {
			return false;
		}
		const type = typeOf(right);
		if (!(
			NEGATES_BARE[type] ||
			type === NodeType.NewExpression ||
			type === NodeType.AssignmentExpression ||
			// Parenthesized under `&&` or `||` as under `??`.
			type === NodeType.SequenceExpression ||
			type === NodeType.ConditionalExpression ||
			(type === NodeType.BinaryExpression && !isPrivateIn(right))
		)) {
			return false;
		}
		const text = /** @type {JavascriptPrintContext} */ (writer).get(left);
		const compared = operator === "&&" ? "==null" : "!=null";
		const reversed = operator === "&&" ? "null==" : "null!=";
		const name = text.endsWith(compared)
			? text.slice(0, -compared.length)
			: text.startsWith(reversed)
				? text.slice(reversed.length)
				: "";
		// The compared value must print as a name or member, read once either way.
		if (!BARE_NAMES.test(name)) return false;
		/** @type {JavascriptPrintContext} */ (writer).consume(left);
		printSlice(name);
		output.print("??");
		printNode(right);
		return true;
	};
	// What a statement opening with it would read as a declaration or block.
	const OPENS_DECLARATION =
		/^(?:\{|function(?![\w$])|class(?![\w$])|let(?![\w$])|async\s+function(?![\w$]))/;
	// The `null` compared with a name, and the operator comparing them.
	const NULL_COMPARED = /^null\s*[!=]=\s*|\s*[!=]=\s*null$/;
	/**
	 * `x!=null&&x.y()` runs as `x?.y()`, whose value differs only where it is
	 * `false` or `true`: nobody reading it, or only its truth for `&&`.
	 * @param {number} node a logical expression being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsOptionalChain = (node) => {
		const operator = tree.textOf(Part.operator, node);
		if (
			!compresses ||
			answersWith ||
			output.option("ecma") < 2020 ||
			(operator !== "&&" && operator !== "||") ||
			hasEdgeComments(node) ||
			holdsComments(node) ||
			!(
				valueUnread(node, parentAt(0)) ||
				(operator === "&&" && readsTruth(node))
			)
		) {
			return false;
		}
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		const chain = optionalChainOf(left, operator === "&&" ? "!=" : "==", right);
		if (chain === null) return false;
		const context = /** @type {JavascriptPrintContext} */ (writer);
		context.consume(left);
		context.consume(right);
		printSlice(chain);
		return true;
	};

	/**
	 * @param {number} test what compares a name with `null`
	 * @param {string} operator `!=` or `==`, which it must compare with
	 * @param {number} chain a member or call, printed
	 * @returns {string | null} the chain printed with `?.` after the name, where it reads its first member or call of that name, null otherwise
	 */
	const optionalChainOf = (test, operator, chain) => {
		const name = nullComparedName(test, operator);
		if (name === 0) return null;
		let base = chain;
		for (;;) {
			const type = typeOf(base);
			if (type === NodeType.MemberExpression) {
				base = childOf(Field.object, base);
			} else if (type === NodeType.CallExpression) {
				base = childOf(Field.callee, base);
			} else {
				break;
			}
		}
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const printed = context.get(test).replace(NULL_COMPARED, "");
		const text = context.get(chain);
		const next = text.charCodeAt(printed.length);
		return base === chain ||
			typeOf(base) !== NodeType.Identifier ||
			tree.name(base) !== tree.name(name) ||
			// `eval?.()` is no direct `eval`: it reads no local name.
			tree.name(base) === "eval" ||
			// It prints first, `.`, `[` or `(` reading off it, which `?.` takes.
			!text.startsWith(printed) ||
			(next !== 46 && next !== 91 && next !== 40)
			? null
			: `${printed}?.${text.slice(printed.length + (next === 46 ? 1 : 0))}`;
	};

	/**
	 * @param {number} test an expression
	 * @param {string} operator `!=` or `==`
	 * @returns {number} the name it compares with `null` by the operator, 0 for none
	 */
	const nullComparedName = (test, operator) => {
		if (typeOf(test) === NodeType.LogicalExpression) {
			// `x===null||x===void 0` printed as `x==null` compares as that.
			const name = comparedWithNull(test);
			return name !== 0 &&
				!holdsComments(test) &&
				/** @type {JavascriptPrintContext} */ (writer).get(test) ===
					`${nameOf(name)}${operator}null`
				? name
				: 0;
		}
		if (
			typeOf(test) !== NodeType.BinaryExpression ||
			tree.textOf(Part.operator, test) !== operator ||
			holdsComments(test)
		) {
			return 0;
		}
		const left = childOf(Field.left, test);
		const right = childOf(Field.right, test);
		const name = isNull(right) ? left : isNull(left) ? right : 0;
		return typeOf(name) === NodeType.Identifier ? name : 0;
	};

	/**
	 * terser's `t?f(a,x):f(b,x)` as `f(t?a:b,x)`, where `f` is a local name and
	 * nothing the test runs could change it or the arguments before.
	 * @param {number} node a conditional
	 * @returns {number} the one argument its branches' calls differ in, -1 for none
	 */
	const mergedArgument = (node) => {
		let index = mergedArguments.get(node);
		if (index !== undefined) return index;
		index = -1;
		const consequent = childOf(Field.consequent, node);
		const alternate = childOf(Field.alternate, node);
		const count = tree.fieldCount(Field.arguments, consequent);
		if (
			compresses &&
			typeOf(consequent) === NodeType.CallExpression &&
			typeOf(alternate) === NodeType.CallExpression &&
			!tree.flag(Flag.optional, consequent) &&
			!tree.flag(Flag.optional, alternate) &&
			!holdsComments(node) &&
			count === tree.fieldCount(Field.arguments, alternate) &&
			sameLocalName(
				childOf(Field.callee, consequent),
				childOf(Field.callee, alternate)
			) &&
			isPureValue(childOf(Field.test, node))
		) {
			for (let i = 0; i < count; i++) {
				const item = itemOf(i, Field.arguments, consequent);
				const other = itemOf(i, Field.arguments, alternate);
				if (
					typeOf(item) === NodeType.SpreadElement ||
					typeOf(other) === NodeType.SpreadElement
				) {
					index = -1;
					break;
				}
				if (sameValue(item, other)) continue;
				if (index !== -1) {
					index = -1;
					break;
				}
				index = i;
			}
			// The arguments before it now run before the test.
			for (let i = 0; i < index; i++) {
				if (!isPureValue(itemOf(i, Field.arguments, consequent))) {
					index = -1;
					break;
				}
			}
		}
		mergedArguments.set(node, index);
		return index;
	};

	/**
	 * @param {number} node an expression
	 * @param {number} other another
	 * @returns {boolean} whether both are a local name of the same binding, which no `with` or `eval` reaches
	 */
	const sameLocalName = (node, other) => {
		if (
			typeOf(node) !== NodeType.Identifier ||
			typeOf(other) !== NodeType.Identifier ||
			mangledNames === null
		) {
			return false;
		}
		const definition = mangledNames[node];
		return (
			isMinifierVariable(definition) &&
			!definition.undeclared &&
			mangledNames[other] === definition &&
			!(/** @type {MinifierScope} */ (definition.scope).isPinned())
		);
	};

	/**
	 * @param {number} node a node, printed
	 * @param {[number, number]} span where a part of its text starts and ends
	 * @param {number} other another node, printed
	 * @param {[number, number]} otherSpan where a part of its text starts and ends
	 * @returns {boolean} whether their texts are the same around those parts
	 */
	const printsAlikeAround = (node, span, other, otherSpan) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const text = context.get(node);
		const otherText = context.get(other);
		return (
			text.slice(0, span[0]) === otherText.slice(0, otherSpan[0]) &&
			text.slice(span[1]) === otherText.slice(otherSpan[1])
		);
	};

	/**
	 * Prints a conditional as `mergedArgument` has it.
	 * @param {number} node a conditional
	 * @param {number} test its test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} whether it printed so
	 */
	const printsMergedCall = (node, test, consequent, alternate) => {
		const span = mergedSpans.get(consequent);
		const otherSpan = mergedSpans.get(alternate);
		const context = /** @type {JavascriptPrintContext} */ (writer);
		// Both printed alike but for that argument.
		if (
			span === undefined ||
			otherSpan === undefined ||
			!printsAlikeAround(consequent, span, alternate, otherSpan)
		) {
			return false;
		}
		const text = context.get(consequent);
		const otherText = context.get(alternate);
		context.consume(consequent);
		context.consume(alternate);
		printSlice(text.slice(0, span[0]));
		printNode(test);
		output.print("?");
		printSlice(text.slice(span[0], span[1]));
		output.print(":");
		printSlice(otherText.slice(otherSpan[0], otherSpan[1]));
		printSlice(text.slice(span[1]));
		return true;
	};

	/**
	 * terser's `a?b?c:d:d` as `a&&b?c:d` and `a?b:c?b:d` as `a||c?b:d`: a
	 * branch printing as the other's same branch runs once either way.
	 * @param {number} test a conditional's test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} whether it printed so
	 */
	const printsMergedTests = (test, consequent, alternate) => {
		for (const operator of ["&&", "||"]) {
			const inner = operator === "&&" ? consequent : alternate;
			const outer = operator === "&&" ? alternate : consequent;
			const length = plainTests.get(inner);
			if (
				length === undefined ||
				holdsComments(inner) ||
				hasEdgeComments(outer) ||
				!sameValue(
					outer,
					childOf(operator === "&&" ? Field.alternate : Field.consequent, inner)
				)
			) {
				continue;
			}
			const text = /** @type {JavascriptPrintContext} */ (writer).consume(
				inner
			);
			skipNode(outer);
			printNode(test, wrapsTest(test, operator));
			output.print(operator);
			if (wrapsTest(childOf(Field.test, inner), operator)) {
				printSlice(`(${text.slice(0, length)})${text.slice(length)}`);
			} else {
				printSlice(text);
			}
			return true;
		}
		return false;
	};

	/**
	 * esbuild's `a?c:(b,c)` as `(a||b),c`, `a?(b,c):c` as `(a&&b),c` and
	 * `a?b||c:c` as `a&&b||c`: a branch ending in the other runs it once.
	 * @param {number} node a conditional
	 * @param {number} test its test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} whether it printed so
	 */
	const printsSharedTail = (node, test, consequent, alternate) => {
		if (holdsComments(node)) return false;
		let holder = alternate;
		let tail = consequent;
		if (typeOf(consequent) === NodeType.SequenceExpression) {
			holder = consequent;
			tail = alternate;
		} else if (
			typeOf(consequent) === NodeType.LogicalExpression &&
			operatorOf(consequent) === "||"
		) {
			holder = consequent;
			tail = alternate;
		} else if (typeOf(alternate) !== NodeType.SequenceExpression) {
			return false;
		}
		const sequence = typeOf(holder) === NodeType.SequenceExpression;
		if (sequence && tree.fieldCount(Field.expressions, holder) !== 2) {
			return false;
		}
		const first = sequence
			? itemOf(0, Field.expressions, holder)
			: childOf(Field.left, holder);
		const last = sequence
			? itemOf(1, Field.expressions, holder)
			: childOf(Field.right, holder);
		if (!sameValue(last, tail)) return false;
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const text = context.get(holder);
		const tailText = context.get(tail);
		// A branch holds a sequence in parentheses.
		const open = sequence ? "(" : "";
		const end = `${sequence ? "," : "||"}${tailText}${sequence ? ")" : ""}`;
		if (!text.startsWith(open) || !text.endsWith(end)) return false;
		const firstText = text.slice(open.length, text.length - end.length);
		const operator = holder === consequent ? "&&" : "||";
		// Where its place parenthesizes a conditional, that holds the sequence.
		const wrap =
			sequence &&
			!takesSequence(node, parentAt(0)) &&
			!needsParens(node, 0) &&
			typeOf(parentAt(0)) !== NodeType.TaggedTemplateExpression;
		// Left of `||` it took what `&&` takes, but a `||` of its own; an item
		// of a sequence nobody reads may print otherwise than its type says.
		const wraps = sequence
			? !SIMPLE_REFERENCE.test(firstText)
			: typeOf(first) === NodeType.LogicalExpression &&
				operatorOf(first) === "||";
		const wrapsFirst = wrapsTest(test, operator);
		// The tail printed once and a sequence's parentheses saved pay for those added.
		if (
			(wrap ? 2 : 0) + (wraps ? 2 : 0) + (wrapsFirst ? 2 : 0) >=
			tailText.length + (sequence ? 2 : 0)
		) {
			return false;
		}
		context.consume(holder);
		context.consume(tail);
		if (wrap) output.print("(");
		printNode(test, wrapsFirst);
		output.print(operator);
		printSlice(wraps ? `(${firstText})` : firstText);
		output.print(sequence ? "," : "||");
		printSlice(tailText);
		if (wrap) output.print(")");
		return true;
	};

	/**
	 * @param {number} test a conditional's test
	 * @param {string} operator `&&` or `||`
	 * @returns {boolean} whether it needs parentheses as the operator's operand beyond those it took as a test
	 */
	const wrapsTest = (test, operator) => {
		switch (typeOf(test)) {
			case NodeType.SequenceExpression:
			case NodeType.AssignmentExpression:
			case NodeType.ConditionalExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.YieldExpression:
				return false;
			default:
				return !joinsLogical(test, operator, false);
		}
	};

	/**
	 * `x!=null?x:y` is `x??y`, and `x!=null?x.y():void 0` is `x?.y()`, `==`
	 * with the branches swapped too.
	 * @param {number} node a conditional being printed
	 * @param {number} test its test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} whether it printed so
	 */
	const printsNullishConditional = (node, test, consequent, alternate) => {
		if (
			answersWith ||
			output.option("ecma") < 2020 ||
			hasEdgeComments(consequent) ||
			hasEdgeComments(alternate)
		) {
			return false;
		}
		const context = /** @type {JavascriptPrintContext} */ (writer);
		for (const operator of ["!=", "=="]) {
			const name = nullComparedName(test, operator);
			if (name === 0) continue;
			const [kept, other] =
				operator === "!=" ? [consequent, alternate] : [alternate, consequent];
			if (isUndefinedValue(other)) {
				const chain = optionalChainOf(test, operator, kept);
				if (chain === null) return false;
				context.consume(test);
				context.consume(kept);
				skipNode(other);
				printSlice(chain);
				return true;
			}
			const type = typeOf(other);
			if (
				typeOf(kept) !== NodeType.Identifier ||
				tree.name(kept) !== tree.name(name) ||
				// It stands bare after `??` as after `:`.
				!(
					NEGATES_BARE[type] ||
					type === NodeType.NewExpression ||
					type === NodeType.SequenceExpression ||
					(type === NodeType.BinaryExpression && !isPrivateIn(other))
				)
			) {
				return false;
			}
			const printed = context.get(test).replace(NULL_COMPARED, "");
			context.consume(test);
			skipNode(kept);
			printSlice(printed);
			output.print("??");
			printNode(other);
			return true;
		}
		return false;
	};
	generators[NodeType.LogicalExpression] = (node) => {
		if (dropsDeadCode && printsFolded(node, pickedOperand(node, true))) return;
		if (truthOperand(node) !== 0) {
			skipNode(childOf(Field.right, node));
			printNode(childOf(Field.left, node));
			return;
		}
		if (compresses && printsKnownLeft(node)) return;
		if (printsUnreadNullish(node)) return;
		if (printsOptionalChain(node)) return;
		const right = childOf(Field.right, node);
		if (
			compresses &&
			dropsSideEffectFree &&
			!holdsComments(right) &&
			isPureValue(right) &&
			valueUnread(node, parentAt(0))
		) {
			// Nobody reading it, a right side running nothing goes.
			skipNode(right);
			printNode(childOf(Field.left, node));
			return;
		}
		if (printsObjectTruth(node)) return;
		if (printsNegatedOperands(node)) return;
		const name = compresses ? comparedWithNull(node) : 0;
		if (name === 0) {
			if (!printsPushedNegation(node)) printBinary(node);
			return;
		}
		// terser's `comparisons`: `==` takes null and undefined alike.
		const context = /** @type {JavascriptPrintContext} */ (writer);
		context.consume(childOf(Field.left, node));
		context.consume(childOf(Field.right, node));
		output.printName(nameOf(name));
		output.print(
			tree.textOf(Part.operator, node) === "||" ? "==null" : "!=null"
		);
	};
	/**
	 * @param {number} node an expression
	 * @param {string} operator `==` or `!=`, `===` and `!==` too
	 * @param {(node: number) => boolean} other whether the other side is what it compares to
	 * @returns {number} the name one side is where it compares so to the other, 0 for none
	 */
	const comparedName = (node, operator, other) => {
		if (
			typeOf(node) !== NodeType.BinaryExpression ||
			!operatorOf(node).startsWith(operator) ||
			hasEdgeComments(node)
		) {
			return 0;
		}
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		return other(right) ? left : other(left) ? right : 0;
	};

	/**
	 * esbuild's `typeof x=="object"&&x!==null` as `typeof x=="object"&&!!x`:
	 * an object or `null` past the test, the name is `null` only where falsy.
	 * @param {number} node a `&&` or `||`, being printed
	 * @returns {boolean} whether it printed so, shorter
	 */
	const printsObjectTruth = (node) => {
		const operator = operatorOf(node);
		if (!compresses || operator === "??") return false;
		const and = operator === "&&";
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		const typed = comparedName(left, and ? "==" : "!=", (side) => {
			const value = typeOf(side) === NodeType.Literal && tree.value(side);
			return value === "object";
		});
		if (
			typeOf(typed) !== NodeType.UnaryExpression ||
			tree.textOf(Part.operator, typed) !== "typeof"
		) {
			return false;
		}
		const name = childOf(Field.argument, typed);
		const compared = comparedName(
			right,
			and ? "!=" : "==",
			(side) => typeOf(side) === NodeType.Literal && tree.value(side) === null
		);
		if (
			typeOf(name) !== NodeType.Identifier ||
			typeOf(compared) !== NodeType.Identifier ||
			mangledNames === null ||
			!isMinifierVariable(mangledNames[name]) ||
			mangledNames[name] !== mangledNames[compared] ||
			holdsComments(right)
		) {
			return false;
		}
		/** @type {JavascriptPrintContext} */ (writer).consume(right);
		printNode(left);
		output.print(operator);
		output.print(and ? (readsTruth(node) ? "" : "!!") : "!");
		output.printName(nameOf(compared));
		return true;
	};

	// The equality each equality negated is.
	/** @type {Record<string, string>} */
	const NEGATED_EQUALITIES = {
		"==": "!=",
		"!=": "==",
		"===": "!==",
		"!==": "==="
	};

	/**
	 * De Morgan's laws: `!(a==b||!c)` is `a!=b&&c`, where what its operands cost
	 * negated is less than `!(` and `)`, and the value stays a boolean or only its
	 * truth is read. A `!` under another one is `printsPushedNegation`'s.
	 * @param {number} operation a `&&` or `||`
	 * @param {number} negation the `!` of it
	 * @param {number} level where the `!`'s parent is among the printed one's
	 * @returns {boolean} whether the `!` goes into its operands
	 */
	const negatesOperands = (operation, negation, level) => {
		const known = negatedOperations.get(operation);
		if (known !== undefined) return known;
		let negates = false;
		const operator = operatorOf(operation);
		if (
			compresses &&
			operator !== "??" &&
			isNegation(negation) &&
			childOf(Field.argument, negation) === operation &&
			!isNegation(parentAt(level)) &&
			// A test swapping its branches or negated where it is drops the `!` alike.
			!swapsTest(parentAt(level), negation) &&
			!holdsComments(negation) &&
			!hasEdgeComments(operation)
		) {
			const truth = readsTruth(negation, level);
			let cost = 0;
			negates = true;
			for (const side of [
				childOf(Field.left, operation),
				childOf(Field.right, operation)
			]) {
				if (
					typeOf(side) === NodeType.BinaryExpression &&
					NEGATED_EQUALITIES[operatorOf(side)] !== undefined &&
					!hasEdgeComments(side)
				) {
					continue;
				}
				if (isNegation(side)) {
					// Its `!` goes, leaving what may be no boolean.
					cost--;
					if (!truth && !givesBoolean(childOf(Field.argument, side))) {
						negates = false;
					}
					continue;
				}
				cost +=
					typeOf(side) === NodeType.Identifier ||
					typeOf(side) === NodeType.MemberExpression ||
					isCallType(typeOf(side))
						? 1
						: 3;
			}
			if (cost >= 3) negates = false;
		}
		negatedOperations.set(operation, negates);
		return negates;
	};

	/**
	 * @param {number} parent a node
	 * @param {number} test what it holds
	 * @returns {boolean} whether it is a conditional or `if` testing it that may swap its branches or print the test negated
	 */
	const swapsTest = (parent, test) => {
		const type = typeOf(parent);
		if (type === NodeType.ConditionalExpression) {
			return childOf(Field.test, parent) === test;
		}
		if (type !== NodeType.IfStatement || childOf(Field.test, parent) !== test) {
			return false;
		}
		if (tree.field(0, Field.alternate, parent) !== 0) return true;
		const body = typeOf(tree.field(0, Field.consequent, parent));
		return (
			body === NodeType.BlockStatement ||
			body === NodeType.ReturnStatement ||
			body === NodeType.BreakStatement ||
			body === NodeType.ContinueStatement
		);
	};

	/**
	 * @param {number} node a `!` its operation's operands took in, being printed
	 * @param {number} operation that `&&` or `||`
	 * @returns {boolean} whether its place takes the operation, its operator swapped, bare
	 */
	const takesNegatedOperation = (node, operation) => {
		const parent = parentAt(0);
		const type = typeOf(parent);
		if (takesSequence(node, parent) || holdsAssignmentBare(node, 0)) return true;
		if (type === NodeType.ForStatement) return childOf(Field.test, parent) === node;
		if (type === NodeType.ConditionalExpression) {
			return childOf(Field.test, parent) === node;
		}
		if (type !== NodeType.LogicalExpression) return false;
		const swapped = operatorOf(operation) === "&&" ? "||" : "&&";
		const outer = operatorOf(parent);
		// `&&` binds tighter than `||`; `??` takes neither bare.
		return outer !== "??" && (outer === swapped || swapped === "&&");
	};

	/**
	 * Prints an `&&` or `||` its `!` goes into, `negatesOperands`.
	 * @param {number} node the operation, being printed
	 * @returns {boolean} whether it printed so
	 */
	const printsNegatedOperands = (node) => {
		if (!negatesOperands(node, parentAt(0), 1)) return false;
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		/**
		 * @param {number} side an operand
		 * @returns {string} its text negated: an equality printed negated already
		 */
		const negatedSide = (side) => {
			const text = context.consume(side);
			if (negatedEqualities.has(side)) return text;
			if (isNegation(side)) return negatedText(side, text);
			return NEGATES_BARE[typeOf(side)] ? `!${text}` : `!(${text})`;
		};
		printSlice(negatedSide(left));
		output.print(operatorOf(node) === "&&" ? "||" : "&&");
		printSlice(negatedSide(right));
		pushedNegations.add(node);
		return true;
	};

	/**
	 * esbuild's `!!(!a&&b)` as `!(a||!b)`: under a `!` read for its truth, a
	 * `!` of `&&` or `||` is the other operator of its operands negated.
	 * @param {number} node a `&&` or `||`, being printed
	 * @returns {boolean} whether it printed so, shorter
	 */
	const printsPushedNegation = (node) => {
		const operator = operatorOf(node);
		const inner = parentAt(0);
		const outer = parentAt(1);
		if (
			!compresses ||
			operator === "??" ||
			!isNegation(inner) ||
			!isNegation(outer) ||
			holdsComments(outer) ||
			readsTruth(outer, 2) ||
			valueUnread(outer, parentAt(2))
		) {
			return false;
		}
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const left = childOf(Field.left, node);
		const right = childOf(Field.right, node);
		const leftText = negatedText(left, context.get(left));
		const rightText = negatedText(right, context.get(right));
		// `!!(` and `)` around the operation become `!(` and `)`.
		if (
			leftText.length + rightText.length >=
			context.get(left).length + context.get(right).length + 1
		) {
			return false;
		}
		context.consume(left);
		context.consume(right);
		printSlice(leftText);
		output.print(operator === "&&" ? "||" : "&&");
		printSlice(rightText);
		pushedNegations.add(node);
		return true;
	};

	/**
	 * @param {number} node an operand of `&&` or `||`
	 * @param {string} text its text
	 * @returns {string} the text of its negation read for its truth: a `!` dropped, else one added
	 */
	const negatedText = (node, text) => {
		if (
			isNegation(node) &&
			text.charCodeAt(0) === 33 &&
			negatedOperations.get(childOf(Field.argument, node)) !== true
		) {
			// `! --a` keeps the space `!--` would open a comment without.
			return text.slice(text.charCodeAt(1) === 32 ? 2 : 1);
		}
		return SIMPLE_REFERENCE.test(text) ? `!${text}` : `!(${text})`;
	};
	// A name or a chain of names read off it, which `!` and `&&` take bare.
	const SIMPLE_REFERENCE = /^[\w$]+(?:\.[\w$]+)*$/;

	/**
	 * terser's `side_effects` of a strict equality nobody reads: what its
	 * sides run, which compare converting nothing.
	 * @param {number} node a binary expression, being printed
	 * @param {string | null} operator its operator
	 * @param {number} left its left side
	 * @param {number} right its right side
	 * @returns {boolean} whether it printed so
	 */
	const printsUnreadOperands = (node, operator, left, right) => {
		if (
			(operator !== "===" && operator !== "!==") ||
			!dropsSideEffectFree ||
			holdsComments(node) ||
			!valueUnread(node, parentAt(0))
		) {
			return false;
		}
		const keepsLeft = !isPureValue(left);
		const keepsRight = !isPureValue(right);
		if (!keepsLeft && !keepsRight) return false;
		if (keepsLeft) printNode(left, opensAmbiguously(left));
		else skipNode(left);
		if (keepsRight) {
			if (keepsLeft) output.comma();
			printNode(right, !keepsLeft && opensAmbiguously(right));
		} else {
			skipNode(right);
		}
		return true;
	};

	/**
	 * A string added to what nobody reads keeps only the conversion of the
	 * other side: `"a"+f()` runs what `""+f()` does, the string empty.
	 * @param {number} node a binary expression, being printed
	 * @param {string | null} operator its operator
	 * @param {number} left its left side
	 * @param {number} right its right side
	 * @returns {boolean} whether it printed so
	 */
	const printsUnreadConversion = (node, operator, left, right) => {
		if (
			operator !== "+" ||
			!dropsSideEffectFree ||
			holdsComments(node) ||
			!valueUnread(node, parentAt(0))
		) {
			return false;
		}
		const literal = (side) =>
			typeOf(side) === NodeType.Literal &&
			typeof tree.value(side) === "string" &&
			tree.value(side) !== "";
		const string = literal(left) ? left : literal(right) ? right : 0;
		const other = string === left ? right : left;
		if (string === 0 || isPureValue(other)) return false;
		skipNode(string);
		if (string === left) {
			printStringValue("");
			output.print("+");
			// `+` before what opens with `+` would read as `++`.
			const text = /** @type {JavascriptPrintContext} */ (writer).get(other);
			if (text !== undefined && text.charCodeAt(0) === 43) output.print(" ");
			printNode(other);
		} else {
			printNode(other, opensAmbiguously(other));
			output.print("+");
			printStringValue("");
		}
		return true;
	};

	/**
	 * Read for its truth, an integer compared with `0` is the integer, or it
	 * negated: `(a|b)!==0` is `a|b`; `(a&b)==0` is `!(a&b)` wherever read.
	 * @param {number} node an equality or another binary expression, being printed
	 * @param {string | null} operator its operator
	 * @param {number} left its left side
	 * @param {number} right its right side
	 * @returns {boolean} whether it printed so
	 */
	const printsIntegerTruth = (node, operator, left, right) => {
		const other = comparedInteger(node, operator, left, right);
		if (other === 0) return false;
		// `!=` is odd in `EQUALITIES`; `!x` is the boolean `x==0` is.
		const negates =
			(EQUALITIES.indexOf(/** @type {string} */ (operator)) & 1) === 0;
		const unread = valueUnread(node, parentAt(0));
		// Where the comparison took parentheses, they would hold the `!` too.
		if (!unread && !readsTruth(node) && (!negates || needsParens(node, 0))) {
			return false;
		}
		skipNode(other === left ? right : left);
		// Binding looser than the equality, `|`, `&` and `^` took parentheses,
		// which a test needs not and a `!` puts back.
		const operation =
			typeOf(other) === NodeType.BinaryExpression
				? tree.textOf(Part.operator, other)
				: null;
		const wrapped = operation === "|" || operation === "&" || operation === "^";
		if (negates && !unread) {
			output.print("!");
			printNode(other, !wrapped && !NEGATES_BARE[typeOf(other)]);
			negatedIntegers.add(node);
		} else if (wrapped) {
			printSlice(
				/** @type {JavascriptPrintContext} */ (writer)
					.consume(other)
					.slice(1, -1)
			);
		} else {
			printNode(other);
		}
		return true;
	};

	/**
	 * @param {number} node a binary expression
	 * @param {string | null} operator its operator
	 * @param {number} left its left side
	 * @param {number} right its right side
	 * @returns {number} the integer it compares with `0` by equality, which its truth stands for; 0 for none
	 */
	const comparedInteger = (node, operator, left, right) => {
		const equality = EQUALITIES.indexOf(/** @type {string} */ (operator));
		if (equality === -1 || holdsComments(node)) return 0;
		const other = isZero(right) ? left : isZero(left) ? right : 0;
		if (other === 0 || !givesInteger(other)) return 0;
		// `0n!==0`: a BigInt zero is falsy but strictly unequal to `0`.
		return equality > 1 && !givesNumber(other) ? 0 : other;
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is the literal `0`
	 */
	const isZero = (node) =>
		typeOf(node) === NodeType.Literal && tree.value(node) === 0;

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it always gives an integer number: a bitwise operation
	 */
	const givesInteger = (node) => {
		switch (typeOf(node)) {
			case NodeType.BinaryExpression:
				switch (tree.textOf(Part.operator, node)) {
					case "|":
					case "&":
					case "^":
					case "<<":
					case ">>":
					case ">>>":
						return true;
				}
				return false;
			case NodeType.UnaryExpression:
				return tree.textOf(Part.operator, node) === "~";
			default:
				return false;
		}
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it gives an integer number and never a BigInt: `>>>`, or a bitwise operation on a `+` or a number, which a BigInt throws on
	 */
	const givesNumber = (node) => {
		if (typeOf(node) !== NodeType.BinaryExpression || !givesInteger(node)) {
			return false;
		}
		if (tree.textOf(Part.operator, node) === ">>>") return true;
		for (const field of [Field.left, Field.right]) {
			const operand = childOf(field, node);
			if (
				(typeOf(operand) === NodeType.Literal &&
					typeof tree.value(operand) === "number") ||
				(typeOf(operand) === NodeType.UnaryExpression &&
					tree.textOf(Part.operator, operand) === "+") ||
				givesNumber(operand)
			) {
				return true;
			}
		}
		return false;
	};

	/**
	 * terser's `comparisons` of a boolean: `b===!0` is `b`, `b==!1` is `!b`,
	 * where `b` is a boolean already.
	 * @param {number} node an equality or another binary expression, being printed
	 * @param {string | null} operator its operator
	 * @param {number} left its left side
	 * @param {number} right its right side
	 * @returns {boolean} whether it printed so
	 */
	const printsComparedBoolean = (node, operator, left, right) => {
		if (!EQUALITIES.includes(/** @type {string} */ (operator))) {
			return false;
		}
		let value = booleanOf(right);
		let other = left;
		if (value === undefined) {
			value = booleanOf(left);
			other = right;
		}
		if (value === undefined || !givesBoolean(other) || holdsComments(node)) {
			return false;
		}
		skipNode(other === left ? right : left);
		// Nobody reading it, the `!` would run nothing.
		if (
			(operator === "==" || operator === "===") === value ||
			valueUnread(node, parentAt(0))
		) {
			printNode(other);
		} else {
			printNegatedAs(other, "!");
		}
		return true;
	};
	/**
	 * Read from its syntax alone: a name holding a string constant may be read
	 * before it is set, which `"" +` makes `"undefined"`.
	 * @param {number} node an expression
	 * @returns {boolean} whether its value is always a string
	 */
	const isStringValued = (node) => {
		node = unwrap(node);
		switch (typeOf(node)) {
			case NodeType.Literal:
				return typeof tree.value(node) === "string";
			case NodeType.TemplateLiteral:
				return true;
			case NodeType.UnaryExpression:
				return tree.textOf(Part.operator, node) === "typeof";
			case NodeType.BinaryExpression:
				return (
					tree.textOf(Part.operator, node) === "+" &&
					(isStringValued(childOf(Field.left, node)) ||
						isStringValued(childOf(Field.right, node)))
				);
			default:
				return false;
		}
	};

	/**
	 * esbuild's `"" + x` as `x` where `x` is a string: adding nothing, or an
	 * empty array, gives it back.
	 * @param {number} node a `+`
	 * @param {number} left its left operand
	 * @param {number} right its right operand
	 * @returns {boolean} whether it printed the string alone
	 */
	const printsAddedString = (node, left, right) => {
		const empty = addedValue(left) === "" ? left : right;
		const other = empty === left ? right : left;
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		if (
			addedValue(empty) !== "" ||
			holdsComments(empty) ||
			// A run of literals added to a string prints them joined at its end.
			(addedLiteral(node) !== undefined && addsToString(left)) ||
			hasEdgeComments(left) ||
			hasEdgeComments(right) ||
			// Printed where `+` stood, it keeps the parentheses `+` gave it, as a
			// binary right operand does.
			(other === right && isBinary(unwrap(other))) ||
			bindsLooser(unwrap(other)) ||
			parentType === NodeType.BinaryExpression ||
			parentType === NodeType.LogicalExpression ||
			isUnaryType(parentType) ||
			isCalledOrAccessed(node, parent) ||
			opensAmbiguously(other) ||
			!isStringValued(other)
		) {
			return false;
		}
		skipNode(empty);
		printNode(other);
		return true;
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
			if (templatePlus(node)) {
				printTemplatePlus(node);
				return;
			}
			if (operator === "+" && printsAddedString(node, left, right)) return;
			if (printsComparedBoolean(node, operator, left, right)) return;
			if (printsIntegerTruth(node, operator, left, right)) return;
			if (printsUnreadOperands(node, operator, left, right)) return;
			if (printsUnreadConversion(node, operator, left, right)) return;
			if (addsToString(node) && addsToString(left)) {
				const added = templateRun(node);
				if (added !== undefined) {
					// Added to a template, every literal of the run is its text.
					const text = /** @type {JavascriptPrintContext} */ (writer).consume(
						left
					);
					skipNode(right);
					printTemplatePiece(left, text.slice(0, -1), 0);
					output.printTemplateStringChars(added);
					output.print("`");
					templateJoins.add(node);
					return;
				}
				printNode(left);
				skipNode(right);
				output.print("+");
				printValue(joinedLiterals(node), false);
				return;
			}
			// Strings, numbers or booleans compare the same loosely, terser's `comparisons`.
			const loose =
				(operator === "===" || operator === "!==") &&
				((isStringValue(left) && isStringValue(right)) ||
					(isNumberValue(left) && isNumberValue(right)) ||
					(givesBoolean(left) && givesBoolean(right)))
					? operator === "==="
						? "=="
						: "!="
					: /** @type {string} */ (operator);
			// An operand of what a `!` goes into prints negated.
			const operation = parentAt(0);
			const negated =
				NEGATED_EQUALITIES[loose] !== undefined &&
				typeOf(operation) === NodeType.LogicalExpression &&
				negatesOperands(operation, parentAt(1), 2);
			if (negated) negatedEqualities.add(node);
			const printed = negated ? NEGATED_EQUALITIES[loose] : loose;
			const tested = typeofUndefined(printed, left, right);
			if (tested !== 0 && readsWithoutThrowing(childOf(Field.argument, tested))) {
				// What reading throws no more than `typeof` does compares to `void 0`.
				const text = /** @type {JavascriptPrintContext} */ (writer).consume(
					tested
				);
				skipNode(tested === left ? right : left);
				printSlice(text.slice(text.charCodeAt(6) === 32 ? 7 : 6));
				output.print(printed.charCodeAt(0) === 33 ? "!==void 0" : "===void 0");
			} else if (tested !== 0) {
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
			} else if (
				(printed === "==" || printed === "!=") &&
				!hasEdgeComments(left) &&
				(isUndefinedValue(left) || booleanOf(left) !== undefined)
			) {
				// The same, written on the left.
				output.print(
					isUndefinedValue(left) ? "null" : booleanOf(left) ? "1" : "0"
				);
				skipNode(left);
				output.print(printed);
				printNode(right);
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
		if (dropsDeadCode && printsFolded(node, pickedBranch(node))) return;
		const test = childOf(Field.test, node);
		if (compresses && printsKnownTest(node, test)) return;
		if (compresses) printHoistedHead(node);
		if (compresses) {
			const consequent = childOf(Field.consequent, node);
			const alternate = childOf(Field.alternate, node);
			if (printsUnreadBranches(node, test, consequent, alternate)) return;
			const value = booleanOf(consequent);
			if (value !== undefined && booleanOf(alternate) === !value) {
				// terser's `booleans`: `c ? true : false` is `!!c`, `!c` swapped.
				skipNode(consequent);
				skipNode(alternate);
				const negates = !value
					? "!"
					: readsTruth(node) || givesBoolean(test)
						? ""
						: "!!";
				printNegatedAs(test, negates);
				return;
			}
			if (branchesAlike(node, consequent, alternate)) {
				// terser's `x ? y : y`: the test, where it runs anything, then `y`.
				const sequence = !dropsSideEffectFree || !isPureValue(test);
				// Where its place parenthesizes a conditional, that holds the sequence.
				const wrap =
					sequence &&
					!takesSequence(node, parentAt(0)) &&
					!needsParens(node, 0) &&
					// A tag's parentheses hold it.
					typeOf(parentAt(0)) !== NodeType.TaggedTemplateExpression;
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
			if (callsAlikeReferences(node, consequent, alternate)) {
				// The parentheses a callee takes hold `t,f` or `0,f`, which binds no `this`.
				if (!dropsSideEffectFree || !isPureValue(test)) {
					printNode(test);
				} else {
					skipNode(test);
					output.print("0");
				}
				output.comma();
				skipNode(alternate);
				printNode(consequent);
				return;
			}
			if (printsMergedCall(node, test, consequent, alternate)) return;
			if (printsLogical(node, test, consequent, alternate)) return;
			if (printsOr(test, consequent, alternate)) return;
			if (printsNullishConditional(node, test, consequent, alternate)) return;
			if (printsMergedTests(test, consequent, alternate)) return;
			if (printsSharedTail(node, test, consequent, alternate)) return;
		}
		// terser's `!t ? a : b` as `t ? b : a`.
		const swaps = compresses && printsNegatedTest(test);
		if (!swaps) {
			const start = output.text.length;
			printNode(test);
			// One in a branch of another may join its test to that one's.
			if (compresses && start === 0) {
				plainTests.set(node, output.text.length);
			}
		}
		output.space();
		output.print("?");
		output.space();
		printNode(childOf(swaps ? Field.alternate : Field.consequent, node));
		output.space();
		output.colon();
		printNode(childOf(swaps ? Field.consequent : Field.alternate, node));
	};
	/**
	 * terser's conditional to logical: `a ? false : x` prints `!a && x`, and
	 * where only its truth is read `a ? true : x` prints `a || x`, `a ? x :
	 * false` prints `a && x` and `a ? x : true` prints `!a || x`.
	 * @param {number} test a conditional's test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @param {boolean} readTruth whether its place reads only its truth
	 * @returns {[boolean, string, number, number] | null} whether the test prints negated, the operator, the branch going and the one kept, null where it prints otherwise
	 */
	const logicalOf = (test, consequent, alternate, readTruth) => {
		let value = truthOf(consequent, readTruth);
		let other = alternate;
		let first = consequent;
		// A test giving a boolean is what reading only its truth makes of it.
		const truth = readTruth || givesBoolean(test);
		if (value === undefined || (value && !truth)) {
			value = truthOf(alternate, readTruth);
			// `a ? x : true` is `!a || x` whatever `a` is; `a && x` gives a falsy `a`.
			if (value === undefined || (!value && !truth)) return null;
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
		// What `?:` parenthesized there keeps the parentheses an operand takes.
		const testType = typeOf(test);
		return (joinsLogical(test, operator, negates) ||
			(!hasEdgeComments(test) &&
				(testType === NodeType.SequenceExpression ||
					testType === NodeType.AssignmentExpression ||
					testType === NodeType.ConditionalExpression))) &&
			joinsBranch(other, operator)
			? [negates, operator, first, other]
			: null;
	};

	/**
	 * esbuild's `x ? y : 0` as `x && y` where only its truth is read: a
	 * constant branch stands for the boolean it converts to.
	 * @param {number} node a conditional's branch
	 * @param {boolean} readTruth whether the conditional's place reads only its truth
	 * @returns {boolean | undefined} the boolean it is or, where only truth is read, converts to; undefined for none
	 */
	const truthOf = (node, readTruth) => {
		const value = booleanOf(node);
		if (value !== undefined || !readTruth || hasEdgeComments(node)) {
			return value;
		}
		const constant = evaluateConstant(node);
		return constant === undefined || !isPureValue(node)
			? undefined
			: Boolean(constant);
	};

	/**
	 * @param {number} node a conditional being printed, whose place reads only its truth
	 * @returns {[boolean, string, number, number] | null} the operation it prints as, as `logicalOf` has it, where one branch alone is a constant and it prints no other way first; else null
	 */
	const truthLogicalOf = (node) => {
		if (
			!compresses ||
			(dropsDeadCode && pickedBranch(node) !== 0) ||
			valueUnread(node, parentAt(0)) ||
			!readsTruth(node)
		) {
			return null;
		}
		const consequent = childOf(Field.consequent, node);
		const alternate = childOf(Field.alternate, node);
		if (
			(truthOf(consequent, true) === undefined) ===
			(truthOf(alternate, true) === undefined)
		) {
			return null;
		}
		return logicalOf(childOf(Field.test, node), consequent, alternate, true);
	};

	/**
	 * @param {number} node a conditional being printed
	 * @returns {boolean} whether its boolean branches make it print as `!t`, `!!t`, or a test standing bare as a unary does
	 */
	const printsAsNegation = (node) => {
		const test = childOf(Field.test, node);
		const value = booleanOf(childOf(Field.consequent, node));
		if (
			value === undefined ||
			booleanOf(childOf(Field.alternate, node)) !== !value ||
			valueUnread(node, parentAt(0))
		) {
			return false;
		}
		return (
			!value ||
			!(readsTruth(node) || givesBoolean(test)) ||
			NEGATES_BARE[typeOf(test)] === 1
		);
	};

	/**
	 * @param {number} node a conditional's branch
	 * @param {string} operator `&&` or `||`
	 * @returns {boolean} whether it prints bare as the right operand of the operator, as a parenthesized sequence or a conditional printing as an operation that takes it
	 */
	const joinsBranch = (node, operator) => {
		if (joinsLogical(node, operator, false)) return true;
		if (hasEdgeComments(node)) return false;
		switch (typeOf(node)) {
			// A branch holds a sequence in parentheses, as an operand does.
			case NodeType.SequenceExpression:
				return true;
			case NodeType.ConditionalExpression: {
				// Folded, it prints the branch it keeps.
				const kept = dropsDeadCode ? foldedBranch(node) : 0;
				if (kept !== 0) return joinsBranch(kept, operator);
				// A branch reads more than its truth.
				const test = childOf(Field.test, node);
				const consequent = childOf(Field.consequent, node);
				const alternate = childOf(Field.alternate, node);
				const value = booleanOf(consequent);
				if (value !== undefined && booleanOf(alternate) === !value) {
					return true;
				}
				const logical = logicalOf(test, consequent, alternate, false);
				return (
					logical !== null && (logical[1] === "&&" || logical[1] === operator)
				);
			}
			default:
				return false;
		}
	};

	/**
	 * @param {number} node a conditional
	 * @returns {boolean} whether it prints as `!c`, `!!c` or `logicalOf`'s operation
	 */
	const printsAsOperation = (node) => {
		const test = childOf(Field.test, node);
		const consequent = childOf(Field.consequent, node);
		const alternate = childOf(Field.alternate, node);
		const value = booleanOf(consequent);
		return (
			(value !== undefined && booleanOf(alternate) === !value) ||
			logicalOf(test, consequent, alternate, readsTruth(node)) !== null
		);
	};

	/**
	 * terser's `side_effects` of an array or object nobody reads: what its
	 * elements or values run prints as a sequence, what runs nothing going.
	 * A spread `spreadsAs` keeps, a computed key or an accessor keeps it whole.
	 * @param {number} node an array or object literal
	 * @param {number} parent its parent
	 * @param {number=} level where its parent is among the printed one's
	 * @returns {number[] | null} the elements or values that print, null where it prints whole
	 */
	const unreadPartsOf = (node, parent, level = 0) => {
		const cached = unreadParts.get(node);
		if (cached !== undefined) return cached;
		/** @type {number[] | null} */
		let parts = [];
		const field =
			typeOf(node) === NodeType.ArrayExpression
				? Field.elements
				: Field.properties;
		if (
			!compresses ||
			!dropsSideEffectFree ||
			holdsComments(node) ||
			!(valueUnread(node, parent) || isUnreadPart(node, parent, level))
		) {
			parts = null;
		} else {
			if (!collectUnreadParts(node, field, parts)) parts = null;
			if (
				parts !== null &&
				(parts.length === 0 ||
					(!spreadsParts(parts) && opensWithinAmbiguously(parts[0])))
			) {
				parts = null;
			}
		}
		unreadParts.set(node, parts);
		return parts;
	};

	/**
	 * Adds to `unreadPartsOf`'s list what an array, object or call's arguments
	 * run, the items of what it spreads in their place; a spread of another
	 * iterable stays, in an array the parts then print in.
	 * @param {number} node an array or object literal, or a call
	 * @param {number} field its elements, properties or arguments
	 * @param {number[]} parts the list
	 * @returns {boolean} false where it prints whole
	 */
	const collectUnreadParts = (node, field, parts) => {
		const count = tree.fieldCount(field, node);
		for (let i = 0; i < count; i++) {
			const item = itemOf(i, field, node);
			if (item === 0) continue;
			let value = item;
			if (typeOf(item) === NodeType.Property) {
				value =
					tree.flag(Flag.computed, item) ||
					tree.textOf(Part.kind, item) !== "init"
						? 0
						: childOf(Field.value, item);
			} else if (typeOf(item) === NodeType.SpreadElement) {
				const spreads = spreadsAs(item, node);
				if (spreads === 1) continue;
				if (spreads === 0) {
					if (field === Field.properties || holdsComments(item)) return false;
					parts.push(item);
					continue;
				}
				const argument = childOf(Field.argument, item);
				if (!collectUnreadParts(argument, itemsOf(argument), parts)) {
					return false;
				}
				continue;
			}
			if (value === 0 || holdsComments(value)) return false;
			if (!isPureValue(value)) parts.push(value);
		}
		return true;
	};

	/**
	 * @param {number} node an expression
	 * @param {number} parent its parent
	 * @param {number} level where its parent is among the printed one's
	 * @returns {boolean} whether it is an element or value of an array or object nobody reads that prints it, what such a one spreads in place, or an argument of a call that goes
	 */
	const isUnreadPart = (node, parent, level) => {
		const type = typeOf(parent);
		/** @type {number[] | null} */
		let parts = null;
		if (
			(type === NodeType.CallExpression || type === NodeType.NewExpression) &&
			childOf(Field.callee, parent) !== node
		) {
			const kept = unreadArgumentsOf(parent, parentAt(level + 1));
			return kept !== null && kept.includes(node);
		}
		if (type === NodeType.SpreadElement) {
			const container = parentAt(level + 1);
			const type = typeOf(container);
			if (spreadsAs(parent, container) !== 2) return false;
			return type === NodeType.CallExpression || type === NodeType.NewExpression
				? unreadArgumentsOf(container, parentAt(level + 2)) !== null
				: unreadPartsOf(container, parentAt(level + 2), level + 2) !== null;
		}
		if (type === NodeType.ArrayExpression) {
			parts = unreadPartsOf(parent, parentAt(level + 1), level + 1);
		} else if (
			type === NodeType.Property &&
			childOf(Field.value, parent) === node &&
			typeOf(parentAt(level + 1)) === NodeType.ObjectExpression
		) {
			parts = unreadPartsOf(
				parentAt(level + 1),
				parentAt(level + 2),
				level + 2
			);
		}
		return parts !== null && parts.includes(node);
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether an object, function or class it does not itself make opens it, which first in a statement only that one's parentheses would hold, as printing it again does
	 */
	const opensWithinAmbiguously = (node) => {
		const type = typeOf(node);
		return (
			type !== NodeType.ObjectExpression &&
			type !== NodeType.FunctionExpression &&
			type !== NodeType.ClassExpression &&
			opensAmbiguously(node)
		);
	};

	/**
	 * Prints an array or object as `unreadPartsOf` has it.
	 * @param {number} node an array or object literal, being printed
	 * @param {number} field its elements or properties
	 * @returns {boolean} whether it printed so
	 */
	const printsUnreadParts = (node, field) => {
		const parts = unreadPartsOf(node, parentAt(0));
		if (parts === null) return false;
		printUnreadParts(node, field, parts);
		return true;
	};

	/**
	 * Prints `collectUnreadParts`'s parts of an array, object or call, in an
	 * array where a spread is among them.
	 * @param {number} node an array or object literal, or a call
	 * @param {number} field its elements, properties or arguments
	 * @param {number[]} parts what prints
	 * @returns {void}
	 */
	const printUnreadParts = (node, field, parts) => {
		const spreads = spreadsParts(parts);
		if (spreads) output.print("[");
		printUnreadItems(node, field, parts, spreads ? 0 : parts[0]);
		if (spreads) output.print("]");
	};

	/**
	 * Prints the items of an array, object or call `collectUnreadParts`
	 * lists, and those of what it spreads in place.
	 * @param {number} node an array or object literal, or a call
	 * @param {number} field its elements, properties or arguments
	 * @param {number[]} parts what prints
	 * @param {number} first the part printing first, 0 where an array holds them
	 * @returns {void}
	 */
	const printUnreadItems = (node, field, parts, first) => {
		const context = /** @type {JavascriptPrintContext} */ (writer);
		const count = tree.fieldCount(field, node);
		for (let i = 0; i < count; i++) {
			const item = itemOf(i, field, node);
			if (item === 0) continue;
			if (
				typeOf(item) === NodeType.SpreadElement &&
				spreadsAs(item, node) === 2
			) {
				const argument = childOf(Field.argument, item);
				printUnreadItems(argument, itemsOf(argument), parts, first);
				context.consume(argument);
				context.consume(item);
				continue;
			}
			const value =
				typeOf(item) === NodeType.Property ? childOf(Field.value, item) : item;
			if (!parts.includes(value)) {
				context.consume(item);
				continue;
			}
			if (value !== parts[0]) output.comma();
			// One opening the statement would read as a declaration or block.
			printNode(value, value === first && opensAmbiguously(value));
		}
	};

	/**
	 * terser's `side_effects` of a conditional nobody reads: a branch running
	 * nothing goes, `t?x:0` printing `t&&x` and `t?0:x` printing `t||x`.
	 * @param {number} node a conditional
	 * @param {number} test its test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} whether it printed so
	 */
	const printsUnreadBranches = (node, test, consequent, alternate) => {
		if (
			!dropsSideEffectFree ||
			hasEdgeComments(consequent) ||
			hasEdgeComments(alternate) ||
			!valueUnread(node, parentAt(0))
		) {
			return false;
		}
		const goes = isPureValue(consequent)
			? consequent
			: isPureValue(alternate)
				? alternate
				: 0;
		if (goes === 0) return false;
		const kept = goes === consequent ? alternate : consequent;
		if (isPureValue(kept)) {
			skipNode(consequent);
			skipNode(alternate);
			printNode(test);
			return true;
		}
		const operator = goes === consequent ? "||" : "&&";
		printNode(test, wrapsOperand(test, operator));
		output.print(operator);
		skipNode(goes);
		printNode(kept, wrapsOperand(kept, operator));
		return true;
	};

	/**
	 * @param {number} node a conditional's test or branch, printed
	 * @param {string} operator `&&` or `||`
	 * @returns {boolean} whether it needs parentheses as an operand of the operator beyond those it took there, which a sequence always did
	 */
	const wrapsOperand = (node, operator) =>
		typeOf(node) !== NodeType.SequenceExpression &&
		!joinsLogical(node, operator, false);

	/**
	 * Prints a conditional as `logicalOf` has it.
	 * @param {number} node a conditional
	 * @param {number} test its test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} true where it printed so
	 */
	const printsLogical = (node, test, consequent, alternate) => {
		const logical = logicalOf(test, consequent, alternate, readsTruth(node));
		if (logical === null) return false;
		const [negates, operator, first, other] = logical;
		if (negates && !joinsLogical(test, operator, true)) {
			// Its text holds the parentheses `!` needs.
			output.print("!");
			printNode(test);
		} else {
			printNegatedAs(test, negates ? "!" : "");
		}
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
		// An update or `await` binds tighter than `!`, `&&` and `||`.
		if (
			type === NodeType.UpdateExpression ||
			type === NodeType.AwaitExpression
		) {
			return true;
		}
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
	 * terser's `a ? a : b` as `a || b`, where `a` is a name no `with` or
	 * `eval` reaches, read twice as one value since nothing runs between.
	 * @param {number} test a conditional's test
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} whether it printed so
	 */
	const printsOr = (test, consequent, alternate) => {
		if (
			typeOf(test) !== NodeType.Identifier ||
			typeOf(consequent) !== NodeType.Identifier ||
			mangledNames === null ||
			hasEdgeComments(test) ||
			hasEdgeComments(consequent) ||
			hasEdgeComments(alternate) ||
			BELOW_OR[typeOf(alternate)] === 1 ||
			(typeOf(alternate) === NodeType.LogicalExpression &&
				tree.textOf(Part.operator, alternate) === "??")
		) {
			return false;
		}
		const definition = mangledNames[test];
		const context = /** @type {JavascriptPrintContext} */ (writer);
		if (
			!isMinifierVariable(definition) ||
			// terser reads a global twice as once, but not where `with` may answer it.
			(definition.undeclared && answersWith) ||
			mangledNames[consequent] !== definition ||
			/** @type {MinifierScope} */ (definition.scope).isPinned() ||
			context.get(test) !== context.get(consequent)
		) {
			return false;
		}
		printNode(test);
		skipNode(consequent);
		output.print("||");
		printNode(alternate);
		return true;
	};

	/**
	 * terser's `x ? y : y` where a call or tag reads `this` off the branch, a
	 * member or a name such as `eval`: it prints as `(t,y)` or `(0,y)`.
	 * @param {number} node a conditional
	 * @param {number} consequent its consequent
	 * @param {number} alternate its alternate
	 * @returns {boolean} whether both branches print alike as such a callee
	 */
	const callsAlikeReferences = (node, consequent, alternate) => {
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		const type = typeOf(consequent);
		if (
			(parentType === NodeType.CallExpression
				? childOf(Field.callee, parent) !== node
				: parentType !== NodeType.TaggedTemplateExpression) ||
			(type !== NodeType.MemberExpression && type !== NodeType.Identifier) ||
			hasEdgeComments(consequent) ||
			hasEdgeComments(alternate)
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
			case NodeType.UnaryExpression:
				break;
			default:
				return false;
		}
		if (hasEdgeComments(consequent) || hasEdgeComments(alternate)) {
			return false;
		}
		const readerType = typeOf(referenceReader(node));
		// A call takes its `this` from a member, and `eval` reads the scope.
		if (
			readerType === NodeType.NewExpression ||
			readerType === NodeType.UnaryExpression ||
			(readerType !== 0 && !callsBareName(consequent, node)) ||
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
			case NodeType.IfStatement:
			case NodeType.WhileStatement:
			case NodeType.DoWhileStatement:
				return childOf(Field.test, parent) === node;
			case NodeType.SwitchStatement:
				return childOf(Field.discriminant, parent) === node;
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
		const kept = compresses && dropsSideEffectFree ? keptItems(node) : null;
		if (kept === null && compresses && dropsSideEffectFree && zeroHeads(node)) {
			// What runs nothing before a member called is `0`, shortest.
			for (let i = 0; i < count - 1; i++) {
				skipNode(itemOf(i, Field.expressions, node));
			}
			output.print("0");
			output.comma();
			printNode(itemOf(count - 1, Field.expressions, node));
			return;
		}
		let printed = 0;
		for (let i = 0; i < count; i++) {
			const item = itemOf(i, Field.expressions, node);
			if (kept !== null && kept[i] === 0) {
				skipNode(item);
				continue;
			}
			if (printed++ > 0) output.comma();
			printNode(item);
		}
	};
	/**
	 * terser's `side_effects` of a sequence: what runs nothing goes, the last
	 * value too where nothing reads it.
	 * @param {number} node a sequence, being printed
	 * @returns {Uint8Array | null} by item, 1 where it prints; null where all do: one alone would take the parentheses the sequence took, open a statement as a declaration or bind `this`
	 */
	const keptItems = (node) => {
		const count = tree.fieldCount(Field.expressions, node);
		const last = itemOf(count - 1, Field.expressions, node);
		if (
			hasEdgeComments(node) ||
			(readsReference(last, node) && !callsBareName(last, node)) ||
			usesAsm(node)
		) {
			return null;
		}
		const unread = sequenceUnread(node);
		const kept = new Uint8Array(count);
		let first = -1;
		let left = 0;
		for (let i = 0; i < count; i++) {
			const item = itemOf(i, Field.expressions, node);
			if (
				(i < count - 1 || (unread && left !== 0)) &&
				!hasEdgeComments(item) &&
				valueRunsNothing(item)
			) {
				continue;
			}
			kept[i] = 1;
			if (first === -1) first = i;
			left++;
		}
		if (
			left === count ||
			(first > 0 && opensAmbiguously(itemOf(first, Field.expressions, node)))
		) {
			return null;
		}
		if (left === 1 && !unread) {
			const item = itemOf(first, Field.expressions, node);
			if (holdsAssignmentBare(node, item)) {
				bareSequences.add(node);
			} else if (
				!BARE_NAMES.test(
					/** @type {JavascriptPrintContext} */ (writer).get(item)
				)
			) {
				return null;
			}
		}
		return kept;
	};
	/**
	 * @param {number} node a sequence, being printed
	 * @param {number} item the one item of it left
	 * @returns {boolean} whether its place takes the item bare: an initializer outside a `for`'s head, an assigned value, an argument, an element, a property's value, a spread or a template's part, but where a function or class would take the name
	 */
	const holdsAssignmentBare = (node, item) => {
		const parent = parentAt(0);
		const type = typeOf(parent);
		// Under a sequence, what may run more than its value prints as a sequence too.
		if (item !== 0 && PRINTS_NO_COMMA[typeOf(item)] !== 1) return false;
		if (
			(type === NodeType.VariableDeclarator ||
				type === NodeType.AssignmentExpression ||
				type === NodeType.Property) &&
			isAnonymousFunctionDefinition(item)
		) {
			return false;
		}
		switch (type) {
			case NodeType.VariableDeclarator:
				// A `for`'s head would read an `in` there as its own.
				return (
					childOf(Field.init, parent) === node &&
					typeOf(parentAt(2)) !== NodeType.ForStatement
				);
			case NodeType.AssignmentExpression:
				return childOf(Field.right, parent) === node;
			case NodeType.CallExpression:
			case NodeType.NewExpression:
				return childOf(Field.callee, parent) !== node;
			case NodeType.Property:
				return (
					childOf(Field.value, parent) === node &&
					tree.textOf(Part.kind, parent) === "init"
				);
			case NodeType.ArrayExpression:
			case NodeType.SpreadElement:
			case NodeType.TemplateLiteral:
				return true;
			default:
				return false;
		}
	};

	// What prints no comma outside brackets, wherever it stands, by `NodeType`.
	const PRINTS_NO_COMMA = new Uint8Array(256);
	for (const type of [
		NodeType.Literal,
		NodeType.Identifier,
		NodeType.ThisExpression,
		NodeType.TemplateLiteral,
		NodeType.ArrayExpression,
		NodeType.ObjectExpression,
		NodeType.MemberExpression,
		NodeType.FunctionExpression,
		NodeType.ArrowFunctionExpression,
		NodeType.ClassExpression
	]) {
		PRINTS_NO_COMMA[type] = 1;
	}

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is a function, arrow or class without a name, which an initializer, assignment or property names
	 */
	const isAnonymousFunctionDefinition = (node) => {
		switch (typeOf(node)) {
			case NodeType.ArrowFunctionExpression:
				return true;
			case NodeType.FunctionExpression:
			case NodeType.ClassExpression:
				return tree.field(0, Field.id, node) === 0;
			default:
				return false;
		}
	};

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it runs nothing: a pure value, or a write nobody reads of one
	 */
	const valueRunsNothing = (node) =>
		isPureValue(node) ||
		(typeOf(node) === NodeType.AssignmentExpression &&
			node < dropsWrite.length &&
			dropsWrite[node] === 1 &&
			isPureValue(childOf(Field.right, node)));

	/**
	 * @param {number} node a sequence, being printed
	 * @returns {boolean} whether its last item is a member or a name called with its scope or `this` whose reference is read, every other running nothing and printing other than `0`
	 */
	const zeroHeads = (node) => {
		const count = tree.fieldCount(Field.expressions, node);
		const last = itemOf(count - 1, Field.expressions, node);
		if (
			hasEdgeComments(node) ||
			(typeOf(last) === NodeType.Identifier && callsBareName(last, node)) ||
			!readsReference(last, node) ||
			usesAsm(node)
		) {
			return false;
		}
		for (let i = 0; i < count - 1; i++) {
			const item = itemOf(i, Field.expressions, node);
			if (hasEdgeComments(item) || !isPureValue(item)) return false;
		}
		return (
			count > 2 ||
			/** @type {JavascriptPrintContext} */ (writer).get(
				itemOf(0, Field.expressions, node)
			) !== "0"
		);
	};

	/**
	 * @param {number} last the last of a sequence a call or tag reads the reference of
	 * @param {number} node what prints as it, being printed
	 * @returns {boolean} whether it is a name the call takes no `this` from: not `eval`, which called bare reads the scope, and no `with` reached
	 */
	const callsBareName = (last, node) =>
		typeOf(last) === NodeType.Identifier &&
		typeOf(referenceReader(node)) !== NodeType.UnaryExpression &&
		!answersWith &&
		tree.name(last) !== "eval";

	// A string a number converts back to as written, short of losing digits.
	const INTEGER_KEY = /^(?:0|-?[1-9]\d{0,14})$/;
	// A name or names joined by `.`, which stands bare wherever a sequence
	// in parentheses would, but `let`, which could open a declaration.
	const BARE_NAMES =
		/^(?!let(?![\w$\\\u0080-\uFFFF]))[A-Za-z_$\\\u0080-\uFFFF][\w$\\\u0080-\uFFFF]*(?:\.#?[A-Za-z_$\\\u0080-\uFFFF][\w$\\\u0080-\uFFFF]*)*$/;

	/**
	 * @param {number} node a sequence, being printed
	 * @returns {boolean} whether it prints as the one name or member left of it where its value is read, needing no parentheses
	 */
	const printsBareItem = (node) => {
		if (!compresses || !dropsSideEffectFree) return false;
		const kept = keptItems(node);
		if (kept === null || sequenceUnread(node)) return false;
		let left = 0;
		for (let i = 0; i < kept.length; i++) left += kept[i];
		return left === 1;
	};
	/**
	 * @param {number} node a sequence, being printed
	 * @returns {boolean} whether nothing reads its value: a statement, a `for`'s start or update, or a value a sequence goes past
	 */
	const sequenceUnread = (node) => {
		const parent = parentAt(0);
		return (
			valueUnread(node, parent) ||
			(typeOf(parent) === NodeType.ForStatement &&
				(childOf(Field.init, parent) === node ||
					childOf(Field.update, parent) === node))
		);
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
	 * @returns {boolean} whether it is what a `new` constructs or a call calls and prints as its last value, the others running nothing, as `new` reads no `this` from it and a function expression called takes none
	 */
	const constructsPastSequence = (node) => {
		const parent = parentAt(0);
		const parentType = typeOf(parent);
		if (
			!compresses ||
			(parentType !== NodeType.NewExpression &&
				(parentType !== NodeType.CallExpression ||
					tree.flag(Flag.optional, parent) ||
					output.option("wrapIife"))) ||
			childOf(Field.callee, parent) !== node ||
			hasEdgeComments(node) ||
			(reducedCalls.size !== 0 && reducedCalls.has(parent))
		) {
			return false;
		}
		const count = tree.fieldCount(Field.expressions, node);
		const last = itemOf(count - 1, Field.expressions, node);
		const lastType = typeOf(last);
		if (
			hasEdgeComments(last) ||
			(lastType !== NodeType.FunctionExpression &&
				(parentType === NodeType.CallExpression ||
					(lastType !== NodeType.ClassExpression && !isNewTarget(last))))
		) {
			return false;
		}
		for (let i = 0; i < count - 1; i++) {
			if (!isPureValue(itemOf(i, Field.expressions, node))) return false;
		}
		return true;
	};

	generators[NodeType.NewExpression] = (node) => {
		if (printsUnreadArguments(node)) return;
		if (compresses && constructsWhenCalled(node)) {
			if (printsArrayCall(node)) return;
			if (printsEmptyObject(node)) {
				skipNode(childOf(Field.callee, node));
				output.print("{}");
				return;
			}
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
		const expression = childOf(Field.expression, node);
		if (
			compresses &&
			dropsDeadCode &&
			!holdsComments(node) &&
			takesUnary(node) &&
			shortCircuits(node)
		) {
			// What the chain reads past its nullish start never runs.
			/** @type {JavascriptPrintContext} */ (writer).consume(expression);
			output.print("void 0");
			return;
		}
		printNode(expression);
	};
	/**
	 * terser's `evaluate` of an optional chain: `null?.a.b()` is `undefined`
	 * without reading anything past its start.
	 * @param {number} chain an optional chain
	 * @returns {boolean} whether its first link is optional on what is `null` or `undefined` and runs nothing
	 */
	const shortCircuits = (chain) => {
		let link = childOf(Field.expression, chain);
		for (;;) {
			// Each link of a chain is a member or a call.
			const inner =
				typeOf(link) === NodeType.CallExpression
					? childOf(Field.callee, link)
					: childOf(Field.object, link);
			const innerType = typeOf(inner);
			if (
				innerType !== NodeType.MemberExpression &&
				innerType !== NodeType.CallExpression
			) {
				return (
					tree.flag(Flag.optional, link) &&
					(innerType === NodeType.ChainExpression
						? shortCircuits(inner)
						: isUndefinedValue(inner) ||
							(evaluateConstant(inner) === null && isPureValue(inner)))
				);
			}
			link = inner;
		}
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
	 * @param {number} property a property of an object literal
	 * @param {(node: number) => EvaluatedValue} evaluate how a computed key is evaluated, as at print or before it
	 * @returns {string | undefined} the key it sets, undefined where it is not known or the property sets no plain value
	 */
	const plainKeyOf = (property, evaluate) => {
		if (typeOf(property) !== NodeType.Property || !isKeyValue(property)) {
			return undefined;
		}
		const key = childOf(Field.key, property);
		const value = tree.flag(Flag.computed, property)
			? isPureValue(key)
				? evaluate(key)
				: undefined
			: typeOf(key) === NodeType.Identifier
				? tree.name(key)
				: tree.value(key);
		if (typeof value !== "string" && typeof value !== "number") {
			return undefined;
		}
		const name = String(value);
		// `__proto__:` sets the prototype, not a property.
		return name === "__proto__" &&
			!tree.flag(Flag.computed, property) &&
			!tree.flag(Flag.shorthand, property)
			? undefined
			: name;
	};

	/**
	 * terser's `properties` of an object literal read at a known key:
	 * `{a: 1, b: 2}.b` prints `2`, the last value set for that key.
	 * @param {number} object an object literal
	 * @param {number} member the member reading it
	 * @param {(node: number) => EvaluatedValue} evaluate how a computed key or read is evaluated, as at print or before it
	 * @returns {number} the value it reads, 0 where unknown or another value runs anything
	 */
	const pickedValue = (object, member, evaluate) => {
		const property = childOf(Field.property, member);
		const read = tree.flag(Flag.computed, member)
			? typeOf(property) === NodeType.Literal
				? tree.value(property)
				: evaluate(property)
			: // `#x` reads a private field, which an object literal never holds.
				typeOf(property) === NodeType.Identifier
				? tree.name(property)
				: undefined;
		if (typeof read !== "string" && typeof read !== "number") return 0;
		const name = String(read);
		const count = tree.fieldCount(Field.properties, object);
		let picked = 0;
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.properties, object);
			const key = plainKeyOf(item, evaluate);
			if (key === undefined) return 0;
			if (key === name) picked = item;
		}
		if (picked === 0) return 0;
		for (let i = 0; i < count; i++) {
			const item = tree.field(i, Field.properties, object);
			if (item !== picked && !isPureValue(childOf(Field.value, item))) {
				return 0;
			}
		}
		return childOf(Field.value, picked);
	};

	/**
	 * @param {number} member a member expression
	 * @returns {number} the value `pickedValue` finds it reads off an object literal, itself read so or written; 0 for none
	 */
	const readValue = (member) => {
		if (tree.flag(Flag.optional, member)) return 0;
		let object = childOf(Field.object, member);
		if (typeOf(object) === NodeType.MemberExpression) {
			object = readValue(object);
		}
		return typeOf(object) === NodeType.ObjectExpression
			? pickedValue(object, member, evaluateConstant)
			: 0;
	};

	/**
	 * @param {number} object an object literal being printed
	 * @param {number} level where the member reading it is among the printed one's
	 * @returns {boolean} whether that member prints as the one value it reads
	 */
	const printsPickedValue = (object, level) => {
		const member = parentAt(level);
		return (
			typeOf(member) === NodeType.MemberExpression &&
			childOf(Field.object, member) === object &&
			pickedElement(member, level + 1) !== 0
		);
	};

	/**
	 * terser's `properties` of an array read at a known index: `[a, b][1]`
	 * prints `b`, or of an object literal at a known key, where the others
	 * run nothing and what it reads needs no parentheses in the member's
	 * place, nor takes its `this` from the literal.
	 * @param {number} member a member expression being printed
	 * @param {number} level the parent level of what holds the member
	 * @returns {number} the element or value it prints as, 0 for none
	 */
	const pickedElement = (member, level) => {
		if (!compresses || tree.flag(Flag.optional, member)) return 0;
		const array = childOf(Field.object, member);
		const property = childOf(Field.property, member);
		if (holdsComments(array) || hasEdgeComments(property)) return 0;
		if (typeOf(array) === NodeType.ObjectExpression) {
			const value = pickedValue(array, member, valueAtPrint);
			// Opening a statement, the object took parentheses its value would
			// not, as under a `void` a `return` ending its function prints alone.
			const parent = parentAt(level);
			return value !== 0 &&
				fitsMemberPlace(member, level, value) &&
				!firstInStatement(member, level, true) &&
				!(
					typeOf(parent) === NodeType.UnaryExpression &&
					tree.textOf(Part.operator, parent) === "void"
				)
				? value
				: 0;
		}
		if (
			!tree.flag(Flag.computed, member) ||
			typeOf(array) !== NodeType.ArrayExpression
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
		return fitsMemberPlace(member, level, element) ? element : 0;
	};

	/**
	 * @param {number} member a member expression being printed
	 * @param {number} level the parent level of what holds the member
	 * @param {number} element what it would print as
	 * @returns {boolean} whether that prints in the member's place needing no parentheses, as a value read rather than written, called or deleted
	 */
	const fitsMemberPlace = (member, level, element) => {
		const parent = parentAt(level);
		const parentType = typeOf(parent);
		switch (typeOf(element)) {
			case NodeType.Identifier:
				// `let[` opens a declaration.
				if (tree.name(element) === "let") return false;
				break;
			case NodeType.Literal:
				// `1.x` reads a number's fraction; `1[x]` reads it whole.
				if (
					isNumber(element) &&
					parentType === NodeType.MemberExpression &&
					!tree.flag(Flag.computed, parent)
				) {
					return false;
				}
				// `true` prints as `!0`, which `.x` or `**` would not read whole.
				if (
					typeof tree.value(element) === "boolean" &&
					(parentType === NodeType.MemberExpression ||
						(parentType === NodeType.BinaryExpression &&
							tree.textOf(Part.operator, parent) === "**" &&
							childOf(Field.left, parent) === member))
				) {
					return false;
				}
				break;
			case NodeType.CallExpression:
				// `new [f()][0].g` would call `f` as what `new` makes.
				if (parentType === NodeType.MemberExpression) return false;
				break;
			case NodeType.ThisExpression:
			case NodeType.MemberExpression:
			case NodeType.ArrayExpression:
			case NodeType.TemplateLiteral:
				break;
			default:
				return false;
		}
		return !(
			isWriteTarget(member, level) ||
			(isCallType(parentType) && childOf(Field.callee, parent) === member) ||
			parentType === NodeType.TaggedTemplateExpression ||
			(parentType === NodeType.UnaryExpression &&
				tree.textOf(Part.operator, parent) === "delete")
		);
	};
	/**
	 * terser's `?.` after what is never `null` or `undefined`, which reads as `.`.
	 * @param {number} node what a member is read off or what is called
	 * @returns {boolean} true where it always gives an object or a primitive
	 */
	const neverNullish = (node) => {
		switch (typeOf(node)) {
			case NodeType.ArrayExpression:
			case NodeType.ObjectExpression:
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
			case NodeType.ClassExpression:
			case NodeType.TemplateLiteral:
			case NodeType.NewExpression:
			case NodeType.BinaryExpression:
			case NodeType.UpdateExpression:
				return true;
			case NodeType.Literal:
				return tree.value(node) !== null;
			case NodeType.UnaryExpression:
				return tree.textOf(Part.operator, node) !== "void";
			case NodeType.SequenceExpression:
				return neverNullish(
					itemOf(
						tree.fieldCount(Field.expressions, node) - 1,
						Field.expressions,
						node
					)
				);
			default:
				return false;
		}
	};

	generators[NodeType.MemberExpression] = (node) => {
		const object = childOf(Field.object, node);
		const property = childOf(Field.property, node);
		if (compresses && printsAsElements(node)) {
			// A joined `concat` prints its receiver's elements.
			skipNode(property);
			printNode(object);
			return;
		}
		const optional =
			tree.flag(Flag.optional, node) && !(compresses && neverNullish(object));
		if (pickedElement(node, 0) !== 0) {
			// The array printed as the element alone.
			skipNode(property);
			printNode(object);
			return;
		}
		if (compresses && !hasEdgeComments(property) && !isWriteTarget(node)) {
			const value =
				globalDefs === null ||
				(typeOf(parentAt(0)) === NodeType.UnaryExpression &&
					tree.textOf(Part.operator, parentAt(0)) === "delete")
					? undefined
					: globalDefOf(node);
			if (value !== undefined) {
				/** @type {JavascriptPrintContext} */ (writer).consume(object);
				printGlobalDef(node, value);
				return;
			}
			if (printsInfinity(node)) return;
			const element = inlinedElement(node);
			if (element !== undefined) {
				/** @type {JavascriptPrintContext} */ (writer).consume(object);
				skipNode(property);
				printValue(element, takesUnary(node));
				return;
			}
			const read = literalPropertyOf(node, true);
			if (read !== undefined) {
				// terser's `evaluate` of `"ab".length`, `[a, b].length` and `/a/.source`.
				/** @type {JavascriptPrintContext} */ (writer).consume(object);
				skipNode(property);
				printValue(read, false);
				return;
			}
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
				// A key an integer spells reads the same as that number.
				if (typeof key === "string" && INTEGER_KEY.test(key)) {
					skipNode(property);
					output.print(key);
				} else {
					printNode(property);
				}
				output.print("]");
				return;
			}
			// A key that is a name prints after a `.`, terser's `properties`.
			skipNode(property);
			name = key;
		} else if (tree.type(property) === NodeType.PrivateIdentifier) {
			if (optional) output.print("?");
			output.print(".#");
			output.printName(privateNameOf(property));
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
		// A name may print as a number too, folded or inlined in its place.
		if (
			(isNumber(object)
				? /** @type {number} */ (tree.value(object)) >= 0
				: output.literalLast && /\d$/.test(output.last())) &&
			!/[xa-f.)]/i.test(output.last()) &&
			!/^0(?:o|[0-7]+$)/i.test(output.last())
		) {
			output.print(".");
		}
		if (!optional) output.print(".");
		output.printName(name);
	};
	generators[NodeType.TemplateLiteral] = (node) => {
		const isTagged = typeOf(parentAt(0)) === NodeType.TaggedTemplateExpression;
		const count = tree.fieldCount(Field.quasis, node);
		const expressions = tree.fieldCount(Field.expressions, node);
		if (unreadTemplates.size !== 0 && unreadTemplates.has(node)) {
			printUnreadTemplate(node, expressions);
			return;
		}
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
				output.printTemplateStringChars(cooked);
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
					output.printTemplateStringChars(String(folded));
					continue;
				}
				const inner =
					compresses && !isTagged ? templateText(expression) : undefined;
				if (
					inner !== undefined &&
					// What printed last, an empty part leaving it as it was.
					joinsTemplate(
						String.fromCharCode(output.tail >>> 16, output.tail & 0xffff),
						inner.slice(1, -1)
					) &&
					joinsTemplate(
						inner.slice(1, -1),
						/** @type {{ cooked: string }} */ (
							tree.value(tree.field(i + 1, Field.quasis, node))
						).cooked
					)
				) {
					// A template within prints its parts in place, terser's `evaluate`.
					/** @type {JavascriptPrintContext} */ (writer).consume(expression);
					printTemplatePiece(expression, inner.slice(1, -1), 1);
					continue;
				}
				output.print("${");
				printNode(expression);
				output.print("}");
			}
		}
		output.print("`");
	};
	/**
	 * terser's `side_effects` of a template nobody reads: what each part
	 * runs prints in turn, those that may convert by their methods in a
	 * template of their own, one for each run of them, as the parts convert in order.
	 * @param {number} node a template `unreadTemplates` holds
	 * @param {number} expressions how many parts it has
	 * @returns {void}
	 */
	const printUnreadTemplate = (node, expressions) => {
		let printed = false;
		let open = false;
		for (let i = 0; i < expressions; i++) {
			const expression = itemOf(i, Field.expressions, node);
			const converts = !valueUnread(expression, node);
			if (!printsUnreadPart(expression, node)) {
				skipNode(expression);
				continue;
			}
			if (converts) {
				if (!open) {
					if (printed) output.comma();
					output.print("`");
					open = true;
				}
				output.print("${");
				printNode(expression);
				output.print("}");
			} else {
				if (open) {
					output.print("`");
					open = false;
				}
				if (printed) output.comma();
				// One opening the statement would read as a declaration or block.
				printNode(expression, !printed && opensAmbiguously(expression));
			}
			printed = true;
		}
		if (open) output.print("`");
	};
	/**
	 * @param {number} expression a part of a template `unreadTemplates` holds
	 * @param {number} node the template
	 * @returns {boolean} whether it prints: it converts, or runs something
	 */
	const printsUnreadPart = (expression, node) =>
		!valueUnread(expression, node) || !isPureValue(expression);

	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether it is a template `unreadTemplates` holds that prints more than one part, joined by commas
	 */
	const printsUnreadSequence = (node) => {
		if (unreadTemplates.size === 0 || !unreadTemplates.has(node)) return false;
		const expressions = tree.fieldCount(Field.expressions, node);
		let printed = 0;
		let converting = false;
		for (let i = 0; i < expressions; i++) {
			const expression = itemOf(i, Field.expressions, node);
			if (!printsUnreadPart(expression, node)) continue;
			// A run of converting parts prints as one template.
			const converts = !valueUnread(expression, node);
			if (converts && converting) continue;
			converting = converts;
			if (++printed > 1) return true;
		}
		return false;
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
			type === NodeType.ObjectExpression ||
			// A binary folded to a string or number, its text that alone.
			(compresses &&
				type === NodeType.BinaryExpression &&
				BARE_LITERAL.test(
					/** @type {JavascriptPrintContext} */ (writer).get(argument)
				))
		);
		if (parens) output.print("(");
		printNode(argument);
		if (parens) output.print(")");
	};
	generators[NodeType.YieldExpression] = (node) => {
		output.print(tree.flag(Flag.delegate, node) ? "yield*" : "yield");
		const argument = childOf(Field.argument, node);
		// A `yield` of nothing yields `undefined`.
		if (
			compresses &&
			argument !== 0 &&
			!tree.flag(Flag.delegate, node) &&
			!hasEdgeComments(argument) &&
			isUndefinedValue(argument)
		) {
			skipNode(argument);
		} else if (argument !== 0) {
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
			case NodeType.TemplateLiteral:
				return printsUnreadSequence(node);
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
				isIdentifierCode(
					isIdentifierCharacter,
					text.charCodeAt(offsets[node]),
					-1
				)
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
		// What printing notes, whatever the run finds first.
		swappedReturns.clear();
		andedIfs.clear();
		guardedBlocks.clear();
		equalityAt.clear();
		templateJoins.clear();
		negatedIntegers.clear();
		pushedNegations.clear();
		negatedOperations.clear();
		negatedEqualities.clear();
		const printOptions = /** @type {NodePrintOptions} */ (context.options);
		const { parsed, leading, sourceType } = printOptions;
		// A print `minify` did not read takes its format options as given.
		const format =
			printOptions.format &&
			withTerserAliases(printOptions.format, TERSER_ALIASES.format);
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
		readsPureAnnotations = compress ? compress.sideEffects !== false : false;
		printsConditionals = compress ? compress.conditionals !== false : false;
		dropsDeadCode = compress ? compress.deadCode !== false : false;
		keepsGlobalNames = Boolean(compress && compress.ie8);
		liftsKeys = Boolean(compress && compress.computedProps !== false);
		negatesCalls = Boolean(compress && compress.negateIife !== false);
		if (comparesConvert !== (compress && compress.pureConversions === false)) {
			comparesConvert = !comparesConvert;
			sideEffectsContext = undefined;
		}
		dropsSideEffectFree = readsPureAnnotations;
		if (compress) {
			// The one pass runs with webpack's improvements, which read these.
			// An engine that runs the edition's syntax has its built-ins too.
			const { ecma } = compress;
			builtinsEcma =
				compress.builtinsEcma !== undefined
					? compress.builtinsEcma
					: ecma !== undefined && ecma > 5
						? ecma
						: 5;
			unsafeBuiltIns = Boolean(compress.unsafe);
			pureNatives = undefined;
			readGlobals = globalsReadWithoutEffect(unsafeBuiltIns, builtinsEcma);
		}
		// `topRetain` implies `toplevel` where that is not given.
		dropsToplevel = Boolean(
			compress &&
			(compress.toplevel ||
				compress.module ||
				(compress.toplevel === undefined && compress.topRetain))
		);
		modulesToplevel = Boolean(compress && compress.module);
		keepsFunctionNames = Boolean(compress && compress.keepFnames);
		dropsDebugger = Boolean(compress && compress.dropDebugger !== false);
		dropsUnused = Boolean(compress && compress.unused !== false);
		inlinesFunctions = Boolean(
			compress && compress.inline !== false && compress.inline !== 0
		);
		keepsInfinity = Boolean(compress && compress.keepInfinity);
		pureFunctions =
			compress &&
			Array.isArray(compress.pureFuncs) &&
			compress.pureFuncs.length > 0
				? new Set(compress.pureFuncs)
				: null;
		droppedConsole =
			!compress || !compress.dropConsole
				? null
				: compress.dropConsole === true || new Set(compress.dropConsole);
		retainsTop = compress ? topRetainOf(compress.topRetain) : null;
		globalDefs = compress ? globalDefsOf(compress.globalDefs) : null;
		keepsClassNames = Boolean(compress && compress.keepClassnames);
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
		output = new MinifiedOutput(options, commentAccess);
		// A handler is never joined to other code, so its last `;` goes.
		output.functionBody = sourceType === "event-handler";
		beautifies = context.options.mode === "beautify";
		output.beautifies = beautifies;
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
			tree = /** @type {SyntaxTree} */ (
				require("./syntax-parser").parsedTree()
			);
			let program = node;
			for (let level = 0; at.ancestor(level) !== 0; level++) {
				program = at.ancestor(level);
			}
			startPrint(context, at.source(0, at.end(program)));
			foldedProgram = program;
			builtInWrites = null;
			// The parser makes the program last: one widening holds every node.
			if (program >= endState.length) widenNodeStates(program + 1);
			if (compresses && mangledNames !== null) {
				firstPrinted = node;
				findDropped(program);
				for (const [read, argument] of earlyArguments) {
					earlyDefuns.set(read, argument);
				}
				earlyArguments.clear();
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
			// Its call parenthesizes the value it prints as.
			!(reducing.size !== 0 && reducing.has(node)) &&
			parenthesized(node, 0) &&
			!(compresses && foldsBare(node));
		output.reset();
		if (parens) output.print("(");
		currentParens = parens;
		generate(node);
		// A name's `)` waits for the comments after it, taken as it is printed.
		let owesParenthesis = false;
		// What prints nothing leaves the comments after it to what follows.
		if (
			commentTokens !== null &&
			dropped[node] !== 1 &&
			!(
				tree.type(node) === NodeType.VariableDeclaration &&
				compresses &&
				printsNothing(node)
			)
		) {
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

// A number a radix prefix spells, and one whose digits underscores separate.
const PREFIXED_NUMBER =
	/\b0(?:[xX][\da-fA-F_]+|[oO][0-7_]+|[bB][01_]+)\b(?!n)/g;
const SEPARATED_NUMBER = /\b\d+(?:_\d+)+\b/g;

/**
 * Counts a source's characters with its escapes decoded and its numbers in
 * decimal, as they print, so writing `0x7` for `7` or `\u0061` for `a`
 * counts no differently; a number counts as the difference it makes.
 * @param {CharacterCounter} identifiers the counter
 * @param {string} source the source
 * @returns {void}
 */
const considerAsPrinted = (identifiers, source) => {
	const text = source.includes("\\u")
		? source.replace(
				/\\u\{([\da-fA-F]+)\}|\\u([\da-fA-F]{4})/g,
				/**
				 * @param {string} written the escape as written
				 * @param {string | undefined} braced the digits of a `\\u{…}` escape
				 * @param {string | undefined} hex the digits of a `\\uXXXX` escape
				 * @returns {string} the character the escape names
				 */
				(written, braced, hex) => {
					// one of the two groups always matches
					const code = Number.parseInt(
						/** @type {string} */ (braced || hex),
						16
					);
					return code <= 0x10ffff ? String.fromCodePoint(code) : written;
				}
			)
		: source;
	identifiers.consider(text, 1);
	// WHY: neither kind of number reaches into the other, both bounded by a
	// character no word holds, so each is found in the text as written.
	let written = "";
	let printed = "";
	/** @type {RegExpExecArray | null} */
	let match;
	PREFIXED_NUMBER.lastIndex = 0;
	while ((match = PREFIXED_NUMBER.exec(text)) !== null) {
		written += match[0];
		printed += String(Number(match[0].replace(/_/g, "")));
	}
	SEPARATED_NUMBER.lastIndex = 0;
	while ((match = SEPARATED_NUMBER.exec(text)) !== null) {
		written += match[0];
		printed += match[0].replace(/_/g, "");
	}
	if (written.length === 0) return;
	identifiers.consider(written, -1);
	identifiers.consider(printed, 1);
};

/**
 * The modules the one-pass minify reads: the parser and what reads and mangles
 * a source.
 * @returns {PrinterModules} the modules
 */
const createModules = () => {
	const parse = /** @type {ParseModule} */ (createParseTables());
	installParseTree(parse);
	const base54 = createFrequency(mergeSort);
	return {
		parse,
		prepareNodePrint: createPrepareNodePrint(
			parse,
			base54,
			createTreeMangler(parse, createScopeMangler(parse, base54))
		)
	};
};

/**
 * The modules, built on first use.
 * @returns {PrinterModules} the modules
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
	"keepClassnames",
	"keepFnames",
	"keep_classnames",
	"keep_fnames",
	"mangle",
	"module",
	"nameCache",
	"output",
	"parse",
	"safari10",
	"sourceType",
	"toplevel",
	"wrap"
]);

/**
 * Whether a JavaScript `SourceProcessor` print names an option the one-pass
 * minify reads, which then prints it; `sourceType` alone the plain print reads.
 * @param {JavascriptProcessOptions} options the process options
 * @returns {boolean} true where one other than `sourceType` is given
 */
const readsMinifyOptions = (options) => {
	for (const name of MINIFY_OPTION_NAMES) {
		if (
			name !== "sourceType" &&
			/** @type {MinifyOptions} */ (options)[name] !== undefined
		) {
			return true;
		}
	}
	return false;
};

/**
 * Reads, and where asked mangles, the source a JavaScript `SourceProcessor`
 * minifies, which the node printer then compresses as it prints.
 * @param {string} text the source
 * @param {JavascriptProcessOptions} options the process options, their `minify` ones read
 * @returns {{ tree: SyntaxTree, program: number, text: string, options: NodePrintOptions, inlined: Uint8Array | undefined, finish: (() => void) | undefined }} the tree, its program, the text it was read from, the print options, the nodes printed inside their parents and what to run once it is printed
 */
const prepareMinify = (text, options) => {
	/** @type {MinifyOptions} */
	let given = {};
	for (const name of MINIFY_OPTION_NAMES) {
		const value = /** @type {MinifyOptions} */ (options)[name];
		if (value !== undefined) {
			/** @type {Record<keyof MinifyOptions, MinifyOptions[keyof MinifyOptions]>} */ (
				given
			)[name] = value;
		}
	}
	// Named neither, the source is only printed, as a print without options is.
	if (given.compress === undefined && given.mangle === undefined) {
		given.compress = false;
		given.mangle = false;
	}
	given = fromTerserNames(given);
	// terser's older name for `format`, which it refuses beside it.
	if (given.output !== undefined) {
		if (given.format !== undefined) {
			throw new Error(
				"javascript syntax: `output` is the older name of `format`, so only one of them may be given"
			);
		}
		given.format = given.output;
		delete given.output;
	}
	const { parse, format } = given;
	if (
		(parse && parse.spidermonkey) ||
		(format &&
			(format.ast ||
				format.spidermonkey ||
				(hasOwn(format, "code") && !format.code)))
	) {
		throw new Error(
			"javascript syntax: the one-pass minify reads one source text and prints code: `parse.spidermonkey`, `format.ast`, `format.spidermonkey` and `format.code: false` are not supported"
		);
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
	const prepared = loadModules().prepareNodePrint(source, given);
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
 * @param {boolean} keepsGlobals whether a `var` outside every function is a global no rule drops or folds
 * @returns {void}
 */
const joinAssignedDeclarations = (tree, program, text, keepsGlobals) => {
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
	 * @param {number} declaration a `var` or `let` declaration
	 * @param {number} assignment an expression
	 * @returns {number} the declaration's last declarator when the expression is `name = value` setting it, its value running no code for a `let`, else 0
	 */
	const assignedDeclarator = (declaration, assignment) => {
		const last = tree.fieldCount(Field.declarations, declaration) - 1;
		const declarator = tree.field(last, Field.declarations, declaration);
		const id = tree.field(0, Field.id, declarator);
		if (
			tree.type(id) !== NodeType.Identifier ||
			tree.field(0, Field.init, declarator) !== 0 ||
			tree.type(assignment) !== NodeType.AssignmentExpression ||
			tree.textOf(Part.operator, assignment) !== "="
		) {
			return 0;
		}
		const target = tree.field(0, Field.left, assignment);
		const value = tree.field(0, Field.right, assignment);
		const name = tree.name(id);
		return tree.type(target) === NodeType.Identifier &&
			tree.name(target) === name &&
			!mentions(value, name) &&
			// A `let` set by its declarator is in its dead zone while the value runs.
			(tree.textOf(Part.kind, declaration) === "var" || runsNothing(value))
			? declarator
			: 0;
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
		if (
			(kind !== "var" && kind !== "let") ||
			tree.type(statement) !== NodeType.ExpressionStatement
		) {
			return false;
		}
		const assignment = tree.field(0, Field.expression, statement);
		const declarator = assignedDeclarator(declaration, assignment);
		if (declarator !== 0) {
			tree.set(declarator, "init", tree.field(0, Field.right, assignment));
			return true;
		}
		if (
			tree.type(assignment) !== NodeType.SequenceExpression ||
			/\/[*/]/.test(text.slice(tree.start(statement), tree.end(statement)))
		) {
			return false;
		}
		// `var a,b;a=f(),b=g()` reads as `var a=f(),b=g()`, in order.
		const count = tree.fieldCount(Field.expressions, assignment);
		let from = 0;
		let joined = 0;
		while (joined < count) {
			const item = tree.field(joined, Field.expressions, assignment);
			const index = setDeclaratorIndex(declaration, item, from);
			if (index === -1) break;
			tree.set(
				tree.field(index, Field.declarations, declaration),
				"init",
				tree.field(0, Field.right, item)
			);
			from = index + 1;
			joined++;
		}
		if (joined === 0) return false;
		if (joined === count) return true;
		/** @type {number[]} */
		const rest = [];
		for (let i = joined; i < count; i++) {
			rest.push(tree.field(i, Field.expressions, assignment));
		}
		if (rest.length === 1) tree.set(statement, "expression", rest[0]);
		else tree.set(assignment, "expressions", rest);
		return false;
	};
	/**
	 * @param {number} declaration a `var` or `let` declaration
	 * @param {number} assignment an expression
	 * @param {number} from the first declarator it may set
	 * @returns {number} the index of the declarator from `from` on the expression, `name = value`, sets, where it and every one after it is set to nothing and the value mentions none of them, else -1
	 */
	const setDeclaratorIndex = (declaration, assignment, from) => {
		if (
			tree.type(assignment) !== NodeType.AssignmentExpression ||
			tree.textOf(Part.operator, assignment) !== "="
		) {
			return -1;
		}
		const target = tree.field(0, Field.left, assignment);
		const value = tree.field(0, Field.right, assignment);
		if (tree.type(target) !== NodeType.Identifier) return -1;
		const name = tree.name(target);
		const count = tree.fieldCount(Field.declarations, declaration);
		let found = -1;
		for (let i = from; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, declaration);
			const id = tree.field(0, Field.id, declarator);
			if (
				tree.type(id) !== NodeType.Identifier ||
				tree.field(0, Field.init, declarator) !== 0 ||
				mentions(value, tree.name(id))
			) {
				return -1;
			}
			if (found === -1 && tree.name(id) === name) found = i;
		}
		return found !== -1 &&
			(tree.textOf(Part.kind, declaration) === "var" || runsNothing(value))
			? found
			: -1;
	};
	/**
	 * @param {number} statement a statement
	 * @param {number} before the statement before it
	 * @returns {boolean} whether the statement mentions a name the declaration before it declares
	 */
	const readsDeclared = (statement, before) => {
		if (tree.type(before) !== NodeType.VariableDeclaration) return false;
		const count = tree.fieldCount(Field.declarations, before);
		for (let i = 0; i < count; i++) {
			const id = tree.field(
				0,
				Field.id,
				tree.field(i, Field.declarations, before)
			);
			if (
				tree.type(id) === NodeType.Identifier &&
				mentions(statement, tree.name(id))
			) {
				return true;
			}
		}
		return false;
	};
	/**
	 * @param {number} node a node, 0 for none
	 * @param {string} name a name
	 * @returns {boolean} whether an assignment, update or `for`-`in` or `for`-`of` in it sets a name spelled so
	 */
	const sets = (node, name) => {
		if (node === 0) return false;
		const type = tree.type(node);
		const target =
			type === NodeType.AssignmentExpression ||
			type === NodeType.ForInStatement ||
			type === NodeType.ForOfStatement
				? tree.field(0, Field.left, node)
				: type === NodeType.UpdateExpression
					? tree.field(0, Field.argument, node)
					: 0;
		if (
			target !== 0 &&
			tree.type(target) === NodeType.Identifier &&
			tree.name(target) === name
		) {
			return true;
		}
		const fields = childFields[type];
		for (let f = 0; f < fields.length; f++) {
			const count = tree.fieldCount(fields[f], node);
			for (let i = 0; i < count; i++) {
				const child = tree.field(i, fields[f], node);
				if (child !== 0 && sets(child, name)) return true;
			}
		}
		return false;
	};
	/**
	 * @param {number} loop a loop
	 * @param {number} declaration a declaration
	 * @returns {boolean} whether the loop sets each name the declaration declares, past what a `for` sets up
	 */
	const setsEach = (loop, declaration) => {
		const count = tree.fieldCount(Field.declarations, declaration);
		const head = tree.type(loop) === NodeType.ForStatement;
		for (let i = 0; i < count; i++) {
			const id = tree.field(
				0,
				Field.id,
				tree.field(i, Field.declarations, declaration)
			);
			if (tree.type(id) !== NodeType.Identifier) return false;
			const name = tree.name(id);
			if (
				head
					? !sets(tree.field(0, Field.body, loop), name) &&
						!sets(tree.field(0, Field.test, loop), name) &&
						!sets(tree.field(0, Field.update, loop), name)
					: !sets(loop, name)
			) {
				return false;
			}
		}
		return true;
	};
	/**
	 * @param {number} statement a statement
	 * @returns {boolean} whether it is a `var` declaring names only
	 */
	const declaresOnly = (statement) => {
		if (
			tree.type(statement) !== NodeType.VariableDeclaration ||
			tree.textOf(Part.kind, statement) !== "var"
		) {
			return false;
		}
		const count = tree.fieldCount(Field.declarations, statement);
		for (let i = 0; i < count; i++) {
			if (
				tree.field(
					0,
					Field.init,
					tree.field(i, Field.declarations, statement)
				) !== 0
			) {
				return false;
			}
		}
		return true;
	};
	/**
	 * @param {number} node an expression
	 * @returns {boolean} whether an `in` operator is in it, outside every function
	 */
	const holdsIn = (node) => {
		const type = tree.type(node);
		if (
			type === NodeType.FunctionExpression ||
			type === NodeType.ArrowFunctionExpression ||
			type === NodeType.ClassExpression
		) {
			return false;
		}
		if (
			type === NodeType.BinaryExpression &&
			tree.textOf(Part.operator, node) === "in"
		) {
			return true;
		}
		const fields = childFields[type];
		for (let f = 0; f < fields.length; f++) {
			const count = tree.fieldCount(fields[f], node);
			for (let i = 0; i < count; i++) {
				const child = tree.field(i, fields[f], node);
				if (child !== 0 && holdsIn(child)) return true;
			}
		}
		return false;
	};
	/**
	 * terser's `join_vars` of a statement and the loop after it: `var a=0;for(;;)`
	 * reads as `for(var a=0;;)`, `x();for(;;)` as `for(x();;)` and
	 * `var a;for(a in b)` as `for(var a in b)`; `let a;for(a=0;;)` as `let a=0;for(;;)`.
	 * @param {number} statement a statement of a list
	 * @param {number} loop the statement after it
	 * @param {number} previous the statement before the loop, the statement or one joined into it
	 * @param {number} before the statement before the statement, 0 for none
	 * @param {boolean} afterVar whether a `var` is listed before the statement
	 * @param {boolean} global whether a `var` there declares a global no rule drops or folds
	 * @returns {boolean} whether the statement now prints in the loop's head, gone from the list
	 */
	const joinsLoop = (statement, loop, previous, before, afterVar, global) => {
		const loopType = tree.type(loop);
		const type = tree.type(statement);
		if (
			(loopType !== NodeType.ForStatement &&
				loopType !== NodeType.ForInStatement &&
				loopType !== NodeType.ForOfStatement) ||
			// No comment between them, which would print nowhere.
			!/^[\s;]*$/.test(text.slice(tree.end(previous), tree.start(loop))) ||
			// A name declared right before collapses into its read there only.
			(before !== 0 && readsDeclared(statement, before)) ||
			// A bare `var` joins the first `var` listed instead, shorter.
			(afterVar && declaresOnly(statement))
		) {
			return false;
		}
		if (type === NodeType.ExpressionStatement) {
			const expression = tree.field(0, Field.expression, statement);
			const test =
				loopType === NodeType.ForStatement
					? tree.field(0, Field.test, loop)
					: 0;
			// A directive stays where it is, a dead loop goes whole, and `in`
			// takes parentheses there.
			if (
				loopType !== NodeType.ForStatement ||
				tree.field(0, Field.init, loop) !== 0 ||
				tree.type(expression) === NodeType.Literal ||
				(test !== 0 &&
					tree.type(test) === NodeType.Literal &&
					!tree.value(test)) ||
				holdsIn(expression)
			) {
				return false;
			}
			tree.set(loop, "init", expression);
			return true;
		}
		if (type !== NodeType.VariableDeclaration) return false;
		const kind = tree.textOf(Part.kind, statement);
		// A name the loop never sets may fold or go where it is listed instead,
		// and a `var` right after another joins that one, shorter.
		if (
			kind === "var" &&
			((!global && !setsEach(loop, statement)) ||
				(before !== 0 &&
					tree.type(before) === NodeType.VariableDeclaration &&
					tree.textOf(Part.kind, before) === "var"))
		) {
			return false;
		}
		if (loopType !== NodeType.ForStatement) {
			if (
				kind !== "var" ||
				tree.fieldCount(Field.declarations, statement) !== 1
			) {
				return false;
			}
			const declarator = tree.field(0, Field.declarations, statement);
			const id = tree.field(0, Field.id, declarator);
			const left = tree.field(0, Field.left, loop);
			if (
				tree.type(id) !== NodeType.Identifier ||
				tree.field(0, Field.init, declarator) !== 0 ||
				tree.type(left) !== NodeType.Identifier ||
				tree.name(left) !== tree.name(id)
			) {
				return false;
			}
			tree.set(loop, "left", statement);
			return true;
		}
		if (kind !== "var" && kind !== "let") return false;
		const init = tree.field(0, Field.init, loop);
		if (init === 0) {
			if (kind !== "var") return false;
			tree.set(loop, "init", statement);
			return true;
		}
		if (tree.type(init) === NodeType.VariableDeclaration) {
			if (kind !== "var" || tree.textOf(Part.kind, init) !== "var") {
				return false;
			}
			/** @type {number[]} */
			const declarators = [];
			for (const owner of [statement, init]) {
				const count = tree.fieldCount(Field.declarations, owner);
				for (let i = 0; i < count; i++) {
					declarators.push(tree.field(i, Field.declarations, owner));
				}
			}
			tree.set(init, "declarations", declarators);
			return true;
		}
		const declarator = assignedDeclarator(statement, init);
		if (declarator === 0) return false;
		tree.set(declarator, "init", tree.field(0, Field.right, init));
		if (kind !== "var") {
			// A `let` scoped outside the loop keeps its place, the value moved to it.
			tree.set(loop, "init", 0);
			return false;
		}
		tree.set(loop, "init", statement);
		return true;
	};
	/**
	 * @param {number} owner a node listing statements in its `body`
	 * @param {boolean} global whether a `var` there declares a global no rule drops or folds
	 * @returns {void}
	 */
	const joinIn = (owner, global) => {
		const count = tree.fieldCount(Field.body, owner);
		/** @type {number[] | undefined} */
		let kept;
		let before = 0;
		let afterVar = false;
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
			if (
				i + 1 < count &&
				joinsLoop(
					statement,
					tree.field(i + 1, Field.body, owner),
					tree.field(i, Field.body, owner),
					before,
					afterVar,
					global
				)
			) {
				if (kept === undefined) {
					kept = [];
					for (let j = 0; j < i; j++) {
						kept.push(tree.field(j, Field.body, owner));
					}
				} else {
					kept.pop();
				}
				continue;
			}
			before = statement;
			if (
				tree.type(statement) === NodeType.VariableDeclaration &&
				tree.textOf(Part.kind, statement) === "var"
			) {
				afterVar = true;
			}
		}
		if (kept !== undefined) tree.set(owner, "body", kept);
	};
	/** @type {number[]} */
	const stack = [program];
	// Whether each node on the stack is outside every function and static block.
	/** @type {boolean[]} */
	const outside = [true];
	while (stack.length !== 0) {
		const node = /** @type {number} */ (stack.pop());
		const type = tree.type(node);
		const global =
			/** @type {boolean} */ (outside.pop()) &&
			type !== NodeType.FunctionDeclaration &&
			type !== NodeType.FunctionExpression &&
			type !== NodeType.ArrowFunctionExpression &&
			type !== NodeType.StaticBlock;
		if (
			type === NodeType.Program ||
			type === NodeType.BlockStatement ||
			type === NodeType.StaticBlock
		) {
			joinIn(node, global && keepsGlobals);
		}
		const fields = childFields[type];
		for (let f = 0; f < fields.length; f++) {
			const count = tree.fieldCount(fields[f], node);
			for (let i = 0; i < count; i++) {
				const child = tree.field(i, fields[f], node);
				if (child !== 0) {
					stack.push(child);
					outside.push(global);
				}
			}
		}
	}
};

/**
 * Makes a `keepFnames` or `keepClassnames` pattern a copy without `g` or
 * `y`, so the names it keeps do not hang on how often it was asked before.
 * @param {{ keepFnames?: boolean | RegExp, keepClassnames?: boolean | RegExp }} group an option group
 * @returns {void}
 */
const keepsNamesOnce = (group) => {
	for (const name of /** @type {const} */ (["keepFnames", "keepClassnames"])) {
		const pattern = group[name];
		if (pattern instanceof RegExp && (pattern.global || pattern.sticky)) {
			group[name] = new RegExp(
				pattern.source,
				pattern.flags.replace(/[gy]/g, "")
			);
		}
	}
};

module.exports = {
	prepareMinify,
	readsMinifyOptions,
	printer,
	FORMAT_DEFAULTS,
	IGNORED_FORMAT_OPTIONS,
	createUnicode
};
