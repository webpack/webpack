import { getC } from "./c";
import { getB } from "./b";

export function getA() {
	return "a";
}

export function getCombined() {
	return getA() + getB() + getC();
}
