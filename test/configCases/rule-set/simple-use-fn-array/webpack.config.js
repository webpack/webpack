function createFunctionArrayFromUseArray(useArray) {
	return useArray.map(function (useItem) {
		return function (data) {
			return useItem;
		};
	});
}

var useArray = createFunctionArrayFromUseArray([
	"./loader",
	{
		loader: "./loader",
		options: "second-2"
	},
	{
		loader: "./loader",
		options: {
			get: function () {
				return "second-3";
			}
		}
	}
]);

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				oneOf: [
					{
						test: {
							and: [/a.\.js$/, /b\.js$/]
						},
						loader: "./loader",
						options: "first"
					},
					{
						test: [require.resolve("./a"), require.resolve("./c")],
						issuer: require.resolve("./b"),
						use: useArray
					},
					{
						test: {
							or: [require.resolve("./a"), require.resolve("./c")]
						},
						loader: "./loader",
						options: "third"
					}
				]
			}
		]
	}
};
