'use strict';
/* ===================== 常量与数据表（v0.4：单一能量 + 战力制度） ===================== */
const VERSION = '0.4';
const CELL = 24, GN = 400, HALF = GN * CELL / 2;      // 墙体网格：400x400 格，每格 24px，世界 ±4800
const SC = 48, SN = 200, SNC = SN * SN;               // 空间网格
const MAXP = 240000, MAXC = 24000;
const START_R = 470, VOID_R = 4550;
const TOWER_R = 40, TOWER_FIELD = 250, PYLON_FIELD = 175, TOWER_PULL = 300;
const WINDOW = 10;
const RIPEN = 4;                                      // 新释放的能量需要 4 秒凝结才能被吃
const THRESH = [0, 2, 6, 14, 28, 50, 80, 120, 175, 250, 350];
const MAXLV = 10;
const LV_NAMES = ['沉寂', '微澜', '涟漪', '细流', '回涌', '潮起', '盈潮', '大潮', '天潮', '星潮', '永恒之潮'];
const LV_COLORS = ['#707a88', '#6fd8ff', '#5ff0c8', '#8cff7a', '#e6ff6a', '#ffd35a', '#ff9f5a', '#ff6fa8', '#c77dff', '#8f9bff', '#ffffff'];

const MV_WALK = 0, MV_SLOW = 1, MV_HOP = 2, MV_FLY = 3, MV_FLOAT = 4, MV_ORBIT = 5;
// 食性
const D_E = 0, D_M = 1, D_O = 2;
const DIET_NAME = ['食能', '食肉', '杂食'];
// 对同类
const SOC_HERD = 0, SOC_TERR = 1, SOC_PACK = 2, SOC_SOLO = 3;
const SOC_NAME = ['群居', '领地', '猎团', '独行'];
const SOC_DESC = ['同类聚在一起，附近同类越多战力越高（最多 +80%）', '会驱赶靠近的同类（非致命打斗）', '和同类一起狩猎，附近同伴越多战力越高', '独来独往'];
// 对异类
const AL_TIMID = 0, AL_MOB = 1, AL_TERR = 2, AL_BOLD = 3, AL_PASSIVE = 4;
const AL_NAME = ['胆小', '抱团反击', '护食', '无畏', '被动捕食'];
const AL_DESC = ['遇到打不过的捕食者就逃', '群体战力够时会一起反击捕食者', '会赶走来抢能量的其他食能生物', '不怕比自己弱的对手', '不追猎，碰到猎物就蛰'];

/* 生物表 —— pow: 基础战力；shell: 被攻击时防御倍率 */
const SPECIES = [
  { key: 'slime', name: '啵啵史莱姆', unlock: 0, r: 9, maxE: 16, repE: 13, childE: 6, life: 50, mature: 8, speed: 38, meta: 0.22, diet: D_E, pow: 1.0, soc: SOC_HERD, al: AL_MOB, mv: MV_WALK, cost: 8, col: '#7cf5b0', col2: '#3fc98a', desc: '软糯的群居史莱姆。一只很弱，一群就敢反击捕食者。分裂繁殖。' },
  { key: 'bunny', name: '团子兔', unlock: 0, r: 10, maxE: 18, repE: 12, childE: 6, life: 42, mature: 7, speed: 64, meta: 0.24, diet: D_E, pow: 0.8, soc: SOC_HERD, al: AL_TIMID, mv: MV_HOP, pair: true, cost: 8, col: '#fff4fa', col2: '#ffb8d6', desc: '跑得快、生得多、死得也快的麻薯兔。胆小，需要两只才能繁殖。' },
  { key: 'fox', name: '圆滚狸', unlock: 1, r: 13, maxE: 46, repE: 24, childE: 12, life: 160, mature: 20, speed: 76, meta: 0.28, diet: D_M, prey: ['slime', 'bunny', 'fish', 'mush'], pow: 3.5, soc: SOC_PACK, al: AL_BOLD, mv: MV_WALK, pair: true, cost: 30, col: '#ffb45c', col2: '#fff0dc', desc: '成群狩猎的小狸，只吃生物。专挑落单和虚弱的猎物。' },
  { key: 'mush', name: '菇菇仔', unlock: 1, r: 10, maxE: 26, repE: 20, childE: 9, life: 100, mature: 14, speed: 16, meta: 0.36, diet: D_E, reach: 12, pow: 2.2, soc: SOC_TERR, al: AL_TERR, mv: MV_SLOW, cost: 12, col: '#ff8a8a', col2: '#fff1dc', desc: '用菌丝远距离吸收能量（吃食范围很大），代谢极低。慢吞吞但很凶，会赶走抢食者和同类。' },
  { key: 'firefly', name: '萤火团', unlock: 2, r: 6, maxE: 8, repE: 6, childE: 3, life: 24, mature: 5, speed: 44, meta: 0.12, diet: D_E, pow: 0.35, soc: SOC_HERD, al: AL_TIMID, mv: MV_FLY, cost: 5, col: '#fff27a', col2: '#9be86a', desc: '成群飞舞的小光团，地面捕食者抓不到它。寿命极短、繁殖极快。' },
  { key: 'bird', name: '棉花鸟', unlock: 2, r: 12, maxE: 38, repE: 20, childE: 10, life: 150, mature: 18, speed: 85, meta: 0.24, diet: D_M, prey: ['firefly', 'fish', 'slime', 'bunny'], pow: 3, soc: SOC_SOLO, al: AL_BOLD, mv: MV_FLY, pair: true, cost: 24, col: '#f4f7ff', col2: '#ffd36b', desc: '独行的空中猎手，速度极快，捕食小型生物。' },
  { key: 'fish', name: '泡泡鱼', unlock: 3, r: 8, maxE: 12, repE: 9, childE: 4, life: 38, mature: 6, speed: 60, meta: 0.16, diet: D_E, pow: 0.6, soc: SOC_HERD, al: AL_TIMID, mv: MV_FLOAT, cost: 6, col: '#7ab8ff', col2: '#cfe6ff', desc: '在空气里游泳的鱼群，结队吃能量。' },
  { key: 'snail', name: '果冻蜗牛', unlock: 3, r: 11, maxE: 40, repE: 30, childE: 12, life: 180, mature: 30, speed: 11, meta: 0.46, diet: D_E, pow: 1.2, shell: 3, soc: SOC_SOLO, al: AL_BOLD, mv: MV_SLOW, cost: 20, col: '#c9a8ff', col2: '#ffd1f0', desc: '背着果冻硬壳，被攻击时防御 ×3。长寿、慢、稳定。' },
  { key: 'jelly', name: '星星水母', unlock: 4, r: 11, maxE: 36, repE: 28, childE: 12, life: 130, mature: 20, speed: 26, meta: 0.2, diet: D_M, prey: ['slime', 'bunny', 'firefly', 'fish', 'fox', 'bird'], pow: 3, soc: SOC_SOLO, al: AL_PASSIVE, mv: MV_ORBIT, cost: 22, col: '#9ff0ff', col2: '#ffb3f2', desc: '绕着方塔漂浮的陷阱型捕食者：不追猎，碰到它的生物会被蛰。' },
  { key: 'bear', name: '布丁熊', unlock: 5, r: 20, maxE: 120, repE: 96, childE: 40, life: 220, mature: 40, speed: 50, meta: 0.55, diet: D_O, prey: ['fox', 'snail', 'fish', 'bunny', 'slime', 'mush'], pow: 6, soc: SOC_TERR, al: AL_TERR, mv: MV_WALK, pair: true, cost: 60, col: '#e8b27a', col2: '#fff3c4', desc: '杂食大块头。既吃能量也吃生物，领地意识强。' },
  { key: 'whale', name: '云朵鲸', unlock: 6, r: 34, maxE: 300, repE: 240, childE: 100, life: 360, mature: 70, speed: 22, meta: 1.8, diet: D_E, pow: 9, soc: SOC_HERD, al: AL_BOLD, mv: MV_FLOAT, cost: 150, col: '#bfe0ff', col2: '#ffffff', desc: '巨大温柔的食能者，几乎没有天敌，但吃得非常多。' },
  { key: 'dragon', name: '糖豆龙', unlock: 7, r: 26, maxE: 240, repE: 200, childE: 80, life: 300, mature: 60, speed: 64, meta: 0.8, diet: D_M, prey: ['bear', 'bird', 'fox', 'whale', 'jelly'], pow: 12, soc: SOC_TERR, al: AL_BOLD, mv: MV_WALK, pair: true, cost: 140, col: '#9dffb0', col2: '#ffe38a', desc: '顶级掠食者，捕食布丁熊、云朵鲸等大型生物。' },
];
const NS = SPECIES.length;
const SP_IDX = {}; SPECIES.forEach((s, i) => { s.id = i; SP_IDX[s.key] = i; });
const S_preyMask = new Uint32Array(NS), S_predMask = new Uint32Array(NS);
SPECIES.forEach((s, i) => { if (s.prey) for (const k of s.prey) { const j = SP_IDX[k]; S_preyMask[i] |= 1 << j; S_predMask[j] |= 1 << i; } });
const S_r = Float32Array.from(SPECIES, s => s.r), S_speed = Float32Array.from(SPECIES, s => s.speed), S_meta = Float32Array.from(SPECIES, s => s.meta);
const S_life = Float32Array.from(SPECIES, s => s.life), S_maxE = Int32Array.from(SPECIES, s => s.maxE), S_mv = Uint8Array.from(SPECIES, s => s.mv);
const S_pow = Float32Array.from(SPECIES, s => s.pow), S_diet = Uint8Array.from(SPECIES, s => s.diet);
const S_eats = Uint8Array.from(SPECIES, s => s.diet !== D_M ? 1 : 0);
const S_ripeMin = Uint8Array.from(SPECIES, s => s.ripeMin !== undefined ? s.ripeMin : 255); // 能吃的最低凝结度
const S_reach = Float32Array.from(SPECIES, s => s.reach || 0);
const S_ripeMax = Uint8Array.from(SPECIES, s => s.ripeMax !== undefined ? s.ripeMax : 255);
const S_apex = Uint8Array.from(SPECIES, s => (s.diet !== D_E && s.pow >= 6) ? 1 : 0);
let E_MASK = 0; SPECIES.forEach((s, i) => { if (s.diet === D_E) E_MASK |= 1 << i; });

/* 观测者装置 */
const DEVICES = [
  { key: 'pylon', name: '导能塔', unlock: 1, cost: 1, time: 10, r: PYLON_FIELD, desc: '提供能量场。必须建在已有能量场内（方塔或其他导能塔），连成网络。其它装置只能建在能量场内。' },
  { key: 'wire', name: '绊线仪', unlock: 1, cost: 2, time: 20, len: 220, desc: '两根桩之间的光线。每有生物穿过 +0.5 潮汐（同一只 4 秒内只算一次）。R 键旋转。' },
  { key: 'census', name: '普查环', unlock: 2, cost: 2, time: 25, r: 160, desc: '范围内每只生物每秒 +0.01 潮汐。' },
  { key: 'ripen', name: '凝能塔', unlock: 2, cost: 2, time: 30, r: 150, desc: '范围内新释放的能量凝结速度 ×4，让食物更快可吃。' },
  { key: 'well', name: '引力井', unlock: 3, cost: 2, time: 30, r: 260, desc: '把范围内的能量缓缓吸向中心，制造“食堂”（也会吸引争抢）。' },
  { key: 'prism', name: '多样性棱镜', unlock: 3, cost: 3, time: 40, r: 180, desc: '范围内每有一个不同物种，每秒 +0.15 潮汐。' },
  { key: 'arena', name: '角斗观测台', unlock: 3, cost: 3, time: 40, r: 190, desc: '范围内每发生一次战斗 +1 潮汐，每次捕杀 +2.5。冲突越多收益越高——但生态会更不稳定。' },
  { key: 'bell', name: '共鸣钟', unlock: 4, cost: 3, time: 40, r: 200, desc: '范围内每诞生一只生物 +1 潮汐。' },
  { key: 'lure', name: '诱导信标', unlock: 4, cost: 2, time: 30, r: 320, desc: '吸引范围内闲逛的食能生物靠近（配合绊线仪、普查环）。' },
  { key: 'nest', name: '孵化巢', unlock: 4, cost: 3, time: 40, r: 160, desc: '可以在这里召唤生物（消耗巢附近的能量）。点击孵化巢使用。' },
  { key: 'sanct', name: '安宁结界', unlock: 5, cost: 4, time: 60, r: 140, desc: '范围内禁止一切战斗和捕猎，是猎物的避难所。' },
  { key: 'stasis', name: '静滞场', unlock: 5, cost: 4, time: 60, r: 150, desc: '范围内生物衰老速度 -50%，代谢 -30%。' },
  { key: 'barrier', name: '屏障发生器', unlock: 5, cost: 3, time: 40, len: 240, desc: '一道只拦截食肉/杂食动物的力场墙。R 键旋转。' },
  { key: 'chron', name: '长河记录仪', unlock: 6, cost: 5, time: 80, desc: '全局：生物总数越稳定（近 60 秒波动越小），每次结算加成越高（最多 +14）。' },
  { key: 'lens', name: '潮汐透镜', unlock: 7, cost: 6, time: 100, r: 260, desc: '范围内其它装置产出的潮汐 ×1.3（可叠加）。' },
  { key: 'elder', name: '回响尖塔', unlock: 8, cost: 5, time: 90, r: 220, desc: '范围内每只年迈生物（寿命过 60%）每秒 +0.04 潮汐。' },
  { key: 'ark', name: '方舟碑', unlock: 9, cost: 6, time: 120, r: 220, desc: '范围内存活物种 ≥6 时，每秒 +0.6 潮汐。' },
];
const ND = DEVICES.length;
const DV_IDX = {}; DEVICES.forEach((d, i) => { d.id = i; DV_IDX[d.key] = i; });
const D_PYLON = DV_IDX.pylon;

function buildCap(lv) { return 4 + 3 * lv; }
function wallHP(d) { return 4 + 3 * Math.pow(Math.max(0, d - START_R + 60) / 300, 1.7); }
function wallE(d) { return 1 + Math.floor(d / 350); }
