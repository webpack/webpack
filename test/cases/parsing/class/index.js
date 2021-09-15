import X, { A, B } from "./module";

it("should parse classes", function() {
	expect(new X().a).toBe("ok");
	expect(new A().a).toBe("ok");
	expect(new B().a).toBe("ok");
});

it("should parse methods", function() {
	expect(new X().b()).toBe("ok");
	expect(X.c()).toBe("ok");
});
