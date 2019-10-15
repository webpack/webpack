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

function notExport() {
	fun3();
}

notExport();
