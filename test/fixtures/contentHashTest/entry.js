module.exports = (key, cb) => {
	require([`./${key}`], result => {
		cb(result);
	});
};
