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

@app.get("/get_library/")
async def get_library():
    from mangascraper.utils.assets import load_dict_from_file
    library_dict = load_dict_from_file('./../library.json')
    mangas = []
    for manga, detm in library_dict.items():
        mangas.append({
            'title': manga,
            'status': detm['include'],
            "domain": detm['domain'],
            "url": detm['url'],
            'cover': detm['cover'],
            "last_downloaded_chapter": detm['last_downloaded_chapter']
        })
    return mangas

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