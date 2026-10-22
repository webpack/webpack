import a from "./module";

var obj = {};

it("issue-5314: should allow access to the default export of the root module", function() {
	expect(a()).toBe(obj);
});

export default obj;
