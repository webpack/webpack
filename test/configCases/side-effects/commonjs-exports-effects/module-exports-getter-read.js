module.exports = {
	get a() {
		global.cjsEffects.push("module-exports-getter-read");
		return 1;
	}
};
var value = module.exports.a;
