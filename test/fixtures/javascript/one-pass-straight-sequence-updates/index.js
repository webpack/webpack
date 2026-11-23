var a = 1,
	b = 2;
a--, b++;
console.log(a, b);
var s = "x";
(s += 1), (s += "y");
console.log(s);
var n = 1;
(n <<= 3), n++;
console.log(n);
function* steps() {
	var c = 1;
	c++, yield c, c++;
	console.log(c);
}
for (var v of steps()) console.log(v);
var o = {
	valueOf: function () {
		console.log("valueOf");
		return 3;
	}
};
var p = o;
p++, p++;
console.log(p);
var r = 1;
function read() {
	console.log("read", r);
}
r++, read();
console.log(r);
read();
