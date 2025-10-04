---
id: stm32-code-gen-flash
title: Flash数据库
sidebar_position: 1
---

# Flash数据库

在上一步代码生成后，会出现`User/flash_map.hpp`，该文件记录了STM32的Flash地址映射表，格式如下：

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

## 创建Flash对象

第一个参数是Flash地址映射表，第二个参数是flash的总扇区数，第三个是数据库的起始扇区编号，第三个参数可以省略，默认取最后两个扇区。

```cpp
  // app_main.cpp
  /* User Code Begin 3 */
  STM32Flash flash(FLASH_SECTORS， FLASH_SECTOR_NUMBER);
```

## 创建数据库对象

对于STM32F1/F4等型号，使用DatabaseRaw。模板参数代表了flash的最小写入粒度。

```cpp
LibXR::DatabaseRaw<4> database(flash);
```

对于STM32G4/L4等flash不支持逆序写入的型号，请使用DatabaseRawSequential。第二个参数为可选，代表最大缓冲区大小。

```cpp
LibXR::DatabaseRawSequential database(flash, 128);
```

## 创建数据库键值

模板参数为键值存储的数据类型，第二个参数为键名，第三个参数为默认值。键值可自动转换成对应的类型，也可通过key.data_获取原始数据。

```cpp
Database::Key<uint32_t> key1(database, "key1", 0);
```

## 写入数据库

```cpp
key1.set(key1.data_ + 1);
```
