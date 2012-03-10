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
		if(statement.body.type === "BlockStatement")
			walkStatement(context, statement.body);
		else
			walkExpression(context, statement.body);
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
		if(expression.body.type === "BlockStatement")
			walkStatement(context, expression.body);
		else
			walkExpression(context, expression.body);
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
		if(expression.arguments)
			walkExpressions(context, expression.arguments);
		break;
	case "CallExpression":
		if(expression.callee && expression.arguments &&
			expression.arguments.length >= 1 &&
			expression.callee.type === "Identifier" &&
			expression.callee.name === "require") {
			var param = parseString(expression.arguments[0]);
			context.requires = context.requires || [];
			context.requires.push({
				name: param,
				nameRange: expression.arguments[0].range,
				line: expression.loc.start.line,
				column: expression.loc.start.column
			});
		}
		if(expression.callee && expression.arguments &&
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
				column: expression.loc.start.column
			};
			param.forEach(function(r) {
				newContext.requires.push({name: r});
			});
			context.asyncs.push(newContext);
			context = newContext;
		}

		if(expression.callee)
			walkExpression(context, expression.callee);
		if(expression.arguments)
			walkExpressions(context, expression.arguments);
		break;
	case "MemberExpression":
		walkExpression(context, expression.object);
		if(expression.property.type !== "Identifier")
			walkExpression(context, expression.property);
		break;
	}
}

function parseString(expression) {
	switch(expression.type) {
	case "BinaryExpression":
		return parseString(expression.left) + parseString(expression.right);
	case "Literal":
		if(typeof expression.value === "string")
			return expression.value;
	}
	throw new Error(expression.type + " is not supported as parameter for require");
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
	var ast = esprima.parse(source, {range: true, loc: true});
	if(!ast || typeof ast != "object")
		throw new Error("Source couldn't be parsed");
	var context = {};
	walkStatements(context, ast.body);
	return context;
}