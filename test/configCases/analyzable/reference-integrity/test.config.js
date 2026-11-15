"use strict";

const fs = require("fs");
const path = require("path");

const NAMES = ["flat", "deep", "hashed"];

module.exports = {
	moduleScope(scope) {
		scope.fs = fs;
		scope.path = path;
	},
	findBundle(i) {
		// The `deep` config emits its entry one directory down.
		return [i === 1 ? `./deep/${NAMES[i]}.mjs` : `./${NAMES[i]}.mjs`];
	}
};
