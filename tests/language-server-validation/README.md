# GVariant Type Validation Tests

This package provides focused validation tests for TypeScript type generation of GLib.Variant methods, particularly addressing issues from [PR #279](https://github.com/gjsify/ts-for-gir/pull/279).

## Purpose

Tests the correct TypeScript type generation for `GLib.Variant` methods, focusing on:

- **Tuple Parsing**: Ensuring tuples like `(ii)` are correctly parsed
- **Type Inference**: Validating return types of `unpack()`, `deepUnpack()`, and `recursiveUnpack()`
- **Advanced Variant Types**: Testing with and without the `noAdvancedVariants` option
- **Real-world Patterns**: DBus and GSettings usage patterns

## Test Focus

### Critical Issue from PR #279

```typescript
type Infer<T extends string> = ReturnType<GLib.Variant<T>["unpack"]>
type IntTuple = Infer<"(ii)">; // Should be [Variant<"i">, Variant<"i">]
```

### Method Behavior

According to GJS documentation:
- `unpack()`: Returns shallow unpacked values (Variant[] for arrays/tuples)
- `deepUnpack()`: Returns one level deep unpacked values  
- `recursiveUnpack()`: Returns fully unpacked native JS types

## Running Tests

```bash
# Generate types and run tests
yarn test

# Watch mode for development
yarn test:watch

# Quick test run without regenerating types
yarn test:dev
```

## Test Structure

All tests are in `src/gvariant-validation.test.ts`:

1. **Critical Issue: Tuple Parsing** - Tests for the specific issue from PR #279
2. **Unpacking Method Type Inference** - Validates different unpacking methods
3. **Advanced Variant Types** - Tests with/without `noAdvancedVariants`
4. **Real-world Usage Patterns** - DBus and GSettings patterns

## Development

When adding new tests:
1. Focus on actual GVariant type generation issues
2. Use realistic GJS code examples
3. Document expected vs actual behavior
4. Include console.log for debugging type inference

## Related

- [PR #279](https://github.com/gjsify/ts-for-gir/pull/279) - Advanced Variant Types implementation
- `tests/types-no-advanced-variants/` - Example showing legacy behavior
- `@ts-for-gir/language-server` - Core validation utilities