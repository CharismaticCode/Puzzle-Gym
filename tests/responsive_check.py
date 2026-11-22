"""Screen-size check: loads home and two games at phone, tablet and desktop sizes,
reports horizontal overflow and whether the board and buttons fit, and saves screenshots.
Usage: npm start, then python3 tests/responsive_check.py [url]
"""
import os,sys
import asyncio
from playwright.async_api import async_playwright
SIZES=[('se',375,667,True),('iphone',390,844,True),('small',320,640,True),('phone-land',844,390,True),('ipad',768,1024,True),('ipad-land',1024,768,True),('laptop',1366,768,False),('desktop',1920,1080,False),('ipadpro',1024,1366,True)]
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8080/'
os.makedirs('shots',exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
        for name,w,h,touch in SIZES:
            ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=1,has_touch=touch,is_mobile=touch and w<1000)
            pg=await ctx.new_page();errs=[];pg.on('pageerror',lambda e:errs.append(str(e)))
            await pg.goto(URL);await pg.wait_for_timeout(900)
            await pg.screenshot(path=f'shots/r-{name}-home.png')
            ov1=await pg.evaluate("document.documentElement.scrollWidth-innerWidth")
            for g in ['dispatch','zip']:
                await pg.evaluate(f"location.hash='{g}'");await pg.wait_for_function("!document.getElementById('overlay').classList.contains('show')",timeout=60000);await pg.wait_for_timeout(500)
                await pg.screenshot(path=f'shots/r-{name}-{g}.png')
            m=await pg.evaluate("""(()=>{const b=document.getElementById('board').getBoundingClientRect();const a=document.getElementById('hintBtn').getBoundingClientRect();
              return {ov:document.documentElement.scrollWidth-innerWidth,board:[Math.round(b.left),Math.round(b.top),Math.round(b.width),Math.round(b.bottom)],hintBottom:Math.round(a.bottom),vh:innerHeight}})()""")
            print(name,w,h,'home-ov',ov1,m,errs)
            await ctx.close()
        await b.close()
asyncio.run(main())
