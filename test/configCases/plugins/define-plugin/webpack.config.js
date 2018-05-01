var DefinePlugin = require("../../../../lib/DefinePlugin");
module.exports = {
	plugins: [
		new DefinePlugin({
			TRUE: true,
			FALSE: false,
			UNDEFINED: undefined,
			FUNCTION: /* istanbul ignore next */ function(a) {
				return a + 1;
			},
			CODE: "(1+2)",
			REGEXP: /abc/i,
			OBJECT: {
				SUB: {
					UNDEFINED: undefined,
					FUNCTION: /* istanbul ignore next */ function(a) {
						return a + 1;
					},
					CODE: "(1+2)",
					REGEXP: /abc/i,
					STRING: JSON.stringify("string")
				}
			},
			"process.env.DEFINED_NESTED_KEY": 5,
			"process.env.DEFINED_NESTED_KEY_STRING": '"string"',
			"typeof wurst": "typeof suppe",
			"typeof suppe": "typeof wurst",
			wurst: "suppe",
			suppe: "wurst"
		})
	]
};
