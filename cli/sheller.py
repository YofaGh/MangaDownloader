import base64, json, sys, os

sys.path.append(f'{os.getcwd()}\\mangascraper')
sys.path.append(f'{os.getcwd()}\\cli\\mangascraper')

def get_modules():
    from mangascraper.utils.modules_contributer import get_all_modules
    return [{
        'type': module.type,
        'domain': module.domain,
        'logo': module.logo,
        'searchable': True if hasattr(module, 'search_by_keyword') else False
    } for module in get_all_modules()]

def get_saucers_list():
    from mangascraper.utils.saucer import sites
    return [site.__name__ for site in sites]

def get_info(domain, url):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.get_info(url, wait=False)

def get_chapters(domain, url):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.get_chapters(url, wait=False)

def get_module_type(domain):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.type

def get_title(domain, code):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.get_title(code, wait=False)

def get_doujin_images(domain, code):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.get_images(code, wait=False)

def get_manga_images(domain, url, chapter):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.get_images(url, {'url': chapter}, wait=False)

def download_image(domain, image_url, save_path):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.download_image(image_url, save_path, 0, wait=False)

def convert(path_to_source, path_to_destination, pdf_name):
    from mangascraper.utils.pdf_converter import convert_folder
    convert_folder(path_to_source, path_to_destination, pdf_name)
    return

def merge(path_to_source, path_to_destination, method):
    from mangascraper.utils.image_merger import merge_folder
    merge_folder(path_to_source, path_to_destination, method == 'Fit')
    return

def search(domain, keyword, sleep_time, absolute, page):
    from mangascraper.utils.modules_contributer import get_module
    from mangascraper.crawlers.search_engine import search
    module = get_module(domain)
    results, _ = search(keyword, module, float(sleep_time), absolute, int(page))
    return [{'name': k, **v} for k, v in results.items()]

def retrieve_image(domain, image_url):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    response = module.send_request(image_url, headers=module.download_images_headers, wait=False)
    image = response.content
    return f'data:image/png;base64, {base64.b64encode(image).decode()}'

def upload_image(image_url):
    from mangascraper.utils.saucer import sauce_file
    return sauce_file(image_url)

def saucer(site_p, url):
    from mangascraper.utils.saucer import sites
    results = []
    saucer_bot = next(site for site in sites if site.__name__ == site_p)
    try:
        results = saucer_bot(url)
    except:
        pass
    return results

def get_sample(domain):
    from mangascraper.utils.assets import load_dict_from_file
    samples = load_dict_from_file('cli/mangascraper/test_samples.json')
    return samples[domain]

def validate_corrupted_image(image_path):
    from mangascraper.utils.assets import validate_corrupted_image
    return validate_corrupted_image(image_path)

def validate_truncated_image(image_path):
    from mangascraper.utils.assets import validate_truncated_image
    return validate_truncated_image(image_path)

FUNCTIONS = {
    'get_modules': get_modules,
    'get_saucers_list': get_saucers_list,
    'get_info': get_info,
    'get_chapters': get_chapters,
    'get_module_type': get_module_type,
    'get_title': get_title,
    'get_doujin_images': get_doujin_images,
    'get_manga_images': get_manga_images,
    'download_image': download_image,
    'convert': convert,
    'merge': merge,
    'search': search,
    'retrieve_image': retrieve_image,
    'upload_image': upload_image,
    'saucer': saucer,
    'get_sample': get_sample,
    'validate_corrupted_image': validate_corrupted_image,
    'validate_truncated_image': validate_truncated_image
}

print(json.dumps(FUNCTIONS[sys.argv[1]](*sys.argv[2:])))