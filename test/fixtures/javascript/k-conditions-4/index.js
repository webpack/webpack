function f(a, b) {
	if (a == null) a.b();
	if (a != null);
	else b();
	if (null == a.c) {
		a.c = b;
		b = 0;
	}
	if (a == null) b = a ? 1 : 2;
	if (a == null) if (b) a();
	else b();
	if (a == null) {
		b();
		if (a) b();
	}
	if (a() == null) b();
	return b;
}
