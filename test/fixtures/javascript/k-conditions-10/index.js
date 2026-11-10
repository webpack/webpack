if (x() || true) y();
if (x() && false) y();
if (foo() && false) z();
for (;;) if (x() || 1) y();
function f() {
	if (g() || 1) {
		a();
		b();
	}
	return 1;
}
if ((a(), 1)) b();
if (x() || 1) if (u) v();
if (x() || 1) {
	let w = 1;
	use(w);
}
for (;;) if (x() || 1) { a(); b(); }
if (x() || 1) y(); else z();
if (x() && 0) y(); else { a(); b(); }
if (x() && 0) y(); else if (u) v();
