/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ConstDependency = require("./dependencies/ConstDependency");
const ParserHelpers = require("./ParserHelpers");

const NullFactory = require("./NullFactory");

/* eslint-disable camelcase */
const REPLACEMENTS = {
	__webpack_require__: "__webpack_require__",
	__webpack_public_path__: "__webpack_require__.p",
	__webpack_modules__: "__webpack_require__.m",
	__webpack_chunk_load__: "__webpack_require__.e",
	__non_webpack_require__: "require",
	__webpack_nonce__: "__webpack_require__.nc",
	"require.onError": "__webpack_require__.oe"
};
const NO_WEBPACK_REQUIRE = {
	__non_webpack_require__: true
};
const REPLACEMENT_TYPES = {
	__webpack_public_path__: "string",
	__webpack_require__: "function",
	__webpack_modules__: "object",
	__webpack_chunk_load__: "function",
	__webpack_nonce__: "string"
};
/* eslint-enable camelcase */

class APIPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("APIPlugin", (compilation, {
			normalModuleFactory
		}) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic", "parser javascript/esm"], parser => {
				Object.keys(REPLACEMENTS).forEach(key => {
					parser.plugin(`expression ${key}`, NO_WEBPACK_REQUIRE[key] ? ParserHelpers.toConstantDependency(REPLACEMENTS[key]) : ParserHelpers.toConstantDependencyWithWebpackRequire(REPLACEMENTS[key]));
					parser.plugin(`evaluate typeof ${key}`, ParserHelpers.evaluateToString(REPLACEMENT_TYPES[key]));
				});
			});
		});
	}
}

module.exports = APIPlugin;
