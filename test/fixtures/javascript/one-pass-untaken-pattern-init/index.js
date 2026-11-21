function patterns() {
	if (false) {
		var [, , b] = [1, 2, 3],
			{ c } = { c: 1 },
			a = 1,
			[d] = [];
	}
	console.log(a, b, c, d);
}
patterns();

function defaults() {
	if (0) {
		var { x = 1 } = {};
	} else {
		var y = 2;
	}
	console.log(typeof x, y);
}
defaults();
