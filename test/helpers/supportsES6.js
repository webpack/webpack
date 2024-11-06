module.exports = function supportsES6() {
	try {
		eval("class A {}");
		return true;
	} catch (_err) {
		return false;
	}
};
