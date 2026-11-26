var log = [];
var v = {
	valueOf: function () {
		log.push("v");
		return 6;
	}
};
var x = 0xfffffff3;
var big = BigInt(5);
function t(f) {
	try {
		console.log(f());
	} catch (e) {
		console.log(e.name);
	}
}
t(function () {
	return [v & 5 | 0, 0 | v & 3, v << 1 ^ 0, 0 ^ v >> 1, (v ^ 1) | 0];
});
t(function () {
	return [(x & 7 | 0) | 0, 0 | (0 | x << 2), ((x & 7) ^ 5) ^ 5, (x & 1 | 1) | 0];
});
t(function () {
	return [(x >>> 1) | 0, (x >>> 1 | 0) | 0, (x | 1) | 0, 0 ^ (x | 1)];
});
t(function () {
	return [(x & 1 | 0) & 3, (x & 1 | 0) * 2, -(x & 1 | 0), (x & 1 | 0) in [1], x & 1 & 2, (x & 7 | 0 | 0) & 3];
});
t(function () {
	return big & BigInt(1) | 0;
});
t(function () {
	return log.join("");
});
