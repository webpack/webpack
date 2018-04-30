module.exports = {
	mode: "development",
	entry: {
		main: ["./a", "./b", "./test"]
	},
	module: {
		rules: [
			{
				test: /c\.js/,
				issuer: /a\.js/,
				loader: "./loader-a"
			},
			{
				test: /c\.js/,
				issuer: /b\.js/,
				loader: "./loader-b"
			}
		]
	},
	node: {
		__dirname: false
	}
};
