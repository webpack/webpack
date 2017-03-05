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

function joinRanges(startRange, endRange) {
	if(!endRange) return startRange;
	if(!startRange) return endRange;
	return [startRange[0], endRange[1]];
}

const BinaryExpressionOperatorVisitor = {

	"+": (expression, parser) => {
		const left = parser.evaluateExpression(expression.left);
		const right = parser.evaluateExpression(expression.right);

		// probably one of the sides is not static?
		if(!left || !right) return;

		const res = new BasicEvaluatedExpression();
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
		res.setRange(expression.range);
		return res;
	},

	"-": (expression, parser) => {
		const left = parser.evaluateExpression(expression.left);
		const right = parser.evaluateExpression(expression.right);
		if(!left || !right) return;
		if(!left.isNumber() || !right.isNumber()) return;
		const res = new BasicEvaluatedExpression();
		res.setNumber(left.number - right.number);
		res.setRange(expression.range);
		return res;
	},

	"*": (expression, parser) => {
		const left = parser.evaluateExpression(expression.left);
		const right = parser.evaluateExpression(expression.right);
		if(!left || !right) return;
		if(!left.isNumber() || !right.isNumber()) return;
		const res = new BasicEvaluatedExpression();
		res.setNumber(left.number * right.number);
		res.setRange(expression.range);
		return res;
	},

	"/": (expression, parser) => {
		const left = parser.evaluateExpression(expression.left);
		const right = parser.evaluateExpression(expression.right);
		if(!left || !right) return;
		if(!left.isNumber() || !right.isNumber()) return;
		const res = new BasicEvaluatedExpression();
		res.setNumber(left.number / right.number);
		res.setRange(expression.range);
		return res;
	},

	"===": (expression, parser) => {
		const left = parser.evaluateExpression(expression.left);
		const right = parser.evaluateExpression(expression.right);
		if(!left || !right) return;
		const res = new BasicEvaluatedExpression();
		res.setRange(expression.range);
		if(left.isString() && right.isString()) {
			return res.setBoolean(left.string === right.string);
		} else if(left.isNumber() && right.isNumber()) {
			return res.setBoolean(left.number === right.number);
		} else if(left.isBoolean() && right.isBoolean()) {
			return res.setBoolean(left.bool === right.bool);
		}
	},

	"!==": (expression, parser) => {
		const left = parser.evaluateExpression(expression.left);
		const right = parser.evaluateExpression(expression.right);
		if(!left || !right) return;
		const res = new BasicEvaluatedExpression();
		res.setRange(expression.range);
		if(left.isString() && right.isString()) {
			return res.setBoolean(left.string !== right.string);
		} else if(left.isNumber() && right.isNumber()) {
			return res.setBoolean(left.number !== right.number);
		} else if(left.isBoolean() && right.isBoolean()) {
			return res.setBoolean(left.bool !== right.bool);
		}
	},
};

const StringPrototypeCallExpressionVisitor = {
	"replace": (expression, param, parser) => {
		// we can only optimize `.replace` calls on static strings
		if(!param.isString()) return;

		// if we have more than 2 arguments, we dont know whats happening - skip
		if(expression.arguments.length !== 2) return;

		const arg1 = parser.evaluateExpression(expression.arguments[0]);
		// we may only evaluate the result if the first param is a string or a regexp
		if(!arg1.isString() && !arg1.isRegExp()) return;

		// get the actual value to search for
		const search = arg1.regExp || arg1.string;

		const arg2 = parser.evaluateExpression(expression.arguments[1]);
		// the second arg must be a static string
		if(!arg2.isString()) return;
		// get the value to replace the search result with
		const relaceValue = arg2.string;
		// perform the replacement
		const replacementString = param.string.replace(search, relaceValue);

		// create an evaluated replacement
		return new BasicEvaluatedExpression()
			.setString(replacementString)
			.setRange(expression.range);
	},

	"split": (expression, param, parser) => {
		// we can only optimize `.split` calls on static strings
		if(!param.isString()) return;

		// we only know what to do if we have 1 argument
		if(expression.arguments.length !== 1) return;

		const arg = parser.evaluateExpression(expression.arguments[0]);

		// we may only evaluate the result if the first param is a string or a regexp
		if(!arg.isString() && !arg.isRegExp()) return;

		// get the actual value with which we split the string
		const splitter = arg.regExp || arg.string;

		// perform splitting
		const splittedString = param.string.split(splitter);

		// create an evaluated replacement
		return new BasicEvaluatedExpression()
			.setArray(splittedString)
			.setRange(expression.range);
	},

	"substring": (expression, param, parser) => {
		// we can only optimize `.substring` calls on static strings
		if(!param.isString()) return;

		// we only handle 1 or 2 arguments
		const argumentsLength = expression.arguments.length;
		if(argumentsLength < 1 || argumentsLength > 2) {
			return;
		}

		const arg1 = parser.evaluateExpression(expression.arguments[0]);
		// argument 1 must be a number, otherwise we cant handle this
		if(!arg1.isNumber()) return;

		// we only have one argument?
		// replace and return evaluated expression
		if(argumentsLength === 1) {
			const result = param.string.substring(arg1.number);
			return new BasicEvaluatedExpression()
				.setString(result)
				.setRange(expression.range);
		}

		const arg2 = parser.evaluateExpression(expression.arguments[1]);
		// argument 2 must also be a number, otherwise we cant handle this
		if(!arg2.isNumber()) return;

		// replace and return evaluated expression
		const result = param.string.substring(arg1.number, arg2.number);
		return new BasicEvaluatedExpression().setString(result).setRange(expression.range);
	},

	"substr": (expression, param, parser) => {
		// we can only optimize `.substr` calls on static strings
		if(!param.isString()) return;

		// we only handle 1 or 2 arguments
		const argumentsLength = expression.arguments.length;
		if(argumentsLength < 1 || argumentsLength > 2) {
			return;
		}

		const arg1 = parser.evaluateExpression(expression.arguments[0]);
		// argument 1 must be a number, otherwise we cant handle this
		if(!arg1.isNumber()) return;

		// we only have one argument?
		// replace and return evaluated expression
		if(argumentsLength === 1) {
			const result = param.string.substr(arg1.number);
			return new BasicEvaluatedExpression()
				.setString(result)
				.setRange(expression.range);
		}

		const arg2 = parser.evaluateExpression(expression.arguments[1]);
		// argument 2 must also be a number, otherwise we cant handle this
		if(!arg2.isNumber()) return;

		// replace and return evaluated expression
		const result = param.string.substr(arg1.number, arg2.number);
		return new BasicEvaluatedExpression().setString(result).setRange(expression.range);
	},
};

/**
 * @param {string} kind "cooked" | "raw"
 * @param {any[]} quasis quasis
 * @param {any[]} expressions expressions
 * @param {any} parser parser
 * @return {BasicEvaluatedExpression[]} Simplified template
 */
function getSimplifiedTemplateResult(kind, quasis, expressions, parser) {
	var i = 0;
	var parts = [];

	for(i = 0; i < quasis.length; i++) {
		parts.push(new BasicEvaluatedExpression().setString(quasis[i].value[kind]).setRange(quasis[i].range));

		if(i > 0) {
			var prevExpr = parts[parts.length - 2],
				lastExpr = parts[parts.length - 1];
			var expr = parser.evaluateExpression(expressions[i - 1]);
			if(!(expr.isString() || expr.isNumber())) continue;

			prevExpr.setString(prevExpr.string + (expr.isString() ? expr.string : expr.number) + lastExpr.string);
			prevExpr.setRange([prevExpr.range[0], lastExpr.range[1]]);
			parts.pop();
		}
	}
	return parts;
}

const EvaluationVisitor = {

	"Literal": (expression) => {
		const value = expression.value;
		switch(true) {
			case typeof value === "number":
				return new BasicEvaluatedExpression().setNumber(expression.value).setRange(expression.range);
			case typeof value === "string":
				return new BasicEvaluatedExpression().setString(expression.value).setRange(expression.range);
			case typeof value === "boolean":
				return new BasicEvaluatedExpression().setBoolean(expression.value).setRange(expression.range);
			case value === null:
				return new BasicEvaluatedExpression().setNull().setRange(expression.range);
			case value instanceof RegExp:
				return new BasicEvaluatedExpression().setRegExp(expression.value).setRange(expression.range);
		}
	},

	/*
	 * Optimize code by preevualuating static Logical expressions
	 * e.g.:
	 *  - Logical and: evaluate false && something() => false
	 *  - Logical or: evaluate true || something() => true
	 */
	"LogicalExpression": (expression, parser) => {
		const operator = expression.operator;
		// stop if the operator is not && or ||
		const isAndOrOr = operator === "&&" || operator === "||";
		if(!isAndOrOr) {
			return;
		}

		const left = parser.evaluateExpression(expression.left);
		const leftAsBool = left && left.asBool();

		/**
		 * We can only optimize if the left hand side as a static boolean
		 */
		if(typeof leftAsBool !== "boolean") {
			return;
		}

		/**
		 * The left hand side is a boolean. Now check if we can break this expression early.
		 * -> in case of "&&" a "false" left hand "breaks" the expression early
		 * -> in case of "||" a "true" left hand "breaks" the expression early
		 */
		const canExitEarlyAnd = operator === "&&" && !leftAsBool;
		const canExitEarlyOr = operator === "||" && leftAsBool;
		if(canExitEarlyAnd || canExitEarlyOr) {
			return left.setRange(expression.range);
		}

		/**
		 * The left hand side did not allow for early exit.
		 * Therefore we need to use the right hand side to determine the outcome.
		 */
		const right = parser.evaluateExpression(expression.right);
		return right.setRange(expression.range);
	},

	"BinaryExpression": (expression, parser) => {
		/**
		 * If operator is "==" or "!=" turn them into "===" and "!==" respectively
		 */
		const normalizeOperator =
			expression.operator === "==" ? "===" :
			expression.operator === "!=" ? "!==" :
			expression.operator;

		if(!BinaryExpressionOperatorVisitor.hasOwnProperty(normalizeOperator)) {
			return;
		}

		return BinaryExpressionOperatorVisitor[normalizeOperator](expression, parser);
	},

	"ConditionalExpression": (expression, parser) => {
		const condition = parser.evaluateExpression(expression.test);
		const conditionValue = condition.asBool();

		// We are able to evaluate the conditiona "test"
		// use left/right (consequent/alernative) based on the "test" condition
		if(conditionValue !== undefined) {
			return parser.evaluateExpression(conditionValue ? expression.consequent : expression.alternate)
				.setRange(expression.range);
		}

		// We can not make assumptions about the test
		// at least try to further optimize the arms of the condition
		const consequent = parser.evaluateExpression(expression.consequent);
		const alternate = parser.evaluateExpression(expression.alternate);

		// We need both sides to make assumptions.
		// Nothing further to optimize here.
		if(!consequent || !alternate) {
			return;
		}

		const res = new BasicEvaluatedExpression();
		consequent.isConditional() ?
			res.setOptions(consequent.options) :
			res.setOptions([consequent]);

		alternate.isConditional() ?
			res.addOptions(alternate.options) :
			res.addOptions([alternate]);

		return res.setRange(expression.range);
	},

	"ArrayExpression": (expression, parser) => {
		const items = expression.elements
			.map(element => parser.evaluateExpression(element));

		// We must be able to evaluate every single member
		// to be able to optimize here.
		if(!items.every(Boolean)) return;

		return new BasicEvaluatedExpression().setItems(items).setRange(expression.range);
	},

	/*
	 * Optimize calls to prototype of certain types
	 * e.g.
	 *  - string replace - "asdbar".replace("asd", "foo") => "foobar"
	 * etc.
	 *
	 * check CallExpressionPropertyVisitor for implementation
	 */
	"CallExpression": (expression, parser) => {
		if(expression.callee.type !== "MemberExpression") return;
		if(expression.callee.property.type !== (expression.callee.computed ? "Literal" : "Identifier")) return;
		const param = parser.evaluateExpression(expression.callee.object);
		if(!param) return;
		const property = expression.callee.property.name || expression.callee.property.value;
		if(StringPrototypeCallExpressionVisitor.hasOwnProperty(property)) {
			return StringPrototypeCallExpressionVisitor[property](expression, param, parser);
		}
		return parser.applyPluginsBailResult("evaluate CallExpression ." + property, expression, param);
	},

	"TemplateLiteral": (node, parser) => {
		var parts = getSimplifiedTemplateResult("cooked", node.quasis, node.expressions, parser);
		if(parts.length === 1) {
			return parts[0].setRange(node.range);
		}
		return new BasicEvaluatedExpression().setTemplateString(parts).setRange(node.range);
	},

	"TaggedTemplateExpression": (node, parser) => {
		if(parser.evaluateExpression(node.tag).identifier !== "String.raw") return;
		var parts = getSimplifiedTemplateResult("raw", node.quasi.quasis, node.quasi.expressions, parser);
		return new BasicEvaluatedExpression().setTemplateString(parts).setRange(node.range);
	},

	"UnaryExpression": (expression, parser) => {
		if(expression.operator === "typeof") {
			if(expression.argument.type === "FunctionExpression") {
				return new BasicEvaluatedExpression().setString("function").setRange(expression.range);
			}
			let arg = parser.evaluateExpression(expression.argument);
			if(arg.isString() || arg.isWrapped()) return new BasicEvaluatedExpression().setString("string").setRange(expression.range);
			else if(arg.isNumber()) return new BasicEvaluatedExpression().setString("number").setRange(expression.range);
			else if(arg.isBoolean()) return new BasicEvaluatedExpression().setString("boolean").setRange(expression.range);
			else if(arg.isArray() || arg.isConstArray() || arg.isRegExp()) return new BasicEvaluatedExpression().setString("object").setRange(expression.range);
		} else if(expression.operator === "!") {
			let argument = parser.evaluateExpression(expression.argument);
			if(!argument) return;
			if(argument.isBoolean()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.bool).setRange(expression.range);
			} else if(argument.isString()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.string).setRange(expression.range);
			} else if(argument.isNumber()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.number).setRange(expression.range);
			}
		}
	}
};

class EvaluateTypeOfWalker extends Tapable {
	constructor(parser) {
		super();
		parser.plugin("evaluate UnaryExpression", (expression) => {
			if(expression.operator !== "typeof") {
				return;
			}

			if(expression.argument.type === "Identifier") {
				var name = parser.nameInCurrentScope(expression.argument.name);
				if(parser.scope.definitions.indexOf(name) === -1) {
					return this.applyPluginsBailResult1("evaluate typeof " + name, expression);
				}
			}
			if(expression.argument.type === "MemberExpression") {
				var expressionArgument = expression.argument;
				var exprName = [];
				while(expressionArgument.type === "MemberExpression" && !expressionArgument.computed) {
					exprName.unshift(parser.nameInCurrentScope(expressionArgument.property.name));
					expressionArgument = expressionArgument.object;
				}
				if(expressionArgument.type === "Identifier") {
					exprName.unshift(parser.nameInCurrentScope(expressionArgument.name));
					if(parser.scope.definitions.indexOf(name) === -1) {
						exprName = exprName.join(".");
						return this.applyPluginsBailResult1("evaluate typeof " + exprName, expression);
					}
				}
			}
		});
	}
}

class EvaluateIdentifierWalker extends Tapable {
	constructor(parser) {
		super();

		parser.plugin("evaluate Identifier", (expr) => {
			const name = parser.nameInCurrentScope(expr.name);
			if(parser.scope.definitions.indexOf(expr.name) === -1) {
				const result = this.applyPluginsBailResult1("EvaluateIdentifierWalker " + name, expr);
				if(result) return result;
				return new BasicEvaluatedExpression().setIdentifier(name).setRange(expr.range);
			} else {
				return this.applyPluginsBailResult1("EvaluateIdentifierWalker defined " + name, expr);
			}
		});
		parser.plugin("evaluate MemberExpression", (expression) => {
			let expr = expression;
			const exprName = [];
			while(expr.type === "MemberExpression" &&
				expr.property.type === (expr.computed ? "Literal" : "Identifier")
			) {
				exprName.unshift(expr.property.name || expr.property.value);
				expr = expr.object;
			}
			if(expr.type === "Identifier") {
				const name = parser.nameInCurrentScope(expr.name);
				if(parser.scope.definitions.indexOf(name) === -1) {
					exprName.unshift(name);
					exprName = exprName.join(".");
					if(parser.scope.definitions.indexOf(expr.name) === -1) {
						const result = this.applyPluginsBailResult1("EvaluateIdentifierWalker " + exprName, expression);
						if(result) return result;
						return new BasicEvaluatedExpression().setIdentifier(exprName).setRange(expression.range);
					} else {
						return this.applyPluginsBailResult1("EvaluateIdentifierWalker defined " + exprName, expression);
					}
				}
			}
		});
	}

	/* prevent Tapable from calling "hasOwnProperty" on internal storage */
	plugin(specifier, callback) {
		super.plugin("EvaluateIdentifierWalker " + specifier, callback);
	}
}

class Parser extends Tapable {
	constructor(options) {
		super();
		this.options = options;
		this.evaluateIdentifierWalker = new EvaluateIdentifierWalker(this);
		this.evaluateTypeOfWalker = new EvaluateTypeOfWalker(this);
		this.initializeEvaluating();
	}

	initializeEvaluating() {
		this.plugin("evaluate Literal", function(expr) {
			return EvaluationVisitor[expr.type](expr);
		});
		this.plugin("evaluate LogicalExpression", function(expr) {
			return EvaluationVisitor[expr.type](expr, this);
		});
		this.plugin("evaluate BinaryExpression", function(expr) {
			return EvaluationVisitor[expr.type](expr, this);
		});
		this.plugin("evaluate UnaryExpression", function(expr) {
			return EvaluationVisitor[expr.type](expr, this);
		});
		this.evaluateTypeOfWalker.plugin("evaluate typeof undefined", function(expr) {
			return new BasicEvaluatedExpression().setString("undefined").setRange(expr.range);
		});
		this.plugin("evaluate CallExpression", function(expr) {
			return EvaluationVisitor[expr.type](expr, this);
		});

		this.plugin("evaluate TemplateLiteral", function(node) {
			return EvaluationVisitor[node.type](node, this);
		});

		this.plugin("evaluate TaggedTemplateExpression", function(node) {
			return EvaluationVisitor[node.type](node, this);
		});

		this.plugin("evaluate ConditionalExpression", function(expr) {
			return EvaluationVisitor[expr.type](expr, this);
		});
		this.plugin("evaluate ArrayExpression", function(expr) {
			return EvaluationVisitor[expr.type](expr, this);
		});
	}

	nameInCurrentScope(name) {
		return this.scope.renames["$" + name] || name;
	}

	getRenameIdentifier(expr) {
		const result = this.evaluateExpression(expr);
		if(!result) return;
		if(result.isIdentifier()) return result.identifier;
		return;
	}

	walkClass(classy) {
		if(classy.superClass)
			this.walkExpression(classy.superClass);
		if(classy.body && classy.body.type === "ClassBody") {
			classy.body.body.forEach(methodDefinition => {
				if(methodDefinition.type === "MethodDefinition")
					this.walkMethodDefinition(methodDefinition);
			});
		}
	}

	walkMethodDefinition(methodDefinition) {
		if(methodDefinition.computed && methodDefinition.key)
			this.walkExpression(methodDefinition.key);
		if(methodDefinition.value)
			this.walkExpression(methodDefinition.value);
	}

	walkStatements(statements) {
		for(let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			this.walkStatement(statement);
		}
	}

	walkStatement(statement) {
		if(this.applyPluginsBailResult1("statement", statement) !== undefined) return;
		if(this["walk" + statement.type])
			this["walk" + statement.type](statement);
	}

	// Real Statements
	walkBlockStatement(statement) {
		this.walkStatements(statement.body);
	}

	walkExpressionStatement(statement) {
		this.walkExpression(statement.expression);
	}

	walkIfStatement(statement) {
		const result = this.applyPluginsBailResult1("statement if", statement);
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
	}

	walkLabeledStatement(statement) {
		const result = this.applyPluginsBailResult1("label " + statement.label.name, statement);
		if(result !== true)
			this.walkStatement(statement.body);
	}

	walkWithStatement(statement) {
		this.walkExpression(statement.object);
		this.walkStatement(statement.body);
	}

	walkSwitchStatement(statement) {
		this.walkExpression(statement.discriminant);
		this.walkSwitchCases(statement.cases);
	}

	walkTerminatingStatement(statement) {
		if(statement.argument)
			this.walkExpression(statement.argument);
	}

	walkReturnStatement(statement) {
		this.walkTerminatingStatement(statement);
	}

	walkThrowStatement(statement) {
		this.walkTerminatingStatement(statement);
	}

	walkTryStatement(statement) {
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
	}

	walkWhileStatement(statement) {
		this.walkExpression(statement.test);
		this.walkStatement(statement.body);
	}

	walkDoWhileStatement(statement) {
		this.walkStatement(statement.body);
		this.walkExpression(statement.test);
	}

	walkForStatement(statement) {
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
	}

	walkForInStatement(statement) {
		if(statement.left.type === "VariableDeclaration")
			this.walkStatement(statement.left);
		else
			this.walkExpression(statement.left);
		this.walkExpression(statement.right);
		this.walkStatement(statement.body);
	}

	walkForOfStatement(statement) {
		if(statement.left.type === "VariableDeclaration")
			this.walkStatement(statement.left);
		else
			this.walkExpression(statement.left);
		this.walkExpression(statement.right);
		this.walkStatement(statement.body);
	}

	// Declarations
	walkFunctionDeclaration(statement) {
		if(statement.id) {
			this.scope.renames["$" + statement.id.name] = undefined;
			this.scope.definitions.push(statement.id.name);
		}
		this.inScope(statement.params, function() {
			if(statement.body.type === "BlockStatement")
				this.walkStatement(statement.body);
			else
				this.walkExpression(statement.body);
		}.bind(this));
	}

	walkExportDefaultDeclaration(statement) {
		this.applyPluginsBailResult1("export", statement);
		if(/Declaration$/.test(statement.declaration.type)) {
			if(!this.applyPluginsBailResult("export declaration", statement, statement.declaration)) {
				const pos = this.scope.definitions.length;
				this.walkStatement(statement.declaration);
				const newDefs = this.scope.definitions.slice(pos);
				for(let index = 0, len = newDefs.length; index < len; index++) {
					const def = newDefs[index];
					this.applyPluginsBailResult("export specifier", statement, def, "default");
				}
			}
		} else {
			this.walkExpression(statement.declaration);
			if(!this.applyPluginsBailResult("export expression", statement, statement.declaration)) {
				this.applyPluginsBailResult("export specifier", statement, statement.declaration, "default");
			}
		}
	}

	walkVariableDeclaration(statement) {
		if(statement.declarations)
			this.walkVariableDeclarators(statement.declarations);
	}

	walkClassDeclaration(statement) {
		if(statement.id) {
			this.scope.renames["$" + statement.id.name] = undefined;
			this.scope.definitions.push(statement.id.name);
		}
		this.walkClass(statement);
	}

	walkSwitchCases(switchCases) {
		for(let index = 0, len = switchCases.length; index < len; index++) {
			const switchCase = switchCases[index];

			if(switchCase.test) {
				this.walkExpression(switchCase.test);
			}
			this.walkStatements(switchCase.consequent);
		}
	}

	walkCatchClause(catchClause) {
		if(catchClause.guard)
			this.walkExpression(catchClause.guard);
		this.inScope([catchClause.param], function() {
			this.walkStatement(catchClause.body);
		}.bind(this));
	}

	walkVariableDeclarators(declarators) {
		declarators.forEach(declarator => {
			switch(declarator.type) {
				case "VariableDeclarator":
					const renameIdentifier = declarator.init && _this.getRenameIdentifier(declarator.init);
					if(renameIdentifier && declarator.id.type === "Identifier" && _this.applyPluginsBailResult1("can-rename " + renameIdentifier, declarator.init)) {
						// renaming with "var a = b;"
						if(!_this.applyPluginsBailResult1("rename " + renameIdentifier, declarator.init)) {
							_this.scope.renames["$" + declarator.id.name] = _this.nameInCurrentScope(renameIdentifier);
							var idx = _this.scope.definitions.indexOf(declarator.id.name);
							if(idx >= 0) _this.scope.definitions.splice(idx, 1);
						}
					} else {
						_this.walkPattern(declarator.id);
						_this.traversePatternForIdentifiers(declarator.id, (node) => {
							const name = node.name;
							if(!_this.applyPluginsBailResult1("var " + name, node)) {
								_this.scope.renames["$" + name] = undefined;
								_this.scope.definitions.push(name);
							}
						} else {
							this.walkPattern(declarator.id);
							this.enterPattern(declarator.id, (name, decl) => {
								if(!this.applyPluginsBailResult1("const " + name, decl)) {
									this.scope.renames["$" + name] = undefined;
									this.scope.definitions.push(name);
								}
							});
							if(declarator.init)
								this.walkExpression(declarator.init);
						}
						break;
					}
			}
		});
	}

	walkPattern(pattern) {
		if(pattern.type === "Identifier")
			return;
		if(this["walk" + pattern.type])
			this["walk" + pattern.type](pattern);
	}

	walkObjectPattern(pattern) {
		for(let i = 0, len = pattern.properties.length; i < len; i++) {
			const prop = pattern.properties[i];
			if(prop) {
				if(prop.computed)
					this.walkExpression(prop.key);
				if(prop.value)
					this.walkPattern(prop.value);
			}
		}
	}

	walkArrayPattern(pattern) {
		for(let i = 0, len = pattern.elements.length; i < len; i++) {
			const element = pattern.elements[i];
			if(element)
				this.walkPattern(element);
		}
	}

	walkRestElement(pattern) {
		this.walkPattern(pattern.argument);
	}

	walkExpressions(expressions) {
		for(let expressionsIndex = 0, len = expressions.length; expressionsIndex < len; expressionsIndex++) {
			const expression = expressions[expressionsIndex];
			if(expression)
				this.walkExpression(expression);
		}
	}

	walkExpression(expression) {
		if(this["walk" + expression.type])
			return this["walk" + expression.type](expression);
	}

	walkAwaitExpression(expression) {
		const argument = expression.argument;
		if(this["walk" + argument.type])
			return this["walk" + argument.type](argument);
	}

	walkArrayExpression(expression) {
		if(expression.elements)
			this.walkExpressions(expression.elements);
	}

	walkSpreadElement(expression) {
		if(expression.argument)
			this.walkExpression(expression.argument);
	}

	walkObjectExpression(expression) {
		for(let propIndex = 0, len = expression.properties.length; propIndex < len; propIndex++) {
			const prop = expression.properties[propIndex];
			if(prop.computed)
				this.walkExpression(prop.key);
			if(prop.shorthand)
				this.scope.inShorthand = true;
			this.walkExpression(prop.value);
			if(prop.shorthand)
				this.scope.inShorthand = false;
		}
	}

	walkFunctionExpression(expression) {
		this.inScope(expression.params, function() {
			if(expression.body.type === "BlockStatement")
				this.walkStatement(expression.body);
			else
				this.walkExpression(expression.body);
		}.bind(this));
	}

	walkArrowFunctionExpression(expression) {
		this.inScope(expression.params, function() {
			if(expression.body.type === "BlockStatement")
				this.walkStatement(expression.body);
			else
				this.walkExpression(expression.body);
		}.bind(this));
	}

	walkSequenceExpression(expression) {
		if(expression.expressions)
			this.walkExpressions(expression.expressions);
	}

	walkUpdateExpression(expression) {
		this.walkExpression(expression.argument);
	}

	walkUnaryExpression(expression) {
		if(expression.operator === "typeof") {
			let expr = expression.argument;
			let exprName = [];
			while(expr.type === "MemberExpression" && expr.property.type === (expr.computed ? "Literal" : "Identifier")) {
				exprName.unshift(expr.property.name || expr.property.value);
				expr = expr.object;
			}
			if(expr.type === "Identifier" && this.scope.definitions.indexOf(expr.name) === -1) {
				exprName.unshift(this.nameInCurrentScope(expr.name));
				exprName = exprName.join(".");
				const result = this.applyPluginsBailResult1("typeof " + exprName, expression);
				if(result === true)
					return;
			}
		}
		this.walkExpression(expression.argument);
	}

	walkLeftRightExpression(expression) {
		this.walkExpression(expression.left);
		this.walkExpression(expression.right);
	}

	walkBinaryExpression(expression) {
		this.walkLeftRightExpression(expression);
	}

	walkLogicalExpression(expression) {
		this.walkLeftRightExpression(expression);
	}

	walkAssignmentExpression(expression) {
		const renameIdentifier = this.getRenameIdentifier(expression.right);
		if(expression.left.type === "Identifier" && renameIdentifier && this.applyPluginsBailResult1("can-rename " + renameIdentifier, expression.right)) {
			// renaming "a = b;"
			if(!this.applyPluginsBailResult1("rename " + renameIdentifier, expression.right)) {
				this.scope.renames["$" + expression.left.name] = renameIdentifier;
				const idx = this.scope.definitions.indexOf(expression.left.name);
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
	}

	walkConditionalExpression(expression) {
		const result = this.applyPluginsBailResult1("expression ?:", expression);
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
	}

	walkNewExpression(expression) {
		this.walkExpression(expression.callee);
		if(expression.arguments)
			this.walkExpressions(expression.arguments);
	}

	walkYieldExpression(expression) {
		if(expression.argument)
			this.walkExpression(expression.argument);
	}

	walkTemplateLiteral(expression) {
		if(expression.expressions)
			this.walkExpressions(expression.expressions);
	}

	walkTaggedTemplateExpression(expression) {
		if(expression.tag)
			this.walkExpression(expression.tag);
		if(expression.quasi && expression.quasi.expressions)
			this.walkExpressions(expression.quasi.expressions);
	}

	walkClassExpression(expression) {
		this.walkClass(expression);
	}

	walkCallExpression(expression) {
		let result;

		function walkIIFE(functionExpression, options) {
			const params = functionExpression.params;
			const args = options.map(function(arg) {
				const renameIdentifier = this.getRenameIdentifier(arg);
				if(renameIdentifier && this.applyPluginsBailResult1("can-rename " + renameIdentifier, arg)) {
					if(!this.applyPluginsBailResult1("rename " + renameIdentifier, arg))
						return renameIdentifier;
				}
				this.walkExpression(arg);
			}, this);
			this.inScope(params.filter(function(identifier, idx) {
				return !args[idx];
			}), function() {
				for(let i = 0; i < args.length; i++) {
					const param = args[i];
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

			const callee = this.evaluateExpression(expression.callee);
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
	}

	walkMemberExpression(expression) {
		let expr = expression;
		let exprName = [];
		while(expr.type === "MemberExpression" && expr.property.type === (expr.computed ? "Literal" : "Identifier")) {
			exprName.unshift(expr.property.name || expr.property.value);
			expr = expr.object;
		}
		if(expr.type === "Identifier" && this.scope.definitions.indexOf(expr.name) === -1) {
			exprName.unshift(this.nameInCurrentScope(expr.name));
			let result = this.applyPluginsBailResult1("expression " + exprName.join("."), expression);
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
	}

	walkExportNamedDeclaration(statement) {
		let source;
		if(statement.source) {
			source = statement.source.value;
			this.applyPluginsBailResult("export import", statement, source);
		} else {
			this.applyPluginsBailResult1("export", statement);
		}

		if(statement.declaration) {
			if(/Expression$/.test(statement.declaration.type)) {
				throw new Error("Doesn't occur?");
			}

			if(!this.applyPluginsBailResult("export declaration", statement, statement.declaration)) {
				const pos = this.scope.definitions.length;
				this.walkStatement(statement.declaration);
				const newDefs = this.scope.definitions.slice(pos);
				// console.log(statement.declaration.type, newDefs, "export declaration");
				// if(newDefs.length > 1) throw new Error("peng");
				for(let index = newDefs.length - 1; index > -1; index -= 1) {
					this.applyPluginsBailResult("export specifier", statement, newDefs[index], newDefs[index], index);
				}
			}
		}
		if(statement.specifiers) {
			for(var specifierIndex = 0; specifierIndex < statement.specifiers.length; specifierIndex++) {
				const specifier = statement.specifiers[specifierIndex];
				if(specifier.type === "ExportSpecifier") {
					if(source)
						this.applyPluginsBailResult("export import specifier", statement, source, specifier.local.name, specifier.exported.name, specifierIndex);
					else
						this.applyPluginsBailResult("export specifier", statement, specifier.local.name, specifier.exported.name, specifierIndex);
				}
			}
		}
	}

	walkIdentifier(expression) {
		// if we know it already skip
		if(this.scope.definitions.indexOf(expression.name) > -1) {
			return;
		}

		const expressionName = this.nameInCurrentScope(expression.name);
		this.applyPluginsBailResult1("expression " + expressionName, expression);
	}

	traverseNodeInCurrentScope(node) {
		node.type === "BlockStatement" ?
			this.walkStatement(node) : this.walkExpression(node);
	}

	traverseNodesInCurrentScope(nodes) {
		if(!nodes) {
			return;
		}
		for(var i = 0; i < nodes.length; i += 1) {
			this.traverseNodeInCurrentScope(nodes[i]);
		}
	}

	traversePatternForIdentifiers(ASTNode, callback) {
		if(!ASTNode) {
			return;
		}
		traverser.recursive(ASTNode, {}, {
			Identifier: callback,
			VariablePattern: callback,
			AssignmentPattern: (param, state, commence) => {
				commence(param.left, state);
				// TODO: move this side effect out of here
				this.walkExpression(param.right);
			}
		});
	}

	// retrieve all possible parameter names
	getParameterName(params) {
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
	}

	/*
	 *  Travers AST with its own scope.
	 * Inherits the current scope as available "parent" scope
	 * but does not modifiy it
	 */
	inScope(params, fn) {
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
	}

	evaluateExpression(expression) {
		try {
			const result = this.applyPluginsBailResult1("evaluate " + expression.type, expression);
			if(result !== undefined)
				return result;
		} catch(e) {
			// ignore error
			console.warn(e);
		}
		return new BasicEvaluatedExpression().setRange(expression.range);
	}

	parseWithAcorn(source, parserOptions) {
		return acorn.parse(source, parserOptions);
	}

	parseAsModuleOrScript(source) {
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
	}

	hoistImportsAndExports(ast) {
		const state = {
			scope: this.scope
		};
		traverser.recursive(ast, state, {
			Import: (expr) => {}, // keep this as a stub as the acorn walker does not know this type
			ImportDeclaration: (statement, state) => {
				const source = statement.source.value;
				this.applyPluginsBailResult("import", statement, source);
				statement.specifiers.forEach((specifier) => {
					const name = specifier.local.name;
					state.scope.renames["$" + name] = undefined;
					state.scope.definitions.push(name);
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
				});
			},
			ExportAllDeclaration: (statement) => {
				const source = statement.source.value;
				this.applyPluginsBailResult("export import", statement, source);
				this.applyPluginsBailResult("export import specifier", statement, source, null, null, 0);
			}
		});
	}

	parse(source, initialState) {
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
			this.walkStatements(ast.body);
		}

		this.scope = oldScope;
		this.state = oldState;
		return state;
	}

	evaluate(source) {
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
	}
}

module.exports = Parser;
