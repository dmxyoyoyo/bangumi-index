# 番剧索引：哔哩哔哩、B站东南亚与巴哈姆特动画疯

网站首页提供哔哩哔哩、B站东南亚和巴哈姆特动画疯三个入口，目录分别位于 dist/bilibili.html、dist/sea.html 与 dist/gamer.html。

哔哩哔哩板块支持中文名、官方名称、日文原名、ss ID、BV 号和链接检索，并提供“全部／仅限港澳台地区”筛选；后者包含仅限香港、澳门、台湾及其组合的官方条目，可与搜索同时使用。条目隐藏地区和来源列，名称以黑色无下划线链接显示。普通条目显示简体中文主标题及已有的日文原名，无日文原名则不加名称副行。港澳台受限条目主标题统一追加“（仅限港澳台地区）”，下方显示繁体中文名及已有的日文原名；仍保留官方原始地区限制作为筛选与核查依据。scripts/bilibili-directory.mjs 完整采集官方番剧及国创索引，检查分页、总量、重复 ID 和首尾一致性；scripts/bilibili-videos.mjs 读取官方账号公开合集并核验投稿者，保留已确认的隐藏正片链接。官方投稿总列表目前受接口限制，不能保证所有隐藏视频均已收录。

港澳台及历史条目以 bangumi-data（https://github.com/bangumi-data/bangumi-data ，CC BY 4.0）作为链接线索，再由 scripts/bilibili-history.mjs 向官方媒体元数据接口核验。每次最多核查 100 条，优先新增和港澳台线索；失败时保留已核验结果，后续更新继续。原名参考包含简体和繁体中文别名，保留季度及特殊符号区别；没有已确认的日文原名则不显示该行。当前历史补录未完成，不能把现有条数理解为全量，收录不代表当前网络可播放。

scripts/bilibili-discovery.mjs 读取 data/bilibili-discovery-sources.json 中的公开专栏，提取正文中的番剧、视频和官方作品卡片，并沿官方季度关系补查。专栏文字只提供线索；具有官方标题、封面及番剧跳转的 OGV 卡片可作为作品存在的元数据证据，不能据此认定当前网络可播放。普通番剧接口返回 -404 时仍保留官方卡片证据，不把地区限制与下架混为一谈。失效卡片只记录候选，不直接生成 ss。

旧港澳台卡片中保留的视频 ID 通过官方 /x/article/cards 批量核查。仅接收固定官方账号“哔哩哔哩番剧”（928123）与“哔哩哔哩番剧出差”（11783021）的投稿；后者已核对平台机构认证。旧卡片恢复还要求接口返回有效 BV 和官方番剧 ep 跳转。没有有效 ss 时保留实际官方视频入口，不推测 ss。时长为 0 但仍返回官方正片资料的视频标为“播放状态待确认”，不宣称能播放。无法解析或非官方的视频不收录。

专栏发现、旧卡片核查和关联季度已纳入每日两次的既有更新。接口失败保留已确认数据及核查进度；出现限流后停止本轮后续补录请求，下次继续。data/bilibili-discovery.json、bilibili-linked.json 和 bilibili-videos.json 保存来源与核查状态。

东南亚目录中，用户实测确认跳转为国区片源的 7 组对应保存在 data/mapping-exclusions.json，归入“已排除国区片源 · 东南亚 ID 待核实”。每天两次更新会同时排除这些错误 ID 的自动匹配与旧人工记录恢复，但继续查找同一国际版作品的其他 SS ID。这些作品的新候选须再核对两端正片集数、额外章节数和首集发布时间，或由人工确认国际版片源后记录，避免只凭同作品标题与简介再次误配。新作品与新核实对应仍自动加入。排除规则只针对具体对应，不以“中国大陆”制作地区作判断。标题显示修正保存在 data/title-overrides.json，后续更新继续生效。

B站目录提供东南亚 11 国番剧记录、国际版 ID 和已核实的中国版 ss ID。作品中文译名时保留官方名称，无法确认原名语言时如实标注。

## 国旗与番剧封面

东南亚 11 国国旗来自 Flagpedia / FlagCDN（https://flagpedia.net/download/api），图片保存在 dist/assets/flags/ 并随部署打包。番剧封面使用官方目录或已核实作品 ID 对应的官方元数据图片地址；B站封面字段由 update.mjs、refresh-cn.mjs 和 enrich.mjs 保留，动画疯由 gamer.mjs 保留。两页共用 covers.js，封面按需加载；图片暂时无法加载时显示占位，搜索和作品链接仍可使用。

## 巴哈姆特动画疯目录

动画疯使用官方公开元数据接口 https://api.gamer.com.tw/anime/v1/anime_list.php ，不使用账号、Cookie 或播放 Token。scripts/gamer.mjs 完整读取 totalPage 指定的每个分页，检查页长、作品字段与 ID 唯一性，再复查首页 ID 列表和总页数。HTTP 错误、接口错误、空页、分页重复、缺页或同步期间目录发生变化时退出，不将不完整结果发布。下一次任务从已发布源码重试。

只有本次完整目录中的作品保留在动画疯页面，不把旧目录中消失的作品重新合并进来。官方当前目录原始元数据保存在 data/gamer-list.json；生成 dist/gamer-catalog.json、dist/gamer-data.js 和两个入口的 dist/home-data.js。以 animeSn 为作品 ID，链接指向官方 animeRef.php?sn=，不关联中国版 B站 ss ID。

主标题优先唯一精确匹配的既有 Bangumi 名称，其余使用动画疯官方译名并转为简体。官方繁体名称与日文原名分行展示并用于检索。日文原名优先读取巴哈姆特 ACG 作品资料页，由官方列表给出的 acgSn 定位；也可采用唯一精确匹配的 Bangumi 原名，保留日文写法，不做简繁转换。data/gamer-originals.json 保存原名、来源 URL 和核查时间。非日本作品展示其原文名称并明确说明，资料不足时显示“日文原名待核实”。新增条目随每日更新自动补查，每次最多 80 条；缺失原名在 7 天后重试。HTTP 错误会停止发布，保留已核查的原名缓存和上一版页面。目录首播年月与集数沿用官方字段；集数不等于已经完结后的固定总集数。不同季度及官方单列版本分别保留。

## 内容筛选与制作国家

东南亚页面在搜索下提供默认折叠的分类，制作地区选项为全部、日本、中国，不显示“其他”按钮；动画疯使用其官方分类。优先使用官方作品制作地区，其次 Bangumi 国家标签、data/origin-overrides.json 中已核对的原作资料与官方国创类型；缺少国家字段但已确认日文原名的记录暂按日本归类，并保存推断来源。配音版沿用原作归属，仍无法判断的条目在内部保留为其他。

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

npm run update 顺序执行官方目录刷新、中国版候选补查、名称与日期补全、ID 诊断、对应版本日期同步、动画疯全部分页同步、哔哩哔哩国区目录同步和数据检查。网络故障、5xx 和无效 JSON 最多请求三次；B 站目录的空页或无效结构也最多请求三次。412、429 及接口风控码立即停止该来源，不继续重试。中国版 ID 补查或国区目录仍异常时，使用该来源上次完整缓存，扫描游标不推进，本轮不再继续请求中国版来源；其他平台已完成的数据通过全部检查后仍可发布。日志及 Actions 摘要会标明沿用缓存的来源，下次任务重新尝试。仅所有必需来源完整更新才写入 lastSuccessfulRefresh，部分更新保留原时间。无可用缓存、其他必需目录失败、代码错误或数据检查失败仍会退出，不发布中间结果。国区的历史线索及官方视频补录允许使用已核验缓存，接口受限时保留待核查状态。

仅验证已有缓存与生成页面，不访问数据源：

```sh
node scripts/refresh.mjs --offline
npm run check
```

离线检查不能视为已获取最新官方目录。人工编辑 公开数据文件后也应运行离线流程，以同步 dist/catalog.json 和 dist/data.js。

## EdgeOne 每日两次自动更新（待完成连接）

当前 EdgeOne 项目 bangumi-index 使用直接上传方式。绑定域名或上传静态 ZIP 不会运行数据更新脚本；原 Sites 的每日任务不会向 EdgeOne 发布。

`.github/workflows/refresh-edgeone.yml` 已准备为北京时间每天 07:00 和 19:00 开始运行，并支持手动运行。配置文件保存在本地不表示云端计划已启用。GitHub 的计划任务可能延迟，网站以完整同步、校验和部署成功后的时间为准。

每轮都重新检查待核实/未开播作品的国际版资料、待核实中国版候选与正片版本信息；晚间任务不会仅因当天早晨已检查而跳过这些资料。新官方作品、新 SS ID 及符合版本证据的对应关系随本轮完整校验和发布补入，已排除的错误片源 ID 不会自动恢复。

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
9. 动画疯在同一次 npm run update 中按上述独立目录规则完整刷新；不生成 B站关联 ID。哔哩哔哩国区目录随后独立刷新并同步首页三个平台的数量。动画疯目录任何分页检查失败时停止该次发布，保留整个网站上一版结果。
10. npm run update 自带 npm run check 对应的检查。确认新增数量、译名、播出变化和映射变化，保留来源。当前通过 .github/workflows/refresh-edgeone.yml 发布到既有 EdgeOne 项目，并校验线上六个目录数据文件。更新通过静态数据快照发布，无须另行前端构建。部署凭证只能使用已有的 GitHub Secrets，不能写入代码或日志。
11. 若来源出现 HTTP 412/429、请求失败、分页不完整或检查失败，停止该次发布，保留上次结果。不要更换伪造的地区身份、绕过限制或把空响应覆盖成空目录；下一次任务再重试。记录错误类型即可，禁止输出敏感信息。无可行动变化时保持安静，仅有需要用户处理的失败或重要变化时通知。

该工作流更新三个平台，计划时间为北京时间每日 07:00 和 19:00。计划触发时间不等于网站完成更新时间；首次运行与后续完整成功时间应以实际任务结果和页面 lastSuccessfulRefresh 为准。

## 数据与来源

持久缓存全部位于 data/，是关联源码的一部分：intl-metadata.json、localized-metadata.json、cn-metadata.json、bangumi-subjects.json、bangumi-countries.json、bangumi-matches.json、title-overrides.json、release-overrides.json、user-links.json。research/ 仅用于开发时调查，不是云端更新的依赖。

公开来源：

- 官方动画目录：https://www.bilibili.tv/en/category?season_type=1,4
- 官方国际版 Season：https://api.bilibili.tv/intl/gateway/web/v2/ogv/play/season_info
- 官方影视站点地图：https://www.bilibili.tv/sitemap/ogv-media-0.xml
- 官方中国版 Season：https://api.bilibili.com/pgc/view/web/season
- 官方中国版新版 Season：https://api.bilibili.com/pgc/view/web/simple/season
- Bangumi 公开 API：https://api.bgm.tv/v0
- Bangumi 数据归档：https://github.com/bangumi/Archive
- 历史底库：https://github.com/JasonKhew96/bangumi 的 src/data/bilibili_sea.json（2025-01-03，仓库已归档）

## 完整性边界

11 国包含 BN、KH、ID、LA、MY、MM、PH、SG、TH、TL、VN。五个语言目录、站点地图及历史目录合并扩大覆盖，但当前网络和官方公开接口仍可能遗漏地区独占或未索引的条目，因此不能保证全部地区绝对完整。

中国版和国际版 ID 不保证相同，不能直接把国际版 ID 拼成 ss 链接。历史收录数不等于当前可播放数。实际播放仍由平台、当前网络、账号和会员权限决定；本项目只处理公开元数据，不采集视频文件。

港澳台旧 BV 卡片只作为查找线索，不再直接作为作品的播放入口。更新任务查询新版网页使用的官方 /pgc/view/web/simple/season 公开元数据接口，必要时读取官方 EP 网页；只有明确返回对应季度才改用 ss 番剧页，不同季度按实际 season_id 分开。核查缓存保存在 data/bilibili-pages.json，每次最多检查 60 个入口，并继续核对关联季度；遇到限流保存进度，后续任务继续。未恢复番剧页的旧单集暂不展示；普通官方账号隐藏番剧的 BV 入口继续保留。查到作品资料只说明番剧条目存在，不等于已验证当前地区的播放授权，也不能仅因旧接口返回 -404 判断下架。

哔哩哔哩板块支持全部、日本、中国、其他制作地区筛选，与港澳台筛选、关键词和分页共同生效，不在条目上增加分类标签。制作地区优先使用官方作品资料和已确认支持的日本目录筛选，再参考 Bangumi、官方国创分类及已确认的日文原名。其他同时包含其余制作地区与制作地区尚未确认的条目；配音语言和播放授权地区不改变制作地区。data/bilibili-origins.json 保存官方筛选结果，完整分页检查失败时保留原有缓存；不能使用未出现在官方筛选参数中的中国 area=1，该参数可能被忽略而返回全部作品。

历史媒体线索现优先读取官方媒体页公开资料，核对 media_id 与 season_id 后补充记录及关联季度；正文未返回时保留待核查，不推断为下架。季度清单中的嵌套列表和正文港澳台 ID 也会提取为线索，再交由官方季度资料核查；不会把文章中的年份或东南亚 ID 当作港澳台 SS。

港澳台主标题使用对应动画的 Bangumi 简体译名，缺少已缓存译名时采用 bangumi-data 的简体名称；不再仅对繁体官方名称逐字转换。匹配采用已核实的媒体 ID、完整名称和原名，保留标点、季度、配音版及特殊版本；共享媒体 ID 的前后部分不得按最后一部分误命名整部作品。data/bilibili-title-links.json 保存少量官方非标准名称与 Bangumi 动画条目的明确对应。繁体官方名称、旧简体名称及日文原名仍支持搜索；无对应中文名称的品牌保留官方写法。每日更新会重新生成译名资料，失败时沿用已保存结果。关联季度补查跳过已有官方目录或媒体资料覆盖的季度，把请求留给缺失入口。

国区缺失的日文原名由 scripts/bilibili-originals.mjs 在生成目录时补全：优先使用唯一媒体 ID，再参考已核验作品的完整名称与配音版对应关系。只去掉末尾配音标记，不合并标点不同的季度、剧场版或 OVA/SP。data/bilibili-originals.json 保存已人工核对的例外、官方标题及来源；官方标题不再匹配时不套用旧记录。同一媒体 ID 收录多部作品的合集保留各部原名，不能直接取最后一部。日文不做简繁转换，补全后可直接检索；没有可靠依据的记录继续留空。

国区分类默认折叠为“展开分类”，包含地区（全部／日本／国创／其他）、播放地区（全部／仅限港澳台地区）、季度（全部／1月／4月／7月／10月）和年份。季度按首播月份所在的三个月分组，年份提供逐年、2014–2010、2009–2005、2004–2000、90年代、80年代和更早。四组可与搜索、排序和分页共同使用，条目不显示分类标签。scripts/bilibili-dates.mjs 采用官方首播资料及已核对的作品日期，data/bilibili-dates.json 保存来源；BV 上传日期不作为作品首播日期，年份已知但月份未知时仅支持年份筛选，未知日期只保留在“全部”。data/bilibili-video-seeds.json 中明确核对的 seasonId 与 seasonTitle 用于将符号不同的旧合集并回已有番剧页，旧 BV 号仍能检索。

data/bilibili-archive.json 保存用户指定的 JasonKhew96 历史清单中 566 条港澳台动画的季度与媒体 ID 线索，来源为 https://github.com/JasonKhew96/bangumi/blob/master/src/data/bilibili.json ，与该网站实际加载的公开 JSON 核对一致，快照日期为 2025-01-03。仅采用其番剧、国创分类作为动画线索，不把电视剧、纪录片、综艺和真人电影合并进动画目录。线索先通过官方季度资料核对，再通过官方媒体页检查；只有明确返回当前作品资料才补录。历史数量不等于当前可访问数量，接口和网页均未返回时保留待核查，不以旧清单冒充现行资料，也不直接认定下架。已知明确原名不会被缺少译名的历史线索覆盖，未确认结果沿用原有七天重试间隔。
