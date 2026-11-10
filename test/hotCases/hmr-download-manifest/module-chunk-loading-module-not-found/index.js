import update from "../../update.esm.js";

if (import.meta.webpackHot) {
	import.meta.webpackHot.accept();
}

it("should apply an available update", done => {
	NEXT(update(done, true, () => done()));
});
---
it("should ignore ERR_MODULE_NOT_FOUND when no update is available", done => {
	import.meta.webpackHot.check()
		.then(updatedModules => {
			expect(updatedModules).toBe(null);
			expect(import.meta.webpackHot.status()).toBe("idle");
			return import.meta.webpackHot.check();
		})
		.then(updatedModules => {
			expect(updatedModules).toBe(null);
			expect(import.meta.webpackHot.status()).toBe("idle");
			done();
		})
		.catch(done);
});
