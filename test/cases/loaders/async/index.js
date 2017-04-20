it("should allow combinations of async and sync loaders", function() {
	expect(require("./loaders/syncloader!./a")).toEqual("a");
	expect(require("./loaders/asyncloader!./a")).toEqual("a");

	expect(require("./loaders/syncloader!./loaders/syncloader!./a")).toEqual("a");
	expect(require("./loaders/syncloader!./loaders/asyncloader!./a")).toEqual("a");
	expect(require("./loaders/asyncloader!./loaders/syncloader!./a")).toEqual("a");
	expect(require("./loaders/asyncloader!./loaders/asyncloader!./a")).toEqual("a");

	expect(require("./loaders/asyncloader!./loaders/asyncloader!./loaders/asyncloader!./a")).toEqual("a");
	expect(require("./loaders/asyncloader!./loaders/syncloader!./loaders/asyncloader!./a")).toEqual("a");
	expect(require("./loaders/syncloader!./loaders/asyncloader!./loaders/syncloader!./a")).toEqual("a");
	expect(require("./loaders/syncloader!./loaders/syncloader!./loaders/syncloader!./a")).toEqual("a");
});
