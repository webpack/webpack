import { getValue, getNamespaces, getError } from "./consumer";
import { evaluations } from "./state";
import update from "../../update.esm.js";

import.meta.webpackHot.accept("./consumer");

it("should introduce deferred imports through a hot update", (done) => {
	expect(getValue()).toBe("initial");
	NEXT(
		update(done, true, () => {
			expect(evaluations).toEqual([]);
			expect(getValue()).toBe(42);
			const [namespace, pending] = getNamespaces();
			expect(namespace.value).toBe(42);
			namespace.increment();
			expect(namespace.value).toBe(43);
			expect(getValue()).toBe(43);
			expect(getNamespaces()[0]).toBe(namespace);
			expect(evaluations).toEqual(["deferred"]);
			NEXT(
				update(done, true, () => {
					expect(getNamespaces()[0]).toBe(namespace);
					expect(getNamespaces()[1]).toBe(pending);
					expect(pending.value).toBe(7);
					expect(evaluations).toEqual(["deferred", "pending"]);
					expect(getError).toThrow("deferred failure");
					expect(getError).toThrow("deferred failure");
					expect(evaluations).toEqual(["deferred", "pending", "error"]);
					done();
				})
			);
		})
	);
});
