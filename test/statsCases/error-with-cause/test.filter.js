// test/statsCases/error-with-cause/test.filter.js
module.exports = (stats, runtime) => {
	const errors = stats.errors.map(err => ({
		message: err.message,
		cause: err.cause
	}));
	return {
		errors
	};
};
