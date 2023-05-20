import { a as C } from "./a.js";

let staticBlockValue;

let A = class C {
	static name = "test";
	static otherName = C.name;
	otherName = C.name;
	test() {
		return { className: C.name,  propertyValue: this.otherName };
	}
	static test() {
		return C.name;
	}
	static {
		staticBlockValue = C.name;
	}
};

const b = function C() {
	return C.name;
}

const staticProperty = A.otherName;
const staticMethod = A.test();
const method = new A().test();
const reexport = C;
const functionName = b()

export {
	staticBlockValue,
	staticProperty,
	staticMethod,
	reexport,
	method,
	functionName
};
