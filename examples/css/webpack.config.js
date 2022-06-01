module.exports = {
	output: {
		uniqueName: "app"
	},
	experiments: {
		buildHttp: {
			allowedUris: [
				"https://fonts.googleapis.com",
				"https://fonts.gstatic.com",
				"https://unpkg.com"
			],
			frozen: false
		},
		css: true
	}
};
