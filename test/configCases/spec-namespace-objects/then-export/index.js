import * as namespace from "./module.js";
import * as asyncNamespace from "./async.js";

it("should await async modules before wrapping their namespace", async () => {
	expect(await import("./async.js")).toBe(asyncNamespace);
	expect(await import(/* webpackMode: "weak" */ "./async.js")).toBe(
		asyncNamespace
	);
	expect(asyncNamespace.then).toBe(123);
});

it("should assimilate an exported then using the spec namespace", async () => {
	const imports = [
		() => import("./module.js"),
		() => import(/* webpackMode: "eager" */ "./module.js"),
		() => import(/* webpackMode: "weak" */ "./module.js")
	];
	const object = { answer: 42 };
	for (const load of imports) {
		for (const value of [123, null, undefined, object]) {
			namespace.setResult(value);
			const calls = namespace.calls;
			expect(await load()).toBe(value);
			expect(namespace.calls).toBe(calls + 1);
			expect(namespace.receiver).toBe(namespace);
		}
	}
});
