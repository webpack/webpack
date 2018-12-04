var DefinePlugin = require("../../../../lib/DefinePlugin");
const Module = require("../../../../lib/Module");
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
			suppe: "wurst",
			RUNTIMEVALUE_CALLBACK_ARGUMENT_IS_A_MODULE: DefinePlugin.runtimeValue(
				function({ module }) {
					return module instanceof Module;
				}
			),
			A_DOT_J: '"a.j"'
		})
	]
};
