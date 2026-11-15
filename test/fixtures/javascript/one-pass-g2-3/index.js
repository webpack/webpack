for (;;) {
	if (y) break;
	let y = foo();
	bar(y);
	bar(y);
}
for (;;) {
	if (eval("y")) break;
	let y = foo();
	bar(y);
	bar(y);
}
for (;;) {
	if (x) break;
	let { y } = foo();
	bar(y);
	bar(y);
}
for (;;) {
	if (x) break;
	l: function h() {}
	bar(h);
}
