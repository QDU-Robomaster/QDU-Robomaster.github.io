---
id: dac
title: Digital-to-Analog Conversion
sidebar_position: 7
---

# DAC (Digital-to-Analog Conversion)

`LibXR::DAC` provides a platform-independent interface for digital-to-analog conversion (DAC), used to output a specific analog voltage.

## Interface Definition

```cpp
class DAC {
public:
  DAC() = default;

  // Outputs the DAC voltage in volts (float type)
  virtual ErrorCode Write(float voltage) = 0;
};
```

- `Write(voltage)` is a pure virtual function, and must be implemented by derived classes;
- The `voltage` parameter specifies the analog output value in volts;
- Returns `ErrorCode`, indicating success or failure of the operation;

## Example Usage

```cpp
// Example: Output 1.23V to the DAC
dac->Write(1.23f);
```
