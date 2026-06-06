// Table with runtime dynamic property access — optimization should NOT apply
import { InternalTable } from "./InternalTable";
import { Column } from "./Column";
import { ColumnGroup } from "./ColumnGroup";

const Table = InternalTable;
Table.Column = Column;
Table.ColumnGroup = ColumnGroup;

// Dynamic property access makes Table unconditionally used in InnerGraph
const key = "Column";
console.log(Table[key]);

export default Table;
