"use strict";

// The test reads the emitted files through `import.meta.url`, which needs
// Node 12+ to parse when the harness executes the bundle.
module.exports = function filter() {
	const major = Number(process.versions.node.split(".", 1)[0]);
	return major >= 12;
};
