"""Reproduce locally retouched paired photographs from pinned existing sources.

Pillow 12.1 / OpenCV 5 authoring utility; no app dependency or provider call.
The clock hand landmarks, cutout geometry, wrist crop and day lighting below
are measured source-pixel edits. Outputs are photographic composites, not raw
camera photographs and do not inherit human approval from any source.
"""
from pathlib import Path
import sys, math, json, hashlib, io
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageOps, ImageEnhance, ImageFilter, ImageFont
ROOT=Path(__file__).resolve().parents[1]
ART=ROOT/'docs/product/media-sources'
SRC=ROOT/'Lessons/Lesson1/images'
import argparse
parser=argparse.ArgumentParser(description='Offline photographic time-pair authoring; no network or provider calls.')
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args()
OUT=args.output;OUT.mkdir(parents=True,exist_ok=True)
if any(OUT.glob('a1_photo_time_*.webp')):raise ValueError('Use an empty output directory; versioned outputs are not overwritten.')
manifest=json.loads((ROOT/'docs/product/time-exchange-photo-assets-v1.json').read_text(encoding='utf-8'))
for source in manifest['sources']:
    if hashlib.sha256((ROOT/source['path']).read_bytes()).hexdigest()!=source['sha256']:raise ValueError('Source bytes changed: '+source['path'])
person=Image.open(SRC/'a1_photo_u4_what_time_luis_v1.webp').convert('RGB')
alpha=Image.open(ART/'time-asking-people-mask-v1.png').convert('L')
# Exclude the fence post beside the hair; it belongs to the old background.
a=ImageDraw.Draw(alpha)
a.polygon([(785,0),(927,0),(927,24),(881,48),(856,88),(844,139),(850,185),(855,218),(845,238),(847,261),(864,288),(866,335),(870,359),(841,380),(790,380)],fill=0)
alpha=alpha.filter(ImageFilter.GaussianBlur(.6))
alpha.save(OUT/'people-mask.png')
watch=ImageOps.exif_transpose(Image.open(ART/'watch-generic-2017.jpg')).convert('RGB').resize((960,1280),Image.Resampling.LANCZOS)
pixels=np.array(watch);yy,xx=np.indices((1280,960));cx,cy=468,615
gold=(pixels[:,:,0].astype(int)-pixels[:,:,2].astype(int)>23)&(pixels[:,:,1]>70)
inner=(xx-cx)**2+(yy-cy)**2<185**2
mask=cv2.dilate(np.where(gold&inner,255,0).astype('uint8'),np.ones((5,5),np.uint8))
clean=Image.fromarray(cv2.inpaint(pixels,mask,7,cv2.INPAINT_TELEA))
wm=Image.new('L',clean.size);d=ImageDraw.Draw(wm)
d.polygon([(322,0),(582,0),(636,1280),(315,1280)],fill=255);d.ellipse((202,355,742,881),fill=255)
finger=Image.new('L',person.size);ImageDraw.Draw(finger).polygon([(976,731),(991,736),(1015,752),(1020,769),(1009,778),(996,775),(984,762)],fill=255)
wristmask=Image.new('L',person.size);ImageDraw.Draw(wristmask).polygon([(850,806),(879,787),(916,776),(1003,776),(1025,763),(1090,755),(1180,772),(1290,803),(1360,890),(1330,1024),(856,1024),(854,943),(833,912),(844,850)],fill=255)
def fit(im):return ImageOps.fit(im,(1536,1024),method=Image.Resampling.LANCZOS)
morning=ImageOps.mirror(Image.open(SRC/'a1_photo_u4_day_morning_v1.webp').convert('RGB'))
afternoon=person.copy()
evening=fit(Image.open(SRC/'a1_photo_u4_day_evening_v1.webp').convert('RGB').crop((0,0,960,640))).filter(ImageFilter.GaussianBlur(2))
night=fit(Image.open(SRC/'a1_scene_night_1be2a44.webp').convert('RGB').crop((1150,0,1536,800)))
land=ImageEnhance.Brightness(morning).enhance(.055)
land=Image.blend(land,Image.new('RGB',land.size,(4,13,26)),.42)
grad=Image.new('L',land.size);dg=ImageDraw.Draw(grad)
for y in range(390,1024):dg.line((0,y,1536,y),fill=min(255,int((y-390)*1.5)))
night=Image.composite(land,night,grad)
moon=Image.open(SRC/'a1_photo_u4_day_night_v1.webp').convert('RGB').crop((283,188,960,860)).resize((110,110),Image.Resampling.LANCZOS)
mm=Image.new('L',moon.size);ImageDraw.Draw(mm).ellipse((4,4,106,106),fill=255)
night.paste(moon,(455,135),mm.filter(ImageFilter.GaussianBlur(.7)))
settings={'morning':(morning,.94,(246,184,88),.09),'afternoon':(afternoon,1.0,(255,255,255),0),'evening':(evening,.76,(207,146,102),.08),'night':(night,.52,(12,24,44),.18)}
rows=[]
for key,hour,period,notation in [('07',7,'morning','7:00'),('07_am',7,'morning','7:00 AM'),('03_pm',3,'afternoon','3:00 PM'),('07_pm',7,'evening','7:00 PM'),('09_pm',9,'night','9:00 PM'),('03_am',3,'night','3:00 AM'),('09_am',9,'morning','9:00 AM')]:
    face=clean.copy();d=ImageDraw.Draw(face)
    ang=math.radians(hour*30-90)
    for end,width in [((cx+157*math.cos(ang),cy+157*math.sin(ang)),10),((cx,419),5)]:d.line([(cx,cy),end],fill=(232,201,110),width=width)
    d.ellipse((cx-9,cy-9,cx+9,cy+9),fill=(227,193,96))
    piece=face.crop((200,325,750,920)).convert('RGBA');piece.putalpha(wm.crop((200,325,750,920)).filter(ImageFilter.GaussianBlur(1.2)))
    wide=person.copy();small=piece.resize((70,77),Image.Resampling.LANCZOS);wide.paste(small,(949,778),small);wide.paste(person,(0,0),finger.filter(ImageFilter.GaussianBlur(.5)))
    bg,brightness,tint,mix=settings[period]
    def grade(im):return Image.blend(ImageEnhance.Brightness(im.convert('RGB')).enhance(brightness),Image.new('RGB',im.size,tint),mix)
    foreground=grade(wide)
    question=Image.composite(foreground,bg,alpha) if period!='afternoon' else foreground
    crop=(896,741,1088,869)
    wrist=foreground.crop(crop).resize((1536,1024),Image.Resampling.LANCZOS)
    wa=wristmask.crop(crop).filter(ImageFilter.GaussianBlur(.8)).resize((1536,1024),Image.Resampling.LANCZOS)
    replybg=fit(bg.crop((355,0,820,310))) if period=='afternoon' else bg
    response=Image.composite(wrist,replybg.filter(ImageFilter.GaussianBlur(1.5)),wa)
    sharp=piece.resize((560,616),Image.Resampling.LANCZOS);colored=grade(sharp).convert('RGBA')
    if period=='night':colored=ImageEnhance.Brightness(colored).enhance(1.45)
    colored.putalpha(sharp.getchannel('A'));response.paste(colored,(424,296),colored)
    d=ImageDraw.Draw(response);d.rounded_rectangle((556,887,980,987),radius=15,fill=(18,27,40),outline=(153,164,176),width=3);d.text((768,938),notation,font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',53),anchor='mm',fill='white')
    for role,im in [('ask',question),('reply',response)]:
        filename=f'a1_photo_time_{key}_{role}_v1.webp';im.save(OUT/filename,format='WEBP',quality=94,method=6)
        rows.append({'filename':filename,'pair_id':key,'role':role,'hour':hour,'day_part':period,'notation':notation,'clock_id':'gold-black-leather-watch-1','scene_id':period,'sha256':hashlib.sha256((OUT/filename).read_bytes()).hexdigest(),'bytes':(OUT/filename).stat().st_size})
sheet=Image.new('RGB',(800,7*294),'#f3eee7');d=ImageDraw.Draw(sheet)
for i in range(7):
    for j in range(2):
        row=rows[i*2+j];im=Image.open(OUT/row['filename']);sheet.paste(im.resize((384,256),Image.Resampling.LANCZOS),(j*400+8,i*294+28));d.text((j*400+8,i*294+6),f"{row['notation']} / {row['role']} / {row['day_part']}",fill='#18252b')
sheet.save(OUT/'contact-sheet.jpg',quality=94)
(OUT/'assets.json').write_text(json.dumps(rows,indent=2)+'\n',encoding='utf-8')
print(f'Rendered {len(rows)} local photographic composites for inspection.')
