var a = 1;
var b = {
	get null() {
		return a;
	},
	set undefined(c) {
		a = c;
	},
	Infinity: 3
};
console.log(b.null, (b.undefined = 2), b.null, b.Infinity);
