/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		output: {
			filename: "runtime-to-entrypoint-[name].js"
		},
		entry: {
			a1: "./a",
			b1: {
				runtime: "a1",
				import: "./b"
			}
		}
	},
	{
		output: {
			filename: "dependOn-plus-runtime-[name].js"
		},
		entry: {
			a2: "./a",
			b2: {
				runtime: "x2",
				dependOn: "a2",
				import: "./b"
			}
		}
	},
	{
		output: {
			filename: "circular-dependOn-[name].js"
		},
		entry: {
			a3: {
				import: "./a",
				dependOn: "b3"
			},
			b3: {
				import: "./b",
				dependOn: "a3"
			}
		}
	}
];
