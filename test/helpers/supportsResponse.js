module.exports = function supportsResponse() {
	try {
		return typeof Response !== "undefined";
	} catch (_err) {
		return false;
	}
};
