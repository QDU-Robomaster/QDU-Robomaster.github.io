---
id: ramfs
title: In-Memory File System
sidebar_position: 6
---

# RamFS In-Memory File System

`RamFS` is a lightweight in-memory file system module provided by LibXR. It supports unified management of files, directories, and device nodes, and is suitable for file access and debugging simulations in embedded systems.

---

## Main Features

- Organized using a red-black tree structure for files and directories;
- Supports read-only, read-write, and executable file types;
- Supports device nodes that bind to `ReadPort` / `WritePort`;
- Supports recursive search of files, directories, and devices;
- Type-safe data access for all files;
- All data resides entirely in memory, ideal for runtime construction and simulation.

---

## Core Structures

### FsNode

The base class for all nodes, with a unified interface:

- `name`: node name
- `type`: node type (FILE / DIR / DEVICE)
- `parent`: parent directory

### File

Created using `CreateFile()`, supporting:

- Read-only (`READ_ONLY`)
- Read-write (`READ_WRITE`)
- Executable (`EXEC`): has a `Run(argc, argv)` method

### Dir

Directory class supports adding and finding:

- Add: `Add(file)`, `Add(dir)`, `Add(device)`
- Find: `FindFile(name)`, `FindDir(name)`, `FindDevice(name)`, and their recursive variants with `Rev`

### Device

Device class supports binding to `ReadPort` / `WritePort`, and accessing data through `Read()` / `Write()` methods.

---

## Usage Example

```cpp
RamFS fs;

int counter = 0;

// Create executable file (increments counter each time it's run)
auto exec_file = RamFS::CreateFile<int*>(
  "runme",
  [](int* arg, int argc, char** argv) {
    UNUSED(argc);
    UNUSED(argv);
    (*arg)++;
    return 0;
  },
  &counter
);

// Create read/write file
auto data_file = RamFS::CreateFile("value", counter);

// Create directory and device
auto dir = RamFS::CreateDir("mydir");
auto dev = RamFS::Device("mydev");

// Build file system structure
fs.Add(data_file);  // Add to root directory
fs.Add(dir);
dir.Add(exec_file);
dir.Add(dev);

// Run exec file multiple times and verify count
for (int i = 1; i <= 5; ++i) {
  exec_file->Run(0, nullptr);
  ASSERT(data_file->GetData<int>() == i);
}
```

---

## Interface Overview

### RamFS File System Interface

| Method | Description |
|--------|-------------|
| `CreateFile(name, data)` | Create a read-only or read-write file |
| `CreateFile(name, exec, arg)` | Create an executable file |
| `CreateDir(name)` | Create a directory |
| `Add(file/dir/dev)` | Add node to root directory |
| `FindFile(name)` | Recursively search for a file |
| `FindDir(name)` | Search for a directory |
| `FindDevice(name)` | Search for a device |

### File Interface

| Method | Description |
|--------|-------------|
| `Run(argc, argv)` | Run executable file (only for EXEC type) |
| `GetData<T>()` | Get a type-safe reference to file data |

### Dir Interface

| Method | Description |
|--------|-------------|
| `Add(node)` | Add a file, directory, or device |
| `FindFile(name)` | Find file in current directory |
| `FindFileRev(name)` | Recursively find file |
| `FindDir(name)` | Find subdirectory |
| `FindDirRev(name)` | Recursively find directory |
| `FindDevice(name)` | Find device |
| `FindDeviceRev(name)` | Recursively find device |

### Device Interface

| Method | Description |
|--------|-------------|
| `Read(op, data)` | Read data |
| `Write(op, data)` | Write data |

---

## Application Scenarios

- Simulate file systems in embedded platforms;
- Virtual file access in debug mode;
- Build temporary config, log, or parameter nodes in memory;
- Simulate input/output interfaces of devices;

---

## Unit Test Reference

See [`test_ramfs.cpp`] for coverage of:

- Executable file execution
- Type-safe data access
- Adding and finding files, directories, and devices
