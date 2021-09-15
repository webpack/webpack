import { A, B, getC, getD, getE, getF } from "./dep2?expr";
import { A3, B3, C3, D3, E3, F3 } from "./dep3?expr";

export const A1 = class extends A {
	render() {
		return new A2();
	}
};

export const B1 = class extends B {
	render() {
		return new B2();
	}
};

// prettier-ignore
export const C1 = class extends /*#__PURE__*/ getC() {
	render() {
		return new C2();
	}
}

// prettier-ignore
export const D1 = class extends /*@__PURE__*/ getD() {
	render() {
		return new D2();
	}
}

export const E1 = class extends getE() {
	render() {
		return new E2();
	}
};

export const F1 = class extends getF() {
	render() {
		return new F2();
	}
};

export const A2 = class extends A3 {};
export const B2 = class extends B3 {};
export const C2 = class extends C3 {};
export const D2 = class extends D3 {};
export const E2 = class extends E3 {};
export const F2 = class extends F3 {};
