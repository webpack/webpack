module.exports = [
	// We use (1|2), because both contain the problems, but due asynchronous nature the first module can be `error1` or `error2`
	/^Pack got invalid because of write to: Compilation\/modules.+loaders[/\\]options[/\\]error(1|2)\.js$/
];
