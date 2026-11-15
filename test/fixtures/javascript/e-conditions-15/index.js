var x;
x = x || 1;
var y;
y = y + 1;
function f(a) {
	var a;
	a = a ?? 2;
	let b;
	b = b || 3;
	return [a, b];
}
