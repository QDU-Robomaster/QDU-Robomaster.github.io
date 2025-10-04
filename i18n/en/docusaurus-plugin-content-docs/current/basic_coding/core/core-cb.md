---
id: core-callback
title: General Callback
sidebar_position: 3
---

# General Callback

This module provides a lightweight and ISR-safe general callback system, including the `Callback` and `CallbackBlock` template classes, commonly used for asynchronous notifications, event handling, and error callbacks.

## CallbackBlock

```cpp
template <typename ArgType, typename... Args>
class CallbackBlock;
```

Used to encapsulate a specific callback function and its first bound argument, supporting safe invocation in ISR context:

- `FunctionType`: Callback function signature: `void(bool in_isr, ArgType arg, Args... args)`.
- `Call(bool in_isr, Args&&...)`: Executes the callback, passing extra arguments.

Binding is completed during construction. Supports move construction and assignment, copy is disabled.

## Callback

```cpp
template <typename... Args>
class Callback;
```

A further abstraction of `CallbackBlock`, providing a unified interface, type erasure, and factory methods:

### Creating a callback

```cpp
LibXR::Callback<Args...> cb = LibXR::Callback<Args...>::Create(fun, bound_arg);
```

- `fun`: Callback function in the form `void(bool, BoundArgType, Args...)`
- `bound_arg`: The first argument bound to the callback

### Running a callback

```cpp
cb.Run(in_isr, arg1, arg2, ...);
```

Any number of additional arguments can be passed. `in_isr` indicates if the call is within an interrupt context.

### Other interfaces

- `Empty()`: Checks if the callback is empty
- Supports default constructor, copy constructor, move constructor, and assignment

## Example Usage

```cpp
void OnEvent(bool in_isr, int context, const char* msg) {
  printf("ISR=%d context=%d msg=%s\n", in_isr, context, msg);
}

auto cb = LibXR::Callback<const char*>::Create(OnEvent, 42);
cb.Run(false, "Hello");
```

Output:

```bash
ISR=0 context=42 msg=Hello
```

## Design Features

- **No dynamic memory required**: Unless a custom CallbackBlock subclass is created
- **ISR-safe**: Can be safely called within interrupts
- **Type-safe encapsulation**: Uses templates and type deduction for argument binding
- **Embedded friendly**: Extremely lightweight and resource-efficient

---

This module serves as the foundation of LibXR's asynchronous mechanism and callback interface. It's suitable for use in IO, timers, event dispatch, and other callback-based modules.
