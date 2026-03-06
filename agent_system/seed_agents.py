import asyncio
import os
import sys

# Setting up database paths
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)) + '/packages/db')

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models import Agent
from sqlalchemy import select

# To easily connect from Cloud Run or locally using public IP
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://agent_admin:5%26tbQ%3F%40StbQcncP2@34.38.201.163:5432/qrgatedb")

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def seed():
    async with AsyncSessionLocal() as session:
        # Check if outreach-agent exists
        result = await session.execute(select(Agent).where(Agent.id == "outreach-agent"))
        existing = result.scalars().first()
        
        if not existing:
            print("Inserting outreach-agent into database...")
            outreach = Agent(
                id="outreach-agent",
                name="Outreach and Acquisition Agent",
                description="Agent responsible for acquiring new Venue Managers and Partners",
                persona="Professional, persuasive, and data-driven B2B sales expert."
            )
            session.add(outreach)
            
            content = Agent(
                id="content-agent",
                name="Content Generation Agent",
                description="Agent responsible for generating audioguide contents",
                persona="Creative, historically accurate, and engaging storyteller."
            )
            session.add(content)
            
            support = Agent(
                id="support-agent",
                name="Customer Support Agent",
                description="Agent responsible for assisting users inside the platform",
                persona="Helpful, polite, and technically proficient."
            )
            session.add(support)
            
            await session.commit()
            print("Agents seeded successfully.")
        else:
            print("Agents already exist.")

if __name__ == "__main__":
    asyncio.run(seed())
