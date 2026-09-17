"""Read-only visual aid from actual shared layout math; never changes assets."""
import json
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1]
DIRECTORY=ROOT/'output/imagegen/course-photo-sweep-v9'

def main():
    layouts=json.loads((DIRECTORY/'target-layouts.json').read_text())
    font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',14)
    for width in (328,650):
        rows=[r for r in layouts if r['width']==width]
        h=rows[0]['height'];cell_width=width+24;cell_height=h+70
        for start in range(0,len(rows),4):
            sheet=Image.new('RGB',(cell_width*2,cell_height*2),'white');draw=ImageDraw.Draw(sheet)
            for i,row in enumerate(rows[start:start+4]):
                ox=(i%2)*cell_width+8;oy=(i//2)*cell_height+24;frame=row['frame']
                draw.text((ox,oy-22),row['id'],fill='black',font=font)
                draw.rectangle((ox,oy,ox+width,oy+h),fill='#ecf3ef')
                with Image.open(DIRECTORY/(row['id']+'.png')) as im:
                    im=im.resize((round(frame['imageWidth']),round(frame['imageHeight'])))
                    sheet.paste(im,(round(ox+frame['imageX']),round(oy+frame['imageY'])))
                for number,m in enumerate(frame['markers'],1):
                    for endpoint in m.get('leaderHeads',m['heads']):
                        startpoint=m.get('leaderFrom',{'x':m['x']+m['width']/2,'y':m['y']+41})
                        draw.line((ox+startpoint['x'],oy+startpoint['y'],ox+endpoint['x'],oy+endpoint['y']-3),fill='#007a68',width=2)
                    box=(ox+m['x']+8,oy+m['y']+8,ox+m['x']+m['width']-8,oy+m['y']+m['height']-8)
                    draw.rounded_rectangle(box,radius=16,fill='#007a68')
                    draw.text((ox+m['x']+m['width']/2,oy+m['y']+m['height']/2),str(number),anchor='mm',font=font,fill='white')
                for j,label in enumerate(row['labels']):
                    draw.text((ox,oy+h+2+j*11),f'{j+1}. {label}',font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',10),fill='black')
            sheet.save(DIRECTORY/f'target-qa-{width}-{start//4+1}.png')
    print('Static QA overlays generated from actual placement math; not a live app or audio test.')

if __name__=='__main__':main()
