import a from "./module";

var obj = {};

it("should allow access to the default export of the root module", function() {
	a().should.be.eql(obj);
});

export default obj;
