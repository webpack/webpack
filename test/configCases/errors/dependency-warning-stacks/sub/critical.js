"use strict";

// an expression request warns with a plain (stack-keeping) error
module.exports = function loadExpression(request) {
	return require(request);
};
