"use strict";

function a() {
	return 1;
}

const b = 2;

// shorthand and keyed properties, each a named export of its own
module.exports = { a, b, c: 3 };
