/* globals describe, it, beforeEach */
"use strict";

const should = require("should");
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
		should(removeAndDo.bind(contextMock)('context', thingsMock, 'action')).be.eql(true);
		actionSpy.callCount.should.be.exactly(1);
	});

	it("should return false", () => {
		should(removeAndDo.bind(contextMock)('context', anotherThingsMock, 'anotherAction')).be.eql(false);
		actionSpy.callCount.should.be.exactly(0);
	});
});
