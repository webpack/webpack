module.exports = {
	mode: "development",
	output: {
		urlModuleFilename: "images/file[ext]" // confirm that `.` is attached when output
	},
	module: {
		rules: [
			{
				test: /\.png$/,
				type: "url/experimental"
			}
		]
	}
};
