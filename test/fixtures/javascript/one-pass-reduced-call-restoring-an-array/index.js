function run() {
	return (function (x) {
		let a = [1, 2];
		return (function (p, q) {
			return [p[0], p[1], q];
		})(a, x);
	})([3]);
}
console.log(String(run()));
function stable(x) {
	const a = [1, 2];
	return (function (p, q) {
		return [p[0], p[1], q];
	})(a, x);
}
console.log(String(stable(3)));
