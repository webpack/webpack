import common from "../common";

it("entry1 should compile and run", () => {
	common()
	console.log('entry1');
	expect(true).toBe(true)
});
