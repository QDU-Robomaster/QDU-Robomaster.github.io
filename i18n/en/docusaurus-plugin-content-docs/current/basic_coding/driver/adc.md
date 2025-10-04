---
id: adc
title: Analog-to-Digital Conversion
sidebar_position: 6
---

# ADC (Analog-to-Digital Conversion)

`LibXR::ADC` provides a platform-independent interface for analog-to-digital conversion (ADC), used to read analog input voltage values. It is suitable for applications such as voltage monitoring and sensor data acquisition.

## Interface Definition

```cpp
class ADC {
public:
  ADC() = default;

  // Reads the ADC voltage value in volts (float type)
  virtual float Read() = 0;
};
```

- `Read()` is a pure virtual function, and must be implemented by subclasses to provide specific sampling logic;  
- The return value is typically within the range of 0 to 3.3V, or other ranges supported by the chip;  
