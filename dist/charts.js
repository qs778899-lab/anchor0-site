import { enhanceCharts, hideTooltip, finishChart } from './chart-interactions.js';
// All interactive figures consume one fixed evaluation snapshot.
const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ids = ['anchor-global','anchor-local','scale-global','scale-local','sonic','mimic','sonic-smpl'];
const colors = ['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)'];
const color = (id,i=0) => colors[ids.includes(id)?ids.indexOf(id):id.startsWith('anchor')?0:i%colors.length];
const views = new Map();
const focus = new Map();
let source, language='en', cohort='inhouse', narrow=false;
const t = (en,zh) => language==='zh'?zh:en;
const label = value => language==='zh' && value.labelZh ? value.labelZh : value.label;
const fmt = (value,digits=2) => Number(value).toLocaleString('en-US',{minimumFractionDigits:digits,maximumFractionDigits:digits});
const short = value => Number(value).toLocaleString('en-US',{maximumFractionDigits:1});
const text = (x,y,value,extra='') => `<text x="${x}" y="${y}" ${extra}>${escape(value)}</text>`;
const line = (x1,y1,x2,y2,extra='') => `<line class="plot-grid" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${extra}/>`;
const svg = (w,h,title,body,extraClass='') => `<svg class="research-svg ${extraClass}" viewBox="0 0 ${w} ${h}" role="group" aria-label="${escape(title)}">${body}</svg>`;
const tipAttrs = (tip,extra='') => `tabindex="0" role="img" data-tip="${escape(JSON.stringify(tip))}" aria-label="${escape(`${tip.model}: ${tip.metric}, ${fmt(tip.value,4)} ${tip.unit||''}${tip.count?' · n = '+tip.count:''}${tip.dataset?' · '+tip.dataset:''}${tip.note?' · '+tip.note:''}`)}" ${extra}`;
const measurement = (series, datasetId, dataset, metricId, metric, value, unit, extra={}) => ({
  datasetId, dataset, modelId:series.id, model:series.label, metricId, metric, value, unit,
  ...(series.config ? {config:series.config} : {}), ...extra
});
const cohortTip = (s,c,key,name,unit) => measurement(s,c.id,label(c),key,name,s[key],unit,{count:c.count});
const radarTip = (s,r,i) => measurement(s,r.id||'reachability',r.id?`${t('In-house','自建动作集')} · ${label(r)}`:t('Reachability','可达性'),r.axes[i].id,label(r.axes[i]),s.values[i],'%',{count:s.counts[i],successes:s.successes[i]});
const footTip = (s,key,name) => measurement(s,'reachability',t('Reachability','可达性'),key,name,s[key],t('events / motion','次 / 动作'),{count:s.count});
const hardwareTip = (s,key,name) => measurement(s,'hardware',t('Hardware','真机实验'),key,name,s[key],'mm',{count:s.valid,retained:s.retained});
const niceMax = value => { const power=10**Math.floor(Math.log10(value||1));return Math.ceil(value/power*2)/2*power; };

function dataTable(headers,rows){
  return `<div class="compact-table-scroll"><table class="compact-data"><thead><tr><th scope="col">${t('Controller','控制器')}</th>${headers.map(h=>`<th scope="col">${escape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr data-series="${escape(row.id)}" class="${row.id.startsWith('anchor')?'anchor-row':''}"><th scope="row"><span class="model-dot" style="--model-color:${color(row.id)}"></span>${escape(row.label)}</th>${row.values.map((value,i)=>`<td>${typeof value==='number'?`<span class="exact-value" ${tipAttrs(row.tips[i])}>${fmt(value)}</span>`:escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function controls(id){
  const selected=views.get(id)||'chart';
  return `<div class="figure-view-tabs" role="tablist" aria-label="${t('Figure view','图表视图')}">${['chart','data'].map(view=>`<button type="button" class="view-tab" id="${id}-${view}-tab" role="tab" data-panel-id="${id}" data-view="${view}" aria-selected="${selected===view}" aria-controls="${id}-${view}" tabindex="${selected===view?0:-1}">${view==='chart'?t('Chart','图表'):t('Data','数据')}</button>`).join('')}</div>`;
}

function stage(id,ratio,chart,table){
  const selected=views.get(id)||'chart';
  return `<div class="figure-stage" style="--figure-ratio:${ratio}"><div class="figure-chart" role="tabpanel" id="${id}-chart" aria-labelledby="${id}-chart-tab" ${selected!=='chart'?'hidden':''}>${chart}</div><div class="figure-data" role="tabpanel" id="${id}-data" aria-labelledby="${id}-data-tab" ${selected!=='data'?'hidden':''}>${table}</div></div>`;
}

function panel(id,letter,title,ratio,chart,table,area=''){
  return `<article class="research-panel ${area}" data-panel="${id}"><div class="research-panel-head"><h3><span class="panel-letter">${letter}</span>${title}</h3>${controls(id)}</div>${stage(id,ratio,chart,table)}</article>`;
}

function legend(series,group){
  return `<div class="shared-legend" role="group" aria-label="${t('Highlight a controller','突出显示控制器')}">${series.map((s,i)=>`<button type="button" data-focus-group="${group}" data-focus-model="${s.id}" aria-pressed="${focus.get(group)===s.id}"><i style="--model-color:${color(s.id,i)}"></i>${escape(s.label)}</button>`).join('')}</div>`;
}

function success(cohort){
  const w=400,h=332,left=110,right=33,top=18,plot=w-left-right,rowHeight=44;
  let out='';
  [0,25,50,75,100].forEach(v=>{const x=left+v/100*plot;out+=line(x,top-5,x,top+258)+text(x,top+278,`${v}`, 'text-anchor="middle"');});
  cohort.series.forEach((s,i)=>{
    const y=top+i*rowHeight;
    out+=`<g data-series="${s.id}">`+text(left-10,y+18,s.label,`text-anchor="end" class="model-label ${s.id.startsWith('anchor')?'anchor-label':''}"`);
    ['localSuccess','globalSuccess'].forEach((key,j)=>{
      const v=s[key],name=j?t('Global','全局'):t('Local','局部');
      const tip=cohortTip(s,cohort,key,name,'%');
      out+=`<rect class="plot-mark" data-grow="x" ${tipAttrs(tip)} x="${left}" y="${y+j*14}" width="${v/100*plot}" height="11" rx="1.5" fill="${color(s.id,i)}" opacity="${j?.4:1}"/>`+text(left+v/100*plot+4,y+j*14+9,short(v),'class="bar-number"');
    });out+='</g>';
  });
  out+=`<rect x="137" y="313" width="12" height="7" fill="var(--muted)"/>`+text(154,320,t('Local','局部'),'class="plot-key"')+`<rect x="227" y="313" width="12" height="7" fill="var(--muted)" opacity=".35"/>`+text(244,320,t('Global','全局'),'class="plot-key"');
  const rows=cohort.series.map(s=>({id:s.id,label:s.label,values:[s.localSuccess,s.globalSuccess],tips:['localSuccess','globalSuccess'].map((key,i)=>cohortTip(s,cohort,key,i?t('Global','全局'):t('Local','局部'),'%'))}));
  return [svg(w,h,t('Local and global success rates','局部与全局成功率'),out),dataTable([t('Local (%)','局部 (%)'),t('Global (%)','全局 (%)')],rows)];
}

function errors(cohort){
  const w=400,h=332,left=38,right=12,top=20,bottom=64,pw=w-left-right,ph=h-top-bottom;
  const metrics=[['rootError',t('Root XY (G)','根节点 XY (G)')],['wristError',t('Wrist (L)','腕部 (L)')],['ankleError',t('Ankle (L)','踝部 (L)')]];
  const maximum=niceMax(Math.max(...source.simulation.cohorts.flatMap(c=>c.series.flatMap(s=>metrics.map(([k])=>s[k]))))*1.05);
  let out='';
  [0,.25,.5,.75,1].forEach(f=>{const y=top+ph*(1-f);out+=line(left,y,w-right,y)+text(left-7,y+4,short(f*maximum),'text-anchor="end"');});
  metrics.forEach(([key,name],mi)=>{
    const center=left+pw*(mi+.5)/3,barWidth=12,gap=3;
    out+=text(center,h-36,name,'text-anchor="middle" class="category-label"');
    cohort.series.forEach((s,i)=>{
      const x=center-45+i*(barWidth+gap),height=s[key]/maximum*ph;
      out+=`<g data-series="${s.id}"><rect class="plot-mark" data-grow="y" ${tipAttrs(cohortTip(s,cohort,key,name,'mm'))} x="${x}" y="${top+ph-height}" width="${barWidth}" height="${height}" rx="1.5" fill="${color(s.id,i)}"/></g>`;
    });
  });
  out+=text(w/2,h-9,t('Mean position error · mm ↓','平均位置误差 · mm ↓'),'text-anchor="middle" class="plot-key"');
  return [svg(w,h,t('Mean tracking error','平均跟踪误差'),out),dataTable(metrics.map(([,name])=>`${name} · mm`),cohort.series.map(s=>({id:s.id,label:s.label,values:metrics.map(([k])=>s[k]),tips:metrics.map(([k,name])=>cohortTip(s,cohort,k,name,'mm'))})))];
}

function wrap(value,max=16){
  if(language==='zh')return value.length>7?[value.slice(0,7),value.slice(7)]:[value];
  const lines=[''];value.split(' ').forEach(word=>{const i=lines.length-1;if(lines[i]&&lines[i].length+word.length>max)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;});return lines;
}

function radarGraphic(radar,{w=400,h=330,r=97,cx=w/2,cy=h/2,max=100}={}){
  const n=radar.axes.length,point=(i,radius)=>[cx+Math.sin(i*2*Math.PI/n)*radius,cy-Math.cos(i*2*Math.PI/n)*radius];
  let out='';
  [25,50,75,100].forEach(v=>{out+=`<polygon class="plot-grid" points="${radar.axes.map((_,i)=>point(i,r*v/max).join(',')).join(' ')}" fill="none"/>`+text(cx+4,cy-r*v/max-4,v,'class="radar-tick"');});
  radar.axes.forEach((axis,i)=>{
    const end=point(i,r),[x,y]=point(i,r+23),lines=wrap(label(axis));
    out+=line(cx,cy,...end)+`<text x="${x}" y="${y-(lines.length-1)*6}" text-anchor="${x<cx-10?'end':x>cx+10?'start':'middle'}" class="radar-label">${lines.map((value,j)=>`<tspan x="${x}" dy="${j?13:0}">${escape(value)}</tspan>`).join('')}</text>`;
  });
  [...radar.series].reverse().forEach(s=>{
    const i=radar.series.indexOf(s),points=s.values.map((v,a)=>point(a,r*v/max));
    out+=`<g class="radar-series" data-series="${s.id}" data-center-x="${cx}" data-center-y="${cy}"><polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="${i===0?color(s.id):'none'}" fill-opacity=".07" stroke="${color(s.id,i)}" stroke-width="${i===0?2.5:1.6}" ${s.id.endsWith('local')?'stroke-dasharray="5 4"':''}/>`;
    points.forEach(([x,y],a)=>{
      out+=`<g class="plot-mark radar-point" ${tipAttrs(radarTip(s,radar,a))} data-point-x="${x}" data-point-y="${y}"><circle class="point-hit" cx="${x}" cy="${y}" r="12" fill="transparent"/><circle class="point-dot" cx="${x}" cy="${y}" r="4" fill="${color(s.id,i)}" stroke="var(--bg)" stroke-width="1"/></g>`;
    });out+='</g>';
  });
  return svg(w,h,label(radar)||t('Task success by posture','各姿态的任务成功率'),out);
}

function radarTable(radar){return dataTable(radar.axes.map(a=>`${label(a)} (%)`),radar.series.map(s=>({id:s.id,label:s.label,values:s.values,tips:s.values.map((_,i)=>radarTip(s,radar,i))})));}

function feet(){
  const rows=source.reachability.footEvents.series,w=560,h=380,left=132,top=58,rowHeight=43,groupWidth=188,barWidth=145;
  const metrics=[['slips',t('Foot slips','滑步')],['steps',t('Extra steps','额外步数')]];
  let out='';
  metrics.forEach(([key,name],mi)=>{
    const x0=left+mi*groupWidth,maximum=niceMax(Math.max(...rows.map(s=>s[key]))*1.15);
    out+=text(x0+barWidth/2,23,name,'text-anchor="middle" class="subplot-label"');
    [0,.5,1].forEach(f=>{const x=x0+barWidth*f;out+=line(x,top-12,x,top+245)+text(x,top+265,Number((maximum*f).toFixed(2)),'text-anchor="middle"');});
    rows.forEach((s,i)=>{
      const y=top+i*rowHeight;
      out+=`<g data-series="${s.id}">`;
      if(mi===0)out+=text(left-12,y+13,s.label,`text-anchor="end" class="model-label ${s.id.startsWith('anchor')?'anchor-label':''}"`);
      out+=`<rect class="plot-mark" data-grow="x" ${tipAttrs(footTip(s,key,name))} x="${x0}" y="${y}" width="${Math.max(1,s[key]/maximum*barWidth)}" height="19" rx="2" fill="${color(s.id,i)}"/>`+text(x0+s[key]/maximum*barWidth+4,y+13,fmt(s[key]),'class="bar-number"')+'</g>';
    });
  });
  out+=text(w/2,h-12,t('Mean events per motion · lower is better','平均每条动作的事件数 · 越低越好'),'text-anchor="middle" class="plot-key"');
  return [svg(w,h,t('Foot slips and extra steps','滑步与额外步数'),out),dataTable(metrics.map(([,name])=>`${name} / ${t('motion','动作')}`),rows.map(s=>({id:s.id,label:s.label,values:metrics.map(([k])=>s[k]),tips:metrics.map(([k,name])=>footTip(s,k,name))})))];
}

function renderSimulation(){
  const [inhouse,publicData]=source.simulation.cohorts;
  const groupHeader=(kind,title,count)=>`<div class="experiment-band ${kind}"><h3>${title}</h3><span>${count.toLocaleString('en-US')} ${t('motions','条动作')}</span></div>`;
  const [a,ad]=success(inhouse),[b,bd]=errors(inhouse),[d,dd]=success(publicData),[e,ed]=errors(publicData),[h,hd]=feet();
  const c=source.radars.map(r=>`<div class="task-radar"><h4>${escape(label(r))}</h4>${radarGraphic(r)}</div>`).join('');
  const cd=source.radars.map(r=>`<h4 class="data-section-title">${escape(label(r))}</h4>${radarTable(r)}`).join('');
  const posture=source.reachability.postures;
  $('#simulation-figure').innerHTML=`${legend(source.models,'simulation')}<div class="paper-matrix">${groupHeader('inhouse-band',t('In-house benchmark','自建动作基准'),inhouse.count)}${panel('sim-a','A',t('Success rate · % ↑','成功率 · % ↑'),'400 / 332',a,ad,'panel-a')}${panel('sim-b','B',t('Tracking error · mm ↓','跟踪误差 · mm ↓'),'400 / 332',b,bd,'panel-b')}${panel('sim-c','C',t('Task profiles · local SR','任务分布 · 局部成功率'),'400 / 770',`<div class="radar-stack">${c}</div>`,cd,'panel-c')}${groupHeader('public-band',t('Public benchmark','公开动作基准'),publicData.count)}${panel('sim-d','D',t('Success rate · % ↑','成功率 · % ↑'),'400 / 332',d,dd,'panel-d')}${panel('sim-e','E',t('Tracking error · mm ↓','跟踪误差 · mm ↓'),'400 / 332',e,ed,'panel-e')}</div><div class="experiment-band reach-band"><h3>${t('Target-conditioned reachability','目标条件可达性')}</h3><span>${t('3,210 references · 5.5–16.5 s holding window','3,210 条参考 · 5.5–16.5 秒保持窗口')}</span></div><div class="reach-matrix">${panel('reach-f','F',t('Task success by posture · % ↑','各姿态任务成功率 · % ↑'),'560 / 380',radarGraphic(posture,{w:560,h:380,r:125}),radarTable(posture))}${panel('reach-h','H',t('Foot events','足部事件'),'560 / 380',h,hd)}</div>`;
  applyHighlight('simulation');
  enhanceCharts($('#simulation-figure'));
}

function bubbleFigure(dataset){
  const w=narrow?460:1120,h=narrow?600:570,left=narrow?50:72,right=narrow?30:40,top=43,bottom=87,pw=w-left-right,ph=h-top-bottom;
  const x=v=>left+(1-v)*pw,y=v=>top+(1-v/100)*ph;
  let out=text(left,18,t('Local success rate','局部成功率'),'class="bubble-axis-title"');
  [0,20,40,60,80,100].forEach(v=>{out+=line(left,y(v),w-right,y(v))+text(left-13,y(v)+5,`${v}%`,'text-anchor="end" class="bubble-axis"');});
  for(let i=0;i<=10;i++){const v=i/10;out+=text(x(v),h-56,fmt(v,1),'text-anchor="middle" class="bubble-axis"');}
  out+=text(w/2,h-15,t('Look-ahead time (s)','前瞻时长（秒）'),'text-anchor="middle" class="bubble-axis-title"');
  if(!narrow)out+=text(w-right,h-15,t('Less look-ahead →','更短前瞻 →'),'text-anchor="end" class="bubble-axis-title"');
  const cluster=dataset.series.filter(s=>s.lookaheadSeconds<.5).sort((a,b)=>b.localSuccess-a.localSuccess);
  const labels=new Map();let previous=-100;
  const gap=narrow?57:53;
  cluster.forEach(s=>{const pos=Math.max(y(s.localSuccess)-19,previous+gap);labels.set(s.id,pos);previous=pos;});
  const last=cluster.at(-1),overflow=Math.max(0,labels.get(last.id)-(h-bottom-38));
  if(overflow)for(let i=cluster.length-1;i>=0;i--){const s=cluster[i];labels.set(s.id,Math.min(labels.get(s.id),i===cluster.length-1?h-bottom-38:labels.get(cluster[i+1].id)-gap));}
  dataset.series.forEach((s,i)=>{
    const px=x(s.lookaheadSeconds),py=y(s.localSuccess),anchor=s.id.startsWith('anchor'),r=anchor?(narrow?20:28):(narrow?12:17),stroke=color(s.id,i);
    const sonic=s.lookaheadSeconds>=.5,lx=sonic?(narrow?left+5:px+29):px-(narrow?30:43),ly=sonic?py-(narrow?44:11):labels.get(s.id),align=sonic?'start':'end';
    const note=`${fmt(s.lookaheadSeconds,4)} s · ${t('Online retargeting','在线重定向')}: ${s.onlineRetargeting?t('required','需要'):t('not required','无需')}\n${t('Input','输入')}: ${s.input}`;
    const tip=measurement(s,dataset.id,label(dataset),'localSuccess',t('Local success','局部成功率'),s.localSuccess,'%',{note,count:dataset.count,lookaheadSeconds:s.lookaheadSeconds,onlineRetargeting:s.onlineRetargeting});
    out+=`<g class="bubble-mark" data-point-x="${px}" data-point-y="${py}" data-hit-radius="${r}" data-series="${s.id}" ${tipAttrs(tip,`data-bubble="${s.id}"`)}>`;
    if(Math.abs(ly+15-py)>24)out+=`<path class="bubble-leader" d="M${px-r-3},${py} L${lx+7},${ly+12}" stroke="${stroke}"/>`;
    out+=s.onlineRetargeting?`<polygon class="bubble-shape" points="${px},${py-r} ${px+r},${py} ${px},${py+r} ${px-r},${py}" fill="${stroke}"/>`:`<circle class="bubble-shape" cx="${px}" cy="${py}" r="${r}" fill="${stroke}"/>`;
    const width=narrow?181:197;
    out+=`<rect x="${align==='end'?lx-width:lx-5}" y="${ly-18}" width="${width+8}" height="43" fill="transparent"/>`+text(lx,ly,s.label,`text-anchor="${align}" class="bubble-name ${anchor?'anchor-label':''}"`)+text(lx,ly+21,`${fmt(s.localSuccess,1)}% · ${fmt(s.lookaheadSeconds)} s`,`text-anchor="${align}" class="bubble-value"`)+'</g>';
  });
  const rows=dataset.series.map(s=>({id:s.id,label:s.label,values:[s.localSuccess,s.lookaheadSeconds,s.onlineRetargeting?t('Required','需要'):t('Not required','无需')],tips:[measurement(s,dataset.id,label(dataset),'localSuccess',t('Local success','局部成功率'),s.localSuccess,'%',{count:dataset.count}),measurement(s,dataset.id,label(dataset),'lookaheadSeconds',t('Look-ahead','前瞻'),s.lookaheadSeconds,'s',{count:dataset.count})]}));
  return [svg(w,h,t('Performance and reference look-ahead','性能与参考前瞻'),out,narrow?'narrow-plot':''),dataTable([t('Local success (%)','局部成功率 (%)'),t('Look-ahead (s)','前瞻 (s)'),t('Online retargeting','在线重定向')],rows),`${w} / ${h}`];
}

function renderLookahead(){
  const dataset=source.lookahead.cohorts.find(c=>c.id===cohort);
  const [chart,table,ratio]=bubbleFigure(dataset);
  $('#lookahead-chart').innerHTML=`<div class="feature-chart-tools"><span>${dataset.count.toLocaleString('en-US')} ${t('motions','条动作')}</span>${controls('performance')}</div>${stage('performance',ratio,chart,table)}<div class="shape-legend"><span><i class="circle-key"></i>${t('No online retargeting','无需在线重定向')}</span><span><i class="diamond-key"></i>${t('Online retargeting required','需要在线重定向')}</span></div>${legend(dataset.series,'lookahead')}`;
  applyHighlight('lookahead');
  enhanceCharts($('#lookahead-chart'));
}

function renderHardware(){
  const rows=source.hardware.trackingErrors.series,w=650,h=340,left=155,right=45,top=22,plot=w-left-right;
  let out='';const maximum=110;
  [0,25,50,75,100].forEach(v=>{const x=left+v/maximum*plot;out+=line(x,10,x,286)+text(x,308,v,'text-anchor="middle"');});
  rows.forEach((s,i)=>{
    const y=top+i*44;out+=text(left-12,y+18,s.label,`text-anchor="end" class="model-label ${s.id==='anchor'?'anchor-label':''}"`);
    ['wristError','ankleError'].forEach((key,j)=>{const tip=hardwareTip(s,key,j?t('Ankle','踝部'):t('Wrist','腕部'));out+=`<rect class="plot-mark" data-grow="x" ${tipAttrs(tip)} x="${left}" y="${y+j*14}" width="${s[key]/maximum*plot}" height="11" rx="2" fill="${j?'var(--chart-soft)':'var(--chart-blue)'}"/>`+text(left+s[key]/maximum*plot+5,y+j*14+10,short(s[key]),'class="bar-number"');});
  });
  out+=text(w/2,h-8,t('Wrist (dark) · Ankle (light) · mm','腕部（深色）· 踝部（浅色）· mm'),'text-anchor="middle" class="plot-key"');
  const table=dataTable([t('Wrist (mm)','腕部 (mm)'),t('Ankle (mm)','踝部 (mm)')],rows.map(s=>({id:s.id,label:s.label,values:[s.wristError,s.ankleError],tips:['wristError','ankleError'].map((key,i)=>hardwareTip(s,key,i?t('Ankle','踝部'):t('Wrist','腕部')))})));
  $('#hardware-chart').innerHTML=`<div class="standalone-view-tools">${controls('hardware-errors')}</div>${stage('hardware-errors','650 / 340',svg(w,h,t('Hardware tracking errors','真机跟踪误差'),out),table)}`;
  enhanceCharts($('#hardware-chart'));
}

function applyHighlight(group){
  const root=group==='simulation'?$('#simulation-figure'):$('#lookahead-chart'),selected=focus.get(group);
  if(!root)return;
  $$('[data-series]',root).forEach(el=>{
    const muted=!!selected&&el.dataset.series!==selected;
    el.classList.toggle('series-muted',muted);
    if(el.closest('svg')){
      const marks=el.matches('[data-tip]')?[el]:$$('[data-tip]',el);
      marks.forEach(mark=>{mark.tabIndex=muted?-1:0;});
    }
  });
  // SVG painting order is also hit order: promote only the chosen model, never table rows.
  $$('svg',root).forEach(chart=>{
    const series=$$('[data-series]',chart);
    series.forEach((el,i)=>{if(!el.dataset.paintOrder)el.dataset.paintOrder=String(i+1);});
    series.sort((a,b)=>(Number(a.dataset.series===selected)-Number(b.dataset.series===selected))||Number(a.dataset.paintOrder)-Number(b.dataset.paintOrder)).forEach(el=>el.parentNode.append(el));
  });
  hideTooltip();
  $$('[data-focus-model]',root).forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.focusModel===selected)));
}

function changeView(id,view){
  views.set(id,view);
  ['chart','data'].forEach(value=>{
    const tab=$(`#${id}-${value}-tab`),pane=$(`#${id}-${value}`);
    tab.setAttribute('aria-selected',String(value===view));tab.tabIndex=value===view?0:-1;pane.hidden=value!==view;
  });
  hideTooltip();
}

document.addEventListener('click',event=>{
  const tab=event.target.closest?.('[data-panel-id][data-view]');if(tab)changeView(tab.dataset.panelId,tab.dataset.view);
  const button=event.target.closest?.('[data-focus-group]');if(button){const group=button.dataset.focusGroup,id=button.dataset.focusModel;$$('svg',button.closest('.research-figure')||button.closest('#lookahead-chart')).forEach(finishChart);focus.set(group,focus.get(group)===id?null:id);applyHighlight(group);}
});
document.addEventListener('keydown',event=>{
  const tab=event.target.closest?.('.view-tab');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();const view=['ArrowLeft','Home'].includes(event.key)?'chart':'data';changeView(tab.dataset.panelId,view);$(`#${tab.dataset.panelId}-${view}-tab`).focus();
});
document.addEventListener('change',event=>{if(event.target.id==='lookahead-cohort'){cohort=event.target.value;if(source)renderLookahead();}});
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{const next=$('#lookahead-chart')?.clientWidth<650;if(source&&next!==narrow){narrow=next;renderLookahead();}},120);});

export function renderResearchFigures(data,locale){
  source=data;language=locale;narrow=$('#lookahead-chart').clientWidth<650;
  $('#lookahead-cohort').value=cohort;
  renderLookahead();renderSimulation();renderHardware();
}
