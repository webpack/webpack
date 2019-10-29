"use strict";
const fs = require("graceful-fs");
const path = require("path");

const check = (expected, actual) => {
	if (expected instanceof RegExp) {
		expected = { message: expected };
	}
	return Object.keys(expected).every(key => {
		let value = actual[key];
		if (typeof value === "object") {
			value = JSON.stringify(value);
		}
		return expected[key].test(value);
	});
};

const explain = object => {
	if (object instanceof RegExp) {
		object = { message: object };
	}
	return Object.keys(object)
		.map(key => {
			let value = object[key];
			if (typeof value === "object" && !(value instanceof RegExp)) {
				value = JSON.stringify(value);
			}
			let msg = `${key} = ${value}`;
			if (key !== "stack" && key !== "details" && msg.length > 100)
				msg = msg.slice(0, 97) + "...";
			return msg;
		})
		.join("; ");
};

module.exports = function checkArrayExpectation(
	testDirectory,
	object,
	kind,
	filename,
	upperCaseKind,
	done
) {
	if (!done) {
		done = upperCaseKind;
		upperCaseKind = filename;
		filename = `${kind}s`;
	}
	let array = object[`${kind}s`];
	if (Array.isArray(array)) {
		if (kind === "warning") {
			array = array.filter(item => !/from Terser/.test(item));
		}
	}
	if (fs.existsSync(path.join(testDirectory, `${filename}.js`))) {
		const expectedFilename = path.join(testDirectory, `${filename}.js`);
		const expected = require(expectedFilename);
		if (expected.length < array.length) {
			return (
				done(
					new Error(
						`More ${kind}s while compiling than expected:\n\n${array
							.map(explain)
							.join("\n\n")}. Check expected ${kind}s: ${expectedFilename}`
					)
				),
				true
			);
		} else if (expected.length > array.length) {
			return (
				done(
					new Error(
						`Less ${kind}s while compiling than expected:\n\n${array
							.map(explain)
							.join("\n\n")}. Check expected ${kind}s: ${expectedFilename}`
					)
				),
				true
			);
		}
		for (let i = 0; i < array.length; i++) {
			if (Array.isArray(expected[i])) {
				for (let j = 0; j < expected[i].length; j++) {
					if (!check(expected[i][j], array[i])) {
						return (
							done(
								new Error(
									`${upperCaseKind} ${i}: ${explain(
										array[i]
									)} doesn't match ${explain(expected[i][j])}`
								)
							),
							true
						);
					}
				}
			} else if (!check(expected[i], array[i]))
				return (
					done(
						new Error(
							`${upperCaseKind} ${i}: ${explain(
								array[i]
							)} doesn't match ${explain(expected[i])}`
						)
					),
					true
				);
		}
	} else if (array.length > 0) {
		return (
			done(
				new Error(
					`${upperCaseKind}s while compiling:\n\n${array
						.map(explain)
						.join("\n\n")}`
				)
			),
			true
		);
	}
};
