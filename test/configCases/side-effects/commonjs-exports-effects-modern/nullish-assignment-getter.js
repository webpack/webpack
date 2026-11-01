Object.defineProperty(exports, "a", {
	get: function () {
		global.cjsModernEffects.push("nullish-assignment-getter");
		return 1;
	}
});
exports.a ??= 2;
