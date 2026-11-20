var b = 1;
do {
	console.log(
		(function () {
			return a ? "FAIL" : (a = "PASS");
			try {
				a = 2;
			} catch (a) {
				var a;
			}
		})()
	);
} while (b--);

function f(x) {
	return [typeof c, typeof d, typeof e, x];
	if (x) {
		var c = 1;
	}
	for (var d in x) {
		var e;
	}
	while (x) var c;
	{
		var d = 2;
	}
}
console.log(f(1));

function g() {
	return typeof h;
	if (b) {
		function h() {}
	}
}
console.log(g());

function k(n) {
	switch (n) {
		case 1:
			throw new Error("x");
	}
	label: {
		if (n) break label;
		try {
			n++;
		} catch (n) {
			var m = 3;
		}
	}
	return [n, m];
}
console.log(k(2));
