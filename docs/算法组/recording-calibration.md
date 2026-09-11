---
id: algorithm-recording-calibration
title: 数据记录与标定
slug: /算法组/recording-calibration
sidebar_position: 9
---

# 数据记录与标定

Linux BSP 的采集配置是 `User/RunConfig/vision_capture.yaml`，运行相机、同步、通信和 VisionCapture，不创建 Detector、Tracker、Aimer。

## 选择模式

| `mode` | 功能 |
| --- | --- |
| `record` | 保存同步图像和元数据 |
| `calibrate_camera` | 采样、求解相机内参 |
| `calibrate_handeye` | 保存手眼标定样本，目前不求解外参 |
| `calibrate` | 相机内参标定的旧名称 |

`record` 配合 `camera_calibration.enabled: true` 也会进入内参标定。仓库里的 `vision_capture.yaml` 就是这个组合。普通记录时关闭该开关，并检查 `record.enabled`、保存图像和保存元数据的选项。

修改 YAML 后重新生成和编译。

## 记录文件

输出位置由 `output_dir` 和 `session_name` 决定。普通记录的文件结构：

```text
<output_dir>/<session_name>/
  samples.csv
  frame_geometry.csv
  frames/
  frame_layout.txt
  camera_calibration.txt
  frame_geometry.txt
  camera_info.txt
```

`samples.csv` 保存图像、IMU 时间戳和采样信息；`frame_geometry.csv` 保存逐帧 ROI、下采样、翻转和采样相位。`camera_info.txt` 是供旧工具使用的派生信息。

当前图像目录为 `frames/`，旧说明中的 `images/` 对应较早版本。

相机和 IMU 时间戳分别保存。处理 CSV 时保留它们各自的时钟来源。

## 相机内参

标定模式使用 GShang 25 mm、8×6 标定板和 ArUco original 字典。程序检查清晰度、标记点和视角差异，保存合适的样本，再求解内参。

输出目录：

```text
runs/camera_calib/<timestamp>_<session>_<marker>mm_<cols>x<rows>/
```

成功后可看到 `calibration.yml`、`views.csv`、`quality_report.txt` 和 `camera_info_snippet.txt`。配置片段包含 FrameLayout 与原生 CameraCalibration。

写回 YAML 前检查原生尺寸、焦距、主点、畸变和重投影误差。质量检查失败时不会生成可直接使用的配置片段。

## 手眼采样

`calibrate_handeye` 使用已有 K/D 求 PnP，同时检查图像、IMU 姿态和运动稳定性，保存原始 IMU。求解外参需另用对应工具。

Tracker 接收的外参位于 `cfg.extrinsic.camera_mount_to_body`，表示安装系到算法本体系的变换，旋转顺序为 wxyz，平移单位 m。坐标定义见[相机与同步](/算法组/camera-pipeline)。

## 文件回放

CaptureFileCamera 支持 raw 内录包和历史视频。

raw 内录包需要三个路径：`file_path` 指向帧 bin，`frame_csv_path` 指向索引 CSV，`imu_csv_path` 指向 IMU CSV。

帧索引：

```text
frame_index,camera_timestamp_us,offset_bytes,size_bytes[,codec]
```

IMU CSV：

```text
timestamp_us,qw,qx,qy,qz,gx,gy,gz,ax,ay,az
```

四元数顺序为 wxyz，角速度单位 rad/s，加速度单位 m/s²。raw 帧大小要与配置的布局一致。

历史视频使用空的 `frame_csv_path`，由 `file_path` 和配套 IMU 文件回放。`replay_speed` 调整速度，`loop` 控制是否循环。

VisionCapture 的图像目录与这种 bin 索引格式不同，回放前需要准备对应格式的文件。默认 YAML 中的历史录像路径也需要替换成自己已有的数据。

源码：[VisionCapture](https://github.com/QDU-Robomaster/VisionCapture/blob/ec0ac456785c9b813d27d9489dc6f706f64ce1ad/README.md)、[CaptureFileCamera](https://github.com/QDU-Robomaster/CaptureFileCamera/blob/7ea66e8847d65c490b189eaf1048504b604baec5/README.md)。
