function returnThis() {
	if(typeof this === "undefined") return "undefined";
	return this;
}

var a = returnThis;
var b = returnThis;

export {
	a,
	b
}

export const that = this;
export const returnThisArrow = () => this;
export const returnThisMember = () => this.a;

export class C {
	constructor() {
		this.x = "bar";
	}
	foo() {
		return this.x;
	}
	bar(x = this.x) {
		return x;
	}
}

export const extendThisClass = () => {
	return class extends this.Buffer {};
}

export function D() {
	this.prop = () => "ok";
}

export default returnThis;
