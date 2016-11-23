it("should automatically create contexts", function() {
	var template = "tmpl", templateFull = "./tmpl.js";
	require("../../../cases/parsing/context/templates/templateLoader")(templateFull).should.be.eql("test template");
	require("../../../cases/parsing/context/templates/templateLoaderIndirect")(templateFull).should.be.eql("test template");
});