/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Florent Cailhol @ooflorent
*/
"use strict";

const WebpackError = require("./WebpackError");

class WarnAmbiguousSourceTypePlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"WarnAmbiguousSourceTypePlugin",
			(compilation, { normalModuleFactory }) => {
				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("WarnAmbiguousSourceTypePlugin", parser => {
						function flagAsDynamic() {
							const module = parser.state.module;
							if (!module.buildInfo) module.buildInfo = {};
							module.buildInfo.dynamic = true;
						}
						parser.hooks.call
							.for("define")
							.tap("WarnAmbiguousSourceTypePlugin", flagAsDynamic);
						parser.hooks.call
							.for("require")
							.tap("WarnAmbiguousSourceTypePlugin", flagAsDynamic);
						parser.hooks.call
							.for("require.resolve")
							.tap("WarnAmbiguousSourceTypePlugin", flagAsDynamic);
						parser.hooks.expression
							.for("module")
							.tap("WarnAmbiguousSourceTypePlugin", flagAsDynamic);
						parser.hooks.expression
							.for("exports")
							.tap("WarnAmbiguousSourceTypePlugin", flagAsDynamic);
					});
				compilation.hooks.finishModules.tap(
					"WarnAmbiguousSourceTypePlugin",
					modules => {
						for (const module of modules) {
							if (module.type === "javascript/auto") {
								if (
									module.buildMeta &&
									module.buildMeta.exportsType &&
									module.buildInfo &&
									module.buildInfo.dynamic
								) {
									compilation.warnings.push(
										new AmbiguousSourceTypeWarning(module)
									);
								}
							}
						}
					}
				);
			}
		);
	}
}

class AmbiguousSourceTypeWarning extends WebpackError {
	constructor(module) {
		super();

		this.name = "AmbiguousSourceTypeWarning";
		this.message = "Source type is ambiguous";
		this.origin = this.module = module;

		Error.captureStackTrace(this, this.constructor);
	}
}

module.exports = WarnAmbiguousSourceTypePlugin;
