/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

/** @typedef {import("estree").Node} EsTreeNode */
/** @typedef {import("./JavascriptParser").VariableInfoInterface} VariableInfoInterface */

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

class BasicEvaluatedExpression {
	constructor() {
		this.type = TypeUnknown;
		/** @type {[number, number]} */
		this.range = undefined;
		/** @type {boolean} */
		this.falsy = false;
		/** @type {boolean} */
		this.truthy = false;
		/** @type {boolean | undefined} */
		this.nullish = undefined;
		/** @type {boolean} */
		this.sideEffects = true;
		/** @type {boolean | undefined} */
		this.bool = undefined;
		/** @type {number | undefined} */
		this.number = undefined;
		/** @type {bigint | undefined} */
		this.bigint = undefined;
		/** @type {RegExp | undefined} */
		this.regExp = undefined;
		/** @type {string | undefined} */
		this.string = undefined;
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.quasis = undefined;
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.parts = undefined;
		/** @type {any[] | undefined} */
		this.array = undefined;
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.items = undefined;
		/** @type {BasicEvaluatedExpression[] | undefined} */
		this.options = undefined;
		/** @type {BasicEvaluatedExpression | undefined} */
		this.prefix = undefined;
		/** @type {BasicEvaluatedExpression | undefined} */
		this.postfix = undefined;
		this.wrappedInnerExpressions = undefined;
		/** @type {string | VariableInfoInterface | undefined} */
		this.identifier = undefined;
		/** @type {VariableInfoInterface} */
		this.rootInfo = undefined;
		/** @type {() => string[]} */
		this.getMembers = undefined;
		/** @type {() => boolean[]} */
		this.getMembersOptionals = undefined;
		/** @type {EsTreeNode} */
		this.expression = undefined;
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
	 * Gets the compile-time value of the expression
	 * @returns {any} the javascript value
	 */
	asCompileTimeValue() {
		switch (this.type) {
			case TypeUndefined:
				return undefined;
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
		return undefined;
	}

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

		return undefined;
	}

	asString() {
		if (this.isBoolean()) return `${this.bool}`;
		if (this.isNull()) return "null";
		if (this.isUndefined()) return "undefined";
		if (this.isString()) return this.string;
		if (this.isNumber()) return `${this.number}`;
		if (this.isBigInt()) return `${this.bigint}`;
		if (this.isRegExp()) return `${this.regExp}`;
		if (this.isArray()) {
			let array = [];
			for (const item of this.items) {
				const itemStr = item.asString();
				if (itemStr === undefined) return undefined;
				array.push(itemStr);
			}
			return `${array}`;
		}
		if (this.isConstArray()) return `${this.array}`;
		if (this.isTemplateString()) {
			let str = "";
			for (const part of this.parts) {
				const partStr = part.asString();
				if (partStr === undefined) return undefined;
				str += partStr;
			}
			return str;
		}
		return undefined;
	}

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

	setNumber(number) {
		this.type = TypeNumber;
		this.number = number;
		this.sideEffects = false;
		return this;
	}

	setBigInt(bigint) {
		this.type = TypeBigInt;
		this.bigint = bigint;
		this.sideEffects = false;
		return this;
	}

	setBoolean(bool) {
		this.type = TypeBoolean;
		this.bool = bool;
		this.sideEffects = false;
		return this;
	}

	setRegExp(regExp) {
		this.type = TypeRegExp;
		this.regExp = regExp;
		this.sideEffects = false;
		return this;
	}

	setIdentifier(identifier, rootInfo, getMembers, getMembersOptionals) {
		this.type = TypeIdentifier;
		this.identifier = identifier;
		this.rootInfo = rootInfo;
		this.getMembers = getMembers;
		this.getMembersOptionals = getMembersOptionals;
		this.sideEffects = true;
		return this;
	}

	setWrapped(prefix, postfix, innerExpressions) {
		this.type = TypeWrapped;
		this.prefix = prefix;
		this.postfix = postfix;
		this.wrappedInnerExpressions = innerExpressions;
		this.sideEffects = true;
		return this;
	}

	setOptions(options) {
		this.type = TypeConditional;
		this.options = options;
		this.sideEffects = true;
		return this;
	}

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

	setItems(items) {
		this.type = TypeArray;
		this.items = items;
		this.sideEffects = items.some(i => i.couldHaveSideEffects());
		return this;
	}

	setArray(array) {
		this.type = TypeConstArray;
		this.array = array;
		this.sideEffects = false;
		return this;
	}

	setTemplateString(quasis, parts, kind) {
		this.type = TypeTemplateString;
		this.quasis = quasis;
		this.parts = parts;
		this.templateStringKind = kind;
		this.sideEffects = parts.some(p => p.sideEffects);
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

	setNullish(value) {
		this.nullish = value;

		if (value) return this.setFalsy();

		return this;
	}

	setRange(range) {
		this.range = range;
		return this;
	}

	setSideEffects(sideEffects = true) {
		this.sideEffects = sideEffects;
		return this;
	}

	setExpression(expression) {
		this.expression = expression;
		return this;
	}
}

/**
 * @param {string} flags regexp flags
 * @returns {boolean} is valid flags
 */
BasicEvaluatedExpression.isValidRegExpFlags = flags => {
	const len = flags.length;

	if (len === 0) return true;
	if (len > 4) return false;

	// cspell:word gimy
	let remaining = 0b0000; // bit per RegExp flag: gimy

	for (let i = 0; i < len; i++)
		switch (flags.charCodeAt(i)) {
			case 103 /* g */:
				if (remaining & 0b1000) return false;
				remaining |= 0b1000;
				break;
			case 105 /* i */:
				if (remaining & 0b0100) return false;
				remaining |= 0b0100;
				break;
			case 109 /* m */:
				if (remaining & 0b0010) return false;
				remaining |= 0b0010;
				break;
			case 121 /* y */:
				if (remaining & 0b0001) return false;
				remaining |= 0b0001;
				break;
			default:
				return false;
		}

	return true;
};

module.exports = BasicEvaluatedExpression;
