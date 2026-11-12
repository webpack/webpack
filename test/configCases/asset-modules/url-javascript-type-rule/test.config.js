"use strict";

const cases = ["type-rule", "loader-rule", "url-rule", "future"];

module.exports = {
	findBundle(i) {
		return `./${cases[i]}/bundle.${cases[i] === "future" ? "mjs" : "js"}`;
	}
};
