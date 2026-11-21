var a = 100,
	b = 10;
function f() {
	switch (1) {
		case 1:
			b = a++;
			return ++b;
			var b;
	}
}
f();
console.log(a, b);
function h() {
	switch (1) {
		case 1:
			x = 3;
			break;
		case 2:
			var x;
	}
	return x;
}
console.log(h());
switch (1) {
	case (console.log("effect"), 2):
		var y;
}
console.log(y);
var c = Math.random() < 2;
if (c)
	switch (1) {
		case (console.log("kept"), 2):
			var z;
	}
else console.log(3);
console.log(z);
label: switch (1) {
	case (console.log("labeled"), 2):
		var w;
}
console.log(w);
