function f(x, a, b) {
	while (x--) {
		if (a) continue;
		if (b) continue;
	}
	return x;
}
function g(x, y) {
	while (x) {
		if (y) {
			throw x;
		}
		throw x;
	}
	throw y;
}
function h(a, c) {
	switch (a) {
		case 3: {
			for (var b of c) console.log(b);
		}
	}
}
console.log(f(2, 0, 0));
try {
	g(1, 0);
} catch (e) {
	console.log(e);
}
h(3, [4]);
