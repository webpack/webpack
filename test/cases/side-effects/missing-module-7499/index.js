import './example'

it("should run correctly", function() {
	return import('./lazy').then(lazy => {
		expect(lazy.default()).toEqual({
			hello: "world",
			[Symbol.toStringTag]: "Module"
		});
	})
});
