# ═══════════════════════════════════════════════════════════════
#  notebook-boot.py — 노트북 파이썬 쪽 준비 (js/notebook-worker.js 가 불러 실행)
#
#  Colab 처럼 쓰이게 하는 것들
#   · 작업 폴더 /content
#   · !명령 (git clone · ls · pip install · wget · unzip …) 과 %매직 (%cd · %pip · %%writefile …)
#   · 마지막 줄 값 표시 (DataFrame 은 표로), display(), plt.show() 그림 — 나오는 차례 그대로
#   · matplotlib 한글 글꼴(나눔고딕) 자동, seaborn 자동 설치
#   · google.colab.files / drive, koreanize_matplotlib 흉내
#  JS 쪽에서 넣어 주는 이름: _nb_emit(kind, a, b) · _nb_site · _nb_input_js(prompt) · _nb_download(name, bytes)
# ═══════════════════════════════════════════════════════════════
import sys, os, io, re, json, base64, shlex, time, types, builtins, asyncio, traceback, shutil, zipfile, fnmatch
import importlib, importlib.util
from urllib.parse import quote, urlparse

os.makedirs('/content', exist_ok=True)
os.makedirs('/root', exist_ok=True)
os.environ['HOME'] = '/root'
os.chdir('/content')

# ── 출력: print 는 쓰는 즉시 화면으로 ─────────────────────────
class _NbStream(io.TextIOBase):
    def __init__(self, name):
        self.name = name
    def writable(self):
        return True
    def isatty(self):
        return False
    def write(self, s):
        if s:
            _nb_emit('stream', self.name, str(s))
        return len(s)
    def flush(self):
        pass

sys.stdout = _NbStream('stdout')
sys.stderr = _NbStream('stderr')


def _nb_human(n):
    for u in ('B', 'KiB', 'MiB', 'GiB'):
        if n < 1024 or u == 'GiB':
            return ('%d %s' % (n, u)) if u == 'B' else ('%.2f %s' % (n, u))
        n /= 1024.0


# ── 값 표시 (Colab 의 마지막 줄 · display) ───────────────────
def _nb_display_value(v):
    if v is None:
        return
    try:
        import pandas as pd
        if isinstance(v, pd.DataFrame):
            _nb_emit('html', v._repr_html_(), '')
            return
    except Exception:
        pass
    try:
        from matplotlib.figure import Figure
        if isinstance(v, Figure):
            _nb_emit_figure(v)
            return
    except Exception:
        pass
    if isinstance(v, (HTML, Markdown)):
        _nb_emit('uhtml' if isinstance(v, HTML) else 'md', v.data, '')
        return
    if isinstance(v, Image):
        _nb_emit('image', v.b64, v.mime)
        return
    try:
        _nb_emit('text', repr(v), '')
    except Exception as e:
        _nb_emit('text', '<표시할 수 없는 값: %s>' % type(v).__name__, '')


def display(*objs, **kw):
    for o in objs:
        _nb_display_value(o)


class HTML:
    def __init__(self, data=None, url=None, filename=None):
        if filename:
            data = open(filename, encoding='utf-8').read()
        self.data = '' if data is None else str(data)
    def _repr_html_(self):
        return self.data


class Markdown:
    def __init__(self, data=''):
        self.data = str(data)


class Image:
    def __init__(self, data=None, filename=None, url=None, format=None, **kw):
        if filename:
            data = open(filename, 'rb').read()
            format = format or os.path.splitext(filename)[1].lstrip('.').lower()
        if isinstance(data, str) and os.path.exists(data):
            format = format or os.path.splitext(data)[1].lstrip('.').lower()
            data = open(data, 'rb').read()
        fmt = (format or 'png').lower().replace('jpg', 'jpeg')
        self.mime = 'image/' + fmt
        self.b64 = base64.b64encode(data or b'').decode('ascii')


def _clear_output(wait=False):
    _nb_emit('clear', '', '')


builtins.display = display
_ipy = types.ModuleType('IPython')
_ipy_disp = types.ModuleType('IPython.display')
for _k, _v in dict(display=display, HTML=HTML, Markdown=Markdown, Image=Image, clear_output=_clear_output).items():
    setattr(_ipy_disp, _k, _v)
_ipy.display = _ipy_disp


class _NbShell:
    def system(self, cmd):
        return asyncio.ensure_future(__nb_sh(cmd, sys.modules['__main__'].__dict__))
    def run_line_magic(self, name, line):
        return asyncio.ensure_future(__nb_magic(name, line, sys.modules['__main__'].__dict__))


_nb_shell = _NbShell()
_ipy.__path__ = []                  # 패키지로 — IPython.display 는 되고, IPython.core 는 ImportError
_ipy.get_ipython = lambda: None     # matplotlib 등이 'IPython 안' 으로 착각해 events 를 찾지 않게
builtins.get_ipython = lambda: _nb_shell   # 사용자가 쓰는 get_ipython().system(...) 은 됨
sys.modules['IPython'] = _ipy
sys.modules['IPython.display'] = _ipy_disp


# ── matplotlib: 한글 글꼴 + 그림을 셀 출력으로 ────────────────
_NB_FONT_DIR = '/usr/share/fonts/truetype/nanum'
_NB_FONTS = {'regular': _NB_FONT_DIR + '/NanumGothic-Regular.ttf', 'bold': _NB_FONT_DIR + '/NanumGothic-Bold.ttf'}
_nb_mpl_ready = False


async def _nb_fetch_bytes(url):
    from pyodide.http import pyfetch
    r = await pyfetch(url)
    if not r.ok:
        raise IOError('HTTP %s' % r.status)
    return await r.bytes()


def _nb_emit_figure(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=100)
    _nb_emit('image', base64.b64encode(buf.getvalue()).decode('ascii'), 'image/png')


def _nb_flush_figs():
    if 'matplotlib.pyplot' not in sys.modules:
        return
    plt = sys.modules['matplotlib.pyplot']
    for num in plt.get_fignums():
        try:
            _nb_emit_figure(plt.figure(num))
        except Exception as e:
            _nb_emit('stream', 'stderr', '그림을 그리지 못했습니다: %s\n' % e)
    plt.close('all')


async def __nb_setup_mpl():
    """처음 한 번 — 나눔고딕을 받아 matplotlib 기본 글꼴로. 글꼴 이름을 다르게 적어도 나눔고딕으로."""
    global _nb_mpl_ready
    if _nb_mpl_ready:
        return
    import logging
    logging.getLogger('matplotlib').setLevel(logging.ERROR)
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from matplotlib import font_manager as fm
    os.makedirs(_NB_FONT_DIR, exist_ok=True)
    for key, path in _NB_FONTS.items():
        if not os.path.exists(path):
            try:
                data = await _nb_fetch_bytes(_nb_site + 'vendor/fonts/' + os.path.basename(path))
                with open(path, 'wb') as f:
                    f.write(data)
            except Exception as e:
                sys.__stderr__.write('글꼴을 받지 못했습니다: %s\n' % e)
        if os.path.exists(path):
            fm.fontManager.addfont(path)
    plt.rcParams['font.family'] = 'NanumGothic'
    plt.rcParams['axes.unicode_minus'] = False
    logging.getLogger('matplotlib.font_manager').setLevel(logging.ERROR)

    _orig = fm.FontManager.findfont
    def _findfont(self, prop, fontext='ttf', directory=None, fallback_to_default=True, rebuild_if_missing=True):
        try:
            return _orig(self, prop, fontext, directory, False, rebuild_if_missing)
        except Exception:
            pass
        try:
            w = fm.FontProperties._from_any(prop).get_weight()
            bold = (w in ('bold', 'heavy', 'black', 'extra bold', 'demibold', 'semibold')) or (isinstance(w, int) and w >= 600)
        except Exception:
            bold = False
        p = _NB_FONTS['bold' if bold else 'regular']
        if os.path.exists(p):
            return p
        return _orig(self, prop, fontext, directory, fallback_to_default, rebuild_if_missing)
    fm.FontManager.findfont = _findfont

    plt.show = lambda *a, **k: _nb_flush_figs()
    _nb_mpl_ready = True


# ── 흉내 모듈: google.colab · koreanize_matplotlib ───────────
def _colab_download(path):
    with open(path, 'rb') as f:
        data = f.read()
    from pyodide.ffi import to_js
    _nb_download(os.path.basename(path), to_js(data))
    print('내려받기: %s' % os.path.basename(path))


def _colab_upload():
    print('왼쪽 [📁 파일] 창의 [올리기]로 파일을 올리세요. 올린 파일은 /content 에 들어갑니다.')
    return {}


def _colab_mount(*a, **k):
    print('Google 드라이브 연결은 이 사이트에서 쓸 수 없습니다. 필요한 파일은 [📁 파일] 창으로 올리세요.')


_g = types.ModuleType('google')
_gc = types.ModuleType('google.colab')
_gcf = types.ModuleType('google.colab.files')
_gcd = types.ModuleType('google.colab.drive')
_gcf.download, _gcf.upload = _colab_download, _colab_upload
_gcd.mount = _colab_mount
_gc.files, _gc.drive = _gcf, _gcd
_g.colab = _gc
_g.__path__ = []
for _name, _mod in (('google', _g), ('google.colab', _gc), ('google.colab.files', _gcf), ('google.colab.drive', _gcd)):
    sys.modules.setdefault(_name, _mod)
_km = types.ModuleType('koreanize_matplotlib')
sys.modules['koreanize_matplotlib'] = _km


# ── pip (micropip) ──────────────────────────────────────────
_NB_IMPORT_NAME = {'scikit-learn': 'sklearn', 'opencv-python': 'cv2', 'pillow': 'PIL', 'beautifulsoup4': 'bs4',
                   'koreanize-matplotlib': 'koreanize_matplotlib', 'python-dateutil': 'dateutil', 'pyyaml': 'yaml'}
_NB_VENDOR_WHEEL = {'seaborn': 'vendor/py/seaborn-0.13.2-py3-none-any.whl'}
_NB_NO_BROWSER = {'tensorflow', 'keras', 'torch', 'torchvision', 'torchaudio', 'tensorflow-gpu', 'jax', 'jaxlib'}


def _nb_import_name(pkg):
    p = pkg.lower()
    return _NB_IMPORT_NAME.get(p, p.replace('-', '_'))


def _nb_version(pkg):
    try:
        from importlib.metadata import version
        return version(pkg)
    except Exception:
        return ''


async def _nb_pip_install(pkgs, quiet=False):
    import micropip
    code = 0
    for spec in pkgs:
        name = re.split(r'[<>=!~\[; ]', spec, 1)[0].strip()
        if not name:
            continue
        low = name.lower()
        if low in _NB_NO_BROWSER:
            print('ERROR: %s 은(는) 이 사이트(브라우저 속 파이썬)에서 쓸 수 없습니다. 이 부분은 Google Colab 에서 실행하세요.' % name)
            code = 1
            continue
        mod = _nb_import_name(low)
        if importlib.util.find_spec(mod) is not None:
            if not quiet:
                print('Requirement already satisfied: %s in /lib/python3.12/site-packages' % name)
            continue
        if not quiet:
            print('Collecting %s' % name)
        try:
            if low in _NB_VENDOR_WHEEL:
                try:
                    await micropip.install(_nb_site + _NB_VENDOR_WHEEL[low])
                except Exception:
                    await micropip.install(spec)
            else:
                await micropip.install(spec)
            importlib.invalidate_caches()
            if not quiet:
                v = _nb_version(name)
                print('Successfully installed %s%s' % (name, ('-' + v) if v else ''))
        except Exception as e:
            code = 1
            print('ERROR: %s 을(를) 설치하지 못했습니다 — %s' % (name, str(e).splitlines()[0] if str(e) else type(e).__name__))
    return code


# ── git clone (github.com 공개 저장소 → jsDelivr 로 받기) ─────
_nb_clones = {}


async def _nb_json(url):
    from pyodide.http import pyfetch
    try:
        r = await pyfetch(url)
    except Exception:
        return None
    if not r.ok:
        return None
    try:
        return await r.json()
    except Exception:
        return None


async def _nb_repo_files(owner, repo, branch):
    """(파일 목록 [(경로, 크기)], 받을 주소 앞부분 목록, 가지) — jsDelivr 먼저, 안 되면 GitHub API"""
    for b in ([branch] if branch else ['main', 'master']):
        d = await _nb_json('https://data.jsdelivr.com/v1/packages/gh/%s/%s@%s?structure=flat' % (owner, repo, quote(b)))
        if d and isinstance(d.get('files'), list):
            files = [(f['name'].lstrip('/'), int(f.get('size') or 0)) for f in d['files']]
            bases = ['https://cdn.jsdelivr.net/gh/%s/%s@%s/' % (owner, repo, quote(b)),
                     'https://raw.githubusercontent.com/%s/%s/%s/' % (owner, repo, quote(b))]
            return files, bases, b
    info = await _nb_json('https://api.github.com/repos/%s/%s' % (owner, repo))
    if not info:
        return None, None, None
    b = branch or info.get('default_branch') or 'main'
    tree = await _nb_json('https://api.github.com/repos/%s/%s/git/trees/%s?recursive=1' % (owner, repo, quote(b)))
    if not tree:
        return None, None, None
    files = [(t['path'], int(t.get('size') or 0)) for t in tree.get('tree', []) if t.get('type') == 'blob']
    return files, ['https://raw.githubusercontent.com/%s/%s/%s/' % (owner, repo, quote(b)),
                   'https://cdn.jsdelivr.net/gh/%s/%s@%s/' % (owner, repo, quote(b))], b


async def _nb_git_clone(url, dest=None, branch=None):
    m = re.match(r'^(?:https?://)?(?:www\.)?github\.com/([\w.-]+)/([\w.-]+?)(?:\.git)?/?(?:tree/([^\s]+?))?/?$', url.strip())
    if not m:
        print("fatal: repository '%s' not found" % url)
        print('  (이 사이트에서는 github.com 의 공개 저장소만 받을 수 있습니다)')
        return 128
    owner, repo, tb = m.group(1), m.group(2), m.group(3)
    branch = branch or tb
    dest = dest or repo
    if os.path.exists(dest) and (not os.path.isdir(dest) or os.listdir(dest)):
        print("fatal: destination path '%s' already exists and is not an empty directory." % dest)
        return 128
    print("Cloning into '%s'..." % dest)
    files, bases, b = await _nb_repo_files(owner, repo, branch)
    if files is None:
        print('remote: Repository not found.')
        print("fatal: repository 'https://github.com/%s/%s.git/' not found" % (owner, repo))
        return 128
    total = len(files)
    total_bytes = sum(s for _, s in files)
    print('remote: Enumerating objects: %d, done.' % total)
    from pyodide.http import pyfetch
    sem = asyncio.Semaphore(6)
    got = [0]
    failed = []

    async def _one(path, size):
        async with sem:
            data = None
            for base in bases:
                try:
                    r = await pyfetch(base + quote(path))
                    if r.ok:
                        data = await r.bytes()
                        break
                except Exception:
                    pass
            if data is None:
                failed.append(path)
                return
            full = os.path.join(dest, path)
            os.makedirs(os.path.dirname(full) or '.', exist_ok=True)
            with open(full, 'wb') as f:
                f.write(data)
            got[0] += 1

    os.makedirs(dest, exist_ok=True)
    await asyncio.gather(*[_one(p, s) for p, s in files])
    if failed:
        print('error: %d개 파일을 받지 못했습니다: %s' % (len(failed), ', '.join(failed[:5])))
        return 1
    print('Receiving objects: 100%% (%d/%d), %s, done.' % (got[0], total, _nb_human(total_bytes)))
    _nb_clones[os.path.abspath(dest)] = (owner, repo, b)
    return 0


# ── !명령 ───────────────────────────────────────────────────
def _nb_expand(cmd, g):
    def _brace(mo):
        try:
            return str(eval(mo.group(1), g))
        except Exception:
            return mo.group(0)
    cmd = re.sub(r'\{([^{}\s][^{}]*)\}', _brace, cmd)
    return re.sub(r'\$([A-Za-z_]\w*)', lambda mo: str(g[mo.group(1)]) if mo.group(1) in g else mo.group(0), cmd)


def _nb_ls(args):
    opts = ''.join(a[1:] for a in args if a.startswith('-'))
    paths = [a for a in args if not a.startswith('-')] or ['.']
    for i, p in enumerate(paths):
        if not os.path.exists(p):
            print("ls: cannot access '%s': No such file or directory" % p)
            continue
        if os.path.isdir(p):
            names = sorted(n for n in os.listdir(p) if 'a' in opts or not n.startswith('.'))
            if len(paths) > 1:
                print('%s%s:' % ('\n' if i else '', p))
            items = [(n, os.path.join(p, n)) for n in names]
        else:
            items = [(p, p)]
        if 'l' in opts:
            print('total %d' % len(items))
            for n, full in items:
                st = os.stat(full)
                size = _nb_human(st.st_size) if 'h' in opts else str(st.st_size)
                print('%s %8s %s %s' % ('drwxr-xr-x' if os.path.isdir(full) else '-rw-r--r--', size,
                                        time.strftime('%b %d %H:%M', time.localtime(st.st_mtime)), n + ('/' if os.path.isdir(full) else '')))
        elif items:
            print(('\n' if _nb_capture_mode[0] else '  ').join(n for n, _ in items))


_nb_capture_mode = [False]


def _nb_read_lines(path):
    with open(path, encoding='utf-8', errors='replace') as f:
        return f.read().splitlines()


def _nb_num_opt(args, default=10):
    n = default
    rest = []
    it = iter(args)
    for a in it:
        if a == '-n':
            n = int(next(it, default))
        elif re.fullmatch(r'-\d+', a):
            n = int(a[1:])
        elif a.startswith('-n') and a[2:].isdigit():
            n = int(a[2:])
        else:
            rest.append(a)
    return n, rest


async def _nb_run_one(argv):
    """명령 하나 실행. 돌려주는 값은 종료 코드."""
    if not argv:
        return 0
    if argv[0] == 'sudo':
        argv = argv[1:]
    cmd, args = argv[0], argv[1:]

    if cmd == 'git':
        if args[:1] == ['clone']:
            rest, branch, it = [], None, iter(args[1:])
            for a in it:
                if a in ('-b', '--branch'):
                    branch = next(it, None)
                elif a.startswith('--branch='):
                    branch = a.split('=', 1)[1]
                elif a in ('--depth', '--origin', '-o'):
                    next(it, None)
                elif a.startswith('-'):
                    pass
                else:
                    rest.append(a)
            if not rest:
                print('usage: git clone <repository> [<directory>]')
                return 129
            return await _nb_git_clone(rest[0], rest[1] if len(rest) > 1 else None, branch)
        if args[:1] == ['pull']:
            info = _nb_clones.get(os.path.abspath('.'))
            if not info:
                print('fatal: not a git repository (or any of the parent directories): .git')
                return 128
            owner, repo, b = info
            here = os.path.abspath('.')
            os.chdir('..')
            shutil.rmtree(here)
            code = await _nb_git_clone('https://github.com/%s/%s' % (owner, repo), os.path.basename(here), b)
            os.chdir(here)
            return code
        print('이 사이트에서는 git clone 과 git pull 만 쓸 수 있습니다.')
        return 1
    if cmd in ('pip', 'pip3') or (cmd in ('python', 'python3') and args[:2] == ['-m', 'pip']):
        if cmd.startswith('python'):
            args = args[2:]
        sub = args[:1]
        pk = [a for a in args[1:] if not a.startswith('-')]
        if sub == ['install']:
            if '-r' in args:
                req = args[args.index('-r') + 1]
                pk = [l.strip() for l in _nb_read_lines(req) if l.strip() and not l.startswith('#')]
            return await _nb_pip_install(pk)
        if sub == ['list']:
            import micropip
            for name, p in sorted(micropip.list().items()):
                print('%-28s %s' % (name, p.version))
            return 0
        if sub == ['show']:
            for p in pk:
                v = _nb_version(p)
                print(('Name: %s\nVersion: %s' % (p, v)) if v else 'WARNING: Package(s) not found: %s' % p)
            return 0
        print('이 사이트에서는 pip install · list · show 만 쓸 수 있습니다.')
        return 1
    if cmd in ('apt', 'apt-get'):
        if any('nanum' in a for a in args):
            print('나눔 글꼴은 이미 들어 있어 따로 설치하지 않아도 됩니다.')
            return 0
        print('apt-get 은 이 사이트(브라우저 속 파이썬)에서 쓸 수 없습니다.')
        return 1
    if cmd in ('fc-cache',):
        return 0
    if cmd == 'nvidia-smi':
        print('GPU 가 없습니다 — 이 노트북은 브라우저 안에서 CPU 로 실행됩니다.')
        return 9
    if cmd in ('python', 'python3'):
        if args[:1] in (['--version'], ['-V']):
            print('Python %d.%d.%d' % sys.version_info[:3])
            return 0
        if args[:1] == ['-c']:
            exec(compile(args[1], '<string>', 'exec'), {'__name__': '__main__'})
            return 0
        if args:
            import runpy
            old = sys.argv
            sys.argv = args
            try:
                runpy.run_path(args[0], run_name='__main__')
            finally:
                sys.argv = old
            return 0
        print('대화형 파이썬은 쓸 수 없습니다. 코드를 셀에 쓰세요.')
        return 1
    if cmd == 'cd':
        print('(!cd 는 다음 줄로 이어지지 않습니다. 폴더를 옮기려면 %%cd %s 를 쓰세요)' % (args[0] if args else ''))
        return 0
    if cmd == 'pwd':
        print(os.getcwd())
        return 0
    if cmd == 'ls':
        _nb_ls(args)
        return 0
    if cmd == 'cat':
        for p in args:
            try:
                print('\n'.join(_nb_read_lines(p)))
            except FileNotFoundError:
                print('cat: %s: No such file or directory' % p)
                return 1
        return 0
    if cmd in ('head', 'tail'):
        n, files = _nb_num_opt(args)
        for p in files:
            try:
                L = _nb_read_lines(p)
            except FileNotFoundError:
                print('%s: cannot open \'%s\' for reading: No such file or directory' % (cmd, p))
                return 1
            print('\n'.join(L[:n] if cmd == 'head' else L[-n:]))
        return 0
    if cmd == 'wc':
        for p in [a for a in args if not a.startswith('-')]:
            print('%d %s' % (len(_nb_read_lines(p)), p))
        return 0
    if cmd == 'mkdir':
        for p in [a for a in args if not a.startswith('-')]:
            os.makedirs(p, exist_ok=True)
        return 0
    if cmd == 'touch':
        for p in args:
            open(p, 'a').close()
        return 0
    if cmd == 'rm':
        rec = any(a.startswith('-') and 'r' in a.lower() for a in args)
        force = any(a.startswith('-') and 'f' in a for a in args)
        for p in [a for a in args if not a.startswith('-')]:
            if os.path.isdir(p) and not os.path.islink(p):
                if not rec:
                    print("rm: cannot remove '%s': Is a directory" % p)
                    return 1
                shutil.rmtree(p)
            elif os.path.exists(p):
                os.remove(p)
            elif not force:
                print("rm: cannot remove '%s': No such file or directory" % p)
                return 1
        return 0
    if cmd in ('cp', 'mv'):
        ps = [a for a in args if not a.startswith('-')]
        if len(ps) < 2:
            print('%s: missing file operand' % cmd)
            return 1
        *srcs, dst = ps
        for s in srcs:
            target = os.path.join(dst, os.path.basename(s.rstrip('/'))) if os.path.isdir(dst) else dst
            if cmd == 'mv':
                shutil.move(s, target)
            elif os.path.isdir(s):
                shutil.copytree(s, target)
            else:
                shutil.copy(s, target)
        return 0
    if cmd in ('wget', 'curl'):
        out, url, it = None, None, iter(args)
        for a in it:
            if a in ('-O', '-o', '--output', '--output-document'):
                out = next(it, None)
            elif a.startswith('-'):
                continue
            else:
                url = a
        if cmd == 'curl' and '-O' in args and out is None:
            out = ''
        if not url:
            print('%s: missing URL' % cmd)
            return 1
        name = out or os.path.basename(urlparse(url).path) or 'index.html'
        try:
            data = await _nb_fetch_bytes(url)
        except Exception as e:
            print('%s: %s 을(를) 받지 못했습니다 (%s). 그 사이트가 브라우저에서 받는 것을 막았을 수 있습니다.' % (cmd, url, e))
            return 1
        if cmd == 'curl' and out is None:
            sys.stdout.write(data.decode('utf-8', 'replace'))
            return 0
        with open(name, 'wb') as f:
            f.write(data)
        print("'%s' saved [%d]" % (name, len(data)))
        return 0
    if cmd == 'unzip':
        d, files, it = '.', [], iter(args)
        for a in it:
            if a == '-d':
                d = next(it, '.')
            elif not a.startswith('-'):
                files.append(a)
        for z in files:
            print('Archive:  %s' % z)
            with zipfile.ZipFile(z) as zf:
                for info in zf.infolist():
                    name = info.filename
                    if info.flag_bits & 0x800 == 0:
                        try:
                            name = name.encode('cp437').decode('cp949')
                        except Exception:
                            pass
                    target = os.path.join(d, name)
                    if info.is_dir():
                        os.makedirs(target, exist_ok=True)
                        continue
                    os.makedirs(os.path.dirname(target) or '.', exist_ok=True)
                    with zf.open(info) as src, open(target, 'wb') as dst:
                        shutil.copyfileobj(src, dst)
                    print('  inflating: %s' % target)
        return 0
    if cmd == 'echo':
        print(' '.join(args))
        return 0
    if cmd in ('tree', 'find'):
        root = next((a for a in args if not a.startswith('-')), '.')
        pat = args[args.index('-name') + 1] if '-name' in args else None
        for dp, dns, fns in os.walk(root):
            dns.sort()
            depth = dp[len(root):].count(os.sep)
            if cmd == 'tree':
                print('    ' * depth + (os.path.basename(dp) or dp) + '/')
            for fn in sorted(fns):
                if cmd == 'tree':
                    print('    ' * (depth + 1) + fn)
                elif not pat or fnmatch.fnmatch(fn, pat):
                    print(os.path.join(dp, fn))
        return 0
    if cmd == 'grep':
        ps = [a for a in args if not a.startswith('-')]
        if len(ps) < 2:
            print('usage: grep PATTERN FILE')
            return 2
        for p in ps[1:]:
            for line in _nb_read_lines(p):
                if re.search(ps[0], line, re.I if '-i' in args else 0):
                    print(line)
        return 0
    if cmd == 'du':
        for p in [a for a in args if not a.startswith('-')] or ['.']:
            total = sum(os.path.getsize(os.path.join(dp, f)) for dp, _, fs in os.walk(p) for f in fs) if os.path.isdir(p) else os.path.getsize(p)
            print('%s\t%s' % (_nb_human(total), p))
        return 0
    if cmd == 'whoami':
        print('root')
        return 0
    if cmd == 'date':
        print(time.strftime('%a %b %d %H:%M:%S %Y'))
        return 0
    if cmd == 'which':
        for a in args:
            print('/usr/bin/' + a)
        return 0
    print('/bin/bash: line 1: %s: command not found' % cmd)
    return 127


async def __nb_sh(cmdline, g=None):
    g = g if g is not None else sys.modules['__main__'].__dict__
    cmdline = _nb_expand(cmdline, g).strip()
    if '|' in cmdline.replace('||', ''):
        print('파이프(|)는 이 사이트에서 쓸 수 없습니다. 명령을 하나씩 실행하세요.')
        return 1
    code = 0
    for part in re.split(r'\s*(?:&&|;)\s*', cmdline):
        if not part:
            continue
        redirect = None
        mo = re.match(r'^(.*?)\s*(>>?)\s*(\S+)\s*$', part)
        if mo and not part.startswith(('python', 'wget', 'curl')):
            part, redirect = mo.group(1), (mo.group(2), mo.group(3))
        try:
            argv = shlex.split(part)
        except ValueError as e:
            print('/bin/bash: %s' % e)
            return 2
        if redirect:
            buf = io.StringIO()
            old = sys.stdout
            sys.stdout = buf
            try:
                code = await _nb_run_one(argv)
            finally:
                sys.stdout = old
            with open(redirect[1], 'a' if redirect[0] == '>>' else 'w', encoding='utf-8') as f:
                f.write(buf.getvalue())
        else:
            code = await _nb_run_one(argv)
        if code:
            break
    return None


# ── %매직 ───────────────────────────────────────────────────
async def __nb_magic(name, line, g=None):
    g = g if g is not None else sys.modules['__main__'].__dict__
    line = _nb_expand(line or '', g).strip()
    if name == 'cd':
        target = os.path.expanduser(line.strip('\'"') or '~')
        try:
            os.chdir(target)
        except FileNotFoundError:
            print('[Errno 2] No such file or directory: %r' % target)
            return None
        print(os.getcwd())
        return None
    if name == 'pwd':
        return os.getcwd()
    if name in ('pip', 'ls', 'cat', 'mkdir', 'rm', 'cp', 'mv', 'wget', 'unzip', 'env', 'git'):
        return await __nb_sh(name + ' ' + line, g)
    if name == 'time':
        t0 = time.time()
        r = eval(compile(line, '<셀>', 'eval'), g)
        print('Wall time: %.0f ms' % ((time.time() - t0) * 1000))
        return r
    if name == 'timeit':
        t0 = time.time()
        exec(compile(line, '<셀>', 'exec'), g)
        print('%.2f ms per loop (1 run)' % ((time.time() - t0) * 1000))
        return None
    if name in ('matplotlib', 'config', 'load_ext', 'reload_ext', 'autoreload', 'capture', 'tensorflow_version'):
        return None
    if name == 'run':
        import runpy
        runpy.run_path(line.split()[0], run_name='__main__')
        return None
    if name == 'who':
        print('  '.join(sorted(k for k in g if not k.startswith('_') and k not in _NB_KEEP)))
        return None
    print('UsageError: Line magic function `%%%s` not found.' % name)
    return None


async def __nb_writefile(arg, body):
    parts = arg.split()
    append = '-a' in parts
    path = [p for p in parts if not p.startswith('-')][0]
    exists = os.path.exists(path)
    with open(path, 'a' if append else 'w', encoding='utf-8') as f:
        f.write(body if body.endswith('\n') else body + '\n')
    print(('Appending to %s' if append else ('Overwriting %s' if exists else 'Writing %s')) % path)


# ── 셀 코드 → 실행할 파이썬 (!·% 줄 바꾸기) ────────────────────
_NB_SH = re.compile(r'^(\s*)!(.*)$')
_NB_ASSIGN_SH = re.compile(r'^(\s*)([A-Za-z_]\w*)\s*=\s*!(.*)$')
_NB_MAGIC = re.compile(r'^(\s*)%(?!%)([A-Za-z_]\w*)\s*(.*)$')


def __nb_transform(src):
    lines = src.split('\n')
    first = next((i for i, l in enumerate(lines) if l.strip()), None)
    if first is not None and lines[first].lstrip().startswith('%%'):
        head = lines[first].strip()[2:]
        name, _, arg = head.partition(' ')
        body = '\n'.join(lines[first + 1:])
        if name == 'writefile':
            return 'await __nb_writefile(%r, %r)' % (arg.strip(), body)
        if name in ('bash', 'sh', 'shell', 'script'):
            return '\n'.join('await __nb_sh(%r, globals())' % l for l in body.split('\n') if l.strip())
        if name == 'html':
            return 'display(HTML(%r))' % body
        if name == 'time':
            return '__nb_t0 = __import__("time").time()\n' + __nb_transform(body) + \
                   '\nprint("Wall time: %.0f ms" % ((__import__("time").time() - __nb_t0) * 1000))'
        if name in ('capture', 'timeit'):
            return __nb_transform(body)
        return 'print("UsageError: Cell magic `%%%%%s` not found.")' % name
    out, in_str = [], None
    for ln in lines:
        if in_str is None:
            m = _NB_ASSIGN_SH.match(ln)
            if m:
                out.append('%s%s = await __nb_capture_sh(%r, globals())' % (m.group(1), m.group(2), m.group(3)))
                continue
            m = _NB_SH.match(ln)
            if m:
                out.append('%sawait __nb_sh(%r, globals())' % (m.group(1), m.group(2)))
                continue
            m = _NB_MAGIC.match(ln)
            if m and not re.match(r'^\s*%\s*\w+\s*[=+\-*/]', ln):
                out.append('%sawait __nb_magic(%r, %r, globals())' % (m.group(1), m.group(2), m.group(3)))
                continue
        out.append(ln)
        code_part = ln.split('#', 1)[0] if in_str is None else ln
        for q in ('"""', "'''"):
            if code_part.count(q) % 2 == 1:
                if in_str is None:
                    in_str = q
                elif in_str == q:
                    in_str = None
    return '\n'.join(out)


async def __nb_capture_sh(cmd, g):
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    _nb_capture_mode[0] = True
    try:
        await __nb_sh(cmd, g)
    finally:
        sys.stdout = old
        _nb_capture_mode[0] = False
    return buf.getvalue().splitlines()


# ── 오류 표시 (사용자 셀의 줄만 남기고, 흔한 경우 한 줄 도움말) ─────
def _nb_hint(e):
    name = type(e).__name__
    if isinstance(e, ModuleNotFoundError):
        mod = (getattr(e, 'name', '') or '').split('.')[0]
        if mod in _NB_NO_BROWSER:
            return '%s 은(는) 이 사이트(브라우저 속 파이썬)에서 쓸 수 없습니다. 이 셀은 Google Colab 에서 실행하세요.' % mod
        import difflib
        known = ['matplotlib', 'pandas', 'numpy', 'seaborn', 'sklearn', 'scipy', 'statsmodels', 'math', 'random',
                 'datetime', 'collections', 'itertools', 'os', 'sys', 'json', 'csv', 're', 'time', 'tqdm', 'PIL', 'cv2']
        near = difflib.get_close_matches(mod, known, n=1, cutoff=0.7)
        if near:
            return "'%s' 라는 모듈이 없습니다. 혹시 %s 인가요? 철자를 확인하세요." % (mod, near[0])
        return "'%s' 라는 모듈이 없습니다. 이름을 확인하거나 !pip install %s 로 설치해 보세요." % (mod, mod)
    if isinstance(e, FileNotFoundError):
        return '파일이 없습니다. 경로를 확인하세요 — !ls 로 지금 폴더(%s)에 무엇이 있는지 볼 수 있습니다.' % os.getcwd()
    if name == 'NameError':
        return '아직 만들지 않은 이름입니다. 오타가 없는지, 위 셀을 먼저 실행했는지 확인하세요.'
    if name == 'KeyError':
        return '없는 열 이름이나 키입니다. df.columns 로 열 이름을 확인하세요.'
    return ''


def _nb_show_error(e):
    try:
        te = traceback.TracebackException(type(e), e, e.__traceback__)
        mine = [f for f in te.stack if f.filename == '<셀>' or f.filename.startswith(('/content', '/root'))]
        if mine:
            te.stack = traceback.StackSummary.from_list(mine)
        tb = ''.join(te.format())
    except Exception:
        tb = '%s: %s' % (type(e).__name__, e)
    _nb_emit('error', json.dumps({'ename': type(e).__name__, 'evalue': str(e), 'tb': tb, 'hint': _nb_hint(e)}, ensure_ascii=False), '')


# ── 셀 하나 실행 ────────────────────────────────────────────
_NB_MPL_TRIGGER = re.compile(r'\b(matplotlib|seaborn|koreanize_matplotlib|plt\.|\.plot\(|\.hist\(|\.boxplot\()')
_NB_AUTO_PIP = {'seaborn': 'seaborn', 'tqdm': 'tqdm', 'openpyxl': 'openpyxl', 'xlrd': 'xlrd'}


async def __nb_run(src):
    from pyodide.code import eval_code_async
    ok = True
    try:
        code = __nb_transform(src)
        mods = set(re.findall(r'^\s*(?:import|from)\s+([A-Za-z_]\w*)', code, re.M))
        for mod, pkg in _NB_AUTO_PIP.items():
            if mod in mods and importlib.util.find_spec(mod) is None:
                _nb_emit('status', '%s 설치 중…' % pkg, '')
                await _nb_pip_install([pkg], quiet=True)
        if _NB_MPL_TRIGGER.search(code) or 'pandas' in mods:
            await __nb_setup_mpl()
        _nb_emit('status', '', '')
        val = await eval_code_async(code, globals(), filename='<셀>', return_mode='last_expr')
        _nb_flush_figs()
        if val is not None:
            globals()['_'] = val
            _nb_display_value(val)
    except BaseException as e:
        ok = False
        try:
            _nb_flush_figs()
        except Exception:
            pass
        _nb_show_error(e)
    return ok


def __nb_reset():
    for k in [k for k in list(globals()) if k not in _NB_KEEP]:
        del globals()[k]
    if 'matplotlib.pyplot' in sys.modules:
        sys.modules['matplotlib.pyplot'].close('all')
    os.chdir('/content')


_NB_KEEP = set(globals()) | {'_NB_KEEP'}
