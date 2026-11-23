// A loop leaving at once never runs its update, nor one testing false its body.
var a = 9, b = 0;
for (const a = 1; a < 3; ++b) break;
console.log(a, b);
var c = 0;
for (;;++c) {
	break;
}
console.log(c);
var d = 1;
for (; 0; d++) d = 5;
console.log(d);
var e = 0;
for (var i = 0; ; e++) {
	if (i++ > 2) break;
}
console.log(e, i);
var f = 0;
L: for (;; f++) {
	if (f > 1) break L;
}
console.log(f);
function g() {
	var n = 2;
	for (;; n--) break;
	return n;
}
console.log(g());
