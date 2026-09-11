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
| 桌面设备设置 | `XR_ARMOR_OPENVINO_DEVICE=CPU` |

该模型不需要额外的 NCHW 转置或归一化。

在 Detector 配置中选择：

```yaml
network:
  model: {expr: ArmorDetectorModel::OPENVINO_640X512}
```

枚举决定模型文件、输出适配和后端。Runtime 或指定设备缺失时，初始化会报错。

## 解码与过滤

输出包括颜色、编号和四角点，角点顺序按 `[0,3,2,1]` 转换。`network.logit_threshold` 过滤原始 objectness logit，`min_confidence` 过滤最终置信度。

后续执行 NMS、语义过滤、四边形检查和 PnP。这个 OpenVINO 版本没有独立的数字二次分类器。

结果发布与坐标转换见[自瞄链路](/算法组/pipeline)。

## 检查模型文件

这份模型的 SHA-256：

```text
d33f2141fcd019690eaed53c171381cda52dc816d8485eedd8a6f503c52aebb8
```

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

源码：[模型说明](https://github.com/QDU-Robomaster/ArmorDetector/blob/7eb9598decd84c9c04352a51a845cf544de2cf0a/README.md)、[OpenVINO 实现](https://github.com/QDU-Robomaster/ArmorDetector/blob/7eb9598decd84c9c04352a51a845cf544de2cf0a/ArmorDetectorOpenVino.hpp)。
