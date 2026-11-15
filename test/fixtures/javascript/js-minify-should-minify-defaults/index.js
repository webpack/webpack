
/*! @license MIT - keep me */
// a line comment
"use strict";
function unusedHelper(a, b) { return a + b; }
sink(function outer() {
	let list = [1, 2, 3].map((value) => value + 1);
	if (list.length > 0) { console.log(list); } else { console.log("empty"); }
	return list;
});
