export interface Requirement {
  id: string;
  name: string;
  description: string;
  module: string;
  targetUser: string;
  goal: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  totalScore: number;
  businessScore: number;
  userScore: number;
  strategyScore: number;
  costDeduction: number;
  riskDeduction: number;
  graphBonus: number;
  relatedCount: number;
  dependencyCount: number;
  conflictCount: number;
  aiSuggestion: string;
  status: '待评估' | '已评分' | '已排期' | '已上线' | '已延后';
  riskLevel: '高' | '中' | '低';
  isGraphCore: boolean;
  hasDependency: boolean;
  alignsWithStrategy: boolean;
  source: string;
  impactPath: string;
  aiExplanation: string;
  quarter?: string;
}

export const requirements: Requirement[] = [
  {
    id: 'REQ-001', name: '微信一键登录', description: '支持微信授权快捷登录，减少注册流失',
    module: '用户系统', targetUser: '新用户', goal: '提升注册转化',
    priority: 'P0', totalScore: 92, businessScore: 9.5, userScore: 9.0, strategyScore: 8.8,
    costDeduction: -5, riskDeduction: -3, graphBonus: 12, relatedCount: 6, dependencyCount: 1, conflictCount: 0,
    aiSuggestion: '立即进入本期', status: '已评分', riskLevel: '低', isGraphCore: true,
    hasDependency: true, alignsWithStrategy: true, source: '用户调研', impactPath: '注册→激活→留存',
    aiExplanation: '该需求同时满足高用户覆盖、明确改善转化漏斗、是注册链路关键节点，且实现成本较低', quarter: 'Q3 2026'
  },
  {
    id: 'REQ-002', name: '首页加载优化', description: '将首页加载时间从3.2s优化至1.5s以内',
    module: '性能', targetUser: '全部用户', goal: '提升留存',
    priority: 'P0', totalScore: 88, businessScore: 9.0, userScore: 9.2, strategyScore: 8.5,
    costDeduction: -8, riskDeduction: -5, graphBonus: 8, relatedCount: 4, dependencyCount: 0, conflictCount: 0,
    aiSuggestion: '立即进入本期', status: '已评分', riskLevel: '低', isGraphCore: true,
    hasDependency: false, alignsWithStrategy: true, source: '数据分析', impactPath: '打开→浏览→转化',
    aiExplanation: '首页加载速度直接影响跳出率，数据表明每延迟1s流失率增加7%', quarter: 'Q3 2026'
  },
  {
    id: 'REQ-003', name: '支付成功页推荐改版', description: '优化支付成功页的商品推荐算法和展示',
    module: '交易系统', targetUser: '付费用户', goal: '提升转化链路',
    priority: 'P1', totalScore: 84, businessScore: 8.8, userScore: 7.5, strategyScore: 8.5,
    costDeduction: -6, riskDeduction: -4, graphBonus: 6, relatedCount: 3, dependencyCount: 1, conflictCount: 0,
    aiSuggestion: '建议本期排入', status: '已评分', riskLevel: '中', isGraphCore: false,
    hasDependency: true, alignsWithStrategy: true, source: '业务需求', impactPath: '支付→复购→LTV',
    aiExplanation: '支付成功页是高意向场景，推荐优化可提升复购率约15%', quarter: 'Q3 2026'
  },
  {
    id: 'REQ-004', name: '会员权益页重构', description: '重新设计会员权益展示，提升开通转化',
    module: '会员系统', targetUser: '活跃用户', goal: '提升收入',
    priority: 'P1', totalScore: 79, businessScore: 8.5, userScore: 7.0, strategyScore: 8.0,
    costDeduction: -10, riskDeduction: -6, graphBonus: 4, relatedCount: 5, dependencyCount: 2, conflictCount: 1,
    aiSuggestion: '建议本期排入', status: '已评分', riskLevel: '中', isGraphCore: true,
    hasDependency: true, alignsWithStrategy: true, source: '产品规划', impactPath: '浏览→开通→续费',
    aiExplanation: '会员收入占比30%，权益页是核心转化节点，但依赖支付系统稳定', quarter: 'Q4 2026'
  },
  {
    id: 'REQ-005', name: '新手引导优化', description: '重新设计新手引导流程，提升激活率',
    module: '用户系统', targetUser: '新用户', goal: '提升激活',
    priority: 'P1', totalScore: 76, businessScore: 7.5, userScore: 8.5, strategyScore: 7.8,
    costDeduction: -7, riskDeduction: -4, graphBonus: 5, relatedCount: 3, dependencyCount: 1, conflictCount: 0,
    aiSuggestion: '建议排入', status: '待评估', riskLevel: '低', isGraphCore: false,
    hasDependency: true, alignsWithStrategy: true, source: '用户反馈', impactPath: '注册→引导→激活',
    aiExplanation: '新手引导完成率仅42%，优化后预计提升至65%', quarter: 'Q4 2026'
  },
  {
    id: 'REQ-006', name: '社区功能', description: '构建用户社区，增加用户粘性和互动',
    module: '社区', targetUser: '活跃用户', goal: '提升留存',
    priority: 'P2', totalScore: 62, businessScore: 6.0, userScore: 7.0, strategyScore: 5.5,
    costDeduction: -15, riskDeduction: -8, graphBonus: 2, relatedCount: 2, dependencyCount: 3, conflictCount: 1,
    aiSuggestion: '建议延后', status: '待评估', riskLevel: '高', isGraphCore: false,
    hasDependency: true, alignsWithStrategy: false, source: '竞品分析', impactPath: '社区→互动→留存',
    aiExplanation: '社区功能与当前增长目标关联度低，且会挤占主链路资源', quarter: '2027 H1'
  },
  {
    id: 'REQ-007', name: '支付链路修复', description: '修复支付过程中的异常中断和超时问题',
    module: '交易系统', targetUser: '付费用户', goal: '修复转化漏损',
    priority: 'P0', totalScore: 90, businessScore: 9.2, userScore: 8.0, strategyScore: 9.0,
    costDeduction: -4, riskDeduction: -2, graphBonus: 10, relatedCount: 5, dependencyCount: 0, conflictCount: 0,
    aiSuggestion: '立即修复', status: '已评分', riskLevel: '低', isGraphCore: true,
    hasDependency: false, alignsWithStrategy: true, source: '线上监控', impactPath: '下单→支付→完成',
    aiExplanation: '支付失败率达8%，修复后预计降至1%以内，直接提升GMV', quarter: 'Q3 2026'
  },
  {
    id: 'REQ-008', name: '皮肤主题功能', description: '支持用户自定义APP主题和皮肤',
    module: '个性化', targetUser: '全部用户', goal: '提升体验',
    priority: 'P2', totalScore: 45, businessScore: 4.0, userScore: 6.5, strategyScore: 3.0,
    costDeduction: -12, riskDeduction: -5, graphBonus: 0, relatedCount: 0, dependencyCount: 0, conflictCount: 0,
    aiSuggestion: '可选', status: '待评估', riskLevel: '低', isGraphCore: false,
    hasDependency: false, alignsWithStrategy: false, source: '用户反馈', impactPath: '使用→满意度',
    aiExplanation: '用户需求存在但非痛点，对核心指标影响有限', quarter: '2027 H1'
  },
  {
    id: 'REQ-009', name: '积分商城', description: '搭建积分兑换商城，激励用户活跃',
    module: '运营', targetUser: '活跃用户', goal: '提升活跃',
    priority: 'P3', totalScore: 38, businessScore: 5.0, userScore: 5.5, strategyScore: 4.0,
    costDeduction: -18, riskDeduction: -10, graphBonus: 1, relatedCount: 1, dependencyCount: 4, conflictCount: 0,
    aiSuggestion: '建议延后', status: '待评估', riskLevel: '高', isGraphCore: false,
    hasDependency: true, alignsWithStrategy: false, source: '运营需求', impactPath: '活跃→积分→兑换',
    aiExplanation: '依赖账户体系、会员体系、支付体系均完成，当前基础设施不满足', quarter: '2027 H1'
  },
  {
    id: 'REQ-010', name: '用户分层能力建设', description: '构建用户标签和分层体系，支撑精细化运营',
    module: '数据', targetUser: '运营团队', goal: '提升运营效率',
    priority: 'P1', totalScore: 75, businessScore: 7.8, userScore: 6.0, strategyScore: 8.5,
    costDeduction: -12, riskDeduction: -6, graphBonus: 8, relatedCount: 7, dependencyCount: 1, conflictCount: 0,
    aiSuggestion: '建议下期排入', status: '已评分', riskLevel: '中', isGraphCore: true,
    hasDependency: true, alignsWithStrategy: true, source: '数据团队', impactPath: '数据→标签→策略→转化',
    aiExplanation: '是多个下游需求的基础能力，图谱中有7个需求依赖此节点', quarter: 'Q4 2026'
  },
  {
    id: 'REQ-011', name: '会员体系重构', description: '重新设计会员等级和权益体系',
    module: '会员系统', targetUser: '付费用户', goal: '提升LTV',
    priority: 'P1', totalScore: 72, businessScore: 8.0, userScore: 7.0, strategyScore: 7.5,
    costDeduction: -15, riskDeduction: -12, graphBonus: 5, relatedCount: 4, dependencyCount: 3, conflictCount: 2,
    aiSuggestion: '建议拆分两期', status: '已评分', riskLevel: '高', isGraphCore: true,
    hasDependency: true, alignsWithStrategy: true, source: '产品规划', impactPath: '会员→权益→续费→LTV',
    aiExplanation: '依赖支付系统和账户中心，建议先做权益展示，再做完整订阅体系', quarter: 'Q4 2026'
  },
  {
    id: 'REQ-012', name: '埋点体系完善', description: '补全核心链路的数据埋点',
    module: '数据', targetUser: '产品团队', goal: '数据支撑',
    priority: 'P1', totalScore: 70, businessScore: 6.5, userScore: 5.0, strategyScore: 8.0,
    costDeduction: -6, riskDeduction: -3, graphBonus: 10, relatedCount: 8, dependencyCount: 0, conflictCount: 0,
    aiSuggestion: '建议尽早排入', status: '待评估', riskLevel: '低', isGraphCore: true,
    hasDependency: false, alignsWithStrategy: true, source: '数据团队', impactPath: '埋点→分析→决策',
    aiExplanation: '8个需求的评分依赖数据验证，埋点是基础设施', quarter: 'Q3 2026'
  },
];

export const scoringDimensions = [
  {
    id: 'business', name: '业务价值', weight: 0.3,
    children: [
      { id: 'b1', name: '对核心目标支持度', question: '该需求对当前核心业务目标的支持程度？', labels: ['很弱', '较弱', '一般', '较强', '很强'] },
      { id: 'b2', name: '对关键指标影响', question: '该需求对关键业务指标的影响程度？', labels: ['无影响', '轻微', '一般', '显著', '决定性'] },
      { id: 'b3', name: '商业收益潜力', question: '该需求的商业收益潜力有多大？', labels: ['极低', '较低', '中等', '较高', '极高'] },
    ]
  },
  {
    id: 'user', name: '用户价值', weight: 0.25,
    children: [
      { id: 'u1', name: '目标用户覆盖', question: '该需求影响的用户规模有多大？', labels: ['极小', '小', '中', '大', '极大'] },
      { id: 'u2', name: '痛点强度', question: '该需求解决的用户痛点有多强？', labels: ['无感', '轻微', '一般', '强烈', '极度痛苦'] },
      { id: 'u3', name: '使用频率', question: '该功能的预期使用频率？', labels: ['极少', '偶尔', '一般', '频繁', '每日必用'] },
    ]
  },
  {
    id: 'strategy', name: '战略价值', weight: 0.2,
    children: [
      { id: 's1', name: '是否符合阶段战略', question: '该需求与当前阶段战略的吻合程度？', labels: ['不符', '较弱', '一般', '符合', '高度吻合'] },
      { id: 's2', name: '是否形成长期能力', question: '该需求是否有助于形成长期竞争能力？', labels: ['否', '较弱', '一般', '是', '核心能力'] },
      { id: 's3', name: '是否增强壁垒', question: '该需求是否增强产品竞争壁垒？', labels: ['否', '轻微', '一般', '是', '显著增强'] },
    ]
  },
  {
    id: 'cost', name: '实施成本', weight: 0.15,
    children: [
      { id: 'c1', name: '研发成本', question: '研发实现的工作量和复杂度？', labels: ['极低', '较低', '中等', '较高', '极高'] },
      { id: 'c2', name: '设计成本', question: '设计工作的复杂度？', labels: ['极低', '较低', '中等', '较高', '极高'] },
      { id: 'c3', name: '测试成本', question: '测试工作量和难度？', labels: ['极低', '较低', '中等', '较高', '极高'] },
      { id: 'c4', name: '协作成本', question: '跨团队协作的复杂程度？', labels: ['无需', '简单', '一般', '复杂', '极复杂'] },
    ]
  },
  {
    id: 'risk', name: '风险不确定性', weight: 0.05,
    children: [
      { id: 'r1', name: '需求模糊度', question: '需求的清晰程度？', labels: ['非常清晰', '清晰', '一般', '模糊', '非常模糊'] },
      { id: 'r2', name: '数据可信度', question: '支撑决策的数据可信程度？', labels: ['非常可信', '可信', '一般', '不可信', '无数据'] },
      { id: 'r3', name: '上线风险', question: '上线后出问题的风险？', labels: ['极低', '较低', '中等', '较高', '极高'] },
    ]
  },
  {
    id: 'graph', name: '图谱联动价值', weight: 0.05,
    children: [
      { id: 'g1', name: '解锁后续需求能力', question: '完成该需求后能解锁多少后续需求？', labels: ['无', '1-2个', '3-4个', '5-7个', '8个以上'] },
      { id: 'g2', name: '是否为链路关键节点', question: '该需求是否是某个关键链路的瓶颈修复项？', labels: ['否', '基本否', '一般', '是', '核心瓶颈'] },
      { id: 'g3', name: '依赖/阻塞影响', question: '该需求被阻塞对整体的影响？', labels: ['无影响', '轻微', '一般', '严重', '致命'] },
    ]
  },
];

export const graphNodes = [
  { id: 'REQ-001', label: '微信一键登录', priority: 'P0' as const, score: 92, isCore: true, group: '注册转化' },
  { id: 'REQ-002', label: '首页加载优化', priority: 'P0' as const, score: 88, isCore: true, group: '用户体验' },
  { id: 'REQ-003', label: '支付成功页推荐', priority: 'P1' as const, score: 84, isCore: false, group: '交易转化' },
  { id: 'REQ-004', label: '会员权益页重构', priority: 'P1' as const, score: 79, isCore: true, group: '会员体系' },
  { id: 'REQ-005', label: '新手引导优化', priority: 'P1' as const, score: 76, isCore: false, group: '注册转化' },
  { id: 'REQ-006', label: '社区功能', priority: 'P2' as const, score: 62, isCore: false, group: '社区' },
  { id: 'REQ-007', label: '支付链路修复', priority: 'P0' as const, score: 90, isCore: true, group: '交易转化' },
  { id: 'REQ-008', label: '皮肤主题功能', priority: 'P2' as const, score: 45, isCore: false, group: '个性化' },
  { id: 'REQ-009', label: '积分商城', priority: 'P3' as const, score: 38, isCore: false, group: '运营' },
  { id: 'REQ-010', label: '用户分层能力', priority: 'P1' as const, score: 75, isCore: true, group: '数据' },
  { id: 'REQ-011', label: '会员体系重构', priority: 'P1' as const, score: 72, isCore: true, group: '会员体系' },
  { id: 'REQ-012', label: '埋点体系完善', priority: 'P1' as const, score: 70, isCore: true, group: '数据' },
];

export type EdgeType = 'dependency' | 'weak' | 'conflict' | 'complement' | 'sameGoal';

export const graphEdges: { source: string; target: string; type: EdgeType; label?: string }[] = [
  { source: 'REQ-001', target: 'REQ-005', type: 'sameGoal', label: '同目标' },
  { source: 'REQ-001', target: 'REQ-002', type: 'complement', label: '互补' },
  { source: 'REQ-003', target: 'REQ-007', type: 'dependency', label: '依赖' },
  { source: 'REQ-004', target: 'REQ-011', type: 'dependency', label: '依赖' },
  { source: 'REQ-004', target: 'REQ-007', type: 'dependency', label: '依赖' },
  { source: 'REQ-006', target: 'REQ-001', type: 'weak', label: '弱关联' },
  { source: 'REQ-009', target: 'REQ-011', type: 'dependency', label: '依赖' },
  { source: 'REQ-009', target: 'REQ-010', type: 'dependency', label: '依赖' },
  { source: 'REQ-009', target: 'REQ-012', type: 'dependency', label: '依赖' },
  { source: 'REQ-010', target: 'REQ-012', type: 'dependency', label: '依赖' },
  { source: 'REQ-011', target: 'REQ-004', type: 'conflict', label: '冲突' },
  { source: 'REQ-011', target: 'REQ-007', type: 'dependency', label: '依赖' },
  { source: 'REQ-005', target: 'REQ-001', type: 'dependency', label: '依赖' },
  { source: 'REQ-002', target: 'REQ-003', type: 'complement', label: '互补' },
];
