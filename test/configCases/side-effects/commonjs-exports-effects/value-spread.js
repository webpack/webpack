var source = {
	get a() {
		global.cjsEffects.push("value-spread");
		return 1;
	}
};
exports.a = Object.assign({}, source);
