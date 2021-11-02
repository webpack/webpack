/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "production",
	module: {
		rules: [
			{
				test: /aaa/,
				parser: {
					exportPresence: false
				}
			},
			{
				test: /bbb/,
				parser: {
					exportPresence: "warn"
				}
			},
			{
				test: /ccc/,
				parser: {
					exportPresence: "error"
				}
			},
			{
				test: /ddd/,
				parser: {
					exportPresence: "error",
					importExportPresence: "warn",
					reexportExportPresence: false
				}
			}
		]
	}
};
