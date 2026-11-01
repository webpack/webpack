Object.defineProperty(exports, "a", {
	set: function () {
		global.cjsEffects.push("define-setter-conditional-write");
	}
});
if (typeof exports === "object") exports.a = 1;
