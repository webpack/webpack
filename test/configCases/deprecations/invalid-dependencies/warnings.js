module.exports = [
	[
		{ moduleName: /\.\/index\.js/ },
		/Invalid dependencies have been reported/,
		/"\."/,
		/"\.\.\/\*\*\/dir\/\*\.js"/,
		{ details: /"\.\/missing1\.js"/ },
		{ details: /"loader\.js"/ },
		/and more/,
		{ details: /"missing3\.js"/ }
	]
];
