import load from "./load";
import { evaluations } from "./state";
import update from "../../update.esm.js";

import.meta.webpackHot.accept("./load");

it("should introduce deferred async dependencies through a hot update", async () => {
	expect(await load()).toBe("initial");
	await new Promise((resolve, reject) => NEXT(update(reject, true, resolve)));
	const { namespace, getValue } = await load();
	expect(evaluations).toEqual(["async"]);
	expect(getValue()).toBe(42);
	expect(namespace.value).toBe(42);
	namespace.increment();
	expect(namespace.value).toBe(43);
	expect(getValue()).toBe(43);
	expect(evaluations).toEqual(["async", "deferred"]);
});
