import X, { A, B } from "./module";

it("should parse classes", function() {
	expect(new X().a).toEqual("ok");
	expect(new A().a).toEqual("ok");
	expect(new B().a).toEqual("ok");
});
