'use strict';
/* ===================== 常量与数据表 ===================== */
const VERSION = '0.3';
const CELL = 24, GN = 400, HALF = GN * CELL / 2;      // 墙体网格：400x400 格，每格 24px，世界 ±4800
const SC = 48, SN = 200, SNC = SN * SN;               // 空间网格（生物/能量查询）
const MAXP = 240000, MAXC = 24000;                    // 能量粒子 / 生物 上限
const START_R = 470, VOID_R = 4550;                   // 开局开放半径 / 虚空边界（不可破坏）
const TOWER_R = 40, TOWER_FIELD = 250, PYLON_FIELD = 175, TOWER_PULL = 300;
const WINDOW = 10;                                    // 潮汐结算窗口（秒）
const THRESH = [0, 2, 6, 14, 28, 50, 80, 120, 175, 250, 350];
const MAXLV = 10;
const LV_NAMES = ['沉寂', '微澜', '涟漪', '细流', '回涌', '潮起', '盈潮', '大潮', '天潮', '星潮', '永恒之潮'];
const LV_COLORS = ['#707a88', '#6fd8ff', '#5ff0c8', '#8cff7a', '#e6ff6a', '#ffd35a', '#ff9f5a', '#ff6fa8', '#c77dff', '#8f9bff', '#ffffff'];
const ET_NAME = ['光能', '余烬'];
const ET_COLOR = ['#9ff4ff', '#ffb070'];

// 行为类型
const MV_WALK = 0, MV_SLOW = 1, MV_HOP = 2, MV_FLY = 3, MV_FLOAT = 4, MV_ORBIT = 5;

/* 生物表
   eat: 可吃的能量类型（0 光能 / 1 余烬）；prey: 可捕食的物种 key
   exc: 代谢排出的能量类型；死亡时能量全部以【光能】爆出
   life 寿命(秒) mature 成熟(秒) meta 代谢(能量/秒) cost 召唤消耗(方塔附近光能) */
const SPECIES = [
  { key: 'slime', name: '啵啵史莱姆', unlock: 0, r: 9, maxE: 24, repE: 20, childE: 9, life: 170, mature: 22, speed: 36, meta: 0.10, eat: [0], exc: 1, sense: 150, mv: MV_WALK, cost: 12, col: '#7cf5b0', col2: '#3fc98a', desc: '最常见的软糯史莱姆，吃光能，排出余烬。会分裂繁殖。' },
  { key: 'mush', name: '菇菇仔', unlock: 0, r: 10, maxE: 30, repE: 25, childE: 11, life: 260, mature: 30, speed: 15, meta: 0.12, eat: [1], exc: 0, sense: 130, mv: MV_SLOW, cost: 12, col: '#ff8a8a', col2: '#fff1dc', desc: '分解者。吃余烬，排出光能，是生态循环的关键。慢吞吞。' },
  { key: 'bunny', name: '团子兔', unlock: 1, r: 10, maxE: 26, repE: 19, childE: 8, life: 125, mature: 20, speed: 66, meta: 0.15, eat: [0], exc: 1, sense: 170, mv: MV_HOP, pair: true, cost: 14, col: '#fff4fa', col2: '#ffb8d6', desc: '蹦蹦跳跳的麻薯兔，吃光能。需要两只一起才能繁殖。' },
  { key: 'firefly', name: '萤火团', unlock: 2, r: 6, maxE: 12, repE: 10, childE: 4, life: 95, mature: 14, speed: 52, meta: 0.07, eat: [1], exc: 0, sense: 160, mv: MV_FLY, social: 1, cost: 8, col: '#fff27a', col2: '#9be86a', desc: '成群飞舞的小光团，吃余烬、排出光能。' },
  { key: 'fox', name: '圆滚狸', unlock: 2, r: 13, maxE: 70, repE: 56, childE: 24, life: 270, mature: 45, speed: 70, meta: 0.26, prey: ['slime', 'bunny', 'firefly'], exc: 1, sense: 230, mv: MV_WALK, pair: true, bite: 0.5, cost: 36, col: '#ffb45c', col2: '#fff0dc', desc: '圆滚滚的小狸，捕食史莱姆、团子兔和萤火团。' },
  { key: 'fish', name: '泡泡鱼', unlock: 3, r: 8, maxE: 18, repE: 15, childE: 6, life: 115, mature: 18, speed: 58, meta: 0.10, eat: [0], exc: 1, sense: 160, mv: MV_FLOAT, social: 1, cost: 10, col: '#7ab8ff', col2: '#cfe6ff', desc: '在空气里游泳的泡泡鱼，成群结队吃光能。' },
  { key: 'snail', name: '果冻蜗牛', unlock: 3, r: 11, maxE: 60, repE: 48, childE: 20, life: 540, mature: 80, speed: 11, meta: 0.09, eat: [1], exc: 0, sense: 140, mv: MV_SLOW, cost: 30, col: '#c9a8ff', col2: '#ffd1f0', desc: '背着果冻壳的长寿分解者，吃余烬、排出光能。' },
  { key: 'bear', name: '布丁熊', unlock: 4, r: 20, maxE: 160, repE: 130, childE: 55, life: 480, mature: 90, speed: 52, meta: 0.48, prey: ['fox', 'fish', 'bunny', 'snail'], exc: 1, sense: 270, mv: MV_WALK, pair: true, bite: 0.45, cost: 80, col: '#e8b27a', col2: '#fff3c4', desc: '大块头布丁熊，捕食圆滚狸、泡泡鱼、团子兔和蜗牛。' },
  { key: 'jelly', name: '星星水母', unlock: 5, r: 11, maxE: 30, repE: 26, childE: 10, life: 210, mature: 30, speed: 32, meta: 0.12, eat: [0], exc: 1, sense: 150, mv: MV_ORBIT, cost: 16, col: '#9ff0ff', col2: '#ffb3f2', desc: '绕着方塔巡游的星星水母，吃光能。' },
  { key: 'bird', name: '棉花鸟', unlock: 6, r: 12, maxE: 50, repE: 42, childE: 16, life: 230, mature: 40, speed: 82, meta: 0.22, prey: ['firefly', 'fish', 'jelly'], exc: 1, sense: 260, mv: MV_FLY, bite: 0.55, cost: 30, col: '#f4f7ff', col2: '#ffd36b', desc: '毛茸茸的棉花鸟，捕食萤火团、泡泡鱼、星星水母。' },
  { key: 'whale', name: '云朵鲸', unlock: 7, r: 34, maxE: 420, repE: 360, childE: 140, life: 900, mature: 160, speed: 24, meta: 0.85, eat: [0, 1], exc: 0, sense: 260, mv: MV_FLOAT, cost: 200, col: '#bfe0ff', col2: '#ffffff', desc: '巨大温柔的云朵鲸，什么能量都吃，排出光能。' },
  { key: 'dragon', name: '糖豆龙', unlock: 8, r: 26, maxE: 320, repE: 280, childE: 100, life: 720, mature: 140, speed: 64, meta: 0.8, prey: ['bear', 'bird', 'whale', 'fox'], exc: 1, sense: 300, mv: MV_WALK, pair: true, bite: 0.4, cost: 180, col: '#9dffb0', col2: '#ffe38a', desc: '顶级掠食者糖豆龙，捕食布丁熊、棉花鸟、云朵鲸、圆滚狸。' },
];
const NS = SPECIES.length;
const SP_IDX = {}; SPECIES.forEach((s, i) => { s.id = i; SP_IDX[s.key] = i; });
// 预计算：食物链掩码
const S_eatMask = new Uint8Array(NS), S_preyMask = new Uint32Array(NS), S_predMask = new Uint32Array(NS);
SPECIES.forEach((s, i) => {
  if (s.eat) for (const t of s.eat) S_eatMask[i] |= 1 << t;
  if (s.prey) for (const k of s.prey) { const j = SP_IDX[k]; S_preyMask[i] |= 1 << j; S_predMask[j] |= 1 << i; }
});
const S_r = Float32Array.from(SPECIES, s => s.r), S_speed = Float32Array.from(SPECIES, s => s.speed), S_meta = Float32Array.from(SPECIES, s => s.meta);
const S_life = Float32Array.from(SPECIES, s => s.life), S_maxE = Int32Array.from(SPECIES, s => s.maxE), S_mv = Uint8Array.from(SPECIES, s => s.mv);
const S_mass = Float32Array.from(SPECIES, s => s.r * s.r);

/* 观测者装置表
   cost: 占用建造额度；time: 建造秒数；r: 作用半径；len: 线段装置长度 */
const DEVICES = [
  { key: 'pylon', name: '导能塔', unlock: 1, cost: 1, time: 12, r: PYLON_FIELD, desc: '提供能量场。必须建在已有能量场内（方塔或其他导能塔），连成网络。其它装置只能建在能量场内。' },
  { key: 'wire', name: '绊线仪', unlock: 1, cost: 2, time: 25, len: 220, desc: '在两根桩之间拉一道光线。每有生物穿过 +0.5 潮汐（同一只 4 秒内只算一次）。R 键旋转。' },
  { key: 'census', name: '普查环', unlock: 2, cost: 2, time: 30, r: 160, desc: '统计范围内的生物：每只每秒 +0.01 潮汐。' },
  { key: 'conv', name: '余烬转化炉', unlock: 2, cost: 3, time: 40, r: 140, desc: '把范围内的余烬慢慢转化为光能（每秒约 2 点，守恒）。' },
  { key: 'well', name: '引力井', unlock: 3, cost: 2, time: 35, r: 260, desc: '把范围内的光能缓缓吸向中心，制造“食堂”。' },
  { key: 'prism', name: '多样性棱镜', unlock: 3, cost: 3, time: 50, r: 180, desc: '范围内每有一个不同物种，每秒 +0.15 潮汐。' },
  { key: 'bell', name: '共鸣钟', unlock: 4, cost: 3, time: 50, r: 200, desc: '范围内每诞生一只生物 +1.5 潮汐。' },
  { key: 'lure', name: '诱导信标', unlock: 4, cost: 2, time: 35, r: 320, desc: '吸引范围内闲逛的非捕食生物靠近（配合绊线仪）。' },
  { key: 'nest', name: '孵化巢', unlock: 4, cost: 3, time: 45, r: 160, desc: '可以在这里召唤生物（消耗巢附近的光能）。点击孵化巢使用。' },
  { key: 'stasis', name: '静滞场', unlock: 5, cost: 4, time: 70, r: 150, desc: '范围内生物衰老速度 -50%，代谢 -30%。' },
  { key: 'barrier', name: '屏障发生器', unlock: 5, cost: 3, time: 45, len: 240, desc: '一道只拦截捕食者的力场墙，保护食草生物。R 键旋转。' },
  { key: 'chron', name: '长河记录仪', unlock: 6, cost: 5, time: 90, desc: '全局：生物总数越稳定（近 60 秒波动越小），每次结算加成越高（最多 +14）。' },
  { key: 'lens', name: '潮汐透镜', unlock: 7, cost: 6, time: 120, r: 260, desc: '范围内其它装置产出的潮汐 ×1.3（可叠加）。' },
  { key: 'elder', name: '回响尖塔', unlock: 8, cost: 5, time: 100, r: 220, desc: '范围内每只年迈生物（寿命过 60%）每秒 +0.03 潮汐。' },
  { key: 'ark', name: '方舟碑', unlock: 9, cost: 6, time: 150, r: 200, desc: '范围内存活物种 ≥6 时，每秒 +0.6 潮汐。象征完整的生态。' },
];
const ND = DEVICES.length;
const DV_IDX = {}; DEVICES.forEach((d, i) => { d.id = i; DV_IDX[d.key] = i; });
const D_PYLON = DV_IDX.pylon;

function buildCap(lv) { return 4 + 3 * lv; }
function wallHP(d) { return 4 + 3 * Math.pow(Math.max(0, d - START_R + 60) / 300, 1.7); }
function wallE(d) { return 1 + Math.floor(d / 350); }
