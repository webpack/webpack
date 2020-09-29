/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	entry: ["./a", "./b", "./test"],
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
	}
};
