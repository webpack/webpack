// Mirrors antd's components/form/index.tsx compound component pattern
import { InternalForm } from "./InternalForm";
import { FormItem } from "./FormItem";
import { FormList } from "./FormList";
import { useForm } from "./useForm";
import { ErrorList } from "./ErrorList";

const Form = InternalForm;
Form.Item = FormItem;
Form.List = FormList;
Form.useForm = useForm;
Form.ErrorList = ErrorList;

export default Form;
