var source = {
	get a() {
		global.cjsEffects.push("value-getter-read");
		return 1;
	}
};
exports.a = source.a;
