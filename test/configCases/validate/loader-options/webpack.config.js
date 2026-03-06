"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "none",
	validate: false,
	module: {
		rules: [
			{
				test: /a\.js$/,
				loader: "./loader",
				options: {
					unknown: true,
					arg: true,
					arg1: null,
					arg2: undefined,
					arg3: 1234567890,
					arg4: "string",
					arg5: [1, 2, 3],
					arg6: { foo: "value", bar: { baz: "other-value" } }
				}
			}
		]
	}
};
