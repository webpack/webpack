"use strict";

const formatLocation = require("../lib/formatLocation");

describe("formatLocation", () => {
	const testCases = [
		{
			name: "undefined",
			loc: undefined,
			result: ""
		},
		{
			name: "null",
			loc: null,
			result: ""
		},
		{
			name: "string",
			loc: "str",
			result: "str"
		},
		{
			name: "number",
			loc: 12,
			result: "12"
		},
		{
			name: "line-column",
			loc: {
				start: {
					line: 1,
					column: 2
				},
				end: {
					line: 3,
					column: 4
				}
			},
			result: "1:2-3:4"
		},
		{
			name: "line-column (same line)",
			loc: {
				start: {
					line: 1,
					column: 2
				},
				end: {
					line: 1,
					column: 4
				}
			},
			result: "1:2-4"
		},
		{
			name: "line-column (start only)",
			loc: {
				start: {
					line: 5,
					column: 6
				}
			},
			result: "5:6"
		},
		{
			name: "start-end string",
			loc: {
				start: "start",
				end: "end"
			},
			result: "start-end"
		},
		{
			name: "start-end number",
			loc: {
				start: 9,
				end: 7
			},
			result: "9-7"
		},
		{
			name: "line",
			loc: {
				start: {
					line: 10
				},
				end: {
					index: 20
				}
			},
			result: "10:?-+20"
		},
		{
			name: "line",
			loc: {
				start: null,
				end: /f/
			},
			result: ""
		}
	];
	testCases.forEach(testCase => {
		it(`should format location correctly for ${testCase.name}`, () => {
			expect(formatLocation(testCase.loc)).toEqual(testCase.result);
		});
	});
});
