module.exports = [
	{
		entry: {
			big: "./big",
			medium: "./medium",
			small: "./small",
			image: "./big"
		},
		mode: "production",
		target: "node",
		performance: {
			hints: "warning",
			assetFilter: function(asset) {
				return !asset.startsWith("image");
			}
		}
	},
	{
		entry: {
			big: "./big",
			medium: "./medium",
			small: "./small",
			image: "./big"
		},
		mode: "production",
		target: "node",
		performance: [
			{
				hints: "warning",
				assetFilter: function(asset) {
					return !asset.startsWith("image");
				}
			}
		]
	},
	{
		entry: {
			big: "./big",
			medium: "./medium",
			small: "./small",
			image: "./big"
		},
		mode: "production",
		target: "node",
		performance: [
			{
				hints: "warning",
				assetFilter: function(asset) {
					return !asset.startsWith("image");
				}
			},
			{
				hints: false,
				assetFilter: function(asset) {
					return asset.startsWith("image");
				}
			}
		]
	},
	{
		entry: {
			big: "./big",
			medium: "./medium",
			small: "./small",
			image: "./big"
		},
		mode: "production",
		target: "node",
		performance: [
			{
				hints: "warning"
			}
		]
	},
	{
		entry: {
			big: "./big",
			medium: "./medium",
			small: "./small",
			image: "./big"
		},
		mode: "production",
		target: "node",
		performance: {
			hints: "warning"
		}
	},
	{
		entry: {
			big: "./big",
			medium: "./medium",
			small: "./small",
			image: "./big"
		},
		mode: "production",
		target: "node",
		performance: {
			hints: "warning",
			maxAssetSize: 100000,
			maxEntrypointSize: 100000
		}
	},
	{
		entry: {
			big: "./big",
			medium: "./medium",
			small: "./small",
			image: "./big"
		},
		mode: "production",
		target: "node",
		performance: [
			{
				hints: "warning",
				maxAssetSize: 500000,
				maxEntrypointSize: 500000
			},
			{
				hints: "warning",
				maxAssetSize: 100000,
				maxEntrypointSize: 100000,
				assetFilter: function(asset) {
					return !asset.startsWith("image");
				}
			}
		]
	}
];
