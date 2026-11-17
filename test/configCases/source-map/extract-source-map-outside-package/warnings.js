"use strict";

module.exports = [
	[
		/their content is not included/,
		/outside\.txt/,
		/outside-absolute\.ts/,
		{ message: /^(?![^]*outside-embedded)/ }
	]
];
