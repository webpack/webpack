import { a, b, c } from "./test";

export function x() {
	a();
}

export function y() {
	b();
	eval("x()");
}

export function z() {
	c();
	y();
}
