/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";
const BasicEvaluatedExpression = require("../BasicEvaluatedExpression");
const BinaryExpressionEvaluator = require("./BinaryExpressionEvaluator");
const StringPrototypeEvaluator = require("./StringPrototypeEvaluator");

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

const StaticNodeTypeEvaluator = {

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

		if(!BinaryExpressionEvaluator.hasOwnProperty(normalizeOperator)) {
			return;
		}

		return BinaryExpressionEvaluator[normalizeOperator](expression, parser);
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
		var param = parser.evaluateExpression(expression.callee.object);
		if(!param) return;
		var property = expression.callee.property.name || expression.callee.property.value;
		if(StringPrototypeEvaluator.hasOwnProperty(property)) {
			return StringPrototypeEvaluator[property](expression, param, parser);
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
			var arg = parser.evaluateExpression(expression.argument);
			if(arg.isString() || arg.isWrapped()) return new BasicEvaluatedExpression().setString("string").setRange(expression.range);
			else if(arg.isNumber()) return new BasicEvaluatedExpression().setString("number").setRange(expression.range);
			else if(arg.isBoolean()) return new BasicEvaluatedExpression().setString("boolean").setRange(expression.range);
			else if(arg.isArray() || arg.isConstArray() || arg.isRegExp()) return new BasicEvaluatedExpression().setString("object").setRange(expression.range);
		} else if(expression.operator === "!") {
			var argument = parser.evaluateExpression(expression.argument);
			if(!argument) return;
			if(argument.isBoolean()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.bool).setRange(expression.range);
			} else if(argument.isString()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.string).setRange(expression.range);
			} else if(argument.isNumber()) {
				return new BasicEvaluatedExpression().setBoolean(!argument.number).setRange(expression.range);
			}
		}
	},

	"Identifier": (expression, parser) => {
		var name = parser.nameInCurrentScope(expression.name);
		if(parser.scope.definitions.indexOf(expression.name) === -1) {
			var result = parser.applyPluginsBailResult1("evaluate Identifier " + name, expression);
			if(result) return result;
			return new BasicEvaluatedExpression().setIdentifier(name).setRange(expression.range);
		} else {
			return parser.applyPluginsBailResult1("evaluate defined Identifier " + name, expression);
		}
	},

	"MemberExpression": (expression, parser) => {
		var expr = expression;
		var exprName = [];
		while(expr.type === "MemberExpression" &&
			expr.property.type === (expr.computed ? "Literal" : "Identifier")
		) {
			exprName.unshift(expr.property.name || expr.property.value);
			expr = expr.object;
		}
		if(expr.type === "Identifier") {
			var name = parser.nameInCurrentScope(expr.name);
			if(parser.scope.definitions.indexOf(name) === -1) {
				exprName.unshift(name);
				exprName = exprName.join(".");
				if(parser.scope.definitions.indexOf(expr.name) === -1) {
					var result = parser.applyPluginsBailResult1("evaluate Identifier " + exprName, expression);
					if(result) return result;
					return new BasicEvaluatedExpression().setIdentifier(exprName).setRange(expression.range);
				} else {
					return parser.applyPluginsBailResult1("evaluate defined Identifier " + exprName, expression);
				}
			}
		}
	}
};

function hasEvaluatorForType(expressionType) {
	return !!StaticNodeTypeEvaluator[expressionType];
}
module.exports.hasEvaluatorForType = hasEvaluatorForType;

function evaluate(expression, parser) {
	const evaluator = StaticNodeTypeEvaluator[expression.type];
	if(hasEvaluatorForType(expression.type)) {
		return evaluator(expression, parser);
	}
}
module.exports.evaluate = evaluate;
