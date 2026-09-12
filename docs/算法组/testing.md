---
id: algorithm-testing
title: 测试与回归
slug: /算法组/testing
sidebar_position: 11
---

# 测试与回归

测试按“基础检查 → Webots 场景 → 端到端验收”三层进行。Windows 在开发容器中执行，Linux 可直接在本机执行。

## 基础检查

```bash
python3 tests/config_contract_test.py
python3 tests/launcher_test.py
python3 tests/startup_test.py build/rm_auto_aim
```

| 脚本 | 检查内容 |
| --- | --- |
| `config_contract_test.py` | 模型、同步、标定、生成头文件和预览配置 |
| `launcher_test.py` | 无帧、超时、提前退出和运行错误 |
| `startup_test.py` | controller 对非法仿真倍率的处理 |

前两项不启动 Webots；`startup_test.py` 需要已经编译好的 controller。

## 场景冒烟测试

```bash
XR_ARMOR_OPENVINO_DEVICE=AUTO_DETECT \
LIBGL_ALWAYS_SOFTWARE=1 \
python3 run_headless_preview.py \
  --controller build/rm_auto_aim \
  --runtime-sec 40 --sim-flow-rate 0.1 --run-root .vscode-runs
```

脚本会启动 world 和 controller，运行一段时间后自动退出。每次结果保存在 `.vscode-runs/` 下，对应目录中的 `99_summary.txt` 给出摘要。

正常结果至少包含：

```text
status=PASS
runtime_errors=0
```

同时应看到 Detector 持续处理帧。启动日志中的这一行可以确认实际使用的 OpenVINO 设备：

```text
ArmorDetector loaded OpenVINO ... device=CPU|GPU|NPU input=640x512
```

## 推理设备回归

比较 CPU、GPU、NPU 时，固定同一模型、world、`sim-flow-rate` 和运行时长，只改变推理设备：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU ...
XR_ARMOR_OPENVINO_DEVICE=GPU ...
XR_ARMOR_OPENVINO_DEVICE=NPU ...
```

每次看五件事：模型是否加载到指定设备、Detector 是否持续出帧、Tracker / Aimer 是否正常运行、三路预览是否出首帧、`runtime_errors` 是否为 0。

裸 ONNX 能被 `compile_model()` 加载只能说明 Runtime 接受模型；完整回归还要经过图像前处理、推理线程、后处理、Tracker 和 Aimer。

## 端到端验收

构建带观测器的 controller：

```bash
XR_BUILD_ACCEPTANCE=ON bash docker/entrypoints/build.sh
python3 tests/run_acceptance.py \
  --controller build/rm_auto_aim_acceptance \
  --run-root .vscode-runs/acceptance-01 \
  --case both --runtime-sec 40
```

`target` 跑带目标场景，`empty` 跑空场，`both` 依次执行两者。每次使用新的输出目录，便于和上一轮结果对比。

记录文件包括：

```text
frames.tsv       帧身份、时间戳和几何
detections.tsv   检测结果
tracking.tsv     跟踪结果
commands.tsv     云台命令
firing.tsv       发射信息
referee.tsv      裁判摘要
```

带目标场景还会保存 `target-camera.png` 和 `target-corners.png`。单个场景结果写入 `result.json`，`both` 的汇总写入 `result-both.json`。

带目标场景用于确认检测、跟踪、PnP、非零云台命令和开火链路；空场用于确认系统不会自行产生有效目标、非零命令或开火请求。

Debug + 软件渲染的速度可能明显低于 Release。帧数不足时先延长 `--runtime-sec`，再判断是吞吐不足还是某个阶段停住。

## 保存回归基线

回归记录至少保留测试命令、BSP 与模块版本、运行 YAML、模型哈希，以及对应的 `result.json` / `99_summary.txt`。

这些测试覆盖功能连接和运行稳定性。识别精度、位姿误差、动态命中率等性能指标需要单独的数据集和统计方法。

源码：[bsp-webots-autoaim](https://github.com/QDU-Robomaster/bsp-webots-autoaim)。
