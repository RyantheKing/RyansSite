from fastapi import FastAPI, Form, HTTPException
from fastapi.staticfiles import StaticFiles
import subprocess
import config

app = FastAPI()

@app.post("/wakeonlan")
async def wake_on_lan(password: str = Form(...)):
    if password == config.WOL_PASSWORD:
        try:
            subprocess.run(['wakeonlan', config.MAC_ADDRESS], check=True)
            return {"message": "Sending magic packet to server."}
        except subprocess.CalledProcessError:
            raise HTTPException(status_code=500, detail="Internal Server Error: Failed to send magic packet.")
    else:
        raise HTTPException(status_code=403, detail="Forbidden: Incorrect password.")

@app.post("/wakemc")
async def wake_mc(password: str = Form(...)):
    if password == config.MC_PASSWORD:
        try:
            subprocess.run(['ssh', 'conman@192.168.1.101', '-p', '69', 'docker compose -f /compose/Minecraft_Server/Minecraft_Server.yml up -d'], check=True)
            return {"message": "Booting minecraft server."}
        except subprocess.CalledProcessError:
            raise HTTPException(status_code=500, detail="Internal Server Error: Failed to boot server.")
    else:
        raise HTTPException(status_code=403, detail="Forbidden: Incorrect password.")
    
@app.post("/wakejf")
async def wake_jf(password: str = Form(...)):
    if password == config.JF_PASSWORD:
        try:
            subprocess.run(['ssh', 'conman@192.168.1.101', '-p', '69', 'docker compose -f /compose/Cruzfin/Cruzfin.yml up -d'], check=True)
            return {"message": "Booting Jellyfin server."}
        except subprocess.CalledProcessError:
            raise HTTPException(status_code=500, detail="Internal Server Error: Failed to boot Jellyfin.")
    else:
        raise HTTPException(status_code=403, detail="Forbidden: Incorrect password.")

# @app.get("/containerstatus")
# async def get_con_status():
#     containers = {
#         'minecraft': 'Minecraft_Server',
#         'jellyfin': 'Cruzfin'
#     }
#     status = {}
#     try:
#         result = subprocess.run(['ssh', 'conman@192.168.1.101', '-p', '69', ' && '.join([f'docker compose -f /compose/{con_name}/{con_name}.yml ps' for con_name in containers.values()])], capture_output=True, text=True, check=True).stdout.strip().split('\nNAME')
#         for i, key in enumerate(containers):
#             status[key] = not result[i].endswith('PORTS')
#     except subprocess.CalledProcessError:
#         for key in containers:
#             status[key] = False
#     return status

@app.get("/onlinestatus")
async def get_status():
    ports = {
        'minecraft': '25565',
        'jellyfin': '8096',
        'all': '80'
    }
    status = {}
    try:
        for key, port in ports.items():
            try:
                status[key] = subprocess.run(['nc', '-zv', '192.168.1.101', port], text=True, timeout=.1).returncode
            except subprocess.TimeoutExpired:
                status[key] = 1
    except subprocess.CalledProcessError:
        for key in ports:
            status[key] = 1
    return status
    
app.mount("/", StaticFiles(directory="site", html=True), name="static")
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4443)