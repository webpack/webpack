it("should be able to use dynamic defines in watch mode", function() {
	const module = require("./module");
	expect(module).toEqual(nsObj({
		default: WATCH_STEP,
		type: "string"
	}));
});

it("should not update a define when dependencies list is missing", function() {
	const module2 = require("./module2");
	expect(module2).toEqual(nsObj({
		default: "0",
		type: "string"
	}));
});

it("should update always when fileDependencies is true", function() {
	const module3 = require("./module3");
	expect(module3).toEqual(nsObj({
		default: WATCH_STEP,
		type: "string"
	}));
});
