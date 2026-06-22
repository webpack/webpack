"use strict";

const smartGrouping = require("../lib/util/smartGrouping");

describe("util/smartGrouping", () => {
	it("should group correctly", () => {
		const groupConfigs =
			/** @type {import("../lib/util/smartGrouping").GroupConfig<string, { name: string, items: string[] }>[]} */ ([
				{
					/**
					 * @param {string} item group item
					 * @returns {string[] | undefined} keys
					 */
					getKeys(item) {
						return /** @type {string[] | undefined} */ (
							/** @type {unknown} */ (item.match(/\d+/g))
						);
					},
					/**
					 * @param {string} key group key
					 * @param {string[]} items group items
					 * @returns {{ name: string, items: string[] }} group object
					 */
					createGroup(key, items) {
						return {
							name: `has number ${key}`,
							items
						};
					}
				},
				{
					/**
					 * @param {string} item group item
					 * @returns {string[] | undefined} keys
					 */
					getKeys(item) {
						return /** @type {string[] | undefined} */ (
							/** @type {unknown} */ (item.match(/\w+/g))
						);
					},
					/**
					 * @param {string} key group key
					 * @param {string[]} items group items
					 * @returns {{ name: string, items: string[] }} group object
					 */
					createGroup(key, items) {
						return {
							name: `has word ${key}`,
							items
						};
					}
				}
			]);
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
