"use strict";

module.exports = {
	findBundle(i) {
		return [`./${i === 0 ? "assign-only" : "read"}/main.mjs`];
	}
};
