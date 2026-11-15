(a, b) ? c : d;
f(), (a(), b) ? c : d;
x = (a(), b) ? c : d;
(a(), b = g()) ? c() : d();
(a(), b ? e : f) ? c() : d();
(function () { g(); }(), b) ? c() : d();
function g() {
	return (a(), b) ? c : d;
}
if ((a(), b) ? c : d) g();
function k(n) {
	return (n = x(), n) ? n++ : u();
}
