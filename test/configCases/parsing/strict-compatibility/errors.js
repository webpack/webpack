"use strict";

module.exports = () =>
	Array.from({ length: 9 }, () => ({ message: /Module parse failed:/ }));
