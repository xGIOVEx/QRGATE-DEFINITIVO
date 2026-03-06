import asyncio
import asyncpg
import urllib.parse
async def setup():
    print("Connecting to DB to install pgvector...")
    password = urllib.parse.quote("5&tbQ?@StbQcncP2")
    conn = await asyncpg.connect(f'postgresql://agent_admin:{password}@localhost:8432/qrgatedb')
    await conn.execute('CREATE EXTENSION IF NOT EXISTS vector;')
    print("Extension installed successfully.")
    await conn.close()
asyncio.run(setup())
