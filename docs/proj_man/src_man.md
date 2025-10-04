---
id: proj-man-source-man
title: 模块仓库源管理
sidebar_position: 0
---

# 模块仓库源管理

XRobot 项目中，模块功能通常以“模块仓库”的形式分布在多个 Git 仓库中。官方提供了默认的模块源，但为了支持 **私有模块、自定义组件、内网镜像或加速服务**，你可以自定义多个模块源（Source）。

本页将介绍 XRobot 的多源模块仓库管理机制及命令行工具 `xrobot_src_man` 的用法，帮助你灵活配置、聚合和查找模块仓库。

---

## 为什么需要模块源管理？

- ✅ 网络访问官方仓库缓慢？你可以添加镜像源或内网加速源。
- ✅ 有内部模块？你可以添加私有 index.yaml 文件并独立命名空间。
- ✅ 避免模块命名冲突？每个源拥有独立 namespace，模块互不影响。
- ✅ 模块升级或迁移？支持同名模块来自不同来源，灵活选择优先级。

---

## 基础概念

| 名称 | 说明 |
|------|------|
| **模块源（Source）** | 一个 `index.yaml` 文件，描述若干模块仓库的列表，绑定命名空间（namespace） |
| **sources.yaml** | 用户本地的模块源列表，包含多个 `index.yaml` 的地址、优先级等信息 |
| **index.yaml** | 单个源的模块列表和命名空间定义文件，可托管在公网或本地 |

---

## 一、快速上手：使用官方模块源

无需配置，默认使用官方源：[xrobot-modules/index.yaml](https://xrobot-org.github.io/xrobot-modules/index.yaml)。

### 创建 sources.yaml 模板

```bash
xrobot_src_man create-sources
```

### 查看当前所有可用模块

```bash
xrobot_src_man list
```

输出示例：

```bash
Available modules:
  xrobot-org/BlinkLED   source: https://xrobot-org.github.io/xrobot-modules/index.yaml (actual namespace: xrobot-org)
```

---

## 二、添加私有模块源

你可以为项目添加自定义 `index.yaml`，用于包含私有模块或镜像仓库。

### 1. 创建 sources.yaml 并加入多个源

```bash
xrobot_src_man create-sources --output Modules/sources.yaml
```

然后编辑该文件：

```yaml
sources:
  - url: https://xrobot-org.github.io/xrobot-modules/index.yaml
    priority: 0
  - url: https://your-domain.com/private-index.yaml
    priority: 1
```

### 2. 本地添加私有源（本地路径也支持）

```bash
xrobot_src_man add-source ./Modules/my-index.yaml --priority 1
```

---

## 三、镜像/内网加速支持

某些 index.yaml 支持指定 `mirror_of` 字段，表示该源是另一个源的镜像，例如：

```yaml
namespace: your-team
mirror_of: xrobot-org
modules:
  - https://git.your-company.com/BlinkLED.git
  - https://git.your-company.com/MySensor.git
```

---

## 四、创建与维护自定义 index.yaml

你可以创建并维护自己的 `index.yaml` 文件，便于组织私有模块。

### 1. 创建 index.yaml 模板

```bash
xrobot_src_man create-index --output Modules/my-index.yaml --namespace yourns
```

如需标记为镜像：

```bash
xrobot_src_man create-index --output my-index.yaml --namespace yourns --mirror-of xrobot-org
```

### 2. 向 index.yaml 添加模块仓库

```bash
xrobot_src_man add-index https://github.com/yourorg/MyModule.git --index Modules/my-index.yaml
```

---

## 五、模块查询与验证

你可以查询任意模块来源和地址：

### 查询所有模块

```bash
xrobot_src_man list
```

### 获取某模块的地址及来源

```bash
xrobot_src_man get yourns/MyModule
```

### 查找模块在所有源中的位置（包括镜像）

```bash
xrobot_src_man find yourns/MyModule
```
