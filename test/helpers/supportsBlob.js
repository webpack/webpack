module.exports = function supportsBlob() {
	try {
		return typeof Blob !== "undefined";
	} catch (_err) {
		return false;
	}
};
