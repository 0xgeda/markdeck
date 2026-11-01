# Markdeck 体积与内存评估

更新日期：2026-11-01。安装体积和运行内存是不同指标；已有安装包体积与安装版短时运行 RSS 采样，不代表长期稳定性验收完成。

## 当前判断

保留 Electron 和现有编辑器，优先排除构建依赖、约束图片缓存，暂不为体积重写架构或删除使用中的功能。前端 chunk 大不等于存在内存泄漏，DOM 回归通过也不等于没有泄漏。

当前优化版短时实测占用可接受，但不属于轻量编辑器：60 轮切换的采样最高 RSS 合计为 630 MiB，自然空闲 10 秒后为 413 MiB，没有观察到持续增长。已处理参考面板关闭后的保留引用、历史反复读取、保存回执包含全部正文及无排版图片时的重复解析。保存基准有明确收益，但两次空闲 RSS 仍在约 400 MiB，不能声称整体运行内存显著降低。

2026-10-18 打包后 macOS arm64 应用为 300744 KiB（约 293.7 MiB），其中 Frameworks 293756 KiB（约 286.9 MiB），Resources 6920 KiB（约 6.8 MiB）；绝大部分是 Electron 运行环境。当时 app.asar 为 6.38 MiB，前端 dist 分配大小为 1380 KiB。`release/Markdeck-darwin-arm64/` 还包含独立许可证文件，目录大小不能当作 `.app` 大小。Finder 十进制 MB 与 `du` 的二进制单位也不同。

复测命令：

```sh
du -sk release/Markdeck-darwin-arm64/Markdeck.app
du -sk release/Markdeck-darwin-arm64/Markdeck.app/Contents/Frameworks
du -sk release/Markdeck-darwin-arm64/Markdeck.app/Contents/Resources
node tests/package-size.mjs
```

`du -sk` 的数值除以 1024 得到 MiB；归档文件逻辑字节数不等于文件系统分配大小。

## 2026-11-01 优化结果

本轮打包版 app.asar SHA-256：`3c52495c79d6c4b1ea4d75e3a0b43572710d3828da9d64530c93bb26c108db03`。已同步至 `/Applications/Markdeck.app` 和项目 release，ad-hoc 签名及内容一致性检查通过；旧版保留于 `/private/tmp/markdeck-before-memory-B3oiHn`。保留全文草稿持久化的前后两次写入、原文件冲突校验、强制历史快照及关闭恢复流程；没有引入增量保存协议，也没有向产品加入强制 GC。

- 历史仅缓存最近一个文档的最新版本时间戳，间隔内跳过整份历史读取；不缓存历史正文，缓存不会随文档数量增长。重启后首次读取照常进行，强制记录和写入失败后的重试有专项验证。
- 普通保存只返回错误与文档 revision；恢复历史仍返回更新后的工作区正文。发送端仍提交完整工作区，进一步减少发送量不在本轮范围内。
- 参考面板关闭时清空正文、候选文档和处理器，并清除主界面的关闭回调；关闭操作幂等，保留所选参考和滚动位置。安装版 WeakRef + GC 检查确认，无需重新打开面板即可回收。
- 没有 `data-larkdown-image` 标记时跳过布局恢复的全文解析；有标记时仍走原解析器，保留同源图片出现次序、代码块排除和排版往返规则。
- 打包排除约 129 KiB 的归档和开发辅助文件，仓库原件保留。新 `.app` 为 300,624 KiB（293.6 MiB）、app.asar 为 6.31 MiB；不将体积变化计入内存收益。

旧安装版与新版使用相同合成数据，各做 3 轮、每轮 10 次小修改，成对执行；结果如下。这是本地同步后端基准，未包含实际 IPC 与渲染，读写量是累计值而非同时占用内存。

| 指标 | 优化前 | 优化后 |
| --- | ---: | ---: |
| 单次保存耗时中位数 | 48.7 ms | 28.7 ms |
| 每 10 次保存的历史读取次数 | 10 | 1 |
| 每 10 次保存的历史读取量 | 83.1 MiB | 8.31 MiB |
| 每 10 次保存的返回 JSON 总量 | 22,667,655 字节 | 6,730 字节 |
| 每 10 次保存的草稿写入量 | 43.2 MiB | 43.2 MiB |

保存基准证据：`/var/folders/q7/s40ylff95k50pq7jv9xl6fzm0000gn/T/markdeck-save-comparison-FH01vE/comparison.json`。数据规模与下节首次审计相同，历史分布是合成的，不代表用户实际每份文档的历史。

同样的 60 轮安装版测试通过，采样最高 RSS 从 682 变为 630 MiB，自然空闲 10 秒从 390 变为 413 MiB，空闲 JavaScript 已用堆从 15.8 变为 13.5 MiB。强制 GC 后已用堆约 13.0 MiB，仅用于诊断。两次运行的系统回收与压缩状态不同，不能将 RSS 差值解释为确定的优化收益。新证据为 `markdeck-memory-PqDXPD/memory.json`（同一临时目录父路径）。

文件／关闭／历史缓存共 21 项后端测试、history-find、save-queue、reference-pane、image-controls、app-flow、show-plan、构建及包内一致性检查通过。打包版 desktop、desktop-images、desktop-clipboard、desktop-export、desktop-boundaries、desktop-interactions、desktop-recovery、desktop-close、desktop-image-stress 均通过；剪贴板已恢复。30 轮多图测试的回收后堆在第 10／20／30 轮约为 26.2／26.6／26.2 MiB，节点和监听器数量稳定；这是强制 GC 诊断，不是自然空闲指标。完整多图证据在 `markdeck-image-stress-1yUcPJ/evidence.json`。界面自动化通过不扩大为本轮重新完成全部人工视觉验收。

## 2026-10-31 优化前审计

测试对象为 `/Applications/Markdeck.app`，与项目 release 版 app.asar SHA-256 相同：`eb42a420567cc9a5b1ff6a0cd3e6145dffadef5b5deca0e256cba43f5dbae8b9`。机器为 macOS arm64、16 GiB 内存。测试单独启动安装版，使用隔离临时数据，不操作用户原文档。

`YUNJIAN_EXECUTABLE=/Applications/Markdeck.app/Contents/MacOS/Markdeck node tests/desktop-memory.mjs` 通过。使用约 380 KB、150 章节的合成文档，执行 60 轮写作／梳理／展示和长短文档切换；原文核对、继续编辑保存和渲染错误检查均通过。

| 阶段 | 进程 RSS 合计 MiB | 渲染端 JavaScript 已用堆 MiB |
| --- | ---: | ---: |
| 启动稳定后 | 435 | 7.3 |
| 打开长文档后 | 488 | 13.5 |
| 20 轮（采样最高值） | 682 | 45.1 |
| 40 轮 | 647 | 45.2 |
| 60 轮 | 541 | 45.2 |
| 自然空闲 10 秒 | 390 | 15.8 |
| 继续编辑并保存 | 447 | 15.2 |
| 单独诊断：强制 GC 后 | 402 | 13.3 |

RSS 合计可能重复计算共享页，也受系统回收和压缩影响，不能当作活动监视器的精确物理占用。表中的最高值是离散采样最高值，不是连续监测的峰值。自然空闲行发生在强制 GC 之前。短时测试不构成全天无泄漏证明。

原始证据：`/var/folders/q7/s40ylff95k50pq7jv9xl6fzm0000gn/T/markdeck-memory-3hPUup/memory.json`。

### 审计发现的重复工作和保留引用

以下保留修改前的定位与建议；本轮实施范围和验证结果见上一节。

1. **历史记录在间隔判断之前读取全部版本。** `desktop/history.cjs:7` 每次正文变化先 `list()` 读取并解析历史，再判断是否达到 60 秒间隔；即使本次不产生历史版本，仍承担分配和解析成本。当前用户 21 份历史文件共约 17.2 MiB，单份最大约 3.85 MiB，这些是磁盘数据，不是全部常驻内存。可先保留少量最新版本时间／指纹元数据，在需要记录时再读历史；强制记录和恢复行为须保持。
2. **每次保存传递全工作区，并序列化整个草稿两次。** `src/main.js:58` 发送全部正文，`desktop/workspace.cjs:94` 持久化前后各写一次，返回全部正文，而保存回调只需要错误和 revision。当前 41 份正文总计 2,263,245 字节，常驻文本本身不大，反复跨进程复制和序列化才是可减少的部分。可先缩小保存返回值；进一步增量保存须保留“先持久化草稿、再写原文件”的恢复边界，不能直接删掉保护性写入。
3. **关闭参考面板后仍保留旧 DOM。** `src/main.js` 的 `closeReference` 一直持有 `src/reference-pane.js:28` 的闭包；`pane.remove()` 只移出页面，没有清空调用方引用。安装版中用 WeakRef 和强制 GC 验证：关闭后面板仍存活、`isConnected=false`，保留 308 个后代元素；再次打开参考后旧面板才可回收。这是最后一个面板的有限保留，不是每次打开都无限累积。应在关闭时清除调用方引用并释放面板内容。该诊断没有测量图片引用场景的额外收益。
4. **没有图片的文档仍为图片布局重新解析全文。** `src/image-controls.js:27` 在每次编辑器创建时调用 MarkdownIt 和 DOMParser，再发现没有图片。可在编辑器解析树确认存在需要恢复布局的图片后才执行这一步；不能简单正则替换正文或改变同源图片的出现次序。此项是代码检查发现，尚未独立测量优化收益。

保存成本另用合成数据验证：41 份正文的 UTF-8 字节规模与当前工作区相同，最大文档配置 30 个合成历史版本（历史文件 8.31 MiB；不是用户真实历史分布）。10 次各追加一个字符的保存，即使没有新增历史版本，仍累计读取历史 83.1 MiB，写入工作区 43.2 MiB；请求／返回 JSON 各约 21.6 MiB，单次同步后端处理约 48–97 ms。这里测的是累计处理量，不是同时占用的内存；没有包含实际 IPC 与渲染时间。证据为同一临时目录父路径下的 `markdeck-save-cost-a1gY46/cost.json`。

参考面板诊断证据为 `markdeck-memory-audit-guwwQz/audit.json`；它使用后台隔离窗口及强制 GC，只用于验证引用是否释放，不能与上面的自然运行 RSS 曲线混用。首次补充诊断窗口中途关闭，未完成的 `markdeck-memory-audit-IQD2rL` 不作为最终验证结果。

### 安装包中不必要的部分

`node tests/package-size.mjs` 通过，开发依赖和官网未混入安装包；生产依赖只有实际使用的 MarkdownIt 和 JSZip，ZIP 仍按需加载。此次 `.app` 为 300,760 KiB（293.7 MiB），Frameworks 为 293,756 KiB（286.9 MiB），app.asar 为 6.44 MiB。

直接检查 asar 发现仍包含 `archive/`、`scripts/`、`.claude/`、`locales/`、`OPTIMIZATION_PLAN.md`、`I18N_GUIDE.md`、根 `index.html`、`vercel.json`、`.gitignore`，合计约 129 KiB。可以从打包清单排除，保留仓库中的历史和恢复材料；它们没有被运行时加载，清理不会显著降低运行内存。`src/i18n.js` 当前没有入口引用，不进入渲染构建，也不是内存大头。

优化顺序为减少历史读取和保存复制、释放已关闭面板、跳过无效全文解析，最后整理打包清单。Electron 官方也建议先测量实际占用，再处理不需要提前加载或执行的工作：[性能指南](https://www.electronjs.org/docs/latest/tutorial/performance)。不建议仅凭本轮数据更换框架或删除在用功能。

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
