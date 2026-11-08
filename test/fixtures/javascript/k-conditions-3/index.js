function f(a, b, c, x) {
	a ? b(a) : b(c);
	a ? b(c) : b(a);
	a ? b(a) : b(c = 1);
	if (a) b(a);
	else b(c);
	a ? x = a : x = c;
	a ? x = c : x = a;
	if (a) x = a;
	else x = c();
	if (a) x = a;
	else x = c ? 1 : 2;
	a ? x.y = a : x.y = c;
	return x;
}
