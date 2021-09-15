"use strict";

const smartGrouping = require("../lib/util/smartGrouping");

describe("util/smartGrouping", () => {
	it("should group correctly", () => {
		const groupConfigs = [
			{
				getKeys(item) {
					return item.match(/\d+/g);
				},
				createGroup(key, items) {
					return {
						name: `has number ${key}`,
						items
					};
				}
			},
			{
				getKeys(item) {
					return item.match(/\w+/g);
				},
				createGroup(key, items) {
					return {
						name: `has word ${key}`,
						items
					};
				}
			}
		];
		expect(
			smartGrouping(
				[
					"hello world a",
					"hello world b 2",
					"hello world c",
					"hello world d",
					"hello test",
					"hello more test",
					"more test",
					"more tests",
					"1 2 3",
					"2 3 4",
					"3 4 5"
				],
				groupConfigs
			)
		).toMatchInlineSnapshot(`
		Array [
		  Object {
		    "items": Array [
		      Object {
		        "items": Array [
		          "hello world a",
		          "hello world b 2",
		          "hello world c",
		          "hello world d",
		        ],
		        "name": "has word world",
		      },
		      Object {
		        "items": Array [
		          "hello test",
		          "hello more test",
		        ],
		        "name": "has word test",
		      },
		    ],
		    "name": "has word hello",
		  },
		  Object {
		    "items": Array [
		      "1 2 3",
		      "2 3 4",
		      "3 4 5",
		    ],
		    "name": "has number 3",
		  },
		  "more test",
		  "more tests",
		]
	`);
	});
});
