import contextImport from "./context-import.js";
import generation from "./generation.js";

import.meta.webpackHot.accept("./generation.js");

for (const name of ["demo", "module"]) {
	it("should compile to lazy imported context element " + name, done => {
		let resolved;
		const promise = contextImport(name)
			.then(r => (resolved = r))
			.catch(done);
		const start = generation;
		expect(resolved).toBe(undefined);
		setTimeout(() => {
			expect(resolved).toBe(undefined);
			expect(generation).toBe(start);
			NEXT(
				require("../../update")(done, true, () => {
					promise.then(result => {
						try {
							expect(result).toHaveProperty("default", name);
							expect(generation).toBe(start + 1);
							done();
						} catch (e) {
							done(e);
						}
					}, done);
				})
			);
		}, 1000);
	});
}
