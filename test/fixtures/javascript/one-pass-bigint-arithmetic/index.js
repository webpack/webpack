var x = 2n;
console.log({ sum: 10n + 15n, sub: 1n - 3n, mul: 5n * 5n, div: 15n / 5n });
console.log((1n + 2n) * x, (1n - 3n) * x, (1n - 3n).toString(), (1n + 2n).toString());
console.log(x - (1n - 3n), -(1n - 3n), 2n ** 64n, 2n ** 3n, 7n % 4n, ~5n + 1n);
console.log(1n << 3n, -9n >> 1n, 6n & 3n, 6n | 3n, 6n ^ 3n, typeof (1n + 2n));
var y = 1n - 3n;
y -= 1n - 3n;
console.log(y, x ? 1n - 4n : 2n - 1n, [1n - 9n]);
try {
	console.log(1n / 0n);
} catch (e) {
	console.log(e.name);
}
try {
	console.log(5n % 0n);
} catch (e) {
	console.log(e.name);
}
try {
	console.log(2n ** -1n);
} catch (e) {
	console.log(e.name);
}
try {
	console.log(1n >>> 0n);
} catch (e) {
	console.log(e.name);
}
