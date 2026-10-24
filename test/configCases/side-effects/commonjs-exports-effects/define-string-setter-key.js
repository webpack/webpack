Object.defineProperty(exports, "a", {
	"set": function () {
		global.cjsEffects.push("define-string-setter-key");
	}
});
exports.a = 1;
