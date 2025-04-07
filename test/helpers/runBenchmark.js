const Benchmark = require("benchmark");

module.exports = function runBenchmark(config, context) {
	return new Promise((resolve, reject) => {
		const webpack = require("../../lib/index");
		config.context = context;

		webpack(config, err => {
			if (err) return reject(err);

			const bench = new Benchmark(
				function (deferred) {
					const compiler = webpack(config, (err, stats) => {
						if (err || stats.hasErrors()) {
							return deferred.reject(err || stats.toString());
						}
						deferred.resolve();
					});
					console.log(compiler);
				},
				{
					maxTime: 20,
					defer: true,
					initCount: 1,
					async: true,
					onComplete() {
						resolve({
							mean: bench.stats.mean,
							deviation: bench.stats.deviation,
							samples: bench.stats.sample.length
						});
					},
					onError: reject
				}
			);

			bench.run({ async: true });
		});
	});
};
