var testData = require("./src/index.js");

it("should export the correct values", function() {
	testData.should.be.eql({
		svg5: {
			svg: {
				clinical1: {
					svg1: 1
				},
				clinical2: {
					svg2: 2
				}
			}
		},
		svg6: {
			svg: {
				test: {
					svg1: 10
				},
				clinical2: {
					svg2: 20
				}
			}
		}
	});
})
