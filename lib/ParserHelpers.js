/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const path = require("path");

const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const ConstDependency = require("./dependencies/ConstDependency");
const UnsupportedFeatureWarning = require("./UnsupportedFeatureWarning");

const CommonJsRequireContextDependency = require("./dependencies/CommonJsRequireContextDependency");
const RequireHeaderDependency = require("./dependencies/RequireHeaderDependency");
const LocalModuleDependency = require("./dependencies/LocalModuleDependency");
const LocalModulesHelpers = require("./dependencies/LocalModulesHelpers");
const CommonJsRequireDependency = require("./dependencies/CommonJsRequireDependency");
const ContextDependencyHelpers = require("./dependencies/ContextDependencyHelpers");

const RequireResolveHeaderDependency = require("./dependencies/RequireResolveHeaderDependency");
const RequireResolveDependency = require("./dependencies/RequireResolveDependency");
const RequireResolveContextDependency = require("./dependencies/RequireResolveContextDependency");

const AMDRequireItemDependency = require("./dependencies/AMDRequireItemDependency");

const HarmonyCompatibilityDependency = require("./dependencies/HarmonyCompatibilityDependency");

const HarmonyImportDependency = require("./dependencies/HarmonyImportDependency");
const HarmonyModulesHelpers = require("./dependencies/HarmonyModulesHelpers");
const HarmonyImportSpecifierDependency = require("./dependencies/HarmonyImportSpecifierDependency");
const HarmonyAcceptImportDependency = require("./dependencies/HarmonyAcceptImportDependency");
const HarmonyAcceptDependency = require("./dependencies/HarmonyAcceptDependency");

const HarmonyExportHeaderDependency = require("./dependencies/HarmonyExportHeaderDependency");
const HarmonyExportExpressionDependency = require("./dependencies/HarmonyExportExpressionDependency");
const HarmonyExportSpecifierDependency = require("./dependencies/HarmonyExportSpecifierDependency");
const HarmonyExportImportedSpecifierDependency = require("./dependencies/HarmonyExportImportedSpecifierDependency");

const RequireIncludeDependency = require("./dependencies/RequireIncludeDependency");

const RequireEnsureDependenciesBlock = require("./dependencies/RequireEnsureDependenciesBlock");
const RequireEnsureItemDependency = require("./dependencies/RequireEnsureItemDependency");
const getFunctionExpression = require("./dependencies/getFunctionExpression");

const RequireContextDependency = require("./dependencies/RequireContextDependency");

const ImportEagerContextDependency = require("./dependencies/ImportEagerContextDependency");
const ImportWeakDependency = require("./dependencies/ImportWeakDependency");
const ImportWeakContextDependency = require("./dependencies/ImportWeakContextDependency");
const ImportLazyOnceContextDependency = require("./dependencies/ImportLazyOnceContextDependency");
const ImportLazyContextDependency = require("./dependencies/ImportLazyContextDependency");
const ImportDependenciesBlock = require("./dependencies/ImportDependenciesBlock");
const ImportEagerDependency = require("./dependencies/ImportEagerDependency");

const ParserHelpers = exports;

ParserHelpers.addParsedVariableToModule = function(parser, name, expression) {
	if(!parser.state.current.addVariable) return false;
	var deps = [];
	parser.parse(expression, {
		current: {
			addDependency: function(dep) {
				dep.userRequest = name;
				deps.push(dep);
			}
		},
		module: parser.state.module
	});
	parser.state.current.addVariable(name, expression, deps);
	return true;
};

ParserHelpers.requireFileAsExpression = function(context, pathToModule) {
	var moduleJsPath = path.relative(context, pathToModule);
	if(!/^[A-Z]:/i.test(moduleJsPath)) {
		moduleJsPath = "./" + moduleJsPath.replace(/\\/g, "/");
	}
	return "require(" + JSON.stringify(moduleJsPath) + ")";
};

ParserHelpers.toConstantDependency = function constDependency(expr, opts, parser) {
	var dep = new ConstDependency(opts.code, expr.range);
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.evaluateToString = function(expr, opts) {
	return new BasicEvaluatedExpression().setString(opts.value).setRange(expr.range);
};

ParserHelpers.evaluateToBoolean = function(value) {
	return function booleanExpression(expr) {
		return new BasicEvaluatedExpression().setBoolean(value).setRange(expr.range);
	};
};

ParserHelpers.evaluateToIdentifier = function evaluateToIdentifier(expr, opts, parser) {
	let evex = new BasicEvaluatedExpression().setIdentifier(opts.identifier).setRange(expr.range);
	if(opts.truthy === true) evex = evex.setTruthy();
	else if(opts.truthy === false) evex = evex.setFalsy();
	return evex;
};

ParserHelpers.expressionIsUnsupported = function expressionIsUnsupported(expr, opts, parser) {
	var dep = new ConstDependency("(void 0)", expr.range);
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	if(!parser.state.module) return;
	parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, opts.message));
	return true;
};

ParserHelpers.skipTraversal = function skipTraversal() {
	return true;
};

ParserHelpers.approve = function approve() {
	return true;
};

ParserHelpers.DefinePropertiesEvaluateIdentifier = function DefinePropertiesEvaluateIdentifier(expr, opts, parser) {
	/**
	 * this is needed in case there is a recursion in the DefinePlugin
	 * to prevent an endless recursion
	 * e.g.: new DefinePlugin({
	 * "a": "b",
	 * "b": "a"
	 * });
	 */
  var recurse = opts.recurse;
	if(recurse) return;
	recurse = true;
	const res = parser.evaluate(opts.code);
	recurse = false;
	res.setRange(expr.range);
	return res;
};

ParserHelpers.DefinePluginEvaluateTypeof = function DefinePluginEvaluateTypeof(expr, opts, parser) {
	/**
	// 	 * this is needed in case there is a recursion in the DefinePlugin
	// 	 * to prevent an endless recursion
	// 	 * e.g.: new DefinePlugin({
	// 	 * "typeof a": "tyepof b",
	// 	 * "typeof b": "typeof a"
	// 	 * });
	// 	 */
	var recurseTypeof = opts.recurseTypeof;
	if(recurseTypeof) return;
	recurseTypeof = true;
	const res = parser.evaluate(opts.typeofCode);
	recurseTypeof = false;
	res.setRange(expr.range);
	return res;
};

ParserHelpers.DefinePluginTypeof = function DefinePluginTypeof(expr, opts, parser) {
	const res = parser.evaluate(opts.typeofCode);
	if(!res.isString()) return;
	return ParserHelpers.toConstantDependency(expr, { code: JSON.stringify(res.string) }, parser);
};

ParserHelpers.CommonJSPluginAssignRequire = function CommonJSPluginAssignRequire(expr, opts, parser) {
	// to not leak to global "require", we need to define a local require here.
	const dep = new ConstDependency("var require;", 0);
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	parser.scope.definitions.push("require");
	return true;
};

ParserHelpers.CommonJSPluginRenameRequire = function CommonJSPluginRenameRequire(expr, opts, parser) {
	// define the require variable. It's still undefined, but not "not defined".
	const dep = new ConstDependency("var require;", 0);
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	return false;
};

ParserHelpers.CommonJSPluginExpressionRequire = function CommonJSPluginExpressionRequire(expr, opts, parser) {
	const dep = new CommonJsRequireContextDependency(opts.unknownContextRequest, opts.unknownContextRecursive, opts.unknownContextRegExp, expr.range);
	dep.critical = opts.unknownContextCritical && "require function is used in a way in which dependencies cannot be statically extracted";
	dep.loc = expr.loc;
	dep.optional = !!parser.scope.inTry;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.CommonJSPluginCallRequire = function CommonJSPluginCallRequire(expr, opts, parser) {
	if(expr.arguments.length !== 1) return;
	let localModule;
	const param = parser.evaluateExpression(expr.arguments[0]);
	if(param.isConditional()) {
		let isExpression = false;
		const prevLength = parser.state.current.dependencies.length;
		const dep = new RequireHeaderDependency(expr.callee.range);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
		param.options.forEach(function(param) {
			const result = parser.applyPluginsBailResult("call require:commonjs:item", expr, param);
			if(result === undefined) {
				isExpression = true;
			}
		});
		if(isExpression) {
			parser.state.current.dependencies.length = prevLength;
		} else {
			return true;
		}
	}
	if(param.isString() && (localModule = LocalModulesHelpers.getLocalModule(parser.state, param.string))) {
		const dep = new LocalModuleDependency(localModule, expr.range);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
		return true;
	} else {
		const result = parser.applyPluginsBailResult("call require:commonjs:item", expr, param);
		if(result === undefined) {
			parser.applyPluginsBailResult("call require:commonjs:context", expr, param);
		} else {
			const dep = new RequireHeaderDependency(expr.callee.range);
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
		}
		return true;
	}
};

ParserHelpers.CommonJSPluginRequireCommonJSItem = function(expr, param, opts, parser) {
	if(param.isString()) {
		const dep = new CommonJsRequireDependency(param.string, param.range);
		dep.loc = expr.loc;
		dep.optional = !!parser.scope.inTry;
		parser.state.current.addDependency(dep);
		return true;
	}
};

ParserHelpers.CommonJSPluginRequireCommonJSContext = function CommonJSPluginRequireCommonJSContext(expr, param, opts, parser) {
	const dep = ContextDependencyHelpers.create(CommonJsRequireContextDependency, expr.range, param, expr, opts);
	if(!dep) return;
	dep.loc = expr.loc;
	dep.optional = !!parser.scope.inTry;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.RequireResolveResolve = function RrequireResolveResolve(expr, opts, parser) {
	return parser.applyPluginsBailResult("call require.resolve(Weak)", expr, false);
};

ParserHelpers.RequireResolveResolveWeak = function RequireResolveResolveWeak(expr, opts, parser) {
	return parser.applyPluginsBailResult("call require.resolve(Weak)", expr, true);
};

ParserHelpers.RequireResolveResolveWeak2 = function RequireResolveResolveWeak2(expr, weak, opts, parser) {
	if(expr.arguments.length !== 1) return;
	const param = parser.evaluateExpression(expr.arguments[0]);
	if(param.isConditional()) {
		param.options.forEach((option) => {
			const result = parser.applyPluginsBailResult("call require.resolve(Weak):item", expr, option, weak);
			if(result === undefined) {
				parser.applyPluginsBailResult("call require.resolve(Weak):context", expr, option, weak);
			}
		});
		const dep = new RequireResolveHeaderDependency(expr.callee.range);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
		return true;
	} else {
		const result = parser.applyPluginsBailResult("call require.resolve(Weak):item", expr, param, weak);
		if(result === undefined) {
			parser.applyPluginsBailResult("call require.resolve(Weak):context", expr, param, weak);
		}
		const dep = new RequireResolveHeaderDependency(expr.callee.range);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
		return true;
	}
};

ParserHelpers.RequireResolveWeakItem = function RequireResolveWeakItem(expr, param, weak, opts, parser) {
	if(param.isString()) {
		const dep = new RequireResolveDependency(param.string, param.range);
		dep.loc = expr.loc;
		dep.optional = !!parser.scope.inTry;
		dep.weak = weak;
		parser.state.current.addDependency(dep);
		return true;
	}
};

ParserHelpers.RequireResolveWeakContext = function RequireResolveWeakContext(expr, param, weak, opts, parser) {
	const dep = ContextDependencyHelpers.create(RequireResolveContextDependency, param.range, param, expr, opts);
	if(!dep) return;
	dep.loc = expr.loc;
	dep.optional = !!parser.scope.inTry;
	dep.async = weak ? "weak" : false;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.NodeStuffAddVariable = function NodeStuffAddVariable(expr, opts, parser) {
	parser.state.current.addVariable(opts.expressionName, opts.value);
	return true;
};

ParserHelpers.NodeStuffEvaluateIdentifierFilename = function NodeStuffEvaluateIdentifierFilename(expr, opts, parser) {
	if(!parser.state.module) return;
	const resource = parser.state.module.resource;
	const i = resource.indexOf("?");
	return ParserHelpers.evaluateToString(i < 0 ? resource : resource.substr(0, i))(expr);
};

ParserHelpers.NodeStuffEvaluateIdentifierDirname = function NodeStuffEvaluateIdentifierDirname(expr, opts, parser) {
	if(!parser.state.module) return;
	return ParserHelpers.evaluateToString(expr, { value: parser.state.module.context });
};

ParserHelpers.NodeStuffModuleExports = function NodeStuffModuleExports(expr, opts, parser) {
	const module = parser.state.module;
	const isHarmony = module.meta && module.meta.harmonyModule;
	if(!isHarmony)
		return true;
};

ParserHelpers.NodeStuffExpressionModule = function NodeStuffExpressionModule(expr, opts, parser) {
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
};

ParserHelpers.SystemPluginExpressionSystem = function SystemPluginExpressionSystem(expr, opts, parser) {
	const systemPolyfillRequire = ParserHelpers.requireFileAsExpression(
		parser.state.module.context, require.resolve("../buildin/system.js"));
	return ParserHelpers.addParsedVariableToModule(parser, "System", systemPolyfillRequire);
};

ParserHelpers.AMDPluginAddVariable = function AMDPluginAddVariable(expr, opts, parser) {
	return parser.state.current.addVariable("__webpack_amd_options__", JSON.stringify(opts.amdOptions));
};

ParserHelpers.AMDPluginRenameDefine = function AMDPluginRenameDefine(expr, opts, parser) {
	const dep = new AMDRequireItemDependency("!!webpack amd define", expr.range);
	dep.userRequest = "define";
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	return false;
};

ParserHelpers.NodeSourceAddExpression = function NodeSourceAddExpression(expr, opts, parser) {
	if(parser.state.module && parser.state.module.resource === opts.pathToModule) return;
	const mockModule = ParserHelpers.requireFileAsExpression(parser.state.module.context, opts.pathToModule);
	return ParserHelpers.addParsedVariableToModule(parser, opts.name, mockModule + opts.suffix);
};

ParserHelpers.NodeSourceExpressionGlobal = function NodeSourceExpressionGlobal(expr, opts, parser) {
	const retrieveGlobalModule = ParserHelpers.requireFileAsExpression(
		parser.state.module.context,
		require.resolve("../buildin/global.js")
	);
	return ParserHelpers.addParsedVariableToModule(parser, "global", retrieveGlobalModule);
};

ParserHelpers.CompatibilityCallRequire = function CompatibilityCallRequire(expr, opts, parser) {
	// support for browserify style require delegator: "require(o, !0)"
	if(expr.arguments.length !== 2) return;
	const second = parser.evaluateExpression(expr.arguments[1]);
	if(!second.isBoolean()) return;
	if(second.asBool() !== true) return;
	const dep = new ConstDependency("require", expr.callee.range);
	dep.loc = expr.loc;
	if(parser.state.current.dependencies.length > 1) {
		const last = parser.state.current.dependencies[parser.state.current.dependencies.length - 1];
		if(last.critical && last.request === "." && last.userRequest === "." && last.recursive)
			parser.state.current.dependencies.pop();
	}
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.skipInHarmony = function(expr, opts, parser) {
	const module = parser.state.module;
	if(module && module.meta && module.meta.harmonyModule)
		return true;
};

ParserHelpers.nullInHarmony = function(expr, opts, parser) {
	const module = parser.state.module;
	if(module && module.meta && module.meta.harmonyModule)
		return null;
};

ParserHelpers.HarmonyDetectionProgram = function HarmonyDetectionProgram(ast, comments, opts, parser) {
	var isHarmony = ast.body.some(statement => {
		return /^(Import|Export).*Declaration$/.test(statement.type);
	});
	if(isHarmony) {
		const module = parser.state.module;
		const dep = new HarmonyCompatibilityDependency(module);
		dep.loc = {
			start: {
				line: -1,
				column: 0
			},
			end: {
				line: -1,
				column: 0
			},
			index: -2
		};
		module.addDependency(dep);
		module.meta.harmonyModule = true;
		module.strict = true;
		module.exportsArgument = "__webpack_exports__";
	}
};

ParserHelpers.HarmonyImportDependencyImport = function HarmonyImportDependencyImport(statement, source, opts, parser) {
	const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(parser.state, source), statement.range);
	dep.loc = statement.loc;
	parser.state.current.addDependency(dep);
	parser.state.lastHarmonyImport = dep;
	return true;
};

ParserHelpers.HarmonyImportDependencyImportSpecifier = function HarmonyImportDependencyImportSpecifier(statement, source, id, name, opts, parser) {
	parser.scope.definitions.length--;
	parser.scope.renames[`$${name}`] = "imported var";
	if(!parser.state.harmonySpecifier) parser.state.harmonySpecifier = {};
	parser.state.harmonySpecifier[`$${name}`] = [parser.state.lastHarmonyImport, HarmonyModulesHelpers.getModuleVar(parser.state, source), id];
	return true;
};

ParserHelpers.HarmonyImportDependencyExpressionImportedVar = function HarmonyImportDependencyExpressionImportedVar(expr, opts, parser) {
	const name = expr.name;
	const settings = parser.state.harmonySpecifier[`$${name}`];
	const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range, parser.strictExportPresence);
	dep.shorthand = parser.scope.inShorthand;
	dep.directImport = true;
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.HarmonyImportDependencyExpressionImportedVarStar = function HarmonyImportDependencyExpressionImportedVarStar(expr, opts, parser) {
	const name = expr.object.name;
	const settings = parser.state.harmonySpecifier[`$${name}`];
	if(settings[2] !== null)
		return false;
	const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], expr.property.name || expr.property.value, name, expr.range, parser.strictExportPresence);
	dep.shorthand = parser.scope.inShorthand;
	dep.directImport = false;
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.HarmonyImportDependencyCallImportedVarStar = function HarmonyImportDependencyCallImportedVarStar(expr, opts, parser) {
	if(expr.callee.type !== "MemberExpression") return;
	if(expr.callee.object.type !== "Identifier") return;
	const name = expr.callee.object.name;
	const settings = parser.state.harmonySpecifier[`$${name}`];
	if(settings[2] !== null)
		return false;
	const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], expr.callee.property.name || expr.callee.property.value, name, expr.callee.range, parser.strictExportPresence);
	dep.shorthand = parser.scope.inShorthand;
	dep.directImport = false;
	dep.namespaceObjectAsContext = true;
	dep.loc = expr.callee.loc;
	parser.state.current.addDependency(dep);
	if(expr.arguments)
		parser.walkExpressions(expr.arguments);
	return true;
};

ParserHelpers.HarmonyImportCallImportedVar = function HarmonyImportCallImportedVar(expr, opts, parser) {
	const args = expr.arguments;
	const fullExpr = expr;
	expr = expr.callee;
	if(expr.type !== "Identifier") return;
	const name = expr.name;
	const settings = parser.state.harmonySpecifier[`$${name}`];
	const dep = new HarmonyImportSpecifierDependency(settings[0], settings[1], settings[2], name, expr.range, parser.strictExportPresence);
	dep.directImport = true;
	dep.callArgs = args;
	dep.call = fullExpr;
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	if(args)
		parser.walkExpressions(args);
	return true;
};

ParserHelpers.HarmonyImportHotAcceptCallback = function HarmonyImportHotAcceptCallback(expr, requests, opts, parser) {
	const dependencies = requests
		.filter(request => HarmonyModulesHelpers.checkModuleVar(parser.state, request))
		.map(request => {
			const dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(parser.state, request), expr.range);
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
			return dep;
		});
	if(dependencies.length > 0) {
		const dep = new HarmonyAcceptDependency(expr.range, dependencies, true);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
	}
};

ParserHelpers.HarmonyImportHotAcceptWithoutCallback = function HarmonyImportHotAcceptWithoutCallback(expr, requests, opts, parser) {
	const dependencies = requests
		.filter(request => HarmonyModulesHelpers.checkModuleVar(parser.state, request))
		.map(request => {
			const dep = new HarmonyAcceptImportDependency(request, HarmonyModulesHelpers.getModuleVar(parser.state, request), expr.range);
			dep.loc = expr.loc;
			parser.state.current.addDependency(dep);
			return dep;
		});
	if(dependencies.length > 0) {
		const dep = new HarmonyAcceptDependency(expr.range, dependencies, false);
		dep.loc = expr.loc;
		parser.state.current.addDependency(dep);
	}
};

ParserHelpers.HarmonyExportExport = function HarmonyExportExport(statement, opts, parser) {
	const dep = new HarmonyExportHeaderDependency(statement.declaration && statement.declaration.range, statement.range);
	dep.loc = Object.create(statement.loc);
	dep.loc.index = -1;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.HarmonyExportImport = function HarmonyExportImport(statement, source, opts, parser) {
	const dep = new HarmonyImportDependency(source, HarmonyModulesHelpers.getNewModuleVar(parser.state, source), statement.range);
	dep.loc = Object.create(statement.loc);
	dep.loc.index = -1;
	parser.state.current.addDependency(dep);
	parser.state.lastHarmonyImport = dep;
	return true;
};

ParserHelpers.HarmonyExportExportExpression = function HarmonyExportExportExpression(statement, expr, opts, parser) {
	const dep = new HarmonyExportExpressionDependency(parser.state.module, expr.range, statement.range);
	dep.loc = Object.create(statement.loc);
	dep.loc.index = -1;
	parser.state.current.addDependency(dep);
	return true;
};

function isImmutableStatement(statement) {
	if(statement.type === "FunctionDeclaration") return true;
	if(statement.type === "ClassDeclaration") return true;
	if(statement.type === "VariableDeclaration" && statement.kind === "const") return true;
	return false;
}

function isHoistedStatement(statement) {
	if(statement.type === "FunctionDeclaration") return true;
	return false;
}

ParserHelpers.HarmonyExportExportSpecifier = function HarmonyExportExportSpecifier(statement, id, name, idx, opts, parser) {
	const rename = parser.scope.renames[`$${id}`];
	let dep;
	const harmonyNamedExports = parser.state.harmonyNamedExports = parser.state.harmonyNamedExports || new Set();
	harmonyNamedExports.add(name);
	if(rename === "imported var") {
		const settings = parser.state.harmonySpecifier[`$${id}`];
		dep = new HarmonyExportImportedSpecifierDependency(parser.state.module, settings[0], settings[1], settings[2], name, harmonyNamedExports, null);
	} else {
		const immutable = statement.declaration && isImmutableStatement(statement.declaration);
		const hoisted = statement.declaration && isHoistedStatement(statement.declaration);
		dep = new HarmonyExportSpecifierDependency(parser.state.module, id, name, !immutable || hoisted ? -2 : (statement.range[1] + 0.5), immutable);
	}
	dep.loc = Object.create(statement.loc);
	dep.loc.index = idx;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.HarmonyExportExportImportSpecifier = function HarmonyExportExportImportSpecifier(statement, source, id, name, idx, opts, parser) {
	const harmonyNamedExports = parser.state.harmonyNamedExports = parser.state.harmonyNamedExports || new Set();
	let harmonyStarExports = null;
	if(name) {
		harmonyNamedExports.add(name);
	} else {
		harmonyStarExports = parser.state.harmonyStarExports = parser.state.harmonyStarExports || [];
	}
	const dep = new HarmonyExportImportedSpecifierDependency(parser.state.module, parser.state.lastHarmonyImport, HarmonyModulesHelpers.getModuleVar(parser.state, source), id, name, harmonyNamedExports, harmonyStarExports && harmonyStarExports.slice());
	if(harmonyStarExports) {
		harmonyStarExports.push(dep);
	}
	dep.loc = Object.create(statement.loc);
	dep.loc.index = idx;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.noop = function noop(expr, opts, parser) {
	return undefined;
};

ParserHelpers.ConstStatementIf = function ConstStatementIf(statement, opts, parser) {
	const param = parser.evaluateExpression(statement.test);
	const bool = param.asBool();
	if(typeof bool === "boolean") {
		if(statement.test.type !== "Literal") {
			const dep = new ConstDependency(`${bool}`, param.range);
			dep.loc = statement.loc;
			parser.state.current.addDependency(dep);
		}
		return bool;
	}
};

ParserHelpers.ConstExpressionTernary = function ConstExpressionTernary(expression, opts, parser) {
	const param = parser.evaluateExpression(expression.test);
	const bool = param.asBool();
	if(typeof bool === "boolean") {
		if(expression.test.type !== "Literal") {
			const dep = new ConstDependency(` ${bool}`, param.range);
			dep.loc = expression.loc;
			parser.state.current.addDependency(dep);
		}
		return bool;
	}
};

const getQuery = (request) => {
	const i = request.indexOf("?");
	return request.indexOf("?") < 0 ? "" : request.substr(i);
};

ParserHelpers.ConstEvaluateIdentifierResourceQuery = function ConstEvaluateIdentifierResourceQuery(expr, opts, parser) {
	if(!parser.state.module) return;
	return ParserHelpers.evaluateToString(getQuery(parser.state.module.resource))(expr);
};

ParserHelpers.ConstExpressionResourceQuery = function ConstExpressionResourceQuery(expr, opts, parser) {
	if(!parser.state.module) return;
	parser.state.current.addVariable("__resourceQuery", JSON.stringify(getQuery(parser.state.module.resource)));
	return true;
};

ParserHelpers.RequireIncludeDependencyCallRequireInclude = function RequireIncludeDependencyCallRequireInclude(expr, opts, parser) {
	if(expr.arguments.length !== 1) return;
	const param = parser.evaluateExpression(expr.arguments[0]);
	if(!param.isString()) return;
	const dep = new RequireIncludeDependency(param.string, expr.range);
	dep.loc = expr.loc;
	parser.state.current.addDependency(dep);
	return true;
};

ParserHelpers.UseStrictProgram = function UseStrictProgram(ast, comments, opts, parser) {
	const firstNode = ast.body[0];
	if(firstNode &&
		firstNode.type === "ExpressionStatement" &&
		firstNode.expression.type === "Literal" &&
		firstNode.expression.value === "use strict") {
		// Remove "use strict" expression. It will be added later by the renderer again.
		// This is necessary in order to not break the strict mode when webpack prepends code.
		// @see https://github.com/webpack/webpack/issues/1970
		const dep = new ConstDependency("", firstNode.range);
		dep.loc = firstNode.loc;
		parser.state.current.addDependency(dep);
		parser.state.module.strict = true;
	}
};

ParserHelpers.RequireEnsureDependenciesBlockParser = function RequireEnsureDependenciesBlockParser(expr, opts, parser) {
	let chunkName = null;
	let chunkNameRange = null;
	let errorExpressionArg = null;
	let errorExpression = null;
	switch(expr.arguments.length) {
		case 4:
			{
				const chunkNameExpr = parser.evaluateExpression(expr.arguments[3]);
				if(!chunkNameExpr.isString()) return;
				chunkNameRange = chunkNameExpr.range;
				chunkName = chunkNameExpr.string;
			}
			// falls through
		case 3:
			{
				errorExpressionArg = expr.arguments[2];
				errorExpression = getFunctionExpression(errorExpressionArg);

				if(!errorExpression && !chunkName) {
					const chunkNameExpr = parser.evaluateExpression(expr.arguments[2]);
					if(!chunkNameExpr.isString()) return;
					chunkNameRange = chunkNameExpr.range;
					chunkName = chunkNameExpr.string;
				}
			}
			// falls through
		case 2:
			{
				const dependenciesExpr = parser.evaluateExpression(expr.arguments[0]);
				const dependenciesItems = dependenciesExpr.isArray() ? dependenciesExpr.items : [dependenciesExpr];
				const successExpressionArg = expr.arguments[1];
				const successExpression = getFunctionExpression(successExpressionArg);

				if(successExpression) {
					parser.walkExpressions(successExpression.expressions);
				}
				if(errorExpression) {
					parser.walkExpressions(errorExpression.expressions);
				}

				const dep = new RequireEnsureDependenciesBlock(expr,
					successExpression ? successExpression.fn : successExpressionArg,
					errorExpression ? errorExpression.fn : errorExpressionArg,
					chunkName, chunkNameRange, parser.state.module, expr.loc);
				const old = parser.state.current;
				parser.state.current = dep;
				try {
					let failed = false;
					parser.inScope([], () => {
						dependenciesItems.forEach(ee => {
							if(ee.isString()) {
								const edep = new RequireEnsureItemDependency(ee.string, ee.range);
								edep.loc = dep.loc;
								dep.addDependency(edep);
							} else {
								failed = true;
							}
						});
					});
					if(failed) {
						return;
					}
					if(successExpression) {
						if(successExpression.fn.body.type === "BlockStatement")
							parser.walkStatement(successExpression.fn.body);
						else
							parser.walkExpression(successExpression.fn.body);
					}
					old.addBlock(dep);
				} finally {
					parser.state.current = old;
				}
				if(!successExpression) {
					parser.walkExpression(successExpressionArg);
				}
				if(errorExpression) {
					if(errorExpression.fn.body.type === "BlockStatement")
						parser.walkStatement(errorExpression.fn.body);
					else
						parser.walkExpression(errorExpression.fn.body);
				} else if(errorExpressionArg) {
					parser.walkExpression(errorExpressionArg);
				}
				return true;
			}
	}
};

ParserHelpers.RequireContextDependencyParser = function RequireContextDependencyParser(expr, opts, parser) {
	let regExp = /^\.\/.*$/;
	let recursive = true;
	let asyncMode;
	switch(expr.arguments.length) {
		case 4:
			{
				const asyncModeExpr = parser.evaluateExpression(expr.arguments[3]);
				if(!asyncModeExpr.isString()) return;
				asyncMode = asyncModeExpr.string;
			}
			// falls through
		case 3:
			{
				const regExpExpr = parser.evaluateExpression(expr.arguments[2]);
				if(!regExpExpr.isRegExp()) return;
				regExp = regExpExpr.regExp;
			}
			// falls through
		case 2:
			{
				const recursiveExpr = parser.evaluateExpression(expr.arguments[1]);
				if(!recursiveExpr.isBoolean()) return;
				recursive = recursiveExpr.bool;
			}
			// falls through
		case 1:
			{
				const requestExpr = parser.evaluateExpression(expr.arguments[0]);
				if(!requestExpr.isString()) return;
				const dep = new RequireContextDependency(requestExpr.string, recursive, regExp, asyncMode, expr.range);
				dep.loc = expr.loc;
				dep.optional = parser.scope.inTry;
				parser.state.current.addDependency(dep);
				return true;
			}
	}
};

ParserHelpers.ImportParser = function ImportParser(expr, opts, parser) {
	if(expr.arguments.length !== 1)
		throw new Error("Incorrect number of arguments provided to 'import(module: string) -> Promise'.");

	const param = parser.evaluateExpression(expr.arguments[0]);

	let chunkName = null;
	let mode = "lazy";

	const importOptions = parser.getCommentOptions(expr.range);
	if(importOptions) {
		if(typeof importOptions.webpackChunkName !== "undefined") {
			if(typeof importOptions.webpackChunkName !== "string")
				parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, `\`webpackChunkName\` expected a string, but received: ${importOptions.webpackChunkName}.`));
			else
				chunkName = importOptions.webpackChunkName;
		}
		if(typeof importOptions.webpackMode !== "undefined") {
			if(typeof importOptions.webpackMode !== "string")
				parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, `\`webpackMode\` expected a string, but received: ${importOptions.webpackMode}.`));
			else
				mode = importOptions.webpackMode;
		}
	}

	if(param.isString()) {
		if(mode !== "lazy" && mode !== "eager" && mode !== "weak") {
			parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, `\`webpackMode\` expected 'lazy', 'eager' or 'weak', but received: ${mode}.`));
		}

		if(mode === "eager") {
			const dep = new ImportEagerDependency(param.string, expr.range);
			parser.state.current.addDependency(dep);
		} else if(mode === "weak") {
			const dep = new ImportWeakDependency(param.string, expr.range);
			parser.state.current.addDependency(dep);
		} else {
			const depBlock = new ImportDependenciesBlock(param.string, expr.range, chunkName, parser.state.module, expr.loc);
			parser.state.current.addBlock(depBlock);
		}
		return true;
	} else {
		if(mode !== "lazy" && mode !== "lazy-once" && mode !== "eager" && mode !== "weak") {
			parser.state.module.warnings.push(new UnsupportedFeatureWarning(parser.state.module, `\`webpackMode\` expected 'lazy', 'lazy-once', 'eager' or 'weak', but received: ${mode}.`));
		}

		let Dep = ImportLazyContextDependency;
		if(mode === "eager") {
			Dep = ImportEagerContextDependency;
		} else if(mode === "weak") {
			Dep = ImportWeakContextDependency;
		} else if(mode === "lazy-once") {
			Dep = ImportLazyOnceContextDependency;
		}
		const dep = ContextDependencyHelpers.create(Dep, expr.range, param, expr, opts, chunkName);
		if(!dep) return;
		dep.loc = expr.loc;
		dep.optional = !!parser.scope.inTry;
		parser.state.current.addDependency(dep);
		return true;
	}
};
