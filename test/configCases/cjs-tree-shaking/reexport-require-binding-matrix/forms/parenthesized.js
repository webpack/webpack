"use strict";

const ns = require("../targets/cjs?parenthesized");
exports.wrapped = (ns);
exports.wrappedMember = (ns).a;
exports.wrappedChain = ((ns).nested).x;
exports.innerWrapped = (ns.b);
exports.comment = ns /* between */ .a;
exports.computed = ns["c"];
exports.computedChain = (ns)["nested"]["y"];
Object.defineProperty(exports, "value", { enumerable: true, value: (ns).b });
Object.defineProperty(exports, "valueWhole", { enumerable: true, value: ((ns)) });
Object.defineProperty(exports, "getter", { enumerable: true, get: () => (ns).c });
Object.defineProperty(exports, "getterWhole", { enumerable: true, get: () => ((ns)) });
Object.defineProperty(exports, "method", {
	enumerable: true,
	get() {
		return ((ns)).nested.x;
	}
});
exports.info = (ns).usedExports;
