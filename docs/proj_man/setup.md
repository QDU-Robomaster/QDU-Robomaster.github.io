---
id: proj-man-setup
title: 一键配置
sidebar_position: 5
---

# 一键配置

XRobot 提供了自动化工具 `xrobot_setup`，用于完成以下任务的一键配置：

- 检查配置文件是否存在（modules.yaml / sources.yaml）
- 拉取所有模块仓库
- 自动生成主函数代码（xrobot_main.hpp）
- 生成构建配置（Modules/CMakeLists.txt）

---

## 1. 快速开始

只需一句命令：

```bash
$ xrobot_setup
Starting XRobot auto-configuration...
[INFO] Created default Modules/modules.yaml
Please edit this file; each line should be a full module name like:
  - xrobot-org/BlinkLED
  - your-namespace/YourModule@dev
[INFO] Created default Modules/sources.yaml
Please configure sources index.yaml for official or custom/private mirrors.
Default official source already included.

$ xrobot_setup
Starting XRobot auto-configuration...
[EXEC] xrobot_init_mod --config Modules/modules.yaml --directory Modules --sources Modules/sources.yaml
[INFO] Cloning new module: xrobot-org/BlinkLED
Cloning into 'Modules/BlinkLED'...
remote: Enumerating objects: 37, done.
remote: Counting objects: 100% (37/37), done.
remote: Compressing objects: 100% (25/25), done.
remote: Total 37 (delta 11), reused 33 (delta 10), pack-reused 0 (from 0)
Receiving objects: 100% (37/37), 7.48 KiB | 2.49 MiB/s, done.
Resolving deltas: 100% (11/11), done.
[SUCCESS] All modules and their dependencies processed.
[INFO] Created default Modules/CMakeLists.txt: Modules/CMakeLists.txt
[EXEC] xrobot_gen_main --output User/xrobot_main.hpp
Discovered modules: BlinkLED
[INFO] Successfully parsed manifest for BlinkLED
[INFO] Writing configuration to User/xrobot.yaml
[SUCCESS] Generated entry file: User/xrobot_main.hpp

All done! Main function generated at: User/xrobot_main.hpp
```

---

## 2. 自动完成的操作

| 步骤 | 说明 |
|------|------|
| 初始化配置文件 | 自动生成 `Modules/modules.yaml` 与 `sources.yaml`（如不存在） |
| 拉取模块 | 调用 `xrobot_init_mod` 下载 modules.yaml 中的所有模块仓库 |
| 生成主函数 | 调用 `xrobot_gen_main` 根据 xrobot.yaml 生成主函数头文件 |
| 构建配置生成 | 自动生成 `Modules/CMakeLists.txt` 并包含所有模块构建文件 |

---

## 3. 默认文件结构

运行后将得到：

```bash
Modules/
├── BlinkLED/
│   ├── BlinkLED.hpp
│   ├── CMakeLists.txt
├── modules.yaml
├── sources.yaml
├── CMakeLists.txt  <-- 自动生成的全局模块构建入口

User/
├── xrobot.yaml      <-- 模块实例配置
├── xrobot_main.hpp  <-- 自动生成主函数入口
```

---

## 4. 自定义配置路径（可选）

你可以通过参数手动指定配置路径：

```bash
xrobot_setup --config User/xrobot.yaml
```
