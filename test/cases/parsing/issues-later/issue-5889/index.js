const result = require("./module");

it("issue-5889: should correctly replace 'require' bindings", () => {
	expect(result).toBe(true);
});
