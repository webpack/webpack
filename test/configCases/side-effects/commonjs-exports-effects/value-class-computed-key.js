exports.a = class {
	[(function () {
		global.cjsEffects.push("value-class-computed-key");
		return "a";
	})()]() {}
};
