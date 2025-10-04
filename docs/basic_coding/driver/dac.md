---
id: dac
title: 数模转换
sidebar_position: 7
---

# DAC（数模转换）

`LibXR::DAC` 提供平台无关的数字转模拟（DAC）接口，用于输出指定的模拟电压。

## 接口定义

```cpp
class DAC {
public:
  DAC() = default;

  // 输出 DAC 电压，单位为伏特（float 类型）
  // Outputs the DAC voltage in volts (float type)
  virtual ErrorCode Write(float voltage) = 0;
};
```

- `Write(voltage)` 是纯虚函数，子类需实现具体的输出逻辑；
- 参数 `voltage` 为需要输出的模拟电压值（单位：V）；
- 返回 `ErrorCode`，用于表示输出过程中的错误或成功状态；

## 典型用法

```cpp
// 示例：输出 1.23V 到 DAC
dac->Write(1.23f);
```
