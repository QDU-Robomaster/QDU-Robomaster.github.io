---
id: algorithm-models-data
title: 模型与数据
slug: /算法组/models-data
sidebar_position: 10
---

# 模型与数据

桌面仿真使用 `ArmorDetectorModel::OPENVINO_640X512`，模型文件在 `Modules/QDU-Robomaster/ArmorDetector/model/armor_detector_640x512.onnx`。

## 模型格式

| 项目 | 格式 |
| --- | --- |
| Runtime | OpenVINO |
| 输入 | RGB，uint8，`[512, 640, 3]` |
| 输出 | float32，`[1, 20160, 22]` |
| 前处理 | 拉伸到 640×512，BGR 转 RGB |
| 推理设备选择 | `XR_ARMOR_OPENVINO_DEVICE` |

模型直接接收 RGB uint8 输入，前处理完成尺寸调整和 BGR → RGB。

## 推理设备

OpenVINO 从 `available_devices` 中选择推理设备。可以显式指定：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU
XR_ARMOR_OPENVINO_DEVICE=GPU
XR_ARMOR_OPENVINO_DEVICE=NPU
```

也可以使用自动选择：

```bash
XR_ARMOR_OPENVINO_DEVICE=AUTO_DETECT
```

省略该变量时同样使用自动选择，优先级为：

```text
NPU → GPU → CPU
```

自动模式只考虑 OpenVINO 能枚举到的设备。显式指定设备时不会做 fallback，启动日志会给出最终使用的设备：

```text
ArmorDetector loaded OpenVINO ... device=<DEVICE> input=640x512
```

设备名也可以是 OpenVINO 提供的具体实例名，例如 `GPU.0`。

设备切换后再跑一次完整 Webots 流水线。`compile_model()` 只验证模型能被 Runtime 加载，前后处理、Tracker、Aimer 和预览仍需要实际运行。

在 Detector 配置中选择：

```yaml
network:
  model: ArmorDetectorModel::OPENVINO_640X512
```

模型枚举同时决定模型文件、输出适配和推理后端。

## 后处理

输出包括颜色、编号和四角点，角点顺序按 `[0,3,2,1]` 转换。`network.logit_threshold` 过滤原始 objectness logit，`min_confidence` 过滤最终置信度。

解码后依次执行 NMS、语义过滤、四边形检查和 PnP。OpenVINO 路径直接使用网络输出的编号结果。

结果发布与坐标转换见[自瞄链路](/算法组/pipeline)。

## 模型校验

跨机器核对模型时直接计算文件哈希：

Linux：

```bash
sha256sum Modules/QDU-Robomaster/ArmorDetector/model/armor_detector_640x512.onnx
```

PowerShell：

```powershell
Get-FileHash .\Modules\QDU-Robomaster\ArmorDetector\model\armor_detector_640x512.onnx -Algorithm SHA256
```

提交新模型时保留文件哈希、训练与导出来源、输入输出格式和前后处理说明，便于对照代码。

## 数据与评测

仓库包含推理代码和模型文件；训练脚本和训练集由训练流程单独管理。

回放使用的视频、IMU、标定和帧几何应配套。文件格式见[数据记录与标定](/算法组/recording-calibration)。

比较模型时使用相同测试集，记录分辨率、设备、Runtime 版本和处理设置。识别精度与推理耗时分别统计；Webots 的仿真倍率不用于衡量模型速度。

源码：[ArmorDetector](https://github.com/QDU-Robomaster/ArmorDetector)。
