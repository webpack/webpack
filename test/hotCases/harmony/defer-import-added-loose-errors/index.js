import { getError, getNamespace } from "./consumer";
import { evaluations } from "./state";
import update from "../../update.esm.js";

import.meta.webpackHot.accept("./consumer");

it("should rethrow a deferred module's error without strict error handling", (done) => {
	expect(getError()).toBe(undefined);
	NEXT(
		update(done, true, () => {
			expect(getError).toThrow("deferred failure");
			expect(getError).toThrow("deferred failure");
			const namespace = getNamespace();
			expect(() => namespace.value).toThrow("deferred failure");
			expect(evaluations).toEqual(["error"]);
			done();
		})
	);
});
