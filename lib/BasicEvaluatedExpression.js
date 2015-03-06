/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function BasicEvaluatedExpression() {
	this.range = null;
}
module.exports = BasicEvaluatedExpression;

BasicEvaluatedExpression.prototype.isNull = function() {
	return !!this.null;
};
BasicEvaluatedExpression.prototype.isString = function() {
	return Object.prototype.hasOwnProperty.call(this, "string");
};
BasicEvaluatedExpression.prototype.isNumber = function() {
	return Object.prototype.hasOwnProperty.call(this, "number");
};
BasicEvaluatedExpression.prototype.isBoolean = function() {
	return Object.prototype.hasOwnProperty.call(this, "bool");
};
BasicEvaluatedExpression.prototype.isRegExp = function() {
	return Object.prototype.hasOwnProperty.call(this, "regExp");
};
BasicEvaluatedExpression.prototype.isConditional = function() {
	return Object.prototype.hasOwnProperty.call(this, "options");
};
BasicEvaluatedExpression.prototype.isArray = function() {
	return Object.prototype.hasOwnProperty.call(this, "items");
};
BasicEvaluatedExpression.prototype.isConstArray = function() {
	return Object.prototype.hasOwnProperty.call(this, "array");
};
BasicEvaluatedExpression.prototype.isIdentifier = function() {
	return Object.prototype.hasOwnProperty.call(this, "identifier");
};
BasicEvaluatedExpression.prototype.isWrapped = function() {
	return Object.prototype.hasOwnProperty.call(this, "prefix") || Object.prototype.hasOwnProperty.call(this, "postfix");
};
BasicEvaluatedExpression.prototype.asBool = function() {
	if(this.isBoolean()) return this.bool;
	else if(this.isNull()) return false;
	else if(this.isString()) return !!this.string;
	else if(this.isNumber()) return !!this.number;
	else if(this.isRegExp()) return true;
	else if(this.isArray()) return true;
	else if(this.isConstArray()) return true;
	else if(this.isWrapped()) return this.prefix && this.prefix.asBool() || this.postfix && this.postfix.asBool() ? true : undefined;
	return undefined;
};
BasicEvaluatedExpression.prototype.set = function(value) {
	if(typeof value === "string") return this.setString(value);
	if(typeof value === "number") return this.setNumber(value);
	if(typeof value === "boolean") return this.setBoolean(value);
	if(value === null) return this.setNull();
	if(value instanceof RegExp) return this.setRegExp(value);
	if(Array.isArray(value)) return this.setArray(value);
	return this;
};
BasicEvaluatedExpression.prototype.setString = function(str) {
	if(str === null)
		delete this.string;
	else
		this.string = str;
	return this;
};
BasicEvaluatedExpression.prototype.setNull = function(str) {
	this.null = true;
	return this;
};
BasicEvaluatedExpression.prototype.setNumber = function(num) {
	if(num === null)
		delete this.number;
	else
		this.number = num;
	return this;
};
BasicEvaluatedExpression.prototype.setBoolean = function(bool) {
	if(bool === null)
		delete this.bool;
	else
		this.bool = bool;
	return this;
};
BasicEvaluatedExpression.prototype.setRegExp = function(regExp) {
	if(regExp === null)
		delete this.regExp;
	else
		this.regExp = regExp;
	return this;
};
BasicEvaluatedExpression.prototype.setIdentifier = function(identifier) {
	if(identifier === null)
		delete this.identifier;
	else
		this.identifier = identifier;
	return this;
};
BasicEvaluatedExpression.prototype.setWrapped = function(prefix, postfix) {
	this.prefix = prefix;
	this.postfix = postfix;
	return this;
};
BasicEvaluatedExpression.prototype.unsetWrapped = function() {
	delete this.prefix;
	delete this.postfix;
	return this;
};
BasicEvaluatedExpression.prototype.setOptions = function(options) {
	if(options === null)
		delete this.options;
	else
		this.options = options;
	return this;
};
BasicEvaluatedExpression.prototype.setItems = function(items) {
	if(items === null)
		delete this.items;
	else
		this.items = items;
	return this;
};
BasicEvaluatedExpression.prototype.setArray = function(array) {
	if(array === null)
		delete this.array;
	else
		this.array = array;
	return this;
};
BasicEvaluatedExpression.prototype.addOptions = function(options) {
	if(!this.options) this.options = [];
	options.forEach(function(item) {
		this.options.push(item);
	}, this);
	return this;
};
BasicEvaluatedExpression.prototype.setRange = function(range) {
	this.range = range;
	return this;
};



