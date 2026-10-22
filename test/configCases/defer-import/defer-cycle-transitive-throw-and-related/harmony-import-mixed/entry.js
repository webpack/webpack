import { value as directValue } from "./shared.js"; // non-defer import
import * as deferredShared from /* webpackDefer: true */ "./shared.js"; // defer import

import { value as directValueAsync } from "./shared-async.js"; // non-defer import
import * as deferredSharedAsync from /* webpackDefer: true */ "./shared-async.js"; // defer import

export {
	directValue,
	deferredShared,
	directValueAsync,
	deferredSharedAsync
};
