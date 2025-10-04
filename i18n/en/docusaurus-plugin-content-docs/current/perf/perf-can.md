---
id: perf-can
title: CAN Performance Test
sidebar_position: 2
---

# CAN/CAN FD Performance Test

## Test Environment

* STM32H750VB @ 480MHz
* FDCAN1 connected to FDCAN2
* FDCAN1/FDCAN2 directly forward received frames in callback
* Count number of received CAN packets per second in ISR
* Arbitration phase set to 1Mbps, FD data phase set to 2.5Mbps

## Test Code

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

## Test Results

Bit stuffing is estimated at 5%.

### Standard Frame (8-byte data)

8917 packets/s, 108 bits per frame, data segment rate = 0.57 Mbps, bus load ≈ 100%

Ideal case: `64 / 108 * 1Mbps / 105% = 0.564 Mbps`

### Extended Frame (8-byte data)

7401 packets/s, 128 bits per frame, data segment rate = 0.47 Mbps, bus load ≈ 100%

### Standard Remote Frame

20357 packets/s, 44 bits per frame, bus load ≈ 100%

### Extended Remote Frame

14054 packets/s, 64 bits per frame, bus load ≈ 100%

### FD Standard Frame (64-byte data)

3929 packets/s, data segment rate = 2.01 Mbps, bus load ≈ 100%

### FD Extended Frame (64-byte data)

3617 packets/s, data segment rate = 1.85 Mbps, bus load ≈ 100%

## Summary

This test demonstrates that on the STM32H750 (480 MHz) platform, the FDCAN driver wrapped by the LibXR framework performs with excellent stability and efficiency in high-frequency, bi-directional loopback communication. Whether using classic CAN or CAN FD frames, the system can consistently reach transmission rates close to the theoretical limits under a configuration of 1 Mbps arbitration and 2.5 Mbps data phases.
