---
id: adc
title: 模数转换
sidebar_position: 6
---

# ADC（模数转换）

`LibXR::ADC` 提供平台无关的模拟数字转换（ADC）接口，用于读取模拟输入电压值，适用于电压检测、传感器读取等应用场景。

## 接口定义

```cpp
class ADC {
public:
  ADC() = default;

  // 读取 ADC 电压值，单位为伏特（float 类型）
  virtual float Read() = 0;
};
```

- `Read()` 是纯虚函数，子类需实现具体的采样逻辑；
- 返回值通常为 0 ~ 3.3V 或芯片支持的其他范围；
