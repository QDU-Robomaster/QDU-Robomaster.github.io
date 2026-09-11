---
id: algorithm-models-data
title: 模型与数据
slug: /算法组/models-data
sidebar_position: 10
---

# 模型与数据

桌面仿真使用 `ArmorDetectorModel::OPENVINO_640X512`，模型文件在 `Modules/ArmorDetector/model/armor_detector_640x512.onnx`。

## 输入输出

| 项目 | 格式 |
| --- | --- |
| Runtime | OpenVINO |
| 输入 | RGB，uint8，`[512, 640, 3]` |
| 输出 | float32，`[1, 20160, 22]` |
| 前处理 | 拉伸到 640×512，BGR 转 RGB |
| 推理设备选择 | `XR_ARMOR_OPENVINO_DEVICE` |

该模型不需要额外的 NCHW 转置或归一化。

## 选择 OpenVINO 设备

当前实现从 OpenVINO 的 `available_devices` 中选择设备。可以显式指定：

```bash
XR_ARMOR_OPENVINO_DEVICE=CPU
XR_ARMOR_OPENVINO_DEVICE=GPU
XR_ARMOR_OPENVINO_DEVICE=NPU
```

也可以使用自动选择：

```bash
XR_ARMOR_OPENVINO_DEVICE=AUTO_DETECT
```

不设置该变量时同样进入自动选择。当前优先级为：

```text
NPU → GPU → CPU
```

自动模式只在 OpenVINO 实际枚举出的设备中选择。显式指定某个设备时，编译模型失败会直接报错，不会再尝试其他设备。因此部署时应检查启动日志中的：

```text
ArmorDetector loaded OpenVINO ... device=<DEVICE> input=640x512
```

设备名也可以是 OpenVINO 提供的具体实例名，例如 `GPU.0`。

裸模型能够在某个设备上 `compile_model()` 并不等于整条自瞄链路已经验证。更换设备后仍应至少跑一次 Webots 流水线，确认 Detector、Tracker、Aimer 和预览都正常工作。

在 Detector 配置中选择：

```yaml
network:
  model: {expr: ArmorDetectorModel::OPENVINO_640X512}
```

枚举决定模型文件、输出适配和后端。Runtime 或指定设备缺失时，初始化会报错。

## 解码与过滤

输出包括颜色、编号和四角点，角点顺序按 `[0,3,2,1]` 转换。`network.logit_threshold` 过滤原始 objectness logit，`min_confidence` 过滤最终置信度。

后续执行 NMS、语义过滤、四边形检查和 PnP。当前 OpenVINO 路径没有独立的数字二次分类器。

结果发布与坐标转换见[自瞄链路](/算法组/pipeline)。

## 检查模型文件

需要确认两台机器上的模型是否为同一份文件时，直接计算哈希，不在文档里固定某个哈希值。

Linux：

```bash
sha256sum Modules/ArmorDetector/model/armor_detector_640x512.onnx
```

PowerShell：

```powershell
Get-FileHash .\Modules\ArmorDetector\model\armor_detector_640x512.onnx -Algorithm SHA256
```

提交新模型时保留文件哈希、训练与导出来源、输入输出格式和前后处理说明，便于对照代码。

## 数据与评测

仓库提供推理代码和模型文件，这套文档尚未提供配套训练脚本和训练集。

回放使用的视频、IMU、标定和帧几何应配套。文件格式见[数据记录与标定](/算法组/recording-calibration)。

比较模型时使用相同测试集，记录分辨率、设备、Runtime 版本和处理设置。识别精度与推理耗时分别统计；Webots 的仿真倍率不用于衡量模型速度。

源码：[ArmorDetector](https://github.com/QDU-Robomaster/ArmorDetector)。
