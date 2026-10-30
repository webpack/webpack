exports.a = class extends (function () {
	global.cjsEffects.push("value-class-extends-call");
	return Object;
})() {};
