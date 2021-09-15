import React from "react";
import { formatRelative, subDays } from "date-fns";

const Component = ({ locale }) => (
	<div style={{ border: "5px solid darkred" }}>
		<p>I'm a Component exposed from container C!</p>
		<p>
			Using date-fn in Remote:{" "}
			{formatRelative(subDays(new Date(), 3), new Date(), { locale })}
		</p>
	</div>
);
export default Component;
