"use strict";

const ModuleFilenameHelpers = require("../../lib/devtool/ModuleFilenameHelpers");

describe("ModuleFilenameHelpers", () => {
	describe("replaceDuplicates", () => {
		it("numbers the duplicates in array order", () => {
			expect(
				ModuleFilenameHelpers.replaceDuplicates(
					["a", "b", "a", "a"],
					(item, _index, count) => `${item}-${count}`
				)
			).toEqual(["a-0", "b", "a-1", "a-2"]);
		});

		it("keeps the value of the duplicate the comparator sorts first", () => {
			expect(
				ModuleFilenameHelpers.replaceDuplicates(
					["a", "b", "a", "a"],
					(item, _index, count) => `${item}-${count}`,
					(firstIndex, nextIndex) => nextIndex - firstIndex
				)
			).toEqual(["a-0", "b", "a-1", "a"]);
		});
	});
});
