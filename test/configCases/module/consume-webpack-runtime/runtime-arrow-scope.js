function __webpack_require__() {
	throw new Error("Should be unreached");
}

const modules = [
	// `__webpack_require__` as arrow fn params should be replaced
	((__webpack_require__) => {
		require("./shared");
		try{
			__webpack_require__()
		}	catch {}

	})
];

modules[0](__webpack_require__);
