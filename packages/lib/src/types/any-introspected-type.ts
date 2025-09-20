import type { IntrospectedBase } from "../gir/introspected-base.ts";
import type { IntrospectedNamespace } from "../gir/namespace.ts";

// Recursive type representing any IntrospectedBase with a valid parent constraint
export type AnyIntrospectedType = IntrospectedBase<IntrospectedNamespace | AnyIntrospectedType | null>;
