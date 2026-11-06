"use strict";

module.exports = [
	{
		code: /DEP_WEBPACK_RULE_GENERATOR_OPTIONS/,
		message:
			/"asset\/source" module type takes no generator options, but a rule gives it "encoding"\./
	},
	{
		code: /DEP_WEBPACK_RULE_GENERATOR_OPTIONS/,
		message:
			/"javascript\/auto" module type takes no generator options, but a rule gives it "binary"\./
	}
];
