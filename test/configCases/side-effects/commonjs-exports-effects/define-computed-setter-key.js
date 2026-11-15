var key = "set";
Object.defineProperty(exports, "a", {
	[key]: function () {
		global.cjsEffects.push("define-computed-setter-key");
	}
});
exports.a = 1;
