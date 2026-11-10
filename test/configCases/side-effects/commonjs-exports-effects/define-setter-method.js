Object.defineProperty(exports, "a", {
	set(value) {
		global.cjsEffects.push("define-setter-method");
	}
});
exports.a = 1;
