"use strict";

const { DefinePlugin, EnvironmentPlugin } = require("../../../../");

/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		new DefinePlugin({
			OBJECT: {
				A: JSON.stringify("a"),
				RUNTIME: DefinePlugin.runtimeValue(() => JSON.stringify("rv"), {
					version: "1"
				}),
				NESTED: {
					D1: JSON.stringify("d1")
				},
				LIST: [JSON.stringify("l1")]
			},
			"OBJECT.B": JSON.stringify("b"),
			"OBJECT.NESTED.DEEP": JSON.stringify("deep"),
			"MERGE.SUB.A": JSON.stringify("ma"),
			"MERGE.SUB": {
				B: JSON.stringify("mb")
			},
			"OBJECT.LIST.EXTRA": JSON.stringify("extra"),
			SCALAR: JSON.stringify("scalar"),
			"SCALAR.X": JSON.stringify("scalar-x"),
			"CROSS.X": JSON.stringify("x"),
			"process.env": {
				PE_A: JSON.stringify("pe-a")
			}
		}),
		new DefinePlugin({
			"CROSS.Y": JSON.stringify("y")
		}),
		new EnvironmentPlugin({
			PE_B: "pe-b"
		})
	]
};
