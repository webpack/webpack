/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author sheo13666q @sheo13666q
*/

"use strict";

/* eslint-disable camelcase, new-cap -- terser's own API, which this speaks */

// cspell:ignore DEFMETHOD, Defun, defun, fnames, funarg, classnames, mangleable, unmangleable, NOINLINE, privatename, argnames, thedef, argname, bcatch, bfinally, MANGLEPROP, nlb, punc, Funarg

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

// terser's `TreeWalker#_visit`, each run of whitespace read as one space: the
// one version the walk phase below replaces.
const TERSER_VISIT = [
	"_visit(node, descend) { this.push(node);",
	"var ret = this.visit(node, descend ? function() { descend.call(node); } : noop);",
	"if (!ret && descend) { descend.call(node); } this.pop(); return ret; }"
].join(" ");

// A node class's walk: it visits the node with a closure over the visitor that
// walks the children, where a property it names, when there is one, is set.
const TERSER_NODE_WALK =
	/^(?:function\s*|_walk\s*)\(visitor\)\s*\{\s*return visitor\._visit\(this,\s*(?:this\.([\w$]+)\s*&&\s*)?function\s*\(\)\s*\{([\s\S]*)\}\);?\s*\}$/;

// The walk of a node without children, which allocates nothing.
const TERSER_LEAF_WALK = "function(visitor) { return visitor._visit(this); }";

/**
 * A node class's walk, with its children's walk taking the visitor as an
 * argument rather than closing over it.
 * @typedef {object} NodeWalk
 * @property {{ _walk: (this: Node, visitor: EXPECTED_ANY) => boolean }} prototype the class's prototype
 * @property {string | undefined} guard the property that has to be set for the class to have children to walk
 * @property {(this: Node, visitor: EXPECTED_ANY) => void} descend walks the node's children
 */

/**
 * Every node class's own walk, rebuilt from its source so the children's walk
 * is created once rather than per visit. Undefined where one is written unlike
 * the rest, or names anything but the visitor and terser's own exports.
 * @param {TerserModules} modules terser's modules
 * @returns {NodeWalk[] | undefined} one per class walking children
 */
const readNodeWalks = ({ ast }) => {
	const { parse } = require("./syntax-parser");
	const analyzeScope = require("./ScopeAnalyzer");

	/** @type {NodeWalk[]} */
	const walks = [];
	const classes = [ast.AST_Node];
	while (classes.length !== 0) {
		const ctor = classes.pop();
		classes.push(...ctor.SUBCLASSES);
		const { prototype } = ctor;
		if (!Object.prototype.hasOwnProperty.call(prototype, "_walk")) continue;
		const source = prototype._walk.toString();
		if (source.replace(/\s+/g, " ") === TERSER_LEAF_WALK) continue;
		const match = TERSER_NODE_WALK.exec(source);
		if (match === null) return;
		const [, guard, body] = match;
		const wrapped = `(function (visitor) {${body}})`;
		/** @type {string[]} */
		const names = [];
		try {
			const { unresolvedReferences } = analyzeScope(
				parse(wrapped, { ecmaVersion: "latest", sourceType: "script" })
			);
			for (const { identifier } of unresolvedReferences) {
				if (!Object.prototype.hasOwnProperty.call(ast, identifier.name)) {
					return;
				}
				if (!names.includes(identifier.name)) names.push(identifier.name);
			}
		} catch (_err) {
			return;
		}
		// eslint-disable-next-line no-new-func
		const descend = new Function(...names, `"use strict"; return ${wrapped};`)(
			...names.map((name) => ast[name])
		);
		walks.push({ prototype, guard, descend });
	}
	return walks;
};

/**
 * Whether the walker and every node class's walk are still the ones the phase
 * replaces.
 * @param {TerserModules} modules terser's modules
 * @returns {boolean} true when the phase can be installed
 */
const walkFits = (modules) => {
	const { TreeWalker } = modules.ast;
	return (
		typeof TreeWalker === "function" &&
		typeof modules.utils.noop === "function" &&
		TreeWalker.prototype._visit.toString().replace(/\s+/g, " ") ===
			TERSER_VISIT &&
		readNodeWalks(modules) !== undefined
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
	const { noop } = modules.utils;
	for (const { prototype, guard, descend } of /** @type {NodeWalk[]} */ (
		readNodeWalks(modules)
	)) {
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
		prototype._walk = guard === undefined ? walk : walkWhereSet;
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

// A backslash before a line break, which terser reads unlike the specification.
const LINE_CONTINUATION = /\\(?:\r\n|[\n\r\u2028\u2029])/;

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

	const A = ast;
	const { ALL_RESERVED_WORDS } = parse;
	// The comments of every gap no parenthesis borders, which nothing mutates.
	/** @type {Token[]} */
	const EMPTY = [];
	// Kept across calls, as a worker minifies one asset after another: every
	// read is at an offset this source set, so what an earlier one left is inert.
	let byStart = new Int32Array(0);
	let byEnd = new Int32Array(0);
	// Each token's offsets and kind, by index: a source holds fewer tokens
	// than characters, so these grow with the two above.
	let startBuffer = new Int32Array(0);
	let endBuffer = new Int32Array(0);
	let kindBuffer = new Int8Array(0);

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
		/** @type {boolean[]} */
		const braces = [];
		if (byStart.length <= source.length) {
			byStart = new Int32Array(source.length + 1);
			byEnd = new Int32Array(source.length + 1);
			startBuffer = new Int32Array(source.length + 1);
			endBuffer = new Int32Array(source.length + 1);
			kindBuffer = new Int8Array(source.length + 1);
		}
		const starts = startBuffer;
		const ends = endBuffer;
		const kinds = kindBuffer;
		const tokenStart = byStart;
		const tokenEnd = byEnd;
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
					// What terser reads as an HTML comment, whatever this parser made of it.
					const first = source.charCodeAt(token.start);
					if (
						(first === 60 && source.startsWith("<!--", token.start)) ||
						(first === 45 && source.startsWith("-->", token.start))
					) {
						throw DECLINE;
					}
					// terser reads a template's text from its opening backtick, or the
					// `}` closing a substitution, through the next `${` or backtick.
					if (inTemplateText) {
						ends[count - 1] = token.end;
						tokenEnd[token.end] = count;
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
					starts[count] = token.start;
					ends[count] = token.end;
					kinds[count] = kind;
					values.push(value);
					count++;
					tokenStart[token.start] = count;
					tokenEnd[token.end] = count;
				}
			});
		} catch (_err) {
			return undefined;
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

		// Too large a source is not kept past this call.
		if (source.length > 1 << 23) {
			byStart = new Int32Array(0);
			byEnd = new Int32Array(0);
			startBuffer = new Int32Array(0);
			endBuffer = new Int32Array(0);
			kindBuffer = new Int8Array(0);
		}

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
			if (!isParenthesis(index - 1) && !isParenthesis(index)) return EMPTY;
			return (gaps[index] = []);
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
		const startOf = (node) => tokenAt(byStart[node.start] - 1);
		/**
		 * @param {EstreeNode} node a node
		 * @returns {Token} the token it ends with
		 */
		const endOf = (node) => tokenAt(byEnd[node.end] - 1);
		/**
		 * @param {EstreeNode} node a node
		 * @returns {Token} the token after it
		 */
		const afterOf = (node) => tokenAt(byEnd[node.end]);

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
			converted.start = firstReadAt(byStart[node.start] - 1);
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
		 * @returns {Node[]} them, the directive prologue read as terser reads it
		 */
		const statements = (body) => {
			const out = [];
			let prologue = true;
			for (let i = 0; i < body.length; i++) {
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
						byStart[next.start] - 1 === byEnd[node.end]
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
		 * @param {Node} Type the symbol class
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
		 * @param {Node} Type the function class
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
		 * @param {Node} Type the symbol class a name in it declares
		 * @returns {Node} the pattern
		 */
		const binding = (node, Type) => {
			if (node.type === "ArrayPattern") {
				let cursor = byStart[node.start];
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
					cursor = byEnd[element.end];
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
							start: tokenAt(byStart[property.key.start] - 2),
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
		 * @param {Node} Type the symbol class a name in it declares
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
			let cursor = byStart[list.start];
			for (let i = 0; i < nodes.length; i++) {
				const node = nodes[i];
				if (node === null) {
					const comma = tokenAt(cursor++);
					out[i] = new A.AST_Hole({ start: comma, end: comma });
					continue;
				}
				out[i] = convert(node);
				cursor = byEnd[node.end] + 1;
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
							values[byEnd[node.end]] === "*" &&
							kinds[byEnd[node.end]] === OTHER))
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
				const endIndex = Math.min(byEnd[node.end] + 1, count);
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
			const after = byEnd[node.source.end];
			if (
				after >= count ||
				after >= byEnd[node.end] ||
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
			let closeIndex = byEnd[node.end] - 1;
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
			 * @param {Node} Type the symbol class
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
					importedNames = [mapAsterisk(true, local, byEnd[specifier.end] - 1)];
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
				const index = byStart[node.source.start] - 3;
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
				end: attributes ? tokenAt(byEnd[node.end] - 1) : afterOf(node.source)
			});
		};

		/**
		 * @param {EstreeNode} node an export declaration
		 * @returns {Node} the export, on the tokens terser gives it before `statement` does
		 */
		const exportDeclaration = (node) => {
			const start = tokenAt(byStart[node.start]);
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
				const lastIndex = byStart[node.source.start] - 3;
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
			const next = byEnd[declaration.end];
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
			const last = byEnd[node.end] - 1;
			return tokenAt(
				values[last] === ";" && kinds[last] === OTHER ? last - 1 : last
			);
		};

		/**
		 * terser's `as_symbol_or_string`.
		 * @param {Node} Type the symbol class
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
		 * @param {EstreeNode} node a node
		 * @returns {Node} terser's node for it
		 */
		const from = (node) => {
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
						body: statements(node.body),
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
					const startIndex = byStart[node.start] - 1;
					const firstIndex =
						params.length === 1 ? byStart[params[0].start] - 1 : -1;
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
						start: firstReadAt(byStart[node.start] - 1),
						expressions: list(node.expressions),
						end: tokenAt(Math.min(byEnd[node.end] + 1, count))
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
						label.thedef = definition;
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
									start: tokenAt(byStart[finalizer.start] - 2),
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
							LINE_CONTINUATION.test(quasi.value.raw)
						) {
							throw DECLINE;
						}
						const token = tokenAt(byStart[quasi.start - 1] - 1);
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
										start: tokenAt(byStart[element.start]),
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
						end: tokenAt(byStart[node.start]),
						expression: from(node.argument)
					});
				case "YieldExpression":
					// terser starts a `yield` on the token after the keyword.
					return new A.AST_Yield({
						start: firstReadAt(byStart[node.start]),
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
						values[byEnd[node.end] - 2] === "," &&
						kinds[byEnd[node.end] - 2] === OTHER
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
					if (LINE_CONTINUATION.test(node.raw)) throw DECLINE;
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
			return from(program);
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
	{ name: "walk", supports: walkFits, install: installWalk },
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

module.exports = { load, PHASES, FORMAT_DEFAULTS, createTerserTree };
