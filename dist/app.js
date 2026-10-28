import { renderResearchFigures } from './charts.js';
import { initializeMedia, translateMedia } from './media.js';
import './navigation.js';

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => [...root.querySelectorAll(selector)];
const readPreference = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
const savePreference = (key, value) => { try { localStorage.setItem(key,value); } catch {} };
let language = readPreference('anchor-language','en') === 'zh' ? 'zh' : 'en';
let data;
const t = (en,zh) => language === 'zh' ? zh : en;
const label = item => language === 'zh' && item.labelZh ? item.labelZh : item.label;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number = (n,digits=2) => n == null ? t('Pending','待评估') : Number(n).toLocaleString('en-US',{maximumFractionDigits:digits});
const tooltip = $('#chart-tooltip');

function translate() {
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  $$('[data-en][data-zh]').forEach(el => { el.textContent = el.dataset[language]; });
  $('#language-toggle').textContent = language === 'en' ? '中文' : 'EN';
  $('#language-toggle').setAttribute('aria-label',t('Switch to Chinese','切换到英文'));
  $('#theme-select').setAttribute('aria-label',t('Color theme','配色模式'));
  $$('.video-cover').forEach(button => button.setAttribute('aria-label',t('Play video','播放视频')));
  $('#close-image').setAttribute('aria-label',t('Close figure','关闭图片'));
  translateMedia();
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

initializeMedia();

const dialog=$('#image-dialog');
$$('[data-zoom]').forEach(button=>button.addEventListener('click',()=>{
  const image=$('#dialog-image'),caption=button.dataset[language==='zh'?'captionZh':'captionEn'];
  image.src=button.dataset.zoom;image.alt=caption;image.classList.remove('expanded');
  $('#image-caption').textContent=caption;$('#original-image').href=button.dataset.zoom;dialog.showModal();
}));
$('#close-image').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
$('#dialog-image').addEventListener('click',event=>event.currentTarget.classList.toggle('expanded'));
function showTip(mark,event){
  const tip=JSON.parse(mark.dataset.tip);
  tooltip.innerHTML=`<strong>${esc(tip.model)}</strong><div>${esc(tip.metric)}</div><div class="tooltip-value">${esc(Number(tip.value).toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4}))} ${esc(tip.unit||'')}</div>${tip.note?`<small>${esc(tip.note)}</small>`:''}`;
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
function table(headers, rows, highlight=false){
  return `<div class="table-scroll"><table class="data-table"><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr${highlight&&String(row[0]).startsWith('Anchor')?' class="highlight"':''}>${row.map((cell,i)=>i===0?`<th scope="row">${esc(cell)}</th>`:`<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
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
  tooltip.hidden=true;
  renderResearchFigures(data,language);
  renderTables();
}
try{
  const response=await fetch('./data/paper-results.json');if(!response.ok)throw new Error(`HTTP ${response.status}`);
  data=await response.json();renderAll();
  // Resolve deep links after the asynchronously rendered figures have their final height.
  const initialAnchor=document.getElementById(location.hash.slice(1));
  if(initialAnchor)requestAnimationFrame(()=>initialAnchor.scrollIntoView({behavior:'instant',block:'start'}));
}catch(error){
  const message=$('#data-error');message.hidden=false;message.textContent=t('The chart data could not be loaded. Please refresh the page.','图表数据暂时未能加载，请刷新页面。');console.error('Chart data:',error);
}
