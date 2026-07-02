const context = import.meta.webpackContext("./context", {
	regExp: /value/
});

export default context("./value").default;
