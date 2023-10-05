import sys, os
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
    return module.get_info(url)

@app.get("/type/{domain}/")
async def get_module_type(domain):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.type

@app.get("/get_chapters/{domain}/{url}/")
async def get_chapters(domain, url):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(domain)
    return module.get_chapters(url)

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

@app.post("/doujin/images/")
async def get_images(request_data: GetDoujinImagesRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_images(request_data.code)

@app.post("/manga/images/")
async def get_images(request_data: GetMangaImagesRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.get_images(request_data.url, {'url': request_data.chapter})

@app.post("/download_image/")
async def download_image(request_data: DownloadRequest=Body(...)):
    from mangascraper.utils.modules_contributer import get_module
    module = get_module(request_data.domain)
    return module.download_image(request_data.image_url, request_data.save_path, 0)