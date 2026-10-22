"use strict";

const fs = require("fs");
const path = require("path");
const webpack = require("../../../../");

const { DefinePlugin, Module } = webpack;

const valueFile = path.resolve(__dirname, "value.txt");
const sharedValue = DefinePlugin.runtimeValue(async ({ key }) =>
	JSON.stringify(key)
);

/**
 * @param {string} file the file to read
 * @returns {Promise<string>} its trimmed content
 */
const readFile = (file) =>
	new Promise((resolve, reject) => {
		fs.readFile(file, "utf8", (err, content) => {
			if (err) reject(err);
			else resolve(content.trim());
		});
	});

/**
 * @template T
 * @param {T} value the value
 * @returns {Promise<T>} the value, resolved in a later tick
 */
const later = (value) =>
	new Promise((resolve) => {
		setTimeout(() => resolve(value), 1);
	});

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			// an `async` generator is recognized without being declared
			ASYNC_NUMBER: DefinePlugin.runtimeValue(async () => later(42)),
			ASYNC_UNDEFINED: DefinePlugin.runtimeValue(async () => undefined),
			ASYNC_NULL: DefinePlugin.runtimeValue(async () => null),
			ASYNC_FALSE: DefinePlugin.runtimeValue(async () => false),
			SHARED_FIRST: sharedValue,
			// a generator that returns a promise without being declared `async`
			PROMISED_STRING: DefinePlugin.runtimeValue(
				() => later(JSON.stringify("promised")),
				{ async: true }
			),
			// the argument is the one a synchronous generator gets
			ASYNC_MODULE_IS_A_MODULE: DefinePlugin.runtimeValue(
				async ({ module }) => module instanceof Module
			),
			ASYNC_KEY: DefinePlugin.runtimeValue(async ({ key }) =>
				JSON.stringify(key)
			),
			ASYNC_VERSION: DefinePlugin.runtimeValue(
				async ({ version }) => JSON.stringify(version),
				{ version: "v1" }
			),
			"typeof ASYNC_TYPEOF": DefinePlugin.runtimeValue(async () =>
				JSON.stringify("magic")
			),
			ASYNC_FROM_FILE: DefinePlugin.runtimeValue(
				async () => JSON.stringify(await readFile(valueFile)),
				[valueFile]
			),
			ASYNC_OBJECT: {
				nested: DefinePlugin.runtimeValue(async () => JSON.stringify("nested"))
			},
			ASYNC_ARRAY: [
				DefinePlugin.runtimeValue(async () => JSON.stringify("first"))
			],
			"ASYNC_DOTTED.deep": DefinePlugin.runtimeValue(async () =>
				JSON.stringify("deep")
			)
		}),
		new DefinePlugin({ SHARED_SECOND: sharedValue })
	]
};
