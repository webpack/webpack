"use strict";

const ConcatenatedModule = require("../lib/optimize/ConcatenatedModule");
const { runtimeConditionToString } = require("../lib/util/runtime");

const makeStub = (list) => {
	const stub = Object.create(ConcatenatedModule.prototype);
	stub.dependencies = [];
	stub.blocks = [];
	stub._runtime = undefined;
	stub.rootModule = null;
	stub._modules = new Set();
	stub._createConcatenationList = () => list;
	return /** @type {ConcatenatedModule} */ (stub);
};

const makeRecordingHash = () => {
	const updates = [];
	return {
		update(value) {
			updates.push(String(value));
			return this;
		},
		updates
	};
};

const fakeChunkGraph = {
	moduleGraph: {},
	getModuleId: (m) => m.id,
	getModuleGraphHash: () => ""
};

describe("ConcatenatedModule#updateHash", () => {
	it("incorporates runtimeCondition for external infos so distinct runtime conditions diverge", () => {
		const externalModule = { id: "external-id" };

		const hashA = makeRecordingHash();
		makeStub([
			{
				type: "external",
				module: externalModule,
				runtimeCondition: "main"
			}
		]).updateHash(hashA, { chunkGraph: fakeChunkGraph, runtime: undefined });

		const hashB = makeRecordingHash();
		makeStub([
			{
				type: "external",
				module: externalModule,
				runtimeCondition: "other"
			}
		]).updateHash(hashB, { chunkGraph: fakeChunkGraph, runtime: undefined });

		expect(hashA.updates).not.toEqual(hashB.updates);
		expect(hashA.updates).toContain(runtimeConditionToString("main"));
		expect(hashB.updates).toContain(runtimeConditionToString("other"));
	});

	it("emits the same updates when the runtimeCondition for the external is unchanged", () => {
		const externalModule = { id: "external-id" };

		const hashA = makeRecordingHash();
		makeStub([
			{
				type: "external",
				module: externalModule,
				runtimeCondition: true
			}
		]).updateHash(hashA, { chunkGraph: fakeChunkGraph, runtime: undefined });

		const hashB = makeRecordingHash();
		makeStub([
			{
				type: "external",
				module: externalModule,
				runtimeCondition: true
			}
		]).updateHash(hashB, { chunkGraph: fakeChunkGraph, runtime: undefined });

		expect(hashA.updates).toEqual(hashB.updates);
	});
});
