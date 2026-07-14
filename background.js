// Background Service Worker
// 处理翻译请求

// 导入术语词典
importScripts('scripts/terminology.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    translateText(request.text, request.sourceLang, request.targetLang, request.mode)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开放
  }
});

// 翻译缓存
const translationCache = new Map();
const CACHE_EXPIRY = 60 * 60 * 1000; // 1小时过期
const MAX_CACHE_SIZE = 1000;

// 主翻译函数 - 优化版：并行请求 + 缓存 + 超时控制 + 专业模式
async function translateText(text, sourceLang, targetLang, mode = 'general') {
  const startTime = Date.now();
  console.log('🐆 Translation request:', { text: text.substring(0, 50) + '...', sourceLang, targetLang });
  
  // 生成缓存key（包含模式）
  const cacheKey = `${text}_${sourceLang}_${targetLang}_${mode}`;
  
  // 检查缓存
  if (translationCache.has(cacheKey)) {
    const cached = translationCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
      console.log('🐆 Using cached translation (instant!)');
      return { ...cached.result, fromCache: true };
    } else {
      translationCache.delete(cacheKey);
    }
  }
  
  // 创建术语保护器
  const protector = new TerminologyProtector();
  
  // 检测是否包含专业术语
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  let protectedText = text;
  
  // 根据翻译方向保护术语
  if (!isChinese && targetLang === 'zh-CN') {
    protectedText = protector.protectEnglishTerms(text);
    console.log('🐆 Protected English terms');
  } else if (isChinese && targetLang !== 'zh-CN') {
    protectedText = protector.protectChineseTerms(text);
    console.log('🐆 Protected Chinese terms');
  }
  
  // 根据模式添加专业化提示
  protectedText = addModeContext(protectedText, mode, sourceLang, targetLang);
  
  // 并行请求所有API，取最快的结果
  console.log('🐆 Sending parallel requests to all translators...');
  
  const translationPromises = [
    raceWithTimeout(translateWithGoogleAPI(protectedText, sourceLang, targetLang), 8000, 'Google'),
    raceWithTimeout(translateWithMyMemory(protectedText, sourceLang, targetLang), 8000, 'MyMemory'),
    raceWithTimeout(translateWithLibreTranslate(protectedText, sourceLang, targetLang), 8000, 'LibreTranslate')
  ];
  
  try {
    // 使用 Promise.race 获取最快的结果
    const result = await Promise.race(translationPromises);
    
    // 恢复术语
    if (result.success && result.translation) {
      // 先移除上下文提示
      result.translation = removeContextPrefix(result.translation);
      // 清理翻译结果
      result.translation = cleanTranslationText(result.translation);
      // 恢复术语
      result.translation = protector.restoreTerms(result.translation);
      // 最后再次清理（处理恢复术语后可能产生的格式问题）
      result.translation = cleanTranslationText(result.translation);
      
      result.terminologyProtected = true;
      
      const elapsed = Date.now() - startTime;
      console.log(`🐆 Translation successful in ${elapsed}ms using ${result.provider}!`);
      console.log('🐆 Original:', text.substring(0, 50));
      console.log('🐆 Translated:', result.translation.substring(0, 50));
      
      // 缓存结果
      translationCache.set(cacheKey, {
        result: result,
        timestamp: Date.now()
      });
      
      // 清理旧缓存（保持缓存大小）
      if (translationCache.size > MAX_CACHE_SIZE) {
        const firstKey = translationCache.keys().next().value;
        translationCache.delete(firstKey);
      }
      
      return result;
    }
  } catch (error) {
    console.warn('🐆 All translators failed or timed out:', error.message);
  }
  
  // 如果并行请求都失败，尝试顺序请求（降级方案）
  console.log('🐆 Trying sequential fallback...');
  
  const translators = [
    () => translateWithGoogleAPI(protectedText, sourceLang, targetLang),
    () => translateWithMyMemory(protectedText, sourceLang, targetLang)
  ];
  
  for (let i = 0; i < translators.length; i++) {
    try {
      const result = await translators[i]();
      if (result.success && result.translation) {
        // 清理和恢复术语
        result.translation = removeContextPrefix(result.translation);
        result.translation = cleanTranslationText(result.translation);
        result.translation = protector.restoreTerms(result.translation);
        result.translation = cleanTranslationText(result.translation);
        return result;
      }
    } catch (error) {
      console.warn('🐆 Fallback attempt failed:', error.message);
      continue;
    }
  }
  
  return {
    success: false,
    error: 'All translation services are currently unavailable. Please try again.'
  };
}

// 超时竞速函数
function raceWithTimeout(promise, timeout, providerName) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`${providerName} timeout after ${timeout}ms`)), timeout)
    )
  ]);
}

// HTML实体解码函数
function decodeHTMLEntities(text) {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&nbsp;': ' ',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&apos;': "'"
  };
  
  return text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

// 清理翻译结果中的特殊字符和格式问题
function cleanTranslationText(text) {
  if (!text) return text;
  
  // 解码HTML实体
  let cleaned = decodeHTMLEntities(text);
  
  // 移除多余的空白字符
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  // 修复常见的乱码模式
  // 移除零宽字符
  cleaned = cleaned.replace(/[\u200B-\u200D\uFEFF]/g, '');
  
  return cleaned;
}

// 方案1：Google Translate (免费接口) - 优化版
async function translateWithGoogleAPI(text, sourceLang, targetLang) {
  const sl = sourceLang === 'auto' ? 'auto' : (sourceLang === 'zh-CN' ? 'zh-CN' : 'en');
  const tl = targetLang === 'zh-CN' ? 'zh-CN' : 'en';
  
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Accept-Charset': 'utf-8'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data[0] && Array.isArray(data[0])) {
      const translation = data[0]
        .filter(item => item && item[0])
        .map(item => item[0])
        .join('');
      
      if (translation && translation.trim()) {
        // 清理翻译结果
        let cleanedTranslation = removeContextPrefix(translation);
        cleanedTranslation = cleanTranslationText(cleanedTranslation);
        
        return {
          success: true,
          translation: cleanedTranslation,
          sourceLang: sourceLang,
          targetLang: targetLang,
          provider: 'Google'
        };
      }
    }
    
    throw new Error('Parse failed');
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 方案2：MyMemory 翻译 API - 优化版
async function translateWithMyMemory(text, sourceLang, targetLang) {
  const sl = sourceLang === 'zh-CN' ? 'zh' : 'en';
  const tl = targetLang === 'zh-CN' ? 'zh' : 'en';
  
  const langPair = `${sl}|${tl}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'Accept-Charset': 'utf-8'
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      // 清理翻译结果
      let cleanedTranslation = removeContextPrefix(data.responseData.translatedText);
      cleanedTranslation = cleanTranslationText(cleanedTranslation);
      
      return {
        success: true,
        translation: cleanedTranslation,
        sourceLang: sourceLang,
        targetLang: targetLang,
        provider: 'MyMemory'
      };
    }
    
    throw new Error('Invalid response');
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 方案3：LibreTranslate (开源翻译API) - 优化版
async function translateWithLibreTranslate(text, sourceLang, targetLang) {
  const sl = sourceLang === 'zh-CN' ? 'zh' : 'en';
  const tl = targetLang === 'zh-CN' ? 'zh' : 'en';
  
  const url = 'https://libretranslate.de/translate';
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept-Charset': 'utf-8'
      },
      body: JSON.stringify({
        q: text,
        source: sl,
        target: tl,
        format: 'text'
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.translatedText) {
      // 清理翻译结果
      let cleanedTranslation = removeContextPrefix(data.translatedText);
      cleanedTranslation = cleanTranslationText(cleanedTranslation);
      
      return {
        success: true,
        translation: cleanedTranslation,
        sourceLang: sourceLang,
        targetLang: targetLang,
        provider: 'LibreTranslate'
      };
    }
    
    throw new Error('Invalid response');
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 安装时的欢迎信息
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('🐆 Little Leopard Translator installed!');
    console.log('💡 Translation services: Google Translate, MyMemory, LibreTranslate');
    console.log('⚡ Features: Parallel requests, Smart caching, 5s timeout');
  }
});

// 根据模式添加专业化上下文提示 - 增强版
function addModeContext(text, mode, sourceLang, targetLang) {
  if (mode === 'general') {
    return text;
  }
  
  const isChinese = sourceLang === 'zh-CN';
  let contextPrefix = '';
  
  // 检测术语密度，调整提示强度
  const termDensity = detectTerminologyDensity(text);
  const isHighDensity = termDensity > 0.3;
  
  switch (mode) {
    case 'technical':
      if (isChinese) {
        contextPrefix = isHighDensity ? 
          '[高密度技术文档翻译，严格保持专业术语] ' : 
          '[技术文档翻译] ';
      } else {
        contextPrefix = isHighDensity ? 
          '[High-density Technical Translation - Strictly preserve technical terms] ' :
          '[Technical Translation] ';
      }
      break;
      
    case 'academic':
      if (isChinese) {
        contextPrefix = '[学术论文翻译，保持专业术语准确性，遵循学术翻译标准] ';
      } else {
        contextPrefix = '[Academic Paper Translation - Maintain technical accuracy and academic standards] ';
      }
      break;
      
    case 'd2l':
      if (isChinese) {
        contextPrefix = '[《动手学深度学习》专业翻译：保持数学公式、算法名称、技术术语的准确性，使用教材标准译名] ';
      } else {
        contextPrefix = '["Dive into Deep Learning" Professional Translation: Preserve mathematical formulas, algorithm names, technical terms with textbook standard translations] ';
      }
      break;
      
    case 'ai':
      if (isChinese) {
        contextPrefix = '[AI/机器学习专业翻译，保持模型名称、算法术语、评估指标的准确性] ';
      } else {
        contextPrefix = '[AI/ML Professional Translation - Preserve model names, algorithmic terms, evaluation metrics] ';
      }
      break;
  }
  
  return contextPrefix + text;
}

// 检测术语密度
function detectTerminologyDensity(text) {
  if (!text || typeof TERMINOLOGY === 'undefined') return 0;
  
  const words = text.toLowerCase().split(/\s+/);
  const termCount = words.filter(word => 
    TERMINOLOGY[word] || 
    Object.keys(TERMINOLOGY).some(term => term.includes(word) || word.includes(term))
  ).length;
  
  return words.length > 0 ? termCount / words.length : 0;
}

// 清理翻译结果中的上下文提示
function removeContextPrefix(text) {
  if (!text) return text;
  
  // 移除各种上下文提示前缀（使用更通用的模式）
  const prefixPatterns = [
    // 中文提示模式
    /^\[.*?技术.*?翻译.*?\]\s*/i,
    /^\[.*?学术.*?翻译.*?\]\s*/i,
    /^\[.*?专业翻译.*?\]\s*/i,
    /^\[.*?动手学深度学习.*?\]\s*/i,
    /^\[.*?深度学习.*?翻译.*?\]\s*/i,
    /^\[.*?机器学习.*?翻译.*?\]\s*/i,
    /^\[.*?AI.*?翻译.*?\]\s*/i,
    /^\[《.*?》.*?翻译.*?\]\s*/i,
    /^\[高密度.*?翻译.*?\]\s*/i,
    /^【.*?技术.*?翻译.*?】\s*/i,
    /^【.*?学术.*?翻译.*?】\s*/i,
    /^【.*?专业.*?翻译.*?】\s*/i,
    /^【.*?机器学习.*?翻译.*?】\s*/i,
    /^【.*?AI.*?翻译.*?】\s*/i,
    /^（.*?技术.*?翻译.*?）\s*/i,
    /^（.*?学术.*?翻译.*?）\s*/i,
    /^（.*?专业.*?翻译.*?）\s*/i,
    
    // 英文提示模式
    /^\[.*?Technical.*?Translation.*?\]\s*/i,
    /^\[.*?Academic.*?Translation.*?\]\s*/i,
    /^\[.*?Professional.*?Translation.*?\]\s*/i,
    /^\[.*?Dive into Deep Learning.*?\]\s*/i,
    /^\[.*?Deep Learning.*?Translation.*?\]\s*/i,
    /^\[.*?Machine Learning.*?Translation.*?\]\s*/i,
    /^\[.*?AI.*?ML.*?Translation.*?\]\s*/i,
    /^\[".*?".*?Translation.*?\]\s*/i,
    /^\[High-density.*?Translation.*?\]\s*/i,
    /^【.*?Technical.*?Translation.*?】\s*/i,
    /^【.*?Academic.*?Translation.*?】\s*/i,
    /^【.*?Professional.*?Translation.*?】\s*/i,
    /^\(.*?Technical.*?Translation.*?\)\s*/i,
    /^\(.*?Academic.*?Translation.*?\)\s*/i,
    /^\(.*?Professional.*?Translation.*?\)\s*/i,
    
    // 通用方括号提示（最后兜底，但要谨慎）
    /^\[[\u4e00-\u9fa5a-zA-Z0-9\s,，、。：:；;！!？?\-\—\–\/]+\]\s*/,
    /^【[\u4e00-\u9fa5a-zA-Z0-9\s,，、。：:；;！!？?\-\—\–\/]+】\s*/
  ];
  
  let cleaned = text;
  let maxIterations = 5; // 防止无限循环
  let iteration = 0;
  
  // 多次尝试清理，因为可能有多个前缀
  while (iteration < maxIterations) {
    let foundMatch = false;
    for (const pattern of prefixPatterns) {
      const before = cleaned;
      cleaned = cleaned.replace(pattern, '');
      if (before !== cleaned) {
        foundMatch = true;
        break; // 找到一个匹配后重新开始
      }
    }
    if (!foundMatch) break; // 没有找到更多匹配，退出
    iteration++;
  }
  
  return cleaned.trim();
}

// 定期清理过期缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of translationCache.entries()) {
    if (now - value.timestamp >= CACHE_EXPIRY) {
      translationCache.delete(key);
    }
  }
  console.log(`🐆 Cache cleaned. Current size: ${translationCache.size}`);
}, 10 * 60 * 1000); // 每10分钟清理一次

