function sloppy() {
	var before = typeof named;
	value = 10;
	return [before, value].join();
	if (value) {
		console.log("unreachable");
		var value;
		function named() {}
	}
}
console.log(sloppy());

function strict() {
	"use strict";
	value = 10;
	return value;
	if (value) {
		console.log("unreachable");
		var value;
		function named() {}
	}
}
console.log(strict());

function both(flag) {
	return [typeof first, typeof second].join();
	if (flag) {
		var first = 1;
	} else {
		var second = 2,
			first;
	}
}
console.log(both(true));

function loops() {
	for (var index = 0; index < 2; index++) {
		continue;
		if (index) {
			var last = index;
		}
	}
	return [index, last].join();
}
console.log(loops());

function caught(error) {
	try {
		throw 1;
	} catch (error) {
		return error;
		if (error) {
			var error = 2;
		}
	}
}
console.log(caught(5));
