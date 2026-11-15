var operand = {
	valueOf: function () {
		global.cjsEffects.push("value-unary-coercion");
		return 1;
	}
};
exports.a = -operand;
