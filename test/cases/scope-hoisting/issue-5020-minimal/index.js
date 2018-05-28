var testData = require("./src/index.js");

it("should export the correct values", function() {
	expect(testData).toEqual({
		icon: {
			svg: {
				default: 1
			}
		}
	});
})
