---
id: flash
title: Flash Interface
sidebar_position: 9
---

# Flash (Flash Interface)

`LibXR::Flash` provides a cross-platform abstract interface for accessing flash memory, supporting block erase and write operations. It is suitable for non-volatile storage devices such as NOR/NAND Flash, EEPROM, and NVS.

## Interface Definition

```cpp
class Flash {
public:
  Flash(size_t min_erase_size, size_t min_write_size, RawData flash_area);

  // Erase the specified region (starting offset and length)
  virtual ErrorCode Erase(size_t offset, size_t size) = 0;

  // Write data to the specified offset
  virtual ErrorCode Write(size_t offset, ConstRawData data) = 0;

  // Read data from the specified offset
  virtual ErrorCode Read(size_t offset, RawData data) = 0;

  // Get the minimum erasable block size
  size_t MinEraseSize() const { return min_erase_size_; }

  // Get the minimum writable block size
  size_t MinWriteSize() const { return min_write_size_; }

  // Get the size of the flash
  size_t Size() const { return flash_area_.size_; }
};

```

## Usage Notes

- All writes must be aligned to `min_write_size_`, and erases to `min_erase_size_`;  
- `flash_area_` points to the actual memory region or flash-mapped address used for storage;  
- This interface can be used as a foundation for implementing parameter storage, file systems, log management, and more.
