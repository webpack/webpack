"use strict";

function returnThis() {
	return this;
}

var sa = returnThis;
var sb = returnThis;

export {
	sa,
	sb
}

export default returnThis;
