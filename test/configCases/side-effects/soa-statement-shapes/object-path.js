"use strict";

// parsed with soaAst off: the object walkers call the same taps directly;
// the nested statements run the scan below the top level before any flag
function pretendAsm(x) {
	"use asm";
	var t = x ? 1 : 2;
	var l = x && 1;
	if (x) {
		t = 2;
	}
	return t + l;
}

debugger;
debugger;

module.exports = { pretendAsm };
