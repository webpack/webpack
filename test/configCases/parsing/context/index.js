it("should automatically create contexts", function() {
	var template = "tmpl", templateFull = "./tmpl.js";
	expect(require("../../../cases/parsing/context/templates/templateLoader")(templateFull)).toBe("test template");
	expect(require("../../../cases/parsing/context/templates/templateLoaderIndirect")(templateFull)).toBe("test template");
});
