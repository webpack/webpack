import { im1, im2 } from "any";

const exp1 = function() {
	console.log(im1);
};

const exp2 = () => {
	console.log(im2);
};

export const exp4 = () => {
	exp2();
};

export const expCls = class {
	constructor() {
		exp1();
	}
};

export { exp1, exp2 };
