"use strict";

module.exports = {
	findBundle(index) {
		return [
			index === 3 ? "main.js" : `${["deno", "node", "concat"][index]}-main.mjs`
		];
	}
};
