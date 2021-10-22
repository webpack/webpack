import manifest1 from "webpack-manifest:web";
import manifest2 from "webpack-manifest:web2";

it("should provide correct entrypoints", () => {
	expect(Object.keys(manifest1.entrypoints)).toEqual(
		expect.arrayContaining(["page1", "page2"])
	);
	expect(Object.keys(manifest2.entrypoints)).toEqual(
		expect.arrayContaining(["main"])
	);
});
