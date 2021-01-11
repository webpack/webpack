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

		compiler.hooks.compilation.tap(
			"ProvidePlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(ConstDependency, new NullFactory());
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					Object.keys(definitions).forEach(name => {
						var request = [].concat(definitions[name]);
						var splittedName = name.split(".");

						approveCanRename(parser, splittedName);

						parser.hooks.expression.for(name).tap("ProvidePlugin", expr => {
							const scopedName = valueFactory.scopedName(name);
							const nameIdentifier = valueFactory.nameIdentifier(
								name,
								scopedName
							);
							const expression = valueFactory.expression(request);

							if (
								!ParserHelpers.addParsedVariableToModule(
									parser,
									nameIdentifier,
									expression
								)
							) {
								return false;
							}

							if (scopedName) {
								ParserHelpers.toConstantDependency(
									parser,
									nameIdentifier
								)(expr);
							}

							return true;
						});
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("ProvidePlugin", handler);

				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("ProvidePlugin", handler);

				// Disable ProvidePlugin for javascript/esm, see https://github.com/webpack/webpack/issues/7032
			}
		);
	}
}

const approveCanRename = (parser, names) => {
	if (names.length > 0) {
		names.slice(1).forEach((_, i) => {
			const targetName = names.slice(0, i + 1).join(".");

			parser.hooks.canRename
				.for(targetName)
				.tap("ProvidePlugin", ParserHelpers.approve);
		});
	}
};

const valueFactory = {
	scopedName: name => {
		return name.includes(".");
	},
	nameIdentifier: (name, scopedName) => {
		var value = name;

		if (scopedName) {
			value = `__webpack_provided_${name.replace(/\./g, "_dot_")}`;
		}

		return value;
	},
	expression: request => {
		const buildRequireStatement = modules =>
			modules.map(module => `require(${JSON.stringify(module)})`).join(", ");

		let requireStatement = (() => {
			if (request[0] instanceof Array) {
				return buildRequireStatement(request[0]);
			} else {
				return buildRequireStatement([request[0]]);
			}
		})();

		if (request.length > 1) {
			let propertyAccessor = request
				.slice(1)
				.map(property => `[${JSON.stringify(property)}]`)
				.join("");

			return requireStatement.concat(propertyAccessor);
		} else {
			return requireStatement;
		}
	}
};

module.exports = ProvidePlugin;
