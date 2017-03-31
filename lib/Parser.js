/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API

const acorn = require("acorn-dynamic-import").default;
const traverser = require("acorn/dist/walk");
const Tapable = require("tapable");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const StaticEvaluator = require("./static-analysis/StaticEvaluator");

function joinRanges(startRange, endRange) {
	if(!endRange) return startRange;
	if(!startRange) return endRange;
	return [startRange[0], endRange[1]];
}

const PARSE_OPTIONS_MODULE = {
	ranges: true,
	locations: true,
	ecmaVersion: 2017,
	sourceType: "module",
	plugins: {
		dynamicImport: true
	}
};

const PARSE_OPTIONS_SCRIPT = {
	ranges: true,
	locations: true,
	ecmaVersion: 2017,
	sourceType: "script",
	plugins: {
		dynamicImport: true
	}
};

function Parser(options) {
	Tapable.call(this);
	this.options = options;
	this.initializeEvaluating();
}
module.exports = Parser;

Parser.prototype = Object.create(Tapable.prototype);
Parser.prototype.constructor = Parser;

Parser.prototype.initializeEvaluating = function() {
	const boundStaticEvaluator = (expr) => StaticEvaluator.evaluate(expr, this);
	this.plugin("evaluate Literal", boundStaticEvaluator);
	this.plugin("evaluate LogicalExpression", boundStaticEvaluator);
	this.plugin("evaluate BinaryExpression", boundStaticEvaluator);
	this.plugin("evaluate UnaryExpression", boundStaticEvaluator);
	this.plugin("evaluate CallExpression", boundStaticEvaluator);
	this.plugin("evaluate TemplateLiteral", boundStaticEvaluator);
	this.plugin("evaluate TaggedTemplateExpression", boundStaticEvaluator);
	this.plugin("evaluate ConditionalExpression", boundStaticEvaluator);
	this.plugin("evaluate ArrayExpression", boundStaticEvaluator);
	this.plugin("evaluate Identifier", boundStaticEvaluator);
	this.plugin("evaluate MemberExpression", boundStaticEvaluator);
};

Parser.prototype.nameInCurrentScope = function(name) {
	return this.scope.renames["$" + name] || name;
};

Parser.prototype.getRenameIdentifier = function(expr) {
	var result = this.evaluateExpression(expr);
	if(!result) return;
	if(result.isIdentifier()) return result.identifier;
	return;
};

Parser.prototype.traverseNodeInCurrentScope = function(node) {
	const traversalState = {
		parser: this
	};
	traverser.recursive(node, traversalState, DefaultWebpackVisitor);
};

Parser.prototype.traverseNodesInCurrentScope = function(nodes) {
	if(!nodes) {
		return;
	}
	for(var i = 0; i < nodes.length; i += 1) {
		this.traverseNodeInCurrentScope(nodes[i]);
	}
};

Parser.prototype.traversePatternForIdentifiers = function(ASTNode, callback) {
	if(!ASTNode) {
		return;
	}
	traverser.recursive(ASTNode, {}, {
		Identifier: callback,
		VariablePattern: callback,
		AssignmentPattern: (param, state, commence) => {
			commence(param.left, state);
			traverser.recursive(param.right, {
				parser: this
			}, DefaultWebpackVisitor);
		}
	});
};

// retrieve all possible parameter names
Parser.prototype.getParameterName = function(params) {
	const parameterNames = new Set();
	for(var i = 0; i < params.length; i++) {
		var param = params[i];
		// e.g. destructuring fn([a,b,c], d), fn({a,b,c}, d) etc...
		if(typeof param !== "string") {
			this.traversePatternForIdentifiers(param, (param) => parameterNames.add(param.name));
		} else {
			parameterNames.add(param);
		}
	}
	return parameterNames;
};

/*
 * Travers AST with its own scope.
 * Inherits the current scope as available "parent" scope
 * but does not modifiy it
 */
Parser.prototype.inScope = function(params, fn) {
	const oldScope = this.scope;

	const paramNames = this.getParameterName(params);
	const paramNamesArray = Array.from(paramNames);
	const newRenames = Object.create(this.scope.renames);
	// reset all found params as "renameable"
	paramNamesArray.forEach(param => newRenames["$" + param] = undefined);
	// add all params to definitions
	const definitions = oldScope.definitions.concat(paramNamesArray);

	this.scope = {
		inTry: false,
		inShorthand: false,
		definitions: definitions,
		renames: newRenames
	};

	// execute function with "this.scope" as its scope
	fn();
	// reset scope again
	this.scope = oldScope;
};

Parser.prototype.evaluateExpression = function(expression) {
	try {
		var result = this.applyPluginsBailResult1("evaluate " + expression.type, expression);
		if(result !== undefined)
			return result;
	} catch(e) {
		// ignore error
		console.warn(e);
	}
	return new BasicEvaluatedExpression().setRange(expression.range);
};

Parser.prototype.parseWithAcorn = function(source, parserOptions) {
	return acorn.parse(source, parserOptions);
};

Parser.prototype.parseAsModuleOrScript = function(source) {
	try {
		const moduleComments = [];
		const moduleAstOptions = Object.assign({}, PARSE_OPTIONS_MODULE, {
			onComment: moduleComments
		});
		const moduleAst = this.parseWithAcorn(source, moduleAstOptions);
		return {
			ast: moduleAst,
			comments: moduleComments,
		};

	} catch(moduleParseError) {
		try {
			const scriptComments = [];
			const scriptAstOptions = Object.assign({}, PARSE_OPTIONS_SCRIPT, {
				onComment: scriptComments
			});
			const scriptAst = this.parseWithAcorn(source, scriptAstOptions);
			return {
				ast: scriptAst,
				comments: scriptComments,
			};
		} catch(scriptParseError) {
			/**
			 * Script check is a "fallback".
			 * If script fails as well rethrow module parse error.
			 */
			throw moduleParseError;
		}

	}
};

Parser.prototype.hoistImportsAndExports = function(ast) {
	const state = {
		parser: this
	};
	traverser.recursive(ast, state, {
		Import: (expr) => {}, // keep this as a stub as the acorn walker does not know this type
		ImportDeclaration: (statement, state) => {
			const source = statement.source.value;
			state.parser.applyPluginsBailResult("import", statement, source);
			statement.specifiers.forEach((specifier) => {
				const name = specifier.local.name;
				state.parser.scope.renames["$" + name] = undefined;
				state.parser.scope.definitions.push(name);
				switch(specifier.type) {
					case "ImportDefaultSpecifier":
						state.parser.applyPluginsBailResult("import specifier", statement, source, "default", name);
						break;
					case "ImportSpecifier":
						state.parser.applyPluginsBailResult("import specifier", statement, source, specifier.imported.name, name);
						break;
					case "ImportNamespaceSpecifier":
						state.parser.applyPluginsBailResult("import specifier", statement, source, null, name);
						break;
				}
			});
		},
		ExportAllDeclaration: (statement, state) => {
			const source = statement.source.value;
			state.parser.applyPluginsBailResult("export import", statement, source);
			state.parser.applyPluginsBailResult("export import specifier", statement, source, null, null, 0);
		}
	});
};

Parser.prototype.parse = function(source, initialState) {
	/**
	 * try to parse source as a module.
	 * If that fails try to parse it as a raw "script"
	 */
	const parseResult = this.parseAsModuleOrScript(source);
	const ast = parseResult.ast;
	const comments = parseResult.comments;

	// bail if we encounter an unexpected AST
	if(!ast || typeof ast !== "object") {
		throw new Error("Source couldn't be parsed");
	}

	const oldScope = this.scope;
	const oldState = this.state;
	this.scope = {
		inTry: false,
		definitions: [],
		renames: {}
	};
	const state = this.state = initialState || {};
	if(this.applyPluginsBailResult("program", ast, comments) === undefined) {
		this.hoistImportsAndExports(ast);
		const traversalState = {
			parser: this
		};
		traverser.recursive(ast, traversalState, DefaultWebpackVisitor);
	}
	this.scope = oldScope;
	this.state = oldState;
	return state;
};

Parser.prototype.evaluate = function(source) {
	const ast = this.parseWithAcorn("(" + source + ")", PARSE_OPTIONS_MODULE);

	// bail if there are issues
	if(!ast || typeof ast !== "object" || ast.type !== "Program") {
		throw new Error("evaluate: Source couldn't be parsed");
	}

	if(ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement") {
		throw new Error("evaluate: Source is not a expression");
	}

	// evaluate parsed source
	return this.evaluateExpression(ast.body[0].expression);
};

const DefaultWebpackVisitor = {

	// // block continuation
	// ExportAllDeclaration() {},
	// ImportDeclaration() {},

	Statement(statement, state, commence) {
		if(state.parser.applyPluginsBailResult1("statement", statement) !== undefined) return;
		commence(statement, state);
	},

	IfStatement(statement, state, commence) {
		var result = state.parser.applyPluginsBailResult1("statement if", statement);
		if(result === undefined) {
			commence(statement.test, state);
			commence(statement.consequent, state);
			if(statement.alternate)
				commence(statement.alternate, state);
		} else {
			if(result)
				commence(statement.consequent, state);
			else if(statement.alternate)
				commence(statement.alternate, state);
		}
	},

	LabeledStatement(statement, state, commence) {
		var result = state.parser.applyPluginsBailResult1("label " + statement.label.name, statement);
		if(result !== true)
			commence(statement.body, state);
	},

	TryStatement(statement, state, commence) {
		if(state.parser.scope.inTry) {
			commence(statement.block, state);
		} else {
			state.parser.scope.inTry = true;
			commence(statement.block, state);
			state.parser.scope.inTry = false;
		}
		if(statement.handler)
			commence(statement.handler, state);
		if(statement.finalizer)
			commence(statement.finalizer, state);
	},

	CatchClause(catchClause, state, commence) {
		if(catchClause.guard)
			commence(catchClause.guard, state);

		state.parser.inScope([catchClause.param], function() {
			commence(catchClause.body, state);
		});
	},

	FunctionDeclaration(statement, state, commence) {
		state.parser.scope.renames["$" + statement.id.name] = undefined;
		state.parser.scope.definitions.push(statement.id.name);
		state.parser.inScope(statement.params, function() {
			commence(statement.body, state);
		});
	},

	ExportDefaultDeclaration(statement, state, commence) {
		state.parser.applyPluginsBailResult1("export", statement);
		if(/Declaration$/.test(statement.declaration.type)) {
			if(!state.parser.applyPluginsBailResult("export declaration", statement, statement.declaration)) {
				var pos = state.parser.scope.definitions.length;
				commence(statement.declaration, state);
				var newDefs = state.parser.scope.definitions.slice(pos);
				for(var index = 0, len = newDefs.length; index < len; index++) {
					var def = newDefs[index];
					state.parser.applyPluginsBailResult("export specifier", statement, def, "default");
				}
			}
		} else {
			commence(statement.declaration, state);
			if(!state.parser.applyPluginsBailResult("export expression", statement, statement.declaration)) {
				state.parser.applyPluginsBailResult("export specifier", statement, statement.declaration, "default");
			}
		}
	},

	ClassDeclaration(statement, state, commence) {
		state.parser.scope.renames["$" + statement.id.name] = undefined;
		state.parser.scope.definitions.push(statement.id.name);
		// continue as "Class"
		commence(statement, state, "Class");
	},

	VariableDeclarator(declarator, state, commence) {
		var renameIdentifier = declarator.init && state.parser.getRenameIdentifier(declarator.init);
		if(renameIdentifier && declarator.id.type === "Identifier" && state.parser.applyPluginsBailResult1("can-rename " + renameIdentifier, declarator.init)) {
			// renaming with "var a = b;"
			if(!state.parser.applyPluginsBailResult1("rename " + renameIdentifier, declarator.init)) {
				state.parser.scope.renames["$" + declarator.id.name] = state.parser.nameInCurrentScope(renameIdentifier);
				var idx = state.parser.scope.definitions.indexOf(declarator.id.name);
				if(idx >= 0) state.parser.scope.definitions.splice(idx, 1);
			}
		} else {
			// force continuation as "Pattern"
			commence(declarator.id, state, "Pattern");
			state.parser.traversePatternForIdentifiers(declarator.id, (node) => {
				const name = node.name;
				if(!state.parser.applyPluginsBailResult1("var " + name, node)) {
					state.parser.scope.renames["$" + name] = undefined;
					state.parser.scope.definitions.push(name);
				}
			});
			if(declarator.init)
				// force continuation as "Expression"
				commence(declarator.init, state, "Expression");
		}
	},

	UnaryExpression(expression, state, commence) {
		if(expression.operator === "typeof") {
			var expr = expression.argument;
			var exprName = [];
			while(expr.type === "MemberExpression" &&
				expr.property.type === (expr.computed ? "Literal" : "Identifier")
			) {
				exprName.unshift(expr.property.name || expr.property.value);
				expr = expr.object;
			}
			if(expr.type === "Identifier" && state.parser.scope.definitions.indexOf(expr.name) === -1) {
				exprName.unshift(state.parser.nameInCurrentScope(expr.name));
				exprName = exprName.join(".");
				var result = state.parser.applyPluginsBailResult1("typeof " + exprName, expression);
				if(result === true)
					return;
			}
		}
		commence(expression.argument, state);
	},

	AssignmentExpression(expression, state, commence) {
		var renameIdentifier = state.parser.getRenameIdentifier(expression.right);
		if(expression.left.type === "Identifier" && renameIdentifier && state.parser.applyPluginsBailResult1("can-rename " + renameIdentifier, expression.right)) {
			// renaming "a = b;"
			if(!state.parser.applyPluginsBailResult1("rename " + renameIdentifier, expression.right)) {
				state.parser.scope.renames["$" + expression.left.name] = renameIdentifier;
				var idx = state.parser.scope.definitions.indexOf(expression.left.name);
				if(idx >= 0) state.parser.scope.definitions.splice(idx, 1);
			}
		} else if(expression.left.type === "Identifier") {
			if(!state.parser.applyPluginsBailResult1("assigned " + expression.left.name, expression)) {
				commence(expression.right, state);
			}
			state.parser.scope.renames["$" + expression.left.name] = undefined;
			if(!state.parser.applyPluginsBailResult1("assign " + expression.left.name, expression)) {
				commence(expression.left, state);
			}
		} else {
			commence(expression.right, state);
			state.parser.scope.renames["$" + expression.left.name] = undefined;
			commence(expression.left, state);
		}
	},

	ConditionalExpression(expression, state, commence) {
		var result = state.parser.applyPluginsBailResult1("expression ?:", expression);
		if(result === undefined) {
			commence(expression.test, state);
			commence(expression.consequent, state);
			if(expression.alternate)
				commence(expression.alternate, state);
		} else {
			if(result)
				commence(expression.consequent, state);
			else if(expression.alternate)
				commence(expression.alternate, state);
		}
	},

	CallExpression(expression, state, commence) {
		var result;

		function walkIIFE(functionExpression, options) {
			var params = functionExpression.params;
			var args = options.map(function(arg) {
				var renameIdentifier = state.parser.getRenameIdentifier(arg);
				if(renameIdentifier && state.parser.applyPluginsBailResult1("can-rename " + renameIdentifier, arg)) {
					if(!state.parser.applyPluginsBailResult1("rename " + renameIdentifier, arg))
						return renameIdentifier;
				}
				commence(arg, state);
			}, state.parser);
			state.parser.inScope(params.filter(function(identifier, idx) {
				return !args[idx];
			}), function() {
				for(var i = 0; i < args.length; i++) {
					var param = args[i];
					if(!param) continue;
					if(!params[i] || params[i].type !== "Identifier") continue;
					state.parser.scope.renames["$" + params[i].name] = param;
				}
				commence(functionExpression.body, state);
			});
		}
		if(expression.callee.type === "MemberExpression" &&
			expression.callee.object.type === "FunctionExpression" &&
			!expression.callee.computed &&
			(["call", "bind"]).indexOf(expression.callee.property.name) >= 0 &&
			expression.arguments &&
			expression.arguments.length > 1
		) {
			// (function(...) { }.call/bind(?, ...))
			walkIIFE.call(state.parser, expression.callee.object, expression.arguments.slice(1));
			commence(expression.arguments[0], state);
		} else if(expression.callee.type === "FunctionExpression" && expression.arguments) {
			// (function(...) { }(...))
			walkIIFE.call(state.parser, expression.callee, expression.arguments);
		} else if(expression.callee.type === "Import") {
			result = state.parser.applyPluginsBailResult1("import-call", expression);
			if(result === true)
				return;

			if(expression.arguments)
				expression.arguments.forEach(arg => commence(arg, state));
		} else {
			var callee = state.parser.evaluateExpression(expression.callee);
			if(callee.isIdentifier()) {
				result = state.parser.applyPluginsBailResult1("call " + callee.identifier, expression);
				if(result === true)
					return;
			}

			if(expression.callee)
				commence(expression.callee, state);
			if(expression.arguments)
				expression.arguments.forEach(arg => commence(arg, state));
		}
	},

	MemberExpression(expression, state, commence) {
		var expr = expression;
		var exprName = [];
		while(expr.type === "MemberExpression" &&
			expr.property.type === (expr.computed ? "Literal" : "Identifier")
		) {
			exprName.unshift(expr.property.name || expr.property.value);
			expr = expr.object;
		}
		if(expr.type === "Identifier" && state.parser.scope.definitions.indexOf(expr.name) === -1) {
			exprName.unshift(state.parser.nameInCurrentScope(expr.name));
			var result = state.parser.applyPluginsBailResult1("expression " + exprName.join("."), expression);
			if(result === true)
				return;
			exprName[exprName.length - 1] = "*";
			result = state.parser.applyPluginsBailResult1("expression " + exprName.join("."), expression);
			if(result === true)
				return;
		}
		commence(expression.object, state);
		if(expression.computed === true)
			commence(expression.property, state);
	},

	ExportNamedDeclaration(statement, state, commence) {
		let source;
		if(statement.source) {
			source = statement.source.value;
			state.parser.applyPluginsBailResult("export import", statement, source);
		} else {
			state.parser.applyPluginsBailResult1("export", statement);
		}

		if(statement.declaration) {
			if(/Expression$/.test(statement.declaration.type)) {
				throw new Error("Doesn't occur?");
			}

			if(!state.parser.applyPluginsBailResult("export declaration", statement, statement.declaration)) {
				const pos = state.parser.scope.definitions.length;
				commence(statement.declaration, state);
				const newDefs = state.parser.scope.definitions.slice(pos);
				for(let index = newDefs.length - 1; index > -1; index -= 1) {
					state.parser.applyPluginsBailResult("export specifier", statement, newDefs[index], newDefs[index], index);
				}
			}
		}
		if(statement.specifiers) {
			for(var specifierIndex = 0; specifierIndex < statement.specifiers.length; specifierIndex++) {
				const specifier = statement.specifiers[specifierIndex];
				if(specifier.type === "ExportSpecifier") {
					if(source)
						state.parser.applyPluginsBailResult("export import specifier", statement, source, specifier.local.name, specifier.exported.name, specifierIndex);
					else
						state.parser.applyPluginsBailResult("export specifier", statement, specifier.local.name, specifier.exported.name, specifierIndex);
				}
			}
		}
	},

	Pattern(pattern, state, commence) {
		if(pattern.type === "Identifier" || pattern.type === "AssignmentPattern") {
			return;
		}
		commence(pattern, state);
	},

	ObjectPattern(pattern, state, commence) {
		for(var i = 0, len = pattern.properties.length; i < len; i++) {
			var prop = pattern.properties[i];
			if(prop) {
				if(prop.computed)
					commence(prop.key, state);
				if(prop.value)
					commence(prop.value, state, "Pattern");
			}
		}
	},

	ObjectExpression(expression, state, commence) {
		for(var propIndex = 0, len = expression.properties.length; propIndex < len; propIndex++) {
			var prop = expression.properties[propIndex];
			if(prop.computed)
				commence(prop.key, state);

			if(prop.shorthand)
				state.parser.scope.inShorthand = true;

			commence(prop.value, state);

			if(prop.shorthand)
				state.parser.scope.inShorthand = false;
		}
	},

	FunctionExpression(expression, state, commence) {
		state.parser.inScope(expression.params, function() {
			commence(expression.body, state);
		});
	},

	ArrowFunctionExpression(expression, state, commence) {
		state.parser.inScope(expression.params, function() {
			commence(expression.body, state);
		});
	},

	Identifier(expression, state, commence) {
		// if we know it already skip
		if(state.parser.scope.definitions.indexOf(expression.name) > -1) {
			return;
		}
		const expressionName = state.parser.nameInCurrentScope(expression.name);
		state.parser.applyPluginsBailResult1("expression " + expressionName, expression);
	}
};
