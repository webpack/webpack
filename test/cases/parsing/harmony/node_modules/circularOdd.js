import { even } from "circularEven";

export function odd(n) {
	if(n == 0) return false;
	return even(n - 1);
}
