from pathlib import Path
import math, struct, wave
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts'/'editor-v040'
OUT.mkdir(parents=True,exist_ok=True)
WAV=OUT/'qa-tone.wav'
with wave.open(str(WAV),'wb') as f:
    rate=44100; f.setnchannels(1); f.setsampwidth(2); f.setframerate(rate)
    f.writeframes(b''.join(struct.pack('<h',int(2500*math.sin(2*math.pi*330*i/rate))) for i in range(rate)))

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='msedge',headless=True)
    page=browser.new_page(viewport={'width':1600,'height':900})
    errors=[]
    page.on('console',lambda msg: errors.append(f'console:{msg.type}:{msg.text}') if msg.type=='error' else None)
    page.on('pageerror',lambda exc: errors.append(f'page:{exc}'))
    page.goto('http://127.0.0.1:5031/?v=0.4.0',wait_until='networkidle')
    assert page.locator('footer').get_by_text('v0.4.0').count()==1
    page.locator('footer [data-action="update-open"]').click()
    assert page.get_by_role('heading',name='版本与更新').count()==1
    assert page.get_by_text('当前版本').count()==1
    page.screenshot(path=str(OUT/'updates-1600x900.png'),full_page=True)
    page.locator('[data-action="close-dialog"]').click()
    assert page.locator('[data-tab="text"] i').evaluate("e=>getComputedStyle(e,'::before').content") not in ('none','normal','""')
    assert page.locator('[data-tab="audio"] i').evaluate("e=>getComputedStyle(e,'::before').content") not in ('none','normal','""')
    page.get_by_role('button',name='动效',exact=True).click()
    assert '商业版精选体验组件' not in page.locator('#library').inner_text()
    page.locator('nav [data-action="cloud"]').click()
    assert page.get_by_text('灵思 PRO版 · 完整内容增长系统').count()==1
    assert page.locator('.compare-row').count()==5
    assert page.locator('.ai-capability').count()==2
    assert page.get_by_text('AI 智能匹配',exact=True).count()>=1
    assert page.get_by_text('AI 动效',exact=True).count()>=1
    assert page.get_by_text('持续经营一个账号').count()==1
    assert page.get_by_role('link',name='进入灵思官网体验 PRO版').get_attribute('href').startswith('https://os.yanbeiai.com/')
    page.screenshot(path=str(OUT/'pro-compare-1600x900.png'),full_page=True)
    page.locator('[data-action="close-dialog"]').click()
    page.get_by_role('button',name='打开人物演示').click()
    page.wait_for_selector('canvas#stage:not([hidden])',timeout=20000)
    page.wait_for_timeout(1200)
    page.locator('#seek').evaluate("e=>{e.value='4';e.dispatchEvent(new Event('input',{bubbles:true}))}")
    page.locator('.timeline-tools [data-action="split-video"]').click()
    assert page.locator('.video-track .clip').count()==2
    page.locator('[data-video="speed"]').evaluate("e=>{e.value='1.25';e.dispatchEvent(new Event('change',{bubbles:true}))}")
    page.locator('[data-action="move-video-left"]').click()
    page.get_by_role('button',name='剪辑',exact=True).click()
    page.locator('[data-action="canvas-ratio"][data-value="9:16"]').click()
    assert page.locator('#stage').get_attribute('height')=='1920'
    page.get_by_role('button',name='字幕',exact=True).click()
    page.get_by_role('button',name='添加字幕').first.click()
    page.locator('#caption-find').fill('输入')
    page.locator('#caption-replace').fill('灵思')
    page.get_by_role('button',name='全部替换').click()
    page.get_by_role('button',name='图文',exact=True).click()
    page.get_by_role('button',name='主标题').click()
    assert page.locator('.layer-track .clip').count()>=1
    page.get_by_role('button',name='音乐',exact=True).click()
    page.locator('#audio-file').set_input_files(str(WAV))
    page.wait_for_timeout(600)
    assert page.locator('.audio-card').count()==1
    page.screenshot(path=str(OUT/'editor-1600x900.png'),full_page=True)
    page.set_viewport_size({'width':1280,'height':850})
    page.screenshot(path=str(OUT/'editor-1280x850.png'),full_page=True)
    page.get_by_role('button',name='导出视频').click()
    page.locator('#resolution').select_option('720')
    page.get_by_role('button',name='开始导出').click()
    page.wait_for_selector('[data-action="download-video"]',timeout=180000)
    with page.expect_download() as info:
        page.locator('[data-action="download-video"]').click()
    info.value.save_as(OUT/'qa-export.mp4')
    page.wait_for_timeout(300)
    assert not errors, errors
    browser.close()
print('QA_OK',OUT/'qa-export.mp4')
