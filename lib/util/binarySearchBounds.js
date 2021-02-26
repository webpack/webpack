/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Mikola Lysenko @mikolalysenko
*/

"use strict";

/* cspell:disable-next-line */
// Refactor: Peter Somogyvari @petermetz

const compileSearch = (funcName, predicate, reversed, extraArgs, earlyOut) => {
	const code = [
		"function ",
		funcName,
		"(a,l,h,",
		extraArgs.join(","),
		"){",
		earlyOut ? "" : "var i=",
		reversed ? "l-1" : "h+1",
		";while(l<=h){var m=(l+h)>>>1,x=a[m]"
	];

	if (earlyOut) {
		if (predicate.indexOf("c") < 0) {
			code.push(";if(x===y){return m}else if(x<=y){");
		} else {
			code.push(";var p=c(x,y);if(p===0){return m}else if(p<=0){");
		}
	} else {
		code.push(";if(", predicate, "){i=m;");
	}
	if (reversed) {
		code.push("l=m+1}else{h=m-1}");
	} else {
		code.push("h=m-1}else{l=m+1}");
	}
	code.push("}");
	if (earlyOut) {
		code.push("return -1};");
	} else {
		code.push("return i};");
	}
	return code.join("");
};

const compileBoundsSearch = (predicate, reversed, suffix, earlyOut) => {
	const arg1 = compileSearch(
		"A",
		"x" + predicate + "y",
		reversed,
		["y"],
		earlyOut
	);

	const arg2 = compileSearch(
		"P",
		"c(x,y)" + predicate + "0",
		reversed,
		["y", "c"],
		earlyOut
	);

	const fnHeader = "function dispatchBinarySearch";

	const fnBody =
		"(a,y,c,l,h){\
if(typeof(c)==='function'){\
return P(a,(l===void 0)?0:l|0,(h===void 0)?a.length-1:h|0,y,c)\
}else{\
return A(a,(c===void 0)?0:c|0,(l===void 0)?a.length-1:l|0,y)\
}}\
return dispatchBinarySearch";

	const fnArgList = [arg1, arg2, fnHeader, suffix, fnBody, suffix];
	const fnSource = fnArgList.join("");
	const result = new Function(fnSource);
	return result();
};

module.exports = {
	ge: compileBoundsSearch(">=", false, "GE"),
	gt: compileBoundsSearch(">", false, "GT"),
	lt: compileBoundsSearch("<", true, "LT"),
	le: compileBoundsSearch("<=", true, "LE"),
	eq: compileBoundsSearch("-", true, "EQ", true)
};
