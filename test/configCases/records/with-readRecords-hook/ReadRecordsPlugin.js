class ReadRecordsPlugin {
	apply(compiler) {
		compiler.hooks.readRecords.tapAsync("ReadRecordsPlugin", callback => {
			setTimeout(() => {
				callback();
			}, 1000);
		});
	}
}

module.exports = ReadRecordsPlugin;
