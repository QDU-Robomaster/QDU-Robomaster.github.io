---
id: core-coding
title: 核心组件
sidebar_position: 1
---

# 核心组件

本章节介绍 LibXR 框架的核心模块，提供跨平台通用的数据类型、错误处理、操作封装、时间工具和终端格式支持等功能，为整个系统提供基础支撑。

## 模块概览

- [`libxr_def`](./core-def.md)：常用宏定义、错误码与基础常量
- [`libxr_assert`](./core-assert.md)：断言机制与致命错误回调
- [`libxr_cb`](./core-cb.md)：类型安全的回调机制
- [`libxr_type`](./core-type.md)：原始数据封装与类型识别
- [`libxr_string`](./core-string.md)：固定长度安全字符串
- [`libxr_color`](./core-color.md)：终端输出格式与 ANSI 控制
- [`libxr_time`](./core-time.md)：微秒/毫秒级时间戳与时间差
- [`libxr_rw`](./core-rw.md)：通用读写接口与操作封装

各模块将在后续页面中展开详细介绍。
