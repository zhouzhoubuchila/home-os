# Home OS 归属与许可

Home OS 是基于 [Navet](https://github.com/awesomestvi/navet) 的派生项目，保留其成熟应用架构、Provider、认证、实时状态、UI 系统、PWA 与响应式能力。Navet 的商标和上游品牌归其各自权利人所有；Home OS 使用独立名称与图标。

本项目继续遵守仓库中的 `AGPL-3.0-only` 许可。第三方依赖及素材归属继续以 `docs/ATTRIBUTIONS.md`、依赖锁文件和各自许可为准。

Home OS 新增层位于 `packages/app/src/features/home-os/`，通过标准化 `DeviceWithType` 与 Navet 通用命令工作，不直接依赖 Home Assistant 原始 WebSocket 数据结构，也不把第三方凭据写入前端。

## Sun Position Card

Home OS 的太阳弧线时间定位逻辑参考并改写自
[Sun Position Card](https://github.com/jayjojayson/Sun-Position-Card)（提交
`730a1e145e064a0ccc885c795f74c81d61859a28`），Copyright (c) 2025/2026 jayjojayson，
按 MIT License 使用。Home OS 仅复用其基于日出、日落计算昼间弧线进度的源码思路，UI、数据契约与组件实现均已按本项目架构重写；未嵌入 iframe，也未复制其图片素材。
