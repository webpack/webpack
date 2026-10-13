it("should wait for a restarted compiler before reporting done", async () => {
	const [first, second] = COMPILER.compilers;
	const results = [];
	let runs = 0;
	let invalidations = 0;
	let resumeFirst;
	let finishSecond;
	let latestFirst;
	let latestSecond;
	COMPILER.hooks.done.tap("WatchRestartTest", (stats, changedCompilers) => {
		results.push({ stats: stats.stats, changedCompilers });
	});
	first.hooks.invalid.tap("WatchRestartTest", () => {
		invalidations++;
	});
	const restarted = new Promise((resolve) => {
		first.hooks.watchRun.tapAsync(
			{ name: "WatchRestartTest", stage: -1 },
			(_compiler, callback) => {
				if (++runs === 2) {
					resumeFirst = callback;
					resolve();
				} else {
					callback();
				}
			}
		);
	});
	first.hooks.done.tap({ name: "WatchRestartTest", stage: -1 }, (stats) => {
		latestFirst = stats;
		// Invalidate before MultiCompiler records this build as done.
		if (runs === 1) first.watching.invalidate();
	});
	const siblingReady = new Promise((resolve) => {
		second.hooks.done.tapAsync(
			{ name: "WatchRestartTest", stage: -1 },
			(stats, callback) => {
				latestSecond = stats;
				finishSecond = callback;
				resolve();
			}
		);
	});
	const finished = new Promise((resolve) => {
		first.hooks.afterDone.tap("WatchRestartTest", () => {
			if (runs === 2) resolve();
		});
	});
	first.watching.invalidate();
	second.watching.invalidate();
	await Promise.all([restarted, siblingReady]);
	finishSecond();
	try {
		expect(runs).toBe(2);
		expect(invalidations).toBe(2);
		expect(results).toHaveLength(0);
	} finally {
		resumeFirst();
		await finished;
	}
	expect(results).toHaveLength(1);
	expect(results[0].stats[0]).toBe(latestFirst);
	expect(results[0].stats[1]).toBe(latestSecond);
	expect(results[0].changedCompilers).toEqual([first, second]);
});
