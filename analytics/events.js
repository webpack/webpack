"use strict";

const event = (category) => (action, details) => ({
	category: category,
	action: action,
	label: details.label,
	value: details.value
});

const onBuild = event("build");
const onConfig = event("options");

exports.event = event;
exports.onBuild = onBuild;
exports.onConfig = onConfig;

