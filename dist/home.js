'use strict';
for(const node of document.querySelectorAll('[data-count]'))node.textContent=window.PLATFORM_COUNTS[node.dataset.count].toLocaleString('zh-CN');
