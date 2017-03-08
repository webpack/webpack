"use strict";
const BasicEvaluatedExpression = require("../BasicEvaluatedExpression");

function joinRanges(startRange, endRange) {
	if(!endRange) return startRange;
	if(!startRange) return endRange;
	return [startRange[0], endRange[1]];
}

const BinaryExpressionEvaluator = {

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

module.exports = BinaryExpressionEvaluator;
