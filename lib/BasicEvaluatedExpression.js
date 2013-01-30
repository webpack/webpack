/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function BasicEvaluatedExpression() {
	this.range = null;
}
module.exports = BasicEvaluatedExpression;

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
BasicEvaluatedExpression.prototype.isWrapped = function() {
	return Object.prototype.hasOwnProperty.call(this, "prefix");
};
BasicEvaluatedExpression.prototype.setString = function(str) {
	if(str === null)
		delete this.string;
	else
		this.string = str;
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



