x ? this.b = 0 : this.b = 1;
function f(t) {
	t() ? this.c = a : this.c = b;
}
class A extends B {
	constructor() {
		x ? this.d = 0 : this.d = 1;
		super();
		y() ? this.e = 2 : this.e = 3;
	}
}
