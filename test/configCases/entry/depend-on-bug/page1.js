import isomorphicFetch from "isomorphic-fetch";

it("should run", () => {
	expect(
		__STATS__.modules.find(m => m.name.includes("isomorphic-fetch")).chunks
	).toHaveLength(1);
});
