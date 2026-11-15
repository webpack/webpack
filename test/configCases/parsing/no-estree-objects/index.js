import def, { named, counter, increment, reexported } from "./esm.js";
import * as ns from "./esm.js";
import { cjsValue, describeThis } from "./cjs-consumer.js";
import amdValue from "./amd.js";
import { ensure, lazy } from "./rare.js";
import { syntax } from "./syntax.js";
import { guards } from "./guards.js";

it("should build each construct without making an ESTree object", () => {
	expect(def).toBe("default");
	expect(named).toBe("named");
	expect(reexported).toBe("reexported");
	expect("named" in ns).toBe(true);
	expect("missing" in ns).toBe(false);
	expect(counter).toBe(0);
	increment();
	expect(counter).toBe(1);
	expect(cjsValue).toEqual({ value: 1, defined: 2, viaThis: true });
	expect(describeThis()).toBe("object");
	expect(amdValue).toEqual({ a: "a", b: "b" });
	expect(typeof ensure).toBe("function");
	expect(typeof lazy).toBe("function");
	expect(guards()).toEqual([
		"named",
		"in:named",
		"not-in",
		"in-and:named",
		"or:named",
		"nullish:named",
		"ternary:named",
		"and:named",
		"absent"
	]);
	expect(syntax()).toEqual({
		defined: "defined",
		flag: true,
		mode: "object",
		typeOf: "string",
		folded: 3,
		labeled: 3,
		updates: 2,
		chain: undefined,
		destructured: [1, 2, [3]],
		klass: "K",
		provided: 1,
		url: true
	});
});

if (module.hot) {
	module.hot.accept("./esm.js", () => {});
	module.hot.decline("./amd.js");
}
