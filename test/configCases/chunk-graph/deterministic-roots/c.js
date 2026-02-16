import { getA } from "./a";

export function getC() {
	return "c" + getA();
}
