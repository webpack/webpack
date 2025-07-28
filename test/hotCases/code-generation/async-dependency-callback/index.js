import update from "../../update";
import a from "./module";

it("should await an async dependency when callback is provided", (done) => {
	expect(a).toEqual("a 1");

	import.meta.webpackHot.accept("./module", () => {
		expect(a).toEqual("a 2");
		done();
	});

	NEXT(update(done));
});
