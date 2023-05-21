import { a as C, a as B } from "./a.js";

let staticBlockValue;
let staticPrivateBlockValue;
let valueInStaticBlock;
let staticPrivateMethod;
let staticThis;

let A = class C {
	static name = "test";

	otherName = C.name;
	#privateName = C.name;
	propertyB = B;
	#propertyB = B;

	static otherName = C.name;
	static #staticPrivateName = C.name;
	static staticB = B;
	static #staticB = B;
	static #this = this;
	static #thisAndC = C.#this;

	#privateMethod() {
		return { privateName: this.#privateName, B }
	}
	publicMethod() {
		const privateMethod = this.#privateMethod();

		return { B, privateMethod, propertyB: this.propertyB, privatePropertyB: this.#propertyB }
	}
	test() {
		return { className: C.name,  propertyValue: this.otherName };
	}
	static test() {
		return C.name;
	}
	static getB() {
		return B;
	}
	static #staticPrivateMethod() {
		return {
			staticB: this.staticB,
			privateStaticB: this.#staticB,
			B
		};
	}
	static {
		staticBlockValue = C.name;
		staticPrivateBlockValue = C.#staticPrivateName;
		valueInStaticBlock = B;
		staticPrivateMethod = C.#staticPrivateMethod();
		staticThis = C.#thisAndC;
	}
};


const b = function C() {
	return C.name;
}

const staticProperty = A.otherName;
const staticMethod = A.test();
const staticB = A.getB();
const method = new A().test();
const publicMethod = new A().publicMethod();
const reexport = C;
const functionName = b();

export {
	staticBlockValue,
	staticProperty,
	staticMethod,
	reexport,
	method,
	functionName,
	publicMethod,
	valueInStaticBlock,
	staticB,
	staticPrivateMethod,
	staticThis
};
