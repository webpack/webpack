function f(n, u) {
	(n = u(), n) + 1;
	(n = u(), n) ? console.log(n) : u();
}
f(0, () => 1);
