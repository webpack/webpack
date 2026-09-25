/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { CSS_TYPE } = require("../module/ModuleSourceTypeConstants");

const GenericSourceProcessor = require("../util/SourceProcessor");

const {
	buildDataURI,
	decodeDataURIPayload,
	languageOfMediaType,
	parseDataURI
} = require("../util/dataURL");

/**
 * Renders source this stylesheet embeds — a `data:` URL's payload today.
 * Returning it unchanged, or anything but text, declines it, and the URL is
 * emitted as written.
 * @typedef {(source: string, info: { type: string, hostType: string }) => string | undefined} EmbeddedSourceRenderer
 */

/**
 * One embedded source recorded for a caller that can only answer
 * asynchronously, and the text to print once it has.
 * @typedef {import("../util/dataURL").DeferredEmbeddedSource} DeferredEmbeddedSource
 */
const {
	ABSOLUTE_UNIT_SCALE,
	ALPHA_VALUE_PROPERTIES,
	ANGLE_UNITS,
	AUTO_SECOND_VALUE_PROPERTIES,
	BOX_SHORTHANDS,
	CALC_REJECTING_PROPERTIES,
	CANONICAL_NAMES,
	CLAMPED_VALUE_RANGES,
	COLOR_ARGUMENT_FUNCTIONS,
	COLOR_KEYWORDS,
	COLOR_NAME_TO_SHORTEST,
	COLOR_ONLY_PROPERTIES,
	CSS_WIDE_KEYWORDS,
	CUBIC_BEZIER_KEYWORDS,
	DEFAULT_GRADIENT_DIRECTIONS,
	DISPLAY_SHORT_FORMS,
	DROPPABLE_WHEN_EMPTY_AT_RULES,
	EASING_KEYWORDS,
	FAMILY_LIST_PROPERTIES,
	FILTER_FUNCTION_OMITTED,
	FONT_SIZE_KEYWORDS,
	FONT_STRETCH_PERCENTAGES,
	FONT_WEIGHT_NUMBERS,
	GENERIC_FONT_FAMILIES,
	GRADIENT_LAST_POSITIONS,
	INITIAL_VALUE_KEYWORDS,
	INTEGER_PROPERTIES,
	KEYWORD_ONLY_PROPERTIES,
	LAYER_INITIALS,
	LENGTH_ONLY_FUNCTIONS,
	LINEAR_GRADIENTS,
	MATH_FUNCTION_ARITY,
	MATH_FUNCTION_FOLD,
	MATH_FUNCTION_KEYWORDS,
	MATH_FUNCTION_SUM_ARGUMENTS,
	MERGEABLE_AT_RULES,
	NEGATIVE_ACCEPTING_PROPERTIES,
	NTH_NAMED_EQUIVALENTS,
	NTH_PSEUDO_FUNCTIONS,
	NUMBER_ONLY_OUTSIDE_CALC_PROPERTIES,
	OMITTABLE_INITIAL_KEYWORDS,
	POSITION_PROPERTIES,
	POSITION_X_KEYWORDS,
	POSITION_Y_KEYWORDS,
	PREFIXED_AT_RULES,
	PREFIXED_PROPERTIES,
	PREFIXED_SELECTORS,
	RATIO_PROPERTIES,
	REPEAT_STYLE_KEYWORDS,
	REPEAT_STYLE_PROPERTIES,
	SELECTOR_FUNCTIONS,
	SHADOW_PROPERTIES,
	SHORTHAND_INITIAL_KEYWORDS,
	SLASH_BOX_SHORTHANDS,
	STEPPED_FUNCTIONS,
	STEP_POSITION_MINIMUM_COUNTS,
	SUBSTITUTION_FUNCTIONS,
	SYSTEM_UI_STACK,
	TRANSITION_BEHAVIORS,
	UNIT_CONVERSION_TARGETS,
	UNIT_GROUP_BASE,
	X_AXIS_TRANSFORMS,
	ZERO_ANGLE_FUNCTIONS,
	ZERO_UNIT_KEEPING_PROPERTIES,
	foldDivide
} = require("./data");
const {
	A,
	CC_0,
	CC_APOSTROPHE,
	CC_COMMA,
	CC_FULL_STOP,
	CC_GREATER_THAN_SIGN,
	CC_HYPHEN_MINUS,
	CC_LEFT_PARENTHESIS,
	CC_LEFT_SQUARE,
	CC_LOWER_D,
	CC_LOW_LINE,
	CC_NUMBER_SIGN,
	CC_PLUS_SIGN,
	CC_QUOTATION_MARK,
	CC_REVERSE_SOLIDUS,
	CC_RIGHT_PARENTHESIS,
	CC_RIGHT_SQUARE,
	CC_SPACE,
	CC_TILDE,
	CC_UPPER_A,
	CC_UPPER_Z,
	DARK_PROPERTY,
	KEYFRAMES_AT_RULE_RE,
	LIGHT_PROPERTY,
	LIST_KIND_KEYFRAME,
	LIST_KIND_NESTED,
	LIST_KIND_SELECTOR,
	LIST_NO,
	LIST_UNKNOWN,
	T_AT_RULE,
	T_BAD_STRING,
	T_COMMA,
	T_COMMENT,
	T_DECLARATION,
	T_DELIM,
	T_DIMENSION,
	T_FUNCTION,
	T_HASH,
	T_IDENT,
	T_NUMBER,
	T_PERCENTAGE,
	T_QUALIFIED_RULE,
	T_RAW,
	T_SIMPLE_BLOCK,
	T_STRING,
	T_URL,
	T_WHITESPACE,
	VENDOR_PREFIX,
	_IMPORTANT,
	_LONE_NUMBER_RE,
	_NO_RULE_SPANS,
	_NUMERIC_RE,
	_S,
	_SEP,
	_TRIM_COMBINATORS,
	_TRIM_CONDITIONS,
	_TRIM_MATH,
	_TRIM_NOTHING,
	_TRIM_SEPARATORS,
	_UNREADABLE_COLOR_CALL_RE,
	_ZERO_LENGTH_RE,
	_alphaByteText,
	_anyUnordered,
	_appendChildTexts,
	_atKeyword,
	_blockSpans,
	_canonicalSelectorList,
	_closeAtEof,
	_collapseBox,
	_composeBlockBody,
	_customMedia,
	_customPropertyValue,
	_customSelectors,
	_dropFamilyInitials,
	_dropImpliedUniversalSelector,
	_dropZeroLengthUnit,
	_evaluateCalcSum,
	_foldPseudoNames,
	_hasSubstitution,
	_hasSubstitutionInSpan,
	_holdBySignature,
	_isClosedString,
	_isDigit,
	_isHexDigit,
	_isIdentCodePoint,
	_isIdentLike,
	_isLetter,
	_isUnterminatedUrl,
	_join,
	_lowercaseConditionParts,
	_minifyColorFunction,
	_minifyPolarColorFunction,
	_neededPrefixes,
	_normalizeNumber,
	_opaqueEntry,
	_openerKey,
	_pendingNested,
	_prefixRemovable,
	_prefixScope,
	_roundSignificant,
	_ruleEntryOf,
	_rulePrelude,
	_setHoistedRuns,
	_setRuleEntry,
	_shortestColor,
	_shortestFlexValue,
	_shorthandSlotsReadable,
	_splitSelectorList,
	_splitTopLevelArguments,
	_splitTopLevelSpaces,
	_stream,
	_takeUnusedRule,
	_terminate,
	_tokenizeCalc,
	_unreadableColorFunction,
	_valueClasses,
	_valueComponents,
	asciiLowerCaseName,
	consumeExtraNewline,
	equalsLowerCase,
	isWhitespace,
	toLowerCaseIfNeeded
} = require("./syntax-parser");
/** @typedef {import("./syntax-parser").Node} Node */
/** @typedef {import("./syntax-parser").ComponentValue} ComponentValue */
/** @typedef {import("./syntax-parser").Rule} Rule */
/** @typedef {import("./syntax-parser").BlockSpans} BlockSpans */
/** @typedef {import("./syntax-parser").PrintContext} PrintContext */
/** @typedef {import("./syntax-parser").PrefixScope} PrefixScope */
/** @typedef {import("./syntax-parser").RuleEntry} RuleEntry */
/** @typedef {import("./syntax-parser").CssPath} CssPath */

const { deferredWrite } = GenericSourceProcessor;
const CC_AMPERSAND = "&".charCodeAt(0);
const CC_LOWER_C = "c".charCodeAt(0);
// Stands in for a block node that carries no rules of its own, so a parent
// still takes exactly one entry off for each of its non-declaration children.
/** @type {BlockSpans} */
const _NO_BLOCK_ENTRY = Object.freeze({
	bodyAt: -1,
	prelude: "",
	keyPrelude: "",
	qualified: false,
	spans: _NO_RULE_SPANS
});
// The same for a qualified rule, which is still one rule of its own however
// little it can say about what it nests.
/** @type {BlockSpans} */
const _NO_BLOCK_ENTRY_QUALIFIED = Object.freeze({
	bodyAt: -1,
	prelude: "",
	keyPrelude: "",
	qualified: true,
	spans: _NO_RULE_SPANS
});

// === Safe (meaning-preserving) value transforms, applied by `printer`
// when minifying. Each is value-identical — the same computed style — so they
// never change what the stylesheet means.

/**
 * The byte offset where `s`'s leading number ends (before its unit / `%`).
 * @param {string} s a number / dimension / percentage token's text
 * @returns {number} the numeric part's length
 */
const _numberEnd = (s) => {
	const n = s.length;
	let i = 0;
	const c = s.charCodeAt(0);
	if (c === CC_PLUS_SIGN || c === CC_HYPHEN_MINUS) i++;
	while (i < n && _isDigit(s.charCodeAt(i))) i++;
	if (i < n && s.charCodeAt(i) === CC_FULL_STOP) {
		i++;
		while (i < n && _isDigit(s.charCodeAt(i))) i++;
	}
	// exponent (`e` / `E`)
	const e = s.charCodeAt(i);
	if (e === 101 || e === 69) {
		let j = i + 1;
		const sign = s.charCodeAt(j);
		if (sign === CC_PLUS_SIGN || sign === CC_HYPHEN_MINUS) j++;
		let k = j;
		while (k < n && _isDigit(s.charCodeAt(k))) k++;
		if (k > j) i = k;
	}
	return i;
};

/**
 * Rewrite a dimension into the shortest unit it is exactly equal in. Only the
 * units CSS Values 4 fixes against each other, and only when the conversion
 * round-trips exactly in doubles — which is what keeps `cm` / `mm` / `q`, none
 * of them binary-exact in `px`, mostly where they were.
 * @param {string} num the normalized numeric text
 * @param {string} unit the token's unit, as written
 * @param {string | null} written the token as written, where it is `num + unit` already
 * @returns {string} the shortest equal dimension
 */
const _convertUnit = (num, unit, written) => {
	// The table this parse converts through. Without `convertLengthUnits` the
	// length units are absent, so a `px`, the commonest dimension a stylesheet
	// writes, costs a missing lookup rather than a parse thrown away.
	const from = _S._unitScale.get(toLowerCaseIfNeeded(unit));
	if (from === undefined) return written !== null ? written : num + unit;
	const value = Number(num);
	if (!Number.isFinite(value)) return num + unit;
	// A zero length drops its unit outright, so rewriting it says nothing — but a
	// zero time keeps one, and `s` is the shorter of the two it can carry.
	if (value === 0 && from[0] !== "time") return num + unit;
	const base = value * from[1];
	let best = num + unit;
	for (const [candidate, to] of _S._unitScale) {
		if (to[0] !== from[0] || to === from) continue;
		if (!UNIT_CONVERSION_TARGETS.has(candidate)) continue;
		const converted = base / to[1];
		if (converted * to[1] !== base) continue;
		const text = String(converted);
		if (text.includes("e") || text.includes("E")) continue;
		const dimension = _normalizeNumber(text) + candidate;
		if (dimension.length < best.length) best = dimension;
	}
	return best;
};

/**
 * Whether the declaration being printed has an `<integer>` anywhere in its
 * grammar, so a number in it may be one.
 * @returns {boolean} true inside such a declaration
 */
// WHY: the unescaped name, like the declaration printer's own lookups — these
// decide what a value may be rewritten to, so reading `\7a -index` as written
// misses `z-index` and normalizes `1.0` to `1`, which turns a declaration the
// engine drops into one it applies.
const _inIntegerProperty = () =>
	_S._valueDeclaration !== null &&
	INTEGER_PROPERTIES.has(
		toLowerCaseIfNeeded(A.unescapedName(_S._valueDeclaration))
	);

/**
 * Whether the declaration being printed is one an engine takes no `calc()` in,
 * so a folded term keeps the `calc()` it was written with.
 * @returns {boolean} true inside such a declaration
 */
const _inCalcRejectingProperty = () =>
	_S._valueDeclaration !== null &&
	CALC_REJECTING_PROPERTIES.has(
		toLowerCaseIfNeeded(A.unescapedName(_S._valueDeclaration))
	);

/**
 * Whether the declaration being printed reads a bare number as a length of its
 * own, where the engine refuses that number inside a `calc()` — so a term that
 * would be written bare keeps the `calc()` it was written with.
 * @returns {boolean} true inside such a declaration
 */
const _inNumberOnlyOutsideCalcProperty = () =>
	_S._valueDeclaration !== null &&
	NUMBER_ONLY_OUTSIDE_CALC_PROPERTIES.has(
		toLowerCaseIfNeeded(A.unescapedName(_S._valueDeclaration))
	);

// A folded term, as a number and its unit.
const _TERM_VALUE_RE = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;

/**
 * Whether writing a value bare would lose the clamp the spec puts on a `calc()`
 * in this property — the literal is thrown out where the `calc()` computes the
 * bound. A unit the range is not stated in loses it too: Chrome takes
 * `oblique 100grad` off and `oblique 2rad` at face value, while clamping either
 * inside a `calc()`.
 * @param {string} property the lower-cased property name
 * @param {string} number the value
 * @param {string} unit its unit, "" when it carries none
 * @returns {boolean} true when the `calc()` has to stay
 */
const _losesClamp = (property, number, unit) => {
	const clamped = CLAMPED_VALUE_RANGES.get(property);
	if (clamped === undefined) return false;
	if (!equalsLowerCase(unit, clamped[0])) return true;
	const value = Number(number);
	return value < clamped[1] || value > clamped[2];
};

/**
 * The same, for a term the math fold is about to write in place of its
 * `calc()`.
 * @param {string} term the folded term
 * @returns {boolean} true when writing it bare would change the declaration
 */
const _foldLosesClamp = (term) => {
	if (_S._valueDeclaration === null) return false;
	const property = toLowerCaseIfNeeded(A.unescapedName(_S._valueDeclaration));
	if (!CLAMPED_VALUE_RANGES.has(property)) return false;
	const match = _TERM_VALUE_RE.exec(term);
	return match === null || _losesClamp(property, match[1], match[2]);
};

// A folded term that is a plain count, which is the only shape a step count
// takes — anything else is not the argument this guard judges.
const _INTEGER_TERM_RE = /^\d+$/;

/**
 * Whether writing a folded term bare would take `steps()` under the count its
 * `<step-position>` needs. CSS Easing 2 puts that at two under `jump-none` and
 * one under every other position, and a count below it rejects the function
 * where the `calc()` around the same value is clamped instead.
 * @param {string} term the folded term
 * @param {CssPath} path the accessor positioned on the math function
 * @returns {boolean} true when the `calc()` has to stay
 */
const _foldBelowStepCount = (term, path) => {
	// WHY: Folding `steps(calc(1), jump-none)` to `steps(1,jump-none)` printed a
	// function the source did not name. Measured over three engines: WebKit reads
	// the source and drops the printed form, while Blink rejects both — which is
	// why one engine alone could not see it.
	const parent = path.parent;
	if (
		parent === null ||
		path.type(parent) !== T_FUNCTION ||
		!_INTEGER_TERM_RE.test(term) ||
		asciiLowerCaseName(path.name(parent)) !== "steps"
	) {
		return false;
	}
	// An omitted position is `end`, which takes one. A position this cannot read
	// — an unknown spelling, or a substitution where the keyword goes — reads as
	// the largest, so the fold declines rather than guess what it resolves to.
	let minimum = 1;
	let afterComma = false;
	const count = path.childCount(parent);
	for (let at = 0; at < count; at++) {
		const child = path.childAt(parent, at);
		const type = path.type(child);
		if (type === T_COMMA) {
			afterComma = true;
			continue;
		}
		// Before the comma stands the count itself, and either side may carry
		// whitespace or a comment between the arguments.
		if (!afterComma || type === T_WHITESPACE || type === T_COMMENT) continue;
		const named =
			type === T_IDENT
				? STEP_POSITION_MINIMUM_COUNTS.get(
						asciiLowerCaseName(path.value(child))
					)
				: undefined;
		minimum = named === undefined ? 2 : named;
		break;
	}
	return Number(term) < minimum;
};

/**
 * Put back the fraction that keeps a number a `<number>` token, in the spelling
 * the rest of the printer uses — one fractional digit, and no leading zero.
 * @param {string} num a normalized number with no fraction left
 * @returns {string} the same value, still spelled as a `<number>`
 */
const _keepFraction = (num) => {
	const out = `${num}.0`;
	if (out.charCodeAt(0) === CC_0) return out.slice(1);
	return out.charCodeAt(0) === CC_HYPHEN_MINUS && out.charCodeAt(1) === CC_0
		? `-${out.slice(2)}`
		: out;
};

/**
 * Normalize a number / dimension / percentage token: normalize the numeric part,
 * then round it and reach for a shorter equal unit. Neither is done inside a
 * `@supports` prelude, where the declaration is being tested rather than applied
 * — an engine may read `px` and not `pc`. Angles keep every digit: `rotate()`
 * runs its argument through trig, which amplifies a truncated one.
 * @param {string} text the token's source text
 * @returns {string} the normalized token
 */
const _normalizeNumericToken = (text) => {
	const end = _numberEnd(text);
	// A unit identifier matches ASCII case-insensitively, so `1PX` is `1px` — and
	// the three units spelled with a capital keep the spelling everything writes.
	const written = text.slice(end);
	let unit = written;
	// One fold of the unit for both jobs below — how it is printed, and whether
	// it is an angle. `toLowerCase` hands back the string it was given where
	// nothing folds, so a unit already lowercase is the same object.
	const lowered = unit.toLowerCase();
	// A substituted value is handed back as the tokens it was written as, so the
	// spelling there is the author's; `lowered` still answers the angle question.
	if (lowered !== unit && !_S._inSubstitutedValue && _S._transforms.foldCase) {
		// Only a unit that carried a capital can have a canonical spelling to look
		// up, so the table is read for the shouted units alone.
		const folded = asciiLowerCaseName(unit);
		const canonical = CANONICAL_NAMES.get(folded);
		unit = canonical === undefined ? folded : canonical;
	}
	if (!_S._transforms.shortenNumbers) {
		return unit === written ? text : text.slice(0, end) + unit;
	}
	// The token as written is the answer 9 times in 10, so it is handed back
	// itself wherever nothing below changed a part of it.
	const numText = end === text.length ? text : text.slice(0, end);
	const num = _normalizeNumber(numText);
	const same = num === numText && unit === written;
	// An all-zero fraction still makes this a `<number>`, not an `<integer>`
	// (`grid-row:1.0` computes `auto`). Property read last, it is the costlier one.
	const dot = text.indexOf(".");
	if (
		unit === "" &&
		dot !== -1 &&
		dot < end &&
		!num.includes(".") &&
		_inIntegerProperty()
	) {
		return _keepFraction(num);
	}
	// WHY: `round()`, `mod()` and `rem()` are step functions of their arguments,
	// so a rewrite holding everywhere else does not hold inside one. `4.5cm` and
	// `45mm` are the same length, yet headless Chromium reads
	// `round(down,4.5cm,1.5cm)` as `3cm` and `round(down,45mm,15mm)` as `4.5cm`.
	if (
		_S._inSupportsPrelude ||
		_S._inCustomProperty ||
		_S._steppedFunctionDepth !== 0
	) {
		return same ? text : num + unit;
	}
	if (ANGLE_UNITS.has(lowered)) return same ? text : num + unit;
	const rounded = _roundSignificant(num);
	// A bare number has no unit to convert.
	if (unit === "") return rounded;
	return _convertUnit(rounded, unit, same && rounded === num ? text : null);
};

/**
 * The units an expression was written with, which a gated length collapse may
 * still print back into.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @returns {Set<string>} the lowercased units
 */
const _writtenUnits = (tokens) => {
	/** @type {Set<string>} */
	const units = new Set();
	for (const token of tokens) {
		if (token.unit !== "") units.add(toLowerCaseIfNeeded(token.unit));
	}
	return units;
};

/**
 * Round a folded result the way an authored number is rounded — the fold prints
 * a double back in full, and `6 / 10 - 0.375` is `.22499999999999998`. The
 * exclusions are the token printer's own: a `@supports` prelude and a custom
 * property keep what was written, a stepped function is a step of its argument,
 * and an angle keeps every digit because `rotate()` runs it through trig.
 * @param {string} text the printed numeric text
 * @param {string} unit the unit it carries, empty or `%` for none
 * @returns {string} the rounded text, or `text`
 */
const _roundCalcResult = (text, unit) => {
	if (
		_S._inSupportsPrelude ||
		_S._inCustomProperty ||
		_S._steppedFunctionDepth !== 0 ||
		// A nested fold is a term the expression around it still has to reduce, so
		// it keeps every digit it has: rounding here and again outside would land
		// the answer a rounding away from the one number it names.
		_S._mathFunctionDepth > 1
	) {
		return text;
	}
	return ANGLE_UNITS.has(toLowerCaseIfNeeded(unit))
		? text
		: _roundSignificant(text);
};

/**
 * Print one collapsed term back.
 * @param {string} key the sum's one key
 * @param {number} coefficient its value, in the key's base unit
 * @param {Set<string>} written the units the expression was written with
 * @returns {string | null} the printed value, or `null` when it does not print back exactly
 */
const _printCalcTerm = (key, coefficient, written) => {
	if (key === "" || key === "%") {
		const text = _normalizeNumber(String(coefficient));
		return Number(text) === coefficient
			? _roundCalcResult(text, key) + key
			: null;
	}
	const base = UNIT_GROUP_BASE.get(key);
	// A unit outside the conversion table counts in itself, so the coefficient is
	// already what it prints as.
	if (base === undefined) {
		const text = _normalizeNumber(String(coefficient));
		return Number(text) === coefficient
			? _roundCalcResult(text, key) + key
			: null;
	}
	// Counted in the group's base unit, so every unit of the group is a candidate
	// and each is divided into directly: `1cm + 1mm` is exactly `11mm`, and
	// reaching it through `px` first would lose it — no `px` count equals it.
	let best = null;
	const lengthGated = key === "length" && !_S._convertLengthUnits;
	for (const [candidate, to] of ABSOLUTE_UNIT_SCALE) {
		if (to[0] !== key) continue;
		// Gated, a sum may still collapse into a unit it was written with — that
		// introduces none — but not into one reached only to save bytes.
		if (lengthGated && candidate !== base[0] && !written.has(candidate)) {
			continue;
		}
		if (candidate !== base[0] && !UNIT_CONVERSION_TARGETS.has(candidate)) {
			continue;
		}
		const value = foldDivide(coefficient, to[1]);
		if (value === null) continue;
		const text = _normalizeNumber(String(value));
		if (Number(text) !== value || text.includes("e") || text.includes("E")) {
			continue;
		}
		const dimension = _roundCalcResult(text, candidate) + candidate;
		if (best === null || dimension.length < best.length) best = dimension;
	}
	return best;
};

/**
 * Print a whole reduced sum back as a `calc()` body. A sum still holding two
 * keys is one an engine resolves against layout (a percentage against a length,
 * an `em` against a `px`), and the terms of it are printed in the order they
 * were first written. A zero term is kept rather than dropped: which keys may be
 * added to which is a type rule, and dropping one can make an expression an
 * engine rejects into one it accepts (`calc(1px + 1deg - 1deg)`).
 * @param {Map<string, number>} sum the reduced sum
 * @param {Set<string>} written the units the expression was written with
 * @returns {string | null} the body, or `null` when a term does not print exactly
 */
const _printCalcSum = (sum, written) => {
	let text = "";
	for (const [key, coefficient] of sum) {
		const term = _printCalcTerm(
			key,
			text === "" ? coefficient : Math.abs(coefficient),
			written
		);
		if (term === null) return null;
		text += text === "" ? term : `${coefficient < 0 ? " - " : " + "}${term}`;
	}
	return text === "" ? null : text;
};

/**
 * Split a tokenized argument list on its top-level commas.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @returns {{ type: string, value: number, unit: string }[][]} one list per argument
 */
const _splitMathArguments = (tokens) => {
	/** @type {{ type: string, value: number, unit: string }[][]} */
	const args = [[]];
	let depth = 0;
	for (const token of tokens) {
		if (token.type === "(") {
			depth++;
		} else if (token.type === ")") {
			depth--;
		} else if (token.type === "," && depth === 0) {
			args.push([]);
			continue;
		}
		args[args.length - 1].push(token);
	}
	return args;
};

/**
 * Reduce the `<calc-sum>` arguments of a call the whole-call fold cannot read,
 * leaving every other argument as written. `calc-size(auto, 10px + 5px)` is
 * `calc-size(auto,15px)`: the basis is not an expression, so only the size is
 * touched.
 * @param {string} fn the lowercased function name
 * @param {string} inner the text between its parentheses
 * @returns {string | null} the rewritten body, or `null`
 */
const _reduceMathArguments = (fn, inner) => {
	if (!_S._transforms.reduceFunctions) return null;
	const positions = MATH_FUNCTION_SUM_ARGUMENTS.get(fn);
	// The same rewrite a stepped function's arguments refuse.
	if (positions === undefined || _S._steppedFunctionDepth > 0) return null;
	const parts = _splitTopLevelArguments(inner);
	let changed = false;
	for (const position of positions) {
		if (position >= parts.length) return null;
		const tokens = _tokenizeCalc(parts[position]);
		if (tokens === null) return null;
		const cursor = { at: 0 };
		const sum = _evaluateCalcSum(tokens, cursor);
		if (sum === null || cursor.at !== tokens.length) return null;
		const text = _printCalcSum(sum, _writtenUnits(tokens));
		if (text === null) return null;
		if (text !== parts[position].trim()) changed = true;
		parts[position] = text;
	}
	return changed ? parts.map((part) => part.trim()).join(",") : null;
};

/**
 * Fold a printed math function body to the one value it is equal to. Only a
 * fully collapsed result is returned: an expression still holding two units (a
 * percentage against a length, an `em` against a `px`) resolves against layout
 * and has to stay written out.
 * @param {string} fn the lowercased function name
 * @param {string} inner the printed body
 * @returns {string | null} the value, or `null` to leave the expression as it is
 */
const _foldMathFunction = (fn, inner) => {
	if (!_S._transforms.reduceFunctions) return null;
	const arity = MATH_FUNCTION_ARITY.get(fn);
	if (arity === undefined) return null;
	// WHY: a fold standing in a stepped function's argument prints in whichever
	// unit is shortest, which is the rewrite that function's own arguments refuse
	// — Chromium reads `round(down,4.5cm,1.5cm)` and `round(down,45mm,15mm)` as
	// different lengths. Its own result is not an argument of one, so the deciding
	// depth is the one above this call.
	if (_S._steppedFunctionDepth - (STEPPED_FUNCTIONS.has(fn) ? 1 : 0) > 0) {
		return null;
	}
	// A leading keyword the grammar offers (`round(down, …)`) is not an
	// expression, so it comes off before the arguments are read.
	let keyword = "";
	let body = inner;
	const choices = MATH_FUNCTION_KEYWORDS.get(fn);
	if (choices !== undefined) {
		const comma = inner.indexOf(",");
		if (comma !== -1) {
			const head = toLowerCaseIfNeeded(inner.slice(0, comma).trim());
			if (choices.includes(head)) {
				keyword = head;
				body = inner.slice(comma + 1);
			}
		}
	}
	const tokens = _tokenizeCalc(body);
	if (tokens === null) return null;
	const args = _splitMathArguments(tokens);
	if (args.length < arity[0] || args.length > arity[1]) return null;
	/** @type {Map<string, number>[]} */
	const sums = [];
	for (const argument of args) {
		const cursor = { at: 0 };
		const sum = _evaluateCalcSum(argument, cursor);
		if (sum === null || cursor.at !== argument.length) return null;
		sums.push(sum);
	}
	// `calc()` is the one that is not a single value: it is whatever sum its
	// argument reduced to, which may still hold two units.
	const written = _writtenUnits(tokens);
	if (fn === "calc") return _printCalcSum(sums[0], written);
	const fold = MATH_FUNCTION_FOLD.get(fn);
	if (fold === undefined) return null;
	const argument = fold.read(sums);
	if (argument === null) return null;
	const value = fold.apply(argument[1], keyword, fold.table);
	if (value === null) return null;
	return _printCalcTerm(
		fold.result === "same" ? argument[0] : fold.result,
		value,
		written
	);
};

/**
 * The `rgba()` a hex color carrying an alpha says, for a target that does not
 * read the hex-alpha notation (CSS Color 4). The legacy comma form is the one
 * every engine with an alpha at all reads, so a fallback is never itself newer
 * than what it replaces. Null when the text is no hex alpha to lower.
 * @param {string} text a printed hash token
 * @returns {string | null} the `rgba()`, or null
 */
const _hexAlphaFallback = (text) => {
	const body = text.slice(1);
	const n = body.length;
	if (text.charCodeAt(0) !== CC_NUMBER_SIGN || (n !== 4 && n !== 8)) {
		return null;
	}
	for (let i = 0; i < n; i++) {
		if (!_isHexDigit(body.charCodeAt(i))) return null;
	}
	const wide = n === 8;
	/** @type {number[]} */
	const parts = [];
	for (let i = 0; i < 4; i++) {
		const digits = wide ? body.slice(i * 2, i * 2 + 2) : body[i] + body[i];
		parts.push(Number.parseInt(digits, 16));
	}
	// An opaque alpha is no alpha to spell, and `_minifyHash` has already written
	// that color without one.
	if (parts[3] === 255) return null;
	// Transparent black is the keyword, which is shorter and as old as CSS 2.
	if (parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0) {
		return "transparent";
	}
	return `rgba(${parts[0]},${parts[1]},${parts[2]},${_alphaByteText(
		parts[3]
	)})`;
};

/**
 * Minify a hash token (`#…`) when it is a hex color: opaque (3/6 digits, and
 * 4/8 whose alpha is opaque) → the shortest color; with a real alpha (4/8
 * digits) → lowercase + collapse pairs (kept hex). Returns null when it is not a
 * hex color — e.g. a selector id — so it is
 * left verbatim.
 * @param {string} text the hash token text
 * @returns {string | null} the minified hex/name, or null
 */
const _minifyHash = (text) => {
	if (!_S._transforms.shortenColors) return null;
	const body = text.slice(1);
	const n = body.length;
	if (n !== 3 && n !== 4 && n !== 6 && n !== 8) return null;
	for (let i = 0; i < n; i++) {
		if (!_isHexDigit(body.charCodeAt(i))) return null;
	}
	const low = body.toLowerCase();
	if (n === 3) {
		return _shortestColor(
			Number.parseInt(low[0] + low[0], 16),
			Number.parseInt(low[1] + low[1], 16),
			Number.parseInt(low[2] + low[2], 16)
		);
	}
	if (n === 6) {
		return _shortestColor(
			Number.parseInt(low.slice(0, 2), 16),
			Number.parseInt(low.slice(2, 4), 16),
			Number.parseInt(low.slice(4, 6), 16)
		);
	}
	// A fully opaque alpha says nothing, and the form without it asks nothing of
	// the target's hex-alpha support either.
	if (n === 4) {
		if (low[3] !== "f") return `#${low}`;
		return _shortestColor(
			Number.parseInt(low[0] + low[0], 16),
			Number.parseInt(low[1] + low[1], 16),
			Number.parseInt(low[2] + low[2], 16)
		);
	}
	if (low[6] === "f" && low[7] === "f") {
		return _shortestColor(
			Number.parseInt(low.slice(0, 2), 16),
			Number.parseInt(low.slice(2, 4), 16),
			Number.parseInt(low.slice(4, 6), 16)
		);
	}
	return low[0] === low[1] &&
		low[2] === low[3] &&
		low[4] === low[5] &&
		low[6] === low[7]
		? `#${low[0]}${low[2]}${low[4]}${low[6]}`
		: `#${low}`;
};

/**
 * The base an at-rule's vendor spelling belongs to. Every at-rule spelling is
 * its base with a prefix on it, so the prefix comes off again.
 * @param {string} name a prefixed at-rule name, lowercased
 * @returns {string} the unprefixed name
 */
const _unprefixedAtRule = (name) =>
	name.slice(
		/** @type {RegExpExecArray} */ (VENDOR_PREFIX.exec(name))[1].length
	);

/**
 * Drop the prefixed rule this one is the unprefixed twin of. The pair is usually
 * adjacent — every stylesheet writes the prefixed spelling first — but nothing
 * in between matters: a piece stays retractable until the stylesheet ends, and a
 * nested rule until its parent assembles its body.
 * @param {PrefixScope} scope the block's running sibling state
 * @param {string} signature the unprefixed rule's sibling signature
 * @returns {void}
 */
const _dropPrefixTwin = (scope, signature) => {
	// Both ways it is held, never one: a rule written out leaves `pending` as its
	// piece is noted, so one signature's twins are split across the two.
	const retractable = scope.retractable;
	if (retractable !== null) {
		const pieces = retractable.get(signature);
		if (pieces !== undefined) {
			for (const at of pieces) {
				/** @type {PrintContext} */ (_stream.writer).retract(at);
			}
			retractable.delete(signature);
		}
	}
	const covering = scope.covering;
	if (covering !== null) {
		for (let i = covering.length - 1; i >= 0; i--) {
			const one = covering[i];
			if (!one.missing.delete(signature) || one.missing.size !== 0) continue;
			covering.splice(i, 1);
			if (one.piece !== -1) {
				/** @type {PrintContext} */ (_stream.writer).retract(one.piece);
			} else if (one.node !== null) {
				if (scope.dead === null) scope.dead = new Set();
				scope.dead.add(one.node);
			}
		}
	}
	const pending = scope.pending;
	if (pending === null) return;
	const nodes = pending.get(signature);
	if (nodes === undefined) return;
	pending.delete(signature);
	if (scope.dead === null) scope.dead = new Set();
	for (const node of nodes) scope.dead.add(node);
};

/**
 * Remember a prefixed rule an unprefixed twin later in its block would make dead
 * weight, both ways it can be dropped: as the rule just printed, which whoever
 * writes it out takes as a piece of its own, and — for a nested one — as the
 * node its parent skips while assembling its body, for the parents that do.
 * @param {PrefixScope} scope the block's running sibling state
 * @param {string} signature the rule's sibling signature
 * @param {boolean} top whether the rule is the stylesheet's own
 * @param {Set<string> | null} missing the per-selector signatures a list is still
 * short of, or null where one twin of the whole rule is what it waits for
 * @returns {void}
 */
const _holdPrefixTwin = (scope, signature, top, missing) => {
	_S._prefixDropCandidate = { node: _S._currentNode, signature, missing };
	if (top) return;
	if (missing !== null) {
		if (scope.covering === null) scope.covering = [];
		scope.covering.push({ missing, piece: -1, node: _S._currentNode });
		return;
	}
	if (scope.pending === null) scope.pending = new Map();
	_holdBySignature(scope.pending, signature, _S._currentNode);
};

/**
 * An at-rule (`@keyframes`), prefixed against the target: a prefixed copy is
 * prepended for each prefix a target still needs, and a prefixed rule no target
 * needs is dropped once its unprefixed twin has been seen. The `@name`'s prefix
 * is stripped for the sibling signature, so `@-webkit-keyframes x` and
 * `@keyframes x` pair up. Siblings are the rules of the block it sits in.
 * @param {CssPath} path the accessor on the at-rule
 * @param {string} ruleText the rule's own serialized text
 * @param {string} prelude the rule's serialized prelude (`@name …`)
 * @param {PrefixScope} scope the block's running sibling state
 * @param {boolean} top whether the rule is the stylesheet's own, which is the only
 * one whose text is still a piece a twin can take back
 * @returns {string} the rule text, with prefixed copies added or itself dropped
 */
const _prefixAtRule = (path, ruleText, prelude, scope, top) => {
	const seen = scope.seen;
	// Both spellings are read: what the rule is, and how many characters of its
	// text that name took, which an escape makes two different lengths.
	const written = path.name();
	const name = _atKeyword(written);
	const prefixed = VENDOR_PREFIX.test(name);
	const base = prefixed ? _unprefixedAtRule(name) : name;
	if (!PREFIXED_AT_RULES.has(base)) return ruleText;
	// This rule's cross-prefix identity: the prelude with the `@name` folded to its
	// unprefixed, lowercased spelling, so a cased `@Keyframes` and a prefixed
	// `@-webkit-keyframes` share it (at-rule names are case-insensitive).
	const signature = `@${base}${prelude.slice(1 + written.length)}`;
	if (prefixed) {
		const removable = _prefixRemovable(PREFIXED_AT_RULES, base, name);
		if (seen.has(signature) && removable) return "";
		seen.add(`${signature}\0${name}`);
		// Its twin may still be a later rule, which is where it is dropped.
		if (removable) _holdPrefixTwin(scope, signature, top, null);
		return ruleText;
	}
	seen.add(signature);
	_dropPrefixTwin(scope, signature);
	const needed = _neededPrefixes(PREFIXED_AT_RULES, base);
	if (needed === null) return ruleText;
	let out = "";
	for (const spelling of needed) {
		// Skip only a spelling the source already carries, marked when the prefixed
		// at-rule is met. A copy is still added per unprefixed rule of this
		// signature, so a later `@keyframes` keeps its prefixed twin winning.
		if (seen.has(`${signature}\0${spelling}`)) continue;
		out += `@${spelling}${ruleText.slice(1 + written.length)}`;
	}
	return out + ruleText;
};

// The prefixed spelling of a prefixable selector back to `[base, prefix]`, built
// once from the forward table so a prefixed selector is recognized for removal.
// BCD's prefix concatenates onto the base, so the spelling is exact.
/** @type {Map<string, [string, string]> | null} */
let _prefixedSelectorNames = null;
/**
 * @param {string} name a selector's pseudo name
 * @returns {[string, string] | undefined} its `[base, prefix]` when prefixed
 */
const _prefixedSelectorName = (name) => {
	if (_prefixedSelectorNames === null) {
		_prefixedSelectorNames = new Map();
		for (const [base, spellings] of PREFIXED_SELECTORS) {
			for (const [spelling] of spellings) {
				_prefixedSelectorNames.set(spelling, [base, spelling]);
			}
		}
	}
	return _prefixedSelectorNames.get(name);
};

// A selector prelude part split at its `(`: a functional pseudo prints as one
// token (`dir(rtl)`), so its name is matched and rewritten apart from the
// argument that carries over unchanged. A bare pseudo has no `(`.
/**
 * @param {string} part a printed prelude token
 * @returns {string} its name, without any `(argument)`
 */
const _selectorPartName = (part) => {
	const paren = part.indexOf("(");
	return paren === -1 ? part : part.slice(0, paren);
};

/**
 * Whether a prelude token is a pseudo some engine spells with a prefix. It must
 * sit right after a `:` for the caller to ask, so a class of the same spelling is
 * not mistaken for it; the name matches ASCII case-insensitively, as property and
 * at-rule names do.
 * @param {string} part a printed prelude token
 * @returns {boolean} true when the table knows it, prefixed or not
 */
const _prefixablePseudo = (part) => {
	const name = toLowerCaseIfNeeded(_selectorPartName(part));
	return (
		PREFIXED_SELECTORS.has(name) || _prefixedSelectorName(name) !== undefined
	);
};

/**
 * One selector of a rule's prelude: the tokens it spans, and the sole prefixable
 * pseudo in it — `-1` where it has none, `-2` where it has more than one, which
 * leaves the whole rule alone.
 * @typedef {object} PrefixableSelector
 * @property {number} start its first prelude token
 * @property {number} end one past its last
 * @property {number} at the prefixable pseudo's token, or -1 / -2
 */

/**
 * Split a prelude into its selectors, marking the prefixable pseudo in each.
 * @param {string[]} parts the printed prelude tokens
 * @returns {PrefixableSelector[] | null} the selectors, or null when none carries one
 */
const _prefixableSelectors = (parts) => {
	// Nothing is built for a prelude that carries no prefixable pseudo, which is
	// nearly every one: the scan below only reads the tokens after a `:`.
	let any = false;
	for (let i = 1; i < parts.length; i++) {
		if (parts[i - 1] === ":" && _prefixablePseudo(parts[i])) {
			any = true;
			break;
		}
	}
	if (!any) return null;
	/** @type {PrefixableSelector[]} */
	const selectors = [];
	let start = 0;
	let at = -1;
	for (let i = 0; i <= parts.length; i++) {
		if (i === parts.length || parts[i] === ",") {
			// Whitespace around the comma says nothing, and would print back as a
			// space inside a rewritten list.
			let from = start;
			let to = i;
			while (from < to && parts[from] === _SEP) from++;
			while (to > from && parts[to - 1] === _SEP) to--;
			selectors.push({ start: from, end: to, at });
			start = i + 1;
			at = -1;
			continue;
		}
		if (i !== 0 && parts[i - 1] === ":" && _prefixablePseudo(parts[i])) {
			at = at === -1 ? i : -2;
		}
	}
	return selectors;
};

// The preludes a prefix copy wrote this rule as, read by the caller: every copy
// carries the rule's own block, so a rule written as several is still one block
// under several preludes — which is what lets a hoist take them all out.
/** @type {string[]} */
let _prefixCopyPreludes = [];

/**
 * A qualified rule prefixed against the target, for each selector of its list
 * that is a prefixable pseudo (`::placeholder`): a copy carrying the pseudo's
 * engine spelling is prepended for each prefix a target needs, and a
 * prefixed-only rule no target needs is dropped once its unprefixed twin has
 * been seen. A copy holds only the selectors that need that one prefix — an
 * engine drops a whole list over one selector it cannot parse, so a copy must
 * never mix spellings. The author's colons carry over.
 * @param {string} ruleText the rule's own serialized text
 * @param {string[]} parts the printed prelude tokens
 * @param {string} soft the space before `{` (empty minifying)
 * @param {string} body the rule's serialized block body
 * @param {PrefixScope} scope the block's running sibling state
 * @param {boolean} top whether the rule is the stylesheet's own, which is the only
 * one whose text is still a piece a twin can take back
 * @returns {string} the rule text, with prefixed copies added or itself dropped
 */
const _prefixQualifiedRule = (ruleText, parts, soft, body, scope, top) => {
	_prefixCopyPreludes = [];
	const seen = scope.seen;
	const selectors = _prefixableSelectors(parts);
	if (selectors === null) return ruleText;
	// A functional pseudo (`dir(rtl)`) keeps its argument; only the name is
	// matched and swapped, and the argument is part of the sibling signature so
	// `:dir(rtl)` and `:dir(ltr)` stay distinct.
	/** @type {string[]} */
	const bases = [];
	/** @type {string[]} */
	const args = [];
	/** @type {(string | undefined)[]} */
	const carried = [];
	/** @type {string | undefined} */
	let listPrefix;
	for (const selector of selectors) {
		const at = selector.at;
		if (at === -2) return ruleText;
		if (at === -1) {
			bases.push("");
			args.push("");
			carried.push(undefined);
			continue;
		}
		const raw = parts[at];
		const nameOnly = toLowerCaseIfNeeded(_selectorPartName(raw));
		const found = _prefixedSelectorName(nameOnly);
		// One spelling for the whole list: a list mixing a vendor-spelled pseudo
		// with a plainly spelled one, or with a second spelling, is neither this
		// rule's twin nor a copy of it.
		if (found !== undefined) {
			if (listPrefix !== undefined && listPrefix !== found[1]) return ruleText;
			listPrefix = found[1];
		}
		bases.push(found === undefined ? nameOnly : found[0]);
		args.push(raw.slice(_selectorPartName(raw).length));
		carried.push(found === undefined ? undefined : found[1]);
	}
	/**
	 * @param {(index: number) => string | null} spell each selector's pseudo, or null to leave it out
	 * @returns {string} the prelude those selectors print as
	 */
	const preludeOf = (spell) => {
		/** @type {string[]} */
		const out = [];
		for (let i = 0; i < selectors.length; i++) {
			const name = spell(i);
			if (name === null) continue;
			if (out.length !== 0) out.push(",");
			const { start, end, at } = selectors[i];
			for (let j = start; j < end; j++) out.push(j === at ? name : parts[j]);
		}
		return _join(out, false, _TRIM_COMBINATORS);
	};
	// This rule's cross-prefix identity: every prefixable pseudo folded to its
	// unprefixed spelling, so a prefixed list and its twin pair up.
	const signature = `s${preludeOf((i) =>
		selectors[i].at === -1 ? "" : bases[i] + args[i]
	)}`;
	// The same identity per selector, so the rules writing them cover the list
	// between them. Only where every selector is one a prefix can be dropped from.
	/** @type {string[] | null} */
	let apart = null;
	if (selectors.length > 1 && !selectors.some((one) => one.at === -1)) {
		apart = [];
		for (let i = 0; i < selectors.length; i++) {
			apart.push(`s${preludeOf((j) => (j === i ? bases[i] + args[i] : null))}`);
		}
	}
	if (listPrefix !== undefined) {
		// Every pseudo of the list carries that spelling, and each is dead weight on
		// its own.
		const removable = bases.every(
			(base, i) =>
				selectors[i].at === -1 ||
				_prefixRemovable(
					PREFIXED_SELECTORS,
					base,
					/** @type {string} */ (listPrefix)
				)
		);
		// Covered when every selector is: a list of twins says the same as one twin
		// of the list, and the rules writing them need not be one rule.
		const missing =
			apart === null ? null : new Set(apart.filter((one) => !seen.has(one)));
		const covered = missing === null ? seen.has(signature) : missing.size === 0;
		if (covered && removable) return "";
		seen.add(`${signature}\0${listPrefix}`);
		// Its twin may still be a later rule, which is where it is dropped.
		if (removable) _holdPrefixTwin(scope, signature, top, missing);
		return ruleText;
	}
	seen.add(signature);
	_dropPrefixTwin(scope, signature);
	// Each selector on its own as well: this rule writes every one of them, so a
	// prefixed list waiting on any is that much nearer covered.
	if (apart !== null) {
		for (const one of apart) {
			seen.add(one);
			_dropPrefixTwin(scope, one);
		}
	}
	/** @type {(Set<string> | null)[]} */
	// WHY: one copy per spelling, never per engine. An engine not knowing one of a
	// list's selectors drops the list whole, and two names of one engine arrived in
	// different versions — `::-webkit-input-placeholder` in Chrome 6 and
	// `:-webkit-full-screen` in 15, so a list of both is nothing to Chrome 6
	// through 14. Selectors taking the same spelling take the same versions with
	// it, so those do share a copy.
	/** @type {(Set<string> | null)[]} */
	const needed = [];
	/** @type {Set<string> | null} */
	let spellings = null;
	for (let i = 0; i < selectors.length; i++) {
		const one =
			selectors[i].at === -1
				? null
				: _neededPrefixes(PREFIXED_SELECTORS, bases[i]);
		needed.push(one);
		if (one === null) continue;
		if (spellings === null) spellings = new Set();
		for (const spelling of one) spellings.add(spelling);
	}
	if (spellings === null) return ruleText;
	let out = "";
	for (const spelling of spellings) {
		// Skip only a spelling the source already carries, marked above when the
		// vendor-spelled rule is met. A copy is still added per unprefixed rule of
		// this signature, so a later one keeps its prefixed twin winning.
		if (seen.has(`${signature}\0${spelling}`)) continue;
		const list = preludeOf((i) => {
			const one = needed[i];
			return one === null || !one.has(spelling) ? null : spelling + args[i];
		});
		_prefixCopyPreludes.push(list);
		out += `${list}${soft}{${body}}`;
	}
	return out + ruleText;
};

// The two orders `_lightDarkToggle` writes the pair in, which is what tells a
// block this wrote from one an author happened to name the same property in.
const LIGHT_DARK_WRITTEN = `${LIGHT_PROPERTY}:initial;${DARK_PROPERTY}:`;
const LIGHT_DARK_WRITTEN_DARK = `${LIGHT_PROPERTY}:;${DARK_PROPERTY}:initial`;

/**
 * The two toggle declarations one `color-scheme` value says, or null where this
 * cannot tell which scheme it names — a substitution, or a keyword the spec has
 * not given yet. `only` narrows how the scheme is chosen, not which one.
 * @param {string} value the `color-scheme` value, as printed
 * @returns {{ toggle: string, flip: boolean } | null} the declarations and whether the scheme follows the user's preference, or null
 */
const _lightDarkToggle = (value) => {
	let light = false;
	let dark = false;
	for (const one of _splitTopLevelSpaces(value)) {
		const word = toLowerCaseIfNeeded(one);
		// `only` narrows how the scheme is chosen, not which one it is; `normal` is
		// the scheme an element with no other answer uses, which is the light one —
		// and stating it is how a descendant takes back an ancestor's.
		if (word === "only" || word === "normal") continue;
		if (word === "light") light = true;
		else if (word === "dark") dark = true;
		else return null;
	}
	const toggle =
		dark && !light
			? `${LIGHT_PROPERTY}:;${DARK_PROPERTY}:initial;`
			: `${LIGHT_PROPERTY}:initial;${DARK_PROPERTY}:;`;
	// Naming both is what hands the choice to the user's own preference, which is
	// the one case a second rule has to answer.
	return { toggle, flip: light && dark };
};

// The `color-scheme` a block sets, wherever it stands in it. Read from the
// composed text: what a rule sets is what it wrote, and the value is one
// component list.
const _COLOR_SCHEME_RE = /(?:^|[;{}])color-scheme:([^;{}]*)/i;

// The scheme the user asked for, which is what a `color-scheme` naming both
// defers to.
const _PREFERS_DARK = "@media (prefers-color-scheme:dark)";

/**
 * Whether a value names a color function no target reads, wherever it stands.
 * @param {string} value the value, as printed
 * @returns {boolean} true when one of them is there
 */
const _namesUnreadableColor = (value) => {
	_UNREADABLE_COLOR_CALL_RE.lastIndex = 0;
	for (
		let match = _UNREADABLE_COLOR_CALL_RE.exec(value);
		match !== null;
		match = _UNREADABLE_COLOR_CALL_RE.exec(value)
	) {
		if (_unreadableColorFunction(asciiLowerCaseName(match[2]))) return true;
	}
	return false;
};

// Some mobile WebKit builds honor `-webkit-tap-highlight-color:rgba(0,0,0,0)`
// but ignore the equivalent `transparent`, so that one property keeps the
// function form (cssnano guards the same property).
/**
 * @returns {boolean} whether the value being printed belongs to `-webkit-tap-highlight-color`
 */
const _inTapHighlightColor = () =>
	_S._valueDeclaration !== null &&
	A.unescapedName(_S._valueDeclaration).toLowerCase() ===
		"-webkit-tap-highlight-color";

/**
 * Write one `:nth-*()` in its shortest equal spelling: the An+B microsyntax
 * carries its own whitespace and signs, two keywords name a step of two, and a
 * step selecting exactly one child is the child that has its own name.
 * @param {string} name the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string} the whole replacement, `name(inner)` when nothing is shorter
 */
const _minifyAnPlusB = (name, inner) => {
	if (!_S._transforms.shortenSelectors) return `${name}(${inner})`;
	// `An+B of S` selects among S, which no plain spelling names.
	if (/\bof\b/i.test(inner)) return `${name}(${inner})`;
	const nth = _minifyNth(inner);
	if (nth === null) return `${name}(${inner})`;
	const first = NTH_NAMED_EQUIVALENTS.get(name);
	return nth === "1" && first !== undefined ? first : `${name}(${nth})`;
};

/**
 * Whether the declaration being printed takes a family list — the longhand, or a
 * shorthand that sets it, where an identifier naming a family is a family name
 * and nothing else.
 * @returns {boolean} true inside such a declaration
 */
const _inFontFamily = () =>
	_S._valueDeclaration !== null &&
	FAMILY_LIST_PROPERTIES.has(
		asciiLowerCaseName(A.unescapedName(_S._valueDeclaration))
	);

/**
 * Whether the string is the whole entry in its comma-separated slot:
 * `<family-name>` takes `<string> | <custom-ident>+`, never a mix of the two.
 * @param {CssPath} path the accessor positioned on the string token
 * @returns {boolean} true when nothing else shares its slot
 */
const _isLoneFamilyName = (path) => {
	const parent = path.parent;
	// Directly in the declaration's value: inside a function the string is an
	// argument rather than a family.
	if (parent === null || path.type(parent) !== T_DECLARATION) return false;
	const self = path.start(path.node);
	const count = path.childCount(parent);
	let sharedSlot = false;
	let seenSelf = false;
	for (let at = 0; at < count; at++) {
		const child = path.childAt(parent, at);
		const type = path.type(child);
		if (type === T_COMMA) {
			if (seenSelf) return !sharedSlot;
			sharedSlot = false;
			continue;
		}
		if (type === T_WHITESPACE || type === T_COMMENT) continue;
		if (path.start(child) === self) seenSelf = true;
		else sharedSlot = true;
	}
	return seenSelf && !sharedSlot;
};

// One identifier, and a family name is a run of them parted by whitespace. The
// escapes a quoted name may carry are not identifier text, so one declines.
const _PLAIN_IDENT_RE = /^-?[A-Za-z_-￿][\w-￿-]*$/;

/**
 * Unquote a font family whose text is already a run of identifiers, which is
 * the other spelling `<family-name>` names. Returns null wherever the quotes
 * carry something: a generic family's own keyword, a CSS-wide keyword, or text
 * no identifier could spell.
 * @param {string} raw the string token as written, quotes included
 * @returns {string | null} the unquoted name, or null to keep the string
 */
const _unquoteFontFamily = (raw) => {
	if (!_S._transforms.normalizeQuotes) return null;
	const quote = raw.charCodeAt(0);
	if (quote !== CC_QUOTATION_MARK && quote !== CC_APOSTROPHE) return null;
	if (raw.length < 2 || raw.charCodeAt(raw.length - 1) !== quote) return null;
	const text = raw.slice(1, -1);
	if (text.includes("\\")) return null;
	const words = text.split(" ");
	if (words.length === 0 || text.length + 1 >= raw.length) return null;
	for (const word of words) {
		if (!_PLAIN_IDENT_RE.test(word)) return null;
		const lowered = toLowerCaseIfNeeded(word);
		// Unquoted, either would read as the grammar's keyword instead of a name.
		if (CSS_WIDE_KEYWORDS.has(lowered)) return null;
		// A generic family is one identifier, so only a lone word can be read as
		// one — `Apple Color Emoji` is three, whatever the last of them spells.
		if (words.length === 1 && GENERIC_FONT_FAMILIES.has(lowered)) return null;
	}
	return text;
};

/**
 * Whether the declaration being printed takes a color and never an identifier
 * of the author's own, so a named color in it is unambiguously that color.
 * @returns {boolean} true inside such a declaration
 */
const _inColorOnlyProperty = () =>
	_S._valueDeclaration !== null &&
	COLOR_ONLY_PROPERTIES.has(
		toLowerCaseIfNeeded(A.unescapedName(_S._valueDeclaration))
	);

/**
 * Whether the declaration being printed spells no name of the author's: its
 * grammar is keywords alone, or it takes a color, which is keywords and numbers.
 * An identifier standing directly in such a value is one of those keywords.
 * @returns {boolean} true inside such a declaration
 */
const _inKeywordOnlyValue = () => {
	if (_S._valueDeclaration === null) return false;
	// Memoized on the declaration: every identifier in one value asks the same
	// question, and answering it reads the name, folds it and looks it up twice.
	if (_S._keywordOnlyFor !== _S._valueDeclaration) {
		_S._keywordOnlyFor = _S._valueDeclaration;
		const property = _standardSpelling(
			toLowerCaseIfNeeded(A.unescapedName(_S._valueDeclaration))
		);
		_S._keywordOnly =
			KEYWORD_ONLY_PROPERTIES.has(property) ||
			COLOR_ONLY_PROPERTIES.has(property);
	}
	return _S._keywordOnly;
};

// A plain (non-scientific, unitless) number — the only argument form these
// equivalences are proven for; anything else (a `var()`, a dimension) keeps the
// function, since rewriting an invalid declaration would activate it.
const _PLAIN_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

/**
 * Minify an easing function to its shorter, value-identical form:
 * `cubic-bezier()` to the keyword defining the same curve, `steps()` to
 * `step-start` / `step-end`, and the default `end` position away. Returns null
 * for anything else, keeping the function.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the shorter easing function, or null to keep the function
 */
const _minifyEasingFunction = (fn, inner) => {
	if (!_S._transforms.reduceFunctions) return null;
	if (fn !== "cubic-bezier" && fn !== "steps") return null;
	const args = inner.split(",");
	if (fn === "cubic-bezier") {
		if (args.length !== 4) return null;
		let key = "";
		for (let i = 0; i < 4; i++) {
			const s = args[i].trim();
			if (!_PLAIN_NUMBER_RE.test(s)) return null;
			key += (i === 0 ? "" : ",") + Number.parseFloat(s);
		}
		const keyword = CUBIC_BEZIER_KEYWORDS.get(key);
		return keyword === undefined ? null : keyword;
	}
	if (args.length !== 2) return null;
	const count = args[0].trim();
	if (!/^\d+$/.test(count)) return null;
	const position = args[1].trim().toLowerCase();
	if (position === "start" || position === "jump-start") {
		// `start` is `jump-start`'s alias.
		return count === "1" ? "step-start" : `steps(${count},start)`;
	}
	if (position !== "end" && position !== "jump-end") return null;
	// `end` is `steps()`'s default position, so it always drops out.
	return count === "1" ? "step-end" : `steps(${count})`;
};

// Code points a url-token cannot carry unescaped, so a `url("…")` string only
// drops its quotes without them.
// eslint-disable-next-line no-control-regex -- a control code point is exactly what a url-token may not carry
const _UNQUOTABLE_URL_RE = /[\s"'()\\\u0000-\u001F\u007F]/;

// …of those, the ones a backslash alone escapes into a url-token. No other can:
// a control code point takes a hex escape that is never shorter, and a backslash
// already there starts an escape this printer did not write.
const _URL_ESCAPABLE = new Set([" ", '"', "'", "(", ")"]);

/**
 * Rewrite a `url()`'s quoted body as the url-token spelling the same URL, or
 * null where none does. Every code point is classified — escaped, kept, or
 * refused — so nothing reaches the output unexamined.
 * @param {string} body the string's content, quotes excluded
 * @returns {string | null} the url-token text, or null to keep the quotes
 */
const _escapeUrlBody = (body) => {
	let out = "";
	let escapes = 0;
	for (const character of body) {
		if (_URL_ESCAPABLE.has(character)) {
			// Two escapes cost the two bytes the quotes did, so nothing is saved.
			if (++escapes > 1) return null;
			out += `\\${character}`;
			continue;
		}
		const code = /** @type {number} */ (character.codePointAt(0));
		if (character === "\\" || code < 0x20 || code === 0x7f) return null;
		out += character;
	}
	return escapes === 0 ? null : out;
};

const _PERCENT_ESCAPE_RE = /%[0-9a-f]{2}/gi;

// A `data:` URL up to the comma that ends its metadata. Only past that comma is
// an escape content the URL parser decodes before anything reads it; anywhere
// else it is structure — `%26` in a query is a literal `&`, not a separator.
const _DATA_URL_METADATA_RE = /^data:[^,]*,/i;

/**
 * Write each percent-escape a data URI's payload does not need as the byte it
 * names — three bytes for one, over the markup an inline SVG is made of.
 * @param {string} body the url's content, quotes excluded
 * @param {boolean} bare whether it is written as a url-token rather than a string
 * @param {string} quote the quote the body is written in, empty for a url-token
 * @returns {string} the body, its needless escapes decoded
 */
const _decodePercentEscapes = (body, bare, quote) => {
	const metadata = _DATA_URL_METADATA_RE.exec(body);
	if (metadata === null) return body;
	return (
		metadata[0] +
		body.slice(metadata[0].length).replace(_PERCENT_ESCAPE_RE, (escape) => {
			const code = Number.parseInt(escape.slice(1), 16);
			// Each escape names one byte, not one code point: `%C3%A9` is two bytes
			// of one character, and writing them apart would re-encode as four.
			if (code < 0x20 || code >= 0x7f) return escape;
			const one = String.fromCharCode(code);
			// `#` would start the fragment and `%` the next escape, so those two
			// stay; the quote and the escape character would end or extend the
			// string, and a url-token carries none of what the quotes were holding.
			if (one === "#" || one === "%" || one === quote || one === "\\") {
				return escape;
			}
			return bare && _UNQUOTABLE_URL_RE.test(one) ? escape : one;
		})
	);
};

/**
 * `url("a.png")` → `url(a.png)` when the quoted URL is also a valid url-token,
 * and a data URI's payload written as the bytes its escapes name. Nothing else
 * about the URL is rewritten, since webpack passes it through to a server that
 * may read it verbatim.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the shorter `url()`, or null to keep the function
 */
const _minifyUrlFunction = (fn, inner) => {
	if (fn !== "url") return null;
	const quote = inner.charCodeAt(0);
	if (quote !== CC_QUOTATION_MARK && quote !== CC_APOSTROPHE) return null;
	if (inner.length < 2 || inner.charCodeAt(inner.length - 1) !== quote) {
		return null;
	}
	const written = inner.slice(1, -1);
	const mark = String.fromCharCode(quote);
	// The renderer reads source, so it is offered the decoded payload whatever
	// the switches say — `escapes` decides how the escapes are *printed*, not
	// whether a data URL holds a document.
	const decoded = _decodePercentEscapes(written, false, mark);
	// A `data:` payload a renderer rewrites is serialized afresh, so what it hands
	// back is no longer what the quotes were written around. Quoted as written
	// until then, the unquoted form below not carrying a document payload.
	if (_S._deferEmbeddedSource !== undefined) {
		const deferred = _deferDataUrl(
			decoded,
			(url) => `${fn}(${_serializeUrl(url, mark)})`,
			`${fn}(${mark}${written}${mark})`
		);
		if (deferred !== null) return deferred;
	}
	const rendered = _renderDataUrl(decoded);
	if (rendered !== null) return `${fn}(${_serializeUrl(rendered, mark)})`;
	// Taking the quotes off what is a url-token without them is `normalizeQuotes`;
	// writing a percent-escape as the byte it names is not a switch of its own —
	// an escape and the byte name one string, so nothing reads them apart.
	const body = decoded;
	if (!_S._transforms.normalizeQuotes) {
		return body === written ? null : `${fn}(${mark}${body}${mark})`;
	}
	if (!_UNQUOTABLE_URL_RE.test(body)) return `${fn}(${body})`;
	// A code point a url-token cannot carry can still be escaped into one, which
	// costs a byte where the two quotes cost two — so one of them is shorter
	// escaped and two are not.
	const escaped = _escapeUrlBody(body);
	if (escaped !== null) return `${fn}(${escaped})`;
	// It keeps its quotes, and with them whatever the escapes gave back.
	return body === written ? null : `${fn}(${mark}${body}${mark})`;
};

/**
 * Whether `text` re-tokenizes as exactly one `<ident-token>` — no escapes, and
 * no leading digit (`1x` is a dimension, `-1` a number) — so an attribute
 * selector's quoted value can drop its quotes.
 * @param {string} text the string's content, quotes excluded
 * @returns {boolean} true when it is a bare identifier
 */
const _isBareIdent = (text) => {
	const n = text.length;
	if (n === 0) return false;
	for (let i = 0; i < n; i++) {
		if (!_isIdentLike(text.charCodeAt(i))) return false;
	}
	const first = text.charCodeAt(0);
	if (_isDigit(first)) return false;
	// `-` alone is a delim, `-1` a number; `-x` / `--x` are idents.
	if (first === CC_HYPHEN_MINUS) return n > 1 && !_isDigit(text.charCodeAt(1));
	return true;
};

/**
 * Whether the code point an escape stands for can be written literally at
 * `index` of an identifier: it must be an ASCII ident code point, and the first
 * one must also be able to *start* an ident (`\31 x` is the class `1x`, but a
 * literal `1x` is a dimension). Non-ASCII stays escaped — writing it literally
 * would make the stylesheet's own encoding load-bearing.
 * @param {number} value the escape's code point
 * @param {string} written the identifier text emitted so far
 * @returns {boolean} true when the literal code point re-tokenizes the same
 */
const _canUnescape = (value, written) => {
	if (value >= 128 || !_isIdentCodePoint(value)) return false;
	if (written.length === 0) {
		return _isLetter(value) || value === CC_LOW_LINE;
	}
	// `-1` is a number and `--1` a valid ident, so only the second code point of
	// a leading `-` is constrained.
	if (written === "-") return !_isDigit(value);
	return true;
};

/**
 * Shorten the escapes in an identifier, two ways that both re-tokenize to the
 * same name: write the code point literally where it needs no escape at all
 * (`\41 bc` → `Abc`), and otherwise drop the whitespace that terminates a hex
 * escape when the code point after it, *inside this same token*, cannot extend
 * it (`\32 xl` → `\32xl`). A terminator that ends the token stays: the walk's
 * own separator would take its place and swallow the whitespace that follows
 * (`.\32   x` is the class `2` and a descendant `x`, not the class `2x`).
 * @param {string} text the identifier's source text
 * @returns {string} the identifier, escapes shortened
 */
const _minifyIdentEscapes = (text) => {
	if (!text.includes("\\")) return text;
	const n = text.length;
	let out = "";
	let i = 0;
	while (i < n) {
		const c = text.charCodeAt(i);
		if (c !== CC_REVERSE_SOLIDUS || i + 1 >= n) {
			out += text[i];
			i++;
			continue;
		}
		let digitEnd = i + 1;
		let value = 0;
		while (
			digitEnd < n &&
			digitEnd - i <= 6 &&
			_isHexDigit(text.charCodeAt(digitEnd))
		) {
			value = value * 16 + Number.parseInt(text[digitEnd], 16);
			digitEnd++;
		}
		const digits = digitEnd - i - 1;
		if (digits === 0) {
			// An identity escape (`\:`), which is what makes the code point literal —
			// dropping it would change the token.
			out += text[i] + text[i + 1];
			i += 2;
			continue;
		}
		// A hex escape ends at the first non-hex digit, one whitespace there being
		// its terminator rather than part of the name. A CRLF pair is one such
		// whitespace, so dropping the CR alone leaves a raw newline in the name.
		let end = digitEnd;
		if (end < n && isWhitespace(text.charCodeAt(end))) {
			end = consumeExtraNewline(text.charCodeAt(end), text, end + 1);
		}
		if (end !== digitEnd && end === n) {
			// The terminator is also where the identifier stops. Rewriting it hands
			// that job to the walk's own separator, which is not the same thing —
			// `.a\31 .b` is one compound selector, `.a1 .b` two.
			out += text.slice(i);
			break;
		}
		if (_canUnescape(value, out)) {
			out += String.fromCharCode(value);
			i = end;
			continue;
		}
		const keepTerminator =
			end !== digitEnd &&
			((digits !== 6 && _isHexDigit(text.charCodeAt(end))) ||
				isWhitespace(text.charCodeAt(end)));
		out += text.slice(i, keepTerminator ? end : digitEnd);
		i = end;
	}
	return out;
};

/**
 * A url token's value as the printer writes it back: where the input ran out
 * inside the token, a `\` left dangling at its end reads as U+FFFD (§4.3.7),
 * and kept, it would escape the `)` written after it.
 * @param {CssPath} path the accessor positioned on the url token
 * @param {boolean} unterminated whether the input ran out inside it
 * @returns {string} its value
 */
const _urlValue = (path, unterminated) =>
	unterminated ? _terminate(path.value(), "", "\uFFFD") : path.value();

/**
 * Normalize a string token's quotes, following cssnano's `postcss-normalize-string`:
 * prefer `"`, switch to whichever quote needs fewer escapes, and unescape a quote
 * the chosen wrapper no longer escapes. A string already holding a literal quote
 * keeps its wrapper — the other kind is the cheap one there. Value-identical; a
 * `\`-newline continuation is left alone because dropping it could fuse into a
 * preceding hex escape.
 * A hex escape stays as written: the character it names costs gzip bytes where
 * it saves raw ones (measured in `configCases/css/minimize-values`).
 * @param {string} raw the string token's source text, quotes included
 * @returns {string} the normalized string token
 */
const _minifyString = (raw) => {
	if (!_S._transforms.normalizeQuotes) return raw;
	const quote = raw.charCodeAt(0);
	const n = raw.length;
	// A string the tokenizer closed at EOF has no matching final quote; rewriting
	// one would move where it ends.
	if (n < 2 || raw.charCodeAt(n - 1) !== quote) return raw;
	// The overwhelmingly common string — already `"`-wrapped, no escape and no
	// literal `'` — is unchanged; two native scans beat the counting loop below.
	if (
		quote === CC_QUOTATION_MARK &&
		!raw.includes("\\") &&
		!raw.includes("'")
	) {
		return raw;
	}
	let literalQuotes = 0;
	let escapedDoubleQuotes = 0;
	let escapedSingleQuotes = 0;
	for (let i = 1; i < n - 1; i++) {
		const c = raw.charCodeAt(i);
		if (c === CC_REVERSE_SOLIDUS) {
			// The escape swallows the final quote (`"x\"` at EOF): the string never
			// closed, so its last character is content, not a wrapper to rewrite.
			if (i + 1 === n - 1) return raw;
			const next = raw.charCodeAt(i + 1);
			if (next === CC_QUOTATION_MARK) escapedDoubleQuotes++;
			else if (next === CC_APOSTROPHE) escapedSingleQuotes++;
			i++;
		} else if (c === CC_QUOTATION_MARK || c === CC_APOSTROPHE) {
			literalQuotes++;
		}
	}
	if (literalQuotes !== 0) return raw;
	if (escapedDoubleQuotes === 0 && escapedSingleQuotes === 0) {
		return quote === CC_QUOTATION_MARK ? raw : `"${raw.slice(1, -1)}"`;
	}
	let want = quote;
	if (quote === CC_APOSTROPHE && escapedDoubleQuotes === 0) {
		want = CC_QUOTATION_MARK;
	} else if (quote === CC_QUOTATION_MARK && escapedSingleQuotes === 0) {
		want = CC_APOSTROPHE;
	}
	const wrapper = String.fromCharCode(want);
	let out = wrapper;
	for (let i = 1; i < n - 1; i++) {
		const c = raw.charCodeAt(i);
		if (c !== CC_REVERSE_SOLIDUS) {
			out += raw[i];
			continue;
		}
		const next = raw.charCodeAt(i + 1);
		out +=
			(next === CC_QUOTATION_MARK || next === CC_APOSTROPHE) && next !== want
				? raw[i + 1]
				: raw[i] + raw[i + 1];
		i++;
	}
	return out + wrapper;
};

/**
 * Whether a printed selector is one compound — no combinator and no comma, so
 * standing it where `&` was says what `:is()` around it would.
 * @param {string} selector one printed selector
 * @returns {boolean} true when it is a single compound selector
 */
const _isCompoundSelector = (selector) => {
	let depth = 0;
	let quote = 0;
	for (let i = 0; i < selector.length; i++) {
		const code = selector.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (quote !== 0) {
			if (code === quote) quote = 0;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
		} else if (code === CC_LEFT_PARENTHESIS || code === CC_LEFT_SQUARE) {
			depth++;
		} else if (code === CC_RIGHT_PARENTHESIS || code === CC_RIGHT_SQUARE) {
			depth--;
		} else if (
			depth === 0 &&
			(code === CC_COMMA || _COMBINATOR_CODES.has(code))
		) {
			return false;
		}
	}
	return true;
};

// What separates one compound from the next, printed: the three combinators and
// the space a descendant is written with.
const _COMBINATOR_CODES = new Set([
	CC_SPACE,
	CC_GREATER_THAN_SIGN,
	CC_PLUS_SIGN,
	CC_TILDE
]);

/**
 * Write each `&` in one printed selector as the parent it stands for.
 * @param {string} selector one printed selector
 * @param {string} reference what the parent selector is written as
 * @returns {string} the selector with every `&` written out
 */
const _substituteAmpersand = (selector, reference) => {
	let out = "";
	let at = 0;
	let quote = 0;
	for (let i = 0; i < selector.length; i++) {
		const code = selector.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (quote !== 0) {
			if (code === quote) quote = 0;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
		} else if (code === CC_AMPERSAND) {
			out += selector.slice(at, i) + reference;
			at = i + 1;
		}
	}
	return at === 0 ? selector : out + selector.slice(at);
};

/**
 * Whether one printed selector names the parent itself, anywhere `&` may stand
 * — inside a pseudo's argument included, which is still the parent it means.
 * @param {string} selector one printed selector
 * @returns {boolean} true when it holds an `&`
 */
const _namesParent = (selector) => {
	let quote = 0;
	for (let i = 0; i < selector.length; i++) {
		const code = selector.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
		} else if (quote !== 0) {
			if (code === quote) quote = 0;
		} else if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
		} else if (code === CC_AMPERSAND) {
			return true;
		}
	}
	return false;
};

/**
 * The prelude a rule nested in one written `parent` says on its own, with every
 * `&` written out and a selector naming none made the descendant it means.
 * @param {string} prelude the nested rule's printed prelude
 * @param {string} parent the enclosing rule's printed prelude
 * @returns {string} the prelude the rule says standing on its own
 */
const _resolveNestedPrelude = (prelude, parent) => {
	// `&` is the parent selector list, which is what `:is()` of it matches — and
	// one compound stands for itself, `:is()` around it saying no more.
	const reference = _isCompoundSelector(parent) ? parent : `:is(${parent})`;
	const written = _splitSelectorList(prelude);
	for (let i = 0; i < written.length; i++) {
		const one = written[i].trim();
		if (_namesParent(one)) {
			written[i] = _substituteAmpersand(one, reference);
			continue;
		}
		// A selector opening on a combinator is parted from the parent by that
		// combinator, and the printer writes those tight — so a space in front of
		// one is a space a second pass takes off. `||` is not one of them.
		const combinator = _COMBINATOR_CODES.has(one.charCodeAt(0));
		// An empty selector — an invalid list the printer keeps — has no descendant
		// to part from the parent, so no space goes in front of it.
		written[i] =
			combinator || one.length === 0 ? reference + one : `${reference} ${one}`;
	}
	const list = written.join(",");
	// Ordered on what is written, not on what was: the list was canonical as the
	// nested rule spelled it, and writing the parent in front of each decides
	// the order. One selector is already the order it reads in.
	return written.length === 1 ? list : _canonicalSelectorList(list);
};

// Whether the run `_writeNested` built took in the rule the hoist emptied,
// which is the caller's to write and so the caller's to leave out.
let _nestedTookParent = false;
// Each rule the run wrote, with its prelude's length. Read out of band, so a
// caller can say what its text is: rules the ones around them may join onto.
/** @type {{ text: string, prelude: number }[]} */
let _nestedRuns = [];

/**
 * Whether a block's declarations all stand before its rules, so taking the
 * rules out of it leaves the cascade as it was.
 *
 * A declaration written after a nested rule is read after it, and a rule the
 * parent's own selector matches would win against it once hoisted — so a block
 * that interleaves them keeps the nesting it was written with.
 * @param {CssPath} path the walk's accessors
 * @param {Node} rule the enclosing rule
 * @returns {boolean} true when no declaration follows a rule
 */
const _declarationsPrecedeRules = (path, rule) => {
	const decls = path.declarations(rule);
	if (decls === null || decls.length === 0) return true;
	// The rule asking holds this one, so the list it is in is never empty.
	const rules = /** @type {Rule[]} */ (path.childRules(rule));
	let lastDecl = -1;
	for (let i = 0; i < decls.length; i++) {
		const at = path.start(decls[i]);
		if (at > lastDecl) lastDecl = at;
	}
	/** @type {Rule[] | null} */
	let before = null;
	for (let i = 0; i < rules.length; i++) {
		if (path.start(rules[i]) > lastDecl) continue;
		if (before === null) before = [];
		before.push(rules[i]);
	}
	if (before === null) return true;
	// A rule an identical later sibling restates is dropped as dead, so it parts
	// nothing: judged on the source, as the drop itself is decided after this.
	if (!_S._transforms.removeDeadRules) return false;
	for (const early of before) {
		const text = path.source(early);
		let restated = false;
		for (let i = 0; i < rules.length; i++) {
			const other = rules[i];
			if (path.start(other) > lastDecl && path.source(other) === text) {
				restated = true;
				break;
			}
		}
		if (!restated) return false;
	}
	return true;
};

/**
 * Whether a rule holds rules of its own, which a prefix copy could not carry:
 * each was resolved against the prelude it was written under, and a copy is
 * written under another.
 * @param {Node} node the rule
 * @returns {boolean} true when a rule is still waiting to be written in it
 */
const _holdsNested = (node) => {
	for (let i = 0; i < _pendingNested.length; i++) {
		if (_pendingNested[i].owner === node) return true;
	}
	return false;
};

/**
 * The rules written in one rule, taken out of it: each drained entry's prelude
 * is written against `prelude`, and where the rule is itself one written in
 * another they go back on the list for that one to write instead.
 * @param {CssPath} path the walk's accessors
 * @param {Node} node the rule itself, which is what its own entries name
 * @param {string} prelude the rule's printed prelude
 * @param {string | null} rest the rule's own block, or null where it writes none
 * @param {boolean} hoistable false where the rule is several rules with preludes of their own, which stay where they were written
 * @param {readonly string[]=} copies the preludes a prefix copy wrote it as, each carrying this rule's own block
 * @returns {string | null} the text to write after the rule, or null when the rule goes on the list itself
 */
const _writeNested = (path, node, prelude, rest, hoistable, copies) => {
	// Only what was written in this rule: the walk is post-order, so an earlier
	// sibling's rules are on the list too, waiting for the parent they share.
	/** @type {{ prelude: string, rest: string, owner: Node | null, apart?: boolean }[]} */
	const taken = [];
	for (let i = _pendingNested.length - 1; i >= 0; i--) {
		if (_pendingNested[i].owner !== node) continue;
		const one = _pendingNested[i];
		_pendingNested.splice(i, 1);
		one.prelude = _resolveNestedPrelude(one.prelude, prelude);
		taken.unshift(one);
	}
	const hoisted = hoistable && _hoistedOutOf(path, path.parent);
	const owner = hoisted ? path.parent : null;
	if (hoisted) {
		// A prefix copy wrote this rule under a prelude of its own, carrying the
		// same block — so each goes out against the parent, in the order they were
		// written, rather than the whole group staying nested.
		if (rest !== null && copies !== undefined) {
			for (const copy of copies) {
				_pendingNested.push({ prelude: copy, rest, owner, apart: true });
			}
		}
		if (rest !== null) {
			_pendingNested.push({
				prelude,
				rest,
				owner,
				apart: copies !== undefined
			});
		}
		for (let i = 0; i < taken.length; i++) {
			taken[i].owner = owner;
			_pendingNested.push(taken[i]);
		}
		return null;
	}
	// Hoisting writes these out as text, so the sibling merge never reads them —
	// two nested rules printing one block would stay two until a second pass.
	// They are neighbors here and nowhere else, so the run is joined here.
	let out = "";
	_nestedRuns = [];
	/** @type {{ prelude: string, rest: string, joined: boolean } | null} */
	let held = null;
	// The rule the hoist emptied stands right in front of the run and may print
	// the same block, so it is offered the join first. Read out of band, the
	// caller writing that rule rather than this.
	_nestedTookParent =
		rest !== null && taken.length !== 0 && taken[0].rest === rest;
	if (rest !== null && _nestedTookParent) {
		held = { prelude, rest, joined: false };
	}
	for (let i = 0; i < taken.length; i++) {
		const one = taken[i];
		// A prefix copy is written as a rule of its own, since one selector an
		// engine cannot read takes the whole list with it — so a list is not what
		// these may be joined into.
		if (one.apart === true) {
			if (held !== null) out += _flushRun(held);
			held = null;
			out += _flushRun({ prelude: one.prelude, rest: one.rest, joined: false });
			continue;
		}
		if (held !== null && held.rest === one.rest) {
			// Concatenated, like every other join: the list is ordered once, below,
			// where the run that grew it ends.
			held.prelude += `,${one.prelude}`;
			held.joined = true;
			continue;
		}
		if (held !== null) out += _flushRun(held);
		held = { prelude: one.prelude, rest: one.rest, joined: false };
	}
	if (held !== null) out += _flushRun(held);
	return out;
};

/**
 * Write one run out, counting it and taking down where the first one's block
 * begins.
 * @param {{ prelude: string, rest: string, joined: boolean }} run what the join left
 * @returns {string} the rule
 */
const _flushRun = (run) => {
	const prelude = _settledPrelude(run);
	const text = prelude + run.rest;
	_nestedRuns.push({ text, prelude: prelude.length });
	return text;
};

/**
 * A rule a hoist wrote, as an entry the merge can join others onto.
 * @param {string} text the rule
 * @param {number} prelude its prelude's length
 * @returns {RuleEntry} its entry
 */
const _hoistedEntry = (text, prelude) => ({
	text,
	prelude,
	atRule: false,
	// A block holding an at-rule the hoist left in place is not one another's
	// declarations may follow without crossing it.
	plain: !text.includes("{", prelude + 1),
	listable: LIST_UNKNOWN,
	listKind: LIST_KIND_SELECTOR,
	children: null,
	head: "",
	unordered: false
});

/**
 * Record what a hoisted run wrote: one rule is an entry of its own, and several
 * are an entry each, so the rules around them may join onto any of them.
 * @param {string} text what the run wrote
 * @param {string | null} parent the emptied rule's own text written in front of it, if any
 * @param {number} parentPrelude that rule's prelude length
 * @returns {void}
 */
const _recordHoistedRule = (text, parent, parentPrelude) => {
	const node = /** @type {Node} */ (_S._currentNode);
	if (parent === null && _nestedRuns.length === 1) {
		_setRuleEntry(node, _hoistedEntry(text, _nestedRuns[0].prelude));
		return;
	}
	/** @type {RuleEntry[]} */
	const runs = [];
	if (parent !== null) runs.push(_hoistedEntry(parent, parentPrelude));
	for (let i = 0; i < _nestedRuns.length; i++) {
		runs.push(_hoistedEntry(_nestedRuns[i].text, _nestedRuns[i].prelude));
	}
	_setHoistedRuns(node, runs);
};

/**
 * A joined run's selector list, canonical. A run that joined nothing is written
 * as it stands, so a rule the hoist only moved pays no read of its own list.
 * @param {{ prelude: string, rest: string, joined: boolean }} run what the join left
 * @returns {string} the list to write
 */
const _settledPrelude = (run) =>
	run.joined ? _canonicalSelectorList(run.prelude) : run.prelude;

/**
 * Whether a rule's nested rules are taken out of it and written on their own.
 * @param {CssPath} path the walk's accessors
 * @param {Node | null} parent the rule this one is written in, if any
 * @returns {boolean} true when this rule is one of them
 */
const _hoistedOutOf = (path, parent) =>
	_S._loweringNesting &&
	parent !== null &&
	// An at-rule is what the rules in it are written under, so taking it out of
	// the rule it stands in would take them out of its query as well.
	path.type() === T_QUALIFIED_RULE &&
	path.type(parent) === T_QUALIFIED_RULE &&
	_declarationsPrecedeRules(path, parent);

// `@custom-media --name <query>`, as printed: the name it states and the query.
const _CUSTOM_MEDIA_RE = /^@[^\s]+\s+(--[^\s]+)\s+([^]+)$/;

/**
 * Take down what a `@custom-media` prelude names, so a condition asking for it
 * is written as the query instead. False where the prelude states no query.
 * @param {string} prelude the rule's printed prelude
 * @returns {boolean} true when the name was taken down
 */
const _takeCustomMedia = (prelude) => {
	const found = _CUSTOM_MEDIA_RE.exec(prelude);
	if (found === null) return false;
	_customMedia.set(found[1], found[2]);
	return true;
};

// `@custom-selector :--name <selector-list>`, as printed: the name and the list.
const _CUSTOM_SELECTOR_RE = /^@[^\s]+\s+:(--[^\s]+)\s+([^]+)$/;

/**
 * Take down what a `@custom-selector` prelude names, so a selector asking for it
 * is written as the list instead. False where the prelude states no list.
 * @param {string} prelude the rule's printed prelude
 * @returns {boolean} true when the name was taken down
 */
const _takeCustomSelector = (prelude) => {
	const found = _CUSTOM_SELECTOR_RE.exec(prelude);
	if (found === null) return false;
	_customSelectors.set(found[1], found[2]);
	return true;
};

// The `An+B` microsyntax (CSS Syntax 3 §6), whose whitespace and `+` are its
// own: `2n + 1`, `+3` and `2N+1` all say what a shorter spelling does.
const _NTH_RE =
	/^\s*(?:([+-]?)\s*(\d*)[nN]\s*(?:([+-])\s*(\d+))?|([+-]?)\s*(\d+))\s*$/;

/**
 * Write one `An+B` in its shortest equal spelling.
 * @param {string} text the argument between the parentheses
 * @returns {string | null} the shortest spelling, or null when it is not `An+B`
 */
const _minifyNth = (text) => {
	const lower = text.trim().toLowerCase();
	let a;
	let b;
	if (lower === "even") {
		a = 2;
		b = 0;
	} else if (lower === "odd") {
		a = 2;
		b = 1;
	} else {
		const parts = _NTH_RE.exec(text);
		if (parts === null) return null;
		if (parts[6] !== undefined) {
			a = 0;
			b = Number(`${parts[5] === "-" ? "-" : ""}${parts[6]}`);
		} else {
			a = Number(
				`${parts[1] === "-" ? "-" : ""}${parts[2] === "" ? "1" : parts[2]}`
			);
			b = parts[4] === undefined ? 0 : Number(`${parts[3]}${parts[4]}`);
		}
	}
	// Past the safe range a rewrite would print a different integer than it read.
	if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return null;
	if (a === 0) return String(b);
	// A step forward only ever reaches `B` again from below, and an index under 1
	// matches nothing — so those terms are dropped by naming the first real one.
	// Landing on the step itself is the bare `An`, which starts there anyway.
	if (a > 0) {
		if (b < 1) b = ((((b - 1) % a) + a) % a) + 1;
		if (b === a) b = 0;
	}
	// The one An+B a keyword names in fewer bytes.
	if (a === 2 && b === 1) return "odd";
	const step = `${a === 1 ? "" : a === -1 ? "-" : a}n`;
	return b === 0 ? step : `${step}${b > 0 ? "+" : "-"}${Math.abs(b)}`;
};

// One `urange` (CSS Syntax 3 §11.2): `U+` then hex digits, then either a `-`
// and a second run or trailing `?` wildcards. Case is insignificant.
const _URANGE_RE =
	/^u\+(?:([\da-f]{0,6})(\?{1,6})|([\da-f]{1,6})(?:-([\da-f]{1,6}))?)$/i;

/**
 * Write one `urange` in its shortest equal spelling: leading zeros carry
 * nothing, and a range whose start is a prefix followed by zeros and whose end
 * is that prefix followed by `f`s is what the `?` wildcard says.
 * @param {string} range one urange token
 * @returns {string} the shortest spelling, or `range` when nothing is shorter
 */
const _minifyUnicodeRange = (range) => {
	if (!_S._transforms.shortenNumbers) return range;
	const parts = _URANGE_RE.exec(range);
	if (parts === null) return range;
	/** @type {(hex: string) => string} */
	const strip = (hex) => hex.replace(/^0+(?=.)/, "");
	// `U+00??` covers what `U+??` does — the zeros are as leading as any other.
	if (parts[2] !== undefined) {
		const head = parts[1].replace(/^0+/, "");
		const out = `U+${head}${parts[2]}`;
		return out.length < range.length ? out : range;
	}
	const start = strip(parts[3]);
	if (parts[4] === undefined) {
		const out = `U+${start}`;
		return out.length < range.length ? out : range;
	}
	const end = strip(parts[4]);
	let best = `U+${start}-${end}`;
	// The wildcard needs both bounds the same width to compare digit by digit.
	if (start.length <= end.length) {
		const padded = start.padStart(end.length, "0");
		let wild = 0;
		while (
			wild < padded.length &&
			padded.charAt(padded.length - 1 - wild) === "0" &&
			end.charAt(end.length - 1 - wild).toLowerCase() === "f"
		) {
			wild++;
		}
		while (wild > 0) {
			const head = padded.slice(0, padded.length - wild);
			// `equalsLowerCase` lowercases only its first argument.
			if (
				equalsLowerCase(head, end.slice(0, end.length - wild).toLowerCase())
			) {
				const out = `U+${head.replace(/^0+/, "")}${"?".repeat(wild)}`;
				if (out.length < best.length) best = out;
				break;
			}
			wild--;
		}
	}
	return best.length < range.length ? best : range;
};

// Media Queries 4 §2.4: `min-`/`max-` prefixes exist only on range-type media
// features, and `min-X: Y` is exactly `X >= Y`. The range spelling is the newer
// one, so it is only reached for where the target reads it.
const _RANGE_PREFIX_RE = /^(min|max)-(.+)$/i;

/**
 * Rewrite a media feature's `min-` / `max-` prefix to the range spelling, in the
 * printed parts, in place. Only a whole `(<feature>:<value>)` — a condition made
 * of anything else (a boolean feature, an `and` chain, a nested block) is left
 * for its own parts to handle.
 * @param {string[]} parts the block's printed parts
 * @returns {void}
 */
const _useRangeSpelling = (parts) => {
	if (!_S._transforms.shortenMediaQueries) return;
	// The separators go with the join's condition trim, so a spaced
	// `( min-width : 1px )` is the same feature as a tight one.
	/** @type {number[]} */
	const filled = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length !== 0 && parts[i] !== _SEP) filled.push(i);
	}
	if (filled.length < 3 || parts[filled[1]] !== ":") return;
	const feature = _RANGE_PREFIX_RE.exec(parts[filled[0]]);
	if (feature === null) return;
	parts[filled[0]] = feature[2];
	parts[filled[1]] = feature[1].toLowerCase() === "min" ? ">=" : "<=";
};

/**
 * Split top-level components into the layers a comma parts. A comma is no
 * separator of its own, so it rides on the component it follows and a layer's
 * last component has to be cut back out of it.
 * @param {string[]} components the value's top-level components
 * @returns {string[][]} one entry per layer, each its own component list
 */
const _valueLayers = (components) => {
	/** @type {string[][]} */
	const layers = [];
	/** @type {string[]} */
	let current = [];
	for (const component of components) {
		let depth = 0;
		let start = 0;
		for (let i = 0; i < component.length; i++) {
			const character = component[i];
			if (character === "(") {
				depth++;
			} else if (character === ")") {
				depth--;
			} else if (character === "," && depth === 0) {
				if (i > start) current.push(component.slice(start, i));
				layers.push(current);
				current = [];
				start = i + 1;
			}
		}
		if (start < component.length) current.push(component.slice(start));
	}
	layers.push(current);
	return layers;
};

/**
 * @param {string[]} a one component list
 * @param {string[]} b another component list
 * @returns {boolean} whether they are the same components in the same order
 */
const _sameComponents = (a, b) =>
	a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * Turn components back into fragments: a separator between each pair, except
 * around the `/`, which needs none.
 * @param {string[]} components components in order
 * @returns {string[]} the fragments to join
 */
const _spaced = (components) => {
	/** @type {string[]} */
	const parts = [];
	for (const component of components) {
		if (
			parts.length !== 0 &&
			component !== "/" &&
			parts[parts.length - 1] !== "/"
		) {
			parts.push(_SEP);
		}
		parts.push(component);
	}
	return parts;
};

/**
 * Collapse a `{1,4}` box-notation value (see `BOX_SHORTHANDS`). `border-radius`
 * carries two boxes — `<horizontal> / <vertical>` — which collapse independently,
 * and a vertical box equal to the horizontal one is what the `/`-less form
 * already means.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {string} property the declaration's lowercased property name
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const _collapseBoxShorthand = (path, property, node, writer) => {
	const components = _valueComponents(path, node, writer);
	const slash = components.indexOf("/");
	if (slash === -1) {
		const box = _collapseBox(components);
		return box === null || box.length === components.length
			? null
			: _spaced(box);
	}
	// Only `border-radius` takes a second box. On the others a `/` is invalid, so
	// the browser already drops the declaration — collapsing it would switch it on.
	if (!SLASH_BOX_SHORTHANDS.has(property)) return null;
	if (components.lastIndexOf("/") !== slash) return null;
	const horizontal = _collapseBox(components.slice(0, slash));
	const vertical = _collapseBox(components.slice(slash + 1));
	if (horizontal === null || vertical === null) return null;
	// Rebuilt even when neither box collapsed: the `/` is a delim token, so the
	// whitespace around it is insignificant either way.
	return _spaced(
		_sameComponents(horizontal, vertical)
			? horizontal
			: [...horizontal, "/", ...vertical]
	);
};

/**
 * Rewrite a `flex` value to its keyword spelling where one exists.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const _collapseFlexShorthand = (path, node, writer) =>
	_shortestFlexValue(_valueComponents(path, node, writer));

/**
 * Rewrite a `font-weight` keyword to the number it is defined as. Only the
 * longhand (and the `@font-face` descriptor, where the keywords mean the same):
 * inside the `font` shorthand a `normal` may be the style or the variant
 * instead, and the shorthand's own grammar decides which.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const _collapseFontWeight = (path, node, writer) => {
	const count = path.childCount(node);
	let only = "";
	for (let at = 0; at < count; at++) {
		const text = writer.get(path.childAt(node, at));
		if (text.length === 0) continue;
		// A second component is a value this rewrite is not defined for.
		if (only.length !== 0) return null;
		only = text;
	}
	if (only.length === 0) return null;
	const number = FONT_WEIGHT_NUMBERS.get(only.toLowerCase());
	return number === undefined ? null : [number];
};

// The slots of one `<single-transition>`, told apart by what each can spell.
const _TRANSITION_TIME_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:s|ms)$/i;
const _TRANSITION_EASING_FUNCTION_RE = /^(?:cubic-bezier|steps|linear)\(/i;

/**
 * Write one `transition` in the order its grammar lists the slots. `||` makes
 * them order-free, so the same declaration has many spellings and one of them
 * repeats across a stylesheet. The two `<time>`s stay in the order they were
 * written — the first is the duration and the second the delay.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _orderTransitionSlots = (components) => {
	if (components.length < 2) return null;
	const times = [];
	const easings = [];
	const behaviors = [];
	const names = [];
	for (const one of components) {
		const lowered = toLowerCaseIfNeeded(one);
		if (_TRANSITION_TIME_RE.test(one)) {
			times.push(one);
		} else if (
			EASING_KEYWORDS.has(lowered) ||
			_TRANSITION_EASING_FUNCTION_RE.test(one)
		) {
			easings.push(one);
		} else if (TRANSITION_BEHAVIORS.has(lowered)) {
			behaviors.push(one);
		} else if (_PLAIN_IDENT_RE.test(one)) {
			names.push(one);
		} else {
			return null;
		}
	}
	// An easing keyword is a valid property name too, so a value with no name of
	// its own leaves which slot it fills to the engine — that one is left alone.
	if (names.length !== 1 || times.length > 2 || easings.length > 1) return null;
	if (behaviors.length > 1) return null;
	// `all` is the property a layer naming none transitions, so writing it is
	// spare — as long as something else is left to keep the layer from emptying.
	const named =
		toLowerCaseIfNeeded(names[0]) === "all" && components.length > 1
			? []
			: names;
	const ordered = [...named, ...times, ...easings, ...behaviors];
	if (ordered.length === 0) return null;
	return ordered.join(" ") === components.join(" ") ? null : ordered;
};

/**
 * Drop the trailing zero lengths a shadow's notation already implies. A shadow
 * states its offsets as one run of lengths, and the ones past the count the
 * grammar makes mandatory default to zero — so a trailing `0` says nothing.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropShadowZeroLengths = (property, components) => {
	const minimum = SHADOW_PROPERTIES.get(property);
	if (minimum === undefined) return null;
	// A quoted string could carry the comma the layer split reads.
	for (const component of components) {
		if (component.includes('"') || component.includes("'")) return null;
	}
	const layers = _valueLayers(components);
	/** @type {string[]} */
	const out = [];
	let changed = false;
	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (layer.length === 0) return null;
		let end = layer.length;
		while (end > 0 && !_NUMERIC_RE.test(layer[end - 1])) end--;
		let start = end;
		while (start > 0 && _NUMERIC_RE.test(layer[start - 1])) start--;
		let last = end;
		// The components are as authored — the zero-unit drop prints later — so a
		// trailing zero is `0px` as often as `0`.
		while (last - start > minimum && _isZeroLength(layer[last - 1])) {
			last--;
			changed = true;
		}
		const kept = [...layer.slice(0, last), ...layer.slice(end)];
		const final = layers.length - 1;
		for (let j = 0; j < kept.length; j++) {
			out.push(j === kept.length - 1 && i !== final ? `${kept[j]},` : kept[j]);
		}
	}
	return changed ? out : null;
};

/**
 * Shorten every `<single-transition>` in a `transition`. Each layer is its own
 * set of slots, so both the initial-keyword drop and the slot order run per
 * layer rather than over the whole flat list.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapseTransitionLayers = (property, components) => {
	// A quoted string could carry a comma the layer split would part.
	for (const component of components) {
		if (component.includes('"') || component.includes("'")) return null;
	}
	const layers = _valueLayers(components);
	/** @type {string[]} */
	const out = [];
	let changed = false;
	for (let i = 0; i < layers.length; i++) {
		let layer = layers[i];
		if (layer.length === 0) return null;
		const layered = _dropLayerInitials(property, layer);
		const dropped = _dropInitialKeywords(property, layered || layer) || layered;
		if (dropped !== null) {
			layer = dropped;
			changed = true;
		}
		const timed = _dropZeroTimes(layer);
		if (timed !== null) {
			layer = timed;
			changed = true;
		}
		const ordered = _orderTransitionSlots(layer);
		if (ordered !== null) {
			layer = ordered;
			changed = true;
		}
		const last = layers.length - 1;
		for (let j = 0; j < layer.length; j++) {
			out.push(
				j === layer.length - 1 && i !== last ? `${layer[j]},` : layer[j]
			);
		}
	}
	return changed ? out : null;
};

/**
 * Shorten every `<single-animation>` in an `animation`, the way a transition's
 * layers are shortened — the same two `<time>` slots and the same per-layer
 * reading. The slots are not reordered: which of them a keyword fills is a
 * question the order answers, `none` naming both an animation and a fill mode.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapseAnimationLayers = (components) => {
	// A quoted string could carry a comma the layer split would part; an
	// animation's name is one a stylesheet may write.
	for (const component of components) {
		if (component.includes('"') || component.includes("'")) return null;
	}
	const layers = _valueLayers(components);
	/** @type {string[]} */
	const out = [];
	let changed = false;
	for (let i = 0; i < layers.length; i++) {
		let layer = layers[i];
		if (layer.length === 0) return null;
		for (const drop of [
			_dropInitialKeywords,
			_dropZeroTimes,
			_dropSingleCount
		]) {
			const kept =
				drop === _dropInitialKeywords
					? _dropInitialKeywords("animation", layer)
					: /** @type {(one: string[]) => string[] | null} */ (drop)(layer);
			if (kept !== null) {
				layer = kept;
				changed = true;
			}
		}
		const last = layers.length - 1;
		for (let j = 0; j < layer.length; j++) {
			out.push(
				j === layer.length - 1 && i !== last ? `${layer[j]},` : layer[j]
			);
		}
	}
	return changed ? out : null;
};

// A `font` component that is the size slot also carries a number.
const _CARRIES_DIGIT_RE = /\d/;

/**
 * Write the `font` shorthand's weight as the number naming it. The slots before
 * `<font-size>` are the style / variant / weight / width ones, and the family
 * only ever follows the size — so a `bold` with a size after it is the weight,
 * while `font: 12px bold` names a family and keeps the word.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _numberFontShorthandWeight = (components) => {
	const size = components.findIndex(
		(one) =>
			_CARRIES_DIGIT_RE.test(one) ||
			FONT_SIZE_KEYWORDS.has(toLowerCaseIfNeeded(one))
	);
	if (size <= 0) return null;
	let changed = false;
	const out = components.map((one, index) => {
		if (index < size && equalsLowerCase(one, "bold")) {
			changed = true;
			return "700";
		}
		return one;
	});
	return changed ? out : null;
};

// A component that is exactly zero, whatever unit the zero-unit drop left it in.
const _ZERO_COMPONENT_RE = /^[+-]?0(?:\.0*)?$/;

// Zero written bare or as a percentage — a percentage of any size is nothing.
const _ZERO_OR_PERCENTAGE_RE = /^[+-]?0(?:\.0*)?%?$/;

const _ONE_COMPONENT_RE = /^\+?1(?:\.0*)?$/;

/**
 * @param {string} value a printed component
 * @returns {boolean} whether it is the number one
 */
const _isOne = (value) => _ONE_COMPONENT_RE.test(value);

// A value that is one percentage and nothing else.
const _LONE_PERCENTAGE_RE = /^([+-]?)(\d*)(?:\.(\d*))?%$/;

/**
 * Write an `<alpha-value>` percentage as the number naming the same quantity:
 * the decimal point moved two places, which is exact where dividing is not.
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, or the shorter number
 */
const _numberAlphaValue = (property, value) => {
	if (!_S._transforms.shortenNumbers) return value;
	if (!ALPHA_VALUE_PROPERTIES.has(property)) return value;
	const parts = _LONE_PERCENTAGE_RE.exec(value);
	if (parts === null) return value;
	const digits = `00${parts[2]}`;
	const shifted = _normalizeNumber(
		`${parts[1]}${digits.slice(0, -2)}.${digits.slice(-2)}${parts[3] || ""}`
	);
	return shifted.length < value.length ? shifted : value;
};

// A ratio whose denominator is the `1` an omitted one means, taken as a whole
// component so the `1` of `2/10` is no match.
const _RATIO_OVER_ONE_RE = /(^|\s)((?:\d+\.?\d*|\.\d+))\s*\/\s*1(?=$|\s)/g;

/**
 * Drop a `<ratio>`'s denominator where it is the 1 an omitted one means.
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, its `/1` dropped
 */
const _dropRatioDenominator = (property, value) => {
	if (!_S._transforms.shortenNumbers) return value;
	// A substitution could expand to a number of its own, turning the `1` into
	// the denominator of a ratio this does not see.
	if (!RATIO_PROPERTIES.has(property) || _hasSubstitution(value)) {
		return value;
	}
	return value.replace(_RATIO_OVER_ONE_RE, "$1$2");
};

/**
 * Drop a layer's second value where the one-value form already means it.
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, shortened where it says nothing
 */
const _dropDefaultSecondValue = (property, value) => {
	if (!_S._transforms.shortenValues) return value;
	if (!AUTO_SECOND_VALUE_PROPERTIES.has(property)) return value;
	// With `--x:1px 2px` the `auto` is a third value, so dropping it would turn a
	// declaration the engine discards into one it keeps.
	if (_hasSubstitution(value)) return value;
	let changed = false;
	const layers = _splitTopLevelArguments(value).map((layer) => {
		const parts = _splitTopLevelSpaces(layer.trim());
		if (parts.length !== 2 || !equalsLowerCase(parts[1], "auto")) return layer;
		// Each of these stands alone, so the second value makes a declaration the
		// engine drops — one a later declaration was written to beat.
		const first = toLowerCaseIfNeeded(parts[0]);
		if (
			first === "cover" ||
			first === "contain" ||
			CSS_WIDE_KEYWORDS.has(first)
		) {
			return layer;
		}
		changed = true;
		return parts[0];
	});
	return changed ? layers.join(",") : value;
};

/**
 * Reduce a transform function until it stops getting shorter: one reduction
 * uncovers the next, `translate3d(x,0,0)` leaving the `translate(x,0)` that is
 * `translate(x)`.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the shortest call, or null to keep the function
 */
const _reduceTransformFunctionDeep = (fn, inner) => {
	let out = _reduceTransformFunction(fn, inner);
	if (out === null) return null;
	// Fed back as the name and arguments it was built from, rather than printed
	// and matched apart again — the reduction already hands back both.
	for (;;) {
		const next = _reduceTransformFunction(out[0], out[1]);
		if (next === null) {
			// Written the way the same call written by hand is: the shorter name
			// may carry a zero its own grammar lets go bare.
			const args = _S._transforms.shortenNumbers
				? _dropCallZeroUnit(toLowerCaseIfNeeded(out[0]), out[1])
				: out[1];
			return `${out[0]}(${args})`;
		}
		out = next;
	}
};

// A component that is zero however it is spelled.
/** @type {(arg: string) => boolean} */
const _isZeroComponent = (arg) => _ZERO_COMPONENT_RE.test(arg);

// A translation's components are `<length-percentage>`, where a zero of either
// kind is the same no-op — a percentage resolves against the element's own size.
/** @type {(arg: string) => boolean} */
const _isZeroOffset = (arg) =>
	_ZERO_OR_PERCENTAGE_RE.test(arg) || _ZERO_LENGTH_RE.test(arg);

// A translation's z is a `<length>` alone, so a percentage is invalid there and
// dropping it would revive a declaration the engine throws away.
/** @type {(arg: string) => boolean} */
const _isZeroLength = (arg) =>
	_ZERO_COMPONENT_RE.test(arg) || _ZERO_LENGTH_RE.test(arg);

// The slots a 3D matrix holds to be the 2D one it names, as slot and value.
const _MATRIX3D_IDENTITY_2D = [
	2, 0, 3, 0, 6, 0, 7, 0, 8, 0, 9, 0, 11, 0, 14, 0, 10, 1, 15, 1
];

// The slots a 3D matrix that is only a translation or a scale leaves empty:
// everything off the diagonal and off the fourth column, as slot and value.
const _MATRIX3D_DIAGONAL_ONLY = [
	1, 0, 2, 0, 3, 0, 4, 0, 6, 0, 7, 0, 8, 0, 9, 0, 11, 0, 15, 1
];

// A `matrix()` / `matrix3d()` argument is a `<number>` (CSS Transforms 2 §8), so
// anything carrying a unit is no matrix to read.
const _MATRIX_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * A matrix's arguments as numbers, or null when they are not `count` numbers.
 * @param {string[]} args the printed arguments
 * @param {number} count how many the function takes
 * @returns {number[] | null} the numbers, or null
 */
const _matrixNumbers = (args, count) => {
	if (args.length !== count) return null;
	/** @type {number[]} */
	const out = [];
	for (const one of args) {
		if (!_MATRIX_NUMBER_RE.test(one)) return null;
		out.push(Number(one));
	}
	return out;
};

/**
 * Whether every named slot of a matrix holds the value the pattern gives it.
 * @param {number[]} matrix the matrix's numbers
 * @param {number[]} pattern slot and value, in pairs
 * @returns {boolean} true when all of them match
 */
const _matrixSlotsAre = (matrix, pattern) => {
	for (let i = 0; i < pattern.length; i += 2) {
		if (matrix[pattern[i]] !== pattern[i + 1]) return false;
	}
	return true;
};

/**
 * A matrix's translation slot as the length it means: the numbers a matrix
 * carries are `px`, and a zero needs no unit.
 * @param {string} written the slot as printed
 * @param {number} value its value
 * @returns {string} the length
 */
const _matrixOffset = (written, value) => (value === 0 ? "0" : `${written}px`);

// Each transform function that names a shorter one, and how. A name absent here
// reduces to nothing, which is what lets the caller ask before parting arguments.
/** @type {Map<string, (args: string[]) => [string, string] | null>} */
const _TRANSFORM_REDUCERS = new Map([
	[
		// A matrix says in six numbers what a named function says in one or two,
		// and every shape read here is exact — a rotation is only rational at a
		// quarter turn, so no other angle is taken back out of one.
		"matrix",
		(args) => {
			const matrix = _matrixNumbers(args, 6);
			if (matrix === null) return null;
			if (_matrixSlotsAre(matrix, [1, 0, 2, 0, 4, 0, 5, 0])) {
				return ["scale", `${args[0]},${args[3]}`];
			}
			if (_matrixSlotsAre(matrix, [0, 1, 1, 0, 2, 0, 3, 1])) {
				return [
					"translate",
					`${_matrixOffset(args[4], matrix[4])},${_matrixOffset(
						args[5],
						matrix[5]
					)}`
				];
			}
			if (_matrixSlotsAre(matrix, [0, 0, 3, 0, 4, 0, 5, 0])) {
				if (matrix[1] === 1 && matrix[2] === -1) return ["rotate", "90deg"];
				if (matrix[1] === -1 && matrix[2] === 1) return ["rotate", "270deg"];
			}
			return null;
		}
	],
	[
		"translate",
		(args) => {
			if (args.length !== 2) return null;
			if (_isZeroOffset(args[1])) return ["translate", args[0]];
			if (_isZeroOffset(args[0])) return ["translateY", args[1]];
			return null;
		}
	],
	[
		"translate3d",
		(args) => {
			if (args.length !== 3) return null;
			if (_isZeroOffset(args[0]) && _isZeroOffset(args[1])) {
				return ["translateZ", args[2]];
			}
			if (_isZeroLength(args[2])) return ["translate", `${args[0]},${args[1]}`];
			return null;
		}
	],
	[
		// `scale(x, x)` is `scale(x)` — the second factor defaults to the first.
		"scale",
		(args) => {
			if (args.length !== 2) return null;
			if (args[0] === args[1]) return ["scale", args[0]];
			// A factor of 1 scales nothing along its axis, leaving the other axis's
			// own function.
			if (_isOne(args[1])) return ["scaleX", args[0]];
			if (_isOne(args[0])) return ["scaleY", args[1]];
			return null;
		}
	],
	[
		"scale3d",
		(args) => {
			if (args.length !== 3) return null;
			// A z factor of 1 scales nothing along it, leaving the 2D scale.
			if (_isOne(args[2])) return ["scale", `${args[0]},${args[1]}`];
			// ...and a 2D pair of 1 leaves the z scale alone.
			if (_isOne(args[0]) && _isOne(args[1])) return ["scaleZ", args[2]];
			return null;
		}
	],
	[
		"matrix3d",
		(args) => {
			const matrix = _matrixNumbers(args, 16);
			if (matrix === null) return null;
			// CSS Transforms 2 §12: a 3D matrix whose third row and column are the
			// identity's is the 2D matrix of the six values it leaves.
			if (_matrixSlotsAre(matrix, _MATRIX3D_IDENTITY_2D)) {
				return [
					"matrix",
					`${args[0]},${args[1]},${args[4]},${args[5]},${args[12]},${args[13]}`
				];
			}
			// ...and one that leaves no 2D matrix may still be a translation or a
			// scale alone. Column-major, so the fourth column translates and the
			// diagonal scales — nothing off either is a shear or a rotation.
			if (!_matrixSlotsAre(matrix, _MATRIX3D_DIAGONAL_ONLY)) return null;
			if (_matrixSlotsAre(matrix, [0, 1, 5, 1, 10, 1])) {
				return [
					"translate3d",
					`${_matrixOffset(args[12], matrix[12])},${_matrixOffset(
						args[13],
						matrix[13]
					)},${_matrixOffset(args[14], matrix[14])}`
				];
			}
			if (_matrixSlotsAre(matrix, [12, 0, 13, 0, 14, 0])) {
				return ["scale3d", `${args[0]},${args[5]},${args[10]}`];
			}
			return null;
		}
	],
	[
		// CSS Transforms 2 §13.1: `rotateZ(a)` names the rotation `rotate(a)` does.
		"rotatez",
		(args) => (args.length === 1 ? ["rotate", args[0]] : null)
	],
	[
		"rotate3d",
		(args) => {
			if (args.length !== 4) return null;
			// The engine normalizes the axis, so a scaled component still names it
			// but a negative one turns the rotation the other way.
			const axis =
				_isZeroComponent(args[1]) &&
				_isZeroComponent(args[2]) &&
				_isOne(args[0])
					? "rotateX"
					: _isZeroComponent(args[0]) &&
						  _isZeroComponent(args[2]) &&
						  _isOne(args[1])
						? "rotateY"
						: _isZeroComponent(args[0]) &&
							  _isZeroComponent(args[1]) &&
							  _isOne(args[2])
							? "rotate"
							: null;
			return axis === null ? null : [axis, args[3]];
		}
	]
]);

/**
 * Reduce a transform function to the shorter one naming the same matrix: a
 * translation whose other axes are zero is that axis's own function, and a
 * uniform scale needs one factor. CSS Transforms 1 §7 defines each as the
 * matrix it multiplies, so the two spellings compute alike.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {[string, string] | null} the shorter call as its name and
 * arguments, or null to keep the function
 */
const _reduceTransformFunction = (fn, inner) => {
	if (!_S._transforms.reduceFunctions) return null;
	const reduce = _TRANSFORM_REDUCERS.get(fn);
	// Asked before the arguments are parted: a function naming no shorter one is
	// most of what a stylesheet calls, and it keeps its own spelling.
	if (reduce === undefined) return null;
	const args = inner.split(",");
	for (let i = 0; i < args.length; i++) {
		const one = args[i].trim();
		if (one.length === 0) return null;
		args[i] = one;
	}
	return reduce(args);
};

/**
 * Drop the direction a linear gradient flows in anyway. CSS Images 3 §3.1: with
 * no `<side-or-corner>` and no angle the gradient runs top to bottom, which is
 * what `to bottom` and `180deg` each name.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the arguments without it, or null to keep them
 */
const _dropDefaultGradientDirection = (fn, inner) => {
	if (!LINEAR_GRADIENTS.has(fn) || !_S._transforms.reduceFunctions) return null;
	const comma = inner.indexOf(",");
	if (comma === -1) return null;
	const first = inner.slice(0, comma).trim().toLowerCase().replace(/\s+/g, " ");
	if (!DEFAULT_GRADIENT_DIRECTIONS.has(first)) return null;
	return inner.slice(comma + 1).trim();
};

/**
 * Fold what a gradient's own grammar already says about its color stops: the
 * last stop's position where the fix-up puts it there anyway (CSS Images 3
 * §3.4.3), and — where the target reads the two-position syntax — two adjacent
 * stops of one color as the one stop naming both (CSS Images 4 §3.4).
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @param {boolean} double whether a two-position stop may be emitted
 * @returns {string | null} the rewritten arguments, or null to keep them
 */
const _foldGradientStops = (fn, inner, double) => {
	if (!_S._transforms.reduceFunctions) return null;
	const implied = GRADIENT_LAST_POSITIONS.get(fn);
	if (implied === undefined) return null;
	const args = _splitTopLevelArguments(inner);
	// A one-argument gradient states no stop list to read.
	if (args.length < 2) return null;
	let changed = false;
	// The last argument is always a color stop: the grammar puts one after every
	// color hint. A stop already carrying two positions is not that one value.
	const last = _splitTopLevelSpaces(args[args.length - 1]);
	if (last.length === 2 && implied.has(last[1].toLowerCase())) {
		args[args.length - 1] = last[0];
		changed = true;
	}
	if (double) {
		for (let i = args.length - 1; i > 0; i--) {
			const one = _splitTopLevelSpaces(args[i]);
			const before = _splitTopLevelSpaces(args[i - 1]);
			// Two positions on one stop are the two stops they would be written as,
			// so only a pair naming one color folds — and a color hint, which is a
			// position alone, is no stop to fold with.
			if (
				one.length !== 2 ||
				before.length !== 2 ||
				!equalsLowerCase(before[0], one[0].toLowerCase())
			) {
				continue;
			}
			args[i - 1] = `${before[0]} ${before[1]} ${one[1]}`;
			args.splice(i, 1);
			changed = true;
		}
	}
	return changed ? args.join(",") : null;
};

// One `<length-percentage>` or `<angle>` written as a plain number, which is
// what a color stop's position is when it carries no substitution.
const _STOP_POSITION_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)?$/i;

/**
 * Write a color stop's two positions as the two stops they name
 * (`red 30% 40%` is `red 30%,red 40%`), for a target that does not read the
 * double-position notation (CSS Images 4). The inverse of the fold
 * `_foldGradientStops` makes where the target does.
 *
 * A gradient's first argument may be its direction, shape or size rather than a
 * stop — `ellipse 50% 50%` has the shape of a double-position stop without being
 * one — so it is split only where it starts with something that is certainly a
 * color. Every later argument is a stop by the grammar.
 * @param {string} fn the function name, lowercased
 * @param {string} inner the argument text
 * @returns {string | null} the rewritten arguments, or null when nothing changed
 */
const _splitDoublePositionStops = (fn, inner) => {
	if (!GRADIENT_LAST_POSITIONS.has(fn)) return null;
	const args = _splitTopLevelArguments(inner);
	let changed = false;
	for (let i = args.length - 1; i >= 0; i--) {
		const one = _splitTopLevelSpaces(args[i]);
		if (
			one.length !== 3 ||
			!_STOP_POSITION_RE.test(one[1]) ||
			!_STOP_POSITION_RE.test(one[2])
		) {
			continue;
		}
		if (
			i === 0 &&
			one[0].charCodeAt(0) !== CC_NUMBER_SIGN &&
			!COLOR_KEYWORDS.has(toLowerCaseIfNeeded(one[0]))
		) {
			continue;
		}
		args.splice(i, 1, `${one[0]} ${one[1]}`, `${one[0]} ${one[2]}`);
		changed = true;
	}
	return changed ? args.join(",") : null;
};

/**
 * Collapse a value the property's own grammar already implies: two equal
 * `<repeat-style>` keywords are the one-value form.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapseRepeatedPair = (property, components) => {
	if (
		components.length === 2 &&
		REPEAT_STYLE_PROPERTIES.has(property) &&
		equalsLowerCase(components[0], components[1].toLowerCase()) &&
		// Both halves have to be that axis: the production also sits in shorthands
		// where a repeated value is some other slot, and `background: red red` is
		// a declaration the engine drops rather than one to make valid.
		REPEAT_STYLE_KEYWORDS.has(toLowerCaseIfNeeded(components[0]))
	) {
		return [components[0]];
	}
	return null;
};

/**
 * How a component would be looked up in a slot's spellings: a call is its name
 * with empty parentheses, anything else is itself.
 * @param {string} component one lowercased top-level component
 * @returns {string} the spelling to look up
 */
const _componentSpelling = (component) => {
	const open = component.indexOf("(");
	return open === -1 ? component : `${component.slice(0, open)}()`;
};

// A `<time>` of zero, whichever unit it is spelled in.
const ZERO_TIME_RE = /^[+-]?(?:0+\.?0*|\.0+)m?s$/i;

/**
 * Drop a `<time>` of zero, which is the time a transition or an animation runs
 * with anyway — both the duration and the delay default to it. Only the last one
 * the layer states: the first `<time>` fills the duration slot and the second the
 * delay, so dropping the first hands the delay's value to the duration, while
 * dropping the last leaves what stands before it where it was.
 * @param {string[]} components one layer's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropZeroTimes = (components) => {
	if (components.length < 2) return null;
	// Two slots take a time — the duration and the delay — so a layer holding a
	// third is one no engine reads, and dropping from it would bring it to life.
	let times = 0;
	for (const one of components) {
		if (_TRANSITION_TIME_RE.test(one)) times++;
	}
	if (times > 2) return null;
	let kept = components;
	for (;;) {
		let at = -1;
		for (let i = 0; i < kept.length; i++) {
			if (_TRANSITION_TIME_RE.test(kept[i])) at = i;
		}
		if (at === -1 || kept.length < 2 || !ZERO_TIME_RE.test(kept[at])) break;
		kept = [...kept.slice(0, at), ...kept.slice(at + 1)];
	}
	return kept === components ? null : kept;
};

// The iteration count an animation runs with anyway. A `<number>` is the one
// thing that slot takes, and nothing else in the shorthand takes one.
const _ONE_COUNT_RE = /^\+?1(?:\.0*)?$/;

/**
 * Drop an iteration count of one from an animation's layer.
 * @param {string[]} components one layer's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropSingleCount = (components) => {
	if (components.length < 2) return null;
	// One slot takes it, so a layer naming a second number is one no engine
	// reads, and dropping from it would bring it to life.
	let numbers = 0;
	for (const one of components) {
		const written = _LONE_NUMBER_RE.exec(one);
		if (written !== null && written[1] === undefined) numbers++;
	}
	if (numbers > 1) return null;
	const at = components.findIndex((one) => _ONE_COUNT_RE.test(one));
	if (at === -1) return null;
	const kept = [...components];
	kept.splice(at, 1);
	return kept;
};

/**
 * Whether a component fills the slot an initial keyword stands in — one of its
 * spellings, or a value of a class it takes. A value this cannot class at all
 * (a call, a nested list) is read as filling any slot that takes more than
 * spellings, since what it is there is not knowable from here.
 * @param {string} written the component, as printed
 * @param {string} lower the same, lowercased
 * @param {{ spellings: Set<string>, classes: Set<string> }} slot what the slot takes
 * @returns {boolean} true when the component may be filling it
 */
const _fillsSlot = (written, lower, slot) => {
	if (slot.spellings.has(lower)) return true;
	if (slot.classes.size === 0) return false;
	const classes = _valueClasses(written, lower);
	if (classes === null) return true;
	for (const name of classes) {
		if (slot.classes.has(name)) return true;
	}
	return false;
};

/**
 * Drop the shorthand slots holding what they already default to. A sibling out
 * of the same slot's spellings — one of its keywords, or a call to one of its
 * functions — means the value fills that slot twice, which is a declaration the
 * engine drops; dropping one of them would revive it.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropInitialKeywords = (property, components) => {
	const table = SHORTHAND_INITIAL_KEYWORDS.get(property);
	if (table === undefined || components.length < 2) return null;
	// A comma parts two layers and a `/` reaches a slot through another's value;
	// either way the slots are no longer this one flat list.
	for (const component of components) {
		if (component.includes(",") || component === "/") return null;
	}
	const lowered = components.map((one) =>
		_componentSpelling(toLowerCaseIfNeeded(one))
	);
	const kept = [];
	for (let i = 0; i < components.length; i++) {
		const slot = table.get(lowered[i]);
		if (
			slot !== undefined &&
			!components.some(
				(other, j) => j !== i && _fillsSlot(other, lowered[j], slot)
			)
		) {
			continue;
		}
		kept.push(components[i]);
	}
	if (kept.length === components.length) return null;
	if (kept.length !== 0) return kept;
	// Every slot held its own initial, so any one of them says all of them.
	let shortest = components[0];
	for (const component of components) {
		if (component.length < shortest.length) shortest = component;
	}
	return [shortest];
};

// A `<box>` a layer's origin and clip are written with.
const _BACKGROUND_BOXES = new Set([
	"border-box",
	"padding-box",
	"content-box",
	"text",
	"fill-box",
	"stroke-box",
	"view-box",
	"no-clip"
]);

// One `<bg-size>` component: `auto`, one of the two keywords that size a layer
// whole, or a `<length-percentage>`. Nothing that may stand after a size — a
// repeat style, an attachment, a box, a color — is any of those.
const _BACKGROUND_SIZE_RE =
	/^(?:auto|cover|contain|[+-]?(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)?)$/i;

/**
 * Whether a component is a `<bg-size>` at all, which is what says where the
 * size slot ends.
 * @param {string | undefined} written the component, or undefined past the end
 * @returns {boolean} true when it is one
 */
const _isBackgroundSize = (written) =>
	written !== undefined && _BACKGROUND_SIZE_RE.test(written);

/**
 * The percentage a `<position>` component resolves to, or null where it is not
 * one this can resolve — an offset from an edge, a substitution, a length.
 * @param {string} written the component
 * @param {number} axis 0 for the x axis, 1 for the y
 * @returns {string | null} the percentage, or null
 */
const _positionPercentage = (written, axis) => {
	const lower = toLowerCaseIfNeeded(written);
	const named = (axis === 0 ? POSITION_X_KEYWORDS : POSITION_Y_KEYWORDS).get(
		lower
	);
	if (named !== undefined) return named;
	// Only the percentage: a length zero puts the image in the same place, but
	// the engine computes it as `0px` where an unwritten slot computes as `0%`,
	// so taking it out would change the value a script reads back.
	if (lower === "0%") return "0%";
	return lower.endsWith("%") ? lower : null;
};

/**
 * Drop what a layered shorthand's layer says with its slots' own initial
 * values: a `<position>` that resolves where an unwritten one does — with the
 * `<bg-size>` after it, when that is the initial too — and the `<box>` pair its
 * origin and clip default to.
 *
 * Read positionally, since these slots are not order-free: the size follows the
 * `/` and the position stands directly before it, and the boxes are the run of
 * `<box>` keywords. A layer this cannot read that way is left alone.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components one layer's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the layer
 */
const _dropLayerInitials = (property, components) => {
	const initials = LAYER_INITIALS.get(property);
	if (initials === undefined || components.length < 2) return null;
	/** @type {boolean[]} */
	const drop = components.map(() => false);
	const slash = components.indexOf("/");
	// The position is what stands before the `/`, or the two components that
	// resolve to one where there is none.
	let end = slash === -1 ? -1 : slash;
	if (slash === -1) {
		for (let at = 1; at < components.length; at++) {
			if (
				_positionPercentage(components[at - 1], 0) !== null &&
				_positionPercentage(components[at], 1) !== null
			) {
				end = at + 1;
				break;
			}
		}
	}
	if (
		end >= 2 &&
		_positionPercentage(components[end - 2], 0) === initials[0] &&
		_positionPercentage(components[end - 1], 1) === initials[1]
	) {
		// A size after the `/` goes with it, and only when it is the initial too:
		// the position cannot be dropped on its own where one is written.
		let sized = true;
		if (slash !== -1) {
			// The size is the one or two components after the `/`, and it goes only
			// where each is what an unwritten slot takes: the next slot's keywords
			// stand right after them, and none of those is a `<bg-size>`.
			let last = slash;
			while (last - slash < 2 && _isBackgroundSize(components[last + 1])) {
				last++;
			}
			sized = last > slash;
			for (let at = slash + 1; at <= last; at++) {
				if (!equalsLowerCase(components[at], initials[2])) sized = false;
			}
			if (sized) for (let at = slash; at <= last; at++) drop[at] = true;
		}
		if (sized) {
			drop[end - 2] = true;
			drop[end - 1] = true;
		}
	}
	// The boxes: two of them are the origin and the clip in that order, one is
	// both. Either way they go only where each is the value its own slot takes
	// when nothing writes it.
	const boxes = [];
	for (let at = 0; at < components.length; at++) {
		if (_BACKGROUND_BOXES.has(toLowerCaseIfNeeded(components[at]))) {
			boxes.push(at);
		}
	}
	const written = boxes.map((at) => toLowerCaseIfNeeded(components[at]));
	if (
		(boxes.length === 2 &&
			written[0] === initials[3] &&
			written[1] === initials[4]) ||
		(boxes.length === 1 &&
			written[0] === initials[3] &&
			written[0] === initials[4])
	) {
		for (const at of boxes) drop[at] = true;
	}
	const kept = components.filter((_, at) => !drop[at]);
	if (kept.length === components.length) return null;
	// A layer writes at least one component, and its own initial image says the
	// least of them.
	return kept.length === 0 ? ["none"] : kept;
};

/**
 * Rewrite a `<position>` written as edge keywords into the percentages they
 * resolve to. Keywords only: an offset beside one is the 3/4-value syntax,
 * where the keyword names an edge to measure from rather than a place.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapsePositionKeywords = (property, components) => {
	if (
		!POSITION_PROPERTIES.has(property) ||
		components.length === 0 ||
		components.length > 2
	) {
		return null;
	}
	/** @type {string | undefined} */
	let x;
	/** @type {string | undefined} */
	let y;
	for (const component of components) {
		const keyword = toLowerCaseIfNeeded(component);
		const onX = POSITION_X_KEYWORDS.get(keyword);
		const onY = POSITION_Y_KEYWORDS.get(keyword);
		if (onX === undefined && onY === undefined) return null;
		// `center` is on both axes and is what a free axis already resolves to.
		if (onX !== undefined && onY !== undefined) continue;
		if (onX === undefined) {
			if (y !== undefined) return null;
			y = onY;
		} else {
			if (x !== undefined) return null;
			x = onX;
		}
	}
	const across = x === undefined ? "50%" : x;
	const down = y === undefined ? "50%" : y;
	// A trailing `50%` is what the omitted second value means.
	const shorter = down === "50%" ? [across] : [across, down];
	return shorter.join(" ").length < components.join(" ").length
		? shorter
		: null;
};

/**
 * Drop a `<position>`'s second value where it names the centre an omitted one
 * already means. A pair of keywords takes the percentage rewrite above; this is
 * for the pairs an offset keeps out of it.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _dropCenterPositionTail = (property, components) => {
	if (!POSITION_PROPERTIES.has(property) || components.length !== 2) {
		return null;
	}
	const down = toLowerCaseIfNeeded(components[1]);
	if (down !== "center" && down !== "50%") return null;
	// A `top` / `bottom` first value is no x-position, so that pair is the
	// order-free keyword syntax and dropping half would leave an invalid value.
	const across = toLowerCaseIfNeeded(components[0]);
	if (!POSITION_X_KEYWORDS.has(across) && !_NUMERIC_RE.test(across)) {
		return null;
	}
	const kept = [components[0]];
	// With the tail gone it is a lone keyword, which is the percentage it resolves
	// to — the rewrite above read a pair the offset kept it out of.
	return _collapsePositionKeywords(property, kept) || kept;
};

// One `grid-template-areas` row, whose quotes bound it — the whitespace between
// its cell names parts them, and a run of it says no more than one space.
const _AREA_ROW_RE = /^(["'])([\s\S]*)\1$/;

/**
 * Squeeze a `grid-template-areas` value: each row keeps the cell names it
 * lists, a run of null cells is the one token it already is, and the whitespace
 * between two rows carries nothing at all — the quotes already part them.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const _collapseGridTemplateAreas = (path, node, writer) => {
	const components = _valueComponents(path, node, writer);
	const rows = [];
	for (const component of components) {
		const row = _AREA_ROW_RE.exec(component);
		if (row === null) return null;
		// A cell name is a `<custom-ident>` and holds no `.`, so a run of them is
		// one null cell token however many are written (CSS Grid 2 §7.3).
		rows.push(
			`${row[1]}${row[2]
				.trim()
				.replace(/\s+/g, " ")
				.replace(/\.{2,}/g, ".")}${row[1]}`
		);
	}
	return rows.length === 0 ? null : rows;
};

/**
 * The safe transforms that rewrite one fragment of a declaration value on its
 * own, whatever stands beside it.
 * @param {string} fragment the fragment's printed text
 * @param {string} property the declaration's lowercased property name
 * @param {boolean} minify whether printing minified
 * @returns {string} the rewritten fragment
 */
const _valueFragment = (fragment, property, minify) => {
	let out = fragment;
	if (minify && !_S._inSupportsPrelude && _S._transforms.reduceFunctions) {
		out = _unwrapCalc(out, property);
	}
	if (minify && !ZERO_UNIT_KEEPING_PROPERTIES.has(property)) {
		out = _dropZeroLengthUnit(out);
		out = _dropZeroLengthUnitInCall(out);
	}
	return out;
};

// Which property a vendor spelling is a spelling of, so `-webkit-transition`'s
// value minifies the way `transition`'s does. Built on first use from the table
// the prefixing pass carries, a prefixed name not always being that property.
/** @type {Map<string, string> | null} */
let _standardSpellings = null;

/**
 * The standard property a name spells, or the name itself.
 * @param {string} property a lowercased property name
 * @returns {string} the property whose value rules apply
 */
const _standardSpelling = (property) => {
	if (property.charCodeAt(0) !== CC_HYPHEN_MINUS) return property;
	if (_standardSpellings === null) {
		_standardSpellings = new Map();
		for (const [standard, spellings] of PREFIXED_PROPERTIES) {
			for (const [spelling] of spellings) {
				_standardSpellings.set(spelling, standard);
			}
		}
	}
	const standard = _standardSpellings.get(property);
	return standard === undefined ? property : standard;
};

/**
 * Shorten a shorthand declaration's value to an equivalent spelling. A prefixed
 * spelling is a different property, and neither table lists one.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {string} property the declaration's lowercased property name
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const _collapseShorthand = (path, property, node, writer) => {
	if (!_S._transforms.shortenValues) return null;
	// A value holding a substitution is the token stream it was written as, so
	// nothing in it collapses. Read off the declaration rather than the walk's
	// flag: this runs as the declaration is printed, once its children are done.
	if (_hasSubstitutionInSpan(path.start(), path.end())) return null;
	if (BOX_SHORTHANDS.has(property)) {
		return _collapseBoxShorthand(path, property, node, writer);
	}
	if (property === "font-weight") {
		return _collapseFontWeight(path, node, writer);
	}
	if (property === "flex") {
		return _collapseFlexShorthand(path, node, writer);
	}
	if (property === "grid-template-areas") {
		return _collapseGridTemplateAreas(path, node, writer);
	}
	const written = _valueComponents(path, node, writer);
	const shadow = _dropShadowZeroLengths(property, written);
	if (shadow !== null) return shadow;
	if (property === "transition") {
		return _collapseTransitionLayers(property, written);
	}
	if (property === "animation") {
		return _collapseAnimationLayers(written);
	}
	// A slot holding its own initial goes first, so what follows reads the
	// components that are left rather than the ones the author wrote.
	const readable = _shorthandSlotsReadable(property);
	// A family's slots are read by what each takes rather than by an enumerated
	// list, answering for a color and a length where the keyword table cannot. A
	// layered shorthand reads position, size and boxes positionally.
	const layered = _dropLayerInitials(property, written);
	let dropped = readable
		? _dropFamilyInitials(property, written) ||
			_dropInitialKeywords(property, layered || written) ||
			layered
		: layered;
	let components = dropped === null ? written : dropped;
	// A component spelling the property's own initial says nothing beside another:
	// omitting the group it belongs to leaves exactly that keyword.
	const omittable = OMITTABLE_INITIAL_KEYWORDS.get(property);
	if (omittable !== undefined && components.length > 1) {
		const [keyword, slot] = omittable;
		// Only when the slot the keyword fills is named once. A value naming it
		// twice is invalid, and dropping the initial would leave the valid value
		// the author did not write.
		const filled = components.filter((one) =>
			slot.includes(toLowerCaseIfNeeded(one))
		);
		const kept =
			filled.length === 1
				? components.filter((one) => !equalsLowerCase(one, keyword))
				: components;
		if (kept.length !== 0 && kept.length !== components.length) {
			components = kept;
			dropped = kept;
		}
	}
	if (property === "display" && components.length === 2) {
		const pair = `${toLowerCaseIfNeeded(components[0])} ${toLowerCaseIfNeeded(
			components[1]
		)}`;
		// `<display-outside> || <display-inside>` is order-free, so both readings.
		const short =
			DISPLAY_SHORT_FORMS.get(pair) ||
			DISPLAY_SHORT_FORMS.get(pair.split(" ").reverse().join(" "));
		// The one-keyword name is the same box. Where it is no shorter it is
		// written only for a target that reads no multi-keyword `display` —
		// re-spelling a value for nothing is what `convertLengthUnits` declines.
		if (
			short !== undefined &&
			(short.length < pair.length || !_S._displayTwoValuesAllowed)
		) {
			return [short];
		}
	}
	if (property === "font") {
		return _numberFontShorthandWeight(components) || dropped;
	}
	// `initial` computes to the property's initial value, so where that value is
	// a shorter keyword the two are the same declaration.
	if (components.length === 1 && equalsLowerCase(components[0], "initial")) {
		const keyword = INITIAL_VALUE_KEYWORDS.get(property);
		if (keyword !== undefined) return [keyword];
	}
	// Grammar matching skips whitespace and a `)` fuses with nothing, so between
	// two calls it separates the same tokens either way — whatever the property,
	// which is what reaches the prefixed spellings no table names.
	if (
		components.length > 1 &&
		components.every((one) => one.endsWith(")") && one.includes("("))
	) {
		return components;
	}
	// A `font-stretch` keyword is the percentage it names, in fewer bytes.
	if (property === "font-stretch" && components.length === 1) {
		const percentage = FONT_STRETCH_PERCENTAGES.get(
			toLowerCaseIfNeeded(components[0])
		);
		if (percentage !== undefined && percentage.length < components[0].length) {
			return [percentage];
		}
	}
	const position = _collapsePositionKeywords(property, components);
	if (position !== null) return position;
	const centered = _dropCenterPositionTail(property, components);
	if (centered !== null) return centered;
	return _collapseRepeatedPair(property, components) || dropped;
};

// A zero angle argument, on its own or one of a comma list.
const _ZERO_ANGLE_ARGUMENT_RE = /(^|,)\s*0(?:deg|grad|rad|turn)\s*(?=,|$)/gi;

/**
 * Drop the unit a zero argument does not need, for a call whose own grammar
 * makes it droppable — a `<zero>` beside `<angle>`, or a length.
 * @param {string} fn the lowercased function name
 * @param {string} inner the text between the parentheses
 * @returns {string} the arguments, such zero units dropped
 */
const _dropCallZeroUnit = (fn, inner) => {
	if (ZERO_ANGLE_FUNCTIONS.has(fn)) {
		return inner.replace(_ZERO_ANGLE_ARGUMENT_RE, "$10");
	}
	return LENGTH_ONLY_FUNCTIONS.has(fn) ? _dropZeroLengthUnit(inner) : inner;
};

// One call, split into its name and the text between its parentheses.
const _LONE_CALL_RE = /^([-\w]+)\(([^()]*)\)$/;

/**
 * The same, for the arguments of a call whose every number is a length. The
 * split is on top-level separators of a body holding no nested call, so each
 * piece is a whole argument and a `calc()` inside one is never reached.
 * @param {string} fragment one printed top-level component
 * @returns {string} the component, its arguments' zero units dropped
 */
const _dropZeroLengthUnitInCall = (fragment) => {
	if (!_S._transforms.shortenNumbers) return fragment;
	// The name decides before the shape is matched: a call ends in `)`, and few
	// of the calls a value holds name a length-only function.
	if (fragment.charCodeAt(fragment.length - 1) !== CC_RIGHT_PARENTHESIS) {
		return fragment;
	}
	const paren = fragment.indexOf("(");
	if (
		paren <= 0 ||
		!LENGTH_ONLY_FUNCTIONS.has(toLowerCaseIfNeeded(fragment.slice(0, paren)))
	) {
		return fragment;
	}
	const match = _LONE_CALL_RE.exec(fragment);
	if (match === null) return fragment;
	const body = match[2].replace(/[^\s,]+/g, _dropZeroLengthUnit);
	return `${match[1]}(${body})`;
};

// A `calc()` holding one constant, which is the only shape the parentheses can
// come off. `-` is matched so a negative is recognized and then kept.
const _LONE_CALC_RE = /^calc\((-?(?:\d*\.\d+|\d+))(%|[a-z]+)?\)$/i;

// WHY: a folded term meaning the same bare as inside `calc()`, whatever the
// property and wherever it stands — positive, and either carrying a unit, so
// never an `<integer>` context, or already a non-zero integer. A unitless
// fraction is left out, the property deciding there and only the declaration
// printer knowing it, as is anything negative. Zero is the one number a length
// also accepts, so `width:calc(0)` is dropped where `width:0` is not.
const _BARE_TERM_RE = /^(?:\d*\.\d+|\d+)(?:%|[a-z]+)$|^(?!0+$)\d+$/i;

// WHY: the same, one level in. A folded term standing as an operand of an outer
// math expression is arithmetic rather than a value, so no property judges it
// and a fraction or a zero needs no parentheses. One non-negative term only:
// `calc(1px - calc(0px - 5px))` may not become `calc(1px - -5px)`, nor
// `calc(1px - calc(1em + 1px))` a sum whose second term changed sign.
const _NESTED_TERM_RE = /^(?:\d*\.\d+|\d+)(?:%|[a-z]+)?$/i;

/**
 * Take the parentheses off a folded `calc()`, where the bare value means the
 * same thing. Two shapes where it does not, both measured in headless Chromium:
 * a negative is clamped inside `calc()` and a parse error outside it on a
 * property that takes none (`width:calc(-5px)` renders at `0`, `width:-5px` at
 * `auto`), and a fraction is rounded where the grammar wants an `<integer>`
 * (`z-index:calc(1.5)` computes to `2`, `z-index:1.5` is dropped). A unit or a
 * percentage settles the second on its own, since no `<integer>` carries
 * either. A unitless zero is a third: it is the one number a length accepts, so
 * `width:calc(0)` is dropped and `width:0` is not. A fourth is a value the spec
 * clamps a `calc()` to and rejects bare (see `CLAMPED_VALUE_RANGES`).
 * @param {string} fragment one printed component
 * @param {string} property the lowercased property it belongs to
 * @returns {string} the bare value, or the fragment as it was
 */
const _unwrapCalc = (fragment, property) => {
	if ((fragment.charCodeAt(0) | 0x20) !== CC_LOWER_C) return fragment;
	const match = _LONE_CALC_RE.exec(fragment);
	if (match === null) return fragment;
	// Where the engine takes no `calc()`, the bare value is the one it reads —
	// so unwrapping would switch on a declaration it had thrown away.
	if (CALC_REJECTING_PROPERTIES.has(property)) return fragment;
	const number = match[1];
	if (
		number.charCodeAt(0) === 0x2d &&
		!NEGATIVE_ACCEPTING_PROPERTIES.has(property)
	) {
		return fragment;
	}
	const unit = match[2] === undefined ? "" : match[2];
	// The fold left the `calc()` because the value is clamped inside one and not
	// outside; taking the parentheses off here would undo that.
	if (_losesClamp(property, number, unit)) return fragment;
	if (unit === "" && Number(number) === 0) return fragment;
	// A bare number these read as a length of their own is one the engine refuses
	// inside `calc()`, so the parentheses stay. Both names are asked: the prefixed
	// spelling is the one that differs, and `property` is the standard one.
	if (
		unit === "" &&
		(NUMBER_ONLY_OUTSIDE_CALC_PROPERTIES.has(property) ||
			_inNumberOnlyOutsideCalcProperty())
	) {
		return fragment;
	}
	if (unit === "" && number.includes(".") && INTEGER_PROPERTIES.has(property)) {
		return fragment;
	}
	return number + unit;
};

/**
 * Whether a `(…)` block is one of `@scope`'s two selector lists — its scope root
 * or its limit — rather than a query condition. Both sit directly in the
 * at-rule's prelude, so the immediate parent settles it.
 * @param {CssPath} path the accessor positioned on the `(…)` block
 * @returns {boolean} true inside a `@scope` prelude
 */
const _inScopePrelude = (path) => {
	const parent = path.parent;
	return (
		parent !== null &&
		path.type(parent) === T_AT_RULE &&
		path.atKeyword(parent) === "scope"
	);
};

/**
 * Print an attribute selector's children: the separators go (the grammar allows
 * whitespace anywhere inside `[…]`, and `_join` still parts two fragments that
 * would fuse — `[a=b i]`), and a quoted value that is also a bare identifier
 * loses its quotes. Unquoting starts after the `=` delim, so the `[…]`'s name
 * side is never touched. A separator right after a kept string stays: `[a="b" i]`
 * is what every engine is exercised on.
 * @param {CssPath} path the accessor positioned on the `[…]` block
 * @param {ComponentValue[]} children the block's children
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[]} the fragments to join
 */
const _printAttributeSelector = (path, children, writer) => {
	/** @type {string[]} */
	const parts = [];
	let afterEquals = false;
	let afterString = false;
	let afterBar = false;
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const type = path.type(child);
		if (type === T_WHITESPACE) {
			// Not after the `|` parting a namespace from its attribute: the two are
			// one token sequence there, so whitespace between them invalidates the
			// selector. In headless Chromium `[| a]` is dropped and `[ |a]` is not.
			if (afterString || afterBar) parts.push(_SEP);
			continue;
		}
		const text = writer.get(child);
		afterString = false;
		afterBar = !afterEquals && type === T_DELIM && text === "|";
		if (!afterEquals) {
			if (type === T_DELIM && text === "=") afterEquals = true;
			parts.push(text);
		} else if (
			_S._transforms.normalizeQuotes &&
			type === T_STRING &&
			_isClosedString(text)
		) {
			const body = text.slice(1, -1);
			if (_isBareIdent(body)) {
				parts.push(body);
			} else {
				parts.push(text);
				afterString = true;
			}
		} else {
			parts.push(text);
		}
	}
	return parts;
};

/**
 * The default CSS node printer — passed to the `SourceProcessor` and fired once a
 * node's visitors and children are done (a developer could supply their own).
 * It takes the same `path` a visitor gets plus the print context as its `writer`,
 * and knows nothing of the walk: it switches on `path.type()`, reads the node's
 * name / children through `path`, pulls its children's already-printed text from
 * `writer.get`, composes this node's text (with the CSS-local `_join` / `_SEP` /
 * spacing) and **returns** it. Structure keeps it safe: a declaration's
 * `name:value` drops the space around `:` a flat token stream could not, and
 * custom-property (`--*`) values stay verbatim. When minifying it also applies the
 * safe value transforms (number normalization, hex / rgb() color minification,
 * `cubic-bezier()` / `steps()` easing keywords, string / attribute-selector /
 * `url()` quote normalization, identifier escape shortening, `{1,4}` box and
 * `flex` shorthand collapsing), drops the
 * whitespace a query condition does not need, and drops rules whose block ends
 * up empty — each value-identical, so meaning never changes.
 * @experimental exposed as `webpack.css.syntax.printer`; unstable API
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string} the node's serialized text
 */
const printer = (path, writer) => {
	const minify = writer.options.mode === "minify";
	// `""` minifying / `" "` beautifying (a "soft" space, e.g. after a `:`).
	const soft = minify ? "" : " ";
	switch (path.type()) {
		case T_WHITESPACE:
			return _SEP;
		// Only a newline makes a string bad, and the tokenizer leaves it unconsumed
		// — so carry it, or the string closes and the declaration an engine threw
		// away runs.
		case T_BAD_STRING:
			return `${path.source()}\n`;
		case T_NUMBER:
		case T_PERCENTAGE:
		case T_DIMENSION: {
			const raw = path.source();
			// A declaration value, or a media feature — only ever a `<length>`,
			// `<ratio>` or `<integer>`. Elsewhere a prelude number is An+B.
			return minify && (path.inValue() || _S._inMediaConditionPrelude)
				? _normalizeNumericToken(raw)
				: raw;
		}
		case T_FUNCTION: {
			const name = path.name();
			// A container style query asks whether a custom property's value is the one
			// written here, comparing token streams as written (CSS Conditional 5 §5),
			// so a squeezed whitespace run asks another question. Nothing is rewritten.
			if (
				minify &&
				!path.inValue() &&
				_S._inMediaConditionPrelude &&
				equalsLowerCase(name, "style")
			) {
				const written = path.source();
				// Unclosed at EOF, the source carries no `)` for the walk to have
				// closed — printed as usual so the parenthesis is written back.
				if (written.endsWith(")")) {
					// Written whole, comments included, so the queued copies are claimed
					// here rather than flushed a second time after the rule.
					writer.takeInserts(path.start(), path.end());
					return written;
				}
			}
			let inner;
			if (path.childCount() === 1) {
				// Half of all functions take one argument, which `_join` would hand
				// straight back — and a trim only ever parts two of them, so no
				// universal a compound implies can stand beside anything here either.
				const only = writer.get(path.childAt(path.node, 0));
				inner = only === _SEP ? "" : only;
			} else {
				// A selector function's argument is a selector, so its combinators need
				// no whitespace, as in the enclosing prelude. A `@supports` condition is
				// syntax under test, handed back as written, so it keeps its own.
				const trim =
					_S._mathFunctionDepth !== 0
						? _TRIM_MATH
						: !path.inValue() &&
							  !_S._inSupportsPrelude &&
							  SELECTOR_FUNCTIONS.has(name.toLowerCase())
							? _TRIM_COMBINATORS
							: _TRIM_NOTHING;
				/** @type {string[]} */
				const parts = [];
				_appendChildTexts(path.node, writer, parts);
				// A selector function's argument is a selector like the prelude's, so
				// the universal a compound implies says nothing there either.
				if (minify && trim === _TRIM_COMBINATORS) {
					_foldPseudoNames(parts);
					_dropImpliedUniversalSelector(parts);
				}
				inner = _join(parts, !minify, minify ? trim : _TRIM_NOTHING);
				// Chrome throws out `attr( name unit )` where `attr( name unit)`
				// parses, so the space before the `)` decides whether the declaration
				// runs — `_join` drops a trailing one like any other.
				if (
					minify &&
					parts[parts.length - 1] === _SEP &&
					equalsLowerCase(name, "attr")
				) {
					inner += " ";
				}
			}
			if (!minify) return `${name}(${inner})`;
			// Function names match ASCII case-insensitively, so one lowercase name
			// is what every table below is keyed by; the eleven transforms spelled
			// with a capital are printed the way everything else writes them.
			const fn = asciiLowerCaseName(name);
			// As with a unit: a name already lowercase is its own answer, and only a
			// shouted one is looked up. The lookup key still folds inside a
			// substituted value; only the printed spelling stays as written.
			const out =
				_S._inSubstitutedValue || !_S._transforms.foldCase
					? name
					: fn === name
						? fn
						: CANONICAL_NAMES.get(fn) || fn;
			// An+B in a selector: `2n+1` is what `odd` names, and shorter written so.
			if (!path.inValue() && NTH_PSEUDO_FUNCTIONS.has(fn)) {
				return _minifyAnPlusB(out, inner);
			}
			// Every rewrite below is keyed by a name none of these carry.
			if (
				SUBSTITUTION_FUNCTIONS.has(fn) ||
				(!path.inValue() && SELECTOR_FUNCTIONS.has(fn))
			) {
				return `${out}(${inner})`;
			}
			// WHY: an `rgb()` or `rgba()` collapses to the shortest color and anything
			// else keeps its `name(args)` form. A color inside a `@supports` condition
			// is syntax under test — the engines reading `#0000` are not those reading
			// `rgba(0,0,0,0)` — so rewriting it asks another question, and esbuild,
			// clean-css and lightningcss leave the condition alone too. A color read as
			// numbers, in a gradient stop, a `color-mix()` argument or a relative
			// color's origin, stays as written unless converting it is exact, which the
			// legacy sRGB forms are where their channels are bytes.
			let color = _S._inSupportsPrelude
				? null
				: _minifyColorFunction(
						fn,
						inner,
						_S._hexAlphaAllowed,
						_S._inColorOperand
					) ||
					(_S._inColorOperand
						? null
						: _minifyPolarColorFunction(fn, inner, _S._hexAlphaAllowed));
			// A mix no byte holds is written back in the space it was computed in,
			// which can be longer than the call — then the call is the shorter one.
			if (color !== null && color.length > fn.length + inner.length + 2) {
				color = null;
			}
			if (
				color !== null &&
				(color !== "transparent" || !_inTapHighlightColor())
			) {
				return color === "transparent" && _S._hexAlphaAllowed ? "#0000" : color;
			}
			// `light-dark()` names a color per scheme, which the pair above says with
			// a substitution the scheme itself switches. Two arguments only: the
			// grammar takes exactly that many, and anything else is no such call.
			if (
				_S._loweringLightDark &&
				fn === "light-dark" &&
				path.inValue() &&
				!_S._inCustomProperty &&
				!_S._inSupportsPrelude &&
				!_S._inSubstitutedValue
			) {
				const halves = _splitTopLevelArguments(inner);
				// A half the target cannot read would substitute into a `var()` and make
				// the declaration invalid at computed-value time, where nothing before it
				// is read — so it is left alone rather than lowered.
				if (halves.length === 2 && !_namesUnreadableColor(inner)) {
					_S._lightDarkUsed = true;
					return `var(${LIGHT_PROPERTY},${halves[0].trim()}) var(${DARK_PROPERTY},${halves[1].trim()})`;
				}
			}
			// A math function over constants of one unit is that value, written back as
			// a `calc()`: the parentheses stay, since dropping them turns a clamped
			// negative into a parse error, and only the declaration printer does.
			if (!_S._inSupportsPrelude && !_S._inCustomProperty) {
				const term = _foldMathFunction(fn, inner);
				if (term !== null) {
					// A term that means the same bare needs no parentheses anywhere, so
					// it is written as itself; the rest keep a `calc()` for the
					// declaration printer to judge against the property.
					const shape =
						_S._mathFunctionDepth > 1 ? _NESTED_TERM_RE : _BARE_TERM_RE;
					const folded =
						shape.test(term) &&
						!_inCalcRejectingProperty() &&
						!(!/[a-z%]$/i.test(term) && _inNumberOnlyOutsideCalcProperty()) &&
						!_foldLosesClamp(term) &&
						!_foldBelowStepCount(term, path)
							? term
							: `calc(${term})`;
					// A division can land on a value needing every digit of a double, which
					// is longer than the expression producing it. Only the outermost call
					// is asked, a nested one being a term still to be reduced.
					if (
						_S._mathFunctionDepth > 1 ||
						folded.length < fn.length + inner.length + 2
					) {
						return folded;
					}
				}
				const reduced = _reduceMathArguments(fn, inner);
				if (reduced !== null) return `${fn}(${reduced})`;
			}
			// An easing function is only ever a value; `url()` is also an at-rule
			// prelude's (`@import url("a.css")`).
			const easing =
				path.inValue() && !_S._inCustomProperty
					? _minifyEasingFunction(fn, inner)
					: null;
			if (easing !== null) return easing;
			// `translateX(v)` is `translate(v)` and `skewX(a)` is `skew(a)`, the second
			// component defaulting to 0. Only for one plain component: a substitution
			// could expand to two, reviving a declaration the browser drops.
			const oneAxis = _S._transforms.reduceFunctions
				? X_AXIS_TRANSFORMS.get(fn)
				: undefined;
			if (
				oneAxis !== undefined &&
				path.inValue() &&
				!_S._inSubstitutedValue &&
				!inner.includes(",") &&
				!_hasSubstitution(inner)
			) {
				return `${oneAxis}(${inner})`;
			}
			if (path.inValue() && !_S._inSubstitutedValue) {
				// An argument that is the amount an omitted one means says nothing,
				// whether or not the zero still carries the unit its grammar drops.
				const omitted = _S._transforms.reduceFunctions
					? FILTER_FUNCTION_OMITTED.get(fn)
					: undefined;
				if (omitted !== undefined) {
					const bare = _dropCallZeroUnit(fn, inner);
					if (bare === omitted || (omitted === "1" && bare === "100%")) {
						return `${out}()`;
					}
				}
				const reduced = _reduceTransformFunctionDeep(fn, inner);
				if (reduced !== null) return reduced;
				// The stops are folded over what dropping the direction leaves, a
				// gradient carrying both otherwise keeping whichever ran second.
				const gradient = _dropDefaultGradientDirection(fn, inner);
				let stops = _foldGradientStops(
					fn,
					gradient === null ? inner : gradient,
					_S._doublePositionAllowed
				);
				// A double position the target cannot read is written as the two
				// stops it names, over whatever the folds above left.
				if (!_S._doublePositionAllowed) {
					const split = !_S._transforms.lowerUnsupported
						? null
						: _splitDoublePositionStops(
								fn,
								stops !== null ? stops : gradient !== null ? gradient : inner
							);
					if (split !== null) stops = split;
				}
				if (stops !== null) return `${out}(${stops})`;
				if (gradient !== null) return `${out}(${gradient})`;
			}
			// A zero angle needs no unit where the grammar names `<zero>` beside
			// `<angle>` (CSS Transforms 2, Filter Effects 1).
			if (
				path.inValue() &&
				!_S._inSubstitutedValue &&
				_S._transforms.shortenNumbers &&
				ZERO_ANGLE_FUNCTIONS.has(fn)
			) {
				const bare = inner.replace(_ZERO_ANGLE_ARGUMENT_RE, "$10");
				if (bare !== inner) return `${out}(${bare})`;
			}
			const url = _S._inSubstitutedValue ? null : _minifyUrlFunction(fn, inner);
			if (url !== null) return url;
			return `${out}(${inner})`;
		}
		case T_URL: {
			const source = path.source();
			// Closed at EOF: write the `)` back so the url stops where it stopped for
			// the tokenizer rather than swallowing what the printer emits next. Before
			// the rest rather than instead of it, or a second pass is what folds it.
			const unterminated = _isUnterminatedUrl(source);
			const raw = unterminated ? _terminate(source, ")", "\uFFFD") : source;
			// The tokenizer already trimmed the url-token's content, so the padding in
			// `url(  a.png  )` carries nothing.
			if (!minify) return raw;
			const open = raw.indexOf("(");
			// `url` matches ASCII case-insensitively like any function name. Read in
			// place, since cutting the name out would allocate on every url and all but
			// a shouted one folds to itself. In a substituted value nothing is read.
			let head = null;
			if (!_S._inSubstitutedValue && _S._transforms.foldCase) {
				for (let i = 0; i < open; i++) {
					const c = raw.charCodeAt(i);
					if (c >= CC_UPPER_A && c <= CC_UPPER_Z) {
						head = asciiLowerCaseName(raw.slice(0, open + 1));
						break;
					}
				}
			}
			const percent = raw.includes("%");
			// Ahead of the padding fast path below: a base64 `data:` url is
			// whitespace-free and `%`-free, so it would take it and never be offered.
			if (_S._deferEmbeddedSource !== undefined) {
				const opener = head === null ? raw.slice(0, open + 1) : head;
				const deferred = _deferDataUrl(
					_urlValue(path, unterminated),
					(url) => `${opener}${_serializeUrl(url, '"')})`,
					raw
				);
				if (deferred !== null) return deferred;
			}
			if (_S._renderEmbeddedSource !== undefined) {
				const renderedUrl = _renderDataUrl(_urlValue(path, unterminated));
				if (renderedUrl !== null) {
					const name = head === null ? raw.slice(0, open + 1) : head;
					return `${name}${_serializeUrl(renderedUrl, '"')})`;
				}
			}
			// Padding only exists when the content is whitespace-bounded; checking
			// that costs two char reads, reading the content costs a slice.
			if (
				!percent &&
				!isWhitespace(raw.charCodeAt(open + 1)) &&
				!isWhitespace(raw.charCodeAt(raw.length - 2))
			) {
				return head === null ? raw : head + raw.slice(open + 1);
			}
			if (head === null) head = raw.slice(0, open + 1);
			const value = _urlValue(path, unterminated);
			// A url-token already carrying an escape is one this printer did not
			// write, so its `\%` is not read as the start of a percent-escape.
			return `${head}${
				percent && !value.includes("\\")
					? _decodePercentEscapes(value, true, "")
					: value
			})`;
		}
		case T_STRING: {
			const source = path.source();
			// Closed at EOF: write the quote back, for the same reason as `url()`.
			// Written here rather than after the transforms below, or they read a
			// string with no closing quote and decline it, which a second pass undoes.
			const raw = _isClosedString(source)
				? source
				: _terminate(source, source[0], "");
			// A custom property hands its string back as written, quotes included.
			if (!minify || _S._inCustomProperty) return raw;
			// `<family-name>` is `<string> | <custom-ident>+`, so a family whose text
			// is a run of identifiers means the same unquoted, two bytes shorter.
			if (
				!_S._inSupportsPrelude &&
				!_S._inSubstitutedValue &&
				_inFontFamily() &&
				_isLoneFamilyName(path)
			) {
				const unquoted = _unquoteFontFamily(raw);
				if (unquoted !== null) return unquoted;
			}
			return _minifyString(raw);
		}
		case T_IDENT: {
			const raw = path.source();
			if (!minify) return raw;
			// `transparent` is `#0000` where the target reads a hex alpha — the same
			// color, six bytes shorter. The tap-highlight guard still holds: that
			// WebKit bug is about the keyword's *value*, whichever way it is spelled.
			if (
				path.inValue() &&
				!_S._inSubstitutedValue &&
				_S._hexAlphaAllowed &&
				_S._transforms.shortenColors &&
				equalsLowerCase(raw, "transparent") &&
				!_inTapHighlightColor()
			) {
				return "#0000";
			}
			// The keyword names each platform's own UI font, which a target that
			// does not read it reaches only through the platform's own name for it.
			if (
				!_S._systemUiAllowed &&
				_S._transforms.lowerUnsupported &&
				path.inValue() &&
				!_S._inCustomProperty &&
				!_S._inSubstitutedValue &&
				equalsLowerCase(raw, "system-ui") &&
				_inFontFamily()
			) {
				return SYSTEM_UI_STACK;
			}
			if (
				path.inValue() &&
				!_S._inCustomProperty &&
				!_S._inSupportsPrelude &&
				!_S._inSubstitutedValue
			) {
				// One fold for both questions below. `toLowerCaseIfNeeded` hands back the
				// string where nothing changes, so a value already in one case answers
				// the second by identity and is never walked twice.
				const lowered = toLowerCaseIfNeeded(raw);
				// A named color where the property takes nothing else an identifier could
				// be: `white` is `#fff`, both computing to `rgb(255, 255, 255)`.
				// Elsewhere an identifier may be the author's own name.
				if (_S._transforms.shortenColors) {
					const shorter = COLOR_NAME_TO_SHORTEST.get(lowered);
					if (shorter !== undefined && _inColorOnlyProperty()) return shorter;
				}
				// A property taking keywords alone, or a color, names nothing of the
				// author's, so an identifier directly in its value is a keyword, matching
				// ASCII case-insensitively. A call's arguments are its own grammar's.
				if (
					_S._transforms.foldCase &&
					lowered !== raw &&
					path.parent === _S._valueDeclaration &&
					_inKeywordOnlyValue()
				) {
					const folded = asciiLowerCaseName(raw);
					if (folded !== raw) return folded;
				}
			}
			return _S._transforms.rewriteEscapes ? _minifyIdentEscapes(raw) : raw;
		}
		case T_SIMPLE_BLOCK: {
			const open = path.blockToken();
			const close = open === "(" ? ")" : open === "[" ? "]" : "}";
			// Outside a declaration value a `[…]` is an attribute selector and a `(…)`
			// a query condition. Inside one they are a grid line-name list and a
			// `calc()` sub-expression, where neither of those rewrites holds.
			const structural = minify && !path.inValue();
			/** @type {string[]} */
			let parts;
			if (structural && open === "[") {
				parts = _printAttributeSelector(path, path.children(), writer);
			} else {
				// One array, rather than a child list and a mapped copy of it.
				parts = [];
				_appendChildTexts(path.node, writer, parts);
			}
			if (structural && open === "(" && _S._inMediaConditionPrelude) {
				if (_S._transforms.foldCase) _lowercaseConditionParts(parts);
				if (_S._rangeSpellingAllowed) _useRangeSpelling(parts);
			}
			let trim =
				minify && _S._mathFunctionDepth !== 0 ? _TRIM_MATH : _TRIM_NOTHING;
			if (structural && open === "(") {
				// `@scope`'s parentheses hold selector lists, so a `:` there starts a
				// pseudo-class and the whitespace before it is a descendant combinator
				// — `@scope (div :hover)` is not `@scope (div:hover)`.
				trim = _inScopePrelude(path) ? _TRIM_COMBINATORS : _TRIM_CONDITIONS;
				if (trim === _TRIM_COMBINATORS) _foldPseudoNames(parts);
			}
			const inner = _join(parts, !minify, trim);
			return `${open}${inner}${close}`;
		}
		case T_DECLARATION: {
			const name = path.name();
			// WHY: a property is matched by what its name means, not by how it was
			// spelled — §4.3.7 lets any of its letters be written as an escape — so
			// every lookup below reads the unescaped name while the printed one
			// keeps the source's. It costs an `indexOf` where nothing is escaped.
			const meaning = path.unescapedName();
			// Counted rather than listed: a declaration's value is one component 92
			// times in 100, and the list would be built only to be indexed twice.
			const count = path.childCount();
			// `@property`'s `initial-value` is read against the sibling `syntax`
			// descriptor, so it is as opaque as a custom property's own value.
			const custom =
				meaning.startsWith("--") ||
				(_S._inPropertyRule && equalsLowerCase(meaning, "initial-value")) ||
				// `@function`'s `result` is the token stream the call substitutes, so
				// it is opaque the same way — and empty when the function returns the
				// guaranteed-invalid value.
				(_S._inFunctionRule && equalsLowerCase(meaning, "result")) ||
				// A `{}` block standing as the whole value is a token stream the
				// engine holds as written too — no grammar reads it, so a rewrite of
				// it builds a different CSSOM from the same document.
				(count === 1 &&
					path.type(path.childAt(path.node, 0)) === T_SIMPLE_BLOCK &&
					path.blockToken(path.childAt(path.node, 0)) === "{");
			// A value-less declaration is invalid, so it is already ignored — except
			// on a custom property, where the empty value is the guaranteed-invalid
			// one a `var()` fallback reads.
			if (minify && _S._transforms.removeDeadRules && count === 0 && !custom) {
				return "";
			}
			// The name folded to lowercase, where the value below needed it; `name`
			// itself where it did not, which is what the printed name reads as
			// "nothing to fold".
			let lowered = name;
			let value = "";
			if (count !== 0) {
				// Property names match ASCII case-insensitively and a custom property's
				// does not, so skipping it skips the lowercasing. One fold serves both
				// which value rules apply and how the name prints.
				lowered = custom ? meaning : toLowerCaseIfNeeded(meaning);
				const property = custom ? meaning : _standardSpelling(lowered);
				if (custom) {
					// `getPropertyValue()` hands this text back, so a rewritten token
					// would be a different CSSOM; only the boundaries between them go.
					const from = path.start(path.childAt(path.node, 0));
					const to = path.end(path.childAt(path.node, count - 1));
					if (minify) {
						value = _customPropertyValue(path, path.node, writer, from, to);
					} else {
						// Straight from source, so the kept comments in it are already
						// there — claim them, or the writer emits them a second time
						// ahead of the next top-level node.
						writer.takeInserts(from, to);
						value = _S._input.slice(from, to);
						if (to === _S._input.length) value = _closeAtEof(value);
					}
				} else if (property === "unicode-range") {
					// `U+…` tokenizes as numbers, so the generic numeric normalization
					// would corrupt it; each range is shortened as the urange it is.
					let raw = "";
					for (let at = 0; at < count; at++) {
						raw += path.source(path.childAt(path.node, at));
					}
					value = minify
						? raw
								.split(",")
								.map((one) => _minifyUnicodeRange(one.trim()))
								.join(",")
						: raw;
				} else {
					// Value hashes were already shortened by the hash printer, printing in a
					// value context, so this joins the children's text. A shorthand whose
					// value repeats what the notation implies collapses.
					const shorthand = minify
						? _collapseShorthand(path, property, path.node, writer)
						: null;
					if (shorthand === null && count === 1) {
						// What a value is 98 times in 100, and `_join` hands a lone fragment
						// back, so it is rewritten without an array. §5.4.6 step 7 pops a
						// trailing whitespace, so that child is never the `""` case.
						value = _valueFragment(
							writer.get(path.childAt(path.node, 0)),
							property,
							minify
						);
					} else {
						/** @type {string[]} */
						let fragments;
						if (shorthand === null) {
							fragments = [];
							_appendChildTexts(path.node, writer, fragments);
						} else {
							fragments = shorthand;
						}
						// In place: a `map` per transform would allocate an array each.
						for (let i = 0; i < fragments.length; i++) {
							fragments[i] = _valueFragment(fragments[i], property, minify);
						}
						// A substituted value is handed back as written and the string
						// transforms below read space-separated components, so only a value
						// neither covers loses the separators its tokens do not need.
						const separatorsOnly =
							minify &&
							!AUTO_SECOND_VALUE_PROPERTIES.has(property) &&
							!ALPHA_VALUE_PROPERTIES.has(property) &&
							!RATIO_PROPERTIES.has(property) &&
							!_hasSubstitutionInSpan(
								path.start(path.node),
								path.end(path.node)
							);
						value = _join(
							fragments,
							!minify,
							separatorsOnly ? _TRIM_SEPARATORS : _TRIM_NOTHING
						);
					}
					if (minify) {
						value = _dropDefaultSecondValue(property, value);
						value = _numberAlphaValue(property, value);
						value = _dropRatioDenominator(property, value);
					}
				}
			}
			const important = path.important() ? `${soft}!important` : "";
			// Property names match ASCII case-insensitively; a custom property's
			// does not, which is what `custom` already stands for — nor does an
			// `@font-feature-values` sub-rule's, which names a feature value.
			const printedName =
				minify &&
				_S._transforms.foldCase &&
				!custom &&
				!_S._inFeatureValuesRule &&
				lowered !== name
					? asciiLowerCaseName(name)
					: name;
			return `${printedName}:${soft}${value}${important};`;
		}
		case T_AT_RULE:
		case T_QUALIFIED_RULE: {
			// Prefixing reads the prelude's tokens, not its joined text.
			const preludeParts = _S._prefixingOn
				? /** @type {string[]} */ ([])
				: undefined;
			const prelude = _rulePrelude(path, writer, minify, preludeParts);
			const decls = path.declarations();
			// A qualified rule always has a block; an at-rule has one only when its
			// declaration list is non-null — else it is `@…;`.
			if (decls === null) {
				if (minify) _blockSpans.push(_NO_BLOCK_ENTRY);
				// `@charset` names the encoding the *source* was read in, and what is
				// written out is UTF-8 whatever it said — so carrying it over is at
				// best 22 dead bytes and at worst an encoding the output is not in.
				if (
					minify &&
					_S._transforms.removeDeadRules &&
					equalsLowerCase(path.name(), "charset")
				) {
					return "";
				}
				// The rule only goes where no target reads one: a condition this has
				// not come to yet still needs it, and so does an engine that reads it.
				if (
					minify &&
					_S._transforms.resolveCustomAtRules &&
					path.atKeyword() === "custom-media" &&
					_takeCustomMedia(prelude) &&
					!_S._customMediaAllowed
				) {
					return "";
				}
				// No engine reads `@custom-selector`, so the rule always goes once its
				// name is down — but only where `:is()` can carry what it stands for.
				if (
					minify &&
					_S._transforms.resolveCustomAtRules &&
					_S._isSelectorAllowed &&
					path.atKeyword() === "custom-selector" &&
					_takeCustomSelector(prelude)
				) {
					return "";
				}
				return `${prelude};`;
			}
			// Read before the body: composing it is what leaves the block empty, and
			// the drop below asks the same question again.
			const unusedRule = _takeUnusedRule(/** @type {Node} */ (_S._currentNode));
			const rules = path.childRules();
			// `nl` prefixes each item: nothing minifying, a line break beautifying
			// (declarations end in `;`, rules don't).
			const nl = minify ? "" : "\n";
			const {
				body,
				items,
				texts,
				superseded,
				droppedPrefix,
				addedPrefix,
				deadPrefixed,
				spans
			} = _composeBlockBody(
				path,
				decls,
				rules,
				writer,
				minify,
				nl,
				_S._currentNode,
				unusedRule
			);
			if (
				minify &&
				// An empty rule paints nothing, so dropping it leaves the cascade as it
				// was — but only where the block means nothing (`_streamClose` agrees).
				_S._transforms.removeDeadRules &&
				body.length === 0 &&
				// See `_streamClose`: a rule taken out while a `@namespace` after it
				// could still be read would move one up into a live position.
				!(path.parent === null && _S._namespacePrologueOpen) &&
				(path.type() === T_QUALIFIED_RULE ||
					DROPPABLE_WHEN_EMPTY_AT_RULES.has(path.atKeyword()) ||
					unusedRule)
			) {
				// The rules written in it are not empty for its being so, and what the
				// hoist writes for them is rules a later copy can take back.
				_blockSpans.push(
					path.type() === T_QUALIFIED_RULE
						? _NO_BLOCK_ENTRY_QUALIFIED
						: _NO_BLOCK_ENTRY
				);
				{
					const written =
						_writeNested(
							path,
							/** @type {Node} */ (_S._currentNode),
							prelude,
							null,
							true
						) || "";
					if (minify && written.length !== 0) {
						_recordHoistedRule(written, null, 0);
					}
					return written;
				}
			}
			// A rule that says which color scheme it is in says it again as the pair
			// a lowered `light-dark()` reads, and — where it hands the choice to the
			// user's own preference — once more under the query that asks for it.
			let scheme = body;
			let schemeCopy = "";
			if (
				_S._loweringLightDark &&
				_S._sourceNamesLightDark &&
				path.type() === T_QUALIFIED_RULE &&
				body.includes("color-scheme:") &&
				// The pair as this writes it, not either name on its own: a
				// block carrying that is one a lowering pass wrote. An authored
				// `--webpack-light` is a declaration of the author's.
				!body.includes(LIGHT_DARK_WRITTEN) &&
				!body.includes(LIGHT_DARK_WRITTEN_DARK)
			) {
				const written = _COLOR_SCHEME_RE.exec(body);
				const toggle =
					written === null
						? null
						: _lightDarkToggle(written[1].replace(_IMPORTANT, "").trim());
				if (toggle !== null) {
					// The body's own closing `;` went with the minified print, and the
					// toggle's last is the one this block now ends on.
					scheme = `${body};${toggle.toggle.slice(0, -1)}`;
					if (toggle.flip) {
						schemeCopy = `${_PREFERS_DARK}${soft}{${prelude}${soft}{${LIGHT_PROPERTY}:;${DARK_PROPERTY}:initial}}`;
					}
				}
			}
			const rest = `${soft}{${scheme}${nl}}${schemeCopy}`;
			const text = `${prelude}${rest}`;
			// Prefix copies turn one rule into several, so a rewritten rule is not
			// offered for joining: its text no longer describes a single block. Each
			// block's rules are their own siblings, pairing within their scope.
			let out = text;
			if (_S._prefixingOn) {
				// Read and clear here, so the lookahead is the one rule the writer
				// holds — which only a top-level rule ever is — and never a rule
				// further back.
				const parent = path.parent;
				const top = parent === null;
				const scope = _prefixScope(parent);
				out =
					path.type() === T_AT_RULE
						? _prefixAtRule(path, text, prelude, scope, top)
						: _prefixQualifiedRule(
								text,
								/** @type {string[]} */ (preludeParts),
								soft,
								body,
								scope,
								top
							);
			}
			// WHY: pushed whatever it holds, since the parent takes one off per child
			// with a body, so a block carrying no rule still has to be there. A
			// rewritten rule records no nesting — those spans name `text` rather than
			// `out` — but is still the one rule its text says it is. Only a block that
			// recorded something needs an entry of its own, a leaf rule taking the
			// shared one, and nothing is pushed while not minifying.
			if (minify) {
				_blockSpans.push(
					spans === null || out !== text
						? path.type() === T_QUALIFIED_RULE
							? _NO_BLOCK_ENTRY_QUALIFIED
							: _NO_BLOCK_ENTRY
						: {
								bodyAt: prelude.length + soft.length + 1,
								prelude,
								keyPrelude: _openerKey(`${prelude}{`),
								qualified: path.type() === T_QUALIFIED_RULE,
								spans
							}
				);
			}
			// A rewritten rule is several rules with preludes of their own, and each
			// carries this rule's block — so the hoist takes them out. Not where it
			// holds a rule or a scheme copy, each naming the prelude as written.
			const copies =
				out === text ||
				_prefixCopyPreludes.length === 0 ||
				schemeCopy.length !== 0 ||
				_holdsNested(/** @type {Node} */ (_S._currentNode))
					? undefined
					: _prefixCopyPreludes;
			const nested = _writeNested(
				path,
				/** @type {Node} */ (_S._currentNode),
				prelude,
				rest,
				out === text || copies !== undefined,
				copies
			);
			if (nested === null) return "";
			if (out !== text) return out + nested;
			// The run wrote this rule's selectors into itself, so what it returns is
			// the whole of both — `text` being this rule's own `prelude` and `rest`.
			if (nested.length !== 0) {
				if (_nestedTookParent) {
					if (minify) _recordHoistedRule(nested, null, 0);
					return nested;
				}
				if (minify) _recordHoistedRule(nested, text, prelude.length);
				return text + nested;
			}
			// Where the block is what a sibling is compared against, remember the rule
			// so the parent parts it without re-scanning for the `{`. An at-rule
			// remembers its block's entries too, so a sibling's rules can join them.
			if (
				minify &&
				path.type() === T_AT_RULE &&
				MERGEABLE_AT_RULES.has(path.atKeyword())
			) {
				/** @type {RuleEntry[]} */
				const children = [];
				for (let i = 0; i < texts.length; i++) {
					if (texts[i].length === 0) continue;
					if (superseded !== null && superseded.has(i)) continue;
					// The entries have to spell the block this rule printed, prefixes and
					// all: a join rebuilds the body from them, and one built from the
					// unprefixed texts would restore what was dropped.
					if (droppedPrefix !== null && droppedPrefix.has(i)) continue;
					if (deadPrefixed !== null && deadPrefixed.has(items[i])) continue;
					const added = addedPrefix === null ? undefined : addedPrefix.get(i);
					children.push(
						added === undefined
							? _ruleEntryOf(items[i], texts[i])
							: _opaqueEntry(added + texts[i])
					);
				}
				let head = "";
				for (let i = 0; i < children.length - 1; i++) head += children[i].text;
				_setRuleEntry(_S._currentNode, {
					text,
					prelude: prelude.length,
					atRule: true,
					plain: false,
					listable: LIST_NO,
					listKind: LIST_KIND_SELECTOR,
					children,
					head,
					// The block's own merges have run and settled what they grew, so the
					// text above and the children agree; a list one of them still carries
					// concatenated is one this block says is there to settle.
					unordered: _anyUnordered(children)
				});
			}
			if (minify && path.type() === T_QUALIFIED_RULE) {
				// Only a block of declarations lends its selectors to another's list: a
				// nested rule's `&` stands for the whole list and `:is(…)` takes its most
				// specific selector, so joining preludes moves what the nested beat.
				const plain = rules === null || rules.length === 0;
				const parent = path.parent;
				// Which shape a join would read the prelude with — the parent is gone by
				// then. A keyframe selector is a list of its own shape, which
				// `_rulePrelude` has already rewritten `from` in.
				let listKind = LIST_KIND_SELECTOR;
				if (parent !== null) {
					const parentType = path.type(parent);
					if (parentType === T_QUALIFIED_RULE) {
						listKind = LIST_KIND_NESTED;
					} else if (
						parentType === T_AT_RULE &&
						KEYFRAMES_AT_RULE_RE.test(path.atKeyword(parent))
					) {
						listKind = LIST_KIND_KEYFRAME;
					}
				}
				_setRuleEntry(_S._currentNode, {
					text,
					prelude: prelude.length,
					atRule: false,
					plain,
					listable: plain ? LIST_UNKNOWN : LIST_NO,
					listKind,
					children: null,
					head: "",
					unordered: false
				});
			}
			return text;
		}
		case T_RAW:
			// Off-spec passthrough (see `NodeType.Raw`). It sits in a declaration list,
			// so it carries the `;` parting it from the next item, and leaves an entry
			// saying it carries no rule, without which the rules after read the next's.
			if (minify) _blockSpans.push(_NO_BLOCK_ENTRY);
			{
				const raw = path.source();
				let rest = path.end();
				while (
					rest < _S._input.length &&
					isWhitespace(_S._input.charCodeAt(rest))
				) {
					rest++;
				}
				// Where the input ran out inside it, what it left open — a comment, a
				// string, a bracket — would swallow the `;` and `}` written after it.
				return `${rest === _S._input.length ? _closeAtEof(raw) : raw};`;
			}
		case T_HASH: {
			const raw = path.source();
			if (!minify) return raw;
			// A hash is a hex color in a value and an id in a selector, and ids are
			// case-sensitive, so only the former shortens — at any value depth. An id's
			// escapes still shorten, the `#` held back so its first code point is one.
			if (!path.inValue()) {
				return _S._transforms.rewriteEscapes
					? `#${_minifyIdentEscapes(raw.slice(1))}`
					: raw;
			}
			// Inside a function only the known color functions take color hashes, and a
			// substitution's fallback, being the property's value. `paint()` is the
			// exception: its arguments reach a worklet rather than a declaration.
			const parent = path.parent;
			if (parent !== null && path.type(parent) === T_FUNCTION) {
				const fn = path.name(parent).toLowerCase();
				if (
					!COLOR_ARGUMENT_FUNCTIONS.has(fn) &&
					!(SUBSTITUTION_FUNCTIONS.has(fn) && fn !== "paint")
				) {
					return raw;
				}
			}
			const short = _minifyHash(raw);
			const text = short === null ? raw : short;
			// A hex alpha the target cannot read is written as the `rgba()` it names.
			if (_S._hexAlphaAllowed) return text;
			const lowered = _S._transforms.lowerUnsupported
				? _hexAlphaFallback(text)
				: null;
			return lowered === null ? text : lowered;
		}
		default: {
			// Any remaining leaf token (ident, string, url, delim, …) prints verbatim
			// from its source slice.
			const raw = path.source();
			// WHY: §4.3.8 makes a `\` a delim only where a newline follows it —
			// before anything else it escapes that character, the `;`, `}` and `{`
			// this printer writes included, and no other token is a lone `\` (one
			// the input ran out of reads as `�` above). So the newline is not
			// whitespace around the token, it is how the token is spelled.
			return raw === "\\" ? "\\\n" : raw;
		}
	}
};

const _CSS_STRING_ESCAPE_RE = /[\\\n]/g;

/**
 * Spell a rebuilt URL so it parses back to itself: as a url-token when it can
 * be one, otherwise quoted with the delimiter and its escapes written out.
 * @param {string} url the URL to spell
 * @param {string} mark the quote to use when it needs one
 * @returns {string} the `url()` argument
 */
const _serializeUrl = (url, mark) => {
	// Both spellings below the quoted one are the unquoting `transforms.quotes`
	// names, so off they are not this printer's to pick: a rendered payload has
	// no authored quoting left to keep, and the quotes carry any of it.
	if (_S._transforms.normalizeQuotes) {
		if (!_UNQUOTABLE_URL_RE.test(url)) return url;
		const escaped = _escapeUrlBody(url);
		if (escaped !== null) return escaped;
	}
	return (
		mark +
		url.replace(_CSS_STRING_ESCAPE_RE, "\\$&").split(mark).join(`\\${mark}`) +
		mark
	);
};

/**
 * Record a url's `data:` payload for an asynchronous caller and print the
 * marker standing in for it, or `null` when there is nothing to offer. `build`
 * spells the whole `url()` from the answer, so its quoting is decided by what
 * the payload turns out to be rather than by what it was.
 * @param {string} body the url body, unquoted and unescaped
 * @param {(url: string) => string} build the `url()` text around a rebuilt URL
 * @param {string} fallback the text to print when the caller declines
 * @returns {string | null} the marker to print, or null when nothing is offered
 */
const _deferDataUrl = (body, build, fallback) => {
	const read = _readDataUrl(body);
	if (read === null) return null;
	const holes = /** @type {DeferredEmbeddedSource[]} */ (
		_S._deferEmbeddedSource
	);
	const id = holes.length;
	holes.push({
		type: read.type,
		hostType: CSS_TYPE,
		source: read.payload,
		build: (rendered) =>
			typeof rendered !== "string" || rendered === read.payload
				? fallback
				: build(buildDataURI(read.parsed, rendered))
	});
	return deferredWrite(id);
};

/**
 * Read a url's `data:` payload out, for a caller that will render it. `null`
 * when there is nothing to offer — not a data URL, a media type naming no
 * language webpack knows, or a payload that would not round-trip.
 * @param {string} url the url body, unquoted and unescaped
 * @returns {{ parsed: import("../util/dataURL").ParsedDataURI, type: string, payload: string } | null} what it holds, or null
 */
const _readDataUrl = (url) => {
	// Char-code gate so the dominant non-`data:` url costs one read.
	if ((url.charCodeAt(0) | 0x20) !== CC_LOWER_D) return null;
	// A CSS escape is still written here — the quoted form is percent-decoded,
	// not unescaped — so the payload would be read with its backslashes in it.
	if (url.includes("\\")) return null;
	const parsed = parseDataURI(url);
	if (parsed === null) return null;
	const type = languageOfMediaType(parsed.mediaType);
	if (type === undefined) return null;
	const payload = decodeDataURIPayload(parsed);
	if (payload === null || payload === "") return null;
	return { parsed, type, payload };
};

/**
 * Offer a url's `data:` payload to the renderer, and rebuild the URL around
 * what comes back. `null` when nothing should change — not a data URL, a media
 * type naming no language webpack knows, a payload that would not round-trip,
 * or a renderer that declined.
 * @param {string} url the url body, unquoted and unescaped
 * @returns {string | null} the rebuilt URL, or null to emit the original
 */
const _renderDataUrl = (url) => {
	if (_S._renderEmbeddedSource === undefined) return null;
	const read = _readDataUrl(url);
	if (read === null) return null;
	let rendered;
	try {
		rendered = _S._renderEmbeddedSource(read.payload, {
			type: read.type,
			hostType: CSS_TYPE
		});
	} catch (_err) {
		return null;
	}
	// Anything but text is a renderer that did not answer, not a payload to write.
	if (typeof rendered !== "string" || rendered === read.payload) return null;
	return buildDataURI(read.parsed, rendered);
};

module.exports.printer = printer;
