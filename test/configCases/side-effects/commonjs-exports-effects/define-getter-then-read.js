Object.defineProperty(exports, "a", {
	get: function () {
		global.cjsEffects.push("define-getter-then-read");
		return 1;
	}
});
var value = exports.a;
