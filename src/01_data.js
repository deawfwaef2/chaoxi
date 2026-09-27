'use strict';
/* ===================== 常量与数据表（v0.5：能量不可再生 + 物质资源 + 迷雾遗迹） ===================== */
const VERSION = '0.6.0';
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

/* 生物表 —— v0.6：体型拉开差距（微小→巨型）；tier = 科研层级（需要潮汐 Lv ≥ tier-1 才能研究）
   pow: 基础战力；shell: 被攻击时防御倍率；tr: 特性（见 TRAITS） */
const SPECIES = [
  { key: 'slime', tier: 0, mat: 1, matT: 30, mcost: 0, name: '啵啵史莱姆', r: 7, maxE: 16, repE: 13, childE: 6, life: 50, mature: 8, speed: 38, meta: 0.22, diet: D_E, pow: 1.0, soc: SOC_HERD, al: AL_MOB, mv: MV_WALK, cost: 8, col: '#7cf5b0', col2: '#3fc98a', tr: ['split'], desc: '软糯的群居史莱姆。一只很弱，一群就敢反击捕食者。自己分裂繁殖。' },
  { key: 'bunny', tier: 0, mat: 1, matT: 30, mcost: 0, name: '团子兔', r: 7, maxE: 18, repE: 12, childE: 6, life: 42, mature: 7, speed: 64, meta: 0.2, diet: D_E, pow: 0.8, soc: SOC_HERD, al: AL_TIMID, mv: MV_HOP, pair: true, cost: 8, col: '#fff4fa', col2: '#ffb8d6', tr: ['fast'], desc: '跑得快、生得多、死得也快的麻薯兔。胆小，需要两只才能繁殖。' },
  { key: 'mite', tier: 1, mat: 1, matT: 50, mcost: 0, name: '星尘蚁', r: 3.5, maxE: 5, repE: 4, childE: 2, life: 22, mature: 4, speed: 40, meta: 0.08, diet: D_E, pow: 0.25, soc: SOC_HERD, al: AL_TIMID, mv: MV_WALK, cost: 4, col: '#ffe08a', col2: '#c8844a', tr: ['carrier'], desc: '米粒大小的搬运工。会把附近掉落的物质结晶搬回方塔（离线也在工作）。' },
  { key: 'mush', tier: 1, mat: 2, matT: 26, mcost: 5, name: '菇菇仔', r: 8, maxE: 26, repE: 20, childE: 9, life: 100, mature: 14, speed: 16, meta: 0.36, diet: D_E, reach: 12, pow: 2.2, soc: SOC_TERR, al: AL_TERR, mv: MV_SLOW, cost: 12, col: '#ff8a8a', col2: '#fff1dc', tr: ['reach'], desc: '用菌丝远距离吸收能量。慢吞吞但很凶，会赶走抢食者和同类。' },
  { key: 'firefly', tier: 1, mat: 1, matT: 40, mcost: 0, name: '萤火团', r: 4, maxE: 8, repE: 6, childE: 3, life: 24, mature: 5, speed: 44, meta: 0.12, diet: D_E, pow: 0.35, soc: SOC_HERD, al: AL_TIMID, mv: MV_FLY, cost: 5, col: '#fff27a', col2: '#9be86a', tr: ['fly'], desc: '成群飞舞的小光团。寿命极短、繁殖极快。' },
  { key: 'fox', tier: 2, mat: 5, matT: 18, mcost: 15, name: '圆滚狸', r: 11, maxE: 46, repE: 24, childE: 12, life: 160, mature: 20, speed: 76, meta: 0.28, diet: D_M, prey: ['slime', 'bunny', 'fish', 'mush', 'mite', 'beetle', 'spore'], pow: 3.5, soc: SOC_PACK, al: AL_BOLD, mv: MV_WALK, pair: true, cost: 30, col: '#ffb45c', col2: '#fff0dc', tr: [], desc: '成群狩猎的小狸，只吃生物。专挑落单和虚弱的猎物。' },
  { key: 'fish', tier: 2, mat: 1, matT: 30, mcost: 5, name: '泡泡鱼', r: 6, maxE: 12, repE: 9, childE: 4, life: 38, mature: 6, speed: 60, meta: 0.16, diet: D_E, pow: 0.6, soc: SOC_HERD, al: AL_TIMID, mv: MV_FLOAT, cost: 6, col: '#7ab8ff', col2: '#cfe6ff', tr: [], desc: '在空气里游泳的鱼群，结队吃能量。' },
  { key: 'hedgehog', tier: 2, mat: 2, matT: 26, mcost: 5, name: '刺球猬', r: 8, maxE: 22, repE: 17, childE: 8, life: 90, mature: 12, speed: 30, meta: 0.24, diet: D_E, pow: 1.4, soc: SOC_SOLO, al: AL_BOLD, mv: MV_WALK, cost: 12, col: '#d9b38c', col2: '#fff3e0', tr: ['thorn'], desc: '浑身软刺。谁敢咬它，谁就会被扎掉一大口能量——捕食者都绕着它走。' },
  { key: 'spore', tier: 2, mat: 1, matT: 30, mcost: 5, name: '孢孢球', r: 6.5, maxE: 14, repE: 11, childE: 5, life: 45, mature: 8, speed: 14, meta: 0.16, diet: D_E, pow: 0.6, soc: SOC_HERD, al: AL_TIMID, mv: MV_SLOW, cost: 8, col: '#d9a0ff', col2: '#fff4ff', tr: ['spore'], desc: '寿终正寝时“噗”地炸开，把剩余能量变成两只新的孢孢球。' },
  { key: 'bird', tier: 3, mat: 5, matT: 18, mcost: 15, name: '棉花鸟', r: 10, maxE: 38, repE: 20, childE: 10, life: 150, mature: 18, speed: 85, meta: 0.24, diet: D_M, prey: ['firefly', 'fish', 'slime', 'bunny', 'mite', 'spore', 'frog'], pow: 3, soc: SOC_SOLO, al: AL_BOLD, mv: MV_FLY, pair: true, cost: 24, col: '#f4f7ff', col2: '#ffd36b', tr: ['fly'], desc: '独行的空中猎手，速度极快，捕食小型生物。' },
  { key: 'snail', tier: 3, mat: 3, matT: 26, mcost: 10, name: '果冻蜗牛', r: 9, maxE: 40, repE: 30, childE: 12, life: 180, mature: 30, speed: 11, meta: 0.46, diet: D_E, pow: 1.2, shell: 3, soc: SOC_SOLO, al: AL_BOLD, mv: MV_SLOW, cost: 20, col: '#c9a8ff', col2: '#ffd1f0', tr: ['shell'], desc: '背着果冻硬壳，被攻击时防御 ×3。长寿、慢、稳定。' },
  { key: 'beetle', tier: 3, mat: 2, matT: 28, mcost: 5, name: '拾荒甲虫', r: 6.5, maxE: 14, repE: 11, childE: 5, life: 70, mature: 9, speed: 42, meta: 0.14, diet: D_E, ripeMin: 0, ripeMax: 254, pow: 1.0, shell: 1.8, soc: SOC_SOLO, al: AL_TIMID, mv: MV_WALK, cost: 8, col: '#7d8cff', col2: '#b6f0ff', tr: ['scav'], desc: '只吃刚爆出、还没凝结的新鲜能量（战斗和死亡留下的）。不和别人抢饭碗的清道夫。' },
  { key: 'frog', tier: 3, mat: 3, matT: 20, mcost: 10, name: '泡泡蛙', r: 8.5, maxE: 28, repE: 18, childE: 9, life: 110, mature: 14, speed: 55, meta: 0.2, diet: D_M, prey: ['firefly', 'mite', 'fish', 'beetle', 'spore'], pow: 2.2, soc: SOC_SOLO, al: AL_BOLD, mv: MV_HOP, pair: true, tongue: 45, cost: 16, col: '#8ce06a', col2: '#fff6c8', tr: ['tongue'], desc: '用长舌头隔空捕食小虫和小鱼，是飞行小生物的克星。' },
  { key: 'jelly', tier: 4, mat: 8, matT: 14, mcost: 30, name: '星星水母', r: 11, maxE: 36, repE: 28, childE: 12, life: 130, mature: 20, speed: 26, meta: 0.2, diet: D_M, prey: ['slime', 'bunny', 'firefly', 'fish', 'fox', 'bird', 'mite', 'octo'], pow: 3, soc: SOC_SOLO, al: AL_PASSIVE, mv: MV_ORBIT, cost: 22, col: '#9ff0ff', col2: '#ffb3f2', tr: ['sting'], desc: '绕着方塔漂浮的陷阱型捕食者：不追猎，碰到它的生物会被蛰。' },
  { key: 'octo', tier: 4, mat: 4, matT: 22, mcost: 15, name: '墨墨章鱼', r: 9, maxE: 26, repE: 20, childE: 9, life: 100, mature: 14, speed: 34, meta: 0.2, diet: D_E, pow: 1.2, soc: SOC_SOLO, al: AL_TIMID, mv: MV_FLOAT, cost: 14, col: '#ff9fb8', col2: '#ffe0ea', tr: ['ink'], desc: '被咬时有六成几率喷出墨云、瞬间逃走，毫发无伤。' },
  { key: 'sheep', tier: 4, mat: 4, matT: 20, mcost: 20, name: '棉棉羊', r: 12, maxE: 40, repE: 30, childE: 14, life: 150, mature: 20, speed: 30, meta: 0.3, diet: D_E, pow: 1.6, soc: SOC_HERD, al: AL_MOB, mv: MV_WALK, pair: true, cost: 20, col: '#fbf7ff', col2: '#c9b8ff', tr: ['wool'], desc: '三只以上聚在一起时，羊毛物质产量翻倍。群体会一起顶走捕食者。' },
  { key: 'bear', tier: 5, mat: 25, matT: 16, mcost: 80, name: '布丁熊', r: 24, maxE: 120, repE: 96, childE: 40, life: 220, mature: 40, speed: 50, meta: 0.55, diet: D_O, prey: ['fox', 'snail', 'fish', 'bunny', 'slime', 'mush', 'sheep', 'hedgehog', 'frog', 'weasel'], pow: 6, soc: SOC_TERR, al: AL_TERR, mv: MV_WALK, pair: true, cost: 60, col: '#e8b27a', col2: '#fff3c4', tr: [], desc: '杂食大块头。既吃能量也吃生物，领地意识强。' },
  { key: 'weasel', tier: 5, mat: 6, matT: 18, mcost: 40, name: '闪电貂', r: 10, maxE: 40, repE: 22, childE: 11, life: 120, mature: 18, speed: 80, meta: 0.3, diet: D_M, prey: ['bunny', 'slime', 'mite', 'beetle', 'spore', 'hedgehog', 'frog', 'fish', 'sheep'], pow: 3.2, soc: SOC_SOLO, al: AL_BOLD, mv: MV_WALK, pair: true, dash: true, cost: 28, col: '#ffe066', col2: '#fffaf0', tr: ['dash'], desc: '追猎时爆发 1.8 倍冲刺，但冲完要喘好几秒。连刺球猬都敢咬。' },
  { key: 'turtle', tier: 5, mat: 12, matT: 24, mcost: 60, name: '苔藓龟', r: 17, maxE: 90, repE: 70, childE: 30, life: 500, mature: 60, speed: 10, meta: 0.35, diet: D_E, pow: 2.5, shell: 5, soc: SOC_SOLO, al: AL_BOLD, mv: MV_SLOW, cost: 50, col: '#7fcf8f', col2: '#d8b07a', tr: ['shell', 'ancient'], desc: '活得最久的生物之一，龟壳防御 ×5。缓慢、稳定，是生态圈的“压舱石”。' },
  { key: 'whale', tier: 6, mat: 40, matT: 18, mcost: 150, name: '云朵鲸', r: 50, maxE: 300, repE: 240, childE: 100, life: 360, mature: 70, speed: 22, meta: 1.8, diet: D_E, pow: 9, soc: SOC_HERD, al: AL_BOLD, mv: MV_FLOAT, cost: 150, col: '#bfe0ff', col2: '#ffffff', tr: ['giant'], desc: '巨大温柔的食能者，几乎没有天敌，但吃得非常多。' },
  { key: 'ghost', tier: 6, mat: 10, matT: 18, mcost: 60, name: '灯笼幽灵', r: 10, maxE: 34, repE: 26, childE: 12, life: 140, mature: 20, speed: 30, meta: 0.22, diet: D_M, drain: true, pow: 1.5, soc: SOC_SOLO, al: AL_PASSIVE, mv: MV_FLOAT, cost: 30, col: '#c8d4ff', col2: '#9fffe6', tr: ['drain'], desc: '不捕猎，而是悄悄贴近别的生物、一点点吸走它们的能量。' },
  { key: 'dragon', tier: 7, mat: 120, matT: 18, mcost: 400, name: '糖豆龙', r: 34, maxE: 240, repE: 200, childE: 80, life: 300, mature: 60, speed: 64, meta: 0.8, diet: D_M, prey: ['bear', 'bird', 'fox', 'whale', 'jelly', 'sheep', 'turtle', 'weasel', 'unicorn'], pow: 12, soc: SOC_TERR, al: AL_BOLD, mv: MV_WALK, pair: true, cost: 140, col: '#9dffb0', col2: '#ffe38a', tr: ['apex'], desc: '顶级掠食者，捕食布丁熊、云朵鲸等大型生物。' },
  { key: 'unicorn', tier: 7, mat: 50, matT: 18, mcost: 200, name: '彩虹独角兽', r: 24, maxE: 150, repE: 120, childE: 50, life: 300, mature: 50, speed: 55, meta: 0.7, diet: D_E, pow: 5, soc: SOC_HERD, al: AL_BOLD, mv: MV_WALK, pair: true, cost: 90, col: '#fff0fb', col2: '#b8e4ff', tr: ['bless'], desc: '身边的生物衰老速度减半、代谢降低——走到哪里，哪里就欣欣向荣。' },
  { key: 'phoenix', tier: 8, mat: 150, matT: 18, mcost: 600, name: '焰尾凤凰', r: 30, maxE: 260, repE: 210, childE: 90, life: 320, mature: 60, speed: 90, meta: 0.9, diet: D_M, prey: ['bird', 'fox', 'weasel', 'sheep', 'bear', 'jelly', 'frog', 'octo', 'unicorn', 'ghost'], pow: 13, soc: SOC_SOLO, al: AL_BOLD, mv: MV_FLY, pair: true, cost: 160, col: '#ff8a5c', col2: '#ffe066', tr: ['rebirth', 'fly'], desc: '传说中的空中霸主。寿终时会带着余烬浴火重生一次。' },
];
/* 特性（图标化展示 + 模拟里的真实效果） */
const TRAITS = {
  split: { ic: '🫧', name: '分裂', d: '不需要伴侣，自己分裂繁殖' },
  fast: { ic: '💨', name: '敏捷', d: '跳得快，最擅长逃跑' },
  carrier: { ic: '📦', name: '搬运', d: '把附近的物质结晶搬回方塔' },
  reach: { ic: '🕸️', name: '菌丝', d: '远距离吸收能量' },
  fly: { ic: '🪽', name: '飞行', d: '在空中移动，无视拥挤' },
  thorn: { ic: '🌵', name: '尖刺', d: '攻击它的生物会被反伤' },
  spore: { ic: '💥', name: '孢子', d: '寿终时变成两只幼体' },
  shell: { ic: '🛡️', name: '硬壳', d: '被攻击时防御大幅提升' },
  scav: { ic: '🦴', name: '拾荒', d: '只吃战斗/死亡爆出的新鲜能量' },
  tongue: { ic: '👅', name: '长舌', d: '隔空 45 距离捕食' },
  sting: { ic: '⚡', name: '蛰刺', d: '碰到它的猎物会被蛰' },
  ink: { ic: '🌫️', name: '墨遁', d: '被咬时 60% 喷墨逃脱' },
  wool: { ic: '🧶', name: '羊毛', d: '成群时物质产量 ×2' },
  dash: { ic: '⚡', name: '冲刺', d: '追猎时 1.8 倍速爆发' },
  ancient: { ic: '⏳', name: '长寿', d: '寿命极长，种群稳定' },
  giant: { ic: '🐋', name: '巨型', d: '体型巨大，几乎无天敌' },
  drain: { ic: '🩸', name: '汲取', d: '贴近其他生物持续吸取能量' },
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

/* 观测者装置 —— v0.6：基础建造 60 秒；tier = 科研层级；pf = 导能场半径（导能类） */
const DEVICES = [
  { key: 'pylon', tier: 0, mc: 5, name: '导能塔', cost: 1, time: 60, r: PYLON_FIELD, pf: PYLON_FIELD, desc: '提供能量场，其它建筑只能建在能量场内。必须建在已有能量场里，一座接一座连成网络。' },
  { key: 'lab', tier: 0, mc: 15, name: '科研站', cost: 2, time: 60, rs: 0.25, desc: '研究新物种与新建筑。研究速度由【观测潮汐】驱动：潮汐越高，研究越快。' },
  { key: 'collector', tier: 1, mc: 12, name: '物质收集器', cost: 1, time: 60, r: 210, desc: '自动吸取范围内生物掉落的物质结晶（离线时也能收集）。' },
  { key: 'wire', tier: 1, mc: 10, name: '绊线仪', cost: 2, time: 60, len: 220, desc: '两根桩之间的光线。每有生物穿过 +0.5 潮汐（同一只 4 秒内只算一次）。R 键旋转。' },
  { key: 'catcher', tier: 1, mc: 20, name: '光灵捕集器', cost: 2, time: 75, r: 260, desc: '把范围内飘过的光灵吸进来，化作地面能量喂养生物。离线时也在工作——生态圈自动运转的关键。' },
  { key: 'census', tier: 2, mc: 15, name: '普查环', cost: 2, time: 75, r: 160, desc: '范围内每只生物每秒 +0.01 潮汐。' },
  { key: 'ripen', tier: 2, mc: 15, name: '凝能塔', cost: 2, time: 75, r: 150, desc: '范围内新释放的能量凝结速度 ×4，让食物更快可吃。' },
  { key: 'well', tier: 3, mc: 20, name: '引力井', cost: 2, time: 90, r: 260, desc: '把范围内的能量缓缓吸向中心，制造“食堂”（也会吸引争抢）。' },
  { key: 'prism', tier: 3, mc: 30, name: '多样性棱镜', cost: 3, time: 90, r: 180, desc: '范围内每有一个不同物种，每秒 +0.15 潮汐。' },
  { key: 'arena', tier: 3, mc: 30, name: '角斗观测台', cost: 3, time: 90, r: 190, desc: '范围内每次战斗 +1 潮汐，每次捕杀 +2.5。冲突越多收益越高——但生态会更不稳定。' },
  { key: 'bell', tier: 4, mc: 30, name: '共鸣钟', cost: 3, time: 90, r: 200, desc: '范围内每诞生一只生物 +1 潮汐。' },
  { key: 'lure', tier: 4, mc: 20, name: '诱导信标', cost: 2, time: 75, r: 320, desc: '吸引范围内闲逛的食能生物靠近（配合绊线仪、普查环）。' },
  { key: 'barrier', tier: 4, mc: 40, name: '屏障发生器', cost: 3, time: 90, len: 240, desc: '一道只拦截食肉/杂食动物的力场墙。R 键旋转。' },
  { key: 'pylon2', tier: 4, mc: 40, name: '巨型导能塔', cost: 2, time: 90, r: 290, pf: 290, desc: '超大范围的能量场（半径 290），快速把电网铺向远方的遗迹。' },
  { key: 'sanct', tier: 5, mc: 60, name: '安宁结界', cost: 4, time: 120, r: 140, desc: '范围内禁止一切战斗和捕猎，是猎物的避难所。' },
  { key: 'stasis', tier: 5, mc: 60, name: '静滞场', cost: 4, time: 120, r: 150, desc: '范围内生物衰老速度 -50%，代谢 -30%。' },
  { key: 'nursery', tier: 5, mc: 50, name: '繁育温室', cost: 3, time: 120, r: 170, desc: '范围内生物的繁殖冷却缩短 40%，幼崽成长更快。' },
  { key: 'scare', tier: 5, mc: 50, name: '威慑塔', cost: 3, time: 120, r: 170, desc: '让捕食者（食肉/杂食）不敢进入范围内，把它们赶出去。' },
  { key: 'chron', tier: 6, mc: 120, name: '长河记录仪', cost: 5, time: 150, desc: '全局：生物总数越稳定（近 60 秒波动越小），每次结算加成越高（最多 +14）。' },
  { key: 'rlab', tier: 6, mc: 150, name: '量子研究所', cost: 4, time: 150, rs: 1.0, desc: '高级科研设施：研究速度是科研站的 4 倍。' },
  { key: 'pool', tier: 6, mc: 100, name: '潮汐池', cost: 4, time: 150, r: 200, desc: '范围内每存在一个营养级（食能 / 捕食 / 顶级），每秒 +0.4 潮汐。' },
  { key: 'sun', tier: 7, mc: 220, name: '星光汇聚塔', cost: 4, time: 180, r: 220, desc: '从星空中牵引光灵降落在周围（约每 1.5 秒一只）。配合光灵捕集器，形成稳定的能量来源。' },
  { key: 'lens', tier: 7, mc: 150, name: '潮汐透镜', cost: 6, time: 180, r: 260, desc: '范围内其它建筑产出的潮汐 ×1.3（可叠加）。' },
  { key: 'elder', tier: 8, mc: 120, name: '回响尖塔', cost: 5, time: 150, r: 220, desc: '范围内每只年迈生物（寿命过 60%）每秒 +0.04 潮汐。' },
  { key: 'ark', tier: 9, mc: 200, name: '方舟碑', cost: 6, time: 180, r: 220, desc: '范围内存活物种 ≥6 时，每秒 +0.6 潮汐。' },
];
const ND = DEVICES.length;
const DV_IDX = {}; DEVICES.forEach((d, i) => { d.id = i; DV_IDX[d.key] = i; });
const D_PYLON = DV_IDX.pylon;

function buildCap(lv) { return 4 + 3 * lv; }
function wallHP(d) { return 4 + 3 * Math.pow(Math.max(0, d - START_R + 60) / 300, 1.7); }
function wallE(d) { return 1 + Math.floor(d / 350); }

/* ---------- v0.6 经济：白球不再自动回充，能量来自环境中的【光灵】 ---------- */
function tankMax(lv) { return 80 + 40 * lv; }           // 白球能量槽上限
function tankRegen(lv) { return 2 + 0.6 * lv; }         // 仅作生态位容量估算的下限（不再真的回充）
const MAXW = 900, WISP_LIFE = 150, WISP_MAG = 120;        // 光灵：上限 / 寿命 / 白球吸取半径
/* 科研：tier 1..9 的研究点数 */
const RES_COST = [0, 30, 60, 110, 200, 380, 700, 1300, 2400, 4400];
function resGate(tier) { return Math.max(0, tier - 1); } // 需要的潮汐历史最高等级
const AD_BUILD_CUT = 60;                                // 看广告：建造 -60 秒
const SPRAY_RATE = 26;                                  // 按住喷洒：每秒喷出能量
const MAT_LIFE = 240;                                   // 物质结晶掉在地上 240 秒后消散
const MAXM = 6000;
/* 特殊地点（遗迹）：藏在黑墙里 */
const POI = [
  { key: 'cave', name: '能量洞', icon: '✦', col: '#9ff4ff', desc: '封存着一大团能量的洞穴。挖通后能量会被生物找到。' },
  { key: 'reactor', name: '远古反应堆', icon: '☢', col: '#7dffb0', desc: '用导能塔把它接入能量网络后，每秒生成 4 点能量。' },
  { key: 'crystal', name: '物质晶簇', icon: '◆', col: '#ffd36b', desc: '白球触碰即可采集一大笔物质（一次性）。' },
  { key: 'obelisk', name: '观测古碑', icon: '▲', col: '#c9a8ff', desc: '接入能量网络后：每秒 +0.4 潮汐，建造额度 +2。' },
  { key: 'pod', name: '休眠孵化舱', icon: '⬭', col: '#ff9fd0', desc: '白球触碰唤醒：放出一群生物，并永久解锁该物种。' },
  { key: 'relay', name: '远古中继塔', icon: '⌬', col: '#8fd8ff', desc: '接入能量网络后，提供半径 320 的超大能量场。' },
];
const POI_IDX = {}; POI.forEach((p, i) => POI_IDX[p.key] = i);
