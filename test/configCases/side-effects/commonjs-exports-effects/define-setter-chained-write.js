Object.defineProperty(exports, "a", {
	set: function () {
		global.cjsEffects.push("define-setter-chained-write");
	}
});
exports.b = exports.a = 1;
