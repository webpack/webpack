const FakeDocument = require("../../../helpers/FakeDocument");

module.exports = {
	fakeDocument: true,
	beforeExecute: () => {
		global.document = new FakeDocument();
	}
};
