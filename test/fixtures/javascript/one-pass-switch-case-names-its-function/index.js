"use strict";
// A case testing a function the `switch` declares, made as it is entered and
// equal to no primitive, never matches: a known `switch` folds past it.
var log = [];
function known() {
	let value = 1;
	switch (value) {
		case value:
			async function value() {}
	}
	return value;
}
function fallback() {
	switch (1) {
		case named:
			function named() {}
			log.push("named");
			break;
		default:
			log.push("default");
	}
}
function later() {
	switch (2) {
		case named:
			function named() {}
			break;
		case 2:
			log.push("two");
	}
}
// One a kept case reads keeps the `switch`.
function read() {
	switch (1) {
		case named:
			function named() {}
			break;
		default:
			log.push(typeof named);
	}
}
fallback();
later();
read();
console.log(known(), log);
