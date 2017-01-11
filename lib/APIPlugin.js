/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const ParserHelpers = require("./ParserHelpers");

const NullFactory = require("./NullFactory");

const REPLACEMENTS = {
	__webpack_require__: "__webpack_require__", // eslint-disable-line camelcase
	__webpack_public_path__: "__webpack_require__.p", // eslint-disable-line camelcase
	__webpack_modules__: "__webpack_require__.m", // eslint-disable-line camelcase
	__webpack_chunk_load__: "__webpack_require__.e", // eslint-disable-line camelcase
	__non_webpack_require__: "require", // eslint-disable-line camelcase
	__webpack_nonce__: "__webpack_require__.nc", // eslint-disable-line camelcase
	"require.onError": "__webpack_require__.oe" // eslint-disable-line camelcase
};
const REPLACEMENT_TYPES = {
	__webpack_public_path__: "string", // eslint-disable-line camelcase
	__webpack_require__: "function", // eslint-disable-line camelcase
	__webpack_modules__: "object", // eslint-disable-line camelcase
	__webpack_chunk_load__: "function", // eslint-disable-line camelcase
	__webpack_nonce__: "string" // eslint-disable-line camelcase
};

const IGNORES = [];

class APIPlugin {

	apply(compiler) {
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin("parser", parser => {
				Object.keys(REPLACEMENTS).forEach(key => {
					parser.plugin(`expression ${key}`, ParserHelpers.toConstantDependency(REPLACEMENTS[key]));
					parser.plugin(`evaluate typeof ${key}`, ParserHelpers.evaluateToString(REPLACEMENT_TYPES[key]));
				});
				IGNORES.forEach(key => {
					parser.plugin(key, ParserHelpers.skipTraversal);
				});
			});
		});
	}
}

module.exports = APIPlugin;
