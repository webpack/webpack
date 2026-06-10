import { isDEV, isProd, nothing } from "./env.js";
import { obj } from "./dynamic.js";
import { V as LIVE } from "./live.js";
import { V as DEAD_T } from "./dead_ternary.js";
import { V as DEAD_IF } from "./dead_if.js";
import { V as DEAD_NOT } from "./dead_not.js";
import { V as DEAD_AND } from "./dead_and.js";
import { V as DEAD_OR } from "./dead_or.js";
import { V as DEAD_QQ } from "./dead_qq.js";
import { V as DEAD_NESTED } from "./dead_nested.js";
import { V as KEPT_A } from "./kept_a.js";
import { V as KEPT_B } from "./kept_b.js";

// True when the module factory for `id` was bundled (named module ids).
const hasModule = (id) => id in __webpack_modules__;

it("ternary: imported boolean gates the dead branch specifier", () => {
	const v = isDEV ? DEAD_T : LIVE;
	expect(v).toBe("LIVE_VALUE");
});

it("if-statement: imported boolean gates the dead branch specifier", () => {
	let v;
	if (isProd) {
		v = LIVE;
	} else {
		v = DEAD_IF;
	}
	expect(v).toBe("LIVE_VALUE");
});

it("negation gates the dead branch specifier", () => {
	const v = !isProd ? DEAD_NOT : LIVE;
	expect(v).toBe("LIVE_VALUE");
});

it("&& gates the dead branch specifier", () => {
	const v = isProd && isDEV ? DEAD_AND : LIVE;
	expect(v).toBe("LIVE_VALUE");
});

it("|| gates the dead branch specifier", () => {
	const v = isDEV || isProd ? LIVE : DEAD_OR;
	expect(v).toBe("LIVE_VALUE");
});

it("?? gates the dead branch specifier", () => {
	const v = (nothing ?? isProd) ? LIVE : DEAD_QQ;
	expect(v).toBe("LIVE_VALUE");
});

it("nested if: dead inner branch under an unknown outer branch drops its specifier", () => {
	let v = LIVE;
	if (obj.flag) {
		if (isDEV) {
			v = DEAD_NESTED;
		}
	}
	expect(v).toBe("LIVE_VALUE");
	expect(hasModule("./dead_nested.js")).toBe(false);
});

it("keeps both branches when the test is not statically known", () => {
	// obj.flag is not an inlinable primitive → neither branch can be proven dead
	const v = obj.flag ? KEPT_A : KEPT_B;
	expect(v.tag).toBe("B");
});

it("ternary: imported boolean gates the dead branch require()", () => {
	const v = isDEV
		? require("./dead_cjs_ternary.js")
		: require("./live_cjs.js");
	expect(v).toBe("LIVE_CJS");
	expect(hasModule("./dead_cjs_ternary.js")).toBe(false);
	expect(hasModule("./live_cjs.js")).toBe(true);
});

it("if-statement: imported boolean gates the dead branch require()", () => {
	let v;
	if (isProd) {
		v = require("./live_cjs.js");
	} else {
		v = require("./dead_cjs_if.js");
	}
	expect(v).toBe("LIVE_CJS");
	expect(hasModule("./dead_cjs_if.js")).toBe(false);
});

it("negation gates the dead branch require()", () => {
	const v = !isProd ? require("./dead_cjs_not.js") : require("./live_cjs.js");
	expect(v).toBe("LIVE_CJS");
	expect(hasModule("./dead_cjs_not.js")).toBe(false);
});

it("&& gates the dead branch require()", () => {
	const v =
		isProd && isDEV ? require("./dead_cjs_and.js") : require("./live_cjs.js");
	expect(v).toBe("LIVE_CJS");
	expect(hasModule("./dead_cjs_and.js")).toBe(false);
});

it("|| gates the dead branch require()", () => {
	const v =
		isDEV || isProd ? require("./live_cjs.js") : require("./dead_cjs_or.js");
	expect(v).toBe("LIVE_CJS");
	expect(hasModule("./dead_cjs_or.js")).toBe(false);
});

it("?? gates the dead branch require()", () => {
	const v =
		(nothing ?? isProd)
			? require("./live_cjs.js")
			: require("./dead_cjs_qq.js");
	expect(v).toBe("LIVE_CJS");
	expect(hasModule("./dead_cjs_qq.js")).toBe(false);
});

it("nested if: dead inner branch under an unknown outer branch drops its require()", () => {
	let v = require("./live_cjs.js");
	if (obj.flag) {
		if (isDEV) {
			v = require("./dead_cjs_nested_inner.js");
		}
	}
	expect(v).toBe("LIVE_CJS");
	expect(hasModule("./dead_cjs_nested_inner.js")).toBe(false);
});

it("nested if: unknown inner branch under a dead outer branch drops its require()", () => {
	let v = require("./live_cjs.js");
	if (isDEV) {
		if (obj.flag) {
			v = require("./dead_cjs_nested_outer.js");
		}
	}
	expect(v).toBe("LIVE_CJS");
	expect(hasModule("./dead_cjs_nested_outer.js")).toBe(false);
});

it("nested if: keeps require() under a live outer and unknown inner branch", () => {
	if (isProd) {
		if (obj.flag) {
			require("./kept_cjs_nested.js");
		}
	}
	expect(hasModule("./kept_cjs_nested.js")).toBe(true);
});

it("keeps require() in both branches when the test is not statically known", () => {
	const v = obj.flag ? require("./kept_cjs_a.js") : require("./kept_cjs_b.js");
	expect(v.tag).toBe("B");
	expect(hasModule("./kept_cjs_a.js")).toBe(true);
	expect(hasModule("./kept_cjs_b.js")).toBe(true);
});

it("ternary: imported boolean gates the dead branch import()", async () => {
	const ns = await (isDEV ? import("./dead_dyn.js") : import("./live_dyn.js"));
	expect(ns.V).toBe("LIVE_DYN");
	expect(hasModule("./live_dyn.js")).toBe(true);
	expect(hasModule("./dead_dyn.js")).toBe(false);
});

it("negation gates the dead branch import()", async () => {
	const ns = await (!isProd
		? import("./dead_dyn_not.js")
		: import("./live_dyn.js"));
	expect(ns.V).toBe("LIVE_DYN");
	expect(hasModule("./dead_dyn_not.js")).toBe(false);
});

it("&& gates the dead branch import()", async () => {
	const ns = await (isProd && isDEV
		? import("./dead_dyn_and.js")
		: import("./live_dyn.js"));
	expect(ns.V).toBe("LIVE_DYN");
	expect(hasModule("./dead_dyn_and.js")).toBe(false);
});

it("|| gates the dead branch import()", async () => {
	const ns = await (isDEV || isProd
		? import("./live_dyn.js")
		: import("./dead_dyn_or.js"));
	expect(ns.V).toBe("LIVE_DYN");
	expect(hasModule("./dead_dyn_or.js")).toBe(false);
});

it("?? gates the dead branch import()", async () => {
	const ns = await ((nothing ?? isProd)
		? import("./live_dyn.js")
		: import("./dead_dyn_qq.js"));
	expect(ns.V).toBe("LIVE_DYN");
	expect(hasModule("./dead_dyn_qq.js")).toBe(false);
});

it("nested if: dead inner branch under an unknown outer branch drops its import()", () => {
	if (obj.flag) {
		if (isDEV) {
			import("./dead_dyn_nested.js");
		}
	}
	expect(hasModule("./dead_dyn_nested.js")).toBe(false);
});

it("drops the provably-dead branch modules and keeps the rest", () => {
	const dead = [
		"./dead_ternary.js",
		"./dead_if.js",
		"./dead_not.js",
		"./dead_and.js",
		"./dead_or.js",
		"./dead_qq.js"
	];
	for (const id of dead) expect(hasModule(id)).toBe(false);
	expect(hasModule("./live.js")).toBe(true);
	expect(hasModule("./kept_a.js")).toBe(true);
	expect(hasModule("./kept_b.js")).toBe(true);
});
