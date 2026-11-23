var c = 0;
!function (a) {
	a = 0;
}([
	{ 0: (c = c + 1), length: (c = 1 + c) },
	typeof void function () {
		console.log("typeof void", c);
	}()
]);
[c++, void function () {
	console.log("void", c);
}()];
c++, [c++, void function () {
	console.log("after", c);
}()];
({ a: c++, b: void function () {
	console.log("property", c);
}() });
console.log(c);
