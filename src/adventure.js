(() => {
  const l10n=window.IslandI18n?.t||((text)=>text);
/* Original, non-linear stories. Coordinates are local to each freely accessible region. */
window.ISLAND_ADVENTURE = [
  { id:'wind_chime',type:'story',kind:'pickup',region:'home',name:l10n("没有响的风铃"),itemName:l10n("一枚铜铃"),icon:'♧',color:'#e5c78e',x:210,y:438,
    title:l10n("把风的声音，借给一朵花"),text:l10n("小路边挂着一枚铜铃。铃舌不见了，风经过时，它只是轻轻晃。\n\n阿屿说：「有些东西暂时安静，不代表它失去了用处。林间花田里，也许有人正等它。」"),afterGoal:l10n("你想起花田里那根空空的木架。原来它等的，是这一声清脆的回应。"),goal:'flower_bed' },
  { id:'old_note',type:'story',kind:'pickup',region:'home',name:l10n("折起的谱页"),itemName:l10n("半张旧乐谱"),icon:'♫',color:'#c7b6ef',x:742,y:582,
    title:l10n("一首歌，只记住一半也没关系"),text:l10n("石头下面压着半张乐谱，边角画了一颗歪歪的小星星。\n\n最后一行没有音符，只有一句话：「剩下的旋律，请让风来写。」"),afterGoal:l10n("八音盒缺失的前半段旋律，原来被风吹到了这里。另一半，也许正藏在树叶里。"),goal:'music_box' },
  { id:'postbox',type:'story',kind:'quest',questId:'tide_post',region:'home',name:l10n("星邮筒"),icon:'✉',color:'#91c9da',x:1220,y:463,
    title:l10n("一封还没找到收信人的信"),text:l10n("邮筒侧面写着：「寄往未来，不收邮费。请用一枚白贝壳封缄。」\n\n阿屿记得，潮汐旧岸偶尔会漂来没写完的信。"),completeText:l10n("你把信折好，用白贝壳压住封口。邮筒亮起一小簇海蓝色的光。\n\n「收信人：未来的你。愿那时的你，正在过自己喜欢的生活。」") },
  { id:'music_box',type:'story',kind:'quest',questId:'sky_music',region:'home',name:l10n("旧八音盒"),icon:'♪',color:'#e1afc9',x:767,y:420,
    title:l10n("让一段旋律，重新有回声"),text:l10n("八音盒转了半圈，就停住了。底座上空着两个格子，形状像一张谱页和一片叶子。\n\n它似乎不需要修得完美，只需要有人愿意把缺失的部分找回来。"),completeText:l10n("旧谱页贴住盒底，风叶轻轻颤动。断开的旋律终于接了起来。\n\n阿屿没有说话，只是跟着哼了两声。原来，有些陪伴不需要歌词。") },
  { id:'seed_pouch',type:'story',kind:'pickup',region:'forest',name:l10n("绣着太阳的种子袋"),itemName:l10n("一袋星花种子"),icon:'✿',color:'#dfc37c',x:364,y:352,
    title:l10n("它想等一个愿意慢慢来的人"),text:l10n("种子袋上绣着一轮小太阳，背面写着：「不必每天都发光。按自己的速度长大就好。」\n\n袋子里的星花种子还很饱满，像是刚被谁认真挑选过。"),afterGoal:l10n("你摸了摸口袋里的种子。那片空花坛，终于不必再等下一场春天。"),goal:'flower_bed' },
  { id:'flower_bed',type:'story',kind:'quest',questId:'flower_bridge',region:'forest',name:l10n("等风来的花坛"),icon:'❀',color:'#e8b4ca',x:1020,y:350,
    title:l10n("为明天，种一点小小的期待"),text:l10n("花坛的土很松，旁边立着一根没有风铃的木架。\n\n一张木牌提醒你：「找到星花种子，再借来一枚铜铃。等花开的时候，就让风替我们说声早安。」"),completeText:l10n("种子落进温软的土里，铜铃在木架上响了一声。细小的星花顺着田埂亮起来。\n\n它们没有同时开，却一朵接着一朵。和那些慢慢变好的日子一样。") },
  { id:'pressed_leaf',type:'story',kind:'pickup',region:'forest',name:l10n("会轻轻唱歌的叶子"),itemName:l10n("一片风叶"),icon:'♧',color:'#a5d6af',x:640,y:495,
    title:l10n("风把没有说完的话，留在这里"),text:l10n("你从矮灌木上取下一片已经松开的叶子。叶脉像细细的五线谱，放在耳边，竟有一点温柔的嗡鸣。\n\n它不是为了被永远留住，只是想陪你走一段路。"),afterGoal:l10n("这片叶子的声音，恰好能填进八音盒最后那段空白。你把它小心夹进手记。"),goal:'music_box' },
  { id:'fox_trail',type:'story',kind:'lore',region:'forest',name:l10n("花丛里的小脚印"),icon:'♧',color:'#d9ae8d',x:1156,y:488,
    title:l10n("不是所有相遇，都需要靠得很近"),text:l10n("几枚小脚印停在花丛边。灌木后露出一双圆眼睛，又很快躲了回去。\n\n阿屿放轻了声音：「它也在学着相信这座岛。」"),
    choices:[{id:'wait',label:l10n("蹲下来，安静等一会儿"),result:l10n("你没有伸手。过了一小会儿，一只小狐狸把一朵落花推到你面前，又跑进了草里。\n\n有些信任，是从不催促开始的。")}, {id:'leave',label:l10n("留一片落叶，轻轻走开"),result:l10n("你把一片好看的落叶放在石头上。走远后回头，小狐狸正在认真闻它。\n\n没能靠近，也可以算作一次温柔的告别。")}] },
  { id:'tea_table',type:'story',kind:'lore',region:'forest',name:l10n("两只空茶杯"),icon:'☕',color:'#d7c5a1',x:315,y:581,
    title:l10n("下次见面，也不用准备什么大事"),text:l10n("树下放着两只空茶杯。杯底留着浅浅的茶香，椅子旁夹着一张菜单：热茶、晚风、讲到一半的故事。\n\n阿屿笑起来：「都不收钱。唯一的要求是，下次还来。」") },
  { id:'bottle_letter',type:'story',kind:'pickup',region:'coast',name:l10n("搁浅的漂流瓶"),itemName:l10n("一封未署名的信"),icon:'♧',color:'#8ccfd4',x:455,y:611,
    title:l10n("海没有带走的，是一句祝福"),text:l10n("玻璃瓶卡在浅滩的石缝里。里面的信只有开头：「不知道你现在过得怎样，但愿你有很多可以期待的明天。」\n\n后面空着，像是在等你替某个人把它寄出去。"),afterGoal:l10n("这封没有寄出的信，终于有了去处。营地的星邮筒，会替它记住漫长的路。"),goal:'postbox' },
  { id:'white_shell',type:'story',kind:'pickup',region:'coast',name:l10n("一枚雪白的贝壳"),itemName:l10n("一枚白贝壳"),icon:'◒',color:'#ede0c6',x:976,y:594,
    title:l10n("它曾经听过很远很远的海"),text:l10n("贝壳里没有神秘的答案，只有很轻的回声。你把它握在手心，阳光留下的暖意还没散。\n\n也许一枚小小的贝壳，就足够替一封信压住风。"),afterGoal:l10n("邮筒需要的封缄，就藏在你的掌心里。你忽然很想知道，未来的自己会写回什么。"),goal:'postbox' },
  { id:'tide_clock',type:'story',kind:'lore',region:'coast',name:l10n("不走针的潮汐钟"),icon:'◷',color:'#9bc4df',x:1015,y:450,
    title:l10n("有些时刻，值得被轻轻留下"),text:l10n("潮汐钟的指针停住了，刻度却被海水擦得很亮。钟面下有两行小字：「送给未来」与「留给现在」。\n\n如果能把此刻的一点平静寄出去，你想寄给谁？"),
    choices:[{id:'future',label:l10n("留给未来的自己"),result:l10n("你把愿望写在「送给未来」的一侧。以后遇到疲惫的一天，就想起此刻：风有声音，海有边界，你也可以休息。")}, {id:'today',label:l10n("送给今天的自己"),result:l10n("你把手贴在「留给现在」的一侧。不必等到一切都做好，今天的你，就已经值得拥有一个好心情。")}] },
  { id:'lighthouse_stone',type:'story',kind:'lore',region:'coast',name:l10n("灯塔旁的旧石碑"),icon:'✧',color:'#ebc78d',x:413,y:357,
    title:l10n("灯亮着，就不必着急抵达"),text:l10n("石碑上的字被风磨浅了，只有一句仍很清楚：\n\n「这盏灯不是催船靠岸的。它只是告诉远方的人，这里有人在等。」\n\n阿屿拍了拍你的肩，什么也没解释。") },
  { id:'driftwood',type:'story',kind:'lore',region:'coast',name:l10n("刻满刻度的浮木"),icon:'≋',color:'#cdb095',x:1202,y:354,
    title:l10n("慢慢来，也一直在向前"),text:l10n("浮木上刻着许多高高低低的短线，像是谁在记录潮水经过的日子。\n\n有的线离得很近，有的隔得很远。原来，向前走从来不需要每天都一样快。") },
  { id:'greenhouse_journal',type:'story',kind:'lore',region:'lake',name:l10n("温室的生长手记"),icon:'▧',color:'#b5d8bb',x:350,y:326,
    title:l10n("今天没开花，也有在好好长大"),text:l10n("温室门边的手记沾着水珠。上一页写着「第三天，没有动静」，下一页写着「第八天，还是没有动静」。再往后，夹着一张画得很认真、只有两片小叶子的素描。\n\n最后一行换了颜色：「原来那些看不见变化的日子，根一直在往下长。」\n\n阿屿把书页轻轻压好：「这座温室没有迟到的花。你也没有。」"),
    choices:[{id:'draw',label:l10n("给空白的一页画一片新叶"),result:l10n("你在下一页画了一片小叶子，没有写日期。旁边添了一句：「长到这里，已经很不容易了。」\n\n阿屿在叶柄旁画了一个很小的太阳。不是催它开花，只是让这一页暖一点。")},{id:'water',label:l10n("替窗边的小苗留一杯水"),result:l10n("你把半杯清水放在窗边，杯底压住了翘起的纸角。\n\n有些照顾不需要留下姓名。等下一个人翻到这一页，他会知道，这里曾经有人停下脚步。")}] },
  { id:'moon_thread',type:'story',kind:'pickup',region:'lake',name:l10n("沾着露水的细线"),itemName:l10n("一卷月光细线"),icon:'⌁',color:'#d5d9eb',x:300,y:476,
    title:l10n("把想飞的心，轻轻牵住"),text:l10n("花圃旁的木线轴只剩下很细的一卷线。举到光下，它会闪过一点银色；绕过手指，却柔软得几乎没有重量。\n\n纸签上写着：「可以牵住风筝，但别把风拴得太紧。」\n\n阿屿望向湖的另一边。那边的竹架上，正有一只还没长出翅膀的风筝。"),afterGoal:l10n("银线在口袋里绕成一个小小的圆。湖东的竹架，还缺一张能接住风的纸面。"),goal:'moon_kite' },
  { id:'silver_paper',type:'story',kind:'pickup',region:'lake',name:l10n("压在鹅卵石下的银纹纸"),itemName:l10n("一张银纹纸"),icon:'◇',color:'#d7c8ee',x:1165,y:670,
    title:l10n("空白，也可以是一种邀请"),text:l10n("一张淡紫色的纸被圆石压住，边缘压着细细的月牙纹。纸上没有写好的祝福，也没有标准答案，只有角落里一行很小的字：「想去的地方，可以自己画。」\n\n你把纸对着湖光看了看。那些细纹像许多尚未走过的小路。"),afterGoal:l10n("月牙纹在纸边一闪。把它带到湖东的风筝竹架，就能和那卷细线一起，接住一阵真正的风。"),goal:'moon_kite' },
  { id:'moon_kite',type:'story',kind:'quest',questId:'moon_kite',region:'lake',name:l10n("等一阵风的竹架"),icon:'◇',color:'#d3bde9',x:1220,y:545,
    title:l10n("有牵挂，也可以去很远的地方"),text:l10n("竹架上躺着一只小小的菱形风筝，骨架扎好了，却少了一张纸面和牵线。\n\n制作的人留了两句叮嘱：「花圃边的月光细线很结实。南岸的银纹纸不会怕一点点露水。」\n\n阿屿捏住风筝的一角：「等它做好，方向由你来选。我替你拿线轴。」"),completeText:l10n("你把银纹纸贴好，月光细线穿过竹结。风先是碰了碰纸角，随后把整只风筝托了起来。\n\n你没有跑得很快，阿屿也没有催。细线在两个人之间松松地弯着，像一句不用反复确认的承诺。\n\n「去看想看的风景吧。我会记得，给你留一点回来的线。」\n\n手记里多了一枚月见风筝徽记。") },
  { id:'lakeside_blanket',type:'story',kind:'lore',region:'lake',name:l10n("野餐毯上的第二只杯子"),icon:'☕',color:'#e6b7a3',x:470,y:610,
    title:l10n("把一个下午，分成两个人的份"),text:l10n("格子毯上放着两只杯子，一只装着还温热的果茶，另一只空着。篮子里有一张清单：面包、草莓、餐巾——最后一项写着「不安排别的事」。\n\n湖面偶尔送来一点风，把餐巾吹起一个小角。阿屿伸手压住，问你想怎样度过这段空出来的时间。"),
    choices:[{id:'clouds',label:l10n("一起看云，给它们乱起名字"),result:l10n("你说那朵云像一只没睡醒的猫，阿屿坚持说像烤得太圆的面包。争论还没分出结果，云已经换了形状。\n\n于是你们都笑了。今天不必每件事都有答案。")},{id:'quiet',label:l10n("靠近一点，安静喝完这杯茶"),result:l10n("你把第二只杯子挪近，倒了半杯果茶。两个人没有急着说话，只听水声一点一点把下午铺开。\n\n这也算是一段故事：没有发生大事，却希望以后还能想起。")}] }
];
window.ISLAND_QUESTS = [
  {id:'flower_bridge',name:l10n("让星花再开一次"),target:'flower_bed',requires:['seed_pouch','wind_chime'],reward:l10n("星花徽记"),icon:'✿',color:'#e6aac8',description:l10n("找到种子与铜铃，为林间花坛带回春天。"),effect:l10n("林间花坛会持续开花、飘落星花光点。")},
  {id:'tide_post',name:l10n("寄一封信给明天"),target:'postbox',requires:['bottle_letter','white_shell'],reward:l10n("海风邮戳"),icon:'✉',color:'#9bd7de',description:l10n("把海边的信与白贝壳带回营地邮筒。"),effect:l10n("星邮筒点亮海蓝色的回信灯。")},
  {id:'sky_music',name:l10n("补完风的旋律"),target:'music_box',requires:['old_note','pressed_leaf'],reward:l10n("晚风乐章"),icon:'♫',color:'#cfb5ed',description:l10n("收好旧谱页与风叶，让营地的八音盒重新响起。"),effect:l10n("八音盒上会浮起轻轻跳动的音符。")},
  {id:'moon_kite',name:l10n("把心愿借给湖风"),target:'moon_kite',requires:['moon_thread','silver_paper'],reward:l10n("月见风筝徽记"),icon:'◇',color:'#d3bde9',description:l10n("在湖谷找到月光细线和银纹纸，为湖东的小风筝接上翅膀。"),effect:l10n("手记收好月见风筝徽记；随时可以回来读写给风的话。")}
];

})();
