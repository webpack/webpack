// An unnamed function called where it is written drops the parameters after
// the last one read, which strict code reading `arguments` maps none of.
var log = [];
console.log(
	(function (a, b) {
		for (var i = 0; i < 1; i++) log.push(i);
		return log.length;
	})(log.push("a"), log.push("b"))
);
console.log(
	(function (a, b) {
		"use strict";
		for (var i = 0; i < 1; i++) log.push(i);
		return arguments.length + arguments[1];
	})(1, 2)
);
console.log(
	(function (a, b) {
		for (var i = 0; i < 1; i++) log.push(i);
		return arguments.length + arguments[1];
	})(1, 2)
);
console.log(
	(function named(a, b) {
		for (var i = 0; i < 1; i++) log.push(i);
		return named.length;
	})(1, 2)
);
console.log(
	((first, second) => {
		for (var i = 0; i < 1; i++) log.push(i);
		return first;
	})(3, 4)
);
console.log(log.join());
