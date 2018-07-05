var testData = require("./src/index.js");

it("should export the correct values", function() {
	expect(testData).toEqual({
		svg5: {
			svg: {
				clinical1: {
					svg1: 1
				},
				clinical2: {
					svg2: 2
				},
				[Symbol.toStringTag]: "Module"
			},
			[Symbol.toStringTag]: "Module"
		},
		svg6: {
			svg: {
				test: {
					svg1: 10
				},
				clinical2: {
					svg2: 20
				},
				[Symbol.toStringTag]: "Module"
			},
			[Symbol.toStringTag]: "Module"
		},
		[Symbol.toStringTag]: "Module"
	});
})
