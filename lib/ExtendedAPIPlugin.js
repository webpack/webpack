/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
var ConstDependency = require("./dependencies/ConstDependency");
const ParserHelpers = require("./ParserHelpers");

var NullFactory = require("./NullFactory");

function ExtendedAPIPlugin() {}
module.exports = ExtendedAPIPlugin;

var REPLACEMENTS = {
	__webpack_hash__: "__webpack_require__.h" // eslint-disable-line camelcase
};
var REPLACEMENT_TYPES = {
	__webpack_hash__: "string" // eslint-disable-line camelcase
};
ExtendedAPIPlugin.prototype.apply = function(compiler) {
	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
		compilation.mainTemplate.plugin("require-extensions", function(source, chunk, hash) {
			var buf = [source];
			buf.push("");
			buf.push("// __webpack_hash__");
			buf.push(this.requireFn + ".h = " + JSON.stringify(hash) + ";");
			return this.asString(buf);
		});
		compilation.mainTemplate.plugin("global-hash", function() {
			return true;
		});

		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {
			Object.keys(REPLACEMENTS).forEach(function(key) {
				parser.plugin("expression " + key, ParserHelpers.toConstantDependency(REPLACEMENTS[key]));
				parser.plugin("evaluate typeof " + key, ParserHelpers.evaluateToString(REPLACEMENT_TYPES[key]));
			});
		});
	});
};
