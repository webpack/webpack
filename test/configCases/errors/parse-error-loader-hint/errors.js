"use strict";

const head =
	"^Module parse failed: Unexpected token \\(1:0\\)\\n" +
	"File was parsed as module type 'javascript\\/auto'\\.\\n" +
	"File was processed with these loaders:\\n";
const tail =
	"You may need an additional loader to handle the result of these loaders\\.\\n" +
	"> 1 \\| <!DOCTYPE html>\\n" +
	" {4}\\| \\^\\n" +
	" {2}2 \\| <html>$";
const identity = " \\* \\.\\/identity-loader\\.js\\n";
const addComment = " \\* \\.\\/add-comment-loader\\.js\\n";

module.exports = [
	[
		{ moduleName: /^\.\/single\.tpl$/, loc: /^1:0$/ },
		new RegExp(head + identity + tail)
	],
	[
		{ moduleName: /^\.\/array\.tpl$/, loc: /^1:0$/ },
		new RegExp(head + identity + addComment + tail)
	],
	[
		{ moduleName: /^\.\/string\.tpl$/, loc: /^1:0$/ },
		new RegExp(head + identity + addComment + tail)
	]
];
