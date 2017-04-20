it("should be able to use import", function(done) {
	import("./two").then(function(two) {
		expect(two).toEqual(2);
		done();
	}).catch(function(err) {
		done(err);
	});
});

it("should be able to use System.import", function(done) {
	System.import("./two").then(function(two) {
		expect(two).toEqual(2);
		done();
	}).catch(function(err) {
		done(err);
	});
});
