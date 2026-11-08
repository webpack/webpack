var a = 1;
a++;
(function () {
	console.log("f");
}).call(this);
console.log(a);
({
	get x() {
		console.log("g");
		return 1;
	}
}).x;
(function () {
	console.log("h");
}).call(this);
console.log(2);
