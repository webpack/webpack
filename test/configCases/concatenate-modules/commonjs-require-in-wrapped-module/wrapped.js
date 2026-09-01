"use strict";

// A reassigned module.exports wraps this body, so its concatenation references
// are substituted textually instead of through scope analysis.
const whole = require("./esm-target");
const member = require("./cjs-target").value;
const constructed = new require("./object-target");

module.exports = {
	whole,
	member,
	constructed,
	loadAsync() {
		return new Promise((resolve) => {
			require.ensure(
				[],
				(require) => {
					resolve(require("./async-target").value);
				},
				"wrapped-async"
			);
		});
	}
};
