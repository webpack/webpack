"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				test: /a\.js$/,
				use: [
					"./loader1",
					{
						loader: "./loader2",
						ident: "loader2",
						options: {
							f() {
								return "ok";
							}
						}
					}
				]
			},
			{
				test: /b\.js$/,
				use: [
					"./loader1",
					{
						loader: "./loader2",
						options: {
							f() {
								return "ok";
							}
						}
					}
				]
			},
			{
				test: /c\.js$/,
				use: "./loader1"
			},
			{
				test: /c\.js$/,
				loader: "./loader2",
				options: {
					f() {
						return "ok";
					}
				}
			}
		]
	}
};
