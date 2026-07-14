(() => {
  if (window.__xiaobaoArxivReaderLoaded) return;
  window.__xiaobaoArxivReaderLoaded = true;

  const state = {
    queue: [],
    total: 0,
    done: 0,
    failed: 0,
    running: 0,
    paused: false,
    cleared: false,
    runtimeInvalidated: false,
    concurrency: 2,
    translatedElements: new WeakSet(),
    statusText: null,
    progressText: null,
    progressBar: null,
    pauseButton: null,
    modeButton: null,
    retryButton: null,
    clearButton: null,
    payloads: new WeakMap(),
    displayMode: 'bilingual'
  };

  const protectedSelector = [
    'math',
    '.ltx_Math',
    '.MathJax',
    '.katex',
    '.ltx_ref',
    '.ltx_cite',
    'a[href^="#"]'
  ].join(',');

  const selectors = [
    'article .ltx_title',
    'article .ltx_abstract .ltx_p',
    'article .ltx_abstract p',
    'article .ltx_section > .ltx_title',
    'article .ltx_subsection > .ltx_title',
    'article .ltx_subsubsection > .ltx_title',
    'article .ltx_paragraph > .ltx_title',
    'article .ltx_p',
    'article p',
    'article li',
    'article figcaption',
    'article caption',
    'main .ltx_title',
    'main .ltx_abstract .ltx_p',
    'main .ltx_abstract p',
    'main .ltx_section > .ltx_title',
    'main .ltx_subsection > .ltx_title',
    'main .ltx_subsubsection > .ltx_title',
    'main .ltx_paragraph > .ltx_title',
    'main .ltx_p',
    'main p',
    'main li',
    'main figcaption',
    'main caption',
    '.ltx_title',
    '.ltx_abstract .ltx_p',
    '.ltx_abstract p',
    '.ltx_section > .ltx_title',
    '.ltx_subsection > .ltx_title',
    '.ltx_subsubsection > .ltx_title',
    '.ltx_paragraph > .ltx_title',
    '.ltx_p',
    'p',
    'li',
    'figcaption',
    'caption'
  ];

  function boot() {
    if (window.top !== window.self) return;

    if (isArxivAbstractPage()) {
      injectArxivEntry();
      return;
    }

    if (isAr5ivPaperPage()) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startAr5ivReader);
      } else {
        startAr5ivReader();
      }
    }
  }

  function isArxivAbstractPage() {
    return /(^|\.)arxiv\.org$/i.test(location.hostname) && /^\/abs\//.test(location.pathname);
  }

  function isAr5ivPaperPage() {
    return location.hostname === 'ar5iv.labs.arxiv.org' && /^\/html\//.test(location.pathname);
  }

  function getArxivIdFromAbsPage() {
    const match = location.pathname.match(/^\/abs\/(.+)$/);
    if (!match) return '';
    return decodeURIComponent(match[1]).replace(/\/$/, '');
  }

  function encodeArxivPathId(paperId) {
    return paperId.split('/').map(part => encodeURIComponent(part)).join('/');
  }

  function getArxivIdFromAr5ivPage() {
    const match = location.pathname.match(/^\/html\/(.+)$/);
    if (!match) return '';
    return decodeURIComponent(match[1]).replace(/\/$/, '');
  }

  function injectArxivEntry() {
    if (document.getElementById('xiaobao-arxiv-entry')) return;

    const paperId = getArxivIdFromAbsPage();
    if (!paperId) return;

    const href = `https://ar5iv.labs.arxiv.org/html/${encodeArxivPathId(paperId)}?xiaobao_auto_translate=1`;
    const link = document.createElement('a');
    link.id = 'xiaobao-arxiv-entry';
    link.className = 'xiaobao-arxiv-entry';
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = '🐆 小豹双语阅读';

    const row = document.createElement('div');
    row.className = 'xiaobao-arxiv-entry-row';
    row.appendChild(link);

    const accessPaper = findAccessPaperContainer();
    if (accessPaper) {
      accessPaper.appendChild(row);
      return;
    }

    const pdfLink = document.querySelector('a[href^="/pdf/"], a[href*="arxiv.org/pdf/"]');
    if (pdfLink && pdfLink.parentElement) {
      pdfLink.parentElement.insertAdjacentElement('afterend', row);
      return;
    }

    document.body.appendChild(row);
  }

  function findAccessPaperContainer() {
    const candidates = [
      '.extra-services',
      '.full-text',
      '.download',
      '.abs-license',
      'aside',
      '.submission-history'
    ];

    for (const selector of candidates) {
      const element = document.querySelector(selector);
      if (element) return element;
    }

    const headings = Array.from(document.querySelectorAll('h2, h3, h4, strong, span, div'));
    const heading = headings.find(element => /Access Paper/i.test(element.textContent || ''));
    if (heading) return heading.closest('div') || heading.parentElement;
    return null;
  }

  function startAr5ivReader() {
    if (document.body.classList.contains('xiaobao-arxiv-reader-active')) return;
    document.body.classList.add('xiaobao-arxiv-reader-active');

    createToolbar();

    const autoTranslate = new URLSearchParams(location.search).get('xiaobao_auto_translate') === '1';
    if (autoTranslate) {
      setTimeout(() => beginTranslation(), 500);
    } else {
      setStatus('点击“开始”翻译当前 arXiv HTML 论文');
      const startButton = document.createElement('button');
      startButton.type = 'button';
      startButton.className = 'xiaobao-arxiv-toolbar-button';
      startButton.textContent = '开始';
      startButton.addEventListener('click', () => {
        startButton.remove();
        beginTranslation();
      });
      document.querySelector('.xiaobao-arxiv-toolbar-actions')?.prepend(startButton);
    }
  }

  function createToolbar() {
    if (document.getElementById('xiaobao-arxiv-toolbar')) return;

    const toolbar = document.createElement('div');
    toolbar.id = 'xiaobao-arxiv-toolbar';
    toolbar.className = 'xiaobao-arxiv-toolbar';
    toolbar.innerHTML = `
      <div class="xiaobao-arxiv-toolbar-main">
        <div class="xiaobao-arxiv-toolbar-title">🐆 小豹 arXiv 双语阅读</div>
        <div class="xiaobao-arxiv-toolbar-status">准备中...</div>
        <div class="xiaobao-arxiv-progress"><span></span></div>
      </div>
      <div class="xiaobao-arxiv-toolbar-actions">
        <button type="button" class="xiaobao-arxiv-toolbar-button" data-action="pause">暂停</button>
        <button type="button" class="xiaobao-arxiv-toolbar-button" data-action="mode">双语</button>
        <button type="button" class="xiaobao-arxiv-toolbar-button" data-action="retry">重试失败</button>
        <button type="button" class="xiaobao-arxiv-toolbar-button" data-action="clear">清除译文</button>
      </div>
    `;

    document.body.appendChild(toolbar);

    state.statusText = toolbar.querySelector('.xiaobao-arxiv-toolbar-status');
    state.progressText = toolbar.querySelector('.xiaobao-arxiv-toolbar-title');
    state.progressBar = toolbar.querySelector('.xiaobao-arxiv-progress span');
    state.pauseButton = toolbar.querySelector('[data-action="pause"]');
    state.modeButton = toolbar.querySelector('[data-action="mode"]');
    state.retryButton = toolbar.querySelector('[data-action="retry"]');
    state.clearButton = toolbar.querySelector('[data-action="clear"]');

    state.pauseButton.addEventListener('click', togglePause);
    state.modeButton.addEventListener('click', toggleDisplayMode);
    state.retryButton.addEventListener('click', retryFailed);
    state.clearButton.addEventListener('click', clearTranslations);
  }

  function beginTranslation() {
    state.cleared = false;
    state.runtimeInvalidated = false;
    state.paused = false;
    state.done = 0;
    state.failed = 0;
    state.running = 0;
    state.queue = collectBlocks()
      .map(element => ({ element, ...buildTranslationPayload(element), attempts: 0 }))
      .filter(item => item.text);
    state.total = state.queue.length;

    if (state.pauseButton) state.pauseButton.textContent = '暂停';

    if (!state.total) {
      setStatus('没有找到可翻译的论文正文块');
      updateProgress();
      return;
    }

    setStatus(`正在翻译 0 / ${state.total}`);
    updateProgress();
    pumpQueue();
  }

  function collectBlocks() {
    const seen = new Set();
    const blocks = [];

    for (const selector of selectors) {
      document.querySelectorAll(selector).forEach(element => {
        if (seen.has(element)) return;
        seen.add(element);

        if (!isTranslatableElement(element)) return;
        blocks.push(element);
      });
    }

    return blocks.filter(element => !hasTranslatableAncestor(element, blocks));
  }

  function hasTranslatableAncestor(element, blocks) {
    let parent = element.parentElement;
    while (parent) {
      if (blocks.includes(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }

  function isTranslatableElement(element) {
    if (!element || state.translatedElements.has(element)) return false;
    if (element.closest('#xiaobao-arxiv-toolbar')) return false;
    if (element.closest('.xiaobao-arxiv-translation')) return false;
    if (element.closest('.ltx_bibliography, .ltx_equation, .ltx_equationgroup')) return false;
    if (element.querySelector('.xiaobao-arxiv-translation')) return false;

    const tag = element.tagName.toLowerCase();
    if (['script', 'style', 'noscript', 'math', 'svg', 'table'].includes(tag)) return false;

    const text = normalizeText(element.innerText);
    if (!text) return false;
    if (text.length < 8 && !element.matches('.ltx_title')) return false;
    if (text.length > 2200) return false;
    if (/[\u4e00-\u9fa5]/.test(text)) return false;
    if (!/[a-zA-Z]/.test(text)) return false;
    if (looksLikeFormula(text)) return false;
    if (isMostlyReferences(text)) return false;

    return true;
  }

  function buildTranslationPayload(element) {
    const placeholders = [];
    const segments = mergeTextSegments(collectProtectedSegments(element, placeholders));
    const text = normalizeText(segments.map(segment => segment.type === 'text' ? segment.text : segment.token).join(' '));
    const payload = {
      text,
      placeholders,
      segments,
      mode: shouldUseSegmentedMode(segments, placeholders) ? 'segmented' : 'tokenized'
    };
    state.payloads.set(element, payload);
    return payload;
  }

  function collectProtectedSegments(root, placeholders) {
    const segments = [];

    root.childNodes.forEach(node => {
      segments.push(...collectNodeSegments(node, placeholders));
    });

    return segments;
  }

  function collectNodeSegments(node, placeholders) {
    if (node.nodeType === Node.TEXT_NODE) {
      return [{ type: 'text', text: node.textContent || '' }];
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return [];
    }

    const element = node;
    if (element.matches(protectedSelector) || isInlineMathLike(element)) {
      const kind = getPlaceholderKind(element);
      const token = `XIAOBAO_${kind}_${placeholders.length}_TOKEN`;
      const placeholder = { token, kind, node: element.cloneNode(true) };
      placeholders.push(placeholder);
      return [{ type: 'placeholder', token, placeholder }];
    }

    if (element.matches('script, style, noscript')) {
      return [];
    }

    const segments = [];
    element.childNodes.forEach(child => {
      segments.push(...collectNodeSegments(child, placeholders));
    });

    return segments;
  }

  function mergeTextSegments(segments) {
    const merged = [];

    segments.forEach(segment => {
      if (segment.type !== 'text') {
        merged.push(segment);
        return;
      }

      const text = normalizeText(segment.text);
      if (!text) return;

      const previous = merged[merged.length - 1];
      if (previous && previous.type === 'text') {
        previous.text = normalizeText(`${previous.text} ${text}`);
      } else {
        merged.push({ type: 'text', text });
      }
    });

    return merged;
  }

  function getPlaceholderKind(element) {
    if (element.matches('.ltx_cite')) return 'CITE';
    if (element.matches('.ltx_ref, a[href^="#"]')) return 'REF';
    return 'MATH';
  }

  function shouldUseSegmentedMode(segments, placeholders) {
    const textLength = segments
      .filter(segment => segment.type === 'text')
      .reduce((total, segment) => total + segment.text.length, 0);

    if (placeholders.length >= 6) return true;
    if (placeholders.length >= 3 && textLength < 180) return true;
    return placeholders.length >= 4 && placeholders.length / Math.max(segments.length, 1) > 0.35;
  }

  function isInlineMathLike(element) {
    const text = normalizeText(element.innerText || element.textContent || '');
    if (!text || text.length > 80) return false;
    if (element.closest('.ltx_equation, .ltx_equationgroup')) return false;
    if (!/[=+\-*/∫∑√≤≥≈∞∂∇_^{}()[\]ρπμσθαβγλΞΩ]|\b[a-zA-Z]_[a-zA-Z0-9]/.test(text)) return false;
    return /math|ltx_Math/i.test(String(element.className || ''));
  }

  function looksLikeFormula(text) {
    const compact = text.replace(/\s/g, '');
    if (!compact) return false;
    const formulaChars = (compact.match(/[=+\-*/∫∑√≤≥≈∞∂∇_^{}()[\]|]/g) || []).length;
    return formulaChars / compact.length > 0.35;
  }

  function isMostlyReferences(text) {
    if (/^References$/i.test(text)) return true;
    if (/^\[?\d+\]?\s+[A-Z][\s\S]+\d{4}/.test(text) && text.length < 500) return true;
    return false;
  }

  function normalizeText(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  function pumpQueue() {
    if (state.paused || state.cleared) return;

    while (state.running < state.concurrency && state.queue.length) {
      const item = state.queue.shift();
      translateItem(item);
    }

    if (!state.running && !state.queue.length) {
      setStatus(`完成：${state.done} 个成功，${state.failed} 个失败`);
      updateProgress();
    }
  }

  async function translateItem(item) {
    state.running += 1;
    item.attempts += 1;
    markLoading(item.element);
    updateProgress();

    try {
      let fragment;

      if (item.mode === 'segmented') {
        fragment = await translateSegmentsToFragment(item.segments);
      } else {
        const translation = await requestAcademicTranslation(item.text);
        const rendered = renderTranslationWithPlaceholders(translation, item.placeholders);
        fragment = rendered.missingTokens.length
          ? await translateSegmentsToFragment(item.segments)
          : rendered.fragment;
      }

      if (!state.cleared) {
        insertTranslation(item.element, fragment);
        state.done += 1;
      }
    } catch (error) {
      if (isExtensionContextInvalidated(error)) {
        state.cleared = true;
        state.runtimeInvalidated = true;
        state.queue = [];
        markFailed(item.element, '扩展刚刚重新加载，请刷新当前网页后再继续翻译。');
        setStatus('扩展已重新加载，请刷新当前网页');
      } else if (!state.cleared) {
        markFailed(item.element, error.message);
        state.failed += 1;
      }
    } finally {
      state.running = Math.max(0, state.running - 1);
      updateProgress();
      pumpQueue();
    }
  }

  async function requestAcademicTranslation(text) {
    const response = await chrome.runtime.sendMessage({
      action: 'translate',
      text: text,
      sourceLang: 'auto',
      targetLang: 'zh-CN',
      mode: 'academic'
    });

    if (!response || !response.success || !response.translation) {
      throw new Error(response?.error || '翻译失败');
    }

    return response.translation;
  }

  function isExtensionContextInvalidated(error) {
    return /Extension context invalidated/i.test(error?.message || '');
  }

  async function translateSegmentsToFragment(segments) {
    const fragment = document.createDocumentFragment();

    for (const segment of segments) {
      if (segment.type === 'placeholder') {
        appendPlaceholder(fragment, segment.placeholder);
        continue;
      }

      const text = normalizeText(segment.text);
      if (!text) continue;

      if (!/[a-zA-Z]/.test(text) || text.length < 2) {
        appendText(fragment, text);
        continue;
      }

      appendText(fragment, normalizeText(await requestAcademicTranslation(text)));
    }

    return fragment;
  }

  function markLoading(element) {
    element.classList.add('xiaobao-arxiv-source-loading');
  }

  function markFailed(element, message) {
    element.classList.remove('xiaobao-arxiv-source-loading');
    element.classList.add('xiaobao-arxiv-source-failed');

    const existing = element.nextElementSibling;
    if (existing && existing.classList.contains('xiaobao-arxiv-translation')) {
      existing.remove();
    }

    const error = document.createElement('div');
    error.className = 'xiaobao-arxiv-translation xiaobao-arxiv-translation-error';
    error.textContent = `翻译失败：${message || '请稍后重试'}`;
    element.insertAdjacentElement('afterend', error);
  }

  function insertTranslation(element, content) {
    element.classList.remove('xiaobao-arxiv-source-loading', 'xiaobao-arxiv-source-failed');
    element.classList.add('xiaobao-arxiv-source-translated');
    state.translatedElements.add(element);

    const existing = element.nextElementSibling;
    if (existing && existing.classList.contains('xiaobao-arxiv-translation')) {
      existing.remove();
    }

    const translationElement = document.createElement('div');
    translationElement.className = 'xiaobao-arxiv-translation';
    translationElement.appendChild(content);
    element.insertAdjacentElement('afterend', translationElement);
    applyDisplayMode();
  }

  function renderTranslationWithPlaceholders(translation, placeholders = []) {
    const fragment = document.createDocumentFragment();
    const text = normalizeText(translation);
    const tokenPattern = /XIAOBAO\s*_?\s*(MATH|REF|CITE)\s*_?\s*(\d+)\s*_?\s*TOKEN/gi;
    const restoredTokens = new Set();
    let lastIndex = 0;
    let match;

    while ((match = tokenPattern.exec(text)) !== null) {
      appendText(fragment, text.slice(lastIndex, match.index));
      const token = normalizePlaceholderToken(match[0]);
      const placeholder = placeholders.find(item => item.token === token);
      if (placeholder) {
        appendPlaceholder(fragment, placeholder);
        restoredTokens.add(token);
      } else {
        appendText(fragment, match[0]);
      }
      lastIndex = match.index + match[0].length;
    }

    appendText(fragment, text.slice(lastIndex));
    const missingTokens = placeholders
      .filter(placeholder => !restoredTokens.has(placeholder.token))
      .map(placeholder => placeholder.token);

    return { fragment, missingTokens };
  }

  function normalizePlaceholderToken(token) {
    const match = String(token).match(/XIAOBAO\s*_?\s*(MATH|REF|CITE)\s*_?\s*(\d+)\s*_?\s*TOKEN/i);
    if (!match) return String(token).replace(/\s+/g, '').toUpperCase();
    return `XIAOBAO_${match[1].toUpperCase()}_${match[2]}_TOKEN`;
  }

  function appendPlaceholder(fragment, placeholder) {
    const restored = placeholder.node.cloneNode(true);
    restored.classList?.add('xiaobao-arxiv-restored-token');
    restored.setAttribute?.('data-xiaobao-token-kind', placeholder.kind);
    fragment.appendChild(restored);
  }

  function appendText(fragment, text) {
    if (text) fragment.appendChild(document.createTextNode(text));
  }

  function updateProgress() {
    const processed = state.done + state.failed;
    const percent = state.total ? Math.round((processed / state.total) * 100) : 0;

    if (state.statusText) {
      if (state.runtimeInvalidated) {
        state.statusText.textContent = '扩展已重新加载，请刷新当前网页';
      } else {
        const runningText = state.running ? `，并发 ${state.running}` : '';
        state.statusText.textContent = state.total
          ? `正在翻译 ${processed} / ${state.total}${runningText}，失败 ${state.failed}`
          : '准备中...';
      }
    }

    if (state.progressText) {
      state.progressText.textContent = `🐆 小豹 arXiv 双语阅读 ${percent}%`;
    }

    if (state.progressBar) {
      state.progressBar.style.width = `${percent}%`;
    }
  }

  function setStatus(text) {
    if (state.statusText) state.statusText.textContent = text;
  }

  function togglePause() {
    state.paused = !state.paused;
    if (state.pauseButton) state.pauseButton.textContent = state.paused ? '继续' : '暂停';
    setStatus(state.paused ? '已暂停' : '继续翻译中...');
    if (!state.paused) pumpQueue();
  }

  function toggleDisplayMode() {
    const modes = ['bilingual', 'translation', 'source'];
    const next = modes[(modes.indexOf(state.displayMode) + 1) % modes.length];
    state.displayMode = next;

    if (state.modeButton) {
      state.modeButton.textContent = next === 'bilingual' ? '双语' : next === 'translation' ? '只看译文' : '只看原文';
    }

    applyDisplayMode();
  }

  function applyDisplayMode() {
    document.body.classList.toggle('xiaobao-arxiv-mode-translation', state.displayMode === 'translation');
    document.body.classList.toggle('xiaobao-arxiv-mode-source', state.displayMode === 'source');
  }

  function retryFailed() {
    const failedSources = Array.from(document.querySelectorAll('.xiaobao-arxiv-source-failed'));
    if (!failedSources.length) {
      setStatus('没有失败项需要重试');
      return;
    }

    failedSources.forEach(element => {
      const translation = element.nextElementSibling;
      if (translation && translation.classList.contains('xiaobao-arxiv-translation-error')) {
        translation.remove();
      }
      element.classList.remove('xiaobao-arxiv-source-failed');
      state.queue.push({ element, ...buildTranslationPayload(element), attempts: 0 });
    });

    state.failed = 0;
    state.total = state.done + state.failed + state.queue.length + state.running;
    updateProgress();
    pumpQueue();
  }

  function clearTranslations() {
    state.cleared = true;
    state.runtimeInvalidated = false;
    state.queue = [];
    state.done = 0;
    state.failed = 0;
    state.total = 0;

    document.querySelectorAll('.xiaobao-arxiv-translation').forEach(element => element.remove());
    document.querySelectorAll('.xiaobao-arxiv-source-loading, .xiaobao-arxiv-source-failed, .xiaobao-arxiv-source-translated').forEach(element => {
      element.classList.remove('xiaobao-arxiv-source-loading', 'xiaobao-arxiv-source-failed', 'xiaobao-arxiv-source-translated');
    });

    updateProgress();
    setStatus('已清除译文');
  }

  boot();
})();
