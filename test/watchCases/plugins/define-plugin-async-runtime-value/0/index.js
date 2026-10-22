it("should be able to use async dynamic defines in watch mode", function () {
	const module = require("./module");
	expect(module).toEqual(
		nsObj({
			default: WATCH_STEP,
			type: "string"
		})
	);
});

it("should not update an async define when dependencies list is missing", function () {
	const module2 = require("./module2");
	expect(module2).toEqual(
		nsObj({
			default: "0",
			type: "string"
		})
	);
});

it("should update an async define always when fileDependencies is true", function () {
	const module3 = require("./module3");
	expect(module3).toEqual(
		nsObj({
			default: WATCH_STEP,
			type: "string"
		})
	);
});

it("should allow an async generator with a dynamic version", function () {
	const module4 = require("./module4");
	expect(module4).toEqual(
		nsObj({
			default: {
				version: WATCH_STEP,
				key: "TEST_VALUE4"
			},
			type: "object"
		})
	);
});
