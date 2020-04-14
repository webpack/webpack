import { A, B, getC, getD, getE, getF } from "./dep2?decl";
import { A3, B3, C3, D3, E3, F3 } from "./dep3?decl";

export class A1 extends A {
	render() {
		return new A2();
	}
}

export class B1 extends B {
	render() {
		return new B2();
	}
}

// prettier-ignore
export class C1 extends /*#__PURE__*/ getC() {
	render() {
		return new C2();
	}
}

// prettier-ignore
export class D1 extends /*@__PURE__*/ getD() {
	render() {
		return new D2();
	}
}

export class E1 extends getE() {
	render() {
		return new E2();
	}
}

export class F1 extends getF() {
	render() {
		return new F2();
	}
}

export class A2 extends A3 {}
export class B2 extends B3 {}
export class C2 extends C3 {}
export class D2 extends D3 {}
export class E2 extends E3 {}
export class F2 extends F3 {}
