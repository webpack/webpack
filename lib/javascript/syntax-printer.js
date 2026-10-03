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

/* eslint-disable camelcase, new-cap -- terser's own API, which this speaks */

// cspell:ignore Mihai, Bazon, DEFNODE, endpos, endcol, sequencesize, lvalues, binop, loopcontrol, symbolref, funs, jridgewell, DEFMETHOD, Defun, defun, defuns, fnames, funarg, classnames, mangleable, unmangleable, NOINLINE, privatename, argnames, thedef, argname, bcatch, bfinally, MANGLEPROP, nlb, punc, Funarg, propmangle, preferrably, nondeferred, fargs, domprops, noin, Noin, DEFPRINT, defprint, dgimsuyv, nokeyword

/** @typedef {Record<string, EXPECTED_ANY>} MinifierModules terser's own modules */

/**
 * What a source is minified with. The keys the minifier reads are named; the
 * rest are open, so an option a caller passes through is not refused here.
 * @typedef {object} MinifyOptions
 * @property {boolean | Record<string, EXPECTED_ANY>=} compress what the compressor does, or false to leave the tree as read
 * @property {boolean | Record<string, EXPECTED_ANY>=} mangle which names are renamed, or false to keep them
 * @property {Record<string, EXPECTED_ANY>=} format how the output is written
 * @property {Record<string, EXPECTED_ANY>=} output the older spelling of `format`, which may not be named beside it
 * @property {Record<string, EXPECTED_ANY>=} parse how the source is read
 * @property {boolean | Record<string, EXPECTED_ANY>=} sourceMap whether a source map is written, and how
 * @property {boolean=} module whether the source is a module
 * @property {number=} ecma which edition the output may use
 * @property {boolean=} toplevel whether top-level names may be renamed or dropped
 * @property {Record<string, EXPECTED_ANY> | null=} nameCache names held across assets, which this writes into
 * @property {boolean | RegExp=} keep_classnames which class names survive
 * @property {boolean | RegExp=} keep_fnames which function names survive
 * @property {boolean=} ie8 whether the output works around that engine
 * @property {boolean=} safari10 whether the output works around that engine
 */

/**
 * What a minify answers with: the code it wrote, the map it was asked for, and
 * the tree where the format options asked for one instead of code.
 * @typedef {object} MinifyOutput
 * @property {string=} code the minified source
 * @property {string | Record<string, EXPECTED_ANY>=} map the source map, as a string or an object
 * @property {Record<string, EXPECTED_ANY> | null=} decoded_map the map with its mappings read
 * @property {Node=} ast the tree, where `format.ast` asked for it
 */

/**
 * The sources one minify reads: one source, several, or each under the name it
 * is reported by; a tree stands in for a source already read.
 * @typedef {string | string[] | Record<string, string> | Node} MinifySources
 */

/** @typedef {(sources: MinifySources, options?: MinifyOptions) => Promise<MinifyOutput>} Minify what one call to the minifier takes and answers */

/** @typedef {{ minify: Minify, phases: string[], corrections?: { enabled: boolean }, improvements?: { enabled: boolean }, modules: MinifierModules }} Minifier what a caller minifies with, the switches of its corrections and improvements, and the modules it is built from */

/**
 * One step building webpack's minifier, installing what it implements onto
 * the modules.
 * @typedef {{ name: string, install: (modules: MinifierModules) => void }} Phase
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
		if (!properties.startToken) properties.startToken = orig.startToken;
		if (!properties.endToken) properties.endToken = orig.endToken;
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
 * @param {Scope | ManglingScope} scope a scope, terser's or a mangling one
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

/**
 * terser's `format_mangler_options`: the mangle options, defaulted, their
 * reserved names a set that always holds `arguments`.
 * @param {EXPECTED_ANY} given the mangle options given
 * @param {EXPECTED_ANY} base54 the default source of mangled names
 * @returns {EXPECTED_ANY} the options
 */
const formatMangleOptions = (given, base54) => {
	const options = defaults(given, {
		eval: false,
		nth_identifier: base54,
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
 * One of terser's AST nodes: the fields and methods the phases share typed, the
 * rest open.
 * @typedef {{
 * TYPE: string,
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
 * thedef: SymbolDefinition,
 * definition(): SymbolDefinition,
 * fixed_value(): EXPECTED_ANY,
 * tail_node(): NodeShape,
 * clone(deep?: boolean): NodeShape,
 * transform(walker: EXPECTED_ANY, inList?: boolean): NodeShape,
 * optimize(compressor: CompressorShape): NodeShape,
 * has_side_effects(compressor: CompressorShape): boolean,
 * may_throw(compressor: CompressorShape): boolean,
 * drop_side_effect_free(compressor: CompressorShape, firstInStatement?: boolean): NodeShape | null,
 * is_constant_expression(scope?: NodeShape): boolean | "f",
 * evaluate(compressor: CompressorShape): EXPECTED_ANY,
 * negate(compressor: CompressorShape, firstInStatement?: boolean): NodeShape,
 * size(compressor?: CompressorShape, stack?: EXPECTED_ANY): number,
 * print_to_string(options?: Record<string, EXPECTED_ANY>): string,
 * [key: string]: EXPECTED_ANY,
 * [key: symbol]: EXPECTED_ANY,
 * }} NodeShape
 */
/** @typedef {NodeShape} Node one of terser's AST nodes */

/**
 * What the class of a node type is called: the root is `SyntaxNode`, and every
 * other class is its type with `Node` after it.
 * @param {string} type the node type
 * @returns {string} the class's name
 */
const classNameOf = (type) => (type === "Node" ? "SyntaxNode" : `${type}Node`);

// terser's empty slot: a node field holding no node reads `null`, which the
// fields' type leaves out so that every read of a present node stays typed.
const NO_NODE = /** @type {Node} */ (/** @type {unknown} */ (null));
/** @typedef {new (props?: Record<string, EXPECTED_ANY>) => Node} NodeClass one of terser's node classes */
/** @typedef {Record<string, EXPECTED_ANY>} NodeProps the properties a node is built from */
/** @typedef {EXPECTED_FUNCTION & { prototype: EXPECTED_ANY }} NodeCheck one of terser's node classes, read only by `instanceof`, which leaves the operand's type as it is */
/** @typedef {NodeCheck & { DEFMETHOD: (name: string, method: EXPECTED_FUNCTION) => void }} NodeDefinable one of terser's node classes, given methods by name */
/** @typedef {(value: unknown) => boolean} NodeTest whether a value is a node of one class, or of a class extending it */

// WHY: a bound `isPrototypeOf` is a builtin call where its caller is not yet
// optimized, and TurboFan lowers it to the prototype walk `instanceof` makes;
// a closure doing `instanceof` costs a frame, and shared by all, megamorphic.
/**
 * The predicate `createAst` names `is<Class>` for each class, so a reader asks
 * what a node is without naming the class it is built from.
 * @param {NodeCheck} Type the class
 * @returns {NodeTest} whether a value is a node of the class
 */
const nodeTest = (Type) =>
	/** @type {NodeTest} */ (Object.prototype.isPrototypeOf.bind(Type.prototype));
/** @typedef {Record<PropertyKey, EXPECTED_ANY>} Token one of terser's tokens */
/** @typedef {{ type: string, value: string, nlb?: boolean }} Comment a comment terser's tokenizer read */
/** @typedef {Record<string, EXPECTED_ANY>} FormatOptions terser's `format` options, defaulted */
/** @typedef {(this: PrintNode, comment: Comment) => boolean} CommentFilter which comments are printed, `this` the node they are read off */
/**
 * What the output stream reads off a node for comments.
 * @typedef {object} NodeAccess
 * @property {(node: PrintNode) => Token | null | undefined} startToken the token a node starts at
 * @property {(node: PrintNode) => Token | null | undefined} endToken the token a node ends at
 * @property {(node: PrintNode) => PrintNode | null | undefined} keywordValue a return's, throw's, await's or yield's value, which no line break may precede
 * @property {(node: PrintNode) => PrintNode | null | undefined} leftEdgeChild the child the comment walk continues into below a node on a keyword value's leftmost edge
 * @property {(node: PrintNode) => boolean} isStatement whether a node is a statement, after which a line comment may follow
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
	_destroy_ast: false
};

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
 * @param {FormatOptions} options defaulted format options
 * @returns {FormatOptions} the same, each layout option at its default
 */
const minifiedOptions = (options) => {
	for (const name of IGNORED_FORMAT_OPTIONS) {
		options[name] = FORMAT_DEFAULTS[name];
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
 * What the output stream reads off the ESTree tree `toPrintTree` builds, each
 * answer the one terser's accessors gave for the node it was converted from.
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
 * @returns {new (options: FormatOptions, readonly: boolean, nodeAccess: NodeAccess) => EXPECTED_ANY} the stream class
 */
const createMinifiedOutput = () => {
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
	 * @param {PrintNode | null | undefined} value a returned, awaited or yielded value
	 * @param {Set<Comment | Comment[]>} printed the comments and comment lists printed so far
	 * @param {NodeAccess} nodeAccess what is read off the value's nodes
	 * @returns {boolean} whether its leftmost edge holds comments not yet printed
	 */
	const leftEdgeComments = (value, printed, nodeAccess) => {
		for (let inner = value; inner; inner = nodeAccess.leftEdgeChild(inner)) {
			const start = nodeAccess.startToken(inner);
			const text = start && start.comments_before;
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
	 * @param {FormatOptions} options defaulted format options
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
		 * @param {FormatOptions} options defaulted format options
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
				if (
					name !== false &&
					(token.type === "name" || token.type === "privatename")
				) {
					name = token.value;
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
			scope.body.body.length = 0;
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
			if (this.readonly) return;
			const { nodeAccess } = this;
			const start = nodeAccess.startToken(node);
			if (!start) return;
			// There cannot be a newline between return/yield and its value.
			const keywordWithValue = nodeAccess.keywordValue(node);
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
				!leftEdgeComments(keywordWithValue, printed, nodeAccess)
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
			for (
				let inner = keywordWithValue;
				inner;
				inner = nodeAccess.leftEdgeChild(inner)
			) {
				const innerStart = nodeAccess.startToken(inner);
				const text = innerStart && innerStart.comments_before;
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
		 * @param {PrintNode} node the node just printed
		 * @param {boolean=} tail true for the comments inside an empty body
		 * @returns {void}
		 */
		append_comments(node, tail) {
			if (!this.appendsComments) return;
			const token = this.nodeAccess.endToken(node);
			if (!token) return;
			const printed = this.printed_comments;
			/** @type {Comment[] | undefined} */
			const comments = token[tail ? "comments_before" : "comments_after"];
			if (!comments || printed.has(comments)) return;
			if (!(
				this.nodeAccess.isStatement(node) ||
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
 * Installs webpack's stream for minified output. terser prints a tree twice
 * per minify — once for the mangler's character frequencies, once for the
 * result — and both go through here.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installOutput = (modules) => {
	// Shared with the phases after this one, which print into it.
	modules.MinifiedOutput = createMinifiedOutput();
};

// A child as `nodeClasses` lists it: `?` where it may be absent, `~` where it
// may not be a node, `^` a key reached where computed, `*` where it is a list,
// `+` one holding null for a hole, `f.body` a block's list.
const NODE_CHILD = /^(\?)?([*~+^])?([A-Za-z_]+(?:\.body)?)$/;

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
					: field === "body" || field === "body.body"
						? `walkList(${value}, visitor);`
						: `{ var list${index} = ${value}; for (var i${index} = 0, len${index} = list${index}.length; i${index} < len${index}; i${index}++) ${reach(`list${index}[i${index}]`)} }`;
			} else if (kind === "+") {
				statement = backwards
					? `{ var i${index} = ${value}.length; while (i${index}--) if (${value}[i${index}] !== null) ${reach(`${value}[i${index}]`)} }`
					: `{ var list${index} = ${value}; for (var i${index} = 0, len${index} = list${index}.length; i${index} < len${index}; i${index}++) if (list${index}[i${index}] !== null) ${reach(`list${index}[i${index}]`)} }`;
			} else if (kind === "~") {
				statement = `if (isSyntaxNode(${value})) ${reach(value)}`;
			} else if (kind === "^") {
				statement = `if (this.computed) ${reach(value)}`;
			} else {
				statement = reach(value);
			}
			return optional ? `if (${value}) ${statement}` : statement;
		})
		.join("\n");

/**
 * Every node class's own walk and backwards push, built from the children
 * `nodeClasses` lists for it, created once rather than per visit.
 * @param {MinifierModules} modules terser's modules
 * @returns {NodeWalk[]} one per class with either of its own
 */
const buildNodeWalks = ({ ast }) => {
	const { nodeClasses } = require("./syntax-printer-data");

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
		 * @returns {EXPECTED_ANY} the function, closing over `isSyntaxNode`
		 */
		const compile = (body, parameter) =>
			// eslint-disable-next-line no-new-func
			new Function(
				"isSyntaxNode",
				"walkList",
				`"use strict"; return function (${parameter}) {${body}};`
			)(ast.isSyntaxNode, walkList);
		walks.push({
			prototype: ast[classNameOf(type)].prototype,
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
 * Installs webpack's tree walk. It is terser's, less the two closures terser
 * allocated per visited node: the children's walk and the `descend` a visitor
 * is handed, which here is one function per walker descending the current node.
 * @param {MinifierModules} modules terser's modules
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
	const { SyntaxNode } = modules.ast;
	SyntaxNode.prototype._walk = walkLeaf;
	/**
	 * @this {Node} the node walked
	 * @param {EXPECTED_ANY} visitor the walker
	 * @returns {boolean} whether the visitor stopped the walk
	 */
	SyntaxNode.prototype.walk = function walk(visitor) {
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
 * Installs webpack's own copies of the methods terser's `ast.js` writes by hand
 * on its node classes and its `TreeWalker`: cloning, computed keys, the names
 * a declaration binds, and the walker's look-ups of its stack.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installNodes = (modules) => {
	const { ast, parse, utils } = modules;
	const {
		isArrowNode,
		BlockNode,
		isBreakNode,
		CallNode,
		ClassNode,
		isClassPrivatePropertyNode,
		isClassPropertyNode,
		ClassStaticBlockNode,
		isClassStaticBlockNode,
		isConciseMethodNode,
		ConstantNode,
		DefaultAssignNode,
		isDefaultAssignNode,
		DestructuringNode,
		isDestructuringNode,
		isDirectiveNode,
		isExpansionNode,
		isForNode,
		isForInNode,
		isForOfNode,
		IterationStatementNode,
		isIterationStatementNode,
		LabelNode,
		LabeledStatementNode,
		isLabeledStatementNode,
		LambdaNode,
		isLambdaNode,
		isLoopControlNode,
		SyntaxNode,
		isPrivateMethodNode,
		isReturnNode,
		ScopeNode,
		isScopeNode,
		isSwitchNode,
		SymbolDeclarationNode,
		isSymbolDeclarationNode,
		isSymbolFunargNode,
		isSymbolRefNode,
		isThisNode,
		ToplevelNode,
		isToplevelNode,
		VarDefLikeNode,
		TreeTransformer,
		TreeWalker
	} = ast;
	const Node = SyntaxNode.prototype;

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
	BlockNode.prototype.clone = cloneBlockScope;
	IterationStatementNode.prototype.clone = cloneBlockScope;
	ClassStaticBlockNode.prototype.clone = cloneBlockScope;
	/**
	 * A copy whose `break` and `continue` reach the copied label.
	 * @this {Node} a labeled statement
	 * @param {boolean=} deep whether its children are cloned too
	 * @returns {Node} the copy
	 */
	LabeledStatementNode.prototype.clone = function clone(deep) {
		const copy = this._clone(deep);
		if (deep) {
			const { label } = copy;
			const definition = this.label;
			copy.walk(
				new TreeWalker((/** @type {Node} */ node) => {
					if (
						isLoopControlNode(node) &&
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
	ScopeNode.prototype.clone = function clone(deep, toplevel) {
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
	ScopeNode.prototype.get_defun_scope = function get_defun_scope() {
		/** @type {Node} */
		let self = this;
		while (self.is_block_scope()) self = self.parent_scope;
		return self;
	};
	/**
	 * @this {Node} a scope
	 * @returns {boolean} whether `eval` or `with` can reach its names
	 */
	ScopeNode.prototype.pinned = function pinned() {
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
				if (isDirectiveNode(node) && node.directive === "$ORIG") {
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
	ToplevelNode.prototype.wrap_commonjs = function wrap_commonjs(name) {
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
	ToplevelNode.prototype.wrap_enclose = function wrap_enclose(argsValues) {
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
	LambdaNode.prototype.args_as_names = function args_as_names() {
		const { params } = this;
		if (
			params.every((/** @type {Node} */ argument) =>
				isSymbolDeclarationNode(argument)
			)
		) {
			return params;
		}
		/** @type {Node[]} */
		const out = [];
		for (const argument of params) {
			if (isDestructuringNode(argument)) {
				out.push(...argument.all_symbols());
			} else if (isExpansionNode(argument)) {
				out.push(...argument.argument.all_symbols());
			} else if (isDefaultAssignNode(argument)) {
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
	LambdaNode.prototype.is_braceless = function is_braceless() {
		return isReturnNode(this.body.body[0]) && this.body.body[0].argument;
	};
	/**
	 * @this {Node} a function
	 * @returns {number} its `length`, the parameters before the first default or rest
	 */
	LambdaNode.prototype.length_property = function length_property() {
		let length = 0;
		for (const argument of this.params) {
			if (isSymbolFunargNode(argument) || isDestructuringNode(argument)) {
				length++;
			}
		}
		return length;
	};
	/**
	 * @this {Node} a pattern
	 * @returns {Node[]} the names it binds, those of functions in its defaults aside
	 */
	DestructuringNode.prototype.all_symbols = function all_symbols() {
		/** @type {Node[]} */
		const out = [];
		this.walk(
			new TreeWalker((/** @type {Node} */ node) => {
				if (isSymbolDeclarationNode(node)) out.push(node);
				if (isLambdaNode(node)) return true;
			})
		);
		return out;
	};
	/**
	 * @this {Node} a default
	 * @returns {Node[]} the names its target binds
	 */
	DefaultAssignNode.prototype.all_symbols = function all_symbols() {
		return this.left.all_symbols();
	};
	/**
	 * @this {Node} a name declared
	 * @returns {Node[]} itself
	 */
	SymbolDeclarationNode.prototype.all_symbols = function all_symbols() {
		return [this];
	};
	/**
	 * @this {Node} a declarator
	 * @returns {Node[]} the names it declares
	 */
	VarDefLikeNode.prototype.declarations_as_names =
		function declarations_as_names() {
			return isSymbolDeclarationNode(this.id)
				? [this.id]
				: this.id.all_symbols();
		};
	/**
	 * @this {Node} a call
	 * @returns {void}
	 */
	CallNode.prototype.initialize = function initialize() {
		if (this._annotations === null || this._annotations === undefined) {
			this._annotations = 0;
		}
	};
	// A `pure_funcs` function is handed the call and reads terser's names,
	// the callee's included.
	Object.defineProperty(CallNode.prototype, "args", {
		configurable: true,
		/**
		 * @this {Node} a call
		 * @returns {Node[]} its arguments
		 */
		get() {
			return this.arguments;
		}
	});
	Object.defineProperty(CallNode.prototype, "expression", {
		configurable: true,
		/**
		 * @this {Node} a call
		 * @returns {Node} what it calls
		 */
		get() {
			return this.callee;
		}
	});
	Object.defineProperty(modules.ast.PropAccessNode.prototype, "expression", {
		configurable: true,
		/**
		 * @this {Node} a property read
		 * @returns {Node} what it reads the property off
		 */
		get() {
			return this.object;
		}
	});
	/**
	 * @this {Node} a label
	 * @returns {void}
	 */
	LabelNode.prototype.initialize = function initialize() {
		this.references = [];
		this.thedef = this;
	};
	/**
	 * @this {Node} a constant
	 * @returns {unknown} its value
	 */
	ConstantNode.prototype.getValue = function getValue() {
		return this.value;
	};

	/**
	 * Walks what a class runs as it is defined: its heritage, static blocks,
	 * computed keys and static field values.
	 * @this {Node} a class
	 * @param {EXPECTED_ANY} visitor the walker
	 * @returns {void}
	 */
	ClassNode.prototype.visit_nondeferred_class_parts =
		function visit_nondeferred_class_parts(visitor) {
			if (this.superClass) this.superClass._walk(visitor);
			for (const prop of this.body.body) {
				if (isClassStaticBlockNode(prop)) {
					prop._walk(visitor);
					continue;
				}
				if (prop.computed) {
					visitor.push(prop);
					prop.key._walk(visitor);
					visitor.pop();
				}
				if (
					(isClassPrivatePropertyNode(prop) && prop.static && prop.value) ||
					(isClassPropertyNode(prop) && prop.static && prop.value)
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
	ClassNode.prototype.visit_deferred_class_parts =
		function visit_deferred_class_parts(visitor) {
			for (const prop of this.body.body) {
				if (isConciseMethodNode(prop) || isPrivateMethodNode(prop)) {
					prop.walk(visitor);
				} else if (
					(isClassPropertyNode(prop) && !prop.static && prop.value) ||
					(isClassPrivatePropertyNode(prop) && !prop.static && prop.value)
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
	ClassNode.prototype.is_self_referential = function is_self_referential() {
		const thisId = this.id && this.id.definition().id;
		let found = false;
		let classThis = true;
		this.visit_nondeferred_class_parts(
			new TreeWalker(
				(/** @type {Node} */ node, /** @type {() => void} */ descend) => {
					if (found) return true;
					if (isThisNode(node)) return (found = classThis);
					if (isSymbolRefNode(node)) {
						return (found = node.definition().id === thisId);
					}
					if (isLambdaNode(node) && !isArrowNode(node)) {
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
	 * @param {NodeTest} test what the node is
	 * @returns {Node | undefined} the nearest node on the stack passing the test
	 */
	Walker.find_parent = function find_parent(test) {
		const { stack } = this;
		for (let i = stack.length; --i >= 0;) {
			if (test(stack[i])) return stack[i];
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
			if (isLambdaNode(node)) return false;
			if (
				isIterationStatementNode(node) &&
				// The parts of a `for` loop that run only once.
				!(isForNode(node) && child === node.init) &&
				!((isForInNode(node) || isForOfNode(node)) && child === node.right)
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
			if (isToplevelNode(node)) return node;
			if (isLambdaNode(node)) return node;
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
		/** @type {Node[] | undefined} */
		const body = isScopeNode(node) ? ast.bodyOf(node) : undefined;
		if (body) {
			for (let i = 0; i < body.length; ++i) {
				const statement = body[i];
				if (!isDirectiveNode(statement)) break;
				if (statement.directive === type) return statement;
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
					isLabeledStatementNode(parent) &&
					parent.label.name === node.label.name
				) {
					return parent.body;
				}
			}
		} else {
			for (let i = stack.length; --i >= 0;) {
				const parent = stack[i];
				if (
					isIterationStatementNode(parent) ||
					(isBreakNode(node) && isSwitchNode(parent))
				) {
					return parent;
				}
			}
		}
	};
};

/**
 * Installs webpack's `global_defs` replacement, which swaps each global the
 * option names for the value it gives, and `drop_console`.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installDefines = (modules) => {
	const { ast } = modules;
	const {
		ArrayNode,
		ChainNode,
		isConstantNode,
		DotNode,
		ImportMetaNode,
		SyntaxNode,
		isSyntaxNode,
		ObjectNode,
		ObjectKeyValNode,
		isCallNode,
		isNewNode,
		isPropAccessNode,
		SymbolDeclarationNode,
		SymbolPropertyNode,
		SymbolRefNode,
		ToplevelNode,
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
		if (isSyntaxNode(value)) {
			// Anything but a constant may hold functions, so it is never shared.
			const given = /** @type {Node} */ (value);
			const node = isConstantNode(given) ? given : given.clone(true);
			return makeNode(node.CTOR, orig, node);
		}
		if (Array.isArray(value)) {
			return makeNode(ArrayNode, orig, {
				elements: value.map((element) => toNode(element, orig))
			});
		}
		if (value && typeof value === "object") {
			/** @type {Node[]} */
			const properties = [];
			for (const key in value) {
				if (Object.prototype.hasOwnProperty.call(value, key)) {
					properties.push(
						makeNode(ObjectKeyValNode, orig, {
							key: new SymbolPropertyNode({ name: key }),
							value: toNode(
								/** @type {Record<string, unknown>} */ (value)[key],
								orig
							),
							computed: false,
							kind: "init",
							method: false,
							shorthand: false
						})
					);
				}
			}
			return makeNode(ObjectNode, orig, { properties });
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
	SyntaxNode.prototype._find_defs = function _find_defs() {
		return undefined;
	};
	/**
	 * @this {Node} an optional chain
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} suffix the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	ChainNode.prototype._find_defs = function _find_defs(compressor, suffix) {
		return this.expression._find_defs(compressor, suffix);
	};
	/**
	 * @this {Node} a property read
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} suffix the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	DotNode.prototype._find_defs = function _find_defs(compressor, suffix) {
		return this.object._find_defs(
			compressor,
			`.${this.property.name}${suffix}`
		);
	};
	/**
	 * terser's asks whether the name is global, which throws where it has no
	 * definition, and then gives nothing either way.
	 * @this {Node} a name declared
	 * @returns {undefined} nothing
	 */
	SymbolDeclarationNode.prototype._find_defs = function _find_defs() {
		this.global();
		return undefined;
	};
	/**
	 * @this {Node} a name read
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} suffix the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	SymbolRefNode.prototype._find_defs = function _find_defs(compressor, suffix) {
		if (!this.global()) return undefined;
		return defined(this, compressor, this.name + suffix);
	};
	/**
	 * @this {Node} `import.meta`
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @param {string} suffix the properties read off it
	 * @returns {Node | undefined} what `global_defs` gives it
	 */
	ImportMetaNode.prototype._find_defs = function _find_defs(
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
	ToplevelNode.prototype.resolve_defines = function resolve_defines(
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
						if (!isPropAccessNode(parent)) break;
						if (parent.object !== child) break;
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
	ToplevelNode.prototype.drop_console = function drop_console(options) {
		const isArray = Array.isArray(options);
		const tt = new TreeTransformer((/** @type {Node} */ self) => {
			if (!isCallNode(self) || isNewNode(self)) return;
			const exp = self.callee;
			if (!isPropAccessNode(exp)) return;
			let name = exp.object;
			let property = ast.terserProperty(exp);
			let depth = 2;
			while (ast.expressionOf(name)) {
				property = ast.terserProperty(name);
				name = ast.expressionOf(name);
				depth++;
			}
			if (isArray && !options.includes(property)) return;
			if (isUndeclaredRef(name) && name.name === "console") {
				if (
					depth === 3 &&
					!["call", "apply"].includes(ast.terserProperty(exp)) &&
					isUsedInExpression(tt)
				) {
					// A used call to a method of `console.log`, as in
					// `console.log.bind(console)`; `call` and `apply` return undefined.
					exp.object = makeEmptyFunction(self);
					setFlag(exp.object, SQUEEZED);
					self.arguments = [];
				} else {
					return makeVoid0(self);
				}
			}
		});
		return this.transform(tt);
	};
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
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const markNodeKinds = ({ ast }) => {
	if (
		Object.prototype.hasOwnProperty.call(ast.SyntaxNode.prototype, NODE_KIND)
	) {
		return;
	}
	ast.SyntaxNode.prototype[NODE_KIND] = 0;
	for (const [ctor, bit] of [
		[ast.ScopeNode, KIND_SCOPE],
		[ast.LambdaNode, KIND_LAMBDA],
		[ast.ClassNode, KIND_CLASS],
		[ast.ToplevelNode, KIND_TOPLEVEL],
		[ast.DirectiveNode, KIND_DIRECTIVE],
		[ast.ObjectPropertyNode, KIND_OBJECT_PROPERTY]
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
	ClassBody: "ClassBody",
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
				node.exported_names[0].local.name === "*" &&
				!node.exported_names[0].local.quote
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
			? node.imported.name === "*" && !node.imported.quote
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
		((node.TYPE === "SymbolMethod" || node.TYPE === "SymbolProperty") &&
			parent &&
			parent.quote)
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
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const markEstreeTypes = ({ ast }) => {
	if (
		Object.prototype.hasOwnProperty.call(ast.SyntaxNode.prototype, ESTREE_TYPE)
	) {
		return;
	}
	markNodeKinds({ ast });
	for (const type of Object.keys(ESTREE_TYPES)) {
		ast[classNameOf(type)].prototype[ESTREE_TYPE] = ESTREE_TYPES[type];
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
 * @param {MinifierModules} modules terser's modules
 * @returns {[EXPECTED_ANY, (self: Node, tw: EXPECTED_ANY) => void][]} each class and its descend
 */
const transformDescends = ({ ast, utils }) => {
	const { isSyntaxNode, NumberNode } = ast;
	const doList = utils.MAP;

	/**
	 * `doList` over a list holding null for a hole, each hole kept in place.
	 * @param {(Node | null)[]} list the nodes and holes
	 * @param {EXPECTED_ANY} tw the transformer
	 * @returns {(Node | null)[]} them transformed
	 */
	const doListWithHoles = (list, tw) => {
		if (!list.includes(null)) return doList(/** @type {Node[]} */ (list), tw);
		/** @type {(Node | null)[]} */
		const result = [];
		/** @type {Node[]} */
		let run = [];
		for (const item of list) {
			if (item !== null) {
				run.push(item);
				continue;
			}
			if (run.length > 0) result.push(...doList(run, tw));
			result.push(null);
			run = [];
		}
		if (run.length > 0) result.push(...doList(run, tw));
		return result;
	};
	return [
		[ast.SyntaxNode, () => {}],
		[
			ast.LabeledStatementNode,
			(self, tw) => {
				self.label = self.label.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.SimpleStatementNode,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
			}
		],
		[
			ast.BlockNode,
			(self, tw) => {
				self.body = doList(self.body, tw);
			}
		],
		[
			ast.DoNode,
			(self, tw) => {
				self.body = self.body.transform(tw);
				self.test = self.test.transform(tw);
			}
		],
		[
			ast.WhileNode,
			(self, tw) => {
				self.test = self.test.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.ForNode,
			(self, tw) => {
				if (self.init) self.init = self.init.transform(tw);
				if (self.test) self.test = self.test.transform(tw);
				if (self.update) self.update = self.update.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.ForInNode,
			(self, tw) => {
				self.left = self.left.transform(tw);
				self.right = self.right.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.WithNode,
			(self, tw) => {
				self.object = self.object.transform(tw);
				self.body = self.body.transform(tw);
			}
		],
		[
			ast.ExitNode,
			(self, tw) => {
				if (self.argument) self.argument = self.argument.transform(tw);
			}
		],
		[
			ast.LoopControlNode,
			(self, tw) => {
				if (self.label) self.label = self.label.transform(tw);
			}
		],
		[
			ast.IfNode,
			(self, tw) => {
				self.test = self.test.transform(tw);
				self.consequent = self.consequent.transform(tw);
				if (self.alternate) {
					self.alternate = self.alternate.transform(tw);
				}
			}
		],
		[
			ast.SwitchNode,
			(self, tw) => {
				self.discriminant = self.discriminant.transform(tw);
				self.cases = doList(self.cases, tw);
			}
		],
		[
			ast.SwitchBranchNode,
			(self, tw) => {
				self.consequent = doList(self.consequent, tw);
			}
		],
		[
			ast.CaseNode,
			(self, tw) => {
				self.test = self.test.transform(tw);
				self.consequent = doList(self.consequent, tw);
			}
		],
		[
			ast.TryNode,
			(self, tw) => {
				self.block = self.block.transform(tw);
				if (self.handler) self.handler = self.handler.transform(tw);
				if (self.finalizer) self.finalizer = self.finalizer.transform(tw);
			}
		],
		[
			ast.CatchNode,
			(self, tw) => {
				if (self.param) self.param = self.param.transform(tw);
				self.body.body = doList(self.body.body, tw);
			}
		],
		[
			ast.DefinitionsLikeNode,
			(self, tw) => {
				self.declarations = doList(self.declarations, tw);
			}
		],
		[
			ast.VarDefLikeNode,
			(self, tw) => {
				self.id = self.id.transform(tw);
				if (self.init) self.init = self.init.transform(tw);
			}
		],
		[
			ast.DestructuringNode,
			(self, tw) => {
				if (self.is_array) {
					self.elements = doListWithHoles(self.elements, tw);
				} else {
					self.properties = doList(self.properties, tw);
				}
			}
		],
		[
			ast.LambdaNode,
			(self, tw) => {
				if (self.id) self.id = self.id.transform(tw);
				self.params = doList(self.params, tw, false);
				self.body.body = doList(self.body.body, tw);
			}
		],
		[
			ast.CallNode,
			(self, tw) => {
				self.callee = self.callee.transform(tw);
				self.arguments = doList(self.arguments, tw, false);
			}
		],
		[
			ast.SequenceNode,
			(self, tw) => {
				const result = doList(self.expressions, tw);
				self.expressions = result.length
					? result
					: [new NumberNode({ value: 0 })];
			}
		],
		[
			ast.PropAccessNode,
			(self, tw) => {
				self.object = self.object.transform(tw);
			}
		],
		[
			ast.SubNode,
			(self, tw) => {
				self.object = self.object.transform(tw);
				self.property = self.property.transform(tw);
			}
		],
		[
			ast.ChainNode,
			(self, tw) => {
				self.expression = self.expression.transform(tw);
			}
		],
		[
			ast.YieldNode,
			(self, tw) => {
				if (self.argument) self.argument = self.argument.transform(tw);
			}
		],
		[
			ast.AwaitNode,
			(self, tw) => {
				self.argument = self.argument.transform(tw);
			}
		],
		[
			ast.UnaryNode,
			(self, tw) => {
				self.argument = self.argument.transform(tw);
			}
		],
		[
			ast.BinaryNode,
			(self, tw) => {
				self.left = self.left.transform(tw);
				self.right = self.right.transform(tw);
			}
		],
		[
			ast.PrivateInNode,
			(self, tw) => {
				self.left = self.left.transform(tw);
				self.right = self.right.transform(tw);
			}
		],
		[
			ast.ConditionalNode,
			(self, tw) => {
				self.test = self.test.transform(tw);
				self.consequent = self.consequent.transform(tw);
				self.alternate = self.alternate.transform(tw);
			}
		],
		[
			ast.ArrayNode,
			(self, tw) => {
				self.elements = doListWithHoles(self.elements, tw);
			}
		],
		[
			ast.ObjectNode,
			(self, tw) => {
				self.properties = doList(self.properties, tw);
			}
		],
		[
			ast.ObjectPropertyNode,
			(self, tw) => {
				if (isSyntaxNode(self.key)) self.key = self.key.transform(tw);
				if (self.value) self.value = self.value.transform(tw);
			}
		],
		[
			ast.ObjectKeyValNode,
			(self, tw) => {
				if (self.computed) self.key = self.key.transform(tw);
				if (self.value) self.value = self.value.transform(tw);
			}
		],
		[
			ast.ClassNode,
			(self, tw) => {
				if (self.id) self.id = self.id.transform(tw);
				if (self.superClass) self.superClass = self.superClass.transform(tw);
				self.body.body = doList(self.body.body, tw);
			}
		],
		[
			ast.ClassStaticBlockNode,
			(self, tw) => {
				self.body = doList(self.body, tw);
			}
		],
		[
			ast.ExpansionNode,
			(self, tw) => {
				self.argument = self.argument.transform(tw);
			}
		],
		[
			ast.NameMappingNode,
			(self, tw) => {
				if (self.imported) self.imported = self.imported.transform(tw);
				if (self.exported) self.exported = self.exported.transform(tw);
				self.local = self.local.transform(tw);
			}
		],
		[
			ast.ImportNode,
			(self, tw) => {
				if (self.imported_name) {
					self.imported_name = self.imported_name.transform(tw);
				}
				if (self.imported_names) doList(self.imported_names, tw);
				self.source = self.source.transform(tw);
			}
		],
		[
			ast.DynamicImportNode,
			(self, tw) => {
				self.args = doList(self.args, tw);
			}
		],
		[
			ast.ExportNode,
			(self, tw) => {
				if (self.exported_definition) {
					self.exported_definition = self.exported_definition.transform(tw);
				}
				if (self.exported_value) {
					self.exported_value = self.exported_value.transform(tw);
				}
				if (self.exported_names) doList(self.exported_names, tw);
				if (self.source) self.source = self.source.transform(tw);
			}
		],
		[
			ast.TemplateStringNode,
			(self, tw) => {
				self.segments = doList(self.segments, tw);
			}
		],
		[
			ast.PrefixedTemplateStringNode,
			(self, tw) => {
				self.tag = self.tag.transform(tw);
				self.quasi = self.quasi.transform(tw);
			}
		]
	];
};

/**
 * Installs webpack's tree transform. It is terser's, but each class gets a
 * `transform` of its own, the walker's stack reads a node's class from bits on
 * it, and the compressor skips a node it already squeezed without pushing it.
 * @param {MinifierModules} modules terser's modules
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
		} else if (
			(kind & KIND_DIRECTIVE) !== 0 &&
			!this.directives[node.directive]
		) {
			this.directives[node.directive] = node;
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

/**
 * Installs webpack's compressor dispatch. It is terser's `before`, the hook
 * every node of a pass goes through, and `in_computed_key`, which the
 * optimizers ask of every ancestor, reading a node's class from its kind bits.
 * @param {MinifierModules} modules terser's modules
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
	(func.generator ? 1 : 0) + (func.async ? 6 : 0);

/**
 * @param {boolean} isStatic whether a class member is static
 * @returns {number} what `static ` adds to it
 */
const staticSize = (isStatic) => (isStatic ? 7 : 0);

/**
 * terser's `first_in_statement`: whether the node a walk is at is the first
 * thing its statement prints, so an object or function there needs parentheses.
 * @param {MinifierModules} modules terser's modules
 * @returns {(stack: { parent: (n?: number) => Node | undefined }) => boolean | undefined} the test
 */
const createFirstInStatement = ({ ast }) => {
	const {
		isBinaryNode,
		isCallNode,
		isChainNode,
		isConditionalNode,
		isDotNode,
		isNewNode,
		isPrefixedTemplateStringNode,
		isSequenceNode,
		isStatementNode,
		isSubNode,
		isUnaryPostfixNode
	} = ast;
	return (stack) => {
		let node = stack.parent(-1);
		for (let i = 0, parent; (parent = stack.parent(i)); i++) {
			if (isStatementNode(parent) && ast.bodyOf(parent) === node) {
				return true;
			}
			if (
				(isSequenceNode(parent) && parent.expressions[0] === node) ||
				(isCallNode(parent) && !isNewNode(parent) && parent.callee === node) ||
				(isPrefixedTemplateStringNode(parent) && parent.tag === node) ||
				(isDotNode(parent) && parent.object === node) ||
				(isSubNode(parent) && parent.object === node) ||
				(isChainNode(parent) && parent.expression === node) ||
				(isConditionalNode(parent) && parent.test === node) ||
				(isBinaryNode(parent) && parent.left === node) ||
				(isUnaryPostfixNode(parent) && parent.argument === node)
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
 * Installs webpack's `size`, how many bytes the compressor reckons a node
 * prints to. It is terser's walk, but its stacks are kept from one call to the
 * next rather than built, with the compressor's stack copied, on every call.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installSize = (modules) => {
	const { ast } = modules;
	const {
		isArrowNode,
		isAssignNode,
		isBinaryNode,
		isCallNode,
		isConditionalNode,
		isDestructuringNode,
		isPrivateInNode,
		isPropAccessNode,
		SyntaxNode,
		isSymbolNode,
		isUnaryNode
	} = ast;
	const { PRECEDENCE } = /** @type {{ PRECEDENCE: Record<string, number> }} */ (
		modules.parse
	);
	/** @type {EXPECTED_ANY} */
	let mangleOptions;
	const firstInStatement = createFirstInStatement(modules);

	/**
	 * terser's `needs_parens` of an assignment, where the walk is at.
	 * @param {Node} node the assignment
	 * @param {Node} parent what holds it, if anything
	 * @returns {boolean} whether it prints in parentheses
	 */
	const assignNeedsParens = (node, parent) =>
		isUnaryNode(parent) ||
		(isBinaryNode(parent) && !isAssignNode(parent)) ||
		(isCallNode(parent) && parent.callee === node) ||
		(isConditionalNode(parent) && parent.test === node) ||
		(isPropAccessNode(parent) && parent.object === node) ||
		// `({a, b} = c)`, an object destructuring assignment.
		(isDestructuringNode(node.left) && node.left.is_array === false);

	/**
	 * terser's `needs_parens` of a binary expression, or of an assignment
	 * (`assignNeedsParens`), where the walk is at.
	 * @param {Node} node the binary expression
	 * @param {Node} parent what holds it, if anything
	 * @returns {boolean} whether it prints in parentheses
	 */
	const binaryNeedsParens = (node, parent) => {
		if (isAssignNode(node)) return assignNeedsParens(node, parent);
		if (isCallNode(parent) && parent.callee === node) return true;
		if (isUnaryNode(parent)) return true;
		if (isPropAccessNode(parent) && parent.object === node) {
			return true;
		}
		const { operator } = node;
		if (isBinaryNode(parent)) {
			const parentOperator = parent.operator;
			// `??` mixed with `||` or `&&` is a syntax error without parens.
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
					(node === parent.right || parentOperator === "**"))
			) {
				return true;
			}
		}
		if (isPrivateInNode(parent)) {
			const parentPrecedence = PRECEDENCE.in;
			const precedence = PRECEDENCE[operator];
			return (
				parentPrecedence > precedence ||
				(parentPrecedence === precedence && node === parent.right)
			);
		}
		return false;
	};

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
		return staticSize(this.static);
	}
	/**
	 * @this {Node} a class field
	 * @returns {number} its size
	 */
	function fieldSize() {
		return staticSize(this.static) + (this.value ? 1 : 0);
	}
	/**
	 * @this {Node} a declaration list
	 * @returns {number} its size, for a keyword of four letters
	 */
	function definitionsSize() {
		return 4 + listOverhead(this.declarations);
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
			return 2 + this.directive.length;
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
				listOverhead(this.params) +
				listOverhead(this.body.body)
			);
		},
		Function(info) {
			return (
				(firstInStatement(info) ? 2 : 0) +
				lambdaModifiers(this) +
				12 +
				listOverhead(this.params) +
				listOverhead(this.body.body)
			);
		},
		Defun() {
			return (
				lambdaModifiers(this) +
				13 +
				listOverhead(this.params) +
				listOverhead(this.body.body)
			);
		},
		Arrow() {
			let argumentsAndArrow = 2 + listOverhead(this.params);
			if (!(this.params.length === 1 && isSymbolNode(this.params[0]))) {
				argumentsAndArrow += 2;
			}
			const bodyOverhead = this.is_braceless()
				? 0
				: listOverhead(this.body.body) + 2;
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
			return this.argument ? 7 : 6;
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
			return 8 + listOverhead(this.cases);
		},
		Case() {
			return 5 + listOverhead(this.consequent);
		},
		Default() {
			return 8 + listOverhead(this.consequent);
		},
		Try: () => 3,
		Catch() {
			return 7 + listOverhead(this.body.body) + (this.param ? 2 : 0);
		},
		Finally() {
			return 7 + listOverhead(this.body);
		},
		Var: definitionsSize,
		Let: definitionsSize,
		Const() {
			return 6 + listOverhead(this.declarations);
		},
		Using() {
			return (this.await ? 6 : 0) + 6 + listOverhead(this.declarations);
		},
		VarDefLike() {
			return this.init ? 1 : 0;
		},
		NameMapping() {
			return this.local ? 4 : 0;
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
			if (this.source) size += 5;
			return size;
		},
		Call() {
			return (this.optional ? 4 : 2) + listOverhead(this.arguments);
		},
		New() {
			return 6 + listOverhead(this.arguments);
		},
		Sequence() {
			return listOverhead(this.expressions);
		},
		Dot() {
			return this.property.name.length + (this.optional ? 2 : 1);
		},
		DotHash() {
			return this.property.name.length + (this.optional ? 3 : 2);
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
				isUnaryNode(this.right) &&
				this.right.operator === this.operator
			) {
				size += 1;
			}
			if (binaryNeedsParens(this, /** @type {Node} */ (info.parent()))) {
				size += 2;
			}
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
			// A key not computed is a name no walk reaches, as terser's string was.
			return (this.computed ? 0 : this.key.name.length) + 1;
		},
		ObjectGetter() {
			return 5 + staticSize(this.static);
		},
		ObjectSetter() {
			return 5 + staticSize(this.static);
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
			return (this.id ? 8 : 7) + (this.superClass ? 8 : 0);
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
		ast[classNameOf(type)].prototype._size = sizes[type];
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
					if (isArrowNode(current) && current.is_braceless()) {
						total += current.body.body[0].argument._size(info);
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
	SyntaxNode.prototype.size = function size(compressor, ancestors) {
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

/**
 * Installs webpack's `equivalent_to`, whether two trees print the same. It is
 * terser's walk of both side by side, its two stacks kept between calls.
 * @param {MinifierModules} modules terser's modules
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
	 * Whether two lists hold their holes at the same places, which a walk skips
	 * where terser compared a hole node of its own.
	 * @param {(Node | null)[]} first a list
	 * @param {(Node | null)[]} second another
	 * @returns {boolean} whether they are as long, with holes alike
	 */
	const sameHoles = (first, second) => {
		if (first.length !== second.length) return false;
		for (let i = 0; i < first.length; i++) {
			if ((first[i] === null) !== (second[i] === null)) return false;
		}
		return true;
	};
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
		Directive(other) {
			return this.directive === other.directive;
		},
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
				same(this.test, other.test) &&
				same(this.update, other.update)
			);
		},
		ForIn: passThrough,
		ForOf: passThrough,
		With: passThrough,
		Toplevel: passThrough,
		Expansion: passThrough,
		Lambda(other) {
			return this.generator === other.generator && this.async === other.async;
		},
		Destructuring(other) {
			return (
				this.is_array === other.is_array &&
				sameHoles(ast.namesOf(this), ast.namesOf(other))
			);
		},
		PrefixedTemplateString: passThrough,
		TemplateString: passThrough,
		TemplateSegment: sameValue,
		Jump: passThrough,
		LoopControl: passThrough,
		Await: passThrough,
		Yield(other) {
			return this.delegate === other.delegate;
		},
		If(other) {
			return same(this.alternate, other.alternate);
		},
		Switch: passThrough,
		SwitchBranch: passThrough,
		Try(other) {
			return (
				this.block === other.block &&
				same(this.handler, other.handler) &&
				same(this.finalizer, other.finalizer)
			);
		},
		Catch(other) {
			return same(this.param, other.param);
		},
		Finally: passThrough,
		DefinitionsLike: passThrough,
		VarDefLike(other) {
			return same(this.init, other.init);
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
				this.source === other.source &&
				this.is_default === other.is_default
			);
		},
		Call: passThrough,
		Sequence: passThrough,
		PropAccess: passThrough,
		Chain: passThrough,
		Dot(other) {
			return (
				this.property.name === other.property.name &&
				Boolean(this.quote) === Boolean(other.quote)
			);
		},
		DotHash(other) {
			return this.property.name === other.property.name;
		},
		Unary(other) {
			return this.operator === other.operator;
		},
		Binary(other) {
			return this.operator === other.operator;
		},
		PrivateIn: passThrough,
		Conditional: passThrough,
		Array(other) {
			return sameHoles(this.elements, other.elements);
		},
		Object: passThrough,
		ObjectProperty: passThrough,
		ObjectKeyVal(other) {
			return (
				(this.computed
					? this.key === other.key
					: !other.computed && this.key.name === other.key.name) &&
				this.quote === other.quote
			);
		},
		ObjectSetter: sameStatic,
		ObjectGetter: sameStatic,
		ConciseMethod: sameStatic,
		PrivateMethod: sameStatic,
		Class(other) {
			return same(this.id, other.id) && same(this.superClass, other.superClass);
		},
		ClassProperty: sameStatic,
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
		ast[classNameOf(type)].prototype[SHALLOW_EQUAL] = shallow[type];
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
	ast.SyntaxNode.prototype.equivalent_to = function equivalent_to(node) {
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

/**
 * Installs terser's `hoist_properties`, behind webpack's guard: terser rebuilds
 * every list under a scope each time the compressor reaches it, so a walk
 * first looks for a declaration it could hoist.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installHoist = ({ ast, common, utils }) => {
	const {
		isExpansionNode,
		isObjectNode,
		isPropAccessNode,
		ScopeNode,
		SymbolRefNode,
		isSymbolRefNode,
		isSymbolUsingNode,
		isToplevelNode,
		VarDefNode,
		isVarDefNode,
		TreeTransformer,
		terserKey,
		terserProperty,
		walk,
		walk_abort: walkAbort
	} = ast;
	const { get_simple_key: getSimpleKey } = common;
	const { MAP, make_node: makeNode } = utils;

	/**
	 * terser's transform: each object a declaration holds, read only through its
	 * properties, split into one variable per property.
	 * @param {Scope} scope the scope
	 * @param {EXPECTED_ANY} compressor the compressor
	 * @returns {Scope} the scope, transformed
	 */
	const hoist = (scope, compressor) => {
		const topRetain =
			(isToplevelNode(scope) && compressor.top_retain) || (() => false);
		/** @type {Map<number, Map<string, SymbolDefinition>>} */
		const definitionsById = new Map();
		const hoister = new TreeTransformer(
			/**
			 * @this {EXPECTED_ANY} the transformer
			 * @param {EXPECTED_ANY} node the node
			 * @param {EXPECTED_FUNCTION} descend what transforms its children
			 * @returns {EXPECTED_ANY} its replacement, if any
			 */
			function before(node, descend) {
				if (isVarDefNode(node)) {
					const symbol = node.id;
					let definition;
					let value;
					if (
						symbol.scope === scope &&
						!isSymbolUsingNode(symbol) &&
						(definition = symbol.definition()).escaped !== 1 &&
						!definition.assignments &&
						!definition.direct_access &&
						!definition.single_use &&
						!compressor.exposed(definition) &&
						!topRetain(definition) &&
						(value = symbol.fixed_value()) === node.init &&
						isObjectNode(value) &&
						!value.properties.some(
							(/** @type {EXPECTED_ANY} */ property) =>
								isExpansionNode(property) || property.computed
						)
					) {
						descend(node, this);
						/** @type {Map<string, SymbolDefinition>} */
						const definitions = new Map();
						/** @type {Node[]} */
						const assignments = [];
						for (const { key, value: propertyValue } of value.properties) {
							const propertyScope = hoister.find_scope();
							const hoisted = scope.create_symbol(symbol.CTOR, {
								source: symbol,
								scope: propertyScope,
								conflict_scopes: new Set([
									propertyScope,
									...symbol
										.definition()
										.references.map(
											(/** @type {EXPECTED_ANY} */ reference) => reference.scope
										)
								]),
								tentative_name: `${symbol.name}_${terserKey(key)}`
							});
							definitions.set(String(terserKey(key)), hoisted.definition());
							assignments.push(
								makeNode(VarDefNode, node, {
									id: hoisted,
									init: propertyValue
								})
							);
						}
						definitionsById.set(definition.id, definitions);
						return MAP.splice(assignments);
					}
				} else if (isPropAccessNode(node) && isSymbolRefNode(node.object)) {
					const definitions = definitionsById.get(node.object.definition().id);
					if (definitions) {
						const definition = /** @type {SymbolDefinition} */ (
							definitions.get(String(getSimpleKey(terserProperty(node))))
						);
						const reference = makeNode(SymbolRefNode, node, {
							name: definition.name,
							scope: node.object.scope,
							thedef: definition
						});
						reference.reference({});
						return reference;
					}
				}
			}
		);
		return scope.transform(hoister);
	};

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
			if (isVarDefNode(node)) {
				const symbol = node.id;
				let definition;
				// terser's own tests, up to the first that is not a plain read.
				if (
					symbol.scope === scope &&
					!isSymbolUsingNode(symbol) &&
					(definition = symbol.definition()).escaped !== 1 &&
					!definition.assignments &&
					!definition.direct_access &&
					!definition.single_use &&
					!compressor.exposed(definition)
				) {
					hoistable = true;
					return walkAbort;
				}
			} else if (isPropAccessNode(node) && isSymbolRefNode(node.object)) {
				// Read as terser's transform reads it, so a missing definition throws.
				// eslint-disable-next-line no-unused-expressions
				node.object.definition().id;
			}
		});
		return hoistable ? hoist(this, compressor) : this;
	}

	ScopeNode.DEFMETHOD("hoist_properties", hoistProperties);
};

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
 * Installs webpack's scope analysis. It is terser's, each pass run by a visitor
 * that tracks only the parents and `"use strict"` it reads, rather than a
 * `TreeWalker` recording every directive and handing each node a callback.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installScope = (modules) => {
	const { ast, parse } = modules;
	const {
		ArrowNode,
		isArrowNode,
		BlockNode,
		isCallNode,
		isCatchNode,
		ClassNode,
		isClassNode,
		isDefClassNode,
		isDefunNode,

		isDestructuringNode,

		isDirectiveNode,
		isExportNode,
		isForNode,
		isForInNode,
		isForOfNode,
		isFunctionNode,

		isImportNode,
		IterationStatementNode,

		isLabelNode,
		isLabelRefNode,

		isLabeledStatementNode,
		LambdaNode,
		isLambdaNode,

		isLoopControlNode,
		isNameMappingNode,
		SyntaxNode,
		isSyntaxNode,
		ScopeNode,
		isScopeNode,
		SequenceNode,
		isSwitchNode,
		SwitchBranchNode,
		SymbolNode,
		isSymbolNode,
		isSymbolBlockDeclarationNode,
		isSymbolCatchNode,
		isSymbolClassNode,
		isSymbolConstNode,
		isSymbolDefClassNode,

		isSymbolDeclarationNode,
		isSymbolDefunNode,
		isSymbolExportNode,
		SymbolFunargNode,
		isSymbolFunargNode,
		isSymbolImportNode,
		isSymbolLambdaNode,
		isSymbolLetNode,
		isSymbolMethodNode,
		isSymbolRefNode,
		isSymbolUsingNode,
		isSymbolVarNode,
		ToplevelNode,
		isToplevelNode,

		isWithNode,
		walk,
		walk_abort: walkAbort
	} = ast;
	const { js_error: jsError } = parse;
	const template = stringTemplate;

	// Which of the classes the analysis tests each node class is, read off its
	// prototype once rather than by an `instanceof` chain per visited node.
	const KIND = Symbol("scope kind");
	/** @type {[NodeTest, number][]} */
	const KIND_BITS = [
		[isLambdaNode, SCOPE_LAMBDA],
		[isClassNode, SCOPE_CLASS],
		[isDirectiveNode, SCOPE_DIRECTIVE],
		[isDestructuringNode, SCOPE_DESTRUCTURING],
		[isScopeNode, SCOPE_SCOPE],
		[isLabeledStatementNode, SCOPE_LABELED],
		[isWithNode, SCOPE_WITH],
		[isSymbolNode, SCOPE_SYMBOL],
		[isLabelNode, SCOPE_LABEL],
		[isSymbolDeclarationNode, SCOPE_DECLARES],
		[isLabelRefNode, SCOPE_DECLARES],
		[isExportNode, SCOPE_MODULE_STATEMENT],
		[isImportNode, SCOPE_MODULE_STATEMENT],
		[isLoopControlNode, SCOPE_LOOP_CONTROL],
		[isSymbolRefNode, SCOPE_REFERENCE],
		[isSymbolCatchNode, SCOPE_CATCH]
	];
	const classes = [ast.SyntaxNode];
	while (classes.length !== 0) {
		const ctor = classes.pop();
		classes.push(...ctor.SUBCLASSES);
		const probe = Object.create(ctor.prototype);
		let kind = 0;
		for (const [test, bit] of KIND_BITS) {
			if (test(probe)) kind |= bit;
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
			isSymbolCatchNode(definition.orig[0]) &&
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
			if (isSymbolRefNode(symbol)) {
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
		for (const argument of lambda.params) walk(argument, visit);
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
		if (!isToplevelNode(toplevel)) {
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
			if ((definition.export = isExportNode(node) ? EXPORT_KEEP_NAME : 0)) {
				const exported = node.exported_definition;
				if (
					(isDefunNode(exported) || isDefClassNode(exported)) &&
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
				} else if (kind & SCOPE_DIRECTIVE && node.directive === "use strict") {
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
				// The scope copies its block's fields, a switch's cases or a catch's
				// statements as its `body`.
				node.block_scope = scope = new ScopeNode(
					isSwitchNode(node) || isCatchNode(node)
						? {
								startToken: node.startToken,
								endToken: node.endToken,
								block_scope: node.block_scope,
								body: isSwitchNode(node) ? node.cases : node.body.body
							}
						: node
				);
				scope._block_scope = true;
				scope.init_scope_vars(saveScope);
				scope.uses_with = saveScope.uses_with;
				scope.uses_eval = saveScope.uses_eval;
				if (
					options.safari10 &&
					(isForNode(node) || isForInNode(node) || isForOfNode(node))
				) {
					forScopes.push(scope);
				}
				if (isSwitchNode(node)) {
					// The switched expression belongs to the scope around the switch.
					const blockScope = scope;
					scope = saveScope;
					node.discriminant.walk(definer);
					scope = blockScope;
					for (let i = 0; i < node.cases.length; i++) {
						node.cases[i].walk(definer);
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
			} else if (isSymbolLambdaNode(node)) {
				defun.def_function(node, node.name === "arguments" ? undefined : defun);
			} else if (isSymbolDefunNode(node)) {
				// A function declaration belongs to the scope around its own.
				const closestScope = defun.parent_scope;
				node.scope = strict ? closestScope : closestScope.get_defun_scope();
				markExport(node.scope.def_function(node, defun), 1);
			} else if (isSymbolClassNode(node)) {
				markExport(defun.def_variable(node, defun), 1);
			} else if (isSymbolImportNode(node)) {
				scope.def_variable(node);
			} else if (isSymbolDefClassNode(node)) {
				markExport(
					(node.scope = defun.parent_scope).def_function(node, defun),
					1
				);
			} else if (
				isSymbolVarNode(node) ||
				isSymbolLetNode(node) ||
				isSymbolConstNode(node) ||
				isSymbolUsingNode(node) ||
				isSymbolCatchNode(node)
			) {
				const blockDeclaration = isSymbolBlockDeclarationNode(node);
				const definition = blockDeclaration
					? scope.def_variable(node, null)
					: defun.def_variable(
							node,
							isSymbolVarNode(node) && !isSymbolFunargNode(node)
								? null
								: undefined
						);
				if (
					!definition.orig.every((/** @type {Node} */ symbol) => {
						if (symbol === node) return true;
						if (blockDeclaration) return isSymbolLambdaNode(symbol);
						return !(
							isSymbolLetNode(symbol) ||
							isSymbolConstNode(symbol) ||
							isSymbolUsingNode(symbol)
						);
					})
				) {
					jsError(
						`"${node.name}" is redeclared`,
						node.startToken.file,
						node.startToken.line,
						node.startToken.col,
						node.startToken.pos
					);
				}
				if (!isSymbolFunargNode(node)) markExport(definition, 2);
				if (defun !== scope) {
					node.mark_enclosed();
					const found = scope.find_variable(node);
					if (node.thedef !== found) {
						node.thedef = found;
						node.reference();
					}
				}
			} else if (isLabelRefNode(node)) {
				const symbol = labels.get(node.name);
				if (!symbol) {
					throw new Error(
						template("Undefined label {name} [{line},{col}]", {
							name: node.name,
							line: node.startToken.line,
							col: node.startToken.col
						})
					);
				}
				node.thedef = symbol;
			}
			if (kind & SCOPE_MODULE_STATEMENT && !isToplevelNode(scope)) {
				jsError(
					`"${node.TYPE}" statement may only appear at the top level`,
					node.startToken.file,
					node.startToken.line,
					node.startToken.col,
					node.startToken.pos
				);
			}
			return false;
		};

		this.walk(definer);

		// Pass 2: resolve each reference, and find `eval`.
		if (isToplevelNode(this)) this.globals = new Map();
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
				if (name === "eval" && isCallNode(parent())) {
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
					(isNameMappingNode(parent()) &&
						/** @type {Node} */ (parent(1)).source) ||
					!(symbol = node.scope.find_variable(name))
				) {
					symbol = toplevel.def_global(node);
					if (isSymbolExportNode(node)) {
						symbol.export = EXPORT_KEEP_NAME;
					}
				} else if (isLambdaNode(symbol.scope) && name === "arguments") {
					symbol.scope.get_defun_scope().uses_arguments = true;
				}
				node.thedef = symbol;
				node.reference();
				if (
					node.scope.is_block_scope() &&
					!isSymbolBlockDeclarationNode(symbol.orig[0])
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
				if (isSymbolCatchNode(node)) {
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
			if (!this.fixed || isSyntaxNode(this.fixed)) return this.fixed;
			return this.fixed();
		}

		/**
		 * @param {EXPECTED_ANY=} options the mangle options
		 * @returns {EXPECTED_ANY} whether its name has to be kept
		 */
		unmangleable(options = {}) {
			const first = this.orig[0];
			return (
				(this.global && !options.toplevel) ||
				this.export & EXPORT_KEEP_NAME ||
				this.undeclared ||
				(!options.eval && /** @type {Scope} */ (this.scope).pinned()) ||
				((isSymbolLambdaNode(first) || isSymbolDefunNode(first)) &&
					keepName(options.keep_fnames, first.name)) ||
				isSymbolMethodNode(first) ||
				((isSymbolClassNode(first) || isSymbolDefClassNode(first)) &&
					keepName(options.keep_classnames, first.name))
			);
		}
	}
	SymbolDef.next_id = 1;
	// Shared with the phases after this one, which make definitions too.
	modules.webpackScope = { SymbolDef };

	/**
	 * @this {Scope} the toplevel
	 * @param {Node} node a reference to a name nothing declares
	 * @returns {SymbolDefinition} the global it reads
	 */
	ToplevelNode.prototype.def_global = function def_global(node) {
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
	}
	ScopeNode.prototype.init_scope_vars = initScopeVars;
	/**
	 * @this {Scope} a function
	 * @param {Scope=} parentScope the scope enclosing it
	 * @returns {void}
	 */
	LambdaNode.prototype.init_scope_vars = function init_scope_vars(parentScope) {
		initScopeVars.call(this, parentScope);
		this.uses_arguments = false;
		this.def_variable(
			new SymbolFunargNode({
				name: "arguments",
				startToken: this.startToken,
				endToken: this.endToken
			})
		);
	};
	/**
	 * @this {Scope} an arrow function, which has no `arguments` of its own
	 * @param {Scope=} parentScope the scope enclosing it
	 * @returns {void}
	 */
	ArrowNode.prototype.init_scope_vars = function init_scope_vars(parentScope) {
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
	ScopeNode.prototype.conflicting_def_shallow = conflictingDefShallow;
	/**
	 * @this {Scope} a scope
	 * @param {string} name a name
	 * @returns {EXPECTED_ANY} truthy where the name is taken here or further out
	 */
	ScopeNode.prototype.conflicting_def = function conflicting_def(name) {
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
	ScopeNode.prototype.add_child_scope = function add_child_scope(scope) {
		if (scope.parent_scope === this) return;
		scope.parent_scope = this;
		// An arrow moved in reads this function's `arguments` where it read its own.
		if (isArrowNode(scope) && isLambdaNode(this) && !this.uses_arguments) {
			this.uses_arguments = walk(scope, (/** @type {Node} */ node) => {
				if (
					isSymbolRefNode(node) &&
					isLambdaNode(node.scope) &&
					node.name === "arguments"
				) {
					return walkAbort;
				}
				if (isLambdaNode(node) && !isArrowNode(node)) {
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
	ScopeNode.prototype.create_symbol = function create_symbol(
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
		[SyntaxNode, alwaysFalse],
		[ClassNode, alwaysFalse],
		[LambdaNode, alwaysFalse],
		[ToplevelNode, alwaysFalse],
		[SwitchBranchNode, alwaysFalse],
		[BlockNode, alwaysTrue],
		[
			ScopeNode,
			/**
			 * @this {Scope} a scope
			 * @returns {boolean} whether it is a block's
			 */
			function is_block_scope() {
				return this._block_scope || false;
			}
		],
		[IterationStatementNode, alwaysTrue]
	]) {
		ctor.prototype.is_block_scope = isBlockScope;
	}

	/**
	 * Records that each scope from the symbol's own out to its definition's
	 * reads the definition.
	 * @this {Node} a symbol
	 * @returns {void}
	 */
	SymbolNode.prototype.mark_enclosed = function mark_enclosed() {
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
	SymbolNode.prototype.reference = function reference() {
		this.thedef.references.push(this);
		this.mark_enclosed();
	};

	/**
	 * @this {Scope} a scope
	 * @param {string | Node} name a name, or a symbol naming it
	 * @returns {SymbolDefinition | undefined} what it resolves to from here
	 */
	ScopeNode.prototype.find_variable = function find_variable(name) {
		const key = isSymbolNode(name) ? /** @type {Node} */ (name).name : name;
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
	ScopeNode.prototype.def_variable = function def_variable(symbol, init) {
		let definition = this.variables.get(symbol.name);
		if (definition) {
			definition.orig.push(symbol);
			if (
				definition.init &&
				(definition.scope !== symbol.scope || isFunctionNode(definition.init))
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
	ScopeNode.prototype.def_function = function def_function(symbol, init) {
		const definition = this.def_variable(symbol, init);
		if (!definition.init || isDefunNode(definition.init)) {
			definition.init = init;
		}
		return definition;
	};

	/**
	 * @this {Node} a symbol
	 * @returns {boolean} whether nothing reads it
	 */
	SymbolNode.prototype.unreferenced = function unreferenced() {
		return !this.thedef.references.length && !this.scope.pinned();
	};
	/**
	 * @this {Node} a symbol
	 * @returns {SymbolDefinition} its definition
	 */
	SymbolNode.prototype.definition = function definition() {
		return this.thedef;
	};
	/**
	 * @this {Node} a symbol
	 * @returns {boolean} whether it names a global
	 */
	SymbolNode.prototype.global = function global() {
		return this.thedef.global;
	};
	/**
	 * @this {Node} a node
	 * @returns {Node} the node its value is read from last
	 */
	SyntaxNode.prototype.tail_node = function tail_node() {
		return this;
	};
	/**
	 * @this {Node} a sequence
	 * @returns {Node} its last expression
	 */
	SequenceNode.prototype.tail_node = function tail_node() {
		return this.expressions[this.expressions.length - 1];
	};

	ScopeNode.DEFMETHOD("figure_out_scope", figureOutScope);
};

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
 * Installs webpack's `drop_unused`. It is terser's, three passes over a scope,
 * reading which classes a node is from one set of bits per class rather than
 * by an `instanceof` chain per visited node.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installUnused = (modules) => {
	// What a later phase may keep of a trailing parameter this would trim.
	/** @type {{ keepsParameter: ((lambda: Node, parameter: Node, compressor: EXPECTED_ANY) => boolean) | null }} */
	const hooks = { keepsParameter: null };
	modules.webpackUnused = hooks;
	const { ast, common, inference, utils } = modules;
	const {
		isAccessorNode,
		AssignNode,
		isAssignNode,
		BlockStatementNode,
		isBlockStatementNode,
		isCallNode,

		isClassNode,

		isClassExpressionNode,

		isClassStaticBlockNode,

		isDefClassNode,
		isDefaultAssignNode,

		isDefinitionsNode,

		isDefunNode,
		isDestructuringNode,
		EmptyStatementNode,
		isExpansionNode,
		isExportNode,
		isForNode,
		isForInNode,

		isFunctionNode,

		isLabeledStatementNode,

		isLambdaNode,
		NumberNode,
		ScopeNode,
		isScopeNode,

		isSequenceNode,
		SimpleStatementNode,
		isSimpleStatementNode,

		isSymbolBlockDeclarationNode,
		isSymbolCatchNode,
		isSymbolDeclarationNode,

		isSymbolFunargNode,
		SymbolRefNode,
		isSymbolRefNode,
		isSymbolVarNode,
		isToplevelNode,

		isUnaryNode,
		isVarNode,
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
	/** @type {[NodeTest, number][]} */
	const KIND_BITS = [
		[isLambdaNode, UNUSED_LAMBDA],
		[isClassNode, UNUSED_CLASS],
		[isDefunNode, UNUSED_DEFUN],
		[isDefClassNode, UNUSED_DEF_CLASS],
		[isSymbolFunargNode, UNUSED_FUNARG],
		[isDefinitionsNode, UNUSED_DEFINITIONS],
		[isAssignNode, UNUSED_ASSIGN],
		[isUnaryNode, UNUSED_UNARY],
		[isSymbolRefNode, UNUSED_REFERENCE],
		[isScopeNode, UNUSED_SCOPE],
		[isClassStaticBlockNode, UNUSED_STATIC_BLOCK],
		[isClassExpressionNode, UNUSED_CLASS_EXPRESSION],
		[isFunctionNode, UNUSED_FUNCTION],
		[isAccessorNode, UNUSED_ACCESSOR],
		[isForNode, UNUSED_FOR],
		[isLabeledStatementNode, UNUSED_LABELED],
		[isBlockStatementNode, UNUSED_BLOCK_STATEMENT],
		[isSequenceNode, UNUSED_SEQUENCE]
	];
	const classes = [ast.SyntaxNode];
	while (classes.length !== 0) {
		const ctor = classes.pop();
		classes.push(...ctor.SUBCLASSES);
		const probe = Object.create(ctor.prototype);
		let kind = 0;
		for (const [test, bit] of KIND_BITS) {
			if (test(probe)) kind |= bit;
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
		const dropFunctions = !isToplevelNode(self) || compressor.toplevel.funcs;
		const dropVariables = !isToplevelNode(self) || compressor.toplevel.vars;
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
				return node.argument;
			}
		};
		const assignAsUnused = /keep_assign/.test(compressor.option("unused"))
			? returnFalse
			: writeOnlyTarget;
		/** @type {Map<number, SymbolDefinition>} */
		const inUseIds = new Map();
		/** @type {Map<number, Node>} */
		const fixedIds = new Map();
		if (isToplevelNode(self) && compressor.top_retain) {
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
					for (const argname of node.params) {
						if (!isSymbolDeclarationNode(argname)) continue;
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
					const nodeDefinition = node.id.definition();
					const inExport = isExportNode(tw.parent());
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
					const inExport = isExportNode(tw.parent());
					for (const definition of node.declarations) {
						if (isSymbolVarNode(definition.id)) {
							mapAdd(varDefsById, definition.id.definition().id, definition);
						}
						if (inExport || !dropVariables) {
							walk(definition.id, (/** @type {Node} */ inner) => {
								if (isSymbolDeclarationNode(inner)) {
									const declared = inner.definition();
									if (declared.global) inUseIds.set(declared.id, declared);
								}
							});
						}
						if (isDestructuringNode(definition.id)) {
							definition.walk(tw);
						}
						if (isSymbolDeclarationNode(definition.id) && definition.init) {
							const nodeDefinition = definition.id.definition();
							mapAdd(initializations, nodeDefinition.id, definition.init);
							if (
								!nodeDefinition.chained &&
								definition.id.fixed_value() === definition.init
							) {
								fixedIds.set(nodeDefinition.id, definition);
							}
							if (definition.init.has_side_effects(compressor)) {
								definition.init.walk(tw);
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
										: makeNode(NumberNode, node, { value: 0 });
								}
								return maintainThisBinding(parent, node, assignee);
							}
						} else if (!inUse) {
							return inList
								? MAP.skip
								: makeNode(NumberNode, node, { value: 0 });
						}
					}
				}
				if (scope !== self) return;
				let nameDefinition;
				if (
					node.id &&
					((kind & UNUSED_CLASS_EXPRESSION &&
						!keepName(
							compressor.option("keep_classnames"),
							(nameDefinition = node.id.definition()).name
						)) ||
						(kind & UNUSED_FUNCTION &&
							!keepName(
								compressor.option("keep_fnames"),
								(nameDefinition = node.id.definition()).name
							))) && // A declaration of the same name overshadows it, so it is never read.
					(!inUseIds.has(nameDefinition.id) || nameDefinition.orig.length > 1)
				) {
					node.id = null;
				}
				if (kind & UNUSED_LAMBDA && !(kind & UNUSED_ACCESSOR)) {
					let trim =
						!compressor.option("keep_fargs") ||
						// An IIFE that does not refer to its name.
						(isCallNode(parent) &&
							parent.callee === node &&
							!node.pinned() &&
							(!node.id || node.id.unreferenced()));
					const argnames = node.params;
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
						if (isExpansionNode(symbol)) symbol = symbol.argument;
						if (isDefaultAssignNode(symbol)) symbol = symbol.left;
						// A destructured argument is kept: it asserts a shape.
						if (
							!isDestructuringNode(symbol) &&
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
					const definition = node.id.definition();
					descend(node, this);
					const keepClass =
						(definition.global && !dropFunctions) ||
						inUseIds.has(definition.id);
					if (!keepClass) {
						const kept = node.drop_side_effect_free(compressor);
						if (kept === null || kept === undefined) {
							definition.eliminated++;
							return inList ? MAP.skip : makeNode(EmptyStatementNode, node);
						}
						return kept;
					}
					return node;
				}
				if (kind & UNUSED_DEFUN && node !== self) {
					const definition = node.id.definition();
					const keep =
						(definition.global && !dropFunctions) ||
						inUseIds.has(definition.id);
					if (!keep) {
						definition.eliminated++;
						return inList ? MAP.skip : makeNode(EmptyStatementNode, node);
					}
				}
				if (
					kind & UNUSED_DEFINITIONS &&
					!(isForInNode(parent) && parent.left === node)
				) {
					return dropDefinitions(node, parent, inList);
				}
				// `var`s moved out of a `for` head, where an unused name with a side
				// effect left them, would make an invalid tree.
				if (kind & UNUSED_FOR) {
					descend(node, this);
					let block;
					if (isBlockStatementNode(node.init)) {
						block = node.init;
						node.init = block.body.pop();
						block.body.push(node);
					}
					if (isSimpleStatementNode(node.init)) {
						node.init = node.init.expression;
					} else if (isEmpty(node.init)) {
						node.init = null;
					}
					return !block ? node : inList ? MAP.splice(block.body) : block;
				}
				if (kind & UNUSED_LABELED && isForNode(node.body)) {
					descend(node, this);
					if (isBlockStatementNode(node.body)) {
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
								: makeNode(NumberNode, node, { value: 0 });
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
			const dropBlock = !isToplevelNode(parent) && !isVarNode(node);
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
			for (const definition of node.declarations) {
				if (definition.init) definition.init = definition.init.transform(tt);
				const isDestructure = isDestructuringNode(definition.id);
				const symbol = isDestructure
					? new SymbolDef(null, { name: "<destructure>" })
					: definition.id.definition();
				if (dropBlock && symbol.global) {
					tail.push(definition);
					continue;
				}
				if (
					!(dropVariables || dropBlock) ||
					(isDestructure &&
						(ast.namesOf(definition.id).length ||
							definition.id.is_array ||
							// Loose, as terser's: an option of `1` reads as `true`.
							// eslint-disable-next-line eqeqeq
							compressor.option("pure_getters") != true)) ||
					inUseIds.has(symbol.id)
				) {
					if (
						definition.init &&
						fixedIds.has(symbol.id) &&
						fixedIds.get(symbol.id) !== definition
					) {
						definition.init = definition.init.drop_side_effect_free(compressor);
					}
					if (isSymbolVarNode(definition.id)) {
						const varDefs = /** @type {Node[]} */ (varDefsById.get(symbol.id));
						if (
							varDefs.length > 1 &&
							(!definition.init ||
								symbol.orig.indexOf(definition.id) > symbol.eliminated)
						) {
							if (definition.init) {
								const reference = makeNode(
									SymbolRefNode,
									definition.id,
									definition.id
								);
								symbol.references.push(reference);
								const assign = makeNode(AssignNode, definition, {
									operator: "=",
									logical: false,
									left: reference,
									right: definition.init
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
					if (definition.init) {
						if (sideEffects.length > 0) {
							if (tail.length > 0) {
								sideEffects.push(definition.init);
								definition.init = makeSequence(definition.init, sideEffects);
							} else {
								body.push(
									makeNode(SimpleStatementNode, node, {
										expression: makeSequence(node, sideEffects)
									})
								);
							}
							sideEffects = [];
						}
						tail.push(definition);
					} else {
						head.push(definition);
					}
				} else if (isSymbolCatchNode(symbol.orig[0])) {
					const value =
						definition.init &&
						definition.init.drop_side_effect_free(compressor);
					if (value) sideEffects.push(value);
					definition.init = null;
					head.push(definition);
				} else {
					const value =
						definition.init &&
						definition.init.drop_side_effect_free(compressor);
					if (value) sideEffects.push(value);
					symbol.eliminated++;
				}
			}
			if (head.length > 0 || tail.length > 0) {
				node.declarations = [...head, ...tail];
				body.push(node);
			}
			if (sideEffects.length > 0) {
				body.push(
					makeNode(SimpleStatementNode, node, {
						expression: makeSequence(node, sideEffects)
					})
				);
			}
			switch (body.length) {
				case 0:
					return inList ? MAP.skip : makeNode(EmptyStatementNode, node);
				case 1:
					return body[0];
				default:
					return inList
						? MAP.splice(body)
						: makeNode(BlockStatementNode, node, { body });
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
				!isRefOf(node.left, isSymbolBlockDeclarationNode) &&
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
					if (isSymbolCatchNode(nodeDefinition.orig[0])) {
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

	ScopeNode.DEFMETHOD("drop_unused", dropUnused);
};

// What the reduce phase's hoisting check tests a node for, one bit a class.
const REDUCE_SYMBOL = 1;
const REDUCE_STATEMENT = 1 << 1;
const REDUCE_DEFUN = 1 << 2;
const REDUCE_OPAQUE = 1 << 3;

/**
 * Installs webpack's `reduce_vars`, terser's flow analysis, and the walk that
 * runs it. It is terser's, except that the functions a hoisted function reads
 * are ordered by one pass over them rather than one pass per function read.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installReduce = (modules) => {
	const { ast, common, flags, inference } = modules;
	const {
		AccessorNode,
		isArrayNode,
		AssignNode,
		isAssignNode,
		isAwaitNode,
		BinaryNode,
		isBinaryNode,
		BlockNode,
		CallNode,
		isCallNode,
		CaseNode,
		ChainNode,
		ClassNode,
		isClassNode,
		ClassStaticBlockNode,
		isClassExpressionNode,
		ConditionalNode,
		isConditionalNode,
		DefaultNode,
		isDefunNode,
		isDestructuringNode,
		DoNode,
		isExitNode,
		isExpansionNode,
		ForNode,
		ForInNode,
		IfNode,
		LabeledStatementNode,
		LambdaNode,
		isLambdaNode,
		isNewNode,
		SyntaxNode,
		isSyntaxNode,
		NumberNode,
		isObjectKeyValNode,
		PropAccessNode,
		isPropAccessNode,

		isScopeNode,
		isSequenceNode,
		isSimpleStatementNode,

		isStatementNode,
		isSymbolNode,
		SymbolCatchNode,
		isSymbolConstNode,
		isSymbolDeclarationNode,
		isSymbolDefunNode,
		isSymbolFunargNode,
		isSymbolLambdaNode,
		SymbolRefNode,
		isSymbolRefNode,
		isThisNode,
		ToplevelNode,
		TryNode,
		UnaryNode,
		UnaryPrefixNode,
		UsingDefNode,
		VarDefNode,
		isVarDefLikeNode,
		WhileNode,
		isYieldNode,
		TreeWalker,
		walk,
		walk_body: walkBody
	} = ast;
	/**
	 * @param {Node} orig where its position comes from
	 * @returns {Node} `void 0`, which no binding named `undefined` shadows
	 */
	const makeVoid0 = (orig) =>
		makeNode(UnaryPrefixNode, orig, {
			operator: "void",
			argument: makeNode(NumberNode, orig, { value: 0 })
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

	defineReduceVars(SyntaxNode, noop);

	// What the hoisting check's walks test a node for, read per class rather
	// than by an `instanceof` chain per node.
	const KIND = Symbol("reduce kind");
	/** @type {[NodeTest, number][]} */
	const KIND_BITS = [
		[isSymbolNode, REDUCE_SYMBOL],
		[isStatementNode, REDUCE_STATEMENT],
		[isDefunNode, REDUCE_DEFUN],
		[isScopeNode, REDUCE_OPAQUE],
		[isSimpleStatementNode, REDUCE_OPAQUE]
	];
	const classes = [SyntaxNode];
	while (classes.length !== 0) {
		const ctor = classes.pop();
		classes.push(...ctor.SUBCLASSES);
		const probe = Object.create(ctor.prototype);
		let kind = 0;
		for (const [test, bit] of KIND_BITS) {
			if (test(probe)) kind |= bit;
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
			(isSymbolFunargNode(definition.orig[0]) &&
				definition.scope.uses_arguments)
		) {
			definition.fixed = false;
		} else if (
			isSymbolConstNode(definition.orig[0]) ||
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
				if (isSymbolFunargNode(orig) || orig.name === "arguments") {
					return false;
				}
				definition.fixed = makeVoid0(orig);
			}
			return true;
		}
		return isDefunNode(definition.fixed);
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
		if (isDefunNode(definition.fixed)) {
			return isSyntaxNode(value) && definition.fixed.parent_scope === scope;
		}
		return definition.orig.every(
			(/** @type {Node} */ symbol) =>
				!(
					isSymbolConstNode(symbol) ||
					isSymbolDefunNode(symbol) ||
					isSymbolLambdaNode(symbol)
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
		return value.is_constant() || isLambdaNode(value) || isThisNode(value);
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
			if (isClassExpressionNode(value)) return;
		}

		if (
			(isAssignNode(parent) &&
				(parent.operator === "=" || parent.logical) &&
				node === parent.right) ||
			(isCallNode(parent) && (node !== parent.callee || isNewNode(parent))) ||
			(isExitNode(parent) &&
				node === parent.argument &&
				node.scope !== definition.scope) ||
			(isVarDefLikeNode(parent) && node === parent.init) ||
			(isYieldNode(parent) &&
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
			isArrayNode(parent) ||
			isAwaitNode(parent) ||
			(isBinaryNode(parent) && lazyOperators.has(parent.operator)) ||
			(isConditionalNode(parent) && node !== parent.test) ||
			isExpansionNode(parent) ||
			(isSequenceNode(parent) && node === parent.tail_node())
		) {
			markEscaped(walker, definition, scope, parent, parent, level + 1, depth);
		} else if (isObjectKeyValNode(parent) && node === parent.value) {
			const object = walker.parent(level + 1);
			markEscaped(walker, definition, scope, object, object, level + 2, depth);
		} else if (isPropAccessNode(parent) && node === parent.object) {
			value = readProperty(value, ast.terserProperty(parent));
			// A hole, null only there, is a constant, as terser's hole node was.
			if (value === null) return;
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
		if (isSequenceNode(parent) && node !== parent.tail_node()) return;
		if (isSimpleStatementNode(parent)) return;

		definition.direct_access = true;
	};

	/**
	 * Gives up on every definition a pattern or loop head names.
	 * @param {Node} node the node
	 * @returns {void}
	 */
	const suppress = (node) => {
		walk(node, (/** @type {Node} */ child) => {
			if (!isSymbolNode(child)) return;
			const definition = child.definition();
			if (!definition) return;
			if (isSymbolRefNode(child)) definition.references.push(child);
			definition.fixed = false;
		});
	};

	defineReduceVars(
		AccessorNode,
		function reduceAccessor(walker, descend, compressor) {
			push(walker);
			resetVariables(walker, compressor, this);
			descend();
			pop(walker);
			return true;
		}
	);

	defineReduceVars(
		AssignNode,
		function reduceAssign(walker, descend, compressor) {
			const node = this;
			if (isDestructuringNode(node.left)) {
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
			if (!isSymbolRefNode(symbol)) return finishWalk();

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
							makeNode(BinaryNode, node, {
								operator: node.operator.slice(0, -1),
								left: isSyntaxNode(fixed) ? fixed : fixed(),
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

	defineReduceVars(BinaryNode, function reduceBinary(walker) {
		if (!lazyOperators.has(this.operator)) return;
		this.left.walk(walker);
		push(walker);
		this.right.walk(walker);
		pop(walker);
		return true;
	});

	defineReduceVars(
		BlockNode,
		function reduceBlock(walker, descend, compressor) {
			resetBlockVariables(compressor, this);
		}
	);

	defineReduceVars(CaseNode, function reduceCase(walker) {
		push(walker);
		this.test.walk(walker);
		pop(walker);
		push(walker);
		walkBody(this.consequent, walker);
		pop(walker);
		return true;
	});

	defineReduceVars(ClassNode, function reduceClass(walker, descend) {
		clearFlag(this, INLINED);
		push(walker);
		descend();
		pop(walker);
		return true;
	});

	defineReduceVars(
		ClassStaticBlockNode,
		function reduceStaticBlock(walker, descend, compressor) {
			resetBlockVariables(compressor, this);
		}
	);

	defineReduceVars(ConditionalNode, function reduceConditional(walker) {
		this.test.walk(walker);
		push(walker);
		this.consequent.walk(walker);
		pop(walker);
		push(walker);
		this.alternate.walk(walker);
		pop(walker);
		return true;
	});

	// An optional call or property access pushes and never pops: a chain's
	// conditions hold cumulatively, so the chain restores them all at its end.
	defineReduceVars(ChainNode, (walker, descend) => {
		const safeIds = walker.safe_ids;
		descend();
		walker.safe_ids = safeIds;
		return true;
	});

	defineReduceVars(CallNode, function reduceCall(walker) {
		this.callee.walk(walker);
		if (this.optional) push(walker);
		for (const argument of this.arguments) argument.walk(walker);
		return true;
	});

	defineReduceVars(PropAccessNode, function reducePropAccess(walker) {
		if (!this.optional) return;
		this.object.walk(walker);
		push(walker);
		if (this.computed) this.property.walk(walker);
		return true;
	});

	defineReduceVars(DefaultNode, (walker, descend) => {
		push(walker);
		descend();
		pop(walker);
		return true;
	});

	defineReduceVars(
		LambdaNode,
		function reduceLambda(walker, descend, compressor) {
			clearFlag(this, INLINED);
			push(walker);
			resetVariables(walker, compressor, this);

			let call;
			if (
				!this.id &&
				!this.uses_arguments &&
				!this.pinned() &&
				isCallNode((call = walker.parent())) &&
				call.callee === this &&
				!call.arguments.some((/** @type {Node} */ argument) =>
					isExpansionNode(argument)
				) &&
				this.params.every((/** @type {Node} */ name) => isSymbolNode(name))
			) {
				// An IIFE's parameters are read as variables the call's arguments set.
				const iife = call;
				for (const [i, name] of this.params.entries()) {
					if (!name.definition) continue;
					const definition = name.definition();
					if (definition.orig.length > 1) continue;
					if (
						definition.fixed === undefined &&
						(!this.uses_arguments || walker.has_directive("use strict"))
					) {
						definition.fixed = () => iife.arguments[i] || makeVoid0(iife);
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
			const nameDefinition = defun.id.definition();
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
					isSymbolDefunNode(definition.orig[0])
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
					(isSymbolDeclarationNode(current) || isLhs(current, holder))
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

	defineReduceVars(DoNode, function reduceDo(walker, descend, compressor) {
		resetBlockVariables(compressor, this);
		const savedLoop = walker.in_loop;
		walker.in_loop = this;
		push(walker);
		this.body.walk(walker);
		if (hasBreakOrContinue(this)) {
			pop(walker);
			push(walker);
		}
		this.test.walk(walker);
		pop(walker);
		walker.in_loop = savedLoop;
		return true;
	});

	defineReduceVars(ForNode, function reduceFor(walker, descend, compressor) {
		resetBlockVariables(compressor, this);
		if (this.init) this.init.walk(walker);
		const savedLoop = walker.in_loop;
		walker.in_loop = this;
		push(walker);
		if (this.test) this.test.walk(walker);
		this.body.walk(walker);
		if (this.update) {
			if (hasBreakOrContinue(this)) {
				pop(walker);
				push(walker);
			}
			this.update.walk(walker);
		}
		pop(walker);
		walker.in_loop = savedLoop;
		return true;
	});

	defineReduceVars(
		ForInNode,
		function reduceForIn(walker, descend, compressor) {
			resetBlockVariables(compressor, this);
			suppress(this.left);
			this.right.walk(walker);
			const savedLoop = walker.in_loop;
			walker.in_loop = this;
			push(walker);
			this.body.walk(walker);
			pop(walker);
			walker.in_loop = savedLoop;
			return true;
		}
	);

	defineReduceVars(IfNode, function reduceIf(walker) {
		this.test.walk(walker);
		push(walker);
		this.consequent.walk(walker);
		pop(walker);
		if (this.alternate) {
			push(walker);
			this.alternate.walk(walker);
			pop(walker);
		}
		return true;
	});

	defineReduceVars(LabeledStatementNode, function reduceLabeled(walker) {
		push(walker);
		this.body.walk(walker);
		pop(walker);
		return true;
	});

	defineReduceVars(SymbolCatchNode, function reduceCatchName() {
		this.definition().fixed = false;
	});

	defineReduceVars(
		SymbolRefNode,
		function reduceReference(walker, descend, compressor) {
			const definition = this.definition();
			definition.references.push(this);
			if (
				definition.references.length === 1 &&
				!definition.fixed &&
				isSymbolDefunNode(definition.orig[0])
			) {
				walker.loop_ids.set(definition.id, walker.in_loop);
			}
			let fixedValue;
			if (definition.fixed === undefined || !safeToRead(walker, definition)) {
				definition.fixed = false;
			} else if (definition.fixed) {
				fixedValue = this.fixed_value();
				if (isLambdaNode(fixedValue) && isRecursiveRef(walker, definition)) {
					definition.recursive_refs++;
				} else if (
					fixedValue &&
					!compressor.exposed(definition) &&
					referencedOnce(walker, compressor, definition)
				) {
					definition.single_use =
						(isLambdaNode(fixedValue) && !fixedValue.pinned()) ||
						isClassNode(fixedValue) ||
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
		ToplevelNode,
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

	defineReduceVars(TryNode, function reduceTry(walker, descend, compressor) {
		resetBlockVariables(compressor, this);
		push(walker);
		this.block.walk(walker);
		pop(walker);
		if (this.handler) {
			push(walker);
			this.handler.walk(walker);
			pop(walker);
		}
		if (this.finalizer) this.finalizer.walk(walker);
		return true;
	});

	defineReduceVars(UnaryNode, function reduceUnary(walker) {
		const node = this;
		if (node.operator !== "++" && node.operator !== "--") return;
		const expression = node.argument;
		if (!isSymbolRefNode(expression)) return;
		const definition = expression.definition();
		const safe = safeToAssign(walker, definition, expression.scope, true);
		definition.assignments++;
		if (!safe) return;
		const fixed = definition.fixed;
		if (!fixed) return;
		definition.references.push(expression);
		definition.chained = true;
		definition.fixed = () =>
			makeNode(BinaryNode, node, {
				operator: node.operator.slice(0, -1),
				left: makeNode(UnaryPrefixNode, node, {
					operator: "+",
					argument: isSyntaxNode(fixed) ? fixed : fixed()
				}),
				right: makeNode(NumberNode, node, {
					value: 1
				})
			});
		mark(walker, definition, true);
		return true;
	});

	defineReduceVars(VarDefNode, function reduceVarDef(walker, descend) {
		const node = this;
		if (isDestructuringNode(node.id)) {
			suppress(node.id);
			return;
		}
		const definition = node.id.definition();
		if (node.init) {
			if (safeToAssign(walker, definition, node.id.scope, node.init)) {
				definition.fixed = () => node.init;
				walker.loop_ids.set(definition.id, walker.in_loop);
				mark(walker, definition, false);
				descend();
				mark(walker, definition, true);
				return true;
			}
			definition.fixed = false;
		}
	});

	defineReduceVars(UsingDefNode, function reduceUsingDef() {
		suppress(this.id);
	});

	defineReduceVars(
		WhileNode,
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

	ToplevelNode.DEFMETHOD(
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
							isDefunNode(node) &&
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

/** @typedef {import("../util/createMappings").DecodedSegment} DecodedSegment */

/**
 * @typedef {object} SourceMapReader
 * @property {string[]} sources the sources, normalized as readers resolve them
 * @property {(string | null)[] | undefined} sourcesContent their content
 * @property {string[]} names the names
 * @property {DecodedSegment[][]} lines the segments of each generated line
 */

/**
 * Reads a source map, flattening an index map's sections into one map, as
 * `@jridgewell/trace-mapping`'s `AnyMap` reads it.
 * @param {string | EXPECTED_OBJECT} input the map, or its JSON
 * @returns {SourceMapReader} the map, decoded
 */
const readSourceMapInput = (input) => {
	const { decodeMappings } = require("../util/createMappings");
	const { normalizeSourceMapUrl } = require("../util/identifier");

	/**
	 * @param {string | EXPECTED_OBJECT} map a map, or its JSON
	 * @returns {EXPECTED_ANY} it, parsed
	 */
	const parseMap = (map) => (typeof map === "string" ? JSON.parse(map) : map);
	/**
	 * @param {EXPECTED_ANY} parsed a map without sections
	 * @param {boolean} owned whether its decoded lines may be sorted in place
	 * @returns {SourceMapReader} it, decoded
	 */
	const readPlain = (parsed, owned) => {
		const prefix = parsed.sourceRoot ? `${parsed.sourceRoot}/` : "";
		const { mappings } = parsed;
		/** @type {DecodedSegment[][]} */
		let lines;
		if (typeof mappings === "string") {
			lines = decodeMappings(mappings);
		} else if (Array.isArray(mappings)) {
			lines = mappings.map((/** @type {DecodedSegment[]} */ line) => {
				for (let i = 1; i < line.length; i++) {
					if (line[i][0] < line[i - 1][0]) {
						return (owned ? line : [...line]).sort((a, b) => a[0] - b[0]);
					}
				}
				return line;
			});
		} else {
			throw new Error(`invalid source map: ${JSON.stringify(parsed)}`);
		}
		return {
			sources: parsed.sources.map((/** @type {string | null} */ source) =>
				normalizeSourceMapUrl(prefix + (source || ""))
			),
			sourcesContent: parsed.sourcesContent,
			names: parsed.names || [],
			lines
		};
	};

	const parsed = parseMap(input);
	if (!("sections" in parsed)) {
		return readPlain(parsed, typeof input === "string");
	}

	/** @type {SourceMapReader} */
	const joined = { sources: [], sourcesContent: [], names: [], lines: [] };
	/**
	 * @param {EXPECTED_ANY} map an index map
	 * @param {number} lineOffset the line its sections are offset by
	 * @param {number} columnOffset the column its sections are offset by
	 * @param {number} stopLine the line the next section starts at
	 * @param {number} stopColumn the column the next section starts at
	 */
	const addSections = (map, lineOffset, columnOffset, stopLine, stopColumn) => {
		const { sections } = map;
		for (let i = 0; i < sections.length; i++) {
			const { offset } = sections[i];
			let sectionStopLine = stopLine;
			let sectionStopColumn = stopColumn;
			if (i + 1 < sections.length) {
				const next = sections[i + 1].offset;
				sectionStopLine = Math.min(stopLine, lineOffset + next.line);
				if (sectionStopLine === stopLine) {
					sectionStopColumn = Math.min(stopColumn, columnOffset + next.column);
				} else if (sectionStopLine < stopLine) {
					sectionStopColumn = columnOffset + next.column;
				}
			}
			const section = parseMap(sections[i].map);
			if ("sections" in section) {
				addSections(
					section,
					lineOffset + offset.line,
					columnOffset + offset.column,
					sectionStopLine,
					sectionStopColumn
				);
				continue;
			}
			addSection(
				readPlain(section, false),
				lineOffset + offset.line,
				columnOffset + offset.column,
				sectionStopLine,
				sectionStopColumn
			);
		}
	};
	/**
	 * @param {SourceMapReader} map a section's map
	 * @param {number} lineOffset its line
	 * @param {number} columnOffset its column
	 * @param {number} stopLine the line the next section starts at
	 * @param {number} stopColumn the column the next section starts at
	 */
	const addSection = (map, lineOffset, columnOffset, stopLine, stopColumn) => {
		const sourcesOffset = joined.sources.length;
		const namesOffset = joined.names.length;
		const contents = /** @type {(string | null)[]} */ (joined.sourcesContent);
		joined.sources.push(...map.sources);
		joined.names.push(...map.names);
		if (map.sourcesContent) contents.push(...map.sourcesContent);
		else for (let i = 0; i < map.sources.length; i++) contents.push(null);
		for (let i = 0; i < map.lines.length; i++) {
			const lineIndex = lineOffset + i;
			if (lineIndex > stopLine) return;
			for (let j = joined.lines.length; j <= lineIndex; j++) {
				joined.lines[j] = [];
			}
			const out = joined.lines[lineIndex];
			const columnShift = i === 0 ? columnOffset : 0;
			for (const segment of map.lines[i]) {
				const column = columnShift + segment[0];
				if (lineIndex === stopLine && column >= stopColumn) return;
				if (segment.length === 1) {
					out.push([column]);
				} else if (segment.length === 4) {
					out.push([
						column,
						sourcesOffset + segment[1],
						segment[2],
						segment[3]
					]);
				} else {
					out.push([
						column,
						sourcesOffset + segment[1],
						segment[2],
						segment[3],
						namesOffset + segment[4]
					]);
				}
			}
		}
	};
	addSections(parsed, 0, 0, Infinity, Infinity);
	joined.sources = joined.sources.map((source) =>
		normalizeSourceMapUrl(source || "")
	);
	return joined;
};

/**
 * The original position a generated one maps to: the last segment at or
 * before its column, as `originalPositionFor` finds it.
 * @param {SourceMapReader} map the map
 * @param {number} line the generated line, 1-based
 * @param {number} column the generated column
 * @returns {{ source: string | null, line: number, column: number, name: string | null }} the original position; `source` is null where none is mapped
 */
const findOriginalPosition = (map, line, column) => {
	const none = { source: null, line: 0, column: 0, name: null };
	if (line - 1 >= map.lines.length) return none;
	const segments = map.lines[line - 1];
	let low = 0;
	let high = segments.length - 1;
	let index = -1;
	while (low <= high) {
		const middle = low + ((high - low) >> 1);
		const difference = segments[middle][0] - column;
		if (difference === 0) {
			index = middle;
			break;
		}
		if (difference < 0) low = middle + 1;
		else high = middle - 1;
	}
	if (index === -1) {
		index = low - 1;
	} else {
		while (index > 0 && segments[index - 1][0] === column) index--;
	}
	if (index === -1) return none;
	const segment = segments[index];
	if (segment.length === 1) return none;
	return {
		source: map.sources[segment[1]],
		line: segment[2] + 1,
		column: segment[3],
		name: segment.length === 5 ? map.names[segment[4]] : null
	};
};

/**
 * terser's `SourceMap`: builds the output's map as `@jridgewell/gen-mapping`
 * does, mapping back through the input's own map, but setting a source's
 * content once rather than with every mapping into it.
 * @param {SourceMapOptions} options what to build the map from
 * @returns {Generator<EXPECTED_ANY, SourceMapBuilder, EXPECTED_ANY>} the builder, once the input's map is read
 */
function* createSourceMap(options) {
	const { encodeDecodedMappings } = require("../util/createMappings");

	/** @type {Map<string, number>} */
	const sourceIndexes = new Map();
	/** @type {string[]} */
	const sources = [];
	/** @type {(string | null | undefined)[]} */
	const builtContent = [];
	/** @type {Map<string, number>} */
	const nameIndexes = new Map();
	/** @type {string[]} */
	const names = [];
	/** @type {DecodedSegment[][]} */
	const lines = [];

	/** @type {Record<string, string | null | undefined>} */
	const sourcesContent = Object.create(null);
	const { files } = options;
	for (const name in files) {
		if (Object.prototype.hasOwnProperty.call(files, name)) {
			sourcesContent[name] = files[name];
		}
	}
	/** @type {SourceMapReader | undefined} */
	let originalMap;
	if (options.orig) {
		originalMap = yield readSourceMapInput(options.orig);
		const { sourcesContent: contents } = /** @type {SourceMapReader} */ (
			originalMap
		);
		if (contents) {
			for (const [i, source] of /** @type {SourceMapReader} */ (
				originalMap
			).sources.entries()) {
				const content = contents[i];
				if (content) sourcesContent[source] = content;
			}
		}
	}
	/** @type {Set<string>} */
	const withContent = new Set();

	/**
	 * @param {string} source a source
	 * @returns {number} its index, added when new
	 */
	const sourceIndexOf = (source) => {
		let index = sourceIndexes.get(source);
		if (index === undefined) {
			index = sources.push(source) - 1;
			sourceIndexes.set(source, index);
		}
		return index;
	};
	/**
	 * Adds a segment, unless the one before it on its line already says the same.
	 * @param {number} generatedLine its line, 1-based
	 * @param {number} generatedColumn its column
	 * @param {string | null} source its source, null for an unmapped one
	 * @param {number} originalLine its original line, 1-based
	 * @param {number} originalColumn its original column
	 * @param {string | null | undefined} name its name
	 */
	const addSegment = (
		generatedLine,
		generatedColumn,
		source,
		originalLine,
		originalColumn,
		name
	) => {
		for (let i = lines.length; i < generatedLine; i++) lines[i] = [];
		const line = lines[generatedLine - 1];
		let index = line.length;
		while (index > 0 && generatedColumn < line[index - 1][0]) index--;
		const previous = index > 0 ? line[index - 1] : undefined;
		/** @type {DecodedSegment} */
		let segment;
		if (!source) {
			if (!previous || previous.length === 1) return;
			segment = [generatedColumn];
		} else {
			const sourceIndex = sourceIndexOf(source);
			let nameIndex = -1;
			if (name) {
				const known = nameIndexes.get(name);
				if (known === undefined) {
					nameIndex = names.push(name) - 1;
					nameIndexes.set(name, nameIndex);
				} else {
					nameIndex = known;
				}
			}
			if (sourceIndex === builtContent.length) builtContent[sourceIndex] = null;
			if (
				previous &&
				previous.length !== 1 &&
				sourceIndex === previous[1] &&
				originalLine - 1 === previous[2] &&
				originalColumn === previous[3] &&
				nameIndex === (previous.length === 5 ? previous[4] : -1)
			) {
				return;
			}
			segment = name
				? [
						generatedColumn,
						sourceIndex,
						originalLine - 1,
						originalColumn,
						nameIndex
					]
				: [generatedColumn, sourceIndex, originalLine - 1, originalColumn];
		}
		line.splice(index, 0, segment);
	};
	/**
	 * @returns {EXPECTED_ANY} the map, its mappings decoded, less the keys that say nothing
	 */
	const build = () => {
		let length = lines.length;
		while (length > 0 && lines[length - 1].length === 0) length--;
		lines.length = length;
		/** @type {EXPECTED_ANY} */
		const built = {
			version: 3,
			file: options.file || undefined,
			names,
			sourceRoot: options.root || undefined,
			sources,
			sourcesContent: builtContent,
			mappings: lines,
			ignoreList: []
		};
		if (
			builtContent.every((content) => content === null || content === undefined)
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
			if (originalMap) {
				const info = findOriginalPosition(
					originalMap,
					originalLine,
					originalColumn
				);
				if (info.source === null) {
					addSegment(generatedLine, generatedColumn, null, 0, 0, null);
					return;
				}
				source = info.source;
				originalLine = info.line;
				originalColumn = info.column;
				name = info.name || name;
			}
			addSegment(
				generatedLine,
				generatedColumn,
				source,
				originalLine,
				originalColumn,
				name
			);
			if (!withContent.has(source)) {
				withContent.add(source);
				builtContent[sourceIndexOf(source)] = sourcesContent[source];
			}
		},
		getDecoded() {
			return build();
		},
		getEncoded() {
			const built = build();
			return { ...built, mappings: encodeDecodedMappings(built.mappings) };
		},
		destroy() {}
	};
}

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
 * terser's `propmangle.js`, what of it reads terser's tree before compressing:
 * the ESTree mangler renames. It builds the builtin names a property keeps once.
 * @param {MinifierModules} modules terser's modules, with `domprops` among them
 * @returns {{ reserveQuotedKeys: (toplevel: Node, reserved: string[]) => void, findAnnotatedProperties: (toplevel: Node) => Set<string>, propertyNames: (given: EXPECTED_ANY, annotatedNames: Set<string>) => PropertyNames }} what property mangling reads and asks
 */
const createPropertyMangler = (modules) => {
	const { ast, domprops } = modules;
	const {
		isClassPrivatePropertyNode,
		isConditionalNode,
		isDotNode,
		isDotHashNode,
		isObjectKeyValNode,
		isObjectPropertyNode,
		isPrivateGetterNode,
		isPrivateMethodNode,
		isPrivateSetterNode,
		isSequenceNode,
		isStringNode,
		isSubNode,
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
		isClassPrivatePropertyNode(node) ||
		isPrivateMethodNode(node) ||
		isPrivateGetterNode(node) ||
		isPrivateSetterNode(node) ||
		isDotHashNode(node);

	/**
	 * Every string a property key may be read from.
	 * @param {Node} node where the key is computed
	 * @param {(name: string) => void} add receives each
	 * @returns {void}
	 */
	const addStrings = (node, add) => {
		node.walk(
			new TreeWalker((/** @type {Node} */ inner) => {
				if (isSequenceNode(inner)) {
					addStrings(inner.tail_node(), add);
				} else if (isStringNode(inner)) {
					add(inner.value);
				} else if (isConditionalNode(inner)) {
					addStrings(inner.consequent, add);
					addStrings(inner.alternate, add);
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
			if (isObjectKeyValNode(node)) {
				if (!node.computed && node._annotations & MANGLE_PROP) {
					annotated.add(node.key.name);
				}
			} else if (isObjectPropertyNode(node)) {
				if (node._annotations & MANGLE_PROP) annotated.add(node.key.name);
			} else if (isDotNode(node)) {
				if (node._annotations & MANGLE_PROP) annotated.add(node.property.name);
			} else if (
				isSubNode(node) &&
				isStringNode(node.property) &&
				node._annotations & MANGLE_PROP
			) {
				annotated.add(node.property.value);
			}
		});
		return annotated;
	};

	/**
	 * terser's `mangle_properties` options read into what both of its walks
	 * ask: which names a walk finds, and what each is renamed to.
	 * @param {EXPECTED_ANY} given the `mangle.properties` options
	 * @param {Set<string>} annotatedNames the names marked for mangling
	 * @returns {PropertyNames} the names
	 */
	const propertyNames = (given, annotatedNames) => {
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
		return {
			add,
			mangle,
			keepQuoted,
			undeclared: Boolean(options.undeclared),
			identifiers
		};
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
					if (isObjectKeyValNode(node) && node.quote) {
						add(node.key.name);
					} else if (isObjectPropertyNode(node) && node.quote) {
						add(node.key.name);
					} else if (isSubNode(node)) {
						addStrings(node.property, add);
					}
				})
			);
		},

		findAnnotatedProperties: (toplevel) => findAnnotated(toplevel),

		propertyNames
	};
};

/**
 * Installs webpack's `minify`, terser's driver phase by phase. It skips the
 * walk renaming `#private` members where the input names none.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installMinify = (modules) => {
	const { ast, parse: parseModule, output } = modules;
	const {
		SyntaxNode,
		isArrowNode,
		isDefunNode,
		isFunctionNode,
		isPrivateInNode,
		isScopeNode,
		isStringNode,
		isToplevelNode,
		walk
	} = ast;
	const { Compressor } = modules.compress;
	const { findAnnotatedProperties, propertyNames, reserveQuotedKeys } =
		createPropertyMangler(modules);
	/**
	 * @param {SourceMapOptions} options what to build the map from
	 * @returns {Generator<EXPECTED_ANY, SourceMapBuilder, EXPECTED_ANY>} the builder
	 */
	const SourceMap = (options) => createSourceMap(options);
	const { base54 } = modules.scope;

	/**
	 * Empties every function's body in a tree given to `minify`, as terser's
	 * `gc_scope` did printing it under `_destroy_ast`.
	 * @param {Node} toplevel the tree
	 * @returns {void}
	 */
	const releaseFunctionBodies = (toplevel) => {
		/** @type {Node[]} */
		const functions = [];
		walk(toplevel, (/** @type {Node} */ node) => {
			if (isDefunNode(node) || isFunctionNode(node) || isArrowNode(node)) {
				functions.push(node);
			}
		});
		for (const node of functions) {
			node.body.body.length = 0;
			node.params.length = 0;
		}
	};

	/**
	 * Drops what only scope analysis read from a tree given to `minify`, as
	 * terser does under `_destroy_ast` before printing.
	 * @param {Node} toplevel the tree
	 * @returns {void}
	 */
	const dropScopes = (toplevel) => {
		walk(toplevel, (/** @type {Node} */ node) => {
			if (isScopeNode(node)) {
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
	};

	/**
	 * Gives each definition of a tree handed back the name the ESTree mangler
	 * chose for the identifiers read from its symbols.
	 * @param {(Node | PrintNode | null)[]} pairs each terser node, then what it was read as
	 * @returns {void}
	 */
	const writeMangledNames = (pairs) => {
		for (let i = 0; i < pairs.length; i += 2) {
			const printNode = /** @type {PrintNode | null} */ (pairs[i + 1]);
			if (
				printNode === null ||
				printNode.type !== "Identifier" ||
				printNode.definition === null
			) {
				continue;
			}
			const { mangledName } =
				/** @type {ManglingDefinition | ManglingLabel} */ (
					printNode.definition
				);
			if (mangledName !== null) {
				/** @type {Node} */ (pairs[i]).definition().mangled_name = mangledName;
			}
		}
	};

	/**
	 * Renames the properties and private names of a tree handed back as the
	 * ESTree mangler renamed what they were read as.
	 * @param {(Node | PrintNode | null)[]} pairs each terser node, then what it was read as
	 * @returns {void}
	 */
	const writeRenamedProperties = (pairs) => {
		for (let i = 0; i < pairs.length; i += 2) {
			const node = /** @type {Node} */ (pairs[i]);
			const printNode = /** @type {PrintNode | null} */ (pairs[i + 1]);
			// A hole reads as none.
			if (printNode === null) continue;
			switch (printNode.type) {
				case "MemberExpression":
					if (!printNode.computed) {
						node.property.name = /** @type {PrintIdentifier} */ (
							printNode.property
						).name;
					}
					break;
				case "BinaryExpression":
					if (isPrivateInNode(node)) {
						node.left.name = /** @type {PrintPrivateIdentifier} */ (
							printNode.left
						).name;
					}
					break;
				case "Literal":
					if (isStringNode(node)) {
						node.value = printNode.value;
						if (!printNode.annotatedKey) node._annotations &= ~KEY;
					}
					break;
				case "Property":
				case "MethodDefinition":
				case "PropertyDefinition": {
					if (printNode.computed) break;
					const { key } = printNode;
					const name =
						key.type === "Literal"
							? String(key.value)
							: /** @type {PrintIdentifier} */ (key).name;
					node.key.name = name;
					break;
				}
				default:
			}
		}
	};

	/**
	 * terser's `log_input`: the options and sources written to a file in
	 * `TERSER_DEBUG_DIR`, before they are parsed.
	 * @param {EXPECTED_ANY} files the sources
	 * @param {EXPECTED_ANY} options the options
	 * @param {EXPECTED_ANY} fs the file system written to
	 * @param {string} debugFolder the folder
	 * @returns {void}
	 */
	const logInput = (files, options, fs, debugFolder) => {
		if (!(fs && fs.writeFileSync && fs.mkdirSync)) return;
		try {
			fs.mkdirSync(debugFolder);
		} catch (err) {
			if (/** @type {NodeJS.ErrnoException} */ (err).code !== "EEXIST") {
				throw err;
			}
		}
		const logPath = `${debugFolder}/terser-debug-${(Math.random() * 9999999) | 0}.log`;
		options = options || {};
		const optionsText = JSON.stringify(
			options,
			(_key, value) => {
				if (typeof value === "function") {
					return `[Function ${value.toString()}]`;
				}
				if (value instanceof RegExp) return `[RegExp ${value.toString()}]`;
				return value;
			},
			4
		);
		/**
		 * @param {EXPECTED_ANY} file a source, or the sources by name
		 * @returns {EXPECTED_ANY} it as the log writes it
		 */
		const filesText = (file) => {
			if (
				typeof file === "object" &&
				options.parse &&
				options.parse.spidermonkey
			) {
				return JSON.stringify(file, null, 2);
			} else if (typeof file === "object") {
				return Object.keys(file)
					.map((key) => `${key}: ${filesText(file[key])}`)
					.join("\n\n");
			} else if (typeof file === "string") {
				return `\`\`\`\n${file}\n\`\`\``;
			}
			return file;
		};
		fs.writeFileSync(
			logPath,
			`Options: \n${optionsText}\n\nInput files:\n\n${filesText(files)}\n`
		);
	};

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
		// A tree is read as naming one: only a source can be scanned for it, and
		// `format.ast` hands a tree back that may have gained one since.
		if (isToplevelNode(files)) return false;
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
		if (isToplevelNode(files)) {
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
				options.parse.toplevel = SyntaxNode.from_mozilla_ast(
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
		const printsCode = !hasOwn(options.format, "code") || options.format.code;
		// terser's `_destroy_ast`: the tree is dropped once printed.
		const destroysTree = printsCode && !options.format.ast;
		const handsTreeBack = options.format.ast || options.format.spidermonkey;
		const givenTree = isToplevelNode(files);
		/** @type {PrintNode | undefined} */
		let printTree;
		if (timings) timings.mangle = timings.properties = Date.now();
		if (options.mangle) {
			const mangleOptions = formatMangleOptions(options.mangle, base54);
			/** @type {(Node | PrintNode | null)[] | null} */
			let pairs = null;
			if (handsTreeBack) {
				// The tree handed back takes the names chosen, as terser's did.
				toplevel.figure_out_scope(options.mangle);
				pairs = [];
			}
			const read = /** @type {(Node | PrintNode | null)[]} */ (pairs);
			printTree = /** @type {PrintNode} */ (
				modules.toPrintTree(
					toplevel,
					handsTreeBack
						? /** @type {PrintTreeObserver} */ (
								(node, printNode) => read.push(node, printNode)
							)
						: undefined,
					undefined,
					destroysTree && !handsTreeBack,
					true
				)
			);
			if (!handsTreeBack && !givenTree) toplevel = undefined;
			let analysis = /** @type {ManglingAnalysis | undefined} */ (
				modules.analyzeManglingScopes(
					/** @type {PrintProgram} */ (printTree),
					mangleOptions
				)
			);
			if (timings) timings.mangle = Date.now();
			modules.computeEstreeCharFrequency(printTree, mangleOptions);
			modules.mangleManglingScopes(analysis, mangleOptions);
			analysis = undefined;
			if (pairs !== null) writeMangledNames(pairs);
			if (timings) timings.properties = Date.now();
			modules.renameMangledEstree(
				printTree,
				mangleOptions,
				options.mangle.properties
					? propertyNames(
							options.mangle.properties,
							/** @type {Set<string>} */ (annotatedProperties)
						)
					: null,
				!withoutPrivateNames
			);
			if (pairs !== null) writeRenamedProperties(pairs);
		}

		// Format.
		if (timings) timings.format = Date.now();
		/** @type {EXPECTED_ANY} */
		const result = {};
		if (options.format.ast) result.ast = toplevel;
		if (options.format.spidermonkey) result.ast = toplevel.to_mozilla_ast();
		/** @type {EXPECTED_ANY} */
		let formatOptions;
		if (printsCode) {
			formatOptions = { ...options.format };
			if (destroysTree) {
				formatOptions._destroy_ast = true;
				// Dropped as terser drops it; a tree nobody was given is garbage.
				if (givenTree) {
					dropScopes(toplevel);
					if (printTree !== undefined && handsTreeBack) {
						releaseFunctionBodies(toplevel);
					}
				}
			}
			if (options.sourceMap) {
				if (options.sourceMap.includeSources && isToplevelNode(files)) {
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
			if (printTree === undefined) {
				printTree = /** @type {PrintNode} */ (
					modules.toPrintTree(toplevel, undefined, undefined, destroysTree)
				);
			}
			toplevel = undefined;
			modules.printEstree(printTree, stream);
			printTree = undefined;
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
		if (
			fsModule &&
			typeof process === "object" &&
			process.env &&
			typeof process.env.TERSER_DEBUG_DIR === "string"
		) {
			logInput(files, options, fsModule, process.env.TERSER_DEBUG_DIR);
		}
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
	 * @param {EXPECTED_ANY} value its value
	 * @param {number} line its line, from 1
	 * @param {number} col its column, from 0
	 * @param {number} pos its offset
	 * @param {boolean} nlb whether a line break comes before it
	 * @param {EXPECTED_ANY[]} commentsBefore the comments before it
	 * @param {EXPECTED_ANY[]} commentsAfter the comments after it
	 * @param {string=} file its file
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
	 * @param {EXPECTED_ANY} options its options
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
	 * @param {EXPECTED_ANY} quote the quote a string had
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
 * terser's `ast.js`: its node classes, built from `nodeClasses` the way its
 * `DEFNODE` builds them, with its token, its walkers and its walk helpers.
 * @returns {Record<string, EXPECTED_ANY>} what terser's `ast.js` exports
 */
const createAst = () => {
	const { nodeClasses } = require("./syntax-printer-data");

	/** @type {Record<string, EXPECTED_ANY>} */
	const ast = { ParsedToken };
	// A prototype value's source, as `nodeClasses` writes it.
	/** @type {Record<string, unknown>} */
	const VALUES = {
		undefined,
		null: null,
		true: true,
		false: false,
		NaN: Number.NaN,
		Infinity: Number.POSITIVE_INFINITY
	};
	// Each class's walk, its own or inherited.
	/** @type {Map<string, string[] | null>} */
	const walkOf = new Map();
	for (const {
		type,
		base,
		fields,
		initializes,
		guarded,
		setsFlags,
		values,
		walk
	} of nodeClasses()) {
		const reached =
			walk !== null ? walk : base === null ? null : walkOf.get(base) || null;
		walkOf.set(type, reached);
		const holdsBlock = reached !== null && reached.includes("*body.body");
		const copies = fields.map((field) =>
			// A copy of another node takes a block of its own: one shared would see
			// the other's statements replaced, where terser's array was replaced.
			holdsBlock && field === "body"
				? "this.body = props.TYPE === undefined || props.body === undefined ? props.body : new props.body.CTOR(props.body);"
				: `this.${field} = props.${field};`
		);
		if (initializes) copies.push("this.initialize();");
		const body = `${guarded ? `if (props) { ${copies.join(" ")} }` : copies.join(" ")}${setsFlags ? " this.flags = 0;" : ""}`;
		// One constructor per class, as terser has, keeps each class's shape its own.
		// eslint-disable-next-line no-new-func
		const ctor = new Function(
			`return function ${classNameOf(type)}(props) { ${body} };`
		)();
		const Base = base === null ? null : ast[classNameOf(base)];
		if (Base) {
			ctor.prototype = Object.create(Base.prototype);
			ctor.BASE = Base;
			Base.SUBCLASSES.push(ctor);
		}
		ctor.prototype.CTOR = ctor;
		ctor.prototype.constructor = ctor;
		ctor.SUBCLASSES = [];
		ctor.prototype.TYPE = ctor.TYPE = type;
		for (const name of Object.keys(values)) {
			ctor.prototype[name] = VALUES[values[name]];
		}
		/**
		 * @param {string} name the method's name
		 * @param {EXPECTED_FUNCTION} method the method
		 * @returns {void}
		 */
		ctor.DEFMETHOD = function DEFMETHOD(name, method) {
			this.prototype[name] = method;
		};
		ast[classNameOf(type)] = ctor;
		ast[`is${classNameOf(type)}`] = nodeTest(ctor);
	}
	const walkAbort = Symbol("abort walk");

	/**
	 * terser's `walk`: depth first, children in order; `callback` returns true
	 * to skip a node's children, `walk_abort` to stop.
	 * @param {EXPECTED_ANY} node the root
	 * @param {(node: EXPECTED_ANY, toVisit: EXPECTED_ANY[]) => EXPECTED_ANY} callback what each node is handed to
	 * @param {EXPECTED_ANY[]=} toVisit the nodes left to visit
	 * @returns {boolean} whether the walk was stopped
	 */
	const walk = (node, callback, toVisit = [node]) => {
		const push = toVisit.push.bind(toVisit);
		while (toVisit.length) {
			const current = toVisit.pop();
			const result = callback(current, toVisit);
			if (result) {
				if (result === walkAbort) return true;
				continue;
			}
			current._children_backwards(push);
		}
		return false;
	};

	/**
	 * terser's `walk_parent`: `walk`, handing `callback` the node's parents.
	 * @param {EXPECTED_ANY} node the root
	 * @param {(node: EXPECTED_ANY, info: { parent: (n?: number) => EXPECTED_ANY }) => EXPECTED_ANY} callback what each node is handed to
	 * @param {EXPECTED_ANY[]=} initialStack the parents of the root
	 * @returns {boolean} whether the walk was stopped
	 */
	const walkParent = (node, callback, initialStack) => {
		const toVisit = [node];
		const push = toVisit.push.bind(toVisit);
		const stack = initialStack ? [...initialStack] : [];
		/** @type {number[]} */
		const parentPopIndices = [];
		/** @type {EXPECTED_ANY} */
		let current;
		const info = {
			/**
			 * @param {number=} n how many parents up, -1 for the node itself
			 * @returns {EXPECTED_ANY} that parent
			 */
			parent: (n = 0) => {
				if (n === -1) return current;
				if (initialStack && n >= stack.length) {
					n -= stack.length;
					return initialStack[initialStack.length - (n + 1)];
				}
				return stack[stack.length - (1 + n)];
			}
		};
		while (toVisit.length) {
			current = toVisit.pop();
			while (
				parentPopIndices.length &&
				toVisit.length === parentPopIndices[parentPopIndices.length - 1]
			) {
				stack.pop();
				parentPopIndices.pop();
			}
			const result = callback(current, info);
			if (result) {
				if (result === walkAbort) return true;
				continue;
			}
			const visitLength = toVisit.length;
			current._children_backwards(push);
			// The node is a parent only where it has children to visit.
			if (toVisit.length > visitLength) {
				stack.push(current);
				parentPopIndices.push(visitLength - 1);
			}
		}
		return false;
	};

	/**
	 * terser's `walk_body`, handed the list rather than the node holding it.
	 * @param {EXPECTED_ANY[]} body a statement list
	 * @param {EXPECTED_ANY} visitor the walker
	 * @returns {void}
	 */
	const walkBody = (body, visitor) => {
		for (let i = 0, len = body.length; i < len; i++) body[i]._walk(visitor);
	};

	/**
	 * terser's `TreeWalker`: what a node's `walk` reports to, with the stack of
	 * nodes it is inside and the directives in force there.
	 */
	class TreeWalker {
		/**
		 * @param {EXPECTED_FUNCTION=} callback what each node is handed to
		 */
		constructor(callback) {
			this.visit = callback;
			/** @type {EXPECTED_ANY[]} */
			this.stack = [];
			/** @type {Record<string, EXPECTED_ANY>} */
			this.directives = Object.create(null);
		}
	}

	/**
	 * terser's `TreeTransformer`: a walker whose `before` and `after` may
	 * replace the node they are handed.
	 */
	class TreeTransformer extends TreeWalker {
		/**
		 * @param {EXPECTED_FUNCTION=} before called on entering a node
		 * @param {EXPECTED_FUNCTION=} after called on leaving it
		 */
		constructor(before, after) {
			super();
			this.before = before;
			this.after = after;
		}
	}

	const {
		isAwaitNode,
		isCallNode,
		isCaseNode,
		isCatchNode,
		isChainNode,
		isClassNode,
		isExpansionNode,
		isIfNode,
		isLambdaNode,
		isPropAccessNode,
		isSimpleStatementNode,
		isSwitchBranchNode,
		isSwitchNode,
		isTryNode,
		isUnaryNode,
		isWithNode,
		isYieldNode
	} = ast;
	/**
	 * What terser's `expression` field held, which ESTree names per class: a
	 * call's callee, a property read's object, an operator's argument.
	 * @param {EXPECTED_ANY} node any node
	 * @returns {EXPECTED_ANY} that child, undefined where the class had none
	 */
	const expressionOf = (node) => {
		if (isCallNode(node)) return node.callee;
		if (isPropAccessNode(node) || isWithNode(node)) {
			return node.object;
		}
		if (
			isUnaryNode(node) ||
			isAwaitNode(node) ||
			isYieldNode(node) ||
			isExpansionNode(node)
		) {
			return node.argument;
		}
		if (isChainNode(node)) return node.expression;
		if (isSwitchNode(node)) return node.discriminant;
		if (isCaseNode(node)) return node.test;
		return undefined;
	};
	/**
	 * What terser's `body` field held, which ESTree names per class: a
	 * statement's expression, a branch's consequent, a switch's cases.
	 * @param {EXPECTED_ANY} node any node
	 * @returns {EXPECTED_ANY} that child or list, undefined where the class had none
	 */
	const bodyOf = (node) => {
		if (isLambdaNode(node) || isCatchNode(node)) {
			return node.body.body;
		}
		if (isSimpleStatementNode(node)) return node.expression;
		if (isIfNode(node) || isSwitchBranchNode(node)) {
			return node.consequent;
		}
		if (isSwitchNode(node)) return node.cases;
		if (isTryNode(node)) return node.block;
		// A class's `body` holds its members, where terser's held nothing.
		if (isClassNode(node)) return undefined;
		return node.body;
	};
	/**
	 * A key as terser held it: a property's name not computed as its string,
	 * which ESTree holds as a node, any other key as itself.
	 * @param {EXPECTED_ANY} key a member's key or a property read's property
	 * @returns {EXPECTED_ANY} the string or node terser held
	 */
	const terserKey = (key) => (ast.isSymbolPropertyNode(key) ? key.name : key);
	/**
	 * What terser's destructuring held as `names`: an array pattern's elements,
	 * holes null, or an object pattern's properties.
	 * @param {EXPECTED_ANY} node a destructuring
	 * @returns {EXPECTED_ANY[]} the list
	 */
	const namesOf = (node) => (node.is_array ? node.elements : node.properties);
	/**
	 * A property read's property as terser held it: a name not computed as its
	 * string, which ESTree holds as a node, a computed one as itself.
	 * @param {EXPECTED_ANY} node any node
	 * @returns {EXPECTED_ANY} the string or node, undefined where it has none
	 */
	const terserProperty = (node) =>
		isPropAccessNode(node) && !node.computed
			? node.property.name
			: node.property;

	ast.TreeWalker = TreeWalker;
	ast.TreeTransformer = TreeTransformer;
	ast.expressionOf = expressionOf;
	ast.bodyOf = bodyOf;
	ast.terserKey = terserKey;
	ast.terserProperty = terserProperty;
	ast.namesOf = namesOf;
	ast.walk = walk;
	ast.walk_parent = walkParent;
	ast.walk_body = walkBody;
	ast.walk_abort = walkAbort;
	ast._PURE = 0b00000001;
	ast._INLINE = 0b00000010;
	ast._NOINLINE = 0b00000100;
	ast._KEY = 0b00001000;
	ast._MANGLEPROP = 0b00010000;
	return ast;
};

/**
 * terser's `Compressor`: the walker a compression pass transforms the tree
 * with, holding the options. `before` and `in_computed_key` come from the
 * `compressor` phase; the native-object answers from webpack's tables.
 * @param {MinifierModules} modules the modules, read when a compressor is made
 * @returns {EXPECTED_ANY} the class
 */
const createCompressor = (modules) => {
	const { ast } = modules;
	const { TreeWalker } = ast;
	const hasOwn = Object.prototype.hasOwnProperty;

	/**
	 * terser's `Compressor`.
	 */
	class Compressor extends TreeWalker {
		/**
		 * @param {EXPECTED_ANY} options the compress options
		 * @param {{ false_by_default?: boolean, mangle_options?: EXPECTED_ANY }} settings whether options default to off, and the mangle options
		 */
		constructor(
			options,
			{
				false_by_default: falseByDefault = false,
				mangle_options: mangleOptions = false
			}
		) {
			super();
			if (options.defaults !== undefined && !options.defaults) {
				falseByDefault = true;
			}
			const on = !falseByDefault;
			this.options = defaults(
				options,
				{
					arguments: false,
					arrows: on,
					booleans: on,
					booleans_as_integers: false,
					collapse_vars: on,
					comparisons: on,
					computed_props: on,
					conditionals: on,
					dead_code: on,
					defaults: true,
					directives: on,
					drop_console: false,
					drop_debugger: on,
					ecma: 5,
					builtins_ecma: 5,
					builtins_pure: false,
					evaluate: on,
					expression: false,
					global_defs: false,
					hoist_funs: false,
					hoist_props: on,
					hoist_vars: false,
					ie8: false,
					if_return: on,
					inline: on,
					join_vars: on,
					keep_classnames: false,
					keep_fargs: true,
					keep_fnames: false,
					keep_infinity: false,
					lhs_constants: on,
					loops: on,
					module: false,
					negate_iife: on,
					passes: 1,
					properties: on,
					pure_getters: on && "strict",
					pure_funcs: null,
					pure_new: false,
					reduce_funcs: on,
					reduce_vars: on,
					sequences: on,
					side_effects: on,
					switches: on,
					top_retain: null,
					toplevel: Boolean(options && options.top_retain),
					typeofs: on,
					unsafe: false,
					unsafe_arrows: false,
					unsafe_comps: false,
					unsafe_Function: false,
					unsafe_math: false,
					unsafe_symbols: false,
					unsafe_methods: false,
					unsafe_proto: false,
					unsafe_regexp: false,
					unsafe_undefined: false,
					unused: on,
					warnings: false
				},
				true
			);
			const globalDefinitions = this.options.global_defs;
			if (typeof globalDefinitions === "object") {
				for (const key in globalDefinitions) {
					if (key[0] === "@" && hasOwn.call(globalDefinitions, key)) {
						// Read as the one expression a parenthesis holds, as terser's
						// `expression` parse reads it.
						const { body } = modules.parse.parse(
							`(${globalDefinitions[key]}\n)`
						);
						if (body.length !== 1 || !ast.isSimpleStatementNode(body[0])) {
							throw new Error(`\`${key}\` is not one expression`);
						}
						globalDefinitions[key.slice(1)] = body[0].expression;
					}
				}
			}
			if (this.options.inline === true) this.options.inline = 3;
			const pureFunctions = this.options.pure_funcs;
			if (typeof pureFunctions === "function") {
				this.pure_funcs = pureFunctions;
			} else {
				this.pure_funcs = pureFunctions
					? (/** @type {EXPECTED_ANY} */ node) =>
							!pureFunctions.includes(modules.printToString(node.callee))
					: () => true;
			}
			let topRetain = this.options.top_retain;
			if (topRetain instanceof RegExp) {
				const pattern = topRetain;
				this.top_retain = (/** @type {SymbolDefinition} */ definition) =>
					pattern.test(definition.name);
			} else if (typeof topRetain === "function") {
				this.top_retain = topRetain;
			} else if (topRetain) {
				if (typeof topRetain === "string") topRetain = topRetain.split(/,/);
				const names = topRetain;
				this.top_retain = (/** @type {SymbolDefinition} */ definition) =>
					names.includes(definition.name);
			}
			if (this.options.module) {
				this.directives["use strict"] = true;
				this.options.toplevel = true;
			}
			const { toplevel } = this.options;
			this.toplevel =
				typeof toplevel === "string"
					? { funcs: /funcs/.test(toplevel), vars: /vars/.test(toplevel) }
					: { funcs: toplevel, vars: toplevel };
			const { sequences } = this.options;
			// terser compares with `==`, so `true` and "1" are a limit of 800 too.
			this.sequences_limit = Number(sequences) === 1 ? 800 : sequences | 0;
			this.evaluated_regexps = new Map();
			/** @type {Node | undefined} */
			this._toplevel = undefined;
			this._mangle_options = mangleOptions
				? formatMangleOptions(mangleOptions, modules.scope.base54)
				: mangleOptions;
			const { nativeObjects } = modules;
			this.pure_access_globals = nativeObjects.pure_access_globals(this);
			this.is_pure_native_fn = nativeObjects.is_pure_native_fn(this);
			this.is_pure_native_method = nativeObjects.is_pure_native_method(this);
			this.is_pure_native_static_fn =
				nativeObjects.is_pure_native_static_fn(this);
			this.is_pure_native_static_property =
				nativeObjects.is_pure_native_static_property(this);
		}
	}

	return Compressor;
};

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

/**
 * What the parse phase shares with the rest: the operator precedences and
 * reserved words from terser's tables, and the error a refused source throws.
 * The parse phase installs `parse` itself.
 * @returns {{ parse: (text: string, options?: EXPECTED_OBJECT) => Node, JS_Parse_Error: typeof JSParseError, js_error: typeof throwParseError, PRECEDENCE: Record<string, number>, ALL_RESERVED_WORDS: Set<string> }} the parser's tables
 */
const createParseTables = () => {
	const { parserTables } = require("./syntax-printer-data");

	const tables = /** @type {Record<string, string[]>} */ (parserTables());
	/** @type {Record<string, number>} */
	const PRECEDENCE = {};
	for (const [index, level] of /** @type {string[][]} */ (
		/** @type {unknown} */ (tables.PRECEDENCE)
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
		ALL_RESERVED_WORDS: new Set(tables.ALL_RESERVED_WORDS)
	};
};

/**
 * terser's `mozilla-ast.js`: `SyntaxNode.from_mozilla_ast`, which builds terser's
 * tree from an ESTree one, and each node's `to_mozilla_ast`, which goes back.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installEstree = (modules) => {
	const { ast } = modules;
	const {
		AccessorNode,
		ArrayNode,
		ArrowNode,
		AssignNode,
		AtomNode,
		AwaitNode,
		BigIntNode,
		BinaryNode,
		BlockNode,
		BlockStatementNode,
		BooleanNode,
		BreakNode,
		CallNode,
		isCallNode,
		CaseNode,
		CatchNode,
		ChainNode,
		ClassBodyNode,
		ClassNode,
		isClassNode,
		ClassExpressionNode,
		isClassExpressionNode,
		ClassPrivatePropertyNode,
		isClassPrivatePropertyNode,
		ClassPropertyNode,
		isClassPropertyNode,
		ClassStaticBlockNode,
		ConciseMethodNode,
		ConditionalNode,
		ConstNode,
		isConstNode,
		ConstantNode,
		ContinueNode,
		DebuggerNode,
		DefaultNode,
		DefaultAssignNode,
		isDefaultAssignNode,
		DefClassNode,
		DefinitionsLikeNode,
		DefunNode,
		DestructuringNode,
		isDestructuringNode,
		DirectiveNode,
		DoNode,
		DotNode,
		DotHashNode,
		DynamicImportNode,
		EmptyStatementNode,
		ExpansionNode,
		isExpansionNode,
		ExportNode,
		FalseNode,
		FinallyNode,
		ForNode,
		ForInNode,
		ForOfNode,
		FunctionNode,
		HoleNode,
		IfNode,
		ImportNode,
		ImportMetaNode,
		InfinityNode,
		LabelNode,
		LabeledStatementNode,
		LabelRefNode,
		LambdaNode,
		LetNode,
		isLetNode,
		NameMappingNode,
		NewNode,
		NewTargetNode,
		SyntaxNode,
		isSyntaxNode,
		NullNode,
		NumberNode,
		ObjectNode,
		isObjectNode,
		ObjectGetterNode,
		isObjectGetterNode,
		ObjectKeyValNode,
		isObjectKeyValNode,
		ObjectPropertyNode,
		ObjectSetterNode,
		isObjectSetterNode,
		PrefixedTemplateStringNode,
		PrivateGetterNode,
		isPrivateGetterNode,
		PrivateInNode,
		PrivateMethodNode,
		PrivateSetterNode,
		isPrivateSetterNode,
		PropAccessNode,
		isPropAccessNode,
		RegExpNode,
		ReturnNode,
		isReturnNode,
		SequenceNode,
		SimpleStatementNode,
		isSimpleStatementNode,
		StringNode,
		isStringNode,
		SubNode,
		SuperNode,
		SwitchNode,
		SwitchBranchNode,
		SymbolNode,
		isSymbolNode,
		SymbolCatchNode,
		SymbolClassNode,
		SymbolClassPropertyNode,
		SymbolConstNode,
		SymbolDefClassNode,
		SymbolDefunNode,
		SymbolExportNode,
		isSymbolExportNode,
		SymbolExportForeignNode,
		isSymbolExportForeignNode,
		SymbolFunargNode,
		SymbolImportNode,
		SymbolImportForeignNode,
		isSymbolImportForeignNode,
		SymbolLambdaNode,
		SymbolLetNode,
		SymbolMethodNode,
		isSymbolMethodNode,
		SymbolPrivatePropertyNode,
		SymbolPropertyNode,
		SymbolRefNode,
		SymbolUsingNode,
		SymbolVarNode,
		TemplateSegmentNode,
		TemplateStringNode,
		ThisNode,
		ThrowNode,
		ParsedToken,
		ToplevelNode,
		TrueNode,
		TryNode,
		TryBlockNode,
		UnaryNode,
		UnaryPostfixNode,
		UnaryPrefixNode,
		isUnaryPrefixNode,
		UsingNode,
		isUsingNode,
		UsingDefNode,
		VarNode,
		VarDefNode,
		VarDefLikeNode,
		WhileNode,
		WithNode,
		YieldNode
	} = ast;
	const { isBasicIdentifier } = createUnicode();

	// Where a parser hands its own tokens over, the token at an offset; null
	// where the tree being converted comes without them.
	/**
	 * @type {((pos: number, ending: boolean, forward?: number) => EXPECTED_ANY) | null}
	 */
	let tokenAt = null;
	// The source those tokens were read from, which a directive is read from.
	/** @type {string | null} */
	let tokenSource = null;

	/**
	 * @param {EXPECTED_ANY} estree an ESTree node
	 * @returns {EXPECTED_ANY} the token where it starts
	 */
	const startToken = (estree) => {
		if (tokenAt !== null) {
			const own = tokenAt(estree.start, false);
			if (own !== undefined) return own;
		}
		const { loc, range } = estree;
		const start = loc && loc.start;
		return new ParsedToken(
			"",
			"",
			(start && start.line) || 0,
			(start && start.column) || 0,
			range ? range[0] : estree.start,
			false,
			[],
			[],
			loc && loc.source
		);
	};

	/**
	 * terser reads `range[0]` here too, so a ranged node ends where it starts.
	 * @param {EXPECTED_ANY} estree an ESTree node
	 * @returns {EXPECTED_ANY} the token where it ends
	 */
	const endToken = (estree) => {
		if (tokenAt !== null) {
			const own = tokenAt(estree.end, true);
			if (own !== undefined) return own;
		}
		const { loc, range } = estree;
		const end = loc && loc.end;
		return new ParsedToken(
			"",
			"",
			(end && end.line) || 0,
			(end && end.column) || 0,
			range ? range[0] : estree.end,
			false,
			[],
			[],
			loc && loc.source
		);
	};

	/**
	 * terser reads a sequence's end off `peek()`, the token past the one its last
	 * expression is followed by, which a trailing comment then prints before.
	 * @param {EXPECTED_ANY} estree a sequence
	 * @returns {EXPECTED_ANY} the token it ends at
	 */
	const sequenceEndToken = (estree) => {
		if (tokenAt !== null) {
			const own = tokenAt(estree.end, true, 2);
			if (own !== undefined) return own;
		}
		return endToken(estree);
	};

	// The labels of the statements being converted, innermost last.
	/** @type {EXPECTED_ANY[] | null} */
	let fromLabels = null;

	/**
	 * @param {EXPECTED_ANY} estree an ESTree node, or null
	 * @returns {EXPECTED_ANY} terser's node, or null
	 */
	const fromEstree = (estree) => {
		if (estree === null || estree === undefined) return null;
		// A parser converting as it goes hands its children over already built.
		if (isSyntaxNode(estree)) return estree;
		const convert = FROM_ESTREE[estree.type];
		if (typeof convert !== "function") {
			throw new TypeError("MOZ_TO_ME[node.type] is not a function");
		}
		const node = convert(estree);
		// Only a parser handing its own tokens over read the comments an
		// annotation is written in; terser's conversion leaves every node bare.
		if (tokenAt !== null && node !== null && ANNOTATED_TYPES.has(estree.type)) {
			annotate(node);
		}
		return node;
	};

	/**
	 * The quotes and the text between them of a string written where a directive
	 * can be, as terser's parser reads one: an escape in it is kept, so a
	 * directive spelled with one is not the directive it reads as.
	 * @param {EXPECTED_ANY} node the string the statement holds
	 * @returns {string | null | undefined} the source it was written as, null
	 * where there is none to read, undefined where no directive is written
	 */
	const directiveSource = (node) => {
		if (tokenSource === null || node.startToken === undefined) return null;
		const text = tokenSource;
		const open = node.startToken.pos;
		const quote = text[open];
		if (quote !== '"' && quote !== "'") return undefined;
		for (let i = open + 1; i < text.length; i++) {
			const character = text[i];
			if (character === "\\") {
				i++;
			} else if (character === quote) {
				return text.slice(open, i + 1);
			}
		}
		return undefined;
	};

	/**
	 * Turns the leading string statements of a body into directives.
	 * @param {Node[]} body the statements
	 * @returns {Node[]} the same array
	 */
	const normalizeDirectives = (body) => {
		for (let i = 0; i < body.length; i++) {
			const statement = /** @type {EXPECTED_ANY} */ (body[i]);
			if (
				!isSimpleStatementNode(statement) ||
				!isStringNode(statement.expression)
			) {
				return body;
			}
			const raw = directiveSource(statement.expression);
			// A string the source does not open a prologue with ends it: one inside
			// parentheses is an expression, whatever it spells.
			if (raw === undefined) return body;
			const directive =
				raw === null ? statement.expression.value : raw.slice(1, -1);
			body[i] = new DirectiveNode({
				startToken: statement.startToken,
				endToken: statement.endToken,
				directive,
				// The literal spelling it, as terser held the directive's quote.
				expression: new StringNode({
					startToken: statement.startToken,
					endToken: statement.endToken,
					value: directive,
					quote: raw === null ? statement.expression.quote : raw[0]
				})
			});
		}
		return body;
	};

	/**
	 * A function's block, its leading string statements read as directives.
	 * @param {EXPECTED_ANY} estree the block
	 * @returns {Node} terser's block
	 */
	const blockFromEstree = (estree) => {
		const block = fromEstree(estree);
		normalizeDirectives(block.body);
		return block;
	};

	/**
	 * @param {EXPECTED_ANY[] | undefined} attributes an import's attributes
	 * @returns {Node | null} them as an object, or null when there are none
	 */
	const importAttributesFromEstree = (attributes) => {
		if (!attributes || attributes.length === 0) return null;
		return new ObjectNode({
			startToken: startToken(attributes),
			endToken: endToken(attributes),
			properties: attributes.map(
				(attribute) =>
					new ObjectKeyValNode({
						startToken: startToken(attribute),
						endToken: endToken(attribute),
						key: propertyNameFromEstree(attribute.key),
						value: fromEstree(attribute.value),
						computed: false,
						kind: "init",
						method: false,
						shorthand: false
					})
			)
		});
	};

	/**
	 * @param {EXPECTED_ANY} key an identifier or literal naming a property
	 * @returns {Node} the name, as terser's string read it
	 */
	const propertyNameFromEstree = (key) =>
		new SymbolPropertyNode({
			startToken: startToken(key),
			endToken: endToken(key),
			name: key.type === "Identifier" ? key.name : String(key.value)
		});

	/**
	 * @param {EXPECTED_ANY} key a property's key
	 * @param {boolean} computed whether it is computed
	 * @returns {string} the quote a string key had
	 */
	const quoteFromEstree = (key, computed) => {
		if (computed || key.type !== "Literal" || typeof key.value !== "string") {
			return "";
		}
		// Only a parser handing its own tokens over is known to have written `raw`
		// from the source, which holds the quote the key had.
		return tokenAt !== null && typeof key.raw === "string" ? key.raw[0] : '"';
	};

	/**
	 * @param {EXPECTED_ANY} SymbolType the symbol's class
	 * @param {EXPECTED_ANY} estree an identifier or a string literal
	 * @param {boolean=} hasQuote whether it was a string
	 * @returns {EXPECTED_ANY} the symbol
	 */
	const symbolFromEstree = (SymbolType, estree, hasQuote) =>
		new SymbolType({
			startToken: startToken(estree),
			quote: hasQuote
				? tokenAt !== null && typeof estree.raw === "string"
					? estree.raw[0]
					: '"'
				: undefined,
			name: estree.type === "Identifier" ? estree.name : String(estree.value),
			endToken: endToken(estree)
		});

	/**
	 * @param {EXPECTED_ANY} estree a function
	 * @param {boolean} isMethod whether it is a method's value
	 * @returns {Node} terser's function
	 */
	const lambdaFromEstree = (estree, isMethod) =>
		new (isMethod ? AccessorNode : FunctionNode)({
			startToken: startToken(estree),
			endToken: endToken(estree),
			id:
				estree.id &&
				symbolFromEstree(
					isMethod ? SymbolMethodNode : SymbolLambdaNode,
					estree.id
				),
			params: estree.params.map((/** @type {EXPECTED_ANY} */ param) =>
				patternFromEstree(param, SymbolFunargNode)
			),
			generator: estree.generator,
			async: estree.async,
			body: blockFromEstree(estree.body)
		});

	/**
	 * @param {EXPECTED_ANY} estree a binding pattern
	 * @param {EXPECTED_ANY} SymbolType the class of the names it binds
	 * @returns {EXPECTED_ANY} terser's binding
	 */
	const patternFromEstree = (estree, SymbolType) => {
		switch (estree.type) {
			case "ObjectPattern":
				return new DestructuringNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					elements: null,
					properties: estree.properties.map(
						(/** @type {EXPECTED_ANY} */ property) =>
							patternFromEstree(property, SymbolType)
					),
					is_array: false
				});
			case "Property": {
				const { key } = estree;
				/** @type {Record<string, EXPECTED_ANY>} */
				const args = {
					startToken: startToken(key || estree.value),
					endToken: endToken(estree.value),
					key: estree.computed
						? fromEstree(estree.key)
						: propertyNameFromEstree(key),
					quote:
						!estree.computed &&
						key.type === "Literal" &&
						typeof key.value === "string"
							? '"'
							: "",
					value: patternFromEstree(estree.value, SymbolType),
					computed: Boolean(estree.computed),
					kind: "init",
					method: false,
					shorthand: Boolean(estree.shorthand)
				};
				return new ObjectKeyValNode(args);
			}
			case "ArrayPattern":
				return new DestructuringNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					elements: estree.elements.map(
						(/** @type {EXPECTED_ANY} */ element) =>
							element === null ? null : patternFromEstree(element, SymbolType)
					),
					properties: null,
					is_array: true
				});
			case "SpreadElement":
			case "RestElement":
				return new ExpansionNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					argument: patternFromEstree(estree.argument, SymbolType)
				});
			case "AssignmentPattern":
				return new DefaultAssignNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					left: patternFromEstree(estree.left, SymbolType),
					operator: "=",
					right: fromEstree(estree.right)
				});
			case "Identifier":
				return new SymbolType({
					startToken: startToken(estree),
					endToken: endToken(estree),
					name: estree.name
				});
			default:
				throw new Error(`Invalid node type for destructuring: ${estree.type}`);
		}
	};

	/**
	 * @param {EXPECTED_ANY} estree a `break` or `continue` label, or null
	 * @returns {EXPECTED_ANY} the label reference, tied to its label
	 */
	const labelReferenceFromEstree = (estree) => {
		if (!estree) return null;
		const label = symbolFromEstree(LabelRefNode, estree);
		const labels = /** @type {EXPECTED_ANY[]} */ (fromLabels);
		let i = labels.length;
		while (i--) {
			if (label.name === labels[i].name) {
				label.thedef = labels[i];
				break;
			}
		}
		return label;
	};

	/**
	 * @param {EXPECTED_ANY} estree a unary or update expression
	 * @returns {Node} terser's prefix or postfix unary
	 */
	const unaryFromEstree = (estree) => {
		const prefix =
			"prefix" in estree ? estree.prefix : estree.type === "UnaryExpression";
		return new (prefix ? UnaryPrefixNode : UnaryPostfixNode)({
			startToken: startToken(estree),
			endToken: endToken(estree),
			operator: estree.operator,
			argument: fromEstree(estree.argument)
		});
	};

	/**
	 * @param {EXPECTED_ANY} estree a class declaration or expression
	 * @param {boolean=} asExpression whether to build the expression, whatever the type says
	 * @returns {Node} terser's class
	 */
	const classFromEstree = (estree, asExpression) => {
		const expression =
			asExpression === undefined
				? estree.type !== "ClassDeclaration"
				: asExpression;
		return new (expression ? ClassExpressionNode : DefClassNode)({
			startToken: startToken(estree),
			endToken: endToken(estree),
			id:
				estree.id &&
				symbolFromEstree(
					expression ? SymbolClassNode : SymbolDefClassNode,
					estree.id
				),
			superClass: fromEstree(estree.superClass),
			body: new ClassBodyNode({
				startToken: startToken(estree.body),
				endToken: endToken(estree.body),
				body: estree.body.body.map(fromEstree)
			})
		});
	};

	// How many of a parenthesis token's comments came before the parenthesis,
	// which are the only ones an annotation is read from.
	/** @type {WeakMap<EXPECTED_ANY, number>} */
	const outerCommentsBeforeCounts = new WeakMap();
	// The node kinds terser's parser annotates, by the ESTree type each is built
	// from; annotating another would mark what terser leaves unmarked.
	const ANNOTATED_TYPES = new Set([
		"CallExpression",
		"NewExpression",
		"ImportExpression",
		"MemberExpression",
		"Property",
		"MethodDefinition",
		"PropertyDefinition",
		"Literal"
	]);
	const ANNOTATIONS = [
		[/[@#]__PURE__/, ast._PURE],
		[/[@#]__INLINE__/, ast._INLINE],
		[/[@#]__NOINLINE__/, ast._NOINLINE],
		[/[@#]__KEY__/, ast._KEY],
		[/[@#]__MANGLE_PROP__/, ast._MANGLEPROP]
	];

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
				pattern.slice(from, backslash) +
				(code < 128 ? `\\${escaped}` : escaped);
			from = backslash + 1 + escaped.length;
			backslash = pattern.indexOf("\\", from);
		}
		return source + pattern.slice(from);
	};

	/**
	 * Marks a node with the `#__PURE__`-style comment nearest before it, as
	 * terser's parser does, only those outside its parentheses counting.
	 * @param {EXPECTED_ANY} node the node built
	 * @returns {void}
	 */
	const annotate = (node) => {
		const token = node.startToken;
		if (token === undefined || token === null) return;
		const comments = token.comments_before;
		const outside = outerCommentsBeforeCounts.get(token);
		let i = outside === undefined ? comments.length : outside;
		while (--i >= 0) {
			const { value } = comments[i];
			if (!/[@#]__/.test(value)) continue;
			for (const [pattern, annotation] of ANNOTATIONS) {
				if (!pattern.test(value)) continue;
				node._annotations |= annotation;
				// WHY: terser's parser annotates a `.` or `[…]` link by annotating
				// whatever the rest of the chain returns, so such a link holds the mark
				// only where the chain ends there, while every call annotates itself.
				const inner = ast.expressionOf(node);
				if (isPropAccessNode(inner) && inner.startToken === token) {
					inner._annotations &= ~annotation;
				}
				return;
			}
		}
	};

	/**
	 * The expression parentheses hold, holding the parentheses' own tokens, as
	 * terser's parser leaves it: the comments outside them come first, and both
	 * tokens share the list they are in.
	 * @param {EXPECTED_ANY} estree a parenthesized expression
	 * @returns {Node} the expression inside it
	 */
	const parenthesizedFromEstree = (estree) => {
		const expression = fromEstree(estree.expression);
		const open = startToken(estree);
		const close = endToken(estree);
		// terser reads a sequence's end off `peek()` once the parenthesis holding
		// it is read, so this one ends two tokens past its own close.
		if (estree.expression.type === "SequenceExpression") {
			expression.endToken = sequenceEndToken(estree);
		}
		const inner = expression.startToken;
		if (inner) {
			const outer = open.comments_before;
			outerCommentsBeforeCounts.set(open, outer.length);
			// The two tokens read one list, the comments outside the parenthesis
			// first. Built rather than moved: the list is shared where it is empty.
			const before =
				outer.length === 0
					? inner.comments_before
					: [...outer, ...inner.comments_before];
			inner.comments_before = before;
			open.comments_before = before;
			// Only a parenthesis holding no comment of its own hands its line break
			// to the first comment inside it, as terser's parser has it.
			if (outer.length === 0 && before.length > 0) {
				const [comment] = before;
				if (!comment.nlb) {
					comment.nlb = open.nlb;
					open.nlb = false;
				}
			}
			open.comments_after = inner.comments_after;
		}
		expression.startToken = open;
		const last = expression.endToken;
		if (last) {
			close.comments_before = last.comments_before;
			const after =
				close.comments_after.length === 0
					? last.comments_after
					: [...last.comments_after, ...close.comments_after];
			last.comments_after = after;
			close.comments_after = after;
		}
		expression.endToken = close;
		// terser reads an annotation again off the parenthesis a call opens at.
		if (isCallNode(expression)) annotate(expression);
		return expression;
	};

	/** @type {Record<string, (estree: EXPECTED_ANY) => EXPECTED_ANY>} */
	const FROM_ESTREE = {
		ParenthesizedExpression: parenthesizedFromEstree,
		Program: (estree) =>
			new ToplevelNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				body: normalizeDirectives(estree.body.map(fromEstree))
			}),
		ArrayPattern: (estree) =>
			new DestructuringNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				elements: estree.elements.map((/** @type {EXPECTED_ANY} */ element) =>
					element === null ? null : fromEstree(element)
				),
				properties: null,
				is_array: true
			}),
		ObjectPattern: (estree) =>
			new DestructuringNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				elements: null,
				properties: estree.properties.map(fromEstree),
				is_array: false
			}),
		AssignmentPattern: (estree) =>
			new DefaultAssignNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				left: fromEstree(estree.left),
				operator: "=",
				right: fromEstree(estree.right)
			}),
		SpreadElement: (estree) =>
			new ExpansionNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				argument: fromEstree(estree.argument)
			}),
		RestElement: (estree) =>
			new ExpansionNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				argument: fromEstree(estree.argument)
			}),
		TemplateElement: (estree) =>
			new TemplateSegmentNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				value: estree.value.cooked,
				raw: estree.value.raw
			}),
		TemplateLiteral: (estree) => {
			/** @type {Node[]} */
			const segments = [];
			for (let i = 0; i < estree.quasis.length; i++) {
				segments.push(fromEstree(estree.quasis[i]));
				if (estree.expressions[i]) {
					segments.push(fromEstree(estree.expressions[i]));
				}
			}
			return new TemplateStringNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				segments
			});
		},
		TaggedTemplateExpression: (estree) =>
			new PrefixedTemplateStringNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				quasi: fromEstree(estree.quasi),
				tag: fromEstree(estree.tag)
			}),
		FunctionDeclaration: (estree) =>
			new DefunNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				id: estree.id && symbolFromEstree(SymbolDefunNode, estree.id),
				params: estree.params.map((/** @type {EXPECTED_ANY} */ param) =>
					patternFromEstree(param, SymbolFunargNode)
				),
				generator: estree.generator,
				async: estree.async,
				body: blockFromEstree(estree.body)
			}),
		FunctionExpression: (estree) => lambdaFromEstree(estree, false),
		ArrowFunctionExpression: (estree) => {
			// terser's conversion leaves an arrow's directive a statement, where its
			// parser reads one; only a tree we parsed ourselves is ours to fix.
			const body =
				estree.body.type === "BlockStatement"
					? tokenAt === null
						? fromEstree(estree.body)
						: blockFromEstree(estree.body)
					: new BlockStatementNode({
							body: [
								// terser's parser gives the return the tokens of the expression
								// it returns; its conversion, `make_node` with no original,
								// leaves it without any.
								new ReturnNode({
									argument: fromEstree(estree.body),
									startToken:
										tokenAt === null ? undefined : startToken(estree.body),
									// terser reads the token it has reached, past the expression.
									endToken:
										tokenAt === null
											? undefined
											: tokenAt(estree.body.end, false)
								})
							]
						});
			return new ArrowNode({
				startToken: startToken(estree),
				// terser's parser leaves an arrow without the token it ends at.
				endToken: tokenAt === null ? endToken(estree) : undefined,
				params: estree.params.map((/** @type {EXPECTED_ANY} */ param) =>
					patternFromEstree(param, SymbolFunargNode)
				),
				body,
				async: estree.async
			});
		},
		ExpressionStatement: (estree) =>
			new SimpleStatementNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				expression: fromEstree(estree.expression)
			}),
		TryStatement: (estree) => {
			const handlers = estree.handlers || [estree.handler];
			if (
				handlers.length > 1 ||
				(estree.guardedHandlers && estree.guardedHandlers.length)
			) {
				throw new Error("Multiple catch clauses are not supported.");
			}
			return new TryNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				block: new TryBlockNode(fromEstree(estree.block)),
				handler: fromEstree(handlers[0]),
				finalizer: estree.finalizer
					? new FinallyNode(fromEstree(estree.finalizer))
					: null
			});
		},
		Property: (estree) => {
			// terser's parser opens a computed property at the `[`, where its
			// conversion reads the key, which starts one token later.
			const opensAt =
				tokenAt !== null && estree.computed
					? estree
					: estree.key || estree.value;
			if (estree.kind === "init" && !estree.method) {
				return new ObjectKeyValNode({
					startToken: startToken(opensAt),
					endToken: endToken(estree.value),
					key: estree.computed
						? fromEstree(estree.key)
						: propertyNameFromEstree(estree.key),
					quote: quoteFromEstree(estree.key, estree.computed),
					value: fromEstree(estree.value),
					computed: Boolean(estree.computed),
					kind: "init",
					method: false,
					shorthand: Boolean(estree.shorthand)
				});
			}
			const value = lambdaFromEstree(estree.value, true);
			const args = {
				startToken: startToken(opensAt),
				endToken: endToken(estree.value),
				key: estree.computed
					? fromEstree(estree.key)
					: symbolFromEstree(SymbolMethodNode, estree.key),
				quote: quoteFromEstree(estree.key, estree.computed),
				static: false,
				value,
				computed: Boolean(estree.computed),
				kind: estree.kind,
				method: Boolean(estree.method),
				shorthand: false
			};
			if (estree.kind === "get") return new ObjectGetterNode(args);
			if (estree.kind === "set") return new ObjectSetterNode(args);
			if (estree.method) return new ConciseMethodNode(args);
		},
		MethodDefinition: (estree) => {
			const isPrivate = estree.key.type === "PrivateIdentifier";
			// terser's parser names a member with the token it read, where its
			// conversion leaves the symbol without one.
			const key = estree.computed
				? fromEstree(estree.key)
				: new SymbolMethodNode({
						name: estree.key.name || String(estree.key.value),
						startToken: tokenAt === null ? undefined : startToken(estree.key),
						endToken: tokenAt === null ? undefined : endToken(estree.key)
					});
			const args = {
				startToken: startToken(estree),
				endToken: endToken(estree),
				key,
				quote: quoteFromEstree(estree.key, estree.computed),
				value: lambdaFromEstree(estree.value, true),
				static: estree.static,
				computed: Boolean(estree.computed),
				kind: estree.kind
			};
			if (estree.kind === "get") {
				return new (isPrivate ? PrivateGetterNode : ObjectGetterNode)(args);
			}
			if (estree.kind === "set") {
				return new (isPrivate ? PrivateSetterNode : ObjectSetterNode)(args);
			}
			return new (isPrivate ? PrivateMethodNode : ConciseMethodNode)(args);
		},
		FieldDefinition: (estree) => {
			if (!estree.computed && estree.key.type !== "Identifier") {
				throw new Error("Non-Identifier key in FieldDefinition");
			}
			// terser reads the key's symbol as an expression: computed.
			return new ClassPropertyNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				quote: quoteFromEstree(estree.key, estree.computed),
				key: fromEstree(estree.key),
				value: fromEstree(estree.value),
				static: estree.static,
				computed: true
			});
		},
		PropertyDefinition: (estree) => {
			if (!estree.computed && estree.key.type === "PrivateIdentifier") {
				return new ClassPrivatePropertyNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					key: fromEstree(estree.key),
					value: fromEstree(estree.value),
					static: estree.static,
					computed: false
				});
			}
			return new ClassPropertyNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				quote: quoteFromEstree(estree.key, estree.computed),
				key: estree.computed
					? fromEstree(estree.key)
					: symbolFromEstree(SymbolClassPropertyNode, estree.key),
				value: fromEstree(estree.value),
				static: estree.static,
				computed: Boolean(estree.computed)
			});
		},
		PrivateIdentifier: (estree) =>
			new SymbolPrivatePropertyNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				name: estree.name
			}),
		StaticBlock: (estree) =>
			new ClassStaticBlockNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				body: estree.body.map(fromEstree)
			}),
		ArrayExpression: (estree) =>
			new ArrayNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				elements: estree.elements.map((/** @type {EXPECTED_ANY} */ element) =>
					element === null ? null : fromEstree(element)
				)
			}),
		ObjectExpression: (estree) =>
			new ObjectNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				properties: estree.properties.map(
					(/** @type {EXPECTED_ANY} */ property) => {
						// terser converts every other member as a plain property.
						if (property.type !== "SpreadElement") property.type = "Property";
						return fromEstree(property);
					}
				)
			}),
		SequenceExpression: (estree) =>
			new SequenceNode({
				startToken: startToken(estree),
				endToken: sequenceEndToken(estree),
				expressions: estree.expressions.map(fromEstree)
			}),
		MemberExpression: (estree) => {
			if (estree.property.type === "PrivateIdentifier") {
				return new DotHashNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					property: fromEstree(estree.property),
					object: fromEstree(estree.object),
					optional: estree.optional || false,
					computed: false
				});
			}
			return new (estree.computed ? SubNode : DotNode)({
				startToken: startToken(estree),
				endToken: endToken(estree),
				property: estree.computed
					? fromEstree(estree.property)
					: propertyNameFromEstree(estree.property),
				object: fromEstree(estree.object),
				optional: estree.optional || false,
				computed: Boolean(estree.computed)
			});
		},
		ChainExpression: (estree) =>
			new ChainNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				expression: fromEstree(estree.expression)
			}),
		SwitchCase: (estree) =>
			new (estree.test ? CaseNode : DefaultNode)({
				startToken: startToken(estree),
				endToken: endToken(estree),
				test: fromEstree(estree.test),
				consequent: estree.consequent.map(fromEstree)
			}),
		VariableDeclaration: (estree) => {
			let DeclarationType = VarNode;
			let DefinitionType = VarDefNode;
			let SymbolType = SymbolVarNode;
			let awaitUsing = false;
			if (estree.kind === "const") {
				DeclarationType = ConstNode;
				SymbolType = SymbolConstNode;
			} else if (estree.kind === "let") {
				DeclarationType = LetNode;
				SymbolType = SymbolLetNode;
			} else if (estree.kind === "using" || estree.kind === "await using") {
				DeclarationType = UsingNode;
				DefinitionType = UsingDefNode;
				SymbolType = SymbolUsingNode;
				awaitUsing = estree.kind === "await using";
			}
			return new DeclarationType({
				startToken: startToken(estree),
				endToken: endToken(estree),
				declarations: estree.declarations.map(
					(/** @type {EXPECTED_ANY} */ declarator) =>
						new DefinitionType({
							startToken: startToken(declarator),
							endToken: endToken(declarator),
							id: patternFromEstree(declarator.id, SymbolType),
							init: fromEstree(declarator.init)
						})
				),
				await: awaitUsing
			});
		},
		ImportDeclaration: (estree) => {
			let importedName = null;
			/** @type {Node[] | null} */
			let importedNames = null;
			for (const specifier of estree.specifiers) {
				if (
					specifier.type === "ImportSpecifier" ||
					specifier.type === "ImportNamespaceSpecifier"
				) {
					if (!importedNames) importedNames = [];
					importedNames.push(fromEstree(specifier));
				} else if (specifier.type === "ImportDefaultSpecifier") {
					importedName = fromEstree(specifier);
				}
			}
			return new ImportNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				imported_name: importedName,
				imported_names: importedNames,
				source: fromEstree(estree.source),
				attributes: importAttributesFromEstree(
					estree.attributes || estree.assertions
				),
				phase: estree.phase || null
			});
		},
		ImportSpecifier: (estree) =>
			new NameMappingNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				imported: symbolFromEstree(
					SymbolImportForeignNode,
					estree.imported,
					estree.imported.type === "Literal"
				),
				exported: null,
				local: symbolFromEstree(SymbolImportNode, estree.local)
			}),
		ImportDefaultSpecifier: (estree) =>
			symbolFromEstree(SymbolImportNode, estree.local),
		ImportNamespaceSpecifier: (estree) =>
			new NameMappingNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				imported: new SymbolImportForeignNode({ name: "*" }),
				exported: null,
				local: symbolFromEstree(SymbolImportNode, estree.local)
			}),
		ImportExpression: (estree) => {
			const args = [fromEstree(estree.source)];
			if (estree.options) args.push(fromEstree(estree.options));
			return new DynamicImportNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				phase: estree.phase,
				args
			});
		},
		ExportAllDeclaration: (estree) => {
			const foreignName =
				estree.exported === null || estree.exported === undefined
					? new SymbolExportForeignNode({ name: "*" })
					: symbolFromEstree(
							SymbolExportForeignNode,
							estree.exported,
							estree.exported.type === "Literal"
						);
			return new ExportNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				exported_names: [
					new NameMappingNode({
						startToken: startToken(estree),
						endToken: endToken(estree),
						local: new SymbolExportNode({ name: "*" }),
						imported: null,
						exported: foreignName
					})
				],
				source: fromEstree(estree.source),
				attributes: importAttributesFromEstree(
					estree.attributes || estree.assertions
				)
			});
		},
		ExportNamedDeclaration: (estree) => {
			if (estree.declaration) {
				return new ExportNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					exported_definition: fromEstree(estree.declaration),
					exported_names: null,
					source: null,
					attributes: null
				});
			}
			return new ExportNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				exported_definition: null,
				exported_names:
					estree.specifiers && estree.specifiers.length
						? estree.specifiers.map(fromEstree)
						: [],
				source: fromEstree(estree.source),
				attributes: importAttributesFromEstree(
					estree.attributes || estree.assertions
				)
			});
		},
		ExportDefaultDeclaration: (estree) => {
			const { declaration } = estree;
			const isClass = declaration.type === "ClassDeclaration";
			const isFunction = declaration.type === "FunctionDeclaration";
			const start = startToken(estree);
			const end = endToken(estree);
			// WHY: terser's conversion exports every declaration as a value, where
			// its parser exports a named one as a declaration and an anonymous class
			// or function as the expression it is; `drop_unused` then reads a name
			// the value has not got. Only a tree we parsed ourselves is ours to fix.
			if (tokenAt === null || (!isClass && !isFunction)) {
				return new ExportNode({
					startToken: start,
					endToken: end,
					exported_value: fromEstree(declaration),
					is_default: true
				});
			}
			if (declaration.id) {
				return new ExportNode({
					startToken: start,
					endToken: end,
					exported_definition: fromEstree(declaration),
					is_default: true
				});
			}
			return new ExportNode({
				startToken: start,
				endToken: end,
				exported_value: isClass
					? classFromEstree(declaration, true)
					: lambdaFromEstree(declaration, false),
				is_default: true
			});
		},
		ExportSpecifier: (estree) =>
			new NameMappingNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				imported: null,
				exported: symbolFromEstree(
					SymbolExportForeignNode,
					estree.exported,
					estree.exported.type === "Literal"
				),
				local: symbolFromEstree(
					SymbolExportNode,
					estree.local,
					estree.local.type === "Literal"
				)
			}),
		Literal: (estree) => {
			const { value, regex } = estree;
			/** @type {Record<string, EXPECTED_ANY>} */
			const args = {
				startToken: startToken(estree),
				endToken: endToken(estree)
			};
			if (regex && regex.pattern) {
				args.value = {
					source:
						tokenAt === null
							? regex.pattern
							: regexpSourceAsRead(regex.pattern),
					flags: regex.flags
				};
				return new RegExpNode(args);
			} else if (regex) {
				// A legacy regexp, read from its source.
				const regexSource = estree.raw || value;
				const match = regexSource.match(/^\/(.*)\/(\w*)$/);
				if (!match) throw new Error(`Invalid regex source ${regexSource}`);
				args.value = { source: match[1], flags: match[2] };
				return new RegExpNode(args);
			}
			const bigint =
				typeof value === "bigint" ? value.toString() : estree.bigint;
			if (typeof bigint === "string") {
				// The digits are kept as written, radix and all, where `bigint` holds
				// them in decimal; only `raw` says how they were read. A separator is
				// not one of the digits, so it goes, as the tokenizer drops it.
				args.value =
					tokenAt !== null && typeof estree.raw === "string"
						? estree.raw.slice(0, -1).replace(/_/g, "")
						: bigint;
				args.raw = estree.raw;
				return new BigIntNode(args);
			}
			if (value === null) return new NullNode(args);
			switch (typeof value) {
				case "string":
					// Only a parser handing its own tokens over is known to have written
					// `raw` from the source, which holds the quote the string had.
					args.quote =
						tokenAt !== null && typeof estree.raw === "string"
							? estree.raw[0]
							: '"';
					args.value = value;
					return new StringNode(args);
				case "number":
					// As terser's parser reads it: a literal too large for a double is
					// the infinity it holds, which the printer writes as a division.
					if (value === Number.POSITIVE_INFINITY) {
						return new InfinityNode(args);
					}
					args.value = value;
					args.raw = estree.raw || value.toString();
					return new NumberNode(args);
				case "boolean":
					return new (value ? TrueNode : FalseNode)(args);
			}
		},
		MetaProperty: (estree) => {
			if (estree.meta.name === "new" && estree.property.name === "target") {
				return new NewTargetNode({
					startToken: startToken(estree),
					endToken: endToken(estree)
				});
			} else if (
				estree.meta.name === "import" &&
				estree.property.name === "meta"
			) {
				return new ImportMetaNode({
					startToken: startToken(estree),
					endToken: endToken(estree)
				});
			}
		},
		Identifier: (estree) =>
			new SymbolRefNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				name: estree.name
			}),
		EmptyStatement: (estree) =>
			new EmptyStatementNode({
				startToken: startToken(estree),
				endToken: endToken(estree)
			}),
		BlockStatement: (estree) =>
			new BlockStatementNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				body: estree.body.map(fromEstree)
			}),
		IfStatement: (estree) =>
			new IfNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				test: fromEstree(estree.test),
				consequent: fromEstree(estree.consequent),
				alternate: fromEstree(estree.alternate)
			}),
		LabeledStatement: (estree) => {
			const labels = /** @type {EXPECTED_ANY[]} */ (fromLabels);
			try {
				const label = symbolFromEstree(LabelNode, estree.label);
				labels.push(label);
				return new LabeledStatementNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					label,
					body: fromEstree(estree.body)
				});
			} finally {
				labels.pop();
			}
		},
		BreakStatement: (estree) =>
			new BreakNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				label: labelReferenceFromEstree(estree.label)
			}),
		ContinueStatement: (estree) =>
			new ContinueNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				label: labelReferenceFromEstree(estree.label)
			}),
		WithStatement: (estree) =>
			new WithNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				object: fromEstree(estree.object),
				body: fromEstree(estree.body)
			}),
		SwitchStatement: (estree) =>
			new SwitchNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				discriminant: fromEstree(estree.discriminant),
				cases: estree.cases.map(fromEstree)
			}),
		ReturnStatement: (estree) =>
			new ReturnNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				argument: fromEstree(estree.argument)
			}),
		ThrowStatement: (estree) =>
			new ThrowNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				argument: fromEstree(estree.argument)
			}),
		WhileStatement: (estree) =>
			new WhileNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				test: fromEstree(estree.test),
				body: fromEstree(estree.body)
			}),
		DoWhileStatement: (estree) =>
			new DoNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				test: fromEstree(estree.test),
				body: fromEstree(estree.body)
			}),
		ForStatement: (estree) =>
			new ForNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				init: fromEstree(estree.init),
				test: fromEstree(estree.test),
				update: fromEstree(estree.update),
				body: fromEstree(estree.body)
			}),
		ForInStatement: (estree) =>
			new ForInNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				left: fromEstree(estree.left),
				right: fromEstree(estree.right),
				body: fromEstree(estree.body)
			}),
		ForOfStatement: (estree) =>
			new ForOfNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				left: fromEstree(estree.left),
				right: fromEstree(estree.right),
				body: fromEstree(estree.body),
				await: estree.await
			}),
		AwaitExpression: (estree) =>
			new AwaitNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				argument: fromEstree(estree.argument)
			}),
		YieldExpression: (estree) =>
			new YieldNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				argument: fromEstree(estree.argument),
				delegate: estree.delegate
			}),
		DebuggerStatement: (estree) =>
			new DebuggerNode({
				startToken: startToken(estree),
				endToken: endToken(estree)
			}),
		CatchClause: (estree) =>
			new CatchNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				param: estree.param
					? patternFromEstree(estree.param, SymbolCatchNode)
					: null,
				body: fromEstree(estree.body)
			}),
		ThisExpression: (estree) =>
			new ThisNode({
				startToken: startToken(estree),
				name: "this",
				endToken: endToken(estree)
			}),
		Super: (estree) =>
			new SuperNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				name: "super"
			}),
		BinaryExpression: (estree) => {
			if (estree.left.type === "PrivateIdentifier") {
				return new PrivateInNode({
					startToken: startToken(estree),
					endToken: endToken(estree),
					left: new SymbolPrivatePropertyNode({
						startToken: startToken(estree.left),
						endToken: endToken(estree.left),
						name: estree.left.name
					}),
					right: fromEstree(estree.right)
				});
			}
			return new BinaryNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				operator: estree.operator,
				left: fromEstree(estree.left),
				right: fromEstree(estree.right)
			});
		},
		LogicalExpression: (estree) =>
			new BinaryNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				operator: estree.operator,
				left: fromEstree(estree.left),
				right: fromEstree(estree.right)
			}),
		AssignmentExpression: (estree) =>
			new AssignNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				operator: estree.operator,
				logical:
					estree.operator === "??=" ||
					estree.operator === "&&=" ||
					estree.operator === "||=",
				left: fromEstree(estree.left),
				right: fromEstree(estree.right)
			}),
		ConditionalExpression: (estree) =>
			new ConditionalNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				test: fromEstree(estree.test),
				consequent: fromEstree(estree.consequent),
				alternate: fromEstree(estree.alternate)
			}),
		NewExpression: (estree) =>
			new NewNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				callee: fromEstree(estree.callee),
				arguments: estree.arguments.map(fromEstree)
			}),
		CallExpression: (estree) =>
			new CallNode({
				startToken: startToken(estree),
				endToken: endToken(estree),
				callee: fromEstree(estree.callee),
				optional: estree.optional,
				arguments: estree.arguments.map(fromEstree)
			}),
		UpdateExpression: unaryFromEstree,
		UnaryExpression: unaryFromEstree,
		ClassDeclaration: classFromEstree,
		ClassExpression: classFromEstree
	};

	/**
	 * @param {EXPECTED_ANY} estree an ESTree tree
	 * @param {((pos: number, ending: boolean) => EXPECTED_ANY)=} ownTokenAt the parser's token at an offset, where it kept them
	 * @param {string=} source what those tokens were read from
	 * @returns {EXPECTED_ANY} terser's tree
	 */
	SyntaxNode.from_mozilla_ast = (estree, ownTokenAt, source) => {
		const savedLabels = fromLabels;
		const savedTokens = tokenAt;
		const savedSource = tokenSource;
		fromLabels = [];
		tokenAt = ownTokenAt === undefined ? null : ownTokenAt;
		tokenSource = source === undefined ? null : source;
		try {
			return fromEstree(estree);
		} finally {
			fromLabels = savedLabels;
			tokenAt = savedTokens;
			tokenSource = savedSource;
		}
	};

	/**
	 * @param {EXPECTED_ANY} node terser's node
	 * @param {EXPECTED_ANY} estree the ESTree node it converts to
	 * @returns {EXPECTED_ANY} the ESTree node, with `range` and `loc` from the node's tokens
	 */
	const setEstreeLocation = (node, estree) => {
		const { startToken: start, endToken: end } = node;
		if (!(start && end)) return estree;
		if (
			start.pos !== null &&
			start.pos !== undefined &&
			end.endpos !== null &&
			end.endpos !== undefined
		) {
			estree.range = [start.pos, end.endpos];
		}
		if (start.line) {
			estree.loc = {
				start: { line: start.line, column: start.col },
				end: end.endline ? { line: end.endline, column: end.endcol } : null
			};
			if (start.file) estree.loc.source = start.file;
		}
		return estree;
	};

	/**
	 * terser's `def_to_moz`: a class's `to_mozilla_ast`.
	 * @param {EXPECTED_ANY} Type the node class
	 * @param {(node: EXPECTED_ANY, parent: EXPECTED_ANY) => EXPECTED_ANY} handler its conversion
	 * @returns {void}
	 */
	const defineToEstree = (Type, handler) => {
		Type.prototype.to_mozilla_ast =
			/**
			 * @this {EXPECTED_ANY}
			 * @param {EXPECTED_ANY} parent the node holding this one
			 * @returns {EXPECTED_ANY} the ESTree node
			 */
			function to_mozilla_ast(parent) {
				return setEstreeLocation(this, handler(this, parent));
			};
	};

	// The nodes being converted, outermost first; null between conversions.
	/** @type {EXPECTED_ANY[] | null} */
	let toStack = null;

	/**
	 * @param {EXPECTED_ANY} node terser's node, or null
	 * @returns {EXPECTED_ANY} the ESTree node, or null
	 */
	const toEstree = (node) => {
		if (toStack === null) toStack = [];
		toStack.push(node);
		const estree =
			node !== null && node !== undefined
				? node.to_mozilla_ast(toStack[toStack.length - 2])
				: null;
		toStack.pop();
		if (toStack.length === 0) toStack = null;
		return estree;
	};

	/**
	 * @returns {boolean} whether a destructuring pattern holds the node being converted
	 */
	const inDestructuring = () => {
		const stack = /** @type {EXPECTED_ANY[]} */ (toStack);
		let i = stack.length;
		while (i--) {
			if (isDestructuringNode(stack[i])) return true;
		}
		return false;
	};

	/**
	 * A property key: a number literal where it reads as one, a string where
	 * quoted, else a name — shorthand where the value is that same name.
	 * @param {EXPECTED_ANY} key the key
	 * @param {boolean=} computed whether it is computed
	 * @param {EXPECTED_ANY=} quote the quote it had
	 * @param {EXPECTED_ANY=} value the property's value
	 * @returns {[boolean, EXPECTED_ANY]} whether it is shorthand, and the key
	 */
	const propertyKeyToEstree = (
		key,
		computed = false,
		quote = false,
		value = null
	) => {
		if (computed) return [false, toEstree(key)];
		const keyName = key.name;
		let estreeKey;
		if (quote) {
			estreeKey = {
				type: "Literal",
				value: keyName,
				raw: JSON.stringify(keyName)
			};
		} else if (`${Number(keyName)}` === keyName && Number(keyName) >= 0) {
			estreeKey = {
				type: "Literal",
				value: Number(keyName),
				raw: JSON.stringify(Number(keyName))
			};
		} else {
			estreeKey = { type: "Identifier", name: keyName };
		}
		const shorthand =
			estreeKey.type === "Identifier" &&
			estreeKey.name === keyName &&
			((isSymbolNode(value) && value.name === keyName) ||
				(isDefaultAssignNode(value) && value.left.name === keyName));
		return [shorthand, estreeKey];
	};

	/**
	 * @param {EXPECTED_ANY} node a binding
	 * @returns {EXPECTED_ANY} its ESTree pattern
	 */
	const patternToEstree = (node) => {
		if (isExpansionNode(node)) {
			return {
				type: "RestElement",
				argument: patternToEstree(node.argument)
			};
		}
		if (
			isSymbolNode(node) ||
			isDestructuringNode(node) ||
			isDefaultAssignNode(node) ||
			isPropAccessNode(node)
		) {
			return toEstree(node);
		}
		throw new Error(node.TYPE);
	};

	/**
	 * @param {EXPECTED_ANY} node a node with a statement list
	 * @returns {EXPECTED_ANY} the ESTree block of its statements
	 */
	const blockToEstree = (node) => ({
		type: "BlockStatement",
		body: node.body.map(toEstree)
	});

	/**
	 * A leading string statement gets an empty statement before it, so ESTree
	 * doesn't read it as a directive.
	 * @param {string} type the ESTree type
	 * @param {EXPECTED_ANY} node a scope
	 * @returns {EXPECTED_ANY} the ESTree node of its body
	 */
	const scopeToEstree = (type, node) => {
		/** @type {Node[]} */
		const statements = modules.ast.bodyOf(node);
		const body = statements.map(toEstree);
		if (
			isSimpleStatementNode(statements[0]) &&
			isStringNode(statements[0].expression)
		) {
			body.unshift(toEstree(new EmptyStatementNode(statements[0])));
		}
		return { type, body };
	};

	/**
	 * @param {EXPECTED_ANY} attributes an import's attributes object, or null
	 * @returns {EXPECTED_ANY[]} them as ESTree import attributes
	 */
	const importAttributesToEstree = (attributes) => {
		/** @type {EXPECTED_ANY[]} */
		const result = [];
		if (attributes) {
			for (const { key: name, value } of attributes.properties) {
				const key = name.name;
				result.push({
					type: "ImportAttribute",
					key: isBasicIdentifier(key)
						? { type: "Identifier", name: key }
						: { type: "Literal", value: key, raw: JSON.stringify(key) },
					value: toEstree(value)
				});
			}
		}
		return result;
	};

	defineToEstree(EmptyStatementNode, () => ({ type: "EmptyStatement" }));
	defineToEstree(BlockStatementNode, (node) => blockToEstree(node));
	defineToEstree(IfNode, (node) => ({
		type: "IfStatement",
		test: toEstree(node.test),
		consequent: toEstree(node.consequent),
		alternate: toEstree(node.alternate)
	}));
	defineToEstree(LabeledStatementNode, (node) => ({
		type: "LabeledStatement",
		label: toEstree(node.label),
		body: toEstree(node.body)
	}));
	defineToEstree(BreakNode, (node) => ({
		type: "BreakStatement",
		label: toEstree(node.label)
	}));
	defineToEstree(ContinueNode, (node) => ({
		type: "ContinueStatement",
		label: toEstree(node.label)
	}));
	defineToEstree(WithNode, (node) => ({
		type: "WithStatement",
		object: toEstree(node.object),
		body: toEstree(node.body)
	}));
	defineToEstree(SwitchNode, (node) => ({
		type: "SwitchStatement",
		discriminant: toEstree(node.discriminant),
		cases: node.cases.map(toEstree)
	}));
	defineToEstree(ReturnNode, (node) => ({
		type: "ReturnStatement",
		argument: toEstree(node.argument)
	}));
	defineToEstree(ThrowNode, (node) => ({
		type: "ThrowStatement",
		argument: toEstree(node.argument)
	}));
	defineToEstree(WhileNode, (node) => ({
		type: "WhileStatement",
		test: toEstree(node.test),
		body: toEstree(node.body)
	}));
	defineToEstree(DoNode, (node) => ({
		type: "DoWhileStatement",
		test: toEstree(node.test),
		body: toEstree(node.body)
	}));
	defineToEstree(ForNode, (node) => ({
		type: "ForStatement",
		init: toEstree(node.init),
		test: toEstree(node.test),
		update: toEstree(node.update),
		body: toEstree(node.body)
	}));
	defineToEstree(ForInNode, (node) => ({
		type: "ForInStatement",
		left: toEstree(node.left),
		right: toEstree(node.right),
		body: toEstree(node.body)
	}));
	defineToEstree(ForOfNode, (node) => ({
		type: "ForOfStatement",
		left: toEstree(node.left),
		right: toEstree(node.right),
		body: toEstree(node.body),
		await: node.await
	}));
	defineToEstree(AwaitNode, (node) => ({
		type: "AwaitExpression",
		argument: toEstree(node.argument)
	}));
	defineToEstree(YieldNode, (node) => ({
		type: "YieldExpression",
		argument: toEstree(node.argument),
		delegate: node.delegate
	}));
	defineToEstree(DebuggerNode, () => ({ type: "DebuggerStatement" }));
	defineToEstree(VarDefLikeNode, (node) => ({
		type: "VariableDeclarator",
		id: toEstree(node.id),
		init: toEstree(node.init)
	}));
	defineToEstree(ThisNode, () => ({ type: "ThisExpression" }));
	defineToEstree(SuperNode, () => ({ type: "Super" }));
	defineToEstree(ConditionalNode, (node) => ({
		type: "ConditionalExpression",
		test: toEstree(node.test),
		consequent: toEstree(node.consequent),
		alternate: toEstree(node.alternate)
	}));
	defineToEstree(NewNode, (node) => ({
		type: "NewExpression",
		callee: toEstree(node.callee),
		arguments: node.arguments.map(toEstree)
	}));
	defineToEstree(CallNode, (node) => ({
		type: "CallExpression",
		callee: toEstree(node.callee),
		optional: node.optional,
		arguments: node.arguments.map(toEstree)
	}));
	defineToEstree(DynamicImportNode, (node) => {
		const [source, options] = node.args.map(toEstree);
		return {
			type: "ImportExpression",
			source,
			options: options || null,
			phase: node.phase
		};
	});
	defineToEstree(ToplevelNode, (node) => scopeToEstree("Program", node));
	defineToEstree(ExpansionNode, (node) => ({
		type: inDestructuring() ? "RestElement" : "SpreadElement",
		argument: toEstree(node.argument)
	}));
	defineToEstree(PrefixedTemplateStringNode, (node) => ({
		type: "TaggedTemplateExpression",
		tag: toEstree(node.tag),
		quasi: toEstree(node.quasi)
	}));
	defineToEstree(TemplateStringNode, (node) => {
		/** @type {EXPECTED_ANY[]} */
		const quasis = [];
		/** @type {EXPECTED_ANY[]} */
		const expressions = [];
		for (let i = 0; i < node.segments.length; i++) {
			if (i % 2 !== 0) {
				expressions.push(toEstree(node.segments[i]));
			} else {
				quasis.push({
					type: "TemplateElement",
					value: {
						raw: node.segments[i].raw,
						cooked: node.segments[i].value
					},
					tail: i === node.segments.length - 1
				});
			}
		}
		return { type: "TemplateLiteral", quasis, expressions };
	});
	defineToEstree(DefunNode, (node) => ({
		type: "FunctionDeclaration",
		id: toEstree(node.id),
		params: node.params.map(patternToEstree),
		generator: node.generator,
		async: node.async,
		body: scopeToEstree("BlockStatement", node)
	}));
	defineToEstree(FunctionNode, (node) => ({
		type: "FunctionExpression",
		id: toEstree(node.id),
		params: node.params.map(patternToEstree),
		generator: node.generator || false,
		async: node.async || false,
		body: scopeToEstree("BlockStatement", node)
	}));
	defineToEstree(ArrowNode, (node) => {
		const body =
			node.body.body.length === 1 &&
			isReturnNode(node.body.body[0]) &&
			node.body.body[0].argument
				? toEstree(node.body.body[0].argument)
				: blockToEstree(node.body);
		return {
			type: "ArrowFunctionExpression",
			params: node.params.map(patternToEstree),
			async: node.async,
			body
		};
	});
	defineToEstree(DestructuringNode, (node) => {
		if (node.is_array) {
			return {
				type: "ArrayPattern",
				elements: node.elements.map((/** @type {EXPECTED_ANY} */ name) =>
					name === null ? null : patternToEstree(name)
				)
			};
		}
		return {
			type: "ObjectPattern",
			properties: node.properties.map((/** @type {EXPECTED_ANY} */ name) => {
				if (!isObjectKeyValNode(name)) return patternToEstree(name);
				const computed = name.computed;
				const [shorthand, key] = propertyKeyToEstree(
					name.key,
					computed,
					name.quote,
					name.value
				);
				return {
					type: "Property",
					computed,
					kind: "init",
					key,
					method: false,
					shorthand,
					value: patternToEstree(name.value)
				};
			})
		};
	});
	defineToEstree(DefaultAssignNode, (node) => ({
		type: "AssignmentPattern",
		left: patternToEstree(node.left),
		right: toEstree(node.right)
	}));
	defineToEstree(DirectiveNode, (node) => ({
		type: "ExpressionStatement",
		expression: {
			type: "Literal",
			value: node.directive,
			raw: modules.printToString(node)
		},
		directive: node.directive
	}));
	defineToEstree(SimpleStatementNode, (node) => ({
		type: "ExpressionStatement",
		expression: toEstree(node.expression)
	}));
	defineToEstree(SwitchBranchNode, (node) => ({
		type: "SwitchCase",
		test: toEstree(node.test),
		consequent: node.consequent.map(toEstree)
	}));
	defineToEstree(TryNode, (node) => ({
		type: "TryStatement",
		block: blockToEstree(node.block),
		handler: toEstree(node.handler),
		guardedHandlers: [],
		finalizer: toEstree(node.finalizer)
	}));
	defineToEstree(CatchNode, (node) => ({
		type: "CatchClause",
		param:
			node.param !== null && node.param !== undefined
				? patternToEstree(node.param)
				: null,
		body: blockToEstree(node.body)
	}));
	defineToEstree(DefinitionsLikeNode, (node) => ({
		type: "VariableDeclaration",
		kind: isConstNode(node)
			? "const"
			: isLetNode(node)
				? "let"
				: isUsingNode(node)
					? node.await
						? "await using"
						: "using"
					: "var",
		declarations: node.declarations.map(toEstree)
	}));
	defineToEstree(ExportNode, (node) => {
		if (node.exported_names) {
			const firstExported = node.exported_names[0];
			if (
				firstExported &&
				firstExported.local.name === "*" &&
				!firstExported.local.quote
			) {
				const foreignName = firstExported.exported;
				return {
					type: "ExportAllDeclaration",
					source: toEstree(node.source),
					exported:
						foreignName.name === "*" && !foreignName.quote
							? null
							: toEstree(foreignName),
					attributes: importAttributesToEstree(node.attributes)
				};
			}
			return {
				type: "ExportNamedDeclaration",
				specifiers: node.exported_names.map(
					(/** @type {EXPECTED_ANY} */ mapping) => ({
						type: "ExportSpecifier",
						exported: toEstree(mapping.exported),
						local: toEstree(mapping.local)
					})
				),
				declaration: toEstree(node.exported_definition),
				source: toEstree(node.source),
				attributes: importAttributesToEstree(node.attributes)
			};
		}
		if (node.is_default) {
			return {
				type: "ExportDefaultDeclaration",
				declaration: toEstree(node.exported_value || node.exported_definition)
			};
		}
		return {
			type: "ExportNamedDeclaration",
			declaration: toEstree(node.exported_value || node.exported_definition),
			specifiers: [],
			source: null
		};
	});
	defineToEstree(ImportNode, (node) => {
		/** @type {EXPECTED_ANY[]} */
		const specifiers = [];
		if (node.imported_name) {
			specifiers.push({
				type: "ImportDefaultSpecifier",
				local: toEstree(node.imported_name)
			});
		}
		if (node.imported_names) {
			const firstForeignName =
				node.imported_names[0] && node.imported_names[0].imported;
			if (
				firstForeignName &&
				firstForeignName.name === "*" &&
				!firstForeignName.quote
			) {
				specifiers.push({
					type: "ImportNamespaceSpecifier",
					local: toEstree(node.imported_names[0].local)
				});
			} else {
				for (const mapping of node.imported_names) {
					specifiers.push({
						type: "ImportSpecifier",
						local: toEstree(mapping.local),
						imported: toEstree(mapping.imported)
					});
				}
			}
		}
		/** @type {Record<string, EXPECTED_ANY>} */
		const estree = {
			type: "ImportDeclaration",
			specifiers,
			source: toEstree(node.source),
			attributes: importAttributesToEstree(node.attributes)
		};
		if (node.phase) estree.phase = node.phase;
		return estree;
	});
	defineToEstree(ImportMetaNode, () => ({
		type: "MetaProperty",
		meta: { type: "Identifier", name: "import" },
		property: { type: "Identifier", name: "meta" }
	}));
	defineToEstree(SequenceNode, (node) => ({
		type: "SequenceExpression",
		expressions: node.expressions.map(toEstree)
	}));
	defineToEstree(DotHashNode, (node) => ({
		type: "MemberExpression",
		object: toEstree(node.object),
		computed: false,
		property: { type: "PrivateIdentifier", name: node.property.name },
		optional: node.optional
	}));
	defineToEstree(PropAccessNode, (node) => {
		const computed = node.computed;
		return {
			type: "MemberExpression",
			object: toEstree(node.object),
			computed,
			property: computed
				? toEstree(node.property)
				: { type: "Identifier", name: node.property.name },
			optional: node.optional
		};
	});
	defineToEstree(ChainNode, (node) => ({
		type: "ChainExpression",
		expression: toEstree(node.expression)
	}));
	defineToEstree(UnaryNode, (node) => ({
		type:
			node.operator === "++" || node.operator === "--"
				? "UpdateExpression"
				: "UnaryExpression",
		operator: node.operator,
		prefix: isUnaryPrefixNode(node),
		argument: toEstree(node.argument)
	}));
	defineToEstree(BinaryNode, (node) => {
		if (node.operator === "=" && inDestructuring()) {
			return {
				type: "AssignmentPattern",
				left: toEstree(node.left),
				right: toEstree(node.right)
			};
		}
		return {
			type:
				node.operator === "&&" ||
				node.operator === "||" ||
				node.operator === "??"
					? "LogicalExpression"
					: "BinaryExpression",
			left: toEstree(node.left),
			operator: node.operator,
			right: toEstree(node.right)
		};
	});
	defineToEstree(AssignNode, (node) => ({
		type: "AssignmentExpression",
		operator: node.operator,
		left: toEstree(node.left),
		right: toEstree(node.right)
	}));
	defineToEstree(PrivateInNode, (node) => ({
		type: "BinaryExpression",
		left: { type: "PrivateIdentifier", name: node.left.name },
		operator: "in",
		right: toEstree(node.right)
	}));
	defineToEstree(ArrayNode, (node) => ({
		type: "ArrayExpression",
		elements: node.elements.map(toEstree)
	}));
	defineToEstree(ObjectNode, (node) => ({
		type: "ObjectExpression",
		properties: node.properties.map(toEstree)
	}));
	defineToEstree(ObjectPropertyNode, (node, parent) => {
		const computed = node.computed;
		const [shorthand, key] = propertyKeyToEstree(
			node.key,
			computed,
			node.quote,
			node.value
		);
		let kind;
		if (isObjectGetterNode(node)) {
			kind = "get";
		} else if (isObjectSetterNode(node)) {
			kind = "set";
		}
		if (isPrivateGetterNode(node) || isPrivateSetterNode(node)) {
			return {
				type: "MethodDefinition",
				computed: false,
				kind: isPrivateGetterNode(node) ? "get" : "set",
				static: node.static,
				key: { type: "PrivateIdentifier", name: node.key.name },
				value: toEstree(node.value)
			};
		}
		if (isClassPrivatePropertyNode(node)) {
			return {
				type: "PropertyDefinition",
				key: { type: "PrivateIdentifier", name: node.key.name },
				value: toEstree(node.value),
				computed: false,
				static: node.static
			};
		}
		if (isClassPropertyNode(node)) {
			return {
				type: "PropertyDefinition",
				key,
				value: toEstree(node.value),
				computed,
				static: node.static
			};
		}
		if (isClassNode(parent)) {
			return {
				type: "MethodDefinition",
				computed,
				kind,
				static: node.static,
				key: toEstree(node.key),
				value: toEstree(node.value)
			};
		}
		return {
			type: "Property",
			computed,
			method: false,
			shorthand,
			kind,
			key,
			value: toEstree(node.value)
		};
	});
	defineToEstree(ObjectKeyValNode, (node) => {
		const computed = node.computed;
		const [shorthand, key] = propertyKeyToEstree(
			node.key,
			computed,
			node.quote,
			node.value
		);
		return {
			type: "Property",
			computed,
			shorthand,
			method: false,
			kind: "init",
			key,
			value: toEstree(node.value)
		};
	});
	defineToEstree(ConciseMethodNode, (node, parent) => {
		const computed = node.computed;
		const [, key] = propertyKeyToEstree(
			node.key,
			computed,
			node.quote,
			node.value
		);
		if (isObjectNode(parent)) {
			return {
				type: "Property",
				kind: "init",
				computed,
				method: true,
				shorthand: false,
				key,
				value: toEstree(node.value)
			};
		}
		return {
			type: "MethodDefinition",
			kind:
				!computed && node.key.name === "constructor" ? "constructor" : "method",
			computed,
			key,
			value: toEstree(node.value),
			static: node.static
		};
	});
	defineToEstree(PrivateMethodNode, (node) => ({
		type: "MethodDefinition",
		kind: "method",
		key: { type: "PrivateIdentifier", name: node.key.name },
		value: toEstree(node.value),
		computed: false,
		static: node.static
	}));
	defineToEstree(ClassNode, (node) => ({
		type: isClassExpressionNode(node) ? "ClassExpression" : "ClassDeclaration",
		superClass: toEstree(node.superClass),
		id: node.id ? toEstree(node.id) : null,
		body: { type: "ClassBody", body: node.body.body.map(toEstree) }
	}));
	defineToEstree(ClassStaticBlockNode, (node) => ({
		type: "StaticBlock",
		body: node.body.map(toEstree)
	}));
	defineToEstree(NewTargetNode, () => ({
		type: "MetaProperty",
		meta: { type: "Identifier", name: "new" },
		property: { type: "Identifier", name: "target" }
	}));
	defineToEstree(SymbolNode, (node, parent) => {
		if (
			(isSymbolMethodNode(node) && parent.quote) ||
			((isSymbolImportForeignNode(node) ||
				isSymbolExportForeignNode(node) ||
				isSymbolExportNode(node)) &&
				node.quote)
		) {
			return { type: "Literal", value: node.name };
		}
		const definition = node.definition();
		return {
			type: "Identifier",
			name: definition ? definition.mangled_name || definition.name : node.name
		};
	});
	defineToEstree(RegExpNode, (node) => ({
		type: "Literal",
		value: null,
		raw: modules.printToString(node),
		regex: { pattern: node.value.source, flags: node.value.flags }
	}));
	defineToEstree(ConstantNode, (node) => ({
		type: "Literal",
		value: node.value,
		raw: node.raw || modules.printToString(node)
	}));
	defineToEstree(AtomNode, (node) => ({
		type: "Identifier",
		name: String(node.value)
	}));
	// ESTree holds a bigint's decimal digits; terser may hold hexadecimal ones.
	defineToEstree(BigIntNode, (node) => ({
		type: "Literal",
		value: null,
		bigint:
			typeof BigInt === "function" ? BigInt(node.value).toString() : node.value,
		raw: node.raw
	}));
	BooleanNode.prototype.to_mozilla_ast = ConstantNode.prototype.to_mozilla_ast;
	NullNode.prototype.to_mozilla_ast = ConstantNode.prototype.to_mozilla_ast;
	HoleNode.prototype.to_mozilla_ast = () => null;
	BlockNode.prototype.to_mozilla_ast =
		BlockStatementNode.prototype.to_mozilla_ast;
	LambdaNode.prototype.to_mozilla_ast = FunctionNode.prototype.to_mozilla_ast;
};

/**
 * What every ESTree node the printer reads holds: the tokens it was read
 * between, null on a node terser holds no node for.
 * @typedef {object} PrintBase
 * @property {Token | null | undefined} startToken the token it starts at
 * @property {Token | null | undefined} endToken the token it ends at
 */

/** @typedef {PrintBase & { type: "Program", body: PrintNode[] }} PrintProgram the program */
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
/** @typedef {PrintBase & { type: "VariableDeclaration", declarations: PrintNode[], kind: string }} PrintVariableDeclaration a `var`, `let`, `const` or `using` declaration */
/** @typedef {PrintBase & { type: "VariableDeclarator", id: PrintNode, init: PrintNode | null }} PrintVariableDeclarator one name a declaration declares */
/** @typedef {PrintBase & { type: "FunctionDeclaration" | "FunctionExpression" | "ArrowFunctionExpression", id: PrintIdentifier | null, idDeclares: number | undefined, params: PrintNode[], body: PrintBlockStatement, generator: boolean, async: boolean, expression: boolean }} PrintFunction a function, its body always a block, `idDeclares` the `DECLARES_*` code of how its name is declared */
/** @typedef {PrintBase & { type: "ClassDeclaration" | "ClassExpression", id: PrintIdentifier | null, idDeclares: number | undefined, superClass: PrintNode | null, body: PrintClassBody }} PrintClass a class, `idDeclares` as a function's */
/** @typedef {PrintBase & { type: "ClassBody" | "StaticBlock", body: PrintNode[] }} PrintClassBody a class's body, or a static block */
/** @typedef {string | null | false | undefined} PrintMapName the name a member's source mapping carries, false for a method's, whose key maps it */
/** @typedef {PrintBase & { type: "PropertyDefinition", key: PrintNode, value: PrintNode | null, computed: boolean, static: boolean, quote: string | undefined, mapName: PrintMapName }} PrintPropertyDefinition a class field */
/** @typedef {PrintBase & { type: "Property", key: PrintNode, value: PrintNode, kind: string, method: boolean, shorthand: boolean, computed: boolean, quote: string | undefined, mapName: PrintMapName }} PrintProperty an object literal's or pattern's property */
/** @typedef {PrintBase & { type: "MethodDefinition", key: PrintNode, value: PrintNode, kind: string, computed: boolean, static: boolean, quote: string | undefined, mapName: PrintMapName }} PrintMethodDefinition a class's method, getter or setter */
/** @typedef {PrintBase & { type: "ImportAttribute", key: PrintNode, value: PrintNode }} PrintImportAttribute one of an import's or export's attributes */
/** @typedef {PrintBase & { type: "ObjectExpression" | "ObjectPattern", properties: PrintNode[] }} PrintObject an object literal or pattern */
/** @typedef {PrintBase & { type: "ArrayExpression" | "ArrayPattern", elements: (PrintNode | null)[] }} PrintArray an array literal or pattern, null for a hole */
/** @typedef {PrintBase & { type: "SpreadElement" | "RestElement", argument: PrintNode }} PrintSpread a spread or rest element */
/** @typedef {PrintBase & { type: "AssignmentPattern", left: PrintNode, right: PrintNode }} PrintAssignmentPattern a default value */
/** @typedef {PrintBase & { type: "TemplateLiteral", quasis: PrintTemplateElement[], expressions: PrintNode[] }} PrintTemplateLiteral a template literal */
/** @typedef {PrintBase & { type: "TemplateElement", value: { raw: string, cooked: string }, tail: boolean }} PrintTemplateElement a template literal's text between its expressions */
/** @typedef {PrintBase & { type: "TaggedTemplateExpression", tag: PrintNode, quasi: PrintNode }} PrintTaggedTemplateExpression a tagged template */
/** @typedef {PrintBase & { type: "AwaitExpression", argument: PrintNode }} PrintAwaitExpression an `await` */
/** @typedef {PrintBase & { type: "YieldExpression", argument: PrintNode | null, delegate: boolean }} PrintYieldExpression a `yield` */
/** @typedef {PrintBase & { type: "CallExpression", callee: PrintNode, arguments: PrintNode[], optional: boolean }} PrintCallExpression a call */
/** @typedef {PrintBase & { type: "NewExpression", callee: PrintNode, arguments: PrintNode[] }} PrintNewExpression a `new` */
/** @typedef {PrintBase & { type: "ImportExpression", source: PrintNode, options: PrintNode | null, phase: string | undefined }} PrintImportExpression a dynamic `import()` */
/** @typedef {PrintBase & { type: "MetaProperty", meta: PrintIdentifier, property: PrintIdentifier }} PrintMetaProperty `import.meta` or `new.target` */
/** @typedef {PrintBase & { type: "SequenceExpression", expressions: PrintNode[] }} PrintSequenceExpression a comma sequence */
/** @typedef {PrintBase & { type: "MemberExpression", object: PrintNode, property: PrintNode, computed: boolean, optional: boolean, quote: string | undefined }} PrintMemberExpression a property access, `quote` the quote a name read as `.name` had when written as a string */
/** @typedef {PrintBase & { type: "ChainExpression", expression: PrintNode }} PrintChainExpression an optional chain */
/** @typedef {PrintBase & { type: "UnaryExpression" | "UpdateExpression", operator: string, prefix: boolean, argument: PrintNode }} PrintUnary a unary operator or an increment or decrement */
/** @typedef {PrintBase & { type: "BinaryExpression" | "LogicalExpression" | "AssignmentExpression", operator: string, left: PrintNode, right: PrintNode }} PrintBinary a binary operator or an assignment */
/** @typedef {PrintBase & { type: "ConditionalExpression", test: PrintNode, consequent: PrintNode, alternate: PrintNode }} PrintConditionalExpression a conditional */
/** @typedef {PrintBase & { type: "ImportDeclaration", specifiers: PrintNode[], source: PrintNode, attributes: PrintImportAttribute[], attributesStartToken: Token | null | undefined, attributesEndToken: Token | null | undefined, phase: string | undefined }} PrintImportDeclaration an `import` */
/** @typedef {PrintBase & { type: "ImportDefaultSpecifier" | "ImportNamespaceSpecifier", local: PrintNode }} PrintImportLocalSpecifier an import's default or namespace name */
/** @typedef {PrintBase & { type: "ImportSpecifier", local: PrintNode, imported: PrintNode }} PrintImportSpecifier a name an import takes */
/** @typedef {PrintBase & { type: "ExportSpecifier", local: PrintNode, exported: PrintNode }} PrintExportSpecifier a name an export gives */
/** @typedef {PrintBase & { type: "ExportAllDeclaration", exported: PrintNode | null, source: PrintNode, attributes: PrintImportAttribute[], attributesStartToken: Token | null | undefined, attributesEndToken: Token | null | undefined }} PrintExportAllDeclaration an `export *` */
/** @typedef {PrintBase & { type: "ExportDefaultDeclaration", declaration: PrintNode, heldAsDefinition: boolean }} PrintExportDefaultDeclaration an `export default`, its declaration held by terser as a definition or as a value */
/** @typedef {PrintBase & { type: "ExportNamedDeclaration", declaration: PrintNode | null, specifiers: PrintNode[], source: PrintNode | null, attributes: PrintImportAttribute[], attributesStartToken: Token | null | undefined, attributesEndToken: Token | null | undefined }} PrintExportNamedDeclaration an export of a declaration or of names */
/** @typedef {PrintBase & { type: "PrivateIdentifier", name: string }} PrintPrivateIdentifier a private name */
/** @typedef {PrintBase & { type: "Identifier", name: string, definition: ManglingDefinition | ManglingLabel | null, atom?: boolean }} PrintIdentifier a name, `atom` where terser prints it as a constant, `definition` what the ESTree scope analysis found it names */
/** @typedef {PrintBase & { type: "Literal", value: string | number | boolean | RegExp | null, raw: string | undefined, regex: { pattern: string, flags: string } | undefined, bigint: string | undefined, quote: string | undefined, annotatedKey: boolean }} PrintLiteral a literal, `quote` the quote a string had, `annotatedKey` whether a `@__KEY__` annotation marks the string a property name */

/**
 * An ESTree node as the printer reads it; per type `quote`, `raw`,
 * `definition` and `mapName`, which ESTree leaves out.
 * @typedef {PrintProgram | PrintExpressionStatement | PrintBlockStatement | PrintLeaf | PrintLabeledStatement | PrintWhileStatement | PrintForStatement | PrintForInStatement | PrintForOfStatement | PrintWithStatement | PrintExitStatement | PrintLoopControl | PrintIfStatement | PrintSwitchStatement | PrintSwitchCase | PrintTryStatement | PrintCatchClause | PrintVariableDeclaration | PrintVariableDeclarator | PrintFunction | PrintClass | PrintClassBody | PrintPropertyDefinition | PrintProperty | PrintMethodDefinition | PrintImportAttribute | PrintObject | PrintArray | PrintSpread | PrintAssignmentPattern | PrintTemplateLiteral | PrintTemplateElement | PrintTaggedTemplateExpression | PrintAwaitExpression | PrintYieldExpression | PrintCallExpression | PrintNewExpression | PrintImportExpression | PrintMetaProperty | PrintSequenceExpression | PrintMemberExpression | PrintChainExpression | PrintUnary | PrintBinary | PrintConditionalExpression | PrintImportDeclaration | PrintImportLocalSpecifier | PrintImportSpecifier | PrintExportSpecifier | PrintExportAllDeclaration | PrintExportDefaultDeclaration | PrintExportNamedDeclaration | PrintPrivateIdentifier | PrintIdentifier | PrintLiteral} PrintNode
 */

/**
 * @template {PrintNode["type"]} T
 * @typedef {PrintNode extends infer N ? N extends PrintNode ? T extends N["type"] ? N & { type: T } : never : never : never} PrintNodeOf the ESTree node of a type
 */

/** @typedef {PrintLabeledStatement | PrintIfStatement | PrintWithStatement | PrintForStatement | PrintForInStatement | PrintForOfStatement | PrintWhileStatement} PrintStatementWithBody a statement holding another, terser's `StatementWithBody` */
/** @typedef {PrintImportDeclaration | PrintExportAllDeclaration | PrintExportNamedDeclaration} PrintModuleDeclaration an import or an export that may name a source and attributes */
/** @typedef {PrintBinary | PrintAssignmentPattern} PrintBinaryLike what `kindOf.Binary` finds: a binary, logical or assignment expression, or an assignment pattern */
/** @typedef {PrintNode | (PrintBase & { type: "" })} PrintParent a node holding the one printed, or past the root one of no type */
/** @typedef {Record<string, PrintNode | (PrintNode | null)[] | null>} PrintFields a node's fields as a walk reads them, its children and lists of them beside scalars no type test matches */

/**
 * terser's node classes the printer asks of an ESTree node, by name without
 * `Node`; a class matching only some nodes of a type answers a bare boolean.
 * @typedef {object} PrintKinds
 * @property {(node: PrintParent) => node is PrintNodeOf<"ArrayExpression">} Array terser's `Array`
 * @property {(node: PrintParent) => node is PrintNodeOf<"ArrowFunctionExpression">} Arrow terser's `Arrow`
 * @property {(node: PrintParent) => node is PrintNodeOf<"AssignmentExpression">} Assign terser's `Assign`
 * @property {(node: PrintParent) => node is PrintAwaitExpression} Await terser's `Await`
 * @property {(node: PrintParent) => boolean} Binary terser's `Binary`, which `#x in y` is not
 * @property {(node: PrintParent) => node is PrintBlockStatement} BlockStatement terser's `BlockStatement`
 * @property {(node: PrintParent) => node is PrintCallExpression | PrintNewExpression} Call terser's `Call`
 * @property {(node: PrintParent) => node is PrintChainExpression} Chain terser's `Chain`
 * @property {(node: PrintParent) => node is PrintClass} Class terser's `Class`
 * @property {(node: PrintParent) => node is PrintNodeOf<"ClassExpression">} ClassExpression terser's `ClassExpression`
 * @property {(node: PrintParent) => node is PrintConditionalExpression} Conditional terser's `Conditional`
 * @property {(node: PrintParent) => node is PrintAssignmentPattern} DefaultAssign terser's `DefaultAssign`
 * @property {(node: PrintParent) => boolean} Definitions terser's `Definitions`, which `using` is not
 * @property {(node: PrintParent) => node is PrintVariableDeclaration} DefinitionsLike terser's `DefinitionsLike`
 * @property {(node: PrintParent) => node is PrintNodeOf<"FunctionDeclaration">} Defun terser's `Defun`
 * @property {(node: PrintParent) => node is PrintNodeOf<"ArrayPattern" | "ObjectPattern">} Destructuring terser's `Destructuring`
 * @property {(node: PrintParent) => boolean} Directive terser's `Directive`
 * @property {(node: PrintParent) => node is PrintNodeOf<"DoWhileStatement">} Do terser's `Do`
 * @property {(node: PrintParent) => boolean} Dot terser's `Dot`
 * @property {(node: PrintParent) => boolean} DotHash terser's `DotHash`
 * @property {(node: PrintParent) => node is PrintNodeOf<"EmptyStatement">} EmptyStatement terser's `EmptyStatement`
 * @property {(node: PrintParent) => node is PrintSpread} Expansion terser's `Expansion`
 * @property {(node: PrintParent) => node is PrintExportNamedDeclaration | PrintExportDefaultDeclaration | PrintExportAllDeclaration} Export terser's `Export`
 * @property {(node: PrintParent) => node is PrintForStatement} For terser's `For`
 * @property {(node: PrintParent) => node is PrintForInStatement | PrintForOfStatement} ForIn terser's `ForIn`
 * @property {(node: PrintParent) => node is PrintForOfStatement} ForOf terser's `ForOf`
 * @property {(node: PrintParent) => node is PrintNodeOf<"FunctionExpression">} Function terser's `Function`
 * @property {(node: PrintParent) => node is PrintIfStatement} If terser's `If`
 * @property {(node: PrintParent) => node is PrintImportDeclaration} Import terser's `Import`
 * @property {(node: PrintParent) => node is PrintFunction} Lambda terser's `Lambda`
 * @property {(node: PrintParent) => node is PrintNewExpression} New terser's `New`
 * @property {(node: PrintParent) => node is PrintNodeOf<"ObjectExpression">} Object terser's `Object`
 * @property {(node: PrintParent) => node is PrintProperty | PrintMethodDefinition | PrintPropertyDefinition} ObjectProperty terser's `ObjectProperty`
 * @property {(node: PrintParent) => node is PrintTaggedTemplateExpression} PrefixedTemplateString terser's `PrefixedTemplateString`
 * @property {(node: PrintParent) => boolean} PrivateIn terser's `PrivateIn`, a `#x in y`
 * @property {(node: PrintParent) => node is PrintMemberExpression} PropAccess terser's `PropAccess`
 * @property {(node: PrintParent) => node is PrintNodeOf<"ReturnStatement">} Return terser's `Return`
 * @property {(node: PrintParent) => node is PrintProgram | PrintFunction | PrintClass | PrintNodeOf<"StaticBlock">} Scope terser's `Scope`
 * @property {(node: PrintParent) => node is PrintSequenceExpression} Sequence terser's `Sequence`
 * @property {(node: PrintParent) => boolean} SimpleStatement terser's `SimpleStatement`
 * @property {(node: PrintParent) => node is PrintStatementWithBody} StatementWithBody terser's `StatementWithBody`
 * @property {(node: PrintParent) => boolean} Sub terser's `Sub`
 * @property {(node: PrintParent) => node is PrintTemplateElement} TemplateSegment terser's `TemplateSegment`
 * @property {(node: PrintParent) => node is PrintUnary} Unary terser's `Unary`
 * @property {(node: PrintParent) => boolean} UnaryPostfix terser's `UnaryPostfix`
 * @property {(node: PrintParent) => boolean} UnaryPrefix terser's `UnaryPrefix`
 * @property {(node: PrintParent) => boolean} Var terser's `Var`
 * @property {(node: PrintParent) => node is PrintVariableDeclarator} VarDefLike terser's `VarDefLike`
 * @property {(node: PrintParent) => node is PrintYieldExpression} Yield terser's `Yield`
 */

/** @typedef {(node: Node, printNode: PrintNode | null) => void} PrintTreeObserver called with each terser node converted and what it became */
/** @typedef {(node: Node, observe?: PrintTreeObserver, context?: number, releasing?: boolean) => PrintNode} PrintTreeReader reads terser's tree as an ESTree tree, null for none */
/** @typedef {{ reset: () => void, consider: (chars: string, delta: number) => void, sort: () => void }} CharacterCounter an identifier source that counts the characters printed, as terser's `base54` does */

// An absent child or a hole reads `null`, which the print tree's types leave
// out of a child's type, as `NO_NODE` does terser's.
const NO_PRINT_NODE = /** @type {PrintNode} */ (/** @type {unknown} */ (null));

// Where a terser node sits, which decides the ESTree node it becomes.
const IN_EXPRESSION = 0;
const IN_PATTERN = 1;
const IN_CLASS = 2;

/**
 * Installs `toPrintTree`, which reads terser's tree into the ESTree tree the
 * printer is moving to, and `kindOf`, terser's node classes asked of it.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installPrintTree = (modules) => {
	/** @type {PrintTreeObserver | undefined} */
	let observer;
	// Under `_destroy_ast`, what terser's `gc_scope` dropped once printed.
	let release = false;
	// Names as the source wrote them, for the ESTree scope analysis to resolve.
	let namesAsWritten = false;

	/**
	 * @param {string} name the name
	 * @param {Token | null | undefined} startToken the token it starts at
	 * @param {Token | null | undefined} endToken the token it ends at
	 * @returns {PrintIdentifier} the identifier
	 */
	const identifier = (name, startToken, endToken) => ({
		type: "Identifier",
		name,
		definition: null,
		startToken,
		endToken
	});

	/**
	 * @param {PrintLiteral["value"]} value its value
	 * @param {string | undefined} raw a number's or bigint's source
	 * @param {{ pattern: string, flags: string } | undefined} regex a regular expression's parts
	 * @param {string | undefined} bigint a bigint's digits, as terser holds them
	 * @param {string | undefined} quote the quote a string had
	 * @param {Token | null | undefined} startToken the token it starts at
	 * @param {Token | null | undefined} endToken the token it ends at
	 * @returns {PrintLiteral} the literal
	 */
	const literal = (value, raw, regex, bigint, quote, startToken, endToken) => ({
		type: "Literal",
		value,
		raw,
		regex,
		bigint,
		quote,
		annotatedKey: false,
		startToken,
		endToken
	});

	/**
	 * A key not computed, as the string terser prints: a number literal where
	 * `String(value)` gives that string back, else a name.
	 * @param {string} name the key
	 * @param {string | undefined} quote the quote it had
	 * @param {Token | null | undefined} startToken the token it starts at
	 * @param {Token | null | undefined} endToken the token it ends at
	 * @returns {PrintLiteral | PrintIdentifier} the key
	 */
	const propertyKey = (name, quote, startToken, endToken) => {
		if (quote) {
			return literal(
				name,
				undefined,
				undefined,
				undefined,
				quote,
				startToken,
				endToken
			);
		}
		const number = Number(name);
		if (`${number}` === name && number >= 0) {
			return literal(
				number,
				undefined,
				undefined,
				undefined,
				undefined,
				startToken,
				endToken
			);
		}
		return identifier(name, startToken, endToken);
	};

	/**
	 * @param {Node | null} node a terser node, or null
	 * @param {number=} context where it sits
	 * @returns {PrintNode} its ESTree node, or null
	 */
	const convert = (node, context = IN_EXPRESSION) => {
		if (node === null || node === undefined) return NO_PRINT_NODE;
		const printNode = convertNode(node, context);
		if (observer !== undefined) observer(node, printNode);
		return printNode;
	};

	/**
	 * @param {(Node | null)[]} nodes terser nodes, null for a hole
	 * @param {number=} context where they sit
	 * @returns {PrintNode[]} their ESTree nodes, null for a hole
	 */
	const convertList = (nodes, context = IN_EXPRESSION) => {
		const result = [];
		for (let i = 0; i < nodes.length; i++) {
			result.push(convert(nodes[i], context));
		}
		return result;
	};

	/**
	 * How a function's or class's name declares: the compressor may leave a
	 * declaration's name on an expression, or the reverse.
	 * @param {Node | null} name the name, if any
	 * @returns {number | undefined} its `DECLARES_*` code
	 */
	const declaresOf = (name) =>
		name ? DECLARING_NAME_KINDS[/** @type {string} */ (name.TYPE)] : undefined;

	/**
	 * A block terser holds no node for: a function's, a catch's.
	 * @param {Node} node the node holding its statements
	 * @returns {PrintBlockStatement} the block, ending where its holder ends
	 */
	const bodyBlock = (node) => ({
		type: "BlockStatement",
		body: convertList(node.body.body),
		startToken: null,
		endToken: node.endToken
	});

	/**
	 * @param {Node} node a function terser holds
	 * @param {PrintFunction["type"]} type its ESTree type
	 * @returns {PrintFunction} the ESTree function, its body always a block
	 */
	const lambda = (node, type) => ({
		type,
		id: /** @type {PrintIdentifier | null} */ (convert(node.id)),
		idDeclares: declaresOf(node.id),
		params: convertList(node.params, IN_PATTERN),
		body: bodyBlock(node),
		generator: node.generator === true,
		async: node.async === true,
		expression: false,
		startToken: node.startToken,
		endToken: node.endToken
	});

	/**
	 * A function not a method, its terser body dropped once read where
	 * terser's `gc_scope` dropped it once printed.
	 * @param {Node} node a function terser holds
	 * @param {PrintFunction["type"]} type its ESTree type
	 * @returns {PrintFunction} the ESTree function
	 */
	const releasedLambda = (node, type) => {
		const printNode = lambda(node, type);
		if (release) {
			node.body.body.length = 0;
			node.params.length = 0;
		}
		return printNode;
	};

	/**
	 * The name a property's source mapping carries, as `addMapping` reads it
	 * off the key; a method's carries none, its key mapping the name.
	 * @param {Node} member a property not a method
	 * @returns {string | null | undefined} the name
	 */
	const mapNameOf = (member) => {
		const key = member.key;
		if (modules.ast.isSymbolPropertyNode(key)) return key.name;
		if (!modules.ast.isSymbolNode(key)) return null;
		const start = member.startToken;
		return start && start.type === "string" ? start.value : key.name;
	};

	/**
	 * @param {Node} member a property or method
	 * @returns {PrintNode} its key
	 */
	const memberKey = (member) => {
		const key = member.key;
		if (member.computed) return convert(key);
		// terser held this name as a string: no node, so no tokens.
		if (modules.ast.isSymbolPropertyNode(key)) {
			return propertyKey(key.name, member.quote, null, null);
		}
		const printKey = propertyKey(
			key.name,
			member.quote,
			key.startToken,
			key.endToken
		);
		if (observer !== undefined) observer(key, printKey);
		return printKey;
	};

	/**
	 * @param {Node} member a getter, setter or method
	 * @param {boolean} inClass whether a class holds it
	 * @returns {PrintProperty | PrintMethodDefinition} the ESTree property or method definition
	 */
	const method = (member, inClass) => {
		const isPrivate = member.TYPE.startsWith("Private");
		const key = isPrivate ? convert(member.key) : memberKey(member);
		const computed = !isPrivate && member.computed;
		if (!inClass) {
			return {
				type: "Property",
				key,
				value: convert(member.value),
				kind: member.kind,
				method: member.method,
				shorthand: false,
				computed,
				quote: member.quote,
				mapName: false,
				startToken: member.startToken,
				endToken: member.endToken
			};
		}
		return {
			type: "MethodDefinition",
			key,
			value: convert(member.value),
			kind: member.kind,
			computed,
			static: member.static === true,
			quote: member.quote,
			mapName: false,
			startToken: member.startToken,
			endToken: member.endToken
		};
	};

	/**
	 * @param {Node} node an import's or export's attributes, or null
	 * @returns {PrintImportAttribute[]} them as ESTree import attributes
	 */
	const attributesOf = (node) => {
		/** @type {PrintImportAttribute[]} */
		const result = [];
		if (node) {
			for (const property of node.properties) {
				result.push({
					type: "ImportAttribute",
					key: propertyKey(property.key.name, property.quote, null, null),
					value: convert(property.value),
					startToken: property.startToken,
					endToken: property.endToken
				});
			}
		}
		return result;
	};

	/**
	 * @param {Node} name a name of an import or export
	 * @returns {boolean} whether it is the bare `*`
	 */
	const isStar = (name) => name.name === "*" && !name.quote;

	/**
	 * @param {Node} node a terser node
	 * @param {number} context where it sits
	 * @returns {PrintNode} its ESTree node, null for a hole
	 */
	const convertNode = (node, context) => {
		const startToken = node.startToken;
		const endToken = node.endToken;
		switch (node.TYPE) {
			case "Toplevel":
				return {
					type: "Program",
					body: convertList(node.body),
					startToken,
					endToken
				};
			case "Directive":
				return {
					type: "ExpressionStatement",
					expression: literal(
						node.expression.value,
						undefined,
						undefined,
						undefined,
						node.expression.quote,
						startToken,
						endToken
					),
					directive: node.directive,
					startToken,
					endToken
				};
			case "SimpleStatement":
				return {
					type: "ExpressionStatement",
					expression: convert(node.expression),
					directive: undefined,
					startToken,
					endToken
				};
			case "BlockStatement":
			case "TryBlock":
			case "Finally":
				return {
					type: "BlockStatement",
					body: convertList(node.body),
					startToken,
					endToken
				};
			case "EmptyStatement":
				return { type: "EmptyStatement", startToken, endToken };
			case "Debugger":
				return { type: "DebuggerStatement", startToken, endToken };
			case "LabeledStatement":
				return {
					type: "LabeledStatement",
					label: convert(node.label),
					body: convert(node.body),
					startToken,
					endToken
				};
			case "Do":
				return {
					type: "DoWhileStatement",
					body: convert(node.body),
					test: convert(node.test),
					startToken,
					endToken
				};
			case "While":
				return {
					type: "WhileStatement",
					test: convert(node.test),
					body: convert(node.body),
					startToken,
					endToken
				};
			case "For":
				return {
					type: "ForStatement",
					init: convert(node.init),
					test: convert(node.test),
					update: convert(node.update),
					body: convert(node.body),
					startToken,
					endToken
				};
			case "ForIn":
				return {
					type: "ForInStatement",
					left: convert(node.left),
					right: convert(node.right),
					body: convert(node.body),
					startToken,
					endToken
				};
			case "ForOf":
				return {
					type: "ForOfStatement",
					left: convert(node.left),
					right: convert(node.right),
					body: convert(node.body),
					await: node.await === true,
					startToken,
					endToken
				};
			case "With":
				return {
					type: "WithStatement",
					object: convert(node.object),
					body: convert(node.body),
					startToken,
					endToken
				};
			case "Return":
			case "Throw":
				return {
					type: node.TYPE === "Return" ? "ReturnStatement" : "ThrowStatement",
					argument: convert(node.argument),
					startToken,
					endToken
				};
			case "Break":
			case "Continue":
				return {
					type: node.TYPE === "Break" ? "BreakStatement" : "ContinueStatement",
					label: convert(node.label),
					startToken,
					endToken
				};
			case "If":
				return {
					type: "IfStatement",
					test: convert(node.test),
					consequent: convert(node.consequent),
					alternate: convert(node.alternate),
					startToken,
					endToken
				};
			case "Switch":
				return {
					type: "SwitchStatement",
					discriminant: convert(node.discriminant),
					cases: /** @type {PrintSwitchCase[]} */ (convertList(node.cases)),
					startToken,
					endToken
				};
			case "Case":
			case "Default":
				return {
					type: "SwitchCase",
					test: node.TYPE === "Case" ? convert(node.test) : null,
					consequent: convertList(node.consequent),
					startToken,
					endToken
				};
			case "Try":
				return {
					type: "TryStatement",
					block: convert(node.block),
					handler: convert(node.handler),
					finalizer: convert(node.finalizer),
					startToken,
					endToken
				};
			case "Catch":
				return {
					type: "CatchClause",
					param: convert(node.param, IN_PATTERN),
					body: bodyBlock(node),
					startToken,
					endToken
				};
			case "Var":
			case "Let":
			case "Const":
			case "Using":
				return {
					type: "VariableDeclaration",
					declarations: convertList(node.declarations),
					kind:
						node.TYPE === "Using"
							? node.await
								? "await using"
								: "using"
							: node.TYPE.toLowerCase(),
					startToken,
					endToken
				};
			case "VarDef":
			case "UsingDef":
				return {
					type: "VariableDeclarator",
					id: convert(node.id, IN_PATTERN),
					init: convert(node.init),
					startToken,
					endToken
				};
			case "Defun":
				return releasedLambda(node, "FunctionDeclaration");
			case "Function":
				return releasedLambda(node, "FunctionExpression");
			case "Accessor":
				return lambda(node, "FunctionExpression");
			case "Arrow":
				return releasedLambda(node, "ArrowFunctionExpression");
			case "DefClass":
			case "ClassExpression":
				return {
					type:
						node.TYPE === "DefClass" ? "ClassDeclaration" : "ClassExpression",
					id: /** @type {PrintIdentifier | null} */ (convert(node.id)),
					idDeclares: declaresOf(node.id),
					superClass: convert(node.superClass),
					body: {
						type: "ClassBody",
						body: convertList(node.body.body, IN_CLASS),
						startToken: null,
						endToken
					},
					startToken,
					endToken
				};
			case "ClassStaticBlock":
				return {
					type: "StaticBlock",
					body: convertList(node.body),
					startToken,
					endToken
				};
			case "ClassProperty":
			case "ClassPrivateProperty": {
				const isPrivate = node.TYPE === "ClassPrivateProperty";
				return {
					type: "PropertyDefinition",
					key: isPrivate ? convert(node.key) : memberKey(node),
					value: convert(node.value),
					computed: !isPrivate && node.computed,
					static: node.static === true,
					quote: node.quote,
					mapName: mapNameOf(node),
					startToken,
					endToken
				};
			}
			case "ObjectKeyVal": {
				const computed = node.computed;
				const key = memberKey(node);
				const value = convert(
					node.value,
					context === IN_PATTERN ? IN_PATTERN : IN_EXPRESSION
				);
				const target =
					value !== null && value.type === "AssignmentPattern"
						? value.left
						: value;
				return {
					type: "Property",
					key,
					value,
					kind: node.kind,
					method: node.method,
					shorthand:
						!computed &&
						!node.quote &&
						target !== null &&
						target.type === "Identifier" &&
						target.name === node.key.name,
					computed,
					quote: node.quote,
					mapName: mapNameOf(node),
					startToken,
					endToken
				};
			}
			case "ObjectGetter":
			case "PrivateGetter":
			case "ObjectSetter":
			case "PrivateSetter":
			case "ConciseMethod":
			case "PrivateMethod":
				return method(node, context === IN_CLASS);
			case "Object":
				return {
					type: "ObjectExpression",
					properties: convertList(node.properties),
					startToken,
					endToken
				};
			case "Array":
				return {
					type: "ArrayExpression",
					elements: convertList(node.elements),
					startToken,
					endToken
				};
			case "Expansion":
				return {
					type: context === IN_PATTERN ? "RestElement" : "SpreadElement",
					argument: convert(node.argument, context),
					startToken,
					endToken
				};
			case "Destructuring":
				return node.is_array
					? {
							type: "ArrayPattern",
							elements: convertList(node.elements, IN_PATTERN),
							startToken,
							endToken
						}
					: {
							type: "ObjectPattern",
							properties: convertList(node.properties, IN_PATTERN),
							startToken,
							endToken
						};
			case "DefaultAssign":
				return {
					type: "AssignmentPattern",
					left: convert(node.left, IN_PATTERN),
					right: convert(node.right),
					startToken,
					endToken
				};
			case "TemplateString": {
				/** @type {PrintTemplateElement[]} */
				const quasis = [];
				/** @type {PrintNode[]} */
				const expressions = [];
				const segments = node.segments;
				for (let i = 0; i < segments.length; i++) {
					const segment = segments[i];
					const converted = convert(segment);
					if (segment.TYPE !== "TemplateSegment") {
						expressions.push(converted);
						continue;
					}
					const element = /** @type {PrintTemplateElement} */ (converted);
					if (quasis.length > expressions.length) {
						// The compressor may leave two segments side by side: one quasi.
						const { value } = quasis[quasis.length - 1];
						value.raw += element.value.raw;
						value.cooked += element.value.cooked;
					} else {
						quasis.push(element);
					}
				}
				quasis[quasis.length - 1].tail = true;
				return {
					type: "TemplateLiteral",
					quasis,
					expressions,
					startToken,
					endToken
				};
			}
			case "TemplateSegment":
				return {
					type: "TemplateElement",
					value: { raw: /** @type {string} */ (node.raw), cooked: node.value },
					tail: false,
					startToken,
					endToken
				};
			case "PrefixedTemplateString":
				return {
					type: "TaggedTemplateExpression",
					tag: convert(node.tag),
					quasi: convert(node.quasi),
					startToken,
					endToken
				};
			case "Await":
				return {
					type: "AwaitExpression",
					argument: convert(node.argument),
					startToken,
					endToken
				};
			case "Yield":
				return {
					type: "YieldExpression",
					argument: convert(node.argument),
					delegate: node.delegate === true,
					startToken,
					endToken
				};
			case "Call":
				return {
					type: "CallExpression",
					callee: convert(node.callee),
					arguments: convertList(node.arguments),
					optional: node.optional === true,
					startToken,
					endToken
				};
			case "New":
				return {
					type: "NewExpression",
					callee: convert(node.callee),
					arguments: convertList(node.arguments),
					startToken,
					endToken
				};
			case "DynamicImport":
				return {
					type: "ImportExpression",
					source: convert(node.args[0]),
					options: convert(node.args[1]),
					phase: node.phase || undefined,
					startToken,
					endToken
				};
			case "ImportMeta":
			case "NewTarget": {
				const isImport = node.TYPE === "ImportMeta";
				return {
					type: "MetaProperty",
					meta: identifier(isImport ? "import" : "new", null, null),
					property: identifier(isImport ? "meta" : "target", null, null),
					startToken,
					endToken
				};
			}
			case "Sequence":
				return {
					type: "SequenceExpression",
					expressions: convertList(node.expressions),
					startToken,
					endToken
				};
			case "Dot":
			case "DotHash":
			case "Sub":
				return {
					type: "MemberExpression",
					object: convert(node.object),
					// A name not computed has no tokens, as terser's string had none.
					property: node.computed
						? convert(node.property)
						: node.TYPE === "Dot"
							? identifier(node.property.name, null, null)
							: {
									type: "PrivateIdentifier",
									name: node.property.name,
									startToken: null,
									endToken: null
								},
					computed: node.computed,
					optional: node.optional === true,
					quote: node.quote,
					startToken,
					endToken
				};
			case "Chain":
				return {
					type: "ChainExpression",
					expression: convert(node.expression),
					startToken,
					endToken
				};
			case "UnaryPrefix":
			case "UnaryPostfix": {
				const operator = node.operator;
				return {
					type:
						operator === "++" || operator === "--"
							? "UpdateExpression"
							: "UnaryExpression",
					operator,
					prefix: node.TYPE === "UnaryPrefix",
					argument: convert(node.argument),
					startToken,
					endToken
				};
			}
			case "Binary": {
				const operator = node.operator;
				return {
					type:
						operator === "&&" || operator === "||" || operator === "??"
							? "LogicalExpression"
							: "BinaryExpression",
					operator,
					left: convert(node.left),
					right: convert(node.right),
					startToken,
					endToken
				};
			}
			case "Assign":
				return {
					type: "AssignmentExpression",
					operator: node.operator,
					left: convert(node.left, IN_PATTERN),
					right: convert(node.right),
					startToken,
					endToken
				};
			case "PrivateIn":
				return {
					type: "BinaryExpression",
					operator: "in",
					left: convert(node.left),
					right: convert(node.right),
					startToken,
					endToken
				};
			case "Conditional":
				return {
					type: "ConditionalExpression",
					test: convert(node.test),
					consequent: convert(node.consequent),
					alternate: convert(node.alternate),
					startToken,
					endToken
				};
			case "Import": {
				/** @type {PrintNode[]} */
				const specifiers = [];
				if (node.imported_name) {
					specifiers.push({
						type: "ImportDefaultSpecifier",
						local: convert(node.imported_name),
						startToken: node.imported_name.startToken,
						endToken: node.imported_name.endToken
					});
				}
				if (node.imported_names) {
					specifiers.push(...convertList(node.imported_names));
				}
				return {
					type: "ImportDeclaration",
					specifiers,
					source: convert(node.source),
					attributes: attributesOf(node.attributes),
					attributesStartToken: node.attributes
						? node.attributes.startToken
						: null,
					attributesEndToken: node.attributes ? node.attributes.endToken : null,
					phase: node.phase || undefined,
					startToken,
					endToken
				};
			}
			case "NameMapping":
				if (node.imported && isStar(node.imported)) {
					return {
						type: "ImportNamespaceSpecifier",
						local: convert(node.local),
						startToken,
						endToken
					};
				}
				if (node.imported) {
					return {
						type: "ImportSpecifier",
						local: convert(node.local),
						imported: convert(node.imported),
						startToken,
						endToken
					};
				}
				return {
					type: "ExportSpecifier",
					local: convert(node.local),
					exported: convert(node.exported),
					startToken,
					endToken
				};
			case "Export": {
				const names = node.exported_names;
				if (names && names.length > 0 && isStar(names[0].local)) {
					const foreignName = names[0].exported;
					return {
						type: "ExportAllDeclaration",
						exported: isStar(foreignName) ? null : convert(foreignName),
						source: convert(node.source),
						attributes: attributesOf(node.attributes),
						attributesStartToken: node.attributes
							? node.attributes.startToken
							: null,
						attributesEndToken: node.attributes
							? node.attributes.endToken
							: null,
						startToken,
						endToken
					};
				}
				if (node.is_default) {
					return {
						type: "ExportDefaultDeclaration",
						declaration: convert(
							node.exported_value || node.exported_definition
						),
						heldAsDefinition: Boolean(node.exported_definition),
						startToken,
						endToken
					};
				}
				return {
					type: "ExportNamedDeclaration",
					declaration: convert(node.exported_value || node.exported_definition),
					specifiers: names ? convertList(names) : [],
					source: convert(node.source),
					attributes: attributesOf(node.attributes),
					attributesStartToken: node.attributes
						? node.attributes.startToken
						: null,
					attributesEndToken: node.attributes ? node.attributes.endToken : null,
					startToken,
					endToken
				};
			}
			case "This":
				return { type: "ThisExpression", startToken, endToken };
			case "Super":
				return { type: "Super", startToken, endToken };
			case "SymbolPrivateProperty":
			case "SymbolMethod":
				// A method's key reaches here only as a private name.
				return {
					type: "PrivateIdentifier",
					name: node.name,
					startToken,
					endToken
				};
			case "SymbolVar":
			case "SymbolConst":
			case "SymbolUsing":
			case "SymbolLet":
			case "SymbolFunarg":
			case "SymbolDefun":
			case "SymbolLambda":
			case "SymbolDefClass":
			case "SymbolClass":
			case "SymbolCatch":
			case "SymbolImport":
			case "SymbolImportForeign":
			case "Label":
			case "SymbolRef":
			case "SymbolExport":
			case "SymbolExportForeign":
			case "LabelRef": {
				if (node.quote) {
					return literal(
						node.name,
						undefined,
						undefined,
						undefined,
						node.quote,
						startToken,
						endToken
					);
				}
				if (namesAsWritten) return identifier(node.name, startToken, endToken);
				const definition = node.definition();
				return identifier(
					definition ? definition.mangled_name || definition.name : node.name,
					startToken,
					endToken
				);
			}
			case "String": {
				const printNode = literal(
					node.value,
					undefined,
					undefined,
					undefined,
					node.quote,
					startToken,
					endToken
				);
				if (node._annotations & KEY) printNode.annotatedKey = true;
				return printNode;
			}
			case "Number":
				return literal(
					node.value,
					node.raw,
					undefined,
					undefined,
					undefined,
					startToken,
					endToken
				);
			case "BigInt":
				return literal(
					null,
					node.raw,
					undefined,
					node.value,
					undefined,
					startToken,
					endToken
				);
			case "RegExp":
				return literal(
					node.value,
					undefined,
					{ pattern: node.value.source, flags: node.value.flags },
					undefined,
					undefined,
					startToken,
					endToken
				);
			case "Null":
			case "True":
			case "False":
				return literal(
					node.value,
					undefined,
					undefined,
					undefined,
					undefined,
					startToken,
					endToken
				);
			case "NaN":
			case "Undefined":
			case "Infinity":
				// terser prints these as constants, never as a shorthand's name.
				return {
					type: "Identifier",
					name: String(node.value),
					definition: null,
					atom: true,
					startToken,
					endToken
				};
			case "Hole":
				return NO_PRINT_NODE;
			default:
				throw new Error(`toPrintTree cannot read a ${node.TYPE} node`);
		}
	};

	/**
	 * Reads terser's tree as an ESTree tree; temporary, while the printer moves
	 * from one to the other. Releasing drops each function's terser body once
	 * read, so read only to print under `_destroy_ast` or to drop the tree.
	 * @param {Node} node terser's node
	 * @param {PrintTreeObserver=} observe called with each node converted
	 * @param {number=} context where it sits, an expression unless given
	 * @param {boolean=} releasing whether to release what was read
	 * @param {boolean=} asWritten whether names are read as written, not as terser's definitions name them
	 * @returns {PrintNode} its ESTree node, null for none
	 */
	modules.toPrintTree = (node, observe, context, releasing, asWritten) => {
		observer = observe;
		release = releasing === true;
		namesAsWritten = asWritten === true;
		try {
			return convert(node, context);
		} finally {
			observer = undefined;
			release = false;
			namesAsWritten = false;
		}
	};

	/**
	 * @param {PrintParent} node a node
	 * @returns {node is PrintFunction} whether it is a function
	 */
	const isLambda = (node) =>
		node.type === "FunctionExpression" ||
		node.type === "ArrowFunctionExpression" ||
		node.type === "FunctionDeclaration";

	/**
	 * @param {PrintParent} node a node
	 * @returns {node is PrintMemberExpression} whether it is a member access
	 */
	const isPropAccess = (node) => node.type === "MemberExpression";

	/**
	 * @param {PrintParent} node a node
	 * @returns {node is PrintCallExpression | PrintNewExpression} whether it is a call or a `new`
	 */
	const isCall = (node) =>
		node.type === "CallExpression" || node.type === "NewExpression";

	// terser's node classes the printer asks of a node, by name without `Node`;
	// an Accessor (a method's value) reads as a Function, and a try's blocks as
	// BlockStatements, where no site asks.
	const kindOf = /** @type {PrintKinds} */ ({
		Array: (node) => node.type === "ArrayExpression",
		Arrow: (node) => node.type === "ArrowFunctionExpression",
		Assign: (node) => node.type === "AssignmentExpression",
		Await: (node) => node.type === "AwaitExpression",
		Binary: (node) =>
			(node.type === "BinaryExpression" &&
				node.left.type !== "PrivateIdentifier") ||
			node.type === "LogicalExpression" ||
			node.type === "AssignmentExpression" ||
			node.type === "AssignmentPattern",
		BlockStatement: (node) => node.type === "BlockStatement",
		Call: isCall,
		Chain: (node) => node.type === "ChainExpression",
		Class: (node) =>
			node.type === "ClassDeclaration" || node.type === "ClassExpression",
		ClassExpression: (node) => node.type === "ClassExpression",
		Conditional: (node) => node.type === "ConditionalExpression",
		DefaultAssign: (node) => node.type === "AssignmentPattern",
		Definitions: (node) =>
			node.type === "VariableDeclaration" &&
			(node.kind === "var" || node.kind === "let" || node.kind === "const"),
		DefinitionsLike: (node) => node.type === "VariableDeclaration",
		Defun: (node) => node.type === "FunctionDeclaration",
		Destructuring: (node) =>
			node.type === "ArrayPattern" || node.type === "ObjectPattern",
		Directive: (node) =>
			node.type === "ExpressionStatement" && typeof node.directive === "string",
		Do: (node) => node.type === "DoWhileStatement",
		Dot: (node) =>
			isPropAccess(node) &&
			!node.computed &&
			node.property.type === "Identifier",
		DotHash: (node) =>
			isPropAccess(node) && node.property.type === "PrivateIdentifier",
		EmptyStatement: (node) => node.type === "EmptyStatement",
		Expansion: (node) =>
			node.type === "SpreadElement" || node.type === "RestElement",
		Export: (node) =>
			node.type === "ExportNamedDeclaration" ||
			node.type === "ExportDefaultDeclaration" ||
			node.type === "ExportAllDeclaration",
		For: (node) => node.type === "ForStatement",
		ForIn: (node) =>
			node.type === "ForInStatement" || node.type === "ForOfStatement",
		ForOf: (node) => node.type === "ForOfStatement",
		Function: (node) => node.type === "FunctionExpression",
		If: (node) => node.type === "IfStatement",
		Import: (node) => node.type === "ImportDeclaration",
		Lambda: isLambda,
		New: (node) => node.type === "NewExpression",
		Object: (node) => node.type === "ObjectExpression",
		ObjectProperty: (node) =>
			node.type === "Property" ||
			node.type === "MethodDefinition" ||
			node.type === "PropertyDefinition",
		PrefixedTemplateString: (node) => node.type === "TaggedTemplateExpression",
		PrivateIn: (node) =>
			node.type === "BinaryExpression" &&
			node.left.type === "PrivateIdentifier",
		PropAccess: isPropAccess,
		Return: (node) => node.type === "ReturnStatement",
		Scope: (node) =>
			node.type === "Program" ||
			isLambda(node) ||
			node.type === "ClassDeclaration" ||
			node.type === "ClassExpression" ||
			node.type === "StaticBlock",
		Sequence: (node) => node.type === "SequenceExpression",
		SimpleStatement: (node) =>
			node.type === "ExpressionStatement" && typeof node.directive !== "string",
		StatementWithBody: (node) =>
			node.type === "LabeledStatement" ||
			node.type === "IfStatement" ||
			node.type === "WithStatement" ||
			node.type === "ForStatement" ||
			node.type === "ForInStatement" ||
			node.type === "ForOfStatement" ||
			node.type === "WhileStatement" ||
			node.type === "DoWhileStatement",
		Sub: (node) => isPropAccess(node) && node.computed === true,
		TemplateSegment: (node) => node.type === "TemplateElement",
		Unary: (node) =>
			node.type === "UnaryExpression" || node.type === "UpdateExpression",
		UnaryPostfix: (node) => node.type === "UpdateExpression" && !node.prefix,
		UnaryPrefix: (node) =>
			node.type === "UnaryExpression" ||
			(node.type === "UpdateExpression" && node.prefix),
		Var: (node) => node.type === "VariableDeclaration" && node.kind === "var",
		VarDefLike: (node) => node.type === "VariableDeclarator",
		Yield: (node) => node.type === "YieldExpression"
	});
	modules.kindOf = kindOf;
};

/**
 * A token of webpack's parse: where it sits in the source, and the parse that
 * read it. terser's `ParsedToken` keeps what this reads off that parse — its
 * line, its kind, the comments beside it — in nine fields of its own, which a
 * tree of a million nodes cannot afford.
 */
class SourceToken {
	/**
	 * @param {EXPECTED_ANY} tokens the parse that read it
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

	/** @returns {EXPECTED_ANY} what it holds */
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

	/** @returns {EXPECTED_ANY[]} the comments read before it */
	get comments_before() {
		return this.tokens.commentsOf(this.index, false);
	}

	/**
	 * @param {EXPECTED_ANY[]} comments the comments read before it
	 */
	set comments_before(comments) {
		this.tokens.bindComments(this.index, false, comments);
	}

	/** @returns {EXPECTED_ANY[]} the comments read after it */
	get comments_after() {
		return this.tokens.commentsOf(this.index, true);
	}

	/**
	 * @param {EXPECTED_ANY[]} comments the comments read after it
	 */
	set comments_after(comments) {
		this.tokens.bindComments(this.index, true, comments);
	}

	/**
	 * @param {number} _depth how deep Node's inspector is
	 * @param {EXPECTED_ANY} options its options
	 * @returns {string} the token, as Node's console shows it
	 */
	[Symbol.for("nodejs.util.inspect.custom")](_depth, options) {
		return `ParsedToken { type: ${options.stylize(JSON.stringify(this.type), "string")}, value: ${options.stylize(JSON.stringify(this.value), "string")}, line: ${options.stylize(String(this.line), "number")}, col: ${options.stylize(String(this.col), "number")} }`;
	}
}

/**
 * Installs webpack's parse: the printer's tree built by webpack's own parser as
 * it finishes each statement, with that parser's tokens and comments. terser's
 * parser stays behind it, for the sources it reads more leniently.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installFusedParse = (modules) => {
	const { ast, parse } = modules;
	const { SyntaxNode, isToplevelNode } = ast;

	const {
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
	 * @param {EXPECTED_ANY} type one of webpack's token kinds
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
	/** @type {EXPECTED_ANY[]} */
	const NO_COMMENTS = [];
	// A token type's kind as a code, so reporting one costs a single lookup; null
	// where the kind follows from the word the token spells.
	/** @type {Map<EXPECTED_ANY, number | null>} */
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
	 * token's `comments_after`. Only numbers are kept while the parse runs, and a
	 * token is built when a node is first given it: the parser reports one at its
	 * deepest, where the frames building it are the ones it has run out of.
	 * @param {string} source the source being parsed
	 * @param {string | null} filename what its tokens name as their file
	 * @returns {{ onComment: EXPECTED_FUNCTION, onToken: EXPECTED_FUNCTION, shebang: (text: string) => void, finish: () => void, at: (pos: number, ending: boolean, forward?: number) => EXPECTED_ANY }} where to report comments and tokens, the token at an offset, and what narrows the tables once the parse is over
	 */
	const collectTokens = (source, filename) => {
		// Where each token sits, its kind as an index into `KINDS`, and whether a
		// line break came before it: sized for the tokens a source this long holds,
		// doubled where it holds more, and trimmed by `finish` to what it read.
		let capacity = 64 + (source.length >> 2);
		let count = 0;
		/** @type {EXPECTED_ANY} */
		let starts = new Int32Array(capacity);
		/** @type {EXPECTED_ANY} */
		let ends = new Int32Array(capacity);
		/** @type {EXPECTED_ANY} */
		let kinds = new Uint8Array(capacity);
		/** @type {EXPECTED_ANY} */
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
		/** @type {Map<number, EXPECTED_ANY> | null} */
		let cooked = new Map();
		/** @type {EXPECTED_ANY[]} */
		let built = [];
		// The tokens asked for before the parse read them, whose index `finish`
		// holds back to the token past the source where it never did.
		/** @type {EXPECTED_ANY[]} */
		let beyond = [];
		/** @type {EXPECTED_ANY} */
		let lists = [];
		/** @type {number[] | null} */
		let lineStarts = null;
		let previousEnd = 0;
		// Whether a line break has been read since the last token, which reading
		// one clears, as terser's tokenizer has it.
		let brokenLine = false;
		// Whether the token before was a `.` or `?.`, after which terser reads a
		// word as a name whatever else it is.
		let afterDot = false;

		/**
		 * @param {number} index the token the comments were read before
		 * @returns {EXPECTED_ANY[]} them, as terser's tokens
		 */
		const listAt = (index) => {
			if (lists instanceof Map) {
				const kept = lists.get(index);
				return kept === undefined ? NO_COMMENTS : kept;
			}
			const known = lists[index];
			if (known !== undefined) return known;
			// A gap the parser has not read past gains its comments after this, so it
			// is given a list of its own to gain them in; one already read and holding
			// none shares the empty list with every other.
			const list = index < count ? NO_COMMENTS : [];
			lists[index] = list;
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
			let list = lists[index];
			if (list === undefined || list === NO_COMMENTS) {
				list = [];
				lists[index] = list;
			}
			if (lineStarts === null) lineStarts = buildLineStarts(source);
			const { line, column } = /** @type {{ line: number, column: number }} */ (
				positionAt(/** @type {number[]} */ (lineStarts), start)
			);
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
		 * @returns {EXPECTED_ANY} it, built once
		 */
		const build = (index) => {
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
				positionAt(/** @type {number[]} */ (lineStarts), starts[index])
			);
		};

		// A list bound onto one token by a parenthesis, which the gap it was read
		// in keeps out of: one token to an index, so the index names it.
		/** @type {Map<number, EXPECTED_ANY[]> | null} */
		let boundBefore = null;
		/** @type {Map<number, EXPECTED_ANY[]> | null} */
		let boundAfter = null;

		// What a `SourceToken` of this parse reads off it. The arrays it reads are
		// the ones `finish` narrows; the rest go when the parse is over.
		const reader = {
			fileName: filename === null ? undefined : filename,
			positionOf: (/** @type {number} */ index) => starts[index],
			kindOf: (/** @type {number} */ index) => KINDS[kinds[index]],
			valueOf: (/** @type {number} */ index) =>
				cooked !== null && cooked.has(index)
					? cooked.get(index)
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
				const bound = after ? boundAfter : boundBefore;
				const own = bound === null ? undefined : bound.get(index);
				return own === undefined ? listAt(after ? index + 1 : index) : own;
			},
			bindComments: (
				/** @type {number} */ index,
				/** @type {boolean} */ after,
				/** @type {EXPECTED_ANY[]} */ comments
			) => {
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
			onToken: (/** @type {EXPECTED_ANY} */ token) => {
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
					/** @type {Map<number, EXPECTED_ANY>} */ (cooked).set(count, value);
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
				/** @type {Map<number, EXPECTED_ANY[]>} */
				const kept = new Map();
				for (let i = 0; i < lists.length; i++) {
					const list = lists[i];
					if (list !== undefined && list.length !== 0) kept.set(i, list);
				}
				for (const token of beyond) {
					if (token.index >= count) token.index = count - 1;
				}
				beyond = [];
				starts = narrowStarts;
				ends = narrowEnds;
				kinds = narrowKinds;
				breaks = narrowBreaks;
				lists = kept;
				built = [];
				if (/** @type {Map<number, EXPECTED_ANY>} */ (cooked).size === 0) {
					cooked = null;
				}
			},
			at: (
				/** @type {number} */ pos,
				/** @type {boolean} */ ending,
				/** @type {number=} */ forward
			) => {
				const offsets = ending ? ends : starts;
				let low = 0;
				// What the parse has read, which is short of the room it was given.
				let high = count - 1;
				// The last token ending by `pos`, or the first one starting from it.
				while (low <= high) {
					const middle = (low + high) >> 1;
					if (ending ? offsets[middle] <= pos : offsets[middle] < pos) {
						low = middle + 1;
					} else {
						high = middle - 1;
					}
				}
				let index = ending ? high : low;
				if (forward !== undefined && index >= 0) {
					// What terser's `peek()` holds: a token the parse may not have read
					// when a node is given it, and the one past the source where the
					// parse ends before reaching that far.
					index += forward;
					if (index >= count) {
						const ahead = build(index);
						beyond.push(ahead);
						return ahead;
					}
				}
				return index < 0 || index >= count ? undefined : build(index);
			}
		};
	};

	/**
	 * webpack's parser, converting each statement it finishes into the printer's
	 * node. An export reads the declaration it holds, so that one waits.
	 */
	class PrinterParser extends WebpackParser {
		/**
		 * @param {EXPECTED_ANY} options what to parse it as
		 * @param {string} source the source
		 * @param {((pos: number, ending: boolean) => EXPECTED_ANY)=} tokenAt the token at an offset
		 */
		constructor(options, source, tokenAt) {
			super(options, source);
			this.webpackTokenAt = tokenAt;
			this.webpackSource = source;
			this.webpackKeepsEstree = false;
		}

		/**
		 * Read one statement. A statement head that is only a keyword by position —
		 * `let`, `async`, `using` — is settled by the probes above.
		 * @param {string | null=} context what encloses the statement
		 * @param {boolean=} topLevel whether it sits at the top level
		 * @param {EXPECTED_ANY=} exports where module exports are tracked
		 * @returns {EXPECTED_ANY} the statement
		 */
		parseStatement(context, topLevel, exports) {
			const statement = super.parseStatement(context, topLevel, exports);
			return this.webpackKeepsEstree
				? statement
				: SyntaxNode.from_mozilla_ast(
						statement,
						this.webpackTokenAt,
						this.webpackSource
					);
		}

		/**
		 * @param {EXPECTED_ANY} node the export node
		 * @param {EXPECTED_ANY} exports where module exports are tracked
		 * @returns {EXPECTED_ANY} the finished export
		 */
		parseExport(node, exports) {
			const was = this.webpackKeepsEstree;
			this.webpackKeepsEstree = true;
			try {
				return super.parseExport(node, exports);
			} finally {
				this.webpackKeepsEstree = was;
			}
		}
	}

	// The parse options read, each at its default; any other is refused.
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
	 * @param {EXPECTED_ANY} options terser's parse options
	 * @returns {EXPECTED_OBJECT} what to ask webpack's parser for
	 */
	const parserOptions = (source, options) => ({
		ecmaVersion: "latest",
		sourceType: options.module ? "module" : "script",
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
		allowHashBang: Boolean(options.shebang) && source.startsWith("#!"),
		// terser reads module syntax in a script too, and `import defer`.
		allowImportExportEverywhere: !options.module,
		importPhases: true
	});

	/**
	 * terser's `parse`, reading the source with webpack's own parser. Its tree is
	 * terser's but for the parentheses a comment sits inside, which terser's own
	 * ESTree conversion drops too.
	 * @param {string} text the source
	 * @param {EXPECTED_OBJECT=} givenOptions terser's parse options
	 * @returns {Node} the tree
	 */
	parse.parse = (text, givenOptions) => {
		const options = defaults(givenOptions, PARSE_DEFAULTS, true);
		const filename =
			typeof options.filename === "string" ? options.filename : null;
		let toplevel;
		try {
			const tokens = collectTokens(text, filename);
			if (options.shebang !== false && text.startsWith("#!")) {
				// The hashbang ends at the first line terminator, whichever it is.
				const line = text.search(/[\n\r\u2028\u2029]/);
				tokens.shebang(text.slice(2, line === -1 ? text.length : line));
			}
			const parser = new PrinterParser(
				{
					...parserOptions(text, options),
					onComment: tokens.onComment,
					// The parser itself at each token, which keeps its token fast path
					// and spares a token object a reader would only copy from.
					onTokenRead: tokens.onToken
				},
				text,
				tokens.at
			);
			toplevel = SyntaxNode.from_mozilla_ast(parser.parse(), tokens.at, text);
			tokens.finish();
		} catch (error) {
			const { loc, pos } = /** @type {EXPECTED_ANY} */ (error);
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
		const previous = options.toplevel;
		if (isToplevelNode(previous)) {
			previous.body = [...previous.body, ...toplevel.body];
			previous.endToken = toplevel.endToken;
			return previous;
		}
		return toplevel;
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
 * Installs webpack's character counter into terser's `base54`, the object
 * `minify` hands the mangler, so its identity — which the `mangle` phase
 * reads — is unchanged.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installFrequency = ({ scope, utils }) => {
	Object.assign(scope.base54, createFrequency(mergeSort));
};

/**
 * terser's compressor: the methods the phases call typed, the rest open.
 * @typedef {{
 * options: Record<string, EXPECTED_ANY>,
 * stack: NodeShape[],
 * option(name: string): EXPECTED_ANY,
 * has_directive(directive: string): EXPECTED_ANY,
 * parent(level?: number): NodeShape,
 * self(): NodeShape,
 * find_parent(test: NodeTest): NodeShape | undefined,
 * in_boolean_context(): boolean | undefined,
 * [key: string]: EXPECTED_ANY,
 * }} CompressorShape
 */
/** @typedef {Record<PropertyKey, EXPECTED_ANY>} OutputStream terser's output stream */
/** @typedef {(this: Node, compressor: CompressorShape) => Node} Optimize a node's `optimize` */
/** @typedef {{ enabled: boolean }} Corrections the switch the corrections read */

/**
 * Runs `run` with some of the compressor's options off, so the transforms they
 * gate are skipped for this node alone.
 * @template T
 * @param {CompressorShape} compressor the compressor
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
 * @param {MinifierModules} modules terser's modules
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
			/** @type {CompressorShape} */ compressor
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
		A.terserKey(property.key) === "__proto__" &&
		Boolean(property.startToken) &&
		property.startToken === property.endToken;

	/**
	 * Whether a property sets the object's prototype: `__proto__: value`.
	 * @param {Node} property an object literal's property
	 * @returns {boolean} true for a prototype setter
	 */
	const setsPrototype = (property) =>
		A.isObjectKeyValNode(property) &&
		A.terserKey(property.key) === "__proto__" &&
		!isShorthandProto(property);

	// `{ __proto__ }` is an own property and `{ __proto__: x }` the prototype, a
	// difference terser's tree keeps only in the tokens, so print by them; an
	// import attribute is never a shorthand, so its `__proto__` prints alike.
	const estreeCodegen = /** @type {EstreeGenerators} */ (modules.estreeCodegen);
	const printProperty =
		/** @type {NonNullable<EstreeGenerators["Property"]>} */ (
			estreeCodegen.Property
		);
	estreeCodegen.Property = (node, output) => {
		const { key, value } = node;
		const parent = /** @type {PrintNode | undefined} */ (output.parent());
		if (
			!corrections.enabled ||
			node.kind !== "init" ||
			node.method ||
			node.computed ||
			(key.type === "Literal"
				? key.value
				: /** @type {PrintIdentifier} */ (key).name) !== "__proto__" ||
			!parent ||
			parent.type !== "ObjectExpression"
		) {
			printProperty(node, output);
			return;
		}
		const asShorthand =
			value.type === "Identifier" &&
			value.atom !== true &&
			value.name === "__proto__" &&
			output.option("shorthand");
		if (node.startToken && node.startToken === node.endToken) {
			if (asShorthand) {
				output.print_name("__proto__");
			} else {
				output.with_square(() => output.print_string("__proto__"));
				output.colon();
				modules.printEstree(value, output);
			}
			return;
		}
		if (!asShorthand) {
			printProperty(node, output);
			return;
		}
		output.print_name("__proto__");
		output.colon();
		modules.printEstree(value, output);
	};

	// Spreading `{ __proto__: p }` copies none of `p`, where writing its
	// properties into the outer literal would set that literal's prototype.
	wrapOptimize(
		A.ObjectNode.prototype,
		(original) =>
			function optimize(compressor) {
				/** @type {[Node, Node][]} */
				const kept = [];
				for (const property of this.properties) {
					if (
						A.isExpansionNode(property) &&
						A.isObjectNode(property.argument) &&
						property.argument.properties.some(setsPrototype)
					) {
						kept.push([property, property.argument]);
						property.argument = new A.SequenceNode({
							startToken: property.argument.startToken,
							expressions: [property.argument],
							endToken: property.argument.endToken
						});
					}
				}
				try {
					return original.call(this, compressor);
				} finally {
					for (const [property, expression] of kept) {
						property.argument = expression;
					}
				}
			}
	);

	// A direct `eval` reads `this` without naming it.
	const containsThis = A.SyntaxNode.prototype.contains_this;
	A.SyntaxNode.prototype.contains_this = function contains_this() {
		return (
			containsThis.call(this) ||
			(corrections.enabled && A.isScopeNode(this) && this.uses_eval)
		);
	};

	/**
	 * Whether a parameter has a default whose evaluation has effects.
	 * @param {Node} parameter the parameter
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} true for `(a = f()) => …`
	 */
	const hasDefaultWithEffects = (parameter, compressor) =>
		A.isDefaultAssignNode(parameter) &&
		parameter.right.has_side_effects(compressor);

	/**
	 * The options that would drop effects a call's parameters or arguments
	 * still have: inlining or dropping it loses a default or a pattern, and
	 * dropping an empty function's call loses a spread's iteration.
	 * @param {Node} call the call
	 * @param {CompressorShape} compressor the compressor
	 * @returns {string[]} the options to skip for this call
	 */
	const optionsLosingEffects = (call, compressor) => {
		let fn = call.callee;
		if (A.isSymbolRefNode(fn) && typeof fn.fixed_value === "function") {
			fn = fn.fixed_value();
		}
		if (!A.isLambdaNode(fn)) return [];
		if (
			fn.params.some(
				(/** @type {Node} */ parameter) =>
					A.isDestructuringNode(parameter) ||
					hasDefaultWithEffects(parameter, compressor) ||
					(A.isExpansionNode(parameter) &&
						!A.isSymbolFunargNode(parameter.argument))
			)
		) {
			return ["inline", "side_effects"];
		}
		return fn.body.body.every(isEmpty) &&
			call.arguments.some((/** @type {Node} */ arg) => A.isExpansionNode(arg))
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
		(A.isCallNode(parent) && parent.callee === node) ||
		(A.isPrefixedTemplateStringNode(parent) && parent.tag === node);

	/**
	 * Whether calling a node binds `this` to the object it was read from, or
	 * makes a direct `eval`.
	 * @param {Node} node the node
	 * @returns {boolean} true for `a.b`, `a?.b` and `eval`
	 */
	const bindsThis = (node) =>
		A.isPropAccessNode(node) ||
		A.isChainNode(node) ||
		(A.isSymbolRefNode(node) && node.name === "eval");

	/**
	 * `(0, result)`, which calls `result` unbound.
	 * @param {Node} result what took a callee's place
	 * @returns {Node} the sequence
	 */
	const detached = (result) =>
		new A.SequenceNode({
			startToken: result.startToken,
			expressions: [
				new A.NumberNode({
					startToken: result.startToken,
					value: 0,
					endToken: result.startToken
				}),
				result
			],
			endToken: result.endToken
		});

	// A callee replaced by `a.b` must not bind `a`, which the callee it replaces
	// never did; terser keeps the `0,` for a call but not for a tag.
	wrapOptimize(
		A.CallNode.prototype,
		(original) =>
			function optimize(compressor) {
				const parent = compressor.parent();
				const result = optimizeKeepingEffects(this, compressor, original);
				return result !== this && isCallee(parent, this) && bindsThis(result)
					? detached(result)
					: result;
			}
	);
	for (const Type of [A.SequenceNode, A.ConditionalNode]) {
		wrapOptimize(
			Type.prototype,
			(original) =>
				function optimize(compressor) {
					const parent = compressor.parent();
					if (!A.isPrefixedTemplateStringNode(parent) || parent.tag !== this) {
						return original.call(this, compressor);
					}
					if (
						A.isSequenceNode(this) &&
						this.expressions.length === 2 &&
						A.isNumberNode(this.expressions[0]) &&
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
	 * @param {CompressorShape} compressor the compressor
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
		A.SubNode.prototype,
		(original) =>
			function optimize(compressor) {
				const { object: expression, property } = this;
				if (
					compressor.option("arguments") &&
					A.isSymbolRefNode(expression) &&
					expression.name === "arguments" &&
					A.isLambdaNode(expression.scope) &&
					!A.isArrowNode(expression.scope) &&
					A.isNumberNode(property) &&
					!compressor.has_directive("use strict")
				) {
					const parameter = expression.scope.params[property.getValue()];
					if (A.isSymbolFunargNode(parameter)) {
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
		A.BinaryNode.prototype,
		(original) =>
			function optimize(compressor) {
				const parent = compressor.parent();
				if (A.isPrefixedTemplateStringNode(parent) && parent.tag === this) {
					const result = original.call(this, compressor);
					return result !== this && bindsThis(result)
						? detached(result)
						: result;
				}
				if (
					(this.operator === "===" || this.operator === "!==") &&
					compressor.option("comparisons") &&
					!A.isSymbolRefNode(this.left) &&
					!A.isConstantNode(this.left) &&
					this.left.equivalent_to(this.right)
				) {
					return withOptionsOff(compressor, ["comparisons"], () =>
						original.call(this, compressor)
					);
				}
				return original.call(this, compressor);
			}
	);

	/** @type {WeakMap<CompressorShape, Set<Node>>} */
	const defaultsWithEffects = new WeakMap();

	// terser moves what follows an `if (…) return` into the `if`, leaving `let`
	// and `const` where they are but not `class`, which is block-scoped too.
	for (const Type of [
		A.BlockNode,
		A.BlockStatementNode,
		A.LambdaNode,
		A.ArrowNode,
		A.FunctionNode,
		A.ClassStaticBlockNode
	]) {
		if (!Object.prototype.hasOwnProperty.call(Type.prototype, "optimize")) {
			continue;
		}
		wrapOptimize(
			Type.prototype,
			(original) =>
				function optimize(compressor) {
					if (
						A.isLambdaNode(this) &&
						this.params.some((/** @type {Node} */ parameter) =>
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
					const statements = A.bodyOf(this);
					return Array.isArray(statements) &&
						statements.some((/** @type {Node} */ statement) =>
							A.isDefClassNode(statement)
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
		 * @param {CompressorShape} compressor the compressor
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
	const dropUnused = A.ScopeNode.prototype.drop_unused;
	A.ScopeNode.prototype.drop_unused = function drop_unused(
		/** @type {CompressorShape} */ compressor
	) {
		const lambdas = corrections.enabled
			? defaultsWithEffects.get(compressor)
			: undefined;
		if (lambdas === undefined) return dropUnused.call(this, compressor);
		/** @type {[Node, Node[]][]} */
		const before = [];
		for (const lambda of lambdas) before.push([lambda, [...lambda.params]]);
		const result = dropUnused.call(this, compressor);
		for (const [lambda, argnames] of before) {
			let keep = lambda.params.length;
			for (let i = keep; i < argnames.length; i++) {
				if (hasDefaultWithEffects(argnames[i], compressor)) keep = i + 1;
			}
			for (let i = lambda.params.length; i < keep; i++) {
				lambda.params.push(argnames[i]);
			}
		}
		return result;
	};
};

/** @typedef {{ enabled: boolean }} Improvements the switch the improvements read */

/**
 * Installs webpack's improvements on terser: each writes a program terser
 * leaves longer, only where the shorter one provably behaves the same.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installImprove = (modules) => {
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (modules.ast);
	/** @type {Improvements} */
	const improvements = { enabled: true };
	modules.improvements = improvements;

	/**
	 * Whether a node reads the `this`, `arguments`, `new.target` or `super` of
	 * the function around it, through the arrows sharing them, or names `yield`
	 * or `await`, which a generator or async function around it reads as its own.
	 * @param {Node} node a node
	 * @returns {boolean} true when it does
	 */
	const readsFunctionContext = (node) => {
		let reads = false;
		node.walk(
			new A.TreeWalker((/** @type {Node} */ inner) => {
				if (reads) return true;
				if (A.isLambdaNode(inner) && inner !== node) {
					if (!A.isArrowNode(inner)) return true;
					if (inner.uses_eval) reads = true;
					return;
				}
				if (
					A.isThisNode(inner) ||
					A.isNewTargetNode(inner) ||
					(A.isSymbolRefNode(inner) && inner.name === "arguments") ||
					(A.isSymbolNode(inner) &&
						(inner.name === "yield" || inner.name === "await"))
				) {
					reads = true;
				}
			})
		);
		return reads;
	};

	/**
	 * Whether a function's body runs the same as a block in its caller's place:
	 * nothing in it is the function's own, no `var`, function declaration,
	 * `return`, label, directive or context, and no `eval` or `with`.
	 * @param {Node} fn the function
	 * @returns {boolean} true when its body can stand in for the call
	 */
	const runsAsBlock = (fn) => {
		if (
			fn.params.length > 0 ||
			fn.id ||
			fn.async ||
			fn.generator ||
			fn.uses_eval ||
			fn.uses_with
		) {
			return false;
		}
		let own = false;
		fn.walk(
			new A.TreeWalker((/** @type {Node} */ node) => {
				if (own) return true;
				if (node === fn) return;
				if (
					A.isDefunNode(node) ||
					A.isVarNode(node) ||
					A.isReturnNode(node) ||
					A.isLabeledStatementNode(node) ||
					A.isDirectiveNode(node)
				) {
					own = true;
					return true;
				}
				// A nested function's own declarations and returns are its own.
				if (A.isLambdaNode(node)) return true;
			})
		);
		return !own && (A.isArrowNode(fn) || !readsFunctionContext(fn));
	};

	/**
	 * The function an expression calls in place, with nothing passed and its
	 * value dropped, when its body runs the same as a block there.
	 * @param {Node} expression an expression whose value is dropped
	 * @returns {Node | undefined} the function
	 */
	const calledInPlace = (expression) => {
		let call = expression;
		// The value is dropped, so a `!` or `void` before the call reads nothing.
		while (
			A.isUnaryPrefixNode(call) &&
			(call.operator === "!" || call.operator === "void")
		) {
			call = call.argument;
		}
		if (
			!A.isCallNode(call) ||
			A.isNewNode(call) ||
			call.optional ||
			call.arguments.length > 0 ||
			(call._annotations & A._NOINLINE) !== 0
		) {
			return undefined;
		}
		const fn = call.callee;
		return (A.isFunctionNode(fn) || A.isArrowNode(fn)) && runsAsBlock(fn)
			? fn
			: undefined;
	};

	/** @type {(node: Node) => boolean} */
	const canBeEvictedFromBlock = modules.common.can_be_evicted_from_block;
	/** @type {(orig: Node, expressions: Node[]) => Node} */
	const makeSequence = modules.common.make_sequence;

	/**
	 * Whether a statement calls a function in place that runs as a block there.
	 * @param {Node} statement a statement whose value is dropped
	 * @returns {boolean} true when `runInPlace` rewrites it
	 */
	const runsInPlace = (statement) => {
		/** @type {Node} */
		const value = statement.expression;
		if (!A.isSequenceNode(value)) {
			return calledInPlace(value) !== undefined;
		}
		for (const expression of value.expressions) {
			if (calledInPlace(expression) !== undefined) return true;
		}
		return false;
	};

	/**
	 * A statement's expressions as statements, each function it calls in place
	 * written as its body, or as a block where that declares something scoped.
	 * @param {Node} statement a statement whose value is dropped
	 * @returns {Node[] | undefined} the statements, or nothing to rewrite
	 */
	const runInPlace = (statement) => {
		/** @type {Node} */
		const value = statement.expression;
		/** @type {Node[]} */
		const expressions = A.isSequenceNode(value) ? value.expressions : [value];
		/** @type {Node[]} */
		const statements = [];
		/** @type {Node[]} */
		let pending = [];
		let rewritten = false;
		for (const expression of expressions) {
			const fn = calledInPlace(expression);
			if (!fn) {
				pending.push(expression);
				continue;
			}
			rewritten = true;
			if (pending.length > 0) {
				statements.push(
					makeNode(A.SimpleStatementNode, statement, {
						expression: makeSequence(statement, pending)
					})
				);
				pending = [];
			}
			/** @type {Node[]} */
			const body = fn.body.body;
			if (body.every(canBeEvictedFromBlock)) {
				statements.push(...body);
			} else {
				statements.push(makeNode(A.BlockStatementNode, statement, { body }));
			}
		}
		if (!rewritten) return undefined;
		if (pending.length > 0) {
			statements.push(
				makeNode(A.SimpleStatementNode, statement, {
					expression: makeSequence(statement, pending)
				})
			);
		}
		return statements;
	};

	// Compressing visits every statement, so it notes the compressor that met
	// one calling a function in place, the walk below being for nothing otherwise.
	/** @type {CompressorShape | undefined} */
	let callingInPlace;
	/** @type {(this: Node, compressor: CompressorShape) => Node} */
	const optimizeStatement = A.SimpleStatementNode.prototype.optimize;
	A.SimpleStatementNode.prototype.optimize = function optimize(
		/** @type {CompressorShape} */ compressor
	) {
		if (
			callingInPlace !== compressor &&
			improvements.enabled &&
			runsInPlace(this)
		) {
			callingInPlace = compressor;
		}
		return optimizeStatement.call(this, compressor);
	};

	// Run on the finished tree, so terser has already inlined what it would
	// from inside the function, which a block at the top level would stop.
	/** @type {{ prototype: { compress: (this: CompressorShape, toplevel: Node) => Node } }} */
	const Compressor = modules.compress.Compressor;
	const compressTree = Compressor.prototype.compress;
	/**
	 * @this {CompressorShape} the compressor
	 * @param {Node} toplevel the tree
	 * @returns {Node} the tree compressed
	 */
	Compressor.prototype.compress = function compress(toplevel) {
		const compressed = compressTree.call(this, toplevel);
		// Under `expression` the last statement is the program's value.
		if (
			!improvements.enabled ||
			!this.option("inline") ||
			this.option("expression") ||
			callingInPlace !== this
		) {
			callingInPlace = undefined;
			return compressed;
		}
		callingInPlace = undefined;
		// Read the tree once, writing nothing, then rewrite only the statements
		// found, innermost first, so a body moved out already holds its own.
		/** @type {[Node, Node][]} */
		const found = [];
		const walker = new A.TreeWalker(
			(/** @type {Node} */ node, /** @type {() => void} */ descend) => {
				if (!A.isSimpleStatementNode(node)) return;
				descend();
				if (runsInPlace(node)) found.push([node, walker.parent()]);
				return true;
			}
		);
		compressed.walk(walker);
		for (const [statement, parent] of found) {
			const statements = /** @type {Node[]} */ (runInPlace(statement));
			/** @type {Node[] | undefined} */
			const body = A.bodyOf(parent);
			const list = Array.isArray(body) ? body : undefined;
			const index = list ? list.indexOf(statement) : -1;
			// A string first in a list could read as a directive there.
			if (
				list &&
				index !== -1 &&
				!(
					A.isSimpleStatementNode(statements[0]) &&
					A.isStringNode(statements[0].expression)
				)
			) {
				list.splice(index, 1, ...statements);
				continue;
			}
			const block =
				statements.length === 1 && A.isBlockStatementNode(statements[0])
					? statements[0]
					: makeNode(A.BlockStatementNode, statement, { body: statements });
			if (list && index !== -1) {
				list[index] = block;
				continue;
			}
			for (const key of Object.keys(parent)) {
				if (parent[key] === statement) parent[key] = block;
			}
		}
		return compressed;
	};
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
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installEvaluate = (modules) => {
	const { ast, inference, utils } = modules;
	const {
		ArrayNode,
		isArrayNode,
		BigIntNode,
		BinaryNode,
		CallNode,
		ChainNode,
		ClassNode,
		ConditionalNode,
		ConstantNode,
		isConstantNode,
		isDotNode,
		isExpansionNode,
		FunctionNode,
		isFunctionNode,
		LambdaNode,
		isLambdaNode,
		NewNode,
		SyntaxNode,
		isSyntaxNode,
		ObjectNode,
		isObjectNode,
		PropAccessNode,
		isPropAccessNode,
		RegExpNode,
		isRegExpNode,
		StatementNode,
		isSymbolNode,
		SymbolRefNode,
		isSymbolRefNode,
		TemplateStringNode,
		UnaryPrefixNode,
		isUnaryPrefixNode,

		isWithNode
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
	 * @param {CompressorShape} compressor the compressor
	 * @returns {EXPECTED_ANY} its value, or itself where it has none worth writing
	 */
	SyntaxNode.prototype.evaluate = function evaluate(compressor) {
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
	SyntaxNode.prototype.is_constant = function is_constant() {
		if (isConstantNode(this)) return !isRegExpNode(this);
		return (
			isUnaryPrefixNode(this) &&
			CONSTANT_UNARY.has(this.operator) &&
			(isConstantNode(this.argument) || this.argument.is_constant())
		);
	};

	/**
	 * @this {Node} a statement
	 * @returns {never} never: a statement has no value
	 */
	StatementNode.prototype._eval = function _eval() {
		throw new Error(
			stringTemplate(
				"Cannot evaluate a statement [{file}:{line},{col}]",
				this.startToken
			)
		);
	};
	LambdaNode.prototype._eval = returnThis;
	ClassNode.prototype._eval = returnThis;
	SyntaxNode.prototype._eval = returnThis;
	NewNode.prototype._eval = returnThis;

	/**
	 * @this {Node} a constant
	 * @returns {EXPECTED_ANY} its value
	 */
	ConstantNode.prototype._eval = function _eval() {
		return this.getValue();
	};

	/**
	 * @this {Node} a BigInt literal
	 * @returns {bigint} its value
	 */
	BigIntNode.prototype._eval = function _eval() {
		return BigInt(this.value);
	};

	/**
	 * @this {Node} a regular expression literal
	 * @param {CompressorShape} compressor the compressor
	 * @returns {RegExp | Node} the expression built, once per compressor
	 */
	RegExpNode.prototype._eval = function _eval(compressor) {
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
	TemplateStringNode.prototype._eval = function _eval() {
		if (this.segments.length !== 1) return this;
		return this.segments[0].value;
	};

	/**
	 * @this {Node} a function expression
	 * @param {CompressorShape} compressor the compressor
	 * @returns {EXPECTED_ANY} a stand-in function under `unsafe`, else itself
	 */
	FunctionNode.prototype._eval = function _eval(compressor) {
		if (!compressor.option("unsafe")) return this;
		/** @type {EXPECTED_ANY} */
		const stand = fn;
		stand.node = this;
		stand.toString = () => modules.printToString(this);
		return stand;
		/**
		 * @returns {void}
		 */
		function fn() {}
	};

	/**
	 * @this {Node} an array literal
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its elements' values under `unsafe`, else itself
	 */
	ArrayNode.prototype._eval = function _eval(compressor, depth) {
		if (!compressor.option("unsafe")) return this;
		const elements = [];
		for (const element of this.elements) {
			// A hole reads as undefined, as terser's hole node did.
			if (element === null) {
				elements.push(undefined);
				continue;
			}
			const value = element._eval(compressor, depth);
			if (element === value) return this;
			elements.push(value);
		}
		return elements;
	};

	/**
	 * @this {Node} an object literal
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its properties' values under `unsafe`, else itself
	 */
	ObjectNode.prototype._eval = function _eval(compressor, depth) {
		if (!compressor.option("unsafe")) return this;
		/** @type {Record<string, EXPECTED_ANY>} */
		const value = {};
		for (const property of this.properties) {
			if (isExpansionNode(property)) return this;
			let key = property.key;
			if (isSymbolNode(key)) {
				key = key.name;
			} else if (isSyntaxNode(key)) {
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
			if (isFunctionNode(property.value)) continue;
			value[key] = property.value._eval(compressor, depth);
			if (value[key] === property.value) return this;
		}
		return value;
	};

	/**
	 * @this {Node} a prefix operation
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its value, or itself
	 */
	UnaryPrefixNode.prototype._eval = function _eval(compressor, depth) {
		let expression = this.argument;
		if (compressor.option("typeofs") && this.operator === "typeof") {
			// A function would evaluate to an array, whose `typeof` is "object".
			if (
				isLambdaNode(expression) ||
				(isSymbolRefNode(expression) && isLambdaNode(expression.fixed_value()))
			) {
				return "function";
			}
			if (
				(isObjectNode(expression) ||
					isArrayNode(expression) ||
					(isSymbolRefNode(expression) &&
						(isObjectNode(expression.fixed_value()) ||
							isArrayNode(expression.fixed_value())))) &&
				!expression.has_side_effects(compressor)
			) {
				return "object";
			}
		}
		if (!NON_CONVERTING_UNARY.has(this.operator)) depth++;
		expression = expression._eval(compressor, depth);
		if (expression === this.argument) return this;
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its value, or itself
	 */
	BinaryNode.prototype._eval = function _eval(compressor, depth) {
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
			compressor.find_parent(isWithNode)
		) {
			return this;
		}
		return result;
	};

	/**
	 * @this {Node} a conditional
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} the value of the branch taken, or itself
	 */
	ConditionalNode.prototype._eval = function _eval(compressor, depth) {
		const condition = this.test._eval(compressor, depth);
		if (condition === this.test) return this;
		const node = condition ? this.consequent : this.alternate;
		const value = node._eval(compressor, depth);
		return value === node ? this : value;
	};

	/**
	 * @this {Node} a reference
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} the value it is known to hold, or itself
	 */
	SymbolRefNode.prototype._eval = function _eval(compressor, depth) {
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @returns {EXPECTED_ANY} its value, `undefined` where it short-circuits
	 */
	ChainNode.prototype._eval = function _eval(compressor, depth) {
		const evaluated = this.expression._eval(compressor, depth, true);
		if (evaluated === NULLISH) return undefined;
		return evaluated === this.expression ? this : evaluated;
	};

	/**
	 * @param {Node | false | null | undefined} node the first argument of `hasOwnProperty.call`, if any
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether it may be a global nobody declared
	 */
	const readsUndeclared = (node, compressor) => {
		let first = node && node.evaluate(compressor);
		first = isDotNode(first) ? first.object : first;
		return (
			first === null ||
			first === undefined ||
			Boolean(first.thedef && first.thedef.undeclared)
		);
	};

	/**
	 * @this {Node} a property access
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @param {boolean=} inChain whether it is a link of an optional chain
	 * @returns {EXPECTED_ANY} the property's value, or itself
	 */
	PropAccessNode.prototype._eval = function _eval(compressor, depth, inChain) {
		let object =
			(inChain ||
				ast.terserProperty(this) === "length" ||
				compressor.option("unsafe")) &&
			this.object._eval(compressor, depth + 1, inChain);
		if (
			inChain &&
			(object === NULLISH ||
				(this.optional && (object === null || object === undefined)))
		) {
			return NULLISH;
		}
		// The `.length` of a string or an array is always safe to read.
		if (ast.terserProperty(this) === "length") {
			if (typeof object === "string") return object.length;
			if (
				isArrayNode(object) &&
				object.elements.every(
					(/** @type {Node} */ element) => !isExpansionNode(element)
				) &&
				object.elements.every(
					(/** @type {Node | null} */ element) =>
						element === null || !element.has_side_effects(compressor)
				)
			) {
				return object.elements.length;
			}
		}
		if (!compressor.option("unsafe")) return this;
		let key = ast.terserProperty(this);
		if (isSyntaxNode(key)) {
			key = key._eval(compressor, depth);
			if (key === this.property) return this;
		}
		const expression = this.object;
		if (isUndeclaredRef(expression)) {
			if (expression.name === "hasOwnProperty" && key === "call") {
				const parent = compressor.parent();
				const args = parent && parent.arguments;
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
						return object.node.id ? object.node.id.name : "";
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {number} depth how deep in the evaluation it is
	 * @param {boolean=} inChain whether it is a link of an optional chain
	 * @returns {EXPECTED_ANY} what a pure built-in returns, or itself
	 */
	CallNode.prototype._eval = function _eval(compressor, depth, inChain) {
		const callee = this.callee;
		if (inChain) {
			const evaluated = callee._eval(compressor, depth, inChain);
			if (
				evaluated === NULLISH ||
				(this.optional && (evaluated === null || evaluated === undefined))
			) {
				return NULLISH;
			}
		}
		if (!compressor.option("unsafe") || !isPropAccessNode(callee)) {
			return this;
		}
		let key = ast.terserProperty(callee);
		if (isSyntaxNode(key)) {
			key = key._eval(compressor, depth);
			if (typeof key !== "string" && typeof key !== "number") return this;
		}
		let value;
		const object = callee.object;
		if (isUndeclaredRef(object)) {
			if (
				readsUndeclared(
					object.name === "hasOwnProperty" &&
						key === "call" &&
						this.arguments[0],
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
		for (const arg of this.arguments) {
			const argument = arg._eval(compressor, depth);
			if (arg === argument || isLambdaNode(arg)) return this;
			args.push(argument);
		}
		try {
			return /** @type {EXPECTED_ANY} */ (value)[key](...args);
		} catch (_err) {
			return this;
		}
	};
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
 * @param {MinifierModules} modules terser's modules
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
		A.isSymbolRefNode(node) && node.definition().undeclared;

	// is_boolean
	define(A.SyntaxNode, "is_boolean", returnFalse);
	define(
		A.UnaryPrefixNode,
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
		A.BinaryNode,
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
		A.ConditionalNode,
		"is_boolean",
		/**
		 * @this {Node} a conditional
		 * @returns {boolean} whether it yields a boolean
		 */
		function is_boolean() {
			return this.consequent.is_boolean() && this.alternate.is_boolean();
		}
	);
	define(
		A.AssignNode,
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
		A.SequenceNode,
		"is_boolean",
		/**
		 * @this {Node} a sequence
		 * @returns {boolean} whether it yields a boolean
		 */
		function is_boolean() {
			return this.tail_node().is_boolean();
		}
	);
	define(A.TrueNode, "is_boolean", returnTrue);
	define(A.FalseNode, "is_boolean", returnTrue);

	// is_number
	define(A.SyntaxNode, "is_number", returnFalse);
	define(A.NumberNode, "is_number", returnTrue);
	define(
		A.UnaryNode,
		"is_number",
		/**
		 * @this {Node} a unary operation
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a number
		 */
		function is_number(compressor) {
			return (
				NUMERIC_UNARY.has(this.operator) && this.argument.is_number(compressor)
			);
		}
	);
	define(
		A.BinaryNode,
		"is_number",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
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
		A.AssignNode,
		"is_number",
		/**
		 * @this {Node} an assignment
		 * @param {CompressorShape} compressor the compressor
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
		A.SequenceNode,
		"is_number",
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a number
		 */
		function is_number(compressor) {
			return this.tail_node().is_number(compressor);
		}
	);
	define(
		A.ConditionalNode,
		"is_number",
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a number
		 */
		function is_number(compressor) {
			return (
				this.consequent.is_number(compressor) &&
				this.alternate.is_number(compressor)
			);
		}
	);

	// is_bigint
	define(A.SyntaxNode, "is_bigint", returnFalse);
	define(A.BigIntNode, "is_bigint", returnTrue);
	define(
		A.UnaryNode,
		"is_bigint",
		/**
		 * @this {Node} a unary operation
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a BigInt
		 */
		function is_bigint(compressor) {
			return (
				NUMERIC_UNARY.has(this.operator) && this.argument.is_bigint(compressor)
			);
		}
	);
	define(
		A.BinaryNode,
		"is_bigint",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
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
		A.AssignNode,
		"is_bigint",
		/**
		 * @this {Node} an assignment
		 * @param {CompressorShape} compressor the compressor
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
		A.SequenceNode,
		"is_bigint",
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a BigInt
		 */
		function is_bigint(compressor) {
			return this.tail_node().is_bigint(compressor);
		}
	);
	define(
		A.ConditionalNode,
		"is_bigint",
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a BigInt
		 */
		function is_bigint(compressor) {
			return (
				this.consequent.is_bigint(compressor) &&
				this.alternate.is_bigint(compressor)
			);
		}
	);

	// is_number_or_bigint
	define(A.SyntaxNode, "is_number_or_bigint", returnFalse);
	define(A.NumberNode, "is_number_or_bigint", returnTrue);
	define(A.BigIntNode, "is_number_or_bigint", returnTrue);
	define(
		A.UnaryNode,
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
		A.BinaryNode,
		"is_number_or_bigint",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
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
		A.AssignNode,
		"is_number_or_bigint",
		/**
		 * @this {Node} an assignment
		 * @param {CompressorShape} compressor the compressor
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
		A.SequenceNode,
		"is_number_or_bigint",
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a number or a BigInt
		 */
		function is_number_or_bigint(compressor) {
			return this.tail_node().is_number_or_bigint(compressor);
		}
	);
	define(
		A.ConditionalNode,
		"is_number_or_bigint",
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a number or a BigInt
		 */
		function is_number_or_bigint(compressor) {
			return (
				this.consequent.is_number_or_bigint(compressor) &&
				this.alternate.is_number_or_bigint(compressor)
			);
		}
	);

	// is_32_bit_integer
	define(A.SyntaxNode, "is_32_bit_integer", returnFalse);
	define(
		A.NumberNode,
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
		A.UnaryPrefixNode,
		"is_32_bit_integer",
		/**
		 * @this {Node} a prefix operation
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a 32-bit integer
		 */
		function is_32_bit_integer(compressor) {
			if (this.operator === "~") return this.argument.is_number(compressor);
			if (this.operator === "+") {
				return this.argument.is_32_bit_integer(compressor);
			}
			return false;
		}
	);
	define(
		A.BinaryNode,
		"is_32_bit_integer",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
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
	define(A.SyntaxNode, "is_string", returnFalse);
	define(A.StringNode, "is_string", returnTrue);
	define(A.TemplateStringNode, "is_string", returnTrue);
	define(
		A.UnaryPrefixNode,
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
		A.BinaryNode,
		"is_string",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
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
		A.AssignNode,
		"is_string",
		/**
		 * @this {Node} an assignment
		 * @param {CompressorShape} compressor the compressor
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
		A.SequenceNode,
		"is_string",
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a string
		 */
		function is_string(compressor) {
			return this.tail_node().is_string(compressor);
		}
	);
	define(
		A.ConditionalNode,
		"is_string",
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it yields a string
		 */
		function is_string(compressor) {
			return (
				this.consequent.is_string(compressor) &&
				this.alternate.is_string(compressor)
			);
		}
	);

	/**
	 * terser's `is_undefined`.
	 * @param {Node} node an expression
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether it is `undefined`
	 */
	const isUndefined = (node, compressor) =>
		Boolean(hasFlag(node, UNDEFINED)) ||
		A.isUndefinedNode(node) ||
		(A.isUnaryPrefixNode(node) &&
			node.operator === "void" &&
			!node.argument.has_side_effects(compressor));

	/**
	 * terser's `is_nullish`: whether an expression is `null` or `undefined`, or
	 * short-circuits into it through an optional link.
	 * @param {Node} node an expression
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether it is nullish
	 */
	const isNullish = (node, compressor) =>
		isNullOrUndefined(node, compressor) ||
		isNullishShortCircuited(node, compressor);

	/**
	 * @param {Node} node an expression
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether it is explicitly `null` or `undefined`
	 */
	const isNullOrUndefined = (node, compressor) => {
		let fixed;
		return (
			A.isNullNode(node) ||
			isUndefined(node, compressor) ||
			(A.isSymbolRefNode(node) &&
				A.isSyntaxNode((fixed = node.definition().fixed)) &&
				isNullish(fixed, compressor))
		);
	};

	/**
	 * @param {Node} node an expression
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether an optional link in it short-circuits
	 */
	const isNullishShortCircuited = (node, compressor) => {
		if (A.isPropAccessNode(node) || A.isCallNode(node)) {
			const inner = A.isCallNode(node) ? node.callee : node.object;
			return (
				(node.optional && isNullOrUndefined(inner, compressor)) ||
				isNullishShortCircuited(inner, compressor)
			);
		}
		if (A.isChainNode(node)) {
			return isNullishShortCircuited(node.expression, compressor);
		}
		return false;
	};

	/**
	 * @param {(Node | null)[]} list nodes, null for a hole
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether any has effects
	 */
	const anyHasSideEffects = (list, compressor) => {
		for (let i = list.length; --i >= 0;) {
			const item = list[i];
			// A hole, null in an array's list, has none.
			if (item !== null && item.has_side_effects(compressor)) return true;
		}
		return false;
	};

	// has_side_effects
	define(A.SyntaxNode, "has_side_effects", returnTrue);
	define(A.EmptyStatementNode, "has_side_effects", returnFalse);
	define(A.ConstantNode, "has_side_effects", returnFalse);
	define(A.ThisNode, "has_side_effects", returnFalse);
	/**
	 * @this {Node} a node holding a statement list, a case's its `consequent`
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether any statement in it has effects
	 */
	function bodyHasSideEffects(compressor) {
		return anyHasSideEffects(A.bodyOf(this), compressor);
	}
	define(A.BlockNode, "has_side_effects", bodyHasSideEffects);
	define(
		A.CallNode,
		"has_side_effects",
		/**
		 * @this {Node} a call
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			if (
				!this.is_callee_pure(compressor) &&
				(!this.callee.is_call_pure(compressor) ||
					this.callee.has_side_effects(compressor))
			) {
				return true;
			}
			return anyHasSideEffects(this.arguments, compressor);
		}
	);
	define(
		A.SwitchNode,
		"has_side_effects",
		/**
		 * @this {Node} a switch
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.discriminant.has_side_effects(compressor) ||
				anyHasSideEffects(this.cases, compressor)
			);
		}
	);
	define(
		A.CaseNode,
		"has_side_effects",
		/**
		 * @this {Node} a case
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.test.has_side_effects(compressor) ||
				anyHasSideEffects(this.consequent, compressor)
			);
		}
	);
	define(
		A.TryNode,
		"has_side_effects",
		/**
		 * @this {Node} a try statement
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.block.has_side_effects(compressor) ||
				(this.handler && this.handler.has_side_effects(compressor)) ||
				(this.finalizer && this.finalizer.has_side_effects(compressor))
			);
		}
	);
	define(
		A.IfNode,
		"has_side_effects",
		/**
		 * @this {Node} an if statement
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.test.has_side_effects(compressor) ||
				(this.consequent && this.consequent.has_side_effects(compressor)) ||
				(this.alternate && this.alternate.has_side_effects(compressor))
			);
		}
	);
	define(A.ImportMetaNode, "has_side_effects", returnFalse);
	define(
		A.DynamicImportNode,
		"has_side_effects",
		/**
		 * @this {Node} a dynamic import
		 * @returns {boolean} whether it has effects: `import.source()` compiles only
		 */
		function has_side_effects() {
			return this.phase !== "source";
		}
	);
	define(
		A.LabeledStatementNode,
		"has_side_effects",
		/**
		 * @this {Node} a labeled statement
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its body has effects
		 */
		function has_side_effects(compressor) {
			return this.body.has_side_effects(compressor);
		}
	);
	define(
		A.SimpleStatementNode,
		"has_side_effects",
		/**
		 * @this {Node} an expression statement
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its expression has effects
		 */
		function has_side_effects(compressor) {
			return this.expression.has_side_effects(compressor);
		}
	);
	define(A.LambdaNode, "has_side_effects", returnFalse);
	define(
		A.ClassNode,
		"has_side_effects",
		/**
		 * @this {Node} a class
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether defining it has effects
		 */
		function has_side_effects(compressor) {
			if (this.superClass && this.superClass.has_side_effects(compressor)) {
				return true;
			}
			return anyHasSideEffects(this.body.body, compressor);
		}
	);
	define(A.ClassStaticBlockNode, "has_side_effects", bodyHasSideEffects);
	define(
		A.BinaryNode,
		"has_side_effects",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.left.has_side_effects(compressor) ||
				this.right.has_side_effects(compressor)
			);
		}
	);
	define(A.AssignNode, "has_side_effects", returnTrue);
	define(
		A.ConditionalNode,
		"has_side_effects",
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				this.test.has_side_effects(compressor) ||
				this.consequent.has_side_effects(compressor) ||
				this.alternate.has_side_effects(compressor)
			);
		}
	);
	define(
		A.UnaryNode,
		"has_side_effects",
		/**
		 * @this {Node} a unary operation
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return (
				UNARY_SIDE_EFFECTS.has(this.operator) ||
				this.argument.has_side_effects(compressor)
			);
		}
	);
	define(
		A.SymbolRefNode,
		"has_side_effects",
		/**
		 * @this {Node} a reference
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether reading it may throw a ReferenceError
		 */
		function has_side_effects(compressor) {
			return (
				!this.is_declared(compressor) &&
				!purePropertyAccessGlobals.has(this.name)
			);
		}
	);
	define(A.SymbolClassPropertyNode, "has_side_effects", returnFalse);
	define(A.SymbolDeclarationNode, "has_side_effects", returnFalse);
	define(
		A.ObjectNode,
		"has_side_effects",
		/**
		 * @this {Node} an object literal
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether building it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.properties, compressor);
		}
	);
	define(
		A.ObjectKeyValNode,
		"has_side_effects",
		/**
		 * @this {Node} a property
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its key or value has effects
		 */
		function has_side_effects(compressor) {
			return (
				(this.computed && this.key.has_side_effects(compressor)) ||
				(this.value && this.value.has_side_effects(compressor))
			);
		}
	);
	/**
	 * @this {Node} a class field
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether its key or static value has effects
	 */
	function fieldHasSideEffects(compressor) {
		return (
			(this.computed && this.key.has_side_effects(compressor)) ||
			(this.static && this.value && this.value.has_side_effects(compressor))
		);
	}
	define(A.ClassPropertyNode, "has_side_effects", fieldHasSideEffects);
	define(A.ClassPrivatePropertyNode, "has_side_effects", fieldHasSideEffects);
	/**
	 * @this {Node} a method or accessor
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether its key has effects
	 */
	function keyHasSideEffects(compressor) {
		return this.computed && this.key.has_side_effects(compressor);
	}
	for (const Type of [
		A.PrivateMethodNode,
		A.PrivateGetterNode,
		A.PrivateSetterNode,
		A.ConciseMethodNode,
		A.ObjectGetterNode,
		A.ObjectSetterNode
	]) {
		define(Type, "has_side_effects", keyHasSideEffects);
	}
	define(
		A.ArrayNode,
		"has_side_effects",
		/**
		 * @this {Node} an array literal
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether building it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.elements, compressor);
		}
	);
	define(
		A.DotNode,
		"has_side_effects",
		/**
		 * @this {Node} a property read
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether reading it has effects
		 */
		function has_side_effects(compressor) {
			if (isNullish(this, compressor)) {
				return this.object.has_side_effects(compressor);
			}
			if (!this.optional && this.object.may_throw_on_access(compressor)) {
				return true;
			}
			return this.object.has_side_effects(compressor);
		}
	);
	define(
		A.SubNode,
		"has_side_effects",
		/**
		 * @this {Node} a computed property read
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether reading it has effects
		 */
		function has_side_effects(compressor) {
			if (isNullish(this, compressor)) {
				return this.object.has_side_effects(compressor);
			}
			if (!this.optional && this.object.may_throw_on_access(compressor)) {
				return true;
			}
			const property = this.property.has_side_effects(compressor);
			// `?.` makes the property's effects conditional.
			if (property && this.optional) return true;
			return property || this.object.has_side_effects(compressor);
		}
	);
	define(
		A.ChainNode,
		"has_side_effects",
		/**
		 * @this {Node} an optional chain
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it has effects
		 */
		function has_side_effects(compressor) {
			return this.expression.has_side_effects(compressor);
		}
	);
	define(
		A.SequenceNode,
		"has_side_effects",
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether any expression in it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.expressions, compressor);
		}
	);
	define(
		A.DefinitionsNode,
		"has_side_effects",
		/**
		 * @this {Node} a declaration
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether any definition in it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.declarations, compressor);
		}
	);
	define(
		A.VarDefNode,
		"has_side_effects",
		/**
		 * @this {Node} a definition
		 * @returns {boolean} whether it assigns a value
		 */
		function has_side_effects() {
			return this.init !== null && this.init !== undefined;
		}
	);
	define(A.TemplateSegmentNode, "has_side_effects", returnFalse);
	define(
		A.TemplateStringNode,
		"has_side_effects",
		/**
		 * @this {Node} a template string
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether any part of it has effects
		 */
		function has_side_effects(compressor) {
			return anyHasSideEffects(this.segments, compressor);
		}
	);

	/**
	 * @param {(Node | null)[]} list nodes, null for a hole
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether any may throw
	 */
	const anyMayThrow = (list, compressor) => {
		for (let i = list.length; --i >= 0;) {
			const item = list[i];
			// A hole, null in an array's list, cannot throw.
			if (item !== null && item.may_throw(compressor)) return true;
		}
		return false;
	};

	// may_throw
	define(A.SyntaxNode, "may_throw", returnTrue);
	define(A.ConstantNode, "may_throw", returnFalse);
	define(A.EmptyStatementNode, "may_throw", returnFalse);
	define(A.LambdaNode, "may_throw", returnFalse);
	define(A.SymbolDeclarationNode, "may_throw", returnFalse);
	define(A.ThisNode, "may_throw", returnFalse);
	define(A.ImportMetaNode, "may_throw", returnFalse);
	define(
		A.ClassNode,
		"may_throw",
		/**
		 * @this {Node} a class
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether defining it may throw
		 */
		function may_throw(compressor) {
			if (this.superClass && this.superClass.may_throw(compressor)) return true;
			return anyMayThrow(this.body.body, compressor);
		}
	);
	/**
	 * @this {Node} a node holding a statement list, a case's its `consequent`
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether any statement in it may throw
	 */
	function bodyMayThrow(compressor) {
		return anyMayThrow(A.bodyOf(this), compressor);
	}
	define(A.ClassStaticBlockNode, "may_throw", bodyMayThrow);
	define(
		A.ArrayNode,
		"may_throw",
		/**
		 * @this {Node} an array literal
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether building it may throw
		 */
		function may_throw(compressor) {
			return anyMayThrow(this.elements, compressor);
		}
	);
	define(
		A.AssignNode,
		"may_throw",
		/**
		 * @this {Node} an assignment
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			if (this.right.may_throw(compressor)) return true;
			if (
				!compressor.has_directive("use strict") &&
				this.operator === "=" &&
				A.isSymbolRefNode(this.left)
			) {
				return false;
			}
			return this.left.may_throw(compressor);
		}
	);
	define(
		A.BinaryNode,
		"may_throw",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.left.may_throw(compressor) || this.right.may_throw(compressor)
			);
		}
	);
	define(A.BlockNode, "may_throw", bodyMayThrow);
	define(
		A.CallNode,
		"may_throw",
		/**
		 * @this {Node} a call
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			if (isNullish(this, compressor)) return false;
			if (anyMayThrow(this.arguments, compressor)) return true;
			if (this.is_callee_pure(compressor)) return false;
			if (this.callee.may_throw(compressor)) return true;
			return (
				!A.isLambdaNode(this.callee) ||
				anyMayThrow(this.callee.body.body, compressor)
			);
		}
	);
	define(
		A.CaseNode,
		"may_throw",
		/**
		 * @this {Node} a case
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.test.may_throw(compressor) ||
				anyMayThrow(this.consequent, compressor)
			);
		}
	);
	define(
		A.ConditionalNode,
		"may_throw",
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.test.may_throw(compressor) ||
				this.consequent.may_throw(compressor) ||
				this.alternate.may_throw(compressor)
			);
		}
	);
	define(
		A.DefinitionsNode,
		"may_throw",
		/**
		 * @this {Node} a declaration
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether any definition in it may throw
		 */
		function may_throw(compressor) {
			return anyMayThrow(this.declarations, compressor);
		}
	);
	define(
		A.IfNode,
		"may_throw",
		/**
		 * @this {Node} an if statement
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.test.may_throw(compressor) ||
				(this.consequent && this.consequent.may_throw(compressor)) ||
				(this.alternate && this.alternate.may_throw(compressor))
			);
		}
	);
	define(
		A.LabeledStatementNode,
		"may_throw",
		/**
		 * @this {Node} a labeled statement
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its body may throw
		 */
		function may_throw(compressor) {
			return this.body.may_throw(compressor);
		}
	);
	define(
		A.ObjectNode,
		"may_throw",
		/**
		 * @this {Node} an object literal
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether building it may throw
		 */
		function may_throw(compressor) {
			return anyMayThrow(this.properties, compressor);
		}
	);
	define(
		A.ObjectKeyValNode,
		"may_throw",
		/**
		 * terser's grouping, kept: the key's check decides only whether the value
		 * is asked.
		 * @this {Node} a property
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (this.computed && this.key.may_throw(compressor)) || this.value
				? this.value.may_throw(compressor)
				: false;
		}
	);
	/**
	 * @this {Node} a class field
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether its key or static value may throw
	 */
	function fieldMayThrow(compressor) {
		return (
			(this.computed && this.key.may_throw(compressor)) ||
			(this.static && this.value && this.value.may_throw(compressor))
		);
	}
	define(A.ClassPropertyNode, "may_throw", fieldMayThrow);
	define(A.ClassPrivatePropertyNode, "may_throw", fieldMayThrow);
	/**
	 * @this {Node} a method or accessor
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether its key may throw
	 */
	function keyMayThrow(compressor) {
		return this.computed && this.key.may_throw(compressor);
	}
	define(A.ConciseMethodNode, "may_throw", keyMayThrow);
	define(A.ObjectGetterNode, "may_throw", keyMayThrow);
	define(A.ObjectSetterNode, "may_throw", keyMayThrow);
	define(A.PrivateMethodNode, "may_throw", returnFalse);
	define(A.PrivateGetterNode, "may_throw", returnFalse);
	define(A.PrivateSetterNode, "may_throw", returnFalse);
	define(
		A.ReturnNode,
		"may_throw",
		/**
		 * @this {Node} a return
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its value may throw
		 */
		function may_throw(compressor) {
			return this.argument && this.argument.may_throw(compressor);
		}
	);
	define(
		A.SequenceNode,
		"may_throw",
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether any expression in it may throw
		 */
		function may_throw(compressor) {
			return anyMayThrow(this.expressions, compressor);
		}
	);
	define(
		A.SimpleStatementNode,
		"may_throw",
		/**
		 * @this {Node} an expression statement
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its expression may throw
		 */
		function may_throw(compressor) {
			return this.expression.may_throw(compressor);
		}
	);
	define(
		A.DotNode,
		"may_throw",
		/**
		 * @this {Node} a property read
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether reading it may throw
		 */
		function may_throw(compressor) {
			if (isNullish(this, compressor)) return false;
			return (
				(!this.optional && this.object.may_throw_on_access(compressor)) ||
				this.object.may_throw(compressor)
			);
		}
	);
	define(
		A.SubNode,
		"may_throw",
		/**
		 * @this {Node} a computed property read
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether reading it may throw
		 */
		function may_throw(compressor) {
			if (isNullish(this, compressor)) return false;
			return (
				(!this.optional && this.object.may_throw_on_access(compressor)) ||
				this.object.may_throw(compressor) ||
				this.property.may_throw(compressor)
			);
		}
	);
	define(
		A.ChainNode,
		"may_throw",
		/**
		 * @this {Node} an optional chain
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return this.expression.may_throw(compressor);
		}
	);
	define(
		A.SwitchNode,
		"may_throw",
		/**
		 * @this {Node} a switch
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return (
				this.discriminant.may_throw(compressor) ||
				anyMayThrow(this.cases, compressor)
			);
		}
	);
	define(
		A.SymbolRefNode,
		"may_throw",
		/**
		 * @this {Node} a reference
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether reading it may throw a ReferenceError
		 */
		function may_throw(compressor) {
			return (
				!this.is_declared(compressor) &&
				!purePropertyAccessGlobals.has(this.name)
			);
		}
	);
	define(A.SymbolClassPropertyNode, "may_throw", returnFalse);
	define(
		A.TryNode,
		"may_throw",
		/**
		 * terser's grouping, kept: a catch decides alone, else the body or finally.
		 * @this {Node} a try statement
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			return this.handler
				? this.handler.may_throw(compressor)
				: this.block.may_throw(compressor) ||
						(this.finalizer && this.finalizer.may_throw(compressor));
		}
	);
	define(
		A.UnaryNode,
		"may_throw",
		/**
		 * @this {Node} a unary operation
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether it may throw
		 */
		function may_throw(compressor) {
			if (this.operator === "typeof" && A.isSymbolRefNode(this.argument)) {
				return false;
			}
			return this.argument.may_throw(compressor);
		}
	);
	define(
		A.VarDefNode,
		"may_throw",
		/**
		 * @this {Node} a definition
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its value may throw
		 */
		function may_throw(compressor) {
			if (!this.init) return false;
			return this.init.may_throw(compressor);
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
			if (A.isSymbolRefNode(node)) {
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
			if (A.isThisNode(node) && A.isArrowNode(this)) {
				result = false;
				return walkAbort;
			}
		});
		return result;
	}

	// is_constant_expression
	define(A.SyntaxNode, "is_constant_expression", returnFalse);
	define(A.ConstantNode, "is_constant_expression", returnTrue);
	define(
		A.ClassNode,
		"is_constant_expression",
		/**
		 * @this {Node} a class
		 * @param {Scope=} scope the scope it would move to
		 * @returns {boolean | "f"} whether it is constant
		 */
		function is_constant_expression(scope) {
			if (this.superClass && !this.superClass.is_constant_expression(scope)) {
				return false;
			}
			for (const property of this.body.body) {
				if (property.computed && !property.key.is_constant_expression(scope)) {
					return false;
				}
				if (
					property.static &&
					property.value &&
					!property.value.is_constant_expression(scope)
				) {
					return false;
				}
				if (A.isClassStaticBlockNode(property)) return false;
			}
			return allRefsLocal.call(this, scope);
		}
	);
	define(A.LambdaNode, "is_constant_expression", allRefsLocal);
	define(
		A.UnaryNode,
		"is_constant_expression",
		/**
		 * @this {Node} a unary operation
		 * @returns {boolean | "f"} whether it is constant
		 */
		function is_constant_expression() {
			return this.argument.is_constant_expression();
		}
	);
	define(
		A.BinaryNode,
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
		A.ArrayNode,
		"is_constant_expression",
		/**
		 * @this {Node} an array literal
		 * @returns {boolean} whether it is constant
		 */
		function is_constant_expression() {
			return this.elements.every(
				(/** @type {Node | null} */ element) =>
					element === null || element.is_constant_expression()
			);
		}
	);
	define(
		A.ObjectNode,
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
		A.ObjectPropertyNode,
		"is_constant_expression",
		/**
		 * @this {Node} a property
		 * @returns {boolean} whether it is constant
		 */
		function is_constant_expression() {
			return Boolean(
				!A.isSyntaxNode(A.terserKey(this.key)) &&
				this.value &&
				this.value.is_constant_expression()
			);
		}
	);

	/**
	 * @this {Node} an expression
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether reading a property of it may throw
	 */
	A.SyntaxNode.prototype.may_throw_on_access = function may_throw_on_access(
		compressor
	) {
		return !compressor.option("pure_getters") || this._dot_throw(compressor);
	};
	/**
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether `pure_getters` is "strict"
	 */
	const isStrict = (compressor) =>
		/strict/.test(compressor.option("pure_getters"));

	// _dot_throw
	define(A.SyntaxNode, "_dot_throw", isStrict);
	define(A.NullNode, "_dot_throw", returnTrue);
	define(A.UndefinedNode, "_dot_throw", returnTrue);
	define(A.ConstantNode, "_dot_throw", returnFalse);
	define(A.ArrayNode, "_dot_throw", returnFalse);
	define(
		A.ObjectNode,
		"_dot_throw",
		/**
		 * @this {Node} an object literal
		 * @param {CompressorShape} compressor the compressor
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
	define(A.ClassNode, "_dot_throw", returnFalse);
	define(A.ObjectPropertyNode, "_dot_throw", returnFalse);
	define(A.ObjectGetterNode, "_dot_throw", returnTrue);
	define(
		A.ExpansionNode,
		"_dot_throw",
		/**
		 * @this {Node} a spread
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether what it spreads may throw on access
		 */
		function _dot_throw(compressor) {
			return this.argument._dot_throw(compressor);
		}
	);
	define(A.FunctionNode, "_dot_throw", returnFalse);
	define(A.ArrowNode, "_dot_throw", returnFalse);
	define(A.UnaryPostfixNode, "_dot_throw", returnFalse);
	define(
		A.UnaryPrefixNode,
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
		A.BinaryNode,
		"_dot_throw",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
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
		A.AssignNode,
		"_dot_throw",
		/**
		 * @this {Node} an assignment
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether the value it yields may throw on access
		 */
		function _dot_throw(compressor) {
			if (this.logical) return true;
			return this.operator === "=" && this.right._dot_throw(compressor);
		}
	);
	define(
		A.ConditionalNode,
		"_dot_throw",
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether either branch may throw on access
		 */
		function _dot_throw(compressor) {
			return (
				this.consequent._dot_throw(compressor) ||
				this.alternate._dot_throw(compressor)
			);
		}
	);
	define(
		A.DotNode,
		"_dot_throw",
		/**
		 * @this {Node} a property read
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether the value read may throw on access
		 */
		function _dot_throw(compressor) {
			if (!isStrict(compressor)) return false;
			if (this.property.name === "prototype") {
				return !(A.isFunctionNode(this.object) || A.isClassNode(this.object));
			}
			return true;
		}
	);
	define(
		A.ChainNode,
		"_dot_throw",
		/**
		 * @this {Node} an optional chain
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its value may throw on access
		 */
		function _dot_throw(compressor) {
			return this.expression._dot_throw(compressor);
		}
	);
	define(
		A.SequenceNode,
		"_dot_throw",
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its value may throw on access
		 */
		function _dot_throw(compressor) {
			return this.tail_node()._dot_throw(compressor);
		}
	);
	define(
		A.SymbolRefNode,
		"_dot_throw",
		/**
		 * @this {Node} a reference
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean} whether its value may throw on access
		 */
		function _dot_throw(compressor) {
			if (this.name === "arguments" && A.isLambdaNode(this.scope)) {
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
		makeNode(A.UnaryPrefixNode, expression, {
			operator: "!",
			argument: expression
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
			const statement = makeNode(A.SimpleStatementNode, alternative, {
				expression: alternative
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
	define(A.SyntaxNode, "negate", negateBasic);
	define(
		A.StatementNode,
		"negate",
		/**
		 * @returns {never} never: a statement has no value to negate
		 */
		() => {
			throw new Error("Cannot negate a statement");
		}
	);
	define(A.FunctionNode, "negate", negateBasic);
	define(A.ClassNode, "negate", negateBasic);
	define(A.ArrowNode, "negate", negateBasic);
	define(
		A.UnaryPrefixNode,
		"negate",
		/**
		 * @this {Node} a prefix operation
		 * @returns {Node} its negation
		 */
		function negate() {
			if (this.operator === "!") return this.argument;
			return basicNegation(this);
		}
	);
	define(
		A.SequenceNode,
		"negate",
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
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
		A.ConditionalNode,
		"negate",
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node} its negation
		 */
		function negate(compressor, firstInStatement) {
			const self = this.clone();
			self.consequent = self.consequent.negate(compressor);
			self.alternate = self.alternate.negate(compressor);
			return bestNegation(this, self, firstInStatement);
		}
	);
	define(
		A.BinaryNode,
		"negate",
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
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
		makeNode(A.UnaryPrefixNode, expression, {
			operator: "~",
			argument: expression
		});

	// bitwise_negate
	define(
		A.SyntaxNode,
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
		A.NumberNode,
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
			return makeNode(A.NumberNode, this, { value: negated });
		}
	);
	define(
		A.UnaryPrefixNode,
		"bitwise_negate",
		/**
		 * @this {Node} a prefix operation
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} in32BitContext whether its value is read as 32 bits
		 * @returns {Node} its complement
		 */
		function bitwise_negate(compressor, in32BitContext) {
			if (
				this.operator === "~" &&
				(this.argument.is_32_bit_integer(compressor) ||
					(in32BitContext !== null && in32BitContext !== undefined
						? in32BitContext
						: compressor.in_32_bit_context()))
			) {
				return this.argument;
			}
			return basicBitwiseNegation(this);
		}
	);

	/**
	 * @this {Node} a call
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether the function it calls is pure
	 */
	A.CallNode.prototype.is_callee_pure = function is_callee_pure(compressor) {
		if (compressor.option("unsafe")) {
			const expression = this.callee;
			const inner = A.expressionOf(expression);
			let firstArgument;
			if (
				A.isSymbolNode(inner) &&
				inner.name === "hasOwnProperty" &&
				((firstArgument =
					this.arguments &&
					this.arguments[0] &&
					this.arguments[0].evaluate(compressor)) === null ||
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
		if (A.isNewNode(this) && compressor.option("pure_new")) return true;
		if (compressor.option("side_effects") && hasAnnotation(this, _PURE)) {
			return true;
		}
		return !compressor.pure_funcs(this);
	};

	define(A.SyntaxNode, "is_call_pure", returnFalse);
	define(
		A.DotNode,
		"is_call_pure",
		/**
		 * @this {Node} a method read
		 * @param {CompressorShape} compressor the compressor
		 * @returns {boolean | undefined} whether calling it is pure
		 */
		function is_call_pure(compressor) {
			if (!compressor.option("unsafe")) return;
			const expression = this.object;
			let nativeObject;
			if (A.isArrayNode(expression)) {
				nativeObject = "Array";
			} else if (expression.is_boolean()) {
				nativeObject = "Boolean";
			} else if (expression.is_number(compressor)) {
				nativeObject = "Number";
			} else if (A.isRegExpNode(expression)) {
				nativeObject = "RegExp";
			} else if (expression.is_string(compressor)) {
				nativeObject = "String";
			} else if (!this.may_throw_on_access(compressor)) {
				nativeObject = "Object";
			}
			return (
				nativeObject !== undefined &&
				compressor.is_pure_native_method(nativeObject, this.property.name)
			);
		}
	);

	/**
	 * @param {Node | null | undefined} thing a statement
	 * @returns {Node | null | undefined} what ends it, if it always ends
	 */
	const statementAborts = (thing) => thing && thing.aborts();
	/**
	 * @param {Node[]} statements a statement list
	 * @returns {Node | null} the statement that ends it, if one does
	 */
	const listAborts = (statements) => {
		for (let i = 0; i < statements.length; i++) {
			if (statementAborts(statements[i])) return statements[i];
		}
		return null;
	};
	/**
	 * @this {Node} a block
	 * @returns {Node | null} the statement that ends it, if one does
	 */
	function blockAborts() {
		return listAborts(this.body);
	}

	// aborts
	/**
	 * @returns {null} null
	 */
	const returnNull = () => null;
	define(A.StatementNode, "aborts", returnNull);
	define(
		A.JumpNode,
		"aborts",
		/**
		 * @this {Node} a jump
		 * @returns {Node} itself
		 */
		function aborts() {
			return this;
		}
	);
	define(A.ImportNode, "aborts", returnNull);
	define(A.BlockStatementNode, "aborts", blockAborts);
	define(
		A.SwitchBranchNode,
		"aborts",
		/**
		 * @this {Node} a case or default
		 * @returns {Node | null} the statement that ends it, if one does
		 */
		function aborts() {
			return listAborts(this.consequent);
		}
	);
	define(
		A.DefClassNode,
		"aborts",
		/**
		 * @this {Node} a class declaration
		 * @returns {Node | null} the static block that ends it, if one does
		 */
		function aborts() {
			for (const property of this.body.body) {
				if (A.isClassStaticBlockNode(property) && property.aborts()) {
					return property;
				}
			}
			return null;
		}
	);
	define(A.ClassStaticBlockNode, "aborts", blockAborts);
	define(
		A.IfNode,
		"aborts",
		/**
		 * @this {Node} an if statement
		 * @returns {Node | null | false | undefined} itself, where both branches end
		 */
		function aborts() {
			return (
				this.alternate &&
				statementAborts(this.consequent) &&
				statementAborts(this.alternate) &&
				this
			);
		}
	);

	/**
	 * @this {Node} a node
	 * @returns {boolean} whether it reads `this` outside a nested function
	 */
	A.SyntaxNode.prototype.contains_this = function contains_this() {
		return walk(this, (/** @type {Node} */ node) => {
			if (A.isThisNode(node)) return walkAbort;
			if (node !== this && A.isScopeNode(node) && !A.isArrowNode(node)) {
				return true;
			}
		});
	};
};

/**
 * Installs webpack's `drop_side_effect_free`: what is left of an expression
 * whose value nobody reads, or null when nothing is.
 * @param {MinifierModules} modules terser's modules
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
	 * @param {(Node | null)[]} nodes the expressions, null for a hole
	 * @param {CompressorShape} compressor the compressor
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
			const item = nodes[i];
			// A hole is dropped, as terser's hole node was.
			const node =
				item === null
					? null
					: item.drop_side_effect_free(compressor, firstInStatement);
			if (node !== item || item === null) changed = true;
			if (node) {
				kept.push(node);
				firstInStatement = false;
			}
		}
		// Unchanged, so the list holds no hole.
		if (!changed) return /** @type {Node[]} */ (nodes);
		return kept.length ? kept : null;
	};

	define(
		A.SyntaxNode,
		/**
		 * @this {Node} an expression
		 * @returns {Node} itself
		 */
		function drop_side_effect_free() {
			return this;
		}
	);
	define(A.ConstantNode, returnNull);
	define(A.ThisNode, returnNull);
	define(
		A.CallNode,
		/**
		 * @this {Node} a call
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (isNullishShortCircuited(this, compressor)) {
				return this.callee.drop_side_effect_free(compressor, firstInStatement);
			}
			if (!this.is_callee_pure(compressor)) {
				if (this.callee.is_call_pure(compressor)) {
					const kept = trim(
						[this.callee.object, ...this.arguments],
						compressor,
						firstInStatement
					);
					return kept && makeSequence(this, kept);
				}
				if (
					isFunctionExpression(this.callee) &&
					(!this.callee.id || !this.callee.id.definition().references.length)
				) {
					// A shallow clone: the callee itself is what drops its value.
					const node = this.clone();
					node.callee.process_expression(false, compressor);
					return node;
				}
				return this;
			}
			const args = trim(this.arguments, compressor, firstInStatement);
			return args && makeSequence(this, args);
		}
	);
	define(
		A.DynamicImportNode,
		/**
		 * @this {Node} a dynamic import
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (this.phase !== "source") return this;
			const args = trim(this.args, compressor, firstInStatement);
			return args && makeSequence(this, args);
		}
	);
	define(A.AccessorNode, returnNull);
	define(A.FunctionNode, returnNull);
	define(A.ArrowNode, returnNull);
	define(
		A.ClassNode,
		/**
		 * @this {Node} a class
		 * @param {CompressorShape} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			/** @type {Node[]} */
			const withEffects = [];
			if (this.is_self_referential() && this.has_side_effects(compressor)) {
				return this;
			}
			const trimmedExtends =
				this.superClass && this.superClass.drop_side_effect_free(compressor);
			if (trimmedExtends) withEffects.push(trimmedExtends);
			for (const property of this.body.body) {
				if (A.isClassStaticBlockNode(property)) {
					if (property.has_side_effects(compressor)) return this;
				} else {
					const trimmed = property.drop_side_effect_free(compressor);
					if (trimmed) withEffects.push(trimmed);
				}
			}
			if (!withEffects.length) return null;
			const expressions = makeSequence(this, withEffects);
			if (A.isDefClassNode(this)) {
				return makeNode(A.SimpleStatementNode, this, {
					expression: expressions
				});
			}
			return expressions;
		}
	);
	/**
	 * @this {Node} a class field
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node | null} what is left of its key and static value
	 */
	function dropField(compressor) {
		const key = this.computed && this.key.drop_side_effect_free(compressor);
		const value =
			this.static && this.value && this.value.drop_side_effect_free(compressor);
		if (key && value) return makeSequence(this, [key, value]);
		return key || value || null;
	}
	define(A.ClassPropertyNode, dropField);
	define(A.ClassPrivatePropertyNode, dropField);
	define(
		A.BinaryNode,
		/**
		 * @this {Node} a binary operation
		 * @param {CompressorShape} compressor the compressor
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
		A.AssignNode,
		/**
		 * @this {Node} an assignment
		 * @param {CompressorShape} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			if (this.logical) return this;
			let left = this.left;
			if (
				left.has_side_effects(compressor) ||
				(compressor.has_directive("use strict") &&
					A.isPropAccessNode(left) &&
					left.object.is_constant())
			) {
				return this;
			}
			setFlag(this, WRITE_ONLY);
			while (A.isPropAccessNode(left)) left = left.object;
			if (left.is_constant_expression(compressor.find_parent(A.isScopeNode))) {
				return this.right.drop_side_effect_free(compressor);
			}
			return this;
		}
	);
	define(
		A.ConditionalNode,
		/**
		 * @this {Node} a conditional
		 * @param {CompressorShape} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			const consequent = this.consequent.drop_side_effect_free(compressor);
			const alternative = this.alternate.drop_side_effect_free(compressor);
			if (consequent === this.consequent && alternative === this.alternate) {
				return this;
			}
			if (!consequent) {
				return alternative
					? makeNode(A.BinaryNode, this, {
							operator: "||",
							left: this.test,
							right: alternative
						})
					: this.test.drop_side_effect_free(compressor);
			}
			if (!alternative) {
				return makeNode(A.BinaryNode, this, {
					operator: "&&",
					left: this.test,
					right: consequent
				});
			}
			const node = this.clone();
			node.consequent = consequent;
			node.alternate = alternative;
			return node;
		}
	);
	define(
		A.UnaryNode,
		/**
		 * @this {Node} a unary operation
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (UNARY_SIDE_EFFECTS.has(this.operator)) {
				if (this.argument.has_side_effects(compressor)) {
					clearFlag(this, WRITE_ONLY);
				} else {
					setFlag(this, WRITE_ONLY);
				}
				return this;
			}
			if (this.operator === "typeof" && A.isSymbolRefNode(this.argument)) {
				return null;
			}
			const expression = this.argument.drop_side_effect_free(
				compressor,
				firstInStatement
			);
			if (firstInStatement && expression && isIifeCall(expression)) {
				if (expression === this.argument && this.operator === "!") {
					return this;
				}
				return expression.negate(compressor, firstInStatement);
			}
			return expression;
		}
	);
	define(
		A.SymbolRefNode,
		/**
		 * @this {Node} a reference
		 * @param {CompressorShape} compressor the compressor
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
		A.ObjectNode,
		/**
		 * @this {Node} an object literal
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			const values = trim(this.properties, compressor, firstInStatement);
			return values && makeSequence(this, values);
		}
	);
	define(
		A.ObjectKeyValNode,
		/**
		 * @this {Node} a property
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left of its key and value
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			const key =
				this.computed &&
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {boolean=} firstInStatement whether it starts a statement
	 * @returns {Node | null} what is left of its key
	 */
	function dropMethod(compressor, firstInStatement) {
		return this.computed
			? this.key.drop_side_effect_free(compressor, firstInStatement)
			: null;
	}
	define(A.ConciseMethodNode, dropMethod);
	define(A.ObjectGetterNode, dropMethod);
	define(A.ObjectSetterNode, dropMethod);
	define(A.PrivateMethodNode, returnNull);
	define(A.PrivateGetterNode, returnNull);
	define(A.PrivateSetterNode, returnNull);
	define(
		A.ArrayNode,
		/**
		 * @this {Node} an array literal
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			const values = trim(this.elements, compressor, firstInStatement);
			return values && makeSequence(this, values);
		}
	);
	define(
		A.DotNode,
		/**
		 * @this {Node} a property read
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (
				!isNullishShortCircuited(this, compressor) &&
				!this.optional &&
				this.object.may_throw_on_access(compressor)
			) {
				return this;
			}
			return this.object.drop_side_effect_free(compressor, firstInStatement);
		}
	);
	define(
		A.SubNode,
		/**
		 * @this {Node} a computed property read
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			if (isNullishShortCircuited(this, compressor)) {
				return this.object.drop_side_effect_free(compressor, firstInStatement);
			}
			if (!this.optional && this.object.may_throw_on_access(compressor)) {
				return this;
			}
			const property = this.property.drop_side_effect_free(compressor);
			if (property && this.optional) return this;
			const expression = this.object.drop_side_effect_free(
				compressor,
				firstInStatement
			);
			if (expression && property) {
				return makeSequence(this, [expression, property]);
			}
			return expression || property;
		}
	);
	define(
		A.ChainNode,
		/**
		 * @this {Node} an optional chain
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left of its expression
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			return this.expression.drop_side_effect_free(
				compressor,
				firstInStatement
			);
		}
	);
	define(
		A.SequenceNode,
		/**
		 * @this {Node} a sequence
		 * @param {CompressorShape} compressor the compressor
		 * @returns {Node | null} what is left
		 */
		function drop_side_effect_free(compressor) {
			const last = this.tail_node();
			const expression = last.drop_side_effect_free(compressor);
			if (expression === last) return this;
			const expressions = this.expressions.slice(0, -1);
			if (expression) expressions.push(expression);
			if (!expressions.length) {
				return makeNode(A.NumberNode, this, { value: 0 });
			}
			return makeSequence(this, expressions);
		}
	);
	define(
		A.ExpansionNode,
		/**
		 * @this {Node} a spread
		 * @param {CompressorShape} compressor the compressor
		 * @param {boolean=} firstInStatement whether it starts a statement
		 * @returns {Node | null} what is left of what it spreads
		 */
		function drop_side_effect_free(compressor, firstInStatement) {
			return this.argument.drop_side_effect_free(compressor, firstInStatement);
		}
	);
	define(A.TemplateSegmentNode, returnNull);
	define(
		A.TemplateStringNode,
		/**
		 * terser hands its segments a truthy `first_in_statement`, kept here.
		 * @this {Node} a template string
		 * @param {CompressorShape} compressor the compressor
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
 * @param {MinifierModules} modules terser's modules
 * @returns {{ tightenBody: OptimizerHelpers["tightenBody"], extractFromUnreachableCode: OptimizerHelpers["extractFromUnreachableCode"] }} terser's `tighten_body` and `extract_from_unreachable_code`
 */
const createTightenBody = (modules) => {
	const { ast, common, flags, inference, nativeObjects, utils } = modules;
	const {
		ArrayNode,
		isArrowNode,
		AssignNode,
		isAssignNode,
		isAwaitNode,
		isBinaryNode,
		isBlockNode,
		BlockStatementNode,
		isBlockStatementNode,
		isBreakNode,
		isCallNode,
		isCaseNode,
		isChainNode,
		isClassNode,
		isConditionalNode,
		isConstantNode,
		isContinueNode,
		isDebuggerNode,
		isDefaultNode,
		isDefinitionsNode,
		isDefinitionsLikeNode,
		isDefunNode,
		isDestructuringNode,
		isDirectiveNode,
		isDotNode,
		isDWLoopNode,
		EmptyStatementNode,
		isEmptyStatementNode,
		isExitNode,
		isExpansionNode,
		isExportNode,
		isForNode,
		isForInNode,
		IfNode,
		isIfNode,
		isImportNode,
		isIterationStatementNode,
		isLambdaNode,
		isLoopControlNode,
		isSyntaxNode,
		NumberNode,
		isObjectNode,
		ObjectKeyValNode,
		isObjectPropertyNode,
		isPropAccessNode,
		isRegExpNode,
		ReturnNode,
		isReturnNode,
		isScopeNode,
		SequenceNode,
		isSequenceNode,
		SimpleStatementNode,
		isSimpleStatementNode,
		isSubNode,
		isSwitchNode,
		isSymbolNode,
		isSymbolConstNode,
		isSymbolDeclarationNode,
		isSymbolDefunNode,
		SymbolPropertyNode,
		isSymbolFunargNode,
		isSymbolLambdaNode,

		isSymbolLetNode,
		SymbolRefNode,
		isSymbolRefNode,

		isSymbolUsingNode,
		SymbolVarNode,
		isThisNode,
		isTryNode,
		isTryBlockNode,
		isUnaryNode,
		isUnaryPostfixNode,
		UnaryPrefixNode,
		isUnaryPrefixNode,
		isUsingNode,
		VarNode,
		isVarNode,
		VarDefNode,
		isVarDefNode,
		isWithNode,
		isYieldNode,
		TreeTransformer,
		TreeWalker,
		terserKey,
		terserProperty,
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
		if (isIterationStatementNode(node)) {
			return isBlockStatementNode(node.body) ? node.body : node;
		}
		return node;
	};

	/**
	 * terser's `is_lhs_read_only`.
	 * @param {Node} lhs an assignment's target
	 * @returns {boolean} whether assigning to it does nothing or throws
	 */
	const isLhsReadOnly = (lhs) => {
		if (isThisNode(lhs)) return true;
		if (isSymbolRefNode(lhs)) {
			return isSymbolLambdaNode(lhs.definition().orig[0]);
		}
		if (isPropAccessNode(lhs)) {
			let object = lhs.object;
			if (isSymbolRefNode(object)) {
				if (object.is_immutable()) return false;
				object = object.fixed_value();
			}
			if (!object) return true;
			if (isRegExpNode(object)) return false;
			if (isConstantNode(object)) return true;
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
		for (const definition of varStatement.declarations) {
			if (isSymbolDeclarationNode(definition.id)) {
				definition.init = null;
				declarations.push(definition);
			} else {
				for (const name of definition.declarations_as_names()) {
					declarations.push(
						makeNode(VarDefNode, definition, {
							id: name,
							init: null
						})
					);
				}
			}
		}
		return declarations.length
			? makeNode(VarNode, varStatement, { declarations })
			: null;
	};

	/**
	 * terser's `extract_from_unreachable_code`: what code that never runs still
	 * declares or exports, moved into a list.
	 * @param {CompressorShape} compressor the compressor
	 * @param {Node} statement the unreachable statement
	 * @param {Node[]} target where what it declares goes
	 * @returns {void}
	 */
	const extractFromUnreachableCode = (compressor, statement, target) => {
		walk(statement, (/** @type {Node} */ node) => {
			if (isVarNode(node)) {
				const noInitializers = removeInitializers(node);
				if (noInitializers) target.push(noInitializers);
				return true;
			}
			if (
				isDefunNode(node) &&
				(node === statement || !compressor.has_directive("use strict"))
			) {
				target.push(
					node === statement
						? node
						: makeNode(VarNode, node, {
								declarations: [
									makeNode(VarDefNode, node, {
										id: makeNode(SymbolVarNode, node.id, node.id),
										init: null
									})
								]
							})
				);
				return true;
			}
			if (isExportNode(node) || isImportNode(node)) {
				target.push(node);
				return true;
			}
			// Nested scopes are not entered.
			if (isScopeNode(node) || isClassNode(node)) {
				return true;
			}
		});
	};

	/**
	 * terser's `find_loop_scope_try`.
	 * @param {CompressorShape} compressor the compressor
	 * @returns {{ inLoop: boolean, inTry: boolean }} whether the node visited sits in a loop or a `try` block of its scope
	 */
	const findLoopScopeTry = (compressor) => {
		let node = compressor.self();
		let level = 0;
		let inLoop = false;
		let inTry = false;
		do {
			if (isIterationStatementNode(node)) {
				inLoop = true;
			} else if (isScopeNode(node)) {
				break;
			} else if (isTryBlockNode(node)) {
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
		node.declarations.every((/** @type {Node} */ varDef) => !varDef.init);

	/**
	 * terser's `to_simple_statement`: the one statement of a block, its `var`
	 * declarations moved out.
	 * @param {Node} block a branch of an `if`
	 * @param {Node[]} declarations where its declarations go
	 * @returns {Node | null | false} the statement, or false when there is more than one
	 */
	const toSimpleStatement = (block, declarations) => {
		if (!isBlockStatementNode(block)) return block;
		let statement = null;
		for (let i = 0, length = block.body.length; i < length; i++) {
			const line = block.body[i];
			if (isVarNode(line) && declarationsOnly(line)) {
				declarations.push(line);
			} else if (
				statement ||
				(isDefinitionsLikeNode(line) && !isVarNode(line))
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
		if (isExpansionNode(argument)) return false;
		const containsAwait = walk(argument, (/** @type {Node} */ node) => {
			if (isAwaitNode(node)) return walkAbort;
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
		isAssignNode(expression) ? expression.right : expression.init;

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
	 * @param {CompressorShape} compressor the compressor
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
		 * @param {CompressorShape} compressor the compressor
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
						(isAssignNode(node) &&
							(node.logical ||
								(node.operator !== "=" && lhs.equivalent_to(node.left)))) ||
						isAwaitNode(node) ||
						isUsingNode(node) ||
						(isCallNode(node) &&
							isPropAccessNode(lhs) &&
							lhs.equivalent_to(node.callee)) ||
						((isCallNode(node) || isPropAccessNode(node)) && node.optional) ||
						isDebuggerNode(node) ||
						isDestructuringNode(node) ||
						(isExpansionNode(node) &&
							isSymbolNode(node.argument) &&
							(isThisNode(node.argument) ||
								node.argument.definition().references.length > 1)) ||
						(isIterationStatementNode(node) && !isForNode(node)) ||
						isLoopControlNode(node) ||
						isTryNode(node) ||
						isWithNode(node) ||
						isYieldNode(node) ||
						isExportNode(node) ||
						isClassNode(node) ||
						(isForNode(parent) && node !== parent.init) ||
						(!replaceAll &&
							isSymbolRefNode(node) &&
							!node.is_declared(compressor) &&
							// Likely a terser bug: a set of names asked for a node is never true.
							!purePropertyAccessGlobals.has(node)) ||
						(isSymbolRefNode(node) &&
							isCallNode(parent) &&
							hasAnnotation(parent, _NOINLINE)) ||
						(isObjectPropertyNode(node) && isSyntaxNode(terserKey(node.key)))
					) {
						abort = true;
						return node;
					}
					// Stop only if candidate is found within conditional branches.
					if (
						!stopIfHit &&
						(!lhsLocal || !replaceAll) &&
						((isBinaryNode(parent) &&
							lazyOperators.has(parent.operator) &&
							parent.left !== node) ||
							(isConditionalNode(parent) && parent.test !== node) ||
							(isIfNode(parent) && parent.test !== node))
					) {
						stopIfHit = parent;
					}
					// Replace variable with assignment when found.
					if (
						canReplace &&
						!isSymbolDeclarationNode(node) &&
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
						if (valueDefinition && isVarDefNode(candidate)) {
							return node;
						}
						changed = true;
						abort = true;
						if (isUnaryPostfixNode(candidate)) {
							return makeNode(UnaryPrefixNode, candidate, candidate);
						}
						if (isVarDefNode(candidate)) {
							const candidateDefinition = candidate.id.definition();
							const value = candidate.init;
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
							return makeNode(AssignNode, candidate, {
								operator: "=",
								logical: false,
								left: makeNode(SymbolRefNode, candidate.id, candidate.id),
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
						isCallNode(node) ||
						(isExitNode(node) &&
							(sideEffects || isPropAccessNode(lhs) || mayModify(lhs))) ||
						(isPropAccessNode(node) &&
							(sideEffects || node.object.may_throw_on_access(compressor))) ||
						(isSymbolRefNode(node) &&
							((leftValues.has(node.name) &&
								/** @type {{ modified: boolean }} */ (leftValues.get(node.name))
									.modified) ||
								(sideEffects && mayModify(node)))) ||
						(isVarDefNode(node) &&
							node.init &&
							(leftValues.has(node.id.name) ||
								(sideEffects && mayModify(node.id)))) ||
						isUsingNode(node) ||
						((symbol = isLhs(node.left, node)) &&
							(isPropAccessNode(symbol) || leftValues.has(symbol.name))) ||
						(mayThrow &&
							(inTry
								? node.has_side_effects(compressor)
								: sideEffectsExternal(node)))
					) {
						stopAfter = node;
						if (isScopeNode(node)) abort = true;
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
					if (isSymbolRefNode(node) && node.name === definition.name) {
						if (!--replaced) abort = true;
						if (isLhs(node, multiReplacer.parent())) return node;
						definition.replaced++;
						/** @type {SymbolDefinition} */ (valueDefinition).replaced--;
						return candidate.init;
					}
					// Skip (non-executed) functions and (leading) default case in switch statements.
					if (isDefaultNode(node) || isScopeNode(node)) {
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
					if (isSymbolRefNode(lhs)) {
						leftValues.set(lhs.name, {
							definition: lhs.definition(),
							modified: false
						});
					}
					sideEffects = valueHasSideEffects(candidate);
					replaceAll = replaceAllSymbols();
					mayThrow = candidate.may_throw(compressor);
					funarg = isSymbolFunargNode(candidate.id);
					hit = funarg;
					abort = false;
					replaced = 0;
					canReplace = !iifeArguments || !hit;
					if (!canReplace) {
						const extra = /** @type {Node[]} */ (iifeArguments);
						for (
							let j = compressor.self().params.lastIndexOf(candidate.id) + 1;
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
						definition = candidate.id.definition();
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
				if (isScopeNode(node)) return node;

				// Scan case expressions first in a switch statement.
				if (isSwitchNode(node)) {
					node.discriminant = node.discriminant.transform(scanner);
					for (
						let i = 0, length = node.cases.length;
						!abort && i < length;
						i++
					) {
						const branch = node.cases[i];
						if (isCaseNode(branch)) {
							if (!hit) {
								if (branch !== hitStack[hitIndex]) continue;
								hitIndex++;
							}
							branch.test = branch.test.transform(scanner);
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
				let scanThis = !isArrowNode(lambda);
				argument.walk(
					new TreeWalker(
						(/** @type {Node} */ node, /** @type {() => void} */ descend) => {
							if (found) return true;
							if (
								isSymbolRefNode(node) &&
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
							if ((lambdaStrict || scanThis) && isThisNode(node)) {
								found = true;
								return true;
							}
							if (isScopeNode(node) && !isArrowNode(node)) {
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
					!lambda.id &&
					!lambda.uses_arguments &&
					!lambda.pinned() &&
					isCallNode((iife = compressor.parent())) &&
					iife.callee === lambda &&
					iife.arguments.every(argIsInjectable)
				) {
					let lambdaStrict = compressor.has_directive("use strict");
					if (lambdaStrict && !member(lambdaStrict, lambda.body.body)) {
						lambdaStrict = false;
					}
					const length = lambda.params.length;
					iifeArguments = iife.arguments.slice(length);
					const extra = /** @type {Node[]} */ (iifeArguments);
					/** @type {Set<string>} */
					const names = new Set();
					for (let i = length; --i >= 0;) {
						const symbol = lambda.params[i];
						/** @type {Node | null} */ let argument = iife.arguments[i];
						// A duplicate of the fix in terser 011d3eb, which reduce_vars
						// may be doing the exact same thing for.
						const symbolDefinition = symbol.definition && symbol.definition();
						const isReassigned =
							symbolDefinition && symbolDefinition.orig.length > 1;
						if (isReassigned) continue;
						extra.unshift(
							makeNode(VarDefNode, symbol, {
								id: symbol,
								init: argument
							})
						);
						if (names.has(symbol.name)) continue;
						names.add(symbol.name);
						if (isExpansionNode(symbol)) {
							const elements = iife.arguments.slice(i);
							if (
								elements.every(
									(/** @type {Node} */ element) =>
										!hasOverlappingSymbol(lambda, element, lambdaStrict)
								)
							) {
								candidates.unshift([
									makeNode(VarDefNode, symbol, {
										id: symbol.argument,
										init: makeNode(ArrayNode, iife, {
											elements
										})
									})
								]);
							}
						} else {
							if (!argument) {
								argument = makeVoidZero(symbol).transform(compressor);
							} else if (
								(isLambdaNode(argument) && argument.pinned()) ||
								hasOverlappingSymbol(lambda, argument, lambdaStrict)
							) {
								argument = null;
							}
							if (argument) {
								candidates.unshift([
									makeNode(VarDefNode, symbol, {
										id: symbol,
										init: argument
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
				if (isAssignNode(expression)) {
					if (
						!expression.left.has_side_effects(compressor) &&
						!isChainNode(expression.right)
					) {
						candidates.push([...hitStack]);
					}
					extractCandidates(expression.right);
				} else if (isBinaryNode(expression)) {
					extractCandidates(expression.left);
					extractCandidates(expression.right);
				} else if (
					isCallNode(expression) &&
					!hasAnnotation(expression, _NOINLINE)
				) {
					extractCandidates(expression.callee);
					for (const argument of expression.arguments) {
						extractCandidates(argument);
					}
				} else if (isCaseNode(expression)) {
					extractCandidates(expression.test);
				} else if (isConditionalNode(expression)) {
					extractCandidates(expression.test);
					extractCandidates(expression.consequent);
					extractCandidates(expression.alternate);
				} else if (isDefinitionsNode(expression)) {
					const length = expression.declarations.length;
					// Limit number of trailing variable definitions for consideration.
					let i = length - 200;
					if (i < 0) i = 0;
					for (; i < length; i++) {
						extractCandidates(expression.declarations[i]);
					}
				} else if (isDWLoopNode(expression)) {
					extractCandidates(expression.test);
					if (!isBlockNode(expression.body)) {
						extractCandidates(expression.body);
					}
				} else if (isExitNode(expression)) {
					if (expression.argument) extractCandidates(expression.argument);
				} else if (isForNode(expression)) {
					if (expression.init) extractCandidates(expression.init);
					if (expression.test) extractCandidates(expression.test);
					if (expression.update) extractCandidates(expression.update);
					if (!isBlockNode(expression.body)) {
						extractCandidates(expression.body);
					}
				} else if (isForInNode(expression)) {
					extractCandidates(expression.right);
					if (!isBlockNode(expression.body)) {
						extractCandidates(expression.body);
					}
				} else if (isIfNode(expression)) {
					extractCandidates(expression.test);
					if (!isBlockNode(expression.consequent)) {
						extractCandidates(expression.consequent);
					}
					if (expression.alternate && !isBlockNode(expression.alternate)) {
						extractCandidates(expression.alternate);
					}
				} else if (isSequenceNode(expression)) {
					for (const item of expression.expressions) {
						extractCandidates(item);
					}
				} else if (isSimpleStatementNode(expression)) {
					extractCandidates(expression.expression);
				} else if (isSwitchNode(expression)) {
					extractCandidates(expression.discriminant);
					for (const branch of expression.cases) {
						extractCandidates(branch);
					}
				} else if (isUnaryNode(expression)) {
					if (expression.operator === "++" || expression.operator === "--") {
						candidates.push([...hitStack]);
					}
				} else if (
					isVarDefNode(expression) &&
					expression.init &&
					!isChainNode(expression.init)
				) {
					candidates.push([...hitStack]);
					extractCandidates(expression.init);
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
				if (isAssignNode(parent)) {
					if (
						writeOnly &&
						!parent.logical &&
						!(isPropAccessNode(parent.left) || leftValues.has(parent.left.name))
					) {
						return findStop(parent, level + 1, writeOnly);
					}
					return node;
				}
				if (isBinaryNode(parent)) {
					if (
						writeOnly &&
						(!lazyOperators.has(parent.operator) || parent.left === node)
					) {
						return findStop(parent, level + 1, writeOnly);
					}
					return node;
				}
				if (isCallNode(parent)) return node;
				if (isCaseNode(parent)) return node;
				if (isConditionalNode(parent)) {
					if (writeOnly && parent.test === node) {
						return findStop(parent, level + 1, writeOnly);
					}
					return node;
				}
				if (isDefinitionsNode(parent)) {
					return findStop(parent, level + 1, true);
				}
				if (isExitNode(parent)) {
					return writeOnly ? findStop(parent, level + 1, writeOnly) : node;
				}
				if (isIfNode(parent)) {
					if (writeOnly && parent.test === node) {
						return findStop(parent, level + 1, writeOnly);
					}
					return node;
				}
				if (isIterationStatementNode(parent)) return node;
				if (isSequenceNode(parent)) {
					return findStop(parent, level + 1, parent.tail_node() !== node);
				}
				if (isSimpleStatementNode(parent)) {
					return findStop(parent, level + 1, true);
				}
				if (isSwitchNode(parent)) return node;
				if (isVarDefNode(parent)) return node;
				return null;
			}

			/**
			 * terser's `mangleable_var`: records the variable a definition copies.
			 * @param {Node} varDef a definition
			 * @returns {SymbolDefinition | undefined} the variable its value reads, where it is a declared one
			 */
			function mangleableVar(varDef) {
				const value = varDef.init;
				if (!isSymbolRefNode(value)) return;
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
				if (isAssignNode(expression) && expression.logical) {
					return false;
				}
				if (
					isVarDefNode(expression) &&
					isSymbolDeclarationNode(expression.id)
				) {
					const nameDefinition = expression.id.definition();
					if (!member(expression.id, nameDefinition.orig)) return;
					const referenced =
						nameDefinition.references.length - nameDefinition.replaced;
					if (!referenced) return;
					const declared =
						nameDefinition.orig.length - nameDefinition.eliminated;
					if (
						(declared > 1 && !isSymbolFunargNode(expression.id)) ||
						(referenced > 1
							? mangleableVar(expression)
							: !compressor.exposed(nameDefinition))
					) {
						return makeNode(SymbolRefNode, expression.id, expression.id);
					}
					return;
				}
				const target = isAssignNode(expression)
					? expression.left
					: expression.argument;
				return (
					!isRefOf(target, isSymbolConstNode) &&
					!isRefOf(target, isSymbolLetNode) &&
					!isRefOf(target, isSymbolUsingNode) &&
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
				if (isUnaryNode(expression)) return values;
				const walker = new TreeWalker((/** @type {Node} */ node) => {
					let symbol = node;
					while (isPropAccessNode(symbol)) symbol = symbol.object;
					if (isSymbolRefNode(symbol)) {
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
				if (isSymbolFunargNode(expression.id)) {
					const iife = compressor.parent();
					const argnames = compressor.self().params;
					const index = argnames.indexOf(expression.id);
					if (index < 0) {
						iife.arguments.length = Math.min(
							iife.arguments.length,
							argnames.length - 1
						);
					} else {
						const args = iife.arguments;
						if (args[index]) {
							args[index] = makeNode(NumberNode, args[index], {
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
							if (node === expression || ast.bodyOf(node) === expression) {
								found = true;
								if (isVarDefNode(node)) {
									// `const` always needs a value.
									node.init = isSymbolConstNode(node.id)
										? makeVoidZero(node.init)
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
							if (isSequenceNode(node)) {
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
				while (isPropAccessNode(symbol)) symbol = symbol.object;
				return (
					isSymbolRefNode(symbol) &&
					symbol.definition().scope.get_defun_scope() === defunScope &&
					!(
						inLoop &&
						(leftValues.has(symbol.name) ||
							isUnaryNode(candidate) ||
							(isAssignNode(candidate) &&
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
				if (isUnaryNode(expression)) {
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
				if (isSymbolRefNode(lhs)) {
					const lhsDefinition = lhs.definition();
					if (
						lhsDefinition.references.length - lhsDefinition.replaced ===
						(isVarDefNode(candidate) ? 1 : 2)
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
				// An `DestructuringNode`.
				if (!symbol.definition) return true;
				const symbolDefinition = symbol.definition();
				if (
					symbolDefinition.orig.length === 1 &&
					isSymbolDefunNode(symbolDefinition.orig[0])
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
				if (isAssignNode(node)) {
					return sideEffectsExternal(node.left, true);
				}
				if (isUnaryNode(node)) {
					return sideEffectsExternal(node.argument, true);
				}
				if (isVarDefNode(node)) {
					return node.init && sideEffectsExternal(node.init);
				}
				if (isTarget) {
					if (isDotNode(node)) {
						return sideEffectsExternal(node.object, true);
					}
					if (isSubNode(node)) {
						return sideEffectsExternal(node.object, true);
					}
					if (isSymbolRefNode(node)) {
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
					isBlockStatementNode(statement) &&
					statement.body.every(canBeEvictedFromBlock)
				) {
					changed = true;
					eliminateSpuriousBlocks(statement.body);
					statements.splice(i, 1, ...statement.body);
					i += statement.body.length;
				} else if (isEmptyStatementNode(statement)) {
					changed = true;
					statements.splice(i, 1);
				} else if (isDirectiveNode(statement)) {
					if (!seenDirectives.includes(statement.directive)) {
						i++;
						seenDirectives.push(statement.directive);
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
		 * @param {CompressorShape} compressor the compressor
		 * @returns {void}
		 */
		function handleIfReturn(statements, compressor) {
			const self = compressor.self();
			const multipleIfReturns = hasMultipleIfReturns(statements);
			const inLambda = isLambdaNode(self);
			// Prevent extremely deep nesting: terser#1432, webpack#17548.
			const iterationStart = Math.min(statements.length, 500);
			// Read by `canMergeFlow` and `extractDefuns`.
			let i = iterationStart;
			while (--i >= 0) {
				let statement = statements[i];
				const j = nextIndex(i);
				const next = statements[j];

				if (inLambda && !next && isReturnNode(statement)) {
					if (!statement.argument) {
						changed = true;
						statements.splice(i, 1);
						continue;
					}
					if (
						isUnaryPrefixNode(statement.argument) &&
						statement.argument.operator === "void"
					) {
						changed = true;
						statements[i] = makeNode(SimpleStatementNode, statement, {
							expression: statement.argument.argument
						});
						continue;
					}
				}

				if (isIfNode(statement)) {
					let exit = aborts(statement.consequent);
					/** @type {Node[] | undefined} */
					let newElse;
					if (
						canMergeFlow(exit) &&
						(newElse = asStatementArrayWithReturn(statement.consequent, exit))
					) {
						if (exit.label) {
							remove(exit.label.thedef.references, exit);
						}
						changed = true;
						statement = statement.clone();
						statement.test = statement.test.negate(compressor);
						statement.consequent = makeNode(BlockStatementNode, statement, {
							body: [
								...asStatementArray(statement.alternate),
								...extractDefuns()
							]
						});
						statement.alternate = makeNode(BlockStatementNode, statement, {
							body: newElse
						});
						statements[i] = statement.transform(compressor);
						continue;
					}

					exit = aborts(statement.alternate);
					if (
						canMergeFlow(exit) &&
						(newElse = asStatementArrayWithReturn(statement.alternate, exit))
					) {
						if (exit.label) {
							remove(exit.label.thedef.references, exit);
						}
						changed = true;
						statement = statement.clone();
						statement.consequent = makeNode(
							BlockStatementNode,
							statement.consequent,
							{
								body: [
									...asStatementArray(statement.consequent),
									...extractDefuns()
								]
							}
						);
						statement.alternate = makeNode(
							BlockStatementNode,
							statement.alternate,
							{
								body: newElse
							}
						);
						statements[i] = statement.transform(compressor);
						continue;
					}
				}

				if (isIfNode(statement) && isReturnNode(statement.consequent)) {
					const value = statement.consequent.argument;
					// if (foo()) return; return; ==> foo(); return;
					if (
						!value &&
						!statement.alternate &&
						((inLambda && !next) || (isReturnNode(next) && !next.argument))
					) {
						changed = true;
						statements[i] = makeNode(SimpleStatementNode, statement.test, {
							expression: statement.test
						});
						continue;
					}
					// if (foo()) return x; return y; ==> return foo() ? x : y;
					if (
						value &&
						!statement.alternate &&
						isReturnNode(next) &&
						next.argument
					) {
						changed = true;
						statement = statement.clone();
						statement.alternate = next;
						statements[i] = statement.transform(compressor);
						statements.splice(j, 1);
						continue;
					}
					// if (foo()) return x; [ return ; ] ==> return foo() ? x : undefined;
					if (
						value &&
						!statement.alternate &&
						((!next && inLambda && multipleIfReturns) || isReturnNode(next))
					) {
						changed = true;
						statement = statement.clone();
						statement.alternate =
							next ||
							makeNode(ReturnNode, statement, {
								argument: null
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
						!statement.alternate &&
						isIfNode(previous) &&
						isReturnNode(previous.consequent) &&
						nextIndex(j) === statements.length &&
						isSimpleStatementNode(next)
					) {
						changed = true;
						statement = statement.clone();
						statement.alternate = makeNode(BlockStatementNode, next, {
							body: [
								next,
								makeNode(ReturnNode, next, {
									argument: null
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
						isIfNode(statement) &&
						isReturnNode(statement.consequent) &&
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
					!value || (isUnaryPrefixNode(value) && value.operator === "void")
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
					if (isDefinitionsLikeNode(statement) && !isVarNode(statement)) {
						return false;
					}
				}
				const target = isLoopControlNode(exit)
					? compressor.loopcontrol_target(exit)
					: null;
				return (
					(isReturnNode(exit) && inLambda && isReturnVoid(exit.argument)) ||
					(isContinueNode(exit) && self === loopBody(target)) ||
					(isBreakNode(exit) && isBlockStatementNode(target) && self === target)
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
					if (isDefunNode(statement)) {
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
				if (exit.argument) {
					body.push(
						makeNode(SimpleStatementNode, exit.argument, {
							expression: exit.argument.argument
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
					if (!(isVarNode(statement) && declarationsOnly(statement))) {
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
					if (!(isVarNode(statement) && declarationsOnly(statement))) {
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
		 * @param {CompressorShape} compressor the compressor
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
				if (isLoopControlNode(statement)) {
					const target = compressor.loopcontrol_target(statement);
					if (
						(isBreakNode(statement) &&
							!isIterationStatementNode(target) &&
							loopBody(target) === self) ||
						(isContinueNode(statement) && loopBody(target) === self)
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
		 * @param {CompressorShape} compressor the compressor
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
				statements[n++] = makeNode(SimpleStatementNode, body, {
					expression: body
				});
				sequence = [];
			};
			const length = statements.length;
			for (let i = 0; i < length; i++) {
				const statement = statements[i];
				if (isSimpleStatementNode(statement)) {
					if (sequence.length >= compressor.sequences_limit) pushSequence();
					/** @type {NodeShape | null} */
					let body = statement.expression;
					if (sequence.length > 0) {
						body = body.drop_side_effect_free(compressor);
					}
					if (body) mergeSequence(sequence, body);
				} else if (
					(isDefinitionsNode(statement) && declarationsOnly(statement)) ||
					isDefunNode(statement)
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
		 * @param {CompressorShape} compressor the compressor
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
				const left = /** @type {Node} */ (previous).expression;
				return makeSequence(left, [left, right]).transform(compressor);
			};
			for (let i = 0; i < statements.length; i++) {
				const statement = statements[i];
				if (previous) {
					if (isExitNode(statement)) {
						statement.argument = consSequence(
							statement.argument ||
								makeVoidZero(statement).transform(compressor)
						);
					} else if (isForNode(statement)) {
						if (!isDefinitionsLikeNode(statement.init)) {
							const aborted = walk(
								previous.expression,
								(/** @type {Node} */ node) => {
									if (isScopeNode(node)) return true;
									if (isBinaryNode(node) && node.operator === "in") {
										return walkAbort;
									}
								}
							);
							if (!aborted) {
								if (statement.init) {
									statement.init = consSequence(statement.init);
								} else {
									statement.init = previous.expression;
									n--;
									changed = true;
								}
							}
						}
					} else if (isForInNode(statement)) {
						if (
							!isDefinitionsLikeNode(statement.left) ||
							isVarNode(statement.left)
						) {
							statement.right = consSequence(statement.right);
						}
					} else if (isIfNode(statement)) {
						statement.test = consSequence(statement.test);
					} else if (isSwitchNode(statement)) {
						statement.discriminant = consSequence(statement.discriminant);
					} else if (isWithNode(statement)) {
						statement.object = consSequence(statement.object);
					}
				}
				if (compressor.option("conditionals") && isIfNode(statement)) {
					/** @type {Node[]} */
					const declarations = [];
					const body = toSimpleStatement(statement.consequent, declarations);
					const alternative = toSimpleStatement(
						statement.alternate,
						declarations
					);
					if (
						body !== false &&
						alternative !== false &&
						declarations.length > 0
					) {
						const length = declarations.length;
						declarations.push(
							makeNode(IfNode, statement, {
								test: statement.test,
								consequent:
									body || makeNode(EmptyStatementNode, statement.consequent),
								alternate: alternative
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
				previous = isSimpleStatementNode(statement) ? statement : null;
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
			if (!isDefinitionsNode(definitions)) return;
			const list = /** @type {Node} */ (definitions).declarations;
			const last = list[list.length - 1];
			if (!isObjectNode(last.init)) return;
			/** @type {Node[] | undefined} */
			let expressions;
			const head = /** @type {Node} */ (body);
			if (isAssignNode(head) && !head.logical) {
				expressions = [head];
			} else if (isSequenceNode(head)) {
				expressions = [...head.expressions];
			}
			if (!expressions) return;
			let trimmed = false;
			do {
				const node = expressions[0];
				if (!isAssignNode(node)) break;
				if (node.operator !== "=") break;
				if (!isPropAccessNode(node.left)) break;
				const symbol = node.left.object;
				if (!isSymbolRefNode(symbol)) break;
				if (last.id.name !== symbol.name) break;
				if (!node.right.is_constant_expression(nearestScope)) break;
				let key = terserProperty(node.left);
				if (isSyntaxNode(key)) {
					key = key.evaluate(compressor);
				}
				if (isSyntaxNode(key)) break;
				key = String(key);
				const differs =
					compressor.option("ecma") < 2015 &&
					compressor.has_directive("use strict")
						? (/** @type {Node} */ property) =>
								differsLoosely(terserKey(property.key), key) &&
								terserKey(property.key) &&
								differsLoosely(terserKey(property.key).name, key)
						: (/** @type {Node} */ property) =>
								terserKey(property.key) &&
								differsLoosely(terserKey(property.key).name, key);
				if (!last.init.properties.every(differs)) break;
				const existing = last.init.properties.find(
					(/** @type {Node} */ property) => terserKey(property.key) === key
				);
				if (!existing) {
					last.init.properties.push(
						makeNode(ObjectKeyValNode, node, {
							key: new SymbolPropertyNode({ name: key }),
							value: node.right,
							computed: false,
							kind: "init",
							method: false,
							shorthand: false
						})
					);
				} else {
					existing.value = new SequenceNode({
						startToken: existing.startToken,
						expressions: [existing.value.clone(), node.right.clone()],
						endToken: existing.endToken
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
				if (isDefinitionsNode(statement)) {
					if (previous && previous.TYPE === statement.TYPE) {
						previous.declarations = [
							...previous.declarations,
							...statement.declarations
						];
						changed = true;
					} else if (
						definitions &&
						definitions.TYPE === statement.TYPE &&
						declarationsOnly(statement)
					) {
						definitions.declarations = [
							...definitions.declarations,
							...statement.declarations
						];
						changed = true;
					} else {
						statements[++j] = statement;
						definitions = statement;
					}
				} else if (
					isUsingNode(statement) &&
					isUsingNode(previous) &&
					previous.await === statement.await
				) {
					previous.declarations = [
						...previous.declarations,
						...statement.declarations
					];
				} else if (isExitNode(statement)) {
					statement.argument = extractObjectAssignments(statement.argument);
				} else if (isForNode(statement)) {
					const expressions = joinObjectAssignments(previous, statement.init);
					if (expressions) {
						changed = true;
						statement.init = expressions.length
							? makeSequence(statement.init, expressions)
							: null;
						statements[++j] = statement;
					} else if (
						isVarNode(previous) &&
						(!statement.init || statement.init.TYPE === previous.TYPE)
					) {
						if (statement.init) {
							previous.declarations = [
								...previous.declarations,
								...statement.init.declarations
							];
						}
						statement.init = previous;
						statements[j] = statement;
						changed = true;
					} else if (
						isVarNode(definitions) &&
						isVarNode(statement.init) &&
						declarationsOnly(statement.init)
					) {
						const declared = /** @type {Node} */ (definitions);
						declared.declarations = [
							...declared.declarations,
							...statement.init.declarations
						];
						statement.init = null;
						statements[++j] = statement;
						changed = true;
					} else {
						statements[++j] = statement;
					}
				} else if (isForInNode(statement)) {
					statement.right = extractObjectAssignments(statement.right);
				} else if (isIfNode(statement)) {
					statement.test = extractObjectAssignments(statement.test);
				} else if (isSimpleStatementNode(statement)) {
					const expressions = joinObjectAssignments(
						previous,
						statement.expression
					);
					if (expressions) {
						changed = true;
						if (!expressions.length) continue;
						statement.expression = makeSequence(
							statement.expression,
							expressions
						);
					}
					statements[++j] = statement;
				} else if (isSwitchNode(statement)) {
					statement.discriminant = extractObjectAssignments(
						statement.discriminant
					);
				} else if (isWithNode(statement)) {
					statement.object = extractObjectAssignments(statement.object);
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
					} else if (isSequenceNode(value)) {
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
 * @param {MinifierModules} modules terser's modules
 * @returns {{ inlineIntoSymbolRef: OptimizerHelpers["inlineIntoSymbolRef"], inlineIntoCall: OptimizerHelpers["inlineIntoCall"] }} terser's `inline_into_symbolref` and `inline_into_call`
 */
const createInline = ({ ast, common, flags, utils }) => {
	const {
		isArrayNode,
		AssignNode,
		isBlockNode,
		CallNode,
		isCallNode,
		isCatchNode,
		isClassNode,
		ClassExpressionNode,
		isDefaultAssignNode,
		isDefClassNode,

		isDefunNode,
		isDestructuringNode,
		isEmptyStatementNode,
		isExpansionNode,
		isExportNode,
		FunctionNode,
		isFunctionNode,
		isIterationStatementNode,
		isLambdaNode,
		isSyntaxNode,
		NumberNode,
		isObjectNode,
		isObjectKeyValNode,
		isPropAccessNode,
		isReturnNode,
		isScopeNode,
		isSimpleStatementNode,
		isStatementNode,
		isSymbolDefunNode,
		isSymbolFunargNode,
		SymbolLambdaNode,
		isSymbolLambdaNode,
		SymbolRefNode,
		isSymbolRefNode,
		SymbolVarNode,
		isThisNode,
		isToplevelNode,
		UnaryPrefixNode,
		VarNode,
		isVarNode,
		VarDefNode,
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
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether the node visited sits in an array or object literal of its statement
	 */
	const withinArrayOrObjectLiteral = (compressor) => {
		let node;
		let level = 0;
		while ((node = compressor.parent(level++))) {
			if (isStatementNode(node)) return false;
			if (isArrayNode(node) || isObjectKeyValNode(node) || isObjectNode(node)) {
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {Node | undefined} maybeLambda what would be inlined
	 * @returns {boolean} true when it is not inlined
	 */
	const mustNotInlineLambdaInLoop = (compressor, maybeLambda) =>
		(isLambdaNode(maybeLambda) || isClassNode(maybeLambda)) &&
		Boolean(compressor.is_within_loop());

	/**
	 * terser's `inline_into_symbolref`.
	 * @param {Node} self a reference
	 * @param {CompressorShape} compressor the compressor
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
				(isCallNode(parent) && parent.is_callee_pure(compressor)) ||
				hasAnnotation(parent, _NOINLINE)
			) &&
			!(isExportNode(parent) && isLambdaNode(fixed) && fixed.id);

		if (singleUse && isSyntaxNode(fixed)) {
			singleUse =
				!fixed.has_side_effects(compressor) && !fixed.may_throw(compressor);
		}

		if (isClassNode(fixed) && definition.scope !== self.scope) {
			return self;
		}

		if (singleUse && (isLambdaNode(fixed) || isClassNode(fixed))) {
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
				isSymbolFunargNode(definition.orig[0])
			) {
				singleUse = fixed.is_constant_expression(self.scope);
				if (singleUse === "f") {
					let scope = self.scope;
					do {
						if (isDefunNode(scope) || isFunctionExpression(scope)) {
							setFlag(scope, INLINED);
						}
					} while ((scope = scope.parent_scope));
				}
			}
		}

		if (singleUse && (isLambdaNode(fixed) || isClassNode(fixed))) {
			singleUse =
				(definition.scope === self.scope &&
					!scopeEnclosesVariablesInThisScope(nearestScope, fixed)) ||
				(isCallNode(parent) &&
					parent.callee === self &&
					!scopeEnclosesVariablesInThisScope(nearestScope, fixed) &&
					!(fixed.id && fixed.id.definition().recursive_refs > 0));
		}

		if (singleUse && fixed) {
			if (isDefClassNode(fixed)) {
				setFlag(fixed, SQUEEZED);
				fixed = makeNode(ClassExpressionNode, fixed, fixed);
			}
			if (isDefunNode(fixed)) {
				setFlag(fixed, SQUEEZED);
				fixed = makeNode(FunctionNode, fixed, fixed);
			}
			if (definition.recursive_refs > 0 && isSymbolDefunNode(fixed.id)) {
				const defunDefinition = fixed.id.definition();
				let lambdaDefinition = fixed.variables.get(fixed.id.name);
				let name = lambdaDefinition && lambdaDefinition.orig[0];
				if (!isSymbolLambdaNode(name)) {
					name = makeNode(SymbolLambdaNode, fixed.id, fixed.id);
					name.scope = fixed;
					fixed.id = name;
					lambdaDefinition = fixed.def_function(name);
				}
				walk(fixed, (/** @type {Node} */ node) => {
					if (isSymbolRefNode(node) && node.definition() === defunDefinition) {
						node.thedef = lambdaDefinition;
						lambdaDefinition.references.push(node);
					}
				});
			}
			if (
				(isLambdaNode(fixed) || isClassNode(fixed)) &&
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

			if (isThisNode(fixed)) {
				if (
					!isSymbolFunargNode(definition.orig[0]) &&
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
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node} what replaces it
	 */
	const inlineIntoCall = (self, compressor) => {
		if (compressor.in_computed_key()) return self;

		const expression = self.callee;
		let lambda = expression;
		const simpleArgs = self.arguments.every(
			(/** @type {Node} */ arg) => !isExpansionNode(arg)
		);

		if (
			compressor.option("reduce_vars") &&
			isSymbolRefNode(lambda) &&
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

		const isFunction = isLambdaNode(lambda);

		const statement = isFunction && lambda.body.body[0];
		const isRegularFunction = isFunction && !lambda.generator && !lambda.async;
		const canInline =
			isRegularFunction &&
			compressor.option("inline") &&
			!self.is_callee_pure(compressor);
		if (canInline && isReturnNode(statement)) {
			let returned = statement.argument;
			if (!returned || returned.is_constant_expression()) {
				returned = returned ? returned.clone(true) : makeVoid0(self);
				const args = [...self.arguments, returned];
				return makeSequence(self, args).optimize(compressor);
			}

			// optimize identity function
			if (
				lambda.params.length === 1 &&
				isSymbolFunargNode(lambda.params[0]) &&
				self.arguments.length < 2 &&
				!isExpansionNode(self.arguments[0]) &&
				isSymbolRefNode(returned) &&
				returned.name === lambda.params[0].name
			) {
				// terser gives this `void 0` no origin, so it carries no position.
				const replacement = (self.arguments[0] || makeVoid0()).optimize(
					compressor
				);

				let parent;
				if (
					isPropAccessNode(replacement) &&
					isCallNode((parent = compressor.parent())) &&
					parent.callee === self
				) {
					// `id(bag.method)(...)` called the method without `this`, which
					// the larger `(0, bag.method)(...)` keeps.
					return makeSequence(self, [
						makeNode(NumberNode, self, { value: 0 }),
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
				if (isReturnNode(bodyStatement)) {
					if (!bodyStatement.argument) return makeVoid0(self);
					return bodyStatement.argument.clone(true);
				}
				if (isSimpleStatementNode(bodyStatement)) {
					return makeNode(UnaryPrefixNode, bodyStatement, {
						operator: "void",
						argument: bodyStatement.expression.clone(true)
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
				const body = lambda.body.body;
				const length = body.length;
				if (compressor.option("inline") < 3) {
					return length === 1 && returnValue(firstStatement);
				}
				/** @type {Node | null} */
				let onlyStatement = null;
				for (let i = 0; i < length; i++) {
					const line = body[i];
					if (isVarNode(line)) {
						if (
							onlyStatement &&
							!line.declarations.every(
								(/** @type {Node} */ varDef) => !varDef.init
							)
						) {
							return false;
						}
					} else if (onlyStatement) {
						return false;
					} else if (!isEmptyStatementNode(line)) {
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
				const length = lambda.params.length;
				for (let i = 0; i < length; i++) {
					const arg = lambda.params[i];
					if (isDefaultAssignNode(arg)) {
						if (hasFlag(arg.left, UNUSED)) continue;
						return false;
					}
					if (isDestructuringNode(arg)) return false;
					if (isExpansionNode(arg)) {
						if (hasFlag(arg.argument, UNUSED)) continue;
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
				const length = lambda.body.body.length;
				for (let i = 0; i < length; i++) {
					const bodyStatement = lambda.body.body[i];
					if (!isVarNode(bodyStatement)) continue;
					if (!safeToInject) return false;
					for (let j = bodyStatement.declarations.length; --j >= 0;) {
						const name = bodyStatement.declarations[j].id;
						if (
							isDestructuringNode(name) ||
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
					if (isCatchNode(scope)) {
						if (scope.param) {
							blockScoped.add(scope.param.name);
						}
					} else if (isIterationStatementNode(scope)) {
						inLoop = [];
					} else if (
						isSymbolRefNode(scope) &&
						isScopeNode(scope.fixed_value())
					) {
						return false;
					}
				} while (!isScopeNode(scope));

				const safeToInject = !isToplevelNode(scope) || compressor.toplevel.vars;
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
						makeNode(VarDefNode, name, {
							id: name,
							init: null
						})
					);
				}

				const symbol = makeNode(SymbolRefNode, name, name);
				definition.references.push(symbol);
				if (value) {
					expressions.push(
						makeNode(AssignNode, self, {
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
				const length = lambda.params.length;
				for (let i = self.arguments.length; --i >= length;) {
					expressions.push(self.arguments[i]);
				}
				for (let i = length; --i >= 0;) {
					const name = lambda.params[i];
					let value = self.arguments[i];
					if (
						hasFlag(name, UNUSED) ||
						!name.name ||
						scope.conflicting_def(name.name)
					) {
						if (value) expressions.push(value);
					} else {
						const symbol = makeNode(SymbolVarNode, name, name);
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
				const lines = lambda.body.body.length;
				for (let i = 0; i < lines; i++) {
					const bodyStatement = lambda.body.body[i];
					if (!isVarNode(bodyStatement)) continue;
					const count = bodyStatement.declarations.length;
					for (let j = 0; j < count; j++) {
						const varDef = bodyStatement.declarations[j];
						const name = varDef.id;
						appendVar(declarations, expressions, name, varDef.init);
						if (
							inLoop &&
							lambda.params.every(
								(/** @type {Node} */ argname) => argname.name !== name.name
							)
						) {
							const variableDefinition = lambda.variables.get(name.name);
							const symbol = makeNode(SymbolRefNode, name, name);
							variableDefinition.references.push(symbol);
							expressions.splice(
								position++,
								0,
								makeNode(AssignNode, varDef, {
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
					/** @type {Node[]} */
					const statements = ast.bodyOf(scope);
					const index = statements.indexOf(compressor.parent(level - 1)) + 1;
					statements.splice(
						index,
						0,
						makeNode(VarNode, lambda, {
							declarations
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
					if (isDefaultAssignNode(parent)) return true;
					if (isBlockNode(parent)) break;
				}
				return false;
			};

			let expressionDefinition;
			let returnedValue;
			let nearestScope;
			if (
				simpleArgs &&
				!lambda.uses_arguments &&
				!isClassNode(compressor.parent()) &&
				!(lambda.id && isFunctionNode(lambda)) &&
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
				!isClassNode(scope)
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
				isDefunNode(lambda) ? FunctionNode : lambda.CTOR,
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

			return makeNode(CallNode, self, {
				callee: lambda,
				arguments: self.arguments
			}).optimize(compressor);
		}

		const canDropThisCall =
			isRegularFunction &&
			compressor.option("side_effects") &&
			lambda.body.body.every(isEmpty);
		if (canDropThisCall) {
			const args = [...self.arguments, makeVoid0(self)];
			return makeSequence(self, args).optimize(compressor);
		}

		if (
			compressor.option("negate_iife") &&
			isSimpleStatementNode(compressor.parent()) &&
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
 * of `compress/index.js` they call, from the compressor's driver to `ImportNode`.
 * @param {MinifierModules} modules terser's modules
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
	 * @this {CompressorShape} the compressor
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
	 * @this {CompressorShape} the compressor
	 * @param {string} key an option's name
	 * @returns {EXPECTED_ANY} its value
	 */
	Compressor.prototype.option = function option(key) {
		return this.options[key];
	};

	/**
	 * @this {CompressorShape} the compressor
	 * @param {SymbolDefinition} definition a variable
	 * @returns {boolean} whether code outside the output can read it
	 */
	Compressor.prototype.exposed = function exposed(definition) {
		if (definition.export) return true;
		if (definition.global) {
			for (let i = 0, length = definition.orig.length; i < length; i++) {
				if (
					!this.toplevel[
						A.isSymbolDefunNode(definition.orig[i]) ? "funcs" : "vars"
					]
				) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * @this {CompressorShape} the compressor
	 * @returns {boolean | undefined} whether only the truthiness of the node visited is read
	 */
	Compressor.prototype.in_boolean_context = function in_boolean_context() {
		if (!this.option("booleans")) return false;
		let self = this.self();
		for (let i = 0, parent; (parent = this.parent(i)); i++) {
			if (
				A.isSimpleStatementNode(parent) ||
				(A.isConditionalNode(parent) && parent.test === self) ||
				(A.isDWLoopNode(parent) && parent.test === self) ||
				(A.isForNode(parent) && parent.test === self) ||
				(A.isIfNode(parent) && parent.test === self) ||
				(A.isUnaryPrefixNode(parent) &&
					parent.operator === "!" &&
					parent.argument === self)
			) {
				return true;
			}
			if (
				(A.isBinaryNode(parent) &&
					(parent.operator === "&&" || parent.operator === "||")) ||
				A.isConditionalNode(parent) ||
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
	 * @this {CompressorShape} the compressor
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
				A.isBinaryNode(parent) &&
				bitwiseBinaryOperators.has(parent.operator)
			) {
				if (otherOperandMustBeNumber) {
					return (self === parent.left ? parent.right : parent.left).is_number(
						this
					);
				}
				return true;
			}
			if (A.isUnaryPrefixNode(parent)) {
				return parent.operator === "~";
			}
			if (
				(A.isBinaryNode(parent) &&
					// Not the left operand: that can change the branch taken.
					((parent.operator === "&&" && parent.right === self) ||
						(parent.operator === "||" && parent.right === self) ||
						(parent.operator === "??" && parent.right === self))) ||
				(A.isConditionalNode(parent) && parent.test !== self) ||
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
	 * @this {CompressorShape} the compressor
	 * @returns {Node | undefined} the tree being compressed
	 */
	Compressor.prototype.get_toplevel = function get_toplevel() {
		return this._toplevel;
	};

	/**
	 * @this {CompressorShape} the compressor
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
			// Only a pass that another can follow needs the count: terser walks the
			// whole tree after the last one too, for a verdict it then drops.
			if (pass + 1 < passes) {
				let count = 0;
				walk(this._toplevel, (/** @type {Node} */ node) => {
					count++;
					// terser counted each hole, a node of its own there.
					const list = A.isArrayNode(node)
						? node.elements
						: A.isDestructuringNode(node)
							? node.elements || undefined
							: undefined;
					if (list !== undefined) {
						for (const item of list) if (item === null) count++;
					}
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
	 * @this {CompressorShape} the compressor
	 * @returns {boolean} whether the node visited is assigned to
	 */
	Compressor.prototype.is_lhs = function is_lhs() {
		const self = this.stack[this.stack.length - 1];
		const parent = this.stack[this.stack.length - 2];
		return isLhs(self, parent);
	};

	defineOptimizer(A.SyntaxNode, (self) => self);

	/**
	 * Turns each statement that ends the scope into a `return` of it, or back.
	 * @this {Scope} the scope
	 * @param {boolean} insert whether to insert the returns rather than remove them
	 * @param {CompressorShape=} compressor the compressor, which drops what a removed `return` returns
	 * @returns {void}
	 */
	A.ScopeNode.prototype.process_expression = function process_expression(
		insert,
		compressor
	) {
		const self = this;
		const transformer = new TreeTransformer((/** @type {Node} */ node) => {
			if (insert && A.isSimpleStatementNode(node)) {
				return makeNode(A.ReturnNode, node, {
					argument: node.expression
				});
			}
			if (!insert && A.isReturnNode(node)) {
				if (compressor) {
					const value =
						node.argument &&
						node.argument.drop_side_effect_free(compressor, true);
					return value
						? makeNode(A.SimpleStatementNode, node, { expression: value })
						: makeNode(A.EmptyStatementNode, node);
				}
				return makeNode(A.SimpleStatementNode, node, {
					expression: node.argument || makeVoid0(node)
				});
			}
			if (A.isClassNode(node) || (A.isLambdaNode(node) && node !== self)) {
				return node;
			}
			if (A.isBlockNode(node)) {
				const statements = A.bodyOf(node);
				const index = statements.length - 1;
				if (index >= 0) {
					statements[index] = statements[index].transform(transformer);
				}
			} else if (A.isIfNode(node)) {
				node.consequent = node.consequent.transform(transformer);
				if (node.alternate) {
					node.alternate = node.alternate.transform(transformer);
				}
			} else if (A.isWithNode(node)) {
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
	A.SymbolNode.prototype.fixed_value = function fixed_value() {
		const fixed = this.thedef.fixed;
		if (!fixed || A.isSyntaxNode(fixed)) return fixed;
		return fixed();
	};

	/**
	 * @this {Node} a reference
	 * @returns {boolean} whether it reads a function expression's own name
	 */
	A.SymbolRefNode.prototype.is_immutable = function is_immutable() {
		const orig = this.definition().orig;
		return orig.length === 1 && A.isSymbolLambdaNode(orig[0]);
	};

	/**
	 * @this {Node} a reference
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether reading it cannot throw for want of a declaration
	 */
	A.SymbolRefNode.prototype.is_declared = function is_declared(compressor) {
		return (
			!this.definition().undeclared ||
			((compressor.option("unsafe") || compressor.option("builtins_pure")) &&
				compressor.pure_access_globals(this.name))
		);
	};

	const directives = new Set(["use asm", "use strict"]);
	defineOptimizer(A.DirectiveNode, (self, compressor) => {
		if (
			compressor.option("directives") &&
			(!directives.has(self.directive) ||
				compressor.has_directive(self.directive) !== self)
		) {
			return makeNode(A.EmptyStatementNode, self);
		}
		return self;
	});

	defineOptimizer(A.DebuggerNode, (self, compressor) => {
		if (compressor.option("drop_debugger")) {
			return makeNode(A.EmptyStatementNode, self);
		}
		return self;
	});

	defineOptimizer(A.LabeledStatementNode, (self, compressor) => {
		if (
			A.isBreakNode(self.body) &&
			compressor.loopcontrol_target(self.body) === self.body
		) {
			return makeNode(A.EmptyStatementNode, self);
		}
		return self.label.references.length === 0 ? self.body : self;
	});

	defineOptimizer(A.BlockNode, (self, compressor) => {
		// A case's or default's statements are its `consequent`.
		tightenBody(A.bodyOf(self), compressor);
		return self;
	});

	/**
	 * @param {Node} node a statement
	 * @returns {boolean} whether it can leave the block of an `if` without changing scope
	 */
	const canBeExtractedFromIfBlock = (node) =>
		!(
			A.isConstNode(node) ||
			A.isLetNode(node) ||
			A.isUsingNode(node) ||
			A.isClassNode(node)
		);

	defineOptimizer(A.BlockStatementNode, (self, compressor) => {
		tightenBody(self.body, compressor);
		switch (self.body.length) {
			case 1:
				if (
					(!compressor.has_directive("use strict") &&
						A.isIfNode(compressor.parent()) &&
						canBeExtractedFromIfBlock(self.body[0])) ||
					canBeEvictedFromBlock(self.body[0])
				) {
					return self.body[0];
				}
				break;
			case 0:
				return makeNode(A.EmptyStatementNode, self);
		}
		return self;
	});

	defineOptimizer(A.LambdaNode, optimizeLambda);

	/**
	 * Hoists functions and `var`s to the top of the scope, as `hoist_funs` and
	 * `hoist_vars` ask, with its directives first.
	 * @this {Scope} the scope
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Scope} the scope, hoisted
	 */
	A.ScopeNode.prototype.hoist_declarations = function hoist_declarations(
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
				if (A.isScopeNode(node) && node !== self) return true;
				if (A.isVarNode(node)) {
					++varDeclarations;
					return true;
				}
				return undefined;
			});
			hoistVars = hoistVars && varDeclarations > 1;
			const transformer = new TreeTransformer((/** @type {Node} */ node) => {
				if (node !== self) {
					if (A.isDirectiveNode(node)) {
						directiveStatements.push(node);
						return makeNode(A.EmptyStatementNode, node);
					}
					if (
						hoistFunctions &&
						A.isDefunNode(node) &&
						!A.isExportNode(transformer.parent()) &&
						transformer.parent() === self
					) {
						hoisted.push(node);
						return makeNode(A.EmptyStatementNode, node);
					}
					if (
						hoistVars &&
						A.isVarNode(node) &&
						!node.declarations.some((/** @type {Node} */ definition) =>
							A.isDestructuringNode(definition.id)
						)
					) {
						for (const definition of node.declarations) {
							vars.set(definition.id.name, definition);
							++varsFound;
						}
						const sequence = node.to_assignments(compressor);
						const parent = transformer.parent();
						if (A.isForInNode(parent) && parent.left === node) {
							if (sequence === null || sequence === undefined) {
								const name = node.declarations[0].id;
								return makeNode(A.SymbolRefNode, name, name);
							}
							return sequence;
						}
						if (A.isForNode(parent) && parent.init === node) {
							return sequence;
						}
						if (!sequence) return makeNode(A.EmptyStatementNode, node);
						return makeNode(A.SimpleStatementNode, node, {
							expression: sequence
						});
					}
					// Nested scopes are left as they are.
					if (A.isScopeNode(node)) return node;
				}
				return undefined;
			});
			self = self.transform(transformer);
			if (varsFound > 0) {
				// Only the vars that are not also the function's parameters.
				/** @type {Node[]} */
				const definitions = [];
				const isLambda = A.isLambdaNode(self);
				const argumentNames = isLambda ? self.args_as_names() : null;
				for (let [name, definition] of vars.entries()) {
					if (
						isLambda &&
						argumentNames.some(
							(/** @type {Node} */ argument) =>
								argument.name === definition.id.name
						)
					) {
						vars.delete(name);
					} else {
						definition = definition.clone();
						definition.init = null;
						definitions.push(definition);
						vars.set(name, definition);
					}
				}
				if (definitions.length > 0) {
					/** @type {Node[]} */
					const statements = A.bodyOf(self);
					// Merges the assignments that follow into the declarations.
					for (let i = 0; i < statements.length;) {
						if (A.isSimpleStatementNode(statements[i])) {
							const expression = statements[i].expression;
							let symbol;
							let assign;
							if (
								A.isAssignNode(expression) &&
								expression.operator === "=" &&
								A.isSymbolNode((symbol = expression.left)) &&
								vars.has(symbol.name)
							) {
								const definition = /** @type {Node} */ (vars.get(symbol.name));
								if (definition.init) break;
								definition.init = expression.right;
								remove(definitions, definition);
								definitions.push(definition);
								statements.splice(i, 1);
								continue;
							}
							if (
								A.isSequenceNode(expression) &&
								A.isAssignNode((assign = expression.expressions[0])) &&
								assign.operator === "=" &&
								A.isSymbolNode((symbol = assign.left)) &&
								vars.has(symbol.name)
							) {
								const definition = /** @type {Node} */ (vars.get(symbol.name));
								if (definition.init) break;
								definition.init = assign.right;
								remove(definitions, definition);
								definitions.push(definition);
								statements[i].expression = makeSequence(
									expression,
									expression.expressions.slice(1)
								);
								continue;
							}
						}
						if (A.isEmptyStatementNode(statements[i])) {
							statements.splice(i, 1);
							continue;
						}
						if (A.isBlockStatementNode(statements[i])) {
							statements.splice(i, 1, ...statements[i].body);
							continue;
						}
						break;
					}
					hoisted.push(
						makeNode(A.VarNode, self, {
							declarations: definitions
						})
					);
				}
			}
			// A class has no list, which `concat` appends as `undefined` and terser
			// kept as the class's `body`; here the class keeps its members.
			// eslint-disable-next-line unicorn/prefer-spread
			const body = directiveStatements.concat(hoisted, A.bodyOf(self));
			if (A.isLambdaNode(self)) {
				self.body.body = body;
			} else if (!A.isClassNode(self)) {
				self.body = body;
			}
		}
		return self;
	};

	defineOptimizer(A.SimpleStatementNode, (self, compressor) => {
		if (compressor.option("side_effects")) {
			const body = self.expression;
			const node = body.drop_side_effect_free(compressor, true);
			if (!node) {
				return makeNode(A.EmptyStatementNode, self);
			}
			if (node !== body) {
				return makeNode(A.SimpleStatementNode, self, { expression: node });
			}
		}
		return self;
	});

	defineOptimizer(A.WhileNode, (self, compressor) =>
		compressor.option("loops")
			? makeNode(A.ForNode, self, self).optimize(compressor)
			: self
	);

	defineOptimizer(A.DoNode, (self, compressor) => {
		if (!compressor.option("loops")) return self;
		const condition = self.test.tail_node().evaluate(compressor);
		if (!A.isSyntaxNode(condition)) {
			if (condition) {
				return makeNode(A.ForNode, self, {
					body: makeNode(A.BlockStatementNode, self.body, {
						body: [
							self.body,
							makeNode(A.SimpleStatementNode, self.test, {
								expression: self.test
							})
						]
					})
				}).optimize(compressor);
			}
			if (!hasBreakOrContinue(self, compressor.parent())) {
				return makeNode(A.BlockStatementNode, self.body, {
					body: [
						self.body,
						makeNode(A.SimpleStatementNode, self.test, {
							expression: self.test
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
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node} the loop, or the block that replaces it
	 */
	const ifBreakInLoop = (self, compressor) => {
		/**
		 * @param {Node} node a statement
		 * @returns {boolean} whether it breaks out of the loop visited
		 */
		const isBreak = (node) =>
			A.isBreakNode(node) &&
			compressor.loopcontrol_target(node) === compressor.self();

		/**
		 * Replaces the leading `if` of the body with the branch that does not
		 * break, then folds what it starts with in turn.
		 * @param {Node | null | undefined} rest the branch that stays
		 * @returns {void}
		 */
		const dropIt = (rest) => {
			const statements = asStatementArray(rest);
			if (A.isBlockStatementNode(self.body)) {
				self.body = self.body.clone();
				self.body.body = [...statements, ...self.body.body.slice(1)];
				self.body = self.body.transform(compressor);
			} else {
				self.body = makeNode(A.BlockStatementNode, self.body, {
					body: statements
				}).transform(compressor);
			}
			self = ifBreakInLoop(self, compressor);
		};

		const first = A.isBlockStatementNode(self.body)
			? self.body.body[0]
			: self.body;
		if (compressor.option("dead_code") && isBreak(first)) {
			/** @type {Node[]} */
			const body = [];
			if (A.isStatementNode(self.init)) {
				body.push(self.init);
			} else if (self.init) {
				body.push(
					makeNode(A.SimpleStatementNode, self.init, {
						expression: self.init
					})
				);
			}
			if (self.test) {
				body.push(
					makeNode(A.SimpleStatementNode, self.test, {
						expression: self.test
					})
				);
			}
			extractFromUnreachableCode(compressor, self.body, body);
			return makeNode(A.BlockStatementNode, self, {
				body
			});
		}
		if (A.isIfNode(first)) {
			if (isBreak(first.consequent)) {
				if (self.test) {
					self.test = makeNode(A.BinaryNode, self.test, {
						left: self.test,
						operator: "&&",
						right: first.test.negate(compressor)
					});
				} else {
					self.test = first.test.negate(compressor);
				}
				dropIt(first.alternate);
			} else if (isBreak(first.alternate)) {
				if (self.test) {
					self.test = makeNode(A.BinaryNode, self.test, {
						left: self.test,
						operator: "&&",
						right: first.test
					});
				} else {
					self.test = first.test;
				}
				dropIt(first.consequent);
			}
		}
		return self;
	};

	defineOptimizer(A.ForNode, (self, compressor) => {
		if (!compressor.option("loops")) return self;
		if (compressor.option("side_effects") && self.init) {
			self.init = self.init.drop_side_effect_free(compressor);
		}
		if (self.test) {
			let condition = self.test.evaluate(compressor);
			if (!A.isSyntaxNode(condition)) {
				if (condition) {
					self.test = NO_NODE;
				} else if (!compressor.option("dead_code")) {
					const original = self.test;
					self.test = makeNodeFromConstant(condition, self.test);
					self.test = bestOfExpression(
						self.test.transform(compressor),
						original
					);
				}
			}
			if (compressor.option("dead_code")) {
				if (A.isSyntaxNode(condition)) {
					condition = self.test.tail_node().evaluate(compressor);
				}
				if (!condition) {
					/** @type {Node[]} */
					const body = [];
					extractFromUnreachableCode(compressor, self.body, body);
					if (A.isStatementNode(self.init)) {
						body.push(self.init);
					} else if (self.init) {
						body.push(
							makeNode(A.SimpleStatementNode, self.init, {
								expression: self.init
							})
						);
					}
					body.push(
						makeNode(A.SimpleStatementNode, self.test, {
							expression: self.test
						})
					);
					return makeNode(A.BlockStatementNode, self, { body }).optimize(
						compressor
					);
				}
			}
		}
		return ifBreakInLoop(self, compressor);
	});

	defineOptimizer(A.IfNode, (self, compressor) => {
		if (isEmpty(self.alternate)) self.alternate = NO_NODE;

		if (!compressor.option("conditionals")) return self;
		// A condition known statically has no side effects, so one branch
		// goes; `x && true` is not known, though it could be.
		let condition = self.test.evaluate(compressor);
		if (!compressor.option("dead_code") && !A.isSyntaxNode(condition)) {
			const original = self.test;
			self.test = makeNodeFromConstant(condition, original);
			self.test = bestOfExpression(self.test.transform(compressor), original);
		}
		if (compressor.option("dead_code")) {
			if (A.isSyntaxNode(condition)) {
				condition = self.test.tail_node().evaluate(compressor);
			}
			if (!condition) {
				/** @type {Node[]} */
				const body = [];
				extractFromUnreachableCode(compressor, self.consequent, body);
				body.push(
					makeNode(A.SimpleStatementNode, self.test, {
						expression: self.test
					})
				);
				if (self.alternate) body.push(self.alternate);
				return makeNode(A.BlockStatementNode, self, { body }).optimize(
					compressor
				);
			} else if (!A.isSyntaxNode(condition)) {
				/** @type {Node[]} */
				const body = [];
				body.push(
					makeNode(A.SimpleStatementNode, self.test, {
						expression: self.test
					})
				);
				body.push(self.consequent);
				if (self.alternate) {
					extractFromUnreachableCode(compressor, self.alternate, body);
				}
				return makeNode(A.BlockStatementNode, self, { body }).optimize(
					compressor
				);
			}
		}
		const negated = self.test.negate(compressor);
		const conditionLength = self.test.size();
		const negatedLength = negated.size();
		let negatedIsBest = negatedLength < conditionLength;
		if (self.alternate && negatedIsBest) {
			// The branches are swapped here already; the lengths are only
			// compared for equality below, so they stay as they are.
			negatedIsBest = false;
			self.test = negated;
			const body = self.consequent;
			self.consequent = self.alternate || makeNode(A.EmptyStatementNode, self);
			self.alternate = body;
		}
		if (isEmpty(self.consequent) && isEmpty(self.alternate)) {
			return makeNode(A.SimpleStatementNode, self.test, {
				expression: self.test.clone()
			}).optimize(compressor);
		}
		if (
			A.isSimpleStatementNode(self.consequent) &&
			A.isSimpleStatementNode(self.alternate)
		) {
			return makeNode(A.SimpleStatementNode, self, {
				expression: makeNode(A.ConditionalNode, self, {
					test: self.test,
					consequent: self.consequent.expression,
					alternate: self.alternate.expression
				})
			}).optimize(compressor);
		}
		if (isEmpty(self.alternate) && A.isSimpleStatementNode(self.consequent)) {
			if (
				conditionLength === negatedLength &&
				!negatedIsBest &&
				A.isBinaryNode(self.test) &&
				self.test.operator === "||"
			) {
				// As long, but the negation needs no parentheses around it
				// (https://github.com/mishoo/UglifyJS2/issues/979).
				negatedIsBest = true;
			}
			if (negatedIsBest) {
				return makeNode(A.SimpleStatementNode, self, {
					expression: makeNode(A.BinaryNode, self, {
						operator: "||",
						left: negated,
						right: self.consequent.expression
					})
				}).optimize(compressor);
			}
			return makeNode(A.SimpleStatementNode, self, {
				expression: makeNode(A.BinaryNode, self, {
					operator: "&&",
					left: self.test,
					right: self.consequent.expression
				})
			}).optimize(compressor);
		}
		if (
			A.isEmptyStatementNode(self.consequent) &&
			A.isSimpleStatementNode(self.alternate)
		) {
			return makeNode(A.SimpleStatementNode, self, {
				expression: makeNode(A.BinaryNode, self, {
					operator: "||",
					left: self.test,
					right: self.alternate.expression
				})
			}).optimize(compressor);
		}
		if (
			A.isExitNode(self.consequent) &&
			A.isExitNode(self.alternate) &&
			self.consequent.TYPE === self.alternate.TYPE
		) {
			return makeNode(self.consequent.CTOR, self, {
				argument: makeNode(A.ConditionalNode, self, {
					test: self.test,
					consequent: self.consequent.argument || makeVoid0(self.consequent),
					alternate: self.alternate.argument || makeVoid0(self.alternate)
				}).transform(compressor)
			}).optimize(compressor);
		}
		if (
			A.isIfNode(self.consequent) &&
			!self.consequent.alternate &&
			!self.alternate
		) {
			self = makeNode(A.IfNode, self, {
				test: makeNode(A.BinaryNode, self.test, {
					operator: "&&",
					left: self.test,
					right: self.consequent.test
				}),
				consequent: self.consequent.consequent,
				alternate: null
			});
		}
		if (aborts(self.consequent) && self.alternate) {
			const alternative = self.alternate;
			self.alternate = NO_NODE;
			return makeNode(A.BlockStatementNode, self, {
				body: [self, alternative]
			}).optimize(compressor);
		}
		if (aborts(self.alternate)) {
			const body = self.consequent;
			self.consequent = self.alternate;
			self.test = negatedIsBest ? negated : self.test.negate(compressor);
			self.alternate = NO_NODE;
			return makeNode(A.BlockStatementNode, self, {
				body: [self, body]
			}).optimize(compressor);
		}
		return self;
	});

	defineOptimizer(A.SwitchNode, (self, compressor) => {
		if (!compressor.option("switches")) return self;
		let value = self.discriminant.evaluate(compressor);
		if (!A.isSyntaxNode(value)) {
			const original = self.discriminant;
			self.discriminant = makeNodeFromConstant(value, original);
			self.discriminant = bestOfExpression(
				self.discriminant.transform(compressor),
				original
			);
		}
		if (!compressor.option("dead_code")) return self;
		if (A.isSyntaxNode(value)) {
			value = self.discriminant.tail_node().evaluate(compressor);
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
			A.isBreakNode(node) && stack.loopcontrol_target(node) === self;

		/**
		 * @param {Node} branch a case or the default
		 * @param {Node=} previous the branch before it
		 * @returns {void}
		 */
		const eliminateBranch = (branch, previous) => {
			if (previous && !aborts(previous)) {
				previous.consequent = [...previous.consequent, ...branch.consequent];
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
			let branchBody = branch.consequent;
			const previousBody = previous.consequent;
			if (insertBreak) {
				branchBody = [...branchBody, makeNode(A.BreakNode)];
			}
			if (branchBody.length !== previousBody.length) return false;
			const branchBlock = makeNode(A.BlockStatementNode, branch, {
				body: branchBody
			});
			const previousBlock = makeNode(A.BlockStatementNode, previous, {
				body: previousBody
			});
			return branchBlock.equivalent_to(previousBlock);
		};

		/**
		 * @param {Node} expression an expression
		 * @returns {Node} a statement of it
		 */
		const statement = (expression) =>
			makeNode(A.SimpleStatementNode, expression, { expression });

		/**
		 * @param {Node} root the switch
		 * @returns {boolean} whether it breaks out other than at the end of a branch
		 */
		const hasNestedBreak = (root) => {
			let hasBreak = false;
			const walker = new TreeWalker((/** @type {Node} */ node) => {
				if (hasBreak) return true;
				if (A.isLambdaNode(node)) return true;
				if (A.isSimpleStatementNode(node)) return true;
				if (!isBreak(node, walker)) return undefined;
				const parent = walker.parent();
				if (
					A.isSwitchBranchNode(parent) &&
					parent.consequent[parent.consequent.length - 1] === node
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
			!makeNode(A.BlockStatementNode, branch, {
				body: branch.consequent
			}).has_side_effects(compressor);

		/** @type {Node | null | undefined} */
		let defaultBranch;
		/** @type {Node | undefined} */
		let exactMatch;
		// Compresses the branches into `body`, keeps one default, and finds the
		// branch whose case is the value, as `case 1234` in `switch (1234)`.
		let i = 0;
		const length = self.cases.length;
		for (; i < length && !exactMatch; i++) {
			const branch = self.cases[i];
			if (A.isDefaultNode(branch)) {
				if (!defaultBranch) {
					defaultBranch = branch;
				} else {
					eliminateBranch(branch, body[body.length - 1]);
				}
			} else if (!A.isSyntaxNode(value)) {
				let expression = branch.test.evaluate(compressor);
				if (!A.isSyntaxNode(expression) && expression !== value) {
					eliminateBranch(branch, body[body.length - 1]);
					continue;
				}
				if (
					A.isSyntaxNode(expression) &&
					!expression.has_side_effects(compressor)
				) {
					expression = branch.test.tail_node().evaluate(compressor);
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
		while (i < length) eliminateBranch(self.cases[i++], body[body.length - 1]);
		self.cases = body;

		/** @type {Node | null | undefined} */
		let defaultOrExact = defaultBranch || exactMatch;

		// Groups equivalent branches, which the loop after merges, where every
		// branch is a constant case ending in a jump.
		if (
			body.every(
				(branch, index) =>
					(branch === defaultOrExact || A.isConstantNode(branch.test)) &&
					(branch.consequent.length === 0 ||
						aborts(branch) ||
						body.length - 1 === index)
			)
		) {
			for (let i = 0; i < body.length; i++) {
				const branch = body[i];
				for (let j = i + 1; j < body.length; j++) {
					const next = body[j];
					if (next.consequent.length === 0) continue;
					const lastBranch = j === body.length - 1;
					const equivalentBranch = branchesEquivalent(next, branch, false);
					if (
						equivalentBranch ||
						(lastBranch && branchesEquivalent(next, branch, true))
					) {
						if (!equivalentBranch && lastBranch) {
							next.consequent.push(makeNode(A.BreakNode));
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
			if (branch.consequent.length === 0) continue;
			if (!aborts(branch)) continue;

			for (let j = i + 1; j < body.length; i++, j++) {
				const next = body[j];
				if (next.consequent.length === 0) continue;
				if (
					branchesEquivalent(next, branch, false) ||
					(j === body.length - 1 && branchesEquivalent(next, branch, true))
				) {
					branch.consequent = [];
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
				const branchBody = body[i].consequent;
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
					} else if (!branch.test.has_side_effects(compressor)) {
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
				if (branch.test.has_side_effects(compressor)) break;
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
					body[sideEffectIndex].consequent = body[defaultBodyIndex].consequent;
				} else {
					// The default is the last branch.
					defaultOrExact.consequent = body[defaultBodyIndex].consequent;
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
				caseBody = makeNode(A.BlockStatementNode, branch, {
					body: branch.consequent
				});
				branch.consequent = [];
			} else if (index !== -1) {
				// Several bodies.
				break DEFAULT;
			}

			const sideEffect = body.find(
				(/** @type {Node} */ branch) =>
					branch !== defaultOrExact && branch.test.has_side_effects(compressor)
			);
			if (!sideEffect) {
				return makeNode(A.BlockStatementNode, self, {
					body: [
						...declarations,
						statement(self.discriminant),
						...(defaultOrExact.test ? [statement(defaultOrExact.test)] : []),
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
				return makeNode(A.BlockStatementNode, self, {
					body: [...declarations, self, caseBody]
				}).optimize(compressor);
			}
		}

		// The `var`s of the branches dropped.
		if (body.length > 0) {
			body[0].consequent = [...declarations, ...body[0].consequent];
		}
		if (body.length === 0) {
			return makeNode(A.BlockStatementNode, self, {
				body: [...declarations, statement(self.discriminant)]
			}).optimize(compressor);
		}

		if (body.length === 1 && !hasNestedBreak(self)) {
			// The last body, its breaks pruned already, so it can be hoisted.
			const branch = body[0];
			return makeNode(A.IfNode, self, {
				test: makeNode(A.BinaryNode, self, {
					operator: "===",
					left: self.discriminant,
					right: branch.test
				}),
				consequent: makeNode(A.BlockStatementNode, branch, {
					body: branch.consequent
				}),
				alternate: null
			}).optimize(compressor);
		}
		if (body.length === 2 && defaultOrExact && !hasNestedBreak(self)) {
			const branch = body[0] === defaultOrExact ? body[1] : body[0];
			const exactStatement =
				defaultOrExact.test && statement(defaultOrExact.test);
			if (aborts(body[0])) {
				// Only the first branch can end in a break.
				const first = body[0];
				if (
					isBreak(first.consequent[first.consequent.length - 1], compressor)
				) {
					first.consequent.pop();
				}
				return makeNode(A.IfNode, self, {
					test: makeNode(A.BinaryNode, self, {
						operator: "===",
						left: self.discriminant,
						right: branch.test
					}),
					consequent: makeNode(A.BlockStatementNode, branch, {
						body: branch.consequent
					}),
					alternate: makeNode(A.BlockStatementNode, defaultOrExact, {
						body: [
							...(exactStatement ? [exactStatement] : []),
							...defaultOrExact.consequent
						]
					})
				}).optimize(compressor);
			}
			let operator = "===";
			let consequent = makeNode(A.BlockStatementNode, branch, {
				body: branch.consequent
			});
			let always = makeNode(A.BlockStatementNode, defaultOrExact, {
				body: [
					...(exactStatement ? [exactStatement] : []),
					...defaultOrExact.consequent
				]
			});
			if (body[0] === defaultOrExact) {
				operator = "!==";
				const swapped = always;
				always = consequent;
				consequent = swapped;
			}
			return makeNode(A.BlockStatementNode, self, {
				body: [
					makeNode(A.IfNode, self, {
						test: makeNode(A.BinaryNode, self, {
							operator,
							left: self.discriminant,
							right: branch.test
						}),
						consequent,
						alternate: null
					}),
					always
				]
			}).optimize(compressor);
		}
		return self;
	});

	defineOptimizer(A.TryNode, (self, compressor) => {
		if (self.handler && self.finalizer && self.finalizer.body.every(isEmpty)) {
			self.finalizer = null;
		}

		if (compressor.option("dead_code") && self.block.body.every(isEmpty)) {
			/** @type {Node[]} */
			const body = [];
			if (self.handler) {
				extractFromUnreachableCode(compressor, self.handler, body);
			}
			if (self.finalizer) body.push(...self.finalizer.body);
			return makeNode(A.BlockStatementNode, self, {
				body
			}).optimize(compressor);
		}
		return self;
	});

	/**
	 * @this {Node} a declaration
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node | null} the assignments of its initialized names, if any
	 */
	A.DefinitionsNode.prototype.to_assignments = function to_assignments(
		compressor
	) {
		const reduceVars = compressor.option("reduce_vars");
		/** @type {Node[]} */
		const assignments = [];

		for (const definition of this.declarations) {
			if (definition.init) {
				const name = makeNode(A.SymbolRefNode, definition.id, definition.id);
				assignments.push(
					makeNode(A.AssignNode, definition, {
						operator: "=",
						logical: false,
						left: name,
						right: definition.init
					})
				);
				if (reduceVars) name.definition().fixed = false;
			}
			const variable = definition.id.definition();
			variable.eliminated++;
			variable.replaced--;
		}

		if (assignments.length === 0) return null;
		return makeSequence(this, assignments);
	};

	defineOptimizer(A.DefinitionsNode, (self) => {
		if (self.declarations.length === 0) {
			return makeNode(A.EmptyStatementNode, self);
		}
		return self;
	});

	defineOptimizer(A.VarDefNode, (self, compressor) => {
		if (
			A.isSymbolLetNode(self.id) &&
			self.init !== null &&
			self.init !== undefined &&
			isUndefined(self.init, compressor)
		) {
			self.init = null;
		}
		return self;
	});

	defineOptimizer(A.ImportNode, (self) => self);
};

/**
 * Installs terser's optimizers of calls, `new`, sequences and unary and binary
 * operations, with the `lift_sequences` and `contains_optional` they call.
 * @param {MinifierModules} modules terser's modules
 * @param {OptimizerHelpers} helpers what the optimizers share
 * @returns {void}
 */
const installOperatorOptimizers = (modules, helpers) => {
	const { ast, common, flags, inference, utils } = modules;
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (ast);
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
		is_identifier_atom: isIdentifierAtom
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
		/** @type {(compressor: CompressorShape) => boolean | undefined} */ (
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
		A.isArrayNode(node) ||
		A.isLambdaNode(node) ||
		A.isObjectNode(node) ||
		A.isClassNode(node);

	/**
	 * terser's `[…].join(…)` folding, from inside its `CallNode` optimizer.
	 * @param {Node} self the call
	 * @param {Node} expression its callee, a `.join` read of an array literal
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node | null} what replaces the call, or null to go on
	 */
	const optimizeJoin = (self, expression, compressor) => {
		let separator;
		if (self.arguments.length > 0) {
			separator = self.arguments[0].evaluate(compressor);
			if (separator === self.arguments[0]) return null;
		}
		/** @type {(Node | null)[]} */
		const elements = [];
		/** @type {EXPECTED_ANY[]} */
		const constants = [];
		for (
			let i = 0, length = expression.object.elements.length;
			i < length;
			i++
		) {
			const element = expression.object.elements[i];
			if (A.isExpansionNode(element)) return null;
			// A hole evaluates as terser's hole node did: undefined, or itself.
			const value =
				element === null
					? compressor.option("evaluate")
						? undefined
						: null
					: element.evaluate(compressor);
			if (value !== element) {
				constants.push(value);
			} else {
				if (constants.length > 0) {
					elements.push(
						makeNode(A.StringNode, self, { value: constants.join(separator) })
					);
					constants.length = 0;
				}
				elements.push(element);
			}
		}
		if (constants.length > 0) {
			elements.push(
				makeNode(A.StringNode, self, { value: constants.join(separator) })
			);
		}
		if (elements.length === 0) {
			return makeNode(A.StringNode, self, { value: "" });
		}
		if (elements.length === 1) {
			if (elements[0] !== null && elements[0].is_string(compressor)) {
				return elements[0];
			}
			return makeNode(A.BinaryNode, /** @type {Node} */ (elements[0]), {
				operator: "+",
				left: makeNode(A.StringNode, self, { value: "" }),
				right: elements[0]
			});
		}
		// A separator of `0`, `false` or `[]` joins with "" here too.
		// eslint-disable-next-line eqeqeq
		if (separator == "") {
			// The separator evaluated, so each hole did too.
			const joined = /** @type {Node[]} */ (elements);
			const first =
				joined[0].is_string(compressor) || joined[1].is_string(compressor)
					? /** @type {Node} */ (joined.shift())
					: makeNode(A.StringNode, self, { value: "" });
			return joined
				.reduce(
					(previous, element) =>
						makeNode(A.BinaryNode, element, {
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
		node.callee = node.callee.clone();
		node.callee.object = node.callee.object.clone();
		node.callee.object.elements = elements;
		return bestOf(compressor, self, node);
	};

	defineOptimizer(A.CallNode, (self, compressor) => {
		const expression = self.callee;
		let fn = expression;
		inlineArrayLikeSpread(self.arguments);
		const simpleArgs = self.arguments.every(
			(/** @type {Node} */ argument) => !A.isExpansionNode(argument)
		);

		if (compressor.option("reduce_vars") && A.isSymbolRefNode(fn)) {
			fn = fn.fixed_value();
		}

		const isFunction = A.isLambdaNode(fn);

		if (isFunction && fn.pinned()) return self;

		if (
			compressor.option("unused") &&
			simpleArgs &&
			isFunction &&
			!fn.uses_arguments
		) {
			let position = 0;
			let last = 0;
			for (let i = 0, length = self.arguments.length; i < length; i++) {
				if (A.isExpansionNode(fn.params[i])) {
					if (hasFlag(fn.params[i].argument, UNUSED)) {
						while (i < length) {
							const node =
								self.arguments[i++].drop_side_effect_free(compressor);
							if (node) {
								self.arguments[position++] = node;
							}
						}
					} else {
						while (i < length) {
							self.arguments[position++] = self.arguments[i++];
						}
					}
					last = position;
					break;
				}
				const trim = i >= fn.params.length;
				if (trim || hasFlag(fn.params[i], UNUSED)) {
					const node = self.arguments[i].drop_side_effect_free(compressor);
					if (node) {
						self.arguments[position++] = node;
					} else if (!trim) {
						self.arguments[position++] = makeNode(
							A.NumberNode,
							self.arguments[i],
							{
								value: 0
							}
						);
						continue;
					}
				} else {
					self.arguments[position++] = self.arguments[i];
				}
				last = position;
			}
			self.arguments.length = last;
		}

		if (
			A.isDotNode(expression) &&
			A.isSymbolRefNode(expression.object) &&
			expression.object.name === "console" &&
			expression.object.definition().undeclared &&
			expression.property.name === "assert"
		) {
			const condition = self.arguments[0];
			if (condition) {
				const value = condition.evaluate(compressor);

				if (value === 1 || value === true) {
					return makeVoid0(self).optimize(compressor);
				}
			}
		}

		if (compressor.option("unsafe") && !expression.contains_optional()) {
			if (
				A.isDotNode(expression) &&
				expression.startToken.value === "Array" &&
				expression.property.name === "from" &&
				self.arguments.length === 1
			) {
				const [argument] = self.arguments;
				if (A.isArrayNode(argument)) {
					return makeNode(A.ArrayNode, argument, {
						elements: argument.elements
					}).optimize(compressor);
				}
			}
			if (isUndeclaredRef(expression)) {
				switch (expression.name) {
					case "Array":
						if (self.arguments.length !== 1) {
							return makeNode(A.ArrayNode, self, {
								elements: self.arguments
							}).optimize(compressor);
						} else if (
							A.isNumberNode(self.arguments[0]) &&
							self.arguments[0].value <= 11
						) {
							const elements = [];
							for (let i = 0; i < self.arguments[0].value; i++) {
								elements.push(null);
							}
							return new A.ArrayNode({ elements });
						}
						break;
					case "Object":
						if (self.arguments.length === 0) {
							return makeNode(A.ObjectNode, self, {
								properties: []
							});
						}
						break;
					case "String":
						if (self.arguments.length === 0) {
							return makeNode(A.StringNode, self, {
								value: ""
							});
						}
						if (self.arguments.length <= 1) {
							return makeNode(A.BinaryNode, self, {
								left: self.arguments[0],
								operator: "+",
								right: makeNode(A.StringNode, self, { value: "" })
							}).optimize(compressor);
						}
						break;
					case "Number":
						if (self.arguments.length === 0) {
							return makeNode(A.NumberNode, self, {
								value: 0
							});
						}
						if (
							self.arguments.length === 1 &&
							compressor.option("unsafe_math")
						) {
							return makeNode(A.UnaryPrefixNode, self, {
								argument: self.arguments[0],
								operator: "+"
							}).optimize(compressor);
						}
						break;
					case "Symbol":
						if (
							self.arguments.length === 1 &&
							A.isStringNode(self.arguments[0]) &&
							compressor.option("unsafe_symbols")
						) {
							self.arguments.length = 0;
						}
						break;
					case "Boolean":
						if (self.arguments.length === 0) return makeNode(A.FalseNode, self);
						if (self.arguments.length === 1) {
							return makeNode(A.UnaryPrefixNode, self, {
								argument: makeNode(A.UnaryPrefixNode, self, {
									argument: self.arguments[0],
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
							self.arguments.length >= 1 &&
							self.arguments.length <= 2 &&
							self.arguments.every((/** @type {Node} */ argument) => {
								const value = argument.evaluate(compressor);
								params.push(value);
								return argument !== value;
							}) &&
							regexpIsSafe(params[0])
						) {
							let [source] = params;
							const regexpFlags = params[1];
							source = regexpSourceFix(new RegExp(source).source);
							const regexp = makeNode(A.RegExpNode, self, {
								value: { source, flags: regexpFlags }
							});
							if (regexp._eval(compressor) !== regexp) {
								return regexp;
							}
						}
						break;
					}
				}
			} else if (A.isDotNode(expression)) {
				switch (expression.property.name) {
					case "toString":
						if (
							self.arguments.length === 0 &&
							!expression.object.may_throw_on_access(compressor)
						) {
							return makeNode(A.BinaryNode, self, {
								left: makeNode(A.StringNode, self, { value: "" }),
								operator: "+",
								right: expression.object
							}).optimize(compressor);
						}
						break;
					case "join":
						if (A.isArrayNode(expression.object)) {
							const joined = optimizeJoin(self, expression, compressor);
							if (joined) return joined;
						}
						break;
					case "charAt":
						if (expression.object.is_string(compressor)) {
							const argument = self.arguments[0];
							const index = argument ? argument.evaluate(compressor) : 0;
							if (index !== argument) {
								return makeNode(A.SubNode, expression, {
									object: expression.object,
									property: makeNodeFromConstant(
										index | 0,
										argument || expression
									),
									computed: true
								}).optimize(compressor);
							}
						}
						break;
					case "apply":
						if (
							self.arguments.length === 2 &&
							A.isArrayNode(self.arguments[1])
						) {
							const args = [...self.arguments[1].elements];
							args.unshift(self.arguments[0]);
							return makeNode(A.CallNode, self, {
								callee: makeNode(A.DotNode, expression, {
									object: expression.object,
									optional: false,
									property: new A.SymbolPropertyNode({ name: "call" }),
									computed: false
								}),
								arguments: args
							}).optimize(compressor);
						}
						break;
					case "call": {
						let func = expression.object;
						if (A.isSymbolRefNode(func)) {
							func = func.fixed_value();
						}
						if (A.isLambdaNode(func) && !func.contains_this()) {
							// terser passes its optimizer's `this`, undefined, so no position.
							return (
								self.arguments.length
									? makeSequence(undefined, [
											self.arguments[0],
											makeNode(A.CallNode, self, {
												callee: expression.object,
												arguments: self.arguments.slice(1)
											})
										])
									: makeNode(A.CallNode, self, {
											callee: expression.object,
											arguments: []
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
			if (self.arguments.length === 0) {
				return makeEmptyFunction(self).optimize(compressor);
			}
			if (
				self.arguments.every((/** @type {Node} */ argument) =>
					A.isStringNode(argument)
				)
			) {
				// A constant `new Function` body is minified as a function of its own:
				// https://github.com/mishoo/UglifyJS2/issues/203
				try {
					const code = `n(function(${self.arguments
						.slice(0, -1)
						.map((/** @type {Node} */ argument) => argument.value)
						.join(",")}){${self.arguments[self.arguments.length - 1].value}})`;
					let program = parse(code);
					const mangle = compressor.mangle_options();
					program.figure_out_scope(mangle);
					const innerCompressor = new Compressor(compressor.options, {
						mangle_options: compressor._mangle_options
					});
					assignNativeLookups(innerCompressor, modules.nativeObjects);
					program = program.transform(innerCompressor);
					const functionNode = /** @type {PrintFunction} */ (
						modules.mangledFunctionOf(program, mangle)
					);
					const stream = OutputStream();
					modules.printFunctionBody(functionNode, stream);
					self.arguments = [
						makeNode(A.StringNode, self, {
							value: functionNode.params
								.map((parameter) => modules.printEstreeToString(parameter))
								.join(",")
						}),
						makeNode(A.StringNode, self.arguments[self.arguments.length - 1], {
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
	A.SyntaxNode.prototype.contains_optional = function contains_optional() {
		if (A.isPropAccessNode(this) || A.isCallNode(this) || A.isChainNode(this)) {
			if (this.optional) {
				return true;
			}
			return (
				A.isCallNode(this)
					? this.callee
					: A.isPropAccessNode(this)
						? this.object
						: this.expression
			).contains_optional();
		}
		return false;
	};

	defineOptimizer(A.NewNode, (self, compressor) => {
		if (
			compressor.option("unsafe") &&
			isUndeclaredRef(self.callee) &&
			unsafeConstructors.includes(self.callee.name)
		) {
			return makeNode(A.CallNode, self, self).transform(compressor);
		}
		return self;
	});

	defineOptimizer(A.SequenceNode, (self, compressor) => {
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
			expressions[end] = makeNode(A.UnaryPrefixNode, self, {
				operator: "void",
				argument: expressions[end]
			});
			expressions.length = end + 1;
		}
		if (end === 0) {
			self = maintainThisBinding(
				compressor.parent(),
				compressor.self(),
				expressions[0]
			);
			if (!A.isSequenceNode(self)) self = self.optimize(compressor);
			return self;
		}
		self.expressions = expressions;
		return self;
	});

	/**
	 * @this {Node} a unary operation
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node} a sequence ending in the operation, where its operand was one
	 */
	A.UnaryNode.prototype.lift_sequences = function lift_sequences(compressor) {
		if (compressor.option("sequences") && A.isSequenceNode(this.argument)) {
			const expressions = [...this.argument.expressions];
			const clone = this.clone();
			clone.argument = /** @type {Node} */ (expressions.pop());
			expressions.push(clone);
			return makeSequence(this, expressions).optimize(compressor);
		}
		return this;
	};

	defineOptimizer(A.UnaryPostfixNode, (self, compressor) =>
		self.lift_sequences(compressor)
	);

	defineOptimizer(A.UnaryPrefixNode, (self, compressor) => {
		/** @type {Node | null} */ let expression = self.argument;
		if (
			self.operator === "delete" &&
			!(
				A.isSymbolRefNode(expression) ||
				A.isPropAccessNode(expression) ||
				A.isChainNode(expression) ||
				isIdentifierAtom(expression)
			)
		) {
			return makeSequence(self, [
				expression,
				makeNode(A.TrueNode, self)
			]).optimize(compressor);
		}
		if (
			self.operator === "void" &&
			A.isNumberNode(expression) &&
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
				self.argument = expression;
				return self;
			}
			return makeVoid0(self).optimize(compressor);
		}
		if (compressor.in_boolean_context()) {
			switch (self.operator) {
				case "!":
					if (A.isUnaryPrefixNode(expression) && expression.operator === "!") {
						return expression.argument;
					}
					if (A.isBinaryNode(expression)) {
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
						A.isSymbolRefNode(expression)
							? makeNode(A.TrueNode, self)
							: makeSequence(self, [expression, makeNode(A.TrueNode, self)])
					).optimize(compressor);
			}
		}
		if (self.operator === "-" && A.isInfinityNode(expression)) {
			expression = expression.transform(compressor);
		}
		if (
			A.isBinaryNode(expression) &&
			(self.operator === "+" || self.operator === "-") &&
			(expression.operator === "*" ||
				expression.operator === "/" ||
				expression.operator === "%")
		) {
			return makeNode(A.BinaryNode, self, {
				operator: expression.operator,
				left: makeNode(A.UnaryPrefixNode, expression.left, {
					operator: self.operator,
					argument: expression.left
				}),
				right: expression.right
			});
		}

		if (compressor.option("evaluate")) {
			// ~~x => x, where only 32 bits are read or x has no more
			if (
				self.operator === "~" &&
				A.isUnaryPrefixNode(self.argument) &&
				self.argument.operator === "~" &&
				(compressor.in_32_bit_context(false) ||
					self.argument.argument.is_32_bit_integer(compressor))
			) {
				return self.argument.argument;
			}

			// ~(x ^ y) => x ^ ~y, and ~(~x ^ y) => x ^ y
			if (
				self.operator === "~" &&
				A.isBinaryNode(expression) &&
				expression.operator === "^"
			) {
				if (
					A.isUnaryPrefixNode(expression.left) &&
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
				A.isNumberNode(expression) ||
				A.isInfinityNode(expression) ||
				A.isBigIntNode(expression)
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
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node} a sequence ending in the operation, where an operand was one
	 */
	A.BinaryNode.prototype.lift_sequences = function lift_sequences(compressor) {
		if (compressor.option("sequences")) {
			if (A.isSequenceNode(this.left)) {
				const expressions = [...this.left.expressions];
				const clone = this.clone();
				clone.left = /** @type {Node} */ (expressions.pop());
				expressions.push(clone);
				return makeSequence(this, expressions).optimize(compressor);
			}
			if (
				A.isSequenceNode(this.right) &&
				!this.left.has_side_effects(compressor)
			) {
				const assign = this.operator === "=" && A.isSymbolRefNode(this.left);
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

	defineOptimizer(A.BinaryNode, (self, compressor) => {
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
				A.isBinaryNode(self.left) &&
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
						self.left = makeNode(A.NullNode, self.left);
					} else if (
						!isStrictComparison &&
						isUndefined(self.right, compressor)
					) {
						self.right = makeNode(A.NullNode, self.right);
					} else if (
						compressor.option("typeofs") &&
						// "undefined" == typeof x => undefined === x
						A.isStringNode(self.left) &&
						self.left.value === "undefined" &&
						A.isUnaryPrefixNode(self.right) &&
						self.right.operator === "typeof"
					) {
						const expression = self.right.argument;
						if (
							A.isSymbolRefNode(expression)
								? expression.is_declared(compressor)
								: !(A.isPropAccessNode(expression) && compressor.option("ie8"))
						) {
							self.right = expression;
							self.left = makeVoid0(self.left).optimize(compressor);
							if (self.operator.length === 2) self.operator += "=";
						}
					} else if (
						compressor.option("typeofs") &&
						A.isUnaryPrefixNode(self.left) &&
						self.left.operator === "typeof" &&
						A.isStringNode(self.right) &&
						self.right.value === "undefined"
					) {
						const expression = self.left.argument;
						if (
							A.isSymbolRefNode(expression)
								? expression.is_declared(compressor)
								: !(A.isPropAccessNode(expression) && compressor.option("ie8"))
						) {
							self.left = expression;
							self.right = makeVoid0(self.right).optimize(compressor);
							if (self.operator.length === 2) self.operator += "=";
						}
					} else if (
						A.isSymbolRefNode(self.left) &&
						// obj !== obj => false
						A.isSymbolRefNode(self.right) &&
						self.left.definition() === self.right.definition() &&
						isObject(self.left.fixed_value())
					) {
						return makeNode(
							self.operator[0] === "=" ? A.TrueNode : A.FalseNode,
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
							makeNode(A.UnaryPrefixNode, node, {
								operator: "!",
								argument: node
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
						if (A.isNumberNode(self.left) && self.left.value === 0) {
							return asBooleanValue(self.right, self.operator[0] === "!");
						}
						if (A.isNumberNode(self.right) && self.right.value === 0) {
							return asBooleanValue(self.left, self.operator[0] === "!");
						}

						// (x & 0xFF) != 0xFF => !(~x & 0xFF)
						const andOperation = A.isBinaryNode(self.left)
							? self.left
							: A.isBinaryNode(self.right)
								? self.right
								: null;
						if (andOperation) {
							const mask = andOperation === self.left ? self.right : self.left;
							if (
								mask &&
								andOperation.operator === "&" &&
								A.isNumberNode(mask) &&
								mask.is_32_bit_integer(compressor)
							) {
								const operand = andOperation.left.equivalent_to(mask)
									? andOperation.right
									: andOperation.right.equivalent_to(mask)
										? andOperation.left
										: null;
								if (operand) {
									const optimized = asBooleanValue(
										makeNode(A.BinaryNode, self, {
											operator: "&",
											left: mask,
											right: makeNode(A.UnaryPrefixNode, self, {
												operator: "~",
												argument: operand
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
						A.isBinaryNode(lhs) &&
						lhs.operator === (self.operator === "&&" ? "!==" : "===") &&
						A.isBinaryNode(self.right) &&
						lhs.operator === self.right.operator &&
						((isUndefined(lhs.left, compressor) &&
							A.isNullNode(self.right.left)) ||
							(A.isNullNode(lhs.left) &&
								isUndefined(self.right.left, compressor))) &&
						!lhs.right.has_side_effects(compressor) &&
						lhs.right.equivalent_to(self.right.right)
					) {
						let combined = makeNode(A.BinaryNode, self, {
							operator: lhs.operator.slice(0, -1),
							left: makeNode(A.NullNode, self),
							right: lhs.right
						});
						if (lhs !== self.left) {
							combined = makeNode(A.BinaryNode, self, {
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
					makeNode(A.TrueNode, self)
				]).optimize(compressor);
			}
			if (rightValue && typeof rightValue === "string") {
				return makeSequence(self, [
					self.left,
					makeNode(A.TrueNode, self)
				]).optimize(compressor);
			}
		}
		if (compressor.option("comparisons") && self.is_boolean()) {
			if (
				!A.isBinaryNode(compressor.parent()) ||
				A.isAssignNode(compressor.parent())
			) {
				const negated = makeNode(A.UnaryPrefixNode, self, {
					operator: "!",
					argument: self.negate(compressor, firstInStatement(compressor))
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
				A.isStringNode(self.right) &&
				self.right.getValue() === "" &&
				self.left.is_string(compressor)
			) {
				return self.left;
			}
			if (
				A.isStringNode(self.left) &&
				self.left.getValue() === "" &&
				self.right.is_string(compressor)
			) {
				return self.right;
			}
			if (
				A.isBinaryNode(self.left) &&
				self.left.operator === "+" &&
				A.isStringNode(self.left.left) &&
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
					} else if (!A.isSyntaxNode(leftValue)) {
						return makeSequence(self, [self.left, self.right]).optimize(
							compressor
						);
					}
					const rightValue = self.right.evaluate(compressor);
					if (!rightValue) {
						if (compressor.in_boolean_context()) {
							return makeSequence(self, [
								self.left,
								makeNode(A.FalseNode, self)
							]).optimize(compressor);
						}
						setFlag(self, FALSY);
					} else if (!A.isSyntaxNode(rightValue)) {
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
							return makeNode(A.ConditionalNode, self, {
								test: self.left.left,
								consequent: self.right,
								alternate: self.left.right
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
					} else if (!A.isSyntaxNode(leftValue)) {
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
					} else if (!A.isSyntaxNode(rightValue)) {
						if (compressor.in_boolean_context()) {
							return makeSequence(self, [
								self.left,
								makeNode(A.TrueNode, self)
							]).optimize(compressor);
						}
						setFlag(self, TRUTHY);
					}
					if (self.left.operator === "&&") {
						const leftRightValue = self.left.right.evaluate(compressor);
						if (leftRightValue && !A.isSyntaxNode(leftRightValue)) {
							return makeNode(A.ConditionalNode, self, {
								test: self.left.left,
								consequent: self.left.right,
								alternate: self.right
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
					if (!A.isSyntaxNode(leftValue)) {
						return leftValue === null || leftValue === undefined
							? self.right
							: self.left;
					}

					if (compressor.in_boolean_context()) {
						const rightValue = self.right.evaluate(compressor);
						if (!A.isSyntaxNode(rightValue) && !rightValue) {
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
						A.isConstantNode(self.right) &&
						A.isBinaryNode(self.left) &&
						self.left.operator === "+" &&
						self.left.is_string(compressor)
					) {
						const binary = makeNode(A.BinaryNode, self, {
							operator: "+",
							left: self.left.right,
							right: self.right
						});
						const optimized = binary.optimize(compressor);
						if (binary !== optimized) {
							self = makeNode(A.BinaryNode, self, {
								operator: "+",
								left: self.left.left,
								right: optimized
							});
						}
					}
					// (x + "foo") + ("bar" + y) => (x + "foobar") + y
					if (
						A.isBinaryNode(self.left) &&
						self.left.operator === "+" &&
						self.left.is_string(compressor) &&
						A.isBinaryNode(self.right) &&
						self.right.operator === "+" &&
						self.right.is_string(compressor)
					) {
						const binary = makeNode(A.BinaryNode, self, {
							operator: "+",
							left: self.left.right,
							right: self.right.left
						});
						const optimized = binary.optimize(compressor);
						if (binary !== optimized) {
							self = makeNode(A.BinaryNode, self, {
								operator: "+",
								left: makeNode(A.BinaryNode, self.left, {
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
						A.isUnaryPrefixNode(self.right) &&
						self.right.operator === "-" &&
						self.left.is_number_or_bigint(compressor)
					) {
						self = makeNode(A.BinaryNode, self, {
							operator: "-",
							left: self.left,
							right: self.right.argument
						});
						break;
					}
					// -a + b => b - a
					if (
						A.isUnaryPrefixNode(self.left) &&
						self.left.operator === "-" &&
						reversible() &&
						self.right.is_number_or_bigint(compressor)
					) {
						self = makeNode(A.BinaryNode, self, {
							operator: "-",
							left: self.right,
							right: self.left.argument
						});
						break;
					}
					// `foo${bar}baz` + 1 => `foo${bar}baz1`
					if (A.isTemplateStringNode(self.left)) {
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
					if (A.isTemplateStringNode(self.right)) {
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
						A.isTemplateStringNode(self.left) &&
						A.isTemplateStringNode(self.right)
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
							A.isBinaryNode(self.left) &&
							self.left.operator !== self.operator &&
							PRECEDENCE[self.left.operator] >= PRECEDENCE[self.operator]
						)
					) {
						const reversed = makeNode(A.BinaryNode, self, {
							operator: self.operator,
							left: self.right,
							right: self.left
						});
						self =
							A.isConstantNode(self.right) && !A.isConstantNode(self.left)
								? bestOf(compressor, reversed, self)
								: bestOf(compressor, self, reversed);
					}
					if (associative && self.is_number_or_bigint(compressor)) {
						// a + (b + c) => (a + b) + c
						if (
							A.isBinaryNode(self.right) &&
							self.right.operator === self.operator
						) {
							self = makeNode(A.BinaryNode, self, {
								operator: self.operator,
								left: makeNode(A.BinaryNode, self.left, {
									operator: self.operator,
									left: self.left,
									right: self.right.left,
									startToken: self.left.startToken,
									endToken: self.right.left.endToken
								}),
								right: self.right.right
							});
						}
						// (n + 2) + 3 => 5 + n, and (2 * n) * 3 => 6 * n
						if (
							A.isConstantNode(self.right) &&
							A.isBinaryNode(self.left) &&
							self.left.operator === self.operator
						) {
							if (A.isConstantNode(self.left.left)) {
								self = makeNode(A.BinaryNode, self, {
									operator: self.operator,
									left: makeNode(A.BinaryNode, self.left, {
										operator: self.operator,
										left: self.left.left,
										right: self.right,
										startToken: self.left.left.startToken,
										endToken: self.right.endToken
									}),
									right: self.left.right
								});
							} else if (A.isConstantNode(self.left.right)) {
								self = makeNode(A.BinaryNode, self, {
									operator: self.operator,
									left: makeNode(A.BinaryNode, self.left, {
										operator: self.operator,
										left: self.left.right,
										right: self.right,
										startToken: self.left.right.startToken,
										endToken: self.right.endToken
									}),
									right: self.left.left
								});
							}
						}
						// (a | 1) | (2 | d) => (3 | a) | d
						if (
							A.isBinaryNode(self.left) &&
							self.left.operator === self.operator &&
							A.isConstantNode(self.left.right) &&
							A.isBinaryNode(self.right) &&
							self.right.operator === self.operator &&
							A.isConstantNode(self.right.left)
						) {
							self = makeNode(A.BinaryNode, self, {
								operator: self.operator,
								left: makeNode(A.BinaryNode, self.left, {
									operator: self.operator,
									left: makeNode(A.BinaryNode, self.left.left, {
										operator: self.operator,
										left: self.left.right,
										right: self.right.left,
										startToken: self.left.right.startToken,
										endToken: self.right.left.endToken
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
					A.isBinaryNode(self.right) &&
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
							self = makeNode(A.BinaryNode, self, {
								operator: self.operator,
								left: zNode,
								right: xNode
							});
						} else {
							const reorderedOperations = makeNode(A.BinaryNode, self, {
								operator: "|",
								left: makeNode(A.BinaryNode, self, {
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
					self.left = makeNode(A.NumberNode, self, { value: 0 });
					self.operator = "|";
				}

				// ~x ^ ~y => x ^ y
				if (
					self.operator === "^" &&
					A.isUnaryPrefixNode(self.left) &&
					self.left.operator === "~" &&
					A.isUnaryPrefixNode(self.right) &&
					self.right.operator === "~"
				) {
					self = makeNode(A.BinaryNode, self, {
						operator: "^",
						left: self.left.argument,
						right: self.right.argument
					});
				}

				// x << 0 => x | 0, and x >> 0 => x | 0
				if (
					(self.operator === "<<" || self.operator === ">>") &&
					A.isNumberNode(self.right) &&
					self.right.value === 0
				) {
					self.operator = "|";
				}

				// {32 bit integer} | 0 => {32 bit integer}, and ^ 0 likewise
				const zeroSide =
					A.isNumberNode(self.right) && self.right.value === 0
						? self.right
						: A.isNumberNode(self.left) && self.left.value === 0
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
					(A.isNumberNode(node) && node.value === -1) ||
					(A.isUnaryPrefixNode(node) &&
						node.operator === "-" &&
						A.isNumberNode(node.argument) &&
						node.argument.value === 1);

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
			A.isBinaryNode(self.right) &&
			self.right.operator === self.operator &&
			(lazyOperators.has(self.operator) ||
				(self.operator === "+" &&
					(self.right.left.is_string(compressor) ||
						(self.left.is_string(compressor) &&
							self.right.right.is_string(compressor)))))
		) {
			self.left = makeNode(A.BinaryNode, self.left, {
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
 * @param {MinifierModules} modules terser's modules
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

	defineOptimizer(A.SymbolExportNode, (self) => self);

	defineOptimizer(A.SymbolRefNode, (self, compressor) => {
		if (
			!compressor.option("ie8") &&
			isUndeclaredRef(self) &&
			!compressor.find_parent(A.isWithNode)
		) {
			switch (self.name) {
				case "undefined":
					return makeNode(A.UndefinedNode, self).optimize(compressor);
				case "NaN":
					return makeNode(A.NaNNode, self).optimize(compressor);
				case "Infinity":
					return makeNode(A.InfinityNode, self).optimize(compressor);
			}
		}
		if (compressor.option("reduce_vars") && !compressor.is_lhs()) {
			return inlineIntoSymbolRef(self, compressor);
		}
		return self;
	});

	defineOptimizer(A.UndefinedNode, (self, compressor) => {
		const symbolRef = unsafeUndefinedRef(self, compressor);
		if (symbolRef) return symbolRef;
		const lhs = compressor.is_lhs();
		if (lhs && isAtomic(lhs, self)) return self;
		return makeVoid0(self);
	});

	defineOptimizer(A.InfinityNode, (self, compressor) => {
		const lhs = compressor.is_lhs();
		if (lhs && isAtomic(lhs, self)) return self;
		if (
			compressor.option("keep_infinity") &&
			!(lhs && !isAtomic(lhs, self)) &&
			!findVariable(compressor, "Infinity")
		) {
			return self;
		}
		return makeNode(A.BinaryNode, self, {
			operator: "/",
			left: makeNode(A.NumberNode, self, { value: 1 }),
			right: makeNode(A.NumberNode, self, { value: 0 })
		});
	});

	defineOptimizer(A.NaNNode, (self, compressor) => {
		const lhs = compressor.is_lhs();
		if ((lhs && !isAtomic(lhs, self)) || findVariable(compressor, "NaN")) {
			return makeNode(A.BinaryNode, self, {
				operator: "/",
				left: makeNode(A.NumberNode, self, { value: 0 }),
				right: makeNode(A.NumberNode, self, { value: 0 })
			});
		}
		return self;
	});

	/**
	 * terser's `in_try`: whether a `try` between an exit and the assigned
	 * variable's function could still observe the assignment.
	 * @param {Node} self the assignment
	 * @param {CompressorShape} compressor the compressor
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
			self.right = makeNode(A.NullNode, right);
			const mayThrow = exit.may_throw(compressor);
			self.right = right;
			return mayThrow;
		};
		const stopAt = self.left.definition().scope.get_defun_scope();
		let parent;
		while ((parent = compressor.parent(level++)) !== stopAt) {
			if (A.isTryNode(parent)) {
				if (parent.finalizer) return true;
				if (parent.handler && mayAssignmentThrow()) return true;
			}
		}
		return undefined;
	};

	defineOptimizer(A.AssignNode, (self, compressor) => {
		if (self.logical) {
			return self.lift_sequences(compressor);
		}
		// x = x ---> x
		if (
			self.operator === "=" &&
			A.isSymbolRefNode(self.left) &&
			self.left.name !== "arguments" &&
			!self.left.definition().undeclared &&
			self.right.equivalent_to(self.left)
		) {
			return self.right;
		}
		let definition;
		if (
			compressor.option("dead_code") &&
			A.isSymbolRefNode(self.left) &&
			(definition = self.left.definition()).scope ===
				compressor.find_parent(A.isLambdaNode)
		) {
			let level = 0;
			let node;
			let parent = self;
			do {
				node = parent;
				parent = compressor.parent(level++);
				if (A.isExitNode(parent)) {
					if (inTry(self, compressor, level, parent)) break;
					if (isReachable(definition.scope, [definition])) break;
					if (self.operator === "=") return self.right;
					definition.fixed = false;
					return makeNode(A.BinaryNode, self, {
						operator: self.operator.slice(0, -1),
						left: self.left,
						right: self.right
					}).optimize(compressor);
				}
			} while (
				(A.isBinaryNode(parent) && parent.right === node) ||
				(A.isSequenceNode(parent) && parent.tail_node() === node)
			);
		}
		const assign = self.lift_sequences(compressor);
		if (
			assign.operator === "=" &&
			A.isSymbolRefNode(assign.left) &&
			A.isBinaryNode(assign.right)
		) {
			if (
				A.isSymbolRefNode(assign.right.left) &&
				assign.right.left.name === assign.left.name &&
				assignOperators.has(assign.right.operator)
			) {
				// x = x - 2  --->  x -= 2
				assign.operator = `${assign.right.operator}=`;
				assign.right = assign.right.right;
			} else if (
				A.isSymbolRefNode(assign.right.right) &&
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

	defineOptimizer(A.DefaultAssignNode, (self, compressor) => {
		if (!compressor.option("evaluate")) {
			return self;
		}
		let evaluateRight = self.right.evaluate(compressor);
		if (evaluateRight === undefined) {
			// `[x = undefined] = foo` ---> `[x] = foo`, and a parameter the same
			// way unless `keep_fargs`, or where its function is called at once.
			const lambda = compressor.parent();
			if (!A.isLambdaNode(lambda)) return self.left;
			if (compressor.option("keep_fargs") === false) return self.left;
			const iife = compressor.parent(1);
			if (A.isCallNode(iife) && !A.isNewNode(iife) && iife.callee === lambda) {
				return self.left;
			}
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
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether it does
	 */
	const isNullishCheck = (check, subject, compressor) => {
		if (subject.may_throw(compressor)) return false;
		let nullishSide;
		// foo == null
		if (
			A.isBinaryNode(check) &&
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
		if (A.isBinaryNode(check) && check.operator === "||") {
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
					A.isBinaryNode(comparison) &&
					(comparison.operator === "===" || comparison.operator === "==")
				)) {
					return false;
				}
				let found = 0;
				let definedSide;
				if (A.isNullNode(comparison.left)) {
					found++;
					nullComparison = comparison;
					definedSide = comparison.right;
				}
				if (A.isNullNode(comparison.right)) {
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
		const first = consequent.arguments;
		const second = alternative.arguments;
		for (let i = 0, length = first.length; i < length; i++) {
			if (A.isExpansionNode(first[i])) return undefined;
			if (!first[i].equivalent_to(second[i])) {
				if (A.isExpansionNode(second[i])) return undefined;
				for (let j = i + 1; j < length; j++) {
					if (A.isExpansionNode(first[j])) return undefined;
					if (!first[j].equivalent_to(second[j])) return undefined;
				}
				return i;
			}
		}
		return undefined;
	};

	defineOptimizer(A.ConditionalNode, (self, compressor) => {
		if (!compressor.option("conditionals")) return self;
		// This looks like lift_sequences(), should probably be under "sequences"
		if (A.isSequenceNode(self.test)) {
			const expressions = [...self.test.expressions];
			self.test = /** @type {Node} */ (expressions.pop());
			expressions.push(self);
			return makeSequence(self, expressions);
		}
		const evaluated = self.test.evaluate(compressor);
		if (evaluated !== self.test) {
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
				self.alternate
			);
		}
		const negated = evaluated.negate(
			compressor,
			firstInStatement(
				/** @type {Parameters<typeof firstInStatement>[0]} */ (compressor)
			)
		);
		if (bestOf(compressor, evaluated, negated) === negated) {
			self = makeNode(A.ConditionalNode, self, {
				test: negated,
				consequent: self.alternate,
				alternate: self.consequent
			});
		}
		const condition = self.test;
		const consequent = self.consequent;
		const alternative = self.alternate;
		// x?x:y --> x||y
		if (
			A.isSymbolRefNode(condition) &&
			A.isSymbolRefNode(consequent) &&
			condition.definition() === consequent.definition()
		) {
			return makeNode(A.BinaryNode, self, {
				operator: "||",
				left: condition,
				right: alternative
			});
		}
		// if (foo) exp = something; else exp = something_else;
		// ---> exp = foo ? something : something_else;
		if (
			A.isAssignNode(consequent) &&
			A.isAssignNode(alternative) &&
			consequent.operator === alternative.operator &&
			consequent.logical === alternative.logical &&
			consequent.left.equivalent_to(alternative.left) &&
			(!self.test.has_side_effects(compressor) ||
				(consequent.operator === "=" &&
					!consequent.left.has_side_effects(compressor)))
		) {
			return makeNode(A.AssignNode, self, {
				operator: consequent.operator,
				left: consequent.left,
				logical: consequent.logical,
				right: makeNode(A.ConditionalNode, self, {
					test: self.test,
					consequent: consequent.right,
					alternate: alternative.right
				})
			});
		}
		// x ? y(a) : y(b) --> y(x ? a : b)
		let argumentIndex;
		if (
			A.isCallNode(consequent) &&
			alternative.TYPE === consequent.TYPE &&
			consequent.arguments.length > 0 &&
			consequent.arguments.length === alternative.arguments.length &&
			consequent.callee.equivalent_to(alternative.callee) &&
			!self.test.has_side_effects(compressor) &&
			!consequent.callee.has_side_effects(compressor) &&
			typeof (argumentIndex = singleArgumentDifference(
				consequent,
				alternative
			)) === "number"
		) {
			const node = consequent.clone();
			node.arguments[argumentIndex] = makeNode(A.ConditionalNode, self, {
				test: self.test,
				consequent: consequent.arguments[argumentIndex],
				alternate: alternative.arguments[argumentIndex]
			});
			return node;
		}
		// a ? b : c ? b : d --> (a || c) ? b : d
		if (
			A.isConditionalNode(alternative) &&
			consequent.equivalent_to(alternative.consequent)
		) {
			return makeNode(A.ConditionalNode, self, {
				test: makeNode(A.BinaryNode, self, {
					operator: "||",
					left: condition,
					right: alternative.test
				}),
				consequent,
				alternate: alternative.alternate
			}).optimize(compressor);
		}
		// a == null ? b : a -> a ?? b
		if (
			compressor.option("ecma") >= 2020 &&
			isNullishCheck(condition, alternative, compressor)
		) {
			return makeNode(A.BinaryNode, self, {
				operator: "??",
				left: alternative,
				right: consequent
			}).optimize(compressor);
		}
		// a ? b : (c, b) --> (a || c), b
		if (
			A.isSequenceNode(alternative) &&
			consequent.equivalent_to(
				alternative.expressions[alternative.expressions.length - 1]
			)
		) {
			return makeSequence(self, [
				makeNode(A.BinaryNode, self, {
					operator: "||",
					left: condition,
					right: makeSequence(self, alternative.expressions.slice(0, -1))
				}),
				consequent
			]).optimize(compressor);
		}
		// a ? b : (c && b) --> (a || c) && b
		if (
			A.isBinaryNode(alternative) &&
			alternative.operator === "&&" &&
			consequent.equivalent_to(alternative.right)
		) {
			return makeNode(A.BinaryNode, self, {
				operator: "&&",
				left: makeNode(A.BinaryNode, self, {
					operator: "||",
					left: condition,
					right: alternative.left
				}),
				right: consequent
			}).optimize(compressor);
		}
		// x?y?z:a:a --> x&&y?z:a
		if (
			A.isConditionalNode(consequent) &&
			consequent.alternate.equivalent_to(alternative)
		) {
			return makeNode(A.ConditionalNode, self, {
				test: makeNode(A.BinaryNode, self, {
					left: self.test,
					operator: "&&",
					right: consequent.test
				}),
				consequent: consequent.consequent,
				alternate: alternative
			});
		}
		// x ? y : y --> x, y
		if (consequent.equivalent_to(alternative)) {
			return makeSequence(self, [self.test, consequent]).optimize(compressor);
		}
		// x ? y || z : z --> x && y || z
		if (
			A.isBinaryNode(consequent) &&
			consequent.operator === "||" &&
			consequent.right.equivalent_to(alternative)
		) {
			return makeNode(A.BinaryNode, self, {
				operator: "||",
				left: makeNode(A.BinaryNode, self, {
					operator: "&&",
					left: self.test,
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
			return makeNode(A.UnaryPrefixNode, node, {
				operator: "!",
				argument: node.negate(compressor)
			});
		};
		/**
		 * @param {Node} node an expression
		 * @returns {EXPECTED_ANY} truthy where it is `true` or `!0`, or truthy in a boolean context
		 */
		const isTrue = (node) =>
			A.isTrueNode(node) ||
			(inBoolean && A.isConstantNode(node) && node.getValue()) ||
			(A.isUnaryPrefixNode(node) &&
				node.operator === "!" &&
				A.isConstantNode(node.argument) &&
				!node.argument.getValue());
		/**
		 * @param {Node} node an expression
		 * @returns {EXPECTED_ANY} truthy where it is `false` or `!1`, or falsy in a boolean context
		 */
		const isFalse = (node) =>
			A.isFalseNode(node) ||
			(inBoolean && A.isConstantNode(node) && !node.getValue()) ||
			(A.isUnaryPrefixNode(node) &&
				node.operator === "!" &&
				A.isConstantNode(node.argument) &&
				node.argument.getValue());
		if (isTrue(self.consequent)) {
			if (isFalse(self.alternate)) {
				// c ? true : false ---> !!c
				return toBooleanValue(self.test);
			}
			// c ? true : x ---> !!c || x
			return makeNode(A.BinaryNode, self, {
				operator: "||",
				left: toBooleanValue(self.test),
				right: self.alternate
			});
		}
		if (isFalse(self.consequent)) {
			if (isTrue(self.alternate)) {
				// c ? false : true ---> !c
				return toBooleanValue(self.test.negate(compressor));
			}
			// c ? false : x ---> !c && x
			return makeNode(A.BinaryNode, self, {
				operator: "&&",
				left: toBooleanValue(self.test.negate(compressor)),
				right: self.alternate
			});
		}
		if (isTrue(self.alternate)) {
			// c ? x : true ---> !c || x
			return makeNode(A.BinaryNode, self, {
				operator: "||",
				left: toBooleanValue(self.test.negate(compressor)),
				right: self.consequent
			});
		}
		if (isFalse(self.alternate)) {
			// c ? x : false ---> !!c && x
			return makeNode(A.BinaryNode, self, {
				operator: "&&",
				left: toBooleanValue(self.test),
				right: self.consequent
			});
		}
		return self;
	});

	defineOptimizer(A.BooleanNode, (self, compressor) => {
		if (compressor.in_boolean_context()) {
			return makeNode(A.NumberNode, self, { value: Number(self.value) });
		}
		const parent = compressor.parent();
		if (compressor.option("booleans_as_integers")) {
			if (
				A.isBinaryNode(parent) &&
				(parent.operator === "===" || parent.operator === "!==")
			) {
				parent.operator = parent.operator.replace(/[=]$/, "");
			}
			return makeNode(A.NumberNode, self, { value: Number(self.value) });
		}
		if (compressor.option("booleans")) {
			if (
				A.isBinaryNode(parent) &&
				(parent.operator === "==" || parent.operator === "!=")
			) {
				return makeNode(A.NumberNode, self, { value: Number(self.value) });
			}
			return makeNode(A.UnaryPrefixNode, self, {
				operator: "!",
				argument: makeNode(A.NumberNode, self, { value: 1 - self.value })
			});
		}
		return self;
	});

	/**
	 * terser's `safe_to_flatten`: whether a value can be read out of the literal
	 * holding it without changing what `this` it sees.
	 * @param {Node} value the value, or a reference to it; undefined past the end
	 * @param {CompressorShape} compressor the compressor
	 * @returns {boolean} whether it can
	 */
	const safeToFlatten = (value, compressor) => {
		const fixed = A.isSymbolRefNode(value) ? value.fixed_value() : value;
		if (!fixed) return false;
		if (!(A.isLambdaNode(fixed) || A.isClassNode(fixed))) {
			return true;
		}
		if (!(A.isLambdaNode(fixed) && fixed.contains_this())) return true;
		return A.isNewNode(compressor.parent());
	};

	/**
	 * terser's `flatten_object`: `{a: x, b: y}.b` as `[x, y][1]`.
	 * @this {Node} a property read
	 * @param {string} key the property read
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node | undefined} the array read, where one fits
	 */
	A.PropAccessNode.prototype.flatten_object = function flatten_object(
		key,
		compressor
	) {
		if (!compressor.option("properties")) return undefined;
		if (key === "__proto__") return undefined;
		if (A.isDotHashNode(this)) return undefined;
		const arrows =
			compressor.option("unsafe_arrows") && compressor.option("ecma") >= 2015;
		const expression = this.object;
		if (A.isObjectNode(expression)) {
			const properties = expression.properties;
			for (let i = properties.length; --i >= 0;) {
				const property = properties[i];
				if (
					String(
						A.isConciseMethodNode(property)
							? property.key.name
							: A.terserKey(property.key)
					) === key
				) {
					const everyPropertyFlattens = properties.every(
						(/** @type {Node} */ item) =>
							(A.isObjectKeyValNode(item) ||
								(arrows &&
									A.isConciseMethodNode(item) &&
									!item.value.generator)) &&
							!item.computed
					);
					if (!everyPropertyFlattens) return undefined;
					if (!safeToFlatten(property.value, compressor)) return undefined;
					return makeNode(A.SubNode, this, {
						object: makeNode(A.ArrayNode, expression, {
							elements: properties.map((/** @type {Node} */ item) => {
								let value = item.value;
								if (A.isAccessorNode(value)) {
									value = makeNode(A.FunctionNode, value, value);
								}
								const itemKey = A.terserKey(item.key);
								if (A.isSyntaxNode(itemKey) && !A.isSymbolMethodNode(itemKey)) {
									return makeSequence(item, [itemKey, value]);
								}
								return value;
							})
						}),
						property: makeNode(A.NumberNode, this, { value: i }),
						computed: true
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {Node} expression what it reads from
	 * @param {Node} property the property it reads
	 * @returns {Node | undefined} a reference to the parameter, where one fits
	 */
	const argumentsParameter = (self, compressor, expression, property) => {
		let lambda;
		if (!(
			compressor.option("arguments") &&
			A.isSymbolRefNode(expression) &&
			expression.name === "arguments" &&
			expression.definition().orig.length === 1 &&
			A.isLambdaNode((lambda = expression.scope)) &&
			lambda.uses_arguments &&
			!A.isArrowNode(lambda) &&
			A.isNumberNode(property)
		)) {
			return undefined;
		}
		const index = property.getValue();
		const names = new Set();
		const parameters = lambda.params;
		for (let i = 0; i < parameters.length; i++) {
			// A destructuring or a repeated parameter leaves `arguments` as it is.
			if (!A.isSymbolFunargNode(parameters[i])) return undefined;
			const name = parameters[i].name;
			if (names.has(name)) return undefined;
			names.add(name);
		}
		/** @type {Node | null} */ let parameter = lambda.params[index];
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
			index < lambda.params.length + 5
		) {
			while (index >= lambda.params.length) {
				parameter = lambda.create_symbol(A.SymbolFunargNode, {
					source: lambda,
					scope: lambda,
					tentative_name: `argument_${lambda.params.length}`
				});
				lambda.params.push(/** @type {Node} */ (parameter));
			}
		}
		if (parameter) {
			const symbol = makeNode(A.SymbolRefNode, self, parameter);
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {Node} expression the array it reads from
	 * @param {Node} property the number it reads
	 * @returns {Node | undefined} the replacement, where one fits
	 */
	const flattenArrayRead = (self, compressor, expression, property) => {
		let index = property.getValue();
		const elements = expression.elements;
		/** @type {Node | null} */
		const returnValue = elements[index];
		// A hole, null here, flattens to `void 0` as terser's hole node did.
		if (returnValue !== null && !safeToFlatten(returnValue, compressor)) {
			return undefined;
		}
		let flatten = true;
		/** @type {Node[]} */
		const values = [];
		// Shared by both loops: the second resumes where the first stops.
		let i = elements.length;
		while (--i > index) {
			const element = elements[i];
			const value =
				element === null ? null : element.drop_side_effect_free(compressor);
			if (value) {
				values.unshift(value);
				if (flatten && value.has_side_effects(compressor)) flatten = false;
			}
		}
		if (A.isExpansionNode(returnValue)) return undefined;
		const returned = returnValue === null ? makeVoid0(undefined) : returnValue;
		if (!flatten) values.unshift(returned);
		while (--i >= 0) {
			/** @type {Node | null} */ let value = elements[i];
			if (A.isExpansionNode(value)) return undefined;
			value = value === null ? null : value.drop_side_effect_free(compressor);
			if (value) values.unshift(value);
			else index--;
		}
		if (flatten) {
			values.push(returned);
			return makeSequence(self, values).optimize(compressor);
		}
		return makeNode(A.SubNode, self, {
			object: makeNode(A.ArrayNode, expression, { elements: values }),
			property: makeNode(A.NumberNode, property, { value: index }),
			computed: true
		});
	};

	defineOptimizer(A.SubNode, (self, compressor) => {
		let expression = self.object;
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
					return makeNode(A.DotNode, self, {
						object: expression,
						optional: self.optional,
						property: new A.SymbolPropertyNode({ name }),
						quote: property.quote,
						computed: false
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
				expression = self.object = sub.object;
				property = self.property = sub.property;
			}
		}
		if (
			compressor.option("properties") &&
			compressor.option("side_effects") &&
			A.isNumberNode(property) &&
			A.isArrayNode(expression)
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

	defineOptimizer(A.ChainNode, (self, compressor) => {
		if (isNullish(self.expression, compressor)) {
			const parent = compressor.parent();
			// `delete undefined` would read as a syntax error once the delete is
			// optimized, where `delete 0` is fine.
			if (A.isUnaryPrefixNode(parent) && parent.operator === "delete") {
				return makeNodeFromConstant(0, self);
			}
			return makeVoid0(self).optimize(compressor);
		}
		if (A.isPropAccessNode(self.expression) || A.isCallNode(self.expression)) {
			return self;
		}
		// Keep the AST valid, in case the child swapped itself.
		return self.expression;
	});

	defineOptimizer(A.DotNode, (self, compressor) => {
		const parent = compressor.parent();
		if (compressor.is_lhs()) return self;
		if (
			compressor.option("unsafe_proto") &&
			A.isDotNode(self.object) &&
			self.object.property.name === "prototype"
		) {
			const expression = self.object.object;
			if (isUndeclaredRef(expression)) {
				switch (expression.name) {
					case "Array":
						self.object = makeNode(A.ArrayNode, self.object, {
							elements: []
						});
						break;
					case "Function":
						self.object = makeEmptyFunction(self.object);
						break;
					case "Number":
						self.object = makeNode(A.NumberNode, self.object, {
							value: 0
						});
						break;
					case "Object":
						self.object = makeNode(A.ObjectNode, self.object, {
							properties: []
						});
						break;
					case "RegExp":
						self.object = makeNode(A.RegExpNode, self.object, {
							value: { source: "t", flags: "" }
						});
						break;
					case "String":
						self.object = makeNode(A.StringNode, self.object, {
							value: ""
						});
						break;
				}
			}
		}
		if (!A.isCallNode(parent) || !hasAnnotation(parent, _NOINLINE)) {
			const sub = self.flatten_object(self.property.name, compressor);
			if (sub) return sub.optimize(compressor);
		}
		if (A.isPropAccessNode(self.object) && A.isPropAccessNode(parent)) {
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
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node} what replaces it
	 */
	const literalsInBooleanContext = (self, compressor) => {
		if (compressor.in_boolean_context()) {
			return bestOf(
				compressor,
				self,
				makeSequence(self, [self, makeNode(A.TrueNode, self)]).optimize(
					compressor
				)
			);
		}
		return self;
	};

	defineOptimizer(A.ArrayNode, (self, compressor) => {
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
			if (A.isExpansionNode(property)) {
				const expression = property.argument;
				if (
					A.isObjectNode(expression) &&
					expression.properties.every((/** @type {Node} */ item) =>
						A.isObjectKeyValNode(item)
					)
				) {
					properties.splice(i, 1, ...expression.properties);
					// The property at `i` is a new one.
					i--;
				} else if (
					// `is_constant()` is false for a regular expression, hence both.
					(A.isConstantNode(expression) || expression.is_constant()) &&
					!A.isStringNode(expression)
				) {
					properties.splice(i, 1);
					i--;
				}
			}
		}
	};

	defineOptimizer(A.ObjectNode, (self, compressor) => {
		const optimized = literalsInBooleanContext(self, compressor);
		if (optimized !== self) {
			return optimized;
		}
		inlineObjectPropertySpread(self.properties);
		return self;
	});

	defineOptimizer(A.RegExpNode, literalsInBooleanContext);

	defineOptimizer(A.ReturnNode, (self, compressor) => {
		if (self.argument && isUndefined(self.argument, compressor)) {
			self.argument = NO_NODE;
		}
		return self;
	});

	defineOptimizer(A.ArrowNode, optimizeLambda);

	defineOptimizer(A.FunctionNode, (self, compressor) => {
		const lambda = optimizeLambda(self, compressor);
		if (
			compressor.option("unsafe_arrows") &&
			compressor.option("ecma") >= 2015 &&
			!lambda.id &&
			!lambda.generator &&
			!lambda.uses_arguments &&
			!lambda.pinned()
		) {
			const usesThis = walk(lambda, (/** @type {Node} */ node) => {
				if (A.isThisNode(node)) return walkAbort;
				return undefined;
			});
			if (!usesThis) {
				return makeNode(A.ArrowNode, lambda, lambda).optimize(compressor);
			}
		}
		return lambda;
	});

	defineOptimizer(A.ClassNode, (self) => {
		for (let i = 0; i < self.body.body.length; i++) {
			const property = self.body.body[i];
			if (A.isClassStaticBlockNode(property) && property.body.length === 0) {
				self.body.body.splice(i, 1);
				i--;
			}
		}
		return self;
	});

	defineOptimizer(A.ClassStaticBlockNode, (self, compressor) => {
		tightenBody(self.body, compressor);
		return self;
	});

	defineOptimizer(A.YieldNode, (self, compressor) => {
		if (
			self.argument &&
			!self.delegate &&
			isUndefined(self.argument, compressor)
		) {
			self.argument = NO_NODE;
		}
		return self;
	});

	defineOptimizer(A.TemplateStringNode, (self, compressor) => {
		if (
			!compressor.option("evaluate") ||
			A.isPrefixedTemplateStringNode(compressor.parent())
		) {
			return self;
		}
		/** @type {Node[]} */
		const segments = [];
		for (let i = 0; i < self.segments.length; i++) {
			let segment = self.segments[i];
			if (A.isSyntaxNode(segment)) {
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
				if (A.isTemplateStringNode(segment)) {
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
			return makeNode(A.StringNode, self, segments[0]);
		}
		if (
			segments.length === 3 &&
			A.isSyntaxNode(segments[1]) &&
			(segments[1].is_string(compressor) ||
				segments[1].is_number_or_bigint(compressor) ||
				isNullish(segments[1], compressor) ||
				compressor.option("unsafe"))
		) {
			// `foo${bar}` => "foo" + bar
			if (segments[2].value === "") {
				return makeNode(A.BinaryNode, self, {
					operator: "+",
					left: makeNode(A.StringNode, self, { value: segments[0].value }),
					right: segments[1]
				});
			}
			// `${bar}baz` => bar + "baz"
			if (segments[0].value === "") {
				return makeNode(A.BinaryNode, self, {
					operator: "+",
					left: segments[1],
					right: makeNode(A.StringNode, self, { value: segments[2].value })
				});
			}
		}
		return self;
	});

	defineOptimizer(A.PrefixedTemplateStringNode, (self) => self);

	/**
	 * terser's `lift_key`: `["p"]: 1` as `p: 1` and `[42]: 1` as `42: 1`.
	 * @param {Node} self an object or class property
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node} the property
	 */
	const liftKey = (self, compressor) => {
		if (!compressor.option("computed_props")) return self;
		// Not every constant is a key, so this only saves the next tests.
		if (!A.isConstantNode(self.key)) return self;
		if (A.isStringNode(self.key) || A.isNumberNode(self.key)) {
			const key = self.key.value.toString();
			if (key === "__proto__") return self;
			if (key === "constructor" && A.isClassNode(compressor.parent())) {
				return self;
			}
			self.computed = false;
			if (A.isObjectKeyValNode(self)) {
				self.quote = self.key.quote;
				self.key = new A.SymbolPropertyNode({ name: key });
			} else if (A.isClassPropertyNode(self)) {
				self.quote = self.key.quote;
				self.key = makeNode(A.SymbolClassPropertyNode, self.key, {
					name: key
				});
			} else {
				self.quote = self.key.quote;
				self.key = makeNode(A.SymbolMethodNode, self.key, { name: key });
			}
		}
		return self;
	};

	defineOptimizer(A.ObjectPropertyNode, liftKey);

	defineOptimizer(A.ConciseMethodNode, (self, compressor) => {
		liftKey(self, compressor);
		// p(){return x;} ---> p:()=>x
		if (
			compressor.option("arrows") &&
			A.isObjectNode(compressor.parent()) &&
			!self.value.generator &&
			!self.value.uses_arguments &&
			!self.value.pinned() &&
			self.value.body.body.length === 1 &&
			A.isReturnNode(self.value.body.body[0]) &&
			self.value.body.body[0].argument &&
			!self.value.contains_this()
		) {
			const arrow = makeNode(A.ArrowNode, self.value, self.value);
			arrow.async = self.value.async;
			arrow.generator = self.value.generator;
			return makeNode(A.ObjectKeyValNode, self, {
				key: A.isSymbolMethodNode(self.key)
					? new A.SymbolPropertyNode({ name: self.key.name })
					: self.key,
				value: arrow,
				quote: self.quote,
				computed: !A.isSymbolMethodNode(self.key),
				kind: "init",
				method: false,
				shorthand: false
			});
		}
		return self;
	});

	defineOptimizer(A.ObjectKeyValNode, (self, compressor) => {
		liftKey(self, compressor);
		// p:function(){} ---> p(){}, and the same of a generator, an async
		// function, and an arrow with a block body.
		const unsafeMethods = compressor.option("unsafe_methods");
		if (
			unsafeMethods &&
			compressor.option("ecma") >= 2015 &&
			(!(unsafeMethods instanceof RegExp) ||
				unsafeMethods.test(String(A.terserKey(self.key))))
		) {
			const key = self.key;
			const value = self.value;
			const isArrowWithBlock =
				A.isArrowNode(value) &&
				Array.isArray(value.body.body) &&
				!value.contains_this();
			if ((isArrowWithBlock || A.isFunctionNode(value)) && !value.id) {
				return makeNode(A.ConciseMethodNode, self, {
					key: self.computed
						? key
						: makeNode(A.SymbolMethodNode, self, { name: key.name }),
					value: makeNode(A.AccessorNode, value, value),
					quote: self.quote,
					computed: self.computed,
					kind: "init",
					method: true,
					shorthand: false
				});
			}
		}
		return self;
	});

	/**
	 * terser's `is_destructuring_export_decl`: whether the destructuring
	 * visited is one an `export` declares.
	 * @param {CompressorShape} compressor the compressor
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
			if (a === 0 && A.isDestructuringNode(parent)) continue;
			if (!DESTRUCTURING_EXPORT_ANCESTORS[a].test(parent.TYPE)) {
				return false;
			}
			a++;
		}
		return true;
	};

	/**
	 * terser's `should_retain`: whether a name bound by destructuring is kept.
	 * @param {CompressorShape} compressor the compressor
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

	defineOptimizer(A.DestructuringNode, (self, compressor) => {
		if (
			// `"strict"` is not `true`, where `1` is.
			// eslint-disable-next-line eqeqeq
			compressor.option("pure_getters") == true &&
			compressor.option("unused") &&
			!self.is_array &&
			Array.isArray(self.properties) &&
			!isDestructuringExportDeclaration(compressor) &&
			!A.isExpansionNode(self.properties[self.properties.length - 1])
		) {
			/** @type {Node[]} */
			const keep = [];
			for (let i = 0; i < self.properties.length; i++) {
				const element = self.properties[i];
				if (!(
					A.isObjectKeyValNode(element) &&
					!element.computed &&
					A.isSymbolDeclarationNode(element.value) &&
					!shouldRetain(compressor, element.value.definition())
				)) {
					keep.push(element);
				}
			}
			if (keep.length !== self.properties.length) {
				self.properties = keep;
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
 * @property {(compressor: CompressorShape) => (globalName: string) => boolean} pure_access_globals which globals read without a side effect
 * @property {Set<string>} pure_prop_access_globals which globals' properties read without a side effect
 * @property {(compressor: CompressorShape) => (globalName: string) => boolean} is_pure_native_fn which globals call without a side effect
 * @property {(compressor: CompressorShape) => (globalName: string, name: PropertyKey) => boolean} is_pure_native_method which prototype methods call without a side effect
 * @property {(compressor: CompressorShape) => (globalName: string, name: PropertyKey) => boolean} is_pure_native_static_fn which static methods call without a side effect
 * @property {(compressor: CompressorShape) => (globalName: string, name: PropertyKey) => boolean} is_pure_native_static_property which static properties read without a side effect
 * @property {(compressor: CompressorShape, call: Node) => boolean} is_pure_builtin_call whether a call of a builtin is pure
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
 * @param {MinifierModules} modules terser's modules, the helpers already installed
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
	} = require("./syntax-printer-data").nativeObjectTables();

	const { isArrayNode, isDotNode, isNewNode, isNumberNode, isSymbolRefNode } =
		/** @type {Record<string, NodeTest>} */ (modules.ast);
	const { is_undeclared_ref: isUndeclaredRef } = modules.inference;

	const argumentIsIterable = new Set(NATIVE_ARG1_IS_ITERABLE);
	const argumentIsRangeOrIterable = new Set(NATIVE_ARG1_IS_RANGE_OR_ITERABLE);
	const loneArgumentIsRange = new Set(NATIVE_LONE_ARG_IS_RANGE);
	const upperCaseFirstLetter = /^[A-Z]/;

	/**
	 * @param {NativeName[]} names the table
	 * @returns {(compressor: CompressorShape) => (globalName: string) => boolean} terser's `make_lookup` of it
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
	 * @returns {(compressor: CompressorShape) => (globalName: string, name: PropertyKey) => boolean} terser's `make_nested_lookup` of it
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
		if (isSymbolRefNode(firstArgument)) {
			firstArgument = firstArgument.fixed_value();
		}

		if (loneArgumentIsRange.has(builtin)) {
			// new Array(number)
			const argumentValid =
				args.length > 1 ||
				(isNumberNode(firstArgument) &&
					firstArgument.value >= 0 &&
					firstArgument.value <= 0xffffffff);
			if (!argumentValid) return false;
		}

		if (argumentIsRangeOrIterable.has(builtin)) {
			// new Float32Array(number | Array)
			const argumentValid =
				args.length === 0 ||
				isArrayNode(firstArgument) ||
				(isNumberNode(firstArgument) &&
					firstArgument.value >= 0 &&
					firstArgument.value <= 0xffffffff);
			if (!argumentValid) return false;
		}

		if (argumentIsIterable.has(builtin)) {
			// new Set(iterable)
			const argumentValid = args.length === 0 || isArrayNode(firstArgument);
			if (!argumentValid) return false;
		}

		return true;
	};

	/**
	 * terser's `is_pure_builtin_call`, reading the compressor's own lookups.
	 * @param {CompressorShape} compressor the compressor
	 * @param {Node} call a call or `new`
	 * @returns {boolean} whether it calls a builtin without a side effect
	 */
	const isPureBuiltinCall = (compressor, call) => {
		let builtin = "";
		let method = "";

		let expression = call.callee;
		if (isUndeclaredRef(expression)) {
			builtin = expression.name;
		} else if (isDotNode(expression)) {
			method = expression.property.name;

			expression = expression.object;
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
			} else if (isDotNode(expression)) {
				if (
					isUndeclaredRef(expression.object) &&
					expression.object.name === "globalThis" &&
					compressor.option("builtins_ecma") >= 2020
				) {
					// globalThis.SomeBuiltin.pureFunc()
					builtin = expression.property.name;
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
				const isNew = isNewNode(call);
				// True of every `is_pure_native_fn` name.
				const shouldBeNew = upperCaseFirstLetter.test(builtin);
				if (isNew !== shouldBeNew) return false;

				if (!isBuiltinPureWithTheseArgs(builtin, call.arguments)) {
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
 * @param {CompressorShape} compressor the compressor just constructed
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
 * @param {MinifierModules} modules terser's modules
 * @returns {CompressHelpers} the helpers
 */
const createCompressHelpers = (modules) => {
	const { ast } = modules;
	const {
		BigIntNode,
		BlockStatementNode,
		FalseNode,
		FunctionNode,
		InfinityNode,
		NaNNode,
		NullNode,
		NumberNode,
		RegExpNode,
		SequenceNode,
		SimpleStatementNode,
		StringNode,
		TrueNode,
		UnaryPrefixNode
	} = /** @type {Record<string, NodeCheck>} */ (ast);
	const {
		isArrayNode,
		isArrowNode,
		isAssignNode,
		isBlockStatementNode,
		isCallNode,
		isChainNode,
		isClassNode,
		isConstNode,
		isConstantNode,
		isDefClassNode,
		isDefunNode,
		isEmptyStatementNode,
		isExportNode,
		isForInNode,
		isFunctionNode,
		isImportNode,
		isInfinityNode,
		isLabeledStatementNode,
		isLambdaNode,
		isLetNode,
		isLoopControlNode,
		isNaNNode,
		isNewNode,
		isSyntaxNode,
		isNullNode,
		isObjectNode,
		isObjectKeyValNode,
		isPropAccessNode,
		isScopeNode,
		isSequenceNode,
		isSimpleStatementNode,
		isStatementNode,
		isSymbolRefNode,
		isUnaryNode,
		isUnaryPrefixNode,
		isUndefinedNode,
		isUsingNode
	} = /** @type {Record<string, NodeTest>} */ (ast);
	const {
		TreeWalker,
		terserKey,
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
			if (isSyntaxNode(transformed)) {
				result.push(transformed);
			} else if (transformed instanceof Splice) {
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
	 * terser's `make_void_0`, as an `UndefinedNode` may meet a variable of that name.
	 * @param {Node | undefined} orig where its position comes from
	 * @returns {Node} `void 0`
	 */
	const makeVoid0 = (orig) =>
		makeNode(UnaryPrefixNode, orig, {
			operator: "void",
			argument: makeNode(NumberNode, orig, { value: 0 })
		});

	/**
	 * terser's `merge_sequence`.
	 * @param {Node[]} array a list of expressions
	 * @param {Node} node an expression, whose own expressions join where it is a sequence
	 * @returns {Node[]} the list
	 */
	const mergeSequence = (array, node) => {
		if (isSequenceNode(node)) {
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
		return makeNode(SequenceNode, orig, {
			expressions: expressions.reduce(mergeSequence, [])
		});
	};

	/**
	 * terser's `make_empty_function`.
	 * @param {Node} self where its position comes from
	 * @returns {Node} `function(){}`
	 */
	const makeEmptyFunction = (self) =>
		makeNode(FunctionNode, self, {
			uses_arguments: false,
			params: [],
			body: makeNode(BlockStatementNode, undefined, { body: [] }),
			generator: false,
			async: false,
			variables: new Map(),
			uses_with: false,
			uses_eval: false,
			parent_scope: null,
			enclosed: [],
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
				return makeNode(StringNode, orig, { value });
			case "number":
				if (Number.isNaN(value)) return makeNode(NaNNode, orig);
				if (Number.isFinite(value)) {
					return 1 / value < 0
						? makeNode(UnaryPrefixNode, orig, {
								operator: "-",
								argument: makeNode(NumberNode, orig, { value: -value })
							})
						: makeNode(NumberNode, orig, { value });
				}
				return value < 0
					? makeNode(UnaryPrefixNode, orig, {
							operator: "-",
							argument: makeNode(InfinityNode, orig)
						})
					: makeNode(InfinityNode, orig);
			case "bigint":
				return makeNode(BigIntNode, orig, { value: value.toString() });
			case "boolean":
				return makeNode(value ? TrueNode : FalseNode, orig);
			case "undefined":
				return makeVoid0(orig);
			default:
				if (value === null) {
					return makeNode(NullNode, orig, { value: null });
				}
				if (value instanceof RegExp) {
					return makeNode(RegExpNode, orig, {
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
			makeNode(SimpleStatementNode, first, { expression: first }),
			makeNode(SimpleStatementNode, second, { expression: second })
		).expression;

	/**
	 * terser's `best_of`.
	 * @param {CompressorShape} compressor the compressor, at the node replaced
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
		if (isConstantNode(node)) {
			return node.getValue();
		}
		if (
			isUnaryPrefixNode(node) &&
			node.operator === "void" &&
			isConstantNode(node.argument)
		) {
			return undefined;
		}
		return key;
	};

	/**
	 * terser's `read_property`: what a literal holds under a key, where it is known.
	 * @param {Node} object an array or object literal
	 * @param {EXPECTED_ANY} property the key read
	 * @returns {Node | null | undefined} the value, null for an array's hole
	 */
	const readProperty = (object, property) => {
		let key = getSimpleKey(property);
		if (isSyntaxNode(key)) return;

		let value;
		if (isArrayNode(object)) {
			const elements = object.elements;
			if (key === "length") {
				return makeNodeFromConstant(elements.length, object);
			}
			if (typeof key === "number" && key in elements) value = elements[key];
		} else if (isObjectNode(object)) {
			key = `${key}`;
			const properties = object.properties;
			for (let i = properties.length; --i >= 0;) {
				const objectProperty = properties[i];
				if (!isObjectKeyValNode(objectProperty)) return;
				if (!value && terserKey(objectProperty.key) === key) {
					value = objectProperty.value;
				}
			}
		}

		return (
			(isSymbolRefNode(value) && /** @type {Node} */ (value).fixed_value()) ||
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
				if (found || isScopeNode(node)) return true;
				if (
					isLoopControlNode(node) &&
					walker.loopcontrol_target(node) === loop
				) {
					found = true;
					return true;
				}
				return undefined;
			}
		);
		if (isLabeledStatementNode(parent)) walker.push(parent);
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
		(isUnaryPrefixNode(parent) && parent.operator === "delete") ||
		(isCallNode(parent) &&
			parent.callee === orig &&
			(isChainNode(value) ||
				isPropAccessNode(value) ||
				(isSymbolRefNode(value) && value.name === "eval")));

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
			const zero = makeNode(NumberNode, orig, { value: 0 });
			return makeSequence(orig, [zero, value]);
		}
		return value;
	};

	/**
	 * terser's `is_func_expr`.
	 * @param {Node} node a node
	 * @returns {boolean} whether it is a function or arrow expression
	 */
	const isFuncExpr = (node) => isArrowNode(node) || isFunctionNode(node);

	/**
	 * terser's `is_iife_call`: an arrow is left out, as negating it needs parentheses.
	 * @param {Node} node a node
	 * @returns {boolean} whether it calls a function expression, or such a call's result
	 */
	const isIifeCall = (node) => {
		if (!isCallNode(node) || isNewNode(node)) return false;
		return isFunctionNode(node.callee) || isIifeCall(node.callee);
	};

	/**
	 * terser's `is_empty`.
	 * @param {Node | null} thing a statement
	 * @returns {boolean} whether it does nothing
	 */
	const isEmpty = (thing) => {
		if (thing === null) return true;
		if (isEmptyStatementNode(thing)) return true;
		if (isBlockStatementNode(thing)) return thing.body.length === 0;
		return false;
	};

	/**
	 * terser's `is_identifier_atom`.
	 * @param {Node} node a node
	 * @returns {boolean} whether it is `Infinity`, `NaN` or `undefined`
	 */
	const isIdentifierAtom = (node) =>
		isInfinityNode(node) || isNaNNode(node) || isUndefinedNode(node);

	/**
	 * terser's `is_ref_of`.
	 * @param {Node} reference a node
	 * @param {NodeTest} test what a declaration is
	 * @returns {boolean | undefined} whether it references a name one of whose declarations passes the test
	 */
	const isRefOf = (reference, test) => {
		if (!isSymbolRefNode(reference)) return false;
		const orig = reference.definition().orig;
		for (let i = orig.length; --i >= 0;) {
			if (test(orig[i])) return true;
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
			isDefClassNode(node) ||
			isDefunNode(node) ||
			isLetNode(node) ||
			isConstNode(node) ||
			isUsingNode(node) ||
			isExportNode(node) ||
			isImportNode(node)
		);

	/**
	 * terser's `as_statement_array`.
	 * @param {Node | null} thing a statement
	 * @returns {Node[]} the statements it stands for
	 */
	const asStatementArray = (thing) => {
		if (thing === null) return [];
		if (isBlockStatementNode(thing)) return thing.body;
		if (isEmptyStatementNode(thing)) return [];
		if (isStatementNode(thing)) return [thing];
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
			if (isSymbolRefNode(node) && definitions.includes(node.definition())) {
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
				if (isScopeNode(node) && node !== scopeNode) {
					const parent = info.parent();
					if (
						isCallNode(parent) &&
						parent.callee === node &&
						!(node.async || node.generator)
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
			if (isLambdaNode(node) || isClassNode(node)) {
				const name = node.id;
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
	 * @param {CompressorShape} compressor the compressor
	 * @returns {EXPECTED_ANY} truthy where `top_retain` keeps it
	 */
	const retainTopFunc = (fn, compressor) =>
		compressor.top_retain &&
		isDefunNode(fn) &&
		hasFlag(fn, TOP) &&
		fn.id &&
		compressor.top_retain(fn.id.definition());

	const unarySideEffects = makePredicate("delete ++ --");

	/**
	 * terser's `is_undeclared_ref`.
	 * @param {Node} node a node
	 * @returns {boolean} whether it references a global never declared
	 */
	const isUndeclaredRef = (node) =>
		isSymbolRefNode(node) && node.definition().undeclared;

	/**
	 * terser's `is_undefined`.
	 * @param {Node} node a node
	 * @param {CompressorShape} compressor the compressor
	 * @returns {number | boolean} truthy where it is `undefined`
	 */
	const isUndefined = (node, compressor) =>
		hasFlag(node, UNDEFINED) ||
		isUndefinedNode(node) ||
		(isUnaryPrefixNode(node) &&
			node.operator === "void" &&
			!node.argument.has_side_effects(compressor));

	/**
	 * terser's `is_null_or_undefined`.
	 * @param {Node} node a node
	 * @param {CompressorShape} compressor the compressor
	 * @returns {number | boolean} truthy where it is explicitly `null` or `undefined`
	 */
	const isNullOrUndefined = (node, compressor) => {
		if (isNullNode(node)) return true;
		const undefinedValue = isUndefined(node, compressor);
		if (undefinedValue) return undefinedValue;
		if (!isSymbolRefNode(node)) return false;
		const fixed = node.definition().fixed;
		return (
			isSyntaxNode(fixed) && isNullish(/** @type {Node} */ (fixed), compressor)
		);
	};

	/**
	 * terser's `is_nullish_shortcircuited`.
	 * @param {Node} node a node
	 * @param {CompressorShape} compressor the compressor
	 * @returns {EXPECTED_ANY} truthy where an optional chain in it short-circuits
	 */
	const isNullishShortCircuited = (node, compressor) => {
		if (isPropAccessNode(node) || isCallNode(node)) {
			const inner = isCallNode(node) ? node.callee : node.object;
			return (
				(node.optional && isNullOrUndefined(inner, compressor)) ||
				isNullishShortCircuited(inner, compressor)
			);
		}
		if (isChainNode(node)) {
			return isNullishShortCircuited(node.expression, compressor);
		}
		return false;
	};

	/**
	 * terser's `is_nullish`.
	 * @param {Node} node a node
	 * @param {CompressorShape} compressor the compressor
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
		if (isUnaryNode(parent) && unarySideEffects.has(parent.operator)) {
			return parent.argument;
		}
		if (isAssignNode(parent) && parent.left === node) return node;
		if (isForInNode(parent) && parent.left === node) return node;
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {ParentStack} walker a walker at the node
	 * @param {Node} node a node
	 * @param {Node | null | undefined} value what it holds, null for a hole
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
			isCallNode(parent) &&
			parent.callee === node &&
			!isArrowNode(value) &&
			!isClassNode(value) &&
			!parent.is_callee_pure(compressor) &&
			(!isFunctionNode(value) ||
				(!isNewNode(parent) && /** @type {Node} */ (value).contains_this()))
		) {
			return true;
		}
		if (isArrayNode(parent)) {
			return isModified(compressor, walker, parent, parent, level + 1);
		}
		if (isObjectKeyValNode(parent) && node === parent.value) {
			const object = walker.parent(level + 1);
			return isModified(compressor, walker, object, object, level + 2);
		}
		if (isPropAccessNode(parent) && parent.object === node) {
			const property = readProperty(
				/** @type {Node} */ (value),
				ast.terserProperty(parent)
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
			if (isSequenceNode(parent)) {
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
			if (isUnaryNode(parent)) {
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
			if (isSimpleStatementNode(parent) || isLabeledStatementNode(parent)) {
				return false;
			}
			if (isScopeNode(parent)) {
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
			get_simple_key: getSimpleKey,
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

/**
 * Installs webpack's own helper modules: every phase after this one reads the
 * helpers of `compress/common.js`, `inference.js`, `compressor-flags.js`,
 * `native-objects.js` and `utils` from webpack instead of terser.
 * @param {MinifierModules} modules terser's modules, whose helpers it replaces
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

/**
 * What the optimizers of `compress/index.js` share, with `tighten-body.js` and
 * `inline.js` they call.
 * @typedef {object} OptimizerHelpers
 * @property {(Type: EXPECTED_ANY, optimizer: (self: Node, compressor: CompressorShape) => Node) => void} defineOptimizer terser's `def_optimize`
 * @property {(compressor: CompressorShape, name: string) => SymbolDefinition | undefined} findVariable terser's `find_variable`
 * @property {(self: Node, compressor: CompressorShape) => Node} optimizeLambda the lambda optimizer
 * @property {(lhs: Node, self: Node) => boolean} isAtomic terser's `is_atomic`
 * @property {(self: Node, compressor: CompressorShape) => Node | null} unsafeUndefinedRef terser's `unsafe_undefined_ref`
 * @property {(elements: (Node | null)[]) => void} inlineArrayLikeSpread terser's `inline_array_like_spread`
 * @property {(statements: Node[], compressor: CompressorShape) => void} tightenBody terser's `tighten_body`
 * @property {(compressor: CompressorShape, statement: Node, target: Node[]) => void} extractFromUnreachableCode terser's `extract_from_unreachable_code`
 * @property {(self: Node, compressor: CompressorShape) => Node} inlineIntoSymbolRef terser's `inline_into_symbolref`
 * @property {(self: Node, compressor: CompressorShape) => Node} inlineIntoCall terser's `inline_into_call`
 */

/**
 * Installs webpack's optimizers: terser's `optimize` of every node, the methods
 * of `compress/index.js` they call, and the statement and call inlining of
 * `tighten-body.js` and `inline.js`.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installOptimize = (modules) => {
	const { ast, flags } = modules;
	const A = /** @type {Record<string, EXPECTED_ANY>} */ (ast);
	const { OPTIMIZED, UNDEFINED } = flags;
	const { make_node: makeNode } = modules.utils;

	/**
	 * terser's `def_optimize`.
	 * @param {EXPECTED_ANY} Type a node class
	 * @param {(self: Node, compressor: CompressorShape) => Node} optimizer its optimizer
	 * @returns {void}
	 */
	const defineOptimizer = (Type, optimizer) => {
		/**
		 * @this {Node} the node optimized
		 * @param {CompressorShape} compressor the compressor
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
	 * @param {CompressorShape} compressor the compressor
	 * @param {string} name the name
	 * @returns {SymbolDefinition | undefined} what it reads
	 */
	const findVariable = (compressor, name) => {
		let scope;
		let i = 0;
		while ((scope = compressor.parent(i++))) {
			if (A.isScopeNode(scope)) break;
			if (A.isCatchNode(scope) && scope.param) {
				scope = scope.param.definition().scope;
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
		A.isSymbolRefNode(lhs) || lhs.TYPE === self.TYPE;

	/**
	 * terser's `unsafe_undefined_ref`: a reference to a variable named `undefined`.
	 * @param {Node} self the node that reads as `undefined`
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node | null} the reference, or null where there is none
	 */
	const unsafeUndefinedRef = (self, compressor) => {
		if (compressor.option("unsafe_undefined")) {
			const definition = findVariable(compressor, "undefined");
			if (definition) {
				const reference = makeNode(A.SymbolRefNode, self, {
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
	 * @param {(Node | null)[]} elements the elements, null for a hole
	 * @returns {void}
	 */
	const inlineArrayLikeSpread = (elements) => {
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			if (element !== null && A.isExpansionNode(element)) {
				const expression = element.argument;
				if (A.isArrayNode(expression) && !expression.elements.includes(null)) {
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
	 * the lambda optimizer.
	 * @param {Node} self a function
	 * @param {CompressorShape} compressor the compressor
	 * @returns {Node} the function
	 */
	const optimizeLambda = (self, compressor) => {
		tightenBody(self.body.body, compressor);
		if (
			compressor.option("side_effects") &&
			self.body.body.length === 1 &&
			self.body.body[0] === compressor.has_directive("use strict")
		) {
			self.body.body.length = 0;
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
 * @param {MinifierModules} modules terser's modules
 * @returns {PrintPropertyName} the printer of a property's name
 */
const createPrintPropertyName = (modules) => {
	const { ALL_RESERVED_WORDS } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string> }} */ (modules.parse);
	const unicode = createUnicode();
	/**
	 * @param {string} key the property name
	 * @param {string | undefined} quote the quote it was written with
	 * @param {OutputStream} output the stream printed into
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
	return printPropertyName;
};

/** @typedef {(key: string, quote: string | undefined, output: OutputStream) => boolean} PrintPropertyName prints a property's name, answering whether it printed as a bare name */
/** @typedef {(node: PrintNode, output: OutputStream) => void} EstreeCodegen prints one ESTree node's own text */
/** @typedef {(node: PrintNode, output: OutputStream) => boolean | undefined} EstreeParens whether an ESTree node is parenthesized where it is printed */
/**
 * @template R
 * @typedef {{ [Type in PrintNode["type"]]?: (node: PrintNodeOf<Type>, output: OutputStream) => R }} EstreeTable per ESTree type, what answers for a node of it
 */
/** @typedef {EstreeTable<void>} EstreeGenerators per ESTree type, what prints a node of it */
/** @typedef {EstreeTable<boolean | undefined>} EstreeParensTests per ESTree type, whether a node of it is parenthesized where it is printed */

/**
 * Installs `printEstree`, the printer over the tree `toPrintTree` reads: a
 * code generator and a test for its parentheses per ESTree type, each terser's.
 * `minify` prints with it.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installEstreePrint = (modules) => {
	const { ast } = modules;
	const kindOf = /** @type {PrintKinds} */ (modules.kindOf);
	const { ALL_RESERVED_WORDS, PRECEDENCE } =
		/** @type {{ ALL_RESERVED_WORDS: Set<string>, PRECEDENCE: Record<string, number> }} */ (
			modules.parse
		);
	const regexpSourceFix = /** @type {(source: string) => string} */ (
		modules.utils.regexp_source_fix
	);
	const { isIdentifierString } = createUnicode();
	const printPropertyName = createPrintPropertyName(modules);

	// What `parentOf` answers past the root: a node no type test matches.
	/** @type {PrintParent} */
	const NO_PARENT = { type: "", startToken: null, endToken: null };

	/**
	 * @param {OutputStream} output the stream printed into
	 * @param {number} level how many levels further out than the parent
	 * @returns {PrintParent} the node holding the one printed, or `NO_PARENT`
	 */
	const parentOf = (output, level) => output.parent(level) || NO_PARENT;

	/** @type {((node: PrintNode) => void) | undefined} */
	let onPrinted;

	/**
	 * Prints a node with what terser printed around it: its parentheses, the
	 * parent stack `output.parent(n)` reads, and the scope `use asm` applies to.
	 * @param {PrintNode} node the node
	 * @param {OutputStream} output the stream printed into
	 * @param {boolean=} forceParens whether to parenthesize it whatever its parent
	 * @returns {void}
	 */
	const printEstree = (node, output, forceParens) => {
		const generate = /** @type {EstreeCodegen | undefined} */ (
			codegen[node.type]
		);
		if (generate === undefined) {
			throw new Error(`printEstree cannot print a ${node.type} node yet`);
		}
		if (kindOf.Scope(node)) {
			output.active_scope = node;
		} else if (
			!output.use_asm &&
			/** @type {PrintExpressionStatement} */ (node).directive === "use asm"
		) {
			output.use_asm = output.active_scope;
		}
		const stack = /** @type {PrintNode[]} */ (output.stack);
		stack.push(node);
		const parens = /** @type {EstreeParens | undefined} */ (
			needsParens[node.type]
		);
		const parenthesized =
			forceParens === true ||
			(parens !== undefined && parens(node, output) === true);
		if (parenthesized) output.print("(");
		output.prepend_comments(node);
		const map = /** @type {EstreeCodegen | undefined} */ (
			sourceMapping[node.type]
		);
		if (map !== undefined) map(node, output);
		generate(node, output);
		output.append_comments(node);
		if (parenthesized) output.print(")");
		stack.pop();
		if (node === output.use_asm) output.use_asm = null;
		if (onPrinted !== undefined) onPrinted(node);
	};

	/**
	 * @param {PrintParent} node a binary-like node, as `kindOf.Binary` finds one
	 * @returns {string} its operator, which an assignment pattern leaves implicit
	 */
	const operatorOf = (node) =>
		node.type === "AssignmentPattern"
			? "="
			: /** @type {PrintBinary} */ (node).operator;

	/**
	 * @param {PrintNode} key a key not computed
	 * @returns {string} the name terser holds for it
	 */
	const keyName = (key) =>
		key.type === "Literal"
			? String(key.value)
			: /** @type {PrintIdentifier | PrintPrivateIdentifier} */ (key).name;

	/**
	 * terser's `add_source_map` of most nodes: the node's start.
	 * @param {PrintNode} node the node printed
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const mapStart = (node, output) => {
		output.add_mapping(node.startToken);
	};

	/**
	 * terser's `add_source_map` of a getter, setter or method, whose key maps the name.
	 * @param {PrintNode} node the method printed
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const mapMethodStart = (node, output) => {
		output.add_mapping(node.startToken, false);
	};

	/**
	 * terser's `add_source_map` of a property, named by its key (none when computed).
	 * @param {PrintProperty | PrintPropertyDefinition} node the property printed
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const mapProperty = (node, output) => {
		const { mapName } = node;
		output.add_mapping(node.startToken, mapName === null ? undefined : mapName);
	};

	/**
	 * terser's `add_source_map` of a method's or private property's name: its end.
	 * @param {PrintNode} key the name
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const mapNameEnd = (key, output) => {
		const end = key.endToken;
		const tokenType = end && end.type;
		if (tokenType === "name" || tokenType === "privatename") {
			output.add_mapping(end, keyName(key));
		} else {
			output.add_mapping(end);
		}
	};

	// Each ESTree type's mapping, as terser's class maps it; a type absent here
	// is one terser maps nowhere, its children mapping themselves.
	/** @type {EstreeGenerators} */
	const sourceMapping = {
		ArrayExpression: mapStart,
		ArrowFunctionExpression: mapStart,
		BlockStatement: (node, output) => {
			// terser's try block is no BlockStatement, and maps nowhere.
			const parent = parentOf(output, 0);
			if (parent.type !== "TryStatement" || parent.block !== node) {
				mapStart(node, output);
			}
		},
		BreakStatement: mapStart,
		CatchClause: mapStart,
		ClassDeclaration: mapStart,
		ClassExpression: mapStart,
		ContinueStatement: mapStart,
		DebuggerStatement: mapStart,
		DoWhileStatement: mapStart,
		ExpressionStatement: (node, output) => {
			// A directive maps; terser's SimpleStatement does not.
			if (typeof node.directive === "string") mapStart(node, output);
		},
		ForInStatement: mapStart,
		ForOfStatement: mapStart,
		ForStatement: mapStart,
		FunctionDeclaration: mapStart,
		FunctionExpression: mapStart,
		Identifier: mapStart,
		IfStatement: mapStart,
		ImportAttribute: (node, output) => {
			output.add_mapping(node.startToken, keyName(node.key));
		},
		Literal: mapStart,
		MethodDefinition: mapMethodStart,
		NewExpression: mapStart,
		ObjectExpression: mapStart,
		PrivateIdentifier: mapNameEnd,
		Property: (node, output) => {
			if (node.kind === "init" && !node.method) mapProperty(node, output);
			else mapMethodStart(node, output);
		},
		PropertyDefinition: mapProperty,
		ReturnStatement: mapStart,
		Super: mapStart,
		SwitchCase: mapStart,
		SwitchStatement: mapStart,
		TemplateElement: mapStart,
		TemplateLiteral: mapStart,
		ThisExpression: mapStart,
		ThrowStatement: mapStart,
		TryStatement: mapStart,
		VariableDeclaration: mapStart,
		WhileStatement: mapStart,
		WithStatement: mapStart
	};

	/**
	 * @param {PrintParent} node a node
	 * @returns {boolean} whether it is terser's `Dot` or `Sub`, not a private access
	 */
	const isDotOrSub = (node) =>
		node.type === "MemberExpression" &&
		node.property.type !== "PrivateIdentifier";

	/**
	 * @param {PrintParent} node a node
	 * @returns {node is PrintLiteral & { value: number }} whether it is a number literal
	 */
	const isNumber = (node) =>
		node.type === "Literal" && typeof node.value === "number";

	/**
	 * terser's `first_in_statement`, over the stream's parent stack.
	 * @param {OutputStream} output the stream printed into
	 * @returns {boolean | undefined} whether the node printed starts its statement
	 */
	const firstInStatement = (output) => {
		let node = /** @type {PrintParent} */ (output.parent(-1));
		/** @type {PrintParent | undefined} */
		let parent;
		for (let i = 0; (parent = output.parent(i)); i++) {
			if (parent.type === "ExpressionStatement" && parent.expression === node) {
				return true;
			}
			if (
				(parent.type === "SequenceExpression" &&
					parent.expressions[0] === node) ||
				(parent.type === "CallExpression" && parent.callee === node) ||
				(parent.type === "TaggedTemplateExpression" && parent.tag === node) ||
				(isDotOrSub(parent) &&
					/** @type {PrintMemberExpression} */ (parent).object === node) ||
				(parent.type === "ChainExpression" && parent.expression === node) ||
				(parent.type === "ConditionalExpression" && parent.test === node) ||
				(kindOf.Binary(parent) &&
					/** @type {PrintBinaryLike} */ (parent).left === node) ||
				(kindOf.UnaryPostfix(parent) &&
					/** @type {PrintUnary} */ (parent).argument === node)
			) {
				node = parent;
			} else {
				return false;
			}
		}
		return undefined;
	};

	/**
	 * terser's `left_is_object`.
	 * @param {PrintNode} node an expression
	 * @returns {boolean} whether its leftmost part is an object literal
	 */
	const leftIsObject = (node) => {
		switch (node.type) {
			case "ObjectExpression":
				return true;
			case "SequenceExpression":
				return leftIsObject(node.expressions[0]);
			case "CallExpression":
				return leftIsObject(node.callee);
			case "TaggedTemplateExpression":
				return leftIsObject(node.tag);
			case "MemberExpression":
				return isDotOrSub(node) && leftIsObject(node.object);
			case "ChainExpression":
				return leftIsObject(node.expression);
			case "ConditionalExpression":
				return leftIsObject(node.test);
			case "UpdateExpression":
				return !node.prefix && leftIsObject(node.argument);
		}
		return (
			kindOf.Binary(node) &&
			leftIsObject(/** @type {PrintBinaryLike} */ (node).left)
		);
	};

	/**
	 * terser's `walk` stopped by `walk_abort`, over an ESTree tree.
	 * @param {PrintNode} node the node walked from
	 * @param {(node: PrintNode) => boolean | undefined} test true where found, false to skip a node's children
	 * @returns {boolean} whether `test` found a node
	 */
	const findNode = (node, test) => {
		const found = test(node);
		if (found !== undefined) return found;
		const fields = /** @type {PrintFields} */ (/** @type {unknown} */ (node));
		for (const key of Object.keys(node)) {
			if (key === "startToken" || key === "endToken" || key === "definition") {
				continue;
			}
			const value = fields[key];
			const children = Array.isArray(value) ? value : [value];
			for (const child of children) {
				if (
					child !== null &&
					typeof child === "object" &&
					typeof child.type === "string" &&
					findNode(child, test)
				) {
					return true;
				}
			}
		}
		return false;
	};

	/**
	 * What terser's walk for `new (a.b())` stops at: a call or `new` outside
	 * any function or class.
	 * @param {PrintNode} node a node walked
	 * @returns {boolean | undefined} true for a call, false for a scope
	 */
	const findCall = (node) => {
		if (kindOf.Scope(node)) return false;
		if (kindOf.Call(node)) return true;
	};

	/**
	 * What terser's `parenthesize_for_noin` stops at: an `in` outside any
	 * function or class, arrows aside.
	 * @param {PrintNode} node a node walked
	 * @returns {boolean | undefined} true for an `in`, false for a scope
	 */
	const findIn = (node) => {
		if (kindOf.Scope(node) && node.type !== "ArrowFunctionExpression") {
			return false;
		}
		if (node.type === "BinaryExpression" && node.operator === "in") return true;
	};

	/**
	 * terser's `parenthesize_for_noin`.
	 * @param {PrintNode} node the node printed
	 * @param {OutputStream} output the stream printed into
	 * @param {boolean} noin whether `in` would be read as a `for` loop's
	 * @returns {void}
	 */
	const parenthesizeForNoin = (node, output, noin) => {
		printEstree(node, output, noin && findNode(node, findIn));
	};

	/**
	 * @param {PrintNode} statement a statement
	 * @returns {boolean} whether it is a string standing alone, not a directive
	 */
	const isStringStatement = (statement) =>
		statement.type === "ExpressionStatement" &&
		typeof statement.directive !== "string" &&
		statement.expression.type === "Literal" &&
		typeof statement.expression.value === "string";

	/**
	 * terser's `display_body`.
	 * @param {PrintNode[]} statements the statements
	 * @param {boolean} isToplevel whether they are the program's
	 * @param {OutputStream} output the stream printed into
	 * @param {boolean} allowDirectives whether leading strings are directives
	 * @returns {void}
	 */
	const displayBody = (statements, isToplevel, output, allowDirectives) => {
		const last = statements.length - 1;
		output.in_directive = allowDirectives;
		for (let i = 0; i <= last; i++) {
			const statement = statements[i];
			const isEmpty = statement.type === "EmptyStatement";
			if (
				output.in_directive === true &&
				!(
					kindOf.Directive(statement) ||
					isEmpty ||
					isStringStatement(statement)
				)
			) {
				output.in_directive = false;
			}
			if (!isEmpty) {
				output.indent();
				printEstree(statement, output);
				if (!(i === last && isToplevel)) {
					output.newline();
					if (isToplevel) output.newline();
				}
			}
			if (output.in_directive === true && isStringStatement(statement)) {
				output.in_directive = false;
			}
		}
		output.in_directive = false;
	};

	/**
	 * terser's `print_braced`.
	 * @param {PrintNode} owner the node the braces belong to
	 * @param {PrintNode[]} statements the body's statements
	 * @param {OutputStream} output the stream printed into
	 * @param {boolean} allowDirectives whether leading strings are directives
	 * @returns {void}
	 */
	const printBraced = (owner, statements, output, allowDirectives) => {
		if (statements.length === 0) {
			printBracedEmpty(owner, output);
			return;
		}
		output.print("{");
		displayBody(statements, false, output, allowDirectives);
		output.add_mapping(owner.endToken);
		output.print("}");
	};

	/**
	 * terser's `make_block`: a statement in braces.
	 * @param {PrintNode} statement the statement
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const makeBlock = (statement, output) => {
		if (statement.type === "EmptyStatement") {
			output.print("{}");
		} else if (statement.type === "BlockStatement") {
			printEstree(statement, output);
		} else {
			output.print("{");
			output.indent();
			printEstree(statement, output);
			output.newline();
			output.print("}");
		}
	};

	/**
	 * terser's `force_statement`: a statement's body, braced where it must be;
	 * its `braces` option is never set, as the stream resets it.
	 * @param {PrintNode} statement the body
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printMaybeBracedBody = (statement, output) => {
		if (statement.type === "EmptyStatement") {
			output.force_semicolon();
		} else if (
			(statement.type === "VariableDeclaration" && statement.kind !== "var") ||
			kindOf.Class(statement)
		) {
			makeBlock(statement, output);
		} else {
			printEstree(statement, output);
		}
	};

	/**
	 * terser's `make_then`: an `if`'s consequent before an `else`, braced
	 * where an `if` without one inside would take that `else`.
	 * @param {PrintIfStatement} node the `if`
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const makeThen = (node, output) => {
		const { consequent } = node;
		if (output.option("ie8") && consequent.type === "DoWhileStatement") {
			makeBlock(consequent, output);
			return;
		}
		let body = consequent;
		for (;;) {
			if (body.type === "IfStatement") {
				if (!body.alternate) {
					makeBlock(consequent, output);
					return;
				}
				body = body.alternate;
			} else if (kindOf.StatementWithBody(body)) {
				body =
					/** @type {Exclude<PrintStatementWithBody, PrintIfStatement>} */ (
						body
					).body;
			} else {
				break;
			}
		}
		printMaybeBracedBody(consequent, output);
	};

	/**
	 * terser's `gc_scope`: drops a printed function's body under `_destroy_ast`.
	 * @param {PrintFunction} node the function
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const gcScope = (node, output) => {
		if (!output.option("_destroy_ast")) return;
		node.body.body.length = 0;
		node.params.length = 0;
	};

	/**
	 * terser's `Exit._do_print`: a `return` or `throw`.
	 * @param {PrintExitStatement} node the statement
	 * @param {string} keyword its keyword
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printExit = (node, keyword, output) => {
		output.print(keyword);
		const { argument } = node;
		if (argument) {
			output.space();
			// Comments not yet printed may hold a line break before the value.
			/** @type {Comment[] | undefined} */
			const comments = /** @type {Token} */ (argument.startToken)
				.comments_before;
			const parenthesized =
				comments &&
				comments.length > 0 &&
				!output.printed_comments.has(comments);
			if (parenthesized) output.print("(");
			printEstree(argument, output);
			if (parenthesized) output.print(")");
		}
		output.semicolon();
	};

	/**
	 * terser's `LoopControl._do_print`: a `break` or `continue`.
	 * @param {PrintLoopControl} node the statement
	 * @param {string} keyword its keyword
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printLoopControl = (node, keyword, output) => {
		output.print(keyword);
		if (node.label) {
			output.space();
			printEstree(node.label, output);
		}
		output.semicolon();
	};

	/**
	 * A parenthesized expression, as `with_parens` prints it.
	 * @param {PrintNode} node the expression
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printParenthesized = (node, output) => {
		output.print("(");
		printEstree(node, output);
		output.print(")");
	};

	/**
	 * @param {PrintNode} node an import's or export's name, a literal where quoted
	 * @returns {string} the name
	 */
	const moduleName = (node) =>
		node.type === "Literal"
			? /** @type {string} */ (node.value)
			: /** @type {PrintIdentifier} */ (node).name;

	/**
	 * terser's `print_mapped_name`: the local side of an import or export.
	 * @param {PrintNode} node the name
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printMappedName = (node, output) => {
		if (node.type === "Literal") output.print_string(node.value, node.quote);
		else printEstree(node, output);
	};

	/**
	 * terser's `print_foreign_name`: the other module's side, printed as written.
	 * @param {PrintNode} node the name
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printForeignName = (node, output) => {
		if (node.type === "Literal") output.print_string(node.value, node.quote);
		else output.print(/** @type {PrintIdentifier} */ (node).name);
	};

	/**
	 * terser's `NameMapping` printer for a named specifier; `export * as "*"`,
	 * whose two names differ by their quotes alone, prints apart.
	 * @param {PrintNode} local the local name
	 * @param {PrintNode} foreign the other module's name
	 * @param {boolean} isImport whether it is an import's
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printNameMapping = (local, foreign, isImport, output) => {
		if (moduleName(local) === moduleName(foreign)) {
			printMappedName(local, output);
			return;
		}
		if (isImport) printForeignName(foreign, output);
		else printMappedName(local, output);
		output.space();
		output.print("as");
		output.space();
		if (isImport) printEstree(local, output);
		else printForeignName(foreign, output);
	};

	/**
	 * Named imports or exports in braces.
	 * @param {PrintNode[]} specifiers the specifiers
	 * @param {number} from the index of the first in braces
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printSpecifiers = (specifiers, from, output) => {
		output.print("{");
		for (let i = from; i < specifiers.length; i++) {
			output.space();
			printEstree(specifiers[i], output);
			if (i < specifiers.length - 1) output.print(",");
		}
		output.space();
		output.print("}");
	};

	/**
	 * An import's or export's source and attributes, past the specifiers.
	 * @param {PrintModuleDeclaration} node the declaration
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printSource = (node, output) => {
		if (node.source) {
			output.space();
			output.print("from");
			output.space();
			printEstree(node.source, output);
		}
		printAttributes(node, output);
		output.semicolon();
	};

	/**
	 * Import attributes, printed as terser printed the object holding them,
	 * with that object's comments, source mapping and place on the stack.
	 * @param {PrintModuleDeclaration} node the import or export
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printAttributes = (node, output) => {
		const { attributes } = node;
		if (attributes.length === 0) return;
		output.print("with");
		/** @type {PrintNode} */
		const holder = {
			type: "ObjectExpression",
			properties: attributes,
			startToken: node.attributesStartToken,
			endToken: node.attributesEndToken
		};
		const stack = /** @type {PrintNode[]} */ (output.stack);
		stack.push(holder);
		output.prepend_comments(holder);
		output.add_mapping(holder.startToken);
		output.print("{");
		for (let i = 0; i < attributes.length; i++) {
			if (i) {
				output.print(",");
				output.newline();
			}
			output.indent();
			printEstree(attributes[i], output);
		}
		output.newline();
		output.print("}");
		output.append_comments(holder);
		stack.pop();
	};

	/**
	 * terser's `Class` printer.
	 * @param {PrintClass} node a class declaration or expression
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printClass = (node, output) => {
		output.print("class");
		output.space();
		if (node.id) {
			printEstree(node.id, output);
			output.space();
		}
		const { superClass } = node;
		if (superClass) {
			const parens =
				superClass.type !== "Identifier" &&
				superClass.type !== "MemberExpression" &&
				superClass.type !== "ClassExpression" &&
				superClass.type !== "FunctionExpression";
			output.print("extends");
			if (parens) output.print("(");
			else output.space();
			printEstree(superClass, output);
			if (parens) output.print(")");
			else output.space();
		}
		const members = node.body.body;
		if (members.length === 0) {
			output.print("{}");
			return;
		}
		output.print("{");
		for (let i = 0; i < members.length; i++) {
			if (i) output.newline();
			output.indent();
			printEstree(members[i], output);
		}
		output.newline();
		output.print("}");
	};

	/**
	 * terser's `Lambda` printer: a function not a method.
	 * @param {PrintFunction} node the function declaration or expression
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printFunction = (node, output) => {
		printLambda(node, output, false);
		gcScope(node, output);
	};

	/**
	 * terser's `ForIn` printer, `for … of` among them.
	 * @param {PrintForInStatement | PrintForOfStatement} node the loop
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printForIn = (node, output) => {
		output.print("for");
		if (/** @type {PrintForOfStatement} */ (node).await) {
			output.space();
			output.print("await");
		}
		output.space();
		output.print("(");
		printEstree(node.left, output);
		output.space();
		output.print(node.type === "ForOfStatement" ? "of" : "in");
		output.space();
		printEstree(node.right, output);
		output.print(")");
		output.space();
		printMaybeBracedBody(node.body, output);
	};

	/**
	 * terser's `print_braced_empty`.
	 * @param {PrintNode} owner the node the braces belong to
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printBracedEmpty = (owner, output) => {
		output.print("{");
		output.append_comments(owner, true);
		output.add_mapping(owner.endToken);
		output.print("}");
	};

	/**
	 * terser's `Lambda._do_print`.
	 * @param {PrintFunction} node the function
	 * @param {OutputStream} output the stream printed into
	 * @param {boolean} isMethod whether it is a method's value, printed without `function`
	 * @returns {void}
	 */
	const printLambda = (node, output, isMethod) => {
		if (!isMethod) {
			if (node.async) {
				output.print("async");
				output.space();
			}
			output.print("function");
			if (node.generator) output.star();
			if (node.id) output.space();
		}
		if (node.id) printEstree(node.id, output);
		printArguments(node.params, output);
		output.space();
		printBraced(node, node.body.body, output, true);
	};

	/**
	 * @param {(PrintNode | null)[]} list the arguments or parameters
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printArguments = (list, output) => {
		output.print("(");
		for (let i = 0; i < list.length; i++) {
			if (i) output.comma();
			printEstree(/** @type {PrintNode} */ (list[i]), output);
		}
		output.print(")");
	};

	/**
	 * terser's `_print_getter_setter`: a getter, setter or method.
	 * @param {PrintProperty | PrintMethodDefinition} node the property or method definition
	 * @param {string | undefined} keyword what precedes its name
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printMethod = (node, keyword, output) => {
		if (/** @type {PrintMethodDefinition} */ (node).static) {
			output.print("static");
			output.space();
		}
		if (keyword) {
			output.print(keyword);
			output.space();
		}
		const { key } = node;
		if (node.computed) {
			output.print("[");
			printEstree(key, output);
			output.print("]");
		} else {
			if (key.type === "PrivateIdentifier") output.print("#");
			printPropertyName(keyName(key), node.quote, output);
			mapNameEnd(key, output);
		}
		printLambda(/** @type {PrintFunction} */ (node.value), output, true);
	};

	/**
	 * @param {PrintProperty | PrintMethodDefinition} node a method's or property's
	 * @returns {string | undefined} the keyword its kind prints before its name
	 */
	const methodKeyword = (node) => {
		if (node.kind === "get" || node.kind === "set") return node.kind;
		const value = /** @type {PrintFunction} */ (node.value);
		if (value.generator && value.async) return "async*";
		if (value.generator) return "*";
		if (value.async) return "async";
	};

	/**
	 * terser's `ObjectKeyVal` printer: a property not a method.
	 * @param {PrintProperty} node the property
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printKeyValue = (node, output) => {
		const { key, value } = node;
		const name = node.computed ? undefined : keyName(key);
		const tryShorthand = output.option("shorthand") && name !== undefined;
		if (
			tryShorthand &&
			value.type === "Identifier" &&
			value.atom !== true &&
			value.name === name &&
			!ALL_RESERVED_WORDS.has(/** @type {string} */ (name))
		) {
			if (
				!printPropertyName(/** @type {string} */ (name), node.quote, output)
			) {
				output.colon();
				printEstree(value, output);
			}
		} else if (
			tryShorthand &&
			value.type === "AssignmentPattern" &&
			value.left.type === "Identifier" &&
			value.left.name === name
		) {
			if (
				!printPropertyName(/** @type {string} */ (name), node.quote, output)
			) {
				output.colon();
				printEstree(value.left, output);
			}
			output.space();
			output.print("=");
			output.space();
			printEstree(value.right, output);
		} else {
			if (name !== undefined) {
				printPropertyName(name, node.quote, output);
			} else {
				output.print("[");
				printEstree(key, output);
				output.print("]");
			}
			output.colon();
			printEstree(value, output);
		}
	};

	/**
	 * A pattern's or array's elements, a final hole followed by a comma of
	 * its own lest it read as a trailing comma.
	 * @param {(PrintNode | null)[]} elements the elements, null for a hole
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printElements = (elements, output) => {
		const last = elements.length - 1;
		for (let i = 0; i <= last; i++) {
			const element = elements[i];
			if (i) output.comma();
			if (element !== null) printEstree(element, output);
			else if (i === last) output.comma();
		}
	};

	/**
	 * terser's `Binary` printer.
	 * @param {PrintBinaryLike} node a binary, logical or assignment expression, or an assignment pattern
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printBinary = (node, output) => {
		const operator = operatorOf(node);
		printEstree(node.left, output);
		// `>`, `>=`, `>>` or `>>>` straight after `--` would read as `-->`.
		if (operator[0] === ">" && output.last().endsWith("--")) {
			output.print(" ");
		} else {
			output.space();
		}
		output.print(operator);
		output.space();
		printEstree(node.right, output);
	};

	/**
	 * terser's `Call` printer.
	 * @param {PrintCallExpression | PrintNewExpression} node a call or `new`
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printCall = (node, output) => {
		const { callee } = node;
		printEstree(callee, output);
		if (node.type === "NewExpression" && node.arguments.length === 0) return;
		if (kindOf.Call(callee) || kindOf.Lambda(callee)) {
			output.add_mapping(node.startToken);
		}
		if (/** @type {PrintCallExpression} */ (node).optional) output.print("?.");
		printArguments(node.arguments, output);
	};

	/**
	 * terser's `UnaryPrefix` and `UnaryPostfix` printers.
	 * @param {PrintUnary} node a unary or update expression
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printUnary = (node, output) => {
		const { argument, operator } = node;
		if (!node.prefix) {
			printEstree(argument, output);
			output.print(operator);
			return;
		}
		// Lest it print `<!--`.
		if (operator === "--" && output.last().endsWith("!")) output.print(" ");
		output.print(operator);
		if (
			/^[a-z]/i.test(operator) ||
			(/[+-]$/.test(operator) &&
				kindOf.UnaryPrefix(argument) &&
				/^[+-]/.test(/** @type {PrintUnary} */ (argument).operator))
		) {
			output.space();
		}
		printEstree(argument, output);
	};

	/**
	 * terser's `RegExp` printer.
	 * @param {PrintLiteral} node a regular expression literal
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	const printRegExp = (node, output) => {
		const value = /** @type {RegExp} */ (node.value);
		let source = regexpSourceFix(value.source);
		const flags = value.flags ? sortRegexpFlags(value.flags) : "";
		source = source.replace(REGEXP_SLASH_SCRIPT, escapeSlashScript);
		if (REGEXP_STARTS_WITH_SCRIPT.test(source) && output.last().endsWith("<")) {
			output.print(" ");
		}
		output.print(output.to_utf8(`/${source}/${flags}`, false, true));
		const parent = parentOf(output, 0);
		if (
			kindOf.Binary(parent) &&
			/^\w/.test(operatorOf(parent)) &&
			/** @type {PrintBinaryLike} */ (parent).left === node
		) {
			output.print(" ");
		}
	};

	/** @type {EstreeGenerators} */
	const codegen = {
		Program: (node, output) => {
			displayBody(node.body, true, output, true);
			output.print("");
		},
		ExpressionStatement: (node, output) => {
			if (typeof node.directive === "string") {
				const expression = /** @type {PrintLiteral} */ (node.expression);
				output.print_string(expression.value, expression.quote);
			} else {
				printEstree(node.expression, output);
			}
			output.semicolon();
		},
		BlockStatement: (node, output) => {
			const parent = parentOf(output, 0);
			// terser's `Finally` is the block, so prints its keyword too.
			if (parent.type === "TryStatement" && parent.finalizer === node) {
				output.print("finally");
				output.space();
			}
			printBraced(node, node.body, output, false);
		},
		EmptyStatement: (node, output) => {
			output.semicolon();
		},
		DebuggerStatement: (node, output) => {
			output.print("debugger");
			output.semicolon();
		},
		LabeledStatement: (node, output) => {
			printEstree(node.label, output);
			output.colon();
			printEstree(node.body, output);
		},
		DoWhileStatement: (node, output) => {
			output.print("do");
			output.space();
			makeBlock(node.body, output);
			output.space();
			output.print("while");
			output.space();
			printParenthesized(node.test, output);
			output.semicolon();
		},
		WhileStatement: (node, output) => {
			output.print("while");
			output.space();
			printParenthesized(node.test, output);
			output.space();
			printMaybeBracedBody(node.body, output);
		},
		ForStatement: (node, output) => {
			const { init, test, update } = node;
			output.print("for");
			output.space();
			output.print("(");
			if (init) {
				if (init.type === "VariableDeclaration") printEstree(init, output);
				else parenthesizeForNoin(init, output, true);
				output.print(";");
				output.space();
			} else {
				output.print(";");
			}
			if (test) {
				printEstree(test, output);
				output.print(";");
				output.space();
			} else {
				output.print(";");
			}
			if (update) printEstree(update, output);
			output.print(")");
			output.space();
			printMaybeBracedBody(node.body, output);
		},
		ForInStatement: printForIn,
		ForOfStatement: printForIn,
		WithStatement: (node, output) => {
			output.print("with");
			output.space();
			printParenthesized(node.object, output);
			output.space();
			printMaybeBracedBody(node.body, output);
		},
		ReturnStatement: (node, output) => {
			printExit(node, "return", output);
		},
		ThrowStatement: (node, output) => {
			printExit(node, "throw", output);
		},
		BreakStatement: (node, output) => {
			printLoopControl(node, "break", output);
		},
		ContinueStatement: (node, output) => {
			printLoopControl(node, "continue", output);
		},
		IfStatement: (node, output) => {
			const { alternate } = node;
			output.print("if");
			output.space();
			printParenthesized(node.test, output);
			output.space();
			if (!alternate) {
				printMaybeBracedBody(node.consequent, output);
				return;
			}
			makeThen(node, output);
			output.space();
			output.print("else");
			output.space();
			if (alternate.type === "IfStatement") printEstree(alternate, output);
			else printMaybeBracedBody(alternate, output);
		},
		SwitchStatement: (node, output) => {
			const { cases } = node;
			output.print("switch");
			output.space();
			printParenthesized(node.discriminant, output);
			output.space();
			if (cases.length === 0) {
				printBracedEmpty(node, output);
				return;
			}
			const last = cases.length - 1;
			output.print("{");
			for (let i = 0; i <= last; i++) {
				output.indent();
				printEstree(cases[i], output);
				if (i < last && cases[i].consequent.length > 0) output.newline();
			}
			output.print("}");
		},
		SwitchCase: (node, output) => {
			if (node.test) {
				output.print("case");
				output.space();
				printEstree(node.test, output);
				output.print(":");
			} else {
				output.print("default:");
			}
			output.newline();
			for (const statement of node.consequent) {
				output.indent();
				printEstree(statement, output);
				output.newline();
			}
		},
		TryStatement: (node, output) => {
			output.print("try");
			output.space();
			printEstree(node.block, output);
			if (node.handler) {
				output.space();
				printEstree(node.handler, output);
			}
			if (node.finalizer) {
				output.space();
				printEstree(node.finalizer, output);
			}
		},
		CatchClause: (node, output) => {
			output.print("catch");
			if (node.param) {
				output.space();
				printParenthesized(node.param, output);
			}
			output.space();
			printBraced(node, node.body.body, output, false);
		},
		VariableDeclaration: (node, output) => {
			const { declarations } = node;
			output.print(node.kind);
			output.space();
			for (let i = 0; i < declarations.length; i++) {
				if (i) output.comma();
				printEstree(declarations[i], output);
			}
			const parent = parentOf(output, 0);
			const isLoopHead =
				parent.type === "ForStatement"
					? parent.init === node
					: kindOf.ForIn(parent) && parent.left === node;
			if (!isLoopHead) output.semicolon();
		},
		VariableDeclarator: (node, output) => {
			printEstree(node.id, output);
			const { init } = node;
			if (!init) return;
			output.space();
			output.print("=");
			output.space();
			const grandparent = parentOf(output, 1);
			parenthesizeForNoin(
				init,
				output,
				grandparent.type === "ForStatement" || kindOf.ForIn(grandparent)
			);
		},
		ImportDeclaration: (node, output) => {
			const { specifiers } = node;
			output.print("import");
			output.space();
			if (node.phase) {
				output.print(node.phase);
				output.space();
			}
			const hasDefault =
				specifiers.length > 0 &&
				specifiers[0].type === "ImportDefaultSpecifier";
			// terser holds the default import's name alone, with no node around it.
			if (hasDefault) {
				printEstree(
					/** @type {PrintImportLocalSpecifier} */ (specifiers[0]).local,
					output
				);
			}
			const named = hasDefault ? 1 : 0;
			if (named < specifiers.length) {
				if (hasDefault) {
					output.print(",");
					output.space();
				}
				if (specifiers[named].type === "ImportNamespaceSpecifier") {
					printEstree(specifiers[named], output);
				} else {
					printSpecifiers(specifiers, named, output);
				}
			}
			if (specifiers.length > 0) {
				output.space();
				output.print("from");
				output.space();
			}
			printEstree(node.source, output);
			printAttributes(node, output);
			output.semicolon();
		},
		ImportSpecifier: (node, output) => {
			printNameMapping(node.local, node.imported, true, output);
		},
		ImportNamespaceSpecifier: (node, output) => {
			output.print("*");
			output.space();
			output.print("as");
			output.space();
			printEstree(node.local, output);
		},
		ImportAttribute: (node, output) => {
			const { key } = node;
			printPropertyName(
				keyName(key),
				/** @type {PrintLiteral} */ (key).quote,
				output
			);
			output.colon();
			printEstree(node.value, output);
		},
		ExportSpecifier: (node, output) => {
			printNameMapping(node.local, node.exported, false, output);
		},
		ExportNamedDeclaration: (node, output) => {
			output.print("export");
			output.space();
			if (node.declaration) {
				printEstree(node.declaration, output);
				return;
			}
			printSpecifiers(node.specifiers, 0, output);
			printSource(node, output);
		},
		ExportAllDeclaration: (node, output) => {
			output.print("export");
			output.space();
			output.print("*");
			if (node.exported) {
				output.space();
				output.print("as");
				output.space();
				printForeignName(node.exported, output);
			}
			printSource(node, output);
		},
		ExportDefaultDeclaration: (node, output) => {
			const { declaration } = node;
			output.print("export");
			output.space();
			output.print("default");
			output.space();
			printEstree(declaration, output);
			if (
				!kindOf.Class(declaration) &&
				declaration.type !== "FunctionExpression" &&
				declaration.type !== "FunctionDeclaration"
			) {
				output.semicolon();
			}
		},
		Identifier: (node, output) => {
			output.print_name(node.name);
		},
		PrivateIdentifier: (node, output) => {
			output.print(`#${node.name}`);
		},
		Literal: (node, output) => {
			if (node.regex) {
				printRegExp(node, output);
			} else if (node.bigint !== undefined) {
				output.print(
					output.option("keep_numbers") && node.raw
						? node.raw
						: `${node.bigint}n`
				);
			} else if (typeof node.value === "number") {
				output.print(
					(output.option("keep_numbers") || output.use_asm) && node.raw
						? node.raw
						: makeNum(node.value)
				);
			} else if (typeof node.value === "string") {
				output.print_string(node.value, node.quote, output.in_directive);
			} else {
				output.print(String(node.value));
			}
		},
		ThisExpression: (node, output) => {
			output.print("this");
		},
		Super: (node, output) => {
			output.print("super");
		},
		MetaProperty: (node, output) => {
			output.print(`${node.meta.name}.${node.property.name}`);
		},
		ArrayExpression: (node, output) => {
			const { elements } = node;
			output.print("[");
			if (elements.length > 0) output.space();
			printElements(elements, output);
			if (elements.length > 0) output.space();
			output.print("]");
		},
		ArrayPattern: (node, output) => {
			output.print("[");
			printElements(node.elements, output);
			output.print("]");
		},
		ObjectPattern: (node, output) => {
			output.print("{");
			printElements(node.properties, output);
			output.print("}");
		},
		ObjectExpression: (node, output) => {
			const { properties } = node;
			if (properties.length === 0) {
				printBracedEmpty(node, output);
				return;
			}
			output.print("{");
			for (let i = 0; i < properties.length; i++) {
				if (i) {
					output.print(",");
					output.newline();
				}
				output.indent();
				printEstree(properties[i], output);
			}
			output.newline();
			output.print("}");
		},
		Property: (node, output) => {
			if (node.kind === "init" && !node.method) {
				printKeyValue(node, output);
			} else {
				printMethod(node, methodKeyword(node), output);
			}
		},
		MethodDefinition: (node, output) => {
			printMethod(node, methodKeyword(node), output);
		},
		PropertyDefinition: (node, output) => {
			if (node.static) {
				output.print("static");
				output.space();
			}
			const { key } = node;
			if (key.type === "PrivateIdentifier") {
				output.print("#");
				printPropertyName(key.name, undefined, output);
			} else if (node.computed) {
				output.print("[");
				printEstree(key, output);
				output.print("]");
			} else {
				printPropertyName(keyName(key), node.quote, output);
			}
			if (node.value) {
				output.print("=");
				printEstree(node.value, output);
			}
			output.semicolon();
		},
		StaticBlock: (node, output) => {
			output.print("static");
			output.space();
			printBraced(node, node.body, output, false);
		},
		SpreadElement: (node, output) => {
			output.print("...");
			printEstree(node.argument, output);
		},
		RestElement: (node, output) => {
			output.print("...");
			printEstree(node.argument, output);
		},
		AssignmentPattern: printBinary,
		AssignmentExpression: printBinary,
		LogicalExpression: printBinary,
		BinaryExpression: (node, output) => {
			if (node.left.type !== "PrivateIdentifier") {
				printBinary(node, output);
				return;
			}
			printEstree(node.left, output);
			output.space();
			output.print("in");
			output.space();
			printEstree(node.right, output);
		},
		UnaryExpression: printUnary,
		UpdateExpression: printUnary,
		ConditionalExpression: (node, output) => {
			printEstree(node.test, output);
			output.space();
			output.print("?");
			output.space();
			printEstree(node.consequent, output);
			output.space();
			output.colon();
			printEstree(node.alternate, output);
		},
		SequenceExpression: (node, output) => {
			const { expressions } = node;
			for (let i = 0; i < expressions.length; i++) {
				if (i > 0) {
					output.comma();
					if (output.should_break()) {
						output.newline();
						output.indent();
					}
				}
				printEstree(expressions[i], output);
			}
		},
		CallExpression: printCall,
		NewExpression: (node, output) => {
			output.print("new");
			output.space();
			printCall(node, output);
		},
		ImportExpression: (node, output) => {
			output.print(node.phase ? `import.${node.phase}` : "import");
			printArguments(
				node.options ? [node.source, node.options] : [node.source],
				output
			);
		},
		ChainExpression: (node, output) => {
			printEstree(node.expression, output);
		},
		MemberExpression: (node, output) => {
			const { object, property } = node;
			printEstree(object, output);
			if (node.computed) {
				if (node.optional) output.print("?.");
				output.print("[");
				printEstree(property, output);
				output.print("]");
				return;
			}
			const name = /** @type {PrintIdentifier | PrintPrivateIdentifier} */ (
				property
			).name;
			if (property.type === "PrivateIdentifier") {
				if (node.optional) output.print("?");
				output.print(".#");
				output.add_mapping(node.endToken);
				output.print_name(name);
				return;
			}
			const printComputed = ALL_RESERVED_WORDS.has(name)
				? output.option("ie8")
				: !isIdentifierString(
						name,
						output.option("ecma") >= 2015 && !output.option("safari10")
					);
			if (node.optional) output.print("?.");
			if (printComputed) {
				output.print("[");
				output.add_mapping(node.endToken);
				output.print_string(name);
				output.print("]");
				return;
			}
			// `1..x`: a dot straight after an integer literal is its fraction's.
			if (
				isNumber(object) &&
				object.value >= 0 &&
				!/[xa-f.)]/i.test(output.last())
			) {
				output.print(".");
			}
			if (!node.optional) output.print(".");
			output.add_mapping(node.endToken);
			output.print_name(name);
		},
		TemplateLiteral: (node, output) => {
			const parent = parentOf(output, 0);
			const isTagged = parent.type === "TaggedTemplateExpression";
			const { expressions, quasis } = node;
			output.print("`");
			for (let i = 0; i < quasis.length; i++) {
				const { value } = quasis[i];
				if (isTagged) output.print(value.raw);
				else output.print_template_string_chars(value.cooked);
				if (i < expressions.length) {
					output.print("${");
					printEstree(expressions[i], output);
					output.print("}");
				}
			}
			output.print("`");
		},
		TaggedTemplateExpression: (node, output) => {
			const { tag } = node;
			const parenthesizeTag =
				kindOf.Lambda(tag) ||
				kindOf.Binary(tag) ||
				tag.type === "ConditionalExpression" ||
				tag.type === "SequenceExpression" ||
				kindOf.Unary(tag) ||
				(kindOf.Dot(tag) &&
					/** @type {PrintMemberExpression} */ (tag).object.type ===
						"ObjectExpression");
			if (parenthesizeTag) output.print("(");
			printEstree(tag, output);
			if (parenthesizeTag) output.print(")");
			printEstree(node.quasi, output);
		},
		AwaitExpression: (node, output) => {
			output.print("await");
			output.space();
			const { argument } = node;
			const parens = !(
				kindOf.Call(argument) ||
				argument.type === "Identifier" ||
				argument.type === "MemberExpression" ||
				kindOf.Unary(argument) ||
				argument.type === "Literal" ||
				argument.type === "AwaitExpression" ||
				argument.type === "ObjectExpression"
			);
			if (parens) output.print("(");
			printEstree(argument, output);
			if (parens) output.print(")");
		},
		YieldExpression: (node, output) => {
			output.print(node.delegate ? "yield*" : "yield");
			if (node.argument) {
				output.space();
				printEstree(node.argument, output);
			}
		},
		FunctionExpression: printFunction,
		FunctionDeclaration: printFunction,
		ArrowFunctionExpression: (node, output) => {
			const parent = parentOf(output, 0);
			const parenthesized =
				((parent.type === "BinaryExpression" ||
					parent.type === "LogicalExpression") &&
					parent.left.type !== "PrivateIdentifier") ||
				kindOf.Unary(parent) ||
				(kindOf.Call(parent) && parent.callee === node);
			if (parenthesized) output.print("(");
			if (node.async) {
				output.print("async");
				output.space();
			}
			const { params } = node;
			if (params.length === 1 && params[0].type === "Identifier") {
				printEstree(params[0], output);
			} else {
				printArguments(params, output);
			}
			output.space();
			output.print("=>");
			output.space();
			const statements = node.body.body;
			if (statements.length === 1 && statements[0].type === "ReturnStatement") {
				const returned = statements[0].argument;
				if (!returned) {
					output.print("{}");
				} else if (leftIsObject(returned)) {
					output.print("(");
					printEstree(returned, output);
					output.print(")");
				} else {
					printEstree(returned, output);
				}
			} else {
				printBraced(node, statements, output, false);
			}
			if (parenthesized) output.print(")");
			gcScope(node, output);
		},
		ClassExpression: printClass,
		ClassDeclaration: printClass
	};

	/**
	 * terser's `needs_parens` of a unary, update or `await`, before what only
	 * one of them asks.
	 * @param {PrintNode} node the node
	 * @param {PrintParent} parent its parent
	 * @returns {boolean} whether it is parenthesized
	 */
	const isCalledOrAccessed = (node, parent) =>
		(parent.type === "MemberExpression" && parent.object === node) ||
		(kindOf.Call(parent) && parent.callee === node);

	/**
	 * terser's `needs_parens` of a binary or logical expression or an
	 * assignment pattern.
	 * @type {(node: PrintBinaryLike, output: OutputStream) => boolean | undefined}
	 */
	const binaryNeedsParens = (node, output) => {
		const parent = parentOf(output, 0);
		if (kindOf.Unary(parent) || isCalledOrAccessed(node, parent)) return true;
		const operator = operatorOf(node);
		if (kindOf.Binary(parent)) {
			const parentOperator = operatorOf(parent);
			// `??` mixed with `||` or `&&` is a syntax error without parens.
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
					(node === /** @type {PrintBinaryLike} */ (parent).right ||
						parentOperator === "**"))
			) {
				return true;
			}
		}
		if (kindOf.PrivateIn(parent)) {
			const parentPrecedence = PRECEDENCE.in;
			const precedence = PRECEDENCE[operator];
			if (
				parentPrecedence > precedence ||
				(parentPrecedence === precedence &&
					node === /** @type {PrintBinary} */ (parent).right)
			) {
				return true;
			}
		}
	};

	/**
	 * terser's `needs_parens` of a private `in`.
	 * @type {(node: PrintBinary, output: OutputStream) => boolean | undefined}
	 */
	const privateInNeedsParens = (node, output) => {
		const parent = parentOf(output, 0);
		if (kindOf.Unary(parent) || isCalledOrAccessed(node, parent)) return true;
		if (kindOf.Binary(parent)) {
			const parentOperator = operatorOf(parent);
			const parentPrecedence = PRECEDENCE[parentOperator];
			const precedence = PRECEDENCE.in;
			if (
				parentPrecedence > precedence ||
				(parentPrecedence === precedence &&
					(node === /** @type {PrintBinaryLike} */ (parent).right ||
						parentOperator === "**"))
			) {
				return true;
			}
		}
		if (
			kindOf.PrivateIn(parent) &&
			node === /** @type {PrintBinary} */ (parent).right
		) {
			return true;
		}
	};

	/**
	 * terser's `needs_parens` of an assignment or a conditional.
	 * @type {(node: PrintBinary | PrintConditionalExpression, output: OutputStream) => boolean | undefined}
	 */
	const assignNeedsParens = (node, output) => {
		const parent = parentOf(output, 0);
		if (
			kindOf.Unary(parent) ||
			(kindOf.Binary(parent) && parent.type !== "AssignmentExpression") ||
			isCalledOrAccessed(node, parent) ||
			(parent.type === "ConditionalExpression" && parent.test === node)
		) {
			return true;
		}
		// `({a, b} = c)`, an object destructuring assignment.
		if (
			node.type === "AssignmentExpression" &&
			node.left.type === "ObjectPattern"
		) {
			return true;
		}
	};

	/**
	 * terser's `needs_parens` of a unary or update expression.
	 * @type {(node: PrintUnary, output: OutputStream) => boolean | undefined}
	 */
	const unaryNeedsParens = (node, output) => {
		const parent = parentOf(output, 0);
		return (
			isCalledOrAccessed(node, parent) ||
			(kindOf.Binary(parent) &&
				/** @type {PrintBinary} */ (parent).operator === "**" &&
				kindOf.UnaryPrefix(node) &&
				/** @type {PrintBinary} */ (parent).left === node &&
				node.operator !== "++" &&
				node.operator !== "--")
		);
	};

	/** @type {EstreeParensTests} */
	const needsParens = {
		FunctionExpression: (node, output) => {
			if (!output.has_parens() && firstInStatement(output)) return true;
			const parent = parentOf(output, 0);
			if (
				output.option("webkit") &&
				parent.type === "MemberExpression" &&
				parent.object === node
			) {
				return true;
			}
			if (
				output.option("wrap_iife") &&
				kindOf.Call(parent) &&
				parent.callee === node
			) {
				return true;
			}
			return (
				output.option("wrap_func_args") &&
				kindOf.Call(parent) &&
				parent.arguments.includes(node)
			);
		},
		ArrowFunctionExpression: (node, output) => {
			const parent = parentOf(output, 0);
			if (
				output.option("wrap_func_args") &&
				kindOf.Call(parent) &&
				parent.arguments.includes(node)
			) {
				return true;
			}
			return (
				(parent.type === "MemberExpression" && parent.object === node) ||
				(parent.type === "ConditionalExpression" && parent.test === node)
			);
		},
		// Otherwise `{...}` would read as a block.
		ObjectExpression: (node, output) =>
			!output.has_parens() && firstInStatement(output),
		ClassExpression: (node, output) => firstInStatement(output),
		UnaryExpression: unaryNeedsParens,
		UpdateExpression: unaryNeedsParens,
		AwaitExpression: (node, output) => {
			const parent = parentOf(output, 0);
			return (
				isCalledOrAccessed(node, parent) ||
				(kindOf.Binary(parent) &&
					/** @type {PrintBinary} */ (parent).operator === "**" &&
					/** @type {PrintBinary} */ (parent).left === node) ||
				(output.option("safari10") && kindOf.UnaryPrefix(parent))
			);
		},
		SequenceExpression: (node, output) => {
			const parent = parentOf(output, 0);
			return (
				kindOf.Call(parent) ||
				kindOf.Unary(parent) ||
				kindOf.Binary(parent) ||
				parent.type === "VariableDeclarator" ||
				(parent.type === "MemberExpression" && node !== parent.property) ||
				parent.type === "ArrayExpression" ||
				kindOf.ObjectProperty(parent) ||
				parent.type === "ConditionalExpression" ||
				parent.type === "ArrowFunctionExpression" ||
				kindOf.Expansion(parent) ||
				(parent.type === "ForOfStatement" && node === parent.right) ||
				parent.type === "YieldExpression" ||
				kindOf.Export(parent)
			);
		},
		BinaryExpression: (node, output) =>
			node.left.type === "PrivateIdentifier"
				? privateInNeedsParens(node, output)
				: binaryNeedsParens(node, output),
		LogicalExpression: binaryNeedsParens,
		AssignmentPattern: binaryNeedsParens,
		AssignmentExpression: assignNeedsParens,
		ConditionalExpression: assignNeedsParens,
		YieldExpression: (node, output) => {
			const parent = parentOf(output, 0);
			// `a = yield 3` needs none.
			return (
				(kindOf.Binary(parent) && operatorOf(parent) !== "=") ||
				isCalledOrAccessed(node, parent) ||
				(parent.type === "ConditionalExpression" && parent.test === node) ||
				kindOf.Unary(parent)
			);
		},
		ChainExpression: (node, output) => {
			const parent = parentOf(output, 0);
			return isCalledOrAccessed(node, parent);
		},
		MemberExpression: (node, output) => {
			const parent = parentOf(output, 0);
			// A call inside `new (a.b().c)` would otherwise take the `new`'s arguments.
			return (
				parent.type === "NewExpression" &&
				parent.callee === node &&
				findNode(node, findCall)
			);
		},
		TaggedTemplateExpression: (node, output) => {
			const parent = parentOf(output, 0);
			return parent.type === "NewExpression" && parent.callee === node;
		},
		CallExpression: (node, output) => {
			const parent = parentOf(output, 0);
			const calleeIsFunction = node.callee.type === "FunctionExpression";
			if (
				(parent.type === "NewExpression" && parent.callee === node) ||
				(parent.type === "ExportDefaultDeclaration" && calleeIsFunction)
			) {
				return true;
			}
			// Safari bug: https://bugs.webkit.org/show_bug.cgi?id=123506
			if (
				!calleeIsFunction ||
				parent.type !== "MemberExpression" ||
				parent.object !== node
			) {
				return false;
			}
			const grandparent = parentOf(output, 1);
			return (
				grandparent.type === "AssignmentExpression" &&
				grandparent.left === parent
			);
		},
		NewExpression: (node, output) => {
			const parent = parentOf(output, 0);
			return (
				node.arguments.length === 0 &&
				(parent.type === "MemberExpression" ||
					(kindOf.Call(parent) && parent.callee === node) ||
					(parent.type === "TaggedTemplateExpression" && parent.tag === node))
			);
		},
		Literal: (node, output) => {
			const parent = parentOf(output, 0);
			if (parent.type !== "MemberExpression" || parent.object !== node) {
				return false;
			}
			if (isNumber(node)) {
				return node.value < 0 || makeNum(node.value).startsWith("0");
			}
			return node.bigint !== undefined && node.bigint.startsWith("-");
		}
	};

	modules.printEstree = printEstree;
	const MinifiedOutput =
		/** @type {ReturnType<typeof createMinifiedOutput>} */ (
			modules.MinifiedOutput
		);
	const toPrintTree = /** @type {PrintTreeReader} */ (modules.toPrintTree);
	// Shared with `correct`, which wraps an entry.
	modules.estreeCodegen = codegen;

	/**
	 * @param {FormatOptions=} given format options
	 * @returns {OutputStream} a stream as terser's `print_to_string` makes
	 */
	const createStringStream = (given) => {
		const options = minifiedOptions(defaults(given, FORMAT_DEFAULTS, true));
		if (options.shorthand === undefined) options.shorthand = options.ecma > 5;
		return new MinifiedOutput(options, !given, ESTREE_NODE_ACCESS);
	};

	/**
	 * terser's `print_to_string`: a node's text.
	 * @param {Node} node terser's node
	 * @param {FormatOptions=} given format options
	 * @param {number=} context where it sits, an expression unless given
	 * @returns {string} its text
	 */
	const printToString = (node, given, context) => {
		const output = createStringStream(given);
		printEstree(
			/** @type {PrintNode} */ (toPrintTree(node, undefined, context)),
			output
		);
		return output.get();
	};
	modules.printToString = printToString;
	ast.SyntaxNode.DEFMETHOD(
		"print_to_string",
		/**
		 * @this {Node} the node printed
		 * @param {FormatOptions=} given format options
		 * @returns {string} its text
		 */
		function printNodeToString(given) {
			return printToString(this, given);
		}
	);

	/**
	 * terser's `print_braced` of a function's body: its statements in braces.
	 * @param {PrintFunction} node the function
	 * @param {OutputStream} output the stream printed into
	 * @returns {void}
	 */
	modules.printFunctionBody = (node, output) => {
		printBraced(node, node.body.body, output, false);
	};

	/**
	 * terser's `print_to_string` of a node read as ESTree.
	 * @param {PrintNode} node the node
	 * @returns {string} its text
	 */
	modules.printEstreeToString = (node) => {
		const output = createStringStream();
		printEstree(node, output);
		return output.get();
	};

	/**
	 * @param {PrintNode} node a computed key
	 * @param {CharacterCounter} identifiers the identifier source counting
	 * @returns {void}
	 */
	const skipString = (node, identifiers) => {
		if (node.type === "Literal" && typeof node.value === "string") {
			identifiers.consider(node.value, -1);
		} else if (node.type === "ConditionalExpression") {
			skipString(node.consequent, identifiers);
			skipString(node.alternate, identifiers);
		} else if (node.type === "SequenceExpression") {
			skipString(node.expressions[node.expressions.length - 1], identifiers);
		}
	};
	/**
	 * @param {EXPECTED_ANY} identifiers an identifier source
	 * @returns {boolean} whether it orders its names by the characters counted
	 */
	const countsFrequency = (identifiers) =>
		Boolean(identifiers.reset && identifiers.consider && identifiers.sort);

	/**
	 * terser's `compute_char_frequency` over a tree `analyzeManglingScopes`
	 * read: counts the characters the output prints, less the names mangled.
	 * @param {PrintNode} printNode the tree
	 * @param {EXPECTED_ANY} options the formatted mangle options
	 * @returns {void}
	 */
	modules.computeEstreeCharFrequency = (printNode, options) => {
		/** @type {CharacterCounter} */
		const identifiers = options.nth_identifier;
		if (!countsFrequency(identifiers)) return;
		identifiers.reset();
		const output = createStringStream();
		onPrinted = (node) => {
			if (node.type === "Identifier") {
				const { definition } = node;
				// A label's name is always mangled.
				if (
					definition &&
					!("kinds" in definition && isUnmangleable(definition, options, null))
				) {
					identifiers.consider(node.name, -1);
				}
			} else if (options.properties && node.type === "MemberExpression") {
				const { property } = node;
				if (node.computed) {
					skipString(property, identifiers);
				} else if (property.type === "PrivateIdentifier") {
					identifiers.consider(`#${property.name}`, -1);
				} else {
					identifiers.consider(
						/** @type {PrintIdentifier} */ (property).name,
						-1
					);
				}
			}
		};
		try {
			printEstree(printNode, output);
		} finally {
			onPrinted = undefined;
		}
		identifiers.consider(output.get(), 1);
		identifiers.sort();
	};
};

// How a definition's name was declared, one code per symbol class of terser's
// that declares; a global is a name nothing declares.
const DECLARES_VAR = 1;
const DECLARES_FUNARG = 2;
const DECLARES_LET = 3;
const DECLARES_CONST = 4;
const DECLARES_USING = 5;
const DECLARES_CATCH = 6;
const DECLARES_IMPORT = 7;
const DECLARES_DEFUN = 8;
const DECLARES_LAMBDA = 9;
const DECLARES_CLASS = 10;
const DECLARES_DEF_CLASS = 11;
const DECLARES_GLOBAL = 12;

// The `DECLARES_*` code of each of terser's symbol classes naming a function
// or a class.
/** @type {Record<string, number>} */
const DECLARING_NAME_KINDS = {
	SymbolDefun: DECLARES_DEFUN,
	SymbolLambda: DECLARES_LAMBDA,
	SymbolClass: DECLARES_CLASS,
	SymbolDefClass: DECLARES_DEF_CLASS
};

// Which of terser's scopes a mangling scope stands for, one bit each.
const MANGLING_BLOCK = 1;
const MANGLING_LAMBDA = 1 << 1;
const MANGLING_CLASS = 1 << 2;
const MANGLING_STATIC_BLOCK = 1 << 3;
const MANGLING_TOPLEVEL = 1 << 4;

// What the scope analysis records of a name read, replayed once all is declared.
const REFERENCE_CALLED = 1;
const REFERENCE_EXPORTED = 1 << 1;
const REFERENCE_FROM_MODULE = 1 << 2;
const REFERENCE_CATCH = 1 << 3;

/**
 * One of terser's scopes, read off an ESTree tree: what the mangler names in.
 * @typedef {object} ManglingScope
 * @property {PrintNode} node the node opening it
 * @property {ManglingScope | null} parent the scope enclosing it
 * @property {ManglingScope} defun the nearest scope enclosing it, itself included, that is not a block's
 * @property {number} kind which of terser's scopes it is, as the `MANGLING_*` bits
 * @property {Map<string, ManglingDefinition>} variables the names it declares, in the order declared
 * @property {ManglingDefinition[]} enclosed the definitions it or a scope inside it reads, in the order first read
 * @property {number} cname how many names it has handed out, less one
 * @property {boolean} usesEval whether a direct `eval` can reach its names
 * @property {boolean} usesWith whether a `with` can reach its names
 * @property {ManglingDefinition | null} functionName a function expression's own name
 */

/**
 * One name declared in one scope, or a global: terser's `SymbolDef`, less what
 * only the compressor reads.
 * @typedef {object} ManglingDefinition
 * @property {string} name the name
 * @property {number[]} kinds how each declaration of it was written, as the `DECLARES_*` codes
 * @property {ManglingScope} scope the scope declaring it, the toplevel for a global
 * @property {boolean} global whether the toplevel declares it
 * @property {boolean} undeclared whether nothing declares it
 * @property {number} export how an `export` naming it keeps its name, as `EXPORT_*`
 * @property {string | null} mangledName the name mangling gives it
 * @property {ManglingReference[] | null} references what reads a catch parameter, where `ie8` or `safari10` move it
 */

/** @typedef {{ identifier: PrintIdentifier, scope: ManglingScope }} ManglingReference a name read, and the scope reading it */

/**
 * A label: a statement's, its `break`s and `continue`s naming it too.
 * @typedef {object} ManglingLabel
 * @property {string} name the name
 * @property {string | null} mangledName the name mangling gives it
 * @property {ManglingLabel | null} parent the label of the nearest labeled statement around, across functions
 * @property {number} counter where the mangler's label names stood when it named this one
 */

/**
 * @typedef {object} ManglingAnalysis
 * @property {ManglingScope} toplevel the program's scope
 * @property {ManglingScope[]} scopes every scope, in the order terser's mangler walks them
 * @property {ManglingLabel[]} labels every label, in the same order
 * @property {Map<string, ManglingDefinition>} globals the names nothing declares, in the order first read
 * @property {Set<ManglingScope>} blockDefunScopes the function scopes holding a function declared in a block
 * @property {PrintIdentifier[] | null} functionDeclarators under `keep_fnames`, the names declarators give anonymous functions, in the order the mangler asks `keep_fnames` of them
 * @property {PrintIdentifier[]} catchParameters unless `ie8` or `safari10` move them, the catch parameters, in the order the mangler walks them
 * @property {number[]} catchParameterScopeCounts how many of `scopes` the walk had reached at each catch parameter
 */

/**
 * @param {PrintNode} node the node opening it
 * @param {ManglingScope | null} parent the scope enclosing it
 * @param {number} kind which of terser's scopes it is
 * @returns {ManglingScope} the scope, declaring nothing yet
 */
const createManglingScope = (node, parent, kind) => {
	/** @type {ManglingScope} */
	const scope = {
		node,
		parent,
		defun: /** @type {ManglingScope} */ (/** @type {unknown} */ (null)),
		kind,
		variables: new Map(),
		enclosed: [],
		cname: -1,
		usesEval: false,
		usesWith: false,
		functionName: null
	};
	scope.defun =
		kind === MANGLING_BLOCK && parent !== null ? parent.defun : scope;
	return scope;
};

/**
 * @param {ManglingScope} scope the scope declaring it
 * @param {number} kind how it was first declared
 * @param {string} name the name
 * @returns {ManglingDefinition} the definition
 */
const createManglingDefinition = (scope, kind, name) => ({
	name,
	kinds: [kind],
	scope,
	global: false,
	undeclared: false,
	export: 0,
	mangledName: null,
	references: null
});

/**
 * terser's `SymbolDef#unmangleable`: whether mangling keeps a name as written.
 * @param {ManglingDefinition} definition the definition
 * @param {EXPECTED_ANY} options the formatted mangle options
 * @param {Set<ManglingDefinition> | null} keptDefinitions the declarators `keep_fnames` keeps, while mangling
 * @returns {boolean} whether its name is kept
 */
const isUnmangleable = (definition, options, keptDefinitions) => {
	const { name, scope } = definition;
	const first = definition.kinds[0];
	if (
		keptDefinitions !== null &&
		keptDefinitions.has(definition) &&
		keepName(options.keep_fnames, name)
	) {
		return true;
	}
	return (
		(definition.global && !options.toplevel) ||
		(definition.export & EXPORT_KEEP_NAME) !== 0 ||
		definition.undeclared ||
		(!options.eval && (scope.usesEval || scope.usesWith)) ||
		((first === DECLARES_LAMBDA || first === DECLARES_DEFUN) &&
			keepName(options.keep_fnames, name)) ||
		((first === DECLARES_CLASS || first === DECLARES_DEF_CLASS) &&
			keepName(options.keep_classnames, name))
	);
};

/**
 * @param {ManglingScope} from the scope a name is read in
 * @param {string} name the name
 * @returns {ManglingDefinition | undefined} what it resolves to from there
 */
const findManglingVariable = (from, name) => {
	for (
		let scope = /** @type {ManglingScope | null} */ (from);
		scope !== null;
		scope = scope.parent
	) {
		const definition = scope.variables.get(name);
		if (definition !== undefined) return definition;
	}
	return undefined;
};

/**
 * terser's `mark_enclosed`: each scope from one out to a definition's reads it.
 * @param {ManglingScope} from the scope reading it
 * @param {ManglingDefinition} definition the definition
 * @returns {void}
 */
const encloseManglingDefinition = (from, definition) => {
	for (
		let scope = /** @type {ManglingScope | null} */ (from);
		scope !== null;
		scope = scope.parent
	) {
		encloseUnique(scope, definition);
		if (scope === definition.scope) break;
	}
};

// Where the analysis finds the scopes, declarations and names read below a
// node it has no rule of its own for, in the order terser's walk reaches them.
/** @type {Record<string, string[]>} */
const ESTREE_SCOPE_CHILD_KEYS = {
	ArrayExpression: ["elements"],
	AssignmentExpression: ["left", "right"],
	AwaitExpression: ["argument"],
	BinaryExpression: ["left", "right"],
	CallExpression: ["arguments", "callee"],
	ChainExpression: ["expression"],
	ConditionalExpression: ["test", "consequent", "alternate"],
	DebuggerStatement: [],
	EmptyStatement: [],
	ExpressionStatement: ["expression"],
	IfStatement: ["test", "consequent", "alternate"],
	ImportExpression: ["source", "options"],
	Literal: [],
	LogicalExpression: ["left", "right"],
	MetaProperty: [],
	NewExpression: ["arguments", "callee"],
	ObjectExpression: ["properties"],
	PrivateIdentifier: [],
	ReturnStatement: ["argument"],
	SequenceExpression: ["expressions"],
	SpreadElement: ["argument"],
	Super: [],
	SwitchCase: ["test", "consequent"],
	TaggedTemplateExpression: ["tag", "quasi"],
	TemplateLiteral: ["expressions"],
	ThisExpression: [],
	ThrowStatement: ["argument"],
	TryStatement: ["block", "handler", "finalizer"],
	UnaryExpression: ["argument"],
	UpdateExpression: ["argument"],
	WithStatement: ["object", "body"],
	YieldExpression: ["argument"]
};

// A call's children as terser's `walk` reaches them.
const CALL_WALK_KEYS = ["callee", "arguments"];

// Each node's children, as the ESTree mangler's renaming walks them: in
// terser's walk order, but for a call's, which each walk reaches its own way.
/** @type {Record<string, string[]>} */
const ESTREE_RENAMING_CHILD_KEYS = {
	ArrayExpression: ["elements"],
	ArrayPattern: ["elements"],
	ArrowFunctionExpression: ["params", "body"],
	AssignmentExpression: ["left", "right"],
	AssignmentPattern: ["left", "right"],
	AwaitExpression: ["argument"],
	BinaryExpression: ["left", "right"],
	BlockStatement: ["body"],
	BreakStatement: ["label"],
	CatchClause: ["param", "body"],
	ChainExpression: ["expression"],
	ClassBody: ["body"],
	ClassDeclaration: ["id", "superClass", "body"],
	ClassExpression: ["id", "superClass", "body"],
	ConditionalExpression: ["test", "consequent", "alternate"],
	ContinueStatement: ["label"],
	DebuggerStatement: [],
	DoWhileStatement: ["body", "test"],
	EmptyStatement: [],
	ExportAllDeclaration: ["source"],
	ExportDefaultDeclaration: ["declaration"],
	ExportNamedDeclaration: ["declaration", "specifiers", "source"],
	ExportSpecifier: ["local"],
	ExpressionStatement: ["expression"],
	ForInStatement: ["left", "right", "body"],
	ForOfStatement: ["left", "right", "body"],
	ForStatement: ["init", "test", "update", "body"],
	FunctionDeclaration: ["id", "params", "body"],
	FunctionExpression: ["id", "params", "body"],
	IfStatement: ["test", "consequent", "alternate"],
	ImportDeclaration: ["specifiers", "source"],
	ImportDefaultSpecifier: ["local"],
	ImportExpression: ["source", "options"],
	ImportNamespaceSpecifier: ["local"],
	ImportSpecifier: ["local"],
	LabeledStatement: ["label", "body"],
	LogicalExpression: ["left", "right"],
	MemberExpression: ["object", "property"],
	MetaProperty: [],
	MethodDefinition: ["key", "value"],
	ObjectExpression: ["properties"],
	ObjectPattern: ["properties"],
	Program: ["body"],
	Property: ["key", "value"],
	PropertyDefinition: ["key", "value"],
	RestElement: ["argument"],
	ReturnStatement: ["argument"],
	SequenceExpression: ["expressions"],
	SpreadElement: ["argument"],
	StaticBlock: ["body"],
	Super: [],
	SwitchCase: ["test", "consequent"],
	SwitchStatement: ["discriminant", "cases"],
	TaggedTemplateExpression: ["tag", "quasi"],
	TemplateLiteral: ["expressions"],
	ThisExpression: [],
	ThrowStatement: ["argument"],
	TryStatement: ["block", "handler", "finalizer"],
	UnaryExpression: ["argument"],
	UpdateExpression: ["argument"],
	VariableDeclaration: ["declarations"],
	VariableDeclarator: ["id", "init"],
	WhileStatement: ["test", "body"],
	WithStatement: ["object", "body"],
	YieldExpression: ["argument"]
};

/**
 * terser's `manglePrivateProperties`: one name for each private name, in
 * the order its transform first meets them.
 * @typedef {object} PrivateNames
 * @property {{ get: (index: number) => string }} identifiers the identifier source
 * @property {number} counter the names handed out, less one
 * @property {Map<string, string>} names each private name's mangled one
 */

/**
 * @param {PrintNode} node a node
 * @returns {boolean} whether terser holds it as a scope its statements sit in directly
 */
const isEstreeStatementScope = (node) =>
	node.type === "Program" ||
	node.type === "FunctionDeclaration" ||
	node.type === "FunctionExpression" ||
	node.type === "ArrowFunctionExpression" ||
	node.type === "StaticBlock";

/**
 * @param {PrintNode} node a node
 * @returns {node is PrintExportNamedDeclaration | PrintExportDefaultDeclaration | PrintExportAllDeclaration} whether it is an `export`
 */
const isEstreeExport = (node) =>
	node.type === "ExportNamedDeclaration" ||
	node.type === "ExportDefaultDeclaration" ||
	node.type === "ExportAllDeclaration";

/**
 * Installs `analyzeManglingScopes`, terser's `figure_out_scope` as the mangler
 * reads it, over the ESTree tree `toPrintTree` reads with names as written.
 * @param {MinifierModules} modules terser's modules
 * @returns {void}
 */
const installEstreeMangle = (modules) => {
	/** @type {(message: string, file: string | undefined, line: number, col: number, pos: number) => never} */
	const jsError = modules.parse.js_error;

	/**
	 * terser's `figure_out_scope(options)` for its mangler: the same scopes,
	 * definitions, enclosed lists and errors, in the same orders. Each name's
	 * `definition` is set: its definition, its label, or null.
	 * @param {PrintProgram} program the tree, its names as written
	 * @param {EXPECTED_ANY} options the mangle options
	 * @returns {ManglingAnalysis} the scopes
	 */
	const analyzeManglingScopes = (program, options) => {
		const legacyCatch = Boolean(options.ie8 || options.safari10);
		const toplevel = createManglingScope(program, null, MANGLING_TOPLEVEL);
		/** @type {ManglingScope[]} */
		const scopes = [toplevel];
		/** @type {ManglingLabel[]} */
		const labelList = [];
		/** @type {Map<string, ManglingDefinition>} */
		const globals = new Map();
		/** @type {Set<ManglingScope>} */
		const blockDefunScopes = new Set();
		/** @type {PrintIdentifier[] | null} */
		const functionDeclarators = options.keep_fnames ? [] : null;
		/** @type {ManglingScope[]} */
		const forScopes = [];
		// The names read, and catch parameters, in the order terser's walk meets them.
		/** @type {(PrintIdentifier | PrintLiteral)[]} */
		const referenceNodes = [];
		/** @type {ManglingScope[]} */
		const referenceScopes = [];
		/** @type {number[]} */
		const referenceFlags = [];
		// Under `ie8` or `safari10`, the catch parameters in `walk`'s order.
		/** @type {PrintIdentifier[]} */
		const catchNames = [];
		/** @type {ManglingScope[]} */
		const catchScopes = [];
		// Otherwise the catch parameters, which the mangler names in walk order too.
		/** @type {PrintIdentifier[]} */
		const catchParameters = [];
		/** @type {number[]} */
		const catchParameterScopeCounts = [];
		// The nodes terser's walk has pushed, the node visited last.
		/** @type {PrintNode[]} */
		const stack = [];
		let scope = toplevel;
		let defun = toplevel;
		let strict = Boolean(options.module);
		/** @type {Map<string, ManglingLabel>} */
		let labels = new Map();
		/** @type {ManglingLabel | null} */
		let currentLabel = null;
		/** @type {PrintNode | null} */
		let inDestructuring = null;

		/**
		 * @param {number} level how many parents up, the nearest first
		 * @returns {PrintNode | undefined} that parent of the name visited
		 */
		const parentAt = (level) => stack[stack.length - 1 - level];

		/**
		 * @param {PrintNode} node the node a name of which is wrong
		 * @param {string} message the message
		 * @returns {never} never
		 */
		const fail = (node, message) => {
			const start = /** @type {Token} */ (node.startToken);
			return jsError(message, start.file, start.line, start.col, start.pos);
		};

		/**
		 * terser's `def_variable`.
		 * @param {ManglingScope} target the scope declaring it
		 * @param {PrintIdentifier | null} identifier the name declaring it, if written
		 * @param {string} name the name
		 * @param {number} kind how it is declared
		 * @returns {ManglingDefinition} its definition, made or joined
		 */
		const defineVariable = (target, identifier, name, kind) => {
			let definition = target.variables.get(name);
			if (definition !== undefined) {
				definition.kinds.push(kind);
			} else {
				definition = createManglingDefinition(target, kind, name);
				definition.global = target.parent === null;
				if (legacyCatch && kind === DECLARES_CATCH) {
					definition.references = [];
				}
				target.variables.set(name, definition);
			}
			if (identifier !== null) identifier.definition = definition;
			return definition;
		};

		/**
		 * terser's `reference`.
		 * @param {PrintIdentifier} identifier the name read
		 * @param {ManglingScope} from the scope reading it
		 * @param {ManglingDefinition} definition what it reads
		 * @returns {void}
		 */
		const reference = (identifier, from, definition) => {
			if (definition.references !== null) {
				definition.references.push({ identifier, scope: from });
			}
			encloseManglingDefinition(from, definition);
		};

		/**
		 * terser's `markExport`, which counts its levels on terser's stack.
		 * @param {ManglingDefinition} definition a definition just made
		 * @param {number} level where its declaration's statement is
		 * @returns {void}
		 */
		const markExport = (definition, level) => {
			if (inDestructuring !== null) {
				let i = 0;
				do {
					level++;
				} while (parentAt(i++) !== inDestructuring);
			}
			const node = parentAt(level);
			if (node === undefined || !isEstreeExport(node)) {
				definition.export = 0;
				return;
			}
			// An ESTree tree read in makes a declaration a value terser keeps named.
			definition.export =
				node.type === "ExportDefaultDeclaration" &&
				node.heldAsDefinition &&
				(node.declaration.type === "FunctionDeclaration" ||
					node.declaration.type === "ClassDeclaration")
					? EXPORT_WANT_MANGLE
					: EXPORT_KEEP_NAME;
		};

		/**
		 * @param {PrintNode} node an import or export
		 * @param {string} type terser's name for it
		 * @returns {void}
		 */
		const checkModuleStatement = (node, type) => {
			if (scope !== toplevel) {
				fail(node, `"${type}" statement may only appear at the top level`);
			}
		};

		/**
		 * @param {PrintNode} node a block's node
		 * @returns {ManglingScope} the scope it leaves, now `scope`'s parent
		 */
		const enterBlock = (node) => {
			const outer = scope;
			scope = createManglingScope(node, outer, MANGLING_BLOCK);
			scope.usesWith = outer.usesWith;
			scope.usesEval = outer.usesEval;
			scopes.push(scope);
			return outer;
		};

		/**
		 * @param {PrintIdentifier | PrintLiteral} node a name read, or a re-exported string
		 * @param {number} flags what else is known of it
		 * @returns {void}
		 */
		const addReference = (node, flags) => {
			referenceNodes.push(node);
			referenceScopes.push(scope);
			referenceFlags.push(flags);
		};

		/**
		 * @param {(PrintNode | null)[]} nodes nodes, holes null
		 * @returns {void}
		 */
		const visitList = (nodes) => {
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				if (node !== null) visit(node);
			}
		};

		/**
		 * A name a declaration or a pattern binds, or reads where `kind` is 0.
		 * @param {PrintNode} node the name or pattern
		 * @param {number} kind how it declares, as a `DECLARES_*` code, or 0
		 * @returns {void}
		 */
		const visitBinding = (node, kind) => {
			switch (node.type) {
				case "Identifier":
					if (kind === 0) visit(node);
					else declare(node, kind);
					return;
				case "ObjectPattern":
					visitPattern(node, node.properties, kind);
					return;
				case "ArrayPattern":
					visitPattern(node, node.elements, kind);
					return;
				case "AssignmentPattern":
					stack.push(node);
					visitBinding(node.left, kind);
					visit(node.right);
					stack.pop();
					return;
				case "RestElement":
					stack.push(node);
					visitBinding(node.argument, kind);
					stack.pop();
					return;
				default:
					visit(node);
			}
		};

		/**
		 * @param {PrintObject | PrintArray} pattern an object or array pattern
		 * @param {(PrintNode | null)[]} elements its properties or elements, holes null
		 * @param {number} kind how it declares, as a `DECLARES_*` code, or 0
		 * @returns {void}
		 */
		const visitPattern = (pattern, elements, kind) => {
			const outer = inDestructuring;
			inDestructuring = pattern;
			stack.push(pattern);
			for (let i = 0; i < elements.length; i++) {
				const element = elements[i];
				if (element === null) continue;
				if (element.type !== "Property") {
					visitBinding(element, kind);
					continue;
				}
				stack.push(element);
				if (element.computed) visit(element.key);
				visitBinding(element.value, kind);
				stack.pop();
			}
			stack.pop();
			inDestructuring = outer;
		};

		/**
		 * A `var`, parameter, `let`, `const`, `using`, catch parameter or import.
		 * @param {PrintIdentifier} identifier the name declared
		 * @param {number} kind how, as a `DECLARES_*` code
		 * @returns {void}
		 */
		const declare = (identifier, kind) => {
			const { name } = identifier;
			if (kind === DECLARES_IMPORT) {
				defineVariable(scope, identifier, name, kind);
				return;
			}
			const blockDeclaration =
				kind === DECLARES_LET ||
				kind === DECLARES_CONST ||
				kind === DECLARES_USING ||
				kind === DECLARES_CATCH;
			const definition = defineVariable(
				blockDeclaration ? scope : defun,
				identifier,
				name,
				kind
			);
			const { kinds } = definition;
			for (let i = 0; i < kinds.length - 1; i++) {
				const other = kinds[i];
				if (
					blockDeclaration
						? other !== DECLARES_LAMBDA
						: other === DECLARES_LET ||
							other === DECLARES_CONST ||
							other === DECLARES_USING
				) {
					fail(identifier, `"${name}" is redeclared`);
				}
			}
			if (kind !== DECLARES_FUNARG) markExport(definition, 2);
			if (defun !== scope) {
				encloseManglingDefinition(scope, definition);
				const found = /** @type {ManglingDefinition} */ (
					findManglingVariable(scope, name)
				);
				if (found !== definition) {
					identifier.definition = found;
					reference(identifier, scope, found);
				}
			}
			if (kind === DECLARES_CATCH) {
				addReference(identifier, REFERENCE_CATCH);
				if (legacyCatch) {
					catchNames.push(identifier);
					catchScopes.push(scope);
				} else {
					catchParameters.push(identifier);
					catchParameterScopeCounts.push(scopes.length);
				}
			}
		};

		/**
		 * @param {PrintFunction} node a function
		 * @returns {void}
		 */
		const visitFunction = (node) => {
			const outerStrict = strict;
			const outer = scope;
			const outerDefun = defun;
			const outerLabels = labels;
			if (
				node.type === "FunctionDeclaration" &&
				!isEstreeStatementScope(stack[stack.length - 1])
			) {
				blockDefunScopes.add(outer.defun);
			}
			stack.push(node);
			const lambda = createManglingScope(node, outer, MANGLING_LAMBDA);
			scopes.push(lambda);
			if (node.type !== "ArrowFunctionExpression") {
				defineVariable(lambda, null, "arguments", DECLARES_FUNARG);
			}
			scope = defun = lambda;
			labels = new Map();
			const { id } = node;
			if (id === null) {
				// An arrow or a method has no name of its own.
			} else if (node.idDeclares === DECLARES_DEFUN) {
				markExport(
					defineVariable(
						strict ? outer : outer.defun,
						id,
						id.name,
						DECLARES_DEFUN
					),
					1
				);
			} else {
				defineVariable(lambda, id, id.name, DECLARES_LAMBDA);
			}
			if (id !== null && node.type === "FunctionExpression") {
				lambda.functionName = /** @type {ManglingDefinition} */ (id.definition);
			}
			const { params } = node;
			for (let i = 0; i < params.length; i++) {
				visitBinding(params[i], DECLARES_FUNARG);
			}
			visitList(node.body.body);
			scope = outer;
			defun = outerDefun;
			labels = outerLabels;
			strict = outerStrict;
			stack.pop();
		};

		/**
		 * @param {PrintClass} node a class
		 * @returns {void}
		 */
		const visitClass = (node) => {
			const outerStrict = strict;
			const outer = scope;
			const outerDefun = defun;
			const outerLabels = labels;
			stack.push(node);
			strict = true;
			const classScope = createManglingScope(node, outer, MANGLING_CLASS);
			scopes.push(classScope);
			scope = defun = classScope;
			labels = new Map();
			const { id } = node;
			if (id !== null) {
				markExport(
					node.idDeclares === DECLARES_DEF_CLASS
						? defineVariable(outer, id, id.name, DECLARES_DEF_CLASS)
						: defineVariable(classScope, id, id.name, DECLARES_CLASS),
					1
				);
			}
			if (node.superClass !== null) visit(node.superClass);
			visitList(node.body.body);
			scope = outer;
			defun = outerDefun;
			labels = outerLabels;
			strict = outerStrict;
			stack.pop();
		};

		/**
		 * @param {PrintNode} node a node not a binding
		 * @returns {void}
		 */
		const visit = (node) => {
			switch (node.type) {
				case "Identifier": {
					if (node.atom === true) return;
					const parent = stack[stack.length - 1];
					addReference(
						node,
						node.name === "eval" &&
							(parent.type === "CallExpression" ||
								parent.type === "NewExpression")
							? REFERENCE_CALLED
							: 0
					);
					return;
				}
				case "FunctionDeclaration":
				case "FunctionExpression":
				case "ArrowFunctionExpression":
					visitFunction(node);
					return;
				case "ClassDeclaration":
				case "ClassExpression":
					visitClass(node);
					return;
				case "BlockStatement":
				case "ForStatement":
				case "ForInStatement":
				case "ForOfStatement":
				case "WhileStatement":
				case "DoWhileStatement": {
					stack.push(node);
					const outer = enterBlock(node);
					if (node.type === "BlockStatement") {
						visitList(node.body);
					} else {
						if (options.safari10 && node.type.startsWith("For")) {
							forScopes.push(scope);
						}
						visitLoop(node);
					}
					scope = outer;
					stack.pop();
					return;
				}
				case "SwitchStatement": {
					stack.push(node);
					const outer = enterBlock(node);
					// The switched expression belongs to the scope around the switch.
					const block = scope;
					scope = outer;
					visit(node.discriminant);
					scope = block;
					visitList(node.cases);
					scope = outer;
					stack.pop();
					return;
				}
				case "CatchClause": {
					stack.push(node);
					const outer = enterBlock(node);
					if (node.param !== null) visitBinding(node.param, DECLARES_CATCH);
					visitList(node.body.body);
					scope = outer;
					stack.pop();
					return;
				}
				case "StaticBlock": {
					const outer = scope;
					const outerDefun = defun;
					const outerLabels = labels;
					stack.push(node);
					scope = defun = createManglingScope(
						node,
						outer,
						MANGLING_STATIC_BLOCK
					);
					scopes.push(scope);
					labels = new Map();
					visitList(node.body);
					scope = outer;
					defun = outerDefun;
					labels = outerLabels;
					stack.pop();
					return;
				}
				case "ExpressionStatement":
					if (typeof node.directive === "string") {
						if (node.directive === "use strict") strict = true;
						return;
					}
					break;
				case "LabeledStatement": {
					const labelName = /** @type {PrintIdentifier} */ (node.label);
					const { name } = labelName;
					if (labels.has(name)) {
						throw new Error(`Label ${name} defined twice`);
					}
					/** @type {ManglingLabel} */
					const label = {
						name,
						mangledName: null,
						parent: currentLabel,
						counter: -1
					};
					labelList.push(label);
					labelName.definition = label;
					labels.set(name, label);
					stack.push(node);
					currentLabel = label;
					visit(node.body);
					currentLabel = label.parent;
					stack.pop();
					labels.delete(name);
					return;
				}
				case "BreakStatement":
				case "ContinueStatement": {
					const name = /** @type {PrintIdentifier | null} */ (node.label);
					if (name === null) return;
					const label = labels.get(name.name);
					if (label === undefined) {
						const start = /** @type {Token} */ (name.startToken);
						throw new Error(
							`Undefined label ${name.name} [${start.line},${start.col}]`
						);
					}
					name.definition = label;
					return;
				}
				case "WithStatement":
					for (
						let outer = /** @type {ManglingScope | null} */ (scope);
						outer !== null;
						outer = outer.parent
					) {
						outer.usesWith = true;
					}
					break;
				case "VariableDeclaration":
					visitDeclaration(node);
					return;
				case "Property":
				case "MethodDefinition":
				case "PropertyDefinition":
					stack.push(node);
					if (node.computed) visit(node.key);
					if (node.value !== null) visit(node.value);
					stack.pop();
					return;
				case "ObjectPattern":
				case "ArrayPattern":
				case "AssignmentPattern":
				case "RestElement":
					visitBinding(node, 0);
					return;
				case "MemberExpression":
					stack.push(node);
					visit(node.object);
					if (node.computed) visit(node.property);
					stack.pop();
					return;
				case "ImportDeclaration": {
					checkModuleStatement(node, "Import");
					stack.push(node);
					const { specifiers } = node;
					for (let i = 0; i < specifiers.length; i++) {
						const specifier =
							/** @type {PrintImportLocalSpecifier | PrintImportSpecifier} */ (
								specifiers[i]
							);
						// terser holds a default import's name with no node around it.
						const mapped = specifier.type !== "ImportDefaultSpecifier";
						if (mapped) stack.push(specifier);
						declare(
							/** @type {PrintIdentifier} */ (specifier.local),
							DECLARES_IMPORT
						);
						if (mapped) stack.pop();
					}
					stack.pop();
					return;
				}
				case "ExportNamedDeclaration": {
					checkModuleStatement(node, "Export");
					stack.push(node);
					if (node.declaration !== null) visit(node.declaration);
					const fromModule = node.source !== null;
					const { specifiers } = node;
					for (let i = 0; i < specifiers.length; i++) {
						const specifier = /** @type {PrintExportSpecifier} */ (
							specifiers[i]
						);
						stack.push(specifier);
						addReference(
							/** @type {PrintIdentifier | PrintLiteral} */ (specifier.local),
							fromModule
								? REFERENCE_EXPORTED | REFERENCE_FROM_MODULE
								: REFERENCE_EXPORTED
						);
						stack.pop();
					}
					stack.pop();
					return;
				}
				case "ExportDefaultDeclaration":
					checkModuleStatement(node, "Export");
					stack.push(node);
					visit(node.declaration);
					stack.pop();
					return;
				case "ExportAllDeclaration":
					// terser's `*` reads a global no name in the output depends on.
					checkModuleStatement(node, "Export");
					return;
				case "CallExpression":
				case "NewExpression":
					if (legacyCatch) {
						visitCall(node);
						return;
					}
					break;
				default:
			}
			const keys = ESTREE_SCOPE_CHILD_KEYS[node.type];
			if (keys === undefined) {
				throw new Error(
					`analyzeManglingScopes cannot read a ${node.type} node`
				);
			}
			const fields = /** @type {PrintFields} */ (/** @type {unknown} */ (node));
			stack.push(node);
			for (let i = 0; i < keys.length; i++) {
				const child = fields[keys[i]];
				if (child === null || child === undefined) continue;
				if (Array.isArray(child)) visitList(child);
				else visit(child);
			}
			stack.pop();
		};

		/**
		 * A call under `ie8` or `safari10`, whose catch parameters terser's
		 * `walk` meets callee first, where its `_walk` meets the arguments first.
		 * @param {PrintCallExpression | PrintNewExpression} node the call
		 * @returns {void}
		 */
		const visitCall = (node) => {
			stack.push(node);
			const argumentsStart = catchNames.length;
			visitList(node.arguments);
			const calleeStart = catchNames.length;
			visit(node.callee);
			if (argumentsStart < calleeStart && calleeStart < catchNames.length) {
				catchNames.splice(argumentsStart, 0, ...catchNames.splice(calleeStart));
				catchScopes.splice(
					argumentsStart,
					0,
					...catchScopes.splice(calleeStart)
				);
			}
			stack.pop();
		};

		/**
		 * A loop's children, its scope entered.
		 * @param {PrintForStatement | PrintForInStatement | PrintForOfStatement | PrintWhileStatement} node the loop
		 * @returns {void}
		 */
		const visitLoop = (node) => {
			switch (node.type) {
				case "ForStatement":
					if (node.init !== null) visit(node.init);
					if (node.test !== null) visit(node.test);
					if (node.update !== null) visit(node.update);
					break;
				case "WhileStatement":
					visit(node.test);
					break;
				case "DoWhileStatement":
					visit(node.body);
					visit(node.test);
					return;
				default:
					visitBinding(node.left, 0);
					visit(node.right);
			}
			visit(node.body);
		};

		/**
		 * @param {PrintVariableDeclaration} node a `var`, `let`, `const` or `using`
		 * @returns {void}
		 */
		const visitDeclaration = (node) => {
			const kind =
				node.kind === "var"
					? DECLARES_VAR
					: node.kind === "let"
						? DECLARES_LET
						: node.kind === "const"
							? DECLARES_CONST
							: DECLARES_USING;
			stack.push(node);
			const { declarations } = node;
			for (let i = 0; i < declarations.length; i++) {
				const declarator = /** @type {PrintVariableDeclarator} */ (
					declarations[i]
				);
				const { id, init } = declarator;
				if (
					functionDeclarators !== null &&
					kind !== DECLARES_USING &&
					id.type === "Identifier" &&
					init !== null &&
					(init.type === "FunctionExpression" ||
						init.type === "ArrowFunctionExpression") &&
					init.id === null
				) {
					functionDeclarators.push(id);
				}
				stack.push(declarator);
				visitBinding(id, kind);
				if (init !== null) visit(init);
				stack.pop();
			}
			stack.pop();
		};

		// Pass 1: chain the scopes and define each declared name.
		stack.push(program);
		visitList(program.body);
		stack.pop();

		// Pass 2: resolve each name read, find `eval`, enclose catch redefinitions.
		for (let i = 0; i < referenceNodes.length; i++) {
			const node = referenceNodes[i];
			const from = referenceScopes[i];
			const flags = referenceFlags[i];
			if (flags & REFERENCE_CATCH) {
				// The definition a catch parameter redefines in its function's scope.
				const redefinition = from.defun.variables.get(
					/** @type {PrintIdentifier} */ (node).name
				);
				if (redefinition !== undefined) {
					encloseManglingDefinition(from, redefinition);
				}
				continue;
			}
			const name =
				node.type === "Identifier"
					? node.name
					: /** @type {string} */ (node.value);
			if (flags & REFERENCE_CALLED) {
				for (
					let outer = /** @type {ManglingScope | null} */ (from);
					outer !== null && !outer.usesEval;
					outer = outer.parent
				) {
					outer.usesEval = true;
				}
			}
			let definition =
				flags & REFERENCE_FROM_MODULE
					? undefined
					: findManglingVariable(from, name);
			if (definition === undefined) {
				definition = globals.get(name);
				if (definition === undefined) {
					definition = createManglingDefinition(
						toplevel,
						DECLARES_GLOBAL,
						name
					);
					definition.undeclared = true;
					definition.global = true;
					globals.set(name, definition);
				}
				if (flags & REFERENCE_EXPORTED) definition.export = EXPORT_KEEP_NAME;
			}
			if (node.type === "Identifier") {
				node.definition = definition;
				reference(node, from, definition);
			} else {
				// A re-exported string reads a global, which keeps no references.
				encloseManglingDefinition(from, definition);
			}
		}

		// Passes 3 and 4: work around old engines' catch and loop scopes.
		for (let i = 0; i < catchNames.length; i++) {
			const identifier = catchNames[i];
			const { name } = identifier;
			const references =
				/** @type {ManglingReference[]} */
				(/** @type {ManglingDefinition} */ (identifier.definition).references);
			const defunScope = catchScopes[i].defun;
			const definition =
				findManglingVariable(defunScope, name) ||
				globals.get(name) ||
				defineVariable(defunScope, null, name, DECLARES_CATCH);
			// As terser's `forEach`: referencing appends to the list it reads.
			const { length } = references;
			for (let j = 0; j < length; j++) {
				const read = references[j];
				read.identifier.definition = definition;
				reference(read.identifier, read.scope, definition);
			}
			identifier.definition = definition;
			reference(identifier, catchScopes[i], definition);
		}
		for (const forScope of forScopes) {
			for (const definition of /** @type {ManglingScope} */ (
				forScope.parent
			).variables.values()) {
				encloseUnique(forScope, definition);
			}
		}

		return {
			toplevel,
			scopes,
			labels: labelList,
			globals,
			blockDefunScopes,
			functionDeclarators,
			catchParameters,
			catchParameterScopeCounts
		};
	};
	modules.analyzeManglingScopes = analyzeManglingScopes;
	modules.isUnmangleable = isUnmangleable;

	const { ALL_RESERVED_WORDS } = modules.parse;
	const { base54 } = modules.scope;

	/**
	 * The definition a catch parameter redefines in the enclosing function
	 * scope, which owns the name the two share.
	 * @param {ManglingDefinition} definition the catch parameter's definition
	 * @returns {ManglingDefinition | undefined} the definition it redefines
	 */
	const redefinedCatchDefinition = (definition) =>
		definition.kinds[0] === DECLARES_CATCH &&
		definition.scope.kind === MANGLING_BLOCK
			? definition.scope.defun.variables.get(definition.name)
			: undefined;

	/**
	 * terser's `mangle_names` over an analysis: names each label, then each
	 * definition it may rename, setting their `mangledName`.
	 * @param {ManglingAnalysis} analysis the scopes, as `analyzeManglingScopes` read them
	 * @param {EXPECTED_ANY} options the formatted mangle options
	 * @returns {void}
	 */
	const mangleManglingScopes = (analysis, options) => {
		const identifiers = options.nth_identifier;
		const { reserved, cache } = options;
		const { scopes, labels, blockDefunScopes, catchParameters } = analysis;
		/** @type {Set<ManglingDefinition> | null} */
		let keptDefinitions = null;
		const { functionDeclarators } = analysis;
		if (functionDeclarators !== null) {
			keptDefinitions = new Set();
			for (let i = 0; i < functionDeclarators.length; i++) {
				const identifier = functionDeclarators[i];
				if (keepName(options.keep_fnames, identifier.name)) {
					keptDefinitions.add(
						/** @type {ManglingDefinition} */ (identifier.definition)
					);
				}
			}
		}
		for (let i = 0; i < labels.length; i++) {
			const label = labels[i];
			let counter = label.parent === null ? -1 : label.parent.counter;
			let name;
			do {
				name = identifiers.get(++counter);
			} while (ALL_RESERVED_WORDS.has(name));
			label.counter = counter;
			label.mangledName = name;
		}

		/** @type {ManglingDefinition[]} */
		const toMangle = [];
		// An export's own name, which no scope hands out even where it is unseen.
		/** @type {Set<string>} */
		const unmangleableNames = new Set();
		/**
		 * @param {ManglingDefinition} definition a definition in some scope
		 * @returns {void}
		 */
		const collect = (definition) => {
			if (definition.export & EXPORT_KEEP_NAME) {
				unmangleableNames.add(definition.name);
			} else if (!reserved.has(definition.name)) {
				toMangle.push(definition);
			}
		};
		if (cache) {
			for (const definition of analysis.globals.values()) collect(definition);
		}
		const legacyCatch = options.ie8 || options.safari10;
		let catchIndex = 0;
		for (let i = 0; i < scopes.length; i++) {
			for (const definition of scopes[i].variables.values()) {
				collect(definition);
			}
			if (legacyCatch) continue;
			// A catch parameter is named where the walk meets it, reserved or not.
			while (
				catchIndex < catchParameters.length &&
				analysis.catchParameterScopeCounts[catchIndex] === i + 1
			) {
				toMangle.push(
					/** @type {ManglingDefinition} */ (
						catchParameters[catchIndex++].definition
					)
				);
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
				blockDefunScopes
			);
			return;
		}

		/** @type {Map<ManglingScope, Set<string>>} */
		const takenByScope = new Map();
		// WHY: the names a scope may not reuse are the ones its enclosed
		// definitions carry, and terser rereads that list for every candidate it
		// tries — quadratic in a bundle's one big scope. Reading it once is safe
		// because an enclosed definition belongs to an outer scope, and outer
		// scopes are mangled before inner ones, so the answer no longer moves
		// by the time a scope first asks.
		/**
		 * @param {ManglingScope} owner the scope handing out a name
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
					definition.mangledName ||
					(isUnmangleable(definition, options, null) && definition.name);
				if (name) taken.add(name);
			}
			takenByScope.set(owner, taken);
			return taken;
		};

		for (let i = 0; i < toMangle.length; i++) {
			const definition = toMangle[i];
			if (definition.mangledName || isUnmangleable(definition, options, null)) {
				continue;
			}
			const redefinition = redefinedCatchDefinition(definition);
			if (redefinition) {
				definition.mangledName = redefinition.mangledName || redefinition.name;
				continue;
			}
			const owner = definition.scope;
			// Safari reads `(function x(x) {})` in strict mode as a syntax error.
			let shadowed = null;
			const named = owner.functionName;
			if (named !== null && definition.kinds[0] === DECLARES_FUNARG) {
				shadowed = named.mangledName || named.name;
			}
			let counting = owner;
			if (blockDefunScopes.size !== 0 && blockDefunScopes.has(owner.defun)) {
				counting = owner.defun;
			}
			const taken = takenIn(counting);
			let name;
			for (;;) {
				name = identifiers.get(++counting.cname);
				if (ALL_RESERVED_WORDS.has(name)) continue;
				if (reserved.has(name)) continue;
				if (unmangleableNames.has(name)) continue;
				if (taken.has(name)) continue;
				if (shadowed !== null && shadowed === name) continue;
				break;
			}
			definition.mangledName = name;
		}
	};

	/**
	 * terser's `mangle_names` as written, for the options the fast path leaves
	 * out: each definition asks its scope for a name, whose enclosed definitions
	 * it rescans.
	 * @param {ManglingDefinition[]} toMangle the definitions, in the order named
	 * @param {EXPECTED_ANY} options the formatted mangle options
	 * @param {Set<ManglingDefinition> | null} keptDefinitions the declarators `keep_fnames` keeps
	 * @param {Set<string>} unmangleableNames names no definition may take
	 * @param {Set<ManglingScope>} blockDefunScopes the function scopes holding a block's function
	 * @returns {void}
	 */
	const mangleEveryOption = (
		toMangle,
		options,
		keptDefinitions,
		unmangleableNames,
		blockDefunScopes
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
					isUnmangleable(definition, options, keptDefinitions)
				) {
					unmangleableNames.add(definition.name);
				}
			}
		}

		/**
		 * terser's `next_mangled`: the next name a scope hands out that shadows
		 * nothing it or a scope inside it reads.
		 * @param {ManglingScope} from the scope handing out a name
		 * @returns {string} the name
		 */
		const nextMangled = (from) => {
			let scope = from;
			if (blockDefunScopes.size !== 0 && blockDefunScopes.has(scope.defun)) {
				scope = scope.defun;
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
							(isUnmangleable(definition, options, keptDefinitions) &&
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
			if (definition.global && cache && cache.has(definition.name)) {
				definition.mangledName = cache.get(definition.name);
				continue;
			}
			if (
				definition.mangledName ||
				isUnmangleable(definition, options, keptDefinitions)
			) {
				continue;
			}
			let owner = definition.scope;
			if (options.ie8 && definition.kinds[0] === DECLARES_LAMBDA) {
				owner = /** @type {ManglingScope} */ (owner.parent);
			}
			const redefinition = redefinedCatchDefinition(definition);
			let name;
			if (redefinition) {
				name = redefinition.mangledName || redefinition.name;
			} else if (owner.kind === MANGLING_TOPLEVEL) {
				do {
					name = nextMangled(owner);
				} while (mangledNames.has(name));
			} else {
				const named = owner.functionName;
				const shadowed =
					named !== null && definition.kinds[0] === DECLARES_FUNARG
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
	modules.mangleManglingScopes = mangleManglingScopes;

	/**
	 * @param {PrintNode} key a key not computed
	 * @returns {string} the name it is
	 */
	const keyNameOf = (key) =>
		key.type === "Literal"
			? String(key.value)
			: /** @type {PrintIdentifier} */ (key).name;

	/**
	 * What terser's walk reads as a computed key's `name`: a name read, a
	 * function's or class's own name, or nothing.
	 * @param {PrintNode} key a computed key
	 * @returns {string} the name, as terser hands it to property mangling
	 */
	const computedKeyNameOf = (key) => {
		/** @type {string | PrintIdentifier | null | undefined} */
		let name;
		if (key.type === "Identifier") {
			if (key.atom !== true) name = key.name;
		} else if (
			key.type === "FunctionExpression" ||
			key.type === "ClassExpression"
		) {
			name = key.id;
		}
		// Not always a string, which terser's sets and regexp read as it is.
		return /** @type {string} */ (/** @type {unknown} */ (name));
	};

	/**
	 * @param {PrintIdentifier} identifier a name read
	 * @returns {string} what it prints as, mangled or not
	 */
	const printedName = (identifier) => {
		const definition =
			/** @type {ManglingDefinition | ManglingLabel | null} */ (
				identifier.definition
			);
		return definition === null
			? identifier.name
			: definition.mangledName || definition.name;
	};

	/**
	 * terser's `definesProperty`, which prints the callee: only a member
	 * `defineProperty`, not optional, off a name printed `Object`, prints so.
	 * @param {PrintCallExpression | PrintNewExpression} node a call
	 * @returns {boolean} whether it calls `Object.defineProperty`
	 */
	const definesProperty = (node) => {
		const { callee } = node;
		if (
			callee.type !== "MemberExpression" ||
			callee.computed ||
			callee.optional
		) {
			return false;
		}
		const { object, property } = callee;
		return (
			property.type === "Identifier" &&
			property.name === "defineProperty" &&
			object.type === "Identifier" &&
			printedName(object) === "Object"
		);
	};

	/**
	 * Whether the expression a member is read off, followed as terser does
	 * through what it holds as an `expression`, ends in an undeclared global.
	 * @param {PrintMemberExpression} node the member
	 * @returns {boolean} whether its root is undeclared
	 */
	const readsUndeclared = (node) => {
		let root = node.object;
		for (;;) {
			switch (root.type) {
				case "MemberExpression":
					root = root.object;
					continue;
				case "CallExpression":
				case "NewExpression":
					root = root.callee;
					continue;
				case "ChainExpression":
					root = root.expression;
					continue;
				case "AwaitExpression":
				case "UnaryExpression":
				case "UpdateExpression":
					root = root.argument;
					continue;
				case "YieldExpression":
					if (root.argument === null) return false;
					root = root.argument;
					continue;
				case "Identifier": {
					const definition = /** @type {ManglingDefinition | null} */ (
						root.definition
					);
					return definition !== null && definition.undeclared;
				}
				default:
					return false;
			}
		}
	};

	/**
	 * terser's `addStrings`: each string a key may be read from.
	 * @param {PrintNode} node where the key is computed
	 * @param {PropertyNames} names the names found
	 * @returns {void}
	 */
	const addEstreeStrings = (node, names) => {
		if (node.type === "SequenceExpression") {
			addEstreeStrings(node.expressions[node.expressions.length - 1], names);
		} else if (node.type === "Literal") {
			if (typeof node.value === "string") names.add(node.value);
		} else if (node.type === "ConditionalExpression") {
			addEstreeStrings(node.consequent, names);
			addEstreeStrings(node.alternate, names);
		}
	};

	/**
	 * terser's `mangleStrings`: renames each string a key may be read from.
	 * @param {PrintNode} node where the key is computed
	 * @param {PropertyNames} names the names
	 * @returns {void}
	 */
	const mangleEstreeStrings = (node, names) => {
		if (node.type === "SequenceExpression") {
			mangleEstreeStrings(node.expressions[node.expressions.length - 1], names);
		} else if (node.type === "Literal") {
			if (typeof node.value === "string") {
				// Cleared so a key annotation is not mangled a second time.
				node.annotatedKey = false;
				node.value = names.mangle(node.value);
			}
		} else if (node.type === "ConditionalExpression") {
			mangleEstreeStrings(node.consequent, names);
			mangleEstreeStrings(node.alternate, names);
		}
	};

	/**
	 * terser's first walk of `mangle_properties`: every name a property is
	 * found by, in its walk's order.
	 * @param {PrintNode} node a node
	 * @param {PropertyNames} names the names found
	 * @returns {void}
	 */
	const findEstreeProperties = (node, names) => {
		const { keepQuoted } = names;
		switch (node.type) {
			case "Identifier":
			case "PrivateIdentifier":
				return;
			case "Literal":
				if (node.annotatedKey) names.add(/** @type {string} */ (node.value));
				return;
			case "Property":
				if (keepQuoted && node.quote) break;
				if (!node.computed) {
					names.add(keyNameOf(node.key));
				} else if (node.kind !== "init" || node.method) {
					names.add(computedKeyNameOf(node.key));
				}
				break;
			case "MethodDefinition":
			case "PropertyDefinition":
				if (node.key.type === "PrivateIdentifier") break;
				if (keepQuoted && node.quote) break;
				names.add(
					node.computed ? computedKeyNameOf(node.key) : keyNameOf(node.key)
				);
				break;
			case "MemberExpression":
				if (node.computed) {
					if (!keepQuoted) addEstreeStrings(node.property, names);
				} else if (
					node.property.type === "Identifier" &&
					(names.undeclared || !readsUndeclared(node)) &&
					(!keepQuoted || !node.quote)
				) {
					names.add(node.property.name);
				}
				break;
			case "CallExpression":
			case "NewExpression": {
				if (definesProperty(node)) {
					const descriptor = node.arguments[1];
					if (descriptor === undefined) {
						// terser walks the argument it lacks, and throws as it does.
						/** @type {{ walk: () => void }} */ (
							/** @type {unknown} */ (descriptor)
						).walk();
					}
					addEstreeStrings(descriptor, names);
				}
				findEstreeList(node.arguments, names);
				findEstreeProperties(node.callee, names);
				return;
			}
			case "BinaryExpression":
				if (node.operator === "in" && node.left.type !== "PrivateIdentifier") {
					addEstreeStrings(node.left, names);
				}
				break;
			default:
		}
		const keys = ESTREE_RENAMING_CHILD_KEYS[node.type];
		const fields = /** @type {PrintFields} */ (/** @type {unknown} */ (node));
		for (let i = 0; i < keys.length; i++) {
			const child = fields[keys[i]];
			if (child === null || child === undefined) continue;
			if (Array.isArray(child)) findEstreeList(child, names);
			else findEstreeProperties(child, names);
		}
	};

	/**
	 * @param {(PrintNode | null)[]} nodes nodes, holes null
	 * @param {PropertyNames} names the names found
	 * @returns {void}
	 */
	const findEstreeList = (nodes, names) => {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (node !== null) findEstreeProperties(node, names);
		}
	};

	/** @type {PrivateNames | null} */
	let privateNames = null;
	/** @type {PropertyNames | null} */
	let propertyNames = null;

	/**
	 * @param {PrintPrivateIdentifier} identifier a private name
	 * @returns {void}
	 */
	const renamePrivate = (identifier) => {
		const state = /** @type {PrivateNames} */ (privateNames);
		let mangled = state.names.get(identifier.name);
		if (!mangled) {
			mangled = state.identifiers.get(++state.counter);
			state.names.set(identifier.name, mangled);
		}
		identifier.name = mangled;
	};

	/**
	 * Renames a key not computed, and the name its mapping carries where
	 * that is read off the key.
	 * @param {PrintProperty | PrintMethodDefinition | PrintPropertyDefinition} node the member
	 * @param {PropertyNames} names the names
	 * @returns {void}
	 */
	const renameKey = (node, names) => {
		const { key } = node;
		const name = keyNameOf(key);
		const mangled = names.mangle(name);
		if (mangled === name) return;
		if (key.type === "Literal") key.value = mangled;
		else /** @type {PrintIdentifier} */ (key).name = mangled;
		if (node.type === "Property") {
			if (node.kind === "init" && !node.method) node.mapName = mangled;
		} else if (node.type === "PropertyDefinition") {
			const start = node.startToken;
			if (!start || start.type !== "string") node.mapName = mangled;
		}
	};

	/**
	 * Gives each name the name mangling chose, and renames private names and,
	 * where on, properties: terser's transforms, in their order.
	 * @param {PrintNode} node a node
	 * @returns {void}
	 */
	const renameEstree = (node) => {
		const names = propertyNames;
		switch (node.type) {
			case "Identifier": {
				const definition =
					/** @type {ManglingDefinition | ManglingLabel | null} */ (
						node.definition
					);
				if (definition) {
					if (definition.mangledName) node.name = definition.mangledName;
					node.definition = null;
				}
				return;
			}
			case "PrivateIdentifier":
				return;
			case "Literal":
				if (names !== null && node.annotatedKey) {
					node.annotatedKey = false;
					node.value = names.mangle(/** @type {string} */ (node.value));
				}
				return;
			case "Property":
				if (
					names !== null &&
					!node.computed &&
					(!names.keepQuoted || !node.quote)
				) {
					renameKey(node, names);
				}
				break;
			case "MethodDefinition":
			case "PropertyDefinition": {
				const { key } = node;
				if (key.type === "PrivateIdentifier") {
					if (privateNames !== null) renamePrivate(key);
				} else if (
					names !== null &&
					!node.computed &&
					(!names.keepQuoted || !node.quote)
				) {
					renameKey(node, names);
				}
				break;
			}
			case "MemberExpression": {
				const { property } = node;
				if (property.type === "PrivateIdentifier") {
					if (privateNames !== null) renamePrivate(property);
				} else if (names !== null) {
					if (node.computed) {
						if (!names.keepQuoted) mangleEstreeStrings(property, names);
					} else if (!names.keepQuoted || !node.quote) {
						const identifier = /** @type {PrintIdentifier} */ (property);
						identifier.name = names.mangle(identifier.name);
					}
				}
				break;
			}
			case "BinaryExpression":
				if (node.operator === "in") {
					const { left } = node;
					if (left.type === "PrivateIdentifier") {
						if (privateNames !== null) renamePrivate(left);
					} else if (names !== null) {
						mangleEstreeStrings(left, names);
					}
				}
				break;
			case "CallExpression":
			case "NewExpression":
				if (names !== null && definesProperty(node)) {
					mangleEstreeStrings(node.arguments[1], names);
				}
				renameEstree(node.callee);
				renameEstreeList(node.arguments);
				return;
			default:
		}
		const keys = ESTREE_RENAMING_CHILD_KEYS[node.type];
		const fields = /** @type {PrintFields} */ (/** @type {unknown} */ (node));
		for (let i = 0; i < keys.length; i++) {
			const child = fields[keys[i]];
			if (child === null || child === undefined) continue;
			if (Array.isArray(child)) renameEstreeList(child);
			else renameEstree(child);
		}
	};

	/**
	 * @param {(PrintNode | null)[]} nodes nodes, holes null
	 * @returns {void}
	 */
	const renameEstreeList = (nodes) => {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i];
			if (node !== null) renameEstree(node);
		}
	};

	/**
	 * Names a tree `analyzeManglingScopes` read as `mangleManglingScopes`
	 * chose, then mangles its private names and, given their options, its
	 * properties, as terser's `minify` does in turn.
	 * @param {PrintNode} tree the tree
	 * @param {EXPECTED_ANY} options the formatted mangle options
	 * @param {PropertyNames | null} properties property mangling's names, unless off
	 * @param {boolean} hasPrivateNames whether the tree may name a private member
	 * @returns {void}
	 */
	const renameMangledEstree = (tree, options, properties, hasPrivateNames) => {
		if (properties !== null) findEstreeProperties(tree, properties);
		privateNames = hasPrivateNames
			? {
					identifiers: options.nth_identifier,
					counter: -1,
					names: new Map()
				}
			: null;
		try {
			// Interleaved, the two would call an identifier source of the
			// caller's in another order: only terser's own is known to be pure.
			if (
				privateNames !== null &&
				properties !== null &&
				(privateNames.identifiers !== base54 ||
					properties.identifiers !== base54)
			) {
				renameEstree(tree);
				privateNames = null;
			}
			propertyNames = properties;
			renameEstree(tree);
		} finally {
			privateNames = null;
			propertyNames = null;
		}
	};
	modules.renameMangledEstree = renameMangledEstree;

	/**
	 * The first function in a tree, its children in terser's `walk` order.
	 * @param {PrintNode} node a node
	 * @returns {PrintFunction | undefined} the function, if any
	 */
	const firstFunction = (node) => {
		if (
			node.type === "FunctionExpression" ||
			node.type === "ArrowFunctionExpression"
		) {
			return node;
		}
		const keys =
			node.type === "CallExpression" || node.type === "NewExpression"
				? CALL_WALK_KEYS
				: ESTREE_RENAMING_CHILD_KEYS[node.type];
		// A name or literal holds none.
		if (keys === undefined) return undefined;
		const fields = /** @type {PrintFields} */ (/** @type {unknown} */ (node));
		for (let i = 0; i < keys.length; i++) {
			const child = fields[keys[i]];
			if (child === null || child === undefined) continue;
			const children = Array.isArray(child) ? child : [child];
			for (let j = 0; j < children.length; j++) {
				const element = children[j];
				if (element === null) continue;
				const found = firstFunction(element);
				if (found !== undefined) return found;
			}
		}
		return undefined;
	};

	/**
	 * terser's mangling of a `new Function` body minified as a program of its
	 * own: the program read, mangled, and its first function.
	 * @param {Node} program terser's program, compressed
	 * @param {EXPECTED_ANY} given the mangle options
	 * @returns {PrintFunction | undefined} the function, mangled
	 */
	modules.mangledFunctionOf = (program, given) => {
		const options = formatMangleOptions(given, base54);
		const tree = /** @type {PrintProgram} */ (
			modules.toPrintTree(program, undefined, undefined, true, true)
		);
		const analysis = analyzeManglingScopes(tree, options);
		modules.computeEstreeCharFrequency(tree, options);
		mangleManglingScopes(analysis, options);
		renameMangledEstree(tree, options, null, false);
		return firstFunction(tree);
	};
};

// The phases webpack has taken over, each writing exactly what terser wrote,
// only faster, but `correct`, fixing what it wrote wrong, and `improve`,
// writing less where that provably runs the same; add phases here only.
/** @type {Phase[]} */
const PHASES = [
	{ name: "helpers", install: installHelpers },
	{ name: "walk", install: installWalk },
	{ name: "nodes", install: installNodes },
	{ name: "defines", install: installDefines },
	{ name: "estree", install: installEstree },
	{ name: "printTree", install: installPrintTree },
	{ name: "parse", install: installFusedParse },
	{ name: "transform", install: installTransform },
	{ name: "compressor", install: installCompressor },
	{ name: "size", install: installSize },
	{ name: "evaluate", install: installEvaluate },
	{ name: "inference", install: installInference },
	{ name: "drop", install: installDropSideEffectFree },
	{ name: "optimize", install: installOptimize },
	{ name: "equivalent", install: installEquivalent },
	{ name: "hoist", install: installHoist },
	{ name: "scope", install: installScope },
	{ name: "unused", install: installUnused },
	{ name: "reduce", install: installReduce },
	{ name: "minify", install: installMinify },
	{ name: "frequency", install: installFrequency },
	{ name: "output", install: installOutput },
	{ name: "estreePrint", install: installEstreePrint },
	{ name: "estreeMangle", install: installEstreeMangle },
	{ name: "correct", install: installCorrect },
	{ name: "improve", install: installImprove }
];

/** @type {Promise<Minifier> | undefined} */
let loading;

/**
 * terser's `OutputStream(options)`: the format options defaulted and checked as
 * terser's stream does, written into webpack's stream, which writes no layout.
 * @param {MinifierModules} modules the modules, `MinifiedOutput` among them
 * @param {EXPECTED_ANY=} given the format options
 * @returns {EXPECTED_ANY} the stream
 */
const createOutputStream = (modules, given) => {
	const options = defaults(given, FORMAT_DEFAULTS, true);
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

/**
 * What terser's modules export that the phases read, built by webpack: the
 * node classes, the parser, the compressor, the mangler's names and the
 * output stream. The phases install the rest.
 * @returns {MinifierModules} the modules
 */
const createModules = () => {
	/** @type {MinifierModules} */
	const modules = /** @type {EXPECTED_ANY} */ ({});
	modules.ast = createAst();
	modules.parse = createParseTables();
	modules.scope = { base54: createFrequency(mergeSort) };
	modules.compress = { Compressor: createCompressor(modules) };
	modules.output = {
		OutputStream: (/** @type {EXPECTED_ANY=} */ given) =>
			createOutputStream(modules, given)
	};
	modules.domprops = {
		domprops: require("./syntax-printer-data").domProperties()
	};
	return modules;
};

/**
 * webpack's minifier: the modules with every phase installed. Built once, so
 * a worker builds it once.
 * @returns {Promise<Minifier>} the minifier and the phases it is built from
 */
const load = () => {
	if (loading === undefined) {
		loading = Promise.resolve().then(() => {
			const modules = createModules();
			for (const phase of PHASES) phase.install(modules);
			return {
				minify: modules.minify,
				phases: PHASES.map((phase) => phase.name),
				corrections: modules.corrections,
				improvements: modules.improvements,
				modules
			};
		});
	}
	return loading;
};

module.exports = {
	load,
	PHASES,
	FORMAT_DEFAULTS,
	IGNORED_FORMAT_OPTIONS,
	createAst,
	createModules,
	createCompressHelpers,
	createUnicode,
	estreeType,
	markEstreeTypes
};
