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
		filename: 'bundle.[hash].js',
		chunkFilename: '[id].bundle.[hash:8].js'
	}
}, {
	output: {
		filename: 'bundle.[hash:6].js',
		chunkFilename: '[id].bundle.[hash:8].js'
	}
}];
