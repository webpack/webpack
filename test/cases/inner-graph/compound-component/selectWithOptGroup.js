// Imports Select (which has .Option, .OptGroup, .PurePanel), adds .SecretPanel, re-exports
// select.js should NOT optimize because SelectFull = Select uses the whole object
// selectWithOptGroup.js CAN optimize its own .SecretPanel if unused
import { Select } from "./select";
import { SecretPanel } from "./SecretPanel";

const SelectFull = Select;
SelectFull.SecretPanel = SecretPanel;

export { SelectFull };
