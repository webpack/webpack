/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const NullFactory = require("./NullFactory");
const NullDependency = require("./dependencies/NullDependency");

class DevSupportPlugin {
	constructor() {
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("DevSupportPlugin", (compilation, {
			normalModuleFactory
		}) => {
			compilation.dependencyFactories.set(DevSupportDependency, new NullFactory());
			compilation.dependencyTemplates.set(DevSupportDependency, new DevSupportDependency.Template());

			const handler = (parser, parserOptions) => {
				if(typeof parserOptions.devSupport !== "undefined" && !parserOptions.devSupport)
					return;

				parser.hooks.program.tap("DevSupportPlugin", () => {
					const module = parser.state.module;
					const dep = new DevSupportDependency(parser.state, module.buildInfo.strict);
					module.buildInfo.strict = false;
					module.addDependency(dep);
				});
			};
			normalModuleFactory.hooks.parser.for("javascript/auto").tap("DevSupportPlugin", handler);
			normalModuleFactory.hooks.parser.for("javascript/esm").tap("DevSupportPlugin", handler);
		});
	}
}

class DevSupportDependency extends NullDependency {
	constructor(parserState, strict) {
		super();
		this.parserState = parserState;
		this.strict = strict;
	}

	get type() {
		return "dev support";
	}
}

DevSupportDependency.Template = class DevSupportDependencyTemplate {
	apply(dep, source, runtime, dependencyTemplates) {
		source.insert(-1, `/* ${JSON.stringify(dep.parserState.harmonySpecifier && Array.from(dep.parserState.harmonySpecifier))} */`);
		source.insert(-1, "(function() {");
		if(dep.strict) source.insert(-1, "\"use strict\";");
		source.insert(Infinity, "}());");
	}
};

module.exports = DevSupportPlugin;
