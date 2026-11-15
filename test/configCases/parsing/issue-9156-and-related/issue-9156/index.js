it("issue-9156: should allow to access module.id when node option is set to false", function() {
	expect(module.id).toBeDefined();
});

it("issue-9156: should allow to access module.loaded when node option is set to false", function() {
	expect(module.loaded).toBeDefined();
});
