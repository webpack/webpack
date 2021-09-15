it("should allow combinations of async and sync loaders", function() {
	expect(require("./loaders/syncloader!./a")).toBe("a");
	expect(require("./loaders/asyncloader!./a")).toBe("a");

	expect(require("./loaders/syncloader!./loaders/syncloader!./a")).toBe("a");
	expect(require("./loaders/syncloader!./loaders/asyncloader!./a")).toBe("a");
	expect(require("./loaders/asyncloader!./loaders/syncloader!./a")).toBe("a");
	expect(require("./loaders/asyncloader!./loaders/asyncloader!./a")).toBe("a");

	expect(require("./loaders/asyncloader!./loaders/asyncloader!./loaders/asyncloader!./a")).toBe("a");
	expect(require("./loaders/asyncloader!./loaders/syncloader!./loaders/asyncloader!./a")).toBe("a");
	expect(require("./loaders/syncloader!./loaders/asyncloader!./loaders/syncloader!./a")).toBe("a");
	expect(require("./loaders/syncloader!./loaders/syncloader!./loaders/syncloader!./a")).toBe("a");
});
