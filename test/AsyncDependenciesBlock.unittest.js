"use strict";

const Hash = require("../lib/util/Hash");
const AsyncDependenciesBlock = require("../lib/AsyncDependenciesBlock");

describe("AsyncDependenciesBlock", () => {
	const groupOptions = {
		name: "TestName"
	};
	const dependencyLocation = {
		start: {
			line: 1,
			column: 1
		},
		end: {
			line: 1,
			column: 2
		},
		index: 0
	};
	const basicDepsBlock = new AsyncDependenciesBlock(
		groupOptions,
		dependencyLocation,
		""
	);

	class MockHash extends Hash {
		constructor() {
			super();
			this.testHash = "";
		}

		update(data, inputEncoding) {
			this.testHash = "updated";
		}
	}

	it("Should return chunkName", () => {
		expect(basicDepsBlock.chunkName).toBe(groupOptions.name);
	});

	it("Should set chunkName", () => {
		expect(basicDepsBlock.chunkName).toBe(groupOptions.name);
		const newName = "NewName";
		basicDepsBlock.chunkName = newName;
		expect(basicDepsBlock.chunkName).toBe(newName);
	});

	it("Should construct with string groupOptions", () => {
		const stringTestName = "StringTestName";
		const stringGroupOptionsDepsBlock = new AsyncDependenciesBlock(
			stringTestName,
			1,
			""
		);
		expect(stringGroupOptionsDepsBlock.chunkName).toBe(stringTestName);
	});

	it("Should construct with an undefined name if groupOptions is null", () => {
		const undefinedNameDepsBlock = new AsyncDependenciesBlock(undefined, 1, "");
		expect(undefinedNameDepsBlock.chunkName).toBe(undefined);
	});

	it("Should updateHash", () => {
		const updateHashContext = {
			chunkGraph: {
				getBlockChunkGroup: jest.fn(ref => ({
					id: 0
				}))
			}
		};
		const mockHash = new MockHash();
		expect(mockHash.testHash).toBe("");
		basicDepsBlock.updateHash(mockHash, updateHashContext);
		expect(mockHash.testHash).toBe("updated");
	});

	it("Should updateHash when chunkGroup is undefined", () => {
		const updateHashContext = {
			chunkGraph: {
				getBlockChunkGroup: jest.fn(ref => undefined)
			}
		};
		const mockHash = new MockHash();
		expect(mockHash.testHash).toBe("");
		basicDepsBlock.updateHash(mockHash, updateHashContext);
		expect(mockHash.testHash).toBe("updated");
	});

	it("Should serialize", () => {
		const serializeWriteMock = jest.fn(write => null);
		const serializeContext = {
			write: serializeWriteMock
		};
		basicDepsBlock.serialize(serializeContext);
		expect(serializeWriteMock).toHaveBeenCalledWith(
			basicDepsBlock.groupOptions
		);
		expect(serializeWriteMock).toHaveBeenCalledWith(basicDepsBlock.loc);
		expect(serializeWriteMock).toHaveBeenCalledWith(basicDepsBlock.request);
	});

	it("Should deserialize", () => {
		const mockDeserializedValue = [{ parent: undefined }];
		const deserializeContext = {
			read: jest.fn(() => mockDeserializedValue)
		};
		basicDepsBlock.deserialize(deserializeContext);
		expect(basicDepsBlock.groupOptions).toEqual(mockDeserializedValue);
		expect(basicDepsBlock.loc).toEqual(mockDeserializedValue);
		expect(basicDepsBlock.request).toEqual(mockDeserializedValue);
		expect(basicDepsBlock.dependencies).toEqual(mockDeserializedValue);
		expect(basicDepsBlock.blocks).toEqual(mockDeserializedValue);
	});

	it("Should throw error on module get and set", () => {
		const modulePropertyError =
			"module property was removed from AsyncDependenciesBlock (it's not needed)";
		const getModule = () => {
			return basicDepsBlock.module;
		};
		const setModule = () => {
			basicDepsBlock.module = {};
		};
		expect(getModule).toThrowError(modulePropertyError);
		expect(setModule).toThrowError(modulePropertyError);
	});
});
