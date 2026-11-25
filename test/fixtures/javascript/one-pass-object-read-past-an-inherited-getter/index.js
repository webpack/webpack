Object.defineProperty(Object.prototype, "b", {
	get() {
		this.x = 2;
		return 5;
	},
	configurable: true
});
function f() {
	const o = { x: 1 };
	return [o.b, o.x];
}
console.log(f());
