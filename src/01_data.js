'use strict';
/* ===================== 常量与数据表（v0.5：光不可再生 + 魂晶资源 + 迷雾遗迹） ===================== */
const VERSION = '0.7.0';
const CELL = 24, GN = 400, HALF = GN * CELL / 2;      // 墙体网格：400x400 格，每格 24px，世界 ±4800
const SC = 48, SN = 200, SNC = SN * SN;               // 空间网格
const MAXP = 240000, MAXC = 24000;
const START_R = 470, VOID_R = 4550;
const TOWER_R = 40, TOWER_FIELD = 250, PYLON_FIELD = 175, TOWER_PULL = 300;
const WINDOW = 10;
const RIPEN = 4;                                      // 新释放的光需要 4 秒凝结才能被吃
const THRESH = [0, 2, 6, 14, 28, 50, 80, 120, 175, 250, 350];
const MAXLV = 10;
const LV_NAMES = ['漆黑', '烛影', '萤火', '灯笼', '篝火', '长明', '灯海', '晨星', '破晓', '天亮', '白昼'];
const LV_COLORS = ['#8a8090', '#c9a070', '#e8c060', '#ffcf6a', '#ffb04a', '#ff9a4a', '#ffc86a', '#ffe0a0', '#fff0c8', '#fff8e0', '#ffffff'];

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
const AL_DESC = ['遇到打不过的捕食者就逃', '群体战力够时会一起反击捕食者', '会赶走来抢光的其他食能生物', '不怕比自己弱的对手', '不追猎，碰到猎物就蛰'];

/* 生物表 —— v0.6：体型拉开差距（微小→巨型）；tier = 调查层级（需要光域 Lv ≥ tier-1 才能调查）
   pow: 基础战力；shell: 被攻击时防御倍率；tr: 特性（见 TRAITS） */
const SPECIES = [
  { key: 'slime', tier: 0, mat: 1, matT: 30, mcost: 0, name: '黑团子', r: 7, maxE: 16, repE: 13, childE: 6, life: 50, mature: 8, speed: 38, meta: 0.22, diet: D_E, pow: 1.0, soc: SOC_HERD, al: AL_MOB, mv: MV_WALK, cost: 8, col: '#4d4570', col2: '#2c2748', eye: '#ffe36a', tr: ['split'], desc: '黑乎乎的一团影子，被咬一口就分裂成两只。一只很怂，一群就敢反击。' },
  { key: 'bunny', tier: 0, mat: 1, matT: 30, mcost: 0, name: '纸扎兔', r: 7, maxE: 18, repE: 12, childE: 6, life: 42, mature: 7, speed: 64, meta: 0.2, diet: D_E, pow: 0.8, soc: SOC_HERD, al: AL_TIMID, mv: MV_HOP, pair: true, cost: 8, col: '#f4efe4', col2: '#e2d6c0', eye: '#ff5a5a', tr: ['fast'], desc: '纸糊的小兔子，脸蛋画着两团红。跑得快、生得多，要两只才能繁殖。' },
  { key: 'mite', tier: 1, mat: 1, matT: 50, mcost: 0, name: '煤灰精', r: 3.5, maxE: 5, repE: 4, childE: 2, life: 22, mature: 4, speed: 40, meta: 0.08, diet: D_E, pow: 0.25, soc: SOC_HERD, al: AL_TIMID, mv: MV_WALK, cost: 4, col: '#2e2a33', col2: '#16131a', eye: '#fff27a', tr: ['carrier'], desc: '一撮会走路的煤灰。喜欢把地上的魂晶偷偷搬回长明灯。' },
  { key: 'mush', tier: 1, mat: 2, matT: 26, mcost: 5, name: '眼睛菇', r: 8, maxE: 26, repE: 20, childE: 9, life: 100, mature: 14, speed: 16, meta: 0.36, diet: D_E, reach: 12, pow: 2.2, soc: SOC_TERR, al: AL_TERR, mv: MV_SLOW, cost: 12, col: '#b784ff', col2: '#5a2f8a', eye: '#b8ff6a', tr: ['reach'], desc: '伞盖上长了一只大眼睛的蘑菇。一动不动，用菌丝远远地吸光。' },
  { key: 'firefly', tier: 1, mat: 1, matT: 40, mcost: 0, name: '鬼火', r: 4, maxE: 8, repE: 6, childE: 3, life: 24, mature: 5, speed: 44, meta: 0.12, diet: D_E, pow: 0.35, soc: SOC_HERD, al: AL_TIMID, mv: MV_FLY, cost: 5, col: '#9dffcf', col2: '#3fbf8a', eye: '#e8fff4', tr: ['fly'], desc: '一簇飘来飘去的幽绿小火苗。活得短、生得快，自己就会发光。' },
  { key: 'fox', tier: 2, mat: 5, matT: 18, mcost: 15, name: '白面狐', r: 11, maxE: 46, repE: 24, childE: 12, life: 160, mature: 20, speed: 76, meta: 0.28, diet: D_M, prey: ['slime', 'bunny', 'fish', 'mush', 'mite', 'beetle', 'spore'], pow: 3.5, soc: SOC_PACK, al: AL_BOLD, mv: MV_WALK, pair: true, cost: 30, col: '#ffb37a', col2: '#c4602a', eye: '#ff4a3a', tr: [], desc: '戴着白色面具的狐狸，专在黑暗里抓小怪吃。' },
  { key: 'fish', tier: 2, mat: 1, matT: 30, mcost: 5, name: '灯笼鱼', r: 6, maxE: 12, repE: 9, childE: 4, life: 38, mature: 6, speed: 60, meta: 0.16, diet: D_E, pow: 0.6, soc: SOC_HERD, al: AL_TIMID, mv: MV_FLOAT, cost: 6, col: '#5a7aa8', col2: '#2a3a60', eye: '#ffe36a', tr: [], desc: '头顶挂着小灯笼的深渊鱼，在黑暗里游来游去。' },
  { key: 'hedgehog', tier: 2, mat: 2, matT: 26, mcost: 5, name: '针包包', r: 8, maxE: 22, repE: 17, childE: 8, life: 90, mature: 12, speed: 30, meta: 0.24, diet: D_E, pow: 1.4, soc: SOC_SOLO, al: AL_BOLD, mv: MV_WALK, cost: 12, col: '#c9a07a', col2: '#7a5a40', eye: '#ff7a5a', tr: ['thorn'], desc: '浑身插满针的针线包。谁咬它谁就被扎。' },
  { key: 'spore', tier: 2, mat: 1, matT: 30, mcost: 5, name: '霉霉球', r: 6.5, maxE: 14, repE: 11, childE: 5, life: 45, mature: 8, speed: 14, meta: 0.16, diet: D_E, pow: 0.6, soc: SOC_HERD, al: AL_TIMID, mv: MV_SLOW, cost: 8, col: '#9ec46a', col2: '#5a7a30', eye: '#f4ff7a', tr: ['spore'], desc: '一团毛茸茸的霉菌，老死时会炸成两只小霉霉。' },
  { key: 'bird', tier: 3, mat: 5, matT: 18, mcost: 15, name: '夜鸦', r: 10, maxE: 38, repE: 20, childE: 10, life: 150, mature: 18, speed: 85, meta: 0.24, diet: D_M, prey: ['firefly', 'fish', 'slime', 'bunny', 'mite', 'spore', 'frog'], pow: 3, soc: SOC_SOLO, al: AL_BOLD, mv: MV_FLY, pair: true, cost: 24, col: '#3a3448', col2: '#1c1826', eye: '#ff4a4a', tr: ['fly'], desc: '黑夜里盘旋的小乌鸦，俯冲下来叼走小怪。' },
  { key: 'snail', tier: 3, mat: 3, matT: 26, mcost: 10, name: '眼球蜗牛', r: 9, maxE: 40, repE: 30, childE: 12, life: 180, mature: 30, speed: 11, meta: 0.46, diet: D_E, pow: 1.2, shell: 3, soc: SOC_SOLO, al: AL_BOLD, mv: MV_SLOW, cost: 20, col: '#d8c0a8', col2: '#8a6a5a', eye: '#7affd8', tr: ['shell'], desc: '背着一只大眼球慢慢爬。遇到危险就缩进壳里。' },
  { key: 'beetle', tier: 3, mat: 2, matT: 28, mcost: 5, name: '棺材虫', r: 6.5, maxE: 14, repE: 11, childE: 5, life: 70, mature: 9, speed: 42, meta: 0.14, diet: D_E, ripeMin: 0, ripeMax: 254, pow: 1.0, shell: 1.8, soc: SOC_SOLO, al: AL_TIMID, mv: MV_WALK, cost: 8, col: '#6a4a3a', col2: '#3a2418', eye: '#ffd36a', tr: ['scav'], desc: '背着一口小棺材的甲虫，只吃打架和死去时洒出的光。' },
  { key: 'frog', tier: 3, mat: 3, matT: 20, mcost: 10, name: '长舌鬼蛙', r: 8.5, maxE: 28, repE: 18, childE: 9, life: 110, mature: 14, speed: 55, meta: 0.2, diet: D_M, prey: ['firefly', 'mite', 'fish', 'beetle', 'spore'], pow: 2.2, soc: SOC_SOLO, al: AL_BOLD, mv: MV_HOP, pair: true, tongue: 45, cost: 16, col: '#b8d8a8', col2: '#6a8a5a', eye: '#ff5a8a', tr: ['tongue'], desc: '脸色惨白的蛙，舌头能伸得老长，隔空卷走小虫。' },
  { key: 'jelly', tier: 4, mat: 8, matT: 14, mcost: 30, name: '幽灵水母', r: 11, maxE: 36, repE: 28, childE: 12, life: 130, mature: 20, speed: 26, meta: 0.2, diet: D_M, prey: ['slime', 'bunny', 'firefly', 'fish', 'fox', 'bird', 'mite', 'octo'], pow: 3, soc: SOC_SOLO, al: AL_PASSIVE, mv: MV_ORBIT, cost: 22, col: '#d8c8ff', col2: '#8a6ad8', eye: '#8affff', tr: ['sting'], desc: '半透明的水母在空中漂，碰到它的会被蛰。' },
  { key: 'octo', tier: 4, mat: 4, matT: 22, mcost: 15, name: '触手娃', r: 9, maxE: 26, repE: 20, childE: 9, life: 100, mature: 14, speed: 34, meta: 0.2, diet: D_E, pow: 1.2, soc: SOC_SOLO, al: AL_TIMID, mv: MV_FLOAT, cost: 14, col: '#ff8ab8', col2: '#b84a7a', eye: '#fff27a', tr: ['ink'], desc: '软软的小章鱼，被咬时喷一团墨汁溜走。' },
  { key: 'sheep', tier: 4, mat: 4, matT: 20, mcost: 20, name: '失眠羊', r: 12, maxE: 40, repE: 30, childE: 14, life: 150, mature: 20, speed: 30, meta: 0.3, diet: D_E, pow: 1.6, soc: SOC_HERD, al: AL_MOB, mv: MV_WALK, pair: true, cost: 20, col: '#e8e4ec', col2: '#a8a0b8', eye: '#c9a0ff', tr: ['wool'], desc: '数着自己睡不着的羊，黑眼圈很重。成群时掉更多魂晶。' },
  { key: 'bear', tier: 5, mat: 25, matT: 16, mcost: 80, name: '缝合熊', r: 24, maxE: 120, repE: 96, childE: 40, life: 220, mature: 40, speed: 50, meta: 0.55, diet: D_O, prey: ['fox', 'snail', 'fish', 'bunny', 'slime', 'mush', 'sheep', 'hedgehog', 'frog', 'weasel'], pow: 6, soc: SOC_TERR, al: AL_TERR, mv: MV_WALK, pair: true, cost: 60, col: '#a8805a', col2: '#6a4a30', eye: '#ff3a3a', tr: [], desc: '全身都是缝线的旧玩偶熊，什么都吃，力气很大。' },
  { key: 'weasel', tier: 5, mat: 6, matT: 18, mcost: 40, name: '黄大仙', r: 10, maxE: 40, repE: 22, childE: 11, life: 120, mature: 18, speed: 80, meta: 0.3, diet: D_M, prey: ['bunny', 'slime', 'mite', 'beetle', 'spore', 'hedgehog', 'frog', 'fish', 'sheep'], pow: 3.2, soc: SOC_SOLO, al: AL_BOLD, mv: MV_WALK, pair: true, dash: true, cost: 28, col: '#e8a84a', col2: '#a8641a', eye: '#ffe36a', tr: ['dash'], desc: '黑夜里拦路讨封的黄鼠狼，追猎时会突然冲刺。' },
  { key: 'turtle', tier: 5, mat: 12, matT: 24, mcost: 60, name: '驮碑龟', r: 17, maxE: 90, repE: 70, childE: 30, life: 500, mature: 60, speed: 10, meta: 0.35, diet: D_E, pow: 2.5, shell: 5, soc: SOC_SOLO, al: AL_BOLD, mv: MV_SLOW, cost: 50, col: '#7a8a6a', col2: '#4a5a3a', eye: '#ffd36a', tr: ['shell', 'ancient'], desc: '背上驮着一块旧石碑，活得极久，硬壳几乎咬不动。' },
  { key: 'whale', tier: 6, mat: 40, matT: 18, mcost: 150, name: '夜鲸', r: 50, maxE: 300, repE: 240, childE: 100, life: 360, mature: 70, speed: 22, meta: 1.8, diet: D_E, pow: 9, soc: SOC_HERD, al: AL_BOLD, mv: MV_FLOAT, cost: 150, col: '#3a4a78', col2: '#1a2448', eye: '#8adfff', tr: ['giant'], desc: '在黑暗上空游过的大鲸鱼，体型巨大，几乎没有天敌。' },
  { key: 'ghost', tier: 6, mat: 10, matT: 18, mcost: 60, name: '阿飘', r: 10, maxE: 34, repE: 26, childE: 12, life: 140, mature: 20, speed: 30, meta: 0.22, diet: D_M, drain: true, pow: 1.5, soc: SOC_SOLO, al: AL_PASSIVE, mv: MV_FLOAT, cost: 30, col: '#f0f0f8', col2: '#b8b8d0', eye: '#6affd0', tr: ['drain'], desc: '披着白床单的小幽灵，贴近别的小怪就偷偷吸走它们的光。' },
  { key: 'dragon', tier: 7, mat: 120, matT: 18, mcost: 400, name: '骨龙', r: 34, maxE: 240, repE: 200, childE: 80, life: 300, mature: 60, speed: 64, meta: 0.8, diet: D_M, prey: ['bear', 'bird', 'fox', 'whale', 'jelly', 'sheep', 'turtle', 'weasel', 'unicorn'], pow: 12, soc: SOC_TERR, al: AL_BOLD, mv: MV_WALK, pair: true, cost: 140, col: '#e8e0d0', col2: '#a89880', eye: '#ff3a2a', tr: ['apex'], desc: '只剩骨头的龙。食物链的最顶端，谁都怕它。' },
  { key: 'unicorn', tier: 7, mat: 50, matT: 18, mcost: 200, name: '独眼兽', r: 24, maxE: 150, repE: 120, childE: 50, life: 300, mature: 50, speed: 55, meta: 0.7, diet: D_E, pow: 5, soc: SOC_HERD, al: AL_BOLD, mv: MV_WALK, pair: true, cost: 90, col: '#f4d8ff', col2: '#b88ad8', eye: '#ff9aff', tr: ['bless'], desc: '额头只有一只大眼睛。被它看过的小怪，老得更慢。' },
  { key: 'phoenix', tier: 8, mat: 150, matT: 18, mcost: 600, name: '纸鸢凤', r: 30, maxE: 260, repE: 210, childE: 90, life: 320, mature: 60, speed: 90, meta: 0.9, diet: D_M, prey: ['bird', 'fox', 'weasel', 'sheep', 'bear', 'jelly', 'frog', 'octo', 'unicorn', 'ghost'], pow: 13, soc: SOC_SOLO, al: AL_BOLD, mv: MV_FLY, pair: true, cost: 160, col: '#ff7a3a', col2: '#c4301a', eye: '#fff27a', tr: ['rebirth', 'fly'], desc: '纸扎的凤凰，老死时会烧起来，从灰里再飞一次。' },
];
/* 特性（图标化展示 + 模拟里的真实效果） */
const TRAITS = {
  split: { ic: '🫧', name: '分裂', d: '不需要伴侣，自己分裂繁殖' },
  fast: { ic: '💨', name: '敏捷', d: '跳得快，最擅长逃跑' },
  carrier: { ic: '📦', name: '搬运', d: '把附近的魂晶搬回长明灯' },
  reach: { ic: '🕸️', name: '菌丝', d: '远距离吸收光' },
  fly: { ic: '🪽', name: '飞行', d: '在空中移动，无视拥挤' },
  thorn: { ic: '🌵', name: '尖刺', d: '攻击它的生物会被反伤' },
  spore: { ic: '💥', name: '孢子', d: '寿终时变成两只幼体' },
  shell: { ic: '🛡️', name: '硬壳', d: '被攻击时防御大幅提升' },
  scav: { ic: '🦴', name: '拾荒', d: '只吃战斗/死亡爆出的新鲜光' },
  tongue: { ic: '👅', name: '长舌', d: '隔空 45 距离捕食' },
  sting: { ic: '⚡', name: '蛰刺', d: '碰到它的猎物会被蛰' },
  ink: { ic: '🌫️', name: '墨遁', d: '被咬时 60% 喷墨逃脱' },
  wool: { ic: '🧶', name: '羊毛', d: '成群时魂晶产量 ×2' },
  dash: { ic: '⚡', name: '冲刺', d: '追猎时 1.8 倍速爆发' },
  ancient: { ic: '⏳', name: '长寿', d: '寿命极长，种群稳定' },
  giant: { ic: '🐋', name: '巨型', d: '体型巨大，几乎无天敌' },
  drain: { ic: '🩸', name: '汲取', d: '贴近其他生物持续吸取光' },
  apex: { ic: '👑', name: '顶级', d: '食物链最顶端' },
  bless: { ic: '🌈', name: '祝福', d: '身边生物衰老减半' },
  rebirth: { ic: '🔥', name: '涅槃', d: '寿终时浴火重生一次' },
};
function sizeClass(r) { return r < 5 ? 0 : r < 9 ? 1 : r < 14 ? 2 : r < 30 ? 3 : 4; }
const SIZE_NAME = ['微型', '小型', '中型', '大型', '巨型'];
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

/* 观测者装置 —— v0.6：基础建造 60 秒；tier = 调查层级；pf = 导能场半径（导能类） */
const DEVICES = [
  { key: 'pylon', tier: 0, mc: 5, name: '路灯', cost: 1, time: 60, r: PYLON_FIELD, pf: PYLON_FIELD, desc: '照亮一片地方。其它建筑只能建在灯光里；路灯要接着亮处一盏一盏往外建。' },
  { key: 'lab', tier: 0, mc: 15, name: '调查站', cost: 2, time: 60, rs: 0.25, desc: '加快调查黑暗里的新小怪和新建筑（不建也会慢慢调查）。光域越高，调查越快。' },
  { key: 'collector', tier: 1, mc: 12, name: '收魂瓶', cost: 1, time: 60, r: 210, desc: '自动收走附近小怪掉落的魂晶（离开游戏时也在收）。' },
  { key: 'wire', tier: 1, mc: 10, name: '红线', cost: 2, time: 60, len: 220, desc: '两根桩之间拉一根红线。每有小怪穿过 +0.5 光域（同一只 4 秒内只算一次）。' },
  { key: 'catcher', tier: 1, mc: 20, name: '捕光网', cost: 2, time: 75, r: 260, desc: '把飘过的流光网住，洒成地上的光喂小怪。离开游戏时也在工作。' },
  { key: 'census', tier: 2, mc: 15, name: '监控探头', cost: 2, time: 75, r: 160, desc: '范围内每只小怪每秒 +0.01 光域。' },
  { key: 'ripen', tier: 2, mc: 15, name: '暖光灯', cost: 2, time: 75, r: 150, desc: '范围内新洒下的光更快变成可以吃的光斑。' },
  { key: 'well', tier: 3, mc: 20, name: '古井', cost: 2, time: 90, r: 260, desc: '把附近地上的光慢慢吸到井边，形成“食堂”（也会引来抢食）。' },
  { key: 'prism', tier: 3, mc: 30, name: '走马灯', cost: 3, time: 90, r: 180, desc: '范围内每有一种不同的小怪，每秒 +0.15 光域。' },
  { key: 'arena', tier: 3, mc: 30, name: '斗笼', cost: 3, time: 90, r: 190, desc: '范围内每次打架 +1 光域，每次捕杀 +2.5。越乱越赚——但生态更不稳。' },
  { key: 'bell', tier: 4, mc: 30, name: '招魂铃', cost: 3, time: 90, r: 200, desc: '范围内每出生一只小怪 +1 光域。' },
  { key: 'lure', tier: 4, mc: 20, name: '诱饵灯', cost: 2, time: 75, r: 320, desc: '把附近闲逛的吃光小怪引过来。' },
  { key: 'barrier', tier: 4, mc: 40, name: '黄符结界', cost: 3, time: 90, len: 240, desc: '一道只拦吃肉小怪的符咒墙。' },
  { key: 'pylon2', tier: 4, mc: 40, name: '高杆路灯', cost: 2, time: 90, r: 290, pf: 290, desc: '照得特别远的路灯（半径 290），快速把光铺到远处。' },
  { key: 'sanct', tier: 5, mc: 60, name: '小神龛', cost: 4, time: 120, r: 140, desc: '范围内禁止打架和捕猎，是弱小小怪的避难所。' },
  { key: 'stasis', tier: 5, mc: 60, name: '冷柜', cost: 4, time: 120, r: 150, desc: '范围内小怪老得慢一半，吃得少三成。' },
  { key: 'nursery', tier: 5, mc: 50, name: '摇篮', cost: 3, time: 120, r: 170, desc: '范围内小怪繁殖更快，幼崽长得更快。' },
  { key: 'scare', tier: 5, mc: 50, name: '稻草人', cost: 3, time: 120, r: 170, desc: '吃肉的小怪不敢靠近，会被吓跑。' },
  { key: 'chron', tier: 6, mc: 120, name: '老座钟', cost: 5, time: 150, desc: '全局：小怪总数越稳定，每次结算加成越高（最多 +14）。' },
  { key: 'rlab', tier: 6, mc: 150, name: '档案馆', cost: 4, time: 150, rs: 1.0, desc: '高级调查设施：调查速度是调查站的 4 倍。' },
  { key: 'pool', tier: 6, mc: 100, name: '月光池', cost: 4, time: 150, r: 200, desc: '范围内每有一层食物链（吃光 / 吃肉 / 顶级），每秒 +0.4 光域。' },
  { key: 'sun', tier: 7, mc: 220, name: '人造月亮', cost: 4, time: 180, r: 220, desc: '把流光从夜空里拽下来，落在周围（约每 1.5 秒一团）。配合捕光网更好。' },
  { key: 'lens', tier: 7, mc: 150, name: '探照灯', cost: 6, time: 180, r: 260, desc: '范围内其它建筑产出的光域 ×1.3（可叠加）。' },
  { key: 'elder', tier: 8, mc: 120, name: '老槐树', cost: 5, time: 150, r: 220, desc: '范围内每只老年小怪（寿命过 60%）每秒 +0.04 光域。' },
  { key: 'ark', tier: 9, mc: 200, name: '日出钟', cost: 6, time: 180, r: 220, desc: '范围内存活 ≥6 种小怪时，每秒 +0.6 光域。' },
];
const ND = DEVICES.length;
const DV_IDX = {}; DEVICES.forEach((d, i) => { d.id = i; DV_IDX[d.key] = i; });
const D_PYLON = DV_IDX.pylon;

function buildCap(lv) { return 4 + 3 * lv; }
function wallHP(d) { return 4 + 3 * Math.pow(Math.max(0, d - START_R + 60) / 300, 1.7); }
function wallE(d) { return 1 + Math.floor(d / 350); }

/* ---------- v0.6 经济：小灯不再自动回充，光来自环境中的【流光】 ---------- */
function tankMax(lv) { return 80 + 40 * lv; }           // 小灯光槽上限
function tankRegen(lv) { return 2 + 0.6 * lv; }         // 仅作生态位容量估算的下限（不再真的回充）
const MAXW = 900, WISP_LIFE = 150, WISP_MAG = 120;        // 流光：上限 / 寿命 / 小灯吸取半径
/* 调查：tier 1..9 的调查点数 */
const RES_COST = [0, 30, 60, 110, 200, 380, 700, 1300, 2400, 4400];
function resGate(tier) { return Math.max(0, tier - 1); } // 需要的光域历史最高等级
const AD_BUILD_CUT = 60;                                // 看广告：建造 -60 秒
const SPRAY_RATE = 26;                                  // 按住喷洒：每秒喷出光
const MAT_LIFE = 240;                                   // 魂晶掉在地上 240 秒后消散
const MAXM = 6000;
/* 特殊地点（遗迹）：藏在黑墙里 */
const POI = [
  { key: 'cave', name: '光之洞', icon: '✦', col: '#9ff4ff', desc: '封着一大团光的洞。挖通后光会洒出来。' },
  { key: 'reactor', name: '古灯台', icon: '☢', col: '#7dffb0', desc: '用路灯接上后，每秒产生 4 点光。' },
  { key: 'crystal', name: '魂晶矿', icon: '◆', col: '#ffd36b', desc: '小灯碰一下就能收走一大笔魂晶（一次性）。' },
  { key: 'obelisk', name: '无字碑', icon: '▲', col: '#c9a8ff', desc: '用路灯接上后：每秒 +0.4 光域，建筑上限 +2。' },
  { key: 'pod', name: '封印的蛋', icon: '⬭', col: '#ff9fd0', desc: '小灯碰一下就会孵化：放出一群小怪，并永久解锁这种小怪。' },
  { key: 'relay', name: '旧路灯', icon: '⌬', col: '#8fd8ff', desc: '用路灯接上后重新亮起，照亮半径 320 的超大范围。' },
];
const POI_IDX = {}; POI.forEach((p, i) => POI_IDX[p.key] = i);
