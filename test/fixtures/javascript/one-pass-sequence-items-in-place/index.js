// The items of a sequence no list holds fold into one another: a `return`'s,
// an unbraced body's, a case's last; the last item stays.
function returned(x) {
	var a;
	return a = [x], a.join("-");
}
console.log([1, 2].map(returned));
function log(value, other) {
	console.log(value, other);
}
function branch(x) {
	var a, b;
	if (x) a = [x], log(a);
	else b = [0], log(b, x);
}
branch(1);
branch(0);
function looped(n) {
	var a;
	for (var i = 0; i < n; i++) a = [i], console.log(a);
}
looped(2);
looped(1);
function cased(n) {
	var a;
	switch (n) {
		case 1:
			a = [n], console.log(a);
	}
}
cased(1);
cased(2);
// Called, a member read off stays a value; read again, a name keeps its write.
var box = {
	get: function () {
		return this === box ? "this" : "value";
	}
};
function called(o) {
	var a;
	return a = o.get, a();
}
console.log([box, box].map(called));
function again(x) {
	var a;
	if (x) a = [x], console.log(a);
	return a;
}
console.log([3, 0].map(again));
