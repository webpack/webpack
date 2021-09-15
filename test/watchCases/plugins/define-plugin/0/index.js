it("should be able to use dynamic defines in watch mode", function () {
	const module = require("./module");
	expect(module).toEqual(
		nsObj({
			default: WATCH_STEP,
			type: "string"
		})
	);
});

it("should not update a define when dependencies list is missing", function () {
	const module2 = require("./module2");
	expect(module2).toEqual(
		nsObj({
			default: "0",
			type: "string"
		})
	);
});

it("should update always when fileDependencies is true", function () {
	const module3 = require("./module3");
	expect(module3).toEqual(
		nsObj({
			default: WATCH_STEP,
			type: "string"
		})
	);
});

it("should allow to use an options object with fileDependencies", function () {
	const module4 = require("./module4");
	expect(module4).toEqual(
		nsObj({
			default: WATCH_STEP,
			type: "string"
		})
	);
});

it("should allow to use an options object with dynamic version", function () {
	const module5 = require("./module5");
	expect(module5).toEqual(
		nsObj({
			default: {
				version: WATCH_STEP,
				key: "TEST_VALUE5"
			},
			type: "object"
		})
	);
});
