"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const NullDependency = require("./NullDependency");
class Template {
	apply(dep, source, outputOptions, requestShortener) {
		source.replace(dep.range[0], dep.range[1], require("./WebpackMissingModule").module(dep.request));
	}
}
class UnsupportedDependency extends NullDependency {
	constructor(request, range) {
		super();
		this.request = request;
		this.range = range;
	}
}
UnsupportedDependency.Template = Template;
module.exports = UnsupportedDependency;
