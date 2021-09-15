import { im1, im2, im3 } from "any";

var exp1 = function() {
	console.log(im1);
};

var exp2 = () => {
	console.log(im2);
	exp1 = 3;
};

var exp3 = function() {
	console.log(im3);
};

export var exp4 = () => {
	exp2();
};

export var expCls = class {
	constructor() {
		exp1();
	}
};

export { exp1, exp2, exp3 };
