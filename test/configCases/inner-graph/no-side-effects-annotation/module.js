import { a, b, c, d, effect_e, effect_f, effect_g, effect_h, i } from "./inner";

/*#__NO_SIDE_EFFECTS__*/
function fnA(args) {
	return args;
}

/*#__NO_SIDE_EFFECTS__*/
export function fnB(args) {
	return args;
}

var fnC = /*#__NO_SIDE_EFFECTS__*/ (args) => {
	return args;
};

/*@__NO_SIDE_EFFECTS__*/
const fnD = (args) => {
	return args;
};

/*#__NO_SIDE_EFFECTS__*/
var fnE = (args) => {
	return args;
};

/**
 * This is a jsdoc comment, with no side effects annotation
 *
 * @param {any} args
 * @__NO_SIDE_EFFECTS__
 */
const fnF = (args) => {
	return args;
};

// This annotation gets ignored
/** @__NO_SIDE_EFFECTS__ */
let fnG = (args) => {
	return args;
};

function fnH(args) {
	return args;
}

/*#__NO_SIDE_EFFECTS__*/
export default function fnI(args) {
	return args;
}

const fnAll = () => {
	return a + b + c + d;
};

export const callA = fnA(a);
export const callB = fnB(b);
export const callC = fnC(c);
export const callD = fnD(d);

export const callE = fnE(effect_e);
export const callF = fnF(effect_f);
export const callG = fnG(effect_g);
export const callH = fnH(effect_h);

export const callI = fnI(i);

export const callAll = /*#__PURE__*/ fnAll();
