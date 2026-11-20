var c = 0;
function log(value) {
	console.log("log", value);
	return value;
}
(function () {
	c = 1 + c;
})((c += 1));
console.log(c);
!(function (unused) {
	c++;
})(log(c), log("extra"));
console.log(c);
(function (b, d) {
	c += d;
	if (c > 10) return;
	c *= 2;
})(log(1), 3, log(2));
console.log(c);
(function () {
	console.log(arguments.length);
})(log(4));
for (var i = 0; i < 2; (function () {
	i++;
})(log(i)));
