console.log(
	new {
		f: function (a) {
			this.a = a;
		}
	}.f(42).a
);
console.log(
	new {
		f: class {
			constructor(b) {
				this.b = b;
			}
		}
	}.f(7).b
);
try {
	new { f: () => 1 }.f();
} catch (e) {
	console.log(e.name);
}
try {
	new { f() {} }.f();
} catch (e) {
	console.log(e.name);
}
