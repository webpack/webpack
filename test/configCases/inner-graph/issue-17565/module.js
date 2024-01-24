import { A, B, C1, C2, C3, Err } from "./test";

var arr1 = A,
	cls = class extends Error {},
	cls1 = class {
		constructor(t) {
			if (!arr1.includes(t.version)) throw "invalid parquet version";
		}
		async *[Symbol.asyncIterator]() {
			yield "";
		}
	};

var arr2 = B;
var cls2 = class extends Error {},
	cls3 = class {
		constructor(t) {
			if (!arr2.includes(t.version)) throw "invalid parquet version";
		}
		async *[Symbol.asyncIterator]() {
			yield "";
		}
	};

var arr3 = C1;
var cls4 = class {
		constructor() {}
	},
	cls5 = class {
		constructor(t) {
			if (!arr3.includes(t.version)) throw "invalid parquet version";
		}
		async *[Symbol.asyncIterator]() {
			yield "";
		}
	};

var arr4 = C2;
var cls6 = class {
		foo = [1, 2];
	},
	cls7 = class {
		constructor(t) {
			if (!arr4.includes(t.version)) throw "invalid parquet version";
		}
		async *[Symbol.asyncIterator]() {
			yield "";
		}
	};

var arr5 = C3;
var cls8 =  class extends Err {},
	cls9 = class {
		constructor(t) {}
		async *[Symbol.asyncIterator]() {
			yield "";
		}
	};

export { cls1, cls3, cls5, cls7, cls9 }
