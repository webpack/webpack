/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("./Template");
const ConstDependency = require("./dependencies/ConstDependency");
const ParserHelpers = require("./ParserHelpers");
const NullFactory = require("./NullFactory");

const REPLACEMENTS = {
	__webpack_hash__: "__webpack_require__.h", // eslint-disable-line camelcase
	__webpack_chunkname__: "__webpack_require__.cn" // eslint-disable-line camelcase
};
const REPLACEMENT_TYPES = {
	__webpack_hash__: "string", // eslint-disable-line camelcase
	__webpack_chunkname__: "string" // eslint-disable-line camelcase
};

class ExtendedAPIPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("ExtendedAPIPlugin", (compilation, {
			normalModuleFactory
		}) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			const mainTemplate = compilation.mainTemplate;
			mainTemplate.plugin("require-extensions", (source, chunk, hash) => {
				const buf = [source];
				buf.push("");
				buf.push("// __webpack_hash__");
				buf.push(`${mainTemplate.requireFn}.h = ${JSON.stringify(hash)};`);
				buf.push("");
				buf.push("// __webpack_chunkname__");
				buf.push(`${mainTemplate.requireFn}.cn = ${JSON.stringify(chunk.name)};`);
				return Template.asString(buf);
			});
			mainTemplate.plugin("global-hash", () => true);

			normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic", "parser javascript/esm"], (parser, parserOptions) => {
				Object.keys(REPLACEMENTS).forEach(key => {
					parser.plugin(`expression ${key}`, ParserHelpers.toConstantDependency(REPLACEMENTS[key]));
					parser.plugin(`evaluate typeof ${key}`, ParserHelpers.evaluateToString(REPLACEMENT_TYPES[key]));
				});
			});
		});
	}
}

module.exports = ExtendedAPIPlugin;
