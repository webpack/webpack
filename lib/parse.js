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
		if(context.options.overwrites.hasOwnProperty(statement.name)) {
			context.overwrite.push(statement.name);
		}
		var old = addOverwrites(context, statement.params);
		if(statement.body.type === "BlockStatement")
			walkStatement(context, statement.body);
		else
			walkExpression(context, statement.body);
		context.overwrite.length = old;
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
			if(declarator.id.type === "Identifier" &&
				context.options.overwrites.hasOwnProperty(declarator.id.name)) {
				context.overwrite.push(declarator.id.name);
			}
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
		var old = addOverwrites(context, expression.params);
		if(expression.body.type === "BlockStatement")
			walkStatement(context, expression.body);
		else
			walkExpression(context, expression.body);
		context.overwrite.length = old;
		break;
	case "SequenceExpression":
		if(expression.expressions)
			walkExpressions(context, expression.expressions);
		break;
	case "UpdateExpression":
		walkExpression(context, expression.argument);
		break;
	case "UnaryExpression":
		if(expression.operator === "typeof" &&
			expression.argument &&
			expression.argument.type === "Identifier" &&
			expression.argument.name === "require")
			break;
		walkExpression(context, expression.argument);
		break;
	case "BinaryExpression":
	case "LogicalExpression":
		walkExpression(context, expression.left);
		walkExpression(context, expression.right);
		break;
	case "AssignmentExpression":
		if(expression.left.type !== "Identifier" ||
			expression.left.name !== "require")
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
		if(context.overwrite.indexOf("require") === -1 &&
			expression.callee && expression.arguments &&
			expression.arguments.length == 1 &&
			expression.callee.type === "Identifier" &&
			expression.callee.name === "require") {
			// "require(...)"
			var param = parseCalculatedString(expression.arguments[0]);
			if(param.conditional) {
				context.requires = context.requires || [];
				param.conditional.forEach(function(paramItem) {
					context.requires.push({
						name: paramItem.value,
						valueRange: paramItem.range,
						line: expression.loc.start.line,
						column: expression.loc.start.column
					});
				});
			} else if(param.code) {
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
					expressionRange: [expression.callee.range[0], expression.range[1]],
					line: expression.loc.start.line,
					column: expression.loc.start.column
				});
			}
			noCallee = true;
		}
		if(context.overwrite.indexOf("require") === -1 &&
			expression.callee && expression.arguments &&
			expression.arguments.length >= 1 &&
			expression.callee.type === "MemberExpression" &&
			expression.callee.object.type === "Identifier" &&
			expression.callee.object.name === "require" &&
			expression.callee.property.type === "Identifier" &&
			{async:1, ensure:1}.hasOwnProperty(expression.callee.property.name)) {
			// "require.ensure(...)" or "require.async(...)"
			var param = parseStringArray(expression.arguments[0]);
			var newContext = {
				requires: [],
				propertyRange: expression.callee.property.range,
				namesRange: expression.arguments[0].range,
				line: expression.loc.start.line,
				column: expression.loc.start.column,
				ignoreOverride: true,
				overwrite: context.overwrite.slice(),
				options: context.options
			};
			param.forEach(function(r) {
				newContext.requires.push({name: r});
			});
			if(expression.arguments.length >= 2 &&
				expression.arguments[1].type === "FunctionExpression" &&
				expression.arguments[1].body &&
				expression.arguments[1].body.type === "BlockStatement" &&
				expression.arguments[1].body.range)
				newContext.blockRange = [
					expression.arguments[1].body.range[0]+1,
					expression.arguments[1].body.range[1]-1
				];
			if(expression.arguments[2]) {
				newContext.name = parseString(expression.arguments[2]);
				newContext.nameRange = expression.arguments[2].range;
			}
			context.asyncs = context.asyncs || [];
			context.asyncs.push(newContext);
			context = newContext;
			noCallee = true;
		}
		if(context.overwrite.indexOf("require") === -1 &&
			expression.callee && expression.arguments &&
			expression.arguments.length == 1 &&
			expression.callee.type === "MemberExpression" &&
			expression.callee.object.type === "Identifier" &&
			expression.callee.object.name === "require" &&
			expression.callee.property.type === "Identifier" &&
			expression.callee.property.name === "context") {
			// "require.context(...)"
			var param = parseString(expression.arguments[0]);
			context.contexts = context.contexts || [];
			var newContext = {
				name: param,
				expressionRange: [expression.callee.range[0], expression.range[1]],
				line: expression.loc.start.line,
				column: expression.loc.start.column
			};
			context.contexts.push(newContext);
			noCallee = true;
		}
		if(context.overwrite.indexOf("require") === -1 &&
			expression.callee && expression.arguments &&
			expression.arguments.length == 1 &&
			expression.callee.type === "MemberExpression" &&
			expression.callee.object.type === "Identifier" &&
			expression.callee.object.name === "require" &&
			expression.callee.property.type === "Identifier" &&
			expression.callee.property.name === "resolve") {
			// "require.resolve(...)"
			var param = parseCalculatedString(expression.arguments[0]);
			if(param.conditional) {
				context.requires = context.requires || [];
				param.conditional.forEach(function(paramItem, idx) {
					context.requires.push({
						name: paramItem.value,
						valueRange: paramItem.range,
						deleteRange: idx === 0 ? expression.callee.range : undefined,
						line: expression.loc.start.line,
						column: expression.loc.start.column
					});
				});
			} else {
				// normal require
				context.requires = context.requires || [];
				context.requires.push({
					name: param.value,
					expressionRange: [expression.callee.range[0], expression.range[1]],
					idOnly: true,
					line: expression.loc.start.line,
					column: expression.loc.start.column
				});
			}
			noCallee = true;
		}

		if(expression.callee && !noCallee)
			walkExpression(context, expression.callee);
		if(expression.arguments)
			walkExpressions(context, expression.arguments);
		break;
	case "MemberExpression":
		if(expression.object.type === "Identifier" &&
			expression.object.name === "module" &&
			expression.property.type === "Identifier" &&
			expression.property.name === "exports")
			break;
		if(expression.object.type === "Identifier" &&
			expression.object.name === "require" &&
			expression.property.type === "Identifier" &&
			{valueOf:1, cache:1, modules:1}.hasOwnProperty(expression.property.name))
			break;
		walkExpression(context, expression.object);
		if(expression.property.type !== "Identifier")
			walkExpression(context, expression.property);
		break;
	case "Identifier":
		if(context.overwrite.indexOf("require") === -1 &&
			expression.name === "require") {
			context.contexts = context.contexts || [];
			var newContext = {
				name: ".",
				warn: "Identifier",
				require: true,
				calleeRange: [expression.range[0], expression.range[1]],
				line: expression.loc.start.line,
				column: expression.loc.start.column
			};
			context.contexts.push(newContext);
		} else if(context.overwrite.indexOf(expression.name) === -1 &&
			context.options.overwrites.hasOwnProperty(expression.name)) {
			context.requires = context.requires || [];
			var overwrite = context.options.overwrites[expression.name];
			var append = undefined;
			if(overwrite.indexOf("+") !== -1) {
				append = overwrite.substr(overwrite.indexOf("+")+1);
				overwrite = overwrite.substr(0, overwrite.indexOf("+"));
			}
			context.requires.push({
				name: overwrite,
				line: expression.loc.start.line,
				column: expression.loc.start.column,
				variable: expression.name,
				append: append
			});
		}
		break;
	}
}

function addOverwrites(context, params) {
	var l = context.overwrite.length;
	if(!params) return l;
	params.forEach(function(param) {
		if(context.ignoreOverride) {
			context.ignoreOverride = false;
			return;
		}
		if(param.type === "Identifier" &&
			context.options.overwrites.hasOwnProperty(param.name))
			context.overwrite.push(param.name);
	});
	return l;
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
	case "ConditionalExpression":
		var consequent = parseCalculatedString(expression.consequent);
		var alternate = parseCalculatedString(expression.alternate);
		var items = [];
		if(consequent.conditional)
			Array.prototype.push.apply(items, consequent.conditional);
		else if(!consequent.code)
			items.push(consequent);
		else break;
		if(alternate.conditional)
			Array.prototype.push.apply(items, alternate.conditional);
		else if(!alternate.code)
			items.push(alternate);
		else break;
		return {value: "", code: true, conditional: items};
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
	options = options || {};
	options.overwrites = options.overwrites || {};
	options.overwrites.require = true;
	var context = {
		options: options,
		overwrite: []
	};
	walkStatements(context, ast.body);
	delete context.options;
	return context;
}