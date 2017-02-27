/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const ParserHelpers = require("./ParserHelpers");
const NullFactory = require("./NullFactory");

const REPLACEMENTS = {
	__webpack_hash__: "__webpack_require__.h" // eslint-disable-line camelcase
};
const REPLACEMENT_TYPES = {
	__webpack_hash__: "string" // eslint-disable-line camelcase
};

class ExtendedAPIPlugin {
	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
			compilation.mainTemplate.plugin("require-extensions", function(source, chunk, hash) {
				const buf = [source];
				buf.push("");
				buf.push("// __webpack_hash__");
				buf.push(`${this.requireFn}.h = ${JSON.stringify(hash)};`);
				return this.asString(buf);
			});
			compilation.mainTemplate.plugin("global-hash", () => true);

			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {
				Object.keys(REPLACEMENTS).forEach(key => {
					parser.plugin(`expression ${key}`, ParserHelpers.toConstantDependency(REPLACEMENTS[key]));
					parser.plugin(`evaluate typeof ${key}`, ParserHelpers.evaluateToString(REPLACEMENT_TYPES[key]));
				});
			});
		});
	}
}

module.exports = ExtendedAPIPlugin;
