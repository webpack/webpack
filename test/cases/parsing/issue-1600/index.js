import fn from './file';

it("should compile correctly", function() {
	fn().should.be.eql(1);
});
