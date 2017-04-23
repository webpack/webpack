it("should run a loader from package.json", function() {
	expect(require("testloader!../_resources/abc.txt")).toEqual("abcwebpack");
	expect(require("testloader/lib/loader2!../_resources/abc.txt")).toEqual("abcweb");
	expect(require("testloader/lib/loader3!../_resources/abc.txt")).toEqual("abcloader");
	expect(require("testloader/lib/loader-indirect!../_resources/abc.txt")).toEqual("abcwebpack");
});
it("should run a loader from .webpack-loader.js extension", function() {
	expect(require("testloader/lib/loader!../_resources/abc.txt")).toEqual("abcwebpack");
});
it("should be able to pipe loaders", function() {
	expect(require("testloader!./reverseloader!../_resources/abc.txt")).toEqual("cbawebpack");
});
