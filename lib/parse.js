/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var esprima = require("esprima");

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API

function walkStatements(context, statements) {
	statements.forEach(function(statement) {
		walkStatement(context, statement);
	});
}

function walkStatement(context, statement) {
	switch(statement.type) {
	// Real Statements
	case "BlockStatement":
		walkStatements(context, statement.body);
		break;
	case "ExpressionStatement":
		walkExpression(context, statement.expression);
		break;
	case "IfStatement":
		walkExpression(context, statement.test);
		walkStatement(context, statement.consequent);
		if(statement.alternate)
			walkStatement(context, statement.alternate);
		break;
	case "LabeledStatement":
		walkStatement(context, statement.body);
		break;
	case "WithStatement":
		walkExpression(context, statement.object);
		walkStatement(context, statement.body);
		break;
	case "SwitchStatement":
		walkExpression(context, statement.discriminant);
		walkSwitchCases(context, statement.cases);
		break;
	case "ReturnStatement":
	case "ThrowStatement":
		if(statement.argument)
			walkExpression(context, statement.argument);
		break;
	case "TryStatement":
		walkStatement(context, statement.block);
		walkCatchClauses(context, statement.handlers);
		if(statement.finalizer)
			walkStatement(context, statement.finalizer);
		break;
	case "WhileStatement":
	case "DoWhileStatement":
		walkExpression(context, statement.test);
		walkStatement(context, statement.body);
		break;
	case "ForStatement":
		if(statement.init) {
			if(statement.init.type === "VariableDeclaration")
				walkStatement(context, statement.init);
			else
				walkExpression(context, statement.init);
		}
		if(statement.test)
			walkExpression(context, statement.test);
		if(statement.update)
			walkExpression(context, statement.update);
		walkStatement(context, statement.body);
		break;
	case "ForInStatement":
		if(statement.left.type === "VariableDeclaration")
			walkStatement(context, statement.left);
		else
			walkExpression(context, statement.left);
		walkExpression(context, statement.right);
		walkStatement(context, statement.body);
		break;

	// Declarations
	case "FunctionDeclaration":
		var req = functionParamsContainsRequire(statement.params);
		if(req) {
			var old = context.requireOverwrite;
			context.requireOverwrite = true;
		}
		if(statement.body.type === "BlockStatement")
			walkStatement(context, statement.body);
		else
			walkExpression(context, statement.body);
		if(req)
			context.requireOverwrite = old;
		break;
	case "VariableDeclaration":
		if(statement.declarations)
			walkVariableDeclarators(context, statement.declarations);
		break;
	}
}

function walkSwitchCases(context, switchCases) {
	switchCases.forEach(function(switchCase) {
		if(switchCase.test)
			walkExpression(context, switchCase.test);
		walkStatements(context, switchCase.consequent);
	});
}

function walkCatchClauses(context, catchClauses) {
	catchClauses.forEach(function(catchClause) {
		if(catchClause.guard)
			walkExpression(context, catchClause.guard);
		walkStatement(context, catchClause.body);
	});
}

function walkVariableDeclarators(context, declarators) {
	declarators.forEach(function(declarator) {
		switch(declarator.type) {
		case "VariableDeclarator":
			if(declarator.init)
				walkExpression(context, declarator.init);
			break;
		}
	});
}

function walkExpressions(context, expressions) {
	expressions.forEach(function(expression) {
		walkExpression(context, expression);
	});
}

function walkExpression(context, expression) {
	switch(expression.type) {
	case "ArrayExpression":
		if(expression.elements)
			walkExpressions(context, expression.elements);
		break;
	case "ObjectExpression":
		expression.properties.forEach(function(prop) {
			walkExpression(context, prop.value);
		});
		break;
	case "FunctionExpression":
		var req = functionParamsContainsRequire(expression.params);
		if(context.paramMustRequire) {
			req = false;
			context.paramMustRequire = false;
		}
		if(req) {
			var old = context.requireOverwrite;
			context.requireOverwrite = true;
		}
		if(expression.body.type === "BlockStatement")
			walkStatement(context, expression.body);
		else
			walkExpression(context, expression.body);
		if(req)
			context.requireOverwrite = old;
		break;
	case "SequenceExpression":
		if(expression.expressions)
			walkExpressions(context, expression.expressions);
		break;
	case "UnaryExpression":
	case "UpdateExpression":
		walkExpression(context, expression.argument);
		break;
	case "BinaryExpression":
	case "AssignmentExpression":
	case "LogicalExpression":
		walkExpression(context, expression.left);
		walkExpression(context, expression.right);
		break;
	case "ConditionalExpression":
		walkExpression(context, expression.test);
		walkExpression(context, expression.alternate);
		walkExpression(context, expression.consequent);
		break;
	case "NewExpression":
		walkExpression(context, expression.callee);
		if(expression.arguments)
			walkExpressions(context, expression.arguments);
		break;
	case "CallExpression":
		var noCallee = false;
		if(!context.requireOverwrite && 
			expression.callee && expression.arguments &&
			expression.arguments.length == 1 &&
			expression.callee.type === "Identifier" &&
			expression.callee.name === "require") {
			var param = parseCalculatedString(expression.arguments[0]);
			if(param.code) {
				// make context
				var pos = param.value.indexOf("/");
				context.contexts = context.contexts || [];
				if(pos === -1) {
					var newContext = {
						name: ".",
						require: true,
						calleeRange: expression.callee.range,
						line: expression.loc.start.line,
						column: expression.loc.start.column
					};
					context.contexts.push(newContext);
				} else {
					var match = /\/[^\/]*$/.exec(param.value);
					var dirname = param.value.substring(0, match.index);
					var remainder = "." + param.value.substring(match.index);
					var newContext = {
						name: dirname,
						require: true,
						replace: [param.range, remainder],
						calleeRange: expression.callee.range,
						line: expression.loc.start.line,
						column: expression.loc.start.column
					};
					context.contexts.push(newContext);
				}
			} else {
				// normal require
				context.requires = context.requires || [];
				context.requires.push({
					name: param.value,
					nameRange: param.range,
					line: expression.loc.start.line,
					column: expression.loc.start.column
				});
			}
			noCallee = true;
		}
		if(!context.requireOverwrite && 
			expression.callee && expression.arguments &&
			expression.arguments.length >= 1 &&
			expression.callee.type === "MemberExpression" &&
			expression.callee.object.type === "Identifier" &&
			expression.callee.object.name === "require" &&
			expression.callee.property.type === "Identifier" &&
			expression.callee.property.name in {async:1, ensure:1}) {
			var param = parseStringArray(expression.arguments[0]);
			context.asyncs = context.asyncs || [];
			var newContext = {
				requires: [],
				namesRange: expression.arguments[0].range,
				line: expression.loc.start.line,
				column: expression.loc.start.column,
				paramMustRequire: true
			};
			param.forEach(function(r) {
				newContext.requires.push({name: r});
			});
			context.asyncs.push(newContext);
			context = newContext;
			noCallee = true;
		}
		if(!context.requireOverwrite && 
			expression.callee && expression.arguments &&
			expression.arguments.length == 1 &&
			expression.callee.type === "MemberExpression" &&
			expression.callee.object.type === "Identifier" &&
			expression.callee.object.name === "require" &&
			expression.callee.property.type === "Identifier" &&
			expression.callee.property.name in {context:1}) {
			var param = parseString(expression.arguments[0]);
			context.contexts = context.contexts || [];
			var newContext = {
				name: param,
				expressionRange: [expression.callee.range[0], expression.range[1]],
				line: expression.loc.start.line,
				column: expression.loc.start.column,
			};
			context.contexts.push(newContext);
			noCallee = true;
		}

		if(expression.callee && !noCallee)
			walkExpression(context, expression.callee);
		if(expression.arguments)
			walkExpressions(context, expression.arguments);
		break;
	case "MemberExpression":
		walkExpression(context, expression.object);
		if(expression.property.type !== "Identifier")
			walkExpression(context, expression.property);
		break;
	case "Identifier":
		if(!context.requireOverwrite && 
			expression.name === "require") {
			context.contexts = context.contexts || [];
			var newContext = {
				name: ".",
				warn: "Identifier",
				require: true,
				calleeRange: [expression.range[0], expression.range[1]],
				line: expression.loc.start.line,
				column: expression.loc.start.column,
			};
			context.contexts.push(newContext);
		}
		break;
	}
}

function functionParamsContainsRequire(params) {
	if(!params) return false;
	var found = false;
	params.forEach(function(param) {
		if(param.type === "Identifier" && 
			param.name === "require")
			found = true;
	});
	return found;
}

function parseString(expression) {
	switch(expression.type) {
	case "BinaryExpression":
		if(expression.operator == "+")
			return parseString(expression.left) + parseString(expression.right);
		break;
	case "Literal":
		return expression.value+"";
	}
	throw new Error(expression.type + " is not supported as parameter for require");
}

function parseCalculatedString(expression) {
	switch(expression.type) {
	case "BinaryExpression":
		if(expression.operator == "+") {
			var left = parseCalculatedString(expression.left);
			var right = parseCalculatedString(expression.right);
			if(left.code) {
				return {range: left.range, value: left.value, code: true};
			} else if(right.code) {
				return {range: [left.range[0], right.range ? right.range[1] : left.range[1]], value: left.value + right.value, code: true};
			} else {
				return {range: [left.range[0], right.range[1]], value: left.value + right.value};
			}
		}
		break;
	case "Literal":
		return {range: expression.range, value: expression.value+""};
		break;
	}
	return {value: "", code: true};
}

function parseStringArray(expression) {
	switch(expression.type) {
	case "ArrayExpression":
		var arr = [];
		if(expression.elements)
			expression.elements.forEach(function(expr) {
				arr.push(parseString(expr));
			});
		return arr;
	}
	return [parseString(expression)];
}

module.exports = function parse(source, options) {
	var ast = esprima.parse(source, {range: true, loc: true, raw: true});
	if(!ast || typeof ast != "object")
		throw new Error("Source couldn't be parsed");
	var context = {};
	walkStatements(context, ast.body);
	return context;
}