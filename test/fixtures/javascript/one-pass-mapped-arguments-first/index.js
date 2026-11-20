function outer(p) {
	(function (x) {
		console.log(x);
	})(p, (arguments[0] = 2));
}
outer(1);
function strict(p) {
	"use strict";
	(function (x) {
		console.log(x);
	})(p, (arguments[0] = 2));
}
strict(3);
function plain(p) {
	(function (x) {
		console.log(x);
	})(p, console.log(4));
}
plain(5);
