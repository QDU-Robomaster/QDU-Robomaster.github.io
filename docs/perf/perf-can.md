---
id: perf-can
title: CAN性能测试
sidebar_position: 2
---

# CAN/CAN FD性能测试

## 测试环境

* STM32H750VB 480MHz
* FDCAN1 连接到 FDCAN2
* FDCAN1/FDCAN2 接收回调中直接转发
* 每秒统计回调中接收到的包数量
* 仲裁段配置为1Mbps，FD数据段配置为2.5Mbps

## 测试代码

```cpp
  STDIO::write_ = uart_cdc.write_port_;
  constexpr uint32_t PACK_ID = 0x123;
  constexpr CAN::Type PACK_TYPE = CAN::Type::STANDARD;
  constexpr uint32_t PACK_NUM = 8;

  static volatile uint32_t counter = 0, speed = 0;

  void (*can_func)(bool, LibXR::STM32CANFD *, const CAN::ClassicPack &) =
      [](bool, LibXR::STM32CANFD *can, const CAN::ClassicPack &pack)
  {
    can->AddMessage(pack);
    counter++;
  };

  auto cb_can1 = CAN::Callback::Create(can_func, &fdcan1);
  fdcan1.Register(cb_can1, PACK_TYPE);
  auto cb_can2 = CAN::Callback::Create(can_func, &fdcan2);
  fdcan2.Register(cb_can2, PACK_TYPE);

  LibXR::CAN::ClassicPack pack;
  pack.id = PACK_ID;
  pack.type = PACK_TYPE;

  for (uint32_t i = 0; i < PACK_NUM; i++)
  {
    fdcan1.AddMessage(pack);
  }

  while (true)
  {
    Thread::Sleep(1000);
    speed = counter;
    counter = 0;
    XR_LOG_DEBUG("speed: %d", speed);
  }
```

## 测试结果

负载按5%位填充计算

### 标准帧 8字节数据

8917包/s，每包108位，数据段的速率为0.57Mbps，平均总线负载接近100%

理想情况下，数据段的速率位`64 / 108 * 1Mbps / 105% = 0.564Mbps`

### 拓展帧 8字节数据

7401包/s，每包128位，数据段的速率为0.47Mbps，平均总线负载接近100%

### 标准远程帧

20357包/s，每包44位，平均总线负载接近100%

### 拓展远程帧

14054包/s，每包64位，平均总线负载接近100%

### FD标准帧 64字节数据

3929包/s，数据段的速率为2.01Mbps，平均总线负载接近100%

### FD拓展帧 64字节数据

3617包/s，数据段的速率为1.85Mbps，平均总线负载接近100%

## 总结

本次测试表明，在 STM32H750（480MHz）平台下，LibXR 框架封装的 FDCAN 驱动在高频率双向回环通信中表现稳定高效。无论是经典帧还是 FD 帧，在配置为 1Mbps 仲裁段、2.5Mbps 数据段的情况下，系统均可实现接近理论极限的收发速率。
