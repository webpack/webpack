it("should parse sparse arrays", function() { // issue #136
	expect([,null]).toHaveLength(2);
	expect([0,,,0]).toHaveLength(4);
});
