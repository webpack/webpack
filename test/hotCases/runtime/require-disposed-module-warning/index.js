const expectWarning = require("../../../helpers/expectWarningFactory")();
const {aModule} = require("./module");

it("should print correct warning messages when a disposed module is required", (done) => {
	NEXT(require("../../update")(done, true, () => {
		require("./module");
		__webpack_modules__[aModule.id].call(aModule.exports, aModule);
		expectWarning(/^\[HMR] unexpected require\(\.\/a.js\) to disposed module$/);
		done();
	}));
});

if(module.hot) {
	module.hot.accept("./module");
}
