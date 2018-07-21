it("should run a loader from package.json", function() {
	require("testloader!../_resources/abc.txt").should.be.eql("abcwebpack");
	require("testloader/lib/loader2!../_resources/abc.txt").should.be.eql("abcweb");
	require("testloader/lib/loader3!../_resources/abc.txt").should.be.eql("abcloader");
	require("testloader/lib/loader-indirect!../_resources/abc.txt").should.be.eql("abcwebpack");
});
it("should run a loader from .webpack-loader.js extension", function() {
	require("testloader/lib/loader!../_resources/abc.txt").should.be.eql("abcwebpack");
});
it("should be able to pipe loaders", function() {
	require("testloader!./reverseloader!../_resources/abc.txt").should.be.eql("cbawebpack");
});
