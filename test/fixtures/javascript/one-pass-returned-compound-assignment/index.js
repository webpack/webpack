function step(x) {
	var i = ++x;
	return x += i;
}
function shift(a, b) {
	return a && (b >>= 1);
}
function pick(c, b) {
	return c ? (b += 1) : (b -= 1);
}
function call(s) {
	return s += String(s);
}
var square = function (n) {
	return n *= n;
};
function kept(n) {
	try {
		return n += 1;
	} finally {
		console.log("finally", n);
	}
}
function read(n) {
	var get = function () {
		return n;
	};
	return n += 1, get();
}
function mapped(n) {
	arguments[0] = 5;
	return n += 1;
}
console.log(step(1), shift(1, 8), pick(0, 4), call("a"), square(3));
console.log(kept(1), read(1), mapped(1));
