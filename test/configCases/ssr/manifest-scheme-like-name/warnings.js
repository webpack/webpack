"use strict";

// `q?r:s` is named so on purpose, to check the `_` its filename gets
const warning = [/Chunk name "q\?r:s" contains '\?' or '#'/];
const hashWarning = [/Chunk name "h#i:j" contains '\?' or '#'/];

// the warnings of all builds in order; builds 6 to 8 have none
module.exports = [
	warning,
	warning,
	warning,
	warning,
	warning,
	warning,
	warning,
	hashWarning,
	hashWarning
];
