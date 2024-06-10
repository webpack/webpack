module.exports = () => {
	return /^v(1[6-9]|21)/.test(process.version);
};
