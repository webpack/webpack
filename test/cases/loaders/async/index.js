it("should allow combinations of async and sync loaders", function() {
	require("./loaders/syncloader!./a").should.be.eql("a");
	require("./loaders/asyncloader!./a").should.be.eql("a");

	require("./loaders/syncloader!./loaders/syncloader!./a").should.be.eql("a");
	require("./loaders/syncloader!./loaders/asyncloader!./a").should.be.eql("a");
	require("./loaders/asyncloader!./loaders/syncloader!./a").should.be.eql("a");
	require("./loaders/asyncloader!./loaders/asyncloader!./a").should.be.eql("a");

	require("./loaders/asyncloader!./loaders/asyncloader!./loaders/asyncloader!./a").should.be.eql("a");
	require("./loaders/asyncloader!./loaders/syncloader!./loaders/asyncloader!./a").should.be.eql("a");
	require("./loaders/syncloader!./loaders/asyncloader!./loaders/syncloader!./a").should.be.eql("a");
	require("./loaders/syncloader!./loaders/syncloader!./loaders/syncloader!./a").should.be.eql("a");
});
