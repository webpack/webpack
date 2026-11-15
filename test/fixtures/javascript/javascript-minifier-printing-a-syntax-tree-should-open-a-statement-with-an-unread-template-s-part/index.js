class A {
	constructor({ a: p, ...q } = {}) {
		if (g()) return;
		`a${void function () {
			if (h()) return;
			g();
		}()}`;
	}
}
function b() {
	if (g()) return;
	`${typeof function () {
		if (h()) return;
		g();
	}()}${g()}`;
}
function c() {
	if (g()) return;
	`${void { a: g() }.b}`;
}
function d() {
	if (g()) return;
	`${void class {
		static {
			g();
		}
	}}`;
}
new A();
b();
c();
d();
