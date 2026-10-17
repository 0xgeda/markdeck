# Markdeck 体积与内存评估

更新日期：2026-10-17。安装体积和运行内存是不同指标；目前有针对安装包的实测，没有本轮真实进程 RAM／RSS 结论。

## 当前判断

保留 Electron 和现有编辑器，优先排除构建依赖、约束图片缓存，暂不为体积重写架构或删除使用中的功能。前端 chunk 大不等于存在内存泄漏，DOM 回归通过也不等于没有泄漏。

本轮打包后 macOS arm64 应用为 300524 KiB（约 293.5 MiB），其中 Frameworks 293756 KiB（约 286.9 MiB），Resources 6700 KiB（约 6.5 MiB）；绝大部分是 Electron 运行环境。app.asar 为 6.17 MiB，前端 dist 分配大小为 1288 KiB。`release/Markdeck-darwin-arm64/` 还包含独立许可证文件，目录大小不能当作 `.app` 大小。Finder 十进制 MB 与 `du` 的二进制单位也不同。

复测命令：

```sh
du -sk release/Markdeck-darwin-arm64/Markdeck.app
du -sk release/Markdeck-darwin-arm64/Markdeck.app/Contents/Frameworks
du -sk release/Markdeck-darwin-arm64/Markdeck.app/Contents/Resources
node tests/package-size.mjs
```

`du -sk` 的数值除以 1024 得到 MiB；归档文件逻辑字节数不等于文件系统分配大小。

## 已实施与边界

- 构建依赖放在 devDependencies，打包排除源码、测试、设计稿、项目说明、规则文件、bundle 和构建缓存。原生运行依赖仅保留 Markdown 解析和 ZIP；[package-size 检查](tests/package-size.mjs) 阻止开发依赖混入。
- ZIP 模块按需载入。图片缓存按 UTF-16 字符串近似占用设置 16 MiB 保留上限；一次 hydration 最多四个读取任务，图片延迟加载并异步解码。大图仍可加载，但不长期留存。
- 图片缓存上限不包括 IPC 临时副本、DOM、已解码位图、GPU 内存，不能解释为应用总内存上限。
- 保存队列合并连续输入，完成后不长期持有完整返回工作区。模式退出清理工具栏、监听器和高亮，切换文档关闭章节侧栏与逐章展示。

2026-10-15 的历史测量为 `.app` 约 325 MiB 降至 293 MiB，主要来自移除误装入包的开发依赖。这是历史包的前后对比，不代表每一轮都重新减少 32 MiB，也不代表运行内存下降相同比例。

## 仍待测量

受限环境未能启动真实 Electron／Chromium，未取得主进程、渲染进程、GPU 的 RAM／RSS。本轮不宣称已完成长文档性能或泄漏验收，验证状态见 [UX_REVIEW.md](UX_REVIEW.md)。

如实际出现卡顿或持续增长，在同一桌面环境、同一文档下记录：启动稳定后、编辑后、切换文档 20 次后以及空闲后的进程内存和响应时间。若空闲后持续增长，再使用堆快照查持有者。

目前工作区会保存已打开文档的正文，历史对话框会载入该文档版本；图片解码可能明显大于压缩文件。先测这三处，再决定按需读取或进一步缓存调整。旧 [src/presentation/](src/presentation/) 入口已停用，但仍有原生接口与测试引用，保留审计，不直接删除。
