import './example'

it("missing-module-7499: should run correctly", function() {
	return import('./lazy').then(lazy => {
		expect(lazy.default()).toEqual(nsObj({
			hello: "world"
		}));
	})
});
