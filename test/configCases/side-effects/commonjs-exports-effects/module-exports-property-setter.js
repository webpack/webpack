module.exports = {
	set a(value) {
		global.cjsEffects.push("module-exports-property-setter");
	}
};
module.exports.a = 1;
