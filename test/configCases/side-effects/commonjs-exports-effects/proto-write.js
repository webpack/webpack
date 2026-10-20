exports.__proto__ = {
	set a(value) {
		global.cjsEffects.push("proto-write");
	}
};
exports.a = 1;
