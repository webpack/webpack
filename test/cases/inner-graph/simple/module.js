import { EXPORT, EXPORT2, EXPORT3, EXPORT4 } from "./inner";

export function f1() {
	// no using EXPORT
}

export function f2() {
	return EXPORT;
}

function f3() {
	return EXPORT;
}

const f4 = function() {
	return EXPORT;
};

const f5 = () => {
	return EXPORT;
};

let f6 = () => {
	return EXPORT;
};

export function g2() {
	return f2();
}

export function g3() {
	return f3();
}

export var g4 = () => f4();

export let g5 = () => {
	return f5();
};

function ga6() {
	return f6() || gb6();
}

function gb6() {
	return ga6();
}

export class g7 {
	static f() {
		return EXPORT;
	}
}

export const pure1 = /*#__PURE__*/ EXPORT;
export const pure2 = /*#__PURE__*/ f6();
const pure3 = /*#__PURE__*/ g5();
export const pureUsed = /*#__PURE__*/ EXPORT3;

function x1() {
	return EXPORT2;
}

const x2 = function x2() {
	return x1();
};

const x3 = () => {
	return x2();
};

const x4 = x3();

export function fWithDefault(r = EXPORT4) {
	return r;
}

export default (function() {
	return EXPORT;
});
