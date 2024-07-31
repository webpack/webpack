module.exports = function supportsWebAssembly() {
	try {
		return typeof WebAssembly !== "undefined";
	} catch (_err) {
		return false;
	}
};
