"use strict";

const direct =
	/http:\/\/localhost:9992@127\.0\.0\.1:9992\/resolve\.js doesn't match the allowedUris policy\./;
const redirect =
	/http:\/\/localhost:9992@127\.0\.0\.1:9992\/resolve\.js doesn't match the allowedUris policy after redirect/;

module.exports = [[direct], [redirect], [direct], [redirect]];
