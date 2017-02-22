/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ParserHelpers = require("./ParserHelpers");
const ConstDependency = require("./dependencies/ConstDependency");

const NullFactory = require("./NullFactory");

class ProvidePlugin {
	constructor(definitions) {
		this.definitions = definitions;
	}

	apply(compiler) {
		const definitions = this.definitions;
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
			params.normalModuleFactory.plugin("parser", (parser, parserOptions) => {
				Object.keys(definitions).forEach(name => {
					var request = [].concat(definitions[name]);
					var splittedName = name.split(".");
					if(splittedName.length > 0) {
						splittedName.slice(1).forEach((_, i) => {
							const name = splittedName.slice(0, i + 1).join(".");
							parser.plugin(`can-rename ${name}`, ParserHelpers.approve);
						});
					}
					parser.plugin(`expression ${name}`, function(expr) {
						let nameIdentifier = name;
						const scopedName = name.indexOf(".") >= 0;
						let expression = `require(${JSON.stringify(request[0])})`;
						if(scopedName) {
							nameIdentifier = `__webpack_provided_${name.replace(/\./g, "_dot_")}`;
						}
						if(request.length > 1) {
							expression += request.slice(1).map(r => `[${JSON.stringify(r)}]`).join("");
						}
						if(!ParserHelpers.addParsedVariableToModule(this, nameIdentifier, expression)) {
							return false;
						}
						if(scopedName) {
							ParserHelpers.toConstantDependency(nameIdentifier).bind(this)(expr);
						}
						return true;
					});
				});
			});
		});
	}
}
module.exports = ProvidePlugin;
