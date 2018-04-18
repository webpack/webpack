const FakeDocument = require("../../../helpers/FakeDocument");

beforeEach(() => {
	global.document = new FakeDocument();
	global.window = {};
});

afterEach(() => {
	delete global.document;
	delete global.window;
});

it("should be able to load the split chunk on demand", () => {
	const promise = import(/* webpackChunkName: "shared" */ "./shared");

	const script = document.head._children[0];
	expect(script.src).toBe("dep~b~shared.js");
});
