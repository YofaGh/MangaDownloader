import platform, urllib3, base64, json, sys, os

sys.path.append(os.path.join(os.getcwd(), 'mangascraper'))
sys.path.append(os.path.join(os.getcwd(), 'cli', 'mangascraper'))

import settings
settings.LOGGING = False

if platform.system() != 'Windows':
    settings.MODULES_FILE_PATH = os.path.join(sys._MEIPASS, 'mangascraper', 'modules.yaml')

from mangascraper.utils.assets import load_modules_yaml_file
from mangascraper.utils.assets import validate_corrupted_image
from mangascraper.utils.assets import validate_truncated_image
from mangascraper.utils.saucer import sauce_file as upload_image
from mangascraper.utils.saucer import sites
from mangascraper.utils.pdf_converter import convert_folder as convert
from mangascraper.utils.image_merger import merge_folder
from mangascraper.crawlers.search_engine import search as search_by_keyword

urllib3.disable_warnings()

modules = load_modules_yaml_file()

def import_module(module_name):
    return getattr(__import__(f'mangascraper.modules.{module_name}', fromlist=[module_name]), module_name)

def get_module(key=None):
    if not key:
        return [import_module(module['className']) for module in modules.values()]
    if isinstance(key, list):
        return [get_module(module) for module in key]
    if key in modules:
        return import_module(modules[key]['className'])

def get_modules():
    return [{
        'type': module.type,
        'domain': module.domain,
        'logo': module.logo,
        'searchable': True if hasattr(module, 'search_by_keyword') else False,
        'is_coded': module.type == 'Doujin' and module.is_coded
    } for module in get_module()]

def merge(path_to_source, path_to_destination, method):
    settings.FIT_MERGE = method == 'Fit'
    merge_folder(path_to_source, path_to_destination)

def search(domain, keyword, sleep_time, absolute, page):
    settings.SLEEP_TIME = float(sleep_time)
    results = search_by_keyword(keyword, get_module(domain), absolute, int(page), wait=False)
    return [{'name': k, **v} for k, v in results.items()]

def retrieve_image(domain, image_url):
    module = get_module(domain)
    image = module.send_request(image_url, headers=module.download_images_headers, wait=False).content
    return f'data:image/png;base64, {base64.b64encode(image).decode()}'

download_image = lambda domain, image_url, save_path: get_module(domain).download_image(image_url, save_path, 0, wait=False)
get_chapters = lambda domain, url: get_module(domain).get_chapters(url, wait=False)
get_doujin_images = lambda domain, code: get_module(domain).get_images(code, wait=False)
get_info = lambda domain, url: get_module(domain).get_info(url, wait=False)
get_manga_images = lambda domain, url, chapter: get_module(domain).get_images(url, {'url': chapter}, wait=False)
get_module_type = lambda domain: get_module(domain).type
get_sample = lambda domain: modules[domain]['test_sample']
get_saucers_list = lambda: [site.__name__ for site in sites]
get_title = lambda domain, code: get_module(domain).get_title(code, wait=False)
saucer = lambda site_p, url: next(site for site in sites if site.__name__ == site_p)(url)
verify = lambda: True

print(json.dumps(locals()[sys.argv[1]](*sys.argv[2:])))