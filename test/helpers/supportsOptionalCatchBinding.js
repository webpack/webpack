"use strict";

module.exports = function supportsOptionalCatchBinding() {
	try {
		eval("try {} catch {}");
		return true;
	} catch {
		return false;
	}
};
