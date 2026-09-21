import test from 'node:test';import assert from 'node:assert/strict';
import {ANIMATION_DEFAULTS,animationFrame,addChapter,removeChapter} from '../src/animation.js';
import {fresh,motion,validateProject} from '../src/model.js';
import {packProject,unpackProject} from '../src/backup.js';
test('Short clips complete their choreography before exit; tempos are ordered and deterministic',()=>{
 for(const duration of [.1,.5,2,10])for(const tempo of [.75,1,1.5,2]){
  const m={start:2,end:2+duration,animation:{...ANIMATION_DEFAULTS,tempo}};
  const at=animationFrame(m,2+duration*.81);assert.ok(at.progress>=.99);assert.deepEqual(at,animationFrame(m,2+duration*.81));
  assert.ok(animationFrame(m,2+duration*.9999).alpha<.02);
 }
 const m={start:0,end:5,animation:{...ANIMATION_DEFAULTS,tempo:.75}},slow=animationFrame(m,1).progress;m.animation.tempo=2;assert.ok(animationFrame(m,1).progress>slow);
});
test('Animation survives portable backup and rejects invalid parameters',async()=>{
 const m=motion('linsi-checklist',0,5);m.animation={tempo:1.5,entrance:'rise',exit:'shrink',transition:.6,opacity:65};
 const p={...fresh(),duration:5,motions:[m]},restored=await unpackProject(packProject(p,new File(['bytes'],'source.mp4')));assert.deepEqual(restored.project.motions[0].animation,m.animation);
 for(const bad of [{tempo:0},{exit:'unknown'},{opacity:NaN},{transition:8},{entrance:'toString'}]){const q=structuredClone(p);Object.assign(q.motions[0].animation,bad);assert.throws(()=>validateProject(q));}
});
test('Chapters preserve existing timing when added or removed, and keep first start at zero',()=>{
 let m=motion('chapter-progress',0,10),original=[...m.chapterTimes];m=addChapter(m);assert.deepEqual(m.chapterTimes.slice(0,4),original);m=removeChapter(m,0);assert.equal(m.chapterTimes[0],0);
 while(m.chapterTimes.length<12)m=addChapter(m);assert.throws(()=>addChapter(m));assert.doesNotThrow(()=>validateProject({...fresh(),duration:10,motions:[m]}));
 while(m.chapterTimes.length>2)m=removeChapter(m,1);assert.throws(()=>removeChapter(m,0));
});
