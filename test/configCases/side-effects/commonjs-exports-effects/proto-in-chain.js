exports.a = exports.__proto__ = {
	set b(value) {
		global.cjsEffects.push("proto-in-chain");
	}
};
exports.b = 1;
