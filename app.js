const STAGE_W=1536, STAGE_H=1024;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stage=$('#stage'),wrap=$('#stageWrap'),introScene=$('#introScene'),startScene=$('#startScene'),gameScene=$('#gameScene');
const editorBar=$('#editorBar'),editToggle=$('#editToggle'),inspector=$('#inspector');
let editing=false, selected=null, drag=null, muted=false;
let tool=null,progress=0,waterTimer=null,grenadeReady=true,grenadeTimer=null,villainTimer=null,finished=false;
let subtitleCues=[], currentCueIndex=-1;
const GRENADE_READY_DELAY=300;
const defaults={};

function srtTimeToSeconds(str){
  const [h,m,rest]=str.trim().split(':');
  const [s,ms]=rest.split(',');
  return (+h)*3600 + (+m)*60 + (+s) + (+ms)/1000;
}
function parseSRT(raw){
  return raw
    .replace(/\r/g,'')
    .trim()
    .split(/\n\n+/)
    .map(block=>{
      const lines=block.split('\n').filter(Boolean);
      if(lines.length<2) return null;
      const timeLine=lines[1] && lines[1].includes('-->') ? lines[1] : lines[0];
      const textLines=lines[1] && lines[1].includes('-->') ? lines.slice(2) : lines.slice(1);
      const m=timeLine.match(/(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/);
      if(!m) return null;
      return {start:srtTimeToSeconds(m[1]), end:srtTimeToSeconds(m[2]), text:(textLines[0]||'').trim()};
    })
    .filter(Boolean);
}
async function loadSubtitleCues(){
  if(!subtitleCues.length) subtitleCues=[{start:0.399,end:2.713,text:'مصر! مصر!'},{start:7.261,end:10.532,text:'يا أكتوبر يا أحلى حكاية'},{start:11.089,end:14.121,text:'يا نصر كتبناه بالراية'},{start:14.680,end:17.713,text:'عدّينا القنال بإيدينا'},{start:18.190,end:21.143,text:'ورجعت سينا تنوّر لينا'},{start:21.542,end:24.335,text:'ست سنين واحنا بنستنّى'},{start:24.893,end:28.085,text:'والجندي على الشط بيتمنّى'},{start:28.484,end:31.117,text:'يعدّي الموج ويبوس أرضه'},{start:32.234,end:34.707,text:'وده واجبه وده كان فرضه'},{start:35.904,end:39.176,text:'يا أكتوبر يا أحلى حكاية'},{start:39.654,end:42.765,text:'يا نصر كتبناه بالراية'},{start:43.244,end:46.277,text:'عدّينا القنال بإيدينا'},{start:46.755,end:48.988,text:'ورجعت سينا تنوّر لينا'},{start:49.786,end:52.659,text:'عاشر رمضان والساعة اتنين'},{start:53.616,end:56.409,text:'والصايمين واقفين مستعدين'},{start:57.207,end:59.680,text:'طيّاراتنا سبقت في السما'},{start:60.558,end:63.191,text:'وقالت للدنيا مصر هنا'},{start:64.388,end:67.100,text:'قالوا بارليف سور ما بيوقعش'},{start:67.420,end:70.611,text:'عالي وتقيل وعمره ما يتزحزحش'},{start:70.930,end:74.760,text:'جه مهندسنا بفكرة بسيطة'},{start:74.840,end:77.472,text:'خرطوم ميّه وفتح الحيطة'},{start:78.590,end:81.861,text:'يا أكتوبر يا أحلى حكاية'},{start:82.340,end:85.451,text:'يا نصر كتبناه بالراية'},{start:85.930,end:88.962,text:'عدّينا القنال بإيدينا'},{start:89.441,end:91.676,text:'ورجعت سينا تنوّر لينا'},{start:93.031,end:96.144,text:'في ست ساعات الحلم اتحقق'},{start:96.543,end:99.813,text:'والعلم فوق سينا رفرف وصفّق'},{start:100.132,end:103.483,text:'والدنيا كلها قالت يا سلام'},{start:103.962,end:106.915,text:'المصري بطل وبيحب السلام'},{start:107.394,end:110.426,text:'وانت يا صغير يا حبيب بلدك'},{start:111.302,end:114.016,text:'الحكاية دي أمانة في إيدك'},{start:114.573,end:117.527,text:'بطل أكتوبر عدّى بالسلاح'},{start:118.004,end:121.037,text:'وانت هتعدّي بالعلم والنجاح'},{start:122.951,end:126.302,text:'يا أكتوبر يا أحلى حكاية'},{start:126.781,end:129.813,text:'يا نصر كتبناه بالراية'},{start:130.293,end:133.324,text:'عدّينا القنال بإيدينا'},{start:133.802,end:136.037,text:'ورجعت سينا تنوّر لينا'},{start:136.914,end:138.830,text:'تحيا مصر!'}];
  return subtitleCues;
}


function scaleStage(){
  const top=0, pad=12;
  const maxW=innerWidth-pad*2, maxH=innerHeight-top-pad*2;
  const scale=Math.min(maxW/STAGE_W,maxH/STAGE_H);
  wrap.style.width=(STAGE_W*scale)+'px'; wrap.style.height=(STAGE_H*scale)+'px';
  stage.style.transform=`scale(${scale})`; stage.dataset.scale=scale;
}
addEventListener('resize',scaleStage); scaleStage();

$$('.layout-item').forEach(el=>{
  const id=el.dataset.layout; defaults[id]={left:el.style.left,top:el.style.top,width:el.style.width,height:el.style.height};
  const saved=JSON.parse(localStorage.getItem('october-layout-v14')||'{}')[id];
  if(saved) applyBox(el,saved);
});
function box(el){return {x:parseFloat(el.style.left)||0,y:parseFloat(el.style.top)||0,w:parseFloat(el.style.width)||el.offsetWidth,h:parseFloat(el.style.height)||el.offsetHeight}}
function applyBox(el,b){const lx=parseFloat(el.style.left)||0, ty=parseFloat(el.style.top)||0, ww=parseFloat(el.style.width)||el.offsetWidth, hh=parseFloat(el.style.height)||el.offsetHeight;el.style.left=((b.x ?? lx))+'px';el.style.top=((b.y ?? ty))+'px';el.style.width=((b.w ?? ww))+'px';el.style.height=((b.h ?? hh))+'px'}
function saveLayout(){const data={};$$('.layout-item').forEach(el=>data[el.dataset.layout]=box(el));localStorage.setItem('october-layout-v14',JSON.stringify(data));return data}
function updateInspector(){if(!selected)return;const b=box(selected);$('#selectedName').textContent=selected.dataset.name||selected.dataset.layout;$('#xRead').textContent=Math.round(b.x);$('#yRead').textContent=Math.round(b.y);$('#xInput').value=Math.round(b.x);$('#yInput').value=Math.round(b.y);$('#wInput').value=Math.round(b.w);$('#hInput').value=Math.round(b.h)}
function select(el){if(!editing)return; $$('.layout-item.selected').forEach(x=>x.classList.remove('selected'));selected=el;el.classList.add('selected');inspector.classList.remove('hidden');updateInspector()}
function deselect(){if(selected)selected.classList.remove('selected');selected=null;inspector.classList.add('hidden')}
function toggleEdit(force){editing=force??!editing;stage.classList.toggle('editing',editing);editToggle.classList.toggle('active',editing);editToggle.textContent=editing?'إنهاء التحريك':'تحريك العناصر';if(!editing){saveLayout();deselect();} toast(editing?'وضع التحريك مفعّل — اختاري أي عنصر':'تم حفظ أماكن العناصر')}
editToggle.onclick=()=>toggleEdit();$('#closeInspector').onclick=deselect;
$('#resetLayout').onclick=()=>{localStorage.removeItem('october-layout-v14');$$('.layout-item').forEach(el=>{const d=defaults[el.dataset.layout];if(d){el.style.left=d.left;el.style.top=d.top;el.style.width=d.width;el.style.height=d.height}});updateInspector();toast('رجعت الأماكن الأصلية')};
$('#copyLayout').onclick=async()=>{const txt=JSON.stringify(saveLayout(),null,2);try{await navigator.clipboard.writeText(txt);toast('تم نسخ كل إحداثيات اللعبة')}catch{prompt('انسخي الإحداثيات:',txt)}};
$$('.layout-item').forEach(el=>{
  el.addEventListener('pointerdown',e=>{if(!editing)return; e.preventDefault();e.stopPropagation();select(el);const s=parseFloat(stage.dataset.scale)||1;const b=box(el);drag={el,s,startX:e.clientX,startY:e.clientY,x:b.x,y:b.y};el.setPointerCapture?.(e.pointerId)});
});
stage.addEventListener('pointermove',e=>{if(!drag||!editing)return;const dx=(e.clientX-drag.startX)/drag.s,dy=(e.clientY-drag.startY)/drag.s;drag.el.style.left=Math.round(drag.x+dx)+'px';drag.el.style.top=Math.round(drag.y+dy)+'px';updateInspector()});
stage.addEventListener('pointerup',()=>{if(drag){drag=null;saveLayout()}});stage.addEventListener('pointercancel',()=>drag=null);
function nudge(dx,dy,amount=1){if(!selected)return;const b=box(selected);selected.style.left=(b.x+dx*amount)+'px';selected.style.top=(b.y+dy*amount)+'px';updateInspector();saveLayout()}
$$('[data-nudge]').forEach(btn=>btn.onclick=()=>{const [dx,dy]=btn.dataset.nudge.split(',').map(Number);nudge(dx,dy,1)});
['xInput','yInput','wInput','hInput'].forEach(id=>$('#'+id).addEventListener('change',()=>{if(!selected)return;applyBox(selected,{x:+$('#xInput').value,y:+$('#yInput').value,w:+$('#wInput').value,h:+$('#hInput').value});updateInspector();saveLayout()}));
addEventListener('keydown',e=>{if(!editing||!selected)return;let d=null;if(e.key==='ArrowLeft')d=[-1,0];if(e.key==='ArrowRight')d=[1,0];if(e.key==='ArrowUp')d=[0,-1];if(e.key==='ArrowDown')d=[0,1];if(d){e.preventDefault();nudge(d[0],d[1],e.shiftKey?10:1)}});
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(t._tm);t._tm=setTimeout(()=>t.classList.add('hidden'),1600)}

function showStartAfterIntro(){
  introScene.classList.remove('active');
  startScene.classList.add('active');
}
async function safePlayVideo(video){
  if(!video) return;
  try{
    video.muted=muted;
    video.defaultMuted=muted;
    video.volume=1;
    video.playsInline=true;
    video.autoplay=true;
    video.currentTime=0;
  }catch{}
  const tryPlay=async()=>{
    try{ await video.play(); return true; }
    catch{return false;}
  };
  if(await tryPlay()) return;
  await new Promise(resolve=>{
    let done=false;
    const ready=async()=>{
      if(done)return;
      done=true;
      cleanup();
      const ok=await tryPlay();
      if(!ok && video.id==='preloadVideo'){
        const gate=$('#introSoundGate'); gate.classList.remove('hidden');
        await new Promise(done=>{gate.onclick=async()=>{gate.classList.add('hidden');video.muted=false;video.volume=1;try{await video.play()}catch{}done();};});
      }
      resolve();
    };
    const cleanup=()=>{
      video.removeEventListener('loadeddata',ready);
      video.removeEventListener('canplay',ready);
    };
    video.addEventListener('loadeddata',ready,{once:true});
    video.addEventListener('canplay',ready,{once:true});
    try{video.load()}catch{}
    setTimeout(ready,1200);
  });
}
function waitForVideoEnd(video){
  return new Promise(resolve=>{
    if(!video){resolve();return;}
    let done=false;
    const finish=()=>{if(done)return;done=true;cleanup();resolve();};
    const cleanup=()=>{video.removeEventListener('ended',finish);video.removeEventListener('error',finish)};
    video.addEventListener('ended',finish,{once:true});
    video.addEventListener('error',finish,{once:true});
    // fallback لو الفيديو المؤقت مش اشتغل في المتصفح
    setTimeout(()=>{if(!done && video.paused) finish()},1200);
  });
}
async function fadeToBlack(ms=700){
  const black=$('#introBlack');
  black.classList.add('show');
  await new Promise(r=>setTimeout(r,ms));
}
async function fadeFromBlack(ms=500){
  const black=$('#introBlack');
  black.classList.remove('show');
  await new Promise(r=>setTimeout(r,ms));
}
async function playIntroStep(video,nextVideo=null,{fadeOut=true}={}){
  $$('.sequence-video').forEach(v=>{if(v!==video)v.classList.add('hidden')});
  video.classList.remove('hidden','fade-out');
  await fadeFromBlack(250);
  await safePlayVideo(video);
  await waitForVideoEnd(video);
  if(fadeOut) await fadeToBlack(750);
  try{video.pause()}catch{}
  video.classList.add('hidden');
  if(nextVideo) nextVideo.classList.remove('hidden');
}
async function runIntro(){
  editorBar.classList.add('intro-hidden');
  const first=$('#preloadVideo');
  const loading=$('#loadingVideo');
  const startVid=$('#startScreenVideo');
  [first,loading,startVid].forEach(v=>{v.muted=muted;v.defaultMuted=muted;v.volume=1;});
  loading.playbackRate=2; loading.defaultPlaybackRate=2;
  $('#introBlack').classList.add('show');

  // 1) فيديو هبل اللود: يظهر 16 ثانية بالضبط، وآخر 0.8 ثانية Fade للأسود
  $$('.sequence-video').forEach(v=>{if(v!==first)v.classList.add('hidden')});
  first.classList.remove('hidden','fade-out');
  await fadeFromBlack(250);
  first.currentTime=0;
  await safePlayVideo(first);
  await new Promise(resolve=>{
    const fadeTimer=setTimeout(()=>$('#introBlack').classList.add('show'),15200);
    const endTimer=setTimeout(()=>{clearTimeout(fadeTimer);resolve()},16000);
    first._introTimers=[fadeTimer,endTimer];
  });
  try{first.pause()}catch{}
  first.classList.add('hidden');
  loading.classList.remove('hidden');

  // 2) فيديو اللود
  await playIntroStep(loading,startVid,{fadeOut:true});
  // 3) فيديو شاشة البداية -> بعدها الغلاف التفاعلي
  await playIntroStep(startVid,null,{fadeOut:true});
  showStartAfterIntro();
  setTimeout(()=>$('#introBlack').classList.remove('show'),100);
}
runIntro();

// AUDIO
const aud={gun:$('#sndGun'),throw:$('#sndThrow'),boom:$('#sndBoom'),laugh:$('#sndLaugh'),fear:$('#sndFear'),water:$('#sndWater'),victory:$('#sndVictory'),click:$('#sndClick')};
function play(a,loop=false){if(muted||!a)return;try{a.pause();a.currentTime=0;a.loop=loop;a.play().catch(()=>{})}catch{}}
function stop(a){try{a.pause();a.currentTime=0}catch{}}
function applyGlobalMute(){
  document.querySelectorAll('audio,video').forEach(m=>{try{m.muted=muted}catch{}});
  const b=$('#globalSoundBtn'); if(b){b.classList.toggle('muted',muted);b.setAttribute('aria-pressed',String(muted));}
}
function toggleGlobalSound(){muted=!muted;applyGlobalMute();toast(muted?'الصوت متوقف':'الصوت يعمل')}
$('#globalSoundBtn').addEventListener('click',e=>{e.stopPropagation();toggleGlobalSound()});
$('.start-sound')?.addEventListener('click',e=>{if(editing)return;e.stopPropagation();toggleGlobalSound()});
applyGlobalMute();

// START -> GAME DIRECTLY, NO SECOND START SCREEN
$('#startGameBtn').addEventListener('click',()=>{if(editing)return;play(aud.click);startScene.classList.remove('active');gameScene.classList.add('active');resetGameState(false);toast('اختاري أداة، ثم اضغطي على السلاح الظاهر لاستخدامه')});
$('#replayBtn').onclick=()=>{stopEndingVideo();resetGameState(false);gameScene.classList.remove('active');startScene.classList.add('active');toast('رجعنا للغلاف')};

function resetGameState(showToast=true){
 finished=false;tool=null;progress=0;grenadeReady=true;clearTimeout(grenadeTimer);stopWater();stopEndingVideo();stop(aud.victory);
 $('#progressBar').style.width='0%';setBreachReveal(0);$('#breachBg').style.opacity='0';$('#gameBg').style.opacity='1';$('#boats').classList.add('hidden');$('#boats').classList.remove('show');$('#playerWeapon').classList.add('hidden');$('#waterSpray').classList.add('hidden');$('#villainWrap').classList.add('hidden');$('#villainWrap').classList.remove('show');$('#grenadeTimer').classList.add('hidden');$$('.tool-choice').forEach(b=>b.classList.remove('active'));$('#toolDock').classList.remove('hidden');$('#missionHud').classList.remove('hidden');$('#collapseFx').innerHTML='';$('#endingVideoLayer').classList.add('hidden');
 if(showToast)toast('بدأت من جديد');
}

$$('.tool-choice').forEach(btn=>btn.addEventListener('click',()=>{if(editing||finished)return;chooseTool(btn.dataset.tool,btn)}));
function chooseTool(name,btn){tool=name;$$('.tool-choice').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const w=$('#playerWeapon');w.className='layout-item player-weapon contain weapon-interactive';w.dataset.layout='game.weapon';w.dataset.name='السلاح في يد اللاعب';
 if(name==='gun'){w.src='assets/hand_gun.png';toast('اضغطي على المسدس لإطلاق النار');}
 if(name==='grenade'){w.src=grenadeReady?'assets/hand_grenade.png':'assets/hand_empty.png';toast(grenadeReady?'اضغطي على القنبلة لرميها':'القنبلة قيد إعادة التجهيز');}
 if(name==='water'){w.src='assets/nozzle.png';toast('اضغطي باستمرار على مدفع المياه');}
}

// استخدام السلاح يتم مباشرة من صورة السلاح الكبيرة التي تظهر بعد الاختيار.
const playerWeapon=$('#playerWeapon');
playerWeapon.addEventListener('pointerdown',e=>{
  if(editing||finished||!tool)return;
  e.preventDefault();e.stopPropagation();
  playerWeapon.classList.add('pressed');
  if(tool==='gun')fireGun();
  if(tool==='grenade')throwGrenade();
  if(tool==='water')startWater();
});
['pointerup','pointerleave','pointercancel'].forEach(ev=>playerWeapon.addEventListener(ev,()=>{
  playerWeapon.classList.remove('pressed');
  if(tool==='water')stopWater();
}));
// منطقة الساتر لم تعد زرًا مخفيًا؛ تبقى فقط كطبقة غير تفاعلية.
$('#targetZone').style.pointerEvents='none';

function setBreachReveal(progressPct){
  const p=Math.max(0,Math.min(100,progressPct));
  const breach=$('#breachBg');
  if(p<=0){breach.style.opacity='0';breach.style.clipPath='circle(0% at 52% 56%)';$('#gameBg').style.opacity='1';return;}
  breach.style.opacity='1';
  // الفتحة تبدأ صغيرة جدًا ولا تكتمل بصريًا إلا قرب نهاية التقدم.
  const visual=Math.max(0,(p-8)/92);
  const eased=Math.pow(visual,1.55);
  const radius=Math.min(145,eased*145);
  breach.style.clipPath=`circle(${radius}% at 52% 56%)`;
  if(p<82) $('#gameBg').style.opacity='1';
  else $('#gameBg').style.opacity=String(Math.max(0,1-((p-82)/18)));
}
function spawnCollapseBurst(){
  const fx=$('#collapseFx');
  if(!fx) return;
  const baseX=770 + Math.random()*120 - 60;
  const baseY=360 + Math.random()*80 - 30;
  for(let i=0;i<4;i++){
    const r=document.createElement('div');
    r.className='collapse-rock';
    const size=10+Math.random()*18;
    r.style.width=size+'px'; r.style.height=(size*0.9)+'px';
    r.style.left=(baseX + Math.random()*180 - 90)+'px';
    r.style.top=(baseY + Math.random()*120 - 30)+'px';
    fx.appendChild(r);
    setTimeout(()=>r.remove(),950);
  }
  const d=document.createElement('div');
  d.className='collapse-dust-puff';
  d.style.left=(baseX+20)+'px'; d.style.top=(baseY+35)+'px';
  fx.appendChild(d);
  setTimeout(()=>d.remove(),820);
}


function showVillain(src,text,fear=false){clearTimeout(villainTimer);const v=$('#villainWrap');$('#villainImg').src=src;$('#villainText').textContent=text;v.classList.remove('hidden');requestAnimationFrame(()=>v.classList.add('show'));play(fear?aud.fear:aud.laugh);villainTimer=setTimeout(()=>{v.classList.remove('show');setTimeout(()=>v.classList.add('hidden'),250)},1850)}
function fireGun(){const w=$('#playerWeapon');w.src='assets/hand_gun_fire.png';w.classList.add('fire');$('#flashFx').classList.remove('on');void $('#flashFx').offsetWidth;$('#flashFx').classList.add('on');play(aud.gun);showVillain('assets/villain_laugh1.png','هو ده آخرك؟');setTimeout(()=>{if(tool==='gun'){w.src='assets/hand_gun.png';w.classList.remove('fire')}},150)}
function throwGrenade(){if(!grenadeReady){toast('القنبلة لسه بتتجهز');return}grenadeReady=false;const w=$('#playerWeapon');w.src='assets/hand_empty.png';play(aud.throw);const p=$('#grenadeProjectile');p.classList.remove('hidden','fly');void p.offsetWidth;p.classList.add('fly');setTimeout(()=>{play(aud.boom);const sm=$('#smokeFx');sm.classList.remove('on');void sm.offsetWidth;sm.classList.add('on')},720);setTimeout(()=>showVillain('assets/villain_laugh2.png','برضه الساتر واقف.'),1720);setTimeout(()=>{p.classList.add('hidden');p.classList.remove('fly')},1180);
 const badge=$('#grenadeTimer'); badge.classList.add('hidden'); clearTimeout(grenadeTimer); grenadeTimer=setTimeout(()=>{grenadeReady=true; if(tool==='grenade') w.src='assets/hand_grenade.png'; toast('القنبلة جاهزة تاني');}, GRENADE_READY_DELAY)}
function startWater(){if(tool!=='water'||waterTimer)return;$('#waterSpray').classList.remove('hidden');$('#waterSpray').classList.add('on');$('#dustFx').classList.add('on');play(aud.water,true);let burstCounter=0;waterTimer=setInterval(()=>{progress=Math.min(100,progress+5.0);$('#progressBar').style.width=progress+'%';setBreachReveal(progress);burstCounter++;if(burstCounter%2===0)spawnCollapseBurst();if(progress>10&&progress<17)showVillain('assets/villain_laugh1.png','إيه ده؟');if(progress>30&&progress<40)showVillain('assets/villain_fear.png','إيه اللي بيحصل؟',true);if(progress>=100)finishGame()},70)}
function stopWater(){clearInterval(waterTimer);waterTimer=null;$('#waterSpray')?.classList.remove('on');$('#waterSpray')?.classList.add('hidden');$('#dustFx')?.classList.remove('on');stop(aud.water)}
function stopEndingVideo(){
  const bg=$('#endingBgVideo'), text=$('#endingTextVideo');
  try{bg.pause();bg.currentTime=0}catch{}
  try{text.pause();text.currentTime=0}catch{}
  bg.ontimeupdate=null; bg.onplay=null; bg.onpause=null; bg.onseeked=null; bg.onended=null;
  hideEndingSubtitle?.(true); currentCueIndex=-1;
  $('#endingVideoLayer').classList.add('hidden');
}
function syncEndingText(force=false){
  const bg=$('#endingBgVideo'), text=$('#endingTextVideo');
  if(!bg || !text) return;
  const drift=Math.abs((text.currentTime||0)-(bg.currentTime||0));
  if(force || drift>.12){ try{text.currentTime=bg.currentTime}catch{} }
}
function showEndingSubtitle(text=''){const box=$('#endingPlainSubtitle'); if(!text){box.classList.remove('show'); box.classList.add('hide'); return;} box.textContent=text; box.classList.remove('hidden','hide'); requestAnimationFrame(()=>box.classList.add('show'));}
function hideEndingSubtitle(force=false){const box=$('#endingPlainSubtitle'); if(force){box.textContent=''; box.classList.add('hidden'); box.classList.remove('show','hide'); return;} box.classList.remove('show'); box.classList.add('hide');}
function updateEndingSubtitleByTime(t){ if(!subtitleCues.length) return; const cue=subtitleCues.find(c=>t>=c.start && t<=c.end); if(!cue){ if(currentCueIndex!==-1){currentCueIndex=-1; hideEndingSubtitle();} return; } const idx=subtitleCues.indexOf(cue); if(idx!==currentCueIndex){ currentCueIndex=idx; showEndingSubtitle(cue.text); } }
async function playEndingVideo(){
  const layer=$('#endingVideoLayer'), bg=$('#endingBgVideo'), text=$('#endingTextVideo');
  layer.classList.remove('hidden');
  await loadSubtitleCues();
  bg.currentTime=0; currentCueIndex=-1; hideEndingSubtitle(true);
  bg.muted=muted; bg.defaultMuted=muted; bg.volume=1;
  try{text.pause();text.currentTime=0}catch{}
  text.classList.add('hidden');
  bg.ontimeupdate=()=>updateEndingSubtitleByTime(bg.currentTime||0);
  bg.onseeked=()=>updateEndingSubtitleByTime(bg.currentTime||0);
  bg.onended=()=>hideEndingSubtitle();
  const p=bg.play();
  if(p) p.catch(()=>toast('اضغطي زر الصوت أو ابدئي التشغيل من START_GAME.bat'));
}
function finishGame(){if(finished)return;finished=true;stopWater();$('#toolDock').classList.add('hidden');$('#missionHud').classList.add('hidden');$('#playerWeapon').classList.add('hidden');$('#villainWrap').classList.add('hidden');setBreachReveal(100);$('#gameBg').style.opacity='0';setTimeout(()=>{const b=$('#boats');b.classList.remove('hidden');requestAnimationFrame(()=>b.classList.add('show'))},650);setTimeout(()=>play(aud.victory),3000);setTimeout(()=>{const b=$('#boats');b.classList.remove('show');setTimeout(()=>b.classList.add('hidden'),500)},3900);setTimeout(playEndingVideo,4600)}
