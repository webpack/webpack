import {mixin1, mixin2, A, B, Y} from "./dep2";

export const A1 = class A1 extends A {
	render() {return new C();}
};

export const B1 = class B1 extends /*#__PURE__*/ mixin1(B) {
	render() {return new C();}
};

export class Y1 extends mixin2(Y) {
	render() {return new D();}
}

export class C {}
const D = class D {};
