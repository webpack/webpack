// A `do` loop whose test is false runs its body once, and unwraps where no
// `break` or `continue` prints in it, those it holds printing nothing.
var b = 1,
	c = 0;
do {
	c++;
	if (!--b) continue;
	c = 1 + c;
} while (0);
console.log(b, c);
for (var i = 0; i < 3; i++) {
	do {
		console.log(i);
		if (i == 1) continue;
		console.log("b");
	} while (0);
	console.log("e");
}
var n = 0;
do {
	n++;
	if (n > 9) break;
	console.log("continue", n);
} while (0);
console.log(n);
