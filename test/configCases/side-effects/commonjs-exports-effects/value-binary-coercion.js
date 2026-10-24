var operand = {
	valueOf: function () {
		global.cjsEffects.push("value-binary-coercion");
		return 1;
	}
};
exports.a = operand + 1;
