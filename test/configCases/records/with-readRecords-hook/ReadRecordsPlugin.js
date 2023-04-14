class ReadRecordsPlugin {
	apply(compiler) {
		compiler.hooks.readRecords.tapAsync("ReadRecordsPlugin", callback => {
			setTimeout(() => {
				console.log("Done with reading records.");
				callback();
			}, 1000);
		});
	}
}

module.exports = ReadRecordsPlugin;
