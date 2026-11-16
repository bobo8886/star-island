"""Actual file:// release -> gift studio -> downloaded gift notice/privacy QA.

Run only after the release artifacts are frozen:
    python tests/release-license-v621.py
    python tests/release-license-v621.py --artifact path/to/release.html

Uses UI input/click/download actions and read-only game snapshots. No state
injection, internal action calls, fake time, network sharing or game shortcuts.
"""
import argparse
import hashlib
import json
import re
import traceback
import zipfile
from html.parser import HTMLParser
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/release-v621'
VERSION = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
RELEASE = ROOT / 'output/releases' / ('v' + VERSION)
DEFAULT_HTML = RELEASE / ('star-island-v' + VERSION + '.html')
SECRET = 'PRIVATE_TREE_DRAFT_QA621_只留在自己的许愿树下'
RECIPIENT = '星星朋友·QA621'
SENDER = '送礼人·QA621'
GIFT_LETTER = '亲爱的{{recipient}}：\n\n这封公开赠礼祝福会随礼物一起带走。\n\n来自{{sender}}。'


class NoticeParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.active = None
        self.values = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and attrs.get('id') in ('island-license', 'island-notices'):
            assert attrs.get('type') == 'text/plain', 'Notice must be inert text'
            self.active = attrs['id']
            assert self.active not in self.values, 'Duplicate notice block'
            self.values[self.active] = ''

    def handle_data(self, data):
        if self.active:
            self.values[self.active] += data

    def handle_endtag(self, tag):
        if tag == 'script':
            self.active = None


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def notice_expected():
    return {
        'island-license': '\n\n'.join((ROOT / name).read_text(encoding='utf-8') for name in ['LICENSE', 'NOTICE']).strip(),
        'island-notices': (ROOT / 'THIRD_PARTY_NOTICES.md').read_text(encoding='utf-8').strip(),
    }


def verify_notices(path):
    text = path.read_text(encoding='utf-8')
    parsed = NoticeParser()
    parsed.feed(text)
    expected = notice_expected()
    assert set(parsed.values) == set(expected), (path.name, 'Missing notices')
    for key, value in expected.items():
        escaped = re.sub(r'</script', r'<\\/script', value, flags=re.I)
        assert parsed.values[key].strip() == escaped, (path.name, key, 'Notice differs from source')
    assert SECRET not in text, (path.name, 'Private tree draft leaked into software export')
    return {'file': str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
            'bytes': path.stat().st_size, 'sha256': sha(path),
            'noticeCharacters': {key: len(value.strip()) for key, value in parsed.values.items()}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--artifact', type=Path, default=DEFAULT_HTML)
    args = parser.parse_args()
    artifact = args.artifact.resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'version': VERSION, 'artifact': str(artifact), 'passed': False,
              'checks': [], 'artifacts': [], 'browserErrors': [], 'externalRequests': []}
    watched = ['LICENSE', 'NOTICE', 'THIRD_PARTY_NOTICES.md', 'index.html',
               'src/game.js', 'src/studio.js', 'src/tree-letter.js', 'src/personalization.js',
               'scripts/build-standalone.cjs', 'scripts/package-release.py']
    report['sourceHashes'] = {name: sha(ROOT / name) for name in watched}

    def check(label, detail=True):
        report['checks'].append({'name': label, 'detail': detail})
        print(label, flush=True)

    def context(browser):
        ctx = browser.new_context(viewport={'width': 1440, 'height': 1000},
                                  accept_downloads=True, timezone_id='Asia/Shanghai')
        page = ctx.new_page()
        page.on('pageerror', lambda error: report['browserErrors'].append(str(error)))
        page.on('request', lambda req: report['externalRequests'].append(req.url)
                if re.match(r'^https?://', req.url) else None)
        return ctx, page

    def boot(page, path):
        page.goto(path.as_uri())
        page.wait_for_load_state('networkidle')
        page.wait_for_function('window.starIsland && starIsland.snapshot().world.ready', timeout=60000)
        assert page.evaluate('ISLAND_STANDALONE === true')
        for key, value in notice_expected().items():
            text = page.locator('#' + key).text_content().strip()
            assert text == re.sub(r'</script', r'<\\/script', value, flags=re.I), key

    def state(page):
        return page.evaluate('starIsland.snapshot().state')

    def field(page, key):
        label = page.evaluate('(id)=>IslandPersonalization.registry().find(f=>f.id===id).label', key)
        page.locator('#studio-search').fill(label)
        return page.locator(f'[data-studio-field="{key}"]')

    def download_gift(page, filename):
        with page.expect_download(timeout=60000) as pending:
            page.locator('#studio-export-gift').click()
        target = OUT / filename
        pending.value.save_as(str(target))
        report['artifacts'].append(verify_notices(target))
        return target

    page = None
    try:
        assert artifact.is_file(), 'Frozen release HTML has not been packaged'
        report['artifacts'].append(verify_notices(artifact))
        check('Final release HTML embeds the complete LICENSE, NOTICE and third-party notices')

        archive = RELEASE / ('star-island-v' + VERSION + '-offline.zip')
        sums = RELEASE / 'SHA256SUMS.txt'
        members = {'星屿寻迹.html': artifact, 'LICENSE': ROOT / 'LICENSE', 'NOTICE': ROOT / 'NOTICE',
                   'THIRD_PARTY_NOTICES.md': ROOT / 'THIRD_PARTY_NOTICES.md',
                   'START_HERE.md': ROOT / 'docs/OFFLINE_README.md'}
        prefix = 'star-island-v' + VERSION + '/'
        with zipfile.ZipFile(archive) as z:
            assert z.testzip() is None
            assert set(z.namelist()) == {prefix + name for name in members}
            for name, source in members.items():
                assert z.read(prefix + name) == source.read_bytes(), name
        listed = {}
        for line in sums.read_text(encoding='utf-8').splitlines():
            digest, name = line.split('  ', 1)
            listed[name] = digest
        assert set(listed) == {artifact.name, archive.name}
        assert all(sha(RELEASE / name) == digest for name, digest in listed.items())
        check('Player ZIP contains exactly five intended files; SHA-256 checksums match', sorted(members))

        with sync_playwright() as pw:
            browser = pw.chromium.launch(channel='msedge', headless=True)
            try:
                report['browserVersion'] = browser.version
                source_ctx, page = context(browser)
                boot(page, artifact)
                assert not state(page)['started']
                page.screenshot(path=str(OUT / 'release-welcome.png'))
                check('Unmodified final release boots fully offline with fresh progress')

                page.locator('#start-button').click()
                page.locator('#dialogue-next').click()
                page.wait_for_function('!starIsland.snapshot().world.paused')
                page.locator('#map-button').click()
                page.locator('.region-tab[data-region="home"]').click()
                page.locator('.map-pin[data-id="tree"]').click()
                page.wait_for_function('starIsland.snapshot().screen === "tree-letter"', timeout=30000)
                page.locator('#tree-letter-body').fill(SECRET)
                page.locator('[data-letter-action="save"]').click()
                page.wait_for_function('(secret)=>JSON.stringify(starIsland.snapshot().state.treeLetter).includes(secret)', arg=SECRET)
                page.locator('#modal-close').click()
                check('Private tree draft was saved through the actual map and writing UI')

                page.locator('#settings-button').click()
                page.locator('#customize-button').click()
                expect(page.locator('#gift-studio')).to_be_visible()
                field(page, 'basic.recipient').fill(RECIPIENT)
                field(page, 'basic.sender').fill(SENDER)
                field(page, 'core.letter').fill(GIFT_LETTER)
                page.screenshot(path=str(OUT / 'release-gift-studio.png'))
                gift = download_gift(page, 'license-preserved-gift.html')
                assert state(page)['custom']['recipient'] == RECIPIENT
                assert SECRET in json.dumps(state(page)['treeLetter'], ensure_ascii=False)
                check('Actual studio export retains all notices and excludes independent private draft')

                fresh_ctx, fresh = context(browser)
                boot(fresh, gift)
                received = state(fresh)
                assert not received['started'] and not received['finished']
                assert received['collected'] == [] and received['exploration']['found'] == []
                assert received['treeLetter'] is None
                assert fresh.evaluate('IslandPersonalization.current.recipient') == RECIPIENT
                actual_letter = fresh.evaluate('IslandPersonalization.current.letter')
                assert '这封公开赠礼祝福会随礼物一起带走。' in actual_letter
                assert RECIPIENT in actual_letter and SENDER in actual_letter
                fresh.screenshot(path=str(OUT / 'received-gift-welcome.png'))
                check('Downloaded personalized HTML boots offline, with intended wishes and fresh recipient progress')

                fresh.locator('#open-studio').click()
                expect(field(fresh, 'basic.recipient')).to_have_value(RECIPIENT)
                forwarded = download_gift(fresh, 'license-preserved-forwarded-gift.html')
                last_ctx, last = context(browser)
                boot(last, forwarded)
                assert not state(last)['started'] and state(last)['treeLetter'] is None
                check('Recipient can re-export another offline copy without losing full notices')
                last_ctx.close()
                fresh_ctx.close()
                source_ctx.close()
                page = None
            finally:
                browser.close()

        assert not report['browserErrors'], report['browserErrors']
        assert not report['externalRequests'], report['externalRequests']
        check('No JavaScript page errors or HTTP(S) requests during the offline flows')
        assert report['sourceHashes'] == {name: sha(ROOT / name) for name in watched}, 'Production source changed while QA ran'
        assert report['artifacts'][0]['sha256'] == sha(artifact), 'Release changed while QA ran'
        check('Tested release and production source remained unchanged throughout the run')
        report['passed'] = True
    except Exception:
        report['failure'] = traceback.format_exc()
        if page and not page.is_closed():
            try:
                page.screenshot(path=str(OUT / 'release-license-failure.png'))
            except Exception:
                pass
        raise
    finally:
        (OUT / 'license-privacy-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
