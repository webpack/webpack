module.exports = [{
	output: {
		filename: 'bundle0.[hash:6].js'
	}
}, {
	output: {
		filename: 'bundle1.[hash].js'
	}
}, {
	output: {
		filename: 'bundle2.[chunkhash:8].js',
		chunkFilename: '[id].bundle.[chunkhash:8].js'
	}
}, {
	output: {
		filename: 'bundle3.[chunkhash].js',
		chunkFilename: '[id].bundle.[chunkhash].js'
	}
}, {
	output: {
		filename: 'bundle4.[hash].js',
		chunkFilename: '[id].bundle.[hash:8].js'
	}
}, {
	output: {
		filename: 'bundle5.[hash:6].js',
		chunkFilename: '[id].bundle.[hash:8].js'
	}
}];
