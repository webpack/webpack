import { mult } from "a";
f(() => { (x() || x()) && false && mult(); });
f(() => { if (x() && false) mult(); });
