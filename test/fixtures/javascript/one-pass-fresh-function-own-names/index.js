var a = 42;
!(function (a) {
	console.log(a());
})(function (a) {
	return a;
});
!(function (a) {
	console.log(a(3));
})(function (b) {
	var a = b + 1;
	return a;
});
!(function (a) {
	console.log(a(4));
})(function a(b) {
	return b ? a(b - 1) + 1 : 0;
});
console.log(a);
