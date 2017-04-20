/* globals describe, it, beforeEach */
"use strict";

const sinon = require("sinon");
const removeAndDo = require("../lib/removeAndDo");

describe("removeAndDo", () => {
	let actionSpy;
	let thingsMock;
	let contextMock;
	let anotherThingsMock;

	beforeEach(() => {
		actionSpy = sinon.spy();
		thingsMock = {
			action: actionSpy
		};
		anotherThingsMock = {
			action: actionSpy
		};
		contextMock = {
			context: [thingsMock]
		};
	});

	it("should return true", () => {
		expect(removeAndDo.bind(contextMock)('context', thingsMock, 'action')).toEqual(true);
		expect(actionSpy.callCount).toBe(1);
	});

	it("should return false", () => {
		expect(removeAndDo.bind(contextMock)('context', anotherThingsMock, 'anotherAction')).toEqual(false);
		expect(actionSpy.callCount).toBe(0);
	});
});
