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

export class ExportCls1 {
	constructor() {
		fun4();
	}
}

export class ExportCls2 {
	add() {
		this.name = equal;
	}
}
