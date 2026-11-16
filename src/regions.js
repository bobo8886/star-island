(() => {
  const l10n=window.IslandI18n?.t||((text)=>text);
/* Four original regions. Coordinates describe feet on the 1536×1024 art. */
window.ISLAND_REGIONS = [
  {
    id:'home', name:l10n("拾光星屿"), subtitle:l10n("回忆与灯火停泊的地方"), art:'assets/island.png',
    spawn:{x:978,y:636}, tint:'#d8a6c5', width:1536,height:1024,
    landmarks:[
      {id:'campfire',name:l10n("篝火夜话"),x:403,y:504,icon:'♬'},
      {id:'tent',name:l10n("月光帐篷"),x:353,y:377,icon:'⌂'},
      {id:'observatory',name:l10n("观星台"),x:1318,y:301,icon:'✧'},
      {id:'tree',type:'letter',name:l10n("许愿树"),x:966,y:498,icon:'✉'},
      {id:'home-forest',type:'portal',name:l10n("前往风语花田"),x:540,y:324,toRegion:'forest',icon:'❀'},
      {id:'home-coast',type:'portal',name:l10n("前往潮汐回廊"),x:1150,y:583,toRegion:'coast',icon:'≈'}
    ]
  },
  {
    id:'forest',name:l10n("风语花田"),subtitle:l10n("听见风，也听见心里的声音"),art:'assets/forest.png',
    spawn:{x:845,y:641},tint:'#a8d7ac',width:1536,height:1024,
    boundary:[[100,413],[152,346],[258,332],[463,306],[505,259],[595,272],[702,265],[818,239],[958,246],[1090,281],[1177,299],[1281,282],[1367,318],[1435,373],[1451,469],[1398,542],[1321,611],[1220,670],[1065,721],[845,760],[644,749],[476,715],[345,664],[222,614],[146,540],[105,466]],
    obstacles:[{x:319,y:281,rx:127,ry:48},{x:517,y:433,rx:124,ry:65},{x:1201,y:454,rx:75,ry:34},{x:1107,y:443,rx:27,ry:20},{x:1281,y:251,rx:67,ry:35},{x:280,y:590,rx:15,ry:15}],
    river:[],
    landmarks:[
      {id:'forest-home',type:'portal',name:l10n("返回拾光星屿"),x:780,y:668,toRegion:'home',icon:'⌂'},
      {id:'forest-coast',type:'portal',name:l10n("前往潮汐回廊"),x:1258,y:633,toRegion:'coast',icon:'≈'},
      {id:'forest-lake',type:'portal',name:l10n("前往月见湖谷"),x:880,y:299,toRegion:'lake',icon:'☽'}
    ]
  },
  {
    id:'coast',name:l10n("潮汐回廊"),subtitle:l10n("把没有说完的话，交给海风"),art:'assets/coast.png',
    spawn:{x:817,y:566},tint:'#8cd9e1',width:1536,height:1024,
    boundary:[[215,291],[259,265],[409,266],[463,300],[602,267],[764,260],[913,262],[1014,314],[1114,305],[1191,272],[1334,277],[1413,327],[1432,397],[1393,455],[1321,501],[1227,554],[1080,600],[936,621],[811,667],[678,695],[522,688],[388,663],[315,620],[283,542],[217,501],[251,448],[239,405],[204,361]],
    obstacles:[{x:299,y:257,rx:57,ry:42},{x:514,y:438,rx:73,ry:20},{x:773,y:322,rx:43,ry:14},{x:997,y:421,rx:48,ry:26},{x:899,y:423,rx:42,ry:21},{x:365,y:597,rx:77,ry:26},{x:1327,y:533,rx:90,ry:40}],
    river:[],
    landmarks:[
      {id:'coast-home',type:'portal',name:l10n("返回拾光星屿"),x:755,y:585,toRegion:'home',icon:'⌂'},
      {id:'coast-forest',type:'portal',name:l10n("前往风语花田"),x:1340,y:396,toRegion:'forest',icon:'❀'}
    ]
  },
  {
    id:'lake',name:l10n("月见湖谷"),subtitle:l10n("绕湖走一圈，把今天慢慢收藏"),art:'assets/moonlake.png',
    spawn:{x:610,y:729},tint:'#b8d8c7',width:1536,height:1024,
    boundary:[[102,430],[146,350],[200,300],[430,295],[480,260],[620,210],[770,205],[950,235],[1080,280],[1190,290],[1320,290],[1430,345],[1450,480],[1400,590],[1310,690],[1150,750],[950,805],[760,820],[550,780],[370,745],[230,690],[140,590],[100,490]],
    obstacles:[{x:310,y:267,rx:125,ry:39},{x:330,y:539,rx:57,ry:22},{x:405,y:556,rx:22,ry:17},{x:871,y:786,rx:17,ry:15},{x:1275,y:657,rx:20,ry:19},{x:285,y:697,rx:17,ry:17},{x:162,y:657,rx:18,ry:15},{x:1049,y:550,rx:26,ry:17}],
    // Water and the planted rocky rim are solid; the broad loop stays clear on every side.
    river:[[500,446],[534,387],[608,345],[692,324],[820,329],[930,357],[1017,405],[1061,460],[1064,496],[1014,546],[880,563],[734,551],[628,527],[536,495]],
    sceneryWater:[[[542,424],[584,383],[657,349],[744,346],[837,354],[922,384],[982,420],[1000,452],[979,466],[930,460],[901,480],[903,525],[850,536],[768,532],[684,513],[602,488],[555,460]]],
    sceneryLights:[[136,211,76],[101,437,72],[161,624,80],[283,678,76],[870,758,90],[1275,629,80],[1436,387,80],[990,450,70],[1077,188,72],[643,145,70],[1201,140,55],[1344,144,55]],
    fireflyPoints:[[553,492],[685,546],[856,572],[1093,496],[983,345],[750,311],[427,383]],
    sceneryRipples:[[757,442,29,7],[673,417,21,5],[844,493,24,6]],
    paperBoatWater:{start:{x:900,y:503},end:{x:748,y:425}},
    landmarks:[
      {id:'lake-forest',type:'portal',name:l10n("返回风语花田"),x:230,y:640,toRegion:'forest',icon:'❀'}
    ]
  }
];

})();
