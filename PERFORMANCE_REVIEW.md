# Markdeck 体积与内存评估

更新日期：2026-10-18。安装体积和运行内存是不同指标；已有安装包体积与安装版短时运行 RSS 采样，不代表长期稳定性验收完成。

## 当前判断

保留 Electron 和现有编辑器，优先排除构建依赖、约束图片缓存，暂不为体积重写架构或删除使用中的功能。前端 chunk 大不等于存在内存泄漏，DOM 回归通过也不等于没有泄漏。

本轮打包后 macOS arm64 应用为 300744 KiB（约 293.7 MiB），其中 Frameworks 293756 KiB（约 286.9 MiB），Resources 6920 KiB（约 6.8 MiB）；绝大部分是 Electron 运行环境。app.asar 为 6.38 MiB，前端 dist 分配大小为 1380 KiB。`release/Markdeck-darwin-arm64/` 还包含独立许可证文件，目录大小不能当作 `.app` 大小。Finder 十进制 MB 与 `du` 的二进制单位也不同。

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

## 修复前安装版运行内存采样

`tests/desktop-memory.mjs` 在 macOS arm64 实际安装包中，以隔离的约 380KB、150 章节文档执行 60 轮写作／梳理／展示及长短文档切换。无渲染异常，原文保持不变，结束后继续编辑能保存。通过 Electron 进程列表和 `ps` 采集主进程、渲染、GPU、Utility 的 RSS；以下是单次运行的进程 RSS 合计，可能重复计算共享页，不能等同于系统物理内存占用。

| 阶段 | RSS 合计 MiB |
| --- | ---: |
| 启动稳定后 | 394 |
| 打开长文档后 | 455 |
| 20 轮 | 788 |
| 40 轮 | 853 |
| 60 轮 | 913 |
| 自然空闲 10 秒 | 631 |
| 继续编辑并保存 | 685 |
| 最后单独诊断：强制 GC 后 | 642 |

自然空闲时 JavaScript 已用堆约 40 MiB；最后强制 GC 后约 41 MiB（中间有编辑），明显高于初次打开长文档的约 13 MiB。RSS 的回落证明部分内存可回收，但不足以证明没有持续保留对象。强制 GC 仅用于诊断，没有加入产品代码，也不能当作正常空闲表现。

原始数据位于本机临时目录 `/var/folders/q7/s40ylff95k50pq7jv9xl6fzm0000gn/T/markdeck-memory-PzZ7jo/memory.json`。第一轮 20 次采样在 `markdeck-memory-AkeDBk`；不能把不同进程启动的基线混成同一次曲线。

## 持续保留定位与修复

进一步诊断在基线和第 20／40／60 轮后等待 3 秒并强制 GC，基线与末轮保存堆快照。发现 TOAST UI 3.2.2 的全局 `nodeMap` 仍索引已销毁编辑器的 ToastMark 节点，因而持续保留正文。`scripts/patch-editor.cjs` 现在在编辑器销毁时遍历该文档解析树，仅删除索引仍指向此节点的条目；没有清空其他编辑器的索引，也没有向产品加入强制 GC。

相同测试文档和 60 轮操作，回收后的 JavaScript 已用堆对比如下（MiB）：

| 轮次 | 修复前 | 修复后 |
| --- | ---: | ---: |
| 20 | 19.9 | 11.4 |
| 40 | 29.3 | 11.6 |
| 60 | 38.5 | 11.8 |

末轮快照中测试正文段落字符串从 9,150 个降到 300 个，对应字符串自身大小从约 20.9 MiB 降至 0.73 MiB。20 至 60 轮 DOM 节点数均为 9,770，事件监听器均为 301。此次定位出的文档销毁保留问题已修复；剩余小幅变化不能据此归零，也不代表所有内存问题均已排除。

修复前诊断证据在临时目录 `markdeck-memory-fTyahR`，修复后在 `markdeck-memory-OSeJzm`（与上文相同父目录）。堆快照采集本身会改变 RSS，因此这组诊断数据不能与上面的自然运行 RSS 表直接比较。修复后安装版的 60 轮保存、桌面编辑／表格／冲突／重启／另存为回归通过；UMD 与 ESM 的生命周期测试验证旧节点释放且另一编辑器仍可查节点、编辑。

复测：设置 `YUNJIAN_EXECUTABLE` 指向安装包运行 `node tests/desktop-memory.mjs`；仅定位保留引用时附加 `MARKDECK_HEAP_DIAGNOSTICS=1`。依赖修补的回归入口为 `node tests/editor-lifecycle.mjs`。

## 多图持续验收

多图场景已补验：`tests/desktop-image-stress.mjs` 使用 12 个生成的 1024×768 JPEG（共 7,736,204 字节）、24 处引用、24 个表格与嵌套列表，执行 30 轮编辑／保存／模式和文档切换并重启。其 Base64 按 UTF-16 估算超过 16 MiB 缓存保留上限。修复首次点击图片跳转和重复引用尺寸错位后，附件 SHA-256、图片解码、独立尺寸、列表／表格／代码示例及最终正文均通过核验。

每个采样点等待 3 秒并主动 GC，第 10／20／30 轮 JavaScript 已用堆为约 26.1／25.7／24.4 MiB，DOM 节点均为 9,838、监听器均为 339。这组样本未出现持续增长；不是自然空闲内存或全天压力测试。完整证据位于 `/var/folders/q7/s40ylff95k50pq7jv9xl6fzm0000gn/T/markdeck-image-stress-hmMxae/evidence.json`。先前失败样本保留，最终结果以此目录为准。

## 仍待测量

后续仍需真实照片／业务文档和长时间编辑体验。当前已修复一个有明确持有链的泄漏，并完成上述合成多图短时回归，不能扩大为长期无泄漏结论；人工设备体验范围见 [UX_REVIEW.md](UX_REVIEW.md)。

目前工作区会保存已打开文档的正文，历史对话框会载入该文档版本；图片解码可能明显大于压缩文件。先测这三处，再决定按需读取或进一步缓存调整。旧 `src/presentation/` 入口已软归档至 `archive/`，原生接口与测试同步下线。
