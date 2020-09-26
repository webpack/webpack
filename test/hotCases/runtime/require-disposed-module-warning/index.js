const expectWarning = require("../../../helpers/expectWarningFactory")();
require("./module");

it("should print correct warning messages when a disposed module is required", (done) => {
	NEXT(require("../../update")(done, true, () => {
		require("./module");
		done();
	}));
});

if(module.hot) {
	module.hot.accept("./module");
}
