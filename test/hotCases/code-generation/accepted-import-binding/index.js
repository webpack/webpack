import { CONSTANT } from "./module";

it("should read an accepted module's const export live", (done) => {
	expect(CONSTANT).toBe("ok1");

	module.hot.accept("./module", () => {
		// The update replaced the module rather than this one, so a value read
		// once into a local would still be the old one.
		expect(CONSTANT).toBe("ok2");
		done();
	});

	NEXT(require("../../update")(done));
});
