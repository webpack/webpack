/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
var acorn = require("acorn-dynamic-import").default;
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
		var left;
		var leftAsBool;
		var right;
		if(expr.operator === "&&") {
			left = this.evaluateExpression(expr.left);
			leftAsBool = left && left.asBool();
			if(leftAsBool === false) return left.setRange(expr.range);
			if(leftAsBool !== true) return;
			right = this.evaluateExpression(expr.right);
			return right.setRange(expr.range);
		} else if(expr.operator === "||") {
			left = this.evaluateExpression(expr.left);
			leftAsBool = left && left.asBool();
			if(leftAsBool === true) return left.setRange(expr.range);
			if(leftAsBool !== false) return;
			right = this.evaluateExpression(expr.right);
			return right.setRange(expr.range);
		}
	});
	this.plugin("evaluate BinaryExpression", function(expr) {
		var left;
		var right;
		var res;
		if(expr.operator === "+") {
			left = this.evaluateExpression(expr.left);
			right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			res = new BasicEvaluatedExpression();
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
			left = this.evaluateExpression(expr.left);
			right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			if(!left.isNumber() || !right.isNumber()) return;
			res = new BasicEvaluatedExpression();
			res.setNumber(left.number - right.number);
			res.setRange(expr.range);
			return res;
		} else if(expr.operator === "*") {
			left = this.evaluateExpression(expr.left);
			right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			if(!left.isNumber() || !right.isNumber()) return;
			res = new BasicEvaluatedExpression();
			res.setNumber(left.number * right.number);
			res.setRange(expr.range);
			return res;
		} else if(expr.operator === "/") {
			left = this.evaluateExpression(expr.left);
			right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			if(!left.isNumber() || !right.isNumber()) return;
			res = new BasicEvaluatedExpression();
			res.setNumber(left.number / right.number);
			res.setRange(expr.range);
			return res;
		} else if(expr.operator === "==" || expr.operator === "===") {
			left = this.evaluateExpression(expr.left);
			right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			res = new BasicEvaluatedExpression();
			res.setRange(expr.range);
			if(left.isString() && right.isString()) {
				return res.setBoolean(left.string === right.string);
			} else if(left.isNumber() && right.isNumber()) {
				return res.setBoolean(left.number === right.number);
			} else if(left.isBoolean() && right.isBoolean()) {
				return res.setBoolean(left.bool === right.bool);
			}
		} else if(expr.operator === "!=" || expr.operator === "!==") {
			left = this.evaluateExpression(expr.left);
			right = this.evaluateExpression(expr.right);
			if(!left || !right) return;
			res = new BasicEvaluatedExpression();
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
			var res;
			if(expr.argument.type === "Identifier") {
				var name = this.scope.renames["$" + expr.argument.name] || expr.argument.name;
				if(this.scope.definitions.indexOf(name) === -1) {
					res = this.applyPluginsBailResult1("evaluate typeof " + name, expr);
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
						res = this.applyPluginsBailResult1("evaluate typeof " + exprName, expr);
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
			var result = this.applyPluginsBailResult1("evaluate Identifier " + name, expr);
			if(result) return result;
			return new BasicEvaluatedExpression().setIdentifier(name).setRange(expr.range);
		} else {
			return this.applyPluginsBailResult1("evaluate defined Identifier " + name, expr);
		}
	});
	this.plugin("evaluate MemberExpression", function(expression) {
		var expr = expression;
		var exprName = [];
		while(expr.type === "MemberExpression" &&
			expr.property.type === (expr.computed ? "Literal" : "Identifier")
		) {
			exprName.unshift(expr.property.name || expr.property.value);
			expr = expr.object;
		}
		if(expr.type === "Identifier") {
			var name = this.scope.renames["$" + expr.name] || expr.name;
			if(this.scope.definitions.indexOf(name) === -1) {
				exprName.unshift(name);
				exprName = exprName.join(".");
				if(this.scope.definitions.indexOf(expr.name) === -1) {
					var result = this.applyPluginsBailResult1("evaluate Identifier " + exprName, expression);
					if(result) return result;
					return new BasicEvaluatedExpression().setIdentifier(exprName).setRange(expression.range);
				} else {
					return this.applyPluginsBailResult1("evaluate defined Identifier " + exprName, expression);
				}
			}
		}
	});
	this.plugin("evaluate CallExpression", function(expr) {
		if(expr.callee.type !== "MemberExpression") return;
		if(expr.callee.property.type !== (expr.callee.computed ? "Literal" : "Identifier")) return;
		var param = this.evaluateExpression(expr.callee.object);
		if(!param) return;
		var property = expr.callee.property.name || expr.callee.property.value;
		return this.applyPluginsBailResult("evaluate CallExpression ." + property, expr, param);
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
			var arg1;
			var result, str = param.string;
			switch(expr.arguments.length) {
				case 1:
					arg1 = this.evaluateExpression(expr.arguments[0]);
					if(!arg1.isNumber()) return;
					result = str[fn](arg1.number);
					break;
				case 2:
					arg1 = this.evaluateExpression(expr.arguments[0]);
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

		/**
		 * @param {string} kind "cooked" | "raw"
		 * @param {any[]} quasis quasis
		 * @param {any[]} expressions expressions
		 * @return {BasicEvaluatedExpression[]} Simplified template
		 */
		function getSimplifiedTemplateResult(kind, quasis, expressions) {
			var i = 0;
			var parts = [];

			for(i = 0; i < quasis.length; i++) {
				parts.push(new BasicEvaluatedExpression().setString(quasis[i].value[kind]).setRange(quasis[i].range));

				if(i > 0) {
					var prevExpr = parts[parts.length - 2],
						lastExpr = parts[parts.length - 1];
					var expr = this.evaluateExpression(expressions[i - 1]);
					if(!(expr.isString() || expr.isNumber())) continue;

					prevExpr.setString(prevExpr.string + (expr.isString() ? expr.string : expr.number) + lastExpr.string);
					prevExpr.setRange([prevExpr.range[0], lastExpr.range[1]]);
					parts.pop();
				}
			}
			return parts;
		}

		this.plugin("evaluate TemplateLiteral", function(node) {
			var parts = getSimplifiedTemplateResult.call(this, "cooked", node.quasis, node.expressions);
			if(parts.length === 1) {
				return parts[0].setRange(node.range);
			}
			return new BasicEvaluatedExpression().setTemplateString(parts).setRange(node.range);
		});
		this.plugin("evaluate TaggedTemplateExpression", function(node) {
			if(this.evaluateExpression(node.tag).identifier !== "String.raw") return;
			var parts = getSimplifiedTemplateResult.call(this, "raw", node.quasi.quasis, node.quasi.expressions);
			return new BasicEvaluatedExpression().setTemplateString(parts).setRange(node.range);
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
		var res;
		if(conditionValue === undefined) {
			var consequent = this.evaluateExpression(expr.consequent);
			var alternate = this.evaluateExpression(expr.alternate);
			if(!consequent || !alternate) return;
			res = new BasicEvaluatedExpression();
			if(consequent.isConditional())
				res.setOptions(consequent.options);
			else
				res.setOptions([consequent]);
			if(alternate.isConditional())
				res.addOptions(alternate.options);
			else
				res.addOptions([alternate]);
		} else {
			res = this.evaluateExpression(conditionValue ? expr.consequent : expr.alternate);
		}
		res.setRange(expr.range);
		return res;
	});
	this.plugin("evaluate ArrayExpression", function(expr) {
		var items = expr.elements.map(function(element) {
			return element !== null && this.evaluateExpression(element);
		}, this);
		if(!items.every(Boolean)) return;
		return new BasicEvaluatedExpression().setItems(items).setRange(expr.range);
	});
};

Parser.prototype.getRenameIdentifier = function getRenameIdentifier(expr) {
	var result = this.evaluateExpression(expr);
	if(!result) return;
	if(result.isIdentifier()) return result.identifier;
	return;
};

Parser.prototype.walkClass = function walkClass(classy) {
	if(classy.superClass)
		this.walkExpression(classy.superClass);
	if(classy.body && classy.body.type === "ClassBody") {
		classy.body.body.forEach(function(methodDefinition) {
			if(methodDefinition.type === "MethodDefinition")
				this.walkMethodDefinition(methodDefinition);
		}, this);
	}
};

Parser.prototype.walkMethodDefinition = function walkMethodDefinition(methodDefinition) {
	if(methodDefinition.computed && methodDefinition.key)
		this.walkExpression(methodDefinition.key);
	if(methodDefinition.value)
		this.walkExpression(methodDefinition.value);
};

Parser.prototype.walkStatements = function walkStatements(statements) {
	for(var indexA = 0, lenA = statements.length; indexA < lenA; indexA++) {
		var statementA = statements[indexA];
		if(this.isHoistedStatement(statementA))
			this.walkStatement(statementA);
	}
	for(var indexB = 0, lenB = statements.length; indexB < lenB; indexB++) {
		var statementB = statements[indexB];
		if(!this.isHoistedStatement(statementB))
			this.walkStatement(statementB);
	}
};

Parser.prototype.isHoistedStatement = function isHoistedStatement(statement) {
	switch(statement.type) {
		case "ImportDeclaration":
		case "ExportAllDeclaration":
		case "ExportNamedDeclaration":
			return true;
	}
	return false;
};

Parser.prototype.walkStatement = function walkStatement(statement) {
	if(this.applyPluginsBailResult1("statement", statement) !== undefined) return;
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
	var result = this.applyPluginsBailResult1("statement if", statement);
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
	var result = this.applyPluginsBailResult1("label " + statement.label.name, statement);
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
	if(statement.handler)
		this.walkCatchClause(statement.handler);
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

Parser.prototype.walkForOfStatement = function walkForOfStatement(statement) {
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

Parser.prototype.walkImportDeclaration = function walkImportDeclaration(statement) {
	var source = statement.source.value;
	this.applyPluginsBailResult("import", statement, source);
	statement.specifiers.forEach(function(specifier) {
		var name = specifier.local.name;
		this.scope.renames["$" + name] = undefined;
		this.scope.definitions.push(name);
		switch(specifier.type) {
			case "ImportDefaultSpecifier":
				this.applyPluginsBailResult("import specifier", statement, source, "default", name);
				break;
			case "ImportSpecifier":
				this.applyPluginsBailResult("import specifier", statement, source, specifier.imported.name, name);
				break;
			case "ImportNamespaceSpecifier":
				this.applyPluginsBailResult("import specifier", statement, source, null, name);
				break;
		}
	}, this);
};

Parser.prototype.walkExportNamedDeclaration = function walkExportNamedDeclaration(statement) {
	if(statement.source) {
		var source = statement.source.value;
		this.applyPluginsBailResult("export import", statement, source);
	} else {
		this.applyPluginsBailResult1("export", statement);
	}
	if(statement.declaration) {
		if(/Expression$/.test(statement.declaration.type)) {
			throw new Error("Doesn't occur?");
		} else {
			if(!this.applyPluginsBailResult("export declaration", statement, statement.declaration)) {
				var pos = this.scope.definitions.length;
				this.walkStatement(statement.declaration);
				var newDefs = this.scope.definitions.slice(pos);
				for(var index = newDefs.length - 1; index >= 0; index--) {
					var def = newDefs[index];
					this.applyPluginsBailResult("export specifier", statement, def, def, index);
				}
			}
		}
	}
	if(statement.specifiers) {
		for(var specifierIndex = 0; specifierIndex < statement.specifiers.length; specifierIndex++) {
			var specifier = statement.specifiers[specifierIndex];
			switch(specifier.type) {
				case "ExportSpecifier":
					var name = specifier.exported.name;
					if(source)
						this.applyPluginsBailResult("export import specifier", statement, source, specifier.local.name, name, specifierIndex);
					else
						this.applyPluginsBailResult("export specifier", statement, specifier.local.name, name, specifierIndex);
					break;
			}
		}
	}
};

Parser.prototype.walkExportDefaultDeclaration = function walkExportDefaultDeclaration(statement) {
	this.applyPluginsBailResult1("export", statement);
	if(/Declaration$/.test(statement.declaration.type)) {
		if(!this.applyPluginsBailResult("export declaration", statement, statement.declaration)) {
			var pos = this.scope.definitions.length;
			this.walkStatement(statement.declaration);
			var newDefs = this.scope.definitions.slice(pos);
			for(var index = 0, len = newDefs.length; index < len; index++) {
				var def = newDefs[index];
				this.applyPluginsBailResult("export specifier", statement, def, "default");
			}
		}
	} else {
		this.walkExpression(statement.declaration);
		if(!this.applyPluginsBailResult("export expression", statement, statement.declaration)) {
			this.applyPluginsBailResult("export specifier", statement, statement.declaration, "default");
		}
	}
};

Parser.prototype.walkExportAllDeclaration = function walkExportAllDeclaration(statement) {
	var source = statement.source.value;
	this.applyPluginsBailResult("export import", statement, source);
	this.applyPluginsBailResult("export import specifier", statement, source, null, null, 0);
};

Parser.prototype.walkVariableDeclaration = function walkVariableDeclaration(statement) {
	if(statement.declarations)
		this.walkVariableDeclarators(statement.declarations);
};

Parser.prototype.walkClassDeclaration = function walkClassDeclaration(statement) {
	this.scope.renames["$" + statement.id.name] = undefined;
	this.scope.definitions.push(statement.id.name);
	this.walkClass(statement);
};

Parser.prototype.walkSwitchCases = function walkSwitchCases(switchCases) {
	for(var index = 0, len = switchCases.length; index < len; index++) {
		var switchCase = switchCases[index];

		if(switchCase.test) {
			this.walkExpression(switchCase.test);
		}
		this.walkStatements(switchCase.consequent);
	}
};

Parser.prototype.walkCatchClause = function walkCatchClause(catchClause) {
	if(catchClause.guard)
		this.walkExpression(catchClause.guard);
	this.inScope([catchClause.param], function() {
		this.walkStatement(catchClause.body);
	}.bind(this));
};

Parser.prototype.walkVariableDeclarators = function walkVariableDeclarators(declarators) {
	var _this = this;
	declarators.forEach(function(declarator) {
		switch(declarator.type) {
			case "VariableDeclarator":
				var renameIdentifier = declarator.init && _this.getRenameIdentifier(declarator.init);
				if(renameIdentifier && declarator.id.type === "Identifier" && _this.applyPluginsBailResult1("can-rename " + renameIdentifier, declarator.init)) {
					// renaming with "var a = b;"
					if(!_this.applyPluginsBailResult1("rename " + renameIdentifier, declarator.init)) {
						_this.scope.renames["$" + declarator.id.name] = _this.scope.renames["$" + renameIdentifier] || renameIdentifier;
						var idx = _this.scope.definitions.indexOf(declarator.id.name);
						if(idx >= 0) _this.scope.definitions.splice(idx, 1);
					}
				} else {
					_this.walkPattern(declarator.id);
					_this.enterPattern(declarator.id, function(name, decl) {
						if(!_this.applyPluginsBailResult1("var " + name, decl)) {
							_this.scope.renames["$" + name] = undefined;
							_this.scope.definitions.push(name);
						}
					});
					if(declarator.init)
						_this.walkExpression(declarator.init);
				}
				break;
		}
	});
};

Parser.prototype.walkPattern = function walkPattern(pattern) {
	if(pattern.type === "Identifier")
		return;
	if(this["walk" + pattern.type])
		this["walk" + pattern.type](pattern);
};

Parser.prototype.walkObjectPattern = function walkObjectPattern(pattern) {
	for(var i = 0, len = pattern.properties.length; i < len; i++) {
		var prop = pattern.properties[i];
		if(prop) {
			if(prop.computed)
				this.walkExpression(prop.key);
			if(prop.value)
				this.walkPattern(prop.value);
		}
	}
};

Parser.prototype.walkArrayPattern = function walkArrayPattern(pattern) {
	for(var i = 0, len = pattern.elements.length; i < len; i++) {
		var element = pattern.elements[i];
		if(element)
			this.walkPattern(element);
	}
};

Parser.prototype.walkRestElement = function walkRestElement(pattern) {
	this.walkPattern(pattern.argument);
};

Parser.prototype.walkExpressions = function walkExpressions(expressions) {
	for(var expressionsIndex = 0, len = expressions.length; expressionsIndex < len; expressionsIndex++) {
		var expression = expressions[expressionsIndex];
		if(expression)
			this.walkExpression(expression);
	}
};

Parser.prototype.walkExpression = function walkExpression(expression) {
	if(this["walk" + expression.type])
		return this["walk" + expression.type](expression);
};

Parser.prototype.walkAwaitExpression = function walkAwaitExpression(expression) {
	var argument = expression.argument;
	if(this["walk" + argument.type])
		return this["walk" + argument.type](argument);
};

Parser.prototype.walkArrayExpression = function walkArrayExpression(expression) {
	if(expression.elements)
		this.walkExpressions(expression.elements);
};

Parser.prototype.walkSpreadElement = function walkSpreadElement(expression) {
	if(expression.argument)
		this.walkExpression(expression.argument);
};

Parser.prototype.walkObjectExpression = function walkObjectExpression(expression) {
	for(var propIndex = 0, len = expression.properties.length; propIndex < len; propIndex++) {
		var prop = expression.properties[propIndex];
		if(prop.computed)
			this.walkExpression(prop.key);
		if(prop.shorthand)
			this.scope.inShorthand = true;
		this.walkExpression(prop.value);
		if(prop.shorthand)
			this.scope.inShorthand = false;
	}
};

Parser.prototype.walkFunctionExpression = function walkFunctionExpression(expression) {
	this.inScope(expression.params, function() {
		if(expression.body.type === "BlockStatement")
			this.walkStatement(expression.body);
		else
			this.walkExpression(expression.body);
	}.bind(this));
};

Parser.prototype.walkArrowFunctionExpression = function walkArrowFunctionExpression(expression) {
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
		while(expr.type === "MemberExpression" &&
			expr.property.type === (expr.computed ? "Literal" : "Identifier")
		) {
			exprName.unshift(expr.property.name || expr.property.value);
			expr = expr.object;
		}
		if(expr.type === "Identifier" && this.scope.definitions.indexOf(expr.name) === -1) {
			exprName.unshift(this.scope.renames["$" + expr.name] || expr.name);
			exprName = exprName.join(".");
			var result = this.applyPluginsBailResult1("typeof " + exprName, expression);
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
	if(expression.left.type === "Identifier" && renameIdentifier && this.applyPluginsBailResult1("can-rename " + renameIdentifier, expression.right)) {
		// renaming "a = b;"
		if(!this.applyPluginsBailResult1("rename " + renameIdentifier, expression.right)) {
			this.scope.renames["$" + expression.left.name] = renameIdentifier;
			var idx = this.scope.definitions.indexOf(expression.left.name);
			if(idx >= 0) this.scope.definitions.splice(idx, 1);
		}
	} else if(expression.left.type === "Identifier") {
		if(!this.applyPluginsBailResult1("assigned " + expression.left.name, expression)) {
			this.walkExpression(expression.right);
		}
		this.scope.renames["$" + expression.left.name] = undefined;
		if(!this.applyPluginsBailResult1("assign " + expression.left.name, expression)) {
			this.walkExpression(expression.left);
		}
	} else {
		this.walkExpression(expression.right);
		this.scope.renames["$" + expression.left.name] = undefined;
		this.walkExpression(expression.left);
	}
};

Parser.prototype.walkConditionalExpression = function walkConditionalExpression(expression) {
	var result = this.applyPluginsBailResult1("expression ?:", expression);
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

Parser.prototype.walkYieldExpression = function walkYieldExpression(expression) {
	if(expression.argument)
		this.walkExpression(expression.argument);
};

Parser.prototype.walkTemplateLiteral = function walkTemplateLiteral(expression) {
	if(expression.expressions)
		this.walkExpressions(expression.expressions);
};

Parser.prototype.walkTaggedTemplateExpression = function walkTaggedTemplateExpression(expression) {
	if(expression.tag)
		this.walkExpression(expression.tag);
	if(expression.quasi && expression.quasi.expressions)
		this.walkExpressions(expression.quasi.expressions);
};

Parser.prototype.walkClassExpression = function walkClassExpression(expression) {
	this.walkClass(expression);
};

Parser.prototype.walkCallExpression = function walkCallExpression(expression) {
	var result;

	function walkIIFE(functionExpression, options) {
		var params = functionExpression.params;
		var args = options.map(function(arg) {
			var renameIdentifier = this.getRenameIdentifier(arg);
			if(renameIdentifier && this.applyPluginsBailResult1("can-rename " + renameIdentifier, arg)) {
				if(!this.applyPluginsBailResult1("rename " + renameIdentifier, arg))
					return renameIdentifier;
			}
			this.walkExpression(arg);
		}, this);
		this.inScope(params.filter(function(identifier, idx) {
			return !args[idx];
		}), function() {
			for(var i = 0; i < args.length; i++) {
				var param = args[i];
				if(!param) continue;
				if(!params[i] || params[i].type !== "Identifier") continue;
				this.scope.renames["$" + params[i].name] = param;
			}
			if(functionExpression.body.type === "BlockStatement")
				this.walkStatement(functionExpression.body);
			else
				this.walkExpression(functionExpression.body);
		}.bind(this));
	}
	if(expression.callee.type === "MemberExpression" &&
		expression.callee.object.type === "FunctionExpression" &&
		!expression.callee.computed &&
		(["call", "bind"]).indexOf(expression.callee.property.name) >= 0 &&
		expression.arguments &&
		expression.arguments.length > 1
	) {
		// (function(...) { }.call/bind(?, ...))
		walkIIFE.call(this, expression.callee.object, expression.arguments.slice(1));
		this.walkExpression(expression.arguments[0]);
	} else if(expression.callee.type === "FunctionExpression" && expression.arguments) {
		// (function(...) { }(...))
		walkIIFE.call(this, expression.callee, expression.arguments);
	} else if(expression.callee.type === "Import") {
		result = this.applyPluginsBailResult1("import-call", expression);
		if(result === true)
			return;

		if(expression.arguments)
			this.walkExpressions(expression.arguments);
	} else {

		var callee = this.evaluateExpression(expression.callee);
		if(callee.isIdentifier()) {
			result = this.applyPluginsBailResult1("call " + callee.identifier, expression);
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
	while(expr.type === "MemberExpression" &&
		expr.property.type === (expr.computed ? "Literal" : "Identifier")
	) {
		exprName.unshift(expr.property.name || expr.property.value);
		expr = expr.object;
	}
	if(expr.type === "Identifier" && this.scope.definitions.indexOf(expr.name) === -1) {
		exprName.unshift(this.scope.renames["$" + expr.name] || expr.name);
		var result = this.applyPluginsBailResult1("expression " + exprName.join("."), expression);
		if(result === true)
			return;
		exprName[exprName.length - 1] = "*";
		result = this.applyPluginsBailResult1("expression " + exprName.join("."), expression);
		if(result === true)
			return;
	}
	this.walkExpression(expression.object);
	if(expression.computed === true)
		this.walkExpression(expression.property);
};

Parser.prototype.walkIdentifier = function walkIdentifier(expression) {
	if(this.scope.definitions.indexOf(expression.name) === -1) {
		var result = this.applyPluginsBailResult1("expression " + (this.scope.renames["$" + expression.name] || expression.name), expression);
		if(result === true)
			return;
	}
};

Parser.prototype.inScope = function inScope(params, fn) {
	var oldScope = this.scope;
	var _this = this;
	this.scope = {
		inTry: false,
		inShorthand: false,
		definitions: oldScope.definitions.slice(),
		renames: Object.create(oldScope.renames)
	};

	for(var paramIndex = 0, len = params.length; paramIndex < len; paramIndex++) {
		var param = params[paramIndex];

		if(typeof param !== "string") {
			_this.enterPattern(param, function(param) {
				_this.scope.renames["$" + param] = undefined;
				_this.scope.definitions.push(param);
			});
		} else {
			_this.scope.renames["$" + param] = undefined;
			_this.scope.definitions.push(param);
		}
	}

	fn();
	_this.scope = oldScope;
};

Parser.prototype.enterPattern = function enterPattern(pattern, onIdent) {
	if(pattern && this["enter" + pattern.type])
		this["enter" + pattern.type](pattern, onIdent);
};

Parser.prototype.enterIdentifier = function enterIdentifier(pattern, onIdent) {
	onIdent(pattern.name, pattern);
};

Parser.prototype.enterObjectPattern = function enterObjectPattern(pattern, onIdent) {
	for(var propIndex = 0, len = pattern.properties.length; propIndex < len; propIndex++) {
		var prop = pattern.properties[propIndex];
		this.enterPattern(prop.value, onIdent);
	}
};

Parser.prototype.enterArrayPattern = function enterArrayPattern(pattern, onIdent) {
	for(var elementIndex = 0, len = pattern.elements.length; elementIndex < len; elementIndex++) {
		var element = pattern.elements[elementIndex];
		this.enterPattern(element, onIdent);
	}
};

Parser.prototype.enterRestElement = function enterRestElement(pattern, onIdent) {
	this.enterPattern(pattern.argument, onIdent);
};

Parser.prototype.enterAssignmentPattern = function enterAssignmentPattern(pattern, onIdent) {
	this.enterPattern(pattern.left, onIdent);
	this.walkExpression(pattern.right);
};

Parser.prototype.evaluateExpression = function evaluateExpression(expression) {
	try {
		var result = this.applyPluginsBailResult1("evaluate " + expression.type, expression);
		if(result !== undefined)
			return result;
	} catch(e) {
		console.warn(e);
		// ignore error
	}
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

var POSSIBLE_AST_OPTIONS = [{
	ranges: true,
	locations: true,
	ecmaVersion: 2017,
	sourceType: "module",
	plugins: {
		dynamicImport: true
	}
}, {
	ranges: true,
	locations: true,
	ecmaVersion: 2017,
	sourceType: "script",
	plugins: {
		dynamicImport: true
	}
}];

Parser.prototype.parse = function parse(source, initialState) {
	var ast, comments = [];
	for(var i = 0, len = POSSIBLE_AST_OPTIONS.length; i < len; i++) {
		if(!ast) {
			try {
				comments.length = 0;
				POSSIBLE_AST_OPTIONS[i].onComment = comments;
				ast = acorn.parse(source, POSSIBLE_AST_OPTIONS[i]);
			} catch(e) {
				// ignore the error
			}
		}
	}
	if(!ast) {
		// for the error
		ast = acorn.parse(source, {
			ranges: true,
			locations: true,
			ecmaVersion: 2017,
			sourceType: "module",
			plugins: {
				dynamicImport: true
			},
			onComment: comments
		});
	}
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
	if(this.applyPluginsBailResult("program", ast, comments) === undefined)
		this.walkStatements(ast.body);
	this.scope = oldScope;
	this.state = oldState;
	return state;
};

Parser.prototype.evaluate = function evaluate(source) {
	var ast = acorn.parse("(" + source + ")", {
		ranges: true,
		locations: true,
		ecmaVersion: 2017,
		sourceType: "module",
		plugins: {
			dynamicImport: true
		}
	});
	if(!ast || typeof ast !== "object" || ast.type !== "Program")
		throw new Error("evaluate: Source couldn't be parsed");
	if(ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement")
		throw new Error("evaluate: Source is not a expression");
	return this.evaluateExpression(ast.body[0].expression);
};
