// A `continue` ending what runs of a loop's body, only a `var` after it, goes.
for (var i = 0; i < 3; i++) {
	console.log(i);
	continue;
	var z = i;
}
console.log(z);
(function () {
	do {
		continue;
		var b = "defined";
	} while (b && b.c);
	console.log(b);
})();
var k = 0;
do {
	k++;
	if (k < 3) continue;
	console.log("k", k);
	continue;
	var w = 5;
} while (k < 5);
console.log(w);
outer: for (var a = 0; a < 2; a++) {
	for (var c = 0; c < 2; c++) {
		console.log(a, c);
		continue outer;
		var y = 1;
	}
}
console.log(y);
var n = 0;
while (n < 2) {
	n++;
	console.log(n);
	continue;
	function q() {}
}
