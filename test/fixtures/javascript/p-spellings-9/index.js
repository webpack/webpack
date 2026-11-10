function f(a, b, c, d) {
	(!a || !b) && (c() || d());
	if ((c(), !!b)) console.log("b");
}
f(1, 1, () => 0, () => console.log("d"));
f(0, 0, () => 1, () => console.log("e"));
