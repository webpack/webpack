import { count } from "./counter";

export function bump() {
	count += 1;
}

export function bumpInExpression() {
	return [(count = 9)];
}
