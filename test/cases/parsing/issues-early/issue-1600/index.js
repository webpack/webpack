import fn from './file';

it("issue-1600: should compile correctly", function() {
	expect(fn()).toBe(1);
});
