import { odd } from "circularOdd";

export default odd(3);

export function even(n) {
	if(n == 0) return true;
	return odd(n - 1);
}
