/* 链上每个节点的说明：共用模块（两边同一份代码，各读各的配置）和两端换掉的适配模块。
   数据取自两个 BSP 仓库的配置和站里的文档：
   - 实车 bsp-linux-autoaim  User/RunConfig/hik.yaml
   - 仿真 bsp-webots-autoaim User/xrobot.yaml
   - 站内文档 docs/算法组/{webots,pipeline,modules,camera-pipeline,sync-and-config}.md、docs/system-architecture.md */

export type SharedId = 'CameraFrameSync' | 'ArmorDetector' | 'ArmorTracker' | 'Aimer';
export type RealId = 'HikCamera' | 'SharedTopicClient' | 'UsbCdc' | 'CBoard';
export type SimId =
  | 'WebotsCamera'
  | 'CameraSync'
  | 'HostTopic'
  | 'WebotsGimbal'
  | 'WebotsFireNotify'
  | 'WebotsReferee';
export type NodeId = SharedId | RealId | SimId;

export interface CfgRef {
  /** 仓库内的配置文件路径。 */
  file: string;
  /** 配置里这个模块实例的 id。 */
  id: string;
}

export interface Diff {
  key: string;
  real: string;
  sim: string;
}

export interface NodeInfo {
  id: NodeId;
  kind: 'shared' | 'real' | 'sim';
  /** 显示名；多数就是模块名。 */
  title: string;
  /** 一句话：它做什么。 */
  role: string;
  /** 源码仓库（QDU-Robomaster 组织下）。 */
  repo?: string;
  /** 主要文件。 */
  files?: string;
  /** 实车一端的配置位置。 */
  real?: CfgRef;
  /** 仿真一端的配置位置。 */
  sim?: CfgRef;
  /** 两边参数不同的地方（只给共用模块）。 */
  diffs?: Diff[];
  /** 适配模块：另一端换成了谁。 */
  swap?: string;
  /** 适配模块：两三条配置上的事实。 */
  facts?: string[];
  /** 站内文档路由。 */
  doc: { to: string; label: string };
}

export const REAL_CFG_FILE = 'bsp-linux-autoaim/User/RunConfig/hik.yaml';
export const SIM_CFG_FILE = 'bsp-webots-autoaim/User/xrobot.yaml';

export const SHARED_ORDER: SharedId[] = ['CameraFrameSync', 'ArmorDetector', 'ArmorTracker', 'Aimer'];

/** 链上共用模块的小标题（灯条板中间那一行）。 */
export const SHARED_SUB: Record<SharedId, string> = {
  CameraFrameSync: '图像和 IMU 对齐',
  ArmorDetector: '检测 · 分类 · PnP',
  ArmorTracker: '车辆状态 · 选目标',
  Aimer: '预测 · 弹道 · 云台计划',
};

export const NODES: Record<NodeId, NodeInfo> = {
  CameraFrameSync: {
    id: 'CameraFrameSync',
    kind: 'shared',
    title: 'CameraFrameSync',
    role: '把图像和 IMU 配成同步帧，管同步模式和档位。',
    repo: 'QDU-Robomaster/CameraFrameSync',
    files: 'CameraFrameSync.hpp、CameraFrameSyncCore.hpp、CameraFrameSyncStateMachine.hpp',
    real: { file: REAL_CFG_FILE, id: 'camera_frame_sync' },
    sim: { file: SIM_CFG_FILE, id: 'CameraFrameSync_0' },
    diffs: [
      { key: 'runtime.mode', real: 'RAW_PROBE', sim: 'TRIGGER' },
      { key: 'runtime.offset_us', real: '1075', sim: '0' },
    ],
    doc: { to: '/算法组/camera-pipeline', label: '相机与同步' },
  },
  ArmorDetector: {
    id: 'ArmorDetector',
    kind: 'shared',
    title: 'ArmorDetector',
    role: '装甲板检测、分类、角点和 PnP。',
    repo: 'QDU-Robomaster/ArmorDetector',
    files: 'ArmorDetectorNetwork.hpp、ArmorDetectorRuntime.hpp、ArmorDetectorPnPSolver.hpp',
    real: { file: REAL_CFG_FILE, id: 'armor_detector' },
    sim: { file: SIM_CFG_FILE, id: 'ArmorDetector_0' },
    diffs: [
      { key: 'cfg.network.model', real: 'INT16_HEAD_L', sim: 'OPENVINO_640X512' },
      { key: 'cfg.referee_auto_detect_color', real: 'true', sim: 'false' },
    ],
    doc: { to: '/算法组/pipeline', label: '自瞄链路' },
  },
  ArmorTracker: {
    id: 'ArmorTracker',
    kind: 'shared',
    title: 'ArmorTracker',
    role: '车辆状态估计与目标选择。',
    repo: 'QDU-Robomaster/ArmorTracker',
    files: 'ArmorTrackerPipeline.hpp、ArmorTrackerCore.hpp、ArmorTrackerModel.hpp',
    real: { file: REAL_CFG_FILE, id: 'armor_tracker' },
    sim: { file: SIM_CFG_FILE, id: 'ArmorTracker_0' },
    diffs: [
      { key: 'cfg.extrinsic.camera_mount_to_body', real: '手眼标定值', sim: '单位变换' },
      { key: 'cfg.preview.enabled', real: 'false', sim: 'true' },
    ],
    doc: { to: '/算法组/pipeline', label: '自瞄链路' },
  },
  Aimer: {
    id: 'Aimer',
    kind: 'shared',
    title: 'Aimer',
    role: '目标预测、弹道和云台计划，输出 host/target_euler 与 host/fire_notify。',
    repo: 'QDU-Robomaster/Aimer',
    files: 'AimerImpl.hpp、AimerTargetModel.hpp、AimerMath.hpp、AimerPlanner.hpp',
    real: { file: REAL_CFG_FILE, id: 'aimer' },
    sim: { file: SIM_CFG_FILE, id: 'aimer' },
    diffs: [
      { key: 'cfg.yaw_offset', real: '-0.4', sim: '0.0' },
      { key: 'cfg.fire_delay_s', real: '0.05', sim: '0.0' },
    ],
    doc: { to: '/算法组/pipeline', label: '自瞄链路' },
  },

  // ---- 实车一端
  HikCamera: {
    id: 'HikCamera',
    kind: 'real',
    title: 'HikCamera',
    role: 'Hikrobot 相机取流，C 板硬件外触发，2×2 下采样输出 720×540。',
    repo: 'QDU-Robomaster/HikCamera',
    real: { file: REAL_CFG_FILE, id: 'camera' },
    swap: '仿真换成 WebotsCamera + CameraSync',
    facts: ['external_trigger: true，触发目标 100 Hz', 'exposure_time 2000 μs，gain 16'],
    doc: { to: '/算法组/camera-pipeline', label: '相机与同步' },
  },
  SharedTopicClient: {
    id: 'SharedTopicClient',
    kind: 'real',
    title: 'SharedTopicClient',
    role: '经 DevC-USB 向 C 板发 target_euler、fire_notify 和同步命令。',
    repo: 'xrobot-org/SharedTopicClient',
    real: { file: REAL_CFG_FILE, id: 'shared_topic_tx' },
    swap: '仿真里 Aimer 的输出直接交给 Webots 执行模块',
    facts: ['uart: devc_usb，slot_count: 256', '接收方向由 shared_topic_rx（SharedTopic）带回云台姿态和裁判信息'],
    doc: { to: '/算法组/modules', label: '模块索引' },
  },
  UsbCdc: {
    id: 'UsbCdc',
    kind: 'real',
    title: 'USB CDC',
    role: 'Linux 与 C 板之间的通信链路，配置里叫 DevC-USB。',
    real: { file: REAL_CFG_FILE, id: 'shared_topic_rx、shared_topic_tx（uart: devc_usb）' },
    swap: '仿真没有这一层',
    facts: ['驱动、通信时延和丢包属于另一层问题，不进 Webots 的日常算法调试'],
    doc: { to: '/system-architecture', label: '整体架构' },
  },
  CBoard: {
    id: 'CBoard',
    kind: 'real',
    title: 'C 板',
    role: '下位机：控制云台，执行发射，接入裁判系统，并硬件触发相机。',
    swap: '仿真换成 WebotsGimbal、WebotsFireNotify、WebotsReferee',
    facts: ['下位机通过硬件触发相机采集，相机和 IMU 才能同步', '下位机里的模块同样用 topic 解耦'],
    doc: { to: '/system-architecture', label: '整体架构' },
  },

  // ---- 仿真一端
  WebotsCamera: {
    id: 'WebotsCamera',
    kind: 'sim',
    title: 'WebotsCamera',
    role: '读取 Webots 相机图像，并发布相机 IMU 的 gyro、accl、quat 三路 topic。',
    repo: 'QDU-Robomaster/WebotsCamera',
    sim: { file: SIM_CFG_FILE, id: 'WebotsCamera_0' },
    swap: '实车是 HikCamera',
    facts: ['800×600 BGR8，fps: 100', '图像只在触发 GPIO 有效时提交，时间戳取仿真时间'],
    doc: { to: '/算法组/webots', label: 'Webots 仿真' },
  },
  CameraSync: {
    id: 'CameraSync',
    kind: 'sim',
    title: 'CameraSync',
    role: '按触发周期写 WebotsCamera 的触发 GPIO，并发布同步事件。',
    repo: 'QDU-Robomaster/CameraSync',
    sim: { file: SIM_CFG_FILE, id: 'CameraSync_0' },
    swap: '实车由 C 板硬件触发',
    facts: ['trigger_period_us: 20000，仿真时间下 50 Hz'],
    doc: { to: '/算法组/camera-pipeline', label: '相机与同步' },
  },
  HostTopic: {
    id: 'HostTopic',
    kind: 'sim',
    title: 'host Topic',
    role: 'Aimer 的输出在 controller 内直接交给 Webots 的执行模块，不经串口。',
    swap: '实车走 SharedTopicClient + USB CDC',
    facts: ['订阅的是 host/target_euler 和 host/fire_notify', '没有串口，也没有额外的桥接模块'],
    doc: { to: '/算法组/webots', label: 'Webots 仿真' },
  },
  WebotsGimbal: {
    id: 'WebotsGimbal',
    kind: 'sim',
    title: 'WebotsGimbal',
    role: '订阅 host/target_euler，驱动仿真云台的电机和关节，姿态再回到算法侧。',
    repo: 'QDU-Robomaster/WebotsGimbal',
    sim: { file: SIM_CFG_FILE, id: 'WebotsGimbal_0' },
    swap: '实车是 C 板控制云台',
    facts: ['control_period_ms: 1', '只缓存最新的目标，不排轨迹队列'],
    doc: { to: '/算法组/webots', label: 'Webots 仿真' },
  },
  WebotsFireNotify: {
    id: 'WebotsFireNotify',
    kind: 'sim',
    title: 'WebotsFireNotify',
    role: '订阅 host/fire_notify，处理射频、开火延迟、单发热量和冷却，生成出弹事件。',
    repo: 'QDU-Robomaster/WebotsFireNotify',
    sim: { file: SIM_CFG_FILE, id: 'WebotsFireNotify_0' },
    swap: '实车是 C 板上的发射机构',
    facts: ['max_fire_frequency_hz: 20，fire_delay_ms: 30', 'shooter_heat_limit: 240，bullet_speed: 23'],
    doc: { to: '/算法组/webots', label: 'Webots 仿真' },
  },
  WebotsReferee: {
    id: 'WebotsReferee',
    kind: 'sim',
    title: 'WebotsReferee',
    role: '把发射机构状态整理成 robot_game_ref，Aimer 沿用实车上的弹速和热量接口。',
    repo: 'QDU-Robomaster/WebotsReferee',
    sim: { file: SIM_CFG_FILE, id: 'WebotsReferee_0' },
    swap: '实车的裁判信息经 SharedTopic 从 C 板带回',
    facts: ['robot_game_ref，每 100 ms 发布一次', 'shooter_heat_limit: 240，shooter_cooling_value: 40'],
    doc: { to: '/算法组/webots', label: 'Webots 仿真' },
  },
};

export const SHARED_NOTE = '两边同一份代码';
