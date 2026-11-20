function f(o) {
	g(o);
	(function () {
		h(arguments);
	})();
	{
		k(o.x);
	}
	if (true) {
		m(o.y);
	}
	return n(o);
}
a();
b();
(0, function () {
	work();
}());
f();
