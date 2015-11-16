it("should parse sparse arrays", function() { // issue #136
	[,null].should.have.length(2);
	[0,,,0].should.have.length(4);
});
