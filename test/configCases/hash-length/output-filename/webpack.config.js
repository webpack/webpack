module.exports = [{
	output: {
		filename: 'bundle.[hash:6].js'
	}
}, {
	output: {
		filename: 'bundle.[hash].js'
	}
}, {
	output: {
		filename: 'bundle.[chunkhash:8].js',
		chunkFilename: '[id].bundle.[chunkhash:8].js'
	}
}, {
	output: {
		filename: 'bundle.[chunkhash].js',
		chunkFilename: '[id].bundle.[chunkhash].js'
	}
}, {
	output: {
		filename: 'bundle.[hash].js',
		chunkFilename: '[id].bundle.[hash:8].js'
	}
}, {
	output: {
		filename: 'bundle.[hash:6].js',
		chunkFilename: '[id].bundle.[hash:8].js'
	}
}];
