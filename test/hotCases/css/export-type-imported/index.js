import fooStyle from "./foo.css";

it("should handle HMR for exportType", function (done) {
	expect(fooStyle).toContain("bar-v1");
	module.hot.accept(["./foo.css"], () => {
		expect(fooStyle).toContain("bar-v2");
		done();
	});
	NEXT(require("../../update")(done))
});