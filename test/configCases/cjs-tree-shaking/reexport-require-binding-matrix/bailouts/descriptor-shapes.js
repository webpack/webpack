"use strict";

const ns = require("../targets/cjs?descriptor-shapes");
const base = { enumerable: true };
const flag = true;
const key = "configurable";
Object.defineProperty(exports, "computed", { ["value"]: ns, enumerable: true });
Object.defineProperty(exports, "spread", { ...base, value: ns });
Object.defineProperty(exports, "spreadGetter", { ...base, get: () => ns });
Object.defineProperty(exports, "flag", { enumerable: flag, value: ns });
Object.defineProperty(exports, "flagGetter", { enumerable: flag, get: () => ns });
Object.defineProperty(exports, "computedAttribute", {
	enumerable: true,
	[key]: true,
	value: ns
});
const descriptor = { enumerable: true, value: ns };
Object.defineProperty(exports, "variable", descriptor);
Object.defineProperty(exports, "stringKey", { "value": ns, enumerable: true });
Object.defineProperty(exports, "extraKey", {
	enumerable: true,
	value: ns,
	unknown: ns.b
});
