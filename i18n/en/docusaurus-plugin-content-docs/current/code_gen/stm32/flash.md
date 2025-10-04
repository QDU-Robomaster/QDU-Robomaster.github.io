---
id: stm32-code-gen-flash
title: Flash Database
sidebar_position: 1
---

# Flash Database

After code generation, a file named `User/flash_map.hpp` will be created. This file defines the STM32 flash sector layout, with a format similar to:

```cpp
#pragma once
// Auto-generated Flash Layout Map
// MCU: STM32F407IGH6

#include "main.h"
#include "stm32_flash.hpp"

constexpr LibXR::FlashSector FLASH_SECTORS[] = {
  {0x08000000, 0x00004000},
  {0x08004000, 0x00004000},
  {0x08008000, 0x00004000},
  {0x0800C000, 0x00004000},
  {0x08010000, 0x00010000},
  {0x08020000, 0x00020000},
  {0x08040000, 0x00020000},
  {0x08060000, 0x00020000},
  {0x08080000, 0x00020000},
  {0x080A0000, 0x00020000},
  {0x080C0000, 0x00020000},
  {0x080E0000, 0x00020000},
};

constexpr size_t FLASH_SECTOR_NUMBER = sizeof(FLASH_SECTORS) / sizeof(LibXR::FlashSector);
```

---

## Creating a Flash Object

The first parameter is the Flash address mapping table, the second parameter is the total number of flash sectors, and the third parameter is the starting sector index for the database. The third parameter is optional and defaults to the last two sectors.

```cpp
  // app_main.cpp
  /* User Code Begin 3 */
  STM32Flash flash(FLASH_SECTORS， FLASH_SECTOR_NUMBER);
```

---

## Creating a Database Object

For STM32F1/F4 series devices, use `DatabaseRaw`. The template parameter indicates the flash write granularity in bytes.

```cpp
LibXR::DatabaseRaw<4> database(flash);
```

For chips like STM32G4/L4 that do not support reverse overwrite in flash, use `DatabaseRawSequential`. The second parameter (optional) specifies the maximum buffer size.

```cpp
LibXR::DatabaseRawSequential database(flash, 128);
```

---

## Creating a Database Key

The first template argument is the data type stored in the key. The second is the key name, and the third is the default value. Keys can be implicitly cast to their value type or accessed via `key.data_`.

```cpp
Database::Key<uint32_t> key1(database, "key1", 0);
```

---

## Writing to the Database

```cpp
key1.set(key1.data_ + 1);
```
