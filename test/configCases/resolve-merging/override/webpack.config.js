module.exports = {
	resolve: {
		alias: {
			byDependency: "ok"
		},
		byDependency: {
			stylesheet: {
				conditionNames: ["style", "..."]
			}
		}
	},
	module: {
		rules: [
			{
				test: /aaa/,
				resolve: {
					mainFields: []
				}
			},
			{
				test: /bbb/,
				resolve: {
					mainFields: ["other", "..."]
				}
			},
			{
				test: /ccc/,
				resolve: {
					mainFields: ["xyz", "..."]
				}
			},
			{
				test: /ddd/,
				resolve: {
					byDependency: {
						esm: {
							mainFields: ["other", "..."]
						}
					}
				}
			}
		]
	}
};
