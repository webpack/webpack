Object.defineProperty(exports, "a", {
	set: function () {
		global.cjsEffects.push("define-setter-declaration-write");
	}
});
var value = (exports.a = 1);
