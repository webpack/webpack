module.exports = () => {
	return (
		!process.version.startsWith("v10.") && !process.version.startsWith("v12.")
	);
};
