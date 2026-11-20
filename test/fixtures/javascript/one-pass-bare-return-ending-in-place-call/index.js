// A `return` of nothing ending a block that ends a function called in place
// prints nothing, so its statements stand for the call.
var t = 1;
var u = 0;
(function () {
	if (t) {
		console.log("a");
		return;
	}
})();
(function () {
	{
		console.log("b");
		return;
	}
})();
(function () {
	if (u);
	else {
		console.log("c");
		return;
	}
})();
(function () {
	if (t) {
		if (!u) {
			console.log("d");
			return;
		}
	}
})();
(function () {
	if (u) {
		console.log("e");
		return;
	}
	console.log("f");
})();
(function () {
	for (var i = 0; i < 2; i++) {
		console.log("g", i);
		return;
	}
})();
(function () {
	if (true) {
		const name = "PASS";
		(function (name) {
			console.log(name);
		})(name);
		return;
	}
})();
