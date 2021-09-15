import {mixin1, mixin2, mixin3, A, B, C, Y} from "./dep2";

export const A1 = class A1 extends A {
	render() {return new E();}
};

export const B1 = class B1 extends /*#__PURE__*/ mixin1(B) {
	render() {return new E();}
};

export const C1 = class C1 extends mixin2(Y, /*#__PURE__*/ mixin3(C)) {
	render() {return new D();}
};

export class Y1 extends mixin2(Y) {
	constructor() {
		super();

		this.innerClass = class B2 extends mixin1(B) {};
	}

	render() {return new D();}
}

export class E {}
const D = class D {};
