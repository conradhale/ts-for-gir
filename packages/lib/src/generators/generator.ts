import type { IntrospectedAlias } from "../gir/alias.ts";
import type { IntrospectedCallback } from "../gir/callback.ts";
import type { IntrospectedConstant } from "../gir/const.ts";
import type { IntrospectedConstructor } from "../gir/constructor.ts";
import type { IntrospectedDirectAllocationConstructor } from "../gir/direct-allocation-constructor.ts";
import type { IntrospectedEnum } from "../gir/enum.ts";
import type { GirEnumMember } from "../gir/enum-member.ts";
import type { IntrospectedError } from "../gir/error.ts";
import type { IntrospectedFunction } from "../gir/function.ts";
import type {
	IntrospectedClass,
	IntrospectedClassCallback,
	IntrospectedClassFunction,
	IntrospectedInterface,
	IntrospectedStaticClassFunction,
	IntrospectedVirtualClassFunction,
} from "../gir/introspected-classes.ts";
import type { IntrospectedNamespace } from "../gir/namespace.ts";
import type { IntrospectedFunctionParameter } from "../gir/parameter.ts";
import type { IntrospectedField, IntrospectedProperty } from "../gir/property.ts";
import type { IntrospectedRecord } from "../gir/record.ts";
import type { IntrospectedSignal, IntrospectedSignalType } from "../gir/signal.ts";
import type {
	ArrayType,
	ClassStructTypeIdentifier,
	ClosureType,
	FunctionType,
	GenericType,
	GenerifiedType,
	GenerifiedTypeIdentifier,
	ModuleTypeIdentifier,
	NativeType,
	OrType,
	PromiseType,
	TupleType,
	TypeConflict,
	TypeExpression,
	TypeIdentifier,
} from "../gir.ts";
import type { OptionsGeneration } from "../types/options-generation.ts";

// TODO: Move to types/
export interface GenericDescriptor {
	type: TypeExpression;
	name: string;
}

export abstract class FormatGenerator<Node = string, Identifier = Node, Type = Node> {
	protected module: IntrospectedNamespace;
	protected options: OptionsGeneration;

	constructor(namespace: IntrospectedNamespace, options: OptionsGeneration) {
		this.module = namespace;
		this.options = options;
	}

	abstract generateCallback(node: IntrospectedCallback): Node;
	abstract generateClassCallback(node: IntrospectedClassCallback): Node;
	abstract generateAlias(node: IntrospectedAlias): Node;
	abstract generateConstructor(node: IntrospectedConstructor): Node;
	abstract generateDirectAllocationConstructor(node: IntrospectedDirectAllocationConstructor): Node;
	abstract generateConstructorFunction(node: IntrospectedConstructor): Node;
	abstract generateRecord(node: IntrospectedRecord): Node;
	abstract generateInterface(node: IntrospectedInterface): Node;
	abstract generateEnumMember(node: GirEnumMember): Node;
	abstract generateError(node: IntrospectedError): Node;
	abstract generateEnum(node: IntrospectedEnum): Node;
	abstract generateConst(node: IntrospectedConstant): Node;
	abstract generateClass(node: IntrospectedClass): Node;
	abstract generateParameter(node: IntrospectedFunctionParameter): Node;
	abstract generateProperty(node: IntrospectedProperty, construct?: boolean): Node;
	abstract generateField(node: IntrospectedField): Node;
	abstract generateSignal(node: IntrospectedSignal, type?: IntrospectedSignalType): Node;
	abstract generateFunction(node: IntrospectedFunction): Node;
	abstract generateClassFunction(node: IntrospectedClassFunction): Node;
	abstract generateStaticClassFunction(node: IntrospectedStaticClassFunction): Node;
	abstract generateVirtualClassFunction(node: IntrospectedVirtualClassFunction): Node;

	abstract generateTypeIdentifier(node: TypeIdentifier): Identifier;
	abstract generateModuleTypeIdentifier(node: ModuleTypeIdentifier): Identifier;
	abstract generateClassStructTypeIdentifier(node: ClassStructTypeIdentifier): Identifier;
	abstract generateGenerifiedTypeIdentifier(node: GenerifiedTypeIdentifier): Identifier;
	abstract generateNativeType(node: NativeType): Type;
	abstract generateOrType(node: OrType): Type;
	abstract generateTupleType(node: TupleType): Type;
	abstract generateFunctionType(node: FunctionType): Type;
	abstract generateGenerifiedType(node: GenerifiedType): Type;
	abstract generateGenericType(node: GenericType): Type;
	abstract generatePromiseType(node: PromiseType): Type;
	abstract generateTypeConflict(node: TypeConflict): Type;
	abstract generateClosureType(node: ClosureType): Type;
	abstract generateArrayType(node: ArrayType): Type;
}
