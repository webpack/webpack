import { getNumber } from "./wasm.wat";
import update from "../../update.esm.js";

import.meta.webpackHot.accept(["./wasm.wat"]);

it("should update an async WebAssembly module in a universal target", (done) => {
	expect(getNumber()).toBe(40);

	NEXT(
		update(done, true, () => {
			import("./wasm.wat")
				.then((updated) => {
					expect(updated.getNumber()).toBe(42);
					done();
				})
				.catch(done);
		})
	);
});
