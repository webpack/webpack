(function () {
	function f() {
		console.log(this.p);
	}
	(function () {
		var o = { p: "PASS", f: f };
		o.f();
	})();
	(function () {
		var a = ["PASS", function () { console.log(this[0]); }];
		a[1]();
	})();
	(function () {
		let q = 1;
		console.log(q);
	})();
	(function () {
		var kept = 2;
		console.log(kept, typeof kept);
	})();
	console.log(typeof kept, typeof q);
})();
