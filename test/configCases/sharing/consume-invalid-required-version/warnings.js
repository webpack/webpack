"use strict";

module.exports = [
	[
		/Unable to parse required version "1\.0\.0-" for "dash-range": Invalid version range "1\.0\.0-"/
	],
	[
		/Unable to use required version for "mixed-range" from .+consume-invalid-required-version[\\/]package\.json: expected a string, got number/
	],
	[
		/Unable to use required version for "nested-number-range" from .+nested[\\/]package\.json: expected a string, got number/
	],
	[
		/Unable to use required version for "number-range" from .+consume-invalid-required-version[\\/]package\.json: expected a string, got number/
	],
	[
		/Unable to parse required version ">=1\.0\.0\+" for "plus-range": Invalid version range "1\.0\.0\+"/
	]
];
