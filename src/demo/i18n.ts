export const messages: Record<string, [string,string]> = {
 title:['Interactive demo','交互演示'], home:['Back to project','返回主页'], local:['Runs in your browser','在浏览器中运行'],
 language:['Switch to Chinese','Switch to English'], theme:['Appearance','外观'], system:['System','跟随系统'],light:['Light','浅色'],dark:['Dark','深色'],
 simulation:['3D simulation','三维仿真'],controls:['Simulation controls','仿真控制'],
 camera:['Reset view','恢复视角'],overview:['Show full phrase','查看全景'],rotate:['Drag to rotate · Scroll or pinch to zoom','拖动旋转 · 滚轮或双指缩放'],
 inkLegend:['Actual wrist trace','实际腕部笔迹'],
 choose:['Choose a motion','选择动作'],mode:['Interaction mode','交互模式'],preset:['Preset motions','预置动作'],word:['Continuous writing','连续书写'],motion:['Reference motion','参考动作'],
 saveImage:['Save image','保存图片'],savingImage:['Saving…','保存中…'],imageSaved:['Image downloaded.','图片已下载。'],imageError:['Could not save the image. Please try again.','图片保存失败，请重试。'],
 wordLabel:['What should the robot write?','想让机器人写什么？'],space:['Space','空格'],backspace:['Backspace','退格'],clear:['Clear','清空'],heart:['♡ Heart','♡ 爱心'],insertHeart:['Insert a heart','插入爱心'],
 wordHelp:['Up to 32 letters and hearts. Spaces add a longer sideways transfer between words.','字母与爱心合计最多 32 个。空格会增加一次横移，拉开词间距离。'],
 spaceCount:['Space × {count}','空格 × {count}'],estimate:['{count}/32 characters · {spaces} spaces','{count}/32 个字符 · {spaces} 个空格'],estimateTime:[' · About {minutes} min of simulation',' · 约 {minutes} 分钟模拟时间'],
 draftChanged:['Draft changed. Start over to apply it; the current run is preserved.','草稿已修改。点击“从头开始”应用，当前运行保持不变。'],draftHelp:['Start over clears the trace. Play and pause keep your progress.','从头开始会清空笔迹，播放和暂停会保留当前进度。'],startOver:['Start over','从头开始'],
 presetHint:['The policy tracks the selected motion in real time.','策略实时跟踪所选动作。'],wordHint:['The policy runs continuously. Pen lifts, transfers and spaces leave no ink.','策略在整句中连续运行，抬笔、横移和空格不留线。'],
 play:['Play','播放'],pause:['Pause','暂停'],replay:['Replay','重新播放'],reset:['Reset','重置'],progress:['Motion progress','动作进度'],frames:['{current} / {total} frames','{current} / {total} 帧'],
 preparing:['Preparing','准备中'],selecting:['Preparing motion','正在准备动作'],paused:['Paused','已暂停'],running:['Running','运行中'],complete:['Complete','已完成'],failed:['Unable to load','加载失败'],
 loadingTitle:['Preparing the robot','正在准备机器人'],loading:['Loading the robot, motions and policy…','正在加载机器人、动作和策略…'],retry:['Try again','重试'],retryMotion:['Retry motion','重试所选动作'],
 pushTitle:['Test a disturbance','施加扰动'],pushHelp:['Choose 0–60 N. Each push lasts 100 ms; the arrow briefly shows its direction.','输入 0–60 N。每次推力持续 100 ms，箭头短暂显示受力方向。'],forceLabel:['Force (N)','扰动力（N）'],forceInvalid:['Enter a number from 0 to 60.','请输入 0 到 60 之间的数值。'],pushZero:['0 N selected; no force applied.','当前为 0 N，未施加推力。'],forward:['Forward','前'],back:['Back','后'],left:['Left','左'],right:['Right','右'],
 pushAria:['Push robot {direction}','向{direction}推机器人'],pushFeedback:['Applied a {direction} push: {force} N for 100 ms.','已向{direction}施加 {force} N 推力，持续 100 ms。'],pushReady:['Play a motion to test its response to a push.','播放动作后可测试机器人对推力的响应。'],
 phasePrepare:['Preparing','准备'],phaseApproach:['Reaching','伸手'],phaseWrite:['Writing','书写'],phasePenUp:['Pen up','抬笔'],phaseReturn:['Retracting','收手'],phaseSettle:['Settling','站稳'],phaseLateral:['Moving sideways','横移'],
 sequence:['{current}/{total} · {letter} · {phase}','{current}/{total} · {letter} · {phase}'],transfer:['After {letter} · {phase} {current}/{total}','字符 {letter} 已收手 · {phase} {current}/{total}'],
 empty:['Enter at least one letter or heart.','请输入至少一个英文字母或爱心。'],unsupported:['Use only English letters, hearts and spaces.','仅支持英文字母、爱心和空格。'],tooLong:['Use at most 32 letters and hearts; spaces do not count.','字母与爱心合计最多 32 个，空格不占名额。'],
 networkError:['A required resource could not load. Check your connection and try again.','所需资源未能加载，请检查连接后重试。'],integrityError:['A resource is incomplete or damaged. Please try again.','资源不完整或已损坏，请重试。'],runtimeError:['The simulation could not continue. Please reload it.','仿真暂时无法继续，请重新加载。'],webglError:['3D graphics could not start. Please try again in a browser with WebGL enabled.','三维图形未能启动，请在支持 WebGL 的浏览器中重试。'],
 manifest:['Reading resource list','读取资源清单'],robot:['Preparing robot resources','准备机器人资源'],modelCache:['Reading model cache','读取模型缓存'],modelVerify:['Verifying the policy model','校验策略模型'],modelReady:['Policy model ready','策略模型已就绪'],modelLoading:['Preparing the policy model','准备策略模型'],physics:['Loading the physics engine','加载物理引擎'],appearance:['Loading robot appearance','加载机器人外观'],initializing:['Initializing the motion','初始化当前动作'],waitingPolicy:['Preparing local policy inference','准备本地策略推理'],
 viewportAria:['Robot simulation. Drag to rotate and scroll or pinch to zoom.','机器人三维仿真。拖动旋转，滚轮或双指缩放。'],footer:['Simulation and inference run locally on your device.','仿真与推理均在你的设备上运行。']
};
export type Language='en'|'zh';
export type Theme='system'|'light'|'dark';
function read(key:string){try{return localStorage.getItem(key);}catch{return null;}}
export let language:Language=read('anchor-language')==='zh'?'zh':'en';
export let theme:Theme=['light','dark'].includes(read('anchor-theme')??'')?read('anchor-theme') as Theme:'system';
export function t(key:string,values:Record<string,string|number>={}){
 const template=messages[key]?.[language==='zh'?1:0];
 if(template===undefined)throw new Error(`Missing translation: ${key}`);
 return template.replace(/\{(\w+)\}/g,(_,name)=>String(values[name]??''));
}
export function setLanguage(value:Language){language=value;try{localStorage.setItem('anchor-language',value);}catch{}}
export function setTheme(value:Theme){theme=value;try{localStorage.setItem('anchor-theme',value);}catch{}}
export function syncPreferences(){language=read('anchor-language')==='zh'?'zh':'en';theme=['light','dark'].includes(read('anchor-theme')??'')?read('anchor-theme') as Theme:'system';}
export function validationMessage(value:string){
 if(!/[A-Z♡]/.test(value))return t('empty');
 if(/[^A-Z♡ ]/.test(value))return t('unsupported');
 if(value.replace(/ /g,'').length>32)return t('tooLong');
 return '';
}
export function workerText(message:string){
 if(language==='zh')return message;
 const mapping:Record<string,string>={'读取资源清单':'manifest','准备机器人资源':'robot','读取模型缓存':'modelCache','校验完整策略模型':'modelVerify','模型已从本机缓存读取':'modelReady','策略模型已就绪':'modelReady','加载浏览器物理引擎':'physics','初始化当前动作':'initializing','等待本地策略推理就绪':'waitingPolicy','机器人与所选动作已就绪':'initializing','已就绪 · 计算全部在你的浏览器中':'initializing','正在准备所选动作…':'selecting'};
 if(mapping[message])return t(mapping[message]);
 if(message.includes(' · '))return message.split(' · ').map(workerText).join(' · ');
 if(message.startsWith('准备策略模型'))return t('modelLoading')+' '+(message.match(/\d+(?:\.\d+)?\s*(?:MB|KB|GB)/g)?.join(' / ')??'');
 if(message.startsWith('加载机器人资源'))return t('robot')+' '+(message.match(/\d+\/\d+/)?.[0]??'');
 if(message.startsWith('加载完整 G1 外观'))return t('appearance')+' '+(message.match(/\d+\/\d+/)?.[0]??'');
 if(/下载|网络|加载失败|HTTP|fetch/i.test(message))return t('networkError');
 if(/校验|不一致|损坏|缺少|不完整/.test(message))return t('integrityError');
 return t('runtimeError');
}
