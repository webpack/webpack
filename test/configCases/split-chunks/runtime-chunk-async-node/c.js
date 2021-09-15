beforeEach(done => {
	global.it = it;
	done();
});
afterEach(done => {
	delete global.it;
	done();
});

it("should be able to load the other entry on demand", () => import("./a"));
