# Ditox DI CLI Example

This example demonstrates Dependency Injection using Ditox in a simple GJS CLI application.

## Features

- **Factory-based DI**: Uses Ditox's factory functions for dependency injection
- **Functional Approach**: Services are defined as factory functions
- **Type Safety**: Full TypeScript support with automatic type inference
- **CLI Interface**: Easy to run and test without GUI dependencies
- **Command Line Arguments**: Accepts names as arguments for personalized greetings

## How It Works

### 1. Service Definition with Factory Functions

```typescript
// Create tokens for dependency injection
export const LOGGER_TOKEN = token<Logger>("LOGGER");
export const GREETER_TOKEN = token<Greeter>("GREETER");

// Bind logger service as a value
container.bindValue(LOGGER_TOKEN, {
    log: (msg: string) => log(`[Ditox] ${msg}`),
});

// Bind greeter service as a factory
container.bindFactory(
    GREETER_TOKEN,
    injectable(
        (logger: Logger) => ({
            greet: (name: string) => {
                const msg = `Moin, ${name}!`;
                logger.log(`greet() -> ${msg}`);
                return msg;
            },
        }),
        LOGGER_TOKEN,
    ),
);
```

### 2. Container Usage

```typescript
// Create container
const container = createContainer();

// Get service with automatically resolved dependencies
const greeter = container.resolve(GREETER_TOKEN);
```

## Key Features of Ditox

1. **Functional Factories**: Services are defined as factory functions
2. **Token System**: Uses tokens to identify dependencies
3. **Injectable Wrappers**: `injectable()` wraps factories and declares dependencies
4. **Value vs Factory Binding**: Can bind both concrete values and factory functions
5. **Type Safety**: Full TypeScript support with proper type inference

## Running the Example

### Build the example
```bash
yarn run build
```

### Run without arguments (greets "World")
```bash
yarn start
# or
yarn greet
```

### Run with custom name
```bash
yarn greet Diana
# or
gjs -m dist/main.js Diana
```

### Example Output
```
🚀 Ditox DI CLI Example Started
================================
📝 Greeting requested for: Diana

✅ Result: Moin, Diana!

🎯 Additional greetings:
   Moin, Diana!
   Moin, Eva!
   Moin, Felix!

✨ Dependency Injection working perfectly!
   LoggerService was automatically injected into GreeterService
   Ditox container managed all dependencies
```

## Understanding the DI Flow

1. **Token Registration**: Services are identified by tokens
2. **Factory Definition**: Services are defined as factory functions
3. **Dependency Declaration**: `injectable()` declares which dependencies are needed
4. **Container Resolution**: `container.resolve()` resolves all dependencies automatically
5. **Type Safety**: TypeScript ensures all dependencies are correctly typed

## Comparison with Other DI Libraries

- **Needle DI**: Uses decorators (`@injectable`, `@inject`)
- **Brandi**: Uses tokens with `injected()` metadata
- **Ditox**: Uses functional factories with `injectable()` wrappers

This example shows how Ditox's functional approach provides clean and composable dependency injection!
