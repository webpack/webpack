import { doThings, foo }from "./other-file";

it("should compile", function (done) {
	doThings(true);

	expect(foo.foo).toBe('bar');


	done();
});


