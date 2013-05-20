/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
function Template(outputOptions) {
	this.outputOptions = outputOptions || {};
}
module.exports = Template;

Template.REGEXP_HASH = /\[hash\]/gi;
Template.REGEXP_CHUNKHASH = /\[chunkhash\]/gi;
Template.REGEXP_NAME = /\[name\]/gi;
Template.REGEXP_ID = /\[id\]/gi;
Template.REGEXP_FILE = /\[file\]/gi;
Template.REGEXP_FILEBASE = /\[filebase\]/gi;

Template.prototype.indent = function indent(str) {
	if(Array.isArray(str)) {
		return str.map(indent).join("\n");
	} else {
		return "\t" + str.trimRight().replace(/\n/g, "\n\t");
	}
};

Template.prototype.prefix = function(str, prefix) {
	if(Array.isArray(str)) {
		str = str.join("\n");
	}
	return prefix + str.trim().replace(/\n/g, "\n" + prefix);
};

Template.prototype.asString = function(str) {
	if(Array.isArray(str)) {
		return str.join("\n");
	}
	return str;
};
