import A from "./a";

it("should compile", function (done) {
	expect(A).toBe("other-file.js");

	done();
});
