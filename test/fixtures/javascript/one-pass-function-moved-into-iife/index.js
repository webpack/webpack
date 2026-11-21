(function () {
	function f() {
		console.log(this.p);
	}
	(function () {
		var o = { p: "PASS", f: f };
		o.f();
	})();
})();
(function () {
	var g = function () {
		return 1;
	};
	(function () {
		console.log([g][0]());
	})();
})();
var seen = [];
(function () {
	function h() {}
	(function again() {
		seen.push(h);
		if (seen.length < 2) again();
	})();
	(function () {
		seen.push(h);
		if (seen.length < 4) arguments.callee();
	})();
	for (var i = 0; i < 2; i++) {
		(function () {
			seen.push(h);
		})();
	}
	console.log(seen.length, seen[0] === seen[5]);
})();
