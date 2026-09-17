"""Explicit agent pixel observations/coordinates; not human approval."""
import copy,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from scripts.audit_course_media_preservation import digest

# x/y/w/h and endpoint coordinates were read from the newly generated pixels.
# No image filenames or generator prompts are used to infer marker locations.
REVIEWS={
 'u3-m03-full-frame':('Same cream-sweater dinner guest now has a clear stethoscope and medical-cross badge. Original family and warm dining room preserved. Real room fills all edges; no blur padding.',{
  'mother-doctor':([.48,.25,.31,.74],[[.627,.253]],'The foreground woman wears a recognizable stethoscope and medical badge.','person')}),
 'u4-m01-full-frame':('Same cleaning mother, elderly pair and reading girl in a continuous full-frame living room. New floor lamp at far left, large window right. All subjects complete; no inset.',{
  'mother-living-room':([.17,.27,.19,.61],[[.308,.270]],'Blue-shirted woman cleaning the shelves at left.','person'),
  'grandparents-sofa':([.48,.45,.18,.42],[[.533,.453],[.593,.453]],'Both gray-haired adults seated together on the cream sofa.','person'),
  'room-lamp':([.005,.29,.125,.69],[[.068,.293]],'Complete cream-shade tripod floor lamp at the far left.','object'),
  'room-window':([.704,.115,.296,.49],[[.862,.126]],'Large white-framed window at right, above the sofa and plant.','object')}),
 'u4-m02-full-frame':('Continuous kitchen retains father cooking and striped-shirt boy drinking. Exactly two dining chairs, dark and white, now surround the right table; the boy uses a separate step stool. No border.',{
  'father-kitchen':([.247,.19,.176,.79],[[.322,.199]],'Dark-haired man in plaid and apron cooking at the left stove.','person'),
  'boy-kitchen':([.557,.30,.09,.464],[[.604,.304]],'Striped-shirt boy holding water to his mouth on the step stool.','person'),
  'dining-table':([.715,.485,.285,.11],[[.845,.487]],'Wood dining tabletop at right with fruit bowl and water jug.','object'),
  'two-chairs':([.690,.506,.285,.408],[[.712,.510],[.913,.570]],'One dark wooden chair left of table and one white chair in front, two only.','object')}),
 'u4-m03-full-frame':('Full bedroom preserves girl writing at desk and curly-haired child reading on bed. New laptop is clearly visible on left desk and open door at far left has complete handle. No blurred borders.',{
  'girl-bedroom':([.272,.322,.159,.47],[[.334,.326]],'Long-haired girl writing at the desk, left of the central window.','person'),
  'bedroom-bed':([.587,.411,.329,.389],[[.871,.509]],'Right bed mattress and quilt; endpoint lands on exposed bed, not the seated child.','object'),
  'bedroom-computer':([.149,.427,.111,.119],[[.177,.433]],'Open laptop with visible screen and keyboard on the far-left end of desk.','object'),
  'bedroom-door':([.001,.014,.107,.95],[[.049,.294]],'Open panelled door at far-left edge with a brass handle.','object')}),
 'u5-m01-full-frame':('Full market extends around the same man with bread and girl reaching for apples. Foreground orange crates and banana bunches are distinct and complete; natural market detail replaces the blurred margins.',{
  'father-bread':([.138,.079,.289,.91],[[.259,.084]],'Plaid-shirted man at left holding the complete round bread loaf.','person'),
  'daughter-apples':([.46,.366,.232,.45],[[.632,.365]],'Girl at right reaches toward the red apples beside her.','person'),
  'market-oranges':([.218,.608,.295,.20],[[.255,.741]],'Front-left orange crate; pointer lands on one of its oranges. One collection marker leaves the girl reaching for apples unobscured.','object'),
  'market-bananas':([.497,.618,.165,.195],[[.623,.762]],'Front-right banana bunches; single collection marker points to the outer visible bunch without spanning the girl hand.','object')}),
 'u5-m02-full-frame':('Same brown-bob woman with water bottle and gray-haired man with tea tin, now full-frame. Loose tea and two tea bags identify tea; basket of bread/vegetables and two juice bottles clearly separate.',{
  'mother-water':([.232,.174,.276,.676],[[.383,.176]],'Woman in beige coat holding a clear bottle of water.','person'),
  'grandfather-tea':([.457,.158,.281,.615],[[.599,.159]],'Gray-haired man holding open tea tin above loose tea and tea bags.','person'),
  'food-basket':([.562,.546,.377,.315],[[.746,.548]],'Large woven basket contains bread and fresh vegetables.','object'),
  'juice-bottles':([.786,.694,.123,.246],[[.818,.696],[.879,.696]],'Two glass bottles of orange and purple juice at front right.','object')}),
 'u5-m03-full-frame':('Same smiling barista and brick cafe, now edge-to-edge. A physical card clearly reads $5 beside one cup and saucer. Menu gibberish removed; Coffee/TEA headings remain but do not supply the assessed price.',{
  'cafe-counter':([.475,.771,.174,.096],[[.609,.775]],'Single readable $5 price card next to the coffee cup at front-center counter.','object')}),
 'u6-m01-full-frame':('Same four people and plaza retained without inset. Produce identifies the left shop, grandfather stands on zebra crossing, father waits beside bench, boy sits on the tree-bordered park edge reading.',{
  'mother-walking':([.218,.444,.073,.286],[[.255,.447]],'Floral-dress woman walking by the grocery doorway on the left.','person'),
  'grandfather-crossing':([.329,.456,.076,.26],[[.362,.456]],'Gray-haired man with walking stick on the zebra crossing.','person'),
  'father-waiting':([.542,.435,.054,.236],[[.565,.439]],'Checked-shirt man checking watch immediately beside the bench.','person'),
  'boy-sitting':([.63,.539,.16,.40],[[.725,.542]],'Curly-haired boy seated on the park wall with open book.','person')}),
 'u6-m02-full-frame':('Same schoolgirl, parents, older woman and bus in a complete real street. School retains book emblem; grandmother looks toward flower storefront. Bus-stop display clearly shows bus pictogram and 8:00.',{
  'girl-school':([.230,.499,.048,.20],[[.255,.499]],'Girl with red backpack stands immediately beside the school doors.','person'),
  'parents-walking':([.357,.430,.12,.282],[[.389,.447],[.439,.432]],'Woman and man walk together holding hands at the center.','person'),
  'grandmother-looking':([.513,.464,.058,.24],[[.545,.465]],'Gray-haired woman faces the flower storefront to her right.','person'),
  'bus-arriving':([.718,.334,.258,.34],[[.874,.391]],'Actual bus front on the right, immediately beside the large 8:00 bus-stop display.','object')}),
 'u6-m03-full-frame':('Continuous full-frame street preserves brick facade with recognizable ATM directly beside the green-awning food shop. Same walking couple remains right. No building inserted between bank and store.',{
  'bank-checkpoint':([.269,.426,.392,.329],[[.388,.552]],'ATM on the bank facade at left; adjacent food shop shares its right boundary.','object')}),
 'u7-m01-full-frame':('Same six people and garden celebration now fill landscape edge-to-edge. Two women talk left; father helps girl with ribbon; boy writes at table; grandmother reads. All hands and action props visible.',{
  'mother-teacher':([.271,.327,.142,.386],[[.306,.34],[.368,.328]],'Two adult women facing one another and talking at left.','person'),
  'father-helping':([.426,.279,.104,.428],[[.467,.279],[.512,.306]],'Father supports the little girl as she reaches to attach hanging ribbon.','person'),
  'boy-writing':([.467,.481,.111,.302],[[.535,.479]],'Curly-haired boy holds pencil to open notebook at front table.','person'),
  'grandmother-reading':([.604,.448,.165,.434],[[.717,.450]],'Gray-haired woman at right holds an open book on her lap.','person')}),
 'u7-m02-full-frame':('Same five people in the bright party hall, no padding. Grandfather sits left, parents smile together, little girl plays with a colorful ball, boy bites a red apple at right. All subjects fit.',{
  'grandfather-chair':([.207,.470,.143,.426],[[.266,.469]],'White-haired man sits on the wooden chair at left.','person'),
  'parents-happy':([.348,.34,.135,.455],[[.388,.372],[.430,.342]],'Smiling mother and father stand together at center-left.','person'),
  'girl-playing':([.489,.546,.104,.274],[[.527,.547]],'Little girl holds and plays with the bright multicolored ball.','person'),
  'boy-eating':([.689,.482,.077,.368],[[.731,.482]],'Boy on the right brings a red apple to his open mouth.','person')}),
 'u7-m03-full-frame':('Same smiling woman in teal behind wooden podium and sunflowers, now surrounded by continuous real room. Her welcoming hands and happy face remain clear; original guests, warm drapery and lights preserved.',{
  'stage-podium':([.357,.311,.343,.689],[[.438,.316]],'Smiling woman in teal welcomes the learner with open hands from the flowered podium.','person')}),
}

def main():
    pack=json.loads((ROOT/'docs/product/course-photo-sweep-mission-edits-v1.json').read_text(encoding='utf-8'))
    out=ROOT/'output/imagegen/course-photo-sweep-v9';result={}
    for asset in pack['assets']:
        if asset['id'] not in REVIEWS:continue
        observation,geometry=REVIEWS[asset['id']]
        targets=copy.deepcopy(asset['change_control']['original_card']['mission_game']['targets'])
        if set(geometry)!={t['id'] for t in targets}:raise ValueError('Target review incomplete.')
        for target in targets:
            rect,heads,_,kind=geometry[target['id']]
            # Rects retain the established minimum region size. Marker endpoints
            # remain exact observed pixel positions, never these padded centres.
            x,y,w,h=rect;ww=max(.12,w);hh=max(.16,h)
            target['rect']={'x':round(max(0,min(1-ww,x+(w-ww)/2)),5),
                            'y':round(max(0,min(1-hh,y+(h-hh)/2)),5),
                            'width':ww,'height':hh}
            target['head_anchors']=[{'x':x,'y':y} for x,y in heads]
            if kind=='object':target['subject_kind']='object'
        result[asset['id']]={'sha256':digest(out/(asset['id']+'.png')),'disposition':'usable',
                'observation':observation,'targets':targets,'target_observations':{k:v[2] for k,v in geometry.items()},'human_approval':'pending'}
    (out/'agent-target-reviews.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Explicit inspections recorded: {len(result)}/{len(pack["assets"])}. No human approval.')

if __name__=='__main__':main()
