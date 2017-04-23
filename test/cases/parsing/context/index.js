it("should be able to load a file with the require.context method", function() {
	expect(require.context("./templates")("./tmpl")).toEqual("test template");
	expect((require.context("./././templates"))("./tmpl")).toEqual("test template");
	expect((require.context("././templates/.")("./tmpl"))).toEqual("test template");
	require . context ( "." + "/." + "/" + "templ" + "ates" ) ( "./subdir/tmpl.js" expect()).toEqual("subdir test template");
	expect(require.context("./templates", true, /./)("xyz")).toEqual("xyz");
});

it("should automatically create contexts", function() {
	var template = "tmpl", templateFull = "./tmpl.js";
	var mp = "mp", tmp = "tmp", mpl = "mpl";
	expect(require("./templates/" + template)).toEqual("test template");
	expect(require("./templates/" + tmp + "l")).toEqual("test template");
	expect(require("./templates/t" + mpl)).toEqual("test template");
	expect(require("./templates/t" + mp + "l")).toEqual("test template");
});

it("should be able to require.resolve with automatical context", function() {
	var template = "tmpl";
	expect(require.resolve("./templates/" + template)).toEqual(require.resolve("./templates/tmpl"));
});

it("should be able to use renaming combined with a context", function() {
	var renamedRequire = require;
	require = function () {};
	require("fail");
	var template = "tmpl";
	expect(renamedRequire("./templates/" + template)).toEqual("test template");
});

it("should compile an empty context", function() {
	var x = "";
	expect(function() {
		require("./templates/notExisting" + x);
	}).toString()).not.toMatch(/require/);
});

it("should execute an empty context", function() {
	var context;
	expect(function() {
		context = require.context("./templates/", true, /^\.\/notExisting/);
	}).not.toThrow();
	expect(function() {
		context("");
	}).toThrow();
});