/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const path = require("path");
const ParserHelpers = require("./ParserHelpers");
const ConstDependency = require("./dependencies/ConstDependency");

const NullFactory = require("./NullFactory");

class NodeStuffPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", (compilation, params) => {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

			params.normalModuleFactory.plugin(["parser javascript/auto", "parser javascript/dynamic"], (parser, parserOptions) => {

				if(parserOptions.node === false)
					return;

				let localOptions = options;
				if(parserOptions.node)
					localOptions = Object.assign({}, localOptions, parserOptions.node);

				const setConstant = (expressionName, value) => {
					parser.plugin(`expression ${expressionName}`, () => {
						parser.state.current.addVariable(expressionName, JSON.stringify(value));
						return true;
					});
				};

				const setModuleConstant = (expressionName, fn) => {
					parser.plugin(`expression ${expressionName}`, () => {
						parser.state.current.addVariable(expressionName, JSON.stringify(fn(parser.state.module)));
						return true;
					});
				};
				const context = compiler.context;
				if(localOptions.__filename === "mock") {
					setConstant("__filename", "/index.js");
				} else if(localOptions.__filename) {
					setModuleConstant("__filename", module => path.relative(context, module.resource));
				}
				parser.plugin("evaluate Identifier __filename", expr => {
					if(!parser.state.module) return;
					const resource = parser.state.module.resource;
					const i = resource.indexOf("?");
					return ParserHelpers.evaluateToString(i < 0 ? resource : resource.substr(0, i))(expr);
				});
				if(localOptions.__dirname === "mock") {
					setConstant("__dirname", "/");
				} else if(localOptions.__dirname) {
					setModuleConstant("__dirname", module => path.relative(context, module.context));
				}
				parser.plugin("evaluate Identifier __dirname", expr => {
					if(!parser.state.module) return;
					return ParserHelpers.evaluateToString(parser.state.module.context)(expr);
				});
				parser.plugin("expression require.main", ParserHelpers.toConstantDependency("__webpack_require__.c[__webpack_require__.s]"));
				parser.plugin(
					"expression require.extensions",
					ParserHelpers.expressionIsUnsupported("require.extensions is not supported by webpack. Use a loader instead.")
				);
				parser.plugin("expression module.loaded", ParserHelpers.toConstantDependency("module.l"));
				parser.plugin("expression module.id", ParserHelpers.toConstantDependency("module.i"));
				parser.plugin("expression module.exports", () => {
					const module = parser.state.module;
					const isHarmony = module.meta && module.meta.harmonyModule;
					if(!isHarmony)
						return true;
				});
				parser.plugin("evaluate Identifier module.hot", ParserHelpers.evaluateToIdentifier("module.hot", false));
				parser.plugin("expression module", () => {
					const module = parser.state.module;
					const isHarmony = module.meta && module.meta.harmonyModule;
					let moduleJsPath = path.join(__dirname, "..", "buildin", isHarmony ? "harmony-module.js" : "module.js");
					if(module.context) {
						moduleJsPath = path.relative(parser.state.module.context, moduleJsPath);
						if(!/^[A-Z]:/i.test(moduleJsPath)) {
							moduleJsPath = `./${moduleJsPath.replace(/\\/g, "/")}`;
						}
					}
					return ParserHelpers.addParsedVariableToModule(parser, "module", `require(${JSON.stringify(moduleJsPath)})(module)`);
				});
			});
		});
	}
}
module.exports = NodeStuffPlugin;
