module.exports = function supportsWebAssembly() {
	try {
		return typeof Blob !== "undefined";
	} catch (_err) {
		return false;
	}
};
