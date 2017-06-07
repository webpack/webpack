var testData = require("./src/index.js");

it("should export the correct values", function() {
	testData.should.be.eql({
		icon: {
			svg: {
				default: 1
			}
		}
	});
})
