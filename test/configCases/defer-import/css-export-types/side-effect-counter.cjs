"use strict";

let count = 0;
exports.touch = () => {
	count++;
};
exports.reset = () => {
	count = 0;
};
exports.assertTouched = () => {
	if (count === 0) throw new Error("Side effect not triggered.");
	if (count > 1) throw new Error("Side effect triggered more than expected.");
};
exports.assertUntouched = () => {
	if (count !== 0) throw new Error("Side effect triggered.");
};
