import x from "./module";

it("should have correct this context in accept handler", (done) => {
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
