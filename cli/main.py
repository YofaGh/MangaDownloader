import base64, time, sys, os
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

sys.path.append(f'{os.getcwd()}\\mangascraper')

app = FastAPI()

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

@app.get("/modules/")
async def get_modules():
    from mangascraper.utils.modules_contributer import get_all_modules
    return [{
        'type': module.type,
        'domain': module.domain
    } for module in get_all_modules()]

@app.get("/module_logo/{module}/")
async def get_logo(module):
    from mangascraper.utils.modules_contributer import get_module
    return get_module(module).logo

@app.get("/info/{domain}/{url}/")
async def get_info(domain, url):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.get_info(url, wait=False)

@app.get("/type/{domain}/")
async def get_module_type(domain):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.type

@app.get("/get_chapters/{domain}/{url}/")
async def get_chapters(domain, url):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.get_chapters(url, wait=False)

class GetDoujinImagesRequest(BaseModel):
    domain: str
    code: str

class GetMangaImagesRequest(BaseModel):
    domain: str
    url: str
    chapter: str

class DownloadRequest(BaseModel):
    domain: str
    image_url: str
    save_path: str

class ConvertRequest(BaseModel):
    path_to_source: str
    path_to_destination: str
    pdf_name: str

class MergeRequest(BaseModel):
    path_to_source: str
    path_to_destination: str
    method: str

class SearchRequest(BaseModel):
    domain: str
    keyword: str
    absolute: bool
    depth: int
    sleepTime: float

class SauceRequest(BaseModel):
    site: str
    url: str

class UploadRequest(BaseModel):
    url: str

@app.post("/doujin/images/")
async def get_images(request_data: GetDoujinImagesRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_images(request_data.code, wait=False)

@app.post("/manga/images/")
async def get_images(request_data: GetMangaImagesRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_images(request_data.url, {'url': request_data.chapter}, wait=False)

@app.post("/download_image/")
async def download_image(request_data: DownloadRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.download_image(request_data.image_url, request_data.save_path, 0, wait=False)

@app.post("/convert/")
async def convert(request_data: ConvertRequest=Body(...)):
    from mangascraper.utils.pdf_converter import convert_folder
    convert_folder(request_data.path_to_source, request_data.path_to_destination, request_data.pdf_name)
    return

@app.post("/merge/")
async def merge(request_data: MergeRequest=Body(...)):
    from mangascraper.utils.image_merger import merge_folder
    merge_folder(request_data.path_to_source, request_data.path_to_destination, True if request_data.method == 'fit' else False)
    return

@app.post("/search/")
async def search(request_data: SearchRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    results = {}
    search = module.search_by_keyword(request_data.keyword, request_data.absolute, wait=False)
    page = 1
    while page <= request_data.depth:
        try:
            last = next(search)
            if not last:
                break
            results.update(last)
            page += 1
            if page < request_data.depth:
                time.sleep(request_data.sleepTime)
        except Exception:
            break
    return [{'name': k, **v} for k, v in results.items()]

@app.post("/retrieve_image/")
async def retrieve_image(request_data: DownloadRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    response = module.send_request(request_data.image_url, headers=module.download_images_headers, wait=False)
    image = response.content
    return f'data:image/png;base64, {base64.b64encode(image).decode()}'

@app.get("/get_saucers_list/")
async def get_saucers_list():
    from mangascraper.utils.saucer import sites
    return [site.__name__ for site in sites]

@app.post("/upload_image/")
async def upload_image(request_data: UploadRequest=Body(...)):
    import requests
    from bs4 import BeautifulSoup
    with open(request_data.url, 'rb') as file:
        bytes = file.read()
    response = requests.post('https://imgops.com/store', files={'photo': (os.path.basename(request_data.url), bytes)})
    soup = BeautifulSoup(response.text, 'html.parser')
    link = soup.find('div', {'id': 'content'}).find('a')['href']
    return f'https:{link}'

@app.post("/saucer/")
async def saucer(request_data: SauceRequest=Body(...)):
    from mangascraper.utils.saucer import sites
    results = []
    saucer_bot = next(site for site in sites if site.__name__ == request_data.site)
    try:
        results = saucer_bot(request_data.url)
    except:
        pass
    return results