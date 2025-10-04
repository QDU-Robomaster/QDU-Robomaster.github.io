---
id: database
title: Flash Database
sidebar_position: 5
---

# Database Flash Storage

LibXR provides two lightweight embedded key-value database implementations: `DatabaseRawSequential` and `DatabaseRaw<N>`.  
Both inherit from the abstract interface class `Database`, and are designed for embedded Flash or other sequential-write storage media. They support primary-backup redundancy, power failure protection, type-safe encapsulation, and adaptation to different storage alignment constraints.

---

## Main Features

- Supports primary/backup block redundancy and verification, with automatic recovery after power loss;
- Provides a unified interface `Database` and template wrapper `Database::Key<T>`, enabling type-safe read/write;
- Two implementation modes:
  - `DatabaseRawSequential`: sequential write, supports arbitrary data length;
  - `DatabaseRaw<N>`: page-aligned write, suitable for NOR Flash and similar media requiring write alignment;
- All data operations use `Save()` to write and `Restore()` to clear, supporting a full recovery workflow.

---

## Usage Example

### Create a Database Object

```cpp
LinuxBinaryFileFlash<2048> flash("/tmp/flash.bin", 512, 8);
Database& db = *(new DatabaseRawSequential(flash));
```

Or use the page-aligned version:

```cpp
LinuxBinaryFileFlash<2048> flash2("/tmp/flash2.bin", 512, 16);
Database& db = *(new DatabaseRaw<16>(flash2));
```

### Define Type-Safe Keys

```cpp
int value = 42;
Database::Key<int> key(db, "my_key", value);

// Write new value
key = 123;

// Load value back into variable
key.Load();
printf("value = %d\n", static_cast<int>(key));
```

---

## Type-Safe Wrapper: Key

The template class `Database::Key<T>` provides type-safe key-value encapsulation. It attempts to load the key's value from the database during construction; if the key doesn't exist, it adds a new one.

```cpp
struct Config { uint32_t baudrate; uint8_t mode; };
Database::Key<Config> cfg(db, "uart_cfg", {9600, 1});

// Write config
cfg = {115200, 0};

// Load config
cfg.Load();
```

- Supports all **plain-old-data (POD) types** that are memory-flattenable (e.g., structs, arrays, primitives);
- Assignment `key = value` automatically updates the database;
- Use `key.Load()` to explicitly refresh content from the database.

---

## Method Overview (Base Interface)

The following methods are provided by the abstract interface `Database` and its template class `Key<T>`:

| Method/Operation                     | Description                                                  |
|-------------------------------------|--------------------------------------------------------------|
| `Database::Add(KeyBase&)`           | Add a key (only called if the key does not exist in the DB) |
| `Database::Set(KeyBase&, RawData)`  | Update key content, requires same name and size             |
| `Database::Get(KeyBase&)`           | Load key value from database into memory                    |
| `Key<T>::Set(const T&)`             | Set key value and write to database                         |
| `Key<T>::Load()`                    | Load key value from database into variable                  |
| `Key<T>::operator=(const T&)`       | Set key value (equivalent to `Set()`)                       |
| `Key<T>::operator T()`              | Type conversion operation, returns current variable value   |

---

## Overview of Operation Mechanism

Despite differences in underlying mechanisms, all implementations follow the same design principles:

- Alternate writes between primary and backup blocks to ensure recoverability;
- Store all key-value pairs in serialized name-value format with checksums;
- `Init()` automatically detects valid blocks and attempts recovery;
- `Restore()` actively clears primary and backup data to initialize an empty database;
- Each derived class handles page alignment and space management internally — users do not need to worry about it.

---

## Notes

- Prefer using the `Database::Key<T>` wrapper for read/write operations;
- Writing only occurs when calling `key = val` or `key.Set(val)`;
- All key-value data types must be POD and copy-storable;
- If storage is full or write fails, `Set()` will return an error code;
- If manually releasing the database, ensure to delete the derived class pointer.

---

## Application Scenarios

- Parameter storage for embedded devices;
- Persistent storage of state checkpoints;
- Configuration persistence across multiple modules;
- Safe key-value storage in memory-constrained environments;

---

## Example Tests

See [`test_database.cpp`] for complete examples demonstrating key-value read/write, struct support, and power-loss recovery scenarios.
