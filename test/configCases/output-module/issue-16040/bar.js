import { countBy } from "lodash-es";

import "./bar.css";

const result = countBy([6.1, 4.2, 6.3], Math.floor);

export default result["6"];
