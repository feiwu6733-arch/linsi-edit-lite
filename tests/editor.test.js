import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh} from '../src/model.js';
import {normalizeProject,layoutClips,mapTimelineTime,splitClip,duplicateClip,moveClip,deleteClip,canvasDimensions} from '../src/timeline.js';
import {replaceCaptionText,offsetCaptions,splitLongCaptions,mergeAdjacentCaptions} from '../src/subtitles.js';

function project(){const p={...fresh(),duration:10,width:1920,height:1080};return normalizeProject(p,{width:1920,height:1080,duration:10});}
test('video timeline splits, maps, duplicates, reorders and deletes without losing source timing',()=>{const p=project(),right=splitClip(p,4);assert.equal(p.videoClips.length,2);assert.equal(mapTimelineTime(p,4.5).sourceTime,4.5);const copy=duplicateClip(p,right);assert.equal(p.videoClips.length,3);assert.equal(p.duration,16);assert.equal(moveClip(p,copy,-1),true);assert.equal(deleteClip(p,copy),true);assert.equal(p.duration,10);assert.deepEqual(layoutClips(p).map(x=>x.timelineStart),[0,4]);});
test('speed changes output duration and all canvas presets stay even-sized',()=>{const p=project();p.videoClips[0].speed=2;normalizeProject(p,p.source);assert.equal(p.duration,5);assert.deepEqual(canvasDimensions(p.source,'9:16'),{width:1080,height:1920});assert.deepEqual(canvasDimensions(p.source,'1:1'),{width:1080,height:1080});});
test('subtitle batch tools preserve explicit timing boundaries',()=>{const rows=[{id:'a',text:'你好世界你好世界',start:1,end:5},{id:'b',text:'第二句',start:5.1,end:7}];assert.equal(replaceCaptionText(rows,'你好','灵思'),1);const split=splitLongCaptions(rows,4);assert.equal(split.length,3);assert.equal(split[0].start,1);assert.equal(split[1].end,5);const shifted=offsetCaptions(split,2,8);assert.equal(shifted.at(-1).end,8);const merged=mergeAdjacentCaptions([{id:'1',text:'甲',start:0,end:1},{id:'2',text:'乙',start:1.1,end:2}]);assert.equal(merged.length,1);assert.match(merged[0].text,/甲，乙/);});
