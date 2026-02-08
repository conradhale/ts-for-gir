import {
	APP_NAME,
	APP_SOURCE,
	DependencyManager,
	type GirModule,
	IntrospectedClass,
	type IntrospectedNamespaceMember,
	type IntrospectedRecord,
	type NSRegistry,
	type OptionsGeneration,
	promisifyNamespaceFunctions,
} from "@ts-for-gir/lib";
import ts, { factory } from "typescript";
import { GObjectClassGenerator } from "./gobject-class-generator.ts";
import { ModuleGeneratorBase } from "./module-generator-base.ts";
// import { PackageDataParser } from './package-data-parser.ts'
import { NpmPackage } from "./npm-package.ts";
import { override as overrideGLib } from "./overrides/glib.ts";
import { override as overrideGObject } from "./overrides/gobject.ts";
import { TemplateProcessor } from "./template-processor.ts";
import * as utils from "./utils.ts";

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

export class ModuleGenerator extends ModuleGeneratorBase {
	dependencyManager: DependencyManager;
	// packageData?: PackageDataParser

	_gobjectClassGenerator?: GObjectClassGenerator;
	_classesNamespace?: ts.Identifier;

	/**
	 * @param _config The config to use without the override config
	 */
	constructor(module: GirModule, options: OptionsGeneration, registry: NSRegistry) {
		// this.packageData = new PackageDataParser(this.options)
		const girModule = module;
		const moduleTemplateProcessor = new TemplateProcessor(
			{
				name: girModule.namespace,
				namespace: girModule.namespace,
				version: girModule.version,
				importName: girModule.importName,
				girModule,
			},
			girModule.packageName,
			registry,
			girModule.transitiveDependencies,
			options,
		);

		super(module, options, ModuleGenerator.name, module.namespace, moduleTemplateProcessor);

		this.dependencyManager = DependencyManager.getInstance(options);
	}

	get gobjectClassGenerator() {
		if (!this._gobjectClassGenerator) {
			this._gobjectClassGenerator = new GObjectClassGenerator(this.module, this.options, this.moduleTemplateProcessor);
		}
		return this._gobjectClassGenerator;
	}

	get classesNamespace() {
		if (!this._classesNamespace) {
			this._classesNamespace = factory.createIdentifier(this.gobjectClassGenerator.namespace);
		}
		return this._classesNamespace;
	}

	generateClass(girClass: IntrospectedClass | IntrospectedRecord) {
		const statements: ts.Statement[] = [];
		this.addClassNamespace(girClass, statements);

		if (girClass instanceof IntrospectedClass && (girClass.isGObjectObject() || girClass.hasGObjectParent())) {
			this.gobjectClassGenerator.generateClass(girClass);

			const type = factory.createTypeReferenceNode(this.createGObjectIdentifier("RegisteredClass"), [
				factory.createTypeReferenceNode("Opts"),
				factory.createTypeReferenceNode(utils.createEntityName(girClass.name, "SignalSignatures")),
			]);

			const modifiers = girClass.isAbstract ? utils.createModifiers(ts.SyntaxKind.AbstractKeyword) : undefined;

			const genericParameters = this.generateGenericParameters(girClass.generics);

			const genericParams = [
				...genericParameters,
				factory.createTypeParameterDeclaration(
					undefined,
					"Opts",
					factory.createTypeReferenceNode(this.createGObjectIdentifier("MetaInfo")),
					factory.createTypeLiteralNode(undefined),
				),
			];

			const genericArgs = girClass.generics.map((generic) => factory.createTypeReferenceNode(generic.type.identifier));

			const constructorType = factory.createConstructorTypeNode(
				modifiers,
				genericParams,
				this.generateConstructorParams(girClass) ?? [],
				factory.createIntersectionTypeNode([
					type,
					factory.createTypeReferenceNode(utils.createEntityName(this.classesNamespace, girClass.name), genericArgs),
				]),
			);

			statements.push(
				utils.createTypeAlias(girClass.name, {
					type: factory.createIndexedAccessTypeNode(
						factory.createTypeQueryNode(utils.createEntityName(this.classesNamespace, girClass.name), genericArgs),
						factory.createLiteralTypeNode(factory.createStringLiteral("prototype")),
					),
					typeParams: genericParameters,
					export: this.options.noNamespace,
				}),
			);
			statements.push(
				utils.createConst(girClass.name, {
					type: factory.createIntersectionTypeNode([
						factory.createTypeQueryNode(utils.createEntityName(this.classesNamespace, girClass.name)),
						constructorType,
					]),
					export: this.options.noNamespace,
				}),
			);
		} else {
			const classDeclaration = this.generateClassBase(girClass);
			statements.push(utils.addGirDocComment(classDeclaration, girClass.doc));
		}

		return statements;
	}

	/**
	 * Wraps content in module declarations for ModuleDeclaration format
	 */
	private wrapInModuleDeclaration(statements: ts.Statement[], girModule: GirModule): ts.Statement[] {
		const { namespace: name, version } = girModule.dependency;

		const moduleName = `gi://${name}`;
		const versionedNamespaceName = `${name}${girModule.dependency.version.split(".")[0].replace(/[^A-z0-9_]/g, "_")}`;
		const versionedModuleName = `${moduleName}?version=${girModule.dependency.version}`;

		const versionedNamespace = utils.createModule(versionedNamespaceName, { statements, namespace: true });

		const versionedModule = utils.createModule(versionedModuleName, {
			statements: [versionedNamespace, factory.createExportDefault(versionedNamespace.name)],
			declare: true,
			docComment: `${name} ${version}\n\nGenerated from ${girModule.package_version.join(".")}`,
		});

		const module = utils.createModule(moduleName, {
			statements: [factory.createExportDeclaration(undefined, false, undefined, versionedModule.name)],
			declare: true,
		});

		return [versionedModule, module];
	}

	/**
	 * Generates a module declaration (similar to DtsModuleGenerator)
	 */
	async generateModuleDeclaration(node: GirModule): Promise<string | null> {
		try {
			this.log.debug(`Resolving the types of ${node.namespace}...`);

			const statements = await this.generateModule(node);
			if (!statements) {
				this.log.reportGenerationFailure(node.namespace, new Error("Failed to generate module"), "Module Declaration");
				return null;
			}
			const mod = this.wrapInModuleDeclaration(statements, node);
			const text = this.printStatements(mod);

			return text;
		} catch (err) {
			this.log.reportGenerationFailure(node.namespace, err as Error, "Module Declaration");
			return null;
		}
	}

	/**
	 * Generates inline DTS content (similar to DtsInlineGenerator)
	 */
	async generateInline(node: GirModule): Promise<string | null> {
		try {
			this.log.debug(`Resolving the types of ${node.namespace}...`);

			const { namespace: name, version } = node.dependency;

			const headerComment = `${name} ${version}\n\n Generated from ${node.package_version.join(".")}`;

			const header = utils.addJSDocComment(factory.createEmptyStatement(), headerComment);
			const statements = await this.generateModule(node);
			if (!statements) {
				this.log.reportGenerationFailure(node.namespace, new Error("Failed to generate inline content"), "DTS Inline");
				return null;
			}

			this.log.debug(`Printing ${node.namespace}...`);

			return this.printStatements([header, ...statements]);
		} catch (err) {
			this.log.reportGenerationFailure(node.namespace, err as Error, "DTS Inline");
			return null;
		}
	}

	async exportModuleIndexJS(): Promise<void> {
		const template = "index.js";
		const target = "index.js";

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.create(template, this.options.outdir, target);
		} else {
			const { append, prepend } = await this.moduleTemplateProcessor.load(template);
			this.log.log(append + prepend);
		}
	}

	async exportModuleIndexTS(): Promise<void> {
		const template = "index.d.ts";
		const target = "index.d.ts";

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.create(template, this.options.outdir, target);
		} else {
			const { append, prepend } = await this.moduleTemplateProcessor.load(template);
			this.log.log(append + prepend);
		}
	}

	async exportModuleJS(girModule: GirModule): Promise<void> {
		const template = "module.js";
		const target = `${girModule.importName}.js`;

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.create(template, this.options.outdir, target);
		} else {
			const { append, prepend } = await this.moduleTemplateProcessor.load(template);
			this.log.log(append + prepend);
		}
	}

	async exportModuleAmbientTS(girModule: GirModule): Promise<void> {
		const template = "module-ambient.d.ts";
		const target = `${girModule.importName}-ambient.d.ts`;

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.create(template, this.options.outdir, target);
		} else {
			const { append, prepend } = await this.moduleTemplateProcessor.load(template);
			this.log.log(append + prepend);
		}
	}

	protected async exportModuleAmbientJS(girModule: GirModule): Promise<void> {
		const template = "module-ambient.js";
		const target = `${girModule.importName}-ambient.js`;

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.create(template, this.options.outdir, target);
		} else {
			const { append, prepend } = await this.moduleTemplateProcessor.load(template);
			this.log.log(append + prepend);
		}
	}

	protected async exportModuleImportTS(girModule: GirModule): Promise<void> {
		const template = "module-import.d.ts";
		const target = `${girModule.importName}-import.d.ts`;

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.create(template, this.options.outdir, target);
		} else {
			const { append, prepend } = await this.moduleTemplateProcessor.load(template);
			this.log.log(append + prepend);
		}
	}

	protected async exportModuleImportJS(girModule: GirModule): Promise<void> {
		const template = "module-import.js";
		const target = `${girModule.importName}-import.js`;

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.create(template, this.options.outdir, target);
		} else {
			const { append, prepend } = await this.moduleTemplateProcessor.load(template);
			this.log.log(append + prepend);
		}
	}

	async exportModuleTS(): Promise<void> {
		const { module } = this;
		const explicitTemplate = `${module.importName}.d.ts`;
		const target = explicitTemplate;

		const typesTarget = `${module.importName}-types.d.ts`;
		let moduleStatements = await this.generateModule(module);

		if (!moduleStatements) {
			this.log.error("Failed to generate gir module");
			return;
		}

		const comment = [
			"Type Definitions for Gjs (https://gjs.guide/)",
			"These type definitions are automatically generated, do not edit them by hand.",
			`If you found a bug fix it in \`${APP_NAME}\` or create a bug report on ${APP_SOURCE}`,
			"The based EJS template file is used for the generated.d.ts file of each GIR module like Gtk - 4.0, GObject - 2.0, ...",
		].join("\n\n");

		const statements: ts.Statement[] = [utils.addJSDocComment(factory.createEmptyStatement(), comment)];

		// Extra interfaces if a template with the module name  (e.g. '../templates/gobject-2-0.d.ts') is found
		// E.g. used for GObject-2.0 to help define GObject classes in js;
		// these aren't part of gi.
		if (await this.moduleTemplateProcessor.exists(explicitTemplate)) {
			const { append, prepend } = await this.moduleTemplateProcessor.load(explicitTemplate);

			if (this.options.outdir) {
				await this.moduleTemplateProcessor.write(prepend + append, this.options.outdir, typesTarget);
			} else {
				this.log.log(prepend + append);
			}

			statements.push(
				factory.createImportDeclaration(undefined, undefined, factory.createStringLiteral(`./${typesTarget}`)),
			);
		}

		for (const dependency of module.transitiveDependencies) {
			this.addModuleImport(dependency, statements);
		}

		const referencedFiles: ts.FileReference[] = [];

		if (!this.options.noNamespace) {
			const ns = utils.createModule(module.namespace, { statements: moduleStatements, export: true, namespace: true });
			moduleStatements = [ns, factory.createExportDefault(ns.name)];
		}

		if (this.options.package) {
			statements.push(
				factory.createImportDeclaration(
					undefined,
					undefined,
					factory.createStringLiteral(module.dependencyManager.getGjs().importPath),
				),
			);
		} else {
			for (const dependency of module.transitiveDependencies) {
				if (module.packageName === dependency.packageName) {
					continue;
				}
				if (!dependency.exists) {
					continue;
				}
				referencedFiles.push({
					fileName: `./${dependency.importName}.d.ts`,
					pos: -1,
					end: -1,
				});

				if (dependency.packageName === "cairo-1.0") {
					referencedFiles.push({
						fileName: `./cairo.d.ts`,
						pos: -1,
						end: -1,
					});
				}
			}

			moduleStatements = [...this.wrapInModuleDeclaration(moduleStatements, module)];
		}

		if (this._gobjectClassGenerator) {
			this._gobjectClassGenerator.exportModuleTS(referencedFiles);

			statements.push(
				factory.createImportDeclaration(
					undefined,
					factory.createImportClause(ts.SyntaxKind.TypeKeyword, this.classesNamespace, undefined),
					factory.createStringLiteral(`./${this._gobjectClassGenerator.targetFile}`),
				),
			);

			statements.push(
				factory.createExportDeclaration(
					undefined,
					false,
					factory.createNamedExports([
						factory.createExportSpecifier(false, this.classesNamespace, `${module.namespace}Classes`),
					]),
					undefined,
				),
			);
		}

		statements.push(...moduleStatements);

		// Output is always an array now
		const text = this.printStatements(statements, referencedFiles);

		if (this.options.outdir) {
			await this.moduleTemplateProcessor.write(text, this.options.outdir, target);
		} else {
			this.log.log(text);
		}
	}

	async generateModule(girModule: GirModule): Promise<ts.Statement[]> {
		const statements: ts.Statement[] = [];

		statements.push(utils.addJSDocComment(factory.createEmptyStatement(), girModule.packageName));

		if (this.options.promisify) {
			promisifyNamespaceFunctions(girModule);
		}

		// Apply overrides BEFORE generating members so noEmit() takes effect
		if (!this.options.noAdvancedVariants && girModule.namespace === "GLib") {
			overrideGLib(girModule);
			// The override function has already called noEmit() on the classes
		} else if (girModule.namespace === "GObject") {
			overrideGObject(girModule);
			// The override function has already called noEmit() on the classes
		}

		if (girModule.members) {
			for (const m of girModule.members.values()) {
				statements.push(
					...(Array.isArray(m) ? m : [m])
						.flatMap((m) => (m as IntrospectedNamespaceMember) ?? [])
						.filter((m) => m.emit)
						.flatMap((m) => m.generate(this)),
				);
			}
		}

		// Properties added to every GIRepositoryNamespace
		// https://gitlab.gnome.org/GNOME/gjs/-/blob/master/gi/ns.cpp#L186-190
		statements.push(
			utils.createConst("__name__", {
				type: factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				docComment: "Name of the imported GIR library",
				docTags: [
					{
						tag: "see",
						comment: "https://gitlab.gnome.org/GNOME/gjs/-/blob/master/gi/ns.cpp#L188",
					},
				],
			}),
			utils.createConst("__version__", {
				type: factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				docComment: "Version of the imported GIR library",
				docTags: [
					{
						tag: "see",
						comment: "https://gitlab.gnome.org/GNOME/gjs/-/blob/master/gi/ns.cpp#L189",
					},
				],
			}),
		);

		// Add the override suffix after generating members
		return Promise.resolve(statements);
	}

	/**
	 * Generates a module as a single string (DTS compatibility)
	 */
	async generateModuleString(girModule: GirModule): Promise<string> {
		const statements = await this.generateModule(girModule);

		return this.printStatements(statements);
	}

	async exportModule(_registry: NSRegistry, girModule: GirModule) {
		// Used for package.json and local ambient mode
		await this.exportModuleTS();

		if (this.options.package) {
			await this.exportModuleJS(girModule);

			await this.exportModuleIndexTS();
			await this.exportModuleIndexJS();

			await this.exportModuleAmbientTS(girModule);
			await this.exportModuleAmbientJS(girModule);

			await this.exportModuleImportTS(girModule);
			await this.exportModuleImportJS(girModule);

			const pkg = new NpmPackage(
				this.options,
				this.dependencyManager,
				_registry,
				girModule,
				girModule.transitiveDependencies,
			);
			await pkg.exportNPMPackage();
		}
	}
}
