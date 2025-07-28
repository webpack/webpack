import update from "../../update";
import a from "./module-a";
import b from "./module-b";

it("should await multiple async dependencies", (done) => {
	expect(a).toEqual("a 1");
	expect(b).toEqual("b 1");

	import.meta.webpackHot.accept(["./module-a", "./module-b"]);

	NEXT(update(done));

	import.meta.webpackHot.addStatusHandler((status) => {
		if (status === "idle") {
			expect(a).toEqual("a 2");
			expect(b).toEqual("b 2");
			done();
		}
	});
});
