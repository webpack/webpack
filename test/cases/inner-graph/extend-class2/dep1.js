import { A, B, getC, getD, getE, getF } from "./dep2";

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
export class D1 extends /*#__PURE__*/ getD() {
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

export class A2 {}
export class B2 {}
export class C2 {}
export class D2 {}
export class E2 {}
export class F2 {}
