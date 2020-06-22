import x from "./module";

it("should have correct this context in module.hot.accept handler", (done) => {
	expect(x).toEqual("ok1");

    (function() {
        module.hot.accept("./module", () => {
            expect(x).toEqual("ok2");
            expect(this).toEqual({ ok: true });
            done();
        });
    }).call({ ok: true });

	NEXT(require("../../update")(done));
});

it("should have correct this context in import.meta.hot.accept handler", (done) => {
	expect(x).toEqual("ok2");

	(function() {
		import.meta.hot.accept("./module", () => {
			expect(x).toEqual("ok3");
			expect(this).toEqual({ ok: true });
			done();
		});
	}).call({ ok: true });

	NEXT(require("../../update")(done));
});
