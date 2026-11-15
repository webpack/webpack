(function (root, factory) {
	if (typeof exports === "object") module.exports = factory();
	else root.lib = factory();
})(this, function () {
	global.cjsEffects.push("umd");
	return { a: 1 };
});
