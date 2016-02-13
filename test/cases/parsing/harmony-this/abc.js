"use strict";

function returnThis() {
	return this;
}

var a = returnThis;
var b = returnThis;

export {
	a,
	b
}

export default returnThis;
