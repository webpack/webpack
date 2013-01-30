/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var Source = require("webpack-core/lib/Source");

function WrapSource(prefix, source, postfix) {
	Source.call(this);
	this.prefix = prefix;
	this._source = source;
	this.postfix = postfix;
}
module.exports = WrapSource;

WrapSource.prototype = Object.create(Source.prototype);

WrapSource.prototype._bake = function() {
	var prefix = this.prefix.source();
	var source = this._source.source();
	var postfix = this.postfix.source();
	return {
		source: prefix + source + postfix
	}
};