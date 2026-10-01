import fs from "fs";
import { ns as wholeNs } from "./forms/whole";
import { a as memberA, info as memberInfo } from "./forms/member";
import { x as deepX, info as deepInfo } from "./forms/deep";
import * as renamed from "./forms/renamed";
import {
	a as moduleExportsA,
	info as moduleExportsInfo
} from "./forms/module-exports-member";
import {
	a as moduleExportsWholeA,
	usedExports as moduleExportsWholeInfo
} from "./forms/module-exports-whole";
import { one, two, a1, a2 } from "./forms/twice";
import { fn as methodFn, ns as methodNs } from "./forms/method";
import {
	a as defineA,
	c as defineC,
	info as defineInfo
} from "./forms/define-shaking";
import { kept } from "./forms/unused";
import { kept as keptWithConfig } from "./forms/unused-config";
import { foo as esmFoo, bump as esmBump } from "./forms/esm";
import { name as jsonName, list as jsonList, key as jsonKey } from "./forms/json";
import { text, lazyText } from "./forms/asset";
import { ns as chainNs, viaChain } from "./forms/chain";
import {
	inIf,
	inTry,
	inBlock,
	inExpression,
	assignedSame,
	sequence
} from "./forms/statement-positions";

// Each case requires its own instance of a target (`?query`), so the exports a
// target reports as used are those this file reads through that one re-export.
const shaken = (info, expected) => {
	if (TREE_SHAKES) {
		expect(info).toEqual(expected);
	} else {
		expect(info).toBe(null);
	}
};

it(`[${VARIANT}] re-exports a whole binding and shakes the target to the read members`, () => {
	expect(wholeNs.a).toBe("a");
	shaken(wholeNs.usedExports, ["a", "usedExports"]);
});

it(`[${VARIANT}] re-exports members of a binding and drops the unread ones`, () => {
	expect(memberA).toBe("a");
	shaken(memberInfo, ["a", "usedExports"]);
});

it(`[${VARIANT}] re-exports a deep member chain of a binding`, () => {
	expect(deepX).toBe("x");
	shaken(deepInfo, ["nested", "usedExports"]);
});

it(`[${VARIANT}] re-exports members under other names`, () => {
	expect(renamed.alpha).toBe("a");
	expect(renamed["with-dash"]).toBe("b");
	shaken(renamed.info, ["a", "b", "usedExports"]);
});

it(`[${VARIANT}] re-exports members through module.exports`, () => {
	expect(moduleExportsA).toBe("a");
	shaken(moduleExportsInfo, ["a", "usedExports"]);
});

it(`[${VARIANT}] re-exports a binding as the whole module.exports`, () => {
	expect(moduleExportsWholeA).toBe("a");
	// `required` below is a `const` binding too, so its reads count as well
	shaken(moduleExportsWholeInfo, ["a", "b", "nested", "usedExports"]);
	const required = require("./forms/module-exports-whole");
	expect(required.b).toBe("b");
	expect(required.nested.y).toBe("y");
});

it(`[${VARIANT}] re-exports one binding under two names as one object`, () => {
	expect(one).toBe(two);
	expect(one.a).toBe("a");
	expect(a1).toBe("a");
	expect(a2).toBe(a1);
});

it(`[${VARIANT}] keeps the receiver of a method read through a re-export`, () => {
	expect(methodNs.fn()).toBe("bound");
	expect(methodFn).toBe(methodNs.fn);
	expect(typeof methodFn).toBe("function");
});

it(`[${VARIANT}] shakes Object.defineProperty value and getter re-exports`, () => {
	expect(defineA).toBe("a");
	expect(defineC).toBe("c");
	shaken(defineInfo, ["a", "c", "usedExports"]);
});

it(`[${VARIANT}] keeps every attribute of an Object.defineProperty value re-export`, () => {
	const exports = require("./forms/define-value");
	const plain = Object.getOwnPropertyDescriptor(exports, "plain");
	expect(plain.value.a).toBe("a");
	expect(plain.enumerable).toBe(false);
	expect(plain.writable).toBe(false);
	expect(plain.configurable).toBe(false);
	expect(exports.member).toBe("a");
	const open = Object.getOwnPropertyDescriptor(exports, "open");
	expect(open.value).toBe(plain.value);
	expect(open.enumerable).toBe(true);
	expect(open.writable).toBe(true);
	expect(open.configurable).toBe(true);
	expect(Object.keys(exports).sort()).toEqual(["info", "open"]);
});

it(`[${VARIANT}] keeps every attribute of an Object.defineProperty getter re-export`, () => {
	const exports = require("./forms/define-getter");
	const arrow = Object.getOwnPropertyDescriptor(exports, "arrow");
	expect(typeof arrow.get).toBe("function");
	expect(arrow.set).toBe(undefined);
	expect(arrow.enumerable).toBe(true);
	expect(arrow.configurable).toBe(false);
	expect(exports.arrow.a).toBe("a");
	expect(exports.arrowMember).toBe("a");
	expect(exports.functionGetter).toBe("b");
	expect(exports.methodGetter).toBe("x");
	const hidden = Object.getOwnPropertyDescriptor(exports, "hidden");
	expect(hidden.enumerable).toBe(false);
	expect(exports.hidden).toBe("a");
	expect(Object.getOwnPropertyDescriptor(exports, "configurable").configurable).toBe(
		true
	);
	expect(Object.keys(exports)).not.toContain("hidden");
	expect(exports.minified).toBe("c");
	expect(Object.getOwnPropertyDescriptor(exports, "minified").enumerable).toBe(
		true
	);
	expect(exports.minifiedHidden).toBe("c");
	expect(Object.keys(exports)).not.toContain("minifiedHidden");
});

it(`[${VARIANT}] keeps descriptor attributes of direct require() re-exports`, () => {
	const exports = require("./forms/direct");
	expect(exports.whole.a).toBe("a");
	expect(exports.member).toBe("a");
	expect(exports.value).toBe(exports.whole);
	expect(Object.getOwnPropertyDescriptor(exports, "value").enumerable).toBe(
		false
	);
	expect(exports.getter).toBe("b");
	expect(Object.getOwnPropertyDescriptor(exports, "getter").enumerable).toBe(
		false
	);
	expect(exports.enumerableGetter).toBe("c");
	expect(exports.spread).toBe("a");
	expect(Object.keys(exports).sort()).toEqual([
		"enumerableGetter",
		"member",
		"spread",
		"whole"
	]);
});

it(`[${VARIANT}] re-exports through Object.defineProperty on module.exports`, () => {
	const exports = require("./forms/define-module-exports");
	expect(exports.viaModule).toBe("a");
	expect(exports.valueViaModule).toBe("b");
	expect(Object.keys(exports).sort()).toEqual(["valueViaModule", "viaModule"]);
});

it(`[${VARIANT}] re-exports from every statement position`, () => {
	expect(inIf).toBe("a");
	expect(inTry).toBe("b");
	expect(inBlock).toBe("c");
	expect(inExpression).toBe("a");
	expect(assignedSame).toBe(true);
	expect(sequence).toBe("b");
});

it(`[${VARIANT}] keeps the side effects of a target re-exported only unused`, () => {
	expect(kept).toBe("kept");
	expect(global.__matrixEffects).toBeGreaterThan(0);
});

it(`[${VARIANT}] drops a side-effect-free target re-exported only unused`, () => {
	expect(keptWithConfig).toBe("kept");
	const source = fs.readFileSync(__filename, "utf-8");
	const marker = ["SIDE_EFFECT_FREE", "MARKER"].join("_");
	expect(source.includes(marker)).toBe(!TREE_SHAKES);
});

it(`[${VARIANT}] re-exports an ESM target as its namespace, with live bindings`, () => {
	expect(esmFoo).toBe("foo");
	const exports = require("./forms/esm");
	expect(exports.ns.__esModule).toBe(true);
	expect(exports.ns.foo).toBe("foo");
	expect(exports.default).toBe("default-value");
	expect(exports.counter).toBe(0);
	expect(esmBump()).toBe(1);
	expect(exports.counter).toBe(1);
	expect(exports.ns.counter).toBe(1);
});

it(`[${VARIANT}] re-exports a JSON target and its members`, () => {
	expect(jsonName).toBe("data");
	expect(jsonList).toEqual([1, 2, 3]);
	expect(jsonKey).toBe("value");
	expect(require("./forms/json").data.deep.key).toBe("value");
});

it(`[${VARIANT}] re-exports an asset/source target`, () => {
	expect(text).toBe("text-asset");
	expect(lazyText).toBe("text-asset");
});

it(`[${VARIANT}] follows a re-export of a re-export`, () => {
	expect(chainNs.a).toBe("a");
	expect(viaChain).toBe("a");
});

it(`[${VARIANT}] re-exports the same object require() returns`, () => {
	const exports = require("./forms/identity");
	expect(exports.isSame()).toBe(true);
	expect(exports.getterNs).toBe(exports.ns);
	expect(exports.ns.c).toBe("c");
});

it(`[${VARIANT}] re-exports a binding from a module loaded on demand`, () =>
	import("./forms/dynamic").then((module) => {
		expect(module.a).toBe("a");
		expect(module.ns.b).toBe("b");
	}));

it(`[${VARIANT}] re-exports bindings across a require cycle`, () => {
	const a = require("./targets/circular-a");
	const b = a.b;
	expect(a.name).toBe("a");
	expect(a.bName).toBe("b");
	expect(b.a).toBe(a);
	expect(b.aNameAtLoad).toBe("a");
	expect(b.aBAtLoad).toBe(undefined);
	expect(a.lazyB).toBe(b);
	expect(b.lazyA).toBe(a);
});

it(`[${VARIANT}] treats let and var bindings as plain values`, () => {
	const exports = require("./bailouts/let-var");
	expect(exports.viaLet.a).toBe("a");
	expect(exports.viaVar.b).toBe("b");
	expect(exports.afterReassign).toEqual({ reassigned: true });
});

it(`[${VARIANT}] leaves a binding of an AMD local module alone`, () => {
	const exports = require("./bailouts/local-module");
	expect(exports.local).toEqual({ local: "amd" });
	expect(exports.localMember).toBe("amd");
});

it(`[${VARIANT}] treats a destructured require as plain values`, () => {
	const exports = require("./bailouts/destructured");
	expect(exports.a).toBe("a");
	expect(exports.nested.x).toBe("x");
});

it(`[${VARIANT}] ignores a binding of a shadowed require`, () => {
	expect(require("./bailouts/shadowed-require").ns).toEqual({ fake: true });
});

it(`[${VARIANT}] resolves a re-exported name in its own scope`, () => {
	const exports = require("./bailouts/scope-shadow");
	expect(exports.outer.a).toBe("a");
	expect(exports.fromFunction).toEqual({ local: "function" });
	expect(exports.fromFunctionMember).toBe("function");
	expect(exports.fromBlock).toEqual({ local: "block" });
	expect(exports.fromParam).toEqual({ local: "param" });
});

it(`[${VARIANT}] leaves getters the rewrite cannot reproduce as written`, () => {
	const exports = require("./bailouts/getter-shapes");
	expect(typeof exports.named).toBe("function");
	expect(exports.param).toBe("param-default");
	expect(exports.twoStatements.a).toBe("a");
	const iterator = exports.generator;
	expect(typeof iterator.next).toBe("function");
	expect(iterator.next().value.a).toBe("a");
	expect(exports.withSetter.a).toBe("a");
	exports.withSetter = "replaced";
	expect(exports.withSetter).toBe("replaced");
	const fromArrow = exports.asyncArrow;
	const fromMethod = exports.asyncMethod;
	expect(fromArrow).toBeInstanceOf(Promise);
	expect(fromMethod).toBeInstanceOf(Promise);
	return Promise.all([fromArrow, fromMethod]).then(([arrow, method]) => {
		expect(arrow.a).toBe("a");
		expect(method).toBe(arrow);
	});
});

it(`[${VARIANT}] keeps descriptors of every shape`, () => {
	const exports = require("./bailouts/descriptor-shapes");
	for (const name of [
		"computed",
		"spread",
		"spreadGetter",
		"flag",
		"flagGetter",
		"computedAttribute",
		"variable",
		"stringKey",
		"extraKey"
	]) {
		expect(exports[name].a).toBe("a");
		expect(Object.getOwnPropertyDescriptor(exports, name).enumerable).toBe(true);
	}
	expect(
		Object.getOwnPropertyDescriptor(exports, "computedAttribute").configurable
	).toBe(true);
	expect(Object.getOwnPropertyDescriptor(exports, "spread").configurable).toBe(
		false
	);
});

it(`[${VARIANT}] re-exports a binding from a function declared before it`, () => {
	const exports = require("./bailouts/hoisted");
	expect(exports.early.a).toBe("a");
	expect(exports.early).toBe(exports.late);
});

it(`[${VARIANT}] keeps the whole target when the binding escapes`, () => {
	const exports = require("./bailouts/escaping");
	expect(exports.keys).toEqual(["a", "b", "c", "fn", "nested", "usedExports"]);
	expect(exports.ns.usedExports).toBe(TREE_SHAKES ? true : null);
});

it(`[${VARIANT}] keeps calls and computed reads next to a re-export`, () => {
	const exports = require("./bailouts/nested-call");
	expect(exports.called).toBe("called");
	expect(exports.fn()).toBe("called");
	expect(exports.computed).toBe("a");
	expect(exports.dynamicKey).toBe("b");
});

it(`[${VARIANT}] re-exports through top-level this`, () => {
	const exports = require("./bailouts/this-exports");
	expect(exports.viaThis.a).toBe("a");
	expect(exports.viaThisMember).toBe("a");
});
