/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	evaluateToString,
	expressionIsUnsupported,
	getModulePath,
	toConstantDependency
} = require("../JavascriptParserHelpers");
const WebpackError = require("../WebpackError");
const ProvidedDependency = require("./ProvidedDependency");
const systemBuildin = require.resolve("../../buildin/system");

class SystemPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		compiler.hooks.compilation.tap(
			"SystemPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(
					ProvidedDependency,
					normalModuleFactory
				);
				compilation.dependencyTemplates.set(
					ProvidedDependency,
					new ProvidedDependency.Template()
				);

				const handler = (parser, parserOptions) => {
					if (
						typeof parserOptions.system === "undefined" ||
						!parserOptions.system
					) {
						return;
					}

					const setNotSupported = name => {
						parser.hooks.evaluateTypeof
							.for(name)
							.tap("SystemPlugin", evaluateToString("undefined"));
						parser.hooks.expression
							.for(name)
							.tap(
								"SystemPlugin",
								expressionIsUnsupported(
									parser,
									name + " is not supported by webpack."
								)
							);
					};

					parser.hooks.typeof
						.for("System.import")
						.tap(
							"SystemPlugin",
							toConstantDependency(parser, JSON.stringify("function"))
						);
					parser.hooks.evaluateTypeof
						.for("System.import")
						.tap("SystemPlugin", evaluateToString("function"));
					parser.hooks.typeof
						.for("System")
						.tap(
							"SystemPlugin",
							toConstantDependency(parser, JSON.stringify("object"))
						);
					parser.hooks.evaluateTypeof
						.for("System")
						.tap("SystemPlugin", evaluateToString("object"));

					setNotSupported("System.set");
					setNotSupported("System.get");
					setNotSupported("System.register");

					parser.hooks.expression.for("System").tap("SystemPlugin", expr => {
						const dep = new ProvidedDependency(
							getModulePath(parser.state.module.context, systemBuildin),
							"System",
							null,
							expr.range
						);
						dep.loc = expr.loc;
						parser.state.module.addDependency(dep);
						return true;
					});

					parser.hooks.call.for("System.import").tap("SystemPlugin", expr => {
						parser.state.module.warnings.push(
							new SystemImportDeprecationWarning(parser.state.module, expr.loc)
						);

						return parser.hooks.importCall.call(expr);
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("SystemPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("SystemPlugin", handler);
			}
		);
	}
}

class SystemImportDeprecationWarning extends WebpackError {
	constructor(module, loc) {
		super(
			"System.import() is deprecated and will be removed soon. Use import() instead.\n" +
				"For more info visit https://webpack.js.org/guides/code-splitting/"
		);

		this.name = "SystemImportDeprecationWarning";

		this.module = module;
		this.loc = loc;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = SystemPlugin;
