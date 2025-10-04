---
id: core-assert
title: Assertions and Error Handling
sidebar_position: 2
---

# Assertions and Error Handling

This module provides runtime error checking, fatal error handling, and size validation during debugging. At its core are the `LibXR::Assert` class and the `ASSERT` / `ASSERT_ISR` macros, often used together with `libxr_def`.

## Fatal Error Handling Interface

```cpp
void libxr_fatal_error(const char *file, uint32_t line, bool in_isr);
```

This function is used to terminate program execution and can be called from both normal and interrupt contexts. It is automatically invoked on assertion failure and can be handled via callbacks registered with the `Assert` class.

## `LibXR::Assert` Class

Used to register fatal error callbacks and perform size checks in debug mode.

### Registering Callbacks

```cpp
LibXR::Assert::RegisterFatalErrorCB(cb);
```

Accepts any function or object of type `Callback<const char*, uint32_t>` to handle fatal error events.

### Size Limit Checks

Enabled in debug mode (with `LIBXR_DEBUG_BUILD` defined):

```cpp
template <SizeLimitMode mode>
static void SizeLimitCheck(size_t limit, size_t size);
```

Supports three modes:

- `EQUAL`: size must be equal to the limit  
- `MORE`: size must be greater than or equal to the limit  
- `LESS`: size must be less than or equal to the limit  

This function is a no-op in release builds.

## Macros: Assertion Checks

- `ASSERT(expr)`: Regular context assertion; calls `libxr_fatal_error(...)` on failure  
- `ASSERT_ISR(expr)`: ISR context assertion

These macros are enabled or disabled by `LIBXR_DEBUG_BUILD` and are recommended for defensive programming during development.

## Usage Example

```cpp
auto err_cb = LibXR::Assert::Callback::Create(
    [](bool in_isr, Arg arg, const char *file, uint32_t line)
    {
    // do something
    },
    arg);

LibXR::Assert::RegisterFatalErrorCB(err_cb);
ASSERT(buffer != nullptr);
ASSERT_ISR(interrupt_flag == true);
```

---

This module forms the foundation for all debugging and safety mechanisms in LibXR. It is strongly recommended to integrate and enable assertions and validations early in system development.
