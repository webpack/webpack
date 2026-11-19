/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { CSS_TYPE } = require("../module/ModuleSourceTypeConstants");

const SourceProcessor = require("../util/SourceProcessor");

const { buildDataURI, readEmbeddedDataURI } = require("../util/dataURL");

/**
 * Renders source this stylesheet embeds - a `data:` URL's payload today.
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
	ANGLE_DEGREES,
	ANGLE_UNITS,
	ANIMATION_KEYWORD_SLOTS,
	AUTO_SECOND_VALUE_PROPERTIES,
	BOX_SHORTHANDS,
	CALC_REJECTING_PROPERTIES,
	CANONICAL_NAMES,
	CLAMPED_VALUE_RANGES,
	COLOR_ARGUMENT_FUNCTIONS,
	COLOR_FUNCTIONS,
	COLOR_KEYWORDS,
	COLOR_ONLY_PROPERTIES,
	COMPOUND_CONTINUATIONS,
	CSS_WIDE_KEYWORDS,
	CUBIC_BEZIER_KEYWORDS,
	DEFAULT_GRADIENT_DIRECTIONS,
	DEFAULT_GRADIENT_POSITIONS,
	DISPLAY_SHORT_FORMS,
	DROPPABLE_WHEN_EMPTY_AT_RULES,
	EASING_KEYWORDS,
	FAMILY_LIST_PROPERTIES,
	FEATURELESS_PSEUDO_CLASSES,
	FILTER_FUNCTION_OMITTED,
	FONT_SIZE_KEYWORDS,
	FONT_STRETCH_PERCENTAGES,
	FONT_WEIGHT_NUMBERS,
	GENERIC_FONT_FAMILIES,
	GRADIENT_LAST_POSITIONS,
	GRADIENT_SIDE_ANGLES,
	INTEGER_PROPERTIES,
	LAYER_INITIALS,
	LENGTH_ONLY_FUNCTIONS,
	LINEAR_GRADIENTS,
	MATH_FUNCTION_ARITY,
	MATH_FUNCTION_FOLD,
	MATH_FUNCTION_KEYWORDS,
	MATH_FUNCTION_SUM_ARGUMENTS,
	MERGEABLE_AT_RULES,
	NEGATIVE_ACCEPTING_FUNCTIONS,
	NEGATIVE_ACCEPTING_PROPERTIES,
	NTH_NAMED_EQUIVALENTS,
	NTH_PSEUDO_FUNCTIONS,
	NUMBER_ARGUMENT_FUNCTIONS,
	NUMBER_ONLY_OUTSIDE_CALC_PROPERTIES,
	NUMBER_ZERO_PROPERTIES,
	OMITTABLE_INITIAL_KEYWORDS,
	PAIR_LONGHANDS,
	POSITION_PROPERTIES,
	POSITION_X_KEYWORDS,
	POSITION_Y_KEYWORDS,
	PREFIXED_AT_RULES,
	PREFIXED_SELECTORS,
	RATIO_PROPERTIES,
	REPEAT_STYLE_KEYWORDS,
	REPEAT_STYLE_PROPERTIES,
	REVERSED_GRADIENT_DIRECTIONS,
	SELECTOR_FUNCTIONS,
	SHADOW_PROPERTIES,
	SLASH_BOX_SHORTHANDS,
	STEPPED_FUNCTIONS,
	STEP_POSITION_MINIMUM_COUNTS,
	SUBSTITUTION_FUNCTIONS,
	SVG_USER_UNIT_PROPERTIES,
	SYSTEM_UI_STACK,
	TRANSITION_BEHAVIORS,
	UNIT_CONVERSION_TARGETS,
	UNIT_GROUP_BASE,
	UNSHARED_LONGHAND_KEYWORDS,
	X_AXIS_TRANSFORMS,
	ZERO_ANGLE_FUNCTIONS,
	ZERO_UNIT_KEEPING_PROPERTIES,
	getColorNameToShortest,
	getDeclarationRanks,
	getInitialValueKeywords,
	getKeywordOnlyProperties,
	getPrefixedProperties,
	getPrefixedSpellingKeywords,
	getShorthandInitialKeywords
} = require("./data");
const {
	A,
	DARK_PROPERTY,
	KEYFRAMES_AT_RULE_RE,
	LIGHT_PROPERTY,
	NodeType,
	VENDOR_PREFIX,
	_CC_0: CC_0,
	_CC_APOSTROPHE: CC_APOSTROPHE,
	_CC_COMMA: CC_COMMA,
	_CC_FULL_STOP: CC_FULL_STOP,
	_CC_GREATER_THAN_SIGN: CC_GREATER_THAN_SIGN,
	_CC_HYPHEN_MINUS: CC_HYPHEN_MINUS,
	_CC_LEFT_PARENTHESIS: CC_LEFT_PARENTHESIS,
	_CC_LEFT_SQUARE: CC_LEFT_SQUARE,
	_CC_LOWER_D: CC_LOWER_D,
	_CC_LOW_LINE: CC_LOW_LINE,
	_CC_NUMBER_SIGN: CC_NUMBER_SIGN,
	_CC_PLUS_SIGN: CC_PLUS_SIGN,
	_CC_QUOTATION_MARK: CC_QUOTATION_MARK,
	_CC_REVERSE_SOLIDUS: CC_REVERSE_SOLIDUS,
	_CC_RIGHT_PARENTHESIS: CC_RIGHT_PARENTHESIS,
	_CC_RIGHT_SQUARE: CC_RIGHT_SQUARE,
	_CC_SPACE: CC_SPACE,
	_CC_TILDE: CC_TILDE,
	_CC_UPPER_A: CC_UPPER_A,
	_CC_UPPER_Z: CC_UPPER_Z,
	_IMPORTANT: IMPORTANT,
	_LIST_KIND_KEYFRAME: LIST_KIND_KEYFRAME,
	_LIST_KIND_NESTED: LIST_KIND_NESTED,
	_LIST_KIND_SELECTOR: LIST_KIND_SELECTOR,
	_LIST_NO: LIST_NO,
	_LIST_UNKNOWN: LIST_UNKNOWN,
	_LONE_NUMBER_RE: LONE_NUMBER_RE,
	_NO_RULE_SPANS: NO_RULE_SPANS,
	_NUMERIC_RE: NUMERIC_RE,
	_S: S,
	_SEP: SEP,
	_TRIM_COMBINATORS: TRIM_COMBINATORS,
	_TRIM_CONDITIONS: TRIM_CONDITIONS,
	_TRIM_MATH: TRIM_MATH,
	_TRIM_NOTHING: TRIM_NOTHING,
	_TRIM_SEPARATORS: TRIM_SEPARATORS,
	_UNREADABLE_COLOR_CALL_RE: UNREADABLE_COLOR_CALL_RE,
	_ZERO_LENGTH_RE: ZERO_LENGTH_RE,
	_alphaByteText: alphaByteText,
	_anyUnordered: anyUnordered,
	_appendChildTexts: appendChildTexts,
	_atKeyword: atKeyword,
	_atKeywordOf: atKeywordOf,
	_blockTokenOf: blockTokenOf,
	_canonicalSelectorList: canonicalSelectorList,
	_closeAtEof: closeAtEof,
	_collapseBox: collapseBox,
	_composeBlockBody: composeBlockBody,
	_customPropertyValue: customPropertyValue,
	_declarationsOf: declarationsOf,
	_dropFamilyInitials: dropFamilyInitials,
	_dropImpliedUniversalSelector: dropImpliedUniversalSelector,
	_dropZeroLengthUnit: dropZeroLengthUnit,
	_edgeKeywordRead: edgeKeywordRead,
	_evaluateCalcSum: evaluateCalcSum,
	_foldPseudoNames: foldPseudoNames,
	_hasSubstitutionInSpan: hasSubstitutionInSpan,
	_holdBySignature: holdBySignature,
	_isClosedString: isClosedString,
	_isIdentCodePoint: isAsciiIdentCodePoint,
	_isImportant: isImportant,
	_isUnterminatedUrl: isUnterminatedUrl,
	_join: join,
	_joinSlots: joinSlots,
	_keepKeywordComments: keepKeywordComments,
	_lowercaseConditionParts: lowercaseConditionParts,
	_memoizeBlockBody: memoizeBlockBody,
	_memoizedBlockBody: memoizedBlockBody,
	_minifyColorFunction: minifyColorFunction,
	_minifyPolarColorFunction: minifyPolarColorFunction,
	_nearByteHalf: nearByteHalf,
	_neededPrefixes: neededPrefixes,
	_normalizeExponent: normalizeExponent,
	_normalizeNumber: normalizeNumber,
	_noteRetractedPiece: noteRetractedPiece,
	_opaqueEntry: opaqueEntry,
	_openerKey: openerKey,
	_prefixRemovable: prefixRemovable,
	_prefixScope: prefixScope,
	_printedSource: printedSource,
	_rawName: rawName,
	_rawValue: rawValue,
	_roundSignificant: roundSignificant,
	_ruleEntryOf: ruleEntryOf,
	_rulePrelude: rulePrelude,
	_rulesOf: rulesOf,
	_setHoistedRuns: setHoistedRuns,
	_setRuleEntry: setRuleEntry,
	_setVerbatimLeafPrinter: setVerbatimLeafPrinter,
	_shortestAuthoredFlex: shortestAuthoredFlex,
	_shortestColor: shortestColor,
	_shortestFlexValue: shortestFlexValue,
	_shorthandSlotsReadable: shorthandSlotsReadable,
	_splitPrintedComponents: splitPrintedComponents,
	_splitSelectorList: splitSelectorList,
	_splitTopLevelArguments: splitTopLevelArguments,
	_splitTopLevelSpaces: splitTopLevelSpaces,
	_takeUnusedRule: takeUnusedRule,
	_terminate: terminate,
	_tokenizeCalc: tokenizeCalc,
	_trimCssWhiteSpace: trimCssWhiteSpace,
	_unreadableColorFunction: unreadableColorFunction,
	_unwrapLoneIs: unwrapLoneIs,
	_valueClasses: valueClasses,
	_valueComponents: valueComponents,
	asciiCaseInsensitiveMatch,
	asciiLowercaseName,
	consumeExtraNewline,
	containsSubstitutionFunction,
	escapeIdentifier,
	escapeName,
	isAsciiWhitespace,
	isDigit,
	isHexDigit,
	isIdentCodePoint,
	isIdentStartCodePoint,
	isLetter,
	skipEscape,
	terminateIdentifier,
	toLowerCaseIfNeeded,
	unescapeIdentifier
} = require("./syntax-parser");
/** @typedef {import("./syntax-parser").Node} Node */
/** @typedef {import("./syntax-parser").ComponentValue} ComponentValue */
/** @typedef {import("./syntax-parser").Rule} Rule */
/** @typedef {import("./syntax-parser").BlockSpans} BlockSpans */
/** @typedef {import("./syntax-parser").PrintContext} PrintContext */
/** @typedef {import("./syntax-parser").PrefixScope} PrefixScope */
/** @typedef {import("./syntax-parser").RuleEntry} RuleEntry */
/** @typedef {import("./syntax-parser").CssPath} CssPath */

const { deferredWrite } = SourceProcessor;
const CC_AMPERSAND = "&".charCodeAt(0);
const CC_LOWER_C = "c".charCodeAt(0);
const CC_PERCENTAGE = "%".charCodeAt(0);
const CC_ASTERISK = "*".charCodeAt(0);
const CC_VERTICAL_LINE = "|".charCodeAt(0);
const CC_SEMICOLON = ";".charCodeAt(0);
const CC_LEFT_CURLY = "{".charCodeAt(0);
const CC_RIGHT_CURLY = "}".charCodeAt(0);
// The node types `printer` switches on, commonest first, and the print paths
// test: unoptimized code loads a `NodeType` member per read, a constant none.
const NODE_TYPE_WHITESPACE = NodeType.Whitespace;
const NODE_TYPE_BAD_STRING = NodeType.BadString;
const NODE_TYPE_BAD_URL = NodeType.BadUrl;
const NODE_TYPE_NUMBER = NodeType.Number;
const NODE_TYPE_PERCENTAGE = NodeType.Percentage;
const NODE_TYPE_DIMENSION = NodeType.Dimension;
const NODE_TYPE_FUNCTION = NodeType.Function;
const NODE_TYPE_URL = NodeType.Url;
const NODE_TYPE_STRING = NodeType.String;
const NODE_TYPE_IDENT = NodeType.Ident;
const NODE_TYPE_SIMPLE_BLOCK = NodeType.SimpleBlock;
const NODE_TYPE_DECLARATION = NodeType.Declaration;
const NODE_TYPE_AT_RULE = NodeType.AtRule;
const NODE_TYPE_QUALIFIED_RULE = NodeType.QualifiedRule;
const NODE_TYPE_RAW = NodeType.Raw;
const NODE_TYPE_HASH = NodeType.Hash;
// Stands in for a block node that carries no rules of its own, so a parent
// still takes exactly one entry off for each of its non-declaration children.
/** @type {BlockSpans} */
const NO_BLOCK_ENTRY = Object.freeze({
	bodyAt: -1,
	prelude: "",
	keyPrelude: "",
	qualified: false,
	spans: NO_RULE_SPANS,
	parts: null,
	query: null
});
// The same for a qualified rule, which is still one rule of its own however
// little it can say about what it nests.
/** @type {BlockSpans} */
const NO_BLOCK_ENTRY_QUALIFIED = Object.freeze({
	bodyAt: -1,
	prelude: "",
	keyPrelude: "",
	qualified: true,
	spans: NO_RULE_SPANS,
	parts: null,
	query: null
});

/**
 * @param {number[]} values numbers
 * @returns {number} their sum
 */
const sum = (values) => {
	let total = 0;
	for (const value of values) total += value;
	return total;
};

/**
 * The entry a qualified rule records when it prints as more than its own text.
 * Where that is the prefix copies written in front of it, each is a rule a
 * later one can take back, so the entry names where each ends.
 * @param {string} out what the rule printed
 * @param {string} text the rule's own text
 * @param {string} prelude the rule's printed prelude
 * @param {string} own the rule's own text where a dark-scheme query follows it
 * @param {string} copyBlock the block each copy carries
 * @param {string} schemeCopy the dark-scheme rules written with it, if any
 * @returns {BlockSpans} the entry
 */
const copiedRuleEntry = (out, text, prelude, own, copyBlock, schemeCopy) => {
	if (
		(schemeCopy === "" || own === "") &&
		(out === text || S._prefixCopyPreludes.length === 0)
	) {
		return NO_BLOCK_ENTRY_QUALIFIED;
	}
	/** @type {number[]} */
	const parts = [];
	let at = 0;
	for (const copy of S._prefixCopyPreludes) {
		const len = copy.length + copyBlock.length;
		if (!out.startsWith(copy + copyBlock, at)) return NO_BLOCK_ENTRY_QUALIFIED;
		parts.push(len);
		at += len;
	}
	if (schemeCopy === "") {
		if (out.length !== at + text.length || !out.endsWith(text)) {
			return NO_BLOCK_ENTRY_QUALIFIED;
		}
		parts.push(text.length);
		return { ...NO_BLOCK_ENTRY_QUALIFIED, parts };
	}
	// The copies and the rule, then one query holding each one's dark rule.
	if (!out.startsWith(own, at)) return NO_BLOCK_ENTRY_QUALIFIED;
	parts.push(own.length);
	at += own.length;
	const opens = schemeCopy.indexOf(OWN_PRELUDE);
	const query = schemeCopy.slice(0, schemeCopy.lastIndexOf("{", opens));
	const dark = schemeCopy.slice(opens + OWN_PRELUDE.length, -1);
	if (!out.startsWith(`${query}{`, at)) return NO_BLOCK_ENTRY_QUALIFIED;
	/** @type {number[]} */
	const rules = [];
	for (const copy of S._prefixCopyPreludes) {
		rules.push(copy.length + dark.length);
	}
	rules.push(prelude.length + dark.length);
	if (out.length !== at + query.length + 1 + sum(rules) + 1) {
		return NO_BLOCK_ENTRY_QUALIFIED;
	}
	return {
		...NO_BLOCK_ENTRY_QUALIFIED,
		parts,
		query: { prelude: query, rules }
	};
};

// === Safe (meaning-preserving) value transforms, applied by `printer`
// when minifying. Each is value-identical - the same computed style - so they
// never change what the stylesheet means.

/**
 * The byte offset where `s`'s leading number ends (before its unit / `%`).
 * @param {string} s a number / dimension / percentage token's text
 * @returns {number} the numeric part's length
 */
const numberEnd = (s) => {
	const n = s.length;
	let i = 0;
	const c = s.charCodeAt(0);
	if (c === CC_PLUS_SIGN || c === CC_HYPHEN_MINUS) i++;
	while (i < n && isDigit(s.charCodeAt(i))) i++;
	if (i < n && s.charCodeAt(i) === CC_FULL_STOP) {
		i++;
		while (i < n && isDigit(s.charCodeAt(i))) i++;
	}
	// exponent (`e` / `E`)
	const e = s.charCodeAt(i);
	if (e === 101 || e === 69) {
		let j = i + 1;
		const sign = s.charCodeAt(j);
		if (sign === CC_PLUS_SIGN || sign === CC_HYPHEN_MINUS) j++;
		let k = j;
		while (k < n && isDigit(s.charCodeAt(k))) k++;
		if (k > j) i = k;
	}
	return i;
};

/**
 * Move a number's decimal point, which is exact where dividing a double is not:
 * `416.667` thousandths are `.416667`, not `0.41666700000000003`.
 * @param {string} num a plain number, no exponent
 * @param {number} places how far right, negative for left
 * @returns {string} the shifted number, normalized
 */
const shiftDecimal = (num, places) => {
	const unsigned = num.replace(/^[+-]/, "");
	const dot = unsigned.indexOf(".");
	let digits =
		dot === -1 ? unsigned : unsigned.slice(0, dot) + unsigned.slice(dot + 1);
	// A zero has no sign to keep: `-0ms` is `0s`, as the double path wrote it.
	const sign =
		num.charCodeAt(0) === CC_HYPHEN_MINUS && /[1-9]/.test(digits) ? "-" : "";
	let point = (dot === -1 ? unsigned.length : dot) + places;
	if (point < 0) {
		digits = "0".repeat(-point) + digits;
		point = 0;
	}
	if (point > digits.length) digits += "0".repeat(point - digits.length);
	return normalizeNumber(
		`${sign}${digits.slice(0, point) || "0"}.${digits.slice(point) || "0"}`
	);
};

/**
 * Rewrite a dimension into the shortest unit it is exactly equal in. Only the
 * units CSS Values 4 fixes against each other, and only when the conversion
 * round-trips exactly in doubles - which is what keeps `cm` / `mm` / `q`, none
 * of them binary-exact in `px`, mostly where they were.
 * @param {string} num the normalized numeric text
 * @param {string} unit the token's unit, as written
 * @param {string | null} written the token as written, where it is `num + unit` already
 * @returns {string} the shortest equal dimension
 */
const convertUnit = (num, unit, written) => {
	// The table this parse converts through. Without `convertLengthUnits` the
	// length units are absent, so a `px`, the commonest dimension a stylesheet
	// writes, costs a missing lookup rather than a parse thrown away.
	const from = S._unitScale.get(toLowerCaseIfNeeded(unit));
	if (from === undefined) return written !== null ? written : num + unit;
	const value = Number(num);
	if (!Number.isFinite(value)) return num + unit;
	// A zero length drops its unit outright, so rewriting it says nothing - but a
	// zero time keeps one, and `s` is the shorter of the two it can carry.
	if (value === 0 && from[0] !== "time") return num + unit;
	const base = value * from[1];
	let best = num + unit;
	for (const [candidate, to] of S._unitScale) {
		if (to[0] !== from[0] || to === from) continue;
		if (!UNIT_CONVERSION_TARGETS.has(candidate)) continue;
		// A power-of-ten ratio moves the decimal point, which no double rounds.
		const places = Math.log10(from[1] / to[1]);
		let text;
		if (Number.isInteger(places) && !/e/i.test(num)) {
			text = shiftDecimal(num, places);
		} else {
			const converted = base / to[1];
			if (converted * to[1] !== base) continue;
			text = String(converted);
			if (text.includes("e") || text.includes("E")) continue;
		}
		const dimension = normalizeNumber(text) + candidate;
		if (dimension.length < best.length) best = dimension;
	}
	return best;
};

/**
 * Whether the declaration being printed has an `<integer>` anywhere in its
 * grammar, so a number in it may be one.
 * @returns {boolean} true inside such a declaration
 */
// WHY: the unescaped name, like the declaration printer's own lookups - these
// decide what a value may be rewritten to, so reading `\7a -index` as written
// misses `z-index` and normalizes `1.0` to `1`, which turns a declaration the
// engine drops into one it applies.
const inIntegerProperty = () =>
	S._valueDeclaration !== null &&
	INTEGER_PROPERTIES.has(toLowerCaseIfNeeded(A.name(S._valueDeclaration)));

/**
 * Whether the declaration being printed is one an engine takes no `calc()` in,
 * so a folded term keeps the `calc()` it was written with.
 * @returns {boolean} true inside such a declaration
 */
const inCalcRejectingProperty = () =>
	S._valueDeclaration !== null &&
	CALC_REJECTING_PROPERTIES.has(
		toLowerCaseIfNeeded(A.name(S._valueDeclaration))
	);

/**
 * Whether the declaration being printed reads a bare number as a length of its
 * own, where the engine refuses that number inside a `calc()` - so a term that
 * would be written bare keeps the `calc()` it was written with.
 * @returns {boolean} true inside such a declaration
 */
const inNumberOnlyOutsideCalcProperty = () =>
	S._valueDeclaration !== null &&
	NUMBER_ONLY_OUTSIDE_CALC_PROPERTIES.has(
		toLowerCaseIfNeeded(A.name(S._valueDeclaration))
	);

// A folded term, as a number and its unit.
const TERM_VALUE_RE = /^(-?(?:\d+\.?\d*|\.\d+))([a-z%]*)$/i;

/**
 * Whether writing a value bare would lose the clamp the spec puts on a `calc()`
 * in this property - the literal is thrown out where the `calc()` computes the
 * bound. A unit the range is not stated in loses it too: Chrome takes
 * `oblique 100grad` off and `oblique 2rad` at face value, while clamping either
 * inside a `calc()`.
 * @param {string} property the lower-cased property name
 * @param {string} number the value
 * @param {string} unit its unit, "" when it carries none
 * @returns {boolean} true when the `calc()` has to stay
 */
const losesClamp = (property, number, unit) => {
	const clamped = CLAMPED_VALUE_RANGES.get(property);
	if (clamped === undefined) return false;
	if (!asciiCaseInsensitiveMatch(unit, clamped[0])) return true;
	const value = Number(number);
	return value < clamped[1] || value > clamped[2];
};

/**
 * The same, for a term the math fold is about to write in place of its
 * `calc()`.
 * @param {string} term the folded term
 * @returns {boolean} true when writing it bare would change the declaration
 */
const foldLosesClamp = (term) => {
	if (S._valueDeclaration === null) return false;
	const property = toLowerCaseIfNeeded(A.name(S._valueDeclaration));
	if (!CLAMPED_VALUE_RANGES.has(property)) return false;
	const match = TERM_VALUE_RE.exec(term);
	return match === null || losesClamp(property, match[1], match[2]);
};

// A folded term that is a plain count, which is the only shape a step count
// takes - anything else is not the argument this guard judges.
const INTEGER_TERM_RE = /^\d+$/;

/**
 * Whether writing a folded term bare would take `steps()` under the count its
 * `<step-position>` needs. CSS Easing 2 puts that at two under `jump-none` and
 * one under every other position, and a count below it rejects the function
 * where the `calc()` around the same value is clamped instead.
 * @param {string} term the folded term
 * @param {CssPath} path the accessor positioned on the math function
 * @returns {boolean} true when the `calc()` has to stay
 */
const foldBelowStepCount = (term, path) => {
	// WHY: Folding `steps(calc(1), jump-none)` to `steps(1,jump-none)` printed a
	// function the source did not name. Measured over three engines: WebKit reads
	// the source and drops the printed form, while Blink rejects both - which is
	// why one engine alone could not see it.
	const parent = path.parent;
	if (
		parent === null ||
		path.type(parent) !== NodeType.Function ||
		!INTEGER_TERM_RE.test(term) ||
		asciiLowercaseName(unescapeIdentifier(rawName(parent))) !== "steps"
	) {
		return false;
	}
	// An omitted position is `end`, which takes one. A position this cannot read
	// - an unknown spelling, or a substitution where the keyword goes - reads as
	// the largest, so the fold declines rather than guess what it resolves to.
	let minimum = 1;
	let afterComma = false;
	const count = path.childCount(parent);
	for (let at = 0; at < count; at++) {
		const child = path.child(at, parent);
		const type = path.type(child);
		if (type === NodeType.Comma) {
			afterComma = true;
			continue;
		}
		// Before the comma stands the count itself, and either side may carry
		// whitespace or a comment between the arguments.
		if (
			!afterComma ||
			type === NodeType.Whitespace ||
			type === NodeType.Comment
		) {
			continue;
		}
		const named =
			type === NodeType.Ident
				? STEP_POSITION_MINIMUM_COUNTS.get(
						asciiLowercaseName(unescapeIdentifier(rawValue(child)))
					)
				: undefined;
		minimum = named === undefined ? 2 : named;
		break;
	}
	return Number(term) < minimum;
};

/**
 * Put back the fraction that keeps a number a `<number>` token, in the spelling
 * the rest of the printer uses - one fractional digit, and no leading zero.
 * @param {string} num a normalized number with no fraction left
 * @returns {string} the same value, still spelled as a `<number>`
 */
const keepFraction = (num) => {
	const out = `${num}.0`;
	if (out.charCodeAt(0) === CC_0) return out.slice(1);
	return out.charCodeAt(0) === CC_HYPHEN_MINUS && out.charCodeAt(1) === CC_0
		? `-${out.slice(2)}`
		: out;
};

/**
 * Whether a percentage read as a color channel lands on a byte's half, past the
 * digits rounding keeps. Engines disagree on which byte that is - `66.862745098%`
 * paints 171 in Chromium and `66.8627%` paints 170 - so its digits are its own.
 * @param {string} num the normalized number, without its `%`
 * @returns {boolean} true when the written digits are what pick the byte
 */
const onByteHalf = (num) =>
	num.length > 6 && nearByteHalf((Number(num) * 255) / 100);

/**
 * Whether the token printed is a percentage `rgb()` reads as one of its bytes.
 * @param {CssPath} path the accessor, at the token
 * @returns {boolean} true for a percentage argument of `rgb()` or `rgba()`
 */
const isRgbChannel = (path) => {
	if (path.type() !== NodeType.Percentage) return false;
	const parent = path.parent;
	if (parent === null || path.type(parent) !== NodeType.Function) return false;
	const name = asciiLowercaseName(unescapeIdentifier(rawName(parent)));
	return name === "rgb" || name === "rgba";
};

// A unit that would continue a number's exponent: `e3`, `E-1`.
const EXPONENT_LIKE_UNIT_RE = /^e[+-]?\d/i;

/**
 * Normalize a number / dimension / percentage token: normalize the numeric part,
 * then round it and reach for a shorter equal unit. A `@supports` test gets the
 * spelling alone and keeps a written fraction, since `z-index:1.0` is no integer.
 * @param {string} text the token's source text
 * @param {boolean} channel whether it is a percentage `rgb()` reads as a byte
 * @returns {string} the normalized token
 */
const normalizeNumericToken = (text, channel) => {
	const end = numberEnd(text);
	// A unit identifier matches ASCII case-insensitively, so `1PX` is `1px` - and
	// the three units spelled with a capital keep the spelling everything writes.
	const written = text.slice(end);
	let unit = written;
	// One fold of the unit for both jobs below - how it is printed, and whether
	// it is an angle. `toLowerCase` hands back the string it was given where
	// nothing folds, so a unit already lowercase is the same object.
	const lowered = unit.toLowerCase();
	// A substituted value is handed back as the tokens it was written as, so the
	// spelling there is the author's; `lowered` still answers the angle question.
	if (lowered !== unit && !S._inSubstitutedValue && S._transforms.foldCase) {
		// Only a unit that carried a capital can have a canonical spelling to look
		// up, so the table is read for the shouted units alone.
		const folded = asciiLowercaseName(unit);
		const canonical = CANONICAL_NAMES.get(folded);
		unit = canonical === undefined ? folded : canonical;
	}
	if (!S._transforms.shortenNumbers) {
		return unit === written ? text : text.slice(0, end) + unit;
	}
	// The token as written is the answer 9 times in 10, so it is handed back
	// itself wherever nothing below changed a part of it.
	const numText = end === text.length ? text : text.slice(0, end);
	let num = normalizeNumber(numText);
	// A negative zero is zero outside a math function, where only a division by
	// it (`1/-0`) tells the two apart.
	if (
		num === "-0" &&
		S._mathFunctionDepth === 0 &&
		!S._inSupportsPrelude &&
		!S._inCustomProperty
	) {
		num = "0";
	}
	// A tested `calc(1px+2px)` holds `+2px`: dropping its sign would part it into
	// two terms, a different token stream under test.
	if (S._inSupportsPrelude && text.charCodeAt(0) === CC_PLUS_SIGN) {
		num = `+${num}`;
	}
	// `normalizeNumber` hands an exponent back as written; a tested or
	// substituted one stays so, and elsewhere an unknown context may read `<integer>`.
	// A unit like `e3` would read as the exponent of a number written plainly.
	if (
		num === numText &&
		(num.includes("e") || num.includes("E")) &&
		!EXPONENT_LIKE_UNIT_RE.test(written) &&
		!S._inSupportsPrelude &&
		!S._inCustomProperty &&
		S._steppedFunctionDepth === 0
	) {
		num = normalizeExponent(
			num,
			unit === "" && (S._valueDeclaration === null || inIntegerProperty())
		);
	}
	const same = num === numText && unit === written;
	// An all-zero fraction still makes this a `<number>`, not an `<integer>`
	// (`grid-row:1.0` computes `auto`). Property read last, it is the costlier one.
	const dot = text.indexOf(".");
	if (
		dot !== -1 &&
		dot < end &&
		!num.includes(".") &&
		!num.includes("e") &&
		(S._inSupportsPrelude || (unit === "" && inIntegerProperty()))
	) {
		return keepFraction(num) + unit;
	}
	// WHY: `round()`, `mod()` and `rem()` are step functions of their arguments,
	// so a rewrite holding everywhere else does not hold inside one. `4.5cm` and
	// `45mm` are the same length, yet headless Chromium reads
	// `round(down,4.5cm,1.5cm)` as `3cm` and `round(down,45mm,15mm)` as `4.5cm`.
	if (
		S._inSupportsPrelude ||
		S._inCustomProperty ||
		S._steppedFunctionDepth !== 0
	) {
		return same ? text : num + unit;
	}
	if (ANGLE_UNITS.has(lowered)) return same ? text : num + unit;
	// Inside a math function the engine does its own arithmetic on the number,
	// which no layout step models, so it keeps every digit there.
	const rounded =
		(channel && lowered === "%" && onByteHalf(num)) ||
		S._mathFunctionDepth !== 0
			? num
			: roundSignificant(num, lowered);
	// A bare number has no unit to convert.
	if (unit === "") return rounded;
	const converted = convertUnit(
		rounded,
		unit,
		same && rounded === num ? text : null
	);
	// A token moved into another unit is a spelling a second pass would round
	// and convert from there, so it goes through once more; each move is shorter.
	return toLowerCaseIfNeeded(converted.slice(numberEnd(converted))) === lowered
		? converted
		: normalizeNumericToken(converted, false);
};

// `calc()` of a zero percentage and one length, either way round.
const ZERO_PERCENT_SUM_RE =
	/^calc\((?:0%\s*([+-])\s*([+-]?(?:\d+\.?\d*|\.\d+)[a-z]+)|([+-]?(?:\d+\.?\d*|\.\d+)[a-z]+)\s*[+-]\s*0%)\)$/i;

/**
 * The length a `calc()` adding or subtracting a zero percentage to one says.
 * @param {string} argument a printed argument
 * @returns {string | null} the length, or null where it is no such sum
 */
const dropZeroPercentTerm = (argument) => {
	const match = ZERO_PERCENT_SUM_RE.exec(argument);
	if (match === null) return null;
	if (match[3] !== undefined) return match[3];
	const length = match[2];
	if (match[1] === "+") return length;
	const sign = length.charCodeAt(0);
	if (sign === CC_HYPHEN_MINUS) return length.slice(1);
	return `-${sign === CC_PLUS_SIGN ? length.slice(1) : length}`;
};

/**
 * The units an expression was written with, which a gated length collapse may
 * still print back into.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @returns {Set<string>} the lowercased units
 */
const writtenUnits = (tokens) => {
	/** @type {Set<string>} */
	const units = new Set();
	for (const token of tokens) {
		if (token.unit !== "") units.add(toLowerCaseIfNeeded(token.unit));
	}
	return units;
};

// The significant digits a double holds exactly, past which a fold's answer is
// its arithmetic's noise: `6 / 10 - 0.375` is `.22499999999999998`.
const EXACT_DIGITS = 15;

/**
 * Round a folded result the way an authored number is rounded - the fold prints
 * a double back in full, and `6 / 10 - 0.375` is `.22499999999999998`. The
 * exclusions are the token printer's own: a `@supports` prelude and a custom
 * property keep what was written, and a stepped function is a step of its
 * argument.
 * @param {string} text the printed numeric text
 * @param {string} unit the unit it carries, empty or `%` for none
 * @param {boolean} inSum whether it stays a term of a `calc()` sum, which the engine adds up itself
 * @returns {string} the rounded text, or `text`
 */
const roundCalcResult = (text, unit, inSum) => {
	if (
		S._inSupportsPrelude ||
		S._inCustomProperty ||
		S._steppedFunctionDepth !== 0 ||
		// A nested fold is a term the expression around it still has to reduce, so
		// it keeps every digit it has: rounding here and again outside would land
		// the answer a rounding away from the one number it names.
		S._mathFunctionDepth > 1
	) {
		return text;
	}
	// The double's own last bits go first: no engine lays them out apart.
	const exact = normalizeNumber(Number(text).toPrecision(EXACT_DIGITS));
	const kept = exact.length < text.length && !/e/i.test(exact) ? exact : text;
	// A term the engine still adds to another is placed by the sum, so it keeps
	// its digits rather than land alike on its own.
	if (inSum) return kept;
	if (S._foldingColorChannel) return roundSignificant(kept);
	const lowered = toLowerCaseIfNeeded(unit);
	// Noise past a short answer, as `.225` above, is measured on what is kept.
	if (Number(Number(text).toPrecision(EXACT_DIGITS - 1)) === Number(kept)) {
		return roundSignificant(kept, lowered);
	}
	// WHY: anything else against the whole double: WebKit divides 344px by
	// `calc(16 / 9)` to 193.5px, where `1.77777777777778` floors below it.
	return roundSignificant(text, lowered);
};

/**
 * Print one collapsed term back.
 * @param {string} key the sum's one key
 * @param {number} coefficient its value, in the key's base unit
 * @param {Set<string>} written the units the expression was written with
 * @param {boolean=} inSum whether it stays a term of a `calc()` sum
 * @returns {string | null} the printed value, or `null` when it does not print back exactly
 */
const printCalcTerm = (key, coefficient, written, inSum = false) => {
	const base = UNIT_GROUP_BASE.get(key);
	// A number, a percentage or a unit outside the conversion table counts in
	// itself, so the coefficient is already what it prints as.
	if (base === undefined) {
		const text = normalizeNumber(String(coefficient));
		return Number(text) === coefficient
			? roundCalcResult(text, key, inSum) + key
			: null;
	}
	// Counted in the group's base unit, so every unit of the group is a candidate
	// and each is divided into directly: `1cm + 1mm` is exactly `11mm`, and
	// reaching it through `px` first would lose it - no `px` count equals it.
	/** @type {string | null} */
	let best = null;
	const lengthGated = key === "length" && !S._convertLengthUnits;
	for (const [candidate, to] of ABSOLUTE_UNIT_SCALE) {
		if (to[0] !== key) continue;
		// Gated, a sum may still collapse into a unit it was written with - that
		// introduces none - but not into one reached only to save bytes.
		if (lengthGated && candidate !== base[0] && !written.has(candidate)) {
			continue;
		}
		// A unit the expression was written in is always one it may stay in.
		if (
			candidate !== base[0] &&
			!UNIT_CONVERSION_TARGETS.has(candidate) &&
			!written.has(candidate)
		) {
			continue;
		}
		// Every scale counts at least one of the group's smallest step, so the
		// quotient is no larger than the finite coefficient.
		const value = coefficient / to[1];
		const text = normalizeNumber(String(value));
		if (Number(text) !== value || text.includes("e") || text.includes("E")) {
			continue;
		}
		const dimension = roundCalcResult(text, candidate, inSum) + candidate;
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
const printCalcSum = (sum, written) => {
	if (sum.size > 1) {
		// Every term an angle: they add as degrees, the one unit all of them convert to.
		let degrees = 0;
		for (const [key, coefficient] of sum) {
			const scale = ANGLE_DEGREES.get(key);
			if (scale === undefined) {
				degrees = Number.NaN;
				break;
			}
			degrees += coefficient * scale;
		}
		if (Number.isFinite(degrees)) {
			return printCalcTerm("deg", degrees, written);
		}
	}
	let text = "";
	for (const [key, coefficient] of sum) {
		const term = printCalcTerm(
			key,
			text === "" ? coefficient : Math.abs(coefficient),
			written,
			sum.size > 1
		);
		if (term === null) return null;
		text += text === "" ? term : `${coefficient < 0 ? " - " : " + "}${term}`;
	}
	// An evaluated sum holds a term at least, so `text` is never empty here.
	return text;
};

/**
 * Split a tokenized argument list on its top-level commas.
 * @param {{ type: string, value: number, unit: string }[]} tokens the tokens
 * @returns {{ type: string, value: number, unit: string }[][]} one list per argument
 */
const splitMathArguments = (tokens) => {
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
const reduceMathArguments = (fn, inner) => {
	if (!S._transforms.reduceFunctions) return null;
	const positions = MATH_FUNCTION_SUM_ARGUMENTS.get(fn);
	// The same rewrite a stepped function's arguments refuse.
	if (positions === undefined || S._steppedFunctionDepth > 0) return null;
	const parts = splitTopLevelArguments(inner);
	let changed = false;
	for (const position of positions) {
		if (position >= parts.length) return null;
		const tokens = tokenizeCalc(parts[position]);
		if (tokens === null) return null;
		const cursor = { at: 0 };
		const sum = evaluateCalcSum(tokens, cursor);
		if (sum === null || cursor.at !== tokens.length) return null;
		const text = printCalcSum(sum, writtenUnits(tokens));
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
const foldMathFunction = (fn, inner) => {
	if (!S._transforms.reduceFunctions) return null;
	const arity = MATH_FUNCTION_ARITY.get(fn);
	if (arity === undefined) return null;
	// WHY: a fold standing in a stepped function's argument prints in whichever
	// unit is shortest, which is the rewrite that function's own arguments refuse
	// - Chromium reads `round(down,4.5cm,1.5cm)` and `round(down,45mm,15mm)` as
	// different lengths. Its own result is not an argument of one, so the deciding
	// depth is the one above this call.
	if (S._steppedFunctionDepth - (STEPPED_FUNCTIONS.has(fn) ? 1 : 0) > 0) {
		return null;
	}
	// A leading keyword the grammar offers (`round(down, ...)`) is not an
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
	const tokens = tokenizeCalc(body);
	if (tokens === null) return null;
	const args = splitMathArguments(tokens);
	if (args.length < arity[0] || args.length > arity[1]) return null;
	/** @type {Map<string, number>[]} */
	const sums = [];
	for (const argument of args) {
		const cursor = { at: 0 };
		const sum = evaluateCalcSum(argument, cursor);
		if (sum === null || cursor.at !== argument.length) return null;
		sums.push(sum);
	}
	// `calc()` is the one that is not a single value: it is whatever sum its
	// argument reduced to, which may still hold two units.
	const written = writtenUnits(tokens);
	if (fn === "calc") return printCalcSum(sums[0], written);
	// Every function with an arity but `calc()` has a fold (pinned by a test).
	const fold =
		/** @type {NonNullable<ReturnType<typeof MATH_FUNCTION_FOLD.get>>} */ (
			MATH_FUNCTION_FOLD.get(fn)
		);
	const argument = fold.read(sums);
	if (argument === null) return null;
	const value = fold.apply(argument[1], keyword, fold.table);
	if (value === null) return null;
	return printCalcTerm(
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
const hexAlphaFallback = (text) => {
	const body = text.slice(1);
	const n = body.length;
	if (text.charCodeAt(0) !== CC_NUMBER_SIGN || (n !== 4 && n !== 8)) {
		return null;
	}
	for (let i = 0; i < n; i++) {
		if (!isHexDigit(body.charCodeAt(i))) return null;
	}
	const wide = n === 8;
	/** @type {number[]} */
	const parts = [];
	for (let i = 0; i < 4; i++) {
		const digits = wide ? body.slice(i * 2, i * 2 + 2) : body[i] + body[i];
		parts.push(Number.parseInt(digits, 16));
	}
	// An opaque alpha is no alpha to spell, and `minifyHash` has already written
	// that color without one.
	if (parts[3] === 255) return null;
	// Transparent black is the keyword, which is shorter and as old as CSS 2.
	if (parts[0] === 0 && parts[1] === 0 && parts[2] === 0 && parts[3] === 0) {
		return "transparent";
	}
	return `rgba(${parts[0]},${parts[1]},${parts[2]},${alphaByteText(parts[3])})`;
};

/**
 * Minify a hash token (`#...`) when it is a hex color: opaque (3/6 digits, and
 * 4/8 whose alpha is opaque) -> the shortest color; with a real alpha (4/8
 * digits) -> lowercase + collapse pairs (kept hex). Returns null when it is not a
 * hex color - e.g. a selector id - so it is
 * left verbatim.
 * @param {string} text the hash token text
 * @returns {string | null} the minified hex/name, or null
 */
const minifyHash = (text) => {
	if (!S._transforms.shortenColors) return null;
	const body = text.slice(1);
	const n = body.length;
	if (n !== 3 && n !== 4 && n !== 6 && n !== 8) return null;
	for (let i = 0; i < n; i++) {
		if (!isHexDigit(body.charCodeAt(i))) return null;
	}
	const low = body.toLowerCase();
	if (n === 3) {
		return shortestColor(
			Number.parseInt(low[0] + low[0], 16),
			Number.parseInt(low[1] + low[1], 16),
			Number.parseInt(low[2] + low[2], 16)
		);
	}
	if (n === 6) {
		return shortestColor(
			Number.parseInt(low.slice(0, 2), 16),
			Number.parseInt(low.slice(2, 4), 16),
			Number.parseInt(low.slice(4, 6), 16)
		);
	}
	// A fully opaque alpha says nothing, and the form without it asks nothing of
	// the target's hex-alpha support either.
	if (n === 4) {
		if (low[3] !== "f") return `#${low}`;
		return shortestColor(
			Number.parseInt(low[0] + low[0], 16),
			Number.parseInt(low[1] + low[1], 16),
			Number.parseInt(low[2] + low[2], 16)
		);
	}
	if (low[6] === "f" && low[7] === "f") {
		return shortestColor(
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
const unprefixedAtRule = (name) =>
	name.slice(
		/** @type {RegExpExecArray} */ (VENDOR_PREFIX.exec(name))[1].length
	);

/**
 * Drop the prefixed rule this one is the unprefixed twin of. The pair is usually
 * adjacent - every stylesheet writes the prefixed spelling first - but nothing
 * in between matters: a piece stays retractable until the stylesheet ends, and a
 * nested rule until its parent assembles its body.
 * @param {PrefixScope} scope the block's running sibling state
 * @param {string} signature the unprefixed rule's sibling signature
 * @returns {void}
 */
const dropPrefixTwin = (scope, signature) => {
	// Both ways it is held, never one: a rule written out leaves `pending` as its
	// piece is noted, so one signature's twins are split across the two.
	const retractable = scope.retractable;
	if (retractable !== null) {
		const pieces = retractable.get(signature);
		if (pieces !== undefined) {
			for (const at of pieces) {
				/** @type {PrintContext} */ (S._stream.writer).retract(at);
				noteRetractedPiece(at);
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
				/** @type {PrintContext} */ (S._stream.writer).retract(one.piece);
				noteRetractedPiece(one.piece);
			} else {
				// Held as a node until a streamed parent gives it a piece, so one
				// with no piece has its node.
				if (scope.dead === null) scope.dead = new Set();
				scope.dead.add(/** @type {Node} */ (one.node));
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
 * writes it out takes as a piece of its own, and - for a nested one - as the
 * node its parent skips while assembling its body, for the parents that do.
 * @param {PrefixScope} scope the block's running sibling state
 * @param {string} signature the rule's sibling signature
 * @param {boolean} top whether the rule is the stylesheet's own
 * @param {Set<string> | null} missing the per-selector signatures a list is still
 * short of, or null where one twin of the whole rule is what it waits for
 * @returns {void}
 */
const holdPrefixTwin = (scope, signature, top, missing) => {
	S._prefixDropCandidate = { node: S._walkNode, signature, missing };
	if (top) return;
	if (missing !== null) {
		if (scope.covering === null) scope.covering = [];
		scope.covering.push({ missing, piece: -1, node: S._walkNode });
		return;
	}
	if (scope.pending === null) scope.pending = new Map();
	holdBySignature(scope.pending, signature, S._walkNode);
};

/**
 * An at-rule (`@keyframes`), prefixed against the target: a prefixed copy is
 * prepended for each prefix a target still needs, and a prefixed rule no target
 * needs is dropped once its unprefixed twin has been seen. The `@name`'s prefix
 * is stripped for the sibling signature, so `@-webkit-keyframes x` and
 * `@keyframes x` pair up. Siblings are the rules of the block it sits in.
 * @param {CssPath} path the accessor on the at-rule
 * @param {string} ruleText the rule's own serialized text
 * @param {string} prelude the rule's serialized prelude (`@name ...`)
 * @param {string} keyword the `@name` as the prelude prints it
 * @param {PrefixScope} scope the block's running sibling state
 * @param {boolean} top whether the rule is the stylesheet's own, which is the only
 * one whose text is still a piece a twin can take back
 * @returns {string} the rule text, with prefixed copies added or itself dropped
 */
const prefixAtRule = (path, ruleText, prelude, keyword, scope, top) => {
	const seen = scope.seen;
	// The name is read from the source, but cut from the printed text, where a
	// rewritten escape can make it shorter than it was written.
	const name = atKeyword(rawName(path.node));
	const prefixed = VENDOR_PREFIX.test(name);
	const base = prefixed ? unprefixedAtRule(name) : name;
	if (!PREFIXED_AT_RULES.has(base)) return ruleText;
	// This rule's cross-prefix identity: the prelude with the `@name` folded to its
	// unprefixed, lowercased spelling, so a cased `@Keyframes` and a prefixed
	// `@-webkit-keyframes` share it (at-rule names are case-insensitive).
	const signature = `@${base}${prelude.slice(keyword.length)}`;
	if (prefixed) {
		const removable = prefixRemovable(PREFIXED_AT_RULES, base, name);
		if (seen.has(signature) && removable) return "";
		seen.add(`${signature}\0${name}`);
		// Its twin may still be a later rule, which is where it is dropped.
		if (removable) holdPrefixTwin(scope, signature, top, null);
		return ruleText;
	}
	seen.add(signature);
	dropPrefixTwin(scope, signature);
	const needed = neededPrefixes(PREFIXED_AT_RULES, base);
	if (needed === null) return ruleText;
	let out = "";
	for (const spelling of needed) {
		// Skip only a spelling the source already carries, marked when the prefixed
		// at-rule is met. A copy is still added per unprefixed rule of this
		// signature, so a later `@keyframes` keeps its prefixed twin winning.
		if (seen.has(`${signature}\0${spelling}`)) continue;
		out += `@${spelling}${ruleText.slice(keyword.length)}`;
	}
	return out + ruleText;
};

// The prefixed spelling of a prefixable selector back to `[base, prefix]`, built
// once from the forward table so a prefixed selector is recognized for removal.
// BCD's prefix concatenates onto the base, so the spelling is exact.
/** @type {Map<string, [string, string]> | null} */
let prefixedSelectorNames = null;
/**
 * @param {string} name a selector's pseudo name
 * @returns {[string, string] | undefined} its `[base, prefix]` when prefixed
 */
const prefixedSelectorName = (name) => {
	if (prefixedSelectorNames === null) {
		prefixedSelectorNames = new Map();
		for (const [base, spellings] of PREFIXED_SELECTORS) {
			for (const [spelling] of spellings) {
				prefixedSelectorNames.set(spelling, [base, spelling]);
			}
		}
	}
	return prefixedSelectorNames.get(name);
};

// A selector prelude part split at its `(`: a functional pseudo prints as one
// token (`dir(rtl)`), so its name is matched and rewritten apart from the
// argument that carries over unchanged. A bare pseudo has no `(`.
/**
 * @param {string} part a printed prelude token
 * @returns {string} its name, without any `(argument)`
 */
const selectorPartName = (part) => {
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
const prefixablePseudo = (part) => {
	const name = toLowerCaseIfNeeded(selectorPartName(part));
	return (
		PREFIXED_SELECTORS.has(name) || prefixedSelectorName(name) !== undefined
	);
};

/**
 * One selector of a rule's prelude: the tokens it spans, and the sole prefixable
 * pseudo in it - `-1` where it has none, `-2` where it has more than one, which
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
const prefixableSelectors = (parts) => {
	// Nothing is built for a prelude that carries no prefixable pseudo, which is
	// nearly every one: the scan below only reads the tokens after a `:`.
	let any = false;
	for (let i = 1; i < parts.length; i++) {
		if (parts[i - 1] === ":" && prefixablePseudo(parts[i])) {
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
			while (from < to && parts[from] === SEP) from++;
			while (to > from && parts[to - 1] === SEP) to--;
			selectors.push({ start: from, end: to, at });
			start = i + 1;
			at = -1;
			continue;
		}
		if (i !== 0 && parts[i - 1] === ":" && prefixablePseudo(parts[i])) {
			at = at === -1 ? i : -2;
		}
	}
	return selectors;
};

/**
 * A qualified rule prefixed against the target, for each selector of its list
 * that is a prefixable pseudo (`::placeholder`): a copy carrying the pseudo's
 * engine spelling is prepended for each prefix a target needs, and a
 * prefixed-only rule no target needs is dropped once its unprefixed twin has
 * been seen. A copy holds only the selectors that need that one prefix - an
 * engine drops a whole list over one selector it cannot parse, so a copy must
 * never mix spellings. The author's colons carry over.
 * @param {string} ruleText the rule's own serialized text
 * @param {string[]} parts the printed prelude tokens
 * @param {string} block the block each copy writes, `{` and the space before it included
 * @param {PrefixScope} scope the block's running sibling state
 * @param {boolean} top whether the rule is the stylesheet's own, which is the only
 * one whose text is still a piece a twin can take back
 * @returns {string} the rule text, with prefixed copies added or itself dropped
 */
const prefixQualifiedRule = (ruleText, parts, block, scope, top) => {
	S._prefixCopyPreludes = [];
	const seen = scope.seen;
	const selectors = prefixableSelectors(parts);
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
		const nameOnly = toLowerCaseIfNeeded(selectorPartName(raw));
		const found = prefixedSelectorName(nameOnly);
		// One spelling for the whole list: a list mixing a vendor-spelled pseudo
		// with a plainly spelled one, or with a second spelling, is neither this
		// rule's twin nor a copy of it.
		if (found !== undefined) {
			if (listPrefix !== undefined && listPrefix !== found[1]) return ruleText;
			listPrefix = found[1];
		}
		bases.push(found === undefined ? nameOnly : found[0]);
		args.push(raw.slice(selectorPartName(raw).length));
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
		return join(out, false, TRIM_COMBINATORS);
	};
	// This rule's cross-prefix identity: every prefixable pseudo folded to its
	// unprefixed spelling, so a prefixed list and its twin pair up - in sorted
	// order, since a list is a set and the printer writes either one ordered.
	/** @type {string[]} */
	const unprefixed = [];
	for (let i = 0; i < selectors.length; i++) {
		unprefixed.push(
			preludeOf((j) =>
				j !== i ? null : selectors[i].at === -1 ? "" : bases[i] + args[i]
			)
		);
	}
	const signature = `s${unprefixed.sort().join(",")}`;
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
				prefixRemovable(PREFIXED_SELECTORS, base, listPrefix)
		);
		// Covered when every selector is: a list of twins says the same as one twin
		// of the list, and the rules writing them need not be one rule.
		const missing =
			apart === null ? null : new Set(apart.filter((one) => !seen.has(one)));
		const covered = missing === null ? seen.has(signature) : missing.size === 0;
		if (covered && removable) return "";
		seen.add(`${signature}\0${listPrefix}`);
		// Its twin may still be a later rule, which is where it is dropped.
		if (removable) holdPrefixTwin(scope, signature, top, missing);
		return ruleText;
	}
	seen.add(signature);
	dropPrefixTwin(scope, signature);
	// Each selector on its own as well: this rule writes every one of them, so a
	// prefixed list waiting on any is that much nearer covered.
	if (apart !== null) {
		for (const one of apart) {
			seen.add(one);
			dropPrefixTwin(scope, one);
		}
	}
	/** @type {(Set<string> | null)[]} */
	// WHY: one copy per spelling, never per engine. An engine not knowing one of a
	// list's selectors drops the list whole, and two names of one engine arrived in
	// different versions - `::-webkit-input-placeholder` in Chrome 6 and
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
				: neededPrefixes(PREFIXED_SELECTORS, bases[i]);
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
		// Ordered as the rule it copies prints, and as it prints read back.
		const list = canonicalSelectorList(
			preludeOf((i) => {
				const one = needed[i];
				return one === null ||
					!one.has(spelling) ||
					!vendorArgumentsKeepSpecificity(spelling, args[i])
					? null
					: spelling + args[i];
			})
		);
		// Every selector of it was left out: there is nothing to copy.
		if (list.length === 0) continue;
		// The copy names fewer selectors than the list where some take no such
		// spelling, and the source may carry that copy as its own rule.
		/** @type {string[]} */
		const copied = [];
		for (let i = 0; i < selectors.length; i++) {
			const one = needed[i];
			if (one === null || !one.has(spelling)) continue;
			copied.push(preludeOf((j) => (j === i ? bases[i] + args[i] : null)));
		}
		if (seen.has(`s${copied.sort().join(",")}\0${spelling}`)) continue;
		S._prefixCopyPreludes.push(list);
		out += list + block;
	}
	return out + ruleText;
};

// One class, attribute or plain pseudo-class: the specificity a vendor
// `:-webkit-any()` or `:-moz-any()` counts itself as, whatever it holds.
const ONE_CLASS_SELECTOR_RE =
	/^(?:\.(?:[-\w\u0080-\uFFFF]|\\.)+|\[[^\]]*\]|:[-\w\u0080-\uFFFF]+)$/;

/**
 * Whether a vendor spelling of a functional pseudo-class matches as specifically
 * as the standard one: `:is()` takes its most specific argument's weight, and
 * its vendor `-any()` forms one pseudo-class's, so each argument has to be that.
 * @param {string} spelling the vendor spelling the copy writes
 * @param {string} args the pseudo-class's arguments, parentheses included, or ""
 * @returns {boolean} true when the copy cascades as the rule it copies
 */
const vendorArgumentsKeepSpecificity = (spelling, args) => {
	if (args.length === 0 || !spelling.endsWith("-any")) return true;
	for (const one of splitSelectorList(args.slice(1, -1))) {
		if (!ONE_CLASS_SELECTOR_RE.test(one.trim())) return false;
	}
	return true;
};

// The two orders `lightDarkToggle` writes the pair in, which is what tells a
// block this wrote from one an author happened to name the same property in.
const LIGHT_DARK_WRITTEN = `${LIGHT_PROPERTY}:initial;${DARK_PROPERTY}:`;
const LIGHT_DARK_WRITTEN_DARK = `${LIGHT_PROPERTY}:;${DARK_PROPERTY}:initial`;

/**
 * The two toggle declarations one `color-scheme` value says, or null where this
 * cannot tell which scheme it names - a substitution, or a keyword the spec has
 * not given yet. `only` narrows how the scheme is chosen, not which one.
 * @param {string} value the `color-scheme` value, as printed
 * @returns {{ toggle: string, flip: boolean } | null} the declarations and whether the scheme follows the user's preference, or null
 */
const lightDarkToggle = (value) => {
	let light = false;
	let dark = false;
	for (const one of splitTopLevelSpaces(value)) {
		const word = toLowerCaseIfNeeded(one);
		// `only` narrows how the scheme is chosen, not which one it is; `normal` is
		// the scheme an element with no other answer uses, which is the light one -
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

/**
 * Where a block's printed declarations take the `light-dark()` toggle: in front
 * of the first ranked one where they stand in rank order, which is where
 * `_declarationOrder` moves a custom property, and else at the end.
 * @param {string} body the block's printed declarations
 * @returns {number} the offset to write the toggle at, or -1 for the end
 */
const toggleOffset = (body) => {
	const ranks = getDeclarationRanks();
	let first = -1;
	let previous = -1;
	let start = 0;
	let depth = 0;
	let quote = 0;
	for (let i = 0; i <= body.length; i++) {
		const code = body.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) {
			i++;
			continue;
		}
		if (quote !== 0) {
			if (code === quote) quote = 0;
			continue;
		}
		if (code === CC_QUOTATION_MARK || code === CC_APOSTROPHE) {
			quote = code;
		} else if (
			code === CC_LEFT_PARENTHESIS ||
			code === CC_LEFT_SQUARE ||
			code === CC_LEFT_CURLY
		) {
			depth++;
		} else if (
			code === CC_RIGHT_PARENTHESIS ||
			code === CC_RIGHT_SQUARE ||
			code === CC_RIGHT_CURLY
		) {
			depth--;
		} else if (i === body.length || (code === CC_SEMICOLON && depth === 0)) {
			const colon = body.indexOf(":", start);
			if (colon <= start || colon >= i) return -1;
			const property = toLowerCaseIfNeeded(body.slice(start, colon));
			const rank = property.startsWith("--") ? -1 : ranks.get(property);
			if (rank === undefined || rank < previous) return -1;
			if (rank !== -1 && first === -1) first = start;
			previous = rank;
			start = i + 1;
		}
	}
	return first;
};

// The `color-scheme` a block sets, wherever it stands in it. Read from the
// composed text: what a rule sets is what it wrote, and the value is one
// component list.
const COLOR_SCHEME_RE = /(?:^|[;{}])color-scheme:([^;{}]*)/i;

// The scheme the user asked for, which is what a `color-scheme` naming both
// defers to.
const PREFERS_DARK = "@media (prefers-color-scheme:dark)";

// Stands for the rule's own prelude in a block the hoist holds, filled in once
// the run settles it: the tokenizer replaces a source NUL, and a deferred
// write's marker (`url(\0...\0)`) never holds two in a row.
const OWN_PRELUDE = "\0\0";

/**
 * Whether a value names a color function no target reads, wherever it stands.
 * @param {string} value the value, as printed
 * @returns {boolean} true when one of them is there
 */
const namesUnreadableColor = (value) => {
	UNREADABLE_COLOR_CALL_RE.lastIndex = 0;
	for (
		let match = UNREADABLE_COLOR_CALL_RE.exec(value);
		match !== null;
		match = UNREADABLE_COLOR_CALL_RE.exec(value)
	) {
		if (unreadableColorFunction(asciiLowercaseName(match[2]))) return true;
	}
	return false;
};

// Some mobile WebKit builds honor `-webkit-tap-highlight-color:rgba(0,0,0,0)`
// but ignore the equivalent `transparent`, so that one property keeps the
// function form (cssnano guards the same property).
/**
 * @returns {boolean} whether the value being printed belongs to `-webkit-tap-highlight-color`
 */
const inTapHighlightColor = () =>
	S._valueDeclaration !== null &&
	A.name(S._valueDeclaration).toLowerCase() === "-webkit-tap-highlight-color";

/**
 * Write one `:nth-*()` in its shortest equal spelling: the An+B microsyntax
 * carries its own whitespace and signs, two keywords name a step of two, and a
 * step selecting exactly one child is the child that has its own name.
 * @param {string} name the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string} the whole replacement, `name(inner)` when nothing is shorter
 */
const minifyAnPlusB = (name, inner) => {
	if (!S._transforms.shortenSelectors) return `${name}(${inner})`;
	// `An+B of S` selects among S, which no plain spelling names.
	if (/\bof\b/i.test(inner)) return `${name}(${inner})`;
	const nth = minifyNth(inner);
	if (nth === null) return `${name}(${inner})`;
	const first = NTH_NAMED_EQUIVALENTS.get(name);
	return nth === "1" && first !== undefined ? first : `${name}(${nth})`;
};

/**
 * Whether the declaration being printed takes a family list - the longhand, or a
 * shorthand that sets it, where an identifier naming a family is a family name
 * and nothing else.
 * @returns {boolean} true inside such a declaration
 */
const inFontFamily = () =>
	S._valueDeclaration !== null &&
	FAMILY_LIST_PROPERTIES.has(asciiLowercaseName(A.name(S._valueDeclaration)));

/**
 * Whether the string is the whole entry in its comma-separated slot:
 * `<family-name>` takes `<string> | <custom-ident>+`, never a mix of the two.
 * @param {CssPath} path the accessor positioned on the string token
 * @returns {boolean} true when nothing else shares its slot
 */
const isLoneFamilyName = (path) => {
	const parent = path.parent;
	// Directly in the declaration's value: inside a function the string is an
	// argument rather than a family.
	if (parent === null || path.type(parent) !== NodeType.Declaration) {
		return false;
	}
	const self = path.start();
	const count = path.childCount(parent);
	let sharedSlot = false;
	let seenSelf = false;
	for (let at = 0; at < count; at++) {
		const child = path.child(at, parent);
		const type = path.type(child);
		if (type === NodeType.Comma) {
			if (seenSelf) return !sharedSlot;
			sharedSlot = false;
			continue;
		}
		if (type === NodeType.Whitespace || type === NodeType.Comment) continue;
		if (path.start(child) === self) seenSelf = true;
		else sharedSlot = true;
	}
	return seenSelf && !sharedSlot;
};

/**
 * Whether a string is the whole first family of a `font` shorthand: the size or
 * line height before it, and nothing but a comma or the end after. A later
 * family is `isLoneFamilyName`'s.
 * @param {CssPath} path the accessor positioned on the string token
 * @returns {boolean} true when the string fills the first family slot alone
 */
const isLoneFontFamily = (path) => {
	const parent = path.parent;
	if (
		parent === null ||
		parent !== S._valueDeclaration ||
		asciiLowercaseName(A.name(parent)) !== "font"
	) {
		return false;
	}
	const self = path.start();
	const count = path.childCount(parent);
	let previous = -1;
	let seenSelf = false;
	for (let at = 0; at < count; at++) {
		const child = path.child(at, parent);
		const type = path.type(child);
		if (type === NodeType.Whitespace || type === NodeType.Comment) continue;
		if (seenSelf) return type === NodeType.Comma;
		if (path.start(child) === self) {
			// An identifier before it may be a word of the same family, which a
			// string beside it makes invalid and unquoting would make valid.
			seenSelf =
				previous === NodeType.Dimension ||
				previous === NodeType.Percentage ||
				previous === NodeType.Number;
			if (!seenSelf) return false;
		}
		previous = type;
	}
	return seenSelf;
};

// One identifier, and a family name is a run of them parted by whitespace. The
// escapes a quoted name may carry are not identifier text, so one declines.
const PLAIN_IDENT_RE = /^-?[A-Za-z_-\uFFFF][\w-\uFFFF-]*$/;

/**
 * Unquote a font family whose text is already a run of identifiers, which is
 * the other spelling `<family-name>` names. Returns null wherever the quotes
 * carry something: a generic family's own keyword, a CSS-wide keyword, or text
 * no identifier could spell.
 * @param {string} raw the string token as written, quotes included and closed
 * @returns {string | null} the unquoted name, or null to keep the string
 */
const unquoteFontFamily = (raw) => {
	if (!S._transforms.normalizeQuotes) return null;
	// The caller hands a whole string token, its closing quote written back.
	const text = raw.slice(1, -1);
	if (text.includes("\\")) return null;
	const words = text.split(" ");
	for (const word of words) {
		if (!PLAIN_IDENT_RE.test(word)) return null;
		const lowered = toLowerCaseIfNeeded(word);
		// Unquoted, either would read as the grammar's keyword instead of a name.
		if (CSS_WIDE_KEYWORDS.has(lowered)) return null;
		// A generic family is one identifier, so only a lone word can be read as
		// one - `Apple Color Emoji` is three, whatever the last of them spells.
		if (words.length === 1 && GENERIC_FONT_FAMILIES.has(lowered)) return null;
	}
	return text;
};

/**
 * Whether the declaration being printed takes a color and never an identifier
 * of the author's own, so a named color in it is unambiguously that color.
 * @returns {boolean} true inside such a declaration
 */
const inColorOnlyProperty = () =>
	S._valueDeclaration !== null &&
	COLOR_ONLY_PROPERTIES.has(toLowerCaseIfNeeded(A.name(S._valueDeclaration)));

/**
 * Whether the declaration being printed spells no name of the author's: its
 * grammar is keywords alone, or it takes a color, which is keywords and numbers.
 * An identifier standing directly in such a value is one of those keywords.
 * Asked only for an identifier whose parent is that declaration.
 * @returns {boolean} true inside such a declaration
 */
const inKeywordOnlyValue = () => {
	const declaration = /** @type {Node} */ (S._valueDeclaration);
	// Memoized on the declaration: every identifier in one value asks the same
	// question, and answering it reads the name, folds it and looks it up twice.
	if (S._keywordOnlyFor !== declaration) {
		S._keywordOnlyFor = declaration;
		const property = standardSpelling(toLowerCaseIfNeeded(A.name(declaration)));
		S._keywordOnly =
			getKeywordOnlyProperties().has(property) ||
			COLOR_ONLY_PROPERTIES.has(property);
	}
	return S._keywordOnly;
};

// A plain (non-scientific, unitless) number - the only argument form these
// equivalences are proven for; anything else (a `var()`, a dimension) keeps the
// function, since rewriting an invalid declaration would activate it.
const PLAIN_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;

/**
 * Minify an easing function to its shorter, value-identical form:
 * `cubic-bezier()` to the keyword defining the same curve, `steps()` to
 * `step-start` / `step-end`, and the default `end` position away. Returns null
 * for anything else, keeping the function.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the shorter easing function, or null to keep the function
 */
const minifyEasingFunction = (fn, inner) => {
	if (!S._transforms.reduceFunctions) return null;
	if (fn !== "cubic-bezier" && fn !== "steps") return null;
	const args = inner.split(",");
	if (fn === "cubic-bezier") {
		if (args.length !== 4) return null;
		let key = "";
		for (let i = 0; i < 4; i++) {
			const s = args[i].trim();
			if (!PLAIN_NUMBER_RE.test(s)) return null;
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

// Code points a url-token cannot carry unescaped, so a `url("...")` string only
// drops its quotes without them.
// eslint-disable-next-line no-control-regex -- a control code point is exactly what a url-token may not carry
const UNQUOTABLE_URL_RE = /[\s"'()\\\u0000-\u001F\u007F]/;

// ...of those, the ones a backslash alone escapes into a url-token. No other can:
// a control code point takes a hex escape that is never shorter, and a backslash
// already there starts an escape this printer did not write.
const URL_ESCAPABLE = new Set([" ", '"', "'", "(", ")"]);

/**
 * Rewrite a `url()`'s quoted body as the url-token spelling the same URL, or
 * null where none does. Every code point is classified - escaped, kept, or
 * refused - so nothing reaches the output unexamined.
 * @param {string} body the string's content, quotes excluded
 * @returns {string | null} the url-token text, or null to keep the quotes
 */
const escapeUrlBody = (body) => {
	let out = "";
	let escapes = 0;
	for (const character of body) {
		if (URL_ESCAPABLE.has(character)) {
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

const PERCENT_ESCAPE_RE = /%[0-9a-f]{2}/gi;

/**
 * Whether a text ends in a `%` that one or two more hex digits make an escape.
 * @param {string} text the text written so far
 * @returns {boolean} true when it ends in `%` or `%` and one hex digit
 */
const endsOpenPercent = (text) => {
	const end = text.length;
	if (text.charCodeAt(end - 1) === CC_PERCENTAGE) return true;
	return (
		text.charCodeAt(end - 2) === CC_PERCENTAGE &&
		isHexDigit(text.charCodeAt(end - 1))
	);
};

// A `data:` URL up to the comma that ends its metadata. Only past that comma is
// an escape content the URL parser decodes before anything reads it; anywhere
// else it is structure - `%26` in a query is a literal `&`, not a separator.
const DATA_URL_METADATA_RE = /^data:[^,]*,/i;

/**
 * Write each percent-escape a data URI's payload does not need as the byte it
 * names - three bytes for one, over the markup an inline SVG is made of.
 * @param {string} body the url's content, quotes excluded
 * @param {boolean} bare whether it is written as a url-token rather than a string
 * @param {string} quote the quote the body is written in, empty for a url-token
 * @returns {string} the body, its needless escapes decoded
 */
const decodePercentEscapes = (body, bare, quote) => {
	const metadata = DATA_URL_METADATA_RE.exec(body);
	if (metadata === null) return body;
	let out = metadata[0];
	let last = out.length;
	PERCENT_ESCAPE_RE.lastIndex = last;
	for (let match; (match = PERCENT_ESCAPE_RE.exec(body)) !== null;) {
		const escape = match[0];
		out += body.slice(last, match.index);
		last = match.index + 3;
		const code = Number.parseInt(escape.slice(1), 16);
		const one = String.fromCharCode(code);
		const keep =
			// Each escape names one byte, not one code point: `%C3%A9` is two bytes
			// of one character, and writing them apart would re-encode as four.
			code < 0x20 ||
			code >= 0x7f ||
			// `#` would start the fragment and `%` the next escape; the quote and
			// the escape character would end or extend the string, and a url-token
			// carries none of what the quotes were holding.
			one === "#" ||
			one === "%" ||
			one === quote ||
			one === "\\" ||
			(bare && UNQUOTABLE_URL_RE.test(one)) ||
			// After a bare `%` (`%%32%41`), a hex digit would spell a new escape.
			(isHexDigit(code) && endsOpenPercent(out));
		out += keep ? escape : one;
	}
	return out + body.slice(last);
};

/**
 * Whether a text opening on a quote is that one string and nothing after it.
 * @param {string} text text opening on a quote
 * @param {number} quote that quote's code
 * @returns {boolean} true when the string closes on the last character
 */
const isLoneString = (text, quote) => {
	const last = text.length - 1;
	let i = 1;
	for (; i < last; i++) {
		const c = text.charCodeAt(i);
		if (c === CC_REVERSE_SOLIDUS) i++;
		else if (c === quote) return false;
	}
	return i === last && text.charCodeAt(last) === quote;
};

/**
 * `url("a.png")` -> `url(a.png)` when the quoted URL is also a valid url-token,
 * and a data URI's payload written as the bytes its escapes name. Nothing else
 * about the URL is rewritten, since webpack passes it through to a server that
 * may read it verbatim.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the shorter `url()`, or null to keep the function
 */
const minifyUrlFunction = (fn, inner) => {
	if (fn !== "url") return null;
	// A `url(` function token is one a string follows (CSS Syntax 3 §4.3.6).
	const quote = inner.charCodeAt(0);
	// That string has to be all of it: `url("a" "b")` is no url, and reading the
	// text between the outer quotes as one would write it as one.
	if (!isLoneString(inner, quote)) return null;
	const written = inner.slice(1, -1);
	const mark = String.fromCharCode(quote);
	// The renderer reads source, so it is offered the decoded payload whatever
	// the switches say - `escapes` decides how the escapes are *printed*, not
	// whether a data URL holds a document.
	const decoded = decodePercentEscapes(written, false, mark);
	// A `data:` payload a renderer rewrites is serialized afresh, so what it hands
	// back is no longer what the quotes were written around; declined, it is
	// printed as an untapped run prints it.
	if (S._deferEmbeddedSource !== undefined) {
		const deferred = deferDataUrl(
			decoded,
			`${fn}(`,
			(url) => `${fn}(${serializeUrl(url, mark)})`,
			plainUrlFunction(fn, written, decoded, mark) ||
				`${fn}(${mark}${written}${mark})`
		);
		if (deferred !== null) return deferred;
	}
	const rendered = renderDataUrl(decoded);
	if (rendered !== null) return `${fn}(${serializeUrl(rendered, mark)})`;
	return plainUrlFunction(fn, written, decoded, mark);
};

/**
 * A quoted `url()` as it prints with nothing rendered: unquoted where it is a
 * url-token without the quotes, its needless percent-escapes decoded.
 * @param {string} fn the lowercased function name
 * @param {string} written the url as written, quotes excluded
 * @param {string} decoded the url with its needless percent-escapes decoded
 * @param {string} mark the quote it was written in
 * @returns {string | null} the shorter `url()`, or null to keep the function
 */
const plainUrlFunction = (fn, written, decoded, mark) => {
	// Taking the quotes off what is a url-token without them is `normalizeQuotes`;
	// writing a percent-escape as the byte it names is not a switch of its own -
	// an escape and the byte name one string, so nothing reads them apart.
	const body = decoded;
	if (!S._transforms.normalizeQuotes) {
		return body === written ? null : `${fn}(${mark}${body}${mark})`;
	}
	if (!UNQUOTABLE_URL_RE.test(body)) return `${fn}(${body})`;
	// A code point a url-token cannot carry can still be escaped into one, which
	// costs a byte where the two quotes cost two - so one of them is shorter
	// escaped and two are not.
	const escaped = escapeUrlBody(body);
	if (escaped !== null) return `${fn}(${escaped})`;
	// It keeps its quotes, and with them whatever the escapes gave back.
	return body === written ? null : `${fn}(${mark}${body}${mark})`;
};

/**
 * Whether `text` re-tokenizes as exactly one `<ident-token>` - no escapes, and
 * no leading digit (`1x` is a dimension, `-1` a number) - so an attribute
 * selector's quoted value can drop its quotes.
 * @param {string} text the string's content, quotes excluded
 * @returns {boolean} true when it is a bare identifier
 */
const isBareIdent = (text) => {
	const n = text.length;
	if (n === 0) return false;
	for (let i = 0; i < n; i++) {
		if (!isIdentCodePoint(text.charCodeAt(i))) return false;
	}
	const first = text.charCodeAt(0);
	if (isDigit(first)) return false;
	// `-` alone is a delim, `-1` a number; `-x` / `--x` are idents.
	if (first === CC_HYPHEN_MINUS) return n > 1 && !isDigit(text.charCodeAt(1));
	return true;
};

/**
 * Whether the code point an escape stands for can be written literally at
 * `index` of an identifier: it must be an ASCII ident code point, and the first
 * one must also be able to *start* an ident (`\31 x` is the class `1x`, but a
 * literal `1x` is a dimension). Non-ASCII stays escaped - writing it literally
 * would make the stylesheet's own encoding load-bearing.
 * @param {number} value the escape's code point
 * @param {number} written how many code units of the identifier precede it
 * @param {boolean} afterDash whether those are exactly a `-`
 * @returns {boolean} true when the literal code point re-tokenizes the same
 */
const canUnescape = (value, written, afterDash) => {
	if (value >= 128 || !isAsciiIdentCodePoint(value)) return false;
	if (written === 0) {
		return isLetter(value) || value === CC_LOW_LINE;
	}
	// `-1` is a number and `--1` a valid ident, so only the second code point of
	// a leading `-` is constrained.
	if (afterDash) return !isDigit(value);
	return true;
};

/**
 * Shorten the escapes in an identifier, two ways that both re-tokenize to the
 * same name: write the code point literally where it needs no escape at all
 * (`\41 bc` -> `Abc`), and otherwise drop the whitespace that terminates a hex
 * escape when the code point after it, *inside this same token*, cannot extend
 * it (`\32 xl` -> `\32xl`). A terminator that ends the token stays: the walk's
 * own separator would take its place and swallow the whitespace that follows
 * (`.\32   x` is the class `2` and a descendant `x`, not the class `2x`).
 * @param {string} text the identifier's source text
 * @returns {string} the identifier, escapes shortened
 */
const minifyIdentEscapes = (text) => {
	if (!text.includes("\\")) return text;
	const n = text.length;
	let out = "";
	// Where the run of text written back unchanged starts: only a rewritten
	// escape cuts it, so most of an identifier is copied in one slice.
	let from = 0;
	// Whether `out` ends in a hex escape written without its terminator, which a
	// hex digit written after it would extend: `\31` then `a` reads as `\31a`.
	let open = false;
	let i = 0;
	while (i < n) {
		const c = text.charCodeAt(i);
		if (c !== CC_REVERSE_SOLIDUS || i + 1 >= n) {
			open = false;
			i++;
			continue;
		}
		let digitEnd = i + 1;
		let value = 0;
		while (
			digitEnd < n &&
			digitEnd - i <= 6 &&
			isHexDigit(text.charCodeAt(digitEnd))
		) {
			value = value * 16 + Number.parseInt(text[digitEnd], 16);
			digitEnd++;
		}
		const digits = digitEnd - i - 1;
		if (digits === 0) {
			// An identity escape (`\:`), which is what makes the code point literal -
			// dropping it would change the token.
			open = false;
			i += 2;
			continue;
		}
		// A hex escape ends at the first non-hex digit, one whitespace there being
		// its terminator rather than part of the name. A CRLF pair is one such
		// whitespace, so dropping the CR alone leaves a raw newline in the name.
		let end = digitEnd;
		if (end < n && isAsciiWhitespace(text.charCodeAt(end))) {
			end = consumeExtraNewline(text.charCodeAt(end), text, end + 1);
		}
		const written = out.length + i - from;
		if (
			canUnescape(
				value,
				written,
				written === 1 && (out.length === 1 ? out : text[from]) === "-"
			)
		) {
			out +=
				text.slice(from, i) +
				(open && isHexDigit(value)
					? ` ${String.fromCharCode(value)}`
					: String.fromCharCode(value));
			from = end;
			open = false;
			i = end;
			continue;
		}
		const keepTerminator =
			end !== digitEnd &&
			(end === n ||
				(digits !== 6 && isHexDigit(text.charCodeAt(end))) ||
				isAsciiWhitespace(text.charCodeAt(end)));
		if (end !== digitEnd) {
			// Any whitespace ends the escape alike, and a space is the shortest one.
			if (!keepTerminator) {
				out += text.slice(from, digitEnd);
				from = end;
			} else if (
				end !== digitEnd + 1 ||
				text.charCodeAt(digitEnd) !== CC_SPACE
			) {
				out += `${text.slice(from, digitEnd)} `;
				from = end;
			}
		}
		if (end !== digitEnd && end === n) {
			// The terminator is also where the identifier stops. Dropping it hands that
			// job to whatever follows - `.a\31 .b` is one compound selector, `.a1 .b` two.
			break;
		}
		open = !keepTerminator && digits !== 6;
		i = end;
	}
	return from === 0 ? text : out + text.slice(from);
};

/**
 * A url token's value as the printer writes it back: where the input ran out
 * inside the token, a `\` left dangling at its end reads as U+FFFD (§4.3.7),
 * and kept, it would escape the `)` written after it.
 * @param {CssPath} path the accessor positioned on the url token
 * @param {boolean} unterminated whether the input ran out inside it
 * @returns {string} its value
 */
const urlValue = (path, unterminated) =>
	unterminated
		? terminate(rawValue(path.node), "", "\uFFFD")
		: rawValue(path.node);

/**
 * Write each hex escape in a string token that names a code point past U+FFFF
 * as the character itself: four UTF-8 bytes against the escape's six or seven,
 * where a shorter one costs more than it saves once compressed.
 * @param {string} raw the string token as printed, quotes included
 * @returns {string} the string token
 */
const unescapeAstral = (raw) => {
	if (!raw.includes("\\")) return raw;
	let out = "";
	let from = 0;
	for (let i = 1; i < raw.length - 1; i++) {
		if (raw.charCodeAt(i) !== CC_REVERSE_SOLIDUS) continue;
		let end = i + 1;
		while (
			end < raw.length - 1 &&
			end - i <= 6 &&
			isHexDigit(raw.charCodeAt(end))
		) {
			end++;
		}
		const code = end === i + 1 ? 0 : Number.parseInt(raw.slice(i + 1, end), 16);
		if (code <= 0xffff || code > 0x10ffff) {
			// Past the escape, so `\\` and an escaped quote are never read as one.
			i = end === i + 1 ? i + 1 : end - 1;
			continue;
		}
		// The one whitespace after a hex escape ends it and is no character, a
		// CRLF pair being that one (CSS Syntax 3 §4.3.7).
		const after = raw.charCodeAt(end);
		if (isAsciiWhitespace(after)) {
			end = consumeExtraNewline(after, raw, end + 1);
		}
		out += raw.slice(from, i) + String.fromCodePoint(code);
		from = end;
		i = end - 1;
	}
	return from === 0 ? raw : out + raw.slice(from);
};

/**
 * Write a string holding a `'` as `'`-wrapped, with each `'` inside escaped and
 * each `\"` unescaped: a `"` costs a `style=""` six bytes as `&quot;`, a `\'` one.
 * @param {string} raw the string token's source text, quotes included, which
 * the printer has already closed where the input ran out inside it
 * @returns {string} the string token
 */
const minifyAttributeString = (raw) => {
	const n = raw.length;
	let out = "'";
	for (let i = 1; i < n - 1; i++) {
		const c = raw.charCodeAt(i);
		if (c === CC_REVERSE_SOLIDUS) {
			const next = raw.charCodeAt(i + 1);
			out += next === CC_QUOTATION_MARK ? '"' : raw.slice(i, i + 2);
			i++;
		} else {
			out += c === CC_APOSTROPHE ? "\\'" : raw[i];
		}
	}
	return `${out}'`;
};

/**
 * Normalize a string token's quotes, following cssnano's `postcss-normalize-string`:
 * prefer `"`, switch to whichever quote needs fewer escapes, and unescape a quote
 * the chosen wrapper no longer escapes. A string already holding a literal quote
 * keeps its wrapper - the other kind is the cheap one there. Value-identical; a
 * `\`-newline continuation is left alone because dropping it could fuse into a
 * preceding hex escape.
 * A hex escape stays as written: the character it names costs gzip bytes where
 * it saves raw ones (measured in `configCases/css/minimize-values`).
 * @param {string} raw the string token's source text, quotes included and closed
 * (the caller writes back a quote the input ran out before, so no escape here
 * swallows the last one)
 * @returns {string} the normalized string token
 */
const minifyString = (raw) => {
	if (!S._transforms.normalizeQuotes) return raw;
	const quote = raw.charCodeAt(0);
	const n = raw.length;
	if (S._inStyleAttribute) {
		const apostrophe = raw.indexOf("'", 1);
		if (apostrophe !== -1 && apostrophe < n - 1) {
			return minifyAttributeString(raw);
		}
	}
	// The overwhelmingly common string - already `"`-wrapped, no escape and no
	// literal `'` - is unchanged; two native scans beat the counting loop below.
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
 * Whether a printed selector is one compound - no combinator and no comma, so
 * standing it where `&` was says what `:is()` around it would.
 * @param {string} selector one printed selector
 * @returns {boolean} true when it is a single compound selector
 */
const isCompoundSelector = (selector) => {
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
			(code === CC_COMMA || COMBINATOR_CODES.has(code))
		) {
			return false;
		}
	}
	return true;
};

// What separates one compound from the next, printed: the three combinators and
// the space a descendant is written with.
const COMBINATOR_CODES = new Set([
	CC_SPACE,
	CC_GREATER_THAN_SIGN,
	CC_PLUS_SIGN,
	CC_TILDE
]);

/**
 * Whether two printed selector pieces read back as other tokens written side by
 * side: `/` before `*` opens a comment, `b` before `a` is the one name `ba`.
 * @param {string} before the text written first
 * @param {string} after the text written after it
 * @returns {boolean} true when the junction fuses
 */
const fusesAtJunction = (before, after) =>
	join([before, after], false, TRIM_COMBINATORS).length !==
	before.length + after.length;

/**
 * Where an identifier starting at `at` in printed text ends.
 * @param {string} text printed text
 * @param {number} at the offset to read from
 * @returns {number} the offset past the identifier, `at` itself where none starts
 */
const identifierEnd = (text, at) => {
	let i = at;
	if (text.charCodeAt(i) === CC_HYPHEN_MINUS) i++;
	const first = text.charCodeAt(i);
	if (
		first !== CC_REVERSE_SOLIDUS &&
		!(i > at && first === CC_HYPHEN_MINUS) &&
		!isIdentStartCodePoint(first)
	) {
		return at;
	}
	while (i < text.length) {
		const code = text.charCodeAt(i);
		if (code === CC_REVERSE_SOLIDUS) i = skipEscape(text, i);
		else if (isIdentCodePoint(code)) i++;
		else break;
	}
	return i;
};

/**
 * Where a type selector (`div`, `*`, `ns|div`, `*|*`, `|div`) starting at `at`
 * in a printed selector ends; a name a `(` follows is a function, not one.
 * @param {string} text a printed selector
 * @param {number} at the offset to read from
 * @returns {number} the offset past it, `at` itself where none starts
 */
const typeSelectorEnd = (text, at) => {
	/**
	 * @param {number} from the offset a name or `*` would start at
	 * @returns {number} the offset past it, or `from`
	 */
	const name = (from) =>
		text.charCodeAt(from) === CC_ASTERISK
			? from + 1
			: identifierEnd(text, from);
	let end = name(at);
	if (
		text.charCodeAt(end) === CC_VERTICAL_LINE &&
		text.charCodeAt(end + 1) !== CC_VERTICAL_LINE
	) {
		const local = name(end + 1);
		if (local !== end + 1) end = local;
	}
	return end === at || text.charCodeAt(end) === CC_LEFT_PARENTHESIS ? at : end;
};

/**
 * Write each `&` in one printed selector as the parent it stands for, as
 * `:is()` of it where it would fuse with the text on either side.
 * @param {string} selector one printed selector
 * @param {string} reference what the parent selector is written as
 * @returns {string} the selector with every `&` written out
 */
const substituteAmpersand = (selector, reference) => {
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
			out += selector.slice(at, i);
			const typeEnd = typeSelectorEnd(selector, i + 1);
			let type = selector.slice(i + 1, typeEnd);
			// `&*` is the parent alone, the `*` a second pass would drop.
			const rest =
				type === "*" && impliesUniversal(reference) ? typeEnd : i + 1;
			let dropsUniversal = rest !== i + 1;
			if (dropsUniversal) type = "";
			if (type.length !== 0 && !fusesAtJunction(out, type)) {
				// A type selector leads its compound, so `&div` is `div` and the parent:
				// as `:is()` where the parent opens on one of its own or would fuse.
				out +=
					type +
					(typeSelectorEnd(reference, 0) !== 0 ||
					fusesAtJunction(type, reference) ||
					fusesAtJunction(reference, selector.slice(typeEnd))
						? `:is(${reference})`
						: reference);
				at = typeEnd;
				i = typeEnd - 1;
				continue;
			}
			// So is `*&`, where that `*` opens the compound.
			const star = out.length - 1;
			if (
				out.charCodeAt(star) === CC_ASTERISK &&
				(star === 0 ||
					COMBINATOR_CODES.has(out.charCodeAt(star - 1)) ||
					out.charCodeAt(star - 1) === CC_LEFT_PARENTHESIS) &&
				impliesUniversal(reference)
			) {
				out = out.slice(0, star);
				dropsUniversal = true;
			}
			// A type selector only leads a compound, so after `[x]` or `:not(...)` the
			// parent it opens has to stand inside `:is()`.
			const last = out.charCodeAt(out.length - 1);
			out +=
				(out.length !== 0 &&
					!COMBINATOR_CODES.has(last) &&
					last !== CC_LEFT_PARENTHESIS &&
					last !== CC_COMMA &&
					typeSelectorEnd(reference, 0) !== 0) ||
				(dropsUniversal && namesNamespace(reference)) ||
				fusesAtJunction(out, reference) ||
				fusesAtJunction(reference, selector.slice(rest))
					? `:is(${reference})`
					: reference;
			at = rest;
			i = rest - 1;
		}
	}
	return out + selector.slice(at);
};

/**
 * Whether a parent opens on a type selector naming a namespace, `ns|a`, `*|a`
 * or `|a`. The `*` it drops keeps to the default namespace, as a compound with
 * no type selector does, so the parent then goes in `:is()` rather than bare.
 * @param {string} reference what the parent selector is written as
 * @returns {boolean} true when its leading type selector holds a `|`
 */
const namesNamespace = (reference) =>
	reference.slice(0, typeSelectorEnd(reference, 0)).includes("|");

// A `:host` pseudo-class anywhere in a selector, though not a `::host` element.
const NAMES_HOST_RE = /(?:^|[^:]):host/i;

/**
 * Whether a written parent already implies the universal selector before it,
 * as `dropImpliedUniversalSelector` reads it: any non-empty one but a
 * pseudo-class that may match a featureless element, which no `*` matches.
 * @param {string} reference what the parent selector is written as
 * @returns {boolean} true when `*` in front of it says nothing
 */
const impliesUniversal = (reference) => {
	if (!S._transforms.shortenSelectors || reference.length === 0) return false;
	if (reference.charAt(0) === ":") {
		const name = reference.slice(1, identifierEnd(reference, 1));
		if (FEATURELESS_PSEUDO_CLASSES.has(name.toLowerCase())) return false;
		// `:is(:host)` matches the host as its argument does, and an escape could
		// spell `:host`: the parent is read conservatively, as the parser does.
		return !NAMES_HOST_RE.test(reference) && !reference.includes("\\");
	}
	return (
		COMPOUND_CONTINUATIONS.has(reference.charAt(0)) ||
		typeSelectorEnd(reference, 0) !== 0
	);
};

/**
 * Whether one printed selector names the parent itself, anywhere `&` may stand
 * - inside a pseudo's argument included, which is still the parent it means.
 * @param {string} selector one printed selector
 * @returns {boolean} true when it holds an `&`
 */
const namesParent = (selector) => {
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
const resolveNestedPrelude = (prelude, parent) => {
	// `&` is the parent selector list, which is what `:is()` of it matches - and
	// one compound stands for itself, `:is()` around it saying no more.
	const reference = isCompoundSelector(parent) ? parent : `:is(${parent})`;
	const written = splitSelectorList(prelude);
	for (let i = 0; i < written.length; i++) {
		const raw = written[i];
		let one = trimCssWhiteSpace(raw);
		// An odd run of `\` ends on a lone one, which escaped the space the trim
		// took, or stood before a newline, which is no escape: that character is
		// kept either way, so the `\` escapes nothing that follows.
		let slashes = 0;
		while (one.charCodeAt(one.length - 1 - slashes) === CC_REVERSE_SOLIDUS) {
			slashes++;
		}
		if (slashes % 2 === 1) one += raw.charAt(raw.indexOf(one) + one.length);
		if (namesParent(one)) {
			written[i] = substituteAmpersand(one, reference);
			continue;
		}
		// A selector opening on a combinator is parted from the parent by that
		// combinator, and the printer writes those tight - so a space in front of
		// one is a space a second pass takes off. `||` is not one of them.
		const combinator = COMBINATOR_CODES.has(one.charCodeAt(0));
		// An empty selector - an invalid list the printer keeps - has no descendant
		// to part from the parent, nor one an empty parent does, so no space then.
		written[i] =
			combinator || one.length === 0 || reference.length === 0
				? reference + one
				: `${reference} ${one}`;
	}
	const list = written.join(",");
	// Ordered on what is written, not on what was: the list was canonical as the
	// nested rule spelled it, and writing the parent in front of each decides
	// the order. One selector is already the order it reads in.
	return written.length === 1 ? list : canonicalSelectorList(list);
};

/**
 * A nested rule's prelude with its parent written as `&` in every selector, where
 * one opens on a combinator or only some name `&`: either way `:is()` of the list
 * would lose the parent the others imply.
 * @param {string} prelude the nested rule's printed prelude
 * @returns {string} the prelude, every selector naming `&`, or as it was
 */
const parentNamed = (prelude) => {
	const written = splitSelectorList(prelude);
	let relative = false;
	let naming = 0;
	for (let i = 0; i < written.length; i++) {
		written[i] = trimCssWhiteSpace(written[i]);
		if (COMBINATOR_CODES.has(written[i].charCodeAt(0))) relative = true;
		if (namesParent(written[i])) naming++;
	}
	if (!relative && (naming === 0 || naming === written.length)) return prelude;
	for (let i = 0; i < written.length; i++) {
		const one = written[i];
		if (namesParent(one)) continue;
		written[i] = COMBINATOR_CODES.has(one.charCodeAt(0))
			? `&${one}`
			: `& ${one}`;
	}
	return written.join(",");
};

/**
 * Whether a block's declarations all stand before its rules, so taking the
 * rules out of it leaves the cascade as it was.
 *
 * A declaration written after a nested rule is read after it, and a rule the
 * parent's own selector matches would win against it once hoisted - so a block
 * that interleaves them keeps the nesting it was written with.
 * @param {CssPath} path the walk's accessors
 * @param {Node} rule the enclosing rule
 * @returns {boolean} true when no declaration follows a rule
 */
const declarationsPrecedeRules = (path, rule) => {
	// Asked by each rule nested in it, so answered once; a node id names another
	// rule once a streamed one is done, which its start tells apart.
	const start = path.start(rule);
	if (S._rulesPrecede === null) S._rulesPrecede = new Map();
	const known = S._rulesPrecede.get(rule);
	if (known !== undefined && Math.floor(known / 2) === start) {
		return known % 2 === 1;
	}
	const precede = readDeclarationsPrecedeRules(path, rule);
	S._rulesPrecede.set(rule, start * 2 + (precede ? 1 : 0));
	return precede;
};

/**
 * `declarationsPrecedeRules` read off the block.
 * @param {CssPath} path the walk's accessors
 * @param {Node} rule the enclosing rule
 * @returns {boolean} true when no declaration follows a rule
 */
const readDeclarationsPrecedeRules = (path, rule) => {
	const decls = declarationsOf(rule);
	if (decls === null || decls.length === 0) return true;
	// The rule asking holds this one, so the list it is in is never empty.
	const rules = /** @type {Rule[]} */ (rulesOf(rule));
	// The parser's list, in source order: the last declaration starts last.
	const lastDecl = path.start(decls[decls.length - 1]);
	let before = false;
	for (let i = 0; i < rules.length && !before; i++) {
		before = path.start(rules[i]) <= lastDecl;
	}
	if (!before) return true;
	// A rule an identical later sibling restates is dropped as dead, so it parts
	// nothing: judged on the source, as the drop itself is decided after this.
	if (!S._transforms.removeDeadRules) return false;
	/** @type {Set<string>} */
	const later = new Set();
	for (let i = 0; i < rules.length; i++) {
		if (path.start(rules[i]) > lastDecl) later.add(printedSource(rules[i]));
	}
	for (let i = 0; i < rules.length; i++) {
		if (
			path.start(rules[i]) <= lastDecl &&
			!later.has(printedSource(rules[i]))
		) {
			return false;
		}
	}
	return true;
};

/**
 * Whether a rule holds rules of its own still waiting to be written.
 * @param {Node} node the rule
 * @returns {boolean} true when a rule is still waiting to be written in it
 */
const holdsNested = (node) => {
	for (let i = 0; i < S._pendingNested.length; i++) {
		if (S._pendingNested[i].owner === node) return true;
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
 * @param {readonly string[]=} copies the preludes a prefix copy wrote it as
 * @param {string=} copyRest the block each of those carries, as a prefix copy writes it
 * @param {Set<Node> | null=} dead the rules in it a twin made dead, which are not written
 * @returns {string | null} the text to write after the rule, or null when the rule goes on the list itself
 */
const writeNested = (
	path,
	node,
	prelude,
	rest,
	hoistable,
	copies,
	copyRest,
	dead
) => {
	// Only what was written in this rule: the walk is post-order, so an earlier
	// sibling's rules are on the list too, waiting for the parent they share.
	/** @type {{ prelude: string, rest: string, owner: Node | null, apart?: boolean, source?: Node }[]} */
	const taken = [];
	// A rule written in another names its own parent where its list opens on a
	// combinator, so that parent stays an `&` the next level out writes in.
	// Read only once a rule written in this one asks.
	/** @type {string | undefined} */
	let against;
	for (let i = S._pendingNested.length - 1; i >= 0; i--) {
		if (S._pendingNested[i].owner !== node) continue;
		if (against === undefined) {
			against =
				path.parent !== null && path.type(path.parent) !== NodeType.Stylesheet
					? parentNamed(prelude)
					: prelude;
		}
		const one = S._pendingNested[i];
		S._pendingNested.splice(i, 1);
		if (dead && one.source !== undefined && dead.has(one.source)) continue;
		const written = one.prelude;
		one.prelude = resolveNestedPrelude(written, against);
		taken.unshift(one);
		// A prefix copy carries this rule's nested rules too: each is resolved
		// against the copy's prelude, and stands apart, as the copy does.
		if (copies !== undefined) {
			for (let j = copies.length - 1; j >= 0; j--) {
				taken.unshift({
					prelude: resolveNestedPrelude(
						written,
						against === prelude ? copies[j] : parentNamed(copies[j])
					),
					rest: one.rest,
					owner: one.owner,
					apart: true
				});
			}
		}
	}
	const hoisted = hoistable && hoistedOutOf(path, path.parent);
	const owner = hoisted ? path.parent : null;
	if (hoisted) {
		// A prefix copy wrote this rule under a prelude of its own, carrying the
		// same block - so each goes out against the parent, in the order they were
		// written, rather than the whole group staying nested.
		if (rest !== null && copies !== undefined) {
			for (const copy of copies) {
				S._pendingNested.push({
					prelude: copy,
					rest: /** @type {string} */ (copyRest),
					owner,
					apart: true,
					source: node
				});
			}
		}
		if (rest !== null) {
			S._pendingNested.push({
				prelude,
				rest,
				owner,
				apart: copies !== undefined,
				source: node
			});
		}
		for (let i = 0; i < taken.length; i++) {
			taken[i].owner = owner;
			S._pendingNested.push(taken[i]);
		}
		return null;
	}
	// Hoisting writes these out as text, so the sibling merge never reads them -
	// two nested rules printing one block would stay two until a second pass.
	// They are neighbors here and nowhere else, so the run is joined here.
	let out = "";
	S._nestedRuns = [];
	/** @type {{ prelude: string, rest: string, joined: boolean } | null} */
	let held = null;
	// The dark-scheme rules of the copies written so far, waiting for one query.
	let dark = "";
	// The rule the hoist emptied stands right in front of the run and may print
	// the same block, so it is offered the join first - never a prefix copy's
	// rule, which stands apart. Read out of band, by the caller writing it.
	S._nestedTookParent =
		rest !== null &&
		taken.length !== 0 &&
		taken[0].apart !== true &&
		taken[0].rest === rest;
	if (rest !== null && S._nestedTookParent) {
		held = { prelude, rest, joined: false };
	}
	for (let i = 0; i < taken.length; i++) {
		const one = taken[i];
		// A prefix copy is written as a rule of its own, since one selector an
		// engine cannot read takes the whole list with it - so a list is not what
		// these may be joined into.
		if (one.apart === true) {
			if (held !== null) out += flushRun(held);
			held = null;
			const own = one.rest.indexOf(OWN_PRELUDE);
			if (own === -1) {
				out += flushRun({
					prelude: one.prelude,
					rest: one.rest,
					joined: false
				});
				continue;
			}
			// WHY: a copy and its rule each carry a dark-scheme rule, which only
			// sets the toggles every one of them sets alike, so one query after
			// them all holds the lot, as a second pass would join them.
			const query = one.rest.lastIndexOf(PREFERS_DARK, own);
			const written = flushRun({
				prelude: one.prelude,
				rest: one.rest.slice(0, query),
				joined: false
			});
			out += written;
			dark +=
				written.slice(0, S._nestedRuns[S._nestedRuns.length - 1].prelude) +
				one.rest.slice(own + OWN_PRELUDE.length, -1);
			const next = i + 1 < taken.length ? taken[i + 1] : undefined;
			if (
				next === undefined ||
				next.apart !== true ||
				next.rest.slice(next.rest.lastIndexOf(PREFERS_DARK)) !==
					one.rest.slice(query)
			) {
				const joined = `${one.rest.slice(query, own)}${dark}}`;
				S._nestedRuns[S._nestedRuns.length - 1].text += joined;
				out += joined;
				dark = "";
			}
			continue;
		}
		if (held !== null && held.rest === one.rest) {
			// Concatenated, like every other join: the list is ordered once, below,
			// where the run that grew it ends.
			held.prelude += `,${one.prelude}`;
			held.joined = true;
			continue;
		}
		if (held !== null) out += flushRun(held);
		held = { prelude: one.prelude, rest: one.rest, joined: false };
	}
	if (held !== null) out += flushRun(held);
	return out;
};

/**
 * Write one run out, counting it and taking down where the first one's block
 * begins.
 * @param {{ prelude: string, rest: string, joined: boolean }} run what the join left
 * @returns {string} the rule
 */
const flushRun = (run) => {
	const prelude = settledPrelude(run);
	const at = run.rest.indexOf(OWN_PRELUDE);
	const text =
		prelude +
		(at === -1
			? run.rest
			: run.rest.slice(0, at) +
				prelude +
				run.rest.slice(at + OWN_PRELUDE.length));
	S._nestedRuns.push({ text, prelude: prelude.length });
	return text;
};

/**
 * A rule a hoist wrote, as an entry the merge can join others onto.
 * @param {string} text the rule
 * @param {number} prelude its prelude's length
 * @returns {RuleEntry} its entry
 */
const hoistedEntry = (text, prelude) => ({
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
	unordered: false,
	list: null,
	block: null,
	declarations: null
});

/**
 * Record what a hoisted run wrote: one rule is an entry of its own, and several
 * are an entry each, so the rules around them may join onto any of them.
 * @param {string} text what the run wrote
 * @param {string | null} parent the emptied rule's own text written in front of it, if any
 * @param {number} parentPrelude that rule's prelude length
 * @returns {void}
 */
const recordHoistedRule = (text, parent, parentPrelude) => {
	const node = S._walkNode;
	if (parent === null && S._nestedRuns.length === 1) {
		setRuleEntry(node, hoistedEntry(text, S._nestedRuns[0].prelude));
		return;
	}
	/** @type {RuleEntry[]} */
	const runs = [];
	if (parent !== null) runs.push(hoistedEntry(parent, parentPrelude));
	for (let i = 0; i < S._nestedRuns.length; i++) {
		runs.push(hoistedEntry(S._nestedRuns[i].text, S._nestedRuns[i].prelude));
	}
	setHoistedRuns(node, runs);
};

/**
 * A joined run's selector list, canonical. A run that joined nothing is written
 * as it stands, so a rule the hoist only moved pays no read of its own list.
 * @param {{ prelude: string, rest: string, joined: boolean }} run what the join left
 * @returns {string} the list to write
 */
const settledPrelude = (run) =>
	run.joined ? canonicalSelectorList(run.prelude) : run.prelude;

/**
 * Whether a rule's nested rules are taken out of it and written on their own.
 * @param {CssPath} path the walk's accessors
 * @param {Node | null} parent the rule this one is written in, if any
 * @returns {boolean} true when this rule is one of them
 */
const hoistedOutOf = (path, parent) =>
	S._loweringNesting &&
	parent !== null &&
	// An at-rule is what the rules in it are written under, so taking it out of
	// the rule it stands in would take them out of its query as well.
	path.type() === NodeType.QualifiedRule &&
	path.type(parent) === NodeType.QualifiedRule &&
	declarationsPrecedeRules(path, parent);

// `@custom-media --name <query>`, as printed: the name it states and the query.
const CUSTOM_MEDIA_RE = /^@[^\s]+\s+(--[^\s]+)\s+([^]+)$/;

/**
 * Take down what a `@custom-media` prelude names, so a condition asking for it
 * is written as the query instead. False where the prelude states no query.
 * @param {string} prelude the rule's printed prelude
 * @returns {boolean} true when the name was taken down
 */
const takeCustomMedia = (prelude) => {
	const found = CUSTOM_MEDIA_RE.exec(prelude);
	if (found === null) return false;
	if (!S._customAtRulesFixed) S._customMedia.set(found[1], found[2]);
	return true;
};

// `@custom-selector :--name <selector-list>`, as printed: the name and the list.
const CUSTOM_SELECTOR_RE = /^@[^\s]+\s+:(--[^\s]+)\s+([^]+)$/;

/**
 * Take down what a `@custom-selector` prelude names, so a selector asking for it
 * is written as the list instead. False where the prelude states no list.
 * @param {string} prelude the rule's printed prelude
 * @returns {boolean} true when the name was taken down
 */
const takeCustomSelector = (prelude) => {
	const found = CUSTOM_SELECTOR_RE.exec(prelude);
	if (found === null) return false;
	if (!S._customAtRulesFixed) S._customSelectors.set(found[1], found[2]);
	return true;
};

// The `An+B` microsyntax (CSS Syntax 3 §6), whose whitespace and `+` are its
// own: `2n + 1`, `+3` and `2N+1` all say what a shorter spelling does. Its
// whitespace is CSS's, so U+00A0 keeps an argument no engine reads as written.
const NTH_RE =
	/^[ \t\n\f\r]*(?:([+-]?)(\d*)[nN][ \t\n\f\r]*(?:([+-])[ \t\n\f\r]*(\d+))?|([+-]?)(\d+))[ \t\n\f\r]*$/;
const NTH_EDGE_SPACE_RE = /^[ \t\n\f\r]+|[ \t\n\f\r]+$/g;

/**
 * Write one `An+B` in its shortest equal spelling.
 * @param {string} text the argument between the parentheses
 * @returns {string | null} the shortest spelling, or null when it is not `An+B`
 */
const minifyNth = (text) => {
	const lower = text.replace(NTH_EDGE_SPACE_RE, "").toLowerCase();
	let a;
	let b;
	if (lower === "even") {
		a = 2;
		b = 0;
	} else if (lower === "odd") {
		a = 2;
		b = 1;
	} else {
		const parts = NTH_RE.exec(text);
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
	// matches nothing - so those terms are dropped by naming the first real one.
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
const URANGE_RE =
	/^u\+(?:([\da-f]{0,6})(\?{1,6})|([\da-f]{1,6})(?:-([\da-f]{1,6}))?)$/i;

/**
 * Write one `urange` in its shortest equal spelling: leading zeros carry
 * nothing, and a range whose start is a prefix followed by zeros and whose end
 * is that prefix followed by `f`s is what the `?` wildcard says.
 * @param {string} range one urange token
 * @returns {string} the shortest spelling, or `range` when nothing is shorter
 */
const minifyUnicodeRange = (range) => {
	if (!S._transforms.shortenNumbers) return range;
	const parts = URANGE_RE.exec(range);
	if (parts === null) return range;
	/** @type {(hex: string) => string} */
	const strip = (hex) => hex.replace(/^0+(?=.)/, "");
	// `U+00??` covers what `U+??` does - the zeros are as leading as any other.
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
			// `asciiCaseInsensitiveMatch` lowercases only its first argument.
			if (
				asciiCaseInsensitiveMatch(
					head,
					end.slice(0, end.length - wild).toLowerCase()
				)
			) {
				// Never longer: each `?` stands for a digit of the end it replaces.
				best = `U+${head.replace(/^0+/, "")}${"?".repeat(wild)}`;
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
const RANGE_PREFIX_RE = /^(min|max)-(.+)$/i;

/**
 * Rewrite a media feature's `min-` / `max-` prefix to the range spelling, in the
 * printed parts, in place. Only a whole `(<feature>:<value>)` - a condition made
 * of anything else (a boolean feature, an `and` chain, a nested block) is left
 * for its own parts to handle.
 * @param {string[]} parts the block's printed parts
 * @returns {void}
 */
const useRangeSpelling = (parts) => {
	if (!S._transforms.shortenMediaQueries) return;
	// The separators go with the join's condition trim, so a spaced
	// `( min-width : 1px )` is the same feature as a tight one.
	/** @type {number[]} */
	const filled = [];
	for (let i = 0; i < parts.length; i++) {
		if (parts[i].length !== 0 && parts[i] !== SEP) filled.push(i);
	}
	if (filled.length < 3 || parts[filled[1]] !== ":") return;
	const feature = RANGE_PREFIX_RE.exec(parts[filled[0]]);
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
const valueLayers = (components) => {
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
const sameComponents = (a, b) =>
	a.length === b.length && a.every((value, i) => value === b[i]);

/**
 * Turn components back into fragments: a separator between each pair, except
 * around the `/`, which needs none.
 * @param {string[]} components components in order
 * @returns {string[]} the fragments to join
 */
const spaced = (components) => {
	/** @type {string[]} */
	const parts = [];
	for (const component of components) {
		if (
			parts.length !== 0 &&
			component !== "/" &&
			parts[parts.length - 1] !== "/"
		) {
			parts.push(SEP);
		}
		parts.push(component);
	}
	return parts;
};

/**
 * Collapse a `{1,4}` box-notation value (see `BOX_SHORTHANDS`). `border-radius`
 * carries two boxes - `<horizontal> / <vertical>` - which collapse independently,
 * and a vertical box equal to the horizontal one is what the `/`-less form
 * already means.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {string} property the declaration's lowercased property name
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const collapseBoxShorthand = (path, property, node, writer) => {
	const components = valueComponents(path, node, writer);
	const slash = components.indexOf("/");
	if (slash === -1) {
		const box = collapseBox(components);
		return box === null || box.length === components.length
			? null
			: spaced(box);
	}
	// Only `border-radius` takes a second box. On the others a `/` is invalid, so
	// the browser already drops the declaration - collapsing it would switch it on.
	if (!SLASH_BOX_SHORTHANDS.has(property)) return null;
	if (components.lastIndexOf("/") !== slash) return null;
	const horizontal = collapseBox(components.slice(0, slash));
	const vertical = collapseBox(components.slice(slash + 1));
	if (horizontal === null || vertical === null) return null;
	// Rebuilt even when neither box collapsed: the `/` is a delim token, so the
	// whitespace around it is insignificant either way.
	return spaced(
		sameComponents(horizontal, vertical)
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
const collapseFlexShorthand = (path, node, writer) => {
	const components = valueComponents(path, node, writer);
	// IE10's `-ms-flex` follows the 2012 draft, whose omitted factors are not
	// today's, so only a value writing all three is read there.
	return path.name(node).toLowerCase() === "-ms-flex"
		? shortestFlexValue(components)
		: shortestAuthoredFlex(components);
};

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
const collapseFontWeight = (path, node, writer) => {
	// A second child, whitespace or not, is a value this rewrite is not defined
	// for; a value-less declaration never reaches here.
	if (path.childCount(node) !== 1) return null;
	const only = writer.get(path.child(0, node));
	const number = FONT_WEIGHT_NUMBERS.get(only.toLowerCase());
	return number === undefined ? null : [number];
};

// The slots of one `<single-transition>`, told apart by what each can spell.
const TRANSITION_TIME_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:s|ms)$/i;
const TRANSITION_EASING_FUNCTION_RE = /^(?:cubic-bezier|steps|linear)\(/i;

/**
 * Write one `transition` in the order its grammar lists the slots. `||` makes
 * them order-free, so the same declaration has many spellings and one of them
 * repeats across a stylesheet. The two `<time>`s stay in the order they were
 * written - the first is the duration and the second the delay.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const orderTransitionSlots = (components) => {
	if (components.length < 2) return null;
	/** @type {string[]} */
	const times = [];
	/** @type {string[]} */
	const easings = [];
	/** @type {string[]} */
	const behaviors = [];
	/** @type {string[]} */
	const names = [];
	for (const one of components) {
		const lowered = toLowerCaseIfNeeded(one);
		if (TRANSITION_TIME_RE.test(one)) {
			times.push(one);
		} else if (
			EASING_KEYWORDS.has(lowered) ||
			TRANSITION_EASING_FUNCTION_RE.test(one)
		) {
			easings.push(one);
		} else if (TRANSITION_BEHAVIORS.has(lowered)) {
			behaviors.push(one);
		} else if (PLAIN_IDENT_RE.test(one)) {
			names.push(one);
		} else {
			return null;
		}
	}
	// An easing keyword is a valid property name too, so a value with no name of
	// its own leaves which slot it fills to the engine - that one is left alone.
	if (names.length !== 1 || times.length > 2 || easings.length > 1) return null;
	if (behaviors.length > 1) return null;
	// `all` is the property a layer naming none transitions, so writing it is
	// spare - as long as something else is left to keep the layer from emptying.
	const named =
		toLowerCaseIfNeeded(names[0]) === "all" && components.length > 1
			? []
			: names;
	// Never empty: a dropped `all` leaves a second component behind.
	const ordered = [...named, ...times, ...easings, ...behaviors];
	return ordered.join(" ") === components.join(" ") ? null : ordered;
};

/**
 * Whether a shadow layer has the shape its grammar takes: one run of lengths in
 * range, and at most one color and one `inset` around it.
 * @param {string[]} layer the layer's components
 * @param {number} start where its last run of lengths starts
 * @param {number} end where that run ends
 * @param {number} minimum the fewest lengths a shadow takes
 * @param {number} maximum the most lengths a shadow takes
 * @returns {boolean} true when the layer is a valid shadow
 */
const isShadowLayer = (layer, start, end, minimum, maximum) => {
	if (end - start < minimum || end - start > maximum) return false;
	let colors = 0;
	let insets = 0;
	for (let j = 0; j < layer.length; j++) {
		if (j >= start && j < end) continue;
		if (NUMERIC_RE.test(layer[j])) return false;
		if (asciiCaseInsensitiveMatch(layer[j], "inset")) insets++;
		else colors++;
	}
	return colors <= 1 && insets <= 1;
};

/**
 * Drop what a shadow's notation already implies: lengths past the mandatory
 * count default to zero, and an absent color is `currentcolor` (CSS Backgrounds 3 §7.1).
 * A box shadow's `inset` is written first, its grammar reading it at either end.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const dropShadowDefaults = (property, components) => {
	const lengths = SHADOW_PROPERTIES.get(property);
	if (lengths === undefined) return null;
	const [minimum, maximum] = lengths;
	// A quoted string could carry the comma the layer split reads.
	for (const component of components) {
		if (component.includes('"') || component.includes("'")) return null;
	}
	const layers = valueLayers(components);
	/** @type {string[]} */
	const out = [];
	let changed = false;
	for (let i = 0; i < layers.length; i++) {
		const layer = layers[i];
		if (layer.length === 0) return null;
		let end = layer.length;
		while (end > 0 && !NUMERIC_RE.test(layer[end - 1])) end--;
		let start = end;
		while (start > 0 && NUMERIC_RE.test(layer[start - 1])) start--;
		// An invalid layer drops the declaration, so one a rewrite could make
		// valid - two colors, lengths parted or out of range - is left as written.
		if (!isShadowLayer(layer, start, end, minimum, maximum)) return null;
		let last = end;
		// The components are as authored - the zero-unit drop prints later - so a
		// trailing zero is `0px` as often as `0`.
		while (last - start > minimum && isZeroLength(layer[last - 1])) {
			last--;
			changed = true;
		}
		/** @type {string[]} */
		const kept = [];
		for (let j = 0; j < layer.length; j++) {
			if (j >= last && j < end) continue;
			if (asciiCaseInsensitiveMatch(layer[j], "currentcolor")) {
				changed = true;
				continue;
			}
			kept.push(layer[j]);
		}
		// `inset` may stand at either end; one place for it lets gzip match shadows
		// a stylesheet wrote it at different ends of.
		const inset = kept.findIndex((part) =>
			asciiCaseInsensitiveMatch(part, "inset")
		);
		if (inset > 0 && property === "box-shadow") {
			kept.unshift(kept.splice(inset, 1)[0]);
			changed = true;
		}
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
const collapseTransitionLayers = (property, components) => {
	// A quoted string could carry a comma the layer split would part.
	for (const component of components) {
		if (component.includes('"') || component.includes("'")) return null;
	}
	const layers = valueLayers(components);
	/** @type {string[]} */
	const out = [];
	let changed = false;
	for (let i = 0; i < layers.length; i++) {
		let layer = layers[i];
		if (layer.length === 0) return null;
		const layered = dropLayerInitials(property, layer);
		const dropped = dropInitialKeywords(property, layered || layer) || layered;
		if (dropped !== null) {
			layer = dropped;
			changed = true;
		}
		const timed = dropZeroTimes(layer);
		if (timed !== null) {
			layer = timed;
			changed = true;
		}
		const ordered = orderTransitionSlots(layer);
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

// The keyword each `animation` slot starts as, where no name can be it: a
// layer's keywords fill their slots before its name does.
const ANIMATION_SLOT_INITIALS = new Map([
	["animation-timing-function", "ease"],
	["animation-direction", "normal"],
	["animation-play-state", "running"]
]);

/**
 * Drop an `animation` layer's keyword that is its slot's initial, where it is
 * the one word filling that slot. Two would make the second the name.
 * @param {string[]} layer one layer's components
 * @returns {string[] | null} the kept components, or null when nothing went
 */
const dropAnimationKeywordInitials = (layer) => {
	if (layer.length < 2) return null;
	const lowered = layer.map((one) => toLowerCaseIfNeeded(one));
	/** @type {Set<number>} */
	const dropped = new Set();
	for (const [slot, initial] of ANIMATION_SLOT_INITIALS) {
		const keywords = /** @type {string[]} */ (
			ANIMATION_KEYWORD_SLOTS.get(slot)
		);
		const calls = slot === "animation-timing-function";
		const filling = lowered.filter(
			(one) => keywords.includes(one) || (calls && one.includes("("))
		);
		if (filling.length === 1 && filling[0] === initial) {
			dropped.add(lowered.indexOf(initial));
		}
	}
	if (dropped.size === 0 || dropped.size === layer.length) return null;
	return layer.filter((_, i) => !dropped.has(i));
};

/**
 * Shorten every `<single-animation>` in an `animation`, the way a transition's
 * layers are shortened - the same two `<time>` slots and the same per-layer
 * reading. The slots are not reordered: which of them a keyword fills is a
 * question the order answers, `none` naming both an animation and a fill mode.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const collapseAnimationLayers = (components) => {
	// A quoted string could carry a comma the layer split would part; an
	// animation's name is one a stylesheet may write.
	for (const component of components) {
		if (component.includes('"') || component.includes("'")) return null;
	}
	const layers = valueLayers(components);
	/** @type {string[]} */
	const out = [];
	let changed = false;
	for (let i = 0; i < layers.length; i++) {
		let layer = layers[i];
		if (layer.length === 0) return null;
		for (const drop of [
			dropInitialKeywords,
			dropAnimationKeywordInitials,
			dropZeroTimes,
			dropSingleCount
		]) {
			const kept =
				drop === dropInitialKeywords
					? dropInitialKeywords("animation", layer)
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
const CARRIES_DIGIT_RE = /\d/;

/**
 * Write the `font` shorthand's weight as the number naming it. The slots before
 * `<font-size>` are the style / variant / weight / width ones, and the family
 * only ever follows the size - so a `bold` with a size after it is the weight,
 * while `font: 12px bold` names a family and keeps the word.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const numberFontShorthandWeight = (components) => {
	const size = components.findIndex(
		(one) =>
			CARRIES_DIGIT_RE.test(one) ||
			FONT_SIZE_KEYWORDS.has(toLowerCaseIfNeeded(one))
	);
	if (size <= 0) return null;
	let changed = false;
	const out = components.map((one, index) => {
		if (index < size && asciiCaseInsensitiveMatch(one, "bold")) {
			changed = true;
			return "700";
		}
		return one;
	});
	return changed ? out : null;
};

// A component that is exactly zero, whatever unit the zero-unit drop left it in.
const ZERO_COMPONENT_RE = /^[+-]?0(?:\.0*)?$/;

// Zero written bare or as a percentage - a percentage of any size is nothing.
const ZERO_OR_PERCENTAGE_RE = /^[+-]?0(?:\.0*)?%?$/;

const ONE_COMPONENT_RE = /^\+?1(?:\.0*)?$/;

/**
 * @param {string} value a printed component
 * @returns {boolean} whether it is the number one
 */
const isOne = (value) => ONE_COMPONENT_RE.test(value);

// A value that is one percentage and nothing else.
const LONE_PERCENTAGE_RE = /^([+-]?)(\d*)(?:\.(\d*))?%$/;

/**
 * Write an `<alpha-value>` percentage as the number naming the same quantity:
 * the decimal point moved two places, which is exact where dividing is not.
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, or the shorter number
 */
const numberAlphaValue = (property, value) => {
	if (!S._transforms.shortenNumbers) return value;
	if (!ALPHA_VALUE_PROPERTIES.has(property)) return value;
	const parts = LONE_PERCENTAGE_RE.exec(value);
	if (parts === null) return value;
	const digits = `00${parts[2]}`;
	// A number rounds to fewer digits than the percentage it was printed as.
	const shifted = roundSignificant(
		normalizeNumber(
			`${parts[1]}${digits.slice(0, -2)}.${digits.slice(-2)}${parts[3] || ""}`
		),
		""
	);
	return shifted.length < value.length ? shifted : value;
};

// A ratio whose denominator is the `1` an omitted one means, taken as a whole
// component so the `1` of `2/10` is no match.
const RATIO_OVER_ONE_RE = /(^|\s)((?:\d+\.?\d*|\.\d+))\s*\/\s*1(?=$|\s)/g;

/**
 * Drop a `<ratio>`'s denominator where it is the 1 an omitted one means, and the
 * spaces around the slash of one that stays (`16/9`, as lightningcss writes it).
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, its `/1` dropped
 */
const dropRatioDenominator = (property, value) => {
	if (!S._transforms.shortenNumbers) return value;
	// A substitution could expand to a number of its own, turning the `1` into
	// the denominator of a ratio this does not see.
	if (!RATIO_PROPERTIES.has(property) || containsSubstitutionFunction(value)) {
		return value;
	}
	return value.replace(RATIO_OVER_ONE_RE, "$1$2").replace(/\s*\/\s*/g, "/");
};

/**
 * Drop a layer's second value where the one-value form already means it.
 * @param {string} property the lowercased property name
 * @param {string} value the printed value
 * @returns {string} the value, shortened where it says nothing
 */
const dropDefaultSecondValue = (property, value) => {
	if (!S._transforms.shortenValues) return value;
	if (!AUTO_SECOND_VALUE_PROPERTIES.has(property)) return value;
	// With `--x:1px 2px` the `auto` is a third value, so dropping it would turn a
	// declaration the engine discards into one it keeps.
	if (containsSubstitutionFunction(value)) return value;
	let changed = false;
	const layers = splitTopLevelArguments(value).map((layer) => {
		const parts = splitTopLevelSpaces(layer.trim());
		if (parts.length !== 2 || !asciiCaseInsensitiveMatch(parts[1], "auto")) {
			return layer;
		}
		// Each of these stands alone, so the second value makes a declaration the
		// engine drops - one a later declaration was written to beat.
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
const reduceTransformFunctionDeep = (fn, inner) => {
	let out = reduceTransformFunction(fn, inner);
	if (out === null) return null;
	// Fed back as the name and arguments it was built from, rather than printed
	// and matched apart again - the reduction already hands back both.
	for (;;) {
		const next = reduceTransformFunction(out[0], out[1]);
		if (next === null) {
			// Written the way the same call written by hand is: the shorter name
			// may carry a zero its own grammar lets go bare.
			const args = S._transforms.shortenNumbers
				? dropCallZeroUnit(toLowerCaseIfNeeded(out[0]), out[1])
				: out[1];
			return `${out[0]}(${args})`;
		}
		out = next;
	}
};

// A component that is zero however it is spelled.
/** @type {(arg: string) => boolean} */
const isZeroComponent = (arg) => ZERO_COMPONENT_RE.test(arg);

// A translation's components are `<length-percentage>`, where a zero of either
// kind is the same no-op - a percentage resolves against the element's own size.
/** @type {(arg: string) => boolean} */
const isZeroOffset = (arg) =>
	ZERO_OR_PERCENTAGE_RE.test(arg) || ZERO_LENGTH_RE.test(arg);

// A translation's z is a `<length>` alone, so a percentage is invalid there and
// dropping it would revive a declaration the engine throws away.
/** @type {(arg: string) => boolean} */
const isZeroLength = (arg) =>
	ZERO_COMPONENT_RE.test(arg) || ZERO_LENGTH_RE.test(arg);

// The slots a 3D matrix holds to be the 2D one it names, as slot and value.
const MATRIX3D_IDENTITY_2D = [
	2, 0, 3, 0, 6, 0, 7, 0, 8, 0, 9, 0, 11, 0, 14, 0, 10, 1, 15, 1
];

// The slots a 3D matrix that is only a translation or a scale leaves empty:
// everything off the diagonal and off the fourth column, as slot and value.
const MATRIX3D_DIAGONAL_ONLY = [
	1, 0, 2, 0, 3, 0, 4, 0, 6, 0, 7, 0, 8, 0, 9, 0, 11, 0, 15, 1
];

// A `matrix()` / `matrix3d()` argument is a `<number>` (CSS Transforms 2 §8), so
// anything carrying a unit is no matrix to read.
const MATRIX_NUMBER_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * A matrix's arguments as numbers, or null when they are not `count` numbers.
 * @param {string[]} args the printed arguments
 * @param {number} count how many the function takes
 * @returns {number[] | null} the numbers, or null
 */
const matrixNumbers = (args, count) => {
	if (args.length !== count) return null;
	/** @type {number[]} */
	const out = [];
	for (const one of args) {
		if (!MATRIX_NUMBER_RE.test(one)) return null;
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
const matrixSlotsAre = (matrix, pattern) => {
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
const matrixOffset = (written, value) => (value === 0 ? "0" : `${written}px`);

// Each transform function that names a shorter one, and how. A name absent here
// reduces to nothing, which is what lets the caller ask before parting arguments.
/** @type {Map<string, (args: string[]) => [string, string] | null>} */
const TRANSFORM_REDUCERS = new Map([
	[
		// A matrix says in six numbers what a named function says in one or two,
		// and every shape read here is exact - a rotation is only rational at a
		// quarter turn, so no other angle is taken back out of one.
		"matrix",
		(args) => {
			const matrix = matrixNumbers(args, 6);
			if (matrix === null) return null;
			if (matrixSlotsAre(matrix, [1, 0, 2, 0, 4, 0, 5, 0])) {
				return ["scale", `${args[0]},${args[3]}`];
			}
			if (matrixSlotsAre(matrix, [0, 1, 1, 0, 2, 0, 3, 1])) {
				return [
					"translate",
					`${matrixOffset(args[4], matrix[4])},${matrixOffset(
						args[5],
						matrix[5]
					)}`
				];
			}
			if (matrixSlotsAre(matrix, [0, 0, 3, 0, 4, 0, 5, 0])) {
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
			if (isZeroOffset(args[1])) return ["translate", args[0]];
			if (isZeroOffset(args[0])) return ["translateY", args[1]];
			return null;
		}
	],
	[
		"translate3d",
		(args) => {
			if (args.length !== 3) return null;
			if (isZeroOffset(args[0]) && isZeroOffset(args[1])) {
				return ["translateZ", args[2]];
			}
			if (isZeroLength(args[2])) return ["translate", `${args[0]},${args[1]}`];
			return null;
		}
	],
	[
		// `scale(x, x)` is `scale(x)` - the second factor defaults to the first.
		"scale",
		(args) => {
			if (args.length !== 2) return null;
			if (args[0] === args[1]) return ["scale", args[0]];
			// A factor of 1 scales nothing along its axis, leaving the other axis's
			// own function.
			if (isOne(args[1])) return ["scaleX", args[0]];
			if (isOne(args[0])) return ["scaleY", args[1]];
			return null;
		}
	],
	[
		"scale3d",
		(args) => {
			if (args.length !== 3) return null;
			// A z factor of 1 scales nothing along it, leaving the 2D scale.
			if (isOne(args[2])) return ["scale", `${args[0]},${args[1]}`];
			// ...and a 2D pair of 1 leaves the z scale alone.
			if (isOne(args[0]) && isOne(args[1])) return ["scaleZ", args[2]];
			return null;
		}
	],
	[
		"matrix3d",
		(args) => {
			const matrix = matrixNumbers(args, 16);
			if (matrix === null) return null;
			// CSS Transforms 2 §12: a 3D matrix whose third row and column are the
			// identity's is the 2D matrix of the six values it leaves.
			if (matrixSlotsAre(matrix, MATRIX3D_IDENTITY_2D)) {
				return [
					"matrix",
					`${args[0]},${args[1]},${args[4]},${args[5]},${args[12]},${args[13]}`
				];
			}
			// ...and one that leaves no 2D matrix may still be a translation or a
			// scale alone. Column-major, so the fourth column translates and the
			// diagonal scales - nothing off either is a shear or a rotation.
			if (!matrixSlotsAre(matrix, MATRIX3D_DIAGONAL_ONLY)) return null;
			if (matrixSlotsAre(matrix, [0, 1, 5, 1, 10, 1])) {
				return [
					"translate3d",
					`${matrixOffset(args[12], matrix[12])},${matrixOffset(
						args[13],
						matrix[13]
					)},${matrixOffset(args[14], matrix[14])}`
				];
			}
			if (matrixSlotsAre(matrix, [12, 0, 13, 0, 14, 0])) {
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
				isZeroComponent(args[1]) && isZeroComponent(args[2]) && isOne(args[0])
					? "rotateX"
					: isZeroComponent(args[0]) &&
						  isZeroComponent(args[2]) &&
						  isOne(args[1])
						? "rotateY"
						: isZeroComponent(args[0]) &&
							  isZeroComponent(args[1]) &&
							  isOne(args[2])
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
const reduceTransformFunction = (fn, inner) => {
	if (!S._transforms.reduceFunctions) return null;
	const reduce = TRANSFORM_REDUCERS.get(fn);
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
 * Drop the direction a linear gradient flows in anyway, or write a side keyword
 * as the shorter angle naming it. CSS Images 3 §3.1: with no `<side-or-corner>`
 * and no angle the gradient runs top to bottom, which `to bottom` names.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the rewritten arguments, or null to keep them
 */
const reduceGradientDirection = (fn, inner) => {
	if (!LINEAR_GRADIENTS.has(fn) || !S._transforms.reduceFunctions) return null;
	const comma = inner.indexOf(",");
	if (comma === -1) return null;
	const first = inner.slice(0, comma).trim().toLowerCase().replace(/\s+/g, " ");
	if (DEFAULT_GRADIENT_DIRECTIONS.has(first)) {
		return inner.slice(comma + 1).trim();
	}
	if (REVERSED_GRADIENT_DIRECTIONS.has(first)) {
		const stops = splitTopLevelArguments(inner.slice(comma + 1)).map((stop) =>
			stop.trim()
		);
		// Only bare colors: a position or a hint would have to be mirrored too.
		if (stops.every(isBareColor)) return stops.reverse().join(",");
	}
	const angle = GRADIENT_SIDE_ANGLES.get(first);
	if (angle === undefined) return null;
	return `${angle},${inner.slice(comma + 1).trim()}`;
};

/**
 * Whether a printed component is a color and nothing else: a hex color, a color
 * keyword or a color function's call.
 * @param {string} component the component
 * @returns {boolean} true for a color
 */
const isBareColor = (component) => {
	if (splitTopLevelSpaces(component).length !== 1) return false;
	if (component.charCodeAt(0) === CC_NUMBER_SIGN) return true;
	const open = component.indexOf("(");
	if (open === -1) return COLOR_KEYWORDS.has(toLowerCaseIfNeeded(component));
	return (
		component.charCodeAt(component.length - 1) === CC_RIGHT_PARENTHESIS &&
		COLOR_FUNCTIONS.has(toLowerCaseIfNeeded(component.slice(0, open)))
	);
};

/**
 * Drop the `at <position>` a radial or conic gradient is centered on anyway, and
 * with it a first argument it leaves empty.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the arguments without it, or null to keep them
 */
const dropDefaultGradientPosition = (fn, inner) => {
	if (
		LINEAR_GRADIENTS.has(fn) ||
		!GRADIENT_LAST_POSITIONS.has(fn) ||
		!S._transforms.reduceFunctions
	) {
		return null;
	}
	const comma = inner.indexOf(",");
	if (comma === -1) return null;
	const match = GRADIENT_AT_RE.exec(inner.slice(0, comma));
	if (match === null) return null;
	const position = match[2].toLowerCase().replace(/\s+/g, " ");
	if (!DEFAULT_GRADIENT_POSITIONS.has(position)) return null;
	// Removing `at` from a color stop would make an invalid gradient valid.
	if (
		match[1] !== undefined &&
		splitTopLevelSpaces(match[1]).some(isBareColor)
	) {
		return null;
	}
	const rest = inner.slice(comma + 1).trim();
	return match[1] === undefined ? rest : `${match[1]},${rest}`;
};

// The basic shapes `dropDefaultShapeParts` reads, so every other call is
// turned away before its arguments are scanned.
const BASIC_SHAPE_FUNCTIONS = new Set([
	"polygon",
	"path",
	"circle",
	"ellipse",
	"inset",
	"rect",
	"xywh"
]);

/**
 * Drop what a basic shape (CSS Shapes 1 §3) says with its own defaults: a
 * `closest-side` radius, a zero corner `round`, `nonzero`, and the sides an
 * `inset()` repeats. Never the `at` position, which engines read back as written.
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @returns {string | null} the arguments without them, or null to keep them
 */
const dropDefaultShapeParts = (fn, inner) => {
	if (
		!BASIC_SHAPE_FUNCTIONS.has(fn) ||
		!S._transforms.reduceFunctions ||
		containsSubstitutionFunction(inner)
	) {
		return null;
	}
	if (fn === "polygon" || fn === "path") {
		// Only `clip-path` gives `path()` a fill rule: elsewhere one is a value the
		// engine drops, which taking it out would bring back.
		if (fn === "path") {
			// A shape is rewritten in a declaration's value alone.
			const property = A.name(
				/** @type {Node} */ (S._valueDeclaration)
			).toLowerCase();
			if (property !== "clip-path" && property !== "-webkit-clip-path") {
				return null;
			}
		}
		const comma = inner.indexOf(",");
		if (
			comma === -1 ||
			!asciiCaseInsensitiveMatch(inner.slice(0, comma), "nonzero")
		) {
			return null;
		}
		return inner.slice(comma + 1);
	}
	const parts = splitPrintedComponents(inner);
	if (fn === "circle" || fn === "ellipse") {
		let at = parts.length;
		for (let i = 0; i < parts.length; i++) {
			if (asciiCaseInsensitiveMatch(parts[i], "at")) {
				at = i;
				break;
			}
		}
		// An ellipse names both radii or neither.
		if (at !== (fn === "circle" ? 1 : 2)) return null;
		for (let i = 0; i < at; i++) {
			if (!asciiCaseInsensitiveMatch(parts[i], "closest-side")) return null;
		}
		return at === parts.length ? "" : joinSlots(parts.slice(at));
	}
	// What is left of `BASIC_SHAPE_FUNCTIONS`: `inset()`, `rect()` and `xywh()`.
	let round = parts.length;
	for (let i = 0; i < parts.length; i++) {
		if (asciiCaseInsensitiveMatch(parts[i], "round")) {
			round = i;
			break;
		}
	}
	let radius = parts.slice(round);
	if (radius.length > 1) {
		let zero = true;
		for (let i = 1; i < radius.length && zero; i++) {
			// A radius is a `<length-percentage>`: `0deg` is no zero it takes.
			zero = radius[i] === "/" || isZeroOffset(radius[i]);
		}
		if (zero) {
			radius = [];
		} else {
			// The radii are `border-radius`'s, each side of the `/` a `{1,4}` box.
			const slash = radius.indexOf("/");
			const halves =
				slash === -1
					? [radius.slice(1)]
					: [radius.slice(1, slash), radius.slice(slash + 1)];
			/** @type {string[][]} */
			const boxes = [];
			for (const half of halves) {
				const box = collapseBox(half);
				if (box === null) return null;
				boxes.push(box);
			}
			// A vertical half repeating the horizontal one says nothing.
			if (boxes.length === 2 && boxes[1].join(" ") === boxes[0].join(" ")) {
				boxes.pop();
			}
			radius =
				boxes.length === 1
					? [radius[0], ...boxes[0]]
					: [radius[0], ...boxes[0], "/", ...boxes[1]];
		}
	}
	// `rect()` and `xywh()` read their four values by position.
	let edges = parts.slice(0, round);
	if (fn === "inset") {
		const collapsed = collapseBox(edges);
		if (collapsed === null) return null;
		edges = collapsed;
	} else if (edges.length !== 4) {
		return null;
	}
	const text = joinSlots([...edges, ...radius]);
	return text.length < inner.length ? text : null;
};

// A gradient's first argument ending in `at <position>`, the part before it kept.
const GRADIENT_AT_RE = /^\s*(?:(\S.*?)\s+)?at\s+([^()]+?)\s*$/i;

/**
 * Fold what a gradient's own grammar already says about its color stops: the
 * last stop's position where the fix-up puts it there anyway (CSS Images 3
 * §3.4.3), and - where the target reads the two-position syntax - two adjacent
 * stops of one color as the one stop naming both (CSS Images 4 §3.4).
 * @param {string} fn the lowercased function name
 * @param {string} inner the already-joined argument text
 * @param {boolean} double whether a two-position stop may be emitted
 * @returns {string | null} the rewritten arguments, or null to keep them
 */
const foldGradientStops = (fn, inner, double) => {
	if (!S._transforms.reduceFunctions) return null;
	const implied = GRADIENT_LAST_POSITIONS.get(fn);
	if (implied === undefined) return null;
	const args = splitTopLevelArguments(inner);
	// A one-argument gradient states no stop list to read.
	if (args.length < 2) return null;
	let changed = false;
	// The last argument is always a color stop: the grammar puts one after every
	// color hint. A stop already carrying two positions is not that one value.
	const last = splitTopLevelSpaces(args[args.length - 1]);
	if (last.length === 2 && implied.has(last[1].toLowerCase())) {
		args[args.length - 1] = last[0];
		changed = true;
	}
	if (double) {
		for (let i = args.length - 1; i > 0; i--) {
			const one = splitTopLevelSpaces(args[i]);
			const before = splitTopLevelSpaces(args[i - 1]);
			// Two positions on one stop are the two stops they would be written as,
			// so only a pair naming one color folds - and a color hint, which is a
			// position alone, is no stop to fold with.
			if (
				one.length !== 2 ||
				before.length !== 2 ||
				!asciiCaseInsensitiveMatch(before[0], one[0].toLowerCase())
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
const STOP_POSITION_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)?$/i;

/**
 * Write a color stop's two positions as the two stops they name
 * (`red 30% 40%` is `red 30%,red 40%`), for a target that does not read the
 * double-position notation (CSS Images 4). The inverse of the fold
 * `foldGradientStops` makes where the target does.
 *
 * A gradient's first argument may be its direction, shape or size rather than a
 * stop - `ellipse 50% 50%` has the shape of a double-position stop without being
 * one - so it is split only where it starts with something that is certainly a
 * color. Every later argument is a stop by the grammar.
 * @param {string} fn the function name, lowercased
 * @param {string} inner the argument text
 * @returns {string | null} the rewritten arguments, or null when nothing changed
 */
const splitDoublePositionStops = (fn, inner) => {
	if (!GRADIENT_LAST_POSITIONS.has(fn)) return null;
	const args = splitTopLevelArguments(inner);
	let changed = false;
	for (let i = args.length - 1; i >= 0; i--) {
		const one = splitTopLevelSpaces(args[i]);
		if (
			one.length !== 3 ||
			!STOP_POSITION_RE.test(one[1]) ||
			!STOP_POSITION_RE.test(one[2])
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
const collapseRepeatedPair = (property, components) => {
	// One value of a pair shorthand sets both its sides to it, except a keyword
	// only one side takes: `place-content:baseline baseline` is dropped whole.
	if (components.length === 2 && PAIR_LONGHANDS.has(property)) {
		const pair = collapseBox(components);
		const unshared = UNSHARED_LONGHAND_KEYWORDS.get(property);
		if (
			pair !== null &&
			pair.length === 1 &&
			(unshared === undefined ||
				!unshared.has(toLowerCaseIfNeeded(components[0])))
		) {
			return pair;
		}
	}
	if (
		components.length === 2 &&
		REPEAT_STYLE_PROPERTIES.has(property) &&
		asciiCaseInsensitiveMatch(components[0], components[1].toLowerCase()) &&
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
const componentSpelling = (component) => {
	const open = component.indexOf("(");
	return open === -1 ? component : `${component.slice(0, open)}()`;
};

// A `<time>` of zero, whichever unit it is spelled in.
const ZERO_TIME_RE = /^[+-]?(?:0+\.?0*|\.0+)m?s$/i;

/**
 * Drop a `<time>` of zero, which is the time a transition or an animation runs
 * with anyway - both the duration and the delay default to it. Only the last one
 * the layer states: the first `<time>` fills the duration slot and the second the
 * delay, so dropping the first hands the delay's value to the duration, while
 * dropping the last leaves what stands before it where it was.
 * @param {string[]} components one layer's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const dropZeroTimes = (components) => {
	if (components.length < 2) return null;
	// Two slots take a time - the duration and the delay - so a layer holding a
	// third is one no engine reads, and dropping from it would bring it to life.
	let times = 0;
	for (const one of components) {
		if (TRANSITION_TIME_RE.test(one)) times++;
	}
	if (times > 2) return null;
	let kept = components;
	for (;;) {
		let at = -1;
		for (let i = 0; i < kept.length; i++) {
			if (TRANSITION_TIME_RE.test(kept[i])) at = i;
		}
		if (at === -1 || kept.length < 2 || !ZERO_TIME_RE.test(kept[at])) break;
		kept = [...kept.slice(0, at), ...kept.slice(at + 1)];
	}
	return kept === components ? null : kept;
};

// The iteration count an animation runs with anyway. A `<number>` is the one
// thing that slot takes, and nothing else in the shorthand takes one.
const ONE_COUNT_RE = /^\+?1(?:\.0*)?$/;

/**
 * Drop an iteration count of one from an animation's layer.
 * @param {string[]} components one layer's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const dropSingleCount = (components) => {
	if (components.length < 2) return null;
	// One slot takes it, so a layer naming a second number is one no engine
	// reads, and dropping from it would bring it to life.
	let numbers = 0;
	for (const one of components) {
		const written = LONE_NUMBER_RE.exec(one);
		if (written !== null && written[1] === undefined) numbers++;
	}
	if (numbers > 1) return null;
	const at = components.findIndex((one) => ONE_COUNT_RE.test(one));
	if (at === -1) return null;
	const kept = [...components];
	kept.splice(at, 1);
	return kept;
};

/**
 * Whether a component fills the slot an initial keyword stands in - one of its
 * spellings, or a value of a class it takes. A value this cannot class at all
 * (a call, a nested list) is read as filling any slot that takes more than
 * spellings, since what it is there is not knowable from here.
 * @param {string} written the component, as printed
 * @param {string} lower the same, lowercased
 * @param {{ spellings: Set<string>, classes: Set<string> }} slot what the slot takes
 * @param {boolean=} unclassified what to answer for a value this cannot class
 * @returns {boolean} true when the component may be filling it
 */
const fillsSlot = (written, lower, slot, unclassified = true) => {
	if (slot.spellings.has(lower)) return true;
	if (slot.classes.size === 0) return false;
	const classes = valueClasses(written, lower);
	if (classes === null) return unclassified;
	for (const name of classes) {
		if (slot.classes.has(name)) return true;
	}
	return false;
};

/**
 * Whether a component may be one piece of a layer's `<position>`: an edge
 * keyword, `center` or a `<length-percentage>`, which no other slot of a layer
 * takes outside the `<bg-size>` after a `/`.
 * @param {string} written the component, as printed
 * @returns {boolean} true when it may be part of the position
 */
const isPositionPiece = (written) => {
	const lower = toLowerCaseIfNeeded(written);
	return (
		POSITION_X_KEYWORDS.has(lower) ||
		POSITION_Y_KEYWORDS.has(lower) ||
		NUMERIC_RE.test(lower)
	);
};

/**
 * Drop the shorthand slots holding what they already default to. A sibling out
 * of the same slot's spellings - one of its keywords, or a call to one of its
 * functions - means the value fills that slot twice, which is a declaration the
 * engine drops; dropping one of them would revive it.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const dropInitialKeywords = (property, components) => {
	const table = getShorthandInitialKeywords().get(property);
	if (table === undefined || components.length < 2) return null;
	// A comma parts two layers and a `/` reaches a slot through another's value;
	// either way the slots are no longer this one flat list.
	for (const component of components) {
		if (component.includes(",") || component === "/") return null;
	}
	const lowered = components.map((one) =>
		componentSpelling(toLowerCaseIfNeeded(one))
	);
	const drop = components.map((_component, i) => {
		const slot = table.get(lowered[i]);
		return (
			slot !== undefined &&
			!components.some(
				(other, j) => j !== i && fillsSlot(other, lowered[j], slot)
			)
		);
	});
	// CSS Values 4 §2.2: `||` matches each slot's components together, so a run
	// parting two that one slot takes is what leaves `wrap row balance` invalid.
	for (let i = 0; i < components.length; i++) {
		if (!drop[i]) continue;
		let end = i;
		while (end + 1 < components.length && drop[end + 1]) end++;
		if (i > 0 && end + 1 < components.length) {
			// A layer's `<position>` has no initial keyword, so no table slot.
			if (
				LAYER_INITIALS.has(property) &&
				isPositionPiece(components[i - 1]) &&
				isPositionPiece(components[end + 1])
			) {
				drop.fill(false, i, end + 1);
				i = end;
				continue;
			}
			for (const slot of table.values()) {
				if (
					fillsSlot(components[i - 1], lowered[i - 1], slot, false) &&
					fillsSlot(components[end + 1], lowered[end + 1], slot, false)
				) {
					drop.fill(false, i, end + 1);
					break;
				}
			}
		}
		i = end;
	}
	const kept = components.filter((_component, i) => !drop[i]);
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
const BACKGROUND_BOXES = new Set([
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
// whole, or a `<length-percentage>`. Nothing that may stand after a size - a
// repeat style, an attachment, a box, a color - is any of those.
const BACKGROUND_SIZE_RE =
	/^(?:auto|cover|contain|[+-]?(?:\d+\.?\d*|\.\d+)(?:[a-z]+|%)?)$/i;

/**
 * Whether a component is a `<bg-size>` at all, which is what says where the
 * size slot ends.
 * @param {string | undefined} written the component, or undefined past the end
 * @returns {boolean} true when it is one
 */
const isBackgroundSize = (written) =>
	written !== undefined && BACKGROUND_SIZE_RE.test(written);

/**
 * The percentage a `<position>` component resolves to, or null where it is not
 * one this can resolve - an offset from an edge, a substitution, a length.
 * @param {string} written the component
 * @param {number} axis 0 for the x axis, 1 for the y
 * @returns {string | null} the percentage, or null
 */
const positionPercentage = (written, axis) => {
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

// The spellings of the transparent black a `background` color starts as.
const TRANSPARENT_SPELLINGS = new Set(["transparent", "#0000", "#00000000"]);

/**
 * Drop what a layered shorthand's layer says with its slots' own initial
 * values: a `<position>` that resolves where an unwritten one does - with the
 * `<bg-size>` after it, when that is the initial too - and the `<box>` pair its
 * origin and clip default to.
 *
 * Read positionally, since these slots are not order-free: the size follows the
 * `/` and the position stands directly before it, and the boxes are the run of
 * `<box>` keywords. A layer this cannot read that way is left alone.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components one layer's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the layer
 */
const dropLayerInitials = (property, components) => {
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
				positionPercentage(components[at - 1], 0) !== null &&
				positionPercentage(components[at], 1) !== null
			) {
				end = at + 1;
				break;
			}
		}
	}
	if (
		end >= 2 &&
		positionPercentage(components[end - 2], 0) === initials[0] &&
		positionPercentage(components[end - 1], 1) === initials[1]
	) {
		// A size after the `/` goes with it, and only when it is the initial too:
		// the position cannot be dropped on its own where one is written.
		let sized = true;
		if (slash !== -1) {
			// The size is the one or two components after the `/`, and it goes only
			// where each is what an unwritten slot takes: the next slot's keywords
			// stand right after them, and none of those is a `<bg-size>`.
			let last = slash;
			while (last - slash < 2 && isBackgroundSize(components[last + 1])) {
				last++;
			}
			sized = last > slash;
			for (let at = slash + 1; at <= last; at++) {
				if (!asciiCaseInsensitiveMatch(components[at], initials[2])) {
					sized = false;
				}
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
	/** @type {number[]} */
	const boxes = [];
	for (let at = 0; at < components.length; at++) {
		if (BACKGROUND_BOXES.has(toLowerCaseIfNeeded(components[at]))) {
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
const collapsePositionKeywords = (property, components) => {
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
	for (let at = 0; at < components.length; at++) {
		const keyword = toLowerCaseIfNeeded(components[at]);
		if (PERCENTAGE_RE.test(keyword)) {
			// A percentage is read by where it stands, the first across and the
			// second down, so a keyword of the other axis there is no position.
			const other = components[at === 0 ? 1 : 0];
			if (
				other !== undefined &&
				(at === 0
					? POSITION_X_KEYWORDS.has(toLowerCaseIfNeeded(other)) &&
						!POSITION_Y_KEYWORDS.has(toLowerCaseIfNeeded(other))
					: POSITION_Y_KEYWORDS.has(toLowerCaseIfNeeded(other)) &&
						!POSITION_X_KEYWORDS.has(toLowerCaseIfNeeded(other)))
			) {
				return null;
			}
			if (at === 0) x = keyword;
			else y = keyword;
			continue;
		}
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
	// A trailing `50%` is what the omitted second value means, and a centered
	// edge is the one keyword naming it.
	const edge = down === "0%" ? "top" : "bottom";
	const shorter =
		across === "50%" &&
		(down === "0%" || down === "100%") &&
		edgeKeywordRead(property, edge)
			? [edge]
			: down === "50%"
				? [across]
				: [across, down];
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
const dropCenterPositionTail = (property, components) => {
	if (!POSITION_PROPERTIES.has(property) || components.length !== 2) {
		return null;
	}
	const down = toLowerCaseIfNeeded(components[1]);
	if (down !== "center" && down !== "50%") return null;
	// A `top` / `bottom` first value is no x-position, so that pair is the
	// order-free keyword syntax and dropping half would leave an invalid value.
	const across = toLowerCaseIfNeeded(components[0]);
	if (!POSITION_X_KEYWORDS.has(across) && !NUMERIC_RE.test(across)) {
		return null;
	}
	const kept = [components[0]];
	// With the tail gone it is a lone keyword, which is the percentage it resolves
	// to - the rewrite above read a pair the offset kept it out of.
	return collapsePositionKeywords(property, kept) || kept;
};

// One `grid-template-areas` row, whose quotes bound it - the whitespace between
// its cell names parts them, and a run of it says no more than one space.
const AREA_ROW_RE = /^(["'])([\s\S]*)\1$/;

/**
 * Squeeze a `grid-template-areas` value: each row keeps the cell names it
 * lists, a run of null cells is the one token it already is, and the whitespace
 * between two rows carries nothing at all - the quotes already part them.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const collapseGridTemplateAreas = (path, node, writer) => {
	const components = valueComponents(path, node, writer);
	/** @type {string[]} */
	const rows = [];
	for (const component of components) {
		const row = AREA_ROW_RE.exec(component);
		if (row === null) return null;
		// Trimming an escaped space would escape the quote, so a row holding an
		// escape is kept as written.
		if (row[2].includes("\\")) {
			rows.push(component);
			continue;
		}
		// A cell name is a `<custom-ident>` and holds no `.`, so a run of them is
		// one null cell token however many are written (CSS Grid 2 §7.3).
		rows.push(
			`${row[1]}${row[2]
				.trim()
				.replace(/\s+/g, " ")
				.replace(/\.{2,}/g, ".")}${row[1]}`
		);
	}
	// Never empty: a value-less declaration never reaches here.
	return rows;
};

/**
 * The safe transforms that rewrite one fragment of a declaration value on its
 * own, whatever stands beside it.
 * @param {string} fragment the fragment's printed text
 * @param {string} property the declaration's lowercased property name
 * @param {boolean} minify whether printing minified
 * @returns {string} the rewritten fragment
 */
const valueFragment = (fragment, property, minify) => {
	let out = fragment;
	if (minify && !S._inSupportsPrelude && S._transforms.reduceFunctions) {
		out = unwrapCalc(out, property);
	}
	if (minify && !ZERO_UNIT_KEEPING_PROPERTIES.has(property)) {
		out = dropZeroLengthUnit(out);
		out = dropZeroLengthUnitInCall(out);
	}
	return out;
};

// Which property a vendor spelling is a spelling of, so `-webkit-transition`'s
// value minifies the way `transition`'s does. Built on first use from the table
// the prefixing pass carries, a prefixed name not always being that property.
/** @type {Map<string, string> | null} */
let standardSpellings = null;

/**
 * The standard property a name spells, or the name itself.
 * @param {string} property a lowercased property name
 * @returns {string} the property whose value rules apply
 */
const standardSpelling = (property) => {
	if (property.charCodeAt(0) !== CC_HYPHEN_MINUS) return property;
	if (standardSpellings === null) {
		standardSpellings = new Map();
		for (const [standard, spellings] of getPrefixedProperties()) {
			for (const [spelling] of spellings) {
				// One with keywords of its own reads another grammar (`-webkit-box-flex`
				// takes a number), so the standard property's value rules are not its.
				if (getPrefixedSpellingKeywords().has(spelling)) continue;
				standardSpellings.set(spelling, standard);
			}
		}
	}
	const standard = standardSpellings.get(property);
	return standard === undefined ? property : standard;
};

/**
 * What `composeBlockBody` hands back for a block of declarations alone whose
 * body was composed before.
 * @param {string} body the body
 * @returns {ReturnType<typeof composeBlockBody>} the composition
 */
const memoizedComposition = (body) => ({
	body,
	items: [],
	texts: [],
	superseded: null,
	droppedPrefix: null,
	addedPrefix: null,
	deadPrefixed: null,
	spans: null
});

/**
 * Shorten a shorthand declaration's value to an equivalent spelling. A prefixed
 * spelling is a different property, and neither table lists one.
 * @param {CssPath} path the accessor positioned on the declaration
 * @param {string} property the declaration's lowercased property name
 * @param {Node} node the declaration whose value's children are read
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[] | null} the fragments to join, or `null` to keep the value as it is
 */
const collapseShorthand = (path, property, node, writer) => {
	if (!S._transforms.shortenValues) return null;
	// A value holding a substitution is the token stream it was written as, so
	// nothing in it collapses. Read off the declaration rather than the walk's
	// flag: this runs as the declaration is printed, once its children are done.
	if (hasSubstitutionInSpan(path.start(), path.end())) {
		return null;
	}
	if (BOX_SHORTHANDS.has(property)) {
		return collapseBoxShorthand(path, property, node, writer);
	}
	if (property === "font-weight") {
		return collapseFontWeight(path, node, writer);
	}
	if (property === "flex") {
		return collapseFlexShorthand(path, node, writer);
	}
	if (property === "grid-template-areas") {
		return collapseGridTemplateAreas(path, node, writer);
	}
	const written = valueComponents(path, node, writer);
	const shadow = dropShadowDefaults(property, written);
	if (shadow !== null) return shadow;
	if (property === "transition") {
		return collapseTransitionLayers(property, written);
	}
	if (property === "animation") {
		return collapseAnimationLayers(written);
	}
	// A slot holding its own initial goes first, so what follows reads the
	// components that are left rather than the ones the author wrote.
	const readable = shorthandSlotsReadable(property);
	// A family's slots are read by what each takes rather than by an enumerated
	// list, answering for a color and a length where the keyword table cannot. A
	// layered shorthand reads position, size and boxes positionally.
	const layered = dropLayerInitials(property, written);
	let dropped = readable
		? dropFamilyInitials(property, written) ||
			dropInitialKeywords(property, layered || written) ||
			layered
		: layered;
	let components = dropped === null ? written : dropped;
	// A transparent color alone, as written or once the initials around it went,
	// is every slot at its initial, as `none` is - shorter than `#0000`.
	if (
		property === "background" &&
		components.length === 1 &&
		TRANSPARENT_SPELLINGS.has(toLowerCaseIfNeeded(components[0]))
	) {
		return ["none"];
	}
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
				? components.filter((one) => !asciiCaseInsensitiveMatch(one, keyword))
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
		// written only for a target that reads no multi-keyword `display` -
		// re-spelling a value for nothing is what `convertLengthUnits` declines.
		if (
			short !== undefined &&
			(short.length < pair.length || !S._displayTwoValuesAllowed)
		) {
			return [short];
		}
	}
	if (property === "font") {
		const weighted = numberFontShorthandWeight(components);
		return dropFontNormals(weighted || components) || weighted || dropped;
	}
	// `initial` computes to the property's initial value, so where that value is
	// a shorter keyword the two are the same declaration.
	if (
		components.length === 1 &&
		asciiCaseInsensitiveMatch(components[0], "initial")
	) {
		const keyword = getInitialValueKeywords().get(property);
		if (keyword !== undefined) return [keyword];
	}
	// Grammar matching skips whitespace and a `)` fuses with nothing, so between
	// two calls it separates the same tokens either way - whatever the property,
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
	const position = collapsePositionKeywords(property, components);
	if (position !== null) return position;
	const centered = dropCenterPositionTail(property, components);
	if (centered !== null) return centered;
	const perLayer = shortenPositionLayers(property, components);
	if (perLayer !== null) return perLayer;
	if (SVG_USER_UNIT_PROPERTIES.has(property)) {
		const bare = dropUserUnits(components);
		if (bare !== null) return bare;
	}
	const individual = shortenIndividualTransform(property, components);
	if (individual !== null) return individual;
	return collapseRepeatedPair(property, components) || dropped;
};

// What only a `font` shorthand's size can be among what precedes it: a
// dimension, a percentage or a call. An oblique angle reads as one too, too soon.
const FONT_SIZE_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?(?:%|[a-z]+)|\(/i;

/**
 * Drop each `normal` before a `font` shorthand's size: the style, variant,
 * weight and stretch it leaves out are set to `normal` all the same.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const dropFontNormals = (components) => {
	let size = -1;
	for (let i = 0; i < components.length; i++) {
		if (FONT_SIZE_RE.test(components[i])) {
			size = i;
			break;
		}
	}
	// The grammar has four slots before it: past them the value is invalid, and
	// dropping a `normal` could make it valid.
	if (size <= 0 || size > 4) return null;
	const kept = components.filter(
		(one, i) => i >= size || toLowerCaseIfNeeded(one) !== "normal"
	);
	return kept.length === components.length ? null : kept;
};

/**
 * Drop the trailing components the individual transform properties already
 * imply (CSS Transforms 2 §4): an omitted `translate` axis is 0, an omitted
 * `scale` y repeats x and an omitted z is 1.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const shortenIndividualTransform = (property, components) => {
	if (property !== "translate" && property !== "scale") return null;
	if (components.length > 3) return null;
	if (components.some((one) => one.includes("(") || one.includes(","))) {
		return null;
	}
	const kept = [...components];
	if (property === "translate") {
		// A zero length, the zero-unit drop not having reached it yet. A `0%` is
		// kept: an engine computes it as the percentage it is, not as an omission.
		while (
			kept.length > 1 &&
			NUMERIC_RE.test(kept[kept.length - 1]) &&
			!kept[kept.length - 1].endsWith("%") &&
			Number.parseFloat(kept[kept.length - 1]) === 0
		) {
			kept.pop();
		}
	} else {
		// `scale`. A percentage scales by a hundredth of itself, which is what the number is.
		for (let i = 0; i < kept.length; i++) {
			const percentage = PERCENTAGE_RE.exec(kept[i]);
			if (percentage === null) continue;
			const number = roundSignificant(shiftDecimal(percentage[1], -2), "");
			if (number.length <= kept[i].length) kept[i] = number;
		}
		if (kept.length === 3 && Number(kept[2]) === 1) kept.pop();
		if (kept.length === 2 && kept[0] === kept[1]) kept.pop();
	}
	return kept.length === components.length &&
		kept.every((one, i) => one === components[i])
		? null
		: kept;
};

// A percentage, its number captured: what `scale` reads a hundredth of.
const PERCENTAGE_RE = /^([+-]?(?:\d+\.?\d*|\.\d+))%$/;

// A length in px, spelled without the unit an SVG stroke length does not need.
const PX_LENGTH_RE = /^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)px$/i;

/**
 * Write each px length of an SVG stroke value as the bare number it equals: SVG
 * reads a number there in user units, which are px. A call is left as written.
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const dropUserUnits = (components) => {
	let changed = false;
	const out = components.map((component) => {
		if (component.includes("(")) return component;
		return component
			.split(",")
			.map((part) => {
				const px = PX_LENGTH_RE.exec(part);
				if (px === null) return part;
				changed = true;
				return px[1];
			})
			.join(",");
	});
	return changed ? out : null;
};

/**
 * The two `<position>` rewrites above, for each layer of a comma list: the
 * components arrive with each comma inside the one it stands between.
 * @param {string} property the declaration's lowercased property name
 * @param {string[]} components the value's top-level components
 * @returns {string[] | null} the fragments to join, or `null` to keep the value
 */
const shortenPositionLayers = (property, components) => {
	if (
		!POSITION_PROPERTIES.has(property) ||
		!components.some((one) => one.includes(","))
	) {
		return null;
	}
	/** @type {string[][]} */
	const layers = [[]];
	for (const component of components) {
		// A call's own commas are no layer boundary; such a value is left as written.
		if (component.includes("(")) return null;
		const parts = component.split(",");
		for (let i = 0; i < parts.length; i++) {
			if (i > 0) layers.push([]);
			if (parts[i] !== "") layers[layers.length - 1].push(parts[i]);
		}
	}
	// An empty layer is a value the engine drops, which a rewrite would revive.
	if (layers.some((layer) => layer.length === 0)) return null;
	let changed = false;
	const shortened = layers.map((layer) => {
		const shorter =
			collapsePositionKeywords(property, layer) ||
			dropCenterPositionTail(property, layer);
		if (shorter === null) return layer;
		changed = true;
		return shorter;
	});
	if (!changed) return null;
	/** @type {string[]} */
	const out = [];
	for (const layer of shortened) {
		if (out.length === 0) {
			out.push(...layer);
		} else {
			out[out.length - 1] += `,${layer[0]}`;
			out.push(...layer.slice(1));
		}
	}
	return out;
};

// A zero angle argument, on its own or one of a comma list.
const ZERO_ANGLE_ARGUMENT_RE = /(^|,)\s*0(?:deg|grad|rad|turn)\s*(?=,|$)/gi;

/**
 * Drop the unit a zero argument does not need, for a call whose own grammar
 * makes it droppable - a `<zero>` beside `<angle>`, or a length.
 * @param {string} fn the lowercased function name
 * @param {string} inner the text between the parentheses
 * @returns {string} the arguments, such zero units dropped
 */
const dropCallZeroUnit = (fn, inner) => {
	if (ZERO_ANGLE_FUNCTIONS.has(fn)) {
		return inner.replace(ZERO_ANGLE_ARGUMENT_RE, "$10");
	}
	return LENGTH_ONLY_FUNCTIONS.has(fn) ? dropZeroLengthUnit(inner) : inner;
};

// One call, split into its name and the text between its parentheses.
const LONE_CALL_RE = /^([-\w]+)\(([^()]*)\)$/;

/**
 * The same, for the arguments of a call whose every number is a length. The
 * split is on top-level separators of a body holding no nested call, so each
 * piece is a whole argument and a `calc()` inside one is never reached.
 * @param {string} fragment one printed top-level component
 * @returns {string} the component, its arguments' zero units dropped
 */
const dropZeroLengthUnitInCall = (fragment) => {
	if (!S._transforms.shortenNumbers) return fragment;
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
	const match = LONE_CALL_RE.exec(fragment);
	// A string is no length, and the split below would reach inside it.
	if (match === null || /["'\\]/.test(match[2])) return fragment;
	const body = match[2].replace(/[^\s,]+/g, dropZeroLengthUnit);
	return `${match[1]}(${body})`;
};

// A `calc()` holding one constant, which is the only shape the parentheses can
// come off. `-` is matched so a negative is recognized and then kept.
const LONE_CALC_RE = /^calc\((-?(?:\d*\.\d+|\d+))(%|[a-z]+)?\)$/i;

// WHY: a folded term meaning the same bare as inside `calc()`, whatever the
// property and wherever it stands - positive, and either carrying a unit, so
// never an `<integer>` context, or already a non-zero integer. A unitless
// fraction is left out, the property deciding there and only the declaration
// printer knowing it, as is anything negative. Zero is the one number a length
// also accepts, so `width:calc(0)` is dropped where `width:0` is not.
const BARE_TERM_RE = /^(?:\d*\.\d+|\d+)(?:%|[a-z]+)$|^(?!0+$)\d+$/i;

// WHY: the same, one level in. A folded term standing as an operand of an outer
// math expression is arithmetic rather than a value, so no property judges it
// and a fraction or a zero needs no parentheses. One non-negative term only:
// `calc(1px - calc(0px - 5px))` may not become `calc(1px - -5px)`, nor
// `calc(1px - calc(1em + 1px))` a sum whose second term changed sign.
const NESTED_TERM_RE = /^(?:\d*\.\d+|\d+)(?:%|[a-z]+)?$/i;

// One negative term, which only an argument taking negatives reads bare; not a
// unitless zero, which a length reads bare where it rejects `calc(-0)`.
const NEGATIVE_TERM_RE =
	/^-(?:(?:\d*\.\d+|\d+)(?:%|[a-z]+)|(?!0*\.?0+$)(?:\d*\.\d+|\d+))$/i;

/**
 * Take the parentheses off a folded `calc()`, where the bare value means the
 * same thing. Two shapes where it does not, both measured in headless Chromium:
 * a negative is clamped inside `calc()` and a parse error outside it on a
 * property that takes none (`width:calc(-5px)` renders at `0`, `width:-5px` at
 * `auto`), and a fraction is rounded where the grammar wants an `<integer>`
 * (`z-index:calc(1.5)` computes to `2`, `z-index:1.5` is dropped). A unit or a
 * percentage settles the second on its own, since no `<integer>` carries
 * either. A unitless zero is a third: it is the one number a length accepts, so
 * `width:calc(0)` is dropped and `width:0` is not, unless the property takes a
 * number for it to be (`opacity:0`). A fourth is a value the spec
 * clamps a `calc()` to and rejects bare (see `CLAMPED_VALUE_RANGES`).
 * @param {string} fragment one printed component
 * @param {string} property the lowercased property it belongs to
 * @returns {string} the bare value, or the fragment as it was
 */
const unwrapCalc = (fragment, property) => {
	if ((fragment.charCodeAt(0) | 0x20) !== CC_LOWER_C) return fragment;
	const match = LONE_CALC_RE.exec(fragment);
	if (match === null) return fragment;
	// Where the engine takes no `calc()`, the bare value is the one it reads -
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
	if (losesClamp(property, number, unit)) return fragment;
	if (
		unit === "" &&
		Number(number) === 0 &&
		!NUMBER_ZERO_PROPERTIES.has(property)
	) {
		return fragment;
	}
	// A bare number these read as a length of their own is one the engine refuses
	// inside `calc()`, so the parentheses stay. Both names are asked: the prefixed
	// spelling is the one that differs, and `property` is the standard one.
	if (
		unit === "" &&
		(NUMBER_ONLY_OUTSIDE_CALC_PROPERTIES.has(property) ||
			inNumberOnlyOutsideCalcProperty())
	) {
		return fragment;
	}
	if (unit === "" && number.includes(".") && INTEGER_PROPERTIES.has(property)) {
		return fragment;
	}
	return number + unit;
};

/**
 * Whether a math function stands as an argument of a function taking a number,
 * a percentage or a color channel there, where its folded term reads bare.
 * @param {CssPath} path the accessor positioned on the math function
 * @returns {boolean} true inside such an argument
 */
const inNumberArgument = (path) => {
	const parent = path.parent;
	if (parent === null || path.type(parent) !== NodeType.Function) return false;
	const name = asciiLowercaseName(unescapeIdentifier(rawName(parent)));
	return NUMBER_ARGUMENT_FUNCTIONS.has(name) || COLOR_FUNCTIONS.has(name);
};

/**
 * Whether a node stands directly among a color function's arguments.
 * @param {CssPath} path the accessor positioned on the node
 * @returns {boolean} true inside such a function's argument list
 */
const inColorArgument = (path) => {
	const parent = path.parent;
	return (
		parent !== null &&
		path.type(parent) === NodeType.Function &&
		COLOR_FUNCTIONS.has(asciiLowercaseName(unescapeIdentifier(rawName(parent))))
	);
};

/**
 * Whether a node stands directly in a `background` value, where an identifier
 * is a keyword or a color: the shorthand's author names are inside calls.
 * @param {CssPath} path the accessor positioned on the node
 * @returns {boolean} true at the top level of a `background` value
 */
const atBackgroundTop = (path) =>
	path.parent === S._valueDeclaration &&
	S._valueDeclaration !== null &&
	toLowerCaseIfNeeded(A.name(S._valueDeclaration)) === "background";

/**
 * Whether a node stands directly among the arguments of a transform function
 * a negative one is valid in, so a negative term there needs no `calc()`.
 * @param {CssPath} path the accessor positioned on the node
 * @returns {boolean} true inside such a function's argument list
 */
const inNegativeAcceptingArgument = (path) => {
	const parent = path.parent;
	if (parent === null || path.type(parent) !== NodeType.Function) return false;
	return NEGATIVE_ACCEPTING_FUNCTIONS.has(
		asciiLowercaseName(unescapeIdentifier(rawName(parent)))
	);
};

/**
 * Whether a node stands directly among a gradient's arguments, where a named
 * color can be nothing else: no gradient keyword is also a color's name.
 * @param {CssPath} path the accessor positioned on the node
 * @returns {boolean} true inside a gradient's argument list
 */
const inGradientArgument = (path) => {
	const parent = path.parent;
	if (parent === null || path.type(parent) !== NodeType.Function) return false;
	const name = asciiLowercaseName(unescapeIdentifier(rawName(parent)));
	return GRADIENT_LAST_POSITIONS.has(name);
};

/**
 * Whether a folded `calc()` standing as a whole component of the declaration is
 * shorter than what it replaces once `unwrapCalc` takes its parentheses off.
 * @param {CssPath} path the accessor positioned on the math function
 * @param {string} folded the folded `calc()`
 * @param {number} written the length of the call as written
 * @returns {boolean} true when the fold wins after the unwrap
 */
const unwrapsShorter = (path, folded, written) => {
	const parent = path.parent;
	if (
		parent === null ||
		path.type(parent) !== NodeType.Declaration ||
		S._valueDeclaration === null
	) {
		return false;
	}
	const property = standardSpelling(
		toLowerCaseIfNeeded(A.name(S._valueDeclaration))
	);
	return unwrapCalc(folded, property).length < written;
};

/**
 * Whether a `(...)` block is one of `@scope`'s two selector lists - its scope root
 * or its limit - rather than a query condition. Both sit directly in the
 * at-rule's prelude, so the immediate parent settles it.
 * @param {CssPath} path the accessor positioned on the `(...)` block
 * @returns {boolean} true inside a `@scope` prelude
 */
const inScopePrelude = (path) => {
	const parent = path.parent;
	return (
		parent !== null &&
		path.type(parent) === NodeType.AtRule &&
		atKeywordOf(parent) === "scope"
	);
};

/**
 * Print an attribute selector's children: the separators go (the grammar allows
 * whitespace anywhere inside `[...]`, and `join` still parts two fragments that
 * would fuse - `[a=b i]`), and a quoted value that is also a bare identifier
 * loses its quotes. Unquoting starts after the `=` delim, so the `[...]`'s name
 * side is never touched. A separator right after a kept string stays: `[a="b" i]`
 * is what every engine is exercised on.
 * @param {CssPath} path the accessor positioned on the `[...]` block
 * @param {ComponentValue[]} children the block's children
 * @param {PrintContext} writer the print context (children's printed text)
 * @returns {string[]} the fragments to join
 */
const printAttributeSelector = (path, children, writer) => {
	/** @type {string[]} */
	const parts = [];
	let afterEquals = false;
	let afterString = false;
	let afterBar = false;
	for (let i = 0; i < children.length; i++) {
		const child = children[i];
		const type = path.type(child);
		if (type === NodeType.Whitespace) {
			// Not after the `|` parting a namespace from its attribute: the two are
			// one token sequence there, so whitespace between them invalidates the
			// selector. In headless Chromium `[| a]` is dropped and `[ |a]` is not.
			if (afterString || afterBar) parts.push(SEP);
			continue;
		}
		const text = writer.get(child);
		afterString = false;
		afterBar = !afterEquals && type === NodeType.Delim && text === "|";
		if (!afterEquals) {
			if (type === NodeType.Delim && text === "=") afterEquals = true;
			parts.push(text);
		} else if (
			S._transforms.normalizeQuotes &&
			!S._inSupportsSelector &&
			type === NodeType.String &&
			isClosedString(text)
		) {
			const body = text.slice(1, -1);
			if (isBareIdent(body)) {
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
 * The `printer` case for a function.
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {boolean} minify whether minifying
 * @returns {string} the node's serialized text
 */
const printFunctionNode = (path, writer, minify) => {
	const written = rawName(path.node);
	// An escape spells the same name (§4.3.7): `c\61 lc(` is `calc()`, so
	// every table below reads what it spells.
	const name = written.includes("\\") ? unescapeIdentifier(written) : written;
	// A container style query asks whether a custom property's value is the one
	// written here, comparing token streams as written (CSS Conditional 5 §5),
	// so a squeezed whitespace run asks another question. Nothing is rewritten.
	if (
		minify &&
		!path.within(NODE_TYPE_DECLARATION) &&
		S._inMediaConditionPrelude &&
		asciiCaseInsensitiveMatch(name, "style")
	) {
		const source = printedSource(path.node);
		// Unclosed at EOF, the source carries no `)` for the walk to have
		// closed - printed as usual so the parenthesis is written back.
		if (source.endsWith(")")) {
			// Written whole, comments included, so the queued copies are claimed
			// here rather than flushed a second time after the rule.
			writer.takeInserts(path.start(), path.end());
			return source;
		}
	}
	let inner;
	if (path.childCount() === 1) {
		// Half of all functions take one argument, which `join` would hand
		// straight back - and a trim only ever parts two of them, so no
		// universal a compound implies can stand beside anything here either.
		const only = writer.get(path.child(0));
		inner = only === SEP ? "" : only;
	} else {
		// A selector function's argument is a selector, so its combinators need
		// no whitespace, as in the enclosing prelude; an `@import`'s
		// `supports()` and a container's `scroll-state()` hold conditions.
		const lower = name.toLowerCase();
		const trim =
			S._mathFunctionDepth !== 0
				? TRIM_MATH
				: path.within(NODE_TYPE_DECLARATION)
					? TRIM_NOTHING
					: SELECTOR_FUNCTIONS.has(lower)
						? TRIM_COMBINATORS
						: (S._inSupportsPrelude && lower === "supports") ||
							  (S._inMediaConditionPrelude && lower === "scroll-state")
							? TRIM_CONDITIONS
							: TRIM_NOTHING;
		/** @type {string[]} */
		const parts = [];
		appendChildTexts(path.node, writer, parts);
		if (minify && trim === TRIM_CONDITIONS) keepKeywordComments(parts);
		// A selector function's argument is a selector like the prelude's, so
		// the universal a compound implies says nothing there either - except
		// under test in a `@supports` condition, where only whitespace goes.
		if (minify && trim === TRIM_COMBINATORS && !S._inSupportsPrelude) {
			if (foldPseudoNames(parts) && S._transforms.shortenSelectors) {
				unwrapLoneIs(parts);
			}
			dropImpliedUniversalSelector(parts);
		}
		inner = join(parts, !minify, minify ? trim : TRIM_NOTHING);
		// A leading `+` in An+B is a sign, not a combinator: `+ n` is no
		// argument an engine reads, and `+n` would be one.
		if (minify && NTH_PSEUDO_FUNCTIONS.has(lower)) {
			const at = parts.findIndex((part) => part.length !== 0 && part !== SEP);
			if (parts[at] === "+" && parts[at + 1] === SEP) {
				inner = `+ ${inner.slice(1)}`;
			}
		}
		// Chrome throws out `attr( name unit )` where `attr( name unit)`
		// parses, so the space before the `)` decides whether the declaration
		// runs - `join` drops a trailing one like any other.
		if (
			minify &&
			parts[parts.length - 1] === SEP &&
			asciiCaseInsensitiveMatch(name, "attr")
		) {
			inner += " ";
		}
	}
	if (!minify) return `${written}(${inner})`;
	// Function names match ASCII case-insensitively, so one lowercase name
	// is what every table below is keyed by; the eleven transforms spelled
	// with a capital are printed the way everything else writes them.
	const fn = asciiLowercaseName(name);
	// As with a unit: a name already lowercase is its own answer, and only a
	// shouted one is looked up. The lookup key still folds inside a
	// substituted value; only the printed spelling stays as written.
	let out =
		S._inSubstitutedValue ||
		S._inSupportsSelector ||
		!S._transforms.foldCase ||
		fn.startsWith("--")
			? name
			: fn === name
				? fn
				: CANONICAL_NAMES.get(fn) || fn;
	if (written !== name) {
		out = S._transforms.rewriteEscapes ? escapeName(out) : written;
	}
	// An+B in a selector: `2n+1` is what `odd` names, and shorter written so.
	if (!path.within(NODE_TYPE_DECLARATION) && NTH_PSEUDO_FUNCTIONS.has(fn)) {
		return S._inSupportsSelector
			? `${out}(${inner})`
			: minifyAnPlusB(out, inner);
	}
	// Every rewrite below is keyed by a name none of these carry.
	if (
		SUBSTITUTION_FUNCTIONS.has(fn) ||
		(!path.within(NODE_TYPE_DECLARATION) && SELECTOR_FUNCTIONS.has(fn))
	) {
		return `${out}(${inner})`;
	}
	// WHY: an `rgb()` or `rgba()` collapses to the shortest color and anything
	// else keeps its `name(args)` form. A color inside a `@supports` condition
	// is syntax under test - the engines reading `#0000` are not those reading
	// `rgba(0,0,0,0)` - so rewriting it asks another question, and esbuild,
	// clean-css and lightningcss leave the condition alone too. A color read as
	// numbers, in a gradient stop, a `color-mix()` argument or a relative
	// color's origin, stays as written unless converting it is exact, which the
	// legacy sRGB forms are where their channels are bytes.
	let color = S._inSupportsPrelude
		? null
		: minifyColorFunction(fn, inner, S._hexAlphaAllowed, S._inColorOperand) ||
			(S._inColorOperand
				? null
				: minifyPolarColorFunction(fn, inner, S._hexAlphaAllowed));
	// A mix no byte holds is written back in the space it was computed in,
	// which can be longer than the call - then the call is the shorter one.
	if (color !== null && color.length > fn.length + inner.length + 2) {
		color = null;
	}
	if (color !== null && (color !== "transparent" || !inTapHighlightColor())) {
		return color === "transparent" && S._hexAlphaAllowed ? "#0000" : color;
	}
	// `light-dark()` names a color per scheme, which the pair above says with
	// a substitution the scheme itself switches. Two arguments only: the
	// grammar takes exactly that many, and anything else is no such call.
	if (
		S._loweringLightDark &&
		fn === "light-dark" &&
		path.within(NODE_TYPE_DECLARATION) &&
		!S._inCustomProperty &&
		!S._inSupportsPrelude &&
		!S._inSubstitutedValue
	) {
		const halves = splitTopLevelArguments(inner);
		// A half the target cannot read would substitute into a `var()` and make
		// the declaration invalid at computed-value time, where nothing before it
		// is read - so it is left alone rather than lowered.
		if (halves.length === 2 && !namesUnreadableColor(inner)) {
			S._lightDarkUsed = true;
			return `var(${LIGHT_PROPERTY},${halves[0].trim()})var(${DARK_PROPERTY},${halves[1].trim()})`;
		}
	}
	// A math function over constants of one unit is that value, written back as
	// a `calc()`: the parentheses stay, since dropping them turns a clamped
	// negative into a parse error, and only the declaration printer does.
	if (!S._inSupportsPrelude && !S._inCustomProperty) {
		const previousColorChannel = S._foldingColorChannel;
		S._foldingColorChannel =
			S._mathFunctionDepth === 1 && inColorArgument(path);
		const term = foldMathFunction(fn, inner);
		S._foldingColorChannel = previousColorChannel;
		if (term !== null) {
			// A term that means the same bare needs no parentheses anywhere, so
			// it is written as itself; the rest keep a `calc()` for the
			// declaration printer to judge against the property.
			const shape =
				S._mathFunctionDepth > 1 || inNumberArgument(path)
					? NESTED_TERM_RE
					: BARE_TERM_RE;
			const folded =
				(shape.test(term) ||
					(S._mathFunctionDepth === 1 &&
						NEGATIVE_TERM_RE.test(term) &&
						inNegativeAcceptingArgument(path))) &&
				!inCalcRejectingProperty() &&
				!(!/[a-z%]$/i.test(term) && inNumberOnlyOutsideCalcProperty()) &&
				!foldLosesClamp(term) &&
				!foldBelowStepCount(term, path)
					? term
					: `calc(${term})`;
			// A division can land on a value needing every digit of a double, which
			// is longer than the expression producing it. Only the outermost call
			// is asked, a nested one being a term still to be reduced.
			if (
				S._mathFunctionDepth > 1 ||
				folded.length < fn.length + inner.length + 2 ||
				unwrapsShorter(path, folded, fn.length + inner.length + 2)
			) {
				return folded;
			}
		}
		// A `calc()` inside another math function is the parentheses it
		// stands for (CSS Values 4 §10.1), whatever a substitution expands to.
		if (
			fn === "calc" &&
			S._mathFunctionDepth > 1 &&
			path.within(NODE_TYPE_DECLARATION) &&
			S._transforms.reduceFunctions
		) {
			return `(${inner})`;
		}
		// Not `calc()`, whose argument the whole-call fold above already read.
		const reduced = reduceMathArguments(fn, inner);
		if (reduced !== null) return `${fn}(${reduced})`;
	}
	// An easing function is only ever a value; `url()` is also an at-rule
	// prelude's (`@import url("a.css")`).
	const easing =
		path.within(NODE_TYPE_DECLARATION) && !S._inCustomProperty
			? minifyEasingFunction(fn, inner)
			: null;
	if (easing !== null) return easing;
	// A translation's percentage is of the element's own box, which always
	// has a size, so a `0%` term beside one length adds nothing to it.
	if (
		S._transforms.reduceFunctions &&
		path.within(NODE_TYPE_DECLARATION) &&
		!S._inSubstitutedValue &&
		fn.startsWith("translate") &&
		inner.includes("0%")
	) {
		const args = splitTopLevelArguments(inner);
		let changed = false;
		for (let i = 0; i < args.length; i++) {
			// A z slot takes no percentage, so a `0%` there makes the whole
			// declaration invalid, which dropping it would revive.
			if (fn === "translatez" || (fn === "translate3d" && i === 2)) {
				continue;
			}
			const term = dropZeroPercentTerm(args[i].trim());
			if (term !== null) {
				args[i] = term;
				changed = true;
			}
		}
		// The rewrites below read the arguments as they now stand.
		if (changed) inner = args.join(",");
	}
	// `translateX(v)` is `translate(v)` and `skewX(a)` is `skew(a)`, the second
	// component defaulting to 0. Only for one plain component: a substitution
	// could expand to two, reviving a declaration the browser drops.
	const oneAxis = S._transforms.reduceFunctions
		? X_AXIS_TRANSFORMS.get(fn)
		: undefined;
	if (
		oneAxis !== undefined &&
		path.within(NODE_TYPE_DECLARATION) &&
		!S._inSubstitutedValue &&
		!inner.includes(",") &&
		!containsSubstitutionFunction(inner)
	) {
		return `${oneAxis}(${inner})`;
	}
	if (path.within(NODE_TYPE_DECLARATION) && !S._inSubstitutedValue) {
		// An argument that is the amount an omitted one means says nothing,
		// whether or not the zero still carries the unit its grammar drops.
		const omitted = S._transforms.reduceFunctions
			? FILTER_FUNCTION_OMITTED.get(fn)
			: undefined;
		if (omitted !== undefined) {
			const bare = dropCallZeroUnit(fn, inner);
			if (bare === omitted || (omitted === "1" && bare === "100%")) {
				return `${out}()`;
			}
		}
		const reduced = reduceTransformFunctionDeep(fn, inner);
		if (reduced !== null) return reduced;
		// The stops are folded over what dropping the direction leaves, a
		// gradient carrying both otherwise keeping whichever ran second.
		const shape = dropDefaultShapeParts(fn, inner);
		if (shape !== null) return `${out}(${shape})`;
		let gradient = reduceGradientDirection(fn, inner);
		if (gradient === null) {
			gradient = dropDefaultGradientPosition(fn, inner);
		}
		let stops = foldGradientStops(
			fn,
			gradient === null ? inner : gradient,
			S._doublePositionAllowed
		);
		// A double position the target cannot read is written as the two
		// stops it names, over whatever the folds above left.
		if (!S._doublePositionAllowed) {
			const split = !S._transforms.lowerUnsupported
				? null
				: splitDoublePositionStops(
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
		path.within(NODE_TYPE_DECLARATION) &&
		!S._inSubstitutedValue &&
		S._transforms.shortenNumbers &&
		ZERO_ANGLE_FUNCTIONS.has(fn)
	) {
		const bare = inner.replace(ZERO_ANGLE_ARGUMENT_RE, "$10");
		if (bare !== inner) return `${out}(${bare})`;
	}
	// A name kept escaped keeps its call as written: unquoting it rests on the
	// tokenizer reading `url` through the escape.
	const url =
		S._inSubstitutedValue || (written !== name && out === written)
			? null
			: minifyUrlFunction(fn, inner);
	if (url !== null) return url;
	return `${out}(${inner})`;
};

/**
 * The `printer` case for a `url()` token.
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {boolean} minify whether minifying
 * @returns {string} the node's serialized text
 */
const printUrlNode = (path, minify) => {
	const source = printedSource(path.node);
	// Closed at EOF: write the `)` back so the url stops where it stopped for
	// the tokenizer rather than swallowing what the printer emits next. Before
	// the rest rather than instead of it, or a second pass is what folds it.
	const unterminated = isUnterminatedUrl(source);
	const raw = unterminated ? terminate(source, ")", "\uFFFD") : source;
	// The tokenizer already trimmed the url-token's content, so the padding in
	// `url(  a.png  )` carries nothing.
	if (!minify) return raw;
	const open = raw.indexOf("(");
	// `url` matches ASCII case-insensitively like any function name. Read in
	// place, since cutting the name out would allocate on every url and all but
	// a shouted one folds to itself. In a substituted value nothing is read.
	/** @type {string | null} */
	let head = null;
	if (!S._inSubstitutedValue && S._transforms.foldCase) {
		for (let i = 0; i < open; i++) {
			const c = raw.charCodeAt(i);
			if (c >= CC_UPPER_A && c <= CC_UPPER_Z) {
				head = asciiLowercaseName(raw.slice(0, open + 1));
				break;
			}
		}
	}
	const percent = raw.includes("%");
	/**
	 * @returns {string} the url-token as it prints with nothing rendered
	 */
	const plainUrl = () => {
		// Padding only exists when the content is whitespace-bounded; checking
		// that costs two char reads, reading the content costs a slice.
		if (
			!percent &&
			!isAsciiWhitespace(raw.charCodeAt(open + 1)) &&
			!isAsciiWhitespace(raw.charCodeAt(raw.length - 2))
		) {
			return head === null ? raw : head + raw.slice(open + 1);
		}
		const name = head === null ? raw.slice(0, open + 1) : head;
		const value = urlValue(path, unterminated);
		// A url-token already carrying an escape is one this printer did not
		// write, so its `\%` is not read as the start of a percent-escape.
		return `${name}${
			percent && !value.includes("\\")
				? decodePercentEscapes(value, true, "")
				: value
		})`;
	};
	// Ahead of the padding fast path below: a base64 `data:` url is
	// whitespace-free and `%`-free, so it would take it and never be offered.
	if (S._deferEmbeddedSource !== undefined) {
		const opener = head === null ? raw.slice(0, open + 1) : head;
		const deferred = deferDataUrl(
			urlValue(path, unterminated),
			opener,
			(url) => `${opener}${serializeUrl(url, '"')})`,
			plainUrl()
		);
		if (deferred !== null) return deferred;
	}
	if (S._renderEmbeddedSource !== undefined) {
		const renderedUrl = renderDataUrl(urlValue(path, unterminated));
		if (renderedUrl !== null) {
			const name = head === null ? raw.slice(0, open + 1) : head;
			return `${name}${serializeUrl(renderedUrl, '"')})`;
		}
	}
	return plainUrl();
};

/**
 * The `printer` case for a string.
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {boolean} minify whether minifying
 * @returns {string} the node's serialized text
 */
const printStringNode = (path, minify) => {
	const source = printedSource(path.node);
	// Closed at EOF: write the quote back, for the same reason as `url()`.
	// Written here rather than after the transforms below, or they read a
	// string with no closing quote and decline it, which a second pass undoes.
	const raw = isClosedString(source)
		? source
		: terminate(source, source[0], "");
	// A custom property hands its string back as written, quotes included.
	if (!minify || S._inCustomProperty) return raw;
	// `<family-name>` is `<string> | <custom-ident>+`, so a family whose text
	// is a run of identifiers means the same unquoted, two bytes shorter.
	if (
		!S._inSupportsPrelude &&
		!S._inSubstitutedValue &&
		((inFontFamily() && isLoneFamilyName(path)) || isLoneFontFamily(path))
	) {
		const unquoted = unquoteFontFamily(raw);
		if (unquoted !== null) return unquoted;
	}
	const written = minifyString(raw);
	return (S._charsetPiece === -1 && !S._assumeUtf8) ||
		!S._transforms.rewriteEscapes
		? written
		: unescapeAstral(written);
};

/**
 * The `printer` case for an ident.
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {boolean} minify whether minifying
 * @returns {string} the node's serialized text
 */
const printIdentNode = (path, minify) => {
	const raw = printedSource(path.node);
	if (!minify) return raw;
	// A keyword is matched by what an escape spells, not by how it is written.
	const meaning = raw.includes("\\") ? unescapeIdentifier(raw) : raw;
	// `transparent` is `#0000` where the target reads a hex alpha - the same
	// color, six bytes shorter. The tap-highlight guard still holds: that
	// WebKit bug is about the keyword's *value*, whichever way it is spelled.
	if (
		path.within(NODE_TYPE_DECLARATION) &&
		!S._inSubstitutedValue &&
		S._hexAlphaAllowed &&
		S._transforms.shortenColors &&
		asciiCaseInsensitiveMatch(meaning, "transparent") &&
		!inTapHighlightColor()
	) {
		return "#0000";
	}
	// The keyword names each platform's own UI font, which a target that
	// does not read it reaches only through the platform's own name for it.
	if (
		!S._systemUiAllowed &&
		S._transforms.lowerUnsupported &&
		path.within(NODE_TYPE_DECLARATION) &&
		!S._inCustomProperty &&
		!S._inSubstitutedValue &&
		asciiCaseInsensitiveMatch(meaning, "system-ui") &&
		inFontFamily()
	) {
		return SYSTEM_UI_STACK;
	}
	if (
		path.within(NODE_TYPE_DECLARATION) &&
		!S._inCustomProperty &&
		!S._inSupportsPrelude &&
		!S._inSubstitutedValue
	) {
		// One fold for both questions below, handing back the string where nothing
		// changes. ASCII only: `pin\212A` ends in a Kelvin sign, not a `k`.
		const lowered = asciiLowercaseName(meaning);
		// A named color where the property takes nothing else an identifier could
		// be: `white` is `#fff`, both computing to `rgb(255, 255, 255)`.
		// Elsewhere an identifier may be the author's own name.
		if (S._transforms.shortenColors) {
			const shorter = getColorNameToShortest().get(lowered);
			if (
				shorter !== undefined &&
				(inColorOnlyProperty() ||
					inGradientArgument(path) ||
					atBackgroundTop(path))
			) {
				return shorter;
			}
		}
		// A keyword-only or color property names nothing of the author's, so an
		// ident directly in its value (a call's arguments are their own grammar's)
		// is a keyword matched ASCII case-insensitively, but a dashed ident (§4.2).
		if (
			S._transforms.foldCase &&
			lowered !== raw &&
			path.parent === S._valueDeclaration &&
			!meaning.startsWith("--") &&
			inKeywordOnlyValue()
		) {
			const folded =
				meaning !== raw && S._transforms.rewriteEscapes
					? escapeIdentifier(lowered)
					: asciiLowercaseName(raw);
			if (folded !== raw) return folded;
		}
	}
	return S._transforms.rewriteEscapes ? minifyIdentEscapes(raw) : raw;
};

/**
 * The `printer` case for a simple block.
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {boolean} minify whether minifying
 * @returns {string} the node's serialized text
 */
const printSimpleBlockNode = (path, writer, minify) => {
	const open = blockTokenOf(path.node);
	const close = open === "(" ? ")" : open === "[" ? "]" : "}";
	// Outside a declaration value a `[...]` is an attribute selector and a `(...)`
	// a query condition. Inside one they are a grid line-name list and a
	// `calc()` sub-expression, where neither of those rewrites holds.
	const structural = minify && !path.within(NODE_TYPE_DECLARATION);
	/** @type {string[]} */
	let parts;
	if (structural && open === "[") {
		parts = printAttributeSelector(path, path.children(), writer);
	} else {
		// One array, rather than a child list and a mapped copy of it.
		parts = [];
		appendChildTexts(path.node, writer, parts);
	}
	if (structural && open === "(" && S._inMediaConditionPrelude) {
		if (S._transforms.foldCase) lowercaseConditionParts(parts);
		if (S._rangeSpellingAllowed) useRangeSpelling(parts);
	}
	if (
		minify &&
		structural &&
		open === "(" &&
		(S._inSupportsPrelude || S._inMediaConditionPrelude)
	) {
		keepKeywordComments(parts);
	}
	let trim = minify && S._mathFunctionDepth !== 0 ? TRIM_MATH : TRIM_NOTHING;
	if (structural && open === "(") {
		// `@scope`'s parentheses hold selector lists, so a `:` there starts a
		// pseudo-class and the whitespace before it is a descendant combinator
		// - `@scope (div :hover)` is not `@scope (div:hover)`.
		trim = inScopePrelude(path) ? TRIM_COMBINATORS : TRIM_CONDITIONS;
		if (trim === TRIM_COMBINATORS) foldPseudoNames(parts);
	}
	const inner = join(parts, !minify, trim);
	return `${open}${inner}${close}`;
};

/**
 * The `printer` case for a declaration.
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {boolean} minify whether minifying
 * @param {string} soft `""` minifying, `" "` beautifying
 * @returns {string} the node's serialized text
 */
const printDeclarationNode = (path, writer, minify, soft) => {
	const name = rawName(path.node);
	// WHY: a property is matched by what its name means, not by how it was
	// spelled - §4.3.7 lets any of its letters be written as an escape - so
	// every lookup below reads the unescaped name while the printed one
	// keeps the source's. It costs an `indexOf` where nothing is escaped.
	const meaning = path.name();
	// Counted rather than listed: a declaration's value is one component 92
	// times in 100, and the list would be built only to be indexed twice.
	const count = path.childCount();
	// `@property`'s `initial-value` is read against the sibling `syntax`
	// descriptor, so it is as opaque as a custom property's own value.
	const custom =
		meaning.startsWith("--") ||
		(S._inPropertyRule &&
			asciiCaseInsensitiveMatch(meaning, "initial-value")) ||
		// `@function`'s `result` is the token stream the call substitutes, so
		// it is opaque the same way - and empty when the function returns the
		// guaranteed-invalid value.
		(S._inFunctionRule && asciiCaseInsensitiveMatch(meaning, "result")) ||
		// A `{}` block standing as the whole value is a token stream the
		// engine holds as written too - no grammar reads it, so a rewrite of
		// it builds a different CSSOM from the same document.
		(count === 1 &&
			path.type(path.child(0)) === NODE_TYPE_SIMPLE_BLOCK &&
			blockTokenOf(path.child(0)) === "{");
	// A value-less declaration is invalid, so it is already ignored - except
	// on a custom property, where the empty value is the guaranteed-invalid
	// one a `var()` fallback reads.
	if (minify && S._transforms.removeDeadRules && count === 0 && !custom) {
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
		const property = custom ? meaning : standardSpelling(lowered);
		if (custom) {
			// `getPropertyValue()` hands this text back, so a rewritten token
			// would be a different CSSOM; only the boundaries between them go.
			const from = path.start(path.child(0));
			const to = path.end(path.child(count - 1));
			value = customPropertyValue(path, path.node, writer, from, to, !minify);
			// Closed as printed, since a `}` may still follow; the grammar leaves it
			// open where nothing does, as the engine keeps it.
			const last = S._eofPrinted;
			if (
				to === S._input.length &&
				last !== "" &&
				value.endsWith(last) &&
				last !== S._eofOpen
			) {
				S._openCustomValue = {
					printed: value,
					source: value.slice(0, value.length - last.length) + S._eofOpen
				};
			}
		} else if (property === "unicode-range") {
			// `U+...` tokenizes as numbers, so the generic numeric normalization
			// would corrupt it; each range is shortened as the urange it is.
			let raw = "";
			for (let at = 0; at < count; at++) {
				raw += printedSource(path.child(at));
			}
			value = minify
				? raw
						.split(",")
						.map((one) => minifyUnicodeRange(one.trim()))
						.join(",")
				: raw;
		} else {
			// Value hashes were already shortened by the hash printer, printing in a
			// value context, so this joins the children's text. A shorthand whose
			// value repeats what the notation implies collapses.
			const shorthand = minify
				? collapseShorthand(path, property, path.node, writer)
				: null;
			if (shorthand === null && count === 1) {
				// What a value is 98 times in 100, and `join` hands a lone fragment
				// back, so it is rewritten without an array. §5.4.6 step 7 pops a
				// trailing whitespace, so that child is never the `""` case.
				value = valueFragment(writer.get(path.child(0)), property, minify);
			} else {
				/** @type {string[]} */
				let fragments;
				if (shorthand === null) {
					fragments = [];
					appendChildTexts(path.node, writer, fragments);
				} else {
					fragments = shorthand;
				}
				// In place: a `map` per transform would allocate an array each.
				for (let i = 0; i < fragments.length; i++) {
					fragments[i] = valueFragment(fragments[i], property, minify);
				}
				// The string transforms below read space-separated components, so
				// only a value none of them covers loses the separators its tokens
				// do not need - a substitution's tokens included.
				const separatorsOnly =
					minify &&
					!AUTO_SECOND_VALUE_PROPERTIES.has(property) &&
					!ALPHA_VALUE_PROPERTIES.has(property) &&
					!RATIO_PROPERTIES.has(property);
				value = join(
					fragments,
					!minify,
					separatorsOnly ? TRIM_SEPARATORS : TRIM_NOTHING
				);
			}
			if (minify) {
				value = dropDefaultSecondValue(property, value);
				value = numberAlphaValue(property, value);
				value = dropRatioDenominator(property, value);
			}
		}
	}
	let important = "";
	if (isImportant(path.node)) {
		// A hex escape ending the value takes the space before `!` as its
		// terminator, so beautifying writes it one of its own.
		if (!minify) value = terminateIdentifier(value);
		important = `${soft}!important`;
	}
	// Property names match ASCII case-insensitively; a custom property's
	// does not, which is what `custom` already stands for - nor does an
	// `@font-feature-values` sub-rule's, which names a feature value.
	const folds =
		minify && S._transforms.foldCase && !custom && !S._inFeatureValuesRule;
	let printedName = folds && lowered !== name ? asciiLowercaseName(name) : name;
	// An escape spells the same name, so the name is written the shortest way.
	if (minify && S._transforms.rewriteEscapes && meaning !== name) {
		const spelled = escapeName(folds ? asciiLowercaseName(meaning) : meaning);
		if (spelled.length <= printedName.length) printedName = spelled;
	}
	return `${printedName}:${soft}${value}${important};`;
};

/**
 * The `printer` case for an at-rule or a qualified rule.
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {PrintContext} writer the print context (children's printed text)
 * @param {boolean} minify whether minifying
 * @param {string} soft `""` minifying, `" "` beautifying
 * @returns {string} the node's serialized text
 */
const printRuleNode = (path, writer, minify, soft) => {
	// Prefixing reads the prelude's tokens, not its joined text.
	const preludeParts = S._prefixingOn
		? /** @type {string[]} */ ([])
		: undefined;
	const decls = declarationsOf(path.node);
	const written = rulePrelude(path, writer, minify, preludeParts);
	// A hex escape ending the prelude takes the space before `{` as its
	// terminator, so beautifying writes it one of its own.
	const prelude =
		minify || decls === null ? written : terminateIdentifier(written);
	// A qualified rule always has a block; an at-rule has one only when its
	// declaration list is non-null - else it is `@...;`.
	if (decls === null) {
		if (minify) S._blockSpans.push(NO_BLOCK_ENTRY);
		// `@charset` names the encoding the *source* was read in, and what is
		// written out is UTF-8 whatever it said - so carrying it over is at
		// best 22 dead bytes and at worst an encoding the output is not in.
		if (
			minify &&
			S._transforms.removeDeadRules &&
			asciiCaseInsensitiveMatch(rawName(path.node), "charset")
		) {
			return "";
		}
		// The rule only goes where no target reads one: a condition this has
		// not come to yet still needs it, and so does an engine that reads it.
		if (
			minify &&
			S._transforms.customMedia &&
			atKeywordOf(path.node) === "custom-media" &&
			takeCustomMedia(prelude) &&
			!S._customMediaAllowed
		) {
			return "";
		}
		// No engine reads `@custom-selector`, so the rule always goes once its
		// name is down - but only where `:is()` can carry what it stands for.
		if (
			minify &&
			S._transforms.customSelectors &&
			S._isSelectorAllowed &&
			atKeywordOf(path.node) === "custom-selector" &&
			takeCustomSelector(prelude)
		) {
			return "";
		}
		return `${prelude};`;
	}
	// Read before the body: composing it is what leaves the block empty, and
	// the drop below asks the same question again.
	const unusedRule = takeUnusedRule(S._walkNode);
	const rules = rulesOf(path.node);
	// `nl` prefixes each item: nothing minifying, a line break beautifying
	// (declarations end in `;`, rules don't).
	const nl = minify ? "" : "\n";
	const memoized = memoizedBlockBody(S._walkNode);
	const {
		body,
		items,
		texts,
		superseded,
		droppedPrefix,
		addedPrefix,
		deadPrefixed,
		spans
	} =
		memoized === undefined
			? composeBlockBody(
					path,
					decls,
					rules,
					writer,
					minify,
					nl,
					S._walkNode,
					unusedRule
				)
			: // A rule its selector made unused writes nothing, whatever its block.
				memoizedComposition(unusedRule ? "" : memoized);
	memoizeBlockBody(
		S._walkNode,
		memoized === undefined && !unusedRule ? body : null
	);
	if (
		minify &&
		// An empty rule paints nothing, so dropping it leaves the cascade as it
		// was - but only where the block means nothing (`_streamClose` agrees).
		S._transforms.removeDeadRules &&
		body.length === 0 &&
		// See `_streamClose`: a rule taken out while a `@namespace` after it
		// could still be read would move one up into a live position.
		!(path.parent === null && S._namespacePrologueOpen) &&
		(path.type() === NODE_TYPE_QUALIFIED_RULE ||
			DROPPABLE_WHEN_EMPTY_AT_RULES.has(atKeywordOf(path.node)) ||
			unusedRule)
	) {
		// The rules written in it are not empty for its being so, and what the
		// hoist writes for them is rules a later copy can take back.
		S._blockSpans.push(
			path.type() === NODE_TYPE_QUALIFIED_RULE
				? NO_BLOCK_ENTRY_QUALIFIED
				: NO_BLOCK_ENTRY
		);
		{
			// A prefix copy of the rule carries its nested rules, though it writes
			// no block of its own. Asked against a scope of its own, so a rule that
			// prints nothing is never one a later rule's copy reads as written.
			/** @type {string[] | undefined} */
			let copies;
			if (
				S._prefixingOn &&
				path.type() === NODE_TYPE_QUALIFIED_RULE &&
				holdsNested(S._walkNode)
			) {
				const candidate = S._prefixDropCandidate;
				prefixQualifiedRule(
					`${prelude}${soft}{}`,
					/** @type {string[]} */ (preludeParts),
					`${soft}{${body}}`,
					{
						seen: new Set(),
						retractable: null,
						pending: null,
						dead: null,
						covering: null
					},
					false
				);
				S._prefixDropCandidate = candidate;
				if (S._prefixCopyPreludes.length !== 0) {
					copies = S._prefixCopyPreludes;
				}
			}
			const written =
				writeNested(
					path,
					S._walkNode,
					prelude,
					null,
					true,
					copies,
					undefined,
					deadPrefixed
				) || "";
			if (minify && written.length !== 0) {
				recordHoistedRule(written, null, 0);
			}
			return written;
		}
	}
	// A rule that says which color scheme it is in says it again as the pair
	// a lowered `light-dark()` reads, and - where it hands the choice to the
	// user's own preference - once more under the query that asks for it.
	let scheme = body;
	let schemeCopy = "";
	if (
		S._loweringLightDark &&
		S._sourceNamesLightDark &&
		path.type() === NODE_TYPE_QUALIFIED_RULE &&
		body.includes("color-scheme:") &&
		// The pair as this writes it, not either name on its own: a
		// block carrying that is one a lowering pass wrote. An authored
		// `--webpack-light` is a declaration of the author's.
		!body.includes(LIGHT_DARK_WRITTEN) &&
		!body.includes(LIGHT_DARK_WRITTEN_DARK)
	) {
		const written = COLOR_SCHEME_RE.exec(body);
		const toggle =
			written === null
				? null
				: lightDarkToggle(written[1].replace(IMPORTANT, "").trim());
		if (toggle !== null) {
			const at = toggleOffset(body);
			// The body's own closing `;` went with the minified print, and the
			// toggle's last is the one this block now ends on.
			scheme =
				at === -1
					? `${body};${toggle.toggle.slice(0, -1)}`
					: `${body.slice(0, at)}${toggle.toggle}${body.slice(at)}`;
			if (toggle.flip) {
				schemeCopy = `${PREFERS_DARK}${soft}{${OWN_PRELUDE}${soft}{${LIGHT_PROPERTY}:;${DARK_PROPERTY}:initial}}`;
			}
		}
	}
	// The hoist's copy names the prelude as the run settles it, since one
	// taken out is resolved against its parent and may be joined into a list.
	const ownRest = `${soft}{${scheme}${nl}}${schemeCopy}`;
	// A copy is read on its own by an engine knowing only its spelling, so it
	// carries the scheme toggles too.
	const copyBlock = `${soft}{${scheme}}`;
	const rest =
		schemeCopy === "" ? ownRest : ownRest.replace(OWN_PRELUDE, () => prelude);
	const text = `${prelude}${rest}`;
	// Prefix copies turn one rule into several, so a rewritten rule is not
	// offered for joining: its text no longer describes a single block. Each
	// block's rules are their own siblings, pairing within their scope.
	let out = text;
	// The rule's own text where a dark-scheme query follows its copies.
	let schemeOwn = "";
	if (S._prefixingOn) {
		// Read and clear here, so the lookahead is the one rule the writer
		// holds - which only a top-level rule ever is - and never a rule
		// further back.
		const parent = path.parent;
		const top = parent === null;
		const scope = prefixScope(parent);
		if (path.type() === NODE_TYPE_AT_RULE) {
			out = prefixAtRule(
				path,
				text,
				prelude,
				/** @type {string[]} */ (preludeParts)[0],
				scope,
				top
			);
		} else if (schemeCopy === "") {
			out = prefixQualifiedRule(
				text,
				/** @type {string[]} */ (preludeParts),
				copyBlock,
				scope,
				top
			);
		} else {
			// Every copy's dark-scheme rule goes in the one query the rule's own
			// is in, as a second pass would join them.
			const own = `${prelude}${soft}{${scheme}${nl}}`;
			schemeOwn = own;
			const prefixed = prefixQualifiedRule(
				own,
				/** @type {string[]} */ (preludeParts),
				copyBlock,
				scope,
				top
			);
			if (prefixed !== own && prefixed !== "") {
				const dark = schemeCopy.slice(
					schemeCopy.indexOf(OWN_PRELUDE) + OWN_PRELUDE.length,
					-1
				);
				let rules = "";
				for (const copy of S._prefixCopyPreludes) rules += copy + dark;
				out = `${prefixed}${schemeCopy.replace(OWN_PRELUDE, () => rules + prelude)}`;
			} else if (prefixed !== own) {
				out = prefixed;
			}
		}
	}
	// WHY: pushed whatever it holds, since the parent takes one off per child
	// with a body, so a block carrying no rule still has to be there. A
	// rewritten rule records no nesting - those spans name `text` rather than
	// `out` - but is still the one rule its text says it is. Only a block that
	// recorded something needs an entry of its own, a leaf rule taking the
	// shared one, and nothing is pushed while not minifying.
	if (minify) {
		S._blockSpans.push(
			spans === null || out !== text
				? path.type() === NODE_TYPE_QUALIFIED_RULE
					? copiedRuleEntry(
							out,
							text,
							prelude,
							schemeOwn,
							copyBlock,
							schemeCopy
						)
					: NO_BLOCK_ENTRY
				: {
						bodyAt: prelude.length + soft.length + 1,
						prelude,
						keyPrelude: openerKey(`${prelude}{`),
						qualified: path.type() === NODE_TYPE_QUALIFIED_RULE,
						spans,
						parts: null,
						query: null
					}
		);
	}
	// A rewritten rule is several rules with preludes of their own, and each
	// carries this rule's block - so the hoist takes them out. Only where
	// it holds no rule of its own, those naming one prelude of the several.
	const copies =
		out === text || S._prefixCopyPreludes.length === 0
			? undefined
			: S._prefixCopyPreludes;
	const nested = writeNested(
		path,
		S._walkNode,
		prelude,
		ownRest,
		out === text || copies !== undefined,
		copies,
		copyBlock + schemeCopy,
		deadPrefixed
	);
	if (nested === null) return "";
	if (out !== text) return out + nested;
	// The run wrote this rule's selectors into itself, so what it returns is
	// the whole of both - `text` being this rule's own `prelude` and `rest`.
	// Only a minifying print lowers nesting, so only one has a run to write.
	if (nested.length !== 0) {
		if (S._nestedTookParent) {
			recordHoistedRule(nested, null, 0);
			return nested;
		}
		recordHoistedRule(nested, text, prelude.length);
		return text + nested;
	}
	// Where the block is what a sibling is compared against, remember the rule
	// so the parent parts it without re-scanning for the `{`. An at-rule
	// remembers its block's entries too, so a sibling's rules can join them.
	if (
		minify &&
		path.type() === NODE_TYPE_AT_RULE &&
		MERGEABLE_AT_RULES.has(atKeywordOf(path.node))
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
					? ruleEntryOf(items[i], texts[i])
					: opaqueEntry(added + texts[i])
			);
		}
		let head = "";
		for (let i = 0; i < children.length - 1; i++) head += children[i].text;
		setRuleEntry(S._walkNode, {
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
			unordered: anyUnordered(children),
			list: null,
			block: null,
			declarations: null
		});
	}
	if (minify && path.type() === NODE_TYPE_QUALIFIED_RULE) {
		// Only a block of declarations lends its selectors to another's list: a
		// nested rule's `&` stands for the whole list and `:is(...)` takes its most
		// specific selector. One that printed nothing is none, so the text decides.
		const plain =
			rules === null ||
			rules.length === 0 ||
			!text.includes("{", prelude.length + 1);
		const parent = path.parent;
		// Which shape a join would read the prelude with - the parent is gone by
		// then. A keyframe selector is a list of its own shape, which
		// `rulePrelude` has already rewritten `from` in.
		let listKind = LIST_KIND_SELECTOR;
		if (parent !== null) {
			const parentType = path.type(parent);
			if (parentType === NODE_TYPE_QUALIFIED_RULE) {
				listKind = LIST_KIND_NESTED;
			} else if (
				parentType === NODE_TYPE_AT_RULE &&
				KEYFRAMES_AT_RULE_RE.test(atKeywordOf(parent))
			) {
				listKind = LIST_KIND_KEYFRAME;
			}
		}
		setRuleEntry(S._walkNode, {
			text,
			prelude: prelude.length,
			atRule: false,
			plain,
			listable: plain ? LIST_UNKNOWN : LIST_NO,
			listKind,
			children: null,
			head: "",
			unordered: false,
			list: null,
			block: null,
			declarations: null
		});
	}
	return text;
};

/**
 * The `printer` case for a hash.
 * @param {CssPath} path the accessor positioned on the finished node
 * @param {boolean} minify whether minifying
 * @returns {string} the node's serialized text
 */
const printHashNode = (path, minify) => {
	const raw = printedSource(path.node);
	if (!minify) return raw;
	// A hash is a hex color in a value and an id in a selector, and ids are
	// case-sensitive, so only the former shortens - at any value depth. An id's
	// escapes still shorten, the `#` held back so its first code point is one.
	if (!path.within(NODE_TYPE_DECLARATION)) {
		return S._transforms.rewriteEscapes
			? `#${minifyIdentEscapes(raw.slice(1))}`
			: raw;
	}
	// Inside a function only the known color functions take color hashes, and a
	// substitution's fallback, being the property's value. `paint()` is the
	// exception: its arguments reach a worklet rather than a declaration.
	const parent = path.parent;
	if (parent !== null && path.type(parent) === NODE_TYPE_FUNCTION) {
		const fn = unescapeIdentifier(rawName(parent)).toLowerCase();
		if (
			!COLOR_ARGUMENT_FUNCTIONS.has(fn) &&
			!(SUBSTITUTION_FUNCTIONS.has(fn) && fn !== "paint")
		) {
			return raw;
		}
	}
	const short = minifyHash(raw);
	const text = short === null ? raw : short;
	// A hex alpha the target cannot read is written as the `rgba()` it names.
	if (S._hexAlphaAllowed) return text;
	const lowered = S._transforms.lowerUnsupported
		? hexAlphaFallback(text)
		: null;
	return lowered === null ? text : lowered;
};

/**
 * The default CSS node printer - passed to the `SourceProcessor` and fired once a
 * node's visitors and children are done (a developer could supply their own).
 * It takes the same `path` a visitor gets plus the print context as its `writer`,
 * and knows nothing of the walk: it switches on `path.type()`, reads the node's
 * name / children through `path`, pulls its children's already-printed text from
 * `writer.get`, composes this node's text (with the CSS-local `join` / `SEP` /
 * spacing) and **returns** it. Structure keeps it safe: a declaration's
 * `name:value` drops the space around `:` a flat token stream could not, and
 * custom-property (`--*`) values stay verbatim. When minifying it also applies the
 * safe value transforms (number normalization, hex / rgb() color minification,
 * `cubic-bezier()` / `steps()` easing keywords, string / attribute-selector /
 * `url()` quote normalization, identifier escape shortening, `{1,4}` box and
 * `flex` shorthand collapsing), drops the
 * whitespace a query condition does not need, and drops rules whose block ends
 * up empty - each value-identical, so meaning never changes.
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
		case NODE_TYPE_DECLARATION:
			return printDeclarationNode(path, writer, minify, soft);
		case NODE_TYPE_AT_RULE:
		case NODE_TYPE_QUALIFIED_RULE:
			return printRuleNode(path, writer, minify, soft);
		case NODE_TYPE_IDENT:
			return printIdentNode(path, minify);
		case NODE_TYPE_FUNCTION:
			return printFunctionNode(path, writer, minify);
		case NODE_TYPE_NUMBER:
		case NODE_TYPE_PERCENTAGE:
		case NODE_TYPE_DIMENSION: {
			const raw = printedSource(path.node);
			// A declaration value, a media feature or a `@supports` test - elsewhere a
			// prelude number is An+B, as it is in a tested `selector()`.
			return minify &&
				(path.within(NODE_TYPE_DECLARATION) ||
					S._inMediaConditionPrelude ||
					(S._inSupportsPrelude && !S._inSupportsSelector))
				? normalizeNumericToken(raw, isRgbChannel(path))
				: raw;
		}
		case NODE_TYPE_HASH:
			return printHashNode(path, minify);
		case NODE_TYPE_WHITESPACE:
			return SEP;
		case NODE_TYPE_STRING:
			return printStringNode(path, minify);
		case NODE_TYPE_URL:
			return printUrlNode(path, minify);
		case NODE_TYPE_SIMPLE_BLOCK:
			return printSimpleBlockNode(path, writer, minify);
		// Only a newline makes a string bad, and the tokenizer leaves it unconsumed
		// - so carry it, or the string closes and the declaration an engine threw
		// away runs.
		case NODE_TYPE_BAD_STRING:
			return `${printedSource(path.node)}\n`;
		// Its remnants run to the next `)`, so one the input ran out in is closed
		// as a url is, or it swallows what the printer writes next.
		case NODE_TYPE_BAD_URL: {
			const raw = printedSource(path.node);
			return isUnterminatedUrl(raw) ? terminate(raw, ")", "\uFFFD") : raw;
		}
		case NODE_TYPE_RAW:
			// Off-spec passthrough (see `NodeType.Raw`). It sits in a declaration list,
			// so it carries the `;` parting it from the next item, and leaves an entry
			// saying it carries no rule, without which the rules after read the next's.
			if (minify) S._blockSpans.push(NO_BLOCK_ENTRY);
			{
				const raw = printedSource(path.node);
				let rest = path.end();
				while (
					rest < S._input.length &&
					isAsciiWhitespace(S._input.charCodeAt(rest))
				) {
					rest++;
				}
				// Where the input ran out inside it, what it left open - a comment, a
				// string, a bracket - would swallow the `;` and `}` written after it.
				return `${rest === S._input.length ? closeAtEof(raw) : raw};`;
			}
		default: {
			// Any remaining leaf token (ident, string, url, delim, ...) prints verbatim
			// from its source slice.
			const raw = printedSource(path.node);
			// WHY: §4.3.8 makes a `\` a delim only where a newline follows it -
			// before anything else it escapes that character, the `;`, `}` and `{`
			// this printer writes included, and no other token is a lone `\` (one
			// the input ran out of reads as `U+FFFD` above). So the newline is not
			// whitespace around the token, it is how the token is spelled.
			return raw === "\\" ? "\\\n" : raw;
		}
	}
};

const CSS_STRING_ESCAPE_RE = /[\\\n]/g;

/**
 * Spell a rebuilt URL so it parses back to itself: as a url-token when it can
 * be one, otherwise quoted with the delimiter and its escapes written out.
 * @param {string} url the URL to spell
 * @param {string} mark the quote to use when it needs one
 * @returns {string} the `url()` argument
 */
const serializeUrl = (url, mark) => {
	// Both spellings below the quoted one are the unquoting `transforms.quotes`
	// names, so off they are not this printer's to pick: a rendered payload has
	// no authored quoting left to keep, and the quotes carry any of it.
	if (S._transforms.normalizeQuotes) {
		if (!UNQUOTABLE_URL_RE.test(url)) return url;
		const escaped = escapeUrlBody(url);
		if (escaped !== null) return escaped;
	}
	// As a string token the reprint reads it as, so a second pass spells it alike.
	return minifyString(
		mark +
			url.replace(CSS_STRING_ESCAPE_RE, "\\$&").split(mark).join(`\\${mark}`) +
			mark
	);
};

/**
 * Record a url's `data:` payload for an asynchronous caller and print the
 * `url()` holding the marker that stands in for it, or `null` when there is
 * nothing to offer. `build` spells the whole `url()` from the answer, so its
 * quoting is decided by what the payload turns out to be rather than by what
 * it was.
 * @param {string} body the url body, unquoted and unescaped
 * @param {string} opener the `url(` that `build` and `fallback` both open with
 * @param {(url: string) => string} build the `url()` text around a rebuilt URL
 * @param {string} fallback the text to print when the caller declines
 * @returns {string | null} the `url()` to print, or null when nothing is offered
 */
const deferDataUrl = (body, opener, build, fallback) => {
	const read = readDataUrl(body);
	if (read === null) return null;
	const holes = /** @type {DeferredEmbeddedSource[]} */ (
		S._deferEmbeddedSource
	);
	const id = holes.length;
	holes.push({
		type: read.type,
		hostType: CSS_TYPE,
		source: read.payload,
		build: (rendered) =>
			(typeof rendered !== "string" || rendered === read.payload
				? fallback
				: build(buildDataURI(read.parsed, rendered))
			).slice(opener.length, -1)
	});
	return `${opener}${deferredWrite(id)})`;
};

/**
 * Read a url's `data:` payload out, for a caller that will render it. `null`
 * when there is nothing to offer - not a data URL, a media type naming no
 * language webpack knows, or a payload that would not round-trip.
 * @param {string} url the url body, unquoted and unescaped
 * @returns {{ parsed: import("../util/dataURL").ParsedDataURI, type: string, payload: string } | null} what it holds, or null
 */
const readDataUrl = (url) => {
	// Char-code gate so the dominant non-`data:` url costs one read.
	if ((url.charCodeAt(0) | 0x20) !== CC_LOWER_D) return null;
	// A CSS escape is still written here - the quoted form is percent-decoded,
	// not unescaped - so the payload would be read with its backslashes in it.
	if (url.includes("\\")) return null;
	return readEmbeddedDataURI(url);
};

/**
 * Offer a url's `data:` payload to the renderer, and rebuild the URL around
 * what comes back. `null` when nothing should change - not a data URL, a media
 * type naming no language webpack knows, a payload that would not round-trip,
 * or a renderer that declined.
 * @param {string} url the url body, unquoted and unescaped
 * @returns {string | null} the rebuilt URL, or null to emit the original
 */
const renderDataUrl = (url) => {
	if (S._renderEmbeddedSource === undefined) return null;
	const read = readDataUrl(url);
	if (read === null) return null;
	let rendered;
	try {
		rendered = S._renderEmbeddedSource(read.payload, {
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

setVerbatimLeafPrinter(printer);

module.exports.printer = printer;
