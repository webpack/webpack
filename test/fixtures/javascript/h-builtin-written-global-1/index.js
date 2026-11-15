globalThis.RegExp = class {
	constructor(p) {
		this.p = p;
	}
};
globalThis["Error"] = class {
	constructor(m) {
		this.m = m;
	}
};
function make(a, b) {
	return [new RegExp(a + b).p, new RegExp("ab").p, new Error(a).m];
}
console.log(make("x", "y").join());
