"use strict";
/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
const path = require("path");
const ModuleParserHelpers = require("./ModuleParserHelpers");
const ConstDependency = require("./dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const UnsupportedFeatureWarning = require("./UnsupportedFeatureWarning");
const NullFactory = require("./NullFactory");
class NodeStuffPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(compiler) {
		const options = this.options;
		compiler.plugin("compilation", function(compilation, params) {
			compilation.dependencyFactories.set(ConstDependency, new NullFactory());
			compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());
			params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {
				if(parserOptions.node === false) {
					return;
				}
				let localOptions = options;
				if(parserOptions.node) {
					localOptions = Object.assign({}, localOptions, parserOptions.node);
				}
				function ignore() {
					return true;
				}

				function setConstant(expressionName, value) {
					parser.plugin(`expression ${expressionName}`, function() {
						this.state.current.addVariable(expressionName, JSON.stringify(value));
						return true;
					});
				}

				function setModuleConstant(expressionName, fn) {
					parser.plugin(`expression ${expressionName}`, function() {
						this.state.current.addVariable(expressionName, JSON.stringify(fn(this.state.module)));
						return true;
					});
				}

				const context = compiler.context;
				if(localOptions.__filename === "mock") {
					setConstant("__filename", "/index.js");
				} else if(localOptions.__filename) {
					setModuleConstant("__filename", module => path.relative(context, module.resource));
				}
				parser.plugin("evaluate Identifier __filename", function(expr) {
					if(!this.state.module) {
						return;
					}
					const res = new BasicEvaluatedExpression();
					const resource = this.state.module.resource;
					const i = resource.indexOf("?");
					res.setString(i < 0 ? resource : resource.substr(0, i));
					res.setRange(expr.range);
					return res;
				});
				if(localOptions.__dirname === "mock") {
					setConstant("__dirname", "/");
				} else if(localOptions.__dirname) {
					setModuleConstant("__dirname", module => path.relative(context, module.context));
				}
				parser.plugin("evaluate Identifier __dirname", function(expr) {
					if(!this.state.module) {
						return;
					}
					const res = new BasicEvaluatedExpression();
					res.setString(this.state.module.context);
					res.setRange(expr.range);
					return res;
				});
				parser.plugin("expression require.main", function(expr) {
					const dep = new ConstDependency("__webpack_require__.c[__webpack_require__.s]", expr.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return true;
				});
				parser.plugin("expression require.extensions", function(expr) {
					const dep = new ConstDependency("(void 0)", expr.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					if(!this.state.module) {
						return;
					}
					this.state.module.warnings.push(new UnsupportedFeatureWarning(this.state.module, "require.extensions is not supported by webpack. Use a loader instead."));
					return true;
				});
				parser.plugin("expression module.loaded", function(expr) {
					const dep = new ConstDependency("module.l", expr.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return true;
				});
				parser.plugin("expression module.id", function(expr) {
					const dep = new ConstDependency("module.i", expr.range);
					dep.loc = expr.loc;
					this.state.current.addDependency(dep);
					return true;
				});
				parser.plugin("expression module.exports", ignore);
				parser.plugin("evaluate Identifier module.hot", function(expr) {
					return new BasicEvaluatedExpression().setBoolean(false)
						.setRange(expr.range);
				});
				parser.plugin("expression module", function() {
					let moduleJsPath = path.join(__dirname, "..", "buildin", "module.js");
					if(this.state.module.context) {
						moduleJsPath = path.relative(this.state.module.context, moduleJsPath);
						if(!/^[A-Z]:/i.test(moduleJsPath)) {
							moduleJsPath = `./${moduleJsPath.replace(/\\/g, "/")}`;
						}
					}
					return ModuleParserHelpers.addParsedVariable(this, "module", `require(${JSON.stringify(moduleJsPath)})(module)`);
				});
			});
		});
	}
}
module.exports = NodeStuffPlugin;
