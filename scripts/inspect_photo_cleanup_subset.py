"""Render a read-only inspection aid from explicit immutable inventory indexes."""
import argparse,json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
ROOT=Path(__file__).resolve().parents[1]
def main():
    p=argparse.ArgumentParser();p.add_argument('--indices',required=True);p.add_argument('--name',required=True);a=p.parse_args()
    if Path(a.name).name!=a.name:raise ValueError('Output name must be a basename.')
    inventory=json.loads((ROOT/'output/qa/course-photo-style/inventory.json').read_text())['assets']
    items=[inventory[int(x)-1] for x in a.indices.split(',')]
    out=ROOT/'output/qa'/a.name;out.mkdir(parents=True,exist_ok=True)
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',16)
    for start in range(0,len(items),4):
        group=items[start:start+4];sheet=Image.new('RGB',(1120,420*len(group)),'#faf8f2');d=ImageDraw.Draw(sheet)
        for j,row in enumerate(group):
            with Image.open(ROOT/'Lessons/Lesson1/images'/row['filename']) as im:
                sheet.paste(ImageOps.contain(im.convert('RGB'),(600,380)),(0,j*420))
                sheet.paste(ImageOps.fit(im.convert('RGB'),(300,375)),(680,j*420))
            d.text((5,j*420+385),f"{row['index']} {row['filename']}",font=font,fill='black')
        sheet.save(out/f'review-{start//4+1:02d}.jpg',quality=94)
    print('Inspection only, no approvals:',out)
if __name__=='__main__':main()
