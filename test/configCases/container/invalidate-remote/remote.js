// Import from the federated remote — this is what creates a RemoteModule
// in the webpack compilation, triggering the federation runtime requirement
// and installing __webpack_require__.federation.
import widget from "app2/Widget";

export function getWidget() {
	return widget;
}
