var Type = {};
Type[Symbol.hasInstance] = function () {
	global.cjsEffects.push("value-instanceof");
	return true;
};
exports.a = {} instanceof Type;
