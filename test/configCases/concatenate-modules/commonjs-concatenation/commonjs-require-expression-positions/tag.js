"use strict";

module.exports = (strings, ...values) => `tagged:${strings.raw.join("|")}:${values.join(",")}`;
