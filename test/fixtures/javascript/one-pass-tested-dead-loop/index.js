var count = 0;
function step() {
	count++;
	return count;
}
function show() {
	console.log([].slice.call(arguments).join());
}
var first = step();
for (var a = step(), b = 5; (step(), 3) - 3 && b > 0; ) {
	var c = (function () {
		step();
	})(a++);
}
show(first, a, c, count);
var d = 1;
for (; (step(), 0); ) {
	var e;
}
show(d, e, count);
for ((d = step()); (step(), "x") * 1; ) {}
show(d, count);
if ((step(), 1) - 1) show("never");
else show("else", count);
for (var f = step(); 0 + (step(), 0); ) {
	var g;
}
show(f, g);
for (var h in {}) for (; (step(), 0); ) var i = 1;
show(h, i, count);
