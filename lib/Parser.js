/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var esprima = require("esprima");
var Tapable = require("tapable");
var BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

function Parser(options) {
	Tapable.call(this);
	this.options = options;
	this.initializeEvaluating();
}
module.exports = Parser;

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API



Parser.prototype = Object.create(Tapable.prototype);
Parser.prototype.initializeEvaluating = function() {
	function joinRanges(startRange, endRange) {
		if(!endRange) return startRange;
		if(!startRange) return endRange;
		return [startRange[0], endRange[1]];
	}
	this.plugin("evaluate Literal", function(expr) {
		switch(typeof expr.value) {
		case "number":
			return new BasicEvaluatedExpression().setNumber(expr.value).setRange(expr.range);
		case "string":
			return new BasicEvaluatedExpression().setString(expr.value).setRange(expr.range);
		case "boolean":
			return new BasicEvaluatedExpression().setBoolean(expr.value).setRange(expr.range);
		}
		if(expr.value instanceof RegExp)
			return new BasicEvaluatedExpression().setRegExp(expr.value).setRange(expr.range);
	});
	this.plugin("evaluate BinaryExpression", function(expr) {
		if(expr.operator == "+") {
			var left = this.evaluateExpression(expr.left);
			var right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			var res = new BasicEvaluatedExpression()
			if(left.isString()) {
				if(right.isString()) {
					res.setString(left.string + right.string);
				} else if(right.isNumber()) {
					res.setString(left.string + right.number);
				} else if(right.isWrapped() && right.prefix.isString()) {
					res.setWrapped(
						new BasicEvaluatedExpression()
							.setString(left.string + right.prefix.string)
							.setRange(joinRanges(left.range, right.prefix.range)),
						right.postfix);
				} else {
					res.setWrapped(left, new BasicEvaluatedExpression().setString(""))
				}
			} else if(left.isNumber()) {
				if(right.isString()) {
					res.setString(left.number + right.string);
				} else if(right.isNumber()) {
					res.setNumber(left.number + right.number);
				}
			} else if(left.isWrapped() && left.postfix.isString()) {
				if(right.isString()) {
					res.setWrapped(left.prefix,
						new BasicEvaluatedExpression()
							.setString(left.postfix.string + right.string)
							.setRange(joinRanges(left.postfix.range, right.range))
					);
				} else if(right.isNumber()) {
					res.setWrapped(left.prefix,
						new BasicEvaluatedExpression()
							.setString(left.postfix.string + right.number)
							.setRange(joinRanges(left.postfix.range, right.range))
					);
				}
			} else {
				if(right.isString()) {
					res.setWrapped(new BasicEvaluatedExpression().setString(""), right);
				}
			}
			res.setRange(expr.range);
			return res;
		} else if(expr.operator == "==" || expr.operator == "===") {
			var left = this.evaluateExpression(expr.left);
			var right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			var res = new BasicEvaluatedExpression();
			res.setRange(expr.range);
			if(left.isString() && right.isString()) {
				return res.setBoolean(left.string === right.string);
			} else if(left.isNumber() && right.isNumber()) {
				return res.setBoolean(left.number === right.number);
			} else if(left.isBoolean() && right.isBoolean()) {
				return res.setBoolean(left.bool === right.bool);
			}
		} else if(expr.operator == "!=" || expr.operator == "!==") {
			var left = this.evaluateExpression(expr.left);
			var right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			var res = new BasicEvaluatedExpression();
			res.setRange(expr.range);
			if(left.isString() && right.isString()) {
				return res.setBoolean(left.string !== right.string);
			} else if(left.isNumber() && right.isNumber()) {
				return res.setBoolean(left.number !== right.number);
			} else if(left.isBoolean() && right.isBoolean()) {
				return res.setBoolean(left.bool !== right.bool);
			}
		}
	});
	this.plugin("evaluate UnaryExpression", function(expr) {
		if(expr.operator == "typeof" && expr.argument.type == "Identifier") {
			return this.applyPluginsBailResult("evaluate typeof " + expr.argument.name, expr);
		} else if(expr.operator == "!") {
			var argument = this.evaluateExpression(expr.argument);
			if(!argument) return;
			if(argument.isBoolean()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.bool).setRange(expr.range);
			} else if(argument.isString()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.string).setRange(expr.range);
			} else if(argument.isNumber()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.number).setRange(expr.range);
			}
		}
	});
	this.plugin("evaluate Identifier", function(expr) {
		return this.applyPluginsBailResult("evaluate Identifier " + expr.name, expr);
	});
	this.plugin("evaluate CallExpression", function(expr) {
		if(expr.callee.type != "MemberExpression") return;
		if(expr.callee.property.type != "Identifier") return;
		var param = this.evaluateExpression(expr.callee.object);
		if(!param) return;
		return this.applyPluginsBailResult("evaluate CallExpression ." + expr.callee.property.name, expr, param);
	});
	this.plugin("evaluate CallExpression .substr", function(expr, param) {
		if(!param.isString()) return;
		var result, str = param.string;
		switch(expr.arguments.length) {
		case 1:
			var arg1 = this.evaluateExpression(expr.arguments[0]);
			if(!arg1.isNumber()) return;
			result = str.substr(arg1.number);
			break;
		case 2:
			var arg1 = this.evaluateExpression(expr.arguments[0]);
			var arg2 = this.evaluateExpression(expr.arguments[0]);
			if(!arg1.isNumber()) return;
			if(!arg2.isNumber()) return;
			result = str.substr(arg1.number, arg2.number);
			break;
		default:
			return;
		}
		return new BasicEvaluatedExpression().setString(result).setRange(expr.range);
	});
	this.plugin("evaluate CallExpression .substring", function(expr, param) {
		if(!param.isString()) return;
		var result, str = param.string;
		switch(expr.arguments.length) {
		case 1:
			var arg1 = this.evaluateExpression(expr.arguments[0]);
			if(!arg1.isNumber()) return;
			result = str.substring(arg1.number);
			break;
		case 2:
			var arg1 = this.evaluateExpression(expr.arguments[0]);
			var arg2 = this.evaluateExpression(expr.arguments[1]);
			if(!arg1.isNumber()) return;
			if(!arg2.isNumber()) return;
			result = str.substring(arg1.number, arg2.number);
			break;
		default:
			return;
		}
		return new BasicEvaluatedExpression().setString(result).setRange(expr.range);
	});
	this.plugin("evaluate ConditionalExpression", function(expr) {
		var consequent = this.evaluateExpression(expr.consequent);
		var alternate = this.evaluateExpression(expr.alternate);
		if(!consequent || !alternate) return;
		var res = new BasicEvaluatedExpression();
		if(consequent.isConditional())
			res.setOptions(consequent.options);
		else
			res.setOptions([consequent]);
		if(alternate.isConditional())
			res.addOptions(alternate.options);
		else
			res.addOptions([alternate]);
		res.setRange(expr.range);
		return res;
	});
	this.plugin("evaluate ArrayExpression", function(expr) {
		var items = expr.elements.map(function(element) {
			return this.evaluateExpression(element);
		}, this);
		if(items.filter(function(i) { return !i; }).length > 0) return;
		return new BasicEvaluatedExpression().setItems(items).setRange(expr.range);
	});
}
Parser.prototype.walkStatements = function walkStatements(statements) {
	statements.forEach(function(statement) {
		this.walkStatement(statement);
	}, this);
}

Parser.prototype.walkStatement = function walkStatement(statement) {
	switch(statement.type) {
	// Real Statements
	case "BlockStatement":
		this.walkStatements(statement.body);
		break;
	case "ExpressionStatement":
		this.walkExpression(statement.expression);
		break;
	case "IfStatement":
		var result = this.applyPluginsBailResult("statement if", statement);
		if(result === undefined) {
			this.walkExpression(statement.test);
			this.walkStatement(statement.consequent);
			if(statement.alternate)
				this.walkStatement(statement.alternate);
		} else {
			if(result)
				this.walkStatement(statement.consequent);
			else if(statement.alternate)
				this.walkStatement(statement.alternate);
		}
		break;
	case "LabeledStatement":
		var result = this.applyPluginsBailResult("label " + statement.label.name, statement);
		if(result === true)
			break;
		this.walkStatement(statement.body);
		break;
	case "WithStatement":
		this.walkExpression(statement.object);
		this.walkStatement(statement.body);
		break;
	case "SwitchStatement":
		this.walkExpression(statement.discriminant);
		this.walkSwitchCases(statement.cases);
		break;
	case "ReturnStatement":
	case "ThrowStatement":
		if(statement.argument)
			this.walkExpression(statement.argument);
		break;
	case "TryStatement":
		if(this.scope.inTry) {
			this.walkStatement(statement.block);
		} else {
			this.scope.inTry = true;
			this.walkStatement(statement.block);
			this.scope.inTry = false;
		}
		this.walkCatchClauses(statement.handlers);
		if(statement.finalizer)
			this.walkStatement(statement.finalizer);
		break;
	case "WhileStatement":
	case "DoWhileStatement":
		this.walkExpression(statement.test);
		this.walkStatement(statement.body);
		break;
	case "ForStatement":
		if(statement.init) {
			if(statement.init.type === "VariableDeclaration")
				this.walkStatement(statement.init);
			else
				this.walkExpression(statement.init);
		}
		if(statement.test)
			this.walkExpression(statement.test);
		if(statement.update)
			this.walkExpression(statement.update);
		this.walkStatement(statement.body);
		break;
	case "ForInStatement":
		if(statement.left.type === "VariableDeclaration")
			this.walkStatement(statement.left);
		else
			this.walkExpression(statement.left);
		this.walkExpression(statement.right);
		this.walkStatement(statement.body);
		break;

	// Declarations
	case "FunctionDeclaration":
		this.scope.definitions.push(statement.id.name);
		this.inScope(statement.params, function() {
			if(statement.body.type === "BlockStatement")
				this.walkStatement(statement.body);
			else
				this.walkExpression(statement.body);
		}.bind(this));
		break;
	case "VariableDeclaration":
		if(statement.declarations)
			this.walkVariableDeclarators(statement.declarations);
		break;
	}
}

Parser.prototype.walkSwitchCases = function walkSwitchCases(switchCases) {
	switchCases.forEach(function(switchCase) {
		if(switchCase.test)
			this.walkExpression(switchCase.test);
		this.walkStatements(switchCase.consequent);
	}, this);
}

Parser.prototype.walkCatchClauses = function walkCatchClauses(catchClauses) {
	catchClauses.forEach(function(catchClause) {
		if(catchClause.guard)
			this.walkExpression(catchClause.guard);
		this.inScope([catchClause.param], function() {
			this.walkStatement(catchClause.body);
		}.bind(this));
	}, this);
}

Parser.prototype.walkVariableDeclarators = function walkVariableDeclarators(declarators) {
	declarators.forEach(function(declarator) {
		switch(declarator.type) {
		case "VariableDeclarator":
			if(declarator.id.type === "Identifier") {
				if(!this.applyPluginsBailResult("var " + declarator.id.name))
					this.scope.definitions.push(declarator.id.name);
			}
			if(declarator.init)
				this.walkExpression(declarator.init);
			break;
		}
	}, this);
}

Parser.prototype.walkExpressions = function walkExpressions(expressions) {
	expressions.forEach(function(expression) {
		this.walkExpression(expression);
	}, this);
}

Parser.prototype.walkExpression = function walkExpression(expression) {
	switch(expression.type) {
	case "ArrayExpression":
		if(expression.elements)
			this.walkExpressions(expression.elements);
		break;
	case "ObjectExpression":
		expression.properties.forEach(function(prop) {
			this.walkExpression(prop.value);
		}, this);
		break;
	case "FunctionExpression":
		this.inScope(expression.params, function() {
			if(expression.body.type === "BlockStatement")
				this.walkStatement(expression.body);
			else
				this.walkExpression(expression.body);
		}.bind(this));
		break;
	case "SequenceExpression":
		if(expression.expressions)
			this.walkExpressions(expression.expressions);
		break;
	case "UpdateExpression":
		this.walkExpression(expression.argument);
		break;
	case "UnaryExpression":
		if(expression.operator === "typeof") {
			var expr = expression.argument;
			var exprName = [];
			while(expr.type == "MemberExpression" && expr.property.type == "Identifier") {
				exprName.unshift(expr.property.name);
				expr = expr.object;
			}
			if(expr.type == "Identifier" && this.scope.definitions.indexOf(expr.name) == -1) {
				exprName.unshift(expr.name);
				exprName = exprName.join(".");
				var result = this.applyPluginsBailResult("typeof " + exprName, expression);
				if(result === true)
					break;
			}
		}
		this.walkExpression(expression.argument);
		break;
	case "BinaryExpression":
	case "LogicalExpression":
		this.walkExpression(expression.left);
		this.walkExpression(expression.right);
		break;
	case "AssignmentExpression":
		if(expression.left.type !== "Identifier" ||
			expression.left.name !== "require")
			this.walkExpression(expression.left);
		this.walkExpression(expression.right);
		break;
	case "ConditionalExpression":
		this.walkExpression(expression.test);
		this.walkExpression(expression.alternate);
		this.walkExpression(expression.consequent);
		break;
	case "NewExpression":
		this.walkExpression(expression.callee);
		if(expression.arguments)
			this.walkExpressions(expression.arguments);
		break;
	case "CallExpression":
		var callee = expression.callee;
		var calleeName = [];
		while(callee.type == "MemberExpression" && callee.property.type == "Identifier") {
			calleeName.unshift(callee.property.name);
			callee = callee.object;
		}
		if(callee.type == "Identifier" && this.scope.definitions.indexOf(callee.name) == -1) {
			calleeName.unshift(callee.name);
			calleeName = calleeName.join(".");
			var result = this.applyPluginsBailResult("call " + calleeName, expression);
			if(result === true)
				break;
		}

		if(expression.callee)
			this.walkExpression(expression.callee);
		if(expression.arguments)
			this.walkExpressions(expression.arguments);
		break;
	case "MemberExpression":
		var expr = expression;
		var exprName = [];
		while(expr.type == "MemberExpression" && expr.property.type == "Identifier") {
			exprName.unshift(expr.property.name);
			expr = expr.object;
		}
		if(expr.type == "Identifier" && this.scope.definitions.indexOf(expr.name) == -1) {
			exprName.unshift(expr.name);
			exprName = exprName.join(".");
			var result = this.applyPluginsBailResult("expression " + exprName, expression);
			if(result === true)
				break;
		}
		this.walkExpression(expression.object);
		if(expression.property.type !== "Identifier")
			this.walkExpression(expression.property);
		break;
	case "Identifier":
		if(this.scope.definitions.indexOf(expression.name) == -1) {
			var result = this.applyPluginsBailResult("expression " + expression.name, expression);
			if(result === true)
				break;
		}
		break;
	}
}

Parser.prototype.inScope = function inScope(params, fn) {
	var oldScope = this.scope;
	this.scope = {
		inTry: false,
		definitions: oldScope.definitions.slice()
	};
	params.forEach(function(param) {
		if(typeof param !== "string") {
			if(param.type !== "Identifier")
				return;
			param = param.name;
		}
		this.scope.definitions.push(param);
	}, this);
	fn();
	this.scope = oldScope;
}

Parser.prototype.evaluateExpression = function evaluateExpression(expression) {
	var result = this.applyPluginsBailResult("evaluate " + expression.type, expression);
	if(result !== undefined)
		return result;
	return new BasicEvaluatedExpression().setRange(expression.range);
}

Parser.prototype.parseString = function parseString(expression) {
	switch(expression.type) {
	case "BinaryExpression":
		if(expression.operator == "+")
			return this.parseString(expression.left) + this.parseString(expression.right);
		break;
	case "Literal":
		return expression.value+"";
	}
	throw new Error(expression.type + " is not supported as parameter for require");
}

Parser.prototype.parseCalculatedString = function parseCalculatedString(expression) {
	switch(expression.type) {
	case "BinaryExpression":
		if(expression.operator == "+") {
			var left = this.parseCalculatedString(expression.left);
			var right = this.parseCalculatedString(expression.right);
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
		var consequent = this.parseCalculatedString(expression.consequent);
		var alternate = this.parseCalculatedString(expression.alternate);
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

Parser.prototype.parseStringArray = function parseStringArray(expression) {
	switch(expression.type) {
	case "ArrayExpression":
		var arr = [];
		if(expression.elements)
			expression.elements.forEach(function(expr) {
				arr.push(this.parseString(expr));
			}, this);
		return arr;
	}
	return [this.parseString(expression)];
}

Parser.prototype.parseCalculatedStringArray = function parseCalculatedStringArray(expression) {
	switch(expression.type) {
	case "ArrayExpression":
		var arr = [];
		if(expression.elements)
			expression.elements.forEach(function(expr) {
				arr.push(this.parseCalculatedString(expr));
			}, this);
		return arr;
	}
	return [this.parseCalculatedString(expression)];
}

Parser.prototype.parse = function parse(source, initialState) {
	var ast = esprima.parse(source, {range: true, loc: true, raw: true});
	if(!ast || typeof ast != "object")
		throw new Error("Source couldn't be parsed");
	var oldScope = this.scope;
	var oldState = this.state;
	this.scope = {
		inTry: false,
		definitions: []
	};
	var state = this.state = initialState || {};
	this.walkStatements(ast.body);
	this.scope = oldScope;
	this.state = oldState;
	return state;
}
