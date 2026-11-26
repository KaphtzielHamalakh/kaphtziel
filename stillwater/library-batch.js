/* Short original readings, indexed to the primary text. Do not present these as verbatim quotations. */
(()=>{
 const A='https://www.sefaria.org/', S='https://suttacentral.net/', G='https://www.gutenberg.org/ebooks/2388', Q='https://quran.com/', E='https://classics.mit.edu/Epictetus/epicench.html';
 const sources=[
 ['Mishnah','Pirkei Avot','Pirkei Avot',A,'Pirkei_Avot.',[
 ['1.2','Justice needs more than an idea. Study it, practice what you owe, and make kindness part of the work.','Shimon the Just'],
 ['1.3','Imagine doing one generous thing without keeping a receipt in your mind.','Antigonus of Sokho'],
 ['1.6','Choose someone to learn from, make a friend, and leave room for a generous reading of others.','Yehoshua ben Peraḥya'],
 ['1.12','Move toward peace. You may have to go out of your way to find it.','Hillel'],
 ['1.14','Ask three questions: Who will stand up for me? For whom will I stand up? When will I begin?','Hillel'],
 ['1.15','Promise less than you plan to give. Greet people with a welcoming face.','Shammai'],
 ['1.17','Listening leaves room for something to happen. The point of study is what it leads you to do.','Shimon ben Gamliel'],
 ['2.4','Put yourself in the other person’s place before you judge how they got there.','Hillel'],
 ['2.5','An embarrassed question can teach you more than another hour of pretending you understand.','Hillel'],
 ['2.9','A good heart makes room for the rest: an open eye, a friend, a neighbor, and a sense of consequence.','Rabban Yoḥanan ben Zakkai and students'],
 ['3.2','Even two people at a table can make space for the Presence by learning together.','Rabbi Ḥananya ben Teradyon'],
 ['3.17','A tree with roots deeper than its branches can stay standing in a hard wind. What roots your learning?','Rabbi Elazar ben Azariah'],
 ['4.3','Everyone has a moment in which they matter. Even the thing you overlook has a place.','Ben Azzai'],
 ['4.15','Give others time: before you soothe anger, before you try to comfort grief, and before you demand an answer.','Rabbi Shimon ben Elazar'],
 ['5.20','Know when you need a leopard’s boldness and when you need an eagle’s lightness.','Yehuda ben Teima']]],
 ['Early Buddhism','Dhammapada','Dhammapada',S,'',[
 ['dhp21-32|21','Careful attention is a way to live fully; sleepwalking through the day narrows what you can do.'],
 ['dhp21-32|25','Make a small island of steadiness where the flood can’t carry you away.'],
 ['dhp33-43|33','A skilled maker straightens an arrow. Give the wandering mind that same patient care.'],
 ['dhp33-43|35','The mind moves quickly and lands where it likes. Training it can bring ease.'],
 ['dhp44-59|49','A bee takes nectar without spoiling the flower. Imagine passing through a place that lightly.'],
 ['dhp44-59|50','Look at what you did and left undone. That’s a better place to start than tallying everyone else’s mistakes.'],
 ['dhp44-59|51–52','A brightly colored flower can have no scent. Listen for whether the words you admire are carried into action.'],
 ['dhp60-75|64–65','A spoon can sit in soup for years and never taste it. A tongue learns the flavor in an instant.'],
 ['dhp76-89|76','Someone who shows you a habit you overlooked may be pointing out buried treasure.'],
 ['dhp76-89|81','Praise and blame pass like wind around a solid rock. Try letting them pass.'],
 ['dhp76-89|82','With good teaching, the mind can settle like a deep, clear lake.'],
 ['dhp100-115|103','Consider the quiet victory of keeping your own temper when you could easily win the fight.'],
 ['dhp129-145|129–130','Others fear pain too. Use your own vulnerability to recognize theirs.'],
 ['dhp153-166|160','The person who can help train this mind is already here. Begin with yourself.'],
 ['dhp183-196|183','Leave harm aside, cultivate what helps, and give the mind a little room to clear.'],
 ['dhp221-234|222','Catch rising anger as a driver catches a chariot that’s beginning to veer.'],
 ['dhp235-255|239','Clean a little at a time, as a silversmith works impurities out of metal.'],
 ['dhp256-272|260–261','Gray hair doesn’t teach wisdom by itself. Truthfulness, care, and restraint make an elder.'],
 ['dhp273-289|277','Look closely at something changing. That honest seeing can loosen the hold it has on you.'],
 ['dhp290-305|290','A small pleasure can be worth giving up if it opens the way to a greater one.']]],
 ['Talmud','Babylonian Talmud','Babylonian Talmud',A,'',[
 ['Berakhot.5b','Rabbi Yoḥanan could help another person up. When he fell ill, he needed someone else to take his hand.'],
 ['Shabbat.31a','A person brings Shammai and Hillel the same impossible-sounding request. Notice what patience makes possible.'],
 ['Shabbat.127a','Visiting a sick person and accompanying someone in grief are among the acts whose worth can’t be counted.'],
 ['Bava_Metzia.59b','Even a voice from heaven cannot take the work of interpreting Torah away from the people arguing about it.'],
 ['Taanit.23a','Someone planted trees for you. A carob tree asks what you’ll plant for people you may never meet.'],
 ['Eruvin.13b','The students of Hillel taught the other school’s position before their own. Try doing that the next time you disagree.'],
 ['Berakhot.10a','Beruriah asks for an end to harmful deeds rather than the deaths of the people committing them.'],
 ['Berakhot.58a','Make room for a crowd of different faces and different minds. There’s a blessing for that.'],
 ['Sotah.14a','Clothe someone who needs clothes. Visit someone who is ill. This is one way to walk in the ways of the Divine.'],
 ['Bava_Metzia.58b','Words can wound without leaving a mark. Notice what happens to a person when they’re shamed in public.']]],
 ['Vedanta','Bhagavad Gītā','Bhagavad Gītā',G,'',[
 ['2.14','Heat and cold, pleasure and pain: they arrive and they go. Practice staying present while they pass.'],
 ['2.48','Give yourself to the work with the same steadiness whether it goes your way or not.'],
 ['2.70','Rivers pour into the ocean and it remains the ocean. How might wanting move through you without carrying you away?'],
 ['3.19','Do what needs doing. See how much of the grip on the results you can release.'],
 ['4.38','Clarity can ripen over time. Keep practicing long enough for what you know to become what you see.'],
 ['5.18','Look with an equal eye at the learned person, the cow, the elephant, and the dog.'],
 ['6.16–17','Eat enough. Rest enough. Make room for practice in the life your body actually lives.'],
 ['6.26','Every time the mind wanders, bring it back. Returning is part of the practice.'],
 ['6.29','Practice looking for the self in every being and every being in the self.'],
 ['12.13–14','The way of devotion looks like friendliness, compassion, and steadiness in the middle of a life.'],
 ['17.15','Before speaking, ask whether the words are true, kind, and useful.']]],
 ['Sufism','Qur’an','Qur’an',Q,'',[
 ['13:28','Hearts find a place to rest in remembrance of God.'],
 ['49:13','We were made into peoples and tribes so that we might come to know one another.'],
 ['50:16','The Divine is nearer than the vein at your throat.'],
 ['94:5–6','Ease can be present alongside difficulty. The passage says it twice.'],
 ['2:286','A soul is not burdened beyond what it can bear. The verse ends with a prayer for pardon, mercy, and help.'],
 ['93:3–5','In a difficult season, remember that silence need not mean abandonment.'],
 ['24:35','Imagine a niche, a lamp, and glass clear as a star. Let the image of light upon light sit with you.'],
 ['55:7–9','The world has a balance. Give things their proper weight without taking more than your share.'],
 ['59:18','Take a moment to look at what you’re sending ahead of you into tomorrow.'],
 ['28:77','Do good as you have received good. Remember your share of this life as you look toward the next.']]],
 ['Kabbalah','Tanya','Tanya · Likkutei Amarim',A,'Tanya%2C_Likutei_Amarim.',[
 ['26','A heavy heart can make it hard to move. Let a little joy become part of what helps you begin.','Shneur Zalman of Liadi'],
 ['27','When a distracting thought returns, you have another chance to decide where your attention goes.','Shneur Zalman of Liadi'],
 ['28','During prayer another thought may appear. You can return to the prayer without holding a conversation with the intrusion.','Shneur Zalman of Liadi'],
 ['31','A broken heart can open a door; numbness can close one. Notice which kind of heaviness you’re carrying.','Shneur Zalman of Liadi'],
 ['32','Take the soul seriously enough to see how much you share with someone whose outward life is unlike yours.','Shneur Zalman of Liadi'],
 ['33','Make a little room for the thought that the Divine is present here, in ordinary life. See what joy that makes possible.','Shneur Zalman of Liadi'],
 ['34','A little time set aside for learning can make a dwelling place for the Divine in an otherwise ordinary day.','Shneur Zalman of Liadi']]],
 ['Stoicism','Epictetus','Enchiridion',E,'',[
 ['1','You can tend your judgments and your choices. The weather, other people, and the outcome are a different matter.'],
 ['4','Before you go to a busy public place, remember that people will act like people. Decide what you intend to bring to it.'],
 ['5','An event happens. Then the mind tells a story about it. Learn to notice that second step.'],
 ['8','Try meeting the day that arrives, rather than spending the day arguing for the one you wanted.'],
 ['10','When something difficult turns up, ask which part of your character the moment gives you a chance to practice.'],
 ['20','If a remark gets under your skin, give yourself a little time before you follow the first impression.'],
 ['33','Make room for silence. Let the words you do speak have a reason to be there.'],
 ['46','Someone who has digested a meal looks nourished. Let your philosophy show up in how you live, not how often you repeat it.']]],
 ['Zen','Dōgen','Shōbōgenzō · Jinzū','https://www.bdk.or.jp/document/dgtl-dl/dBET_T2582_Shobogenzo2_2008.pdf','',[
 ['§§186–187','A teacher asks a student to explain a dream. The student brings a basin and a towel. Another student brings tea. Dōgen asks us to see the remarkable power in these ordinary acts.']]],
 ['Vedanta','Kaṭha Upaniṣad','Kaṭha Upaniṣad','https://www.gutenberg.org/ebooks/3283','',[
 ['1.3.3–9','Imagine the body as a chariot, the senses as horses, and the mind as reins. Who is holding the reins, and where is the chariot going?']]],
 ];
 const colors=['clay','blue','plum','moss'];
 const rows=sources.map(([group,author,work,base,prefix,entries],g)=>entries.map(([ref,text,who],i)=>{
  let tail=ref,url=base, display=ref;
  if(work==='Dhammapada'){[tail,display]=ref.split('|');url+=tail;}
  else if(work==='Qur’an')url+=ref.split('–')[0].replace(':','/');
  else if(group==='Mishnah'||group==='Talmud'||group==='Kabbalah')url+=prefix+tail;
  if(group==='Talmud')display=ref.replaceAll('_',' ').replace('.', ' ');
  const id='lib-'+g+'-'+ref.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  return {id,group,theme:colors[(g+i)%colors.length],text,author:who||author,source:work+' · '+display,url,kind:'Reading note'};
 }));
 const interleaved=[];
 for(let i=0;i<Math.max(...rows.map(x=>x.length));i++) for(const row of rows) if(row[i])interleaved.push(row[i]);
 // Add a few discoveries close to the top while keeping the original opening cards and stable IDs.
 window.STILL_CARDS.splice(3,0,...interleaved.slice(0,6));
 window.STILL_CARDS.push(...interleaved.slice(6));
})();
