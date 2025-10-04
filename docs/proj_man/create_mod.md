---
id: proj-man-create-mod
title: 快速创建模块
sidebar_position: 2
---

# 快速创建模块

XRobot 提供了模块生成工具 `xrobot_create_mod`，可以从模板快速创建模块目录结构、标准头文件和 README 文档，适合新手快速上手模块开发。

---

## 1. 创建一个模块

只需一句命令：

```bash
xrobot_create_mod MySensor --desc "IMU interface module" --hw imu scl sda
```

输出如下：

```bash
[OK] Module MySensor generated at Modules/MySensor
```

你将获得如下结构：

```bash
Modules/
└── MySensor/
    ├── MySensor.hpp        # 含 MANIFEST 的模块头文件
    ├── README.md           # 自动生成的模块说明文档
    ├── CMakeLists.txt      # 构建配置
    └── .github/workflows/build.yml # GitHub 自动测试
```

---

## 2. 查看模块信息

创建后可通过 `xrobot_mod_parser` 查看模块结构：

```bash
xrobot_mod_parser --path ./Modules/MySensor/
```

输出示例：

```bash
=== Module: MySensor.hpp ===
Description       : IMU interface module

Constructor Args  :
Required Hardware : imu, scl, sda
Depends           : None
```

---

## 3. MANIFEST 格式说明

头文件中的模块描述信息位于 `/* === MODULE MANIFEST === */` 注释块中，格式如下：

```yaml
/* === MODULE MANIFEST V2 ===
module_description: IMU interface module
constructor_args: []
template_args: []
required_hardware:
  - imu
  - scl
  - sda
depends: []
=== END MANIFEST === */
```

MANIFEST 是模块元信息的核心来源，**生成主函数、文档、依赖树等都基于此内容**。

---

## 4. 更多参数选项

你还可以添加构造参数、模板参数、依赖模块等：

```bash
xrobot_create_mod PIDController   --desc "A generic PID controller"   --hw input output   --constructor kp=1.0 ki=0.2 kd=0.0   --template T=float   --depends MySensor
```

---

## 5. 构造参数与模板参数说明

- `--constructor kp=1.0 ki=0.2` 会自动写入 MANIFEST 和 README
- `--template T=float` 支持模块模板参数
- 所有字段都支持自动类型推断（int、float、bool）

---

## 6. CMake 与 CI 配置

生成的模块自动包含：

- 可被包含进 `Modules/CMakeLists.txt` 的构建脚本
- 支持 GitHub Actions 自动构建的 `build.yml`

这些默认模板可以根据需要手动修改。
