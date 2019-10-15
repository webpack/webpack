import { deepEqual, equal } from "./assert";

function fun1() {
	deepEqual(1, 1);
}

function fun2() {
	fun1();
}

function fun3() {
	fun2();
}

function fun4() {
	fun3();
}

export function fun5() {
	fun4();
}

export function fun6() {
	equal(1, 1);
}
