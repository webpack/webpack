// Select with multiple sub-components
import { InternalSelect } from "./InternalSelect";
import { Option } from "./Option";
import { OptGroup } from "./OptGroup";
import { PurePanel } from "./PurePanel";

const Select = InternalSelect;
Select.Option = Option;
Select.OptGroup = OptGroup;
Select.PurePanel = PurePanel;

export { Select };
