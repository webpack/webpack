"use strict";

const vm = require("vm");
const { load } = require("../../lib/javascript/syntax").printer;

describe("JavaScript minifier name cache", () => {
	it.each([false, true])(
		"should keep a module's globals when reusing names with compress=%s",
		async (compress) => {
			const { minify } = await load();
			const nameCache = {};
			const options = { compress, module: true, nameCache };
			const source = 'import process from "node:process";sink(process.pid);';
			const first = await minify(source, options);
			const second = await minify("sink(process.platform);", options);
			const sink = jest.fn();
			vm.runInNewContext(/** @type {string} */ (second.code), {
				process: { platform: "global" },
				sink
			});
			expect(sink).toHaveBeenCalledWith("global");
			expect(nameCache).toMatchObject({
				vars: { props: { $process: expect.any(String) } }
			});
			const third = await minify(source, options);
			expect(third.code).toBe(first.code);
			expect([first.code, second.code]).toMatchSnapshot();
		}
	);

	it("should share cached globals between scripts", async () => {
		const { minify } = await load();
		const options = { compress: false, toplevel: true, nameCache: {} };
		const first = await minify('var shared = "cached";sink(shared);', options);
		const second = await minify("sink(shared);", options);
		const sink = jest.fn();
		vm.runInNewContext(`${first.code}\n${second.code}`, { sink });
		expect(sink.mock.calls).toEqual([["cached"], ["cached"]]);
		expect([first.code, second.code]).toMatchSnapshot();
	});
});
