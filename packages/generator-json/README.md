<p align="center">
  <img src="https://raw.githubusercontent.com/gjsify/ts-for-gir/main/.github/ts-for-gir.png" />
  <h1 align="center">TS <small>for</small> GIR</h1>
</p>

<p align="center">
  <img src="https://img.shields.io/github/actions/workflow/status/gjsify/ts-for-gir/ci.yml" />
  <img src="https://img.shields.io/github/license/gjsify/ts-for-gir" />
  <img src="https://img.shields.io/npm/v/@ts-for-gir/generator-json" />
  <img src="https://img.shields.io/npm/dw/@ts-for-gir/generator-json" />
</p>

<p align="center">TypeScript type definition generator for GObject introspection GIR files</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/gjsify/ts-for-gir/main/.github/feeling.gif" />
</p>

# JSON Generator

JSON output generator for `ts-for-gir`. This package provides an alternative output format that serializes the processed GIR data into structured JSON instead of TypeScript definitions.

## Purpose

The JSON generator serves as an alternative output format for the `ts-for-gir` toolchain, enabling:

- **Data Export**: Export processed GIR data in a structured, machine-readable format
- **Analysis Tools**: Provide input for external analysis and processing tools
- **Documentation**: Generate structured documentation data from GIR files
- **Integration**: Enable integration with other tools and languages beyond TypeScript

## Features

- **Complete Type Serialization**: Converts all TypeScript type expressions to JSON format
- **Structured Output**: Organizes data into logical categories (classes, interfaces, functions, etc.)
- **Metadata Preservation**: Maintains documentation, deprecation info, and other metadata
- **Type System Mapping**: Maps complex TypeScript types to JSON representations

## JSON Structure

The generator produces JSON with the following structure:

```json
{
  "kind": "namespace",
  "name": "ModuleName",
  "version": "1.0",
  "imports": {},
  "classes": [...],
  "interfaces": [...],
  "functions": [...],
  "enums": [...],
  "constants": [...],
  "records": [...],
  "callbacks": [...],
  "errors": [...]
}
```

## Type Representations

Types are serialized with a consistent structure:

- **Identifiers**: `{ "kind": "identifier", "namespace": "...", "name": "..." }`
- **Arrays**: `{ "kind": "array", "type": {...}, "depth": 1 }`
- **Unions**: `{ "kind": "or", "types": [...] }`
- **Tuples**: `{ "kind": "tuple", "types": [...] }`
- **Nullable**: `{ "kind": "null", "type": {...} }`
- **Native**: `{ "kind": "native", "type": "string" }`

## Node Types

Each element includes metadata:

```json
{
  "kind": "class|interface|function|...",
  "name": "ElementName",
  "doc": "Documentation string",
  "metadata": {...},
  "private": false,
  ...
}
```

## Usage

This package is used internally by the ts-for-gir CLI when JSON output is requested. It implements the standard Generator interface defined in `@ts-for-gir/generator-base`.

The JSON output can be useful for:
- Building documentation websites
- Creating API analysis tools
- Generating bindings for other languages
- Data processing and transformation pipelines
- IDE integration and tooling

## Integration

The JSON generator integrates with the ts-for-gir ecosystem through:
- **Reporter System**: Comprehensive logging and error reporting
- **Generator Interface**: Standard lifecycle methods (start, generate, finish)
- **Type System**: Full compatibility with ts-for-gir type representations
- **Configuration**: Respects all standard ts-for-gir options and settings
