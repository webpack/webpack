const lastResults = new Map();

class DotReporter {
	constructor() {
		this.lineStarted = true;
	}

	onRunStart() {
		process.stdout.write("\nRunning...");
	}

	onRunComplete() {
		if (this.lineStarted) {
			console.log();
			this.lineStarted = false;
		}
	}

	onTestResult(test, testResult, aggregatedResult) {
		const lastResult = lastResults.get(test.path);
		if (testResult.failureMessage) {
			if (this.lineStarted) {
				console.log();
				this.lineStarted = false;
			}
			console.log(testResult.failureMessage);
			lastResults.set(test.path, testResult.failureMessage);
		} else {
			if (lastResult) {
				if (this.lineStarted) {
					console.log();
					this.lineStarted = false;
				}
				console.log(`\u001b[1m\u001b[32m${test.path} ok\u001b[39m\u001b[22m`);
			} else {
				process.stdout.write(".");
				this.lineStarted = true;
			}
		}
	}
}

module.exports = DotReporter;
