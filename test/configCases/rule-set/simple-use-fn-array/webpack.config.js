function createFunctionArrayFromUseArray(useArray) {
	return useArray.map(function(useItem) {
		return function(data) {
			return useItem;
		};
	});
}

var useArray = createFunctionArrayFromUseArray([
	"./loader?second-1",
	{
		loader: "./loader",
		options: "second-2"
	},
	{
		loader: "./loader",
		options: {
			get: function() {
				return "second-3";
			}
		}
	}
]);

module.exports = {
	module: {
		rules: [
			{
				oneOf: [
					{
						test: {
							and: [/a.\.js$/, /b\.js$/]
						},
						loader: "./loader?first"
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
