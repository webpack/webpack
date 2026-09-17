import { constant, value } from "./state";
import { helper } from "./helper";

export function writeLet() {
	value = 10;
}

export function writeConst() {
	constant = 20;
}

export function updateConst() {
	constant++;
}

export function sum() {
	return helper() + value + constant;
}
