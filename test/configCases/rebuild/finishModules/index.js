
import { doThings, foo, valueFromA } from './a';
it("should compile", function (done) {
	doThings(true);

	// Should be replaced by the code in the config.
	expect(foo.foo).toBe('bar');
	expect(valueFromA).toBe('A')

	done();
});


