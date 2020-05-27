import OldReact from "old-react";
import React from "react";
import ComponentC from "containerB/ComponentC";

export default () => {
	return `App rendered with [${React()}] and [${OldReact()}] and [${ComponentC()}]`;
};
