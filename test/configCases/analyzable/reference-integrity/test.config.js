"use strict";

const NAMES = ["flat", "deep", "hashed"];

module.exports = {
	findBundle(i) {
		// The `deep` config emits its entry one directory down.
		return [i === 1 ? `./deep/${NAMES[i]}.mjs` : `./${NAMES[i]}.mjs`];
	}
};
