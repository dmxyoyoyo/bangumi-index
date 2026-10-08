# 番剧索引：B站东南亚与巴哈姆特动画疯

网站首页提供 B站东南亚和巴哈姆特动画疯两个入口，目录分别位于 dist/sea.html 与 dist/gamer.html。

B站目录提供东南亚 11 国番剧记录、国际版 ID 和已核实的中国版 ss ID。作品中文译名时保留官方名称，无法确认原名语言时如实标注。

## 国旗与番剧封面

东南亚 11 国国旗来自 Flagpedia / FlagCDN（https://flagpedia.net/download/api），图片保存在 dist/assets/flags/ 并随部署打包。番剧封面使用官方目录或已核实作品 ID 对应的官方元数据图片地址；B站封面字段由 update.mjs、refresh-cn.mjs 和 enrich.mjs 保留，动画疯由 gamer.mjs 保留。两页共用 covers.js，封面按需加载；图片暂时无法加载时显示占位，搜索和作品链接仍可使用。

## 巴哈姆特动画疯目录

动画疯使用官方公开元数据接口 https://api.gamer.com.tw/anime/v1/anime_list.php ，不使用账号、Cookie 或播放 Token。scripts/gamer.mjs 完整读取 totalPage 指定的每个分页，检查页长、作品字段与 ID 唯一性，再复查首页 ID 列表和总页数。HTTP 错误、接口错误、空页、分页重复、缺页或同步期间目录发生变化时退出，不将不完整结果发布。下一次任务从已发布源码重试。

只有本次完整目录中的作品保留在动画疯页面，不把旧目录中消失的作品重新合并进来。官方当前目录原始元数据保存在 data/gamer-list.json；生成 dist/gamer-catalog.json、dist/gamer-data.js 和两个入口的 dist/home-data.js。以 animeSn 为作品 ID，链接指向官方 animeRef.php?sn=，不关联中国版 B站 ss ID。

主标题优先唯一精确匹配的既有 Bangumi 名称，其余使用动画疯官方译名并转为简体。官方繁体名称与日文原名分行展示并用于检索。日文原名优先读取巴哈姆特 ACG 作品资料页，由官方列表给出的 acgSn 定位；也可采用唯一精确匹配的 Bangumi 原名，保留日文写法，不做简繁转换。data/gamer-originals.json 保存原名、来源 URL 和核查时间。非日本作品展示其原文名称并明确说明，资料不足时显示“日文原名待核实”。新增条目随每日更新自动补查，每次最多 80 条；缺失原名在 7 天后重试。HTTP 错误会停止发布，保留已核查的原名缓存和上一版页面。目录首播年月与集数沿用官方字段；集数不等于已经完结后的固定总集数。不同季度及官方单列版本分别保留。

## 内容筛选与制作国家

页面在搜索下提供全部、日本、中国、其他分类。优先使用官方作品制作地区，其次 Bangumi 国家标签、data/origin-overrides.json 中已核对的原作资料与官方国创类型；缺少国家字段但已确认日文原名的记录暂按日本归类，并保存推断来源。配音版沿用原作归属，仍无法判断的条目归入其他。

已核对的 AI 短剧及同批短剧从目录移除，审查依据与国际版 ID 保存在 data/excluded-seasons.json。在线发现与离线整理都应用这份名单，防止自动更新重新收录。不能仅凭未匹配中国版 ID、中文片名、没有 Bangumi 条目或国创类型判定 AI 短剧。新增可疑作品应先核对实际内容和用户样例，再补充名单。

按用户要求，未核查且原因为接口未返回的 169 条历史记录已从网站移除，也加入同一排除名单（decision 为 user-requested-source-unavailable）。这是目录筛选决定，不是官方确认下架；后续自动更新仍排除这些 ID。

## 在线网站

请访问 https://www.qianmoqingyu.dpdns.org/

## 本地使用

直接打开 dist/index.html，或者运行 node scripts/serve.mjs 后访问 http://127.0.0.1:4173 。页面的数据已经打包，本地查看不需要 npm 安装。

更新需要 Node.js 20 或以上版本：

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run update
```

npm run update 顺序执行官方目录刷新、中国版候选补查、名称与日期补全、ID 诊断、对应版本日期同步、动画疯全部分页同步和数据检查。任一步失败即退出，只有完整成功才写入 lastSuccessfulRefresh。不要发布失败任务中产生的中间文件；保留上一版已发布结果，下一次从已发布源码重新更新。

仅验证已有缓存与生成页面，不访问数据源：

```sh
node scripts/refresh.mjs --offline
npm run check
```

离线检查不能视为已获取最新官方目录。人工编辑 公开数据文件后也应运行离线流程，以同步 dist/catalog.json 和 dist/data.js。

## EdgeOne 每日两次自动更新（待完成连接）

当前 EdgeOne 项目 bangumi-index 使用直接上传方式。绑定域名或上传静态 ZIP 不会运行数据更新脚本；原 Sites 的每日任务不会向 EdgeOne 发布。

`.github/workflows/refresh-edgeone.yml` 已准备为北京时间每天 07:00 和 19:00 开始运行，并支持手动运行。配置文件保存在本地不表示云端计划已启用。GitHub 的计划任务可能延迟，网站以完整同步、校验和部署成功后的时间为准。

接通步骤：

1. 在 GitHub 创建网站仓库，默认分支使用 main。若希望标准云端运行时间免费，可选 Public；本项目的源码与元数据会对外公开，部署密钥另存于 Secrets。
2. 将源码包解压后上传其中的内容到仓库根目录，确保根目录有 package.json、package-lock.json、data/、dist/、scripts/ 和 .github/workflows/refresh-edgeone.yml。不要把整个 ZIP 上传成单个文件，也不要多套一层目录。
3. 在当前腾讯云 Makers 控制台的 API Token 页面创建部署凭证。在 GitHub 仓库 Settings → Secrets and variables → Actions → New repository secret 中，Name 填 EDGEONE_API_TOKEN，Secret 填凭证。凭证只填写到 GitHub Secrets；不要写进源码、README 或聊天。
4. 在 GitHub 仓库 Settings → Actions → General 中允许工作流运行，并允许工作流读写仓库，以便保存下一次更新所需的完整缓存。
5. 打开 Actions → 每日两次更新番剧目录 → Run workflow，选择 main，先进行一次手动验证。只有所有步骤变绿，且自定义域名上的数据核对通过，才算完成自动部署连接。

工作流顺序为更新、校验、保存成功缓存、发布 dist、核对线上 JSON 与浏览器使用的数据脚本。更新或校验失败时不会发布，也不会提交不完整缓存；下一次从仓库中上次成功的数据重试。不要把来源限流或接口失败后的中间数据手动上传。

未来修改页面后，先上传修改过的文件，再通过 Run workflow 发布；每天的两次任务也会采用默认分支的最新页面与数据。无需重新绑定当前域名或 HTTPS 证书。

本源码包不包含 .git、.openai、.sites-runtime、node_modules、.env、研究脚本或任何部署凭证。

官方参考：

- EdgeOne GitHub Actions：https://pages.edgeone.ai/document/using-github-actions
- EdgeOne CLI：https://pages.edgeone.ai/document/edgeone-cli
- GitHub 定时任务：https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- GitHub Actions 费用：https://docs.github.com/en/billing/concepts/product-billing/github-actions

## 原 Sites 网站自动更新步骤（供独立云端任务执行）

1. 通过 Sites 工具重新打开关联的同一个 Site，核对所有者与当前访问范围。使用运行时给出的项目 ID，保持现有访问范围。
2. 用 Sites 官方源码工作流和短期写入凭证，在独立空目录恢复关联源码。不要依赖作者电脑的路径、research 目录或已打开的网页。凭证仅保存在运行时内存和官方工作流的隐藏 stdin 中，不能写入源码、命令参数或日志。
3. 阅读本 README，在恢复的目录执行 npm ci --ignore-scripts --no-audit --no-fund，然后执行 npm run update。所有公开来源无须用户账号、Cookie 或 Token。
4. 更新脚本低并发查询官方五种语言动画目录和影视站点地图。每天最多刷新 800 个国际版元数据与 150 个简体中文元数据，旧缓存优先轮换。应用 data/excluded-seasons.json 中的排除名单并保留官方制作国家与内容标签。只新增官方动画类型、地区字段含东南亚国家的记录，保留历史记录。地区语言选项并非地区网络出口。
5. 中国版更新会复查已知条目与官方相关季度，检查最新桥接 ID 附近的有限区间，同时每天补查至多 501 个历史缺口 ID。data/cn-discovery.json 保存补查游标；不进行无边界扫描。
6. 中文名称与制作国家分类优先官方信息和 Bangumi，保留分类证据；配音版不按配音语言改变原作归属。中文名称优先官方简体中文和 Bangumi。仅对中文标题进行简繁转换；保留原文和配音、季度区别。NEW GAME!、One Room 等无中文译名的品牌名称保留官方写法。为新作品通过公开 Bangumi API 查询精确对应条目，不能直接选第一个搜索结果。定期更新待播条目的日期；检查 data/release-overrides.json 中仍在未来的排期是否被作品官网修改。
7. 独立判断开播状态与中国版 ID。平台 is_started/is_finished 字段可提供开播依据；Bangumi 未来日期仅表示计划排期，不能排除提前配信。官网已核对的排期与提前配信保存在 release-overrides.json，页面给出依据链接。配音版日期与原作日期分别说明。不要用 ID 缺失、接口错误或者未来电视日期直接断言未开播。
8. 中国版候选需要官方标题和完整简介一致；多个候选还需官方季度/SP 标记或官方国际版日期区分，并检查全目录唯一性。没有足够证据时不写入 cnId、不生成链接。页面分别显示接口未返回、版本歧义、未找到对应项及计划开播，且列明排查原因。映射仅验证元数据，不能代替实际播放权限检查。
9. 动画疯在同一次 npm run update 中按上述独立目录规则完整刷新，随后同步首页两个平台的数量；不生成 B站关联 ID。动画疯目录任何分页检查失败时停止该次发布，保留整个网站上一版结果。
10. npm run update 自带 npm run check 对应的检查。确认新增数量、译名、播出变化和映射变化，保留来源。使用 Sites 官方工作流推送确切源码并打包 dist，然后发布到同一个 Site；用原生部署状态确认成功。更新通过静态数据快照发布，无须另行前端构建。推送中的凭证仍只能走隐藏 stdin。
11. 若来源出现 HTTP 412/429、请求失败、分页不完整或检查失败，停止该次发布，保留上次结果。不要更换伪造的地区身份、绕过限制或把空响应覆盖成空目录；下一次任务再重试。记录错误类型即可，禁止输出敏感信息。无可行动变化时保持安静，仅有需要用户处理的失败或重要变化时通知。

该每日任务更新两个平台。每日任务的计划时间为北京时间 07:00。保存计划不表示已经运行过无人值守更新；首次运行与后续完整成功时间应以实际任务结果和页面 lastSuccessfulRefresh 为准。

## 数据与来源

持久缓存全部位于 data/，是关联源码的一部分：intl-metadata.json、localized-metadata.json、cn-metadata.json、bangumi-subjects.json、bangumi-countries.json、bangumi-matches.json、title-overrides.json、release-overrides.json、user-links.json。research/ 仅用于开发时调查，不是云端更新的依赖。

公开来源：

- 官方动画目录：https://www.bilibili.tv/en/category?season_type=1,4
- 官方国际版 Season：https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/season_info
- 官方影视站点地图：https://www.bilibili.tv/sitemap/ogv-media-0.xml
- 官方中国版 Season：https://api.bilibili.com/pgc/view/web/season
- Bangumi 公开 API：https://api.bgm.tv/v0
- Bangumi 数据归档：https://github.com/bangumi/Archive
- 历史底库：https://github.com/JasonKhew96/bangumi 的 src/data/bilibili_sea.json（2025-01-03，仓库已归档）

## 完整性边界

11 国包含 BN、KH、ID、LA、MY、MM、PH、SG、TH、TL、VN。五个语言目录、站点地图及历史目录合并扩大覆盖，但当前网络和官方公开接口仍可能遗漏地区独占或未索引的条目，因此不能保证全部地区绝对完整。

中国版和国际版 ID 不保证相同，不能直接把国际版 ID 拼成 ss 链接。历史收录数不等于当前可播放数。实际播放仍由平台、当前网络、账号和会员权限决定；本项目只处理公开元数据，不采集视频文件。
