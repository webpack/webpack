(function () {
	function g(value) {
		next();
		return value;
	}
	function g2(value) {
		next();
		return value;
	}
	function f(t) {
		const k = t.y;
		if (tok() === 142 && !t.x) {
			return g(k);
		} else {
			return k;
		}
	}
	function h(t) {
		const k = t.y;
		if (tok() === 142 && !t.x) {
			throw g2(k);
		} else {
			throw k;
		}
	}
	function next() {}
	function tok() {
		return 142;
	}
	console.log(f({ y: 1 }), f({ x: 1, y: 2 }));
	try {
		h({ y: 3 });
	} catch (e) {
		console.log(e);
	}
})();
