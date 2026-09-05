"use strict";

module.exports = [
	[
		// Only the jpg: the png's binding is read, and the svg is imported with
		// no binding at all, which is how a file is asked for on purpose.
		/unused assets: \d+ bytes are emitted for an import whose binding nothing reads/,
		/\n {2}\.\.\/\.\.\/asset-modules\/_images\/file\.jpg \(\d+ bytes\)/
	]
];
