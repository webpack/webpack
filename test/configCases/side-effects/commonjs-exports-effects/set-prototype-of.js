Object.setPrototypeOf(exports, {
	set a(value) {
		global.cjsEffects.push("set-prototype-of");
	}
});
exports.a = 1;
