"use strict";

module.exports = {
	findBundle(index) {
		return [index === 2 ? "main.js" : `${["deno", "node"][index]}-main.mjs`];
	}
};
