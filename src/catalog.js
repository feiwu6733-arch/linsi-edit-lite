import {ANIMATION_DEFAULTS} from './animation.js';
// Explicit public trial list. Adding another commercial template requires a new extraction.
const entry=(id,name,group,fields,text,nw,nh,extra={})=>({id,name,group,fields,text,nw,nh,tag:group,...extra});
export const TRIAL_MOTIONS=[
 entry('linsi-thesis-lock','核心观点锁定','文字',['第一句','重点句'],'让表达\n更有画面',600,485,{showcase:true,width:32}),
 entry('linsi-identity-tag','人物身份签','信息',['姓名或品牌','身份介绍'],'灵思创作演示\n虚拟剪影 · 无声案例',600,200,{showcase:true,width:28}),
 entry('linsi-checklist','检查清单','信息',['条目一','条目二','条目三'],'内容真实\n证据清楚\n行动明确',845,410),
 entry('linsi-definition','概念解释卡','信息',['概念名称','一句话解释'],'复利思维\n每天做对一点，长期积累改变',922,335),
 entry('linsi-before-after','前后变化','信息',['以前','现在','结论'],'以前凭感觉\n现在看数据\n决策更稳定',1152,400),
 entry('linsi-brand-chapter','品牌章节场','收尾',['结束语','品牌名称','品牌说明'],'让表达，更有画面\n灵思剪辑 Lite\n字幕 · 动效 · 自由创作',600,245,{showcase:true,width:78,x:50,y:45}),
 entry('chapter-progress','经典章节导航','收尾',['开场','内容展开','方法总结','下一步'],'开场\n内容展开\n方法总结\n下一步',1920,57,{width:100,x:50,y:3}),
 entry('linsi-caption-emphasis','字幕重点强调','文字',['主要观点','补充说明'],'让重点被看见\n用清晰表达传递价值',922,216),
 entry('linsi-quote-lock','观点引用','文字',['引用内容','署名'],'真正的改变，从行动开始\n灵思观察',960,335),
 entry('linsi-step-path','步骤路径','信息',['第一步','第二步','第三步'],'找到问题\n拆开讲清\n给出方法',1037,335),
 entry('linsi-subject-frame','主体强调框','信息',['主体名称','补充说明'],'主理人视角\n真实经营现场',1920,1080,{full:true,width:88,x:50,y:48}),
 entry('linsi-evidence-board','证据媒体墙','图片',['图片一说明','图片二说明','图片三说明'],'真实案例\n用户反馈\n经营数据',1920,1080,{full:true,images:3,requiredImages:3,width:70,x:50,y:45}),
 entry('linsi-type-number-unit','大数字·轻单位','数据',['主数字','单位','补充说明','栏目名'],'3\n个月\n专注把一件事做好\n长期投入',720,400,{count:true}),
 entry('linsi-type-check-title','勾选重点标题','文字',['主标题','标签一','标签二','标签三','栏目名'],'让每个重点被看见\n排版清楚\n节奏到位\n表达有力\n内容重点',720,400),
 entry('linsi-type-two-line-reveal','双行宣告标题','文字',['第一句','重点句','栏目名','补充说明'],'让表达，更有画面\n从这一条开始\n灵思 · 自由创作\n把你的下一条，剪得更出彩',720,400,{images:1}),
 entry('linsi-soft-focus-type','柔焦文字聚拢','文字',['主标题','说明','结束短句'],'把想法变清晰\n让观点慢慢聚焦\n从这一刻开始',1075,367),
 entry('linsi-dual-metric','双指标变化','数据',['下降指标','提升指标'],'消耗\n运行速度',560,650,{metrics:'dual',width:26}),
 entry('linsi-growth-curve','增长曲线','数据',['标题','趋势说明','显示指标','数据来源'],'演示数据\n持续积累\n+78%\n示例数值，请替换为你的数据',998,400,{series:true}),
 entry('linsi-timeline-assemble','虚拟时间轴装配','信息',['标题','轨道一','轨道二','轨道三'],'让表达有序发生\n视频画面\n字幕信息\n音乐节奏',720,500),
 entry('linsi-metric-volume','双指标图形联动','数据',['指标一','指标二'],'时间成本\n制作成本',720,500,{metrics:'volume'}),
];
export const TRIAL_MAP=Object.fromEntries(TRIAL_MOTIONS.map(x=>[x.id,x]));
export function createTrial(m,id,start,end){return {id,type:m.id,text:m.text,sub:'',start,end,x:m.x??27,y:m.y??38,width:m.width??38,scale:1,color:'#9cebdc',textColor:'#f7fbff',images:[],...(m.id!=='chapter-progress'?{animation:{...ANIMATION_DEFAULTS}}:{}),...(m.count?{count:true}:{}),...(m.showcase?{presentationProfile:'linsi-showcase-v2'}:{}),...(m.id==='chapter-progress'?{chapterTimes:[0,.28,.58,.82]}:{}),...(m.metrics?{values:[60,40],directions:m.metrics==='dual'?['下降','提升']:['减少','减少']}:{}),...(m.series?{series:[14,27,22,41,36,61,55,91]}:{})};}
export function motionBounds(m,w,h){
 const spec=TRIAL_MAP[m.type];if(!spec)return null;
 if(m.type==='chapter-progress')return{x:0,y:0,width:w,height:h*.052};
 const width=Math.min(w*.96,Math.max(w*.1,w*(Number(m.width)||38)/100),h*.86*spec.nw/spec.nh),height=width*spec.nh/spec.nw;
 const x=Math.max(0,Math.min(w-width,w*(Number(m.x)||0)/100-width/2)),y=Math.max(0,Math.min(h-height,h*(Number(m.y)||0)/100-height/2));
 return{x,y,width,height};
}
