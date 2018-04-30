function get(name) {
	return require("./" + name);
}

it("should automatically infer the index.js file", function() {
	get("module").should.be.eql("module");
});
