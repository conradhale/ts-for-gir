# DexFileManager

A small experiment with Dex (libdex) in GJS/TypeScript. We played around with Dex a bit to see what works and what doesn't.

## What is this?

A simple command-line tool that shows how to use Dex and GIO together. We use Dex for a few operations that work, and GIO for the rest.

## What does it do?

The tool:
- Creates a working directory
- Creates a few test files
- Copies a file
- Lists all files
- Shows file contents
- Cleans everything up

## The promisifyDexFuture Method

This is the interesting part! Dex uses "Futures" instead of Promises, but we wanted to use async/await. So we wrote a helper function:

```typescript
export function promisifyDexFuture<T>(
    future: Dex.Future,
    expectedType: "boolean" | "boxed" | "int" | "string" | /* ... */
): Promise<T>
```

**How does it work?**
1. We get a Dex Future (e.g., from `Dex.file_copy()`)
2. We check the Future's status regularly
3. When the Future is done, we extract the result
4. We return a normal Promise

**Why do we need this?**
- Dex.await only works in Dex Fibers
- But we want to write normal async/await code
- So we turn Dex Futures into normal Promises

## What works with Dex?

- `Dex.file_make_directory()` - Creating directories
- `Dex.file_copy()` - Copying files

## What works better with GIO?

- Listing directories
- Reading/writing file contents
- Deleting files

## Installation & Start

```bash
yarn install
yarn start
```

## Conclusion

Dex is interesting, but not everything works as expected. With our `promisifyDexFuture` function, we can at least experiment with it a bit and use async/await.

That's it! A simple experiment to see what's possible with Dex.
