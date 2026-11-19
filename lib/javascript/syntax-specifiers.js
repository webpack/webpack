/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

// The specifier scans of CommonJS and ES module sources, which read a file's
// requires and imports without parsing it. Kept apart from the parser, which
// reaches them through `collectCjsRequireSpecifiers` and `collectEsmImportSpecifiers`.

const { isIdentifierChar } = require("./syntax-parser");

const KEYWORDS_BEFORE_REGEXP = new Set([
	"await",
	"case",
	"delete",
	"do",
	"else",
	"in",
	"instanceof",
	"new",
	"of",
	"return",
	"throw",
	"typeof",
	"void",
	"yield"
]);

/**
 * Whether a `/` at this point starts a regexp rather than division, decided by
 * what precedes it: after a value (name, number, `)`, `]`) it divides, after an
 * operator or a keyword it opens a regexp. `)` and `]` are always read as
 * division - telling `if (a) /re/` from `(a) / b` needs paren-context tracking
 * this single pass does not carry.
 * @param {string} source source code
 * @param {number} slash offset of the `/`
 * @returns {boolean} true when a regexp literal starts here
 */
const startsRegExp = (source, slash) => {
	let i = slash - 1;
	while (i >= 0) {
		const code = source.charCodeAt(i);
		if (code === 32 || code === 9 || code === 10 || code === 13) i--;
		else break;
	}
	if (i < 0) return true;
	const code = source.charCodeAt(i);
	if (code === 41 || code === 93) return false;
	if (!isIdentifierChar(code)) return true;
	// a keyword before `/` is an operator position (`return /re/`), a name is not
	let start = i;
	while (start >= 0 && isIdentifierChar(source.charCodeAt(start))) start--;
	return KEYWORDS_BEFORE_REGEXP.has(source.slice(start + 1, i + 1));
};

/**
 * Skips whitespace and comments, returning the next code offset.
 * @param {string} source source code
 * @param {number} i offset to start at
 * @returns {number} offset of the next significant character
 */
const skipTrivia = (source, i) => {
	while (i < source.length) {
		const code = source.charCodeAt(i);
		if (code === 32 || code === 9 || code === 10 || code === 13) {
			i++;
		} else if (code === 47 && source.charCodeAt(i + 1) === 47) {
			const end = source.indexOf("\n", i + 2);
			i = end === -1 ? source.length : end + 1;
		} else if (code === 47 && source.charCodeAt(i + 1) === 42) {
			const end = source.indexOf("*/", i + 2);
			i = end === -1 ? source.length : end + 2;
		} else {
			break;
		}
	}
	return i;
};

/** @type {Map<number, string>} */
const SINGLE_CHARACTER_ESCAPES = new Map([
	[110, "\n"],
	[114, "\r"],
	[116, "\t"],
	[98, "\b"],
	[118, "\u000B"],
	[102, "\f"]
]);

/**
 * Reads the hex digits of a `\x`/`\u` escape.
 * @param {string} source source code
 * @param {number} i offset of the first digit
 * @param {number} length how many digits to read
 * @returns {number} the code point, or `-1` when a digit is missing
 */
const readHexEscapeValue = (source, i, length) => {
	let value = 0;
	for (let j = i; j < i + length; j++) {
		const digit = Number.parseInt(source[j], 16);
		if (Number.isNaN(digit)) return -1;
		value = value * 16 + digit;
	}
	return value;
};

/**
 * Cooks one escape sequence, sloppy-mode script semantics (legacy octal included).
 * @param {string} source source code
 * @param {number} i offset just past the backslash
 * @returns {{ value: string, end: number } | undefined} the cooked text, or `undefined` when malformed
 */
const readEscape = (source, i) => {
	if (i >= source.length) return;
	const code = source.charCodeAt(i);
	const single = SINGLE_CHARACTER_ESCAPES.get(code);
	if (single !== undefined) return { value: single, end: i + 1 };
	// a line continuation cooks to nothing; `\r\n` counts as one terminator
	if (code === 13) {
		return { value: "", end: source.charCodeAt(i + 1) === 10 ? i + 2 : i + 1 };
	}
	if (code === 10 || code === 0x2028 || code === 0x2029) {
		return { value: "", end: i + 1 };
	}
	if (code === 120) {
		const value = readHexEscapeValue(source, i + 1, 2);
		if (value === -1) return;
		return { value: String.fromCodePoint(value), end: i + 3 };
	}
	if (code === 117) {
		if (source.charCodeAt(i + 1) === 123) {
			const end = source.indexOf("}", i + 2);
			if (end === -1 || end === i + 2) return;
			const value = readHexEscapeValue(source, i + 2, end - i - 2);
			if (value === -1 || value > 0x10ffff) return;
			return { value: String.fromCodePoint(value), end: end + 1 };
		}
		const value = readHexEscapeValue(source, i + 1, 4);
		if (value === -1) return;
		return { value: String.fromCodePoint(value), end: i + 5 };
	}
	if (code >= 48 && code <= 55) {
		let digits = /** @type {RegExpMatchArray} */ (
			source.slice(i, i + 3).match(/^[0-7]+/)
		)[0];
		if (Number.parseInt(digits, 8) > 255) digits = digits.slice(0, -1);
		return {
			value: String.fromCharCode(Number.parseInt(digits, 8)),
			end: i + digits.length
		};
	}
	return { value: source[i], end: i + 1 };
};

/**
 * Reads a `'`/`"` string starting at `i`, cooking its escapes the way the ast
 * this replaces did - a `Literal` node carries the cooked value, so a specifier
 * written `"\x2e/a"` is the same dependency as `"./a"`. Templates are not
 * specifiers here: the ast only matched `Literal` nodes.
 * @param {string} source source code
 * @param {number} i offset of the opening quote
 * @returns {{ value: string, end: number } | undefined} the literal
 */
const readStringLiteral = (source, i) => {
	const quote = source.charCodeAt(i);
	if (quote !== 34 && quote !== 39) return;
	for (let j = i + 1; j < source.length; j++) {
		const code = source.charCodeAt(j);
		if (code === 10 || code === 13) return;
		if (code === 92) return readEscapedStringLiteral(source, i, j);
		if (code === quote) return { value: source.slice(i + 1, j), end: j + 1 };
	}
};

/**
 * Continues `readStringLiteral` from its first escape, so the unescaped case
 * stays a single slice.
 * @param {string} source source code
 * @param {number} i offset of the opening quote
 * @param {number} firstEscape offset of the first backslash
 * @returns {{ value: string, end: number } | undefined} the literal
 */
const readEscapedStringLiteral = (source, i, firstEscape) => {
	const quote = source.charCodeAt(i);
	let value = "";
	let segment = i + 1;
	for (let j = firstEscape; j < source.length; j++) {
		const code = source.charCodeAt(j);
		if (code === 10 || code === 13) return;
		if (code === quote) {
			return { value: value + source.slice(segment, j), end: j + 1 };
		}
		if (code !== 92) continue;
		const escape = readEscape(source, j + 1);
		if (escape === undefined) return;
		value += source.slice(segment, j) + escape.value;
		segment = escape.end;
		j = escape.end - 1;
	}
};

/**
 * Scans a template body from `i` (just past a backtick or a `}` resuming one).
 * @param {string} source source code
 * @param {number} i offset inside the template
 * @returns {{ end: number, substitution: boolean }} where the body stops
 */
const skipTemplateBody = (source, i) => {
	for (; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code === 92) {
			i++;
		} else if (code === 96) {
			return { end: i, substitution: false };
		} else if (code === 36 && source.charCodeAt(i + 1) === 123) {
			return { end: i + 1, substitution: true };
		}
	}
	return { end: source.length, substitution: false };
};

/**
 * Collects the specifiers of static `require("...")` calls. A scan rather than a
 * parse: it only has to skip what could hide or fake a call - comments, strings,
 * templates and regexps - so it costs one pass and builds no ast. Template
 * substitutions are scanned as the code they are, which is why the brace depth
 * of each open `${` is tracked.
 * @param {string} source source code
 * @returns {Set<string>} required specifiers
 */
const collectCjsRequireSpecifiers = (source) => {
	/** @type {Set<string>} */
	const specifiers = new Set();
	/** @type {number[]} */
	const templateBraceDepths = [];
	let braceDepth = 0;
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code === 96) {
			const body = skipTemplateBody(source, i + 1);
			i = body.end;
			if (body.substitution) {
				templateBraceDepths.push(braceDepth);
				braceDepth++;
			}
			continue;
		}
		if (code === 123) {
			braceDepth++;
			continue;
		}
		if (code === 125) {
			braceDepth--;
			if (
				templateBraceDepths.length > 0 &&
				templateBraceDepths[templateBraceDepths.length - 1] === braceDepth
			) {
				templateBraceDepths.pop();
				const body = skipTemplateBody(source, i + 1);
				i = body.end;
				if (body.substitution) {
					templateBraceDepths.push(braceDepth);
					braceDepth++;
				}
			}
			continue;
		}
		if (code === 34 || code === 39) {
			for (i++; i < source.length; i++) {
				const inner = source.charCodeAt(i);
				if (inner === 92) i++;
				else if (inner === code) break;
			}
			continue;
		}
		if (code === 47) {
			const next = source.charCodeAt(i + 1);
			if (next === 47) {
				const end = source.indexOf("\n", i + 2);
				i = end === -1 ? source.length : end;
				continue;
			}
			if (next === 42) {
				const end = source.indexOf("*/", i + 2);
				i = end === -1 ? source.length : end + 1;
				continue;
			}
			if (!startsRegExp(source, i)) continue;
			let inClass = false;
			for (i++; i < source.length; i++) {
				const inner = source.charCodeAt(i);
				if (inner === 92) i++;
				else if (inner === 91) inClass = true;
				else if (inner === 93) inClass = false;
				else if (inner === 10) break;
				else if (inner === 47 && !inClass) break;
			}
			continue;
		}
		// `r` of `require`, as a whole word that is not a member access
		if (code !== 114 || !source.startsWith("require", i)) continue;
		if (isIdentifierChar(source.charCodeAt(i + 7))) continue;
		if (i > 0) {
			const before = source.charCodeAt(i - 1);
			if (isIdentifierChar(before)) continue;
			// a dot is a member access, except as the last of a `...` spread
			if (before === 46 && !source.startsWith("...", i - 3)) continue;
		}
		let j = skipTrivia(source, i + 7);
		if (source.charCodeAt(j) !== 40) continue;
		j = skipTrivia(source, j + 1);
		// a cast wraps the specifier in its own parens: `require(/** ... */ ("x"))`
		let parens = 0;
		while (source.charCodeAt(j) === 40) {
			parens++;
			j = skipTrivia(source, j + 1);
		}
		const literal = readStringLiteral(source, j);
		if (literal === undefined) {
			i += 6;
			continue;
		}
		j = skipTrivia(source, literal.end);
		while (parens > 0 && source.charCodeAt(j) === 41) {
			parens--;
			j = skipTrivia(source, j + 1);
		}
		if (parens !== 0 || source.charCodeAt(j) !== 41) {
			i += 6;
			continue;
		}
		specifiers.add(literal.value);
		i = j;
	}
	return specifiers;
};

// What an ES module scan stops at outside template substitutions: a whole
// string, a whole comment, a backtick or `/`. Read with `test()`, which builds
// no match array; the regexp engine skips everything else natively.
const ESM_CODE_TOKEN =
	/"[^"\\]*(?:\\[^][^"\\]*)*"?|'[^'\\]*(?:\\[^][^'\\]*)*'?|\/\/[^\n\r\u2028\u2029]*[\n\r\u2028\u2029]?|\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|[`/]/g;
// The same inside a `${ ... }` substitution, plus braces to find its end.
const ESM_SUBSTITUTION_TOKEN =
	/"[^"\\]*(?:\\[^][^"\\]*)*"?|'[^'\\]*(?:\\[^][^'\\]*)*'?|\/\/[^\n\r\u2028\u2029]*[\n\r\u2028\u2029]?|\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|[`/{}]/g;
// The common clause shapes up to their specifier's quote, read natively so the
// clause readers below run only for comments, string names or non-ASCII names.
const ESM_IMPORT_CLAUSE =
	/(?:(?:defer|source)\s+)?(?:[\w$]+\s*(?:,\s*)?)?(?:\*\s*as\s+[\w$]+\s*|\{[^}"'/]*\}\s*)?from\s*(?=["'])|(?=["'])/y;
const ESM_EXPORT_CLAUSE =
	/(?:\*\s*(?:as\s+[\w$]+\s*)?|\{[^}"'/]*\}\s*)from\s*(?=["'])/y;
// Whitespace and closed comments between two tokens of a clause.
const ESM_TRIVIA =
	/(?:\s+|\/\/[^\n\r\u2028\u2029]*|\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/)*/y;
// Where a token of each opens, found only when a keyword may sit inside it.
const ESM_CODE_TOKEN_START = /[`/"']/g;
const ESM_SUBSTITUTION_TOKEN_START = /[`/"'{}]/g;
// A template body after a backtick or a substitution's `}`, up to `` ` `` or `${`.
const ESM_TEMPLATE_REST = /[^`\\$]*(?:(?:\\[^]|\$(?!\{))[^`\\$]*)*(?:`|\$\{)?/y;
// A regexp literal's body and flags, after its opening `/`.
const ESM_REGEXP_REST =
	/[^\\/[\n\r]*(?:(?:\\.|\[[^\]\\\n\r]*(?:\\.[^\]\\\n\r]*)*\]?)[^\\/[\n\r]*)*\/?[\w$]*/y;

const KEYWORDS_BEFORE_STATEMENT_HEAD = new Set(["if", "while", "for", "with"]);
// `break` and `continue` end their statement, so a `/` after them, or after the
// label they name, opens a regexp, as after the keywords `require` scans know.
const KEYWORDS_BEFORE_LABEL = new Set(["break", "continue"]);
const ESM_KEYWORDS_BEFORE_REGEXP = new Set([
	...KEYWORDS_BEFORE_REGEXP,
	...KEYWORDS_BEFORE_LABEL
]);

// One ES module scan's state, module-level so its rare paths stay plain
// functions rather than closures the scan loop inlines and recompiles.
let esmScanSource = "";
// The last comment's end and the significant character before it, so looking
// back from a token can step over the comment.
let esmCommentEnd = -1;
let esmCommentBefore = -1;
// The last regexp literal's end: a `/` right after it divides.
let esmRegExpEnd = -1;
// Brace depth inside substitutions, and the depth each open `${` started at.
let esmBraceDepth = 0;
/** @type {number[]} */
const esmSubstitutionDepths = [];

/**
 * Whether a char code is JavaScript whitespace or a line terminator. No guard
 * skips the rare comparisons: a non-space character runs them all, so none lacks
 * type feedback once optimized.
 * @param {number} code char code
 * @returns {boolean} true for whitespace or a line terminator
 */
const isEsmScanSpace = (code) =>
	code === 32 ||
	(code - 9) >>> 0 <= 4 ||
	code === 0xa0 ||
	code === 0x1680 ||
	(code - 0x2000) >>> 0 <= 10 ||
	code === 0x2028 ||
	code === 0x2029 ||
	code === 0x202f ||
	code === 0x205f ||
	code === 0x3000 ||
	code === 0xfeff;

/**
 * The significant character before a token, stepping over whitespace and the
 * comments the scan passed.
 * @param {number} offset offset of the token
 * @returns {number} offset of that character, `-1` at the start
 */
const esmCodeBefore = (offset) => {
	const source = esmScanSource;
	let i = offset - 1;
	while (i >= 0 && isEsmScanSpace(source.charCodeAt(i))) i--;
	return i === esmCommentEnd - 1 ? esmCommentBefore : i;
};

/**
 * Whether the word ending at `end` is one of `words`, and not a property name.
 * @param {number} end offset of the word's last character
 * @param {Set<string>} words the keywords looked for
 * @returns {boolean} true for one of the keywords
 */
const isEsmKeywordBefore = (end, words) => {
	const source = esmScanSource;
	let start = end;
	while (start > 0 && isIdentifierChar(source.charCodeAt(start - 1))) start--;
	if (end - start > 9 || !words.has(source.slice(start, end + 1))) return false;
	const dot = esmCodeBefore(start);
	return (
		dot < 0 ||
		source.charCodeAt(dot) !== 46 ||
		(dot > 0 && source.charCodeAt(dot - 1) === 46)
	);
};

/**
 * Whether the `)` at `close` ends an `if (...)`-like statement head, after which
 * `/` opens a regexp. Matched backwards, as it is rare.
 * @param {number} close offset of the `)`
 * @returns {boolean} true after `if`, `while`, `for` or `with`
 */
const closesEsmStatementHead = (close) => {
	const source = esmScanSource;
	let level = 0;
	for (let i = close; i >= 0; i--) {
		const code = source.charCodeAt(i);
		if (code === 41) {
			level++;
		} else if (code === 40 && --level === 0) {
			const word = esmCodeBefore(i);
			return (
				word >= 0 &&
				isIdentifierChar(source.charCodeAt(word)) &&
				isEsmKeywordBefore(word, KEYWORDS_BEFORE_STATEMENT_HEAD)
			);
		}
	}
	return false;
};

/**
 * Whether the `/` at `slash`, opening no comment, starts a regexp rather than
 * division, decided by the significant character before it.
 * @param {number} slash offset of the `/`
 * @returns {boolean} true when a regexp literal starts here
 */
const startsEsmRegExp = (slash) => {
	const source = esmScanSource;
	const before = esmCodeBefore(slash);
	if (before < 0) return true;
	const code = source.charCodeAt(before);
	if (code === 41) return closesEsmStatementHead(before);
	// `}` mostly ends a block; `]`, a string and a template end a value
	if (code === 125) return true;
	if (code === 93 || code === 34 || code === 39 || code === 96) return false;
	if (code === 47) return before !== esmRegExpEnd - 1;
	// a postfix `++`/`--` ends a value, any other `+`/`-` is an operator
	if (code === 43 || code === 45) {
		return before === 0 || source.charCodeAt(before - 1) !== code;
	}
	if (!isIdentifierChar(code)) return true;
	if (isEsmKeywordBefore(before, ESM_KEYWORDS_BEFORE_REGEXP)) return true;
	// `break label` and `continue label` end a statement too
	let start = before;
	while (start > 0 && isIdentifierChar(source.charCodeAt(start - 1))) start--;
	const word = esmCodeBefore(start);
	return (
		word >= 0 &&
		isIdentifierChar(source.charCodeAt(word)) &&
		isEsmKeywordBefore(word, KEYWORDS_BEFORE_LABEL)
	);
};

/**
 * Handles a token ending in `/` or a line terminator: records a comment, or
 * steps over an unclosed comment, a regexp literal or a division.
 * @param {number} from where the token regexp started looking
 * @param {number} end offset just past the token
 * @returns {number} where the scan resumes
 */
const skipEsmSlash = (from, end) => {
	const source = esmScanSource;
	// no `/` is code before a token, so the first one opens it
	const start = source.indexOf("/", from);
	if (start < end - 1) {
		esmCommentBefore = esmCodeBefore(start);
		// a line comment's match ends with its line terminator
		esmCommentEnd = source.charCodeAt(end - 1) === 47 ? end : end - 1;
		return end;
	}
	// a closed comment is a token of its own, so this one runs to the end
	if (end < source.length && source.charCodeAt(end) === 42) {
		esmCommentBefore = esmCodeBefore(end - 1);
		const close = source.indexOf("*/", end + 1);
		return (esmCommentEnd = close === -1 ? source.length : close + 2);
	}
	if (!startsEsmRegExp(end - 1)) return end;
	ESM_REGEXP_REST.lastIndex = end;
	ESM_REGEXP_REST.test(source);
	return (esmRegExpEnd = ESM_REGEXP_REST.lastIndex);
};

/**
 * Handles a backtick or, inside a substitution, a brace: reads a template body
 * up to its end or its next `${`, or counts the brace.
 * @param {number} code the character, `` ` ``, `{` or `}`
 * @param {number} end offset just past it
 * @returns {RegExp} the token regexp the scan goes on with, its `lastIndex` set
 */
const skipEsmTemplate = (code, end) => {
	if (code === 123) {
		esmBraceDepth++;
		ESM_SUBSTITUTION_TOKEN.lastIndex = end;
		return ESM_SUBSTITUTION_TOKEN;
	}
	if (code === 125) {
		if (
			esmBraceDepth !== esmSubstitutionDepths[esmSubstitutionDepths.length - 1]
		) {
			esmBraceDepth--;
			ESM_SUBSTITUTION_TOKEN.lastIndex = end;
			return ESM_SUBSTITUTION_TOKEN;
		}
		esmSubstitutionDepths.pop();
	}
	const source = esmScanSource;
	ESM_TEMPLATE_REST.lastIndex = end;
	ESM_TEMPLATE_REST.test(source);
	const stop = ESM_TEMPLATE_REST.lastIndex;
	if (
		stop - 2 >= end &&
		source.charCodeAt(stop - 1) === 123 &&
		source.charCodeAt(stop - 2) === 36
	) {
		esmSubstitutionDepths.push(esmBraceDepth);
	}
	const next =
		esmSubstitutionDepths.length > 0 ? ESM_SUBSTITUTION_TOKEN : ESM_CODE_TOKEN;
	next.lastIndex = stop;
	return next;
};

/**
 * Cooks a template literal without substitutions, as a `TemplateLiteral`'s
 * cooked value: line terminators normalized, no legacy octal escapes.
 * @param {string} source source code
 * @param {number} i offset of the opening backtick
 * @returns {{ value: string, end: number } | undefined} the template, or `undefined` when it holds a substitution or a malformed escape
 */
const readPlainTemplateLiteral = (source, i) => {
	let value = "";
	let segment = i + 1;
	for (let j = i + 1; j < source.length; j++) {
		const code = source.charCodeAt(j);
		if (code === 96) {
			return { value: value + source.slice(segment, j), end: j + 1 };
		}
		if (code === 36 && source.charCodeAt(j + 1) === 123) return;
		if (code === 13) {
			value += `${source.slice(segment, j)}\n`;
			if (source.charCodeAt(j + 1) === 10) j++;
			segment = j + 1;
		} else if (code === 92) {
			const next = source.charCodeAt(j + 1);
			// a template allows `\0` alone, never another digit
			if (next >= 48 && next <= 57) {
				const after = source.charCodeAt(j + 2);
				if (next !== 48 || (after >= 48 && after <= 57)) return;
			}
			const escape = readEscape(source, j + 1);
			if (escape === undefined) return;
			value += source.slice(segment, j) + escape.value;
			segment = escape.end;
			j = escape.end - 1;
		}
	}
};

/**
 * Skips whitespace, every kind JavaScript has, and comments, natively.
 * @param {string} source source code
 * @param {number} i offset to start at
 * @returns {number} offset of the next significant character
 */
const skipEsmTrivia = (source, i) => {
	ESM_TRIVIA.lastIndex = i;
	// past the end the match fails and resets `lastIndex` to 0
	return ESM_TRIVIA.test(source) ? ESM_TRIVIA.lastIndex : i;
};

/**
 * Whether `import(...)` is a method named `import`: its `)` is followed by `{`.
 * @param {string} source source code
 * @param {number} paren offset of the `(`
 * @returns {boolean} true for a method definition
 */
const isImportMethod = (source, paren) => {
	let level = 0;
	for (let i = paren; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code === 34 || code === 39) {
			const literal = readStringLiteral(source, i);
			if (literal !== undefined) i = literal.end - 1;
		} else if (code === 40) {
			level++;
		} else if (code === 41 && --level === 0) {
			return source.charCodeAt(skipEsmTrivia(source, i + 1)) === 123;
		}
	}
	return false;
};

/**
 * Records a specifier: one any static import reaches stays static.
 * @param {Map<string, boolean>} specifiers specifier to whether only `import()` reaches it
 * @param {string} specifier the specifier
 * @param {boolean} dynamic whether `import()` names it
 */
const addEsmSpecifier = (specifiers, specifier, dynamic) => {
	if (!dynamic || !specifiers.has(specifier)) {
		specifiers.set(specifier, dynamic);
	}
};

/**
 * Reads an import or export clause up to its `from "x"`, or a bare `import "x"`;
 * names written as strings (`{ a as "b" }`) are never specifiers.
 * @param {string} source source code
 * @param {number} i offset of the clause
 * @param {Map<string, boolean>} specifiers where the specifier goes
 * @param {boolean} bare whether a string at `i` is the specifier
 * @returns {number} where the scan resumes
 */
const readEsmClause = (source, i, specifiers, bare) => {
	for (;;) {
		i = skipEsmTrivia(source, i);
		if (i >= source.length) return i;
		const code = source.charCodeAt(i);
		if (code === 34 || code === 39) {
			const literal = readStringLiteral(source, i);
			if (literal === undefined) return i;
			// past the start, a string is a name: `export * as "a" from "b"`
			if (!bare) {
				i = literal.end;
				continue;
			}
			addEsmSpecifier(specifiers, literal.value, false);
			return literal.end;
		}
		if (code === 123) {
			for (i++; i < source.length; i++) {
				const inner = source.charCodeAt(i);
				if (inner === 125) break;
				if (inner === 34 || inner === 39) {
					const literal = readStringLiteral(source, i);
					if (literal !== undefined) i = literal.end - 1;
				} else if (inner === 47) {
					// past a comment; a lone `/` is stepped over like any character
					const next = skipEsmTrivia(source, i);
					if (next > i) i = next - 1;
				}
			}
			i++;
		} else if (code === 42 || code === 44) {
			i++;
		} else if (isIdentifierChar(code)) {
			let end = i + 1;
			while (end < source.length && isIdentifierChar(source.charCodeAt(end))) {
				end++;
			}
			if (end - i === 4 && source.startsWith("from", i)) {
				const literal = readStringLiteral(source, skipEsmTrivia(source, end));
				if (literal !== undefined) {
					addEsmSpecifier(specifiers, literal.value, false);
					return literal.end;
				}
			}
			i = end;
		} else {
			return i;
		}
		bare = false;
	}
};

/**
 * Reads what follows `import`: `import.meta`, a dynamic import or a declaration.
 * @param {string} source source code
 * @param {number} end offset just past `import`
 * @param {Map<string, boolean>} specifiers where the specifier goes
 * @returns {number} where the scan resumes
 */
const readEsmImport = (source, end, specifiers) => {
	const i = skipEsmTrivia(source, end);
	const code = source.charCodeAt(i);
	if (code === 46) {
		// `import.defer("a")` and `import.source("a")` load a module too
		const phase = skipEsmTrivia(source, i + 1);
		const length = source.startsWith("defer", phase)
			? 5
			: source.startsWith("source", phase)
				? 6
				: 0;
		if (length !== 0 && !isIdentifierChar(source.charCodeAt(phase + length))) {
			const paren = skipEsmTrivia(source, phase + length);
			if (source.charCodeAt(paren) === 40) {
				return readEsmDynamicImport(source, paren, specifiers);
			}
		}
		return i + 1;
	}
	if (code !== 40) {
		ESM_IMPORT_CLAUSE.lastIndex = i;
		if (ESM_IMPORT_CLAUSE.test(source)) {
			const literal = readStringLiteral(source, ESM_IMPORT_CLAUSE.lastIndex);
			if (literal !== undefined) {
				addEsmSpecifier(specifiers, literal.value, false);
				return literal.end;
			}
		}
		return readEsmClause(source, i, specifiers, true);
	}
	if (isImportMethod(source, i)) return i + 1;
	return readEsmDynamicImport(source, i, specifiers);
};

/**
 * Reads a dynamic import's argument, recording it where it is a literal.
 * @param {string} source source code
 * @param {number} paren offset of its `(`
 * @param {Map<string, boolean>} specifiers where the specifier goes
 * @returns {number} where the scan resumes: inside the parens, as the argument is code
 */
const readEsmDynamicImport = (source, paren, specifiers) => {
	let start = skipEsmTrivia(source, paren + 1);
	// a parenthesized specifier is the same specifier: `import(("a"))`
	let parens = 0;
	while (source.charCodeAt(start) === 40) {
		parens++;
		start = skipEsmTrivia(source, start + 1);
	}
	const literal =
		source.charCodeAt(start) === 96
			? readPlainTemplateLiteral(source, start)
			: readStringLiteral(source, start);
	if (literal !== undefined) {
		let after = skipEsmTrivia(source, literal.end);
		while (parens > 0 && source.charCodeAt(after) === 41) {
			parens--;
			after = skipEsmTrivia(source, after + 1);
		}
		// `import("a" + b)` names no specifier; options may follow a `,`
		const code = source.charCodeAt(after);
		if (parens === 0 && (code === 41 || code === 44)) {
			addEsmSpecifier(specifiers, literal.value, true);
		}
	}
	return paren + 1;
};

/**
 * Reads what follows `export`: only `export * from` and `export { ... } from`
 * name a specifier.
 * @param {string} source source code
 * @param {number} end offset just past `export`
 * @param {Map<string, boolean>} specifiers where the specifier goes
 * @returns {number} where the scan resumes
 */
const readEsmExport = (source, end, specifiers) => {
	const i = skipEsmTrivia(source, end);
	const code = source.charCodeAt(i);
	if (code !== 42 && code !== 123) return i;
	ESM_EXPORT_CLAUSE.lastIndex = i;
	if (ESM_EXPORT_CLAUSE.test(source)) {
		const literal = readStringLiteral(source, ESM_EXPORT_CLAUSE.lastIndex);
		if (literal !== undefined) {
			addEsmSpecifier(specifiers, literal.value, false);
			return literal.end;
		}
	}
	if (code === 123) {
		let close = i + 1;
		for (; close < source.length; close++) {
			const inner = source.charCodeAt(close);
			if (inner === 125) break;
			if (inner === 34 || inner === 39) {
				const literal = readStringLiteral(source, close);
				if (literal !== undefined) close = literal.end - 1;
			} else if (inner === 47) {
				// a comment may hold a `}`: `{ /** @type {T} */ a }`
				const next = skipEsmTrivia(source, close);
				if (next > close) close = next - 1;
			}
		}
		const from = skipEsmTrivia(source, close + 1);
		if (
			!source.startsWith("from", from) ||
			isIdentifierChar(source.charCodeAt(from + 4))
		) {
			return close + 1;
		}
	}
	return readEsmClause(source, i, specifiers, false);
};

/**
 * Where the token a scan matched from `from` to `end` opens.
 * @param {RegExp} token the token regexp that matched it
 * @param {number} from where the match started looking
 * @param {number} end where the token ends
 * @returns {number} offset of its first character
 */
const esmTokenStart = (token, from, end) => {
	const start =
		token === ESM_CODE_TOKEN
			? ESM_CODE_TOKEN_START
			: ESM_SUBSTITUTION_TOKEN_START;
	start.lastIndex = from;
	return start.test(esmScanSource) ? start.lastIndex - 1 : end;
};

/**
 * Handles `import` or `export` ending at `end`, unless it is part of a longer
 * name or a property name.
 * @param {number} end offset just past the keyword
 * @param {Map<string, boolean>} specifiers where the specifier goes
 * @returns {number} where the scan resumes
 */
const readEsmKeyword = (end, specifiers) => {
	const source = esmScanSource;
	const start = end - 6;
	if (start > 0 && isIdentifierChar(source.charCodeAt(start - 1))) return end;
	if (end < source.length && isIdentifierChar(source.charCodeAt(end))) {
		return end;
	}
	const dot = esmCodeBefore(start);
	if (
		dot >= 0 &&
		source.charCodeAt(dot) === 46 &&
		(dot === 0 || source.charCodeAt(dot - 1) !== 46)
	) {
		return end;
	}
	return source.charCodeAt(start) === 105
		? readEsmImport(source, end, specifiers)
		: readEsmExport(source, end, specifiers);
};

/**
 * Collects the specifiers of an ES module's imports, re-exports and literal
 * `import()` calls. A scan rather than a parse, as `collectCjsRequireSpecifiers` is: it steps over comments, strings, templates and regexps and reads only what follows `import` and `export`.
 * @param {string} source source code
 * @returns {Map<string, boolean>} each specifier, mapped to whether only `import()` names it
 */
const collectEsmImportSpecifiers = (source) => {
	/** @type {Map<string, boolean>} */
	const specifiers = new Map();
	esmScanSource = source;
	esmCommentEnd = esmCommentBefore = esmRegExpEnd = -1;
	esmBraceDepth = 0;
	esmSubstitutionDepths.length = 0;
	let token = ESM_CODE_TOKEN;
	token.lastIndex = 0;
	if (source.startsWith("#!")) {
		const end = source.indexOf("\n");
		token.lastIndex = end === -1 ? source.length : end;
	}
	// Keywords are found natively too; one before the next token is in code,
	// one a token stepped over is searched for again past it.
	let nextImport = source.indexOf("import", token.lastIndex);
	let nextExport = source.indexOf("export", token.lastIndex);
	for (;;) {
		const from = token.lastIndex;
		const found = token.test(source);
		const end = found ? token.lastIndex : source.length;
		const keyword =
			nextExport === -1 || (nextImport !== -1 && nextImport < nextExport)
				? nextImport
				: nextExport;
		if (
			keyword !== -1 &&
			keyword < end &&
			keyword < esmTokenStart(token, from, end)
		) {
			token.lastIndex = readEsmKeyword(keyword + 6, specifiers);
		} else if (!found) {
			break;
		} else {
			// a string or a comment is stepped over by the match itself; a line
			// comment's match ends with its line terminator, a block comment's
			// with `*/`, after the `/` it opens with
			const code = source.charCodeAt(end - 1);
			if (
				code === 47 ||
				code === 10 ||
				code === 13 ||
				code === 0x2028 ||
				code === 0x2029
			) {
				token.lastIndex = skipEsmSlash(from, end);
			} else if (code === 96 || code === 123 || code === 125) {
				token = skipEsmTemplate(code, end);
			}
		}
		const resume = token.lastIndex;
		if (nextImport !== -1 && nextImport < resume) {
			nextImport = source.indexOf("import", resume);
		}
		if (nextExport !== -1 && nextExport < resume) {
			nextExport = source.indexOf("export", resume);
		}
	}
	esmScanSource = "";
	return specifiers;
};

module.exports.collectCjsRequireSpecifiers = collectCjsRequireSpecifiers;
module.exports.collectEsmImportSpecifiers = collectEsmImportSpecifiers;
