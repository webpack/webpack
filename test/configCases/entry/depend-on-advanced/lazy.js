import lodash from "lodash";
import propTypes from "prop-types";

export default function() {
	expect(lodash).toBe("lodash");
	expect(propTypes).toBe("prop-types");
}
