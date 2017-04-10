"use strict";
const BasicEvaluatedExpression = require("../BasicEvaluatedExpression");

const StringPrototypeEvaluator = {
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

module.exports = StringPrototypeEvaluator;
