console.log(function (b) {
	return b + "ING";
	var b;
}("PASS"));
console.log(function (c) {
	var c;
	return c + 1;
}(2));
console.log(function (d) {
	var d = 1;
	return d + "!";
}("kept"));
console.log(function (e) {
	for (var e in { x: 1 });
	return e;
}("kept"));
console.log(function (f) {
	f = 3;
	return f;
	var f;
}("kept"));
console.log(function (g) {
	arguments[0] = "set";
	return g;
	var g;
}("kept"));
