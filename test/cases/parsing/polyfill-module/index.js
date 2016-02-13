it("should polyfill module", function() {
	var m = module;

	(typeof m.id).should.be.not.eql("undefined");
	m.children.should.be.eql([]);
	m.exports.should.be.eql({});
	m.loaded.should.be.eql(true);
});