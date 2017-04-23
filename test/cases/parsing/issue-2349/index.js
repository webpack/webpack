import {x} from './a' // named imported cases an errors

it("should be able to import a named export", function() {
	expect(x).toEqual(1);
});
