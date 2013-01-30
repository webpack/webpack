/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Source = require("webpack-core/lib/Source");

function ReplaceSource(source) {
	Source.call(this);
	this._source = source;
	this.replacements = [];
}
module.exports = ReplaceSource;

ReplaceSource.prototype = Object.create(Source.prototype);

ReplaceSource.prototype.replace = function(start, end, newValue) {
	this.replacements.push([start, end, newValue]);
};

ReplaceSource.prototype.insert = function(pos, newValue) {
	this.replacements.push([pos, pos-1, newValue]);
};

ReplaceSource.prototype._bake = function() {
	this.replacements.sort(function(a, b) {
		return b[0] - a[0];
	});
	var result = [this._source.source()];
	this.replacements.forEach(function(repl) {
		var remSource = result.pop();
		result.push(
			remSource.substr(repl[1]+1),
			repl[2],
			remSource.substr(0, repl[0])
		);
	});
	result = result.reverse().join("");
	return {
		source: result
	}
};