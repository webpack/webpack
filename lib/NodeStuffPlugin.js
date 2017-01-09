/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var path = require("path");
var ParserHelpers = require("./ParserHelpers");
var ConstDependency = require("./dependencies/ConstDependency");

var NullFactory = require("./NullFactory");

function NodeStuffPlugin(options) {
	this.options = options;
}
module.exports = NodeStuffPlugin;
NodeStuffPlugin.prototype.apply = function(compiler) {
	var options = this.options;
	compiler.plugin("compilation", function(compilation, params) {
		compilation.dependencyFactories.set(ConstDependency, new NullFactory());
		compilation.dependencyTemplates.set(ConstDependency, new ConstDependency.Template());

		params.normalModuleFactory.plugin("parser", function(parser, parserOptions) {

			if(parserOptions.node === false)
				return;

			var localOptions = options;
			if(parserOptions.node)
				localOptions = Object.assign({}, localOptions, parserOptions.node);

			function setConstant(expressionName, value) {
				parser.plugin("expression " + expressionName, function() {
					this.state.current.addVariable(expressionName, JSON.stringify(value));
					return true;
				});
			}

			function setModuleConstant(expressionName, fn) {
				parser.plugin("expression " + expressionName, function() {
					this.state.current.addVariable(expressionName, JSON.stringify(fn(this.state.module)));
					return true;
				});
			}
			var context = compiler.context;
			if(localOptions.__filename === "mock") {
				setConstant("__filename", "/index.js");
			} else if(localOptions.__filename) {
				setModuleConstant("__filename", function(module) {
					return path.relative(context, module.resource);
				});
			}
			parser.plugin("evaluate Identifier __filename", function(expr) {
				if(!this.state.module) return;
				var resource = this.state.module.resource;
				var i = resource.indexOf("?");
				return ParserHelpers.evaluateToString(i < 0 ? resource : resource.substr(0, i))(expr);
			});
			if(localOptions.__dirname === "mock") {
				setConstant("__dirname", "/");
			} else if(localOptions.__dirname) {
				setModuleConstant("__dirname", function(module) {
					return path.relative(context, module.context);
				});
			}
			parser.plugin("evaluate Identifier __dirname", function(expr) {
				if(!this.state.module) return;
				return ParserHelpers.evaluateToString(this.state.module.context)(expr);
			});
			parser.plugin("expression require.main", ParserHelpers.toConstantDependency("__webpack_require__.c[__webpack_require__.s]"));
			parser.plugin(
				"expression require.extensions",
				ParserHelpers.expressionIsUnsupported("require.extensions is not supported by webpack. Use a loader instead.")
			);
			parser.plugin("expression module.loaded", ParserHelpers.toConstantDependency("module.l"));
			parser.plugin("expression module.id", ParserHelpers.toConstantDependency("module.i"));
			parser.plugin("expression module.exports", function() {
				var module = this.state.module;
				var isHarmony = module.meta && module.meta.harmonyModule;
				if(!isHarmony)
					return true;
			});
			parser.plugin("evaluate Identifier module.hot", ParserHelpers.evaluateToBoolean(false));
			parser.plugin("expression module", function() {
				var module = this.state.module;
				var isHarmony = module.meta && module.meta.harmonyModule;
				var moduleJsPath = path.join(__dirname, "..", "buildin", isHarmony ? "harmony-module.js" : "module.js");
				if(module.context) {
					moduleJsPath = path.relative(this.state.module.context, moduleJsPath);
					if(!/^[A-Z]:/i.test(moduleJsPath)) {
						moduleJsPath = "./" + moduleJsPath.replace(/\\/g, "/");
					}
				}
				return ParserHelpers.addParsedVariableToModule(this, "module", "require(" + JSON.stringify(moduleJsPath) + ")(module)");
			});
		});
	});
};
