function f() {
	const o = {
		x: 1,
		f: function () {
			this.x = 2;
		}
	};
	(o?.f)();
	return o.x;
}
console.log(f());
