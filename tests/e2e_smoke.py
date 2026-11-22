"""Browser smoke test: clicks through every game, control and helper.
Run a local server first (npm start), then: python3 tests/e2e_smoke.py [url]
Needs: pip install playwright && playwright install chromium
"""
import asyncio,json,sys,os
from playwright.async_api import async_playwright
URL=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8080/'
SHOTS='shots';os.makedirs(SHOTS,exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=os.environ.get('CHROME') or None)
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,has_touch=False)
        pg=await ctx.new_page()
        errs=[];pg.on('pageerror',lambda e:errs.append('PAGEERR '+str(e)));pg.on('console',lambda m:m.type=='error' and errs.append('CONSOLE '+m.text))
        await pg.goto(URL);await pg.wait_for_timeout(800)
        await pg.screenshot(path=SHOTS+'/home.png',full_page=True)
        print('cards',await pg.locator('.gcard').count(),'tabs',await pg.locator('.tab').count())
        for gid in ['dispatch','zip','queens','tango']:
            await pg.click(f'.gcard[data-g="{gid}"]') if await pg.locator(f'.gcard[data-g="{gid}"]').count() else await pg.click(f'.tab[data-g="{gid}"]')
            await pg.wait_for_function("!document.getElementById('overlay').classList.contains('show')",timeout=60000);await pg.wait_for_timeout(300)
            await pg.screenshot(path=f'{SHOTS}/{gid}-start.png',full_page=True)
            info=await pg.inner_text('#info');print(gid,'|',info)
            # toggles all on
            for t in await pg.locator('.chip').all():
                if await t.get_attribute('aria-pressed')=='false': await t.click()
            # tap a few cells
            box=await pg.locator('#board').bounding_box()
            for k in range(3):
                await pg.mouse.click(box['x']+box['width']*0.5,box['y']+box['height']*0.5)
            await pg.click('#hintBtn');await pg.click('#hintBtn');await pg.wait_for_timeout(150)
            await pg.screenshot(path=f'{SHOTS}/{gid}-mid.png',full_page=True)
            # undo works
            prog1=await pg.inner_text('#progress');await pg.click('#undoBtn');prog2=await pg.inner_text('#progress');print(' undo',prog1,'->',prog2)
            # reset + toast undo
            await pg.click('#resetBtn');await pg.wait_for_timeout(200);toast=await pg.inner_text('#toast');print(' toast',toast.replace('\n',' '))
            # solve with hints
            for i in range(200):
                if await pg.locator('#hintBtn[disabled]').count(): break
                fx=pg.locator('#coach #fx, #coach #rw')
                if await fx.count(): await fx.first.click()
                await pg.click('#hintBtn')
            await pg.wait_for_timeout(900)
            await pg.screenshot(path=f'{SHOTS}/{gid}-win.png',full_page=True)
            print(' overlay:',(await pg.inner_text('#overlay')).replace('\n',' | ')[:80])
            # next puzzle button
            await pg.click('#again');await pg.wait_for_function("!document.getElementById('overlay').classList.contains('show')",timeout=60000);print(' next ->',await pg.inner_text('#info'))
            # change size & difficulty
            segs=pg.locator('#sizeSeg .seg-btn');n=await segs.count();await segs.nth(0).click()
            await pg.wait_for_function("!document.getElementById('overlay').classList.contains('show')",timeout=60000);print(' size0 ->',await pg.inner_text('#info'))
            await pg.click('#diffSeg .seg-btn[data-v="normal"]');await pg.wait_for_function("!document.getElementById('overlay').classList.contains('show')",timeout=60000);print(' normal ->',await pg.inner_text('#info'))
            await pg.click('#dailyBtn');await pg.wait_for_function("!document.getElementById('overlay').classList.contains('show')",timeout=60000);print(' daily ->',await pg.inner_text('#info'))
            await pg.click('#newBtn');await pg.wait_for_function("!document.getElementById('overlay').classList.contains('show')",timeout=60000);print(' new ->',await pg.inner_text('#info'))
            # make a move then go home & come back -> resume
            box=await pg.locator('#board').bounding_box()
            await pg.mouse.click(box['x']+box['width']*0.3,box['y']+box['height']*0.3);await pg.click('#hintBtn');await pg.wait_for_timeout(400)
            before=await pg.inner_text('#progress')
            await pg.click('#homeBtn');await pg.wait_for_timeout(500)
            res=await pg.locator(f'.gcard[data-g="{gid}"] .resume').count()
            await pg.click(f'.gcard[data-g="{gid}"]');await pg.wait_for_timeout(600)
            print(' resume badge',res,'progress',before,'->',await pg.inner_text('#progress'),'| coach:',(await pg.inner_text('#coach'))[:40])
            await pg.click('#homeBtn');await pg.wait_for_timeout(300)
        # reload persistence
        await pg.reload();await pg.wait_for_timeout(600);print('after reload resume badges',await pg.locator('.resume').count())
        # sound toggle
        await pg.click('#soundBtn');print('sound',await pg.get_attribute('#soundBtn','aria-label'));await pg.click('#soundBtn');print('sound',await pg.get_attribute('#soundBtn','aria-label'))
        # keyboard on zip
        await pg.click('.tab[data-g="zip"]');await pg.wait_for_timeout(800);p1=await pg.inner_text('#progress')
        for k in ['ArrowRight','ArrowDown','ArrowLeft','ArrowUp']: await pg.keyboard.press(k)
        await pg.keyboard.press('h');print('keys zip',p1,'->',await pg.inner_text('#progress'))
        # SW registered?
        await pg.wait_for_timeout(800);print('sw',await pg.evaluate("navigator.serviceWorker.getRegistrations().then(r=>r.length)"))
        print('ERRORS',errs)
        await b.close()
asyncio.run(main())
