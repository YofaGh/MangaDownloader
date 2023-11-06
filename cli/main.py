import uvicorn, signal, base64, time, sys, os
from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class ModuleRequest(BaseModel):
    domain: str

class WebtoonRequest(BaseModel):
    domain: str
    url: str

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
    page: int
    sleep_time: float

class SauceRequest(BaseModel):
    site: str
    url: str

class UploadRequest(BaseModel):
    image_url: str

class ValidateRequest(BaseModel):
    image_path: str

sys.path.append(f'{os.getcwd()}\\mangascraper')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_methods=['*'],
    allow_headers=['*']
)

@app.get('/modules/')
async def get_modules():
    from mangascraper.utils.modules_contributer import get_all_modules
    return [{
        'type': module.type,
        'domain': module.domain,
        'logo': module.logo,
        'searchable': True if hasattr(module, 'search_by_keyword') else False
    } for module in get_all_modules()]

@app.get('/get_saucers_list/')
async def get_saucers_list():
    from mangascraper.utils.saucer import sites
    return [site.__name__ for site in sites]

@app.get('/shutdown/')
async def shutdown():
    os.kill(os.getpid(), signal.SIGTERM)

@app.post('/info/')
async def get_info(request_data: WebtoonRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_info(request_data.url, wait=False)

@app.post('/get_chapters/')
async def get_chapters(request_data: WebtoonRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_chapters(request_data.url, wait=False)

@app.post('/type/')
async def get_module_type(request_data: ModuleRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.type

@app.post('/doujin/title/')
async def get_title(request_data: GetDoujinImagesRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_title(request_data.code, wait=False)

@app.post('/doujin/images/')
async def get_images(request_data: GetDoujinImagesRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_images(request_data.code, wait=False)

@app.post('/manga/images/')
async def get_images(request_data: GetMangaImagesRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_images(request_data.url, {'url': request_data.chapter}, wait=False)

@app.post('/download_image/')
async def download_image(request_data: DownloadRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.download_image(request_data.image_url, request_data.save_path, 0, wait=False)

@app.post('/convert/')
async def convert(request_data: ConvertRequest=Body(...)):
    from mangascraper.utils.pdf_converter import convert_folder
    convert_folder(request_data.path_to_source, request_data.path_to_destination, request_data.pdf_name)
    return

@app.post('/merge/')
async def merge(request_data: MergeRequest=Body(...)):
    from mangascraper.utils.image_merger import merge_folder
    merge_folder(request_data.path_to_source, request_data.path_to_destination, request_data.method == 'Fit')
    return

@app.post('/search/')
async def search(request_data: SearchRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    from mangascraper.crawlers.search_engine import search
    module = get_module(request_data.domain)
    results, _ = search(request_data.keyword, module, request_data.sleep_time, request_data.absolute, request_data.page)
    return [{'name': k, **v} for k, v in results.items()]

@app.post('/retrieve_image/')
async def retrieve_image(request_data: DownloadRequest=Body(...)):
    print(request_data.image_url)
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    response = module.send_request(request_data.image_url, headers=module.download_images_headers, wait=False)
    image = response.content
    return f'data:image/png;base64, {base64.b64encode(image).decode()}'

@app.post('/upload_image/')
async def upload_image(request_data: UploadRequest=Body(...)):
    from mangascraper.utils.saucer import sauce_file
    return sauce_file(request_data.image_url)

@app.post('/saucer/')
async def saucer(request_data: SauceRequest=Body(...)):
    from mangascraper.utils.saucer import sites
    results = []
    saucer_bot = next(site for site in sites if site.__name__ == request_data.site)
    try:
        results = saucer_bot(request_data.url)
    except:
        pass
    return results

@app.post('/get_sample/')
async def get_sample(request_data: ModuleRequest=Body(...)):
    from mangascraper.utils.assets import load_dict_from_file
    samples = load_dict_from_file('mangascraper/test_samples.json')
    return samples[request_data.domain]

@app.post('/validate_corrupted_image/')
async def validate_corrupted_image(request_data: ValidateRequest=Body(...)):
    from mangascraper.utils.assets import validate_corrupted_image
    return validate_corrupted_image(request_data.image_path)

@app.post('/validate_truncated_image/')
async def validate_truncated_image(request_data: ValidateRequest=Body(...)):
    from mangascraper.utils.assets import validate_truncated_image
    return validate_truncated_image(request_data.image_path)

if __name__ == '__main__':
    uvicorn.run(app=app, host='0.0.0.0', port=8000)