var a = 1;
for (var v of []) {
	console.log("x");
	if (true) {
		console.log("y");
		if (a++) console.log("z");
	}
}
while (a > 5) {
	console.log("w");
	{
		console.log("v");
		a--;
		if (a) console.log("u");
	}
}
console.log("end", a);
