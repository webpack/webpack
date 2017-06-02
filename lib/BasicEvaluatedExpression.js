/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

class BasicEvaluatedExpression {

	constructor() {
		this.range = null;
	}

	isNull() {
		return !!this.null;
	}

	isString() {
		return Object.prototype.hasOwnProperty.call(this, "string");
	}

	isNumber() {
		return Object.prototype.hasOwnProperty.call(this, "number");
	}

	isBoolean() {
		return Object.prototype.hasOwnProperty.call(this, "bool");
	}

	isRegExp() {
		return Object.prototype.hasOwnProperty.call(this, "regExp");
	}

	isConditional() {
		return Object.prototype.hasOwnProperty.call(this, "options");
	}

	isArray() {
		return Object.prototype.hasOwnProperty.call(this, "items");
	}

	isConstArray() {
		return Object.prototype.hasOwnProperty.call(this, "array");
	}

	isIdentifier() {
		return Object.prototype.hasOwnProperty.call(this, "identifier");
	}

	isWrapped() {
		return Object.prototype.hasOwnProperty.call(this, "prefix") || Object.prototype.hasOwnProperty.call(this, "postfix");
	}

	isTemplateString() {
		return Object.prototype.hasOwnProperty.call(this, "quasis");
	}

	asBool() {
		if(this.truthy) return true;
		else if(this.falsy) return false;
		else if(this.isBoolean()) return this.bool;
		else if(this.isNull()) return false;
		else if(this.isString()) return !!this.string;
		else if(this.isNumber()) return !!this.number;
		else if(this.isRegExp()) return true;
		else if(this.isArray()) return true;
		else if(this.isConstArray()) return true;
		else if(this.isWrapped()) return this.prefix && this.prefix.asBool() || this.postfix && this.postfix.asBool() ? true : undefined;
		else if(this.isTemplateString()) {
			if(this.quasis.length === 1) return this.quasis[0].asBool();
			for(let i = 0; i < this.quasis.length; i++) {
				if(this.quasis[i].asBool()) return true;
			}
			// can't tell if string will be empty without executing
		}
		return undefined;
	}

	setString(str) {
		if(str === null)
			delete this.string;
		else
			this.string = str;
		return this;
	}

	setNull() {
		this.null = true;
		return this;
	}

	setNumber(num) {
		if(num === null)
			delete this.number;
		else
			this.number = num;
		return this;
	}

	setBoolean(bool) {
		if(bool === null)
			delete this.bool;
		else
			this.bool = bool;
		return this;
	}

	setRegExp(regExp) {
		if(regExp === null)
			delete this.regExp;
		else
			this.regExp = regExp;
		return this;
	}

	setIdentifier(identifier) {
		if(identifier === null)
			delete this.identifier;
		else
			this.identifier = identifier;
		return this;
	}

	setWrapped(prefix, postfix) {
		this.prefix = prefix;
		this.postfix = postfix;
		return this;
	}

	unsetWrapped() {
		delete this.prefix;
		delete this.postfix;
		return this;
	}

	setOptions(options) {
		if(options === null)
			delete this.options;
		else
			this.options = options;
		return this;
	}

	setItems(items) {
		if(items === null)
			delete this.items;
		else
			this.items = items;
		return this;
	}

	setArray(array) {
		if(array === null)
			delete this.array;
		else
			this.array = array;
		return this;
	}

	setTemplateString(quasis) {
		if(quasis === null)
			delete this.quasis;
		else
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

	addOptions(options) {
		if(!this.options) this.options = [];
		options.forEach(item => {
			this.options.push(item);
		}, this);
		return this;
	}

	setRange(range) {
		this.range = range;
		return this;
	}

}

module.exports = BasicEvaluatedExpression;
