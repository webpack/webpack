import sum from "./reexport.loader.js!";

it("should compile a module with many harmony exports in acceptable time", function() {
	sum.should.be.eql(499500);
});
