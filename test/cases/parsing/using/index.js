import { resource, disposed } from "./module.js";

let disposeCounter = 0;

const getResource = () => {
	return {
		test() {
			// Nothing
		},
		[Symbol.dispose]: () => {
			disposeCounter++;
		}
	}
}


it("should using", async () => {
	{
		using foo = getResource();

		foo.test();
	}

	expect(disposeCounter).toBe(1);

	{
		await using bar = getResource();

		bar.test();
	}

	expect(disposeCounter).toBe(2);

	for (await using x of [getResource()]) {
		x.test();
	}

	expect(disposeCounter).toBe(3);

	for await (await using x of [getResource()]) {
		x.test();
	}

	expect(disposeCounter).toBe(4);

	{
		using resource = await getResource();
	}

	expect(disposeCounter).toBe(5);

	// TODO uncomment when will re resolved on V8 side - https://github.com/tc39/proposal-explicit-resource-management/issues/262
	// resource[Symbol.dispose]();
	// expect(disposed).toBe(true);
});
