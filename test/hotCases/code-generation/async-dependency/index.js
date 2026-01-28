import update from "../../update";
import a from "./module";

it("should await an async dependency", (done) => {
	expect(a).toEqual("a 1");

	import.meta.webpackHot.accept("./module");

	NEXT(update(done));

	import.meta.webpackHot.addStatusHandler((status) => {
		if (status === "idle") {
			expect(a).toEqual("a 2");
			done();
		}
	});
});
