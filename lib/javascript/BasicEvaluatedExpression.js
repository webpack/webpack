/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("estree").Node} Node */
/** @typedef {import("./JavascriptParser").Range} Range */
/** @typedef {import("./JavascriptParser").VariableInfo} VariableInfo */
/** @typedef {import("./JavascriptParser").Members} Members */
/** @typedef {import("./JavascriptParser").MembersOptionals} MembersOptionals */
/** @typedef {import("./JavascriptParser").MemberRanges} MemberRanges */

const TypeUnknown = 0;
const TypeUndefined = 1;
const TypeNull = 2;
const TypeString = 3;
const TypeNumber = 4;
const TypeBoolean = 5;
const TypeRegExp = 6;
const TypeConditional = 7;
const TypeArray = 8;
const TypeConstArray = 9;
const TypeIdentifier = 10;
const TypeWrapped = 11;
const TypeTemplateString = 12;
const TypeBigInt = 13;

/** @typedef {() => Members} GetMembers */
/** @typedef {() => MembersOptionals} GetMembersOptionals */
/** @typedef {() => MemberRanges} GetMemberRanges */

// _flags bit layout: bits 0-3 type, then the boolean facts
const FLAG_TYPE_MASK = 0b1111;
const FLAG_TRUTHY = 0b10000;
const FLAG_FALSY = 0b100000;
const FLAG_NULLISH_KNOWN = 0b1000000;
const FLAG_NULLISH = 0b10000000;
const FLAG_SIDE_EFFECTS = 0b100000000;

/**
 * An instance is allocated for a large share of walked expressions, so the
 * boolean facts live in one packed flags slot and the scalar/identifier
 * fields in five slots shared by type, with accessors keeping every public
 * field readable. This shrinks instances from 224 to 144 bytes on V8.
 */
class BasicEvaluatedExpression {
	constructor() {
		this._flags = FLAG_SIDE_EFFECTS;
		/** @type {Range | undefined} */
		this._range = undefined;
		/** @type {Node | undefined} */
		this.expression = undefined;
		// _v1..._v5 hold the scalar type-specific fields, the accessors narrow
		// them by type; expression-valued fields get typed slots below
		/** @type {unknown} */
		this._v1 = undefined;
		/** @type {unknown} */
		this._v2 = undefined;
		/** @type {unknown} */
		this._v3 = undefined;
		/** @type {unknown} */
		this._v4 = undefined;
		/** @type {unknown} */
		this._v5 = undefined;
		// expression-valued fields stay plain data properties: a type that
		// references the class inside one of its own accessors makes tsc fork
		// the class into two unrelated identities
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.quasis = undefined;
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.parts = undefined;
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.items = undefined;
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.options = undefined;
		/** @type {BasicEvaluatedExpression | undefined | null} */
		this.prefix = undefined;
		/** @type {BasicEvaluatedExpression | undefined | null} */
		this.postfix = undefined;
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.wrappedInnerExpressions = undefined;
	}

	/**
	 * Served lazily from the attached expression when not set explicitly:
	 * `evaluateExpression`'s plain results share the expression's range, and
	 * most evaluations never read it, so the node's range array is only
	 * materialized on demand.
	 * @returns {Range | undefined} range of the evaluated expression
	 */
	get range() {
		const range = this._range;
		if (range !== undefined) return range;
		const expression = this.expression;
		return expression === undefined
			? undefined
			: /** @type {Range} */ (
					/** @type {{ range?: Range }} */ (expression).range
				);
	}

	/**
	 * @param {Range | undefined} value range of the evaluated expression
	 */
	set range(value) {
		this._range = value;
	}

	/**
	 * @returns {number} expression type
	 */
	get type() {
		return this._flags & FLAG_TYPE_MASK;
	}

	/**
	 * @param {number} value expression type
	 */
	set type(value) {
		this._flags = (this._flags & ~FLAG_TYPE_MASK) | value;
	}

	/**
	 * @returns {boolean} true when the expression is known truthy
	 */
	get truthy() {
		return (this._flags & FLAG_TRUTHY) !== 0;
	}

	/**
	 * @param {boolean} value known truthy
	 */
	set truthy(value) {
		this._flags = value
			? this._flags | FLAG_TRUTHY
			: this._flags & ~FLAG_TRUTHY;
	}

	/**
	 * @returns {boolean} true when the expression is known falsy
	 */
	get falsy() {
		return (this._flags & FLAG_FALSY) !== 0;
	}

	/**
	 * @param {boolean} value known falsy
	 */
	set falsy(value) {
		this._flags = value ? this._flags | FLAG_FALSY : this._flags & ~FLAG_FALSY;
	}

	/**
	 * @returns {boolean | undefined} whether the value is nullish, when known
	 */
	get nullish() {
		return (this._flags & FLAG_NULLISH_KNOWN) === 0
			? undefined
			: (this._flags & FLAG_NULLISH) !== 0;
	}

	/**
	 * @param {boolean | undefined} value whether the value is nullish
	 */
	set nullish(value) {
		this._flags =
			value === undefined
				? this._flags & ~(FLAG_NULLISH_KNOWN | FLAG_NULLISH)
				: value
					? this._flags | FLAG_NULLISH_KNOWN | FLAG_NULLISH
					: (this._flags | FLAG_NULLISH_KNOWN) & ~FLAG_NULLISH;
	}

	/**
	 * @returns {boolean} true when the expression could have side effects
	 */
	get sideEffects() {
		return (this._flags & FLAG_SIDE_EFFECTS) !== 0;
	}

	/**
	 * @param {boolean} value could have side effects
	 */
	set sideEffects(value) {
		this._flags = value
			? this._flags | FLAG_SIDE_EFFECTS
			: this._flags & ~FLAG_SIDE_EFFECTS;
	}

	/**
	 * @returns {boolean | undefined} boolean value when boolean-typed
	 */
	get bool() {
		return this.type === TypeBoolean
			? /** @type {boolean} */ (this._v1)
			: undefined;
	}

	/**
	 * @param {boolean | undefined} value boolean value
	 */
	set bool(value) {
		this._v1 = value;
	}

	/**
	 * @returns {number | undefined} number value when number-typed
	 */
	get number() {
		return this.type === TypeNumber
			? /** @type {number} */ (this._v1)
			: undefined;
	}

	/**
	 * @param {number | undefined} value number value
	 */
	set number(value) {
		this._v1 = value;
	}

	/**
	 * @returns {bigint | undefined} bigint value when bigint-typed
	 */
	get bigint() {
		return this.type === TypeBigInt
			? /** @type {bigint} */ (this._v1)
			: undefined;
	}

	/**
	 * @param {bigint | undefined} value bigint value
	 */
	set bigint(value) {
		this._v1 = value;
	}

	/**
	 * @returns {RegExp | undefined} regexp value when regexp-typed
	 */
	get regExp() {
		return this.type === TypeRegExp
			? /** @type {RegExp} */ (this._v1)
			: undefined;
	}

	/**
	 * @param {RegExp | undefined} value regexp value
	 */
	set regExp(value) {
		this._v1 = value;
	}

	/**
	 * @returns {string | undefined} string value when string-typed
	 */
	get string() {
		return this.type === TypeString
			? /** @type {string} */ (this._v1)
			: undefined;
	}

	/**
	 * @param {string | undefined} value string value
	 */
	set string(value) {
		this._v1 = value;
	}

	/**
	 * @returns {"cooked" | "raw" | undefined} template string kind
	 */
	get templateStringKind() {
		return this.type === TypeTemplateString
			? /** @type {"cooked" | "raw"} */ (this._v3)
			: undefined;
	}

	/**
	 * @param {"cooked" | "raw" | undefined} value template string kind
	 */
	set templateStringKind(value) {
		this._v3 = value;
	}

	/**
	 * @returns {EXPECTED_ANY[] | undefined} const array values
	 */
	get array() {
		return this.type === TypeConstArray
			? /** @type {unknown[]} */ (this._v1)
			: undefined;
	}

	/**
	 * @param {EXPECTED_ANY[] | undefined} value const array values
	 */
	set array(value) {
		this._v1 = value;
	}

	/**
	 * @returns {string | VariableInfo | undefined} identifier
	 */
	get identifier() {
		return this.type === TypeIdentifier
			? /** @type {string | VariableInfo} */ (this._v1)
			: undefined;
	}

	/**
	 * @param {string | VariableInfo | undefined} value identifier
	 */
	set identifier(value) {
		this._v1 = value;
	}

	/**
	 * @returns {string | VariableInfo | undefined} root info
	 */
	get rootInfo() {
		return this.type === TypeIdentifier
			? /** @type {string | VariableInfo} */ (this._v2)
			: undefined;
	}

	/**
	 * @param {string | VariableInfo | undefined} value root info
	 */
	set rootInfo(value) {
		this._v2 = value;
	}

	/**
	 * @returns {GetMembers | undefined} members getter
	 */
	get getMembers() {
		return this.type === TypeIdentifier
			? /** @type {GetMembers} */ (this._v3)
			: undefined;
	}

	/**
	 * @param {GetMembers | undefined} value members getter
	 */
	set getMembers(value) {
		this._v3 = value;
	}

	/**
	 * @returns {GetMembersOptionals | undefined} members optionals getter
	 */
	get getMembersOptionals() {
		return this.type === TypeIdentifier
			? /** @type {GetMembersOptionals} */ (this._v4)
			: undefined;
	}

	/**
	 * @param {GetMembersOptionals | undefined} value members optionals getter
	 */
	set getMembersOptionals(value) {
		this._v4 = value;
	}

	/**
	 * @returns {GetMemberRanges | undefined} member ranges getter
	 */
	get getMemberRanges() {
		return this.type === TypeIdentifier
			? /** @type {GetMemberRanges} */ (this._v5)
			: undefined;
	}

	/**
	 * @param {GetMemberRanges | undefined} value member ranges getter
	 */
	set getMemberRanges(value) {
		this._v5 = value;
	}

	isUnknown() {
		return this.type === TypeUnknown;
	}

	isNull() {
		return this.type === TypeNull;
	}

	isUndefined() {
		return this.type === TypeUndefined;
	}

	isString() {
		return this.type === TypeString;
	}

	isNumber() {
		return this.type === TypeNumber;
	}

	isBigInt() {
		return this.type === TypeBigInt;
	}

	isBoolean() {
		return this.type === TypeBoolean;
	}

	isRegExp() {
		return this.type === TypeRegExp;
	}

	isConditional() {
		return this.type === TypeConditional;
	}

	isArray() {
		return this.type === TypeArray;
	}

	isConstArray() {
		return this.type === TypeConstArray;
	}

	isIdentifier() {
		return this.type === TypeIdentifier;
	}

	isWrapped() {
		return this.type === TypeWrapped;
	}

	isTemplateString() {
		return this.type === TypeTemplateString;
	}

	/**
	 * Is expression a primitive or an object type value?
	 * @returns {boolean | undefined} true: primitive type, false: object type, undefined: unknown/runtime-defined
	 */
	isPrimitiveType() {
		switch (this.type) {
			case TypeUndefined:
			case TypeNull:
			case TypeString:
			case TypeNumber:
			case TypeBoolean:
			case TypeBigInt:
			case TypeWrapped:
			case TypeTemplateString:
				return true;
			case TypeRegExp:
			case TypeArray:
			case TypeConstArray:
				return false;
			default:
				return undefined;
		}
	}

	/**
	 * Is expression a runtime or compile-time value?
	 * @returns {boolean} true: compile time value, false: runtime value
	 */
	isCompileTimeValue() {
		switch (this.type) {
			case TypeUndefined:
			case TypeNull:
			case TypeString:
			case TypeNumber:
			case TypeBoolean:
			case TypeRegExp:
			case TypeConstArray:
			case TypeBigInt:
				return true;
			default:
				return false;
		}
	}

	/**
	 * As compile time value.
	 * @returns {undefined | null | string | number | boolean | RegExp | EXPECTED_ANY[] | bigint} the javascript value
	 */
	asCompileTimeValue() {
		switch (this.type) {
			case TypeUndefined:
				return;
			case TypeNull:
				return null;
			case TypeString:
				return this.string;
			case TypeNumber:
				return this.number;
			case TypeBoolean:
				return this.bool;
			case TypeRegExp:
				return this.regExp;
			case TypeConstArray:
				return this.array;
			case TypeBigInt:
				return this.bigint;
			default:
				throw new Error(
					"asCompileTimeValue must only be called for compile-time values"
				);
		}
	}

	isTruthy() {
		return this.truthy;
	}

	isFalsy() {
		return this.falsy;
	}

	isNullish() {
		return this.nullish;
	}

	/**
	 * Can this expression have side effects?
	 * @returns {boolean} false: never has side effects
	 */
	couldHaveSideEffects() {
		return this.sideEffects;
	}

	/**
	 * Creates a boolean representation of this evaluated expression.
	 * @returns {boolean | undefined} true: truthy, false: falsy, undefined: unknown
	 */
	asBool() {
		if (this.truthy) return true;
		if (this.falsy || this.nullish) return false;
		if (this.isBoolean()) return this.bool;
		if (this.isNull()) return false;
		if (this.isUndefined()) return false;
		if (this.isString()) return this.string !== "";
		if (this.isNumber()) return this.number !== 0;
		if (this.isBigInt()) return this.bigint !== BigInt(0);
		if (this.isRegExp()) return true;
		if (this.isArray()) return true;
		if (this.isConstArray()) return true;
		if (this.isWrapped()) {
			return (this.prefix && this.prefix.asBool()) ||
				(this.postfix && this.postfix.asBool())
				? true
				: undefined;
		}
		if (this.isTemplateString()) {
			const str = this.asString();
			if (typeof str === "string") return str !== "";
		}
	}

	/**
	 * Creates a nullish coalescing representation of this evaluated expression.
	 * @returns {boolean | undefined} true: nullish, false: not nullish, undefined: unknown
	 */
	asNullish() {
		const nullish = this.isNullish();

		if (nullish === true || this.isNull() || this.isUndefined()) return true;

		if (nullish === false) return false;
		if (this.isTruthy()) return false;
		if (this.isBoolean()) return false;
		if (this.isString()) return false;
		if (this.isNumber()) return false;
		if (this.isBigInt()) return false;
		if (this.isRegExp()) return false;
		if (this.isArray()) return false;
		if (this.isConstArray()) return false;
		if (this.isTemplateString()) return false;
		if (this.isRegExp()) return false;
	}

	/**
	 * Creates a string representation of this evaluated expression.
	 * @returns {string | undefined} the string representation or undefined if not possible
	 */
	asString() {
		if (this.isBoolean()) return `${this.bool}`;
		if (this.isNull()) return "null";
		if (this.isUndefined()) return "undefined";
		if (this.isString()) return this.string;
		if (this.isNumber()) return `${this.number}`;
		if (this.isBigInt()) return `${this.bigint}`;
		if (this.isRegExp()) return `${this.regExp}`;
		if (this.isArray()) {
			/** @type {string[]} */
			const array = [];
			for (const item of /** @type {BasicEvaluatedExpression[]} */ (
				this.items
			)) {
				const itemStr = item.asString();
				if (itemStr === undefined) return;
				array.push(itemStr);
			}
			return `${array}`;
		}
		if (this.isConstArray()) return `${this.array}`;
		if (this.isTemplateString()) {
			let str = "";
			for (const part of /** @type {BasicEvaluatedExpression[]} */ (
				this.parts
			)) {
				const partStr = part.asString();
				if (partStr === undefined) return;
				str += partStr;
			}
			return str;
		}
	}

	/**
	 * Updates string using the provided string.
	 * @param {string} string value
	 * @returns {BasicEvaluatedExpression} basic evaluated expression
	 */
	setString(string) {
		this.type = TypeString;
		this.string = string;
		this.sideEffects = false;
		return this;
	}

	setUndefined() {
		this.type = TypeUndefined;
		this.sideEffects = false;
		return this;
	}

	setNull() {
		this.type = TypeNull;
		this.sideEffects = false;
		return this;
	}

	/**
	 * Set's the value of this expression to a number
	 * @param {number} number number to set
	 * @returns {this} this
	 */
	setNumber(number) {
		this.type = TypeNumber;
		this.number = number;
		this.sideEffects = false;
		return this;
	}

	/**
	 * Set's the value of this expression to a BigInt
	 * @param {bigint} bigint bigint to set
	 * @returns {this} this
	 */
	setBigInt(bigint) {
		this.type = TypeBigInt;
		this.bigint = bigint;
		this.sideEffects = false;
		return this;
	}

	/**
	 * Set's the value of this expression to a boolean
	 * @param {boolean} bool boolean to set
	 * @returns {this} this
	 */
	setBoolean(bool) {
		this.type = TypeBoolean;
		this.bool = bool;
		this.sideEffects = false;
		return this;
	}

	/**
	 * Set's the value of this expression to a regular expression
	 * @param {RegExp} regExp regular expression to set
	 * @returns {this} this
	 */
	setRegExp(regExp) {
		this.type = TypeRegExp;
		this.regExp = regExp;
		this.sideEffects = false;
		return this;
	}

	/**
	 * Set's the value of this expression to a particular identifier and its members.
	 * @param {string | VariableInfo} identifier identifier to set
	 * @param {string | VariableInfo} rootInfo root info
	 * @param {GetMembers} getMembers members
	 * @param {GetMembersOptionals=} getMembersOptionals optional members
	 * @param {GetMemberRanges=} getMemberRanges ranges of progressively increasing sub-expressions
	 * @returns {this} this
	 */
	setIdentifier(
		identifier,
		rootInfo,
		getMembers,
		getMembersOptionals,
		getMemberRanges
	) {
		this.type = TypeIdentifier;
		this.identifier = identifier;
		this.rootInfo = rootInfo;
		this.getMembers = getMembers;
		this.getMembersOptionals = getMembersOptionals;
		this.getMemberRanges = getMemberRanges;
		this.sideEffects = true;
		return this;
	}

	/**
	 * Wraps an array of expressions with a prefix and postfix expression.
	 * @param {BasicEvaluatedExpression | null | undefined} prefix Expression to be added before the innerExpressions
	 * @param {BasicEvaluatedExpression | null | undefined} postfix Expression to be added after the innerExpressions
	 * @param {BasicEvaluatedExpression[] | undefined} innerExpressions Expressions to be wrapped
	 * @returns {this} this
	 */
	setWrapped(prefix, postfix, innerExpressions) {
		this.type = TypeWrapped;
		this.prefix = prefix;
		this.postfix = postfix;
		this.wrappedInnerExpressions = innerExpressions;
		this.sideEffects = true;
		return this;
	}

	/**
	 * Stores the options of a conditional expression.
	 * @param {BasicEvaluatedExpression[]} options optional (consequent/alternate) expressions to be set
	 * @returns {this} this
	 */
	setOptions(options) {
		this.type = TypeConditional;
		this.options = options;
		this.sideEffects = true;
		return this;
	}

	/**
	 * Adds the provided basic evaluated expression to the basic evaluated expression.
	 * @param {BasicEvaluatedExpression[]} options optional (consequent/alternate) expressions to be added
	 * @returns {this} this
	 */
	addOptions(options) {
		if (!this.options) {
			this.type = TypeConditional;
			this.options = [];
			this.sideEffects = true;
		}
		for (const item of options) {
			this.options.push(item);
		}
		return this;
	}

	/**
	 * Set's the value of this expression to an array of expressions.
	 * @param {BasicEvaluatedExpression[]} items expressions to set
	 * @returns {this} this
	 */
	setItems(items) {
		this.type = TypeArray;
		this.items = items;
		this.sideEffects = items.some((i) => i.couldHaveSideEffects());
		return this;
	}

	/**
	 * Set's the value of this expression to an array of strings.
	 * @param {string[]} array array to set
	 * @returns {this} this
	 */
	setArray(array) {
		this.type = TypeConstArray;
		this.array = array;
		this.sideEffects = false;
		return this;
	}

	/**
	 * Set's the value of this expression to a processed/unprocessed template string. Used
	 * for evaluating TemplateLiteral expressions in the JavaScript Parser.
	 * @param {BasicEvaluatedExpression[]} quasis template string quasis
	 * @param {BasicEvaluatedExpression[]} parts template string parts
	 * @param {"cooked" | "raw"} kind template string kind
	 * @returns {this} this
	 */
	setTemplateString(quasis, parts, kind) {
		this.type = TypeTemplateString;
		this.quasis = quasis;
		this.parts = parts;
		this.templateStringKind = kind;
		this.sideEffects = parts.some((p) => p.sideEffects);
		return this;
	}

	setTruthy() {
		this.falsy = false;
		this.truthy = true;
		this.nullish = false;
		return this;
	}

	setFalsy() {
		this.falsy = true;
		this.truthy = false;
		return this;
	}

	/**
	 * Set's the value of the expression to nullish.
	 * @param {boolean} value true, if the expression is nullish
	 * @returns {this} this
	 */
	setNullish(value) {
		this.nullish = value;

		if (value) return this.setFalsy();

		return this;
	}

	/**
	 * Set's the range for the expression.
	 * @param {Range} range range to set
	 * @returns {this} this
	 */
	setRange(range) {
		this._range = range;
		return this;
	}

	/**
	 * Set whether or not the expression has side effects.
	 * @param {boolean} sideEffects true, if the expression has side effects
	 * @returns {this} this
	 */
	setSideEffects(sideEffects = true) {
		this.sideEffects = sideEffects;
		return this;
	}

	/**
	 * Set the expression node for the expression.
	 * @param {Node | undefined} expression expression
	 * @returns {this} this
	 */
	setExpression(expression) {
		this.expression = expression;
		return this;
	}
}

/**
 * Returns is valid flags.
 * @param {string} flags regexp flags
 * @returns {boolean} is valid flags
 */
BasicEvaluatedExpression.isValidRegExpFlags = (flags) => {
	const len = flags.length;

	if (len === 0) return true;
	// 8 standard flags: d g i m s u v y
	if (len > 8) return false;

	const D = 1; // d hasIndices
	const G = 2; // g global
	const I = 4; // i ignoreCase
	const M = 8; // m multiline
	const S = 16; // s dotAll
	const U = 32; // u unicode
	const V = 64; // v unicodeSets
	const Y = 128; // y sticky
	let seen = 0;

	for (let i = 0; i < len; i++) {
		let bit;
		switch (flags.charCodeAt(i)) {
			case 100 /* d */:
				bit = D;
				break;
			case 103 /* g */:
				bit = G;
				break;
			case 105 /* i */:
				bit = I;
				break;
			case 109 /* m */:
				bit = M;
				break;
			case 115 /* s */:
				bit = S;
				break;
			case 117 /* u */:
				bit = U;
				break;
			case 118 /* v */:
				bit = V;
				break;
			case 121 /* y */:
				bit = Y;
				break;
			default:
				return false;
		}
		if (seen & bit) return false; // duplicate flag
		seen |= bit;
	}

	// `u` and `v` are mutually exclusive
	if (seen & U && seen & V) return false;

	return true;
};

module.exports = BasicEvaluatedExpression;
