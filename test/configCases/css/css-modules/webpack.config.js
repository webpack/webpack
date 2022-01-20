/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		target: "web",
		mode: "development",
		module: {
			parser: {
				javascript: {
					exportsPresence: "warn"
				}
			}
		},
		experiments: {
			css: true
		}
	},
	{
		target: "web",
		mode: "production",
		output: {
			uniqueName: "my-app"
		},
		module: {
			parser: {
				javascript: {
					exportsPresence: "warn"
				}
			}
		},
		experiments: {
			css: true
		}
	}
];
