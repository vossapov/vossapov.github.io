/* Portfolio capture controller. Reuses radar-demo.html drawing functions/artwork.
   Paths below are illustrative normalized coordinates, never geographic data. */
(async function () {
  cancelAnimationFrame(raf); cfg.paused = true;
  cfg.scan = 10000; cfg.floor = 48; cfg.size = 16;
  await Promise.all(Object.values(ICON_IMG).map(im => im.decode()));
  const scenes = {};
  for (const state of ['green', 'amber', 'red']) {
    const im = new Image(); im.src = '/radar_scene_' + state + '.png';
    await im.decode(); scenes[state] = im;
  }
  await document.fonts.load('800 60px Nunito');
  const output = document.createElement('canvas'); output.id = 'demo-output';
  output.width = 936; output.height = 1680;
  output.style.cssText = 'display:block;width:468px;height:840px;max-width:none;border-radius:0';
  document.body.replaceChildren(output); document.body.style.cssText = 'margin:0;background:#111';
  const g = output.getContext('2d');
  const originalXY = blipXY, positions = new Map();
  blipXY = function (radius, az) { return positions.get(az) || originalXY(radius, az); };
  const targets = [mk(1,1000,'shahed'),mk(1,1001,'ballistic'),mk(1,1002,'kab')];
  targets.forEach(t => { t.lastHit=1500; });
  const paths = [[.78,-.44,-.60,.50],[-.82,-.27,.54,.54],[.26,.88,-.40,-.55]];
  let hits = 0, lastSecond = -1;
  const phases = [
    {at:0,state:'green',label:'спокійно'},
    {at:2000,state:'amber',label:'тривога'},
    {at:5000,state:'red',label:'небезпека'},
    {at:15000,state:'amber',label:'тривога'},
    {at:17000,state:'green',label:'спокійно'}
  ];
  window.renderDemo = function (ms) {
    const pi = phases.findLastIndex(p => ms >= p.at), phase=phases[pi];
    cfg.state=phase.state;
    tracks=phase.state==='green' ? [] : phase.state==='red' ? targets : targets.slice(0,1);
    const p=Math.max(0,Math.min(1,(ms-2000)/14000)), second=Math.floor(ms/1000);
    targets.forEach((t,i) => {
      if (second!==lastSecond && positions.has(t.az)) {
        positions.set(2000+i,positions.get(t.az).slice());
        t.prevAz=2000+i; t.transitionStart=ms;
      }
      const a=paths[i];
      positions.set(t.az,[cx+(a[0]+(a[2]-a[0])*p)*360,cy+(a[1]+(a[3]-a[1])*p)*360]);
    });
    lastSecond=second;
    const before=targets.map(t=>t.lastHit);
    draw(ms); cancelAnimationFrame(raf);
    targets.forEach((t,i)=>{ if(t.lastHit!==before[i]) hits++; });
    // Short crossfade between original scene assets, without rapid flashing.
    const fade=Math.min(1,(ms-phase.at)/400);
    g.globalAlpha=1;g.drawImage(scenes[phases[Math.max(0,pi-1)].state],0,0,936,1680);
    g.globalAlpha=fade;g.drawImage(scenes[phase.state],0,0,936,1680);g.globalAlpha=1;
    g.drawImage(cv,90.8,472.6,745,745);
    g.textAlign='center';g.font='800 60px Nunito';g.fillStyle='white';
    g.shadowColor='rgba(0,0,0,.7)';g.shadowBlur=12;g.shadowOffsetY=4;
    g.fillText(phase.label,468,1468);g.shadowBlur=0;g.shadowOffsetY=0;
    g.fillStyle='rgba(10,16,20,.65)';g.beginPath();g.roundRect(288,38,360,48,24);g.fill();
    g.font='700 22px Nunito';g.fillStyle='#fff';g.fillText('ДЕМО · СИМУЛЯЦІЯ',468,70);
    return {png:output.toDataURL('image/png').split(',')[1],state:phase.state,hits:hits,targets:tracks.length};
  };
  window.demoReady=true;
})();
