it("should be able to load a file with the require.context method", function() {
	require.context("./templates")("./tmpl").should.be.eql("test template");
	(require.context("./././templates"))("./tmpl").should.be.eql("test template");
	(require.context("././templates/.")("./tmpl")).should.be.eql("test template");
	require.context("./loaders/queryloader?dog=bark!./templates?cat=meow")("./tmpl").should.be.eql({
		resourceQuery: "?cat=meow",
		query: "?dog=bark",
		prev: "module.exports = \"test template\";"
	});
	require . context ( "." + "/." + "/" + "templ" + "ates" ) ( "./subdir/tmpl.js" ).should.be.eql("subdir test template");
	require.context("./templates", true, /./)("xyz").should.be.eql("xyz");
});

it("should automatically create contexts", function() {
	var template = "tmpl", templateFull = "./tmpl.js";
	var mp = "mp", tmp = "tmp", mpl = "mpl";
	require("./templates/" + template).should.be.eql("test template");
	require("./templates/" + tmp + "l").should.be.eql("test template");
	require("./templates/t" + mpl).should.be.eql("test template");
	require("./templates/t" + mp + "l").should.be.eql("test template");
});

it("should be able to require.resolve with automatical context", function() {
	var template = "tmpl";
	require.resolve("./templates/" + template).should.be.eql(require.resolve("./templates/tmpl"));
});

it("should be able to use renaming combined with a context", function() {
	var renamedRequire = require;
	require = function () {};
	require("fail");
	var template = "tmpl";
	renamedRequire("./templates/" + template).should.be.eql("test template");
});

it("should compile an empty context", function() {
	var x = "xxx";
	(function() {
		require("./templates/notExisting" + x);
	}).should.throw(/xxx/);
});

it("should execute an empty context", function() {
	var context;
	(function() {
		context = require.context("./templates/", true, /^\.\/notExisting/);
	}).should.not.throw();
	(function() {
		context("");
	}).should.throw();
});
