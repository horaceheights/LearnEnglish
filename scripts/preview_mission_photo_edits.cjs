// Inspect actual shared placement math; this is not a live app/audio test.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { fitMissionHeadScene } = require('../mobile/src/missionTargetInteraction');
const root = path.resolve(__dirname,'..');
const directory=path.join(root,'output/imagegen/course-photo-sweep-v9');
const reviews=JSON.parse(fs.readFileSync(path.join(directory,'agent-target-reviews.json'),'utf8'));
const results=[];
for (const [id,review] of Object.entries(reviews)) {
  if(review.targets.length===1)continue;
  for(const [width,height] of [[328,410],[440,190],[650,190],[560,280],[960,430]]) {
    const frame=fitMissionHeadScene(width,height,review.targets);
    assert.ok(frame && frame.height<=height,id);
    assert.equal(frame.imageWidth/frame.imageHeight,1.5);
    assert.ok(frame.imageX>=0&&frame.imageY>=0&&frame.imageX+frame.imageWidth<=width&&frame.imageY+frame.imageHeight<=height,id);
    for(const marker of frame.markers) {
      assert.ok(marker.width>=48&&marker.height>=48);
      assert.ok(marker.x>=0&&marker.y>=0&&marker.x+marker.width<=width&&marker.y+marker.height<=height,id);
      for(const other of frame.markers)if(marker.id!==other.id) {
        assert.ok(marker.x+marker.width<=other.x || other.x+other.width<=marker.x || marker.y+marker.height<=other.y || other.y+other.height<=marker.y,id+' overlapping markers');
      }
    }
    results.push({id,width,height,frame,labels:review.targets.map(t=>t.label_es)});
  }
}
fs.writeFileSync(path.join(directory,'target-layouts.json'),JSON.stringify(results,null,2)+'\n');
console.log(`${results.length} layouts: complete 3:2 scene, 48dp targets and no overlaps.`);
