(function () {
	var a = 1;
	(function () {
		var b = a;
		console.log(b, b);
	})();
})();
(function () {
	(function () {
		var b = c;
		console.log(b, b);
	})();
	var c = 2;
	(function () {
		var b = c;
		console.log(b, b);
	})();
})();
(function () {
	var d = "s";
	function late() {
		(function () {
			var b = d;
			console.log(b, b);
		})();
	}
	late();
})();
(function () {
	var e = 3;
	(function () {
		eval("var e = 4");
		var b = e;
		console.log(b, b);
	})();
})();
(function () {
	var f = 5;
	var it = (function* () {
		var b = f;
		yield b;
		yield b;
	})();
	console.log(it.next().value, it.next().value);
})();
