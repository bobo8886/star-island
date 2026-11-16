/* Personalize here, or use 设置 → 布置这座岛 in the game. Local assets work offline. */
window.ISLAND_TEMPLATE_CONTENT = {
  timeZone: 'Asia/Shanghai',
  recipient: '收礼人',
  sender: '赠送者',
  birthday: '',
  girlName: '旅人',
  boyName: '同行者',
  guideName: '向导',
  intro: '欢迎来到星屿。我替你保管了一些闪闪发光的日子，今晚，想把它们一颗一颗还给你。先去找找发光的水晶吧。风语花田和潮汐回廊也藏着小故事，想往哪走都可以。触碰物件或按 F 就能拾起，我会一直跟着你。',
  memories: [
    { id: 'first', theme: '初遇', title: '原来，故事从那时开始', location: '拾光浅滩', color: '#a0e3d8', x: 871, y: 619,
      text: '遇见你以前，我不知道，一个普通的日子也会被记很久。后来才明白，让那一天变得特别的，是你。', photo: '', audio: '' },
    { id: 'know', theme: '相知', title: '有些话，你一听就懂', location: '月光帐篷', color: '#c4b5ef', x: 464, y: 386,
      text: '最安心的时刻，是不用费力解释，你就已经懂了。那些认真听我说话的瞬间，我都有好好收藏。', photo: '', audio: '' },
    { id: 'daily', theme: '日常', title: '把普通日子，过成喜欢', location: '萤火营地', color: '#efc07f', x: 279, y: 504,
      text: '想和你分享的，不只有风景。还有今天很好吃的东西、路边一朵小花，和忽然想起你时，嘴角那一点笑意。', photo: '', audio: '' },
    { id: 'heal', theme: '和好', title: '走慢一点，也一起走', location: '流萤溪畔', color: '#87cde8', x: 564, y: 591,
      text: '我们也会有不够默契的时候。谢谢你愿意停下来，听我把话说完。比起争个对错，我更想学会，好好珍惜你。', photo: '', audio: '' },
    { id: 'future', theme: '未来', title: '下一段时光，也留给你', location: '许愿树下', color: '#f0a8bf', x: 1061, y: 509,
      text: '未来不用每一天都盛大。有一些小期待，有可以慢慢实现的心愿，还有想见就能见到的你，就已经很好。', photo: '', audio: '' }
  ],
  campfire: [
    '坐一会儿吧。今晚的风刚刚好，火也刚刚好。',
    '其实我一直想为你留一个地方。不需要表现得很厉害，也不用把所有事情都做好。累了，就来这里歇一歇。',
    '你认真生活的样子、偶尔闹小脾气的样子，还有笑起来的样子，我都很喜欢。',
    '等这五束微光都亮起来，去观星台看看吧。有些话，我写在了星星里。'
  ],
  goodnight: '已经很晚啦。今天没来得及做完的事，就交给明天。你已经很努力了，安心睡吧。岛上的灯，我替你留着。晚安。',
  goodnightAudio: '',
  letter: '亲爱的{{recipient}}：\n\n如果回忆有形状，我想，它们一定是这些小小的光。平时安静地躲在日子里，回头看时，才发现已经照亮了很长的路。\n\n谢谢你出现在我的生活里。谢谢你给过的理解、陪伴，还有那些连你自己都没有察觉的温柔。\n\n新的一岁，愿你有说走就走的勇气，也有随时停下来的底气。愿你的认真被看见，愿你的小小愿望一个接一个实现。也愿你记得，不需要成为谁期待的样子，你就是很值得被珍惜的人。\n\n往后的日子，我们继续慢慢走。去吃喜欢的东西，去看没看过的风景，把普通的每一天，攒成下一座闪闪发光的小岛。\n\n生日快乐。愿你的世界，总有星光。',
  giftTitle: '一整天的偏爱',
  giftDescription: '把一天交给你安排：想吃的、想去的、想一起做的事。\n兑换期限：一直有效。'
};
window.ISLAND_CONTENT = JSON.parse(JSON.stringify(window.ISLAND_TEMPLATE_CONTENT));
