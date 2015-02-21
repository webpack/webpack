it("should define CODE", function() {
	CODE.should.be.eql(3);
	(typeof CODE).should.be.eql("number");
	if(CODE !== 3) require("fail");
	if(typeof CODE !== "number") require("fail");
});
it("should define FUNCTION", function() {
	FUNCTION(5).should.be.eql(6);
	(typeof FUNCTION).should.be.eql("function");
	if(typeof FUNCTION !== "function") require("fail");
});
it("should define UNDEFINED", function() {
	(typeof UNDEFINED).should.be.eql("undefined");
	if(typeof UNDEFINED !== "undefined") require("fail");
});
it("should define REGEXP", function() {
	REGEXP.toString().should.be.eql("/abc/i");
	(typeof REGEXP).should.be.eql("object");
	if(typeof REGEXP !== "object") require("fail");
});
it("should define OBJECT", function() {
	var o = OBJECT;
	o.SUB.FUNCTION(10).should.be.eql(11);
});
