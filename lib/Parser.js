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
Parser.prototype.constructor = Parser;

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
		if(expr.value === null)
			return new BasicEvaluatedExpression().setNull().setRange(expr.range);
		if(expr.value instanceof RegExp)
			return new BasicEvaluatedExpression().setRegExp(expr.value).setRange(expr.range);
	});
	this.plugin("evaluate LogicalExpression", function(expr) {
		if(expr.operator === "&&") {
			var left = this.evaluateExpression(expr.left);
			var leftAsBool = left && left.asBool();
			if(leftAsBool === false) return left.setRange(expr.range);
			if(leftAsBool !== true) return;
			var right = this.evaluateExpression(expr.right);
			return right.setRange(expr.range);
		} else if(expr.operator === "||") {
			var left = this.evaluateExpression(expr.left);
			var leftAsBool = left && left.asBool();
			if(leftAsBool === true) return left.setRange(expr.range);
			if(leftAsBool !== false) return;
			var right = this.evaluateExpression(expr.right);
			return right.setRange(expr.range);
		}
	});
	this.plugin("evaluate BinaryExpression", function(expr) {
		if(expr.operator === "+") {
			var left = this.evaluateExpression(expr.left);
			var right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			var res = new BasicEvaluatedExpression();
			if(left.isString()) {
				if(right.isString()) {
					res.setString(left.string + right.string);
				} else if(right.isNumber()) {
					res.setString(left.string + right.number);
				} else if(right.isWrapped() && right.prefix && right.prefix.isString()) {
					res.setWrapped(
						new BasicEvaluatedExpression()
						.setString(left.string + right.prefix.string)
						.setRange(joinRanges(left.range, right.prefix.range)),
						right.postfix);
				} else {
					res.setWrapped(left, null);
				}
			} else if(left.isNumber()) {
				if(right.isString()) {
					res.setString(left.number + right.string);
				} else if(right.isNumber()) {
					res.setNumber(left.number + right.number);
				}
			} else if(left.isWrapped()) {
				if(left.postfix && left.postfix.isString() && right.isString()) {
					res.setWrapped(left.prefix,
						new BasicEvaluatedExpression()
						.setString(left.postfix.string + right.string)
						.setRange(joinRanges(left.postfix.range, right.range))
					);
				} else if(left.postfix && left.postfix.isString() && right.isNumber()) {
					res.setWrapped(left.prefix,
						new BasicEvaluatedExpression()
						.setString(left.postfix.string + right.number)
						.setRange(joinRanges(left.postfix.range, right.range))
					);
				} else if(right.isString()) {
					res.setWrapped(left.prefix, right);
				} else if(right.isNumber()) {
					res.setWrapped(left.prefix,
						new BasicEvaluatedExpression()
						.setString(right.number + "")
						.setRange(right.range));
				} else {
					res.setWrapped(left.prefix, new BasicEvaluatedExpression());
				}
			} else {
				if(right.isString()) {
					res.setWrapped(null, right);
				}
			}
			res.setRange(expr.range);
			return res;
		} else if(expr.operator === "-") {
			var left = this.evaluateExpression(expr.left);
			var right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			if(!left.isNumber() || !right.isNumber()) return;
			var res = new BasicEvaluatedExpression();
			res.setNumber(left.number - right.number);
			res.setRange(expr.range);
			return res;
		} else if(expr.operator === "*") {
			var left = this.evaluateExpression(expr.left);
			var right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			if(!left.isNumber() || !right.isNumber()) return;
			var res = new BasicEvaluatedExpression();
			res.setNumber(left.number * right.number);
			res.setRange(expr.range);
			return res;
		} else if(expr.operator === "/") {
			var left = this.evaluateExpression(expr.left);
			var right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			if(!left.isNumber() || !right.isNumber()) return;
			var res = new BasicEvaluatedExpression();
			res.setNumber(left.number / right.number);
			res.setRange(expr.range);
			return res;
		} else if(expr.operator === "==" || expr.operator === "===") {
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
		} else if(expr.operator === "!=" || expr.operator === "!==") {
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
		if(expr.operator === "typeof") {
			if(expr.argument.type === "Identifier") {
				var name = this.scope.renames["$" + expr.argument.name] || expr.argument.name;
				if(this.scope.definitions.indexOf(name) === -1) {
					var res = this.applyPluginsBailResult("evaluate typeof " + name, expr);
					if(res !== undefined) return res;
				}
			}
			if(expr.argument.type === "MemberExpression") {
				var expression = expr.argument;
				var exprName = [];
				while(expression.type === "MemberExpression" && !expression.computed) {
					exprName.unshift(this.scope.renames["$" + expression.property.name] || expression.property.name);
					expression = expression.object;
				}
				if(expression.type === "Identifier") {
					exprName.unshift(this.scope.renames["$" + expression.name] || expression.name);
					if(this.scope.definitions.indexOf(name) === -1) {
						exprName = exprName.join(".");
						var res = this.applyPluginsBailResult("evaluate typeof " + exprName, expr);
						if(res !== undefined) return res;
					}
				}
			}
			if(expr.argument.type === "FunctionExpression") {
				return new BasicEvaluatedExpression().setString("function").setRange(expr.range);
			}
			var arg = this.evaluateExpression(expr.argument);
			if(arg.isString() || arg.isWrapped()) return new BasicEvaluatedExpression().setString("string").setRange(expr.range);
			else if(arg.isNumber()) return new BasicEvaluatedExpression().setString("number").setRange(expr.range);
			else if(arg.isBoolean()) return new BasicEvaluatedExpression().setString("boolean").setRange(expr.range);
			else if(arg.isArray() || arg.isConstArray() || arg.isRegExp()) return new BasicEvaluatedExpression().setString("object").setRange(expr.range);
		} else if(expr.operator === "!") {
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
	this.plugin("evaluate typeof undefined", function(expr) {
		return new BasicEvaluatedExpression().setString("undefined").setRange(expr.range);
	});
	this.plugin("evaluate Identifier", function(expr) {
		var name = this.scope.renames["$" + expr.name] || expr.name;
		if(this.scope.definitions.indexOf(expr.name) === -1) {
			var result = this.applyPluginsBailResult("evaluate Identifier " + name, expr);
			if(result) return result;
			return new BasicEvaluatedExpression().setIdentifier(name).setRange(expr.range);
		} else {
			return this.applyPluginsBailResult("evaluate defined Identifier " + name, expr);
		}
	});
	this.plugin("evaluate MemberExpression", function(expression) {
		var expr = expression;
		var exprName = [];
		while(expr.type === "MemberExpression" && !expr.computed) {
			exprName.unshift(expr.property.name);
			expr = expr.object;
		}
		if(expr.type === "Identifier") {
			var name = this.scope.renames["$" + expr.name] || expr.name;
			if(this.scope.definitions.indexOf(name) === -1) {
				exprName.unshift(name);
				exprName = exprName.join(".");
				if(this.scope.definitions.indexOf(expr.name) === -1) {
					var result = this.applyPluginsBailResult("evaluate Identifier " + exprName, expression);
					if(result) return result;
					return new BasicEvaluatedExpression().setIdentifier(exprName).setRange(expression.range);
				} else {
					return this.applyPluginsBailResult("evaluate defined Identifier " + exprName, expression);
				}
			}
		}
	});
	this.plugin("evaluate CallExpression", function(expr) {
		if(expr.callee.type !== "MemberExpression") return;
		if(expr.callee.computed) return;
		var param = this.evaluateExpression(expr.callee.object);
		if(!param) return;
		return this.applyPluginsBailResult("evaluate CallExpression ." + expr.callee.property.name, expr, param);
	});
	this.plugin("evaluate CallExpression .replace", function(expr, param) {
		if(!param.isString()) return;
		if(expr.arguments.length !== 2) return;
		var arg1 = this.evaluateExpression(expr.arguments[0]);
		var arg2 = this.evaluateExpression(expr.arguments[1]);
		if(!arg1.isString() && !arg1.isRegExp()) return;
		arg1 = arg1.regExp || arg1.string;
		if(!arg2.isString()) return;
		arg2 = arg2.string;
		return new BasicEvaluatedExpression().setString(param.string.replace(arg1, arg2)).setRange(expr.range);
	});
	["substr", "substring"].forEach(function(fn) {
		this.plugin("evaluate CallExpression ." + fn, function(expr, param) {
			if(!param.isString()) return;
			var result, str = param.string;
			switch(expr.arguments.length) {
				case 1:
					var arg1 = this.evaluateExpression(expr.arguments[0]);
					if(!arg1.isNumber()) return;
					result = str[fn](arg1.number);
					break;
				case 2:
					var arg1 = this.evaluateExpression(expr.arguments[0]);
					var arg2 = this.evaluateExpression(expr.arguments[1]);
					if(!arg1.isNumber()) return;
					if(!arg2.isNumber()) return;
					result = str[fn](arg1.number, arg2.number);
					break;
				default:
					return;
			}
			return new BasicEvaluatedExpression().setString(result).setRange(expr.range);
		});
	}, this);
	this.plugin("evaluate CallExpression .split", function(expr, param) {
		if(!param.isString()) return;
		if(expr.arguments.length !== 1) return;
		var result;
		var arg = this.evaluateExpression(expr.arguments[0]);
		if(arg.isString()) {
			result = param.string.split(arg.string);
		} else if(arg.isRegExp()) {
			result = param.string.split(arg.regExp);
		} else return;
		return new BasicEvaluatedExpression().setArray(result).setRange(expr.range);
	});
	this.plugin("evaluate ConditionalExpression", function(expr) {
		var condition = this.evaluateExpression(expr.test);
		var conditionValue = condition.asBool();
		if(conditionValue === undefined) {
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
		} else {
			var res = this.evaluateExpression(conditionValue ? expr.consequent : expr.alternate);
		}
		res.setRange(expr.range);
		return res;
	});
	this.plugin("evaluate ArrayExpression", function(expr) {
		var items = expr.elements.map(function(element) {
			return element !== null && this.evaluateExpression(element);
		}, this);
		if(items.filter(function(i) {
				return !i;
			}).length > 0) return;
		return new BasicEvaluatedExpression().setItems(items).setRange(expr.range);
	});
};

Parser.prototype.getRenameIdentifier = function getRenameIdentifier(expr) {
	var result = this.evaluateExpression(expr);
	if(!result) return;
	if(result.isIdentifier()) return result.identifier;
	return;
};

Parser.prototype.walkStatements = function walkStatements(statements) {
	statements.forEach(function(statement) {
		this.walkStatement(statement);
	}, this);
};

Parser.prototype.walkStatement = function walkStatement(statement) {
	if(this.applyPluginsBailResult("statement", statement) !== undefined) return;
	if(this["walk" + statement.type])
		this["walk" + statement.type](statement);
};

// Real Statements
Parser.prototype.walkBlockStatement = function walkBlockStatement(statement) {
	this.walkStatements(statement.body);
};

Parser.prototype.walkExpressionStatement = function walkExpressionStatement(statement) {
	this.walkExpression(statement.expression);
};

Parser.prototype.walkIfStatement = function walkIfStatement(statement) {
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
};

Parser.prototype.walkLabeledStatement = function walkLabeledStatement(statement) {
	var result = this.applyPluginsBailResult("label " + statement.label.name, statement);
	if(result !== true)
		this.walkStatement(statement.body);
};

Parser.prototype.walkWithStatement = function walkWithStatement(statement) {
	this.walkExpression(statement.object);
	this.walkStatement(statement.body);
};

Parser.prototype.walkSwitchStatement = function walkSwitchStatement(statement) {
	this.walkExpression(statement.discriminant);
	this.walkSwitchCases(statement.cases);
};

Parser.prototype.walkReturnStatement =
	Parser.prototype.walkThrowStatement = function walkArgumentStatement(statement) {
		if(statement.argument)
			this.walkExpression(statement.argument);
	};

Parser.prototype.walkTryStatement = function walkTryStatement(statement) {
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
};

Parser.prototype.walkWhileStatement =
	Parser.prototype.walkDoWhileStatement = function walkLoopStatement(statement) {
		this.walkExpression(statement.test);
		this.walkStatement(statement.body);
	};

Parser.prototype.walkForStatement = function walkForStatement(statement) {
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
};

Parser.prototype.walkForInStatement = function walkForInStatement(statement) {
	if(statement.left.type === "VariableDeclaration")
		this.walkStatement(statement.left);
	else
		this.walkExpression(statement.left);
	this.walkExpression(statement.right);
	this.walkStatement(statement.body);
};

// Declarations
Parser.prototype.walkFunctionDeclaration = function walkFunctionDeclaration(statement) {
	this.scope.renames["$" + statement.id.name] = undefined;
	this.scope.definitions.push(statement.id.name);
	this.inScope(statement.params, function() {
		if(statement.body.type === "BlockStatement")
			this.walkStatement(statement.body);
		else
			this.walkExpression(statement.body);
	}.bind(this));
};

Parser.prototype.walkVariableDeclaration = function walkVariableDeclaration(statement) {
	if(statement.declarations)
		this.walkVariableDeclarators(statement.declarations);
};

Parser.prototype.walkSwitchCases = function walkSwitchCases(switchCases) {
	switchCases.forEach(function(switchCase) {
		if(switchCase.test)
			this.walkExpression(switchCase.test);
		this.walkStatements(switchCase.consequent);
	}, this);
};

Parser.prototype.walkCatchClauses = function walkCatchClauses(catchClauses) {
	catchClauses.forEach(function(catchClause) {
		if(catchClause.guard)
			this.walkExpression(catchClause.guard);
		this.inScope([catchClause.param], function() {
			this.walkStatement(catchClause.body);
		}.bind(this));
	}, this);
};

Parser.prototype.walkVariableDeclarators = function walkVariableDeclarators(declarators) {
	declarators.forEach(function(declarator) {
		switch(declarator.type) {
			case "VariableDeclarator":
				var renameIdentifier = declarator.init && this.getRenameIdentifier(declarator.init);
				if(renameIdentifier && declarator.id.type === "Identifier" && this.applyPluginsBailResult("can-rename " + renameIdentifier, declarator.init)) {
					// renaming with "var a = b;"
					if(!this.applyPluginsBailResult("rename " + renameIdentifier, declarator.init)) {
						this.scope.renames["$" + declarator.id.name] = this.scope.renames["$" + renameIdentifier] || renameIdentifier;
						var idx = this.scope.definitions.indexOf(declarator.id.name);
						if(idx >= 0) this.scope.definitions.splice(idx, 1);
					}
				} else if(declarator.id.type === "Identifier" && !this.applyPluginsBailResult("var " + declarator.id.name, declarator)) {
					this.scope.renames["$" + declarator.id.name] = undefined;
					this.scope.definitions.push(declarator.id.name);
					if(declarator.init)
						this.walkExpression(declarator.init);
				} else {
					this.walkExpression(declarator.id);
					if(declarator.init)
						this.walkExpression(declarator.init);
				}
				break;
		}
	}, this);
};

Parser.prototype.walkExpressions = function walkExpressions(expressions) {
	expressions.forEach(function(expression) {
		if(expression)
			this.walkExpression(expression);
	}, this);
};

Parser.prototype.walkExpression = function walkExpression(expression) {
	if(this["walk" + expression.type])
		return this["walk" + expression.type](expression);
};

Parser.prototype.walkArrayExpression = function walkArrayExpression(expression) {
	if(expression.elements)
		this.walkExpressions(expression.elements);
};

Parser.prototype.walkObjectExpression = function walkObjectExpression(expression) {
	expression.properties.forEach(function(prop) {
		this.walkExpression(prop.value);
	}, this);
};

Parser.prototype.walkFunctionExpression = function walkFunctionExpression(expression) {
	this.inScope(expression.params, function() {
		if(expression.body.type === "BlockStatement")
			this.walkStatement(expression.body);
		else
			this.walkExpression(expression.body);
	}.bind(this));
};

Parser.prototype.walkSequenceExpression = function walkSequenceExpression(expression) {
	if(expression.expressions)
		this.walkExpressions(expression.expressions);
};

Parser.prototype.walkUpdateExpression = function walkUpdateExpression(expression) {
	this.walkExpression(expression.argument);
};

Parser.prototype.walkUnaryExpression = function walkUnaryExpression(expression) {
	if(expression.operator === "typeof") {
		var expr = expression.argument;
		var exprName = [];
		while(expr.type === "MemberExpression" && !expr.computed) {
			exprName.unshift(expr.property.name);
			expr = expr.object;
		}
		if(expr.type === "Identifier" && this.scope.definitions.indexOf(expr.name) === -1) {
			exprName.unshift(this.scope.renames["$" + expr.name] || expr.name);
			exprName = exprName.join(".");
			var result = this.applyPluginsBailResult("typeof " + exprName, expression);
			if(result === true)
				return;
		}
	}
	this.walkExpression(expression.argument);
};

Parser.prototype.walkBinaryExpression =
	Parser.prototype.walkLogicalExpression = function walkLeftRightExpression(expression) {
		this.walkExpression(expression.left);
		this.walkExpression(expression.right);
	};

Parser.prototype.walkAssignmentExpression = function walkAssignmentExpression(expression) {
	var renameIdentifier = this.getRenameIdentifier(expression.right);
	if(expression.left.type === "Identifier" && renameIdentifier && this.applyPluginsBailResult("can-rename " + renameIdentifier, expression.right)) {
		// renaming "a = b;"
		if(!this.applyPluginsBailResult("rename " + renameIdentifier, expression.right)) {
			this.scope.renames["$" + expression.left.name] = renameIdentifier;
			var idx = this.scope.definitions.indexOf(expression.left.name);
			if(idx >= 0) this.scope.definitions.splice(idx, 1);
		}
	} else if(expression.left.type === "Identifier") {
		if(!this.applyPluginsBailResult("assigned " + expression.left.name, expression)) {
			this.walkExpression(expression.right);
		}
		this.scope.renames["$" + expression.left.name] = undefined;
		if(!this.applyPluginsBailResult("assign " + expression.left.name, expression)) {
			this.walkExpression(expression.left);
		}
	} else {
		this.walkExpression(expression.right);
		this.scope.renames["$" + expression.left.name] = undefined;
		this.walkExpression(expression.left);
	}
};

Parser.prototype.walkConditionalExpression = function walkConditionalExpression(expression) {
	var result = this.applyPluginsBailResult("expression ?:", expression);
	if(result === undefined) {
		this.walkExpression(expression.test);
		this.walkExpression(expression.consequent);
		if(expression.alternate)
			this.walkExpression(expression.alternate);
	} else {
		if(result)
			this.walkExpression(expression.consequent);
		else if(expression.alternate)
			this.walkExpression(expression.alternate);
	}
};

Parser.prototype.walkNewExpression = function walkNewExpression(expression) {
	this.walkExpression(expression.callee);
	if(expression.arguments)
		this.walkExpressions(expression.arguments);
};

Parser.prototype.walkCallExpression = function walkCallExpression(expression) {
	function walkIIFE(functionExpression, args) {
		var params = functionExpression.params;
		var args = args.map(function(arg) {
			var renameIdentifier = this.getRenameIdentifier(arg);
			if(renameIdentifier && this.applyPluginsBailResult("can-rename " + renameIdentifier, arg)) {
				if(!this.applyPluginsBailResult("rename " + renameIdentifier, arg))
					return renameIdentifier;
			}
			this.walkExpression(arg);
		}, this);
		this.inScope(params.filter(function(identifier, idx) {
			return !args[idx];
		}), function() {
			args.forEach(function(arg, idx) {
				if(!arg) return;
				if(!params[idx] || params[idx].type !== "Identifier") return;
				this.scope.renames["$" + params[idx].name] = arg;
			}, this);
			if(functionExpression.body.type === "BlockStatement")
				this.walkStatement(functionExpression.body);
			else
				this.walkExpression(functionExpression.body);
		}.bind(this));
	}
	if(expression.callee.type === "MemberExpression" && expression.callee.object.type === "FunctionExpression" && !expression.callee.computed && ["call", "bind"].indexOf(expression.callee.property.name) >= 0 && expression.arguments && expression.arguments.length > 1) {
		// (function(...) { }.call/bind(?, ...))
		walkIIFE.call(this, expression.callee.object, expression.arguments.slice(1));
		this.walkExpression(expression.arguments[0]);
	} else if(expression.callee.type === "FunctionExpression" && expression.arguments) {
		// (function(...) { }(...))
		walkIIFE.call(this, expression.callee, expression.arguments);
	} else {

		var callee = this.evaluateExpression(expression.callee);
		if(callee.isIdentifier()) {
			var result = this.applyPluginsBailResult("call " + callee.identifier, expression);
			if(result === true)
				return;
		}

		if(expression.callee)
			this.walkExpression(expression.callee);
		if(expression.arguments)
			this.walkExpressions(expression.arguments);
	}
};

Parser.prototype.walkMemberExpression = function walkMemberExpression(expression) {
	var expr = expression;
	var exprName = [];
	while(expr.type === "MemberExpression" && !expr.computed) {
		exprName.unshift(expr.property.name);
		expr = expr.object;
	}
	if(expr.type === "Identifier" && this.scope.definitions.indexOf(expr.name) === -1) {
		exprName.unshift(this.scope.renames["$" + expr.name] || expr.name);
		exprName = exprName.join(".");
		var result = this.applyPluginsBailResult("expression " + exprName, expression);
		if(result === true)
			return;
	}
	this.walkExpression(expression.object);
	if(expression.computed === true)
		this.walkExpression(expression.property);
};

Parser.prototype.walkIdentifier = function walkIdentifier(expression) {
	if(this.scope.definitions.indexOf(expression.name) === -1) {
		var result = this.applyPluginsBailResult("expression " + (this.scope.renames["$" + expression.name] || expression.name), expression);
		if(result === true)
			return;
	}
};

Parser.prototype.inScope = function inScope(params, fn) {
	var oldScope = this.scope;
	this.scope = {
		inTry: false,
		definitions: oldScope.definitions.slice(),
		renames: Object.create(oldScope.renames)
	};
	params.forEach(function(param) {
		if(typeof param !== "string") {
			if(param.type !== "Identifier")
				return;
			param = param.name;
		}
		this.scope.renames["$" + param] = undefined;
		this.scope.definitions.push(param);
	}, this);
	fn();
	this.scope = oldScope;
};

Parser.prototype.evaluateExpression = function evaluateExpression(expression) {
	var result = this.applyPluginsBailResult("evaluate " + expression.type, expression);
	if(result !== undefined)
		return result;
	return new BasicEvaluatedExpression().setRange(expression.range);
};

Parser.prototype.parseString = function parseString(expression) {
	switch(expression.type) {
		case "BinaryExpression":
			if(expression.operator === "+")
				return this.parseString(expression.left) + this.parseString(expression.right);
			break;
		case "Literal":
			return expression.value + "";
	}
	throw new Error(expression.type + " is not supported as parameter for require");
};

Parser.prototype.parseCalculatedString = function parseCalculatedString(expression) {
	switch(expression.type) {
		case "BinaryExpression":
			if(expression.operator === "+") {
				var left = this.parseCalculatedString(expression.left);
				var right = this.parseCalculatedString(expression.right);
				if(left.code) {
					return {
						range: left.range,
						value: left.value,
						code: true
					};
				} else if(right.code) {
					return {
						range: [left.range[0], right.range ? right.range[1] : left.range[1]],
						value: left.value + right.value,
						code: true
					};
				} else {
					return {
						range: [left.range[0], right.range[1]],
						value: left.value + right.value
					};
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
			return {
				value: "",
				code: true,
				conditional: items
			};
		case "Literal":
			return {
				range: expression.range,
				value: expression.value + ""
			};
	}
	return {
		value: "",
		code: true
	};
};

["parseString", "parseCalculatedString"].forEach(function(fn) {
	Parser.prototype[fn + "Array"] = function parseXXXArray(expression) {
		switch(expression.type) {
			case "ArrayExpression":
				var arr = [];
				if(expression.elements)
					expression.elements.forEach(function(expr) {
						arr.push(this[fn](expr));
					}, this);
				return arr;
		}
		return [this[fn](expression)];
	};
});

Parser.prototype.parse = function parse(source, initialState) {
	var ast = esprima.parse(source, {
		range: true,
		loc: true,
		raw: true
	});
	if(!ast || typeof ast !== "object")
		throw new Error("Source couldn't be parsed");
	var oldScope = this.scope;
	var oldState = this.state;
	this.scope = {
		inTry: false,
		definitions: [],
		renames: {}
	};
	var state = this.state = initialState || {};
	if(this.applyPluginsBailResult("program", ast) === undefined)
		this.walkStatements(ast.body);
	this.scope = oldScope;
	this.state = oldState;
	return state;
};

Parser.prototype.evaluate = function evaluate(source) {
	var ast = esprima.parse("(" + source + ")", {
		range: true,
		loc: true,
		raw: true
	});
	if(!ast || typeof ast !== "object" || ast.type !== "Program")
		throw new Error("evaluate: Source couldn't be parsed");
	if(ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement")
		throw new Error("evaluate: Source is not a expression");
	return this.evaluateExpression(ast.body[0].expression);
};
