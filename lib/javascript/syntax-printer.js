/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/* eslint-disable camelcase, new-cap -- terser's own API, which this speaks */

// cspell:ignore DEFMETHOD, Defun, defun, fnames, funarg, classnames, mangleable, unmangleable, NOINLINE, privatename, argnames, thedef

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

/** @typedef {EXPECTED_ANY} Node one of terser's AST nodes */
/** @typedef {EXPECTED_ANY} Token one of terser's tokens */
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

/**
 * @param {TerserFormatOptions} options defaulted format options
 * @returns {boolean} whether webpack's stream writes this output
 */
const minifiedOutputFits = (options) =>
	!options.beautify && !options.max_line_len;

/**
 * Whether this terser exposes what the phase reads: the stream's option set
 * and members, and the two entry points a tree is printed through.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const outputFits = ({ ast, output, utils, unicode }) => {
	if (
		typeof output.OutputStream !== "function" ||
		typeof utils.defaults !== "function" ||
		typeof ast.AST_Node.prototype._print !== "function" ||
		typeof ast.AST_Node.prototype.print_to_string !== "function" ||
		typeof unicode.get_full_char !== "function" ||
		typeof unicode.get_full_char_code !== "function" ||
		typeof unicode.is_basic_identifier_string !== "function" ||
		typeof unicode.is_identifier_char !== "function" ||
		typeof unicode.is_identifier_char_broad !== "function" ||
		typeof unicode.is_identifier_start !== "function" ||
		typeof unicode.is_identifier_start_broad !== "function"
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
 * webpack's stream for minified output, answering terser's code generators
 * through the same members terser's own `OutputStream` does and writing the
 * same bytes. It covers the output a build asks for — no `beautify`, no
 * `max_line_len` — so it never inserts a line break behind what it wrote.
 * @param {TerserModules} modules terser's modules
 * @returns {new (options: TerserFormatOptions, readonly: boolean) => EXPECTED_ANY} the stream class
 */
const createMinifiedOutput = ({ ast, unicode }) => {
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
		AST_Yield,
		TreeWalker
	} = ast;
	const {
		get_full_char,
		get_full_char_code,
		is_basic_identifier_string,
		is_identifier_char,
		is_identifier_char_broad,
		is_identifier_start,
		is_identifier_start_broad
	} = unicode;

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
		return is_identifier_char_broad(character);
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
									`\\u{${get_full_char_code(character, 0).toString(16)}}`
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
						let character = get_full_char(str, 0);
						let escaped = character;
						if (
							is_identifier_start_broad(character) &&
							!is_identifier_start(character)
						) {
							escaped = unicodeEscape(
								/** @type {number} */ (character.codePointAt(0))
							);
						}
						for (let i = character.length; i < str.length;) {
							character = get_full_char(str, i);
							escaped +=
								is_identifier_char_broad(character) &&
								!is_identifier_char(character)
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
								return /[0-9]/.test(get_full_char(original, i + 1))
									? "\\x00"
									: "\\0";
						}
						return character;
					}
				);
			}
			str = this.to_utf8(str);
			if (quote === "`") return `\`${str.replace(/`/g, "\\`")}\``;
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
					: `'${str.replace(/'/g, "\\'")}'`;
			}
			return doubleQuotes === 0 ? `"${str}"` : `"${str.replace(/"/g, '\\"')}"`;
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
					code >= 0xd800 && code <= 0xdfff ? get_full_char(str, 0) : str[0];
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
					is_basic_identifier_string(name) ? name : undefined
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
			if (start.comments_before && printed.has(start.comments_before)) {
				if (!keywordWithValue) return;
				start.comments_before = [];
			}
			/** @type {Comment[]} */
			let comments = start.comments_before;
			if (!comments) comments = start.comments_before = [];
			printed.add(comments);

			if (keywordWithValue) {
				const walker = new TreeWalker(
					/**
					 * @param {Node} inner a node on the value's leftmost edge
					 * @returns {boolean | undefined} true past that edge
					 */
					(inner) => {
						const parent = walker.parent();
						if (
							parent instanceof AST_Exit ||
							parent instanceof AST_Await ||
							parent instanceof AST_Yield ||
							(parent instanceof AST_Binary && parent.left === inner) ||
							(parent.TYPE === "Call" && parent.expression === inner) ||
							(parent instanceof AST_Conditional &&
								parent.condition === inner) ||
							(parent instanceof AST_Dot && parent.expression === inner) ||
							(parent instanceof AST_Sequence &&
								parent.expressions[0] === inner) ||
							(parent instanceof AST_Sub && parent.expression === inner) ||
							parent instanceof AST_UnaryPostfix
						) {
							if (!inner.start) return undefined;
							const text = inner.start.comments_before;
							if (text && !printed.has(text)) {
								printed.add(text);
								comments = [...comments, ...text];
							}
							return undefined;
						}
						return true;
					}
				);
				walker.push(node);
				keywordWithValue.walk(walker);
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
			comments = comments
				.filter((comment) => this.commentFilter.call(node, comment))
				.filter((comment) => !printed.has(comment));
			if (comments.length === 0) return;
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
			return this.stack.pop();
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
	const { ast, output, utils } = modules;
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
			const options = utils.defaults(given, FORMAT_DEFAULTS, true);
			if (options.shorthand === undefined) options.shorthand = options.ecma > 5;
			const stream = minifiedOutputFits(options)
				? new MinifiedOutput(options, !given)
				: output.OutputStream(given);
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
			if (!minifiedOutputFits(options)) {
				driver(this, stream, forceParens);
				return;
			}
			const ours = new MinifiedOutput(options, false);
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
		const toTree = require("./terserTree")(modules);

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
	const toTree = require("./terserTree")(modules);

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
		try {
			return toTree(code, {
				module: Boolean(
					parseOptions.module !== undefined
						? parseOptions.module
						: options.module
				),
				bare_returns: parseOptions.bare_returns,
				filename: name
			});
		} catch (_err) {
			return undefined;
		}
	};
	modules.minify = (
		/** @type {EXPECTED_ANY} */ files,
		/** @type {EXPECTED_ANY} */ options
	) => {
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
		typeof utils.mergeSort !== "function" ||
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
	return answer === probeFrequency(createFrequency(utils.mergeSort));
};

/**
 * Installs webpack's character counter into terser's `base54`, the object
 * `minify` hands the mangler, so its identity — which the `mangle` phase
 * reads — is unchanged.
 * @param {TerserModules} modules terser's modules
 * @returns {void}
 */
const installFrequency = ({ scope, utils }) => {
	Object.assign(scope.base54, createFrequency(utils.mergeSort));
};

// The phases webpack has taken over. Each one replaces a method on the
// minifier's own classes and is expected to write exactly what it wrote, only
// faster; a new phase is added here and nowhere else.
/** @type {Phase[]} */
const PHASES = [
	{ name: "mangle", supports: manglingFits, install: installMangling },
	{ name: "frequency", supports: frequencyFits, install: installFrequency },
	{ name: "output", supports: outputFits, install: installOutput },
	{ name: "print", supports: printFits, install: installPrint },
	{ name: "parse", supports: parseFits, install: installParse }
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
	// Read for its effect too: it installs the code generators on every node.
	const output = await at("output.js");
	const unicode = await at("unicode.js");
	const utils = await at("utils/index.js");
	// Read for its effect: it installs the ESTree conversions `minify` reaches.
	await at("mozilla-ast.js");
	const { minify } = await at("minify.js");
	return { ast, scope, parse, output, unicode, utils, minify };
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

module.exports = { load, PHASES, FORMAT_DEFAULTS };
