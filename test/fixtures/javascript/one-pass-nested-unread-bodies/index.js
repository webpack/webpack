// A call opening the body of a call printing its statements in place prints so too.
if (Math) {
	(function () {
		(function () {
			return console.log("inner");
		})();
		console.log("outer");
	})();
}
if (Math) {
	(function () {
		(function () {
			if (Math) return;
			console.log("skipped");
		})();
		console.log("after");
	})();
}
if (Math) {
	(function () {
		console.log("first");
		(function () {
			console.log("second");
		})();
	})();
} else console.log("else");
if (Math) {
	(function () {
		(function () {
			"use strict";
			console.log("strict");
		})();
		console.log("kept");
	})();
}
if (Math) {
	(function () {
		(function () {
			console.log(typeof arguments);
		})();
		console.log("arguments");
	})();
}
for (var i = 0; i < 2; i++) {
	(function () {
		(function () {
			console.log(i);
		})();
		if (i) console.log("looped");
	})();
}
var a = function () {
	console.log("a");
};
var b = function () {
	a();
	console.log("b");
};
if (Math) b();
