/**
 * @param {EXPECTED_ANY[]} useArray use array
 * @returns {EXPECTED_FUNCTION[]} functions
 */
function createFunctionArrayFromUseArray(useArray) {
	return useArray.map(
		useItem =>
			function () {
				return useItem;
			}
	);
}

const useArray = createFunctionArrayFromUseArray([
	"./loader",
	{
		loader: "./loader",
		options: "second-2"
	},
	{
		loader: "./loader",
		options: {
			get() {
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
