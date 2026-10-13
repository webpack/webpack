import defer * as self from "./cyclic";

export const value = 1;
let caught;
try {
	self.value;
} catch (error) {
	caught = error;
}
export const cycleError = caught;
