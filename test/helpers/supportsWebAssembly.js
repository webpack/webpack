module.exports = function supportsWebAssembly() {
	try {
		return typeof WebAssembly !== "undefined";
	} catch (e) {
		return false;
	}
};
