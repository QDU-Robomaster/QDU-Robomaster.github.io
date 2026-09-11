---
id: algorithm-testing
title: 测试与回归
slug: /算法组/testing
sidebar_position: 11
---

# 测试与回归

以下命令在 `bsp-webots-autoaim` 根目录执行，使用已经安装 controller 依赖的 Linux 环境。Windows 可在同一个构建容器内执行。

## 配置和启动检查

```bash
python3 tests/config_contract_test.py
python3 tests/launcher_test.py
python3 tests/startup_test.py build/rm_auto_aim
```

| 脚本 | 检查内容 |
| --- | --- |
| `config_contract_test.py` | 模型、同步、标定、生成头文件和预览配置 |
| `launcher_test.py` | 无帧、超时、提前退出和运行错误的处理 |
| `startup_test.py` | 真实程序对非法仿真倍率的处理 |

前两项检查项目文件或启动器逻辑，最后一项需要已编译的程序。这三条命令不需要打开场景。

## 跑一次实际场景

```bash
XR_ARMOR_OPENVINO_DEVICE=AUTO_DETECT \
LIBGL_ALWAYS_SOFTWARE=1 \
python3 run_headless_preview.py \
  --controller build/rm_auto_aim \
  --runtime-sec 40 --sim-flow-rate 0.1 --run-root .vscode-runs
```

脚本加载 world、连接 controller，运行 40 秒后停止。每次运行在 `.vscode-runs/` 下创建记录目录，摘要为 `99_summary.txt`。

通过时应有 `status=PASS`、`runtime_errors=0` 和流水线完成帧。脚本还会检查进程是否提前退出。`detector_frames` 来自运行日志的观测，日志采样时不代表精确总帧数。

启动日志还应明确打印实际 OpenVINO 设备：

```text
ArmorDetector loaded OpenVINO ... device=CPU|GPU|NPU input=640x512
```

## 切换 CPU / GPU / NPU 回归

需要确认某台 Linux 主机上的不同 OpenVINO 设备时，分别强制运行同一个场景：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU ...
XR_ARMOR_OPENVINO_DEVICE=GPU ...
XR_ARMOR_OPENVINO_DEVICE=NPU ...
```

三次测试保持同一模型、world、`sim-flow-rate` 和运行时长。每次至少确认：

```text
模型成功加载到指定 device
→ Detector 有完成帧
→ Tracker / Aimer 正常启动
→ 三路 preview 出首帧
→ runtime_errors=0
```

只测试一个 ONNX 能否 `compile_model()` 不够，因为实际程序还包括前后处理、流水线线程、Tracker 和 Aimer。

设备不可用时应让该次测试失败，不要改成自动模式后把“成功 fallback”当作指定设备通过。

## 目标与空场测试

构建带观测器的程序：

```bash
XR_BUILD_ACCEPTANCE=ON bash docker/entrypoints/build.sh
python3 tests/run_acceptance.py \
  --controller build/rm_auto_aim_acceptance \
  --run-root .vscode-runs/acceptance-01 \
  --case both --runtime-sec 40
```

每次使用新的输出目录。`target` 使用带目标场景，`empty` 在独立目录中生成空场，`both` 依次运行两者。

记录文件包括：

```text
frames.tsv       帧身份、时间戳和几何
detections.tsv   检测结果
tracking.tsv     跟踪结果
commands.tsv     云台命令
firing.tsv       发射信息
referee.tsv      裁判摘要
```

带目标场景还保存 `target-camera.png` 和 `target-corners.png`。各场景结果写入 `result.json`，汇总写入 `result-both.json`。

检查内容包括共享帧身份、时间与顺序、数值有效性、角点、PnP、跟踪和命令；空场还检查误触发。

Debug 构建配合软件渲染时可能明显慢于 Release。如果验收只因为观测帧数不足而失败，先增加 `--runtime-sec`，不要降低帧数门槛。延长后仍达不到要求，再查实际吞吐或卡住的阶段。

一组完整回归应该同时包含带目标和空场：带目标要求检测、跟踪、非零命令等链路成立；空场则应保持零检测或零有效跟踪、零非零命令、零开火请求。

## 记录结果

保存测试命令、BSP 与模块版本、YAML 和模型哈希。回归时保持场景和输入不变，再对比改动前后结果。

这些测试用于检查功能和数据连接。识别精度、位姿误差和动态命中率需要单独的数据与统计。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)。
