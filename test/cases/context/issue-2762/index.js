it("should be able to System.import a template string", function() {
	var expr = "0";
	System.import('./folder/' + expr).should.be.instanceOf(Promise);
	System.import('./folder/' + expr + '.js').should.be.instanceOf(Promise);
	System.import(`./folder/${expr}`).should.be.instanceOf(Promise);
	System.import(`./folder/0.js`).should.be.instanceOf(Promise);
	System.import(`./folder/${expr}.js`).should.be.instanceOf(Promise);
});

// [318, 338]
