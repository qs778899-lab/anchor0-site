const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const readPreference = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const savePreference = (key, value) => { try { localStorage.setItem(key,value); } catch {} };
let language = readPreference('anchor-language','en') === 'zh' ? 'zh' : 'en';
let data, cohort = 'inhouse';
const t = (en,zh) => language === 'zh' ? zh : en;
const label = item => language === 'zh' && item.labelZh ? item.labelZh : item.label;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = (n,digits=2) => n == null ? t('Pending','待评估') : Number(n).toLocaleString('en-US',{maximumFractionDigits:digits});
const palette = ['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)'];
const knownModels = ['anchor-global','anchor-local','scale-global','scale-local','sonic','mimic','sonic-smpl'];
const color = (id,index=0) => palette[knownModels.includes(id)?knownModels.indexOf(id):id.startsWith('anchor')?0:index % palette.length];
const tooltip = $('#chart-tooltip');

function translate() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  $$('[data-en][data-zh]').forEach(el => { el.textContent = el.dataset[language]; });
  $('#language-toggle').textContent = language === 'en' ? '中文' : 'EN';
  $('#language-toggle').setAttribute('aria-label',t('Switch to Chinese','切换到英文'));
  $('#theme-select').setAttribute('aria-label',t('Color theme','配色模式'));
  $$('.video-cover').forEach(button => button.setAttribute('aria-label',t('Play video','播放视频')));
  $('#close-image').setAttribute('aria-label',t('Close figure','关闭图片'));
  if(data) renderAll();
}
$('#language-toggle').addEventListener('click',()=>{language=language==='en'?'zh':'en';savePreference('anchor-language',language);translate();});
const theme = $('#theme-select');
theme.value = readPreference('anchor-theme','system');
if(!['system','light','dark'].includes(theme.value)) theme.value='system';
const mediaTheme = matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){document.documentElement.dataset.theme=theme.value==='system'?(mediaTheme.matches?'dark':'light'):theme.value;}
theme.addEventListener('change',()=>{savePreference('anchor-theme',theme.value);applyTheme();});
mediaTheme.addEventListener('change',applyTheme);
applyTheme();
translate();

$$('.video-frame').forEach(frame=>{
  const video=$('video',frame),cover=$('.video-cover',frame);
  video.controls=false;
  cover.addEventListener('click',()=>{
    if(!video.dataset.loaded){ $$('source',video).forEach(source=>{source.src=source.dataset.src;});video.load();video.dataset.loaded='true'; }
    cover.hidden=true;video.controls=true;
    video.play().catch(()=>{video.controls=true;video.focus();});
  });
  video.addEventListener('play',()=>{$$('video').forEach(other=>{if(other!==video)other.pause();});});
  video.addEventListener('error',()=>{
    if($('.video-error',frame))return;
    const message=document.createElement('p');message.className='video-error';message.setAttribute('role','alert');
    message.textContent=t('Video could not load. Refresh the page to try again.','视频加载失败，请刷新页面后重试。');frame.after(message);
  });
});

const dialog=$('#image-dialog');
$$('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{
  const image=$('#dialog-image'),caption=button.dataset[language==='zh'?'captionZh':'captionEn'];
  image.src=button.dataset.zoom;image.alt=caption;image.classList.remove('expanded');
  $('#image-caption').textContent=caption;$('#original-image').href=button.dataset.zoom;dialog.showModal();
}));
$('#close-image').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
$('#dialog-image').addEventListener('click',event=>event.currentTarget.classList.toggle('expanded'));
let scrollPending=false;
window.addEventListener('scroll',()=>{if(scrollPending)return;scrollPending=true;requestAnimationFrame(()=>{const total=document.documentElement.scrollHeight-innerHeight;$('.reading-progress').style.width=`${total>0?scrollY/total*100:0}%`;scrollPending=false;});},{passive:true});
const activeSections=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){$$('.desktop-nav a').forEach(link=>{if(link.hash===`#${entry.target.id}`)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});}});},{rootMargin:'-15% 0px -65% 0px'});
$$('section[id]').forEach(section=>activeSections.observe(section));

function showTip(mark,event){
  const tip=JSON.parse(mark.dataset.tip);
  tooltip.innerHTML=`<strong>${esc(tip.model)}</strong><div>${esc(tip.metric)}</div><div class="tooltip-value">${esc(number(tip.value,4))} ${esc(tip.unit||'')}</div>${tip.note?`<small>${esc(tip.note)}</small>`:''}`;
  tooltip.hidden=false;
  const rect=mark.getBoundingClientRect();
  const x=event?.clientX ?? rect.left+rect.width/2,y=event?.clientY ?? rect.top;
  tooltip.style.left=`${Math.max(8,Math.min(innerWidth-tooltip.offsetWidth-8,x+16))}px`;
  tooltip.style.top=`${Math.max(8,Math.min(innerHeight-tooltip.offsetHeight-8,y+18))}px`;
}
document.addEventListener('pointermove',event=>{const mark=event.target.closest('[data-tip]');if(mark)showTip(mark,event);});
document.addEventListener('pointerout',event=>{if(event.target.closest('[data-tip]'))tooltip.hidden=true;});
document.addEventListener('focusin',event=>{const mark=event.target.closest('[data-tip]');if(mark)showTip(mark);else tooltip.hidden=true;});
document.addEventListener('click',event=>{const mark=event.target.closest('[data-tip]');if(mark)showTip(mark,event);else tooltip.hidden=true;});
document.addEventListener('keydown',event=>{if(event.key==='Escape')tooltip.hidden=true;});
window.addEventListener('scroll',()=>{tooltip.hidden=true;},{passive:true});
function markAttrs(tip,model){return `class="data-mark" tabindex="0" role="img" aria-label="${esc(`${tip.model}: ${tip.metric}, ${number(tip.value,4)} ${tip.unit||''}${tip.note?', '+tip.note:''}`)}" data-model="${esc(model)}" data-tip="${esc(JSON.stringify(tip))}"`;}
function svgOpen(w,h,title){return `<svg class="chart-svg" viewBox="0 0 ${w} ${h}" role="group" aria-label="${esc(title)}">`;}
function table(headers, rows, highlight=false){
  return `<div class="table-scroll"><table class="data-table"><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr${highlight&&String(row[0]).startsWith('Anchor')?' class="highlight"':''}>${row.map((cell,i)=>i===0?`<th scope="row">${esc(cell)}</th>`:`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function dataTable(headers,rows){return `<details class="chart-table"><summary>${t('View values','查看数据')}</summary>${table(headers,rows)}</details>`;}
function niceMax(value){if(!value)return 1;const p=10**Math.floor(Math.log10(value));return Math.ceil(value/p*2)/2*p;}
function groupedBars(target,rows,metrics,{unit='%',max,title='',note}={}){
  const w=540,left=143,right=38,top=20,rowHeight=48,h=rows.length*rowHeight+42,plot=w-left-right;
  const maximum=max??niceMax(Math.max(...rows.flatMap(row=>metrics.map(m=>row[m.key]??0)))*1.13);
  let svg=svgOpen(w,h,title);
  for(let i=0;i<=4;i++){
    const value=maximum*i/4,x=left+plot*i/4;
    svg+=`<line class="axis-line" x1="${x}" y1="${top-8}" x2="${x}" y2="${h-26}"/><text x="${x}" y="${h-8}" text-anchor="middle">${number(value,1)}</text>`;
  }
  rows.forEach((row,index)=>{
    const y=top+index*rowHeight;
    svg+=`<text x="${left-12}" y="${y+18}" text-anchor="end"${row.id.startsWith('anchor')?' style="fill:var(--primary);font-weight:600"':''}>${esc(row.label)}</text>`;
    metrics.forEach((metric,mi)=>{
      const value=row[metric.key],height=metrics.length>1?11:20,barY=y+mi*14;
      const fill=metrics.length>1?(mi===0?'var(--chart-blue)':'var(--chart-soft)'):color(row.id,index);
      const tip={model:row.label,metric:metric.label,value,unit,note:note?note(row):undefined};
      svg+=`<rect ${markAttrs(tip,row.id)} x="${left}" y="${barY}" width="${Math.max(2,value/maximum*plot)}" height="${height}" rx="2" fill="${fill}"/><text class="value-label" x="${left+value/maximum*plot+5}" y="${barY+height-1}">${number(value,1)}</text>`;
    });
  });
  svg+='</svg>';
  if(metrics.length>1)svg+=`<div class="chart-legend">${metrics.map((m,i)=>`<span><i class="legend-swatch ${i?'global':'local'}"></i>${esc(m.label)}</span>`).join('')}</div>`;
  svg+=dataTable([t('Controller','控制器'),...metrics.map(m=>`${m.label} (${unit})`)],rows.map(row=>[row.label,...metrics.map(m=>number(row[m.key],4))]));
  $(target).innerHTML=svg;
}
function modelLegend(series){return `<div class="chart-legend">${series.map((s,i)=>`<button type="button" data-highlight="${esc(s.id)}" aria-pressed="false"><i class="legend-swatch" style="--swatch:${color(s.id,i)}"></i>${esc(s.label)}</button>`).join('')}</div>`;}
function attachLegend(target){
  $$('[data-highlight]',target).forEach(button=>button.addEventListener('click',()=>{
    const active=button.getAttribute('aria-pressed')!=='true';
    $$('[data-highlight]',target).forEach(other=>other.setAttribute('aria-pressed',String(active&&other===button)));
    $$('[data-series]',target).forEach(series=>series.classList.toggle('series-dim',active&&series.dataset.series!==button.dataset.highlight));
  }));
}
function wrapLabel(value,max=19){
  const words=value.split(' '),lines=[''];
  if(language==='zh' && !value.includes(' ')){return value.length>8?[value.slice(0,7),value.slice(7)]:[value];}
  words.forEach(word=>{const last=lines.length-1;if(lines[last].length+word.length>max&&lines[last])lines.push(word);else lines[last]+=(lines[last]?' ':'')+word;});return lines;
}
function radar(target,radar){
  const w=560,h=420,cx=280,cy=204,r=127,n=radar.axes.length;
  const point=(i,radius)=>[cx+Math.sin(i*2*Math.PI/n)*radius,cy-Math.cos(i*2*Math.PI/n)*radius];
  let svg=svgOpen(w,h,label(radar));
  [25,50,75,100].forEach(value=>{svg+=`<polygon points="${radar.axes.map((_,i)=>point(i,r*value/100).join(',')).join(' ')}" fill="none" class="axis-line"/><text x="${cx+4}" y="${cy-r*value/100-3}" style="font-size:9px">${value}</text>`;});
  radar.axes.forEach((axis,i)=>{
    const end=point(i,r),[x,y]=point(i,r+29),lines=wrapLabel(label(axis),18);
    svg+=`<line class="axis-line" x1="${cx}" y1="${cy}" x2="${end[0]}" y2="${end[1]}"/><text x="${x}" y="${y-(lines.length-1)*6}" text-anchor="${x<cx-12?'end':x>cx+12?'start':'middle'}">${lines.map((line,j)=>`<tspan x="${x}" dy="${j?13:0}">${esc(line)}</tspan>`).join('')}</text>`;
  });
  [...radar.series].reverse().forEach(s=>{
    const index=radar.series.indexOf(s),stroke=color(s.id,index);
    const points=s.values.map((v,i)=>point(i,r*v/100));
    svg+=`<g data-series="${s.id}"><polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${index===0?stroke:'none'}" fill-opacity=".07" stroke="${stroke}" stroke-width="${index===0?2.8:1.7}" ${s.id.endsWith('local')?'stroke-dasharray="5 4"':''}/>`;
    points.forEach(([x,y],i)=>{const tip={model:s.label,metric:label(radar.axes[i]),value:s.values[i],unit:'%',note:s.counts?`${s.successes[i]} / ${s.counts[i]} ${t('motions','条动作')}`:''};svg+=`<circle ${markAttrs(tip,s.id)} cx="${x}" cy="${y}" r="4" fill="${stroke}" stroke="var(--bg)" stroke-width="1"/>`;});
    svg+='</g>';
  });
  svg+='</svg>'+modelLegend(radar.series)+dataTable([t('Controller','控制器'),...radar.axes.map(a=>`${label(a)} (%)`)],radar.series.map(s=>[s.label,...s.values.map(v=>number(v,4))]));
  target.innerHTML=svg;attachLegend(target);
}
function postureChart(){
  const target=$('#reach-chart'),source=data.reachability.postures,w=1040,h=350,left=50,right=28,top=20,bottom=75,ph=h-top-bottom,pw=w-left-right;
  const x=i=>left+i/(source.axes.length-1)*pw,y=v=>top+ph*(1-v/100);
  let svg=svgOpen(w,h,t('Reachability task success','可达性任务成功率'));
  [0,25,50,75,100].forEach(v=>{svg+=`<line class="axis-line" x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-12}" y="${y(v)+4}" text-anchor="end">${v}</text>`;});
  source.axes.forEach((axis,i)=>{svg+=`<text x="${x(i)}" y="${h-45}" text-anchor="${i===0?'start':i===source.axes.length-1?'end':'middle'}">${esc(label(axis))}</text><text x="${x(i)}" y="${h-27}" text-anchor="${i===0?'start':i===source.axes.length-1?'end':'middle'}" style="font-size:9px">n = ${axis.count}</text>`;});
  [...source.series].reverse().forEach(s=>{
    const index=source.series.indexOf(s),stroke=color(s.id,index);
    svg+=`<g data-series="${s.id}"><polyline points="${s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')}" fill="none" stroke="${stroke}" stroke-width="${index===0?3:1.8}" ${s.id.endsWith('local')?'stroke-dasharray="5 4"':''}/>`;
    s.values.forEach((v,i)=>{const tip={model:s.label,metric:label(source.axes[i]),value:v,unit:'%',note:`${s.successes[i]} / ${s.counts[i]} ${t('references','条参考')}`};svg+=`<circle ${markAttrs(tip,s.id)} cx="${x(i)}" cy="${y(v)}" r="5" fill="${stroke}" stroke="var(--bg)" stroke-width="1.2"/>`;});svg+='</g>';
  });
  svg+='</svg>'+modelLegend(source.series)+dataTable([t('Controller','控制器'),...source.axes.map(a=>`${label(a)} (%)`)],source.series.map(s=>[s.label,...s.values.map(v=>number(v,4))]));
  target.innerHTML=svg;attachLegend(target);
}
function lookaheadChart(){
  const target=$('#lookahead-chart'),source=data.lookahead.series,w=540,h=330,left=48,right=28,top=24,bottom=48,pw=w-left-right,ph=h-top-bottom;
  const x=v=>left+v*pw,y=v=>top+(1-v/100)*ph;
  let svg=svgOpen(w,h,t('Reference look-ahead and local success','参考前瞻与局部成功率'));
  [0,25,50,75,100].forEach(v=>{svg+=`<line class="axis-line" x1="${left}" x2="${w-right}" y1="${y(v)}" y2="${y(v)}"/><text x="${left-10}" y="${y(v)+4}" text-anchor="end">${v}%</text>`;});
  [0,.2,.4,.6,.8,1].forEach(v=>{svg+=`<text x="${x(v)}" y="${h-26}" text-anchor="middle">${number(v,1)}</text>`;});
  svg+=`<text x="${w/2}" y="${h-4}" text-anchor="middle">${t('Reference look-ahead (s)','参考前瞻时长（秒）')}</text>`;
  source.forEach((s,i)=>{
    const tip={model:s.label,metric:t('Local success','局部成功率'),value:s.localSuccess,unit:'%',note:`${s.lookaheadSeconds}s · ${t('Online retargeting','在线重定向')}: ${s.onlineRetargeting?t('Yes','需要'):t('No','无需')}`};
    svg+=`<g data-series="${s.id}"><circle ${markAttrs(tip,s.id)} cx="${x(s.lookaheadSeconds)}" cy="${y(s.localSuccess)}" r="7" fill="${color(s.id,i)}" stroke="var(--bg)" stroke-width="2"/>${s.id.startsWith('anchor')?`<text x="${x(s.lookaheadSeconds)+14}" y="${y(s.localSuccess)+4}" style="fill:var(--primary);font-weight:600">${s.label}</text>`:''}</g>`;
  });
  svg+='</svg>'+modelLegend(source)+dataTable([t('Controller','控制器'),t('Look-ahead (s)','前瞻（秒）'),t('Local success (%)','局部成功率（%）'),t('Online retargeting','在线重定向')],source.map(s=>[s.label,s.lookaheadSeconds,number(s.localSuccess,4),s.onlineRetargeting?t('Required','需要'):t('Not required','无需')]));
  target.innerHTML=svg;attachLegend(target);
}
function renderSimulation(){
  const selected=data.simulation.cohorts.find(c=>c.id===cohort);
  $('#cohort-count').textContent=`${number(selected.count,0)} ${t('motions','条动作')}`;
  groupedBars('#success-chart',selected.series,[{key:'localSuccess',label:t('Local','局部')},{key:'globalSuccess',label:t('Global','全局')}],{max:100,unit:'%',title:t('Motion success rate','动作成功率')});
  const metric=$('#error-metric').value;
  groupedBars('#error-chart',selected.series,[{key:metric,label:$('#error-metric').selectedOptions[0].textContent}],{unit:'mm',title:t('Mean position error','平均位置误差')});
}
function renderFoot(){const metric=$('#foot-metric').value;groupedBars('#foot-chart',data.reachability.footEvents.series,[{key:metric,label:$('#foot-metric').selectedOptions[0].textContent}],{unit:t('events / motion','次 / 动作'),title:t('Unintended foot motion','非预期足部运动')});}
function downstreamNote(){return `<p class="table-note">${t('* Anchor-0* is the earlier variant with error feedback supplied to the encoder (test101 / 59000). Current-model results are pending in the supplied paper.','* Anchor-0* 为将误差反馈输入编码器的早期版本（test101 / 59000）。提供的论文中，当前模型结果仍待评估。')}</p>`;}
function renderTables(){
  const standing=data.hardware.standingReach;
  $('#standing-table').innerHTML=`<h3>${t('Standing reaches · 51 motions','站姿触达 · 51 条动作')}</h3>`+table([t('Controller','控制器'),t('Global pos. (mm)','全局位置（mm）'),t('Global rot. (°)','全局旋转（°）'),t('Local pos. (mm)','局部位置（mm）'),t('Local rot. (°)','局部旋转（°）')],standing.series.map(s=>[s.label,number(s.globalPosition),number(s.globalRotation),number(s.localPosition),number(s.localRotation)]),true)+`<p class="table-note">${t('† Anchor-0 standing-reach results are preliminary in the supplied paper.','† 提供的论文中，Anchor-0 的站姿触达数值为初步结果。')}</p>`;
  const tasks=data.downstream.tasks,collection=data.downstream.collection.series;
  $('#collection-table').innerHTML=table([t('Controller / task','控制器 / 任务'),t('Successful demos / hour','成功示范 / 小时'),t('Collection success (%)','采集成功率（%）')],collection.flatMap(s=>tasks.map((task,i)=>[`${s.label} · ${label(task)}`,number(s.demosPerHour[i]),number(s.success[i])])),true)+downstreamNote();
  const autonomy=data.downstream.autonomy;
  $('#autonomy-table').innerHTML=table([t('Controller','控制器'),t('Interface','接口'),...autonomy.taskOrder.map(id=>`${label(tasks.find(task=>task.id===id))} (%)`)],autonomy.series.map(s=>[s.label,s.interface,...s.values.map(v=>number(v))]),true)+downstreamNote();
}
function renderAll(){
  tooltip.hidden=true;renderSimulation();
  $('#radar-charts').innerHTML=data.radars.map((r,i)=>`<article class="chart-panel radar-panel"><div class="chart-heading"><h3>${esc(label(r))}</h3><span class="unit-note">${t('Local success · %','局部成功率 · %')}</span></div><div id="radar-${i}" class="chart-target"></div></article>`).join('');
  data.radars.forEach((r,i)=>radar($(`#radar-${i}`),r));
  postureChart();renderFoot();lookaheadChart();
  groupedBars('#hardware-chart',data.hardware.trackingErrors.series,[{key:'wristError',label:t('Wrist','腕部')},{key:'ankleError',label:t('Ankle','踝部')}],{unit:'mm',title:t('Hardware end-effector tracking errors','真机末端跟踪误差'),note:row=>`${t('Retained / valid motions','保留 / 有效动作')}: ${row.retained} / ${row.valid}`});
  renderTables();
}
$$('[data-cohort]').forEach(button=>button.addEventListener('click',()=>{cohort=button.dataset.cohort;$$('[data-cohort]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));if(data)renderSimulation();}));
$('#error-metric').addEventListener('change',()=>{if(data)renderSimulation();});
$('#foot-metric').addEventListener('change',()=>{if(data)renderFoot();});
try{
  const response=await fetch('./data/paper-results.json');if(!response.ok)throw new Error(`HTTP ${response.status}`);
  data=await response.json();renderAll();
}catch(error){
  const message=$('#data-error');message.hidden=false;message.textContent=t('The chart data could not be loaded. Please refresh the page.','图表数据暂时未能加载，请刷新页面。');console.error('Chart data:',error);
}
