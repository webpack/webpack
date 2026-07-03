/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { Parser: AcornParser, tokTypes } = require("acorn");

/** @typedef {import("acorn").Options} AcornOptions */
/** @typedef {import("acorn").Position} AcornPosition */
/** @typedef {import("acorn").Node} AcornNode */
/** @typedef {import("acorn").Identifier} AcornIdentifier */
/** @typedef {import("acorn").ImportAttribute} AcornImportAttribute */
/** @typedef {import("acorn").ImportDefaultSpecifier} AcornImportDefaultSpecifier */
/** @typedef {import("acorn").ImportExpression} AcornImportExpression */
/** @typedef {import("acorn").Expression} AcornExpression */
/** @typedef {import("acorn").ImportSpecifier | import("acorn").ImportDefaultSpecifier | import("acorn").ImportNamespaceSpecifier} AcornAnyImportSpecifier */
/** @typedef {import("acorn").TokenType} TokenType */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {[number, number]} Range */
/** @typedef {"defer" | "source"} ImportPhase */

// Mirrors acorn's `lineBreak` regexp, which its types don't export.
const LINE_BREAK_G = /\r\n?|\n|\u2028|\u2029/g;

// Symbol-keyed so they stay out of for-in, Object.keys and JSON.stringify
// over AST nodes.
const kSourcePositions = Symbol("source positions");
const kLoc = Symbol("loc");
const kRange = Symbol("range");

// Marks import attributes parsed from the legacy `assert {...}` syntax.
const LEGACY_ASSERT_ATTRIBUTES = Symbol("assert");

// acorn's binding types and scope flags, stable across acorn 8
const BIND_LEXICAL = 2;
const SCOPE_TOP = 1;
const SCOPE_SIMPLE_CATCH = 32;
// SCOPE_TOP | SCOPE_FUNCTION | SCOPE_CLASS_STATIC_BLOCK
const SCOPE_VAR = 0b100000011;

/**
 * Offset → line/column mapping for one parsed file. The line-start table is
 * built only when some node's `loc` is first read.
 */
class SourcePositions {
	/**
	 * @param {string} source source code
	 */
	constructor(source) {
		this.source = source;
		/** @type {number[] | undefined} */
		this.lineStarts = undefined;
	}

	/**
	 * @returns {number[]} offset of each line's first character
	 */
	_buildLineStarts() {
		const lineStarts = [0];
		LINE_BREAK_G.lastIndex = 0;
		let match;
		while ((match = LINE_BREAK_G.exec(this.source)) !== null) {
			lineStarts.push(match.index + match[0].length);
		}
		return (this.lineStarts = lineStarts);
	}

	/**
	 * @param {number} offset source offset
	 * @returns {AcornPosition} position (1-based line, 0-based column)
	 */
	position(offset) {
		const lineStarts = this.lineStarts || this._buildLineStarts();
		// binary search for the line containing offset
		let lo = 0;
		let hi = lineStarts.length - 1;
		while (lo < hi) {
			const mid = (lo + hi + 1) >>> 1;
			if (lineStarts[mid] <= offset) lo = mid;
			else hi = mid - 1;
		}
		return { line: lo + 1, column: offset - lineStarts[lo] };
	}
}

// ASCII identifier-continuation chars ($ 0-9 A-Z _ a-z); css/html-style
// Uint8Array table so the tokenizer fast path is one load per char
const IDENT_CHAR = new Uint8Array(128);
IDENT_CHAR[36] = 1;
IDENT_CHAR[95] = 1;
for (let i = 48; i <= 57; i++) IDENT_CHAR[i] = 1;
for (let i = 65; i <= 90; i++) IDENT_CHAR[i] = 1;
for (let i = 97; i <= 122; i++) IDENT_CHAR[i] = 1;

/**
 * Drop-in replacement for acorn's `Node` that materializes `loc` and `range`
 * on first access instead of allocating them during parsing. Most nodes never
 * get either read, which saves three objects and an array per node.
 */
class LazyLocNode {
	/**
	 * Only constructed when the parser runs in lazy mode, so the positions
	 * mapping is always present.
	 * @param {{ [kSourcePositions]?: SourcePositions }} parser parser instance
	 * @param {number} pos start offset
	 */
	constructor(parser, pos) {
		this.type = "";
		this.start = pos;
		this.end = 0;
		this[kSourcePositions] =
			/** @type {SourcePositions} */
			(parser[kSourcePositions]);
	}

	/**
	 * Memoized in a symbol slot — a plain store is far cheaper than making the
	 * property own via defineProperty, and the slot stays invisible to for-in,
	 * Object.keys and JSON.stringify.
	 * @returns {SourceLocation} source location
	 */
	get loc() {
		const cached = this[kLoc];
		if (cached !== undefined) return cached;
		const positions = this[kSourcePositions];
		const loc = {
			start: positions.position(this.start),
			end: positions.position(this.end)
		};
		// acorn reads `.loc.start` of still-unfinished nodes (import.meta /
		// new.target), so only cache when `end` has been set by finishNode
		if (this.end > 0) this[kLoc] = loc;
		return loc;
	}

	/**
	 * @param {SourceLocation} value source location
	 */
	set loc(value) {
		this[kLoc] = value;
	}

	/**
	 * @returns {Range} source range
	 */
	get range() {
		const cached = this[kRange];
		if (cached !== undefined) return cached;
		/** @type {Range} */
		const range = [this.start, this.end];
		if (this.end > 0) this[kRange] = range;
		return range;
	}

	/**
	 * @param {Range} value source range
	 */
	set range(value) {
		this[kRange] = value;
	}
}

/**
 * Replaces acorn's array-backed `Scope`: membership checks in `declareName`
 * are `indexOf` there, which goes quadratic on files with thousands of
 * bindings per scope (bundled or minified inputs).
 */
class Scope {
	/**
	 * @param {number} flags scope flags
	 */
	constructor(flags) {
		this.flags = flags;
		/** @type {Set<string>} */
		this.var = new Set();
		/** @type {Set<string>} */
		this.lexical = new Set();
		/** @type {Set<string>} */
		this.functions = new Set();
		// first lexically-declared name; stands in for acorn's `lexical[0]`
		// (the catch parameter of a simple catch scope)
		/** @type {string | undefined} */
		this.firstLexical = undefined;
	}
}

/**
 * Acorn's methods and state used by `WebpackParser` but missing from its
 * public types, plus `WebpackParser`'s own fields, so overridden methods can
 * declare `this` precisely.
 * @typedef {import("acorn").Parser & {
 * type: TokenType,
 * value: unknown,
 * start: number,
 * startLoc?: AcornPosition,
 * containsEsc: boolean,
 * options: AcornOptions,
 * next: () => void,
 * eat: (type: TokenType) => boolean,
 * expect: (type: TokenType) => void,
 * afterTrailingComma: (type: TokenType, notNext?: boolean) => boolean,
 * unexpected: (pos?: number) => never,
 * raise: (pos: number, message: string) => never,
 * raiseRecoverable: (pos: number, message: string) => void,
 * isContextual: (name: string) => boolean,
 * parseIdent: (liberal?: boolean) => AcornIdentifier,
 * checkLValSimple: (expr: AcornNode, bindingType?: number) => void,
 * startNode: () => AcornNode,
 * startNodeAt: (pos: number, loc?: AcornPosition) => AcornNode,
 * finishNode: (node: AcornNode, type: string) => AcornNode,
 * readWord1: () => string,
 * skipSpace: () => void,
 * readString: (quote: number) => void,
 * readNumber: (startsWithDot: boolean) => void,
 * finishToken: (type: TokenType, value?: unknown) => void,
 * pos: number,
 * input: string,
 * scopeStack: Scope[],
 * currentScope: () => Scope,
 * treatFunctionsAsVar: boolean,
 * treatFunctionsAsVarInScope: (scope: Scope) => boolean,
 * inModule: boolean,
 * undefinedExports: Record<string, AcornNode>,
 * parseImport: (node: AcornNode) => AcornNode,
 * parseImportSpecifiers: () => AcornAnyImportSpecifier[],
 * parseImportAttribute: () => AcornImportAttribute,
 * parseExprImport: (forNew: boolean) => AcornExpression,
 * parseImportMeta: (node: AcornNode) => AcornExpression,
 * parseDynamicImport: (node: AcornNode) => AcornExpression,
 * [kSourcePositions]?: SourcePositions,
 * _importPhase: ImportPhase | null,
 * _importPhasesEnabled: boolean,
 * }} ParserInternals
 */

// internal methods are absent from acorn's types, so super calls do not
// type-check; call through a typed view of the base prototype instead
const base = /** @type {ParserInternals} */ (
	/** @type {unknown} */ (AcornParser.prototype)
);

/**
 * webpack's parser — acorn extended in one place, and the staging ground for
 * incrementally taking over more of the parsing. Long-term this should grow
 * into a `SourceProcessor` grammar like lib/css/syntax.js and
 * lib/html/syntax.js: one enter/exit pass instead of the pre-walk loops. On top of plain acorn it
 * provides lazy `loc`/`range` (via the internal `lazySourcePositions`
 * option), import attributes (`with { ... }` and legacy `assert { ... }`),
 * import phases (via the `importPhases` option) and Set-based scope
 * bookkeeping. Unlike the former `acorn-import-phases` package, acorn's
 * `!forNew` guard is kept, so `new import.defer(...)` is a SyntaxError just
 * like `new import(...)`.
 */
class WebpackParser extends AcornParser {
	/**
	 * @param {AcornOptions & { lazySourcePositions?: SourcePositions, importPhases?: boolean }} options options
	 * @param {string} input source code
	 * @param {number=} startPos start position
	 */
	constructor(options, input, startPos) {
		const sourcePositions = options.lazySourcePositions;
		if (sourcePositions) {
			options = { ...options, locations: false, ranges: false };
		}
		super(options, input, startPos);
		this[kSourcePositions] = sourcePositions;
		/** @type {ImportPhase | null} */
		this._importPhase = null;
		this._importPhasesEnabled = options.importPhases === true;
	}

	// ----- tokenizer fast paths -----

	/**
	 * ASCII fast path for acorn's `readWord1`, which pays a surrogate-aware
	 * method call and a range-check helper per character. Escapes, non-ASCII
	 * and astral input restart the base implementation from the word start.
	 * @this {ParserInternals}
	 * @returns {string} the word
	 */
	readWord1() {
		const input = this.input;
		const start = this.pos;
		const len = input.length;
		let pos = start;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch < 128) {
				if (IDENT_CHAR[ch] === 0) {
					// backslash escape: restart cold so escape rules see the word
					if (ch === 92) return base.readWord1.call(this);
					break;
				}
				pos++;
			} else {
				return base.readWord1.call(this);
			}
		}
		this.containsEsc = false;
		this.pos = pos;
		return input.slice(start, pos);
	}

	/**
	 * String fast path: one SIMD `indexOf` for the closing quote plus a
	 * three-compare verification loop. Escapes, newlines in the span, old
	 * ecmaVersions and location tracking restart acorn's implementation,
	 * which also produces its exact errors.
	 * @this {ParserInternals}
	 * @param {number} quote quote char code
	 * @returns {void}
	 */
	readString(quote) {
		if (
			this.options.locations ||
			/** @type {number} */ (this.options.ecmaVersion) < 10
		) {
			return base.readString.call(this, quote);
		}
		const input = this.input;
		const pos = this.pos + 1;
		const end = input.indexOf(quote === 34 ? '"' : "'", pos);
		if (end === -1) this.raise(this.start, "Unterminated string constant");
		for (let i = pos; i < end; i++) {
			const ch = input.charCodeAt(i);
			// backslash, LF, CR
			if (ch === 92 || ch === 10 || ch === 13) {
				return base.readString.call(this, quote);
			}
		}
		this.pos = end + 1;
		this.finishToken(tokTypes.string, input.slice(pos, end));
	}

	/**
	 * Number fast path: plain integer literals (no leading zero, up to 15
	 * digits so the float is exact) are accumulated numerically — no slice,
	 * no parseFloat, no separator handling. Everything else (dots, exponents,
	 * bigints, separators, octal forms) restarts acorn's implementation.
	 * @this {ParserInternals}
	 * @param {boolean} startsWithDot whether the number started with a dot
	 * @returns {void}
	 */
	readNumber(startsWithDot) {
		const input = this.input;
		const start = this.pos;
		const first = input.charCodeAt(start);
		// leading zeros (octal/hex/legacy) take the cold path
		if (startsWithDot || first < 49 || first > 57) {
			return base.readNumber.call(this, startsWithDot);
		}
		const len = input.length;
		let value = first - 48;
		let pos = start + 1;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			if (ch >= 48 && ch <= 57) {
				value = value * 10 + (ch - 48);
				pos++;
			} else if (
				// dot, exponent, bigint suffix, separator or identifier chars
				// need acorn's full handling (and its exact errors)
				ch === 46 ||
				ch === 95 ||
				ch === 110 ||
				ch > 127 ||
				IDENT_CHAR[ch] === 1
			) {
				return base.readNumber.call(this, startsWithDot);
			} else {
				break;
			}
		}
		// 15 digits always fit exactly into a double
		if (pos - start > 15) {
			return base.readNumber.call(this, startsWithDot);
		}
		this.pos = pos;
		this.finishToken(tokTypes.num, value);
	}

	/**
	 * Fast path for the common run of plain ASCII whitespace; comments,
	 * unicode whitespace and location tracking delegate to acorn.
	 * @this {ParserInternals & { pos: number }}
	 * @returns {void}
	 */
	skipSpace() {
		if (this.options.locations) return base.skipSpace.call(this);
		const input = this.input;
		const len = input.length;
		let pos = this.pos;
		while (pos < len) {
			const ch = input.charCodeAt(pos);
			// 9-13 and 32 cover tab, LF, VT, FF, CR and space
			if (ch === 32 || (ch > 8 && ch < 14)) {
				pos++;
			} else if (ch === 47 || ch > 127) {
				// comments or unicode whitespace: let acorn handle the rest
				this.pos = pos;
				return base.skipSpace.call(this);
			} else {
				break;
			}
		}
		this.pos = pos;
	}

	// ----- lazy loc/range -----

	/**
	 * @returns {AcornNode} new node
	 * @this {ParserInternals}
	 */
	startNode() {
		if (!this[kSourcePositions]) return base.startNode.call(this);
		return new LazyLocNode(this, this.start);
	}

	/**
	 * @param {number} pos start offset
	 * @param {AcornPosition=} loc start position when acorn tracks locations
	 * @returns {AcornNode} new node
	 * @this {ParserInternals}
	 */
	startNodeAt(pos, loc) {
		if (!this[kSourcePositions]) return base.startNodeAt.call(this, pos, loc);
		return new LazyLocNode(this, pos);
	}

	/**
	 * Mirror of acorn's `copyNode`, which bypasses `startNodeAt` via
	 * `new Node(...)` and would otherwise produce non-lazy nodes.
	 * @param {AcornNode} node node to copy
	 * @returns {AcornNode} copied node
	 * @this {ParserInternals}
	 */
	copyNode(node) {
		const newNode = this.startNodeAt(node.start, this.startLoc);
		const from = /** @type {Record<string, unknown>} */ (
			/** @type {unknown} */ (node)
		);
		const to = /** @type {Record<string, unknown>} */ (
			/** @type {unknown} */ (newNode)
		);
		for (const prop in from) to[prop] = from[prop];
		return newNode;
	}

	// ----- regexp validation (V8-backed, replaces acorn's JS revalidation) -----

	/**
	 * Acorn constructs the literal's `RegExp` value right after this hook, so
	 * V8 validates every pattern anyway; acorn's own JS copy of
	 * that validation costs several percent of parse time. Raise from V8's
	 * verdict instead — invalid patterns still fail the module build, only
	 * exotic engine-specific message texts may differ.
	 * @param {{ start: number, source: string, flags: string }} state acorn regexp validation state
	 * @this {ParserInternals}
	 */
	validateRegExpPattern(state) {
		try {
			// eslint-disable-next-line no-new
			new RegExp(state.source, state.flags);
		} catch (err) {
			this.raiseRecoverable(state.start, /** @type {Error} */ (err).message);
		}
	}

	// ----- scope tracking (Set-based, replaces acorn's array + indexOf) -----

	/**
	 * @param {number} flags scope flags
	 * @this {ParserInternals}
	 */
	enterScope(flags) {
		this.scopeStack.push(new Scope(flags));
	}

	/**
	 * Set-backed replacement for acorn's `declareName` on Set-backed scopes.
	 * @param {string} name declared name
	 * @param {number} bindingType acorn BIND_* binding type
	 * @param {number} pos source offset for redeclaration errors
	 * @this {ParserInternals}
	 */
	declareName(name, bindingType, pos) {
		let redeclared = false;
		if (bindingType === BIND_LEXICAL) {
			const scope = this.currentScope();
			redeclared =
				scope.lexical.has(name) ||
				scope.functions.has(name) ||
				scope.var.has(name);
			if (scope.lexical.size === 0) scope.firstLexical = name;
			scope.lexical.add(name);
			if (this.inModule && scope.flags & SCOPE_TOP) {
				delete this.undefinedExports[name];
			}
		} else if (bindingType === /* BIND_SIMPLE_CATCH */ 4) {
			const scope = this.currentScope();
			if (scope.lexical.size === 0) scope.firstLexical = name;
			scope.lexical.add(name);
		} else if (bindingType === /* BIND_FUNCTION */ 3) {
			const scope = this.currentScope();
			redeclared = this.treatFunctionsAsVar
				? scope.lexical.has(name)
				: scope.lexical.has(name) || scope.var.has(name);
			scope.functions.add(name);
		} else {
			for (let i = this.scopeStack.length - 1; i >= 0; --i) {
				const scope = this.scopeStack[i];
				if (
					(scope.lexical.has(name) &&
						!(
							scope.flags & SCOPE_SIMPLE_CATCH && scope.firstLexical === name
						)) ||
					(!this.treatFunctionsAsVarInScope(scope) && scope.functions.has(name))
				) {
					redeclared = true;
					break;
				}
				scope.var.add(name);
				if (this.inModule && scope.flags & SCOPE_TOP) {
					delete this.undefinedExports[name];
				}
				if (scope.flags & SCOPE_VAR) break;
			}
		}
		if (redeclared) {
			this.raiseRecoverable(
				pos,
				`Identifier '${name}' has already been declared`
			);
		}
	}

	/**
	 * Set-backed replacement for acorn's `checkLocalExport` on Set-backed scopes.
	 * @param {AcornIdentifier} id exported identifier
	 * @this {ParserInternals}
	 */
	checkLocalExport(id) {
		const topScope = this.scopeStack[0];
		if (!topScope.lexical.has(id.name) && !topScope.var.has(id.name)) {
			this.undefinedExports[id.name] = id;
		}
	}

	// ----- import attributes (`with { ... }` / legacy `assert { ... }`) -----

	/**
	 * @returns {AcornImportAttribute[]} import attributes
	 * @this {ParserInternals}
	 */
	parseWithClause() {
		/** @type {AcornImportAttribute[] & { [LEGACY_ASSERT_ATTRIBUTES]?: boolean }} */
		const nodes = [];

		const isAssertLegacy = this.value === "assert";

		if (isAssertLegacy) {
			if (!this.eat(tokTypes.name)) {
				return nodes;
			}
		} else if (!this.eat(tokTypes._with)) {
			return nodes;
		}

		this.expect(tokTypes.braceL);

		/** @type {Record<string, boolean>} */
		const attributeKeys = {};
		let first = true;

		while (!this.eat(tokTypes.braceR)) {
			if (!first) {
				this.expect(tokTypes.comma);
				if (this.afterTrailingComma(tokTypes.braceR)) {
					break;
				}
			} else {
				first = false;
			}

			const attr = this.parseImportAttribute();
			const keyName =
				/** @type {string} */
				(attr.key.type === "Identifier" ? attr.key.name : attr.key.value);

			if (Object.prototype.hasOwnProperty.call(attributeKeys, keyName)) {
				this.raiseRecoverable(
					attr.key.start,
					`Duplicate attribute key '${keyName}'`
				);
			}

			attributeKeys[keyName] = true;
			nodes.push(attr);
		}

		if (isAssertLegacy) {
			nodes[LEGACY_ASSERT_ATTRIBUTES] = true;
		}

		return nodes;
	}

	// ----- import phases (`import defer/source`, `import.defer/source()`) -----

	/**
	 * @param {AcornNode & { phase?: ImportPhase }} node import declaration node
	 * @returns {AcornNode} finished node
	 * @this {ParserInternals}
	 */
	parseImport(node) {
		this._importPhase = null;
		const result = base.parseImport.call(this, node);
		if (this._importPhase) node.phase = this._importPhase;
		return result;
	}

	/**
	 * @returns {AcornAnyImportSpecifier[]} import specifiers
	 * @this {ParserInternals}
	 */
	parseImportSpecifiers() {
		if (!this._importPhasesEnabled) {
			return base.parseImportSpecifiers.call(this);
		}

		/** @type {ImportPhase | null} */
		const phase = this.isContextual("defer")
			? "defer"
			: this.isContextual("source")
				? "source"
				: null;
		if (!phase) return base.parseImportSpecifiers.call(this);

		const phaseId = this.parseIdent();
		if (this.isContextual("from") || this.type === tokTypes.comma) {
			// `defer`/`source` was the default import name, not a phase modifier
			const defaultSpecifier =
				/** @type {AcornImportDefaultSpecifier} */
				(
					this.startNodeAt(
						phaseId.start,
						phaseId.loc ? phaseId.loc.start : undefined
					)
				);
			defaultSpecifier.local = phaseId;
			this.checkLValSimple(phaseId, BIND_LEXICAL);

			/** @type {AcornAnyImportSpecifier[]} */
			const nodes = [
				/** @type {AcornImportDefaultSpecifier} */
				(this.finishNode(defaultSpecifier, "ImportDefaultSpecifier"))
			];
			if (this.eat(tokTypes.comma)) {
				if (this.type !== tokTypes.star && this.type !== tokTypes.braceL) {
					this.unexpected();
				}
				nodes.push(...base.parseImportSpecifiers.call(this));
			}
			return nodes;
		}

		this._importPhase = phase;

		if (phase === "defer") {
			if (this.type !== tokTypes.star) {
				this.raiseRecoverable(
					phaseId.start,
					"'import defer' can only be used with namespace imports ('import defer * as identifierName from ...')."
				);
			}
		} else if (this.type !== tokTypes.name) {
			this.raiseRecoverable(
				phaseId.start,
				"'import source' can only be used with direct identifier specifier imports."
			);
		}

		const specifiers = base.parseImportSpecifiers.call(this);

		if (
			phase === "source" &&
			specifiers.some((s) => s.type !== "ImportDefaultSpecifier")
		) {
			this.raiseRecoverable(
				phaseId.start,
				"'import source' can only be used with direct identifier specifier imports ('import source identifierName from ...')."
			);
		}

		return specifiers;
	}

	/**
	 * @param {boolean} forNew whether parsed as the operand of `new`
	 * @returns {AcornExpression} expression node
	 * @this {ParserInternals}
	 */
	parseExprImport(forNew) {
		const node = base.parseExprImport.call(this, forNew);

		if (
			this._importPhasesEnabled &&
			node.type === "MetaProperty" &&
			(node.property.name === "defer" || node.property.name === "source")
		) {
			if (this.type === tokTypes.parenL) {
				if (forNew) {
					// same guard acorn applies to `new import(...)`
					this.raise(node.start, "import call cannot be the target of `new`");
				}
				const dynImport =
					/** @type {AcornImportExpression & { phase?: ImportPhase }} */
					(
						this.parseDynamicImport(
							this.startNodeAt(
								node.start,
								node.loc ? node.loc.start : undefined
							)
						)
					);
				dynImport.phase = node.property.name;
				return dynImport;
			}
			this.raiseRecoverable(
				node.start,
				`'import.${node.property.name}' can only be used in a dynamic import.`
			);
		}

		return node;
	}

	/**
	 * @param {AcornNode & { property?: AcornIdentifier }} node started node with `meta` set to `import`
	 * @returns {AcornExpression} MetaProperty node
	 * @this {ParserInternals}
	 */
	parseImportMeta(node) {
		if (!this._importPhasesEnabled) {
			return base.parseImportMeta.call(this, node);
		}

		this.next();

		const containsEsc = this.containsEsc;
		const property = this.parseIdent(true);
		node.property = property;
		const { name } = property;

		if (name !== "meta" && name !== "defer" && name !== "source") {
			this.raiseRecoverable(
				property.start,
				"The only valid meta property for import is 'import.meta'"
			);
		}
		if (containsEsc) {
			this.raiseRecoverable(
				node.start,
				`'import.${name}' must not contain escaped characters`
			);
		}
		if (
			name === "meta" &&
			this.options.sourceType !== "module" &&
			!this.options.allowImportExportEverywhere
		) {
			this.raiseRecoverable(
				node.start,
				"Cannot use 'import.meta' outside a module"
			);
		}

		return /** @type {AcornExpression} */ (
			this.finishNode(node, "MetaProperty")
		);
	}
}

module.exports.LEGACY_ASSERT_ATTRIBUTES = LEGACY_ASSERT_ATTRIBUTES;
module.exports.SourcePositions = SourcePositions;
module.exports.WebpackParser = WebpackParser;
