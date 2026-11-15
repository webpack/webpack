Object.defineProperty(exports, "a", {
	get: function () {
		global.cjsModernEffects.push("logical-assignment-getter");
		return 1;
	}
});
exports.a ||= 2;
