module.exports = function supportsOptionalCatchBinding() {
	try {
		eval("try {} catch {}");
		return true;
	} catch (_err) {
		return false;
	}
};
