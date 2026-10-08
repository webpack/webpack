import {x} from './a' // named imported cases an errors

it("issue-2349: should be able to import a named export", function() {
	expect(x).toBe(1);
});
