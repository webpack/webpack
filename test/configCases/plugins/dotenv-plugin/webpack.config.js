"use strict";

const DotenvPlugin = require("../../../../lib/DotenvPlugin");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "basic",
		entry: "./basic",
		plugins: [new DotenvPlugin()]
	},
	{
		name: "with-defaults",
		entry: "./defaults",
		plugins: [
			new DotenvPlugin({
				defaults: true
			})
		]
	},
	{
		name: "with-expand",
		entry: "./expand",
		plugins: [
			new DotenvPlugin({
				expand: true
			})
		]
	},
	{
		name: "with-systemvars",
		entry: "./systemvars",
		plugins: [
			new DotenvPlugin({
				systemvars: true
			})
		]
	},
	{
		name: "custom-path",
		entry: "./custom-path",
		plugins: [
			new DotenvPlugin({
				path: "./.env.example"
			})
		]
	},
	{
		name: "custom-prefix",
		entry: "./custom-prefix",
		plugins: [
			new DotenvPlugin({
				prefix: "MY_ENV."
			})
		]
	},
	{
		name: "safe-mode-error",
		entry: "./basic", // Use existing entry file
		plugins: [
			new DotenvPlugin({
				path: "./incomplete.env",
				safe: "./.env.example"
			})
		]
	}
];
