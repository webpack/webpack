it("should be able to load a file with the require.context method", function() {
	expect(require.context("./templates")("./tmpl")).toBe("test template");
	expect((require.context("./././templates"))("./tmpl")).toBe("test template");
	expect((require.context("././templates/.")("./tmpl"))).toBe("test template");
	expect(require.context("./loaders/queryloader?dog=bark!./templates?cat=meow")("./tmpl")).toEqual({
		resourceQuery: "?cat=meow",
		query: "?dog=bark",
		prev: 'module.exports = "test template";'
	});
	expect(require . context ( "." + "/." + "/" + "templ" + "ates" ) ( "./subdir/tmpl.js" )).toBe("subdir test template");
	expect(require.context("./templates", true, /./)("xyz")).toBe("xyz");
});

it("should automatically create contexts", function() {
	var template = "tmpl", templateFull = "./tmpl.js";
	var mp = "mp", tmp = "tmp", mpl = "mpl";
	expect(require("./templates/" + template)).toBe("test template");
	expect(require("./templates/" + tmp + "l")).toBe("test template");
	expect(require("./templates/t" + mpl)).toBe("test template");
	expect(require("./templates/t" + mp + "l")).toBe("test template");
});

it("should be able to require.resolve with automatical context", function() {
	var template = "tmpl";
	expect(require.resolve("./templates/" + template)).toBe(
		require.resolve("./templates/tmpl")
	);
});

it("should be able to use renaming combined with a context", function() {
	var renamedRequire = require;
	var template = "tmpl";
	expect(renamedRequire("./templates/" + template)).toBe("test template");
});

it("should compile an empty context", function() {
	var x = "xxx";
	expect(function() {
		require("./templates/notExisting" + x);
	}).toThrowError(/xxx/);
});

it("should execute an empty context", function() {
	var context;
	expect(function() {
		context = require.context("./templates/", true, /^\.\/notExisting/);
	}).not.toThrowError();
	expect(function() {
		context("");
	}).toThrowError();
});
