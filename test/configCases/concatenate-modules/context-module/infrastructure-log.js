module.exports = options => {
	if (options.cache && options.cache.type === "filesystem") {
		return [/Pack got invalid because of write to/];
	}

	return [];
};
