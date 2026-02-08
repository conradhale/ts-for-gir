import { GirDirection } from "@gi.ts/parser";
import {
	AnyType,
	type ArrayType,
	BinaryType,
	BooleanType,
	ClassStructTypeIdentifier,
	type ClosureType,
	ConflictType,
	type Dependency,
	FilterBehavior,
	FormatGenerator,
	type FunctionType,
	filterConflicts,
	filterFunctionConflict,
	type Generic,
	type GenericType,
	type GenerifiedType,
	type GenerifiedTypeIdentifier,
	type GirEnumMember,
	type GirModule,
	generateIndent,
	hasVfuncSignatureConflicts,
	IntrospectedAlias,
	type IntrospectedBaseClass,
	type IntrospectedCallback,
	IntrospectedClass,
	type IntrospectedClassCallback,
	IntrospectedClassFunction,
	type IntrospectedConstant,
	IntrospectedConstructor,
	IntrospectedDirectAllocationConstructor,
	type IntrospectedEnum,
	type IntrospectedError,
	type IntrospectedField,
	type IntrospectedFunction,
	IntrospectedFunctionParameter,
	IntrospectedInterface,
	type IntrospectedProperty,
	IntrospectedRecord,
	type IntrospectedSignal,
	IntrospectedSignalType,
	IntrospectedStaticClassFunction,
	IntrospectedVirtualClassFunction,
	type ModuleTypeIdentifier,
	NativeType,
	NativeTypeKind,
	NumberType,
	type OptionsGeneration,
	type OrType,
	type PromiseType,
	promisifyFunctions,
	Reporter,
	ReporterService,
	removeClassModule,
	removeNamespace,
	resolveDirectedType,
	type TupleType,
	TypeConflict,
	type TypeExpression,
	type TypeIdentifier,
	transformGirDocText,
	VoidType,
} from "@ts-for-gir/lib";
import ts from "typescript";
import type TemplateProcessor from "./template-processor.ts";
// import { PackageDataParser } from './package-data-parser.ts'
import * as utils from "./utils.ts";

const { factory } = ts;

/**
 * Module generator output format enum
 */
export enum ModuleGeneratorFormat {
	/** Output as string array (default) */
	StringArray = "string-array",
	/** Output as single string */
	String = "string",
	/** Output as module declaration */
	ModuleDeclaration = "module-declaration",
	/** Output as inline DTS format */
	Inline = "inline",
}

export abstract class ModuleGeneratorBase extends FormatGenerator<
	ts.Node | ts.Node[],
	ts.ExpressionWithTypeArguments,
	ts.TypeNode
> {
	_printer?: ts.Printer;
	log: Reporter;
	namespace: string;
	moduleTemplateProcessor: TemplateProcessor;

	constructor(
		module: GirModule,
		options: OptionsGeneration,
		name: string,
		namespace: string,
		moduleTemplateProcessor: TemplateProcessor,
	) {
		super(module, options);

		this.moduleTemplateProcessor = moduleTemplateProcessor;

		this.namespace = namespace;
		this.log = new Reporter(options.verbose, name, options.reporter, options.reporterOutput);

		// Register with reporter service if reporting is enabled
		if (options.reporter) {
			const reporterService = ReporterService.getInstance();
			reporterService.registerReporter(`${name}(${module.packageName})`, this.log);
		}
	}

	protected getEntityName(node: TypeIdentifier, name?: string) {
		if (this.namespace === node.namespace) {
			return factory.createIdentifier(name ?? node.name);
		}

		return utils.createEntityName(node.namespace, name ?? node.name);
	}

	protected getExpression(node: TypeIdentifier, name?: string) {
		const identifier = factory.createIdentifier(name ?? node.name);

		if (this.namespace === node.namespace) {
			return identifier;
		}

		return utils.createExpression(node.namespace, identifier);
	}

	generateTypeIdentifier(node: TypeIdentifier) {
		return factory.createExpressionWithTypeArguments(this.getExpression(node), undefined);
	}

	generateModuleTypeIdentifier(node: ModuleTypeIdentifier) {
		return factory.createExpressionWithTypeArguments(
			utils.createExpression(this.getExpression(node, node.moduleName), node.name),
			undefined,
		);
	}

	generateClassStructTypeIdentifier(node: ClassStructTypeIdentifier) {
		return factory.createExpressionWithTypeArguments(
			factory.createTypeOfExpression(this.getExpression(node)),
			undefined,
		);
	}

	generateGenerifiedTypeIdentifier(node: GenerifiedTypeIdentifier) {
		return factory.createExpressionWithTypeArguments(this.getExpression(node), this.getChildTypes(node.generics));
	}

	generateNativeType(node: NativeType) {
		switch (node.kind) {
			case NativeTypeKind.this:
				return factory.createThisTypeNode();
			case NativeTypeKind.object:
				return factory.createKeywordTypeNode(ts.SyntaxKind.ObjectKeyword);
			case NativeTypeKind.any:
				return factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
			case NativeTypeKind.never:
				return factory.createKeywordTypeNode(ts.SyntaxKind.NeverKeyword);
			case NativeTypeKind.Uint8Array:
				return factory.createTypeReferenceNode("Uint8Array");
			case NativeTypeKind.boolean:
				return factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword);
			case NativeTypeKind.string:
				return factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
			case NativeTypeKind.number:
				return factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);
			case NativeTypeKind.null:
				return factory.createLiteralTypeNode(factory.createNull());
			case NativeTypeKind.void:
				return factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
			case NativeTypeKind.unknown:
				return factory.createKeywordTypeNode(ts.SyntaxKind.UnknownKeyword);
			case NativeTypeKind.function:
				return utils.createAnyFunctionType();
			case NativeTypeKind.StringLiteral:
				return factory.createLiteralTypeNode(factory.createStringLiteral(node.text ?? ""));
			case NativeTypeKind.TypeReference:
				return node.text
					? factory.createTypeReferenceNode(node.text)
					: factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);
		}
	}

	protected getType(type: TypeExpression): ts.TypeNode | undefined {
		const generated: ts.TypeNode | undefined = type.generate(this);

		if (generated && ts.isTypeNode(generated)) {
			return generated;
		}
	}

	protected generateType(type: TypeExpression): ts.TypeNode | undefined {
		return this.getType(type.resolve(this.module, this.options));
	}

	protected getChildTypes(children: readonly TypeExpression[]) {
		const types: ts.TypeNode[] = [];
		for (const type of children) {
			const typeNode = this.getType(type);

			if (typeNode) {
				types.push(typeNode);
			}
		}

		return types;
	}

	generateOrType(node: OrType) {
		return factory.createUnionTypeNode(this.getChildTypes(node.types));
	}

	generateTupleType(node: TupleType) {
		return factory.createTupleTypeNode(this.getChildTypes(node.types));
	}

	generateFunctionType(node: FunctionType) {
		const params: ts.ParameterDeclaration[] = [];

		for (const [name, typeExpression] of Object.entries(node.parameterTypes)) {
			const type = this.generateType(typeExpression);

			if (type) {
				params.push(utils.createParameterDeclaration(name, { type }));
			}
		}

		let returnType = this.generateType(node.returnType);

		if (!returnType) {
			returnType = factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
		}

		return factory.createFunctionTypeNode(undefined, params, returnType);
	}

	generateGenerifiedType(node: GenerifiedType) {
		const type: ts.TypeNode = node.type.generate(this);

		if (ts.isTypeReferenceNode(type)) {
			return factory.createTypeReferenceNode(type.typeName, [node.generic.generate(this)]);
		}

		return type;
	}

	generateGenericType(node: GenericType) {
		return factory.createTypeReferenceNode(node.identifier);
	}

	generatePromiseType(node: PromiseType) {
		return factory.createTypeReferenceNode(utils.createEntityName("globalThis", "Promise"), [node.type.generate(this)]);
	}

	generateTypeConflict(node: TypeConflict): ts.TypeNode {
		return node.generate(this);
	}

	generateClosureType(node: ClosureType): ts.TypeNode {
		return node.type.generate(this);
	}

	generateArrayType(node: ArrayType) {
		return factory.createArrayTypeNode(
			node.type.generate(this) ?? factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
		);
	}

	protected createGObjectIdentifier(left: string | ts.Identifier, ...segments: (string | ts.Identifier)[]) {
		if (this.namespace === "GObject") {
			return utils.createEntityName(left, ...segments);
		} else {
			return utils.createEntityName("GObject", left, ...segments);
		}
	}

	generateClassCallback(node: IntrospectedClassCallback) {
		return this.generateCallback(node);
	}

	generateConstructor(node: IntrospectedConstructor) {
		return factory.createConstructorDeclaration(undefined, this.generateParameters(node.parameters), undefined);
	}

	generateDirectAllocationConstructor(node: IntrospectedDirectAllocationConstructor) {
		return factory.createConstructorDeclaration(
			undefined,
			[this.generateDirectAllocationConstructorParameter(node)],
			undefined,
		);
	}

	protected generateDirectAllocationConstructorParameter(node: IntrospectedDirectAllocationConstructor) {
		const params = node.parameters.map((param) => this.generateFieldSignature(param.asField()));
		const type = factory.createTypeReferenceNode("Partial", [factory.createTypeLiteralNode(params)]);

		return utils.createParameterDeclaration("properties", { optional: true, type });
	}

	protected getFunctionJSDocTags(girElement: IntrospectedFunction | IntrospectedClassFunction) {
		const tags: utils.JSDocTag[] = [];
		const girReturnValue = girElement?.returnTypeDoc;
		if (girReturnValue) {
			tags.push({
				tag: "returns",
				comment: transformGirDocText(girReturnValue),
			});
		}

		for (const param of girElement.parameters) {
			tags.push({
				tag: "param",
				comment: typeof param.doc === "string" ? transformGirDocText(param.doc) : "",
				paramName: param.name,
			});
		}

		return tags;
	}

	generateParameters(parameters: IntrospectedFunctionParameter[]) {
		return parameters.map((param) => this.generateParameter(param));
	}

	generateConstructorFunction(node: IntrospectedConstructor) {
		const signature = utils.createMethodDeclaration(node.name, {
			static: true,
			typeParams: this.generateGenericParameters(node.generics),
			params: this.generateParameters(node.parameters),
			returnType: this.generateType(node.return()),
			comment: node.getWarning(),
			docComment: node.doc,
		});

		return signature;
	}

	protected addClassNamespace(
		girClass: IntrospectedClass | IntrospectedRecord | IntrospectedInterface,
		statements: ts.Statement[],
	) {
		const moduleStatements: ts.Statement[] = [];

		if (girClass instanceof IntrospectedClass) {
			// Signal interfaces
			this.addSignalSignatures(girClass, moduleStatements);
		}

		if (girClass instanceof IntrospectedInterface) {
			// Virtual interface for implementation
			this.addVirtualInterface(girClass, moduleStatements);
		}

		this.addClassCallbacks(girClass, moduleStatements);

		// Properties interface for construction
		// TODO: Actually use this interface to build class' construction props interface
		this.addConstructPropsInterface(girClass, moduleStatements);

		if (moduleStatements.length > 0) {
			statements.push(
				utils.createModule(girClass.name, {
					statements: moduleStatements,
					export: this.options.noNamespace,
					namespace: true,
				}),
			);
		}
	}

	/**
	 * Generate SignalSignatures interface for type-safe signal handling
	 *
	 * This creates a comprehensive mapping of signal names to their caPropertiesllback types,
	 * enabling TypeScript to provide proper type checking and IntelliSense for
	 * GObject signals using the centralized getAllSignals() method from the model.
	 */
	protected addSignalSignatures(girClass: IntrospectedClass, statements: ts.Statement[]) {
		// Build inheritance chain for signal signatures
		const ifaceExtends: ts.ExpressionWithTypeArguments[] = [];

		// Inherit signal signatures from parent class
		const parentResolution = girClass.resolveParents().extends();
		if (parentResolution && parentResolution.node instanceof IntrospectedClass) {
			const parentClass = parentResolution.node as IntrospectedClass;

			// Include parent signals unless it's a template workaround class
			const hasSignalMethods = parentClass.signals?.length > 0;
			const isNotTemplateWorkaround = !(
				this.namespace === "Gimp" && ["ParamObject", "ParamItem", "ParamArray"].includes(parentClass.name)
			);

			const parentTypeIdentifier: ts.ExpressionWithTypeArguments | undefined = parentResolution.identifier
				.resolveIdentifier(this.module, this.options)
				?.generate(this);

			if (parentTypeIdentifier && (hasSignalMethods || isNotTemplateWorkaround)) {
				ifaceExtends.push(
					factory.createExpressionWithTypeArguments(
						utils.createExpression(parentTypeIdentifier.expression, "SignalSignatures"),
						parentTypeIdentifier.typeArguments,
					),
				);
			}
		}

		// Inherit signal signatures from implemented interfaces
		for (const iface of girClass.resolveParents().implements()) {
			if (!(iface.node instanceof IntrospectedInterface)) {
				continue;
			}

			const node = iface.node as unknown as { signals?: unknown[] };
			if (!node.signals || node.signals.length === 0) {
				continue;
			}

			const interfaceTypeIdentifier: ts.ExpressionWithTypeArguments | undefined = iface.identifier
				.resolveIdentifier(this.module, this.options)
				?.generate(this);

			if (interfaceTypeIdentifier) {
				ifaceExtends.push(
					factory.createExpressionWithTypeArguments(
						utils.createExpression(interfaceTypeIdentifier.expression, "SignalSignatures"),
						interfaceTypeIdentifier.typeArguments,
					),
				);
			}
		}

		// All other classes inherit from GObject.Object's signal signatures as fallback
		if (ifaceExtends.length === 0 && !girClass.isGObjectObject()) {
			const gobjectNamespace = this.module.assertInstalledImport("GObject");
			const gobjectObjectClass = gobjectNamespace.assertClass("Object");
			const gobjectRef: ts.ExpressionWithTypeArguments =
				gobjectObjectClass.getType().resolveIdentifier(this.module, this.options)?.generate(this) ??
				utils.createExpressionWithTypeArguments(utils.createExpression("GObject", "Object"));

			ifaceExtends.push(
				factory.createExpressionWithTypeArguments(
					utils.createExpression(gobjectRef.expression, "SignalSignatures"),
					gobjectRef.typeArguments,
				),
			);
		}

		// Use the centralized getAllSignals method from the model
		const members = girClass.getAllSignals().map((signalInfo) => {
			let cbParams: ts.ParameterDeclaration[] | undefined;
			let cbReturnType: ts.TypeNode | undefined;

			if (signalInfo.isNotifySignal) {
				// Property notification signals have a standard signature
				const identifier = this.createGObjectIdentifier("ParamSpec");
				cbParams = [utils.createParameterDeclaration("pspec", { type: factory.createTypeReferenceNode(identifier) })];

				cbReturnType = factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
			} else if (signalInfo.signal) {
				// Regular signals - use the signal's parameters and return type
				cbParams = signalInfo.signal.parameters.map((p, idx) =>
					utils.createParameterDeclaration(`arg${idx}`, { type: this.generateType(p.type) }),
				);

				// For boolean return types, allow boolean | void for flexibility
				let returnType = signalInfo.signal.return_type;
				if (returnType.equals(BooleanType)) {
					returnType = new BinaryType(BooleanType, VoidType);
				}
				cbReturnType = this.generateType(returnType);
			} else {
				// Fallback for custom signal types
				cbParams = signalInfo.parameterTypes?.map((type, idx) =>
					utils.createParameterDeclaration(`arg${idx}`, { type }),
				);

				// For boolean return types, allow boolean | void for flexibility
				const returnType = signalInfo.returnType;
				cbReturnType = returnType
					? factory.createTypeReferenceNode(returnType)
					: factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);
			}

			return utils.createMethodSignature(signalInfo.name, {
				params: cbParams,
				returnType: cbReturnType,
			});
		});

		// Generate SignalSignatures interface to maintain type inheritance chain
		statements.push(
			utils.createInterface("SignalSignatures", {
				extends: ifaceExtends,
				members,
				comment: "Signal signatures",
			}),
		);
	}

	protected addConstructPropsInterface(
		girClass: IntrospectedClass | IntrospectedRecord | IntrospectedInterface,
		statements: ts.Statement[],
	) {
		if (!girClass.isGObjectObject() && !girClass.hasGObjectParent()) {
			return;
		}

		const resolution = girClass.resolveParents();
		const superType = girClass.superType;
		const superTypeIdentifier: ts.ExpressionWithTypeArguments | undefined = superType
			?.resolveIdentifier(this.module, this.options)
			?.generate(this);

		const typeParams = this.generateGenericParameters(girClass.generics);

		const ifaceExtends: ts.ExpressionWithTypeArguments[] = [];
		// Only add the "extends" if the parent type will be generated (it has props)...
		if (superTypeIdentifier) {
			ifaceExtends.push(
				factory.createExpressionWithTypeArguments(
					utils.createExpression(superTypeIdentifier.expression, "ConstructorProps"),
					superTypeIdentifier.typeArguments,
				),
			);

			if ("implements" in resolution) {
				for (const iface of resolution.implements()) {
					const identifier: ts.ExpressionWithTypeArguments | undefined = iface.identifier
						.resolveIdentifier(this.module, this.options)
						?.generate(this);
					if (!identifier) {
						continue;
					}

					ifaceExtends.push(
						factory.createExpressionWithTypeArguments(
							utils.createExpression(identifier.expression, "ConstructorProps"),
							identifier.typeArguments,
						),
					);
				}
			}
		}

		// Include properties from parent interfaces...
		const { props } = girClass;

		const members = filterConflicts(girClass.namespace, girClass, props, FilterBehavior.PRESERVE).flatMap((prop) =>
			this.generatePropertySignature(prop),
		);

		statements.push(
			utils.createInterface("ConstructorProps", {
				export: this.options.noNamespace,
				typeParams,
				extends: ifaceExtends,
				members,
				comment: "Constructor properties interface",
			}),
		);
	}

	protected addClassCallbacks(
		girClass: IntrospectedClass | IntrospectedInterface | IntrospectedRecord,
		statements: ts.Statement[],
	) {
		if (girClass.callbacks.length === 0) return;

		statements.push(...girClass.callbacks.flatMap((c) => this.generateClassCallback(c)));
	}

	/**
	 * Generates a virtual-methods-only interface for proper GObject interface implementation.
	 * This interface contains only the virtual methods (vfunc_*) that need to be implemented
	 * when creating a class that implements a GObject interface.
	 */
	protected addVirtualInterface(girClass: IntrospectedInterface, statements: ts.Statement[]) {
		// Get only virtual methods from this interface
		const virtualMethods = girClass.members.filter(
			(m) => m instanceof IntrospectedVirtualClassFunction,
		) as IntrospectedVirtualClassFunction[];

		// Don't generate an Interface if there are no virtual methods
		if (virtualMethods.length === 0) {
			return;
		}

		// Build inheritance chain for virtual interface
		const resolution = girClass.resolveParents();
		const ifaceExtends: ts.ExpressionWithTypeArguments[] = [];

		// Inherit from parent interface's Interface if it exists
		const parentResolution = resolution.extends();
		if (parentResolution && parentResolution.node instanceof IntrospectedInterface) {
			const parentInterface = parentResolution.node as IntrospectedInterface;
			const parentTypeIdentifier: ts.ExpressionWithTypeArguments | undefined = parentResolution.identifier
				.resolveIdentifier(this.module, this.options)
				?.generate(this);

			// Check if parent has virtual methods to avoid empty inheritance
			const parentHasVirtualMethods = parentInterface.members.some(
				(m) => m instanceof IntrospectedVirtualClassFunction,
			);

			if (parentTypeIdentifier && parentHasVirtualMethods) {
				ifaceExtends.push(
					factory.createExpressionWithTypeArguments(
						utils.createExpression(parentTypeIdentifier.expression, "Interface"),
						parentTypeIdentifier.typeArguments,
					),
				);
			}
		}

		// No default inheritance for virtual interfaces to avoid non-existent types

		// Generate the Interface interface with generic parameters
		const typeParams = this.generateGenericParameters(girClass.generics);

		// Generate virtual methods
		const members =
			virtualMethods.length === 0
				? undefined
				: utils.prependInfoComment(
						filterFunctionConflict(girClass.namespace, girClass, virtualMethods, []).map((func) =>
							this.generateMethodSignature(func),
						),
						"Virtual methods",
					);

		statements.push(
			utils.createInterface("Interface", {
				typeParams,
				extends: ifaceExtends,
				members,
				docComment: `Interface for implementing ${girClass.name}.\nContains only the virtual methods that need to be implemented.`,
			}),
		);
	}

	addModuleImport(dependency: Dependency, statements: ts.Statement[]) {
		if (this.module.packageName === dependency.packageName) {
			statements.push(
				utils.addInfoComment(factory.createEmptyStatement(), `WARN: Dependency not found: ${dependency.packageName}`),
			);
			return;
		}

		if (!dependency.exists) {
			return;
		}

		const clause = this.options.noNamespace
			? factory.createImportClause(
					ts.SyntaxKind.TypeKeyword,
					undefined,
					factory.createNamespaceImport(factory.createIdentifier(dependency.namespace)),
				)
			: factory.createImportClause(
					ts.SyntaxKind.TypeKeyword,
					factory.createIdentifier(dependency.namespace),
					undefined,
				);

		statements.push(
			factory.createImportDeclaration(undefined, clause, factory.createStringLiteral(dependency.importPath)),
		);
	}

	generateRecord(node: IntrospectedRecord) {
		const structFor = node.structFor;

		if (structFor) {
			const resolvedIdentifier = structFor.resolveIdentifier(this.module, this.options);

			// Only create aliases for structs which resolve...
			if (resolvedIdentifier) {
				return this.generateAlias(
					new IntrospectedAlias({
						name: node.name,
						namespace: node.namespace,
						type: new ClassStructTypeIdentifier(structFor.name, structFor.namespace),
					}),
				);
			}

			throw Error();
		}

		const statements: ts.Statement[] = [];

		this.addClassNamespace(node, statements);

		statements.push(utils.addGirDocComment(this.generateClassBase(node), node.doc));

		return statements;
	}

	generateInterface(node: IntrospectedInterface) {
		const functions = filterFunctionConflict(node.namespace, node, node.members, []);
		const hasStaticFunctions = functions.some((f) => f instanceof IntrospectedStaticClassFunction);
		const hasVirtualMethods = node.members.some((m) => m instanceof IntrospectedVirtualClassFunction);

		const hasNamespace =
			node.hasGObjectParent() || hasStaticFunctions || node.callbacks.length > 0 || hasVirtualMethods;

		const statements: ts.Statement[] = [];

		this.addClassNamespace(node, statements);
		if (hasNamespace) statements.push(this.generateInterfaceNamespace(node));
		statements.push(this.generateImplementationInterface(node));
		if (hasNamespace) statements.push(this.generateInterfaceDeclaration(node));

		return statements;
	}
	generateInterfaceNamespace(node: IntrospectedInterface) {
		const functions = filterFunctionConflict(node.namespace, node, node.members, []);
		const staticFunctions = functions.filter(
			(f): f is IntrospectedStaticClassFunction => f instanceof IntrospectedStaticClassFunction,
		);
		const staticFields = node.fields
			.filter((f) => f.isStatic)
			.map((f) =>
				f.copy({
					isStatic: false,
				}),
			);
		const members: ts.TypeElement[] = [];

		const nodeType = factory.createTypeReferenceNode(node.name);
		if (node.hasGObjectParent()) {
			members.push(
				utils.createPropertySignature("$gtype", {
					type: factory.createTypeReferenceNode(this.createGObjectIdentifier("GType"), [nodeType]),
				}),
			);
		}
		members.push(utils.createPropertySignature("prototype", { type: nodeType }));

		for (const field of staticFields) {
			members.push(this.generateFieldSignature(field));
		}
		for (const func of staticFunctions) {
			members.push(this.generateMethodSignature(func));
		}
		return utils.createInterface(`${node.name}Namespace`, {
			export: true,
			members,
		});
	}
	generateInterfaceDeclaration(node: IntrospectedInterface) {
		const type = factory.createIntersectionTypeNode([
			factory.createTypeReferenceNode(`${node.name}Namespace`),
			factory.createConstructorTypeNode(undefined, undefined, [], factory.createTypeReferenceNode(node.name)),
		]);
		return utils.createConst(node.name, {
			type,
			export: true,
		});
	}
	generateError(node: IntrospectedError) {
		const { module } = this;
		const clazz = node.asClass();

		clazz.members = [];
		clazz.members.push(...Array.from(node.functions.values()));

		const GLib = module.assertInstalledImport("GLib");
		const GLibError = GLib.assertClass("Error");

		clazz.superType = GLibError.getType();

		// Manually construct a GLib.Error constructor.
		clazz.mainConstructor = new IntrospectedConstructor({
			name: "new",
			parent: clazz,
			parameters: [
				new IntrospectedFunctionParameter({
					name: "options",
					type: NativeType.of(NativeTypeKind.TypeReference, "{ message: string, code: number}"),
					direction: GirDirection.In,
				}),
			],
			return_type: clazz.getType(),
		});

		return clazz.generate(this);
	}

	generateSignal(node: IntrospectedSignal, type: IntrospectedSignalType = IntrospectedSignalType.CONNECT) {
		switch (type) {
			case IntrospectedSignalType.CONNECT:
				return node.asConnect(false).generate(this);
			case IntrospectedSignalType.CONNECT_AFTER:
				return node.asConnect(true).generate(this);
			case IntrospectedSignalType.EMIT:
				return node.asEmit().generate(this);
		}
	}

	generateStaticClassFunction(node: IntrospectedStaticClassFunction) {
		return this.generateClassFunction(node);
	}
	generateVirtualClassFunction(node: IntrospectedVirtualClassFunction) {
		return this.generateClassFunction(node);
	}

	generateExport(type: string, name: string, definition: string, indentCount = 0) {
		const exp = !this.options.noNamespace ? "" : "export ";
		const indent = generateIndent(indentCount);
		if (!definition.startsWith(":")) {
			definition = ` ${definition}`;
		}
		return `${indent}${exp}${type} ${name}${definition}`;
	}

	generatePropertySignature(prop: IntrospectedProperty) {
		let propType = prop.type;

		if (propType instanceof TypeConflict) {
			propType = new BinaryType(propType instanceof TypeConflict ? propType.unwrap() : propType, AnyType);
		}

		const type =
			this.generateType(propType.resolve(this.module, this.options)) ??
			factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);

		return utils.createPropertySignature(prop.name, { type, docComment: prop.doc });
	}

	generateProperty(prop: IntrospectedProperty) {
		const { readable, writable, constructOnly, name, doc: docComment } = prop;

		const hasGetter = readable;
		const hasSetter = writable && !constructOnly;

		let propType = prop.type;
		let comment: string | undefined;
		let printAsProperty = false;

		if (propType instanceof TypeConflict) {
			switch (propType.conflictType) {
				case ConflictType.FUNCTION_NAME_CONFLICT:
				case ConflictType.FIELD_NAME_CONFLICT:
					comment = "This accessor conflicts with a field or function name in a parent class or interface.\n";
					propType = new BinaryType(propType.unwrap(), AnyType);
					// A child class cannot have an accessor declared if the parent has a function
					printAsProperty = true;
					break;
				case ConflictType.ACCESSOR_PROPERTY_CONFLICT:
					comment = "This accessor conflicts with a property or field in a parent class or interface.\n";
					propType = new BinaryType(propType.unwrap(), AnyType);
					// A child class cannot have an accessor declared if the parent has a property
					printAsProperty = true;
					break;
				case ConflictType.PROPERTY_ACCESSOR_CONFLICT:
					propType = new BinaryType(propType.unwrap(), AnyType);
					break;
				case ConflictType.PROPERTY_NAME_CONFLICT:
					comment = "This accessor conflicts with another accessor's type in a parent class or interface.\n";
					propType = new BinaryType(propType.unwrap(), AnyType);
					break;
			}
		}

		const type =
			this.generateType(propType.resolve(this.module, this.options)) ??
			factory.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword);

		const properties: ts.ClassElement[] = [];

		if (printAsProperty) {
			properties.push(utils.createPropertyDeclaration(name, { type, comment, docComment }));
		} else {
			if (hasGetter) {
				properties.push(utils.createGetAccessor(name, { type, comment, docComment }));
			}

			if (hasSetter) {
				properties.push(utils.createSetAccessor(name, { params: [utils.createParameterDeclaration("val", { type })] }));
			}
		}

		return properties;
	}

	generateFieldSignature(prop: IntrospectedField) {
		return utils.createPropertySignature(prop.name, this.generateFieldOptions(prop));
	}

	generateField(prop: IntrospectedField) {
		return utils.createPropertyDeclaration(prop.name, this.generateFieldOptions(prop));
	}

	generateFieldOptions(prop: IntrospectedField) {
		const { doc: docComment, computed } = prop;

		const options: utils.PropertyOptions = { docComment, computed, static: prop.isStatic, readonly: !prop.writable };

		let propType = prop.type;

		if (propType instanceof TypeConflict) {
			if (propType.conflictType === ConflictType.PROPERTY_ACCESSOR_CONFLICT) {
				options.comment = "@ts-expect-error This property conflicts with an accessor in a parent class or interface.";

				propType = propType.unwrap();
			} else if (propType.conflictType === ConflictType.FUNCTION_NAME_CONFLICT) {
				options.comment = "This field conflicts with a function in a parent class or interface.";

				propType = new BinaryType(propType.unwrap(), AnyType);
			} else {
				propType = propType.unwrap();
			}
		}

		options.type = this.generateType(propType);

		return options;
	}

	generateDirectedType(type: TypeExpression, direction: GirDirection) {
		return this.generateType(resolveDirectedType(type, direction) ?? type);
	}

	generateParameter(param: IntrospectedFunctionParameter) {
		const type = this.generateDirectedType(param.type, GirDirection.In);
		const optional = param.isOptional && !param.isVarArgs;

		return utils.createParameterDeclaration(param.name, { varArgs: param.isVarArgs, optional, type });
	}

	/**
	 *
	 * @param tsGenerics
	 * @param isOut If this generic parameters are out do only generate the type parameter names
	 * @returns
	 */
	generateGenericParameters(nodes: Generic[], withDefaults = true) {
		return nodes.map((generic) => {
			const constraint = generic.constraint ? this.getType(generic.constraint) : undefined;
			const defaultType = generic.defaultType && withDefaults ? this.getType(generic.defaultType) : undefined;

			return factory.createTypeParameterDeclaration(undefined, generic.type.identifier, constraint, defaultType);
		});
	}

	generateFunctionReturn(
		tsFunction: IntrospectedFunction | IntrospectedClassFunction | IntrospectedClassCallback | IntrospectedCallback,
	) {
		if (tsFunction.name === "constructor") {
			return;
		}

		const resolved = resolveDirectedType(tsFunction.return(), GirDirection.Out) ?? tsFunction.return();
		const type = this.generateType(resolved);

		const outputParameters = tsFunction.output_parameters;

		if (outputParameters.length > 0) {
			const returns: ts.TypeNode[] = [];

			if (type && !resolved.equals(VoidType)) {
				returns.push(type);
			}

			for (const op of outputParameters) {
				const opType = this.generateDirectedType(op.type, GirDirection.Out);
				if (opType) {
					returns.push(opType);
				}
			}

			return factory.createTupleTypeNode(returns);
		}

		return type;
	}

	generateClassFunction(node: IntrospectedClassFunction) {
		return this.generateFunction(node);
	}

	generateFunction<T extends IntrospectedClassFunction | IntrospectedFunction>(func: T, addIgnoreTag = false) {
		const options = this.generateFunctionOptions(func, addIgnoreTag);

		return func instanceof IntrospectedClassFunction
			? utils.createMethodDeclaration(func.name, options)
			: (utils.createFunctionDeclaration(func.name, options) as T extends IntrospectedClassFunction
					? ts.MethodDeclaration
					: ts.FunctionDeclaration);
	}

	generateFunctionOptions<T extends IntrospectedClassFunction | IntrospectedFunction>(func: T, addIgnoreTag = false) {
		const { parameters, name } = func;

		const options: utils.FunctionOptions | utils.MethodOptions = {
			comment: func.getWarning(),
			static: func instanceof IntrospectedStaticClassFunction && name !== "constructor",
			export: !(func instanceof IntrospectedClassFunction) && this.options.noNamespace,
		};

		options.comment = func.getWarning();

		options.typeParams = this.generateGenericParameters(func.generics);

		// `tsType === 'function'` are a global methods which can be exported

		options.returnType = this.generateFunctionReturn(func);

		options.params = this.generateParameters(parameters);

		if (func.doc) {
			options.docComment = func.doc;
			options.docTags = this.getFunctionJSDocTags(func);

			if (addIgnoreTag) {
				options.docTags.push({
					tag: "ignore",
				});
			}
		}

		return options;
	}

	generateFunctions<T extends IntrospectedFunction[] | IntrospectedClassFunction[]>(funcs: T, comment?: string) {
		const functions = funcs.map((func) => this.generateFunction(func));

		utils.prependInfoComment(functions, comment);

		return functions as T extends IntrospectedClassFunction[] ? ts.MethodDeclaration[] : ts.FunctionDeclaration[];
	}

	generateCallback(callback: IntrospectedCallback | IntrospectedClassCallback, classModuleName?: string) {
		let name = removeNamespace(callback.name, callback.namespace.namespace);
		if (classModuleName) name = removeClassModule(name, classModuleName);

		const { parameters } = callback;

		const signature = factory.createCallSignature(
			undefined,
			this.generateParameters(parameters),
			this.generateType(callback.return()),
		);

		return utils.createInterface(name, {
			typeParams: this.generateGenericParameters(callback.generics),
			members: [signature],
			docComment: callback.doc,
		});
	}

	generateEnum(girEnum: IntrospectedEnum) {
		const { name } = girEnum;

		// Enums can't have numerical keys
		const isInvalidEnum = Array.from(girEnum.members.keys()).some(
			(name) => name.match(/^[0-9]+$/) || name === "NaN" || name === "Infinity",
		);

		if (isInvalidEnum) {
			return girEnum.asClass().generate(this);
		}

		const statements = [
			utils.createConst("$gtype", {
				type: factory.createTypeReferenceNode(this.createGObjectIdentifier("GType"), [
					factory.createTypeReferenceNode(name),
				]),
				export: true,
			}),
		];

		const ns = utils.createModule(name, {
			statements,
			export: true,
			namespace: true,
			docComment: girEnum.doc,
		});

		const members = girEnum.members
			.values()
			.map((member) => this.generateEnumMember(member))
			.toArray();

		return [
			ns,
			utils.createEnum(name, {
				export: this.options.noNamespace,
				members,
			}),
		];
	}

	generateEnumMember(member: GirEnumMember) {
		return utils.createEnumMember(member.name, {
			value: Number.parseInt(member.value, 10),
			docComment: member.doc,
		});
	}

	generateConst(constant: IntrospectedConstant) {
		return utils.createConst(constant.name, {
			type: this.generateType(constant.type),
			export: this.options.noNamespace,
			docComment: constant.doc,
		});
	}

	generateAlias(girAlias: IntrospectedAlias) {
		const generics = girAlias.generics.map((g) =>
			factory.createTypeParameterDeclaration(
				undefined,
				g.name,
				undefined,
				g.type ? this.generateType(g.type) : undefined,
			),
		);

		return factory.createTypeAliasDeclaration(
			this.options.noNamespace ? undefined : utils.createModifiers(ts.SyntaxKind.ExportKeyword),
			girAlias.name,
			generics,
			girAlias.type.generate(this),
		);
	}

	addClassSignalsProperty(girClass: IntrospectedClass | IntrospectedRecord, members: ts.ClassElement[]) {
		// Add instance $signals property for type-safe signal access (compile-time only)
		if (girClass.isGObjectObject() || girClass.hasGObjectParent()) {
			members.push(
				utils.createPropertyDeclaration("$signals", {
					type: factory.createTypeReferenceNode(
						utils.createEntityName(girClass.namespace.namespace, girClass.name, "SignalSignatures"),
					),
					docComment: [
						"Compile-time signal type information.\n",
						"This instance property is generated only for TypeScript type checking.",
						"It is not defined at runtime and should not be accessed in JS code.",
					].join("\n"),
				}),
			);
		}
	}

	protected generateConstructorParams(girClass: IntrospectedClass | IntrospectedRecord | IntrospectedInterface) {
		if (girClass.mainConstructor instanceof IntrospectedDirectAllocationConstructor)
			return [this.generateDirectAllocationConstructorParameter(girClass.mainConstructor)];

		if (girClass.mainConstructor instanceof IntrospectedConstructor)
			return this.generateParameters(girClass.mainConstructor.parameters);

		if (girClass.isGObjectObject() || girClass.hasGObjectParent()) {
			const type = factory.createTypeReferenceNode("Partial", [
				factory.createTypeReferenceNode(
					utils.createEntityName(girClass.namespace.namespace, girClass.name, "ConstructorProps"),
				),
			]);

			return [utils.createParameterDeclaration("properties", { optional: true, type }), utils.createAnyArgsParameter()];
		}
	}

	generateClassConstructors(
		girClass: IntrospectedClass | IntrospectedRecord | IntrospectedInterface,
		_indentCount = 1,
	) {
		const constructors: ts.ClassElement[] = [];
		// Constructors
		const params = this.generateConstructorParams(girClass);
		if (params) {
			constructors.push(factory.createConstructorDeclaration(undefined, params, undefined));
		}

		// Don't inject a constructor hook if a stricter index signature is set,
		// as the types may not be compatible.
		let addInitMethod = true;
		if (girClass.__ts__indexSignature) {
			const { indexType, valueType } = girClass.__ts__indexSignature;
			if (indexType !== "string" || valueType !== "any") {
				addInitMethod = false;
			}
		}
		// _init method
		if (addInitMethod) {
			constructors.push(
				utils.createMethodDeclaration("_init", {
					params: [utils.createAnyArgsParameter()],
					returnType: factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword),
				}),
			);
		}

		constructors.push(
			...filterFunctionConflict(girClass.parent, girClass, girClass.constructors, []).flatMap((constructorFunction) =>
				this.generateConstructorFunction(constructorFunction),
			),
		);

		utils.prependInfoComment(constructors, "Constructors");

		return constructors;
	}

	/**
	 * Generate virtual methods with overloads for interfaces that have conflicting signatures.
	 * This is used when an interface can't inherit from Interface namespace due to signature conflicts.
	 * @param girInterface The interface to generate virtual methods for
	 * @param indentCount Indentation level
	 */
	generateVirtualMethodOverloads(girInterface: IntrospectedInterface) {
		// Get all virtual methods from this interface
		const virtualMethods = girInterface.members.filter(
			(m) => m instanceof IntrospectedVirtualClassFunction,
		) as IntrospectedVirtualClassFunction[];

		if (virtualMethods.length === 0) {
			return [];
		}

		// Group virtual methods by name to handle overloads
		const methodsByName = new Map<string, IntrospectedVirtualClassFunction[]>();
		for (const vmethod of virtualMethods) {
			const methods = methodsByName.get(vmethod.name) || [];
			methods.push(vmethod);
			methodsByName.set(vmethod.name, methods);
		}

		const members: ts.MethodSignature[] = [];
		// For each method name, generate overloads
		for (const [methodName, methods] of methodsByName) {
			// Find parent methods with the same name
			const parentMethods: IntrospectedVirtualClassFunction[] = [];

			girInterface.someParent((parent) => {
				const parentVirtualMethods = parent.members.filter(
					(m) => m instanceof IntrospectedVirtualClassFunction && m.name === methodName,
				) as IntrospectedVirtualClassFunction[];
				parentMethods.push(...parentVirtualMethods);
				return false; // Continue searching all parents
			});

			// Generate overloads for all signatures
			const allMethods = [...methods, ...parentMethods];
			const uniqueSignatures = new Map<string, IntrospectedVirtualClassFunction>();

			// Deduplicate by signature
			for (const method of allMethods) {
				const signature = this.printer.printNode(
					ts.EmitHint.Unspecified,
					this.generateMethodSignature(method),
					undefined as unknown as ts.SourceFile,
				);

				if (!uniqueSignatures.has(signature)) {
					uniqueSignatures.set(signature, method);
				}
			}

			// Generate all unique overloads
			for (const method of uniqueSignatures.values()) {
				members.push(this.generateMethodSignature(method, true));
			}
		}

		return utils.prependInfoComment(members, "Virtual methods - generated with overloads due to conflicts");
	}

	/**
	 * Generate a signature string for a virtual method (used for deduplication)
	 */
	protected generateMethodSignature(method: IntrospectedClassFunction, addIgnoreTag = false) {
		const options = this.generateFunctionOptions(method, addIgnoreTag);
		return utils.createMethodSignature(method.name, options);
	}

	generateSignals(girClass: IntrospectedClass) {
		// Create IntrospectedClassFunction instances for the signal methods
		// These represent the GObject signal methods that we want to generate
		const signalFunctions = [
			new IntrospectedClassFunction({
				name: "connect",
				parent: girClass,
				parameters: [],
				return_type: NumberType,
			}),
			new IntrospectedClassFunction({
				name: "connect_after",
				parent: girClass,
				parameters: [],
				return_type: NumberType,
			}),
			new IntrospectedClassFunction({
				name: "emit",
				parent: girClass,
				parameters: [],
				return_type: VoidType,
			}),
		];

		// Filter out signal methods that conflict with existing methods in the class or parent classes
		// For example, if a class already has a connect() method (like Camel.Service), we don't generate
		// the signal connect() method to avoid conflicts
		const filteredFunctions = filterConflicts(girClass.namespace, girClass, signalFunctions, FilterBehavior.DELETE);

		// Get the names of methods that should be kept (non-conflicting)
		const allowedNames = new Set(filteredFunctions.map((f) => f.name));

		// Generate only the non-conflicting type-safe signal methods
		const methods: ts.MethodDeclaration[] = [];

		const signalSignatures = factory.createTypeReferenceNode(
			utils.createEntityName(girClass.namespace.namespace, girClass.name, "SignalSignatures"),
		);
		const typeParams = [
			factory.createTypeParameterDeclaration(
				undefined,
				"K",
				factory.createTypeOperatorNode(ts.SyntaxKind.KeyOfKeyword, signalSignatures),
			),
		];
		const keyType = factory.createTypeReferenceNode("K");
		const connectParams = [
			utils.createParameterDeclaration("signal", { type: keyType }),
			utils.createParameterDeclaration("callback", {
				type: factory.createTypeReferenceNode(this.createGObjectIdentifier("SignalCallback"), [
					factory.createThisTypeNode(),
					factory.createIndexedAccessTypeNode(signalSignatures, keyType),
				]),
			}),
		];

		const untypedConnectParams = [
			utils.createParameterDeclaration("signal", {
				type: factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
			}),
			utils.createParameterDeclaration("callback", utils.createAnyFunctionType()),
		];

		const connectReturnType = factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword);

		const connectMethod = { typeParams, params: connectParams, returnType: connectReturnType };
		const untypedConnectMethod = { params: untypedConnectParams, returnType: connectReturnType };

		if (allowedNames.has("connect")) {
			methods.push(
				// Type-safe overload for known signals
				utils.createMethodDeclaration("connect", connectMethod),
				// Fallback overload for dynamic signals
				utils.createMethodDeclaration("connect", untypedConnectMethod),
			);
		}

		if (allowedNames.has("connect_after")) {
			methods.push(
				// Type-safe overload for known signals
				utils.createMethodDeclaration("connect_after", connectMethod),
				// Fallback overload for dynamic signals
				utils.createMethodDeclaration("connect_after", untypedConnectMethod),
			);
		}

		if (allowedNames.has("emit")) {
			const emitParams = [
				connectParams[0],
				utils.createParameterDeclaration("args", {
					varArgs: true,
					type: factory.createTypeReferenceNode(this.createGObjectIdentifier("GjsParameters"), [
						factory.createIndexedAccessTypeNode(signalSignatures, keyType),
					]),
				}),
			];

			const emitReturnType = factory.createKeywordTypeNode(ts.SyntaxKind.VoidKeyword);

			// Fix: Use a conditional type to extract parameters from the signal signature
			methods.push(
				// Type-safe overload for known signals
				utils.createMethodDeclaration("emit", {
					typeParams,
					params: emitParams,
					returnType: emitReturnType,
				}),
				// Fallback overload for dynamic signals
				utils.createMethodDeclaration("emit", {
					params: [untypedConnectParams[0], utils.createAnyArgsParameter()],
					returnType: emitReturnType,
				}),
			);
		}

		return methods;
	}

	generateClassSignals(girClass: IntrospectedClass) {
		return utils.prependInfoComment(this.generateSignals(girClass), "Signals");
	}

	/**
	 * In Typescript, interfaces and classes can have the same name,
	 * so we use this to generate interfaces with the same name to implement multiple inheritance
	 */
	generateImplementationInterface(girClass: IntrospectedClass | IntrospectedRecord | IntrospectedInterface) {
		const typeParams = this.generateGenericParameters(girClass.generics);
		const resolution = girClass.resolveParents();
		const superType = resolution.extends();
		const ifaceExtends = [
			...(superType ? [superType.node.getType().generate(this)] : []),
			...("implements" in resolution ? resolution.implements().map((i) => i.node.getType().generate(this)) : []),
		];

		// For interfaces: check if we should inherit from Interface namespace or generate method overloads
		let shouldGenerateVirtualMethodOverloads = false;
		if (girClass instanceof IntrospectedInterface) {
			// Check if this interface has virtual methods
			const hasVirtualMethods = girClass.members.some((m) => m instanceof IntrospectedVirtualClassFunction);

			if (hasVirtualMethods) {
				// Check if there are conflicts with parent virtual methods
				const hasConflicts = hasVfuncSignatureConflicts(this.module, girClass);

				if (hasConflicts) {
					// Don't inherit from Interface namespace if there are conflicts
					// We'll generate method overloads instead
					shouldGenerateVirtualMethodOverloads = true;
				} else {
					// No conflicts, inherit from Interface namespace as usual
					// Extract only the generic type names (e.g., "A", "B") from the generic definitions
					const typeNames = girClass.generics
						.map((g) => g.type.identifier) // Use g.type.identifier to get the generic name
						.filter((name) => name && name.length > 0);

					ifaceExtends.push(
						utils.createExpressionWithTypeArguments(utils.createExpression(girClass.name, "Interface"), ...typeNames),
					);
				}
			}
		}

		const members: ts.TypeElement[] = [];

		this.addIndexSignature(girClass, members);

		// Properties
		members.push(
			...utils.prependInfoComment(
				utils.filterProperties(girClass).flatMap((prop) => this.generatePropertySignature(prop)),
				"Properties",
			),
		);

		// Fields
		members.push(
			...utils.prependInfoComment(
				utils.filterFields(girClass).map((field) => this.generateFieldSignature(field)),
				"Fields",
			),
		);

		// Methods
		members.push(
			...utils.prependInfoComment(
				promisifyIfEnabled(this.options, utils.filterMethods(girClass)).map((func) =>
					this.generateMethodSignature(func),
				),
				"Methods",
			),
		);

		// Virtual methods - generate for classes/records always, for interfaces only when there are conflicts
		if (!(girClass instanceof IntrospectedInterface) || shouldGenerateVirtualMethodOverloads) {
			if (shouldGenerateVirtualMethodOverloads && girClass instanceof IntrospectedInterface) {
				// Generate virtual methods with overloads for conflicting signatures
				members.push(...this.generateVirtualMethodOverloads(girClass));
			} else {
				// Generate normal virtual methods
				members.push(
					...utils.prependInfoComment(
						utils.filterVirtualMethods(girClass).map((func) => this.generateMethodSignature(func)),
						"Virtual methods",
					),
				);
			}
		}

		return utils.createInterface(girClass.name, {
			export: this.options.noNamespace,
			typeParams,
			extends: ifaceExtends,
			members,
		});
	}

	protected extends(node: IntrospectedBaseClass) {
		const { module, options } = this;

		if (node.superType) {
			const superType = node.superType.resolveIdentifier(module, options);

			let generated = superType?.generate(this);

			if (!generated) {
				this.log.warn(
					`Unable to resolve type: ${node.superType.name} from ${node.superType.namespace} in ${node.namespace.namespace} ${node.namespace.version}, falling back to GObject.Object`,
				);
				generated = utils.createExpressionWithTypeArguments(utils.createExpression("GObject", "Object"));
			}

			return generated;
		}
	}

	protected implements(node: IntrospectedClass) {
		const { module, options } = this;

		return node.interfaces.map((i) => {
			const identifier = i.resolveIdentifier(module, options);

			const generated: ts.ExpressionWithTypeArguments | undefined = identifier?.generate(this);

			if (!generated) {
				throw new Error(
					`Unable to resolve type: ${i.name} from ${i.namespace} in ${node.namespace.namespace} ${node.namespace.version}`,
				);
			}

			return generated;
		});
	}

	protected addIndexSignature(girClass: IntrospectedBaseClass, members: (ts.TypeElement | ts.ClassElement)[]) {
		if (girClass.__ts__indexSignature) {
			const { indexName, indexType: type, valueType } = girClass.__ts__indexSignature;
			members.push(
				factory.createIndexSignature(
					undefined,
					[utils.createParameterDeclaration(indexName, { type })],
					factory.createTypeReferenceNode(valueType),
				),
			);
		}
	}

	/**
	 * Represents a record, GObject class or interface as a Typescript class
	 */
	generateClassBase(girClass: IntrospectedClass | IntrospectedRecord) {
		const isAbstract = girClass instanceof IntrospectedClass && girClass.isAbstract;
		// TODO: I believe if a record has a constructor, we should not mark it as abstract
		const isOpaque = girClass instanceof IntrospectedRecord && girClass.isPrivate && !girClass.mainConstructor;

		const typeParams = this.generateGenericParameters(girClass.generics);

		const members: ts.ClassElement[] = [];

		// $gtype compatibility
		const gtype = this.createGObjectIdentifier("GType");

		members.push(
			utils.createPropertyDeclaration("$gtype", {
				type: factory.createTypeReferenceNode(gtype, [factory.createTypeReferenceNode(girClass.name)]),
				static: true,
			}),
		);

		this.addIndexSignature(girClass, members);

		// Static Properties
		members.push(
			...utils.prependInfoComment(
				utils.filterProperties(girClass).flatMap((prop) => this.generateProperty(prop)),
				"Properties",
			),
		);

		// $signals property (instance property for type-safe signal access)
		this.addClassSignalsProperty(girClass, members);

		// Static and member Fields
		members.push(
			...utils.prependInfoComment(
				utils.filterStaticFields(girClass).map((field) => this.generateField(field)),
				"Static Fields",
			),
			...utils.prependInfoComment(
				utils.filterFields(girClass).map((field) => this.generateField(field)),
				"Fields",
			),
		);

		// Constructors
		members.push(...this.generateClassConstructors(girClass));

		if (girClass instanceof IntrospectedClass) {
			// Signals
			members.push(...this.generateClassSignals(girClass));
		}

		// Static Methods
		members.push(
			...utils.prependInfoComment(
				utils.filterStaticMethods(girClass).map((func) => this.generateFunction(func)),
				"Static methods",
			),
		);

		// Virtual methods
		members.push(
			...utils.prependInfoComment(
				utils.filterVirtualMethods(girClass).map((func) => this.generateFunction(func)),
				"Virtual methods",
			),
		);

		// Methods
		members.push(
			...utils.prependInfoComment(
				promisifyIfEnabled(this.options, utils.filterMethods(girClass)).map((func) => this.generateFunction(func)),
				"Methods",
			),
		);

		if (girClass instanceof IntrospectedClass) {
			const implementedProperties = girClass.implementedProperties().map((prop) => prop.copy({ parent: girClass }));
			const implementedMethods = girClass
				.implementedMethods(implementedProperties)
				.map((method) => method.copy({ parent: girClass }));

			const generatedImplementedProperties = filterConflicts(
				girClass.namespace,
				girClass,
				implementedProperties,
			).flatMap((m) => m.generate(this)) as ts.PropertyDeclaration[];

			utils.prependInfoComment(generatedImplementedProperties, "Inherited properties");
			members.push(...generatedImplementedProperties);

			const filteredImplMethods = promisifyIfEnabled(
				this.options,
				filterFunctionConflict(girClass.namespace, girClass, implementedMethods, []),
			);
			const generatedImplementedMethods: ts.MethodDeclaration[] = filteredImplMethods.flatMap((m) => m.generate(this));

			utils.prependInfoComment(generatedImplementedMethods, "Inherited methods");
			members.push(...generatedImplementedMethods);
		}

		return utils.createClass(girClass.name, {
			abstract: isAbstract || isOpaque,
			typeParams,
			extends: this.extends(girClass),
			implements: girClass instanceof IntrospectedClass ? this.implements(girClass) : undefined,
			members,
		});
	}

	protected get printer() {
		this._printer = ts.createPrinter({
			removeComments: this.options.noComments,
		});

		return this._printer;
	}

	printStatements(statements: ts.Statement[], referencedFiles?: ts.FileReference[]) {
		let file = factory.createSourceFile(
			statements,
			factory.createToken(ts.SyntaxKind.EndOfFileToken),
			ts.NodeFlags.None,
		);

		if (referencedFiles && referencedFiles.length > 0) {
			file = factory.updateSourceFile(file, file.statements, file.isDeclarationFile, referencedFiles);
		}

		return this.printer.printFile(file);
	}
}

function promisifyIfEnabled(
	options: OptionsGeneration,
	functions: IntrospectedClassFunction[],
): IntrospectedClassFunction[] {
	if (options.promisify) {
		// TODO: Remove this once the type is fixed

		return promisifyFunctions(functions);
	}

	return functions;
}
