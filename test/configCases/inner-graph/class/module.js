import {
	deepEqual,
	equal,
	strictEqual,
	notEqual,
	maybeEqual,
	definiteEqual,
	getNameA,
	getNameB
} from "./assert";

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

export class ExportCls3 {
	static add = () => {
		strictEqual();
	};
}

export class ExportCls4 {
	static name = notEqual;
}

export class ExportCls5a {
	static name = getNameA();
}

export class ExportCls5b {
	static [getNameB()] = "name";
}

export class ExportCls6 {
	add = () => {
		maybeEqual();
	};
}

export class ExportCls7 {
	add = definiteEqual();
}
