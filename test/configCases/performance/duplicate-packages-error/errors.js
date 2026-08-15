"use strict";

module.exports = [
	[
		/The package "copied-lib" \(1\.0\.0\) is included 2 times in this build:/,
		/\* 1\.0\.0 from \.\/node_modules\/copied-lib, 1 module\(s\)\n {4}Included by \.\/index\.js/,
		/\* 1\.0\.0 from \.\/node_modules\/copy-consumer\/node_modules\/copied-lib, 1 module\(s\)\n {4}Included by \.\/node_modules\/copy-consumer\/index\.js/
	]
];
