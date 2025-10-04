---
id: core-string
title: Fixed-Length String
sidebar_position: 5
---

# Fixed-Length String

`LibXR::String<N>` is a template class designed for fixed-length strings. It supports safe construction, comparison, search, appending, and more, making it suitable for resource-constrained embedded environments.

## Feature Overview

- **Fixed Length**: The maximum length is specified via the template parameter `MaxLength`. Internally, it uses `std::array<char, MaxLength+1>` and is always null-terminated (`\0`).
- **Safe Operations**: Most methods include boundary checks and assertions to prevent out-of-bounds access.
- **C-Style String Compatible**: Supports construction from `const char*` or strings with a specified length. The `Raw()` method retrieves the underlying string.
- **Appending and Searching**: Supports `+=` for appending and `Find()` for substring search.
- **Full Comparison Operators**: Supports `==`, `!=`, `<`, `>`, `<=`, `>=`, including comparisons between different `String<N>` lengths.

## Usage Example

```cpp
LibXR::String<32> s1("hello");
s1 += " world";
int idx = s1.Find("lo");  // returns 3
auto sub = s1.Substr<5>(6);  // extracts 5 characters starting from index 6
```

## API Reference

### Constructors

- `String()` – Constructs an empty string.
- `String(const char* str)` – Constructs from a C-style string.
- `String(const char* str, size_t len)` – Constructs from a string with a specified length.

### Basic Methods

- `const char* Raw() const` – Returns the underlying C-style string.
- `size_t Length() const` – Returns the current string length.
- `void Clear()` – Clears the string.
- `int Find(const char* str) const` – Finds the position of a substring; returns -1 if not found.
- `template <unsigned int SubStrLength> String<SubStrLength> Substr(size_t pos) const` – Extracts a substring starting at a given position.

### Operators

- `+=` – Appends a C-style string.
- `[]` – Accesses characters by index (with boundary assertion).
- Comparison operators – `==`, `!=`, `<`, `>`, `<=`, `>=` are supported across `String<N>` of different lengths.
