module.exports = function (config) {
	// terser doesn't support static {}
	if (config.mode === "production") return false;

	try {
		eval("class A { static {} }");
		return true;
	} catch {
		return false;
	}
};
