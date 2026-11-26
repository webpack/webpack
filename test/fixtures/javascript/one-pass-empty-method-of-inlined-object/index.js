// A call of an empty function read off an object inlined at each read runs
// only its arguments.
var log = [];
function make() {
	const logger = {
		info: () => {},
		quiet: function () {},
		log: (value) => console.log(value)
	};
	logger.info("ignored");
	logger["quiet"](log.push("argument"));
	logger.log("logged");
}
make();
// One whose body runs, or a pattern binding what it takes, still runs.
function kept() {
	const handlers = {
		run: () => {
			log.push("run");
		},
		bind: ({ name }) => {}
	};
	handlers.run();
	try {
		handlers.bind(null);
	} catch (error) {
		log.push(error.name);
	}
}
kept();
console.log(log);
