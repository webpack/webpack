Object.defineProperty(exports, "a", {
	set: function () {
		global.cjsEffects.push("define-setter-write");
	}
});
exports.a = 1;
