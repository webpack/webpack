"use strict";

const makeEvent = (category) => (eventDetails) => ({
	category: category,
	action: eventDetails.action,
	label: eventDetails.label || undefined,
	value: eventDetails.value || undefined
});

const buildEvent = makeEvent("build");
const configEvent = makeEvent("options");

exports.makeEvent = makeEvent;
exports.buildEvent = buildEvent;
exports.configEvent = configEvent;
