/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const TypeUnknown = 0;
const TypeNull = 1;
const TypeString = 2;
const TypeNumber = 3;
const TypeBoolean = 4;
const TypeRegExp = 5;
const TypeConditional = 6;
const TypeArray = 7;
const TypeConstArray = 8;
const TypeIdentifier = 9;
const TypeWrapped = 10;
const TypeTemplateString = 11;

class BasicEvaluatedExpression {
	constructor() {
		this.type = TypeUnknown;
		this.range = null;
		this.falsy = false;
		this.truthy = false;
		this.bool = null;
		this.number = null;
		this.regExp = null;
		this.string = null;
		this.quasis = null;
		this.array = null;
		this.items = null;
		this.options = null;
		this.prefix = null;
		this.postfix = null;
	}

	isNull() {
		return this.type === TypeNull;
	}

	isString() {
		return this.type === TypeString;
	}

	isNumber() {
		return this.type === TypeNumber;
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

	isTruthy() {
		return this.truthy;
	}

	isFalsy() {
		return this.falsy;
	}

	asBool() {
		if (this.truthy) return true;
		else if (this.falsy) return false;
		else if (this.isBoolean()) return this.bool;
		else if (this.isNull()) return false;
		else if (this.isString()) return this.string !== "";
		else if (this.isNumber()) return this.number !== 0;
		else if (this.isRegExp()) return true;
		else if (this.isArray()) return true;
		else if (this.isConstArray()) return true;
		else if (this.isWrapped())
			return (this.prefix && this.prefix.asBool()) ||
				(this.postfix && this.postfix.asBool())
				? true
				: undefined;
		else if (this.isTemplateString()) {
			for (const quasi of this.quasis) {
				if (quasi.asBool()) return true;
			}
			// can't tell if string will be empty without executing
		}
		return undefined;
	}

	setString(string) {
		this.type = TypeString;
		this.string = string;
		return this;
	}

	setNull() {
		this.type = TypeNull;
		return this;
	}

	setNumber(number) {
		this.type = TypeNumber;
		this.number = number;
		return this;
	}

	setBoolean(bool) {
		this.type = TypeBoolean;
		this.bool = bool;
		return this;
	}

	setRegExp(regExp) {
		this.type = TypeRegExp;
		this.regExp = regExp;
		return this;
	}

	setIdentifier(identifier) {
		this.type = TypeIdentifier;
		this.identifier = identifier;
		return this;
	}

	setWrapped(prefix, postfix) {
		this.type = TypeWrapped;
		this.prefix = prefix;
		this.postfix = postfix;
		return this;
	}

	setOptions(options) {
		this.type = TypeConditional;
		this.options = options;
		return this;
	}

	addOptions(options) {
		if (!this.options) {
			this.type = TypeConditional;
			this.options = [];
		}
		for (const item of options) this.options.push(item);
		return this;
	}

	setItems(items) {
		this.type = TypeArray;
		this.items = items;
		return this;
	}

	setArray(array) {
		this.type = TypeConstArray;
		this.array = array;
		return this;
	}

	setTemplateString(quasis) {
		this.type = TypeTemplateString;
		this.quasis = quasis;
		return this;
	}

	setTruthy() {
		this.falsy = false;
		this.truthy = true;
		return this;
	}

	setFalsy() {
		this.falsy = true;
		this.truthy = false;
		return this;
	}

	setRange(range) {
		this.range = range;
		return this;
	}
}

module.exports = BasicEvaluatedExpression;
