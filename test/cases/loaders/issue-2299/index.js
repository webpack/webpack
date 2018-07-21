it("should be able to use loadModule multiple times within a loader, on files in different directories", function() {
	require('!./loader/index.js!./a.json').should.have.properties(['a', 'b', 'c']);
});
