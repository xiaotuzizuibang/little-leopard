// 术语系统浏览器加载器
// Terminology System Browser Loader

// 这个文件作为浏览器环境的入口，加载所有术语模块

// 由于Chrome扩展的限制，我们需要将所有术语直接包含在这个文件中
// 而不是动态加载多个文件

// 深度学习基础术语
const DEEP_LEARNING_BASICS = {
  // 基础概念
  'deep learning': '深度学习',
  'machine learning': '机器学习',
  'artificial intelligence': '人工智能',
  'neural network': '神经网络',
  'artificial neural network': '人工神经网络',
  'perceptron': '感知机',
  'multilayer perceptron': '多层感知机',
  'MLP': '多层感知机',
  
  // 网络层类型
  'layer': '层',
  'hidden layer': '隐藏层',
  'input layer': '输入层',
  'output layer': '输出层',
  'fully connected layer': '全连接层',
  'dense layer': '密集层',
  'linear layer': '线性层',
  
  // 激活函数
  'activation function': '激活函数',
  'ReLU': 'ReLU',
  'rectified linear unit': '修正线性单元',
  'sigmoid': 'Sigmoid',
  'tanh': 'Tanh',
  'softmax': 'Softmax',
  'leaky ReLU': 'Leaky ReLU',
  'ELU': 'ELU',
  'GELU': 'GELU',
  
  // 前向和反向传播
  'forward pass': '前向传播',
  'forward propagation': '前向传播',
  'backward pass': '反向传播',
  'backward propagation': '反向传播',
  'backpropagation': '反向传播',
  'gradient': '梯度',
  'parameter': '参数',
  'weight': '权重',
  'bias': '偏置',
  
  // 损失函数
  'loss function': '损失函数',
  'cost function': '代价函数',
  'objective function': '目标函数',
  'mean squared error': '均方误差',
  'MSE': '均方误差',
  'cross entropy': '交叉熵',
  'binary cross entropy': '二元交叉熵',
  'categorical cross entropy': '分类交叉熵',
  'sparse categorical cross entropy': '稀疏分类交叉熵',
  
  // 训练相关
  'training': '训练',
  'inference': '推理',
  'prediction': '预测',
  'epoch': '轮次',
  'iteration': '迭代',
  'batch': '批次',
  'mini-batch': '小批次',
  'batch size': '批量大小',
  'learning rate': '学习率',
  'hyperparameter': '超参数',
  
  // 数据集
  'dataset': '数据集',
  'training set': '训练集',
  'validation set': '验证集',
  'test set': '测试集',
  'training data': '训练数据',
  'validation data': '验证数据',
  'test data': '测试数据'
};

// 数学和统计术语
const MATHEMATICS_STATISTICS = {
  // 概率论
  'probability': '概率',
  'probability distribution': '概率分布',
  'gaussian distribution': '高斯分布',
  'normal distribution': '正态分布',
  'uniform distribution': '均匀分布',
  'bernoulli distribution': '伯努利分布',
  'binomial distribution': '二项分布',
  'multinomial distribution': '多项分布',
  'poisson distribution': '泊松分布',
  'exponential distribution': '指数分布',
  
  // 统计量
  'expectation': '期望',
  'expected value': '期望值',
  'mean': '均值',
  'variance': '方差',
  'standard deviation': '标准差',
  'covariance': '协方差',
  'correlation': '相关性',
  'correlation coefficient': '相关系数',
  'independence': '独立性',
  'conditional probability': '条件概率',
  'joint probability': '联合概率',
  'marginal probability': '边际概率',
  
  // 贝叶斯理论
  'bayes theorem': '贝叶斯定理',
  'bayes rule': '贝叶斯法则',
  'prior': '先验',
  'posterior': '后验',
  'likelihood': '似然',
  'maximum likelihood': '最大似然',
  'maximum likelihood estimation': '最大似然估计',
  'MLE': '最大似然估计',
  'maximum a posteriori': '最大后验',
  'MAP': '最大后验',
  
  // 线性代数
  'linear algebra': '线性代数',
  'matrix': '矩阵',
  'vector': '向量',
  'scalar': '标量',
  'tensor': '张量',
  'dot product': '点积',
  'inner product': '内积',
  'cross product': '叉积',
  'outer product': '外积',
  'matrix multiplication': '矩阵乘法',
  'element-wise multiplication': '逐元素乘法',
  'hadamard product': 'Hadamard乘积',
  
  // 矩阵运算
  'transpose': '转置',
  'inverse': '逆矩阵',
  'determinant': '行列式',
  'trace': '迹',
  'rank': '秩',
  'eigenvalue': '特征值',
  'eigenvector': '特征向量',
  'eigendecomposition': '特征分解',
  'singular value decomposition': '奇异值分解',
  'SVD': '奇异值分解',
  'principal component analysis': '主成分分析',
  'PCA': '主成分分析',
  
  // 微积分
  'calculus': '微积分',
  'derivative': '导数',
  'partial derivative': '偏导数',
  'gradient': '梯度',
  'jacobian': '雅可比矩阵',
  'hessian': '海塞矩阵',
  'chain rule': '链式法则',
  'automatic differentiation': '自动微分',
  'autodiff': '自动微分',
  
  // 优化理论
  'optimization': '优化',
  'convex': '凸',
  'concave': '凹',
  'convex function': '凸函数',
  'convex optimization': '凸优化',
  'non-convex optimization': '非凸优化',
  'local minimum': '局部最小值',
  'global minimum': '全局最小值',
  'local maximum': '局部最大值',
  'global maximum': '全局最大值',
  'saddle point': '鞍点',
  'critical point': '临界点',
  'stationary point': '驻点'
};

// D2L专用术语 - 扩展版
const D2L_SPECIFIC = {
  // D2L相关
  'dive into deep learning': '动手学深度学习',
  'd2l': 'D2L',
  'mxnet': 'MXNet',
  'gluon': 'Gluon',
  'pytorch': 'PyTorch',
  'tensorflow': 'TensorFlow',
  
  // 编程范式
  'symbolic programming': '符号式编程',
  'imperative programming': '命令式编程',
  'hybrid programming': '混合式编程',
  'computational graph': '计算图',
  'dynamic graph': '动态图',
  'static graph': '静态图',
  'define-by-run': '动态定义',
  'define-and-run': '静态定义',
  
  // 自动微分
  'automatic differentiation': '自动微分',
  'autodiff': '自动微分',
  'forward mode': '前向模式',
  'reverse mode': '反向模式',
  'backpropagation through time': '时间反向传播',
  'BPTT': '时间反向传播',
  
  // D2L章节特定术语
  'multilayer perceptron': '多层感知机',
  'universal approximation theorem': '万能逼近定理',
  'vanishing gradient problem': '梯度消失问题',
  'exploding gradient problem': '梯度爆炸问题',
  'batch normalization': '批量归一化',
  'layer normalization': '层归一化',
  'residual connection': '残差连接',
  'skip connection': '跳跃连接',
  'attention mechanism': '注意力机制',
  'sequence to sequence': '序列到序列',
  'seq2seq': '序列到序列',
  'encoder-decoder': '编码器-解码器',
  'beam search': '束搜索',
  'teacher forcing': '教师强制',
  'word2vec': 'Word2Vec',
  'glove': 'GloVe',
  'fasttext': 'FastText',
  'subword': '子词',
  'byte pair encoding': '字节对编码',
  'BPE': '字节对编码'
};

// 优化算法术语（精选）
const OPTIMIZATION_ALGORITHMS = {
  'optimizer': '优化器',
  'gradient descent': '梯度下降',
  'stochastic gradient descent': '随机梯度下降',
  'SGD': 'SGD',
  'momentum': '动量',
  'Adam': 'Adam优化器',
  'learning rate scheduling': '学习率调度',
  'regularization': '正则化',
  'dropout': 'Dropout',
  'batch normalization': '批量归一化',
  'layer normalization': '层归一化',
  'overfitting': '过拟合',
  'underfitting': '欠拟合',
  'early stopping': '早停'
};

// 神经网络架构术语（精选）
const NEURAL_ARCHITECTURES = {
  'convolutional neural network': '卷积神经网络',
  'CNN': '卷积神经网络',
  'convolution': '卷积',
  'pooling': '池化',
  'max pooling': '最大池化',
  'recurrent neural network': '循环神经网络',
  'RNN': '循环神经网络',
  'LSTM': 'LSTM',
  'GRU': 'GRU',
  'attention': '注意力',
  'self-attention': '自注意力',
  'transformer': 'Transformer',
  'encoder': '编码器',
  'decoder': '解码器',
  'ResNet': 'ResNet',
  'BERT': 'BERT',
  'GPT': 'GPT'
};

// 计算机视觉术语（精选）
const COMPUTER_VISION = {
  'computer vision': '计算机视觉',
  'image classification': '图像分类',
  'object detection': '目标检测',
  'image segmentation': '图像分割',
  'semantic segmentation': '语义分割',
  'feature extraction': '特征提取',
  'data augmentation': '数据增强'
};

// 自然语言处理术语（精选）
const NATURAL_LANGUAGE_PROCESSING = {
  'natural language processing': '自然语言处理',
  'NLP': 'NLP',
  'tokenization': '分词',
  'word embedding': '词嵌入',
  'language model': '语言模型',
  'machine translation': '机器翻译',
  'sentiment analysis': '情感分析',
  'large language model': '大语言模型',
  'LLM': '大语言模型',
  'prompt': '提示',
  'fine-tuning': '微调',
  'pre-training': '预训练'
};

// 合并所有术语
const TERMINOLOGY = {
  ...DEEP_LEARNING_BASICS,
  ...MATHEMATICS_STATISTICS,
  ...D2L_SPECIFIC,
  ...OPTIMIZATION_ALGORITHMS,
  ...NEURAL_ARCHITECTURES,
  ...COMPUTER_VISION,
  ...NATURAL_LANGUAGE_PROCESSING
};

// 创建反向词典（中文到英文）
const REVERSE_TERMINOLOGY = {};
Object.entries(TERMINOLOGY).forEach(([en, zh]) => {
  REVERSE_TERMINOLOGY[zh] = en;
});

// 术语保护器类
class TerminologyProtector {
  constructor() {
    this.placeholders = new Map();
    this.counter = 0;
  }
  
  // 保护英文术语（翻译成中文时）
  protectEnglishTerms(text, mode = 'general') {
    let protectedText = text;
    
    // 按长度排序，优先匹配长术语
    const sortedTerms = Object.keys(TERMINOLOGY).sort((a, b) => b.length - a.length);
    
    sortedTerms.forEach(term => {
      const regex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'gi');
      
      protectedText = protectedText.replace(regex, (match) => {
        const placeholder = `XTERM${this.counter}X`;
        const translation = TERMINOLOGY[term.toLowerCase()] || TERMINOLOGY[term];
        if (translation) {
          this.placeholders.set(placeholder, translation);
          this.counter++;
          return placeholder;
        }
        return match;
      });
    });
    
    return protectedText;
  }
  
  // 保护中文术语（翻译成英文时）
  protectChineseTerms(text, mode = 'general') {
    let protectedText = text;
    
    // 按长度排序，优先匹配长术语
    const sortedTerms = Object.keys(REVERSE_TERMINOLOGY).sort((a, b) => b.length - a.length);
    
    sortedTerms.forEach(term => {
      if (protectedText.includes(term)) {
        const regex = new RegExp(this.escapeRegex(term), 'g');
        protectedText = protectedText.replace(regex, (match) => {
          const placeholder = `XTERM${this.counter}X`;
          const translation = REVERSE_TERMINOLOGY[term];
          this.placeholders.set(placeholder, translation);
          this.counter++;
          return placeholder;
        });
      }
    });
    
    return protectedText;
  }
  
  // 恢复术语
  restoreTerms(text) {
    if (!text) return text;
    
    let restoredText = text;
    
    // 按占位符编号倒序恢复，避免占位符相互干扰
    const sortedPlaceholders = Array.from(this.placeholders.entries())
      .sort((a, b) => {
        const numA = parseInt(a[0].match(/\d+/)[0]);
        const numB = parseInt(b[0].match(/\d+/)[0]);
        return numB - numA;
      });
    
    sortedPlaceholders.forEach(([placeholder, term]) => {
      restoredText = restoredText.split(placeholder).join(term);
    });
    
    return restoredText;
  }
  
  // 辅助函数：转义正则表达式特殊字符
  escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // 重置
  reset() {
    this.placeholders.clear();
    this.counter = 0;
  }
}

// 导出（兼容原有接口）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TERMINOLOGY, REVERSE_TERMINOLOGY, TerminologyProtector };
}

// D2L上下文智能检测器
class D2LContextDetector {
  constructor() {
    this.d2lIndicators = [
      // 网站特征
      'd2l.ai', 'zh.d2l.ai', 'en.d2l.ai',
      // 标题特征
      'dive into deep learning', '动手学深度学习',
      // 内容特征
      'mxnet', 'gluon', 'pytorch implementation',
      // 章节特征
      'linear regression', 'multilayer perceptron', 'convolutional neural network',
      '线性回归', '多层感知机', '卷积神经网络'
    ];
    
    this.d2lTermPatterns = [
      /d2l\.ai/i,
      /dive\s+into\s+deep\s+learning/i,
      /动手学深度学习/,
      /mxnet|gluon/i,
      /\.forward\(\)|\.backward\(\)/,
      /with\s+torch\.no_grad\(\)/i
    ];
  }
  
  // 检测是否为D2L相关内容
  isD2LContent(text, url = '') {
    // URL检测
    if (url && this.d2lIndicators.some(indicator => url.includes(indicator))) {
      return true;
    }
    
    // 内容模式匹配
    const patternMatches = this.d2lTermPatterns.filter(pattern => 
      pattern.test(text)
    ).length;
    
    // 术语密度检测
    const d2lTerms = Object.keys(D2L_SPECIFIC);
    const termMatches = d2lTerms.filter(term => 
      text.toLowerCase().includes(term.toLowerCase())
    ).length;
    
    // 综合判断
    return patternMatches >= 1 || termMatches >= 2;
  }
  
  // 获取D2L特定的术语增强
  getD2LEnhancement(text) {
    const enhancements = [];
    
    // 检测代码模式
    if (/import torch|from torch|\.cuda\(\)|\.to\(device\)/.test(text)) {
      enhancements.push('pytorch-code');
    }
    
    if (/from mxnet|import mxnet|\.gluon\./.test(text)) {
      enhancements.push('mxnet-code');
    }
    
    // 检测数学公式
    if (/\\[a-zA-Z]+\{|\\frac|\\sum|\\prod|\$.*\$/.test(text)) {
      enhancements.push('mathematical');
    }
    
    // 检测算法描述
    if (/algorithm|procedure|step \d+|initialize|repeat|until/i.test(text)) {
      enhancements.push('algorithmic');
    }
    
    return enhancements;
  }
}

// 创建全局实例
const d2lDetector = new D2LContextDetector();

console.log(`🐆 Terminology system loaded: ${Object.keys(TERMINOLOGY).length} terms`);