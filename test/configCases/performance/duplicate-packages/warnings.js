"use strict";

module.exports = [
	[
		/Multiple versions of the package "dup-lib" \(1\.0\.0, 2\.0\.0\) are included in this build:/,
		/\* 1\.0\.0 from \.\/node_modules\/dup-consumer\/node_modules\/dup-lib, 1 module\(s\)\n {4}Included by \.\/node_modules\/dup-consumer\/index\.js/,
		/\* 2\.0\.0 from \.\/node_modules\/dup-lib, 1 module\(s\)\n {4}Included by \.\/index\.js/
	]
];
