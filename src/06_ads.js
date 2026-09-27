/* ===================== 万能广告适配层 =====================
   自动识别：CrazyGames SDK v3 / Playgama Bridge / Poki SDK / GameDistribution
   上传到对应平台时，只需在 <head> 里取消注释对应 SDK 的 <script> 即可；
   没有 SDK 时使用本地“模拟广告”（3 秒），保证单机可玩、可测试。 */
const Ads = {
  platform: 'local', ready: false, busy: false,
  async init() {
    try {
      if (window.CrazyGames && window.CrazyGames.SDK) { this.platform = 'crazygames'; try { await window.CrazyGames.SDK.init(); } catch (e) { } }
      else if (window.bridge && window.bridge.initialize) { this.platform = 'playgama'; await window.bridge.initialize(); }
      else if (window.PokiSDK) { this.platform = 'poki'; await window.PokiSDK.init(); }
      else if (window.gdsdk) { this.platform = 'gamedistribution'; }
    } catch (e) { console.warn('ads init', e); this.platform = 'local'; }
    this.ready = true;
  },
  gameplayStart() { try { if (this.platform === 'crazygames') window.CrazyGames.SDK.game.gameplayStart(); else if (this.platform === 'poki') window.PokiSDK.gameplayStart(); else if (this.platform === 'playgama' && window.bridge.platform && window.bridge.platform.sendMessage) window.bridge.platform.sendMessage('gameplay_started'); } catch (e) { } },
  gameplayStop() { try { if (this.platform === 'crazygames') window.CrazyGames.SDK.game.gameplayStop(); else if (this.platform === 'poki') window.PokiSDK.gameplayStop(); else if (this.platform === 'playgama' && window.bridge.platform && window.bridge.platform.sendMessage) window.bridge.platform.sendMessage('gameplay_stopped'); } catch (e) { } },
  happytime() { try { if (this.platform === 'crazygames') window.CrazyGames.SDK.game.happytime(); } catch (e) { } },
  loadingDone() { try { if (this.platform === 'playgama' && window.bridge.platform && window.bridge.platform.sendMessage) window.bridge.platform.sendMessage('game_ready'); if (this.platform === 'poki') window.PokiSDK.gameLoadingFinished(); } catch (e) { } },
  // 激励广告：成功 → onReward()，失败/取消 → onFail(msg)
  rewarded(onReward, onFail) {
    if (this.busy) return; this.busy = true;
    const done = (ok, msg) => { this.busy = false; AU.duck(false); if (ok) onReward(); else if (onFail) onFail(msg || '广告未完成'); };
    AU.duck(true);
    try {
      if (this.platform === 'crazygames') {
        window.CrazyGames.SDK.ad.requestAd('rewarded', { adStarted: () => { }, adFinished: () => done(true), adError: (e) => done(false, '暂时没有广告') });
      } else if (this.platform === 'playgama') {
        const b = window.bridge; let rewarded = false;
        const h = (state) => { if (state === 'rewarded') rewarded = true; if (state === 'closed' || state === 'failed') { try { b.advertisement.off(b.EVENT_NAME.REWARDED_STATE_CHANGED, h); } catch (e) { } done(rewarded || state === 'rewarded', '暂时没有广告'); } };
        b.advertisement.on(b.EVENT_NAME.REWARDED_STATE_CHANGED, h); b.advertisement.showRewarded();
      } else if (this.platform === 'poki') {
        window.PokiSDK.rewardedBreak().then(ok => done(!!ok, '广告未完成'));
      } else if (this.platform === 'gamedistribution') {
        window.gdsdk.showAd('rewarded').then(() => done(true)).catch(() => done(false, '暂时没有广告'));
      } else this.localAd(done);
    } catch (e) { done(false, '广告出错'); }
  },
  localAd(done) {
    const m = document.getElementById('adSim'), c = document.getElementById('adCount'); if (!m) { done(true); return; }
    m.classList.add('show'); let n = 3; c.textContent = n;
    const iv = setInterval(() => { n--; c.textContent = n; if (n <= 0) { clearInterval(iv); m.classList.remove('show'); done(true); } }, 1000);
    document.getElementById('adSkip').onclick = () => { clearInterval(iv); m.classList.remove('show'); done(false, '已取消'); };
  },
};
